#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  buildProfileStageMetadata,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  ensureArray,
  formatInteger,
  loadJsonFileIfPresent,
  MOVE_ORDERING_REGRESSION_FEATURE_KEYS,
  parseArgs,
  resolveCliPath,
  sanitizeMoveOrderingProfileForModule,
  toPortablePath,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('make-move-ordering-variant.mjs');
  const inputPath = displayTrainingOutputPath('trained-move-ordering-profile.json');
  const outputPath = displayTrainingOutputPath('candidate-move-ordering-profile.json');
  console.log(`Usage:
  node ${toolPath} \
    --input-profile ${inputPath} \
    --output-json ${outputPath} \
    --name candidate-profile-name \
    --description "설명" \
    --scale-spec mobility@10-14=0 \
    [--scale-spec edgePattern@13-14=0.5] \
    [--drop-range 13-14]

설명:
- 기존 move-ordering profile JSON에서 선택한 feature weight를 empties 구간별로 배율 조정하거나,
  특정 trained bucket을 제거해 runtime fallback ordering으로 되돌린 파생 profile을 생성합니다.
- scale-spec 문법: <feature>@<minEmpties>-<maxEmpties>=<scale>
  예) mobility@10-14=0, mobility@10-12=0.25
- drop-range 문법: <minEmpties>-<maxEmpties>
  예) 13-14, 15-18
- bucket empties 범위와 scale-spec / drop-range 범위가 겹치면 해당 bucket에 변경이 적용됩니다.
`);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function toFiniteNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function parseScaleSpec(rawSpec) {
  const spec = String(rawSpec ?? '').trim();
  const match = spec.match(/^([A-Za-z][A-Za-z0-9]*)@(\d+)-(\d+)=(-?(?:\d+(?:\.\d*)?|\.\d+))$/);
  if (!match) {
    throw new Error(`잘못된 scale-spec 형식입니다: ${spec}`);
  }

  const [, featureKey, rawMin, rawMax, rawScale] = match;
  if (!MOVE_ORDERING_REGRESSION_FEATURE_KEYS.includes(featureKey)) {
    throw new Error(`지원하지 않는 move-ordering feature입니다: ${featureKey}`);
  }

  const minEmpties = Number(rawMin);
  const maxEmpties = Number(rawMax);
  if (!Number.isInteger(minEmpties) || !Number.isInteger(maxEmpties) || minEmpties < 0 || maxEmpties < minEmpties) {
    throw new Error(`scale-spec empties 범위가 잘못되었습니다: ${spec}`);
  }

  const scale = toFiniteNumber(rawScale, null);
  if (!Number.isFinite(scale)) {
    throw new Error(`scale-spec scale 값이 잘못되었습니다: ${spec}`);
  }

  return {
    featureKey,
    minEmpties,
    maxEmpties,
    scale,
    raw: spec,
  };
}

function bucketIntersectsRange(bucket, spec) {
  return bucket.minEmpties <= spec.maxEmpties && bucket.maxEmpties >= spec.minEmpties;
}

function parseDropRange(rawRange) {
  const rangeText = String(rawRange ?? '').trim();
  const match = rangeText.match(/^(\d+)(?:-(\d+))?$/);
  if (!match) {
    throw new Error(`잘못된 drop-range 형식입니다: ${rangeText}`);
  }

  const minEmpties = Number(match[1]);
  const maxEmpties = Number(match[2] ?? match[1]);
  if (!Number.isInteger(minEmpties) || !Number.isInteger(maxEmpties) || minEmpties < 0 || maxEmpties < minEmpties) {
    throw new Error(`drop-range empties 범위가 잘못되었습니다: ${rangeText}`);
  }

  return {
    minEmpties,
    maxEmpties,
    raw: rangeText,
  };
}

function roundWeight(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h || !args['input-profile'] || !args['output-json'] || (!args['scale-spec'] && !args['drop-range'])) {
  printUsage();
  process.exit(args.help || args.h ? 0 : 1);
}

const inputProfilePath = resolveCliPath(args['input-profile']);
const outputJsonPath = resolveCliPath(args['output-json']);
const baseProfile = loadJsonFileIfPresent(inputProfilePath);
if (!baseProfile) {
  throw new Error(`input profile을 읽을 수 없습니다: ${inputProfilePath}`);
}

const normalizedBaseProfile = sanitizeMoveOrderingProfileForModule(baseProfile);
const nextProfile = cloneJson(normalizedBaseProfile);
const scaleSpecs = ensureArray(args['scale-spec']).map(parseScaleSpec);
const dropRanges = ensureArray(args['drop-range']).map(parseDropRange);
const changedBuckets = [];
const removedBuckets = [];

