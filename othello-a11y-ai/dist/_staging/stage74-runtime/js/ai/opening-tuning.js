import { OPENING_BOOK_DIRECT_USE_MAX_PLY } from './opening-book.js';

const DEFAULT_DIRECT_ALWAYS_USE_MAX_PLY = 2;
const DEFAULT_SINGLE_MOVE_MIN_WEIGHT = 3;
const DEFAULT_SINGLE_MOVE_PRIOR_SUPPORT_MIN_COUNT = 64;
const DEFAULT_SINGLE_MOVE_PRIOR_SUPPORT_MIN_SHARE = 0.55;
const DEFAULT_SINGLE_MOVE_ELITE_PRIOR_SUPPORT_MIN_COUNT = 5000;
const DEFAULT_SINGLE_MOVE_ELITE_PRIOR_SUPPORT_MIN_SHARE = 1;
const DEFAULT_HIGH_CONFIDENCE_SCORE_GAP = 28;
const DEFAULT_MEDIUM_CONFIDENCE_SCORE_GAP = 18;
const DEFAULT_MEDIUM_BOOK_SHARE = 0.68;
const DEFAULT_PRIOR_SUPPORT_SCORE_GAP = 12;
const DEFAULT_PRIOR_SUPPORT_BOOK_SHARE = 0.58;
const DEFAULT_PRIOR_SUPPORT_MIN_COUNT = 128;
const DEFAULT_PRIOR_SUPPORT_MIN_SHARE = 0.52;
const DEFAULT_SELECTION_PRIOR_SCALE = 1;
const DEFAULT_SELECTION_MISSING_PRIOR_PENALTY_SCALE = 1;
const DEFAULT_ORDERING_PRIOR_SCALE = 1;
const DEFAULT_ORDERING_OFF_BOOK_PRIOR_SCALE = 1;
const DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_PLY = 4;
const DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_COUNT = 50000;
const DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_RANK = 8;
const DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_SHARE_DELTA = 1;

export const OPENING_HYBRID_TUNING_FIELDS = Object.freeze([
  {
    key: 'directUseMaxPly',
    min: -1,
    max: OPENING_BOOK_DIRECT_USE_MAX_PLY,
    step: 1,
    defaultValue: OPENING_BOOK_DIRECT_USE_MAX_PLY,
  },
  {
    key: 'directAlwaysUseMaxPly',
    min: -1,
    max: OPENING_BOOK_DIRECT_USE_MAX_PLY,
    step: 1,
    defaultValue: DEFAULT_DIRECT_ALWAYS_USE_MAX_PLY,
  },
  {
    key: 'singleMoveMinWeight',
    min: 1,
    max: 16,
    step: 1,
    defaultValue: DEFAULT_SINGLE_MOVE_MIN_WEIGHT,
  },
  {
    key: 'singleMovePriorSupportMinCount',
    min: 0,
    max: 5000,
    step: 1,
    defaultValue: DEFAULT_SINGLE_MOVE_PRIOR_SUPPORT_MIN_COUNT,
  },
  {
    key: 'singleMovePriorSupportMinShare',
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: DEFAULT_SINGLE_MOVE_PRIOR_SUPPORT_MIN_SHARE,
  },
  {
    key: 'singleMoveElitePriorSupportMinCount',
    min: 0,
    max: 5000,
    step: 1,
    defaultValue: DEFAULT_SINGLE_MOVE_ELITE_PRIOR_SUPPORT_MIN_COUNT,
  },
  {
    key: 'singleMoveElitePriorSupportMinShare',
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: DEFAULT_SINGLE_MOVE_ELITE_PRIOR_SUPPORT_MIN_SHARE,
  },
  {
    key: 'highConfidenceScoreGap',
    min: 0,
    max: 80,
    step: 1,
    defaultValue: DEFAULT_HIGH_CONFIDENCE_SCORE_GAP,
  },
  {
    key: 'mediumConfidenceScoreGap',
    min: 0,
    max: 80,
    step: 1,
    defaultValue: DEFAULT_MEDIUM_CONFIDENCE_SCORE_GAP,
  },
  {
    key: 'mediumBookShare',
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: DEFAULT_MEDIUM_BOOK_SHARE,
  },
  {
    key: 'priorSupportScoreGap',
    min: 0,
    max: 80,
    step: 1,
    defaultValue: DEFAULT_PRIOR_SUPPORT_SCORE_GAP,
  },
  {
    key: 'priorSupportBookShare',
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: DEFAULT_PRIOR_SUPPORT_BOOK_SHARE,
  },
  {
    key: 'priorSupportMinCount',
    min: 0,
    max: 5000,
    step: 1,
    defaultValue: DEFAULT_PRIOR_SUPPORT_MIN_COUNT,
  },
  {
    key: 'priorSupportMinShare',
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: DEFAULT_PRIOR_SUPPORT_MIN_SHARE,
  },
  {
    key: 'selectionPriorScale',
    min: 0,
    max: 3,
    step: 0.05,
    defaultValue: DEFAULT_SELECTION_PRIOR_SCALE,
  },
  {
    key: 'selectionMissingPriorPenaltyScale',
    min: 0,
    max: 3,
    step: 0.05,
    defaultValue: DEFAULT_SELECTION_MISSING_PRIOR_PENALTY_SCALE,
  },
  {
    key: 'orderingPriorScale',
    min: 0,
    max: 3,
    step: 0.05,
    defaultValue: DEFAULT_ORDERING_PRIOR_SCALE,
  },
  {
    key: 'orderingOffBookPriorScale',
    min: 0,
    max: 3,
    step: 0.05,
    defaultValue: DEFAULT_ORDERING_OFF_BOOK_PRIOR_SCALE,
  },
  {
    key: 'priorContradictionVetoMinPly',
    min: 0,
    max: OPENING_BOOK_DIRECT_USE_MAX_PLY,
    step: 1,
    defaultValue: DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_PLY,
  },
  {
    key: 'priorContradictionVetoMinCount',
    min: 0,
    max: 50000,
    step: 1,
    defaultValue: DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_COUNT,
  },
  {
    key: 'priorContradictionVetoMinRank',
    min: 2,
    max: 8,
    step: 1,
    defaultValue: DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_RANK,
  },
  {
    key: 'priorContradictionVetoMinShareDelta',
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_SHARE_DELTA,
  },
]);

