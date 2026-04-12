import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  listSearchAlgorithmEntries,
  normalizeSearchAlgorithmForPreset,
} from '../ai/search-algorithms.js';

const beginnerKeys = listSearchAlgorithmEntries('beginner').map((entry) => entry.key);
const normalKeys = listSearchAlgorithmEntries('normal').map((entry) => entry.key);

assert.deepEqual(beginnerKeys, ['classic', 'mcts-lite', 'mcts-guided']);
assert.deepEqual(normalKeys, ['classic', 'mcts-guided', 'mcts-hybrid']);
assert.equal(normalizeSearchAlgorithmForPreset('mcts-hybrid', 'beginner'), 'mcts-lite');
assert.equal(normalizeSearchAlgorithmForPreset('mcts-lite', 'normal'), 'mcts-guided');
assert.equal(normalizeSearchAlgorithmForPreset('classic', 'beginner'), 'classic');

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage93-mcts-throughput-'));
const outputJson = path.join(tempDir, 'throughput.json');
const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/benchmark-mcts-throughput-compare.mjs'),
  '--candidate-root', repoRoot,
  '--time-ms-list', '60',
  '--position-seed-list', '17',
  '--opening-plies', '8',
  '--random-mode', 'constant-zero',
  '--output-json', outputJson,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});

assert.equal(result.status, 0, result.stdout || result.stderr || 'stage93 throughput benchmark smoke failed');
assert.ok(fs.existsSync(outputJson), 'throughput benchmark smoke should emit a JSON summary');
const summary = JSON.parse(fs.readFileSync(outputJson, 'utf8'));
assert.equal(summary.type, 'mcts-throughput-compare');
assert.equal(summary.runs.length, 1);
assert.equal(summary.runs[0].label, 'current');
assert.equal(summary.runs[0].positionSeedList.length, 1);
assert.equal(summary.runs[0].randomMode, 'constant-zero');
assert.ok(summary.runs[0].results.some((entry) => entry.algorithm === 'mcts-guided'));
assert.ok(summary.runs[0].results.some((entry) => entry.algorithm === 'mcts-hybrid'));

console.log('stage93 search algorithm availability and throughput smoke passed');
