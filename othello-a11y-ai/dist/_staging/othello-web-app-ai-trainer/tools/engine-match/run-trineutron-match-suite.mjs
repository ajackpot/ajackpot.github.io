#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { parseArgs, resolveCliPath } from '../evaluator-training/lib.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const BENCHMARK_TOOL_PATH = path.resolve(__dirname, 'benchmark-vs-trineutron.mjs');
const BUILTIN_VARIANTS = new Set(['active', 'phase-only', 'legacy']);

const DEFAULT_CONFIG = Object.freeze({
  continueOnError: false,
  defaults: {
    games: 4,
    openingPlies: 20,
    seed: 11,
    ourTimeMs: 100,
    theirTimeMs: 100,
    ourMaxDepth: 6,
    theirMaxDepth: 18,
    exactEndgameEmpties: 10,
    solverAdjudicationEmpties: 14,
    solverAdjudicationTimeMs: 60000,
    solverAdjudicationMaxDepth: 14,
    theirNoiseScale: 4,
    variantSeedMode: 'shared',
  },
  referenceVariantId: 'active-no-mpc',
  variants: [
    {
      id: 'active',
      variant: 'active',
      label: 'active-installed',
    },
    {
      id: 'active-no-mpc',
      type: 'custom',
      label: 'active-generated-without-mpc',
      generatedModule: 'js/ai/learned-eval-profile.generated.js',
      disableMpc: true,
    },
  ],
  scenarios: [
    {
      id: 'fast-diagnostic',
      label: 'fast diagnostic deterministic',
      seed: 11,
      games: 2,
      ourTimeMs: 60,
      theirTimeMs: 60,
      theirNoiseScale: 0,
    },
    {
      id: 'fast-noisy',
      label: 'fast noisy pilot',
      seed: 21,
      games: 4,
      ourTimeMs: 100,
      theirTimeMs: 100,
      theirNoiseScale: 4,
    },
  ],
});

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/run-trineutron-match-suite.mjs \
    [--output-dir tools/engine-match/out/trineutron-match-suite] \
    [--config tools/engine-match/examples/trineutron-match-suite.active-vs-no-mpc.example.json] \
    [--resume] [--continue-on-error] [--plan-only]

설명:
- 여러 match scenario와 variant를 순차 실행하여 benchmark-vs-trineutron 결과를 한 폴더에 모읍니다.
- 기본값은 현재 active 설치본과, 같은 generated module에서 MPC만 끈 custom variant를 비교합니다.
- scenario별 결과 JSON은 output-dir/results/ 밑에 저장되고, 집계 결과는 output-dir/suite-summary.json에 기록됩니다.
- 각 variant는 별도 실행으로 돌려 opening/color/seed 조합을 공유하므로, 상대 엔진 난수까지 최대한 공정하게 맞춘 비교를 만들 수 있습니다.
`);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneJsonValue(entry));
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneJsonValue(entry)]));
  }
  return value;
}

function deepMerge(base, override) {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return cloneJsonValue(override);
  }
  const merged = cloneJsonValue(base);
  for (const [key, value] of Object.entries(override)) {
    if (isPlainObject(value) && isPlainObject(merged[key])) {
      merged[key] = deepMerge(merged[key], value);
      continue;
    }
    merged[key] = cloneJsonValue(value);
  }
  return merged;
}

function slugify(value, fallback = 'item') {
  const normalized = String(value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || fallback;
}

function stableJsonStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJsonStringify(entry)).join(',')}]`;
  }
  if (!isPlainObject(value)) {
    return JSON.stringify(value);
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableJsonStringify(value[key])}`).join(',')}}`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function toAggregateSkeleton() {
  return {
    games: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    points: 0,
    discDiff: 0,
    totalPlayedPly: 0,
    totalOurTimeMs: 0,
    totalTheirTimeMs: 0,
    totalOurNodes: 0,
    totalTheirNodes: 0,
    exactAdjudications: 0,
    exactAdjudicationTimeMs: 0,
    exactAdjudicationNodes: 0,
  };
}

