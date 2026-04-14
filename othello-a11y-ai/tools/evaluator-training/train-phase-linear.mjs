#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  ACTIVE_MOVE_ORDERING_PROFILE,
  ACTIVE_MPC_PROFILE,
  ACTIVE_TUPLE_RESIDUAL_PROFILE,
} from '../../js/ai/evaluation-profiles.js';
import {
  addOuterProductSubsetInPlace,
  addScaledVectorSubsetInPlace,
  bucketAssignmentsForEmpties,
  bucketIndexForEmpties,
  buildProfileFromBucketWeights,
  calculateTotalInputBytes,
  collectInputFileEntries,
  createEvaluatorForProfile,
  createFeatureScratch,
  createRegressionVectorScratch,
  createMetricAccumulator,
  defaultEvaluationProfileName,
  detectKnownDatasetSampleCount,
  displayGeneratedProfilesModulePath,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  ensureArray,
  fillRegressionVectorFromState,
  formatDurationSeconds,
  formatInteger,
  loadJsonFileIfPresent,
  normalizeEvaluationSampleAssignmentMode,
  parseArgs,
  percentage,
  regressionFeatureKeysForEvaluationFeatureList,
  resolveCliPath,
  resolveSeedProfile,
  resolveTrainingOutputPath,
  solveLinearSystem,
  solutionFromWeights,
  streamTrainingSamples,
  summarizeMetricAccumulator,
  updateMetricAccumulator,
  writeGeneratedProfilesModule,
  zeroMatrix,
  zeroVector,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('train-phase-linear.mjs');
  const outputJsonPath = displayTrainingOutputPath('trained-evaluation-profile.json');
  const outputModulePath = displayGeneratedProfilesModulePath();
  console.log(`Usage:
  node ${toolPath} \
    --input <file-or-dir> [--input <file-or-dir> ...] \
    [--target-scale 3000] [--holdout-mod 10] [--holdout-residue 0] \
    [--lambda 5000] [--limit 200000] [--progress-every 250000] [--skip-diagnostics] \
    [--sample-assignment-mode hard|linear-adjacent] \
    [--exclude-features bias,potentialMobility] \
    [--exclude-features-by-bucket "late-a:potentialMobility,edgePattern;late-b:potentialMobility"] [--keep-parity-aliases] \
    [--seed-profile path/to/profile.json] \
    [--output-json ${outputJsonPath}] \
    [--output-module ${outputModulePath}] [--module-format compact|expanded] \
    [--move-ordering-profile-json path/to/trained-move-ordering-profile.json] [--clear-move-ordering-profile]

Supported input formats:
  1) Egaroucid training text lines: <64-char board> <score>
  2) JSONL/NDJSON with board/boardString or black/white bitboards and score/target/engineScore
`);
}

function toFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function shouldUseHoldout(sampleIndex, holdoutMod, holdoutResidue) {
  return holdoutMod > 0 && (sampleIndex % holdoutMod) === holdoutResidue;
}

function parseFeatureList(values, allowedKeys) {
  const allowed = new Set(allowedKeys);
  const result = new Set();
  for (const value of ensureArray(values)) {
    for (const token of String(value).split(',')) {
      const key = token.trim();
      if (key === '') {
        continue;
      }
      if (!allowed.has(key)) {
        throw new Error(`알 수 없는 feature key: ${key}`);
      }
      result.add(key);
    }
  }
  return result;
}

