#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { SearchEngine } from '../../js/ai/search-engine.js';
import { getPositionalRisk } from '../../js/ai/evaluator.js';
import {
  ACTIVE_EVALUATION_PROFILE,
  ACTIVE_MOVE_ORDERING_PROFILE,
  resolveMoveOrderingBuckets,
} from '../../js/ai/evaluation-profiles.js';
import {
  MOVE_ORDERING_REGRESSION_FEATURE_KEYS,
  collectInputFileEntries,
  createCorrelationAccumulator,
  createMetricAccumulator,
  createMoveOrderingFeatureScratch,
  createPairwiseRankingAccumulator,
  detectKnownDatasetSampleCount,
  displayProjectPath,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  ensureArray,
  fillMoveOrderingRegressionVectorFromState,
  formatDurationSeconds,
  formatInteger,
  loadJsonFileIfPresent,
  moveOrderingSolutionFromWeights,
  parseArgs,
  resolveCliPath,
  summarizeCorrelationAccumulator,
  streamTrainingSamples,
  summarizeMetricAccumulator,
  summarizePairwiseRankingAccumulator,
  updateCorrelationAccumulator,
  updateMetricAccumulator,
  updatePairwiseRankingAccumulator,
} from './lib.mjs';

const STOP = '__STOP_MOVE_ORDERING_AUDIT__';
const TARGET_MODES = new Set(['raw', 'root-mean', 'best-gap']);
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
  Object.freeze({ key: 'endgame-10', minEmpties: 10, maxEmpties: 10 }),
  Object.freeze({ key: 'late-11-12', minEmpties: 11, maxEmpties: 12 }),
  Object.freeze({ key: 'late-13-14', minEmpties: 13, maxEmpties: 14 }),
  Object.freeze({ key: 'late-15-16', minEmpties: 15, maxEmpties: 16 }),
  Object.freeze({ key: 'preexact-17-18', minEmpties: 17, maxEmpties: 18 }),
]);

function printUsage() {
  const toolPath = displayTrainingToolPath('audit-move-ordering-profile.mjs');
  const evaluationProfilePath = displayTrainingOutputPath('trained-evaluation-profile.json');
  const moveOrderingProfilePath = displayTrainingOutputPath('trained-move-ordering-profile.json');
  const outputJsonPath = displayProjectPath('benchmarks', 'move_ordering_audit.json');
  console.log(`Usage:
  node ${toolPath} \
    --input <file-or-dir> [--input <file-or-dir> ...] \
    [--move-ordering-profile ${moveOrderingProfilePath}] \
    [--teacher-evaluation-profile ${evaluationProfilePath}] \
    [--teacher-move-ordering-profile ${moveOrderingProfilePath}] \
    [--child-buckets 10-10,11-12,13-14,15-16,17-18] \
    [--exact-root-max-empties 14] [--exact-root-time-limit-ms 60000] \
    [--teacher-depth 6] [--teacher-time-limit-ms 4000] [--teacher-exact-endgame-empties 14] \
    [--sample-stride 200] [--sample-residue 0] [--max-roots-per-bucket 200] \
    [--target-mode root-mean] \
    [--output-json ${outputJsonPath}]
`);
}

function toFiniteInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
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
    return Object.freeze({ key: `child-${min}-${max}`, minEmpties: min, maxEmpties: max, order: index });
  });

  specs.sort((left, right) => left.minEmpties - right.minEmpties);
  return Object.freeze(specs);
}

function normalizeTargetMode(value, fallback = 'root-mean') {
  if (typeof value !== 'string') {
    return fallback;
  }
  if (value === 'centered' || value === 'mean-centered') {
    return 'root-mean';
  }
  return TARGET_MODES.has(value) ? value : fallback;
}

function shouldStopBucketFill(counts, maxRootsPerBucket) {
  return counts.every((count) => count >= maxRootsPerBucket);
}

