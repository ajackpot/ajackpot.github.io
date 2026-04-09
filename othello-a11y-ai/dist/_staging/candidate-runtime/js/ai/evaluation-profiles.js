import GENERATED_EVALUATION_PROFILE, {
  GENERATED_MOVE_ORDERING_PROFILE,
  GENERATED_MPC_PROFILE,
  GENERATED_TUPLE_RESIDUAL_PROFILE,
} from './learned-eval-profile.generated.js';
import {
  clamp,
  coordToIndex,
  indexToCoord,
  lerp,
  rowColToIndex,
} from '../core/bitboard.js';

export const EVALUATION_FEATURE_KEYS = Object.freeze([
  'mobility',
  'potentialMobility',
  'corners',
  'cornerAccess',
  'cornerMoveBalance',
  'cornerAdjacency',
  'cornerOrthAdjacency',
  'cornerDiagonalAdjacency',
  'frontier',
  'positional',
  'edgePattern',
  'cornerPattern',
  'stability',
  'stableDiscDifferential',
  'discDifferential',
  'discDifferentialRaw',
  'parity',
  'parityGlobal',
  'parityRegion',
]);

export const MOVE_ORDERING_FEATURE_KEYS = Object.freeze([
  'mobility',
  'corners',
  'cornerAdjacency',
  'edgePattern',
  'cornerPattern',
  'discDifferential',
  'parity',
]);

export const EVALUATION_PHASE_BUCKET_SPECS = Object.freeze([
  Object.freeze({ key: 'opening-a', minEmpties: 52, maxEmpties: 60, label: '초반 1' }),
  Object.freeze({ key: 'opening-b', minEmpties: 44, maxEmpties: 51, label: '초반 2' }),
  Object.freeze({ key: 'midgame-a', minEmpties: 36, maxEmpties: 43, label: '중반 1' }),
  Object.freeze({ key: 'midgame-b', minEmpties: 28, maxEmpties: 35, label: '중반 2' }),
  Object.freeze({ key: 'midgame-c', minEmpties: 20, maxEmpties: 27, label: '중반 3' }),
  Object.freeze({ key: 'late-a', minEmpties: 13, maxEmpties: 19, label: '후반 1' }),
  Object.freeze({ key: 'late-b', minEmpties: 7, maxEmpties: 12, label: '후반 2' }),
  Object.freeze({ key: 'endgame', minEmpties: 0, maxEmpties: 6, label: '끝내기' }),
]);

export const DEFAULT_MOVE_ORDERING_TRAINED_BUCKETS = Object.freeze([
  Object.freeze({
    minEmpties: 9,
    maxEmpties: 10,
    weights: Object.freeze({
      mobility: 10_000,
      corners: 0,
      cornerAdjacency: -5_000,
      edgePattern: 0,
      cornerPattern: 0,
      discDifferential: 0,
      parity: 0,
    }),
  }),
  Object.freeze({
    minEmpties: 11,
    maxEmpties: 12,
    weights: Object.freeze({
      mobility: 5_000,
      corners: 0,
      cornerAdjacency: -5_000,
      edgePattern: -5_000,
      cornerPattern: 0,
      discDifferential: 0,
      parity: 0,
    }),
  }),
  Object.freeze({
    minEmpties: 13,
    maxEmpties: 14,
    weights: Object.freeze({
      mobility: 2_000,
      corners: 0,
      cornerAdjacency: 0,
      edgePattern: 1_000,
      cornerPattern: 0,
      discDifferential: 0,
      parity: 0,
    }),
  }),
]);

export const DEFAULT_MOVE_ORDERING_PROFILE = Object.freeze({
  version: 1,
  name: 'legacy-move-ordering-seed-v1',
  description: '기존 late move-ordering evaluator의 수작업 seed bucket입니다.',
  featureKeys: MOVE_ORDERING_FEATURE_KEYS,
  trainedBuckets: DEFAULT_MOVE_ORDERING_TRAINED_BUCKETS,
});

function coerceFiniteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function midpointForBucket(bucketSpec) {
  return (bucketSpec.minEmpties + bucketSpec.maxEmpties) / 2;
}

function legacyWeightsForEmpties(empties) {
  const phase = clamp((64 - empties) / 64, 0, 1);
  return {
    bias: 0,
    mobility: lerp(135, 35, phase),
    potentialMobility: lerp(55, 12, phase),
    corners: 850,
    cornerAccess: lerp(200, 650, phase),
    cornerMoveBalance: 0,
    cornerAdjacency: lerp(300, 90, phase),
    cornerOrthAdjacency: 0,
    cornerDiagonalAdjacency: 0,
    frontier: lerp(80, 20, phase),
    positional: lerp(14, 8, phase),
    edgePattern: lerp(85, 165, phase),
    cornerPattern: lerp(95, 175, phase),
    stability: lerp(120, 320, phase),
    stableDiscDifferential: 0,
    discDifferential: empties <= 18 ? lerp(12, 120, 1 - (empties / 18)) : 0,
    discDifferentialRaw: 0,
    parity: empties <= 14 ? lerp(25, 80, 1 - (empties / 14)) : 0,
    parityGlobal: 0,
    parityRegion: 0,
  };
}

