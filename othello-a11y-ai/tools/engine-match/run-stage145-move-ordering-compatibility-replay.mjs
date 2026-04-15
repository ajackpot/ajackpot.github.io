#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  describeSearchAlgorithm,
  normalizeSearchAlgorithm,
} from '../../js/ai/search-algorithms.js';
import {
  loadGeneratedProfilesModuleIfPresent,
  loadJsonFileIfPresent,
  parseArgs,
  relativePathFromCwd,
  resolveCliPath,
  sanitizeMoveOrderingProfileForModule,
  writeGeneratedProfilesModule,
} from '../evaluator-training/lib.mjs';
import {
  buildVariantSpecString,
  maybeRun,
  readJson,
  summarizeHeadToHead,
  weightedAverage,
  writeJson,
  writeText,
} from './lib-compact-tuple-adoption.mjs';

const TARGET_CANDIDATE = Object.freeze({
  label: 'diagonal-top24-latea-endgame',
  generatedModule: 'tools/engine-match/fixtures/stage144-compact-tuple-finalists/diagonal-top24-latea-endgame/learned-eval-profile.generated.js',
});

const MOVE_ORDERING_BASELINE = Object.freeze({
  key: 'baseline',
  label: 'baseline',
  name: 'stage38-baseline',
  storedReferencePath: 'tools/evaluator-training/out/stage38_baseline_trained_move_ordering_linear_v2.json',
});

const CHAIN_STEPS = Object.freeze([
  Object.freeze({
    key: 'candidateB',
    label: 'candidateB',
    name: 'stage38-candidateB-mob0-10-12-fallback13-14',
    description: 'mobility@10-12=0, drop 13-14',
    from: 'baseline',
    scaleSpecs: ['mobility@10-12=0'],
    dropRanges: ['13-14'],
    storedReferencePath: 'tools/evaluator-training/out/stage38_candidateB_mob0_10_12_fallback13_14.json',
  }),
  Object.freeze({
    key: 'candidateC',
    label: 'candidateC',
    name: 'stage38-candidateC-disc0-10-12',
    description: 'candidateB + discDifferential@10-12=0',
    from: 'candidateB',
    scaleSpecs: ['discDifferential@10-12=0'],
    dropRanges: [],
    storedReferencePath: 'tools/evaluator-training/out/stage38_candidateC_disc0_10_12.json',
  }),
  Object.freeze({
    key: 'candidateD',
    label: 'candidateD',
    name: 'stage39-candidateD-fallback10-10',
    description: 'candidateC + drop 10-10',
    from: 'candidateC',
    scaleSpecs: [],
    dropRanges: ['10-10'],
    storedReferencePath: 'tools/evaluator-training/out/stage39_candidateD_fallback10_10.json',
  }),
  Object.freeze({
    key: 'candidateF',
    label: 'candidateF',
    name: 'stage41-candidateF-cornerPattern125-11-12',
    description: 'candidateD + cornerPattern@11-12=x1.25',
    from: 'candidateD',
    scaleSpecs: ['cornerPattern@11-12=1.25'],
    dropRanges: [],
    storedReferencePath: 'tools/evaluator-training/out/stage41_candidateF_cornerPattern125_11_12.json',
  }),
  Object.freeze({
    key: 'candidateH2',
    label: 'candidateH2',
    name: 'stage44-candidateH2-edgePattern125-cornerPattern125-11-12',
    description: 'candidateF + edgePattern@11-12=x1.25 + cornerPattern@11-12=x1.25',
    from: 'candidateF',
    scaleSpecs: ['edgePattern@11-12=1.25', 'cornerPattern@11-12=1.25'],
    dropRanges: [],
    storedReferencePath: 'tools/evaluator-training/out/stage44_candidateH2_edgePattern125_cornerPattern125_11_12.json',
  }),
]);

const DEFAULTS = Object.freeze({
  outputDir: 'benchmarks/stage145',
  smoke: false,
  force: false,
});

const SEARCH_COST_DEFAULTS = Object.freeze({
  searchAlgorithm: 'classic-mtdf-2ply',
  depthEmpties: [18, 16, 14],
  depthSeedStart: 1,
  depthSeedCount: 4,
  depthRepetitions: 1,
  depthTimeLimitMs: 1200,
  depthMaxDepth: 6,
  depthExactEndgameEmpties: 10,
  exactEmpties: [10, 8],
  exactSeedStart: 1,
  exactSeedCount: 3,
  exactRepetitions: 1,
  exactTimeLimitMs: 12000,
  exactMaxDepth: 12,
});

