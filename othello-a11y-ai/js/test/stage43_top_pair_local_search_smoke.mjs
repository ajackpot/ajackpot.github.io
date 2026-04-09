import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

import { resolveProjectPath } from '../../tools/evaluator-training/lib.mjs';

const repoRoot = resolveProjectPath();
const baseProfilePath = resolveProjectPath('tools', 'evaluator-training', 'out', 'stage41_candidateF_cornerPattern125_11_12.json');
const outputPath = resolveProjectPath('benchmarks', 'stage43_top_pair_local_search_smoke.json');
const bestProfilePath = resolveProjectPath('tools', 'evaluator-training', 'out', 'stage43_top_pair_local_search_smoke_best.json');
const singleOutputPath = resolveProjectPath('benchmarks', 'stage43_top_pair_local_search_smoke_single.json');
const pairOutputPath = resolveProjectPath('benchmarks', 'stage43_top_pair_local_search_smoke_pair.json');

const result = spawnSync(
  process.execPath,
  [
    path.join(repoRoot, 'tools', 'evaluator-training', 'search-move-ordering-top-pairs.mjs'),
    '--base-profile', baseProfilePath,
    '--features', 'corners,cornerAdjacency,edgePattern',
    '--feature-scales', '0.25,0.75,1.25',
    '--ranges', '11-12',
    '--fallback-ranges', '11-12',
    '--top-singles', '4',
    '--pair-count', '2',
    '--seed-start', '1',
    '--seed-count', '1',
    '--depth-empties', '15',
    '--exact-empties', '13',
    '--repetitions', '1',
    '--time-limit-ms', '1500',
    '--max-depth', '6',
    '--depth-exact-endgame-empties', '10',
    '--exact-time-limit-ms', '4000',
    '--exact-max-depth', '12',
    '--exact-endgame-empties', '14',
    '--output-json', outputPath,
    '--best-profile-json', bestProfilePath,
    '--single-output-json', singleOutputPath,
    '--pair-output-json', pairOutputPath,
  ],
  { cwd: repoRoot, encoding: 'utf8' },
);
if (result.status !== 0) {
  console.error(result.stdout);
  console.error(result.stderr);
}
assert.equal(result.status, 0, 'stage43 top-pair local-search smoke should succeed');
assert.ok(fs.existsSync(outputPath), 'stage43 top-pair summary should be created');
assert.ok(fs.existsSync(bestProfilePath), 'stage43 top-pair best profile JSON should be created');
assert.ok(fs.existsSync(singleOutputPath), 'stage43 top-pair single-pass raw summary should be created');
assert.ok(fs.existsSync(pairOutputPath), 'stage43 top-pair pair-pass raw summary should be created');
const parsed = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
assert.equal(parsed.baseProfileName, 'stage41-candidateF-cornerPattern125-11-12');
assert.equal(parsed.options?.topSingles, 4);
assert.equal(parsed.options?.pairCount, 2);
assert.ok((parsed.singlePass?.candidateCount ?? 0) > 0, 'stage43 smoke should evaluate single candidates');
assert.ok((parsed.singlePass?.selectedSingles?.length ?? 0) > 0, 'stage43 smoke should select top singles');
assert.ok((parsed.pairPass?.candidateCount ?? 0) > 0, 'stage43 smoke should evaluate pair candidates');
assert.ok((parsed.pairPass?.selectedActionIds?.length ?? 0) >= 2, 'stage43 smoke should keep at least two atomic actions for pair search');
assert.ok((parsed.pairPass?.validPairCount ?? 0) > 0, 'stage43 smoke should compute at least one compatible pair');
assert.ok(Object.hasOwn(parsed.pairPass ?? {}, 'bestPairCandidate'), 'stage43 smoke should summarize the best pair candidate');
assert.ok(Object.hasOwn(parsed.pairPass ?? {}, 'selectedCandidate'), 'stage43 smoke should summarize the selected pair candidate');
const pairRaw = JSON.parse(fs.readFileSync(pairOutputPath, 'utf8'));
assert.equal(pairRaw.options?.minActionsPerCandidate, 2);
assert.equal(pairRaw.options?.maxActionsPerCandidate, 2);
assert.ok(Array.isArray(pairRaw.options?.allowedActionIds), 'pair-pass raw summary should record allowed action ids');
assert.ok(pairRaw.rounds?.[0]?.candidates?.every((candidate) => candidate.actionCount === 2), 'every stage43 smoke pair candidate should contain exactly two actions');
console.log('stage43 top-pair local-search smoke passed');