export function moveOrderingFallbackWeightsForEmpties(empties) {
  const phase = clamp((18 - empties) / 12, 0, 1);
  return Object.freeze({
    mobility: lerp(720, 480, phase),
    corners: lerp(2200, 2600, phase),
    cornerAdjacency: lerp(820, 300, phase),
    edgePattern: lerp(720, 1080, phase),
    cornerPattern: lerp(980, 1280, phase),
    discDifferential: empties <= 10 ? lerp(160, 480, 1 - (empties / 10)) : 0,
    parity: empties <= 12 ? lerp(80, 220, 1 - (empties / 12)) : 0,
  });
}

function canonicalizeEvaluationWeightsForBucket(bucketSpec, weights = {}) {
  const canonical = { ...weights };

  if (Number(bucketSpec?.minEmpties ?? 0) > 18) {
    canonical.parity = coerceFiniteNumber(canonical.parity, 0)
      + coerceFiniteNumber(canonical.parityGlobal, 0)
      + coerceFiniteNumber(canonical.parityRegion, 0);
    canonical.parityGlobal = 0;
    canonical.parityRegion = 0;
  }

  return canonical;
}

export { canonicalizeEvaluationWeightsForBucket };

function normalizeWeights(sourceWeights = {}, fallbackWeights = {}, bucketSpec = null) {
  const normalized = {
    bias: coerceFiniteNumber(sourceWeights.bias, fallbackWeights.bias ?? 0),
  };

  for (const key of EVALUATION_FEATURE_KEYS) {
    normalized[key] = coerceFiniteNumber(sourceWeights[key], fallbackWeights[key] ?? 0);
  }

  return Object.freeze(canonicalizeEvaluationWeightsForBucket(bucketSpec, normalized));
}

function normalizeMoveOrderingWeights(sourceWeights = {}, fallbackWeights = {}) {
  const normalized = {};
  for (const key of MOVE_ORDERING_FEATURE_KEYS) {
    normalized[key] = coerceFiniteNumber(sourceWeights[key], fallbackWeights[key] ?? 0);
  }
  return Object.freeze(normalized);
}

function buildDefaultPhaseBuckets() {
  return Object.freeze(EVALUATION_PHASE_BUCKET_SPECS.map((bucketSpec) => Object.freeze({
    ...bucketSpec,
    weights: normalizeWeights(legacyWeightsForEmpties(midpointForBucket(bucketSpec)), {}, bucketSpec),
  })));
}

export const DEFAULT_EVALUATION_PROFILE = Object.freeze({
  version: 1,
  name: 'legacy-seed-bucketed-v1',
  description: '기존 수작업 evaluator를 phase bucket weight 구조로 옮긴 기본 프로필입니다.',
  featureKeys: EVALUATION_FEATURE_KEYS,
  phaseBuckets: buildDefaultPhaseBuckets(),
});

function findMatchingBucket(sourcePhaseBuckets, bucketSpec) {
  if (!Array.isArray(sourcePhaseBuckets)) {
    return null;
  }

  return sourcePhaseBuckets.find((bucket) => {
    if (typeof bucket?.key === 'string' && bucket.key === bucketSpec.key) {
      return true;
    }
    return bucket?.minEmpties === bucketSpec.minEmpties && bucket?.maxEmpties === bucketSpec.maxEmpties;
  }) ?? null;
}

function normalizeEmptyBucketRange(minEmpties, maxEmpties, { fallbackMin = 0, fallbackMax = 0 } = {}) {
  const normalizedMin = clamp(Number.isInteger(minEmpties) ? minEmpties : fallbackMin, 0, 60);
  const normalizedMax = clamp(Number.isInteger(maxEmpties) ? maxEmpties : fallbackMax, 0, 60);

  if (normalizedMin <= normalizedMax) {
    return Object.freeze({ minEmpties: normalizedMin, maxEmpties: normalizedMax });
  }

  return Object.freeze({ minEmpties: normalizedMax, maxEmpties: normalizedMin });
}

function normalizeTupleSquare(value) {
  if (Number.isInteger(value) && value >= 0 && value < 64) {
    return value;
  }

  if (typeof value === 'string' && /^[a-h][1-8]$/i.test(value.trim())) {
    return coordToIndex(value.trim().toLowerCase());
  }

  throw new Error(`Invalid tuple square: ${value}`);
}

function normalizeTupleSquares(tupleSource) {
  const sourceSquares = Array.isArray(tupleSource)
    ? tupleSource
    : (Array.isArray(tupleSource?.squares)
      ? tupleSource.squares
      : (Array.isArray(tupleSource?.coords) ? tupleSource.coords : null));

  if (!Array.isArray(sourceSquares) || sourceSquares.length === 0) {
    throw new Error('Tuple definition must include a non-empty squares/coords array.');
  }

  const normalized = sourceSquares.map(normalizeTupleSquare);
  const unique = new Set(normalized);
  if (unique.size !== normalized.length) {
    throw new Error(`Tuple squares must not repeat: ${JSON.stringify(sourceSquares)}`);
  }

  return Object.freeze(normalized);
}

