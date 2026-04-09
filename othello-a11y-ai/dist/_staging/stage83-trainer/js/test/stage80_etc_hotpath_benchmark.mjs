import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { playSeededRandomUntilEmptyCount, runMedianSearch, sumBy } from './benchmark-helpers.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_OUTPUT_PATH = path.join(PROJECT_ROOT, 'benchmarks', 'stage80_etc_hotpath_benchmark.json');

const DEPTH_LIMITED_SEEDS_20 = [11, 29, 47];
const SHARED_SEEDS_14 = [23, 37, 48, 60];
const WIDE_SEEDS_10 = [7, 13, 19, 25];

const DEPTH_LIMITED_OPTIONS = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 8,
  exactEndgameEmpties: 12,
  aspirationWindow: 0,
  timeLimitMs: 5000,
  randomness: 0,
  maxTableEntries: 320000,
});

const EXACT_14_OPTIONS = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 4,
  exactEndgameEmpties: 14,
  aspirationWindow: 0,
  timeLimitMs: 15000,
  randomness: 0,
  maxTableEntries: 400000,
  wldPreExactEmpties: 0,
});

const WLD_14_OPTIONS = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 8,
  exactEndgameEmpties: 12,
  aspirationWindow: 0,
  timeLimitMs: 3900,
  randomness: 0,
  maxTableEntries: 260000,
  wldPreExactEmpties: 2,
  enhancedTranspositionCutoff: true,
  enhancedTranspositionCutoffWld: true,
});

const EXACT_10_OPTIONS = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 4,
  exactEndgameEmpties: 10,
  aspirationWindow: 0,
  timeLimitMs: 10000,
  randomness: 0,
  maxTableEntries: 220000,
  wldPreExactEmpties: 0,
});

function withToggle(options, enabled) {
  return {
    ...options,
    etcInPlaceMovePreparation: enabled,
  };
}

function addStateMetadata(summary, state, seed) {
  return {
    ...summary,
    seed,
    currentPlayer: state.currentPlayer,
    empties: state.getEmptyCount(),
    legalMoves: state.getSearchMoves().length,
  };
}

function buildSummary(cases) {
  const baselineElapsedMs = sumBy(cases.map((entry) => entry.baseline), 'elapsedMs');
  const candidateElapsedMs = sumBy(cases.map((entry) => entry.candidate), 'elapsedMs');
  const baselineNodes = sumBy(cases.map((entry) => entry.baseline), 'nodes');
  const candidateNodes = sumBy(cases.map((entry) => entry.candidate), 'nodes');
  const baselineEtcNodes = sumBy(cases.map((entry) => entry.baseline), 'etcNodes');
  const candidateEtcNodes = sumBy(cases.map((entry) => entry.candidate), 'etcNodes');
  const baselineEtcChildTableHits = sumBy(cases.map((entry) => entry.baseline), 'etcChildTableHits');
  const candidateEtcChildTableHits = sumBy(cases.map((entry) => entry.candidate), 'etcChildTableHits');
  const baselineEtcCutoffs = sumBy(cases.map((entry) => entry.baseline), 'etcCutoffs');
  const candidateEtcCutoffs = sumBy(cases.map((entry) => entry.candidate), 'etcCutoffs');
  const baselineEtcExactNodes = sumBy(cases.map((entry) => entry.baseline), 'etcExactNodes');
  const candidateEtcExactNodes = sumBy(cases.map((entry) => entry.candidate), 'etcExactNodes');
  const baselineEtcWldNodes = sumBy(cases.map((entry) => entry.baseline), 'etcWldNodes');
  const candidateEtcWldNodes = sumBy(cases.map((entry) => entry.candidate), 'etcWldNodes');

  return {
    cases: cases.length,
    identicalBestMoves: cases.filter((entry) => entry.sameMove).length,
    identicalScores: cases.filter((entry) => entry.sameScore).length,
    identicalModes: cases.filter((entry) => entry.sameMode).length,
    baselineElapsedMs,
    candidateElapsedMs,
    elapsedRatioCandidateVsBaseline: baselineElapsedMs > 0 ? candidateElapsedMs / baselineElapsedMs : null,
    baselineNodes,
    candidateNodes,
    nodeRatioCandidateVsBaseline: baselineNodes > 0 ? candidateNodes / baselineNodes : null,
    baselineEtcNodes,
    candidateEtcNodes,
    baselineEtcChildTableHits,
    candidateEtcChildTableHits,
    baselineEtcCutoffs,
    candidateEtcCutoffs,
    baselineEtcExactNodes,
    candidateEtcExactNodes,
    baselineEtcWldNodes,
    candidateEtcWldNodes,
  };
}