for (const bucket of nextProfile.trainedBuckets ?? []) {
  const bucketChanges = [];
  if (dropRanges.some((range) => bucketIntersectsRange(bucket, range))) {
    removedBuckets.push({
      key: bucket.key ?? `${bucket.minEmpties}-${bucket.maxEmpties}`,
      minEmpties: bucket.minEmpties,
      maxEmpties: bucket.maxEmpties,
    });
    continue;
  }
  for (const spec of scaleSpecs) {
    if (!bucketIntersectsRange(bucket, spec)) {
      continue;
    }
    const before = Number(bucket.weights?.[spec.featureKey] ?? 0);
    const after = roundWeight(before * spec.scale);
    bucket.weights[spec.featureKey] = after;
    bucketChanges.push({
      spec: spec.raw,
      featureKey: spec.featureKey,
      before,
      after,
      scale: spec.scale,
    });
  }
  if (bucketChanges.length > 0) {
    changedBuckets.push({
      key: bucket.key ?? `${bucket.minEmpties}-${bucket.maxEmpties}`,
      minEmpties: bucket.minEmpties,
      maxEmpties: bucket.maxEmpties,
      changes: bucketChanges,
    });
  }
}

nextProfile.trainedBuckets = (nextProfile.trainedBuckets ?? []).filter((bucket) => !dropRanges.some((range) => bucketIntersectsRange(bucket, range)));

if (changedBuckets.length === 0 && removedBuckets.length === 0) {
  throw new Error('scale-spec / drop-range와 겹치는 trained bucket이 없어 profile이 변경되지 않았습니다.');
}

nextProfile.name = typeof args.name === 'string' && args.name.trim() !== ''
  ? args.name.trim()
  : `${normalizedBaseProfile.name ?? 'move-ordering-profile'}__variant`;
nextProfile.description = typeof args.description === 'string'
  ? args.description
  : `${normalizedBaseProfile.description ?? 'move-ordering profile'} (derived variant)`;

nextProfile.stage = buildProfileStageMetadata({
  kind: 'move-ordering-profile',
  status: 'derived-variant',
  derivedFromProfileName: normalizedBaseProfile.name ?? null,
  derivedFromProfilePath: toPortablePath(path.relative(process.cwd(), inputProfilePath) || path.basename(inputProfilePath)),
});

const baseSource = baseProfile && typeof baseProfile.source === 'object' && baseProfile.source
  ? cloneJson(baseProfile.source)
  : {};
const {
  adoptedFromProfilePath: _ignoredAdoptedFromProfilePath,
  candidateAlias: _ignoredCandidateAlias,
  selectedFromTuningSummaryPath: _ignoredSelectedFromTuningSummaryPath,
  priorActiveProfileBackupPath: _ignoredPriorActiveProfileBackupPath,
  ...baseSourceRest
} = baseSource;
nextProfile.source = {
  ...baseSourceRest,
  derivedFromProfileName: normalizedBaseProfile.name ?? null,
  derivedFromProfilePath: toPortablePath(path.relative(process.cwd(), inputProfilePath) || path.basename(inputProfilePath)),
  derivedAt: new Date().toISOString(),
  tuning: {
    type: 'manual-variant',
    scaleSpecs: scaleSpecs.map(({ raw, featureKey, minEmpties, maxEmpties, scale }) => ({
      raw,
      featureKey,
      minEmpties,
      maxEmpties,
      scale,
    })),
    dropRanges: dropRanges.map(({ raw, minEmpties, maxEmpties }) => ({
      raw,
      minEmpties,
      maxEmpties,
    })),
  },
};

const diagnostics = baseProfile && typeof baseProfile.diagnostics === 'object' && baseProfile.diagnostics
  ? cloneJson(baseProfile.diagnostics)
  : {};
const {
  adoptedFromProfilePath: _ignoredDiagnosticsAdoptedFromProfilePath,
  candidateAlias: _ignoredDiagnosticsCandidateAlias,
  selectedFromTuningSummaryPath: _ignoredDiagnosticsSelectedFromTuningSummaryPath,
  priorActiveProfileBackupPath: _ignoredDiagnosticsPriorActiveProfileBackupPath,
  ...diagnosticsRest
} = diagnostics;
nextProfile.diagnostics = {
  ...diagnosticsRest,
  derivedVariant: {
    baseProfileName: normalizedBaseProfile.name ?? null,
    changedBucketCount: changedBuckets.length,
    changedBuckets,
    removedBucketCount: removedBuckets.length,
    removedBuckets,
  },
};

await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
await fs.promises.writeFile(outputJsonPath, `${JSON.stringify(nextProfile, null, 2)}\n`, 'utf8');

console.log(`Base profile : ${normalizedBaseProfile.name ?? path.basename(inputProfilePath)}`);
console.log(`Output       : ${outputJsonPath}`);
console.log(`Scale specs  : ${scaleSpecs.length > 0 ? scaleSpecs.map((spec) => spec.raw).join(', ') : '(none)'}`);
console.log(`Drop ranges  : ${dropRanges.length > 0 ? dropRanges.map((range) => range.raw).join(', ') : '(none)'}`);
console.log(`Buckets hit  : ${formatInteger(changedBuckets.length + removedBuckets.length)}`);
for (const bucket of removedBuckets) {
  console.log(`  removed ${bucket.key} [${bucket.minEmpties}-${bucket.maxEmpties}] -> runtime fallback`);
}
for (const bucket of changedBuckets) {
  const changeText = bucket.changes
    .map((change) => `${change.featureKey} ${change.before} -> ${change.after} (x${change.scale})`)
    .join(' | ');
  console.log(`  ${bucket.key} [${bucket.minEmpties}-${bucket.maxEmpties}] ${changeText}`);
}
