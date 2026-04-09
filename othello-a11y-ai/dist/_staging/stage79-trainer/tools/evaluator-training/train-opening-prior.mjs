#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

import { coordToIndex, indexToCoord } from '../../js/core/bitboard.js';
import { GameState } from '../../js/core/game-state.js';
import { canonicalizeOpeningPriorSample } from '../../js/ai/opening-prior.js';
import {
  buildProfileStageMetadata,
  calculateTotalInputBytes,
  collectInputFileEntries,
  createStateFromJsonRecord,
  defaultOpeningPriorProfileName,
  displayGeneratedOpeningPriorModulePath,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  ensureArray,
  formatDurationSeconds,
  formatInteger,
  parseArgs,
  percentage,
  resolveCliPath,
  resolveTrainingOutputPath,
  writeGeneratedOpeningPriorModule,
} from './lib.mjs';

const SCORE_SOURCES = new Set(['none', 'actual', 'theoretical', 'hybrid']);
const JSON_LINE_EXTENSIONS = new Set(['.jsonl', '.ndjson']);
const JSON_EXTENSIONS = new Set(['.json']);
const WTHOR_EXTENSION = '.wtb';
const DEFAULT_SUPPORTED_EXTENSIONS = Object.freeze(['.wtb', '.jsonl', '.ndjson', '.json']);
const HOLDOUT_TOP_K = Object.freeze([1, 2, 3]);

function printUsage() {
  const toolPath = displayTrainingToolPath('train-opening-prior.mjs');
  const outputJsonPath = displayTrainingOutputPath('trained-opening-prior-profile.json');
  const outputModulePath = displayTrainingOutputPath('opening-prior.generated.js');
  console.log(`Usage:
  node ${toolPath} \
    --input <file-or-dir> [--input <file-or-dir> ...] \
    [--max-ply 18] [--min-position-count 3] [--min-move-count 1] [--max-candidates-per-position 8] \
    [--holdout-mod 10] [--holdout-residue 0] [--limit-games 5000] [--progress-every 5000] \
    [--score-source hybrid] [--theoretical-score-weight 0.65] [--actual-score-weight 0.35] \
    [--popularity-scale 12000] [--score-scale 3000] [--outcome-blend-weight 0.35] [--count-smoothing 1] \
    [--skip-diagnostics] \
    [--output-json ${outputJsonPath}] \
    [--output-module ${outputModulePath}] \
    [--module-format compact|expanded] [--module-hash-encoding hex|decimal] \
    [--module-max-ply 18] [--module-min-position-count 0] [--module-min-move-count 0] [--module-max-candidates-per-position 8]

지원 입력 형식:
  1) WTHOR 8x8 game files (.wtb)
  2) JSONL / NDJSON / JSON game records with moves + blackScore/theoreticalBlackScore
  3) JSONL / NDJSON / JSON position records with board/boardString + move/coord
`);
}

function toFiniteInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function toFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeScoreSource(value) {
  if (typeof value !== 'string') {
    return 'hybrid';
  }
  const normalized = value.trim().toLowerCase();
  return SCORE_SOURCES.has(normalized) ? normalized : 'hybrid';
}

function shouldUseHoldout(gameIndex, holdoutMod, holdoutResidue) {
  return holdoutMod > 0 && (gameIndex % holdoutMod) === holdoutResidue;
}

function normalizeMoveToken(token) {
  if (typeof token !== 'string') {
    throw new Error('Move token must be a string.');
  }

  const trimmed = token.trim();
  if (trimmed === '') {
    throw new Error('Move token cannot be empty.');
  }

  if (/^(pass|패스)$/i.test(trimmed)) {
    return 'PASS';
  }

  const normalized = trimmed.toUpperCase();
  if (coordToIndex(normalized) < 0) {
    throw new Error(`Invalid move token: ${token}`);
  }
  return normalized;
}

function normalizeMoveSequence(sequence) {
  if (Array.isArray(sequence)) {
    return sequence.map(normalizeMoveToken);
  }

  if (typeof sequence !== 'string') {
    throw new Error('Move sequence must be a string or an array.');
  }

  const trimmed = sequence.trim();
  if (trimmed === '') {
    return [];
  }

  const separatorPattern = /[\s,;/|]/;
  if (separatorPattern.test(trimmed)) {
    return trimmed
      .split(/[\s,;/|]+/)
      .filter(Boolean)
      .map(normalizeMoveToken);
  }

  const tokens = [];
  let cursor = 0;
  while (cursor < trimmed.length) {
    const remainder = trimmed.slice(cursor);
    const passMatch = /^(pass|패스)/i.exec(remainder);
    if (passMatch) {
      tokens.push('PASS');
      cursor += passMatch[0].length;
      continue;
    }

    const coordMatch = /^[A-H][1-8]/i.exec(remainder);
    if (coordMatch) {
      tokens.push(coordMatch[0].toUpperCase());
      cursor += coordMatch[0].length;
      continue;
    }

    throw new Error(`Could not parse move sequence near: ${remainder.slice(0, 12)}`);
  }

  return tokens;
}

function blackScoreToDiff(blackScore) {
  if (!Number.isFinite(blackScore)) {
    return null;
  }
  return (Number(blackScore) * 2) - 64;
}

