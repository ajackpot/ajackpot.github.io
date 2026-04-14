import {
  ACTIVE_EVALUATION_PROFILE,
  DEFAULT_EVALUATION_FEATURE_KEYS,
  DEFAULT_EVALUATION_PHASE_BUCKET_SPECS,
  OPTIONAL_EVALUATION_FEATURE_KEYS,
  SUPPORTED_EVALUATION_FEATURE_KEYS,
  compileEvaluationProfile,
  makeTrainingProfileFromWeights,
} from '../../js/ai/evaluation-profiles.js';
import { buildProfileStageMetadata } from './lib.mjs';

const DEFAULT_LATE_PARITY_THRESHOLD = 19;
const DEFAULT_LATE_MOBILITY_THRESHOLD = 23;
const DEFAULT_STABILITY_THRESHOLD = 31;

function freezeObjectDeep(value) {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => freezeObjectDeep(entry)));
  }
  if (value && typeof value === 'object') {
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, freezeObjectDeep(entry)])));
  }
  return value;
}

function uniqueStringList(values) {
  const seen = new Set();
  const result = [];
  for (const rawValue of values) {
    const token = typeof rawValue === 'string' ? rawValue.trim() : '';
    if (!token || seen.has(token)) {
      continue;
    }
    seen.add(token);
    result.push(token);
  }
  return result;
}

function midpointForBucket(bucket) {
  return (Number(bucket.minEmpties ?? 0) + Number(bucket.maxEmpties ?? 0)) / 2;
}

function createBucketKey(prefix, index, totalCount) {
  const number = String(index + 1).padStart(String(totalCount).length, '0');
  return `${prefix}-${number}`;
}

export function buildBalancedPhaseBuckets(totalBucketCount, {
  keyPrefix = 'phase',
  lateBuckets = [
    { key: 'late-b', minEmpties: 7, maxEmpties: 12, label: '후반 2' },
    { key: 'endgame', minEmpties: 0, maxEmpties: 6, label: '끝내기' },
  ],
} = {}) {
  const normalizedTotal = Number(totalBucketCount);
  if (!Number.isInteger(normalizedTotal) || normalizedTotal < 3 || normalizedTotal > 24) {
    throw new Error(`Balanced phase bucket count must be an integer between 3 and 24. Received: ${totalBucketCount}`);
  }

  const preservedLateBuckets = lateBuckets.map((bucket) => ({
    key: String(bucket.key),
    minEmpties: Number(bucket.minEmpties),
    maxEmpties: Number(bucket.maxEmpties),
    ...(typeof bucket.label === 'string' && bucket.label.trim() !== '' ? { label: bucket.label } : {}),
  }));
  const earlyBucketCount = normalizedTotal - preservedLateBuckets.length;
  const earliestMinEmpties = preservedLateBuckets.reduce(
    (best, bucket) => Math.max(best, Number(bucket.maxEmpties ?? 0)),
    0,
  ) + 1;
  const earliestMaxEmpties = 60;
  const earlySpan = (earliestMaxEmpties - earliestMinEmpties) + 1;
  if (earlyBucketCount <= 0 || earlySpan <= 0) {
    throw new Error('Invalid balanced phase bucket configuration.');
  }

  const baseSize = Math.floor(earlySpan / earlyBucketCount);
  const remainder = earlySpan % earlyBucketCount;
  const sizes = Array.from({ length: earlyBucketCount }, (_, index) => baseSize + (index < remainder ? 1 : 0));
  const earlyBuckets = [];
  let currentMax = earliestMaxEmpties;

  for (let index = 0; index < earlyBucketCount; index += 1) {
    const size = sizes[index];
    const minEmpties = currentMax - size + 1;
    const maxEmpties = currentMax;
    earlyBuckets.push({
      key: createBucketKey(keyPrefix, index, earlyBucketCount),
      minEmpties,
      maxEmpties,
      label: `phase ${index + 1}`,
    });
    currentMax = minEmpties - 1;
  }

  return freezeObjectDeep([...earlyBuckets, ...preservedLateBuckets]);
}

