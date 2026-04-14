#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

import {
  ACTIVE_EVALUATION_PROFILE,
  ACTIVE_MOVE_ORDERING_PROFILE,
  ACTIVE_MPC_PROFILE,
  ACTIVE_TUPLE_RESIDUAL_PROFILE,
} from '../../js/ai/evaluation-profiles.js';
import {
  DEFAULT_EVALUATION_EXPANSION_CANDIDATES,
  buildEvaluationExpansionSeedProfile,
  buildFeatureActivationRules,
  buildExcludeFeaturesByBucketMap,
  formatBucketFeatureExclusions,
  summarizeEvaluationExpansionCandidate,
} from './evaluation-profile-expansion-lib.mjs';
import {
  displayTrainingOutputPath,
  displayTrainingToolPath,
  ensureArray,
  formatInteger,
  loadJsonFileIfPresent,
  parseArgs,
  resolveCliPath,
  resolveTrainingToolPath,
  writeGeneratedProfilesModule,
} from './lib.mjs';

const DEFAULT_CONFIG = Object.freeze({
  moduleFormat: 'compact',
  targetScale: 3000,
  holdoutMod: 10,
  holdoutResidue: 0,
  progressEvery: 250000,
  continueOnError: false,
  seedBaseProfileJson: 'active',
  sharedProfiles: {
    moveOrderingProfileJson: 'active',
    tupleProfileJson: 'active',
    mpcProfileJson: 'active',
  },
  benchmarkBaseline: {
    evaluationProfileJson: 'active',
    moveOrderingProfileJson: 'active',
    tupleProfileJson: 'active',
    mpcProfileJson: 'active',
  },
  defaults: {
    lambda: 5000,
    limit: null,
    skipDiagnostics: false,
    keepParityAliases: false,
    exportModule: true,
    benchmarks: {
      profile: {
        enabled: false,
        limit: 50000,
        benchmarkLoops: 200,
      },
      depth: {
        enabled: false,
        empties: [18, 20, 24],
        seedStart: 1,
        seedCount: 8,
        repetitions: 1,
        timeLimitMs: 2000,
        maxDepth: 6,
        exactEndgameEmpties: 10,
      },
      exact: {
        enabled: false,
        empties: [10, 12, 14],
        seedStart: 1,
        seedCount: 12,
        repetitions: 3,
        timeLimitMs: 60000,
        maxDepth: 12,
      },
    },
  },
  candidates: DEFAULT_EVALUATION_EXPANSION_CANDIDATES,
});

function printUsage() {
  const toolPath = displayTrainingToolPath('run-evaluation-profile-candidate-suite.mjs');
  const outputDir = displayTrainingOutputPath('evaluation-profile-candidate-suite');
  console.log(`Usage:
  node ${toolPath} \
    --input <file-or-dir> [--input <file-or-dir> ...] \
    [--output-dir ${outputDir}] \
    [--config tools/evaluator-training/examples/evaluation-profile-candidate-suite.train-only.example.json] \
    [--resume] [--continue-on-error] [--plan-only] [--candidates key1,key2,...]

설명:
- evaluation-profile 확장 후보(phase bucket 세분화 / extra scalar feature / smoothed phase interpolation)를 한 번에 seed 생성 → 학습 → generated module export → benchmark까지 순차 실행합니다.
- 기본 config가 없으면 문헌 조사에서 뽑은 13개 기본 후보를 대상으로 train-only suite를 구성합니다.
- long run에 대비해 candidate별 status JSON과 suite-summary / suite-review-summary를 남기며, --resume으로 재개할 수 있습니다.
- patch follow-up은 run-evaluation-profile-patch-suite.mjs가 담당합니다.
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

function slugify(value, fallback = 'candidate') {
  const normalized = String(value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || fallback;
}

function parseCommaList(values) {
  return ensureArray(values)
    .flatMap((value) => String(value).split(','))
    .map((token) => token.trim())
    .filter(Boolean);
}

function toFiniteNumber(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toFiniteInteger(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
}

function pushArg(target, flag, value) {
  if (value === undefined || value === null || value === '') {
    return;
  }
  target.push(`--${flag}`, String(value));
}

function pushFlag(target, flag, enabled) {
  if (enabled) {
    target.push(`--${flag}`);
  }
}

function formatCommand(command) {
  return command.map((token) => (
    /\s/.test(token) || token.includes('"')
      ? `"${String(token).replace(/"/g, '\\"')}"`
      : token
  )).join(' ');
}

