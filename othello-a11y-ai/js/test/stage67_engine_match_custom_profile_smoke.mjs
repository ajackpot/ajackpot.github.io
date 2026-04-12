import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage67-engine-match-'));
const outputJson = path.join(tempDir, 'engine-match.json');
const generatedModule = path.resolve(
  repoRoot,
  'tools/evaluator-training/out/stage29_learned-eval-profile.generated.js',
);

const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/benchmark-vs-trineutron.mjs'),
  '--variants', 'custom',
  '--generated-module', generatedModule,
  '--variant-label', 'stage67-custom-smoke',
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
], {
  cwd: repoRoot,
  encoding: 'utf8',
  timeout: 120000,
});

assert.equal(result.status, 0, result.stdout || result.stderr || 'engine match CLI exited with failure');
assert.ok(fs.existsSync(outputJson), 'custom engine match smoke did not write output json');

const summary = JSON.parse(fs.readFileSync(outputJson, 'utf8'));
assert.equal(summary.variants?.[0]?.variantKey, 'custom');
assert.equal(summary.variants?.[0]?.variantLabel, 'stage67-custom-smoke');
assert.equal(summary.customVariant?.label, 'stage67-custom-smoke');
assert.ok(summary.customVariant?.evaluationProfileName);
