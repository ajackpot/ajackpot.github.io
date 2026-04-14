import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { ACTIVE_EVALUATION_PROFILE, DEFAULT_EVALUATION_FEATURE_KEYS } from '../ai/evaluation-profiles.js';
import { Evaluator } from '../ai/evaluator.js';
import { playSeededRandomUntilEmptyCount } from './benchmark-helpers.mjs';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage130-suite-'));
const evaluator = new Evaluator({ evaluationProfile: ACTIVE_EVALUATION_PROFILE });

async function buildTinyCorpus(corpusPath) {
  const emptiesList = [38, 34, 30, 26, 22, 18, 14, 10, 6];
  const lines = [];

  for (const empties of emptiesList) {
    for (let seed = 1; seed <= 4; seed += 1) {
      const state = playSeededRandomUntilEmptyCount(empties, seed);
      lines.push(JSON.stringify({
        black: state.black.toString(),
        white: state.white.toString(),
        currentPlayer: state.currentPlayer,
        target: evaluator.evaluate(state, state.currentPlayer),
      }));
    }
  }

  await fs.writeFile(corpusPath, `${lines.join('\n')}\n`, 'utf8');
}

try {
  const corpusPath = path.join(tempDir, 'tiny-corpus.ndjson');
  const outputDir = path.join(tempDir, 'suite-output');
  const configPath = path.join(tempDir, 'suite-config.json');
  const suiteScript = path.join(repoRoot, 'tools/evaluator-training/run-evaluation-profile-candidate-suite.mjs');

  await buildTinyCorpus(corpusPath);
  await fs.writeFile(configPath, JSON.stringify({
    defaults: {
      lambda: 1000,
      limit: null,
      exportModule: true,
      benchmarks: {
        profile: {
          enabled: true,
          limit: 64,
          benchmarkLoops: 1,
        },
        depth: { enabled: false },
        exact: { enabled: false },
      },
    },
    candidates: [
      {
        key: 'balanced12-control-hard',
        bucketFamily: 'balanced12',
        featureFamily: 'control',
        smoothing: 'hard',
      },
      {
        key: 'balanced12-alllate-smoothed',
        bucketFamily: 'balanced12',
        featureFamily: 'all-late-scalars',
        smoothing: 'smoothed',
      },
    ],
  }, null, 2), 'utf8');

  await execFileAsync(process.execPath, [
    suiteScript,
    '--input', corpusPath,
    '--output-dir', outputDir,
    '--config', configPath,
  ], { cwd: tempDir, maxBuffer: 1024 * 1024 * 64 });

  const summary = JSON.parse(await fs.readFile(path.join(outputDir, 'suite-summary.json'), 'utf8'));
  assert.equal(summary.candidates.length, 2);
  assert.equal(summary.failureCount, 0);
  assert.equal(summary.successCount, 2);

  const controlDir = path.join(outputDir, 'candidates', 'balanced12-control-hard');
  const smoothedDir = path.join(outputDir, 'candidates', 'balanced12-alllate-smoothed');
  await fs.access(path.join(controlDir, 'trained-evaluation-profile.json'));
  await fs.access(path.join(controlDir, 'learned-eval-profile.generated.js'));
  await fs.access(path.join(controlDir, 'benchmarks', 'profile.benchmark.json'));
  await fs.access(path.join(smoothedDir, 'trained-evaluation-profile.json'));
  await fs.access(path.join(smoothedDir, 'learned-eval-profile.generated.js'));
  await fs.access(path.join(smoothedDir, 'benchmarks', 'profile.benchmark.json'));

  const smoothedProfile = JSON.parse(await fs.readFile(path.join(smoothedDir, 'trained-evaluation-profile.json'), 'utf8'));
  assert.equal(smoothedProfile.interpolation?.enabled, true);
  assert.ok(smoothedProfile.featureKeys.length > (ACTIVE_EVALUATION_PROFILE.featureKeys?.length ?? DEFAULT_EVALUATION_FEATURE_KEYS.length));

  const firstStatus = JSON.parse(await fs.readFile(path.join(smoothedDir, 'candidate-status.json'), 'utf8'));
  assert.equal(firstStatus.steps['train-evaluation-profile'].status, 'success');
  assert.equal(firstStatus.steps['benchmark-profile'].status, 'success');

  await execFileAsync(process.execPath, [
    suiteScript,
    '--input', corpusPath,
    '--output-dir', outputDir,
    '--config', configPath,
    '--resume',
  ], { cwd: tempDir, maxBuffer: 1024 * 1024 * 64 });

  const resumedStatus = JSON.parse(await fs.readFile(path.join(smoothedDir, 'candidate-status.json'), 'utf8'));
  assert.equal(resumedStatus.steps['train-evaluation-profile'].status, 'success');
  assert.equal(resumedStatus.steps['train-evaluation-profile'].skipReason, 'resume-signature-match');
  assert.equal(resumedStatus.steps['benchmark-profile'].skipReason, 'resume-signature-match');

  console.log('stage130 evaluation expansion suite smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
