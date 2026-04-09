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
  displayTrainingOutputPath,
  displayTrainingToolPath,
  ensureArray,
  formatInteger,
  parseArgs,
  resolveCliPath,
  resolveTrainingToolPath,
} from './lib.mjs';

const DEFAULT_BASELINE_BUCKETS = Object.freeze([
  '18-21:4>8',
  '22-25:4>8',
  '26-29:6>10',
  '30-33:6>10',
]);

const DEFAULT_OVERLAP_BUCKETS = Object.freeze([
  '18-21:3>7',
  '18-21:4>8',
  '22-25:4>8',
  '22-25:4>9',
  '26-29:5>10',
  '26-29:6>10',
  '30-33:5>11',
  '30-33:6>10',
]);

const DEFAULT_SPLIT_STAGE_BUCKETS = Object.freeze([
  '18-19:3>7',
  '20-21:4>8',
  '22-23:4>8',
  '24-25:4>9',
  '26-27:5>10',
  '28-29:6>10',
  '30-31:5>11',
  '32-33:6>10',
]);

const DEFAULT_CANDIDATES = Object.freeze([
  Object.freeze({
    key: 'baseline-4bucket-high',
    name: 'baseline 4-bucket high-only',
    calibrationBuckets: [...DEFAULT_BASELINE_BUCKETS],
    runtimeVariant: {
      defaultMode: 'high',
      maxWindow: 1,
      minDepth: 2,
      minDepthGap: 2,
      maxDepthDistance: 1,
      minPly: 1,
      maxChecksPerNode: 1,
      intervalScale: 1.0,
      highScale: 1.0,
      lowScale: 1.0,
      depthDistanceScale: 1.25,
    },
  }),
  Object.freeze({
    key: 'overlap-8bucket-high-safe',
    name: 'overlap 8-bucket high-only safe',
    calibrationBuckets: [...DEFAULT_OVERLAP_BUCKETS],
    targetHighHoldoutCoverage: 0.995,
    targetLowHoldoutCoverage: 0.99,
    runtimeVariant: {
      defaultMode: 'high',
      maxDepthDistance: 1,
      maxChecksPerNode: 2,
      intervalScale: 1.0,
      highScale: 1.0,
      lowScale: 1.0,
    },
  }),
  Object.freeze({
    key: 'overlap-8bucket-high-tight',
    name: 'overlap 8-bucket high-only tight',
    calibrationBuckets: [...DEFAULT_OVERLAP_BUCKETS],
    targetHighHoldoutCoverage: 0.99,
    targetLowHoldoutCoverage: 0.95,
    runtimeVariant: {
      defaultMode: 'high',
      maxDepthDistance: 1,
      maxChecksPerNode: 2,
      intervalScale: 1.0,
      highScale: 0.93,
      lowScale: 1.0,
    },
  }),
  Object.freeze({
    key: 'overlap-8bucket-both-softlow',
    name: 'overlap 8-bucket both-mode soft-low',
    calibrationBuckets: [...DEFAULT_OVERLAP_BUCKETS],
    targetHighHoldoutCoverage: 0.99,
    targetLowHoldoutCoverage: 0.95,
    runtimeVariant: {
      defaultMode: 'both',
      maxDepthDistance: 1,
      maxChecksPerNode: 2,
      intervalScale: 1.0,
      highScale: 1.0,
      lowScale: 0.9,
    },
  }),
]);

const DEFAULT_CONFIG = Object.freeze({
  moduleFormat: 'compact',
  continueOnError: false,
  sharedProfiles: {
    evaluationProfileJson: 'active',
    moveOrderingProfileJson: 'active',
    tupleProfileJson: 'active',
    baselineMpcProfileJson: 'active',
  },
  benchmarkBaseline: {
    evaluationProfileJson: null,
    moveOrderingProfileJson: null,
    tupleProfileJson: null,
    mpcProfileJson: null,
    mpcMode: null,
  },
  defaults: {
    calibrationBuckets: [...DEFAULT_BASELINE_BUCKETS],
    sampleStride: 200,
    sampleResidue: 0,
    maxSamplesPerBucket: 400,
    holdoutMod: 10,
    holdoutResidue: 0,
    targetHoldoutCoverage: 0.99,
    targetHighHoldoutCoverage: 0.99,
    targetLowHoldoutCoverage: 0.99,
    timeLimitMs: 120000,
    progressEvery: 20,
    maxTableEntries: 200000,
    aspirationWindow: 40,
    zValues: [1, 1.5, 1.96, 2.5, 3],
    runtimeVariant: {
      defaultMode: 'high',
      maxWindow: 1,
      minDepth: 2,
      minDepthGap: 2,
      maxDepthDistance: 1,
      minPly: 1,
      maxChecksPerNode: 1,
      intervalScale: 1.0,
      highScale: 1.0,
      lowScale: 1.0,
      depthDistanceScale: 1.25,
    },
    exportModule: true,
    benchmarks: {
      depth: {
        enabled: false,
        empties: [18, 22, 26, 30],
        seedStart: 1,
        seedCount: 6,
        repetitions: 1,
        timeLimitMs: 2000,
        maxDepth: 8,
        exactEndgameEmpties: 10,
        baselineMpcMode: null,
        candidateMpcMode: null,
      },
      exact: {
        enabled: false,
        empties: [10, 12, 14],
        seedStart: 1,
        seedCount: 6,
        repetitions: 1,
        timeLimitMs: 60000,
        maxDepth: 12,
        baselineMpcMode: null,
        candidateMpcMode: null,
      },
    },
  },
});

