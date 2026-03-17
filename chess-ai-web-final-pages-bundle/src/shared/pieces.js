export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
export const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export const COLOR_NAMES = {
  w: '백',
  b: '흑',
};

export const PIECE_NAMES = {
  p: '폰',
  n: '나이트',
  b: '비숍',
  r: '룩',
  q: '퀸',
  k: '킹',
};

export const PIECE_SYMBOLS = {
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

export const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

export const PHASE_WEIGHTS = {
  p: 0,
  n: 1,
  b: 1,
  r: 2,
  q: 4,
  k: 0,
};

export const PROMOTION_OPTIONS = [
  { value: 'q', label: '퀸' },
  { value: 'r', label: '룩' },
  { value: 'b', label: '비숍' },
  { value: 'n', label: '나이트' },
];

export function squareToCoords(square) {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  return {
    file,
    rank,
    rankIndexFromTop: 8 - rank,
  };
}

export function coordsToSquare(file, rankFromTop) {
  return `${String.fromCharCode(97 + file)}${8 - rankFromTop}`;
}

export function orientationToRows(orientation = 'white') {
  const rows = [];
  if (orientation === 'black') {
    for (let rankFromTop = 7; rankFromTop >= 0; rankFromTop -= 1) {
      const squares = [];
      for (let file = 7; file >= 0; file -= 1) {
        squares.push(coordsToSquare(file, rankFromTop));
      }
      rows.push(squares);
    }
    return rows;
  }

  for (let rankFromTop = 0; rankFromTop < 8; rankFromTop += 1) {
    const squares = [];
    for (let file = 0; file < 8; file += 1) {
      squares.push(coordsToSquare(file, rankFromTop));
    }
    rows.push(squares);
  }
  return rows;
}

export function getPieceKey(piece) {
  if (!piece) {
    return '';
  }
  return `${piece.color}${piece.type}`;
}

export function getPieceSymbol(piece) {
  return PIECE_SYMBOLS[getPieceKey(piece)] ?? '';
}

export function getPieceText(piece) {
  if (!piece) {
    return '빈 칸';
  }
  return `${COLOR_NAMES[piece.color]} ${PIECE_NAMES[piece.type]}`;
}

export function fileLabelForOrientation(orientation = 'white') {
  return orientation === 'black' ? [...FILES].reverse() : FILES;
}

export function rankLabelForOrientation(orientation = 'white') {
  return orientation === 'black' ? ['1', '2', '3', '4', '5', '6', '7', '8'] : RANKS;
}
