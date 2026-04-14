#!/usr/bin/env node
import fsSync from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  ACTIVE_MOVE_ORDERING_PROFILE,
  ACTIVE_TUPLE_RESIDUAL_PROFILE,
  ACTIVE_MPC_PROFILE,
} from '../../js/ai/evaluation-profiles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const DEFAULT_OUTPUT_ROOT = path.join(repoRoot, 'tools', 'evaluator-training', 'out', 'stage136-balanced13-support-stack');
const DEFAULT_CONFIG_PATH = path.join(
  repoRoot,
  'tools',
  'evaluator-training',
  'examples',
  'stage136-balanced13-support-stack.example.json',
);
const DEFAULT_CANDIDATE_DIR = path.join(
  repoRoot,
  'tools',
  'engine-match',
  'fixtures',
  'stage135-evaluation-profile-finalists',
  'balanced13-alllate-smoothed-stability-090',
);
const DEFAULT_PHASE = 'all';
const VALID_PHASES = new Set(['tuple', 'move-ordering', 'mpc', 'export', 'all']);

function toPortablePath(targetPath) {
  return targetPath.split(path.sep).join('/');
}

function relativePortable(targetPath) {
  const relative = path.relative(repoRoot, targetPath);
  if (!relative || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    return toPortablePath(relative || '.');
  }
  return toPortablePath(targetPath);
}

function parseArgs(argv) {
  const parsed = {
    inputs: [],
    outputRoot: DEFAULT_OUTPUT_ROOT,
    configPath: DEFAULT_CONFIG_PATH,
    candidateDir: DEFAULT_CANDIDATE_DIR,
    evaluationProfileJson: null,
    phase: DEFAULT_PHASE,
    resume: false,
    continueOnError: false,
    planOnly: false,
    showHelp: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    switch (token) {
      case '--input':
        parsed.inputs.push(path.resolve(argv[++index]));
        break;
      case '--output-root':
        parsed.outputRoot = path.resolve(argv[++index]);
        break;
      case '--config':
        parsed.configPath = path.resolve(argv[++index]);
        break;
      case '--candidate-dir':
        parsed.candidateDir = path.resolve(argv[++index]);
        break;
      case '--evaluation-profile-json':
        parsed.evaluationProfileJson = path.resolve(argv[++index]);
        break;
      case '--phase':
        parsed.phase = argv[++index];
        break;
      case '--resume':
        parsed.resume = true;
        break;
      case '--continue-on-error':
        parsed.continueOnError = true;
        break;
      case '--plan-only':
        parsed.planOnly = true;
        break;
      case '--help':
      case '-h':
        parsed.showHelp = true;
        break;
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }

  if (!VALID_PHASES.has(parsed.phase)) {
    throw new Error(`Invalid --phase value: ${parsed.phase}`);
  }
  if (!parsed.showHelp && parsed.inputs.length === 0) {
    throw new Error('At least one --input <file-or-dir> is required.');
  }

  return parsed;
}

function renderUsage() {
  return `Usage:
  node tools/evaluator-training/run-stage136-balanced13-support-stack-bundle.mjs \
    --input <file-or-dir> [--input <file-or-dir> ...] \
    [--output-root tools/evaluator-training/out/stage136-balanced13-support-stack] \
    [--config tools/evaluator-training/examples/stage136-balanced13-support-stack.example.json] \
    [--candidate-dir tools/engine-match/fixtures/stage135-evaluation-profile-finalists/balanced13-alllate-smoothed-stability-090] \
    [--evaluation-profile-json path/to/trained-evaluation-profile.patched.json] \
    [--phase tuple|move-ordering|mpc|export|all] \
    [--resume] [--continue-on-error] [--plan-only]

설명:
- Stage 135 결선 후보 balanced13이 active의 보조 학습 산출물(move-ordering / tuple residual / MPC)에 의존하지 않도록,
  balanced13 evaluation profile 기준의 support stack 학습을 한 번에 재현하는 stage-specific bundle입니다.
- 기본 phase는 all 입니다. 별도 지정이 없으면 tuple 학습+calibration -> move-ordering -> MPC calibration+runtime -> generated module export를 순차 실행합니다.
- 기본 candidate source는 repo 안의 stage135 finalist fixture(balanced13-alllate-smoothed-stability-090)입니다.
- runtime JS는 자동으로 install하지 않습니다. output-root 아래에 candidate artifacts만 생성합니다.
- plan-only 는 manifest/summary만 남기고 실제 학습 도구는 실행하지 않습니다.

예시:
  node tools/evaluator-training/run-stage136-balanced13-support-stack-bundle.mjs \
    --input D:/othello-data/Egaroucid_Train_Data

  node tools/evaluator-training/run-stage136-balanced13-support-stack-bundle.mjs \
    --input D:/othello-data/Egaroucid_Train_Data \
    --resume

  node tools/evaluator-training/run-stage136-balanced13-support-stack-bundle.mjs \
    --input D:/othello-data/Egaroucid_Train_Data \
    --phase move-ordering --resume

  node tools/evaluator-training/run-stage136-balanced13-support-stack-bundle.mjs \
    --input D:/othello-data/Egaroucid_Train_Data \
    --phase mpc --resume

  node tools/evaluator-training/run-stage136-balanced13-support-stack-bundle.mjs \
    --input D:/othello-data/Egaroucid_Train_Data \
    --phase export --resume`;
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function normalizeArgForManifest(value) {
  if (typeof value !== 'string') {
    return value;
  }
  if (value.startsWith('--')) {
    return value;
  }
  if (/^[0-9.:-]+$/.test(value)) {
    return value;
  }
  return relativePortable(path.isAbsolute(value) ? value : path.resolve(repoRoot, value));
}

function buildRepeatedInputArgs(inputs) {
  return inputs.flatMap((inputPath) => ['--input', inputPath]);
}

function maybePushArg(argv, key, value) {
  if (value === undefined || value === null || value === '') {
    return;
  }
  argv.push(`--${key}`, String(value));
}

function maybePushCsvArg(argv, key, value) {
  const normalized = normalizeList(value);
  if (normalized.length === 0) {
    return;
  }
  maybePushArg(argv, key, normalized.join(','));
}

function maybePushBooleanArg(argv, key, value) {
  if (value === undefined || value === null) {
    return;
  }
  argv.push(`--${key}`, value ? 'on' : 'off');
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((entry) => entry.trim()).filter(Boolean);
  }
  return [];
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) {
    return override === undefined ? structuredClone(base) : structuredClone(override);
  }
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override === undefined ? structuredClone(base) : structuredClone(override);
  }
  const merged = { ...structuredClone(base) };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) {
      continue;
    }
    merged[key] = key in merged ? deepMerge(merged[key], value) : structuredClone(value);
  }
  return merged;
}

