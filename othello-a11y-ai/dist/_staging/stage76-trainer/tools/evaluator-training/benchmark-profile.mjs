#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { Evaluator } from '../../js/ai/evaluator.js';
import { DEFAULT_EVALUATION_PROFILE } from '../../js/ai/evaluation-profiles.js';
import {
  bucketIndexForEmpties,
  calculateTotalInputBytes,
  collectInputFileEntries,
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
  percentage,
  resolveCliPath,
  resolveSeedProfile,
  streamTrainingSamples,
  summarizeMetricAccumulator,
  updateMetricAccumulator,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('benchmark-profile.mjs');
  const evaluationProfilePath = displayTrainingOutputPath('trained-evaluation-profile.json');
  const tupleProfilePath = displayTrainingOutputPath('trained-tuple-residual-profile.json');
  const outputJsonPath = displayProjectPath('benchmarks', 'profile_benchmark.json');
  console.log(`Usage:
  node ${toolPath} \
    --input <file-or-dir> [--input <file-or-dir> ...] \
    [--baseline-profile ${evaluationProfilePath}] \
    [--candidate-profile ${evaluationProfilePath}] \
    [--baseline-tuple-profile ${tupleProfilePath}] \
    [--candidate-tuple-profile ${tupleProfilePath}] \
    [--limit 50000] [--target-scale 3000] [--benchmark-loops 200] [--progress-every 250000] \
    [--output-json ${outputJsonPath}]

기본값:
- baseline evaluator profile은 DEFAULT_EVALUATION_PROFILE입니다.
- tuple residual profile은 baseline/candidate 모두 기본적으로 비활성(null)입니다.
- candidate profile/tuple을 주지 않으면 baseline만 측정합니다.
`);
}

function toFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function benchmarkEvaluator(evaluator, states, loops) {
  const start = Date.now();
  let checksum = 0;
  for (let loop = 0; loop < loops; loop += 1) {
    for (const state of states) {
      checksum += evaluator.evaluate(state, state.currentPlayer);
    }
  }
  const elapsedMs = Date.now() - start;
  const evalCount = loops * states.length;
  return {
    evalCount,
    elapsedMs,
    evalsPerSec: elapsedMs === 0 ? null : Math.round(evalCount / (elapsedMs / 1000)),
    checksum,
  };
}

function createProgressLogger({ progressEvery, totalBytes, estimatedTotalSamples, startMs }) {
  let nextThreshold = progressEvery > 0 ? progressEvery : Number.POSITIVE_INFINITY;
  return ({ sampleIndex, totalBytesProcessed }) => {
    const processedSamples = sampleIndex + 1;
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
    console.log(`[benchmark] samples=${sampleText} progress=${percentage(fraction)} speed=${formatInteger(processedSamples / elapsedSeconds)} sample/s ETA=${formatDurationSeconds(etaSeconds)}`);
  };
}

function metricSummaryWithScale(summary, targetScale) {
  return {
    ...summary,
    maeInStones: summary.mae === null ? null : summary.mae / targetScale,
    rmseInStones: summary.rmse === null ? null : summary.rmse / targetScale,
    meanResidualInStones: summary.meanResidual === null ? null : summary.meanResidual / targetScale,
    stdDevResidualInStones: summary.stdDevResidual === null ? null : summary.stdDevResidual / targetScale,
    maxAbsResidualInStones: summary.maxAbsResidual === null ? null : summary.maxAbsResidual / targetScale,
  };
}

