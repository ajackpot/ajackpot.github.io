import {
  bitFromIndex,
  bitsToIndices,
  connectedRegions,
  CORNER_INDICES,
  indexFromBit,
  popcount,
  POSITIONAL_WEIGHTS,
} from '../core/bitboard.js';
import { GameState } from '../core/game-state.js';
import { computeFlips, legalMovesBitboard } from '../core/rules.js';
import {
  Evaluator,
  MoveOrderingEvaluator,
  getPositionalRisk,
} from './evaluator.js';
import {
  lookupOpeningBook,
  OPENING_BOOK_ADVISORY_MAX_PLY,
  OPENING_BOOK_DIRECT_USE_MAX_PLY,
} from './opening-book.js';
import { lookupOpeningPrior } from './opening-prior.js';
import {
  DEFAULT_OPENING_HYBRID_TUNING_KEY,
  resolveOpeningHybridTuning,
} from './opening-tuning.js';
import {
  CUSTOM_ENGINE_FIELDS,
  DEFAULT_STYLE_KEY,
  ENGINE_PRESETS,
  ENGINE_STYLE_PRESETS,
  resolveEngineOptions,
} from './presets.js';
import {
  ACTIVE_EVALUATION_PROFILE,
  ACTIVE_MOVE_ORDERING_PROFILE,
  ACTIVE_TUPLE_RESIDUAL_PROFILE,
  compileMpcProfile,
} from './evaluation-profiles.js';

const INFINITY = 10 ** 9;
const DEFAULT_PRESET_KEY = 'normal';
const ORDERING_PROBE_EMPTIES = 18;
const ORDERING_LIGHTWEIGHT_EVAL_MAX_EMPTIES = 18;
const REGION_PARITY_EMPTIES = 16;
const SMALL_EXACT_SOLVER_EMPTIES = 4;
const WLD_RESULT_SCORE = 10000;
const MAX_WLD_PRE_EXACT_EMPTIES = 2;
const LMR_MIN_DEPTH = 4;
const LMR_MIN_MOVE_INDEX = 2;
const LMR_DEEP_REDUCTION_DEPTH = 7;
const LMR_DEEP_REDUCTION_MOVE_INDEX = 6;
const LMR_MIN_EMPTIES = 10;
const ETC_MIN_DEPTH = 2;
const EXACT_FASTEST_FIRST_MIN_EMPTIES = SMALL_EXACT_SOLVER_EMPTIES + 1;
const CORNER_MOVE_MASK = CORNER_INDICES.reduce(
  (mask, index) => mask | bitFromIndex(index),
  0n,
);
const CORNER_INDEX_SET = new Set(CORNER_INDICES);
let nextSearchEngineInstanceId = 1;
const TABLE_RELEVANT_OPTION_KEYS = Object.freeze([
  'exactEndgameEmpties',
  'mobilityScale',
  'potentialMobilityScale',
  'cornerScale',
  'cornerAdjacencyScale',
  'stabilityScale',
  'frontierScale',
  'positionalScale',
  'edgePatternScale',
  'cornerPatternScale',
  'parityScale',
  'discScale',
  'riskPenaltyScale',
  'optimizedFewEmptiesExactSolver',
  'specializedFewEmptiesExactSolver',
  'evaluationProfile',
  'moveOrderingProfile',
  'tupleResidualProfile',
  'mpcProfile',
]);
const EXACT_LATE_ORDERING_PROFILE = Object.freeze({
  killerPrimaryScale: 0.5,
  killerSecondaryScale: 0.4,
  historyScale: 0,
  positionalScale: 0,
  flipScale: 0,
  riskScale: 0.25,
  mobilityPenaltyScale: 1.2,
  cornerReplyPenaltyScale: 1.25,
  passBonusScale: 1,
  parityScale: 1.25,
  lightweightEvalScale: 4.5,
});
const LIGHTWEIGHT_LATE_ORDERING_PROFILE = Object.freeze({
  killerPrimaryScale: 0.85,
  killerSecondaryScale: 0.8,
  historyScale: 0.45,
  positionalScale: 0.55,
  flipScale: 0.6,
  riskScale: 0.75,
  mobilityPenaltyScale: 1.05,
  cornerReplyPenaltyScale: 1.1,
  passBonusScale: 1,
  parityScale: 1.05,
  lightweightEvalScale: 1.75,
});
const GENERAL_LATE_ORDERING_PROFILE = Object.freeze({
  killerPrimaryScale: 1,
  killerSecondaryScale: 1,
  historyScale: 1,
  positionalScale: 1,
  flipScale: 1,
  riskScale: 1,
  mobilityPenaltyScale: 1,
  cornerReplyPenaltyScale: 1,
  passBonusScale: 1,
  parityScale: 1,
  lightweightEvalScale: 1,
});

function clampTrackedEmptiesForOrdering(empties) {
  if (!Number.isFinite(empties)) {
    return 0;
  }
  return Math.max(0, Math.min(64, Math.round(empties)));
}

function orderingActivationThreshold(exactEndgameEmpties) {
  return Math.max(
    10,
    Math.min(ORDERING_LIGHTWEIGHT_EVAL_MAX_EMPTIES, exactEndgameEmpties + 4),
  );
}

function buildLateOrderingProfileTable(exactEndgameEmpties) {
  const threshold = orderingActivationThreshold(exactEndgameEmpties);
  return Array.from({ length: 65 }, (_, empties) => {
    if (empties <= exactEndgameEmpties) {
      return EXACT_LATE_ORDERING_PROFILE;
    }
    if (empties <= threshold) {
      return LIGHTWEIGHT_LATE_ORDERING_PROFILE;
    }
    return GENERAL_LATE_ORDERING_PROFILE;
  });
}

function buildLightweightOrderingEligibilityTable(exactEndgameEmpties) {
  const threshold = orderingActivationThreshold(exactEndgameEmpties);
  return Array.from({ length: 65 }, (_, empties) => empties >= 10 && empties <= threshold);
}

function buildOrderingScoreTable(lateOrderingProfileTable, options = {}) {
  const riskPenaltyScale = options.riskPenaltyScale ?? 1;
  const mobilityScale = options.mobilityScale ?? 1;
  const cornerAdjacencyScale = options.cornerAdjacencyScale ?? 1;
  return lateOrderingProfileTable.map((profile, empties) => ({
    killerPrimaryBonus: Math.round(1_500_000 * profile.killerPrimaryScale),
    killerSecondaryBonus: Math.round(1_000_000 * profile.killerSecondaryScale),
    historyWeight: 50 * profile.historyScale,
    positionalWeight: 1000 * profile.positionalScale,
    flipWeight: 30 * profile.flipScale,
    xSquarePenalty: Math.round(150_000 * riskPenaltyScale * profile.riskScale),
    cSquarePenalty: Math.round(80_000 * riskPenaltyScale * profile.riskScale),
    mobilityPenaltyPerMove: Math.round(
      (empties <= 14 ? 1800 : 1200)
      * mobilityScale
      * profile.mobilityPenaltyScale,
    ),
    cornerReplyPenaltyPerMove: Math.round(
      (empties <= 14 ? 320_000 : 220_000)
      * cornerAdjacencyScale
      * profile.cornerReplyPenaltyScale,
    ),
    passBonus: Math.round((empties <= 12 ? 2_500_000 : 1_500_000) * profile.passBonusScale),
    parityScale: profile.parityScale,
    lightweightEvalScale: profile.lightweightEvalScale,
  }));
}

export function createEmptySearchStats() {
  return {
    nodes: 0,
    cutoffs: 0,
    ttHits: 0,
    ttStores: 0,
    ttEvictions: 0,
    completedDepth: 0,
    elapsedMs: 0,
    bookHits: 0,
    bookMoves: 0,
    openingPriorHits: 0,
    openingConfidenceSkips: 0,
    openingPriorContradictionVetoes: 0,
    openingHybridDirectMoves: 0,
    smallSolverCalls: 0,
    smallSolverNodes: 0,
    specializedFewEmptiesCalls: 0,
    specializedFewEmpties1Calls: 0,
    specializedFewEmpties2Calls: 0,
    specializedFewEmpties3Calls: 0,
    specializedFewEmpties4Calls: 0,
    fastestFirstExactSorts: 0,
    fastestFirstExactPassCandidates: 0,
    ttFirstSearches: 0,
    ttFirstCutoffs: 0,
    lmrReductions: 0,
    lmrReSearches: 0,
    lmrFullReSearches: 0,
    orderingEvalCalls: 0,
    etcNodes: 0,
    etcChildTableHits: 0,
    etcQualifiedBounds: 0,
    etcNarrowings: 0,
    etcCutoffs: 0,
    etcExactNodes: 0,
    etcExactChildTableHits: 0,
    etcExactQualifiedBounds: 0,
    etcExactNarrowings: 0,
    etcExactCutoffs: 0,
    etcWldNodes: 0,
    etcWldChildTableHits: 0,
    etcWldQualifiedBounds: 0,
    etcWldNarrowings: 0,
    etcWldCutoffs: 0,
    etcPreparedChildTableReuseLookups: 0,
    etcPreparedChildTableReuseHits: 0,
    wldRootSearches: 0,
    wldNodes: 0,
    wldTtHits: 0,
    wldSmallSolverCalls: 0,
    wldSmallSolverNodes: 0,
    mpcProbes: 0,
    mpcHighProbes: 0,
    mpcHighCutoffs: 0,
    mpcLowProbes: 0,
    mpcLowCutoffs: 0,
  };
}

class SearchTimeoutError extends Error {
  constructor(message = 'Search timed out.') {
    super(message);
    this.name = 'SearchTimeoutError';
  }
}

function now() {
  if (typeof globalThis.performance?.now === 'function') {
    return globalThis.performance.now();
  }
  return Date.now();
}

function colorIndex(color) {
  return color === 'black' ? 0 : 1;
}

function chooseRandomBest(scoredMoves, randomness) {
  if (!Array.isArray(scoredMoves) || scoredMoves.length === 0 || randomness <= 0) {
    return scoredMoves[0] ?? null;
  }

  const bestScore = scoredMoves[0].score;
  const pool = scoredMoves.filter((entry) => (bestScore - entry.score) <= randomness);
  if (pool.length <= 1) {
    return scoredMoves[0];
  }

  const totalWeight = pool.reduce((sum, entry, index) => sum + (pool.length - index), 0);
  let threshold = Math.random() * totalWeight;
  for (let index = 0; index < pool.length; index += 1) {
    threshold -= (pool.length - index);
    if (threshold <= 0) {
      return pool[index];
    }
  }

  return pool[0];
}


function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function openingEvidenceCoverage(totalEvidence) {
  if (!Number.isFinite(totalEvidence) || totalEvidence <= 0) {
    return 0;
  }
  return clamp01(Math.log2(totalEvidence + 1) / 16);
}

function cloneSearchResult(result) {
  if (!result) {
    return null;
  }

  return {
    ...result,
    principalVariation: Array.isArray(result.principalVariation)
      ? [...result.principalVariation]
      : [],
    analyzedMoves: Array.isArray(result.analyzedMoves)
      ? result.analyzedMoves.map((move) => ({
        ...move,
        principalVariation: Array.isArray(move.principalVariation)
          ? [...move.principalVariation]
          : [],
      }))
      : [],
  };
}

function sanitizeExperimentalInteger(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function sanitizeExperimentalBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function sanitizeDirectPresetField(field, value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const clamped = Math.min(field.max, Math.max(field.min, parsed));
  if (Number.isInteger(field.step)) {
    return Math.round(clamped);
  }

  return Number(clamped.toFixed(2));
}

function applyDirectPresetOverrides(resolvedOptions, engineOptions) {
  if (!engineOptions || typeof engineOptions !== 'object') {
    return resolvedOptions;
  }

  const nextOptions = { ...resolvedOptions };
  for (const field of CUSTOM_ENGINE_FIELDS) {
    if (!Object.hasOwn(engineOptions, field.key)) {
      continue;
    }

    nextOptions[field.key] = sanitizeDirectPresetField(
      field,
      engineOptions[field.key],
      nextOptions[field.key],
    );
  }

  return nextOptions;
}

function applyLegacyRandomnessOptionOverride(resolvedOptions, engineOptions) {
  if (!engineOptions || typeof engineOptions !== 'object') {
    return resolvedOptions;
  }

  const hasOpeningRandomness = Object.hasOwn(engineOptions, 'openingRandomness');
  const hasSearchRandomness = Object.hasOwn(engineOptions, 'searchRandomness');
  if ((hasOpeningRandomness || hasSearchRandomness) || !Object.hasOwn(engineOptions, 'randomness')) {
    return resolvedOptions;
  }

  const legacyRandomness = sanitizeExperimentalInteger(
    engineOptions.randomness,
    resolvedOptions.searchRandomness ?? resolvedOptions.randomness ?? 0,
    0,
    500,
  );
  return {
    ...resolvedOptions,
    openingRandomness: legacyRandomness,
    searchRandomness: legacyRandomness,
    randomness: legacyRandomness,
  };
}

function defaultWldPreExactEmptiesForOptions(resolvedOptions) {
  if (!resolvedOptions) {
    return 0;
  }

  const strongLateSearch = (resolvedOptions.maxDepth ?? 0) >= 8
    && (resolvedOptions.timeLimitMs ?? 0) >= 3000;
  return strongLateSearch ? 2 : 0;
}

function resolveOptionsFromInput(engineOptions = {}, fallbackPresetKey = DEFAULT_PRESET_KEY, fallbackStyleKey = DEFAULT_STYLE_KEY) {
  const hasExplicitPresetKey = typeof engineOptions.presetKey === 'string';
  const presetKey = engineOptions.presetKey ?? fallbackPresetKey;
  const styleKey = engineOptions.styleKey ?? fallbackStyleKey;
  let resolved = resolveEngineOptions(
    presetKey,
    hasExplicitPresetKey ? engineOptions : {},
    styleKey,
  );

  if (!hasExplicitPresetKey) {
    resolved = applyDirectPresetOverrides(resolved, engineOptions);
    resolved = applyLegacyRandomnessOptionOverride(resolved, engineOptions);
  }

  const defaultWldPreExactEmpties = defaultWldPreExactEmptiesForOptions(resolved);
  const enhancedTranspositionCutoff = sanitizeExperimentalBoolean(
    engineOptions.enhancedTranspositionCutoff,
    resolved.enhancedTranspositionCutoff ?? true,
  );
  const optimizedFewEmptiesExactSolver = sanitizeExperimentalBoolean(
    engineOptions.optimizedFewEmptiesExactSolver,
    resolved.optimizedFewEmptiesExactSolver ?? true,
  );
  const specializedFewEmptiesExactSolver = sanitizeExperimentalBoolean(
    engineOptions.specializedFewEmptiesExactSolver,
    resolved.specializedFewEmptiesExactSolver ?? true,
  );
  const exactFastestFirstOrdering = sanitizeExperimentalBoolean(
    engineOptions.exactFastestFirstOrdering,
    resolved.exactFastestFirstOrdering ?? true,
  );
  const ttFirstInPlaceMoveExtraction = sanitizeExperimentalBoolean(
    engineOptions.ttFirstInPlaceMoveExtraction,
    resolved.ttFirstInPlaceMoveExtraction ?? true,
  );
  const etcInPlaceMovePreparation = sanitizeExperimentalBoolean(
    engineOptions.etcInPlaceMovePreparation,
    resolved.etcInPlaceMovePreparation ?? true,
  );
  const etcReusePreparedChildTableEntryForOrdering = sanitizeExperimentalBoolean(
    engineOptions.etcReusePreparedChildTableEntryForOrdering,
    resolved.etcReusePreparedChildTableEntryForOrdering ?? true,
  );
  const enhancedTranspositionCutoffWld = sanitizeExperimentalBoolean(
    engineOptions.enhancedTranspositionCutoffWld,
    engineOptions.enhancedTranspositionCutoff ?? resolved.enhancedTranspositionCutoffWld ?? enhancedTranspositionCutoff,
  );
  return {
    ...resolved,
    openingRandomness: resolved.openingRandomness ?? resolved.randomness ?? 0,
    searchRandomness: resolved.searchRandomness ?? resolved.randomness ?? 0,
    randomness: resolved.searchRandomness ?? resolved.randomness ?? 0,
    optimizedFewEmptiesExactSolver,
    specializedFewEmptiesExactSolver,
    exactFastestFirstOrdering,
    ttFirstInPlaceMoveExtraction,
    etcInPlaceMovePreparation,
    etcReusePreparedChildTableEntryForOrdering,
    enhancedTranspositionCutoff,
    enhancedTranspositionCutoffWld,
    evaluationProfile: Object.hasOwn(engineOptions, 'evaluationProfile')
      ? engineOptions.evaluationProfile
      : (resolved.evaluationProfile ?? ACTIVE_EVALUATION_PROFILE ?? null),
    moveOrderingProfile: Object.hasOwn(engineOptions, 'moveOrderingProfile')
      ? engineOptions.moveOrderingProfile
      : (resolved.moveOrderingProfile ?? ACTIVE_MOVE_ORDERING_PROFILE ?? null),
    tupleResidualProfile: Object.hasOwn(engineOptions, 'tupleResidualProfile')
      ? engineOptions.tupleResidualProfile
      : (resolved.tupleResidualProfile ?? ACTIVE_TUPLE_RESIDUAL_PROFILE ?? null),
    mpcProfile: Object.hasOwn(engineOptions, 'mpcProfile')
      ? engineOptions.mpcProfile
      : (resolved.mpcProfile ?? null),
    wldPreExactEmpties: sanitizeExperimentalInteger(
      engineOptions.wldPreExactEmpties,
      resolved.wldPreExactEmpties ?? defaultWldPreExactEmpties,
      0,
      MAX_WLD_PRE_EXACT_EMPTIES,
    ),
  };
}

function resolveOpeningTuningFromInput(engineOptions = {}, fallbackTuningKey = DEFAULT_OPENING_HYBRID_TUNING_KEY) {
  const tuningKey = typeof engineOptions?.openingTuningKey === 'string' && engineOptions.openingTuningKey.trim() !== ''
    ? engineOptions.openingTuningKey.trim()
    : fallbackTuningKey;
  const tuningOverrides = engineOptions?.openingTuningProfile && typeof engineOptions.openingTuningProfile === 'object'
    ? engineOptions.openingTuningProfile
    : null;
  return resolveOpeningHybridTuning(tuningKey, tuningOverrides);
}

function optionsShallowEqual(left, right) {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }

  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    if (left[key] !== right[key]) {
      return false;
    }
  }
  return true;
}

