#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { describeSearchAlgorithm, normalizeSearchAlgorithm } from '../../js/ai/search-algorithms.js';
import { SearchEngine } from '../../js/ai/search-engine.js';
import { GameState } from '../../js/core/game-state.js';
import { parseArgs, relativePathFromCwd, resolveCliPath } from '../evaluator-training/lib.mjs';

const DEFAULTS = Object.freeze({
  algorithms: ['classic', 'classic-mtdf', 'classic-mtdf-2ply'],
  timeMsList: [80, 160, 320],
  positionSeedList: [17, 31, 41, 53, 71, 89],
  openingPlies: 20,
  randomMode: 'constant-zero',
  maxDepth: 5,
  exactEndgameEmpties: 8,
  aspirationWindow: 50,
  maxTableEntries: 90000,
  presetKey: 'custom',
  styleKey: 'balanced',
});

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/benchmark-classic-throughput-compare.mjs \
    [--output-json benchmarks/stage132_classic_throughput_compare.json] \
    [--algorithms classic,classic-mtdf,classic-mtdf-2ply] \
    [--time-ms-list 80,160,320] \
    [--position-seed-list 17,31,41,53,71,89] \
    [--opening-plies 20] \
    [--random-mode constant-zero] \
    [--max-depth 5] \
    [--exact-endgame-empties 8] \
    [--aspiration-window 50] \
    [--max-table-entries 90000]

설명:
- 같은 opening position 묶음에서 classic 계열 탐색 driver의 처리량/완료 깊이 차이를 비교합니다.
- 기본 baseline은 algorithms의 첫 항목이며, 나머지 후보는 같은 timeLimitMs/position 집합에서 baseline과 move/score 일치율도 계산합니다.
- random-mode=constant-zero는 tie-break 잡음을 줄여 root 탐색 처리량 차이를 보기 쉽게 합니다.
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
    .filter(Boolean)
    .map((token) => normalizeSearchAlgorithm(token));

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

function createOpeningState(openingPlies, seed) {
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

function createEngine(algorithm, options) {
  return new SearchEngine({
    presetKey: options.presetKey,
    styleKey: options.styleKey,
    searchAlgorithm: algorithm,
    maxDepth: options.maxDepth,
    timeLimitMs: options.timeLimitMs,
    exactEndgameEmpties: options.exactEndgameEmpties,
    wldPreExactEmpties: 0,
    aspirationWindow: options.aspirationWindow,
    openingRandomness: 0,
    searchRandomness: 0,
    randomness: 0,
    maxTableEntries: options.maxTableEntries,
  });
}

function summarizeOneResult(positionIndex, result) {
  return {
    positionIndex,
    bestMoveIndex: Number.isInteger(result?.bestMoveIndex) ? result.bestMoveIndex : null,
    bestMoveCoord: typeof result?.bestMoveCoord === 'string' ? result.bestMoveCoord : null,
    score: Number.isFinite(result?.score) ? result.score : null,
    searchMode: result?.searchMode ?? null,
    searchDriver: result?.searchDriver ?? null,
    completedDepth: Number(result?.stats?.completedDepth ?? 0),
    elapsedMs: Number(result?.stats?.elapsedMs ?? 0),
    nodes: Number(result?.stats?.nodes ?? 0),
    cutoffs: Number(result?.stats?.cutoffs ?? 0),
    ttHits: Number(result?.stats?.ttHits ?? 0),
    mtdfPasses: Number(result?.stats?.mtdfPasses ?? 0),
    mtdfFailHighs: Number(result?.stats?.mtdfFailHighs ?? 0),
    mtdfFailLows: Number(result?.stats?.mtdfFailLows ?? 0),
    mtdfVerificationPasses: Number(result?.stats?.mtdfVerificationPasses ?? 0),
    completion: result?.searchCompletion ?? null,
  };
}

function averageBy(entries, key) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return 0;
  }
  const total = entries.reduce((sum, entry) => sum + Number(entry?.[key] ?? 0), 0);
  return total / entries.length;
}

