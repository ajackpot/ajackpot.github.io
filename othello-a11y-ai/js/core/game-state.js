import {
  bitFromIndex,
  bitsToIndices,
  coordToIndex,
  FULL_BOARD,
  indexToCoord,
  popcount,
} from './bitboard.js';
import {
  applyMoveBit,
  applyMoveBitWithFlips,
  getDiscCounts,
  getInitialBoards,
  isTerminalPosition,
  listLegalMoveDetails,
  listLegalSearchMoves,
  PLAYER_COLORS,
} from './rules.js';

const HASH_WHITE_SHIFT = 64n;
const HASH_PLAYER_SHIFT = 128n;
const HASH_WHITE_TO_MOVE_BIT = 1n << HASH_PLAYER_SHIFT;

export class GameState {
  constructor({
    black,
    white,
    currentPlayer = PLAYER_COLORS.BLACK,
    consecutivePasses = 0,
    ply = 1,
    moveHistory = [],
    lastAction = null,
  }) {
    this.black = black;
    this.white = white;
    this.currentPlayer = currentPlayer;
    this.consecutivePasses = consecutivePasses;
    this.ply = ply;
    this.moveHistory = moveHistory;
    this.lastAction = lastAction;

    this._emptyBitboard = undefined;
    this._emptyCount = undefined;
    this._discCounts = undefined;
    this._hashKey = undefined;
  }

  static initial() {
    const { black, white } = getInitialBoards();
    return new GameState({ black, white });
  }

  static fromSerializable(serialized) {
    return new GameState({
      black: BigInt(serialized.black),
      white: BigInt(serialized.white),
      currentPlayer: serialized.currentPlayer,
      consecutivePasses: serialized.consecutivePasses,
      ply: serialized.ply,
      moveHistory: serialized.moveHistory ?? [],
      lastAction: serialized.lastAction ?? null,
    });
  }

  toSerializable() {
    return {
      black: this.black.toString(),
      white: this.white.toString(),
      currentPlayer: this.currentPlayer,
      consecutivePasses: this.consecutivePasses,
      ply: this.ply,
      moveHistory: this.moveHistory,
      lastAction: this.lastAction,
    };
  }

  clone() {
    return new GameState({
      black: this.black,
      white: this.white,
      currentPlayer: this.currentPlayer,
      consecutivePasses: this.consecutivePasses,
      ply: this.ply,
      moveHistory: [...this.moveHistory],
      lastAction: this.lastAction ? { ...this.lastAction } : null,
    });
  }

  getPlayerBoards(color = this.currentPlayer) {
    if (color === PLAYER_COLORS.BLACK) {
      return {
        player: this.black,
        opponent: this.white,
      };
    }

    return {
      player: this.white,
      opponent: this.black,
    };
  }

  getOpponentColor(color = this.currentPlayer) {
    return color === PLAYER_COLORS.BLACK ? PLAYER_COLORS.WHITE : PLAYER_COLORS.BLACK;
  }

  getCellOccupant(index) {
    const bit = bitFromIndex(index);
    if ((this.black & bit) !== 0n) {
      return PLAYER_COLORS.BLACK;
    }
    if ((this.white & bit) !== 0n) {
      return PLAYER_COLORS.WHITE;
    }
    return null;
  }

  getLegalMoves(color = this.currentPlayer) {
    const { player, opponent } = this.getPlayerBoards(color);
    return listLegalMoveDetails(player, opponent).map((detail) => ({
      ...detail,
      coord: indexToCoord(detail.index),
      color,
    }));
  }

  getSearchMoves(color = this.currentPlayer) {
    const { player, opponent } = this.getPlayerBoards(color);
    return listLegalSearchMoves(player, opponent);
  }

  getLegalMoveIndices(color = this.currentPlayer) {
    return this.getLegalMoves(color).map((move) => move.index);
  }

  hasLegalMove(color = this.currentPlayer) {
    return this.getLegalMoves(color).length > 0;
  }

  isLegalMove(index, color = this.currentPlayer) {
    return this.getLegalMoveIndices(color).includes(index);
  }

