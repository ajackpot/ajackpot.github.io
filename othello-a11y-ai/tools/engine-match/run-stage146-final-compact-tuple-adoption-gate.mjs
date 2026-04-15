#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  loadGeneratedProfilesModuleIfPresent,
  parseArgs,
  relativePathFromCwd,
  resolveCliPath,
  writeGeneratedProfilesModule,
} from '../evaluator-training/lib.mjs';
import {
  buildVariantSpecString,
  maybeRun,
  readJson,
  summarizeCombinedSearchCost,
  summarizeDepth,
  summarizeExact,
  summarizeHeadToHead,
  summarizeThroughputVariant,
  writeJson,
  writeText,
} from './lib-compact-tuple-adoption.mjs';

const VARIANTS = Object.freeze([
  Object.freeze({ label: 'active', role: 'baseline', generatedModule: 'js/ai/learned-eval-profile.generated.js' }),
  Object.freeze({ label: 'diagonal-top24-latea-endgame-baseline-ordering', role: 'candidate', generatedModule: 'tools/engine-match/fixtures/stage146-compact-tuple-adoption-candidate/learned-eval-profile.generated.js' }),
]);

const DEFAULTS = Object.freeze({
  outputDir: 'benchmarks/stage146',
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

const PAIR_SCENARIOS_SMOKE = Object.freeze([
  Object.freeze({ key: 'mtdf_smoke_160', label: 'Classic MTD(f) 2ply smoke 160ms', family: 'primary', searchAlgorithm: 'classic-mtdf-2ply', timeMsList: [160], maxDepth: 2, exactEndgameEmpties: 4, aspirationWindow: 0, maxTableEntries: 30000, seedList: [17], games: 1, solverAdjudicationEmpties: 10, solverAdjudicationTimeMs: 5000 }),
]);

const THROUGHPUT_SCENARIOS = Object.freeze([
  Object.freeze({ key: 'mtdf_2ply_throughput', label: 'Classic MTD(f) 2ply throughput', family: 'primary', searchAlgorithm: 'classic-mtdf-2ply', timeMsList: [280, 500], positionSeedList: [17, 31, 41, 53, 71, 89], maxDepth: 4, exactEndgameEmpties: 8, aspirationWindow: 60, maxTableEntries: 90000 }),
  Object.freeze({ key: 'classic_throughput_sanity', label: 'Classic throughput sanity', family: 'sanity', searchAlgorithm: 'classic', timeMsList: [160, 280], positionSeedList: [17, 31, 41, 53], maxDepth: 4, exactEndgameEmpties: 8, aspirationWindow: 60, maxTableEntries: 90000 }),
]);

const THROUGHPUT_SCENARIOS_SMOKE = Object.freeze([
  Object.freeze({ key: 'mtdf_2ply_throughput_smoke', label: 'Classic MTD(f) 2ply throughput smoke', family: 'primary', searchAlgorithm: 'classic-mtdf-2ply', timeMsList: [160], positionSeedList: [17, 31], maxDepth: 2, exactEndgameEmpties: 4, aspirationWindow: 0, maxTableEntries: 30000 }),
]);

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

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/run-stage146-final-compact-tuple-adoption-gate.mjs \
    [--output-dir benchmarks/stage146] [--opening-plies 20] [--style-key balanced] \
    [--smoke] [--force]

설명:
- Stage 145에서 선택된 diagonal compact-tuple + baseline-ordering candidate를 active baseline과 직접 맞붙여 최종 adoption gate를 수행합니다.
- paired noisy match + throughput + explicit search-cost(depth/exact)를 묶어 runtime 교체 여부를 한 번에 판정합니다.
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












function decideFinalAdoption({ searchCost, throughput, primaryPair, allPairs, sanityPair }) {
  const exactSafe = Number(searchCost.exact.sameScoreRate ?? 0) >= 1;
  const depthSafe = Number(searchCost.depth.sameBestRate ?? 0) >= 0.9;
  const primarySafe = Number(primaryPair.weightedPointGap ?? 0) >= -0.02 && Number(primaryPair.worstPointGap ?? 0) >= -0.10;
  const allPairsSafe = Number(allPairs.weightedPointGap ?? 0) >= -0.02 && Number(allPairs.worstPointGap ?? 0) >= -0.10;
  const sanitySafe = Number(sanityPair.weightedPointGap ?? 0) >= -0.05;
  const searchCostGain = Number(searchCost.combined.nodeDeltaPercent ?? 0) <= -1.0 || Number(searchCost.combined.elapsedDeltaPercent ?? 0) <= -2.0;
  const throughputGain = Number(throughput.weightedNodesPerMsGainVsBaseline ?? 0) >= 0.05;

  if (exactSafe && depthSafe && primarySafe && allPairsSafe && sanitySafe && (searchCostGain || throughputGain)) {
    return {
      action: 'adopt-compact-tuple-runtime-switch',
      selectedVariant: 'diagonal-top24-latea-endgame-baseline-ordering',
      keepActiveBaseline: false,
      rationale: 'Stage 145 compatible ordering까지 반영한 diagonal compact-tuple candidate가 exact safety를 유지했고 paired self-play에서도 유의미한 열세를 보이지 않으면서 search-cost/throughput 효율 개선을 함께 보여 최종 runtime 교체 후보로 채택합니다.',
      nextAction: 'prepare-runtime-install-and-post-adoption-validation',
    };
  }

  if (exactSafe && primarySafe && sanitySafe) {
    return {
      action: 'hold-active-keep-stage146-candidate-ready',
      selectedVariant: 'active',
      keepActiveBaseline: true,
      rationale: 'candidate가 안전성은 유지했지만 adoption switch를 정당화할 만큼의 margin이 아직 충분하지 않아 active baseline을 유지합니다. 다만 post-adoption candidate로는 보존합니다.',
      nextAction: 'retain-candidate-for-future-retest',
    };
  }

  return {
    action: 'reject-compact-tuple-runtime-switch',
    selectedVariant: 'active',
    keepActiveBaseline: true,
    rationale: 'candidate가 final adoption gate에서 paired self-play 또는 search-safety 기준을 충분히 통과하지 못해 active baseline을 유지합니다.',
    nextAction: 'keep-active-baseline',
  };
}

function buildNotes({ summary }) {
  const lines = [];
  lines.push('# Stage 146 final compact tuple adoption gate notes');
  lines.push('');
  lines.push(`Final action: **${summary.finalDecision.action}**`);
  lines.push(`Selected variant: **${summary.finalDecision.selectedVariant}**`);
  lines.push('');
  lines.push('## Candidate');
  lines.push(`- baseline: ${summary.variants[0].label}`);
  lines.push(`- candidate: ${summary.variants[1].label}`);
  lines.push('');
  lines.push('## Search-cost');
  lines.push(`- depth same-best rate: ${(Number(summary.searchCost.depth.sameBestRate ?? 0) * 100).toFixed(1)}%`);
  lines.push(`- exact same-score rate: ${(Number(summary.searchCost.exact.sameScoreRate ?? 0) * 100).toFixed(1)}%`);
  lines.push(`- combined node delta: ${Number(summary.searchCost.combined.nodeDeltaPercent ?? 0).toFixed(3)}%`);
  lines.push(`- combined elapsed delta: ${Number(summary.searchCost.combined.elapsedDeltaPercent ?? 0).toFixed(3)}%`);
  lines.push('');
  lines.push('## Throughput');
  lines.push(`- candidate nodes/ms gain vs active: ${(Number(summary.throughput.primary.weightedNodesPerMsGainVsBaseline ?? 0) * 100).toFixed(2)}%`);
  lines.push(`- candidate move agreement vs active: ${(Number(summary.throughput.primary.weightedMoveAgreementVsBaseline ?? 0) * 100).toFixed(1)}%`);
  lines.push('');
  lines.push('## Paired self-play');
  lines.push(`- primary weighted point gap: ${Number(summary.headToHead.primary.weightedPointGap ?? 0).toFixed(3)} (worst ${Number(summary.headToHead.primary.worstPointGap ?? 0).toFixed(3)})`);
  lines.push(`- all-scenarios weighted point gap: ${Number(summary.headToHead.all.weightedPointGap ?? 0).toFixed(3)} (worst ${Number(summary.headToHead.all.worstPointGap ?? 0).toFixed(3)})`);
  lines.push(`- sanity weighted point gap: ${Number(summary.headToHead.sanity.weightedPointGap ?? 0).toFixed(3)}`);
  lines.push('');
  lines.push('## Final decision');
  lines.push(`Action: ${summary.finalDecision.action}`);
  lines.push(`Rationale: ${summary.finalDecision.rationale}`);
  lines.push(`Next action: ${summary.finalDecision.nextAction}`);
  return `${lines.join('\n')}\n`;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outputDir = typeof args['output-dir'] === 'string' && args['output-dir'].trim() !== ''
  ? resolveCliPath(args['output-dir'])
  : resolveCliPath(DEFAULTS.outputDir);
const openingPlies = toFiniteInteger(args['opening-plies'], DEFAULTS.openingPlies, 0, 60);
const styleKey = typeof args['style-key'] === 'string' && args['style-key'].trim() !== '' ? args['style-key'].trim() : DEFAULTS.styleKey;
const smoke = Boolean(args.smoke);
const force = Boolean(args.force);
const pairScenarios = smoke ? [...PAIR_SCENARIOS_SMOKE] : [...PAIR_SCENARIOS];
const throughputScenarios = smoke ? [...THROUGHPUT_SCENARIOS_SMOKE] : [...THROUGHPUT_SCENARIOS];
const searchCostConfig = smoke ? SEARCH_COST_SMOKE : SEARCH_COST_DEFAULTS;

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
const [left, right] = VARIANTS;
const pairSlug = `${left.label}_vs_${right.label}`;
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

const depthOutputPath = path.join(outputDir, 'search-cost', 'active_vs_candidate.depth.json');
const exactOutputPath = path.join(outputDir, 'search-cost', 'active_vs_candidate.exact.json');
maybeRun(
  path.join(repoRoot, 'tools/evaluator-training/benchmark-depth-search-profile.mjs'),
  [
    '--baseline-generated-module', VARIANTS[0].generatedModule,
    '--candidate-generated-module', VARIANTS[1].generatedModule,
    '--output-json', depthOutputPath,
    '--search-algorithm', searchCostConfig.searchAlgorithm,
    '--empties', searchCostConfig.depthEmpties.join(','),
    '--seed-start', String(searchCostConfig.depthSeedStart),
    '--seed-count', String(searchCostConfig.depthSeedCount),
    '--repetitions', String(searchCostConfig.depthRepetitions),
    '--time-limit-ms', String(searchCostConfig.depthTimeLimitMs),
    '--max-depth', String(searchCostConfig.depthMaxDepth),
    '--exact-endgame-empties', String(searchCostConfig.depthExactEndgameEmpties),
  ],
  depthOutputPath,
  { cwd: repoRoot, force, logPath: path.join(logsDir, 'search-cost.depth.log') },
);
maybeRun(
  path.join(repoRoot, 'tools/evaluator-training/benchmark-exact-search-profile.mjs'),
  [
    '--baseline-generated-module', VARIANTS[0].generatedModule,
    '--candidate-generated-module', VARIANTS[1].generatedModule,
    '--output-json', exactOutputPath,
    '--search-algorithm', searchCostConfig.searchAlgorithm,
    '--empties', searchCostConfig.exactEmpties.join(','),
    '--seed-start', String(searchCostConfig.exactSeedStart),
    '--seed-count', String(searchCostConfig.exactSeedCount),
    '--repetitions', String(searchCostConfig.exactRepetitions),
    '--time-limit-ms', String(searchCostConfig.exactTimeLimitMs),
    '--max-depth', String(searchCostConfig.exactMaxDepth),
  ],
  exactOutputPath,
  { cwd: repoRoot, force, logPath: path.join(logsDir, 'search-cost.exact.log') },
);

const throughputPrimary = summarizeThroughputVariant(
  throughputResults.filter((result) => result.family === 'primary').flatMap((result) => result.summary.timeBuckets ?? []),
  VARIANTS[1].label,
  VARIANTS[0].label,
);
const throughputSanity = summarizeThroughputVariant(
  throughputResults.filter((result) => result.family === 'sanity').flatMap((result) => result.summary.timeBuckets ?? []),
  VARIANTS[1].label,
  VARIANTS[0].label,
);
const primaryHeadToHead = summarizeHeadToHead(pairResults, VARIANTS[0].label, VARIANTS[1].label, 'primary');
const sanityHeadToHead = summarizeHeadToHead(pairResults, VARIANTS[0].label, VARIANTS[1].label, 'sanity');
const allHeadToHead = summarizeHeadToHead(pairResults, VARIANTS[0].label, VARIANTS[1].label, null);

const depthSummary = summarizeDepth(readJson(depthOutputPath));
const exactSummary = summarizeExact(readJson(exactOutputPath));
const combinedSearchCost = summarizeCombinedSearchCost(depthSummary, exactSummary);
const searchCost = {
  depth: depthSummary,
  exact: exactSummary,
  combined: combinedSearchCost,
  searchAlgorithm: searchCostConfig.searchAlgorithm,
  depthOutputPath: relativePathFromCwd(depthOutputPath) ?? depthOutputPath,
  exactOutputPath: relativePathFromCwd(exactOutputPath) ?? exactOutputPath,
};
const finalDecision = decideFinalAdoption({ searchCost, throughput: throughputPrimary, primaryPair: primaryHeadToHead, allPairs: allHeadToHead, sanityPair: sanityHeadToHead });

const selectedVariantSpec = VARIANTS.find((variant) => variant.label === finalDecision.selectedVariant) ?? VARIANTS[0];
const selectedModule = await loadGeneratedProfilesModuleIfPresent(selectedVariantSpec.generatedModule);
const selectedModulePath = path.join(outputDir, 'selected-final-generated-module.js');
await writeGeneratedProfilesModule(selectedModulePath, {
  evaluationProfile: selectedModule?.evaluationProfile ?? null,
  moveOrderingProfile: selectedModule?.moveOrderingProfile ?? null,
  tupleResidualProfile: selectedModule?.tupleResidualProfile ?? null,
  mpcProfile: selectedModule?.mpcProfile ?? null,
});

const summary = {
  type: 'stage146-final-compact-tuple-adoption-gate',
  generatedAt: new Date().toISOString(),
  options: { outputDir: relativePathFromCwd(outputDir) ?? outputDir, openingPlies, styleKey, smoke, force },
  variants: VARIANTS,
  throughputResults: throughputResults.map((result) => ({ scenarioKey: result.scenarioKey, label: result.label, family: result.family, searchAlgorithm: result.searchAlgorithm, outputJsonPath: relativePathFromCwd(result.outputJsonPath) ?? result.outputJsonPath, reused: result.reused })),
  pairResults: pairResults.map((result) => ({ pairSlug: result.pairSlug, scenarioKey: result.scenarioKey, scenarioLabel: result.scenarioLabel, family: result.family, searchAlgorithm: result.searchAlgorithm, outputJsonPath: relativePathFromCwd(result.outputJsonPath) ?? result.outputJsonPath, reused: result.reused })),
  throughput: { primary: throughputPrimary, sanity: throughputSanity },
  headToHead: { primary: primaryHeadToHead, sanity: sanityHeadToHead, all: allHeadToHead },
  searchCost,
  finalDecision: {
    ...finalDecision,
    selectedGeneratedModulePath: relativePathFromCwd(selectedModulePath) ?? selectedModulePath,
  },
};

const summaryPath = path.join(outputDir, 'stage146_final_compact_tuple_adoption_summary.json');
const notesPath = path.join(outputDir, 'stage146_final_compact_tuple_adoption_notes.md');
writeJson(summaryPath, summary);
writeText(notesPath, buildNotes({ summary }));

console.log('Stage 146 final compact tuple adoption gate complete');
console.log(`- action: ${finalDecision.action}`);
console.log(`- selected variant: ${finalDecision.selectedVariant}`);
console.log(`- summary: ${relativePathFromCwd(summaryPath) ?? summaryPath}`);
