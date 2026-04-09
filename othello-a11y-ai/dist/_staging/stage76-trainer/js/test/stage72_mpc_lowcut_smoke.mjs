import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

const syntheticLowCutProfile = Object.freeze({
  version: 1,
  name: 'stage72-mpc-lowcut-smoke',
  description: 'stage72 fail-low runtime MPC smoke profile',
  runtime: {
    enableHighCut: false,
    enableLowCut: true,
    maxWindow: 1,
    maxChecksPerNode: 1,
    minDepth: 2,
    minDepthGap: 2,
    maxDepthDistance: 1,
    minPly: 1,
    highScale: 1,
    lowScale: 1,
    depthDistanceScale: 1.25,
  },
  calibrations: [
    {
      key: 'stage72-all-d4-d8',
      label: '18-60 / d4→d8',
      minEmpties: 18,
      maxEmpties: 60,
      shallowDepth: 4,
      deepDepth: 8,
      usable: true,
      regression: {
        intercept: -100_000_000,
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

const testState = playSeededRandomUntilEmptyCount(30, 9);
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
assert.equal(baselineResult.searchCompletion, 'complete', 'Baseline low-cut smoke search should complete.');
assert.ok(baselineResult.bestMoveCoord, 'Baseline low-cut smoke should return a best move.');

const candidateEngine = new SearchEngine({
  ...sharedOptions,
  mpcProfile: syntheticLowCutProfile,
});
const candidateResult = candidateEngine.findBestMove(testState);
assert.equal(candidateResult.searchCompletion, 'complete', 'Low-cut MPC search should complete in the runtime smoke.');
assert.ok(candidateResult.bestMoveCoord, 'Low-cut MPC search should still return a best move.');
assert.equal(candidateResult.options?.mpcProfile?.name, 'stage72-mpc-lowcut-smoke', 'Low-cut MPC search should report the active MPC profile in its options snapshot.');
assert.ok(candidateResult.stats.mpcProbes > 0, 'Low-cut MPC smoke should execute at least one probe.');
assert.equal(candidateResult.stats.mpcHighProbes, 0, 'Low-cut MPC smoke disables the fail-high branch.');
assert.ok(candidateResult.stats.mpcLowProbes > 0, 'Low-cut MPC smoke should execute at least one fail-low probe.');
assert.ok(candidateResult.stats.mpcLowCutoffs > 0, 'Low-cut MPC smoke should execute at least one fail-low cutoff.');
assert.notEqual(
  candidateResult.stats.mpcLowCutoffs,
  0,
  'The synthetic low-cut MPC smoke profile should exercise the fail-low cutoff branch.',
);

console.log('stage72_mpc_lowcut_smoke: all assertions passed');
