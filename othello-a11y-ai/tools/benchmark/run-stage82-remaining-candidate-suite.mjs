import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_OUTPUT_DIR = path.join(PROJECT_ROOT, 'benchmarks', 'stage82_remaining_candidates');

const SUITE = Object.freeze([
  {
    key: 'etc_buckets',
    label: 'ETC exact/WLD bucket audit',
    script: path.join(PROJECT_ROOT, 'js/test/stage20_bucketed_etc_benchmark.mjs'),
    outputFile: 'stage20_bucketed_etc_exact_wld_benchmark.rerun.json',
  },
  {
    key: 'optimized_few_empties_exact',
    label: 'Optimized few-empties exact solver audit',
    script: path.join(PROJECT_ROOT, 'js/test/stage22_bucketed_few_empties_exact_benchmark.mjs'),
    outputFile: 'stage22_bucketed_few_empties_exact_solver_audit.rerun.json',
  },
  {
    key: 'specialized_few_empties_exact',
    label: 'Specialized few-empties exact solver audit',
    script: path.join(PROJECT_ROOT, 'js/test/stage23_specialized_few_empties_exact_benchmark.mjs'),
    outputFile: 'stage23_specialized_few_empties_exact_solver_audit.rerun.json',
  },
  {
    key: 'exact_fastest_first',
    label: 'Exact fastest-first audit',
    script: path.join(PROJECT_ROOT, 'js/test/stage24_exact_fastest_first_benchmark.mjs'),
    outputFile: 'stage24_exact_fastest_first_audit.rerun.json',
  },
  {
    key: 'wld_pre_exact',
    label: 'WLD pre-exact +2 revalidation',
    script: path.join(PROJECT_ROOT, 'js/test/stage82_wld_pre_exact_revalidation_benchmark.mjs'),
    outputFile: 'stage82_wld_pre_exact_revalidation.json',
  },
]);

function loadJson(filePath) {
  return fs.readFile(filePath, 'utf8').then((text) => JSON.parse(text));
}

function ratio(numerator, denominator) {
  return Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0
    ? numerator / denominator
    : null;
}