function findBucketIndex(bucketSpecs, empties) {
  return bucketSpecs.findIndex((bucket) => empties >= bucket.minEmpties && empties <= bucket.maxEmpties);
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
  return {
    presetKey: 'custom',
    styleKey: 'balanced',
    maxDepth: exactRoot ? Math.max(rootEmpties, 12) : Math.max(1, teacherDepth),
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

function applyRootTargetMode(rawTargets, targetMode) {
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

function summarizeScoredRoot(scoredMoves) {
  const teacherBest = Math.max(...scoredMoves.map((move) => move.rawTarget));
  return {
    top1: (scoredMoves[0]?.rawTarget ?? null) === teacherBest,
    top3: scoredMoves.slice(0, 3).some((move) => move.rawTarget === teacherBest),
    bestRank: scoredMoves.findIndex((move) => move.rawTarget === teacherBest) + 1,
    regret: teacherBest - (scoredMoves[0]?.rawTarget ?? teacherBest),
  };
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
    baselineRoots: createRootRankingAccumulator(),
    baselinePairwise: createPairwiseRankingAccumulator(),
    byFeature: Object.fromEntries(featureKeys.map((key) => [key, {
      roots: createRootRankingAccumulator(),
      pairwise: createPairwiseRankingAccumulator(),
    }])),
  };
}

function summarizeAblationAccumulator(accumulator, featureKeys) {
  const baselineRoots = summarizeRootRankingAccumulator(accumulator.baselineRoots);
  const baselinePairwise = summarizePairwiseRankingAccumulator(accumulator.baselinePairwise);
  return {
    baseline: {
      holdoutRoots: baselineRoots,
      pairwise: baselinePairwise,
    },
    byFeature: featureKeys.map((key) => {
      const roots = summarizeRootRankingAccumulator(accumulator.byFeature[key].roots);
      const pairwise = summarizePairwiseRankingAccumulator(accumulator.byFeature[key].pairwise);
      return {
        key,
        holdoutRoots: roots,
        pairwise,
        deltas: {
          top1Accuracy: roots.top1Accuracy === null || baselineRoots.top1Accuracy === null ? null : roots.top1Accuracy - baselineRoots.top1Accuracy,
          meanRegret: roots.meanRegret === null || baselineRoots.meanRegret === null ? null : roots.meanRegret - baselineRoots.meanRegret,
          pairwiseAccuracy: pairwise.accuracy === null || baselinePairwise.accuracy === null ? null : pairwise.accuracy - baselinePairwise.accuracy,
        },
      };
    }),
  };
}

function summarizeResidualCorrelations(accumulators) {
  return OMITTED_AUDIT_FEATURE_KEYS.map((key) => ({ key, ...summarizeCorrelationAccumulator(accumulators[key]) }))
    .sort((left, right) => Math.abs(right.correlation ?? 0) - Math.abs(left.correlation ?? 0));
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

const candidateProfile = loadJsonFileIfPresent(args['move-ordering-profile']) ?? ACTIVE_MOVE_ORDERING_PROFILE;
if (!candidateProfile) {
  throw new Error('--move-ordering-profile 또는 generated move-ordering profile이 필요합니다.');
}
const candidateBuckets = resolveMoveOrderingBuckets(candidateProfile);

function candidateWeightVectorForEmpties(empties) {
  const bucket = candidateBuckets.find((entry) => empties >= entry.minEmpties && empties <= entry.maxEmpties)
    ?? candidateBuckets[candidateBuckets.length - 1];
  return moveOrderingSolutionFromWeights(bucket.weights);
}
const childBucketSpecs = parseBucketSpecs(args['child-buckets']);
const rootMinEmpties = Math.min(...childBucketSpecs.map((bucket) => bucket.minEmpties)) + 1;
const rootMaxEmpties = Math.max(...childBucketSpecs.map((bucket) => bucket.maxEmpties)) + 1;
const sampleStride = Math.max(1, toFiniteInteger(args['sample-stride'], 200));
const sampleResidue = Math.max(0, toFiniteInteger(args['sample-residue'], 0));
const maxRootsPerBucket = Math.max(1, toFiniteInteger(args['max-roots-per-bucket'], 200));
const exactRootMaxEmpties = Math.max(0, toFiniteInteger(args['exact-root-max-empties'], 14));
const exactRootTimeLimitMs = Math.max(1000, toFiniteInteger(args['exact-root-time-limit-ms'], 60000));
const teacherDepth = Math.max(1, toFiniteInteger(args['teacher-depth'], 6));
const teacherTimeLimitMs = Math.max(250, toFiniteInteger(args['teacher-time-limit-ms'], 4000));
const teacherExactEndgameEmpties = Math.max(0, toFiniteInteger(args['teacher-exact-endgame-empties'], Math.min(14, exactRootMaxEmpties)));
const outputJsonPath = args['output-json'] ? resolveCliPath(args['output-json']) : null;
const targetMode = normalizeTargetMode(args['target-mode'], normalizeTargetMode(candidateProfile?.source?.targetMode, 'root-mean'));
const teacherEvaluationProfile = loadJsonFileIfPresent(args['teacher-evaluation-profile']) ?? ACTIVE_EVALUATION_PROFILE;
const teacherMoveOrderingProfile = loadJsonFileIfPresent(args['teacher-move-ordering-profile']) ?? ACTIVE_MOVE_ORDERING_PROFILE ?? null;
const estimatedTotalSamples = detectKnownDatasetSampleCount(inputFiles) ?? null;

const scratches = childBucketSpecs.map(() => createMoveOrderingFeatureScratch());
const acceptedRootCounts = childBucketSpecs.map(() => 0);
const bucketSummaries = childBucketSpecs.map(() => ({
  rootCount: 0,
  moveMetrics: createMetricAccumulator(),
  rawAlignedMoveMetrics: createMetricAccumulator(),
  rootMetrics: createRootRankingAccumulator(),
  pairwise: createPairwiseRankingAccumulator(),
  ablation: createAblationAccumulator(MOVE_ORDERING_REGRESSION_FEATURE_KEYS),
  contributions: Object.fromEntries(MOVE_ORDERING_REGRESSION_FEATURE_KEYS.map((key) => [key, createContributionAccumulator()])),
  totalContributionAbs: 0,
  residualCorrelations: Object.fromEntries(OMITTED_AUDIT_FEATURE_KEYS.map((key) => [key, createCorrelationAccumulator()])),
}));
const overall = {
  moveMetrics: createMetricAccumulator(),
  rawAlignedMoveMetrics: createMetricAccumulator(),
  rootMetrics: createRootRankingAccumulator(),
  pairwise: createPairwiseRankingAccumulator(),
  ablation: createAblationAccumulator(MOVE_ORDERING_REGRESSION_FEATURE_KEYS),
  contributions: Object.fromEntries(MOVE_ORDERING_REGRESSION_FEATURE_KEYS.map((key) => [key, createContributionAccumulator()])),
  totalContributionAbs: 0,
  residualCorrelations: Object.fromEntries(OMITTED_AUDIT_FEATURE_KEYS.map((key) => [key, createCorrelationAccumulator()])),
};
const skipped = { rootRange: 0, singleMove: 0, stride: 0, bucketFull: 0, incomplete: 0, timeout: 0, depthShort: 0 };
let eligibleRoots = 0;
let scannedSamples = 0;
const startedAt = Date.now();

console.log(`Audit profile        : ${candidateProfile.name ?? 'unnamed-move-ordering'}`);
console.log(`Target mode          : ${targetMode}`);
console.log(`Teacher evaluator    : ${teacherEvaluationProfile?.name ?? 'default-eval'}`);
console.log(`Teacher ordering     : ${teacherMoveOrderingProfile?.name ?? 'default late ordering'}`);
console.log(`Root empties filter  : ${rootMinEmpties}..${rootMaxEmpties}`);
console.log(`Buckets              : ${childBucketSpecs.map((bucket) => `${bucket.minEmpties}-${bucket.maxEmpties}`).join(', ')}`);
if (estimatedTotalSamples) {
  console.log(`Known dataset size   : ${formatInteger(estimatedTotalSamples)} samples`);
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
      if (shouldStopBucketFill(acceptedRootCounts, maxRootsPerBucket)) {
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
    const teacherEngine = new SearchEngine(createTeacherSearchOptions({
      rootEmpties,
      exactRootMaxEmpties,
      exactRootTimeLimitMs,
      teacherDepth,
      teacherTimeLimitMs,
      teacherExactEndgameEmpties,
      evaluationProfile: teacherEvaluationProfile,
      moveOrderingProfile: teacherMoveOrderingProfile,
    }));
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
      const opponentCornerReplies = childCurrentMoves.reduce((sum, candidate) => sum + (candidate.isCorner ? 1 : 0), 0);
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

    acceptedRootCounts[bucketIndex] += 1;
    bucketSummaries[bucketIndex].rootCount += 1;

    const transformedTargets = applyRootTargetMode(moveSamples.map((move) => move.rawTarget), targetMode);
    const weights = candidateWeightVectorForEmpties(childEmpties);
    const scoredMoves = moveSamples.map((move, index) => {
      const predicted = dotProduct(move.vector, weights);
      const contributions = Object.fromEntries(MOVE_ORDERING_REGRESSION_FEATURE_KEYS.map((key, featureIndex) => [key, move.vector[featureIndex] * weights[featureIndex]]));
      return {
        ...move,
        transformedTarget: transformedTargets[index],
        predicted,
        contributions,
      };
    });
    const predictedMean = scoredMoves.reduce((sum, move) => sum + move.predicted, 0) / scoredMoves.length;
    const rawMean = scoredMoves.reduce((sum, move) => sum + move.rawTarget, 0) / scoredMoves.length;
    const rawAlignedOffset = rawMean - predictedMean;

    for (const move of scoredMoves) {
      const residual = move.predicted - move.transformedTarget;
      updateMetricAccumulator(overall.moveMetrics, residual);
      updateMetricAccumulator(bucketSummaries[bucketIndex].moveMetrics, residual);
      updateMetricAccumulator(overall.rawAlignedMoveMetrics, (move.predicted + rawAlignedOffset) - move.rawTarget);
      updateMetricAccumulator(bucketSummaries[bucketIndex].rawAlignedMoveMetrics, (move.predicted + rawAlignedOffset) - move.rawTarget);
      let contributionAbs = 0;
      for (const key of MOVE_ORDERING_REGRESSION_FEATURE_KEYS) {
        const contribution = move.contributions[key];
        updateContributionAccumulator(overall.contributions[key], contribution);
        updateContributionAccumulator(bucketSummaries[bucketIndex].contributions[key], contribution);
        contributionAbs += Math.abs(contribution);
      }
      overall.totalContributionAbs += contributionAbs;
      bucketSummaries[bucketIndex].totalContributionAbs += contributionAbs;
      for (const key of OMITTED_AUDIT_FEATURE_KEYS) {
        updateCorrelationAccumulator(overall.residualCorrelations[key], move.featureRecord[key], residual);
        updateCorrelationAccumulator(bucketSummaries[bucketIndex].residualCorrelations[key], move.featureRecord[key], residual);
      }
    }

    scoredMoves.sort((left, right) => {
      if (right.predicted !== left.predicted) {
        return right.predicted - left.predicted;
      }
      if (right.rawTarget !== left.rawTarget) {
        return right.rawTarget - left.rawTarget;
      }
      return left.index - right.index;
    });

    const rootSummary = summarizeScoredRoot(scoredMoves);
    updateRootRankingAccumulator(overall.rootMetrics, rootSummary);
    updateRootRankingAccumulator(bucketSummaries[bucketIndex].rootMetrics, rootSummary);
    const pairwiseItems = scoredMoves.map((move) => ({ target: move.rawTarget, predicted: move.predicted }));
    updatePairwiseRankingAccumulator(overall.pairwise, pairwiseItems);
    updatePairwiseRankingAccumulator(bucketSummaries[bucketIndex].pairwise, pairwiseItems);
    updateRootRankingAccumulator(overall.ablation.baselineRoots, rootSummary);
    updateRootRankingAccumulator(bucketSummaries[bucketIndex].ablation.baselineRoots, rootSummary);
    updatePairwiseRankingAccumulator(overall.ablation.baselinePairwise, pairwiseItems);
    updatePairwiseRankingAccumulator(bucketSummaries[bucketIndex].ablation.baselinePairwise, pairwiseItems);
    for (const key of MOVE_ORDERING_REGRESSION_FEATURE_KEYS) {
      const ablated = scoredMoves.map((move) => ({ ...move, predicted: move.predicted - move.contributions[key] }))
        .sort((left, right) => {
          if (right.predicted !== left.predicted) {
            return right.predicted - left.predicted;
          }
          if (right.rawTarget !== left.rawTarget) {
            return right.rawTarget - left.rawTarget;
          }
          return left.index - right.index;
        });
      const ablatedSummary = summarizeScoredRoot(ablated);
      updateRootRankingAccumulator(overall.ablation.byFeature[key].roots, ablatedSummary);
      updateRootRankingAccumulator(bucketSummaries[bucketIndex].ablation.byFeature[key].roots, ablatedSummary);
      updatePairwiseRankingAccumulator(overall.ablation.byFeature[key].pairwise, ablated.map((move) => ({ target: move.rawTarget, predicted: move.predicted })));
      updatePairwiseRankingAccumulator(bucketSummaries[bucketIndex].ablation.byFeature[key].pairwise, ablated.map((move) => ({ target: move.rawTarget, predicted: move.predicted })));
    }

    if (shouldStopBucketFill(acceptedRootCounts, maxRootsPerBucket)) {
      throw new Error(STOP);
    }
  });
} catch (error) {
  if (error?.message !== STOP) {
    throw error;
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  auditedProfileName: candidateProfile.name ?? null,
  targetMode,
  teacherConfig: {
    exactRootMaxEmpties,
    exactRootTimeLimitMs,
    teacherDepth,
    teacherTimeLimitMs,
    teacherExactEndgameEmpties,
    teacherEvaluationProfileName: teacherEvaluationProfile?.name ?? null,
    teacherMoveOrderingProfileName: teacherMoveOrderingProfile?.name ?? null,
  },
  sampleConfig: {
    sampleStride,
    sampleResidue,
    maxRootsPerBucket,
    childBuckets: childBucketSpecs,
  },
  scanSummary: {
    scannedSamples,
    eligibleRoots,
    acceptedRoots: acceptedRootCounts.reduce((sum, value) => sum + value, 0),
    skipped,
  },
  overall: {
    moveMetrics: {
      targetMode,
      ...summarizeMetricAccumulator(overall.moveMetrics),
      maeInDiscs: overall.moveMetrics.count > 0 ? (overall.moveMetrics.sumAbsResidual / overall.moveMetrics.count) / 10000 : null,
    },
    moveMetricsRawAligned: {
      alignment: 'per-root-mean',
      ...summarizeMetricAccumulator(overall.rawAlignedMoveMetrics),
      maeInDiscs: overall.rawAlignedMoveMetrics.count > 0 ? (overall.rawAlignedMoveMetrics.sumAbsResidual / overall.rawAlignedMoveMetrics.count) / 10000 : null,
    },
    holdoutRoots: summarizeRootRankingAccumulator(overall.rootMetrics),
    pairwise: summarizePairwiseRankingAccumulator(overall.pairwise),
    featureContribution: MOVE_ORDERING_REGRESSION_FEATURE_KEYS.map((key) => ({
      key,
      ...summarizeContributionAccumulator(overall.contributions[key], overall.totalContributionAbs),
    })),
    ablation: summarizeAblationAccumulator(overall.ablation, MOVE_ORDERING_REGRESSION_FEATURE_KEYS),
    omittedFeatureResidualCorrelation: summarizeResidualCorrelations(overall.residualCorrelations),
  },
  byBucket: childBucketSpecs.map((bucket, index) => ({
    key: bucket.key,
    minEmpties: bucket.minEmpties,
    maxEmpties: bucket.maxEmpties,
    rootCount: bucketSummaries[index].rootCount,
    moveMetrics: {
      targetMode,
      ...summarizeMetricAccumulator(bucketSummaries[index].moveMetrics),
      maeInDiscs: bucketSummaries[index].moveMetrics.count > 0 ? (bucketSummaries[index].moveMetrics.sumAbsResidual / bucketSummaries[index].moveMetrics.count) / 10000 : null,
    },
    moveMetricsRawAligned: {
      alignment: 'per-root-mean',
      ...summarizeMetricAccumulator(bucketSummaries[index].rawAlignedMoveMetrics),
      maeInDiscs: bucketSummaries[index].rawAlignedMoveMetrics.count > 0 ? (bucketSummaries[index].rawAlignedMoveMetrics.sumAbsResidual / bucketSummaries[index].rawAlignedMoveMetrics.count) / 10000 : null,
    },
    holdoutRoots: summarizeRootRankingAccumulator(bucketSummaries[index].rootMetrics),
    pairwise: summarizePairwiseRankingAccumulator(bucketSummaries[index].pairwise),
    featureContribution: MOVE_ORDERING_REGRESSION_FEATURE_KEYS.map((key) => ({
      key,
      ...summarizeContributionAccumulator(bucketSummaries[index].contributions[key], bucketSummaries[index].totalContributionAbs),
    })),
    ablation: summarizeAblationAccumulator(bucketSummaries[index].ablation, MOVE_ORDERING_REGRESSION_FEATURE_KEYS),
    omittedFeatureResidualCorrelation: summarizeResidualCorrelations(bucketSummaries[index].residualCorrelations),
  })),
};

console.log(`Accepted roots       : ${formatInteger(summary.scanSummary.acceptedRoots)} / eligible ${formatInteger(eligibleRoots)} / scanned ${formatInteger(scannedSamples)}`);
console.log(`Elapsed              : ${formatDurationSeconds((Date.now() - startedAt) / 1000)}`);
console.log(`Top-1                : ${summary.overall.holdoutRoots.top1Accuracy === null ? 'n/a' : `${(summary.overall.holdoutRoots.top1Accuracy * 100).toFixed(1)}%`}`);
console.log(`Pairwise             : ${summary.overall.pairwise.accuracy === null ? 'n/a' : `${(summary.overall.pairwise.accuracy * 100).toFixed(1)}%`} / weighted ${summary.overall.pairwise.weightedAccuracy === null ? 'n/a' : `${(summary.overall.pairwise.weightedAccuracy * 100).toFixed(1)}%`}`);
console.log(`Mean regret          : ${summary.overall.holdoutRoots.meanRegret === null ? 'n/a' : `${summary.overall.holdoutRoots.meanRegret.toFixed(1)} (${summary.overall.holdoutRoots.meanRegretInDiscs.toFixed(3)} discs)`}`);
console.log(`Top residual signals : ${summary.overall.omittedFeatureResidualCorrelation.slice(0, 3).map((entry) => `${entry.key}:${entry.correlation === null ? 'n/a' : entry.correlation.toFixed(3)}`).join(', ')}`);

if (outputJsonPath) {
  await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
  await fs.promises.writeFile(outputJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(`Saved audit summary to ${outputJsonPath}`);
}
