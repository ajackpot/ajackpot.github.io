#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const DEFAULT_OUTPUT_ROOT = path.join(repoRoot, 'tools', 'evaluator-training', 'out', 'stage126-weight-learning');
const DEFAULT_SUITE_CONFIG = path.join(
  repoRoot,
  'tools',
  'evaluator-training',
  'examples',
  'stage126-compact-tuple-richer-corpus.train-plus-bench.example.json',
);
const DEFAULT_PATCH_CONFIG = path.join(
  repoRoot,
  'tools',
  'evaluator-training',
  'examples',
  'stage126-compact-tuple-patch-followup.example.json',
);
const DEFAULT_ETA_SAMPLE_LIMIT = 200000;
const DEFAULT_PHASE = 'suite';
const VALID_PHASES = new Set(['eta', 'suite', 'patch', 'all']);

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
    phase: DEFAULT_PHASE,
    suiteConfig: DEFAULT_SUITE_CONFIG,
    patchConfig: DEFAULT_PATCH_CONFIG,
    sourceSuiteDir: null,
    resume: false,
    continueOnError: false,
    planOnly: false,
    etaSampleLimit: DEFAULT_ETA_SAMPLE_LIMIT,
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
      case '--phase':
        parsed.phase = argv[++index];
        break;
      case '--suite-config':
        parsed.suiteConfig = path.resolve(argv[++index]);
        break;
      case '--patch-config':
        parsed.patchConfig = path.resolve(argv[++index]);
        break;
      case '--source-suite-dir':
        parsed.sourceSuiteDir = path.resolve(argv[++index]);
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
      case '--eta-sample-limit':
        parsed.etaSampleLimit = Number.parseInt(argv[++index], 10);
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
  if (!Number.isInteger(parsed.etaSampleLimit) || parsed.etaSampleLimit <= 0) {
    throw new Error(`--eta-sample-limit must be a positive integer. Received: ${parsed.etaSampleLimit}`);
  }
  if (!parsed.showHelp && parsed.inputs.length === 0) {
    throw new Error('At least one --input <file-or-dir> is required.');
  }

  return parsed;
}

function renderUsage() {
  return `Usage:
  node tools/evaluator-training/run-stage126-weight-learning-bundle.mjs \
    --input <file-or-dir> [--input <file-or-dir> ...] \
    [--output-root tools/evaluator-training/out/stage126-weight-learning] \
    [--phase eta|suite|patch|all] \
    [--suite-config tools/evaluator-training/examples/stage126-compact-tuple-richer-corpus.train-plus-bench.example.json] \
    [--patch-config tools/evaluator-training/examples/stage126-compact-tuple-patch-followup.example.json] \
    [--source-suite-dir path/to/existing-suite-output] \
    [--eta-sample-limit 200000] [--resume] [--continue-on-error] [--plan-only]

설명:
- Stage 124/125 결론을 따라, 실제 재시도 가치가 남은 offline learning lane을 richer-corpus compact tuple family + patch follow-up으로 묶은 stage-specific wrapper입니다.
- 기본 phase는 suite 입니다. 일반적으로 ETA -> suite -> patch 순서로 실행합니다.
- phase=all 은 ETA + suite + patch를 순차 실행합니다.
- phase=patch 는 기본적으로 <output-root>/tuple-family-suite 를 source로 사용하며, 이미 학습이 끝난 suite 산출물을 대상으로 compact patch 후보를 만듭니다.
- plan-only 는 어떤 command가 호출될지만 manifest/summary에 남기고 실제 실행하지 않습니다.

예시:
  node tools/evaluator-training/run-stage126-weight-learning-bundle.mjs \
    --input D:/othello-data/Egaroucid_Train_Data \
    --phase eta

  node tools/evaluator-training/run-stage126-weight-learning-bundle.mjs \
    --input D:/othello-data/Egaroucid_Train_Data \
    --output-root tools/evaluator-training/out/stage126-weight-learning \
    --phase suite --resume

  node tools/evaluator-training/run-stage126-weight-learning-bundle.mjs \
    --input D:/othello-data/Egaroucid_Train_Data \
    --output-root tools/evaluator-training/out/stage126-weight-learning \
    --phase patch --resume

  node tools/evaluator-training/run-stage126-weight-learning-bundle.mjs \
    --input D:/othello-data/Egaroucid_Train_Data \
    --phase all --resume`;
}