function runSection({
  label,
  targetEmptyCount,
  seeds,
  baseOptions,
  repetitions = 1,
}) {
  const baselineOptions = withToggle(baseOptions, false);
  const candidateOptions = withToggle(baseOptions, true);
  const cases = [];

  for (const seed of seeds) {
    console.error(`[${label}] seed ${seed} state`);
    const state = playSeededRandomUntilEmptyCount(targetEmptyCount, seed);
    assert.equal(state.getEmptyCount(), targetEmptyCount, `${label}: seed ${seed} should reach ${targetEmptyCount} empties.`);

    console.error(`[${label}] seed ${seed} baseline`);
    const baselineRun = runMedianSearch(state, baselineOptions, repetitions);
    console.error(`[${label}] seed ${seed} candidate`);
    const candidateRun = runMedianSearch(state, candidateOptions, repetitions);

    const baseline = addStateMetadata(baselineRun.summary, state, seed);
    const candidate = addStateMetadata(candidateRun.summary, state, seed);

    cases.push({
      seed,
      currentPlayer: state.currentPlayer,
      empties: state.getEmptyCount(),
      legalMoves: state.getSearchMoves().length,
      baseline,
      candidate,
      sameMove: baseline.bestMove === candidate.bestMove,
      sameScore: baseline.score === candidate.score,
      sameMode: baseline.mode === candidate.mode,
      baselineSamples: baselineRun.samples,
      candidateSamples: candidateRun.samples,
    });
  }

  return {
    label,
    targetEmptyCount,
    seeds,
    options: {
      baseline: baselineOptions,
      candidate: candidateOptions,
    },
    summary: buildSummary(cases),
    cases,
  };
}

async function main() {
  const outputPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_OUTPUT_PATH;

  const depthLimitedSection = runSection({
    label: 'depth_limited_20empties_d8',
    targetEmptyCount: 20,
    seeds: DEPTH_LIMITED_SEEDS_20,
    baseOptions: DEPTH_LIMITED_OPTIONS,
    repetitions: 3,
  });

  const wld14Section = runSection({
    label: 'wld_bucket_14empties',
    targetEmptyCount: 14,
    seeds: SHARED_SEEDS_14,
    baseOptions: WLD_14_OPTIONS,
    repetitions: 1,
  });

  const exact14Section = runSection({
    label: 'exact_bucket_14empties',
    targetEmptyCount: 14,
    seeds: SHARED_SEEDS_14,
    baseOptions: EXACT_14_OPTIONS,
    repetitions: 1,
  });

  const exact10WideSection = runSection({
    label: 'exact_bucket_10empties_wide',
    targetEmptyCount: 10,
    seeds: WIDE_SEEDS_10,
    baseOptions: EXACT_10_OPTIONS,
    repetitions: 1,
  });

  const output = {
    benchmark: 'Stage 80 ETC hotpath cleanup benchmark',
    description: 'Compare the legacy ETC move-clone path against an in-place prepared-move path that reuses the original move array and only preserves engine-agnostic ordering outcomes.',
    depthLimitedSection,
    wld14Section,
    exact14Section,
    exact10WideSection,
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    outputPath,
    depthLimited: depthLimitedSection.summary,
    wld14: wld14Section.summary,
    exact14: exact14Section.summary,
    exact10Wide: exact10WideSection.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
