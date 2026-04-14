#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { parseArgs, relativePathFromCwd, resolveCliPath } from '../evaluator-training/lib.mjs';

const VARIANTS = Object.freeze([
  Object.freeze({
    label: 'active',
    generatedModule: 'js/ai/learned-eval-profile.generated.js',
  }),
  Object.freeze({
    label: 'balanced12',
    generatedModule: 'tools/engine-match/fixtures/stage135-evaluation-profile-finalists/balanced12-alllate-smoothed-stability-090/learned-eval-profile.generated.js',
  }),
  Object.freeze({
    label: 'balanced13',
    generatedModule: 'tools/engine-match/fixtures/stage135-evaluation-profile-finalists/balanced13-alllate-smoothed-stability-090/learned-eval-profile.generated.js',
  }),
]);

const DEFAULTS = Object.freeze({
  outputDir: 'benchmarks/stage135',
  openingPlies: 20,
  styleKey: 'balanced',
  force: false,
  smoke: false,
});

const PAIR_SCENARIOS = Object.freeze([
  Object.freeze({
    key: 'classic_280',
    label: 'Classic PVS 280ms',
    searchAlgorithm: 'classic',
    timeMsList: [280],
    maxDepth: 3,
    exactEndgameEmpties: 6,
    aspirationWindow: 70,
    maxTableEntries: 65000,
    seedList: [17, 31],
    games: 1,
    solverAdjudicationEmpties: 14,
    solverAdjudicationTimeMs: 9000,
  }),
  Object.freeze({
    key: 'classic_500',
    label: 'Classic PVS 500ms',
    searchAlgorithm: 'classic',
    timeMsList: [500],
    maxDepth: 4,
    exactEndgameEmpties: 8,
    aspirationWindow: 60,
    maxTableEntries: 90000,
    seedList: [17],
    games: 1,
    solverAdjudicationEmpties: 16,
    solverAdjudicationTimeMs: 12000,
  }),
  Object.freeze({
    key: 'mcts_guided_280',
    label: 'MCTS Guided 280ms',
    searchAlgorithm: 'mcts-guided',
    timeMsList: [280],
    maxDepth: 3,
    exactEndgameEmpties: 6,
    aspirationWindow: 0,
    maxTableEntries: 65000,
    seedList: [17],
    games: 1,
    solverAdjudicationEmpties: 14,
    solverAdjudicationTimeMs: 9000,
  }),
  Object.freeze({
    key: 'mcts_hybrid_500',
    label: 'MCTS Hybrid 500ms',
    searchAlgorithm: 'mcts-hybrid',
    timeMsList: [500],
    maxDepth: 4,
    exactEndgameEmpties: 8,
    aspirationWindow: 0,
    maxTableEntries: 90000,
    seedList: [17],
    games: 1,
    solverAdjudicationEmpties: 16,
    solverAdjudicationTimeMs: 12000,
  }),
]);

const SMOKE_PAIR_SCENARIOS = Object.freeze([
  Object.freeze({
    key: 'classic_160_smoke',
    label: 'Classic PVS 160ms smoke',
    searchAlgorithm: 'classic',
    timeMsList: [160],
    maxDepth: 2,
    exactEndgameEmpties: 4,
    aspirationWindow: 0,
    maxTableEntries: 30000,
    seedList: [17],
    games: 1,
    solverAdjudicationEmpties: 10,
    solverAdjudicationTimeMs: 5000,
  }),
]);