function buildAggregate(algorithm, timeLimitMs, samples) {
  return {
    algorithm,
    algorithmLabel: describeSearchAlgorithm(algorithm)?.label ?? algorithm,
    timeLimitMs,
    samples,
    averageCompletedDepth: averageBy(samples, 'completedDepth'),
    averageElapsedMs: averageBy(samples, 'elapsedMs'),
    averageNodes: averageBy(samples, 'nodes'),
    averageCutoffs: averageBy(samples, 'cutoffs'),
    averageTtHits: averageBy(samples, 'ttHits'),
    averageMtdfPasses: averageBy(samples, 'mtdfPasses'),
    averageMtdfFailHighs: averageBy(samples, 'mtdfFailHighs'),
    averageMtdfFailLows: averageBy(samples, 'mtdfFailLows'),
    averageMtdfVerificationPasses: averageBy(samples, 'mtdfVerificationPasses'),
    completionRate: samples.length > 0
      ? samples.filter((sample) => sample.completion === 'complete').length / samples.length
      : 0,
    nodesPerMs: averageBy(samples, 'elapsedMs') > 0
      ? averageBy(samples, 'nodes') / averageBy(samples, 'elapsedMs')
      : 0,
  };
}

function compareAgainstBaseline(baselineAggregate, candidateAggregate) {
  const baselineSamples = baselineAggregate?.samples ?? [];
  const candidateSamples = candidateAggregate?.samples ?? [];
  const sampleCount = Math.min(baselineSamples.length, candidateSamples.length);
  let moveMatches = 0;
  let scoreMatches = 0;
  let candidateDeeperCount = 0;
  let baselineDeeperCount = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const baseline = baselineSamples[index];
    const candidate = candidateSamples[index];
    if (baseline?.bestMoveIndex === candidate?.bestMoveIndex) {
      moveMatches += 1;
    }
    if (baseline?.score === candidate?.score) {
      scoreMatches += 1;
    }
    if (Number(candidate?.completedDepth ?? 0) > Number(baseline?.completedDepth ?? 0)) {
      candidateDeeperCount += 1;
    } else if (Number(candidate?.completedDepth ?? 0) < Number(baseline?.completedDepth ?? 0)) {
      baselineDeeperCount += 1;
    }
  }

  return {
    baselineAlgorithm: baselineAggregate.algorithm,
    candidateAlgorithm: candidateAggregate.algorithm,
    timeLimitMs: candidateAggregate.timeLimitMs,
    sampleCount,
    moveAgreementRate: sampleCount > 0 ? moveMatches / sampleCount : 0,
    scoreAgreementRate: sampleCount > 0 ? scoreMatches / sampleCount : 0,
    candidateAverageDepthGain: candidateAggregate.averageCompletedDepth - baselineAggregate.averageCompletedDepth,
    candidateAverageNodesGainRate: baselineAggregate.averageNodes > 0
      ? (candidateAggregate.averageNodes - baselineAggregate.averageNodes) / baselineAggregate.averageNodes
      : 0,
    candidateNodesPerMsGainRate: baselineAggregate.nodesPerMs > 0
      ? (candidateAggregate.nodesPerMs - baselineAggregate.nodesPerMs) / baselineAggregate.nodesPerMs
      : 0,
    candidateDeeperRate: sampleCount > 0 ? candidateDeeperCount / sampleCount : 0,
    baselineDeeperRate: sampleCount > 0 ? baselineDeeperCount / sampleCount : 0,
  };
}