function absorbAggregate(target, aggregate) {
  target.games += Number(aggregate.games ?? 0);
  target.wins += Number(aggregate.wins ?? 0);
  target.losses += Number(aggregate.losses ?? 0);
  target.draws += Number(aggregate.draws ?? 0);
  target.points += Number(aggregate.points ?? 0);
  target.discDiff += Number(aggregate.discDiff ?? 0);
  target.totalPlayedPly += Number(aggregate.totalPlayedPly ?? 0);
  target.totalOurTimeMs += Number(aggregate.totalOurTimeMs ?? 0);
  target.totalTheirTimeMs += Number(aggregate.totalTheirTimeMs ?? 0);
  target.totalOurNodes += Number(aggregate.totalOurNodes ?? 0);
  target.totalTheirNodes += Number(aggregate.totalTheirNodes ?? 0);
  target.exactAdjudications += Number(aggregate.exactAdjudications ?? 0);
  target.exactAdjudicationTimeMs += Number(aggregate.exactAdjudicationTimeMs ?? 0);
  target.exactAdjudicationNodes += Number(aggregate.exactAdjudicationNodes ?? 0);
  return target;
}

function finalizeAggregate(aggregate) {
  return {
    ...aggregate,
    scoreRate: aggregate.games > 0 ? aggregate.points / aggregate.games : 0,
    averageDiscDiff: aggregate.games > 0 ? aggregate.discDiff / aggregate.games : 0,
    averagePlayedPly: aggregate.games > 0 ? aggregate.totalPlayedPly / aggregate.games : 0,
    averageOurTimeMsPerGame: aggregate.games > 0 ? aggregate.totalOurTimeMs / aggregate.games : 0,
    averageTheirTimeMsPerGame: aggregate.games > 0 ? aggregate.totalTheirTimeMs / aggregate.games : 0,
    averageOurNodesPerGame: aggregate.games > 0 ? aggregate.totalOurNodes / aggregate.games : 0,
    averageTheirNodesPerGame: aggregate.games > 0 ? aggregate.totalTheirNodes / aggregate.games : 0,
    averageExactAdjudicationTimeMs: aggregate.exactAdjudications > 0 ? aggregate.exactAdjudicationTimeMs / aggregate.exactAdjudications : 0,
    averageExactAdjudicationNodes: aggregate.exactAdjudications > 0 ? aggregate.exactAdjudicationNodes / aggregate.exactAdjudications : 0,
  };
}

function resolvePathMaybe(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  return resolveCliPath(value);
}

function resolveVariantSpec(rawSpec, index) {
  if (typeof rawSpec === 'string') {
    if (!BUILTIN_VARIANTS.has(rawSpec)) {
      throw new Error(`Unknown builtin variant string: ${rawSpec}`);
    }
    return {
      id: slugify(rawSpec, `variant-${index + 1}`),
      label: rawSpec,
      type: 'builtin',
      variant: rawSpec,
      raw: cloneJsonValue(rawSpec),
    };
  }

  if (!isPlainObject(rawSpec)) {
    throw new TypeError(`Variant #${index + 1} must be a string or object.`);
  }

  const requestedVariant = typeof rawSpec.variant === 'string' ? rawSpec.variant.trim() : '';
  const hasCustomInputs = [
    rawSpec.generatedModule,
    rawSpec.evaluationJson,
    rawSpec.moveOrderingJson,
    rawSpec.tupleJson,
    rawSpec.mpcJson,
  ].some((value) => value !== undefined) || Boolean(rawSpec.disableMoveOrdering || rawSpec.disableTuple || rawSpec.disableMpc);
  const type = rawSpec.type === 'builtin' || rawSpec.type === 'custom'
    ? rawSpec.type
    : (hasCustomInputs ? 'custom' : 'builtin');

  if (type === 'builtin') {
    if (!BUILTIN_VARIANTS.has(requestedVariant)) {
      throw new Error(`Builtin variant #${index + 1} must set variant to one of: active, phase-only, legacy.`);
    }
    return {
      id: slugify(rawSpec.id ?? rawSpec.key ?? requestedVariant, `variant-${index + 1}`),
      label: typeof rawSpec.label === 'string' && rawSpec.label.trim() !== '' ? rawSpec.label.trim() : requestedVariant,
      type,
      variant: requestedVariant,
      raw: cloneJsonValue(rawSpec),
    };
  }

  const label = typeof rawSpec.label === 'string' && rawSpec.label.trim() !== ''
    ? rawSpec.label.trim()
    : (requestedVariant || rawSpec.id || rawSpec.key || `custom-${index + 1}`);
  const id = slugify(rawSpec.id ?? rawSpec.key ?? label, `custom-${index + 1}`);
  return {
    id,
    label,
    type: 'custom',
    variant: 'custom',
    generatedModule: resolvePathMaybe(rawSpec.generatedModule),
    evaluationJson: resolvePathMaybe(rawSpec.evaluationJson),
    moveOrderingJson: resolvePathMaybe(rawSpec.moveOrderingJson),
    tupleJson: resolvePathMaybe(rawSpec.tupleJson),
    mpcJson: resolvePathMaybe(rawSpec.mpcJson),
    disableMoveOrdering: Boolean(rawSpec.disableMoveOrdering),
    disableTuple: Boolean(rawSpec.disableTuple),
    disableMpc: Boolean(rawSpec.disableMpc),
    raw: cloneJsonValue(rawSpec),
  };
}

