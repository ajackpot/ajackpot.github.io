#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { SearchEngine } from '../../js/ai/search-engine.js';
import {
  ACTIVE_EVALUATION_PROFILE,
  ACTIVE_MOVE_ORDERING_PROFILE,
  ACTIVE_TUPLE_RESIDUAL_PROFILE,
  ACTIVE_MPC_PROFILE,
} from '../../js/ai/evaluation-profiles.js';
import {
  collectInputFileEntries,
  createMetricAccumulator,
  detectKnownDatasetSampleCount,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  ensureArray,
  formatDurationSeconds,
  formatInteger,
  formatRate,
  loadJsonFileIfPresent,
  parseArgs,
  percentage,
  resolveCliPath,
  resolveTrainingOutputPath,
  streamTrainingSamples,
  summarizeMetricAccumulator,
  updateMetricAccumulator,
} from './lib.mjs';

const DEFAULT_CALIBRATION_SPECS = Object.freeze([
  Object.freeze({ key: 'mpc-18-21-d4-d8', minEmpties: 18, maxEmpties: 21, shallowDepth: 4, deepDepth: 8, label: '18-21 / d4→d8' }),
  Object.freeze({ key: 'mpc-22-25-d4-d8', minEmpties: 22, maxEmpties: 25, shallowDepth: 4, deepDepth: 8, label: '22-25 / d4→d8' }),
  Object.freeze({ key: 'mpc-26-29-d6-d10', minEmpties: 26, maxEmpties: 29, shallowDepth: 6, deepDepth: 10, label: '26-29 / d6→d10' }),
  Object.freeze({ key: 'mpc-30-33-d6-d10', minEmpties: 30, maxEmpties: 33, shallowDepth: 6, deepDepth: 10, label: '30-33 / d6→d10' }),
]);
const DEFAULT_Z_VALUES = Object.freeze([1.0, 1.5, 1.96, 2.5, 3.0]);
const STOP = '__STOP_MPC_CALIBRATION__';

