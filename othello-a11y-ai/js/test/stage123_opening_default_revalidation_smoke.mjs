import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  DEFAULT_OPENING_HYBRID_TUNING_KEY,
  getOpeningHybridTuningProfile,
} from '../ai/opening-tuning.js';

assert.equal(DEFAULT_OPENING_HYBRID_TUNING_KEY, 'stage59-cap9-prior-veto');
const defaultProfile = getOpeningHybridTuningProfile(DEFAULT_OPENING_HYBRID_TUNING_KEY);
assert.equal(defaultProfile.directUseMaxPly, 9);
assert.equal(defaultProfile.priorContradictionVetoMinPly, 4);
assert.equal(defaultProfile.priorContradictionVetoMinCount, 2000);
assert.equal(defaultProfile.priorContradictionVetoMinRank, 2);
assert.equal(defaultProfile.priorContradictionVetoMinShareDelta, 0.08);

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage123-opening-default-'));
const outputJsonPath = path.join(tempDir, 'opening-default-revalidation.json');
const replayRun = spawnSync(process.execPath, [
  path.join(process.cwd(), 'tools/evaluator-training/replay-opening-hybrid-reference-suite.mjs'),
  '--profile-keys', 'stage59-prior-veto,stage59-cap9-prior-veto',
  '--candidate-max-depth', '6',
  '--candidate-time-limit-ms', '1500',
  '--candidate-exact-endgame-empties', '10',
  '--repetitions', '1',
  '--output-json', outputJsonPath,
], {
  cwd: process.cwd(),
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 64,
});
assert.equal(replayRun.status, 0, `stage123 opening default replay should succeed:\nSTDOUT:\n${replayRun.stdout}\nSTDERR:\n${replayRun.stderr}`);

const summary = JSON.parse(await fs.readFile(outputJsonPath, 'utf8'));
assert.equal(summary.corpus.stateCount, 182);
assert.equal(summary.ranking.length, 2);
assert.equal(summary.ranking[0].profileKey, DEFAULT_OPENING_HYBRID_TUNING_KEY);
assert.ok(summary.ranking[0].worstAgreementRate > summary.ranking[1].worstAgreementRate);
assert.ok(summary.ranking[0].averageAgreementRate > summary.ranking[1].averageAgreementRate);
assert.ok(summary.ranking[0].averageDirectRate < summary.ranking[1].averageDirectRate);

console.log('stage123 opening default revalidation smoke passed');
