import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { buildEvaluationExpansionSeedProfile } from '../../tools/evaluator-training/evaluation-profile-expansion-lib.mjs';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage130-patch-'));

try {
  const sourceSuiteDir = path.join(tempDir, 'source-suite');
  const sourceCandidateDir = path.join(sourceSuiteDir, 'candidates', 'balanced12-alllate-smoothed');
  const outputDir = path.join(tempDir, 'patch-output');
  const configPath = path.join(tempDir, 'patch-config.json');
  const suiteScript = path.join(repoRoot, 'tools/evaluator-training/run-evaluation-profile-patch-suite.mjs');

  await fs.mkdir(sourceCandidateDir, { recursive: true });
  await fs.writeFile(
    path.join(sourceCandidateDir, 'trained-evaluation-profile.json'),
    JSON.stringify(buildEvaluationExpansionSeedProfile({
      key: 'balanced12-alllate-smoothed',
      bucketFamily: 'balanced12',
      featureFamily: 'all-late-scalars',
      smoothing: 'smoothed',
    }), null, 2),
    'utf8',
  );
  await fs.writeFile(
    path.join(sourceSuiteDir, 'suite-review-summary.json'),
    JSON.stringify({ recommendedFinalists: ['balanced12-alllate-smoothed'] }, null, 2),
    'utf8',
  );

  await fs.writeFile(configPath, JSON.stringify({
    defaults: {
      exportModule: true,
      benchmarks: {
        profile: { enabled: false },
        depth: { enabled: false },
        exact: { enabled: false },
      },
    },
    candidates: [
      {
        key: 'balanced12-alllate-smoothed-extras90',
        sourceCandidateKey: 'balanced12-alllate-smoothed',
        featureScales: { allOptional: 0.9 },
      },
      {
        key: 'balanced12-alllate-smoothed-interp-off',
        sourceCandidateKey: 'balanced12-alllate-smoothed',
        setInterpolation: 'off',
      },
    ],
  }, null, 2), 'utf8');

  await execFileAsync(process.execPath, [
    suiteScript,
    '--source-suite-dir', sourceSuiteDir,
    '--output-dir', outputDir,
    '--config', configPath,
  ], { cwd: tempDir, maxBuffer: 1024 * 1024 * 64 });

  const summary = JSON.parse(await fs.readFile(path.join(outputDir, 'suite-summary.json'), 'utf8'));
  assert.equal(summary.candidates.length, 2);
  assert.equal(summary.failureCount, 0);
  assert.equal(summary.successCount, 2);

  const scaledDir = path.join(outputDir, 'candidates', 'balanced12-alllate-smoothed-extras90');
  const interpOffDir = path.join(outputDir, 'candidates', 'balanced12-alllate-smoothed-interp-off');
  await fs.access(path.join(scaledDir, 'trained-evaluation-profile.patched.json'));
  await fs.access(path.join(scaledDir, 'learned-eval-profile.generated.js'));
  await fs.access(path.join(interpOffDir, 'trained-evaluation-profile.patched.json'));
  await fs.access(path.join(interpOffDir, 'learned-eval-profile.generated.js'));

  const interpOffProfile = JSON.parse(await fs.readFile(path.join(interpOffDir, 'trained-evaluation-profile.patched.json'), 'utf8'));
  assert.equal(interpOffProfile.interpolation ?? null, null);

  const status = JSON.parse(await fs.readFile(path.join(interpOffDir, 'candidate-status.json'), 'utf8'));
  assert.equal(status.steps['patch-evaluation-profile'].status, 'success');
  assert.equal(status.steps['export-generated-module'].status, 'success');

  await execFileAsync(process.execPath, [
    suiteScript,
    '--source-suite-dir', sourceSuiteDir,
    '--output-dir', outputDir,
    '--config', configPath,
    '--resume',
  ], { cwd: tempDir, maxBuffer: 1024 * 1024 * 64 });

  const resumedStatus = JSON.parse(await fs.readFile(path.join(interpOffDir, 'candidate-status.json'), 'utf8'));
  assert.equal(resumedStatus.steps['patch-evaluation-profile'].skipReason, 'resume-signature-match');
  assert.equal(resumedStatus.steps['export-generated-module'].skipReason, 'resume-signature-match');

  console.log('stage130 evaluation patch suite smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
