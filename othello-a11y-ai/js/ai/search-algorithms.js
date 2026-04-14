export const DEFAULT_SEARCH_ALGORITHM = 'classic-mtdf-2ply';
const BEGINNER_SEARCH_ALGORITHM_KEYS = Object.freeze(['classic-mtdf-2ply', 'classic', 'mcts-lite', 'mcts-guided']);
const DEFAULT_PRESET_SEARCH_ALGORITHM_KEYS = Object.freeze(['classic-mtdf-2ply', 'classic', 'mcts-guided', 'mcts-hybrid']);

export const SEARCH_ALGORITHM_OPTIONS = Object.freeze({
  classic: {
    key: 'classic',
    label: 'Classic PVS',
    summaryLabel: 'Classic PVS',
    description: '기존 iterative deepening + alpha-beta / PVS root driver를 사용하는 클래식 계열 옵션입니다. 기본 엔진 계열 중 비교 기준선으로 유지됩니다.',
    experimental: false,
  },
  'classic-mtdf': {
    key: 'classic-mtdf',
    label: 'Classic MTD(f) · 1-ply guess (내부)',
    summaryLabel: 'Classic MTD(f) 1ply',
    description: '클래식 엔진의 depth-limited 구간에서 1-ply-back first guess를 쓰는 내부 비교용 MTD(f) driver입니다. 설정 UI 기본 목록에는 올리지 않고 벤치/회귀 용도로만 남깁니다.',
    experimental: true,
  },
  'classic-mtdf-2ply': {
    key: 'classic-mtdf-2ply',
    label: 'Classic MTD(f)',
    summaryLabel: 'Classic MTD(f)',
    description: '현재 기본 클래식 엔진입니다. depth-limited 구간에서 2-ply-back first guess를 쓰는 MTD(f) + zero-window root driver를 사용합니다.',
    experimental: false,
  },
  'mcts-lite': {
    key: 'mcts-lite',
    label: 'MCTS Lite (입문 전용 실험)',
    summaryLabel: 'MCTS Lite',
    description: 'UCT 기반 Monte Carlo Tree Search에 순수 랜덤 롤아웃을 사용하는 baseline 실험 모드입니다. 말기 exact/WLD 구간은 기존 끝내기 탐색을 그대로 재사용합니다.',
    experimental: true,
  },
  'mcts-guided': {
    key: 'mcts-guided',
    label: 'MCTS Guided',
    summaryLabel: 'MCTS Guided',
    description: 'UCT 기반 MCTS에 progressive bias, heavy playout, rollout cutoff evaluator, opening prior / ordering 기반 유도 정책을 얹은 guided 탐색 모드입니다. 말기 exact/WLD 구간은 기존 끝내기 탐색을 그대로 재사용합니다.',
    experimental: false,
  },
  'mcts-hybrid': {
    key: 'mcts-hybrid',
    label: 'MCTS Hybrid',
    summaryLabel: 'MCTS Hybrid',
    description: 'MCTS Guided 위에 shallow minimax / alpha-beta prior를 새로 확장되는 노드에만 얹는 informed-prior 탐색 모드입니다. guided rollout과 말기 exact/WLD 구간을 함께 재사용합니다.',
    experimental: false,
  },
});

export function normalizeSearchAlgorithm(value) {
  return SEARCH_ALGORITHM_OPTIONS[value]
    ? value
    : DEFAULT_SEARCH_ALGORITHM;
}

export function getAllowedSearchAlgorithmKeysForPreset(presetKey = 'normal') {
  return presetKey === 'beginner'
    ? BEGINNER_SEARCH_ALGORITHM_KEYS
    : DEFAULT_PRESET_SEARCH_ALGORITHM_KEYS;
}

function mapUnavailableSearchAlgorithm(value, presetKey = 'normal') {
  const normalized = normalizeSearchAlgorithm(value);
  const allowedKeys = getAllowedSearchAlgorithmKeysForPreset(presetKey);
  if (allowedKeys.includes(normalized)) {
    return normalized;
  }

  if (normalized === 'classic-mtdf' && allowedKeys.includes('classic-mtdf-2ply')) {
    return 'classic-mtdf-2ply';
  }

  if (normalized === 'mcts-hybrid' && allowedKeys.includes('mcts-lite')) {
    return 'mcts-lite';
  }

  if (normalized === 'mcts-lite' && allowedKeys.includes('mcts-guided')) {
    return 'mcts-guided';
  }

  return allowedKeys[0] ?? DEFAULT_SEARCH_ALGORITHM;
}

export function normalizeSearchAlgorithmForPreset(value, presetKey = 'normal') {
  return mapUnavailableSearchAlgorithm(value, presetKey);
}

export function describeSearchAlgorithm(value) {
  return SEARCH_ALGORITHM_OPTIONS[normalizeSearchAlgorithm(value)];
}

export function listSearchAlgorithmEntries(presetKey = null) {
  if (typeof presetKey === 'string') {
    return getAllowedSearchAlgorithmKeysForPreset(presetKey).map((key) => SEARCH_ALGORITHM_OPTIONS[key]);
  }
  return Object.values(SEARCH_ALGORITHM_OPTIONS);
}

export function describeSearchAlgorithmAvailability(presetKey = 'normal') {
  return presetKey === 'beginner'
    ? '입문 난이도에서는 Classic MTD(f), Classic PVS, MCTS Lite, MCTS Guided를 고를 수 있고, MCTS Hybrid는 쉬움 이상 난이도에서 대신 노출됩니다.'
    : '쉬움 이상 난이도에서는 Classic MTD(f)가 기본으로 노출되고 Classic PVS, MCTS Guided, MCTS Hybrid를 함께 고를 수 있습니다. 입문 난이도에서는 Hybrid 대신 Lite가 노출됩니다.';
}

export function isMctsSearchAlgorithm(value) {
  return normalizeSearchAlgorithm(value).startsWith('mcts-');
}
