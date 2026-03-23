import {
  CORNER_INDICES,
  POSITIONAL_WEIGHTS,
} from '../core/bitboard.js';
import { GameState } from '../core/game-state.js';
import { Evaluator, getPositionalRisk } from './evaluator.js';
import {
  lookupOpeningBook,
  OPENING_BOOK_ADVISORY_MAX_PLY,
  OPENING_BOOK_DIRECT_USE_MAX_PLY,
} from './opening-book.js';
import {
  DEFAULT_PRESET_KEY,
  DEFAULT_STYLE_KEY,
  ENGINE_PRESETS,
  ENGINE_STYLE_PRESETS,
  resolveEngineOptions,
} from './presets.js';

const INFINITY = 10 ** 9;
const TABLE_RELEVANT_OPTION_KEYS = Object.freeze([
  'exactEndgameEmpties',
  'mobilityScale',
  'potentialMobilityScale',
  'cornerScale',
  'cornerAdjacencyScale',
  'stabilityScale',
  'frontierScale',
  'positionalScale',
  'parityScale',
  'discScale',
  'riskPenaltyScale',
]);

class SearchTimeoutError extends Error {
  constructor(message = 'Search timed out.') {
    super(message);
    this.name = 'SearchTimeoutError';
  }
}

function now() {
  if (typeof globalThis.performance?.now === 'function') {
    return globalThis.performance.now();
  }
  return Date.now();
}

function colorIndex(color) {
  return color === 'black' ? 0 : 1;
}

function chooseRandomBest(scoredMoves, randomness) {
  if (!Array.isArray(scoredMoves) || scoredMoves.length === 0 || randomness <= 0) {
    return scoredMoves[0] ?? null;
  }

  const bestScore = scoredMoves[0].score;
  const pool = scoredMoves.filter((entry) => (bestScore - entry.score) <= randomness);
  if (pool.length <= 1) {
    return scoredMoves[0];
  }

  const totalWeight = pool.reduce((sum, entry, index) => sum + (pool.length - index), 0);
  let threshold = Math.random() * totalWeight;
  for (let index = 0; index < pool.length; index += 1) {
    threshold -= (pool.length - index);
    if (threshold <= 0) {
      return pool[index];
    }
  }

  return pool[0];
}

function resolveOptionsFromInput(engineOptions = {}, fallbackPresetKey = DEFAULT_PRESET_KEY, fallbackStyleKey = DEFAULT_STYLE_KEY) {
  const presetKey = engineOptions.presetKey ?? fallbackPresetKey;
  const styleKey = engineOptions.styleKey ?? fallbackStyleKey;
  return resolveEngineOptions(presetKey, engineOptions, styleKey);
}

function optionsShallowEqual(left, right) {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }

  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    if (left[key] !== right[key]) {
      return false;
    }
  }
  return true;
}

function tableSemanticsChanged(left, right) {
  if (!left || !right) {
    return true;
  }

  for (const key of TABLE_RELEVANT_OPTION_KEYS) {
    if (left[key] !== right[key]) {
      return true;
    }
  }
  return false;
}

function shouldKeepExistingTableEntry(existing, incoming) {
  if (!existing) {
    return false;
  }

  const existingDepth = existing.depth ?? 0;
  const incomingDepth = incoming.depth ?? 0;

  if (incomingDepth > existingDepth) {
    return false;
  }
  if (incomingDepth === existingDepth) {
    return existing.flag === 'exact' && incoming.flag !== 'exact';
  }
  if (existing.flag === 'exact') {
    return true;
  }
  return existingDepth >= incomingDepth + 3;
}

function bookOrderingBonus(weight) {
  return Math.round(Math.log2(Math.max(1, weight) + 1) * 90_000);
}

function bookSelectionBonus(weight) {
  return Math.round(Math.log2(Math.max(1, weight) + 1) * 120_000);
}

export class SearchEngine {
  constructor(engineOptions = {}) {
    this.options = resolveOptionsFromInput(engineOptions);
    this.evaluator = new Evaluator(this.options);
    this.transpositionTable = new Map();
    this.killerMoves = [];
    this.historyHeuristic = Array.from({ length: 2 }, () => Array(64).fill(0));
    this.searchGeneration = 0;
    this.resetStats();
  }

