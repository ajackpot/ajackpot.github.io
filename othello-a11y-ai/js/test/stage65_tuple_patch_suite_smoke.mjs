import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { DEFAULT_TUPLE_RESIDUAL_LAYOUT, makeTupleResidualTrainingProfileFromWeights } from '../ai/evaluation-profiles.js';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage65-patch-suite-'));

function createSourceTupleProfile(name, biasBase = 10) {
  const layout = {
    name: `${name}-layout`,
    description: `${name} layout`,
    tuples: DEFAULT_TUPLE_RESIDUAL_LAYOUT.tuples.slice(0, 6),
  };
  return makeTupleResidualTrainingProfileFromWeights({
    name,
    description: `${name} tuple residual`,
    layout,
    trainedBuckets: [
      {
        key: 'late-a',
        minEmpties: 13,
        maxEmpties: 19,
        bias: biasBase,
        tupleWeights: layout.tuples.map((tuple, tupleIndex) => (
          Array.from({ length: tuple.tableSize }, (_, index) => (tupleIndex + 1) * 10 + index)
        )),
      },
      {
        key: 'late-b',
        minEmpties: 7,
        maxEmpties: 12,
        bias: biasBase * 2,
        tupleWeights: layout.tuples.map((tuple, tupleIndex) => (
          Array.from({ length: tuple.tableSize }, (_, index) => (tupleIndex + 1) * 20 + index)
        )),
      },
      {
        key: 'endgame',
        minEmpties: 0,
        maxEmpties: 6,
        bias: biasBase * 3,
        tupleWeights: layout.tuples.map((tuple, tupleIndex) => (
          Array.from({ length: tuple.tableSize }, (_, index) => (tupleIndex + 1) * 30 + index)
        )),
      },
    ],
  });
}

try {
  const sourceSuiteDir = path.join(tempDir, 'source-suite');
  const sourceCandidateDir = path.join(sourceSuiteDir, 'candidates', 'diag-full');
  const outputDir = path.join(tempDir, 'patch-suite-output');
  const configPath = path.join(tempDir, 'patch-suite-config.json');
  const suiteScript = path.join(repoRoot, 'tools/evaluator-training/run-tuple-patch-suite.mjs');

  await fs.mkdir(sourceCandidateDir, { recursive: true });
  await fs.writeFile(
    path.join(sourceCandidateDir, 'trained-tuple-residual-profile.calibrated.json'),
    JSON.stringify(createSourceTupleProfile('diag-full-source', 12), null, 2),
    'utf8',
  );

  await fs.writeFile(configPath, JSON.stringify({
    defaults: {
      calibration: { enabled: false },
      exportModule: true,
      benchmarks: {
        profile: { enabled: false },
        depth: { enabled: false },
        exact: { enabled: false },
      },
    },
    candidates: [
      {
        key: 'active-lateb-half',
        sourceTupleProfileJson: 'active',
        bucketScales: { 'late-b': 0.5 },
      },
      {
        key: 'diag-endgame-top4',
        sourceCandidateKey: 'diag-full',
        keepBuckets: ['endgame'],
        keepTopTuples: 4,
      },
    ],
  }, null, 2), 'utf8');

  await execFileAsync(process.execPath, [
    suiteScript,
    '--source-suite-dir', sourceSuiteDir,
    '--output-dir', outputDir,
    '--config', configPath,
  ], { cwd: tempDir, maxBuffer: 1024 * 1024 * 32 });

  const summary = JSON.parse(await fs.readFile(path.join(outputDir, 'suite-summary.json'), 'utf8'));
  assert.equal(summary.candidates.length, 2);
  assert.equal(summary.failureCount, 0);
  assert.equal(summary.successCount, 2);

  const activeDir = path.join(outputDir, 'candidates', 'active-lateb-half');
  const diagDir = path.join(outputDir, 'candidates', 'diag-endgame-top4');
  await fs.access(path.join(activeDir, 'trained-tuple-residual-profile.patched.json'));
  await fs.access(path.join(activeDir, 'learned-eval-profile.preview.generated.js'));
  await fs.access(path.join(activeDir, 'learned-eval-profile.generated.js'));
  await fs.access(path.join(diagDir, 'trained-tuple-residual-profile.patched.json'));
  await fs.access(path.join(diagDir, 'learned-eval-profile.generated.js'));

  const status = JSON.parse(await fs.readFile(path.join(diagDir, 'candidate-status.json'), 'utf8'));
  assert.equal(status.steps['patch-tuple-residual-profile'].status, 'success');
  assert.equal(status.steps['export-generated-module'].status, 'success');

  const patched = JSON.parse(await fs.readFile(path.join(diagDir, 'trained-tuple-residual-profile.patched.json'), 'utf8'));
  assert.equal(patched.trainedBuckets.length, 1);
  assert.equal(patched.trainedBuckets[0].key, 'endgame');
  assert.equal(patched.layout.tupleCount, 4);

  await execFileAsync(process.execPath, [
    suiteScript,
    '--source-suite-dir', sourceSuiteDir,
    '--output-dir', outputDir,
    '--config', configPath,
    '--resume',
  ], { cwd: tempDir, maxBuffer: 1024 * 1024 * 32 });

  const resumedStatus = JSON.parse(await fs.readFile(path.join(diagDir, 'candidate-status.json'), 'utf8'));
  assert.equal(resumedStatus.steps['patch-tuple-residual-profile'].skipReason, 'resume-signature-match');
  assert.equal(resumedStatus.steps['export-generated-module'].skipReason, 'resume-signature-match');

  console.log('stage65 tuple patch suite smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
