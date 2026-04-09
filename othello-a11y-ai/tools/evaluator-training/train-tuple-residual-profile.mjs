#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  ACTIVE_EVALUATION_PROFILE,
  ACTIVE_MOVE_ORDERING_PROFILE,
  ACTIVE_MPC_PROFILE,
  DEFAULT_TUPLE_RESIDUAL_LAYOUT_NAME,
  DEFAULT_TUPLE_RESIDUAL_PHASE_BUCKET_KEYS,
  EVALUATION_PHASE_BUCKET_SPECS,
  resolveTupleResidualLayout,
  resolveTupleResidualProfile,
} from '../../js/ai/evaluation-profiles.js';
import { Evaluator } from '../../js/ai/evaluator.js';
import { bitFromIndex } from '../../js/core/bitboard.js';
import {
  buildTupleResidualProfileFromWeights,
  calculateTotalInputBytes,
  collectInputFileEntries,
  createMetricAccumulator,
  defaultTupleResidualProfileName,
  detectKnownDatasetSampleCount,
  displayGeneratedProfilesModulePath,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  ensureArray,
  formatDurationSeconds,
  formatInteger,
  loadJsonFileIfPresent,
  parseArgs,
  percentage,
  resolveCliPath,
  resolveGeneratedProfilesModulePath,
  resolveTrainingOutputPath,
  streamTrainingSamples,
  summarizeMetricAccumulator,
  updateMetricAccumulator,
  writeGeneratedProfilesModule,
} from './lib.mjs';

const INDEX_BITS = Object.freeze(Array.from({ length: 64 }, (_, index) => bitFromIndex(index)));

function printUsage() {
  const toolPath = displayTrainingToolPath('train-tuple-residual-profile.mjs');
  const outputJsonPath = displayTrainingOutputPath('trained-tuple-residual-profile.json');
  const outputModulePath = displayTrainingOutputPath('learned-eval-profile.generated.js');
  console.log(`Usage:
  node ${toolPath} \
    --input <file-or-dir> [--input <file-or-dir> ...] \
    [--evaluation-profile-json path/to/trained-evaluation-profile.json] \
    [--layout-name ${DEFAULT_TUPLE_RESIDUAL_LAYOUT_NAME} | --layout-json path/to/layout-or-profile.json] \
    [--phase-buckets ${DEFAULT_TUPLE_RESIDUAL_PHASE_BUCKET_KEYS.join(',')}] \
    [--target-scale 3000] [--holdout-mod 10] [--holdout-residue 0] \
    [--sample-stride 4] [--sample-residue 0] [--epochs 1] \
    [--learning-rate 0.05] [--l2 0.0005] [--gradient-clip 90000] [--min-visits 32] \
    [--limit 2000000] [--progress-every 250000] [--skip-diagnostics] \
    [--seed-profile path/to/tuple-profile.json] \
    [--output-json ${outputJsonPath}] \
    [--output-module ${outputModulePath}] [--module-format compact|expanded]

설명:
- 현재 phase-linear evaluator를 base로 두고, 선택한 empties bucket에 한해서 tuple residual table을 추가 학습합니다.
- target은 raw teacher score가 아니라 (teacher - current base evaluator) residual을 간접적으로 맞춥니다.
- runtime은 zero-sum을 유지하기 위해 tuple residual을 항상 side-to-move 관점으로 적용합니다.
- 기본 layout은 외곽 2-rank/file의 인접 가로/세로 pair 56개입니다.
- --layout-json은 순수 layout JSON뿐 아니라, 기존 tuple profile JSON 전체를 넣어도 그 안의 layout을 자동 사용합니다.
- --seed-profile만 주고 layout을 따로 지정하지 않으면, seed profile의 layout을 자동으로 이어받습니다.
- tuple table 외에 bucket bias(상수항)도 함께 학습하므로, 재학습 시 버킷별 mean-shift를 직접 줄일 수 있습니다.
`);
}

function toFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function unwrapTupleLayoutInput(value) {
  if (value && typeof value === 'object' && !Array.isArray(value) && value.layout && typeof value.layout === 'object') {
    return value.layout;
  }
  return value;
}

function shouldUseHoldout(sampleIndex, holdoutMod, holdoutResidue) {
  return holdoutMod > 0 && (sampleIndex % holdoutMod) === holdoutResidue;
}

