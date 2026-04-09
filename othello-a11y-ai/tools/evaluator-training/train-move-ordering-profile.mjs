#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { SearchEngine } from '../../js/ai/search-engine.js';
import { getPositionalRisk } from '../../js/ai/evaluator.js';
import {
  ACTIVE_EVALUATION_PROFILE,
  ACTIVE_MOVE_ORDERING_PROFILE,
  ACTIVE_TUPLE_RESIDUAL_PROFILE,
  ACTIVE_MPC_PROFILE,
  moveOrderingFallbackWeightsForEmpties,
  resolveMoveOrderingBuckets,
} from '../../js/ai/evaluation-profiles.js';
import {
  MOVE_ORDERING_REGRESSION_FEATURE_KEYS,
  addOuterProductInPlace,
  addScaledVectorInPlace,
  buildMoveOrderingProfileFromBucketWeights,
  collectInputFileEntries,
  createCorrelationAccumulator,
  createMetricAccumulator,
  defaultMoveOrderingProfileName,
  createMoveOrderingFeatureScratch,
  createPairwiseRankingAccumulator,
  detectKnownDatasetSampleCount,
  displayGeneratedProfilesModulePath,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  ensureArray,
  fillMoveOrderingRegressionVectorFromState,
  formatDurationSeconds,
  formatInteger,
  loadJsonFileIfPresent,
  moveOrderingSeedSolutionForBucket,
  moveOrderingSolutionFromWeights,
  parseArgs,
  resolveCliPath,
  resolveTrainingOutputPath,
  solveLinearSystem,
  streamTrainingSamples,
  summarizeCorrelationAccumulator,
  summarizeMetricAccumulator,
  summarizePairwiseRankingAccumulator,
  updateCorrelationAccumulator,
  updateMetricAccumulator,
  updatePairwiseRankingAccumulator,
  writeGeneratedProfilesModule,
  zeroMatrix,
  zeroVector,
} from './lib.mjs';

const STOP = '__STOP_MOVE_ORDERING_TRAINING__';
const TARGET_MODES = new Set(['raw', 'root-mean', 'best-gap']);
const ROOT_WEIGHTING_MODES = new Set(['per-move', 'uniform']);
const OMITTED_AUDIT_FEATURE_KEYS = Object.freeze([
  'myMoveCountRaw',
  'opponentMoveCountRaw',
  'opponentCornerReplies',
  'passFlag',
  'flipCount',
  'riskXSquare',
  'riskCSquare',
]);
const DEFAULT_CHILD_BUCKET_SPECS = Object.freeze([
  Object.freeze({ key: 'endgame-10', minEmpties: 10, maxEmpties: 10, label: '끝내기 10' }),
  Object.freeze({ key: 'late-11-12', minEmpties: 11, maxEmpties: 12, label: '후반 11-12' }),
  Object.freeze({ key: 'late-13-14', minEmpties: 13, maxEmpties: 14, label: '후반 13-14' }),
  Object.freeze({ key: 'late-15-16', minEmpties: 15, maxEmpties: 16, label: '후반 15-16' }),
  Object.freeze({ key: 'preexact-17-18', minEmpties: 17, maxEmpties: 18, label: 'pre-exact 17-18' }),
]);

function printUsage() {
  const toolPath = displayTrainingToolPath('train-move-ordering-profile.mjs');
  const evaluationProfilePath = displayTrainingOutputPath('trained-evaluation-profile.json');
  const moveOrderingProfilePath = displayTrainingOutputPath('trained-move-ordering-profile.json');
  const outputModulePath = displayGeneratedProfilesModulePath();
  console.log(`Usage:
  node ${toolPath} \
    --input <file-or-dir> [--input <file-or-dir> ...] \
    [--teacher-evaluation-profile ${evaluationProfilePath}] \
    [--teacher-move-ordering-profile ${moveOrderingProfilePath}] \
    [--child-buckets 10-10,11-12,13-14,15-16,17-18] \
    [--exact-root-max-empties 14] [--exact-root-time-limit-ms 60000] \
    [--teacher-depth 6] [--teacher-time-limit-ms 4000] [--teacher-exact-endgame-empties 14] \
    [--sample-stride 200] [--sample-residue 0] [--max-roots-per-bucket 500] \
    [--holdout-mod 10] [--holdout-residue 0] [--lambda 5000] [--progress-every 20] \
    [--target-mode root-mean] [--root-weighting uniform] [--exact-root-weight-scale 1.0] \
    [--seed-profile path/to/move-ordering-profile.json] \
    [--output-json ${moveOrderingProfilePath}] \
    [--output-module ${outputModulePath}] \
    [--evaluation-profile-json ${evaluationProfilePath}]

입력은 기존 phase-linear 학습과 동일하게 Egaroucid txt / JSONL / NDJSON을 지원합니다.
기본값은 root별 평균 점수를 제거한 root-mean target과 uniform root weighting을 사용합니다.
즉, 절대 score offset보다 root 내부 순서를 더 잘 맞추도록 move-ordering weight를 학습합니다.
`);
}

function toFiniteInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function toFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function parseBucketSpecs(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return DEFAULT_CHILD_BUCKET_SPECS;
  }

  const specs = value.split(',').map((token, index) => {
    const match = /^(\d+)(?:-(\d+))?$/.exec(token.trim());
    if (!match) {
      throw new Error(`잘못된 child bucket 형식: ${token}`);
    }
    const min = Number(match[1]);
    const max = Number(match[2] ?? match[1]);
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max > 60 || min > max) {
      throw new Error(`유효하지 않은 child bucket 범위: ${token}`);
    }
    return Object.freeze({
      key: `child-${min}-${max}`,
      minEmpties: min,
      maxEmpties: max,
      label: `child ${min}-${max}`,
      order: index,
    });
  });

  specs.sort((left, right) => left.minEmpties - right.minEmpties);
  return Object.freeze(specs);
}

function normalizeTargetMode(value) {
  if (typeof value !== 'string') {
    return 'root-mean';
  }
  if (value === 'centered' || value === 'mean-centered') {
    return 'root-mean';
  }
  return TARGET_MODES.has(value) ? value : 'root-mean';
}

