#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { parseArgs, relativePathFromCwd, resolveCliPath } from '../evaluator-training/lib.mjs';

const DEFAULTS = Object.freeze({
  repoRoot: process.cwd(),
  outputJson: null,
  algorithm: 'mcts-hybrid',
  timeMs: 120,
  emptiesList: [9, 10, 11, 12],
  seedList: [17, 31, 41, 53],
  exactEndgameEmpties: 8,
  mctsSolverWldEmpties: 2,
  maxDepth: 4,
  maxTableEntries: 90000,
  presetKey: 'custom',
  styleKey: 'balanced',
  referenceExactEmpties: 20,
  referenceTimeMs: 12000,
});

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/benchmark-mcts-solver-late-accuracy.mjs \
    [--repo-root .] \
    [--algorithm mcts-hybrid] \
    [--time-ms 120] \
    [--empties-list 9,10,11,12] \
    [--seed-list 17,31,41,53] \
    [--exact-endgame-empties 8] \
    [--mcts-solver-wld-empties 2] \
    [--output-json benchmarks/stage100_mcts_solver_late_accuracy.json]

설명:
- 같은 repo에서 late-position 묶음을 생성한 뒤, MCTS solver off/on을 exact reference와 함께 비교합니다.
- reference는 classic exact root search로 구하고, 각 후보가 실제로 고른 수의 exact score loss/WLD agreement를 함께 집계합니다.
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

function createSeededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function withBenchRandom(seed, callback) {
  const originalRandom = Math.random;
  Math.random = createSeededRandom(seed);
  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
}

function classifyOutcome(score) {
  if (score > 0) {
    return 'win';
  }
  if (score < 0) {
    return 'loss';
  }
  return 'draw';
}

function sortLegalMoves(state) {
  return state.getLegalMoves().sort((left, right) => left.coord.localeCompare(right.coord));
}

function createLatePosition(GameState, targetEmptyCount, seed) {
  const random = createSeededRandom(seed);
  let state = GameState.initial();
  let guard = 0;

  while (!state.isTerminal() && state.getEmptyCount() > targetEmptyCount) {
    const legalMoves = sortLegalMoves(state);
    state = legalMoves.length === 0
      ? state.passTurn()
      : state.applyMove(legalMoves[Math.floor(random() * legalMoves.length)].index).state;

    guard += 1;
    if (guard > 200) {
      throw new Error('Late-position generator exceeded guard.');
    }
  }

  return state;
}

