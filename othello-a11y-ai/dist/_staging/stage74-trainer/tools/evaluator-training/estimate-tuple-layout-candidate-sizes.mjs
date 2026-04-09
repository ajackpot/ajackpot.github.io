#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  ACTIVE_EVALUATION_PROFILE,
  ACTIVE_MOVE_ORDERING_PROFILE,
  ACTIVE_MPC_PROFILE,
  ACTIVE_TUPLE_RESIDUAL_PROFILE,
  DEFAULT_TUPLE_RESIDUAL_PHASE_BUCKET_KEYS,
  listTupleResidualLayoutNames,
  resolveTupleResidualLayout,
} from '../../js/ai/evaluation-profiles.js';
import {
  defaultTupleResidualProfileName,
  displayProjectPath,
  displayTrainingToolPath,
  ensureArray,
  formatInteger,
  parseArgs,
  renderGeneratedProfilesModule,
  resolveCliPath,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('estimate-tuple-layout-candidate-sizes.mjs');
  const summaryPath = displayProjectPath('benchmarks', 'tuple_layout_candidate_size_summary.json');
  console.log(`Usage:
  node ${toolPath} \
    [--layouts orthogonal-adjacent-pairs-outer2-v1,orthogonal-adjacent-pairs-full-v1,diagonal-adjacent-pairs-full-v1,straight-adjacent-pairs-full-v1] \
    [--phase-buckets ${DEFAULT_TUPLE_RESIDUAL_PHASE_BUCKET_KEYS.join(',')}] \
    [--module-format compact|expanded] \
    [--summary-json ${summaryPath}]

설명:
- built-in tuple residual layout 후보들을 같은 bucket 구성으로 묶었을 때 learned-eval generated module의 예상 크기를 비교합니다.
- 기본은 현재 active evaluation + move-ordering + mpc slot을 유지하고, tuple slot만 후보 layout으로 바꿔서 compact module 크기를 측정합니다.
- 별도 학습 데이터가 없어도 구조적 용량 상한을 빠르게 가늠하는 용도입니다.
`);
}

function parseCommaList(values) {
  return ensureArray(values)
    .flatMap((value) => String(value).split(','))
    .map((token) => token.trim())
    .filter(Boolean);
}

function parsePhaseBucketKeys(values) {
  const tokens = parseCommaList(values);
  return tokens.length > 0 ? tokens : [...DEFAULT_TUPLE_RESIDUAL_PHASE_BUCKET_KEYS];
}

function parseLayoutNames(values) {
  const tokens = parseCommaList(values);
  return tokens.length > 0 ? tokens : listTupleResidualLayoutNames();
}

function flattenRepresentativeWeights(profile) {
  const values = [];
  if (Array.isArray(profile?.trainedBuckets)) {
    for (const bucket of profile.trainedBuckets) {
      if (!Array.isArray(bucket?.tupleWeights)) {
        continue;
      }
      for (const table of bucket.tupleWeights) {
        if (!Array.isArray(table)) {
          continue;
        }
        for (const value of table) {
          if (Number.isFinite(value)) {
            values.push(Math.round(value));
          }
        }
      }
    }
  }

  if (values.length === 0) {
    return [0, 1, -1, 7, -7, 42, -42, 125, -125, 512, -512];
  }

  const trimmed = values.filter((value) => Number.isFinite(value));
  return trimmed.length > 0 ? trimmed : [0, 1, -1, 7, -7, 42, -42, 125, -125, 512, -512];
}

function createRepresentativeTupleProfile(layoutName, phaseBucketKeys, representativeWeights) {
  const layout = resolveTupleResidualLayout(layoutName);
  let weightIndex = 0;
  const trainedBuckets = phaseBucketKeys.map((bucketKey, bucketIndex) => ({
    key: bucketKey,
    minEmpties: 0,
    maxEmpties: 0,
    scale: 1,
    bias: representativeWeights[(bucketIndex * 17) % representativeWeights.length] ?? 0,
    tupleWeights: layout.tuples.map((tuple) => Array.from({ length: tuple.tableSize }, () => {
      const value = representativeWeights[weightIndex % representativeWeights.length] ?? 0;
      weightIndex += 1;
      return value;
    })),
  }));

  return {
    version: 1,
    name: `${defaultTupleResidualProfileName()}-${layout.name}-size-estimate`,
    description: 'generated module size estimate profile',
    layout,
    trainedBuckets,
  };
}

