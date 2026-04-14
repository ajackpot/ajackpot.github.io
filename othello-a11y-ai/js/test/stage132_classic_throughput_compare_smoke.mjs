import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage132-classic-throughput-'));
const outputJson = path.join(tempDir, 'throughput.json');

const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/benchmark-classic-throughput-compare.mjs'),
  '--algorithms', 'classic,classic-mtdf',
  '--time-ms-list', '40',
  '--position-seed-list', '17',
  '--opening-plies', '20',
  '--max-depth', '5',
  '--exact-endgame-empties', '8',
  '--aspiration-window', '50',
  '--output-json', outputJson,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  timeout: 120000,
});

assert.equal(result.status, 0, result.stdout || result.stderr || 'stage132 throughput smoke failed');
const summary = JSON.parse(fs.readFileSync(outputJson, 'utf8'));
assert.equal(summary.type, 'classic-throughput-compare');
assert.equal(summary.baselineAlgorithm, 'classic');
assert.equal(summary.runs.length, 2);
assert.ok(summary.runs.some((entry) => entry.algorithm === 'classic-mtdf'));
assert.ok(summary.comparisonsAgainstBaseline.some((entry) => entry.candidateAlgorithm === 'classic-mtdf'));

console.log('stage132 classic throughput compare smoke passed');
