import {
  bitFromIndex,
  clamp,
  CORNER_INDICES,
  C_SQUARE_INDICES,
  DIRECTIONS,
  FULL_BOARD,
  neighbors,
  popcount,
  POSITIONAL_WEIGHTS,
  X_SQUARE_INDICES,
  FILE_A,
  FILE_H,
  RANK_1,
  RANK_8,
  indexToCoord,
  lerp,
} from '../core/bitboard.js';
import { legalMovesBitboard, PLAYER_COLORS } from '../core/rules.js';

const DEFAULT_EVALUATION_OPTIONS = Object.freeze({
  mobilityScale: 1,
  stabilityScale: 1,
  frontierScale: 1,
  positionalScale: 1,
});

const CORNER_ADJACENCY_GROUPS = Object.freeze([
  { corner: 0, adjacent: [1, 8, 9] },
  { corner: 7, adjacent: [6, 14, 15] },
  { corner: 56, adjacent: [48, 49, 57] },
  { corner: 63, adjacent: [54, 55, 62] },
]);

const EDGE_GROUPS = Object.freeze([
  { indices: [0, 1, 2, 3, 4, 5, 6, 7], mask: RANK_1 },
  { indices: [56, 57, 58, 59, 60, 61, 62, 63], mask: RANK_8 },
  { indices: [0, 8, 16, 24, 32, 40, 48, 56], mask: FILE_A },
  { indices: [7, 15, 23, 31, 39, 47, 55, 63], mask: FILE_H },
]);

function normalizeDifference(left, right) {
  const total = left + right;
  if (total === 0) {
    return 0;
  }
  return ((left - right) * 100) / total;
}

function countBitsInIndices(bitboard, indices) {
  let count = 0;
  for (const index of indices) {
    if ((bitboard & bitFromIndex(index)) !== 0n) {
      count += 1;
    }
  }
  return count;
}

function positionalScore(player, opponent) {
  let score = 0;
  for (let index = 0; index < 64; index += 1) {
    const bit = bitFromIndex(index);
    if ((player & bit) !== 0n) {
      score += POSITIONAL_WEIGHTS[index];
    } else if ((opponent & bit) !== 0n) {
      score -= POSITIONAL_WEIGHTS[index];
    }
  }
  return score;
}

function frontierScore(player, opponent, empty) {
  const frontierMask = neighbors(empty);
  const myFrontier = popcount(frontierMask & player);
  const oppFrontier = popcount(frontierMask & opponent);
  return normalizeDifference(oppFrontier, myFrontier);
}

function potentialMobilityScore(player, opponent, empty) {
  const myPotential = popcount(neighbors(opponent) & empty);
  const oppPotential = popcount(neighbors(player) & empty);
  return normalizeDifference(myPotential, oppPotential);
}

function actualMobilityScore(player, opponent) {
  const myMoves = popcount(legalMovesBitboard(player, opponent));
  const oppMoves = popcount(legalMovesBitboard(opponent, player));
  return normalizeDifference(myMoves, oppMoves);
}

function cornerScore(player, opponent) {
  const myCorners = countBitsInIndices(player, CORNER_INDICES);
  const oppCorners = countBitsInIndices(opponent, CORNER_INDICES);
  return normalizeDifference(myCorners, oppCorners);
}

function cornerAdjacencyScore(player, opponent) {
  let myPenalty = 0;
  let oppPenalty = 0;

  for (const group of CORNER_ADJACENCY_GROUPS) {
    const cornerBit = bitFromIndex(group.corner);
    if ((player & cornerBit) !== 0n || (opponent & cornerBit) !== 0n) {
      continue;
    }

    myPenalty += countBitsInIndices(player, group.adjacent);
    oppPenalty += countBitsInIndices(opponent, group.adjacent);
  }

  return normalizeDifference(oppPenalty, myPenalty);
}

function anchoredEdgeFromCorner(player, cornerIndex, step) {
  let stable = 0n;
  let index = cornerIndex;
  while (index >= 0 && index < 64) {
    const bit = bitFromIndex(index);
    if ((player & bit) === 0n) {
      break;
    }
    stable |= bit;
    index += step;
  }
  return stable;
}

function approximateStableDiscs(player, opponent) {
  let stable = 0n;

  if ((player & bitFromIndex(0)) !== 0n) {
    stable |= anchoredEdgeFromCorner(player, 0, 1);
    stable |= anchoredEdgeFromCorner(player, 0, 8);
  }
  if ((player & bitFromIndex(7)) !== 0n) {
    stable |= anchoredEdgeFromCorner(player, 7, -1);
    stable |= anchoredEdgeFromCorner(player, 7, 8);
  }
  if ((player & bitFromIndex(56)) !== 0n) {
    stable |= anchoredEdgeFromCorner(player, 56, 1);
    stable |= anchoredEdgeFromCorner(player, 56, -8);
  }
  if ((player & bitFromIndex(63)) !== 0n) {
    stable |= anchoredEdgeFromCorner(player, 63, -1);
    stable |= anchoredEdgeFromCorner(player, 63, -8);
  }

  for (const edge of EDGE_GROUPS) {
    const occupiedOnEdge = (player | opponent) & edge.mask;
    if (occupiedOnEdge !== edge.mask) {
      continue;
    }

    const firstBit = bitFromIndex(edge.indices[0]);
    const lastBit = bitFromIndex(edge.indices[edge.indices.length - 1]);
    if ((player & firstBit) !== 0n && (player & lastBit) !== 0n) {
      stable |= player & edge.mask;
    }
  }

  return stable;
}