const SEARCH_COST_SMOKE = Object.freeze({
  searchAlgorithm: 'classic-mtdf-2ply',
  depthEmpties: [16],
  depthSeedStart: 1,
  depthSeedCount: 1,
  depthRepetitions: 1,
  depthTimeLimitMs: 180,
  depthMaxDepth: 2,
  depthExactEndgameEmpties: 4,
  exactEmpties: [8],
  exactSeedStart: 1,
  exactSeedCount: 1,
  exactRepetitions: 1,
  exactTimeLimitMs: 1000,
  exactMaxDepth: 4,
});

const THROUGHPUT_DEFAULT = Object.freeze({
  searchAlgorithm: 'classic-mtdf-2ply',
  timeMsList: [280, 500],
  positionSeedList: [17, 31, 41, 53],
  openingPlies: 20,
  maxDepth: 4,
  exactEndgameEmpties: 8,
  aspirationWindow: 60,
  maxTableEntries: 90000,
  presetKey: 'custom',
  styleKey: 'balanced',
});

const THROUGHPUT_SMOKE = Object.freeze({
  searchAlgorithm: 'classic-mtdf-2ply',
  timeMsList: [160],
  positionSeedList: [17, 31],
  openingPlies: 20,
  maxDepth: 2,
  exactEndgameEmpties: 4,
  aspirationWindow: 0,
  maxTableEntries: 30000,
  presetKey: 'custom',
  styleKey: 'balanced',
});

const PAIR_SCENARIOS = Object.freeze([
  Object.freeze({
    key: 'mtdf_fast_noisy_280',
    label: 'Classic MTD(f) 2ply fast noisy 280ms',
    family: 'primary',
    searchAlgorithm: 'classic-mtdf-2ply',
    timeMsList: [280],
    maxDepth: 4,
    exactEndgameEmpties: 8,
    aspirationWindow: 60,
    maxTableEntries: 90000,
    seedList: [17, 31],
    games: 1,
    openingPlies: 20,
    solverAdjudicationEmpties: 14,
    solverAdjudicationTimeMs: 9000,
  }),
  Object.freeze({
    key: 'classic_sanity_280',
    label: 'Classic PVS sanity 280ms',
    family: 'sanity',
    searchAlgorithm: 'classic',
    timeMsList: [280],
    maxDepth: 4,
    exactEndgameEmpties: 8,
    aspirationWindow: 60,
    maxTableEntries: 90000,
    seedList: [17],
    games: 1,
    openingPlies: 20,
    solverAdjudicationEmpties: 14,
    solverAdjudicationTimeMs: 9000,
  }),
]);

const PAIR_SCENARIOS_SMOKE = Object.freeze([
  Object.freeze({
    key: 'mtdf_smoke_160',
    label: 'Classic MTD(f) 2ply smoke 160ms',
    family: 'primary',
    searchAlgorithm: 'classic-mtdf-2ply',
    timeMsList: [160],
    maxDepth: 2,
    exactEndgameEmpties: 4,
    aspirationWindow: 0,
    maxTableEntries: 30000,
    seedList: [17],
    games: 1,
    openingPlies: 20,
    solverAdjudicationEmpties: 10,
    solverAdjudicationTimeMs: 5000,
  }),
]);

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/run-stage145-move-ordering-compatibility-replay.mjs \
    [--output-dir benchmarks/stage145] [--smoke] [--force]

