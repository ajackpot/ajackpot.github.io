import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage145-move-ordering-compat-'));

try {
  const outputDir = path.join(tempDir, 'out');
  const { stdout } = await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools', 'engine-match', 'run-stage145-move-ordering-compatibility-replay.mjs'),
    '--output-dir', outputDir,
    '--smoke',
    '--force',
  ], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 64,
  });

  const summaryPath = path.join(outputDir, 'stage145_move_ordering_compatibility_replay_summary.json');
  const notesPath = path.join(outputDir, 'stage145_move_ordering_compatibility_replay_notes.md');
  const selectedModulePath = path.join(outputDir, 'selected-compatible-generated-module.js');
  const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
  const notes = await fs.readFile(notesPath, 'utf8');

  assert.equal(summary.type, 'stage145-move-ordering-compatibility-replay-suite');
  assert.equal(summary.options.smoke, true);
  assert.equal(summary.targetCandidate.label, 'diagonal-top24-latea-endgame');
  assert.ok(Array.isArray(summary.replayChain.replayedChain) && summary.replayChain.replayedChain.length === 5);
  assert.ok(summary.replayChain.replayedChain.every((entry) => entry.matchesStoredReference === true));
  assert.ok(Array.isArray(summary.candidateVariants) && summary.candidateVariants.length === 7);
  assert.ok(summary.candidateVariants.some((entry) => entry.key === 'candidateH2'));
  assert.ok(Array.isArray(summary.searchCostResults) && summary.searchCostResults.length === 7);
  assert.ok(Array.isArray(summary.rankedChallengers) && summary.rankedChallengers.length >= 1);
  assert.ok(typeof summary.finalDecision?.selectedMoveOrderingKey === 'string' && summary.finalDecision.selectedMoveOrderingKey.length > 0);
  assert.ok(await fs.stat(selectedModulePath));
  assert.match(notes, /Stage 145 move-ordering compatibility replay notes/);
  assert.match(stdout, /selected ordering:/);

  console.log('stage145 move-ordering compatibility replay smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