function buildTupleKey(tupleSource, squares) {
  if (typeof tupleSource?.key === 'string' && tupleSource.key.trim() !== '') {
    return tupleSource.key.trim();
  }
  return squares.map((square) => indexToCoord(square)).join('-');
}

function createTupleLayout({ name, description, tuples }) {
  const normalizedTuples = Object.freeze(tuples.map((tupleSource) => {
    const squares = normalizeTupleSquares(tupleSource);
    return Object.freeze({
      key: buildTupleKey(tupleSource, squares),
      squares,
      length: squares.length,
      tableSize: 3 ** squares.length,
    });
  }));

  const tupleKeys = normalizedTuples.map((tuple) => tuple.key);
  const uniqueTupleKeys = new Set(tupleKeys);
  if (uniqueTupleKeys.size !== tupleKeys.length) {
    throw new Error('Tuple layout keys must be unique.');
  }

  return Object.freeze({
    version: 1,
    name,
    description,
    tupleCount: normalizedTuples.length,
    maxTupleLength: normalizedTuples.reduce((best, tuple) => Math.max(best, tuple.length), 0),
    totalTableSize: normalizedTuples.reduce((sum, tuple) => sum + tuple.tableSize, 0),
    tuples: normalizedTuples,
  });
}

function buildOrthogonalAdjacentPairsLayout({ name, description, selectedRows = null, selectedCols = null } = {}) {
  const tuples = [];
  const rowFilter = selectedRows ? new Set(selectedRows) : null;
  const colFilter = selectedCols ? new Set(selectedCols) : null;

  for (let row = 0; row < 8; row += 1) {
    if (rowFilter && !rowFilter.has(row)) {
      continue;
    }
    for (let col = 0; col < 7; col += 1) {
      tuples.push({ squares: [rowColToIndex(row, col), rowColToIndex(row, col + 1)] });
    }
  }

  for (let col = 0; col < 8; col += 1) {
    if (colFilter && !colFilter.has(col)) {
      continue;
    }
    for (let row = 0; row < 7; row += 1) {
      tuples.push({ squares: [rowColToIndex(row, col), rowColToIndex(row + 1, col)] });
    }
  }

  return createTupleLayout({
    name,
    description,
    tuples,
  });
}

function buildDiagonalAdjacentPairsLayout({ name, description } = {}) {
  const tuples = [];

  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      tuples.push({ squares: [rowColToIndex(row, col), rowColToIndex(row + 1, col + 1)] });
    }
  }

  for (let row = 0; row < 7; row += 1) {
    for (let col = 1; col < 8; col += 1) {
      tuples.push({ squares: [rowColToIndex(row, col), rowColToIndex(row + 1, col - 1)] });
    }
  }

  return createTupleLayout({
    name,
    description,
    tuples,
  });
}

function buildStraightAdjacentPairsLayout({ name, description } = {}) {
  const orthogonal = buildOrthogonalAdjacentPairsLayout({
    name: `${name}-orthogonal-seed`,
    description,
  });
  const diagonal = buildDiagonalAdjacentPairsLayout({
    name: `${name}-diagonal-seed`,
    description,
  });

  return createTupleLayout({
    name,
    description,
    tuples: [
      ...orthogonal.tuples.map((tuple) => ({ key: tuple.key, squares: tuple.squares })),
      ...diagonal.tuples.map((tuple) => ({ key: tuple.key, squares: tuple.squares })),
    ],
  });
}

export const DEFAULT_TUPLE_RESIDUAL_LAYOUT_NAME = 'orthogonal-adjacent-pairs-outer2-v1';
export const DEFAULT_TUPLE_RESIDUAL_PHASE_BUCKET_KEYS = Object.freeze(['midgame-c', 'late-a', 'late-b', 'endgame']);

const BUILTIN_TUPLE_RESIDUAL_LAYOUTS = Object.freeze({
  'orthogonal-adjacent-pairs-outer2-v1': buildOrthogonalAdjacentPairsLayout({
    name: 'orthogonal-adjacent-pairs-outer2-v1',
    description: '바깥쪽 두 줄/두 칸(file/rank)의 인접 가로/세로 pair 56개로 만든 compact residual layout입니다.',
    selectedRows: [0, 1, 6, 7],
    selectedCols: [0, 1, 6, 7],
  }),
  'orthogonal-adjacent-pairs-full-v1': buildOrthogonalAdjacentPairsLayout({
    name: 'orthogonal-adjacent-pairs-full-v1',
    description: '8x8 전체의 인접 가로/세로 pair 112개를 모두 포함하는 residual layout입니다.',
  }),
  'diagonal-adjacent-pairs-full-v1': buildDiagonalAdjacentPairsLayout({
    name: 'diagonal-adjacent-pairs-full-v1',
    description: '8x8 전체의 인접 대각 pair 98개를 모두 포함하는 residual layout입니다.',
  }),
  'straight-adjacent-pairs-full-v1': buildStraightAdjacentPairsLayout({
    name: 'straight-adjacent-pairs-full-v1',
    description: '8x8 전체의 인접 직선 pair(가로/세로/대각) 210개를 모두 포함하는 residual layout입니다.',
  }),
});

