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
  seedList: [11, 17, 21, 31, 41, 53, 71, 89],
  exactEndgameEmpties: 8,
  mctsSolverWldEmpties: 2,
  baselineContinuationExtraEmpties: 2,
  candidateContinuationExtraEmpties: 3,
  proofPriorityScale: 0.15,
  proofPriorityMaxEmpties: 12,
  maxDepth: 4,
  maxTableEntries: 90000,
  presetKey: 'custom',
  styleKey: 'balanced',
  referenceExactEmpties: 20,
  referenceTimeMs: 12000,
});

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/benchmark-mcts-continuation-bridge.mjs \
    [--repo-root .] \
    [--algorithm mcts-hybrid] \
    [--time-ms 120] \
    [--empties-list 9,10,11,12] \
    [--seed-list 11,17,21,31,41,53,71,89] \
    [--baseline-continuation-extra-empties 2] \
    [--candidate-continuation-extra-empties 3] \
    [--proof-priority-scale 0.15] \
    [--proof-priority-max-empties 12] \
    [--output-json benchmarks/stage104_mcts_continuation_bridge_120ms.json]

설명:
- Stage 103 baseline emulation(continuation +2, proof-priority handoff 끔)과
  Stage 104 candidate(continuation +3, continuation 창 안 proof-priority handoff 켬)를
  같은 late-position exact reference에 대해 비교합니다.
