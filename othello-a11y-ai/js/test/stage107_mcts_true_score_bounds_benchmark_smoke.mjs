import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage107-mcts-true-score-bounds-'));
const outputJson = path.join(tempDir, 'score-bounds-fixed.json');

const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/benchmark-mcts-score-bounds-fixed-iterations.mjs'),
  '--repo-root', repoRoot,
  '--empties-list', '12',
  '--seed-list', '15,17',
  '--iterations-list', '12,24',
  '--reference-time-ms', '3000',
  '--output-json', outputJson,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
  timeout: 180000,
});

assert.equal(result.status, 0, result.stdout || result.stderr || 'stage107 true score bounds benchmark smoke failed');
assert.ok(fs.existsSync(outputJson), 'stage107 true score bounds benchmark smoke should emit a JSON summary');

const summary = JSON.parse(fs.readFileSync(outputJson, 'utf8'));
assert.equal(summary.type, 'mcts-score-bounds-fixed-iterations-benchmark');
assert.equal(summary.options.algorithm, 'mcts-hybrid');
assert.deepEqual(summary.options.emptiesList, [12]);
assert.deepEqual(summary.options.seedList, [15, 17]);
assert.deepEqual(summary.options.iterationsList, [12, 24]);
assert.equal(summary.variants.length, 2);
assert.equal(summary.scenarios.length, 4);
assert.equal(summary.aggregates.length, 2);
assert.equal(summary.aggregatesByIteration.length, 2);
assert.ok(summary.scenarios.every((entry) => entry.reference && Number.isFinite(entry.reference.exactScore)));
assert.ok(summary.scenarios.every((entry) => entry.variants.off.scoreBoundsEnabled === false));
assert.ok(summary.scenarios.every((entry) => entry.variants.on.scoreBoundsEnabled === true));
assert.ok(summary.scenarios.some((entry) => (entry.variants.on.mctsScoreBoundTraversalFilteredNodes ?? 0) > 0));
assert.ok(summary.aggregates.find((entry) => entry.label === 'on').averageScoreBoundDominatedTraversalSelections === 0);

console.log('stage107 mcts true score bounds benchmark smoke passed');