export const TUPLE_RESIDUAL_LAYOUT_LIBRARY = BUILTIN_TUPLE_RESIDUAL_LAYOUTS;
export const DEFAULT_TUPLE_RESIDUAL_LAYOUT = BUILTIN_TUPLE_RESIDUAL_LAYOUTS[DEFAULT_TUPLE_RESIDUAL_LAYOUT_NAME];

export function listTupleResidualLayoutNames() {
  return Object.freeze(Object.keys(BUILTIN_TUPLE_RESIDUAL_LAYOUTS));
}

export function resolveTupleResidualLayout(layout = DEFAULT_TUPLE_RESIDUAL_LAYOUT_NAME) {
  if (layout === null || layout === undefined || layout === '') {
    return DEFAULT_TUPLE_RESIDUAL_LAYOUT;
  }

  if (typeof layout === 'string') {
    const builtin = BUILTIN_TUPLE_RESIDUAL_LAYOUTS[layout];
    if (!builtin) {
      throw new Error(`Unknown tuple residual layout: ${layout}`);
    }
    return builtin;
  }

  if (typeof layout === 'object') {
    if (typeof layout.builtin === 'string') {
      return resolveTupleResidualLayout(layout.builtin);
    }

    if (typeof layout.name === 'string' && !Array.isArray(layout.tuples) && BUILTIN_TUPLE_RESIDUAL_LAYOUTS[layout.name]) {
      return BUILTIN_TUPLE_RESIDUAL_LAYOUTS[layout.name];
    }

    if (Array.isArray(layout.tuples)) {
      return createTupleLayout({
        name: typeof layout.name === 'string' && layout.name.trim() !== ''
          ? layout.name.trim()
          : 'custom-tuple-layout',
        description: typeof layout.description === 'string'
          ? layout.description
          : '사용자 정의 tuple residual layout입니다.',
        tuples: layout.tuples,
      });
    }
  }

  throw new Error('Tuple residual layout must be a built-in layout name or an object with tuples[].');
}

function normalizeTupleWeightTable(weightsSource, expectedLength) {
  const source = Array.isArray(weightsSource) ? weightsSource : [];
  return Object.freeze(Array.from({ length: expectedLength }, (_, index) => coerceFiniteNumber(source[index], 0)));
}

function normalizeTupleResidualBucket(bucket, layout) {
  const rawTupleWeights = bucket?.tupleWeights ?? bucket?.weightsByTuple ?? bucket?.tables ?? [];
  const { minEmpties, maxEmpties } = normalizeEmptyBucketRange(bucket?.minEmpties, bucket?.maxEmpties);

  return Object.freeze({
    ...(typeof bucket?.key === 'string' ? { key: bucket.key } : {}),
    minEmpties,
    maxEmpties,
    scale: coerceFiniteNumber(bucket?.scale, 1),
    bias: coerceFiniteNumber(bucket?.bias ?? bucket?.offset ?? bucket?.bucketBias, 0),
    tupleWeights: Object.freeze(layout.tuples.map((tuple, tupleIndex) => normalizeTupleWeightTable(rawTupleWeights[tupleIndex], tuple.tableSize))),
  });
}

export const ACTIVE_EVALUATION_PROFILE = GENERATED_EVALUATION_PROFILE ?? DEFAULT_EVALUATION_PROFILE;
export const ACTIVE_MOVE_ORDERING_PROFILE = GENERATED_MOVE_ORDERING_PROFILE ?? null;
export const ACTIVE_TUPLE_RESIDUAL_PROFILE = GENERATED_TUPLE_RESIDUAL_PROFILE ?? null;
export const ACTIVE_MPC_PROFILE = GENERATED_MPC_PROFILE ?? null;

export function resolveEvaluationProfile(profile = ACTIVE_EVALUATION_PROFILE) {
  const source = profile && typeof profile === 'object' ? profile : DEFAULT_EVALUATION_PROFILE;
  const fallbackBuckets = DEFAULT_EVALUATION_PROFILE.phaseBuckets;

  const phaseBuckets = Object.freeze(EVALUATION_PHASE_BUCKET_SPECS.map((bucketSpec, index) => {
    const fallbackBucket = fallbackBuckets[index];
    const sourceBucket = findMatchingBucket(source.phaseBuckets, bucketSpec);

    return Object.freeze({
      ...bucketSpec,
      weights: normalizeWeights(sourceBucket?.weights, fallbackBucket.weights, bucketSpec),
    });
  }));

  return Object.freeze({
    version: Number.isInteger(source.version) ? source.version : DEFAULT_EVALUATION_PROFILE.version,
    name: typeof source.name === 'string' && source.name.trim() !== ''
      ? source.name
      : DEFAULT_EVALUATION_PROFILE.name,
    description: typeof source.description === 'string' ? source.description : DEFAULT_EVALUATION_PROFILE.description,
    featureKeys: EVALUATION_FEATURE_KEYS,
    phaseBuckets,
  });
}

