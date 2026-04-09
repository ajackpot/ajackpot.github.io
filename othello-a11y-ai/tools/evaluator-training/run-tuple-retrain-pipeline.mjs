#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

import {
  PROJECT_ROOT_DIR,
  displayGeneratedProfilesModulePath,
  displayProjectPath,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  parseArgs,
  relativePathFromCwd,
  resolveCliPath,
  resolveGeneratedProfilesModulePath,
  resolveTrainingOutputPath,
  toPortablePath,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('run-tuple-retrain-pipeline.mjs');
  const corpusPath = 'D:/othello-data/Egaroucid_Train_Data';
  const seedProfilePath = 'C:/weights/trained-tuple-residual-profile.calibrated.json';
  const evaluationProfilePath = displayTrainingOutputPath('trained-evaluation-profile.json');
  const outputDir = displayTrainingOutputPath('tuple-pipeline', 'top24-retrain');
  console.log(`Usage:
  node ${toolPath} \
    --input ${corpusPath} \
    --seed-profile ${seedProfilePath} \
    [--evaluation-profile-json ${evaluationProfilePath}] \
    [--preset top24-retrain | top24-retrain-lateb-endgame | full56-retrain | lateb-endgame-retrain] \
    [--output-dir ${outputDir}] \
    [--phase-buckets midgame-c,late-a,late-b,endgame] \
    [--epochs 1] [--sample-stride 4] [--learning-rate 0.05] [--bias-learning-rate 0.05] \
    [--l2 0.0005] [--gradient-clip 90000] [--min-visits 32] \
    [--holdout-mod 10] [--holdout-residue 0] [--progress-every 250000] \
    [--depth-empties 18,20,22,24] [--depth-seed-count 10] [--depth-time-limit-ms 700] [--depth-max-depth 6] \
    [--exact-empties 10,12,14] [--exact-seed-count 10] [--exact-time-limit-ms 60000] [--exact-max-depth 12] [--exact-repetitions 1] \
    [--patch-keep-buckets late-b,endgame] [--patch-keep-top-tuples 24] [--patch-tuple-score sum-abs] \
    [--final-keep-buckets late-b,endgame] [--final-keep-top-tuples 24] [--final-tuple-score sum-abs] \
    [--install-final] [--output-module ${displayGeneratedProfilesModulePath()}] [--dry-run]

설명:
- patch -> warm-start retrain -> corpus calibration -> (optional) final patch -> generated module artifact -> inspection -> depth benchmark -> exact benchmark -> (optional) install
  을 한 번에 수행합니다.
- 기본값으로 실제 app의 learned-eval-profile.generated.js는 건드리지 않습니다.
- output-dir 아래의 *.generated.js 는 이제 항상 **최종 candidate(tuple calibration/final patch 반영)** 기준으로 다시 생성됩니다.
- --install-final을 주면 마지막 candidate tuple을 output-module(target module)에 설치합니다.
- preset은 편의용 기본 patch 규칙을 제공합니다.
  * top24-retrain                 : top24 patch를 seed/layout으로 사용
  * top24-retrain-lateb-endgame   : top24 재학습 후 최종 candidate는 late-b,endgame만 남기는 보수적 post-patch
  * full56-retrain                : patch 없이 현재 seed layout 전체를 그대로 재학습
  * lateb-endgame-retrain         : late-b,endgame bucket만 남겨 재학습
- preset보다 명시적 patch 플래그(--patch-*) / final patch 플래그(--final-*)가 우선합니다.
`);
}

