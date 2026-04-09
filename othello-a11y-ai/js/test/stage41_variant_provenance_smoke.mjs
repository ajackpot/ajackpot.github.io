import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

import { resolveProjectPath } from '../../tools/evaluator-training/lib.mjs';

const repoRoot = resolveProjectPath();
const activeProfilePath = resolveProjectPath('tools', 'evaluator-training', 'out', 'trained-move-ordering-profile.json');
const outputPath = resolveProjectPath('tools', 'evaluator-training', 'out', 'stage41_variant_provenance_smoke.json');
const activeProfile = JSON.parse(fs.readFileSync(activeProfilePath, 'utf8'));

const result = spawnSync(
  process.execPath,
  [
    path.join(repoRoot, 'tools', 'evaluator-training', 'make-move-ordering-variant.mjs'),
    '--input-profile', activeProfilePath,
    '--output-json', outputPath,
    '--name', 'stage41-variant-provenance-smoke',
    '--description', 'stage41 provenance smoke variant',
    '--scale-spec', 'cornerPattern@11-12=1.25',
  ],
  {
    cwd: repoRoot,
    encoding: 'utf8',
  },
);

if (result.status !== 0) {
  console.error(result.stdout);
  console.error(result.stderr);
}
assert.equal(result.status, 0, 'stage41 variant provenance smoke should succeed');
assert.ok(fs.existsSync(outputPath), 'stage41 provenance smoke JSON should be created');

const parsed = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
assert.equal(parsed.stage?.status, 'derived-variant');
assert.equal(parsed.stage?.derivedFromProfileName, activeProfile.name ?? null);
assert.equal(parsed.source?.derivedFromProfileName, activeProfile.name ?? null);
assert.equal(parsed.source?.adoptedFromProfilePath, undefined, 'manual variant should not inherit stale adoption source metadata');
assert.equal(parsed.source?.candidateAlias, undefined, 'manual variant should not inherit stale candidate alias');
assert.equal(parsed.source?.priorActiveProfileBackupPath, undefined, 'manual variant should not inherit stale prior active backup path');
assert.equal(parsed.diagnostics?.adoptedFromProfilePath, undefined, 'manual variant diagnostics should not inherit stale adoption metadata');
assert.equal(parsed.diagnostics?.candidateAlias, undefined, 'manual variant diagnostics should not inherit stale candidate alias');
assert.equal(parsed.diagnostics?.priorActiveProfileBackupPath, undefined, 'manual variant diagnostics should not inherit stale prior active backup path');
assert.equal(parsed.diagnostics?.derivedVariant?.baseProfileName, activeProfile.name ?? null);

console.log('stage41 variant provenance smoke passed');
