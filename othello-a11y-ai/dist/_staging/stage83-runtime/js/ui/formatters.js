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

function joinNames(names) {
  if (!Array.isArray(names) || names.length === 0) {
    return '없음';
  }
  return names.join(' / ');
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

export function formatWldPreExactSetting(value, { compact = false } = {}) {
  const numericValue = Math.max(0, Math.round(Number.isFinite(Number(value)) ? Number(value) : 0));
  if (numericValue <= 0) {
    return compact ? '끔' : '사용 안 함';
  }
  return compact ? `+${numericValue}` : `+${numericValue} 사용`;
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
    { label: '난이도 프리셋', value: options.label ?? options.presetKey ?? '알 수 없음' },
    { label: '스타일 프리셋', value: options.styleLabel ?? options.styleKey ?? '알 수 없음' },
    { label: '최대 탐색 깊이', value: String(options.maxDepth) },
    { label: '수 읽기 제한 시간', value: `${options.timeLimitMs}ms` },
    { label: '후반 완전 탐색 시작 빈칸 수', value: String(options.exactEndgameEmpties) },
    { label: '사전 승무패 탐색 범위', value: formatWldPreExactSetting(options.wldPreExactEmpties) },
    { label: '흡입 창 크기', value: String(options.aspirationWindow) },
    { label: '오프닝 수 무작위성 범위', value: String(options.openingRandomness ?? options.randomness ?? 0) },
    { label: '중반 이후 근접 수 무작위성 범위', value: String(options.searchRandomness ?? options.randomness ?? 0) },
    { label: '전이표 최대 엔트리 수', value: String(options.maxTableEntries) },
    { label: '기동성 배율', value: String(options.mobilityScale) },
    { label: '잠재 기동성 배율', value: String(options.potentialMobilityScale) },
    { label: '코너 배율', value: String(options.cornerScale) },
    { label: '코너 인접 위험 배율', value: String(options.cornerAdjacencyScale) },
    { label: '안정성 배율', value: String(options.stabilityScale) },
    { label: '프런티어 배율', value: String(options.frontierScale) },
    { label: '위치 배율', value: String(options.positionalScale) },
    { label: '패리티 배율', value: String(options.parityScale) },
    { label: '돌 수 배율', value: String(options.discScale) },
    { label: '위험 칸 패널티 배율', value: String(options.riskPenaltyScale) },
  ];
}

export function formatEngineSummaryLine(options) {
  if (!options) {
    return '엔진 설정 정보가 없습니다.';
  }
  const presetLabel = options.label ?? options.presetKey ?? '알 수 없음';
  const styleLabel = options.styleApplied === false
    ? '스타일 적용 안 함'
    : options.styleLabel ?? options.styleKey ?? '알 수 없음';
  return `${presetLabel} · ${styleLabel} · 깊이 ${options.maxDepth} · 제한 ${options.timeLimitMs}ms · 후반 완전 탐색 ${options.exactEndgameEmpties}칸 이하 · 사전 WLD ${formatWldPreExactSetting(options.wldPreExactEmpties, { compact: true })}`;
}

function formatWldOutcome(outcome, score) {
  if (outcome === 'win') {
    return '승리 확정';
  }
  if (outcome === 'loss') {
    return '패배 확정';
  }
  if (outcome === 'draw') {
    return '무승부 확정';
  }
  if (score > 0) {
    return '승리 확정';
  }
  if (score < 0) {
    return '패배 확정';
  }
  return '무승부 확정';
}

