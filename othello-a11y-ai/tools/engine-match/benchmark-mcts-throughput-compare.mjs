#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { parseArgs, relativePathFromCwd, resolveCliPath } from '../evaluator-training/lib.mjs';

const DEFAULTS = Object.freeze({
  candidateRoot: process.cwd(),
  baselineRoot: null,
  outputJson: null,
  algorithms: ['mcts-guided', 'mcts-hybrid'],
  timeMsList: [160, 280, 500],
  positionSeedList: [17, 31, 41, 53, 71, 89],
  openingPlies: 12,
  randomMode: 'constant-zero',
  maxDepth: 4,
  exactEndgameEmpties: 8,
  maxTableEntries: 90000,
  presetKey: 'custom',
  styleKey: 'balanced',
});

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/benchmark-mcts-throughput-compare.mjs \
    [--candidate-root .] \
    [--baseline-root /path/to/previous/stage83] \
    [--output-json benchmarks/stage93_mcts_refactor_throughput_compare.json] \
    [--algorithms mcts-guided,mcts-hybrid] \
    [--time-ms-list 160,280,500] \
    [--position-seed-list 17,31,41,53,71,89] \
    [--opening-plies 12] \
    [--random-mode constant-zero]

설명:
- 지정한 repo root들의 SearchEngine/GameState를 동적으로 import해 같은 opening 포지션 묶음에서 MCTS throughput을 비교합니다.
- 기본 random-mode는 constant-zero이며, search path 차이보다 핫패스 처리량 차이를 보기 위한 미세 벤치입니다.
- baseline-root를 주면 candidate 대비 iteration/tree-node 증가율도 함께 계산합니다.
`);
}

function toFiniteInteger(value, fallback, minimum = Number.NEGATIVE_INFINITY, maximum = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
}

function parseCsvIntegers(value, fallback) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [...fallback];
  }

  const parsed = value
    .split(',')
    .map((token) => Number(token.trim()))
    .filter((token) => Number.isFinite(token) && token > 0)
    .map((token) => Math.round(token));

  return parsed.length > 0 ? [...new Set(parsed)] : [...fallback];
}

function parseCsvStrings(value, fallback) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [...fallback];
  }

  const parsed = value
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);

  return parsed.length > 0 ? [...new Set(parsed)] : [...fallback];
}

function createSeededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function withBenchRandom(mode, seed, callback) {
  const originalRandom = Math.random;
  if (mode === 'seeded') {
    Math.random = createSeededRandom(seed);
  } else {
    Math.random = () => 0;
  }

  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
}

function sortLegalMoves(state) {
  return state.getLegalMoves().sort((left, right) => left.coord.localeCompare(right.coord));
}

function createOpeningState(GameState, openingPlies, seed) {
  const random = createSeededRandom(seed);
  let state = GameState.initial();
  let guard = 0;

  while (!state.isTerminal() && state.moveHistory.length < openingPlies) {
    const legalMoves = sortLegalMoves(state);
    if (legalMoves.length === 0) {
      state = state.passTurn();
      guard += 1;
      if (guard > 120) {
        throw new Error('Opening generator exceeded pass guard.');
      }
      continue;
    }

    const chosen = legalMoves[Math.floor(random() * legalMoves.length)] ?? legalMoves[0];
    state = state.applyMove(chosen.index).state;
    guard += 1;
    if (guard > 120) {
      throw new Error('Opening generator exceeded guard.');
    }
  }

  return state;
}

async function loadRepoModules(repoRoot) {
  const searchEngineModulePath = path.resolve(repoRoot, 'js', 'ai', 'search-engine.js');
  const gameStateModulePath = path.resolve(repoRoot, 'js', 'core', 'game-state.js');
  const [{ SearchEngine }, { GameState }] = await Promise.all([
    import(pathToFileURL(searchEngineModulePath).href),
    import(pathToFileURL(gameStateModulePath).href),
  ]);
  return { SearchEngine, GameState };
}

function createEngine(SearchEngine, algorithm, options) {
  return new SearchEngine({
    presetKey: options.presetKey,
    styleKey: options.styleKey,
    searchAlgorithm: algorithm,
    maxDepth: options.maxDepth,
    timeLimitMs: options.timeLimitMs,
    exactEndgameEmpties: options.exactEndgameEmpties,
    wldPreExactEmpties: 0,
    aspirationWindow: 0,
    openingRandomness: 0,
    searchRandomness: 0,
    randomness: 0,
    maxTableEntries: options.maxTableEntries,
  });
}

async function benchmarkRepo({
  label,
  repoRoot,
  algorithms,
  timeMsList,
  positionSeedList,
  openingPlies,
  randomMode,
  maxDepth,
  exactEndgameEmpties,
  maxTableEntries,
  presetKey,
  styleKey,
}) {
  const { SearchEngine, GameState } = await loadRepoModules(repoRoot);
  const positions = positionSeedList.map((seed) => createOpeningState(GameState, openingPlies, seed));
  const results = [];

  for (const algorithm of algorithms) {
    for (const timeLimitMs of timeMsList) {
      let totalIterations = 0;
      let totalElapsedMs = 0;
      let totalTreeNodes = 0;
      let totalRollouts = 0;
      let totalGuidedPolicySelections = 0;
      let totalGuidedPriorUses = 0;
      let totalHybridPriorUses = 0;

      for (let index = 0; index < positions.length; index += 1) {
        const engine = createEngine(SearchEngine, algorithm, {
          presetKey,
          styleKey,
          maxDepth,
          timeLimitMs,
          exactEndgameEmpties,
          maxTableEntries,
        });
        const result = withBenchRandom(randomMode, 100 + index, () => engine.findBestMove(positions[index]));
        totalIterations += Number(result.stats?.mctsIterations ?? 0);
        totalElapsedMs += Number(result.stats?.elapsedMs ?? 0);
        totalTreeNodes += Number(result.stats?.mctsTreeNodes ?? 0);
        totalRollouts += Number(result.stats?.mctsRollouts ?? 0);
        totalGuidedPolicySelections += Number(result.stats?.mctsGuidedPolicySelections ?? 0);
        totalGuidedPriorUses += Number(result.stats?.mctsGuidedPriorUses ?? 0);
        totalHybridPriorUses += Number(result.stats?.mctsHybridPriorUses ?? 0);
      }

      results.push({
        algorithm,
        timeLimitMs,
        averageIterations: totalIterations / positions.length,
        averageElapsedMs: totalElapsedMs / positions.length,
        averageTreeNodes: totalTreeNodes / positions.length,
        averageRollouts: totalRollouts / positions.length,
        averageGuidedPolicySelections: totalGuidedPolicySelections / positions.length,
        averageGuidedPriorUses: totalGuidedPriorUses / positions.length,
        averageHybridPriorUses: totalHybridPriorUses / positions.length,
      });
    }
  }

  return {
    label,
    repoRoot: relativePathFromCwd(repoRoot) ?? repoRoot,
    openingPlies,
    positionSeedList: [...positionSeedList],
    randomMode,
    results,
  };
}

function buildDiffAgainstBaseline(baselineResults = [], candidateResults = []) {
  const baselineIndex = new Map(
    baselineResults.map((entry) => [`${entry.algorithm}:${entry.timeLimitMs}`, entry]),
  );

  return candidateResults.map((entry) => {
    const baseline = baselineIndex.get(`${entry.algorithm}:${entry.timeLimitMs}`);
    if (!baseline) {
      return {
        algorithm: entry.algorithm,
        timeLimitMs: entry.timeLimitMs,
        baselineFound: false,
      };
    }

    const iterationGain = entry.averageIterations - baseline.averageIterations;
    const treeNodeGain = entry.averageTreeNodes - baseline.averageTreeNodes;
    return {
      algorithm: entry.algorithm,
      timeLimitMs: entry.timeLimitMs,
      baselineFound: true,
      iterationGain,
      iterationGainRate: baseline.averageIterations > 0 ? iterationGain / baseline.averageIterations : 0,
      treeNodeGain,
      treeNodeGainRate: baseline.averageTreeNodes > 0 ? treeNodeGain / baseline.averageTreeNodes : 0,
    };
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printUsage();
    return;
  }

  const candidateRoot = resolveCliPath(args['candidate-root'] ?? args.candidateRoot ?? DEFAULTS.candidateRoot) ?? DEFAULTS.candidateRoot;
  const baselineRoot = args['baseline-root'] || args.baselineRoot
    ? resolveCliPath(args['baseline-root'] ?? args.baselineRoot)
    : DEFAULTS.baselineRoot;
  const outputJson = args['output-json'] || args.outputJson
    ? resolveCliPath(args['output-json'] ?? args.outputJson)
    : null;
  const algorithms = parseCsvStrings(args.algorithms, DEFAULTS.algorithms);
  const timeMsList = parseCsvIntegers(args['time-ms-list'] ?? args.timeMsList, DEFAULTS.timeMsList);
  const positionSeedList = parseCsvIntegers(args['position-seed-list'] ?? args.positionSeedList, DEFAULTS.positionSeedList);
  const openingPlies = toFiniteInteger(args['opening-plies'] ?? args.openingPlies, DEFAULTS.openingPlies, 1, 30);
  const randomMode = String(args['random-mode'] ?? args.randomMode ?? DEFAULTS.randomMode).trim() || DEFAULTS.randomMode;
  const maxDepth = toFiniteInteger(args['max-depth'] ?? args.maxDepth, DEFAULTS.maxDepth, 1, 12);
  const exactEndgameEmpties = toFiniteInteger(args['exact-endgame-empties'] ?? args.exactEndgameEmpties, DEFAULTS.exactEndgameEmpties, 0, 20);
  const maxTableEntries = toFiniteInteger(args['max-table-entries'] ?? args.maxTableEntries, DEFAULTS.maxTableEntries, 1024, 500000);
  const presetKey = String(args['preset-key'] ?? args.presetKey ?? DEFAULTS.presetKey);
  const styleKey = String(args['style-key'] ?? args.styleKey ?? DEFAULTS.styleKey);

  const benchmark = {
    type: 'mcts-throughput-compare',
    generatedAt: new Date().toISOString(),
    options: {
      candidateRoot: relativePathFromCwd(candidateRoot) ?? candidateRoot,
      baselineRoot: baselineRoot ? (relativePathFromCwd(baselineRoot) ?? baselineRoot) : null,
      algorithms,
      timeMsList,
      positionSeedList,
      openingPlies,
      randomMode,
      maxDepth,
      exactEndgameEmpties,
      maxTableEntries,
      presetKey,
      styleKey,
    },
    runs: [],
    diffAgainstBaseline: [],
  };

  if (baselineRoot) {
    benchmark.runs.push(await benchmarkRepo({
      label: 'baseline',
      repoRoot: baselineRoot,
      algorithms,
      timeMsList,
      positionSeedList,
      openingPlies,
      randomMode,
      maxDepth,
      exactEndgameEmpties,
      maxTableEntries,
      presetKey,
      styleKey,
    }));
  }

  benchmark.runs.push(await benchmarkRepo({
    label: baselineRoot ? 'candidate' : 'current',
    repoRoot: candidateRoot,
    algorithms,
    timeMsList,
    positionSeedList,
    openingPlies,
    randomMode,
    maxDepth,
    exactEndgameEmpties,
    maxTableEntries,
    presetKey,
    styleKey,
  }));

  if (baselineRoot && benchmark.runs.length >= 2) {
    benchmark.diffAgainstBaseline = buildDiffAgainstBaseline(
      benchmark.runs[0].results,
      benchmark.runs[1].results,
    );
  }

  if (outputJson) {
    fs.mkdirSync(path.dirname(outputJson), { recursive: true });
    fs.writeFileSync(outputJson, `${JSON.stringify(benchmark, null, 2)}\n`, 'utf8');
  }

  console.log(JSON.stringify(benchmark, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