const THROUGHPUT_SCENARIOS = Object.freeze([
  Object.freeze({
    key: 'classic_throughput',
    label: 'Classic throughput',
    searchAlgorithm: 'classic',
    timeMsList: [160, 280, 500],
    positionSeedList: [17, 31, 41, 53, 71, 89, 97, 107],
    maxDepth: 4,
    exactEndgameEmpties: 8,
    aspirationWindow: 60,
    maxTableEntries: 90000,
  }),
  Object.freeze({
    key: 'classic_mtdf_2ply_throughput',
    label: 'Classic MTD(f) 2ply throughput',
    searchAlgorithm: 'classic-mtdf-2ply',
    timeMsList: [280, 500],
    positionSeedList: [17, 31, 41, 53, 71, 89],
    maxDepth: 4,
    exactEndgameEmpties: 8,
    aspirationWindow: 60,
    maxTableEntries: 90000,
  }),
]);

const SMOKE_THROUGHPUT_SCENARIOS = Object.freeze([
  Object.freeze({
    key: 'classic_throughput_smoke',
    label: 'Classic throughput smoke',
    searchAlgorithm: 'classic',
    timeMsList: [160],
    positionSeedList: [17, 31],
    maxDepth: 2,
    exactEndgameEmpties: 4,
    aspirationWindow: 0,
    maxTableEntries: 30000,
  }),
]);

const MTDF_RETEST_SCENARIOS = Object.freeze([
  Object.freeze({
    key: 'easy_280',
    label: 'MTD(f) easy-band 280ms',
    timeMsList: [280],
    maxDepth: 3,
    exactEndgameEmpties: 6,
    aspirationWindow: 70,
    maxTableEntries: 65000,
    seedList: [17],
    games: 1,
    solverAdjudicationEmpties: 14,
    solverAdjudicationTimeMs: 9000,
  }),
  Object.freeze({
    key: 'normal_500',
    label: 'MTD(f) normal-band 500ms',
    timeMsList: [500],
    maxDepth: 4,
    exactEndgameEmpties: 8,
    aspirationWindow: 60,
    maxTableEntries: 90000,
    seedList: [17],
    games: 1,
    solverAdjudicationEmpties: 16,
    solverAdjudicationTimeMs: 12000,
  }),
]);

const SMOKE_MTDF_RETEST_SCENARIOS = Object.freeze([
  Object.freeze({
    key: 'easy_160_smoke',
    label: 'MTD(f) smoke 160ms',
    timeMsList: [160],
    maxDepth: 2,
    exactEndgameEmpties: 4,
    aspirationWindow: 0,
    maxTableEntries: 30000,
    seedList: [17],
    games: 1,
    solverAdjudicationEmpties: 10,
    solverAdjudicationTimeMs: 5000,
  }),
]);

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/run-stage135-evaluation-profile-adoption-suite.mjs \
    [--output-dir benchmarks/stage135] [--opening-plies 20] [--style-key balanced] \
    [--smoke] [--force]

설명:
- active / balanced12 / balanced13 evaluation profile finalists를 classic + MCTS self-play, classic throughput, MTD(f) 재시험까지 한 번에 묶어 재평가합니다.
- 기존 JSON output이 있으면 기본적으로 재사용하여 resume합니다. 다시 돌리려면 --force를 주십시오.
- --smoke를 주면 seed/games budget을 축소해 형태만 빠르게 검증합니다.
`);
}

function toFiniteInteger(value, fallback, minimum = Number.NEGATIVE_INFINITY, maximum = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
}

function runNodeScript(scriptPath, args, { cwd }) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: 'inherit',
    maxBuffer: 128 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status ?? 'unknown'}): ${scriptPath}`);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(outputPath, data) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function writeText(outputPath, text) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, text, 'utf8');
}

function buildVariantSpecString(variants) {
  return variants.map((variant) => `${variant.label}|${variant.generatedModule}`).join(';');
}

function slugForPair(left, right) {
  return `${left.label}_vs_${right.label}`;
}

function allVariantPairs(variants) {
  const pairs = [];
  for (let i = 0; i < variants.length; i += 1) {
    for (let j = i + 1; j < variants.length; j += 1) {
      pairs.push([variants[i], variants[j]]);
    }
  }
  return pairs;
}