설명:
- Stage 144 confirmation을 통과한 diagonal compact-tuple finalist 위에서 Stage 38→44 move-ordering adoption chain을 재생성(replay)합니다.
- replay된 move-ordering variants를 같은 diagonal candidate evaluation/tuple/MPC 위에 다시 얹어 search-cost / throughput / paired self-play로 호환성을 확인합니다.
- current H2 ordering이 그대로 유지되는지, 아니면 이전 chain variant가 더 잘 맞는지 판정합니다.
`);
}

function toFiniteInteger(value, fallback, minimum = Number.NEGATIVE_INFINITY, maximum = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
}




function relativePortable(filePath) {
  if (!filePath) {
    return null;
  }
  return relativePathFromCwd(filePath) ?? filePath;
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
  return JSON.stringify(coreMoveOrderingShape(left)) === JSON.stringify(coreMoveOrderingShape(right));
}

function percentageDelta(base, candidate) {
  if (!Number.isFinite(base) || base === 0 || !Number.isFinite(candidate)) {
    return null;
  }
  return ((candidate - base) / base) * 100;
}



function getSearchCostConfig({ smoke }) {
  return smoke ? SEARCH_COST_SMOKE : SEARCH_COST_DEFAULTS;
}

function getThroughputConfig({ smoke }) {
  return smoke ? THROUGHPUT_SMOKE : THROUGHPUT_DEFAULT;
}

function getPairScenarios({ smoke }) {
  return smoke ? [...PAIR_SCENARIOS_SMOKE] : [...PAIR_SCENARIOS];
}

async function replayMoveOrderingChain(repoRoot, outputDir) {
  const replayDir = path.join(outputDir, 'replay-chain');
  fs.mkdirSync(replayDir, { recursive: true });

  const baselinePath = resolveCliPath(MOVE_ORDERING_BASELINE.storedReferencePath);
  const baselineProfile = loadJsonFileIfPresent(baselinePath);
  if (!baselineProfile) {
    throw new Error(`Could not load move-ordering baseline JSON: ${MOVE_ORDERING_BASELINE.storedReferencePath}`);
  }

  const profiles = new Map();
  profiles.set('legacy', {
    key: 'legacy',
    label: 'legacy',
    name: 'legacy-no-ordering',
    profile: null,
    generatedPath: null,
    storedReferencePath: null,
    matchesStoredReference: true,
    generated: false,
  });
  profiles.set('baseline', {
    key: 'baseline',
    label: MOVE_ORDERING_BASELINE.label,
    name: baselineProfile.name ?? MOVE_ORDERING_BASELINE.name,
    profile: baselineProfile,
    generatedPath: baselinePath,
    storedReferencePath: baselinePath,
    matchesStoredReference: true,
    generated: false,
  });

  const replayedChain = [];
  for (const step of CHAIN_STEPS) {
    const parent = profiles.get(step.from);
    if (!parent?.generatedPath) {
      throw new Error(`Missing parent profile for ${step.key}: ${step.from}`);
    }
    const outputPath = path.join(replayDir, `${step.name}.json`);
    const makeArgs = buildVariantArgs(step, relativePortable(parent.generatedPath), relativePortable(outputPath));
    const result = spawnSync(process.execPath, makeArgs, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
    const logPath = path.join(outputDir, 'logs', `replay.${step.key}.log`);
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.writeFileSync(logPath, `${result.stdout ?? ''}${result.stderr ?? ''}`, 'utf8');
    if (result.status !== 0) {
      throw new Error(`Failed to replay ${step.key}: ${result.stderr ?? result.stdout ?? ''}`);
    }

    const generatedProfile = loadJsonFileIfPresent(outputPath);
    const storedReferencePath = resolveCliPath(step.storedReferencePath);
    const storedReferenceProfile = loadJsonFileIfPresent(storedReferencePath);
    if (!generatedProfile || !storedReferenceProfile) {
      throw new Error(`Missing replay output or stored reference for ${step.key}`);
    }
    const matchesStoredReference = sameSanitizedProfile(generatedProfile, storedReferenceProfile);
    if (!matchesStoredReference) {
      throw new Error(`${step.key} no longer matches stored reference JSON: ${storedReferencePath}`);
    }
    profiles.set(step.key, {
      key: step.key,
      label: step.label,
      name: generatedProfile.name ?? step.name,
      profile: generatedProfile,
      generatedPath: outputPath,
      storedReferencePath,
      matchesStoredReference,
      generated: true,
      from: step.from,
      scaleSpecs: [...(step.scaleSpecs ?? [])],
      dropRanges: [...(step.dropRanges ?? [])],
    });
    replayedChain.push({
      key: step.key,
      from: step.from,
      generatedPath: relativePortable(outputPath),
      storedReferencePath: relativePortable(storedReferencePath),
      matchesStoredReference,
      scaleSpecs: [...(step.scaleSpecs ?? [])],
      dropRanges: [...(step.dropRanges ?? [])],
    });
  }

  return {
    baselinePath,
    baselineProfile,
    profiles,
    replayedChain,
  };
}

async function materializeCandidateModules(outputDir, baseCandidateModule, moveOrderingProfiles) {
  const modulesDir = path.join(outputDir, 'generated-modules');
  fs.mkdirSync(modulesDir, { recursive: true });
  const orderedKeys = ['candidateH2', 'candidateF', 'candidateD', 'candidateC', 'candidateB', 'baseline', 'legacy'];
  const variants = [];
  for (const key of orderedKeys) {
    const moveOrdering = moveOrderingProfiles.get(key);
    if (!moveOrdering) {
      throw new Error(`Missing move-ordering replay profile for ${key}`);
    }
    const modulePath = path.join(modulesDir, `${key}.generated.js`);
    await writeGeneratedProfilesModule(modulePath, {
      evaluationProfile: baseCandidateModule.evaluationProfile,
      moveOrderingProfile: moveOrdering.profile,
      tupleResidualProfile: baseCandidateModule.tupleResidualProfile,
      mpcProfile: baseCandidateModule.mpcProfile,
    });
    variants.push({
      key,
      label: key,
      moveOrderingProfileName: moveOrdering.profile?.name ?? null,
      moveOrderingSourcePath: relativePortable(moveOrdering.generatedPath),
      generatedModulePath: modulePath,
    });
  }
  return variants;
}


function summarizeThroughputByVariant(throughputSummary) {
  const timeBuckets = throughputSummary.timeBuckets ?? [];
  const variants = Object.keys(throughputSummary.variants ?? {});
  const summaryByKey = {};
  for (const key of variants) {
    const variantEntries = [];
    const comparisonEntries = [];
    for (const bucket of timeBuckets) {
      if (bucket?.variants?.[key]) {
        variantEntries.push(bucket.variants[key]);
      }
      for (const comparison of bucket?.comparisons ?? []) {
        if (comparison?.candidateVariant === key && comparison?.baselineVariant === 'candidateH2') {
          comparisonEntries.push(comparison);
        }
      }
    }
    summaryByKey[key] = {
      variantLabel: key,
      weightedNodesPerMs: weightedAverage(variantEntries, (entry) => entry.nodesPerMs, (entry) => entry.samples?.length ?? 0),
      weightedDepth: weightedAverage(variantEntries, (entry) => entry.averageCompletedDepth, (entry) => entry.samples?.length ?? 0),
      weightedCompletionRate: weightedAverage(variantEntries, (entry) => entry.completionRate, (entry) => entry.samples?.length ?? 0),
      weightedNodesPerMsGainVsH2: weightedAverage(comparisonEntries, (entry) => entry.candidateNodesPerMsGainRate, (entry) => entry.sampleCount),
      weightedDepthGainVsH2: weightedAverage(comparisonEntries, (entry) => entry.candidateAverageDepthGain, (entry) => entry.sampleCount),
      weightedMoveAgreementVsH2: weightedAverage(comparisonEntries, (entry) => entry.moveAgreementRate, (entry) => entry.sampleCount),
    };
  }
  if (!summaryByKey.candidateH2) {
    summaryByKey.candidateH2 = {
      variantLabel: 'candidateH2',
      weightedNodesPerMs: weightedAverage(timeBuckets.map((bucket) => bucket?.variants?.candidateH2).filter(Boolean), (entry) => entry.nodesPerMs, (entry) => entry.samples?.length ?? 0),
      weightedDepth: weightedAverage(timeBuckets.map((bucket) => bucket?.variants?.candidateH2).filter(Boolean), (entry) => entry.averageCompletedDepth, (entry) => entry.samples?.length ?? 0),
      weightedCompletionRate: weightedAverage(timeBuckets.map((bucket) => bucket?.variants?.candidateH2).filter(Boolean), (entry) => entry.completionRate, (entry) => entry.samples?.length ?? 0),
      weightedNodesPerMsGainVsH2: 0,
      weightedDepthGainVsH2: 0,
      weightedMoveAgreementVsH2: 1,
    };
  }
  return summaryByKey;
}

function summarizeSearchCostResult(variantKey, depthSummary, exactSummary, throughputByKey) {
  const depthOverall = depthSummary?.overall ?? {};
  const exactOverall = exactSummary?.overall ?? {};
  const baselineNodes = Number(depthOverall.baselineNodes ?? 0) + Number(exactOverall.baselineNodes ?? 0);
  const candidateNodes = Number(depthOverall.candidateNodes ?? 0) + Number(exactOverall.candidateNodes ?? 0);
  const baselineElapsedMs = Number(depthOverall.baselineElapsedMs ?? 0) + Number(exactOverall.baselineElapsedMs ?? 0);
  const candidateElapsedMs = Number(depthOverall.candidateElapsedMs ?? 0) + Number(exactOverall.candidateElapsedMs ?? 0);
  const depthCaseCount = Number(depthOverall.cases ?? 0);
  const exactCaseCount = Number(exactOverall.cases ?? 0);
  const depthSameBestRate = depthCaseCount > 0 ? Number(depthOverall.identicalBestMoveCases ?? 0) / depthCaseCount : 0;
  const exactSameScoreRate = exactCaseCount > 0 ? Number(exactOverall.identicalScoreCases ?? 0) / exactCaseCount : 0;
  const exactSameBestRate = exactCaseCount > 0 ? Number(exactOverall.identicalBestMoveCases ?? 0) / exactCaseCount : 0;
  const throughput = throughputByKey[variantKey] ?? null;
  const viable = exactSameScoreRate >= 1 && depthSameBestRate >= 0.75;
  return {
    key: variantKey,
    depth: {
      cases: depthCaseCount,
      sameBestRate: depthSameBestRate,
      nodeDeltaPercent: Number(depthOverall.nodeDeltaPercent ?? 0),
      elapsedDeltaPercent: Number(depthOverall.elapsedDeltaPercent ?? 0),
      overall: depthOverall,
    },
    exact: {
      cases: exactCaseCount,
      sameScoreRate: exactSameScoreRate,
      sameBestRate: exactSameBestRate,
      nodeDeltaPercent: Number(exactOverall.nodeDeltaPercent ?? 0),
      elapsedDeltaPercent: Number(exactOverall.elapsedDeltaPercent ?? 0),
      overall: exactOverall,
    },
    combinedNodesDeltaPercent: percentageDelta(baselineNodes, candidateNodes),
    combinedElapsedDeltaPercent: percentageDelta(baselineElapsedMs, candidateElapsedMs),
    throughputNodesPerMsGainVsH2: Number(throughput?.weightedNodesPerMsGainVsH2 ?? 0),
    throughputDepthGainVsH2: Number(throughput?.weightedDepthGainVsH2 ?? 0),
    throughputMoveAgreementVsH2: Number(throughput?.weightedMoveAgreementVsH2 ?? (variantKey === 'candidateH2' ? 1 : 0)),
    viable,
  };
}

function rankChallengers(searchCostResults) {
  const challengers = searchCostResults.filter((entry) => entry.key !== 'candidateH2');
  const ranked = [...challengers].sort((left, right) => {
    if (Number(right.viable) !== Number(left.viable)) {
      return Number(right.viable) - Number(left.viable);
    }
    const leftCombined = Number(left.combinedNodesDeltaPercent ?? Number.POSITIVE_INFINITY);
    const rightCombined = Number(right.combinedNodesDeltaPercent ?? Number.POSITIVE_INFINITY);
    if (leftCombined !== rightCombined) {
      return leftCombined - rightCombined;
    }
    const leftThroughput = Number(left.throughputNodesPerMsGainVsH2 ?? 0);
    const rightThroughput = Number(right.throughputNodesPerMsGainVsH2 ?? 0);
    if (leftThroughput !== rightThroughput) {
      return rightThroughput - leftThroughput;
    }
    return String(left.key).localeCompare(String(right.key));
  }).map((entry, index) => ({ rank: index + 1, ...entry }));
  return ranked;
}

function decideCompatibility({ rankedChallengers, pairHeadToHead }) {
  const firstViable = rankedChallengers.find((entry) => entry.viable) ?? null;
  if (!firstViable) {
    return {
      action: 'keep-active-h2-compatible',
      selectedMoveOrderingKey: 'candidateH2',
      keepActiveMoveOrdering: true,
      rationale: '검색 비용과 exact score safety를 함께 만족하는 대체 move-ordering challenger가 없으므로 current H2 ordering을 유지합니다.',
      nextAction: 'open-final-compact-tuple-adoption-gate',
    };
  }

  const pair = pairHeadToHead[firstViable.key] ?? null;
  const challengerImprovesCost = Number(firstViable.combinedNodesDeltaPercent ?? 0) <= -0.25;
  const challengerImprovesThroughput = Number(firstViable.throughputNodesPerMsGainVsH2 ?? 0) >= 0.01;
  const challengerHoldsPair = !pair
    || (Number(pair.primary.weightedPointGap ?? 0) >= -0.02
      && Number(pair.primary.worstPointGap ?? 0) >= -0.10
      && Number(pair.sanity.weightedPointGap ?? 0) >= -0.05);

  if (challengerImprovesCost && challengerImprovesThroughput && challengerHoldsPair) {
    return {
      action: 'select-compatible-ordering-switch',
      selectedMoveOrderingKey: firstViable.key,
      keepActiveMoveOrdering: false,
      rationale: `${firstViable.key}가 diagonal candidate 위에서 H2 대비 search-cost/throughput 이득을 보였고 paired self-play에서도 유의미한 악화를 보이지 않아 compatible ordering으로 승격합니다.`,
      nextAction: 'open-final-compact-tuple-adoption-gate',
    };
  }

  return {
    action: 'keep-active-h2-compatible',
    selectedMoveOrderingKey: 'candidateH2',
    keepActiveMoveOrdering: true,
    rationale: `${firstViable.key}가 일부 효율 신호를 보였더라도 paired self-play 또는 improvement margin이 switch 기준을 넘지 못해 current H2 ordering을 유지합니다.`,
    nextAction: 'open-final-compact-tuple-adoption-gate',
  };
}

function buildNotes({
  targetCandidate,
  replay,
  throughputByKey,
  rankedChallengers,
  pairHeadToHead,
  finalDecision,
  selectedVariant,
}) {
  const lines = [];
  lines.push('# Stage 145 move-ordering compatibility replay notes');
  lines.push('');
  lines.push(`Target candidate: **${targetCandidate.label}**`);
  lines.push(`Final action: **${finalDecision.action}**`);
  lines.push(`Selected move-ordering: **${selectedVariant.key}** (${selectedVariant.moveOrderingProfileName ?? 'legacy'})`);
  lines.push('');
  lines.push('## Replay chain verification');
  lines.push(`- baseline: ${relativePortable(replay.baselinePath)}`);
  for (const entry of replay.replayedChain) {
    lines.push(`- ${entry.key}: ${entry.matchesStoredReference ? 'matches stored reference' : 'mismatch'} (${entry.scaleSpecs.join(', ') || 'no scales'}${entry.dropRanges.length > 0 ? `; drop ${entry.dropRanges.join(', ')}` : ''})`);
  }
  lines.push('');
  lines.push('## Throughput vs H2');
  for (const [key, summary] of Object.entries(throughputByKey)) {
    lines.push(`- ${key}: nodes/ms ${Number(summary.weightedNodesPerMs ?? 0).toFixed(2)}, gain vs H2 ${(Number(summary.weightedNodesPerMsGainVsH2 ?? 0) * 100).toFixed(2)}%, depth gain ${Number(summary.weightedDepthGainVsH2 ?? 0).toFixed(3)}`);
  }
  lines.push('');
  lines.push('## Search-cost challenger ranking');
  for (const entry of rankedChallengers) {
    lines.push(`- #${entry.rank} ${entry.key}: viable=${entry.viable ? 'yes' : 'no'}, combined nodes ${(Number(entry.combinedNodesDeltaPercent ?? 0)).toFixed(3)}%, depth same-best ${(Number(entry.depth.sameBestRate ?? 0) * 100).toFixed(1)}%, exact same-score ${(Number(entry.exact.sameScoreRate ?? 0) * 100).toFixed(1)}%, throughput gain ${(Number(entry.throughputNodesPerMsGainVsH2 ?? 0) * 100).toFixed(2)}%`);
  }
  if (Object.keys(pairHeadToHead).length > 0) {
    lines.push('');
    lines.push('## Paired self-play checkpoints vs H2');
    for (const [key, summary] of Object.entries(pairHeadToHead)) {
      lines.push(`- ${key}: primary gap ${Number(summary.primary.weightedPointGap ?? 0).toFixed(3)}, worst ${Number(summary.primary.worstPointGap ?? 0).toFixed(3)} | sanity gap ${Number(summary.sanity.weightedPointGap ?? 0).toFixed(3)}`);
    }
  }
  lines.push('');
  lines.push('## Final decision');
  lines.push(`Action: ${finalDecision.action}`);
  lines.push(`Rationale: ${finalDecision.rationale}`);
  lines.push(`Next action: ${finalDecision.nextAction}`);
  return `${lines.join('\n')}\n`;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const repoRoot = resolveCliPath('.');