export const EVALUATION_EXPANSION_BUCKET_FAMILIES = freezeObjectDeep({
  default8: DEFAULT_EVALUATION_PHASE_BUCKET_SPECS,
  balanced12: buildBalancedPhaseBuckets(12),
  balanced13: buildBalancedPhaseBuckets(13),
});

export const EVALUATION_EXPANSION_FEATURE_GROUPS = freezeObjectDeep({
  control: {
    key: 'control',
    description: 'No extra scalar features; only bucket layout / smoothing changes.',
    extraFeatureKeys: [],
    activationRules: {},
  },
  'late-parity-region': {
    key: 'late-parity-region',
    description: 'Late-game parity region decomposition features.',
    extraFeatureKeys: ['parityRegionCount', 'parityOddRegions', 'parityEvenRegions'],
    activationRules: {
      parityRegionCount: { maxBucketMinEmpties: DEFAULT_LATE_PARITY_THRESHOLD },
      parityOddRegions: { maxBucketMinEmpties: DEFAULT_LATE_PARITY_THRESHOLD },
      parityEvenRegions: { maxBucketMinEmpties: DEFAULT_LATE_PARITY_THRESHOLD },
    },
  },
  'late-mobility-corner-counts': {
    key: 'late-mobility-corner-counts',
    description: 'Late-game raw move count and corner move count features.',
    extraFeatureKeys: ['myMoveCount', 'opponentMoveCount', 'cornerMoveCount', 'opponentCornerMoveCount'],
    activationRules: {
      myMoveCount: { maxBucketMinEmpties: DEFAULT_LATE_MOBILITY_THRESHOLD },
      opponentMoveCount: { maxBucketMinEmpties: DEFAULT_LATE_MOBILITY_THRESHOLD },
      cornerMoveCount: { maxBucketMinEmpties: DEFAULT_LATE_MOBILITY_THRESHOLD },
      opponentCornerMoveCount: { maxBucketMinEmpties: DEFAULT_LATE_MOBILITY_THRESHOLD },
    },
  },
  'midlate-stability-counts': {
    key: 'midlate-stability-counts',
    description: 'Mid/late-game stable disc count features.',
    extraFeatureKeys: ['stableDiscs', 'opponentStableDiscs'],
    activationRules: {
      stableDiscs: { maxBucketMinEmpties: DEFAULT_STABILITY_THRESHOLD },
      opponentStableDiscs: { maxBucketMinEmpties: DEFAULT_STABILITY_THRESHOLD },
    },
  },
  'all-late-scalars': {
    key: 'all-late-scalars',
    description: 'Union of parity-region, move-count, and stable-disc count features.',
    extraFeatureKeys: [...OPTIONAL_EVALUATION_FEATURE_KEYS],
    activationRules: {
      parityRegionCount: { maxBucketMinEmpties: DEFAULT_LATE_PARITY_THRESHOLD },
      parityOddRegions: { maxBucketMinEmpties: DEFAULT_LATE_PARITY_THRESHOLD },
      parityEvenRegions: { maxBucketMinEmpties: DEFAULT_LATE_PARITY_THRESHOLD },
      myMoveCount: { maxBucketMinEmpties: DEFAULT_LATE_MOBILITY_THRESHOLD },
      opponentMoveCount: { maxBucketMinEmpties: DEFAULT_LATE_MOBILITY_THRESHOLD },
      cornerMoveCount: { maxBucketMinEmpties: DEFAULT_LATE_MOBILITY_THRESHOLD },
      opponentCornerMoveCount: { maxBucketMinEmpties: DEFAULT_LATE_MOBILITY_THRESHOLD },
      stableDiscs: { maxBucketMinEmpties: DEFAULT_STABILITY_THRESHOLD },
      opponentStableDiscs: { maxBucketMinEmpties: DEFAULT_STABILITY_THRESHOLD },
    },
  },
});

