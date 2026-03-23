const COLOR_NAMES = {
  w: '백',
  b: '흑',
};

const PIECE_NAMES = {
  p: '폰',
  n: '나이트',
  b: '비숍',
  r: '룩',
  q: '퀸',
  k: '킹',
};

export class MoveNarrator {
  colorName(color) {
    return COLOR_NAMES[color] ?? color;
  }

  pieceName(pieceType) {
    return PIECE_NAMES[pieceType] ?? pieceType;
  }

  describePiece(color, pieceType) {
    return `${this.colorName(color)} ${this.pieceName(pieceType)}`;
  }

  describeSelection(piece, square, legalMoves) {
    const moveTargets = legalMoves.map((move) => move.to).join(', ');
    if (!piece) {
      return `${square}는 빈칸입니다.`;
    }
    if (legalMoves.length > 0) {
      return `${this.describePiece(piece.color, piece.type)} ${square} 선택됨. 이동 가능 칸: ${moveTargets}.`;
    }
    return `${this.describePiece(piece.color, piece.type)} ${square} 선택됨. 현재 이동 가능한 칸이 없습니다.`;
  }

  describeDeselection(piece, square) {
    if (!piece) {
      return `${square} 선택이 해제되었습니다.`;
    }
    return `${this.describePiece(piece.color, piece.type)} ${square} 선택 해제됨.`;
  }

  describeInvalidMove(square) {
    return `${square}로는 이동할 수 없습니다.`;
  }

  describeMove(move, actor, gameState) {
    if (!move) {
      return `${actor} 착수에 실패했습니다.`;
    }

    let message = '';
    const mover = this.describePiece(move.color, move.piece);

    if (move.flags.includes('k')) {
      message = `${actor} ${this.colorName(move.color)} 킹사이드 캐슬링.`;
    } else if (move.flags.includes('q')) {
      message = `${actor} ${this.colorName(move.color)} 퀸사이드 캐슬링.`;
    } else if (move.captured) {
      message = `${actor} ${mover} ${move.from}에서 ${move.to}로 이동하며 ${this.describePiece(move.color === 'w' ? 'b' : 'w', move.captured)}을 잡았습니다.`;
    } else {
      message = `${actor} ${mover} ${move.from}에서 ${move.to}로 이동했습니다.`;
    }

    if (move.promotion) {
      message += ` ${this.pieceName(move.promotion)}으로 승진했습니다.`;
    }

    if (gameState.isCheckmate) {
      message += ` 체크메이트. ${gameState.winnerColor ? `${this.colorName(gameState.winnerColor)} 승리.` : ''}`;
    } else if (gameState.isDraw) {
      if (gameState.drawReason) {
        message += ` 무승부입니다. 사유: ${gameState.drawReason}.`;
      } else {
        message += ' 무승부입니다.';
      }
    } else if (gameState.isCheck) {
      message += ' 체크입니다.';
    } else {
      message += ` 현재 ${this.colorName(gameState.turn)} 차례입니다.`;
    }

    return message.trim();
  }

  describeGameReset(playerColor) {
    return `새 게임이 시작되었습니다. 당신은 ${this.colorName(playerColor)}입니다.`;
  }

  describeUndo() {
    return '최근 한 턴이 되돌려졌습니다.';
  }

  describeAiThinking() {
    return 'AI가 수를 탐색하고 있습니다.';
  }

  describeAiDone() {
    return 'AI 탐색이 끝났습니다.';
  }

  describePromotionPrompt(from, to) {
    return `${from}에서 ${to}로 이동하는 폰이 승진합니다. 승진할 기물을 선택하십시오.`;
  }

  describeTurnBlocked() {
    return '지금은 AI 차례입니다.';
  }

  describeGameOver(gameState) {
    if (gameState.isCheckmate) {
      return `대국 종료. ${this.colorName(gameState.winnerColor)} 승리입니다.`;
    }
    if (gameState.isDraw) {
      return `대국 종료. 무승부입니다${gameState.drawReason ? `(${gameState.drawReason})` : ''}.`;
    }
    return '대국이 종료되었습니다.';
  }

  describeForceAiBlocked() {
    return '현재는 AI가 둘 차례가 아닙니다.';
  }

  describeEmptySquare(square) {
    return `${square}는 빈칸입니다.`;
  }

  describeOpponentPiece(square) {
    return `${square}의 상대 기물은 직접 움직일 수 없습니다.`;
  }
}
