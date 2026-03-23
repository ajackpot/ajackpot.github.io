const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const PIECE_NAMES = {
  p: '폰',
  n: '나이트',
  b: '비숍',
  r: '룩',
  q: '퀸',
  k: '킹',
};

const PIECE_SYMBOLS = {
  wp: '♙',
  wn: '♘',
  wb: '♗',
  wr: '♖',
  wq: '♕',
  wk: '♔',
  bp: '♟',
  bn: '♞',
  bb: '♝',
  br: '♜',
  bq: '♛',
  bk: '♚',
};

const COLOR_NAMES = {
  w: '백',
  b: '흑',
};

export class BoardViewModel {
  static build(snapshot) {
    const legalTargets = new Set(snapshot.legalTargets);
    const lastMoveSquares = new Set(snapshot.lastMoveSquares);
    const rows = [];

    for (let rowIndex = 0; rowIndex < 8; rowIndex += 1) {
      const rank = RANKS[rowIndex];
      const rowSquares = [];

      for (let colIndex = 0; colIndex < 8; colIndex += 1) {
        const file = FILES[colIndex];
        const coordinate = `${file}${rank}`;
        const piece = snapshot.board[rowIndex][colIndex];
        const selected = snapshot.selectedSquare === coordinate;
        const occupied = Boolean(piece);
        const legalTarget = legalTargets.has(coordinate);
        const lastMove = lastMoveSquares.has(coordinate);

        rowSquares.push({
          coordinate,
          rowIndex,
          colIndex,
          piece,
          occupied,
          symbol: piece ? PIECE_SYMBOLS[`${piece.color}${piece.type}`] : '',
          name: piece ? `${COLOR_NAMES[piece.color]} ${PIECE_NAMES[piece.type]}` : '빈칸',
          accessibleName: this.createAccessibleName(piece, coordinate, {
            selected,
            legalTarget,
            lastMove,
          }),
          selected,
          legalTarget,
          lastMove,
          lightSquare: (rowIndex + colIndex) % 2 === 0,
          visibleHint: selected ? '선택됨' : legalTarget ? '이동 가능' : '',
        });
      }

      rows.push({
        rank,
        squares: rowSquares,
      });
    }

    return {
      files: FILES,
      rows,
    };
  }

  static createAccessibleName(piece, coordinate, state) {
    const segments = [];

    if (piece) {
      segments.push(`${COLOR_NAMES[piece.color]} ${PIECE_NAMES[piece.type]}`);
    } else {
      segments.push('빈칸');
    }

    segments.push(coordinate);

    if (state.selected) {
      segments.push('선택됨');
    }

    if (state.legalTarget) {
      segments.push('이동 가능');
    }

    if (state.lastMove) {
      segments.push('직전 이동 경로');
    }

    return segments.join(', ');
  }
}
