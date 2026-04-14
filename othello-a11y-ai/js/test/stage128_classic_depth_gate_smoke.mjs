import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import { createRegressionState } from './special-ending-regression-helpers.mjs';

function createClassicCustomEngine(maxDepth) {
  return new SearchEngine({
    presetKey: 'custom',
    styleKey: 'balanced',
    searchAlgorithm: 'classic',
    customDifficultyInputs: {
      maxDepth,
      timeLimitMs: 1500,
      exactEndgameEmpties: 8,
      wldPreExactEmpties: 0,
      aspirationWindow: 40,
      openingRandomness: 0,
      openingTieBreakRandomization: false,
      searchRandomness: 0,
      maxTableEntries: 140000,
    },
  });
}

const scoutState = createRegressionState('scoutCase1');

const classicDepth3Engine = createClassicCustomEngine(3);
const classicDepth3Result = classicDepth3Engine.findBestMove(scoutState);
assert.equal(
  classicDepth3Result.stats.specialEndingScoutRuns,
  0,
  'The classic root special-ending scout should be disabled when maxDepth does not reach the scout horizon.',
);

const classicDepth4Engine = createClassicCustomEngine(4);
const classicDepth4Result = classicDepth4Engine.findBestMove(scoutState);
assert.equal(
  classicDepth4Result.stats.specialEndingScoutRuns,
  1,
  'The classic root special-ending scout should remain available once maxDepth reaches the scout horizon.',
);

const maxDepth7Engine = createClassicCustomEngine(7);
for (let empties = 18; empties <= 33; empties += 1) {
  for (let depth = 2; depth <= 7; depth += 1) {
    const calibrations = maxDepth7Engine.selectMpcCalibrations(empties, depth);
    for (const calibration of calibrations) {
      assert.ok(
        (calibration.deepDepth ?? 0) <= 7,
        `maxDepth 7 should never select an MPC calibration deeper than depth 7 (empties ${empties}, search depth ${depth}).`,
      );
    }
  }
}

const maxDepth8Engine = createClassicCustomEngine(8);
const depth7CalibrationsAt22Empties = maxDepth7Engine.selectMpcCalibrations(22, 7).map((calibration) => calibration.key);
const depth8CalibrationsAt22Empties = maxDepth8Engine.selectMpcCalibrations(22, 7).map((calibration) => calibration.key);
assert.ok(
  !depth7CalibrationsAt22Empties.includes('mpc-22-25-d4-d8'),
  'The depth-8 MPC calibration should disappear when the configured maxDepth is only 7.',
);
assert.ok(
  depth8CalibrationsAt22Empties.includes('mpc-22-25-d4-d8'),
  'The same depth-8 MPC calibration should remain available again once maxDepth is raised to 8.',
);

const depth7CalibrationsAt20Empties = maxDepth7Engine.selectMpcCalibrations(20, 7).map((calibration) => calibration.key);
assert.ok(
  depth7CalibrationsAt20Empties.includes('mpc-18-21-d3-d7'),
  'Depth-compatible MPC calibrations should remain available after the maxDepth gate is applied.',
);

console.log('stage128 classic depth gate smoke passed');
