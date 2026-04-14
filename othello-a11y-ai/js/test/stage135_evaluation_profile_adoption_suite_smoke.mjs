import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage135-adoption-suite-'));
const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/engine-match/run-stage135-evaluation-profile-adoption-suite.mjs'),
  '--output-dir', tempDir,
  '--smoke',
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});

assert.equal(result.status, 0, result.stdout || result.stderr || 'stage135 adoption suite smoke failed');
const summaryPath = path.join(tempDir, 'stage135_evaluation_profile_adoption_summary.json');
assert.ok(fs.existsSync(summaryPath), 'stage135 suite smoke should emit a summary JSON');
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
assert.equal(summary.type, 'stage135-evaluation-profile-adoption-suite');
assert.equal(summary.options.smoke, true);
assert.ok(Array.isArray(summary.variantRanking) && summary.variantRanking.length >= 2);
assert.ok(summary.finalDecision && typeof summary.finalDecision.action === 'string');
console.log('stage135 evaluation profile adoption suite smoke passed');
