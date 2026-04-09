import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { GameState } from '../core/game-state.js';
import { SearchEngine } from '../ai/search-engine.js';
import {
  getOpeningHybridTuningProfile,
  listOpeningHybridTuningProfiles,
} from '../ai/opening-tuning.js';

const initialState = GameState.initial();
const tuningKeys = listOpeningHybridTuningProfiles().map((profile) => profile.key);
assert.ok(tuningKeys.includes('search-reference-strong'));
assert.ok(tuningKeys.includes('search-reference-pure'));

const strongReferenceProfile = getOpeningHybridTuningProfile('search-reference-strong');
assert.equal(strongReferenceProfile.directUseMaxPly, -1);
assert.equal(strongReferenceProfile.selectionPriorScale, 0);
assert.ok(strongReferenceProfile.orderingPriorScale > 0);
assert.ok(strongReferenceProfile.orderingPriorScale < getOpeningHybridTuningProfile('search-reference').orderingPriorScale);

const pureReferenceProfile = getOpeningHybridTuningProfile('search-reference-pure');
assert.equal(pureReferenceProfile.directUseMaxPly, -1);
assert.equal(pureReferenceProfile.selectionPriorScale, 0);
assert.equal(pureReferenceProfile.orderingPriorScale, 0);
assert.equal(pureReferenceProfile.orderingOffBookPriorScale, 0);

const pureReferenceEngine = new SearchEngine({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 3,
  timeLimitMs: 250,
  exactEndgameEmpties: 8,
  openingRandomness: 0,
  searchRandomness: 0,
  openingTuningKey: 'search-reference-pure',
});
const pureReferenceOpening = pureReferenceEngine.findBestMove(initialState);
assert.equal(pureReferenceOpening.source, 'search');
assert.equal(pureReferenceOpening.options.openingTuningKey, 'search-reference-pure');

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage58-opening-bench-'));
const outputJsonPath = path.join(tempDir, 'opening-hybrid-reference-suite.json');
const benchmarkRun = spawnSync(process.execPath, [
  path.join(process.cwd(), 'tools/evaluator-training/benchmark-opening-hybrid-tuning.mjs'),
  '--profile-keys', 'stage56-legacy,stage57-book-led,stage57-cautious',
  '--reference-scenarios', 'stage57-baseline,stage58-strong-assisted,stage58-strong-pure',
  '--min-ply', '0',
  '--max-ply', '5',
  '--state-limit', '16',
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
assert.equal(benchmarkRun.status, 0, `benchmark-opening-hybrid-tuning reference suite should succeed:\nSTDOUT:\n${benchmarkRun.stdout}\nSTDERR:\n${benchmarkRun.stderr}`);

const summary = JSON.parse(await fs.readFile(outputJsonPath, 'utf8'));
assert.equal(summary.corpus.stateCount, 16);
assert.equal(summary.referenceScenarios.length, 3);
assert.equal(summary.overallProfiles.length, 3);
assert.equal(summary.overallRanking.length, 3);
assert.equal(summary.referenceConsistency.scenarioCount, 3);
assert.equal(summary.referenceConsistency.byPair.length, 3);
assert.equal(summary.unresolvedReferenceScenarioKeys.length, 0);
assert.equal(summary.benchmarkConfig.referenceScenarios.length, 3);
assert.equal(summary.benchmarkConfig.referenceMode, 'suite');
assert.equal(summary.referenceScenarios[0].referenceScenario.key, 'stage57-baseline');
assert.equal(summary.referenceScenarios[1].referenceScenario.key, 'stage58-strong-assisted');
assert.equal(summary.referenceScenarios[2].referenceScenario.key, 'stage58-strong-pure');
assert.ok(summary.overallProfiles.every((profile) => Number.isFinite(profile.averageAgreementRate)));
assert.ok(summary.referenceConsistency.byPair.every((pair) => Number.isFinite(pair.agreementRate)));
assert.ok(summary.referenceConsistency.unanimousRate >= 0 && summary.referenceConsistency.unanimousRate <= 1);

console.log('stage58 opening hybrid reference suite smoke passed');
