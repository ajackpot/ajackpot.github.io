import assert from 'node:assert/strict';

import { compileMpcProfile } from '../ai/evaluation-profiles.js';
import { SearchEngine } from '../ai/search-engine.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

const syntheticMpcProfile = Object.freeze({
  version: 1,
  name: 'stage71-mpc-smoke',
  description: 'stage71 conservative runtime MPC smoke profile',
  calibrations: [
    {
      key: 'stage71-all-d4-d8',
      label: '18-60 / d4→d8',
      minEmpties: 18,
      maxEmpties: 60,
      shallowDepth: 4,
      deepDepth: 8,
      usable: true,
      regression: {
        intercept: 100_000_000,
        slope: 1,
        correlation: 0.999,
        rSquared: 0.998,
      },
      recommendedZ: {
        z: 1,
        coverage: 1,
        intervalHalfWidth: 1,
      },
    },
  ],
});

const compiled = compileMpcProfile(syntheticMpcProfile);
assert.ok(compiled, 'Synthetic MPC profile should compile.');
assert.equal(compiled.usableCalibrations.length, 1, 'Synthetic MPC profile should expose one usable calibration.');
assert.equal(compiled.calibrationsByEmptyCount[30]?.[0]?.key, 'stage71-all-d4-d8', 'Compiled MPC profile should map the calibration into its empties band.');

const testState = playSeededRandomUntilEmptyCount(30, 7);
const sharedOptions = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 8,
  timeLimitMs: 2500,
  exactEndgameEmpties: 8,
  aspirationWindow: 40,
  randomness: 0,
  maxTableEntries: 140000,
  wldPreExactEmpties: 0,
});

const baselineEngine = new SearchEngine({
  ...sharedOptions,
  mpcProfile: null,
});
const baselineResult = baselineEngine.findBestMove(testState);
assert.equal(baselineResult.searchCompletion, 'complete', 'Baseline search should complete in the MPC runtime smoke.');
assert.ok(baselineResult.bestMoveCoord, 'Baseline search should return a best move in the MPC runtime smoke.');

const candidateEngine = new SearchEngine({
  ...sharedOptions,
  mpcProfile: syntheticMpcProfile,
});
const candidateResult = candidateEngine.findBestMove(testState);
assert.equal(candidateResult.searchCompletion, 'complete', 'MPC-enabled search should complete in the runtime smoke.');
assert.ok(candidateResult.bestMoveCoord, 'MPC-enabled search should still return a best move.');
assert.equal(candidateResult.options?.mpcProfile?.name, 'stage71-mpc-smoke', 'MPC-enabled search should report the active MPC profile in its options snapshot.');
assert.ok(candidateResult.stats.mpcProbes > 0, 'MPC-enabled search should execute at least one probe in the runtime smoke.');
assert.ok(candidateResult.stats.mpcHighCutoffs > 0, 'MPC-enabled search should execute at least one fail-high MPC cutoff in the runtime smoke.');
assert.equal(candidateResult.stats.mpcLowCutoffs, 0, 'The conservative runtime MPC smoke only enables the fail-high branch.');
assert.ok(
  candidateResult.stats.nodes < baselineResult.stats.nodes,
  'The synthetic MPC smoke profile should reduce searched nodes versus the baseline search.',
);

console.log('stage71_mpc_runtime_smoke: all assertions passed');
