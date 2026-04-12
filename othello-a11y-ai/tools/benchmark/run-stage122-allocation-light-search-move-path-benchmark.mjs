import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import { listPreparedSearchMoves } from '../../js/core/rules.js';
import {
  createSeededRandom,
  playSeededRandomUntilEmptyCount,
  runMedianSearch,
  sumBy,
} from '../../js/test/benchmark-helpers.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const DEFAULT_OUTPUT_PATH = path.join(
  repoRoot,
  'benchmarks',
  'stage122_allocation_light_search_move_path_benchmark_20260412.json',
);

const DEPTH_LIMITED_SEEDS_20 = [11, 29, 47];
const SHARED_SEEDS_14 = [23, 37, 48, 60];
const SHARED_SEEDS_10 = [7, 13, 19, 25];
const MICRO_EMPTIES = [24, 22, 20, 18, 16, 14, 12, 10];
const MICRO_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
const MICRO_REPETITIONS = 2500;

const DEPTH_LIMITED_OPTIONS = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 8,
  exactEndgameEmpties: 12,
  aspirationWindow: 0,
  timeLimitMs: 4000,
  randomness: 0,
  maxTableEntries: 300000,
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

function withToggle(options, enabled) {
  return {
    ...options,
    allocationLightSearchMoves: enabled,
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

  return {
    cases: cases.length,
    identicalBestMoves: cases.filter((entry) => entry.sameMove).length,
    identicalScores: cases.filter((entry) => entry.sameScore).length,
    identicalModes: cases.filter((entry) => entry.sameMode).length,
    identicalNodes: cases.filter((entry) => entry.sameNodes).length,
    baselineElapsedMs,
    candidateElapsedMs,
    elapsedRatioCandidateVsBaseline: baselineElapsedMs > 0 ? candidateElapsedMs / baselineElapsedMs : null,
    baselineNodes,
    candidateNodes,
    nodeRatioCandidateVsBaseline: baselineNodes > 0 ? candidateNodes / baselineNodes : null,
  };
}

function buildMicroCorpus() {
  const corpus = [];
  for (const empties of MICRO_EMPTIES) {
    for (const seed of MICRO_SEEDS) {
      const state = playSeededRandomUntilEmptyCount(empties, seed);
      assert.equal(state.getEmptyCount(), empties, `Micro corpus seed ${seed} should reach ${empties} empties.`);
      corpus.push({ state, empties, seed });
    }
  }
  return corpus;
}

function runMoveGenerationMicroSection() {
  const corpus = buildMicroCorpus();

  const runBuilder = (label, builder) => {
    let totalMoveRecords = 0;
    const startedAt = performance.now();
    for (let repetition = 0; repetition < MICRO_REPETITIONS; repetition += 1) {
      for (const entry of corpus) {
        const { player, opponent } = entry.state.getPlayerBoards();
        const moves = builder(entry.state, player, opponent);
        totalMoveRecords += moves.length;
      }
    }
    return {
      label,
      elapsedMs: Number((performance.now() - startedAt).toFixed(3)),
      totalMoveRecords,
    };
  };

  const baseline = runBuilder('baseline', (state) => state.getSearchMoves());
  const candidate = runBuilder('candidate', (state, player, opponent) => listPreparedSearchMoves(player, opponent));

  return {
    corpusStateCount: corpus.length,
    repetitions: MICRO_REPETITIONS,
    empties: MICRO_EMPTIES,
    seeds: MICRO_SEEDS,
    baseline,
    candidate,
    elapsedRatioCandidateVsBaseline: baseline.elapsedMs > 0 ? candidate.elapsedMs / baseline.elapsedMs : null,
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
      sameNodes: baseline.nodes === candidate.nodes,
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
  const args = parseArgs(process.argv.slice(2));

  const moveGenerationMicroSection = runMoveGenerationMicroSection();

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

  const exact10Section = runSection({
    label: 'exact_bucket_10empties',
    targetEmptyCount: 10,
    seeds: SHARED_SEEDS_10,
    baseOptions: EXACT_10_OPTIONS,
    repetitions: 1,
  });

  const output = {
    benchmark: 'Stage 122 allocation-light search move path benchmark',
    description: 'Compare the legacy generic search move record builder against a dedicated prepared search move path with fixed-shape ordering metadata and inline flip-count accumulation.',
    moveGenerationMicroSection,
    depthLimitedSection,
    wld14Section,
    exact14Section,
    exact10Section,
  };

  await fs.mkdir(path.dirname(args.output), { recursive: true });
  await fs.writeFile(args.output, `${JSON.stringify(output, null, 2)}
`, 'utf8');
  console.log(JSON.stringify({
    outputPath: args.output,
    moveGenerationMicro: moveGenerationMicroSection,
    depthLimited: depthLimitedSection.summary,
    wld14: wld14Section.summary,
    exact14: exact14Section.summary,
    exact10: exact10Section.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