function normalizeRootWeighting(value) {
  if (typeof value !== 'string') {
    return 'uniform';
  }
  return ROOT_WEIGHTING_MODES.has(value) ? value : 'uniform';
}

function parseExcludedFeatureKeys(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [];
  }
  const requested = value.split(',').map((token) => token.trim()).filter(Boolean);
  return [...new Set(requested.filter((key) => MOVE_ORDERING_REGRESSION_FEATURE_KEYS.includes(key)))];
}

function findBucketIndex(bucketSpecs, empties) {
  return bucketSpecs.findIndex((bucket) => empties >= bucket.minEmpties && empties <= bucket.maxEmpties);
}

function shouldUseHoldout(rootIndex, holdoutMod, holdoutResidue) {
  return holdoutMod > 0 && (rootIndex % holdoutMod) === holdoutResidue;
}

function midpoint(bucket) {
  return (bucket.minEmpties + bucket.maxEmpties) / 2;
}

function findMatchingSeedBucket(seedBuckets, bucketSpec) {
  return seedBuckets.find((bucket) => {
    if (typeof bucket?.key === 'string' && bucket.key === bucketSpec.key) {
      return true;
    }
    return bucket.minEmpties === bucketSpec.minEmpties && bucket.maxEmpties === bucketSpec.maxEmpties;
  }) ?? null;
}

function createTeacherSearchOptions({
  rootEmpties,
  exactRootMaxEmpties,
  exactRootTimeLimitMs,
  teacherDepth,
  teacherTimeLimitMs,
  teacherExactEndgameEmpties,
  evaluationProfile,
  moveOrderingProfile,
}) {
  const exactRoot = rootEmpties <= exactRootMaxEmpties;
  const maxDepth = exactRoot
    ? Math.max(rootEmpties, 12)
    : Math.max(1, teacherDepth);
  return {
    presetKey: 'custom',
    styleKey: 'balanced',
    maxDepth,
    timeLimitMs: exactRoot ? exactRootTimeLimitMs : teacherTimeLimitMs,
    exactEndgameEmpties: exactRoot ? rootEmpties : teacherExactEndgameEmpties,
    aspirationWindow: exactRoot ? 0 : 40,
    randomness: 0,
    evaluationProfile,
    moveOrderingProfile,
    optimizedFewEmptiesExactSolver: true,
    specializedFewEmptiesExactSolver: true,
    exactFastestFirstOrdering: true,
    enhancedTranspositionCutoff: true,
    enhancedTranspositionCutoffWld: true,
    wldPreExactEmpties: 0,
  };
}

function dotProduct(left, right) {
  let total = 0;
  for (let index = 0; index < left.length; index += 1) {
    total += left[index] * right[index];
  }
  return total;
}

function createRootRankingAccumulator() {
  return {
    count: 0,
    top1: 0,
    top3: 0,
    sumBestRank: 0,
    sumRegret: 0,
    maxRegret: 0,
  };
}

function updateRootRankingAccumulator(accumulator, { top1, top3, bestRank, regret }) {
  accumulator.count += 1;
  accumulator.top1 += top1 ? 1 : 0;
  accumulator.top3 += top3 ? 1 : 0;
  accumulator.sumBestRank += bestRank;
  accumulator.sumRegret += regret;
  accumulator.maxRegret = Math.max(accumulator.maxRegret, regret);
}

function summarizeRootRankingAccumulator(accumulator) {
  if (!accumulator || accumulator.count === 0) {
    return {
      count: 0,
      top1Accuracy: null,
      top3Accuracy: null,
      meanBestRank: null,
      meanRegret: null,
      meanRegretInDiscs: null,
      maxRegret: null,
      maxRegretInDiscs: null,
    };
  }

  return {
    count: accumulator.count,
    top1Accuracy: accumulator.top1 / accumulator.count,
    top3Accuracy: accumulator.top3 / accumulator.count,
    meanBestRank: accumulator.sumBestRank / accumulator.count,
    meanRegret: accumulator.sumRegret / accumulator.count,
    meanRegretInDiscs: accumulator.sumRegret / accumulator.count / 10000,
    maxRegret: accumulator.maxRegret,
    maxRegretInDiscs: accumulator.maxRegret / 10000,
  };
}

function bucketFillText(bucketSpecs, acceptedRootCounts, maxRootsPerBucket) {
  return bucketSpecs.map((bucket, index) => (
    `${bucket.key}:${String(acceptedRootCounts[index]).padStart(3, ' ')}/${String(maxRootsPerBucket).padStart(3, ' ')}`
  )).join(' ');
}

function createContributionAccumulator() {
  return {
    count: 0,
    sumContribution: 0,
    sumAbsContribution: 0,
    maxAbsContribution: 0,
  };
}

function updateContributionAccumulator(accumulator, contribution) {
  accumulator.count += 1;
  accumulator.sumContribution += contribution;
  accumulator.sumAbsContribution += Math.abs(contribution);
  accumulator.maxAbsContribution = Math.max(accumulator.maxAbsContribution, Math.abs(contribution));
}

function summarizeContributionAccumulator(accumulator, totalAbsContribution = null) {
  if (!accumulator || accumulator.count === 0) {
    return {
      count: 0,
      meanContribution: null,
      meanAbsContribution: null,
      maxAbsContribution: null,
      absContributionShare: null,
    };
  }

  return {
    count: accumulator.count,
    meanContribution: accumulator.sumContribution / accumulator.count,
    meanAbsContribution: accumulator.sumAbsContribution / accumulator.count,
    maxAbsContribution: accumulator.maxAbsContribution,
    absContributionShare: Number.isFinite(totalAbsContribution) && totalAbsContribution > 0
      ? accumulator.sumAbsContribution / totalAbsContribution
      : null,
  };
}

function createAblationAccumulator(featureKeys) {
  return {
    rootRanking: createRootRankingAccumulator(),
    pairwise: createPairwiseRankingAccumulator(),
    byFeature: Object.fromEntries(featureKeys.map((key) => [key, {
      rootRanking: createRootRankingAccumulator(),
      pairwise: createPairwiseRankingAccumulator(),
    }])),
  };
}