function resolvePerspectiveScore(state, blackPerspectiveDiff) {
  if (!Number.isFinite(blackPerspectiveDiff)) {
    return null;
  }
  return state.currentPlayer === 'black' ? blackPerspectiveDiff : -blackPerspectiveDiff;
}

function makeEmptyFormatCounts() {
  return {
    wthorGames: 0,
    jsonGames: 0,
    jsonPositions: 0,
  };
}

function createSampleFromState(state, moveIndex, {
  weight = 1,
  actualBlackDiff = null,
  theoreticalBlackDiff = null,
  sourcePositionId = null,
} = {}) {
  const actualMovesPlayed = 60 - state.getEmptyCount();
  return {
    state,
    moveIndex,
    coord: indexToCoord(moveIndex),
    ply: actualMovesPlayed,
    weight: Math.max(1, weight),
    actualScore: resolvePerspectiveScore(state, actualBlackDiff),
    theoreticalScore: resolvePerspectiveScore(state, theoreticalBlackDiff),
    ...(sourcePositionId ? { sourcePositionId } : {}),
  };
}

function resolveJsonBlackDiff(record, {
  scoreKeyCandidates = [],
  diffKeyCandidates = [],
} = {}) {
  for (const key of diffKeyCandidates) {
    if (Number.isFinite(record?.[key])) {
      return Number(record[key]);
    }
  }

  for (const key of scoreKeyCandidates) {
    if (Number.isFinite(record?.[key])) {
      return blackScoreToDiff(Number(record[key]));
    }
  }

  return null;
}

function resolveJsonBlackPerspectiveScores(record) {
  const actualBlackDiff = resolveJsonBlackDiff(record, {
    scoreKeyCandidates: ['blackScore', 'actualBlackScore', 'scoreBlack'],
    diffKeyCandidates: ['blackDiff', 'actualBlackDiff', 'scoreDiffBlack'],
  });
  const theoreticalBlackDiff = resolveJsonBlackDiff(record, {
    scoreKeyCandidates: ['theoreticalBlackScore', 'perfectBlackScore', 'scoreTheoreticalBlack'],
    diffKeyCandidates: ['theoreticalBlackDiff', 'perfectBlackDiff', 'scoreTheoreticalDiffBlack'],
  });

  const result = record?.result && typeof record.result === 'object' ? record.result : null;
  return {
    actualBlackDiff: actualBlackDiff ?? resolveJsonBlackDiff(result, {
      scoreKeyCandidates: ['blackScore', 'actualBlackScore'],
      diffKeyCandidates: ['blackDiff', 'actualBlackDiff'],
    }),
    theoreticalBlackDiff: theoreticalBlackDiff ?? resolveJsonBlackDiff(result, {
      scoreKeyCandidates: ['theoreticalBlackScore', 'perfectBlackScore'],
      diffKeyCandidates: ['theoreticalBlackDiff', 'perfectBlackDiff'],
    }),
  };
}

function buildSamplesFromJsonGameRecord(record, options) {
  const moves = normalizeMoveSequence(record.moves);
  const { actualBlackDiff, theoreticalBlackDiff } = resolveJsonBlackPerspectiveScores(record);
  const samples = [];
  let state = GameState.initial();

  for (let stepIndex = 0; stepIndex < moves.length; stepIndex += 1) {
    const token = moves[stepIndex];

    if (token === 'PASS') {
      const legalMoves = state.getSearchMoves();
      if (legalMoves.length > 0) {
        throw new Error(`Illegal pass at step ${stepIndex + 1}; legal moves are available.`);
      }
      state = state.passTurnFast();
      continue;
    }

    while (!state.isTerminal() && state.getSearchMoves().length === 0) {
      state = state.passTurnFast();
    }

    const moveIndex = coordToIndex(token);
    if (moveIndex < 0) {
      throw new Error(`Invalid move token in JSON game record: ${token}`);
    }

    const actualMovesPlayed = 60 - state.getEmptyCount();
    if (actualMovesPlayed < options.maxPly) {
      samples.push(createSampleFromState(state, moveIndex, {
        actualBlackDiff,
        theoreticalBlackDiff,
      }));
    }

    const outcome = state.applyMoveFast(moveIndex);
    if (!outcome) {
      throw new Error(`Illegal move at step ${stepIndex + 1}: ${token}`);
    }
    state = outcome;
  }

  return {
    sourceFormat: 'json-game',
    samples,
  };
}

function resolveJsonPositionMoveIndex(record) {
  if (Number.isInteger(record?.moveIndex) && record.moveIndex >= 0 && record.moveIndex < 64) {
    return record.moveIndex;
  }

  const moveText = typeof record?.move === 'string'
    ? record.move
    : (typeof record?.coord === 'string' ? record.coord : record?.moveCoord);
  const moveIndex = coordToIndex(String(moveText ?? '').trim().toUpperCase());
  return moveIndex >= 0 ? moveIndex : -1;
}

