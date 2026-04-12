import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

function createEngine(overrides = {}) {
  return new SearchEngine({
    presetKey: 'custom',
    styleKey: 'balanced',
    searchAlgorithm: 'mcts-hybrid',
    timeLimitMs: 120,
    maxDepth: 4,
    exactEndgameEmpties: 8,
    wldPreExactEmpties: 0,
    mctsSolverEnabled: true,
    mctsSolverWldEmpties: 2,
    mctsExactContinuationEnabled: false,
    mctsExactContinuationExtraEmpties: 0,
    openingRandomness: 0,
    searchRandomness: 0,
    randomness: 0,
    maxTableEntries: 90000,
    ...overrides,
  });
}

const lateWldState = playSeededRandomUntilEmptyCount(10, 17);
const solverOnWld = createEngine().findBestMove(lateWldState);
assert.equal(solverOnWld.searchMode, 'mcts-hybrid');
assert.equal(solverOnWld.isWldResult, true);
assert.equal(solverOnWld.wldOutcome, 'win');
assert.equal(solverOnWld.mctsRootSolvedOutcome, 'win');
assert.equal(solverOnWld.mctsRootSolvedExact, false);
assert.ok((solverOnWld.stats?.mctsSolverStateProbes ?? 0) > 0);
assert.ok((solverOnWld.stats?.mctsSolverWldHits ?? 0) > 0);
assert.ok((solverOnWld.stats?.mctsSolverRootProofs ?? 0) > 0);
assert.ok(solverOnWld.analyzedMoves.some((move) => move.solvedOutcome === 'win'));

const solverOffWld = createEngine({ mctsSolverEnabled: false }).findBestMove(lateWldState);
assert.equal(solverOffWld.isWldResult, false);
assert.equal(solverOffWld.mctsRootSolvedOutcome, null);
assert.equal(solverOffWld.stats?.mctsSolverStateProbes ?? 0, 0);
assert.equal(solverOffWld.stats?.mctsSolverWldHits ?? 0, 0);
assert.equal(solverOffWld.stats?.mctsSolverRootProofs ?? 0, 0);

const lateExactChildState = playSeededRandomUntilEmptyCount(9, 17);
const solverOnExact = createEngine().findBestMove(lateExactChildState);
assert.equal(solverOnExact.searchMode, 'mcts-hybrid');
assert.ok((solverOnExact.stats?.mctsSolverExactHits ?? 0) > 0);
assert.ok(solverOnExact.analyzedMoves.some((move) => move.solvedExact === true));
assert.ok(
  solverOnExact.isExactResult
  || solverOnExact.analyzedMoves.some((move) => Number.isFinite(move.solvedScore)),
);

console.log('stage100 mcts solver runtime smoke passed');
