import assert from 'node:assert/strict';

import { ACTIVE_MPC_PROFILE } from '../ai/evaluation-profiles.js';
import { SearchEngine } from '../ai/search-engine.js';
import { EngineClient } from '../ui/engine-client.js';
import {
  playSeededRandomUntilEmptyCount,
  runMedianSearch,
} from './benchmark-helpers.mjs';

const ACTIVE_MPC_NAME = ACTIVE_MPC_PROFILE?.name ?? null;
assert.ok(ACTIVE_MPC_NAME, 'An active MPC profile should be installed before the default parity smoke runs.');

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

const testState = playSeededRandomUntilEmptyCount(24, 3);

const bareEngine = new SearchEngine();
assert.equal(
  bareEngine.options?.mpcProfile?.name ?? null,
  ACTIVE_MPC_NAME,
  'Bare SearchEngine construction should inherit the installed active MPC profile by default.',
);

const directEngine = new SearchEngine(sharedOptions);
const directResult = directEngine.findBestMove(testState);
assert.equal(
  directResult.options?.mpcProfile?.name ?? null,
  ACTIVE_MPC_NAME,
  'Direct SearchEngine calls should expose the installed active MPC profile in the result snapshot by default.',
);
assert.ok(
  (directResult.stats?.mpcProbes ?? 0) > 0,
  'The representative MPC-trigger state should execute at least one MPC probe under the default direct path.',
);

const explicitNullEngine = new SearchEngine({
  ...sharedOptions,
  mpcProfile: null,
});
const explicitNullResult = explicitNullEngine.findBestMove(testState);
assert.equal(
  explicitNullResult.options?.mpcProfile?.name ?? null,
  null,
  'Explicit mpcProfile: null should still disable MPC on the initial search.',
);
assert.equal(
  explicitNullResult.stats?.mpcProbes ?? 0,
  0,
  'Explicit mpcProfile: null should disable runtime MPC probes on the initial search.',
);

const preservedNullResult = explicitNullEngine.findBestMove(testState, {
  ...sharedOptions,
  timeLimitMs: 2600,
});
assert.equal(
  preservedNullResult.options?.mpcProfile?.name ?? null,
  null,
  'Once an engine is explicitly pinned to mpcProfile: null, follow-up overrides without mpcProfile should preserve the disabled state.',
);
assert.equal(
  preservedNullResult.stats?.mpcProbes ?? 0,
  0,
  'Follow-up overrides without mpcProfile should preserve the disabled MPC path after an explicit null opt-out.',
);

const helperSummary = runMedianSearch(testState, sharedOptions, 1).summary;
assert.equal(
  helperSummary.mpcProfileName,
  ACTIVE_MPC_NAME,
  'benchmark-helpers should now report the installed active MPC profile when no explicit override is given.',
);
assert.ok(
  (helperSummary.mpcProbes ?? 0) > 0,
  'benchmark-helpers should preserve the representative MPC-trigger behavior on the default path.',
);

const helperNullSummary = runMedianSearch(testState, {
  ...sharedOptions,
  mpcProfile: null,
}, 1).summary;
assert.equal(
  helperNullSummary.mpcProfileName,
  null,
  'benchmark-helpers should keep respecting explicit mpcProfile: null opt-outs.',
);
assert.equal(
  helperNullSummary.mpcProbes ?? 0,
  0,
  'benchmark-helpers should keep respecting explicit mpcProfile: null opt-outs during search.',
);

const client = new EngineClient();
const clientResult = await client.search(testState, sharedOptions);
assert.equal(
  clientResult.options?.mpcProfile?.name ?? null,
  ACTIVE_MPC_NAME,
  'EngineClient fallback should still report the installed active MPC profile.',
);
assert.equal(
  clientResult.bestMoveCoord,
  directResult.bestMoveCoord,
  'EngineClient fallback and direct SearchEngine should agree on the best move under the same default MPC semantics.',
);
assert.equal(
  clientResult.score,
  directResult.score,
  'EngineClient fallback and direct SearchEngine should agree on the score under the same default MPC semantics.',
);
assert.ok(
  (clientResult.stats?.mpcProbes ?? 0) > 0,
  'EngineClient fallback should keep exercising runtime MPC on the representative trigger state.',
);

console.log('stage121_active_mpc_default_parity_smoke: all assertions passed');
