#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  displayProjectPath,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  loadJsonFileIfPresent,
  parseArgs,
  resolveCliPath,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('inspect-tuple-residual-profile.mjs');
  const tupleJsonPath = displayTrainingOutputPath('trained-tuple-residual-profile.json');
  const outputJsonPath = displayProjectPath('benchmarks', 'tuple_residual_inspection.json');
  console.log(`Usage:
  node ${toolPath} \
    --input ${tupleJsonPath} \
    [--output-json ${outputJsonPath}] \
    [--warn-mean-shift-stones 0.25] \
    [--warn-bucket-mean-shift-stones 0.40] \
    [--warn-max-weight 1500]

이 스크립트는 tuple JSON 안의 diagnostics 또는 calibration.verifiedDiagnostics를 읽어,
- holdout 개선 여부
- 평균 residual 편향(과도한 치우침)
- bucket별 개선/악화
- weight coverage / max weight
를 빠르게 점검합니다.

patch/prune된 profile처럼 diagnostics가 제거된 경우에도,
- 현재 남아 있는 bucket / tuple 수
- bucket bias / max|w|
- 검증 필요 여부
를 별도로 요약합니다.
`);
}

function toFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatSigned(value, digits = 4) {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;
}

function pushWarning(warnings, code, message, extra = null) {
  warnings.push({ code, message, ...(extra ? { extra } : {}) });
}

