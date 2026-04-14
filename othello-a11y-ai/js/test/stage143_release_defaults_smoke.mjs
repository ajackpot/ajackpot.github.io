import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import GENERATED_EVALUATION_PROFILE, {
  GENERATED_MOVE_ORDERING_PROFILE,
  GENERATED_MPC_PROFILE,
  GENERATED_TUPLE_RESIDUAL_PROFILE,
} from '../ai/learned-eval-profile.generated.js';
import {
  DEFAULT_SEARCH_ALGORITHM,
  describeSearchAlgorithm,
  listSearchAlgorithmEntries,
} from '../ai/search-algorithms.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const historicalModulePath = path.join(
  repoRoot,
  'tools/engine-match/fixtures/historical-installed-modules/active-prebalanced13.learned-eval-profile.generated.js',
);

assert.equal(DEFAULT_SEARCH_ALGORITHM, 'classic-mtdf-2ply');
assert.equal(describeSearchAlgorithm(DEFAULT_SEARCH_ALGORITHM)?.label, 'Classic MTD(f)');
assert.equal(describeSearchAlgorithm('classic')?.label, 'Classic PVS');
assert.deepEqual(
  listSearchAlgorithmEntries('normal').map((entry) => entry.key),
  ['classic-mtdf-2ply', 'classic', 'mcts-guided', 'mcts-hybrid'],
);
assert.deepEqual(
  listSearchAlgorithmEntries('beginner').map((entry) => entry.key),
  ['classic-mtdf-2ply', 'classic', 'mcts-lite', 'mcts-guided'],
);

assert.equal(GENERATED_EVALUATION_PROFILE.name, 'balanced13-alllate-smoothed stability extras 0.90x');
assert.equal(GENERATED_MOVE_ORDERING_PROFILE.name, 'balanced13-alllate-smoothed-stability-090__move-ordering');
assert.equal(GENERATED_TUPLE_RESIDUAL_PROFILE.name, 'balanced13-alllate-smoothed-stability-090__tuple-residual-calibrated');
assert.equal(GENERATED_MPC_PROFILE.name, 'balanced13-alllate-smoothed-stability-090__runtime-mpc');
assert.ok(fs.existsSync(historicalModulePath), 'the pre-balanced13 installed module should remain as a historical record fixture.');

console.log('stage143 release defaults smoke passed');
