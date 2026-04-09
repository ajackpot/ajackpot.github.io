import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  ACTIVE_EVALUATION_PROFILE,
  ACTIVE_MOVE_ORDERING_PROFILE,
  ACTIVE_MPC_PROFILE,
  DEFAULT_TUPLE_RESIDUAL_LAYOUT,
  makeTupleResidualTrainingProfileFromWeights,
} from '../ai/evaluation-profiles.js';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage47-install-tuple-'));

try {
  const tupleJsonPath = path.join(tempDir, 'tuple.json');
  const outputModulePath = path.join(tempDir, 'learned-eval-profile.generated.js');
  const summaryJsonPath = path.join(tempDir, 'summary.json');

  const tupleProfile = makeTupleResidualTrainingProfileFromWeights({
    name: 'stage47-install-tuple',
    description: 'stage47 install tuple smoke profile',
    layout: DEFAULT_TUPLE_RESIDUAL_LAYOUT,
    trainedBuckets: [
      {
        key: 'late-a',
        minEmpties: 13,
        maxEmpties: 19,
        scale: 1,
        tupleWeights: DEFAULT_TUPLE_RESIDUAL_LAYOUT.tuples.map((tuple, tupleIndex) => (
          Array.from({ length: tuple.tableSize }, (_, entryIndex) => (
            tupleIndex === 0 && entryIndex === 4 ? 321 : 0
          ))
        )),
      },
    ],
  });

  await fs.writeFile(tupleJsonPath, JSON.stringify(tupleProfile, null, 2), 'utf8');

  await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools/evaluator-training/install-tuple-residual-profile.mjs'),
    '--tuple-json', tupleJsonPath,
    '--output-module', outputModulePath,
    '--summary-json', summaryJsonPath,
  ], {
    cwd: tempDir,
    maxBuffer: 1024 * 1024 * 16,
  });

  const imported = await import(`${pathToFileURL(outputModulePath).href}?t=${Date.now()}`);
  assert.equal(imported.GENERATED_EVALUATION_PROFILE?.name ?? null, ACTIVE_EVALUATION_PROFILE?.name ?? null);
  assert.equal(imported.GENERATED_MOVE_ORDERING_PROFILE?.name ?? null, ACTIVE_MOVE_ORDERING_PROFILE?.name ?? null);
  assert.equal(imported.GENERATED_MPC_PROFILE?.name ?? null, ACTIVE_MPC_PROFILE?.name ?? null);
  assert.equal(imported.GENERATED_TUPLE_RESIDUAL_PROFILE?.name, 'stage47-install-tuple');
  assert.equal(imported.GENERATED_TUPLE_RESIDUAL_PROFILE?.trainedBuckets?.[0]?.tupleWeights?.[0]?.[4], 321);

  const summary = JSON.parse(await fs.readFile(summaryJsonPath, 'utf8'));
  assert.equal(summary.tupleResidualProfileName, 'stage47-install-tuple');
  assert.equal(summary.evaluationProfileName ?? null, ACTIVE_EVALUATION_PROFILE?.name ?? null);
  assert.equal(summary.moveOrderingProfileName ?? null, ACTIVE_MOVE_ORDERING_PROFILE?.name ?? null);

  console.log('stage47 install tuple profile smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
