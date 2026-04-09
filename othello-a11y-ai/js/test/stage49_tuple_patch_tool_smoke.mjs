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
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage49-tuple-patch-'));

try {
  const inputJsonPath = path.join(tempDir, 'tuple-source.json');
  const outputJsonPath = path.join(tempDir, 'tuple-patched.json');

  const tupleProfile = makeTupleResidualTrainingProfileFromWeights({
    name: 'stage49-patch-source',
    description: 'stage49 patch source profile',
    layout: DEFAULT_TUPLE_RESIDUAL_LAYOUT,
    diagnostics: {
      holdoutSelected: {
        delta: { maeInStones: -0.1 },
        candidate: { meanResidualInStones: 0 },
      },
      selectedAll: { delta: { maeInStones: -0.1 } },
      allSamples: { delta: { maeInStones: -0.05 } },
      byBucket: [],
    },
    trainedBuckets: [
      {
        key: 'late-a',
        minEmpties: 13,
        maxEmpties: 19,
        bias: 50,
        tupleWeights: DEFAULT_TUPLE_RESIDUAL_LAYOUT.tuples.map((tuple, tupleIndex) => (
          Array.from({ length: tuple.tableSize }, (_, index) => tupleIndex * 100 + index)
        )),
      },
      {
        key: 'late-b',
        minEmpties: 7,
        maxEmpties: 12,
        bias: 75,
        tupleWeights: DEFAULT_TUPLE_RESIDUAL_LAYOUT.tuples.map((tuple, tupleIndex) => (
          Array.from({ length: tuple.tableSize }, (_, index) => (tupleIndex + 1) * 10 + index)
        )),
      },
      {
        key: 'endgame',
        minEmpties: 0,
        maxEmpties: 6,
        bias: 125,
        tupleWeights: DEFAULT_TUPLE_RESIDUAL_LAYOUT.tuples.map((tuple, tupleIndex) => (
          Array.from({ length: tuple.tableSize }, (_, index) => tupleIndex + index)
        )),
      },
    ],
  });

  await fs.writeFile(inputJsonPath, JSON.stringify(tupleProfile, null, 2), 'utf8');

  await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools/evaluator-training/patch-tuple-residual-profile.mjs'),
    '--input', inputJsonPath,
    '--output-json', outputJsonPath,
    '--keep-buckets', 'late-b,endgame',
    '--keep-top-tuples', '8',
  ], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 16,
  });

  const patched = JSON.parse(await fs.readFile(outputJsonPath, 'utf8'));
  assert.equal(patched.trainedBuckets.length, 2);
  assert.equal(patched.layout.tupleCount, 8);
  assert.equal(patched.layout.tuples.length, 8);
  assert.equal(patched.patch?.diagnosticsStatus, 'stale-removed');
  assert.equal(patched.diagnostics ?? null, null);
  assert.equal(patched.calibration ?? null, null);
  assert.deepEqual(patched.patch?.selectedBucketKeys, ['late-b', 'endgame']);

  console.log('stage49 tuple patch tool smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
