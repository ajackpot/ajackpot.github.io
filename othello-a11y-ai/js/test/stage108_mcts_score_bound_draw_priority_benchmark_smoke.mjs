import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage108-mcts-score-bound-draw-priority-'));
const outputJson = path.join(tempDir, 'score-bound-draw-priority-fixed.json');

const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/benchmark-mcts-score-bound-draw-priority-fixed-iterations.mjs'),
  '--repo-root', repoRoot,
  '--empties-list', '12',
  '--seed-list', '123,167',
  '--iterations-list', '24',
  '--draw-priority-scales', '0,0.5',
  '--reference-time-ms', '3000',
  '--output-json', outputJson,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
  timeout: 180000,
});

assert.equal(result.status, 0, result.stdout || result.stderr || 'stage108 score-bound draw-priority benchmark smoke failed');
assert.ok(fs.existsSync(outputJson), 'stage108 score-bound draw-priority benchmark smoke should emit a JSON summary');

const summary = JSON.parse(fs.readFileSync(outputJson, 'utf8'));
assert.equal(summary.type, 'mcts-score-bound-draw-priority-fixed-iterations-benchmark');
assert.equal(summary.options.algorithm, 'mcts-hybrid');
assert.deepEqual(summary.options.emptiesList, [12]);
assert.deepEqual(summary.options.seedList, [123, 167]);
assert.deepEqual(summary.options.iterationsList, [24]);
assert.deepEqual(summary.options.drawPriorityScales, [0, 0.5]);
assert.equal(summary.variants.length, 2);
assert.equal(summary.scenarios.length, 2);
assert.equal(summary.aggregates.length, 2);
assert.equal(summary.aggregatesByIteration.length, 1);
assert.ok(summary.scenarios.every((entry) => entry.reference && Number.isFinite(entry.reference.exactScore)));
const offAggregate = summary.aggregates.find((entry) => entry.label === 'draw-priority off');
const onAggregate = summary.aggregates.find((entry) => entry.label === 'draw-priority x0.5');
assert.ok(offAggregate && onAggregate);
assert.ok((onAggregate.exactResultRate ?? 0) > (offAggregate.exactResultRate ?? 0));
assert.ok((onAggregate.averageScoreBoundDrawPrioritySelectionNodes ?? 0) > 0);
assert.equal(onAggregate.averageScoreBoundDominatedTraversalSelections, 0);

console.log('stage108 mcts score-bound draw priority benchmark smoke passed');
