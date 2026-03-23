const TURN_NAMES = {
  w: '백',
  b: '흑',
};

function formatEvaluation(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '-';
  }
  return value.toFixed(3);
}

export class StatusView {
  constructor({
    turnStatus,
    gameStatus,
    engineStatus,
    difficultyStatus,
    engineSimulations,
    engineEvaluation,
    engineCandidates,
    engineConfig,
    moveLog,
  }) {
    this.turnStatus = turnStatus;
    this.gameStatus = gameStatus;
    this.engineStatus = engineStatus;
    this.difficultyStatus = difficultyStatus;
    this.engineSimulations = engineSimulations;
    this.engineEvaluation = engineEvaluation;
    this.engineCandidates = engineCandidates;
    this.engineConfig = engineConfig;
    this.moveLog = moveLog;
  }

  update(snapshot, engineSnapshot) {
    this.turnStatus.textContent = TURN_NAMES[snapshot.turn];
    this.gameStatus.textContent = this.describeGameState(snapshot.gameState);
    this.engineStatus.textContent = engineSnapshot.statusText;
    this.difficultyStatus.textContent = engineSnapshot.difficultyLabel;
    this.engineSimulations.textContent = engineSnapshot.simulationsText;
    this.engineEvaluation.textContent = engineSnapshot.evaluationText;
    this.engineCandidates.textContent = engineSnapshot.candidatesText;
    this.engineConfig.textContent = engineSnapshot.configSummary;
    this.renderMoveLog(snapshot.history);
  }

  describeGameState(gameState) {
    if (gameState.isCheckmate) {
      return `체크메이트 · ${TURN_NAMES[gameState.winnerColor]} 승리`;
    }
    if (gameState.isDraw) {
      return gameState.drawReason ? `무승부 · ${gameState.drawReason}` : '무승부';
    }
    if (gameState.isCheck) {
      return '체크';
    }
    return '진행 중';
  }

  renderMoveLog(history) {
    this.moveLog.replaceChildren();

    const pairedMoves = [];
    for (let index = 0; index < history.length; index += 2) {
      pairedMoves.push({
        moveNumber: index / 2 + 1,
        white: history[index]?.san ?? '',
        black: history[index + 1]?.san ?? '',
      });
    }

    if (pairedMoves.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.textContent = '아직 착수가 없습니다.';
      this.moveLog.appendChild(emptyItem);
      return;
    }

    for (const pair of pairedMoves) {
      const item = document.createElement('li');
      item.textContent = `${pair.moveNumber}. ${pair.white}${pair.black ? ` ${pair.black}` : ''}`;
      this.moveLog.appendChild(item);
    }
  }

  static createEngineSnapshot({
    statusText = '대기 중',
    difficultyLabel = '-',
    simulations = null,
    evaluation = null,
    candidates = [],
    configSummary = '-',
  }) {
    const candidatesText =
      candidates.length > 0
        ? candidates
            .map((candidate) => `${candidate.san}(${candidate.visits}/${formatEvaluation(candidate.value)})`)
            .join(', ')
        : '-';

    return {
      statusText,
      difficultyLabel,
      simulationsText: simulations === null ? '-' : String(simulations),
      evaluationText: evaluation === null ? '-' : formatEvaluation(evaluation),
      candidatesText,
      configSummary,
    };
  }
}