function normalizeAfterPasses(state) {
  let current = state;
  let passes = 0;
  while (!current.isTerminal() && current.getLegalMoves().length === 0) {
    current = current.passTurn();
    passes += 1;
    if (passes > 4) {
      throw new Error('Pass normalization exceeded guard.');
    }
  }
  return current;
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

function createSearchOptions(overrides = {}) {
  return {
    presetKey: overrides.presetKey,
    styleKey: overrides.styleKey,
    searchAlgorithm: overrides.searchAlgorithm,
    timeLimitMs: overrides.timeLimitMs,
    maxDepth: overrides.maxDepth,
    exactEndgameEmpties: overrides.exactEndgameEmpties,
    wldPreExactEmpties: overrides.wldPreExactEmpties ?? 0,
    mctsSolverEnabled: overrides.mctsSolverEnabled,
    mctsSolverWldEmpties: overrides.mctsSolverWldEmpties,
    mctsExactContinuationEnabled: overrides.mctsExactContinuationEnabled ?? false,
    mctsExactContinuationExtraEmpties: overrides.mctsExactContinuationExtraEmpties ?? 0,
    aspirationWindow: 0,
    openingRandomness: 0,
    searchRandomness: 0,
    randomness: 0,
    maxTableEntries: overrides.maxTableEntries,
  };
}

function createExactReferenceAccessor(SearchEngine, sharedOptions) {
  const resultCache = new Map();

  return {
    getResult(state) {
      const key = state.hashKey();
      if (resultCache.has(key)) {
        return resultCache.get(key);
      }

      const engine = new SearchEngine(createSearchOptions({
        ...sharedOptions,
        searchAlgorithm: 'classic',
        timeLimitMs: sharedOptions.referenceTimeMs,
        exactEndgameEmpties: sharedOptions.referenceExactEmpties,
        wldPreExactEmpties: 0,
        mctsSolverEnabled: false,
        mctsSolverWldEmpties: 0,
      }));
      const result = engine.findBestMove(state);
      resultCache.set(key, result);
      return result;
    },
  };
}

function evaluateMoveExactScore(state, move, rootPlayer, exactReferenceAccessor) {
  if (!move) {
    return null;
  }

  const applied = state.applyMove(move.index);
  if (!applied?.state) {
    return null;
  }

  const child = normalizeAfterPasses(applied.state);
  if (child.isTerminal()) {
    return child.getDiscDifferential(rootPlayer) * 10000;
  }

  const childResult = exactReferenceAccessor.getResult(child);
  return child.currentPlayer === rootPlayer
    ? childResult.score
    : -childResult.score;
}

function summarizeRun(result, chosenExactScore, referenceScore) {
  const proven = Boolean(result?.isExactResult || result?.isWldResult);
  const scoreLoss = Number.isFinite(chosenExactScore) && Number.isFinite(referenceScore)
    ? referenceScore - chosenExactScore
    : null;
  return {
    bestMoveCoord: result?.bestMoveCoord ?? null,
    score: Number.isFinite(result?.score) ? result.score : null,
    searchMode: result?.searchMode ?? null,
    searchCompletion: result?.searchCompletion ?? null,
    isExactResult: Boolean(result?.isExactResult),
    isWldResult: Boolean(result?.isWldResult),
    wldOutcome: result?.wldOutcome ?? null,
    mctsRootSolvedOutcome: result?.mctsRootSolvedOutcome ?? null,
    mctsRootSolvedExact: Boolean(result?.mctsRootSolvedExact),
    chosenExactScore,
    chosenExactOutcome: Number.isFinite(chosenExactScore) ? classifyOutcome(chosenExactScore) : null,
    exactBestHit: Number.isFinite(chosenExactScore) && chosenExactScore === referenceScore,
    wldAgreement: Number.isFinite(chosenExactScore) && classifyOutcome(chosenExactScore) === classifyOutcome(referenceScore),
    scoreLoss,
    proven,
    elapsedMs: Number.isFinite(result?.stats?.elapsedMs) ? result.stats.elapsedMs : null,
    mctsIterations: Number.isFinite(result?.stats?.mctsIterations) ? result.stats.mctsIterations : null,
    mctsTreeNodes: Number.isFinite(result?.stats?.mctsTreeNodes) ? result.stats.mctsTreeNodes : null,
    mctsSolverStateProbes: Number.isFinite(result?.stats?.mctsSolverStateProbes) ? result.stats.mctsSolverStateProbes : 0,
    mctsSolverCacheHits: Number.isFinite(result?.stats?.mctsSolverCacheHits) ? result.stats.mctsSolverCacheHits : 0,
    mctsSolverExactHits: Number.isFinite(result?.stats?.mctsSolverExactHits) ? result.stats.mctsSolverExactHits : 0,
    mctsSolverWldHits: Number.isFinite(result?.stats?.mctsSolverWldHits) ? result.stats.mctsSolverWldHits : 0,
    mctsSolverNodeSolves: Number.isFinite(result?.stats?.mctsSolverNodeSolves) ? result.stats.mctsSolverNodeSolves : 0,
    mctsSolverPropagationUpdates: Number.isFinite(result?.stats?.mctsSolverPropagationUpdates) ? result.stats.mctsSolverPropagationUpdates : 0,
    mctsSolverRootProofs: Number.isFinite(result?.stats?.mctsSolverRootProofs) ? result.stats.mctsSolverRootProofs : 0,
  };
}

function average(values) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (filtered.length === 0) {
    return null;
  }
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function sum(values) {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
}

function aggregateRuns(label, runs) {
  const positions = runs.length;
  const exactBestHits = runs.filter((entry) => entry?.exactBestHit).length;
  const wldAgreements = runs.filter((entry) => entry?.wldAgreement).length;
  const provenCount = runs.filter((entry) => entry?.proven).length;
  return {
    label,
    positions,
    exactBestHits,
    exactBestHitRate: positions > 0 ? exactBestHits / positions : null,
    wldAgreements,
    wldAgreementRate: positions > 0 ? wldAgreements / positions : null,
    provenCount,
    provenRate: positions > 0 ? provenCount / positions : null,
    averageScoreLoss: average(runs.map((entry) => entry?.scoreLoss)),
    averageElapsedMs: average(runs.map((entry) => entry?.elapsedMs)),
    averageIterations: average(runs.map((entry) => entry?.mctsIterations)),
    averageTreeNodes: average(runs.map((entry) => entry?.mctsTreeNodes)),
    averageSolverStateProbes: average(runs.map((entry) => entry?.mctsSolverStateProbes)),
    averageSolverCacheHits: average(runs.map((entry) => entry?.mctsSolverCacheHits)),
    averageSolverExactHits: average(runs.map((entry) => entry?.mctsSolverExactHits)),
    averageSolverWldHits: average(runs.map((entry) => entry?.mctsSolverWldHits)),
    averageSolverNodeSolves: average(runs.map((entry) => entry?.mctsSolverNodeSolves)),
    averageSolverPropagationUpdates: average(runs.map((entry) => entry?.mctsSolverPropagationUpdates)),
    averageSolverRootProofs: average(runs.map((entry) => entry?.mctsSolverRootProofs)),
  };
}

function buildAggregateSummaries(scenarios) {
  const byEmpties = new Map();
  for (const scenario of scenarios) {
    if (!byEmpties.has(scenario.empties)) {
      byEmpties.set(scenario.empties, []);
    }
    byEmpties.get(scenario.empties).push(scenario);
  }

  return [...byEmpties.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([empties, entries]) => {
      const solverOffRuns = entries.map((entry) => entry.solverOff);
      const solverOnRuns = entries.map((entry) => entry.solverOn);
      const referenceOutcomes = entries.reduce((acc, entry) => {
        const outcome = entry.reference.outcome;
        acc[outcome] = (acc[outcome] ?? 0) + 1;
        return acc;
      }, { win: 0, draw: 0, loss: 0 });
      return {
        empties,
        positions: entries.length,
        referenceOutcomes,
        solverOff: aggregateRuns('solver-off', solverOffRuns),
        solverOn: aggregateRuns('solver-on', solverOnRuns),
        deltas: {
          exactBestHitRate: aggregateRuns('solver-on', solverOnRuns).exactBestHitRate - aggregateRuns('solver-off', solverOffRuns).exactBestHitRate,
          wldAgreementRate: aggregateRuns('solver-on', solverOnRuns).wldAgreementRate - aggregateRuns('solver-off', solverOffRuns).wldAgreementRate,
          provenRate: aggregateRuns('solver-on', solverOnRuns).provenRate - aggregateRuns('solver-off', solverOffRuns).provenRate,
          averageScoreLoss: (aggregateRuns('solver-on', solverOnRuns).averageScoreLoss ?? 0) - (aggregateRuns('solver-off', solverOffRuns).averageScoreLoss ?? 0),
          averageIterations: (aggregateRuns('solver-on', solverOnRuns).averageIterations ?? 0) - (aggregateRuns('solver-off', solverOffRuns).averageIterations ?? 0),
        },
      };
    });
}

function buildToplineSummary(aggregates) {
  const offRuns = aggregates.map((entry) => entry.solverOff);
  const onRuns = aggregates.map((entry) => entry.solverOn);
  const totalPositions = sum(aggregates.map((entry) => entry.positions));
  const offExactBestHits = sum(offRuns.map((entry) => entry.exactBestHits));
  const onExactBestHits = sum(onRuns.map((entry) => entry.exactBestHits));
  const offWldAgreements = sum(offRuns.map((entry) => entry.wldAgreements));
  const onWldAgreements = sum(onRuns.map((entry) => entry.wldAgreements));
  const offProvenCount = sum(offRuns.map((entry) => entry.provenCount));
  const onProvenCount = sum(onRuns.map((entry) => entry.provenCount));
  return {
    positions: totalPositions,
    solverOff: {
      exactBestHits: offExactBestHits,
      exactBestHitRate: totalPositions > 0 ? offExactBestHits / totalPositions : null,
      wldAgreements: offWldAgreements,
      wldAgreementRate: totalPositions > 0 ? offWldAgreements / totalPositions : null,
      provenCount: offProvenCount,
      provenRate: totalPositions > 0 ? offProvenCount / totalPositions : null,
    },
    solverOn: {
      exactBestHits: onExactBestHits,
      exactBestHitRate: totalPositions > 0 ? onExactBestHits / totalPositions : null,
      wldAgreements: onWldAgreements,
      wldAgreementRate: totalPositions > 0 ? onWldAgreements / totalPositions : null,
      provenCount: onProvenCount,
      provenRate: totalPositions > 0 ? onProvenCount / totalPositions : null,
    },
  };
}

async function benchmarkLateAccuracy(options) {
  const repoRoot = path.resolve(options.repoRoot);
  const { SearchEngine, GameState } = await loadRepoModules(repoRoot);
  const exactReferenceAccessor = createExactReferenceAccessor(SearchEngine, options);
  const scenarios = [];

  for (const empties of options.emptiesList) {
    for (const seed of options.seedList) {
      const state = createLatePosition(GameState, empties, seed);
      const legalMoves = sortLegalMoves(state);
      const reference = exactReferenceAccessor.getResult(state);
      const solverStates = [
        { label: 'solverOff', enabled: false },
        { label: 'solverOn', enabled: true },
      ];
      const runResults = {};

      for (const solverState of solverStates) {
        const engine = new SearchEngine(createSearchOptions({
          ...options,
          searchAlgorithm: options.algorithm,
          timeLimitMs: options.timeMs,
          exactEndgameEmpties: options.exactEndgameEmpties,
          wldPreExactEmpties: 0,
          mctsSolverEnabled: solverState.enabled,
          mctsSolverWldEmpties: options.mctsSolverWldEmpties,
        }));
        const randomSeed = ((empties * 1000) + (seed * 10) + (solverState.enabled ? 1 : 0)) >>> 0;
        const result = withBenchRandom(randomSeed, () => engine.findBestMove(state));
        const move = legalMoves.find((entry) => entry.index === result.bestMoveIndex) ?? null;
        const chosenExactScore = evaluateMoveExactScore(state, move, state.currentPlayer, exactReferenceAccessor);
        runResults[solverState.label] = summarizeRun(result, chosenExactScore, reference.score);
      }

      scenarios.push({
        empties,
        seed,
        currentPlayer: state.currentPlayer,
        legalMoveCount: legalMoves.length,
        reference: {
          bestMoveCoord: reference.bestMoveCoord,
          score: reference.score,
          outcome: classifyOutcome(reference.score),
          searchCompletion: reference.searchCompletion ?? null,
          elapsedMs: reference.stats?.elapsedMs ?? null,
        },
        solverOff: runResults.solverOff,
        solverOn: runResults.solverOn,
      });
    }
  }

  const aggregates = buildAggregateSummaries(scenarios);
  return {
    type: 'mcts-solver-late-accuracy-benchmark',
    generatedAt: new Date().toISOString(),
    repoRoot: relativePathFromCwd(repoRoot) ?? repoRoot,
    options: {
      algorithm: options.algorithm,
      timeMs: options.timeMs,
      emptiesList: [...options.emptiesList],
      seedList: [...options.seedList],
      exactEndgameEmpties: options.exactEndgameEmpties,
      mctsSolverWldEmpties: options.mctsSolverWldEmpties,
      maxDepth: options.maxDepth,
      maxTableEntries: options.maxTableEntries,
      presetKey: options.presetKey,
      styleKey: options.styleKey,
      referenceExactEmpties: options.referenceExactEmpties,
      referenceTimeMs: options.referenceTimeMs,
    },
    scenarios,
    aggregates,
    topline: buildToplineSummary(aggregates),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printUsage();
    return;
  }

  const options = {
    repoRoot: typeof args['repo-root'] === 'string' ? resolveCliPath(args['repo-root']) : DEFAULTS.repoRoot,
    outputJson: typeof args['output-json'] === 'string' ? resolveCliPath(args['output-json']) : DEFAULTS.outputJson,
    algorithm: typeof args.algorithm === 'string' && args.algorithm.trim() !== '' ? args.algorithm.trim() : DEFAULTS.algorithm,
    timeMs: toFiniteInteger(args['time-ms'], DEFAULTS.timeMs, 1),
    emptiesList: parseCsvIntegers(args['empties-list'], DEFAULTS.emptiesList),
    seedList: parseCsvIntegers(args['seed-list'], DEFAULTS.seedList),
    exactEndgameEmpties: toFiniteInteger(args['exact-endgame-empties'], DEFAULTS.exactEndgameEmpties, 0),
    mctsSolverWldEmpties: toFiniteInteger(args['mcts-solver-wld-empties'], DEFAULTS.mctsSolverWldEmpties, 0),
    maxDepth: toFiniteInteger(args['max-depth'], DEFAULTS.maxDepth, 1),
    maxTableEntries: toFiniteInteger(args['max-table-entries'], DEFAULTS.maxTableEntries, 1000),
    presetKey: typeof args['preset-key'] === 'string' ? args['preset-key'] : DEFAULTS.presetKey,
    styleKey: typeof args['style-key'] === 'string' ? args['style-key'] : DEFAULTS.styleKey,
    referenceExactEmpties: toFiniteInteger(args['reference-exact-empties'], DEFAULTS.referenceExactEmpties, 1),
    referenceTimeMs: toFiniteInteger(args['reference-time-ms'], DEFAULTS.referenceTimeMs, 1000),
  };

  const summary = await benchmarkLateAccuracy(options);
  if (options.outputJson) {
    fs.mkdirSync(path.dirname(options.outputJson), { recursive: true });
    fs.writeFileSync(options.outputJson, `${JSON.stringify(summary, null, 2)}\n`);
    console.log(`Wrote summary to ${relativePathFromCwd(options.outputJson) ?? options.outputJson}`);
  } else {
    console.log(JSON.stringify(summary, null, 2));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
