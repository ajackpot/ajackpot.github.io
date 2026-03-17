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
  getDiscCounts,
  getInitialBoards,
  isTerminalPosition,
  listLegalMoveDetails,
  PLAYER_COLORS,
} from './rules.js';

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

  getDiscCounts() {
    return getDiscCounts(this.black, this.white);
  }

  getDiscDifferential(color = this.currentPlayer) {
    const counts = this.getDiscCounts();
    return color === PLAYER_COLORS.BLACK
      ? counts.black - counts.white
      : counts.white - counts.black;
  }

  getEmptyBitboard() {
    return FULL_BOARD & ~(this.black | this.white);
  }

  getEmptyCount() {
    return popcount(this.getEmptyBitboard());
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
    return `${this.black.toString(16)}/${this.white.toString(16)}/${this.currentPlayer}`;
  }
}

export function createStateFromMoveSequence(sequence) {
  let state = GameState.initial();
  for (const move of sequence) {
    if (typeof move !== 'string') {
      throw new Error('Move sequence entries must be coordinate strings.');
    }

    if (move.toLowerCase() === 'pass') {
      state = state.passTurn();
      continue;
    }

    const index = coordToIndex(move);
    if (index < 0) {
      throw new Error(`Invalid coordinate: ${move}`);
    }

    const outcome = state.applyMove(index);
    if (!outcome) {
      throw new Error(`Illegal move in sequence: ${move}`);
    }
    state = outcome.state;
  }
  return state;
}

export function createStateFromBitboards({ black, white, currentPlayer = PLAYER_COLORS.BLACK }) {
  return new GameState({
    black: typeof black === 'bigint' ? black : BigInt(black),
    white: typeof white === 'bigint' ? white : BigInt(white),
    currentPlayer,
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
