import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { GameState } from '../core/game-state.js';
import { lookupOpeningPrior } from '../ai/opening-prior.js';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'othello-stage55-opening-prior-'));

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
  const corpusPath = path.join(tempDir, 'opening-prior-compaction-smoke.wtb');
  const outputJsonPath = path.join(tempDir, 'trained-opening-prior.json');
  const compactModulePath = path.join(tempDir, 'opening-prior.compact.generated.js');
  const expandedModulePath = path.join(tempDir, 'opening-prior.expanded.generated.js');
  const compactSummaryJsonPath = path.join(tempDir, 'opening-prior.compact.summary.json');
  const expandedSummaryJsonPath = path.join(tempDir, 'opening-prior.expanded.summary.json');

  const lineA = ['F5', 'D6', 'C3', 'D3', 'C4'];
  const lineB = ['F5', 'D6', 'C3', 'F4', 'E6'];

  applySequence(lineA);
  applySequence(lineB);

  const records = [
    ...Array.from({ length: 9 }, (_, index) => createWthorRecord({
      moves: lineA,
      blackScore: 44,
      theoreticalBlackScore: 46,
      blackPlayerId: 100 + index,
      whitePlayerId: 200 + index,
    })),
    ...Array.from({ length: 4 }, (_, index) => createWthorRecord({
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
    '--name', 'stage55-opening-prior-compaction-smoke',
    '--output-json', outputJsonPath,
    '--output-module', path.join(tempDir, 'opening-prior.training.generated.js'),
  ], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 32,
  });

  await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools/evaluator-training/build-opening-prior-module.mjs'),
    '--opening-prior-json', outputJsonPath,
    '--format', 'compact',
    '--output-module', compactModulePath,
    '--summary-json', compactSummaryJsonPath,
  ], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 16,
  });

  await execFileAsync(process.execPath, [
    path.join(repoRoot, 'tools/evaluator-training/build-opening-prior-module.mjs'),
    '--opening-prior-json', outputJsonPath,
    '--format', 'expanded',
    '--output-module', expandedModulePath,
    '--summary-json', expandedSummaryJsonPath,
  ], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 16,
  });

  const compactModule = await import(`${pathToFileURL(compactModulePath).href}?t=${Date.now()}`);
  const expandedModule = await import(`${pathToFileURL(expandedModulePath).href}?t=${Date.now()}`);
  const compactStats = await fs.stat(compactModulePath);
  const expandedStats = await fs.stat(expandedModulePath);

  assert.equal(compactModule.GENERATED_OPENING_PRIOR_PROFILE?.format, 'compact-v1');
  assert.equal(expandedModule.GENERATED_OPENING_PRIOR_PROFILE?.format, 'expanded-v1');
  assert.ok(compactStats.size < expandedStats.size, 'compact module should be smaller than expanded module');

  const splitState = applySequence(['F5', 'D6', 'C3']);
  const compactPrior = lookupOpeningPrior(splitState, compactModule.GENERATED_OPENING_PRIOR_PROFILE);
  const expandedPrior = lookupOpeningPrior(splitState, expandedModule.GENERATED_OPENING_PRIOR_PROFILE);
  assert.ok(compactPrior, 'compact module should resolve lookupOpeningPrior');
  assert.ok(expandedPrior, 'expanded module should resolve lookupOpeningPrior');
  assert.equal(compactPrior.moves[0].coord, expandedPrior.moves[0].coord);
  assert.equal(compactPrior.moves[0].coord, 'F4');
  assert.equal(compactPrior.moves[1].coord, 'D3');

  const compactSummary = JSON.parse(await fs.readFile(compactSummaryJsonPath, 'utf8'));
  const expandedSummary = JSON.parse(await fs.readFile(expandedSummaryJsonPath, 'utf8'));
  assert.equal(compactSummary.moduleOptions?.format, 'compact');
  assert.equal(expandedSummary.moduleOptions?.format, 'expanded');
  assert.ok(compactSummary.outputModuleRatio < expandedSummary.outputModuleRatio, 'compact ratio should beat expanded ratio');

  console.log('stage55 opening prior runtime compaction smoke passed');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
