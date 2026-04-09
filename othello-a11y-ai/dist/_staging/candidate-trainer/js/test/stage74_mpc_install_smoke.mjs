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
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage74-mpc-install-'));

try {
  const evaluationJsonPath = path.join(tempDir, 'eval.json');
  const moveOrderingJsonPath = path.join(tempDir, 'move.json');
  const mpcJsonPath = path.join(tempDir, 'mpc.json');
  const outputModulePath = path.join(tempDir, 'learned-eval-profile.generated.js');
  const summaryJsonPath = path.join(tempDir, 'summary.json');

  await fs.writeFile(evaluationJsonPath, JSON.stringify({
    ...DEFAULT_EVALUATION_PROFILE,
    name: 'stage74-eval-smoke',
  }, null, 2), 'utf8');
  await fs.writeFile(moveOrderingJsonPath, JSON.stringify({
    ...DEFAULT_MOVE_ORDERING_PROFILE,
    name: 'stage74-ordering-smoke',
  }, null, 2), 'utf8');
  await fs.writeFile(mpcJsonPath, JSON.stringify({
    version: 1,
    name: 'stage74-install-mpc-smoke',
    description: 'stage74 install MPC smoke profile',
    runtime: {
      enableHighCut: true,
      enableLowCut: false,
      maxChecksPerNode: 1,
      minDepth: 2,
      minDepthGap: 2,
      maxDepthDistance: 1,
      minPly: 1,
      highScale: 0.95,
      lowScale: 1,
      depthDistanceScale: 1.25,
    },
    calibrations: [
      {
        key: 'stage74-all-d4-d8',
        label: '18-60 / d4→d8',
        minEmpties: 18,
        maxEmpties: 60,
        shallowDepth: 4,
        deepDepth: 8,
        usable: true,
        regression: {
          intercept: 0,
          slope: 1,
          correlation: 0.99,
          rSquared: 0.98,
        },
        recommendedZ: {
          z: 1.96,
          coverage: 0.99,
          intervalHalfWidth: 6,
        },
      },
    ],
  }, null, 2), 'utf8');

  await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools/evaluator-training/install-mpc-profile.mjs'),
    '--mpc-json', mpcJsonPath,
    '--evaluation-json', evaluationJsonPath,
    '--move-ordering-json', moveOrderingJsonPath,
    '--output-module', outputModulePath,
    '--summary-json', summaryJsonPath,
    '--module-format', 'compact',
  ], { cwd: tempDir, maxBuffer: 1024 * 1024 * 16 });

  const summary = JSON.parse(await fs.readFile(summaryJsonPath, 'utf8'));
  assert.equal(summary.mpcProfileName, 'stage74-install-mpc-smoke');
  assert.equal(summary.evaluationProfileName, 'stage74-eval-smoke');
  assert.equal(summary.moveOrderingProfileName, 'stage74-ordering-smoke');
  assert.equal(summary.mpcUsableCalibrationCount, 1);

  const imported = await import(`${pathToFileURL(outputModulePath).href}?t=${Date.now()}`);
  assert.equal(imported.GENERATED_EVALUATION_PROFILE?.name, 'stage74-eval-smoke');
  assert.equal(imported.GENERATED_MOVE_ORDERING_PROFILE?.name, 'stage74-ordering-smoke');
  assert.equal(imported.GENERATED_MPC_PROFILE?.name, 'stage74-install-mpc-smoke');
  assert.equal(imported.GENERATED_MPC_PROFILE?.runtime?.highScale, 0.95);
  assert.equal(imported.GENERATED_MPC_PROFILE?.calibrations?.length, 1);

  console.log('stage74_mpc_install_smoke: all assertions passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
