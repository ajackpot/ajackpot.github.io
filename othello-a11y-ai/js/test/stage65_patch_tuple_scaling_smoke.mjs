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
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage65-tuple-patch-scale-'));

try {
  const inputJsonPath = path.join(tempDir, 'tuple-source.json');
  const outputJsonPath = path.join(tempDir, 'tuple-patched.json');
  const summaryJsonPath = path.join(tempDir, 'patch-summary.json');
  const layout = {
    name: 'stage65-scale-layout',
    description: 'stage65 scaling smoke layout',
    tuples: DEFAULT_TUPLE_RESIDUAL_LAYOUT.tuples.slice(0, 3),
  };

  const tupleProfile = makeTupleResidualTrainingProfileFromWeights({
    name: 'stage65-scale-source',
    description: 'stage65 patch scale source profile',
    layout,
    trainedBuckets: [
      {
        key: 'late-a',
        minEmpties: 13,
        maxEmpties: 19,
        bias: 80,
        tupleWeights: [
          [1, 2, 3, 4, 5, 6, 7, 8, 9],
          [10, 11, 12, 13, 14, 15, 16, 17, 18],
          [20, 21, 22, 23, 24, 25, 26, 27, 28],
        ],
      },
      {
        key: 'late-b',
        minEmpties: 7,
        maxEmpties: 12,
        bias: 40,
        tupleWeights: [
          [101, 102, 103, 104, 105, 106, 107, 108, 109],
          [110, 111, 112, 113, 114, 115, 116, 117, 118],
          [120, 121, 122, 123, 124, 125, 126, 127, 128],
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
    '--global-scale', '0.5',
    '--bucket-scale', 'late-b=0.25',
    '--tuple-scale', '0=2',
  ], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 16,
  });

  const patched = JSON.parse(await fs.readFile(outputJsonPath, 'utf8'));
  const summary = JSON.parse(await fs.readFile(summaryJsonPath, 'utf8'));

  assert.equal(patched.layout.tupleCount, 2);
  assert.equal(patched.trainedBuckets.length, 2);
  assert.equal(patched.patch?.version, 2);
  assert.equal(patched.patch?.globalScale, 0.5);
  assert.deepEqual(patched.patch?.bucketScales, [{ token: 'late-b', scale: 0.25 }]);
  assert.deepEqual(patched.patch?.tupleScales, [{ token: '0', scale: 2 }]);

  const lateA = patched.trainedBuckets[0];
  const lateB = patched.trainedBuckets[1];
  assert.equal(lateA.bias, 40); // 80 * 0.5
  assert.equal(lateB.bias, 5);  // 40 * 0.5 * 0.25
  assert.deepEqual(lateA.tupleWeights[0].slice(0, 4), [1, 2, 3, 4]); // *0.5*2 = 1.0x
  assert.deepEqual(lateA.tupleWeights[1].slice(0, 4), [5, 5.5, 6, 6.5]); // *0.5
  assert.deepEqual(lateB.tupleWeights[0].slice(0, 4), [25.25, 25.5, 25.75, 26]); // *0.5*0.25*2 = 0.25x
  assert.deepEqual(lateB.tupleWeights[1].slice(0, 4), [13.75, 13.875, 14, 14.125]); // *0.125

  assert.equal(summary.globalScale, 0.5);
  assert.equal(summary.bucketScales.length, 1);
  assert.equal(summary.tupleScales.length, 1);

  console.log('stage65 tuple patch scaling smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
