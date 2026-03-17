import {
  bitFromIndex,
  CORNER_INDICES,
  POSITIONAL_WEIGHTS,
  X_SQUARE_INDICES,
  C_SQUARE_INDICES,
} from '../core/bitboard.js';
import { GameState } from '../core/game-state.js';
import { Evaluator, getPositionalRisk } from './evaluator.js';
import { ENGINE_PRESETS, resolveEngineOptions } from './presets.js';

const INFINITY = 10 ** 9;
const DEFAULT_PRESET_KEY = 'strong';

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

export class SearchEngine {
  constructor(engineOptions = {}) {
    const presetKey = engineOptions.presetKey ?? DEFAULT_PRESET_KEY;
    this.options = resolveEngineOptions(presetKey, engineOptions);
    this.evaluator = new Evaluator(this.options);
    this.transpositionTable = new Map();
    this.killerMoves = [];
    this.historyHeuristic = Array.from({ length: 2 }, () => Array(64).fill(0));
    this.resetStats();
  }

  updateOptions(engineOptions = {}) {
    const presetKey = engineOptions.presetKey ?? this.options.presetKey ?? DEFAULT_PRESET_KEY;
    this.options = resolveEngineOptions(presetKey, engineOptions);
    this.evaluator = new Evaluator(this.options);
    this.trimTranspositionTable(true);
  }

  resetStats() {
    this.stats = {
      nodes: 0,
      cutoffs: 0,
      ttHits: 0,
      ttStores: 0,
      completedDepth: 0,
      elapsedMs: 0,
    };
  }

  trimTranspositionTable(forceClear = false) {
    if (forceClear || this.transpositionTable.size > this.options.maxTableEntries) {
      this.transpositionTable.clear();
    }
  }

  checkDeadline() {
    if (now() >= this.deadlineMs) {
      throw new SearchTimeoutError();
    }
  }

  findBestMove(state, overrides = {}) {
    if (!(state instanceof GameState)) {
      throw new TypeError('findBestMove expects a GameState instance.');
    }

    if (Object.keys(overrides).length > 0) {
      this.updateOptions({ ...this.options, ...overrides });
    }

    this.resetStats();
    this.trimTranspositionTable();
    const startedAt = now();
    this.deadlineMs = startedAt + this.options.timeLimitMs;

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
      };
      return result;
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
          result = this.searchRoot(state, depth, alpha, beta);
          if (result.score <= alpha || result.score >= beta) {
            result = this.searchRoot(state, depth, -INFINITY, INFINITY);
          }
        } else {
          result = this.searchRoot(state, depth, -INFINITY, INFINITY);
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
      bestMoveCoord: selectedMove === null || selectedMove === undefined ? null : state.getLegalMoves().find((move) => move.index === selectedMove)?.coord ?? null,
      stats: { ...this.stats },
      options: { ...this.options },
    };
  }

  searchRoot(state, depth, alpha, beta) {
    const alphaStart = alpha;
    const betaStart = beta;
    const ttEntry = this.lookupTransposition(state);
    const moves = this.orderMoves(state, state.getLegalMoves(), 0, ttEntry?.bestMoveIndex);

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

    const orderedMoves = this.orderMoves(state, legalMoves, ply, ttEntry?.bestMoveIndex);
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

  storeTransposition(state, entry) {
    if (this.transpositionTable.size >= this.options.maxTableEntries) {
      this.trimTranspositionTable(true);
    }
    this.transpositionTable.set(state.hashKey(), entry);
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
  }

  orderMoves(state, moves, ply, ttMoveIndex = null) {
    const ordered = moves.map((move) => ({
      ...move,
      orderingScore: this.scoreMoveForOrdering(state, move, ply, ttMoveIndex),
    }));

    ordered.sort((left, right) => right.orderingScore - left.orderingScore);
    return ordered;
  }

  scoreMoveForOrdering(state, move, ply, ttMoveIndex) {
    let score = 0;

    if (move.index === ttMoveIndex) {
      score += 10_000_000;
    }

    if (CORNER_INDICES.includes(move.index)) {
      score += 5_000_000;
    }

    if (this.killerMoves[ply]?.[0] === move.index) {
      score += 1_500_000;
    } else if (this.killerMoves[ply]?.[1] === move.index) {
      score += 1_000_000;
    }

    score += this.historyHeuristic[colorIndex(state.currentPlayer)][move.index] * 50;
    score += POSITIONAL_WEIGHTS[move.index] * 1000;
    score += move.flipCount * 30;

    const riskType = getPositionalRisk(move.index);
    if (riskType === 'x-square') {
      score -= 150_000;
    } else if (riskType === 'c-square') {
      score -= 80_000;
    }

    return score;
  }
}

export function createEngine(presetKey = DEFAULT_PRESET_KEY, customInputs = {}) {
  const options = resolveEngineOptions(presetKey, customInputs);
  return new SearchEngine(options);
}

export function listAvailablePresets() {
  return Object.entries(ENGINE_PRESETS).map(([key, preset]) => ({
    key,
    label: preset.label,
    description: preset.description,
  }));
}
