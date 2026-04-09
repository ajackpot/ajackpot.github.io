import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { DEFAULT_TUPLE_RESIDUAL_LAYOUT, makeTupleResidualTrainingProfileFromWeights } from '../ai/evaluation-profiles.js';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage48-install-bias-'));

try {
  const tupleJsonPath = path.join(tempDir, 'tuple-bias.json');
  const outputModulePath = path.join(tempDir, 'learned-eval-profile.generated.js');

  const tupleProfile = makeTupleResidualTrainingProfileFromWeights({
    name: 'stage48-install-bias',
    description: 'stage48 install tuple bias smoke profile',
    layout: DEFAULT_TUPLE_RESIDUAL_LAYOUT,
    trainedBuckets: [
      {
        key: 'late-a',
        minEmpties: 13,
        maxEmpties: 19,
        scale: 1,
        bias: 1234,
        tupleWeights: DEFAULT_TUPLE_RESIDUAL_LAYOUT.tuples.map((tuple) => (
          Array.from({ length: tuple.tableSize }, () => 0)
        )),
      },
    ],
  });

  await fs.writeFile(tupleJsonPath, JSON.stringify(tupleProfile, null, 2), 'utf8');

  await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools/evaluator-training/install-tuple-residual-profile.mjs'),
    '--tuple-json', tupleJsonPath,
    '--output-module', outputModulePath,
  ], {
    cwd: tempDir,
    maxBuffer: 1024 * 1024 * 16,
  });

  const imported = await import(`${pathToFileURL(outputModulePath).href}?t=${Date.now()}`);
  assert.equal(imported.GENERATED_TUPLE_RESIDUAL_PROFILE?.trainedBuckets?.[0]?.bias, 1234);

  console.log('stage48 install tuple bias smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