function buildSamplesFromJsonPositionRecord(record, options) {
  const state = createStateFromJsonRecord(record);
  const moveIndex = resolveJsonPositionMoveIndex(record);
  if (moveIndex < 0) {
    throw new Error('JSON position record must include move / coord / moveIndex.');
  }

  const { actualBlackDiff, theoreticalBlackDiff } = resolveJsonBlackPerspectiveScores(record);
  const weight = Math.max(1, toFiniteInteger(record?.weight ?? record?.count, 1));
  const actualMovesPlayed = 60 - state.getEmptyCount();
  if (actualMovesPlayed >= options.maxPly) {
    return {
      sourceFormat: 'json-position',
      samples: [],
    };
  }

  return {
    sourceFormat: 'json-position',
    samples: [createSampleFromState(state, moveIndex, {
      weight,
      actualBlackDiff,
      theoreticalBlackDiff,
      sourcePositionId: typeof record?.id === 'string' && record.id.trim() !== '' ? record.id.trim() : null,
    })],
  };
}

function buildSamplesFromJsonRecord(record, options) {
  if (Array.isArray(record?.moves) || typeof record?.moves === 'string') {
    return buildSamplesFromJsonGameRecord(record, options);
  }

  return buildSamplesFromJsonPositionRecord(record, options);
}

function decodeWthorMoveCode(code) {
  if (!Number.isInteger(code) || code <= 0) {
    return -1;
  }

  const row = Math.floor(code / 10) - 1;
  const col = (code % 10) - 1;
  if (row < 0 || row >= 8 || col < 0 || col >= 8) {
    return -1;
  }
  return (row * 8) + col;
}

function parseWthorHeader(buffer, filePath) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 16) {
    throw new Error(`WTHOR file is too small to contain a valid header: ${filePath}`);
  }

  const recordCount = buffer.readUInt32LE(4);
  const year = buffer.readUInt16LE(10);
  const boardSize = buffer.readUInt8(12);
  const theoreticalDepth = buffer.readUInt8(14);
  const reserved = buffer.readUInt8(15);

  if (![0, 8].includes(boardSize)) {
    throw new Error(`Unsupported WTHOR board size (${boardSize}) in ${filePath}. Only 8x8 files are supported.`);
  }

  return {
    recordCount,
    year,
    boardSize,
    theoreticalDepth,
    reserved,
    recordSize: 68,
    headerSize: 16,
  };
}

function buildSamplesFromWthorRecord(recordBuffer, header, options) {
  const blackPlayerId = recordBuffer.readUInt16LE(2);
  const whitePlayerId = recordBuffer.readUInt16LE(4);
  const actualBlackScore = recordBuffer.readUInt8(6);
  const theoreticalBlackScore = recordBuffer.readUInt8(7);
  const actualBlackDiff = blackScoreToDiff(actualBlackScore);
  const theoreticalAvailable = header.theoreticalDepth > 0 || header.year >= 2001;
  const theoreticalBlackDiff = theoreticalAvailable ? blackScoreToDiff(theoreticalBlackScore) : null;
  const samples = [];
  let state = GameState.initial();

  for (let offset = 8; offset < header.recordSize; offset += 1) {
    const moveCode = recordBuffer.readUInt8(offset);
    if (moveCode === 0) {
      break;
    }

    while (!state.isTerminal() && state.getSearchMoves().length === 0) {
      state = state.passTurnFast();
    }

    const moveIndex = decodeWthorMoveCode(moveCode);
    if (moveIndex < 0) {
      throw new Error(`Invalid WTHOR move code: ${moveCode}`);
    }

    const actualMovesPlayed = 60 - state.getEmptyCount();
    if (actualMovesPlayed < options.maxPly) {
      samples.push(createSampleFromState(state, moveIndex, {
        actualBlackDiff,
        theoreticalBlackDiff,
      }));
    }

    const outcome = state.applyMoveFast(moveIndex);
    if (!outcome) {
      throw new Error(`Illegal WTHOR move ${indexToCoord(moveIndex)} (code ${moveCode}).`);
    }
    state = outcome;
  }

  return {
    sourceFormat: 'wthor',
    samples,
    meta: {
      year: header.year,
      blackPlayerId,
      whitePlayerId,
      actualBlackScore,
      theoreticalBlackScore: theoreticalAvailable ? theoreticalBlackScore : null,
    },
  };
}

