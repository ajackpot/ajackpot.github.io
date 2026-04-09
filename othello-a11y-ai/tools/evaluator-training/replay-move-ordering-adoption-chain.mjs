#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

import {
  displayProjectPath,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  formatInteger,
  loadJsonFileIfPresent,
  parseArgs,
  resolveCliPath,
  sanitizeMoveOrderingProfileForModule,
  toPortablePath,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('replay-move-ordering-adoption-chain.mjs');
  const baselinePath = displayTrainingOutputPath('stage38_baseline_trained_move_ordering_linear_v2.json');
  const evaluationPath = displayTrainingOutputPath('trained-evaluation-profile.json');
  const outputJsonPath = displayProjectPath('benchmarks', 'stage45_move_ordering_chain_replay.json');
  console.log(`Usage:
  node ${toolPath} \
    [--baseline-profile ${baselinePath}] \
    [--evaluation-profile ${evaluationPath}] \
    [--output-json ${outputJsonPath}] \
    [--output-dir tools/evaluator-training/out/stage45_replay] \
    [--seed-start 1] [--seed-count 4] [--repetitions 1] \
    [--depth-empties 19,18,17,16,15] [--exact-empties 14,13,12,11] \
    [--time-limit-ms 1500] [--max-depth 6] [--depth-exact-endgame-empties 10] \
    [--exact-time-limit-ms 4000] [--exact-max-depth 12] [--exact-endgame-empties 14]

설명:
- Stage 38 이후 실제로 채택된 move-ordering candidate chain(B→C→D→F→H2)을 현재 repo에서 다시 생성합니다.
- 생성된 각 profile을 저장하고, 저장된 reference JSON과 구조적으로 같은지 검증합니다.
- 같은 실행에서 legacy / baseline / B / C / D / F / H2를 벤치마크해 segment별 search-cost delta를 다시 요약합니다.
`);
}

function toFiniteInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function ensureDirectoryFor(filePath) {
  return fs.promises.mkdir(path.dirname(filePath), { recursive: true });
}

