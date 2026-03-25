export const BOARD_SIZE = 8;
export const BOARD_SQUARES = BOARD_SIZE * BOARD_SIZE;
export const FULL_BOARD = (1n << 64n) - 1n;

export const FILE_A = 0x0101010101010101n;
export const FILE_H = 0x8080808080808080n;
export const RANK_1 = 0x00000000000000FFn;
export const RANK_8 = 0xFF00000000000000n;

export const NOT_A_FILE = FULL_BOARD ^ FILE_A;
export const NOT_H_FILE = FULL_BOARD ^ FILE_H;
export const NOT_RANK_1 = FULL_BOARD ^ RANK_1;
export const NOT_RANK_8 = FULL_BOARD ^ RANK_8;

export const FILE_LABELS = Object.freeze(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);

export const CORNER_INDICES = Object.freeze([0, 7, 56, 63]);
export const CORNER_BITS = Object.freeze(CORNER_INDICES.map((index) => 1n << BigInt(index)));
export const X_SQUARE_INDICES = Object.freeze([9, 14, 49, 54]);
export const C_SQUARE_INDICES = Object.freeze([1, 8, 6, 15, 48, 57, 55, 62]);

export const POSITIONAL_WEIGHTS = Object.freeze([
  120, -20, 20, 5, 5, 20, -20, 120,
  -20, -40, -5, -5, -5, -5, -40, -20,
  20, -5, 15, 3, 3, 15, -5, 20,
  5, -5, 3, 3, 3, 3, -5, 5,
  5, -5, 3, 3, 3, 3, -5, 5,
  20, -5, 15, 3, 3, 15, -5, 20,
  -20, -40, -5, -5, -5, -5, -40, -20,
  120, -20, 20, 5, 5, 20, -20, 120,
]);

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

export function bitFromIndex(index) {
  return 1n << BigInt(index);
}

export function indexFromBit(bit) {
  if (bit === 0n) {
    return -1;
  }

  let index = 0;
  let cursor = bit;
  while (cursor > 1n) {
    cursor >>= 1n;
    index += 1;
  }
  return index;
}

export function popcount(bitboard) {
  let count = 0;
  let cursor = bitboard;
  while (cursor !== 0n) {
    cursor &= cursor - 1n;
    count += 1;
  }
  return count;
}

export function bitsToIndices(bitboard) {
  const indices = [];
  let cursor = bitboard;
  while (cursor !== 0n) {
    const leastSignificantBit = cursor & -cursor;
    indices.push(indexFromBit(leastSignificantBit));
    cursor ^= leastSignificantBit;
  }
  return indices;
}

export function indexToRowCol(index) {
  return {
    row: Math.floor(index / BOARD_SIZE),
    col: index % BOARD_SIZE,
  };
}

export function rowColToIndex(row, col) {
  return (row * BOARD_SIZE) + col;
}

export function indexToCoord(index) {
  const { row, col } = indexToRowCol(index);
  return `${FILE_LABELS[col]}${row + 1}`;
}

export function coordToIndex(coord) {
  if (typeof coord !== 'string') {
    return -1;
  }

  const normalized = coord.trim().toUpperCase();
  const match = /^([A-H])([1-8])$/.exec(normalized);
  if (!match) {
    return -1;
  }

  const [, fileLabel, rankLabel] = match;
  const col = FILE_LABELS.indexOf(fileLabel);
  const row = Number(rankLabel) - 1;
  return rowColToIndex(row, col);
}

export function shiftEast(bitboard) {
  return (bitboard & NOT_H_FILE) << 1n;
}

export function shiftWest(bitboard) {
  return (bitboard & NOT_A_FILE) >> 1n;
}

export function shiftSouth(bitboard) {
  return (bitboard & NOT_RANK_8) << 8n;
}

export function shiftNorth(bitboard) {
  return (bitboard & NOT_RANK_1) >> 8n;
}

export function shiftSouthEast(bitboard) {
  return (bitboard & NOT_H_FILE & NOT_RANK_8) << 9n;
}

export function shiftSouthWest(bitboard) {
  return (bitboard & NOT_A_FILE & NOT_RANK_8) << 7n;
}

export function shiftNorthEast(bitboard) {
  return (bitboard & NOT_H_FILE & NOT_RANK_1) >> 7n;
}

export function shiftNorthWest(bitboard) {
  return (bitboard & NOT_A_FILE & NOT_RANK_1) >> 9n;
}

export const DIRECTIONS = Object.freeze([
  { name: 'E', shift: shiftEast },
  { name: 'W', shift: shiftWest },
  { name: 'S', shift: shiftSouth },
  { name: 'N', shift: shiftNorth },
  { name: 'SE', shift: shiftSouthEast },
  { name: 'SW', shift: shiftSouthWest },
  { name: 'NE', shift: shiftNorthEast },
  { name: 'NW', shift: shiftNorthWest },
]);

export function neighbors(bitboard) {
  return (
    shiftEast(bitboard)
    | shiftWest(bitboard)
    | shiftSouth(bitboard)
    | shiftNorth(bitboard)
    | shiftSouthEast(bitboard)
    | shiftSouthWest(bitboard)
    | shiftNorthEast(bitboard)
    | shiftNorthWest(bitboard)
  ) & FULL_BOARD;
}

export function connectedRegions(bitboard, expand = neighbors) {
  const regions = [];
  let remaining = bitboard & FULL_BOARD;

  while (remaining !== 0n) {
    const seed = remaining & -remaining;
    let region = 0n;
    let frontier = seed;

    while (frontier !== 0n) {
      region |= frontier;
      frontier = expand(frontier) & remaining & ~region;
    }

    regions.push(region);
    remaining &= ~region;
  }

  return regions;
}

export function formatBitboard(bitboard) {
  const rows = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    let line = '';
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const index = rowColToIndex(row, col);
      line += (bitboard & bitFromIndex(index)) !== 0n ? '1' : '.';
    }
    rows.push(line);
  }
  return rows.join('\n');
}