function slugify(value, fallback = 'tuple-pipeline') {
  const normalized = String(value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || fallback;
}

function toFiniteInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function pushArg(argv, key, value) {
  if (value === undefined || value === null || value === '') {
    return;
  }
  argv.push(`--${key}`, String(value));
}

function hasExplicitPatchArgs(args) {
  return Boolean(
    args['patch-keep-buckets']
    || args['patch-drop-buckets']
    || args['patch-keep-top-tuples']
    || args['patch-keep-tuples']
    || args['patch-drop-tuples']
  );
}

function hasExplicitFinalPatchArgs(args) {
  return Boolean(
    args['final-keep-buckets']
    || args['final-drop-buckets']
    || args['final-keep-top-tuples']
    || args['final-keep-tuples']
    || args['final-drop-tuples']
  );
}

function applyPreset(preset, patchConfig, finalPatchConfig, phaseBucketConfig) {
  if (preset === 'top24-retrain' || preset === 'top24-retrain-lateb-endgame') {
    if (!patchConfig.keepTopTuples) {
      patchConfig.keepTopTuples = '24';
    }
    if (!patchConfig.tupleScore) {
      patchConfig.tupleScore = 'sum-abs';
    }
    if (!phaseBucketConfig.value) {
      phaseBucketConfig.value = 'midgame-c,late-a,late-b,endgame';
    }
    if (preset === 'top24-retrain-lateb-endgame' && !finalPatchConfig.keepBuckets) {
      finalPatchConfig.keepBuckets = 'late-b,endgame';
    }
    return;
  }

  if (preset === 'lateb-endgame-retrain') {
    if (!patchConfig.keepBuckets) {
      patchConfig.keepBuckets = 'late-b,endgame';
    }
    if (!phaseBucketConfig.value) {
      phaseBucketConfig.value = 'late-b,endgame';
    }
    return;
  }

  if (preset === 'full56-retrain') {
    if (!phaseBucketConfig.value) {
      phaseBucketConfig.value = 'midgame-c,late-a,late-b,endgame';
    }
  }
}

function createStepCommand(scriptRelativePath, args) {
  return [process.execPath, path.resolve(PROJECT_ROOT_DIR, scriptRelativePath), ...args];
}

function renderCommand(command) {
  return command.map((token) => (
    /\s/.test(token) || token.includes('"')
      ? `"${String(token).replace(/"/g, '\\"')}"`
      : token
  )).join(' ');
}

async function runCommand(command, { cwd = PROJECT_ROOT_DIR, dryRun = false } = {}) {
  if (dryRun) {
    console.log(`[dry-run] ${renderCommand(command)}`);
    return { code: 0, signal: null };
  }

  await new Promise((resolve, reject) => {
    const child = spawn(command[0], command.slice(1), {
      cwd,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      const error = new Error(`command failed with code=${code ?? 'null'} signal=${signal ?? 'null'}`);
      error.code = code;
      error.signal = signal;
      reject(error);
    });
  });

  return { code: 0, signal: null };
}

function nowIso() {
  return new Date().toISOString();
}

function loadJsonIfPresent(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(targetPath, 'utf8'));
}

function summarizeBenchmarks(depthSummary, exactSummary) {
  return {
    depth: depthSummary
      ? {
          cases: depthSummary.overall?.cases ?? null,
          identicalBestMoveCases: depthSummary.overall?.identicalBestMoveCases ?? null,
          nodeDeltaPercent: depthSummary.overall?.nodeDeltaPercent ?? null,
          elapsedDeltaPercent: depthSummary.overall?.elapsedDeltaPercent ?? null,
        }
      : null,
    exact: exactSummary
      ? {
          cases: exactSummary.overall?.cases ?? null,
          identicalScoreCases: exactSummary.overall?.identicalScoreCases ?? null,
          identicalBestMoveCases: exactSummary.overall?.identicalBestMoveCases ?? null,
          nodeDeltaPercent: exactSummary.overall?.nodeDeltaPercent ?? null,
          elapsedDeltaPercent: exactSummary.overall?.elapsedDeltaPercent ?? null,
        }
      : null,
  };
}