const outputDir = args['output-dir'] ? resolveCliPath(args['output-dir']) : resolveCliPath(DEFAULTS.outputDir);
const smoke = Boolean(args.smoke);
const force = Boolean(args.force);

const pairScenarios = getPairScenarios({ smoke });
const searchCostConfig = getSearchCostConfig({ smoke });
const throughputConfig = getThroughputConfig({ smoke });
const throughputSearchAlgorithm = normalizeSearchAlgorithm(throughputConfig.searchAlgorithm);
const searchCostAlgorithm = normalizeSearchAlgorithm(searchCostConfig.searchAlgorithm);

fs.mkdirSync(outputDir, { recursive: true });

const baseCandidateModule = await loadGeneratedProfilesModuleIfPresent(TARGET_CANDIDATE.generatedModule);
if (!baseCandidateModule?.evaluationProfile) {
  throw new Error(`Unable to load target candidate generated module: ${TARGET_CANDIDATE.generatedModule}`);
}

const replay = await replayMoveOrderingChain(repoRoot, outputDir);
const candidateVariants = await materializeCandidateModules(outputDir, baseCandidateModule, replay.profiles);
const variantByKey = Object.fromEntries(candidateVariants.map((variant) => [variant.key, variant]));
const h2Variant = variantByKey.candidateH2;
if (!h2Variant) {
  throw new Error('Current H2 move-ordering variant is missing.');
}

