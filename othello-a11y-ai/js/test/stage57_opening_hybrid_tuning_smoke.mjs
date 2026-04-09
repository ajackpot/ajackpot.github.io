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
  resolveOpeningHybridTuning,
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

const initialState = GameState.initial();

const defaultEngine = new SearchEngine({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 3,
  timeLimitMs: 250,
  exactEndgameEmpties: 8,
  openingRandomness: 0,
  searchRandomness: 0,
});
const defaultOpening = defaultEngine.findBestMove(initialState);
assert.equal(defaultOpening.source, 'opening-book', 'default stage57 tuning should still allow direct opening-book use on the initial board');
assert.equal(defaultOpening.options.openingTuningKey, DEFAULT_OPENING_HYBRID_TUNING_KEY);

const searchReferenceEngine = new SearchEngine({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 3,
  timeLimitMs: 250,
  exactEndgameEmpties: 8,
  openingRandomness: 0,
  searchRandomness: 0,
  openingTuningKey: 'search-reference',
});
const referenceOpening = searchReferenceEngine.findBestMove(initialState);
assert.equal(referenceOpening.source, 'search', 'search-reference tuning should disable direct opening-book returns for benchmarking');
assert.equal(referenceOpening.options.openingTuningKey, 'search-reference');

const tunedProfile = getOpeningHybridTuningProfile('stage57-book-led');
assert.ok(tunedProfile.orderingOffBookPriorScale < 1, 'book-led tuning should reduce off-book prior ordering');
assert.ok(tunedProfile.mediumConfidenceScoreGap < getOpeningHybridTuningProfile('stage56-legacy').mediumConfidenceScoreGap);

const overridden = resolveOpeningHybridTuning('stage57-book-led', {
  directUseMaxPly: 4,
  orderingOffBookPriorScale: 0.1,
});
assert.equal(overridden.directUseMaxPly, 4);
assert.equal(overridden.orderingOffBookPriorScale, 0.1);
assert.equal(overridden.key, 'stage57-book-led+override');

const bondState = stateFromSequence('F5D6C3D3C4F4F6G5E6');
const legacyBond = new SearchEngine({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 4,
  timeLimitMs: 450,
  exactEndgameEmpties: 8,
  openingRandomness: 0,
  searchRandomness: 0,
  openingTuningKey: 'stage56-legacy',
}).findBestMove(bondState);
const tunedBond = new SearchEngine({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 4,
  timeLimitMs: 450,
  exactEndgameEmpties: 8,
  openingRandomness: 0,
  searchRandomness: 0,
  openingTuningKey: 'stage57-book-led',
}).findBestMove(bondState);
assert.equal(legacyBond.bestMoveCoord, 'C5');
assert.equal(legacyBond.source, 'search');
assert.equal(tunedBond.bestMoveCoord, 'D7');
assert.equal(tunedBond.source, 'opening-book', 'book-led tuning should reclaim the named Bond continuation as a direct opening-book move');

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage57-opening-bench-'));
const outputJsonPath = path.join(tempDir, 'opening-hybrid-benchmark.json');
const benchmarkRun = spawnSync(process.execPath, [
  path.join(process.cwd(), 'tools/evaluator-training/benchmark-opening-hybrid-tuning.mjs'),
  '--profile-keys', 'stage56-legacy,stage57-book-led',
  '--min-ply', '0',
  '--max-ply', '4',
  '--state-limit', '12',
  '--candidate-max-depth', '2',
  '--candidate-time-limit-ms', '180',
  '--candidate-exact-endgame-empties', '6',
  '--reference-max-depth', '3',
  '--reference-time-limit-ms', '260',
  '--reference-exact-endgame-empties', '6',
  '--repetitions', '1',
  '--output-json', outputJsonPath,
], {
  cwd: process.cwd(),
  encoding: 'utf8',
});
assert.equal(benchmarkRun.status, 0, `benchmark-opening-hybrid-tuning should succeed:\nSTDOUT:\n${benchmarkRun.stdout}\nSTDERR:\n${benchmarkRun.stderr}`);

const summary = JSON.parse(await fs.readFile(outputJsonPath, 'utf8'));
assert.equal(summary.corpus.stateCount, 12);
assert.equal(summary.profiles.length, 2);
assert.ok(summary.ranking.length >= 2);
assert.equal(summary.benchmarkConfig.reference.openingTuningKey, 'search-reference');
assert.ok(summary.profiles.every((profile) => Number.isFinite(profile.agreementRate)));

console.log('stage57 opening hybrid tuning smoke passed');