`);
}

function toFiniteInteger(value, fallback, minimum = Number.NEGATIVE_INFINITY, maximum = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
}

function toFiniteNumber(value, fallback, minimum = Number.NEGATIVE_INFINITY, maximum = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(minimum, Math.min(maximum, parsed));
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
    mctsExactContinuationEnabled: overrides.mctsExactContinuationEnabled,
    mctsExactContinuationExtraEmpties: overrides.mctsExactContinuationExtraEmpties,
    mctsProofPriorityEnabled: overrides.mctsProofPriorityEnabled,
    mctsProofPriorityScale: overrides.mctsProofPriorityScale,
    mctsProofPriorityMaxEmpties: overrides.mctsProofPriorityMaxEmpties,
    mctsProofPriorityContinuationHandoffEnabled: overrides.mctsProofPriorityContinuationHandoffEnabled,
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
        mctsExactContinuationEnabled: false,
        mctsExactContinuationExtraEmpties: 0,
        mctsProofPriorityEnabled: false,
        mctsProofPriorityScale: 0,
        mctsProofPriorityMaxEmpties: 0,
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
  const proofTelemetry = result?.mctsProofTelemetry ?? null;
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
    mctsExactContinuationAttempted: Boolean(result?.mctsExactContinuationAttempted),
    mctsExactContinuationCompleted: Boolean(result?.mctsExactContinuationCompleted),
    mctsExactContinuationApplied: Boolean(result?.mctsExactContinuationApplied),
    mctsExactContinuationBestMoveChanged: Boolean(result?.mctsExactContinuationBestMoveChanged),
    elapsedMs: Number.isFinite(result?.stats?.elapsedMs) ? result.stats.elapsedMs : null,
    mctsIterations: Number.isFinite(result?.stats?.mctsIterations) ? result.stats.mctsIterations : null,
    mctsTreeNodes: Number.isFinite(result?.stats?.mctsTreeNodes) ? result.stats.mctsTreeNodes : null,
    mctsExactContinuationRuns: Number.isFinite(result?.stats?.mctsExactContinuationRuns) ? result.stats.mctsExactContinuationRuns : 0,
    mctsExactContinuationCompletions: Number.isFinite(result?.stats?.mctsExactContinuationCompletions) ? result.stats.mctsExactContinuationCompletions : 0,
    mctsExactContinuationTimeouts: Number.isFinite(result?.stats?.mctsExactContinuationTimeouts) ? result.stats.mctsExactContinuationTimeouts : 0,
    mctsProofPrioritySelectionNodes: Number.isFinite(result?.stats?.mctsProofPrioritySelectionNodes)
      ? result.stats.mctsProofPrioritySelectionNodes
      : 0,
    proofPriorityEnabled: Boolean(proofTelemetry?.proofPriorityEnabled),
    proofPriorityDepthEligible: Boolean(proofTelemetry?.proofPriorityDepthEligible),
    proofPrioritySuppressedByContinuationWindow: Boolean(proofTelemetry?.proofPrioritySuppressedByContinuationWindow),
    continuationDepthEligible: Boolean(proofTelemetry?.continuationDepthEligible),
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
  const exactResultCount = runs.filter((entry) => entry?.isExactResult).length;
  const continuationAppliedCount = runs.filter((entry) => entry?.mctsExactContinuationApplied).length;
  const continuationSuppressionCount = runs.filter((entry) => entry?.proofPrioritySuppressedByContinuationWindow).length;
  return {
    label,
    positions,
    exactBestHits,
    exactBestHitRate: positions > 0 ? exactBestHits / positions : null,
    wldAgreements,
    wldAgreementRate: positions > 0 ? wldAgreements / positions : null,
    provenCount,
    provenRate: positions > 0 ? provenCount / positions : null,
    exactResultCount,
    exactResultRate: positions > 0 ? exactResultCount / positions : null,
    continuationAppliedCount,
    continuationAppliedRate: positions > 0 ? continuationAppliedCount / positions : null,
    continuationSuppressionCount,
    continuationSuppressionRate: positions > 0 ? continuationSuppressionCount / positions : null,
    averageScoreLoss: average(runs.map((entry) => entry?.scoreLoss)),
    averageElapsedMs: average(runs.map((entry) => entry?.elapsedMs)),
    averageIterations: average(runs.map((entry) => entry?.mctsIterations)),
    averageTreeNodes: average(runs.map((entry) => entry?.mctsTreeNodes)),
    averageExactContinuationRuns: average(runs.map((entry) => entry?.mctsExactContinuationRuns)),
    averageExactContinuationCompletions: average(runs.map((entry) => entry?.mctsExactContinuationCompletions)),
    averageExactContinuationTimeouts: average(runs.map((entry) => entry?.mctsExactContinuationTimeouts)),
    averageProofPrioritySelectionNodes: average(runs.map((entry) => entry?.mctsProofPrioritySelectionNodes)),
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
      const baselineRuns = entries.map((entry) => entry.baseline);
      const candidateRuns = entries.map((entry) => entry.candidate);
      return {
        empties,
        positions: entries.length,
        referenceOutcomes: entries.reduce((acc, entry) => {
          const outcome = entry.reference.outcome;
          acc[outcome] = (acc[outcome] ?? 0) + 1;
          return acc;
        }, { win: 0, draw: 0, loss: 0 }),
        baseline: aggregateRuns('stage103-baseline', baselineRuns),
        candidate: aggregateRuns('stage104-candidate', candidateRuns),
        deltas: {
          exactBestHitRate: aggregateRuns('stage104-candidate', candidateRuns).exactBestHitRate
            - aggregateRuns('stage103-baseline', baselineRuns).exactBestHitRate,
          exactResultRate: aggregateRuns('stage104-candidate', candidateRuns).exactResultRate
            - aggregateRuns('stage103-baseline', baselineRuns).exactResultRate,
          continuationAppliedRate: aggregateRuns('stage104-candidate', candidateRuns).continuationAppliedRate
            - aggregateRuns('stage103-baseline', baselineRuns).continuationAppliedRate,
          averageScoreLoss: (aggregateRuns('stage104-candidate', candidateRuns).averageScoreLoss ?? 0)
            - (aggregateRuns('stage103-baseline', baselineRuns).averageScoreLoss ?? 0),
          averageElapsedMs: (aggregateRuns('stage104-candidate', candidateRuns).averageElapsedMs ?? 0)
            - (aggregateRuns('stage103-baseline', baselineRuns).averageElapsedMs ?? 0),
        },
      };
    });
}

function buildToplineSummary(aggregates) {
  const baselineRuns = aggregates.map((entry) => entry.baseline);
  const candidateRuns = aggregates.map((entry) => entry.candidate);
  const totalPositions = sum(aggregates.map((entry) => entry.positions));
  const baselineExactBestHits = sum(baselineRuns.map((entry) => entry.exactBestHits));
  const candidateExactBestHits = sum(candidateRuns.map((entry) => entry.exactBestHits));
  const baselineExactResults = sum(baselineRuns.map((entry) => entry.exactResultCount));
  const candidateExactResults = sum(candidateRuns.map((entry) => entry.exactResultCount));
  const baselineWldAgreements = sum(baselineRuns.map((entry) => entry.wldAgreements));
  const candidateWldAgreements = sum(candidateRuns.map((entry) => entry.wldAgreements));
  const baselineProvenCount = sum(baselineRuns.map((entry) => entry.provenCount));
  const candidateProvenCount = sum(candidateRuns.map((entry) => entry.provenCount));
  const baselineContinuationApplied = sum(baselineRuns.map((entry) => entry.continuationAppliedCount));
  const candidateContinuationApplied = sum(candidateRuns.map((entry) => entry.continuationAppliedCount));
  const candidateSuppressionCount = sum(candidateRuns.map((entry) => entry.continuationSuppressionCount));

  return {
    positions: totalPositions,
    baseline: {
      exactBestHits: baselineExactBestHits,
      exactBestHitRate: totalPositions > 0 ? baselineExactBestHits / totalPositions : null,
      exactResultCount: baselineExactResults,
      exactResultRate: totalPositions > 0 ? baselineExactResults / totalPositions : null,
      wldAgreements: baselineWldAgreements,
      wldAgreementRate: totalPositions > 0 ? baselineWldAgreements / totalPositions : null,
      provenCount: baselineProvenCount,
      provenRate: totalPositions > 0 ? baselineProvenCount / totalPositions : null,
      continuationAppliedCount: baselineContinuationApplied,
      continuationAppliedRate: totalPositions > 0 ? baselineContinuationApplied / totalPositions : null,
    },
    candidate: {
      exactBestHits: candidateExactBestHits,
      exactBestHitRate: totalPositions > 0 ? candidateExactBestHits / totalPositions : null,
      exactResultCount: candidateExactResults,
      exactResultRate: totalPositions > 0 ? candidateExactResults / totalPositions : null,
      wldAgreements: candidateWldAgreements,
      wldAgreementRate: totalPositions > 0 ? candidateWldAgreements / totalPositions : null,
      provenCount: candidateProvenCount,
      provenRate: totalPositions > 0 ? candidateProvenCount / totalPositions : null,
      continuationAppliedCount: candidateContinuationApplied,
      continuationAppliedRate: totalPositions > 0 ? candidateContinuationApplied / totalPositions : null,
      continuationSuppressionCount: candidateSuppressionCount,
      continuationSuppressionRate: totalPositions > 0 ? candidateSuppressionCount / totalPositions : null,
    },
  };
}

async function benchmarkContinuationBridge(options) {
  const repoRoot = path.resolve(options.repoRoot);
  const { SearchEngine, GameState } = await loadRepoModules(repoRoot);
  const exactReferenceAccessor = createExactReferenceAccessor(SearchEngine, options);
  const scenarios = [];

  const runStates = [
    {
      label: 'baseline',
      overrides: {
        mctsExactContinuationEnabled: true,
        mctsExactContinuationExtraEmpties: options.baselineContinuationExtraEmpties,
        mctsProofPriorityEnabled: true,
        mctsProofPriorityScale: options.proofPriorityScale,
        mctsProofPriorityMaxEmpties: options.proofPriorityMaxEmpties,
        mctsProofPriorityContinuationHandoffEnabled: false,
      },
    },
    {
      label: 'candidate',
      overrides: {
        mctsExactContinuationEnabled: true,
        mctsExactContinuationExtraEmpties: options.candidateContinuationExtraEmpties,
        mctsProofPriorityEnabled: true,
        mctsProofPriorityScale: options.proofPriorityScale,
        mctsProofPriorityMaxEmpties: options.proofPriorityMaxEmpties,
        mctsProofPriorityContinuationHandoffEnabled: true,
      },
    },
  ];

  for (const empties of options.emptiesList) {
    for (const seed of options.seedList) {
      const state = createLatePosition(GameState, empties, seed);
      const legalMoves = sortLegalMoves(state);
      const reference = exactReferenceAccessor.getResult(state);
      const runResults = {};
      const randomSeed = ((empties * 1000) + (seed * 10) + 7) >>> 0;

      for (const runState of runStates) {
        const engine = new SearchEngine(createSearchOptions({
          ...options,
          searchAlgorithm: options.algorithm,
          timeLimitMs: options.timeMs,
          exactEndgameEmpties: options.exactEndgameEmpties,
          wldPreExactEmpties: 0,
          mctsSolverEnabled: true,
          mctsSolverWldEmpties: options.mctsSolverWldEmpties,
          ...runState.overrides,
        }));
        const result = withBenchRandom(randomSeed, () => engine.findBestMove(state));
        const move = legalMoves.find((entry) => entry.index === result.bestMoveIndex) ?? null;
        const chosenExactScore = evaluateMoveExactScore(state, move, state.currentPlayer, exactReferenceAccessor);
        runResults[runState.label] = summarizeRun(result, chosenExactScore, reference.score);
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
        baseline: runResults.baseline,
        candidate: runResults.candidate,
      });
    }
  }

  const aggregates = buildAggregateSummaries(scenarios);
  return {
    type: 'mcts-continuation-bridge-benchmark',
    generatedAt: new Date().toISOString(),
    repoRoot: relativePathFromCwd(repoRoot) ?? repoRoot,
    options: {
      algorithm: options.algorithm,
      timeMs: options.timeMs,
      emptiesList: [...options.emptiesList],
      seedList: [...options.seedList],
      exactEndgameEmpties: options.exactEndgameEmpties,
      mctsSolverWldEmpties: options.mctsSolverWldEmpties,
      baselineContinuationExtraEmpties: options.baselineContinuationExtraEmpties,
      candidateContinuationExtraEmpties: options.candidateContinuationExtraEmpties,
      proofPriorityScale: options.proofPriorityScale,
      proofPriorityMaxEmpties: options.proofPriorityMaxEmpties,
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
    baselineContinuationExtraEmpties: toFiniteInteger(
      args['baseline-continuation-extra-empties'],
      DEFAULTS.baselineContinuationExtraEmpties,
      0,
    ),
    candidateContinuationExtraEmpties: toFiniteInteger(
      args['candidate-continuation-extra-empties'],
      DEFAULTS.candidateContinuationExtraEmpties,
      0,
    ),
    proofPriorityScale: toFiniteNumber(args['proof-priority-scale'], DEFAULTS.proofPriorityScale, 0, 5),
    proofPriorityMaxEmpties: toFiniteInteger(args['proof-priority-max-empties'], DEFAULTS.proofPriorityMaxEmpties, 0, 16),
    maxDepth: toFiniteInteger(args['max-depth'], DEFAULTS.maxDepth, 1),
    maxTableEntries: toFiniteInteger(args['max-table-entries'], DEFAULTS.maxTableEntries, 1000),
    presetKey: typeof args['preset-key'] === 'string' ? args['preset-key'] : DEFAULTS.presetKey,
    styleKey: typeof args['style-key'] === 'string' ? args['style-key'] : DEFAULTS.styleKey,
    referenceExactEmpties: toFiniteInteger(args['reference-exact-empties'], DEFAULTS.referenceExactEmpties, 1),
    referenceTimeMs: toFiniteInteger(args['reference-time-ms'], DEFAULTS.referenceTimeMs, 1000),
  };

  const summary = await benchmarkContinuationBridge(options);
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
