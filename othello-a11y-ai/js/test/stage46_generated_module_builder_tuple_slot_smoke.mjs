import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  DEFAULT_EVALUATION_PROFILE,
  DEFAULT_MOVE_ORDERING_PROFILE,
  DEFAULT_TUPLE_RESIDUAL_LAYOUT,
  makeTupleResidualTrainingProfileFromWeights,
} from '../ai/evaluation-profiles.js';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage46-tuple-module-'));

try {
  const evaluationJsonPath = path.join(tempDir, 'eval.json');
  const moveOrderingJsonPath = path.join(tempDir, 'move.json');
  const tupleJsonPath = path.join(tempDir, 'tuple.json');
  const outputModulePath = path.join(tempDir, 'learned-eval-profile.generated.js');
  const summaryJsonPath = path.join(tempDir, 'summary.json');

  const tupleProfile = makeTupleResidualTrainingProfileFromWeights({
    name: 'stage46-tuple-smoke',
    description: 'stage46 tuple slot builder smoke profile',
    layout: DEFAULT_TUPLE_RESIDUAL_LAYOUT,
    trainedBuckets: [
      {
        key: 'late-a',
        minEmpties: 13,
        maxEmpties: 19,
        scale: 1,
        tupleWeights: DEFAULT_TUPLE_RESIDUAL_LAYOUT.tuples.map((tuple, tupleIndex) => (
          Array.from({ length: tuple.tableSize }, (_, entryIndex) => (
            tupleIndex === 0 && entryIndex === 4 ? 123 : 0
          ))
        )),
      },
    ],
  });

  await fs.writeFile(evaluationJsonPath, JSON.stringify({
    ...DEFAULT_EVALUATION_PROFILE,
    name: 'stage46-eval-smoke',
  }, null, 2), 'utf8');
  await fs.writeFile(moveOrderingJsonPath, JSON.stringify({
    ...DEFAULT_MOVE_ORDERING_PROFILE,
    name: 'stage46-ordering-smoke',
  }, null, 2), 'utf8');
  await fs.writeFile(tupleJsonPath, JSON.stringify(tupleProfile, null, 2), 'utf8');

  await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools/evaluator-training/build-generated-profile-module.mjs'),
    '--evaluation-json', evaluationJsonPath,
    '--move-ordering-json', moveOrderingJsonPath,
    '--tuple-json', tupleJsonPath,
    '--output-module', outputModulePath,
    '--summary-json', summaryJsonPath,
  ], {
    cwd: tempDir,
    maxBuffer: 1024 * 1024 * 16,
  });

  const imported = await import(`${pathToFileURL(outputModulePath).href}?t=${Date.now()}`);
  assert.equal(imported.default?.name, 'stage46-eval-smoke');
  assert.equal(imported.GENERATED_MOVE_ORDERING_PROFILE?.name, 'stage46-ordering-smoke');
  assert.equal(imported.GENERATED_TUPLE_RESIDUAL_PROFILE?.name, 'stage46-tuple-smoke');
  assert.equal(imported.GENERATED_TUPLE_RESIDUAL_PROFILE?.trainedBuckets?.[0]?.tupleWeights?.[0]?.[4], 123);

  const summary = JSON.parse(await fs.readFile(summaryJsonPath, 'utf8'));
  assert.equal(summary.tupleResidualProfile?.name, 'stage46-tuple-smoke');
  assert.equal(summary.tupleResidualProfile?.trainedBucketCount, 1);
  assert.equal(summary.tupleResidualProfile?.tupleCount, DEFAULT_TUPLE_RESIDUAL_LAYOUT.tupleCount);

  console.log('stage46 generated module builder tuple slot smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
