#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_EVALUATION_PROFILE } from '../../js/ai/evaluation-profiles.js';
import {
  playSeededRandomUntilEmptyCount,
  runMedianSearch,
} from '../../js/test/benchmark-helpers.mjs';
import {
  MOVE_ORDERING_REGRESSION_FEATURE_KEYS,
  displayProjectPath,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  formatInteger,
  loadJsonFileIfPresent,
  parseArgs,
  resolveCliPath,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('audit-move-ordering-search-cost.mjs');
  const evaluationProfilePath = displayTrainingOutputPath('trained-evaluation-profile.json');
  const moveOrderingProfilePath = displayTrainingOutputPath('trained-move-ordering-profile.json');
  const outputJsonPath = displayProjectPath('benchmarks', 'stage38_move_ordering_search_cost_audit.json');
  console.log(`Usage:
  node ${toolPath} \
    [--evaluation-profile ${evaluationProfilePath}] \
    [--move-ordering-profile ${moveOrderingProfilePath}] \
    [--output-json ${outputJsonPath}] \
    [--variants legacy,full,no-mobility,no-corners,no-cornerAdjacency,no-edgePattern,no-cornerPattern,no-discDifferential,no-parity] \
    [--depth-empties 15,16,17,18] [--exact-empties 10,11,12,13,14] \
    [--seed-start 1] [--seed-count 6] [--repetitions 1] \
    [--time-limit-ms 2000] [--max-depth 6] [--depth-exact-endgame-empties 10] \
    [--exact-time-limit-ms 60000] [--exact-max-depth 16] [--exact-endgame-empties 14]

설명:
- learned move-ordering profile의 feature ablation을 실제 검색 비용(nodes/time) 기준으로 비교합니다.
- legacy는 learned move-ordering을 끈 상태(null profile)입니다.
- full은 업로드/지정한 learned move-ordering profile 전체입니다.
- no-<feature> variant는 해당 feature를 모든 bucket에서 0으로 두고 다시 벤치마크합니다.
`);
}

function toFiniteInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function parseEmptiesList(value, fallback) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [...fallback];
  }
  const parsed = value
    .split(',')
    .map((token) => Number(token.trim()))
    .filter((token) => Number.isInteger(token) && token >= 1 && token <= 40)
    .sort((left, right) => right - left);
  return parsed.length > 0 ? parsed : [...fallback];
}

const DEFAULT_VARIANT_KEYS = Object.freeze([
  'legacy',
  'full',
  ...MOVE_ORDERING_REGRESSION_FEATURE_KEYS.map((featureKey) => `no-${featureKey}`),
]);

function parseVariantList(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [...DEFAULT_VARIANT_KEYS];
  }
  const parsed = value.split(',').map((token) => token.trim()).filter(Boolean);
  return parsed.length > 0 ? [...new Set(parsed)] : [...DEFAULT_VARIANT_KEYS];
}

function createSearchOptions({ evaluationProfile, moveOrderingProfile, timeLimitMs, maxDepth, exactEndgameEmpties }) {
  return {
    presetKey: 'custom',
    styleKey: 'balanced',
    maxDepth,
    timeLimitMs,
    exactEndgameEmpties,
    aspirationWindow: 40,
    randomness: 0,
    evaluationProfile,
    moveOrderingProfile,
    wldPreExactEmpties: 0,
  };
}

function createAggregate() {
  return {
    cases: 0,
    nodes: 0,
    elapsedMs: 0,
    ttHits: 0,
    bestMoveKeys: [],
  };
}

function updateAggregate(aggregate, summary, marker) {
  aggregate.cases += 1;
  aggregate.nodes += Number(summary.nodes ?? 0);
  aggregate.elapsedMs += Number(summary.elapsedMs ?? 0);
  aggregate.ttHits += Number(summary.ttHits ?? 0);
  aggregate.bestMoveKeys.push(marker);
}

function percentageDelta(base, candidate) {
  if (!Number.isFinite(base) || base === 0 || !Number.isFinite(candidate)) {
    return null;
  }
  return ((candidate - base) / base) * 100;
}

function finalizeAggregate(aggregate) {
  return {
    cases: aggregate.cases,
    nodes: aggregate.nodes,
    elapsedMs: aggregate.elapsedMs,
    ttHits: aggregate.ttHits,
  };
}

function cloneProfile(profile) {
  return profile ? JSON.parse(JSON.stringify(profile)) : null;
}

