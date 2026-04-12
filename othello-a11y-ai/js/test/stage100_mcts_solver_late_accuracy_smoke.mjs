import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage100-mcts-solver-late-accuracy-'));
const outputJson = path.join(tempDir, 'late-accuracy.json');

const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/benchmark-mcts-solver-late-accuracy.mjs'),
  '--repo-root', repoRoot,
  '--empties-list', '9,10',
  '--seed-list', '17',
  '--time-ms', '60',
  '--reference-time-ms', '4000',
  '--output-json', outputJson,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
  timeout: 180000,
});

assert.equal(result.status, 0, result.stdout || result.stderr || 'stage100 late accuracy benchmark smoke failed');
assert.ok(fs.existsSync(outputJson), 'stage100 late accuracy benchmark smoke should emit a JSON summary');

const summary = JSON.parse(fs.readFileSync(outputJson, 'utf8'));
assert.equal(summary.type, 'mcts-solver-late-accuracy-benchmark');
assert.equal(summary.options.algorithm, 'mcts-hybrid');
assert.deepEqual(summary.options.emptiesList, [9, 10]);
assert.deepEqual(summary.options.seedList, [17]);
assert.equal(summary.scenarios.length, 2);
assert.equal(summary.aggregates.length, 2);
assert.equal(summary.topline.positions, 2);
assert.ok(summary.scenarios.every((entry) => entry.reference && Number.isFinite(entry.reference.score)));
assert.ok(summary.scenarios.every((entry) => typeof entry.solverOff.proven === 'boolean'));
assert.ok(summary.scenarios.every((entry) => typeof entry.solverOn.proven === 'boolean'));
assert.ok(summary.scenarios.some((entry) => entry.solverOn.proven));
assert.ok(summary.scenarios.every((entry) => entry.solverOn.mctsSolverStateProbes >= entry.solverOff.mctsSolverStateProbes));

console.log('stage100 mcts solver late accuracy smoke passed');