function computeTupleWeightStats(bucket) {
  const tupleWeights = Array.isArray(bucket?.tupleWeights) ? bucket.tupleWeights : [];
  let maxAbsWeight = 0;
  let nonZeroCount = 0;
  let totalWeights = 0;
  let sumAbsWeight = 0;

  for (const table of tupleWeights) {
    for (const rawWeight of Array.isArray(table) ? table : []) {
      const weight = Number(rawWeight) || 0;
      const absWeight = Math.abs(weight);
      totalWeights += 1;
      sumAbsWeight += absWeight;
      if (absWeight > 0) {
        nonZeroCount += 1;
      }
      if (absWeight > maxAbsWeight) {
        maxAbsWeight = absWeight;
      }
    }
  }

  return {
    totalWeights,
    nonZeroCount,
    maxAbsWeight: totalWeights > 0 ? maxAbsWeight : null,
    meanAbsWeight: totalWeights > 0 ? (sumAbsWeight / totalWeights) : null,
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h || !args.input) {
  printUsage();
  process.exit(args.help || args.h ? 0 : 1);
}

const inputPath = resolveCliPath(args.input);
const outputJsonPath = args['output-json'] ? resolveCliPath(args['output-json']) : null;
const warnMeanShiftStones = Math.abs(toFiniteNumber(args['warn-mean-shift-stones'], 0.25));
const warnBucketMeanShiftStones = Math.abs(toFiniteNumber(args['warn-bucket-mean-shift-stones'], 0.40));
const warnMaxWeight = Math.abs(toFiniteNumber(args['warn-max-weight'], 1500));

const profile = loadJsonFileIfPresent(inputPath);
if (!profile) {
  throw new Error(`profile JSON을 읽지 못했습니다: ${inputPath}`);
}

const diagnosticsSourceKey = profile?.calibration?.verifiedDiagnostics ? 'calibration.verifiedDiagnostics' : 'diagnostics';
const diagnostics = profile?.calibration?.verifiedDiagnostics ?? profile.diagnostics ?? null;
const trainedBuckets = Array.isArray(profile?.trainedBuckets) ? profile.trainedBuckets : [];
const warnings = [];
const hasDiagnostics = Boolean(diagnostics);
const patchMetadata = profile?.patch ?? null;

if (profile?.calibration && !profile?.calibration?.verifiedDiagnostics) {
  pushWarning(warnings, 'calibration-unverified', 'calibration metadata는 있지만 corpus 재검증된 verifiedDiagnostics는 없습니다. mean-shift 경고는 pre-calibration diagnostics 기준일 수 있습니다.');
}
if (!hasDiagnostics) {
  pushWarning(
    warnings,
    patchMetadata ? 'patched-unvalidated' : 'missing-diagnostics',
    patchMetadata
      ? 'patch/prune 이후 diagnostics가 제거되었습니다. 이 profile의 품질은 benchmark 또는 corpus 재검증으로 다시 확인해야 합니다.'
      : 'diagnostics가 없습니다. 구조 정보만 점검할 수 있습니다.',
  );
}
if (patchMetadata?.diagnosticsStatus === 'stale-removed') {
  pushWarning(warnings, 'patch-diagnostics-removed', 'patch 과정에서 기존 diagnostics/calibration이 제거되었습니다. 이전 MAE 수치는 현재 profile을 대표하지 않습니다.');
}

const holdoutSelected = diagnostics?.holdoutSelected ?? null;
const selectedAll = diagnostics?.selectedAll ?? null;
const allSamples = diagnostics?.allSamples ?? null;
const byBucketDiagnostics = Array.isArray(diagnostics?.byBucket) ? diagnostics.byBucket : [];

const holdoutMaeDeltaInStones = holdoutSelected?.delta?.maeInStones ?? null;
const holdoutMeanResidualInStones = holdoutSelected?.candidate?.meanResidualInStones ?? null;
const selectedMaeDeltaInStones = selectedAll?.delta?.maeInStones ?? null;
const allMaeDeltaInStones = allSamples?.delta?.maeInStones ?? null;

if (hasDiagnostics) {
  if (!(holdoutMaeDeltaInStones < 0)) {
    pushWarning(warnings, 'holdout-no-improvement', 'holdout selected MAE가 개선되지 않았습니다.', {
      holdoutMaeDeltaInStones,
    });
  }
  if (Number.isFinite(holdoutMeanResidualInStones) && Math.abs(holdoutMeanResidualInStones) > warnMeanShiftStones) {
    pushWarning(warnings, 'holdout-mean-shift', 'holdout selected 평균 residual 치우침이 큽니다.', {
      holdoutMeanResidualInStones,
      threshold: warnMeanShiftStones,
    });
  }
}

const bucketSummaries = trainedBuckets.map((trainedBucket) => {
  const diagnosticBucket = byBucketDiagnostics.find((bucket) => {
    if (typeof trainedBucket?.key === 'string' && typeof bucket?.key === 'string' && trainedBucket.key === bucket.key) {
      return true;
    }
    return trainedBucket?.minEmpties === bucket?.minEmpties && trainedBucket?.maxEmpties === bucket?.maxEmpties;
  }) ?? null;

  const diagnosticWeightStats = diagnosticBucket?.weightStats ?? null;
  const derivedWeightStats = computeTupleWeightStats(trainedBucket);
  const weightStats = diagnosticWeightStats ?? derivedWeightStats;
  const holdoutDelta = diagnosticBucket?.holdout?.delta?.maeInStones ?? null;
  const holdoutMean = diagnosticBucket?.holdout?.candidate?.meanResidualInStones ?? null;
  const maxAbsWeight = weightStats?.maxAbsWeight ?? null;
  const retainedWeights = weightStats?.retainedWeights ?? weightStats?.totalWeights ?? null;
  const totalWeights = weightStats?.totalWeights ?? null;
  const visitedWeights = weightStats?.visitedWeights ?? null;

  if (hasDiagnostics) {
    if (!(holdoutDelta < 0)) {
      pushWarning(warnings, 'bucket-no-improvement', `${trainedBucket?.key ?? 'unknown'} bucket holdout MAE가 개선되지 않았습니다.`, {
        key: trainedBucket?.key ?? null,
        holdoutDeltaInStones: holdoutDelta,
      });
    }
    if (Number.isFinite(holdoutMean) && Math.abs(holdoutMean) > warnBucketMeanShiftStones) {
      pushWarning(warnings, 'bucket-mean-shift', `${trainedBucket?.key ?? 'unknown'} bucket 평균 residual 치우침이 큽니다.`, {
        key: trainedBucket?.key ?? null,
        holdoutMeanResidualInStones: holdoutMean,
        threshold: warnBucketMeanShiftStones,
      });
    }
  }
  if (Number.isFinite(maxAbsWeight) && maxAbsWeight > warnMaxWeight) {
    pushWarning(warnings, 'bucket-large-weight', `${trainedBucket?.key ?? 'unknown'} bucket maxAbsWeight가 큽니다.`, {
      key: trainedBucket?.key ?? null,
      maxAbsWeight,
      threshold: warnMaxWeight,
    });
  }
  if (Number.isFinite(retainedWeights) && Number.isFinite(totalWeights) && retainedWeights < totalWeights) {
    pushWarning(warnings, 'bucket-pruned-weights', `${trainedBucket?.key ?? 'unknown'} bucket에서 일부 weight가 prune/retention cutoff에 걸렸습니다.`, {
      key: trainedBucket?.key ?? null,
      retainedWeights,
      totalWeights,
    });
  }
  if (Number.isFinite(visitedWeights) && visitedWeights === 0) {
    pushWarning(warnings, 'bucket-unvisited', `${trainedBucket?.key ?? 'unknown'} bucket weight가 전혀 방문되지 않았습니다.`, {
      key: trainedBucket?.key ?? null,
    });
  }

  return {
    key: trainedBucket?.key ?? null,
    minEmpties: trainedBucket?.minEmpties ?? null,
    maxEmpties: trainedBucket?.maxEmpties ?? null,
    holdoutMaeDeltaInStones: holdoutDelta,
    holdoutMeanResidualInStones: holdoutMean,
    holdoutMaeInStones: diagnosticBucket?.holdout?.candidate?.maeInStones ?? null,
    baseHoldoutMaeInStones: diagnosticBucket?.holdout?.base?.maeInStones ?? null,
    meanAbsWeight: weightStats?.meanAbsWeight ?? null,
    maxAbsWeight,
    totalWeights,
    visitedWeights,
    retainedWeights,
    nonZeroCount: weightStats?.nonZeroCount ?? null,
    tupleCount: Array.isArray(trainedBucket?.tupleWeights) ? trainedBucket.tupleWeights.length : null,
    bucketBias: trainedBucket?.bias ?? null,
    bucketBiasInStones: Number.isFinite(trainedBucket?.bias) ? trainedBucket.bias / (profile?.source?.targetScale ?? 3000) : null,
  };
});

const verdict = {
  improvingHoldout: hasDiagnostics ? (holdoutMaeDeltaInStones < 0) : null,
  improvingSelected: hasDiagnostics ? (selectedMaeDeltaInStones < 0) : null,
  improvingAllSamples: hasDiagnostics ? (allMaeDeltaInStones < 0) : null,
  largeHoldoutMeanShift: hasDiagnostics && Number.isFinite(holdoutMeanResidualInStones)
    ? Math.abs(holdoutMeanResidualInStones) > warnMeanShiftStones
    : null,
  warningCount: warnings.length,
  status: hasDiagnostics
    ? (warnings.length === 0 ? 'looks-good' : 'needs-review')
    : (patchMetadata ? 'unvalidated-patch' : 'missing-diagnostics'),
};

const summary = {
  generatedAt: new Date().toISOString(),
  inputPath,
  profileName: profile.name ?? null,
  stage: profile.stage ?? null,
  layout: {
    name: profile?.layout?.name ?? null,
    tupleCount: profile?.layout?.tupleCount ?? null,
    maxTupleLength: profile?.layout?.maxTupleLength ?? null,
    totalTableSize: profile?.layout?.totalTableSize ?? null,
  },
  source: {
    diagnosticsSourceKey: hasDiagnostics ? diagnosticsSourceKey : null,
    evaluationProfileName: profile?.source?.evaluationProfileName ?? null,
    layoutName: profile?.source?.layoutName ?? null,
    seenSamples: profile?.source?.seenSamples ?? null,
    selectedTrainSamples: profile?.source?.selectedTrainSamples ?? null,
    holdoutMod: profile?.source?.holdoutMod ?? null,
    sampleStride: profile?.source?.sampleStride ?? null,
    epochs: profile?.source?.epochs ?? null,
    learningRate: profile?.source?.learningRate ?? null,
    regularization: profile?.source?.regularization ?? null,
  },
  overall: {
    allMaeDeltaInStones,
    selectedMaeDeltaInStones,
    holdoutMaeDeltaInStones,
    holdoutMeanResidualInStones,
    holdoutMaeInStones: holdoutSelected?.candidate?.maeInStones ?? null,
    baseHoldoutMaeInStones: holdoutSelected?.base?.maeInStones ?? null,
  },
  calibration: profile?.calibration ?? null,
  patch: patchMetadata ?? null,
  byBucket: bucketSummaries,
  warnings,
  verdict,
};

console.log(`Tuple residual profile: ${summary.profileName ?? path.basename(inputPath)}`);
console.log(`Layout: ${summary.layout.name ?? 'n/a'} | tuples=${summary.layout.tupleCount ?? 'n/a'} | tableSize=${summary.layout.totalTableSize ?? 'n/a'}`);
console.log(`Source eval: ${summary.source.evaluationProfileName ?? 'n/a'} | seen=${summary.source.seenSamples ?? 'n/a'} | train=${summary.source.selectedTrainSamples ?? 'n/a'} | diag=${summary.source.diagnosticsSourceKey ?? 'none'}`);
if (summary.calibration) {
  console.log(`Calibration: mode=${summary.calibration.mode ?? 'n/a'} scope=${summary.calibration.scope ?? 'n/a'}`);
}
if (summary.patch) {
  console.log(`Patch: tuples=${summary.patch.selectedTupleCount ?? 'n/a'} buckets=${(summary.patch.selectedBucketKeys ?? []).join(', ')}`);
}
console.log(`Holdout MAE delta: ${formatSigned(summary.overall.holdoutMaeDeltaInStones)} stones`);
console.log(`Holdout mean residual: ${formatSigned(summary.overall.holdoutMeanResidualInStones)} stones`);
console.log(`Selected/all MAE delta: ${formatSigned(summary.overall.selectedMaeDeltaInStones)} / ${formatSigned(summary.overall.allMaeDeltaInStones)} stones`);
console.log(`Verdict: ${verdict.status} (warnings=${verdict.warningCount})`);
for (const bucket of bucketSummaries) {
  console.log(
    `  ${String(bucket.key ?? 'unknown').padEnd(10)} `
    + `holdoutDelta=${formatSigned(bucket.holdoutMaeDeltaInStones)} stones `
    + `meanShift=${formatSigned(bucket.holdoutMeanResidualInStones)} stones `
    + `bias=${formatSigned(bucket.bucketBiasInStones)} stones `
    + `tuples=${bucket.tupleCount ?? 'n/a'} `
    + `max|w|=${Number.isFinite(bucket.maxAbsWeight) ? bucket.maxAbsWeight.toFixed(1) : 'n/a'}`,
  );
}
if (warnings.length > 0) {
  console.log('Warnings:');
  for (const warning of warnings) {
    console.log(`  - [${warning.code}] ${warning.message}`);
  }
}

if (outputJsonPath) {
  await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
  await fs.promises.writeFile(outputJsonPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`Saved inspection summary to ${outputJsonPath}`);
}
