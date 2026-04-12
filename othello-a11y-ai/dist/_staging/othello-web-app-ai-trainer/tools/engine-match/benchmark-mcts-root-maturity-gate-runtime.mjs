#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { parseArgs, relativePathFromCwd, resolveCliPath } from '../evaluator-training/lib.mjs';

const DEFAULTS = Object.freeze({
  repoRoot: process.cwd(),
  outputJson: null,
  mode: 'fixed-iterations',
  algorithm: 'mcts-hybrid',
  fixedIterationTimeLimitMs: 10000,
  timeMsList: [200, 280],
  emptiesList: [12],
  seedList: [15, 17, 31, 41, 47, 53, 71, 89, 107, 123, 149, 167, 191, 223, 257, 281, 307, 331, 359, 383, 419, 443, 467, 491],
  iterationsList: [24, 32],
  exactEndgameEmpties: 8,
  mctsSolverWldEmpties: 2,
  mctsExactContinuationExtraEmpties: 3,
  mctsExactContinuationAdaptiveEnabled: true,
  mctsExactContinuationAdaptiveExtraEmpties: 1,
  mctsExactContinuationAdaptiveOutcomeMode: 'loss-only',
  mctsExactContinuationAdaptiveMaxLegalMoves: 0,
  mctsProofPriorityScale: 0.15,
  mctsProofPriorityMaxEmpties: 12,
  mctsProofPriorityContinuationHandoffEnabled: true,
  baseProofMetricMode: 'legacy-root',
  baseProofPriorityBiasMode: 'rank',
  targetProofMetricMode: 'per-player',
  targetProofPriorityBiasMode: 'pnmax',
  rootMaturityGateMode: 'best-metric-lte-1-or-solved-child',
  rootMaturityGateMinVisits: 0,
  rootMaturityGateBestFiniteMetricThreshold: 1,
  rootMaturityGateRequireNoSolvedChild: false,
  rootMaturityGateMinDistinctFiniteMetricCount: 0,
  maxDepth: 4,
  maxTableEntries: 90000,
  mctsMaxNodes: 50000,
  timeBudgetMctsMaxIterations: 200000,
  presetKey: 'custom',
  styleKey: 'balanced',
  referenceExactEmpties: 20,
  referenceTimeMs: 6000,
});

const PROOF_METRIC_MODES = new Set(['legacy-root', 'per-player']);
const PROOF_PRIORITY_BIAS_MODES = new Set(['rank', 'pnmax', 'pnsum']);
const ROOT_MATURITY_GATE_MODES = new Set([
  'coverage-gte-0.50',
  'coverage-gte-0.75',
  'best-metric-lte-1',
  'best-metric-lte-1-or-solved-child',
  'best-metric-threshold',
  'best-metric-threshold-or-solved-child',
]);
const BENCH_MODES = new Set(['fixed-iterations', 'time-budget']);
const MAX_MCTS_PROOF_NUMBER = 1_000_000_000;

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/benchmark-mcts-root-maturity-gate-runtime.mjs \
    [--repo-root .] \
    [--mode fixed-iterations|time-budget] \
    [--algorithm mcts-hybrid] \
    [--empties-list 12] \
    [--seed-list 15,17,31,41] \
    [--iterations-list 24,32] \
    [--time-ms-list 200,280] \
    [--root-maturity-gate-mode best-metric-lte-1-or-solved-child] \
    [--root-maturity-gate-min-visits 0] \
    [--root-maturity-gate-best-metric-threshold 1] \
    [--root-maturity-gate-require-no-solved-child false] \
    [--root-maturity-gate-min-distinct-finite-metric-count 0] \
    [--base-proof-metric-mode legacy-root] \
    [--base-proof-priority-bias-mode rank] \
    [--target-proof-metric-mode per-player] \
    [--target-proof-priority-bias-mode pnmax] \
    [--output-json benchmarks/stage116_mcts_root_maturity_gate_runtime.json]

설명:
- baseline(legacy-root + rank), target(per-player + pnmax), runtime root-maturity gate variant를 같은 late position에서 직접 비교합니다.
- fixed-iterations 모드에서는 deadline jitter를 줄이기 위해 mctsMaxIterations만 고정하고,
  time-budget 모드에서는 실제 200/280ms 예산에서 root-maturity gate activation과 proof closure를 다시 확인합니다.