  updateOptions(engineOptions = {}) {
    const nextOptions = resolveOptionsFromInput(
      engineOptions,
      this.options?.presetKey ?? DEFAULT_PRESET_KEY,
      this.options?.styleKey ?? DEFAULT_STYLE_KEY,
    );

    const optionsChanged = !optionsShallowEqual(this.options, nextOptions);
    const shouldResetTable = tableSemanticsChanged(this.options, nextOptions);

    this.options = nextOptions;
    if (optionsChanged) {
      this.evaluator = new Evaluator(this.options);
    }
    if (shouldResetTable) {
      this.transpositionTable.clear();
    }
    this.trimTranspositionTable();
  }

  resetStats() {
    this.stats = {
      nodes: 0,
      cutoffs: 0,
      ttHits: 0,
      ttStores: 0,
      ttEvictions: 0,
      completedDepth: 0,
      elapsedMs: 0,
      bookHits: 0,
      bookMoves: 0,
    };
  }

  trimTranspositionTable(forceClear = false) {
    if (forceClear) {
      const removed = this.transpositionTable.size;
      this.transpositionTable.clear();
      if (this.stats) {
        this.stats.ttEvictions += removed;
      }
      return;
    }

    const maxEntries = Math.max(1000, Math.floor(this.options.maxTableEntries ?? 1000));
    if (this.transpositionTable.size <= maxEntries) {
      return;
    }

    const batchSize = Math.max(64, Math.floor(maxEntries * 0.12));
    const targetSize = Math.max(0, maxEntries - batchSize);
    let removed = 0;
    while (this.transpositionTable.size > targetSize) {
      const oldestKey = this.transpositionTable.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      this.transpositionTable.delete(oldestKey);
      removed += 1;
    }

    if (this.stats) {
      this.stats.ttEvictions += removed;
    }
  }

  checkDeadline() {
    if (now() >= this.deadlineMs) {
      throw new SearchTimeoutError();
    }
  }

  shouldUseOpeningBookDirect(state, bookHit) {
    if (!bookHit || bookHit.candidateCount === 0) {
      return false;
    }
    return state.moveHistory.length <= OPENING_BOOK_DIRECT_USE_MAX_PLY;
  }

  describeBookHit(bookHit, selectedMoveIndex = null, usedDirectly = false) {
    const matchedCandidate = Number.isInteger(selectedMoveIndex)
      ? bookHit.candidates.find((candidate) => candidate.moveIndex === selectedMoveIndex) ?? null
      : null;

    return {
      usedDirectly,
      depthPly: bookHit.depthPly,
      candidateCount: bookHit.candidateCount,
      totalWeight: bookHit.totalWeight,
      topNames: bookHit.topNames.map((entry) => entry.name),
      matchedMoveCoord: matchedCandidate?.coord ?? null,
      matchedMoveWeight: matchedCandidate?.weight ?? 0,
      matchedNames: matchedCandidate ? matchedCandidate.topNames.map((entry) => entry.name) : [],
    };
  }

  scoreMoveForBookSelection(state, move, popularityWeight) {
    let score = bookSelectionBonus(popularityWeight);

    if (CORNER_INDICES.includes(move.index)) {
      score += Math.round(650_000 * (this.options.cornerScale ?? 1));
    }

    score += Math.round(POSITIONAL_WEIGHTS[move.index] * 1400 * (this.options.positionalScale ?? 1));
    score += move.flipCount * 25;

    const riskPenaltyScale = this.options.riskPenaltyScale ?? 1;
    const riskType = getPositionalRisk(move.index);
    if (riskType === 'x-square') {
      score -= Math.round(240_000 * riskPenaltyScale);
    } else if (riskType === 'c-square') {
      score -= Math.round(135_000 * riskPenaltyScale);
    }

    const outcome = state.applyMove(move.index);
    if (outcome) {
      const opponentMoves = outcome.state.getLegalMoves();
      score -= opponentMoves.length * Math.round(1600 * (this.options.mobilityScale ?? 1));
      const opponentCornerReplies = opponentMoves.filter((candidate) => CORNER_INDICES.includes(candidate.index)).length;
      score -= opponentCornerReplies * Math.round(240_000 * (this.options.cornerAdjacencyScale ?? 1));
    }

    return score;
  }

