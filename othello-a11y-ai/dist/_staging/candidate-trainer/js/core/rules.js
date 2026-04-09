import {
  bitFromIndex,
  bitsToIndices,
  CORNER_BITS,
  DIRECTIONS,
  FULL_BOARD,
  indexFromBit,
  popcount,
  coordToIndex,
} from './bitboard.js';

export const PLAYER_COLORS = Object.freeze({
  BLACK: 'black',
  WHITE: 'white',
});

export function getInitialBoards() {
  const white = bitFromIndex(coordToIndex('D4')) | bitFromIndex(coordToIndex('E5'));
  const black = bitFromIndex(coordToIndex('E4')) | bitFromIndex(coordToIndex('D5'));
  return { black, white };
}

function growDirectionalTargets(player, opponent, shift) {
  let targets = shift(player) & opponent;
  for (let iteration = 0; iteration < 5; iteration += 1) {
    targets |= shift(targets) & opponent;
  }
  return targets;
}

export function legalMovesBitboard(player, opponent) {
  const empty = FULL_BOARD & ~(player | opponent);
  let moves = 0n;

  for (const { shift } of DIRECTIONS) {
    const targets = growDirectionalTargets(player, opponent, shift);
    moves |= shift(targets) & empty;
  }

  return moves & FULL_BOARD;
}

export function hasAnyLegalMove(player, opponent) {
  return legalMovesBitboard(player, opponent) !== 0n;
}

function collectDirectionalFlips(moveBit, player, opponent, shift) {
  let cursor = shift(moveBit) & opponent;
  let captured = 0n;

  while (cursor !== 0n) {
    captured |= cursor;
    const advanced = shift(cursor);
    if ((advanced & player) !== 0n) {
      return captured;
    }
    cursor = advanced & opponent;
  }

  return 0n;
}

export function computeFlips(moveBit, player, opponent) {
  if ((moveBit & (player | opponent)) !== 0n) {
    return 0n;
  }

  let flips = 0n;
  for (const { shift } of DIRECTIONS) {
    flips |= collectDirectionalFlips(moveBit, player, opponent, shift);
  }
  return flips;
}

export function isLegalMoveBit(moveBit, player, opponent) {
  return computeFlips(moveBit, player, opponent) !== 0n;
}

export function applyMoveBit(moveBit, player, opponent) {
  const flips = computeFlips(moveBit, player, opponent);
  if (flips === 0n) {
    return null;
  }

  const nextPlayerBoard = player | moveBit | flips;
  const nextOpponentBoard = opponent & ~flips;

  return {
    player: nextPlayerBoard,
    opponent: nextOpponentBoard,
    flips,
    flippedIndices: bitsToIndices(flips),
  };
}

export function applyMoveBitWithFlips(moveBit, flips, player, opponent) {
  if (flips === 0n || (moveBit & (player | opponent)) !== 0n) {
    return null;
  }

  return {
    player: player | moveBit | flips,
    opponent: opponent & ~flips,
    flips,
  };
}

function buildLegalMoveRecords(
  player,
  opponent,
  {
    includeFlippedIndices = false,
    includeCornerFlag = false,
  } = {},
) {
  const legalMoves = legalMovesBitboard(player, opponent);
  const details = [];

  let cursor = legalMoves;
  while (cursor !== 0n) {
    const moveBit = cursor & -cursor;
    cursor ^= moveBit;
    const index = indexFromBit(moveBit);
    const flips = computeFlips(moveBit, player, opponent);
    const detail = {
      index,
      bit: moveBit,
      flips,
      flipCount: popcount(flips),
    };

    if (includeFlippedIndices) {
      detail.flippedIndices = bitsToIndices(flips);
    }
    if (includeCornerFlag) {
      detail.isCorner = CORNER_BITS.includes(moveBit);
    }

    details.push(detail);
  }
  return details;
}

export function listLegalSearchMoves(player, opponent) {
  return buildLegalMoveRecords(player, opponent);
}

export function listLegalMoveDetails(player, opponent) {
  return buildLegalMoveRecords(player, opponent, {
    includeFlippedIndices: true,
    includeCornerFlag: true,
  });
}

export function getDiscCounts(black, white) {
  return {
    black: popcount(black),
    white: popcount(white),
  };
}

export function isTerminalPosition(black, white) {
  return !hasAnyLegalMove(black, white) && !hasAnyLegalMove(white, black);
}