export const DEFAULT_EVALUATION_EXPANSION_CANDIDATES = freezeObjectDeep([
  { key: 'default8-control-hard', bucketFamily: 'default8', featureFamily: 'control', smoothing: 'hard' },
  { key: 'balanced12-control-hard', bucketFamily: 'balanced12', featureFamily: 'control', smoothing: 'hard' },
  { key: 'balanced13-control-hard', bucketFamily: 'balanced13', featureFamily: 'control', smoothing: 'hard' },
  { key: 'balanced12-control-smoothed', bucketFamily: 'balanced12', featureFamily: 'control', smoothing: 'smoothed' },
  { key: 'balanced13-control-smoothed', bucketFamily: 'balanced13', featureFamily: 'control', smoothing: 'smoothed' },
  { key: 'default8-late-parity-hard', bucketFamily: 'default8', featureFamily: 'late-parity-region', smoothing: 'hard' },
  { key: 'default8-late-mobilitycorner-hard', bucketFamily: 'default8', featureFamily: 'late-mobility-corner-counts', smoothing: 'hard' },
  { key: 'default8-midlate-stability-hard', bucketFamily: 'default8', featureFamily: 'midlate-stability-counts', smoothing: 'hard' },
  { key: 'default8-alllate-hard', bucketFamily: 'default8', featureFamily: 'all-late-scalars', smoothing: 'hard' },
  { key: 'balanced12-alllate-hard', bucketFamily: 'balanced12', featureFamily: 'all-late-scalars', smoothing: 'hard' },
  { key: 'balanced13-alllate-hard', bucketFamily: 'balanced13', featureFamily: 'all-late-scalars', smoothing: 'hard' },
  { key: 'balanced12-alllate-smoothed', bucketFamily: 'balanced12', featureFamily: 'all-late-scalars', smoothing: 'smoothed' },
  { key: 'balanced13-alllate-smoothed', bucketFamily: 'balanced13', featureFamily: 'all-late-scalars', smoothing: 'smoothed' },
]);

export const DEFAULT_EVALUATION_EXPANSION_PATCH_TEMPLATES = freezeObjectDeep([
  {
    keySuffix: 'extras-090',
    nameSuffix: 'extras 0.90x',
    featureScales: { allOptional: 0.9 },
  },
  {
    keySuffix: 'extras-075',
    nameSuffix: 'extras 0.75x',
    featureScales: { allOptional: 0.75 },
  },
  {
    keySuffix: 'parity-090',
    nameSuffix: 'parity extras 0.90x',
    featureScales: {
      parityRegionCount: 0.9,
      parityOddRegions: 0.9,
      parityEvenRegions: 0.9,
    },
  },
  {
    keySuffix: 'stability-090',
    nameSuffix: 'stability extras 0.90x',
    featureScales: {
      stableDiscs: 0.9,
      opponentStableDiscs: 0.9,
    },
  },
  {
    keySuffix: 'lateblend-010',
    nameSuffix: 'late baseline blend 0.10',
    baselineBlend: {
      activateWhenMinEmptiesAtMost: 23,
      scale: 0.1,
    },
  },
  {
    keySuffix: 'interp-off',
    nameSuffix: 'interpolation off',
    setInterpolation: 'off',
  },
]);

