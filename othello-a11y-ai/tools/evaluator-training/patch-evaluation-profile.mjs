#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  ACTIVE_EVALUATION_PROFILE,
  compileEvaluationProfile,
  makeTrainingProfileFromWeights,
  resolveEvaluationProfile,
} from '../../js/ai/evaluation-profiles.js';
import { expandFeatureScaleAliases } from './evaluation-profile-expansion-lib.mjs';
import {
  buildProfileStageMetadata,
  displayProjectPath,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  ensureArray,
  loadJsonFileIfPresent,
  parseArgs,
  resolveCliPath,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('patch-evaluation-profile.mjs');
  const evaluationJsonPath = displayTrainingOutputPath('trained-evaluation-profile.json');
  const outputJsonPath = displayTrainingOutputPath('trained-evaluation-profile.patched.json');
  const summaryJsonPath = displayProjectPath('benchmarks', 'evaluation_profile_patch_summary.json');
  console.log(`Usage:
  node ${toolPath} \
    --input ${evaluationJsonPath} \
    [--baseline-profile ${evaluationJsonPath}] \
    [--output-json ${outputJsonPath}] \
    [--summary-json ${summaryJsonPath}] \
    [--global-scale 0.95] \
    [--bucket-scale late-a=0.90,endgame=0.85] \
    [--feature-scale allOptional=0.90,parityRegionCount=0.75] \
    [--bucket-feature-scale late-a:stableDiscs=0.90,late-b:parityRegionCount=0.80] \
    [--baseline-blend late-a=0.10,endgame=0.20] \
    [--drop-features parityRegionCount,parityOddRegions] \
    [--set-interpolation off|linear-adjacent] \
    [--name patched-evaluation-profile] [--description "..."]

설명:
- 이미 학습된 evaluation profile을 재학습 없이 약화/보간/feature drop 해보는 micro-patch 후보 profile로 만듭니다.
- global/bucket scale은 bias와 모든 active feature weight에 곱해집니다.
- feature/bucket-feature scale은 해당 feature weight에만 곱해집니다.
- baseline-blend는 source bucket 중앙 empties에서 baseline profile weight와 선형 혼합합니다.
- patch 뒤에는 기존 diagnostics가 더 이상 현재 profile의 성능을 대표하지 않으므로 복사하지 않습니다. profile/depth/exact benchmark를 다시 돌리십시오.
`);
}

function toFiniteInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function toFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function splitCsv(values) {
  return ensureArray(values)
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseScaleEntries(values, label) {
  return splitCsv(values).map((entry) => {
    const separatorIndex = entry.lastIndexOf('=');
    if (separatorIndex <= 0 || separatorIndex >= entry.length - 1) {
      throw new Error(`${label} 항목은 token=scale 형식이어야 합니다: ${entry}`);
    }
    const token = entry.slice(0, separatorIndex).trim();
    const scale = Number(entry.slice(separatorIndex + 1).trim());
    if (!token) {
      throw new Error(`${label} token이 비어 있습니다: ${entry}`);
    }
    if (!Number.isFinite(scale) || scale < 0) {
      throw new Error(`${label} scale은 0 이상의 유한수여야 합니다: ${entry}`);
    }
    return { token, scale };
  });
}

function parseBucketFeatureScaleEntries(values) {
  return parseScaleEntries(values, 'bucket-feature-scale').map((entry) => {
    const separatorIndex = entry.token.indexOf(':');
    if (separatorIndex <= 0 || separatorIndex >= entry.token.length - 1) {
      throw new Error(`bucket-feature-scale token은 bucket:feature 형식이어야 합니다: ${entry.token}`);
    }
    return {
      bucketToken: entry.token.slice(0, separatorIndex).trim(),
      featureToken: entry.token.slice(separatorIndex + 1).trim(),
      scale: entry.scale,
    };
  });
}

function midpointForBucket(bucket) {
  return Math.round((Number(bucket.minEmpties ?? 0) + Number(bucket.maxEmpties ?? 0)) / 2);
}

function bucketTokenMatches(bucket, token) {
  if (typeof bucket?.key === 'string' && bucket.key === token) {
    return true;
  }

  const rangeMatch = /^(\d+)-(\d+)$/.exec(token);
  if (!rangeMatch) {
    return false;
  }
  return bucket?.minEmpties === Number(rangeMatch[1]) && bucket?.maxEmpties === Number(rangeMatch[2]);
}

function buildBucketScaleMap(buckets, scaleEntries, label) {
  const scaleMap = new Map();
  for (const entry of scaleEntries) {
    let matched = 0;
    for (const bucket of buckets) {
      if (bucketTokenMatches(bucket, entry.token)) {
        scaleMap.set(bucket.key, (scaleMap.get(bucket.key) ?? 1) * entry.scale);
        matched += 1;
      }
    }
    if (matched === 0) {
      throw new Error(`${label}에서 일치하는 bucket을 찾지 못했습니다: ${entry.token}`);
    }
  }
  return scaleMap;
}

function buildBucketFeatureScaleMap(buckets, featureKeys, entries) {
  const featureSet = new Set(featureKeys);
  const scaleMap = new Map();
  for (const entry of entries) {
    if (!featureSet.has(entry.featureToken)) {
      throw new Error(`bucket-feature-scale에서 알 수 없는 feature key를 지정했습니다: ${entry.featureToken}`);
    }
    let matched = 0;
    for (const bucket of buckets) {
      if (!bucketTokenMatches(bucket, entry.bucketToken)) {
        continue;
      }
      const bucketMap = scaleMap.get(bucket.key) ?? new Map();
      bucketMap.set(entry.featureToken, (bucketMap.get(entry.featureToken) ?? 1) * entry.scale);
      scaleMap.set(bucket.key, bucketMap);
      matched += 1;
    }
    if (matched === 0) {
      throw new Error(`bucket-feature-scale에서 일치하는 bucket을 찾지 못했습니다: ${entry.bucketToken}`);
    }
  }
  return scaleMap;
}

function expandFeatureTokens(tokens, featureKeys) {
  const expandedScales = expandFeatureScaleAliases(
    Object.fromEntries(tokens.map((token) => [token, 1])),
    featureKeys,
  );
  return new Set(Object.keys(expandedScales));
}

function normalizeInterpolationOption(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback ?? null;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['off', 'none', 'disabled', 'false', '0'].includes(normalized)) {
    return null;
  }
  if (['linear', 'linear-adjacent', 'linear-adjacent-midpoint', 'smoothed'].includes(normalized)) {
    return { enabled: true, mode: 'linear-adjacent-midpoint' };
  }
  throw new Error(`알 수 없는 interpolation 모드입니다: ${value}`);
}

const args = parseArgs(process.argv.slice(2));
const inputPath = args.input ?? args['source-profile'] ?? null;
if (args.help || args.h || !inputPath) {
  printUsage();
  process.exit(args.help || args.h ? 0 : 1);
}

const sourceProfile = resolveEvaluationProfile(loadJsonFileIfPresent(inputPath));
const baselineProfile = compileEvaluationProfile(loadJsonFileIfPresent(args['baseline-profile']) ?? ACTIVE_EVALUATION_PROFILE);
const outputJsonPath = args['output-json'] ? resolveCliPath(args['output-json']) : resolveCliPath(displayTrainingOutputPath('trained-evaluation-profile.patched.json'));
const summaryJsonPath = args['summary-json'] ? resolveCliPath(args['summary-json']) : null;

const globalScale = Math.max(0, toFiniteNumber(args['global-scale'], 1));
const bucketScaleEntries = parseScaleEntries(args['bucket-scale'], 'bucket-scale');
const featureScaleEntries = parseScaleEntries(args['feature-scale'], 'feature-scale');
const bucketFeatureScaleEntries = parseBucketFeatureScaleEntries(args['bucket-feature-scale']);
const baselineBlendEntries = parseScaleEntries(args['baseline-blend'], 'baseline-blend');
const dropFeatures = expandFeatureTokens(splitCsv(args['drop-features']), sourceProfile.featureKeys);
const featureKeys = sourceProfile.featureKeys.filter((featureKey) => !dropFeatures.has(featureKey));

if (featureKeys.length === 0) {
  throw new Error('drop-features 결과 featureKeys가 0개가 되었습니다. 최소 1개 이상은 남아야 합니다.');
}

const featureScaleMap = expandFeatureScaleAliases(
  Object.fromEntries(featureScaleEntries.map((entry) => [entry.token, entry.scale])),
  featureKeys,
);
const bucketScaleMap = buildBucketScaleMap(sourceProfile.phaseBuckets, bucketScaleEntries, 'bucket-scale');
const baselineBlendMap = buildBucketScaleMap(sourceProfile.phaseBuckets, baselineBlendEntries, 'baseline-blend');
const bucketFeatureScaleMap = buildBucketFeatureScaleMap(sourceProfile.phaseBuckets, featureKeys, bucketFeatureScaleEntries);
const interpolation = normalizeInterpolationOption(args['set-interpolation'], sourceProfile.interpolation ?? null);

