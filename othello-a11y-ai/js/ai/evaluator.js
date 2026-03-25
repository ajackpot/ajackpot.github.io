import {
  bitFromIndex,
  clamp,
  connectedRegions,
  CORNER_INDICES,
  C_SQUARE_INDICES,
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
  indexToRowCol,
  lerp,
  rowColToIndex,
} from '../core/bitboard.js';
import { legalMovesBitboard, PLAYER_COLORS } from '../core/rules.js';

const INDEX_BITS = Object.freeze(Array.from({ length: 64 }, (_, index) => bitFromIndex(index)));
const POWERS_OF_THREE = Object.freeze(Array.from({ length: 10 }, (_, exponent) => 3 ** exponent));

const DEFAULT_EVALUATION_OPTIONS = Object.freeze({
  mobilityScale: 1,
  potentialMobilityScale: 1,
  cornerScale: 1,
  cornerAdjacencyScale: 1,
  stabilityScale: 1,
  frontierScale: 1,
  positionalScale: 1,
  edgePatternScale: 1,
  cornerPatternScale: 1,
  parityScale: 1,
  discScale: 1,
});

const ORDERING_TRAINED_WEIGHT_BUCKETS = Object.freeze([
  Object.freeze({
    minEmpties: 9,
    maxEmpties: 10,
    weights: Object.freeze({
      mobility: 10_000,
      corners: 0,
      cornerAdjacency: -5_000,
      edgePattern: 0,
      cornerPattern: 0,
      discDifferential: 0,
      parity: 0,
    }),
  }),
  Object.freeze({
    minEmpties: 11,
    maxEmpties: 12,
    weights: Object.freeze({
      mobility: 5_000,
      corners: 0,
      cornerAdjacency: -5_000,
      edgePattern: -5_000,
      cornerPattern: 0,
      discDifferential: 0,
      parity: 0,
    }),
  }),
  Object.freeze({
    minEmpties: 13,
    maxEmpties: 14,
    weights: Object.freeze({
      mobility: 2_000,
      corners: 0,
      cornerAdjacency: 0,
      edgePattern: 1_000,
      cornerPattern: 0,
      discDifferential: 0,
      parity: 0,
    }),
  }),
]);

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

const EDGE_PATTERN_INDICES = Object.freeze([
  [0, 1, 2, 3, 4, 5, 6, 7],
  [56, 57, 58, 59, 60, 61, 62, 63],
  [0, 8, 16, 24, 32, 40, 48, 56],
  [7, 15, 23, 31, 39, 47, 55, 63],
]);

const CORNER_PATTERN_INDICES = Object.freeze([
  [0, 1, 2, 8, 9, 10, 16, 17, 18],
  [7, 6, 5, 15, 14, 13, 23, 22, 21],
  [56, 57, 58, 48, 49, 50, 40, 41, 42],
  [63, 62, 61, 55, 54, 53, 47, 46, 45],
]);

const EDGE_ANCHORED_RUN_BONUS = Object.freeze([0, 0, 6, 12, 20, 30, 42, 56, 72]);
const EDGE_EMPTY_CORNER_EXPOSURE_PENALTY = Object.freeze([0, 4, 10, 18]);
const EDGE_PATTERN_TABLE = buildPatternTable(8, scoreEdgePatternConfiguration);
const CORNER_PATTERN_TABLE = buildPatternTable(9, scoreCornerPatternConfiguration);
const STABILITY_REFINEMENT_MAX_EMPTIES = 26;
const STABILITY_DIRECTION_SPECS = Object.freeze([
  { key: 'W', deltaRow: 0, deltaCol: -1 },
  { key: 'E', deltaRow: 0, deltaCol: 1 },
  { key: 'N', deltaRow: -1, deltaCol: 0 },
  { key: 'S', deltaRow: 1, deltaCol: 0 },
  { key: 'NW', deltaRow: -1, deltaCol: -1 },
  { key: 'SE', deltaRow: 1, deltaCol: 1 },
  { key: 'NE', deltaRow: -1, deltaCol: 1 },
  { key: 'SW', deltaRow: 1, deltaCol: -1 },
]);
const STABILITY_AXIS_CONFIGS = Object.freeze([
  { lineKey: 'horizontal', directions: Object.freeze(['W', 'E']) },
  { lineKey: 'vertical', directions: Object.freeze(['N', 'S']) },
  { lineKey: 'diagonal', directions: Object.freeze(['NW', 'SE']) },
  { lineKey: 'antiDiagonal', directions: Object.freeze(['NE', 'SW']) },
]);
const STABILITY_DIRECTION_MASKS = Object.freeze(Array.from({ length: 64 }, (_, index) => Object.freeze(
  Object.fromEntries(
    STABILITY_DIRECTION_SPECS.map((spec) => [
      spec.key,
      buildDirectionMask(index, spec.deltaRow, spec.deltaCol),
    ]),
  ),
)));
const STABILITY_AXIS_LINE_MASKS = Object.freeze(Array.from({ length: 64 }, (_, index) => Object.freeze({
  horizontal: buildAxisLineMask(index, 0, 1),
  vertical: buildAxisLineMask(index, 1, 0),
  diagonal: buildAxisLineMask(index, 1, 1),
  antiDiagonal: buildAxisLineMask(index, 1, -1),
})));