function tableSemanticsChanged(left, right) {
  if (!left || !right) {
    return true;
  }

  for (const key of TABLE_RELEVANT_OPTION_KEYS) {
    if (left[key] !== right[key]) {
      return true;
    }
  }
  return false;
}

function transpositionReplacementPriority(entry) {
  const depth = entry.depth ?? 0;
  let priority = depth * 100;

  if (entry.flag === 'exact') {
    priority += 250;
  } else if (entry.flag === 'lower') {
    priority += 15;
  }

  return priority;
}

function shouldKeepExistingTableEntry(existing, incoming) {
  if (!existing) {
    return false;
  }

  const existingPriority = transpositionReplacementPriority(existing);
  const incomingPriority = transpositionReplacementPriority(incoming);

  if (incomingPriority > existingPriority) {
    return false;
  }
  if (incomingPriority < existingPriority) {
    return true;
  }

  return (existing.generation ?? 0) >= (incoming.generation ?? 0);
}

function bookOrderingBonus(weight) {
  return Math.round(Math.log2(Math.max(1, weight) + 1) * 90_000);
}

function bookSelectionBonus(weight) {
  return Math.round(Math.log2(Math.max(1, weight) + 1) * 120_000);
}

function openingPriorOrderingBonus(candidate, openingContext, openingTuning = null) {
  if (!candidate) {
    return 0;
  }

  const priorCoverage = openingContext?.priorCoverage ?? 0;
  const priorCandidateCount = Math.max(1, openingContext?.priorCandidateCount ?? 1);
  const averageShare = 1 / priorCandidateCount;
  const count = Math.max(0, Number.isFinite(candidate?.count) ? candidate.count : 0);
  const share = Number.isFinite(candidate?.share) ? candidate.share : 0;
  const shareBonus = (share - averageShare) * 180_000;
  const scoreDelta = clamp((Number.isFinite(candidate?.priorScoreDelta) ? candidate.priorScoreDelta : 0) / 6000, -3, 3);
  const scoreBonus = scoreDelta * 110_000;
  const countBonus = Math.log2(count + 1) * 18_000;
  let scale = Number.isFinite(openingTuning?.orderingPriorScale)
    ? openingTuning.orderingPriorScale
    : 1;

  if (openingContext?.bookByMove instanceof Map && openingContext.bookByMove.size > 0 && !openingContext.bookByMove.has(candidate.moveIndex)) {
    const offBookScale = Number.isFinite(openingTuning?.orderingOffBookPriorScale)
      ? openingTuning.orderingOffBookPriorScale
      : 1;
    scale *= offBookScale;
  }

  return Math.round(priorCoverage * (shareBonus + scoreBonus + countBonus) * scale);
}

function countCornerMoves(moveBitboard) {
  return popcount(moveBitboard & CORNER_MOVE_MASK);
}

function buildParityRegionInfo(emptyBitboard) {
  const regionSizeByIndex = Array(64).fill(0);
  const regions = connectedRegions(emptyBitboard);
  let oddRegionCount = 0;
  let evenRegionCount = 0;

  for (const region of regions) {
    const size = popcount(region);
    if (size % 2 === 1) {
      oddRegionCount += 1;
    } else {
      evenRegionCount += 1;
    }

    let cursor = region;
    while (cursor !== 0n) {
      const leastSignificantBit = cursor & -cursor;
      regionSizeByIndex[indexFromBit(leastSignificantBit)] = size;
      cursor ^= leastSignificantBit;
    }
  }

  return {
    regionCount: regions.length,
    regionSizeByIndex,
    oddRegionCount,
    evenRegionCount,
  };
}

export class SearchEngine {
  constructor(engineOptions = {}) {
    this.instanceId = nextSearchEngineInstanceId;
    nextSearchEngineInstanceId += 1;
    this.options = resolveOptionsFromInput(engineOptions);
    this.openingTuning = resolveOpeningTuningFromInput(engineOptions);
    this.evaluator = new Evaluator(this.options);
    this.moveOrderingEvaluator = new MoveOrderingEvaluator(this.options);
    this.compiledMpcProfile = compileMpcProfile(this.options.mpcProfile);
    this.refreshDerivedCaches();
    this.mpcSuppressionDepth = 0;
    this.transpositionTable = new Map();
    this.killerMoves = [];
    this.historyHeuristic = Array.from({ length: 2 }, () => Array(64).fill(0));
    this.searchGeneration = 0;
    this.resetStats();
  }

  updateOptions(engineOptions = {}) {
    const nextOptions = resolveOptionsFromInput(
      engineOptions,
      this.options?.presetKey ?? DEFAULT_PRESET_KEY,
      this.options?.styleKey ?? DEFAULT_STYLE_KEY,
    );
    const nextOpeningTuning = resolveOpeningTuningFromInput(
      engineOptions,
      this.openingTuning?.key ?? DEFAULT_OPENING_HYBRID_TUNING_KEY,
    );

    const optionsChanged = !optionsShallowEqual(this.options, nextOptions);
    const shouldResetTable = tableSemanticsChanged(this.options, nextOptions);

    this.options = nextOptions;
    this.openingTuning = nextOpeningTuning;
    this.compiledMpcProfile = compileMpcProfile(this.options.mpcProfile);
    if (optionsChanged) {
      this.evaluator = new Evaluator(this.options);
      this.moveOrderingEvaluator = new MoveOrderingEvaluator(this.options);
    }
    if (optionsChanged) {
      this.refreshDerivedCaches();
    }
    if (shouldResetTable) {
      this.transpositionTable.clear();
    }
    this.trimTranspositionTable();
  }

  refreshDerivedCaches() {
    const exactEndgameEmpties = Math.max(0, Math.round(Number(this.options?.exactEndgameEmpties ?? 10)));
    this.lateOrderingProfilesByEmptyCount = buildLateOrderingProfileTable(exactEndgameEmpties);
    this.useLightweightOrderingEvaluatorByEmptyCount = buildLightweightOrderingEligibilityTable(exactEndgameEmpties);
    this.orderingScoreTableByEmptyCount = buildOrderingScoreTable(
      this.lateOrderingProfilesByEmptyCount,
      this.options,
    );
  }

  resetStats() {
    this.stats = createEmptySearchStats();
    this.rootProgressSnapshot = null;
  }

  shouldReusePreparedChildTableEntryForOrdering() {
    return this.options.etcReusePreparedChildTableEntryForOrdering !== false;
  }

  getPreparedChildTableEntryForOrdering(move) {
    if (!this.shouldReusePreparedChildTableEntryForOrdering() || !move || typeof move !== 'object') {
      return undefined;
    }
    if (move.etcPreparedChildTableEntryReady !== true) {
      return undefined;
    }
    if (move.etcPreparedChildTableEntryOwnerId !== this.instanceId) {
      return undefined;
    }
    if (move.etcPreparedChildTableEntryGeneration !== this.searchGeneration) {
      return undefined;
    }
    if (move.etcPreparedChildTableEntryTtStores !== this.stats.ttStores) {
      return undefined;
    }
    return move.etcPreparedChildTableEntry ?? null;
  }

  cachePreparedChildTableEntryForOrdering(move, childTableEntry) {
    if (!this.shouldReusePreparedChildTableEntryForOrdering() || !move || typeof move !== 'object') {
      return;
    }
    move.etcPreparedChildTableEntryReady = true;
    move.etcPreparedChildTableEntry = childTableEntry ?? null;
    move.etcPreparedChildTableEntryOwnerId = this.instanceId;
    move.etcPreparedChildTableEntryGeneration = this.searchGeneration;
    move.etcPreparedChildTableEntryTtStores = this.stats.ttStores;
  }

  createResultOptionsSnapshot() {
    return {
      ...this.options,
      openingTuningKey: this.openingTuning?.key ?? DEFAULT_OPENING_HYBRID_TUNING_KEY,
    };
  }

  runWithMpcSuppressed(callback) {
    this.mpcSuppressionDepth = (this.mpcSuppressionDepth ?? 0) + 1;
    try {
      return callback();
    } finally {
      this.mpcSuppressionDepth = Math.max(0, (this.mpcSuppressionDepth ?? 1) - 1);
    }
  }

  isMpcSuppressed() {
    return (this.mpcSuppressionDepth ?? 0) > 0;
  }

  getMpcRuntimeConfig() {
    return this.compiledMpcProfile?.runtime ?? null;
  }

  isMpcEnabled() {
    if (this.isMpcSuppressed()) {
      return false;
    }

    const runtime = this.getMpcRuntimeConfig();
    const canTryHighCut = runtime?.enableHighCut !== false;
    const canTryLowCut = runtime?.enableLowCut === true;
    return Boolean(this.compiledMpcProfile?.usableCalibrations?.length) && (canTryHighCut || canTryLowCut);
  }

  adjustedMpcHalfWidth(calibration, depth, side = 'high') {
    const runtime = this.getMpcRuntimeConfig();
    const sideKey = side === 'low' ? 'lowIntervalHalfWidth' : 'highIntervalHalfWidth';
    const sideScale = side === 'low'
      ? Math.max(0, Number(runtime?.lowScale ?? 1))
      : Math.max(0, Number(runtime?.highScale ?? 1));
    const baseHalfWidth = Number(calibration?.[sideKey] ?? calibration?.intervalHalfWidth ?? NaN);
    if (!Number.isFinite(baseHalfWidth) || baseHalfWidth < 0) {
      return null;
    }

    const depthDistance = Math.abs((calibration?.deepDepth ?? depth) - depth);
    const distanceScale = Math.max(1, Number(runtime?.depthDistanceScale ?? 1.25));
    return baseHalfWidth * sideScale * (depthDistance === 0 ? 1 : Math.pow(distanceScale, depthDistance));
  }

  selectMpcCalibrations(empties, depth) {
    if (!this.isMpcEnabled() || !Number.isInteger(empties) || empties < 0 || empties > 60) {
      return [];
    }

    const runtime = this.getMpcRuntimeConfig();
    if (!Number.isInteger(depth) || depth < Math.max(1, runtime?.minDepth ?? 2)) {
      return [];
    }

    const candidates = this.compiledMpcProfile?.calibrationsByEmptyCount?.[empties];
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return [];
    }

    const maxChecksPerNode = Math.max(1, Math.round(Number(runtime?.maxChecksPerNode ?? 1)));
    const minDepthGap = Math.max(1, Math.round(Number(runtime?.minDepthGap ?? 2)));
    const maxDepthDistance = Math.max(0, Math.round(Number(runtime?.maxDepthDistance ?? 1)));
    const canTryHighCut = runtime?.enableHighCut !== false;
    const canTryLowCut = runtime?.enableLowCut === true;

