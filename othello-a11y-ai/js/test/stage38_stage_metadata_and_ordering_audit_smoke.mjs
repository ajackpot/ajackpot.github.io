import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

import {
  defaultEvaluationProfileName,
  defaultMoveOrderingProfileName,
  loadStageInfo,
  resolveProjectPath,
} from '../../tools/evaluator-training/lib.mjs';

const stageInfo = loadStageInfo();
assert.equal(stageInfo.tag, 'stage38');
assert.equal(defaultEvaluationProfileName(), 'trained-phase-linear-stage38');
assert.equal(defaultMoveOrderingProfileName(), 'trained-move-ordering-stage38');

const repoRoot = resolveProjectPath();
const evaluationProfilePath = resolveProjectPath('tools', 'evaluator-training', 'out', 'train-full-smoke.json');
const moveOrderingProfilePath = resolveProjectPath('tools', 'evaluator-training', 'out', 'stage32_trained-move-ordering-smoke.json');
const outputJsonPath = resolveProjectPath('benchmarks', 'stage38_move_ordering_search_cost_audit_smoke.json');

const result = spawnSync(
  process.execPath,
  [
    path.join(repoRoot, 'tools', 'evaluator-training', 'audit-move-ordering-search-cost.mjs'),
    '--evaluation-profile', evaluationProfilePath,
    '--move-ordering-profile', moveOrderingProfilePath,
    '--depth-empties', '15',
    '--exact-empties', '10',
    '--seed-start', '1',
    '--seed-count', '1',
    '--repetitions', '1',
    '--time-limit-ms', '50',
    '--max-depth', '2',
    '--depth-exact-endgame-empties', '8',
    '--exact-time-limit-ms', '2000',
    '--exact-max-depth', '10',
    '--exact-endgame-empties', '10',
    '--output-json', outputJsonPath,
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
assert.equal(result.status, 0, 'stage38 move-ordering search-cost audit smoke should succeed');
assert.ok(fs.existsSync(outputJsonPath), 'audit smoke JSON should be created');

const parsed = JSON.parse(fs.readFileSync(outputJsonPath, 'utf8'));
assert.ok(Array.isArray(parsed.variants), 'audit summary should contain variants');
assert.equal(parsed.variants.length, 9, 'audit summary should contain legacy/full plus all feature ablations');
assert.equal(parsed.variants[0].key, 'legacy');
assert.equal(parsed.variants[1].key, 'full');
assert.ok(parsed.variants.some((entry) => entry.key === 'no-corners'), 'default audit should include corners ablation');
assert.ok(parsed.variants.some((entry) => entry.key === 'no-edgePattern'));

const variantOutputPath = resolveProjectPath('tools', 'evaluator-training', 'out', 'stage38_variant_stage_metadata_smoke.json');
const variantResult = spawnSync(
  process.execPath,
  [
    path.join(repoRoot, 'tools', 'evaluator-training', 'make-move-ordering-variant.mjs'),
    '--input-profile', moveOrderingProfilePath,
    '--output-json', variantOutputPath,
    '--name', 'stage38-variant-smoke',
    '--description', 'stage metadata smoke variant',
    '--scale-spec', 'mobility@10-12=0.5',
  ],
  {
    cwd: repoRoot,
    encoding: 'utf8',
  },
);

if (variantResult.status !== 0) {
  console.error(variantResult.stdout);
  console.error(variantResult.stderr);
}
assert.equal(variantResult.status, 0, 'make-move-ordering-variant smoke should succeed');
assert.ok(fs.existsSync(variantOutputPath), 'variant smoke JSON should be created');
const variantParsed = JSON.parse(fs.readFileSync(variantOutputPath, 'utf8'));
assert.equal(variantParsed.stage?.status, 'derived-variant');
assert.equal(variantParsed.stage?.derivedFromProfileName, variantParsed.source?.derivedFromProfileName);
assert.equal(variantParsed.stage?.derivedFromProfilePath, variantParsed.source?.derivedFromProfilePath);

console.log('stage38 stage metadata and move-ordering search-cost audit smoke passed');
