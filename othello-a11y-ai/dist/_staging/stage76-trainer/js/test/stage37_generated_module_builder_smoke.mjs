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
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage37-module-builder-'));

try {
  const evaluationJsonPath = path.join(tempDir, 'eval.json');
  const moveOrderingJsonPath = path.join(tempDir, 'move.json');
  const outputModulePath = path.join(tempDir, 'learned-eval-profile.generated.js');
  const summaryJsonPath = path.join(tempDir, 'summary.json');

  await fs.writeFile(evaluationJsonPath, JSON.stringify({
    ...DEFAULT_EVALUATION_PROFILE,
    name: 'stage37-eval-smoke',
    description: 'stage37 module builder smoke evaluation profile',
  }, null, 2), 'utf8');
  await fs.writeFile(moveOrderingJsonPath, JSON.stringify({
    ...DEFAULT_MOVE_ORDERING_PROFILE,
    name: 'stage37-ordering-smoke',
    description: 'stage37 module builder smoke move-ordering profile',
  }, null, 2), 'utf8');

  await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools/evaluator-training/build-generated-profile-module.mjs'),
    '--evaluation-json', evaluationJsonPath,
    '--move-ordering-json', moveOrderingJsonPath,
    '--output-module', outputModulePath,
    '--summary-json', summaryJsonPath,
  ], {
    cwd: tempDir,
  });

  const moduleText = await fs.readFile(outputModulePath, 'utf8');
  assert.match(moduleText, /stage37-eval-smoke/);
  assert.match(moduleText, /stage37-ordering-smoke/);

  const imported = await import(`${pathToFileURL(outputModulePath).href}?t=${Date.now()}`);
  assert.equal(imported.default?.name, 'stage37-eval-smoke');
  assert.equal(imported.GENERATED_MOVE_ORDERING_PROFILE?.name, 'stage37-ordering-smoke');

  const summary = JSON.parse(await fs.readFile(summaryJsonPath, 'utf8'));
  assert.equal(summary.evaluationProfile?.name, 'stage37-eval-smoke');
  assert.equal(summary.moveOrderingProfile?.name, 'stage37-ordering-smoke');
  assert.ok(Number.isFinite(summary.outputModuleBytes) && summary.outputModuleBytes > 0);

  console.log('stage37 generated module builder smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
