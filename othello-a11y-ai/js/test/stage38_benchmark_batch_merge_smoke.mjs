import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage38-merge-smoke-'));

function makeBatch(seedStart, seedCount, nodesByProfile) {
  const profiles = [];
  for (const [key, nodes] of Object.entries(nodesByProfile)) {
    const cases = [];
    for (let seed = seedStart; seed < seedStart + seedCount; seed += 1) {
      cases.push({
        suite: 'depth',
        empties: 19,
        seed,
        summary: {
          nodes,
          elapsedMs: nodes,
          ttHits: Math.floor(nodes / 10),
        },
      });
    }
    profiles.push({
      key,
      label: key,
      profileName: key,
      inputPath: null,
      suites: {},
      cases,
    });
  }
  return {
    generatedAt: new Date().toISOString(),
    evaluationProfileName: 'eval-smoke',
    options: {
      seedStart,
      seedCount,
      repetitions: 1,
      suites: [
        {
          key: 'depth',
          emptiesList: [19],
          options: {
            timeLimitMs: 100,
            maxDepth: 2,
            exactEndgameEmpties: 8,
          },
        },
      ],
    },
    profiles,
  };
}

try {
  const batch1Path = path.join(tempDir, 'batch1.json');
  const batch2Path = path.join(tempDir, 'batch2.json');
  const mergedPath = path.join(tempDir, 'merged.json');

  await fs.writeFile(batch1Path, JSON.stringify(makeBatch(1, 2, {
    legacy: 100,
    full: 90,
  }), null, 2), 'utf8');
  await fs.writeFile(batch2Path, JSON.stringify(makeBatch(3, 2, {
    legacy: 100,
    full: 80,
    candidate: 70,
  }), null, 2), 'utf8');

  await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools/evaluator-training/merge-move-ordering-benchmark-batches.mjs'),
    '--input-json', batch1Path,
    '--input-json', batch2Path,
    '--output-json', mergedPath,
  ], {
    cwd: repoRoot,
  });

  const merged = JSON.parse(await fs.readFile(mergedPath, 'utf8'));
  assert.equal(merged.options.seedStart, 1);
  assert.equal(merged.options.seedCount, 4);
  assert.equal(merged.profiles.length, 3);

  const legacy = merged.profiles.find((entry) => entry.key === 'legacy');
  const full = merged.profiles.find((entry) => entry.key === 'full');
  const candidate = merged.profiles.find((entry) => entry.key === 'candidate');

  assert.ok(legacy);
  assert.ok(full);
  assert.ok(candidate);
  assert.equal(legacy.suites.depth.overall.nodes, 400);
  assert.equal(full.suites.depth.overall.nodes, 340);
  assert.equal(candidate.suites.depth.overall.nodes, 140);
  assert.equal(full.suites.depth.overall.nodeDeltaVsLegacyPercent, -15);
  assert.equal(candidate.suites.depth.overall.nodeDeltaVsLegacyPercent, -65);
  assert.equal(candidate.suites.depth.overall.nodeDeltaVsFullPercent, ((140 - 340) / 340) * 100);

  console.log('stage38 benchmark batch merge smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
