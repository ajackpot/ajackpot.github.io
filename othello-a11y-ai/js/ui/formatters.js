import { indexToCoord } from '../core/bitboard.js';

export const PLAYER_NAMES = Object.freeze({
  black: '흑',
  white: '백',
  draw: '무승부',
});

function playerName(color) {
  return PLAYER_NAMES[color] ?? color;
}

function joinCoords(coords) {
  if (!coords || coords.length === 0) {
    return '없음';
  }
  return coords.join(', ');
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatCellName(state, index, playableSet = new Set()) {
  const coord = indexToCoord(index);
  const occupant = state.getCellOccupant(index);
  if (occupant === 'black') {
    return `검은 돌 ${coord}`;
  }
  if (occupant === 'white') {
    return `흰 돌 ${coord}`;
  }
  if (playableSet.has(index)) {
    return `둘 수 있는 빈칸 ${coord}`;
  }
  return `빈칸 ${coord}`;
}

export function formatDiscSummary(counts) {
  return `흑 ${counts.black}, 백 ${counts.white}`;
}

export function formatLegalMovesList(legalMoves) {
  if (!legalMoves || legalMoves.length === 0) {
    return '없음';
  }
  return legalMoves.map((move) => move.coord).join(', ');
}

export function formatActionAnnouncement(action, counts = null) {
  if (!action) {
    return counts ? `현재 점수 ${formatDiscSummary(counts)}.` : '';
  }

  let message = '';
  if (action.type === 'pass') {
    message = `${playerName(action.color)} 패스.`;
  } else if (action.type === 'move') {
    const flipped = action.flippedCoords?.length
      ? `${joinCoords(action.flippedCoords)} 뒤집힘.`
      : '뒤집힌 돌 없음.';
    message = `${playerName(action.color)} ${action.coord} 착수. ${flipped}`;
  }

  if (counts) {
    message += ` 현재 점수 ${formatDiscSummary(counts)}.`;
  }
  return message.trim();
}

export function formatMoveLogEntry(action, moveNumber) {
  const prefix = Number.isFinite(moveNumber) ? `${moveNumber}. ` : '';
  if (!action) {
    return `${prefix}기록 없음`;
  }

  if (action.type === 'pass') {
    return `${prefix}${playerName(action.color)} 패스`;
  }

  const flippedText = action.flippedCoords?.length
    ? `뒤집힘: ${joinCoords(action.flippedCoords)}`
    : '뒤집힘 없음';
  return `${prefix}${playerName(action.color)} ${action.coord} 착수, ${flippedText}`;
}

export function formatResolvedOptionsList(options) {
  if (!options) {
    return [];
  }

  return [
    { label: '프리셋', value: options.label ?? options.presetKey ?? '알 수 없음' },
    { label: '최대 탐색 깊이', value: String(options.maxDepth) },
    { label: '수 읽기 제한 시간', value: `${options.timeLimitMs}ms` },
    { label: '후반 완전 탐색 시작 빈칸 수', value: String(options.exactEndgameEmpties) },
    { label: '흡입 창 크기', value: String(options.aspirationWindow) },
    { label: '초근접 수 무작위성 범위', value: String(options.randomness) },
    { label: '전이표 최대 엔트리 수', value: String(options.maxTableEntries) },
    { label: '기동성 배율', value: String(options.mobilityScale) },
    { label: '안정성 배율', value: String(options.stabilityScale) },
    { label: '프런티어 배율', value: String(options.frontierScale) },
    { label: '위치 배율', value: String(options.positionalScale) },
  ];
}

export function formatEngineSummaryLine(options) {
  if (!options) {
    return '엔진 설정 정보가 없습니다.';
  }
  const label = options.label ?? options.presetKey ?? '알 수 없음';
  return `${label} · 깊이 ${options.maxDepth} · 제한 ${options.timeLimitMs}ms · 후반 완전 탐색 ${options.exactEndgameEmpties}칸 이하`;
}

export function formatSearchSummary(result) {
  if (!result) {
    return '아직 AI 탐색 결과가 없습니다.';
  }

  if (result.error) {
    return `오류: ${result.error}`;
  }

  const best = result.bestMoveCoord ? `추천 ${result.bestMoveCoord}` : (result.didPass ? '패스' : '결과 없음');
  const depth = result.stats?.completedDepth ?? 0;
  const nodes = result.stats?.nodes ?? 0;
  const elapsed = result.stats?.elapsedMs ?? 0;
  const score = Number.isFinite(result.score) ? result.score : 0;
  const pv = Array.isArray(result.principalVariation) && result.principalVariation.length > 0
    ? result.principalVariation.map((index) => indexToCoord(index)).join(' → ')
    : '없음';
  return `${best}, 평가 ${score}, 완료 깊이 ${depth}, 탐색 노드 ${nodes}, 시간 ${elapsed}ms, 주 변형 ${pv}.`;
}

export function formatStateAnnouncement(state) {
  const counts = state.getDiscCounts();
  if (state.isTerminal()) {
    const winner = state.getWinner();
    if (winner === 'draw') {
      return `대국 종료. 무승부입니다. 최종 점수 ${formatDiscSummary(counts)}.`;
    }
    return `대국 종료. ${playerName(winner)} 승리. 최종 점수 ${formatDiscSummary(counts)}.`;
  }

  const legalMoves = state.getLegalMoves();
  return `현재 차례 ${playerName(state.currentPlayer)}. 현재 점수 ${formatDiscSummary(counts)}. 가능한 칸 ${legalMoves.length}개: ${formatLegalMovesList(legalMoves)}.`;
}
