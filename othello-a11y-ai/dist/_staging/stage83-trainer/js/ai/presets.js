const SCALE_FIELD_KEYS = Object.freeze([
  'mobilityScale',
  'potentialMobilityScale',
  'cornerScale',
  'cornerAdjacencyScale',
  'stabilityScale',
  'frontierScale',
  'positionalScale',
  'edgePatternScale',
  'cornerPatternScale',
  'parityScale',
  'discScale',
  'riskPenaltyScale',
]);

const BASE_ENGINE_DEFAULTS = Object.freeze({
  maxDepth: 6,
  timeLimitMs: 1500,
  exactEndgameEmpties: 10,
  wldPreExactEmpties: 0,
  aspirationWindow: 50,
  openingRandomness: 0,
  searchRandomness: 0,
  maxTableEntries: 200000,
  mobilityScale: 1,
  potentialMobilityScale: 1,
  cornerScale: 1,
  cornerAdjacencyScale: 1,
  stabilityScale: 1,
  frontierScale: 1,
  positionalScale: 1,
  edgePatternScale: 1,
  cornerPatternScale: 1,
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
    edgePatternScale: 1,
    cornerPatternScale: 1,
    parityScale: 1,
    discScale: 1,
    riskPenaltyScale: 1,
    openingRandomnessBonus: 0,
    searchRandomnessBonus: 0,
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
    edgePatternScale: 0.9,
    cornerPatternScale: 0.88,
    parityScale: 1,
    discScale: 1.15,
    riskPenaltyScale: 0.75,
    openingRandomnessBonus: 6,
    searchRandomnessBonus: 10,
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
    edgePatternScale: 1.3,
    cornerPatternScale: 1.25,
    parityScale: 1.05,
    discScale: 0.85,
    riskPenaltyScale: 1.15,
    openingRandomnessBonus: 0,
    searchRandomnessBonus: 0,
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
    edgePatternScale: 1.15,
    cornerPatternScale: 1.35,
    parityScale: 1,
    discScale: 0.85,
    riskPenaltyScale: 1.3,
    openingRandomnessBonus: 0,
    searchRandomnessBonus: 0,
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
    edgePatternScale: 0.7,
    cornerPatternScale: 0.68,
    parityScale: 0.9,
    discScale: 1.1,
    riskPenaltyScale: 0.55,
    openingRandomnessBonus: 16,
    searchRandomnessBonus: 35,
  },
});