async function streamJsonLineRecords(fileEntry, options, context, onRecord) {
  const stream = fs.createReadStream(fileEntry.path, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let lineNumber = 0;
  let fileBytesProcessed = 0;

  try {
    for await (const line of rl) {
      lineNumber += 1;
      fileBytesProcessed = Math.min(fileEntry.sizeBytes, fileBytesProcessed + Buffer.byteLength(line, 'utf8') + 1);
      const trimmed = line.trim();
      if (trimmed === '' || trimmed.startsWith('#')) {
        continue;
      }

      const parsed = JSON.parse(trimmed);
      const built = buildSamplesFromJsonRecord(parsed, options);
      await onRecord({
        ...built,
        filePath: fileEntry.path,
        lineNumber,
        gameIndex: context.gameIndex,
        totalBytesProcessed: Math.min(context.totalBytes, context.completedBytes + fileBytesProcessed),
        totalBytes: context.totalBytes,
      });
      context.gameIndex += 1;
      if (Number.isInteger(options.limitGames) && context.gameIndex >= options.limitGames) {
        rl.close();
        stream.destroy();
        return;
      }
    }
  } finally {
    rl.close();
    stream.destroy();
  }
}

async function streamJsonRecords(fileEntry, options, context, onRecord) {
  const parsed = JSON.parse(await fs.promises.readFile(fileEntry.path, 'utf8'));
  const records = Array.isArray(parsed) ? parsed : [parsed];

  for (let index = 0; index < records.length; index += 1) {
    const built = buildSamplesFromJsonRecord(records[index], options);
    const fileBytesProcessed = Math.round(fileEntry.sizeBytes * ((index + 1) / Math.max(1, records.length)));
    await onRecord({
      ...built,
      filePath: fileEntry.path,
      lineNumber: index + 1,
      gameIndex: context.gameIndex,
      totalBytesProcessed: Math.min(context.totalBytes, context.completedBytes + fileBytesProcessed),
      totalBytes: context.totalBytes,
    });
    context.gameIndex += 1;
    if (Number.isInteger(options.limitGames) && context.gameIndex >= options.limitGames) {
      return;
    }
  }
}

async function streamWthorRecords(fileEntry, options, context, onRecord) {
  const buffer = await fs.promises.readFile(fileEntry.path);
  const header = parseWthorHeader(buffer, fileEntry.path);
  const expectedBytes = header.headerSize + (header.recordCount * header.recordSize);
  if (buffer.length < expectedBytes) {
    throw new Error(`WTHOR file is truncated: ${fileEntry.path}`);
  }

  for (let recordIndex = 0; recordIndex < header.recordCount; recordIndex += 1) {
    const start = header.headerSize + (recordIndex * header.recordSize);
    const end = start + header.recordSize;
    const recordBuffer = buffer.subarray(start, end);
    const built = buildSamplesFromWthorRecord(recordBuffer, header, options);
    await onRecord({
      ...built,
      filePath: fileEntry.path,
      lineNumber: recordIndex + 1,
      gameIndex: context.gameIndex,
      totalBytesProcessed: Math.min(context.totalBytes, context.completedBytes + end),
      totalBytes: context.totalBytes,
    });
    context.gameIndex += 1;
    if (Number.isInteger(options.limitGames) && context.gameIndex >= options.limitGames) {
      return;
    }
  }
}

async function streamOpeningPriorRecords(fileEntries, options, onRecord) {
  const totalBytes = calculateTotalInputBytes(fileEntries);
  const context = {
    totalBytes,
    completedBytes: 0,
    gameIndex: 0,
  };

  for (const fileEntry of fileEntries) {
    const extension = path.extname(fileEntry.path).toLowerCase();

    if (extension === WTHOR_EXTENSION) {
      await streamWthorRecords(fileEntry, options, context, onRecord);
    } else if (JSON_LINE_EXTENSIONS.has(extension)) {
      await streamJsonLineRecords(fileEntry, options, context, onRecord);
    } else if (JSON_EXTENSIONS.has(extension)) {
      await streamJsonRecords(fileEntry, options, context, onRecord);
    } else {
      throw new Error(`Unsupported opening prior input file extension: ${fileEntry.path}`);
    }

    context.completedBytes += fileEntry.sizeBytes;
    if (Number.isInteger(options.limitGames) && context.gameIndex >= options.limitGames) {
      return context.gameIndex;
    }
  }

  return context.gameIndex;
}

function createMoveAccumulator() {
  return {
    count: 0,
    actualScoreSum: 0,
    actualScoreCount: 0,
    theoreticalScoreSum: 0,
    theoreticalScoreCount: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    sampleCount: 0,
  };
}

function createPositionAccumulator(ply) {
  return {
    ply,
    totalCount: 0,
    moves: new Map(),
  };
}

function updatePositionAccumulator(positionMap, sample) {
  const canonical = canonicalizeOpeningPriorSample(sample.state, sample.moveIndex);
  let positionAccumulator = positionMap.get(canonical.stateHash);
  if (!positionAccumulator) {
    positionAccumulator = createPositionAccumulator(sample.ply);
    positionMap.set(canonical.stateHash, positionAccumulator);
  }

  positionAccumulator.ply = Math.min(positionAccumulator.ply, sample.ply);
  positionAccumulator.totalCount += sample.weight;
  let moveAccumulator = positionAccumulator.moves.get(canonical.moveIndex);
  if (!moveAccumulator) {
    moveAccumulator = createMoveAccumulator();
    positionAccumulator.moves.set(canonical.moveIndex, moveAccumulator);
  }

  moveAccumulator.count += sample.weight;
  moveAccumulator.sampleCount += sample.weight;
  if (Number.isFinite(sample.actualScore)) {
    moveAccumulator.actualScoreSum += sample.actualScore * sample.weight;
    moveAccumulator.actualScoreCount += sample.weight;
    if (sample.actualScore > 0) {
      moveAccumulator.wins += sample.weight;
    } else if (sample.actualScore < 0) {
      moveAccumulator.losses += sample.weight;
    } else {
      moveAccumulator.draws += sample.weight;
    }
  }
  if (Number.isFinite(sample.theoreticalScore)) {
    moveAccumulator.theoreticalScoreSum += sample.theoreticalScore * sample.weight;
    moveAccumulator.theoreticalScoreCount += sample.weight;
  }
}

function resolveCandidateMeanScore(candidate, options) {
  const actualMean = candidate.actualScoreCount > 0 ? candidate.actualScoreSum / candidate.actualScoreCount : null;
  const theoreticalMean = candidate.theoreticalScoreCount > 0 ? candidate.theoreticalScoreSum / candidate.theoreticalScoreCount : null;

  if (options.scoreSource === 'none') {
    return null;
  }
  if (options.scoreSource === 'actual') {
    return actualMean;
  }
  if (options.scoreSource === 'theoretical') {
    return theoreticalMean ?? actualMean;
  }

  const contributions = [];
  if (Number.isFinite(theoreticalMean)) {
    contributions.push({ value: theoreticalMean, weight: options.theoreticalScoreWeight });
  }
  if (Number.isFinite(actualMean)) {
    contributions.push({ value: actualMean, weight: options.actualScoreWeight });
  }
  if (contributions.length === 0) {
    return null;
  }

  const totalWeight = contributions.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) {
    return contributions[0].value;
  }

  return contributions.reduce((sum, entry) => sum + (entry.value * entry.weight), 0) / totalWeight;
}

