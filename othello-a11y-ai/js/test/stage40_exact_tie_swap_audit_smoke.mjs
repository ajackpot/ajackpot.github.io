import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

import { resolveProjectPath } from '../../tools/evaluator-training/lib.mjs';

const repoRoot = resolveProjectPath();
const evaluationProfilePath = resolveProjectPath('tools', 'evaluator-training', 'out', 'trained-evaluation-profile.json');
const candidateCProfilePath = resolveProjectPath('tools', 'evaluator-training', 'out', 'stage39_candidateC_before_candidateD.json');
const candidateDProfilePath = resolveProjectPath('tools', 'evaluator-training', 'out', 'stage39_candidateD_fallback10_10.json');
const auditOutputPath = resolveProjectPath('benchmarks', 'stage40_exact_tie_swap_audit_smoke.json');
const tuningNoFlagOutputPath = resolveProjectPath('benchmarks', 'stage40_tie_swap_tuner_without_flag_smoke.json');
const tuningWithFlagOutputPath = resolveProjectPath('benchmarks', 'stage40_tie_swap_tuner_with_flag_smoke.json');
const tuningWithFlagBestProfilePath = resolveProjectPath('tools', 'evaluator-training', 'out', 'stage40_tie_swap_tuner_best_smoke.json');

const auditResult = spawnSync(
  process.execPath,
  [
    path.join(repoRoot, 'tools', 'evaluator-training', 'audit-exact-best-move-tie-swaps.mjs'),
    '--evaluation-profile', evaluationProfilePath,
    '--reference-profile', candidateCProfilePath,
    '--candidate-profile', candidateDProfilePath,
    '--empties', '11',
    '--seed-start', '21',
    '--seed-count', '1',
    '--time-limit-ms', '4000',
    '--max-depth', '12',
    '--exact-endgame-empties', '14',
    '--enumerate-all-legal-moves',
    '--output-json', auditOutputPath,
  ],
  {
    cwd: repoRoot,
    encoding: 'utf8',
  },
);

if (auditResult.status !== 0) {
  console.error(auditResult.stdout);
  console.error(auditResult.stderr);
}
assert.equal(auditResult.status, 0, 'stage40 exact tie-swap audit smoke should succeed');
assert.ok(fs.existsSync(auditOutputPath), 'stage40 exact tie-swap audit JSON should be created');

const auditParsed = JSON.parse(fs.readFileSync(auditOutputPath, 'utf8'));
assert.equal(auditParsed.summary.totalCases, 1);
assert.equal(auditParsed.summary.rawBestMoveMismatchCases, 1);
assert.equal(auditParsed.summary.verifiedTieSwapCases, 1);
assert.equal(auditParsed.summary.unverifiedBestMoveMismatchCases, 0);
assert.equal(auditParsed.cases[0]?.reference?.bestMove, 'F1');
assert.equal(auditParsed.cases[0]?.candidate?.bestMove, 'H2');
assert.equal(auditParsed.cases[0]?.audit?.verifiedTieSwap, true);
assert.ok(auditParsed.cases[0]?.audit?.optimalMoves?.includes('F1'));
assert.ok(auditParsed.cases[0]?.audit?.optimalMoves?.includes('H2'));

