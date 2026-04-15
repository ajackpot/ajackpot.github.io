import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage146-adoption-'));

try {
  const outputDir = path.join(tempDir, 'out');
  await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools', 'engine-match', 'run-stage146-final-compact-tuple-adoption-gate.mjs'),
    '--output-dir', outputDir,
    '--smoke',
    '--force',
  ], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 16,
  });

  const summaryPath = path.join(outputDir, 'stage146_final_compact_tuple_adoption_summary.json');
  const notesPath = path.join(outputDir, 'stage146_final_compact_tuple_adoption_notes.md');
  await fs.access(summaryPath);
  await fs.access(notesPath);

  const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
  const notes = await fs.readFile(notesPath, 'utf8');
  assert.equal(summary.type, 'stage146-final-compact-tuple-adoption-gate');
  assert.equal(summary.variants.length, 2);
  assert.ok(summary.searchCost.depth.sameBestRate >= 0);
  assert.ok(summary.searchCost.exact.sameScoreRate >= 0);
  assert.match(summary.finalDecision.action, /adopt|hold|reject/);
  assert.match(notes, /Stage 146 final compact tuple adoption gate notes/);

  console.log('stage146 final compact tuple adoption gate smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