const throughputOutputPath = path.join(outputDir, 'throughput', 'stage145_move_ordering_throughput.json');
const throughputLogPath = path.join(outputDir, 'logs', 'throughput.log');
const throughputArgs = [
  '--output-json', relativePortable(throughputOutputPath),
  '--search-algorithm', throughputSearchAlgorithm,
  '--variant-specs', buildVariantSpecString(candidateVariants, (variant) => relativePortable(variant.generatedModulePath)),
  '--time-ms-list', throughputConfig.timeMsList.join(','),
  '--position-seed-list', throughputConfig.positionSeedList.join(','),
  '--opening-plies', String(throughputConfig.openingPlies),
  '--max-depth', String(throughputConfig.maxDepth),
  '--exact-endgame-empties', String(throughputConfig.exactEndgameEmpties),
  '--aspiration-window', String(throughputConfig.aspirationWindow),
  '--max-table-entries', String(throughputConfig.maxTableEntries),
  '--preset-key', throughputConfig.presetKey,
  '--style-key', throughputConfig.styleKey,
];
maybeRun(
  path.join('tools', 'engine-match', 'benchmark-profile-variant-throughput-compare.mjs'),
  throughputArgs,
  throughputOutputPath,
  { cwd: repoRoot, force, logPath: throughputLogPath },
);
const throughputSummary = readJson(throughputOutputPath);
const throughputByKey = summarizeThroughputByVariant(throughputSummary);