export function compileEvaluationProfile(profile = ACTIVE_EVALUATION_PROFILE) {
  const resolved = resolveEvaluationProfile(profile);
  const bucketsByEmptyCount = Array.from({ length: 61 }, () => resolved.phaseBuckets[resolved.phaseBuckets.length - 1]);

  for (const bucket of resolved.phaseBuckets) {
    for (let empties = bucket.minEmpties; empties <= bucket.maxEmpties; empties += 1) {
      if (empties >= 0 && empties < bucketsByEmptyCount.length) {
        bucketsByEmptyCount[empties] = bucket;
      }
    }
  }

  return Object.freeze({
    ...resolved,
    bucketsByEmptyCount: Object.freeze(bucketsByEmptyCount),
  });
}

export function resolveMoveOrderingBuckets(profile = ACTIVE_MOVE_ORDERING_PROFILE) {
  if (!profile || !Array.isArray(profile.trainedBuckets)) {
    return DEFAULT_MOVE_ORDERING_TRAINED_BUCKETS;
  }

  return Object.freeze(profile.trainedBuckets.map((bucket, index) => {
    const fallback = DEFAULT_MOVE_ORDERING_TRAINED_BUCKETS[index] ?? DEFAULT_MOVE_ORDERING_TRAINED_BUCKETS[DEFAULT_MOVE_ORDERING_TRAINED_BUCKETS.length - 1];
    const sourceWeights = bucket?.weights ?? {};
    const fallbackWeights = fallback?.weights ?? {};

    return Object.freeze({
      ...(typeof bucket?.key === 'string' ? { key: bucket.key } : {}),
      minEmpties: Number.isInteger(bucket?.minEmpties) ? bucket.minEmpties : fallback.minEmpties,
      maxEmpties: Number.isInteger(bucket?.maxEmpties) ? bucket.maxEmpties : fallback.maxEmpties,
      weights: normalizeMoveOrderingWeights(sourceWeights, fallbackWeights),
    });
  }));
}

export function resolveTupleResidualBuckets(profile = ACTIVE_TUPLE_RESIDUAL_PROFILE) {
  if (!profile || !Array.isArray(profile.trainedBuckets) || profile.trainedBuckets.length === 0) {
    return Object.freeze([]);
  }

  const layout = resolveTupleResidualLayout(profile.layout ?? profile.layoutName ?? DEFAULT_TUPLE_RESIDUAL_LAYOUT_NAME);
  return Object.freeze(profile.trainedBuckets.map((bucket) => normalizeTupleResidualBucket(bucket, layout)));
}

export function resolveTupleResidualProfile(profile = ACTIVE_TUPLE_RESIDUAL_PROFILE) {
  if (!profile || typeof profile !== 'object') {
    return null;
  }

  const source = profile;
  const layout = resolveTupleResidualLayout(source.layout ?? source.layoutName ?? DEFAULT_TUPLE_RESIDUAL_LAYOUT_NAME);
  const trainedBuckets = resolveTupleResidualBuckets({ ...source, layout });

  return Object.freeze({
    version: Number.isInteger(source.version) ? source.version : 1,
    name: typeof source.name === 'string' && source.name.trim() !== ''
      ? source.name
      : 'trained-tuple-residual-v1',
    description: typeof source.description === 'string'
      ? source.description
      : '외부 학습 도구로 생성한 tuple residual evaluator profile입니다.',
    ...(Object.hasOwn(source, 'stage') ? { stage: source.stage } : {}),
    ...(Object.hasOwn(source, 'source') ? { source: source.source } : {}),
    ...(Object.hasOwn(source, 'diagnostics') ? { diagnostics: source.diagnostics } : {}),
    ...(Object.hasOwn(source, 'calibration') ? { calibration: source.calibration } : {}),
    ...(Object.hasOwn(source, 'patch') ? { patch: source.patch } : {}),
    featureEncoding: 'ternary-side-to-move',
    layout,
    trainedBuckets,
  });
}

export function compileTupleResidualProfile(profile = ACTIVE_TUPLE_RESIDUAL_PROFILE) {
  const resolved = resolveTupleResidualProfile(profile);
  if (!resolved) {
    return null;
  }

  const bucketsByEmptyCount = Array.from({ length: 61 }, () => null);
  for (const bucket of resolved.trainedBuckets) {
    for (let empties = bucket.minEmpties; empties <= bucket.maxEmpties; empties += 1) {
      if (empties >= 0 && empties < bucketsByEmptyCount.length) {
        bucketsByEmptyCount[empties] = bucket;
      }
    }
  }

  return Object.freeze({
    ...resolved,
    bucketsByEmptyCount: Object.freeze(bucketsByEmptyCount),
  });
}