function stabilityScore(player, opponent) {
  const myStable = popcount(approximateStableDiscs(player, opponent));
  const oppStable = popcount(approximateStableDiscs(opponent, player));
  return normalizeDifference(myStable, oppStable);
}

function discDifferentialScore(player, opponent) {
  return normalizeDifference(popcount(player), popcount(opponent));
}

function parityScore(state) {
  const empties = state.getEmptyCount();
  if (empties === 0) {
    return 0;
  }
  return empties % 2 === 1 ? 100 : -100;
}

export class Evaluator {
  constructor(options = {}) {
    this.options = {
      ...DEFAULT_EVALUATION_OPTIONS,
      ...options,
    };
  }

  evaluate(state, color = state.currentPlayer) {
    const perspectiveBoards = color === PLAYER_COLORS.BLACK
      ? { player: state.black, opponent: state.white }
      : { player: state.white, opponent: state.black };

    const { player, opponent } = perspectiveBoards;
    const empty = FULL_BOARD & ~(player | opponent);
    const empties = state.getEmptyCount();
    const phase = clamp((64 - empties) / 64, 0, 1);

    const mobility = actualMobilityScore(player, opponent);
    const potentialMobility = potentialMobilityScore(player, opponent, empty);
    const corners = cornerScore(player, opponent);
    const cornerAdjacency = cornerAdjacencyScore(player, opponent);
    const frontier = frontierScore(player, opponent, empty);
    const positional = positionalScore(player, opponent);
    const stability = stabilityScore(player, opponent);
    const discDiff = discDifferentialScore(player, opponent);
    const parity = parityScore(state);

    const mobilityWeight = lerp(135, 35, phase) * this.options.mobilityScale;
    const potentialMobilityWeight = lerp(55, 12, phase);
    const cornersWeight = 850;
    const cornerAdjacencyWeight = lerp(300, 90, phase);
    const frontierWeight = lerp(80, 20, phase) * this.options.frontierScale;
    const positionalWeight = lerp(14, 8, phase) * this.options.positionalScale;
    const stabilityWeight = lerp(120, 320, phase) * this.options.stabilityScale;
    const parityWeight = empties <= 14 ? lerp(25, 80, 1 - (empties / 14)) : 0;
    const discWeight = empties <= 18 ? lerp(12, 120, 1 - (empties / 18)) : 0;

    const weighted = (
      (mobility * mobilityWeight)
      + (potentialMobility * potentialMobilityWeight)
      + (corners * cornersWeight)
      + (cornerAdjacency * cornerAdjacencyWeight)
      + (frontier * frontierWeight)
      + (positional * positionalWeight)
      + (stability * stabilityWeight)
      + (discDiff * discWeight)
      + (parity * parityWeight)
    );

    return Math.round(weighted);
  }

  evaluateTerminal(state, color = state.currentPlayer) {
    const differential = state.getDiscDifferential(color);
    return differential * 10000;
  }

  explainFeatures(state, color = state.currentPlayer) {
    const perspectiveBoards = color === PLAYER_COLORS.BLACK
      ? { player: state.black, opponent: state.white }
      : { player: state.white, opponent: state.black };
    const { player, opponent } = perspectiveBoards;
    const empty = FULL_BOARD & ~(player | opponent);

    return {
      mobility: actualMobilityScore(player, opponent),
      potentialMobility: potentialMobilityScore(player, opponent, empty),
      corners: cornerScore(player, opponent),
      cornerAdjacency: cornerAdjacencyScore(player, opponent),
      frontier: frontierScore(player, opponent, empty),
      positional: positionalScore(player, opponent),
      stability: stabilityScore(player, opponent),
      discDifferential: discDifferentialScore(player, opponent),
      parity: parityScore(state),
      currentPlayer: color,
      legalMoves: bitsToCoords(legalMovesBitboard(player, opponent)),
    };
  }
}

function bitsToCoords(bitboard) {
  const coords = [];
  let cursor = bitboard;
  while (cursor !== 0n) {
    const leastSignificantBit = cursor & -cursor;
    let index = 0;
    let shifted = leastSignificantBit;
    while (shifted > 1n) {
      shifted >>= 1n;
      index += 1;
    }
    coords.push(indexToCoord(index));
    cursor ^= leastSignificantBit;
  }
  return coords;
}

export function getPositionalRisk(index) {
  if (CORNER_INDICES.includes(index)) {
    return 'corner';
  }
  if (X_SQUARE_INDICES.includes(index)) {
    return 'x-square';
  }
  if (C_SQUARE_INDICES.includes(index)) {
    return 'c-square';
  }
  return 'normal';
}
