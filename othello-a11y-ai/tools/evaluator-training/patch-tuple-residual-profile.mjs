#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  makeTupleResidualTrainingProfileFromWeights,
  resolveTupleResidualProfile,
} from '../../js/ai/evaluation-profiles.js';
import {
  buildProfileStageMetadata,
  displayProjectPath,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  ensureArray,
  formatInteger,
  loadJsonFileIfPresent,
  parseArgs,
  resolveCliPath,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('patch-tuple-residual-profile.mjs');
  const tupleJsonPath = displayTrainingOutputPath('trained-tuple-residual-profile.json');
  const outputJsonPath = displayTrainingOutputPath('trained-tuple-residual-profile.patched.json');
  const summaryJsonPath = displayProjectPath('benchmarks', 'tuple_residual_patch_summary.json');
  console.log(`Usage:
  node ${toolPath} \
    --input ${tupleJsonPath} \
    [--output-json ${outputJsonPath}] \
    [--summary-json ${summaryJsonPath}] \
    [--keep-buckets late-b,endgame | --drop-buckets midgame-c,late-a] \
    [--keep-top-tuples 24] [--tuple-score sum-abs|max-abs|l2] \
    [--keep-tuples A1-B1,0,7] [--drop-tuples H1-H2,55] \
    [--global-scale 0.75] \
    [--bucket-scale late-b=0.50,endgame=0.90] \
    [--tuple-scale A1-B2=0.80,7=0.50] \
    [--entry-scale late-a:A1-B2@7=0.80,midgame-c:0@4=1.10] \
    [--name patched-tuple-profile] [--description "..."]

설명:
- 이미 학습/보정된 tuple residual profile을 재학습 없이 안전하게 잘라내거나(bucket gating / tuple pruning)
  약화시키는(scale / attenuation) 벤치용 후보 profile로 만듭니다.
- --global-scale은 선택된 모든 bucket bias / tuple weight에 공통 배율을 곱합니다.
- --bucket-scale은 특정 bucket의 bias / tuple weight만 추가로 곱합니다.
- --tuple-scale은 선택된 tuple key 또는 index에 해당하는 weight만 추가로 곱합니다.
- --entry-scale은 bucket별 tuple table의 특정 pattern index만 추가로 곱합니다. token 형식은 [bucket:]tuple@patternIndex 입니다.
- 기본값으로 기존 diagnostics / calibration 결과는 복사하지 않습니다.
  patch 뒤에는 예전 MAE가 더 이상 현재 profile의 성능을 대표하지 않기 때문입니다.
- 이후 필요하면 calibrate / profile benchmark / depth benchmark로 다시 검증하십시오.
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

function selectBuckets(profile, { keepTokens, dropTokens }) {
  const buckets = Array.isArray(profile?.trainedBuckets) ? profile.trainedBuckets : [];
  let selected = buckets;

  if (keepTokens.length > 0) {
    const keepSet = new Set();
    for (const token of keepTokens) {
      const matched = buckets.filter((bucket) => bucketTokenMatches(bucket, token));
      if (matched.length === 0) {
        throw new Error(`keep-buckets에서 일치하는 bucket을 찾지 못했습니다: ${token}`);
      }
      for (const bucket of matched) {
        keepSet.add(bucket);
      }
    }
    selected = buckets.filter((bucket) => keepSet.has(bucket));
  }

  if (dropTokens.length > 0) {
    const dropSet = new Set();
    for (const token of dropTokens) {
      const matched = buckets.filter((bucket) => bucketTokenMatches(bucket, token));
      if (matched.length === 0) {
        throw new Error(`drop-buckets에서 일치하는 bucket을 찾지 못했습니다: ${token}`);
      }
      for (const bucket of matched) {
        dropSet.add(bucket);
      }
    }
    selected = selected.filter((bucket) => !dropSet.has(bucket));
  }

  if (selected.length === 0) {
    throw new Error('선택된 bucket이 0개입니다. --keep-buckets / --drop-buckets 조합을 확인하십시오.');
  }

  return selected;
}

function tupleIndexFromToken(layout, token) {
  if (/^\d+$/.test(token)) {
    const index = Number(token);
    if (index < 0 || index >= layout.tuples.length) {
      throw new Error(`tuple index가 범위를 벗어났습니다: ${token}`);
    }
    return index;
  }

  const index = layout.tuples.findIndex((tuple) => tuple.key === token);
  if (index < 0) {
    throw new Error(`tuple key를 찾지 못했습니다: ${token}`);
  }
  return index;
}

function computeTupleScore(tupleWeightTables, metric) {
  if (!Array.isArray(tupleWeightTables) || tupleWeightTables.length === 0) {
    return 0;
  }

  if (metric === 'max-abs') {
    let best = 0;
    for (const table of tupleWeightTables) {
      for (const weight of table) {
        best = Math.max(best, Math.abs(Number(weight) || 0));
      }
    }
    return best;
  }

  if (metric === 'l2') {
    let sum = 0;
    for (const table of tupleWeightTables) {
      for (const weight of table) {
        const value = Number(weight) || 0;
        sum += value * value;
      }
    }
    return sum;
  }

  let sumAbs = 0;
  for (const table of tupleWeightTables) {
    for (const weight of table) {
      sumAbs += Math.abs(Number(weight) || 0);
    }
  }
  return sumAbs;
}

function selectTupleIndices(profile, selectedBuckets, {
  keepTopTuples,
  tupleScoreMetric,
  keepTupleTokens,
  dropTupleTokens,
}) {
  const layout = profile.layout;
  const allIndices = Array.from({ length: layout.tuples.length }, (_, index) => index);
  let selectedSet = null;

  if (Number.isInteger(keepTopTuples) && keepTopTuples > 0 && keepTopTuples < layout.tuples.length) {
    const scored = allIndices.map((tupleIndex) => ({
      tupleIndex,
      key: layout.tuples[tupleIndex].key,
      score: computeTupleScore(selectedBuckets.map((bucket) => bucket.tupleWeights?.[tupleIndex] ?? []), tupleScoreMetric),
    }));
    scored.sort((left, right) => right.score - left.score || left.tupleIndex - right.tupleIndex);
    selectedSet = new Set(scored.slice(0, keepTopTuples).map((entry) => entry.tupleIndex));
  }

  if (keepTupleTokens.length > 0) {
    if (!selectedSet) {
      selectedSet = new Set();
    }
    for (const token of keepTupleTokens) {
      selectedSet.add(tupleIndexFromToken(layout, token));
    }
  }

  if (!selectedSet) {
    selectedSet = new Set(allIndices);
  }

  if (dropTupleTokens.length > 0) {
    for (const token of dropTupleTokens) {
      selectedSet.delete(tupleIndexFromToken(layout, token));
    }
  }

  const selected = allIndices.filter((index) => selectedSet.has(index));
  if (selected.length === 0) {
    throw new Error('선택된 tuple이 0개입니다. pruning 조건을 확인하십시오.');
  }

  return selected;
}

function buildBucketScaleVector(selectedBuckets, scaleEntries) {
  const scales = Array.from({ length: selectedBuckets.length }, () => 1);
  for (const entry of scaleEntries) {
    let matched = 0;
    for (let index = 0; index < selectedBuckets.length; index += 1) {
      if (bucketTokenMatches(selectedBuckets[index], entry.token)) {
        scales[index] *= entry.scale;
        matched += 1;
      }
    }
    if (matched === 0) {
      throw new Error(`bucket-scale에서 선택된 bucket과 일치하는 항목을 찾지 못했습니다: ${entry.token}`);
    }
  }
  return scales;
}

function buildTupleScaleMap(layout, selectedTupleIndices, scaleEntries) {
  const scaleMap = new Map(selectedTupleIndices.map((tupleIndex) => [tupleIndex, 1]));
  for (const entry of scaleEntries) {
    const tupleIndex = tupleIndexFromToken(layout, entry.token);
    if (!scaleMap.has(tupleIndex)) {
      throw new Error(`tuple-scale 항목이 현재 선택된 tuple에 포함되어 있지 않습니다: ${entry.token}`);
    }
    scaleMap.set(tupleIndex, scaleMap.get(tupleIndex) * entry.scale);
  }
  return scaleMap;
}

function parseEntryScaleTarget(layout, selectedBuckets, selectedTupleIndices, token) {
  const atIndex = token.lastIndexOf('@');
  if (atIndex <= 0 || atIndex >= token.length - 1) {
    throw new Error(`entry-scale 항목은 [bucket:]tuple@patternIndex 형식이어야 합니다: ${token}`);
  }

  const head = token.slice(0, atIndex).trim();
  const patternIndex = Number(token.slice(atIndex + 1).trim());
  if (!Number.isInteger(patternIndex) || patternIndex < 0) {
    throw new Error(`entry-scale patternIndex는 0 이상의 정수여야 합니다: ${token}`);
  }

  let bucketToken = null;
  let tupleToken = head;
  const separatorIndex = head.indexOf(':');
  if (separatorIndex >= 0) {
    bucketToken = head.slice(0, separatorIndex).trim();
    tupleToken = head.slice(separatorIndex + 1).trim();
  }
  if (!tupleToken) {
    throw new Error(`entry-scale tuple token이 비어 있습니다: ${token}`);
  }

  const tupleIndex = tupleIndexFromToken(layout, tupleToken);
  if (!selectedTupleIndices.includes(tupleIndex)) {
    throw new Error(`entry-scale 항목이 현재 선택된 tuple에 포함되어 있지 않습니다: ${token}`);
  }

  const tuple = layout.tuples[tupleIndex];
  const tableSize = Number(tuple?.tableSize) || 0;
  if (tableSize > 0 && patternIndex >= tableSize) {
    throw new Error(`entry-scale patternIndex가 tuple table 범위를 벗어났습니다: ${token}`);
  }

  const bucketIndices = [];
  for (let bucketIndex = 0; bucketIndex < selectedBuckets.length; bucketIndex += 1) {
    if (!bucketToken || bucketTokenMatches(selectedBuckets[bucketIndex], bucketToken)) {
      bucketIndices.push(bucketIndex);
    }
  }
  if (bucketIndices.length === 0) {
    throw new Error(`entry-scale에서 선택된 bucket과 일치하는 항목을 찾지 못했습니다: ${token}`);
  }

  return { bucketToken, tupleToken, tupleIndex, patternIndex, bucketIndices };
}

function buildEntryScaleMaps(selectedBuckets, layout, selectedTupleIndices, scaleEntries) {
  const entryScaleMaps = Array.from({ length: selectedBuckets.length }, () => new Map());

  for (const entry of scaleEntries) {
    const parsed = parseEntryScaleTarget(layout, selectedBuckets, selectedTupleIndices, entry.token);
    for (const bucketIndex of parsed.bucketIndices) {
      const bucketMap = entryScaleMaps[bucketIndex];
      let tupleMap = bucketMap.get(parsed.tupleIndex);
      if (!tupleMap) {
        tupleMap = new Map();
        bucketMap.set(parsed.tupleIndex, tupleMap);
      }
      tupleMap.set(parsed.patternIndex, (tupleMap.get(parsed.patternIndex) ?? 1) * entry.scale);
    }
  }

  return entryScaleMaps;
}

function scaleWeightTable(weightsSource, factor, entryScaleMap = null) {
  const table = Array.isArray(weightsSource) ? weightsSource : [];
  const scaled = factor === 1
    ? table.map((value) => Number(value) || 0)
    : table.map((value) => (Number(value) || 0) * factor);

  if (!entryScaleMap || entryScaleMap.size === 0) {
    return scaled;
  }

  for (const [patternIndex, entryScale] of entryScaleMap.entries()) {
    if (patternIndex < 0 || patternIndex >= scaled.length) {
      continue;
    }
    scaled[patternIndex] *= entryScale;
  }

  return scaled;
}

function createPatchedProfile(profile, selectedBuckets, selectedTupleIndices, {
  name,
  description,
  tupleScoreMetric,
  keepTopTuples,
  keepBucketTokens,
  dropBucketTokens,
  keepTupleTokens,
  dropTupleTokens,
  globalScale,
  bucketScaleEntries,
  tupleScaleEntries,
  entryScaleEntries,
  bucketScales,
  tupleScaleMap,
  entryScaleMaps,
}) {
  const selectedTupleSet = new Set(selectedTupleIndices);
  const selectedLayout = {
    name: `${profile.layout.name}-patched`,
    description: `${profile.layout.description ?? 'tuple residual layout'} (patched)`,
    tuples: profile.layout.tuples.filter((_, index) => selectedTupleSet.has(index)),
  };

  const trainedBuckets = selectedBuckets.map((bucket, bucketIndex) => {
    const bucketScale = bucketScales[bucketIndex] ?? 1;
    return {
      key: bucket.key,
      minEmpties: bucket.minEmpties,
      maxEmpties: bucket.maxEmpties,
      scale: bucket.scale,
      bias: (Number(bucket.bias) || 0) * globalScale * bucketScale,
      tupleWeights: selectedTupleIndices.map((tupleIndex) => {
        const tupleScale = tupleScaleMap.get(tupleIndex) ?? 1;
        const combinedScale = globalScale * bucketScale * tupleScale;
        const entryScaleMap = entryScaleMaps[bucketIndex]?.get(tupleIndex) ?? null;
        return scaleWeightTable(bucket.tupleWeights?.[tupleIndex] ?? [], combinedScale, entryScaleMap);
      }),
    };
  });

  const summaryPatch = {
    version: 2,
    mode: 'prune-and-scale',
    generatedAt: new Date().toISOString(),
    sourceTupleProfileName: profile.name ?? null,
    sourceTupleProfileStage: profile.stage ?? null,
    sourceLayoutName: profile.layout.name ?? null,
    sourceTupleCount: profile.layout.tupleCount ?? profile.layout.tuples.length,
    selectedTupleCount: selectedTupleIndices.length,
    selectedBucketCount: selectedBuckets.length,
    tupleScoreMetric,
    globalScale,
    ...(Number.isInteger(keepTopTuples) ? { keepTopTuples } : {}),
    ...(keepBucketTokens.length > 0 ? { keepBuckets: keepBucketTokens } : {}),
    ...(dropBucketTokens.length > 0 ? { dropBuckets: dropBucketTokens } : {}),
    ...(keepTupleTokens.length > 0 ? { keepTuples: keepTupleTokens } : {}),
    ...(dropTupleTokens.length > 0 ? { dropTuples: dropTupleTokens } : {}),
    ...(bucketScaleEntries.length > 0 ? {
      bucketScales: bucketScaleEntries.map((entry) => ({ token: entry.token, scale: entry.scale })),
    } : {}),
    ...(tupleScaleEntries.length > 0 ? {
      tupleScales: tupleScaleEntries.map((entry) => ({ token: entry.token, scale: entry.scale })),
    } : {}),
    ...(entryScaleEntries.length > 0 ? {
      entryScales: entryScaleEntries.map((entry) => ({ token: entry.token, scale: entry.scale })),
    } : {}),
    selectedTupleKeys: selectedTupleIndices.map((tupleIndex) => profile.layout.tuples[tupleIndex].key),
    selectedBucketKeys: selectedBuckets.map((bucket) => bucket.key ?? `${bucket.minEmpties}-${bucket.maxEmpties}`),
    diagnosticsStatus: 'stale-removed',
  };

  const patchedSource = {
    ...(profile.source ?? {}),
    patchedFromProfileName: profile.name ?? null,
    patchedFromProfileStage: profile.stage ?? null,
  };

  return makeTupleResidualTrainingProfileFromWeights({
    name,
    description,
    layout: selectedLayout,
    trainedBuckets,
    source: patchedSource,
    diagnostics: null,
    calibration: null,
    stage: profile.stage ?? buildProfileStageMetadata({ kind: 'tuple-residual-profile' }),
    patch: summaryPatch,
  });
}

function summarizeProfile(profile) {
  return {
    name: profile?.name ?? null,
    layoutName: profile?.layout?.name ?? null,
    tupleCount: profile?.layout?.tupleCount ?? (Array.isArray(profile?.layout?.tuples) ? profile.layout.tuples.length : null),
    trainedBucketCount: Array.isArray(profile?.trainedBuckets) ? profile.trainedBuckets.length : 0,
    bucketKeys: Array.isArray(profile?.trainedBuckets)
      ? profile.trainedBuckets.map((bucket) => bucket?.key ?? `${bucket?.minEmpties}-${bucket?.maxEmpties}`)
      : [],
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h || !args.input) {
  printUsage();
  process.exit(args.help || args.h ? 0 : 1);
}

const inputPath = resolveCliPath(args.input);
const outputJsonPath = args['output-json']
  ? resolveCliPath(args['output-json'])
  : resolveCliPath(displayTrainingOutputPath('trained-tuple-residual-profile.patched.json'));
const summaryJsonPath = args['summary-json'] ? resolveCliPath(args['summary-json']) : null;
const keepBucketTokens = splitCsv(args['keep-buckets']);
const dropBucketTokens = splitCsv(args['drop-buckets']);
const keepTupleTokens = splitCsv(args['keep-tuples']);
const dropTupleTokens = splitCsv(args['drop-tuples']);
const keepTopTuples = args['keep-top-tuples'] !== undefined
  ? Math.max(1, toFiniteInteger(args['keep-top-tuples'], 1))
  : null;
const tupleScoreMetric = typeof args['tuple-score'] === 'string' ? args['tuple-score'] : 'sum-abs';
const globalScale = Math.max(0, toFiniteNumber(args['global-scale'], 1));
const bucketScaleEntries = parseScaleEntries(args['bucket-scale'], 'bucket-scale');
const tupleScaleEntries = parseScaleEntries(args['tuple-scale'], 'tuple-scale');
const entryScaleEntries = parseScaleEntries(args['entry-scale'], 'entry-scale');

if (!new Set(['sum-abs', 'max-abs', 'l2']).has(tupleScoreMetric)) {
  throw new Error(`지원하지 않는 tuple score metric입니다: ${tupleScoreMetric}`);
}

const rawInputProfile = loadJsonFileIfPresent(inputPath);
if (!rawInputProfile) {
  throw new Error(`tuple residual profile JSON을 읽지 못했습니다: ${inputPath}`);
}
const inputProfile = resolveTupleResidualProfile(rawInputProfile);
if (!inputProfile) {
  throw new Error(`tuple residual profile로 해석하지 못했습니다: ${inputPath}`);
}

const selectedBuckets = selectBuckets(inputProfile, {
  keepTokens: keepBucketTokens,
  dropTokens: dropBucketTokens,
});
const selectedTupleIndices = selectTupleIndices(inputProfile, selectedBuckets, {
  keepTopTuples,
  tupleScoreMetric,
  keepTupleTokens,
  dropTupleTokens,
});
const bucketScales = buildBucketScaleVector(selectedBuckets, bucketScaleEntries);
const tupleScaleMap = buildTupleScaleMap(inputProfile.layout, selectedTupleIndices, tupleScaleEntries);
const entryScaleMaps = buildEntryScaleMaps(selectedBuckets, inputProfile.layout, selectedTupleIndices, entryScaleEntries);
const outputProfile = createPatchedProfile(inputProfile, selectedBuckets, selectedTupleIndices, {
  name: typeof args.name === 'string' ? args.name : `${inputProfile.name}-patched`,
  description: typeof args.description === 'string'
    ? args.description
    : `${inputProfile.description ?? 'tuple residual evaluator'} (patched)` ,
  tupleScoreMetric,
  keepTopTuples,
  keepBucketTokens,
  dropBucketTokens,
  keepTupleTokens,
  dropTupleTokens,
  globalScale,
  bucketScaleEntries,
  tupleScaleEntries,
  entryScaleEntries,
  bucketScales,
  tupleScaleMap,
  entryScaleMaps,
});

await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
await fs.promises.writeFile(outputJsonPath, JSON.stringify({
  ...outputProfile,
  patch: {
    version: 2,
    mode: 'prune-and-scale',
    generatedAt: new Date().toISOString(),
    sourceTupleProfileName: inputProfile.name ?? null,
    sourceTupleProfileStage: inputProfile.stage ?? null,
    sourceTupleCount: inputProfile.layout.tupleCount ?? inputProfile.layout.tuples.length,
    selectedTupleCount: selectedTupleIndices.length,
    selectedTupleKeys: selectedTupleIndices.map((tupleIndex) => inputProfile.layout.tuples[tupleIndex].key),
    selectedBucketKeys: selectedBuckets.map((bucket) => bucket.key ?? `${bucket.minEmpties}-${bucket.maxEmpties}`),
    tupleScoreMetric,
    globalScale,
    ...(Number.isInteger(keepTopTuples) ? { keepTopTuples } : {}),
    ...(keepBucketTokens.length > 0 ? { keepBuckets: keepBucketTokens } : {}),
    ...(dropBucketTokens.length > 0 ? { dropBuckets: dropBucketTokens } : {}),
    ...(keepTupleTokens.length > 0 ? { keepTuples: keepTupleTokens } : {}),
    ...(dropTupleTokens.length > 0 ? { dropTuples: dropTupleTokens } : {}),
    ...(bucketScaleEntries.length > 0 ? {
      bucketScales: bucketScaleEntries.map((entry) => ({ token: entry.token, scale: entry.scale })),
    } : {}),
    ...(tupleScaleEntries.length > 0 ? {
      tupleScales: tupleScaleEntries.map((entry) => ({ token: entry.token, scale: entry.scale })),
    } : {}),
    ...(entryScaleEntries.length > 0 ? {
      entryScales: entryScaleEntries.map((entry) => ({ token: entry.token, scale: entry.scale })),
    } : {}),
    diagnosticsStatus: 'stale-removed',
  },
}, null, 2), 'utf8');

const summary = {
  generatedAt: new Date().toISOString(),
  inputPath,
  outputJsonPath,
  input: summarizeProfile(inputProfile),
  output: summarizeProfile(outputProfile),
  tupleScoreMetric,
  globalScale,
  selectedTupleKeys: selectedTupleIndices.map((tupleIndex) => inputProfile.layout.tuples[tupleIndex].key),
  selectedBucketKeys: selectedBuckets.map((bucket) => bucket.key ?? `${bucket.minEmpties}-${bucket.maxEmpties}`),
  bucketScales: bucketScaleEntries,
  tupleScales: tupleScaleEntries,
  entryScales: entryScaleEntries,
};

console.log(`Patched tuple residual profile: ${summary.output.name}`);
console.log(`  buckets       : ${summary.output.bucketKeys.join(', ')}`);
console.log(`  tuples        : ${formatInteger(summary.output.tupleCount ?? 0)} / ${formatInteger(summary.input.tupleCount ?? 0)}`);
console.log(`  metric        : ${tupleScoreMetric}`);
console.log(`  global-scale  : ${globalScale}`);
if (bucketScaleEntries.length > 0) {
  console.log(`  bucket-scale  : ${bucketScaleEntries.map((entry) => `${entry.token}=${entry.scale}`).join(', ')}`);
}
if (tupleScaleEntries.length > 0) {
  console.log(`  tuple-scale   : ${tupleScaleEntries.map((entry) => `${entry.token}=${entry.scale}`).join(', ')}`);
}
if (entryScaleEntries.length > 0) {
  console.log(`  entry-scale   : ${entryScaleEntries.map((entry) => `${entry.token}=${entry.scale}`).join(', ')}`);
}
console.log(`Saved patched profile to ${outputJsonPath}`);

if (summaryJsonPath) {
  await fs.promises.mkdir(path.dirname(summaryJsonPath), { recursive: true });
  await fs.promises.writeFile(summaryJsonPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`Saved patch summary to ${summaryJsonPath}`);
}