function cloneJsonCompatible(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function finiteOrNull(value) {
  return Number.isFinite(value) ? Number(value) : null;
}

function resolveMpcHalfWidthFromCalibration(calibration, fallbackZ = null) {
  const directHalfWidth = finiteOrNull(calibration?.intervalHalfWidth);
  if (Number.isFinite(directHalfWidth) && directHalfWidth > 0) {
    return directHalfWidth;
  }

  const recommendedHalfWidth = finiteOrNull(calibration?.recommendedZ?.intervalHalfWidth);
  if (Number.isFinite(recommendedHalfWidth) && recommendedHalfWidth > 0) {
    return recommendedHalfWidth;
  }

  const recommendedZ = finiteOrNull(calibration?.recommendedZ?.z);
  const positiveZ = Number.isFinite(recommendedZ) && recommendedZ > 0
    ? recommendedZ
    : (Number.isFinite(fallbackZ) && fallbackZ > 0 ? fallbackZ : null);
  const holdoutStdDev = finiteOrNull(calibration?.holdoutMetrics?.stdDevResidual);
  if (Number.isFinite(holdoutStdDev) && holdoutStdDev > 0) {
    return positiveZ ? holdoutStdDev * positiveZ : holdoutStdDev;
  }

  const trainStdDev = finiteOrNull(calibration?.trainMetrics?.stdDevResidual);
  if (Number.isFinite(trainStdDev) && trainStdDev > 0) {
    return positiveZ ? trainStdDev * positiveZ : trainStdDev;
  }

  return null;
}

function normalizeMpcRuntimeConfig(runtimeConfig = null) {
  const source = runtimeConfig && typeof runtimeConfig === 'object' ? runtimeConfig : {};
  const explicitAllowRoot = source.allowRoot === true;
  const minPlyFallback = explicitAllowRoot ? 0 : 1;
  const minPly = clamp(
    Number.isFinite(Number(source.minPly)) ? Math.round(Number(source.minPly)) : minPlyFallback,
    0,
    64,
  );
  const maxWindow = clamp(
    Number.isFinite(Number(source.maxWindow ?? source.windowMax)) ? Math.round(Number(source.maxWindow ?? source.windowMax)) : 1,
    1,
    64,
  );

  return Object.freeze({
    enableHighCut: source.enableHighCut !== false,
    enableLowCut: source.enableLowCut === true || source.allowLowCut === true,
    maxWindow,
    maxChecksPerNode: clamp(
      Number.isFinite(Number(source.maxChecksPerNode ?? source.numTry)) ? Math.round(Number(source.maxChecksPerNode ?? source.numTry)) : 1,
      1,
      8,
    ),
    minDepth: clamp(
      Number.isFinite(Number(source.minDepth)) ? Math.round(Number(source.minDepth)) : 2,
      1,
      64,
    ),
    minDepthGap: clamp(
      Number.isFinite(Number(source.minDepthGap)) ? Math.round(Number(source.minDepthGap)) : 2,
      1,
      32,
    ),
    maxDepthDistance: clamp(
      Number.isFinite(Number(source.maxDepthDistance)) ? Math.round(Number(source.maxDepthDistance)) : 1,
      0,
      32,
    ),
    minPly,
    highScale: Math.max(0, coerceFiniteNumber(source.highScale ?? source.highCutScale, 1)),
    lowScale: Math.max(0, coerceFiniteNumber(source.lowScale ?? source.lowCutScale, 1)),
    depthDistanceScale: Math.max(1, coerceFiniteNumber(source.depthDistanceScale, 1.25)),
  });
}

function normalizeMpcCalibration(calibration) {
  if (!calibration || typeof calibration !== 'object') {
    return null;
  }

  const { minEmpties, maxEmpties } = normalizeEmptyBucketRange(
    calibration.minEmpties,
    calibration.maxEmpties,
  );
  const shallowDepth = Number.isInteger(calibration.shallowDepth) ? calibration.shallowDepth : null;
  const deepDepth = Number.isInteger(calibration.deepDepth) ? calibration.deepDepth : null;
  if (!Number.isInteger(shallowDepth) || !Number.isInteger(deepDepth) || shallowDepth < 1 || deepDepth <= shallowDepth) {
    return null;
  }

  const intercept = finiteOrNull(calibration?.regression?.intercept ?? calibration?.intercept);
  const slope = finiteOrNull(calibration?.regression?.slope ?? calibration?.slope);
  const correlation = finiteOrNull(calibration?.regression?.correlation ?? calibration?.correlation);
  const rSquared = finiteOrNull(calibration?.regression?.rSquared ?? calibration?.rSquared);
  const recommendedZValue = finiteOrNull(calibration?.recommendedZ?.z);
  const intervalHalfWidth = resolveMpcHalfWidthFromCalibration(calibration, recommendedZValue);
  const highIntervalHalfWidth = finiteOrNull(calibration?.highIntervalHalfWidth ?? calibration?.recommendedZ?.highIntervalHalfWidth);
  const lowIntervalHalfWidth = finiteOrNull(calibration?.lowIntervalHalfWidth ?? calibration?.recommendedZ?.lowIntervalHalfWidth);
  const recommendedZ = calibration?.recommendedZ && typeof calibration.recommendedZ === 'object'
    ? Object.freeze({
      ...(Number.isFinite(recommendedZValue) ? { z: recommendedZValue } : {}),
      ...(Number.isFinite(finiteOrNull(calibration.recommendedZ.coverage)) ? { coverage: finiteOrNull(calibration.recommendedZ.coverage) } : {}),
      ...(Number.isFinite(intervalHalfWidth) ? { intervalHalfWidth } : {}),
      ...(Number.isFinite(highIntervalHalfWidth) ? { highIntervalHalfWidth } : {}),
      ...(Number.isFinite(lowIntervalHalfWidth) ? { lowIntervalHalfWidth } : {}),
    })
    : null;

  const usable = calibration.usable !== false
    && Number.isFinite(intercept)
    && Number.isFinite(slope)
    && slope > 0
    && Number.isFinite(intervalHalfWidth)
    && intervalHalfWidth >= 0;

  return Object.freeze({
    ...(typeof calibration.key === 'string' && calibration.key.trim() !== '' ? { key: calibration.key.trim() } : {}),
    ...(typeof calibration.label === 'string' && calibration.label.trim() !== '' ? { label: calibration.label.trim() } : {}),
    minEmpties,
    maxEmpties,
    shallowDepth,
    deepDepth,
    usable,
    ...(Number.isFinite(intercept) ? { intercept } : {}),
    ...(Number.isFinite(slope) ? { slope } : {}),
    ...(Number.isFinite(correlation) ? { correlation } : {}),
    ...(Number.isFinite(rSquared) ? { rSquared } : {}),
    ...(Number.isFinite(intervalHalfWidth) ? { intervalHalfWidth } : {}),
    ...(Number.isFinite(highIntervalHalfWidth) ? { highIntervalHalfWidth } : {}),
    ...(Number.isFinite(lowIntervalHalfWidth) ? { lowIntervalHalfWidth } : {}),
    ...(recommendedZ ? { recommendedZ } : {}),
    ...(calibration.regression && typeof calibration.regression === 'object'
      ? {
        regression: Object.freeze({
          ...(Number.isFinite(intercept) ? { intercept } : {}),
          ...(Number.isFinite(slope) ? { slope } : {}),
          ...(Number.isFinite(correlation) ? { correlation } : {}),
          ...(Number.isFinite(rSquared) ? { rSquared } : {}),
          ...(Number.isFinite(finiteOrNull(calibration.regression.sampleCount)) ? { sampleCount: Math.max(0, Math.round(Number(calibration.regression.sampleCount))) } : {}),
        }),
      }
      : {}),
    ...(calibration.trainMetrics && typeof calibration.trainMetrics === 'object'
      ? { trainMetrics: Object.freeze(cloneJsonCompatible(calibration.trainMetrics)) }
      : {}),
    ...(calibration.holdoutMetrics && typeof calibration.holdoutMetrics === 'object'
      ? { holdoutMetrics: Object.freeze(cloneJsonCompatible(calibration.holdoutMetrics)) }
      : {}),
    ...(Array.isArray(calibration.zCoverage)
      ? { zCoverage: Object.freeze(cloneJsonCompatible(calibration.zCoverage)) }
      : {}),
    ...(calibration.shallowSearchCost && typeof calibration.shallowSearchCost === 'object'
      ? { shallowSearchCost: Object.freeze(cloneJsonCompatible(calibration.shallowSearchCost)) }
      : {}),
    ...(calibration.deepSearchCost && typeof calibration.deepSearchCost === 'object'
      ? { deepSearchCost: Object.freeze(cloneJsonCompatible(calibration.deepSearchCost)) }
      : {}),
    ...(Number.isFinite(finiteOrNull(calibration.sampleCount)) ? { sampleCount: Math.max(0, Math.round(Number(calibration.sampleCount))) } : {}),
    ...(Number.isFinite(finiteOrNull(calibration.trainSampleCount)) ? { trainSampleCount: Math.max(0, Math.round(Number(calibration.trainSampleCount))) } : {}),
    ...(Number.isFinite(finiteOrNull(calibration.holdoutSampleCount)) ? { holdoutSampleCount: Math.max(0, Math.round(Number(calibration.holdoutSampleCount))) } : {}),
    ...(Number.isFinite(finiteOrNull(calibration.skippedPass)) ? { skippedPass: Math.max(0, Math.round(Number(calibration.skippedPass))) } : {}),
    ...(Number.isFinite(finiteOrNull(calibration.skippedInvalid)) ? { skippedInvalid: Math.max(0, Math.round(Number(calibration.skippedInvalid))) } : {}),
  });
}

export function resolveMpcProfile(profile = ACTIVE_MPC_PROFILE) {
  if (!profile || typeof profile !== 'object') {
    return null;
  }

  const source = profile;
  const calibrations = Array.isArray(source.calibrations)
    ? source.calibrations
      .map(normalizeMpcCalibration)
      .filter(Boolean)
    : [];
  const runtime = normalizeMpcRuntimeConfig(source.runtime ?? source.runtimeConfig ?? null);

  return Object.freeze({
    version: Number.isInteger(source.version) ? source.version : 1,
    name: typeof source.name === 'string' && source.name.trim() !== ''
      ? source.name
      : 'calibrated-mpc-profile-v1',
    description: typeof source.description === 'string'
      ? source.description
      : 'shallow/deep search 상관 기반 MPC/ProbCut 보정 프로필입니다.',
    ...(Object.hasOwn(source, 'stage') ? { stage: source.stage } : {}),
    ...(Object.hasOwn(source, 'source') ? { source: cloneJsonCompatible(source.source) } : {}),
    ...(Object.hasOwn(source, 'diagnostics') ? { diagnostics: cloneJsonCompatible(source.diagnostics) } : {}),
    runtime,
    calibrations: Object.freeze(calibrations),
  });
}

export function compileMpcProfile(profile = ACTIVE_MPC_PROFILE) {
  const resolved = resolveMpcProfile(profile);
  if (!resolved) {
    return null;
  }

  const usableCalibrations = resolved.calibrations
    .filter((calibration) => calibration.usable)
    .sort((left, right) => {
      if (right.deepDepth !== left.deepDepth) {
        return right.deepDepth - left.deepDepth;
      }
      if (right.shallowDepth !== left.shallowDepth) {
        return right.shallowDepth - left.shallowDepth;
      }
      return (left.intervalHalfWidth ?? Number.POSITIVE_INFINITY) - (right.intervalHalfWidth ?? Number.POSITIVE_INFINITY);
    });

  const calibrationsByEmptyCount = Array.from({ length: 61 }, () => []);
  for (const calibration of usableCalibrations) {
    for (let empties = calibration.minEmpties; empties <= calibration.maxEmpties; empties += 1) {
      if (empties >= 0 && empties < calibrationsByEmptyCount.length) {
        calibrationsByEmptyCount[empties].push(calibration);
      }
    }
  }

  return Object.freeze({
    ...resolved,
    usableCalibrations: Object.freeze(usableCalibrations),
    calibrationsByEmptyCount: Object.freeze(calibrationsByEmptyCount.map((entries) => Object.freeze([...entries]))),
  });
}

export function makeTrainingProfileFromWeights({
  name = 'trained-phase-linear',
  description = '외부 학습 도구로 생성한 phase bucket linear evaluator입니다.',
  phaseBuckets = [],
  stage = null,
  source = null,
  diagnostics = null,
} = {}) {
  return resolveEvaluationProfile({
    version: 1,
    name,
    description,
    ...(stage ? { stage } : {}),
    ...(source ? { source } : {}),
    ...(diagnostics ? { diagnostics } : {}),
    phaseBuckets,
  });
}

export function makeMoveOrderingTrainingProfileFromWeights({
  name = 'trained-move-ordering',
  description = '외부 학습 도구로 생성한 late move-ordering evaluator입니다.',
  trainedBuckets = [],
  source = null,
  diagnostics = null,
  stage = null,
} = {}) {
  return Object.freeze({
    version: 1,
    name,
    description,
    ...(stage ? { stage } : {}),
    featureKeys: MOVE_ORDERING_FEATURE_KEYS,
    source,
    diagnostics,
    trainedBuckets: Object.freeze(trainedBuckets.map((bucket) => Object.freeze({
      ...(typeof bucket?.key === 'string' ? { key: bucket.key } : {}),
      minEmpties: Number.isInteger(bucket?.minEmpties) ? bucket.minEmpties : 0,
      maxEmpties: Number.isInteger(bucket?.maxEmpties) ? bucket.maxEmpties : 0,
      weights: normalizeMoveOrderingWeights(bucket?.weights ?? {}, moveOrderingFallbackWeightsForEmpties(midpointForBucket(bucket ?? { minEmpties: 0, maxEmpties: 0 }))),
    }))),
  });
}

export function makeTupleResidualTrainingProfileFromWeights({
  name = 'trained-tuple-residual',
  description = '외부 학습 도구로 생성한 tuple residual evaluator입니다.',
  layout = DEFAULT_TUPLE_RESIDUAL_LAYOUT_NAME,
  trainedBuckets = [],
  source = null,
  diagnostics = null,
  calibration = null,
  patch = null,
  stage = null,
} = {}) {
  const resolvedLayout = resolveTupleResidualLayout(layout);
  return Object.freeze({
    version: 1,
    name,
    description,
    ...(stage ? { stage } : {}),
    featureEncoding: 'ternary-side-to-move',
    layout: resolvedLayout,
    ...(source ? { source } : {}),
    ...(diagnostics ? { diagnostics } : {}),
    ...(calibration ? { calibration } : {}),
    ...(patch ? { patch } : {}),
    trainedBuckets: Object.freeze(trainedBuckets.map((bucket) => normalizeTupleResidualBucket(bucket, resolvedLayout))),
  });
}
