import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage135-pair-generated-'));
const outputPath = path.join(tempDir, 'pair.json');
const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/benchmark-search-algorithm-pair.mjs'),
  '--output-json', outputPath,
  '--first-algorithm', 'classic',
  '--second-algorithm', 'classic-mtdf-2ply',
  '--generated-module', 'tools/engine-match/fixtures/stage135-evaluation-profile-finalists/balanced12-alllate-smoothed-stability-090/learned-eval-profile.generated.js',
  '--games', '1',
  '--opening-plies', '12',
  '--seed-list', '17',
  '--time-ms-list', '120',
  '--max-depth', '2',
  '--exact-endgame-empties', '4',
  '--solver-adjudication-empties', '10',
  '--solver-adjudication-time-ms', '5000',
  '--aspiration-window', '0',
  '--max-table-entries', '30000',
  '--progress-every-pairs', '1',
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});

assert.equal(result.status, 0, result.stdout || result.stderr || 'stage135 search algorithm pair generated-module smoke failed');
assert.ok(fs.existsSync(outputPath), 'search algorithm pair smoke should emit a JSON summary');
const summary = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
assert.equal(summary.type, 'internal-search-algorithm-pair-benchmark');
assert.ok(summary.sharedProfileVariant);
console.log('stage135 search algorithm pair generated-module smoke passed');
