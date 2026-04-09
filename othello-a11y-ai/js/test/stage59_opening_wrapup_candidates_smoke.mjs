import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { GameState } from '../core/game-state.js';
import { SearchEngine } from '../ai/search-engine.js';
import {
  DEFAULT_OPENING_HYBRID_TUNING_KEY,
  getOpeningHybridTuningProfile,
  listOpeningHybridTuningProfiles,
} from '../ai/opening-tuning.js';

function stateFromSequence(sequence) {
  let state = GameState.initial();
  for (let cursor = 0; cursor < sequence.length; cursor += 2) {
    const coord = sequence.slice(cursor, cursor + 2);
    const legalMove = state.getLegalMoves().find((move) => move.coord === coord);
    assert.ok(legalMove, `sequence move should be legal: ${coord}`);
    state = state.applyMove(legalMove.index).state;
  }
  return state;
}

const tuningKeys = new Set(listOpeningHybridTuningProfiles().map((profile) => profile.key));
assert.ok(tuningKeys.has('stage59-prior-veto'));
assert.ok(tuningKeys.has('stage59-cap9'));
assert.ok(tuningKeys.has('stage59-cap9-prior-veto'));
assert.equal(DEFAULT_OPENING_HYBRID_TUNING_KEY, 'stage59-cap9-prior-veto');

const defaultProfile = getOpeningHybridTuningProfile(DEFAULT_OPENING_HYBRID_TUNING_KEY);
assert.equal(defaultProfile.directUseMaxPly, 9);
assert.equal(defaultProfile.priorContradictionVetoMinPly, 4);
assert.equal(defaultProfile.priorContradictionVetoMinCount, 2000);
assert.equal(defaultProfile.priorContradictionVetoMinRank, 2);
assert.equal(defaultProfile.priorContradictionVetoMinShareDelta, 0.08);

const contradictionState = stateFromSequence('C4E3F5E6');
const stage57Engine = new SearchEngine({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 4,
  timeLimitMs: 450,
  exactEndgameEmpties: 10,
  openingRandomness: 0,
  searchRandomness: 0,
  openingTuningKey: 'stage57-book-led',
});
const priorVetoEngine = new SearchEngine({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 4,
  timeLimitMs: 450,
  exactEndgameEmpties: 10,
  openingRandomness: 0,
  searchRandomness: 0,
  openingTuningKey: 'stage59-prior-veto',
});
const legacyContradiction = stage57Engine.findBestMove(contradictionState);
const vetoContradiction = priorVetoEngine.findBestMove(contradictionState);
assert.equal(legacyContradiction.source, 'opening-book');
assert.equal(legacyContradiction.bestMoveCoord, 'F4');
assert.equal(vetoContradiction.source, 'search');
assert.equal(vetoContradiction.bestMoveCoord, 'F6');
assert.ok((vetoContradiction.stats?.openingPriorContradictionVetoes ?? 0) >= 1);
assert.equal(vetoContradiction.bookHit?.priorContradictionVeto?.bestMoveCoord, 'F6');
assert.equal(vetoContradiction.bookHit?.priorContradictionVeto?.selectedMoveCoord, 'F4');

const capState = stateFromSequence('C4C3D3C5B3F4B5B4C6D6');
const defaultEngine = new SearchEngine({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 4,
  timeLimitMs: 450,
  exactEndgameEmpties: 10,
  openingRandomness: 0,
  searchRandomness: 0,
  openingTuningKey: DEFAULT_OPENING_HYBRID_TUNING_KEY,
});
const defaultCapResult = defaultEngine.findBestMove(capState);
const stage57CapResult = stage57Engine.findBestMove(capState);
assert.equal(stage57CapResult.source, 'opening-book');
assert.equal(stage57CapResult.bestMoveCoord, 'F5');
assert.equal(defaultCapResult.source, 'search');
assert.equal(defaultCapResult.stats?.openingPriorContradictionVetoes ?? 0, 0, 'ply-cap fallback should not count as a contradiction veto');

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage59-opening-bench-'));
const outputJsonPath = path.join(tempDir, 'opening-wrapup-candidates.json');
const benchmarkRun = spawnSync(process.execPath, [
  path.join(process.cwd(), 'tools/evaluator-training/benchmark-opening-hybrid-tuning.mjs'),
  '--profile-keys', 'stage57-book-led,stage57-prior-light,stage59-prior-veto,stage59-cap9,stage59-cap9-prior-veto',
  '--reference-scenarios', 'stage57-baseline,stage58-strong-assisted,stage58-strong-pure',
  '--min-ply', '0',
  '--max-ply', '6',
  '--state-limit', '20',
  '--candidate-max-depth', '2',
  '--candidate-time-limit-ms', '180',
  '--candidate-exact-endgame-empties', '6',
  '--repetitions', '1',
  '--output-json', outputJsonPath,
], {
  cwd: process.cwd(),
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 32,
});
assert.equal(benchmarkRun.status, 0, `stage59 opening wrap-up candidate benchmark should succeed:\nSTDOUT:\n${benchmarkRun.stdout}\nSTDERR:\n${benchmarkRun.stderr}`);

const summary = JSON.parse(await fs.readFile(outputJsonPath, 'utf8'));
assert.equal(summary.referenceScenarios.length, 3);
assert.ok(summary.overallProfiles.some((profile) => profile.profileKey === 'stage59-prior-veto'));
assert.ok(summary.overallProfiles.some((profile) => profile.profileKey === 'stage59-cap9-prior-veto'));
assert.ok(summary.overallRanking.every((profile) => Number.isFinite(profile.worstAgreementRate)));

const replayOutputJsonPath = path.join(tempDir, 'opening-wrapup-replay.json');
const replayRun = spawnSync(process.execPath, [
  path.join(process.cwd(), 'tools/evaluator-training/replay-opening-hybrid-reference-suite.mjs'),
  '--profile-keys', 'stage57-book-led,stage59-prior-veto,stage59-cap9-prior-veto',
  '--output-json', replayOutputJsonPath,
], {
  cwd: process.cwd(),
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 32,
});
assert.equal(replayRun.status, 0, `stage59 replay opening benchmark should succeed:
STDOUT:
${replayRun.stdout}
STDERR:
${replayRun.stderr}`);

const replaySummary = JSON.parse(await fs.readFile(replayOutputJsonPath, 'utf8'));
assert.equal(replaySummary.corpus.stateCount, 182);
assert.equal(replaySummary.profiles.length, 3);
assert.equal(replaySummary.ranking[0].profileKey, 'stage59-cap9-prior-veto');
assert.ok(replaySummary.ranking[0].worstAgreementRate >= replaySummary.ranking[1].worstAgreementRate);

console.log('stage59 opening wrap-up candidates smoke passed');
