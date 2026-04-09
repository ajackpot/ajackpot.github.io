#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { GameState } from '../../js/core/game-state.js';
import { bitFromIndex } from '../../js/core/bitboard.js';
import { Evaluator } from '../../js/ai/evaluator.js';
import { SearchEngine } from '../../js/ai/search-engine.js';
import {
  displayTrainingOutputPath,
  displayTrainingToolPath,
  parseArgs,
  resolveCliPath,
  resolveTrainingOutputPath,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('generate-synthetic-corpus.mjs');
  const outputPath = displayTrainingOutputPath('synthetic.jsonl');
  console.log(`Usage:
  node ${toolPath} \
    [--count 2000] [--min-empties 8] [--max-empties 50] \
    [--teacher evaluator|search] [--seed 12345] \
    [--output ${outputPath}]
`);
}

function toFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function createSeededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function stateToPerspectiveBoardString(state) {
  const { player, opponent } = state.getPlayerBoards(state.currentPlayer);
  let board = '';
  for (let index = 0; index < 64; index += 1) {
    const bit = bitFromIndex(index);
    if ((player & bit) !== 0n) {
      board += 'X';
    } else if ((opponent & bit) !== 0n) {
      board += 'O';
    } else {
      board += '-';
    }
  }
  return board;
}

function sampleState(minEmpties, maxEmpties, random) {
  let state = GameState.initial();
  let guard = 0;
  while (!state.isTerminal()) {
    const empties = state.getEmptyCount();
    if (empties <= maxEmpties && empties >= minEmpties) {
      return state;
    }

    if (empties < minEmpties) {
      return null;
    }

    const legalMoves = state.getLegalMoves().sort((left, right) => left.coord.localeCompare(right.coord));
    state = legalMoves.length === 0
      ? state.passTurn()
      : state.applyMove(legalMoves[Math.floor(random() * legalMoves.length)].index).state;

    guard += 1;
    if (guard > 200) {
      return null;
    }
  }

  return null;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const count = Math.max(1, Math.trunc(toFiniteNumber(args.count, 2000)));
const minEmpties = Math.max(0, Math.trunc(toFiniteNumber(args['min-empties'], 8)));
const maxEmpties = Math.max(minEmpties, Math.trunc(toFiniteNumber(args['max-empties'], 50)));
const teacher = typeof args.teacher === 'string' ? args.teacher : 'evaluator';
const seed = Math.trunc(toFiniteNumber(args.seed, 12345));
const outputPath = args.output ? resolveCliPath(args.output) : resolveTrainingOutputPath('synthetic.jsonl');
const random = createSeededRandom(seed);
const evaluator = new Evaluator();
const searchEngine = teacher === 'search'
  ? new SearchEngine({ presetKey: 'custom', maxDepth: 6, timeLimitMs: 1500, exactEndgameEmpties: 10, aspirationWindow: 40, randomness: 0 })
  : null;

await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
const output = fs.createWriteStream(outputPath, { encoding: 'utf8' });

let generated = 0;
while (generated < count) {
  const state = sampleState(minEmpties, maxEmpties, random);
  if (!state) {
    continue;
  }

  let engineScore;
  if (teacher === 'search') {
    const result = searchEngine.findBestMove(state, {
      presetKey: 'custom',
      maxDepth: 6,
      timeLimitMs: 1500,
      exactEndgameEmpties: 10,
      aspirationWindow: 40,
      randomness: 0,
      styleKey: 'balanced',
    });
    engineScore = result.score;
  } else {
    engineScore = evaluator.evaluate(state, state.currentPlayer);
  }

  output.write(`${JSON.stringify({
    board: stateToPerspectiveBoardString(state),
    engineScore,
    empties: state.getEmptyCount(),
    teacher,
  })}\n`);

  generated += 1;
}

output.end();
console.log(`Saved ${generated} synthetic samples to ${outputPath}`);
