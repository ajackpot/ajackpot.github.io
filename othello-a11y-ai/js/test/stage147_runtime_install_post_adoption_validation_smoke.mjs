import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage147-install-'));

try {
  const activeSourcePath = path.join(repoRoot, 'tools', 'engine-match', 'fixtures', 'historical-installed-modules', 'active-precompact-tuple.learned-eval-profile.generated.js');
  const selectedSourcePath = path.join(repoRoot, 'benchmarks', 'stage146', 'selected-final-generated-module.js');
  const activeModulePath = path.join(tempDir, 'runtime', 'learned-eval-profile.generated.js');
  const selectedModulePath = path.join(tempDir, 'candidate', 'selected-final-generated-module.js');
  const archiveModulePath = path.join(tempDir, 'archive', 'previous-active.generated.js');
  const installedSnapshotModulePath = path.join(tempDir, 'out', 'installed-active.generated.js');
  const outputDir = path.join(tempDir, 'out');

  await fs.mkdir(path.dirname(activeModulePath), { recursive: true });
  await fs.mkdir(path.dirname(selectedModulePath), { recursive: true });
  await fs.copyFile(activeSourcePath, activeModulePath);
  await fs.copyFile(selectedSourcePath, selectedModulePath);

  await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools', 'engine-match', 'run-stage147-runtime-install-and-post-adoption-validation.mjs'),
    '--active-module', activeModulePath,
    '--selected-module', selectedModulePath,
    '--archive-module', archiveModulePath,
    '--installed-snapshot-module', installedSnapshotModulePath,
    '--output-dir', outputDir,
    '--smoke',
    '--force',
  ], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 16,
  });

  const summaryPath = path.join(outputDir, 'stage147_runtime_install_post_adoption_validation_summary.json');
  const notesPath = path.join(outputDir, 'stage147_runtime_install_post_adoption_validation_notes.md');
  await fs.access(summaryPath);
  await fs.access(notesPath);
  await fs.access(archiveModulePath);
  await fs.access(installedSnapshotModulePath);

  const [summary, notes, activeModuleText, selectedModuleText, archiveModuleText] = await Promise.all([
    fs.readFile(summaryPath, 'utf8').then((raw) => JSON.parse(raw)),
    fs.readFile(notesPath, 'utf8'),
    fs.readFile(activeModulePath, 'utf8'),
    fs.readFile(selectedModulePath, 'utf8'),
    fs.readFile(archiveModulePath, 'utf8'),
  ]);

  assert.equal(summary.type, 'stage147-runtime-install-and-post-adoption-validation');
  assert.equal(summary.installation.installPerformed, true);
  assert.equal(summary.parity.installedMatchesSelected, true);
  assert.equal(summary.parity.snapshotMatchesInstalled, true);
  assert.match(summary.finalDecision.action, /confirm|rollback/);
  assert.match(notes, /Stage 147 runtime install and post-adoption validation notes/);

  if (summary.installation.rollbackPerformed) {
    assert.equal(summary.finalDecision.action, 'rollback-active-runtime-switch');
    assert.equal(activeModuleText, archiveModuleText, 'rollback mode should restore the archived previous-active module');
    assert.notEqual(activeModuleText, selectedModuleText, 'rollback mode should not leave the selected fixture installed');
  } else {
    assert.equal(summary.finalDecision.action, 'confirm-active-runtime-switch-installed');
    assert.equal(activeModuleText, selectedModuleText, 'confirm mode should keep the selected fixture installed');
  }

  console.log('stage147 runtime install and post-adoption validation smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