function printUsage() {
  const toolPath = displayTrainingToolPath('run-mpc-candidate-training-suite.mjs');
  const outputDir = displayTrainingOutputPath('mpc-candidate-training-suite');
  console.log(`Usage:
  node ${toolPath} \
    --input <file-or-dir> [--input <file-or-dir> ...] \
    [--output-dir ${outputDir}] \
    [--config tools/evaluator-training/examples/mpc-candidate-suite.train-plus-bench.example.json] \
    [--evaluation-profile-json path/to/trained-evaluation-profile.json] \
    [--move-ordering-profile-json path/to/trained-move-ordering-profile.json] \
    [--tuple-profile-json path/to/trained-tuple-residual-profile.json] \
    [--baseline-mpc-profile path/to/trained-mpc-profile.json] \
    [--module-format compact|expanded] [--resume] [--continue-on-error] [--plan-only]

설명:
- 여러 MPC 후보를 **순차적으로** calibrate → runtime-variant → generated module export → depth/exact benchmark까지 수행합니다.
- config JSON이 없으면 baseline/high-only, overlap high-only, overlap both-softlow 기본 후보 세트를 사용합니다.
- 문헌형 Multi-ProbCut에 맞춰 stage별/겹치는 shallow→deep depth pair 후보를 함께 학습시키는 용도입니다.
- 실행 상태는 output-dir 안 status JSON에 기록되므로, --resume 으로 중단 지점부터 재개할 수 있습니다.
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

function normalizeMpcMode(value, fallback = null) {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (['off', 'disabled', 'none'].includes(normalized)) {
    return 'off';
  }
  if (['both', 'high-low', 'highlow'].includes(normalized)) {
    return 'both';
  }
  if (['high', 'fail-high', 'upper'].includes(normalized)) {
    return 'high';
  }
  return fallback;
}

function normalizeIntegerList(value, fallback) {
  if (Array.isArray(value)) {
    return value.map((entry) => Number(entry)).filter((entry) => Number.isInteger(entry));
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => Number(entry.trim()))
      .filter((entry) => Number.isInteger(entry));
  }
  return [...fallback];
}

function normalizeNumberList(value, fallback) {
  if (Array.isArray(value)) {
    return value.map((entry) => Number(entry)).filter((entry) => Number.isFinite(entry));
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => Number(entry.trim()))
      .filter((entry) => Number.isFinite(entry));
  }
  return [...fallback];
}

function normalizeBucketList(value, fallback) {
  if (Array.isArray(value)) {
    const parsed = value.map((entry) => String(entry).trim()).filter(Boolean);
    return parsed.length > 0 ? parsed : [...fallback];
  }
  if (typeof value === 'string') {
    const parsed = value.split(',').map((entry) => entry.trim()).filter(Boolean);
    return parsed.length > 0 ? parsed : [...fallback];
  }
  return [...fallback];
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

function pushMultiArg(target, flag, values) {
  for (const value of values) {
    pushArg(target, flag, value);
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
  if (dryRun) {
    console.log(`[plan] ${formatCommand([process.execPath, scriptPath, ...args])}`);
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
        return;
      }
      reject(new Error(`${path.basename(scriptPath)} exited with code ${code}`));
    });
  });
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function readJsonIfPresent(filePath) {
  if (!filePath) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function pathExists(filePath) {
  if (!filePath) {
    return false;
  }
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function ensureJsonFile(filePath, data) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function statBytes(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return null;
  }
}

function relativeToCwd(filePath) {
  if (!filePath) {
    return null;
  }
  const relative = path.relative(process.cwd(), filePath);
  return relative === '' ? '.' : relative.replace(/\\/g, '/');
}

function resolvePathFromSource(value, { configBaseDir, activeSnapshotPath = null } = {}) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value === 'string' && value.trim().toLowerCase() === 'active') {
    return activeSnapshotPath;
  }
  return resolveCliPath(value, { baseDir: configBaseDir });
}

function resolveCliOrConfigPath(cliValue, configValue, configBaseDir, { activeSnapshotPath = null } = {}) {
  if (cliValue !== undefined && cliValue !== null && cliValue !== '') {
    return resolveCliPath(cliValue);
  }
  return resolvePathFromSource(configValue, { configBaseDir, activeSnapshotPath });
}

function validateCandidateDefinitions(candidates) {
  const seen = new Set();
  for (const candidate of candidates) {
    if (seen.has(candidate.key)) {
      throw new Error(`Duplicate candidate key: ${candidate.key}`);
    }
    seen.add(candidate.key);
  }
}

function createStepSignature({ toolPath, args, outputs }) {
  return sha256(JSON.stringify({ toolPath, args, outputs }));
}

async function writeStatusFile(statusPath, status) {
  await ensureJsonFile(statusPath, status);
}

function loadStatusFile(statusPath, defaults) {
  const loaded = readJsonIfPresent(statusPath);
  if (!loaded || typeof loaded !== 'object') {
    return cloneJsonValue(defaults);
  }
  return {
    ...cloneJsonValue(defaults),
    ...loaded,
    steps: isPlainObject(loaded.steps) ? loaded.steps : {},
  };
}

async function runTrackedStep({
  status,
  statusPath,
  stepKey,
  description,
  toolPath,
  toolArgs,
  outputs,
  dryRun,
  resume,
  cwd,
}) {
  const signature = createStepSignature({ toolPath, args: toolArgs, outputs });
  const prior = status.steps?.[stepKey] ?? null;
  const outputsExist = outputs.every((target) => pathExists(target));

  if (resume && prior?.status === 'success' && prior.signature === signature && outputsExist) {
    status.steps[stepKey] = {
      ...prior,
      skippedAt: new Date().toISOString(),
      skipReason: 'resume-signature-match',
      outputs: outputs.map((target) => relativeToCwd(target)),
    };
    await writeStatusFile(statusPath, status);
    console.log(`[suite] skip ${description} (${stepKey})`);
    return { status: 'skipped' };
  }

  status.steps[stepKey] = {
    status: dryRun ? 'planned' : 'running',
    description,
    command: formatCommand([process.execPath, toolPath, ...toolArgs]),
    signature,
    outputs: outputs.map((target) => relativeToCwd(target)),
    startedAt: new Date().toISOString(),
  };
  await writeStatusFile(statusPath, status);

  console.log(`[suite] ${description}`);
  try {
    await runNodeScript(toolPath, toolArgs, { cwd, dryRun });
    status.steps[stepKey] = {
      ...status.steps[stepKey],
      status: dryRun ? 'planned' : 'success',
      finishedAt: new Date().toISOString(),
    };
    await writeStatusFile(statusPath, status);
    return { status: dryRun ? 'planned' : 'success' };
  } catch (error) {
    status.steps[stepKey] = {
      ...status.steps[stepKey],
      status: 'failed',
      finishedAt: new Date().toISOString(),
      error: error.message,
    };
    await writeStatusFile(statusPath, status);
    throw error;
  }
}

async function materializeActiveProfileSnapshots(sharedDir) {
  const evaluationPath = path.join(sharedDir, 'active-evaluation-profile.snapshot.json');
  const moveOrderingPath = ACTIVE_MOVE_ORDERING_PROFILE ? path.join(sharedDir, 'active-move-ordering-profile.snapshot.json') : null;
  const mpcPath = ACTIVE_MPC_PROFILE ? path.join(sharedDir, 'active-mpc-profile.snapshot.json') : null;
  const tuplePath = ACTIVE_TUPLE_RESIDUAL_PROFILE ? path.join(sharedDir, 'active-tuple-residual-profile.snapshot.json') : null;

  await ensureJsonFile(evaluationPath, ACTIVE_EVALUATION_PROFILE ?? null);
  if (moveOrderingPath) {
    await ensureJsonFile(moveOrderingPath, ACTIVE_MOVE_ORDERING_PROFILE);
  }
  if (mpcPath) {
    await ensureJsonFile(mpcPath, ACTIVE_MPC_PROFILE);
  }
  if (tuplePath) {
    await ensureJsonFile(tuplePath, ACTIVE_TUPLE_RESIDUAL_PROFILE);
  }

  return {
    evaluation: evaluationPath,
    moveOrdering: moveOrderingPath,
    mpc: mpcPath,
    tuple: tuplePath,
  };
}

function createDefaultOutputPaths(outputDir, candidateKey) {
  const candidateDir = path.join(outputDir, 'candidates', candidateKey);
  const benchmarksDir = path.join(candidateDir, 'benchmarks');
  return {
    candidateDir,
    benchmarksDir,
    rawMpcProfilePath: path.join(candidateDir, 'trained-mpc-profile.raw.json'),
    finalMpcProfilePath: path.join(candidateDir, 'trained-mpc-profile.json'),
    generatedModulePath: path.join(candidateDir, 'learned-eval-profile.generated.js'),
    depthBenchmarkPath: path.join(benchmarksDir, 'depth.benchmark.json'),
    exactBenchmarkPath: path.join(benchmarksDir, 'exact.benchmark.json'),
    statusPath: path.join(candidateDir, 'candidate-status.json'),
    configPath: path.join(candidateDir, 'candidate-config.resolved.json'),
  };
}

function sumCaseMetric(cases, pathKeys) {
  let total = 0;
  for (const entry of cases) {
    let cursor = entry;
    for (const key of pathKeys) {
      cursor = cursor?.[key];
    }
    const numeric = Number(cursor);
    if (Number.isFinite(numeric)) {
      total += numeric;
    }
  }
  return total;
}

function summarizeMpcProfile(profile) {
  if (!profile || typeof profile !== 'object') {
    return null;
  }
  const calibrations = Array.isArray(profile.calibrations) ? profile.calibrations : [];
  const usable = calibrations.filter((entry) => entry?.usable);
  return {
    name: profile.name ?? null,
    runtime: profile.runtime ?? null,
    usableCalibrationCount: usable.length,
    totalCalibrationCount: calibrations.length,
    usableKeys: usable.map((entry) => entry.key ?? entry.label ?? null).filter(Boolean),
    matchedSamples: profile.diagnostics?.matchedSamples ?? null,
    matchedBucketAssignments: profile.diagnostics?.matchedBucketAssignments ?? null,
    acceptedSamples: profile.diagnostics?.acceptedSamples ?? null,
  };
}

function summarizeDepthBenchmark(benchmark) {
  if (!benchmark || typeof benchmark !== 'object') {
    return null;
  }
  const cases = Array.isArray(benchmark.cases) ? benchmark.cases : [];
  return {
    cases: benchmark.overall?.cases ?? null,
    identicalBestMoveCases: benchmark.overall?.identicalBestMoveCases ?? null,
    nodeDeltaPercent: benchmark.overall?.nodeDeltaPercent ?? null,
    elapsedDeltaPercent: benchmark.overall?.elapsedDeltaPercent ?? null,
    candidateMpcProbes: sumCaseMetric(cases, ['candidate', 'mpcProbes']),
    candidateMpcHighProbes: sumCaseMetric(cases, ['candidate', 'mpcHighProbes']),
    candidateMpcHighCutoffs: sumCaseMetric(cases, ['candidate', 'mpcHighCutoffs']),
    candidateMpcLowProbes: sumCaseMetric(cases, ['candidate', 'mpcLowProbes']),
    candidateMpcLowCutoffs: sumCaseMetric(cases, ['candidate', 'mpcLowCutoffs']),
  };
}

function summarizeExactBenchmark(benchmark) {
  if (!benchmark || typeof benchmark !== 'object') {
    return null;
  }
  const cases = Array.isArray(benchmark.cases) ? benchmark.cases : [];
  return {
    cases: benchmark.overall?.cases ?? null,
    exactCases: benchmark.overall?.exactCases ?? null,
    identicalScoreCases: benchmark.overall?.identicalScoreCases ?? null,
    identicalBestMoveCases: benchmark.overall?.identicalBestMoveCases ?? null,
    nodeDeltaPercent: benchmark.overall?.nodeDeltaPercent ?? null,
    elapsedDeltaPercent: benchmark.overall?.elapsedDeltaPercent ?? null,
    candidateMpcProbes: sumCaseMetric(cases, ['candidate', 'mpcProbes']),
    candidateMpcHighProbes: sumCaseMetric(cases, ['candidate', 'mpcHighProbes']),
    candidateMpcHighCutoffs: sumCaseMetric(cases, ['candidate', 'mpcHighCutoffs']),
    candidateMpcLowProbes: sumCaseMetric(cases, ['candidate', 'mpcLowProbes']),
    candidateMpcLowCutoffs: sumCaseMetric(cases, ['candidate', 'mpcLowCutoffs']),
  };
}

function summarizeCandidateOutputs(candidate, paths) {
  return {
    key: candidate.key,
    name: candidate.name,
    rawMpcProfilePath: relativeToCwd(paths.rawMpcProfilePath),
    finalMpcProfilePath: relativeToCwd(paths.finalMpcProfilePath),
    generatedModulePath: relativeToCwd(paths.generatedModulePath),
    generatedModuleBytes: statBytes(paths.generatedModulePath),
    rawProfile: summarizeMpcProfile(readJsonIfPresent(paths.rawMpcProfilePath)),
    finalProfile: summarizeMpcProfile(readJsonIfPresent(paths.finalMpcProfilePath)),
    depthBenchmark: summarizeDepthBenchmark(readJsonIfPresent(paths.depthBenchmarkPath)),
    exactBenchmark: summarizeExactBenchmark(readJsonIfPresent(paths.exactBenchmarkPath)),
  };
}

function normalizeCandidate(rawCandidate, defaults, configBaseDir, index) {
  const merged = deepMerge(defaults, rawCandidate ?? {});
  const key = slugify(rawCandidate?.key ?? rawCandidate?.name ?? `candidate-${index + 1}`);
  const runtimeVariant = {
    defaultMode: normalizeMpcMode(merged.runtimeVariant?.defaultMode, 'high') ?? 'high',
    enableHighCut: merged.runtimeVariant?.enableHighCut === undefined ? null : toBoolean(merged.runtimeVariant?.enableHighCut, true),
    enableLowCut: merged.runtimeVariant?.enableLowCut === undefined ? null : toBoolean(merged.runtimeVariant?.enableLowCut, false),
    maxWindow: Math.max(1, toFiniteInteger(merged.runtimeVariant?.maxWindow, 1)),
    minDepth: Math.max(1, toFiniteInteger(merged.runtimeVariant?.minDepth, 2)),
    minDepthGap: Math.max(1, toFiniteInteger(merged.runtimeVariant?.minDepthGap, 2)),
    maxDepthDistance: Math.max(0, toFiniteInteger(merged.runtimeVariant?.maxDepthDistance, 1)),
    minPly: Math.max(0, toFiniteInteger(merged.runtimeVariant?.minPly, 1)),
    maxChecksPerNode: Math.max(1, toFiniteInteger(merged.runtimeVariant?.maxChecksPerNode ?? merged.runtimeVariant?.maxTriesPerNode, 1)),
    intervalScale: Math.max(0, toFiniteNumber(merged.runtimeVariant?.intervalScale, 1.0)),
    highScale: Math.max(0, toFiniteNumber(merged.runtimeVariant?.highScale ?? merged.runtimeVariant?.highResidualScale, 1.0)),
    lowScale: Math.max(0, toFiniteNumber(merged.runtimeVariant?.lowScale ?? merged.runtimeVariant?.lowResidualScale, 1.0)),
    depthDistanceScale: Math.max(1, toFiniteNumber(merged.runtimeVariant?.depthDistanceScale, 1.25)),
  };

  return {
    key,
    name: String(rawCandidate?.name ?? rawCandidate?.label ?? key),
    description: typeof merged.description === 'string' ? merged.description : null,
    calibrationBuckets: normalizeBucketList(merged.calibrationBuckets, DEFAULT_BASELINE_BUCKETS),
    sampleStride: Math.max(1, toFiniteInteger(merged.sampleStride, 200)),
    sampleResidue: Math.max(0, toFiniteInteger(merged.sampleResidue, 0)),
    maxSamplesPerBucket: Math.max(1, toFiniteInteger(merged.maxSamplesPerBucket, 400)),
    holdoutMod: Math.max(1, toFiniteInteger(merged.holdoutMod, 10)),
    holdoutResidue: Math.max(0, toFiniteInteger(merged.holdoutResidue, 0)),
    targetHoldoutCoverage: toFiniteNumber(merged.targetHoldoutCoverage, 0.99),
    targetHighHoldoutCoverage: toFiniteNumber(merged.targetHighHoldoutCoverage, toFiniteNumber(merged.targetHoldoutCoverage, 0.99)),
    targetLowHoldoutCoverage: toFiniteNumber(merged.targetLowHoldoutCoverage, toFiniteNumber(merged.targetHoldoutCoverage, 0.99)),
    timeLimitMs: Math.max(1, toFiniteInteger(merged.timeLimitMs, 120000)),
    progressEvery: Math.max(0, toFiniteInteger(merged.progressEvery, 20)),
    maxTableEntries: Math.max(1, toFiniteInteger(merged.maxTableEntries, 200000)),
    aspirationWindow: Math.max(0, toFiniteInteger(merged.aspirationWindow, 40)),
    zValues: normalizeNumberList(merged.zValues, [1, 1.5, 1.96, 2.5, 3]),
    runtimeVariant,
    exportModule: toBoolean(merged.exportModule, true),
    benchmarks: {
      depth: {
        enabled: toBoolean(merged.benchmarks?.depth?.enabled, false),
        empties: normalizeIntegerList(merged.benchmarks?.depth?.empties, [18, 22, 26, 30]),
        seedStart: Math.max(1, toFiniteInteger(merged.benchmarks?.depth?.seedStart, 1)),
        seedCount: Math.max(1, toFiniteInteger(merged.benchmarks?.depth?.seedCount, 6)),
        repetitions: Math.max(1, toFiniteInteger(merged.benchmarks?.depth?.repetitions, 1)),
        timeLimitMs: Math.max(50, toFiniteInteger(merged.benchmarks?.depth?.timeLimitMs, 2000)),
        maxDepth: Math.max(1, toFiniteInteger(merged.benchmarks?.depth?.maxDepth, 8)),
        exactEndgameEmpties: Math.max(0, toFiniteInteger(merged.benchmarks?.depth?.exactEndgameEmpties, 10)),
        baselineMpcMode: normalizeMpcMode(merged.benchmarks?.depth?.baselineMpcMode, null),
        candidateMpcMode: normalizeMpcMode(merged.benchmarks?.depth?.candidateMpcMode, null),
      },
      exact: {
        enabled: toBoolean(merged.benchmarks?.exact?.enabled, false),
        empties: normalizeIntegerList(merged.benchmarks?.exact?.empties, [10, 12, 14]),
        seedStart: Math.max(1, toFiniteInteger(merged.benchmarks?.exact?.seedStart, 1)),
        seedCount: Math.max(1, toFiniteInteger(merged.benchmarks?.exact?.seedCount, 6)),
        repetitions: Math.max(1, toFiniteInteger(merged.benchmarks?.exact?.repetitions, 1)),
        timeLimitMs: Math.max(50, toFiniteInteger(merged.benchmarks?.exact?.timeLimitMs, 60000)),
        maxDepth: Math.max(1, toFiniteInteger(merged.benchmarks?.exact?.maxDepth, 12)),
        baselineMpcMode: normalizeMpcMode(merged.benchmarks?.exact?.baselineMpcMode, null),
        candidateMpcMode: normalizeMpcMode(merged.benchmarks?.exact?.candidateMpcMode, null),
      },
    },
    outputDir: resolvePathFromSource(merged.outputDir, { configBaseDir }),
  };
}

function resolveCandidates({ rawCandidates, defaults, configBaseDir }) {
  const candidateInputs = rawCandidates.length > 0 ? rawCandidates : DEFAULT_CANDIDATES;
  const normalized = candidateInputs.map((candidate, index) => normalizeCandidate(candidate, defaults, configBaseDir, index));
  validateCandidateDefinitions(normalized);
  return normalized;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const configPath = args.config ? resolveCliPath(args.config) : null;
const rawConfig = configPath ? (readJsonIfPresent(configPath) ?? {}) : {};
if (!isPlainObject(rawConfig)) {
  throw new Error('Config JSON must be an object.');
}
const configBaseDir = configPath ? path.dirname(configPath) : process.cwd();
const mergedConfig = deepMerge(DEFAULT_CONFIG, rawConfig);

const cliInputValues = [...ensureArray(args.input), ...ensureArray(args['input-dir'])];
const inputValues = cliInputValues.length > 0
  ? cliInputValues
  : [...ensureArray(rawConfig.input), ...ensureArray(rawConfig.inputs), ...ensureArray(mergedConfig.input), ...ensureArray(mergedConfig.inputs)];
if (inputValues.length === 0) {
  printUsage();
  process.exit(1);
}

const outputDir = resolveCliOrConfigPath(args['output-dir'], mergedConfig.outputDir, configBaseDir)
  ?? resolveCliPath('tools/evaluator-training/out/mpc-candidate-training-suite');
const dryRun = Boolean(args['plan-only'] || args['dry-run']);
const resume = Boolean(args.resume);
const continueOnError = Boolean(args['continue-on-error'] ?? mergedConfig.continueOnError);
const moduleFormat = typeof args['module-format'] === 'string' && args['module-format'].trim() !== ''
  ? args['module-format'].trim()
  : String(mergedConfig.moduleFormat ?? 'compact');
const inputPaths = inputValues.map((value) => (
  cliInputValues.length > 0 ? resolveCliPath(value) : resolveCliPath(value, { baseDir: configBaseDir })
));
const candidateDefaults = mergedConfig.defaults ?? DEFAULT_CONFIG.defaults;
const normalizedCandidates = resolveCandidates({
  rawCandidates: Array.isArray(mergedConfig.candidates) ? mergedConfig.candidates : [],
  defaults: candidateDefaults,
  configBaseDir,
});

await fs.promises.mkdir(outputDir, { recursive: true });
const sharedDir = path.join(outputDir, 'shared');
await fs.promises.mkdir(sharedDir, { recursive: true });
const activeSnapshots = await materializeActiveProfileSnapshots(sharedDir);

const sharedEvaluationProfilePath = resolveCliOrConfigPath(
  args['evaluation-profile-json'],
  mergedConfig.sharedProfiles?.evaluationProfileJson,
  configBaseDir,
  { activeSnapshotPath: activeSnapshots.evaluation },
);
const sharedMoveOrderingProfilePath = resolveCliOrConfigPath(
  args['move-ordering-profile-json'],
  mergedConfig.sharedProfiles?.moveOrderingProfileJson,
  configBaseDir,
  { activeSnapshotPath: activeSnapshots.moveOrdering },
);
const sharedTupleProfilePath = resolveCliOrConfigPath(
  args['tuple-profile-json'],
  mergedConfig.sharedProfiles?.tupleProfileJson,
  configBaseDir,
  { activeSnapshotPath: activeSnapshots.tuple },
);
const sharedBaselineMpcProfilePath = resolveCliOrConfigPath(
  args['baseline-mpc-profile'],
  mergedConfig.sharedProfiles?.baselineMpcProfileJson,
  configBaseDir,
  { activeSnapshotPath: activeSnapshots.mpc },
);

const benchmarkBaseline = {
  evaluationProfilePath: resolveCliOrConfigPath(
    args['benchmark-baseline-evaluation-profile'],
    mergedConfig.benchmarkBaseline?.evaluationProfileJson,
    configBaseDir,
    { activeSnapshotPath: sharedEvaluationProfilePath },
  ) ?? sharedEvaluationProfilePath,
  moveOrderingProfilePath: resolveCliOrConfigPath(
    args['benchmark-baseline-move-ordering-profile'],
    mergedConfig.benchmarkBaseline?.moveOrderingProfileJson,
    configBaseDir,
    { activeSnapshotPath: sharedMoveOrderingProfilePath },
  ) ?? sharedMoveOrderingProfilePath,
  tupleProfilePath: resolveCliOrConfigPath(
    args['benchmark-baseline-tuple-profile'],
    mergedConfig.benchmarkBaseline?.tupleProfileJson,
    configBaseDir,
    { activeSnapshotPath: sharedTupleProfilePath },
  ) ?? sharedTupleProfilePath,
  mpcProfilePath: resolveCliOrConfigPath(
    args['benchmark-baseline-mpc-profile'],
    mergedConfig.benchmarkBaseline?.mpcProfileJson,
    configBaseDir,
    { activeSnapshotPath: sharedBaselineMpcProfilePath },
  ) ?? sharedBaselineMpcProfilePath,
  mpcMode: normalizeMpcMode(args['benchmark-baseline-mpc-mode'], normalizeMpcMode(mergedConfig.benchmarkBaseline?.mpcMode, null)),
};

const toolPaths = {
  calibrateMpc: resolveTrainingToolPath('calibrate-mpc-profile.mjs'),
  makeMpcVariant: resolveTrainingToolPath('make-mpc-runtime-variant.mjs'),
  exportModule: resolveTrainingToolPath('export-profile-module.mjs'),
  benchmarkDepth: resolveTrainingToolPath('benchmark-depth-search-profile.mjs'),
  benchmarkExact: resolveTrainingToolPath('benchmark-exact-search-profile.mjs'),
};

const resolvedRunConfig = {
  generatedAt: new Date().toISOString(),
  configPath: relativeToCwd(configPath),
  outputDir: relativeToCwd(outputDir),
  moduleFormat,
  dryRun,
  resume,
  continueOnError,
  inputPaths: inputPaths.map((value) => relativeToCwd(value)),
  sharedProfiles: {
    activeEvaluationSnapshot: relativeToCwd(activeSnapshots.evaluation),
    activeMoveOrderingSnapshot: relativeToCwd(activeSnapshots.moveOrdering),
    activeTupleSnapshot: relativeToCwd(activeSnapshots.tuple),
    activeMpcSnapshot: relativeToCwd(activeSnapshots.mpc),
    evaluationProfilePath: relativeToCwd(sharedEvaluationProfilePath),
    moveOrderingProfilePath: relativeToCwd(sharedMoveOrderingProfilePath),
    tupleProfilePath: relativeToCwd(sharedTupleProfilePath),
    baselineMpcProfilePath: relativeToCwd(sharedBaselineMpcProfilePath),
  },
  benchmarkBaseline: {
    evaluationProfilePath: relativeToCwd(benchmarkBaseline.evaluationProfilePath),
    moveOrderingProfilePath: relativeToCwd(benchmarkBaseline.moveOrderingProfilePath),
    tupleProfilePath: relativeToCwd(benchmarkBaseline.tupleProfilePath),
    mpcProfilePath: relativeToCwd(benchmarkBaseline.mpcProfilePath),
    mpcMode: benchmarkBaseline.mpcMode,
  },
  candidates: normalizedCandidates,
};
await ensureJsonFile(path.join(outputDir, 'suite-config.resolved.json'), resolvedRunConfig);

console.log(`[suite] candidates=${formatInteger(normalizedCandidates.length)} output=${relativeToCwd(outputDir)}`);
if (resume) {
  console.log('[suite] resume enabled');
}
if (dryRun) {
  console.log('[suite] plan-only mode; commands will not be executed');
}

const suiteSummary = {
  generatedAt: new Date().toISOString(),
  outputDir: relativeToCwd(outputDir),
  dryRun,
  resume,
  continueOnError,
  sharedEvaluationProfilePath: relativeToCwd(sharedEvaluationProfilePath),
  sharedMoveOrderingProfilePath: relativeToCwd(sharedMoveOrderingProfilePath),
  sharedTupleProfilePath: relativeToCwd(sharedTupleProfilePath),
  sharedBaselineMpcProfilePath: relativeToCwd(sharedBaselineMpcProfilePath),
  benchmarkBaseline: {
    evaluationProfilePath: relativeToCwd(benchmarkBaseline.evaluationProfilePath),
    moveOrderingProfilePath: relativeToCwd(benchmarkBaseline.moveOrderingProfilePath),
    tupleProfilePath: relativeToCwd(benchmarkBaseline.tupleProfilePath),
    mpcProfilePath: relativeToCwd(benchmarkBaseline.mpcProfilePath),
    mpcMode: benchmarkBaseline.mpcMode,
  },
  candidates: [],
  successCount: 0,
  failureCount: 0,
};

for (const candidate of normalizedCandidates) {
  const candidateRootDir = candidate.outputDir ? path.resolve(outputDir, candidate.outputDir) : outputDir;
  const candidatePaths = createDefaultOutputPaths(candidateRootDir, candidate.key);
  await fs.promises.mkdir(candidatePaths.candidateDir, { recursive: true });
  await fs.promises.mkdir(candidatePaths.benchmarksDir, { recursive: true });

  const candidateStatus = loadStatusFile(candidatePaths.statusPath, {
    scope: 'candidate',
    key: candidate.key,
    name: candidate.name,
    createdAt: new Date().toISOString(),
    steps: {},
  });

  const resolvedCandidateConfig = {
    generatedAt: new Date().toISOString(),
    key: candidate.key,
    name: candidate.name,
    description: candidate.description,
    calibrationBuckets: candidate.calibrationBuckets,
    sampleStride: candidate.sampleStride,
    sampleResidue: candidate.sampleResidue,
    maxSamplesPerBucket: candidate.maxSamplesPerBucket,
    holdoutMod: candidate.holdoutMod,
    holdoutResidue: candidate.holdoutResidue,
    targetHoldoutCoverage: candidate.targetHoldoutCoverage,
    targetHighHoldoutCoverage: candidate.targetHighHoldoutCoverage,
    targetLowHoldoutCoverage: candidate.targetLowHoldoutCoverage,
    timeLimitMs: candidate.timeLimitMs,
    progressEvery: candidate.progressEvery,
    maxTableEntries: candidate.maxTableEntries,
    aspirationWindow: candidate.aspirationWindow,
    zValues: candidate.zValues,
    runtimeVariant: candidate.runtimeVariant,
    exportModule: candidate.exportModule,
    benchmarks: candidate.benchmarks,
    sharedEvaluationProfilePath: relativeToCwd(sharedEvaluationProfilePath),
    sharedMoveOrderingProfilePath: relativeToCwd(sharedMoveOrderingProfilePath),
    sharedTupleProfilePath: relativeToCwd(sharedTupleProfilePath),
    sharedBaselineMpcProfilePath: relativeToCwd(sharedBaselineMpcProfilePath),
    benchmarkBaseline,
    outputPaths: Object.fromEntries(Object.entries(candidatePaths).map(([key, value]) => [key, relativeToCwd(value)])),
  };
  await ensureJsonFile(candidatePaths.configPath, resolvedCandidateConfig);

  const summaryEntry = {
    key: candidate.key,
    name: candidate.name,
    status: 'success',
    candidateDir: relativeToCwd(candidatePaths.candidateDir),
    resolvedConfigPath: relativeToCwd(candidatePaths.configPath),
    steps: {},
  };

  try {
    const calibrateArgs = [];
    pushMultiArg(calibrateArgs, 'input', inputPaths);
    pushArg(calibrateArgs, 'evaluation-profile-json', sharedEvaluationProfilePath);
    pushArg(calibrateArgs, 'move-ordering-profile-json', sharedMoveOrderingProfilePath);
    pushArg(calibrateArgs, 'calibration-buckets', candidate.calibrationBuckets.join(','));
    pushArg(calibrateArgs, 'sample-stride', candidate.sampleStride);
    pushArg(calibrateArgs, 'sample-residue', candidate.sampleResidue);
    pushArg(calibrateArgs, 'max-samples-per-bucket', candidate.maxSamplesPerBucket);
    pushArg(calibrateArgs, 'holdout-mod', candidate.holdoutMod);
    pushArg(calibrateArgs, 'holdout-residue', candidate.holdoutResidue);
    pushArg(calibrateArgs, 'target-holdout-coverage', candidate.targetHoldoutCoverage);
    pushArg(calibrateArgs, 'target-high-holdout-coverage', candidate.targetHighHoldoutCoverage);
    pushArg(calibrateArgs, 'target-low-holdout-coverage', candidate.targetLowHoldoutCoverage);
    pushArg(calibrateArgs, 'time-limit-ms', candidate.timeLimitMs);
    pushArg(calibrateArgs, 'progress-every', candidate.progressEvery);
    pushArg(calibrateArgs, 'max-table-entries', candidate.maxTableEntries);
    pushArg(calibrateArgs, 'aspiration-window', candidate.aspirationWindow);
    pushArg(calibrateArgs, 'z-values', candidate.zValues.join(','));
    pushArg(calibrateArgs, 'output-json', candidatePaths.rawMpcProfilePath);

    const calibrateResult = await runTrackedStep({
      status: candidateStatus,
      statusPath: candidatePaths.statusPath,
      stepKey: 'calibrate-mpc-profile',
      description: `${candidate.key}: calibrate MPC`,
      toolPath: toolPaths.calibrateMpc,
      toolArgs: calibrateArgs,
      outputs: [candidatePaths.rawMpcProfilePath],
      dryRun,
      resume,
      cwd: process.cwd(),
    });
    summaryEntry.steps.calibrate = calibrateResult.status;

    const variantArgs = [];
    pushArg(variantArgs, 'mpc-json', candidatePaths.rawMpcProfilePath);
    pushArg(variantArgs, 'output-json', candidatePaths.finalMpcProfilePath);
    pushArg(variantArgs, 'name', `trained-mpc-${candidate.key}`);
    pushArg(variantArgs, 'description', candidate.description ?? `${candidate.name} runtime-tuned MPC variant`);
    pushArg(variantArgs, 'default-mode', candidate.runtimeVariant.defaultMode);
    pushArg(variantArgs, 'enable-high-cut', candidate.runtimeVariant.enableHighCut === null ? null : (candidate.runtimeVariant.enableHighCut ? 'on' : 'off'));
    pushArg(variantArgs, 'enable-low-cut', candidate.runtimeVariant.enableLowCut === null ? null : (candidate.runtimeVariant.enableLowCut ? 'on' : 'off'));
    pushArg(variantArgs, 'max-window', candidate.runtimeVariant.maxWindow);
    pushArg(variantArgs, 'min-depth', candidate.runtimeVariant.minDepth);
    pushArg(variantArgs, 'min-depth-gap', candidate.runtimeVariant.minDepthGap);
    pushArg(variantArgs, 'max-depth-distance', candidate.runtimeVariant.maxDepthDistance);
    pushArg(variantArgs, 'min-ply', candidate.runtimeVariant.minPly);
    pushArg(variantArgs, 'max-checks-per-node', candidate.runtimeVariant.maxChecksPerNode);
    pushArg(variantArgs, 'interval-scale', candidate.runtimeVariant.intervalScale);
    pushArg(variantArgs, 'high-scale', candidate.runtimeVariant.highScale);
    pushArg(variantArgs, 'low-scale', candidate.runtimeVariant.lowScale);
    pushArg(variantArgs, 'depth-distance-scale', candidate.runtimeVariant.depthDistanceScale);

    const variantResult = await runTrackedStep({
      status: candidateStatus,
      statusPath: candidatePaths.statusPath,
      stepKey: 'make-mpc-runtime-variant',
      description: `${candidate.key}: derive runtime variant`,
      toolPath: toolPaths.makeMpcVariant,
      toolArgs: variantArgs,
      outputs: [candidatePaths.finalMpcProfilePath],
      dryRun,
      resume,
      cwd: process.cwd(),
    });
    summaryEntry.steps.variant = variantResult.status;

    if (candidate.exportModule) {
      const exportArgs = [];
      pushArg(exportArgs, 'evaluation-json', sharedEvaluationProfilePath);
      pushArg(exportArgs, 'move-ordering-json', sharedMoveOrderingProfilePath);
      pushArg(exportArgs, 'tuple-json', sharedTupleProfilePath);
      pushArg(exportArgs, 'mpc-json', candidatePaths.finalMpcProfilePath);
      pushArg(exportArgs, 'output-module', candidatePaths.generatedModulePath);
      pushArg(exportArgs, 'module-format', moduleFormat);

      const exportResult = await runTrackedStep({
        status: candidateStatus,
        statusPath: candidatePaths.statusPath,
        stepKey: 'export-generated-module',
        description: `${candidate.key}: export generated module`,
        toolPath: toolPaths.exportModule,
        toolArgs: exportArgs,
        outputs: [candidatePaths.generatedModulePath],
        dryRun,
        resume,
        cwd: process.cwd(),
      });
      summaryEntry.steps.exportModule = exportResult.status;
    } else {
      summaryEntry.steps.exportModule = 'disabled';
    }

    if (candidate.benchmarks.depth.enabled) {
      const depthArgs = [];
      pushArg(depthArgs, 'baseline-profile', benchmarkBaseline.evaluationProfilePath);
      pushArg(depthArgs, 'candidate-profile', sharedEvaluationProfilePath);
      pushArg(depthArgs, 'baseline-move-ordering-profile', benchmarkBaseline.moveOrderingProfilePath);
      pushArg(depthArgs, 'candidate-move-ordering-profile', sharedMoveOrderingProfilePath);
      pushArg(depthArgs, 'baseline-tuple-profile', benchmarkBaseline.tupleProfilePath);
      pushArg(depthArgs, 'candidate-tuple-profile', sharedTupleProfilePath);
      pushArg(depthArgs, 'baseline-mpc-profile', benchmarkBaseline.mpcProfilePath);
      pushArg(depthArgs, 'candidate-mpc-profile', candidatePaths.finalMpcProfilePath);
      pushArg(depthArgs, 'baseline-mpc-mode', candidate.benchmarks.depth.baselineMpcMode ?? benchmarkBaseline.mpcMode);
      pushArg(depthArgs, 'candidate-mpc-mode', candidate.benchmarks.depth.candidateMpcMode ?? candidate.runtimeVariant.defaultMode);
      pushArg(depthArgs, 'output-json', candidatePaths.depthBenchmarkPath);
      pushArg(depthArgs, 'empties', candidate.benchmarks.depth.empties.join(','));
      pushArg(depthArgs, 'seed-start', candidate.benchmarks.depth.seedStart);
      pushArg(depthArgs, 'seed-count', candidate.benchmarks.depth.seedCount);
      pushArg(depthArgs, 'repetitions', candidate.benchmarks.depth.repetitions);
      pushArg(depthArgs, 'time-limit-ms', candidate.benchmarks.depth.timeLimitMs);
      pushArg(depthArgs, 'max-depth', candidate.benchmarks.depth.maxDepth);
      pushArg(depthArgs, 'exact-endgame-empties', candidate.benchmarks.depth.exactEndgameEmpties);

      const depthResult = await runTrackedStep({
        status: candidateStatus,
        statusPath: candidatePaths.statusPath,
        stepKey: 'benchmark-depth-search-profile',
        description: `${candidate.key}: benchmark depth search`,
        toolPath: toolPaths.benchmarkDepth,
        toolArgs: depthArgs,
        outputs: [candidatePaths.depthBenchmarkPath],
        dryRun,
        resume,
        cwd: process.cwd(),
      });
      summaryEntry.steps.depthBenchmark = depthResult.status;
    } else {
      summaryEntry.steps.depthBenchmark = 'disabled';
    }

    if (candidate.benchmarks.exact.enabled) {
      const exactArgs = [];
      pushArg(exactArgs, 'baseline-profile', benchmarkBaseline.evaluationProfilePath);
      pushArg(exactArgs, 'candidate-profile', sharedEvaluationProfilePath);
      pushArg(exactArgs, 'baseline-move-ordering-profile', benchmarkBaseline.moveOrderingProfilePath);
      pushArg(exactArgs, 'candidate-move-ordering-profile', sharedMoveOrderingProfilePath);
      pushArg(exactArgs, 'baseline-tuple-profile', benchmarkBaseline.tupleProfilePath);
      pushArg(exactArgs, 'candidate-tuple-profile', sharedTupleProfilePath);
      pushArg(exactArgs, 'baseline-mpc-profile', benchmarkBaseline.mpcProfilePath);
      pushArg(exactArgs, 'candidate-mpc-profile', candidatePaths.finalMpcProfilePath);
      pushArg(exactArgs, 'baseline-mpc-mode', candidate.benchmarks.exact.baselineMpcMode ?? benchmarkBaseline.mpcMode);
      pushArg(exactArgs, 'candidate-mpc-mode', candidate.benchmarks.exact.candidateMpcMode ?? candidate.runtimeVariant.defaultMode);
      pushArg(exactArgs, 'output-json', candidatePaths.exactBenchmarkPath);
      pushArg(exactArgs, 'empties', candidate.benchmarks.exact.empties.join(','));
      pushArg(exactArgs, 'seed-start', candidate.benchmarks.exact.seedStart);
      pushArg(exactArgs, 'seed-count', candidate.benchmarks.exact.seedCount);
      pushArg(exactArgs, 'repetitions', candidate.benchmarks.exact.repetitions);
      pushArg(exactArgs, 'time-limit-ms', candidate.benchmarks.exact.timeLimitMs);
      pushArg(exactArgs, 'max-depth', candidate.benchmarks.exact.maxDepth);

      const exactResult = await runTrackedStep({
        status: candidateStatus,
        statusPath: candidatePaths.statusPath,
        stepKey: 'benchmark-exact-search-profile',
        description: `${candidate.key}: benchmark exact search`,
        toolPath: toolPaths.benchmarkExact,
        toolArgs: exactArgs,
        outputs: [candidatePaths.exactBenchmarkPath],
        dryRun,
        resume,
        cwd: process.cwd(),
      });
      summaryEntry.steps.exactBenchmark = exactResult.status;
    } else {
      summaryEntry.steps.exactBenchmark = 'disabled';
    }

    Object.assign(summaryEntry, summarizeCandidateOutputs(candidate, candidatePaths));
    suiteSummary.successCount += 1;
  } catch (error) {
    summaryEntry.status = 'failed';
    summaryEntry.error = error.message;
    suiteSummary.failureCount += 1;
    if (!continueOnError) {
      suiteSummary.candidates.push(summaryEntry);
      await ensureJsonFile(path.join(outputDir, 'suite-summary.json'), suiteSummary);
      throw error;
    }
  }

  suiteSummary.candidates.push(summaryEntry);
  await ensureJsonFile(path.join(outputDir, 'suite-summary.json'), suiteSummary);
}

await ensureJsonFile(path.join(outputDir, 'suite-summary.json'), suiteSummary);
console.log(`[suite] done success=${suiteSummary.successCount} failure=${suiteSummary.failureCount}`);
