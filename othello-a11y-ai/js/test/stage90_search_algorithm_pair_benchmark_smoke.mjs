import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage90-search-algorithm-pair-'));
const outputJson = path.join(tempDir, 'benchmark.json');

const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/benchmark-search-algorithm-pair.mjs'),
  '--first-algorithm', 'mcts-lite',
  '--second-algorithm', 'mcts-guided',
  '--games', '1',
  '--opening-plies', '6',
  '--seed', '7',
  '--time-ms-list', '50',
  '--max-depth', '4',
  '--exact-endgame-empties', '8',
  '--solver-adjudication-empties', '8',
  '--solver-adjudication-time-ms', '4000',
  '--max-table-entries', '40000',
  '--output-json', outputJson,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  timeout: 120000,
});

assert.equal(result.status, 0, result.stdout || result.stderr || 'search algorithm pair benchmark smoke failed');

const summary = JSON.parse(fs.readFileSync(outputJson, 'utf8'));
assert.equal(summary.type, 'internal-search-algorithm-pair-benchmark');
assert.equal(summary.options.firstAlgorithm, 'mcts-lite');
assert.equal(summary.options.secondAlgorithm, 'mcts-guided');
assert.equal(summary.scenarios.length, 1);
assert.equal(summary.scenarios[0].timeLimitMs, 50);
assert.equal(summary.scenarios[0].pairedOpenings, 1);
assert.equal(summary.scenarios[0].totalGames, 2);
assert.ok(summary.scenarios[0].algorithms['mcts-lite']);
assert.ok(summary.scenarios[0].algorithms['mcts-guided']);
assert.equal(summary.scenarios[0].pairs.length, 1);
assert.ok(Array.isArray(summary.scenarios[0].pairs[0].openingMoves));
assert.ok(summary.scenarios[0].pairs[0].firstAsBlack);
assert.ok(summary.scenarios[0].pairs[0].secondAsBlack);
assert.ok(Array.isArray(summary.condensedRecommendations));
assert.equal(summary.condensedRecommendations.length, 1);

console.log('stage90 search algorithm pair benchmark smoke passed');