function getScenarioList({ smoke }) {
  return {
    pairScenarios: smoke ? [...SMOKE_PAIR_SCENARIOS] : [...PAIR_SCENARIOS],
    throughputScenarios: smoke ? [...SMOKE_THROUGHPUT_SCENARIOS] : [...THROUGHPUT_SCENARIOS],
    mtdfRetestScenarios: smoke ? [...SMOKE_MTDF_RETEST_SCENARIOS] : [...MTDF_RETEST_SCENARIOS],
  };
}

function maybeRun(scriptPath, args, outputJsonPath, { cwd, force }) {
  const resolved = resolveCliPath(outputJsonPath);
  if (!force && fs.existsSync(resolved)) {
    return {
      outputJsonPath: resolved,
      reused: true,
    };
  }
  runNodeScript(scriptPath, args, { cwd });
  return {
    outputJsonPath: resolved,
    reused: false,
  };
}

function average(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + Number(value ?? 0), 0) / values.length;
}

function weightedAverage(entries, valueSelector, weightSelector) {
  const filtered = (entries ?? []).filter((entry) => Number(weightSelector(entry) ?? 0) > 0);
  if (filtered.length === 0) {
    return 0;
  }
  const totalWeight = filtered.reduce((sum, entry) => sum + Number(weightSelector(entry) ?? 0), 0);
  if (totalWeight <= 0) {
    return 0;
  }
  const weightedTotal = filtered.reduce((sum, entry) => sum + Number(valueSelector(entry) ?? 0) * Number(weightSelector(entry) ?? 0), 0);
  return weightedTotal / totalWeight;
}

function summarizeThroughputVariant(timeBuckets, variantLabel, baselineLabel) {
  const variantEntries = [];
  const comparisonEntries = [];
  for (const bucket of timeBuckets ?? []) {
    if (bucket?.variants?.[variantLabel]) {
      variantEntries.push(bucket.variants[variantLabel]);
    }
    for (const comparison of bucket?.comparisons ?? []) {
      if (comparison?.candidateVariant === variantLabel && comparison?.baselineVariant === baselineLabel) {
        comparisonEntries.push(comparison);
      }
    }
  }

  return {
    variantLabel,
    weightedNodesPerMs: weightedAverage(variantEntries, (entry) => entry.nodesPerMs, (entry) => entry.samples?.length ?? 0),
    weightedDepth: weightedAverage(variantEntries, (entry) => entry.averageCompletedDepth, (entry) => entry.samples?.length ?? 0),
    weightedCompletionRate: weightedAverage(variantEntries, (entry) => entry.completionRate, (entry) => entry.samples?.length ?? 0),
    weightedNodesPerMsGainVsBaseline: weightedAverage(comparisonEntries, (entry) => entry.candidateNodesPerMsGainRate, (entry) => entry.sampleCount),
    weightedDepthGainVsBaseline: weightedAverage(comparisonEntries, (entry) => entry.candidateAverageDepthGain, (entry) => entry.sampleCount),
    weightedMoveAgreementVsBaseline: weightedAverage(comparisonEntries, (entry) => entry.moveAgreementRate, (entry) => entry.sampleCount),
  };
}

function summarizeRoundRobinScores(pairResults, variantLabel) {
  const scenarioEntries = [];
  for (const pairResult of pairResults) {
    for (const scenario of pairResult.summary.scenarios ?? []) {
      if (scenario?.variants?.[variantLabel]) {
        scenarioEntries.push({
          pairSlug: pairResult.pairSlug,
          scenarioKey: pairResult.scenarioKey,
          searchAlgorithm: pairResult.searchAlgorithm,
          timeLimitMs: scenario.timeLimitMs,
          totalGames: scenario.totalGames,
          variant: scenario.variants[variantLabel],
        });
      }
    }
  }

  return {
    variantLabel,
    weightedScoreRate: weightedAverage(scenarioEntries, (entry) => entry.variant?.scoreRate, (entry) => entry.totalGames),
    weightedAverageDiscDiff: weightedAverage(scenarioEntries, (entry) => entry.variant?.averageDiscDiff, (entry) => entry.totalGames),
    weightedNodesPerMs: weightedAverage(scenarioEntries, (entry) => entry.variant?.nodesPerMs, (entry) => entry.variant?.totalTurns ?? 0),
    weightedFallbackRate: weightedAverage(scenarioEntries, (entry) => entry.variant?.fallbackRate, (entry) => entry.variant?.totalTurns ?? 0),
    scenarioCount: scenarioEntries.length,
    totalGames: scenarioEntries.reduce((sum, entry) => sum + Number(entry.totalGames ?? 0), 0),
  };
}