  selectOpeningBookMove(state, legalMoves, bookHit) {
    const legalMoveMap = new Map(legalMoves.map((move) => [move.index, move]));
    const scoredCandidates = bookHit.candidates
      .map((candidate) => {
        const move = legalMoveMap.get(candidate.moveIndex);
        if (!move) {
          return null;
        }

        const score = this.scoreMoveForBookSelection(state, move, candidate.weight);
        return {
          index: candidate.moveIndex,
          coord: candidate.coord,
          score,
          weight: candidate.weight,
          topNames: candidate.topNames.map((entry) => entry.name),
          flipCount: move.flipCount,
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }
        if (right.weight !== left.weight) {
          return right.weight - left.weight;
        }
        return left.coord.localeCompare(right.coord);
      });

    if (scoredCandidates.length === 0) {
      return null;
    }

    return {
      scoredCandidates,
      chosen: chooseRandomBest(scoredCandidates, this.options.randomness) ?? scoredCandidates[0],
    };
  }

  createOpeningBookResult(state, legalMoves, bookHit, startedAt) {
    const selection = this.selectOpeningBookMove(state, legalMoves, bookHit);
    if (!selection) {
      return null;
    }

    this.stats.bookMoves += 1;
    this.stats.elapsedMs = Math.round(now() - startedAt);

    return {
      bestMoveIndex: selection.chosen.index,
      bestMoveCoord: selection.chosen.coord,
      score: selection.chosen.score,
      principalVariation: [selection.chosen.index],
      analyzedMoves: selection.scoredCandidates.map((candidate) => ({
        index: candidate.index,
        coord: candidate.coord,
        score: candidate.score,
        weight: candidate.weight,
        flipCount: candidate.flipCount,
      })),
      didPass: false,
      stats: { ...this.stats },
      options: { ...this.options },
      source: 'opening-book',
      bookHit: {
        ...this.describeBookHit(bookHit, selection.chosen.index, true),
        chosenNames: selection.chosen.topNames,
      },
    };
  }

  findBestMove(state, overrides = {}) {
    if (!(state instanceof GameState)) {
      throw new TypeError('findBestMove expects a GameState instance.');
    }

    if (Object.keys(overrides).length > 0) {
      this.updateOptions(overrides);
    }

    this.resetStats();
    this.trimTranspositionTable();
    const startedAt = now();
    this.deadlineMs = startedAt + this.options.timeLimitMs;
    this.searchGeneration += 1;

    const legalMoves = state.getLegalMoves();
    if (legalMoves.length === 0) {
      const result = {
        bestMoveIndex: null,
        bestMoveCoord: null,
        score: state.isTerminal() ? this.evaluator.evaluateTerminal(state) : 0,
        principalVariation: [],
        analyzedMoves: [],
        didPass: !state.isTerminal(),
        stats: { ...this.stats, elapsedMs: Math.round(now() - startedAt) },
        options: { ...this.options },
        source: 'search',
      };
      return result;
    }

    const bookHit = state.moveHistory.length <= OPENING_BOOK_ADVISORY_MAX_PLY
      ? lookupOpeningBook(state)
      : null;

    if (bookHit) {
      this.stats.bookHits += 1;
      if (this.shouldUseOpeningBookDirect(state, bookHit)) {
        const bookResult = this.createOpeningBookResult(state, legalMoves, bookHit, startedAt);
        if (bookResult) {
          return bookResult;
        }
      }
    }

    const fallback = {
      bestMoveIndex: legalMoves[0].index,
      bestMoveCoord: legalMoves[0].coord,
      score: -INFINITY,
      principalVariation: [legalMoves[0].index],
      analyzedMoves: legalMoves.map((move) => ({ index: move.index, coord: move.coord, score: -INFINITY })),
      didPass: false,
      stats: { ...this.stats },
      options: { ...this.options },
      source: 'search',
    };

    let lastCompleted = null;
    let previousScore = 0;

    for (let depth = 1; depth <= this.options.maxDepth; depth += 1) {
      try {
        this.checkDeadline();
        let result;
        const aspirationWindow = depth > 1 ? this.options.aspirationWindow : 0;

        if (aspirationWindow > 0 && lastCompleted) {
          const alpha = previousScore - aspirationWindow;
          const beta = previousScore + aspirationWindow;
          result = this.searchRoot(state, depth, alpha, beta, bookHit);
          if (result.score <= alpha || result.score >= beta) {
            result = this.searchRoot(state, depth, -INFINITY, INFINITY, bookHit);
          }
        } else {
          result = this.searchRoot(state, depth, -INFINITY, INFINITY, bookHit);
        }

        lastCompleted = result;
        previousScore = result.score;
        this.stats.completedDepth = depth;
      } catch (error) {
        if (error instanceof SearchTimeoutError) {
          break;
        }
        throw error;
      }
    }

    const finalResult = lastCompleted ?? fallback;
    const chosen = chooseRandomBest(finalResult.analyzedMoves, this.options.randomness) ?? finalResult.analyzedMoves[0];
    const selectedMove = chosen?.index ?? finalResult.bestMoveIndex;

    this.stats.elapsedMs = Math.round(now() - startedAt);
    return {
      ...finalResult,
      bestMoveIndex: selectedMove,
      bestMoveCoord: selectedMove === null || selectedMove === undefined
        ? null
        : legalMoves.find((move) => move.index === selectedMove)?.coord ?? null,
      stats: { ...this.stats },
      options: { ...this.options },
      source: 'search',
      ...(bookHit ? { bookHit: this.describeBookHit(bookHit, selectedMove, false) } : {}),
    };
  }

