import {
  COLOR_NAMES,
  PIECE_NAMES,
  PIECE_VALUES,
  getPieceText,
  squareToCoords,
} from './pieces.js';

export const MATE_SCORE = 100000;
export const DRAW_SCORE = 0;

export function oppositeColor(color) {
  return color === 'w' ? 'b' : 'w';
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function fileDistanceFromCenter(file) {
  return Math.abs(file - 3.5);
}

export function rankDistanceFromCenter(rankFromTop) {
  return Math.abs(rankFromTop - 3.5);
}

export function distanceToCenter(file, rankFromTop) {
  return fileDistanceFromCenter(file) + rankDistanceFromCenter(rankFromTop);
}

export function forwardRank(square, color) {
  const { rankIndexFromTop } = squareToCoords(square);
  return color === 'w' ? 7 - rankIndexFromTop : rankIndexFromTop;
}

export function moveKey(move) {
  return move?.lan ?? `${move.from}${move.to}${move.promotion ?? ''}`;
}

export function isCapture(move) {
  return Boolean(move.captured) || move.flags?.includes('e');
}

export function isPromotion(move) {
  return Boolean(move.promotion);
}

export function isQuietMove(move) {
  return !isCapture(move) && !isPromotion(move) && !move.flags?.includes('k') && !move.flags?.includes('q');
}

export function pieceValue(type) {
  return PIECE_VALUES[type] ?? 0;
}

export function mvvLvaScore(move) {
  const victim = pieceValue(move.captured) || 0;
  const attacker = pieceValue(move.piece) || 1;
  const promotionBonus = move.promotion ? pieceValue(move.promotion) : 0;
  return victim * 16 - attacker + promotionBonus;
}

export function scoreToHuman(score) {
  if (Math.abs(score) > MATE_SCORE - 1000) {
    const pliesToMate = MATE_SCORE - Math.abs(score);
    const movesToMate = Math.max(1, Math.ceil(pliesToMate / 2));
    return `${score > 0 ? '+' : '-'}M${movesToMate}`;
  }

  return `${(score / 100).toFixed(2)}`;
}

export function describeMove(move, movingPiece, capturedPiece) {
  const moverLabel = movingPiece ? getPieceText(movingPiece) : `${COLOR_NAMES[move.color]} ${PIECE_NAMES[move.piece]}`;
  const captureText = capturedPiece
    ? `${getPieceText(capturedPiece)}를 잡고 `
    : isCapture(move)
      ? '기물을 잡고 '
      : '';
  const promotionText = move.promotion ? `, ${PIECE_NAMES[move.promotion]}으로 승격` : '';
  const castlingText = move.flags?.includes('k')
    ? '킹사이드 캐슬링'
    : move.flags?.includes('q')
      ? '퀸사이드 캐슬링'
      : null;

  if (castlingText) {
    return `${COLOR_NAMES[move.color]} ${castlingText}을 실행했습니다.`;
  }

  return `${moverLabel}이 ${move.from}에서 ${captureText}${move.to}(으)로 이동했습니다${promotionText}.`;
}

export function describeGameState(game) {
  if (game.isCheckmate()) {
    return `체크메이트. ${game.turn() === 'w' ? '흑' : '백'} 승리.`;
  }

  if (game.isStalemate()) {
    return '스테일메이트 무승부.';
  }

  if (game.isDrawByFiftyMoves()) {
    return '50수 규칙으로 무승부.';
  }

  if (game.isThreefoldRepetition()) {
    return '같은 형세 반복으로 무승부.';
  }

  if (game.isInsufficientMaterial()) {
    return '기물 부족으로 무승부.';
  }

  if (game.isCheck()) {
    return `${COLOR_NAMES[game.turn()]} 차례, 체크 상태입니다.`;
  }

  return `${COLOR_NAMES[game.turn()]} 차례입니다.`;
}

export function createPositionKey(fen) {
  return fen.split(' ').slice(0, 4).join(' ');
}

export function boardSquareColor(square) {
  const { file, rank } = squareToCoords(square);
  return (file + rank) % 2 === 0 ? 'light' : 'dark';
}
