const SCALE_FIELD_KEYS = Object.freeze([
  'mobilityScale',
  'potentialMobilityScale',
  'cornerScale',
  'cornerAdjacencyScale',
  'stabilityScale',
  'frontierScale',
  'positionalScale',
  'parityScale',
  'discScale',
  'riskPenaltyScale',
]);

const BASE_ENGINE_DEFAULTS = Object.freeze({
  maxDepth: 6,
  timeLimitMs: 1500,
  exactEndgameEmpties: 10,
  aspirationWindow: 50,
  randomness: 0,
  maxTableEntries: 200000,
  mobilityScale: 1,
  potentialMobilityScale: 1,
  cornerScale: 1,
  cornerAdjacencyScale: 1,
  stabilityScale: 1,
  frontierScale: 1,
  positionalScale: 1,
  parityScale: 1,
  discScale: 1,
  riskPenaltyScale: 1,
});

export const DEFAULT_STYLE_KEY = 'balanced';

export const ENGINE_STYLE_PRESETS = Object.freeze({
  balanced: {
    label: '균형형',
    description: '기본 엔진 감각을 유지하는 표준 성향입니다.',
    mobilityScale: 1,
    potentialMobilityScale: 1,
    cornerScale: 1,
    cornerAdjacencyScale: 1,
    stabilityScale: 1,
    frontierScale: 1,
    positionalScale: 1,
    parityScale: 1,
    discScale: 1,
    riskPenaltyScale: 1,
    randomnessBonus: 0,
  },
  aggressive: {
    label: '공격형',
    description: '기동성과 판 흔들기를 더 중시하고 위험을 조금 더 감수합니다.',
    mobilityScale: 1.25,
    potentialMobilityScale: 1.25,
    cornerScale: 1.02,
    cornerAdjacencyScale: 0.85,
    stabilityScale: 0.9,
    frontierScale: 0.85,
    positionalScale: 0.9,
    parityScale: 1,
    discScale: 1.15,
    riskPenaltyScale: 0.75,
    randomnessBonus: 10,
  },
  fortress: {
    label: '봉쇄형',
    description: '상대 기동성 억제, 프런티어 관리, 안정성을 더 강하게 추구합니다.',
    mobilityScale: 1.18,
    potentialMobilityScale: 1.25,
    cornerScale: 1.08,
    cornerAdjacencyScale: 1.18,
    stabilityScale: 1.3,
    frontierScale: 1.25,
    positionalScale: 1.05,
    parityScale: 1.05,
    discScale: 0.85,
    riskPenaltyScale: 1.15,
    randomnessBonus: 0,
  },
  positional: {
    label: '포지션형',
    description: '코너와 위치 감각, 코너 인접 위험 회피를 더 강하게 반영합니다.',
    mobilityScale: 0.95,
    potentialMobilityScale: 0.9,
    cornerScale: 1.15,
    cornerAdjacencyScale: 1.35,
    stabilityScale: 1.1,
    frontierScale: 0.95,
    positionalScale: 1.35,
    parityScale: 1,
    discScale: 0.85,
    riskPenaltyScale: 1.3,
    randomnessBonus: 0,
  },
  chaotic: {
    label: '변칙형',
    description: '가까운 후보 수 사이에서 더 다양한 선택을 하고 위험 관리 비중을 낮춥니다.',
    mobilityScale: 1.08,
    potentialMobilityScale: 1.15,
    cornerScale: 0.95,
    cornerAdjacencyScale: 0.6,
    stabilityScale: 0.78,
    frontierScale: 0.75,
    positionalScale: 0.72,
    parityScale: 0.9,
    discScale: 1.1,
    riskPenaltyScale: 0.55,
    randomnessBonus: 35,
  },
});

export const ENGINE_PRESETS = Object.freeze({
  beginner: {
    label: '입문',
    description: '얕은 탐색과 약간의 무작위성을 섞어 부담을 줄인 난이도입니다.',
    maxDepth: 2,
    timeLimitMs: 160,
    exactEndgameEmpties: 4,
    aspirationWindow: 0,
    randomness: 220,
    maxTableEntries: 40000,
    mobilityScale: 0.9,
    stabilityScale: 0.7,
    frontierScale: 0.8,
    positionalScale: 0.9,
  },
  casual: {
    label: '보통',
    description: '기본 탐색과 평가를 사용하는 일반 플레이 난이도입니다.',
    maxDepth: 4,
    timeLimitMs: 500,
    exactEndgameEmpties: 6,
    aspirationWindow: 60,
    randomness: 60,
    maxTableEntries: 90000,
    mobilityScale: 1,
    stabilityScale: 1,
    frontierScale: 1,
    positionalScale: 1,
  },
  strong: {
    label: '강함',
    description: '깊은 탐색과 더 적극적인 후반 정확 탐색을 수행합니다.',
    maxDepth: 6,
    timeLimitMs: 1400,
    exactEndgameEmpties: 10,
    aspirationWindow: 55,
    randomness: 0,
    maxTableEntries: 180000,
    mobilityScale: 1.1,
    stabilityScale: 1.15,
    frontierScale: 1,
    positionalScale: 1,
  },
  expert: {
    label: '최상',
    description: '브라우저 정적 앱 범위에서 가능한 한 강하게 탐색합니다.',
    maxDepth: 8,
    timeLimitMs: 2600,
    exactEndgameEmpties: 12,
    aspirationWindow: 45,
    randomness: 0,
    maxTableEntries: 260000,
    mobilityScale: 1.2,
    stabilityScale: 1.25,
    frontierScale: 1.05,
    positionalScale: 1,
  },
  custom: {
    label: '사용자 지정',
    description: '아래 수치를 직접 입력하여 엔진 동작을 조절합니다.',
    maxDepth: 6,
    timeLimitMs: 1500,
    exactEndgameEmpties: 10,
    aspirationWindow: 50,
    randomness: 0,
    maxTableEntries: 200000,
    mobilityScale: 1,
    potentialMobilityScale: 1,
    cornerScale: 1,
    cornerAdjacencyScale: 1,
    stabilityScale: 1,
    frontierScale: 1,
    positionalScale: 1,
    parityScale: 1,
    discScale: 1,
    riskPenaltyScale: 1,
  },
});

