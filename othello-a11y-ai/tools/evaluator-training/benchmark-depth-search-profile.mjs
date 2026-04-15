#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_EVALUATION_PROFILE } from '../../js/ai/evaluation-profiles.js';
import {
  DEFAULT_SEARCH_ALGORITHM,
  describeSearchAlgorithm,
  normalizeSearchAlgorithm,
} from '../../js/ai/search-algorithms.js';
import {
  playSeededRandomUntilEmptyCount,
  runMedianSearch,
} from '../../js/test/benchmark-helpers.mjs';
import {
  displayGeneratedProfilesModulePath,
  displayProjectPath,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  formatInteger,
  loadGeneratedProfilesModuleIfPresent,
  loadJsonFileIfPresent,
  parseArgs,
  resolveCliPath,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('benchmark-depth-search-profile.mjs');
  const evaluationProfilePath = displayTrainingOutputPath('trained-evaluation-profile.json');
  const moveOrderingPath = displayTrainingOutputPath('trained-move-ordering-profile.json');
  const tupleProfilePath = displayTrainingOutputPath('trained-tuple-residual-profile.json');
  const outputJsonPath = displayProjectPath('benchmarks', 'stage29_depth_profile_benchmark.json');
  const generatedModulePath = displayGeneratedProfilesModulePath();
  console.log(`Usage:
  node ${toolPath} \
    [--baseline-profile ${evaluationProfilePath}] \
    [--candidate-profile ${evaluationProfilePath}] \
    [--baseline-generated-module ${generatedModulePath}] \
    [--candidate-generated-module ${generatedModulePath}] \
    [--baseline-move-ordering-profile ${moveOrderingPath}] \
    [--candidate-move-ordering-profile ${moveOrderingPath}] \
    [--baseline-tuple-profile ${tupleProfilePath}] \
    [--candidate-tuple-profile ${tupleProfilePath}] \
    [--baseline-mpc-profile ${displayTrainingOutputPath('trained-mpc-profile.json')}] \
    [--candidate-mpc-profile ${displayTrainingOutputPath('trained-mpc-profile.json')}] \
    [--output-json ${outputJsonPath}] \
    [--empties 18,20,24] [--seed-start 1] [--seed-count 8] [--repetitions 1] \
    [--time-limit-ms 2000] [--max-depth 6] [--exact-endgame-empties 10] \
    [--search-algorithm classic-mtdf-2ply]

최소한 candidate evaluator / candidate move-ordering / candidate tuple / candidate MPC / candidate generated module 중 하나는 지정해야 합니다.
지정하지 않은 쪽은 baseline 값을 그대로 사용합니다.
기본값으로 tuple residual은 baseline/candidate 모두 비활성(null)입니다.
generated module을 지정하면 evaluation / move-ordering / tuple residual / MPC를 함께 불러오고, 개별 JSON 인자는 해당 slot만 덮어씁니다.
`);
}

function toFiniteInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function parseEmptiesList(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [18, 20, 24];
  }
  return value
    .split(',')
    .map((token) => Number(token.trim()))
    .filter((token) => Number.isInteger(token) && token >= 1 && token <= 40)
    .sort((left, right) => right - left);
}

function createSearchOptions({
  evaluationProfile,
  moveOrderingProfile,
  tupleResidualProfile,
  mpcProfile,
  timeLimitMs,
  maxDepth,
  exactEndgameEmpties,
  searchAlgorithm,
}) {
  return {
    presetKey: 'custom',
    styleKey: 'balanced',
    maxDepth,
    timeLimitMs,
    exactEndgameEmpties,
    searchAlgorithm,
    aspirationWindow: 40,
    randomness: 0,
    evaluationProfile,
    moveOrderingProfile,
    tupleResidualProfile,
    mpcProfile,
    wldPreExactEmpties: 0,
  };
}

function percentageDelta(base, candidate) {
  if (!Number.isFinite(base) || base === 0 || !Number.isFinite(candidate)) {
    return null;
  }
  return ((candidate - base) / base) * 100;
}

