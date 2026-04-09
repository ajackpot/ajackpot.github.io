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
  DEFAULT_TUPLE_RESIDUAL_PHASE_BUCKET_KEYS,
  listTupleResidualLayoutNames,
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

const DEFAULT_LAYOUTS = Object.freeze([
  'orthogonal-adjacent-pairs-full-v1',
  'diagonal-adjacent-pairs-full-v1',
  'straight-adjacent-pairs-full-v1',
]);

const DEFAULT_CONFIG = Object.freeze({
  moduleFormat: 'compact',
  targetScale: 3000,
  holdoutMod: 10,
  holdoutResidue: 0,
  progressEvery: 250000,
  continueOnError: false,
  defaults: {
    phaseBuckets: [...DEFAULT_TUPLE_RESIDUAL_PHASE_BUCKET_KEYS],
    tupleLimit: null,
    sampleStride: 4,
    sampleResidue: 0,
    epochs: 1,
    learningRate: 0.05,
    l2: 0.0005,
    gradientClip: 90000,
    minVisits: 32,
    skipDiagnostics: false,
    calibration: {
      enabled: true,
      scope: 'holdout-selected',
      shrink: 1.0,
      maxBiasStones: 1.5,
      limit: null,
    },
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
  phaseTraining: {
    enabled: true,
    lambda: 5000,
    limit: null,
    skipDiagnostics: false,
  },
  sharedProfiles: {
    evaluationProfileJson: null,
    moveOrderingProfileJson: null,
    mpcProfileJson: null,
  },
  benchmarkBaseline: {
    evaluationProfileJson: null,
    moveOrderingProfileJson: null,
    tupleProfileJson: null,
  },
});

function printUsage() {
  const toolPath = displayTrainingToolPath('run-multi-candidate-training-suite.mjs');
  const outputDir = displayTrainingOutputPath('multi-candidate-training-suite');
  console.log(`Usage:
  node ${toolPath} \
    --input <file-or-dir> [--input <file-or-dir> ...] \
    [--output-dir ${outputDir}] \
    [--config tools/evaluator-training/examples/multi-candidate-suite.train-only.example.json] \
    [--layouts orthogonal-adjacent-pairs-full-v1,diagonal-adjacent-pairs-full-v1,straight-adjacent-pairs-full-v1] \
    [--evaluation-profile-json path/to/trained-evaluation-profile.json | --skip-phase-training] \
    [--module-format compact|expanded] [--resume] [--continue-on-error] [--plan-only]

설명:
- 여러 tuple candidate를 **순차적으로**, 그러나 **한 번의 실행으로** train → calibrate → module export까지 수행합니다.
- 필요하면 profile/depth/exact benchmark도 후보별로 이어서 실행할 수 있습니다.
- 실행 상태는 output-dir 안의 status JSON에 남기므로, --resume으로 중단 지점부터 재개할 수 있습니다.
- config JSON을 주면 후보별 hyperparameter/layout/benchmark 설정을 세밀하게 나눌 수 있습니다.
- config를 주지 않으면 --layouts(또는 기본 3-family)와 공통 기본값으로 suite를 구성합니다.
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

function normalizePhaseBucketList(value, fallback) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    const parsed = value.split(',').map((entry) => entry.trim()).filter(Boolean);
    return parsed.length > 0 ? parsed : [...fallback];
  }
  return [...fallback];
}

function normalizeIntegerList(value, fallback) {
  if (Array.isArray(value)) {
    return value.map((entry) => Number(entry)).filter((entry) => Number.isInteger(entry));
  }
  if (typeof value === 'string') {
    return value.split(',').map((entry) => Number(entry.trim())).filter((entry) => Number.isInteger(entry));
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

function createCandidateFromLayout(layoutName) {
  return {
    key: layoutName,
    name: layoutName,
    layoutName,
  };
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

function summarizeCalibration(calibratedProfile) {
  const diagnostics = calibratedProfile?.diagnostics ?? null;
  const calibration = calibratedProfile?.calibration ?? null;
  const verifiedDiagnostics = calibration?.verifiedDiagnostics ?? null;
  return {
    rawHoldoutSelectedMaeInStones: diagnostics?.holdoutSelected?.candidate?.maeInStones ?? null,
    rawHoldoutSelectedMaeDeltaInStones: diagnostics?.holdoutSelected?.delta?.maeInStones ?? null,
    rawHoldoutSelectedRmseInStones: diagnostics?.holdoutSelected?.candidate?.rmseInStones ?? null,
    calibrationScope: calibration?.scope ?? null,
    calibrationBiasDeltas: Array.isArray(calibration?.biasDeltas) ? calibration.biasDeltas : null,
    verifiedHoldoutSelectedMaeInStones: verifiedDiagnostics?.holdoutSelected?.candidate?.maeInStones ?? null,
    verifiedHoldoutSelectedMaeDeltaInStones: verifiedDiagnostics?.holdoutSelected?.delta?.maeInStones ?? null,
    verifiedHoldoutSelectedRmseInStones: verifiedDiagnostics?.holdoutSelected?.candidate?.rmseInStones ?? null,
  };
}

function summarizeProfileBenchmark(benchmark) {
  if (!benchmark) {
    return null;
  }
  const overallDelta = benchmark.overallDelta ?? benchmark.overall?.delta ?? null;
  return {
    candidateMaeInStones: benchmark.candidate?.maeInStones ?? benchmark.overall?.candidate?.maeInStones ?? null,
    maeDeltaInStones: overallDelta?.maeInStones ?? null,
    rmseDeltaInStones: overallDelta?.rmseInStones ?? null,
    cases: benchmark.sampleCount ?? benchmark.overall?.count ?? null,
    benchmarkEvalsPerSec: benchmark.benchmark?.candidate?.evalsPerSec ?? null,
  };
}

function summarizeDepthBenchmark(benchmark) {
  if (!benchmark) {
    return null;
  }
  const overall = benchmark.overall ?? null;
  return {
    cases: overall?.cases ?? null,
    identicalBestMoveCases: overall?.identicalBestMoveCases ?? null,
    nodeDeltaPercent: overall?.nodeDeltaPercent ?? null,
    elapsedDeltaPercent: overall?.elapsedDeltaPercent ?? null,
  };
}

function summarizeExactBenchmark(benchmark) {
  if (!benchmark) {
    return null;
  }
  const overall = benchmark.overall ?? null;
  return {
    cases: overall?.cases ?? null,
    exactCases: overall?.exactCases ?? null,
    identicalScoreCases: overall?.identicalScoreCases ?? null,
    identicalBestMoveCases: overall?.identicalBestMoveCases ?? null,
    nodeDeltaPercent: overall?.nodeDeltaPercent ?? null,
    elapsedDeltaPercent: overall?.elapsedDeltaPercent ?? null,
  };
}

function summarizeCandidateOutputs(candidate, paths) {
  const rawTupleProfile = readJsonIfPresent(paths.rawTupleProfilePath);
  const calibratedTupleProfile = readJsonIfPresent(paths.finalTupleProfilePath);
  const layout = calibratedTupleProfile?.layout ?? rawTupleProfile?.layout ?? null;
  return {
    key: candidate.key,
    name: candidate.name,
    layoutName: candidate.layoutName ?? calibratedTupleProfile?.layoutName ?? rawTupleProfile?.layoutName ?? null,
    tupleCount: layout?.tupleCount ?? (Array.isArray(layout?.tuples) ? layout.tuples.length : null),
    totalTableSize: layout?.totalTableSize ?? null,
    rawTupleProfilePath: relativeToCwd(paths.rawTupleProfilePath),
    finalTupleProfilePath: relativeToCwd(paths.finalTupleProfilePath),
    generatedModulePath: relativeToCwd(paths.generatedModulePath),
    generatedModuleBytes: statBytes(paths.generatedModulePath),
    calibration: summarizeCalibration(calibratedTupleProfile),
    profileBenchmark: summarizeProfileBenchmark(readJsonIfPresent(paths.profileBenchmarkPath)),
    depthBenchmark: summarizeDepthBenchmark(readJsonIfPresent(paths.depthBenchmarkPath)),
    exactBenchmark: summarizeExactBenchmark(readJsonIfPresent(paths.exactBenchmarkPath)),
  };
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
    rawTupleProfilePath: path.join(candidateDir, 'trained-tuple-residual-profile.json'),
    previewModulePath: path.join(candidateDir, 'learned-eval-profile.preview.generated.js'),
    calibratedTupleProfilePath: path.join(candidateDir, 'trained-tuple-residual-profile.calibrated.json'),
    calibrationSummaryPath: path.join(candidateDir, 'tuple-residual-calibration-summary.json'),
    generatedModulePath: path.join(candidateDir, 'learned-eval-profile.generated.js'),
    profileBenchmarkPath: path.join(benchmarksDir, 'profile.benchmark.json'),
    depthBenchmarkPath: path.join(benchmarksDir, 'depth.benchmark.json'),
    exactBenchmarkPath: path.join(benchmarksDir, 'exact.benchmark.json'),
    statusPath: path.join(candidateDir, 'candidate-status.json'),
    configPath: path.join(candidateDir, 'candidate-config.resolved.json'),
  };
}

function resolveCandidates({ rawCandidates, layouts, defaults, configBaseDir }) {
  const candidateInputs = rawCandidates.length > 0
    ? rawCandidates
    : (layouts.length > 0 ? layouts.map((layoutName) => createCandidateFromLayout(layoutName)) : DEFAULT_LAYOUTS.map((layoutName) => createCandidateFromLayout(layoutName)));

  const allowedLayoutNames = new Set(listTupleResidualLayoutNames());
  const normalized = candidateInputs.map((candidate, index) => {
    const key = slugify(candidate.key ?? candidate.name ?? candidate.layoutName ?? candidate.layoutJson ?? `candidate-${index + 1}`);
    const merged = deepMerge(defaults, candidate ?? {});
    const normalizedCandidate = {
      key,
      name: String(candidate.name ?? candidate.label ?? candidate.layoutName ?? key),
      layoutName: typeof merged.layoutName === 'string' && merged.layoutName.trim() !== '' ? merged.layoutName.trim() : null,
      layoutJson: resolvePathFromSource(merged.layoutJson, { configBaseDir }),
      seedProfileJson: resolvePathFromSource(merged.seedProfileJson, { configBaseDir }),
      phaseBuckets: normalizePhaseBucketList(merged.phaseBuckets, DEFAULT_TUPLE_RESIDUAL_PHASE_BUCKET_KEYS),
      tupleLimit: merged.tupleLimit === null ? null : toFiniteInteger(merged.tupleLimit, null),
      sampleStride: Math.max(1, toFiniteInteger(merged.sampleStride, 4)),
      sampleResidue: Math.max(0, toFiniteInteger(merged.sampleResidue, 0)),
      epochs: Math.max(1, toFiniteInteger(merged.epochs, 1)),
      learningRate: toFiniteNumber(merged.learningRate, 0.05),
      l2: toFiniteNumber(merged.l2, 0.0005),
      gradientClip: toFiniteNumber(merged.gradientClip, 90000),
      minVisits: Math.max(0, toFiniteInteger(merged.minVisits, 32)),
      skipDiagnostics: toBoolean(merged.skipDiagnostics, false),
      calibration: {
        enabled: toBoolean(merged.calibration?.enabled, true),
        scope: typeof merged.calibration?.scope === 'string' && merged.calibration.scope.trim() !== ''
          ? merged.calibration.scope.trim()
          : 'holdout-selected',
        shrink: toFiniteNumber(merged.calibration?.shrink, 1.0),
        maxBiasStones: toFiniteNumber(merged.calibration?.maxBiasStones, 1.5),
        limit: merged.calibration?.limit === null ? null : toFiniteInteger(merged.calibration?.limit, null),
      },
      exportModule: toBoolean(merged.exportModule, true),
      benchmarks: {
        profile: {
          enabled: toBoolean(merged.benchmarks?.profile?.enabled, false),
          limit: merged.benchmarks?.profile?.limit === null ? null : toFiniteInteger(merged.benchmarks?.profile?.limit, 50000),
          benchmarkLoops: Math.max(1, toFiniteInteger(merged.benchmarks?.profile?.benchmarkLoops, 200)),
        },
        depth: {
          enabled: toBoolean(merged.benchmarks?.depth?.enabled, false),
          empties: normalizeIntegerList(merged.benchmarks?.depth?.empties, [18, 20, 24]),
          seedStart: Math.max(1, toFiniteInteger(merged.benchmarks?.depth?.seedStart, 1)),
          seedCount: Math.max(1, toFiniteInteger(merged.benchmarks?.depth?.seedCount, 8)),
          repetitions: Math.max(1, toFiniteInteger(merged.benchmarks?.depth?.repetitions, 1)),
          timeLimitMs: Math.max(50, toFiniteInteger(merged.benchmarks?.depth?.timeLimitMs, 2000)),
          maxDepth: Math.max(1, toFiniteInteger(merged.benchmarks?.depth?.maxDepth, 6)),
          exactEndgameEmpties: Math.max(0, toFiniteInteger(merged.benchmarks?.depth?.exactEndgameEmpties, 10)),
        },
        exact: {
          enabled: toBoolean(merged.benchmarks?.exact?.enabled, false),
          empties: normalizeIntegerList(merged.benchmarks?.exact?.empties, [10, 12, 14]),
          seedStart: Math.max(1, toFiniteInteger(merged.benchmarks?.exact?.seedStart, 1)),
          seedCount: Math.max(1, toFiniteInteger(merged.benchmarks?.exact?.seedCount, 12)),
          repetitions: Math.max(1, toFiniteInteger(merged.benchmarks?.exact?.repetitions, 3)),
          timeLimitMs: Math.max(50, toFiniteInteger(merged.benchmarks?.exact?.timeLimitMs, 60000)),
          maxDepth: Math.max(1, toFiniteInteger(merged.benchmarks?.exact?.maxDepth, 12)),
        },
      },
    };

    if (!normalizedCandidate.layoutName && !normalizedCandidate.layoutJson && !normalizedCandidate.seedProfileJson) {
      throw new Error(`Candidate ${normalizedCandidate.key} must specify layoutName, layoutJson, or seedProfileJson.`);
    }
    if (normalizedCandidate.layoutName && !allowedLayoutNames.has(normalizedCandidate.layoutName)) {
      throw new Error(`Unknown tuple layout: ${normalizedCandidate.layoutName}`);
    }
    return normalizedCandidate;
  });

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
  ?? resolveCliPath('tools/evaluator-training/out/multi-candidate-training-suite');
const dryRun = Boolean(args['plan-only'] || args['dry-run']);
const resume = Boolean(args.resume);
const continueOnError = Boolean(args['continue-on-error'] ?? mergedConfig.continueOnError);
const moduleFormat = typeof args['module-format'] === 'string' && args['module-format'].trim() !== ''
  ? args['module-format'].trim()
  : String(mergedConfig.moduleFormat ?? 'compact');
const targetScale = toFiniteInteger(args['target-scale'] ?? mergedConfig.targetScale, 3000);
const holdoutMod = Math.max(1, toFiniteInteger(args['holdout-mod'] ?? mergedConfig.holdoutMod, 10));
const holdoutResidue = Math.max(0, toFiniteInteger(args['holdout-residue'] ?? mergedConfig.holdoutResidue, 0));
const progressEvery = Math.max(0, toFiniteInteger(args['progress-every'] ?? mergedConfig.progressEvery, 250000));
const inputPaths = inputValues.map((value) => (
  cliInputValues.length > 0 ? resolveCliPath(value) : resolveCliPath(value, { baseDir: configBaseDir })
));
const cliLayouts = parseCommaList(args.layouts ?? args.layout ?? args['layout-name']);
const rawCandidates = Array.isArray(mergedConfig.candidates) ? mergedConfig.candidates : [];
const candidateDefaults = mergedConfig.defaults ?? DEFAULT_CONFIG.defaults;
const normalizedCandidates = resolveCandidates({
  rawCandidates,
  layouts: cliLayouts,
  defaults: candidateDefaults,
  configBaseDir,
});

await fs.promises.mkdir(outputDir, { recursive: true });
const sharedDir = path.join(outputDir, 'shared');
await fs.promises.mkdir(sharedDir, { recursive: true });
const activeSnapshots = await materializeActiveProfileSnapshots(sharedDir);

const externalEvaluationProfilePath = resolveCliOrConfigPath(
  args['evaluation-profile-json'],
  mergedConfig.sharedProfiles?.evaluationProfileJson,
  configBaseDir,
  { activeSnapshotPath: activeSnapshots.evaluation },
);
const externalMoveOrderingProfilePath = resolveCliOrConfigPath(
  args['move-ordering-profile-json'],
  mergedConfig.sharedProfiles?.moveOrderingProfileJson,
  configBaseDir,
  { activeSnapshotPath: activeSnapshots.moveOrdering },
);
const externalMpcProfilePath = resolveCliOrConfigPath(
  args['mpc-profile-json'],
  mergedConfig.sharedProfiles?.mpcProfileJson,
  configBaseDir,
  { activeSnapshotPath: activeSnapshots.mpc },
);

let phaseTrainingEnabled = toBoolean(mergedConfig.phaseTraining?.enabled, true);
if (args['skip-phase-training']) {
  phaseTrainingEnabled = false;
}
if (externalEvaluationProfilePath) {
  phaseTrainingEnabled = false;
}

const phaseTrainingOutputPath = resolvePathFromSource(
  mergedConfig.phaseTraining?.outputJson,
  { configBaseDir },
) ?? path.join(sharedDir, 'trained-evaluation-profile.json');
const phaseLambda = toFiniteInteger(args['phase-lambda'] ?? mergedConfig.phaseTraining?.lambda, 5000);
const phaseLimit = mergedConfig.phaseTraining?.limit === null ? null : toFiniteInteger(args['phase-limit'] ?? mergedConfig.phaseTraining?.limit, null);
const phaseSkipDiagnostics = Boolean(args['phase-skip-diagnostics'] ?? mergedConfig.phaseTraining?.skipDiagnostics);
const sharedBenchmarkBaseline = {
  evaluationProfilePath: resolvePathFromSource(mergedConfig.benchmarkBaseline?.evaluationProfileJson, {
    configBaseDir,
    activeSnapshotPath: activeSnapshots.evaluation,
  }),
  moveOrderingProfilePath: resolvePathFromSource(mergedConfig.benchmarkBaseline?.moveOrderingProfileJson, {
    configBaseDir,
    activeSnapshotPath: activeSnapshots.moveOrdering,
  }),
  tupleProfilePath: resolvePathFromSource(mergedConfig.benchmarkBaseline?.tupleProfileJson, {
    configBaseDir,
    activeSnapshotPath: activeSnapshots.tuple,
  }),
};

const toolPaths = {
  trainPhase: resolveTrainingToolPath('train-phase-linear.mjs'),
  trainTuple: resolveTrainingToolPath('train-tuple-residual-profile.mjs'),
  calibrateTuple: resolveTrainingToolPath('calibrate-tuple-residual-profile.mjs'),
  exportModule: resolveTrainingToolPath('export-profile-module.mjs'),
  benchmarkProfile: resolveTrainingToolPath('benchmark-profile.mjs'),
  benchmarkDepth: resolveTrainingToolPath('benchmark-depth-search-profile.mjs'),
  benchmarkExact: resolveTrainingToolPath('benchmark-exact-search-profile.mjs'),
};

const sharedStatusPath = path.join(sharedDir, 'suite-shared-status.json');
const sharedStatus = loadStatusFile(sharedStatusPath, {
  scope: 'shared',
  createdAt: new Date().toISOString(),
  steps: {},
});

const resolvedRunConfig = {
  generatedAt: new Date().toISOString(),
  configPath: relativeToCwd(configPath),
  outputDir: relativeToCwd(outputDir),
  moduleFormat,
  targetScale,
  holdoutMod,
  holdoutResidue,
  progressEvery,
  dryRun,
  resume,
  continueOnError,
  inputPaths: inputPaths.map((value) => relativeToCwd(value)),
  sharedProfiles: {
    activeEvaluationSnapshot: relativeToCwd(activeSnapshots.evaluation),
    activeMoveOrderingSnapshot: relativeToCwd(activeSnapshots.moveOrdering),
    activeMpcSnapshot: relativeToCwd(activeSnapshots.mpc),
    activeTupleSnapshot: relativeToCwd(activeSnapshots.tuple),
    externalEvaluationProfilePath: relativeToCwd(externalEvaluationProfilePath),
    externalMoveOrderingProfilePath: relativeToCwd(externalMoveOrderingProfilePath),
    externalMpcProfilePath: relativeToCwd(externalMpcProfilePath),
  },
  phaseTraining: {
    enabled: phaseTrainingEnabled,
    lambda: phaseLambda,
    limit: phaseLimit,
    skipDiagnostics: phaseSkipDiagnostics,
    outputJson: relativeToCwd(phaseTrainingOutputPath),
  },
  benchmarkBaseline: {
    evaluationProfilePath: relativeToCwd(sharedBenchmarkBaseline.evaluationProfilePath),
    moveOrderingProfilePath: relativeToCwd(sharedBenchmarkBaseline.moveOrderingProfilePath),
    tupleProfilePath: relativeToCwd(sharedBenchmarkBaseline.tupleProfilePath),
  },
  candidates: normalizedCandidates.map((candidate) => ({
    ...candidate,
    layoutJson: relativeToCwd(candidate.layoutJson),
    seedProfileJson: relativeToCwd(candidate.seedProfileJson),
  })),
};
await ensureJsonFile(path.join(outputDir, 'suite-config.resolved.json'), resolvedRunConfig);

console.log(`[suite] candidates=${formatInteger(normalizedCandidates.length)} output=${relativeToCwd(outputDir)}`);
if (resume) {
  console.log('[suite] resume enabled');
}
if (dryRun) {
  console.log('[suite] plan-only mode; commands will not be executed');
}

let sharedEvaluationProfilePath = externalEvaluationProfilePath ?? activeSnapshots.evaluation;
if (phaseTrainingEnabled) {
  const phaseArgs = [];
  pushMultiArg(phaseArgs, 'input', inputPaths);
  pushArg(phaseArgs, 'target-scale', targetScale);
  pushArg(phaseArgs, 'holdout-mod', holdoutMod);
  pushArg(phaseArgs, 'holdout-residue', holdoutResidue);
  pushArg(phaseArgs, 'lambda', phaseLambda);
  pushArg(phaseArgs, 'progress-every', progressEvery);
  pushArg(phaseArgs, 'limit', phaseLimit);
  pushFlag(phaseArgs, 'skip-diagnostics', phaseSkipDiagnostics);
  pushArg(phaseArgs, 'output-json', phaseTrainingOutputPath);

  await runTrackedStep({
    status: sharedStatus,
    statusPath: sharedStatusPath,
    stepKey: 'train-phase-linear',
    description: 'shared phase evaluator training',
    toolPath: toolPaths.trainPhase,
    toolArgs: phaseArgs,
    outputs: [phaseTrainingOutputPath],
    dryRun,
    resume,
    cwd: process.cwd(),
  });
  sharedEvaluationProfilePath = phaseTrainingOutputPath;
}

const sharedMoveOrderingProfilePath = externalMoveOrderingProfilePath ?? activeSnapshots.moveOrdering ?? null;
const sharedMpcProfilePath = externalMpcProfilePath ?? activeSnapshots.mpc ?? null;
const suiteSummary = {
  generatedAt: new Date().toISOString(),
  outputDir: relativeToCwd(outputDir),
  dryRun,
  resume,
  continueOnError,
  sharedEvaluationProfilePath: relativeToCwd(sharedEvaluationProfilePath),
  sharedMoveOrderingProfilePath: relativeToCwd(sharedMoveOrderingProfilePath),
  sharedMpcProfilePath: relativeToCwd(sharedMpcProfilePath),
  candidates: [],
};

for (const candidate of normalizedCandidates) {
  const candidatePaths = createDefaultOutputPaths(outputDir, candidate.key);
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
    layoutName: candidate.layoutName,
    layoutJson: relativeToCwd(candidate.layoutJson),
    seedProfileJson: relativeToCwd(candidate.seedProfileJson),
    phaseBuckets: candidate.phaseBuckets,
    tupleLimit: candidate.tupleLimit,
    sampleStride: candidate.sampleStride,
    sampleResidue: candidate.sampleResidue,
    epochs: candidate.epochs,
    learningRate: candidate.learningRate,
    l2: candidate.l2,
    gradientClip: candidate.gradientClip,
    minVisits: candidate.minVisits,
    skipDiagnostics: candidate.skipDiagnostics,
    calibration: candidate.calibration,
    exportModule: candidate.exportModule,
    benchmarks: candidate.benchmarks,
    outputPaths: Object.fromEntries(Object.entries(candidatePaths).map(([key, value]) => [key, relativeToCwd(value)])),
    sharedEvaluationProfilePath: relativeToCwd(sharedEvaluationProfilePath),
    sharedMoveOrderingProfilePath: relativeToCwd(sharedMoveOrderingProfilePath),
    sharedMpcProfilePath: relativeToCwd(sharedMpcProfilePath),
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
    const trainTupleArgs = [];
    pushMultiArg(trainTupleArgs, 'input', inputPaths);
    pushArg(trainTupleArgs, 'evaluation-profile-json', sharedEvaluationProfilePath);
    pushArg(trainTupleArgs, 'layout-name', candidate.layoutName);
    pushArg(trainTupleArgs, 'layout-json', candidate.layoutJson);
    pushArg(trainTupleArgs, 'seed-profile', candidate.seedProfileJson);
    pushArg(trainTupleArgs, 'phase-buckets', candidate.phaseBuckets.join(','));
    pushArg(trainTupleArgs, 'target-scale', targetScale);
    pushArg(trainTupleArgs, 'holdout-mod', holdoutMod);
    pushArg(trainTupleArgs, 'holdout-residue', holdoutResidue);
    pushArg(trainTupleArgs, 'sample-stride', candidate.sampleStride);
    pushArg(trainTupleArgs, 'sample-residue', candidate.sampleResidue);
    pushArg(trainTupleArgs, 'epochs', candidate.epochs);
    pushArg(trainTupleArgs, 'learning-rate', candidate.learningRate);
    pushArg(trainTupleArgs, 'l2', candidate.l2);
    pushArg(trainTupleArgs, 'gradient-clip', candidate.gradientClip);
    pushArg(trainTupleArgs, 'min-visits', candidate.minVisits);
    pushArg(trainTupleArgs, 'limit', candidate.tupleLimit);
    pushArg(trainTupleArgs, 'progress-every', progressEvery);
    pushArg(trainTupleArgs, 'output-json', candidatePaths.rawTupleProfilePath);
    pushArg(trainTupleArgs, 'output-module', candidatePaths.previewModulePath);
    pushArg(trainTupleArgs, 'module-format', moduleFormat);
    pushFlag(trainTupleArgs, 'skip-diagnostics', candidate.skipDiagnostics);

    const trainResult = await runTrackedStep({
      status: candidateStatus,
      statusPath: candidatePaths.statusPath,
      stepKey: 'train-tuple-residual-profile',
      description: `${candidate.key}: train tuple residual`,
      toolPath: toolPaths.trainTuple,
      toolArgs: trainTupleArgs,
      outputs: [candidatePaths.rawTupleProfilePath, candidatePaths.previewModulePath],
      dryRun,
      resume,
      cwd: process.cwd(),
    });
    summaryEntry.steps.train = trainResult.status;

    let finalTupleProfilePath = candidatePaths.rawTupleProfilePath;
    if (candidate.calibration.enabled) {
      const calibrateArgs = [];
      pushArg(calibrateArgs, 'tuple-json', candidatePaths.rawTupleProfilePath);
      pushMultiArg(calibrateArgs, 'corpus', inputPaths);
      pushArg(calibrateArgs, 'evaluation-profile-json', sharedEvaluationProfilePath);
      pushArg(calibrateArgs, 'scope', candidate.calibration.scope);
      pushArg(calibrateArgs, 'shrink', candidate.calibration.shrink);
      pushArg(calibrateArgs, 'max-bias-stones', candidate.calibration.maxBiasStones);
      pushArg(calibrateArgs, 'holdout-mod', holdoutMod);
      pushArg(calibrateArgs, 'holdout-residue', holdoutResidue);
      pushArg(calibrateArgs, 'limit', candidate.calibration.limit);
      pushArg(calibrateArgs, 'progress-every', progressEvery);
      pushArg(calibrateArgs, 'output-json', candidatePaths.calibratedTupleProfilePath);
      pushArg(calibrateArgs, 'summary-json', candidatePaths.calibrationSummaryPath);

      const calibrateResult = await runTrackedStep({
        status: candidateStatus,
        statusPath: candidatePaths.statusPath,
        stepKey: 'calibrate-tuple-residual-profile',
        description: `${candidate.key}: calibrate tuple residual`,
        toolPath: toolPaths.calibrateTuple,
        toolArgs: calibrateArgs,
        outputs: [candidatePaths.calibratedTupleProfilePath, candidatePaths.calibrationSummaryPath],
        dryRun,
        resume,
        cwd: process.cwd(),
      });
      summaryEntry.steps.calibration = calibrateResult.status;
      finalTupleProfilePath = candidatePaths.calibratedTupleProfilePath;
    } else {
      summaryEntry.steps.calibration = 'disabled';
    }

    if (candidate.exportModule) {
      const exportArgs = [];
      pushArg(exportArgs, 'evaluation-json', sharedEvaluationProfilePath);
      pushArg(exportArgs, 'move-ordering-json', sharedMoveOrderingProfilePath);
      pushArg(exportArgs, 'tuple-json', finalTupleProfilePath);
      pushArg(exportArgs, 'mpc-json', sharedMpcProfilePath);
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

    const benchmarkBaselineEvaluationPath = sharedBenchmarkBaseline.evaluationProfilePath ?? sharedEvaluationProfilePath;
    const benchmarkBaselineMoveOrderingPath = sharedBenchmarkBaseline.moveOrderingProfilePath ?? sharedMoveOrderingProfilePath;
    const benchmarkBaselineTuplePath = sharedBenchmarkBaseline.tupleProfilePath ?? null;

    if (candidate.benchmarks.profile.enabled) {
      const profileArgs = [];
      pushMultiArg(profileArgs, 'input', inputPaths);
      pushArg(profileArgs, 'baseline-profile', benchmarkBaselineEvaluationPath);
      pushArg(profileArgs, 'candidate-profile', sharedEvaluationProfilePath);
      pushArg(profileArgs, 'baseline-tuple-profile', benchmarkBaselineTuplePath);
      pushArg(profileArgs, 'candidate-tuple-profile', finalTupleProfilePath);
      pushArg(profileArgs, 'limit', candidate.benchmarks.profile.limit);
      pushArg(profileArgs, 'target-scale', targetScale);
      pushArg(profileArgs, 'benchmark-loops', candidate.benchmarks.profile.benchmarkLoops);
      pushArg(profileArgs, 'progress-every', progressEvery);
      pushArg(profileArgs, 'output-json', candidatePaths.profileBenchmarkPath);

      const profileResult = await runTrackedStep({
        status: candidateStatus,
        statusPath: candidatePaths.statusPath,
        stepKey: 'benchmark-profile',
        description: `${candidate.key}: profile benchmark`,
        toolPath: toolPaths.benchmarkProfile,
        toolArgs: profileArgs,
        outputs: [candidatePaths.profileBenchmarkPath],
        dryRun,
        resume,
        cwd: process.cwd(),
      });
      summaryEntry.steps.profileBenchmark = profileResult.status;
    } else {
      summaryEntry.steps.profileBenchmark = 'disabled';
    }

    if (candidate.benchmarks.depth.enabled) {
      const depthArgs = [];
      pushArg(depthArgs, 'baseline-profile', benchmarkBaselineEvaluationPath);
      pushArg(depthArgs, 'candidate-profile', sharedEvaluationProfilePath);
      pushArg(depthArgs, 'baseline-move-ordering-profile', benchmarkBaselineMoveOrderingPath);
      pushArg(depthArgs, 'candidate-move-ordering-profile', sharedMoveOrderingProfilePath);
      pushArg(depthArgs, 'baseline-tuple-profile', benchmarkBaselineTuplePath);
      pushArg(depthArgs, 'candidate-tuple-profile', finalTupleProfilePath);
      pushArg(depthArgs, 'empties', candidate.benchmarks.depth.empties.join(','));
      pushArg(depthArgs, 'seed-start', candidate.benchmarks.depth.seedStart);
      pushArg(depthArgs, 'seed-count', candidate.benchmarks.depth.seedCount);
      pushArg(depthArgs, 'repetitions', candidate.benchmarks.depth.repetitions);
      pushArg(depthArgs, 'time-limit-ms', candidate.benchmarks.depth.timeLimitMs);
      pushArg(depthArgs, 'max-depth', candidate.benchmarks.depth.maxDepth);
      pushArg(depthArgs, 'exact-endgame-empties', candidate.benchmarks.depth.exactEndgameEmpties);
      pushArg(depthArgs, 'output-json', candidatePaths.depthBenchmarkPath);

      const depthResult = await runTrackedStep({
        status: candidateStatus,
        statusPath: candidatePaths.statusPath,
        stepKey: 'benchmark-depth',
        description: `${candidate.key}: depth benchmark`,
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
      pushArg(exactArgs, 'baseline-profile', benchmarkBaselineEvaluationPath);
      pushArg(exactArgs, 'candidate-profile', sharedEvaluationProfilePath);
      pushArg(exactArgs, 'baseline-move-ordering-profile', benchmarkBaselineMoveOrderingPath);
      pushArg(exactArgs, 'candidate-move-ordering-profile', sharedMoveOrderingProfilePath);
      pushArg(exactArgs, 'baseline-tuple-profile', benchmarkBaselineTuplePath);
      pushArg(exactArgs, 'candidate-tuple-profile', finalTupleProfilePath);
      pushArg(exactArgs, 'empties', candidate.benchmarks.exact.empties.join(','));
      pushArg(exactArgs, 'seed-start', candidate.benchmarks.exact.seedStart);
      pushArg(exactArgs, 'seed-count', candidate.benchmarks.exact.seedCount);
      pushArg(exactArgs, 'repetitions', candidate.benchmarks.exact.repetitions);
      pushArg(exactArgs, 'time-limit-ms', candidate.benchmarks.exact.timeLimitMs);
      pushArg(exactArgs, 'max-depth', candidate.benchmarks.exact.maxDepth);
      pushArg(exactArgs, 'output-json', candidatePaths.exactBenchmarkPath);

      const exactResult = await runTrackedStep({
        status: candidateStatus,
        statusPath: candidatePaths.statusPath,
        stepKey: 'benchmark-exact',
        description: `${candidate.key}: exact benchmark`,
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

    summaryEntry.outputs = summarizeCandidateOutputs(candidate, {
      rawTupleProfilePath: candidatePaths.rawTupleProfilePath,
      finalTupleProfilePath,
      generatedModulePath: candidatePaths.generatedModulePath,
      profileBenchmarkPath: candidatePaths.profileBenchmarkPath,
      depthBenchmarkPath: candidatePaths.depthBenchmarkPath,
      exactBenchmarkPath: candidatePaths.exactBenchmarkPath,
    });
  } catch (error) {
    summaryEntry.status = 'failed';
    summaryEntry.error = error.message;
    suiteSummary.candidates.push(summaryEntry);
    await ensureJsonFile(path.join(outputDir, 'suite-summary.json'), suiteSummary);
    if (!continueOnError) {
      throw error;
    }
    console.error(`[suite] candidate failed but suite will continue: ${candidate.key} :: ${error.message}`);
    continue;
  }

  suiteSummary.candidates.push(summaryEntry);
  await ensureJsonFile(path.join(outputDir, 'suite-summary.json'), suiteSummary);
}

suiteSummary.completedAt = new Date().toISOString();
suiteSummary.successCount = suiteSummary.candidates.filter((entry) => entry.status === 'success').length;
suiteSummary.failureCount = suiteSummary.candidates.filter((entry) => entry.status === 'failed').length;
await ensureJsonFile(path.join(outputDir, 'suite-summary.json'), suiteSummary);

console.log(`[suite] 완료: success=${formatInteger(suiteSummary.successCount)} failed=${formatInteger(suiteSummary.failureCount)}`);
console.log(`Saved summary to ${relativeToCwd(path.join(outputDir, 'suite-summary.json'))}`);
