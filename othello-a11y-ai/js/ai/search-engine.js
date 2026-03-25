import {
  bitFromIndex,
  connectedRegions,
  CORNER_INDICES,
  indexFromBit,
  popcount,
  POSITIONAL_WEIGHTS,
} from '../core/bitboard.js';
import { GameState } from '../core/game-state.js';
import { computeFlips, legalMovesBitboard } from '../core/rules.js';
import { Evaluator, MoveOrderingEvaluator, getPositionalRisk } from './evaluator.js';
import {
  lookupOpeningBook,
  OPENING_BOOK_ADVISORY_MAX_PLY,
  OPENING_BOOK_DIRECT_USE_MAX_PLY,
} from './opening-book.js';
import {
  DEFAULT_STYLE_KEY,
  ENGINE_PRESETS,
  ENGINE_STYLE_PRESETS,
  resolveEngineOptions,
} from './presets.js';

const INFINITY = 10 ** 9;
const DEFAULT_PRESET_KEY = 'normal';
const ORDERING_PROBE_EMPTIES = 18;
const ORDERING_LIGHTWEIGHT_EVAL_MAX_EMPTIES = 18;
const REGION_PARITY_EMPTIES = 16;
const SMALL_EXACT_SOLVER_EMPTIES = 4;
const LMR_MIN_DEPTH = 4;
const LMR_MIN_MOVE_INDEX = 2;
const LMR_DEEP_REDUCTION_DEPTH = 7;
const LMR_DEEP_REDUCTION_MOVE_INDEX = 6;
const LMR_MIN_EMPTIES = 10;
const CORNER_MOVE_MASK = CORNER_INDICES.reduce(
  (mask, index) => mask | bitFromIndex(index),
  0n,
);
const TABLE_RELEVANT_OPTION_KEYS = Object.freeze([
  'exactEndgameEmpties',
  'mobilityScale',
  'potentialMobilityScale',
  'cornerScale',
  'cornerAdjacencyScale',
  'stabilityScale',
  'frontierScale',
  'positionalScale',
  'edgePatternScale',
  'cornerPatternScale',
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

function transpositionReplacementPriority(entry) {
  const depth = entry.depth ?? 0;
  let priority = depth * 100;

  if (entry.flag === 'exact') {
    priority += 250;
  } else if (entry.flag === 'lower') {
    priority += 15;
  }

  return priority;
}

function shouldKeepExistingTableEntry(existing, incoming) {
  if (!existing) {
    return false;
  }

  const existingPriority = transpositionReplacementPriority(existing);
  const incomingPriority = transpositionReplacementPriority(incoming);

  if (incomingPriority > existingPriority) {
    return false;
  }
  if (incomingPriority < existingPriority) {
    return true;
  }

  return (existing.generation ?? 0) >= (incoming.generation ?? 0);
}

function bookOrderingBonus(weight) {
  return Math.round(Math.log2(Math.max(1, weight) + 1) * 90_000);
}

function bookSelectionBonus(weight) {
  return Math.round(Math.log2(Math.max(1, weight) + 1) * 120_000);
}

function countCornerMoves(moveBitboard) {
  return popcount(moveBitboard & CORNER_MOVE_MASK);
}

function buildParityRegionInfo(emptyBitboard) {
  const regionSizeByIndex = Array(64).fill(0);
  const regions = connectedRegions(emptyBitboard);
  let oddRegionCount = 0;
  let evenRegionCount = 0;

  for (const region of regions) {
    const size = popcount(region);
    if (size % 2 === 1) {
      oddRegionCount += 1;
    } else {
      evenRegionCount += 1;
    }

    let cursor = region;
    while (cursor !== 0n) {
      const leastSignificantBit = cursor & -cursor;
      regionSizeByIndex[indexFromBit(leastSignificantBit)] = size;
      cursor ^= leastSignificantBit;
    }
  }

  return {
    regionCount: regions.length,
    regionSizeByIndex,
    oddRegionCount,
    evenRegionCount,
  };
}

export class SearchEngine {
  constructor(engineOptions = {}) {
    this.options = resolveOptionsFromInput(engineOptions);
    this.evaluator = new Evaluator(this.options);
    this.moveOrderingEvaluator = new MoveOrderingEvaluator(this.options);
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
      this.moveOrderingEvaluator = new MoveOrderingEvaluator(this.options);
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
      smallSolverCalls: 0,
      smallSolverNodes: 0,
      ttFirstSearches: 0,
      ttFirstCutoffs: 0,
      lmrReductions: 0,
      lmrReSearches: 0,
      lmrFullReSearches: 0,
      orderingEvalCalls: 0,
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
    const keysToDelete = [];
    const queued = new Set();
    const requiredRemovals = this.transpositionTable.size - targetSize;
    const ageOf = (entry) => Math.max(0, this.searchGeneration - (entry.generation ?? this.searchGeneration));
    const queueMatchingEntries = (predicate) => {
      if (keysToDelete.length >= requiredRemovals) {
        return;
      }

      for (const [key, entry] of this.transpositionTable) {
        if (keysToDelete.length >= requiredRemovals) {
          break;
        }
        if (queued.has(key)) {
          continue;
        }
        if (!predicate(entry, ageOf(entry))) {
          continue;
        }

        queued.add(key);
        keysToDelete.push(key);
      }
    };

    queueMatchingEntries((entry, age) => age >= 2 && entry.flag !== 'exact' && (entry.depth ?? 0) <= 4);
    queueMatchingEntries((entry, age) => age >= 2 && entry.flag !== 'exact');
    queueMatchingEntries((entry, age) => age >= 1 && entry.flag !== 'exact' && (entry.depth ?? 0) <= 2);
    queueMatchingEntries((entry, age) => age >= 2 && (entry.depth ?? 0) <= 4);
    queueMatchingEntries((entry, age) => age >= 1 && entry.flag !== 'exact');

    if (keysToDelete.length < requiredRemovals) {
      for (const key of this.transpositionTable.keys()) {
        if (keysToDelete.length >= requiredRemovals) {
          break;
        }
        if (queued.has(key)) {
          continue;
        }

        queued.add(key);
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.transpositionTable.delete(key);
    }

    if (this.stats) {
      this.stats.ttEvictions += keysToDelete.length;
    }
  }

  checkDeadline() {
    if (now() >= this.deadlineMs) {
      throw new SearchTimeoutError();
    }
  }

  exactTerminalScoreFromBoards(player, opponent) {
    return (popcount(player) - popcount(opponent)) * 10000;
  }

  solveSmallExactBoards(player, opponent, emptyBits, consecutivePasses = 0) {
    this.checkDeadline();
    this.stats.smallSolverNodes += 1;

    if (emptyBits === 0n) {
      return this.exactTerminalScoreFromBoards(player, opponent);
    }

    let bestScore = -INFINITY;
    let legalFound = false;
    let cursor = emptyBits;

    while (cursor !== 0n) {
      const moveBit = cursor & -cursor;
      cursor ^= moveBit;

      const flips = computeFlips(moveBit, player, opponent);
      if (flips === 0n) {
        continue;
      }

      legalFound = true;
      const nextPlayerBoard = player | moveBit | flips;
      const nextOpponentBoard = opponent & ~flips;
      const score = -this.solveSmallExactBoards(
        nextOpponentBoard,
        nextPlayerBoard,
        emptyBits & ~moveBit,
        0,
      );

      if (score > bestScore) {
        bestScore = score;
      }
    }

    if (legalFound) {
      return bestScore;
    }
    if (consecutivePasses > 0) {
      return this.exactTerminalScoreFromBoards(player, opponent);
    }

    return -this.solveSmallExactBoards(opponent, player, emptyBits, consecutivePasses + 1);
  }

  solveSmallExact(state) {
    this.stats.smallSolverCalls += 1;
    const { player, opponent } = state.getPlayerBoards();
    return this.solveSmallExactBoards(
      player,
      opponent,
      state.getEmptyBitboard(),
      state.consecutivePasses,
    );
  }

  pullPreferredMove(moves, preferredMoveIndex) {
    if (!Number.isInteger(preferredMoveIndex)) {
      return { preferredMove: null, remainingMoves: moves };
    }

    const preferredIndex = moves.findIndex((move) => move.index === preferredMoveIndex);
    if (preferredIndex < 0) {
      return { preferredMove: null, remainingMoves: moves };
    }

    const preferredMove = moves[preferredIndex];
    const remainingMoves = [
      ...moves.slice(0, preferredIndex),
      ...moves.slice(preferredIndex + 1),
    ];

    return { preferredMove, remainingMoves };
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

    const childState = state.applyMoveFast(move.index, move.flips ?? null);
    if (childState) {
      const childBoards = childState.getPlayerBoards();
      const opponentMovesBitboard = legalMovesBitboard(childBoards.player, childBoards.opponent);
      const opponentMoveCount = popcount(opponentMovesBitboard);
      score -= opponentMoveCount * Math.round(1600 * (this.options.mobilityScale ?? 1));
      const opponentCornerReplies = countCornerMoves(opponentMovesBitboard);
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
        principalVariation: [candidate.index],
        weight: candidate.weight,
        flipCount: candidate.flipCount,
      })),
      didPass: false,
      stats: { ...this.stats },
      options: { ...this.options },
      source: 'opening-book',
      searchMode: 'opening-book',
      isExactResult: false,
      rootEmptyCount: state.getEmptyCount(),
      exactThreshold: this.options.exactEndgameEmpties,
      bookHit: {
        ...this.describeBookHit(bookHit, selection.chosen.index, true),
        chosenNames: selection.chosen.topNames,
      },
    };
  }

  buildRootFallback(state, legalMoves, bookWeights = null) {
    const orderedMoves = this.orderMoves(state, legalMoves, 0, 1, null, bookWeights);
    const analyzedMoves = [];

    for (const move of orderedMoves) {
      const outcome = move.orderingOutcome ?? state.applyMoveFast(move.index, move.flips ?? null);
      if (!outcome) {
        continue;
      }

      let fallbackState = outcome;
      if (!fallbackState.isTerminal() && fallbackState.getSearchMoves().length === 0) {
        fallbackState = fallbackState.passTurnFast();
      }

      const score = fallbackState.isTerminal()
        ? this.evaluator.evaluateTerminal(fallbackState, state.currentPlayer)
        : this.evaluator.evaluate(fallbackState, state.currentPlayer);

      analyzedMoves.push({
        index: move.index,
        coord: move.coord,
        score,
        principalVariation: [move.index],
        flipCount: move.flipCount,
      });
    }

    analyzedMoves.sort((left, right) => right.score - left.score);
    const bestMove = analyzedMoves[0] ?? {
      index: legalMoves[0].index,
      coord: legalMoves[0].coord,
      score: this.evaluator.evaluate(state, state.currentPlayer),
      principalVariation: [legalMoves[0].index],
      flipCount: legalMoves[0].flipCount,
    };

    return {
      bestMoveIndex: bestMove.index,
      bestMoveCoord: bestMove.coord,
      score: bestMove.score,
      principalVariation: [...bestMove.principalVariation],
      analyzedMoves,
      didPass: false,
      stats: { ...this.stats },
      options: { ...this.options },
      source: 'search',
    };
  }

  searchForcedPassRoot(passedState, depth, alpha, beta, rootExactEndgame) {
    const childResult = this.negamax(passedState, Math.max(0, depth - 1), -beta, -alpha, 1, rootExactEndgame);
    return {
      bestMoveIndex: null,
      score: -childResult.score,
      principalVariation: childResult.principalVariation,
      analyzedMoves: [],
      didPass: true,
    };
  }

  runIterativeDeepening(searchAtDepth) {
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
          result = searchAtDepth(depth, alpha, beta);
          if (result.score <= alpha || result.score >= beta) {
            result = searchAtDepth(depth, -INFINITY, INFINITY);
          }
        } else {
          result = searchAtDepth(depth, -INFINITY, INFINITY);
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

    return lastCompleted;
  }

  runSingleDepthSearch(depth, searchAtDepth) {
    try {
      this.checkDeadline();
      const result = searchAtDepth(depth, -INFINITY, INFINITY);
      this.stats.completedDepth = depth;
      return result;
    } catch (error) {
      if (error instanceof SearchTimeoutError) {
        return null;
      }
      throw error;
    }
  }

  findBestMove(state, overrides = {}) {
    if (!(state instanceof GameState)) {
      throw new TypeError('findBestMove expects a GameState instance.');
    }

    if (Object.keys(overrides).length > 0) {
      this.updateOptions(overrides);
    }

    this.resetStats();
    this.searchGeneration += 1;
    this.trimTranspositionTable();
    const startedAt = now();
    this.deadlineMs = startedAt + this.options.timeLimitMs;
    const rootEmptyCount = state.getEmptyCount();
    const rootExactEndgame = rootEmptyCount <= this.options.exactEndgameEmpties;
    const rootSearchMode = rootExactEndgame ? 'exact-endgame' : 'depth-limited';

    const legalMoves = state.getLegalMoves();
    if (legalMoves.length === 0) {
      if (state.isTerminal()) {
        return {
          bestMoveIndex: null,
          bestMoveCoord: null,
          score: this.evaluator.evaluateTerminal(state),
          principalVariation: [],
          analyzedMoves: [],
          didPass: false,
          stats: { ...this.stats, elapsedMs: Math.round(now() - startedAt) },
          options: { ...this.options },
          source: 'search',
          searchMode: 'terminal',
          isExactResult: true,
          rootEmptyCount,
          exactThreshold: this.options.exactEndgameEmpties,
        };
      }

      const passedState = state.passTurnFast();
      const fallback = {
        bestMoveIndex: null,
        bestMoveCoord: null,
        score: this.evaluator.evaluate(passedState, state.currentPlayer),
        principalVariation: [],
        analyzedMoves: [],
        didPass: true,
        stats: { ...this.stats },
        options: { ...this.options },
        source: 'search',
      };

      const finalResult = rootExactEndgame
        ? this.runSingleDepthSearch(this.options.maxDepth, (depth, alpha, beta) => (
          this.searchForcedPassRoot(passedState, depth, alpha, beta, rootExactEndgame)
        )) ?? fallback
        : this.runIterativeDeepening((depth, alpha, beta) => (
          this.searchForcedPassRoot(passedState, depth, alpha, beta, rootExactEndgame)
        )) ?? fallback;
      this.stats.elapsedMs = Math.round(now() - startedAt);
      return {
        ...finalResult,
        stats: { ...this.stats },
        options: { ...this.options },
        source: 'search',
        searchMode: rootSearchMode,
        isExactResult: rootExactEndgame && finalResult !== fallback,
        rootEmptyCount,
        exactThreshold: this.options.exactEndgameEmpties,
      };
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

    const bookWeights = bookHit
      ? new Map(bookHit.candidates.map((candidate) => [candidate.moveIndex, candidate.weight]))
      : null;
    const fallback = this.buildRootFallback(state, legalMoves, bookWeights);

    const finalResult = rootExactEndgame
      // Exact root search does not need iterative deepening. Run the full exact solve once
      // at the configured top depth so move-ordering heuristics still see the late-game
      // depth horizon, but avoid repeating the exact tree for depths 1..maxDepth.
      ? this.runSingleDepthSearch(this.options.maxDepth, (depth, alpha, beta) => (
        this.searchRoot(state, legalMoves, depth, alpha, beta, bookWeights, rootExactEndgame)
      )) ?? fallback
      : this.runIterativeDeepening((depth, alpha, beta) => (
        this.searchRoot(state, legalMoves, depth, alpha, beta, bookWeights, rootExactEndgame)
      )) ?? fallback;
    const chosen = chooseRandomBest(finalResult.analyzedMoves, this.options.randomness) ?? finalResult.analyzedMoves[0] ?? null;
    const selectedMove = chosen?.index ?? finalResult.bestMoveIndex;
    const selectedCoord = chosen?.coord ?? (
      selectedMove === null || selectedMove === undefined
        ? null
        : legalMoves.find((move) => move.index === selectedMove)?.coord ?? null
    );
    const selectedScore = Number.isFinite(chosen?.score) ? chosen.score : finalResult.score;
    const selectedPrincipalVariation = Array.isArray(chosen?.principalVariation) && chosen.principalVariation.length > 0
      ? [...chosen.principalVariation]
      : (selectedMove === null || selectedMove === undefined ? [] : [selectedMove]);

    this.stats.elapsedMs = Math.round(now() - startedAt);
    return {
      ...finalResult,
      bestMoveIndex: selectedMove,
      bestMoveCoord: selectedCoord,
      score: selectedScore,
      principalVariation: selectedPrincipalVariation,
      stats: { ...this.stats },
      options: { ...this.options },
      source: 'search',
      searchMode: rootSearchMode,
      isExactResult: rootExactEndgame && finalResult !== fallback,
      rootEmptyCount,
      exactThreshold: this.options.exactEndgameEmpties,
      ...(bookHit ? { bookHit: this.describeBookHit(bookHit, selectedMove, false) } : {}),
    };
  }

  searchRoot(state, rootMoves, depth, alpha, beta, bookWeights = null, rootExactEndgame = false) {
    const alphaStart = alpha;
    const betaStart = beta;
    const ttEntry = this.lookupTransposition(state);
    const ttMoveIndex = this.selectTableMoveForOrdering(ttEntry, depth);

    let bestScore = -INFINITY;
    let bestMoveIndex = null;
    let bestPv = [];
    const analyzedMoves = [];

    const { preferredMove, remainingMoves } = this.pullPreferredMove(rootMoves, ttMoveIndex);
    if (preferredMove) {
      this.stats.ttFirstSearches += 1;
      const preferredOutcome = state.applyMoveFast(preferredMove.index, preferredMove.flips ?? null);
      if (preferredOutcome) {
        const preferredChild = this.negamax(preferredOutcome, depth - 1, -beta, -alpha, 1, rootExactEndgame);
        const preferredScore = -preferredChild.score;
        const preferredPrincipalVariation = [preferredMove.index, ...preferredChild.principalVariation];
        analyzedMoves.push({
          index: preferredMove.index,
          coord: preferredMove.coord,
          score: preferredScore,
          principalVariation: preferredPrincipalVariation,
          flipCount: preferredMove.flipCount,
        });
        bestScore = preferredScore;
        bestMoveIndex = preferredMove.index;
        bestPv = preferredPrincipalVariation;
        alpha = Math.max(alpha, preferredScore);

        if (alpha >= beta) {
          this.stats.cutoffs += 1;
          this.stats.ttFirstCutoffs += 1;
          this.recordKiller(0, preferredMove.index);
          this.recordHistory(state.currentPlayer, preferredMove.index, depth);

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
      }
    }

    const moves = this.orderMoves(state, remainingMoves, 0, depth, preferredMove ? null : ttMoveIndex, bookWeights);

    for (let orderedMoveIndex = 0; orderedMoveIndex < moves.length; orderedMoveIndex += 1) {
      this.checkDeadline();
      const move = moves[orderedMoveIndex];
      const outcome = move.orderingOutcome ?? state.applyMoveFast(move.index, move.flips ?? null);
      if (!outcome) {
        continue;
      }

      let childResult;
      if (orderedMoveIndex === 0 && !preferredMove) {
        childResult = this.negamax(outcome, depth - 1, -beta, -alpha, 1, rootExactEndgame);
      } else {
        childResult = this.negamax(outcome, depth - 1, -alpha - 1, -alpha, 1, rootExactEndgame);
        if (-childResult.score > alpha && -childResult.score < beta) {
          childResult = this.negamax(outcome, depth - 1, -beta, -alpha, 1, rootExactEndgame);
        }
      }

      const score = -childResult.score;
      const principalVariation = [move.index, ...childResult.principalVariation];
      analyzedMoves.push({
        index: move.index,
        coord: move.coord,
        score,
        principalVariation,
        flipCount: move.flipCount,
      });

      if (score > bestScore) {
        bestScore = score;
        bestMoveIndex = move.index;
        bestPv = principalVariation;
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

  negamax(state, depth, alpha, beta, ply, rootExactEndgame = false) {
    this.checkDeadline();
    this.stats.nodes += 1;

    const empties = state.getEmptyCount();
    // Propagate the root decision instead of re-triggering exact search mid-tree. This
    // keeps positions above the configured boundary depth-limited for the whole search.
    const exactEndgame = rootExactEndgame;
    const tableDepth = exactEndgame ? empties + 1 : Math.max(0, depth);
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

    if (exactEndgame && empties <= SMALL_EXACT_SOLVER_EMPTIES) {
      const score = this.solveSmallExact(state);
      this.storeTransposition(state, {
        depth: tableDepth,
        value: score,
        flag: 'exact',
        bestMoveIndex: null,
      });
      return {
        score,
        principalVariation: [],
      };
    }

    const legalMoves = state.getSearchMoves();
    if (legalMoves.length === 0) {
      const { player, opponent } = state.getPlayerBoards();
      if (legalMovesBitboard(opponent, player) === 0n) {
        const score = this.exactTerminalScoreFromBoards(player, opponent);
        this.storeTransposition(state, {
          depth: tableDepth,
          value: score,
          flag: 'exact',
          bestMoveIndex: null,
        });
        return {
          score,
          principalVariation: [],
        };
      }

      const passed = state.passTurnFast();
      const childResult = this.negamax(passed, Math.max(0, depth - 1), -beta, -alpha, ply + 1, rootExactEndgame);
      const score = -childResult.score;
      const flag = this.computeTableFlag(score, alphaStart, betaStart);
      this.storeTransposition(state, {
        depth: tableDepth,
        value: score,
        flag,
        bestMoveIndex: null,
      });
      return {
        score,
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
    let bestScore = -INFINITY;
    let bestMoveIndex = null;
    let bestPv = [];

    const { preferredMove, remainingMoves } = this.pullPreferredMove(legalMoves, ttMoveIndex);
    if (preferredMove) {
      this.stats.ttFirstSearches += 1;
      const preferredOutcome = state.applyMoveFast(preferredMove.index, preferredMove.flips ?? null);
      if (preferredOutcome) {
        const preferredChild = this.negamax(preferredOutcome, depth - 1, -beta, -alpha, ply + 1, rootExactEndgame);
        bestScore = -preferredChild.score;
        bestMoveIndex = preferredMove.index;
        bestPv = [preferredMove.index, ...preferredChild.principalVariation];
        alpha = Math.max(alpha, bestScore);

        if (alpha >= beta) {
          this.stats.cutoffs += 1;
          this.stats.ttFirstCutoffs += 1;
          this.recordKiller(ply, preferredMove.index);
          this.recordHistory(state.currentPlayer, preferredMove.index, depth);

          const preferredFlag = this.computeTableFlag(bestScore, alphaStart, betaStart);
          this.storeTransposition(state, {
            depth: tableDepth,
            value: bestScore,
            flag: preferredFlag,
            bestMoveIndex,
          });

          return {
            score: bestScore,
            principalVariation: bestPv,
          };
        }
      }
    }

    const orderedMoves = this.orderMoves(state, remainingMoves, ply, depth, preferredMove ? null : ttMoveIndex);

    for (let orderedMoveIndex = 0; orderedMoveIndex < orderedMoves.length; orderedMoveIndex += 1) {
      const move = orderedMoves[orderedMoveIndex];
      const outcome = move.orderingOutcome ?? state.applyMoveFast(move.index, move.flips ?? null);
      if (!outcome) {
        continue;
      }

      let childResult;
      let score;
      if (orderedMoveIndex === 0 && !preferredMove) {
        childResult = this.negamax(outcome, depth - 1, -beta, -alpha, ply + 1, rootExactEndgame);
        score = -childResult.score;
      } else if (this.shouldApplyLateMoveReduction(state, move, ply, depth, orderedMoveIndex, exactEndgame)) {
        const reduction = this.lateMoveReduction(depth, orderedMoveIndex);
        this.stats.lmrReductions += 1;
        childResult = this.negamax(outcome, Math.max(0, depth - 1 - reduction), -alpha - 1, -alpha, ply + 1, rootExactEndgame);
        score = -childResult.score;

        if (score > alpha) {
          this.stats.lmrReSearches += 1;
          childResult = this.negamax(outcome, depth - 1, -alpha - 1, -alpha, ply + 1, rootExactEndgame);
          score = -childResult.score;
          if (score > alpha && score < beta) {
            this.stats.lmrFullReSearches += 1;
            childResult = this.negamax(outcome, depth - 1, -beta, -alpha, ply + 1, rootExactEndgame);
            score = -childResult.score;
          }
        }
      } else {
        childResult = this.negamax(outcome, depth - 1, -alpha - 1, -alpha, ply + 1, rootExactEndgame);
        score = -childResult.score;
        if (score > alpha && score < beta) {
          childResult = this.negamax(outcome, depth - 1, -beta, -alpha, ply + 1, rootExactEndgame);
          score = -childResult.score;
        }
      }
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
    const nextEntry = {
      ...entry,
      generation: this.searchGeneration,
    };
    const existing = this.transpositionTable.get(key);
    if (shouldKeepExistingTableEntry(existing, nextEntry)) {
      return;
    }

    if (existing) {
      this.transpositionTable.delete(key);
    }

    if (this.transpositionTable.size >= this.options.maxTableEntries) {
      this.trimTranspositionTable();
    }

    this.transpositionTable.set(key, nextEntry);
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

  shouldApplyLateMoveReduction(state, move, ply, depthRemaining, moveListIndex, exactEndgame) {
    if (exactEndgame) {
      return false;
    }
    if (ply < 1 || depthRemaining < LMR_MIN_DEPTH || moveListIndex < LMR_MIN_MOVE_INDEX) {
      return false;
    }
    if (state.getEmptyCount() <= Math.max(LMR_MIN_EMPTIES, (this.options.exactEndgameEmpties ?? 0) + 2)) {
      return false;
    }
    if (CORNER_INDICES.includes(move.index)) {
      return false;
    }
    if (this.killerMoves[ply]?.[0] === move.index || this.killerMoves[ply]?.[1] === move.index) {
      return false;
    }
    return true;
  }

  lateMoveReduction(depthRemaining, moveListIndex) {
    let reduction = 1;

    if (depthRemaining >= LMR_DEEP_REDUCTION_DEPTH && moveListIndex >= LMR_DEEP_REDUCTION_MOVE_INDEX) {
      reduction += 1;
    }

    return Math.min(reduction, Math.max(1, depthRemaining - 2));
  }

  shouldUseLightweightOrderingEvaluator(empties, depthRemaining) {
    if (depthRemaining <= 1) {
      return false;
    }

    const activationThreshold = Math.max(
      10,
      Math.min(ORDERING_LIGHTWEIGHT_EVAL_MAX_EMPTIES, (this.options.exactEndgameEmpties ?? 10) + 4),
    );

    return empties >= 10 && empties <= activationThreshold;
  }

  selectLateOrderingProfile(empties) {
    const exactEndgameEmpties = this.options.exactEndgameEmpties ?? 10;
    const activationThreshold = Math.max(
      10,
      Math.min(ORDERING_LIGHTWEIGHT_EVAL_MAX_EMPTIES, exactEndgameEmpties + 4),
    );

    if (empties <= exactEndgameEmpties) {
      // Once the node is already inside the exact window, generic midgame ordering
      // signals add more noise than value. Favor the trained late-ordering score and
      // tactical late-game constraints instead.
      return {
        killerPrimaryScale: 0.5,
        killerSecondaryScale: 0.4,
        historyScale: 0,
        positionalScale: 0,
        flipScale: 0,
        riskScale: 0.25,
        mobilityPenaltyScale: 1.2,
        cornerReplyPenaltyScale: 1.25,
        passBonusScale: 1,
        parityScale: 1.25,
        lightweightEvalScale: 4.5,
      };
    }

    if (empties <= activationThreshold) {
      return {
        killerPrimaryScale: 0.85,
        killerSecondaryScale: 0.8,
        historyScale: 0.45,
        positionalScale: 0.55,
        flipScale: 0.6,
        riskScale: 0.75,
        mobilityPenaltyScale: 1.05,
        cornerReplyPenaltyScale: 1.1,
        passBonusScale: 1,
        parityScale: 1.05,
        lightweightEvalScale: 1.75,
      };
    }

    return {
      killerPrimaryScale: 1,
      killerSecondaryScale: 1,
      historyScale: 1,
      positionalScale: 1,
      flipScale: 1,
      riskScale: 1,
      mobilityPenaltyScale: 1,
      cornerReplyPenaltyScale: 1,
      passBonusScale: 1,
      parityScale: 1,
      lightweightEvalScale: 1,
    };
  }

  scoreLightweightOrderingEvaluation(state, perspectiveColor, empties, opponentMoveCount) {
    this.stats.orderingEvalCalls += 1;
    return this.moveOrderingEvaluator.evaluate(state, perspectiveColor, {
      empties,
      opponentMoveCount,
    });
  }

  scoreTranspositionForOrdering(entry, depthRemaining) {
    if (!entry || depthRemaining <= 1) {
      return 0;
    }

    const clampedValue = Math.max(-250_000, Math.min(250_000, -entry.value));
    const depthWeight = Math.max(1, Math.min(entry.depth, depthRemaining - 1));

    if (entry.flag === 'exact') {
      return (clampedValue * 8) + (depthWeight * 24_000) + 140_000;
    }
    if (entry.flag === 'upper') {
      return (clampedValue * 5) + (depthWeight * 12_000);
    }
    return (clampedValue * 3) + (depthWeight * 8_000);
  }

  getRegionParityOrderingBonus(moveIndex, empties, parityRegionInfo) {
    if (!parityRegionInfo || empties > REGION_PARITY_EMPTIES || parityRegionInfo.regionCount <= 1) {
      return 0;
    }

    const regionSize = parityRegionInfo.regionSizeByIndex[moveIndex] ?? 0;
    if (regionSize <= 0) {
      return 0;
    }

    const baseBonus = empties <= 10 ? 140_000 : 90_000;
    const oddRegion = regionSize % 2 === 1;
    let bonus = oddRegion
      ? baseBonus
      : -Math.round(baseBonus * 0.45);

    if (oddRegion && regionSize <= 3) {
      bonus += Math.round(baseBonus * 0.2);
    }
    if (!oddRegion && regionSize <= 2) {
      bonus -= Math.round(baseBonus * 0.1);
    }
    if (oddRegion && parityRegionInfo.oddRegionCount > 0 && parityRegionInfo.evenRegionCount > 0) {
      bonus += Math.round(baseBonus * 0.12);
    }

    return bonus;
  }

  orderMoves(state, moves, ply, depthRemaining, ttMoveIndex = null, bookWeights = null) {
    const empties = state.getEmptyCount();
    const shouldPrecomputeOutcome = ply <= 1
      || empties <= ORDERING_PROBE_EMPTIES;
    const parityRegionInfo = empties <= REGION_PARITY_EMPTIES
      ? buildParityRegionInfo(state.getEmptyBitboard())
      : null;

    const ordered = moves.map((move) => {
      const orderingOutcome = shouldPrecomputeOutcome
        ? state.applyMoveFast(move.index, move.flips ?? null)
        : null;
      return {
        ...move,
        ...(orderingOutcome ? { orderingOutcome } : {}),
        orderingScore: this.scoreMoveForOrdering(
          state,
          move,
          {
            ply,
            depthRemaining,
            ttMoveIndex,
            bookWeights,
            empties,
            orderingOutcome,
            parityRegionInfo,
          },
        ),
      };
    });

    ordered.sort((left, right) => right.orderingScore - left.orderingScore);
    return ordered;
  }

  scoreMoveForOrdering(state, move, context) {
    const {
      ply,
      depthRemaining,
      ttMoveIndex,
      bookWeights = null,
      empties,
      orderingOutcome = null,
      parityRegionInfo = null,
    } = context;

    let score = 0;
    const lateOrderingProfile = this.selectLateOrderingProfile(empties);

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
      score += Math.round(1_500_000 * lateOrderingProfile.killerPrimaryScale);
    } else if (this.killerMoves[ply]?.[1] === move.index) {
      score += Math.round(1_000_000 * lateOrderingProfile.killerSecondaryScale);
    }

    score += Math.round(this.historyHeuristic[colorIndex(state.currentPlayer)][move.index] * 50 * lateOrderingProfile.historyScale);
    score += Math.round(POSITIONAL_WEIGHTS[move.index] * 1000 * lateOrderingProfile.positionalScale);
    score += Math.round(move.flipCount * 30 * lateOrderingProfile.flipScale);

    const riskPenaltyScale = (this.options.riskPenaltyScale ?? 1) * lateOrderingProfile.riskScale;
    const riskType = getPositionalRisk(move.index);
    if (riskType === 'x-square') {
      score -= Math.round(150_000 * riskPenaltyScale);
    } else if (riskType === 'c-square') {
      score -= Math.round(80_000 * riskPenaltyScale);
    }

    let outcome = orderingOutcome;
    const shouldInspectChild = Boolean(outcome)
      || ply <= 1
      || empties <= ORDERING_PROBE_EMPTIES;

    if (shouldInspectChild && !outcome) {
      outcome = state.applyMoveFast(move.index, move.flips ?? null);
    }

    if (outcome) {
      const childState = outcome;
      const childTableEntry = this.lookupTransposition(childState);
      score += this.scoreTranspositionForOrdering(childTableEntry, depthRemaining);

      const childBoards = childState.getPlayerBoards();
      const opponentMovesBitboard = legalMovesBitboard(childBoards.player, childBoards.opponent);
      const opponentMoveCount = popcount(opponentMovesBitboard);
      const mobilityPenaltyBase = empties <= 14 ? 1800 : 1200;
      score -= opponentMoveCount * Math.round(
        mobilityPenaltyBase
        * (this.options.mobilityScale ?? 1)
        * lateOrderingProfile.mobilityPenaltyScale,
      );

      const opponentCornerReplies = countCornerMoves(opponentMovesBitboard);
      if (opponentCornerReplies > 0) {
        const cornerReplyPenaltyBase = empties <= 14 ? 320_000 : 220_000;
        score -= opponentCornerReplies * Math.round(
          cornerReplyPenaltyBase
          * (this.options.cornerAdjacencyScale ?? 1)
          * lateOrderingProfile.cornerReplyPenaltyScale,
        );
      }

      if (opponentMoveCount === 0) {
        score += Math.round((empties <= 12 ? 2_500_000 : 1_500_000) * lateOrderingProfile.passBonusScale);
      }

      if (empties <= REGION_PARITY_EMPTIES) {
        score += Math.round(
          this.getRegionParityOrderingBonus(move.index, empties, parityRegionInfo)
          * lateOrderingProfile.parityScale,
        );
      }

      if (this.shouldUseLightweightOrderingEvaluator(empties, depthRemaining)) {
        score += Math.round(
          this.scoreLightweightOrderingEvaluation(
            childState,
            state.currentPlayer,
            childState.getEmptyCount(),
            opponentMoveCount,
          )
          * lateOrderingProfile.lightweightEvalScale,
        );
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
