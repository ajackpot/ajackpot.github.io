import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage76-engine-match-seeds-'));
const sharedOutput = path.join(tempDir, 'shared.json');
const offsetOutput = path.join(tempDir, 'offset.json');

function runBenchmark(extraArgs, outputJson) {
  const result = spawnSync(process.execPath, [
    path.resolve(repoRoot, 'tools/engine-match/benchmark-vs-trineutron.mjs'),
    '--variants', 'active,legacy',
    '--games', '1',
    '--opening-plies', '4',
    '--seed', '1',
    '--our-time-ms', '20',
    '--their-time-ms', '20',
    '--our-max-depth', '4',
    '--their-max-depth', '8',
    '--exact-endgame-empties', '8',
    '--solver-adjudication-empties', '6',
    '--solver-adjudication-time-ms', '1000',
    '--their-noise-scale', '0',
    '--output-json', outputJson,
    ...extraArgs,
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 120000,
  });
  assert.equal(result.status, 0, result.stdout || result.stderr || 'engine match shared-seed smoke failed');
  return JSON.parse(fs.readFileSync(outputJson, 'utf8'));
}

const shared = runBenchmark(['--variant-seed-mode', 'shared'], sharedOutput);
assert.equal(shared.options.variantSeedMode, 'shared');
assert.equal(shared.variants.length, 2);
assert.equal(shared.variants[0].games[0].gameSeed, shared.variants[1].games[0].gameSeed);
assert.equal(shared.variants[0].games[1].gameSeed, shared.variants[1].games[1].gameSeed);

const offset = runBenchmark([], offsetOutput);
assert.equal(offset.options.variantSeedMode, 'per-variant');
assert.notEqual(offset.variants[0].games[0].gameSeed, offset.variants[1].games[0].gameSeed);
assert.notEqual(offset.variants[0].games[1].gameSeed, offset.variants[1].games[1].gameSeed);

console.log('stage76 engine match shared seed smoke passed');