function summarizeAblationAccumulator(accumulator, featureKeys) {
  const baselineRootRanking = summarizeRootRankingAccumulator(accumulator.rootRanking);
  const baselinePairwise = summarizePairwiseRankingAccumulator(accumulator.pairwise);
  return {
    baseline: {
      holdoutRoots: baselineRootRanking,
      pairwise: baselinePairwise,
    },
    byFeature: featureKeys.map((key) => {
      const entry = accumulator.byFeature[key];
      const holdoutRoots = summarizeRootRankingAccumulator(entry.rootRanking);
      const pairwise = summarizePairwiseRankingAccumulator(entry.pairwise);
      return {
        key,
        holdoutRoots,
        pairwise,
        deltas: {
          top1Accuracy: holdoutRoots.top1Accuracy === null || baselineRootRanking.top1Accuracy === null
            ? null
            : holdoutRoots.top1Accuracy - baselineRootRanking.top1Accuracy,
          top3Accuracy: holdoutRoots.top3Accuracy === null || baselineRootRanking.top3Accuracy === null
            ? null
            : holdoutRoots.top3Accuracy - baselineRootRanking.top3Accuracy,
          meanRegret: holdoutRoots.meanRegret === null || baselineRootRanking.meanRegret === null
            ? null
            : holdoutRoots.meanRegret - baselineRootRanking.meanRegret,
          pairwiseAccuracy: pairwise.accuracy === null || baselinePairwise.accuracy === null
            ? null
            : pairwise.accuracy - baselinePairwise.accuracy,
          weightedPairwiseAccuracy: pairwise.weightedAccuracy === null || baselinePairwise.weightedAccuracy === null
            ? null
            : pairwise.weightedAccuracy - baselinePairwise.weightedAccuracy,
        },
      };
    }),
  };
}

function createResidualCorrelationAccumulators(keys) {
  return Object.fromEntries(keys.map((key) => [key, createCorrelationAccumulator()]));
}

function summarizeResidualCorrelationAccumulators(accumulators, keys) {
  return keys.map((key) => ({
    key,
    ...summarizeCorrelationAccumulator(accumulators[key]),
  })).sort((left, right) => Math.abs(right.correlation ?? 0) - Math.abs(left.correlation ?? 0));
}

function applyRootTargetMode(rawTargets, targetMode) {
  if (!Array.isArray(rawTargets) || rawTargets.length === 0) {
    return [];
  }

  if (targetMode === 'raw') {
    return [...rawTargets];
  }
  if (targetMode === 'best-gap') {
    const best = Math.max(...rawTargets);
    return rawTargets.map((target) => target - best);
  }

  const mean = rawTargets.reduce((sum, target) => sum + target, 0) / rawTargets.length;
  return rawTargets.map((target) => target - mean);
}

function rootMoveWeight(moveCount, rootWeighting, rootWeightScale) {
  const safeScale = Number.isFinite(rootWeightScale) ? rootWeightScale : 1;
  if (rootWeighting === 'uniform') {
    return safeScale / Math.max(1, moveCount);
  }
  return safeScale;
}

function summarizeRootTargetTransform(rawTargets, transformedTargets) {
  if (!Array.isArray(rawTargets) || rawTargets.length === 0 || rawTargets.length !== transformedTargets.length) {
    return {
      rawMean: null,
      rawBest: null,
      transformedMean: null,
      transformedBest: null,
    };
  }

  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    rawMean: mean(rawTargets),
    rawBest: Math.max(...rawTargets),
    transformedMean: mean(transformedTargets),
    transformedBest: Math.max(...transformedTargets),
  };
}