function summarizeHeadToHead(pairResults, leftLabel, rightLabel) {
  const relevant = pairResults.filter((pairResult) => {
    const labels = [pairResult.left.label, pairResult.right.label];
    return labels.includes(leftLabel) && labels.includes(rightLabel);
  });
  const scenarioEntries = [];
  for (const pairResult of relevant) {
    for (const scenario of pairResult.summary.scenarios ?? []) {
      if (scenario?.variants?.[leftLabel] && scenario?.variants?.[rightLabel]) {
        scenarioEntries.push({
          pairSlug: pairResult.pairSlug,
          scenarioKey: pairResult.scenarioKey,
          searchAlgorithm: pairResult.searchAlgorithm,
          timeLimitMs: scenario.timeLimitMs,
          totalGames: scenario.totalGames,
          left: scenario.variants[leftLabel],
          right: scenario.variants[rightLabel],
          pointGap: Number(scenario.variants[rightLabel].scoreRate ?? 0) - Number(scenario.variants[leftLabel].scoreRate ?? 0),
        });
      }
    }
  }
  return {
    leftLabel,
    rightLabel,
    scenarioCount: scenarioEntries.length,
    totalGames: scenarioEntries.reduce((sum, entry) => sum + Number(entry.totalGames ?? 0), 0),
    weightedPointGap: weightedAverage(scenarioEntries, (entry) => entry.pointGap, (entry) => entry.totalGames),
    worstPointGap: scenarioEntries.length > 0 ? Math.min(...scenarioEntries.map((entry) => Number(entry.pointGap ?? 0))) : 0,
    bestPointGap: scenarioEntries.length > 0 ? Math.max(...scenarioEntries.map((entry) => Number(entry.pointGap ?? 0))) : 0,
    scenarios: scenarioEntries,
  };
}

function rankVariants(variantSummaries, headToHeadSummaries, throughputByVariant) {
  const entries = variantSummaries.map((summary) => {
    const throughput = throughputByVariant[summary.variantLabel] ?? null;
    const directHeadToHead = headToHeadSummaries
      .filter((entry) => entry.leftLabel === summary.variantLabel || entry.rightLabel === summary.variantLabel)
      .map((entry) => {
        if (entry.rightLabel === summary.variantLabel) {
          return entry.weightedPointGap;
        }
        return -entry.weightedPointGap;
      });
    const worstDirectGap = directHeadToHead.length > 0 ? Math.min(...directHeadToHead) : 0;
    const score = Number(summary.weightedScoreRate ?? 0)
      + (Number(summary.weightedAverageDiscDiff ?? 0) * 0.002)
      + (Number(throughput?.weightedNodesPerMsGainVsBaseline ?? 0) * 0.03)
      + (Number(throughput?.weightedDepthGainVsBaseline ?? 0) * 0.02);
    return {
      ...summary,
      throughput,
      worstDirectGap,
      rankingScore: score,
    };
  }).sort((left, right) => {
    if (right.rankingScore !== left.rankingScore) {
      return right.rankingScore - left.rankingScore;
    }
    if (right.weightedScoreRate !== left.weightedScoreRate) {
      return right.weightedScoreRate - left.weightedScoreRate;
    }
    if (right.weightedAverageDiscDiff !== left.weightedAverageDiscDiff) {
      return right.weightedAverageDiscDiff - left.weightedAverageDiscDiff;
    }
    return (right.throughput?.weightedNodesPerMsGainVsBaseline ?? 0) - (left.throughput?.weightedNodesPerMsGainVsBaseline ?? 0);
  });
  return entries;
}

