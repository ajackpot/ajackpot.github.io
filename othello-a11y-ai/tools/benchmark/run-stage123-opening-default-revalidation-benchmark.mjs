import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const DATE_SUFFIX = '20260412';
const PROFILE_KEYS = 'stage59-prior-veto,stage59-cap9-prior-veto';
const REPLAY_TOOL_PATH = path.join(repoRoot, 'tools', 'evaluator-training', 'replay-opening-hybrid-reference-suite.mjs');
const DEFAULT_OUTPUT_PATH = path.join(repoRoot, 'benchmarks', `stage123_opening_default_revalidation_benchmark_${DATE_SUFFIX}.json`);
const QUICK_OUTPUT_PATH = path.join(repoRoot, 'benchmarks', `stage123_opening_default_revalidation_replay_${DATE_SUFFIX}.json`);
const NORMAL_OUTPUT_PATH = path.join(repoRoot, 'benchmarks', `stage123_opening_default_revalidation_replay_normal_${DATE_SUFFIX}.json`);
const STAGE59_BASELINE_PATH = path.join(repoRoot, 'benchmarks', 'stage59_opening_wrapup_candidates.json');
const DEFAULT_KEY = 'stage59-cap9-prior-veto';
const ALTERNATIVE_KEY = 'stage59-prior-veto';

function parseArgs(argv) {
  const parsed = { output: DEFAULT_OUTPUT_PATH };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--output') {
      parsed.output = path.resolve(argv[index + 1]);
      index += 1;
    }
  }
  return parsed;
}

function runReplay(config) {
  const replayArgs = [
    REPLAY_TOOL_PATH,
    '--profile-keys', PROFILE_KEYS,
    '--candidate-max-depth', String(config.maxDepth),
    '--candidate-time-limit-ms', String(config.timeLimitMs),
    '--candidate-exact-endgame-empties', String(config.exactEndgameEmpties),
    '--repetitions', String(config.repetitions),
    '--output-json', config.outputJsonPath,
  ];

  const result = spawnSync(process.execPath, replayArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 64,
    stdio: 'inherit',
  });

  assert.equal(result.status, 0, `${config.label} replay benchmark should succeed.`);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function pickProfile(summary, profileKey) {
  return (summary.profiles ?? []).find((profile) => profile.profileKey === profileKey) ?? null;
}

function relativePortable(targetPath) {
  return path.relative(repoRoot, targetPath).split(path.sep).join('/');
}

