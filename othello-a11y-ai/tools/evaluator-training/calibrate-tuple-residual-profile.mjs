#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  ACTIVE_EVALUATION_PROFILE,
  makeTupleResidualTrainingProfileFromWeights,
  resolveTupleResidualProfile,
} from '../../js/ai/evaluation-profiles.js';
import { Evaluator } from '../../js/ai/evaluator.js';
import {
  buildProfileStageMetadata,
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
  streamTrainingSamples,
  summarizeMetricAccumulator,
  updateMetricAccumulator,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('calibrate-tuple-residual-profile.mjs');
  const tupleJsonPath = displayTrainingOutputPath('trained-tuple-residual-profile.json');
  const outputJsonPath = displayTrainingOutputPath('trained-tuple-residual-profile.calibrated.json');
  const summaryJsonPath = displayProjectPath('benchmarks', 'tuple_residual_calibration_summary.json');
  console.log(`Usage:
  node ${toolPath} \
    --tuple-json ${tupleJsonPath} \
    [--corpus <file-or-dir> ...] [--corpus-dir <dir> ...] \
    [--evaluation-profile-json path/to/trained-evaluation-profile.json] \
    [--scope holdout-selected|selected-all|all-samples] \
    [--shrink 1.0] [--max-bias-stones 1.5] \
    [--holdout-mod 10] [--holdout-residue 0] \
    [--limit 2000000] [--progress-every 250000] \
    [--output-json ${outputJsonPath}] \
    [--summary-json ${summaryJsonPath}]

설명:
- 기존 tuple residual profile의 bucket별 mean-shift를 bias(상수항)로 재중심화합니다.
- corpus를 주지 않으면 profile.diagnostics(또는 calibration.verifiedDiagnostics)만으로 bias를 추정합니다.
- corpus를 주면 같은 split 기준으로 pre/post calibration metrics를 다시 측정해 verifiedDiagnostics를 함께 저장합니다.
- 새 bias field는 runtime/install/export 경로에서 그대로 보존됩니다.
`);
}

function toFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function shouldUseHoldout(sampleIndex, holdoutMod, holdoutResidue) {
  return holdoutMod > 0 && (sampleIndex % holdoutMod) === holdoutResidue;
}

function pickBucketIndexForEmpties(bucketSpecs, empties) {
  for (let index = 0; index < bucketSpecs.length; index += 1) {
    const bucket = bucketSpecs[index];
    if (empties >= bucket.minEmpties && empties <= bucket.maxEmpties) {
      return index;
    }
  }
  return -1;
}

function decorateMetricSummary(summary, targetScale) {
  return {
    ...summary,
    maeInStones: summary.mae === null ? null : summary.mae / targetScale,
    rmseInStones: summary.rmse === null ? null : summary.rmse / targetScale,
    meanResidualInStones: summary.meanResidual === null ? null : summary.meanResidual / targetScale,
    stdDevResidualInStones: summary.stdDevResidual === null ? null : summary.stdDevResidual / targetScale,
    maxAbsResidualInStones: summary.maxAbsResidual === null ? null : summary.maxAbsResidual / targetScale,
  };
}

function buildMetricDelta(baseSummary, candidateSummary, targetScale) {
  return {
    mae: baseSummary.mae === null || candidateSummary.mae === null ? null : candidateSummary.mae - baseSummary.mae,
    rmse: baseSummary.rmse === null || candidateSummary.rmse === null ? null : candidateSummary.rmse - baseSummary.rmse,
    meanResidual: baseSummary.meanResidual === null || candidateSummary.meanResidual === null ? null : candidateSummary.meanResidual - baseSummary.meanResidual,
    maeInStones: baseSummary.mae === null || candidateSummary.mae === null ? null : (candidateSummary.mae - baseSummary.mae) / targetScale,
    rmseInStones: baseSummary.rmse === null || candidateSummary.rmse === null ? null : (candidateSummary.rmse - baseSummary.rmse) / targetScale,
    meanResidualInStones: baseSummary.meanResidual === null || candidateSummary.meanResidual === null ? null : (candidateSummary.meanResidual - baseSummary.meanResidual) / targetScale,
  };
}

