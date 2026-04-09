import assert from 'node:assert/strict';

import { CUSTOM_ENGINE_FIELDS, resolveEngineOptions } from '../ai/presets.js';
import { SearchEngine } from '../ai/search-engine.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

const wldField = CUSTOM_ENGINE_FIELDS.find((field) => field.key === 'wldPreExactEmpties');
assert.ok(wldField, 'Custom preset fields should expose the WLD pre-exact option.');
assert.equal(wldField.type, 'select', 'The WLD pre-exact option should render as an explicit select field.');
assert.deepEqual(
  wldField.options?.map((option) => option.value),
  [0, 2],
  'The custom WLD pre-exact option should only offer disabled or +2 modes.',
);

const customDefault = resolveEngineOptions('custom', {}, 'balanced');
const customEnabled = resolveEngineOptions('custom', { wldPreExactEmpties: '2' }, 'balanced');
assert.equal(customDefault.wldPreExactEmpties, 0, 'Custom preset should keep WLD pre-exact mode disabled by default.');
assert.equal(customEnabled.wldPreExactEmpties, 2, 'Custom preset should accept the explicit +2 WLD pre-exact setting.');
assert.equal(new SearchEngine({ presetKey: 'expert' }).options.wldPreExactEmpties, 0, 'Expert preset should no longer auto-enable the WLD pre-exact window.');
assert.equal(new SearchEngine({ presetKey: 'impossible' }).options.wldPreExactEmpties, 0, 'Impossible preset should no longer auto-enable the WLD pre-exact window.');

const nearEndgameState = playSeededRandomUntilEmptyCount(12, 23);
const sharedNearEndgameOptions = {
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 6,
  exactEndgameEmpties: 10,
  aspirationWindow: 0,
  timeLimitMs: 1600,
  randomness: 0,
};
const wldOffEngine = new SearchEngine({
  ...sharedNearEndgameOptions,
  wldPreExactEmpties: 0,
});
const wldOnEngine = new SearchEngine({
  ...sharedNearEndgameOptions,
  wldPreExactEmpties: 2,
});

const wldOffResult = wldOffEngine.findBestMove(nearEndgameState);
const wldOnResult = wldOnEngine.findBestMove(nearEndgameState);
assert.notEqual(wldOffResult.searchMode, 'wld-endgame', 'Disabling the custom WLD option should keep 12-empties roots on the ordinary path.');
assert.equal(wldOnResult.searchMode, 'wld-endgame', 'Enabling the custom WLD option should route 12-empties roots into the WLD pre-exact search.');

const transpositionProbeState = playSeededRandomUntilEmptyCount(16, 41);
const tableSemanticsEngine = new SearchEngine({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 5,
  exactEndgameEmpties: 10,
  aspirationWindow: 0,
  timeLimitMs: 700,
  randomness: 0,
  wldPreExactEmpties: 0,
});
const probeResult = tableSemanticsEngine.findBestMove(transpositionProbeState);
assert.ok(probeResult.stats.nodes > 0, 'The WLD table-semantics smoke should populate the transposition table through a real search.');
const tableSizeBeforeEquivalentUpdate = tableSemanticsEngine.transpositionTable.size;
assert.ok(tableSizeBeforeEquivalentUpdate > 0, 'The transposition-table regression needs cached entries before the option flip.');

tableSemanticsEngine.updateOptions({
  ...sharedNearEndgameOptions,
  maxDepth: 5,
  timeLimitMs: 700,
  wldPreExactEmpties: 0,
});
assert.equal(
  tableSemanticsEngine.transpositionTable.size,
  tableSizeBeforeEquivalentUpdate,
  'Keeping the same explicit WLD pre-exact setting should preserve the current transposition table.',
);

tableSemanticsEngine.updateOptions({
  ...sharedNearEndgameOptions,
  maxDepth: 5,
  timeLimitMs: 700,
  wldPreExactEmpties: 2,
});
assert.equal(
  tableSemanticsEngine.transpositionTable.size,
  0,
  'Flipping the explicit WLD pre-exact setting should clear the transposition table because root search semantics changed.',
);

console.log('stage83 custom WLD toggle smoke passed');