function isOnBoard(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function buildDirectionMask(index, deltaRow, deltaCol) {
  const { row, col } = indexToRowCol(index);
  let mask = 0n;
  let nextRow = row + deltaRow;
  let nextCol = col + deltaCol;

  while (isOnBoard(nextRow, nextCol)) {
    mask |= INDEX_BITS[rowColToIndex(nextRow, nextCol)];
    nextRow += deltaRow;
    nextCol += deltaCol;
  }

  return mask;
}

function buildAxisLineMask(index, deltaRow, deltaCol) {
  const { row, col } = indexToRowCol(index);
  let startRow = row;
  let startCol = col;

  while (isOnBoard(startRow - deltaRow, startCol - deltaCol)) {
    startRow -= deltaRow;
    startCol -= deltaCol;
  }

  let mask = 0n;
  let cursorRow = startRow;
  let cursorCol = startCol;
  while (isOnBoard(cursorRow, cursorCol)) {
    mask |= INDEX_BITS[rowColToIndex(cursorRow, cursorCol)];
    cursorRow += deltaRow;
    cursorCol += deltaCol;
  }

  return mask;
}

function normalizeDifference(left, right) {
  const total = left + right;
  if (total === 0) {
    return 0;
  }
  return ((left - right) * 100) / total;
}

function symmetricRound(value) {
  return value >= 0 ? Math.round(value) : -Math.round(-value);
}

function symmetricAverage(total, divisor) {
  return symmetricRound(total / divisor);
}

function tokenForSide(side) {
  return side === 1 ? 2 : 1;
}

function countToken(cells, side, indices) {
  let count = 0;
  for (const index of indices) {
    if (cells[index] === side) {
      count += 1;
    }
  }
  return count;
}

function countAllTokens(cells, side) {
  let count = 0;
  for (let index = 0; index < cells.length; index += 1) {
    if (cells[index] === side) {
      count += 1;
    }
  }
  return count;
}

function contiguousRun(cells, startIndex, step, side) {
  let length = 0;
  let index = startIndex;
  while (index >= 0 && index < cells.length && cells[index] === side) {
    length += 1;
    index += step;
  }
  return length;
}

function scoreEmptyCornerEdgeExposure(cells, cornerIndex, direction, side) {
  const exposureIndices = [cornerIndex + direction, cornerIndex + (direction * 2), cornerIndex + (direction * 3)];
  const exposure = countToken(cells, side, exposureIndices);
  let penalty = EDGE_EMPTY_CORNER_EXPOSURE_PENALTY[exposure];

  if (cells[cornerIndex + direction] === side) {
    penalty += 10;
  }
  if (cells[cornerIndex + direction] === side && cells[cornerIndex + (direction * 2)] === side) {
    penalty += 8;
  }
  if (
    cells[cornerIndex + direction] === side
    && cells[cornerIndex + (direction * 2)] === side
    && cells[cornerIndex + (direction * 3)] === side
  ) {
    penalty += 8;
  }

  return penalty;
}

function scoreEdgePatternPerspective(cells, side) {
  let score = 0;
  const opponent = tokenForSide(side);
  const leftCorner = cells[0];
  const rightCorner = cells[7];

  const leftRun = contiguousRun(cells, 0, 1, side);
  const rightRun = contiguousRun(cells, 7, -1, side);

  if (leftCorner === side) {
    score += 24;
    score += EDGE_ANCHORED_RUN_BONUS[leftRun];
  } else if (leftCorner === 0) {
    score -= scoreEmptyCornerEdgeExposure(cells, 0, 1, side);
  }

  if (rightCorner === side) {
    score += 24;
    score += EDGE_ANCHORED_RUN_BONUS[rightRun];
  } else if (rightCorner === 0) {
    score -= scoreEmptyCornerEdgeExposure(cells, 7, -1, side);
  }

  if (leftCorner === side && rightCorner === side) {
    score += 14;
    score += countToken(cells, side, [1, 2, 3, 4, 5, 6]) * 2;
  }

  const sideCount = countAllTokens(cells, side);
  const opponentCount = countAllTokens(cells, opponent);
  const emptyCount = cells.length - sideCount - opponentCount;

  if (emptyCount === 0) {
    if (sideCount === 8) {
      score += 34;
    } else if (leftCorner === side && rightCorner === side && sideCount >= 6) {
      score += 12;
    }
  }

  if (leftCorner === 0 && rightCorner === 0 && sideCount >= 5) {
    score -= 8;
  }

  return score;
}

function scoreEdgePatternConfiguration(cells) {
  return scoreEdgePatternPerspective(cells, 1) - scoreEdgePatternPerspective(cells, 2);
}

function scoreCornerPatternPerspective(cells, side) {
  const corner = cells[0];
  const orthAdjacent = countToken(cells, side, [1, 3]);
  const edgeSupport = countToken(cells, side, [2, 6]);
  const xSquare = cells[4] === side ? 1 : 0;
  const innerAdjacent = countToken(cells, side, [5, 7]);
  const innerDiagonal = cells[8] === side ? 1 : 0;
  const totalOwned = orthAdjacent + edgeSupport + xSquare + innerAdjacent + innerDiagonal;

  let score = 0;

  if (corner === side) {
    score += 24;
    score += orthAdjacent * 10;
    score += edgeSupport * 6;
    score += xSquare * 8;
    score += innerAdjacent * 4;
    score += innerDiagonal * 4;

    if (orthAdjacent === 2) {
      score += 10;
    }
    if (xSquare === 1 && orthAdjacent >= 1) {
      score += 6;
    }
    if (totalOwned >= 5) {
      score += 8;
    }
  } else if (corner === 0) {
    score -= orthAdjacent * 12;
    score -= edgeSupport * 4;
    score -= xSquare * 22;
    score -= innerAdjacent * 3;
    score -= innerDiagonal * 3;

    if (orthAdjacent === 2) {
      score -= 10;
    }
    if (xSquare === 1 && orthAdjacent >= 1) {
      score -= 12;
    }
    if (xSquare === 1 && orthAdjacent === 2) {
      score -= 8;
    }
    if (totalOwned >= 4) {
      score -= 6;
    }
  }

  return score;
}

function scoreCornerPatternConfiguration(cells) {
  return scoreCornerPatternPerspective(cells, 1) - scoreCornerPatternPerspective(cells, 2);
}

function buildPatternTable(length, scorePattern) {
  const size = POWERS_OF_THREE[length];
  const cells = new Array(length).fill(0);
  const table = new Int16Array(size);

  for (let code = 0; code < size; code += 1) {
    let cursor = code;
    for (let index = 0; index < length; index += 1) {
      cells[index] = cursor % 3;
      cursor = Math.floor(cursor / 3);
    }
    table[code] = scorePattern(cells);
  }

  return table;
}

function encodePattern(indices, player, opponent) {
  let code = 0;
  for (let index = 0; index < indices.length; index += 1) {
    const bit = INDEX_BITS[indices[index]];
    let token = 0;
    if ((player & bit) !== 0n) {
      token = 1;
    } else if ((opponent & bit) !== 0n) {
      token = 2;
    }
    code += token * POWERS_OF_THREE[index];
  }
  return code;
}

function countBitsInIndices(bitboard, indices) {
  let count = 0;
  for (const index of indices) {
    if ((bitboard & INDEX_BITS[index]) !== 0n) {
      count += 1;
    }
  }
  return count;
}

function positionalScore(player, opponent) {
  let score = 0;
  for (let index = 0; index < 64; index += 1) {
    const bit = INDEX_BITS[index];
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
    const cornerBit = INDEX_BITS[group.corner];
    if ((player & cornerBit) !== 0n || (opponent & cornerBit) !== 0n) {
      continue;
    }

    myPenalty += countBitsInIndices(player, group.adjacent);
    oppPenalty += countBitsInIndices(opponent, group.adjacent);
  }

  return normalizeDifference(oppPenalty, myPenalty);
}

function edgePatternScore(player, opponent) {
  let total = 0;
  for (const indices of EDGE_PATTERN_INDICES) {
    total += EDGE_PATTERN_TABLE[encodePattern(indices, player, opponent)];
  }
  return symmetricAverage(total, 3);
}

function cornerPatternScore(player, opponent) {
  let total = 0;
  for (const indices of CORNER_PATTERN_INDICES) {
    total += CORNER_PATTERN_TABLE[encodePattern(indices, player, opponent)];
  }
  return symmetricAverage(total, 4);
}

function anchoredEdgeFromCorner(player, cornerIndex, step) {
  let stable = 0n;
  let index = cornerIndex;
  while (index >= 0 && index < 64) {
    const bit = INDEX_BITS[index];
    if ((player & bit) === 0n) {
      break;
    }
    stable |= bit;
    index += step;
  }
  return stable;
}

function baseStableEdgeDiscs(player, opponent) {
  let stable = 0n;

  if ((player & INDEX_BITS[0]) !== 0n) {
    stable |= anchoredEdgeFromCorner(player, 0, 1);
    stable |= anchoredEdgeFromCorner(player, 0, 8);
  }
  if ((player & INDEX_BITS[7]) !== 0n) {
    stable |= anchoredEdgeFromCorner(player, 7, -1);
    stable |= anchoredEdgeFromCorner(player, 7, 8);
  }
  if ((player & INDEX_BITS[56]) !== 0n) {
    stable |= anchoredEdgeFromCorner(player, 56, 1);
    stable |= anchoredEdgeFromCorner(player, 56, -8);
  }
  if ((player & INDEX_BITS[63]) !== 0n) {
    stable |= anchoredEdgeFromCorner(player, 63, -1);
    stable |= anchoredEdgeFromCorner(player, 63, -8);
  }

  for (const edge of EDGE_GROUPS) {
    const occupiedOnEdge = (player | opponent) & edge.mask;
    if (occupiedOnEdge !== edge.mask) {
      continue;
    }

    stable |= player & edge.mask;
  }

  return stable;
}

function directionProtectedByStableChain(index, directionKey, player, stable) {
  const mask = STABILITY_DIRECTION_MASKS[index][directionKey];
  if (mask === 0n) {
    return true;
  }

  return (player & mask) === mask && (stable & mask) === mask;
}

function isStabilityAxisProtected(index, axisConfig, player, occupied, stable) {
  const lineMask = STABILITY_AXIS_LINE_MASKS[index][axisConfig.lineKey];
  if ((occupied & lineMask) === lineMask) {
    return true;
  }

  return axisConfig.directions.some((directionKey) => (
    directionProtectedByStableChain(index, directionKey, player, stable)
  ));
}

function isConservativelyStable(index, player, occupied, stable) {
  return STABILITY_AXIS_CONFIGS.every((axisConfig) => (
    isStabilityAxisProtected(index, axisConfig, player, occupied, stable)
  ));
}

function refineStableDiscs(player, occupied, stable) {
  let currentStable = stable;

  for (let pass = 0; pass < 64; pass += 1) {
    let additions = 0n;

    for (let index = 0; index < 64; index += 1) {
      const bit = INDEX_BITS[index];
      if ((player & bit) === 0n || (currentStable & bit) !== 0n) {
        continue;
      }

      if (isConservativelyStable(index, player, occupied, currentStable)) {
        additions |= bit;
      }
    }

    if (additions === 0n) {
      break;
    }
    currentStable |= additions;
  }

  return currentStable;
}

function approximateStableDiscs(player, opponent, emptyCount = popcount(FULL_BOARD & ~(player | opponent))) {
  const stable = baseStableEdgeDiscs(player, opponent);
  if (stable === 0n || emptyCount > STABILITY_REFINEMENT_MAX_EMPTIES) {
    return stable;
  }

  return refineStableDiscs(player, player | opponent, stable);
}

function stabilityCounts(player, opponent, emptyCount) {
  return {
    player: popcount(approximateStableDiscs(player, opponent, emptyCount)),
    opponent: popcount(approximateStableDiscs(opponent, player, emptyCount)),
  };
}

function stabilityScore(player, opponent, emptyCount) {
  const stableCounts = stabilityCounts(player, opponent, emptyCount);
  return normalizeDifference(stableCounts.player, stableCounts.opponent);
}

function discDifferentialScore(player, opponent) {
  return normalizeDifference(popcount(player), popcount(opponent));
}

function globalParityScore(state, color = state.currentPlayer) {
  const empties = state.getEmptyCount();
  if (empties === 0) {
    return 0;
  }

  const currentPlayerParity = empties % 2 === 1 ? 100 : -100;
  return color === state.currentPlayer ? currentPlayerParity : -currentPlayerParity;
}

function computeRegionParityScore(state, color, emptyRegions) {
  const currentPlayer = state.currentPlayer;
  const opponentColor = state.getOpponentColor(currentPlayer);
  const currentBoards = state.getPlayerBoards(currentPlayer);
  const currentLegalMoves = legalMovesBitboard(currentBoards.player, currentBoards.opponent);
  const opponentLegalMoves = legalMovesBitboard(currentBoards.opponent, currentBoards.player);

  let weightedScore = 0;
  let totalWeight = 0;

  for (const region of emptyRegions) {
    const size = popcount(region);
    const currentHasMove = (currentLegalMoves & region) !== 0n;
    const opponentHasMove = (opponentLegalMoves & region) !== 0n;
    const regionInitiator = currentHasMove && !opponentHasMove
      ? currentPlayer
      : (!currentHasMove && opponentHasMove ? opponentColor : currentPlayer);
    const initiatorConfidence = currentHasMove && opponentHasMove
      ? 0.7
      : (!currentHasMove && !opponentHasMove ? 0.4 : 1.15);
    const lastMoveAdvantage = size % 2 === 1 ? 1 : -1;
    const perspective = regionInitiator === color ? 1 : -1;
    const weight = Math.max(1, Math.min(6, 7 - size)) * initiatorConfidence;

    weightedScore += perspective * lastMoveAdvantage * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return 0;
  }

  return clamp(symmetricRound((weightedScore / totalWeight) * 100), -100, 100);
}

function describeParityHeuristic(state, color = state.currentPlayer, { includeRegionBreakdown = false } = {}) {
  const empties = state.getEmptyCount();
  const global = globalParityScore(state, color);
  const shouldComputeRegions = includeRegionBreakdown || (empties > 0 && empties <= 18);

  if (!shouldComputeRegions) {
    return {
      score: empties === 0 ? 0 : global,
      global,
      regionScore: global,
      regionCount: 0,
      oddRegions: 0,
      evenRegions: 0,
    };
  }

  const emptyRegions = connectedRegions(state.getEmptyBitboard());

  let oddRegions = 0;
  let evenRegions = 0;
  for (const region of emptyRegions) {
    if (popcount(region) % 2 === 1) {
      oddRegions += 1;
    } else {
      evenRegions += 1;
    }
  }

  let regionScore = global;
  let blendedScore = global;

  if (empties > 0 && empties <= 18 && emptyRegions.length > 1) {
    regionScore = computeRegionParityScore(state, color, emptyRegions);
    const regionBlend = empties <= 10
      ? 0.8
      : (empties <= 14 ? 0.65 : 0.45);
    blendedScore = clamp(
      symmetricRound((global * (1 - regionBlend)) + (regionScore * regionBlend)),
      -100,
      100,
    );
  }

  return {
    score: empties === 0 ? 0 : blendedScore,
    global,
    regionScore,
    regionCount: emptyRegions.length,
    oddRegions,
    evenRegions,
  };
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
    const edgePatterns = edgePatternScore(player, opponent);
    const cornerPatterns = cornerPatternScore(player, opponent);
    const stability = stabilityScore(player, opponent, empties);
    const discDiff = discDifferentialScore(player, opponent);
    const parityBreakdown = describeParityHeuristic(state, color);
    const parity = parityBreakdown.score;

    const mobilityWeight = lerp(135, 35, phase) * this.options.mobilityScale;
    const potentialMobilityWeight = lerp(55, 12, phase) * this.options.potentialMobilityScale;
    const cornersWeight = 850 * this.options.cornerScale;
    const cornerAdjacencyWeight = lerp(300, 90, phase) * this.options.cornerAdjacencyScale;
    const frontierWeight = lerp(80, 20, phase) * this.options.frontierScale;
    const positionalWeight = lerp(14, 8, phase) * this.options.positionalScale;
    const edgePatternWeight = lerp(85, 165, phase) * this.options.edgePatternScale;
    const cornerPatternWeight = lerp(95, 175, phase) * this.options.cornerPatternScale;
    const stabilityWeight = lerp(120, 320, phase) * this.options.stabilityScale;
    const parityWeight = (empties <= 14 ? lerp(25, 80, 1 - (empties / 14)) : 0) * this.options.parityScale;
    const discWeight = (empties <= 18 ? lerp(12, 120, 1 - (empties / 18)) : 0) * this.options.discScale;

    const weighted = (
      (mobility * mobilityWeight)
      + (potentialMobility * potentialMobilityWeight)
      + (corners * cornersWeight)
      + (cornerAdjacency * cornerAdjacencyWeight)
      + (frontier * frontierWeight)
      + (positional * positionalWeight)
      + (edgePatterns * edgePatternWeight)
      + (cornerPatterns * cornerPatternWeight)
      + (stability * stabilityWeight)
      + (discDiff * discWeight)
      + (parity * parityWeight)
    );

    return symmetricRound(weighted);
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
    const empties = state.getEmptyCount();
    const stableCounts = stabilityCounts(player, opponent, empties);
    const parityBreakdown = describeParityHeuristic(state, color, { includeRegionBreakdown: true });

    return {
      mobility: actualMobilityScore(player, opponent),
      potentialMobility: potentialMobilityScore(player, opponent, empty),
      corners: cornerScore(player, opponent),
      cornerAdjacency: cornerAdjacencyScore(player, opponent),
      frontier: frontierScore(player, opponent, empty),
      positional: positionalScore(player, opponent),
      edgePattern: edgePatternScore(player, opponent),
      cornerPattern: cornerPatternScore(player, opponent),
      stability: normalizeDifference(stableCounts.player, stableCounts.opponent),
      stableDiscs: stableCounts.player,
      opponentStableDiscs: stableCounts.opponent,
      discDifferential: discDifferentialScore(player, opponent),
      parity: parityBreakdown.score,
      parityGlobal: parityBreakdown.global,
      parityRegion: parityBreakdown.regionScore,
      parityRegionCount: parityBreakdown.regionCount,
      parityOddRegions: parityBreakdown.oddRegions,
      parityEvenRegions: parityBreakdown.evenRegions,
      currentPlayer: color,
      legalMoves: bitsToCoords(legalMovesBitboard(player, opponent)),
    };
  }
}