const searchCostResults = [];
for (const variant of candidateVariants) {
  const depthOutputPath = path.join(outputDir, 'search-cost', `${variant.key}.depth.json`);
  const exactOutputPath = path.join(outputDir, 'search-cost', `${variant.key}.exact.json`);
  maybeRun(
    path.join('tools', 'evaluator-training', 'benchmark-depth-search-profile.mjs'),
    [
      '--baseline-generated-module', relativePortable(h2Variant.generatedModulePath),
      '--candidate-generated-module', relativePortable(variant.generatedModulePath),
      '--search-algorithm', searchCostAlgorithm,
      '--empties', searchCostConfig.depthEmpties.join(','),
      '--seed-start', String(searchCostConfig.depthSeedStart),
      '--seed-count', String(searchCostConfig.depthSeedCount),
      '--repetitions', String(searchCostConfig.depthRepetitions),
      '--time-limit-ms', String(searchCostConfig.depthTimeLimitMs),
      '--max-depth', String(searchCostConfig.depthMaxDepth),
      '--exact-endgame-empties', String(searchCostConfig.depthExactEndgameEmpties),
      '--output-json', relativePortable(depthOutputPath),
    ],
    depthOutputPath,
    { cwd: repoRoot, force, logPath: path.join(outputDir, 'logs', `search-cost.${variant.key}.depth.log`) },
  );
  maybeRun(
    path.join('tools', 'evaluator-training', 'benchmark-exact-search-profile.mjs'),
    [
      '--baseline-generated-module', relativePortable(h2Variant.generatedModulePath),
      '--candidate-generated-module', relativePortable(variant.generatedModulePath),
      '--search-algorithm', searchCostAlgorithm,
      '--empties', searchCostConfig.exactEmpties.join(','),
      '--seed-start', String(searchCostConfig.exactSeedStart),
      '--seed-count', String(searchCostConfig.exactSeedCount),
      '--repetitions', String(searchCostConfig.exactRepetitions),
      '--time-limit-ms', String(searchCostConfig.exactTimeLimitMs),
      '--max-depth', String(searchCostConfig.exactMaxDepth),
      '--output-json', relativePortable(exactOutputPath),
    ],
    exactOutputPath,
    { cwd: repoRoot, force, logPath: path.join(outputDir, 'logs', `search-cost.${variant.key}.exact.log`) },
  );
  const depthSummary = readJson(depthOutputPath);
  const exactSummary = readJson(exactOutputPath);
  searchCostResults.push({
    key: variant.key,
    label: variant.label,
    moveOrderingProfileName: variant.moveOrderingProfileName,
    generatedModulePath: relativePortable(variant.generatedModulePath),
    depthOutputPath: relativePortable(depthOutputPath),
    exactOutputPath: relativePortable(exactOutputPath),
    ...summarizeSearchCostResult(variant.key, depthSummary, exactSummary, throughputByKey),
  });
}