function ratioText(base, candidate) {
  if (!Number.isFinite(base) || base === 0 || !Number.isFinite(candidate)) {
    return 'n/a';
  }
  return `${((candidate / base) * 100).toFixed(1)}%`;
}

function createAggregate() {
  return {
    cases: 0,
    identicalBestMoveCases: 0,
    baselineNodes: 0,
    candidateNodes: 0,
    baselineElapsedMs: 0,
    candidateElapsedMs: 0,
    baselineTtHits: 0,
    candidateTtHits: 0,
  };
}

function updateAggregate(aggregate, baseline, candidate) {
  aggregate.cases += 1;
  aggregate.identicalBestMoveCases += baseline.bestMove === candidate.bestMove ? 1 : 0;
  aggregate.baselineNodes += Number(baseline.nodes ?? 0);
  aggregate.candidateNodes += Number(candidate.nodes ?? 0);
  aggregate.baselineElapsedMs += Number(baseline.elapsedMs ?? 0);
  aggregate.candidateElapsedMs += Number(candidate.elapsedMs ?? 0);
  aggregate.baselineTtHits += Number(baseline.ttHits ?? 0);
  aggregate.candidateTtHits += Number(candidate.ttHits ?? 0);
}

function finalizeAggregate(aggregate) {
  return {
    ...aggregate,
    nodeDeltaPercent: percentageDelta(aggregate.baselineNodes, aggregate.candidateNodes),
    elapsedDeltaPercent: percentageDelta(aggregate.baselineElapsedMs, aggregate.candidateElapsedMs),
    ttHitDeltaPercent: percentageDelta(aggregate.baselineTtHits, aggregate.candidateTtHits),
  };
}

const args = parseArgs(process.argv.slice(2));
if (
  args.help
  || args.h
  || (!args['candidate-profile'] && !args['candidate-generated-module'] && !args['candidate-move-ordering-profile'] && !args['candidate-tuple-profile'] && !args['candidate-mpc-profile'])
) {
  printUsage();
  process.exit(args.help || args.h ? 0 : 1);
}

const baselineProfilePath = args['baseline-profile'] ? resolveCliPath(args['baseline-profile']) : null;
const candidateProfilePath = args['candidate-profile'] ? resolveCliPath(args['candidate-profile']) : null;
const baselineGeneratedModulePath = args['baseline-generated-module'] ? resolveCliPath(args['baseline-generated-module']) : null;
const candidateGeneratedModulePath = args['candidate-generated-module'] ? resolveCliPath(args['candidate-generated-module']) : null;
const baselineMoveOrderingProfilePath = args['baseline-move-ordering-profile'] ? resolveCliPath(args['baseline-move-ordering-profile']) : null;
const candidateMoveOrderingProfilePath = args['candidate-move-ordering-profile'] ? resolveCliPath(args['candidate-move-ordering-profile']) : null;
const baselineTupleProfilePath = args['baseline-tuple-profile'] ? resolveCliPath(args['baseline-tuple-profile']) : null;
const candidateTupleProfilePath = args['candidate-tuple-profile'] ? resolveCliPath(args['candidate-tuple-profile']) : null;
const baselineMpcProfilePath = args['baseline-mpc-profile'] ? resolveCliPath(args['baseline-mpc-profile']) : null;
const candidateMpcProfilePath = args['candidate-mpc-profile'] ? resolveCliPath(args['candidate-mpc-profile']) : null;

const baselineGeneratedModule = await loadGeneratedProfilesModuleIfPresent(baselineGeneratedModulePath);
const candidateGeneratedModule = await loadGeneratedProfilesModuleIfPresent(candidateGeneratedModulePath);