const OPENING_HYBRID_TUNING_FIELD_BY_KEY = Object.freeze(Object.fromEntries(
  OPENING_HYBRID_TUNING_FIELDS.map((field) => [field.key, field]),
));

function sanitizeTuningValue(field, value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return field.defaultValue;
  }

  const clamped = Math.max(field.min, Math.min(field.max, parsed));
  if (Number.isInteger(field.step)) {
    return Math.round(clamped);
  }

  const decimals = String(field.step).includes('.')
    ? String(field.step).split('.')[1].length
    : 0;
  return Number(clamped.toFixed(decimals));
}

function normalizeTuningShape(raw = {}) {
  const normalized = {};
  for (const field of OPENING_HYBRID_TUNING_FIELDS) {
    normalized[field.key] = sanitizeTuningValue(
      field,
      raw?.[field.key],
    );
  }

  normalized.directAlwaysUseMaxPly = Math.min(
    normalized.directAlwaysUseMaxPly,
    normalized.directUseMaxPly,
  );
  return Object.freeze(normalized);
}

function makeProfile(key, label, description, overrides = {}) {
  const normalized = normalizeTuningShape(overrides);
  return Object.freeze({
    key,
    label,
    description,
    ...normalized,
  });
}

export const OPENING_HYBRID_TUNING_PROFILES = Object.freeze({
  'stage56-legacy': makeProfile(
    'stage56-legacy',
    'Stage 56 legacy',
    'Stage 56 opening-prior integration 기본 임계치입니다.',
    {
      directUseMaxPly: OPENING_BOOK_DIRECT_USE_MAX_PLY,
      directAlwaysUseMaxPly: DEFAULT_DIRECT_ALWAYS_USE_MAX_PLY,
      singleMoveMinWeight: DEFAULT_SINGLE_MOVE_MIN_WEIGHT,
      singleMovePriorSupportMinCount: DEFAULT_SINGLE_MOVE_PRIOR_SUPPORT_MIN_COUNT,
      singleMovePriorSupportMinShare: DEFAULT_SINGLE_MOVE_PRIOR_SUPPORT_MIN_SHARE,
      singleMoveElitePriorSupportMinCount: DEFAULT_SINGLE_MOVE_ELITE_PRIOR_SUPPORT_MIN_COUNT,
      singleMoveElitePriorSupportMinShare: DEFAULT_SINGLE_MOVE_ELITE_PRIOR_SUPPORT_MIN_SHARE,
      highConfidenceScoreGap: DEFAULT_HIGH_CONFIDENCE_SCORE_GAP,
      mediumConfidenceScoreGap: DEFAULT_MEDIUM_CONFIDENCE_SCORE_GAP,
      mediumBookShare: DEFAULT_MEDIUM_BOOK_SHARE,
      priorSupportScoreGap: DEFAULT_PRIOR_SUPPORT_SCORE_GAP,
      priorSupportBookShare: DEFAULT_PRIOR_SUPPORT_BOOK_SHARE,
      priorSupportMinCount: DEFAULT_PRIOR_SUPPORT_MIN_COUNT,
      priorSupportMinShare: DEFAULT_PRIOR_SUPPORT_MIN_SHARE,
      selectionPriorScale: DEFAULT_SELECTION_PRIOR_SCALE,
      selectionMissingPriorPenaltyScale: DEFAULT_SELECTION_MISSING_PRIOR_PENALTY_SCALE,
      orderingPriorScale: DEFAULT_ORDERING_PRIOR_SCALE,
      orderingOffBookPriorScale: DEFAULT_ORDERING_OFF_BOOK_PRIOR_SCALE,
      priorContradictionVetoMinPly: DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_PLY,
      priorContradictionVetoMinCount: DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_COUNT,
      priorContradictionVetoMinRank: DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_RANK,
      priorContradictionVetoMinShareDelta: DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_SHARE_DELTA,
    },
  ),
  'stage57-book-led': makeProfile(
    'stage57-book-led',
    'Book-led hybrid',
    '초반 curated opening book를 더 존중하고, book이 있을 때 off-book prior bonus를 줄인 profile입니다.',
    {
      directUseMaxPly: OPENING_BOOK_DIRECT_USE_MAX_PLY,
      directAlwaysUseMaxPly: 2,
      singleMoveMinWeight: 3,
      singleMovePriorSupportMinCount: 64,
      singleMovePriorSupportMinShare: 0.55,
      singleMoveElitePriorSupportMinCount: 1024,
      singleMoveElitePriorSupportMinShare: 0.4,
      highConfidenceScoreGap: 24,
      mediumConfidenceScoreGap: 14,
      mediumBookShare: 0.62,
      priorSupportScoreGap: 10,
      priorSupportBookShare: 0.54,
      priorSupportMinCount: 96,
      priorSupportMinShare: 0.49,
      selectionPriorScale: 0.9,
      selectionMissingPriorPenaltyScale: 0.8,
      orderingPriorScale: 0.9,
      orderingOffBookPriorScale: 0.3,
      priorContradictionVetoMinPly: DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_PLY,
      priorContradictionVetoMinCount: DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_COUNT,
      priorContradictionVetoMinRank: DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_RANK,
      priorContradictionVetoMinShareDelta: DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_SHARE_DELTA,
    },
  ),
  'stage57-cautious': makeProfile(
    'stage57-cautious',
    'Cautious hybrid',
    'direct book 사용을 더 보수적으로 제한하고 off-book prior bonus를 강하게 줄인 profile입니다.',
    {
      directUseMaxPly: OPENING_BOOK_DIRECT_USE_MAX_PLY,
      directAlwaysUseMaxPly: 2,
      singleMoveMinWeight: 4,
      singleMovePriorSupportMinCount: 96,
      singleMovePriorSupportMinShare: 0.58,
      singleMoveElitePriorSupportMinCount: DEFAULT_SINGLE_MOVE_ELITE_PRIOR_SUPPORT_MIN_COUNT,
      singleMoveElitePriorSupportMinShare: DEFAULT_SINGLE_MOVE_ELITE_PRIOR_SUPPORT_MIN_SHARE,
      highConfidenceScoreGap: 32,
      mediumConfidenceScoreGap: 22,
      mediumBookShare: 0.72,
      priorSupportScoreGap: 14,
      priorSupportBookShare: 0.6,
      priorSupportMinCount: 160,
      priorSupportMinShare: 0.55,
      selectionPriorScale: 0.8,
      selectionMissingPriorPenaltyScale: 1,
      orderingPriorScale: 0.7,
      orderingOffBookPriorScale: 0.15,
      priorContradictionVetoMinPly: DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_PLY,
      priorContradictionVetoMinCount: DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_COUNT,
      priorContradictionVetoMinRank: DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_RANK,
      priorContradictionVetoMinShareDelta: DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_SHARE_DELTA,
    },
  ),
  'stage57-prior-light': makeProfile(
    'stage57-prior-light',
    'Prior-light hybrid',
    'book direct gate는 크게 바꾸지 않되, prior bonus만 약하게 섞는 profile입니다.',
    {
      directUseMaxPly: OPENING_BOOK_DIRECT_USE_MAX_PLY,
      directAlwaysUseMaxPly: DEFAULT_DIRECT_ALWAYS_USE_MAX_PLY,
      singleMoveMinWeight: DEFAULT_SINGLE_MOVE_MIN_WEIGHT,
      singleMovePriorSupportMinCount: 64,
      singleMovePriorSupportMinShare: 0.55,
      singleMoveElitePriorSupportMinCount: DEFAULT_SINGLE_MOVE_ELITE_PRIOR_SUPPORT_MIN_COUNT,
      singleMoveElitePriorSupportMinShare: DEFAULT_SINGLE_MOVE_ELITE_PRIOR_SUPPORT_MIN_SHARE,
      highConfidenceScoreGap: 26,
      mediumConfidenceScoreGap: 16,
      mediumBookShare: 0.66,
      priorSupportScoreGap: 11,
      priorSupportBookShare: 0.56,
      priorSupportMinCount: 112,
      priorSupportMinShare: 0.5,
      selectionPriorScale: 0.75,
      selectionMissingPriorPenaltyScale: 0.75,
      orderingPriorScale: 0.7,
      orderingOffBookPriorScale: 0.2,
      priorContradictionVetoMinPly: DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_PLY,
      priorContradictionVetoMinCount: DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_COUNT,
      priorContradictionVetoMinRank: DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_RANK,
      priorContradictionVetoMinShareDelta: DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_SHARE_DELTA,
    },
  ),
  'stage59-prior-veto': makeProfile(
    'stage59-prior-veto',
    'Prior-contradiction veto',
    'book-led hybrid 위에 prior contradiction veto를 얹은 profile입니다. WTHOR prior가 강하게 반대하면 direct opening-book 반환을 취소하고 search로 넘깁니다.',
    {
      directUseMaxPly: OPENING_BOOK_DIRECT_USE_MAX_PLY,
      directAlwaysUseMaxPly: 2,
      singleMoveMinWeight: 3,
      singleMovePriorSupportMinCount: 64,
      singleMovePriorSupportMinShare: 0.55,
      singleMoveElitePriorSupportMinCount: 1024,
      singleMoveElitePriorSupportMinShare: 0.4,
      highConfidenceScoreGap: 24,
      mediumConfidenceScoreGap: 14,
      mediumBookShare: 0.62,
      priorSupportScoreGap: 10,
      priorSupportBookShare: 0.54,
      priorSupportMinCount: 96,
      priorSupportMinShare: 0.49,
      selectionPriorScale: 0.9,
      selectionMissingPriorPenaltyScale: 0.8,
      orderingPriorScale: 0.9,
      orderingOffBookPriorScale: 0.3,
      priorContradictionVetoMinPly: 4,
      priorContradictionVetoMinCount: 2000,
      priorContradictionVetoMinRank: 2,
      priorContradictionVetoMinShareDelta: 0.08,
    },
  ),
  'stage59-cap9': makeProfile(
    'stage59-cap9',
    'Direct-cap 9 hybrid',
    'direct opening-book 반환을 9 ply까지만 허용하고 이후는 search로 넘기는 profile입니다.',
    {
      directUseMaxPly: 9,
      directAlwaysUseMaxPly: 2,
      singleMoveMinWeight: 3,
      singleMovePriorSupportMinCount: 64,
      singleMovePriorSupportMinShare: 0.55,
      singleMoveElitePriorSupportMinCount: 1024,
      singleMoveElitePriorSupportMinShare: 0.4,
      highConfidenceScoreGap: 24,
      mediumConfidenceScoreGap: 14,
      mediumBookShare: 0.62,
      priorSupportScoreGap: 10,
      priorSupportBookShare: 0.54,
      priorSupportMinCount: 96,
      priorSupportMinShare: 0.49,
      selectionPriorScale: 0.9,
      selectionMissingPriorPenaltyScale: 0.8,
      orderingPriorScale: 0.9,
      orderingOffBookPriorScale: 0.3,
      priorContradictionVetoMinPly: DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_PLY,
      priorContradictionVetoMinCount: DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_COUNT,
      priorContradictionVetoMinRank: DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_RANK,
      priorContradictionVetoMinShareDelta: DEFAULT_PRIOR_CONTRADICTION_VETO_MIN_SHARE_DELTA,
    },
  ),
  'stage59-cap9-prior-veto': makeProfile(
    'stage59-cap9-prior-veto',
    'Balanced veto hybrid',
    'direct opening-book 반환은 9 ply까지만 유지하고, 그보다 이른 구간에서도 WTHOR prior가 강하게 반대하면 direct book을 취소하는 profile입니다.',
    {
      directUseMaxPly: 9,
      directAlwaysUseMaxPly: 2,
      singleMoveMinWeight: 3,
      singleMovePriorSupportMinCount: 64,
      singleMovePriorSupportMinShare: 0.55,
      singleMoveElitePriorSupportMinCount: 1024,
      singleMoveElitePriorSupportMinShare: 0.4,
      highConfidenceScoreGap: 24,
      mediumConfidenceScoreGap: 14,
      mediumBookShare: 0.62,
      priorSupportScoreGap: 10,
      priorSupportBookShare: 0.54,
      priorSupportMinCount: 96,
      priorSupportMinShare: 0.49,
      selectionPriorScale: 0.9,
      selectionMissingPriorPenaltyScale: 0.8,
      orderingPriorScale: 0.9,
      orderingOffBookPriorScale: 0.3,
      priorContradictionVetoMinPly: 4,
      priorContradictionVetoMinCount: 2000,
      priorContradictionVetoMinRank: 2,
      priorContradictionVetoMinShareDelta: 0.08,
    },
  ),
  'search-reference': makeProfile(
    'search-reference',
    'Search reference',
    '벤치마크용 reference profile입니다. direct opening-book 반환을 끄고, prior bonus도 보수적으로만 사용합니다.',
    {
      directUseMaxPly: -1,
      directAlwaysUseMaxPly: -1,
      singleMoveMinWeight: DEFAULT_SINGLE_MOVE_MIN_WEIGHT,
      singleMovePriorSupportMinCount: DEFAULT_SINGLE_MOVE_PRIOR_SUPPORT_MIN_COUNT,
      singleMovePriorSupportMinShare: DEFAULT_SINGLE_MOVE_PRIOR_SUPPORT_MIN_SHARE,
      singleMoveElitePriorSupportMinCount: DEFAULT_SINGLE_MOVE_ELITE_PRIOR_SUPPORT_MIN_COUNT,
      singleMoveElitePriorSupportMinShare: DEFAULT_SINGLE_MOVE_ELITE_PRIOR_SUPPORT_MIN_SHARE,
      highConfidenceScoreGap: 80,
      mediumConfidenceScoreGap: 80,
      mediumBookShare: 1,
      priorSupportScoreGap: 80,
      priorSupportBookShare: 1,
      priorSupportMinCount: 5000,
      priorSupportMinShare: 1,
      selectionPriorScale: 0.8,
      selectionMissingPriorPenaltyScale: 0.6,
      orderingPriorScale: 0.7,
      orderingOffBookPriorScale: 0.15,
    },
  ),
  'search-reference-strong': makeProfile(
    'search-reference-strong',
    'Search reference strong',
    '더 깊은 reference benchmark용 profile입니다. direct opening-book은 끄고, prior ordering은 아주 약하게만 남깁니다.',
    {
      directUseMaxPly: -1,
      directAlwaysUseMaxPly: -1,
      singleMoveMinWeight: 8,
      singleMovePriorSupportMinCount: 5000,
      singleMovePriorSupportMinShare: 1,
      singleMoveElitePriorSupportMinCount: 5000,
      singleMoveElitePriorSupportMinShare: 1,
      highConfidenceScoreGap: 80,
      mediumConfidenceScoreGap: 80,
      mediumBookShare: 1,
      priorSupportScoreGap: 80,
      priorSupportBookShare: 1,
      priorSupportMinCount: 5000,
      priorSupportMinShare: 1,
      selectionPriorScale: 0,
      selectionMissingPriorPenaltyScale: 0,
      orderingPriorScale: 0.15,
      orderingOffBookPriorScale: 0.05,
    },
  ),
  'search-reference-pure': makeProfile(
    'search-reference-pure',
    'Search reference pure',
    '가장 엄격한 benchmark용 pure-search profile입니다. direct opening-book과 opening prior selection/ordering을 모두 끕니다.',
    {
      directUseMaxPly: -1,
      directAlwaysUseMaxPly: -1,
      singleMoveMinWeight: 8,
      singleMovePriorSupportMinCount: 5000,
      singleMovePriorSupportMinShare: 1,
      singleMoveElitePriorSupportMinCount: 5000,
      singleMoveElitePriorSupportMinShare: 1,
      highConfidenceScoreGap: 80,
      mediumConfidenceScoreGap: 80,
      mediumBookShare: 1,
      priorSupportScoreGap: 80,
      priorSupportBookShare: 1,
      priorSupportMinCount: 5000,
      priorSupportMinShare: 1,
      selectionPriorScale: 0,
      selectionMissingPriorPenaltyScale: 0,
      orderingPriorScale: 0,
      orderingOffBookPriorScale: 0,
    },
  ),
});

