import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import { GameState } from '../../../js/core/game-state.js';
import { indexToCoord } from '../../../js/core/bitboard.js';
import { PLAYER_COLORS } from '../../../js/core/rules.js';

// Derived from trineutron/othello/scripts/main.js (MIT License).
// Original repository: https://github.com/trineutron/othello

const BLACK = 1;
const WHITE = -1;
const EMPTY = 0;
const WALL = 2;
const END = 0;
const DIRECTIONS = Object.freeze([-10, -9, -8, -1, 1, 8, 9, 10]);
const LEAF_SCORE_MIN = -64_000;
const LEAF_SCORE_MAX = 64_000;

function colorToToken(color) {
  return color === PLAYER_COLORS.BLACK ? BLACK : WHITE;
}

function tokenToColor(token) {
  return token === BLACK ? PLAYER_COLORS.BLACK : PLAYER_COLORS.WHITE;
}

function opponent(color) {
  return color === BLACK ? WHITE : BLACK;
}

function getColor(board) {
  return board[91];
}

function setColor(board, color) {
  board[91] = color;
}

function changeColor(board) {
  board[91] = opponent(board[91]);
}

function addStone(board, color) {
  if (color === BLACK) {
    board[92] += 1;
  } else {
    board[93] += 1;
  }
}

function flipStone(board, color) {
  if (color === BLACK) {
    board[92] += 1;
    board[93] -= 1;
  } else {
    board[93] += 1;
    board[92] -= 1;
  }
}

function makeSeededRandom(seed = 0x12345678) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function gauss(random) {
  let r0 = random();
  const r1 = random();
  if (r0 <= Number.EPSILON) {
    r0 = Number.EPSILON;
  }
  return Math.sqrt(-2.0 * Math.log(r0)) * Math.sin(2 * Math.PI * r1);
}

function createEmptyBoardArray() {
  const board = [];
  for (let index = 0; index < 91; index += 1) {
    if (index < 10 || index > 80 || index % 9 === 0) {
      board.push(WALL);
    } else {
      board.push(EMPTY);
    }
  }
  board.push(BLACK, 2, 2);
  return board;
}

function othelloIndexToPadded(index) {
  const row = Math.floor(index / 8);
  const col = index % 8;
  return 10 + (row * 9) + col;
}

function paddedIndexToOthello(index) {
  const row = Math.floor((index - 10) / 9);
  const col = (index - 10) % 9;
  return (row * 8) + col;
}

function stateToBoard(state) {
  assert.ok(state instanceof GameState, 'stateToBoard expects a GameState instance.');
  const board = createEmptyBoardArray();
  const counts = state.getDiscCounts();

  for (let index = 0; index < 64; index += 1) {
    const padded = othelloIndexToPadded(index);
    const occupant = state.getCellOccupant(index);
    if (occupant === PLAYER_COLORS.BLACK) {
      board[padded] = BLACK;
    } else if (occupant === PLAYER_COLORS.WHITE) {
      board[padded] = WHITE;
    }
  }

  board[91] = state.isTerminal() ? END : colorToToken(state.currentPlayer);
  board[92] = counts.black;
  board[93] = counts.white;
  return board;
}

function listMovable(board) {
  const movable = [];
  const color = getColor(board);
  const oppColor = opponent(color);

  for (let index = 10; index <= 80; index += 1) {
    if (board[index] !== EMPTY) {
      continue;
    }

    for (const direction of DIRECTIONS) {
      let next = index + direction;
      if (board[next] !== oppColor) {
        continue;
      }
      next += direction;
      while (board[next] === oppColor) {
        next += direction;
      }
      if (board[next] === color) {
        movable.push(index);
        break;
      }
    }
  }

  return movable;
}

function existsMovable(board) {
  const color = getColor(board);
  const oppColor = opponent(color);

  for (let index = 10; index <= 80; index += 1) {
    if (board[index] !== EMPTY) {
      continue;
    }

    for (const direction of DIRECTIONS) {
      let next = index + direction;
      if (board[next] !== oppColor) {
        continue;
      }
      next += direction;
      while (board[next] === oppColor) {
        next += direction;
      }
      if (board[next] === color) {
        return true;
      }
    }
  }

  return false;
}