function deriveRecommendation({ inspectionSummary, depthSummary, exactSummary, usedPatch }) {
  const inspectionVerdict = inspectionSummary?.verdict?.status ?? null;
  const depth = depthSummary?.overall ?? null;
  const exact = exactSummary?.overall ?? null;
  const notes = [];

  if (inspectionVerdict === 'needs-review') {
    notes.push('inspection verdict is needs-review; calibration or retrain may still need manual review.');
  }

  if (exact && exact.identicalScoreCases !== exact.cases) {
    return {
      status: 'reject',
      notes: [...notes, 'exact benchmark changed the exact score in at least one case.'],
    };
  }

  if (exact && exact.identicalBestMoveCases !== exact.cases) {
    return {
      status: 'manual-review',
      notes: [...notes, 'exact benchmark preserved score but changed best move in at least one case.'],
    };
  }

  if (depth && depth.identicalBestMoveCases === depth.cases && Number(depth.elapsedDeltaPercent ?? 0) <= 2) {
    return {
      status: 'adopt-candidate',
      notes: [...notes, 'depth benchmark kept all best moves and stayed within the default time threshold (+2%).'],
    };
  }

  if (depth && Number(depth.nodeDeltaPercent ?? 0) < 0 && Number(depth.elapsedDeltaPercent ?? 0) <= 5) {
    return {
      status: usedPatch ? 'promising-reduced-layout' : 'promising-but-costly',
      notes: [...notes, 'depth benchmark reduced nodes, but time/best-move stability still needs a policy decision.'],
    };
  }

  return {
    status: 'manual-review',
    notes: [...notes, 'candidate needs manual review before adoption.'],
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h || !args.input || !args['seed-profile']) {
  printUsage();
  process.exit(args.help || args.h ? 0 : 1);
}

const dryRun = Boolean(args['dry-run']);
const installFinal = Boolean(args['install-final']);
const skipPatch = Boolean(args['skip-patch']);
const skipDepthBenchmark = Boolean(args['skip-depth-benchmark']);
const skipExactBenchmark = Boolean(args['skip-exact-benchmark']);
const skipInspection = Boolean(args['skip-inspection']);
const preset = typeof args.preset === 'string' ? args.preset.trim() : 'top24-retrain';
const runName = slugify(args['run-name'] ?? preset ?? 'tuple-pipeline');
const outputDir = args['output-dir']
  ? resolveCliPath(args['output-dir'])
  : resolveTrainingOutputPath('tuple-pipeline', runName);
const evaluationProfileJson = args['evaluation-profile-json']
  ? resolveCliPath(args['evaluation-profile-json'])
  : resolveTrainingOutputPath('trained-evaluation-profile.json');
const moveOrderingProfileJson = resolveTrainingOutputPath('trained-move-ordering-profile.json');
const seedProfileJson = resolveCliPath(args['seed-profile']);
const installOutputModule = args['output-module']
  ? resolveCliPath(args['output-module'])
  : resolveGeneratedProfilesModulePath();

const patchConfig = {
  keepBuckets: args['patch-keep-buckets'] ?? null,
  dropBuckets: args['patch-drop-buckets'] ?? null,
  keepTopTuples: args['patch-keep-top-tuples'] ?? null,
  tupleScore: args['patch-tuple-score'] ?? 'sum-abs',
  keepTuples: args['patch-keep-tuples'] ?? null,
  dropTuples: args['patch-drop-tuples'] ?? null,
};
const finalPatchConfig = {
  keepBuckets: args['final-keep-buckets'] ?? null,
  dropBuckets: args['final-drop-buckets'] ?? null,
  keepTopTuples: args['final-keep-top-tuples'] ?? null,
  tupleScore: args['final-tuple-score'] ?? 'sum-abs',
  keepTuples: args['final-keep-tuples'] ?? null,
  dropTuples: args['final-drop-tuples'] ?? null,
};
const phaseBucketConfig = {
  value: args['phase-buckets'] ?? null,
};
applyPreset(preset, patchConfig, finalPatchConfig, phaseBucketConfig);

await fs.promises.mkdir(outputDir, { recursive: true });

const patchJson = path.join(outputDir, `${runName}.seed.patch.json`);
const patchSummaryJson = path.join(outputDir, `${runName}.seed.patch.summary.json`);
const retrainedJson = path.join(outputDir, `${runName}.retrained.json`);
const tempGeneratedModule = path.join(outputDir, `${runName}.generated.js`);
const calibratedJson = path.join(outputDir, `${runName}.retrained.calibrated.json`);
const calibrationSummaryJson = path.join(outputDir, `${runName}.calibration.summary.json`);
const candidateJson = path.join(outputDir, `${runName}.candidate.json`);
const candidateSummaryJson = path.join(outputDir, `${runName}.candidate.summary.json`);
const generatedModuleSummaryJson = path.join(outputDir, `${runName}.generated.summary.json`);
const inspectionJson = path.join(outputDir, `${runName}.inspection.json`);
const depthBenchmarkJson = path.join(outputDir, `${runName}.depth-benchmark.json`);
const exactBenchmarkJson = path.join(outputDir, `${runName}.exact-benchmark.json`);
const installSummaryJson = path.join(outputDir, `${runName}.install.summary.json`);
const pipelineSummaryJson = path.join(outputDir, `${runName}.pipeline-summary.json`);

const depthEmpties = args['depth-empties'] ?? '18,20,22,24';
const depthSeedCount = toFiniteInteger(args['depth-seed-count'], 10);
const depthTimeLimitMs = toFiniteInteger(args['depth-time-limit-ms'], 700);
const depthMaxDepth = toFiniteInteger(args['depth-max-depth'], 6);
const exactEmpties = args['exact-empties'] ?? '10,12,14';
const exactSeedCount = toFiniteInteger(args['exact-seed-count'], 10);
const exactTimeLimitMs = toFiniteInteger(args['exact-time-limit-ms'], 60000);
const exactMaxDepth = toFiniteInteger(args['exact-max-depth'], 12);
const exactRepetitions = toFiniteInteger(args['exact-repetitions'], 1);

const summary = {
  generatedAt: nowIso(),
  runName,
  preset,
  dryRun,
  installFinal,
  projectRoot: toPortablePath(PROJECT_ROOT_DIR),
  inputs: {
    corpus: toPortablePath(resolveCliPath(args.input)),
    seedProfile: toPortablePath(seedProfileJson),
    evaluationProfileJson: toPortablePath(evaluationProfileJson),
    moveOrderingProfileJson: toPortablePath(moveOrderingProfileJson),
  },
  outputs: {
    outputDir: toPortablePath(outputDir),
    patchJson: toPortablePath(patchJson),
    retrainedJson: toPortablePath(retrainedJson),
    calibratedJson: toPortablePath(calibratedJson),
    candidateJson: toPortablePath(candidateJson),
    generatedModule: toPortablePath(tempGeneratedModule),
    inspectionJson: toPortablePath(inspectionJson),
    depthBenchmarkJson: toPortablePath(depthBenchmarkJson),
    exactBenchmarkJson: toPortablePath(exactBenchmarkJson),
    pipelineSummaryJson: toPortablePath(pipelineSummaryJson),
    ...(installFinal ? {
      installedModule: toPortablePath(installOutputModule),
      installSummaryJson: toPortablePath(installSummaryJson),
    } : {}),
  },
  patchConfig: { ...patchConfig, phaseBuckets: phaseBucketConfig.value },
  finalPatchConfig: { ...finalPatchConfig },
  steps: [],
};

async function executeStep(label, command, { skip = false } = {}) {
  const startedAt = nowIso();
  const step = {
    label,
    command: command ? renderCommand(command) : null,
    startedAt,
    skipped: skip,
  };
  summary.steps.push(step);

  if (skip) {
    step.finishedAt = nowIso();
    step.status = 'skipped';
    return;
  }

  console.log(`\n== ${label} ==`);
  console.log(renderCommand(command));
  try {
    await runCommand(command, { dryRun });
    step.finishedAt = nowIso();
    step.status = 'ok';
  } catch (error) {
    step.finishedAt = nowIso();
    step.status = 'failed';
    step.error = error.message;
    await fs.promises.writeFile(pipelineSummaryJson, JSON.stringify(summary, null, 2), 'utf8');
    throw error;
  }
}

let trainSeedJson = seedProfileJson;
const patchRequested = !skipPatch && hasExplicitPatchArgs({
  'patch-keep-buckets': patchConfig.keepBuckets,
  'patch-drop-buckets': patchConfig.dropBuckets,
  'patch-keep-top-tuples': patchConfig.keepTopTuples,
  'patch-keep-tuples': patchConfig.keepTuples,
  'patch-drop-tuples': patchConfig.dropTuples,
});

if (patchRequested) {
  const patchArgs = [];
  pushArg(patchArgs, 'input', seedProfileJson);
  pushArg(patchArgs, 'output-json', patchJson);
  pushArg(patchArgs, 'summary-json', patchSummaryJson);
  pushArg(patchArgs, 'keep-buckets', patchConfig.keepBuckets);
  pushArg(patchArgs, 'drop-buckets', patchConfig.dropBuckets);
  pushArg(patchArgs, 'keep-top-tuples', patchConfig.keepTopTuples);
  pushArg(patchArgs, 'tuple-score', patchConfig.tupleScore);
  pushArg(patchArgs, 'keep-tuples', patchConfig.keepTuples);
  pushArg(patchArgs, 'drop-tuples', patchConfig.dropTuples);
  pushArg(patchArgs, 'name', `${runName}-seed-patch`);
  pushArg(patchArgs, 'description', `${runName} seed patch for warm-start retraining`);
  await executeStep('patch seed profile', createStepCommand('tools/evaluator-training/patch-tuple-residual-profile.mjs', patchArgs));
  trainSeedJson = patchJson;
} else {
  summary.steps.push({
    label: 'patch seed profile',
    startedAt: nowIso(),
    finishedAt: nowIso(),
    skipped: true,
    status: skipPatch ? 'skipped' : 'not-requested',
    command: null,
  });
}

const trainArgs = [];
pushArg(trainArgs, 'input', resolveCliPath(args.input));
pushArg(trainArgs, 'evaluation-profile-json', evaluationProfileJson);
pushArg(trainArgs, 'seed-profile', trainSeedJson);
pushArg(trainArgs, 'layout-json', trainSeedJson);
pushArg(trainArgs, 'output-json', retrainedJson);
pushArg(trainArgs, 'name', `${runName}-retrained`);
pushArg(trainArgs, 'description', `${runName} retrained tuple residual profile`);
pushArg(trainArgs, 'phase-buckets', phaseBucketConfig.value);
for (const key of [
  'target-scale',
  'holdout-mod',
  'holdout-residue',
  'sample-stride',
  'sample-residue',
  'epochs',
  'learning-rate',
  'bias-learning-rate',
  'l2',
  'gradient-clip',
  'min-visits',
  'progress-every',
]) {
  pushArg(trainArgs, key, args[key]);
}
if (args['skip-diagnostics']) {
  trainArgs.push('--skip-diagnostics');
}
await executeStep('train tuple residual', createStepCommand('tools/evaluator-training/train-tuple-residual-profile.mjs', trainArgs));

const calibrationArgs = [];
pushArg(calibrationArgs, 'tuple-json', retrainedJson);
pushArg(calibrationArgs, 'output-json', calibratedJson);
pushArg(calibrationArgs, 'summary-json', calibrationSummaryJson);
pushArg(calibrationArgs, 'corpus', resolveCliPath(args.input));
pushArg(calibrationArgs, 'evaluation-profile-json', evaluationProfileJson);
for (const key of ['scope', 'shrink', 'max-bias-stones', 'holdout-mod', 'holdout-residue', 'target-scale']) {
  pushArg(calibrationArgs, key, args[`calibration-${key}`] ?? args[key]);
}
await executeStep('calibrate retrained tuple residual', createStepCommand('tools/evaluator-training/calibrate-tuple-residual-profile.mjs', calibrationArgs));

const finalPatchRequested = hasExplicitFinalPatchArgs({
  'final-keep-buckets': finalPatchConfig.keepBuckets,
  'final-drop-buckets': finalPatchConfig.dropBuckets,
  'final-keep-top-tuples': finalPatchConfig.keepTopTuples,
  'final-keep-tuples': finalPatchConfig.keepTuples,
  'final-drop-tuples': finalPatchConfig.dropTuples,
});

let finalCandidateJson = calibratedJson;
if (finalPatchRequested) {
  const candidatePatchArgs = [];
  pushArg(candidatePatchArgs, 'input', calibratedJson);
  pushArg(candidatePatchArgs, 'output-json', candidateJson);
  pushArg(candidatePatchArgs, 'summary-json', candidateSummaryJson);
  pushArg(candidatePatchArgs, 'keep-buckets', finalPatchConfig.keepBuckets);
  pushArg(candidatePatchArgs, 'drop-buckets', finalPatchConfig.dropBuckets);
  pushArg(candidatePatchArgs, 'keep-top-tuples', finalPatchConfig.keepTopTuples);
  pushArg(candidatePatchArgs, 'tuple-score', finalPatchConfig.tupleScore);
  pushArg(candidatePatchArgs, 'keep-tuples', finalPatchConfig.keepTuples);
  pushArg(candidatePatchArgs, 'drop-tuples', finalPatchConfig.dropTuples);
  pushArg(candidatePatchArgs, 'name', `${runName}-candidate`);
  pushArg(candidatePatchArgs, 'description', `${runName} final candidate patch`);
  await executeStep('final patch calibrated tuple residual', createStepCommand('tools/evaluator-training/patch-tuple-residual-profile.mjs', candidatePatchArgs));
  finalCandidateJson = candidateJson;
} else {
  summary.steps.push({
    label: 'final patch calibrated tuple residual',
    startedAt: nowIso(),
    finishedAt: nowIso(),
    skipped: true,
    status: 'not-requested',
    command: null,
  });
}

const generatedModuleArgs = [];
pushArg(generatedModuleArgs, 'tuple-json', finalCandidateJson);
pushArg(generatedModuleArgs, 'output-module', tempGeneratedModule);
pushArg(generatedModuleArgs, 'summary-json', generatedModuleSummaryJson);
pushArg(generatedModuleArgs, 'evaluation-json', evaluationProfileJson);
pushArg(generatedModuleArgs, 'move-ordering-json', moveOrderingProfileJson);
await executeStep('write candidate generated module artifact', createStepCommand('tools/evaluator-training/install-tuple-residual-profile.mjs', generatedModuleArgs));

const inspectArgs = [];
pushArg(inspectArgs, 'input', finalCandidateJson);
pushArg(inspectArgs, 'output-json', inspectionJson);
await executeStep('inspect candidate tuple residual', createStepCommand('tools/evaluator-training/inspect-tuple-residual-profile.mjs', inspectArgs), { skip: skipInspection });

summary.outputs.candidateJson = toPortablePath(finalCandidateJson);

const depthArgs = [];
pushArg(depthArgs, 'baseline-profile', evaluationProfileJson);
pushArg(depthArgs, 'candidate-profile', evaluationProfileJson);
pushArg(depthArgs, 'baseline-move-ordering-profile', moveOrderingProfileJson);
pushArg(depthArgs, 'candidate-move-ordering-profile', moveOrderingProfileJson);
pushArg(depthArgs, 'candidate-tuple-profile', finalCandidateJson);
pushArg(depthArgs, 'output-json', depthBenchmarkJson);
pushArg(depthArgs, 'empties', depthEmpties);
pushArg(depthArgs, 'seed-count', depthSeedCount);
pushArg(depthArgs, 'time-limit-ms', depthTimeLimitMs);
pushArg(depthArgs, 'max-depth', depthMaxDepth);
await executeStep('depth benchmark vs no tuple', createStepCommand('tools/evaluator-training/benchmark-depth-search-profile.mjs', depthArgs), { skip: skipDepthBenchmark });

const exactArgs = [];
pushArg(exactArgs, 'baseline-profile', evaluationProfileJson);
pushArg(exactArgs, 'candidate-profile', evaluationProfileJson);
pushArg(exactArgs, 'baseline-move-ordering-profile', moveOrderingProfileJson);
pushArg(exactArgs, 'candidate-move-ordering-profile', moveOrderingProfileJson);
pushArg(exactArgs, 'candidate-tuple-profile', finalCandidateJson);
pushArg(exactArgs, 'output-json', exactBenchmarkJson);
pushArg(exactArgs, 'empties', exactEmpties);
pushArg(exactArgs, 'seed-count', exactSeedCount);
pushArg(exactArgs, 'time-limit-ms', exactTimeLimitMs);
pushArg(exactArgs, 'max-depth', exactMaxDepth);
pushArg(exactArgs, 'repetitions', exactRepetitions);
await executeStep('exact benchmark vs no tuple', createStepCommand('tools/evaluator-training/benchmark-exact-search-profile.mjs', exactArgs), { skip: skipExactBenchmark });

const installArgs = [];
pushArg(installArgs, 'tuple-json', finalCandidateJson);
pushArg(installArgs, 'output-module', installOutputModule);
pushArg(installArgs, 'summary-json', installSummaryJson);
pushArg(installArgs, 'evaluation-json', evaluationProfileJson);
pushArg(installArgs, 'move-ordering-json', moveOrderingProfileJson);
await executeStep('install final tuple residual', createStepCommand('tools/evaluator-training/install-tuple-residual-profile.mjs', installArgs), { skip: !installFinal });

const inspectionSummary = skipInspection || dryRun ? null : loadJsonIfPresent(inspectionJson);
const depthSummary = skipDepthBenchmark || dryRun ? null : loadJsonIfPresent(depthBenchmarkJson);
const exactSummary = skipExactBenchmark || dryRun ? null : loadJsonIfPresent(exactBenchmarkJson);
summary.results = {
  inspection: inspectionSummary
    ? {
        profileName: inspectionSummary.profileName ?? null,
        verdict: inspectionSummary.verdict ?? null,
        overall: inspectionSummary.overall ?? null,
        warnings: inspectionSummary.warnings ?? [],
      }
    : null,
  benchmarks: summarizeBenchmarks(depthSummary, exactSummary),
};
summary.recommendation = deriveRecommendation({
  inspectionSummary,
  depthSummary,
  exactSummary,
  usedPatch: patchRequested || finalPatchRequested,
});
summary.finishedAt = nowIso();

await fs.promises.writeFile(pipelineSummaryJson, JSON.stringify(summary, null, 2), 'utf8');
console.log(`\nSaved pipeline summary to ${relativePathFromCwd(pipelineSummaryJson)}`);
console.log(`Calibrated tuple profile : ${relativePathFromCwd(calibratedJson)}`);
console.log(`Candidate tuple profile  : ${relativePathFromCwd(finalCandidateJson)}`);
console.log(`Generated module artifact: ${relativePathFromCwd(tempGeneratedModule)}`);
if (!skipDepthBenchmark) {
  console.log(`Depth benchmark        : ${relativePathFromCwd(depthBenchmarkJson)}`);
}
if (!skipExactBenchmark) {
  console.log(`Exact benchmark        : ${relativePathFromCwd(exactBenchmarkJson)}`);
}
if (installFinal) {
  console.log(`Installed module       : ${relativePathFromCwd(installOutputModule)}`);
}
console.log(`Recommendation         : ${summary.recommendation.status}`);