function resolveScenarioSpec(rawSpec, defaults, index) {
  if (!isPlainObject(rawSpec)) {
    throw new TypeError(`Scenario #${index + 1} must be an object.`);
  }
  const merged = deepMerge(defaults, rawSpec);
  const id = slugify(rawSpec.id ?? rawSpec.key ?? rawSpec.label ?? `scenario-${index + 1}`, `scenario-${index + 1}`);
  const label = typeof rawSpec.label === 'string' && rawSpec.label.trim() !== ''
    ? rawSpec.label.trim()
    : id;
  return {
    id,
    label,
    games: Number(merged.games ?? defaults.games),
    openingPlies: Number(merged.openingPlies ?? defaults.openingPlies),
    seed: Number(merged.seed ?? defaults.seed),
    ourTimeMs: Number(merged.ourTimeMs ?? defaults.ourTimeMs),
    theirTimeMs: Number(merged.theirTimeMs ?? defaults.theirTimeMs),
    ourMaxDepth: Number(merged.ourMaxDepth ?? defaults.ourMaxDepth),
    theirMaxDepth: Number(merged.theirMaxDepth ?? defaults.theirMaxDepth),
    exactEndgameEmpties: Number(merged.exactEndgameEmpties ?? defaults.exactEndgameEmpties),
    solverAdjudicationEmpties: Number(merged.solverAdjudicationEmpties ?? defaults.solverAdjudicationEmpties),
    solverAdjudicationTimeMs: Number(merged.solverAdjudicationTimeMs ?? defaults.solverAdjudicationTimeMs),
    solverAdjudicationMaxDepth: Number(merged.solverAdjudicationMaxDepth ?? defaults.solverAdjudicationMaxDepth),
    theirNoiseScale: Number(merged.theirNoiseScale ?? defaults.theirNoiseScale),
    variantSeedMode: merged.variantSeedMode === 'per-variant' ? 'per-variant' : 'shared',
    raw: cloneJsonValue(rawSpec),
  };
}

function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function relativeToProject(filePath) {
  return path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
}

async function runNodeScript(args, { cwd }) {
  return await new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });
    child.on('close', (code) => resolve({ code: Number(code ?? 0), stdout, stderr }));
  });
}