function moduleBytesForProfiles({ evaluationProfile, moveOrderingProfile, tupleResidualProfile, mpcProfile, moduleFormat }) {
  const text = renderGeneratedProfilesModule({
    evaluationProfile,
    moveOrderingProfile,
    tupleResidualProfile,
    mpcProfile,
  }, {
    moduleFormat,
  });
  return Buffer.byteLength(text, 'utf8');
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const moduleFormat = typeof args['module-format'] === 'string' ? args['module-format'] : 'compact';
const summaryJsonPath = args['summary-json'] ? resolveCliPath(args['summary-json']) : null;
const layoutNames = parseLayoutNames(args.layouts ?? args.layout ?? args['layout-name']);
const phaseBucketKeys = parsePhaseBucketKeys(args['phase-buckets']);
const representativeWeights = flattenRepresentativeWeights(ACTIVE_TUPLE_RESIDUAL_PROFILE);

const baselineBytes = moduleBytesForProfiles({
  evaluationProfile: ACTIVE_EVALUATION_PROFILE,
  moveOrderingProfile: ACTIVE_MOVE_ORDERING_PROFILE,
  tupleResidualProfile: null,
  mpcProfile: ACTIVE_MPC_PROFILE,
  moduleFormat,
});

const candidates = layoutNames.map((layoutName) => {
  const layout = resolveTupleResidualLayout(layoutName);
  const tupleProfile = createRepresentativeTupleProfile(layoutName, phaseBucketKeys, representativeWeights);
  const moduleBytes = moduleBytesForProfiles({
    evaluationProfile: ACTIVE_EVALUATION_PROFILE,
    moveOrderingProfile: ACTIVE_MOVE_ORDERING_PROFILE,
    tupleResidualProfile: tupleProfile,
    mpcProfile: ACTIVE_MPC_PROFILE,
    moduleFormat,
  });
  return {
    layoutName: layout.name,
    tupleCount: layout.tupleCount,
    maxTupleLength: layout.maxTupleLength,
    totalTableSize: layout.totalTableSize,
    phaseBucketCount: phaseBucketKeys.length,
    moduleBytes,
    incrementalBytes: moduleBytes - baselineBytes,
  };
});

const summary = {
  generatedAt: new Date().toISOString(),
  moduleFormat,
  phaseBucketKeys,
  baselineModuleBytes: baselineBytes,
  activeEvaluationProfileName: ACTIVE_EVALUATION_PROFILE?.name ?? null,
  activeMoveOrderingProfileName: ACTIVE_MOVE_ORDERING_PROFILE?.name ?? null,
  activeTupleResidualProfileName: ACTIVE_TUPLE_RESIDUAL_PROFILE?.name ?? null,
  activeMpcProfileName: ACTIVE_MPC_PROFILE?.name ?? null,
  candidates,
};

console.log(`module format      : ${moduleFormat}`);
console.log(`baseline bytes     : ${formatInteger(baselineBytes)}`);
for (const candidate of candidates) {
  console.log(`${candidate.layoutName}`);
  console.log(`  tuples           : ${formatInteger(candidate.tupleCount)}`);
  console.log(`  total table size : ${formatInteger(candidate.totalTableSize)}`);
  console.log(`  module bytes     : ${formatInteger(candidate.moduleBytes)}`);
  console.log(`  incremental bytes: ${formatInteger(candidate.incrementalBytes)}`);
}

if (summaryJsonPath) {
  await fs.promises.mkdir(path.dirname(summaryJsonPath), { recursive: true });
  await fs.promises.writeFile(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(`Saved size summary to ${summaryJsonPath}`);
}
