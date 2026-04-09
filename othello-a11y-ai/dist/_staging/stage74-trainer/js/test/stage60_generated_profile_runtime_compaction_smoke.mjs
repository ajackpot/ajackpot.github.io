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
  DEFAULT_TUPLE_RESIDUAL_PHASE_BUCKET_KEYS,
  makeTupleResidualTrainingProfileFromWeights,
  resolveTupleResidualLayout,
} from '../ai/evaluation-profiles.js';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage60-generated-compact-'));

function createZeroTupleProfile() {
  const layout = resolveTupleResidualLayout('orthogonal-adjacent-pairs-outer2-v1');
  return makeTupleResidualTrainingProfileFromWeights({
    name: 'stage60-tuple-smoke',
    layout,
    trainedBuckets: DEFAULT_TUPLE_RESIDUAL_PHASE_BUCKET_KEYS.map((bucketKey) => ({
      key: bucketKey,
      minEmpties: 0,
      maxEmpties: 0,
      scale: 1,
      bias: 0,
      tupleWeights: layout.tuples.map((tuple) => Array.from({ length: tuple.tableSize }, () => 0)),
    })),
  });
}

try {
  const evaluationJsonPath = path.join(tempDir, 'eval.json');
  const moveOrderingJsonPath = path.join(tempDir, 'move.json');
  const tupleJsonPath = path.join(tempDir, 'tuple.json');
  const compactOutputModulePath = path.join(tempDir, 'learned-eval-profile.compact.generated.js');
  const expandedOutputModulePath = path.join(tempDir, 'learned-eval-profile.expanded.generated.js');

  await fs.writeFile(evaluationJsonPath, JSON.stringify({
    ...DEFAULT_EVALUATION_PROFILE,
    name: 'stage60-eval-smoke',
  }, null, 2), 'utf8');
  await fs.writeFile(moveOrderingJsonPath, JSON.stringify({
    ...DEFAULT_MOVE_ORDERING_PROFILE,
    name: 'stage60-ordering-smoke',
  }, null, 2), 'utf8');
  await fs.writeFile(tupleJsonPath, JSON.stringify(createZeroTupleProfile(), null, 2), 'utf8');

  await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools/evaluator-training/build-generated-profile-module.mjs'),
    '--evaluation-json', evaluationJsonPath,
    '--move-ordering-json', moveOrderingJsonPath,
    '--tuple-json', tupleJsonPath,
    '--output-module', compactOutputModulePath,
    '--module-format', 'compact',
  ], { cwd: tempDir, maxBuffer: 1024 * 1024 * 16 });

  await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools/evaluator-training/build-generated-profile-module.mjs'),
    '--evaluation-json', evaluationJsonPath,
    '--move-ordering-json', moveOrderingJsonPath,
    '--tuple-json', tupleJsonPath,
    '--output-module', expandedOutputModulePath,
    '--module-format', 'expanded',
  ], { cwd: tempDir, maxBuffer: 1024 * 1024 * 16 });

  const compactText = await fs.readFile(compactOutputModulePath, 'utf8');
  const expandedText = await fs.readFile(expandedOutputModulePath, 'utf8');
  assert.match(compactText, /compact-v1/);
  assert.ok(Buffer.byteLength(compactText, 'utf8') < Buffer.byteLength(expandedText, 'utf8'));

  const imported = await import(`${pathToFileURL(compactOutputModulePath).href}?t=${Date.now()}`);
  assert.equal(imported.default?.name, 'stage60-eval-smoke');
  assert.equal(imported.GENERATED_MOVE_ORDERING_PROFILE?.name, 'stage60-ordering-smoke');
  assert.equal(imported.GENERATED_TUPLE_RESIDUAL_PROFILE?.name, 'stage60-tuple-smoke');
  assert.equal(imported.GENERATED_TUPLE_RESIDUAL_PROFILE?.layoutName, 'orthogonal-adjacent-pairs-outer2-v1');

  console.log('stage60 generated profile runtime compaction smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
