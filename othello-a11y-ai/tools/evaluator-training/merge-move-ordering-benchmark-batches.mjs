#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  displayProjectPath,
  displayTrainingToolPath,
  ensureArray,
  parseArgs,
  resolveCliPath,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('merge-move-ordering-benchmark-batches.mjs');
  const defaultOutputJsonPath = displayProjectPath('benchmarks', 'stage38_merged_move_ordering_benchmark.json');
  console.log(`Usage:
  node ${toolPath} \
    --input-json benchmarks/batch1.json \
    --input-json benchmarks/batch2.json \
    [--kind auto|benchmark-set|audit] \
    [--output-json ${defaultOutputJsonPath}]

설명:
- move-ordering benchmark batch JSON 여러 개를 병합합니다.
- seed 범위를 나눠 돌린 batch, profile subset을 나눠 돌린 batch 둘 다 지원합니다.
- duplicate case(suite/empties/seed)가 동일 summary이면 1회만 유지하고, 내용이 다르면 에러를 냅니다.
- benchmark-move-ordering-profile-set.mjs 출력(profiles)과 audit-move-ordering-search-cost.mjs 출력(variants)을 모두 지원합니다.
`);
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function detectKind(parsed, explicitKind = 'auto') {
  if (explicitKind && explicitKind !== 'auto') {
    return explicitKind;
  }
  if (Array.isArray(parsed?.profiles)) {
    return 'benchmark-set';
  }
  if (Array.isArray(parsed?.variants)) {
    return 'audit';
  }
  throw new Error('알 수 없는 benchmark batch 형식입니다. profiles 또는 variants 배열이 필요합니다.');
}