function ablateFeature(profile, featureKey) {
  const next = cloneProfile(profile);
  if (!next || !Array.isArray(next.trainedBuckets)) {
    return null;
  }
  for (const bucket of next.trainedBuckets) {
    if (!bucket.weights || !Object.hasOwn(bucket.weights, featureKey)) {
      continue;
    }
    bucket.weights[featureKey] = 0;
  }
  next.name = `${profile?.name ?? 'trained-move-ordering'}__no-${featureKey}`;
  next.description = `${profile?.description ?? 'late move-ordering profile'} (feature ${featureKey} ablated for search-cost audit)`;
  return next;
}

function variantFromKey(key, baseProfile) {
  if (key === 'legacy') {
    return {
      key,
      label: 'legacy',
      profile: null,
      featureAblation: null,
    };
  }
  if (key === 'full') {
    return {
      key,
      label: baseProfile?.name ?? 'full',
      profile: cloneProfile(baseProfile),
      featureAblation: null,
    };
  }
  if (!key.startsWith('no-')) {
    throw new Error(`알 수 없는 variant: ${key}`);
  }
  const featureKey = key.slice(3);
  if (!MOVE_ORDERING_REGRESSION_FEATURE_KEYS.includes(featureKey)) {
    throw new Error(`지원하지 않는 move-ordering feature ablation: ${featureKey}`);
  }
  return {
    key,
    label: `no-${featureKey}`,
    profile: ablateFeature(baseProfile, featureKey),
    featureAblation: featureKey,
  };
}

function findVariantResult(results, key) {
  return results.find((entry) => entry.key === key) ?? null;
}