function formatSigned(value, digits = 4) {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;
}

function parseScope(value) {
  const normalized = typeof value === 'string' && value.trim() !== ''
    ? value.trim().toLowerCase()
    : 'holdout-selected';
  if (normalized === 'holdout' || normalized === 'holdout-selected') {
    return 'holdout-selected';
  }
  if (normalized === 'selected' || normalized === 'selected-all') {
    return 'selected-all';
  }
  if (normalized === 'all' || normalized === 'all-samples') {
    return 'all-samples';
  }
  throw new Error(`알 수 없는 calibration scope: ${value}`);
}

function createProgressLogger({
  label,
  totalBytes,
  progressEvery,
  estimatedTotalSamples,
  startMs,
}) {
  let nextThreshold = progressEvery > 0 ? progressEvery : Number.POSITIVE_INFINITY;

  return ({ sampleIndex, totalBytesProcessed }) => {
    const scannedSamples = sampleIndex + 1;
    if (scannedSamples < nextThreshold) {
      return;
    }
    while (scannedSamples >= nextThreshold) {
      nextThreshold += progressEvery;
    }

    const elapsedSeconds = Math.max(0.001, (Date.now() - startMs) / 1000);
    const fraction = totalBytes > 0 ? totalBytesProcessed / totalBytes : null;
    const speed = scannedSamples / elapsedSeconds;
    const bytesPerSecond = totalBytesProcessed / elapsedSeconds;
    const etaSeconds = bytesPerSecond > 0 ? Math.max(0, (totalBytes - totalBytesProcessed) / bytesPerSecond) : null;
    const sampleText = estimatedTotalSamples
      ? `${formatInteger(scannedSamples)} / ${formatInteger(estimatedTotalSamples)}`
      : formatInteger(scannedSamples);

    console.log(
      `[${label}] scanned=${sampleText} progress=${percentage(fraction)} speed=${formatInteger(speed)} sample/s ETA=${formatDurationSeconds(etaSeconds)}`,
    );
  };
}

function findMatchingBucketSummary(byBucket, bucket) {
  if (!Array.isArray(byBucket)) {
    return null;
  }
  return byBucket.find((entry) => {
    if (typeof entry?.key === 'string' && typeof bucket?.key === 'string' && entry.key === bucket.key) {
      return true;
    }
    return entry?.minEmpties === bucket?.minEmpties && entry?.maxEmpties === bucket?.maxEmpties;
  }) ?? null;
}

function metricSectionForScope(bucketSummary, scope) {
  if (!bucketSummary) {
    return null;
  }
  if (scope === 'holdout-selected') {
    return bucketSummary.holdout ?? null;
  }
  return bucketSummary.all ?? bucketSummary.holdout ?? null;
}

function overallMetricSectionForScope(diagnostics, scope) {
  if (!diagnostics || typeof diagnostics !== 'object') {
    return null;
  }
  if (scope === 'holdout-selected') {
    return diagnostics.holdoutSelected ?? null;
  }
  if (scope === 'selected-all') {
    return diagnostics.selectedAll ?? diagnostics.allSamples ?? null;
  }
  return diagnostics.allSamples ?? diagnostics.selectedAll ?? null;
}

function createBucketAccumulators(bucketCount) {
  return Array.from({ length: bucketCount }, () => createMetricAccumulator());
}

