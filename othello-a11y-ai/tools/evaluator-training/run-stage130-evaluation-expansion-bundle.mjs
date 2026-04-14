#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const DEFAULT_OUTPUT_ROOT = path.join(repoRoot, 'tools', 'evaluator-training', 'out', 'stage130-evaluation-expansion');
const DEFAULT_SUITE_CONFIG = path.join(
  repoRoot,
  'tools',
  'evaluator-training',
  'examples',
  'evaluation-profile-candidate-suite.train-plus-bench.example.json',
);
const DEFAULT_PATCH_CONFIG = path.join(
  repoRoot,
  'tools',
  'evaluator-training',
  'examples',
  'evaluation-profile-patch-suite.patch-plus-bench.example.json',
);
const DEFAULT_ETA_SAMPLE_LIMIT = 200000;
const DEFAULT_PHASE = 'all';
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
  node tools/evaluator-training/run-stage130-evaluation-expansion-bundle.mjs \
    --input <file-or-dir> [--input <file-or-dir> ...] \
    [--output-root tools/evaluator-training/out/stage130-evaluation-expansion] \
    [--phase eta|suite|patch|all] \
    [--suite-config tools/evaluator-training/examples/evaluation-profile-candidate-suite.train-plus-bench.example.json] \
    [--patch-config tools/evaluator-training/examples/evaluation-profile-patch-suite.patch-plus-bench.example.json] \
    [--source-suite-dir path/to/existing-suite-output] \
    [--eta-sample-limit 200000] [--resume] [--continue-on-error] [--plan-only]

설명:
- evaluation-profile 확장 lane(phase bucket 세분화 + extra scalar feature + micro-patch follow-up)을 user-executable bundle로 묶은 stage-specific wrapper입니다.
- 기본 phase는 all 입니다. 별도 지정이 없으면 ETA -> suite -> patch를 한 번에 실행합니다.
- phase=all 은 ETA + suite + patch를 순차 실행합니다.
- patch phase는 기본적으로 <output-root>/evaluation-profile-suite 를 source로 사용하며, 이미 학습이 끝난 suite 산출물을 대상으로 micro-patch 후보를 만듭니다.
- plan-only 는 어떤 command가 호출될지만 manifest에 남기고 실제 실행하지 않습니다.`;
}

function buildRepeatedInputArgs(inputs) {
  return inputs.flatMap((inputPath) => ['--input', inputPath]);
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
  return relativePortable(path.isAbsolute(value) ? value : path.resolve(repoRoot, value));
}

function makeManifest(args) {
  const suiteOutputDir = path.join(args.outputRoot, 'evaluation-profile-suite');
  const patchOutputDir = path.join(args.outputRoot, 'evaluation-profile-patch');
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
      key: 'evaluation-profile-suite',
      label: 'evaluation profile expansion candidate suite',
      script: path.join(repoRoot, 'tools', 'evaluator-training', 'run-evaluation-profile-candidate-suite.mjs'),
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
      key: 'evaluation-profile-patch',
      label: 'evaluation profile micro-patch follow-up',
      script: path.join(repoRoot, 'tools', 'evaluator-training', 'run-evaluation-profile-patch-suite.mjs'),
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
    stage: 130,
    stageLabel: 'Stage 130',
    tool: 'stage130_evaluation_expansion_bundle',
    description: 'User-executable evaluation-profile expansion bundle covering richer phase bucket layouts, extra scalar feature candidates, and micro-patch follow-up.',
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
      primary: 'evaluation-profile expansion candidates (bucket granularity + scalar extras + smoothed phase assignment)',
      followup: 'micro-patch attenuation / interpolation-off / late-baseline blending replay',
      excludedFromDefaultBundle: [
        'independent move-ordering retuning',
        'independent tuple residual retraining',
        'broad MPC re-open',
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

function runStep(step, { planOnly }) {
  const command = [process.execPath, step.script, ...step.args];
  console.log(`\n[${step.key}] ${step.label}`);
  console.log(command.map((token) => (
    /\s/.test(token) ? `"${token}"` : token
  )).join(' '));

  if (planOnly) {
    return { key: step.key, status: 'planned', exitCode: 0 };
  }

  const result = spawnSync(process.execPath, [step.script, ...step.args], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  });
  return {
    key: step.key,
    status: result.status === 0 ? 'success' : 'failed',
    exitCode: result.status,
    signal: result.signal,
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.showHelp) {
  console.log(renderUsage());
  process.exit(0);
}

const manifest = makeManifest(args);
const manifestPath = path.join(args.outputRoot, 'bundle-manifest.json');
await ensureJsonFile(manifestPath, manifest);
console.log(`Saved manifest to ${manifestPath}`);

const results = [];
for (const step of manifest.steps) {
  const result = runStep({
    key: step.key,
    label: step.label,
    script: path.join(repoRoot, step.script),
    args: step.args,
  }, { planOnly: args.planOnly });
  results.push(result);

  if (result.status !== 'success' && result.status !== 'planned' && !args.continueOnError) {
    const summaryPath = path.join(args.outputRoot, 'bundle-summary.json');
    await ensureJsonFile(summaryPath, {
      ...manifest,
      finishedAt: new Date().toISOString(),
      stepResults: results,
      status: 'failed',
    });
    process.exit(result.exitCode || 1);
  }
}

const summaryPath = path.join(args.outputRoot, 'bundle-summary.json');
await ensureJsonFile(summaryPath, {
  ...manifest,
  finishedAt: new Date().toISOString(),
  stepResults: results,
  status: results.some((entry) => entry.status === 'failed') ? 'partial-failure' : (args.planOnly ? 'planned' : 'success'),
});
console.log(`Saved bundle summary to ${summaryPath}`);
