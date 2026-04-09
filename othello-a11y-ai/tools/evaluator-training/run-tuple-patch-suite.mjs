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
  parseArgs,
  resolveCliPath,
  resolveTrainingToolPath,
} from './lib.mjs';

const DEFAULT_CONFIG = Object.freeze({
  moduleFormat: 'compact',
  targetScale: 3000,
  progressEvery: 250000,
  continueOnError: false,
  defaults: {
    sourceCandidateKey: null,
    sourceTupleProfileJson: null,
    sourceProfileKind: 'auto',
    keepBuckets: [],
    dropBuckets: [],
    keepTopTuples: null,
    tupleScore: 'sum-abs',
    keepTuples: [],
    dropTuples: [],
    globalScale: 1,
    bucketScales: {},
    tupleScales: {},
    entryScales: {},
    calibration: {
      enabled: false,
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
  sharedProfiles: {
    evaluationProfileJson: 'active',
    moveOrderingProfileJson: 'active',
    mpcProfileJson: 'active',
  },
  benchmarkBaseline: {
    evaluationProfileJson: 'active',
    moveOrderingProfileJson: 'active',
    tupleProfileJson: 'active',
  },
  candidates: [],
});

const DEFAULT_PATCH_CANDIDATES = Object.freeze([
  {
    key: 'active-lateb-attenuated',
    name: 'active tuple late-b attenuated',
    sourceTupleProfileJson: 'active',
    bucketScales: { 'late-b': 0.5 },
  },
  {
    key: 'diagonal-lite-top24',
    name: 'diagonal-adjacent-pairs-full-v1 top24 + late-b 0.5x',
    sourceCandidateKey: 'diagonal-adjacent-pairs-full-v1',
    keepTopTuples: 24,
    bucketScales: { 'late-b': 0.5 },
  },
  {
    key: 'diagonal-latea-endgame-top16',
    name: 'diagonal late-a+endgame top16',
    sourceCandidateKey: 'diagonal-adjacent-pairs-full-v1',
    keepBuckets: ['late-a', 'endgame'],
    keepTopTuples: 16,
  },
  {
    key: 'straight-lite-top24',
    name: 'straight-adjacent-pairs-full-v1 top24 + late-b 0.5x',
    sourceCandidateKey: 'straight-adjacent-pairs-full-v1',
    keepTopTuples: 24,
    bucketScales: { 'late-b': 0.5 },
  },
  {
    key: 'orthogonal-endgame-top16',
    name: 'orthogonal endgame top16',
    sourceCandidateKey: 'orthogonal-adjacent-pairs-full-v1',
    keepBuckets: ['endgame'],
    keepTopTuples: 16,
  },
]);

function printUsage() {
  const toolPath = displayTrainingToolPath('run-tuple-patch-suite.mjs');
  const outputDir = displayTrainingOutputPath('tuple-patch-suite');
  console.log(`Usage:
  node ${toolPath} \
    [--input <file-or-dir> [--input <file-or-dir> ...]] \
    [--source-suite-dir tools/evaluator-training/out/stage63-suite] \
    [--output-dir ${outputDir}] \
    [--config tools/evaluator-training/examples/tuple-patch-suite.patch-plus-bench.example.json] \
    [--resume] [--continue-on-error] [--plan-only]

설명:
- 이미 학습된 tuple candidate들을 source로 받아 small-patch 후보를 순차적으로 만듭니다.
- 각 후보마다 patch/prune/attenuate → (선택) calibration → generated module export → (선택) benchmark를 한 번에 수행합니다.
- source tuple profile은 --source-suite-dir 아래의 후보 산출물, 명시적 JSON 경로, 또는 active snapshot에서 가져올 수 있습니다.
- long run에 대비해 candidate별 status JSON과 suite-summary.json을 남기며, --resume으로 재개할 수 있습니다.

예시:
  node ${toolPath} \
    --source-suite-dir tools/evaluator-training/out/stage63-suite \
    --output-dir tools/evaluator-training/out/stage65-patch-suite \
    --config tools/evaluator-training/examples/tuple-patch-suite.patch-only.example.json

  node ${toolPath} \
    --input D:/othello-data/Egaroucid_Train_Data \
    --source-suite-dir tools/evaluator-training/out/stage63-suite \
    --output-dir tools/evaluator-training/out/stage65-patch-suite-bench \
    --config tools/evaluator-training/examples/tuple-patch-suite.patch-plus-bench.example.json \
    --resume
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

function normalizeIntegerList(value, fallback) {
  if (Array.isArray(value)) {
    return value.map((entry) => Number(entry)).filter((entry) => Number.isInteger(entry));
  }
  if (typeof value === 'string') {
    return value.split(',').map((entry) => Number(entry.trim())).filter((entry) => Number.isInteger(entry));
  }
  return [...fallback];
}

function normalizeTokenList(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return parseCommaList(value);
  }
  return [];
}

function normalizeScaleEntries(value) {
  if (value === undefined || value === null || value === '') {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => normalizeScaleEntries(entry));
  }

  if (typeof value === 'string') {
    return value.split(',').map((rawEntry) => rawEntry.trim()).filter(Boolean).map((entry) => {
      const separatorIndex = entry.lastIndexOf('=');
      if (separatorIndex <= 0 || separatorIndex >= entry.length - 1) {
        throw new Error(`scale 항목은 token=scale 형식이어야 합니다: ${entry}`);
      }
      const token = entry.slice(0, separatorIndex).trim();
      const scale = Number(entry.slice(separatorIndex + 1).trim());
      if (!Number.isFinite(scale) || scale < 0) {
        throw new Error(`scale은 0 이상의 유한수여야 합니다: ${entry}`);
      }
      return { token, scale };
    });
  }

  if (isPlainObject(value)) {
    if (typeof value.token === 'string' && value.token.trim() !== '') {
      return [{ token: value.token.trim(), scale: toFiniteNumber(value.scale, 1) }];
    }
    return Object.entries(value).map(([token, rawScale]) => {
      const scale = Number(rawScale);
      if (!Number.isFinite(scale) || scale < 0) {
        throw new Error(`scale은 0 이상의 유한수여야 합니다: ${token}=${rawScale}`);
      }
      return { token, scale };
    });
  }

  return [];
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

function pushScaleEntries(target, flag, entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return;
  }
  pushArg(target, flag, entries.map((entry) => `${entry.token}=${entry.scale}`).join(','));
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

function summarizePatchCandidateOutputs(candidate, paths) {
  const rawTupleProfile = readJsonIfPresent(paths.patchedTupleProfilePath);
  const calibratedTupleProfile = readJsonIfPresent(paths.finalTupleProfilePath);
  const patchSummary = readJsonIfPresent(paths.patchSummaryPath);
  const layout = calibratedTupleProfile?.layout ?? rawTupleProfile?.layout ?? null;
  return {
    key: candidate.key,
    name: candidate.name,
    sourceCandidateKey: candidate.sourceCandidateKey ?? null,
    sourceTupleProfilePath: relativeToCwd(candidate.sourceTupleProfilePath),
    tupleCount: layout?.tupleCount ?? (Array.isArray(layout?.tuples) ? layout.tuples.length : null),
    totalTableSize: layout?.totalTableSize ?? null,
    patchedTupleProfilePath: relativeToCwd(paths.patchedTupleProfilePath),
    finalTupleProfilePath: relativeToCwd(paths.finalTupleProfilePath),
    previewModulePath: relativeToCwd(paths.previewModulePath),
    generatedModulePath: relativeToCwd(paths.generatedModulePath),
    generatedModuleBytes: statBytes(paths.generatedModulePath),
    patch: patchSummary,
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
    patchedTupleProfilePath: path.join(candidateDir, 'trained-tuple-residual-profile.patched.json'),
    patchSummaryPath: path.join(candidateDir, 'tuple-residual-patch-summary.json'),
    previewModulePath: path.join(candidateDir, 'learned-eval-profile.preview.generated.js'),
    calibratedTupleProfilePath: path.join(candidateDir, 'trained-tuple-residual-profile.patched.calibrated.json'),
    calibrationSummaryPath: path.join(candidateDir, 'tuple-residual-calibration-summary.json'),
    generatedModulePath: path.join(candidateDir, 'learned-eval-profile.generated.js'),
    profileBenchmarkPath: path.join(benchmarksDir, 'profile.benchmark.json'),
    depthBenchmarkPath: path.join(benchmarksDir, 'depth.benchmark.json'),
    exactBenchmarkPath: path.join(benchmarksDir, 'exact.benchmark.json'),
    statusPath: path.join(candidateDir, 'candidate-status.json'),
    configPath: path.join(candidateDir, 'candidate-config.resolved.json'),
  };
}

function resolveSuiteCandidateProfilePath(sourceSuiteDir, sourceCandidateKey, sourceProfileKind = 'auto') {
  if (!sourceSuiteDir) {
    throw new Error(`sourceCandidateKey=${sourceCandidateKey} 를 쓰려면 sourceSuiteDir가 필요합니다.`);
  }
  const candidateDir = path.join(sourceSuiteDir, 'candidates', sourceCandidateKey);
  const calibratedPath = path.join(candidateDir, 'trained-tuple-residual-profile.calibrated.json');
  const rawPath = path.join(candidateDir, 'trained-tuple-residual-profile.json');
  const normalizedKind = String(sourceProfileKind ?? 'auto').trim().toLowerCase();

  if (normalizedKind === 'calibrated') {
    if (!pathExists(calibratedPath)) {
      throw new Error(`calibrated source tuple profile을 찾지 못했습니다: ${calibratedPath}`);
    }
    return calibratedPath;
  }
  if (normalizedKind === 'raw') {
    if (!pathExists(rawPath)) {
      throw new Error(`raw source tuple profile을 찾지 못했습니다: ${rawPath}`);
    }
    return rawPath;
  }
  if (pathExists(calibratedPath)) {
    return calibratedPath;
  }
  if (pathExists(rawPath)) {
    return rawPath;
  }
  throw new Error(`source suite candidate profile을 찾지 못했습니다: ${candidateDir}`);
}

function resolveCandidates({ rawCandidates, defaults, configBaseDir, sourceSuiteDir, activeSnapshots }) {
  const candidateInputs = rawCandidates.length > 0
    ? rawCandidates
    : (sourceSuiteDir
      ? DEFAULT_PATCH_CANDIDATES
      : DEFAULT_PATCH_CANDIDATES.filter((candidate) => !candidate.sourceCandidateKey));
  if (candidateInputs.length === 0) {
    throw new Error('sourceSuiteDir 또는 candidates[] 없이 만들 수 있는 기본 patch candidate가 없습니다.');
  }

  const normalized = candidateInputs.map((candidate, index) => {
    const key = slugify(candidate.key ?? candidate.name ?? candidate.sourceCandidateKey ?? `candidate-${index + 1}`);
    const merged = deepMerge(defaults, candidate ?? {});
    const normalizedCandidate = {
      key,
      name: String(candidate.name ?? candidate.label ?? key),
      description: typeof merged.description === 'string' ? merged.description : null,
      sourceCandidateKey: typeof merged.sourceCandidateKey === 'string' && merged.sourceCandidateKey.trim() !== ''
        ? merged.sourceCandidateKey.trim()
        : null,
      sourceProfileKind: typeof merged.sourceProfileKind === 'string' && merged.sourceProfileKind.trim() !== ''
        ? merged.sourceProfileKind.trim()
        : 'auto',
      sourceTupleProfileJson: resolvePathFromSource(merged.sourceTupleProfileJson, {
        configBaseDir,
        activeSnapshotPath: activeSnapshots.tuple,
      }),
      keepBuckets: normalizeTokenList(merged.keepBuckets),
      dropBuckets: normalizeTokenList(merged.dropBuckets),
      keepTopTuples: merged.keepTopTuples === null ? null : toFiniteInteger(merged.keepTopTuples, null),
      tupleScore: typeof merged.tupleScore === 'string' && merged.tupleScore.trim() !== '' ? merged.tupleScore.trim() : 'sum-abs',
      keepTuples: normalizeTokenList(merged.keepTuples),
      dropTuples: normalizeTokenList(merged.dropTuples),
      globalScale: toFiniteNumber(merged.globalScale, 1),
      bucketScaleEntries: normalizeScaleEntries(merged.bucketScales),
      tupleScaleEntries: normalizeScaleEntries(merged.tupleScales),
      entryScaleEntries: normalizeScaleEntries(merged.entryScales),
      calibration: {
        enabled: toBoolean(merged.calibration?.enabled, false),
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

    if (!normalizedCandidate.sourceTupleProfileJson && !normalizedCandidate.sourceCandidateKey) {
      throw new Error(`Candidate ${normalizedCandidate.key} must specify sourceTupleProfileJson or sourceCandidateKey.`);
    }
    if (!['sum-abs', 'max-abs', 'l2'].includes(normalizedCandidate.tupleScore)) {
      throw new Error(`Candidate ${normalizedCandidate.key} has unsupported tupleScore: ${normalizedCandidate.tupleScore}`);
    }

    normalizedCandidate.sourceTupleProfilePath = normalizedCandidate.sourceTupleProfileJson
      ?? resolveSuiteCandidateProfilePath(sourceSuiteDir, normalizedCandidate.sourceCandidateKey, normalizedCandidate.sourceProfileKind);
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
const dryRun = Boolean(args['plan-only'] || args['dry-run']);
const resume = Boolean(args.resume);
const continueOnError = Boolean(args['continue-on-error'] ?? mergedConfig.continueOnError);
const moduleFormat = typeof args['module-format'] === 'string' && args['module-format'].trim() !== ''
  ? args['module-format'].trim()
  : String(mergedConfig.moduleFormat ?? 'compact');
const targetScale = toFiniteInteger(args['target-scale'] ?? mergedConfig.targetScale, 3000);
const progressEvery = Math.max(0, toFiniteInteger(args['progress-every'] ?? mergedConfig.progressEvery, 250000));
const inputValues = [...ensureArray(args.input), ...ensureArray(args['input-dir'])];
const inputPaths = inputValues.map((value) => resolveCliPath(value));
const outputDir = resolveCliOrConfigPath(args['output-dir'], mergedConfig.outputDir, configBaseDir)
  ?? resolveCliPath('tools/evaluator-training/out/tuple-patch-suite');
const sourceSuiteDir = resolveCliOrConfigPath(args['source-suite-dir'], mergedConfig.sourceSuiteDir, configBaseDir);

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
const sharedMpcProfilePath = resolveCliOrConfigPath(
  args['mpc-profile-json'],
  mergedConfig.sharedProfiles?.mpcProfileJson,
  configBaseDir,
  { activeSnapshotPath: activeSnapshots.mpc },
);

const sharedBenchmarkBaseline = {
  evaluationProfilePath: resolveCliOrConfigPath(
    args['baseline-profile'],
    mergedConfig.benchmarkBaseline?.evaluationProfileJson,
    configBaseDir,
    { activeSnapshotPath: activeSnapshots.evaluation },
  ),
  moveOrderingProfilePath: resolveCliOrConfigPath(
    args['baseline-move-ordering-profile'],
    mergedConfig.benchmarkBaseline?.moveOrderingProfileJson,
    configBaseDir,
    { activeSnapshotPath: activeSnapshots.moveOrdering },
  ),
  tupleProfilePath: resolveCliOrConfigPath(
    args['baseline-tuple-profile'],
    mergedConfig.benchmarkBaseline?.tupleProfileJson,
    configBaseDir,
    { activeSnapshotPath: activeSnapshots.tuple },
  ),
};

const rawCandidates = Array.isArray(mergedConfig.candidates) ? mergedConfig.candidates : [];
const normalizedCandidates = resolveCandidates({
  rawCandidates,
  defaults: mergedConfig.defaults ?? DEFAULT_CONFIG.defaults,
  configBaseDir,
  sourceSuiteDir,
  activeSnapshots,
});

const toolPaths = {
  patchTuple: resolveTrainingToolPath('patch-tuple-residual-profile.mjs'),
  calibrateTuple: resolveTrainingToolPath('calibrate-tuple-residual-profile.mjs'),
  exportModule: resolveTrainingToolPath('export-profile-module.mjs'),
  benchmarkProfile: resolveTrainingToolPath('benchmark-profile.mjs'),
  benchmarkDepth: resolveTrainingToolPath('benchmark-depth-search-profile.mjs'),
  benchmarkExact: resolveTrainingToolPath('benchmark-exact-search-profile.mjs'),
};

const resolvedConfigSummary = {
  generatedAt: new Date().toISOString(),
  name: rawConfig.name ?? 'tuple-patch-suite',
  outputDir: relativeToCwd(outputDir),
  inputPaths: inputPaths.map((value) => relativeToCwd(value)),
  sourceSuiteDir: relativeToCwd(sourceSuiteDir),
  moduleFormat,
  targetScale,
  progressEvery,
  sharedProfiles: {
    evaluationProfilePath: relativeToCwd(sharedEvaluationProfilePath),
    moveOrderingProfilePath: relativeToCwd(sharedMoveOrderingProfilePath),
    mpcProfilePath: relativeToCwd(sharedMpcProfilePath),
  },
  benchmarkBaseline: {
    evaluationProfilePath: relativeToCwd(sharedBenchmarkBaseline.evaluationProfilePath),
    moveOrderingProfilePath: relativeToCwd(sharedBenchmarkBaseline.moveOrderingProfilePath),
    tupleProfilePath: relativeToCwd(sharedBenchmarkBaseline.tupleProfilePath),
  },
  candidates: normalizedCandidates.map((candidate) => ({
    key: candidate.key,
    name: candidate.name,
    sourceCandidateKey: candidate.sourceCandidateKey,
    sourceTupleProfilePath: relativeToCwd(candidate.sourceTupleProfilePath),
    keepBuckets: candidate.keepBuckets,
    dropBuckets: candidate.dropBuckets,
    keepTopTuples: candidate.keepTopTuples,
    tupleScore: candidate.tupleScore,
    keepTuples: candidate.keepTuples,
    dropTuples: candidate.dropTuples,
    globalScale: candidate.globalScale,
    bucketScales: candidate.bucketScaleEntries,
    tupleScales: candidate.tupleScaleEntries,
    entryScales: candidate.entryScaleEntries,
    calibration: candidate.calibration,
    exportModule: candidate.exportModule,
    benchmarks: candidate.benchmarks,
  })),
};
await ensureJsonFile(path.join(outputDir, 'suite-config.resolved.json'), resolvedConfigSummary);

const suiteSummary = {
  generatedAt: new Date().toISOString(),
  completedAt: null,
  outputDir: relativeToCwd(outputDir),
  sourceSuiteDir: relativeToCwd(sourceSuiteDir),
  dryRun,
  resume,
  continueOnError,
  candidateCount: normalizedCandidates.length,
  successCount: 0,
  failureCount: 0,
  candidates: [],
};
await ensureJsonFile(path.join(outputDir, 'suite-summary.json'), suiteSummary);

for (const candidate of normalizedCandidates) {
  const candidatePaths = createDefaultOutputPaths(outputDir, candidate.key);
  await fs.promises.mkdir(candidatePaths.candidateDir, { recursive: true });
  await fs.promises.mkdir(candidatePaths.benchmarksDir, { recursive: true });

  const candidateStatusDefaults = {
    candidate: {
      key: candidate.key,
      name: candidate.name,
      sourceCandidateKey: candidate.sourceCandidateKey ?? null,
      sourceTupleProfilePath: relativeToCwd(candidate.sourceTupleProfilePath),
    },
    steps: {},
  };
  const candidateStatus = loadStatusFile(candidatePaths.statusPath, candidateStatusDefaults);
  await ensureJsonFile(candidatePaths.configPath, {
    ...candidate,
    sourceTupleProfilePath: relativeToCwd(candidate.sourceTupleProfilePath),
  });

  const summaryEntry = {
    key: candidate.key,
    name: candidate.name,
    sourceCandidateKey: candidate.sourceCandidateKey ?? null,
    sourceTupleProfilePath: relativeToCwd(candidate.sourceTupleProfilePath),
    status: dryRun ? 'planned' : 'success',
    steps: {},
    outputs: null,
  };

  try {
    const patchArgs = [];
    pushArg(patchArgs, 'input', candidate.sourceTupleProfilePath);
    pushArg(patchArgs, 'output-json', candidatePaths.patchedTupleProfilePath);
    pushArg(patchArgs, 'summary-json', candidatePaths.patchSummaryPath);
    pushArg(patchArgs, 'keep-buckets', candidate.keepBuckets.join(','));
    pushArg(patchArgs, 'drop-buckets', candidate.dropBuckets.join(','));
    pushArg(patchArgs, 'keep-top-tuples', candidate.keepTopTuples);
    pushArg(patchArgs, 'tuple-score', candidate.tupleScore);
    pushArg(patchArgs, 'keep-tuples', candidate.keepTuples.join(','));
    pushArg(patchArgs, 'drop-tuples', candidate.dropTuples.join(','));
    pushArg(patchArgs, 'global-scale', candidate.globalScale);
    pushScaleEntries(patchArgs, 'bucket-scale', candidate.bucketScaleEntries);
    pushScaleEntries(patchArgs, 'tuple-scale', candidate.tupleScaleEntries);
    pushScaleEntries(patchArgs, 'entry-scale', candidate.entryScaleEntries);
    pushArg(patchArgs, 'name', `${candidate.key}-patched`);
    pushArg(patchArgs, 'description', candidate.description ?? `${candidate.name} patched tuple residual profile`);

    const patchResult = await runTrackedStep({
      status: candidateStatus,
      statusPath: candidatePaths.statusPath,
      stepKey: 'patch-tuple-residual-profile',
      description: `${candidate.key}: patch tuple residual`,
      toolPath: toolPaths.patchTuple,
      toolArgs: patchArgs,
      outputs: [candidatePaths.patchedTupleProfilePath, candidatePaths.patchSummaryPath],
      dryRun,
      resume,
      cwd: process.cwd(),
    });
    summaryEntry.steps.patch = patchResult.status;

    if (candidate.exportModule) {
      const previewArgs = [];
      pushArg(previewArgs, 'evaluation-json', sharedEvaluationProfilePath);
      pushArg(previewArgs, 'move-ordering-json', sharedMoveOrderingProfilePath);
      pushArg(previewArgs, 'tuple-json', candidatePaths.patchedTupleProfilePath);
      pushArg(previewArgs, 'mpc-json', sharedMpcProfilePath);
      pushArg(previewArgs, 'output-module', candidatePaths.previewModulePath);
      pushArg(previewArgs, 'module-format', moduleFormat);

      const previewResult = await runTrackedStep({
        status: candidateStatus,
        statusPath: candidatePaths.statusPath,
        stepKey: 'export-preview-module',
        description: `${candidate.key}: export preview generated module`,
        toolPath: toolPaths.exportModule,
        toolArgs: previewArgs,
        outputs: [candidatePaths.previewModulePath],
        dryRun,
        resume,
        cwd: process.cwd(),
      });
      summaryEntry.steps.previewModule = previewResult.status;
    } else {
      summaryEntry.steps.previewModule = 'disabled';
    }

    let finalTupleProfilePath = candidatePaths.patchedTupleProfilePath;
    if (candidate.calibration.enabled) {
      if (inputPaths.length === 0) {
        throw new Error(`Candidate ${candidate.key} requested calibration but no --input corpus was provided.`);
      }
      const calibrateArgs = [];
      pushArg(calibrateArgs, 'tuple-json', candidatePaths.patchedTupleProfilePath);
      pushMultiArg(calibrateArgs, 'corpus', inputPaths);
      pushArg(calibrateArgs, 'evaluation-profile-json', sharedEvaluationProfilePath);
      pushArg(calibrateArgs, 'scope', candidate.calibration.scope);
      pushArg(calibrateArgs, 'shrink', candidate.calibration.shrink);
      pushArg(calibrateArgs, 'max-bias-stones', candidate.calibration.maxBiasStones);
      pushArg(calibrateArgs, 'limit', candidate.calibration.limit);
      pushArg(calibrateArgs, 'progress-every', progressEvery);
      pushArg(calibrateArgs, 'output-json', candidatePaths.calibratedTupleProfilePath);
      pushArg(calibrateArgs, 'summary-json', candidatePaths.calibrationSummaryPath);

      const calibrateResult = await runTrackedStep({
        status: candidateStatus,
        statusPath: candidatePaths.statusPath,
        stepKey: 'calibrate-tuple-residual-profile',
        description: `${candidate.key}: calibrate patched tuple residual`,
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
      if (inputPaths.length === 0) {
        throw new Error(`Candidate ${candidate.key} requested profile benchmark but no --input corpus was provided.`);
      }
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

    summaryEntry.outputs = summarizePatchCandidateOutputs(candidate, {
      patchedTupleProfilePath: candidatePaths.patchedTupleProfilePath,
      finalTupleProfilePath,
      patchSummaryPath: candidatePaths.patchSummaryPath,
      previewModulePath: candidatePaths.previewModulePath,
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