function finalizePositionEntry(stateHash, accumulator, options) {
  if (accumulator.totalCount < options.minPositionCount) {
    return null;
  }

  const rawCandidates = [...accumulator.moves.entries()]
    .map(([moveIndex, candidate]) => {
      const meanActualScore = candidate.actualScoreCount > 0 ? candidate.actualScoreSum / candidate.actualScoreCount : null;
      const meanTheoreticalScore = candidate.theoreticalScoreCount > 0 ? candidate.theoreticalScoreSum / candidate.theoreticalScoreCount : null;
      return {
        moveIndex,
        coord: indexToCoord(moveIndex),
        count: candidate.count,
        sampleCount: candidate.sampleCount,
        meanActualScore,
        meanTheoreticalScore,
        meanScore: resolveCandidateMeanScore(candidate, options),
        winRate: candidate.sampleCount > 0 ? candidate.wins / candidate.sampleCount : null,
        drawRate: candidate.sampleCount > 0 ? candidate.draws / candidate.sampleCount : null,
        lossRate: candidate.sampleCount > 0 ? candidate.losses / candidate.sampleCount : null,
      };
    })
    .filter((candidate) => candidate.count >= options.minMoveCount)
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return left.moveIndex - right.moveIndex;
    });

  if (rawCandidates.length === 0) {
    return null;
  }

  const retainedCandidates = rawCandidates.slice(0, options.maxCandidatesPerPosition);
  const meanLogCount = retainedCandidates.reduce(
    (sum, candidate) => sum + Math.log(candidate.count + options.countSmoothing),
    0,
  ) / retainedCandidates.length;

  const weightedScoreTotals = retainedCandidates
    .filter((candidate) => Number.isFinite(candidate.meanScore))
    .reduce((sum, candidate) => sum + (candidate.meanScore * candidate.count), 0);
  const weightedScoreWeight = retainedCandidates
    .filter((candidate) => Number.isFinite(candidate.meanScore))
    .reduce((sum, candidate) => sum + candidate.count, 0);
  const positionMeanScore = weightedScoreWeight > 0 ? weightedScoreTotals / weightedScoreWeight : null;

  const finalizedMoves = retainedCandidates
    .map((candidate) => {
      const popularityScore = Math.round(options.popularityScale * (
        Math.log(candidate.count + options.countSmoothing) - meanLogCount
      ));
      const outcomeScore = Number.isFinite(candidate.meanScore) && Number.isFinite(positionMeanScore)
        ? Math.round(options.scoreScale * (candidate.meanScore - positionMeanScore))
        : null;
      const priorScore = outcomeScore === null
        ? popularityScore
        : Math.round(popularityScore + (options.outcomeBlendWeight * outcomeScore));
      return {
        ...candidate,
        share: accumulator.totalCount > 0 ? candidate.count / accumulator.totalCount : 0,
        popularityScore,
        outcomeScore,
        priorScore,
      };
    })
    .sort((left, right) => {
      if (right.priorScore !== left.priorScore) {
        return right.priorScore - left.priorScore;
      }
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return left.moveIndex - right.moveIndex;
    })
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    }));

  return {
    stateHash,
    ply: accumulator.ply,
    totalCount: accumulator.totalCount,
    retainedCount: finalizedMoves.reduce((sum, candidate) => sum + candidate.count, 0),
    candidateCount: accumulator.moves.size,
    moves: finalizedMoves,
  };
}

function finalizeProfilePositions(positionMap, options) {
  return [...positionMap.entries()]
    .map(([stateHash, accumulator]) => finalizePositionEntry(stateHash, accumulator, options))
    .filter(Boolean)
    .sort((left, right) => {
      if (left.ply !== right.ply) {
        return left.ply - right.ply;
      }
      if (right.totalCount !== left.totalCount) {
        return right.totalCount - left.totalCount;
      }
      return left.stateHash.localeCompare(right.stateHash);
    });
}

function createHoldoutAccumulator() {
  return {
    totalWeight: 0,
    coveredWeight: 0,
    moveCoveredWeight: 0,
    rankSum: 0,
    reciprocalRankSum: 0,
    candidateCountSum: 0,
    topKHits: new Map(HOLDOUT_TOP_K.map((k) => [k, 0])),
  };
}

function updateHoldoutAccumulator(accumulator, weight, entry, matchedMove) {
  accumulator.totalWeight += weight;
  if (!entry) {
    return;
  }

  accumulator.coveredWeight += weight;
  accumulator.candidateCountSum += entry.moves.length * weight;
  if (!matchedMove) {
    return;
  }

  accumulator.moveCoveredWeight += weight;
  accumulator.rankSum += matchedMove.rank * weight;
  accumulator.reciprocalRankSum += (1 / matchedMove.rank) * weight;
  for (const topK of HOLDOUT_TOP_K) {
    if (matchedMove.rank <= topK) {
      accumulator.topKHits.set(topK, (accumulator.topKHits.get(topK) ?? 0) + weight);
    }
  }
}