function parsePhaseBuckets(values) {
  const tokens = ensureArray(values).flatMap((value) => String(value).split(',')).map((token) => token.trim()).filter(Boolean);
  const requested = tokens.length === 0 ? [...DEFAULT_TUPLE_RESIDUAL_PHASE_BUCKET_KEYS] : tokens;

  if (requested.length === 1 && requested[0].toLowerCase() === 'all') {
    return EVALUATION_PHASE_BUCKET_SPECS.map((bucket) => ({ ...bucket }));
  }

  const phaseBucketsByKey = new Map(EVALUATION_PHASE_BUCKET_SPECS.map((bucket) => [bucket.key, bucket]));
  const result = [];
  const seen = new Set();

  for (const token of requested) {
    const namedBucket = phaseBucketsByKey.get(token);
    if (namedBucket) {
      if (!seen.has(namedBucket.key)) {
        result.push({ ...namedBucket });
        seen.add(namedBucket.key);
      }
      continue;
    }

    const rangeMatch = /^(\d+)-(\d+)$/.exec(token);
    if (!rangeMatch) {
      throw new Error(`알 수 없는 phase bucket 지정: ${token}`);
    }
    const minEmpties = Number(rangeMatch[1]);
    const maxEmpties = Number(rangeMatch[2]);
    if (!Number.isInteger(minEmpties) || !Number.isInteger(maxEmpties) || minEmpties < 0 || maxEmpties > 60 || minEmpties > maxEmpties) {
      throw new Error(`잘못된 empties range: ${token}`);
    }
    const key = `range-${minEmpties}-${maxEmpties}`;
    if (!seen.has(key)) {
      result.push({ key, minEmpties, maxEmpties, label: key });
      seen.add(key);
    }
  }

  return result;
}

