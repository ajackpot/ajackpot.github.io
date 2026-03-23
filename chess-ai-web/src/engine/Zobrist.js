const PIECE_ORDER = ['wp', 'wn', 'wb', 'wr', 'wq', 'wk', 'bp', 'bn', 'bb', 'br', 'bq', 'bk'];
const CASTLING_ORDER = ['K', 'Q', 'k', 'q'];

function xorshift64(seed) {
  let state = BigInt.asUintN(64, BigInt(seed));
  return () => {
    state ^= state << 13n;
    state ^= state >> 7n;
    state ^= state << 17n;
    return BigInt.asUintN(64, state);
  };
}

export class Zobrist {
  constructor(seed = 0x9e3779b97f4a7c15n) {
    const random = xorshift64(seed);
    this.pieceSquare = Array.from({ length: PIECE_ORDER.length }, () =>
      Array.from({ length: 64 }, () => random()),
    );
    this.sideToMove = random();
    this.castling = Array.from({ length: CASTLING_ORDER.length }, () => random());
    this.enPassant = Array.from({ length: 8 }, () => random());
  }

  hashFen(normalizedFen) {
    const [boardPart, sidePart, castlingPart, enPassantPart] = normalizedFen.split(' ');
    let hash = 0n;

    let squareIndex = 0;
    for (const character of boardPart) {
      if (character === '/') {
        continue;
      }
      if (/\d/.test(character)) {
        squareIndex += Number(character);
        continue;
      }

      const color = character === character.toUpperCase() ? 'w' : 'b';
      const pieceType = character.toLowerCase();
      const pieceKey = `${color}${pieceType}`;
      const pieceIndex = PIECE_ORDER.indexOf(pieceKey);
      if (pieceIndex >= 0) {
        hash ^= this.pieceSquare[pieceIndex][squareIndex];
      }
      squareIndex += 1;
    }

    if (sidePart === 'b') {
      hash ^= this.sideToMove;
    }

    if (castlingPart && castlingPart !== '-') {
      for (const flag of castlingPart) {
        const castlingIndex = CASTLING_ORDER.indexOf(flag);
        if (castlingIndex >= 0) {
          hash ^= this.castling[castlingIndex];
        }
      }
    }

    if (enPassantPart && enPassantPart !== '-') {
      const file = enPassantPart.charCodeAt(0) - 97;
      if (file >= 0 && file < 8) {
        hash ^= this.enPassant[file];
      }
    }

    return hash.toString(16).padStart(16, '0');
  }
}