function buildRepeatedInputArgs(inputs) {
  return inputs.flatMap((inputPath) => ['--input', inputPath]);
}

function makeManifest(args) {
  const suiteOutputDir = path.join(args.outputRoot, 'tuple-family-suite');
  const patchOutputDir = path.join(args.outputRoot, 'tuple-patch-followup');
  const sourceSuiteDir = args.sourceSuiteDir ?? suiteOutputDir;
  const etaOutputJson = path.join(args.outputRoot, 'training-time-estimate.json');
  const includeEta = args.phase === 'eta' || args.phase === 'all';
  const includeSuite = args.phase === 'suite' || args.phase === 'all';
  const includePatch = args.phase === 'patch' || args.phase === 'all';

  const steps = [];
  if (includeEta) {
    steps.push({
      key: 'estimate-training-time',
      label: 'estimate training time',
      script: path.join(repoRoot, 'tools', 'evaluator-training', 'estimate-training-time.mjs'),
      args: [
        ...buildRepeatedInputArgs(args.inputs),
        '--sample-limit', String(args.etaSampleLimit),
        '--output-json', etaOutputJson,
      ],
      outputs: [etaOutputJson],
    });
  }
  if (includeSuite) {
    steps.push({
      key: 'tuple-family-suite',
      label: 'compact tuple richer-corpus suite',
      script: path.join(repoRoot, 'tools', 'evaluator-training', 'run-multi-candidate-training-suite.mjs'),
      args: [
        ...buildRepeatedInputArgs(args.inputs),
        '--output-dir', suiteOutputDir,
        '--config', args.suiteConfig,
        ...(args.resume ? ['--resume'] : []),
        ...(args.continueOnError ? ['--continue-on-error'] : []),
      ],
      outputs: [path.join(suiteOutputDir, 'suite-summary.json')],
    });
  }
  if (includePatch) {
    steps.push({
      key: 'tuple-patch-followup',
      label: 'compact tuple patch follow-up',
      script: path.join(repoRoot, 'tools', 'evaluator-training', 'run-tuple-patch-suite.mjs'),
      args: [
        ...buildRepeatedInputArgs(args.inputs),
        '--source-suite-dir', sourceSuiteDir,
        '--output-dir', patchOutputDir,
        '--config', args.patchConfig,
        ...(args.resume ? ['--resume'] : []),
        ...(args.continueOnError ? ['--continue-on-error'] : []),
      ],
      outputs: [path.join(patchOutputDir, 'suite-summary.json')],
    });
  }

  return {
    stage: 126,
    stageLabel: 'Stage 126',
    tool: 'stage126_weight_learning_bundle',
    description: 'User-executable richer-corpus compact tuple learning bundle that keeps the current runtime unchanged and only prepares offline training + patch follow-up.',
    generatedAt: new Date().toISOString(),
    phase: args.phase,
    planOnly: args.planOnly,
    resume: args.resume,
    continueOnError: args.continueOnError,
    inputPaths: args.inputs.map((inputPath) => relativePortable(inputPath)),
    outputRoot: relativePortable(args.outputRoot),
    suiteConfig: relativePortable(args.suiteConfig),
    patchConfig: relativePortable(args.patchConfig),
    suiteOutputDir: relativePortable(suiteOutputDir),
    patchOutputDir: relativePortable(patchOutputDir),
    sourceSuiteDir: relativePortable(sourceSuiteDir),
    etaSampleLimit: args.etaSampleLimit,
    recommendedLane: {
      primary: 'compact systematic short n-tuple richer-corpus family retraining',
      followup: 'compact patch/prune/attenuation replay against the current active runtime',
      excludedFromDefaultBundle: [
        'independent move-ordering retuning',
        'broad MPC re-open',
        'broad hand-crafted evaluator expansion',
        '5-6 empties micro-specialization expansion',
        'broad special-ending expansion',
      ],
    },
    steps: steps.map((step) => ({
      key: step.key,
      label: step.label,
      script: relativePortable(step.script),
      args: step.args.map((value) => normalizeArgForManifest(value)),
      outputs: step.outputs.map((value) => relativePortable(value)),
    })),
  };
}