function summarizePayload(key, payload) {
  switch (key) {
    case 'etc_buckets': {
      const exact = payload.exactBucketEtcAudit?.summary ?? {};
      const wld = payload.wldBucketEtcAudit?.summary ?? {};
      return {
        exactBucket: {
          cases: exact.count ?? null,
          moveAgreement: exact.moveAgreement ?? null,
          outcomeAgreement: exact.outcomeAgreement ?? null,
          scoreAgreement: exact.scoreAgreement ?? null,
          elapsedRatioCandidateVsBaseline: ratio(exact.candidateElapsedMs, exact.baselineElapsedMs),
          nodeRatioCandidateVsBaseline: ratio(exact.candidateNodes, exact.baselineNodes),
          etcNodeRatioCandidateVsBaseline: ratio(exact.candidateEtcBucketNodes, exact.baselineEtcBucketNodes),
        },
        wldBucket: {
          cases: wld.count ?? null,
          moveAgreement: wld.moveAgreement ?? null,
          outcomeAgreement: wld.outcomeAgreement ?? null,
          scoreAgreement: wld.scoreAgreement ?? null,
          candidateOutcomeAgreementVsExactReference: wld.candidateOutcomeAgreement ?? null,
          elapsedRatioCandidateVsBaseline: ratio(wld.candidateElapsedMs, wld.baselineElapsedMs),
          nodeRatioCandidateVsBaseline: ratio(wld.candidateNodes, wld.baselineNodes),
          etcNodeRatioCandidateVsBaseline: ratio(wld.candidateEtcBucketNodes, wld.baselineEtcBucketNodes),
        },
      };
    }
    case 'optimized_few_empties_exact': {
      const exact = payload.exactBucket?.summary ?? {};
      const wld = payload.wldBucket?.summary ?? {};
      return {
        exactBucket: {
          cases: exact.count ?? null,
          sameMove: exact.sameMove ?? null,
          sameOutcome: exact.sameOutcome ?? null,
          sameScore: exact.sameScore ?? null,
          elapsedRatioCandidateVsBaseline: ratio(exact.candidateElapsedMs, exact.baselineElapsedMs),
          nodeRatioCandidateVsBaseline: ratio(exact.candidateNodes, exact.baselineNodes),
          smallSolverNodeRatioCandidateVsBaseline: ratio(exact.candidateSmallSolverNodes, exact.baselineSmallSolverNodes),
        },
        wldBucket: {
          cases: wld.count ?? null,
          sameMove: wld.sameMove ?? null,
          sameOutcome: wld.sameOutcome ?? null,
          sameScore: wld.sameScore ?? null,
          elapsedRatioCandidateVsBaseline: ratio(wld.candidateElapsedMs, wld.baselineElapsedMs),
          nodeRatioCandidateVsBaseline: ratio(wld.candidateNodes, wld.baselineNodes),
          wldSmallSolverNodeRatioCandidateVsBaseline: ratio(wld.candidateWldSmallSolverNodes, wld.baselineWldSmallSolverNodes),
        },
      };
    }
    case 'specialized_few_empties_exact': {
      const direct4 = payload.direct4EmptyExact?.summary ?? {};
      const exact10 = payload.exactBucket10?.summary ?? {};
      const wld12 = payload.wldBucket12?.summary ?? {};
      return {
        direct4Exact: {
          cases: direct4.count ?? null,
          sameMove: direct4.sameMove ?? null,
          sameOutcome: direct4.sameOutcome ?? null,
          sameScore: direct4.sameScore ?? null,
          elapsedRatioCandidateVsBaseline: ratio(direct4.candidateElapsedMs, direct4.baselineElapsedMs),
          nodeRatioCandidateVsBaseline: ratio(direct4.candidateNodes, direct4.baselineNodes),
          smallSolverNodeRatioCandidateVsBaseline: ratio(direct4.candidateSmallSolverNodes, direct4.baselineSmallSolverNodes),
        },
        exactBucket10: {
          cases: exact10.count ?? null,
          sameMove: exact10.sameMove ?? null,
          sameOutcome: exact10.sameOutcome ?? null,
          sameScore: exact10.sameScore ?? null,
          elapsedRatioCandidateVsBaseline: ratio(exact10.candidateElapsedMs, exact10.baselineElapsedMs),
          nodeRatioCandidateVsBaseline: ratio(exact10.candidateNodes, exact10.baselineNodes),
          smallSolverNodeRatioCandidateVsBaseline: ratio(exact10.candidateSmallSolverNodes, exact10.baselineSmallSolverNodes),
        },
        wldBucket12: {
          cases: wld12.count ?? null,
          sameMove: wld12.sameMove ?? null,
          sameOutcome: wld12.sameOutcome ?? null,
          sameScore: wld12.sameScore ?? null,
          elapsedRatioCandidateVsBaseline: ratio(wld12.candidateElapsedMs, wld12.baselineElapsedMs),
          nodeRatioCandidateVsBaseline: ratio(wld12.candidateNodes, wld12.baselineNodes),
        },
      };
    }
    case 'exact_fastest_first': {
      const exact10 = payload.exactBucket10?.summary ?? {};
      const exact14 = payload.exactBucket14?.summary ?? {};
      const wld12 = payload.wldBucket12?.summary ?? {};
      return {
        exactBucket10: {
          cases: exact10.count ?? null,
          moveAgreementVsBaseline: exact10.fastestFirstVsBaselineMoveAgreement ?? null,
          outcomeAgreementVsBaseline: exact10.fastestFirstVsBaselineOutcomeAgreement ?? null,
          scoreAgreementVsBaseline: exact10.fastestFirstVsBaselineScoreAgreement ?? null,
          elapsedRatioCandidateVsBaseline: ratio(exact10.fastestFirst?.elapsedMs, exact10.baseline?.elapsedMs),
          nodeRatioCandidateVsBaseline: ratio(exact10.fastestFirst?.nodes, exact10.baseline?.nodes),
        },
        exactBucket14: {
          cases: exact14.count ?? null,
          moveAgreementVsBaseline: exact14.fastestFirstVsBaselineMoveAgreement ?? null,
          outcomeAgreementVsBaseline: exact14.fastestFirstVsBaselineOutcomeAgreement ?? null,
          scoreAgreementVsBaseline: exact14.fastestFirstVsBaselineScoreAgreement ?? null,
          elapsedRatioCandidateVsBaseline: ratio(exact14.fastestFirst?.elapsedMs, exact14.baseline?.elapsedMs),
          nodeRatioCandidateVsBaseline: ratio(exact14.fastestFirst?.nodes, exact14.baseline?.nodes),
        },
        wldBucket12: {
          cases: wld12.count ?? null,
          moveAgreementVsBaseline: wld12.fastestFirstVsBaselineMoveAgreement ?? null,
          outcomeAgreementVsBaseline: wld12.fastestFirstVsBaselineOutcomeAgreement ?? null,
          scoreAgreementVsBaseline: wld12.fastestFirstVsBaselineScoreAgreement ?? null,
          elapsedRatioCandidateVsBaseline: ratio(wld12.fastestFirst?.elapsedMs, wld12.baseline?.elapsedMs),
          nodeRatioCandidateVsBaseline: ratio(wld12.fastestFirst?.nodes, wld12.baseline?.nodes),
        },
      };
    }
    case 'wld_pre_exact': {
      const exactRef = payload.exactReferenceSection?.summary ?? {};
      const holdout = payload.blackHoldoutSection?.summary ?? {};
      return {
        exactReferenceSection: {
          cases: exactRef.count ?? null,
          candidateMoveAgreementVsExactReference: exactRef.candidateMoveAgreementVsExactReference ?? null,
          candidateOutcomeAgreementVsExactReference: exactRef.candidateOutcomeAgreementVsExactReference ?? null,
          baselineOutcomeAgreementVsExactReference: exactRef.baselineOutcomeAgreementVsExactReference ?? null,
          elapsedRatioCandidateVsBaseline: exactRef.elapsedRatioCandidateVsBaseline ?? null,
          nodeRatioCandidateVsBaseline: exactRef.nodeRatioCandidateVsBaseline ?? null,
          candidateWldModes: exactRef.candidateWldModes ?? null,
        },
        blackHoldoutSection: {
          cases: holdout.count ?? null,
          candidateWldModes: holdout.candidateWldModes ?? null,
          candidateComplete: holdout.candidateComplete ?? null,
          candidateFallbacks: holdout.candidateFallbacks ?? null,
          elapsedRatioCandidateVsBaseline: holdout.elapsedRatioCandidateVsBaseline ?? null,
          nodeRatioCandidateVsBaseline: holdout.nodeRatioCandidateVsBaseline ?? null,
          allBlack: holdout.allBlack ?? null,
        },
      };
    }
    default:
      return {};
  }
}