export const DEFAULT_OPENING_HYBRID_TUNING_KEY = 'stage59-cap9-prior-veto';

export function resolveOpeningHybridTuning(tuningKey = DEFAULT_OPENING_HYBRID_TUNING_KEY, overrides = null) {
  const baseProfile = OPENING_HYBRID_TUNING_PROFILES[tuningKey]
    ?? OPENING_HYBRID_TUNING_PROFILES[DEFAULT_OPENING_HYBRID_TUNING_KEY]
    ?? OPENING_HYBRID_TUNING_PROFILES['stage56-legacy'];

  if (!overrides || typeof overrides !== 'object') {
    return baseProfile;
  }

  const normalizedOverrides = {};
  for (const field of OPENING_HYBRID_TUNING_FIELDS) {
    if (!Object.hasOwn(overrides, field.key)) {
      normalizedOverrides[field.key] = baseProfile[field.key];
      continue;
    }
    normalizedOverrides[field.key] = sanitizeTuningValue(field, overrides[field.key]);
  }
  normalizedOverrides.directAlwaysUseMaxPly = Math.min(
    normalizedOverrides.directAlwaysUseMaxPly,
    normalizedOverrides.directUseMaxPly,
  );

  return Object.freeze({
    ...baseProfile,
    ...normalizedOverrides,
    key: `${baseProfile.key}+override`,
    label: `${baseProfile.label} + override`,
    description: baseProfile.description,
  });
}

