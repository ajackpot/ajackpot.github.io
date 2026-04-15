#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseArgs, relativePathFromCwd, resolveCliPath } from '../evaluator-training/lib.mjs';
import {
  allVariantPairs,
  buildVariantSpecString,
  maybeRun,
  readJson,
  slugForPair,
  summarizeHeadToHead,
  summarizeThroughputVariant,
  weightedAverage,
  writeJson,
  writeText,
} from './lib-compact-tuple-adoption.mjs';

const VARIANTS = Object.freeze([
  Object.freeze({ label: 'active', generatedModule: 'js/ai/learned-eval-profile.generated.js', role: 'baseline' }),
  Object.freeze({ label: 'diagonal-top24-latea-endgame', generatedModule: 'tools/engine-match/fixtures/stage144-compact-tuple-finalists/diagonal-top24-latea-endgame/learned-eval-profile.generated.js', role: 'primary-candidate' }),
  Object.freeze({ label: 'outer2-top24-lateb-endgame', generatedModule: 'tools/engine-match/fixtures/stage144-compact-tuple-finalists/outer2-top24-lateb-endgame/learned-eval-profile.generated.js', role: 'control-candidate' }),
]);

const DEFAULTS = Object.freeze({
  outputDir: 'benchmarks/stage144',
  openingPlies: 20,
  styleKey: 'balanced',
  smoke: false,
  force: false,
});

const PAIR_SCENARIOS = Object.freeze([
  Object.freeze({ key: 'mtdf_fast_noisy_280', label: 'Classic MTD(f) 2ply fast noisy 280ms', family: 'primary', searchAlgorithm: 'classic-mtdf-2ply', timeMsList: [280], maxDepth: 4, exactEndgameEmpties: 8, aspirationWindow: 60, maxTableEntries: 90000, seedList: [17, 31], games: 1, solverAdjudicationEmpties: 14, solverAdjudicationTimeMs: 9000 }),
  Object.freeze({ key: 'mtdf_normal_500', label: 'Classic MTD(f) 2ply normal noisy 500ms', family: 'primary', searchAlgorithm: 'classic-mtdf-2ply', timeMsList: [500], maxDepth: 4, exactEndgameEmpties: 8, aspirationWindow: 60, maxTableEntries: 90000, seedList: [17], games: 1, solverAdjudicationEmpties: 16, solverAdjudicationTimeMs: 12000 }),
  Object.freeze({ key: 'classic_sanity_280', label: 'Classic PVS sanity 280ms', family: 'sanity', searchAlgorithm: 'classic', timeMsList: [280], maxDepth: 4, exactEndgameEmpties: 8, aspirationWindow: 60, maxTableEntries: 90000, seedList: [17], games: 1, solverAdjudicationEmpties: 14, solverAdjudicationTimeMs: 9000 }),
]);

const SMOKE_PAIR_SCENARIOS = Object.freeze([
  Object.freeze({ key: 'mtdf_smoke_160', label: 'Classic MTD(f) 2ply smoke 160ms', family: 'primary', searchAlgorithm: 'classic-mtdf-2ply', timeMsList: [160], maxDepth: 2, exactEndgameEmpties: 4, aspirationWindow: 0, maxTableEntries: 30000, seedList: [17], games: 1, solverAdjudicationEmpties: 10, solverAdjudicationTimeMs: 5000 }),
]);

const THROUGHPUT_SCENARIOS = Object.freeze([
  Object.freeze({ key: 'mtdf_2ply_throughput', label: 'Classic MTD(f) 2ply throughput', family: 'primary', searchAlgorithm: 'classic-mtdf-2ply', timeMsList: [280, 500], positionSeedList: [17, 31, 41, 53, 71, 89], maxDepth: 4, exactEndgameEmpties: 8, aspirationWindow: 60, maxTableEntries: 90000 }),
  Object.freeze({ key: 'classic_throughput_sanity', label: 'Classic throughput sanity', family: 'sanity', searchAlgorithm: 'classic', timeMsList: [160, 280], positionSeedList: [17, 31, 41, 53], maxDepth: 4, exactEndgameEmpties: 8, aspirationWindow: 60, maxTableEntries: 90000 }),
]);

const SMOKE_THROUGHPUT_SCENARIOS = Object.freeze([
  Object.freeze({ key: 'mtdf_2ply_throughput_smoke', label: 'Classic MTD(f) 2ply throughput smoke', family: 'primary', searchAlgorithm: 'classic-mtdf-2ply', timeMsList: [160], positionSeedList: [17, 31], maxDepth: 2, exactEndgameEmpties: 4, aspirationWindow: 0, maxTableEntries: 30000 }),
]);

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/run-stage144-compact-tuple-confirmation-suite.mjs \
    [--output-dir benchmarks/stage144] [--opening-plies 20] [--style-key balanced] \
    [--smoke] [--force]