  applyMove(index) {
    const moveBit = bitFromIndex(index);
    const color = this.currentPlayer;
    const opponentColor = this.getOpponentColor(color);
    const { player, opponent } = this.getPlayerBoards(color);
    const result = applyMoveBit(moveBit, player, opponent);

    if (!result) {
      return null;
    }

    const nextBlack = color === PLAYER_COLORS.BLACK ? result.player : result.opponent;
    const nextWhite = color === PLAYER_COLORS.WHITE ? result.player : result.opponent;
    const action = {
      type: 'move',
      color,
      coord: indexToCoord(index),
      index,
      bit: moveBit.toString(),
      flips: result.flips.toString(),
      flippedIndices: result.flippedIndices,
      flippedCoords: result.flippedIndices.map(indexToCoord),
      flipCount: result.flippedIndices.length,
    };

    return {
      move: action,
      state: new GameState({
        black: nextBlack,
        white: nextWhite,
        currentPlayer: opponentColor,
        consecutivePasses: 0,
        ply: this.ply + 1,
        moveHistory: [...this.moveHistory, action],
        lastAction: action,
      }),
    };
  }

  applyMoveFast(index, precomputedFlips = null) {
    const moveBit = bitFromIndex(index);
    const color = this.currentPlayer;
    const opponentColor = this.getOpponentColor(color);
    const { player, opponent } = this.getPlayerBoards(color);
    const result = precomputedFlips === null
      ? applyMoveBit(moveBit, player, opponent)
      : applyMoveBitWithFlips(moveBit, precomputedFlips, player, opponent);

    if (!result) {
      return null;
    }

    return new GameState({
      black: color === PLAYER_COLORS.BLACK ? result.player : result.opponent,
      white: color === PLAYER_COLORS.WHITE ? result.player : result.opponent,
      currentPlayer: opponentColor,
      consecutivePasses: 0,
      ply: this.ply + 1,
      moveHistory: this.moveHistory,
      lastAction: null,
    });
  }

  passTurn() {
    const action = {
      type: 'pass',
      color: this.currentPlayer,
    };

    return new GameState({
      black: this.black,
      white: this.white,
      currentPlayer: this.getOpponentColor(this.currentPlayer),
      consecutivePasses: this.consecutivePasses + 1,
      ply: this.ply + 1,
      moveHistory: [...this.moveHistory, action],
      lastAction: action,
    });
  }

  passTurnFast() {
    return new GameState({
      black: this.black,
      white: this.white,
      currentPlayer: this.getOpponentColor(this.currentPlayer),
      consecutivePasses: this.consecutivePasses + 1,
      ply: this.ply + 1,
      moveHistory: this.moveHistory,
      lastAction: null,
    });
  }

  getDiscCounts() {
    if (!this._discCounts) {
      this._discCounts = getDiscCounts(this.black, this.white);
    }
    return this._discCounts;
  }

  getDiscDifferential(color = this.currentPlayer) {
    const counts = this.getDiscCounts();
    return color === PLAYER_COLORS.BLACK
      ? counts.black - counts.white
      : counts.white - counts.black;
  }

  getEmptyBitboard() {
    if (this._emptyBitboard === undefined) {
      this._emptyBitboard = FULL_BOARD & ~(this.black | this.white);
    }
    return this._emptyBitboard;
  }

  getEmptyCount() {
    if (this._emptyCount === undefined) {
      this._emptyCount = popcount(this.getEmptyBitboard());
    }
    return this._emptyCount;
  }

  getOccupiedCount() {
    return 64 - this.getEmptyCount();
  }

  isTerminal() {
    return isTerminalPosition(this.black, this.white);
  }

  getWinner() {
    const counts = this.getDiscCounts();
    if (counts.black > counts.white) {
      return PLAYER_COLORS.BLACK;
    }
    if (counts.white > counts.black) {
      return PLAYER_COLORS.WHITE;
    }
    return 'draw';
  }

  hashKey() {
    if (this._hashKey === undefined) {
      this._hashKey = this.black
        | (this.white << HASH_WHITE_SHIFT)
        | (this.currentPlayer === PLAYER_COLORS.WHITE ? HASH_WHITE_TO_MOVE_BIT : 0n);
    }
    return this._hashKey;
  }
}

function tokenizeCompactMoveSequence(compactSequence) {
  const tokens = [];
  let cursor = 0;
  while (cursor < compactSequence.length) {
    const currentChar = compactSequence[cursor];
    if (/\s|[,;/|]/.test(currentChar)) {
      cursor += 1;
      continue;
    }

    const remaining = compactSequence.slice(cursor);
    const passMatch = /^(pass|패스)/i.exec(remaining);
    if (passMatch) {
      tokens.push(passMatch[1]);
      cursor += passMatch[0].length;
      continue;
    }

    const coordMatch = /^[a-h][1-8]/i.exec(remaining);
    if (coordMatch) {
      tokens.push(coordMatch[0]);
      cursor += coordMatch[0].length;
      continue;
    }

    throw new Error(`Could not parse the move sequence near "${remaining.slice(0, 8)}".`);
  }

  return tokens;
}