export const ENGINE_PRESETS = Object.freeze({
  beginner: {
    label: '입문',
    description: '얕은 탐색과 큰 무작위성을 섞어 부담을 크게 줄인 가장 가벼운 난이도입니다.',
    maxDepth: 2,
    timeLimitMs: 160,
    exactEndgameEmpties: 4,
    aspirationWindow: 0,
    openingRandomness: 48,
    searchRandomness: 220,
    maxTableEntries: 40000,
  },
  easy: {
    label: '쉬움',
    description: '입문보다 한 수 더 깊게 읽되, 여전히 여유 있는 무작위성을 남겨 둔 가벼운 난이도입니다.',
    maxDepth: 3,
    timeLimitMs: 280,
    exactEndgameEmpties: 6,
    aspirationWindow: 70,
    openingRandomness: 32,
    searchRandomness: 140,
    maxTableEntries: 65000,
  },
  normal: {
    label: '보통',
    description: '기본 탐색과 평가를 사용하는 일반 플레이 난이도입니다.',
    maxDepth: 4,
    timeLimitMs: 500,
    exactEndgameEmpties: 8,
    aspirationWindow: 60,
    openingRandomness: 16,
    searchRandomness: 60,
    maxTableEntries: 90000,
  },
  hard: {
    label: '어려움',
    description: '깊은 탐색과 적극적인 후반 정확 탐색을 수행합니다.',
    maxDepth: 6,
    timeLimitMs: 1400,
    exactEndgameEmpties: 10,
    aspirationWindow: 55,
    openingRandomness: 0,
    searchRandomness: 0,
    maxTableEntries: 180000,
  },
  expert: {
    label: '전문가',
    description: '매우 깊은 탐색과 더 적극적인 후반 정확 탐색을 수행합니다.',
    maxDepth: 8,
    timeLimitMs: 3900,
    exactEndgameEmpties: 12,
    aspirationWindow: 45,
    openingRandomness: 0,
    searchRandomness: 0,
    maxTableEntries: 260000,
  },
  impossible: {
    label: '불가능',
    description: '10초 이상 생각할 수 있지만, 이 정적 브라우저 앱 안에서는 가장 강한 퍼포먼스를 목표로 합니다.',
    maxDepth: 10,
    timeLimitMs: 12000,
    exactEndgameEmpties: 16,
    aspirationWindow: 35,
    openingRandomness: 0,
    searchRandomness: 0,
    maxTableEntries: 420000,
  },
  custom: {
    label: '사용자 지정',
    description: '아래 수치를 직접 입력하여 엔진 동작을 조절합니다.',
    maxDepth: 6,
    timeLimitMs: 1500,
    exactEndgameEmpties: 10,
    wldPreExactEmpties: 0,
    aspirationWindow: 50,
    openingRandomness: 0,
    searchRandomness: 0,
    maxTableEntries: 200000,
    mobilityScale: 1,
    potentialMobilityScale: 1,
    cornerScale: 1,
    cornerAdjacencyScale: 1,
    stabilityScale: 1,
    frontierScale: 1,
    positionalScale: 1,
    edgePatternScale: 1,
    cornerPatternScale: 1,
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
    key: 'wldPreExactEmpties',
    label: '사전 승무패 탐색 범위',
    type: 'select',
    options: [
      { value: 0, label: '사용 안 함' },
      { value: 2, label: '+2 사용 (정확 끝내기 직전 2칸)' },
    ],
    helpText: '기본값은 꺼짐입니다. 필요할 때만 exact 직전 2칸 구간에서 승무패 탐색을 먼저 사용합니다.',
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
    key: 'openingRandomness',
    label: '오프닝 수 무작위성 범위',
    type: 'number',
    min: 0,
    max: 200,
    step: 1,
  },
  {
    key: 'searchRandomness',
    label: '중반 이후 근접 수 무작위성 범위',
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
    key: 'edgePatternScale',
    label: '에지 패턴 가중치 배율',
    type: 'number',
    min: 0.2,
    max: 2.5,
    step: 0.05,
  },
  {
    key: 'cornerPatternScale',
    label: '코너 패턴 가중치 배율',
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

const CUSTOM_ENGINE_FIELD_BY_KEY = Object.freeze(Object.fromEntries(
  CUSTOM_ENGINE_FIELDS.map((field) => [field.key, field]),
));

function sanitizeSelectValue(field, value, fallback) {
  const options = Array.isArray(field?.options) ? field.options : [];
  if (options.length === 0) {
    return fallback;
  }

  const normalizedValue = value === null || value === undefined ? null : String(value).trim();
  const normalizedFallback = fallback === null || fallback === undefined ? null : String(fallback).trim();
  const normalizedOptions = options.map((option) => ({
    rawValue: option.value,
    normalizedValue: String(option.value),
  }));

  if (normalizedValue !== null) {
    const matchedOption = normalizedOptions.find((option) => option.normalizedValue === normalizedValue);
    if (matchedOption) {
      return matchedOption.rawValue;
    }
  }

  if (normalizedFallback !== null) {
    const matchedFallback = normalizedOptions.find((option) => option.normalizedValue === normalizedFallback);
    if (matchedFallback) {
      return matchedFallback.rawValue;
    }
  }

  return normalizedOptions[0].rawValue;
}

function sanitizeValue(field, value, fallback) {
  if (field.type === 'select') {
    return sanitizeSelectValue(field, value, fallback);
  }

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


function sanitizeRandomnessWithField(fieldKey, value, fallback) {
  const field = CUSTOM_ENGINE_FIELD_BY_KEY[fieldKey];
  if (!field) {
    return Math.max(0, Math.round(Number.isFinite(fallback) ? fallback : 0));
  }
  return sanitizeValue(field, value, fallback);
}

function applyLegacyRandomnessInput(resolved, rawInputs = {}) {
  if (!rawInputs || typeof rawInputs !== 'object') {
    return resolved;
  }

  const hasOpeningRandomness = Object.hasOwn(rawInputs, 'openingRandomness');
  const hasSearchRandomness = Object.hasOwn(rawInputs, 'searchRandomness');
  if ((hasOpeningRandomness || hasSearchRandomness) || !Object.hasOwn(rawInputs, 'randomness')) {
    return resolved;
  }

  return {
    ...resolved,
    openingRandomness: sanitizeRandomnessWithField(
      'openingRandomness',
      rawInputs.randomness,
      resolved.openingRandomness ?? resolved.randomness ?? BASE_ENGINE_DEFAULTS.openingRandomness,
    ),
    searchRandomness: sanitizeRandomnessWithField(
      'searchRandomness',
      rawInputs.randomness,
      resolved.searchRandomness ?? resolved.randomness ?? BASE_ENGINE_DEFAULTS.searchRandomness,
    ),
  };
}

function finalizeRandomnessAliases(resolved) {
  const openingRandomness = sanitizeRandomnessWithField(
    'openingRandomness',
    resolved.openingRandomness ?? resolved.randomness ?? BASE_ENGINE_DEFAULTS.openingRandomness,
    BASE_ENGINE_DEFAULTS.openingRandomness,
  );
  const searchRandomness = sanitizeRandomnessWithField(
    'searchRandomness',
    resolved.searchRandomness ?? resolved.randomness ?? BASE_ENGINE_DEFAULTS.searchRandomness,
    BASE_ENGINE_DEFAULTS.searchRandomness,
  );

  return {
    ...resolved,
    openingRandomness,
    searchRandomness,
    randomness: searchRandomness,
  };
}

function clampScale(value) {
  return Number(Math.min(4.5, Math.max(0.1, value)).toFixed(2));
}

function applyStyle(baseOptions, styleKey) {
  const resolvedStyleKey = ENGINE_STYLE_PRESETS[styleKey] ? styleKey : DEFAULT_STYLE_KEY;
  const style = ENGINE_STYLE_PRESETS[resolvedStyleKey];
  const styled = {
    ...baseOptions,
    styleApplied: true,
    styleKey: resolvedStyleKey,
    styleLabel: style.label,
    styleDescription: style.description,
  };

  for (const key of SCALE_FIELD_KEYS) {
    styled[key] = clampScale((baseOptions[key] ?? 1) * (style[key] ?? 1));
  }

  const legacyBonus = style.randomnessBonus ?? 0;
  styled.openingRandomness = Math.max(
    0,
    Math.round((baseOptions.openingRandomness ?? baseOptions.randomness ?? 0) + (style.openingRandomnessBonus ?? legacyBonus)),
  );
  styled.searchRandomness = Math.max(
    0,
    Math.round((baseOptions.searchRandomness ?? baseOptions.randomness ?? 0) + (style.searchRandomnessBonus ?? legacyBonus)),
  );
  return finalizeRandomnessAliases(styled);
}

function disableStyle(baseOptions) {
  return finalizeRandomnessAliases({
    ...baseOptions,
    styleApplied: false,
    styleKey: null,
    styleLabel: '적용 안 함',
    styleDescription: '난이도가 “사용자 지정”이면 입력한 수치가 그대로 적용되어 스타일 프리셋은 적용되지 않습니다.',
  });
}

export function resolveEngineOptions(presetKey, customInputs = {}, styleKey = DEFAULT_STYLE_KEY) {
  const resolvedPresetKey = ENGINE_PRESETS[presetKey] ? presetKey : 'normal';
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
    return disableStyle(applyLegacyRandomnessInput(resolved, customInputs));
  }

  return applyStyle(resolved, styleKey);
}
