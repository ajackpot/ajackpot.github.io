import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage135-profile-throughput-'));
const outputPath = path.join(tempDir, 'throughput.json');
const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/benchmark-profile-variant-throughput-compare.mjs'),
  '--output-json', outputPath,
  '--search-algorithm', 'classic',
  '--variant-specs', 'active|js/ai/learned-eval-profile.generated.js;balanced12|tools/engine-match/fixtures/stage135-evaluation-profile-finalists/balanced12-alllate-smoothed-stability-090/learned-eval-profile.generated.js',
  '--time-ms-list', '120',
  '--position-seed-list', '17,31',
  '--opening-plies', '12',
  '--max-depth', '2',
  '--exact-endgame-empties', '4',
  '--aspiration-window', '0',
  '--max-table-entries', '30000',
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});

assert.equal(result.status, 0, result.stdout || result.stderr || 'stage135 profile throughput smoke failed');
assert.ok(fs.existsSync(outputPath), 'profile throughput smoke should emit a JSON summary');
const summary = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
assert.equal(summary.type, 'profile-variant-throughput-compare');
assert.ok(Array.isArray(summary.timeBuckets) && summary.timeBuckets.length === 1);
assert.equal(summary.baselineVariant, 'active');
console.log('stage135 profile variant throughput smoke passed');