function summarizeBucketMetrics(profile, baselineByBucket, candidateByBucket, targetScale, candidateEnabled) {
  return profile.phaseBuckets.map((bucket, index) => {
    const baseline = metricSummaryWithScale(summarizeMetricAccumulator(baselineByBucket[index]), targetScale);
    const candidate = metricSummaryWithScale(summarizeMetricAccumulator(candidateByBucket[index]), targetScale);
    return {
      key: bucket.key,
      minEmpties: bucket.minEmpties,
      maxEmpties: bucket.maxEmpties,
      baseline,
      candidate,
      delta: candidateEnabled
        ? {
          mae: candidate.mae === null || baseline.mae === null ? null : candidate.mae - baseline.mae,
          rmse: candidate.rmse === null || baseline.rmse === null ? null : candidate.rmse - baseline.rmse,
          meanResidual: candidate.meanResidual === null || baseline.meanResidual === null ? null : candidate.meanResidual - baseline.meanResidual,
          maeInStones: candidate.maeInStones === null || baseline.maeInStones === null ? null : candidate.maeInStones - baseline.maeInStones,
          meanResidualInStones: candidate.meanResidualInStones === null || baseline.meanResidualInStones === null
            ? null
            : candidate.meanResidualInStones - baseline.meanResidualInStones,
        }
        : null,
    };
  });
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

const baselineProfilePath = args['baseline-profile'] ? resolveCliPath(args['baseline-profile']) : null;
const candidateProfilePath = args['candidate-profile'] ? resolveCliPath(args['candidate-profile']) : null;
const baselineTupleProfilePath = args['baseline-tuple-profile'] ? resolveCliPath(args['baseline-tuple-profile']) : null;
const candidateTupleProfilePath = args['candidate-tuple-profile'] ? resolveCliPath(args['candidate-tuple-profile']) : null;
const outputJsonPath = args['output-json'] ? resolveCliPath(args['output-json']) : null;

const totalInputBytes = calculateTotalInputBytes(inputFiles);
const targetScale = toFiniteNumber(args['target-scale'], 3000);
const limit = args.limit !== undefined ? Math.max(1, Math.trunc(toFiniteNumber(args.limit, 1))) : undefined;
const benchmarkLoops = Math.max(1, Math.trunc(toFiniteNumber(args['benchmark-loops'], 200)));
const maxBenchmarkStates = Math.max(1, Math.trunc(toFiniteNumber(args['benchmark-states'], 1000)));
const progressEvery = Math.max(0, Math.trunc(toFiniteNumber(args['progress-every'], 250000)));
const estimatedTotalSamples = limit ?? detectKnownDatasetSampleCount(inputFiles) ?? null;

const baselineProfile = loadJsonFileIfPresent(baselineProfilePath) ?? DEFAULT_EVALUATION_PROFILE;
const candidateProfile = loadJsonFileIfPresent(candidateProfilePath) ?? baselineProfile;
const baselineTupleProfile = loadJsonFileIfPresent(baselineTupleProfilePath);
const candidateTupleProfile = loadJsonFileIfPresent(candidateTupleProfilePath) ?? baselineTupleProfile;
const candidateEnabled = Boolean(candidateProfilePath || candidateTupleProfilePath);
const seedProfile = resolveSeedProfile(candidateProfile);
const baselineEvaluator = new Evaluator({
  evaluationProfile: baselineProfile,
  tupleResidualProfile: baselineTupleProfile ?? null,
});
const candidateEvaluator = candidateEnabled
  ? new Evaluator({
    evaluationProfile: candidateProfile,
    tupleResidualProfile: candidateTupleProfile ?? null,
  })
  : baselineEvaluator;
const baselineMetrics = createMetricAccumulator();
const candidateMetrics = createMetricAccumulator();
const baselineByBucket = seedProfile.phaseBuckets.map(() => createMetricAccumulator());
const candidateByBucket = seedProfile.phaseBuckets.map(() => createMetricAccumulator());
const benchmarkStates = [];
const startMs = Date.now();
const progressLogger = progressEvery > 0
  ? createProgressLogger({
    progressEvery,
    totalBytes: totalInputBytes,
    estimatedTotalSamples,
    startMs,
  })
  : null;

console.log(`Baseline evaluator : ${baselineProfile.name ?? path.basename(baselineProfilePath ?? 'default-eval')}`);
console.log(`Baseline tuple     : ${baselineTupleProfile?.name ?? 'none'}`);
if (candidateEnabled) {
  console.log(`Candidate evaluator: ${candidateProfile.name ?? path.basename(candidateProfilePath ?? 'candidate-eval')}`);
  console.log(`Candidate tuple    : ${candidateTupleProfile?.name ?? 'none'}`);
}
if (estimatedTotalSamples) {
  console.log(`Estimated samples: ${formatInteger(estimatedTotalSamples)}`);
}
if (progressEvery > 0) {
  console.log(`Progress logging every ${formatInteger(progressEvery)} samples.`);
}

const sampleCount = await streamTrainingSamples(inputFiles, { targetScale, limit }, ({ state, target, sampleIndex, totalBytesProcessed }) => {
  const bucketIndex = bucketIndexForEmpties(seedProfile, state.getEmptyCount());
  const baselineResidual = baselineEvaluator.evaluate(state, state.currentPlayer) - target;
  const candidateResidual = candidateEvaluator.evaluate(state, state.currentPlayer) - target;

  updateMetricAccumulator(baselineMetrics, baselineResidual);
  updateMetricAccumulator(candidateMetrics, candidateResidual);
  updateMetricAccumulator(baselineByBucket[bucketIndex], baselineResidual);
  updateMetricAccumulator(candidateByBucket[bucketIndex], candidateResidual);

  if (benchmarkStates.length < maxBenchmarkStates) {
    benchmarkStates.push(state);
  }

  if (progressLogger) {
    progressLogger({ sampleIndex, totalBytesProcessed });
  }
});

const baselineSummary = metricSummaryWithScale(summarizeMetricAccumulator(baselineMetrics), targetScale);
const candidateSummary = metricSummaryWithScale(summarizeMetricAccumulator(candidateMetrics), targetScale);
const bucketSummaries = summarizeBucketMetrics(seedProfile, baselineByBucket, candidateByBucket, targetScale, candidateEnabled);

console.log(`Samples: ${formatInteger(sampleCount)}`);
console.log(`Elapsed: ${formatDurationSeconds((Date.now() - startMs) / 1000)}`);
console.log(`Baseline MAE: ${baselineSummary.mae?.toFixed(2)} (${baselineSummary.maeInStones?.toFixed(3)} stones)`);
if (candidateEnabled) {
  console.log(`Candidate MAE: ${candidateSummary.mae?.toFixed(2)} (${candidateSummary.maeInStones?.toFixed(3)} stones)`);
  console.log(`Candidate delta MAE: ${(candidateSummary.mae - baselineSummary.mae).toFixed(2)} (${(candidateSummary.maeInStones - baselineSummary.maeInStones).toFixed(4)} stones)`);
  console.log(`Candidate mean residual: ${candidateSummary.meanResidual?.toFixed(2)} (${candidateSummary.meanResidualInStones?.toFixed(4)} stones)`);
}

for (const bucket of bucketSummaries) {
  const baseText = bucket.baseline.mae === null ? 'n/a' : bucket.baseline.mae.toFixed(1);
  const candidateText = !candidateEnabled
    ? 'same'
    : (bucket.candidate.mae === null ? 'n/a' : bucket.candidate.mae.toFixed(1));
  const deltaText = !candidateEnabled || bucket.delta?.maeInStones === null
    ? ''
    : ` delta=${bucket.delta.maeInStones.toFixed(4)} stones`;
  console.log(`  ${bucket.key.padEnd(10)} baseMAE=${baseText} candMAE=${candidateText}${deltaText}`);
}

let baselineBench = null;
let candidateBench = null;
if (benchmarkStates.length > 0) {
  baselineBench = benchmarkEvaluator(baselineEvaluator, benchmarkStates, benchmarkLoops);
  console.log(`Baseline speed: ${baselineBench.evalsPerSec ?? 'n/a'} eval/s (${baselineBench.evalCount} evals, ${baselineBench.elapsedMs}ms)`);
  if (candidateEnabled) {
    candidateBench = benchmarkEvaluator(candidateEvaluator, benchmarkStates, benchmarkLoops);
    console.log(`Candidate speed: ${candidateBench.evalsPerSec ?? 'n/a'} eval/s (${candidateBench.evalCount} evals, ${candidateBench.elapsedMs}ms)`);
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  inputFiles,
  baselineEvaluationProfileName: baselineProfile.name ?? null,
  candidateEvaluationProfileName: candidateProfile.name ?? null,
  baselineTupleResidualProfileName: baselineTupleProfile?.name ?? null,
  candidateTupleResidualProfileName: candidateTupleProfile?.name ?? null,
  options: {
    limit: limit ?? null,
    targetScale,
    benchmarkLoops,
    maxBenchmarkStates,
    progressEvery,
  },
  baseline: baselineSummary,
  candidate: candidateSummary,
  delta: candidateEnabled
    ? {
      mae: candidateSummary.mae === null || baselineSummary.mae === null ? null : candidateSummary.mae - baselineSummary.mae,
      rmse: candidateSummary.rmse === null || baselineSummary.rmse === null ? null : candidateSummary.rmse - baselineSummary.rmse,
      meanResidual: candidateSummary.meanResidual === null || baselineSummary.meanResidual === null ? null : candidateSummary.meanResidual - baselineSummary.meanResidual,
      maeInStones: candidateSummary.maeInStones === null || baselineSummary.maeInStones === null ? null : candidateSummary.maeInStones - baselineSummary.maeInStones,
      rmseInStones: candidateSummary.rmseInStones === null || baselineSummary.rmseInStones === null ? null : candidateSummary.rmseInStones - baselineSummary.rmseInStones,
      meanResidualInStones: candidateSummary.meanResidualInStones === null || baselineSummary.meanResidualInStones === null
        ? null
        : candidateSummary.meanResidualInStones - baselineSummary.meanResidualInStones,
    }
    : null,
  byBucket: bucketSummaries,
  speed: {
    baseline: baselineBench,
    candidate: candidateBench,
  },
};

if (outputJsonPath) {
  await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
  await fs.promises.writeFile(outputJsonPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`Saved benchmark summary to ${outputJsonPath}`);
}