function buildBenchmarkCommand(variant, scenario, outputJsonPath) {
  const args = [
    BENCHMARK_TOOL_PATH,
    '--variants', variant.variant,
    '--games', String(scenario.games),
    '--opening-plies', String(scenario.openingPlies),
    '--seed', String(scenario.seed),
    '--our-time-ms', String(scenario.ourTimeMs),
    '--their-time-ms', String(scenario.theirTimeMs),
    '--our-max-depth', String(scenario.ourMaxDepth),
    '--their-max-depth', String(scenario.theirMaxDepth),
    '--exact-endgame-empties', String(scenario.exactEndgameEmpties),
    '--solver-adjudication-empties', String(scenario.solverAdjudicationEmpties),
    '--solver-adjudication-time-ms', String(scenario.solverAdjudicationTimeMs),
    '--solver-adjudication-max-depth', String(scenario.solverAdjudicationMaxDepth),
    '--their-noise-scale', String(scenario.theirNoiseScale),
    '--variant-seed-mode', scenario.variantSeedMode,
    '--output-json', outputJsonPath,
  ];

  if (variant.type === 'custom') {
    args.push('--variant-label', variant.label);
    if (variant.generatedModule) {
      args.push('--generated-module', variant.generatedModule);
    }
    if (variant.evaluationJson) {
      args.push('--evaluation-json', variant.evaluationJson);
    }
    if (variant.moveOrderingJson) {
      args.push('--move-ordering-json', variant.moveOrderingJson);
    }
    if (variant.tupleJson) {
      args.push('--tuple-json', variant.tupleJson);
    }
    if (variant.mpcJson) {
      args.push('--mpc-json', variant.mpcJson);
    }
    if (variant.disableMoveOrdering) {
      args.push('--disable-move-ordering');
    }
    if (variant.disableTuple) {
      args.push('--disable-tuple');
    }
    if (variant.disableMpc) {
      args.push('--disable-mpc');
    }
  }

  return args;
}

function normalizeRunSummary(runOutput, entry) {
  const variantSummary = Array.isArray(runOutput?.variants) ? runOutput.variants[0] : null;
  if (!variantSummary) {
    throw new Error(`Benchmark output for ${entry.runKey} did not contain a variant summary.`);
  }
  return {
    runKey: entry.runKey,
    scenarioId: entry.scenario.id,
    scenarioLabel: entry.scenario.label,
    variantId: entry.variant.id,
    variantLabel: entry.variant.label,
    variantType: entry.variant.type,
    outputJsonPath: relativeToProject(entry.outputJsonPath),
    aggregate: variantSummary.aggregate,
    byColor: variantSummary.byColor,
    customVariant: runOutput.customVariant ?? null,
    options: runOutput.options ?? null,
  };
}

