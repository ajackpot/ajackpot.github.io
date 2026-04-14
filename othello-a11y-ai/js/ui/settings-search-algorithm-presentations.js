import { doesSearchAlgorithmUseStyleEvaluator } from '../ai/presets.js';
import {
  DEFAULT_SEARCH_ALGORITHM,
  describeSearchAlgorithm,
  describeSearchAlgorithmAvailability,
  normalizeSearchAlgorithm,
} from '../ai/search-algorithms.js';

const DIFFICULTY_GROUP_KEYS = Object.freeze(['common', 'classic', 'mcts', 'guided', 'hybrid']);

const DIFFICULTY_DIALOG_PRESENTATIONS = Object.freeze({
  classic: {
    visibleGroupKeys: ['common', 'classic'],
    modeGroupsText: '공통 항목과 클래식 전용 항목',
  },
  'mcts-lite': {
    visibleGroupKeys: ['common', 'mcts'],
    modeGroupsText: '공통 항목과 MCTS 기본 항목',
  },
  'mcts-guided': {
    visibleGroupKeys: ['common', 'mcts', 'guided'],
    modeGroupsText: '공통 항목, MCTS 기본 항목, guided 보강 항목',
  },
  'mcts-hybrid': {
    visibleGroupKeys: ['common', 'mcts', 'guided', 'hybrid'],
    modeGroupsText: '공통 항목, MCTS 기본 항목, guided 보강 항목, hybrid 전용 항목',
  },
});

function getDifficultyDialogPresentation(searchAlgorithm = DEFAULT_SEARCH_ALGORITHM) {
  return DIFFICULTY_DIALOG_PRESENTATIONS[normalizeSearchAlgorithm(searchAlgorithm)]
    ?? DIFFICULTY_DIALOG_PRESENTATIONS.classic;
}

function getSearchAlgorithmLabel(searchAlgorithm = DEFAULT_SEARCH_ALGORITHM) {
  return describeSearchAlgorithm(searchAlgorithm)?.label ?? '현재 탐색 계열';
}

export function getDifficultyDialogVisibilityMap(searchAlgorithm = DEFAULT_SEARCH_ALGORITHM) {
  const visibleGroupKeys = new Set(getDifficultyDialogPresentation(searchAlgorithm).visibleGroupKeys);
  return Object.freeze(Object.fromEntries(
    DIFFICULTY_GROUP_KEYS.map((groupKey) => [groupKey, visibleGroupKeys.has(groupKey)]),
  ));
}

export function getDifficultyDialogModeNote(searchAlgorithm = DEFAULT_SEARCH_ALGORITHM) {
  const algorithmLabel = getSearchAlgorithmLabel(searchAlgorithm);
  const { modeGroupsText } = getDifficultyDialogPresentation(searchAlgorithm);
  return `${algorithmLabel}에서는 ${modeGroupsText}이 표시됩니다.`;
}

export function buildDifficultyStateNote({ isCustomDifficulty, searchAlgorithm }) {
  if (!isCustomDifficulty) {
    return '난이도 상세 설정은 난이도 프리셋에서 “사용자 지정”을 고르면 활성화됩니다.';
  }

  const algorithmLabel = getSearchAlgorithmLabel(searchAlgorithm);
  const { modeGroupsText } = getDifficultyDialogPresentation(searchAlgorithm);
  return `${algorithmLabel}에서는 ${modeGroupsText}을 난이도 상세 설정에서 조절할 수 있습니다.`;
}

export function buildSearchAlgorithmStyleUsageNote(searchAlgorithm = DEFAULT_SEARCH_ALGORITHM) {
  return doesSearchAlgorithmUseStyleEvaluator(searchAlgorithm)
    ? ''
    : '이 모드에서는 스타일 프리셋과 사용자 지정 스타일 가중치가 메인 탐색에 적용되지 않습니다.';
}

export function buildSearchAlgorithmNoteText(searchAlgorithm = DEFAULT_SEARCH_ALGORITHM, presetKey = 'normal') {
  const description = describeSearchAlgorithm(searchAlgorithm)?.description ?? '';
  const availability = describeSearchAlgorithmAvailability(presetKey);
  const styleUsageNote = buildSearchAlgorithmStyleUsageNote(searchAlgorithm);
  return [description, availability, styleUsageNote].filter(Boolean).join(' ');
}

export function getStyleDialogModeNote(searchAlgorithm = DEFAULT_SEARCH_ALGORITHM) {
  return doesSearchAlgorithmUseStyleEvaluator(searchAlgorithm)
    ? '현재 탐색 계열은 공유 evaluator를 사용하므로, 여기서 조절한 스타일 가중치가 그대로 적용됩니다.'
    : '현재 탐색 계열은 MCTS Lite이므로, 여기서 저장한 스타일 가중치는 보관되지만 메인 탐색에는 적용되지 않습니다.';
}

export function buildStyleStateNote({ isCustomStyle, searchAlgorithm }) {
  if (!doesSearchAlgorithmUseStyleEvaluator(searchAlgorithm)) {
    return isCustomStyle
      ? '사용자 지정 스타일이 선택되어 있지만, 현재 MCTS Lite 메인 탐색에는 적용되지 않습니다. 설정 값은 보관됩니다.'
      : '현재 탐색 계열은 MCTS Lite이므로 스타일 프리셋과 사용자 지정 스타일이 메인 탐색에 적용되지 않습니다. 선택값은 보관되며 다른 계열로 바꾸면 다시 적용됩니다.';
  }

  return isCustomStyle
    ? '사용자 지정 스타일이 켜져 있습니다. 스타일 상세 설정에서 평가 가중치 배율을 조절할 수 있습니다.'
    : '스타일 프리셋은 현재 난이도 위에 추가 성향 보정을 적용합니다. “사용자 지정”을 고르면 스타일 상세 설정 버튼이 활성화됩니다.';
}
