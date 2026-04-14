import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage135-profile-pair-'));
const outputPath = path.join(tempDir, 'pair.json');
const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/benchmark-profile-variant-pair.mjs'),
  '--output-json', outputPath,
  '--search-algorithm', 'classic',
  '--first-label', 'active',
  '--first-generated-module', 'js/ai/learned-eval-profile.generated.js',
  '--second-label', 'balanced12',
  '--second-generated-module', 'tools/engine-match/fixtures/stage135-evaluation-profile-finalists/balanced12-alllate-smoothed-stability-090/learned-eval-profile.generated.js',
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

assert.equal(result.status, 0, result.stdout || result.stderr || 'stage135 profile pair smoke failed');
assert.ok(fs.existsSync(outputPath), 'profile pair smoke should emit a JSON summary');
const summary = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
assert.equal(summary.type, 'profile-variant-pair-benchmark');
assert.ok(Array.isArray(summary.scenarios) && summary.scenarios.length === 1);
assert.ok(summary.variants.active);
assert.ok(summary.variants.balanced12);
console.log('stage135 profile variant pair smoke passed');