function finalizeByBucketMetrics(bucketSpecs, baseAccumulators, candidateAccumulators, targetScale) {
  return bucketSpecs.map((bucket, bucketIndex) => {
    const baseSummary = decorateMetricSummary(summarizeMetricAccumulator(baseAccumulators[bucketIndex]), targetScale);
    const candidateSummary = decorateMetricSummary(summarizeMetricAccumulator(candidateAccumulators[bucketIndex]), targetScale);
    return {
      key: bucket.key,
      minEmpties: bucket.minEmpties,
      maxEmpties: bucket.maxEmpties,
      base: baseSummary,
      candidate: candidateSummary,
      delta: buildMetricDelta(baseSummary, candidateSummary, targetScale),
    };
  });
}

function buildVerifiedDiagnostics({
  before,
  after,
  bucketSpecs,
  targetScale,
}) {
  const allBase = decorateMetricSummary(summarizeMetricAccumulator(before.all), targetScale);
  const allCandidate = decorateMetricSummary(summarizeMetricAccumulator(after.all), targetScale);
  const selectedBase = decorateMetricSummary(summarizeMetricAccumulator(before.selected), targetScale);
  const selectedCandidate = decorateMetricSummary(summarizeMetricAccumulator(after.selected), targetScale);
  const holdoutBase = decorateMetricSummary(summarizeMetricAccumulator(before.holdout), targetScale);
  const holdoutCandidate = decorateMetricSummary(summarizeMetricAccumulator(after.holdout), targetScale);
  const allByBucket = finalizeByBucketMetrics(bucketSpecs, before.byBucketAll, after.byBucketAll, targetScale);
  const holdoutByBucket = finalizeByBucketMetrics(bucketSpecs, before.byBucketHoldout, after.byBucketHoldout, targetScale);

  return {
    calibrationReference: 'pre-calibration-vs-calibrated',
    allSamples: {
      base: allBase,
      candidate: allCandidate,
      delta: buildMetricDelta(allBase, allCandidate, targetScale),
    },
    selectedAll: {
      base: selectedBase,
      candidate: selectedCandidate,
      delta: buildMetricDelta(selectedBase, selectedCandidate, targetScale),
    },
    holdoutSelected: {
      base: holdoutBase,
      candidate: holdoutCandidate,
      delta: buildMetricDelta(holdoutBase, holdoutCandidate, targetScale),
    },
    byBucket: bucketSpecs.map((bucket, bucketIndex) => ({
      key: bucket.key,
      minEmpties: bucket.minEmpties,
      maxEmpties: bucket.maxEmpties,
      all: allByBucket[bucketIndex],
      holdout: holdoutByBucket[bucketIndex],
    })),
    createdAt: new Date().toISOString(),
  };
}

function createVerificationAccumulatorSet(bucketCount) {
  return {
    all: createMetricAccumulator(),
    selected: createMetricAccumulator(),
    holdout: createMetricAccumulator(),
    byBucketAll: createBucketAccumulators(bucketCount),
    byBucketHoldout: createBucketAccumulators(bucketCount),
  };
}

function cloneTupleWeights(bucket) {
  return bucket.tupleWeights.map((table) => [...table]);
}

function buildCalibratedProfile(profile, bucketBiasDeltas, calibrationMetadata) {
  return makeTupleResidualTrainingProfileFromWeights({
    name: calibrationMetadata.outputProfileName,
    description: calibrationMetadata.outputDescription,
    layout: profile.layout,
    stage: buildProfileStageMetadata({ kind: 'tuple-residual-profile' }),
    source: profile.source ?? null,
    diagnostics: profile.diagnostics ?? null,
    calibration: calibrationMetadata,
    trainedBuckets: profile.trainedBuckets.map((bucket, bucketIndex) => ({
      key: bucket.key,
      minEmpties: bucket.minEmpties,
      maxEmpties: bucket.maxEmpties,
      scale: bucket.scale,
      bias: Number(bucket.bias ?? 0) + Number(bucketBiasDeltas[bucketIndex] ?? 0),
      tupleWeights: cloneTupleWeights(bucket),
    })),
  });
}

function createOutputName(sourceName) {
  if (typeof sourceName !== 'string' || sourceName.trim() === '') {
    return 'trained-tuple-residual-calibrated';
  }
  return sourceName.endsWith('-calibrated') ? sourceName : `${sourceName}-calibrated`;
}

