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
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage49-inspect-patch-'));

try {
  const inputJsonPath = path.join(tempDir, 'tuple-patch.json');
  const outputJsonPath = path.join(tempDir, 'tuple-inspect-summary.json');

  const tupleProfile = makeTupleResidualTrainingProfileFromWeights({
    name: 'stage49-inspect-patch-source',
    description: 'stage49 inspect patch source profile',
    layout: {
      name: 'stage49-inspect-layout',
      description: 'stage49 inspect layout',
      tuples: DEFAULT_TUPLE_RESIDUAL_LAYOUT.tuples.slice(0, 3),
    },
    trainedBuckets: [
      {
        key: 'late-b',
        minEmpties: 7,
        maxEmpties: 12,
        bias: 150,
        tupleWeights: DEFAULT_TUPLE_RESIDUAL_LAYOUT.tuples.slice(0, 3).map((tuple, tupleIndex) => (
          Array.from({ length: tuple.tableSize }, () => tupleIndex + 1)
        )),
      },
    ],
  });

  const patched = {
    ...tupleProfile,
    patch: {
      version: 1,
      mode: 'prune',
      generatedAt: new Date().toISOString(),
      selectedTupleCount: 3,
      selectedBucketKeys: ['late-b'],
      diagnosticsStatus: 'stale-removed',
    },
  };
  await fs.writeFile(inputJsonPath, JSON.stringify(patched, null, 2), 'utf8');

  await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools/evaluator-training/inspect-tuple-residual-profile.mjs'),
    '--input', inputJsonPath,
    '--output-json', outputJsonPath,
  ], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 16,
  });

  const summary = JSON.parse(await fs.readFile(outputJsonPath, 'utf8'));
  assert.equal(summary.verdict.status, 'unvalidated-patch');
  assert.equal(summary.byBucket.length, 1);
  assert.ok(summary.warnings.some((warning) => warning.code === 'patched-unvalidated'));

  console.log('stage49 tuple inspect patch smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