`);
}

function toFiniteInteger(value, fallback, minimum = Number.NEGATIVE_INFINITY, maximum = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
}

function toFiniteNumber(value, fallback, minimum = Number.NEGATIVE_INFINITY, maximum = Number.POSITIVE_INFINITY, precision = 2) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const clamped = Math.max(minimum, Math.min(maximum, parsed));
  const multiplier = 10 ** precision;
  return Math.round(clamped * multiplier) / multiplier;
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

function parseEnum(value, fallback, allowedValues) {
  if (typeof value !== 'string' || value.trim() === '') {
    return fallback;
  }
  const trimmed = value.trim();
  return allowedValues.has(trimmed) ? trimmed : fallback;
}

function parseBoolean(value, fallback) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
      return false;
    }
  }
  return fallback;
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
    mctsExactContinuationAdaptiveEnabled: overrides.mctsExactContinuationAdaptiveEnabled,
    mctsExactContinuationAdaptiveExtraEmpties: overrides.mctsExactContinuationAdaptiveExtraEmpties,
    mctsExactContinuationAdaptiveOutcomeMode: overrides.mctsExactContinuationAdaptiveOutcomeMode,
    mctsExactContinuationAdaptiveMaxLegalMoves: overrides.mctsExactContinuationAdaptiveMaxLegalMoves,
    mctsProofPriorityEnabled: overrides.mctsProofPriorityEnabled,
    mctsProofPriorityScale: overrides.mctsProofPriorityScale,
    mctsProofPriorityMaxEmpties: overrides.mctsProofPriorityMaxEmpties,
    mctsProofPriorityContinuationHandoffEnabled: overrides.mctsProofPriorityContinuationHandoffEnabled,
    mctsProofMetricMode: overrides.mctsProofMetricMode,
    mctsProofPriorityBiasMode: overrides.mctsProofPriorityBiasMode,
    mctsProofPriorityLateBiasPackageMode: 'fixed',
    mctsProofPriorityLateBiasThresholdMs: 0,
    mctsProofPriorityLateBiasMetricMode: overrides.mctsProofPriorityRootMaturityGateMetricMode ?? overrides.mctsProofMetricMode,
    mctsProofPriorityLateBiasBiasMode: overrides.mctsProofPriorityRootMaturityGateBiasMode ?? overrides.mctsProofPriorityBiasMode,
    mctsProofPriorityRootMaturityGateEnabled: overrides.mctsProofPriorityRootMaturityGateEnabled,
    mctsProofPriorityRootMaturityGateMode: overrides.mctsProofPriorityRootMaturityGateMode,
    mctsProofPriorityRootMaturityGateMetricMode: overrides.mctsProofPriorityRootMaturityGateMetricMode,
    mctsProofPriorityRootMaturityGateBiasMode: overrides.mctsProofPriorityRootMaturityGateBiasMode,
    mctsProofPriorityRootMaturityGateMinVisits: overrides.mctsProofPriorityRootMaturityGateMinVisits,
    mctsProofPriorityRootMaturityGateBestFiniteMetricThreshold: overrides.mctsProofPriorityRootMaturityGateBestFiniteMetricThreshold,
    mctsProofPriorityRootMaturityGateRequireNoSolvedChild: overrides.mctsProofPriorityRootMaturityGateRequireNoSolvedChild,
    mctsProofPriorityRootMaturityGateMinDistinctFiniteMetricCount: overrides.mctsProofPriorityRootMaturityGateMinDistinctFiniteMetricCount,
    mctsMaxIterations: overrides.mctsMaxIterations,
    mctsMaxNodes: overrides.mctsMaxNodes,
    aspirationWindow: 0,
    openingRandomness: 0,
    searchRandomness: 0,
    randomness: 0,
    maxTableEntries: overrides.maxTableEntries,
  };
}

function describeRootMaturityGateVariant(variant) {
  const detailParts = [];
  if ((variant.rootMaturityGateMinVisits ?? 0) > 0) {
    detailParts.push(`visits≥${variant.rootMaturityGateMinVisits}`);
  }
  if (variant.gateMode === 'best-metric-threshold' || variant.gateMode === 'best-metric-threshold-or-solved-child') {
    detailParts.push(`metric≤${variant.rootMaturityGateBestFiniteMetricThreshold}`);
  }
  if (variant.rootMaturityGateRequireNoSolvedChild === true) {
    detailParts.push('solved-child 없음');
  }
  if ((variant.rootMaturityGateMinDistinctFiniteMetricCount ?? 0) > 0) {
    detailParts.push(`distinct≥${variant.rootMaturityGateMinDistinctFiniteMetricCount}`);
  }
  return {
    detailText: detailParts.length > 0 ? ` [${detailParts.join(', ')}]` : '',
  };
}

function createVariantDisplayLabel(variant) {
  if (variant.kind === 'runtime-gate') {
    const gateDescriptor = describeRootMaturityGateVariant(variant);
    return `runtime root-gate (${variant.gateMode}${gateDescriptor.detailText} → ${variant.targetProofMetricMode}/${variant.targetProofPriorityBiasMode})`;
  }
  return `${variant.proofMetricMode}/${variant.proofPriorityBiasMode}`;
}

function createExactReferenceAccessor(SearchEngine, options) {
  const cache = new Map();
  return {
    getResult(state) {
      const key = state.hashKey();
      if (cache.has(key)) {
        return cache.get(key);
      }
      const engine = new SearchEngine(createSearchOptions({
        presetKey: options.presetKey,
        styleKey: options.styleKey,
        searchAlgorithm: 'classic',
        timeLimitMs: options.referenceTimeMs,
        maxDepth: options.maxDepth,
        exactEndgameEmpties: options.referenceExactEmpties,
        wldPreExactEmpties: 0,
        mctsSolverEnabled: false,
        mctsSolverWldEmpties: 0,
        mctsExactContinuationEnabled: false,
        mctsExactContinuationExtraEmpties: 0,
        mctsExactContinuationAdaptiveEnabled: false,
        mctsExactContinuationAdaptiveExtraEmpties: 0,
        mctsExactContinuationAdaptiveOutcomeMode: 'loss-only',
        mctsExactContinuationAdaptiveMaxLegalMoves: 0,
        mctsProofPriorityEnabled: false,
        mctsProofPriorityScale: 0,
        mctsProofPriorityMaxEmpties: 0,
        mctsProofPriorityContinuationHandoffEnabled: true,
        mctsProofMetricMode: 'legacy-root',
        mctsProofPriorityBiasMode: 'rank',
        mctsProofPriorityRootMaturityGateEnabled: false,
        mctsProofPriorityRootMaturityGateMode: DEFAULTS.rootMaturityGateMode,
        mctsProofPriorityRootMaturityGateMetricMode: DEFAULTS.targetProofMetricMode,
        mctsProofPriorityRootMaturityGateBiasMode: DEFAULTS.targetProofPriorityBiasMode,
        mctsProofPriorityRootMaturityGateMinVisits: DEFAULTS.rootMaturityGateMinVisits,
        mctsProofPriorityRootMaturityGateBestFiniteMetricThreshold: DEFAULTS.rootMaturityGateBestFiniteMetricThreshold,
        mctsProofPriorityRootMaturityGateRequireNoSolvedChild: DEFAULTS.rootMaturityGateRequireNoSolvedChild,
        mctsProofPriorityRootMaturityGateMinDistinctFiniteMetricCount: DEFAULTS.rootMaturityGateMinDistinctFiniteMetricCount,
        mctsMaxIterations: undefined,
        mctsMaxNodes: undefined,
        maxTableEntries: options.maxTableEntries,
      }));
      const result = engine.findBestMove(state);
      cache.set(key, result);
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

function extractRootMaturity(result) {
  const proofTelemetry = result?.mctsProofTelemetry ?? null;
  const analyzedMoves = Array.isArray(result?.analyzedMoves) ? result.analyzedMoves : [];
  const finiteMetrics = analyzedMoves
    .map((move) => (Number.isFinite(move?.pnMetricProofNumber) && move.pnMetricProofNumber < MAX_MCTS_PROOF_NUMBER)
      ? move.pnMetricProofNumber
      : null)
    .filter((value) => value !== null)
    .sort((left, right) => left - right);
  const distinctFiniteMetrics = [];
  for (const value of finiteMetrics) {
    if (distinctFiniteMetrics.length === 0 || distinctFiniteMetrics[distinctFiniteMetrics.length - 1] !== value) {
      distinctFiniteMetrics.push(value);
    }
  }

  return {
    solvedCoverageRate: Number.isFinite(proofTelemetry?.solvedCoverageRate)
      ? proofTelemetry.solvedCoverageRate
      : null,
    exactCoverageRate: Number.isFinite(proofTelemetry?.exactCoverageRate)
      ? proofTelemetry.exactCoverageRate
      : null,
    solvedMoveCount: Number.isFinite(proofTelemetry?.solvedMoveCount)
      ? proofTelemetry.solvedMoveCount
      : 0,
    exactSolvedMoveCount: Number.isFinite(proofTelemetry?.exactSolvedMoveCount)
      ? proofTelemetry.exactSolvedMoveCount
      : 0,
    unresolvedMoveCount: Number.isFinite(proofTelemetry?.unresolvedMoveCount)
      ? proofTelemetry.unresolvedMoveCount
      : 0,
    rootProofNumber: Number.isFinite(proofTelemetry?.rootProofNumber)
      ? proofTelemetry.rootProofNumber
      : null,
    rootDisproofNumber: Number.isFinite(proofTelemetry?.rootDisproofNumber)
      ? proofTelemetry.rootDisproofNumber
      : null,
    bestMoveMetricProofNumber: Number.isFinite(proofTelemetry?.bestMoveMetricProofNumber)
      ? proofTelemetry.bestMoveMetricProofNumber
      : null,
    bestMoveProofRank: Number.isFinite(proofTelemetry?.bestMoveProofRank)
      ? proofTelemetry.bestMoveProofRank
      : null,
    finiteMetricCount: finiteMetrics.length,
    distinctFiniteMetricCount: distinctFiniteMetrics.length,
    bestFiniteMetric: distinctFiniteMetrics[0] ?? null,
    secondFiniteMetric: distinctFiniteMetrics[1] ?? null,
    bestFiniteMetricGap: distinctFiniteMetrics.length >= 2
      ? (distinctFiniteMetrics[1] - distinctFiniteMetrics[0])
      : null,
  };
}

function summarizeRun(result, chosenExactScore, referenceScore) {
  const proven = Boolean(result?.isExactResult || result?.isWldResult);
  const scoreLoss = Number.isFinite(chosenExactScore) && Number.isFinite(referenceScore)
    ? referenceScore - chosenExactScore
    : null;
  const proofTelemetry = result?.mctsProofTelemetry ?? null;
  const maturity = extractRootMaturity(result);
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
    mctsSolverRootProofs: Number.isFinite(result?.stats?.mctsSolverRootProofs) ? result.stats.mctsSolverRootProofs : 0,
    mctsProofNumberUpdates: Number.isFinite(result?.stats?.mctsProofNumberUpdates)
      ? result.stats.mctsProofNumberUpdates
      : 0,
    mctsGeneralizedProofNumberUpdates: Number.isFinite(result?.stats?.mctsGeneralizedProofNumberUpdates)
      ? result.stats.mctsGeneralizedProofNumberUpdates
      : 0,
    mctsProofPrioritySelectionNodes: Number.isFinite(result?.stats?.mctsProofPrioritySelectionNodes)
      ? result.stats.mctsProofPrioritySelectionNodes
      : 0,
    mctsProofPriorityRankedChildren: Number.isFinite(result?.stats?.mctsProofPriorityRankedChildren)
      ? result.stats.mctsProofPriorityRankedChildren
      : 0,
    proofMetricMode: typeof proofTelemetry?.proofMetricMode === 'string' ? proofTelemetry.proofMetricMode : null,
    proofPriorityBiasMode: typeof proofTelemetry?.proofPriorityBiasMode === 'string' ? proofTelemetry.proofPriorityBiasMode : null,
    proofPriorityMetricMode: typeof proofTelemetry?.proofPriorityMetricMode === 'string' ? proofTelemetry.proofPriorityMetricMode : null,
    proofPriorityMetricPlayer: typeof proofTelemetry?.proofPriorityMetricPlayer === 'string' ? proofTelemetry.proofPriorityMetricPlayer : null,
    proofPriorityMetric: typeof proofTelemetry?.proofPriorityMetric === 'string' ? proofTelemetry.proofPriorityMetric : null,
    bestMoveMetricProofNumber: Number.isFinite(proofTelemetry?.bestMoveMetricProofNumber)
      ? proofTelemetry.bestMoveMetricProofNumber
      : null,
    bestMoveMetricMode: typeof proofTelemetry?.bestMoveMetricMode === 'string' ? proofTelemetry.bestMoveMetricMode : null,
    bestMoveMetricPlayer: typeof proofTelemetry?.bestMoveMetricPlayer === 'string' ? proofTelemetry.bestMoveMetricPlayer : null,
    bestMoveProofRank: Number.isFinite(proofTelemetry?.bestMoveProofRank) ? proofTelemetry.bestMoveProofRank : null,
    bestMoveProofBonus: Number.isFinite(proofTelemetry?.bestMoveProofBonus) ? proofTelemetry.bestMoveProofBonus : null,
    rootSolved: Boolean(proofTelemetry?.rootSolved),
    rootSolvedOutcome: typeof proofTelemetry?.rootSolvedOutcome === 'string' ? proofTelemetry.rootSolvedOutcome : null,
    proofPriorityEnabled: Boolean(proofTelemetry?.proofPriorityEnabled),
    proofPriorityDepthEligible: Boolean(proofTelemetry?.proofPriorityDepthEligible),
    proofPrioritySuppressedByContinuationWindow: Boolean(proofTelemetry?.proofPrioritySuppressedByContinuationWindow),
    proofPriorityRootMaturityGateEnabled: Boolean(proofTelemetry?.proofPriorityRootMaturityGateEnabled),
    proofPriorityRootMaturityGateMode: typeof proofTelemetry?.proofPriorityRootMaturityGateMode === 'string'
      ? proofTelemetry.proofPriorityRootMaturityGateMode
      : null,
    proofPriorityRootMaturityGateMetricMode: typeof proofTelemetry?.proofPriorityRootMaturityGateMetricMode === 'string'
      ? proofTelemetry.proofPriorityRootMaturityGateMetricMode
      : null,
    proofPriorityRootMaturityGateBiasMode: typeof proofTelemetry?.proofPriorityRootMaturityGateBiasMode === 'string'
      ? proofTelemetry.proofPriorityRootMaturityGateBiasMode
      : null,
    proofPriorityRootMaturityGateMinVisits: Number.isFinite(proofTelemetry?.proofPriorityRootMaturityGateMinVisits)
      ? proofTelemetry.proofPriorityRootMaturityGateMinVisits
      : 0,
    proofPriorityRootMaturityGateBestFiniteMetricThreshold: Number.isFinite(proofTelemetry?.proofPriorityRootMaturityGateBestFiniteMetricThreshold)
      ? proofTelemetry.proofPriorityRootMaturityGateBestFiniteMetricThreshold
      : null,
    proofPriorityRootMaturityGateRequireNoSolvedChild: Boolean(proofTelemetry?.proofPriorityRootMaturityGateRequireNoSolvedChild),
    proofPriorityRootMaturityGateMinDistinctFiniteMetricCount: Number.isFinite(proofTelemetry?.proofPriorityRootMaturityGateMinDistinctFiniteMetricCount)
      ? proofTelemetry.proofPriorityRootMaturityGateMinDistinctFiniteMetricCount
      : 0,
    proofPriorityRootMaturityGateActivated: Boolean(proofTelemetry?.proofPriorityRootMaturityGateActivated),
    proofPriorityRootMaturityGateActivationCount: Number.isFinite(proofTelemetry?.proofPriorityRootMaturityGateActivationCount)
      ? proofTelemetry.proofPriorityRootMaturityGateActivationCount
      : 0,
    proofPriorityRootMaturityGateActivationIteration: Number.isFinite(proofTelemetry?.proofPriorityRootMaturityGateActivationIteration)
      ? proofTelemetry.proofPriorityRootMaturityGateActivationIteration
      : null,
    proofPriorityRootMaturityGateActivationReason: typeof proofTelemetry?.proofPriorityRootMaturityGateActivationReason === 'string'
      ? proofTelemetry.proofPriorityRootMaturityGateActivationReason
      : null,
    proofPriorityRootMaturityGateLastEvaluationReason: typeof proofTelemetry?.proofPriorityRootMaturityGateLastEvaluationReason === 'string'
      ? proofTelemetry.proofPriorityRootMaturityGateLastEvaluationReason
      : null,
    proofPriorityRootMaturityGateLastBlockReason: typeof proofTelemetry?.proofPriorityRootMaturityGateLastBlockReason === 'string'
      ? proofTelemetry.proofPriorityRootMaturityGateLastBlockReason
      : null,
    proofPriorityRootMaturityGateFinalEligible: Boolean(proofTelemetry?.proofPriorityRootMaturityGateFinalEligible),
    proofPriorityRootMaturityGateSolvedCoverageRate: Number.isFinite(proofTelemetry?.proofPriorityRootMaturityGateSolvedCoverageRate)
      ? proofTelemetry.proofPriorityRootMaturityGateSolvedCoverageRate
      : null,
    proofPriorityRootMaturityGateSolvedMoveCount: Number.isFinite(proofTelemetry?.proofPriorityRootMaturityGateSolvedMoveCount)
      ? proofTelemetry.proofPriorityRootMaturityGateSolvedMoveCount
      : 0,
    proofPriorityRootMaturityGateBestFiniteMetric: Number.isFinite(proofTelemetry?.proofPriorityRootMaturityGateBestFiniteMetric)
      ? proofTelemetry.proofPriorityRootMaturityGateBestFiniteMetric
      : null,
    proofPriorityRootMaturityGateSecondFiniteMetric: Number.isFinite(proofTelemetry?.proofPriorityRootMaturityGateSecondFiniteMetric)
      ? proofTelemetry.proofPriorityRootMaturityGateSecondFiniteMetric
      : null,
    proofPriorityRootMaturityGateDistinctFiniteMetricCount: Number.isFinite(proofTelemetry?.proofPriorityRootMaturityGateDistinctFiniteMetricCount)
      ? proofTelemetry.proofPriorityRootMaturityGateDistinctFiniteMetricCount
      : 0,
    proofPriorityRootMaturityGateChecks: Number.isFinite(proofTelemetry?.proofPriorityRootMaturityGateChecks)
      ? proofTelemetry.proofPriorityRootMaturityGateChecks
      : 0,
    proofPriorityRootMaturityGateActivations: Number.isFinite(proofTelemetry?.proofPriorityRootMaturityGateActivations)
      ? proofTelemetry.proofPriorityRootMaturityGateActivations
      : 0,
    maturity,
  };
}

function average(values) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (filtered.length === 0) {
    return null;
  }
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function aggregateRuns(key, label, runs, metadata = {}) {
  const positions = runs.length;
  const exactBestHits = runs.filter((entry) => entry?.exactBestHit).length;
  const wldAgreements = runs.filter((entry) => entry?.wldAgreement).length;
  const provenCount = runs.filter((entry) => entry?.proven).length;
  const exactResultCount = runs.filter((entry) => entry?.isExactResult).length;
  const rootSolvedCount = runs.filter((entry) => entry?.mctsRootSolvedOutcome !== null).length;
  const gateActivatedCount = runs.filter((entry) => entry?.proofPriorityRootMaturityGateActivated).length;
  const gateFinalEligibleCount = runs.filter((entry) => entry?.proofPriorityRootMaturityGateFinalEligible).length;
  return {
    key,
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
    rootSolvedCount,
    rootSolvedRate: positions > 0 ? rootSolvedCount / positions : null,
    averageScoreLoss: average(runs.map((entry) => entry?.scoreLoss)),
    averageElapsedMs: average(runs.map((entry) => entry?.elapsedMs)),
    averageIterations: average(runs.map((entry) => entry?.mctsIterations)),
    averageTreeNodes: average(runs.map((entry) => entry?.mctsTreeNodes)),
    averageSolverStateProbes: average(runs.map((entry) => entry?.mctsSolverStateProbes)),
    averageSolverRootProofs: average(runs.map((entry) => entry?.mctsSolverRootProofs)),
    averageProofNumberUpdates: average(runs.map((entry) => entry?.mctsProofNumberUpdates)),
    averageGeneralizedProofNumberUpdates: average(runs.map((entry) => entry?.mctsGeneralizedProofNumberUpdates)),
    averageProofPrioritySelectionNodes: average(runs.map((entry) => entry?.mctsProofPrioritySelectionNodes)),
    averageProofPriorityRankedChildren: average(runs.map((entry) => entry?.mctsProofPriorityRankedChildren)),
    averageBestMoveProofRank: average(runs.map((entry) => entry?.bestMoveProofRank)),
    averageBestMoveProofBonus: average(runs.map((entry) => entry?.bestMoveProofBonus)),
    averageBestMoveMetricProofNumber: average(runs.map((entry) => entry?.bestMoveMetricProofNumber)),
    averageSolvedCoverageRate: average(runs.map((entry) => entry?.maturity?.solvedCoverageRate)),
    averageExactCoverageRate: average(runs.map((entry) => entry?.maturity?.exactCoverageRate)),
    averageFiniteMetricCount: average(runs.map((entry) => entry?.maturity?.finiteMetricCount)),
    gateActivatedCount,
    gateActivatedRate: positions > 0 ? gateActivatedCount / positions : null,
    gateFinalEligibleCount,
    gateFinalEligibleRate: positions > 0 ? gateFinalEligibleCount / positions : null,
    averageGateActivationIteration: average(runs.map((entry) => entry?.proofPriorityRootMaturityGateActivationIteration)),
    averageGateSolvedCoverageRate: average(runs.map((entry) => entry?.proofPriorityRootMaturityGateSolvedCoverageRate)),
    averageGateBestFiniteMetric: average(runs.map((entry) => entry?.proofPriorityRootMaturityGateBestFiniteMetric)),
    averageGateChecks: average(runs.map((entry) => entry?.proofPriorityRootMaturityGateChecks)),
    averageGateActivations: average(runs.map((entry) => entry?.proofPriorityRootMaturityGateActivations)),
    ...metadata,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printUsage();
    return;
  }

  const repoRoot = resolveCliPath(args['repo-root'] ?? DEFAULTS.repoRoot);
  const outputJson = args['output-json']
    ? resolveCliPath(args['output-json'])
    : null;
  const mode = parseEnum(args.mode, DEFAULTS.mode, BENCH_MODES);
  const algorithm = String(args.algorithm ?? DEFAULTS.algorithm);
  const fixedIterationTimeLimitMs = toFiniteInteger(args['fixed-iteration-time-limit-ms'], DEFAULTS.fixedIterationTimeLimitMs, 1, 120000);
  const timeMsList = parseCsvIntegers(args['time-ms-list'], DEFAULTS.timeMsList);
  const emptiesList = parseCsvIntegers(args['empties-list'], DEFAULTS.emptiesList);
  const seedList = parseCsvIntegers(args['seed-list'], DEFAULTS.seedList);
  const iterationsList = parseCsvIntegers(args['iterations-list'], DEFAULTS.iterationsList);
  const exactEndgameEmpties = toFiniteInteger(args['exact-endgame-empties'], DEFAULTS.exactEndgameEmpties, 0, 20);
  const mctsSolverWldEmpties = toFiniteInteger(args['mcts-solver-wld-empties'], DEFAULTS.mctsSolverWldEmpties, 0, 12);
  const mctsExactContinuationExtraEmpties = toFiniteInteger(args['exact-continuation-extra-empties'], DEFAULTS.mctsExactContinuationExtraEmpties, 0, 8);
  const mctsExactContinuationAdaptiveEnabled = parseBoolean(args['adaptive-enabled'], DEFAULTS.mctsExactContinuationAdaptiveEnabled);
  const mctsExactContinuationAdaptiveExtraEmpties = toFiniteInteger(args['adaptive-extra-empties'], DEFAULTS.mctsExactContinuationAdaptiveExtraEmpties, 0, 8);
  const mctsExactContinuationAdaptiveOutcomeMode = String(args['adaptive-outcome-mode'] ?? DEFAULTS.mctsExactContinuationAdaptiveOutcomeMode);
  const mctsExactContinuationAdaptiveMaxLegalMoves = toFiniteInteger(args['adaptive-max-legal-moves'], DEFAULTS.mctsExactContinuationAdaptiveMaxLegalMoves, 0, 32);
  const mctsProofPriorityScale = toFiniteNumber(args['proof-priority-scale'], DEFAULTS.mctsProofPriorityScale, 0, 5, 2);
  const mctsProofPriorityMaxEmpties = toFiniteInteger(args['proof-priority-max-empties'], DEFAULTS.mctsProofPriorityMaxEmpties, 0, 20);
  const mctsProofPriorityContinuationHandoffEnabled = parseBoolean(args['proof-priority-handoff'], DEFAULTS.mctsProofPriorityContinuationHandoffEnabled);
  const baseProofMetricMode = parseEnum(args['base-proof-metric-mode'], DEFAULTS.baseProofMetricMode, PROOF_METRIC_MODES);
  const baseProofPriorityBiasMode = parseEnum(args['base-proof-priority-bias-mode'], DEFAULTS.baseProofPriorityBiasMode, PROOF_PRIORITY_BIAS_MODES);
  const targetProofMetricMode = parseEnum(args['target-proof-metric-mode'], DEFAULTS.targetProofMetricMode, PROOF_METRIC_MODES);
  const targetProofPriorityBiasMode = parseEnum(args['target-proof-priority-bias-mode'], DEFAULTS.targetProofPriorityBiasMode, PROOF_PRIORITY_BIAS_MODES);
  const rootMaturityGateMode = parseEnum(args['root-maturity-gate-mode'], DEFAULTS.rootMaturityGateMode, ROOT_MATURITY_GATE_MODES);
  const rootMaturityGateMinVisits = toFiniteInteger(args['root-maturity-gate-min-visits'], DEFAULTS.rootMaturityGateMinVisits, 0, 2_000_000);
  const rootMaturityGateBestFiniteMetricThreshold = toFiniteInteger(args['root-maturity-gate-best-metric-threshold'], DEFAULTS.rootMaturityGateBestFiniteMetricThreshold, 0, MAX_MCTS_PROOF_NUMBER);
  const rootMaturityGateRequireNoSolvedChild = parseBoolean(args['root-maturity-gate-require-no-solved-child'], DEFAULTS.rootMaturityGateRequireNoSolvedChild);
  const rootMaturityGateMinDistinctFiniteMetricCount = toFiniteInteger(args['root-maturity-gate-min-distinct-finite-metric-count'], DEFAULTS.rootMaturityGateMinDistinctFiniteMetricCount, 0, 64);
  const maxDepth = toFiniteInteger(args['max-depth'], DEFAULTS.maxDepth, 1, 64);
  const maxTableEntries = toFiniteInteger(args['max-table-entries'], DEFAULTS.maxTableEntries, 1000, 5000000);
  const mctsMaxNodes = toFiniteInteger(args['mcts-max-nodes'], DEFAULTS.mctsMaxNodes, 64, 5000000);
  const timeBudgetMctsMaxIterations = toFiniteInteger(args['time-budget-mcts-max-iterations'], DEFAULTS.timeBudgetMctsMaxIterations, 1, 2000000);
  const presetKey = String(args['preset-key'] ?? DEFAULTS.presetKey);
  const styleKey = String(args['style-key'] ?? DEFAULTS.styleKey);
  const referenceExactEmpties = toFiniteInteger(args['reference-exact-empties'], DEFAULTS.referenceExactEmpties, 0, 64);
  const referenceTimeMs = toFiniteInteger(args['reference-time-ms'], DEFAULTS.referenceTimeMs, 1, 120000);

  const bucketList = mode === 'fixed-iterations' ? iterationsList : timeMsList;
  const bucketLabel = mode === 'fixed-iterations' ? 'iterationBudget' : 'timeLimitMs';

  const { SearchEngine, GameState } = await loadRepoModules(repoRoot);
  const exactReferenceAccessor = createExactReferenceAccessor(SearchEngine, {
    presetKey,
    styleKey,
    maxDepth,
    maxTableEntries,
    referenceExactEmpties,
    referenceTimeMs,
  });

  const variantConfigs = [
    {
      key: 'base',
      label: `${baseProofMetricMode}/${baseProofPriorityBiasMode}`,
      kind: 'engine',
      proofMetricMode: baseProofMetricMode,
      proofPriorityBiasMode: baseProofPriorityBiasMode,
      rootMaturityGateEnabled: false,
      targetProofMetricMode,
      targetProofPriorityBiasMode,
      gateMode: rootMaturityGateMode,
      rootMaturityGateMinVisits,
      rootMaturityGateBestFiniteMetricThreshold,
      rootMaturityGateRequireNoSolvedChild,
      rootMaturityGateMinDistinctFiniteMetricCount,
    },
    {
      key: 'target',
      label: `${targetProofMetricMode}/${targetProofPriorityBiasMode}`,
      kind: 'engine',
      proofMetricMode: targetProofMetricMode,
      proofPriorityBiasMode: targetProofPriorityBiasMode,
      rootMaturityGateEnabled: false,
      targetProofMetricMode,
      targetProofPriorityBiasMode,
      gateMode: rootMaturityGateMode,
      rootMaturityGateMinVisits,
      rootMaturityGateBestFiniteMetricThreshold,
      rootMaturityGateRequireNoSolvedChild,
      rootMaturityGateMinDistinctFiniteMetricCount,
    },
    {
      key: 'runtime-gate',
      label: `runtime root-gate (${rootMaturityGateMode} → ${targetProofMetricMode}/${targetProofPriorityBiasMode})`,
      kind: 'runtime-gate',
      proofMetricMode: baseProofMetricMode,
      proofPriorityBiasMode: baseProofPriorityBiasMode,
      rootMaturityGateEnabled: true,
      targetProofMetricMode,
      targetProofPriorityBiasMode,
      gateMode: rootMaturityGateMode,
      rootMaturityGateMinVisits,
      rootMaturityGateBestFiniteMetricThreshold,
      rootMaturityGateRequireNoSolvedChild,
      rootMaturityGateMinDistinctFiniteMetricCount,
    },
  ];

  const scenarios = [];
  const runsByVariant = new Map(variantConfigs.map((variant) => [variant.key, []]));
  const runsByVariantAndBucket = new Map();
  const runsByVariantAndReferenceOutcome = new Map();
  const referenceOutcomes = ['win', 'draw', 'loss'];

  for (const bucketValue of bucketList) {
    for (const variant of variantConfigs) {
      runsByVariantAndBucket.set(`${variant.key}:${bucketValue}`, []);
    }
  }

  for (const emptyCount of emptiesList) {
    for (const seed of seedList) {
      const state = createLatePosition(GameState, emptyCount, seed);
      const rootPlayer = state.currentPlayer;
      const legalMoves = sortLegalMoves(state);
      const reference = exactReferenceAccessor.getResult(state);
      const referenceMove = legalMoves.find((move) => move.coord === reference?.bestMoveCoord) ?? null;
      const referenceExactScore = evaluateMoveExactScore(state, referenceMove, rootPlayer, exactReferenceAccessor);
      const referenceOutcome = Number.isFinite(referenceExactScore)
        ? classifyOutcome(referenceExactScore)
        : null;

      for (const bucketValue of bucketList) {
        const scenario = {
          emptyCount,
          seed,
          [bucketLabel]: bucketValue,
          rootPlayer,
          legalMoveCount: legalMoves.length,
          reference: {
            bestMoveCoord: reference?.bestMoveCoord ?? null,
            score: Number.isFinite(reference?.score) ? reference.score : null,
            exactScore: Number.isFinite(referenceExactScore) ? referenceExactScore : null,
            outcome: referenceOutcome,
          },
          variants: {},
        };

        for (const variant of variantConfigs) {
          const runtimeTimeLimitMs = mode === 'fixed-iterations'
            ? fixedIterationTimeLimitMs
            : bucketValue;
          const runtimeIterations = mode === 'fixed-iterations'
            ? bucketValue
            : timeBudgetMctsMaxIterations;
          const engine = new SearchEngine(createSearchOptions({
            presetKey,
            styleKey,
            searchAlgorithm: algorithm,
            timeLimitMs: runtimeTimeLimitMs,
            maxDepth,
            exactEndgameEmpties,
            wldPreExactEmpties: 0,
            mctsSolverEnabled: true,
            mctsSolverWldEmpties,
            mctsExactContinuationEnabled: true,
            mctsExactContinuationExtraEmpties,
            mctsExactContinuationAdaptiveEnabled,
            mctsExactContinuationAdaptiveExtraEmpties,
            mctsExactContinuationAdaptiveOutcomeMode,
            mctsExactContinuationAdaptiveMaxLegalMoves,
            mctsProofPriorityEnabled: true,
            mctsProofPriorityScale,
            mctsProofPriorityMaxEmpties,
            mctsProofPriorityContinuationHandoffEnabled,
            mctsProofMetricMode: variant.proofMetricMode,
            mctsProofPriorityBiasMode: variant.proofPriorityBiasMode,
            mctsProofPriorityRootMaturityGateEnabled: variant.rootMaturityGateEnabled,
            mctsProofPriorityRootMaturityGateMode: variant.gateMode,
            mctsProofPriorityRootMaturityGateMetricMode: variant.targetProofMetricMode,
            mctsProofPriorityRootMaturityGateBiasMode: variant.targetProofPriorityBiasMode,
            mctsProofPriorityRootMaturityGateMinVisits: variant.rootMaturityGateMinVisits,
            mctsProofPriorityRootMaturityGateBestFiniteMetricThreshold: variant.rootMaturityGateBestFiniteMetricThreshold,
            mctsProofPriorityRootMaturityGateRequireNoSolvedChild: variant.rootMaturityGateRequireNoSolvedChild,
            mctsProofPriorityRootMaturityGateMinDistinctFiniteMetricCount: variant.rootMaturityGateMinDistinctFiniteMetricCount,
            mctsMaxIterations: runtimeIterations,
            mctsMaxNodes,
            maxTableEntries,
          }));

          const result = withBenchRandom(seed * 100 + 7, () => engine.findBestMove(state));
          const chosenMove = legalMoves.find((move) => move.coord === result?.bestMoveCoord) ?? null;
          const chosenExactScore = evaluateMoveExactScore(state, chosenMove, rootPlayer, exactReferenceAccessor);
          const summarized = summarizeRun(result, chosenExactScore, referenceExactScore);
          scenario.variants[variant.key] = summarized;
          runsByVariant.get(variant.key).push(summarized);
          runsByVariantAndBucket.get(`${variant.key}:${bucketValue}`).push(summarized);
          if (referenceOutcome !== null) {
            const outcomeKey = `${variant.key}:${referenceOutcome}`;
            if (!runsByVariantAndReferenceOutcome.has(outcomeKey)) {
              runsByVariantAndReferenceOutcome.set(outcomeKey, []);
            }
            runsByVariantAndReferenceOutcome.get(outcomeKey).push(summarized);
          }
        }

        scenarios.push(scenario);
        console.log(`[root-maturity-runtime] mode=${mode} empties=${emptyCount} seed=${seed} ${bucketLabel}=${bucketValue} ref=${scenario.reference.bestMoveCoord}/${scenario.reference.exactScore}`);
      }
    }
  }

  const variantMetadataByKey = new Map(variantConfigs.map((variant) => [variant.key, {
    kind: variant.kind,
    gateMode: variant.kind === 'runtime-gate' ? variant.gateMode : null,
    gateMinVisits: variant.kind === 'runtime-gate' ? variant.rootMaturityGateMinVisits : null,
    gateBestFiniteMetricThreshold: variant.kind === 'runtime-gate' ? variant.rootMaturityGateBestFiniteMetricThreshold : null,
    gateRequireNoSolvedChild: variant.kind === 'runtime-gate' ? variant.rootMaturityGateRequireNoSolvedChild : null,
    gateMinDistinctFiniteMetricCount: variant.kind === 'runtime-gate' ? variant.rootMaturityGateMinDistinctFiniteMetricCount : null,
    targetProofMetricMode: variant.kind === 'runtime-gate' ? variant.targetProofMetricMode : null,
    targetProofPriorityBiasMode: variant.kind === 'runtime-gate' ? variant.targetProofPriorityBiasMode : null,
  }]));

  const aggregates = variantConfigs.map((variant) => aggregateRuns(
    variant.key,
    variant.label,
    runsByVariant.get(variant.key) ?? [],
    variantMetadataByKey.get(variant.key) ?? {},
  ));
  const aggregatesByBucket = bucketList.map((bucketValue) => ({
    [bucketLabel]: bucketValue,
    variants: variantConfigs.map((variant) => aggregateRuns(
      variant.key,
      variant.label,
      runsByVariantAndBucket.get(`${variant.key}:${bucketValue}`) ?? [],
      variantMetadataByKey.get(variant.key) ?? {},
    )),
  }));
  const aggregatesByReferenceOutcome = referenceOutcomes.map((outcome) => ({
    outcome,
    variants: variantConfigs.map((variant) => aggregateRuns(
      variant.key,
      variant.label,
      runsByVariantAndReferenceOutcome.get(`${variant.key}:${outcome}`) ?? [],
      variantMetadataByKey.get(variant.key) ?? {},
    )),
  }));

  const summary = {
    type: mode === 'fixed-iterations'
      ? 'mcts-root-maturity-gate-runtime-fixed-iterations-benchmark'
      : 'mcts-root-maturity-gate-runtime-benchmark',
    generatedAt: new Date().toISOString(),
    repoRoot: relativePathFromCwd(repoRoot),
    options: {
      mode,
      algorithm,
      fixedIterationTimeLimitMs,
      timeMsList,
      emptiesList,
      seedList,
      iterationsList,
      exactEndgameEmpties,
      mctsSolverWldEmpties,
      mctsExactContinuationExtraEmpties,
      mctsExactContinuationAdaptiveEnabled,
      mctsExactContinuationAdaptiveExtraEmpties,
      mctsExactContinuationAdaptiveOutcomeMode,
      mctsExactContinuationAdaptiveMaxLegalMoves,
      mctsProofPriorityScale,
      mctsProofPriorityMaxEmpties,
      mctsProofPriorityContinuationHandoffEnabled,
      baseProofMetricMode,
      baseProofPriorityBiasMode,
      targetProofMetricMode,
      targetProofPriorityBiasMode,
      rootMaturityGateMode,
      rootMaturityGateMinVisits,
      rootMaturityGateBestFiniteMetricThreshold,
      rootMaturityGateRequireNoSolvedChild,
      rootMaturityGateMinDistinctFiniteMetricCount,
      maxDepth,
      maxTableEntries,
      mctsMaxNodes,
      timeBudgetMctsMaxIterations,
      presetKey,
      styleKey,
      referenceExactEmpties,
      referenceTimeMs,
    },
    variants: variantConfigs.map((variant) => ({
      key: variant.key,
      label: variant.label,
      kind: variant.kind,
      proofMetricMode: variant.proofMetricMode,
      proofPriorityBiasMode: variant.proofPriorityBiasMode,
      rootMaturityGateEnabled: variant.rootMaturityGateEnabled,
      rootMaturityGateMode: variant.gateMode,
      rootMaturityGateMetricMode: variant.targetProofMetricMode,
      rootMaturityGateBiasMode: variant.targetProofPriorityBiasMode,
      rootMaturityGateMinVisits: variant.rootMaturityGateMinVisits,
      rootMaturityGateBestFiniteMetricThreshold: variant.rootMaturityGateBestFiniteMetricThreshold,
      rootMaturityGateRequireNoSolvedChild: variant.rootMaturityGateRequireNoSolvedChild,
      rootMaturityGateMinDistinctFiniteMetricCount: variant.rootMaturityGateMinDistinctFiniteMetricCount,
    })),
    scenarios,
    aggregates,
    aggregatesByBucket,
    aggregatesByReferenceOutcome,
  };

  if (outputJson) {
    fs.mkdirSync(path.dirname(outputJson), { recursive: true });
    fs.writeFileSync(outputJson, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  } else {
    console.log(JSON.stringify(summary, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