function createProgressLogger({
  label,
  totalWorkBytes,
  phaseOffsetBytes,
  phaseTotalBytes,
  progressEvery,
  estimatedTotalScannedSamples,
  globalStartMs,
  getExtraText = null,
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

    const elapsedSeconds = Math.max(0.001, (Date.now() - globalStartMs) / 1000);
    const overallProcessedBytes = Math.min(totalWorkBytes, phaseOffsetBytes + totalBytesProcessed);
    const overallFraction = totalWorkBytes > 0 ? overallProcessedBytes / totalWorkBytes : null;
    const phaseFraction = phaseTotalBytes > 0 ? totalBytesProcessed / phaseTotalBytes : null;
    const scannedPerSecond = scannedSamples / elapsedSeconds;
    const bytesPerSecond = overallProcessedBytes / elapsedSeconds;
    const remainingBytes = Math.max(0, totalWorkBytes - overallProcessedBytes);
    const etaSeconds = bytesPerSecond > 0 ? remainingBytes / bytesPerSecond : null;
    const sampleText = estimatedTotalScannedSamples
      ? `${formatInteger(scannedSamples)} / ${formatInteger(estimatedTotalScannedSamples)}`
      : formatInteger(scannedSamples);
    const extra = getExtraText ? ` ${getExtraText()}` : '';

    console.log(
      `[${label}] scanned=${sampleText} phase=${percentage(phaseFraction)} overall=${percentage(overallFraction)} `
      + `speed=${formatInteger(scannedPerSecond)} sample/s ETA=${formatDurationSeconds(etaSeconds)}${extra}`,
    );
  };
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

function compatibleTupleLayouts(left, right) {
  if (!left || !right) {
    return false;
  }
  if (left.tuples.length !== right.tuples.length) {
    return false;
  }
  for (let index = 0; index < left.tuples.length; index += 1) {
    const leftTuple = left.tuples[index];
    const rightTuple = right.tuples[index];
    if (leftTuple.squares.length !== rightTuple.squares.length) {
      return false;
    }
    for (let squareIndex = 0; squareIndex < leftTuple.squares.length; squareIndex += 1) {
      if (leftTuple.squares[squareIndex] !== rightTuple.squares[squareIndex]) {
        return false;
      }
    }
  }
  return true;
}

function findMatchingSeedBucket(seedProfile, bucketSpec) {
  if (!seedProfile || !Array.isArray(seedProfile.trainedBuckets)) {
    return null;
  }

  return seedProfile.trainedBuckets.find((bucket) => {
    if (typeof bucket?.key === 'string' && typeof bucketSpec?.key === 'string' && bucket.key === bucketSpec.key) {
      return true;
    }
    return bucket?.minEmpties === bucketSpec.minEmpties && bucket?.maxEmpties === bucketSpec.maxEmpties;
  }) ?? null;
}

function createBucketTrainingState(bucketSpec, layout, seedBucket = null) {
  const tupleWeights = layout.tuples.map((tuple, tupleIndex) => {
    const seedWeights = Array.isArray(seedBucket?.tupleWeights?.[tupleIndex]) ? seedBucket.tupleWeights[tupleIndex] : [];
    return Float64Array.from({ length: tuple.tableSize }, (_, entryIndex) => Number(seedWeights[entryIndex] ?? 0));
  });

  return {
    spec: bucketSpec,
    tupleWeights,
    visitCounts: layout.tuples.map((tuple) => new Uint32Array(tuple.tableSize)),
    bias: Number(seedBucket?.bias ?? 0),
    biasVisitCount: 0,
    selectedTrainUpdates: 0,
    holdoutSamples: 0,
    strideSkippedSamples: 0,
  };
}

function perspectiveBoardsForState(state) {
  return state.currentPlayer === 'black'
    ? { player: state.black, opponent: state.white }
    : { player: state.white, opponent: state.black };
}

function tupleIndexForPerspectiveBoards(player, opponent, squares) {
  let index = 0;
  for (const square of squares) {
    index *= 3;
    const bit = INDEX_BITS[square];
    if ((player & bit) !== 0n) {
      index += 1;
    } else if ((opponent & bit) !== 0n) {
      index += 2;
    }
  }
  return index;
}

function collectTupleContribution(layout, tupleWeights, player, opponent, scratchActiveIndices) {
  let total = 0;
  for (let tupleIndex = 0; tupleIndex < layout.tuples.length; tupleIndex += 1) {
    const tuple = layout.tuples[tupleIndex];
    const patternIndex = tupleIndexForPerspectiveBoards(player, opponent, tuple.squares);
    scratchActiveIndices[tupleIndex] = patternIndex;
    total += tupleWeights[tupleIndex][patternIndex];
  }
  return total;
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

function summarizeTupleWeightStats(tupleWeights, visitCounts, minVisits, bucketBias = 0, biasVisitCount = 0) {
  let totalWeights = 0;
  let visitedWeights = 0;
  let retainedWeights = 0;
  let nonZeroCount = 0;
  let sumAbsWeight = 0;
  let maxAbsWeight = 0;

  for (let tupleIndex = 0; tupleIndex < tupleWeights.length; tupleIndex += 1) {
    const table = tupleWeights[tupleIndex];
    const counts = visitCounts[tupleIndex];
    for (let entryIndex = 0; entryIndex < table.length; entryIndex += 1) {
      totalWeights += 1;
      if (counts[entryIndex] > 0) {
        visitedWeights += 1;
      }
      if (counts[entryIndex] >= minVisits) {
        retainedWeights += 1;
      }
      const absWeight = Math.abs(table[entryIndex]);
      if (absWeight > 1e-9) {
        nonZeroCount += 1;
      }
      sumAbsWeight += absWeight;
      maxAbsWeight = Math.max(maxAbsWeight, absWeight);
    }
  }

  return {
    totalWeights,
    visitedWeights,
    retainedWeights,
    nonZeroCount,
    meanAbsWeight: totalWeights > 0 ? sumAbsWeight / totalWeights : 0,
    maxAbsWeight,
    bias: bucketBias,
    absBias: Math.abs(bucketBias),
    biasVisitCount,
    retainedBias: biasVisitCount >= minVisits,
  };
}

function materializeTupleTables(bucketState, seedBucket, minVisits) {
  return bucketState.tupleWeights.map((table, tupleIndex) => {
    const counts = bucketState.visitCounts[tupleIndex];
    const seedTable = Array.isArray(seedBucket?.tupleWeights?.[tupleIndex]) ? seedBucket.tupleWeights[tupleIndex] : null;
    return Array.from(table, (value, entryIndex) => (
      counts[entryIndex] >= minVisits
        ? value
        : Number(seedTable?.[entryIndex] ?? 0)
    ));
  });
}

function materializeBucketBias(bucketState, seedBucket, minVisits) {
  if (bucketState.biasVisitCount >= minVisits) {
    return bucketState.bias;
  }
  return Number(seedBucket?.bias ?? 0);
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
const sampleStride = Math.max(1, Math.trunc(toFiniteNumber(args['sample-stride'], 4)));
const sampleResidue = Math.max(0, Math.trunc(toFiniteNumber(args['sample-residue'], 0)));
const epochs = Math.max(1, Math.trunc(toFiniteNumber(args.epochs, 1)));
const learningRate = Math.max(0, toFiniteNumber(args['learning-rate'], 0.05));
const biasLearningRate = Math.max(0, toFiniteNumber(args['bias-learning-rate'], learningRate));
const regularization = Math.max(0, toFiniteNumber(args.lambda ?? args.l2, 0.0005));
const gradientClip = Math.max(0, toFiniteNumber(args['gradient-clip'], 90_000));
const minVisits = Math.max(0, Math.trunc(toFiniteNumber(args['min-visits'], 32)));
const limit = args.limit !== undefined ? Math.max(1, Math.trunc(toFiniteNumber(args.limit, 1))) : undefined;
const progressEvery = Math.max(0, Math.trunc(toFiniteNumber(args['progress-every'], 250000)));
const skipDiagnostics = Boolean(args['skip-diagnostics']);
const outputJsonPath = args['output-json'] ? resolveCliPath(args['output-json']) : resolveTrainingOutputPath('trained-tuple-residual-profile.json');
const outputModulePath = args['output-module'] ? resolveCliPath(args['output-module']) : resolveTrainingOutputPath('learned-eval-profile.generated.js');
const moduleFormat = typeof args['module-format'] === 'string' ? args['module-format'] : 'compact';
const profileName = typeof args.name === 'string' ? args.name : defaultTupleResidualProfileName();
const description = typeof args.description === 'string'
  ? args.description
  : 'phase-linear evaluator 위에 얹는 tuple residual evaluator입니다.';
const estimatedTotalScannedSamples = limit ?? detectKnownDatasetSampleCount(inputFiles) ?? null;

const baseEvaluationProfile = loadJsonFileIfPresent(args['evaluation-profile-json']) ?? ACTIVE_EVALUATION_PROFILE;
const moduleMoveOrderingProfile = loadJsonFileIfPresent(args['move-ordering-profile-json']) ?? ACTIVE_MOVE_ORDERING_PROFILE ?? null;
const moduleMpcProfile = loadJsonFileIfPresent(args['mpc-json']) ?? ACTIVE_MPC_PROFILE ?? null;
const seedProfileInput = loadJsonFileIfPresent(args['seed-profile']);
const seedProfile = seedProfileInput ? resolveTupleResidualProfile(seedProfileInput) : null;
const explicitLayoutInput = args['layout-json']
  ? unwrapTupleLayoutInput(loadJsonFileIfPresent(args['layout-json']))
  : (args['layout-name'] ?? null);
const layoutInput = explicitLayoutInput ?? seedProfile?.layout ?? DEFAULT_TUPLE_RESIDUAL_LAYOUT_NAME;
const layout = resolveTupleResidualLayout(layoutInput);
const bucketSpecs = parsePhaseBuckets(args['phase-buckets']);

if (seedProfile && !compatibleTupleLayouts(seedProfile.layout, layout)) {
  throw new Error(`seed profile layout(${seedProfile.layout.name})이 현재 layout(${layout.name})과 호환되지 않습니다.`);
}

const seedBuckets = bucketSpecs.map((bucketSpec) => findMatchingSeedBucket(seedProfile, bucketSpec));
const bucketStates = bucketSpecs.map((bucketSpec, bucketIndex) => createBucketTrainingState(bucketSpec, layout, seedBuckets[bucketIndex]));
const scratchActiveIndices = new Int32Array(layout.tuples.length);
const baseEvaluator = new Evaluator({
  evaluationProfile: baseEvaluationProfile,
  tupleResidualProfile: null,
});
const globalStartMs = Date.now();
const totalWorkBytes = totalInputBytes * (epochs + (skipDiagnostics ? 0 : 1));

console.log(`Training tuple residual profile on ${inputFiles.length} file(s).`);
console.log(`layout=${layout.name} tuples=${formatInteger(layout.tupleCount)} totalTableSize=${formatInteger(layout.totalTableSize)}`);
console.log(`phaseBuckets=${bucketSpecs.map((bucket) => bucket.key).join(', ')}`);
console.log(`targetScale=${targetScale}, holdoutMod=${holdoutMod}, sampleStride=${sampleStride}, epochs=${epochs}`);
console.log(`learningRate=${learningRate}, biasLearningRate=${biasLearningRate}, l2=${regularization}, gradientClip=${gradientClip}, minVisits=${minVisits}`);
if (estimatedTotalScannedSamples) {
  console.log(`Estimated scanned samples: ${formatInteger(estimatedTotalScannedSamples)}`);
}
if (seedProfile) {
  console.log(`Seed profile: ${seedProfile.name}`);
}
if (!explicitLayoutInput && seedProfile) {
  console.log(`Layout source: seed profile (${seedProfile.layout.name})`);
}
if (progressEvery > 0) {
  console.log(`Progress logging every ${formatInteger(progressEvery)} scanned samples.`);
}
if (skipDiagnostics) {
  console.log('Diagnostics pass disabled (--skip-diagnostics).');
}

const trainingScanSummary = {
  scannedSamples: 0,
  outsideBucketSamples: 0,
  holdoutSamples: 0,
  strideSkippedSamples: 0,
  selectedTrainSamples: 0,
};
const epochSummaries = [];

for (let epochIndex = 0; epochIndex < epochs; epochIndex += 1) {
  const epochStats = {
    scannedSamples: 0,
    outsideBucketSamples: 0,
    holdoutSamples: 0,
    strideSkippedSamples: 0,
    selectedTrainSamples: 0,
  };
  const epochMetrics = createMetricAccumulator();
  const phaseOffsetBytes = totalInputBytes * epochIndex;
  const progressLogger = progressEvery > 0
    ? createProgressLogger({
      label: `fit ${epochIndex + 1}/${epochs}`,
      totalWorkBytes,
      phaseOffsetBytes,
      phaseTotalBytes: totalInputBytes,
      progressEvery,
      estimatedTotalScannedSamples,
      globalStartMs,
      getExtraText: () => `updates=${formatInteger(epochStats.selectedTrainSamples)}`,
    })
    : null;

  await streamTrainingSamples(inputFiles, { targetScale, limit }, ({ state, target, sampleIndex, totalBytesProcessed }) => {
    epochStats.scannedSamples += 1;
    trainingScanSummary.scannedSamples += 1;

    const empties = state.getEmptyCount();
    const bucketIndex = pickBucketIndexForEmpties(bucketSpecs, empties);
    if (bucketIndex < 0) {
      epochStats.outsideBucketSamples += 1;
      trainingScanSummary.outsideBucketSamples += 1;
      if (progressLogger) {
        progressLogger({ sampleIndex, totalBytesProcessed });
      }
      return;
    }

    if (shouldUseHoldout(sampleIndex, holdoutMod, holdoutResidue)) {
      epochStats.holdoutSamples += 1;
      trainingScanSummary.holdoutSamples += 1;
      bucketStates[bucketIndex].holdoutSamples += 1;
      if (progressLogger) {
        progressLogger({ sampleIndex, totalBytesProcessed });
      }
      return;
    }

    if ((sampleIndex % sampleStride) !== sampleResidue) {
      epochStats.strideSkippedSamples += 1;
      trainingScanSummary.strideSkippedSamples += 1;
      bucketStates[bucketIndex].strideSkippedSamples += 1;
      if (progressLogger) {
        progressLogger({ sampleIndex, totalBytesProcessed });
      }
      return;
    }

    const bucketState = bucketStates[bucketIndex];
    const { player, opponent } = perspectiveBoardsForState(state);
    const basePrediction = baseEvaluator.evaluate(state, state.currentPlayer);
    const tupleContribution = collectTupleContribution(layout, bucketState.tupleWeights, player, opponent, scratchActiveIndices);
    const prediction = basePrediction + bucketState.bias + tupleContribution;
    const residual = target - prediction;
    const clippedResidual = gradientClip > 0
      ? Math.max(-gradientClip, Math.min(gradientClip, residual))
      : residual;
    const errorShare = layout.tupleCount > 0 ? clippedResidual / layout.tupleCount : 0;

    updateMetricAccumulator(epochMetrics, prediction - target);

    bucketState.biasVisitCount += 1;
    if (biasLearningRate > 0) {
      const biasStep = biasLearningRate / Math.sqrt(bucketState.biasVisitCount);
      bucketState.bias += biasStep * (clippedResidual - (regularization * bucketState.bias));
    }

    for (let tupleIndex = 0; tupleIndex < layout.tuples.length; tupleIndex += 1) {
      const entryIndex = scratchActiveIndices[tupleIndex];
      const visitCounts = bucketState.visitCounts[tupleIndex];
      visitCounts[entryIndex] += 1;
      const step = learningRate / Math.sqrt(visitCounts[entryIndex]);
      const table = bucketState.tupleWeights[tupleIndex];
      table[entryIndex] += step * (errorShare - (regularization * table[entryIndex]));
    }

    bucketState.selectedTrainUpdates += 1;
    epochStats.selectedTrainSamples += 1;
    trainingScanSummary.selectedTrainSamples += 1;

    if (progressLogger) {
      progressLogger({ sampleIndex, totalBytesProcessed });
    }
  });

  const epochSummary = decorateMetricSummary(summarizeMetricAccumulator(epochMetrics), targetScale);
  epochSummaries.push({
    epoch: epochIndex + 1,
    ...epochStats,
    trainResidual: epochSummary,
  });

  console.log(
    `[epoch ${epochIndex + 1}/${epochs}] updates=${formatInteger(epochStats.selectedTrainSamples)} `
    + `MAE=${epochSummary.mae === null ? 'n/a' : `${epochSummary.mae.toFixed(2)} (${epochSummary.maeInStones.toFixed(3)} stones)`}`,
  );
}

const materializedTables = bucketStates.map((bucketState, bucketIndex) => materializeTupleTables(bucketState, seedBuckets[bucketIndex], minVisits));
const materializedBucketBiases = bucketStates.map((bucketState, bucketIndex) => materializeBucketBias(bucketState, seedBuckets[bucketIndex], minVisits));
let trainedProfile = buildTupleResidualProfileFromWeights(bucketSpecs, layout, materializedTables, {
  bucketBiases: materializedBucketBiases,
  name: profileName,
  description,
  source: {
    inputFiles: inputFiles.map((entry) => entry.path),
    evaluationProfileName: baseEvaluationProfile?.name ?? null,
    evaluationProfilePath: args['evaluation-profile-json'] ? resolveCliPath(args['evaluation-profile-json']) : null,
    layoutName: layout.name,
    phaseBuckets: bucketSpecs.map((bucket) => ({
      key: bucket.key,
      minEmpties: bucket.minEmpties,
      maxEmpties: bucket.maxEmpties,
    })),
    targetScale,
    holdoutMod,
    holdoutResidue,
    sampleStride,
    sampleResidue,
    epochs,
    learningRate,
    biasLearningRate,
    regularization,
    gradientClip,
    minVisits,
    seenSamples: trainingScanSummary.scannedSamples / epochs,
    selectedTrainSamples: trainingScanSummary.selectedTrainSamples,
    seedProfileName: seedProfile?.name ?? null,
  },
});

const weightStatsByBucket = bucketStates.map((bucketState, bucketIndex) => ({
  key: bucketSpecs[bucketIndex].key,
  minEmpties: bucketSpecs[bucketIndex].minEmpties,
  maxEmpties: bucketSpecs[bucketIndex].maxEmpties,
  ...summarizeTupleWeightStats(
    bucketState.tupleWeights,
    bucketState.visitCounts,
    minVisits,
    materializedBucketBiases[bucketIndex],
    bucketState.biasVisitCount,
  ),
}));

const trainingBucketSummary = bucketStates.map((bucketState, bucketIndex) => ({
  key: bucketSpecs[bucketIndex].key,
  minEmpties: bucketSpecs[bucketIndex].minEmpties,
  maxEmpties: bucketSpecs[bucketIndex].maxEmpties,
  selectedTrainUpdates: bucketState.selectedTrainUpdates,
  holdoutSamples: bucketState.holdoutSamples,
  strideSkippedSamples: bucketState.strideSkippedSamples,
}));

if (!skipDiagnostics) {
  const candidateEvaluator = new Evaluator({
    evaluationProfile: baseEvaluationProfile,
    tupleResidualProfile: trainedProfile,
  });

  const allSamplesBase = createMetricAccumulator();
  const allSamplesCandidate = createMetricAccumulator();
  const selectedAllBase = createMetricAccumulator();
  const selectedAllCandidate = createMetricAccumulator();
  const holdoutSelectedBase = createMetricAccumulator();
  const holdoutSelectedCandidate = createMetricAccumulator();
  const byBucketBase = bucketSpecs.map(() => createMetricAccumulator());
  const byBucketCandidate = bucketSpecs.map(() => createMetricAccumulator());
  const byBucketHoldoutBase = bucketSpecs.map(() => createMetricAccumulator());
  const byBucketHoldoutCandidate = bucketSpecs.map(() => createMetricAccumulator());

  const diagnosticsProgress = progressEvery > 0
    ? createProgressLogger({
      label: 'diagnostics',
      totalWorkBytes,
      phaseOffsetBytes: totalInputBytes * epochs,
      phaseTotalBytes: totalInputBytes,
      progressEvery,
      estimatedTotalScannedSamples,
      globalStartMs,
    })
    : null;

  await streamTrainingSamples(inputFiles, { targetScale, limit }, ({ state, target, sampleIndex, totalBytesProcessed }) => {
    const basePrediction = baseEvaluator.evaluate(state, state.currentPlayer);
    const candidatePrediction = candidateEvaluator.evaluate(state, state.currentPlayer);
    const baseResidual = basePrediction - target;
    const candidateResidual = candidatePrediction - target;
    const empties = state.getEmptyCount();
    const bucketIndex = pickBucketIndexForEmpties(bucketSpecs, empties);

    updateMetricAccumulator(allSamplesBase, baseResidual);
    updateMetricAccumulator(allSamplesCandidate, candidateResidual);

    if (bucketIndex >= 0) {
      updateMetricAccumulator(selectedAllBase, baseResidual);
      updateMetricAccumulator(selectedAllCandidate, candidateResidual);
      updateMetricAccumulator(byBucketBase[bucketIndex], baseResidual);
      updateMetricAccumulator(byBucketCandidate[bucketIndex], candidateResidual);

      if (shouldUseHoldout(sampleIndex, holdoutMod, holdoutResidue)) {
        updateMetricAccumulator(holdoutSelectedBase, baseResidual);
        updateMetricAccumulator(holdoutSelectedCandidate, candidateResidual);
        updateMetricAccumulator(byBucketHoldoutBase[bucketIndex], baseResidual);
        updateMetricAccumulator(byBucketHoldoutCandidate[bucketIndex], candidateResidual);
      }
    }

    if (diagnosticsProgress) {
      diagnosticsProgress({ sampleIndex, totalBytesProcessed });
    }
  });

  const allSamplesBaseSummary = decorateMetricSummary(summarizeMetricAccumulator(allSamplesBase), targetScale);
  const allSamplesCandidateSummary = decorateMetricSummary(summarizeMetricAccumulator(allSamplesCandidate), targetScale);
  const selectedAllBaseSummary = decorateMetricSummary(summarizeMetricAccumulator(selectedAllBase), targetScale);
  const selectedAllCandidateSummary = decorateMetricSummary(summarizeMetricAccumulator(selectedAllCandidate), targetScale);
  const holdoutSelectedBaseSummary = decorateMetricSummary(summarizeMetricAccumulator(holdoutSelectedBase), targetScale);
  const holdoutSelectedCandidateSummary = decorateMetricSummary(summarizeMetricAccumulator(holdoutSelectedCandidate), targetScale);

  trainedProfile = {
    ...trainedProfile,
    diagnostics: {
      layout: {
        name: layout.name,
        tupleCount: layout.tupleCount,
        maxTupleLength: layout.maxTupleLength,
        totalTableSize: layout.totalTableSize,
      },
      training: {
        scannedSamples: trainingScanSummary.scannedSamples,
        selectedTrainSamples: trainingScanSummary.selectedTrainSamples,
        outsideBucketSamples: trainingScanSummary.outsideBucketSamples,
        holdoutSamples: trainingScanSummary.holdoutSamples,
        strideSkippedSamples: trainingScanSummary.strideSkippedSamples,
        epochSummaries,
      },
      bucketTrainingSummary: trainingBucketSummary,
      weightStatsByBucket,
      allSamples: {
        base: allSamplesBaseSummary,
        candidate: allSamplesCandidateSummary,
        delta: buildMetricDelta(allSamplesBaseSummary, allSamplesCandidateSummary, targetScale),
      },
      selectedAll: {
        base: selectedAllBaseSummary,
        candidate: selectedAllCandidateSummary,
        delta: buildMetricDelta(selectedAllBaseSummary, selectedAllCandidateSummary, targetScale),
      },
      holdoutSelected: {
        base: holdoutSelectedBaseSummary,
        candidate: holdoutSelectedCandidateSummary,
        delta: buildMetricDelta(holdoutSelectedBaseSummary, holdoutSelectedCandidateSummary, targetScale),
      },
      byBucket: bucketSpecs.map((bucket, bucketIndex) => {
        const baseSummary = decorateMetricSummary(summarizeMetricAccumulator(byBucketBase[bucketIndex]), targetScale);
        const candidateSummary = decorateMetricSummary(summarizeMetricAccumulator(byBucketCandidate[bucketIndex]), targetScale);
        const holdoutBaseSummary = decorateMetricSummary(summarizeMetricAccumulator(byBucketHoldoutBase[bucketIndex]), targetScale);
        const holdoutCandidateSummary = decorateMetricSummary(summarizeMetricAccumulator(byBucketHoldoutCandidate[bucketIndex]), targetScale);
        return {
          key: bucket.key,
          minEmpties: bucket.minEmpties,
          maxEmpties: bucket.maxEmpties,
          selectedTrainUpdates: bucketStates[bucketIndex].selectedTrainUpdates,
          weightStats: weightStatsByBucket[bucketIndex],
          all: {
            base: baseSummary,
            candidate: candidateSummary,
            delta: buildMetricDelta(baseSummary, candidateSummary, targetScale),
          },
          holdout: {
            base: holdoutBaseSummary,
            candidate: holdoutCandidateSummary,
            delta: buildMetricDelta(holdoutBaseSummary, holdoutCandidateSummary, targetScale),
          },
        };
      }),
      createdAt: new Date().toISOString(),
    },
  };
} else {
  trainedProfile = {
    ...trainedProfile,
    diagnostics: {
      layout: {
        name: layout.name,
        tupleCount: layout.tupleCount,
        maxTupleLength: layout.maxTupleLength,
        totalTableSize: layout.totalTableSize,
      },
      training: {
        scannedSamples: trainingScanSummary.scannedSamples,
        selectedTrainSamples: trainingScanSummary.selectedTrainSamples,
        outsideBucketSamples: trainingScanSummary.outsideBucketSamples,
        holdoutSamples: trainingScanSummary.holdoutSamples,
        strideSkippedSamples: trainingScanSummary.strideSkippedSamples,
        epochSummaries,
      },
      bucketTrainingSummary: trainingBucketSummary,
      weightStatsByBucket,
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
    evaluationProfile: baseEvaluationProfile,
    moveOrderingProfile: moduleMoveOrderingProfile,
    tupleResidualProfile: trainedProfile,
    mpcProfile: moduleMpcProfile,
  });
}

const elapsedSeconds = (Date.now() - globalStartMs) / 1000;
console.log(`Seen samples: ${formatInteger(Math.round(trainingScanSummary.scannedSamples / epochs))} per epoch`);
console.log(`Elapsed: ${formatDurationSeconds(elapsedSeconds)}`);
console.log(`Saved JSON profile to ${outputJsonPath}`);
if (outputModulePath) {
  console.log(`Saved app-ready module to ${outputModulePath}`);
  console.log(`  module format      : ${moduleFormat}`);
  console.log(`  preserved evaluation profile : ${baseEvaluationProfile?.name ?? 'null'}`);
  console.log(`  preserved move-ordering slot : ${moduleMoveOrderingProfile?.name ?? 'null'}`);
  console.log(`  preserved mpc slot           : ${moduleMpcProfile?.name ?? 'null'}`);
}
if (skipDiagnostics) {
  console.log('Diagnostics pass skipped. Run a benchmark/audit later if you want holdout MAE deltas.');
} else {
  const holdout = trainedProfile.diagnostics?.holdoutSelected;
  console.log(`Holdout selected MAE: ${holdout?.candidate?.mae === null || holdout?.candidate?.mae === undefined ? 'n/a' : `${holdout.candidate.mae.toFixed(2)} (${holdout.candidate.maeInStones.toFixed(3)} stones)`}`);
  console.log(`Holdout selected MAE delta vs base: ${holdout?.delta?.mae === null || holdout?.delta?.mae === undefined ? 'n/a' : `${holdout.delta.mae.toFixed(2)} (${holdout.delta.maeInStones.toFixed(3)} stones)`}`);
}
for (const bucket of trainedProfile.diagnostics?.byBucket ?? []) {
  console.log(
    `  ${bucket.key.padEnd(10)} updates=${String(bucket.selectedTrainUpdates).padStart(8)} `
    + `holdoutMAE=${bucket.holdout?.candidate?.mae === null || bucket.holdout?.candidate?.mae === undefined ? 'n/a' : bucket.holdout.candidate.mae.toFixed(1)} `
    + `delta=${bucket.holdout?.delta?.mae === null || bucket.holdout?.delta?.mae === undefined ? 'n/a' : bucket.holdout.delta.mae.toFixed(1)}`,
  );
}
