import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage50-pipeline-'));

try {
  const corpusPath = path.join(tempDir, 'fake-corpus');
  const seedProfilePath = path.join(tempDir, 'fake-seed-profile.json');
  const outputDir = path.join(tempDir, 'pipeline-output');
  await fs.writeFile(seedProfilePath, '{}', 'utf8');

  const { stdout } = await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools/evaluator-training/run-tuple-retrain-pipeline.mjs'),
    '--input', corpusPath,
    '--seed-profile', seedProfilePath,
    '--preset', 'top24-retrain',
    '--output-dir', outputDir,
    '--dry-run',
  ], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 8,
  });

  const summaryPath = path.join(outputDir, 'top24-retrain.pipeline-summary.json');
  const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));

  assert.equal(summary.runName, 'top24-retrain');
  assert.equal(summary.dryRun, true);
  assert.equal(summary.steps.length, 8 + 1); // patch, train, calibrate, final-patch(skipped), generated-module, inspect, depth, exact, install(skipped)
  assert.match(stdout, /patch-tuple-residual-profile\.mjs/);
  assert.match(stdout, /train-tuple-residual-profile\.mjs/);
  assert.match(stdout, /install-tuple-residual-profile\.mjs/);
  assert.match(stdout, /benchmark-depth-search-profile\.mjs/);
  assert.equal(summary.steps[0].status, 'ok');
  assert.equal(summary.steps[1].status, 'ok');
  assert.equal(summary.steps[2].status, 'ok');
  assert.equal(summary.steps[3].status, 'not-requested');
  assert.equal(summary.steps[4].status, 'ok');
  assert.equal(summary.steps[8].status, 'skipped');
  assert.equal(summary.outputs.generatedModule.endsWith('top24-retrain.generated.js'), true);
  assert.equal(summary.recommendation.status, 'manual-review');

  console.log('stage50 tuple retrain pipeline dry-run smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