  searchRoot(state, depth, alpha, beta, bookHit = null) {
    const alphaStart = alpha;
    const betaStart = beta;
    const ttEntry = this.lookupTransposition(state);
    const ttMoveIndex = this.selectTableMoveForOrdering(ttEntry, depth);
    const bookWeights = bookHit
      ? new Map(bookHit.candidates.map((candidate) => [candidate.moveIndex, candidate.weight]))
      : null;
    const moves = this.orderMoves(state, state.getLegalMoves(), 0, ttMoveIndex, bookWeights);

    let bestScore = -INFINITY;
    let bestMoveIndex = null;
    let bestPv = [];
    const analyzedMoves = [];

    for (let moveIndex = 0; moveIndex < moves.length; moveIndex += 1) {
      this.checkDeadline();
      const move = moves[moveIndex];
      const outcome = state.applyMove(move.index);
      if (!outcome) {
        continue;
      }

      let childResult;
      if (moveIndex === 0) {
        childResult = this.negamax(outcome.state, depth - 1, -beta, -alpha, 1);
      } else {
        childResult = this.negamax(outcome.state, depth - 1, -alpha - 1, -alpha, 1);
        if (-childResult.score > alpha && -childResult.score < beta) {
          childResult = this.negamax(outcome.state, depth - 1, -beta, -alpha, 1);
        }
      }

      const score = -childResult.score;
      analyzedMoves.push({
        index: move.index,
        coord: move.coord,
        score,
        flipCount: move.flipCount,
      });

      if (score > bestScore) {
        bestScore = score;
        bestMoveIndex = move.index;
        bestPv = [move.index, ...childResult.principalVariation];
      }

      if (score > alpha) {
        alpha = score;
      }

      if (alpha >= beta) {
        this.stats.cutoffs += 1;
        this.recordKiller(0, move.index);
        this.recordHistory(state.currentPlayer, move.index, depth);
        break;
      }
    }

    analyzedMoves.sort((left, right) => right.score - left.score);
    const flag = this.computeTableFlag(bestScore, alphaStart, betaStart);
    this.storeTransposition(state, {
      depth,
      value: bestScore,
      flag,
      bestMoveIndex,
    });

    return {
      bestMoveIndex,
      score: bestScore,
      principalVariation: bestPv,
      analyzedMoves,
      didPass: false,
    };
  }