function decideWinner(rankedVariants, headToHeadSummaries) {
  const top = rankedVariants[0] ?? null;
  const second = rankedVariants[1] ?? null;
  if (!top) {
    return {
      action: 'insufficient-data',
      selectedVariant: null,
      finalists: [],
      rationale: 'No variant results were available.',
    };
  }

  if (!second) {
    return {
      action: top.variantLabel === 'active' ? 'hold-active' : 'adopt-candidate',
      selectedVariant: top.variantLabel,
      finalists: [top.variantLabel],
      rationale: 'Only one variant had usable results.',
    };
  }

  const topVsSecond = headToHeadSummaries.find((entry) => (
    (entry.leftLabel === top.variantLabel && entry.rightLabel === second.variantLabel)
    || (entry.leftLabel === second.variantLabel && entry.rightLabel === top.variantLabel)
  ));
  const normalizedHeadToHeadGap = !topVsSecond
    ? 0
    : topVsSecond.rightLabel === top.variantLabel
      ? Number(topVsSecond.weightedPointGap ?? 0)
      : -Number(topVsSecond.weightedPointGap ?? 0);
  const topMargin = Number(top.rankingScore ?? 0) - Number(second.rankingScore ?? 0);

  if (top.variantLabel !== 'active'
    && Number(top.weightedScoreRate ?? 0) >= Number(second.weightedScoreRate ?? 0) + 0.015
    && normalizedHeadToHeadGap >= 0.05
    && Number(top.worstDirectGap ?? 0) >= -0.05) {
    return {
      action: 'adopt-candidate',
      selectedVariant: top.variantLabel,
      finalists: [top.variantLabel],
      rationale: `${top.variantLabel}가 round-robin score, direct head-to-head, throughput 보조지표까지 가장 안정적으로 앞섰습니다.`,
    };
  }

  if (topMargin < 0.03 || Math.abs(normalizedHeadToHeadGap) < 0.05) {
    return {
      action: 'keep-two-finalists',
      selectedVariant: top.variantLabel,
      finalists: [top.variantLabel, second.variantLabel],
      rationale: `${top.variantLabel}가 약간 앞서지만 ${second.variantLabel}와의 차이가 아직 작아 결선 2개 유지 쪽이 안전합니다.`,
    };
  }

  return {
    action: top.variantLabel === 'active' ? 'hold-active' : 'adopt-candidate',
    selectedVariant: top.variantLabel,
    finalists: [top.variantLabel],
    rationale: top.variantLabel === 'active'
      ? '현 active가 여전히 가장 안정적이어서 즉시 교체는 보류합니다.'
      : `${top.variantLabel}가 종합 점수에서 가장 낫습니다.`,
  };
}