async function ensureJsonFile(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function normalizeArgForManifest(value) {
  if (typeof value !== 'string') {
    return value;
  }
  if (value.startsWith('--')) {
    return value;
  }
  if (/^[0-9]+$/.test(value)) {
    return value;
  }
  if (value.includes('/') || value.includes('\\') || value.startsWith('.') || /^[A-Za-z]:/.test(value)) {
    return relativePortable(value);
  }
  return value;
}

function quoteIfNeeded(value) {
  if (/[^A-Za-z0-9_./:-]/.test(value)) {
    return JSON.stringify(value);
  }
  return value;
}

function formatCommand(scriptPath, args) {
  return [process.execPath, scriptPath, ...args]
    .map((value) => quoteIfNeeded(normalizeArgForManifest(value)))
    .join(' ');
}

function runNodeStep(step) {
  const result = spawnSync(process.execPath, [step.script, ...step.args], {
    cwd: repoRoot,
    stdio: 'inherit',
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 128,
  });
  return {
    status: result.status,
    signal: result.signal,
  };
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.showHelp) {
    console.log(renderUsage());
    return;
  }

  const manifest = makeManifest(args);
  const manifestPath = path.join(args.outputRoot, 'stage126-weight-learning-bundle-manifest.json');
  const summaryPath = path.join(args.outputRoot, 'stage126-weight-learning-bundle-summary.json');
  await ensureJsonFile(manifestPath, manifest);

  const summary = {
    ...manifest,
    manifestPath: relativePortable(manifestPath),
    summaryPath: relativePortable(summaryPath),
    steps: [],
  };

  for (const step of manifest.steps) {
    const resolvedStep = {
      ...step,
      command: formatCommand(path.join(repoRoot, step.script), step.args),
      status: args.planOnly ? 'planned' : 'pending',
    };

    summary.steps.push(resolvedStep);
  }

  if (args.planOnly) {
    summary.status = 'planned';
    await ensureJsonFile(summaryPath, summary);
    console.log(`[stage126-bundle] Saved plan to ${relativePortable(summaryPath)}`);
    return;
  }

  for (const step of summary.steps) {
    if (step.key === 'tuple-patch-followup') {
      const sourceDir = args.sourceSuiteDir ?? path.join(args.outputRoot, 'tuple-family-suite');
      if (!(await pathExists(sourceDir))) {
        throw new Error(`Patch phase requires source suite dir to exist: ${relativePortable(sourceDir)}`);
      }
    }

    console.log(`[stage126-bundle] ${step.label}`);
    const resolvedScriptPath = path.join(repoRoot, step.script);
    const runResult = runNodeStep({
      script: resolvedScriptPath,
      args: manifest.steps.find((candidate) => candidate.key === step.key).args,
    });
    step.status = runResult.status === 0 ? 'success' : 'failure';
    step.exitCode = runResult.status;
    step.signal = runResult.signal;
    await ensureJsonFile(summaryPath, summary);
    if (runResult.status !== 0 && !args.continueOnError) {
      throw new Error(`${step.label} failed with exit code ${runResult.status}`);
    }
  }

  summary.status = summary.steps.every((step) => step.status === 'success') ? 'success' : 'partial-failure';
  await ensureJsonFile(summaryPath, summary);
  console.log(`[stage126-bundle] Saved summary to ${relativePortable(summaryPath)}`);
}

main().catch((error) => {
  console.error(`[stage126-bundle] ${error.message}`);
  process.exitCode = 1;
});
