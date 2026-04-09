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
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage70-entry-patch-'));

try {
  const inputJsonPath = path.join(tempDir, 'tuple-source.json');
  const outputJsonPath = path.join(tempDir, 'tuple-patched.json');
  const summaryJsonPath = path.join(tempDir, 'patch-summary.json');
  const layout = {
    name: 'stage70-entry-layout',
    description: 'stage70 entry scaling smoke layout',
    tuples: DEFAULT_TUPLE_RESIDUAL_LAYOUT.tuples.slice(0, 2),
  };

  const tupleProfile = makeTupleResidualTrainingProfileFromWeights({
    name: 'stage70-entry-source',
    description: 'stage70 entry patch source profile',
    layout,
    trainedBuckets: [
      {
        key: 'late-a',
        minEmpties: 13,
        maxEmpties: 19,
        bias: 0,
        tupleWeights: [
          [1, 2, 3, 4, 5, 6, 7, 8, 9],
          [10, 11, 12, 13, 14, 15, 16, 17, 18],
        ],
      },
      {
        key: 'late-b',
        minEmpties: 7,
        maxEmpties: 12,
        bias: 0,
        tupleWeights: [
          [101, 102, 103, 104, 105, 106, 107, 108, 109],
          [110, 111, 112, 113, 114, 115, 116, 117, 118],
        ],
      },
    ],
  });

  await fs.writeFile(inputJsonPath, JSON.stringify(tupleProfile, null, 2), 'utf8');

  await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools/evaluator-training/patch-tuple-residual-profile.mjs'),
    '--input', inputJsonPath,
    '--output-json', outputJsonPath,
    '--summary-json', summaryJsonPath,
    '--keep-buckets', 'late-a,late-b',
    '--keep-tuples', '0,1',
    '--entry-scale', 'late-a:0@1=0.5,1@2=2',
  ], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 16,
  });

  const patched = JSON.parse(await fs.readFile(outputJsonPath, 'utf8'));
  const summary = JSON.parse(await fs.readFile(summaryJsonPath, 'utf8'));

  assert.equal(patched.patch?.version, 2);
  assert.deepEqual(patched.patch?.entryScales, [
    { token: 'late-a:0@1', scale: 0.5 },
    { token: '1@2', scale: 2 },
  ]);

  const lateA = patched.trainedBuckets[0];
  const lateB = patched.trainedBuckets[1];

  assert.deepEqual(lateA.tupleWeights[0].slice(0, 4), [1, 1, 3, 4]);
  assert.deepEqual(lateA.tupleWeights[1].slice(0, 4), [10, 11, 24, 13]);
  assert.deepEqual(lateB.tupleWeights[0].slice(0, 4), [101, 102, 103, 104]);
  assert.deepEqual(lateB.tupleWeights[1].slice(0, 4), [110, 111, 224, 113]);

  assert.equal(summary.entryScales.length, 2);
  console.log('stage70 tuple entry patch smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