export function formatSearchSummary(result) {
  if (!result) {
    return '아직 AI 탐색 결과가 없습니다.';
  }

  if (result.error) {
    return `오류: ${result.error}`;
  }

  const best = result.bestMoveCoord ? `추천 ${result.bestMoveCoord}` : (result.didPass ? '패스' : '결과 없음');
  const elapsed = result.stats?.elapsedMs ?? 0;

  if (result.source === 'opening-book') {
    const names = result.bookHit?.chosenNames ?? result.bookHit?.matchedNames ?? result.bookHit?.topNames ?? [];
    const candidateCount = result.bookHit?.candidateCount ?? 0;
    return `${best}, 오프닝북 직선택, 대표 계열 ${joinNames(names)}, 후보 ${candidateCount}개, 시간 ${elapsed}ms.`;
  }

  const depth = result.stats?.completedDepth ?? 0;
  const nodes = result.stats?.nodes ?? 0;
  const ttHits = result.stats?.ttHits ?? 0;
  const score = Number.isFinite(result.score) ? result.score : 0;
  const rootEmptyCount = Number.isInteger(result.rootEmptyCount) ? result.rootEmptyCount : null;
  const rootAnalyzedMoveCount = Number.isInteger(result.rootAnalyzedMoveCount) ? result.rootAnalyzedMoveCount : null;
  const rootLegalMoveCount = Number.isInteger(result.rootLegalMoveCount) ? result.rootLegalMoveCount : null;
  const pv = Array.isArray(result.principalVariation) && result.principalVariation.length > 0
    ? result.principalVariation.map((index) => indexToCoord(index)).join(' → ')
    : '없음';
  const bookNote = result.bookHit
    ? ` 오프닝북 참고 ${joinNames(result.bookHit.matchedNames?.length ? result.bookHit.matchedNames : result.bookHit.topNames)}.`
    : '';

  if (result.searchMode === 'terminal') {
    return `대국 종료 상태, 평가 ${score}, 시간 ${elapsed}ms.`;
  }

  if (result.searchMode === 'exact-endgame') {
    const emptyCountText = rootEmptyCount === null ? '' : `현재 빈칸 ${rootEmptyCount}칸, `;
    if (result.isExactResult) {
      return `${best}, 정확 끝내기, ${emptyCountText}평가 ${score}, 탐색 노드 ${nodes}, TT 적중 ${ttHits}, 시간 ${elapsed}ms, 주 변형 ${pv}.${bookNote}`;
    }

    const partialRootText = rootAnalyzedMoveCount === null || rootLegalMoveCount === null
      ? ''
      : `, 검토 루트 수 ${rootAnalyzedMoveCount}/${rootLegalMoveCount}`;

    if (result.searchCompletion === 'partial-timeout') {
      return `${best}, 정확 끝내기 시간 만료로 현재까지 최선 수 반환, ${emptyCountText}평가 ${score}${partialRootText}, 완료 깊이 ${depth}, 탐색 노드 ${nodes}, TT 적중 ${ttHits}, 시간 ${elapsed}ms, 주 변형 ${pv}.${bookNote}`;
    }

    return `${best}, 정확 끝내기 미완료로 휴리스틱 대체, ${emptyCountText}평가 ${score}, 완료 깊이 ${depth}, 탐색 노드 ${nodes}, TT 적중 ${ttHits}, 시간 ${elapsed}ms, 주 변형 ${pv}.${bookNote}`;
  }

  if (result.searchMode === 'wld-endgame') {
    const emptyCountText = rootEmptyCount === null ? '' : `현재 빈칸 ${rootEmptyCount}칸, `;
    const outcomeText = formatWldOutcome(result.wldOutcome, score);
    const partialRootText = rootAnalyzedMoveCount === null || rootLegalMoveCount === null
      ? ''
      : `, 검토 루트 수 ${rootAnalyzedMoveCount}/${rootLegalMoveCount}`;

    if (result.searchCompletion === 'complete') {
      return `${best}, 승무패 끝내기, ${emptyCountText}${outcomeText}, 탐색 노드 ${nodes}, TT 적중 ${ttHits}, 시간 ${elapsed}ms, 주 변형 ${pv}.${bookNote}`;
    }

    if (result.searchCompletion === 'partial-timeout') {
      return `${best}, 승무패 끝내기 시간 만료로 현재까지 최선 수 반환, ${emptyCountText}${outcomeText}${partialRootText}, 완료 깊이 ${depth}, 탐색 노드 ${nodes}, TT 적중 ${ttHits}, 시간 ${elapsed}ms, 주 변형 ${pv}.${bookNote}`;
    }

    return `${best}, 승무패 끝내기 미완료로 휴리스틱 대체, ${emptyCountText}평가 ${score}, 완료 깊이 ${depth}, 탐색 노드 ${nodes}, TT 적중 ${ttHits}, 시간 ${elapsed}ms, 주 변형 ${pv}.${bookNote}`;
  }

  return `${best}, 평가 ${score}, 완료 깊이 ${depth}, 탐색 노드 ${nodes}, TT 적중 ${ttHits}, 시간 ${elapsed}ms, 주 변형 ${pv}.${bookNote}`;
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
