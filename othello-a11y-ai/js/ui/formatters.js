import { indexToCoord } from '../core/bitboard.js';
import { doesSearchAlgorithmUseStyleEvaluator } from '../ai/presets.js';
import { describeSearchAlgorithm, isMctsSearchAlgorithm } from '../ai/search-algorithms.js';

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

function formatBooleanToggle(value) {
  return value === true ? '켬' : '끔';
}

function describeRootMaturityGateConfig(source = {}) {
  const gateMode = source.proofPriorityRootMaturityGateMode
    ?? source.mctsProofPriorityRootMaturityGateMode
    ?? 'best-metric-lte-1-or-solved-child';
  const targetMetricMode = source.proofPriorityRootMaturityGateMetricMode
    ?? source.mctsProofPriorityRootMaturityGateMetricMode
    ?? source.proofPriorityMetricMode
    ?? source.proofMetricMode
    ?? source.mctsProofMetricMode
    ?? 'legacy-root';
  const targetBiasMode = source.proofPriorityRootMaturityGateBiasMode
    ?? source.mctsProofPriorityRootMaturityGateBiasMode
    ?? source.proofPriorityBiasMode
    ?? source.mctsProofPriorityBiasMode
    ?? 'pnmax';
  const minVisits = Number.isFinite(Number(source.proofPriorityRootMaturityGateMinVisits ?? source.mctsProofPriorityRootMaturityGateMinVisits))
    ? Math.max(0, Math.round(Number(source.proofPriorityRootMaturityGateMinVisits ?? source.mctsProofPriorityRootMaturityGateMinVisits)))
    : 0;
  const bestFiniteMetricThreshold = Number.isFinite(Number(source.proofPriorityRootMaturityGateBestFiniteMetricThreshold ?? source.mctsProofPriorityRootMaturityGateBestFiniteMetricThreshold))
    ? Math.max(0, Math.round(Number(source.proofPriorityRootMaturityGateBestFiniteMetricThreshold ?? source.mctsProofPriorityRootMaturityGateBestFiniteMetricThreshold)))
    : 1;
  const requireNoSolvedChild = source.proofPriorityRootMaturityGateRequireNoSolvedChild === true
    || source.mctsProofPriorityRootMaturityGateRequireNoSolvedChild === true;
  const minDistinctFiniteMetricCount = Number.isFinite(Number(source.proofPriorityRootMaturityGateMinDistinctFiniteMetricCount ?? source.mctsProofPriorityRootMaturityGateMinDistinctFiniteMetricCount))
    ? Math.max(0, Math.round(Number(source.proofPriorityRootMaturityGateMinDistinctFiniteMetricCount ?? source.mctsProofPriorityRootMaturityGateMinDistinctFiniteMetricCount)))
    : 0;
  const detailParts = [];
  if (minVisits > 0) {
    detailParts.push(`visits≥${minVisits}`);
  }
  if (gateMode === 'best-metric-threshold' || gateMode === 'best-metric-threshold-or-solved-child') {
    detailParts.push(`metric≤${bestFiniteMetricThreshold}`);
  }
  if (requireNoSolvedChild) {
    detailParts.push('solved-child 없음');
  }
  if (minDistinctFiniteMetricCount > 0) {
    detailParts.push(`distinct≥${minDistinctFiniteMetricCount}`);
  }
  return {
    gateMode,
    targetMetricMode,
    targetBiasMode,
    detailText: detailParts.length > 0 ? ` [${detailParts.join(', ')}]` : '',
  };
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

export function formatLastActionSummary(action, moveNumber) {
  if (!action) {
    return '아직 착수가 없습니다.';
  }

  if (action.type === 'pass') {
    return `가장 최근 행동은 ${playerName(action.color)} 패스입니다.`;
  }

  const movePrefix = Number.isFinite(moveNumber) ? `${moveNumber}수째 ` : '';
  return `가장 최근 착수는 ${movePrefix}${playerName(action.color)} ${action.coord}입니다.`;
}

export function formatResolvedOptionsList(options) {
  if (!options) {
    return [];
  }

  const searchAlgorithm = describeSearchAlgorithm(options.searchAlgorithm);
  const isMctsMode = isMctsSearchAlgorithm(options.searchAlgorithm);

  const styleValue = doesSearchAlgorithmUseStyleEvaluator(options.searchAlgorithm)
    ? (options.styleLabel ?? options.styleKey ?? '알 수 없음')
    : `${options.configuredStyleLabel ?? options.styleLabel ?? options.styleKey ?? '알 수 없음'} (메인 탐색 미적용)`;

  return [
    { label: 'AI 모드', value: searchAlgorithm?.label ?? options.searchAlgorithm ?? '알 수 없음' },
    { label: '난이도 프리셋', value: options.label ?? options.presetKey ?? '알 수 없음' },
    { label: '스타일 프리셋', value: styleValue },
    ...(isMctsMode
      ? []
      : [{ label: '최대 탐색 깊이', value: String(options.maxDepth) }]),
    { label: '수 읽기 제한 시간', value: `${options.timeLimitMs}ms` },
    { label: '후반 완전 탐색 시작 빈칸 수', value: String(options.exactEndgameEmpties) },
    { label: '사전 승무패 탐색 범위', value: formatWldPreExactSetting(options.wldPreExactEmpties) },
    ...(isMctsMode
      ? []
      : [{ label: '흡입 창 크기', value: String(options.aspirationWindow) }]),
    { label: '오프닝 수 무작위성 범위', value: String(options.openingRandomness ?? options.randomness ?? 0) },
    { label: '오프닝 동률 시 무작위 선택', value: formatBooleanToggle(options.openingTieBreakRandomization) },
    { label: '중반 이후 근접 수 무작위성 범위', value: String(options.searchRandomness ?? options.randomness ?? 0) },
    { label: '전이표 최대 엔트리 수', value: String(options.maxTableEntries) },
    ...(isMctsMode
      ? [
        { label: 'MCTS 탐험 계수', value: String(options.mctsExploration ?? '') },
        { label: 'MCTS 최대 반복 수', value: String(options.mctsMaxIterations ?? '') },
        { label: 'MCTS 최대 트리 노드 수', value: String(options.mctsMaxNodes ?? '') },
        {
          label: 'MCTS proof-priority',
          value: (options.mctsProofPriorityEnabled !== false && Number(options.mctsProofPriorityScale ?? 0) > 0)
            ? (() => {
              const baseValue = `x${options.mctsProofPriorityScale} · ${options.mctsProofPriorityMaxEmpties ?? ''}칸 이하 · ${options.mctsProofMetricMode === 'per-player' ? 'per-player' : 'legacy-root'} · ${options.mctsProofPriorityBiasMode ?? 'rank'}`;
              let resolvedValue = baseValue;
              if (options.mctsProofPriorityLateBiasPackageMode === 'budget-conditioned') {
                const thresholdText = Number.isFinite(Number(options.mctsProofPriorityLateBiasThresholdMs))
                  ? `${Math.max(0, Math.round(Number(options.mctsProofPriorityLateBiasThresholdMs)))}ms`
                  : '?ms';
                const metricMode = options.mctsProofPriorityLateBiasMetricMode === 'per-player' ? 'per-player' : 'legacy-root';
                const biasMode = options.mctsProofPriorityLateBiasBiasMode ?? 'pnmax';
                resolvedValue = `${resolvedValue} · ${thresholdText}↑ ${metricMode}/${biasMode}`;
              }
              if (options.mctsProofPriorityRootMaturityGateEnabled === true) {
                const gateConfig = describeRootMaturityGateConfig(options);
                resolvedValue = `${resolvedValue} · root-gate ${gateConfig.gateMode}${gateConfig.detailText} → ${gateConfig.targetMetricMode}/${gateConfig.targetBiasMode}`;
              }
              return resolvedValue;
            })()
            : '끔',
        },
        {
          label: 'MCTS score-bounds',
          value: options.mctsScoreBoundsEnabled === true
            ? (
              Number(options.mctsScoreBoundDrawPriorityScale ?? 0) > 0
                ? `활성 · draw-blocker x${options.mctsScoreBoundDrawPriorityScale}`
                : '활성'
            )
            : '끔',
        },
        ...(searchAlgorithm?.key === 'mcts-hybrid'
          ? [
            { label: 'Hybrid prior minimax 깊이', value: String(options.mctsHybridMinimaxDepth ?? '') },
            { label: 'Hybrid prior 후보 수', value: String(options.mctsHybridMinimaxTopK ?? '') },
          ]
          : []),
      ]
      : []),
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
  const searchAlgorithm = describeSearchAlgorithm(options.searchAlgorithm);
  const styleMainLaneSuffix = doesSearchAlgorithmUseStyleEvaluator(options.searchAlgorithm)
    ? ''
    : ' · 메인 탐색 스타일 미적용';

  if (isMctsSearchAlgorithm(options.searchAlgorithm)) {
    return `${searchAlgorithm?.summaryLabel ?? searchAlgorithm?.label ?? 'MCTS'} · ${presetLabel} · ${styleLabel} · 제한 ${options.timeLimitMs}ms · 탐험 ${options.mctsExploration ?? ''} · 후반 완전 탐색 ${options.exactEndgameEmpties}칸 이하 · 사전 WLD ${formatWldPreExactSetting(options.wldPreExactEmpties, { compact: true })}${styleMainLaneSuffix}`;
  }

  return `${searchAlgorithm?.summaryLabel ?? searchAlgorithm?.label ?? '클래식'} · ${presetLabel} · ${styleLabel} · 깊이 ${options.maxDepth} · 제한 ${options.timeLimitMs}ms · 후반 완전 탐색 ${options.exactEndgameEmpties}칸 이하 · 사전 WLD ${formatWldPreExactSetting(options.wldPreExactEmpties, { compact: true })}${styleMainLaneSuffix}`;
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

function formatDiscMarginScore(score) {
  if (!Number.isFinite(score)) {
    return '?';
  }
  const discs = Math.round(score / 10000);
  return discs > 0 ? `+${discs}` : `${discs}`;
}

function formatMctsProofSource(source) {
  if (source === 'exact-continuation') {
    return 'root exact continuation';
  }
  if (source === 'propagated-exact') {
    return 'subtree exact 전파';
  }
  if (source === 'propagated') {
    return 'subtree WLD 전파';
  }
  if (source === 'score-bounds') {
    return 'score-bound 전파';
  }
  if (source === 'score-bounds-exact') {
    return 'score-bound exact 전파';
  }
  if (source === 'solver' || source === 'wld' || source === 'exact') {
    return '직접 solver';
  }
  if (source === 'terminal') {
    return '종료 상태';
  }
  return source ? String(source) : '미상';
}

export function formatMctsProofSummary(result) {
  if (!result || result.error || !isMctsSearchAlgorithm(result.searchMode)) {
    return '';
  }

  const proof = result.mctsProofTelemetry;
  if (!proof || typeof proof !== 'object') {
    return '';
  }

  const analyzedMoveCount = Number.isInteger(proof.analyzedMoveCount) ? proof.analyzedMoveCount : 0;
  const legalMoveCount = Number.isInteger(proof.legalMoveCount) ? proof.legalMoveCount : 0;
  const candidateMoveCount = Number.isInteger(proof.candidateMoveCount)
    ? proof.candidateMoveCount
    : (legalMoveCount > 0 ? legalMoveCount : analyzedMoveCount);
  const solvedMoveCount = Number.isInteger(proof.solvedMoveCount) ? proof.solvedMoveCount : 0;
  const exactSolvedMoveCount = Number.isInteger(proof.exactSolvedMoveCount) ? proof.exactSolvedMoveCount : 0;
  const wldSolvedMoveCount = Number.isInteger(proof.wldSolvedMoveCount) ? proof.wldSolvedMoveCount : 0;
  const unresolvedMoveCount = Number.isInteger(proof.unresolvedMoveCount)
    ? proof.unresolvedMoveCount
    : Math.max(0, candidateMoveCount - solvedMoveCount);
  const sourceText = formatMctsProofSource(proof.rootSolvedSource);

  let rootText = '루트 미증명';
  if (proof.rootSolved) {
    const outcomeText = formatWldOutcome(proof.rootSolvedOutcome, proof.rootSolvedScore)
      .replace(' 확정', '');
    rootText = proof.rootSolvedExact
      ? `루트 exact ${outcomeText}`
      : `루트 WLD ${outcomeText}`;
  }

  const coverageText = candidateMoveCount > 0
    ? `후보 증명 ${solvedMoveCount}/${candidateMoveCount}`
    : '후보 증명 없음';
  const detailText = `정확 ${exactSolvedMoveCount}, WLD ${wldSolvedMoveCount}, 미해결 ${unresolvedMoveCount}`;

  const extraNotes = [];
  if (proof.continuationApplied) {
    extraNotes.push(proof.adaptiveContinuationTriggered ? 'adaptive continuation 적용' : 'continuation 적용');
  } else if (proof.continuationAttempted && !proof.continuationCompleted) {
    extraNotes.push(proof.adaptiveContinuationTriggered ? 'adaptive continuation 미완료' : 'continuation 미완료');
  } else if (proof.continuationEnabled && proof.continuationDepthEligible && !proof.rootSolvedExact) {
    extraNotes.push('continuation 창 안');
  } else if (proof.adaptiveContinuationEnabled && proof.adaptiveContinuationEligible && !proof.rootSolvedExact) {
    extraNotes.push('adaptive continuation 후보');
  }
  if (proof.proofPrioritySuppressedByContinuationWindow) {
    extraNotes.push('proof→continuation handoff');
  }
  if (proof.rootInLateSolverWindow) {
    extraNotes.push('root late-solver 창 안');
  }
  if (proof.scoreBoundsEnabled) {
    const lowerBound = Number.isFinite(proof.rootScoreLowerBound) ? proof.rootScoreLowerBound : null;
    const upperBound = Number.isFinite(proof.rootScoreUpperBound) ? proof.rootScoreUpperBound : null;
    const hasMeaningfulBounds = lowerBound !== null && upperBound !== null
      && (lowerBound > -640000 || upperBound < 640000);
    if (hasMeaningfulBounds) {
      extraNotes.push(`score-bound ${formatDiscMarginScore(lowerBound)}..${formatDiscMarginScore(upperBound)}`);
    }
    if ((proof.scoreBoundDominatedChildrenSkipped ?? 0) > 0) {
      extraNotes.push(`bound cuts ${proof.scoreBoundDominatedChildrenSkipped}`);
    }
    if (proof.scoreBoundDrawPriorityEnabled && Number(proof.scoreBoundDrawPriorityScale ?? 0) > 0) {
      const blockerSuffix = (proof.scoreBoundDrawPriorityBlockerCount ?? 0) > 0
        ? ` · blockers ${proof.scoreBoundDrawPriorityBlockerCount}`
        : '';
      extraNotes.push(`draw-blocker x${proof.scoreBoundDrawPriorityScale}${blockerSuffix}`);
    }
  }
  if (proof.proofPriorityEnabled && proof.proofPriorityDepthEligible) {
    const biasLabel = proof.proofPriorityBiasMode === 'pnmax'
      ? 'pnmax'
      : proof.proofPriorityBiasMode === 'pnsum'
        ? 'pnsum'
        : 'rank';
    if (proof.proofPriorityMetricMode === 'per-player') {
      const playerLabel = proof.proofPriorityMetricPlayer === 'white'
        ? '백'
        : proof.proofPriorityMetricPlayer === 'black'
          ? '흑'
          : null;
      extraNotes.push(
        playerLabel
          ? `proof-priority x${proof.proofPriorityScale ?? 0} (per-player ${playerLabel} · ${biasLabel})`
          : `proof-priority x${proof.proofPriorityScale ?? 0} (per-player · ${biasLabel})`,
      );
    } else {
      const metricBase = proof.proofPriorityMetric === 'disproofNumber'
        ? 'legacy disproof'
        : 'legacy proof';
      const metricLabel = biasLabel === 'rank'
        ? `${metricBase}-rank`
        : `${metricBase} · ${biasLabel}`;
      extraNotes.push(`proof-priority x${proof.proofPriorityScale ?? 0} (${metricLabel})`);
    }
  }
  if (proof.proofPriorityLateBiasActivated) {
    extraNotes.push(`late-bias package ≥${proof.proofPriorityLateBiasThresholdMs ?? 0}ms (${proof.proofPriorityLateBiasMetricMode ?? proof.proofMetricMode} · ${proof.proofPriorityLateBiasBiasMode ?? proof.proofPriorityBiasMode})`);
  }
  if (proof.proofPriorityRootMaturityGateEnabled) {
    const gateConfig = describeRootMaturityGateConfig(proof);
    if (proof.proofPriorityRootMaturityGateActivated) {
      const activationIteration = Number.isFinite(proof.proofPriorityRootMaturityGateActivationIteration)
        ? ` @${proof.proofPriorityRootMaturityGateActivationIteration}`
        : '';
      extraNotes.push(`root-gate ${gateConfig.gateMode}${gateConfig.detailText}${activationIteration} → ${gateConfig.targetMetricMode}/${gateConfig.targetBiasMode}`);
    } else if (proof.proofPriorityRootMaturityGateFinalEligible) {
      extraNotes.push(`root-gate final-eligible (${gateConfig.gateMode}${gateConfig.detailText} → ${gateConfig.targetMetricMode}/${gateConfig.targetBiasMode})`);
    }
  }

  const noteText = extraNotes.length > 0
    ? `, ${extraNotes.join(', ')}`
    : '';

  return `${rootText}, ${coverageText} (${detailText}), 출처 ${sourceText}${noteText}.`;
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

  if (isMctsSearchAlgorithm(result.searchMode)) {
    const iterations = result.stats?.mctsIterations ?? 0;
    const rollouts = result.stats?.mctsRollouts ?? 0;
    const treeNodes = result.stats?.mctsTreeNodes ?? 0;
    const rolloutPlies = result.stats?.mctsRolloutPlies ?? 0;
    const averageRolloutLength = rollouts > 0
      ? Math.round((rolloutPlies / rollouts) * 10) / 10
      : 0;
    const cutoffEvaluations = result.stats?.mctsCutoffEvaluations ?? 0;
    const guidedPolicySelections = result.stats?.mctsGuidedPolicySelections ?? 0;
    const hybridPriorSearches = result.stats?.mctsHybridPriorSearches ?? 0;
    const hybridPriorUses = result.stats?.mctsHybridPriorUses ?? 0;
    const algorithmLabel = describeSearchAlgorithm(result.searchMode)?.summaryLabel
      ?? describeSearchAlgorithm(result.options?.searchAlgorithm)?.summaryLabel
      ?? 'MCTS';

    if (result.searchCompletion === 'heuristic-fallback') {
      return `${best}, ${algorithmLabel} 예열이 충분하지 않아 휴리스틱 대체, 평가 ${score}, 시간 ${elapsed}ms.`;
    }

    if (result.searchMode === 'mcts-hybrid') {
      return `${best}, ${algorithmLabel}, 평가 ${score}, 반복 ${iterations}, 롤아웃 ${rollouts}, 트리 노드 ${treeNodes}, 평균 롤아웃 길이 ${averageRolloutLength}수, 컷오프 평가 ${cutoffEvaluations}, 유도 선택 ${guidedPolicySelections}, hybrid prior ${hybridPriorUses}/${hybridPriorSearches}, 시간 ${elapsed}ms, 주 변형 ${pv}.`;
    }

    if (result.searchMode === 'mcts-guided') {
      return `${best}, ${algorithmLabel}, 평가 ${score}, 반복 ${iterations}, 롤아웃 ${rollouts}, 트리 노드 ${treeNodes}, 평균 롤아웃 길이 ${averageRolloutLength}수, 컷오프 평가 ${cutoffEvaluations}, 유도 선택 ${guidedPolicySelections}, 시간 ${elapsed}ms, 주 변형 ${pv}.`;
    }

    return `${best}, ${algorithmLabel}, 평가 ${score}, 반복 ${iterations}, 롤아웃 ${rollouts}, 트리 노드 ${treeNodes}, 평균 롤아웃 길이 ${averageRolloutLength}수, 시간 ${elapsed}ms, 주 변형 ${pv}.`;
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