function parseBucketFeatureList(values, allowedFeatureKeys, allowedBucketKeys) {
  const allowedFeatures = new Set(allowedFeatureKeys);
  const allowedBuckets = new Set(allowedBucketKeys);
  const result = new Map();

  for (const rawValue of ensureArray(values)) {
    for (const clause of String(rawValue).split(';')) {
      const trimmed = clause.trim();
      if (trimmed === '') {
        continue;
      }
      const separatorIndex = trimmed.indexOf(':');
      if (separatorIndex <= 0 || separatorIndex >= trimmed.length - 1) {
        throw new Error(`잘못된 bucket feature exclusion 형식: ${trimmed}`);
      }
      const bucketKey = trimmed.slice(0, separatorIndex).trim();
      const featureText = trimmed.slice(separatorIndex + 1).trim();
      if (!allowedBuckets.has(bucketKey)) {
        throw new Error(`알 수 없는 bucket key: ${bucketKey}`);
      }
      const bucketSet = result.get(bucketKey) ?? new Set();
      for (const featureToken of featureText.split(',')) {
        const featureKey = featureToken.trim();
        if (featureKey === '') {
          continue;
        }
        if (!allowedFeatures.has(featureKey)) {
          throw new Error(`알 수 없는 feature key: ${featureKey}`);
        }
        bucketSet.add(featureKey);
      }
      result.set(bucketKey, bucketSet);
    }
  }

  return result;
}

function formatFeatureSet(featureSet) {
  return [...featureSet].sort((left, right) => left.localeCompare(right));
}