const baselineProfile = loadJsonFileIfPresent(baselineProfilePath) ?? baselineGeneratedModule?.evaluationProfile ?? DEFAULT_EVALUATION_PROFILE;
const candidateProfile = loadJsonFileIfPresent(candidateProfilePath) ?? candidateGeneratedModule?.evaluationProfile ?? baselineProfile;
const baselineMoveOrderingProfile = loadJsonFileIfPresent(baselineMoveOrderingProfilePath) ?? baselineGeneratedModule?.moveOrderingProfile ?? null;
const candidateMoveOrderingProfile = loadJsonFileIfPresent(candidateMoveOrderingProfilePath) ?? candidateGeneratedModule?.moveOrderingProfile ?? baselineMoveOrderingProfile;
const baselineTupleProfile = loadJsonFileIfPresent(baselineTupleProfilePath) ?? baselineGeneratedModule?.tupleResidualProfile ?? null;
const candidateTupleProfile = loadJsonFileIfPresent(candidateTupleProfilePath) ?? candidateGeneratedModule?.tupleResidualProfile ?? baselineTupleProfile;
const baselineMpcProfile = loadJsonFileIfPresent(baselineMpcProfilePath) ?? baselineGeneratedModule?.mpcProfile ?? null;
const candidateMpcProfile = loadJsonFileIfPresent(candidateMpcProfilePath) ?? candidateGeneratedModule?.mpcProfile ?? baselineMpcProfile;

const emptiesList = parseEmptiesList(args.empties);
const seedStart = Math.max(1, toFiniteInteger(args['seed-start'], 1));
const seedCount = Math.max(1, toFiniteInteger(args['seed-count'], 8));
const repetitions = Math.max(1, toFiniteInteger(args.repetitions, 1));
const timeLimitMs = Math.max(50, toFiniteInteger(args['time-limit-ms'], 2000));
const maxDepth = Math.max(1, toFiniteInteger(args['max-depth'], 6));
const exactEndgameEmpties = Math.max(0, toFiniteInteger(args['exact-endgame-empties'], 10));
const searchAlgorithm = normalizeSearchAlgorithm(
  typeof args['search-algorithm'] === 'string' && args['search-algorithm'].trim() !== ''
    ? args['search-algorithm'].trim()
    : DEFAULT_SEARCH_ALGORITHM,
);
const searchAlgorithmLabel = describeSearchAlgorithm(searchAlgorithm)?.label ?? searchAlgorithm;
const outputJsonPath = args['output-json'] ? resolveCliPath(args['output-json']) : null;

const overall = createAggregate();
const byEmpties = [];
const cases = [];

console.log(`Baseline evaluator      : ${baselineProfile.name ?? path.basename(baselineProfilePath ?? 'default-eval')}`);
console.log(`Candidate evaluator     : ${candidateProfile.name ?? path.basename(candidateProfilePath ?? 'candidate-eval')}`);
console.log(`Baseline move-ordering  : ${baselineMoveOrderingProfile?.name ?? 'default late ordering'}`);
console.log(`Candidate move-ordering : ${candidateMoveOrderingProfile?.name ?? 'default late ordering'}`);
console.log(`Baseline tuple residual : ${baselineTupleProfile?.name ?? 'none'}`);
console.log(`Candidate tuple residual: ${candidateTupleProfile?.name ?? 'none'}`);
console.log(`Baseline MPC profile    : ${baselineMpcProfile?.name ?? 'none'}`);
console.log(`Candidate MPC profile   : ${candidateMpcProfile?.name ?? 'none'}`);
console.log(`Search algorithm        : ${searchAlgorithm} (${searchAlgorithmLabel})`);
console.log(`Benchmark empties: ${emptiesList.join(', ')} | seeds: ${seedStart}..${seedStart + seedCount - 1} | repetitions=${repetitions}`);

