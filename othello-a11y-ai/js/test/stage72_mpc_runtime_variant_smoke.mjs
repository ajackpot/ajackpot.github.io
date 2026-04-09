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
  compileMpcProfile,
} from '../ai/evaluation-profiles.js';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage72-mpc-variant-'));

try {
  const evaluationJsonPath = path.join(tempDir, 'eval.json');
  const moveOrderingJsonPath = path.join(tempDir, 'move.json');
  const baseMpcJsonPath = path.join(tempDir, 'base-mpc.json');
  const variantMpcJsonPath = path.join(tempDir, 'variant-mpc.json');
  const outputModulePath = path.join(tempDir, 'learned-eval-profile.generated.js');

  await fs.writeFile(evaluationJsonPath, JSON.stringify({
    ...DEFAULT_EVALUATION_PROFILE,
    name: 'stage72-eval-smoke',
  }, null, 2), 'utf8');
  await fs.writeFile(moveOrderingJsonPath, JSON.stringify({
    ...DEFAULT_MOVE_ORDERING_PROFILE,
    name: 'stage72-ordering-smoke',
  }, null, 2), 'utf8');
  await fs.writeFile(baseMpcJsonPath, JSON.stringify({
    version: 1,
    name: 'stage72-base-mpc',
    description: 'stage72 mpc runtime variant smoke base profile',
    calibrations: [
      {
        key: 'stage72-all-d4-d8',
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
          intervalHalfWidth: 5,
          highIntervalHalfWidth: 7,
          lowIntervalHalfWidth: 9,
        },
      },
    ],
  }, null, 2), 'utf8');

  await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools/evaluator-training/make-mpc-runtime-variant.mjs'),
    '--input-profile', baseMpcJsonPath,
    '--output-json', variantMpcJsonPath,
    '--name', 'stage72-derived-mpc',
    '--enable-low-cut', 'on',
    '--max-checks-per-node', '2',
    '--high-scale', '0.9',
    '--low-scale', '1.1',
    '--depth-distance-scale', '1.5',
  ], { cwd: tempDir, maxBuffer: 1024 * 1024 * 16 });

  const variantJson = JSON.parse(await fs.readFile(variantMpcJsonPath, 'utf8'));
  assert.equal(variantJson.name, 'stage72-derived-mpc');
  assert.equal(variantJson.runtime.enableLowCut, true);
  assert.equal(variantJson.runtime.maxChecksPerNode, 2);
  assert.equal(variantJson.runtime.highScale, 0.9);
  assert.equal(variantJson.runtime.lowScale, 1.1);
  assert.equal(variantJson.runtime.depthDistanceScale, 1.5);

  await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools/evaluator-training/build-generated-profile-module.mjs'),
    '--evaluation-json', evaluationJsonPath,
    '--move-ordering-json', moveOrderingJsonPath,
    '--mpc-json', variantMpcJsonPath,
    '--output-module', outputModulePath,
    '--module-format', 'compact',
  ], { cwd: tempDir, maxBuffer: 1024 * 1024 * 16 });

  const imported = await import(`${pathToFileURL(outputModulePath).href}?t=${Date.now()}`);
  assert.equal(imported.GENERATED_MPC_PROFILE?.name, 'stage72-derived-mpc');
  assert.equal(imported.GENERATED_MPC_PROFILE?.runtime?.enableLowCut, true);
  assert.equal(imported.GENERATED_MPC_PROFILE?.runtime?.maxChecksPerNode, 2);
  assert.equal(imported.GENERATED_MPC_PROFILE?.calibrations?.[0]?.recommendedZ?.highIntervalHalfWidth, 7);
  assert.equal(imported.GENERATED_MPC_PROFILE?.calibrations?.[0]?.recommendedZ?.lowIntervalHalfWidth, 9);

  const compiled = compileMpcProfile(imported.GENERATED_MPC_PROFILE);
  assert.equal(compiled?.runtime?.enableLowCut, true);
  assert.equal(compiled?.runtime?.maxChecksPerNode, 2);
  assert.equal(compiled?.usableCalibrations?.length, 1);
  assert.equal(compiled?.calibrationsByEmptyCount?.[24]?.[0]?.lowIntervalHalfWidth, 9);

  console.log('stage72_mpc_runtime_variant_smoke: all assertions passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
