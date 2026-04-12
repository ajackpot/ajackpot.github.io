import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage92-search-algorithm-pair-'));
const outputJson = path.join(tempDir, 'benchmark.json');

const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/benchmark-search-algorithm-pair.mjs'),
  '--first-algorithm', 'mcts-guided',
  '--second-algorithm', 'mcts-hybrid',
  '--games', '1',
  '--opening-plies', '6',
  '--seed-list', '7,11',
  '--time-ms-list', '80',
  '--max-depth', '4',
  '--exact-endgame-empties', '8',
  '--solver-adjudication-empties', '14',
  '--solver-adjudication-time-ms', '4000',
  '--max-table-entries', '40000',
  '--output-json', outputJson,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  timeout: 120000,
});

assert.equal(result.status, 0, result.stdout || result.stderr || 'multi-seed search algorithm pair benchmark smoke failed');

const summary = JSON.parse(fs.readFileSync(outputJson, 'utf8'));
assert.equal(summary.type, 'internal-search-algorithm-pair-benchmark');
assert.deepEqual(summary.options.seedList, [7, 11]);
assert.equal(summary.scenarios.length, 1);
assert.equal(summary.scenarios[0].timeLimitMs, 80);
assert.equal(summary.scenarios[0].seedCount, 2);
assert.equal(summary.scenarios[0].pairedOpeningsPerSeed, 1);
assert.equal(summary.scenarios[0].pairedOpenings, 2);
assert.equal(summary.scenarios[0].totalGames, 4);
assert.equal(summary.scenarios[0].pairs.length, 2);
assert.equal(summary.scenarios[0].pairs[0].pairIndex, 0);
assert.equal(summary.scenarios[0].pairs[1].pairIndex, 1);
assert.ok(Number.isInteger(summary.scenarios[0].pairs[0].seedIndex));
assert.ok(Number.isInteger(summary.scenarios[0].pairs[1].seedIndex));
assert.ok(Array.isArray(summary.scenarios[0].seedList));
assert.deepEqual(summary.scenarios[0].seedList, [7, 11]);

console.log('stage92 search algorithm pair multiseed smoke passed');