export const CUSTOM_ENGINE_FIELDS = Object.freeze([
  {
    key: 'maxDepth',
    label: '최대 탐색 깊이',
    type: 'number',
    min: 1,
    max: 12,
    step: 1,
  },
  {
    key: 'timeLimitMs',
    label: '수 읽기 제한 시간(밀리초)',
    type: 'number',
    min: 50,
    max: 15000,
    step: 10,
  },
  {
    key: 'exactEndgameEmpties',
    label: '후반 완전 탐색 시작 빈칸 수',
    type: 'number',
    min: 0,
    max: 20,
    step: 1,
  },
  {
    key: 'aspirationWindow',
    label: '흡입 창 크기',
    type: 'number',
    min: 0,
    max: 500,
    step: 1,
  },
  {
    key: 'randomness',
    label: '초근접 수 무작위성 범위',
    type: 'number',
    min: 0,
    max: 500,
    step: 1,
  },
  {
    key: 'maxTableEntries',
    label: '전이표 최대 엔트리 수',
    type: 'number',
    min: 1000,
    max: 600000,
    step: 1000,
  },
  {
    key: 'mobilityScale',
    label: '기동성 가중치 배율',
    type: 'number',
    min: 0.2,
    max: 2.5,
    step: 0.05,
  },
  {
    key: 'potentialMobilityScale',
    label: '잠재 기동성 가중치 배율',
    type: 'number',
    min: 0.2,
    max: 2.5,
    step: 0.05,
  },
  {
    key: 'cornerScale',
    label: '코너 가중치 배율',
    type: 'number',
    min: 0.2,
    max: 2.5,
    step: 0.05,
  },
  {
    key: 'cornerAdjacencyScale',
    label: '코너 인접 위험 가중치 배율',
    type: 'number',
    min: 0.2,
    max: 2.5,
    step: 0.05,
  },
  {
    key: 'stabilityScale',
    label: '안정성 가중치 배율',
    type: 'number',
    min: 0.2,
    max: 2.5,
    step: 0.05,
  },
  {
    key: 'frontierScale',
    label: '프런티어 가중치 배율',
    type: 'number',
    min: 0.2,
    max: 2.5,
    step: 0.05,
  },
  {
    key: 'positionalScale',
    label: '위치 테이블 가중치 배율',
    type: 'number',
    min: 0.2,
    max: 2.5,
    step: 0.05,
  },
  {
    key: 'parityScale',
    label: '패리티 가중치 배율',
    type: 'number',
    min: 0.2,
    max: 2.5,
    step: 0.05,
  },
  {
    key: 'discScale',
    label: '돌 수 가중치 배율',
    type: 'number',
    min: 0.2,
    max: 2.5,
    step: 0.05,
  },
  {
    key: 'riskPenaltyScale',
    label: '위험 칸 패널티 배율',
    type: 'number',
    min: 0.2,
    max: 2.5,
    step: 0.05,
  },
]);

function sanitizeValue(field, value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  if (field.type !== 'number') {
    return parsed;
  }

  const clamped = Math.min(field.max, Math.max(field.min, parsed));
  if (Number.isInteger(field.step)) {
    return Math.round(clamped);
  }
  return Number(clamped.toFixed(2));
}

function clampScale(value) {
  return Number(Math.min(4.5, Math.max(0.1, value)).toFixed(2));
}

function applyStyle(baseOptions, styleKey) {
  const resolvedStyleKey = ENGINE_STYLE_PRESETS[styleKey] ? styleKey : DEFAULT_STYLE_KEY;
  const style = ENGINE_STYLE_PRESETS[resolvedStyleKey];
  const styled = {
    ...baseOptions,
    styleKey: resolvedStyleKey,
    styleLabel: style.label,
    styleDescription: style.description,
  };

  for (const key of SCALE_FIELD_KEYS) {
    styled[key] = clampScale((baseOptions[key] ?? 1) * (style[key] ?? 1));
  }

  styled.randomness = Math.max(0, Math.round((baseOptions.randomness ?? 0) + (style.randomnessBonus ?? 0)));
  return styled;
}

export function resolveEngineOptions(presetKey, customInputs = {}, styleKey = DEFAULT_STYLE_KEY) {
  const resolvedPresetKey = ENGINE_PRESETS[presetKey] ? presetKey : 'casual';
  const preset = ENGINE_PRESETS[resolvedPresetKey];
  const resolved = {
    ...BASE_ENGINE_DEFAULTS,
    presetKey: resolvedPresetKey,
    ...preset,
  };

  if (resolvedPresetKey === 'custom') {
    for (const field of CUSTOM_ENGINE_FIELDS) {
      resolved[field.key] = sanitizeValue(field, customInputs[field.key], resolved[field.key]);
    }
  }

  return applyStyle(resolved, styleKey);
}
