#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  REGRESSION_FEATURE_KEYS,
  addOuterProductInPlace,
  addScaledVectorInPlace,
  bucketIndexForEmpties,
  buildProfileFromBucketWeights,
  calculateTotalInputBytes,
  collectInputFileEntries,
  createEvaluatorForProfile,
  createFeatureScratch,
  detectKnownDatasetSampleCount,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  ensureArray,
  estimateSampleCountFromBytes,
  fillRegressionVectorFromState,
  formatDurationSeconds,
  formatInteger,
  loadJsonFileIfPresent,
  parseArgs,
  resolveCliPath,
  resolveSeedProfile,
  solveLinearSystem,
  solutionFromWeights,
  streamTrainingSamples,
  zeroMatrix,
  zeroVector,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('estimate-training-time.mjs');
  const outputJsonPath = displayTrainingOutputPath('training-time-estimate.json');
  console.log(`Usage:
  node ${toolPath} \
    --input <file-or-dir> [--input <file-or-dir> ...] \
    [--sample-limit 200000] [--target-scale 3000] [--holdout-mod 10] [--holdout-residue 0] \
    [--lambda 5000] [--total-samples 25514097] [--seed-profile path/to/profile.json] \
    [--skip-diagnostics] [--output-json ${outputJsonPath}]
`);
}

function toFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function shouldUseHoldout(sampleIndex, holdoutMod, holdoutResidue) {
  return holdoutMod > 0 && (sampleIndex % holdoutMod) === holdoutResidue;
}