function runNodeScript(args, { cwd, label }) {
  console.log(`\n[${label}] ${args.join(' ')}`);
  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

function combinedNodesForProfile(profileEntry) {
  const depth = Number(profileEntry?.suites?.depth?.overall?.nodes ?? 0);
  const exact = Number(profileEntry?.suites?.exact?.overall?.nodes ?? 0);
  return depth + exact;
}

function percentageDelta(base, candidate) {
  if (!Number.isFinite(base) || base === 0 || !Number.isFinite(candidate)) {
    return null;
  }
  return ((candidate - base) / base) * 100;
}

function buildVariantArgs(step, inputPath, outputPath) {
  const args = [
    path.join('tools', 'evaluator-training', 'make-move-ordering-variant.mjs'),
    '--input-profile', inputPath,
    '--output-json', outputPath,
    '--name', step.name,
    '--description', step.description,
  ];

  for (const scaleSpec of step.scaleSpecs ?? []) {
    args.push('--scale-spec', scaleSpec);
  }
  for (const dropRange of step.dropRanges ?? []) {
    args.push('--drop-range', dropRange);
  }

  return args;
}

function coreMoveOrderingShape(profile) {
  const normalized = sanitizeMoveOrderingProfileForModule(profile);
  if (!normalized) {
    return null;
  }
  return {
    name: normalized.name,
    featureKeys: normalized.featureKeys,
    trainedBuckets: normalized.trainedBuckets,
  };
}

function sameSanitizedProfile(left, right) {
  return JSON.stringify(coreMoveOrderingShape(left))
    === JSON.stringify(coreMoveOrderingShape(right));
}

const CHAIN_STEPS = Object.freeze([
  Object.freeze({
    key: 'candidateB',
    name: 'stage38-candidateB-mob0-10-12-fallback13-14',
    description: 'child empties 10-12 mobility를 0으로 두고 13-14 trained bucket을 제거해 fallback ordering을 쓰는 보수적 candidate입니다.',
    from: 'baseline',
    scaleSpecs: ['mobility@10-12=0'],
    dropRanges: ['13-14'],
    storedReferencePath: 'tools/evaluator-training/out/stage38_candidateB_mob0_10_12_fallback13_14.json',
  }),
  Object.freeze({
    key: 'candidateC',
    name: 'stage38-candidateC-disc0-10-12',
    description: 'candidateB에서 child empties 10-12 discDifferential을 0으로 둔 follow-up candidate입니다.',
    from: 'candidateB',
    scaleSpecs: ['discDifferential@10-12=0'],
    dropRanges: [],
    storedReferencePath: 'tools/evaluator-training/out/stage38_candidateC_disc0_10_12.json',
  }),
  Object.freeze({
    key: 'candidateD',
    name: 'stage39-candidateD-fallback10-10',
    description: 'candidateC에서 child empties 10 trained bucket을 제거해 runtime fallback ordering을 사용하는 local-search follow-up candidate입니다.',
    from: 'candidateC',
    scaleSpecs: [],
    dropRanges: ['10-10'],
    storedReferencePath: 'tools/evaluator-training/out/stage39_candidateD_fallback10_10.json',
  }),
  Object.freeze({
    key: 'candidateF',
    name: 'stage41-candidateF-cornerPattern125-11-12',
    description: 'candidateD에서 child empties 11-12 cornerPattern weight를 1.25배로 키운 candidate입니다.',
    from: 'candidateD',
    scaleSpecs: ['cornerPattern@11-12=1.25'],
    dropRanges: [],
    storedReferencePath: 'tools/evaluator-training/out/stage41_candidateF_cornerPattern125_11_12.json',
  }),
  Object.freeze({
    key: 'candidateH2',
    name: 'stage44-candidateH2-edgePattern125-cornerPattern125-11-12',
    description: 'candidateF에서 child empties 11-12 edgePattern/cornerPattern을 각각 1.25배로 키운 top-pair follow-up candidate입니다.',
    from: 'candidateF',
    scaleSpecs: ['edgePattern@11-12=1.25', 'cornerPattern@11-12=1.25'],
    dropRanges: [],
    storedReferencePath: 'tools/evaluator-training/out/stage44_candidateH2_edgePattern125_cornerPattern125_11_12.json',
  }),
]);

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const repoRoot = resolveCliPath('.');
const baselineProfilePath = args['baseline-profile']
  ? resolveCliPath(args['baseline-profile'])
  : resolveCliPath('tools/evaluator-training/out/stage38_baseline_trained_move_ordering_linear_v2.json');
const evaluationProfilePath = args['evaluation-profile']
  ? resolveCliPath(args['evaluation-profile'])
  : resolveCliPath('tools/evaluator-training/out/trained-evaluation-profile.json');
const outputJsonPath = args['output-json']
  ? resolveCliPath(args['output-json'])
  : resolveCliPath('benchmarks/stage45_move_ordering_chain_replay.json');
const outputDir = args['output-dir']
  ? resolveCliPath(args['output-dir'])
  : await fs.promises.mkdtemp(path.join(os.tmpdir(), 'othello-stage45-chain-replay-'));

const benchmarkJsonPath = outputJsonPath.replace(/\.json$/i, '.benchmark.json');
const keepOutputDir = Boolean(args['output-dir']);

const seedStart = Math.max(1, toFiniteInteger(args['seed-start'], 1));
const seedCount = Math.max(1, toFiniteInteger(args['seed-count'], 4));
const repetitions = Math.max(1, toFiniteInteger(args.repetitions, 1));
const depthEmpties = typeof args['depth-empties'] === 'string' ? args['depth-empties'] : '19,18,17,16,15';
const exactEmpties = typeof args['exact-empties'] === 'string' ? args['exact-empties'] : '14,13,12,11';
const depthTimeLimitMs = Math.max(50, toFiniteInteger(args['time-limit-ms'], 1500));
const depthMaxDepth = Math.max(1, toFiniteInteger(args['max-depth'], 6));
const depthExactEndgameEmpties = Math.max(0, toFiniteInteger(args['depth-exact-endgame-empties'], 10));
const exactTimeLimitMs = Math.max(1000, toFiniteInteger(args['exact-time-limit-ms'], 4000));
const exactMaxDepth = Math.max(1, toFiniteInteger(args['exact-max-depth'], 12));
const exactEndgameEmpties = Math.max(0, toFiniteInteger(args['exact-endgame-empties'], 14));

await ensureDirectoryFor(outputJsonPath);
await fs.promises.mkdir(outputDir, { recursive: true });

const generatedProfiles = new Map();
const baselineProfile = loadJsonFileIfPresent(baselineProfilePath);
if (!baselineProfile) {
  throw new Error(`Could not load baseline profile JSON: ${baselineProfilePath}`);
}
generatedProfiles.set('baseline', {
  key: 'baseline',
  name: baselineProfile.name ?? 'baseline',
  path: baselineProfilePath,
  profile: baselineProfile,
  generated: false,
});

const chainSummaries = [];

try {
  for (const step of CHAIN_STEPS) {
    const parent = generatedProfiles.get(step.from);
    if (!parent) {
      throw new Error(`Missing parent profile for ${step.key}: ${step.from}`);
    }

    const outputPath = path.join(outputDir, `${step.name}.json`);
    const makeVariantArgs = buildVariantArgs(
      step,
      toPortablePath(path.relative(repoRoot, parent.path) || path.basename(parent.path)),
      toPortablePath(path.relative(repoRoot, outputPath) || path.basename(outputPath)),
    );
    runNodeScript(makeVariantArgs, { cwd: repoRoot, label: `rebuild ${step.key}` });

    const generatedProfile = loadJsonFileIfPresent(outputPath);
    const storedReferencePath = resolveCliPath(step.storedReferencePath);
    const storedReferenceProfile = loadJsonFileIfPresent(storedReferencePath);
    assert.ok(generatedProfile, `generated profile missing for ${step.key}`);
    assert.ok(storedReferenceProfile, `stored reference profile missing for ${step.key}`);

    const matchesStoredReference = sameSanitizedProfile(generatedProfile, storedReferenceProfile);
    if (!matchesStoredReference) {
      throw new Error(`${step.key} no longer matches stored reference JSON: ${storedReferencePath}`);
    }

    generatedProfiles.set(step.key, {
      key: step.key,
      name: step.name,
      path: outputPath,
      profile: generatedProfile,
      generated: true,
      storedReferencePath,
      matchesStoredReference,
      from: step.from,
      scaleSpecs: [...(step.scaleSpecs ?? [])],
      dropRanges: [...(step.dropRanges ?? [])],
    });

    chainSummaries.push({
      key: step.key,
      from: step.from,
      generatedPath: outputPath,
      storedReferencePath,
      matchesStoredReference,
      actionSummary: {
        scaleSpecs: [...(step.scaleSpecs ?? [])],
        dropRanges: [...(step.dropRanges ?? [])],
      },
    });
  }

  const profileSpecs = [
    'legacy=null',
    `baseline=${toPortablePath(path.relative(repoRoot, baselineProfilePath) || path.basename(baselineProfilePath))}`,
    ...CHAIN_STEPS.map((step) => {
      const generated = generatedProfiles.get(step.key);
      return `${step.key}=${toPortablePath(path.relative(repoRoot, generated.path) || path.basename(generated.path))}`;
    }),
  ];

  runNodeScript([
    path.join('tools', 'evaluator-training', 'benchmark-move-ordering-profile-set.mjs'),
    '--evaluation-profile', toPortablePath(path.relative(repoRoot, evaluationProfilePath) || path.basename(evaluationProfilePath)),
    '--output-json', toPortablePath(path.relative(repoRoot, benchmarkJsonPath) || path.basename(benchmarkJsonPath)),
    '--seed-start', String(seedStart),
    '--seed-count', String(seedCount),
    '--repetitions', String(repetitions),
    '--depth-empties', depthEmpties,
    '--exact-empties', exactEmpties,
    '--time-limit-ms', String(depthTimeLimitMs),
    '--max-depth', String(depthMaxDepth),
    '--depth-exact-endgame-empties', String(depthExactEndgameEmpties),
    '--exact-time-limit-ms', String(exactTimeLimitMs),
    '--exact-max-depth', String(exactMaxDepth),
    '--exact-endgame-empties', String(exactEndgameEmpties),
    ...profileSpecs.flatMap((spec) => ['--profile', spec]),
  ], {
    cwd: repoRoot,
    label: 'same-run chain benchmark',
  });

  const benchmark = JSON.parse(await fs.promises.readFile(benchmarkJsonPath, 'utf8'));
  const benchmarkProfiles = new Map((benchmark.profiles ?? []).map((entry) => [entry.key, entry]));

  const orderedKeys = ['legacy', 'baseline', ...CHAIN_STEPS.map((step) => step.key)];
  const orderedProfiles = orderedKeys.map((key) => {
    const entry = benchmarkProfiles.get(key);
    if (!entry) {
      throw new Error(`Missing benchmark profile entry: ${key}`);
    }
    return entry;
  });

  const segmentDeltas = [];
  for (let index = 1; index < orderedProfiles.length; index += 1) {
    const from = orderedProfiles[index - 1];
    const to = orderedProfiles[index];
    const fromCombined = combinedNodesForProfile(from);
    const toCombined = combinedNodesForProfile(to);
    segmentDeltas.push({
      from: from.key,
      to: to.key,
      fromCombinedNodes: fromCombined,
      toCombinedNodes: toCombined,
      combinedNodeDeltaPercent: percentageDelta(fromCombined, toCombined),
      depthNodeDeltaPercent: percentageDelta(
        Number(from?.suites?.depth?.overall?.nodes ?? 0),
        Number(to?.suites?.depth?.overall?.nodes ?? 0),
      ),
      exactNodeDeltaPercent: percentageDelta(
        Number(from?.suites?.exact?.overall?.nodes ?? 0),
        Number(to?.suites?.exact?.overall?.nodes ?? 0),
      ),
    });
  }

  const latest = benchmarkProfiles.get('candidateH2');
  const baseline = benchmarkProfiles.get('baseline');
  const legacy = benchmarkProfiles.get('legacy');
  const summary = {
    generatedAt: new Date().toISOString(),
    baselineProfilePath,
    evaluationProfilePath,
    outputDir,
    benchmarkJsonPath,
    options: {
      seedStart,
      seedCount,
      repetitions,
      depthEmpties,
      exactEmpties,
      depthTimeLimitMs,
      depthMaxDepth,
      depthExactEndgameEmpties,
      exactTimeLimitMs,
      exactMaxDepth,
      exactEndgameEmpties,
    },
    replayedChain: chainSummaries,
    benchmarkProfiles: orderedProfiles.map((entry) => ({
      key: entry.key,
      label: entry.label,
      profileName: entry.profileName,
      depthNodes: Number(entry?.suites?.depth?.overall?.nodes ?? 0),
      exactNodes: Number(entry?.suites?.exact?.overall?.nodes ?? 0),
      combinedNodes: combinedNodesForProfile(entry),
    })),
    segmentDeltas,
    finalStatus: {
      currentBestKey: latest?.key ?? null,
      currentBestProfileName: latest?.profileName ?? null,
      currentVsBaselineCombinedPercent: percentageDelta(combinedNodesForProfile(baseline), combinedNodesForProfile(latest)),
      currentVsLegacyCombinedPercent: percentageDelta(combinedNodesForProfile(legacy), combinedNodesForProfile(latest)),
    },
  };

  await fs.promises.writeFile(outputJsonPath, JSON.stringify(summary, null, 2), 'utf8');

  console.log(`\nSaved chain replay summary to ${outputJsonPath}`);
  console.log(`  current best           : ${summary.finalStatus.currentBestProfileName}`);
  console.log(`  vs baseline combined   : ${summary.finalStatus.currentVsBaselineCombinedPercent?.toFixed(5)}%`);
  console.log(`  vs legacy combined     : ${summary.finalStatus.currentVsLegacyCombinedPercent?.toFixed(5)}%`);
  for (const segment of segmentDeltas) {
    console.log(`  ${segment.from} -> ${segment.to} : ${segment.combinedNodeDeltaPercent?.toFixed(5)}% (${formatInteger(segment.fromCombinedNodes)} -> ${formatInteger(segment.toCombinedNodes)} nodes)`);
  }
} finally {
  if (!keepOutputDir) {
    await fs.promises.rm(outputDir, { recursive: true, force: true });
  }
}
