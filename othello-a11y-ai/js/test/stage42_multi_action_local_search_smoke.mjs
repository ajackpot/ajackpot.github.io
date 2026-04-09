import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

import { resolveProjectPath } from '../../tools/evaluator-training/lib.mjs';

const repoRoot = resolveProjectPath();
const baseProfilePath = resolveProjectPath('tools', 'evaluator-training', 'out', 'stage41_candidateF_cornerPattern125_11_12.json');
const outputPath = resolveProjectPath('benchmarks', 'stage42_multi_action_local_search_smoke.json');
const bestProfilePath = resolveProjectPath('tools', 'evaluator-training', 'out', 'stage42_multi_action_local_search_smoke_best.json');

const result = spawnSync(
  process.execPath,
  [
    path.join(repoRoot, 'tools', 'evaluator-training', 'tune-move-ordering-search-cost.mjs'),
    '--base-profile', baseProfilePath,
    '--features', 'corners,cornerAdjacency,edgePattern',
    '--feature-scales', '0.75,1.25',
    '--ranges', '11-12',
    '--fallback-ranges', '11-12',
    '--min-actions-per-candidate', '2',
    '--max-actions-per-candidate', '2',
    '--max-rounds', '1',
    '--max-actions-per-round', '6',
    '--depth-empties', '15',
    '--exact-empties', '13',
    '--seed-start', '1',
    '--seed-count', '1',
    '--repetitions', '1',
    '--time-limit-ms', '1500',
    '--max-depth', '6',
    '--depth-exact-endgame-empties', '10',
    '--exact-time-limit-ms', '4000',
    '--exact-max-depth', '12',
    '--exact-endgame-empties', '14',
    '--output-json', outputPath,
    '--best-profile-json', bestProfilePath,
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
assert.equal(result.status, 0, 'stage42 multi-action local-search smoke should succeed');
assert.ok(fs.existsSync(outputPath), 'stage42 multi-action local-search summary should be created');
assert.ok(fs.existsSync(bestProfilePath), 'stage42 multi-action local-search best profile JSON should be created');

const parsed = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
assert.equal(parsed.baseProfileName, 'stage41-candidateF-cornerPattern125-11-12');
assert.equal(parsed.options?.minActionsPerCandidate, 2);
assert.equal(parsed.options?.maxActionsPerCandidate, 2);
assert.equal(parsed.rounds?.length, 1);
assert.ok((parsed.rounds?.[0]?.atomicActionCount ?? 0) > 0, 'multi-action smoke should enumerate atomic actions');
assert.ok((parsed.rounds?.[0]?.candidateActionCount ?? 0) > 0, 'multi-action smoke should enumerate candidate action chains');
assert.ok((parsed.rounds?.[0]?.candidateCount ?? 0) > 0, 'multi-action smoke should evaluate at least one candidate action chain');
assert.ok(parsed.rounds?.[0]?.candidates?.every((candidate) => candidate.actionCount === 2), 'every candidate in the smoke should contain exactly two actions');
assert.ok(parsed.rounds?.[0]?.candidates?.some((candidate) => String(candidate.actionLabel).includes(' + ')), 'multi-action smoke candidate labels should show chained actions');
assert.ok(Object.hasOwn(parsed.final ?? {}, 'profile'), 'final summary should contain the final profile');
assert.ok(Object.hasOwn(parsed.final ?? {}, 'agreementVsBase'), 'final summary should contain agreement vs base');

const bestProfileParsed = JSON.parse(fs.readFileSync(bestProfilePath, 'utf8'));
assert.ok(bestProfileParsed?.name, 'best profile JSON should remain readable after multi-action search');

console.log('stage42 multi-action local-search smoke passed');