function runNodeScript(scriptPath, outputPath) {
  console.error(`\n>>> Running ${path.relative(PROJECT_ROOT, scriptPath)} -> ${path.relative(PROJECT_ROOT, outputPath)}`);
  const child = spawnSync(process.execPath, [scriptPath, outputPath], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
  });
  if (child.status !== 0) {
    throw new Error(`Benchmark script failed: ${scriptPath}`);
  }
}

async function main() {
  const outputDir = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_OUTPUT_DIR;
  await fs.mkdir(outputDir, { recursive: true });

  const results = [];
  for (const entry of SUITE) {
    const outputPath = path.join(outputDir, entry.outputFile);
    runNodeScript(entry.script, outputPath);
    const payload = await loadJson(outputPath);
    results.push({
      ...entry,
      outputPath,
      summary: summarizePayload(entry.key, payload),
    });
  }

  const suiteSummary = {
    benchmark: 'Stage 82 remaining adopted non-MPC candidate suite',
    description: 'Reruns the remaining adopted endgame/runtime micro-candidates on the current code root after the later TT/ETC/MPC work, so they can be judged quickly before any larger refactor pass.',
    outputDir,
    generatedAt: new Date().toISOString(),
    results,
  };

  const suiteSummaryPath = path.join(outputDir, 'suite-summary.json');
  await fs.writeFile(suiteSummaryPath, `${JSON.stringify(suiteSummary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ suiteSummaryPath, results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
