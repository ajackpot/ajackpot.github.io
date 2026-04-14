import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage142-trineutron-algorithms-'));
const generatedModule = path.resolve(
  repoRoot,
  'tools/evaluator-training/out/stage136-balanced13-support-stack/exported/learned-eval-profile.generated.js',
);

function runBenchmark(searchAlgorithm, outputJson) {
  const result = spawnSync(process.execPath, [
    path.resolve(repoRoot, 'tools/engine-match/benchmark-vs-trineutron.mjs'),
    '--variants', 'active,custom',
    '--generated-module', generatedModule,
    '--variant-label', `balanced13-${searchAlgorithm}`,
    '--games', '1',
    '--opening-plies', '4',
    '--seed', '7',
    '--our-time-ms', '20',
    '--their-time-ms', '20',
    '--our-max-depth', '4',
    '--their-max-depth', '8',
    '--search-algorithm', searchAlgorithm,
    '--aspiration-window', '0',
    '--solver-adjudication-empties', '6',
    '--solver-adjudication-time-ms', '1000',
    '--their-noise-scale', '0',
    '--variant-seed-mode', 'shared',
    '--output-json', outputJson,
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 120000,
  });
  assert.equal(result.status, 0, result.stdout || result.stderr || `benchmark-vs-trineutron failed for ${searchAlgorithm}`);
  return JSON.parse(fs.readFileSync(outputJson, 'utf8'));
}

const mtdfSummary = runBenchmark('classic-mtdf-2ply', path.join(tempDir, 'mtdf.json'));
assert.equal(mtdfSummary.options.searchAlgorithm, 'classic-mtdf-2ply');
assert.equal(mtdfSummary.options.aspirationWindow, 0);
assert.equal(mtdfSummary.variants.length, 2);
assert.equal(mtdfSummary.variants[0].games.length, 2);

const hybridSummary = runBenchmark('mcts-hybrid', path.join(tempDir, 'hybrid.json'));
assert.equal(hybridSummary.options.searchAlgorithm, 'mcts-hybrid');
assert.equal(hybridSummary.options.aspirationWindow, 0);
assert.equal(hybridSummary.variants.length, 2);
assert.equal(hybridSummary.variants[0].games.length, 2);

console.log('stage142 trineutron algorithm modes smoke passed');