function createOutputDescription(sourceDescription) {
  if (typeof sourceDescription === 'string' && sourceDescription.trim() !== '') {
    return `${sourceDescription} (bucket bias recentered)`;
  }
  return 'bucket bias recentering을 적용한 tuple residual evaluator입니다.';
}

function resolveDiagnosticsSource(profile) {
  return profile.calibration?.verifiedDiagnostics ?? profile.diagnostics ?? null;
}

function deriveBiasDeltasFromDiagnostics(profile, scope, shrink, maxBiasAbs) {
  const diagnostics = resolveDiagnosticsSource(profile);
  if (!diagnostics) {
    throw new Error('diagnostics 또는 calibration.verifiedDiagnostics가 없는 profile은 corpus 없이 calibration할 수 없습니다.');
  }

  const overallSection = overallMetricSectionForScope(diagnostics, scope);
  const overallMeanResidual = overallSection?.candidate?.meanResidual ?? null;
  const byBucket = Array.isArray(diagnostics.byBucket) ? diagnostics.byBucket : [];

  return profile.trainedBuckets.map((bucket) => {
    const bucketSummary = findMatchingBucketSummary(byBucket, bucket);
    const scoped = metricSectionForScope(bucketSummary, scope);
    const meanResidual = Number.isFinite(scoped?.candidate?.meanResidual)
      ? Number(scoped.candidate.meanResidual)
      : (Number.isFinite(overallMeanResidual) ? Number(overallMeanResidual) : 0);
    const unclamped = -meanResidual * shrink;
    return Math.max(-maxBiasAbs, Math.min(maxBiasAbs, unclamped));
  });
}

async function collectResidualMeansFromCorpus({
  inputFiles,
  evaluator,
  bucketSpecs,
  targetScale,
  holdoutMod,
  holdoutResidue,
  limit,
  progressEvery,
  estimatedTotalSamples,
}) {
  const overall = createMetricAccumulator();
  const selected = createMetricAccumulator();
  const holdout = createMetricAccumulator();
  const byBucketSelected = createBucketAccumulators(bucketSpecs.length);
  const byBucketHoldout = createBucketAccumulators(bucketSpecs.length);
  const totalBytes = calculateTotalInputBytes(inputFiles);
  const startMs = Date.now();
  const progressLogger = progressEvery > 0
    ? createProgressLogger({
      label: 'calibration-pass',
      totalBytes,
      progressEvery,
      estimatedTotalSamples,
      startMs,
    })
    : null;

  await streamTrainingSamples(inputFiles, { targetScale, limit }, ({ state, target, sampleIndex, totalBytesProcessed }) => {
    const prediction = evaluator.evaluate(state, state.currentPlayer);
    const residual = prediction - target;
    const empties = state.getEmptyCount();
    const bucketIndex = pickBucketIndexForEmpties(bucketSpecs, empties);
    const holdoutSample = shouldUseHoldout(sampleIndex, holdoutMod, holdoutResidue);

    updateMetricAccumulator(overall, residual);
    if (bucketIndex >= 0) {
      updateMetricAccumulator(selected, residual);
      updateMetricAccumulator(byBucketSelected[bucketIndex], residual);
      if (holdoutSample) {
        updateMetricAccumulator(holdout, residual);
        updateMetricAccumulator(byBucketHoldout[bucketIndex], residual);
      }
    }

    if (progressLogger) {
      progressLogger({ sampleIndex, totalBytesProcessed });
    }
  });

  return {
    overall,
    selected,
    holdout,
    byBucketSelected,
    byBucketHoldout,
  };
}

