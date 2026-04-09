#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { Evaluator, createEmptyEvaluationFeatureRecord, populateEvaluationFeatureRecord } from '../../js/ai/evaluator.js';
import { SearchEngine } from '../../js/ai/search-engine.js';
import { ACTIVE_EVALUATION_PROFILE, DEFAULT_EVALUATION_PROFILE, EVALUATION_FEATURE_KEYS } from '../../js/ai/evaluation-profiles.js';
import { playSeededRandomUntilEmptyCount } from '../../js/test/benchmark-helpers.mjs';
import {
  REGRESSION_FEATURE_KEYS,
  bucketIndexForEmpties,
  calculateTotalInputBytes,
  collectInputFileEntries,
  createCorrelationAccumulator,
  createMetricAccumulator,
  detectKnownDatasetSampleCount,
  displayProjectPath,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  ensureArray,
  formatDurationSeconds,
  formatInteger,
  loadJsonFileIfPresent,
  parseArgs,
  resolveCliPath,
  resolveSeedProfile,
  streamTrainingSamples,
  summarizeCorrelationAccumulator,
  summarizeMetricAccumulator,
  updateCorrelationAccumulator,
  updateMetricAccumulator,
} from './lib.mjs';

const OMITTED_AUDIT_FEATURE_KEYS = Object.freeze([
  'myMoveCount',
  'opponentMoveCount',
  'cornerMoveCount',
  'opponentCornerMoveCount',
  'stableDiscs',
  'opponentStableDiscs',
  'parityRegionCount',
  'parityOddRegions',
  'parityEvenRegions',
]);

const RANDOM_EXACT_DEFAULT_EMPTIES = Object.freeze([14, 13, 12, 11, 10, 9, 8, 7]);
const DEFAULT_RANDOM_EXACT_SEARCH_OPTIONS = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 14,
  timeLimitMs: 60000,
  aspirationWindow: 0,
  randomness: 0,
  wldPreExactEmpties: 0,
  optimizedFewEmptiesExactSolver: true,
  specializedFewEmptiesExactSolver: true,
  exactFastestFirstOrdering: true,
  enhancedTranspositionCutoff: true,
  enhancedTranspositionCutoffWld: true,
});

function printUsage() {
  const toolPath = displayTrainingToolPath('audit-evaluation-profile.mjs');
  const candidateProfilePath = displayTrainingOutputPath('trained-evaluation-profile.json');
  const outputJsonPath = displayProjectPath('benchmarks', 'evaluation_profile_audit.json');
  console.log(`Usage:
  node ${toolPath} \
    [--input <file-or-dir> [--input <file-or-dir> ...] | --random-exact] \
    [--candidate-profile ${candidateProfilePath}] \
    [--baseline-profile path/to/legacy-or-baseline-profile.json] \
    [--target-scale 3000] [--holdout-mod 10] [--holdout-residue 0] [--sample-mode holdout|train|all] \
    [--min-empties 0] [--max-empties 60] [--limit 500000] [--progress-every 250000] \
    [--empties 14,13,12,11,10,9,8,7] [--seed-start 1] [--seed-count 4] [--time-limit-ms 60000] [--max-depth 14] \
    [--output-json ${outputJsonPath}]

Modes:
  1) Corpus mode   : --input ...
     - 훈련/검증 코퍼스에 있는 score를 직접 사용해 회귀 오차, feature 기여도, ablation, residual correlation을 점검합니다.
  2) Random-exact  : --random-exact
     - seeded random late positions를 exact solve해서 late bucket 중심으로 점검합니다.
`);
}

function toFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toFiniteInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function symmetricRound(value) {
  return value >= 0 ? Math.round(value) : -Math.round(-value);
}

function parseEmptiesList(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [...RANDOM_EXACT_DEFAULT_EMPTIES];
  }
  return value
    .split(',')
    .map((token) => Number(token.trim()))
    .filter((token) => Number.isInteger(token) && token >= 1 && token <= 60)
    .sort((left, right) => right - left);
}

function shouldIncludeSample(sampleIndex, holdoutMod, holdoutResidue, sampleMode) {
  if (sampleMode === 'all' || holdoutMod <= 0) {
    return true;
  }
  const isHoldout = (sampleIndex % holdoutMod) === holdoutResidue;
  return sampleMode === 'holdout' ? isHoldout : !isHoldout;
}