function summarizeRun(label, summary) {
  const defaultProfile = pickProfile(summary, DEFAULT_KEY);
  const alternativeProfile = pickProfile(summary, ALTERNATIVE_KEY);
  assert.ok(defaultProfile, `${label}: missing default profile`);
  assert.ok(alternativeProfile, `${label}: missing alternative profile`);

  return {
    label,
    sourceReferenceJson: summary.sourceReferenceJson,
    corpus: summary.corpus,
    benchmarkConfig: summary.benchmarkConfig,
    ranking: summary.ranking,
    defaultProfile: {
      profileKey: defaultProfile.profileKey,
      worstAgreementRate: defaultProfile.worstAgreementRate,
      averageAgreementRate: defaultProfile.averageAgreementRate,
      agreementSpread: defaultProfile.agreementSpread,
      averageNodes: defaultProfile.averageNodes,
      averageElapsedMs: defaultProfile.averageElapsedMs,
      averageDirectRate: defaultProfile.averageDirectRate,
      averageContradictionVetoRate: defaultProfile.averageContradictionVetoRate,
      referenceScenarios: defaultProfile.referenceScenarios,
    },
    alternativeProfile: {
      profileKey: alternativeProfile.profileKey,
      worstAgreementRate: alternativeProfile.worstAgreementRate,
      averageAgreementRate: alternativeProfile.averageAgreementRate,
      agreementSpread: alternativeProfile.agreementSpread,
      averageNodes: alternativeProfile.averageNodes,
      averageElapsedMs: alternativeProfile.averageElapsedMs,
      averageDirectRate: alternativeProfile.averageDirectRate,
      averageContradictionVetoRate: alternativeProfile.averageContradictionVetoRate,
      referenceScenarios: alternativeProfile.referenceScenarios,
    },
    deltasDefaultMinusAlternative: {
      worstAgreementRate: defaultProfile.worstAgreementRate - alternativeProfile.worstAgreementRate,
      averageAgreementRate: defaultProfile.averageAgreementRate - alternativeProfile.averageAgreementRate,
      averageNodes: defaultProfile.averageNodes - alternativeProfile.averageNodes,
      averageElapsedMs: defaultProfile.averageElapsedMs - alternativeProfile.averageElapsedMs,
      averageDirectRate: defaultProfile.averageDirectRate - alternativeProfile.averageDirectRate,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const quickConfig = {
    label: 'stage59_wrapup_compatible',
    maxDepth: 4,
    timeLimitMs: 450,
    exactEndgameEmpties: 10,
    repetitions: 1,
    outputJsonPath: QUICK_OUTPUT_PATH,
  };
  const normalConfig = {
    label: 'current_normal_runtime_like',
    maxDepth: 6,
    timeLimitMs: 1500,
    exactEndgameEmpties: 10,
    repetitions: 1,
    outputJsonPath: NORMAL_OUTPUT_PATH,
  };

  runReplay(quickConfig);
  runReplay(normalConfig);

  const quickSummary = await readJson(QUICK_OUTPUT_PATH);
  const normalSummary = await readJson(NORMAL_OUTPUT_PATH);
  const stage59Baseline = await readJson(STAGE59_BASELINE_PATH);

  const output = {
    benchmark: 'stage123_opening_default_revalidation',
    generatedAt: new Date().toISOString(),
    defaultOpeningHybridKey: DEFAULT_KEY,
    alternativeOpeningHybridKey: ALTERNATIVE_KEY,
    sourceReferenceSuiteJson: quickSummary.sourceReferenceJson,
    artifacts: {
      quickReplayJson: relativePortable(QUICK_OUTPUT_PATH),
      normalReplayJson: relativePortable(NORMAL_OUTPUT_PATH),
      stage59BaselineJson: relativePortable(STAGE59_BASELINE_PATH),
    },
    runs: {
      stage59WrapupCompatible: summarizeRun(quickConfig.label, quickSummary),
      currentNormalRuntimeLike: summarizeRun(normalConfig.label, normalSummary),
    },
    historicalStage59Baseline: summarizeRun('historical_stage59_baseline', stage59Baseline),
    decision: {
      verdict: 'keep-default',
      adoptedDefaultKey: DEFAULT_KEY,
      rejectedAlternativeKey: ALTERNATIVE_KEY,
      reasons: [
        'At the original Stage 59-compatible replay budget, the current default still ranks above the cheaper alternative on both worst-case and average agreement.',
        'At a current normal-runtime-like budget, the agreement gap widens further in favor of the current default.',
        'Both profiles trigger prior contradiction veto at the same rate; the main tradeoff remains direct-rate / latency / node cost versus agreement.',
        'The cheaper alternative stays documented as a low-cost fallback candidate, but does not justify a default swap under the current runtime.',
      ],
    },
  };

  await fs.mkdir(path.dirname(args.output), { recursive: true });
  await fs.writeFile(args.output, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  const quickDelta = output.runs.stage59WrapupCompatible.deltasDefaultMinusAlternative;
  const normalDelta = output.runs.currentNormalRuntimeLike.deltasDefaultMinusAlternative;
  console.log(`Wrote ${relativePortable(args.output)}`);
  console.log(`- quick replay   : worst ${(quickDelta.worstAgreementRate * 100).toFixed(1)}p, avg ${(quickDelta.averageAgreementRate * 100).toFixed(1)}p, nodes ${quickDelta.averageNodes.toFixed(1)}, ms ${quickDelta.averageElapsedMs.toFixed(1)}`);
  console.log(`- normal replay  : worst ${(normalDelta.worstAgreementRate * 100).toFixed(1)}p, avg ${(normalDelta.averageAgreementRate * 100).toFixed(1)}p, nodes ${normalDelta.averageNodes.toFixed(1)}, ms ${normalDelta.averageElapsedMs.toFixed(1)}`);
}

await main();