function afterMove(oldBoard, index) {
  const newBoard = oldBoard.slice();
  const color = getColor(oldBoard);
  const oppColor = opponent(color);

  for (const direction of DIRECTIONS) {
    let next = index + direction;
    if (newBoard[next] !== oppColor) {
      continue;
    }
    next += direction;
    while (newBoard[next] === oppColor) {
      next += direction;
    }
    if (newBoard[next] === color) {
      next -= direction;
      while (newBoard[next] === oppColor) {
        newBoard[next] = color;
        flipStone(newBoard, color);
        next -= direction;
      }
    }
  }

  newBoard[index] = color;
  addStone(newBoard, color);
  changeColor(newBoard);
  return newBoard;
}

function evalBoard(board, random, noiseScale = 4) {
  let score = 0;
  if (getColor(board) === END) {
    score = board[92] - board[93];
    if (score > 0) {
      score = 64 - (2 * board[93]);
    } else if (score < 0) {
      score = (2 * board[92]) - 64;
    }
    return 1000 * score;
  }

  if (noiseScale !== 0) {
    score = noiseScale * gauss(random);
  }

  // Frontier-ish pressure from the original implementation.
  for (let index = 20; index <= 70; index += 1) {
    if ((index + 1) % 9 < 3 || board[index] === EMPTY) {
      continue;
    }
    for (const direction of DIRECTIONS) {
      if (board[index + direction] === EMPTY) {
        score -= board[index];
      }
    }
  }

  const corners = [10, 17, 73, 80];
  for (let left = 0; left < corners.length; left += 1) {
    for (let right = left + 1; right < corners.length; right += 1) {
      const direction = (corners[right] - corners[left]) / 7;
      if (left + right === 3) {
        if (board[corners[left]] === EMPTY) {
          score -= 6 * board[corners[left] + direction];
        }
        if (board[corners[right]] === EMPTY) {
          score -= 6 * board[corners[right] - direction];
        }
        continue;
      }

      let value = 0;
      for (let offset = 2; offset < 6; offset += 1) {
        if (board[corners[left] + (offset * direction)] === EMPTY) {
          value -= 2;
        }
      }
      if (board[corners[left]] === EMPTY) {
        score += value * board[corners[left] + direction];
      }
      if (board[corners[right]] === EMPTY) {
        score += value * board[corners[right] - direction];
      }

      let noEmpty = true;
      let adjust = 0;
      for (let offset = 0; offset < 8; offset += 1) {
        const token = board[corners[left] + (offset * direction)];
        if (token === EMPTY) {
          noEmpty = false;
          break;
        }
        adjust += token;
      }

      const edge = board[corners[left]] + board[corners[right]];
      if (noEmpty) {
        score += adjust;
      } else if (edge > 0) {
        score += 8;
      } else if (edge < 0) {
        score -= 8;
      }
    }
  }

  return score;
}

function search(
  board,
  depth,
  prevColor,
  alpha,
  beta,
  timeoutAt,
  random,
  noiseScale,
  stats,
  pass = false,
) {
  const color = getColor(board);
  let score = -beta;

  if (depth <= 0 || color === END) {
    stats.leafEvals += 1;
    score = evalBoard(board, random, noiseScale);
    if (prevColor === WHITE) {
      score *= -1;
    }
    return score;
  }

  if (depth >= 4 && performance.now() > timeoutAt) {
    stats.timeouts += 1;
    return null;
  }

  stats.nodes += 1;

  let movable = listMovable(board);
  if (movable.length === 0) {
    const newBoard = board.slice();
    if (pass) {
      setColor(newBoard, END);
    } else {
      changeColor(newBoard);
    }
    const passScore = search(
      newBoard,
      depth,
      color,
      -beta,
      -alpha,
      timeoutAt,
      random,
      noiseScale,
      stats,
      true,
    );
    return passScore === null ? null : -passScore;
  }

  if (movable.length === 1) {
    const childBoard = afterMove(board, movable[0]);
    const childScore = search(
      childBoard,
      depth,
      color,
      -beta,
      -alpha,
      timeoutAt,
      random,
      noiseScale,
      stats,
    );
    return childScore === null ? null : -childScore;
  }

  if (depth > 3) {
    const scores = [];
    for (const move of movable) {
      stats.orderingLeafSearches += 1;
      const orderingScore = search(
        afterMove(board, move),
        0,
        color,
        LEAF_SCORE_MIN,
        LEAF_SCORE_MAX,
        timeoutAt,
        random,
        noiseScale,
        stats,
      );
      if (orderingScore === null) {
        return null;
      }
      scores[move] = orderingScore;
    }
    movable.sort((left, right) => scores[right] - scores[left]);
  }

  for (let moveIndex = 0; moveIndex < movable.length; moveIndex += 1) {
    const move = movable[moveIndex];
    const childBoard = afterMove(board, move);
    let newAlpha = -beta;
    let newBeta = newAlpha + 1;
    if (moveIndex === 0) {
      newBeta = -alpha;
    }

    let childScore = search(
      childBoard,
      depth - 1,
      color,
      newAlpha,
      newBeta,
      timeoutAt,
      random,
      noiseScale,
      stats,
    );
    if (childScore === null) {
      return null;
    }

    while (childScore > score) {
      score = childScore;
      beta = -score;
      if (moveIndex === 0 || alpha >= beta || score < newBeta) {
        break;
      }
      newAlpha = -beta;
      newBeta = -alpha;
      childScore = search(
        childBoard,
        depth - 1,
        color,
        newAlpha,
        newBeta,
        timeoutAt,
        random,
        noiseScale,
        stats,
      );
      if (childScore === null) {
        return null;
      }
    }

    if (alpha >= beta) {
      break;
    }
  }

  return -score;
}