function writeJsonIfRequested(outputJsonPath, data) {
  if (!outputJsonPath) {
    return null;
  }

  const resolved = resolveCliPath(outputJsonPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return resolved;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const algorithms = parseCsvStrings(args.algorithms, DEFAULTS.algorithms);
  if (algorithms.length < 2) {
    throw new Error('At least two algorithms are required for a throughput comparison.');
  }

  const timeMsList = parseCsvIntegers(args['time-ms-list'], DEFAULTS.timeMsList);
  const positionSeedList = parseCsvIntegers(args['position-seed-list'], DEFAULTS.positionSeedList);
  const openingPlies = toFiniteInteger(args['opening-plies'], DEFAULTS.openingPlies, 0, 60);
  const randomMode = typeof args['random-mode'] === 'string' && args['random-mode'].trim() !== ''
    ? args['random-mode'].trim()
    : DEFAULTS.randomMode;
  const maxDepth = toFiniteInteger(args['max-depth'], DEFAULTS.maxDepth, 1, 16);
  const exactEndgameEmpties = toFiniteInteger(args['exact-endgame-empties'], DEFAULTS.exactEndgameEmpties, 0, 24);
  const aspirationWindow = toFiniteInteger(args['aspiration-window'], DEFAULTS.aspirationWindow, 0, 5000);
  const maxTableEntries = toFiniteInteger(args['max-table-entries'], DEFAULTS.maxTableEntries, 1000, 1_000_000);
  const presetKey = typeof args['preset-key'] === 'string' && args['preset-key'].trim() !== ''
    ? args['preset-key'].trim()
    : DEFAULTS.presetKey;
  const styleKey = typeof args['style-key'] === 'string' && args['style-key'].trim() !== ''
    ? args['style-key'].trim()
    : DEFAULTS.styleKey;

  const positions = positionSeedList.map((seed) => createOpeningState(openingPlies, seed));
  const runs = [];

  for (const timeLimitMs of timeMsList) {
    for (const algorithm of algorithms) {
      const samples = [];
      for (let index = 0; index < positions.length; index += 1) {
        const engine = createEngine(algorithm, {
          presetKey,
          styleKey,
          maxDepth,
          timeLimitMs,
          exactEndgameEmpties,
          aspirationWindow,
          maxTableEntries,
        });
        const result = withBenchRandom(randomMode, 100 + index, () => engine.findBestMove(positions[index]));
        samples.push(summarizeOneResult(index, result));
      }
      runs.push(buildAggregate(algorithm, timeLimitMs, samples));
    }
  }

  const baselineAlgorithm = algorithms[0];
  const comparisonsAgainstBaseline = [];
  for (const timeLimitMs of timeMsList) {
    const baselineAggregate = runs.find((entry) => entry.algorithm === baselineAlgorithm && entry.timeLimitMs === timeLimitMs);
    if (!baselineAggregate) {
      continue;
    }
    for (const algorithm of algorithms) {
      if (algorithm === baselineAlgorithm) {
        continue;
      }
      const candidateAggregate = runs.find((entry) => entry.algorithm === algorithm && entry.timeLimitMs === timeLimitMs);
      if (!candidateAggregate) {
        continue;
      }
      comparisonsAgainstBaseline.push(compareAgainstBaseline(baselineAggregate, candidateAggregate));
    }
  }

  const summary = {
    type: 'classic-throughput-compare',
    generatedAt: new Date().toISOString(),
    options: {
      algorithms,
      timeMsList,
      positionSeedList,
      openingPlies,
      randomMode,
      maxDepth,
      exactEndgameEmpties,
      aspirationWindow,
      maxTableEntries,
      presetKey,
      styleKey,
    },
    baselineAlgorithm,
    runs,
    comparisonsAgainstBaseline,
  };

  for (const run of runs) {
    console.log(
      [
        `${run.timeLimitMs}ms`,
        run.algorithm,
        `depth ${run.averageCompletedDepth.toFixed(2)}`,
        `nodes ${run.averageNodes.toFixed(0)}`,
        `nodes/ms ${run.nodesPerMs.toFixed(2)}`,
        `mtdf ${run.averageMtdfPasses.toFixed(2)}`,
      ].join(' | '),
    );
  }

  const outputJsonPath = writeJsonIfRequested(args['output-json'], summary);
  if (outputJsonPath) {
    console.log(`Saved throughput summary to ${relativePathFromCwd(outputJsonPath) ?? outputJsonPath}`);
  }
}

main().catch((error) => {
  console.error(error?.stack ?? error?.message ?? String(error));
  process.exitCode = 1;
});