function buildBiasDeltasFromCorpusStats({
  profile,
  scope,
  shrink,
  maxBiasAbs,
  stats,
}) {
  const overallAccumulator = scope === 'holdout-selected'
    ? stats.holdout
    : (scope === 'selected-all' ? stats.selected : stats.overall);
  const overallMeanResidual = summarizeMetricAccumulator(overallAccumulator).meanResidual;

  return profile.trainedBuckets.map((bucket, bucketIndex) => {
    const scopedAccumulator = scope === 'holdout-selected'
      ? stats.byBucketHoldout[bucketIndex]
      : stats.byBucketSelected[bucketIndex];
    const scopedSummary = summarizeMetricAccumulator(scopedAccumulator);
    const meanResidual = Number.isFinite(scopedSummary.meanResidual)
      ? scopedSummary.meanResidual
      : (Number.isFinite(overallMeanResidual) ? overallMeanResidual : 0);
    const unclamped = -meanResidual * shrink;
    return Math.max(-maxBiasAbs, Math.min(maxBiasAbs, unclamped));
  });
}

async function verifyCalibrationOnCorpus({
  inputFiles,
  beforeEvaluator,
  afterEvaluator,
  bucketSpecs,
  targetScale,
  holdoutMod,
  holdoutResidue,
  limit,
  progressEvery,
  estimatedTotalSamples,
}) {
  const before = createVerificationAccumulatorSet(bucketSpecs.length);
  const after = createVerificationAccumulatorSet(bucketSpecs.length);
  const totalBytes = calculateTotalInputBytes(inputFiles);
  const startMs = Date.now();
  const progressLogger = progressEvery > 0
    ? createProgressLogger({
      label: 'verify-pass',
      totalBytes,
      progressEvery,
      estimatedTotalSamples,
      startMs,
    })
    : null;

  await streamTrainingSamples(inputFiles, { targetScale, limit }, ({ state, target, sampleIndex, totalBytesProcessed }) => {
    const beforeResidual = beforeEvaluator.evaluate(state, state.currentPlayer) - target;
    const afterResidual = afterEvaluator.evaluate(state, state.currentPlayer) - target;
    const empties = state.getEmptyCount();
    const bucketIndex = pickBucketIndexForEmpties(bucketSpecs, empties);
    const holdoutSample = shouldUseHoldout(sampleIndex, holdoutMod, holdoutResidue);

    updateMetricAccumulator(before.all, beforeResidual);
    updateMetricAccumulator(after.all, afterResidual);

    if (bucketIndex >= 0) {
      updateMetricAccumulator(before.selected, beforeResidual);
      updateMetricAccumulator(after.selected, afterResidual);
      updateMetricAccumulator(before.byBucketAll[bucketIndex], beforeResidual);
      updateMetricAccumulator(after.byBucketAll[bucketIndex], afterResidual);
      if (holdoutSample) {
        updateMetricAccumulator(before.holdout, beforeResidual);
        updateMetricAccumulator(after.holdout, afterResidual);
        updateMetricAccumulator(before.byBucketHoldout[bucketIndex], beforeResidual);
        updateMetricAccumulator(after.byBucketHoldout[bucketIndex], afterResidual);
      }
    }

    if (progressLogger) {
      progressLogger({ sampleIndex, totalBytesProcessed });
    }
  });

  return buildVerifiedDiagnostics({ before, after, bucketSpecs, targetScale });
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h || !args['tuple-json']) {
  printUsage();
  process.exit(args.help || args.h ? 0 : 1);
}

const tupleJsonPath = resolveCliPath(args['tuple-json']);
const outputJsonPath = args['output-json']
  ? resolveCliPath(args['output-json'])
  : resolveCliPath(path.join(path.dirname(tupleJsonPath), `${path.parse(tupleJsonPath).name}.calibrated.json`));
const summaryJsonPath = args['summary-json'] ? resolveCliPath(args['summary-json']) : null;
const scope = parseScope(args.scope);
const shrink = Math.max(0, toFiniteNumber(args.shrink, 1));
const tupleProfile = resolveTupleResidualProfile(loadJsonFileIfPresent(tupleJsonPath));
if (!tupleProfile) {
  throw new Error(`tuple residual profile JSON을 읽지 못했습니다: ${tupleJsonPath}`);
}