function createProgressLogger({
  label,
  totalWorkBytes,
  phaseOffsetBytes,
  phaseTotalBytes,
  progressEvery,
  estimatedTotalSamples,
  globalStartMs,
}) {
  let nextThreshold = progressEvery > 0 ? progressEvery : Number.POSITIVE_INFINITY;

  return ({ sampleIndex, totalBytesProcessed }) => {
    const processedSamples = sampleIndex + 1;
    if (processedSamples < nextThreshold) {
      return;
    }
    while (processedSamples >= nextThreshold) {
      nextThreshold += progressEvery;
    }

    const elapsedSeconds = Math.max(0.001, (Date.now() - globalStartMs) / 1000);
    const overallProcessedBytes = Math.min(totalWorkBytes, phaseOffsetBytes + totalBytesProcessed);
    const overallFraction = totalWorkBytes > 0 ? overallProcessedBytes / totalWorkBytes : null;
    const phaseFraction = phaseTotalBytes > 0 ? totalBytesProcessed / phaseTotalBytes : null;
    const samplesPerSecond = processedSamples / elapsedSeconds;
    const bytesPerSecond = overallProcessedBytes / elapsedSeconds;
    const remainingBytes = Math.max(0, totalWorkBytes - overallProcessedBytes);
    const etaSeconds = bytesPerSecond > 0 ? remainingBytes / bytesPerSecond : null;
    const sampleText = estimatedTotalSamples
      ? `${formatInteger(processedSamples)} / ${formatInteger(estimatedTotalSamples)}`
      : formatInteger(processedSamples);

    console.log(
      `[${label}] samples=${sampleText} phase=${percentage(phaseFraction)} overall=${percentage(overallFraction)} `
      + `speed=${formatInteger(samplesPerSecond)} sample/s ETA=${formatDurationSeconds(etaSeconds)}`,
    );
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
  throw new Error('입력 파일을 찾지 못했습니다. --input 또는 --input-dir 경로를 확인하십시오.');
}

const totalInputBytes = calculateTotalInputBytes(inputFiles);
const targetScale = toFiniteNumber(args['target-scale'], 3000);
const holdoutMod = Math.max(0, Math.trunc(toFiniteNumber(args['holdout-mod'], 10)));
const holdoutResidue = Math.max(0, Math.trunc(toFiniteNumber(args['holdout-residue'], 0)));
const regularization = Math.max(0, toFiniteNumber(args.lambda ?? args.l2, 5000));
const limit = args.limit !== undefined ? Math.max(1, Math.trunc(toFiniteNumber(args.limit, 1))) : undefined;
const progressEvery = Math.max(0, Math.trunc(toFiniteNumber(args['progress-every'], 250000)));
const skipDiagnostics = Boolean(args['skip-diagnostics'] || args['fit-only']);
const outputJsonPath = args['output-json'] ? resolveCliPath(args['output-json']) : resolveTrainingOutputPath('trained-evaluation-profile.json');
const outputModulePath = args['output-module'] ? resolveCliPath(args['output-module']) : null;
const moduleFormat = typeof args['module-format'] === 'string' ? args['module-format'] : 'compact';
const moduleMoveOrderingProfile = args['clear-move-ordering-profile']
  ? null
  : (loadJsonFileIfPresent(args['move-ordering-profile-json']) ?? ACTIVE_MOVE_ORDERING_PROFILE ?? null);
const moduleTupleResidualProfile = ACTIVE_TUPLE_RESIDUAL_PROFILE ?? null;
const moduleMpcProfile = ACTIVE_MPC_PROFILE ?? null;
const profileName = typeof args.name === 'string' ? args.name : defaultEvaluationProfileName();
const description = typeof args.description === 'string'
  ? args.description
  : '회귀 기반으로 재추정한 phase-bucket linear evaluator입니다.';
const estimatedTotalSamples = limit ?? detectKnownDatasetSampleCount(inputFiles) ?? null;

const seedProfileInput = loadJsonFileIfPresent(args['seed-profile']);
const seedProfile = resolveSeedProfile(seedProfileInput);
const regressionFeatureKeys = regressionFeatureKeysForEvaluationFeatureList(seedProfile.featureKeys);
const dimension = regressionFeatureKeys.length;
const inferredSampleAssignmentMode = seedProfile.interpolation ? 'linear-adjacent' : 'hard';
const sampleAssignmentMode = normalizeEvaluationSampleAssignmentMode(
  args['sample-assignment-mode'],
  inferredSampleAssignmentMode,
);
const globalExcludedFeatures = parseFeatureList(args['exclude-features'], regressionFeatureKeys);
const bucketExcludedFeatures = parseBucketFeatureList(
  args['exclude-features-by-bucket'],
  regressionFeatureKeys,
  seedProfile.phaseBuckets.map((bucket) => bucket.key),
);
const keepParityAliases = Boolean(args['keep-parity-aliases']);
const excludedFeaturesByBucket = seedProfile.phaseBuckets.map((bucket) => {
  const excluded = new Set(globalExcludedFeatures);
  for (const key of bucketExcludedFeatures.get(bucket.key) ?? []) {
    excluded.add(key);
  }
  if (!keepParityAliases && bucket.minEmpties > 18) {
    excluded.add('parityGlobal');
    excluded.add('parityRegion');
  }
  return excluded;
});
const activeIndicesByBucket = excludedFeaturesByBucket.map((excluded) => regressionFeatureKeys
  .map((key, index) => (excluded.has(key) ? null : index))
  .filter((index) => index !== null));
const priorSolutions = seedProfile.phaseBuckets.map((bucket) => solutionFromWeights(bucket.weights, seedProfile.featureKeys));
const bucketTrainStats = seedProfile.phaseBuckets.map(() => ({
  xtx: zeroMatrix(dimension),
  xty: zeroVector(dimension),
  trainCount: 0,
  trainWeightSum: 0,
  holdoutCount: 0,
  holdoutWeightSum: 0,
}));
const scratch = createFeatureScratch();
const vectorScratch = createRegressionVectorScratch(seedProfile.featureKeys);
const globalStartMs = Date.now();
const totalWorkBytes = totalInputBytes * (skipDiagnostics ? 1 : 2);

console.log(`Training on ${inputFiles.length} file(s) with ${seedProfile.phaseBuckets.length} phase bucket(s).`);
console.log(`targetScale=${targetScale}, holdoutMod=${holdoutMod}, lambda=${regularization}${limit ? `, limit=${limit}` : ''}`);
console.log(`featureKeys=${seedProfile.featureKeys.length}, regressionDimension=${dimension}, sampleAssignmentMode=${sampleAssignmentMode}`);
if (estimatedTotalSamples) {
  console.log(`Estimated samples: ${formatInteger(estimatedTotalSamples)}`);
}
if (progressEvery > 0) {
  console.log(`Progress logging every ${formatInteger(progressEvery)} samples.`);
}
if (skipDiagnostics) {
  console.log('Diagnostics pass disabled (--skip-diagnostics).');
}
if (globalExcludedFeatures.size > 0) {
  console.log(`Global excluded features: ${formatFeatureSet(globalExcludedFeatures).join(', ')}`);
}
if (!keepParityAliases) {
  console.log('Buckets entirely above 18 empties automatically fold parity aliases into parity.');
}
seedProfile.phaseBuckets.forEach((bucket, bucketIndex) => {
  const excluded = formatFeatureSet(excludedFeaturesByBucket[bucketIndex]);
  if (excluded.length > 0) {
    console.log(`  ${bucket.key.padEnd(10)} excluded=${excluded.join(', ')}`);
  }
});

const fitProgress = progressEvery > 0
  ? createProgressLogger({
    label: 'fit',
    totalWorkBytes,
    phaseOffsetBytes: 0,
    phaseTotalBytes: totalInputBytes,
    progressEvery,
    estimatedTotalSamples,
    globalStartMs,
  })
  : null;

const seenSamples = await streamTrainingSamples(inputFiles, { targetScale, limit }, ({ state, target, sampleIndex, totalBytesProcessed }) => {
  const { record, vector } = fillRegressionVectorFromState(state, scratch, seedProfile.featureKeys, vectorScratch);
  const hardBucketIndex = bucketIndexForEmpties(seedProfile, record.empties);
  const assignments = bucketAssignmentsForEmpties(seedProfile, record.empties, sampleAssignmentMode);

  if (shouldUseHoldout(sampleIndex, holdoutMod, holdoutResidue)) {
    const bucketStats = bucketTrainStats[hardBucketIndex];
    bucketStats.holdoutCount += 1;
    bucketStats.holdoutWeightSum += 1;
    if (fitProgress) {
      fitProgress({ sampleIndex, totalBytesProcessed });
    }
    return;
  }

  for (const assignment of assignments) {
    const bucketStats = bucketTrainStats[assignment.bucketIndex];
    const activeIndices = activeIndicesByBucket[assignment.bucketIndex];
    addOuterProductSubsetInPlace(bucketStats.xtx, vector, activeIndices, assignment.weight);
    addScaledVectorSubsetInPlace(bucketStats.xty, vector, target * assignment.weight, activeIndices);
    bucketStats.trainWeightSum += assignment.weight;
  }

  bucketTrainStats[hardBucketIndex].trainCount += 1;
  if (fitProgress) {
    fitProgress({ sampleIndex, totalBytesProcessed });
  }
});

const solvedWeightVectors = bucketTrainStats.map((stats, bucketIndex) => {
  if (stats.trainWeightSum <= 1e-9) {
    return [...priorSolutions[bucketIndex]];
  }

  const systemMatrix = stats.xtx.map((row, rowIndex) => row.map((value, colIndex) => (
    value + (rowIndex === colIndex ? regularization : 0)
  )));
  const systemVector = stats.xty.map((value, index) => value + (regularization * priorSolutions[bucketIndex][index]));
  const solution = solveLinearSystem(systemMatrix, systemVector);
  return solution ?? [...priorSolutions[bucketIndex]];
});

let trainedProfile = buildProfileFromBucketWeights(seedProfile, solvedWeightVectors, {
  name: profileName,
  description,
  source: {
    inputFiles: inputFiles.map((entry) => entry.path),
    targetScale,
    holdoutMod,
    holdoutResidue,
    regularization,
    seenSamples,
    skipDiagnostics,
    sampleAssignmentMode,
    featureKeys: [...seedProfile.featureKeys],
    keepParityAliases,
    globalExcludedFeatures: formatFeatureSet(globalExcludedFeatures),
    bucketExcludedFeatures: seedProfile.phaseBuckets.map((bucket, index) => ({
      key: bucket.key,
      minEmpties: bucket.minEmpties,
      maxEmpties: bucket.maxEmpties,
      excludedFeatures: formatFeatureSet(excludedFeaturesByBucket[index]),
    })),
  },
});

const trainCountsByBucket = seedProfile.phaseBuckets.map((bucket, index) => ({
  key: bucket.key,
  minEmpties: bucket.minEmpties,
  maxEmpties: bucket.maxEmpties,
  trainCount: bucketTrainStats[index].trainCount,
  trainWeightSum: bucketTrainStats[index].trainWeightSum,
  holdoutCount: bucketTrainStats[index].holdoutCount,
  holdoutWeightSum: bucketTrainStats[index].holdoutWeightSum,
}));
const excludedFeatureSummaryByBucket = seedProfile.phaseBuckets.map((bucket, index) => ({
  key: bucket.key,
  minEmpties: bucket.minEmpties,
  maxEmpties: bucket.maxEmpties,
  excludedFeatures: formatFeatureSet(excludedFeaturesByBucket[index]),
  activeFeatureCount: activeIndicesByBucket[index].length,
}));

if (!skipDiagnostics) {
  const evaluator = createEvaluatorForProfile(trainedProfile);
  const overallHoldout = createMetricAccumulator();
  const holdoutByBucket = seedProfile.phaseBuckets.map(() => createMetricAccumulator());
  const overallAll = createMetricAccumulator();
  const allByBucket = seedProfile.phaseBuckets.map(() => createMetricAccumulator());
  const diagnosticsProgress = progressEvery > 0
    ? createProgressLogger({
      label: 'diagnostics',
      totalWorkBytes,
      phaseOffsetBytes: totalInputBytes,
      phaseTotalBytes: totalInputBytes,
      progressEvery,
      estimatedTotalSamples,
      globalStartMs,
    })
    : null;

  await streamTrainingSamples(inputFiles, { targetScale, limit }, ({ state, target, sampleIndex, totalBytesProcessed }) => {
    const bucketIndex = bucketIndexForEmpties(seedProfile, state.getEmptyCount());
    const prediction = evaluator.evaluate(state, state.currentPlayer);
    const residual = prediction - target;

    updateMetricAccumulator(overallAll, residual);
    updateMetricAccumulator(allByBucket[bucketIndex], residual);

    if (shouldUseHoldout(sampleIndex, holdoutMod, holdoutResidue)) {
      updateMetricAccumulator(overallHoldout, residual);
      updateMetricAccumulator(holdoutByBucket[bucketIndex], residual);
    }

    if (diagnosticsProgress) {
      diagnosticsProgress({ sampleIndex, totalBytesProcessed });
    }
  });

  const holdoutSummary = summarizeMetricAccumulator(overallHoldout);
  const allSummary = summarizeMetricAccumulator(overallAll);
  const bucketSummaries = seedProfile.phaseBuckets.map((bucket, index) => ({
    key: bucket.key,
    minEmpties: bucket.minEmpties,
    maxEmpties: bucket.maxEmpties,
    trainCount: bucketTrainStats[index].trainCount,
    holdoutCount: bucketTrainStats[index].holdoutCount,
    holdout: summarizeMetricAccumulator(holdoutByBucket[index]),
    all: summarizeMetricAccumulator(allByBucket[index]),
  }));

  trainedProfile = {
    ...trainedProfile,
    diagnostics: {
      trainCountsByBucket,
      excludedFeatureSummaryByBucket,
      featureKeys: [...seedProfile.featureKeys],
      sampleAssignmentMode,
      all: {
        ...allSummary,
        maeInStones: allSummary.mae === null ? null : allSummary.mae / targetScale,
        rmseInStones: allSummary.rmse === null ? null : allSummary.rmse / targetScale,
        meanResidualInStones: allSummary.meanResidual === null ? null : allSummary.meanResidual / targetScale,
        stdDevResidualInStones: allSummary.stdDevResidual === null ? null : allSummary.stdDevResidual / targetScale,
        maxAbsResidualInStones: allSummary.maxAbsResidual === null ? null : allSummary.maxAbsResidual / targetScale,
      },
      holdout: {
        ...holdoutSummary,
        maeInStones: holdoutSummary.mae === null ? null : holdoutSummary.mae / targetScale,
        rmseInStones: holdoutSummary.rmse === null ? null : holdoutSummary.rmse / targetScale,
        meanResidualInStones: holdoutSummary.meanResidual === null ? null : holdoutSummary.meanResidual / targetScale,
        stdDevResidualInStones: holdoutSummary.stdDevResidual === null ? null : holdoutSummary.stdDevResidual / targetScale,
        maxAbsResidualInStones: holdoutSummary.maxAbsResidual === null ? null : holdoutSummary.maxAbsResidual / targetScale,
      },
      byBucket: bucketSummaries.map((bucket) => ({
        key: bucket.key,
        minEmpties: bucket.minEmpties,
        maxEmpties: bucket.maxEmpties,
        trainCount: bucket.trainCount,
        holdoutCount: bucket.holdoutCount,
        mpcResidualMean: bucket.holdout.meanResidual,
        mpcResidualStdDev: bucket.holdout.stdDevResidual,
        holdout: {
          ...bucket.holdout,
          maeInStones: bucket.holdout.mae === null ? null : bucket.holdout.mae / targetScale,
          rmseInStones: bucket.holdout.rmse === null ? null : bucket.holdout.rmse / targetScale,
        },
        all: {
          ...bucket.all,
          maeInStones: bucket.all.mae === null ? null : bucket.all.mae / targetScale,
          rmseInStones: bucket.all.rmse === null ? null : bucket.all.rmse / targetScale,
        },
      })),
      createdAt: new Date().toISOString(),
    },
  };
} else {
  trainedProfile = {
    ...trainedProfile,
    diagnostics: {
      trainCountsByBucket,
      excludedFeatureSummaryByBucket,
      featureKeys: [...seedProfile.featureKeys],
      sampleAssignmentMode,
      skipped: true,
      reason: '--skip-diagnostics option used',
      createdAt: new Date().toISOString(),
    },
  };
}

await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
await fs.promises.writeFile(outputJsonPath, `${JSON.stringify(trainedProfile, null, 2)}\n`, 'utf8');
if (outputModulePath) {
  await writeGeneratedProfilesModule(outputModulePath, {
    evaluationProfile: trainedProfile,
    moveOrderingProfile: moduleMoveOrderingProfile,
    tupleResidualProfile: moduleTupleResidualProfile,
    mpcProfile: moduleMpcProfile,
  }, {
    moduleFormat,
  });
}

const elapsedSeconds = (Date.now() - globalStartMs) / 1000;
console.log(`Seen samples: ${formatInteger(seenSamples)}`);
console.log(`Elapsed: ${formatDurationSeconds(elapsedSeconds)}`);
console.log(`Saved JSON profile to ${outputJsonPath}`);
if (outputModulePath) {
  console.log(`Saved app-ready module to ${outputModulePath}`);
  console.log(`  module format               : ${moduleFormat}`);
  console.log(`  preserved move-ordering profile: ${moduleMoveOrderingProfile?.name ?? 'null'}`);
  console.log(`  preserved tuple residual slot : ${moduleTupleResidualProfile?.name ?? 'null'}`);
  console.log(`  preserved mpc slot            : ${moduleMpcProfile?.name ?? 'null'}`);
}
if (skipDiagnostics) {
  console.log('Diagnostics pass skipped. Run benchmark-profile.mjs later if you want holdout/all MAE on the trained profile.');
} else if (trainedProfile.diagnostics?.holdout?.count > 0) {
  const holdoutSummary = trainedProfile.diagnostics.holdout;
  console.log(`Holdout MAE: ${holdoutSummary.mae?.toFixed(2)} (${(holdoutSummary.mae / targetScale).toFixed(3)} stones)`);
  console.log(`Holdout RMSE: ${holdoutSummary.rmse?.toFixed(2)} (${(holdoutSummary.rmse / targetScale).toFixed(3)} stones)`);
} else {
  console.log('Holdout set disabled or empty.');
}
for (const bucket of trainedProfile.diagnostics.trainCountsByBucket ?? []) {
  const byBucket = trainedProfile.diagnostics.byBucket?.find((candidate) => candidate.key === bucket.key) ?? null;
  const holdoutMae = byBucket?.holdout?.mae;
  console.log(`  ${bucket.key.padEnd(10)} train=${String(bucket.trainCount).padStart(8)} holdout=${String(bucket.holdoutCount).padStart(8)} holdoutMAE=${holdoutMae === null || holdoutMae === undefined ? 'n/a' : holdoutMae.toFixed(1)}`);
}
