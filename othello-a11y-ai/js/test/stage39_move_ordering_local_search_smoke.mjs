import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

import { resolveProjectPath } from '../../tools/evaluator-training/lib.mjs';

const repoRoot = resolveProjectPath();
const evaluationProfilePath = resolveProjectPath('tools', 'evaluator-training', 'out', 'trained-evaluation-profile.json');
const moveOrderingProfilePath = resolveProjectPath('tools', 'evaluator-training', 'out', 'stage32_trained-move-ordering-smoke.json');
const tuningBaseProfilePath = resolveProjectPath('tools', 'evaluator-training', 'out', 'stage38_candidateC_disc0_10_12.json');
const variantOutputPath = resolveProjectPath('tools', 'evaluator-training', 'out', 'stage39_variant_drop_range_smoke.json');
const tuningOutputPath = resolveProjectPath('benchmarks', 'stage39_move_ordering_local_search_smoke.json');
const tuningBestProfilePath = resolveProjectPath('tools', 'evaluator-training', 'out', 'stage39_local_search_best_smoke.json');

const variantResult = spawnSync(
  process.execPath,
  [
    path.join(repoRoot, 'tools', 'evaluator-training', 'make-move-ordering-variant.mjs'),
    '--input-profile', moveOrderingProfilePath,
    '--output-json', variantOutputPath,
    '--name', 'stage39-drop-range-smoke',
    '--description', 'stage39 drop-range smoke variant',
    '--scale-spec', 'mobility@10-12=0.5',
    '--drop-range', '13-14',
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
assert.equal(variantResult.status, 0, 'stage39 make-move-ordering-variant drop-range smoke should succeed');
assert.ok(fs.existsSync(variantOutputPath), 'stage39 drop-range variant JSON should be created');
const variantParsed = JSON.parse(fs.readFileSync(variantOutputPath, 'utf8'));
assert.equal(variantParsed.stage?.status, 'derived-variant');
assert.equal(variantParsed.diagnostics?.derivedVariant?.removedBucketCount, 1);
assert.equal(variantParsed.source?.tuning?.dropRanges?.length, 1);
assert.equal(variantParsed.trainedBuckets.length, 2);

const tuningResult = spawnSync(
  process.execPath,
  [
    path.join(repoRoot, 'tools', 'evaluator-training', 'tune-move-ordering-search-cost.mjs'),
    '--evaluation-profile', evaluationProfilePath,
    '--base-profile', tuningBaseProfilePath,
    '--features', 'corners,cornerAdjacency,parity',
    '--feature-scales', '0,0.5',
    '--ranges', '10-10,11-12',
    '--fallback-ranges', '10-10,11-12',
    '--max-rounds', '1',
    '--max-actions-per-round', '8',
    '--depth-empties', '15',
    '--exact-empties', '13,11',
    '--seed-start', '1',
    '--seed-count', '1',
    '--repetitions', '1',
    '--time-limit-ms', '1500',
    '--max-depth', '6',
    '--depth-exact-endgame-empties', '10',
    '--exact-time-limit-ms', '4000',
    '--exact-max-depth', '12',
    '--exact-endgame-empties', '14',
    '--output-json', tuningOutputPath,
    '--best-profile-json', tuningBestProfilePath,
  ],
  {
    cwd: repoRoot,
    encoding: 'utf8',
  },
);

if (tuningResult.status !== 0) {
  console.error(tuningResult.stdout);
  console.error(tuningResult.stderr);
}
assert.equal(tuningResult.status, 0, 'stage39 move-ordering local-search smoke should succeed');
assert.ok(fs.existsSync(tuningOutputPath), 'stage39 local-search smoke JSON should be created');
assert.ok(fs.existsSync(tuningBestProfilePath), 'stage39 local-search best profile JSON should be created');

const tuningParsed = JSON.parse(fs.readFileSync(tuningOutputPath, 'utf8'));
assert.equal(tuningParsed.baseProfileName, 'stage38-candidateC-disc0-10-12');
assert.ok(Array.isArray(tuningParsed.rounds), 'local-search summary should contain rounds');
assert.equal(tuningParsed.rounds.length, 1);
assert.ok((tuningParsed.rounds[0]?.candidateCount ?? 0) > 0, 'local-search summary should evaluate at least one candidate');
assert.ok(Array.isArray(tuningParsed.rounds[0]?.candidates), 'round summary should contain candidates');
assert.ok(Object.hasOwn(tuningParsed.final ?? {}, 'profile'), 'final summary should contain the final profile');
assert.ok(Object.hasOwn(tuningParsed.final ?? {}, 'agreementVsBase'), 'final summary should contain agreement vs base');

assert.equal(tuningParsed.rounds[0]?.selectedCandidate?.actionLabel, 'fallback@10-10');

const tuningBestProfileParsed = JSON.parse(fs.readFileSync(tuningBestProfilePath, 'utf8'));
assert.equal(tuningBestProfileParsed.stage?.status, 'derived-search-cost-local-search');
assert.equal(tuningBestProfileParsed.diagnostics?.localSearch?.baseProfileName, 'stage38-candidateC-disc0-10-12');
assert.equal(tuningBestProfileParsed.diagnostics?.derivedVariant, undefined, 'local-search profile should not inherit stale derivedVariant diagnostics');

console.log('stage39 move-ordering local-search smoke passed');