function buildNotesMarkdown({
  summary,
  throughputSummaries,
  pairResults,
  mtdfRetestResults,
}) {
  const lines = [];
  lines.push('# Stage 135 evaluation profile adoption notes');
  lines.push('');
  lines.push(`Final action: **${summary.finalDecision.action}**`);
  lines.push(`Selected variant: **${summary.finalDecision.selectedVariant ?? 'none'}**`);
  lines.push(`Finalists: ${summary.finalDecision.finalists.join(', ') || 'none'}`);
  lines.push('');
  lines.push('## Round-robin ranking');
  for (const entry of summary.variantRanking) {
    lines.push(`- ${entry.variantLabel}: scoreRate ${(entry.weightedScoreRate * 100).toFixed(1)}%, avgDiscDiff ${entry.weightedAverageDiscDiff.toFixed(2)}, throughputGain ${(Number(entry.throughput?.weightedNodesPerMsGainVsBaseline ?? 0) * 100).toFixed(1)}%, rankingScore ${entry.rankingScore.toFixed(4)}`);
  }
  lines.push('');
  lines.push('## Throughput');
  for (const entry of throughputSummaries) {
    lines.push(`- ${entry.label}:`);
    for (const variant of entry.perVariant) {
      lines.push(`  - ${variant.variantLabel}: nodes/ms ${variant.weightedNodesPerMs.toFixed(2)}, depth ${variant.weightedDepth.toFixed(2)}, completion ${(variant.weightedCompletionRate * 100).toFixed(1)}%, gain vs active ${(variant.weightedNodesPerMsGainVsBaseline * 100).toFixed(1)}%`);
    }
  }
  lines.push('');
  lines.push('## Pair benchmarks');
  for (const pairResult of pairResults) {
    for (const scenario of pairResult.summary.scenarios ?? []) {
      const left = scenario.variants[pairResult.left.label];
      const right = scenario.variants[pairResult.right.label];
      lines.push(`- ${pairResult.pairSlug} / ${pairResult.scenarioLabel}: ${pairResult.left.label} ${(left.scoreRate * 100).toFixed(1)}% vs ${pairResult.right.label} ${(right.scoreRate * 100).toFixed(1)}% (gap ${(scenario.pointGap * 100).toFixed(1)}pp)`);
    }
  }
  if (mtdfRetestResults.length > 0) {
    lines.push('');
    lines.push('## MTD(f) retest');
    for (const result of mtdfRetestResults) {
      for (const scenario of result.summary.scenarios ?? []) {
        const classic = scenario.algorithms.classic;
        const candidate = scenario.algorithms['classic-mtdf-2ply'];
        lines.push(`- ${result.variantLabel} / ${result.scenarioLabel}: classic ${(classic.scoreRate * 100).toFixed(1)}% vs classic-mtdf-2ply ${(candidate.scoreRate * 100).toFixed(1)}% (gap ${(scenario.pointGap * 100).toFixed(1)}pp)`);
      }
    }
  }
  lines.push('');
  lines.push(`Rationale: ${summary.finalDecision.rationale}`);
  return `${lines.join('\n')}\n`;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printUsage();
  process.exit(0);
}

const outputDir = typeof args['output-dir'] === 'string' && args['output-dir'].trim() !== ''
  ? resolveCliPath(args['output-dir'])
  : resolveCliPath(DEFAULTS.outputDir);
const openingPlies = toFiniteInteger(args['opening-plies'], DEFAULTS.openingPlies, 0, 60);
const styleKey = typeof args['style-key'] === 'string' && args['style-key'].trim() !== ''
  ? args['style-key'].trim()
  : DEFAULTS.styleKey;
const smoke = Boolean(args.smoke);
const force = Boolean(args.force);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { pairScenarios, throughputScenarios, mtdfRetestScenarios } = getScenarioList({ smoke });

fs.mkdirSync(outputDir, { recursive: true });

const throughputResults = [];
for (const scenario of throughputScenarios) {
  const outputJsonPath = path.join(outputDir, 'throughput', `${scenario.key}.json`);
  const run = maybeRun(
    path.join(repoRoot, 'tools/engine-match/benchmark-profile-variant-throughput-compare.mjs'),
    [
      '--output-json', outputJsonPath,
      '--search-algorithm', scenario.searchAlgorithm,
      '--variant-specs', buildVariantSpecString(VARIANTS),
      '--time-ms-list', scenario.timeMsList.join(','),
      '--position-seed-list', scenario.positionSeedList.join(','),
      '--opening-plies', String(openingPlies),
      '--max-depth', String(scenario.maxDepth),
      '--exact-endgame-empties', String(scenario.exactEndgameEmpties),
      '--aspiration-window', String(scenario.aspirationWindow),
      '--max-table-entries', String(scenario.maxTableEntries),
      '--preset-key', 'custom',
      '--style-key', styleKey,
    ],
    outputJsonPath,
    { cwd: repoRoot, force },
  );
  throughputResults.push({
    scenarioKey: scenario.key,
    label: scenario.label,
    searchAlgorithm: scenario.searchAlgorithm,
    outputJsonPath: run.outputJsonPath,
    reused: run.reused,
    summary: readJson(run.outputJsonPath),
  });
}