export function resolveEvaluationExpansionPhaseBuckets(bucketSource) {
  if (!bucketSource) {
    return EVALUATION_EXPANSION_BUCKET_FAMILIES.default8;
  }
  if (typeof bucketSource === 'string') {
    const family = EVALUATION_EXPANSION_BUCKET_FAMILIES[bucketSource];
    if (!family) {
      throw new Error(`Unknown evaluation expansion bucket family: ${bucketSource}`);
    }
    return family;
  }
  if (Array.isArray(bucketSource) && bucketSource.length > 0) {
    return freezeObjectDeep(bucketSource.map((bucket, index) => ({
      key: typeof bucket?.key === 'string' && bucket.key.trim() !== '' ? bucket.key.trim() : createBucketKey('phase', index, bucketSource.length),
      minEmpties: Number(bucket?.minEmpties),
      maxEmpties: Number(bucket?.maxEmpties),
      ...(typeof bucket?.label === 'string' && bucket.label.trim() !== '' ? { label: bucket.label.trim() } : {}),
    })));
  }
  throw new Error('Phase bucket source must be a known family key or a non-empty array of bucket specs.');
}

export function resolveEvaluationExpansionFeatureFamily(familyKey) {
  if (!familyKey) {
    return EVALUATION_EXPANSION_FEATURE_GROUPS.control;
  }
  const family = EVALUATION_EXPANSION_FEATURE_GROUPS[familyKey];
  if (!family) {
    throw new Error(`Unknown evaluation expansion feature family: ${familyKey}`);
  }
  return family;
}

export function expandFeatureScaleAliases(featureScaleMap = {}, featureKeys = null) {
  const allowedKeys = new Set(featureKeys ?? SUPPORTED_EVALUATION_FEATURE_KEYS);
  const expanded = {};
  for (const [rawKey, rawScale] of Object.entries(featureScaleMap ?? {})) {
    const key = String(rawKey).trim();
    const scale = Number(rawScale);
    if (!Number.isFinite(scale) || scale < 0) {
      throw new Error(`Feature scale must be a non-negative finite number: ${rawKey}=${rawScale}`);
    }
    if (key === 'allOptional') {
      for (const optionalKey of OPTIONAL_EVALUATION_FEATURE_KEYS) {
        if (allowedKeys.has(optionalKey)) {
          expanded[optionalKey] = scale;
        }
      }
      continue;
    }
    if (key === 'allExtras') {
      for (const optionalKey of OPTIONAL_EVALUATION_FEATURE_KEYS) {
        if (allowedKeys.has(optionalKey)) {
          expanded[optionalKey] = scale;
        }
      }
      continue;
    }
    if (!allowedKeys.has(key)) {
      throw new Error(`Unsupported feature scale key: ${key}`);
    }
    expanded[key] = scale;
  }
  return expanded;
}

export function normalizeCandidateFeatureKeys(baseFeatureKeys, extraFeatureKeys = []) {
  const resolvedBase = Array.isArray(baseFeatureKeys) && baseFeatureKeys.length > 0
    ? baseFeatureKeys
    : DEFAULT_EVALUATION_FEATURE_KEYS;
  const combined = uniqueStringList([...resolvedBase, ...extraFeatureKeys]);
  for (const key of combined) {
    if (!SUPPORTED_EVALUATION_FEATURE_KEYS.includes(key)) {
      throw new Error(`Unsupported evaluation feature key requested for expansion candidate: ${key}`);
    }
  }
  return Object.freeze(combined);
}

export function normalizeInterpolationSetting(value, smoothing = 'hard') {
  if (value === undefined) {
    return smoothing === 'smoothed'
      ? Object.freeze({ enabled: true, mode: 'linear-adjacent-midpoint' })
      : null;
  }
  if (!value || value === 'off' || value === 'none' || value === 'disabled') {
    return null;
  }
  return Object.freeze({ enabled: true, mode: 'linear-adjacent-midpoint' });
}

export function normalizeSampleAssignmentMode(value, smoothing = 'hard') {
  if (typeof value === 'string' && value.trim() !== '') {
    const normalized = value.trim().toLowerCase();
    if (['hard', 'bucket', 'discrete'].includes(normalized)) {
      return 'hard';
    }
    if (['linear', 'linear-adjacent', 'linear-adjacent-midpoint', 'smoothed', 'overlap'].includes(normalized)) {
      return 'linear-adjacent';
    }
  }
  return smoothing === 'smoothed' ? 'linear-adjacent' : 'hard';
}

