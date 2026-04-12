export const DEFAULT_SEARCH_ALGORITHM = 'classic';
const BEGINNER_SEARCH_ALGORITHM_KEYS = Object.freeze(['classic', 'mcts-lite', 'mcts-guided']);
const DEFAULT_PRESET_SEARCH_ALGORITHM_KEYS = Object.freeze(['classic', 'mcts-guided', 'mcts-hybrid']);

export const SEARCH_ALGORITHM_OPTIONS = Object.freeze({
  classic: {
    key: 'classic',
    label: '클래식 탐색',
    summaryLabel: '클래식',
    description: '현재 기본 엔진의 iterative deepening + alpha-beta / PVS 계열 탐색을 사용합니다.',
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
    label: 'MCTS Guided (실험)',
    summaryLabel: 'MCTS Guided',
    description: 'UCT 기반 MCTS에 progressive bias, heavy playout, rollout cutoff evaluator, opening prior / ordering 기반 유도 정책을 얹은 실험 모드입니다. 말기 exact/WLD 구간은 기존 끝내기 탐색을 그대로 재사용합니다.',
    experimental: true,
  },
  'mcts-hybrid': {
    key: 'mcts-hybrid',
    label: 'MCTS Hybrid (실험)',
    summaryLabel: 'MCTS Hybrid',
    description: 'MCTS Guided 위에 shallow minimax / alpha-beta prior를 새로 확장되는 노드에만 얹는 informed-prior 실험 모드입니다. guided rollout과 말기 exact/WLD 구간을 함께 재사용합니다.',
    experimental: true,
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
    ? '입문 난이도에서는 MCTS Lite와 MCTS Guided를 고를 수 있고, MCTS Hybrid는 쉬움 이상 난이도에서 대신 노출됩니다.'
    : '쉬움 이상 난이도에서는 MCTS Guided와 MCTS Hybrid를 고를 수 있으며, 입문 난이도에서는 Hybrid 대신 Lite가 노출됩니다.';
}

export function isMctsSearchAlgorithm(value) {
  return normalizeSearchAlgorithm(value).startsWith('mcts-');
}