function createProgressLogger({ progressEvery, totalBytes, estimatedTotalSamples, startMs, label }) {
  let nextThreshold = progressEvery > 0 ? progressEvery : Number.POSITIVE_INFINITY;
  return ({ processedSamples, totalBytesProcessed }) => {
    if (processedSamples < nextThreshold) {
      return;
    }
    while (processedSamples >= nextThreshold) {
      nextThreshold += progressEvery;
    }

    const elapsedSeconds = Math.max(0.001, (Date.now() - startMs) / 1000);
    const fraction = totalBytes > 0 ? totalBytesProcessed / totalBytes : null;
    const bytesPerSecond = totalBytesProcessed / elapsedSeconds;
    const etaSeconds = bytesPerSecond > 0 ? Math.max(0, totalBytes - totalBytesProcessed) / bytesPerSecond : null;
    const sampleText = estimatedTotalSamples
      ? `${formatInteger(processedSamples)} / ${formatInteger(estimatedTotalSamples)}`
      : formatInteger(processedSamples);
    const percent = fraction === null ? 'n/a' : `${(fraction * 100).toFixed(1)}%`;
    console.log(`[${label}] samples=${sampleText} progress=${percent} speed=${formatInteger(processedSamples / elapsedSeconds)} sample/s ETA=${formatDurationSeconds(etaSeconds)}`);
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

function metricSummaryWithScale(accumulator, scale) {
  const summary = summarizeMetricAccumulator(accumulator);
  return {
    ...summary,
    maeInStones: summary.mae === null ? null : summary.mae / scale,
    rmseInStones: summary.rmse === null ? null : summary.rmse / scale,
    meanResidualInStones: summary.meanResidual === null ? null : summary.meanResidual / scale,
    stdDevResidualInStones: summary.stdDevResidual === null ? null : summary.stdDevResidual / scale,
    maxAbsResidualInStones: summary.maxAbsResidual === null ? null : summary.maxAbsResidual / scale,
  };
}

function createAblationAccumulator(featureKeys) {
  return {
    baseline: createMetricAccumulator(),
    byFeature: Object.fromEntries(featureKeys.map((key) => [key, createMetricAccumulator()])),
  };
}

function summarizeAblationAccumulator(accumulator, featureKeys, scale) {
  const baseline = metricSummaryWithScale(accumulator.baseline, scale);
  return {
    baseline,
    byFeature: featureKeys.map((key) => {
      const summary = metricSummaryWithScale(accumulator.byFeature[key], scale);
      return {
        key,
        metrics: summary,
        deltas: {
          mae: summary.mae === null || baseline.mae === null ? null : summary.mae - baseline.mae,
          rmse: summary.rmse === null || baseline.rmse === null ? null : summary.rmse - baseline.rmse,
          meanResidual: summary.meanResidual === null || baseline.meanResidual === null ? null : summary.meanResidual - baseline.meanResidual,
          maeInStones: summary.maeInStones === null || baseline.maeInStones === null ? null : summary.maeInStones - baseline.maeInStones,
        },
      };
    }),
  };
}

function createAuditSummaryTemplate(featureKeys, trainedFeatureKeys, omittedFeatureKeys) {
  return {
    count: 0,
    targetMetrics: createMetricAccumulator(),
    baselineMetrics: createMetricAccumulator(),
    contributions: Object.fromEntries(featureKeys.map((key) => [key, createContributionAccumulator()])),
    totalContributionAbs: 0,
    ablation: createAblationAccumulator(featureKeys),
    trainedFeatureResidualCorrelation: Object.fromEntries(trainedFeatureKeys.map((key) => [key, createCorrelationAccumulator()])),
    omittedFeatureResidualCorrelation: Object.fromEntries(omittedFeatureKeys.map((key) => [key, createCorrelationAccumulator()])),
  };
}

function summarizeCorrelationMap(mapObject) {
  return Object.entries(mapObject)
    .map(([key, accumulator]) => ({
      key,
      ...summarizeCorrelationAccumulator(accumulator),
    }))
    .sort((left, right) => Math.abs(right.correlation ?? 0) - Math.abs(left.correlation ?? 0));
}

function createWeightedBreakdown(record, weights, colorMatchesSideToMove = true) {
  const contributions = {
    bias: colorMatchesSideToMove ? Number(weights.bias ?? 0) : -Number(weights.bias ?? 0),
  };
  let rawScore = contributions.bias;
  for (const key of EVALUATION_FEATURE_KEYS) {
    const contribution = Number(record[key] ?? 0) * Number(weights[key] ?? 0);
    contributions[key] = contribution;
    rawScore += contribution;
  }
  return {
    rawScore,
    prediction: symmetricRound(rawScore),
    contributions,
  };
}

function summarizeAuditSection(section, featureKeys, scoreScale) {
  return {
    count: section.count,
    candidateMetrics: metricSummaryWithScale(section.targetMetrics, scoreScale),
    baselineMetrics: metricSummaryWithScale(section.baselineMetrics, scoreScale),
    featureContribution: featureKeys.map((key) => ({
      key,
      ...summarizeContributionAccumulator(section.contributions[key], section.totalContributionAbs),
    })),
    ablation: summarizeAblationAccumulator(section.ablation, featureKeys, scoreScale),
    trainedFeatureResidualCorrelation: summarizeCorrelationMap(section.trainedFeatureResidualCorrelation),
    omittedFeatureResidualCorrelation: summarizeCorrelationMap(section.omittedFeatureResidualCorrelation),
  };
}

function createRandomExactSearchOptions(empties) {
  return {
    ...DEFAULT_RANDOM_EXACT_SEARCH_OPTIONS,
    maxDepth: Math.max(DEFAULT_RANDOM_EXACT_SEARCH_OPTIONS.maxDepth, empties),
    exactEndgameEmpties: empties,
    timeLimitMs: DEFAULT_RANDOM_EXACT_SEARCH_OPTIONS.timeLimitMs,
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h || ((!args.input && !args['input-dir']) && !args['random-exact'])) {
  printUsage();
  process.exit(args.help || args.h ? 0 : 1);
}

const candidateProfilePath = args['candidate-profile'] ? resolveCliPath(args['candidate-profile']) : null;
const baselineProfilePath = args['baseline-profile'] ? resolveCliPath(args['baseline-profile']) : null;
const candidateProfile = loadJsonFileIfPresent(candidateProfilePath) ?? ACTIVE_EVALUATION_PROFILE ?? null;
const baselineProfile = loadJsonFileIfPresent(baselineProfilePath) ?? DEFAULT_EVALUATION_PROFILE;
const resolvedCandidateProfile = resolveSeedProfile(candidateProfile ?? baselineProfile);
const resolvedBaselineProfile = resolveSeedProfile(baselineProfile);
const candidateEvaluator = new Evaluator({ evaluationProfile: resolvedCandidateProfile });
const baselineEvaluator = new Evaluator({ evaluationProfile: resolvedBaselineProfile });
const bucketProfile = resolvedCandidateProfile;
const featureKeysWithBias = ['bias', ...EVALUATION_FEATURE_KEYS];
const scoreScale = args['random-exact'] ? 10000 : Math.max(1, toFiniteNumber(args['target-scale'], 3000));

const overall = createAuditSummaryTemplate(featureKeysWithBias, EVALUATION_FEATURE_KEYS, OMITTED_AUDIT_FEATURE_KEYS);
const byBucket = bucketProfile.phaseBuckets.map(() => createAuditSummaryTemplate(featureKeysWithBias, EVALUATION_FEATURE_KEYS, OMITTED_AUDIT_FEATURE_KEYS));
const scratch = createEmptyEvaluationFeatureRecord();
let streamedCount = 0;
let acceptedCount = 0;
const lateExactSkipped = {
  notExact: 0,
};

function ingestSample({ state, target }) {
  const record = populateEvaluationFeatureRecord(scratch, state, state.currentPlayer, { includeDiagnostics: false });
  const bucketIndex = bucketIndexForEmpties(bucketProfile, record.empties);
  const bucket = bucketProfile.phaseBuckets[bucketIndex];
  const candidateBreakdown = createWeightedBreakdown(record, bucket.weights, true);
  const baselinePrediction = baselineEvaluator.evaluate(state, state.currentPlayer);
  const candidateResidual = candidateBreakdown.prediction - target;
  const baselineResidual = baselinePrediction - target;
  const bucketSection = byBucket[bucketIndex];

  acceptedCount += 1;
  overall.count += 1;
  bucketSection.count += 1;

  updateMetricAccumulator(overall.targetMetrics, candidateResidual);
  updateMetricAccumulator(overall.baselineMetrics, baselineResidual);
  updateMetricAccumulator(bucketSection.targetMetrics, candidateResidual);
  updateMetricAccumulator(bucketSection.baselineMetrics, baselineResidual);
  updateMetricAccumulator(overall.ablation.baseline, candidateResidual);
  updateMetricAccumulator(bucketSection.ablation.baseline, candidateResidual);

  let contributionAbs = 0;
  for (const key of featureKeysWithBias) {
    const contribution = candidateBreakdown.contributions[key];
    contributionAbs += Math.abs(contribution);
    updateContributionAccumulator(overall.contributions[key], contribution);
    updateContributionAccumulator(bucketSection.contributions[key], contribution);
    const ablatedPrediction = symmetricRound(candidateBreakdown.rawScore - contribution);
    const ablatedResidual = ablatedPrediction - target;
    updateMetricAccumulator(overall.ablation.byFeature[key], ablatedResidual);
    updateMetricAccumulator(bucketSection.ablation.byFeature[key], ablatedResidual);
  }
  overall.totalContributionAbs += contributionAbs;
  bucketSection.totalContributionAbs += contributionAbs;

  for (const key of EVALUATION_FEATURE_KEYS) {
    updateCorrelationAccumulator(overall.trainedFeatureResidualCorrelation[key], record[key], candidateResidual);
    updateCorrelationAccumulator(bucketSection.trainedFeatureResidualCorrelation[key], record[key], candidateResidual);
  }
  for (const key of OMITTED_AUDIT_FEATURE_KEYS) {
    updateCorrelationAccumulator(overall.omittedFeatureResidualCorrelation[key], record[key], candidateResidual);
    updateCorrelationAccumulator(bucketSection.omittedFeatureResidualCorrelation[key], record[key], candidateResidual);
  }
}

if (args['random-exact']) {
  const emptiesList = parseEmptiesList(args.empties);
  const seedStart = Math.max(1, toFiniteInteger(args['seed-start'], 1));
  const seedCount = Math.max(1, toFiniteInteger(args['seed-count'], 4));
  const timeLimitMs = Math.max(1000, toFiniteInteger(args['time-limit-ms'], DEFAULT_RANDOM_EXACT_SEARCH_OPTIONS.timeLimitMs));
  const maxDepth = Math.max(1, toFiniteInteger(args['max-depth'], DEFAULT_RANDOM_EXACT_SEARCH_OPTIONS.maxDepth));

  console.log(`Random exact audit: empties ${emptiesList.join(', ')} | seeds ${seedStart}..${seedStart + seedCount - 1}`);
  for (const empties of emptiesList) {
    console.log(`[empties ${empties}] exact teacher`);
    for (let seed = seedStart; seed < (seedStart + seedCount); seed += 1) {
      const state = playSeededRandomUntilEmptyCount(empties, seed);
      const engine = new SearchEngine({
        ...createRandomExactSearchOptions(empties),
        maxDepth: Math.max(maxDepth, empties),
        timeLimitMs,
      });
      const result = engine.findBestMove(state);
      if (!result.isExactResult) {
        lateExactSkipped.notExact += 1;
        console.log(`  seed ${seed}: skipped (not exact, mode=${result.searchMode ?? 'n/a'}, completion=${result.searchCompletion ?? 'n/a'})`);
        continue;
      }
      ingestSample({
        state,
        target: result.score,
      });
      console.log(`  seed ${seed}: target=${result.score} cand=${candidateEvaluator.evaluate(state, state.currentPlayer)} base=${baselineEvaluator.evaluate(state, state.currentPlayer)}`);
    }
  }
} else {
  const requestedInputs = [
    ...ensureArray(args.input),
    ...ensureArray(args['input-dir']),
  ];
  const inputFiles = await collectInputFileEntries(requestedInputs);
  if (inputFiles.length === 0) {
    throw new Error('입력 파일을 찾지 못했습니다.');
  }

  const totalInputBytes = calculateTotalInputBytes(inputFiles);
  const estimatedTotalSamples = detectKnownDatasetSampleCount(inputFiles);
  const limit = args.limit !== undefined ? Math.max(1, toFiniteInteger(args.limit, 1)) : undefined;
  const targetScale = Math.max(1, toFiniteNumber(args['target-scale'], 3000));
  const holdoutMod = Math.max(0, toFiniteInteger(args['holdout-mod'], 10));
  const holdoutResidue = Math.max(0, toFiniteInteger(args['holdout-residue'], 0));
  const sampleMode = ['all', 'holdout', 'train'].includes(String(args['sample-mode'] ?? 'holdout'))
    ? String(args['sample-mode'] ?? 'holdout')
    : 'holdout';
  const minEmpties = Math.max(0, toFiniteInteger(args['min-empties'], 0));
  const maxEmpties = Math.min(60, Math.max(minEmpties, toFiniteInteger(args['max-empties'], 60)));
  const progressEvery = Math.max(0, toFiniteInteger(args['progress-every'], 250000));
  const startMs = Date.now();
  const progress = progressEvery > 0
    ? createProgressLogger({
      progressEvery,
      totalBytes: totalInputBytes,
      estimatedTotalSamples: limit ?? estimatedTotalSamples ?? null,
      startMs,
      label: 'audit',
    })
    : null;

  console.log(`Corpus audit on ${inputFiles.length} file(s) | sampleMode=${sampleMode} | empties=${minEmpties}..${maxEmpties}`);
  await streamTrainingSamples(inputFiles, { targetScale, limit }, ({ state, target, sampleIndex, totalBytesProcessed }) => {
    streamedCount += 1;
    const empties = state.getEmptyCount();
    if (empties < minEmpties || empties > maxEmpties) {
      if (progress) {
        progress({ processedSamples: streamedCount, totalBytesProcessed });
      }
      return;
    }
    if (!shouldIncludeSample(sampleIndex, holdoutMod, holdoutResidue, sampleMode)) {
      if (progress) {
        progress({ processedSamples: streamedCount, totalBytesProcessed });
      }
      return;
    }

    ingestSample({ state, target });
    if (progress) {
      progress({ processedSamples: streamedCount, totalBytesProcessed });
    }
  });
}

const outputJsonPath = args['output-json'] ? resolveCliPath(args['output-json']) : null;
const summary = {
  generatedAt: new Date().toISOString(),
  sourceMode: args['random-exact'] ? 'random-exact' : 'corpus',
  candidateProfileName: resolvedCandidateProfile.name ?? null,
  baselineProfileName: resolvedBaselineProfile.name ?? null,
  scoreScale,
  structuralNotes: {
    parityAliasFoldedBuckets: bucketProfile.phaseBuckets
      .filter((bucket) => bucket.minEmpties > 18)
      .map((bucket) => bucket.key),
  },
  scanSummary: args['random-exact']
    ? {
      acceptedSamples: acceptedCount,
      skipped: lateExactSkipped,
      empties: parseEmptiesList(args.empties),
      seedStart: Math.max(1, toFiniteInteger(args['seed-start'], 1)),
      seedCount: Math.max(1, toFiniteInteger(args['seed-count'], 4)),
    }
    : {
      processedSamples: streamedCount,
      acceptedSamples: acceptedCount,
      holdoutMod: Math.max(0, toFiniteInteger(args['holdout-mod'], 10)),
      holdoutResidue: Math.max(0, toFiniteInteger(args['holdout-residue'], 0)),
      sampleMode: ['all', 'holdout', 'train'].includes(String(args['sample-mode'] ?? 'holdout'))
        ? String(args['sample-mode'] ?? 'holdout')
        : 'holdout',
      minEmpties: Math.max(0, toFiniteInteger(args['min-empties'], 0)),
      maxEmpties: Math.min(60, Math.max(Math.max(0, toFiniteInteger(args['min-empties'], 0)), toFiniteInteger(args['max-empties'], 60))),
    },
  overall: summarizeAuditSection(overall, featureKeysWithBias, scoreScale),
  byBucket: bucketProfile.phaseBuckets.map((bucket, index) => ({
    key: bucket.key,
    minEmpties: bucket.minEmpties,
    maxEmpties: bucket.maxEmpties,
    ...summarizeAuditSection(byBucket[index], featureKeysWithBias, scoreScale),
  })),
};

console.log(`Accepted samples: ${formatInteger(acceptedCount)}`);
console.log(`Candidate MAE: ${summary.overall.candidateMetrics.mae?.toFixed(2)} (${summary.overall.candidateMetrics.maeInStones?.toFixed(3)} stones)`);
console.log(`Baseline  MAE: ${summary.overall.baselineMetrics.mae?.toFixed(2)} (${summary.overall.baselineMetrics.maeInStones?.toFixed(3)} stones)`);
const topAblation = [...summary.overall.ablation.byFeature]
  .sort((left, right) => (right.deltas.mae ?? -Infinity) - (left.deltas.mae ?? -Infinity))
  .slice(0, 5);
const helpfulRemovals = [...summary.overall.ablation.byFeature]
  .filter((entry) => Number(entry.deltas.mae ?? 0) < 0)
  .sort((left, right) => (left.deltas.mae ?? Infinity) - (right.deltas.mae ?? Infinity))
  .slice(0, 5);
console.log('Largest harmful ablations (removing feature makes MAE worse):');
for (const entry of topAblation) {
  console.log(`  ${entry.key.padEnd(22)} ΔMAE=${entry.deltas.mae?.toFixed(2) ?? 'n/a'}`);
}
if (helpfulRemovals.length > 0) {
  console.log('Potential overstatements (removing feature improves MAE):');
  for (const entry of helpfulRemovals) {
    console.log(`  ${entry.key.padEnd(22)} ΔMAE=${entry.deltas.mae?.toFixed(2) ?? 'n/a'}`);
  }
}

if (outputJsonPath) {
  await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
  await fs.promises.writeFile(outputJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(`Saved audit summary to ${outputJsonPath}`);
}