const targetScale = Math.max(1, toFiniteNumber(args['target-scale'], tupleProfile?.source?.targetScale ?? 3000));
const maxBiasStones = Math.abs(toFiniteNumber(args['max-bias-stones'], 1.5));
const maxBiasAbs = maxBiasStones * targetScale;
const holdoutMod = Math.max(0, Math.trunc(toFiniteNumber(args['holdout-mod'], tupleProfile?.source?.holdoutMod ?? 10)));
const holdoutResidue = Math.max(0, Math.trunc(toFiniteNumber(args['holdout-residue'], tupleProfile?.source?.holdoutResidue ?? 0)));
const limit = args.limit !== undefined ? Math.max(1, Math.trunc(toFiniteNumber(args.limit, 1))) : undefined;
const progressEvery = Math.max(0, Math.trunc(toFiniteNumber(args['progress-every'], 250000)));

const requestedCorpusInputs = [
  ...ensureArray(args.corpus),
  ...ensureArray(args['corpus-dir']),
];
const corpusFiles = requestedCorpusInputs.length > 0 ? await collectInputFileEntries(requestedCorpusInputs) : [];
const estimatedTotalSamples = limit ?? (corpusFiles.length > 0 ? detectKnownDatasetSampleCount(corpusFiles) : null) ?? null;

let bucketBiasDeltas = null;
let verificationDiagnostics = null;
let evaluationProfile = null;
let calibrationMode = 'diagnostics-only';

if (corpusFiles.length > 0) {
  calibrationMode = 'corpus';
  const evaluationProfilePath = args['evaluation-profile-json'] ? resolveCliPath(args['evaluation-profile-json']) : null;
  evaluationProfile = loadJsonFileIfPresent(evaluationProfilePath)
    ?? loadJsonFileIfPresent(tupleProfile?.source?.evaluationProfilePath)
    ?? ACTIVE_EVALUATION_PROFILE;

  console.log(`Calibrating tuple profile ${tupleProfile.name} with corpus (${corpusFiles.length} file(s)).`);
  console.log(`scope=${scope}, shrink=${shrink}, maxBias=${maxBiasStones.toFixed(3)} stones, holdoutMod=${holdoutMod}`);
  const beforeEvaluator = new Evaluator({
    evaluationProfile,
    tupleResidualProfile: tupleProfile,
  });
  const stats = await collectResidualMeansFromCorpus({
    inputFiles: corpusFiles,
    evaluator: beforeEvaluator,
    bucketSpecs: tupleProfile.trainedBuckets,
    targetScale,
    holdoutMod,
    holdoutResidue,
    limit,
    progressEvery,
    estimatedTotalSamples,
  });
  bucketBiasDeltas = buildBiasDeltasFromCorpusStats({
    profile: tupleProfile,
    scope,
    shrink,
    maxBiasAbs,
    stats,
  });
} else {
  console.log(`Calibrating tuple profile ${tupleProfile.name} from embedded diagnostics.`);
  console.log(`scope=${scope}, shrink=${shrink}, maxBias=${maxBiasStones.toFixed(3)} stones`);
  bucketBiasDeltas = deriveBiasDeltasFromDiagnostics(tupleProfile, scope, shrink, maxBiasAbs);
}

const calibrationMetadata = {
  version: 1,
  mode: calibrationMode,
  scope,
  shrink,
  maxBiasStones,
  targetScale,
  holdoutMod,
  holdoutResidue,
  sourceTupleProfileName: tupleProfile.name,
  sourceTupleProfileStage: tupleProfile.stage ?? null,
  generatedAt: new Date().toISOString(),
  outputProfileName: createOutputName(tupleProfile.name),
  outputDescription: createOutputDescription(tupleProfile.description),
  bucketBiasAdjustments: tupleProfile.trainedBuckets.map((bucket, bucketIndex) => ({
    key: bucket.key ?? null,
    minEmpties: bucket.minEmpties,
    maxEmpties: bucket.maxEmpties,
    previousBias: Number(bucket.bias ?? 0),
    deltaBias: Number(bucketBiasDeltas[bucketIndex] ?? 0),
    nextBias: Number(bucket.bias ?? 0) + Number(bucketBiasDeltas[bucketIndex] ?? 0),
  })),
};