for (const empties of emptiesList) {
  const bucketAggregate = createAggregate();
  console.log(`\n[empties ${empties}]`);

  for (let seed = seedStart; seed < (seedStart + seedCount); seed += 1) {
    const state = playSeededRandomUntilEmptyCount(empties, seed);
    const baseline = runMedianSearch(
      state,
      createSearchOptions({
        evaluationProfile: baselineProfile,
        moveOrderingProfile: baselineMoveOrderingProfile,
        tupleResidualProfile: baselineTupleProfile ?? null,
        mpcProfile: baselineMpcProfile ?? null,
        timeLimitMs,
        maxDepth,
        exactEndgameEmpties,
        searchAlgorithm,
      }),
      repetitions,
    ).summary;
    const candidate = runMedianSearch(
      state,
      createSearchOptions({
        evaluationProfile: candidateProfile,
        moveOrderingProfile: candidateMoveOrderingProfile,
        tupleResidualProfile: candidateTupleProfile ?? null,
        mpcProfile: candidateMpcProfile ?? null,
        timeLimitMs,
        maxDepth,
        exactEndgameEmpties,
        searchAlgorithm,
      }),
      repetitions,
    ).summary;

    updateAggregate(bucketAggregate, baseline, candidate);
    updateAggregate(overall, baseline, candidate);

    const caseSummary = {
      empties,
      seed,
      baseline,
      candidate,
      nodeDeltaPercent: percentageDelta(Number(baseline.nodes ?? 0), Number(candidate.nodes ?? 0)),
      elapsedDeltaPercent: percentageDelta(Number(baseline.elapsedMs ?? 0), Number(candidate.elapsedMs ?? 0)),
    };
    cases.push(caseSummary);

    const moveMarker = baseline.bestMove === candidate.bestMove ? '=' : '!';
    console.log(
      `seed=${String(seed).padStart(2, '0')} score=${baseline.score} ${moveMarker} `
      + `nodes ${formatInteger(baseline.nodes)} -> ${formatInteger(candidate.nodes)} (${ratioText(Number(baseline.nodes), Number(candidate.nodes))}) `
      + `time ${formatInteger(baseline.elapsedMs)}ms -> ${formatInteger(candidate.elapsedMs)}ms (${ratioText(Number(baseline.elapsedMs), Number(candidate.elapsedMs))})`,
    );
  }

  byEmpties.push({
    empties,
    ...finalizeAggregate(bucketAggregate),
  });
}

const summary = {
  generatedAt: new Date().toISOString(),
  baselineEvaluationProfileName: baselineProfile.name ?? null,
  candidateEvaluationProfileName: candidateProfile.name ?? null,
  baselineMoveOrderingProfileName: baselineMoveOrderingProfile?.name ?? null,
  candidateMoveOrderingProfileName: candidateMoveOrderingProfile?.name ?? null,
  baselineTupleResidualProfileName: baselineTupleProfile?.name ?? null,
  candidateTupleResidualProfileName: candidateTupleProfile?.name ?? null,
  baselineMpcProfileName: baselineMpcProfile?.name ?? null,
  candidateMpcProfileName: candidateMpcProfile?.name ?? null,
  searchAlgorithm,
  searchAlgorithmLabel,
  options: {
    emptiesList,
    seedStart,
    seedCount,
    repetitions,
    timeLimitMs,
    maxDepth,
    exactEndgameEmpties,
    searchAlgorithm,
    searchAlgorithmLabel,
    baselineGeneratedModulePath,
    candidateGeneratedModulePath,
  },
  overall: finalizeAggregate(overall),
  byEmpties,
  cases,
};

console.log('\n[overall]');
console.log(`cases=${summary.overall.cases}, same best move=${summary.overall.identicalBestMoveCases}/${summary.overall.cases}`);
console.log(`nodes: ${formatInteger(summary.overall.baselineNodes)} -> ${formatInteger(summary.overall.candidateNodes)} (${ratioText(summary.overall.baselineNodes, summary.overall.candidateNodes)})`);
console.log(`time : ${formatInteger(summary.overall.baselineElapsedMs)}ms -> ${formatInteger(summary.overall.candidateElapsedMs)}ms (${ratioText(summary.overall.baselineElapsedMs, summary.overall.candidateElapsedMs)})`);

if (outputJsonPath) {
  await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
  await fs.promises.writeFile(outputJsonPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`Saved benchmark summary to ${outputJsonPath}`);
}
