import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  playSeededRandomUntilEmptyCount,
  summarizeResult,
  sumBy,
} from './benchmark-helpers.mjs';
import { SearchEngine } from '../ai/search-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_OUTPUT_PATH = path.join(PROJECT_ROOT, 'benchmarks', 'stage81_etc_child_tt_reuse_benchmark.json');

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
  etcInPlaceMovePreparation: true,
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
  etcInPlaceMovePreparation: true,
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
  etcInPlaceMovePreparation: true,
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
  etcInPlaceMovePreparation: true,
});

function withToggle(options, enabled) {
  return {
    ...options,
    etcReusePreparedChildTableEntryForOrdering: enabled,
  };
}

function compareSamples(left, right) {
  const elapsedLeft = Number(left.summary.elapsedMs ?? Number.POSITIVE_INFINITY);
  const elapsedRight = Number(right.summary.elapsedMs ?? Number.POSITIVE_INFINITY);
  if (elapsedLeft !== elapsedRight) {
    return elapsedLeft - elapsedRight;
  }

  const nodesLeft = Number(left.summary.nodes ?? Number.POSITIVE_INFINITY);
  const nodesRight = Number(right.summary.nodes ?? Number.POSITIVE_INFINITY);
  if (nodesLeft !== nodesRight) {
    return nodesLeft - nodesRight;
  }

  return 0;
}

function runMedianSearchWithLookupCounts(state, options, repetitions = 3) {
  const samples = [];
  for (let index = 0; index < repetitions; index += 1) {
    const engine = new SearchEngine(options);
    const originalLookup = engine.lookupTransposition.bind(engine);
    let lookupCalls = 0;
    engine.lookupTransposition = (childState) => {
      lookupCalls += 1;
      return originalLookup(childState);
    };

    const result = engine.findBestMove(state);
    samples.push({
      result,
      summary: summarizeResult(result, state, null, {
        lookupCalls,
        etcReusePreparedChildTableEntryForOrdering: engine.options.etcReusePreparedChildTableEntryForOrdering,
      }),
    });
  }

  const sortedSamples = [...samples].sort(compareSamples);
  const chosen = sortedSamples[Math.floor(sortedSamples.length / 2)] ?? sortedSamples[0];
  return {
    result: chosen.result,
    summary: chosen.summary,
    samples: samples.map((sample) => sample.summary),
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
  const baselineLookupCalls = sumBy(cases.map((entry) => entry.baseline), 'lookupCalls');
  const candidateLookupCalls = sumBy(cases.map((entry) => entry.candidate), 'lookupCalls');
  const baselineEtcChildTableHits = sumBy(cases.map((entry) => entry.baseline), 'etcChildTableHits');
  const candidateEtcChildTableHits = sumBy(cases.map((entry) => entry.candidate), 'etcChildTableHits');
  const baselineReuseLookups = sumBy(cases.map((entry) => entry.baseline), 'etcPreparedChildTableReuseLookups');
  const candidateReuseLookups = sumBy(cases.map((entry) => entry.candidate), 'etcPreparedChildTableReuseLookups');
  const baselineReuseHits = sumBy(cases.map((entry) => entry.baseline), 'etcPreparedChildTableReuseHits');
  const candidateReuseHits = sumBy(cases.map((entry) => entry.candidate), 'etcPreparedChildTableReuseHits');

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
    baselineLookupCalls,
    candidateLookupCalls,
    lookupRatioCandidateVsBaseline: baselineLookupCalls > 0 ? candidateLookupCalls / baselineLookupCalls : null,
    baselineEtcChildTableHits,
    candidateEtcChildTableHits,
    baselineReuseLookups,
    candidateReuseLookups,
    baselineReuseHits,
    candidateReuseHits,
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
    const baselineRun = runMedianSearchWithLookupCounts(state, baselineOptions, repetitions);
    console.error(`[${label}] seed ${seed} candidate`);
    const candidateRun = runMedianSearchWithLookupCounts(state, candidateOptions, repetitions);

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
    benchmark: 'Stage 81 ETC child-TT reuse benchmark',
    description: 'Compare the current in-place ETC prepared-move path with and without safe child-TT entry reuse for move ordering on the same engine. The candidate only reuses TT metadata when the move record belongs to the same engine instance, active search generation, and unchanged TT store count.',
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