export function getOpeningHybridTuningProfile(tuningKey = DEFAULT_OPENING_HYBRID_TUNING_KEY) {
  return OPENING_HYBRID_TUNING_PROFILES[tuningKey]
    ?? OPENING_HYBRID_TUNING_PROFILES[DEFAULT_OPENING_HYBRID_TUNING_KEY]
    ?? OPENING_HYBRID_TUNING_PROFILES['stage56-legacy'];
}

export function isKnownOpeningHybridTuningKey(tuningKey) {
  return typeof tuningKey === 'string' && Object.hasOwn(OPENING_HYBRID_TUNING_PROFILES, tuningKey);
}

export function coerceOpeningHybridTuningOverrides(rawOverrides = null) {
  if (!rawOverrides || typeof rawOverrides !== 'object') {
    return null;
  }

  const normalized = {};
  let hasAny = false;
  for (const field of OPENING_HYBRID_TUNING_FIELDS) {
    if (!Object.hasOwn(rawOverrides, field.key)) {
      continue;
    }
    normalized[field.key] = sanitizeTuningValue(field, rawOverrides[field.key]);
    hasAny = true;
  }

  if (!hasAny) {
    return null;
  }

  normalized.directAlwaysUseMaxPly = Math.min(
    normalized.directAlwaysUseMaxPly ?? DEFAULT_DIRECT_ALWAYS_USE_MAX_PLY,
    normalized.directUseMaxPly ?? OPENING_BOOK_DIRECT_USE_MAX_PLY,
  );
  return Object.freeze(normalized);
}

export function listOpeningHybridTuningProfiles() {
  return Object.freeze(Object.values(OPENING_HYBRID_TUNING_PROFILES));
}