const rankedChallengers = rankChallengers(searchCostResults);
const challengerKeys = rankedChallengers.filter((entry) => entry.viable).slice(0, 2).map((entry) => entry.key);

const pairResults = [];
for (const challengerKey of challengerKeys) {
  const challengerVariant = variantByKey[challengerKey];
  for (const scenario of pairScenarios) {
    const pairSlug = `candidateH2_vs_${challengerKey}`;
    const outputJsonPath = path.join(outputDir, 'pairs', `${pairSlug}.${scenario.key}.json`);
    maybeRun(
      path.join('tools', 'engine-match', 'benchmark-profile-variant-pair.mjs'),
      [
        '--output-json', relativePortable(outputJsonPath),
        '--search-algorithm', scenario.searchAlgorithm,
        '--first-label', 'candidateH2',
        '--first-generated-module', relativePortable(h2Variant.generatedModulePath),
        '--second-label', challengerKey,
        '--second-generated-module', relativePortable(challengerVariant.generatedModulePath),
        '--games', String(scenario.games),
        '--opening-plies', String(scenario.openingPlies),
        '--seed-list', scenario.seedList.join(','),
        '--time-ms-list', scenario.timeMsList.join(','),
        '--max-depth', String(scenario.maxDepth),
        '--exact-endgame-empties', String(scenario.exactEndgameEmpties),
        '--solver-adjudication-empties', String(scenario.solverAdjudicationEmpties),
        '--solver-adjudication-time-ms', String(scenario.solverAdjudicationTimeMs),
        '--aspiration-window', String(scenario.aspirationWindow),
        '--max-table-entries', String(scenario.maxTableEntries),
        '--preset-key', 'custom',
        '--style-key', 'balanced',
        '--progress-every-pairs', '0',
      ],
      outputJsonPath,
      { cwd: repoRoot, force, logPath: path.join(outputDir, 'logs', `${pairSlug}.${scenario.key}.log`) },
    );
    pairResults.push({
      pairSlug,
      scenarioKey: scenario.key,
      family: scenario.family,
      searchAlgorithm: scenario.searchAlgorithm,
      leftLabel: 'candidateH2',
      rightLabel: challengerKey,
      outputJsonPath: relativePortable(outputJsonPath),
      summary: readJson(outputJsonPath),
    });
  }
}