설명:
- Stage 126 weight learning에서 살아남은 compact tuple finalists를 active baseline과 paired noisy match + throughput으로 다시 확인합니다.
- Stage 124/125 순서대로 noisy confirmation까지만 수행하고, diagonal candidate가 살아남았을 때만 move-ordering compatibility replay를 다음 단계로 권고합니다.
- 기존 JSON output이 있으면 재사용합니다. 다시 돌리려면 --force를 주십시오.
`);
}

function toFiniteInteger(value, fallback, minimum = Number.NEGATIVE_INFINITY, maximum = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
}







function getScenarioList({ smoke }) {
  return {
    pairScenarios: smoke ? [...SMOKE_PAIR_SCENARIOS] : [...PAIR_SCENARIOS],
    throughputScenarios: smoke ? [...SMOKE_THROUGHPUT_SCENARIOS] : [...THROUGHPUT_SCENARIOS],
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
          scenarioFamily: pairResult.family,
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


function rankVariants(variantSummaries, throughputByVariant) {
  return variantSummaries.map((summary) => {
    const throughput = throughputByVariant[summary.variantLabel] ?? null;
    const rankingScore = Number(summary.weightedScoreRate ?? 0)
      + (Number(summary.weightedAverageDiscDiff ?? 0) * 0.002)
      + (Number(throughput?.weightedNodesPerMsGainVsBaseline ?? 0) * 0.03)
      + (Number(throughput?.weightedDepthGainVsBaseline ?? 0) * 0.02);
    return { ...summary, throughput, rankingScore };
  }).sort((left, right) => right.rankingScore - left.rankingScore);
}

function decideStage124NextStep({ diagonalPrimary, diagonalAll, outer2Primary, throughputByVariant }) {
  const diagonalThroughput = throughputByVariant['diagonal-top24-latea-endgame'] ?? null;
  const outer2Throughput = throughputByVariant['outer2-top24-lateb-endgame'] ?? null;
  const diagonalSurvivesPrimary = Number(diagonalPrimary.weightedPointGap ?? 0) >= 0
    && Number(diagonalPrimary.worstPointGap ?? 0) >= -0.05
    && Number(diagonalThroughput?.weightedNodesPerMsGainVsBaseline ?? 0) >= -0.05;
  const diagonalSurvivesAll = Number(diagonalAll.weightedPointGap ?? 0) >= -0.02
    && Number(diagonalAll.worstPointGap ?? 0) >= -0.10;
  const outer2ControlStable = Number(outer2Primary.weightedPointGap ?? 0) >= -0.10
    || Number(outer2Throughput?.weightedNodesPerMsGainVsBaseline ?? 0) > 0;
  if (diagonalSurvivesPrimary && diagonalSurvivesAll) {
    return {
      action: 'open-move-ordering-compatibility-replay',
      selectedCandidate: 'diagonal-top24-latea-endgame',
      controlCandidate: outer2ControlStable ? 'outer2-top24-lateb-endgame' : null,
      rationale: 'Stage 124/125 ordering대로 diagonal new-family patch가 noisy confirmation을 통과했으므로 다음 단계는 move-ordering compatibility replay입니다.',
    };
  }
  if (outer2ControlStable) {
    return {
      action: 'hold-active-keep-control-only',
      selectedCandidate: null,
      controlCandidate: 'outer2-top24-lateb-endgame',
      rationale: 'Diagonal line이 noisy confirmation에서 충분히 살아남지 못해 active baseline을 유지합니다. Outer2는 efficiency control로만 유지합니다.',
    };
  }
  return {
    action: 'hold-active-baseline',
    selectedCandidate: null,
    controlCandidate: null,
    rationale: '두 compact tuple finalist 모두 다음 replay 단계로 올릴 만큼 noisy confirmation을 통과하지 못했습니다.',
  };
}

function buildNotesMarkdown({ summary, throughputSummaries, pairResults }) {
  const lines = [];
  lines.push('# Stage 144 compact tuple confirmation notes');
  lines.push('');
  lines.push(`Final action: **${summary.finalDecision.action}**`);
  lines.push(`Selected candidate: **${summary.finalDecision.selectedCandidate ?? 'none'}**`);
  lines.push(`Control candidate: **${summary.finalDecision.controlCandidate ?? 'none'}**`);
  lines.push('');
  lines.push('## Stage 124 next-step interpretation');
  lines.push(`- ${summary.finalDecision.rationale}`);
  lines.push('');
  lines.push('## Round-robin ranking');
  for (const entry of summary.variantRanking) {
    lines.push(`- ${entry.variantLabel}: scoreRate ${(entry.weightedScoreRate * 100).toFixed(1)}%, avgDiscDiff ${entry.weightedAverageDiscDiff.toFixed(2)}, throughputGain ${(Number(entry.throughput?.weightedNodesPerMsGainVsBaseline ?? 0) * 100).toFixed(1)}%, rankingScore ${entry.rankingScore.toFixed(4)}`);
  }
  lines.push('');
  lines.push('## Active head-to-head checkpoints');
  for (const entry of summary.activeHeadToHead) {
    lines.push(`- ${entry.family} / ${entry.rightLabel}: pointGap ${(Number(entry.weightedPointGap ?? 0) * 100).toFixed(1)} pts, worst ${(Number(entry.worstPointGap ?? 0) * 100).toFixed(1)} pts over ${entry.totalGames} games`);
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
      lines.push(`- ${pairResult.pairSlug} / ${pairResult.scenarioLabel}: ${pairResult.left.label} ${(left.scoreRate * 100).toFixed(1)}% vs ${pairResult.right.label} ${(right.scoreRate * 100).toFixed(1)}%, nodes/ms ${left.nodesPerMs.toFixed(2)} vs ${right.nodesPerMs.toFixed(2)}`);
    }
  }
  lines.push('');
  lines.push('## Final decision');
  lines.push(`Action: ${summary.finalDecision.action}`);
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
const styleKey = typeof args['style-key'] === 'string' && args['style-key'].trim() !== '' ? args['style-key'].trim() : DEFAULTS.styleKey;
const smoke = Boolean(args.smoke);
const force = Boolean(args.force);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { pairScenarios, throughputScenarios } = getScenarioList({ smoke });

fs.mkdirSync(outputDir, { recursive: true });
const logsDir = path.join(outputDir, 'logs');

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
    { cwd: repoRoot, force, logPath: path.join(logsDir, `throughput.${scenario.key}.log`) },
  );
  throughputResults.push({ scenarioKey: scenario.key, label: scenario.label, family: scenario.family, searchAlgorithm: scenario.searchAlgorithm, outputJsonPath: run.outputJsonPath, reused: run.reused, summary: readJson(run.outputJsonPath) });
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
      { cwd: repoRoot, force, logPath: path.join(logsDir, `${pairSlug}.${scenario.key}.log`) },
    );
    pairResults.push({ pairSlug, left, right, scenarioKey: scenario.key, scenarioLabel: scenario.label, family: scenario.family, searchAlgorithm: scenario.searchAlgorithm, outputJsonPath: run.outputJsonPath, reused: run.reused, summary: readJson(run.outputJsonPath) });
  }
}

const throughputByVariant = {};
for (const variant of VARIANTS) {
  throughputByVariant[variant.label] = summarizeThroughputVariant(
    throughputResults.filter((result) => result.family === 'primary').flatMap((result) => result.summary.timeBuckets ?? []),
    variant.label,
    'active',
  );
}

const variantRoundRobin = VARIANTS.map((variant) => summarizeRoundRobinScores(pairResults, variant.label));
const variantRanking = rankVariants(variantRoundRobin, throughputByVariant);
const activeHeadToHead = [
  summarizeHeadToHead(pairResults, 'active', 'diagonal-top24-latea-endgame', 'primary'),
  summarizeHeadToHead(pairResults, 'active', 'diagonal-top24-latea-endgame', null),
  summarizeHeadToHead(pairResults, 'active', 'outer2-top24-lateb-endgame', 'primary'),
  summarizeHeadToHead(pairResults, 'active', 'outer2-top24-lateb-endgame', null),
];
const finalDecision = decideStage124NextStep({ diagonalPrimary: activeHeadToHead[0], diagonalAll: activeHeadToHead[1], outer2Primary: activeHeadToHead[2], throughputByVariant });
const throughputSummaries = throughputResults.map((result) => ({ scenarioKey: result.scenarioKey, label: result.label, family: result.family, searchAlgorithm: result.searchAlgorithm, perVariant: VARIANTS.map((variant) => summarizeThroughputVariant(result.summary.timeBuckets ?? [], variant.label, 'active')) }));

const summary = {
  type: 'stage144-compact-tuple-confirmation-suite',
  generatedAt: new Date().toISOString(),
  options: { outputDir: relativePathFromCwd(outputDir) ?? outputDir, openingPlies, styleKey, smoke, force },
  variants: VARIANTS,
  throughputResults: throughputResults.map((result) => ({ scenarioKey: result.scenarioKey, label: result.label, family: result.family, searchAlgorithm: result.searchAlgorithm, outputJsonPath: relativePathFromCwd(result.outputJsonPath) ?? result.outputJsonPath, reused: result.reused })),
  pairResults: pairResults.map((result) => ({ pairSlug: result.pairSlug, scenarioKey: result.scenarioKey, scenarioLabel: result.scenarioLabel, family: result.family, searchAlgorithm: result.searchAlgorithm, outputJsonPath: relativePathFromCwd(result.outputJsonPath) ?? result.outputJsonPath, reused: result.reused })),
  throughputSummaries,
  variantRoundRobin,
  activeHeadToHead,
  variantRanking,
  finalDecision,
};

const summaryPath = path.join(outputDir, 'stage144_compact_tuple_confirmation_summary.json');
writeJson(summaryPath, summary);
const notesPath = path.join(outputDir, 'stage144_compact_tuple_confirmation_notes.md');
writeText(notesPath, buildNotesMarkdown({ summary, throughputSummaries, pairResults }));
console.log(`Saved summary to ${relativePathFromCwd(summaryPath) ?? summaryPath}`);
console.log(`Saved notes to ${relativePathFromCwd(notesPath) ?? notesPath}`);
console.log(`Final action: ${finalDecision.action}`);
console.log(`Selected candidate: ${finalDecision.selectedCandidate ?? 'none'}`);
console.log(`Control candidate: ${finalDecision.controlCandidate ?? 'none'}`);
