#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_EVALUATION_PROFILE } from '../../js/ai/evaluation-profiles.js';
import {
  playSeededRandomUntilEmptyCount,
  runMedianSearch,
} from '../../js/test/benchmark-helpers.mjs';
import {
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
  const toolPath = displayTrainingToolPath('benchmark-move-ordering-profile-set.mjs');
  const evaluationProfilePath = displayTrainingOutputPath('trained-evaluation-profile.json');
  const moveOrderingProfilePath = displayTrainingOutputPath('trained-move-ordering-profile.json');
  const outputJsonPath = displayProjectPath('benchmarks', 'stage38_move_ordering_profile_set_benchmark.json');
  console.log(`Usage:
  node ${toolPath} \
    [--evaluation-profile ${evaluationProfilePath}] \
    [--output-json ${outputJsonPath}] \
    --profile legacy=null \
    --profile full=${moveOrderingProfilePath} \
    --profile candidateA=path/to/candidateA.json \
    [--depth-empties 19,18,17,16,15] [--exact-empties 14,13,12,11] \
    [--seed-start 1] [--seed-count 8] [--repetitions 1] \
    [--time-limit-ms 1500] [--max-depth 6] [--depth-exact-endgame-empties 10] \
    [--exact-time-limit-ms 4000] [--exact-max-depth 12] [--exact-endgame-empties 14]

설명:
- 여러 move-ordering profile(null=legacy 포함)을 동일한 random root 세트에서 비교합니다.
- profile 문법: <label>=<jsonPath>, legacy/null 끄기는 <label>=null
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
  };
}

function updateAggregate(aggregate, summary) {
  aggregate.cases += 1;
  aggregate.nodes += Number(summary.nodes ?? 0);
  aggregate.elapsedMs += Number(summary.elapsedMs ?? 0);
  aggregate.ttHits += Number(summary.ttHits ?? 0);
}

function finalizeAggregate(aggregate) {
  return {
    cases: aggregate.cases,
    nodes: aggregate.nodes,
    elapsedMs: aggregate.elapsedMs,
    ttHits: aggregate.ttHits,
  };
}

function percentageDelta(base, candidate) {
  if (!Number.isFinite(base) || base === 0 || !Number.isFinite(candidate)) {
    return null;
  }
  return ((candidate - base) / base) * 100;
}

function formatRatio(base, candidate) {
  if (!Number.isFinite(base) || base === 0 || !Number.isFinite(candidate)) {
    return 'n/a';
  }
  return `${((candidate / base) * 100).toFixed(1)}%`;
}

function parseProfileSpec(rawSpec) {
  const spec = String(rawSpec ?? '').trim();
  if (!spec) {
    throw new Error('빈 profile spec은 허용되지 않습니다.');
  }

  const splitIndex = spec.indexOf('=');
  const label = (splitIndex >= 0 ? spec.slice(0, splitIndex) : spec).trim();
  const rawPath = (splitIndex >= 0 ? spec.slice(splitIndex + 1) : '').trim();
  if (!label) {
    throw new Error(`잘못된 profile spec입니다: ${spec}`);
  }

  if (!rawPath || rawPath === 'null' || rawPath === 'legacy') {
    return {
      key: label,
      label,
      profile: null,
      inputPath: null,
    };
  }

  const inputPath = resolveCliPath(rawPath);
  const profile = loadJsonFileIfPresent(inputPath);
  if (!profile) {
    throw new Error(`profile JSON을 읽을 수 없습니다: ${rawPath}`);
  }

  return {
    key: label,
    label,
    profile,
    inputPath,
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h || !args.profile) {
  printUsage();
  process.exit(args.help || args.h ? 0 : 1);
}

const evaluationProfilePath = args['evaluation-profile'] ? resolveCliPath(args['evaluation-profile']) : null;
const evaluationProfile = loadJsonFileIfPresent(evaluationProfilePath) ?? DEFAULT_EVALUATION_PROFILE;
const profiles = ensureArray(args.profile).map(parseProfileSpec);
const profileKeySet = new Set();
for (const profile of profiles) {
  if (profileKeySet.has(profile.key)) {
    throw new Error(`중복 profile label은 허용되지 않습니다: ${profile.key}`);
  }
  profileKeySet.add(profile.key);
}

const depthEmptiesList = parseEmptiesList(args['depth-empties'], [19, 18, 17, 16, 15]);
const exactEmptiesList = parseEmptiesList(args['exact-empties'], [14, 13, 12, 11]);
const seedStart = Math.max(1, toFiniteInteger(args['seed-start'], 1));
const seedCount = Math.max(1, toFiniteInteger(args['seed-count'], 8));
const repetitions = Math.max(1, toFiniteInteger(args.repetitions, 1));
const depthTimeLimitMs = Math.max(50, toFiniteInteger(args['time-limit-ms'], 1500));
const depthMaxDepth = Math.max(1, toFiniteInteger(args['max-depth'], 6));
const depthExactEndgameEmpties = Math.max(0, toFiniteInteger(args['depth-exact-endgame-empties'], 10));
const exactTimeLimitMs = Math.max(1000, toFiniteInteger(args['exact-time-limit-ms'], 4000));
const exactMaxDepth = Math.max(1, toFiniteInteger(args['exact-max-depth'], 12));
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

const results = profiles.map((profile) => ({
  key: profile.key,
  label: profile.label,
  profileName: profile.profile?.name ?? null,
  inputPath: profile.inputPath,
  suites: {},
  cases: [],
}));

console.log(`Evaluation profile : ${evaluationProfile.name ?? 'default-eval'}`);
console.log(`Profiles           : ${profiles.map((profile) => `${profile.label}=${profile.profile?.name ?? 'legacy'}`).join(', ')}`);
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
      for (const [profileIndex, profile] of profiles.entries()) {
        const result = results[profileIndex];
        const summary = runMedianSearch(
          state,
          createSearchOptions({
            evaluationProfile,
            moveOrderingProfile: profile.profile,
            ...suite.options,
          }),
          repetitions,
        ).summary;

        updateAggregate(bucketAggregates.get(result.key), summary);
        updateAggregate(result.suites[suite.key].overall, summary);
        result.cases.push({
          suite: suite.key,
          empties,
          seed,
          summary,
        });
      }
    }

    for (const result of results) {
      result.suites[suite.key].byEmpties.push({
        empties,
        ...finalizeAggregate(bucketAggregates.get(result.key)),
      });
    }
  }

  const legacy = results.find((entry) => entry.key === 'legacy') ?? null;
  const full = results.find((entry) => entry.key === 'full') ?? null;
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
  options: {
    seedStart,
    seedCount,
    repetitions,
    suites: suites.map((suite) => ({ key: suite.key, emptiesList: suite.emptiesList, options: suite.options })),
  },
  profiles: results,
};

for (const suite of suites) {
  const legacy = results.find((entry) => entry.key === 'legacy') ?? null;
  const full = results.find((entry) => entry.key === 'full') ?? null;
  console.log(`\n  ${suite.key} overall:`);
  const sortedByNodes = [...results].sort((left, right) => left.suites[suite.key].overall.nodes - right.suites[suite.key].overall.nodes);
  for (const result of sortedByNodes) {
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
  console.log(`\nSaved benchmark summary to ${outputJsonPath}`);
}
