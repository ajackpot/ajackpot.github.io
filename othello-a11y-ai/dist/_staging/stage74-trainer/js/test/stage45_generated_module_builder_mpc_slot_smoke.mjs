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
} from '../ai/evaluation-profiles.js';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage45-mpc-module-'));

try {
  const evaluationJsonPath = path.join(tempDir, 'eval.json');
  const moveOrderingJsonPath = path.join(tempDir, 'move.json');
  const mpcJsonPath = path.join(tempDir, 'mpc.json');
  const outputModulePath = path.join(tempDir, 'learned-eval-profile.generated.js');
  const summaryJsonPath = path.join(tempDir, 'summary.json');

  await fs.writeFile(evaluationJsonPath, JSON.stringify({
    ...DEFAULT_EVALUATION_PROFILE,
    name: 'stage45-eval-smoke',
  }, null, 2), 'utf8');
  await fs.writeFile(moveOrderingJsonPath, JSON.stringify({
    ...DEFAULT_MOVE_ORDERING_PROFILE,
    name: 'stage45-ordering-smoke',
  }, null, 2), 'utf8');
  await fs.writeFile(mpcJsonPath, JSON.stringify({
    version: 1,
    name: 'stage45-mpc-smoke',
    description: 'stage45 optional mpc slot smoke profile',
    calibrations: [
      {
        key: 'mpc-18-21-d4-d8',
        minEmpties: 18,
        maxEmpties: 21,
        shallowDepth: 4,
        deepDepth: 8,
        usable: true,
      },
    ],
  }, null, 2), 'utf8');

  await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools/evaluator-training/build-generated-profile-module.mjs'),
    '--evaluation-json', evaluationJsonPath,
    '--move-ordering-json', moveOrderingJsonPath,
    '--mpc-json', mpcJsonPath,
    '--output-module', outputModulePath,
    '--summary-json', summaryJsonPath,
  ], {
    cwd: tempDir,
    maxBuffer: 1024 * 1024 * 16,
  });

  const imported = await import(`${pathToFileURL(outputModulePath).href}?t=${Date.now()}`);
  assert.equal(imported.default?.name, 'stage45-eval-smoke');
  assert.equal(imported.GENERATED_MOVE_ORDERING_PROFILE?.name, 'stage45-ordering-smoke');
  assert.equal(imported.GENERATED_MPC_PROFILE?.name, 'stage45-mpc-smoke');
  assert.equal(imported.GENERATED_MPC_PROFILE?.calibrations?.[0]?.key, 'mpc-18-21-d4-d8');

  const summary = JSON.parse(await fs.readFile(summaryJsonPath, 'utf8'));
  assert.equal(summary.mpcProfile?.name, 'stage45-mpc-smoke');
  assert.equal(summary.mpcProfile?.usableCalibrationCount, 1);

  console.log('stage45 generated module builder mpc slot smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
