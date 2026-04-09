import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { GameState } from '../core/game-state.js';
import { canonicalizeOpeningPriorState, lookupOpeningPrior } from '../ai/opening-prior.js';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage53-opening-prior-'));

function encodeWthorMoveCode(coord) {
  const normalized = String(coord).trim().toUpperCase();
  const col = normalized.charCodeAt(0) - 64;
  const row = Number.parseInt(normalized.slice(1), 10);
  if (!(col >= 1 && col <= 8 && row >= 1 && row <= 8)) {
    throw new Error(`invalid coord for WTHOR encoding: ${coord}`);
  }
  return (row * 10) + col;
}

function applySequence(sequence) {
  let state = GameState.initial();
  for (const coord of sequence) {
    const move = state.getLegalMoves().find((entry) => entry.coord === coord);
    assert.ok(move, `illegal move in synthetic opening sequence: ${coord}`);
    state = state.applyMoveFast(move.index, move.flips);
  }
  return state;
}

function createWthorRecord({ moves, blackScore, theoreticalBlackScore, blackPlayerId, whitePlayerId }) {
  const buffer = Buffer.alloc(68, 0);
  buffer.writeUInt16LE(blackPlayerId, 2);
  buffer.writeUInt16LE(whitePlayerId, 4);
  buffer.writeUInt8(blackScore, 6);
  buffer.writeUInt8(theoreticalBlackScore, 7);
  moves.forEach((coord, index) => {
    buffer.writeUInt8(encodeWthorMoveCode(coord), 8 + index);
  });
  return buffer;
}

try {
  const corpusPath = path.join(tempDir, 'opening-prior-smoke.wtb');
  const outputJsonPath = path.join(tempDir, 'trained-opening-prior.json');
  const outputModulePath = path.join(tempDir, 'opening-prior.generated.js');
  const rebuiltModulePath = path.join(tempDir, 'opening-prior.rebuilt.generated.js');
  const summaryJsonPath = path.join(tempDir, 'opening-prior-module-summary.json');

  const lineA = ['F5', 'D6', 'C3', 'D3', 'C4'];
  const lineB = ['F5', 'D6', 'C3', 'F4', 'E6'];

  // Sanity-check the synthetic lines before encoding them into WTHOR records.
  applySequence(lineA);
  applySequence(lineB);

  const records = [
    ...Array.from({ length: 7 }, (_, index) => createWthorRecord({
      moves: lineA,
      blackScore: 42,
      theoreticalBlackScore: 44,
      blackPlayerId: 100 + index,
      whitePlayerId: 200 + index,
    })),
    ...Array.from({ length: 3 }, (_, index) => createWthorRecord({
      moves: lineB,
      blackScore: 28,
      theoreticalBlackScore: 26,
      blackPlayerId: 300 + index,
      whitePlayerId: 400 + index,
    })),
  ];

  const header = Buffer.alloc(16, 0);
  header.writeUInt32LE(records.length, 4);
  header.writeUInt16LE(2025, 10);
  header.writeUInt8(8, 12);
  header.writeUInt8(1, 14);
  await fs.writeFile(corpusPath, Buffer.concat([header, ...records]));

  await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools/evaluator-training/train-opening-prior.mjs'),
    '--input', corpusPath,
    '--max-ply', '8',
    '--min-position-count', '1',
    '--min-move-count', '1',
    '--max-candidates-per-position', '4',
    '--holdout-mod', '5',
    '--progress-every', '0',
    '--name', 'stage53-opening-prior-smoke',
    '--output-json', outputJsonPath,
    '--output-module', outputModulePath,
  ], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 32,
  });

  await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools/evaluator-training/build-opening-prior-module.mjs'),
    '--opening-prior-json', outputJsonPath,
    '--output-module', rebuiltModulePath,
    '--summary-json', summaryJsonPath,
  ], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 16,
  });

  const trainedProfile = JSON.parse(await fs.readFile(outputJsonPath, 'utf8'));
  const holdout = trainedProfile?.diagnostics?.holdout;
  assert.equal(trainedProfile.name, 'stage53-opening-prior-smoke');
  assert.equal(trainedProfile.symmetry, 'canonical-4');
  assert.ok((trainedProfile.positions?.length ?? 0) > 0, 'expected retained positions in opening prior profile');
  assert.ok(Number.isFinite(holdout?.coverage) && holdout.coverage > 0, 'holdout coverage should be recorded');

  const rebuiltModule = await import(`${pathToFileURL(rebuiltModulePath).href}?t=${Date.now()}`);
  assert.equal(rebuiltModule.GENERATED_OPENING_PRIOR_PROFILE?.name, 'stage53-opening-prior-smoke');

  const stateAfterF5 = applySequence(['F5']);
  const stateAfterD3 = applySequence(['D3']);
  const canonicalF5 = canonicalizeOpeningPriorState(stateAfterF5);
  const canonicalD3 = canonicalizeOpeningPriorState(stateAfterD3);
  assert.equal(canonicalF5.stateHash, canonicalD3.stateHash, 'symmetric one-ply opening states should canonicalize together');

  const priorAfterF5 = lookupOpeningPrior(stateAfterF5, rebuiltModule.GENERATED_OPENING_PRIOR_PROFILE);
  assert.ok(priorAfterF5, 'expected a prior entry after the first opening move');
  assert.equal(priorAfterF5.moves[0].coord, 'D6');

  const priorAfterD3 = lookupOpeningPrior(stateAfterD3, rebuiltModule.GENERATED_OPENING_PRIOR_PROFILE);
  assert.ok(priorAfterD3, 'expected a symmetric prior entry after D3');
  const legalAfterD3 = new Set(stateAfterD3.getLegalMoves().map((move) => move.coord));
  assert.ok(legalAfterD3.has(priorAfterD3.moves[0].coord), 'restored prior move should be legal in the queried orientation');

  const splitState = applySequence(['F5', 'D6', 'C3']);
  const splitPrior = lookupOpeningPrior(splitState, rebuiltModule.GENERATED_OPENING_PRIOR_PROFILE);
  assert.ok(splitPrior, 'expected a branching prior entry after F5 D6 C3');
  assert.equal(splitPrior.moves.length, 2, 'synthetic corpus should produce two candidate moves at the split state');
  assert.equal(splitPrior.moves[0].coord, 'F4', 'outcome-aware prior should prefer the stronger white branch at the split state');
  assert.equal(splitPrior.moves[0].count, 3);
  assert.equal(splitPrior.moves[1].coord, 'D3');
  assert.equal(splitPrior.moves[1].count, 5, 'the more popular branch should still preserve its larger visit count');
  assert.ok(splitPrior.moves[0].priorScore > splitPrior.moves[1].priorScore, 'outcome-aware prior score should outrank the more popular but worse branch');

  const summary = JSON.parse(await fs.readFile(summaryJsonPath, 'utf8'));
  assert.equal(summary.openingPriorProfile?.name, 'stage53-opening-prior-smoke');
  assert.ok(Number.isFinite(summary.outputModuleBytes) && summary.outputModuleBytes > 0);

  console.log('stage53 opening prior training smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
