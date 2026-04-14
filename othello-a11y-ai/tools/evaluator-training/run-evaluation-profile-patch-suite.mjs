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
import { DEFAULT_EVALUATION_EXPANSION_PATCH_TEMPLATES } from './evaluation-profile-expansion-lib.mjs';
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
  progressEvery: 250000,
  continueOnError: false,
  sourceSelection: {
    mode: 'review-summary',
    count: 3,
  },
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
  candidates: [],
});

function printUsage() {
  const toolPath = displayTrainingToolPath('run-evaluation-profile-patch-suite.mjs');
  const outputDir = displayTrainingOutputPath('evaluation-profile-patch-suite');
  console.log(`Usage:
  node ${toolPath} \
    --source-suite-dir tools/evaluator-training/out/evaluation-profile-candidate-suite \
    [--output-dir ${outputDir}] \
    [--config tools/evaluator-training/examples/evaluation-profile-patch-suite.patch-only.example.json] \
    [--input <file-or-dir> [--input <file-or-dir> ...]] \
    [--resume] [--continue-on-error] [--plan-only] [--source-candidates key1,key2,...]

설명:
- evaluation-profile candidate suite 산출물을 source로 받아 micro-patch 후보를 일괄 생성합니다.
- patch family가 비어 있으면 추천 finalist 상위 source candidate들에 대해 기본 6개 patch template을 전개합니다.
- 각 후보마다 patch → generated module export → (선택) benchmark를 수행하고, suite-summary / suite-review-summary를 남깁니다.
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
  return {
    label,
    source: resolvedPath,
    profile: loadJsonFileIfPresent(resolvedPath),
    path: resolvedPath,
  };
}

function benchmarkOptionEnabled(configSection) {
  return toBoolean(configSection?.enabled, false);
}

function normalizeScaleEntriesInput(value) {
  if (!value) {
    return [];
  }
  if (typeof value === 'string') {
    return value.split(',').map((entry) => entry.trim()).filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => normalizeScaleEntriesInput(entry));
  }
  if (isPlainObject(value)) {
    return Object.entries(value).map(([token, scale]) => `${token}=${scale}`);
  }
  return [];
}

function normalizeTokenList(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => normalizeTokenList(entry));
  }
  if (typeof value === 'string') {
    return value.split(',').map((entry) => entry.trim()).filter(Boolean);
  }
  return [];
}

function readSourceSuiteSummary(sourceSuiteDir) {
  const reviewSummaryPath = path.join(sourceSuiteDir, 'suite-review-summary.json');
  const suiteSummaryPath = path.join(sourceSuiteDir, 'suite-summary.json');
  const reviewSummary = fs.existsSync(reviewSummaryPath)
    ? JSON.parse(fs.readFileSync(reviewSummaryPath, 'utf8'))
    : null;
  const suiteSummary = fs.existsSync(suiteSummaryPath)
    ? JSON.parse(fs.readFileSync(suiteSummaryPath, 'utf8'))
    : null;
  return { reviewSummaryPath, suiteSummaryPath, reviewSummary, suiteSummary };
}

function resolveDefaultSourceCandidateKeys(sourceSuiteDir, selectionConfig) {
  const { reviewSummary, suiteSummary } = readSourceSuiteSummary(sourceSuiteDir);
  const count = Math.max(1, toFiniteInteger(selectionConfig?.count, 3));
  const mode = typeof selectionConfig?.mode === 'string' ? selectionConfig.mode : 'review-summary';

  if (mode === 'review-summary' && Array.isArray(reviewSummary?.recommendedFinalists) && reviewSummary.recommendedFinalists.length > 0) {
    return reviewSummary.recommendedFinalists.slice(0, count);
  }

  const successfulCandidates = Array.isArray(suiteSummary?.candidates)
    ? suiteSummary.candidates.filter((candidate) => candidate.status === 'success')
    : [];
  if (successfulCandidates.length === 0) {
    return [];
  }

  return [...successfulCandidates]
    .sort((left, right) => {
      const leftValue = Number.isFinite(left.holdoutMaeInStones) ? left.holdoutMaeInStones : Number.POSITIVE_INFINITY;
      const rightValue = Number.isFinite(right.holdoutMaeInStones) ? right.holdoutMaeInStones : Number.POSITIVE_INFINITY;
      return leftValue - rightValue || left.key.localeCompare(right.key);
    })
    .slice(0, count)
    .map((candidate) => candidate.key);
}

function expandAutomaticPatchCandidates(sourceCandidateKeys) {
  const candidates = [];
  for (const sourceCandidateKey of sourceCandidateKeys) {
    for (const template of DEFAULT_EVALUATION_EXPANSION_PATCH_TEMPLATES) {
      candidates.push({
        key: `${sourceCandidateKey}--${template.keySuffix}`,
        name: `${sourceCandidateKey} ${template.nameSuffix}`,
        sourceCandidateKey,
        ...cloneJsonValue(template),
      });
    }
  }
  return candidates;
}

function buildBaselineBlendEntriesFromRule(sourceProfile, ruleValue) {
  if (!ruleValue) {
    return [];
  }
  if (typeof ruleValue === 'string' || Array.isArray(ruleValue)) {
    return normalizeScaleEntriesInput(ruleValue);
  }
  if (isPlainObject(ruleValue) && Number.isFinite(ruleValue.scale) && Number.isFinite(ruleValue.activateWhenMinEmptiesAtMost)) {
    return sourceProfile.phaseBuckets
      .filter((bucket) => Number(bucket.minEmpties) <= Number(ruleValue.activateWhenMinEmptiesAtMost))
      .map((bucket) => `${bucket.key}=${ruleValue.scale}`);
  }
  if (isPlainObject(ruleValue)) {
    return normalizeScaleEntriesInput(ruleValue);
  }
  return [];
}

function compactCandidateResult(result) {
  return {
    key: result.key,
    status: result.status,
    sourceCandidateKey: result.sourceCandidateKey,
    profileDeltaMaeInStones: result.profileBenchmarkDeltaMaeInStones,
    depthNodeDeltaPercent: result.depthNodeDeltaPercent,
    exactNodeDeltaPercent: result.exactNodeDeltaPercent,
  };
}

function summarizeReview(results) {
  const successful = results.filter((result) => result.status === 'success');
  const byProfileBenchmark = [...successful]
    .filter((result) => Number.isFinite(result.profileBenchmarkDeltaMaeInStones))
    .sort((left, right) => left.profileBenchmarkDeltaMaeInStones - right.profileBenchmarkDeltaMaeInStones || left.key.localeCompare(right.key));
  const byDepthNodes = [...successful]
    .filter((result) => Number.isFinite(result.depthNodeDeltaPercent))
    .sort((left, right) => left.depthNodeDeltaPercent - right.depthNodeDeltaPercent || left.key.localeCompare(right.key));
  const byExactNodes = [...successful]
    .filter((result) => Number.isFinite(result.exactNodeDeltaPercent))
    .sort((left, right) => left.exactNodeDeltaPercent - right.exactNodeDeltaPercent || left.key.localeCompare(right.key));

  const preferredRanking = byProfileBenchmark.length > 0
    ? byProfileBenchmark
    : (byDepthNodes.length > 0 ? byDepthNodes : (byExactNodes.length > 0 ? byExactNodes : successful));

  return {
    generatedAt: new Date().toISOString(),
    candidateCount: results.length,
    successfulCandidateCount: successful.length,
    rankingByProfileBenchmark: byProfileBenchmark.map(compactCandidateResult),
    rankingByDepthNodes: byDepthNodes.map(compactCandidateResult),
    rankingByExactNodes: byExactNodes.map(compactCandidateResult),
    recommendedFinalists: preferredRanking.slice(0, 4).map((entry) => entry.key),
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
if (args.help || args.h || !args['source-suite-dir']) {
  printUsage();
  process.exit(args.help || args.h ? 0 : 1);
}

const sourceSuiteDir = resolveCliPath(args['source-suite-dir']);
const requestedInputs = [
  ...ensureArray(args.input),
  ...ensureArray(args['input-dir']),
].map((value) => resolveCliPath(value));
const outputDir = args['output-dir']
  ? resolveCliPath(args['output-dir'])
  : resolveCliPath(displayTrainingOutputPath('evaluation-profile-patch-suite'));
const configPath = args.config ? resolveCliPath(args.config) : null;
const configFile = configPath ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
const cliSourceCandidateFilter = parseCommaList(args['source-candidates']);
const resume = Boolean(args.resume);
const continueOnError = Boolean(args['continue-on-error']) || toBoolean(configFile.continueOnError, false);
const planOnly = Boolean(args['plan-only']);

const config = deepMerge(DEFAULT_CONFIG, configFile ?? {});
const moduleFormat = typeof (args['module-format'] ?? config.moduleFormat) === 'string'
  ? (args['module-format'] ?? config.moduleFormat)
  : 'compact';
const targetScale = toFiniteNumber(args['target-scale'] ?? config.targetScale, 3000);
const progressEvery = Math.max(0, toFiniteInteger(args['progress-every'] ?? config.progressEvery, 250000));

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

const sourceCandidateKeys = cliSourceCandidateFilter.length > 0
  ? cliSourceCandidateFilter
  : resolveDefaultSourceCandidateKeys(sourceSuiteDir, config.sourceSelection);
if (sourceCandidateKeys.length === 0 && (!Array.isArray(config.candidates) || config.candidates.length === 0)) {
  throw new Error('Patch source candidate를 찾지 못했습니다. --source-candidates 또는 sourceSelection을 확인하십시오.');
}

const rawCandidates = Array.isArray(config.candidates) && config.candidates.length > 0
  ? config.candidates
  : expandAutomaticPatchCandidates(sourceCandidateKeys);
const mergedCandidates = rawCandidates.map((candidate, index) => {
  const merged = deepMerge(config.defaults ?? {}, candidate ?? {});
  return {
    ...merged,
    key: slugify(merged.key ?? `patch-${index + 1}`),
  };
});

const sharedDir = path.join(outputDir, 'shared');
const candidatesDir = path.join(outputDir, 'candidates');
await fs.promises.mkdir(sharedDir, { recursive: true });
await fs.promises.mkdir(candidatesDir, { recursive: true });

const baselineGeneratedModulePath = path.join(sharedDir, 'benchmark-baseline.generated.js');
await writeJson(path.join(outputDir, 'suite-manifest.json'), {
  generatedAt: new Date().toISOString(),
  tool: 'run-evaluation-profile-patch-suite.mjs',
  sourceSuiteDir,
  outputDir,
  configPath,
  resume,
  continueOnError,
  planOnly,
  inputPaths: requestedInputs,
  sourceCandidateKeys,
});

if (!planOnly) {
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

console.log(`Evaluation patch suite: ${formatInteger(mergedCandidates.length)} candidate(s)`);
console.log(`Source suite dir   : ${sourceSuiteDir}`);
console.log(`Source candidates  : ${sourceCandidateKeys.join(', ') || '(explicit config only)'}`);
console.log(`Output directory   : ${outputDir}`);

const patchScriptPath = resolveTrainingToolPath('patch-evaluation-profile.mjs');
const profileBenchmarkScriptPath = resolveTrainingToolPath('benchmark-profile.mjs');
const depthBenchmarkScriptPath = resolveTrainingToolPath('benchmark-depth-search-profile.mjs');
const exactBenchmarkScriptPath = resolveTrainingToolPath('benchmark-exact-search-profile.mjs');

const candidateResults = [];
let successCount = 0;
let failureCount = 0;

for (const candidate of mergedCandidates) {
  const sourceProfilePath = candidate.sourceProfileJson
    ? resolveCliPath(candidate.sourceProfileJson)
    : path.join(sourceSuiteDir, 'candidates', String(candidate.sourceCandidateKey ?? '').trim(), 'trained-evaluation-profile.json');
  const sourceProfile = await readJsonIfPresent(sourceProfilePath);
  if (!sourceProfile) {
    throw new Error(`Patch source profile을 찾지 못했습니다: ${sourceProfilePath}`);
  }

  const candidateDir = path.join(candidatesDir, candidate.key);
  const benchmarksDir = path.join(candidateDir, 'benchmarks');
  await fs.promises.mkdir(benchmarksDir, { recursive: true });

  const statusPath = path.join(candidateDir, 'candidate-status.json');
  const patchedProfilePath = path.join(candidateDir, 'trained-evaluation-profile.patched.json');
  const patchSummaryPath = path.join(candidateDir, 'patch-summary.json');
  const generatedModulePath = path.join(candidateDir, 'learned-eval-profile.generated.js');
  const profileBenchmarkPath = path.join(benchmarksDir, 'profile.benchmark.json');
  const depthBenchmarkPath = path.join(benchmarksDir, 'depth-search.benchmark.json');
  const exactBenchmarkPath = path.join(benchmarksDir, 'exact-search.benchmark.json');
  const resolvedConfigPath = path.join(candidateDir, 'candidate-resolved-config.json');

  const bucketScaleEntries = normalizeScaleEntriesInput(candidate.bucketScales);
  const featureScaleEntries = normalizeScaleEntriesInput(candidate.featureScales);
  const bucketFeatureScaleEntries = normalizeScaleEntriesInput(candidate.bucketFeatureScales);
  const baselineBlendEntries = buildBaselineBlendEntriesFromRule(sourceProfile, candidate.baselineBlend);
  const dropFeatures = normalizeTokenList(candidate.dropFeatures);
  const needsGeneratedModule = toBoolean(candidate.exportModule, true)
    || benchmarkOptionEnabled(candidate.benchmarks?.depth)
    || benchmarkOptionEnabled(candidate.benchmarks?.exact);
  const candidatePlan = {
    key: candidate.key,
    name: candidate.name ?? `${candidate.key} patched evaluation profile`,
    description: candidate.description ?? `Patched evaluation profile ${candidate.key}`,
    sourceCandidateKey: candidate.sourceCandidateKey ?? null,
    sourceProfilePath,
    sourceProfileName: sourceProfile.name ?? null,
    patch: {
      globalScale: toFiniteNumber(candidate.globalScale, 1),
      bucketScaleEntries,
      featureScaleEntries,
      bucketFeatureScaleEntries,
      baselineBlendEntries,
      dropFeatures,
      setInterpolation: candidate.setInterpolation ?? null,
    },
    exportModule: toBoolean(candidate.exportModule, true),
    benchmarks: cloneJsonValue(candidate.benchmarks ?? {}),
    outputs: {
      patchedProfilePath,
      patchSummaryPath,
      generatedModulePath,
      profileBenchmarkPath,
      depthBenchmarkPath,
      exactBenchmarkPath,
    },
  };

  let status = await readJsonIfPresent(statusPath);
  if (!status) {
    status = {
      candidateKey: candidate.key,
      candidateName: candidatePlan.name,
      createdAt: new Date().toISOString(),
      steps: {},
    };
  }
  status.updatedAt = new Date().toISOString();
  status.resolvedConfigPath = resolvedConfigPath;
  await writeJson(statusPath, status);
  await writeJson(resolvedConfigPath, candidatePlan);

  console.log(`\n[patch ${candidate.key}] source=${candidatePlan.sourceProfileName}`);

  try {
    const patchArgs = [
      '--input', sourceProfilePath,
      '--baseline-profile', path.join(sharedDir, 'benchmark-baseline-evaluation-profile.json'),
      '--output-json', patchedProfilePath,
      '--summary-json', patchSummaryPath,
      '--name', candidatePlan.name,
      '--description', candidatePlan.description,
    ];
    pushArg(patchArgs, 'global-scale', candidatePlan.patch.globalScale);
    if (bucketScaleEntries.length > 0) {
      pushArg(patchArgs, 'bucket-scale', bucketScaleEntries.join(','));
    }
    if (featureScaleEntries.length > 0) {
      pushArg(patchArgs, 'feature-scale', featureScaleEntries.join(','));
    }
    if (bucketFeatureScaleEntries.length > 0) {
      pushArg(patchArgs, 'bucket-feature-scale', bucketFeatureScaleEntries.join(','));
    }
    if (baselineBlendEntries.length > 0) {
      pushArg(patchArgs, 'baseline-blend', baselineBlendEntries.join(','));
    }
    if (dropFeatures.length > 0) {
      pushArg(patchArgs, 'drop-features', dropFeatures.join(','));
    }
    if (candidatePlan.patch.setInterpolation !== null && candidatePlan.patch.setInterpolation !== undefined) {
      pushArg(patchArgs, 'set-interpolation', candidatePlan.patch.setInterpolation);
    }

    await runStep({
      status,
      statusPath,
      stepKey: 'patch-evaluation-profile',
      signature: createSignature({ step: 'patch-evaluation-profile', patchArgs }),
      outputs: [patchedProfilePath, patchSummaryPath],
      resume,
      planOnly,
      execute: async () => {
        await runNodeScript(patchScriptPath, patchArgs, { dryRun: false });
      },
    });

    if (needsGeneratedModule) {
      await runStep({
        status,
        statusPath,
        stepKey: 'export-generated-module',
        signature: createSignature({
          step: 'export-generated-module',
          patchedProfilePath,
          moduleFormat,
          sharedMoveOrdering: sharedMoveOrderingRef.profile?.name ?? null,
          sharedTuple: sharedTupleRef.profile?.name ?? null,
          sharedMpc: sharedMpcRef.profile?.name ?? null,
        }),
        outputs: [generatedModulePath],
        resume,
        planOnly,
        execute: async () => {
          const patchedProfile = loadJsonFileIfPresent(patchedProfilePath);
          await writeGeneratedProfilesModule(generatedModulePath, {
            evaluationProfile: patchedProfile,
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
      pushArg(profileArgs, 'candidate-profile', patchedProfilePath);
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

  const patchedProfile = await readJsonIfPresent(patchedProfilePath);
  const patchSummary = await readJsonIfPresent(patchSummaryPath);
  const profileBenchmark = await readJsonIfPresent(profileBenchmarkPath);
  const depthBenchmark = await readJsonIfPresent(depthBenchmarkPath);
  const exactBenchmark = await readJsonIfPresent(exactBenchmarkPath);
  const finalStatus = await readJsonIfPresent(statusPath);

  candidateResults.push({
    key: candidate.key,
    name: candidatePlan.name,
    description: candidatePlan.description,
    status: finalStatus?.status ?? (planOnly ? 'planned' : 'unknown'),
    sourceCandidateKey: candidatePlan.sourceCandidateKey,
    sourceProfileName: candidatePlan.sourceProfileName,
    interpolation: patchedProfile?.interpolation ?? null,
    featureKeys: patchedProfile?.featureKeys ?? null,
    patch: patchSummary?.patch ?? candidatePlan.patch,
    profileBenchmarkDeltaMaeInStones: profileBenchmark?.delta?.maeInStones ?? null,
    profileBenchmarkCandidateEvalsPerSec: profileBenchmark?.speed?.candidate?.evalsPerSec ?? null,
    depthNodeDeltaPercent: depthBenchmark?.overall?.nodeDeltaPercent ?? null,
    depthElapsedDeltaPercent: depthBenchmark?.overall?.elapsedDeltaPercent ?? null,
    exactNodeDeltaPercent: exactBenchmark?.overall?.nodeDeltaPercent ?? null,
    exactElapsedDeltaPercent: exactBenchmark?.overall?.elapsedDeltaPercent ?? null,
    paths: {
      candidateDir,
      sourceProfilePath,
      patchedProfilePath,
      patchSummaryPath,
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
  tool: 'run-evaluation-profile-patch-suite.mjs',
  sourceSuiteDir,
  inputPaths: requestedInputs,
  outputDir,
  configPath,
  moduleFormat,
  targetScale,
  progressEvery,
  planOnly,
  resume,
  continueOnError,
  sourceCandidateKeys,
  successCount,
  failureCount,
  candidates: candidateResults,
};
await writeJson(path.join(outputDir, 'suite-summary.json'), suiteSummary);
await writeJson(path.join(outputDir, 'suite-review-summary.json'), summarizeReview(candidateResults));

console.log(`\nPatch suite complete: success=${successCount}, failure=${failureCount}`);
console.log(`Saved suite summary to ${path.join(outputDir, 'suite-summary.json')}`);
console.log(`Saved review summary to ${path.join(outputDir, 'suite-review-summary.json')}`);