function summarizeHoldoutAccumulator(accumulator) {
  if (!accumulator || accumulator.totalWeight <= 0) {
    return {
      sampleCount: 0,
      coverage: null,
      moveCoverage: null,
      meanRank: null,
      meanReciprocalRank: null,
      meanCandidateCount: null,
      top1Accuracy: null,
      top2Accuracy: null,
      top3Accuracy: null,
    };
  }

  const moveCoveredWeight = Math.max(0, accumulator.moveCoveredWeight);
  return {
    sampleCount: accumulator.totalWeight,
    coverage: accumulator.coveredWeight / accumulator.totalWeight,
    moveCoverage: moveCoveredWeight / accumulator.totalWeight,
    meanRank: moveCoveredWeight > 0 ? accumulator.rankSum / moveCoveredWeight : null,
    meanReciprocalRank: moveCoveredWeight > 0 ? accumulator.reciprocalRankSum / moveCoveredWeight : null,
    meanCandidateCount: accumulator.coveredWeight > 0 ? accumulator.candidateCountSum / accumulator.coveredWeight : null,
    top1Accuracy: moveCoveredWeight > 0 ? (accumulator.topKHits.get(1) ?? 0) / moveCoveredWeight : null,
    top2Accuracy: moveCoveredWeight > 0 ? (accumulator.topKHits.get(2) ?? 0) / moveCoveredWeight : null,
    top3Accuracy: moveCoveredWeight > 0 ? (accumulator.topKHits.get(3) ?? 0) / moveCoveredWeight : null,
  };
}

function createProgressLogger({
  label,
  totalWorkBytes,
  phaseOffsetBytes,
  phaseTotalBytes,
  progressEvery,
  globalStartMs,
}) {
  let nextThreshold = progressEvery > 0 ? progressEvery : Number.POSITIVE_INFINITY;

  return ({ gameIndex, totalBytesProcessed }) => {
    const processedGames = gameIndex + 1;
    if (processedGames < nextThreshold) {
      return;
    }
    while (processedGames >= nextThreshold) {
      nextThreshold += progressEvery;
    }

    const elapsedSeconds = Math.max(0.001, (Date.now() - globalStartMs) / 1000);
    const overallProcessedBytes = Math.min(totalWorkBytes, phaseOffsetBytes + totalBytesProcessed);
    const overallFraction = totalWorkBytes > 0 ? overallProcessedBytes / totalWorkBytes : null;
    const phaseFraction = phaseTotalBytes > 0 ? totalBytesProcessed / phaseTotalBytes : null;
    const gamesPerSecond = processedGames / elapsedSeconds;
    const bytesPerSecond = overallProcessedBytes / elapsedSeconds;
    const remainingBytes = Math.max(0, totalWorkBytes - overallProcessedBytes);
    const etaSeconds = bytesPerSecond > 0 ? remainingBytes / bytesPerSecond : null;

    console.log(
      `[${label}] games=${formatInteger(processedGames)} phase=${percentage(phaseFraction)} overall=${percentage(overallFraction)} `
      + `speed=${formatInteger(gamesPerSecond)} game/s ETA=${formatDurationSeconds(etaSeconds)}`,
    );
  };
}

function summarizeTrainPositions(positions, maxPly) {
  const positionCountByPly = Array.from({ length: maxPly }, (_, ply) => ({
    ply,
    positionCount: 0,
    sampleCount: 0,
  }));

  for (const position of positions) {
    const bucket = positionCountByPly[position.ply] ?? null;
    if (!bucket) {
      continue;
    }
    bucket.positionCount += 1;
    bucket.sampleCount += position.totalCount;
  }

  return positionCountByPly.filter((entry) => entry.positionCount > 0);
}