const calibratedProfile = buildCalibratedProfile(tupleProfile, bucketBiasDeltas, calibrationMetadata);

if (corpusFiles.length > 0) {
  const beforeEvaluator = new Evaluator({
    evaluationProfile,
    tupleResidualProfile: tupleProfile,
  });
  const afterEvaluator = new Evaluator({
    evaluationProfile,
    tupleResidualProfile: calibratedProfile,
  });
  verificationDiagnostics = await verifyCalibrationOnCorpus({
    inputFiles: corpusFiles,
    beforeEvaluator,
    afterEvaluator,
    bucketSpecs: calibratedProfile.trainedBuckets,
    targetScale,
    holdoutMod,
    holdoutResidue,
    limit,
    progressEvery,
    estimatedTotalSamples,
  });
}

const finalProfile = verificationDiagnostics
  ? {
    ...calibratedProfile,
    calibration: {
      ...calibrationMetadata,
      evaluationProfileName: evaluationProfile?.name ?? null,
      verifiedDiagnostics: verificationDiagnostics,
    },
  }
  : calibratedProfile;

await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
await fs.promises.writeFile(outputJsonPath, JSON.stringify(finalProfile, null, 2), 'utf8');

const verificationSummary = verificationDiagnostics
  ? {
    holdoutMaeDeltaInStones: verificationDiagnostics?.holdoutSelected?.delta?.maeInStones ?? null,
    holdoutMeanResidualBeforeInStones: verificationDiagnostics?.holdoutSelected?.base?.meanResidualInStones ?? null,
    holdoutMeanResidualAfterInStones: verificationDiagnostics?.holdoutSelected?.candidate?.meanResidualInStones ?? null,
    selectedMaeDeltaInStones: verificationDiagnostics?.selectedAll?.delta?.maeInStones ?? null,
  }
  : null;

const summary = {
  generatedAt: new Date().toISOString(),
  tupleJsonPath,
  outputJsonPath,
  mode: calibrationMode,
  scope,
  shrink,
  targetScale,
  maxBiasStones,
  sourceTupleProfileName: tupleProfile.name ?? null,
  outputTupleProfileName: finalProfile.name ?? null,
  bucketBiasAdjustments: calibrationMetadata.bucketBiasAdjustments,
  verification: verificationSummary,
};

console.log(`Saved calibrated tuple profile to ${outputJsonPath}`);
for (const bucket of calibrationMetadata.bucketBiasAdjustments) {
  console.log(
    `  ${String(bucket.key ?? 'unknown').padEnd(10)} `
    + `bias ${bucket.previousBias.toFixed(2)} -> ${bucket.nextBias.toFixed(2)} `
    + `(delta=${formatSigned(bucket.deltaBias / targetScale, 4)} stones)`,
  );
}
if (verificationSummary) {
  console.log(
    `Verified holdout mean residual: ${formatSigned(verificationSummary.holdoutMeanResidualBeforeInStones)} -> ${formatSigned(verificationSummary.holdoutMeanResidualAfterInStones)} stones`,
  );
  console.log(`Verified holdout MAE delta: ${formatSigned(verificationSummary.holdoutMaeDeltaInStones)} stones`);
}

if (summaryJsonPath) {
  await fs.promises.mkdir(path.dirname(summaryJsonPath), { recursive: true });
  await fs.promises.writeFile(summaryJsonPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`Saved calibration summary to ${summaryJsonPath}`);
}