function buildFallbackResult(state, legalMoves, board, options, stats, startedAt, analyzedMoves = []) {
  const move = legalMoves[0] ?? null;
  return {
    bestMoveIndex: move?.index ?? null,
    bestMoveCoord: move?.coord ?? null,
    score: move ? evalBoard(afterMove(board, othelloIndexToPadded(move.index)), makeSeededRandom(options.seed), options.noiseScale) : 0,
    principalVariation: move ? [move.index] : [],
    analyzedMoves,
    didPass: false,
    stats: {
      nodes: stats.nodes,
      leafEvals: stats.leafEvals,
      orderingLeafSearches: stats.orderingLeafSearches,
      timeouts: stats.timeouts,
      completedDepth: 0,
      elapsedMs: Math.round(performance.now() - startedAt),
    },
    options: {
      engine: 'trineutron',
      timeLimitMs: options.timeLimitMs,
      maxDepth: options.maxDepth,
      noiseScale: options.noiseScale,
      seed: options.seed,
    },
    source: 'trineutron',
    searchMode: 'depth-limited',
    searchCompletion: 'heuristic-fallback',
    isExactResult: false,
    isWldResult: false,
    rootEmptyCount: state.getEmptyCount(),
  };
}

export class TrineutronEngine {
  constructor(options = {}) {
    this.options = {
      timeLimitMs: 1000,
      maxDepth: 60,
      noiseScale: 4,
      seed: 0x12345678,
      ...options,
    };
  }

  updateOptions(options = {}) {
    this.options = {
      ...this.options,
      ...options,
    };
  }

