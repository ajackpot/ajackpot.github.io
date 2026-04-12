import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage68-exact-module-'));
const outputJson = path.join(tempDir, 'exact.json');
const baselineModule = path.resolve(repoRoot, 'js/ai/learned-eval-profile.generated.js');
const candidateModule = path.resolve(repoRoot, 'tools/evaluator-training/out/stage29_learned-eval-profile.generated.js');

const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/evaluator-training/benchmark-exact-search-profile.mjs'),
  '--baseline-generated-module', baselineModule,
  '--candidate-generated-module', candidateModule,
  '--empties', '10',
  '--seed-start', '1',
  '--seed-count', '1',
  '--repetitions', '1',
  '--time-limit-ms', '1000',
  '--max-depth', '10',
  '--output-json', outputJson,
], { cwd: repoRoot, encoding: 'utf8', timeout: 120000 });

assert.equal(result.status, 0, result.stdout || result.stderr || 'exact benchmark CLI exited with failure');
assert.ok(fs.existsSync(outputJson), 'exact benchmark did not write output json');
const summary = JSON.parse(fs.readFileSync(outputJson, 'utf8'));
assert.equal(summary.options?.baselineGeneratedModulePath, baselineModule);
assert.equal(summary.options?.candidateGeneratedModulePath, candidateModule);
assert.ok(summary.baselineEvaluationProfileName);
assert.ok(summary.candidateEvaluationProfileName);
assert.equal(summary.overall?.cases, 1);