export function buildFeatureActivationRules({ featureFamily, extraFeatureKeys = [], featureActivationRules = {} } = {}) {
  const family = typeof featureFamily === 'string'
    ? resolveEvaluationExpansionFeatureFamily(featureFamily)
    : (featureFamily ?? EVALUATION_EXPANSION_FEATURE_GROUPS.control);
  const combined = { ...(family.activationRules ?? {}) };
  for (const [featureKey, rule] of Object.entries(featureActivationRules ?? {})) {
    combined[featureKey] = rule;
  }
  for (const key of extraFeatureKeys) {
    if (!combined[key]) {
      combined[key] = { maxBucketMinEmpties: 60 };
    }
  }
  return freezeObjectDeep(combined);
}

function featureActiveForBucket(bucket, rule) {
  if (!rule || typeof rule !== 'object') {
    return true;
  }
  if (Number.isFinite(rule.maxBucketMinEmpties) && Number(bucket.minEmpties) > Number(rule.maxBucketMinEmpties)) {
    return false;
  }
  if (Number.isFinite(rule.maxBucketMaxEmpties) && Number(bucket.maxEmpties) > Number(rule.maxBucketMaxEmpties)) {
    return false;
  }
  if (Number.isFinite(rule.minBucketMaxEmpties) && Number(bucket.maxEmpties) < Number(rule.minBucketMaxEmpties)) {
    return false;
  }
  if (Number.isFinite(rule.minBucketMinEmpties) && Number(bucket.minEmpties) < Number(rule.minBucketMinEmpties)) {
    return false;
  }
  return true;
}

export function buildExcludeFeaturesByBucketMap({ phaseBuckets, featureKeys, featureActivationRules }) {
  const result = new Map();
  const featureSet = new Set(featureKeys ?? []);
  for (const bucket of phaseBuckets ?? []) {
    const excluded = [];
    for (const [featureKey, rule] of Object.entries(featureActivationRules ?? {})) {
      if (!featureSet.has(featureKey)) {
        continue;
      }
      if (!featureActiveForBucket(bucket, rule)) {
        excluded.push(featureKey);
      }
    }
    if (excluded.length > 0) {
      result.set(bucket.key, excluded.sort((left, right) => left.localeCompare(right)));
    }
  }
  return result;
}

export function formatBucketFeatureExclusions(bucketFeatureMap) {
  const clauses = [];
  for (const [bucketKey, featureKeys] of bucketFeatureMap.entries()) {
    if (!Array.isArray(featureKeys) || featureKeys.length === 0) {
      continue;
    }
    clauses.push(`${bucketKey}:${featureKeys.join(',')}`);
  }
  return clauses.join(';');
}

