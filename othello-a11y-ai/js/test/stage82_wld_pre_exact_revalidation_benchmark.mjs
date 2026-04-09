import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { playSeededRandomUntilEmptyCount, runMedianSearch, sumBy } from './benchmark-helpers.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_OUTPUT_PATH = path.join(PROJECT_ROOT, 'benchmarks', 'stage82_wld_pre_exact_revalidation.json');

const EXACT_REFERENCE_SEEDS = Object.freeze([23, 37, 48, 60, 72, 104, 105, 119]);
const BLACK_HOLDOUT_SEEDS = Object.freeze([48, 60, 72, 186, 280]);

const RANGE2_EXACT_REFERENCE_BASE_OPTIONS = Object.freeze({
  presetKey: 'custom',
  maxDepth: 8,
  timeLimitMs: 3900,
  exactEndgameEmpties: 12,
  aspirationWindow: 0,
  randomness: 0,
  maxTableEntries: 260000,
  styleKey: 'balanced',
});

const RANGE2_EXACT_REFERENCE_OPTIONS = Object.freeze({
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

const RANGE2_BLACK_HOLDOUT_BASE_OPTIONS = Object.freeze({
  presetKey: 'custom',
  maxDepth: 8,
  timeLimitMs: 3900,
  exactEndgameEmpties: 16,
  aspirationWindow: 0,
  randomness: 0,
  maxTableEntries: 260000,
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

function compareAgainstReference(summary, reference) {
  return {
    moveAgreement: summary.bestMove === reference.bestMove,
    outcomeAgreement: summary.outcome === reference.outcome,
    scoreAgreement: summary.score === reference.score,
  };
}

function buildSummary(cases, extra = {}) {
  return {
    count: cases.length,
    baselineElapsedMs: sumBy(cases.map((entry) => entry.baseline), 'elapsedMs'),
    candidateElapsedMs: sumBy(cases.map((entry) => entry.candidate), 'elapsedMs'),
    elapsedRatioCandidateVsBaseline: (() => {
      const baselineElapsedMs = sumBy(cases.map((entry) => entry.baseline), 'elapsedMs');
      const candidateElapsedMs = sumBy(cases.map((entry) => entry.candidate), 'elapsedMs');
      return baselineElapsedMs > 0 ? candidateElapsedMs / baselineElapsedMs : null;
    })(),
    baselineNodes: sumBy(cases.map((entry) => entry.baseline), 'nodes'),
    candidateNodes: sumBy(cases.map((entry) => entry.candidate), 'nodes'),
    nodeRatioCandidateVsBaseline: (() => {
      const baselineNodes = sumBy(cases.map((entry) => entry.baseline), 'nodes');
      const candidateNodes = sumBy(cases.map((entry) => entry.candidate), 'nodes');
      return baselineNodes > 0 ? candidateNodes / baselineNodes : null;
    })(),
    sameMove: cases.filter((entry) => entry.sameMove).length,
    sameOutcome: cases.filter((entry) => entry.sameOutcome).length,
    sameScore: cases.filter((entry) => entry.sameScore).length,
    candidateWldModes: cases.filter((entry) => entry.candidate.mode === 'wld-endgame').length,
    baselineWldModes: cases.filter((entry) => entry.baseline.mode === 'wld-endgame').length,
    candidateComplete: cases.filter((entry) => entry.candidate.completion === 'complete').length,
    baselineComplete: cases.filter((entry) => entry.baseline.completion === 'complete').length,
    candidateFallbacks: cases.filter((entry) => entry.candidate.completion !== 'complete').length,
    baselineFallbacks: cases.filter((entry) => entry.baseline.completion !== 'complete').length,
    baselineWldNodes: sumBy(cases.map((entry) => entry.baseline), 'wldNodes'),
    candidateWldNodes: sumBy(cases.map((entry) => entry.candidate), 'wldNodes'),
    baselineWldSmallSolverCalls: sumBy(cases.map((entry) => entry.baseline), 'wldSmallSolverCalls'),
    candidateWldSmallSolverCalls: sumBy(cases.map((entry) => entry.candidate), 'wldSmallSolverCalls'),
    ...extra,
  };
}

function runExactReferenceSection() {
  const baselineOptions = withOverrides(RANGE2_EXACT_REFERENCE_BASE_OPTIONS, {
    wldPreExactEmpties: 0,
  });
  const candidateOptions = withOverrides(RANGE2_EXACT_REFERENCE_BASE_OPTIONS, {
    wldPreExactEmpties: 2,
  });

  const cases = [];
  for (const seed of EXACT_REFERENCE_SEEDS) {
    console.error(`[stage82-wld] exact-reference seed ${seed} baseline`);
    const state = playSeededRandomUntilEmptyCount(14, seed);
    const baselineRun = runMedianSearch(state, baselineOptions, 1);
    console.error(`[stage82-wld] exact-reference seed ${seed} candidate`);
    const candidateRun = runMedianSearch(state, candidateOptions, 1);
    console.error(`[stage82-wld] exact-reference seed ${seed} exact-ref`);
    const exactReferenceRun = runMedianSearch(state, RANGE2_EXACT_REFERENCE_OPTIONS, 1);

    const baseline = addSeedMetadata(baselineRun.summary, seed, state);
    const candidate = addSeedMetadata(candidateRun.summary, seed, state);
    const exactReference = addSeedMetadata(exactReferenceRun.summary, seed, state);

    cases.push({
      seed,
      currentPlayer: state.currentPlayer,
      empties: state.getEmptyCount(),
      legalMoves: state.getLegalMoves().length,
      baseline,
      candidate,
      exactReference,
      sameMove: baseline.bestMove === candidate.bestMove,
      sameOutcome: baseline.outcome === candidate.outcome,
      sameScore: baseline.score === candidate.score,
      baselineReference: compareAgainstReference(baseline, exactReference),
      candidateReference: compareAgainstReference(candidate, exactReference),
      baselineSamples: baselineRun.samples,
      candidateSamples: candidateRun.samples,
      exactReferenceSamples: exactReferenceRun.samples,
    });
  }

  return {
    label: 'expert_like_range2_exact_reference',
    targetEmptyCount: 14,
    seeds: EXACT_REFERENCE_SEEDS,
    options: {
      baseline: baselineOptions,
      candidate: candidateOptions,
      exactReference: RANGE2_EXACT_REFERENCE_OPTIONS,
    },
    summary: buildSummary(cases, {
      baselineMoveAgreementVsExactReference: cases.filter((entry) => entry.baselineReference.moveAgreement).length,
      candidateMoveAgreementVsExactReference: cases.filter((entry) => entry.candidateReference.moveAgreement).length,
      baselineOutcomeAgreementVsExactReference: cases.filter((entry) => entry.baselineReference.outcomeAgreement).length,
      candidateOutcomeAgreementVsExactReference: cases.filter((entry) => entry.candidateReference.outcomeAgreement).length,
      baselineScoreAgreementVsExactReference: cases.filter((entry) => entry.baselineReference.scoreAgreement).length,
      candidateScoreAgreementVsExactReference: cases.filter((entry) => entry.candidateReference.scoreAgreement).length,
    }),
    cases,
  };
}

function runBlackHoldoutSection() {
  const baselineOptions = withOverrides(RANGE2_BLACK_HOLDOUT_BASE_OPTIONS, {
    wldPreExactEmpties: 0,
  });
  const candidateOptions = withOverrides(RANGE2_BLACK_HOLDOUT_BASE_OPTIONS, {
    wldPreExactEmpties: 2,
  });

  const cases = [];
  for (const seed of BLACK_HOLDOUT_SEEDS) {
    console.error(`[stage82-wld] black-holdout seed ${seed} baseline`);
    const state = playSeededRandomUntilEmptyCount(18, seed);
    const baselineRun = runMedianSearch(state, baselineOptions, 1);
    console.error(`[stage82-wld] black-holdout seed ${seed} candidate`);
    const candidateRun = runMedianSearch(state, candidateOptions, 1);

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
    label: 'impossible_black_range2_holdout',
    targetEmptyCount: 18,
    seeds: BLACK_HOLDOUT_SEEDS,
    options: {
      baseline: baselineOptions,
      candidate: candidateOptions,
    },
    summary: buildSummary(cases, {
      allBlack: cases.every((entry) => entry.currentPlayer === 'black'),
    }),
    cases,
  };
}

async function main() {
  const outputPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_OUTPUT_PATH;

  const exactReferenceSection = runExactReferenceSection();
  const blackHoldoutSection = runBlackHoldoutSection();

  const output = {
    benchmark: 'Stage 82 WLD pre-exact revalidation benchmark',
    description: 'Revalidates the adopted root-only WLD +2 window on the current code root after later TT/ETC/MPC changes. A 14-empty exact-reference set checks move/outcome quality, while an 18-empty black holdout checks parity coverage and cost/completion behavior.',
    exactReferenceSection,
    blackHoldoutSection,
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    outputPath,
    exactReferenceSummary: exactReferenceSection.summary,
    blackHoldoutSummary: blackHoldoutSection.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
