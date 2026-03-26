import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { playSeededRandomUntilEmptyCount, runMedianSearch, sumBy } from './benchmark-helpers.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_OUTPUT_PATH = path.join(PROJECT_ROOT, 'benchmarks', 'stage24_exact_fastest_first_audit.json');

const EXACT_BUCKET_10_SEEDS = Object.freeze([45, 53, 26, 19, 50, 57, 1, 24]);
const EXACT_BUCKET_14_SEEDS = Object.freeze([23, 37, 48, 60]);
const WLD_BUCKET_12_SEEDS = Object.freeze([50, 45, 42, 60, 48, 14, 57, 1]);

const EXACT_BUCKET_10_OPTIONS = Object.freeze({
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

const EXACT_BUCKET_14_OPTIONS = Object.freeze({
  presetKey: 'custom',
  maxDepth: 4,
  timeLimitMs: 15000,
  exactEndgameEmpties: 14,
  aspirationWindow: 0,
  randomness: 0,
  maxTableEntries: 400000,
  wldPreExactEmpties: 0,
  styleKey: 'balanced',
});

const WLD_BUCKET_12_OPTIONS = Object.freeze({
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

function buildVariantSummary(cases, key) {
  return {
    elapsedMs: sumBy(cases.map((entry) => entry[key]), 'elapsedMs'),
    nodes: sumBy(cases.map((entry) => entry[key]), 'nodes'),
    fastestFirstExactSorts: sumBy(cases.map((entry) => entry[key]), 'fastestFirstExactSorts'),
    fastestFirstExactPassCandidates: sumBy(cases.map((entry) => entry[key]), 'fastestFirstExactPassCandidates'),
    completed: cases.filter((entry) => entry[key].completion === 'complete').length,
  };
}

function buildAgreementSummary(cases, leftKey, rightKey, prefix) {
  return {
    [`${prefix}MoveAgreement`]: cases.filter((entry) => entry[leftKey].bestMove === entry[rightKey].bestMove).length,
    [`${prefix}OutcomeAgreement`]: cases.filter((entry) => entry[leftKey].outcome === entry[rightKey].outcome).length,
    [`${prefix}ScoreAgreement`]: cases.filter((entry) => entry[leftKey].score === entry[rightKey].score).length,
  };
}

function buildSummary(cases) {
  return {
    count: cases.length,
    allBlack: cases.every((entry) => entry.currentPlayer === 'black'),
    baseline: buildVariantSummary(cases, 'baseline'),
    fastestFirst: buildVariantSummary(cases, 'fastestFirst'),
    ...buildAgreementSummary(cases, 'baseline', 'fastestFirst', 'fastestFirstVsBaseline'),
  };
}

function runSection({
  label,
  targetEmptyCount,
  seeds,
  baseOptions,
  repetitions,
}) {
  const baselineOptions = withOverrides(baseOptions, {
    exactFastestFirstOrdering: false,
  });
  const fastestFirstOptions = withOverrides(baseOptions, {
    exactFastestFirstOrdering: true,
  });
  const cases = [];
  for (const seed of seeds) {
    console.error(`[${label}] seed ${seed} baseline`);
    const state = playSeededRandomUntilEmptyCount(targetEmptyCount, seed);
    const baselineRun = runMedianSearch(state, baselineOptions, repetitions);
    console.error(`[${label}] seed ${seed} fastest-first`);
    const fastestFirstRun = runMedianSearch(state, fastestFirstOptions, repetitions);
    cases.push({
      seed,
      currentPlayer: state.currentPlayer,
      empties: state.getEmptyCount(),
      legalMoves: state.getLegalMoves().length,
      baseline: addSeedMetadata(baselineRun.summary, seed, state),
      fastestFirst: addSeedMetadata(fastestFirstRun.summary, seed, state),
      baselineSamples: baselineRun.samples,
      fastestFirstSamples: fastestFirstRun.samples,
    });
  }

  return {
    label,
    targetEmptyCount,
    seeds,
    repetitions,
    options: {
      baseline: baselineOptions,
      fastestFirst: fastestFirstOptions,
    },
    summary: buildSummary(cases),
    cases,
  };
}

async function main() {
  const outputPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_OUTPUT_PATH;

  const exactBucket10 = runSection({
    label: 'exact_bucket_10_empties',
    targetEmptyCount: 10,
    seeds: EXACT_BUCKET_10_SEEDS,
    baseOptions: EXACT_BUCKET_10_OPTIONS,
    repetitions: 3,
  });

  const exactBucket14 = runSection({
    label: 'exact_bucket_14_empties',
    targetEmptyCount: 14,
    seeds: EXACT_BUCKET_14_SEEDS,
    baseOptions: EXACT_BUCKET_14_OPTIONS,
    repetitions: 1,
  });

  const wldBucket12 = runSection({
    label: 'wld_bucket_12_empties',
    targetEmptyCount: 12,
    seeds: WLD_BUCKET_12_SEEDS,
    baseOptions: WLD_BUCKET_12_OPTIONS,
    repetitions: 1,
  });

  const output = {
    benchmark: 'Stage 24 exact fastest-first ordering audit',
    description: 'Compares baseline late-ordering and the adopted exact fastest-first variant. Exact buckets and a WLD control bucket are reported separately.',
    notes: [
      'Exact bucket sections measure exact-endgame roots only.',
      'The WLD bucket section is a control: exact fastest-first ordering must remain inactive there.',
      'The 10-empty exact section uses median-of-three sampling; the heavier 14-empty and WLD sections use single runs per seed.',
    ],
    exactBucket10,
    exactBucket14,
    wldBucket12,
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    outputPath,
    exact10Summary: exactBucket10.summary,
    exact14Summary: exactBucket14.summary,
    wld12Summary: wldBucket12.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