function normalizeMoveToken(token) {
  if (typeof token !== 'string') {
    throw new Error('Move sequence entries must be coordinate strings.');
  }

  const trimmed = token.trim();
  if (!trimmed) {
    throw new Error('Move sequence contains an empty token.');
  }

  if (/^(pass|패스)$/i.test(trimmed)) {
    return 'pass';
  }

  const coord = trimmed.toUpperCase();
  if (coordToIndex(coord) < 0) {
    throw new Error(`Invalid coordinate: ${token}`);
  }
  return coord;
}

function normalizeMoveSequenceInput(sequence) {
  if (Array.isArray(sequence)) {
    return sequence.map(normalizeMoveToken);
  }

  if (typeof sequence !== 'string') {
    throw new Error('Move sequence must be a string or an array of coordinate strings.');
  }

  const trimmed = sequence.trim();
  if (!trimmed) {
    return [];
  }

  const rawTokens = /[\s,;/|]/.test(trimmed)
    ? trimmed.split(/[\s,;/|]+/).filter(Boolean)
    : tokenizeCompactMoveSequence(trimmed);

  return rawTokens.map(normalizeMoveToken);
}

export function createStateHistoryFromMoveSequence(sequence) {
  const moves = normalizeMoveSequenceInput(sequence);
  let state = GameState.initial();
  const history = [state];

  for (let stepIndex = 0; stepIndex < moves.length; stepIndex += 1) {
    const move = moves[stepIndex];

    if (state.isTerminal()) {
      throw new Error(`Cannot apply step ${stepIndex + 1} (${move}) because the game is already over.`);
    }

    if (move === 'pass') {
      const legalMoves = state.getLegalMoves();
      if (legalMoves.length > 0) {
        throw new Error(`Illegal pass at step ${stepIndex + 1}; legal moves are ${legalMoves.map((candidate) => candidate.coord).join(', ')}.`);
      }

      state = state.passTurn();
      history.push(state);
      continue;
    }

    const index = coordToIndex(move);
    const outcome = state.applyMove(index);
    if (!outcome) {
      throw new Error(`Illegal move at step ${stepIndex + 1}: ${move}`);
    }

    state = outcome.state;
    history.push(state);
  }

  return history;
}

export function createStateFromMoveSequence(sequence) {
  const history = createStateHistoryFromMoveSequence(sequence);
  return history[history.length - 1];
}

function coerceBitboard(value, label) {
  let bitboard;
  try {
    bitboard = typeof value === 'bigint' ? value : BigInt(value);
  } catch (error) {
    throw new Error(`${label} bitboard must be coercible to BigInt.`);
  }

  if (bitboard < 0n) {
    throw new Error(`${label} bitboard cannot be negative.`);
  }
  if ((bitboard & ~FULL_BOARD) !== 0n) {
    throw new Error(`${label} bitboard contains squares outside the 8×8 board.`);
  }

  return bitboard;
}

function validateCurrentPlayer(currentPlayer) {
  if (currentPlayer !== PLAYER_COLORS.BLACK && currentPlayer !== PLAYER_COLORS.WHITE) {
    throw new Error(`Invalid current player: ${currentPlayer}`);
  }
}

export function createStateFromBitboards({
  black,
  white,
  currentPlayer = PLAYER_COLORS.BLACK,
  consecutivePasses = 0,
  ply = 1,
  moveHistory = [],
  lastAction = null,
}) {
  const normalizedBlack = coerceBitboard(black, 'Black');
  const normalizedWhite = coerceBitboard(white, 'White');
  validateCurrentPlayer(currentPlayer);

  if ((normalizedBlack & normalizedWhite) !== 0n) {
    throw new Error('Black and white bitboards overlap.');
  }

  return new GameState({
    black: normalizedBlack,
    white: normalizedWhite,
    currentPlayer,
    consecutivePasses,
    ply,
    moveHistory: [...moveHistory],
    lastAction,
  });
}

export function describeMoveHistory(state) {
  return state.moveHistory.map((action) => {
    if (action.type === 'pass') {
      return `${action.color}: pass`;
    }

    return `${action.color}: ${action.coord} (${action.flippedCoords.join(', ') || 'no flips'})`;
  });
}

export function getOccupiedIndices(state) {
  return {
    black: bitsToIndices(state.black),
    white: bitsToIndices(state.white),
  };
}