  negamax(state, depth, alpha, beta, ply) {
    this.checkDeadline();
    this.stats.nodes += 1;

    const empties = state.getEmptyCount();
    const exactEndgame = empties <= this.options.exactEndgameEmpties;
    const tableDepth = exactEndgame ? empties + 1 : depth;
    const alphaStart = alpha;
    const betaStart = beta;

    const ttEntry = this.lookupTransposition(state);
    if (ttEntry && ttEntry.depth >= tableDepth) {
      this.stats.ttHits += 1;
      if (ttEntry.flag === 'exact') {
        return {
          score: ttEntry.value,
          principalVariation: ttEntry.bestMoveIndex === null ? [] : [ttEntry.bestMoveIndex],
        };
      }
      if (ttEntry.flag === 'lower') {
        alpha = Math.max(alpha, ttEntry.value);
      } else if (ttEntry.flag === 'upper') {
        beta = Math.min(beta, ttEntry.value);
      }
      if (alpha >= beta) {
        return {
          score: ttEntry.value,
          principalVariation: ttEntry.bestMoveIndex === null ? [] : [ttEntry.bestMoveIndex],
        };
      }
    }

    if (state.isTerminal()) {
      return {
        score: this.evaluator.evaluateTerminal(state),
        principalVariation: [],
      };
    }

    const legalMoves = state.getLegalMoves();
    if (legalMoves.length === 0) {
      const passed = state.passTurn();
      const childResult = this.negamax(passed, Math.max(0, depth - 1), -beta, -alpha, ply + 1);
      return {
        score: -childResult.score,
        principalVariation: childResult.principalVariation,
      };
    }

    if (depth <= 0 && !exactEndgame) {
      return {
        score: this.evaluator.evaluate(state),
        principalVariation: [],
      };
    }

    const ttMoveIndex = this.selectTableMoveForOrdering(ttEntry, tableDepth);
    const orderedMoves = this.orderMoves(state, legalMoves, ply, ttMoveIndex);
    let bestScore = -INFINITY;
    let bestMoveIndex = null;
    let bestPv = [];

    for (let moveListIndex = 0; moveListIndex < orderedMoves.length; moveListIndex += 1) {
      const move = orderedMoves[moveListIndex];
      const outcome = state.applyMove(move.index);
      if (!outcome) {
        continue;
      }

      let childResult;
      if (moveListIndex === 0) {
        childResult = this.negamax(outcome.state, depth - 1, -beta, -alpha, ply + 1);
      } else {
        childResult = this.negamax(outcome.state, depth - 1, -alpha - 1, -alpha, ply + 1);
        if (-childResult.score > alpha && -childResult.score < beta) {
          childResult = this.negamax(outcome.state, depth - 1, -beta, -alpha, ply + 1);
        }
      }

      const score = -childResult.score;
      if (score > bestScore) {
        bestScore = score;
        bestMoveIndex = move.index;
        bestPv = [move.index, ...childResult.principalVariation];
      }

      if (score > alpha) {
        alpha = score;
      }

      if (alpha >= beta) {
        this.stats.cutoffs += 1;
        this.recordKiller(ply, move.index);
        this.recordHistory(state.currentPlayer, move.index, depth);
        break;
      }
    }

    const flag = this.computeTableFlag(bestScore, alphaStart, betaStart);
    this.storeTransposition(state, {
      depth: tableDepth,
      value: bestScore,
      flag,
      bestMoveIndex,
    });

    return {
      score: bestScore,
      principalVariation: bestPv,
    };
  }

  computeTableFlag(score, alphaStart, betaStart) {
    if (score <= alphaStart) {
      return 'upper';
    }
    if (score >= betaStart) {
      return 'lower';
    }
    return 'exact';
  }

  lookupTransposition(state) {
    return this.transpositionTable.get(state.hashKey()) ?? null;
  }

  selectTableMoveForOrdering(ttEntry, requestedDepth) {
    if (!ttEntry || !Number.isInteger(ttEntry.bestMoveIndex)) {
      return null;
    }
    if (ttEntry.flag === 'exact') {
      return ttEntry.bestMoveIndex;
    }
    if (requestedDepth <= 2) {
      return ttEntry.bestMoveIndex;
    }

    const minimumDepth = Math.max(2, requestedDepth - 2);
    return ttEntry.depth >= minimumDepth ? ttEntry.bestMoveIndex : null;
  }

