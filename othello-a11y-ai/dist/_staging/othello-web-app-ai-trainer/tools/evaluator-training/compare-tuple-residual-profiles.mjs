#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

import {
  displayProjectPath,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  parseArgs,
  resolveCliPath,
  sanitizeTupleResidualProfileForModule,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('compare-tuple-residual-profiles.mjs');
  const leftPath = displayTrainingOutputPath('top24_retrained_patch_lateb_endgame.json');
  const rightPath = displayProjectPath('js', 'ai', 'learned-eval-profile.generated.js');
  const summaryJsonPath = displayProjectPath('benchmarks', 'tuple_profile_compare_summary.json');
  console.log(`Usage:
  node ${toolPath} \
    --left ${leftPath} \
    --right ${rightPath} \
    [--summary-json ${summaryJsonPath}]

지원 입력:
- tuple residual profile JSON
- learned-eval-profile.generated.js / generated module (.js / .mjs)

출력:
- exact object equality
- runtime/evaluator equivalence (featureEncoding + layout + trainedBuckets 기준)
- metadata-only difference 여부
- bucket별 bias / weight delta 요약
- patch/calibration/diagnostics 같은 provenance metadata 보존 여부
`);
}

async function loadTupleProfile(inputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  if (ext === '.json') {
    const raw = JSON.parse(await fs.promises.readFile(inputPath, 'utf8'));
    const profile = sanitizeTupleResidualProfileForModule(raw);
    if (!profile) {
      throw new Error(`tuple residual JSON을 읽을 수 없습니다: ${inputPath}`);
    }
    return {
      kind: 'json',
      path: inputPath,
      profile,
    };
  }

  if (ext === '.js' || ext === '.mjs') {
    const moduleUrl = pathToFileURL(inputPath).href;
    const imported = await import(moduleUrl);
    const raw = imported?.GENERATED_TUPLE_RESIDUAL_PROFILE ?? null;
    const profile = sanitizeTupleResidualProfileForModule(raw);
    if (!profile) {
      throw new Error(`generated module에서 tuple residual slot을 찾지 못했습니다: ${inputPath}`);
    }
    return {
      kind: 'module',
      path: inputPath,
      profile,
    };
  }

  throw new Error(`지원하지 않는 입력 형식입니다: ${inputPath}`);
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function computeHash(value) {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function makeEvaluatorSemanticView(profile) {
  return {
    featureEncoding: profile?.featureEncoding ?? null,
    layout: profile?.layout ?? null,
    trainedBuckets: profile?.trainedBuckets ?? null,
  };
}

function makeModulePreservedView(profile) {
  return {
    version: profile?.version ?? null,
    name: profile?.name ?? null,
    description: profile?.description ?? null,
    stage: profile?.stage ?? null,
    source: profile?.source ?? null,
    diagnostics: profile?.diagnostics ?? null,
    calibration: profile?.calibration ?? null,
    patch: profile?.patch ?? null,
    featureEncoding: profile?.featureEncoding ?? null,
    layout: profile?.layout ?? null,
    trainedBuckets: profile?.trainedBuckets ?? null,
  };
}

function listTopLevelMetadataDiffs(left, right) {
  const keys = new Set([...Object.keys(left ?? {}), ...Object.keys(right ?? {})]);
  const diffs = [];
  for (const key of [...keys].sort()) {
    if (stableStringify(left?.[key]) !== stableStringify(right?.[key])) {
      diffs.push(key);
    }
  }
  return diffs;
}

function resolveBucketMap(profile) {
  const buckets = Array.isArray(profile?.trainedBuckets) ? profile.trainedBuckets : [];
  const map = new Map();
  for (const bucket of buckets) {
    if (bucket && typeof bucket.key === 'string') {
      map.set(bucket.key, bucket);
    }
  }
  return map;
}

function analyzeBucketDelta(leftBucket, rightBucket) {
  const leftTables = Array.isArray(leftBucket?.tupleWeights) ? leftBucket.tupleWeights : [];
  const rightTables = Array.isArray(rightBucket?.tupleWeights) ? rightBucket.tupleWeights : [];
  const tupleCount = Math.max(leftTables.length, rightTables.length);
  let comparedWeightCount = 0;
  let changedWeightCount = 0;
  let sumAbsDelta = 0;
  let maxAbsDelta = 0;

  for (let tupleIndex = 0; tupleIndex < tupleCount; tupleIndex += 1) {
    const leftTable = Array.isArray(leftTables[tupleIndex]) ? leftTables[tupleIndex] : [];
    const rightTable = Array.isArray(rightTables[tupleIndex]) ? rightTables[tupleIndex] : [];
    const entryCount = Math.max(leftTable.length, rightTable.length);
    for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
      const leftValue = Number(leftTable[entryIndex] ?? 0);
      const rightValue = Number(rightTable[entryIndex] ?? 0);
      const delta = rightValue - leftValue;
      const absDelta = Math.abs(delta);
      comparedWeightCount += 1;
      if (absDelta > 0) {
        changedWeightCount += 1;
      }
      sumAbsDelta += absDelta;
      if (absDelta > maxAbsDelta) {
        maxAbsDelta = absDelta;
      }
    }
  }

  return {
    key: rightBucket?.key ?? leftBucket?.key ?? null,
    leftBias: Number(leftBucket?.bias ?? 0),
    rightBias: Number(rightBucket?.bias ?? 0),
    biasDelta: Number(rightBucket?.bias ?? 0) - Number(leftBucket?.bias ?? 0),
    comparedWeightCount,
    changedWeightCount,
    meanAbsWeightDelta: comparedWeightCount > 0 ? sumAbsDelta / comparedWeightCount : 0,
    maxAbsWeightDelta: maxAbsDelta,
  };
}

function summarizeProfile(label, item) {
  const profile = item.profile;
  const buckets = Array.isArray(profile?.trainedBuckets) ? profile.trainedBuckets : [];
  return {
    label,
    kind: item.kind,
    path: item.path,
    name: profile?.name ?? null,
    description: profile?.description ?? null,
    layoutName: profile?.layout?.name ?? null,
    tupleCount: profile?.layout?.tupleCount ?? null,
    trainedBucketCount: buckets.length,
    bucketKeys: buckets.map((bucket) => bucket?.key ?? null),
    hasDiagnostics: Object.hasOwn(profile ?? {}, 'diagnostics'),
    hasCalibration: Object.hasOwn(profile ?? {}, 'calibration'),
    hasPatch: Object.hasOwn(profile ?? {}, 'patch'),
    evaluatorSemanticHash: computeHash(makeEvaluatorSemanticView(profile)),
    modulePreservedHash: computeHash(makeModulePreservedView(profile)),
    trainedBucketsHash: computeHash(profile?.trainedBuckets ?? null),
    layoutHash: computeHash(profile?.layout ?? null),
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h || !args.left || !args.right) {
  printUsage();
  process.exit(args.help || args.h ? 0 : 1);
}

const leftPath = resolveCliPath(args.left);
const rightPath = resolveCliPath(args.right);
const summaryJsonPath = args['summary-json'] ? resolveCliPath(args['summary-json']) : null;

const leftItem = await loadTupleProfile(leftPath);
const rightItem = await loadTupleProfile(rightPath);
const leftProfile = leftItem.profile;
const rightProfile = rightItem.profile;

const leftSummary = summarizeProfile('left', leftItem);
const rightSummary = summarizeProfile('right', rightItem);

const exactObjectEquality = stableStringify(leftProfile) === stableStringify(rightProfile);
const runtimeEquivalent = stableStringify(makeEvaluatorSemanticView(leftProfile)) === stableStringify(makeEvaluatorSemanticView(rightProfile));
const modulePreservedEquivalent = stableStringify(makeModulePreservedView(leftProfile)) === stableStringify(makeModulePreservedView(rightProfile));
const metadataOnlyDifference = runtimeEquivalent && !exactObjectEquality;

const leftBucketMap = resolveBucketMap(leftProfile);
const rightBucketMap = resolveBucketMap(rightProfile);
const bucketKeys = [...new Set([...leftBucketMap.keys(), ...rightBucketMap.keys()])].sort();
const bucketDiffs = bucketKeys.map((key) => analyzeBucketDelta(leftBucketMap.get(key), rightBucketMap.get(key)));

const metadataDiffKeys = listTopLevelMetadataDiffs(leftProfile, rightProfile);
const missingPatchOnly = runtimeEquivalent
  && !!leftSummary.hasPatch !== !!rightSummary.hasPatch
  && metadataDiffKeys.every((key) => key === 'patch');

const comparison = {
  generatedAt: new Date().toISOString(),
  left: leftSummary,
  right: rightSummary,
  exactObjectEquality,
  runtimeEquivalent,
  modulePreservedEquivalent,
  metadataOnlyDifference,
  metadataDiffKeys,
  bucketDiffs,
  summary: {
    status: exactObjectEquality
      ? 'exact-match'
      : runtimeEquivalent
        ? 'runtime-equivalent'
        : 'substantive-difference',
    notes: [
      ...(runtimeEquivalent ? ['featureEncoding/layout/trainedBuckets가 동일하여 evaluator 런타임 동작은 같습니다.'] : []),
      ...(metadataOnlyDifference ? ['차이는 metadata 수준이며, 실제 evaluator 값에는 영향이 없습니다.'] : []),
      ...(missingPatchOnly ? ['generated module 생성 과정에서 patch metadata만 누락된 것으로 보입니다.'] : []),
    ],
  },
};

console.log(`Compared tuple profiles:`);
console.log(`  left  : ${leftSummary.name ?? 'null'} (${leftSummary.kind})`);
console.log(`  right : ${rightSummary.name ?? 'null'} (${rightSummary.kind})`);
console.log(`  exact object equality : ${exactObjectEquality}`);
console.log(`  runtime equivalent    : ${runtimeEquivalent}`);
console.log(`  metadata-only diff    : ${metadataOnlyDifference}`);
if (metadataDiffKeys.length > 0) {
  console.log(`  top-level diff keys   : ${metadataDiffKeys.join(', ')}`);
}
for (const bucket of bucketDiffs) {
  console.log(`  bucket ${bucket.key}: biasΔ=${bucket.biasDelta}, changed=${bucket.changedWeightCount}/${bucket.comparedWeightCount}, max|Δw|=${bucket.maxAbsWeightDelta}`);
}

if (summaryJsonPath) {
  await fs.promises.mkdir(path.dirname(summaryJsonPath), { recursive: true });
  await fs.promises.writeFile(summaryJsonPath, JSON.stringify(comparison, null, 2), 'utf8');
  console.log(`Saved comparison summary to ${summaryJsonPath}`);
}