function secondsFromMs(startMs) {
  return Math.max(0.001, (Date.now() - startMs) / 1000);
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

const totalInputBytes = calculateTotalInputBytes(inputFiles);
const sampleLimit = Math.max(1, Math.trunc(toFiniteNumber(args['sample-limit'], 200000)));
const targetScale = toFiniteNumber(args['target-scale'], 3000);
const holdoutMod = Math.max(0, Math.trunc(toFiniteNumber(args['holdout-mod'], 10)));
const holdoutResidue = Math.max(0, Math.trunc(toFiniteNumber(args['holdout-residue'], 0)));
const regularization = Math.max(0, toFiniteNumber(args.lambda ?? args.l2, 5000));
const skipDiagnostics = Boolean(args['skip-diagnostics'] || args['fit-only']);
const outputJsonPath = args['output-json'] ? resolveCliPath(args['output-json']) : null;
const forcedTotalSamples = args['total-samples'] !== undefined
  ? Math.max(1, Math.trunc(toFiniteNumber(args['total-samples'], 1)))
  : null;

const seedProfileInput = loadJsonFileIfPresent(args['seed-profile']);
const seedProfile = resolveSeedProfile(seedProfileInput);
const dimension = REGRESSION_FEATURE_KEYS.length;
const priorSolutions = seedProfile.phaseBuckets.map((bucket) => solutionFromWeights(bucket.weights));
const bucketTrainStats = seedProfile.phaseBuckets.map(() => ({
  xtx: zeroMatrix(dimension),
  xty: zeroVector(dimension),
  trainCount: 0,
  holdoutCount: 0,
}));
const scratches = seedProfile.phaseBuckets.map(() => createFeatureScratch());

console.log(`Benchmarking training throughput on ${inputFiles.length} file(s).`);
console.log(`sampleLimit=${formatInteger(sampleLimit)} targetScale=${targetScale} holdoutMod=${holdoutMod} lambda=${regularization}`);

let sampledBytes = 0;
const fitStartMs = Date.now();
const seenSamples = await streamTrainingSamples(inputFiles, { targetScale, limit: sampleLimit }, ({ state, target, sampleIndex, totalBytesProcessed }) => {
  sampledBytes = totalBytesProcessed;
  const scratch = scratches[0];
  const { record, vector } = fillRegressionVectorFromState(state, scratch);
  const bucketIndex = bucketIndexForEmpties(seedProfile, record.empties);
  const bucketStats = bucketTrainStats[bucketIndex];

  if (shouldUseHoldout(sampleIndex, holdoutMod, holdoutResidue)) {
    bucketStats.holdoutCount += 1;
    return;
  }

  addOuterProductInPlace(bucketStats.xtx, vector, 1);
  addScaledVectorInPlace(bucketStats.xty, vector, target);
  bucketStats.trainCount += 1;
});
const fitSeconds = secondsFromMs(fitStartMs);
const fitSamplesPerSecond = seenSamples / fitSeconds;

const solvedWeightVectors = bucketTrainStats.map((stats, bucketIndex) => {
  if (stats.trainCount === 0) {
    return [...priorSolutions[bucketIndex]];
  }

  const systemMatrix = stats.xtx.map((row, rowIndex) => row.map((value, colIndex) => (
    value + (rowIndex === colIndex ? regularization : 0)
  )));
  const systemVector = stats.xty.map((value, index) => value + (regularization * priorSolutions[bucketIndex][index]));
  const solution = solveLinearSystem(systemMatrix, systemVector);
  return solution ?? [...priorSolutions[bucketIndex]];
});

const trainedProfile = buildProfileFromBucketWeights(seedProfile, solvedWeightVectors, {
  name: 'estimated-profile-sample',
  description: 'sample profile for throughput estimation',
});

let diagnosticsSeconds = 0;
let diagnosticsSamplesPerSecond = null;
if (!skipDiagnostics) {
  const evaluator = createEvaluatorForProfile(trainedProfile);
  const diagnosticsStartMs = Date.now();
  let checksum = 0;
  await streamTrainingSamples(inputFiles, { targetScale, limit: sampleLimit }, ({ state }) => {
    const scratch = scratches[0];
    const { record } = fillRegressionVectorFromState(state, scratch);
    bucketIndexForEmpties(seedProfile, record.empties);
    checksum += evaluator.evaluate(state, state.currentPlayer);
  });
  diagnosticsSeconds = secondsFromMs(diagnosticsStartMs);
  diagnosticsSamplesPerSecond = seenSamples / diagnosticsSeconds;
  if (!Number.isFinite(checksum)) {
    throw new Error('Unexpected diagnostics checksum.');
  }
}

const averageBytesPerSample = seenSamples > 0 ? sampledBytes / seenSamples : null;
const detectedTotalSamples = detectKnownDatasetSampleCount(inputFiles);
const estimatedTotalSamples = forcedTotalSamples
  ?? detectedTotalSamples
  ?? estimateSampleCountFromBytes(totalInputBytes, averageBytesPerSample);
const fitOnlySecondsEstimate = estimatedTotalSamples && fitSamplesPerSecond > 0
  ? estimatedTotalSamples / fitSamplesPerSecond
  : null;
const fullRunSecondsEstimate = skipDiagnostics
  ? fitOnlySecondsEstimate
  : (estimatedTotalSamples && fitSamplesPerSecond > 0 && diagnosticsSamplesPerSecond > 0
    ? (estimatedTotalSamples / fitSamplesPerSecond) + (estimatedTotalSamples / diagnosticsSamplesPerSecond)
    : null);
const conservativeSecondsEstimate = fullRunSecondsEstimate === null ? null : fullRunSecondsEstimate * 1.25;
const optimisticSecondsEstimate = fullRunSecondsEstimate === null ? null : fullRunSecondsEstimate * 0.85;

const summary = {
  inputFiles: inputFiles.map((entry) => entry.path),
  totalInputBytes,
  sampleLimit,
  seenSamples,
  sampledBytes,
  averageBytesPerSample,
  fitSeconds,
  fitSamplesPerSecond,
  diagnosticsSeconds,
  diagnosticsSamplesPerSecond,
  estimatedTotalSamples,
  fitOnlySecondsEstimate,
  fullRunSecondsEstimate,
  optimisticSecondsEstimate,
  conservativeSecondsEstimate,
  skipDiagnostics,
  createdAt: new Date().toISOString(),
};

console.log(`Sampled ${formatInteger(seenSamples)} positions (${((seenSamples / Math.max(1, estimatedTotalSamples ?? seenSamples)) * 100).toFixed(2)}% of estimated full set).`);
console.log(`Average bytes per sample: ${averageBytesPerSample ? averageBytesPerSample.toFixed(2) : 'n/a'}`);
console.log(`Fit pass throughput: ${formatInteger(fitSamplesPerSecond)} sample/s (${formatDurationSeconds(fitSeconds)})`);
if (!skipDiagnostics) {
  console.log(`Diagnostics pass throughput: ${formatInteger(diagnosticsSamplesPerSecond)} sample/s (${formatDurationSeconds(diagnosticsSeconds)})`);
}
if (detectedTotalSamples) {
  console.log(`Detected official dataset size: ${formatInteger(detectedTotalSamples)} samples.`);
} else if (forcedTotalSamples) {
  console.log(`Using user-provided total sample count: ${formatInteger(forcedTotalSamples)}.`);
} else {
  console.log(`Estimated total samples from bytes: ${formatInteger(estimatedTotalSamples)}.`);
}
console.log(`Estimated fit-only time: ${formatDurationSeconds(fitOnlySecondsEstimate)}`);
if (!skipDiagnostics) {
  console.log(`Estimated full train+diagnostics time: ${formatDurationSeconds(fullRunSecondsEstimate)}`);
  console.log(`Practical range: ${formatDurationSeconds(optimisticSecondsEstimate)} ~ ${formatDurationSeconds(conservativeSecondsEstimate)}`);
}

if (outputJsonPath) {
  await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
  await fs.promises.writeFile(outputJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(`Saved estimate JSON to ${outputJsonPath}`);
}
