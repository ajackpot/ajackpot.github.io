import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage132-classic-suite-'));
const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/run-stage132-classic-mtdf-suite.mjs'),
  '--output-dir', tempDir,
  '--time-ms-list', '40',
  '--position-seed-list', '17',
  '--pair-seed-list', '17',
  '--games', '1',
  '--opening-plies', '20',
  '--max-depth', '5',
  '--exact-endgame-empties', '8',
  '--solver-adjudication-empties', '10',
  '--solver-adjudication-time-ms', '4000',
  '--aspiration-window', '50',
  '--max-table-entries', '60000',
], {
  cwd: repoRoot,
  encoding: 'utf8',
  timeout: 300000,
  maxBuffer: 20 * 1024 * 1024,
});

assert.equal(result.status, 0, result.stdout || result.stderr || 'stage132 suite smoke failed');
const summaryPath = path.join(tempDir, 'stage132_classic_mtdf_suite_summary.json');
assert.ok(fs.existsSync(summaryPath), 'stage132 suite smoke should emit a summary JSON');
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
assert.equal(summary.type, 'stage132-classic-mtdf-suite');
assert.ok(Array.isArray(summary.candidates));
assert.equal(summary.candidates.length, 2);
assert.ok(summary.outputs.throughputPath);

console.log('stage132 classic mtdf suite smoke passed');