export function buildEvaluationExpansionSeedProfile(candidate = {}, { baseProfile = ACTIVE_EVALUATION_PROFILE } = {}) {
  const resolvedBaseProfile = compileEvaluationProfile(baseProfile ?? ACTIVE_EVALUATION_PROFILE);
  const phaseBuckets = resolveEvaluationExpansionPhaseBuckets(candidate.phaseBuckets ?? candidate.bucketFamily ?? 'default8');
  const featureFamily = resolveEvaluationExpansionFeatureFamily(candidate.featureFamily ?? 'control');
  const extraFeatureKeys = uniqueStringList([
    ...featureFamily.extraFeatureKeys,
    ...uniqueStringList(candidate.extraFeatureKeys ?? []),
  ]);
  const candidateBaseFeatureKeys = Array.isArray(candidate.featureKeys) && candidate.featureKeys.length > 0
    ? candidate.featureKeys
    : resolvedBaseProfile.featureKeys;
  const featureKeys = normalizeCandidateFeatureKeys(candidateBaseFeatureKeys, extraFeatureKeys);
  const interpolation = normalizeInterpolationSetting(candidate.interpolation, candidate.smoothing ?? 'hard');

  const phaseBucketWeights = phaseBuckets.map((bucket) => {
    const empties = Math.round(midpointForBucket(bucket));
    const baseWeights = resolvedBaseProfile.weightsByEmptyCount?.[empties]
      ?? resolvedBaseProfile.bucketsByEmptyCount?.[empties]?.weights
      ?? {};
    const trimmedWeights = { bias: Number(baseWeights.bias ?? 0) };
    for (const key of featureKeys) {
      trimmedWeights[key] = Number(baseWeights[key] ?? 0);
    }
    return {
      ...bucket,
      weights: trimmedWeights,
    };
  });

  return makeTrainingProfileFromWeights({
    name: typeof candidate.name === 'string' && candidate.name.trim() !== ''
      ? candidate.name.trim()
      : `eval-expansion-${String(candidate.key ?? 'candidate')}`,
    description: typeof candidate.description === 'string' && candidate.description.trim() !== ''
      ? candidate.description.trim()
      : `Evaluation-profile expansion candidate ${String(candidate.key ?? 'candidate')}`,
    featureKeys,
    phaseBuckets: phaseBucketWeights,
    interpolation,
    stage: buildProfileStageMetadata({ kind: 'evaluation-profile', lane: 'evaluation-expansion-seed' }),
    source: {
      seedBaseProfile: resolvedBaseProfile.name,
      bucketFamily: typeof (candidate.bucketFamily ?? null) === 'string' ? candidate.bucketFamily : null,
      featureFamily: featureFamily.key,
      smoothing: candidate.smoothing ?? 'hard',
      extraFeatureKeys,
    },
  });
}

export function summarizeEvaluationExpansionCandidate(candidate = {}) {
  const featureFamily = resolveEvaluationExpansionFeatureFamily(candidate.featureFamily ?? 'control');
  const phaseBuckets = resolveEvaluationExpansionPhaseBuckets(candidate.phaseBuckets ?? candidate.bucketFamily ?? 'default8');
  const sampleAssignmentMode = normalizeSampleAssignmentMode(candidate.sampleAssignmentMode, candidate.smoothing ?? 'hard');
  const interpolation = normalizeInterpolationSetting(candidate.interpolation, candidate.smoothing ?? 'hard');
  const extraFeatureKeys = uniqueStringList([
    ...featureFamily.extraFeatureKeys,
    ...uniqueStringList(candidate.extraFeatureKeys ?? []),
  ]);
  const featureActivationRules = buildFeatureActivationRules({
    featureFamily,
    extraFeatureKeys,
    featureActivationRules: candidate.featureActivationRules,
  });
  const candidateBaseFeatureKeys = Array.isArray(candidate.featureKeys) && candidate.featureKeys.length > 0
    ? candidate.featureKeys
    : DEFAULT_EVALUATION_FEATURE_KEYS;
  const featureKeys = normalizeCandidateFeatureKeys(candidateBaseFeatureKeys, extraFeatureKeys);
  const excludeFeaturesByBucket = buildExcludeFeaturesByBucketMap({
    phaseBuckets,
    featureKeys,
    featureActivationRules,
  });

  return Object.freeze({
    key: candidate.key,
    name: candidate.name ?? `eval-expansion-${candidate.key}`,
    description: candidate.description ?? `Evaluation-profile expansion candidate ${candidate.key}`,
    bucketFamily: typeof candidate.bucketFamily === 'string' ? candidate.bucketFamily : null,
    phaseBuckets,
    featureFamily: featureFamily.key,
    featureKeys,
    extraFeatureKeys,
    sampleAssignmentMode,
    interpolation,
    featureActivationRules,
    excludeFeaturesByBucket,
  });
}
