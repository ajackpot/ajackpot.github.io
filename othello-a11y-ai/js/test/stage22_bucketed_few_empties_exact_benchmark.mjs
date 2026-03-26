import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { playSeededRandomUntilEmptyCount, runMedianSearch, sumBy } from './benchmark-helpers.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_OUTPUT_PATH = path.join(PROJECT_ROOT, 'benchmarks', 'stage22_bucketed_few_empties_exact_solver_audit.json');

const EXACT_BUCKET_SEEDS = Object.freeze([45, 53, 26, 19, 50, 57, 1, 24]);
const WLD_BUCKET_SEEDS = Object.freeze([50, 45, 42, 60, 48, 14, 57, 1]);
const REPETITIONS = 3;

const EXACT_BUCKET_OPTIONS = Object.freeze({
  presetKey: 'custom',
  maxDepth: 4,
  timeLimitMs: 10000,
  exactEndgameEmpties: 10,
  aspirationWindow: 0,
  randomness: 0,
  maxTableEntries: 300000,
  wldPreExactEmpties: 0,
  styleKey: 'balanced',
});

const WLD_BUCKET_OPTIONS = Object.freeze({
  presetKey: 'custom',
  maxDepth: 8,
  timeLimitMs: 3000,
  exactEndgameEmpties: 10,
  aspirationWindow: 0,
  randomness: 0,
  maxTableEntries: 300000,
  wldPreExactEmpties: 2,
  styleKey: 'balanced',
});

function withOverrides(baseOptions, overrides) {
  return { ...baseOptions, ...overrides };
}

function addSeedMetadata(summary, seed, state) {
  return {
    ...summary,
    seed,
    currentPlayer: state.currentPlayer,
    empties: state.getEmptyCount(),
    legalMoves: state.getLegalMoves().length,
  };
}

function buildSummary(cases) {
  return {
    count: cases.length,
    baselineElapsedMs: sumBy(cases.map((entry) => entry.baseline), 'elapsedMs'),
    candidateElapsedMs: sumBy(cases.map((entry) => entry.candidate), 'elapsedMs'),
    elapsedDeltaMs: sumBy(cases.map((entry) => entry.candidate), 'elapsedMs') - sumBy(cases.map((entry) => entry.baseline), 'elapsedMs'),
    baselineNodes: sumBy(cases.map((entry) => entry.baseline), 'nodes'),
    candidateNodes: sumBy(cases.map((entry) => entry.candidate), 'nodes'),
    nodeDelta: sumBy(cases.map((entry) => entry.candidate), 'nodes') - sumBy(cases.map((entry) => entry.baseline), 'nodes'),
    baselineSmallSolverCalls: sumBy(cases.map((entry) => entry.baseline), 'smallSolverCalls'),
    candidateSmallSolverCalls: sumBy(cases.map((entry) => entry.candidate), 'smallSolverCalls'),
    baselineSmallSolverNodes: sumBy(cases.map((entry) => entry.baseline), 'smallSolverNodes'),
    candidateSmallSolverNodes: sumBy(cases.map((entry) => entry.candidate), 'smallSolverNodes'),
    baselineWldSmallSolverCalls: sumBy(cases.map((entry) => entry.baseline), 'wldSmallSolverCalls'),
    candidateWldSmallSolverCalls: sumBy(cases.map((entry) => entry.candidate), 'wldSmallSolverCalls'),
    baselineWldSmallSolverNodes: sumBy(cases.map((entry) => entry.baseline), 'wldSmallSolverNodes'),
    candidateWldSmallSolverNodes: sumBy(cases.map((entry) => entry.candidate), 'wldSmallSolverNodes'),
    sameMove: cases.filter((entry) => entry.sameMove).length,
    sameOutcome: cases.filter((entry) => entry.sameOutcome).length,
    sameScore: cases.filter((entry) => entry.sameScore).length,
    baselineComplete: cases.filter((entry) => entry.baseline.completion === 'complete').length,
    candidateComplete: cases.filter((entry) => entry.candidate.completion === 'complete').length,
  };
}

function runSharedSeedSection({
  label,
  targetEmptyCount,
  seeds,
  baseOptions,
}) {
  const baselineOptions = withOverrides(baseOptions, {
    optimizedFewEmptiesExactSolver: false,
  });
  const candidateOptions = withOverrides(baseOptions, {
    optimizedFewEmptiesExactSolver: true,
  });

  const cases = [];
  for (const seed of seeds) {
    const state = playSeededRandomUntilEmptyCount(targetEmptyCount, seed);
    const baselineRun = runMedianSearch(state, baselineOptions, REPETITIONS);
    const candidateRun = runMedianSearch(state, candidateOptions, REPETITIONS);
    const baseline = addSeedMetadata(baselineRun.summary, seed, state);
    const candidate = addSeedMetadata(candidateRun.summary, seed, state);

    cases.push({
      seed,
      currentPlayer: state.currentPlayer,
      empties: state.getEmptyCount(),
      legalMoves: state.getLegalMoves().length,
      baseline,
      candidate,
      sameMove: baseline.bestMove === candidate.bestMove,
      sameOutcome: baseline.outcome === candidate.outcome,
      sameScore: baseline.score === candidate.score,
      baselineSamples: baselineRun.samples,
      candidateSamples: candidateRun.samples,
    });
  }

  return {
    label,
    targetEmptyCount,
    seeds,
    repetitions: REPETITIONS,
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

  const exactBucket = runSharedSeedSection({
    label: 'exact_bucket_10_empties',
    targetEmptyCount: 10,
    seeds: EXACT_BUCKET_SEEDS,
    baseOptions: EXACT_BUCKET_OPTIONS,
  });

  const wldBucket = runSharedSeedSection({
    label: 'wld_bucket_12_empties',
    targetEmptyCount: 12,
    seeds: WLD_BUCKET_SEEDS,
    baseOptions: WLD_BUCKET_OPTIONS,
  });

  const output = {
    benchmark: 'Stage 22 bucketed few-empties exact-solver audit',
    description: 'Compares the Stage 22 optimized exact-only few-empties solver against the full-width Stage 21 baseline, separated into an exact bucket and a WLD bucket.',
    notes: [
      'The candidate only changes the exact small solver at four or fewer empties; the WLD small solver is intentionally untouched.',
      'The exact bucket uses 10-empty roots so many subtrees bottom out into the few-empties exact solver.',
      'The WLD bucket uses 12-empty roots with exactEndgameEmpties=10 and wldPreExactEmpties=2 to verify that WLD behavior stays unchanged.',
      'Median-of-three sampling is used per seed to reduce local timing noise.',
    ],
    exactBucket,
    wldBucket,
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    outputPath,
    exactSummary: exactBucket.summary,
    wldSummary: wldBucket.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
