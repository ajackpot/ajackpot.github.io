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
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage45-chain-replay-'));

try {
  const outputJsonPath = path.join(tempDir, 'chain-replay.json');
  const outputDir = path.join(tempDir, 'profiles');

  await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools/evaluator-training/replay-move-ordering-adoption-chain.mjs'),
    '--output-json', outputJsonPath,
    '--output-dir', outputDir,
    '--seed-start', '1',
    '--seed-count', '1',
    '--repetitions', '1',
    '--depth-empties', '15',
    '--exact-empties', '13',
    '--time-limit-ms', '250',
    '--max-depth', '4',
    '--depth-exact-endgame-empties', '10',
    '--exact-time-limit-ms', '1200',
    '--exact-max-depth', '10',
    '--exact-endgame-empties', '13',
  ], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 16,
  });

  const summary = JSON.parse(await fs.readFile(outputJsonPath, 'utf8'));
  assert.equal(summary.replayedChain.length, 5);
  assert.equal(summary.replayedChain.every((entry) => entry.matchesStoredReference), true);
  assert.equal(summary.replayedChain[0].key, 'candidateB');
  assert.equal(summary.replayedChain.at(-1).key, 'candidateH2');
  assert.equal(summary.segmentDeltas.length, 6);
  assert.equal(summary.finalStatus.currentBestKey, 'candidateH2');
  assert.ok(Array.isArray(summary.benchmarkProfiles) && summary.benchmarkProfiles.length === 7);

  const generatedCandidateH2Path = path.join(outputDir, 'stage44-candidateH2-edgePattern125-cornerPattern125-11-12.json');
  const generatedCandidateH2 = JSON.parse(await fs.readFile(generatedCandidateH2Path, 'utf8'));
  assert.equal(generatedCandidateH2.name, 'stage44-candidateH2-edgePattern125-cornerPattern125-11-12');

  console.log('stage45 move-ordering chain replay smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