  storeTransposition(state, entry) {
    const key = state.hashKey();
    const existing = this.transpositionTable.get(key);
    if (shouldKeepExistingTableEntry(existing, entry)) {
      return;
    }

    if (existing) {
      this.transpositionTable.delete(key);
    }

    if (this.transpositionTable.size >= this.options.maxTableEntries) {
      this.trimTranspositionTable();
    }

    this.transpositionTable.set(key, {
      ...entry,
      generation: this.searchGeneration,
    });
    this.stats.ttStores += 1;
  }

  recordKiller(ply, moveIndex) {
    if (!Number.isInteger(moveIndex)) {
      return;
    }

    if (!this.killerMoves[ply]) {
      this.killerMoves[ply] = [moveIndex, null];
      return;
    }

    if (this.killerMoves[ply][0] === moveIndex) {
      return;
    }

    this.killerMoves[ply][1] = this.killerMoves[ply][0];
    this.killerMoves[ply][0] = moveIndex;
  }

  recordHistory(color, moveIndex, depth) {
    if (!Number.isInteger(moveIndex)) {
      return;
    }
    const bucket = this.historyHeuristic[colorIndex(color)];
    bucket[moveIndex] += depth * depth;
    if (bucket[moveIndex] > 2_000_000) {
      for (let index = 0; index < bucket.length; index += 1) {
        bucket[index] = Math.floor(bucket[index] / 2);
      }
    }
  }

  orderMoves(state, moves, ply, ttMoveIndex = null, bookWeights = null) {
    const ordered = moves.map((move) => ({
      ...move,
      orderingScore: this.scoreMoveForOrdering(state, move, ply, ttMoveIndex, bookWeights),
    }));

    ordered.sort((left, right) => right.orderingScore - left.orderingScore);
    return ordered;
  }

  scoreMoveForOrdering(state, move, ply, ttMoveIndex, bookWeights = null) {
    let score = 0;

    if (move.index === ttMoveIndex) {
      score += 10_000_000;
    }

    if (CORNER_INDICES.includes(move.index)) {
      score += 5_000_000;
    }

    if (bookWeights?.has(move.index)) {
      score += bookOrderingBonus(bookWeights.get(move.index));
    }

    if (this.killerMoves[ply]?.[0] === move.index) {
      score += 1_500_000;
    } else if (this.killerMoves[ply]?.[1] === move.index) {
      score += 1_000_000;
    }

    score += this.historyHeuristic[colorIndex(state.currentPlayer)][move.index] * 50;
    score += POSITIONAL_WEIGHTS[move.index] * 1000;
    score += move.flipCount * 30;

    const riskPenaltyScale = this.options.riskPenaltyScale ?? 1;
    const riskType = getPositionalRisk(move.index);
    if (riskType === 'x-square') {
      score -= Math.round(150_000 * riskPenaltyScale);
    } else if (riskType === 'c-square') {
      score -= Math.round(80_000 * riskPenaltyScale);
    }

    if (ply <= 1) {
      const outcome = state.applyMove(move.index);
      if (outcome) {
        const opponentMoves = outcome.state.getLegalMoves().length;
        score -= opponentMoves * Math.round(1200 * (this.options.mobilityScale ?? 1));
      }
    }

    return score;
  }
}

export function createEngine(presetKey = DEFAULT_PRESET_KEY, customInputs = {}, styleKey = DEFAULT_STYLE_KEY) {
  const options = resolveEngineOptions(presetKey, customInputs, styleKey);
  return new SearchEngine(options);
}

export function listAvailablePresets() {
  return Object.entries(ENGINE_PRESETS).map(([key, preset]) => ({
    key,
    label: preset.label,
    description: preset.description,
  }));
}

export function listAvailableStyles() {
  return Object.entries(ENGINE_STYLE_PRESETS).map(([key, preset]) => ({
    key,
    label: preset.label,
    description: preset.description,
  }));
}