function buildComparisons(referenceVariantId, aggregateByVariant) {
  const reference = aggregateByVariant[referenceVariantId] ?? null;
  const deltas = [];
  for (const [variantId, aggregate] of Object.entries(aggregateByVariant)) {
    deltas.push({
      variantId,
      scoreRate: aggregate.scoreRate,
      scoreRateDelta: reference ? aggregate.scoreRate - reference.scoreRate : null,
      averageDiscDiff: aggregate.averageDiscDiff,
      averageDiscDiffDelta: reference ? aggregate.averageDiscDiff - reference.averageDiscDiff : null,
      averageOurTimeMsPerGame: aggregate.averageOurTimeMsPerGame,
      averageOurTimeMsPerGameDelta: reference ? aggregate.averageOurTimeMsPerGame - reference.averageOurTimeMsPerGame : null,
      averageOurNodesPerGame: aggregate.averageOurNodesPerGame,
      averageOurNodesPerGameDelta: reference ? aggregate.averageOurNodesPerGame - reference.averageOurNodesPerGame : null,
      games: aggregate.games,
      points: aggregate.points,
    });
  }
  deltas.sort((left, right) => {
    if (right.scoreRate !== left.scoreRate) {
      return right.scoreRate - left.scoreRate;
    }
    return right.averageDiscDiff - left.averageDiscDiff;
  });
  return {
    referenceVariantId,
    deltas,
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const outputDir = args['output-dir']
  ? resolveCliPath(args['output-dir'])
  : path.resolve(PROJECT_ROOT, 'tools', 'engine-match', 'out', 'trineutron-match-suite');
const configPath = args.config ? resolveCliPath(args.config) : null;
const resume = Boolean(args.resume);
const planOnly = Boolean(args['plan-only']);
const cliContinueOnError = Boolean(args['continue-on-error']);

const loadedConfig = configPath ? readJsonIfExists(configPath, null) : null;
if (configPath && !loadedConfig) {
  throw new Error(`Config JSON not found or invalid: ${configPath}`);
}
const config = loadedConfig ? deepMerge(DEFAULT_CONFIG, loadedConfig) : cloneJsonValue(DEFAULT_CONFIG);
const continueOnError = cliContinueOnError || Boolean(config.continueOnError);
const variants = (Array.isArray(config.variants) ? config.variants : DEFAULT_CONFIG.variants).map((entry, index) => resolveVariantSpec(entry, index));
const scenarios = (Array.isArray(config.scenarios) ? config.scenarios : DEFAULT_CONFIG.scenarios).map((entry, index) => resolveScenarioSpec(entry, config.defaults ?? DEFAULT_CONFIG.defaults, index));
const referenceVariantId = typeof config.referenceVariantId === 'string' && config.referenceVariantId.trim() !== ''
  ? slugify(config.referenceVariantId)
  : variants[0]?.id ?? null;

const plan = [];
for (const scenario of scenarios) {
  for (const variant of variants) {
    const outputJsonPath = path.resolve(outputDir, 'results', scenario.id, `${variant.id}.json`);
    const runKey = `${scenario.id}::${variant.id}`;
    const signature = sha256(stableJsonStringify({
      scenario,
      variant,
      benchmarkTool: relativeToProject(BENCHMARK_TOOL_PATH),
      version: 1,
    }));
    plan.push({ scenario, variant, outputJsonPath, runKey, signature });
  }
}

const statusPath = path.resolve(outputDir, 'suite-status.json');
const existingStatus = readJsonIfExists(statusPath, {
  generatedAt: null,
  configPath: configPath ? relativeToProject(configPath) : null,
  runs: {},
});
const status = {
  generatedAt: existingStatus.generatedAt ?? new Date().toISOString(),
  configPath: configPath ? relativeToProject(configPath) : null,
  runs: isPlainObject(existingStatus.runs) ? existingStatus.runs : {},
};

console.log(`Output directory    : ${outputDir}`);
console.log(`Benchmark tool      : ${relativeToProject(BENCHMARK_TOOL_PATH)}`);
console.log(`Config              : ${configPath ? relativeToProject(configPath) : '(built-in defaults)'}`);
console.log(`Variants            : ${variants.map((entry) => `${entry.id}=${entry.label}`).join(', ')}`);
console.log(`Scenarios           : ${scenarios.map((entry) => `${entry.id}(games=${entry.games}, seed=${entry.seed})`).join(', ')}`);
console.log(`Reference variant   : ${referenceVariantId ?? '(none)'}`);
console.log(`Planned runs        : ${plan.length}`);
console.log(`Resume              : ${resume ? 'yes' : 'no'}`);
console.log(`Continue on error   : ${continueOnError ? 'yes' : 'no'}`);

if (planOnly) {
  console.log('\nPlan only; no benchmark processes were started.');
  process.exit(0);
}

const runSummaries = [];
let successCount = 0;
let failureCount = 0;
let skippedCount = 0;

for (const entry of plan) {
  const prior = status.runs[entry.runKey] ?? null;
  const canResume = resume
    && prior
    && prior.signature === entry.signature
    && typeof prior.outputJsonPath === 'string'
    && fs.existsSync(path.resolve(PROJECT_ROOT, prior.outputJsonPath));

  console.log(`\n[${entry.runKey}] ${entry.variant.label} @ ${entry.scenario.label}`);
  if (canResume) {
    const resumedOutputPath = path.resolve(PROJECT_ROOT, prior.outputJsonPath);
    const parsed = readJsonIfExists(resumedOutputPath, null);
    if (parsed) {
      runSummaries.push(normalizeRunSummary(parsed, entry));
      skippedCount += 1;
      console.log(`resume hit          : ${prior.outputJsonPath}`);
      continue;
    }
  }

  const benchmarkArgs = buildBenchmarkCommand(entry.variant, entry.scenario, entry.outputJsonPath);
  const result = await runNodeScript(benchmarkArgs, { cwd: PROJECT_ROOT });
  const relativeOutputPath = relativeToProject(entry.outputJsonPath);

  if (result.code !== 0) {
    failureCount += 1;
    status.runs[entry.runKey] = {
      status: 'failure',
      signature: entry.signature,
      outputJsonPath: relativeOutputPath,
      exitCode: result.code,
      finishedAt: new Date().toISOString(),
    };
    writeJson(statusPath, status);
    if (!continueOnError) {
      throw new Error(`Run failed for ${entry.runKey} (exit ${result.code}).`);
    }
    continue;
  }

  const parsed = readJsonIfExists(entry.outputJsonPath, null);
  if (!parsed) {
    failureCount += 1;
    status.runs[entry.runKey] = {
      status: 'failure',
      signature: entry.signature,
      outputJsonPath: relativeOutputPath,
      exitCode: 0,
      finishedAt: new Date().toISOString(),
      error: 'benchmark-json-missing',
    };
    writeJson(statusPath, status);
    if (!continueOnError) {
      throw new Error(`Run succeeded but output JSON was missing for ${entry.runKey}.`);
    }
    continue;
  }

  const normalized = normalizeRunSummary(parsed, entry);
  runSummaries.push(normalized);
  successCount += 1;
  status.runs[entry.runKey] = {
    status: 'success',
    signature: entry.signature,
    outputJsonPath: relativeOutputPath,
    exitCode: 0,
    finishedAt: new Date().toISOString(),
    aggregate: normalized.aggregate,
  };
  writeJson(statusPath, status);
}

const resultsByScenario = {};
const aggregateByVariantRaw = {};
for (const scenario of scenarios) {
  resultsByScenario[scenario.id] = {
    scenarioId: scenario.id,
    scenarioLabel: scenario.label,
    settings: {
      games: scenario.games,
      openingPlies: scenario.openingPlies,
      seed: scenario.seed,
      ourTimeMs: scenario.ourTimeMs,
      theirTimeMs: scenario.theirTimeMs,
      ourMaxDepth: scenario.ourMaxDepth,
      theirMaxDepth: scenario.theirMaxDepth,
      exactEndgameEmpties: scenario.exactEndgameEmpties,
      solverAdjudicationEmpties: scenario.solverAdjudicationEmpties,
      solverAdjudicationTimeMs: scenario.solverAdjudicationTimeMs,
      solverAdjudicationMaxDepth: scenario.solverAdjudicationMaxDepth,
      theirNoiseScale: scenario.theirNoiseScale,
      variantSeedMode: scenario.variantSeedMode,
    },
    variants: [],
  };
}
for (const variant of variants) {
  aggregateByVariantRaw[variant.id] = toAggregateSkeleton();
}

for (const summary of runSummaries) {
  resultsByScenario[summary.scenarioId]?.variants.push(summary);
  if (!aggregateByVariantRaw[summary.variantId]) {
    aggregateByVariantRaw[summary.variantId] = toAggregateSkeleton();
  }
  absorbAggregate(aggregateByVariantRaw[summary.variantId], summary.aggregate);
}

const aggregateByVariant = Object.fromEntries(
  Object.entries(aggregateByVariantRaw).map(([variantId, aggregate]) => [variantId, finalizeAggregate(aggregate)]),
);

for (const scenario of Object.values(resultsByScenario)) {
  scenario.variants.sort((left, right) => left.variantId.localeCompare(right.variantId));
}

const suiteSummary = {
  generatedAt: new Date().toISOString(),
  suite: 'stage76-trineutron-match-validation-suite',
  benchmarkToolPath: relativeToProject(BENCHMARK_TOOL_PATH),
  configPath: configPath ? relativeToProject(configPath) : null,
  referenceVariantId,
  successCount,
  failureCount,
  skippedCount,
  runCount: plan.length,
  variants,
  scenarios,
  resultsByScenario: Object.values(resultsByScenario),
  aggregateByVariant,
  comparisons: buildComparisons(referenceVariantId, aggregateByVariant),
};

const summaryPath = path.resolve(outputDir, 'suite-summary.json');
writeJson(summaryPath, suiteSummary);
writeJson(statusPath, status);

console.log(`\nSaved suite summary to ${summaryPath}`);