const pairResults = [];
for (const [left, right] of allVariantPairs(VARIANTS)) {
  const pairSlug = slugForPair(left, right);
  for (const scenario of pairScenarios) {
    const outputJsonPath = path.join(outputDir, 'pairs', `${pairSlug}.${scenario.key}.json`);
    const run = maybeRun(
      path.join(repoRoot, 'tools/engine-match/benchmark-profile-variant-pair.mjs'),
      [
        '--output-json', outputJsonPath,
        '--search-algorithm', scenario.searchAlgorithm,
        '--first-label', left.label,
        '--first-generated-module', left.generatedModule,
        '--second-label', right.label,
        '--second-generated-module', right.generatedModule,
        '--games', String(scenario.games),
        '--opening-plies', String(openingPlies),
        '--seed-list', scenario.seedList.join(','),
        '--time-ms-list', scenario.timeMsList.join(','),
        '--max-depth', String(scenario.maxDepth),
        '--exact-endgame-empties', String(scenario.exactEndgameEmpties),
        '--solver-adjudication-empties', String(scenario.solverAdjudicationEmpties),
        '--solver-adjudication-time-ms', String(scenario.solverAdjudicationTimeMs),
        '--aspiration-window', String(scenario.aspirationWindow),
        '--max-table-entries', String(scenario.maxTableEntries),
        '--preset-key', 'custom',
        '--style-key', styleKey,
        '--progress-every-pairs', '1',
      ],
      outputJsonPath,
      { cwd: repoRoot, force },
    );
    pairResults.push({
      pairSlug,
      left,
      right,
      scenarioKey: scenario.key,
      scenarioLabel: scenario.label,
      searchAlgorithm: scenario.searchAlgorithm,
      outputJsonPath: run.outputJsonPath,
      reused: run.reused,
      summary: readJson(run.outputJsonPath),
    });
  }
}

const throughputByVariant = {};
for (const variant of VARIANTS) {
  throughputByVariant[variant.label] = summarizeThroughputVariant(
    throughputResults.flatMap((result) => result.summary.timeBuckets ?? []),
    variant.label,
    'active',
  );
}

const variantRoundRobin = VARIANTS.map((variant) => summarizeRoundRobinScores(pairResults, variant.label));
const headToHeadSummaries = allVariantPairs(VARIANTS).map(([left, right]) => summarizeHeadToHead(pairResults, left.label, right.label));
const variantRanking = rankVariants(variantRoundRobin, headToHeadSummaries, throughputByVariant);
const finalDecision = decideWinner(variantRanking, headToHeadSummaries);

