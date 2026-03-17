export const ENGINE_PRESETS = {
  beginner: {
    key: 'beginner',
    label: '입문',
    moveTimeMs: 250,
    maxDepth: 2,
    candidatePool: 5,
    skillNoiseCp: 180,
    maxQuiescenceDepth: 4,
    useOpeningBook: true,
    description: '짧게 생각하고 상위 후보 중에서 다소 랜덤하게 둡니다.',
  },
  casual: {
    key: 'casual',
    label: '보통',
    moveTimeMs: 600,
    maxDepth: 3,
    candidatePool: 3,
    skillNoiseCp: 90,
    maxQuiescenceDepth: 6,
    useOpeningBook: true,
    description: '가벼운 대국용 설정입니다.',
  },
  strong: {
    key: 'strong',
    label: '강함',
    moveTimeMs: 1400,
    maxDepth: 4,
    candidatePool: 2,
    skillNoiseCp: 20,
    maxQuiescenceDepth: 8,
    useOpeningBook: true,
    description: '일반 브라우저 환경에서 균형 좋은 강한 설정입니다.',
  },
  expert: {
    key: 'expert',
    label: '최상',
    moveTimeMs: 2600,
    maxDepth: 5,
    candidatePool: 1,
    skillNoiseCp: 0,
    maxQuiescenceDepth: 10,
    useOpeningBook: true,
    description: '검색 깊이와 탐색 시간을 가장 공격적으로 사용합니다.',
  },
  custom: {
    key: 'custom',
    label: '사용자 지정',
    moveTimeMs: 1200,
    maxDepth: 4,
    candidatePool: 2,
    skillNoiseCp: 25,
    maxQuiescenceDepth: 8,
    useOpeningBook: true,
    description: '직접 입력한 파라미터가 적용됩니다.',
  },
};

export const DEFAULT_ENGINE_OPTIONS = {
  presetKey: 'strong',
  engineSide: 'black',
  orientation: 'white',
  useOpeningBook: true,
};

export class EngineConfigFactory {
  static create({ presetKey, customValues = {}, toggles = {} } = {}) {
    const basePreset = ENGINE_PRESETS[presetKey] ?? ENGINE_PRESETS.strong;
    const values = presetKey === 'custom'
      ? { ...basePreset, ...customValues }
      : basePreset;

    return {
      ...values,
      presetKey: presetKey ?? 'strong',
      useOpeningBook: toggles.useOpeningBook ?? values.useOpeningBook,
      engineSide: toggles.engineSide ?? DEFAULT_ENGINE_OPTIONS.engineSide,
    };
  }
}