function runTuner(outputJsonPath, { allowFlag, bestProfilePath = null }) {
  const args = [
    path.join(repoRoot, 'tools', 'evaluator-training', 'tune-move-ordering-search-cost.mjs'),
    '--evaluation-profile', evaluationProfilePath,
    '--base-profile', candidateCProfilePath,
    '--features', 'mobility',
    '--feature-scales', '1',
    '--ranges', '10-10',
    '--fallback-ranges', '10-10',
    '--max-rounds', '1',
    '--max-actions-per-round', '4',
    '--depth-empties', '15',
    '--exact-empties', '11',
    '--seed-start', '21',
    '--seed-count', '1',
    '--repetitions', '1',
    '--time-limit-ms', '1500',
    '--max-depth', '6',
    '--depth-exact-endgame-empties', '10',
    '--exact-time-limit-ms', '4000',
    '--exact-max-depth', '12',
    '--exact-endgame-empties', '14',
    '--depth-weight', '0',
    '--exact-weight', '1',
    '--output-json', outputJsonPath,
  ];
  if (bestProfilePath) {
    args.push('--best-profile-json', bestProfilePath);
  }
  if (allowFlag) {
    args.push('--allow-verified-exact-tie-swaps');
  }
  return spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

const tuningNoFlagResult = runTuner(tuningNoFlagOutputPath, { allowFlag: false });
if (tuningNoFlagResult.status !== 0) {
  console.error(tuningNoFlagResult.stdout);
  console.error(tuningNoFlagResult.stderr);
}
assert.equal(tuningNoFlagResult.status, 0, 'stage40 tuner smoke without tie-swap flag should succeed');
const tuningNoFlagParsed = JSON.parse(fs.readFileSync(tuningNoFlagOutputPath, 'utf8'));
assert.equal(tuningNoFlagParsed.options.allowVerifiedExactTieSwaps, false);
assert.equal(tuningNoFlagParsed.rounds.length, 1);
assert.equal(tuningNoFlagParsed.rounds[0]?.candidateCount, 1);
assert.equal(tuningNoFlagParsed.rounds[0]?.selectedCandidate, null);
assert.equal(tuningNoFlagParsed.rounds[0]?.candidates?.[0]?.agreement?.exactBestMoveMismatches, 1);
assert.equal(tuningNoFlagParsed.rounds[0]?.candidates?.[0]?.agreement?.verifiedExactTieSwapCount, 0);
assert.equal(tuningNoFlagParsed.rounds[0]?.candidates?.[0]?.agreement?.effectiveExactBestMoveMismatches, 1);

const tuningWithFlagResult = runTuner(tuningWithFlagOutputPath, {
  allowFlag: true,
  bestProfilePath: tuningWithFlagBestProfilePath,
});
if (tuningWithFlagResult.status !== 0) {
  console.error(tuningWithFlagResult.stdout);
  console.error(tuningWithFlagResult.stderr);
}
assert.equal(tuningWithFlagResult.status, 0, 'stage40 tuner smoke with tie-swap flag should succeed');
assert.ok(fs.existsSync(tuningWithFlagBestProfilePath), 'stage40 tuner smoke with flag should write best profile JSON');
const tuningWithFlagParsed = JSON.parse(fs.readFileSync(tuningWithFlagOutputPath, 'utf8'));
assert.equal(tuningWithFlagParsed.options.allowVerifiedExactTieSwaps, true);
assert.equal(tuningWithFlagParsed.rounds.length, 1);
assert.equal(tuningWithFlagParsed.rounds[0]?.candidateCount, 1);
assert.equal(tuningWithFlagParsed.rounds[0]?.selectedCandidate?.actionLabel, 'fallback@10-10');
assert.equal(tuningWithFlagParsed.rounds[0]?.candidates?.[0]?.agreement?.exactBestMoveMismatches, 1);
assert.equal(tuningWithFlagParsed.rounds[0]?.candidates?.[0]?.agreement?.verifiedExactTieSwapCount, 1);
assert.equal(tuningWithFlagParsed.rounds[0]?.candidates?.[0]?.agreement?.effectiveExactBestMoveMismatches, 0);
assert.equal(tuningWithFlagParsed.rounds[0]?.candidates?.[0]?.acceptable, true);

const tuningWithFlagBestProfileParsed = JSON.parse(fs.readFileSync(tuningWithFlagBestProfilePath, 'utf8'));
assert.equal(tuningWithFlagBestProfileParsed.stage?.status, 'derived-search-cost-local-search');

console.log('stage40 exact tie-swap audit smoke passed');