function summarizeScoredRoot(scoredMoves) {
  const teacherBest = Math.max(...scoredMoves.map((move) => move.rawTarget));
  const bestRank = scoredMoves.findIndex((move) => move.rawTarget === teacherBest) + 1;
  const regret = teacherBest - (scoredMoves[0]?.rawTarget ?? teacherBest);
  return {
    top1: (scoredMoves[0]?.rawTarget ?? null) === teacherBest,
    top3: scoredMoves.slice(0, 3).some((move) => move.rawTarget === teacherBest),
    bestRank,
    regret,
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h || (!args.input && !args['input-dir'])) {
  printUsage();
  process.exit(args.help || args.h ? 0 : 1);
}

const requestedInputs = [
  ...ensureArray(args.input),
  ...ensureArray(args['input-dir']),
];
const inputFiles = await collectInputFileEntries(requestedInputs);
if (inputFiles.length === 0) {
  throw new Error('입력 파일을 찾지 못했습니다.');
}

const childBucketSpecs = parseBucketSpecs(args['child-buckets']);
const rootMinEmpties = Math.min(...childBucketSpecs.map((bucket) => bucket.minEmpties)) + 1;
const rootMaxEmpties = Math.max(...childBucketSpecs.map((bucket) => bucket.maxEmpties)) + 1;
const sampleStride = Math.max(1, toFiniteInteger(args['sample-stride'], 200));
const sampleResidue = Math.max(0, toFiniteInteger(args['sample-residue'], 0));
const maxRootsPerBucket = Math.max(1, toFiniteInteger(args['max-roots-per-bucket'], 500));
const holdoutMod = Math.max(0, toFiniteInteger(args['holdout-mod'], 10));
const holdoutResidue = Math.max(0, toFiniteInteger(args['holdout-residue'], 0));
const regularization = Math.max(0, toFiniteNumber(args.lambda ?? args.l2, 5000));
const progressEvery = Math.max(0, toFiniteInteger(args['progress-every'], 20));
const exactRootMaxEmpties = Math.max(0, toFiniteInteger(args['exact-root-max-empties'], 14));
const exactRootTimeLimitMs = Math.max(1000, toFiniteInteger(args['exact-root-time-limit-ms'], 60000));
const teacherDepth = Math.max(1, toFiniteInteger(args['teacher-depth'], 6));
const teacherTimeLimitMs = Math.max(250, toFiniteInteger(args['teacher-time-limit-ms'], 4000));
const teacherExactEndgameEmpties = Math.max(0, toFiniteInteger(args['teacher-exact-endgame-empties'], Math.min(14, exactRootMaxEmpties)));
const targetMode = normalizeTargetMode(args['target-mode']);
const rootWeighting = normalizeRootWeighting(args['root-weighting']);
const exactRootWeightScale = Math.max(0, toFiniteNumber(args['exact-root-weight-scale'], 1));
const excludedFeatureKeys = parseExcludedFeatureKeys(args['exclude-features']);
const excludedFeatureIndexSet = new Set(excludedFeatureKeys.map((key) => MOVE_ORDERING_REGRESSION_FEATURE_KEYS.indexOf(key)).filter((index) => index >= 0));
const outputJsonPath = args['output-json'] ? resolveCliPath(args['output-json']) : resolveTrainingOutputPath('trained-move-ordering-profile.json');
const outputModulePath = args['output-module'] ? resolveCliPath(args['output-module']) : null;
const teacherEvaluationProfileInput = loadJsonFileIfPresent(args['teacher-evaluation-profile']);
const moduleEvaluationProfileInput = loadJsonFileIfPresent(args['evaluation-profile-json']);
const teacherMoveOrderingProfileInput = loadJsonFileIfPresent(args['teacher-move-ordering-profile']);
const seedProfileInput = loadJsonFileIfPresent(args['seed-profile']);
const profileName = typeof args.name === 'string' ? args.name : defaultMoveOrderingProfileName();
const description = typeof args.description === 'string'
  ? args.description
  : 'late move-ordering evaluator를 root-centered ranking 회귀와 진단 포함 파이프라인으로 재추정한 프로필입니다.';
const estimatedTotalSamples = detectKnownDatasetSampleCount(inputFiles) ?? null;
const teacherEvaluationProfile = teacherEvaluationProfileInput ?? ACTIVE_EVALUATION_PROFILE;
const teacherMoveOrderingProfile = teacherMoveOrderingProfileInput ?? ACTIVE_MOVE_ORDERING_PROFILE ?? null;
const moduleEvaluationProfile = moduleEvaluationProfileInput ?? teacherEvaluationProfile ?? ACTIVE_EVALUATION_PROFILE;
const moduleTupleResidualProfile = ACTIVE_TUPLE_RESIDUAL_PROFILE ?? null;
const moduleMpcProfile = ACTIVE_MPC_PROFILE ?? null;

const seedBuckets = resolveMoveOrderingBuckets(seedProfileInput ?? null);
const dimension = MOVE_ORDERING_REGRESSION_FEATURE_KEYS.length;
const priorSolutions = childBucketSpecs.map((bucketSpec) => {
  const matchedSeedBucket = findMatchingSeedBucket(seedBuckets, bucketSpec);
  const solution = matchedSeedBucket
    ? moveOrderingSolutionFromWeights(matchedSeedBucket.weights)
    : moveOrderingSeedSolutionForBucket({
      minEmpties: bucketSpec.minEmpties,
      maxEmpties: bucketSpec.maxEmpties,
      weights: moveOrderingFallbackWeightsForEmpties(midpoint(bucketSpec)),
    });
  for (const featureIndex of excludedFeatureIndexSet) {
    solution[featureIndex] = 0;
  }
  return solution;
});

const bucketStats = childBucketSpecs.map(() => ({
  xtx: zeroMatrix(dimension),
  xty: zeroVector(dimension),
  trainMoveCount: 0,
  holdoutMoveCount: 0,
  trainRootCount: 0,
  holdoutRootCount: 0,
  exactRootCount: 0,
  depthRootCount: 0,
  rootWeightSum: 0,
}));
const scratches = childBucketSpecs.map(() => createMoveOrderingFeatureScratch());
const acceptedRootCounts = childBucketSpecs.map(() => 0);
const holdoutRoots = [];
const skipped = {
  rootRange: 0,
  noMoves: 0,
  singleMove: 0,
  stride: 0,
  bucketFull: 0,
  incomplete: 0,
  timeout: 0,
  depthShort: 0,
  other: 0,
};

let scannedSamples = 0;
let eligibleRoots = 0;
let acceptedRoots = 0;
const startedAt = Date.now();

console.log(`Move-ordering training on ${inputFiles.length} file(s).`);
console.log(`child buckets: ${childBucketSpecs.map((bucket) => `${bucket.minEmpties}-${bucket.maxEmpties}`).join(', ')}`);
console.log(`root empties filter: ${rootMinEmpties}..${rootMaxEmpties}`);
console.log(`teacher: exact<=${exactRootMaxEmpties} empties, otherwise depth=${teacherDepth}, time=${teacherTimeLimitMs}ms`);
console.log(`teacher evaluator: ${teacherEvaluationProfile?.name ?? 'default-eval'} | teacher move-ordering: ${teacherMoveOrderingProfile?.name ?? 'default late ordering'}`);
console.log(`sampling: stride=${sampleStride}, maxRootsPerBucket=${maxRootsPerBucket}, holdoutMod=${holdoutMod}, lambda=${regularization}`);
console.log(`targets : mode=${targetMode}, rootWeighting=${rootWeighting}, exactRootWeightScale=${exactRootWeightScale}`);
if (excludedFeatureKeys.length > 0) {
  console.log(`exclude : ${excludedFeatureKeys.join(', ')}`);
}
if (estimatedTotalSamples) {
  console.log(`Known dataset size: ${formatInteger(estimatedTotalSamples)} samples`);
}

try {
  await streamTrainingSamples(inputFiles, { targetScale: 3000 }, ({ state, sampleIndex }) => {
    scannedSamples = sampleIndex + 1;
    const rootEmpties = state.getEmptyCount();
    if (rootEmpties < rootMinEmpties || rootEmpties > rootMaxEmpties) {
      skipped.rootRange += 1;
      return;
    }

    const rootMoves = state.getSearchMoves();
    if (rootMoves.length === 0) {
      skipped.noMoves += 1;
      return;
    }
    if (rootMoves.length <= 1) {
      skipped.singleMove += 1;
      return;
    }

    const childEmpties = rootEmpties - 1;
    const bucketIndex = findBucketIndex(childBucketSpecs, childEmpties);
    if (bucketIndex < 0) {
      skipped.rootRange += 1;
      return;
    }

    if (acceptedRootCounts[bucketIndex] >= maxRootsPerBucket) {
      skipped.bucketFull += 1;
      if (acceptedRootCounts.every((count) => count >= maxRootsPerBucket)) {
        throw new Error(STOP);
      }
      return;
    }

    const eligibleRootIndex = eligibleRoots;
    eligibleRoots += 1;
    if ((eligibleRootIndex % sampleStride) !== sampleResidue) {
      skipped.stride += 1;
      return;
    }

    const exactTeacher = rootEmpties <= exactRootMaxEmpties;
    const teacherOptions = createTeacherSearchOptions({
      rootEmpties,
      exactRootMaxEmpties,
      exactRootTimeLimitMs,
      teacherDepth,
      teacherTimeLimitMs,
      teacherExactEndgameEmpties,
      evaluationProfile: teacherEvaluationProfile,
      moveOrderingProfile: teacherMoveOrderingProfile,
    });
    const teacherEngine = new SearchEngine(teacherOptions);
    const teacherResult = teacherEngine.findBestMove(state);

    if (teacherResult.searchCompletion !== 'complete') {
      skipped.timeout += 1;
      return;
    }
    if ((teacherResult.analyzedMoves?.length ?? 0) !== rootMoves.length || (teacherResult.rootAnalyzedMoveCount ?? 0) !== rootMoves.length) {
      skipped.incomplete += 1;
      return;
    }
    if (!exactTeacher && Number(teacherResult.stats?.completedDepth ?? 0) < teacherDepth) {
      skipped.depthShort += 1;
      return;
    }

    const legalMovesByIndex = new Map(rootMoves.map((move) => [move.index, move]));
    const moveSamples = [];
    for (const analyzedMove of teacherResult.analyzedMoves ?? []) {
      const move = legalMovesByIndex.get(analyzedMove.index);
      if (!move) {
        continue;
      }
      const childState = state.applyMoveFast(move.index, move.flips ?? null);
      const childCurrentMoves = childState.getLegalMoves();
      const opponentCornerReplies = childCurrentMoves.reduce((sum, candidate) => (
        sum + (candidate.isCorner ? 1 : 0)
      ), 0);
      const riskType = getPositionalRisk(move.index);
      const { record, vector } = fillMoveOrderingRegressionVectorFromState(
        childState,
        state.currentPlayer,
        scratches[bucketIndex],
        {
          empties: childState.getEmptyCount(),
          opponentMoveCount: childCurrentMoves.length,
          opponentCornerReplies,
          flipCount: move.flipCount,
          riskType,
        },
      );
      for (const featureIndex of excludedFeatureIndexSet) {
        vector[featureIndex] = 0;
      }
      moveSamples.push({
        index: analyzedMove.index,
        coord: analyzedMove.coord ?? move.coord,
        rawTarget: Number(analyzedMove.score),
        vector,
        featureRecord: {
          ...record,
          opponentCornerReplies,
          flipCount: move.flipCount,
          riskXSquare: riskType === 'x-square' ? 1 : 0,
          riskCSquare: riskType === 'c-square' ? 1 : 0,
        },
      });
    }

    if (moveSamples.length !== rootMoves.length) {
      skipped.incomplete += 1;
      return;
    }

    const transformedTargets = applyRootTargetMode(moveSamples.map((sample) => sample.rawTarget), targetMode);
    const acceptedRootIndex = acceptedRoots;
    acceptedRoots += 1;
    acceptedRootCounts[bucketIndex] += 1;
    const holdout = shouldUseHoldout(acceptedRootIndex, holdoutMod, holdoutResidue);
    const bucket = bucketStats[bucketIndex];
    const rootWeightScale = exactTeacher ? exactRootWeightScale : 1;
    const moveWeight = rootMoveWeight(moveSamples.length, rootWeighting, rootWeightScale);

    if (holdout) {
      bucket.holdoutRootCount += 1;
    } else {
      bucket.trainRootCount += 1;
    }
    if (exactTeacher) {
      bucket.exactRootCount += 1;
    } else {
      bucket.depthRootCount += 1;
    }
    bucket.rootWeightSum += moveWeight * moveSamples.length;

    const holdoutRootRecord = holdout ? {
      key: childBucketSpecs[bucketIndex].key,
      rootEmpties,
      childEmpties,
      teacherMode: exactTeacher ? 'exact' : 'depth',
      moveCount: moveSamples.length,
      targetMode,
      targetSummary: summarizeRootTargetTransform(
        moveSamples.map((sample) => sample.rawTarget),
        transformedTargets,
      ),
      moves: [],
    } : null;

    for (let index = 0; index < moveSamples.length; index += 1) {
      const sample = moveSamples[index];
      sample.transformedTarget = transformedTargets[index];
      sample.sampleWeight = moveWeight;

      if (holdout) {
        bucket.holdoutMoveCount += 1;
        holdoutRootRecord.moves.push({
          index: sample.index,
          coord: sample.coord,
          rawTarget: sample.rawTarget,
          transformedTarget: sample.transformedTarget,
          vector: sample.vector,
          featureRecord: sample.featureRecord,
        });
      } else {
        addOuterProductInPlace(bucket.xtx, sample.vector, sample.sampleWeight);
        addScaledVectorInPlace(bucket.xty, sample.vector, sample.transformedTarget * sample.sampleWeight);
        bucket.trainMoveCount += 1;
      }
    }

    if (holdout && holdoutRootRecord.moves.length > 1) {
      holdoutRoots.push(holdoutRootRecord);
    }

    if (progressEvery > 0 && acceptedRoots % progressEvery === 0) {
      const elapsedSeconds = Math.max(1, (Date.now() - startedAt) / 1000);
      console.log(
        `[teacher] roots=${formatInteger(acceptedRoots)} eligible=${formatInteger(eligibleRoots)} scanned=${formatInteger(scannedSamples)} `
        + `speed=${(acceptedRoots / elapsedSeconds).toFixed(2)} root/s elapsed=${formatDurationSeconds(elapsedSeconds)}\n`
        + `          fill ${bucketFillText(childBucketSpecs, acceptedRootCounts, maxRootsPerBucket)}\n`
        + `          skipped timeout=${formatInteger(skipped.timeout)} incomplete=${formatInteger(skipped.incomplete)} depthShort=${formatInteger(skipped.depthShort)} stride=${formatInteger(skipped.stride)}`,
      );
    }

    if (acceptedRootCounts.every((count) => count >= maxRootsPerBucket)) {
      throw new Error(STOP);
    }
  });
} catch (error) {
  if (error?.message !== STOP) {
    throw error;
  }
}

const solvedWeightVectors = bucketStats.map((stats, bucketIndex) => {
  if (stats.trainMoveCount === 0) {
    return [...priorSolutions[bucketIndex]];
  }

  const systemMatrix = stats.xtx.map((row, rowIndex) => row.map((value, colIndex) => (
    value + (rowIndex === colIndex ? regularization : 0)
  )));
  const systemVector = stats.xty.map((value, index) => value + (regularization * priorSolutions[bucketIndex][index]));
  const solution = solveLinearSystem(systemMatrix, systemVector) ?? [...priorSolutions[bucketIndex]];
  for (const featureIndex of excludedFeatureIndexSet) {
    solution[featureIndex] = 0;
  }
  return solution;
});

const overallMoveMetrics = createMetricAccumulator();
const overallRawAlignedMetrics = createMetricAccumulator();
const moveMetricsByBucket = childBucketSpecs.map(() => createMetricAccumulator());
const rawAlignedMoveMetricsByBucket = childBucketSpecs.map(() => createMetricAccumulator());
const overallRootMetrics = createRootRankingAccumulator();
const rootMetricsByBucket = childBucketSpecs.map(() => createRootRankingAccumulator());
const overallPairwiseMetrics = createPairwiseRankingAccumulator();
const pairwiseMetricsByBucket = childBucketSpecs.map(() => createPairwiseRankingAccumulator());
const featureContributionAccumulators = childBucketSpecs.map(() => Object.fromEntries(
  MOVE_ORDERING_REGRESSION_FEATURE_KEYS.map((key) => [key, createContributionAccumulator()]),
));
const totalContributionAbsByBucket = childBucketSpecs.map(() => 0);
const totalContributionAbsOverall = { value: 0 };
const ablationAccumulators = childBucketSpecs.map(() => createAblationAccumulator(MOVE_ORDERING_REGRESSION_FEATURE_KEYS));
const overallAblationAccumulator = createAblationAccumulator(MOVE_ORDERING_REGRESSION_FEATURE_KEYS);
const residualCorrelationAccumulators = childBucketSpecs.map(() => createResidualCorrelationAccumulators(OMITTED_AUDIT_FEATURE_KEYS));
const overallResidualCorrelationAccumulator = createResidualCorrelationAccumulators(OMITTED_AUDIT_FEATURE_KEYS);

for (const rootRecord of holdoutRoots) {
  const bucketIndex = findBucketIndex(childBucketSpecs, rootRecord.childEmpties);
  if (bucketIndex < 0) {
    continue;
  }

  const scoredMoves = rootRecord.moves.map((move) => {
    const predicted = dotProduct(move.vector, solvedWeightVectors[bucketIndex]);
    const contributions = Object.fromEntries(MOVE_ORDERING_REGRESSION_FEATURE_KEYS.map((key, featureIndex) => (
      [key, move.vector[featureIndex] * solvedWeightVectors[bucketIndex][featureIndex]]
    )));
    return {
      ...move,
      predicted,
      contributions,
    };
  });

  const predictedMean = scoredMoves.reduce((sum, move) => sum + move.predicted, 0) / scoredMoves.length;
  const rawMean = rootRecord.targetSummary.rawMean ?? 0;
  const rawAlignedOffset = rawMean - predictedMean;

  for (const move of scoredMoves) {
    const residual = move.predicted - move.transformedTarget;
    updateMetricAccumulator(overallMoveMetrics, residual);
    updateMetricAccumulator(moveMetricsByBucket[bucketIndex], residual);

    const rawAlignedResidual = (move.predicted + rawAlignedOffset) - move.rawTarget;
    updateMetricAccumulator(overallRawAlignedMetrics, rawAlignedResidual);
    updateMetricAccumulator(rawAlignedMoveMetricsByBucket[bucketIndex], rawAlignedResidual);

    let contributionMagnitude = 0;
    for (const key of MOVE_ORDERING_REGRESSION_FEATURE_KEYS) {
      const contribution = move.contributions[key];
      updateContributionAccumulator(featureContributionAccumulators[bucketIndex][key], contribution);
      contributionMagnitude += Math.abs(contribution);
    }
    totalContributionAbsByBucket[bucketIndex] += contributionMagnitude;
    totalContributionAbsOverall.value += contributionMagnitude;

    for (const key of OMITTED_AUDIT_FEATURE_KEYS) {
      updateCorrelationAccumulator(overallResidualCorrelationAccumulator[key], move.featureRecord[key], residual);
      updateCorrelationAccumulator(residualCorrelationAccumulators[bucketIndex][key], move.featureRecord[key], residual);
    }
  }

  const rankedScoredMoves = [...scoredMoves].sort((left, right) => {
    if (right.predicted !== left.predicted) {
      return right.predicted - left.predicted;
    }
    if (right.rawTarget !== left.rawTarget) {
      return right.rawTarget - left.rawTarget;
    }
    return left.index - right.index;
  });

  const rootSummary = summarizeScoredRoot(rankedScoredMoves);
  updateRootRankingAccumulator(overallRootMetrics, rootSummary);
  updateRootRankingAccumulator(rootMetricsByBucket[bucketIndex], rootSummary);
  updatePairwiseRankingAccumulator(overallPairwiseMetrics, rankedScoredMoves.map((move) => ({ target: move.rawTarget, predicted: move.predicted })));
  updatePairwiseRankingAccumulator(pairwiseMetricsByBucket[bucketIndex], rankedScoredMoves.map((move) => ({ target: move.rawTarget, predicted: move.predicted })));
  updateRootRankingAccumulator(overallAblationAccumulator.rootRanking, rootSummary);
  updateRootRankingAccumulator(ablationAccumulators[bucketIndex].rootRanking, rootSummary);
  updatePairwiseRankingAccumulator(overallAblationAccumulator.pairwise, rankedScoredMoves.map((move) => ({ target: move.rawTarget, predicted: move.predicted })));
  updatePairwiseRankingAccumulator(ablationAccumulators[bucketIndex].pairwise, rankedScoredMoves.map((move) => ({ target: move.rawTarget, predicted: move.predicted })));

  for (const key of MOVE_ORDERING_REGRESSION_FEATURE_KEYS) {
    const ablated = rankedScoredMoves.map((move) => ({
      ...move,
      predicted: move.predicted - move.contributions[key],
    })).sort((left, right) => {
      if (right.predicted !== left.predicted) {
        return right.predicted - left.predicted;
      }
      if (right.rawTarget !== left.rawTarget) {
        return right.rawTarget - left.rawTarget;
      }
      return left.index - right.index;
    });

    const ablatedSummary = summarizeScoredRoot(ablated);
    updateRootRankingAccumulator(overallAblationAccumulator.byFeature[key].rootRanking, ablatedSummary);
    updateRootRankingAccumulator(ablationAccumulators[bucketIndex].byFeature[key].rootRanking, ablatedSummary);
    updatePairwiseRankingAccumulator(overallAblationAccumulator.byFeature[key].pairwise, ablated.map((move) => ({ target: move.rawTarget, predicted: move.predicted })));
    updatePairwiseRankingAccumulator(ablationAccumulators[bucketIndex].byFeature[key].pairwise, ablated.map((move) => ({ target: move.rawTarget, predicted: move.predicted })));
  }
}

const diagnostics = {
  bucketCounts: childBucketSpecs.map((bucket, index) => ({
    key: bucket.key,
    minEmpties: bucket.minEmpties,
    maxEmpties: bucket.maxEmpties,
    trainRootCount: bucketStats[index].trainRootCount,
    holdoutRootCount: bucketStats[index].holdoutRootCount,
    trainMoveCount: bucketStats[index].trainMoveCount,
    holdoutMoveCount: bucketStats[index].holdoutMoveCount,
    exactRootCount: bucketStats[index].exactRootCount,
    depthRootCount: bucketStats[index].depthRootCount,
    rootWeightSum: bucketStats[index].rootWeightSum,
  })),
  holdoutMoves: {
    targetMode,
    ...summarizeMetricAccumulator(overallMoveMetrics),
    maeInDiscs: overallMoveMetrics.count > 0 ? (overallMoveMetrics.sumAbsResidual / overallMoveMetrics.count) / 10000 : null,
    rmseInDiscs: summarizeMetricAccumulator(overallMoveMetrics).rmse === null ? null : summarizeMetricAccumulator(overallMoveMetrics).rmse / 10000,
  },
  holdoutMovesRawAligned: {
    alignment: 'per-root-mean',
    ...summarizeMetricAccumulator(overallRawAlignedMetrics),
    maeInDiscs: overallRawAlignedMetrics.count > 0 ? (overallRawAlignedMetrics.sumAbsResidual / overallRawAlignedMetrics.count) / 10000 : null,
    rmseInDiscs: summarizeMetricAccumulator(overallRawAlignedMetrics).rmse === null ? null : summarizeMetricAccumulator(overallRawAlignedMetrics).rmse / 10000,
  },
  holdoutRoots: summarizeRootRankingAccumulator(overallRootMetrics),
  holdoutPairwise: summarizePairwiseRankingAccumulator(overallPairwiseMetrics),
  featureContribution: {
    overall: MOVE_ORDERING_REGRESSION_FEATURE_KEYS.map((key) => ({
      key,
      ...summarizeContributionAccumulator(
        Object.values(featureContributionAccumulators).reduce((aggregate, byFeature) => {
          const current = byFeature[key];
          aggregate.count += current.count;
          aggregate.sumContribution += current.sumContribution;
          aggregate.sumAbsContribution += current.sumAbsContribution;
          aggregate.maxAbsContribution = Math.max(aggregate.maxAbsContribution, current.maxAbsContribution);
          return aggregate;
        }, createContributionAccumulator()),
        totalContributionAbsOverall.value,
      ),
    })),
    byBucket: childBucketSpecs.map((bucket, index) => ({
      key: bucket.key,
      minEmpties: bucket.minEmpties,
      maxEmpties: bucket.maxEmpties,
      features: MOVE_ORDERING_REGRESSION_FEATURE_KEYS.map((key) => ({
        key,
        ...summarizeContributionAccumulator(featureContributionAccumulators[index][key], totalContributionAbsByBucket[index]),
      })),
    })),
  },
  ablationAudit: {
    overall: summarizeAblationAccumulator(overallAblationAccumulator, MOVE_ORDERING_REGRESSION_FEATURE_KEYS),
    byBucket: childBucketSpecs.map((bucket, index) => ({
      key: bucket.key,
      minEmpties: bucket.minEmpties,
      maxEmpties: bucket.maxEmpties,
      ...summarizeAblationAccumulator(ablationAccumulators[index], MOVE_ORDERING_REGRESSION_FEATURE_KEYS),
    })),
  },
  omittedFeatureResidualCorrelation: {
    overall: summarizeResidualCorrelationAccumulators(overallResidualCorrelationAccumulator, OMITTED_AUDIT_FEATURE_KEYS),
    byBucket: childBucketSpecs.map((bucket, index) => ({
      key: bucket.key,
      minEmpties: bucket.minEmpties,
      maxEmpties: bucket.maxEmpties,
      correlations: summarizeResidualCorrelationAccumulators(residualCorrelationAccumulators[index], OMITTED_AUDIT_FEATURE_KEYS),
    })),
  },
  byBucket: childBucketSpecs.map((bucket, index) => ({
    key: bucket.key,
    minEmpties: bucket.minEmpties,
    maxEmpties: bucket.maxEmpties,
    holdoutMoves: {
      targetMode,
      ...summarizeMetricAccumulator(moveMetricsByBucket[index]),
      maeInDiscs: summarizeMetricAccumulator(moveMetricsByBucket[index]).mae === null ? null : summarizeMetricAccumulator(moveMetricsByBucket[index]).mae / 10000,
      rmseInDiscs: summarizeMetricAccumulator(moveMetricsByBucket[index]).rmse === null ? null : summarizeMetricAccumulator(moveMetricsByBucket[index]).rmse / 10000,
    },
    holdoutMovesRawAligned: {
      alignment: 'per-root-mean',
      ...summarizeMetricAccumulator(rawAlignedMoveMetricsByBucket[index]),
      maeInDiscs: summarizeMetricAccumulator(rawAlignedMoveMetricsByBucket[index]).mae === null ? null : summarizeMetricAccumulator(rawAlignedMoveMetricsByBucket[index]).mae / 10000,
      rmseInDiscs: summarizeMetricAccumulator(rawAlignedMoveMetricsByBucket[index]).rmse === null ? null : summarizeMetricAccumulator(rawAlignedMoveMetricsByBucket[index]).rmse / 10000,
    },
    holdoutRoots: summarizeRootRankingAccumulator(rootMetricsByBucket[index]),
    holdoutPairwise: summarizePairwiseRankingAccumulator(pairwiseMetricsByBucket[index]),
  })),
  teacherConfig: {
    exactRootMaxEmpties,
    exactRootTimeLimitMs,
    teacherDepth,
    teacherTimeLimitMs,
    teacherExactEndgameEmpties,
  },
  sampling: {
    sampleStride,
    sampleResidue,
    maxRootsPerBucket,
    holdoutMod,
    holdoutResidue,
    targetMode,
    rootWeighting,
    exactRootWeightScale,
    excludedFeatureKeys,
  },
  scanSummary: {
    scannedSamples,
    eligibleRoots,
    acceptedRoots,
    skipped,
  },
  createdAt: new Date().toISOString(),
};

const trainedProfile = buildMoveOrderingProfileFromBucketWeights(childBucketSpecs, solvedWeightVectors, {
  name: profileName,
  description,
  source: {
    inputFiles: inputFiles.map((entry) => entry.path),
    teacherEvaluationProfileName: teacherEvaluationProfile?.name ?? null,
    teacherEvaluationProfilePath: args['teacher-evaluation-profile'] ? resolveCliPath(args['teacher-evaluation-profile']) : null,
    teacherMoveOrderingProfileName: teacherMoveOrderingProfile?.name ?? null,
    teacherMoveOrderingProfilePath: args['teacher-move-ordering-profile'] ? resolveCliPath(args['teacher-move-ordering-profile']) : null,
    regularization,
    scannedSamples,
    eligibleRoots,
    acceptedRoots,
    targetMode,
    rootWeighting,
    exactRootWeightScale,
    excludedFeatureKeys,
  },
  diagnostics,
});

await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
await fs.promises.writeFile(outputJsonPath, `${JSON.stringify(trainedProfile, null, 2)}\n`, 'utf8');
let savedModulePath = null;
if (outputModulePath) {
  savedModulePath = await writeGeneratedProfilesModule(outputModulePath, {
    evaluationProfile: moduleEvaluationProfile,
    moveOrderingProfile: trainedProfile,
    tupleResidualProfile: moduleTupleResidualProfile,
    mpcProfile: moduleMpcProfile,
  });
}

const elapsedSeconds = (Date.now() - startedAt) / 1000;
console.log(`Accepted roots: ${formatInteger(acceptedRoots)} / eligible ${formatInteger(eligibleRoots)} / scanned ${formatInteger(scannedSamples)}`);
console.log(`Elapsed: ${formatDurationSeconds(elapsedSeconds)}`);
console.log(`Saved JSON profile to ${outputJsonPath}`);
if (savedModulePath) {
  console.log(`Saved combined generated module to ${savedModulePath}`);
  console.log(`  preserved tuple residual slot : ${moduleTupleResidualProfile?.name ?? 'null'}`);
  console.log(`  preserved mpc slot            : ${moduleMpcProfile?.name ?? 'null'}`);
}
console.log(`Holdout root top-1: ${diagnostics.holdoutRoots.top1Accuracy === null ? 'n/a' : `${(diagnostics.holdoutRoots.top1Accuracy * 100).toFixed(1)}%`}`);
console.log(`Holdout pairwise: ${diagnostics.holdoutPairwise.accuracy === null ? 'n/a' : `${(diagnostics.holdoutPairwise.accuracy * 100).toFixed(1)}%`} (weighted ${diagnostics.holdoutPairwise.weightedAccuracy === null ? 'n/a' : `${(diagnostics.holdoutPairwise.weightedAccuracy * 100).toFixed(1)}%`})`);
console.log(`Holdout mean regret: ${diagnostics.holdoutRoots.meanRegret === null ? 'n/a' : `${diagnostics.holdoutRoots.meanRegret.toFixed(1)} (${diagnostics.holdoutRoots.meanRegretInDiscs.toFixed(3)} discs)`}`);
for (const bucket of diagnostics.bucketCounts) {
  const byBucket = diagnostics.byBucket.find((candidate) => candidate.key === bucket.key) ?? null;
  console.log(
    `  ${bucket.key.padEnd(14)} trainRoots=${String(bucket.trainRootCount).padStart(4)} holdoutRoots=${String(bucket.holdoutRootCount).padStart(4)} `
    + `trainMoves=${String(bucket.trainMoveCount).padStart(5)} holdoutTop1=${byBucket?.holdoutRoots?.top1Accuracy === null || byBucket?.holdoutRoots?.top1Accuracy === undefined ? 'n/a' : `${(byBucket.holdoutRoots.top1Accuracy * 100).toFixed(1)}%`}`,
  );
}