const patchedBuckets = sourceProfile.phaseBuckets.map((bucket) => {
  const bucketScale = bucketScaleMap.get(bucket.key) ?? 1;
  const blendRatio = baselineBlendMap.get(bucket.key) ?? 0;
  const bucketFeatureScales = bucketFeatureScaleMap.get(bucket.key) ?? new Map();
  const baselineWeights = baselineProfile.weightsByEmptyCount?.[midpointForBucket(bucket)] ?? {};
  const weights = {
    bias: (Number(bucket.weights.bias ?? 0) * globalScale * bucketScale),
  };

  for (const featureKey of featureKeys) {
    let value = Number(bucket.weights?.[featureKey] ?? 0);
    value *= globalScale;
    value *= bucketScale;
    value *= Number(featureScaleMap[featureKey] ?? 1);
    value *= Number(bucketFeatureScales.get(featureKey) ?? 1);

    if (blendRatio > 0) {
      value = (value * (1 - blendRatio)) + ((Number(baselineWeights[featureKey] ?? 0)) * blendRatio);
    }
    weights[featureKey] = value;
  }

  if (blendRatio > 0) {
    weights.bias = (weights.bias * (1 - blendRatio)) + ((Number(baselineWeights.bias ?? 0)) * blendRatio);
  }

  return {
    key: bucket.key,
    ...(typeof bucket.label === 'string' ? { label: bucket.label } : {}),
    minEmpties: bucket.minEmpties,
    maxEmpties: bucket.maxEmpties,
    weights,
  };
});

const patchedProfile = makeTrainingProfileFromWeights({
  name: typeof args.name === 'string' && args.name.trim() !== ''
    ? args.name.trim()
    : `${sourceProfile.name}-patched`,
  description: typeof args.description === 'string'
    ? args.description
    : `Patched evaluation profile derived from ${sourceProfile.name}`,
  featureKeys,
  phaseBuckets: patchedBuckets,
  interpolation,
  stage: buildProfileStageMetadata({ kind: 'evaluation-profile', lane: 'evaluation-expansion-patch' }),
  source: {
    patchedFrom: sourceProfile.name,
    baselineProfile: baselineProfile.name,
    patch: {
      globalScale,
      bucketScaleEntries,
      featureScaleEntries,
      bucketFeatureScaleEntries,
      baselineBlendEntries,
      dropFeatures: [...dropFeatures],
      setInterpolation: interpolation,
    },
  },
  diagnostics: {
    skipped: true,
    reason: 'patched profile; rerun benchmark-profile / search benchmarks for fresh diagnostics',
    createdAt: new Date().toISOString(),
  },
});

await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
await fs.promises.writeFile(outputJsonPath, `${JSON.stringify(patchedProfile, null, 2)}\n`, 'utf8');
console.log(`Saved patched evaluation profile to ${outputJsonPath}`);
console.log(`  source profile  : ${sourceProfile.name}`);
console.log(`  baseline profile: ${baselineProfile.name}`);
console.log(`  feature keys    : ${featureKeys.length}`);
console.log(`  interpolation   : ${interpolation ? interpolation.mode : 'off'}`);

const summary = {
  generatedAt: new Date().toISOString(),
  sourceProfileName: sourceProfile.name,
  baselineProfileName: baselineProfile.name,
  outputJsonPath,
  beforeFeatureKeys: [...sourceProfile.featureKeys],
  afterFeatureKeys: [...featureKeys],
  patch: {
    globalScale,
    bucketScaleEntries,
    featureScaleEntries,
    bucketFeatureScaleEntries,
    baselineBlendEntries,
    dropFeatures: [...dropFeatures],
    setInterpolation: interpolation,
  },
  bucketCount: patchedProfile.phaseBuckets.length,
  bucketKeys: patchedProfile.phaseBuckets.map((bucket) => bucket.key),
};

if (summaryJsonPath) {
  await fs.promises.mkdir(path.dirname(summaryJsonPath), { recursive: true });
  await fs.promises.writeFile(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(`Saved patch summary to ${summaryJsonPath}`);
}
