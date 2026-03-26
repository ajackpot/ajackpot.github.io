import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { playSeededRandomUntilEmptyCount, runMedianSearch, sumBy } from './benchmark-helpers.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_OUTPUT_PATH = path.join(PROJECT_ROOT, 'benchmarks', 'stage23_specialized_few_empties_exact_solver_audit.json');

const DIRECT_4_EMPTY_SEEDS = Object.freeze([2, 5, 11, 19, 23, 37]);
const EXACT_BUCKET_10_EMPTY_SEEDS = Object.freeze([45, 53, 26, 19, 50, 57, 1, 24]);
const WLD_BUCKET_12_EMPTY_SEEDS = Object.freeze([50, 45, 42, 60, 48, 14, 57, 1]);
const REPETITIONS = 3;

const DIRECT_4_EMPTY_OPTIONS = Object.freeze({
  presetKey: 'custom',
  maxDepth: 4,
  timeLimitMs: 4000,
  exactEndgameEmpties: 4,
  aspirationWindow: 0,
  randomness: 0,
  maxTableEntries: 200000,
  wldPreExactEmpties: 0,
  styleKey: 'balanced',
  optimizedFewEmptiesExactSolver: true,
});

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
  optimizedFewEmptiesExactSolver: true,
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
  optimizedFewEmptiesExactSolver: true,
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
    baselineSmallSolverNodes: sumBy(cases.map((entry) => entry.baseline), 'smallSolverNodes'),
    candidateSmallSolverNodes: sumBy(cases.map((entry) => entry.candidate), 'smallSolverNodes'),
    baselineSpecializedFewEmptiesCalls: sumBy(cases.map((entry) => entry.baseline), 'specializedFewEmptiesCalls'),
    candidateSpecializedFewEmptiesCalls: sumBy(cases.map((entry) => entry.candidate), 'specializedFewEmptiesCalls'),
    baselineSpecializedFewEmpties3Calls: sumBy(cases.map((entry) => entry.baseline), 'specializedFewEmpties3Calls'),
    candidateSpecializedFewEmpties3Calls: sumBy(cases.map((entry) => entry.candidate), 'specializedFewEmpties3Calls'),
    baselineSpecializedFewEmpties4Calls: sumBy(cases.map((entry) => entry.baseline), 'specializedFewEmpties4Calls'),
    candidateSpecializedFewEmpties4Calls: sumBy(cases.map((entry) => entry.candidate), 'specializedFewEmpties4Calls'),
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
    specializedFewEmptiesExactSolver: false,
  });
  const candidateOptions = withOverrides(baseOptions, {
    specializedFewEmptiesExactSolver: true,
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

  const direct4EmptyExact = runSharedSeedSection({
    label: 'direct_exact_root_4_empties',
    targetEmptyCount: 4,
    seeds: DIRECT_4_EMPTY_SEEDS,
    baseOptions: DIRECT_4_EMPTY_OPTIONS,
  });

  const exactBucket10 = runSharedSeedSection({
    label: 'exact_bucket_10_empties',
    targetEmptyCount: 10,
    seeds: EXACT_BUCKET_10_EMPTY_SEEDS,
    baseOptions: EXACT_BUCKET_OPTIONS,
  });

  const wldBucket12 = runSharedSeedSection({
    label: 'wld_bucket_12_empties',
    targetEmptyCount: 12,
    seeds: WLD_BUCKET_12_EMPTY_SEEDS,
    baseOptions: WLD_BUCKET_OPTIONS,
  });

  const output = {
    benchmark: 'Stage 23 specialized few-empties exact solver audit',
    description: 'Compares the Stage 22 optimized exact small solver against a Stage 23 specialized exact 1-4 empties solver family, separating direct 4-empty roots, a realistic 10-empty exact bucket, and an unchanged 12-empty WLD bucket.',
    notes: [
      'Both baseline and candidate keep the Stage 22 optimized exact small solver enabled; this audit isolates only the specialized exact 1-4 empties path.',
      'The candidate is exact-only and must not change WLD bucket behavior.',
      'Median-of-three sampling is used per seed to reduce local timing noise.',
    ],
    direct4EmptyExact,
    exactBucket10,
    wldBucket12,
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    outputPath,
    direct4Summary: direct4EmptyExact.summary,
    exact10Summary: exactBucket10.summary,
    wld12Summary: wldBucket12.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