function runNodeScript(scriptPath, args, { cwd = process.cwd(), dryRun = false } = {}) {
  const command = [process.execPath, scriptPath, ...args];
  if (dryRun) {
    console.log(`[plan] ${formatCommand(command)}`);
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${formatCommand(command)}`));
      }
    });
  });
}

async function fileExists(filePath) {
  if (!filePath) {
    return false;
  }
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function outputsExist(pathsToCheck) {
  for (const outputPath of pathsToCheck) {
    if (!(await fileExists(outputPath))) {
      return false;
    }
  }
  return true;
}

async function writeJson(filePath, payload) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function readJsonIfPresent(filePath) {
  if (!(await fileExists(filePath))) {
    return null;
  }
  return JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
}

function createSignature(payload) {
  return crypto.createHash('sha1').update(JSON.stringify(payload)).digest('hex');
}

function resolveProfileReference(value, activeProfile, { label }) {
  if (value === undefined || value === 'active') {
    return {
      label,
      source: 'active',
      profile: activeProfile ?? null,
      path: null,
    };
  }

  if (value === null || value === false || value === 'null' || value === 'none' || value === 'off') {
    return {
      label,
      source: 'none',
      profile: null,
      path: null,
    };
  }

  if (isPlainObject(value)) {
    return {
      label,
      source: 'inline',
      profile: cloneJsonValue(value),
      path: null,
    };
  }

  const resolvedPath = resolveCliPath(value);
  const loaded = loadJsonFileIfPresent(resolvedPath);
  return {
    label,
    source: resolvedPath,
    profile: loaded,
    path: resolvedPath,
  };
}

function normalizeBucketFeatureExclusionInput(value) {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => String(entry).split(';'))
      .map((entry) => entry.trim())
      .filter(Boolean)
      .join(';');
  }
  if (isPlainObject(value)) {
    return Object.entries(value)
      .map(([bucketKey, featureValue]) => {
        const features = ensureArray(featureValue)
          .flatMap((entry) => String(entry).split(','))
          .map((entry) => entry.trim())
          .filter(Boolean);
        return features.length > 0 ? `${bucketKey}:${features.join(',')}` : null;
      })
      .filter(Boolean)
      .join(';');
  }
  return '';
}

function combineBucketFeatureExclusionClauses(...values) {
  return values
    .map((value) => normalizeBucketFeatureExclusionInput(value))
    .filter((value) => value !== '')
    .join(';');
}

function uniqueFeatureList(values) {
  const seen = new Set();
  const result = [];
  for (const token of parseCommaList(values)) {
    if (seen.has(token)) {
      continue;
    }
    seen.add(token);
    result.push(token);
  }
  return result;
}

function benchmarkOptionEnabled(configSection) {
  return toBoolean(configSection?.enabled, false);
}

function compactCandidateResult(result) {
  return {
    key: result.key,
    status: result.status,
    holdoutMaeInStones: result.holdoutMaeInStones,
    profileDeltaMaeInStones: result.profileBenchmarkDeltaMaeInStones,
    depthNodeDeltaPercent: result.depthNodeDeltaPercent,
    exactNodeDeltaPercent: result.exactNodeDeltaPercent,
  };
}

function summarizeReview(results) {
  const successful = results.filter((result) => result.status === 'success');

  const byHoldout = [...successful]
    .filter((result) => Number.isFinite(result.holdoutMaeInStones))
    .sort((left, right) => left.holdoutMaeInStones - right.holdoutMaeInStones || left.key.localeCompare(right.key));

  const byProfileBenchmark = [...successful]
    .filter((result) => Number.isFinite(result.profileBenchmarkDeltaMaeInStones))
    .sort((left, right) => left.profileBenchmarkDeltaMaeInStones - right.profileBenchmarkDeltaMaeInStones || left.key.localeCompare(right.key));

  const byDepthNodes = [...successful]
    .filter((result) => Number.isFinite(result.depthNodeDeltaPercent))
    .sort((left, right) => left.depthNodeDeltaPercent - right.depthNodeDeltaPercent || left.key.localeCompare(right.key));

  const byExactNodes = [...successful]
    .filter((result) => Number.isFinite(result.exactNodeDeltaPercent))
    .sort((left, right) => left.exactNodeDeltaPercent - right.exactNodeDeltaPercent || left.key.localeCompare(right.key));

  const recommendedFinalists = (byHoldout.length > 0 ? byHoldout : successful)
    .slice(0, 4)
    .map((entry) => entry.key);

  return {
    generatedAt: new Date().toISOString(),
    candidateCount: results.length,
    successfulCandidateCount: successful.length,
    rankingByHoldout: byHoldout.map(compactCandidateResult),
    rankingByProfileBenchmark: byProfileBenchmark.map(compactCandidateResult),
    rankingByDepthNodes: byDepthNodes.map(compactCandidateResult),
    rankingByExactNodes: byExactNodes.map(compactCandidateResult),
    recommendedFinalists,
  };
}

async function runStep({
  status,
  statusPath,
  stepKey,
  signature,
  outputs = [],
  execute,
  resume,
  planOnly,
}) {
  const previous = status.steps?.[stepKey] ?? null;
  const now = new Date().toISOString();

  if (resume && previous?.status === 'success' && previous.signature === signature && await outputsExist(outputs)) {
    status.steps[stepKey] = {
      ...previous,
      lastCheckedAt: now,
      skipReason: 'resume-signature-match',
    };
    await writeJson(statusPath, status);
    return { skipped: true };
  }

  status.steps[stepKey] = {
    status: planOnly ? 'planned' : 'running',
    signature,
    outputs,
    startedAt: now,
  };
  await writeJson(statusPath, status);

  if (planOnly) {
    status.steps[stepKey] = {
      ...status.steps[stepKey],
      status: 'planned',
      completedAt: now,
    };
    await writeJson(statusPath, status);
    return { planned: true };
  }

  try {
    await execute();
    status.steps[stepKey] = {
      ...status.steps[stepKey],
      status: 'success',
      completedAt: new Date().toISOString(),
    };
    await writeJson(statusPath, status);
    return { success: true };
  } catch (error) {
    status.steps[stepKey] = {
      ...status.steps[stepKey],
      status: 'failed',
      completedAt: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
      },
    };
    await writeJson(statusPath, status);
    throw error;
  }
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h || (!args.input && !args['input-dir'])) {
  printUsage();
  process.exit(args.help || args.h ? 0 : 1);
}

const requestedInputs = [
  ...ensureArray(args.input),
  ...ensureArray(args['input-dir']),
].map((value) => resolveCliPath(value));
const outputDir = args['output-dir']
  ? resolveCliPath(args['output-dir'])
  : resolveCliPath(displayTrainingOutputPath('evaluation-profile-candidate-suite'));
const configPath = args.config ? resolveCliPath(args.config) : null;
const configFile = configPath ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
const cliCandidateFilter = new Set(parseCommaList(args.candidates));
const resume = Boolean(args.resume);
const continueOnError = Boolean(args['continue-on-error']) || toBoolean(configFile.continueOnError, false);
const planOnly = Boolean(args['plan-only']);

const config = deepMerge(DEFAULT_CONFIG, configFile ?? {});
const seedBaseProfileRef = resolveProfileReference(
  args['seed-base-profile-json'] ?? config.seedBaseProfileJson,
  ACTIVE_EVALUATION_PROFILE,
  { label: 'seed-base-evaluation-profile' },
);
const sharedMoveOrderingRef = resolveProfileReference(
  args['shared-move-ordering-profile-json'] ?? config.sharedProfiles?.moveOrderingProfileJson,
  ACTIVE_MOVE_ORDERING_PROFILE,
  { label: 'shared-move-ordering-profile' },
);
const sharedTupleRef = resolveProfileReference(
  args['shared-tuple-profile-json'] ?? config.sharedProfiles?.tupleProfileJson,
  ACTIVE_TUPLE_RESIDUAL_PROFILE,
  { label: 'shared-tuple-residual-profile' },
);
const sharedMpcRef = resolveProfileReference(
  args['shared-mpc-profile-json'] ?? config.sharedProfiles?.mpcProfileJson,
  ACTIVE_MPC_PROFILE,
  { label: 'shared-mpc-profile' },
);
const benchmarkBaselineEvalRef = resolveProfileReference(
  args['benchmark-baseline-profile-json'] ?? config.benchmarkBaseline?.evaluationProfileJson,
  ACTIVE_EVALUATION_PROFILE,
  { label: 'benchmark-baseline-evaluation-profile' },
);
const benchmarkBaselineMoveOrderingRef = resolveProfileReference(
  args['benchmark-baseline-move-ordering-profile-json'] ?? config.benchmarkBaseline?.moveOrderingProfileJson,
  ACTIVE_MOVE_ORDERING_PROFILE,
  { label: 'benchmark-baseline-move-ordering-profile' },
);
const benchmarkBaselineTupleRef = resolveProfileReference(
  args['benchmark-baseline-tuple-profile-json'] ?? config.benchmarkBaseline?.tupleProfileJson,
  ACTIVE_TUPLE_RESIDUAL_PROFILE,
  { label: 'benchmark-baseline-tuple-profile' },
);
const benchmarkBaselineMpcRef = resolveProfileReference(
  args['benchmark-baseline-mpc-profile-json'] ?? config.benchmarkBaseline?.mpcProfileJson,
  ACTIVE_MPC_PROFILE,
  { label: 'benchmark-baseline-mpc-profile' },
);

const moduleFormat = typeof (args['module-format'] ?? config.moduleFormat) === 'string'
  ? (args['module-format'] ?? config.moduleFormat)
  : 'compact';
const targetScale = toFiniteNumber(args['target-scale'] ?? config.targetScale, 3000);
const holdoutMod = Math.max(0, toFiniteInteger(args['holdout-mod'] ?? config.holdoutMod, 10));
const holdoutResidue = Math.max(0, toFiniteInteger(args['holdout-residue'] ?? config.holdoutResidue, 0));
const progressEvery = Math.max(0, toFiniteInteger(args['progress-every'] ?? config.progressEvery, 250000));

const rawCandidates = Array.isArray(config.candidates) && config.candidates.length > 0
  ? config.candidates
  : DEFAULT_EVALUATION_EXPANSION_CANDIDATES;
const mergedCandidates = rawCandidates
  .map((candidate, index) => {
    const merged = deepMerge(config.defaults ?? {}, candidate ?? {});
    const key = slugify(merged.key ?? `candidate-${index + 1}`);
    return {
      ...merged,
      key,
    };
  })
  .filter((candidate) => cliCandidateFilter.size === 0 || cliCandidateFilter.has(candidate.key));

if (mergedCandidates.length === 0) {
  throw new Error('선택된 candidate가 없습니다. --candidates 필터 또는 config.candidates를 확인하십시오.');
}

const sharedDir = path.join(outputDir, 'shared');
const candidatesDir = path.join(outputDir, 'candidates');
await fs.promises.mkdir(sharedDir, { recursive: true });
await fs.promises.mkdir(candidatesDir, { recursive: true });

const baselineGeneratedModulePath = path.join(sharedDir, 'benchmark-baseline.generated.js');
await writeJson(path.join(outputDir, 'suite-manifest.json'), {
  generatedAt: new Date().toISOString(),
  tool: 'run-evaluation-profile-candidate-suite.mjs',
  configPath,
  outputDir,
  resume,
  continueOnError,
  planOnly,
  inputPaths: requestedInputs,
  targetScale,
  holdoutMod,
  holdoutResidue,
  progressEvery,
  moduleFormat,
  seedBaseProfileSource: seedBaseProfileRef.source,
  candidateKeys: mergedCandidates.map((candidate) => candidate.key),
});

if (!planOnly) {
  if (seedBaseProfileRef.profile) {
    await writeJson(path.join(sharedDir, 'seed-base-evaluation-profile.json'), seedBaseProfileRef.profile);
  }
  if (benchmarkBaselineEvalRef.profile) {
    await writeJson(path.join(sharedDir, 'benchmark-baseline-evaluation-profile.json'), benchmarkBaselineEvalRef.profile);
  }
  if (benchmarkBaselineMoveOrderingRef.profile) {
    await writeJson(path.join(sharedDir, 'benchmark-baseline-move-ordering-profile.json'), benchmarkBaselineMoveOrderingRef.profile);
  }
  if (benchmarkBaselineTupleRef.profile) {
    await writeJson(path.join(sharedDir, 'benchmark-baseline-tuple-profile.json'), benchmarkBaselineTupleRef.profile);
  }
  if (benchmarkBaselineMpcRef.profile) {
    await writeJson(path.join(sharedDir, 'benchmark-baseline-mpc-profile.json'), benchmarkBaselineMpcRef.profile);
  }
  if (sharedMoveOrderingRef.profile) {
    await writeJson(path.join(sharedDir, 'shared-move-ordering-profile.json'), sharedMoveOrderingRef.profile);
  }
  if (sharedTupleRef.profile) {
    await writeJson(path.join(sharedDir, 'shared-tuple-residual-profile.json'), sharedTupleRef.profile);
  }
  if (sharedMpcRef.profile) {
    await writeJson(path.join(sharedDir, 'shared-mpc-profile.json'), sharedMpcRef.profile);
  }
  await writeGeneratedProfilesModule(baselineGeneratedModulePath, {
    evaluationProfile: benchmarkBaselineEvalRef.profile,
    moveOrderingProfile: benchmarkBaselineMoveOrderingRef.profile,
    tupleResidualProfile: benchmarkBaselineTupleRef.profile,
    mpcProfile: benchmarkBaselineMpcRef.profile,
  }, {
    moduleFormat,
  });
}

console.log(`Evaluation expansion suite: ${formatInteger(mergedCandidates.length)} candidate(s)`);
console.log(`Output directory: ${outputDir}`);
console.log(`Seed base profile : ${seedBaseProfileRef.profile?.name ?? 'null'}`);
console.log(`Benchmark baseline: ${benchmarkBaselineEvalRef.profile?.name ?? 'null'}`);
console.log(`Shared move-ordering: ${sharedMoveOrderingRef.profile?.name ?? 'null'}`);
console.log(`Shared tuple residual: ${sharedTupleRef.profile?.name ?? 'null'}`);
console.log(`Shared MPC: ${sharedMpcRef.profile?.name ?? 'null'}`);

const trainScriptPath = resolveTrainingToolPath('train-phase-linear.mjs');
const profileBenchmarkScriptPath = resolveTrainingToolPath('benchmark-profile.mjs');
const depthBenchmarkScriptPath = resolveTrainingToolPath('benchmark-depth-search-profile.mjs');
const exactBenchmarkScriptPath = resolveTrainingToolPath('benchmark-exact-search-profile.mjs');

const candidateResults = [];
let successCount = 0;
let failureCount = 0;

for (const candidate of mergedCandidates) {
  const candidateDir = path.join(candidatesDir, candidate.key);
  const benchmarksDir = path.join(candidateDir, 'benchmarks');
  await fs.promises.mkdir(benchmarksDir, { recursive: true });

  const statusPath = path.join(candidateDir, 'candidate-status.json');
  const resolvedSummary = summarizeEvaluationExpansionCandidate(candidate);
  const seedProfile = buildEvaluationExpansionSeedProfile(candidate, {
    baseProfile: seedBaseProfileRef.profile,
  });
  const mergedActivationRules = buildFeatureActivationRules({
    featureFamily: candidate.featureFamily ?? 'control',
    extraFeatureKeys: candidate.extraFeatureKeys ?? [],
    featureActivationRules: candidate.featureActivationRules,
  });
  const autoExcludeMap = buildExcludeFeaturesByBucketMap({
    phaseBuckets: seedProfile.phaseBuckets,
    featureKeys: seedProfile.featureKeys,
    featureActivationRules: mergedActivationRules,
  });
  const autoExcludeClauses = formatBucketFeatureExclusions(autoExcludeMap);
  const explicitExcludeClauses = normalizeBucketFeatureExclusionInput(candidate.excludeFeaturesByBucket);
  const combinedExcludeClauses = combineBucketFeatureExclusionClauses(autoExcludeClauses, explicitExcludeClauses);
  const globalExcludeFeatures = uniqueFeatureList(candidate.excludeFeatures);

  const seedProfilePath = path.join(candidateDir, 'seed-evaluation-profile.json');
  const trainedProfilePath = path.join(candidateDir, 'trained-evaluation-profile.json');
  const generatedModulePath = path.join(candidateDir, 'learned-eval-profile.generated.js');
  const profileBenchmarkPath = path.join(benchmarksDir, 'profile.benchmark.json');
  const depthBenchmarkPath = path.join(benchmarksDir, 'depth-search.benchmark.json');
  const exactBenchmarkPath = path.join(benchmarksDir, 'exact-search.benchmark.json');
  const resolvedConfigPath = path.join(candidateDir, 'candidate-resolved-config.json');

  const candidatePlan = {
    key: candidate.key,
    name: seedProfile.name,
    description: seedProfile.description,
    resolvedSummary,
    featureKeys: seedProfile.featureKeys,
    extraFeatureKeys: resolvedSummary.extraFeatureKeys,
    autoExcludeClauses,
    explicitExcludeClauses,
    combinedExcludeClauses,
    globalExcludeFeatures,
    training: {
      targetScale,
      holdoutMod,
      holdoutResidue,
      lambda: toFiniteNumber(candidate.lambda, 5000),
      limit: candidate.limit === null || candidate.limit === undefined ? null : Math.max(1, toFiniteInteger(candidate.limit, 1)),
      progressEvery,
      skipDiagnostics: toBoolean(candidate.skipDiagnostics, false),
      keepParityAliases: toBoolean(candidate.keepParityAliases, false),
      sampleAssignmentMode: resolvedSummary.sampleAssignmentMode,
    },
    exportModule: toBoolean(candidate.exportModule, true),
    benchmarks: cloneJsonValue(candidate.benchmarks ?? {}),
    outputs: {
      seedProfilePath,
      trainedProfilePath,
      generatedModulePath,
      profileBenchmarkPath,
      depthBenchmarkPath,
      exactBenchmarkPath,
    },
  };
  const needsGeneratedModule = candidatePlan.exportModule
    || benchmarkOptionEnabled(candidate.benchmarks?.depth)
    || benchmarkOptionEnabled(candidate.benchmarks?.exact);

  let status = await readJsonIfPresent(statusPath);
  if (!status) {
    status = {
      candidateKey: candidate.key,
      candidateName: seedProfile.name,
      candidateDescription: seedProfile.description,
      createdAt: new Date().toISOString(),
      steps: {},
    };
  }
  status.updatedAt = new Date().toISOString();
  status.resolvedConfigPath = resolvedConfigPath;
  await writeJson(statusPath, status);
  await writeJson(resolvedConfigPath, candidatePlan);

  console.log(`\n[candidate ${candidate.key}] featureKeys=${seedProfile.featureKeys.length} buckets=${seedProfile.phaseBuckets.length} sampleAssignment=${resolvedSummary.sampleAssignmentMode}`);
  if (resolvedSummary.extraFeatureKeys.length > 0) {
    console.log(`  extra features: ${resolvedSummary.extraFeatureKeys.join(', ')}`);
  }
  if (combinedExcludeClauses) {
    console.log(`  exclude-by-bucket: ${combinedExcludeClauses}`);
  }

  try {
    await runStep({
      status,
      statusPath,
      stepKey: 'write-seed-profile',
      signature: createSignature({ step: 'write-seed-profile', seedProfile }),
      outputs: [seedProfilePath],
      resume,
      planOnly,
      execute: async () => {
        await writeJson(seedProfilePath, seedProfile);
      },
    });

    const trainArgs = requestedInputs.flatMap((inputPath) => ['--input', inputPath]);
    pushArg(trainArgs, 'seed-profile', seedProfilePath);
    pushArg(trainArgs, 'output-json', trainedProfilePath);
    pushArg(trainArgs, 'name', seedProfile.name);
    pushArg(trainArgs, 'description', seedProfile.description);
    pushArg(trainArgs, 'target-scale', targetScale);
    pushArg(trainArgs, 'holdout-mod', holdoutMod);
    pushArg(trainArgs, 'holdout-residue', holdoutResidue);
    pushArg(trainArgs, 'lambda', toFiniteNumber(candidate.lambda, 5000));
    pushArg(trainArgs, 'progress-every', progressEvery);
    pushArg(trainArgs, 'sample-assignment-mode', resolvedSummary.sampleAssignmentMode);
    if (candidatePlan.training.limit !== null) {
      pushArg(trainArgs, 'limit', candidatePlan.training.limit);
    }
    if (globalExcludeFeatures.length > 0) {
      pushArg(trainArgs, 'exclude-features', globalExcludeFeatures.join(','));
    }
    if (combinedExcludeClauses !== '') {
      pushArg(trainArgs, 'exclude-features-by-bucket', combinedExcludeClauses);
    }
    pushFlag(trainArgs, 'skip-diagnostics', candidatePlan.training.skipDiagnostics);
    pushFlag(trainArgs, 'keep-parity-aliases', candidatePlan.training.keepParityAliases);

    await runStep({
      status,
      statusPath,
      stepKey: 'train-evaluation-profile',
      signature: createSignature({ step: 'train-evaluation-profile', trainArgs }),
      outputs: [trainedProfilePath],
      resume,
      planOnly,
      execute: async () => {
        await runNodeScript(trainScriptPath, trainArgs, { dryRun: false });
      },
    });

    if (needsGeneratedModule) {
      await runStep({
        status,
        statusPath,
        stepKey: 'export-generated-module',
        signature: createSignature({
          step: 'export-generated-module',
          trainedProfilePath,
          moduleFormat,
          sharedMoveOrdering: sharedMoveOrderingRef.profile?.name ?? null,
          sharedTuple: sharedTupleRef.profile?.name ?? null,
          sharedMpc: sharedMpcRef.profile?.name ?? null,
        }),
        outputs: [generatedModulePath],
        resume,
        planOnly,
        execute: async () => {
          const trainedProfile = loadJsonFileIfPresent(trainedProfilePath);
          await writeGeneratedProfilesModule(generatedModulePath, {
            evaluationProfile: trainedProfile,
            moveOrderingProfile: sharedMoveOrderingRef.profile,
            tupleResidualProfile: sharedTupleRef.profile,
            mpcProfile: sharedMpcRef.profile,
          }, {
            moduleFormat,
          });
        },
      });
    }

    if (benchmarkOptionEnabled(candidate.benchmarks?.profile)) {
      const profileArgs = requestedInputs.flatMap((inputPath) => ['--input', inputPath]);
      pushArg(profileArgs, 'baseline-profile', path.join(sharedDir, 'benchmark-baseline-evaluation-profile.json'));
      pushArg(profileArgs, 'candidate-profile', trainedProfilePath);
      if (benchmarkBaselineTupleRef.profile) {
        pushArg(profileArgs, 'baseline-tuple-profile', path.join(sharedDir, 'benchmark-baseline-tuple-profile.json'));
        pushArg(profileArgs, 'candidate-tuple-profile', path.join(sharedDir, 'benchmark-baseline-tuple-profile.json'));
      }
      pushArg(profileArgs, 'limit', toFiniteInteger(candidate.benchmarks.profile.limit, 50000));
      pushArg(profileArgs, 'target-scale', targetScale);
      pushArg(profileArgs, 'benchmark-loops', toFiniteInteger(candidate.benchmarks.profile.benchmarkLoops, 200));
      pushArg(profileArgs, 'progress-every', progressEvery);
      pushArg(profileArgs, 'output-json', profileBenchmarkPath);

      await runStep({
        status,
        statusPath,
        stepKey: 'benchmark-profile',
        signature: createSignature({ step: 'benchmark-profile', profileArgs }),
        outputs: [profileBenchmarkPath],
        resume,
        planOnly,
        execute: async () => {
          await runNodeScript(profileBenchmarkScriptPath, profileArgs, { dryRun: false });
        },
      });
    }

    if (benchmarkOptionEnabled(candidate.benchmarks?.depth)) {
      const depthArgs = [
        '--baseline-generated-module', baselineGeneratedModulePath,
        '--candidate-generated-module', generatedModulePath,
        '--output-json', depthBenchmarkPath,
      ];
      pushArg(depthArgs, 'empties', ensureArray(candidate.benchmarks.depth.empties).join(','));
      pushArg(depthArgs, 'seed-start', toFiniteInteger(candidate.benchmarks.depth.seedStart, 1));
      pushArg(depthArgs, 'seed-count', toFiniteInteger(candidate.benchmarks.depth.seedCount, 8));
      pushArg(depthArgs, 'repetitions', toFiniteInteger(candidate.benchmarks.depth.repetitions, 1));
      pushArg(depthArgs, 'time-limit-ms', toFiniteInteger(candidate.benchmarks.depth.timeLimitMs, 2000));
      pushArg(depthArgs, 'max-depth', toFiniteInteger(candidate.benchmarks.depth.maxDepth, 6));
      pushArg(depthArgs, 'exact-endgame-empties', toFiniteInteger(candidate.benchmarks.depth.exactEndgameEmpties, 10));

      await runStep({
        status,
        statusPath,
        stepKey: 'benchmark-depth-search',
        signature: createSignature({ step: 'benchmark-depth-search', depthArgs }),
        outputs: [depthBenchmarkPath],
        resume,
        planOnly,
        execute: async () => {
          await runNodeScript(depthBenchmarkScriptPath, depthArgs, { dryRun: false });
        },
      });
    }

    if (benchmarkOptionEnabled(candidate.benchmarks?.exact)) {
      const exactArgs = [
        '--baseline-generated-module', baselineGeneratedModulePath,
        '--candidate-generated-module', generatedModulePath,
        '--output-json', exactBenchmarkPath,
      ];
      pushArg(exactArgs, 'empties', ensureArray(candidate.benchmarks.exact.empties).join(','));
      pushArg(exactArgs, 'seed-start', toFiniteInteger(candidate.benchmarks.exact.seedStart, 1));
      pushArg(exactArgs, 'seed-count', toFiniteInteger(candidate.benchmarks.exact.seedCount, 12));
      pushArg(exactArgs, 'repetitions', toFiniteInteger(candidate.benchmarks.exact.repetitions, 3));
      pushArg(exactArgs, 'time-limit-ms', toFiniteInteger(candidate.benchmarks.exact.timeLimitMs, 60000));
      pushArg(exactArgs, 'max-depth', toFiniteInteger(candidate.benchmarks.exact.maxDepth, 12));

      await runStep({
        status,
        statusPath,
        stepKey: 'benchmark-exact-search',
        signature: createSignature({ step: 'benchmark-exact-search', exactArgs }),
        outputs: [exactBenchmarkPath],
        resume,
        planOnly,
        execute: async () => {
          await runNodeScript(exactBenchmarkScriptPath, exactArgs, { dryRun: false });
        },
      });
    }

    status.updatedAt = new Date().toISOString();
    status.status = planOnly ? 'planned' : 'success';
    await writeJson(statusPath, status);
    successCount += 1;
  } catch (error) {
    failureCount += 1;
    status.updatedAt = new Date().toISOString();
    status.status = 'failed';
    status.failure = {
      message: error.message,
      stack: error.stack,
    };
    await writeJson(statusPath, status);
    if (!continueOnError) {
      throw error;
    }
  }

  const trainedProfile = await readJsonIfPresent(trainedProfilePath);
  const profileBenchmark = await readJsonIfPresent(profileBenchmarkPath);
  const depthBenchmark = await readJsonIfPresent(depthBenchmarkPath);
  const exactBenchmark = await readJsonIfPresent(exactBenchmarkPath);
  const finalStatus = await readJsonIfPresent(statusPath);

  candidateResults.push({
    key: candidate.key,
    name: seedProfile.name,
    description: seedProfile.description,
    status: finalStatus?.status ?? (planOnly ? 'planned' : 'unknown'),
    featureKeys: [...seedProfile.featureKeys],
    extraFeatureKeys: [...resolvedSummary.extraFeatureKeys],
    phaseBuckets: seedProfile.phaseBuckets.map((bucket) => ({
      key: bucket.key,
      minEmpties: bucket.minEmpties,
      maxEmpties: bucket.maxEmpties,
    })),
    interpolation: seedProfile.interpolation ?? null,
    sampleAssignmentMode: resolvedSummary.sampleAssignmentMode,
    holdoutMaeInStones: trainedProfile?.diagnostics?.holdout?.maeInStones ?? null,
    profileBenchmarkDeltaMaeInStones: profileBenchmark?.delta?.maeInStones ?? null,
    profileBenchmarkCandidateEvalsPerSec: profileBenchmark?.speed?.candidate?.evalsPerSec ?? null,
    depthNodeDeltaPercent: depthBenchmark?.overall?.nodeDeltaPercent ?? null,
    depthElapsedDeltaPercent: depthBenchmark?.overall?.elapsedDeltaPercent ?? null,
    exactNodeDeltaPercent: exactBenchmark?.overall?.nodeDeltaPercent ?? null,
    exactElapsedDeltaPercent: exactBenchmark?.overall?.elapsedDeltaPercent ?? null,
    paths: {
      candidateDir,
      seedProfilePath,
      trainedProfilePath,
      generatedModulePath,
      profileBenchmarkPath,
      depthBenchmarkPath,
      exactBenchmarkPath,
      statusPath,
      resolvedConfigPath,
    },
  });
}

const suiteSummary = {
  generatedAt: new Date().toISOString(),
  tool: 'run-evaluation-profile-candidate-suite.mjs',
  inputPaths: requestedInputs,
  outputDir,
  configPath,
  moduleFormat,
  targetScale,
  holdoutMod,
  holdoutResidue,
  progressEvery,
  planOnly,
  resume,
  continueOnError,
  seedBaseProfileName: seedBaseProfileRef.profile?.name ?? null,
  benchmarkBaselineProfileName: benchmarkBaselineEvalRef.profile?.name ?? null,
  sharedProfiles: {
    moveOrdering: sharedMoveOrderingRef.profile?.name ?? null,
    tupleResidual: sharedTupleRef.profile?.name ?? null,
    mpc: sharedMpcRef.profile?.name ?? null,
  },
  successCount,
  failureCount,
  candidates: candidateResults,
};
await writeJson(path.join(outputDir, 'suite-summary.json'), suiteSummary);
await writeJson(path.join(outputDir, 'suite-review-summary.json'), summarizeReview(candidateResults));

console.log(`\nSuite complete: success=${successCount}, failure=${failureCount}`);
console.log(`Saved suite summary to ${path.join(outputDir, 'suite-summary.json')}`);
console.log(`Saved review summary to ${path.join(outputDir, 'suite-review-summary.json')}`);
