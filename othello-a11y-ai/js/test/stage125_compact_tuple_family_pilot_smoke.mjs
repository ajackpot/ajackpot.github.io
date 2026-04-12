import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage125-compact-tuple-'));
const outputJsonPath = path.join(tempDir, 'stage125-summary.json');
const run = spawnSync(process.execPath, [
  path.join(process.cwd(), 'tools/benchmark/run-stage125-compact-tuple-family-pilot.mjs'),
  '--summary-only',
  '--output', outputJsonPath,
], {
  cwd: process.cwd(),
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 64,
});
assert.equal(run.status, 0, `stage125 compact tuple family pilot summary-only run should succeed:
STDOUT:
${run.stdout}
STDERR:
${run.stderr}`);

const summary = JSON.parse(await fs.readFile(outputJsonPath, 'utf8'));
assert.equal(summary.benchmark, 'stage125_compact_tuple_family_bounded_pilot');
assert.equal(summary.runtimeBaselineStage, 123);
assert.equal(summary.corpus.rows, 236);
assert.equal(summary.candidates.length, 3);
assert.equal(summary.bestVerifiedHoldoutCandidate.layoutName, 'orthogonal-adjacent-pairs-outer2-v1');
assert.equal(summary.bestDepthCandidate.layoutName, 'diagonal-adjacent-pairs-full-v1');
assert.equal(summary.bestDepthCandidate.identicalBestMoveCases, 27);
assert.equal(summary.trineutronSanityCheck.active.aggregate.scoreRate, 0.375);
assert.equal(summary.trineutronSanityCheck.diagonalPilot.aggregate.scoreRate, 0.375);
assert.equal(summary.decision.verdict, 'keep-active-baseline-no-stage125-adoption');
assert.equal(summary.decision.adoptedLayout, null);

console.log('stage125 compact tuple family pilot smoke passed');