    return candidates
      .filter((calibration) => {
        if (!calibration?.usable) {
          return false;
        }
        if (!Number.isFinite(calibration.intercept) || !Number.isFinite(calibration.slope) || calibration.slope <= 0) {
          return false;
        }
        if (!Number.isInteger(calibration.shallowDepth) || calibration.shallowDepth >= depth) {
          return false;
        }
        if ((depth - calibration.shallowDepth) < minDepthGap) {
          return false;
        }

        const distance = Math.abs(depth - calibration.deepDepth);
        if (distance > maxDepthDistance) {
          return false;
        }

        if (canTryHighCut && Number.isFinite(this.adjustedMpcHalfWidth(calibration, depth, 'high'))) {
          return true;
        }
        if (canTryLowCut && Number.isFinite(this.adjustedMpcHalfWidth(calibration, depth, 'low'))) {
          return true;
        }
        return false;
      })
      .sort((left, right) => {
        const leftDistance = Math.abs(depth - (left?.deepDepth ?? depth));
        const rightDistance = Math.abs(depth - (right?.deepDepth ?? depth));
        if (leftDistance !== rightDistance) {
          return leftDistance - rightDistance;
        }
        if ((right.deepDepth ?? 0) !== (left.deepDepth ?? 0)) {
          return (right.deepDepth ?? 0) - (left.deepDepth ?? 0);
        }
        if ((right.shallowDepth ?? 0) !== (left.shallowDepth ?? 0)) {
          return (right.shallowDepth ?? 0) - (left.shallowDepth ?? 0);
        }

        const leftHalfWidth = Math.min(
          canTryHighCut ? (this.adjustedMpcHalfWidth(left, depth, 'high') ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY,
          canTryLowCut ? (this.adjustedMpcHalfWidth(left, depth, 'low') ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY,
        );
        const rightHalfWidth = Math.min(
          canTryHighCut ? (this.adjustedMpcHalfWidth(right, depth, 'high') ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY,
          canTryLowCut ? (this.adjustedMpcHalfWidth(right, depth, 'low') ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY,
        );
        return leftHalfWidth - rightHalfWidth;
      })
      .slice(0, maxChecksPerNode);
  }

  tryMpcCut(state, depth, alpha, beta, ply, exactEndgame = false) {
    if (exactEndgame || !this.isMpcEnabled()) {
      return null;
    }
    if (!(state instanceof GameState)) {
      return null;
    }
    if (!Number.isFinite(alpha) || !Number.isFinite(beta) || alpha <= -INFINITY || beta >= INFINITY) {
      return null;
    }

    const runtime = this.getMpcRuntimeConfig();
    const maxWindow = Math.max(1, Math.round(Number(runtime?.maxWindow ?? 1)));
    if ((beta - alpha) > maxWindow) {
      return null;
    }

    const minPly = Math.max(0, Math.round(Number(runtime?.minPly ?? 1)));
    if (!Number.isInteger(ply) || ply < minPly) {
      return null;
    }

    const calibrations = this.selectMpcCalibrations(state.getEmptyCount(), depth);
    if (!Array.isArray(calibrations) || calibrations.length === 0) {
      return null;
    }

    const canTryHighCut = runtime?.enableHighCut !== false;
    const canTryLowCut = runtime?.enableLowCut === true;

    for (const calibration of calibrations) {
      if (canTryHighCut) {
        const adjustedHalfWidth = this.adjustedMpcHalfWidth(calibration, depth, 'high');
        if (Number.isFinite(adjustedHalfWidth)) {
          const rawThreshold = (beta - calibration.intercept + adjustedHalfWidth) / calibration.slope;
          if (Number.isFinite(rawThreshold)) {
            const threshold = clamp(Math.round(rawThreshold), -INFINITY + 2, INFINITY - 1);
            this.stats.mpcProbes += 1;
            this.stats.mpcHighProbes += 1;

            const probeResult = this.runWithMpcSuppressed(() => (
              this.negamax(state, calibration.shallowDepth, threshold - 1, threshold, ply, false)
            ));

            if (probeResult.score >= threshold) {
              this.stats.mpcHighCutoffs += 1;
              return {
                score: beta,
                flag: 'lower',
                shallowScore: probeResult.score,
                threshold,
                calibration,
                side: 'high',
              };
            }
          }
        }
      }

      if (canTryLowCut) {
        const adjustedHalfWidth = this.adjustedMpcHalfWidth(calibration, depth, 'low');
        if (Number.isFinite(adjustedHalfWidth)) {
          const rawThreshold = (alpha - calibration.intercept - adjustedHalfWidth) / calibration.slope;
          if (Number.isFinite(rawThreshold)) {
            const threshold = clamp(Math.round(rawThreshold), -INFINITY + 1, INFINITY - 2);
            this.stats.mpcProbes += 1;
            this.stats.mpcLowProbes += 1;

            const probeResult = this.runWithMpcSuppressed(() => (
              this.negamax(state, calibration.shallowDepth, threshold, threshold + 1, ply, false)
            ));

            if (probeResult.score <= threshold) {
              this.stats.mpcLowCutoffs += 1;
              return {
                score: alpha,
                flag: 'upper',
                shallowScore: probeResult.score,
                threshold,
                calibration,
                side: 'low',
              };
            }
          }
        }
      }
    }

    return null;
  }

  recordEtcActivity(bucket, metric) {
    const aggregateKey = `etc${metric}`;
    const bucketKey = `${bucket === 'wld' ? 'etcWld' : 'etcExact'}${metric}`;
    this.stats[aggregateKey] += 1;
    this.stats[bucketKey] += 1;
  }

  isOptimizedFewEmptiesExactSolverEnabled() {
    return this.options.optimizedFewEmptiesExactSolver !== false;
  }

  isSpecializedFewEmptiesExactSolverEnabled() {
    return this.isOptimizedFewEmptiesExactSolverEnabled()
      && this.options.specializedFewEmptiesExactSolver !== false;
  }

  isExactFastestFirstOrderingEnabled() {
    return this.options.exactFastestFirstOrdering !== false;
  }

  recordSpecializedFewEmptiesCall(empties) {
    this.stats.specializedFewEmptiesCalls += 1;
    const stageKey = `specializedFewEmpties${Math.max(1, Math.min(4, empties))}Calls`;
    if (Object.hasOwn(this.stats, stageKey)) {
      this.stats[stageKey] += 1;
    }
  }

  isEnhancedTranspositionCutoffEnabled(bucket = 'exact') {
    return bucket === 'wld'
      ? this.options.enhancedTranspositionCutoffWld !== false
      : this.options.enhancedTranspositionCutoff !== false;
  }

  storeRootProgressSnapshot(rootMoves, bestMoveIndex, bestScore, bestPv, analyzedMoves) {
    if (!Number.isInteger(bestMoveIndex) || !Number.isFinite(bestScore) || analyzedMoves.length === 0) {
      return;
    }

    const sortedAnalyzedMoves = analyzedMoves
      .map((move) => ({
        ...move,
        principalVariation: Array.isArray(move.principalVariation)
          ? [...move.principalVariation]
          : [],
      }))
      .sort((left, right) => right.score - left.score);
    const bestAnalyzedMove = sortedAnalyzedMoves.find((move) => move.index === bestMoveIndex) ?? sortedAnalyzedMoves[0] ?? null;
    if (!bestAnalyzedMove) {
      return;
    }

    this.rootProgressSnapshot = {
      bestMoveIndex,
      bestMoveCoord: bestAnalyzedMove.coord ?? null,
      score: bestScore,
      principalVariation: [...bestPv],
      analyzedMoves: sortedAnalyzedMoves,
      didPass: false,
      searchCompletion: 'partial-timeout',
      rootAnalyzedMoveCount: analyzedMoves.length,
      rootLegalMoveCount: rootMoves.length,
    };
  }

  getRootProgressSnapshot() {
    return cloneSearchResult(this.rootProgressSnapshot);
  }

  trimTranspositionTable(forceClear = false) {
    if (forceClear) {
      const removed = this.transpositionTable.size;
      this.transpositionTable.clear();
      if (this.stats) {
        this.stats.ttEvictions += removed;
      }
      return;
    }

    const maxEntries = Math.max(1000, Math.floor(this.options.maxTableEntries ?? 1000));
    if (this.transpositionTable.size <= maxEntries) {
      return;
    }

    const batchSize = Math.max(64, Math.floor(maxEntries * 0.12));
    const targetSize = Math.max(0, maxEntries - batchSize);
    const keysToDelete = [];
    const queued = new Set();
    const requiredRemovals = this.transpositionTable.size - targetSize;
    const ageOf = (entry) => Math.max(0, this.searchGeneration - (entry.generation ?? this.searchGeneration));
    const queueMatchingEntries = (predicate) => {
      if (keysToDelete.length >= requiredRemovals) {
        return;
      }

      for (const [key, entry] of this.transpositionTable) {
        if (keysToDelete.length >= requiredRemovals) {
          break;
        }
        if (queued.has(key)) {
          continue;
        }
        if (!predicate(entry, ageOf(entry))) {
          continue;
        }

        queued.add(key);
        keysToDelete.push(key);
      }
    };

    queueMatchingEntries((entry, age) => age >= 2 && entry.flag !== 'exact' && (entry.depth ?? 0) <= 4);
    queueMatchingEntries((entry, age) => age >= 2 && entry.flag !== 'exact');
    queueMatchingEntries((entry, age) => age >= 1 && entry.flag !== 'exact' && (entry.depth ?? 0) <= 2);
    queueMatchingEntries((entry, age) => age >= 2 && (entry.depth ?? 0) <= 4);
    queueMatchingEntries((entry, age) => age >= 1 && entry.flag !== 'exact');

    if (keysToDelete.length < requiredRemovals) {
      for (const key of this.transpositionTable.keys()) {
        if (keysToDelete.length >= requiredRemovals) {
          break;
        }
        if (queued.has(key)) {
          continue;
        }

        queued.add(key);
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.transpositionTable.delete(key);
    }

    if (this.stats) {
      this.stats.ttEvictions += keysToDelete.length;
    }
  }

  checkDeadline() {
    if (now() >= this.deadlineMs) {
      throw new SearchTimeoutError();
    }
  }

  exactTerminalScoreFromBoards(player, opponent) {
    return (popcount(player) - popcount(opponent)) * 10000;
  }

  normalizeWldScore(score) {
    if (score > 0) {
      return WLD_RESULT_SCORE;
    }
    if (score < 0) {
      return -WLD_RESULT_SCORE;
    }
    return 0;
  }

  wldTerminalScoreFromBoards(player, opponent) {
    return this.normalizeWldScore(popcount(player) - popcount(opponent));
  }

  describeWldOutcome(score) {
    if (score > 0) {
      return 'win';
    }
    if (score < 0) {
      return 'loss';
    }
    return 'draw';
  }

  scoreFewEmptiesExactMove(index) {
    let score = 0;

    if (CORNER_INDEX_SET.has(index)) {
      score += 8_000_000;
    }

    score += POSITIONAL_WEIGHTS[index] * 12_000;

    const riskType = getPositionalRisk(index);
    if (riskType === 'x-square') {
      score -= 1_600_000;
    } else if (riskType === 'c-square') {
      score -= 900_000;
    }

    return score;
  }

  generateFewEmptiesExactMoves(player, opponent, emptyBits) {
    const moves = [];
    let cursor = emptyBits;

    while (cursor !== 0n) {
      const moveBit = cursor & -cursor;
      cursor ^= moveBit;

      const flips = computeFlips(moveBit, player, opponent);
      if (flips === 0n) {
        continue;
      }

      const index = indexFromBit(moveBit);
      const nextPlayerBoard = player | moveBit | flips;
      const nextOpponentBoard = opponent & ~flips;

      moves.push({
        index,
        moveBit,
        flips,
        nextPlayerBoard,
        nextOpponentBoard,
        remainingEmptyBits: emptyBits & ~moveBit,
        orderingScore: this.scoreFewEmptiesExactMove(index),
      });
    }

    moves.sort((left, right) => {
      if (right.orderingScore !== left.orderingScore) {
        return right.orderingScore - left.orderingScore;
      }
      return left.index - right.index;
    });

    return moves;
  }

  orderSpecializedFewEmptiesIndices(indices) {
    if (!Array.isArray(indices) || indices.length <= 1) {
      return Array.isArray(indices) ? [...indices] : [];
    }

    const ranked = indices.map((index) => ({
      index,
      squareScore: this.scoreFewEmptiesExactMove(index),
    }));

    ranked.sort((left, right) => {
      if (right.squareScore !== left.squareScore) {
        return right.squareScore - left.squareScore;
      }
      return left.index - right.index;
    });

    return ranked.map((entry) => entry.index);
  }

  solveSpecializedFewEmptiesExactBoards(player, opponent, emptyBits, consecutivePasses = 0, alpha = -INFINITY, beta = INFINITY) {
    const indices = bitsToIndices(emptyBits);

    switch (indices.length) {
      case 0:
        return this.exactTerminalScoreFromBoards(player, opponent);
      case 1:
        return this.solveSpecializedExact1(player, opponent, indices[0], consecutivePasses);
      case 2:
        return this.solveSpecializedExact2(player, opponent, indices[0], indices[1], consecutivePasses, alpha, beta);
      case 3:
        return this.solveSpecializedExact3(player, opponent, indices[0], indices[1], indices[2], consecutivePasses, alpha, beta);
      case 4:
        return this.solveSpecializedExact4(player, opponent, indices[0], indices[1], indices[2], indices[3], consecutivePasses, alpha, beta);
      default:
        return this.solveSmallExactBoards(player, opponent, emptyBits, consecutivePasses, alpha, beta);
    }
  }

  solveSpecializedExact1(player, opponent, x1, consecutivePasses = 0) {
    this.checkDeadline();
    this.stats.smallSolverNodes += 1;
    this.recordSpecializedFewEmptiesCall(1);

    const moveBit = bitFromIndex(x1);
    const flips = computeFlips(moveBit, player, opponent);
    if (flips !== 0n) {
      const nextPlayerBoard = player | moveBit | flips;
      const nextOpponentBoard = opponent & ~flips;
      return -this.exactTerminalScoreFromBoards(nextOpponentBoard, nextPlayerBoard);
    }

    if (consecutivePasses > 0) {
      return this.exactTerminalScoreFromBoards(player, opponent);
    }

    return -this.solveSpecializedExact1(opponent, player, x1, consecutivePasses + 1);
  }

  solveSpecializedExact2(player, opponent, x1, x2, consecutivePasses = 0, alpha = -INFINITY, beta = INFINITY) {
    this.checkDeadline();
    this.stats.smallSolverNodes += 1;
    this.recordSpecializedFewEmptiesCall(2);

    const orderedIndices = this.orderSpecializedFewEmptiesIndices([x1, x2]);
    let bestScore = -INFINITY;
    let legalFound = false;
    let localAlpha = alpha;

    for (const moveIndex of orderedIndices) {
      const moveBit = bitFromIndex(moveIndex);
      const flips = computeFlips(moveBit, player, opponent);
      if (flips === 0n) {
        continue;
      }

      legalFound = true;
      const nextPlayerBoard = player | moveBit | flips;
      const nextOpponentBoard = opponent & ~flips;
      const remainingIndex = moveIndex === x1 ? x2 : x1;
      const score = -this.solveSpecializedExact1(nextOpponentBoard, nextPlayerBoard, remainingIndex, 0);

      if (score > bestScore) {
        bestScore = score;
      }
      if (score > localAlpha) {
        localAlpha = score;
      }
      if (localAlpha >= beta) {
        return bestScore;
      }
    }

    if (legalFound) {
      return bestScore;
    }
    if (consecutivePasses > 0) {
      return this.exactTerminalScoreFromBoards(player, opponent);
    }

    return -this.solveSpecializedExact2(opponent, player, x1, x2, consecutivePasses + 1, -beta, -alpha);
  }

  solveSpecializedExact3(player, opponent, x1, x2, x3, consecutivePasses = 0, alpha = -INFINITY, beta = INFINITY) {
    this.checkDeadline();
    this.stats.smallSolverNodes += 1;
    this.recordSpecializedFewEmptiesCall(3);

    const orderedIndices = this.orderSpecializedFewEmptiesIndices([x1, x2, x3]);
    let bestScore = -INFINITY;
    let legalFound = false;
    let localAlpha = alpha;

    for (const moveIndex of orderedIndices) {
      const moveBit = bitFromIndex(moveIndex);
      const flips = computeFlips(moveBit, player, opponent);
      if (flips === 0n) {
        continue;
      }

      legalFound = true;
      const nextPlayerBoard = player | moveBit | flips;
      const nextOpponentBoard = opponent & ~flips;
      let remainingA;
      let remainingB;
      if (moveIndex === x1) {
        remainingA = x2;
        remainingB = x3;
      } else if (moveIndex === x2) {
        remainingA = x1;
        remainingB = x3;
      } else {
        remainingA = x1;
        remainingB = x2;
      }

      const score = -this.solveSpecializedExact2(
        nextOpponentBoard,
        nextPlayerBoard,
        remainingA,
        remainingB,
        0,
        -beta,
        -localAlpha,
      );

      if (score > bestScore) {
        bestScore = score;
      }
      if (score > localAlpha) {
        localAlpha = score;
      }
      if (localAlpha >= beta) {
        return bestScore;
      }
    }

    if (legalFound) {
      return bestScore;
    }
    if (consecutivePasses > 0) {
      return this.exactTerminalScoreFromBoards(player, opponent);
    }

    return -this.solveSpecializedExact3(opponent, player, x1, x2, x3, consecutivePasses + 1, -beta, -alpha);
  }

  solveSpecializedExact4(player, opponent, x1, x2, x3, x4, consecutivePasses = 0, alpha = -INFINITY, beta = INFINITY) {
    this.checkDeadline();
    this.stats.smallSolverNodes += 1;
    this.recordSpecializedFewEmptiesCall(4);

    const orderedIndices = this.orderSpecializedFewEmptiesIndices([x1, x2, x3, x4]);
    let bestScore = -INFINITY;
    let legalFound = false;
    let localAlpha = alpha;

    for (const moveIndex of orderedIndices) {
      const moveBit = bitFromIndex(moveIndex);
      const flips = computeFlips(moveBit, player, opponent);
      if (flips === 0n) {
        continue;
      }

      legalFound = true;
      const nextPlayerBoard = player | moveBit | flips;
      const nextOpponentBoard = opponent & ~flips;
      let remainingA;
      let remainingB;
      let remainingC;
      if (moveIndex === x1) {
        remainingA = x2;
        remainingB = x3;
        remainingC = x4;
      } else if (moveIndex === x2) {
        remainingA = x1;
        remainingB = x3;
        remainingC = x4;
      } else if (moveIndex === x3) {
        remainingA = x1;
        remainingB = x2;
        remainingC = x4;
      } else {
        remainingA = x1;
        remainingB = x2;
        remainingC = x3;
      }

      const score = -this.solveSpecializedExact3(
        nextOpponentBoard,
        nextPlayerBoard,
        remainingA,
        remainingB,
        remainingC,
        0,
        -beta,
        -localAlpha,
      );

      if (score > bestScore) {
        bestScore = score;
      }
      if (score > localAlpha) {
        localAlpha = score;
      }
      if (localAlpha >= beta) {
        return bestScore;
      }
    }

    if (legalFound) {
      return bestScore;
    }
    if (consecutivePasses > 0) {
      return this.exactTerminalScoreFromBoards(player, opponent);
    }

    return -this.solveSpecializedExact4(opponent, player, x1, x2, x3, x4, consecutivePasses + 1, -beta, -alpha);
  }

  solveSmallWldBoards(player, opponent, emptyBits, consecutivePasses = 0) {
    this.checkDeadline();
    this.stats.wldSmallSolverNodes += 1;

    if (emptyBits === 0n) {
      return this.wldTerminalScoreFromBoards(player, opponent);
    }

    let bestScore = -INFINITY;
    let legalFound = false;
    let cursor = emptyBits;

    while (cursor !== 0n) {
      const moveBit = cursor & -cursor;
      cursor ^= moveBit;

      const flips = computeFlips(moveBit, player, opponent);
      if (flips === 0n) {
        continue;
      }

      legalFound = true;
      const nextPlayerBoard = player | moveBit | flips;
      const nextOpponentBoard = opponent & ~flips;
      const score = -this.solveSmallWldBoards(
        nextOpponentBoard,
        nextPlayerBoard,
        emptyBits & ~moveBit,
        0,
      );

      if (score > bestScore) {
        bestScore = score;
        if (bestScore >= WLD_RESULT_SCORE) {
          return bestScore;
        }
      }
    }

    if (legalFound) {
      return bestScore;
    }
    if (consecutivePasses > 0) {
      return this.wldTerminalScoreFromBoards(player, opponent);
    }

    return -this.solveSmallWldBoards(opponent, player, emptyBits, consecutivePasses + 1);
  }

  solveSmallWld(state) {
    this.stats.wldSmallSolverCalls += 1;
    const { player, opponent } = state.getPlayerBoards();
    return this.solveSmallWldBoards(
      player,
      opponent,
      state.getEmptyBitboard(),
      state.consecutivePasses,
    );
  }

  solveSmallExactBoardsFullWidth(player, opponent, emptyBits, consecutivePasses = 0) {
    this.checkDeadline();
    this.stats.smallSolverNodes += 1;

    if (emptyBits === 0n) {
      return this.exactTerminalScoreFromBoards(player, opponent);
    }

    let bestScore = -INFINITY;
    let legalFound = false;
    let cursor = emptyBits;

    while (cursor !== 0n) {
      const moveBit = cursor & -cursor;
      cursor ^= moveBit;

      const flips = computeFlips(moveBit, player, opponent);
      if (flips === 0n) {
        continue;
      }

      legalFound = true;
      const nextPlayerBoard = player | moveBit | flips;
      const nextOpponentBoard = opponent & ~flips;
      const score = -this.solveSmallExactBoardsFullWidth(
        nextOpponentBoard,
        nextPlayerBoard,
        emptyBits & ~moveBit,
        0,
      );

      if (score > bestScore) {
        bestScore = score;
      }
    }

    if (legalFound) {
      return bestScore;
    }
    if (consecutivePasses > 0) {
      return this.exactTerminalScoreFromBoards(player, opponent);
    }

    return -this.solveSmallExactBoardsFullWidth(opponent, player, emptyBits, consecutivePasses + 1);
  }

  solveSmallExactBoards(player, opponent, emptyBits, consecutivePasses = 0, alpha = -INFINITY, beta = INFINITY) {
    if (!this.isOptimizedFewEmptiesExactSolverEnabled()) {
      return this.solveSmallExactBoardsFullWidth(player, opponent, emptyBits, consecutivePasses);
    }

    if (this.isSpecializedFewEmptiesExactSolverEnabled() && popcount(emptyBits) <= SMALL_EXACT_SOLVER_EMPTIES) {
      return this.solveSpecializedFewEmptiesExactBoards(
        player,
        opponent,
        emptyBits,
        consecutivePasses,
        alpha,
        beta,
      );
    }

    this.checkDeadline();
    this.stats.smallSolverNodes += 1;

    if (emptyBits === 0n) {
      return this.exactTerminalScoreFromBoards(player, opponent);
    }

    let bestScore = -INFINITY;
    let legalFound = false;
    let localAlpha = alpha;
    const moves = this.generateFewEmptiesExactMoves(player, opponent, emptyBits);

    for (const move of moves) {
      legalFound = true;
      const score = -this.solveSmallExactBoards(
        move.nextOpponentBoard,
        move.nextPlayerBoard,
        move.remainingEmptyBits,
        0,
        -beta,
        -localAlpha,
      );

      if (score > bestScore) {
        bestScore = score;
      }

      if (score > localAlpha) {
        localAlpha = score;
      }

      if (localAlpha >= beta) {
        return bestScore;
      }
    }

    if (legalFound) {
      return bestScore;
    }
    if (consecutivePasses > 0) {
      return this.exactTerminalScoreFromBoards(player, opponent);
    }

    return -this.solveSmallExactBoards(opponent, player, emptyBits, consecutivePasses + 1, -beta, -alpha);
  }

  solveSmallExact(state, alpha = -INFINITY, beta = INFINITY) {
    this.stats.smallSolverCalls += 1;
    const { player, opponent } = state.getPlayerBoards();
    return this.solveSmallExactBoards(
      player,
      opponent,
      state.getEmptyBitboard(),
      state.consecutivePasses,
      alpha,
      beta,
    );
  }

  pullPreferredMove(moves, preferredMoveIndex) {
    if (!Number.isInteger(preferredMoveIndex)) {
      return { preferredMove: null, remainingMoves: moves };
    }

    const useInPlaceExtraction = this.options.ttFirstInPlaceMoveExtraction !== false;
    let preferredIndex = -1;

    if (useInPlaceExtraction) {
      for (let index = 0; index < moves.length; index += 1) {
        if (moves[index]?.index === preferredMoveIndex) {
          preferredIndex = index;
          break;
        }
      }
    } else {
      preferredIndex = moves.findIndex((move) => move.index === preferredMoveIndex);
    }

    if (preferredIndex < 0) {
      return { preferredMove: null, remainingMoves: moves };
    }

    const preferredMove = moves[preferredIndex];
    if (!useInPlaceExtraction) {
      const remainingMoves = [
        ...moves.slice(0, preferredIndex),
        ...moves.slice(preferredIndex + 1),
      ];
      return { preferredMove, remainingMoves };
    }

    for (let index = preferredIndex + 1; index < moves.length; index += 1) {
      moves[index - 1] = moves[index];
    }
    moves.pop();

    return { preferredMove, remainingMoves: moves };
  }

  createRootOpeningContext(bookHit, priorHit) {
    const bookTotalWeight = bookHit?.totalWeight ?? 0;
    const bookByMove = new Map((bookHit?.candidates ?? []).map((candidate) => [
      candidate.moveIndex,
      {
        ...candidate,
        share: bookTotalWeight > 0 ? candidate.weight / bookTotalWeight : 0,
      },
    ]));

    const priorMoves = Array.isArray(priorHit?.moves) ? priorHit.moves : [];
    const priorTotalCount = Math.max(
      0,
      Number.isFinite(priorHit?.totalCount)
        ? priorHit.totalCount
        : priorMoves.reduce((sum, move) => sum + (Number.isFinite(move?.count) ? move.count : 0), 0),
    );
    const finitePriorMoves = priorMoves.filter((move) => Number.isFinite(move?.priorScore));
    const priorScoreWeightedSum = finitePriorMoves.reduce(
      (sum, move) => sum + (move.priorScore * Math.max(1, Number.isFinite(move?.count) ? move.count : 1)),
      0,
    );
    const priorScoreWeight = finitePriorMoves.reduce(
      (sum, move) => sum + Math.max(1, Number.isFinite(move?.count) ? move.count : 1),
      0,
    );
    const priorMeanScore = priorScoreWeight > 0 ? priorScoreWeightedSum / priorScoreWeight : 0;
    const priorByMove = new Map(priorMoves.map((move) => [
      move.moveIndex,
      {
        ...move,
        share: priorTotalCount > 0 ? (move.count ?? 0) / priorTotalCount : 0,
        priorScoreDelta: Number.isFinite(move?.priorScore) ? move.priorScore - priorMeanScore : 0,
      },
    ]));

    return {
      bookHit,
      priorHit,
      bookByMove,
      bookWeights: bookByMove.size > 0
        ? new Map([...bookByMove.values()].map((candidate) => [candidate.moveIndex, candidate.weight]))
        : null,
      bookTotalWeight,
      bookCoverage: openingEvidenceCoverage(bookTotalWeight),
      priorByMove,
      priorTotalCount,
      priorCandidateCount: priorMoves.length,
      priorCoverage: openingEvidenceCoverage(priorTotalCount),
      priorMeanScore,
      priorBestScore: priorMoves.length > 0
        ? Math.max(...priorMoves.map((move) => (Number.isFinite(move?.priorScore) ? move.priorScore : -INFINITY)))
        : null,
    };
  }

  getOpeningPriorContradiction(state, selection = null, openingContext = null) {
    const tuning = this.openingTuning ?? resolveOpeningHybridTuning();
    const minPly = Number.isFinite(tuning?.priorContradictionVetoMinPly)
      ? Math.max(0, Math.round(tuning.priorContradictionVetoMinPly))
      : (OPENING_BOOK_DIRECT_USE_MAX_PLY + 1);
    if ((state?.moveHistory.length ?? 0) < minPly) {
      return null;
    }

    const topCandidate = selection?.scoredCandidates?.[0] ?? null;
    const priorBest = openingContext?.priorHit?.moves?.[0] ?? null;
    if (!topCandidate || !priorBest) {
      return null;
    }
    if (topCandidate.index === priorBest.moveIndex) {
      return null;
    }

    const priorTotalCount = Math.max(
      0,
      Number.isFinite(openingContext?.priorTotalCount) ? openingContext.priorTotalCount : 0,
    );
    const minCount = Number.isFinite(tuning?.priorContradictionVetoMinCount)
      ? Math.max(0, Math.round(tuning.priorContradictionVetoMinCount))
      : Number.POSITIVE_INFINITY;
    if (priorTotalCount < minCount) {
      return null;
    }

    const selectedPriorRank = Number.isFinite(topCandidate.priorRank)
      ? topCandidate.priorRank
      : Number.POSITIVE_INFINITY;
    const minRank = Number.isFinite(tuning?.priorContradictionVetoMinRank)
      ? Math.max(2, Math.round(tuning.priorContradictionVetoMinRank))
      : Number.POSITIVE_INFINITY;
    if (selectedPriorRank < minRank) {
      return null;
    }

    const selectedPriorShare = Number.isFinite(topCandidate.priorShare) ? topCandidate.priorShare : 0;
    const bestPriorShare = Number.isFinite(priorBest.share) ? priorBest.share : 0;
    const shareDelta = bestPriorShare - selectedPriorShare;
    const minShareDelta = Number.isFinite(tuning?.priorContradictionVetoMinShareDelta)
      ? Math.max(0, tuning.priorContradictionVetoMinShareDelta)
      : 1;
    if (shareDelta < minShareDelta) {
      return null;
    }

    return {
      selectedMoveIndex: topCandidate.index,
      selectedMoveCoord: topCandidate.coord,
      selectedPriorRank: Number.isFinite(selectedPriorRank) ? selectedPriorRank : null,
      selectedPriorShare,
      bestMoveIndex: priorBest.moveIndex,
      bestMoveCoord: priorBest.coord,
      bestPriorRank: Number.isFinite(priorBest.rank) ? priorBest.rank : 1,
      bestPriorShare,
      shareDelta,
      priorTotalCount,
    };
  }

  getOpeningBookDirectDecision(state, bookHit, selection = null, openingContext = null) {
    if (!bookHit || bookHit.candidateCount === 0 || !selection?.scoredCandidates?.length) {
      return { allowDirect: false, reason: 'no-candidate', contradiction: null };
    }

    const tuning = this.openingTuning ?? resolveOpeningHybridTuning();
    const directUseMaxPly = Math.min(
      OPENING_BOOK_DIRECT_USE_MAX_PLY,
      Number.isFinite(tuning?.directUseMaxPly) ? tuning.directUseMaxPly : OPENING_BOOK_DIRECT_USE_MAX_PLY,
    );
    if (directUseMaxPly < 0 || state.moveHistory.length > directUseMaxPly) {
      return { allowDirect: false, reason: 'ply-cap', contradiction: null };
    }

    const contradiction = this.getOpeningPriorContradiction(state, selection, openingContext);
    if (state.moveHistory.length <= (tuning?.directAlwaysUseMaxPly ?? -1)) {
      return contradiction
        ? { allowDirect: false, reason: 'prior-contradiction', contradiction }
        : { allowDirect: true, reason: 'always-use', contradiction: null };
    }

    const [topCandidate, secondCandidate] = selection.scoredCandidates;
    if (!topCandidate) {
      return { allowDirect: false, reason: 'no-candidate', contradiction: null };
    }

    let allowDirect = false;
    if (!secondCandidate) {
      allowDirect = (topCandidate.weight ?? 0) >= (tuning?.singleMoveMinWeight ?? 1)
        || (
          (topCandidate.priorCount ?? 0) >= (tuning?.singleMovePriorSupportMinCount ?? 0)
          && (topCandidate.priorShare ?? 0) >= (tuning?.singleMovePriorSupportMinShare ?? 1)
        )
        || (
          (topCandidate.priorCount ?? 0) >= (tuning?.singleMoveElitePriorSupportMinCount ?? Number.POSITIVE_INFINITY)
          && (topCandidate.priorShare ?? 0) >= (tuning?.singleMoveElitePriorSupportMinShare ?? 1)
        );
    } else {
      const scoreGap = Number.isFinite(selection.scoreGap)
        ? selection.scoreGap
        : (topCandidate.score - secondCandidate.score);
      if (scoreGap >= (tuning?.highConfidenceScoreGap ?? 0)) {
        allowDirect = true;
      }
      if (
        !allowDirect
        && scoreGap >= (tuning?.mediumConfidenceScoreGap ?? 0)
        && (topCandidate.bookShare ?? 0) >= (tuning?.mediumBookShare ?? 1)
      ) {
        allowDirect = true;
      }
      if (
        !allowDirect
        && scoreGap >= (tuning?.priorSupportScoreGap ?? 0)
        && (topCandidate.bookShare ?? 0) >= (tuning?.priorSupportBookShare ?? 1)
        && (topCandidate.priorCount ?? 0) >= (tuning?.priorSupportMinCount ?? 0)
        && (topCandidate.priorShare ?? 0) >= (tuning?.priorSupportMinShare ?? 1)
      ) {
        allowDirect = true;
      }
    }

    if (!allowDirect) {
      return { allowDirect: false, reason: 'low-confidence', contradiction: null };
    }
    if (contradiction) {
      return { allowDirect: false, reason: 'prior-contradiction', contradiction };
    }
    return { allowDirect: true, reason: 'confidence', contradiction: null };
  }

  shouldUseOpeningBookDirect(state, bookHit, selection = null, openingContext = null) {
    return this.getOpeningBookDirectDecision(state, bookHit, selection, openingContext).allowDirect;
  }

  describeOpeningPriorContradiction(contradiction = null) {
    if (!contradiction) {
      return null;
    }

    return {
      selectedMoveCoord: contradiction.selectedMoveCoord,
      selectedPriorRank: contradiction.selectedPriorRank,
      selectedPriorShare: contradiction.selectedPriorShare,
      bestMoveCoord: contradiction.bestMoveCoord,
      bestPriorRank: contradiction.bestPriorRank,
      bestPriorShare: contradiction.bestPriorShare,
      shareDelta: contradiction.shareDelta,
      priorTotalCount: contradiction.priorTotalCount,
    };
  }

  describeBookHit(bookHit, selectedMoveIndex = null, usedDirectly = false) {
    const matchedCandidate = Number.isInteger(selectedMoveIndex)
      ? bookHit.candidates.find((candidate) => candidate.moveIndex === selectedMoveIndex) ?? null
      : null;

    return {
      usedDirectly,
      depthPly: bookHit.depthPly,
      candidateCount: bookHit.candidateCount,
      totalWeight: bookHit.totalWeight,
      topNames: bookHit.topNames.map((entry) => entry.name),
      matchedMoveCoord: matchedCandidate?.coord ?? null,
      matchedMoveWeight: matchedCandidate?.weight ?? 0,
      matchedMoveShare: matchedCandidate && bookHit.totalWeight > 0
        ? matchedCandidate.weight / bookHit.totalWeight
        : 0,
      matchedNames: matchedCandidate ? matchedCandidate.topNames.map((entry) => entry.name) : [],
    };
  }

  describeOpeningPriorHit(priorHit, selectedMoveIndex = null, usedDirectly = false) {
    if (!priorHit) {
      return null;
    }

    const matchedMove = Number.isInteger(selectedMoveIndex)
      ? priorHit.moves.find((move) => move.moveIndex === selectedMoveIndex) ?? null
      : null;

    return {
      usedDirectly,
      depthPly: priorHit.ply,
      candidateCount: priorHit.moves.length,
      totalCount: priorHit.totalCount,
      matchedMoveCoord: matchedMove?.coord ?? null,
      matchedMoveCount: matchedMove?.count ?? 0,
      matchedMoveShare: matchedMove?.share ?? 0,
      matchedMoveRank: matchedMove?.rank ?? null,
      matchedMovePriorScore: matchedMove?.priorScore ?? null,
      topMoves: priorHit.moves.slice(0, 3).map((move) => move.coord),
    };
  }

  scoreMoveForOpeningSelection(state, move, openingContext = null) {
    const bookCandidate = openingContext?.bookByMove?.get(move.index) ?? null;
    const priorCandidate = openingContext?.priorByMove?.get(move.index) ?? null;
    const tuning = this.openingTuning ?? resolveOpeningHybridTuning();
    let score = 0;

    if (bookCandidate) {
      if ((openingContext?.bookHit?.candidateCount ?? 0) <= 1) {
        score += 34 + Math.min(24, Math.log2((bookCandidate.weight ?? 0) + 1) * 2.4);
      } else {
        const averageShare = 1 / Math.max(1, openingContext?.bookHit?.candidateCount ?? 1);
        score += ((bookCandidate.share ?? 0) - averageShare) * 120;
        score += Math.min(26, Math.log2((bookCandidate.weight ?? 0) + 1) * 2.1);
      }
    }

    if (priorCandidate) {
      const averageShare = 1 / Math.max(1, openingContext?.priorCandidateCount ?? 1);
      const priorOutcomeScore = clamp((priorCandidate.priorScoreDelta ?? 0) / 6000, -3, 3) * 14;
      score += (openingContext?.priorCoverage ?? 0) * (tuning?.selectionPriorScale ?? 1) * (
        ((priorCandidate.share ?? 0) - averageShare) * 110 + priorOutcomeScore
      );
    } else if ((openingContext?.priorCoverage ?? 0) >= 0.7 && (openingContext?.priorCandidateCount ?? 0) > 0) {
      score -= 12 * openingContext.priorCoverage * (tuning?.selectionMissingPriorPenaltyScale ?? 1);
    }

    if (CORNER_INDEX_SET.has(move.index)) {
      score += 22 * (this.options.cornerScale ?? 1);
    }

    score += POSITIONAL_WEIGHTS[move.index] * 0.85 * (this.options.positionalScale ?? 1);
    score += move.flipCount * 0.35;

    const riskPenaltyScale = this.options.riskPenaltyScale ?? 1;
    const riskType = getPositionalRisk(move.index);
    if (riskType === 'x-square') {
      score -= 9 * riskPenaltyScale;
    } else if (riskType === 'c-square') {
      score -= 5 * riskPenaltyScale;
    }

    const childState = state.applyMoveFast(move.index, move.flips ?? null);
    if (childState) {
      const childBoards = childState.getPlayerBoards();
      const opponentMovesBitboard = legalMovesBitboard(childBoards.player, childBoards.opponent);
      const opponentMoveCount = popcount(opponentMovesBitboard);
      const opponentCornerReplies = countCornerMoves(opponentMovesBitboard);
      score -= opponentMoveCount * 0.75 * (this.options.mobilityScale ?? 1);
      score -= opponentCornerReplies * 10 * (this.options.cornerAdjacencyScale ?? 1);
      if (opponentMoveCount === 0) {
        score += 12;
      }
    }

    return Number(score.toFixed(2));
  }

  selectOpeningBookMove(state, legalMoves, bookHit, openingContext = null) {
    const legalMoveMap = new Map(legalMoves.map((move) => [move.index, move]));
    const scoredCandidates = bookHit.candidates
      .map((candidate) => {
        const move = legalMoveMap.get(candidate.moveIndex);
        if (!move) {
          return null;
        }

        const priorCandidate = openingContext?.priorByMove?.get(candidate.moveIndex) ?? null;
        const score = this.scoreMoveForOpeningSelection(state, move, openingContext);
        return {
          index: candidate.moveIndex,
          coord: candidate.coord,
          score,
          weight: candidate.weight,
          bookShare: candidate.share ?? (bookHit.totalWeight > 0 ? candidate.weight / bookHit.totalWeight : 0),
          priorCount: priorCandidate?.count ?? 0,
          priorShare: priorCandidate?.share ?? 0,
          priorRank: priorCandidate?.rank ?? null,
          priorScore: priorCandidate?.priorScore ?? null,
          topNames: candidate.topNames.map((entry) => entry.name),
          flipCount: move.flipCount,
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }
        if ((right.priorScore ?? -INFINITY) !== (left.priorScore ?? -INFINITY)) {
          return (right.priorScore ?? -INFINITY) - (left.priorScore ?? -INFINITY);
        }
        if (right.weight !== left.weight) {
          return right.weight - left.weight;
        }
        return left.coord.localeCompare(right.coord);
      });

    if (scoredCandidates.length === 0) {
      return null;
    }

    return {
      scoredCandidates,
      chosen: chooseRandomBest(
        scoredCandidates,
        this.options.openingRandomness ?? this.options.randomness ?? 0,
      ) ?? scoredCandidates[0],
      scoreGap: scoredCandidates.length > 1
        ? scoredCandidates[0].score - scoredCandidates[1].score
        : Number.POSITIVE_INFINITY,
    };
  }

  createOpeningBookResult(state, legalMoves, bookHit, openingContext, selection, startedAt) {
    const resolvedSelection = selection ?? this.selectOpeningBookMove(state, legalMoves, bookHit, openingContext);
    if (!resolvedSelection) {
      return null;
    }

    this.stats.bookMoves += 1;
    if (openingContext?.priorHit) {
      this.stats.openingHybridDirectMoves += 1;
    }
    this.stats.elapsedMs = Math.round(now() - startedAt);

    return {
      bestMoveIndex: resolvedSelection.chosen.index,
      bestMoveCoord: resolvedSelection.chosen.coord,
      score: resolvedSelection.chosen.score,
      principalVariation: [resolvedSelection.chosen.index],
      analyzedMoves: resolvedSelection.scoredCandidates.map((candidate) => ({
        index: candidate.index,
        coord: candidate.coord,
        score: candidate.score,
        principalVariation: [candidate.index],
        weight: candidate.weight,
        bookShare: candidate.bookShare,
        priorCount: candidate.priorCount,
        priorShare: candidate.priorShare,
        priorRank: candidate.priorRank,
        priorScore: candidate.priorScore,
        flipCount: candidate.flipCount,
      })),
      didPass: false,
      stats: { ...this.stats },
      options: this.createResultOptionsSnapshot(),
      source: 'opening-book',
      searchMode: 'opening-book',
      searchCompletion: 'opening-book',
      isExactResult: false,
      rootEmptyCount: state.getEmptyCount(),
      exactThreshold: this.options.exactEndgameEmpties,
      bookHit: {
        ...this.describeBookHit(bookHit, resolvedSelection.chosen.index, true),
        chosenNames: resolvedSelection.chosen.topNames,
        openingScoreGap: Number.isFinite(resolvedSelection.scoreGap) ? resolvedSelection.scoreGap : null,
        matchedMovePriorShare: resolvedSelection.chosen.priorShare ?? 0,
      },
      ...(openingContext?.priorHit
        ? { openingPriorHit: this.describeOpeningPriorHit(openingContext.priorHit, resolvedSelection.chosen.index, true) }
        : {}),
    };
  }

  buildRootFallback(state, legalMoves, openingContext = null) {
    const orderedMoves = this.orderMoves(state, legalMoves, 0, 1, null, openingContext, 'general');
    const analyzedMoves = [];

    for (const move of orderedMoves) {
      const outcome = move.orderingOutcome ?? state.applyMoveFast(move.index, move.flips ?? null);
      if (!outcome) {
        continue;
      }

      let fallbackState = outcome;
      if (!fallbackState.isTerminal() && fallbackState.getSearchMoves().length === 0) {
        fallbackState = fallbackState.passTurnFast();
      }

      const score = fallbackState.isTerminal()
        ? this.evaluator.evaluateTerminal(fallbackState, state.currentPlayer)
        : this.evaluator.evaluate(fallbackState, state.currentPlayer);

      analyzedMoves.push({
        index: move.index,
        coord: move.coord,
        score,
        principalVariation: [move.index],
        flipCount: move.flipCount,
      });
    }

    analyzedMoves.sort((left, right) => right.score - left.score);
    const bestMove = analyzedMoves[0] ?? {
      index: legalMoves[0].index,
      coord: legalMoves[0].coord,
      score: this.evaluator.evaluate(state, state.currentPlayer),
      principalVariation: [legalMoves[0].index],
      flipCount: legalMoves[0].flipCount,
    };

    return {
      bestMoveIndex: bestMove.index,
      bestMoveCoord: bestMove.coord,
      score: bestMove.score,
      principalVariation: [...bestMove.principalVariation],
      analyzedMoves,
      didPass: false,
      stats: { ...this.stats },
      options: this.createResultOptionsSnapshot(),
      source: 'search',
      searchCompletion: 'heuristic-fallback',
      rootAnalyzedMoveCount: analyzedMoves.length,
      rootLegalMoveCount: legalMoves.length,
    };
  }

  searchForcedPassRoot(passedState, depth, alpha, beta, rootExactEndgame) {
    const childResult = this.negamax(passedState, Math.max(0, depth - 1), -beta, -alpha, 1, rootExactEndgame);
    return {
      bestMoveIndex: null,
      score: -childResult.score,
      principalVariation: childResult.principalVariation,
      analyzedMoves: [],
      didPass: true,
      searchCompletion: 'complete',
      rootAnalyzedMoveCount: 0,
      rootLegalMoveCount: 0,
    };
  }

  searchWldForcedPassRoot(passedState, depth, alpha, beta) {
    const childResult = this.wldNegamax(passedState, -beta, -alpha, 1);
    return {
      bestMoveIndex: null,
      score: -childResult.score,
      principalVariation: childResult.principalVariation,
      analyzedMoves: [],
      didPass: true,
      searchCompletion: 'complete',
      rootAnalyzedMoveCount: 0,
      rootLegalMoveCount: 0,
    };
  }

  runIterativeDeepening(searchAtDepth) {
    let lastCompleted = null;
    let previousScore = 0;

    for (let depth = 1; depth <= this.options.maxDepth; depth += 1) {
      try {
        this.checkDeadline();
        let result;
        const aspirationWindow = depth > 1 ? this.options.aspirationWindow : 0;

        if (aspirationWindow > 0 && lastCompleted) {
          const alpha = previousScore - aspirationWindow;
          const beta = previousScore + aspirationWindow;
          result = searchAtDepth(depth, alpha, beta);
          if (result.score <= alpha || result.score >= beta) {
            result = searchAtDepth(depth, -INFINITY, INFINITY);
          }
        } else {
          result = searchAtDepth(depth, -INFINITY, INFINITY);
        }

        lastCompleted = result;
        previousScore = result.score;
        this.stats.completedDepth = depth;
      } catch (error) {
        if (error instanceof SearchTimeoutError) {
          break;
        }
        throw error;
      }
    }

    return lastCompleted;
  }

  runSingleDepthSearch(depth, searchAtDepth) {
    try {
      this.checkDeadline();
      const result = searchAtDepth(depth, -INFINITY, INFINITY);
      this.stats.completedDepth = depth;
      return result;
    } catch (error) {
      if (error instanceof SearchTimeoutError) {
        return this.getRootProgressSnapshot();
      }
      throw error;
    }
  }

  findBestMove(state, overrides = {}) {
    if (!(state instanceof GameState)) {
      throw new TypeError('findBestMove expects a GameState instance.');
    }

    if (Object.keys(overrides).length > 0) {
      this.updateOptions(overrides);
    }

    this.resetStats();
    this.searchGeneration += 1;
    this.trimTranspositionTable();
    const startedAt = now();
    this.deadlineMs = startedAt + this.options.timeLimitMs;
    const rootEmptyCount = state.getEmptyCount();
    const rootExactEndgame = rootEmptyCount <= this.options.exactEndgameEmpties;
    const wldPreExactEmpties = this.options.wldPreExactEmpties ?? 0;
    const rootWldEndgame = !rootExactEndgame
      && wldPreExactEmpties > 0
      && rootEmptyCount <= (this.options.exactEndgameEmpties + wldPreExactEmpties);
    const rootSearchMode = rootExactEndgame
      ? 'exact-endgame'
      : (rootWldEndgame ? 'wld-endgame' : 'depth-limited');
    if (rootWldEndgame) {
      this.stats.wldRootSearches += 1;
    }

    const legalMoves = state.getLegalMoves();
    if (legalMoves.length === 0) {
      if (state.isTerminal()) {
        return {
          bestMoveIndex: null,
          bestMoveCoord: null,
          score: this.evaluator.evaluateTerminal(state),
          principalVariation: [],
          analyzedMoves: [],
          didPass: false,
          stats: { ...this.stats, elapsedMs: Math.round(now() - startedAt) },
          options: this.createResultOptionsSnapshot(),
          source: 'search',
          searchMode: 'terminal',
          searchCompletion: 'complete',
          isExactResult: true,
          rootEmptyCount,
          exactThreshold: this.options.exactEndgameEmpties,
        };
      }

      const passedState = state.passTurnFast();
      const fallback = {
        bestMoveIndex: null,
        bestMoveCoord: null,
        score: this.evaluator.evaluate(passedState, state.currentPlayer),
        principalVariation: [],
        analyzedMoves: [],
        didPass: true,
        stats: { ...this.stats },
        options: this.createResultOptionsSnapshot(),
        source: 'search',
        searchCompletion: 'heuristic-fallback',
        rootAnalyzedMoveCount: 0,
        rootLegalMoveCount: 0,
      };

      const finalResult = rootExactEndgame
        ? this.runSingleDepthSearch(this.options.maxDepth, (depth, alpha, beta) => (
          this.searchForcedPassRoot(passedState, depth, alpha, beta, rootExactEndgame)
        )) ?? fallback
        : rootWldEndgame
          ? this.runSingleDepthSearch(this.options.maxDepth, (depth) => (
            this.searchWldForcedPassRoot(passedState, depth, -WLD_RESULT_SCORE, WLD_RESULT_SCORE)
          )) ?? fallback
          : this.runIterativeDeepening((depth, alpha, beta) => (
            this.searchForcedPassRoot(passedState, depth, alpha, beta, rootExactEndgame)
          )) ?? fallback;
      const finalSearchCompletion = finalResult.searchCompletion ?? (finalResult === fallback ? 'heuristic-fallback' : 'complete');
      const finalWldOutcome = rootWldEndgame && finalSearchCompletion !== 'heuristic-fallback' && Number.isFinite(finalResult.score)
        ? this.describeWldOutcome(finalResult.score)
        : null;
      this.stats.elapsedMs = Math.round(now() - startedAt);
      return {
        ...finalResult,
        stats: { ...this.stats },
        options: this.createResultOptionsSnapshot(),
        source: 'search',
        searchMode: rootSearchMode,
        searchCompletion: finalSearchCompletion,
        isExactResult: rootExactEndgame && finalSearchCompletion === 'complete',
        isWldResult: rootWldEndgame && finalSearchCompletion === 'complete',
        wldOutcome: finalWldOutcome,
        rootEmptyCount,
        exactThreshold: this.options.exactEndgameEmpties,
      };
    }

    const bookHit = state.moveHistory.length <= OPENING_BOOK_ADVISORY_MAX_PLY
      ? lookupOpeningBook(state)
      : null;
    const priorHit = lookupOpeningPrior(state);
    const openingContext = (bookHit || priorHit)
      ? this.createRootOpeningContext(bookHit, priorHit)
      : null;

    if (bookHit) {
      this.stats.bookHits += 1;
    }
    if (priorHit) {
      this.stats.openingPriorHits += 1;
    }

    const openingSelection = bookHit
      ? this.selectOpeningBookMove(state, legalMoves, bookHit, openingContext)
      : null;
    const openingDirectDecision = bookHit && openingSelection
      ? this.getOpeningBookDirectDecision(state, bookHit, openingSelection, openingContext)
      : null;
    const directUseMaxPly = Math.min(
      OPENING_BOOK_DIRECT_USE_MAX_PLY,
      Number.isFinite(this.openingTuning?.directUseMaxPly) ? this.openingTuning.directUseMaxPly : OPENING_BOOK_DIRECT_USE_MAX_PLY,
    );
    if (bookHit && openingSelection && openingDirectDecision?.allowDirect) {
      const bookResult = this.createOpeningBookResult(state, legalMoves, bookHit, openingContext, openingSelection, startedAt);
      if (bookResult) {
        return bookResult;
      }
    } else if (bookHit && openingSelection && directUseMaxPly >= 0 && state.moveHistory.length <= directUseMaxPly) {
      if (openingDirectDecision?.reason === 'prior-contradiction') {
        this.stats.openingPriorContradictionVetoes += 1;
      } else if (openingDirectDecision?.reason === 'low-confidence') {
        this.stats.openingConfidenceSkips += 1;
      }
    }

    const fallback = this.buildRootFallback(state, legalMoves, openingContext);

    const finalResult = rootExactEndgame
      // Exact root search does not need iterative deepening. Run the full exact solve once
      // at the configured top depth so move-ordering heuristics still see the late-game
      // depth horizon, but avoid repeating the exact tree for depths 1..maxDepth.
      ? this.runSingleDepthSearch(this.options.maxDepth, (depth, alpha, beta) => (
        this.searchRoot(state, legalMoves, depth, alpha, beta, openingContext, rootExactEndgame)
      )) ?? fallback
      : rootWldEndgame
        ? this.runSingleDepthSearch(this.options.maxDepth, (depth) => (
          this.searchWldRoot(state, legalMoves, depth, -WLD_RESULT_SCORE, WLD_RESULT_SCORE, openingContext)
        )) ?? fallback
        : this.runIterativeDeepening((depth, alpha, beta) => (
          this.searchRoot(state, legalMoves, depth, alpha, beta, openingContext, rootExactEndgame)
        )) ?? fallback;
    const chosen = chooseRandomBest(
      finalResult.analyzedMoves,
      this.options.searchRandomness ?? this.options.randomness ?? 0,
    ) ?? finalResult.analyzedMoves[0] ?? null;
    const selectedMove = chosen?.index ?? finalResult.bestMoveIndex;
    const selectedCoord = chosen?.coord ?? (
      selectedMove === null || selectedMove === undefined
        ? null
        : legalMoves.find((move) => move.index === selectedMove)?.coord ?? null
    );
    const selectedScore = Number.isFinite(chosen?.score) ? chosen.score : finalResult.score;
    const selectedPrincipalVariation = Array.isArray(chosen?.principalVariation) && chosen.principalVariation.length > 0
      ? [...chosen.principalVariation]
      : (selectedMove === null || selectedMove === undefined ? [] : [selectedMove]);
    const finalSearchCompletion = finalResult.searchCompletion ?? (finalResult === fallback ? 'heuristic-fallback' : 'complete');
    const finalWldOutcome = rootWldEndgame && finalSearchCompletion !== 'heuristic-fallback' && Number.isFinite(selectedScore)
      ? this.describeWldOutcome(selectedScore)
      : null;

    this.stats.elapsedMs = Math.round(now() - startedAt);
    return {
      ...finalResult,
      bestMoveIndex: selectedMove,
      bestMoveCoord: selectedCoord,
      score: selectedScore,
      principalVariation: selectedPrincipalVariation,
      stats: { ...this.stats },
      options: this.createResultOptionsSnapshot(),
      source: 'search',
      searchMode: rootSearchMode,
      searchCompletion: finalSearchCompletion,
      isExactResult: rootExactEndgame && finalSearchCompletion === 'complete',
      isWldResult: rootWldEndgame && finalSearchCompletion === 'complete',
      wldOutcome: finalWldOutcome,
      rootEmptyCount,
      exactThreshold: this.options.exactEndgameEmpties,
      ...(bookHit
        ? {
          bookHit: {
            ...this.describeBookHit(bookHit, selectedMove, false),
            ...(openingDirectDecision?.reason === 'prior-contradiction'
              ? { priorContradictionVeto: this.describeOpeningPriorContradiction(openingDirectDecision.contradiction) }
              : {}),
          },
        }
        : {}),
      ...(priorHit ? { openingPriorHit: this.describeOpeningPriorHit(priorHit, selectedMove, false) } : {}),
    };
  }

  searchRoot(state, rootMoves, depth, alpha, beta, openingContext = null, rootExactEndgame = false) {
    const alphaStart = alpha;
    const betaStart = beta;
    const ttEntry = this.lookupTransposition(state);
    const ttMoveIndex = this.selectTableMoveForOrdering(ttEntry, depth);

    let bestScore = -INFINITY;
    let bestMoveIndex = null;
    let bestPv = [];
    const analyzedMoves = [];

    const rootMoveSelectionInput = this.options.ttFirstInPlaceMoveExtraction !== false && Number.isInteger(ttMoveIndex)
      ? [...rootMoves]
      : rootMoves;
    const { preferredMove, remainingMoves } = this.pullPreferredMove(rootMoveSelectionInput, ttMoveIndex);
    if (preferredMove) {
      this.stats.ttFirstSearches += 1;
      const preferredOutcome = state.applyMoveFast(preferredMove.index, preferredMove.flips ?? null);
      if (preferredOutcome) {
        const preferredChild = this.negamax(preferredOutcome, depth - 1, -beta, -alpha, 1, rootExactEndgame);
        const preferredScore = -preferredChild.score;
        const preferredPrincipalVariation = [preferredMove.index, ...preferredChild.principalVariation];
        analyzedMoves.push({
          index: preferredMove.index,
          coord: preferredMove.coord,
          score: preferredScore,
          principalVariation: preferredPrincipalVariation,
          flipCount: preferredMove.flipCount,
        });
        bestScore = preferredScore;
        bestMoveIndex = preferredMove.index;
        bestPv = preferredPrincipalVariation;
        this.storeRootProgressSnapshot(rootMoves, bestMoveIndex, bestScore, bestPv, analyzedMoves);
        alpha = Math.max(alpha, preferredScore);

        if (alpha >= beta) {
          this.stats.cutoffs += 1;
          this.stats.ttFirstCutoffs += 1;
          this.recordKiller(0, preferredMove.index);
          this.recordHistory(state.currentPlayer, preferredMove.index, depth);

          const flag = this.computeTableFlag(bestScore, alphaStart, betaStart);
          this.storeTransposition(state, {
            depth,
            value: bestScore,
            flag,
            bestMoveIndex,
          });

          return {
            bestMoveIndex,
            score: bestScore,
            principalVariation: bestPv,
            analyzedMoves,
            didPass: false,
            searchCompletion: 'complete',
            rootAnalyzedMoveCount: analyzedMoves.length,
            rootLegalMoveCount: rootMoves.length,
          };
        }
      }
    }

    const moves = this.orderMoves(state, remainingMoves, 0, depth, preferredMove ? null : ttMoveIndex, openingContext, rootExactEndgame ? 'exact' : 'general');

    for (let orderedMoveIndex = 0; orderedMoveIndex < moves.length; orderedMoveIndex += 1) {
      this.checkDeadline();
      const move = moves[orderedMoveIndex];
      const outcome = move.orderingOutcome ?? state.applyMoveFast(move.index, move.flips ?? null);
      if (!outcome) {
        continue;
      }

      let childResult;
      if (orderedMoveIndex === 0 && !preferredMove) {
        childResult = this.negamax(outcome, depth - 1, -beta, -alpha, 1, rootExactEndgame);
      } else {
        childResult = this.negamax(outcome, depth - 1, -alpha - 1, -alpha, 1, rootExactEndgame);
        if (-childResult.score > alpha && -childResult.score < beta) {
          childResult = this.negamax(outcome, depth - 1, -beta, -alpha, 1, rootExactEndgame);
        }
      }

      const score = -childResult.score;
      const principalVariation = [move.index, ...childResult.principalVariation];
      analyzedMoves.push({
        index: move.index,
        coord: move.coord,
        score,
        principalVariation,
        flipCount: move.flipCount,
      });

      if (score > bestScore) {
        bestScore = score;
        bestMoveIndex = move.index;
        bestPv = principalVariation;
      }

      this.storeRootProgressSnapshot(rootMoves, bestMoveIndex, bestScore, bestPv, analyzedMoves);

      if (score > alpha) {
        alpha = score;
      }

      if (alpha >= beta) {
        this.stats.cutoffs += 1;
        this.recordKiller(0, move.index);
        this.recordHistory(state.currentPlayer, move.index, depth);
        break;
      }
    }

    analyzedMoves.sort((left, right) => right.score - left.score);
    const flag = this.computeTableFlag(bestScore, alphaStart, betaStart);
    this.storeTransposition(state, {
      depth,
      value: bestScore,
      flag,
      bestMoveIndex,
    });

    return {
      bestMoveIndex,
      score: bestScore,
      principalVariation: bestPv,
      analyzedMoves,
      didPass: false,
      searchCompletion: 'complete',
      rootAnalyzedMoveCount: analyzedMoves.length,
      rootLegalMoveCount: rootMoves.length,
    };
  }

  searchWldRoot(state, rootMoves, depth, alpha, beta, openingContext = null) {
    const alphaStart = alpha;
    const betaStart = beta;
    const tableDepth = state.getEmptyCount() + 1;
    const orderingDepth = Math.max(depth, tableDepth);
    const ttEntry = this.lookupTransposition(state);
    const ttMoveIndex = this.selectTableMoveForOrdering(ttEntry, tableDepth);

    let bestScore = -INFINITY;
    let bestMoveIndex = null;
    let bestPv = [];
    const analyzedMoves = [];

    const rootMoveSelectionInput = this.options.ttFirstInPlaceMoveExtraction !== false && Number.isInteger(ttMoveIndex)
      ? [...rootMoves]
      : rootMoves;
    const { preferredMove, remainingMoves } = this.pullPreferredMove(rootMoveSelectionInput, ttMoveIndex);
    if (preferredMove) {
      this.stats.ttFirstSearches += 1;
      const preferredOutcome = state.applyMoveFast(preferredMove.index, preferredMove.flips ?? null);
      if (preferredOutcome) {
        const preferredChild = this.wldNegamax(preferredOutcome, -beta, -alpha, 1);
        const preferredScore = -preferredChild.score;
        const preferredPrincipalVariation = [preferredMove.index, ...preferredChild.principalVariation];
        analyzedMoves.push({
          index: preferredMove.index,
          coord: preferredMove.coord,
          score: preferredScore,
          principalVariation: preferredPrincipalVariation,
          flipCount: preferredMove.flipCount,
        });
        bestScore = preferredScore;
        bestMoveIndex = preferredMove.index;
        bestPv = preferredPrincipalVariation;
        this.storeRootProgressSnapshot(rootMoves, bestMoveIndex, bestScore, bestPv, analyzedMoves);
        alpha = Math.max(alpha, preferredScore);

        if (alpha >= beta) {
          this.stats.cutoffs += 1;
          this.stats.ttFirstCutoffs += 1;
          this.recordKiller(0, preferredMove.index);
          this.recordHistory(state.currentPlayer, preferredMove.index, orderingDepth);

          const flag = this.computeTableFlag(bestScore, alphaStart, betaStart);
          this.storeTransposition(state, {
            depth: tableDepth,
            value: bestScore,
            flag,
            bestMoveIndex,
          });

          return {
            bestMoveIndex,
            score: bestScore,
            principalVariation: bestPv,
            analyzedMoves,
            didPass: false,
            searchCompletion: 'complete',
            rootAnalyzedMoveCount: analyzedMoves.length,
            rootLegalMoveCount: rootMoves.length,
          };
        }
      }
    }

    const moves = this.orderMoves(state, remainingMoves, 0, orderingDepth, preferredMove ? null : ttMoveIndex, openingContext, 'wld');

    for (let orderedMoveIndex = 0; orderedMoveIndex < moves.length; orderedMoveIndex += 1) {
      this.checkDeadline();
      const move = moves[orderedMoveIndex];
      const outcome = move.orderingOutcome ?? state.applyMoveFast(move.index, move.flips ?? null);
      if (!outcome) {
        continue;
      }

      let childResult;
      if (orderedMoveIndex === 0 && !preferredMove) {
        childResult = this.wldNegamax(outcome, -beta, -alpha, 1);
      } else {
        childResult = this.wldNegamax(outcome, -alpha - 1, -alpha, 1);
        if (-childResult.score > alpha && -childResult.score < beta) {
          childResult = this.wldNegamax(outcome, -beta, -alpha, 1);
        }
      }

      const score = -childResult.score;
      const principalVariation = [move.index, ...childResult.principalVariation];
      analyzedMoves.push({
        index: move.index,
        coord: move.coord,
        score,
        principalVariation,
        flipCount: move.flipCount,
      });

      if (score > bestScore) {
        bestScore = score;
        bestMoveIndex = move.index;
        bestPv = principalVariation;
      }

      this.storeRootProgressSnapshot(rootMoves, bestMoveIndex, bestScore, bestPv, analyzedMoves);

      if (score > alpha) {
        alpha = score;
      }

      if (alpha >= beta) {
        this.stats.cutoffs += 1;
        this.recordKiller(0, move.index);
        this.recordHistory(state.currentPlayer, move.index, orderingDepth);
        break;
      }
    }

    analyzedMoves.sort((left, right) => right.score - left.score);
    const flag = this.computeTableFlag(bestScore, alphaStart, betaStart);
    this.storeTransposition(state, {
      depth: tableDepth,
      value: bestScore,
      flag,
      bestMoveIndex,
    });

    return {
      bestMoveIndex,
      score: bestScore,
      principalVariation: bestPv,
      analyzedMoves,
      didPass: false,
      searchCompletion: 'complete',
      rootAnalyzedMoveCount: analyzedMoves.length,
      rootLegalMoveCount: rootMoves.length,
    };
  }

  wldNegamax(state, alpha, beta, ply) {
    this.checkDeadline();
    this.stats.nodes += 1;
    this.stats.wldNodes += 1;

    const empties = state.getEmptyCount();
    const tableDepth = empties + 1;
    const alphaStart = alpha;
    const betaStart = beta;

    const ttEntry = this.lookupTransposition(state);
    if (ttEntry && ttEntry.depth >= tableDepth) {
      this.stats.ttHits += 1;
      this.stats.wldTtHits += 1;
      const ttScore = this.normalizeWldScore(ttEntry.value);
      if (ttEntry.flag === 'exact') {
        return {
          score: ttScore,
          principalVariation: ttEntry.bestMoveIndex === null ? [] : [ttEntry.bestMoveIndex],
        };
      }
      if (ttEntry.flag === 'lower') {
        alpha = Math.max(alpha, ttScore);
      } else if (ttEntry.flag === 'upper') {
        beta = Math.min(beta, ttScore);
      }
      if (alpha >= beta) {
        return {
          score: ttScore,
          principalVariation: ttEntry.bestMoveIndex === null ? [] : [ttEntry.bestMoveIndex],
        };
      }
    }

    if (empties <= SMALL_EXACT_SOLVER_EMPTIES) {
      const score = this.solveSmallWld(state);
      const flag = this.computeTableFlag(score, alphaStart, betaStart);
      this.storeTransposition(state, {
        depth: tableDepth,
        value: score,
        flag,
        bestMoveIndex: null,
      });
      return {
        score,
        principalVariation: [],
      };
    }

    const legalMoves = state.getSearchMoves();
    if (legalMoves.length === 0) {
      const { player, opponent } = state.getPlayerBoards();
      if (legalMovesBitboard(opponent, player) === 0n) {
        const score = this.wldTerminalScoreFromBoards(player, opponent);
        const flag = this.computeTableFlag(score, alphaStart, betaStart);
        this.storeTransposition(state, {
          depth: tableDepth,
          value: score,
          flag,
          bestMoveIndex: null,
        });
        return {
          score,
          principalVariation: [],
        };
      }

      const passed = state.passTurnFast();
      const childResult = this.wldNegamax(passed, -beta, -alpha, ply + 1);
      const score = -childResult.score;
      const flag = this.computeTableFlag(score, alphaStart, betaStart);
      this.storeTransposition(state, {
        depth: tableDepth,
        value: score,
        flag,
        bestMoveIndex: null,
      });
      return {
        score,
        principalVariation: childResult.principalVariation,
      };
    }

    const ttMoveIndex = this.selectTableMoveForOrdering(ttEntry, tableDepth);
    let bestScore = -INFINITY;
    let bestMoveIndex = null;
    let bestPv = [];

    let candidateMoves = legalMoves;
    const etcResult = this.applyEnhancedTranspositionCutoff(
      state,
      legalMoves,
      tableDepth,
      alpha,
      beta,
      ply,
      true,
      'wld',
    );
    if (etcResult) {
      candidateMoves = etcResult.moves;
      alpha = etcResult.alpha;
      beta = etcResult.beta;
      if (etcResult.cutoff) {
        const etcFlag = this.computeTableFlag(etcResult.score, alphaStart, betaStart);
        this.storeTransposition(state, {
          depth: tableDepth,
          value: etcResult.score,
          flag: etcFlag,
          bestMoveIndex: etcResult.bestMoveIndex,
        });
        return {
          score: etcResult.score,
          principalVariation: Number.isInteger(etcResult.bestMoveIndex) ? [etcResult.bestMoveIndex] : [],
        };
      }
    }

    const { preferredMove, remainingMoves } = this.pullPreferredMove(candidateMoves, ttMoveIndex);
    if (preferredMove) {
      this.stats.ttFirstSearches += 1;
      const preferredOutcome = preferredMove.orderingOutcome ?? state.applyMoveFast(preferredMove.index, preferredMove.flips ?? null);
      if (preferredOutcome) {
        const preferredChild = this.wldNegamax(preferredOutcome, -beta, -alpha, ply + 1);
        bestScore = -preferredChild.score;
        bestMoveIndex = preferredMove.index;
        bestPv = [preferredMove.index, ...preferredChild.principalVariation];
        alpha = Math.max(alpha, bestScore);

        if (alpha >= beta) {
          this.stats.cutoffs += 1;
          this.stats.ttFirstCutoffs += 1;
          this.recordKiller(ply, preferredMove.index);
          this.recordHistory(state.currentPlayer, preferredMove.index, tableDepth);

          const preferredFlag = this.computeTableFlag(bestScore, alphaStart, betaStart);
          this.storeTransposition(state, {
            depth: tableDepth,
            value: bestScore,
            flag: preferredFlag,
            bestMoveIndex,
          });

          return {
            score: bestScore,
            principalVariation: bestPv,
          };
        }
      }
    }

    const orderedMoves = this.orderMoves(state, remainingMoves, ply, tableDepth, preferredMove ? null : ttMoveIndex, null, 'wld');

    for (let orderedMoveIndex = 0; orderedMoveIndex < orderedMoves.length; orderedMoveIndex += 1) {
      const move = orderedMoves[orderedMoveIndex];
      const outcome = move.orderingOutcome ?? state.applyMoveFast(move.index, move.flips ?? null);
      if (!outcome) {
        continue;
      }

      let childResult;
      let score;
      if (orderedMoveIndex === 0 && !preferredMove) {
        childResult = this.wldNegamax(outcome, -beta, -alpha, ply + 1);
        score = -childResult.score;
      } else {
        childResult = this.wldNegamax(outcome, -alpha - 1, -alpha, ply + 1);
        score = -childResult.score;
        if (score > alpha && score < beta) {
          childResult = this.wldNegamax(outcome, -beta, -alpha, ply + 1);
          score = -childResult.score;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMoveIndex = move.index;
        bestPv = [move.index, ...childResult.principalVariation];
      }

      if (score > alpha) {
        alpha = score;
      }

      if (alpha >= beta) {
        this.stats.cutoffs += 1;
        this.recordKiller(ply, move.index);
        this.recordHistory(state.currentPlayer, move.index, tableDepth);
        break;
      }
    }

    const flag = this.computeTableFlag(bestScore, alphaStart, betaStart);
    this.storeTransposition(state, {
      depth: tableDepth,
      value: bestScore,
      flag,
      bestMoveIndex,
    });

    return {
      score: bestScore,
      principalVariation: bestPv,
    };
  }

  negamax(state, depth, alpha, beta, ply, rootExactEndgame = false) {
    this.checkDeadline();
    this.stats.nodes += 1;

    const empties = state.getEmptyCount();
    // Propagate the root decision instead of re-triggering exact search mid-tree. This
    // keeps positions above the configured boundary depth-limited for the whole search.
    const exactEndgame = rootExactEndgame;
    const tableDepth = exactEndgame ? empties + 1 : Math.max(0, depth);
    const alphaStart = alpha;
    const betaStart = beta;

    const ttEntry = this.lookupTransposition(state);
    if (ttEntry && ttEntry.depth >= tableDepth) {
      this.stats.ttHits += 1;
      if (ttEntry.flag === 'exact') {
        return {
          score: ttEntry.value,
          principalVariation: ttEntry.bestMoveIndex === null ? [] : [ttEntry.bestMoveIndex],
        };
      }
      if (ttEntry.flag === 'lower') {
        alpha = Math.max(alpha, ttEntry.value);
      } else if (ttEntry.flag === 'upper') {
        beta = Math.min(beta, ttEntry.value);
      }
      if (alpha >= beta) {
        return {
          score: ttEntry.value,
          principalVariation: ttEntry.bestMoveIndex === null ? [] : [ttEntry.bestMoveIndex],
        };
      }
    }

    if (exactEndgame && empties <= SMALL_EXACT_SOLVER_EMPTIES) {
      const score = this.solveSmallExact(state, alpha, beta);
      const flag = this.computeTableFlag(score, alphaStart, betaStart);
      this.storeTransposition(state, {
        depth: tableDepth,
        value: score,
        flag,
        bestMoveIndex: null,
      });
      return {
        score,
        principalVariation: [],
      };
    }

    const legalMoves = state.getSearchMoves();
    if (legalMoves.length === 0) {
      const { player, opponent } = state.getPlayerBoards();
      if (legalMovesBitboard(opponent, player) === 0n) {
        const score = this.exactTerminalScoreFromBoards(player, opponent);
        this.storeTransposition(state, {
          depth: tableDepth,
          value: score,
          flag: 'exact',
          bestMoveIndex: null,
        });
        return {
          score,
          principalVariation: [],
        };
      }

      const passed = state.passTurnFast();
      const childResult = this.negamax(passed, Math.max(0, depth - 1), -beta, -alpha, ply + 1, rootExactEndgame);
      const score = -childResult.score;
      const flag = this.computeTableFlag(score, alphaStart, betaStart);
      this.storeTransposition(state, {
        depth: tableDepth,
        value: score,
        flag,
        bestMoveIndex: null,
      });
      return {
        score,
        principalVariation: childResult.principalVariation,
      };
    }

    if (depth <= 0 && !exactEndgame) {
      return {
        score: this.evaluator.evaluate(state),
        principalVariation: [],
      };
    }

    const mpcCut = this.tryMpcCut(state, depth, alpha, beta, ply, exactEndgame);
    if (mpcCut) {
      this.storeTransposition(state, {
        depth: tableDepth,
        value: mpcCut.score,
        flag: mpcCut.flag ?? this.computeTableFlag(mpcCut.score, alphaStart, betaStart),
        bestMoveIndex: null,
      });
      return {
        score: mpcCut.score,
        principalVariation: [],
      };
    }

    const ttMoveIndex = this.selectTableMoveForOrdering(ttEntry, tableDepth);
    let bestScore = -INFINITY;
    let bestMoveIndex = null;
    let bestPv = [];

    let candidateMoves = legalMoves;
    const etcResult = this.applyEnhancedTranspositionCutoff(
      state,
      legalMoves,
      depth,
      alpha,
      beta,
      ply,
      exactEndgame,
      'exact',
    );
    if (etcResult) {
      candidateMoves = etcResult.moves;
      alpha = etcResult.alpha;
      beta = etcResult.beta;
      if (etcResult.cutoff) {
        const etcFlag = this.computeTableFlag(etcResult.score, alphaStart, betaStart);
        this.storeTransposition(state, {
          depth: tableDepth,
          value: etcResult.score,
          flag: etcFlag,
          bestMoveIndex: etcResult.bestMoveIndex,
        });
        return {
          score: etcResult.score,
          principalVariation: Number.isInteger(etcResult.bestMoveIndex) ? [etcResult.bestMoveIndex] : [],
        };
      }
    }

    const { preferredMove, remainingMoves } = this.pullPreferredMove(candidateMoves, ttMoveIndex);
    if (preferredMove) {
      this.stats.ttFirstSearches += 1;
      const preferredOutcome = preferredMove.orderingOutcome ?? state.applyMoveFast(preferredMove.index, preferredMove.flips ?? null);
      if (preferredOutcome) {
        const preferredChild = this.negamax(preferredOutcome, depth - 1, -beta, -alpha, ply + 1, rootExactEndgame);
        bestScore = -preferredChild.score;
        bestMoveIndex = preferredMove.index;
        bestPv = [preferredMove.index, ...preferredChild.principalVariation];
        alpha = Math.max(alpha, bestScore);

        if (alpha >= beta) {
          this.stats.cutoffs += 1;
          this.stats.ttFirstCutoffs += 1;
          this.recordKiller(ply, preferredMove.index);
          this.recordHistory(state.currentPlayer, preferredMove.index, depth);

          const preferredFlag = this.computeTableFlag(bestScore, alphaStart, betaStart);
          this.storeTransposition(state, {
            depth: tableDepth,
            value: bestScore,
            flag: preferredFlag,
            bestMoveIndex,
          });

          return {
            score: bestScore,
            principalVariation: bestPv,
          };
        }
      }
    }

    const orderedMoves = this.orderMoves(state, remainingMoves, ply, depth, preferredMove ? null : ttMoveIndex, null, exactEndgame ? 'exact' : 'general');

    for (let orderedMoveIndex = 0; orderedMoveIndex < orderedMoves.length; orderedMoveIndex += 1) {
      const move = orderedMoves[orderedMoveIndex];
      const outcome = move.orderingOutcome ?? state.applyMoveFast(move.index, move.flips ?? null);
      if (!outcome) {
        continue;
      }

      let childResult;
      let score;
      if (orderedMoveIndex === 0 && !preferredMove) {
        childResult = this.negamax(outcome, depth - 1, -beta, -alpha, ply + 1, rootExactEndgame);
        score = -childResult.score;
      } else if (this.shouldApplyLateMoveReduction(state, move, ply, depth, orderedMoveIndex, exactEndgame)) {
        const reduction = this.lateMoveReduction(depth, orderedMoveIndex);
        this.stats.lmrReductions += 1;
        childResult = this.negamax(outcome, Math.max(0, depth - 1 - reduction), -alpha - 1, -alpha, ply + 1, rootExactEndgame);
        score = -childResult.score;

        if (score > alpha) {
          this.stats.lmrReSearches += 1;
          childResult = this.negamax(outcome, depth - 1, -alpha - 1, -alpha, ply + 1, rootExactEndgame);
          score = -childResult.score;
          if (score > alpha && score < beta) {
            this.stats.lmrFullReSearches += 1;
            childResult = this.negamax(outcome, depth - 1, -beta, -alpha, ply + 1, rootExactEndgame);
            score = -childResult.score;
          }
        }
      } else {
        childResult = this.negamax(outcome, depth - 1, -alpha - 1, -alpha, ply + 1, rootExactEndgame);
        score = -childResult.score;
        if (score > alpha && score < beta) {
          childResult = this.negamax(outcome, depth - 1, -beta, -alpha, ply + 1, rootExactEndgame);
          score = -childResult.score;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMoveIndex = move.index;
        bestPv = [move.index, ...childResult.principalVariation];
      }

      if (score > alpha) {
        alpha = score;
      }

      if (alpha >= beta) {
        this.stats.cutoffs += 1;
        this.recordKiller(ply, move.index);
        this.recordHistory(state.currentPlayer, move.index, depth);
        break;
      }
    }

    const flag = this.computeTableFlag(bestScore, alphaStart, betaStart);
    this.storeTransposition(state, {
      depth: tableDepth,
      value: bestScore,
      flag,
      bestMoveIndex,
    });

    return {
      score: bestScore,
      principalVariation: bestPv,
    };
  }

  computeTableFlag(score, alphaStart, betaStart) {
    if (score <= alphaStart) {
      return 'upper';
    }
    if (score >= betaStart) {
      return 'lower';
    }
    return 'exact';
  }

  lookupTransposition(state) {
    return this.transpositionTable.get(state.hashKey()) ?? null;
  }

  selectTableMoveForOrdering(ttEntry, requestedDepth) {
    if (!ttEntry || !Number.isInteger(ttEntry.bestMoveIndex)) {
      return null;
    }
    if (ttEntry.flag === 'exact') {
      return ttEntry.bestMoveIndex;
    }
    if (requestedDepth <= 2) {
      return ttEntry.bestMoveIndex;
    }

    const minimumDepth = Math.max(2, requestedDepth - 2);
    return ttEntry.depth >= minimumDepth ? ttEntry.bestMoveIndex : null;
  }

  storeTransposition(state, entry) {
    const key = state.hashKey();
    const nextEntry = {
      ...entry,
      generation: this.searchGeneration,
    };
    const existing = this.transpositionTable.get(key);
    if (shouldKeepExistingTableEntry(existing, nextEntry)) {
      return;
    }

    if (existing) {
      this.transpositionTable.delete(key);
    }

    if (this.transpositionTable.size >= this.options.maxTableEntries) {
      this.trimTranspositionTable();
    }

    this.transpositionTable.set(key, nextEntry);
    this.stats.ttStores += 1;
  }

  recordKiller(ply, moveIndex) {
    if (!Number.isInteger(moveIndex)) {
      return;
    }

    if (!this.killerMoves[ply]) {
      this.killerMoves[ply] = [moveIndex, null];
      return;
    }

    if (this.killerMoves[ply][0] === moveIndex) {
      return;
    }

    this.killerMoves[ply][1] = this.killerMoves[ply][0];
    this.killerMoves[ply][0] = moveIndex;
  }

  recordHistory(color, moveIndex, depth) {
    if (!Number.isInteger(moveIndex)) {
      return;
    }
    const bucket = this.historyHeuristic[colorIndex(color)];
    bucket[moveIndex] += depth * depth;
    if (bucket[moveIndex] > 2_000_000) {
      for (let index = 0; index < bucket.length; index += 1) {
        bucket[index] = Math.floor(bucket[index] / 2);
      }
    }
  }

  shouldPrecomputeOrderingOutcome(empties, ply) {
    return ply <= 1 || empties <= ORDERING_PROBE_EMPTIES;
  }

  shouldApplyEnhancedTranspositionCutoff(state, legalMoves, depthRemaining, ply, exactEndgame, bucket = 'exact') {
    if (!this.isEnhancedTranspositionCutoffEnabled(bucket)) {
      return false;
    }
    if (!Array.isArray(legalMoves) || legalMoves.length < 2) {
      return false;
    }
    if (this.transpositionTable.size === 0) {
      return false;
    }

    const empties = state.getEmptyCount();
    if (!this.shouldPrecomputeOrderingOutcome(empties, ply)) {
      return false;
    }

    return exactEndgame || depthRemaining >= ETC_MIN_DEPTH;
  }

  requiredChildTranspositionDepth(parentEmptyCount, depthRemaining, exactEndgame) {
    return exactEndgame
      ? parentEmptyCount
      : Math.max(0, depthRemaining - 1);
  }

  applyEnhancedTranspositionCutoff(state, legalMoves, depthRemaining, alpha, beta, ply, exactEndgame, bucket = 'exact') {
    if (!this.shouldApplyEnhancedTranspositionCutoff(state, legalMoves, depthRemaining, ply, exactEndgame, bucket)) {
      return null;
    }

    this.recordEtcActivity(bucket, 'Nodes');

    const parentEmptyCount = state.getEmptyCount();
    const requiredDepth = this.requiredChildTranspositionDepth(parentEmptyCount, depthRemaining, exactEndgame);
    const alphaStart = alpha;
    const betaStart = beta;
    const reusePreparedMoves = this.options.etcInPlaceMovePreparation !== false;
    const preparedMoves = reusePreparedMoves
      ? legalMoves
      : legalMoves.map((move) => ({ ...move }));
    let parentLowerBound = null;
    let parentUpperBound = null;
    let lowerBoundMoveIndex = null;
    // A parent lower-bound is valid as soon as one child provides a proven upper/exact value.
    // A parent upper-bound from child lower/exact values is only safe if every legal child
    // contributes such a bound; otherwise an unknown child could still exceed it.
    let allMovesProvideUpperBound = true;

    for (const move of preparedMoves) {
      const outcome = move.orderingOutcome ?? state.applyMoveFast(move.index, move.flips ?? null);
      if (!outcome) {
        allMovesProvideUpperBound = false;
        continue;
      }

      move.orderingOutcome = outcome;
      const preparedChildTableEntry = this.getPreparedChildTableEntryForOrdering(move);
      const childTableEntry = preparedChildTableEntry !== undefined
        ? preparedChildTableEntry
        : this.lookupTransposition(outcome);
      if (preparedChildTableEntry === undefined) {
        this.cachePreparedChildTableEntryForOrdering(move, childTableEntry);
      }
      if (childTableEntry) {
        if (!reusePreparedMoves) {
          move.childTableEntry = childTableEntry;
        }
        this.recordEtcActivity(bucket, 'ChildTableHits');
      }
      if (!childTableEntry || childTableEntry.depth < requiredDepth) {
        allMovesProvideUpperBound = false;
        continue;
      }

      this.recordEtcActivity(bucket, 'QualifiedBounds');

      if (childTableEntry.flag === 'exact' || childTableEntry.flag === 'upper') {
        const candidateLowerBound = -childTableEntry.value;
        if (parentLowerBound === null || candidateLowerBound > parentLowerBound) {
          parentLowerBound = candidateLowerBound;
          lowerBoundMoveIndex = move.index;
        }
      }

      if (childTableEntry.flag === 'exact' || childTableEntry.flag === 'lower') {
        const candidateUpperBound = -childTableEntry.value;
        if (parentUpperBound === null || candidateUpperBound > parentUpperBound) {
          parentUpperBound = candidateUpperBound;
        }
      } else {
        allMovesProvideUpperBound = false;
      }

      if (parentLowerBound !== null) {
        alpha = Math.max(alpha, parentLowerBound);
      }

      if (parentLowerBound !== null && parentLowerBound >= betaStart) {
        if (alpha !== alphaStart) {
          this.recordEtcActivity(bucket, 'Narrowings');
        }
        this.recordEtcActivity(bucket, 'Cutoffs');
        this.stats.cutoffs += 1;
        return {
          alpha,
          beta,
          moves: preparedMoves,
          cutoff: true,
          score: parentLowerBound,
          bestMoveIndex: lowerBoundMoveIndex,
        };
      }
    }

    if (allMovesProvideUpperBound && parentUpperBound !== null) {
      beta = Math.min(beta, parentUpperBound);
      if (parentUpperBound <= alphaStart) {
        if (alpha !== alphaStart || beta !== betaStart) {
          this.recordEtcActivity(bucket, 'Narrowings');
        }
        this.recordEtcActivity(bucket, 'Cutoffs');
        this.stats.cutoffs += 1;
        return {
          alpha,
          beta,
          moves: preparedMoves,
          cutoff: true,
          score: parentUpperBound,
          bestMoveIndex: null,
        };
      }
    }

    if (alpha !== alphaStart || beta !== betaStart) {
      this.recordEtcActivity(bucket, 'Narrowings');
    }

    return {
      alpha,
      beta,
      moves: preparedMoves,
      cutoff: false,
      score: null,
      bestMoveIndex: null,
    };
  }

  shouldApplyLateMoveReduction(state, move, ply, depthRemaining, moveListIndex, exactEndgame) {
    if (exactEndgame) {
      return false;
    }
    if (ply < 1 || depthRemaining < LMR_MIN_DEPTH || moveListIndex < LMR_MIN_MOVE_INDEX) {
      return false;
    }
    if (state.getEmptyCount() <= Math.max(LMR_MIN_EMPTIES, (this.options.exactEndgameEmpties ?? 0) + 2)) {
      return false;
    }
    if (CORNER_INDEX_SET.has(move.index)) {
      return false;
    }
    if (this.killerMoves[ply]?.[0] === move.index || this.killerMoves[ply]?.[1] === move.index) {
      return false;
    }
    return true;
  }

  lateMoveReduction(depthRemaining, moveListIndex) {
    let reduction = 1;

    if (depthRemaining >= LMR_DEEP_REDUCTION_DEPTH && moveListIndex >= LMR_DEEP_REDUCTION_MOVE_INDEX) {
      reduction += 1;
    }

    return Math.min(reduction, Math.max(1, depthRemaining - 2));
  }

  shouldUseLightweightOrderingEvaluator(empties, depthRemaining) {
    if (depthRemaining <= 1) {
      return false;
    }
    return this.useLightweightOrderingEvaluatorByEmptyCount[
      clampTrackedEmptiesForOrdering(empties)
    ] === true;
  }

  selectLateOrderingProfile(empties) {
    // Once the node is already inside the exact window, generic midgame ordering
    // signals add more noise than value. Favor the trained late-ordering score and
    // tactical late-game constraints instead.
    return this.lateOrderingProfilesByEmptyCount[
      clampTrackedEmptiesForOrdering(empties)
    ] ?? GENERAL_LATE_ORDERING_PROFILE;
  }

  scoreLightweightOrderingEvaluation(state, perspectiveColor, empties, opponentMoveCount) {
    this.stats.orderingEvalCalls += 1;
    return this.moveOrderingEvaluator.evaluate(state, perspectiveColor, {
      empties,
      opponentMoveCount,
    });
  }

  scoreTranspositionForOrdering(entry, depthRemaining) {
    if (!entry || depthRemaining <= 1) {
      return 0;
    }

    const clampedValue = Math.max(-250_000, Math.min(250_000, -entry.value));
    const depthWeight = Math.max(1, Math.min(entry.depth, depthRemaining - 1));

    if (entry.flag === 'exact') {
      return (clampedValue * 8) + (depthWeight * 24_000) + 140_000;
    }
    if (entry.flag === 'upper') {
      return (clampedValue * 5) + (depthWeight * 12_000);
    }
    return (clampedValue * 3) + (depthWeight * 8_000);
  }

  getRegionParityOrderingBonus(moveIndex, empties, parityRegionInfo) {
    if (!parityRegionInfo || empties > REGION_PARITY_EMPTIES || parityRegionInfo.regionCount <= 1) {
      return 0;
    }

    const regionSize = parityRegionInfo.regionSizeByIndex[moveIndex] ?? 0;
    if (regionSize <= 0) {
      return 0;
    }

    const baseBonus = empties <= 10 ? 140_000 : 90_000;
    const oddRegion = regionSize % 2 === 1;
    let bonus = oddRegion
      ? baseBonus
      : -Math.round(baseBonus * 0.45);

    if (oddRegion && regionSize <= 3) {
      bonus += Math.round(baseBonus * 0.2);
    }
    if (!oddRegion && regionSize <= 2) {
      bonus -= Math.round(baseBonus * 0.1);
    }
    if (oddRegion && parityRegionInfo.oddRegionCount > 0 && parityRegionInfo.evenRegionCount > 0) {
      bonus += Math.round(baseBonus * 0.12);
    }

    return bonus;
  }

  shouldUseExactFastestFirstOrdering(bucket, empties, depthRemaining) {
    return bucket === 'exact'
      && this.isExactFastestFirstOrderingEnabled()
      && depthRemaining > 0
      && empties >= EXACT_FASTEST_FIRST_MIN_EMPTIES;
  }

  orderExactFastestFirstMoves(moves) {
    if (!Array.isArray(moves) || moves.length <= 1) {
      return moves;
    }

    this.stats.fastestFirstExactSorts += 1;
    if (moves.some((move) => move.opponentMoveCount === 0)) {
      this.stats.fastestFirstExactPassCandidates += 1;
    }

    moves.sort((left, right) => {
      const leftReplyCount = Number.isFinite(left.opponentMoveCount)
        ? left.opponentMoveCount
        : Number.POSITIVE_INFINITY;
      const rightReplyCount = Number.isFinite(right.opponentMoveCount)
        ? right.opponentMoveCount
        : Number.POSITIVE_INFINITY;
      if (leftReplyCount !== rightReplyCount) {
        return leftReplyCount - rightReplyCount;
      }
      if (right.orderingScore !== left.orderingScore) {
        return right.orderingScore - left.orderingScore;
      }
      return left.index - right.index;
    });

    return moves;
  }

  orderMoves(state, moves, ply, depthRemaining, ttMoveIndex = null, openingContext = null, bucket = 'general') {
    const empties = state.getEmptyCount();
    const useExactFastestOrdering = this.shouldUseExactFastestFirstOrdering(bucket, empties, depthRemaining);
    const shouldPrecomputeOutcome = this.shouldPrecomputeOrderingOutcome(empties, ply) || useExactFastestOrdering;
    const lateOrderingProfile = this.selectLateOrderingProfile(empties);
    const orderingScoreTable = this.orderingScoreTableByEmptyCount[
      clampTrackedEmptiesForOrdering(empties)
    ];
    const useLightweightOrderingEvaluator = this.shouldUseLightweightOrderingEvaluator(empties, depthRemaining);
    const historyBucket = this.historyHeuristic[colorIndex(state.currentPlayer)];
    const killerMoves = this.killerMoves[ply] ?? null;
    const parityRegionInfo = empties <= REGION_PARITY_EMPTIES
      ? buildParityRegionInfo(state.getEmptyBitboard())
      : null;

    for (let moveIndex = 0; moveIndex < moves.length; moveIndex += 1) {
      const move = moves[moveIndex];
      const orderingOutcome = move.orderingOutcome ?? (
        shouldPrecomputeOutcome
          ? state.applyMoveFast(move.index, move.flips ?? null)
          : null
      );
      let childTableEntry = null;
      if (orderingOutcome) {
        const preparedChildTableEntry = this.getPreparedChildTableEntryForOrdering(move);
        if (preparedChildTableEntry !== undefined) {
          childTableEntry = preparedChildTableEntry;
          this.stats.etcPreparedChildTableReuseLookups += 1;
          if (childTableEntry) {
            this.stats.etcPreparedChildTableReuseHits += 1;
          }
        } else {
          childTableEntry = this.lookupTransposition(orderingOutcome);
          this.cachePreparedChildTableEntryForOrdering(move, childTableEntry);
        }
      }

      let opponentMoveCount = null;
      let opponentCornerReplies = null;
      if (orderingOutcome) {
        const childPlayer = orderingOutcome.currentPlayer === 'black'
          ? orderingOutcome.black
          : orderingOutcome.white;
        const childOpponent = orderingOutcome.currentPlayer === 'black'
          ? orderingOutcome.white
          : orderingOutcome.black;
        const opponentMovesBitboard = legalMovesBitboard(childPlayer, childOpponent);
        opponentMoveCount = popcount(opponentMovesBitboard);
        opponentCornerReplies = countCornerMoves(opponentMovesBitboard);
      }

      move.orderingOutcome = orderingOutcome;
      move.childTableEntry = childTableEntry;
      move.opponentMoveCount = opponentMoveCount;
      move.opponentCornerReplies = opponentCornerReplies;
      move.orderingScore = this.scoreMoveForOrdering(
        state,
        move,
        {
          ply,
          depthRemaining,
          ttMoveIndex,
          openingContext,
          empties,
          lateOrderingProfile,
          orderingScoreTable,
          useLightweightOrderingEvaluator,
          historyBucket,
          killerMoves,
          shouldInspectChild: shouldPrecomputeOutcome,
          orderingOutcome,
          childTableEntry,
          opponentMoveCount,
          opponentCornerReplies,
          parityRegionInfo,
        },
      );
    }

    if (useExactFastestOrdering) {
      return this.orderExactFastestFirstMoves(moves);
    }

    moves.sort((left, right) => right.orderingScore - left.orderingScore);
    return moves;
  }

  scoreMoveForOrdering(state, move, context) {
    const {
      ply,
      depthRemaining,
      ttMoveIndex,
      openingContext = null,
      empties,
      lateOrderingProfile,
      orderingScoreTable,
      useLightweightOrderingEvaluator,
      historyBucket,
      killerMoves,
      shouldInspectChild = false,
      orderingOutcome = null,
      childTableEntry = null,
      opponentMoveCount = null,
      opponentCornerReplies = null,
      parityRegionInfo = null,
    } = context;

    let score = 0;
    const killerPrimaryIndex = killerMoves?.[0] ?? null;
    const killerSecondaryIndex = killerMoves?.[1] ?? null;

    if (move.index === ttMoveIndex) {
      score += 10_000_000;
    }

    if (CORNER_INDEX_SET.has(move.index)) {
      score += 5_000_000;
    }

    const bookWeight = openingContext?.bookWeights?.get(move.index) ?? null;
    if (Number.isFinite(bookWeight)) {
      score += bookOrderingBonus(bookWeight);
    }

    const openingPriorCandidate = openingContext?.priorByMove?.get(move.index) ?? null;
    if (openingPriorCandidate) {
      score += openingPriorOrderingBonus(openingPriorCandidate, openingContext, this.openingTuning);
    }

    if (killerPrimaryIndex === move.index) {
      score += orderingScoreTable.killerPrimaryBonus;
    } else if (killerSecondaryIndex === move.index) {
      score += orderingScoreTable.killerSecondaryBonus;
    }

    score += Math.round((historyBucket?.[move.index] ?? 0) * orderingScoreTable.historyWeight);
    score += Math.round(POSITIONAL_WEIGHTS[move.index] * orderingScoreTable.positionalWeight);
    score += Math.round(move.flipCount * orderingScoreTable.flipWeight);

    const riskType = getPositionalRisk(move.index);
    if (riskType === 'x-square') {
      score -= orderingScoreTable.xSquarePenalty;
    } else if (riskType === 'c-square') {
      score -= orderingScoreTable.cSquarePenalty;
    }

    let outcome = orderingOutcome;
    const shouldInspectMoveChild = Boolean(outcome) || shouldInspectChild;

    if (shouldInspectMoveChild && !outcome) {
      outcome = state.applyMoveFast(move.index, move.flips ?? null);
    }

    if (outcome) {
      const childState = outcome;
      const resolvedChildTableEntry = childTableEntry ?? this.lookupTransposition(childState);
      score += this.scoreTranspositionForOrdering(resolvedChildTableEntry, depthRemaining);

      let resolvedOpponentMoveCount = opponentMoveCount;
      let resolvedOpponentCornerReplies = opponentCornerReplies;
      if (!Number.isFinite(resolvedOpponentMoveCount) || !Number.isFinite(resolvedOpponentCornerReplies)) {
        const childBoards = childState.getPlayerBoards();
        const opponentMovesBitboard = legalMovesBitboard(childBoards.player, childBoards.opponent);
        if (!Number.isFinite(resolvedOpponentMoveCount)) {
          resolvedOpponentMoveCount = popcount(opponentMovesBitboard);
        }
        if (!Number.isFinite(resolvedOpponentCornerReplies)) {
          resolvedOpponentCornerReplies = countCornerMoves(opponentMovesBitboard);
        }
      }

      score -= resolvedOpponentMoveCount * orderingScoreTable.mobilityPenaltyPerMove;

      if (resolvedOpponentCornerReplies > 0) {
        score -= resolvedOpponentCornerReplies * orderingScoreTable.cornerReplyPenaltyPerMove;
      }

      if (resolvedOpponentMoveCount === 0) {
        score += orderingScoreTable.passBonus;
      }

      if (empties <= REGION_PARITY_EMPTIES) {
        score += Math.round(
          this.getRegionParityOrderingBonus(move.index, empties, parityRegionInfo)
          * orderingScoreTable.parityScale,
        );
      }

      if (useLightweightOrderingEvaluator) {
        score += Math.round(
          this.scoreLightweightOrderingEvaluation(
            childState,
            state.currentPlayer,
            childState.getEmptyCount(),
            resolvedOpponentMoveCount,
          )
          * orderingScoreTable.lightweightEvalScale,
        );
      }
    }

    return score;
  }
}

export function createEngine(presetKey = DEFAULT_PRESET_KEY, customInputs = {}, styleKey = DEFAULT_STYLE_KEY) {
  const options = resolveEngineOptions(presetKey, customInputs, styleKey);
  return new SearchEngine(options);
}

export function listAvailablePresets() {
  return Object.entries(ENGINE_PRESETS).map(([key, preset]) => ({
    key,
    label: preset.label,
    description: preset.description,
  }));
}

export function listAvailableStyles() {
  return Object.entries(ENGINE_STYLE_PRESETS).map(([key, preset]) => ({
    key,
    label: preset.label,
    description: preset.description,
  }));
}
