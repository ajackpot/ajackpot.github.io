import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { playSeededRandomUntilEmptyCount, runMedianSearch, sumBy } from './benchmark-helpers.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_OUTPUT_PATH = path.join(PROJECT_ROOT, 'benchmarks', 'stage20_bucketed_etc_exact_wld_benchmark.json');

const SHARED_BLACK_SEEDS_14_EMPTIES = [23, 37, 48, 60];

const EXACT_BUCKET_BASE_OPTIONS = Object.freeze({
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

const WLD_BUCKET_BASE_OPTIONS = Object.freeze({
  presetKey: 'custom',
  maxDepth: 8,
  timeLimitMs: 3900,
  exactEndgameEmpties: 12,
  aspirationWindow: 0,
  randomness: 0,
  maxTableEntries: 260000,
  wldPreExactEmpties: 2,
  styleKey: 'balanced',
  enhancedTranspositionCutoff: true,
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

function compareAgainstReference(summary, reference) {
  return {
    moveAgreement: summary.bestMove === reference.bestMove,
    outcomeAgreement: summary.outcome === reference.outcome,
    scoreAgreement: summary.score === reference.score,
  };
}

function buildAggregateSummary(cases, bucketKind) {
  const bucketPrefix = bucketKind === 'wld' ? 'etcWld' : 'etcExact';
  return {
    count: cases.length,
    allBlack: cases.every((entry) => entry.currentPlayer === 'black'),
    baselineElapsedMs: sumBy(cases.map((entry) => entry.baseline), 'elapsedMs'),
    candidateElapsedMs: sumBy(cases.map((entry) => entry.candidate), 'elapsedMs'),
    baselineNodes: sumBy(cases.map((entry) => entry.baseline), 'nodes'),
    candidateNodes: sumBy(cases.map((entry) => entry.candidate), 'nodes'),
    baselineEtcBucketNodes: sumBy(cases.map((entry) => entry.baseline), `${bucketPrefix}Nodes`),
    candidateEtcBucketNodes: sumBy(cases.map((entry) => entry.candidate), `${bucketPrefix}Nodes`),
    baselineEtcBucketChildTableHits: sumBy(cases.map((entry) => entry.baseline), `${bucketPrefix}ChildTableHits`),
    candidateEtcBucketChildTableHits: sumBy(cases.map((entry) => entry.candidate), `${bucketPrefix}ChildTableHits`),
    baselineEtcBucketQualifiedBounds: sumBy(cases.map((entry) => entry.baseline), `${bucketPrefix}QualifiedBounds`),
    candidateEtcBucketQualifiedBounds: sumBy(cases.map((entry) => entry.candidate), `${bucketPrefix}QualifiedBounds`),
    baselineEtcBucketNarrowings: sumBy(cases.map((entry) => entry.baseline), `${bucketPrefix}Narrowings`),
    candidateEtcBucketNarrowings: sumBy(cases.map((entry) => entry.candidate), `${bucketPrefix}Narrowings`),
    baselineEtcBucketCutoffs: sumBy(cases.map((entry) => entry.baseline), `${bucketPrefix}Cutoffs`),
    candidateEtcBucketCutoffs: sumBy(cases.map((entry) => entry.candidate), `${bucketPrefix}Cutoffs`),
    moveAgreement: cases.filter((entry) => entry.sameMove).length,
    outcomeAgreement: cases.filter((entry) => entry.sameOutcome).length,
    scoreAgreement: cases.filter((entry) => entry.sameScore).length,
  };
}

function buildReferenceSummary(cases) {
  return {
    baselineMoveAgreement: cases.filter((entry) => entry.baselineReference?.moveAgreement).length,
    candidateMoveAgreement: cases.filter((entry) => entry.candidateReference?.moveAgreement).length,
    baselineOutcomeAgreement: cases.filter((entry) => entry.baselineReference?.outcomeAgreement).length,
    candidateOutcomeAgreement: cases.filter((entry) => entry.candidateReference?.outcomeAgreement).length,
    baselineScoreAgreement: cases.filter((entry) => entry.baselineReference?.scoreAgreement).length,
    candidateScoreAgreement: cases.filter((entry) => entry.candidateReference?.scoreAgreement).length,
  };
}

function runSharedSeedSection({
  label,
  bucketKind,
  targetEmptyCount,
  seeds,
  baselineOptions,
  candidateOptions,
  referenceOptions = null,
  repetitions = 3,
  referenceRepetitions = 1,
}) {
  const cases = [];

  for (const seed of seeds) {
    console.error(`[${label}] seed ${seed} start`);
    const state = playSeededRandomUntilEmptyCount(targetEmptyCount, seed);
    assert.equal(state.getEmptyCount(), targetEmptyCount, `${label}: seed ${seed} should reach the requested empty count.`);

    console.error(`[${label}] seed ${seed} baseline`);
    const baselineRun = runMedianSearch(state, baselineOptions, repetitions);
    console.error(`[${label}] seed ${seed} candidate`);
    const candidateRun = runMedianSearch(state, candidateOptions, repetitions);
    const baseline = addSeedMetadata(baselineRun.summary, seed, state);
    const candidate = addSeedMetadata(candidateRun.summary, seed, state);

    const caseEntry = {
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
    };

    if (referenceOptions) {
      console.error(`[${label}] seed ${seed} exact-reference`);
      const referenceRun = runMedianSearch(state, referenceOptions, referenceRepetitions);
      const exactReference = addSeedMetadata(referenceRun.summary, seed, state);
      caseEntry.exactReference = exactReference;
      caseEntry.exactReferenceSamples = referenceRun.samples;
      caseEntry.baselineReference = compareAgainstReference(baseline, exactReference);
      caseEntry.candidateReference = compareAgainstReference(candidate, exactReference);
    }

    cases.push(caseEntry);
  }

  const summary = buildAggregateSummary(cases, bucketKind);
  if (referenceOptions) {
    Object.assign(summary, buildReferenceSummary(cases));
  }

  return {
    bucket: bucketKind,
    label,
    seeds,
    targetEmptyCount,
    options: {
      baseline: baselineOptions,
      candidate: candidateOptions,
      ...(referenceOptions ? { exactReference: referenceOptions } : {}),
    },
    summary,
    cases,
  };
}

async function main() {
  const outputPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_OUTPUT_PATH;

  const exactBucketEtcAudit = runSharedSeedSection({
    label: 'shared_14_empties_exact_bucket',
    bucketKind: 'exact',
    targetEmptyCount: 14,
    seeds: SHARED_BLACK_SEEDS_14_EMPTIES,
    baselineOptions: withOverrides(EXACT_BUCKET_BASE_OPTIONS, {
      enhancedTranspositionCutoff: false,
      enhancedTranspositionCutoffWld: false,
    }),
    candidateOptions: withOverrides(EXACT_BUCKET_BASE_OPTIONS, {
      enhancedTranspositionCutoff: true,
      enhancedTranspositionCutoffWld: true,
    }),
    repetitions: 1,
  });

  const wldBucketEtcAudit = runSharedSeedSection({
    label: 'shared_14_empties_wld_bucket',
    bucketKind: 'wld',
    targetEmptyCount: 14,
    seeds: SHARED_BLACK_SEEDS_14_EMPTIES,
    baselineOptions: withOverrides(WLD_BUCKET_BASE_OPTIONS, {
      enhancedTranspositionCutoffWld: false,
    }),
    candidateOptions: withOverrides(WLD_BUCKET_BASE_OPTIONS, {
      enhancedTranspositionCutoffWld: true,
    }),
    referenceOptions: withOverrides(EXACT_BUCKET_BASE_OPTIONS, {
      enhancedTranspositionCutoff: false,
      enhancedTranspositionCutoffWld: false,
    }),
    repetitions: 1,
    referenceRepetitions: 1,
  });

  const output = {
    benchmark: 'Stage 20 bucketed ETC exact vs WLD audit',
    description: 'Compare ETC separately inside the exact-endgame bucket and the dedicated WLD pre-exact bucket on the same 14-empty black-to-move seed set.',
    bucketDefinitions: {
      exact: 'Root exact-endgame search with empties <= exactEndgameEmpties. ETC toggle: enhancedTranspositionCutoff.',
      wld: 'Root WLD pre-exact search with exactEndgameEmpties < empties <= exactEndgameEmpties + wldPreExactEmpties. ETC toggle: enhancedTranspositionCutoffWld.',
    },
    exactBucketEtcAudit,
    wldBucketEtcAudit,
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ outputPath, exactSummary: exactBucketEtcAudit.summary, wldSummary: wldBucketEtcAudit.summary }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
