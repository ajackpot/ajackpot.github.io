import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const result = spawnSync(process.execPath, [
  path.resolve(repoRoot, 'tools/docs/generate-report-inventory.mjs'),
  '--check',
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
  timeout: 180000,
});

assert.equal(result.status, 0, result.stdout || result.stderr || 'stage109 report inventory smoke failed');

console.log('stage109 report inventory smoke passed');