const mtdfRetestVariants = Array.from(new Set([
  'active',
  finalDecision.selectedVariant,
].filter(Boolean)));
const mtdfRetestResults = [];
for (const variantLabel of mtdfRetestVariants) {
  const variant = VARIANTS.find((entry) => entry.label === variantLabel);
  if (!variant) {
    continue;
  }
  for (const scenario of mtdfRetestScenarios) {
    const outputJsonPath = path.join(outputDir, 'mtdf-retest', `${variant.label}.${scenario.key}.json`);
    const run = maybeRun(
      path.join(repoRoot, 'tools/engine-match/benchmark-search-algorithm-pair.mjs'),
      [
        '--output-json', outputJsonPath,
        '--first-algorithm', 'classic',
        '--second-algorithm', 'classic-mtdf-2ply',
        '--generated-module', variant.generatedModule,
        '--games', String(scenario.games),
        '--opening-plies', String(openingPlies),
        '--seed-list', scenario.seedList.join(','),
        '--time-ms-list', scenario.timeMsList.join(','),
        '--max-depth', String(scenario.maxDepth),
        '--exact-endgame-empties', String(scenario.exactEndgameEmpties),
        '--solver-adjudication-empties', String(scenario.solverAdjudicationEmpties),
        '--solver-adjudication-time-ms', String(scenario.solverAdjudicationTimeMs),
        '--aspiration-window', String(scenario.aspirationWindow),
        '--max-table-entries', String(scenario.maxTableEntries),
        '--preset-key', 'custom',
        '--style-key', styleKey,
        '--progress-every-pairs', '1',
      ],
      outputJsonPath,
      { cwd: repoRoot, force },
    );
    mtdfRetestResults.push({
      variantLabel: variant.label,
      scenarioKey: scenario.key,
      scenarioLabel: scenario.label,
      outputJsonPath: run.outputJsonPath,
      reused: run.reused,
      summary: readJson(run.outputJsonPath),
    });
  }
}

const throughputSummaries = throughputResults.map((result) => ({
  scenarioKey: result.scenarioKey,
  label: result.label,
  searchAlgorithm: result.searchAlgorithm,
  perVariant: VARIANTS.map((variant) => summarizeThroughputVariant(result.summary.timeBuckets ?? [], variant.label, 'active')),
}));

const summary = {
  type: 'stage135-evaluation-profile-adoption-suite',
  generatedAt: new Date().toISOString(),
  options: {
    outputDir: relativePathFromCwd(outputDir) ?? outputDir,
    openingPlies,
    styleKey,
    smoke,
    force,
  },
  variants: VARIANTS,
  throughputResults: throughputResults.map((result) => ({
    scenarioKey: result.scenarioKey,
    label: result.label,
    searchAlgorithm: result.searchAlgorithm,
    outputJsonPath: relativePathFromCwd(result.outputJsonPath) ?? result.outputJsonPath,
    reused: result.reused,
  })),
  pairResults: pairResults.map((result) => ({
    pairSlug: result.pairSlug,
    scenarioKey: result.scenarioKey,
    scenarioLabel: result.scenarioLabel,
    searchAlgorithm: result.searchAlgorithm,
    outputJsonPath: relativePathFromCwd(result.outputJsonPath) ?? result.outputJsonPath,
    reused: result.reused,
  })),
  throughputSummaries,
  variantRoundRobin,
  headToHeadSummaries,
  variantRanking,
  finalDecision,
  mtdfRetestResults: mtdfRetestResults.map((result) => ({
    variantLabel: result.variantLabel,
    scenarioKey: result.scenarioKey,
    scenarioLabel: result.scenarioLabel,
    outputJsonPath: relativePathFromCwd(result.outputJsonPath) ?? result.outputJsonPath,
    reused: result.reused,
    condensedRecommendations: result.summary.condensedRecommendations,
  })),
};

const summaryPath = path.join(outputDir, 'stage135_evaluation_profile_adoption_summary.json');
writeJson(summaryPath, summary);
const notesPath = path.join(outputDir, 'stage135_evaluation_profile_adoption_notes.md');
writeText(notesPath, buildNotesMarkdown({ summary, throughputSummaries, pairResults, mtdfRetestResults }));

console.log(`Saved summary to ${relativePathFromCwd(summaryPath) ?? summaryPath}`);
console.log(`Saved notes to ${relativePathFromCwd(notesPath) ?? notesPath}`);
console.log(`Final action: ${finalDecision.action}`);
console.log(`Selected variant: ${finalDecision.selectedVariant ?? 'none'}`);