const pairHeadToHead = {};
for (const challengerKey of challengerKeys) {
  pairHeadToHead[challengerKey] = {
    primary: summarizeHeadToHead(pairResults, 'candidateH2', challengerKey, 'primary', { getLabels: (pairResult) => [pairResult.leftLabel, pairResult.rightLabel] }),
    sanity: summarizeHeadToHead(pairResults, 'candidateH2', challengerKey, 'sanity', { getLabels: (pairResult) => [pairResult.leftLabel, pairResult.rightLabel] }),
    all: summarizeHeadToHead(pairResults, 'candidateH2', challengerKey, null, { getLabels: (pairResult) => [pairResult.leftLabel, pairResult.rightLabel] }),
  };
}

const finalDecision = decideCompatibility({ rankedChallengers, pairHeadToHead });
const selectedVariant = variantByKey[finalDecision.selectedMoveOrderingKey] ?? h2Variant;
const selectedModulePath = path.join(outputDir, 'selected-compatible-generated-module.js');
await writeGeneratedProfilesModule(selectedModulePath, {
  evaluationProfile: baseCandidateModule.evaluationProfile,
  moveOrderingProfile: replay.profiles.get(finalDecision.selectedMoveOrderingKey)?.profile ?? null,
  tupleResidualProfile: baseCandidateModule.tupleResidualProfile,
  mpcProfile: baseCandidateModule.mpcProfile,
});
if (replay.profiles.get(finalDecision.selectedMoveOrderingKey)?.profile) {
  writeJson(path.join(outputDir, 'selected-compatible-move-ordering-profile.json'), replay.profiles.get(finalDecision.selectedMoveOrderingKey).profile);
}

const summary = {
  type: 'stage145-move-ordering-compatibility-replay-suite',
  generatedAt: new Date().toISOString(),
  targetCandidate: {
    label: TARGET_CANDIDATE.label,
    generatedModulePath: relativePortable(resolveCliPath(TARGET_CANDIDATE.generatedModule)),
    evaluationProfileName: baseCandidateModule.evaluationProfile?.name ?? null,
    sourceMoveOrderingProfileName: baseCandidateModule.moveOrderingProfile?.name ?? null,
    tupleResidualProfileName: baseCandidateModule.tupleResidualProfile?.name ?? null,
    mpcProfileName: baseCandidateModule.mpcProfile?.name ?? null,
  },
  options: {
    outputDir: relativePortable(outputDir),
    smoke,
    searchCost: searchCostConfig,
    throughput: throughputConfig,
    pairScenarios,
  },
  replayChain: {
    baselineProfilePath: relativePortable(replay.baselinePath),
    replayedChain: replay.replayedChain,
  },
  candidateVariants,
  throughput: {
    outputJsonPath: relativePortable(throughputOutputPath),
    summaryByKey: throughputByKey,
  },
  searchCostResults,
  rankedChallengers,
  pairBenchmarks: pairResults.map((entry) => ({
    pairSlug: entry.pairSlug,
    scenarioKey: entry.scenarioKey,
    family: entry.family,
    searchAlgorithm: entry.searchAlgorithm,
    outputJsonPath: entry.outputJsonPath,
  })),
  pairHeadToHead,
  finalDecision: {
    ...finalDecision,
    selectedMoveOrderingProfileName: selectedVariant.moveOrderingProfileName ?? null,
    selectedGeneratedModulePath: relativePortable(selectedModulePath),
  },
};

const notes = buildNotes({
  targetCandidate: TARGET_CANDIDATE,
  replay,
  throughputByKey,
  rankedChallengers,
  pairHeadToHead,
  finalDecision,
  selectedVariant,
});

const summaryPath = path.join(outputDir, 'stage145_move_ordering_compatibility_replay_summary.json');
const notesPath = path.join(outputDir, 'stage145_move_ordering_compatibility_replay_notes.md');
writeJson(summaryPath, summary);
writeText(notesPath, notes);

console.log('Stage 145 move-ordering compatibility replay complete');
console.log(`- target candidate: ${TARGET_CANDIDATE.label}`);
console.log(`- selected ordering: ${finalDecision.selectedMoveOrderingKey}`);
console.log(`- action: ${finalDecision.action}`);
console.log(`- next action: ${finalDecision.nextAction}`);
console.log(`- summary: ${relativePortable(summaryPath)}`);