function formatRatio(base, candidate) {
  if (!Number.isFinite(base) || base === 0 || !Number.isFinite(candidate)) {
    return 'n/a';
  }
  return `${((candidate / base) * 100).toFixed(1)}%`;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const evaluationProfilePath = args['evaluation-profile'] ? resolveCliPath(args['evaluation-profile']) : null;
const moveOrderingProfilePath = args['move-ordering-profile'] ? resolveCliPath(args['move-ordering-profile']) : null;
const evaluationProfile = loadJsonFileIfPresent(evaluationProfilePath) ?? DEFAULT_EVALUATION_PROFILE;
const moveOrderingProfile = loadJsonFileIfPresent(moveOrderingProfilePath);
if (!moveOrderingProfile) {
  throw new Error('move-ordering profile JSON이 필요합니다.');
}

const variantKeys = parseVariantList(args.variants);
const variants = variantKeys.map((key) => variantFromKey(key, moveOrderingProfile));
const depthEmptiesList = parseEmptiesList(args['depth-empties'], [18, 17, 16, 15]);
const exactEmptiesList = parseEmptiesList(args['exact-empties'], [14, 13, 12, 11, 10]);
const seedStart = Math.max(1, toFiniteInteger(args['seed-start'], 1));
const seedCount = Math.max(1, toFiniteInteger(args['seed-count'], 6));
const repetitions = Math.max(1, toFiniteInteger(args.repetitions, 1));
const depthTimeLimitMs = Math.max(50, toFiniteInteger(args['time-limit-ms'], 2000));
const depthMaxDepth = Math.max(1, toFiniteInteger(args['max-depth'], 6));
const depthExactEndgameEmpties = Math.max(0, toFiniteInteger(args['depth-exact-endgame-empties'], 10));
const exactTimeLimitMs = Math.max(1000, toFiniteInteger(args['exact-time-limit-ms'], 60000));
const exactMaxDepth = Math.max(1, toFiniteInteger(args['exact-max-depth'], 16));
const exactEndgameEmpties = Math.max(0, toFiniteInteger(args['exact-endgame-empties'], 14));
const outputJsonPath = args['output-json'] ? resolveCliPath(args['output-json']) : null;

const suites = [
  {
    key: 'depth',
    emptiesList: depthEmptiesList,
    options: {
      timeLimitMs: depthTimeLimitMs,
      maxDepth: depthMaxDepth,
      exactEndgameEmpties: depthExactEndgameEmpties,
    },
  },
  {
    key: 'exact',
    emptiesList: exactEmptiesList,
    options: {
      timeLimitMs: exactTimeLimitMs,
      maxDepth: exactMaxDepth,
      exactEndgameEmpties,
    },
  },
];

const results = variants.map((variant) => ({
  key: variant.key,
  label: variant.label,
  profileName: variant.profile?.name ?? null,
  featureAblation: variant.featureAblation,
  suites: {},
  cases: [],
}));

console.log(`Evaluation profile : ${evaluationProfile.name ?? 'default-eval'}`);
console.log(`Move-ordering base : ${moveOrderingProfile.name ?? path.basename(moveOrderingProfilePath ?? 'move-ordering.json')}`);
console.log(`Variants           : ${variants.map((variant) => variant.key).join(', ')}`);
console.log(`Seeds              : ${seedStart}..${seedStart + seedCount - 1} | repetitions=${repetitions}`);
console.log(`Depth suite        : empties=${depthEmptiesList.join(', ')} depth=${depthMaxDepth} exact=${depthExactEndgameEmpties}`);
console.log(`Exact suite        : empties=${exactEmptiesList.join(', ')} depth=${exactMaxDepth} exact=${exactEndgameEmpties}`);

for (const suite of suites) {
  console.log(`\n[${suite.key}]`);
  for (const result of results) {
    result.suites[suite.key] = {
      byEmpties: [],
      overall: createAggregate(),
    };
  }

  for (const empties of suite.emptiesList) {
    console.log(`  empties ${empties}`);
    const bucketAggregates = new Map(results.map((result) => [result.key, createAggregate()]));

    for (let seed = seedStart; seed < (seedStart + seedCount); seed += 1) {
      const state = playSeededRandomUntilEmptyCount(empties, seed);
      for (const [variantIndex, variant] of variants.entries()) {
        const result = results[variantIndex];
        const summary = runMedianSearch(
          state,
          createSearchOptions({
            evaluationProfile,
            moveOrderingProfile: variant.profile,
            ...suite.options,
          }),
          repetitions,
        ).summary;
        const caseMarker = `${empties}:${seed}:${summary.bestMove ?? 'pass'}`;
        updateAggregate(bucketAggregates.get(result.key), summary, caseMarker);
        updateAggregate(result.suites[suite.key].overall, summary, caseMarker);
        result.cases.push({ suite: suite.key, empties, seed, summary });
      }
    }

    for (const result of results) {
      result.suites[suite.key].byEmpties.push({
        empties,
        ...finalizeAggregate(bucketAggregates.get(result.key)),
      });
    }
  }

  const legacy = findVariantResult(results, 'legacy');
  const full = findVariantResult(results, 'full');
  for (const result of results) {
    const suiteSummary = result.suites[suite.key].overall;
    result.suites[suite.key].overall = {
      ...finalizeAggregate(suiteSummary),
      nodeDeltaVsLegacyPercent: legacy ? percentageDelta(legacy.suites[suite.key].overall.nodes, suiteSummary.nodes) : null,
      elapsedDeltaVsLegacyPercent: legacy ? percentageDelta(legacy.suites[suite.key].overall.elapsedMs, suiteSummary.elapsedMs) : null,
      nodeDeltaVsFullPercent: full ? percentageDelta(full.suites[suite.key].overall.nodes, suiteSummary.nodes) : null,
      elapsedDeltaVsFullPercent: full ? percentageDelta(full.suites[suite.key].overall.elapsedMs, suiteSummary.elapsedMs) : null,
    };
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  evaluationProfileName: evaluationProfile.name ?? null,
  moveOrderingProfileName: moveOrderingProfile.name ?? null,
  options: {
    variants: variants.map((variant) => variant.key),
    seedStart,
    seedCount,
    repetitions,
    suites: suites.map((suite) => ({ key: suite.key, emptiesList: suite.emptiesList, options: suite.options })),
  },
  variants: results,
};

for (const suite of suites) {
  const legacy = findVariantResult(results, 'legacy');
  const full = findVariantResult(results, 'full');
  console.log(`\n  ${suite.key} overall:`);
  for (const result of results) {
    const suiteSummary = result.suites[suite.key].overall;
    const nodes = formatInteger(suiteSummary.nodes);
    const elapsed = formatInteger(suiteSummary.elapsedMs);
    const vsLegacy = legacy ? formatRatio(legacy.suites[suite.key].overall.nodes, suiteSummary.nodes) : 'n/a';
    const vsFull = full ? formatRatio(full.suites[suite.key].overall.nodes, suiteSummary.nodes) : 'n/a';
    console.log(`    ${result.key.padEnd(20)} nodes=${nodes.padStart(8)} time=${elapsed.padStart(6)}ms vsLegacy=${vsLegacy.padStart(6)} vsFull=${vsFull.padStart(6)}`);
  }
}

if (outputJsonPath) {
  await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
  await fs.promises.writeFile(outputJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(`\nSaved audit summary to ${outputJsonPath}`);
}