  findBestMove(state, overrides = {}) {
    assert.ok(state instanceof GameState, 'TrineutronEngine.findBestMove expects a GameState instance.');
    if (overrides && Object.keys(overrides).length > 0) {
      this.updateOptions(overrides);
    }

    const options = { ...this.options };
    const legalMoves = state.getLegalMoves();
    if (legalMoves.length === 0) {
      return {
        bestMoveIndex: null,
        bestMoveCoord: null,
        score: 0,
        principalVariation: [],
        analyzedMoves: [],
        didPass: !state.isTerminal(),
        stats: {
          nodes: 0,
          leafEvals: 0,
          orderingLeafSearches: 0,
          timeouts: 0,
          completedDepth: 0,
          elapsedMs: 0,
        },
        options: {
          engine: 'trineutron',
          timeLimitMs: options.timeLimitMs,
          maxDepth: options.maxDepth,
          noiseScale: options.noiseScale,
          seed: options.seed,
        },
        source: 'trineutron',
        searchMode: state.isTerminal() ? 'terminal' : 'forced-pass',
        searchCompletion: 'complete',
        isExactResult: false,
        isWldResult: false,
        rootEmptyCount: state.getEmptyCount(),
      };
    }

    const board = stateToBoard(state);
    const color = getColor(board);
    const startedAt = performance.now();
    const timeoutAt = startedAt + Math.max(1, Number(options.timeLimitMs) || 1);
    const random = makeSeededRandom(options.seed);
    const stats = {
      nodes: 0,
      leafEvals: 0,
      orderingLeafSearches: 0,
      timeouts: 0,
    };

    const movable = legalMoves.map((move) => othelloIndexToPadded(move.index));
    const childBoards = [];
    const orderingScores = [];
    for (const move of movable) {
      const childBoard = afterMove(board, move);
      childBoards[move] = childBoard;
      orderingScores[move] = search(
        childBoard,
        0,
        color,
        LEAF_SCORE_MIN,
        LEAF_SCORE_MAX,
        timeoutAt,
        random,
        options.noiseScale,
        stats,
      );
    }
    movable.sort((left, right) => orderingScores[right] - orderingScores[left]);

    let lastCompleted = null;
    let fallbackAnalyzedMoves = movable.map((move) => ({
      index: paddedIndexToOthello(move),
      coord: indexToCoord(paddedIndexToOthello(move)),
      score: orderingScores[move],
      principalVariation: [paddedIndexToOthello(move)],
    }));

    for (let depth = 1; depth <= Math.max(1, Math.min(60, Number(options.maxDepth) || 60)); depth += 1) {
      let bestMove = null;
      let bestScore = -65_000;
      const analyzedMoves = [];

      for (let moveIndex = 0; moveIndex < movable.length; moveIndex += 1) {
        const move = movable[moveIndex];
        const childBoard = childBoards[move];
        let score;
        if (moveIndex === 0) {
          score = search(
            childBoard,
            depth - 1,
            color,
            LEAF_SCORE_MIN,
            LEAF_SCORE_MAX,
            timeoutAt,
            random,
            options.noiseScale,
            stats,
          );
        } else {
          score = search(
            childBoard,
            depth - 1,
            color,
            bestScore,
            bestScore + 1,
            timeoutAt,
            random,
            options.noiseScale,
            stats,
          );
          if (score !== null && score >= bestScore + 1) {
            score = search(
              childBoard,
              depth - 1,
              color,
              score,
              LEAF_SCORE_MAX,
              timeoutAt,
              random,
              options.noiseScale,
              stats,
            );
          }
        }

        if (score === null) {
          if (lastCompleted) {
            return {
              ...lastCompleted,
              stats: {
                ...lastCompleted.stats,
                nodes: stats.nodes,
                leafEvals: stats.leafEvals,
                orderingLeafSearches: stats.orderingLeafSearches,
                timeouts: stats.timeouts,
                elapsedMs: Math.round(performance.now() - startedAt),
              },
              searchCompletion: 'partial-timeout',
            };
          }
          return buildFallbackResult(state, legalMoves, board, options, stats, startedAt, fallbackAnalyzedMoves);
        }

        const othelloIndex = paddedIndexToOthello(move);
        analyzedMoves.push({
          index: othelloIndex,
          coord: indexToCoord(othelloIndex),
          score,
          principalVariation: [othelloIndex],
        });
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }

      fallbackAnalyzedMoves = analyzedMoves
        .map((entry) => ({ ...entry, principalVariation: [...entry.principalVariation] }))
        .sort((left, right) => right.score - left.score);
      lastCompleted = {
        bestMoveIndex: paddedIndexToOthello(bestMove),
        bestMoveCoord: indexToCoord(paddedIndexToOthello(bestMove)),
        score: bestScore,
        principalVariation: [paddedIndexToOthello(bestMove)],
        analyzedMoves: fallbackAnalyzedMoves,
        didPass: false,
        stats: {
          nodes: stats.nodes,
          leafEvals: stats.leafEvals,
          orderingLeafSearches: stats.orderingLeafSearches,
          timeouts: stats.timeouts,
          completedDepth: depth,
          elapsedMs: Math.round(performance.now() - startedAt),
        },
        options: {
          engine: 'trineutron',
          timeLimitMs: options.timeLimitMs,
          maxDepth: options.maxDepth,
          noiseScale: options.noiseScale,
          seed: options.seed,
        },
        source: 'trineutron',
        searchMode: 'depth-limited',
        searchCompletion: 'complete',
        isExactResult: false,
        isWldResult: false,
        rootEmptyCount: state.getEmptyCount(),
      };
    }

    return lastCompleted ?? buildFallbackResult(state, legalMoves, board, options, stats, startedAt, fallbackAnalyzedMoves);
  }
}

export default TrineutronEngine;
export { stateToBoard, listMovable, existsMovable, afterMove, evalBoard, makeSeededRandom };
