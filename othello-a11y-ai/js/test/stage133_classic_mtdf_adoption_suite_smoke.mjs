import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage133-classic-adoption-'));
const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/run-stage133-classic-mtdf-adoption-suite.mjs'),
  '--output-dir', tempDir,
  '--scenario-keys', 'normal',
  '--smoke',
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});

assert.equal(result.status, 0, result.stdout || result.stderr || 'stage133 suite smoke failed');
const summaryPath = path.join(tempDir, 'stage133_classic_mtdf_adoption_summary.json');
assert.ok(fs.existsSync(summaryPath), 'stage133 suite smoke should emit a summary JSON');
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
assert.equal(summary.type, 'stage133-classic-mtdf-adoption-suite');
assert.equal(summary.options.smoke, true);
assert.ok(Array.isArray(summary.scenarios) && summary.scenarios.length === 1);
assert.ok(Array.isArray(summary.candidates) && summary.candidates.length >= 2);
assert.ok(summary.finalDecision && typeof summary.finalDecision.action === 'string');
console.log('stage133 classic mtdf adoption suite smoke passed');