async function loadJsonIfExists(filePath) {
  if (!await pathExists(filePath)) {
    return null;
  }
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function resolveCandidateEvaluationProfilePath(candidateDir) {
  const candidates = [
    path.join(candidateDir, 'trained-evaluation-profile.patched.json'),
    path.join(candidateDir, 'trained-evaluation-profile.json'),
  ];
  for (const candidatePath of candidates) {
    try {
      return fsSync.statSync(candidatePath).isFile() ? candidatePath : null;
    } catch {
      // continue
    }
  }
  throw new Error(`Could not find trained evaluation profile JSON in candidate directory: ${candidateDir}`);
}

function deriveCandidateKey({ candidateDir, evaluationProfileJson }) {
  if (candidateDir) {
    return path.basename(candidateDir);
  }
  const parsed = path.parse(evaluationProfileJson);
  return parsed.name || 'evaluation-profile-candidate';
}

function deriveDefaultConfigFromActiveProfiles() {
  return {
    tuple: {
      layoutName: ACTIVE_TUPLE_RESIDUAL_PROFILE?.layout?.name ?? 'orthogonal-adjacent-pairs-outer2-v1-patched-patched',
      phaseBuckets: Array.isArray(ACTIVE_TUPLE_RESIDUAL_PROFILE?.trainedBuckets)
        ? ACTIVE_TUPLE_RESIDUAL_PROFILE.trainedBuckets.map((bucket) => bucket.key ?? `${bucket.minEmpties}-${bucket.maxEmpties}`)
        : ['late-b', 'endgame'],
      sampleStride: 4,
      sampleResidue: 0,
      epochs: 1,
      learningRate: 0.05,
      biasLearningRate: 0.05,
      l2: 0.0005,
      gradientClip: 90000,
      minVisits: 32,
      holdoutMod: 10,
      holdoutResidue: 0,
      progressEvery: 250000,
    },
    tupleCalibration: {
      scope: 'holdout-selected',
      shrink: 1.0,
      maxBiasStones: 1.5,
      holdoutMod: 10,
      holdoutResidue: 0,
      progressEvery: 250000,
    },
    moveOrdering: {
      childBuckets: Array.isArray(ACTIVE_MOVE_ORDERING_PROFILE?.trainedBuckets)
        ? ACTIVE_MOVE_ORDERING_PROFILE.trainedBuckets.map((bucket) => `${bucket.minEmpties}-${bucket.maxEmpties}`)
        : ['11-12', '15-16', '17-18'],
      sampleStride: 200,
      sampleResidue: 0,
      maxRootsPerBucket: 500,
      holdoutMod: 10,
      holdoutResidue: 0,
      lambda: 5000,
      progressEvery: 20,
      exactRootMaxEmpties: 14,
      exactRootTimeLimitMs: 60000,
      teacherDepth: 6,
      teacherTimeLimitMs: 4000,
      teacherExactEndgameEmpties: 14,
      targetMode: 'root-mean',
      rootWeighting: 'uniform',
      exactRootWeightScale: 1.0,
    },
    mpc: {
      calibrationBuckets: Array.isArray(ACTIVE_MPC_PROFILE?.calibrations)
        ? ACTIVE_MPC_PROFILE.calibrations.map((entry) => `${entry.minEmpties}-${entry.maxEmpties}:${entry.shallowDepth}>${entry.deepDepth}`)
        : ['18-21:3>7', '18-21:4>8', '22-25:4>8', '22-25:4>9', '26-29:5>10', '26-29:6>10', '30-33:5>11', '30-33:6>10'],
      sampleStride: 200,
      sampleResidue: 0,
      maxSamplesPerBucket: 400,
      holdoutMod: 10,
      holdoutResidue: 0,
      targetHoldoutCoverage: 0.99,
      timeLimitMs: 120000,
      progressEvery: 20,
      maxTableEntries: 200000,
      aspirationWindow: 40,
      zValues: [1, 1.5, 1.96, 2.5, 3],
    },
    runtime: {
      defaultMode: (ACTIVE_MPC_PROFILE?.runtime?.enableLowCut === true)
        ? 'both'
        : ((ACTIVE_MPC_PROFILE?.runtime?.enableHighCut === false) ? 'off' : 'high'),
      enableHighCut: ACTIVE_MPC_PROFILE?.runtime?.enableHighCut !== false,
      enableLowCut: ACTIVE_MPC_PROFILE?.runtime?.enableLowCut === true,
      maxWindow: ACTIVE_MPC_PROFILE?.runtime?.maxWindow ?? 1,
      maxChecksPerNode: ACTIVE_MPC_PROFILE?.runtime?.maxChecksPerNode ?? 2,
      minDepth: ACTIVE_MPC_PROFILE?.runtime?.minDepth ?? 2,
      minDepthGap: ACTIVE_MPC_PROFILE?.runtime?.minDepthGap ?? 2,
      maxDepthDistance: ACTIVE_MPC_PROFILE?.runtime?.maxDepthDistance ?? 1,
      minPly: ACTIVE_MPC_PROFILE?.runtime?.minPly ?? 1,
      intervalScale: 1,
      highScale: ACTIVE_MPC_PROFILE?.runtime?.highScale ?? 1,
      lowScale: ACTIVE_MPC_PROFILE?.runtime?.lowScale ?? 1,
      depthDistanceScale: ACTIVE_MPC_PROFILE?.runtime?.depthDistanceScale ?? 1.25,
    },
    moduleFormat: 'compact',
  };
}

async function readResolvedConfig(configPath) {
  const base = deriveDefaultConfigFromActiveProfiles();
  if (!configPath) {
    return base;
  }
  const loaded = JSON.parse(await fs.readFile(configPath, 'utf8'));
  return deepMerge(base, loaded);
}

async function ensureJsonFile(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function prepareSharedInputs({
  outputRoot,
  evaluationProfileJson,
  candidateKey,
  resolvedConfig,
}) {
  const sharedDir = path.join(outputRoot, 'shared');
  await fs.mkdir(sharedDir, { recursive: true });

  const sourceEvaluationPath = path.join(sharedDir, 'source-evaluation-profile.json');
  const activeMoveOrderingPath = path.join(sharedDir, 'active-move-ordering-profile.json');
  const activeTuplePath = path.join(sharedDir, 'active-tuple-residual-profile.json');
  const activeMpcPath = path.join(sharedDir, 'active-mpc-profile.json');
  const resolvedConfigPath = path.join(sharedDir, 'resolved-stack-config.json');

  const sourceEvaluationProfile = JSON.parse(await fs.readFile(evaluationProfileJson, 'utf8'));
  await ensureJsonFile(sourceEvaluationPath, sourceEvaluationProfile);
  if (ACTIVE_MOVE_ORDERING_PROFILE) {
    await ensureJsonFile(activeMoveOrderingPath, ACTIVE_MOVE_ORDERING_PROFILE);
  }
  if (ACTIVE_TUPLE_RESIDUAL_PROFILE) {
    await ensureJsonFile(activeTuplePath, ACTIVE_TUPLE_RESIDUAL_PROFILE);
  }
  if (ACTIVE_MPC_PROFILE) {
    await ensureJsonFile(activeMpcPath, ACTIVE_MPC_PROFILE);
  }
  await ensureJsonFile(resolvedConfigPath, {
    candidateKey,
    evaluationProfileJson: relativePortable(evaluationProfileJson),
    resolvedConfig,
  });

  return {
    sharedDir,
    sourceEvaluationPath,
    activeMoveOrderingPath: ACTIVE_MOVE_ORDERING_PROFILE ? activeMoveOrderingPath : null,
    activeTuplePath: ACTIVE_TUPLE_RESIDUAL_PROFILE ? activeTuplePath : null,
    activeMpcPath: ACTIVE_MPC_PROFILE ? activeMpcPath : null,
    resolvedConfigPath,
  };
}

function makeManifest({ args, candidateKey, evaluationProfileJson, resolvedConfig, sharedPaths }) {
  const tupleDir = path.join(args.outputRoot, 'tuple');
  const moveOrderingDir = path.join(args.outputRoot, 'move-ordering');
  const mpcDir = path.join(args.outputRoot, 'mpc');
  const exportDir = path.join(args.outputRoot, 'exported');

  const tupleRawPath = path.join(tupleDir, 'trained-tuple-residual-profile.json');
  const tupleCalibratedPath = path.join(tupleDir, 'trained-tuple-residual-profile.calibrated.json');
  const moveOrderingPath = path.join(moveOrderingDir, 'trained-move-ordering-profile.json');
  const mpcCalibrationPath = path.join(mpcDir, 'trained-mpc-profile.json');
  const mpcRuntimePath = path.join(mpcDir, 'runtime-mpc-profile.json');
  const generatedModulePath = path.join(exportDir, 'learned-eval-profile.generated.js');
  const generatedModuleSummaryPath = path.join(exportDir, 'generated-module-summary.json');

  const includeTuple = args.phase === 'tuple' || args.phase === 'all';
  const includeMoveOrdering = args.phase === 'move-ordering' || args.phase === 'all';
  const includeMpc = args.phase === 'mpc' || args.phase === 'all';
  const includeExport = args.phase === 'export' || args.phase === 'all';

  const steps = [];

  if (includeTuple) {
    const tupleTrainArgs = [
      ...buildRepeatedInputArgs(args.inputs),
      '--evaluation-profile-json', sharedPaths.sourceEvaluationPath,
      ...(sharedPaths.activeTuplePath ? ['--seed-profile', sharedPaths.activeTuplePath] : ['--layout-name', String(resolvedConfig.tuple?.layoutName ?? 'orthogonal-adjacent-pairs-outer2-v1-patched-patched')]),
      '--phase-buckets', normalizeList(resolvedConfig.tuple?.phaseBuckets).join(','),
      '--holdout-mod', String(resolvedConfig.tuple?.holdoutMod ?? 10),
      '--holdout-residue', String(resolvedConfig.tuple?.holdoutResidue ?? 0),
      '--sample-stride', String(resolvedConfig.tuple?.sampleStride ?? 4),
      '--sample-residue', String(resolvedConfig.tuple?.sampleResidue ?? 0),
      '--epochs', String(resolvedConfig.tuple?.epochs ?? 1),
      '--learning-rate', String(resolvedConfig.tuple?.learningRate ?? 0.05),
      '--bias-learning-rate', String(resolvedConfig.tuple?.biasLearningRate ?? resolvedConfig.tuple?.learningRate ?? 0.05),
      '--l2', String(resolvedConfig.tuple?.l2 ?? 0.0005),
      '--gradient-clip', String(resolvedConfig.tuple?.gradientClip ?? 90000),
      '--min-visits', String(resolvedConfig.tuple?.minVisits ?? 32),
      '--progress-every', String(resolvedConfig.tuple?.progressEvery ?? 250000),
      '--output-json', tupleRawPath,
      '--output-module', 'off',
      '--name', `${candidateKey}__tuple-residual`,
      '--description', `${candidateKey} evaluation profile 기준의 tuple residual retrain candidate`,
    ];
    maybePushArg(tupleTrainArgs, 'limit', resolvedConfig.tuple?.limit);
    if (!sharedPaths.activeTuplePath) {
      maybePushArg(tupleTrainArgs, 'layout-name', resolvedConfig.tuple?.layoutName);
    }
    steps.push({
      key: 'train-tuple-residual-profile',
      label: 'train balanced13 tuple residual',
      script: path.join(repoRoot, 'tools', 'evaluator-training', 'train-tuple-residual-profile.mjs'),
      args: tupleTrainArgs,
      outputs: [tupleRawPath],
    });

    const tupleCalibrateArgs = [
      '--tuple-json', tupleRawPath,
      ...args.inputs.flatMap((inputPath) => ['--corpus', inputPath]),
      '--evaluation-profile-json', sharedPaths.sourceEvaluationPath,
      '--scope', String(resolvedConfig.tupleCalibration?.scope ?? 'holdout-selected'),
      '--shrink', String(resolvedConfig.tupleCalibration?.shrink ?? 1),
      '--max-bias-stones', String(resolvedConfig.tupleCalibration?.maxBiasStones ?? 1.5),
      '--holdout-mod', String(resolvedConfig.tupleCalibration?.holdoutMod ?? resolvedConfig.tuple?.holdoutMod ?? 10),
      '--holdout-residue', String(resolvedConfig.tupleCalibration?.holdoutResidue ?? resolvedConfig.tuple?.holdoutResidue ?? 0),
      '--progress-every', String(resolvedConfig.tupleCalibration?.progressEvery ?? 250000),
      '--output-json', tupleCalibratedPath,
    ];
    maybePushArg(tupleCalibrateArgs, 'limit', resolvedConfig.tupleCalibration?.limit);
    steps.push({
      key: 'calibrate-tuple-residual-profile',
      label: 'calibrate balanced13 tuple residual',
      script: path.join(repoRoot, 'tools', 'evaluator-training', 'calibrate-tuple-residual-profile.mjs'),
      args: tupleCalibrateArgs,
      outputs: [tupleCalibratedPath],
    });
  }

  if (includeMoveOrdering) {
    const moveOrderingArgs = [
      ...buildRepeatedInputArgs(args.inputs),
      '--teacher-evaluation-profile', sharedPaths.sourceEvaluationPath,
      ...(sharedPaths.activeMoveOrderingPath ? ['--teacher-move-ordering-profile', sharedPaths.activeMoveOrderingPath] : []),
      '--teacher-tuple-profile-json', tupleCalibratedPath,
      '--teacher-mpc-profile-json', 'off',
      '--child-buckets', normalizeList(resolvedConfig.moveOrdering?.childBuckets).join(','),
      '--exact-root-max-empties', String(resolvedConfig.moveOrdering?.exactRootMaxEmpties ?? 14),
      '--exact-root-time-limit-ms', String(resolvedConfig.moveOrdering?.exactRootTimeLimitMs ?? 60000),
      '--teacher-depth', String(resolvedConfig.moveOrdering?.teacherDepth ?? 6),
      '--teacher-time-limit-ms', String(resolvedConfig.moveOrdering?.teacherTimeLimitMs ?? 4000),
      '--teacher-exact-endgame-empties', String(resolvedConfig.moveOrdering?.teacherExactEndgameEmpties ?? 14),
      '--sample-stride', String(resolvedConfig.moveOrdering?.sampleStride ?? 200),
      '--sample-residue', String(resolvedConfig.moveOrdering?.sampleResidue ?? 0),
      '--max-roots-per-bucket', String(resolvedConfig.moveOrdering?.maxRootsPerBucket ?? 500),
      '--holdout-mod', String(resolvedConfig.moveOrdering?.holdoutMod ?? 10),
      '--holdout-residue', String(resolvedConfig.moveOrdering?.holdoutResidue ?? 0),
      '--lambda', String(resolvedConfig.moveOrdering?.lambda ?? 5000),
      '--progress-every', String(resolvedConfig.moveOrdering?.progressEvery ?? 20),
      '--target-mode', String(resolvedConfig.moveOrdering?.targetMode ?? 'root-mean'),
      '--root-weighting', String(resolvedConfig.moveOrdering?.rootWeighting ?? 'uniform'),
      '--exact-root-weight-scale', String(resolvedConfig.moveOrdering?.exactRootWeightScale ?? 1),
      ...(sharedPaths.activeMoveOrderingPath ? ['--seed-profile', sharedPaths.activeMoveOrderingPath] : []),
      '--output-json', moveOrderingPath,
      '--name', `${candidateKey}__move-ordering`,
      '--description', `${candidateKey} evaluation profile 기준의 move-ordering retrain candidate`,
    ];
    maybePushArg(moveOrderingArgs, 'exclude-features', normalizeList(resolvedConfig.moveOrdering?.excludeFeatures).join(','));
    steps.push({
      key: 'train-move-ordering-profile',
      label: 'train balanced13 move-ordering profile',
      script: path.join(repoRoot, 'tools', 'evaluator-training', 'train-move-ordering-profile.mjs'),
      args: moveOrderingArgs,
      outputs: [moveOrderingPath],
    });
  }

  if (includeMpc) {
    const mpcCalibrateArgs = [
      ...buildRepeatedInputArgs(args.inputs),
      '--evaluation-profile-json', sharedPaths.sourceEvaluationPath,
      '--move-ordering-profile-json', moveOrderingPath,
      '--tuple-profile-json', tupleCalibratedPath,
      '--mpc-profile-json', 'off',
      '--calibration-buckets', normalizeList(resolvedConfig.mpc?.calibrationBuckets).join(','),
      '--sample-stride', String(resolvedConfig.mpc?.sampleStride ?? 200),
      '--sample-residue', String(resolvedConfig.mpc?.sampleResidue ?? 0),
      '--max-samples-per-bucket', String(resolvedConfig.mpc?.maxSamplesPerBucket ?? 400),
      '--holdout-mod', String(resolvedConfig.mpc?.holdoutMod ?? 10),
      '--holdout-residue', String(resolvedConfig.mpc?.holdoutResidue ?? 0),
      '--target-holdout-coverage', String(resolvedConfig.mpc?.targetHoldoutCoverage ?? 0.99),
      '--time-limit-ms', String(resolvedConfig.mpc?.timeLimitMs ?? 120000),
      '--progress-every', String(resolvedConfig.mpc?.progressEvery ?? 20),
      '--max-table-entries', String(resolvedConfig.mpc?.maxTableEntries ?? 200000),
      '--aspiration-window', String(resolvedConfig.mpc?.aspirationWindow ?? 40),
      '--z-values', normalizeList(resolvedConfig.mpc?.zValues).join(','),
      '--output-json', mpcCalibrationPath,
      '--name', `${candidateKey}__mpc-calibration`,
      '--description', `${candidateKey} evaluation profile 기준의 MPC calibration candidate`,
    ];
    steps.push({
      key: 'calibrate-mpc-profile',
      label: 'calibrate balanced13 MPC profile',
      script: path.join(repoRoot, 'tools', 'evaluator-training', 'calibrate-mpc-profile.mjs'),
      args: mpcCalibrateArgs,
      outputs: [mpcCalibrationPath],
    });

    const runtimeArgs = [
      '--input-profile', mpcCalibrationPath,
      '--output-json', mpcRuntimePath,
      '--name', `${candidateKey}__runtime-mpc`,
      '--description', `${candidateKey} evaluation profile 기준의 runtime MPC variant`,
    ];
    maybePushArg(runtimeArgs, 'default-mode', resolvedConfig.runtime?.defaultMode);
    maybePushBooleanArg(runtimeArgs, 'enable-high-cut', resolvedConfig.runtime?.enableHighCut);
    maybePushBooleanArg(runtimeArgs, 'enable-low-cut', resolvedConfig.runtime?.enableLowCut);
    maybePushArg(runtimeArgs, 'max-window', resolvedConfig.runtime?.maxWindow);
    maybePushArg(runtimeArgs, 'max-checks-per-node', resolvedConfig.runtime?.maxChecksPerNode);
    maybePushArg(runtimeArgs, 'min-depth', resolvedConfig.runtime?.minDepth);
    maybePushArg(runtimeArgs, 'min-depth-gap', resolvedConfig.runtime?.minDepthGap);
    maybePushArg(runtimeArgs, 'max-depth-distance', resolvedConfig.runtime?.maxDepthDistance);
    maybePushArg(runtimeArgs, 'min-ply', resolvedConfig.runtime?.minPly);
    maybePushArg(runtimeArgs, 'interval-scale', resolvedConfig.runtime?.intervalScale);
    maybePushArg(runtimeArgs, 'high-scale', resolvedConfig.runtime?.highScale);
    maybePushArg(runtimeArgs, 'low-scale', resolvedConfig.runtime?.lowScale);
    maybePushArg(runtimeArgs, 'depth-distance-scale', resolvedConfig.runtime?.depthDistanceScale);
    steps.push({
      key: 'make-mpc-runtime-variant',
      label: 'derive runtime MPC variant',
      script: path.join(repoRoot, 'tools', 'evaluator-training', 'make-mpc-runtime-variant.mjs'),
      args: runtimeArgs,
      outputs: [mpcRuntimePath],
    });
  }

  if (includeExport) {
    steps.push({
      key: 'build-generated-profile-module',
      label: 'export balanced13 support-stack generated module',
      script: path.join(repoRoot, 'tools', 'evaluator-training', 'build-generated-profile-module.mjs'),
      args: [
        '--evaluation-json', sharedPaths.sourceEvaluationPath,
        '--move-ordering-json', moveOrderingPath,
        '--tuple-json', tupleCalibratedPath,
        '--mpc-json', mpcRuntimePath,
        '--output-module', generatedModulePath,
        '--module-format', String(resolvedConfig.moduleFormat ?? 'compact'),
        '--summary-json', generatedModuleSummaryPath,
      ],
      outputs: [generatedModulePath, generatedModuleSummaryPath],
    });
  }

  return {
    stage: 136,
    stageLabel: 'Stage 136',
    tool: 'stage136_balanced13_support_stack_bundle',
    description: 'Balanced13-specific support-stack learning bundle that retrains tuple residual, move-ordering, MPC calibration/runtime, and exports a combined generated module without installing it into runtime JS.',
    generatedAt: new Date().toISOString(),
    phase: args.phase,
    planOnly: args.planOnly,
    resume: args.resume,
    continueOnError: args.continueOnError,
    candidateKey,
    candidateDir: args.candidateDir ? relativePortable(args.candidateDir) : null,
    evaluationProfileJson: relativePortable(evaluationProfileJson),
    inputPaths: args.inputs.map((inputPath) => relativePortable(inputPath)),
    outputRoot: relativePortable(args.outputRoot),
    configPath: relativePortable(args.configPath),
    resolvedConfigPath: relativePortable(sharedPaths.resolvedConfigPath),
    outputs: {
      sharedDir: relativePortable(sharedPaths.sharedDir),
      tupleDir: relativePortable(tupleDir),
      moveOrderingDir: relativePortable(moveOrderingDir),
      mpcDir: relativePortable(mpcDir),
      exportDir: relativePortable(exportDir),
      tupleRawPath: relativePortable(tupleRawPath),
      tupleCalibratedPath: relativePortable(tupleCalibratedPath),
      moveOrderingPath: relativePortable(moveOrderingPath),
      mpcCalibrationPath: relativePortable(mpcCalibrationPath),
      mpcRuntimePath: relativePortable(mpcRuntimePath),
      generatedModulePath: relativePortable(generatedModulePath),
      generatedModuleSummaryPath: relativePortable(generatedModuleSummaryPath),
    },
    activeSeeds: {
      moveOrderingProfile: sharedPaths.activeMoveOrderingPath ? relativePortable(sharedPaths.activeMoveOrderingPath) : null,
      tupleResidualProfile: sharedPaths.activeTuplePath ? relativePortable(sharedPaths.activeTuplePath) : null,
      mpcProfile: sharedPaths.activeMpcPath ? relativePortable(sharedPaths.activeMpcPath) : null,
    },
    resolvedConfig,
    steps: steps.map((step) => ({
      key: step.key,
      label: step.label,
      script: relativePortable(step.script),
      args: step.args.map((value) => normalizeArgForManifest(value)),
      outputs: step.outputs.map((value) => relativePortable(value)),
    })),
    _resolvedSteps: steps,
  };
}

function createStepSignature(step) {
  return JSON.stringify({
    script: relativePortable(step.script),
    args: step.args.map((value) => normalizeArgForManifest(value)),
    outputs: step.outputs.map((value) => relativePortable(value)),
  });
}

async function canResumeStep(step) {
  if (!Array.isArray(step.outputs) || step.outputs.length === 0) {
    return false;
  }
  for (const outputPath of step.outputs) {
    if (!await pathExists(outputPath)) {
      return false;
    }
  }
  return true;
}

async function executeManifest(manifest, args) {
  const summarySteps = [];
  let bundleStatus = 'success';

  for (const step of manifest._resolvedSteps) {
    const signature = createStepSignature(step);
    const summaryEntry = {
      key: step.key,
      label: step.label,
      script: relativePortable(step.script),
      args: step.args.map((value) => normalizeArgForManifest(value)),
      outputs: step.outputs.map((value) => relativePortable(value)),
      signature,
      status: 'pending',
      startedAt: new Date().toISOString(),
    };

    if (args.planOnly) {
      summaryEntry.status = 'planned';
      summaryEntry.finishedAt = new Date().toISOString();
      summarySteps.push(summaryEntry);
      continue;
    }

    if (args.resume && await canResumeStep(step)) {
      summaryEntry.status = 'skipped';
      summaryEntry.skipReason = 'resume-outputs-exist';
      summaryEntry.finishedAt = new Date().toISOString();
      summarySteps.push(summaryEntry);
      continue;
    }

    await fs.mkdir(path.dirname(step.outputs[0]), { recursive: true }).catch(() => {});
    const startedMs = Date.now();
    const result = spawnSync(process.execPath, [step.script, ...step.args], {
      cwd: repoRoot,
      stdio: 'inherit',
      env: process.env,
    });
    summaryEntry.elapsedSeconds = (Date.now() - startedMs) / 1000;
    summaryEntry.finishedAt = new Date().toISOString();
    if (result.status === 0) {
      summaryEntry.status = 'success';
      summarySteps.push(summaryEntry);
      continue;
    }

    summaryEntry.status = 'failed';
    summaryEntry.exitCode = result.status;
    summaryEntry.signal = result.signal;
    summarySteps.push(summaryEntry);
    bundleStatus = 'failed';
    if (!args.continueOnError) {
      break;
    }
  }

  if (bundleStatus === 'success' && summarySteps.some((step) => step.status === 'failed')) {
    bundleStatus = 'partial';
  }
  if (args.planOnly) {
    bundleStatus = 'planned';
  }

  return { status: bundleStatus, steps: summarySteps };
}

function summarizeTupleProfile(profile) {
  return {
    name: profile?.name ?? null,
    layoutName: profile?.layout?.name ?? null,
    trainedBucketCount: Array.isArray(profile?.trainedBuckets) ? profile.trainedBuckets.length : 0,
    holdoutMaeDeltaInStones: profile?.calibration?.verifiedDiagnostics?.holdoutSelected?.delta?.maeInStones
      ?? profile?.diagnostics?.holdoutSelected?.delta?.maeInStones
      ?? null,
  };
}

function summarizeMoveOrderingProfile(profile) {
  return {
    name: profile?.name ?? null,
    trainedBucketCount: Array.isArray(profile?.trainedBuckets) ? profile.trainedBuckets.length : 0,
    holdoutTop1Accuracy: profile?.diagnostics?.holdoutRoots?.top1Accuracy ?? null,
    holdoutPairwiseAccuracy: profile?.diagnostics?.holdoutPairwise?.accuracy ?? null,
    holdoutWeightedPairwiseAccuracy: profile?.diagnostics?.holdoutPairwise?.weightedAccuracy ?? null,
  };
}

function summarizeMpcProfile(profile) {
  return {
    name: profile?.name ?? null,
    calibrationCount: Array.isArray(profile?.calibrations) ? profile.calibrations.length : 0,
    usableCalibrationCount: Array.isArray(profile?.calibrations)
      ? profile.calibrations.filter((entry) => entry?.usable).length
      : 0,
  };
}


async function validatePhasePrerequisites(manifest, args) {
  if (args.planOnly || args.phase === 'all' || args.phase === 'tuple') {
    return;
  }

  const missing = [];
  const requireOutput = async (absolutePath, label) => {
    if (!await pathExists(absolutePath)) {
      missing.push(`${label}: ${relativePortable(absolutePath)}`);
    }
  };

  const outputs = manifest.outputs;
  if (args.phase === 'move-ordering') {
    await requireOutput(path.resolve(repoRoot, outputs.tupleCalibratedPath), 'tuple calibrated profile');
  } else if (args.phase === 'mpc') {
    await requireOutput(path.resolve(repoRoot, outputs.tupleCalibratedPath), 'tuple calibrated profile');
    await requireOutput(path.resolve(repoRoot, outputs.moveOrderingPath), 'move-ordering profile');
  } else if (args.phase === 'export') {
    await requireOutput(path.resolve(repoRoot, outputs.tupleCalibratedPath), 'tuple calibrated profile');
    await requireOutput(path.resolve(repoRoot, outputs.moveOrderingPath), 'move-ordering profile');
    await requireOutput(path.resolve(repoRoot, outputs.mpcRuntimePath), 'runtime MPC profile');
  }

  if (missing.length > 0) {
    throw new Error([
      `Selected --phase ${args.phase} requires existing prior outputs under the same --output-root.`,
      ...missing.map((entry) => `  - ${entry}`),
      'Run the missing prerequisite phases first, or rerun with --phase all --resume.',
    ].join('\n'));
  }
}

async function buildArtifactsSummary(manifest) {
  const outputs = manifest.outputs;
  const tupleRaw = await loadJsonIfExists(path.resolve(repoRoot, outputs.tupleRawPath));
  const tupleCalibrated = await loadJsonIfExists(path.resolve(repoRoot, outputs.tupleCalibratedPath));
  const moveOrdering = await loadJsonIfExists(path.resolve(repoRoot, outputs.moveOrderingPath));
  const mpcCalibration = await loadJsonIfExists(path.resolve(repoRoot, outputs.mpcCalibrationPath));
  const mpcRuntime = await loadJsonIfExists(path.resolve(repoRoot, outputs.mpcRuntimePath));
  const generatedSummary = await loadJsonIfExists(path.resolve(repoRoot, outputs.generatedModuleSummaryPath));

  let generatedModuleBytes = null;
  const generatedModuleAbsolutePath = path.resolve(repoRoot, outputs.generatedModulePath);
  if (await pathExists(generatedModuleAbsolutePath)) {
    const stats = await fs.stat(generatedModuleAbsolutePath);
    generatedModuleBytes = stats.size;
  }

  return {
    tupleRaw: summarizeTupleProfile(tupleRaw),
    tupleCalibrated: summarizeTupleProfile(tupleCalibrated),
    moveOrdering: summarizeMoveOrderingProfile(moveOrdering),
    mpcCalibration: summarizeMpcProfile(mpcCalibration),
    mpcRuntime: summarizeMpcProfile(mpcRuntime),
    generatedModule: {
      outputModuleBytes: generatedModuleBytes,
      summary: generatedSummary,
    },
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.showHelp) {
  console.log(renderUsage());
  process.exit(0);
}

const evaluationProfileJson = args.evaluationProfileJson ?? resolveCandidateEvaluationProfilePath(args.candidateDir);
const candidateKey = deriveCandidateKey({ candidateDir: args.candidateDir, evaluationProfileJson });
const resolvedConfig = await readResolvedConfig(args.configPath);
const sharedPaths = args.planOnly
  ? {
      sharedDir: path.join(args.outputRoot, 'shared'),
      sourceEvaluationPath: path.join(args.outputRoot, 'shared', 'source-evaluation-profile.json'),
      activeMoveOrderingPath: ACTIVE_MOVE_ORDERING_PROFILE ? path.join(args.outputRoot, 'shared', 'active-move-ordering-profile.json') : null,
      activeTuplePath: ACTIVE_TUPLE_RESIDUAL_PROFILE ? path.join(args.outputRoot, 'shared', 'active-tuple-residual-profile.json') : null,
      activeMpcPath: ACTIVE_MPC_PROFILE ? path.join(args.outputRoot, 'shared', 'active-mpc-profile.json') : null,
      resolvedConfigPath: path.join(args.outputRoot, 'shared', 'resolved-stack-config.json'),
    }
  : await prepareSharedInputs({
      outputRoot: args.outputRoot,
      evaluationProfileJson,
      candidateKey,
      resolvedConfig,
    });

const manifest = makeManifest({ args, candidateKey, evaluationProfileJson, resolvedConfig, sharedPaths });
await validatePhasePrerequisites(manifest, args);
const manifestPath = path.join(args.outputRoot, 'bundle-manifest.json');
await ensureJsonFile(manifestPath, { ...manifest, _resolvedSteps: undefined });

const execution = await executeManifest(manifest, args);
const artifacts = args.planOnly ? null : await buildArtifactsSummary(manifest);
const summary = {
  stage: manifest.stage,
  stageLabel: manifest.stageLabel,
  tool: manifest.tool,
  generatedAt: new Date().toISOString(),
  status: execution.status,
  candidateKey,
  phase: args.phase,
  planOnly: args.planOnly,
  resume: args.resume,
  continueOnError: args.continueOnError,
  evaluationProfileJson: relativePortable(evaluationProfileJson),
  outputRoot: relativePortable(args.outputRoot),
  steps: execution.steps,
  artifacts,
};
const summaryPath = path.join(args.outputRoot, 'stage136-balanced13-support-stack-bundle-summary.json');
await ensureJsonFile(summaryPath, summary);

console.log(`Saved manifest to ${manifestPath}`);
console.log(`Saved summary to ${summaryPath}`);
if (artifacts) {
  console.log(`Tuple calibrated : ${artifacts.tupleCalibrated?.name ?? 'n/a'}`);
  console.log(`Move-ordering    : ${artifacts.moveOrdering?.name ?? 'n/a'}`);
  console.log(`MPC runtime      : ${artifacts.mpcRuntime?.name ?? 'n/a'}`);
  console.log(`Generated module : ${artifacts.generatedModule?.outputModuleBytes ?? 'n/a'} bytes`);
}
if (execution.status === 'failed') {
  process.exit(1);
}