function printUsage() {
  const toolPath = displayTrainingToolPath('calibrate-mpc-profile.mjs');
  const outputJsonPath = displayTrainingOutputPath('trained-mpc-profile.json');
  console.log(`Usage:
  node ${toolPath} \
    --input <file-or-dir> [--input <file-or-dir> ...] \
    [--evaluation-profile-json tools/evaluator-training/out/trained-evaluation-profile.json] \
    [--move-ordering-profile-json tools/evaluator-training/out/trained-move-ordering-profile.json] \
    [--tuple-profile-json tools/evaluator-training/out/trained-tuple-residual-profile.calibrated.json|off] \
    [--mpc-profile-json tools/evaluator-training/out/trained-mpc-profile.json|off] \
    [--calibration-buckets 18-21:4>8,22-25:4>8,26-29:6>10,30-33:6>10] \
    [--sample-stride 200] [--sample-residue 0] [--max-samples-per-bucket 400] \
    [--holdout-mod 10] [--holdout-residue 0] [--target-holdout-coverage 0.99] \
    [--time-limit-ms 120000] [--progress-every 20] \
    [--max-table-entries 200000] [--aspiration-window 40] \
    [--z-values 1,1.5,1.96,2.5,3] \
    [--output-json ${outputJsonPath}]

이 도구는 입력 상태들에서 shallow/deep 탐색 점수 쌍을 수집해
bucket별 ProbCut / MPC 회귀식 (deep ≈ intercept + slope * shallow)과 residual sigma를 추정합니다.
calibration-buckets는 서로 겹쳐도 되므로, 같은 empties 구간에 여러 shallow/deep 조합을 넣어
Multi-ProbCut식 다중 check profile을 학습하는 데도 사용할 수 있습니다.
아직 런타임 pruning은 넣지 않고, 이후 MPC 도입에 필요한 보정 파일만 생성합니다.
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

function isExplicitNullLike(value) {
  if (value === undefined || value === null) {
    return false;
  }
  return ['off', 'none', 'null', 'disabled'].includes(String(value).trim().toLowerCase());
}

function loadJsonFileOrExplicitNull(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  if (isExplicitNullLike(value)) {
    return null;
  }
  return loadJsonFileIfPresent(value);
}

function parseCalibrationSpecs(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return DEFAULT_CALIBRATION_SPECS;
  }

  const specs = value.split(',').map((token, index) => {
    const match = /^(\d+)(?:-(\d+))?:(\d+)>(\d+)$/.exec(token.trim());
    if (!match) {
      throw new Error(`잘못된 calibration bucket 형식: ${token}`);
    }
    const minEmpties = Number(match[1]);
    const maxEmpties = Number(match[2] ?? match[1]);
    const shallowDepth = Number(match[3]);
    const deepDepth = Number(match[4]);
    if (!Number.isInteger(minEmpties) || !Number.isInteger(maxEmpties) || minEmpties < 1 || maxEmpties > 60 || minEmpties > maxEmpties) {
      throw new Error(`유효하지 않은 empties 범위: ${token}`);
    }
    if (!Number.isInteger(shallowDepth) || !Number.isInteger(deepDepth) || shallowDepth < 1 || deepDepth <= shallowDepth) {
      throw new Error(`유효하지 않은 shallow/deep depth 조합: ${token}`);
    }
    return Object.freeze({
      key: `mpc-${minEmpties}-${maxEmpties}-d${shallowDepth}-d${deepDepth}`,
      minEmpties,
      maxEmpties,
      shallowDepth,
      deepDepth,
      label: `${minEmpties}-${maxEmpties} / d${shallowDepth}→d${deepDepth}`,
      order: index,
    });
  });

  specs.sort((left, right) => {
    if (left.minEmpties !== right.minEmpties) {
      return left.minEmpties - right.minEmpties;
    }
    if (left.maxEmpties !== right.maxEmpties) {
      return left.maxEmpties - right.maxEmpties;
    }
    if (left.shallowDepth !== right.shallowDepth) {
      return left.shallowDepth - right.shallowDepth;
    }
    return left.deepDepth - right.deepDepth;
  });
  return Object.freeze(specs);
}

function parseZValues(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return DEFAULT_Z_VALUES;
  }

  const values = [...new Set(value.split(',')
    .map((token) => Number(token.trim()))
    .filter((token) => Number.isFinite(token) && token > 0))]
    .sort((left, right) => left - right);
  return values.length > 0 ? Object.freeze(values) : DEFAULT_Z_VALUES;
}

function buildCalibrationIndexLookupTable(specs) {
  return Array.from({ length: 61 }, (_, empties) => {
    const matches = [];
    for (let index = 0; index < specs.length; index += 1) {
      const spec = specs[index];
      if (empties >= spec.minEmpties && empties <= spec.maxEmpties) {
        matches.push(index);
      }
    }
    return Object.freeze(matches);
  });
}

function lookupCalibrationIndices(calibrationIndexLookupTable, empties) {
  if (!Number.isFinite(empties)) {
    return [];
  }
  const normalized = Math.max(0, Math.min(60, Math.round(empties)));
  return calibrationIndexLookupTable[normalized] ?? [];
}

function shouldUseHoldout(sampleIndex, holdoutMod, holdoutResidue) {
  return holdoutMod > 0 && (sampleIndex % holdoutMod) === holdoutResidue;
}

function createSearchOptions({
  depth,
  timeLimitMs,
  aspirationWindow,
  evaluationProfile,
  moveOrderingProfile,
  tupleResidualProfile,
  mpcProfile,
  maxTableEntries,
}) {
  return {
    presetKey: 'custom',
    styleKey: 'balanced',
    maxDepth: depth,
    timeLimitMs,
    exactEndgameEmpties: 0,
    aspirationWindow,
    randomness: 0,
    maxTableEntries,
    evaluationProfile,
    moveOrderingProfile,
    tupleResidualProfile,
    mpcProfile,
    optimizedFewEmptiesExactSolver: true,
    specializedFewEmptiesExactSolver: true,
    exactFastestFirstOrdering: true,
    enhancedTranspositionCutoff: true,
    enhancedTranspositionCutoffWld: true,
    wldPreExactEmpties: 0,
  };
}

function resetReusableSearchEngine(engine) {
  engine.transpositionTable.clear();
  engine.killerMoves = [];
  engine.historyHeuristic = Array.from({ length: 2 }, () => Array(64).fill(0));
  engine.mpcSuppressionDepth = 0;
}

function createSearchRunner() {
  const enginesByKey = new Map();

  return (state, options) => {
    const cacheKey = [
      options.maxDepth,
      options.timeLimitMs,
      options.exactEndgameEmpties,
      options.aspirationWindow,
      options.maxTableEntries,
    ].join('|');
    let engine = enginesByKey.get(cacheKey);
    if (!engine) {
      engine = new SearchEngine(options);
      enginesByKey.set(cacheKey, engine);
    } else {
      resetReusableSearchEngine(engine);
    }
    const result = engine.findBestMove(state);
    return {
      score: Number.isFinite(result?.score) ? result.score : null,
      didPass: Boolean(result?.didPass),
      searchCompletion: result?.searchCompletion ?? null,
      nodes: engine.stats?.nodes ?? 0,
      elapsedMs: engine.stats?.elapsedMs ?? 0,
    };
  };
}

function fitLinearRegression(samples) {
  if (!Array.isArray(samples) || samples.length < 2) {
    return null;
  }

  let count = 0;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumYY = 0;
  let sumXY = 0;

  for (const sample of samples) {
    const x = Number(sample.shallowScore);
    const y = Number(sample.deepScore);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue;
    }
    count += 1;
    sumX += x;
    sumY += y;
    sumXX += x * x;
    sumYY += y * y;
    sumXY += x * y;
  }

  if (count < 2) {
    return null;
  }

  const denominator = (count * sumXX) - (sumX * sumX);
  if (Math.abs(denominator) < 1e-9) {
    return null;
  }

  const slope = ((count * sumXY) - (sumX * sumY)) / denominator;
  const intercept = (sumY - (slope * sumX)) / count;
  const meanX = sumX / count;
  const meanY = sumY / count;
  const varX = Math.max(0, (sumXX / count) - (meanX ** 2));
  const varY = Math.max(0, (sumYY / count) - (meanY ** 2));
  const covariance = (sumXY / count) - (meanX * meanY);
  const correlation = varX <= 0 || varY <= 0 ? null : covariance / Math.sqrt(varX * varY);
  const rSquared = correlation === null ? null : correlation ** 2;

  return {
    sampleCount: count,
    intercept,
    slope,
    correlation,
    rSquared,
  };
}

function summarizeResidualMetrics(samples, regression) {
  const metrics = createMetricAccumulator();
  if (!regression || !Array.isArray(samples)) {
    return summarizeMetricAccumulator(metrics);
  }

  for (const sample of samples) {
    const predicted = regression.intercept + (regression.slope * sample.shallowScore);
    const residual = predicted - sample.deepScore;
    updateMetricAccumulator(metrics, residual);
  }

  return summarizeMetricAccumulator(metrics);
}

function summarizeZCoverage(samples, regression, trainMetrics, zValues) {
  if (!regression || !Array.isArray(samples) || samples.length === 0 || !Number.isFinite(trainMetrics?.stdDevResidual)) {
    return zValues.map((z) => ({ z, coverage: null, intervalHalfWidth: null }));
  }

  const center = Number.isFinite(trainMetrics.meanResidual) ? trainMetrics.meanResidual : 0;
  return zValues.map((z) => {
    const halfWidth = z * trainMetrics.stdDevResidual;
    let covered = 0;
    for (const sample of samples) {
      const predicted = regression.intercept + (regression.slope * sample.shallowScore);
      const residual = predicted - sample.deepScore;
      if (Math.abs(residual - center) <= halfWidth) {
        covered += 1;
      }
    }
    return {
      z,
      coverage: samples.length > 0 ? covered / samples.length : null,
      intervalHalfWidth: halfWidth,
    };
  });
}

function chooseRecommendedZ(zCoverage, targetCoverage) {
  const passing = zCoverage.find((entry) => Number.isFinite(entry.coverage) && entry.coverage >= targetCoverage);
  if (passing) {
    return passing;
  }
  const fallback = [...zCoverage].reverse().find((entry) => Number.isFinite(entry.coverage));
  return fallback ?? null;
}

function summarizeSearchCost(searchStats) {
  return {
    searches: searchStats.searches,
    nodes: searchStats.nodes,
    elapsedMs: searchStats.elapsedMs,
    averageNodesPerSearch: searchStats.searches > 0 ? searchStats.nodes / searchStats.searches : null,
    averageElapsedMsPerSearch: searchStats.searches > 0 ? searchStats.elapsedMs / searchStats.searches : null,
  };
}

function createSearchCostAccumulator() {
  return {
    searches: 0,
    nodes: 0,
    elapsedMs: 0,
  };
}

function updateSearchCostAccumulator(accumulator, searchResult) {
  accumulator.searches += 1;
  accumulator.nodes += Number(searchResult?.nodes ?? 0);
  accumulator.elapsedMs += Number(searchResult?.elapsedMs ?? 0);
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const requestedInputs = ensureArray(args.input).concat(ensureArray(args['input-dir']));
if (requestedInputs.length === 0) {
  printUsage();
  throw new Error('적어도 하나의 --input 또는 --input-dir 경로를 지정해야 합니다.');
}

const calibrationSpecs = parseCalibrationSpecs(args['calibration-buckets']);
const zValues = parseZValues(args['z-values']);
const sampleStride = Math.max(1, Math.trunc(toFiniteInteger(args['sample-stride'], 200)));
const sampleResidue = Math.max(0, Math.trunc(toFiniteInteger(args['sample-residue'], 0))) % sampleStride;
const maxSamplesPerBucket = Math.max(1, Math.trunc(toFiniteInteger(args['max-samples-per-bucket'], 400)));
const holdoutMod = Math.max(0, Math.trunc(toFiniteInteger(args['holdout-mod'], 10)));
const holdoutResidue = Math.max(0, Math.trunc(toFiniteInteger(args['holdout-residue'], 0)));
const timeLimitMs = Math.max(1000, Math.trunc(toFiniteInteger(args['time-limit-ms'], 120000)));
const progressEvery = Math.max(0, Math.trunc(toFiniteInteger(args['progress-every'], 20)));
const maxTableEntries = Math.max(1000, Math.trunc(toFiniteInteger(args['max-table-entries'], 200000)));
const aspirationWindow = Math.max(0, Math.trunc(toFiniteInteger(args['aspiration-window'], 40)));
const outputJsonPath = args['output-json'] ? resolveCliPath(args['output-json']) : resolveTrainingOutputPath('trained-mpc-profile.json');
const targetHoldoutCoverage = Math.max(0.5, Math.min(0.9999, toFiniteNumber(args['target-holdout-coverage'], 0.99)));
const profileName = typeof args.name === 'string' ? args.name : 'calibrated-mpc-profile-v1';
const description = typeof args.description === 'string'
  ? args.description
  : 'shallow/deep search 상관 기반 MPC/ProbCut 보정 프로필입니다.';
const evaluationProfile = loadJsonFileIfPresent(args['evaluation-profile-json']) ?? ACTIVE_EVALUATION_PROFILE;
const moveOrderingProfile = loadJsonFileIfPresent(args['move-ordering-profile-json']) ?? ACTIVE_MOVE_ORDERING_PROFILE ?? null;
const tupleResidualProfile = loadJsonFileOrExplicitNull(args['tuple-profile-json'], ACTIVE_TUPLE_RESIDUAL_PROFILE ?? null);
const mpcProfile = loadJsonFileOrExplicitNull(args['mpc-profile-json'], ACTIVE_MPC_PROFILE ?? null);

const inputFiles = await collectInputFileEntries(requestedInputs);
if (inputFiles.length === 0) {
  throw new Error('입력 파일을 찾지 못했습니다. --input 또는 --input-dir 경로를 확인하십시오.');
}

const estimatedTotalSamples = detectKnownDatasetSampleCount(inputFiles);
const calibrationIndexLookupTable = buildCalibrationIndexLookupTable(calibrationSpecs);
const runSearchScore = createSearchRunner();
const bucketData = calibrationSpecs.map(() => ({
  sampleIndex: 0,
  acceptedSamples: 0,
  trainSamples: [],
  holdoutSamples: [],
  skippedPass: 0,
  skippedInvalid: 0,
  searchCost: {
    shallow: createSearchCostAccumulator(),
    deep: createSearchCostAccumulator(),
  },
}));
const globalSearchCost = {
  shallow: createSearchCostAccumulator(),
  deep: createSearchCostAccumulator(),
};

const startedAt = Date.now();
let visitedSamples = 0;
let matchedSamples = 0;
let acceptedSamplesTotal = 0;
let lastProgressAt = startedAt;

console.log(`MPC calibration start`);
console.log(`  inputs           : ${inputFiles.length} file(s)`);
console.log(`  calibration specs: ${calibrationSpecs.map((spec) => `${spec.minEmpties}-${spec.maxEmpties}:d${spec.shallowDepth}>d${spec.deepDepth}`).join(', ')}`);
console.log(`  sample stride    : every ${sampleStride} sample(s), residue ${sampleResidue}`);
console.log(`  max/bucket       : ${formatInteger(maxSamplesPerBucket)}`);
console.log(`  holdout split    : mod ${holdoutMod}, residue ${holdoutResidue}`);
console.log(`  time/search      : ${formatInteger(timeLimitMs)} ms`);
console.log(`  z values         : ${zValues.join(', ')}`);
console.log(`  estimated samples: ${estimatedTotalSamples === null ? 'n/a' : formatInteger(estimatedTotalSamples)}`);
console.log(`  tuple/mpc stack  : tuple=${tupleResidualProfile?.name ?? 'null'} | mpc=${mpcProfile?.name ?? 'null'}`);

try {
  await streamTrainingSamples(inputFiles, {}, async ({ state, sampleIndex, totalBytesProcessed, totalBytes }) => {
    visitedSamples += 1;
    if ((sampleIndex % sampleStride) !== sampleResidue) {
      return;
    }

    const empties = state.getEmptyCount();
    const matchingBucketIndices = lookupCalibrationIndices(calibrationIndexLookupTable, empties);
    if (matchingBucketIndices.length === 0) {
      return;
    }

    const targetBucketIndices = matchingBucketIndices.filter((bucketIndex) => bucketData[bucketIndex].acceptedSamples < maxSamplesPerBucket);
    if (targetBucketIndices.length === 0) {
      if (bucketData.every((entry) => entry.acceptedSamples >= maxSamplesPerBucket)) {
        throw new Error(STOP);
      }
      return;
    }

    matchedSamples += targetBucketIndices.length;
    const searchResultCache = new Map();
    const getSearchResult = (depth) => {
      if (searchResultCache.has(depth)) {
        return searchResultCache.get(depth);
      }
      const options = createSearchOptions({
        depth,
        timeLimitMs,
        aspirationWindow,
        evaluationProfile,
        moveOrderingProfile,
        tupleResidualProfile,
        mpcProfile,
        maxTableEntries,
      });
      const result = runSearchScore(state, options);
      searchResultCache.set(depth, result);
      return result;
    };

    let progressLabel = calibrationSpecs[targetBucketIndices[0]]?.label ?? `${empties} empties`;
    for (const bucketIndex of targetBucketIndices) {
      const bucket = bucketData[bucketIndex];
      const spec = calibrationSpecs[bucketIndex];
      progressLabel = spec.label;
      const shallowResult = getSearchResult(spec.shallowDepth);
      if (!Number.isFinite(shallowResult.score) || shallowResult.didPass || shallowResult.searchCompletion === 'partial-timeout') {
        bucket.skippedPass += shallowResult.didPass ? 1 : 0;
        bucket.skippedInvalid += (!Number.isFinite(shallowResult.score) || shallowResult.searchCompletion === 'partial-timeout') ? 1 : 0;
        continue;
      }

      const deepResult = getSearchResult(spec.deepDepth);
      if (!Number.isFinite(deepResult.score) || deepResult.didPass || deepResult.searchCompletion === 'partial-timeout') {
        bucket.skippedPass += deepResult.didPass ? 1 : 0;
        bucket.skippedInvalid += (!Number.isFinite(deepResult.score) || deepResult.searchCompletion === 'partial-timeout') ? 1 : 0;
        continue;
      }

      const sampleRecord = {
        sampleIndex,
        empties,
        shallowScore: shallowResult.score,
        deepScore: deepResult.score,
      };
      bucket.sampleIndex += 1;
      bucket.acceptedSamples += 1;
      acceptedSamplesTotal += 1;
      updateSearchCostAccumulator(bucket.searchCost.shallow, shallowResult);
      updateSearchCostAccumulator(bucket.searchCost.deep, deepResult);
      updateSearchCostAccumulator(globalSearchCost.shallow, shallowResult);
      updateSearchCostAccumulator(globalSearchCost.deep, deepResult);

      if (shouldUseHoldout(bucket.sampleIndex - 1, holdoutMod, holdoutResidue)) {
        bucket.holdoutSamples.push(sampleRecord);
      } else {
        bucket.trainSamples.push(sampleRecord);
      }
    }

    const now = Date.now();
    if (progressEvery > 0
      && targetBucketIndices.some((bucketIndex) => bucketData[bucketIndex].acceptedSamples > 0
        && (bucketData[bucketIndex].acceptedSamples % progressEvery) === 0)
      && (now - lastProgressAt) >= 1000) {
      const elapsedSeconds = (now - startedAt) / 1000;
      const rate = acceptedSamplesTotal / Math.max(1e-9, elapsedSeconds);
      const targetTotal = maxSamplesPerBucket * calibrationSpecs.length;
      const remaining = Math.max(0, targetTotal - acceptedSamplesTotal);
      const etaSeconds = rate > 0 ? remaining / rate : null;
      const progressRatio = targetTotal > 0 ? acceptedSamplesTotal / targetTotal : 0;
      const byteProgress = totalBytes > 0 ? totalBytesProcessed / totalBytes : null;
      console.log(`Progress ${formatInteger(acceptedSamplesTotal)}/${formatInteger(targetTotal)} accepted (${percentage(progressRatio)}) | rate ${formatRate(rate, 1)} | ETA ${formatDurationSeconds(etaSeconds)} | data ${percentage(byteProgress)} | current bucket ${progressLabel}`);
      lastProgressAt = now;
    }

    if (bucketData.every((entry) => entry.acceptedSamples >= maxSamplesPerBucket)) {
      throw new Error(STOP);
    }
  });
} catch (error) {
  if (error?.message !== STOP) {
    throw error;
  }
}

const calibrations = calibrationSpecs.map((spec, index) => {
  const bucket = bucketData[index];
  const regression = fitLinearRegression(bucket.trainSamples);
  const trainMetrics = summarizeResidualMetrics(bucket.trainSamples, regression);
  const holdoutMetrics = summarizeResidualMetrics(bucket.holdoutSamples, regression);
  const zCoverage = summarizeZCoverage(bucket.holdoutSamples, regression, trainMetrics, zValues);
  const recommendedZ = chooseRecommendedZ(zCoverage, targetHoldoutCoverage);
  const usable = Boolean(
    regression
    && regression.sampleCount >= 10
    && Number.isFinite(regression.slope)
    && regression.slope > 0
    && (regression.correlation ?? 0) >= 0.7
    && Number.isFinite(recommendedZ?.coverage)
    && recommendedZ.coverage >= Math.min(targetHoldoutCoverage, 0.95)
  );

  return {
    key: spec.key,
    label: spec.label,
    minEmpties: spec.minEmpties,
    maxEmpties: spec.maxEmpties,
    shallowDepth: spec.shallowDepth,
    deepDepth: spec.deepDepth,
    sampleCount: bucket.acceptedSamples,
    trainSampleCount: bucket.trainSamples.length,
    holdoutSampleCount: bucket.holdoutSamples.length,
    skippedPass: bucket.skippedPass,
    skippedInvalid: bucket.skippedInvalid,
    usable,
    regression,
    trainMetrics,
    holdoutMetrics,
    zCoverage,
    recommendedZ,
    shallowSearchCost: summarizeSearchCost(bucket.searchCost.shallow),
    deepSearchCost: summarizeSearchCost(bucket.searchCost.deep),
  };
});

const usableCount = calibrations.filter((entry) => entry.usable).length;
const output = {
  version: 1,
  name: profileName,
  description,
  source: {
    inputCount: inputFiles.length,
    inputPaths: inputFiles.map((entry) => entry.path),
    estimatedInputSamples: estimatedTotalSamples,
    sampleStride,
    sampleResidue,
    maxSamplesPerBucket,
    holdoutMod,
    holdoutResidue,
    timeLimitMs,
    aspirationWindow,
    maxTableEntries,
    zValues,
    targetHoldoutCoverage,
    evaluationProfileName: evaluationProfile?.name ?? null,
    moveOrderingProfileName: moveOrderingProfile?.name ?? null,
  },
  diagnostics: {
    visitedSamples,
    matchedSamples,
    acceptedSamples: acceptedSamplesTotal,
    usableCalibrationCount: usableCount,
    shallowSearchCost: summarizeSearchCost(globalSearchCost.shallow),
    deepSearchCost: summarizeSearchCost(globalSearchCost.deep),
    elapsedSeconds: (Date.now() - startedAt) / 1000,
  },
  calibrations,
};

await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
await fs.promises.writeFile(outputJsonPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

console.log(`\nSaved MPC calibration profile to ${outputJsonPath}`);
console.log(`Usable calibrations : ${usableCount}/${calibrations.length}`);
for (const entry of calibrations) {
  const correlationText = entry.regression?.correlation === null || entry.regression?.correlation === undefined
    ? 'n/a'
    : entry.regression.correlation.toFixed(3);
  const sigmaText = entry.trainMetrics?.stdDevResidual === null || entry.trainMetrics?.stdDevResidual === undefined
    ? 'n/a'
    : formatInteger(entry.trainMetrics.stdDevResidual);
  const coverageText = entry.recommendedZ?.coverage === null || entry.recommendedZ?.coverage === undefined
    ? 'n/a'
    : percentage(entry.recommendedZ.coverage);
  console.log(`  ${entry.label.padEnd(20)} | n=${String(entry.sampleCount).padStart(4, ' ')} | corr=${correlationText} | sigma=${sigmaText} | z=${entry.recommendedZ?.z ?? 'n/a'} | coverage=${coverageText} | usable=${entry.usable ? 'yes' : 'no'}`);
}
