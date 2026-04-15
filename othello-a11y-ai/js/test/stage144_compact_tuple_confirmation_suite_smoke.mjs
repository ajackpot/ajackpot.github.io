import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage144-confirmation-'));

try {
  const outputDir = path.join(tempDir, 'out');
  const { stdout } = await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools', 'engine-match', 'run-stage144-compact-tuple-confirmation-suite.mjs'),
    '--output-dir', outputDir,
    '--smoke',
    '--force',
  ], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 32,
  });

  const summaryPath = path.join(outputDir, 'stage144_compact_tuple_confirmation_summary.json');
  const notesPath = path.join(outputDir, 'stage144_compact_tuple_confirmation_notes.md');
  const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
  const notes = await fs.readFile(notesPath, 'utf8');

  assert.equal(summary.type, 'stage144-compact-tuple-confirmation-suite');
  assert.equal(summary.options.smoke, true);
  assert.equal(summary.variants.length, 3);
  assert.ok(summary.variants.some((variant) => variant.label === 'diagonal-top24-latea-endgame'));
  assert.ok(summary.variants.some((variant) => variant.label === 'outer2-top24-lateb-endgame'));
  assert.ok(Array.isArray(summary.pairResults) && summary.pairResults.length > 0);
  assert.ok(Array.isArray(summary.throughputResults) && summary.throughputResults.length > 0);
  assert.ok(Array.isArray(summary.activeHeadToHead) && summary.activeHeadToHead.length >= 4);
  assert.ok(typeof summary.finalDecision?.action === 'string' && summary.finalDecision.action.length > 0);
  assert.match(notes, /Stage 144 compact tuple confirmation notes/);
  assert.match(stdout, /Final action:/);

  console.log('stage144 compact tuple confirmation suite smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