function collectionKeyForKind(kind) {
  if (kind === 'benchmark-set') {
    return 'profiles';
  }
  if (kind === 'audit') {
    return 'variants';
  }
  throw new Error(`지원하지 않는 kind입니다: ${kind}`);
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
  aggregate.nodes += Number(summary?.nodes ?? 0);
  aggregate.elapsedMs += Number(summary?.elapsedMs ?? 0);
  aggregate.ttHits += Number(summary?.ttHits ?? 0);
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

function compareCases(left, right) {
  const suiteOrder = new Map([
    ['depth', 0],
    ['exact', 1],
  ]);
  const suiteDiff = (suiteOrder.get(left.suite) ?? 99) - (suiteOrder.get(right.suite) ?? 99);
  if (suiteDiff !== 0) {
    return suiteDiff;
  }
  const emptiesDiff = Number(right.empties ?? 0) - Number(left.empties ?? 0);
  if (emptiesDiff !== 0) {
    return emptiesDiff;
  }
  return Number(left.seed ?? 0) - Number(right.seed ?? 0);
}

function caseIdentityKey(entryCase) {
  return `${entryCase?.suite ?? 'unknown'}|${entryCase?.empties ?? 'unknown'}|${entryCase?.seed ?? 'unknown'}`;
}

function caseSummaryFingerprint(entryCase) {
  return JSON.stringify(entryCase?.summary ?? null);
}

function suiteSpecMapFromOptions(options) {
  const map = new Map();
  for (const suite of Array.isArray(options?.suites) ? options.suites : []) {
    map.set(suite.key, suite);
  }
  return map;
}

function mergeSuiteSpecs(firstOptions, allEntries) {
  const fromOptions = suiteSpecMapFromOptions(firstOptions);
  const discovered = new Map();
  for (const entry of allEntries) {
    for (const caseEntry of entry.cases) {
      const key = caseEntry.suite;
      if (!discovered.has(key)) {
        discovered.set(key, new Set());
      }
      discovered.get(key).add(Number(caseEntry.empties));
    }
  }

  const orderedSuiteKeys = [];
  for (const suite of Array.isArray(firstOptions?.suites) ? firstOptions.suites : []) {
    orderedSuiteKeys.push(suite.key);
  }
  for (const suiteKey of discovered.keys()) {
    if (!orderedSuiteKeys.includes(suiteKey)) {
      orderedSuiteKeys.push(suiteKey);
    }
  }

  return orderedSuiteKeys.map((suiteKey) => {
    const fromOption = fromOptions.get(suiteKey) ?? null;
    const emptiesList = Array.from(discovered.get(suiteKey) ?? []).sort((left, right) => right - left);
    return {
      key: suiteKey,
      emptiesList: fromOption?.emptiesList ?? emptiesList,
      ...(fromOption?.options ? { options: fromOption.options } : {}),
    };
  });
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h || !args['input-json']) {
  printUsage();
  process.exit(args.help || args.h ? 0 : 1);
}

const inputJsonPaths = ensureArray(args['input-json']).map((raw) => resolveCliPath(raw));
const parsedInputs = inputJsonPaths.map((inputPath) => ({
  inputPath,
  parsed: loadJson(inputPath),
}));
const kind = detectKind(parsedInputs[0]?.parsed, args.kind ?? 'auto');
const collectionKey = collectionKeyForKind(kind);

for (const { parsed, inputPath } of parsedInputs) {
  const detected = detectKind(parsed, kind);
  if (detected !== kind) {
    throw new Error(`batch 형식이 섞여 있습니다: ${inputPath}`);
  }
}

const firstParsed = parsedInputs[0].parsed;
const orderedKeys = [];
const mergedEntries = new Map();
const allSeedValues = new Set();

for (const { parsed, inputPath } of parsedInputs) {
  const collection = parsed[collectionKey] ?? [];
  for (const sourceEntry of collection) {
    const key = String(sourceEntry?.key ?? '').trim();
    if (!key) {
      throw new Error(`key가 비어 있는 entry를 찾았습니다: ${inputPath}`);
    }

    if (!mergedEntries.has(key)) {
      orderedKeys.push(key);
      mergedEntries.set(key, {
        key,
        label: sourceEntry.label ?? key,
        profileName: sourceEntry.profileName ?? null,
        ...(Object.hasOwn(sourceEntry, 'inputPath') ? { inputPath: sourceEntry.inputPath ?? null } : {}),
        ...(Object.hasOwn(sourceEntry, 'featureAblation') ? { featureAblation: sourceEntry.featureAblation ?? null } : {}),
        cases: [],
        suites: {},
        _caseMap: new Map(),
      });
    }

    const target = mergedEntries.get(key);
    for (const caseEntry of Array.isArray(sourceEntry?.cases) ? sourceEntry.cases : []) {
      const caseKey = caseIdentityKey(caseEntry);
      const fingerprint = caseSummaryFingerprint(caseEntry);
      if (target._caseMap.has(caseKey)) {
        const existing = target._caseMap.get(caseKey);
        if (existing !== fingerprint) {
          throw new Error(`중복 case 충돌: profile=${key} case=${caseKey}`);
        }
        continue;
      }
      target._caseMap.set(caseKey, fingerprint);
      target.cases.push(caseEntry);
      if (Number.isInteger(caseEntry?.seed)) {
        allSeedValues.add(caseEntry.seed);
      }
    }
  }
}

const entries = orderedKeys.map((key) => mergedEntries.get(key));
for (const entry of entries) {
  entry.cases.sort(compareCases);
}

const suiteSpecs = mergeSuiteSpecs(firstParsed.options, entries);
const suiteSpecMap = new Map(suiteSpecs.map((suite) => [suite.key, suite]));

for (const entry of entries) {
  const suites = {};
  for (const suiteSpec of suiteSpecs) {
    const emptiesToAggregate = new Map();
    for (const empties of suiteSpec.emptiesList ?? []) {
      emptiesToAggregate.set(empties, createAggregate());
    }
    const overall = createAggregate();

    for (const caseEntry of entry.cases) {
      if (caseEntry.suite !== suiteSpec.key) {
        continue;
      }
      const empties = Number(caseEntry.empties);
      if (!emptiesToAggregate.has(empties)) {
        emptiesToAggregate.set(empties, createAggregate());
      }
      updateAggregate(emptiesToAggregate.get(empties), caseEntry.summary ?? {});
      updateAggregate(overall, caseEntry.summary ?? {});
    }

    const byEmpties = Array.from(emptiesToAggregate.entries())
      .sort((left, right) => right[0] - left[0])
      .map(([empties, aggregate]) => ({
        empties,
        ...finalizeAggregate(aggregate),
      }));

    suites[suiteSpec.key] = {
      byEmpties,
      overall: finalizeAggregate(overall),
    };
  }
  entry.suites = suites;
  delete entry._caseMap;
}

const legacy = entries.find((entry) => entry.key === 'legacy') ?? null;
const full = entries.find((entry) => entry.key === 'full') ?? null;
for (const entry of entries) {
  for (const suiteSpec of suiteSpecs) {
    const suite = entry.suites[suiteSpec.key];
    suite.overall = {
      ...suite.overall,
      nodeDeltaVsLegacyPercent: legacy ? percentageDelta(legacy.suites[suiteSpec.key].overall.nodes, suite.overall.nodes) : null,
      elapsedDeltaVsLegacyPercent: legacy ? percentageDelta(legacy.suites[suiteSpec.key].overall.elapsedMs, suite.overall.elapsedMs) : null,
      nodeDeltaVsFullPercent: full ? percentageDelta(full.suites[suiteSpec.key].overall.nodes, suite.overall.nodes) : null,
      elapsedDeltaVsFullPercent: full ? percentageDelta(full.suites[suiteSpec.key].overall.elapsedMs, suite.overall.elapsedMs) : null,
    };
  }
}

const seedValues = Array.from(allSeedValues).sort((left, right) => left - right);
const merged = {
  generatedAt: new Date().toISOString(),
  mergedFrom: inputJsonPaths,
  evaluationProfileName: firstParsed.evaluationProfileName ?? firstParsed.baselineEvaluationProfileName ?? null,
  ...(firstParsed.moveOrderingProfileName ? { moveOrderingProfileName: firstParsed.moveOrderingProfileName } : {}),
  options: {
    ...firstParsed.options,
    seedStart: seedValues.length > 0 ? seedValues[0] : firstParsed.options?.seedStart ?? null,
    seedCount: seedValues.length > 0 ? seedValues.length : firstParsed.options?.seedCount ?? null,
    suites: suiteSpecs,
  },
  [collectionKey]: entries,
};

const outputJsonPath = args['output-json']
  ? resolveCliPath(args['output-json'])
  : resolveCliPath(path.join('benchmarks', kind === 'audit'
    ? 'stage38_merged_move_ordering_audit.json'
    : 'stage38_merged_move_ordering_profile_set.json'));

await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
await fs.promises.writeFile(outputJsonPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');

console.log(`Merged ${inputJsonPaths.length} batch JSON file(s).`);
console.log(`Kind             : ${kind}`);
console.log(`Output           : ${outputJsonPath}`);
console.log(`Entries          : ${entries.length}`);
console.log(`Seed range/count : ${merged.options.seedStart ?? 'n/a'} / ${merged.options.seedCount ?? 'n/a'}`);
