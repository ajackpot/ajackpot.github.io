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
    stabilityScale: 1,
    frontierScale: 1,
    positionalScale: 1,
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

export function resolveEngineOptions(presetKey, customInputs = {}) {
  const preset = ENGINE_PRESETS[presetKey] ?? ENGINE_PRESETS.casual;
  if (presetKey !== 'custom') {
    return {
      presetKey,
      ...preset,
    };
  }

  const resolved = {
    presetKey,
    ...ENGINE_PRESETS.custom,
  };

  for (const field of CUSTOM_ENGINE_FIELDS) {
    resolved[field.key] = sanitizeValue(field, customInputs[field.key], resolved[field.key]);
  }

  return resolved;
}