function createProfileSummary(profile) {
  if (!profile) {
    return null;
  }

  return {
    version: profile.version ?? null,
    name: profile.name ?? null,
    symmetry: profile.symmetry ?? null,
    positionCount: Array.isArray(profile.positions) ? profile.positions.length : 0,
    holdoutCoverage: profile?.diagnostics?.holdout?.coverage ?? null,
    holdoutTop1Accuracy: profile?.diagnostics?.holdout?.top1Accuracy ?? null,
    holdoutTop3Accuracy: profile?.diagnostics?.holdout?.top3Accuracy ?? null,
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h || (!args.input && !args['input-dir'])) {
  printUsage();
  process.exit(args.help || args.h ? 0 : 1);
}

const requestedInputs = [
  ...ensureArray(args.input),
  ...ensureArray(args['input-dir']),
];
const inputFiles = await collectInputFileEntries(requestedInputs, { extensions: DEFAULT_SUPPORTED_EXTENSIONS });
if (inputFiles.length === 0) {
  throw new Error('입력 파일을 찾지 못했습니다. --input 또는 --input-dir 경로를 확인하십시오.');
}

const options = {
  maxPly: Math.max(1, Math.min(60, toFiniteInteger(args['max-ply'], 18))),
  minPositionCount: Math.max(1, toFiniteInteger(args['min-position-count'], 3)),
  minMoveCount: Math.max(1, toFiniteInteger(args['min-move-count'], 1)),
  maxCandidatesPerPosition: Math.max(1, toFiniteInteger(args['max-candidates-per-position'], 8)),
  holdoutMod: Math.max(0, toFiniteInteger(args['holdout-mod'], 10)),
  holdoutResidue: Math.max(0, toFiniteInteger(args['holdout-residue'], 0)),
  limitGames: args['limit-games'] !== undefined ? Math.max(1, toFiniteInteger(args['limit-games'], 1)) : undefined,
  progressEvery: Math.max(0, toFiniteInteger(args['progress-every'], 5000)),
  scoreSource: normalizeScoreSource(args['score-source']),
  theoreticalScoreWeight: Math.max(0, toFiniteNumber(args['theoretical-score-weight'], 0.65)),
  actualScoreWeight: Math.max(0, toFiniteNumber(args['actual-score-weight'], 0.35)),
  popularityScale: Math.max(0, toFiniteNumber(args['popularity-scale'], 12_000)),
  scoreScale: Math.max(0, toFiniteNumber(args['score-scale'], 3_000)),
  outcomeBlendWeight: Math.max(0, toFiniteNumber(args['outcome-blend-weight'], 0.35)),
  countSmoothing: Math.max(0.0001, toFiniteNumber(args['count-smoothing'], 1)),
  skipDiagnostics: Boolean(args['skip-diagnostics'] || args['fit-only']),
};

const outputJsonPath = args['output-json']
  ? resolveCliPath(args['output-json'])
  : resolveTrainingOutputPath('trained-opening-prior-profile.json');
const outputModulePath = args['output-module']
  ? resolveCliPath(args['output-module'])
  : resolveCliPath('js/ai/opening-prior.generated.js');
const outputModuleOptions = {
  moduleFormat: typeof args['module-format'] === 'string' ? args['module-format'] : 'compact',
  hashEncoding: typeof args['module-hash-encoding'] === 'string' ? args['module-hash-encoding'] : undefined,
  maxPly: args['module-max-ply'] !== undefined ? Math.max(0, toFiniteInteger(args['module-max-ply'], 0)) : null,
  minPositionCount: args['module-min-position-count'] !== undefined
    ? Math.max(0, toFiniteInteger(args['module-min-position-count'], 0))
    : 0,
  minMoveCount: args['module-min-move-count'] !== undefined
    ? Math.max(0, toFiniteInteger(args['module-min-move-count'], 0))
    : 0,
  maxCandidatesPerPosition: args['module-max-candidates-per-position'] !== undefined
    ? Math.max(1, toFiniteInteger(args['module-max-candidates-per-position'], 1))
    : null,
};
const profileName = typeof args.name === 'string' ? args.name : defaultOpeningPriorProfileName();
const description = typeof args.description === 'string'
  ? args.description
  : 'WTHOR / 기보 집계로 생성한 canonical opening/root prior profile입니다.';
const totalInputBytes = calculateTotalInputBytes(inputFiles);
const totalWorkBytes = totalInputBytes * (options.skipDiagnostics ? 1 : 2);
const globalStartMs = Date.now();

console.log(`Training opening prior on ${inputFiles.length} file(s).`);
console.log(`maxPly=${options.maxPly}, minPositionCount=${options.minPositionCount}, minMoveCount=${options.minMoveCount}, maxCandidatesPerPosition=${options.maxCandidatesPerPosition}`);
console.log(`scoreSource=${options.scoreSource}, popularityScale=${options.popularityScale}, scoreScale=${options.scoreScale}, outcomeBlendWeight=${options.outcomeBlendWeight}`);
if (options.limitGames) {
  console.log(`limitGames=${formatInteger(options.limitGames)}`);
}
if (options.progressEvery > 0) {
  console.log(`Progress logging every ${formatInteger(options.progressEvery)} games.`);
}
if (options.skipDiagnostics) {
  console.log('Diagnostics pass disabled (--skip-diagnostics).');
}

const trainPositionMap = new Map();
const trainFormatCounts = makeEmptyFormatCounts();
let trainGameCount = 0;
let trainSampleCount = 0;
const trainProgress = createProgressLogger({
  label: 'fit',
  totalWorkBytes,
  phaseOffsetBytes: 0,
  phaseTotalBytes: totalInputBytes,
  progressEvery: options.progressEvery,
  globalStartMs,
});

await streamOpeningPriorRecords(inputFiles, options, async (record) => {
  const isHoldout = shouldUseHoldout(record.gameIndex, options.holdoutMod, options.holdoutResidue);
  if (isHoldout) {
    trainProgress({ gameIndex: record.gameIndex, totalBytesProcessed: record.totalBytesProcessed });
    return;
  }

  trainGameCount += 1;
  if (record.sourceFormat === 'wthor') {
    trainFormatCounts.wthorGames += 1;
  } else if (record.sourceFormat === 'json-game') {
    trainFormatCounts.jsonGames += 1;
  } else {
    trainFormatCounts.jsonPositions += 1;
  }

  for (const sample of record.samples) {
    updatePositionAccumulator(trainPositionMap, sample);
    trainSampleCount += sample.weight;
  }

  trainProgress({ gameIndex: record.gameIndex, totalBytesProcessed: record.totalBytesProcessed });
});

const positions = finalizeProfilePositions(trainPositionMap, options);
const compiledPositionsByKey = new Map(positions.map((position) => [position.stateHash, position]));
const trainPositionSummary = summarizeTrainPositions(positions, options.maxPly);

let holdoutSummary = null;
let holdoutByPly = [];
let holdoutGameCount = 0;
let holdoutSampleCount = 0;
let holdoutFormatCounts = makeEmptyFormatCounts();

if (!options.skipDiagnostics) {
  const overallAccumulator = createHoldoutAccumulator();
  const perPlyAccumulators = Array.from({ length: options.maxPly }, () => createHoldoutAccumulator());
  const holdoutProgress = createProgressLogger({
    label: 'holdout',
    totalWorkBytes,
    phaseOffsetBytes: totalInputBytes,
    phaseTotalBytes: totalInputBytes,
    progressEvery: options.progressEvery,
    globalStartMs,
  });

  await streamOpeningPriorRecords(inputFiles, options, async (record) => {
    const isHoldout = shouldUseHoldout(record.gameIndex, options.holdoutMod, options.holdoutResidue);
    if (!isHoldout) {
      holdoutProgress({ gameIndex: record.gameIndex, totalBytesProcessed: record.totalBytesProcessed });
      return;
    }

    holdoutGameCount += 1;
    if (record.sourceFormat === 'wthor') {
      holdoutFormatCounts.wthorGames += 1;
    } else if (record.sourceFormat === 'json-game') {
      holdoutFormatCounts.jsonGames += 1;
    } else {
      holdoutFormatCounts.jsonPositions += 1;
    }

    for (const sample of record.samples) {
      const canonical = canonicalizeOpeningPriorSample(sample.state, sample.moveIndex);
      const entry = compiledPositionsByKey.get(canonical.stateHash) ?? null;
      const matchedMove = entry?.moves.find((candidate) => candidate.moveIndex === canonical.moveIndex) ?? null;
      updateHoldoutAccumulator(overallAccumulator, sample.weight, entry, matchedMove);
      if (perPlyAccumulators[sample.ply]) {
        updateHoldoutAccumulator(perPlyAccumulators[sample.ply], sample.weight, entry, matchedMove);
      }
      holdoutSampleCount += sample.weight;
    }

    holdoutProgress({ gameIndex: record.gameIndex, totalBytesProcessed: record.totalBytesProcessed });
  });

  holdoutSummary = summarizeHoldoutAccumulator(overallAccumulator);
  holdoutByPly = perPlyAccumulators
    .map((accumulator, ply) => ({ ply, ...summarizeHoldoutAccumulator(accumulator) }))
    .filter((entry) => entry.sampleCount > 0);
}

const diagnostics = {
  train: {
    gameCount: trainGameCount,
    sampleCount: trainSampleCount,
    retainedPositionCount: positions.length,
    retainedMoveCount: positions.reduce((sum, position) => sum + position.moves.length, 0),
    formatCounts: trainFormatCounts,
    positionCountByPly: trainPositionSummary,
  },
  ...(options.skipDiagnostics ? {} : {
    holdout: {
      ...holdoutSummary,
      gameCount: holdoutGameCount,
      formatCounts: holdoutFormatCounts,
    },
    holdoutByPly,
  }),
};

const profile = {
  version: 1,
  name: profileName,
  description,
  symmetry: 'canonical-4',
  stage: buildProfileStageMetadata({ kind: 'opening-prior-profile' }),
  source: {
    inputFiles: inputFiles.map((entry) => entry.path),
    totalInputBytes,
  },
  options: {
    maxPly: options.maxPly,
    minPositionCount: options.minPositionCount,
    minMoveCount: options.minMoveCount,
    maxCandidatesPerPosition: options.maxCandidatesPerPosition,
    scoreSource: options.scoreSource,
    theoreticalScoreWeight: options.theoreticalScoreWeight,
    actualScoreWeight: options.actualScoreWeight,
    popularityScale: options.popularityScale,
    scoreScale: options.scoreScale,
    outcomeBlendWeight: options.outcomeBlendWeight,
    countSmoothing: options.countSmoothing,
    holdoutMod: options.holdoutMod,
    holdoutResidue: options.holdoutResidue,
  },
  diagnostics,
  positions,
};

await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
await fs.promises.writeFile(outputJsonPath, JSON.stringify(profile, null, 2), 'utf8');
console.log(`Saved opening prior JSON to ${outputJsonPath}`);

if (outputModulePath) {
  const writtenModulePath = await writeGeneratedOpeningPriorModule(outputModulePath, profile, outputModuleOptions);
  const moduleStat = await fs.promises.stat(writtenModulePath);
  console.log(`Saved opening prior module to ${writtenModulePath}`);
  console.log(`  module format=${outputModuleOptions.moduleFormat}, bytes=${moduleStat.size}`);
}

const summary = createProfileSummary(profile);
console.log(`Retained ${formatInteger(summary.positionCount ?? 0)} canonical positions.`);
if (summary?.holdoutCoverage !== null) {
  console.log(`Holdout coverage=${percentage(summary.holdoutCoverage)}, top1=${percentage(summary.holdoutTop1Accuracy)}, top3=${percentage(summary.holdoutTop3Accuracy)}`);
}
