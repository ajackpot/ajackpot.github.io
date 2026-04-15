#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  loadGeneratedProfilesModuleIfPresent,
  parseArgs,
  relativePathFromCwd,
  resolveCliPath,
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

const DEFAULTS = Object.freeze({
  outputDir: 'benchmarks/stage147',
  activeModule: 'js/ai/learned-eval-profile.generated.js',
  selectedModule: 'benchmarks/stage146/selected-final-generated-module.js',
  archiveModule: 'tools/engine-match/fixtures/historical-installed-modules/active-precompact-tuple.learned-eval-profile.generated.js',
  installedSnapshotModule: 'benchmarks/stage147/installed-active-generated-module.js',
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
  node tools/engine-match/run-stage147-runtime-install-and-post-adoption-validation.mjs \
    [--output-dir benchmarks/stage147] \
    [--active-module js/ai/learned-eval-profile.generated.js] \
    [--selected-module benchmarks/stage146/selected-final-generated-module.js] \
    [--archive-module tools/engine-match/fixtures/historical-installed-modules/active-precompact-tuple.learned-eval-profile.generated.js] \
    [--installed-snapshot-module benchmarks/stage147/installed-active-generated-module.js] \
    [--opening-plies 20] [--style-key balanced] [--smoke] [--force]

설명:
- Stage 146에서 선택된 final generated module을 active runtime에 실제 설치합니다.
- 설치 직전 active module은 historical-installed-modules 아래에 보관합니다.
- 설치 뒤에는 archived previous-active 대비 paired self-play / throughput / explicit search-cost(depth/exact)로 post-adoption validation을 수행합니다.
- validation 실패 시 active module은 archived previous-active로 되돌립니다.
`);
}

function toFiniteInteger(value, fallback, minimum = Number.NEGATIVE_INFINITY, maximum = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
}




function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}









function decidePostAdoptionValidation({ parity, searchCost, throughput, primaryPair, allPairs, sanityPair }) {
  const exactSafe = Number(searchCost.exact.sameScoreRate ?? 0) >= 1;
  const depthSafe = Number(searchCost.depth.sameBestRate ?? 0) >= 0.9;
  const primarySafe = Number(primaryPair.weightedPointGap ?? 0) >= -0.02 && Number(primaryPair.worstPointGap ?? 0) >= -0.10;
  const allPairsSafe = Number(allPairs.weightedPointGap ?? 0) >= -0.02 && Number(allPairs.worstPointGap ?? 0) >= -0.10;
  const sanitySafe = Number(sanityPair.weightedPointGap ?? 0) >= -0.05;
  const searchCostGain = Number(searchCost.combined.nodeDeltaPercent ?? 0) <= -1.0 || Number(searchCost.combined.elapsedDeltaPercent ?? 0) <= -2.0;
  const throughputGain = Number(throughput.weightedNodesPerMsGainVsBaseline ?? 0) >= 0.05;
  const paritySafe = Boolean(parity.installedMatchesSelected) && Boolean(parity.snapshotMatchesInstalled);

  if (paritySafe && exactSafe && depthSafe && primarySafe && allPairsSafe && sanitySafe && (searchCostGain || throughputGain)) {
    return {
      action: 'confirm-active-runtime-switch-installed',
      keepInstalled: true,
      rollbackRequired: false,
      rationale: '설치된 active runtime이 Stage 146 selected module과 byte-level parity를 유지했고, archived previous-active 대비 paired self-play / throughput / explicit search-cost post-adoption validation도 최종 adoption gate와 같은 방향으로 통과했습니다.',
      nextAction: 'treat-diagonal-compact-tuple-stack-as-active-default',
    };
  }

  return {
    action: 'rollback-active-runtime-switch',
    keepInstalled: false,
    rollbackRequired: true,
    rationale: '설치 후 parity 또는 post-adoption validation이 기대 기준을 통과하지 못해 archived previous-active로 복원합니다.',
    nextAction: 'restore-previous-active-and-investigate-regression',
  };
}

function buildNotes({ summary }) {
  const lines = [];
  lines.push('# Stage 147 runtime install and post-adoption validation notes');
  lines.push('');
  lines.push(`Final action: **${summary.finalDecision.action}**`);
  lines.push(`Rollback performed: **${summary.installation.rollbackPerformed ? 'yes' : 'no'}**`);
  lines.push('');
  lines.push('## Installation');
  lines.push(`- install performed: ${summary.installation.installPerformed ? 'yes' : 'no'}`);
  lines.push(`- archive created: ${summary.installation.archiveCreated ? 'yes' : 'no'}`);
  lines.push(`- installed matches selected: ${summary.parity.installedMatchesSelected ? 'yes' : 'no'}`);
  lines.push(`- snapshot matches installed: ${summary.parity.snapshotMatchesInstalled ? 'yes' : 'no'}`);
  lines.push('');
  lines.push('## Active runtime after install');
  lines.push(`- evaluation: ${summary.activeRuntime.evaluationProfileName}`);
  lines.push(`- move-ordering: ${summary.activeRuntime.moveOrderingProfileName}`);
  lines.push(`- tuple residual: ${summary.activeRuntime.tupleResidualProfileName}`);
  lines.push(`- MPC: ${summary.activeRuntime.mpcProfileName}`);
  lines.push('');
  lines.push('## Search-cost');
  lines.push(`- depth same-best rate: ${(Number(summary.searchCost.depth.sameBestRate ?? 0) * 100).toFixed(1)}%`);
  lines.push(`- exact same-score rate: ${(Number(summary.searchCost.exact.sameScoreRate ?? 0) * 100).toFixed(1)}%`);
  lines.push(`- combined node delta vs previous active: ${Number(summary.searchCost.combined.nodeDeltaPercent ?? 0).toFixed(3)}%`);
  lines.push(`- combined elapsed delta vs previous active: ${Number(summary.searchCost.combined.elapsedDeltaPercent ?? 0).toFixed(3)}%`);
  lines.push('');
  lines.push('## Throughput');
  lines.push(`- installed nodes/ms gain vs previous active: ${(Number(summary.throughput.primary.weightedNodesPerMsGainVsBaseline ?? 0) * 100).toFixed(2)}%`);
  lines.push(`- installed move agreement vs previous active: ${(Number(summary.throughput.primary.weightedMoveAgreementVsBaseline ?? 0) * 100).toFixed(1)}%`);
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
const activeModulePath = typeof args['active-module'] === 'string' && args['active-module'].trim() !== ''
  ? resolveCliPath(args['active-module'])
  : resolveCliPath(DEFAULTS.activeModule);
const selectedModulePath = typeof args['selected-module'] === 'string' && args['selected-module'].trim() !== ''
  ? resolveCliPath(args['selected-module'])
  : resolveCliPath(DEFAULTS.selectedModule);
const archiveModulePath = typeof args['archive-module'] === 'string' && args['archive-module'].trim() !== ''
  ? resolveCliPath(args['archive-module'])
  : resolveCliPath(DEFAULTS.archiveModule);
const installedSnapshotModulePath = typeof args['installed-snapshot-module'] === 'string' && args['installed-snapshot-module'].trim() !== ''
  ? resolveCliPath(args['installed-snapshot-module'])
  : resolveCliPath(DEFAULTS.installedSnapshotModule);
const openingPlies = toFiniteInteger(args['opening-plies'], DEFAULTS.openingPlies, 0, 60);
const styleKey = typeof args['style-key'] === 'string' && args['style-key'].trim() !== '' ? args['style-key'].trim() : DEFAULTS.styleKey;
const smoke = Boolean(args.smoke);
const force = Boolean(args.force);
const pairScenarios = smoke ? [...PAIR_SCENARIOS_SMOKE] : [...PAIR_SCENARIOS];
const throughputScenarios = smoke ? [...THROUGHPUT_SCENARIOS_SMOKE] : [...THROUGHPUT_SCENARIOS];
const searchCostConfig = smoke ? SEARCH_COST_SMOKE : SEARCH_COST_DEFAULTS;

if (!fs.existsSync(activeModulePath)) {
  throw new Error(`Active generated module not found: ${activeModulePath}`);
}
if (!fs.existsSync(selectedModulePath)) {
  throw new Error(`Selected generated module not found: ${selectedModulePath}`);
}

fs.mkdirSync(outputDir, { recursive: true });
const logsDir = path.join(outputDir, 'logs');
const activeHashBefore = sha256File(activeModulePath);
const selectedHash = sha256File(selectedModulePath);
const activeAlreadySelected = activeHashBefore === selectedHash;
const archiveExists = fs.existsSync(archiveModulePath);

if (!archiveExists && activeAlreadySelected) {
  throw new Error(`Archive module is missing, but active module already matches selected module. Cannot reconstruct previous-active baseline automatically: ${archiveModulePath}`);
}

let archiveCreated = false;
let archiveOverwritten = false;
if (!archiveExists || (force && !activeAlreadySelected)) {
  fs.mkdirSync(path.dirname(archiveModulePath), { recursive: true });
  fs.copyFileSync(activeModulePath, archiveModulePath);
  archiveCreated = !archiveExists;
  archiveOverwritten = archiveExists && !activeAlreadySelected;
}

const archiveHash = sha256File(archiveModulePath);
let installPerformed = false;
if (!activeAlreadySelected || force) {
  fs.copyFileSync(selectedModulePath, activeModulePath);
  installPerformed = true;
}
fs.mkdirSync(path.dirname(installedSnapshotModulePath), { recursive: true });
fs.copyFileSync(activeModulePath, installedSnapshotModulePath);

const activeHashAfterInstall = sha256File(activeModulePath);
const installedSnapshotHash = sha256File(installedSnapshotModulePath);
const parity = {
  selectedModulePath: relativePathFromCwd(selectedModulePath) ?? selectedModulePath,
  activeModulePath: relativePathFromCwd(activeModulePath) ?? activeModulePath,
  archiveModulePath: relativePathFromCwd(archiveModulePath) ?? archiveModulePath,
  installedSnapshotModulePath: relativePathFromCwd(installedSnapshotModulePath) ?? installedSnapshotModulePath,
  selectedSha256: selectedHash,
  activeSha256BeforeInstall: activeHashBefore,
  archiveSha256: archiveHash,
  installedSha256: activeHashAfterInstall,
  installedSnapshotSha256: installedSnapshotHash,
  installedMatchesSelected: activeHashAfterInstall === selectedHash,
  snapshotMatchesInstalled: installedSnapshotHash === activeHashAfterInstall,
};

const previousActiveModule = await loadGeneratedProfilesModuleIfPresent(archiveModulePath);
const selectedModule = await loadGeneratedProfilesModuleIfPresent(selectedModulePath);
const installedSnapshotModule = await loadGeneratedProfilesModuleIfPresent(installedSnapshotModulePath);

const VARIANTS = Object.freeze([
  Object.freeze({ label: 'previous-active', role: 'baseline', generatedModule: archiveModulePath }),
  Object.freeze({ label: 'installed-active', role: 'candidate', generatedModule: activeModulePath }),
]);

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

const depthOutputPath = path.join(outputDir, 'search-cost', 'previous_vs_installed.depth.json');
const exactOutputPath = path.join(outputDir, 'search-cost', 'previous_vs_installed.exact.json');
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

const initialDecision = decidePostAdoptionValidation({
  parity,
  searchCost,
  throughput: throughputPrimary,
  primaryPair: primaryHeadToHead,
  allPairs: allHeadToHead,
  sanityPair: sanityHeadToHead,
});

let rollbackPerformed = false;
let activeSha256AfterFinalization = activeHashAfterInstall;
if (initialDecision.rollbackRequired) {
  fs.copyFileSync(archiveModulePath, activeModulePath);
  rollbackPerformed = true;
  activeSha256AfterFinalization = sha256File(activeModulePath);
}

const finalActiveModuleForSummary = initialDecision.rollbackRequired ? previousActiveModule : installedSnapshotModule;

const summary = {
  type: 'stage147-runtime-install-and-post-adoption-validation',
  generatedAt: new Date().toISOString(),
  options: {
    outputDir: relativePathFromCwd(outputDir) ?? outputDir,
    activeModule: relativePathFromCwd(activeModulePath) ?? activeModulePath,
    selectedModule: relativePathFromCwd(selectedModulePath) ?? selectedModulePath,
    archiveModule: relativePathFromCwd(archiveModulePath) ?? archiveModulePath,
    installedSnapshotModule: relativePathFromCwd(installedSnapshotModulePath) ?? installedSnapshotModulePath,
    openingPlies,
    styleKey,
    smoke,
    force,
  },
  installation: {
    archiveCreated,
    archiveOverwritten,
    installPerformed,
    rollbackPerformed,
    activeAlreadySelected,
    activeSha256AfterFinalization,
  },
  parity,
  variants: [
    { label: VARIANTS[0].label, role: VARIANTS[0].role, generatedModule: relativePathFromCwd(VARIANTS[0].generatedModule) ?? VARIANTS[0].generatedModule },
    { label: VARIANTS[1].label, role: VARIANTS[1].role, generatedModule: relativePathFromCwd(VARIANTS[1].generatedModule) ?? VARIANTS[1].generatedModule },
  ],
  activeRuntime: {
    evaluationProfileName: finalActiveModuleForSummary?.evaluationProfile?.name ?? null,
    moveOrderingProfileName: finalActiveModuleForSummary?.moveOrderingProfile?.name ?? null,
    tupleResidualProfileName: finalActiveModuleForSummary?.tupleResidualProfile?.name ?? null,
    mpcProfileName: finalActiveModuleForSummary?.mpcProfile?.name ?? null,
    evaluationStage: finalActiveModuleForSummary?.evaluationProfile?.stage?.number ?? null,
    moveOrderingStage: finalActiveModuleForSummary?.moveOrderingProfile?.stage?.number ?? null,
    tupleResidualStage: finalActiveModuleForSummary?.tupleResidualProfile?.stage?.number ?? null,
    mpcStage: finalActiveModuleForSummary?.mpcProfile?.stage?.number ?? null,
  },
  previousActive: {
    evaluationProfileName: previousActiveModule?.evaluationProfile?.name ?? null,
    moveOrderingProfileName: previousActiveModule?.moveOrderingProfile?.name ?? null,
    tupleResidualProfileName: previousActiveModule?.tupleResidualProfile?.name ?? null,
    mpcProfileName: previousActiveModule?.mpcProfile?.name ?? null,
  },
  selectedModule: {
    evaluationProfileName: selectedModule?.evaluationProfile?.name ?? null,
    moveOrderingProfileName: selectedModule?.moveOrderingProfile?.name ?? null,
    tupleResidualProfileName: selectedModule?.tupleResidualProfile?.name ?? null,
    mpcProfileName: selectedModule?.mpcProfile?.name ?? null,
  },
  throughputResults: throughputResults.map((result) => ({ scenarioKey: result.scenarioKey, label: result.label, family: result.family, searchAlgorithm: result.searchAlgorithm, outputJsonPath: relativePathFromCwd(result.outputJsonPath) ?? result.outputJsonPath, reused: result.reused })),
  pairResults: pairResults.map((result) => ({ pairSlug: result.pairSlug, scenarioKey: result.scenarioKey, scenarioLabel: result.scenarioLabel, family: result.family, searchAlgorithm: result.searchAlgorithm, outputJsonPath: relativePathFromCwd(result.outputJsonPath) ?? result.outputJsonPath, reused: result.reused })),
  throughput: { primary: throughputPrimary, sanity: throughputSanity },
  headToHead: { primary: primaryHeadToHead, sanity: sanityHeadToHead, all: allHeadToHead },
  searchCost,
  finalDecision: initialDecision,
};

const summaryPath = path.join(outputDir, 'stage147_runtime_install_post_adoption_validation_summary.json');
const notesPath = path.join(outputDir, 'stage147_runtime_install_post_adoption_validation_notes.md');
writeJson(summaryPath, summary);
writeText(notesPath, buildNotes({ summary }));

console.log('Stage 147 runtime install and post-adoption validation complete');
console.log(`- action: ${summary.finalDecision.action}`);
console.log(`- rollback: ${summary.installation.rollbackPerformed ? 'yes' : 'no'}`);
console.log(`- summary: ${relativePathFromCwd(summaryPath) ?? summaryPath}`);
