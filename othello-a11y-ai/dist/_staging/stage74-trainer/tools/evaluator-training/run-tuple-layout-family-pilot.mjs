#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

import {
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

function printUsage() {
  const toolPath = displayTrainingToolPath('run-tuple-layout-family-pilot.mjs');
  const outputDir = displayTrainingOutputPath('tuple-layout-family-pilot');
  console.log(`Usage:
  node ${toolPath} \
    --input <file-or-dir> [--input <file-or-dir> ...] \
    [--layouts orthogonal-adjacent-pairs-full-v1,diagonal-adjacent-pairs-full-v1,straight-adjacent-pairs-full-v1] \
    [--output-dir ${outputDir}] \
    [--evaluation-profile-json path/to/trained-evaluation-profile.json | --skip-phase-training] \
    [--phase-buckets ${DEFAULT_TUPLE_RESIDUAL_PHASE_BUCKET_KEYS.join(',')}] \
    [--target-scale 3000] [--holdout-mod 10] [--holdout-residue 0] [--progress-every 250000] \
    [--phase-limit 2000000] [--phase-lambda 5000] [--phase-skip-diagnostics] \
    [--tuple-limit 2000000] [--tuple-sample-stride 4] [--tuple-sample-residue 0] \
    [--tuple-epochs 1] [--tuple-learning-rate 0.05] [--tuple-l2 0.0005] \
    [--tuple-gradient-clip 90000] [--tuple-min-visits 32] \
    [--calibration-limit 2000000] [--calibration-scope holdout-selected|selected-all|all-samples] \
    [--calibration-shrink 1.0] [--calibration-max-bias-stones 1.5] \
    [--module-format compact|expanded] \
    [--summary-json path/to/tuple-layout-family-pilot-summary.json]

설명:
- phase evaluator를 먼저 학습(또는 제공된 evaluation JSON 재사용)한 뒤,
  여러 tuple layout family를 순서대로 train → calibrate → generated-module build까지 실행합니다.
- layout을 하나만 주면 사실상 현재 evaluator lane의 단일 후보 학습 파이프라인으로 사용할 수 있습니다.
- generated module은 각 후보 하위 폴더에 별도로 기록되므로, repo의 기본 runtime module을 덮어쓰지 않습니다.
`);
}

function parseCommaList(values) {
  return ensureArray(values)
    .flatMap((value) => String(value).split(','))
    .map((token) => token.trim())
    .filter(Boolean);
}

function parseLayoutNames(values) {
  const tokens = parseCommaList(values);
  return tokens.length > 0
    ? tokens
    : ['orthogonal-adjacent-pairs-full-v1', 'diagonal-adjacent-pairs-full-v1', 'straight-adjacent-pairs-full-v1'];
}

function parseInputPaths(args) {
  return [
    ...ensureArray(args.input),
    ...ensureArray(args['input-dir']),
  ].map((value) => resolveCliPath(value)).filter(Boolean);
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

function runNodeScript(scriptPath, args, { cwd = process.cwd() } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd,
      stdio: 'inherit',
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

function statBytes(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return null;
  }
}

function summarizeCandidate({
  layoutName,
  tupleProfilePath,
  calibratedTupleProfilePath,
  generatedModulePath,
}) {
  const tupleProfile = readJsonIfPresent(tupleProfilePath);
  const calibratedProfile = readJsonIfPresent(calibratedTupleProfilePath) ?? tupleProfile;
  const diagnostics = calibratedProfile?.diagnostics ?? tupleProfile?.diagnostics ?? null;
  const calibration = calibratedProfile?.calibration ?? null;
  const verifiedDiagnostics = calibration?.verifiedDiagnostics ?? null;
  const layout = calibratedProfile?.layout ?? tupleProfile?.layout ?? null;

  return {
    layoutName,
    tupleCount: layout?.tupleCount ?? (Array.isArray(layout?.tuples) ? layout.tuples.length : null),
    totalTableSize: layout?.totalTableSize ?? null,
    tupleProfilePath,
    calibratedTupleProfilePath,
    generatedModulePath,
    generatedModuleBytes: statBytes(generatedModulePath),
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

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const inputPaths = parseInputPaths(args);
if (inputPaths.length === 0) {
  printUsage();
  process.exit(1);
}

const outputDir = args['output-dir']
  ? resolveCliPath(args['output-dir'])
  : resolveCliPath('tools/evaluator-training/out/tuple-layout-family-pilot');
const summaryJsonPath = args['summary-json']
  ? resolveCliPath(args['summary-json'])
  : path.join(outputDir, 'tuple-layout-family-pilot-summary.json');
const layoutNames = parseLayoutNames(args.layouts ?? args.layout ?? args['layout-name']);
for (const layoutName of layoutNames) {
  if (!listTupleResidualLayoutNames().includes(layoutName)) {
    throw new Error(`Unknown tuple layout: ${layoutName}`);
  }
}

const moduleFormat = typeof args['module-format'] === 'string' ? args['module-format'] : 'compact';
const phaseBucketKeys = parseCommaList(args['phase-buckets']);
const targetScale = args['target-scale'] ?? 3000;
const holdoutMod = args['holdout-mod'] ?? 10;
const holdoutResidue = args['holdout-residue'] ?? 0;
const progressEvery = args['progress-every'] ?? 250000;
const phaseLimit = args['phase-limit'] ?? null;
const phaseLambda = args['phase-lambda'] ?? 5000;
const tupleLimit = args['tuple-limit'] ?? null;
const tupleSampleStride = args['tuple-sample-stride'] ?? 4;
const tupleSampleResidue = args['tuple-sample-residue'] ?? 0;
const tupleEpochs = args['tuple-epochs'] ?? 1;
const tupleLearningRate = args['tuple-learning-rate'] ?? 0.05;
const tupleL2 = args['tuple-l2'] ?? 0.0005;
const tupleGradientClip = args['tuple-gradient-clip'] ?? 90000;
const tupleMinVisits = args['tuple-min-visits'] ?? 32;
const calibrationLimit = args['calibration-limit'] ?? tupleLimit;
const calibrationScope = args['calibration-scope'] ?? 'holdout-selected';
const calibrationShrink = args['calibration-shrink'] ?? 1.0;
const calibrationMaxBiasStones = args['calibration-max-bias-stones'] ?? 1.5;
const providedEvaluationProfilePath = args['evaluation-profile-json'] ? resolveCliPath(args['evaluation-profile-json']) : null;
const skipPhaseTraining = Boolean(args['skip-phase-training']);

await fs.promises.mkdir(outputDir, { recursive: true });

const phaseTrainScript = resolveTrainingToolPath('train-phase-linear.mjs');
const tupleTrainScript = resolveTrainingToolPath('train-tuple-residual-profile.mjs');
const tupleCalibrateScript = resolveTrainingToolPath('calibrate-tuple-residual-profile.mjs');
const exportModuleScript = resolveTrainingToolPath('export-profile-module.mjs');

let evaluationProfilePath = providedEvaluationProfilePath;
if (!evaluationProfilePath && !skipPhaseTraining) {
  evaluationProfilePath = path.join(outputDir, 'trained-evaluation-profile.json');
  const phaseArgs = [];
  pushMultiArg(phaseArgs, 'input', inputPaths);
  pushArg(phaseArgs, 'target-scale', targetScale);
  pushArg(phaseArgs, 'holdout-mod', holdoutMod);
  pushArg(phaseArgs, 'holdout-residue', holdoutResidue);
  pushArg(phaseArgs, 'lambda', phaseLambda);
  pushArg(phaseArgs, 'progress-every', progressEvery);
  pushArg(phaseArgs, 'output-json', evaluationProfilePath);
  pushArg(phaseArgs, 'module-format', moduleFormat);
  pushFlag(phaseArgs, 'skip-diagnostics', Boolean(args['phase-skip-diagnostics']));
  pushArg(phaseArgs, 'limit', phaseLimit);
  console.log('[pilot] phase evaluator training 시작');
  await runNodeScript(phaseTrainScript, phaseArgs);
}

if (!evaluationProfilePath && skipPhaseTraining) {
  console.log('[pilot] phase evaluator 재학습은 건너뛰고 현재 active evaluation profile을 그대로 사용합니다.');
}

const candidates = [];
for (const layoutName of layoutNames) {
  const candidateDir = path.join(outputDir, layoutName);
  await fs.promises.mkdir(candidateDir, { recursive: true });

  const tupleProfilePath = path.join(candidateDir, 'trained-tuple-residual-profile.json');
  const tuplePreviewModulePath = path.join(candidateDir, 'learned-eval-profile.preview.generated.js');
  const calibratedTupleProfilePath = path.join(candidateDir, 'trained-tuple-residual-profile.calibrated.json');
  const calibratedSummaryPath = path.join(candidateDir, 'tuple-residual-calibration-summary.json');
  const generatedModulePath = path.join(candidateDir, 'learned-eval-profile.generated.js');

  console.log(`[pilot] tuple training 시작: ${layoutName}`);
  const tupleTrainArgs = [];
  pushMultiArg(tupleTrainArgs, 'input', inputPaths);
  pushArg(tupleTrainArgs, 'target-scale', targetScale);
  pushArg(tupleTrainArgs, 'holdout-mod', holdoutMod);
  pushArg(tupleTrainArgs, 'holdout-residue', holdoutResidue);
  pushArg(tupleTrainArgs, 'sample-stride', tupleSampleStride);
  pushArg(tupleTrainArgs, 'sample-residue', tupleSampleResidue);
  pushArg(tupleTrainArgs, 'epochs', tupleEpochs);
  pushArg(tupleTrainArgs, 'learning-rate', tupleLearningRate);
  pushArg(tupleTrainArgs, 'l2', tupleL2);
  pushArg(tupleTrainArgs, 'gradient-clip', tupleGradientClip);
  pushArg(tupleTrainArgs, 'min-visits', tupleMinVisits);
  pushArg(tupleTrainArgs, 'limit', tupleLimit);
  pushArg(tupleTrainArgs, 'progress-every', progressEvery);
  pushArg(tupleTrainArgs, 'layout-name', layoutName);
  pushArg(tupleTrainArgs, 'phase-buckets', phaseBucketKeys.length > 0 ? phaseBucketKeys.join(',') : DEFAULT_TUPLE_RESIDUAL_PHASE_BUCKET_KEYS.join(','));
  pushArg(tupleTrainArgs, 'output-json', tupleProfilePath);
  pushArg(tupleTrainArgs, 'output-module', tuplePreviewModulePath);
  pushArg(tupleTrainArgs, 'module-format', moduleFormat);
  pushArg(tupleTrainArgs, 'evaluation-profile-json', evaluationProfilePath);
  pushFlag(tupleTrainArgs, 'skip-diagnostics', Boolean(args['tuple-skip-diagnostics']));
  await runNodeScript(tupleTrainScript, tupleTrainArgs);

  console.log(`[pilot] tuple calibration 시작: ${layoutName}`);
  const calibrationArgs = [];
  pushArg(calibrationArgs, 'tuple-json', tupleProfilePath);
  pushMultiArg(calibrationArgs, 'corpus', inputPaths);
  pushArg(calibrationArgs, 'evaluation-profile-json', evaluationProfilePath);
  pushArg(calibrationArgs, 'scope', calibrationScope);
  pushArg(calibrationArgs, 'shrink', calibrationShrink);
  pushArg(calibrationArgs, 'max-bias-stones', calibrationMaxBiasStones);
  pushArg(calibrationArgs, 'holdout-mod', holdoutMod);
  pushArg(calibrationArgs, 'holdout-residue', holdoutResidue);
  pushArg(calibrationArgs, 'limit', calibrationLimit);
  pushArg(calibrationArgs, 'progress-every', progressEvery);
  pushArg(calibrationArgs, 'output-json', calibratedTupleProfilePath);
  pushArg(calibrationArgs, 'summary-json', calibratedSummaryPath);
  await runNodeScript(tupleCalibrateScript, calibrationArgs);

  console.log(`[pilot] generated module export 시작: ${layoutName}`);
  const exportArgs = [];
  pushArg(exportArgs, 'evaluation-json', evaluationProfilePath);
  pushArg(exportArgs, 'tuple-json', calibratedTupleProfilePath);
  pushArg(exportArgs, 'output-module', generatedModulePath);
  pushArg(exportArgs, 'module-format', moduleFormat);
  await runNodeScript(exportModuleScript, exportArgs);

  candidates.push(summarizeCandidate({
    layoutName,
    tupleProfilePath,
    calibratedTupleProfilePath,
    generatedModulePath,
  }));
}

const summary = {
  generatedAt: new Date().toISOString(),
  inputPaths,
  outputDir,
  moduleFormat,
  evaluationProfilePath,
  usedActiveEvaluationProfile: !evaluationProfilePath,
  phaseBucketKeys: phaseBucketKeys.length > 0 ? phaseBucketKeys : [...DEFAULT_TUPLE_RESIDUAL_PHASE_BUCKET_KEYS],
  layoutNames,
  candidates,
};

await fs.promises.mkdir(path.dirname(summaryJsonPath), { recursive: true });
await fs.promises.writeFile(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(`[pilot] 완료: ${formatInteger(candidates.length)} candidate(s)`);
console.log(`Saved summary to ${summaryJsonPath}`);