export class MoveOrderingEvaluator {
  constructor(options = {}) {
    this.options = {
      ...DEFAULT_EVALUATION_OPTIONS,
      ...options,
    };
  }

  selectTrainedBucket(empties) {
    return ORDERING_TRAINED_WEIGHT_BUCKETS.find((bucket) => (
      empties >= bucket.minEmpties && empties <= bucket.maxEmpties
    )) ?? null;
  }

  evaluate(state, color = state.currentPlayer, context = {}) {
    const perspectiveBoards = color === PLAYER_COLORS.BLACK
      ? { player: state.black, opponent: state.white }
      : { player: state.white, opponent: state.black };

    const { player, opponent } = perspectiveBoards;
    const empties = context.empties ?? state.getEmptyCount();
    const phase = clamp((18 - empties) / 12, 0, 1);
    const myMoveCount = popcount(legalMovesBitboard(player, opponent));
    const opponentMoveCount = context.opponentMoveCount ?? popcount(legalMovesBitboard(opponent, player));
    const mobility = normalizeDifference(myMoveCount, opponentMoveCount);
    const corners = cornerScore(player, opponent);
    const cornerAdjacency = cornerAdjacencyScore(player, opponent);
    const edgePatterns = edgePatternScore(player, opponent);
    const cornerPatterns = cornerPatternScore(player, opponent);
    const discDiff = discDifferentialScore(player, opponent);
    const parity = empties <= 12 ? globalParityScore(state, color) : 0;

    const trainedBucket = this.selectTrainedBucket(empties);
    if (trainedBucket) {
      const weighted = (
        (mobility * trainedBucket.weights.mobility * this.options.mobilityScale)
        + (corners * trainedBucket.weights.corners * this.options.cornerScale)
        + (cornerAdjacency * trainedBucket.weights.cornerAdjacency * this.options.cornerAdjacencyScale)
        + (edgePatterns * trainedBucket.weights.edgePattern * this.options.edgePatternScale)
        + (cornerPatterns * trainedBucket.weights.cornerPattern * this.options.cornerPatternScale)
        + (discDiff * trainedBucket.weights.discDifferential * this.options.discScale)
        + (parity * trainedBucket.weights.parity * this.options.parityScale)
      );
      return clamp(symmetricRound(weighted), -900_000, 900_000);
    }

    const mobilityWeight = lerp(720, 480, phase) * this.options.mobilityScale;
    const cornerWeight = lerp(2200, 2600, phase) * this.options.cornerScale;
    const cornerAdjacencyWeight = lerp(820, 300, phase) * this.options.cornerAdjacencyScale;
    const edgePatternWeight = lerp(720, 1080, phase) * this.options.edgePatternScale;
    const cornerPatternWeight = lerp(980, 1280, phase) * this.options.cornerPatternScale;
    const discWeight = (empties <= 10 ? lerp(160, 480, 1 - (empties / 10)) : 0) * this.options.discScale;
    const parityWeight = (empties <= 12 ? lerp(80, 220, 1 - (empties / 12)) : 0) * this.options.parityScale;

    const weighted = (
      (mobility * mobilityWeight)
      + (corners * cornerWeight)
      + (cornerAdjacency * cornerAdjacencyWeight)
      + (edgePatterns * edgePatternWeight)
      + (cornerPatterns * cornerPatternWeight)
      + (discDiff * discWeight)
      + (parity * parityWeight)
    );

    return clamp(symmetricRound(weighted), -900_000, 900_000);
  }

  explainFeatures(state, color = state.currentPlayer, context = {}) {
    const perspectiveBoards = color === PLAYER_COLORS.BLACK
      ? { player: state.black, opponent: state.white }
      : { player: state.white, opponent: state.black };

    const { player, opponent } = perspectiveBoards;
    const empties = context.empties ?? state.getEmptyCount();
    const myMoveCount = popcount(legalMovesBitboard(player, opponent));
    const opponentMoveCount = context.opponentMoveCount ?? popcount(legalMovesBitboard(opponent, player));

    return {
      mobility: normalizeDifference(myMoveCount, opponentMoveCount),
      myMoveCount,
      opponentMoveCount,
      corners: cornerScore(player, opponent),
      cornerAdjacency: cornerAdjacencyScore(player, opponent),
      edgePattern: edgePatternScore(player, opponent),
      cornerPattern: cornerPatternScore(player, opponent),
      discDifferential: discDifferentialScore(player, opponent),
      parity: empties <= 12 ? globalParityScore(state, color) : 0,
      empties,
      currentPlayer: color,
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
