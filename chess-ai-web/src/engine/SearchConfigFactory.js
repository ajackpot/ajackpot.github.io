const PRESETS = {
  beginner: {
    id: 'beginner',
    label: '입문',
    timeBudgetMs: 220,
    maxSimulations: 130,
    cpuct: 1.8,
    rootTemperature: 0.85,
    tacticalDepth: 0,
    wideningBase: 4,
    wideningScale: 1.4,
  },
  normal: {
    id: 'normal',
    label: '보통',
    timeBudgetMs: 650,
    maxSimulations: 360,
    cpuct: 1.55,
    rootTemperature: 0.32,
    tacticalDepth: 1,
    wideningBase: 6,
    wideningScale: 1.6,
  },
  strong: {
    id: 'strong',
    label: '강함',
    timeBudgetMs: 1500,
    maxSimulations: 900,
    cpuct: 1.35,
    rootTemperature: 0.12,
    tacticalDepth: 2,
    wideningBase: 8,
    wideningScale: 1.9,
  },
  veryStrong: {
    id: 'veryStrong',
    label: '매우 강함',
    timeBudgetMs: 3200,
    maxSimulations: 2200,
    cpuct: 1.2,
    rootTemperature: 0.04,
    tacticalDepth: 3,
    wideningBase: 10,
    wideningScale: 2.3,
  },
};

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

export class SearchConfigFactory {
  static getPreset(presetId) {
    const preset = PRESETS[presetId] ?? PRESETS.normal;
    return structuredClone(preset);
  }

  static getAllPresets() {
    return Object.values(PRESETS).map((preset) => structuredClone(preset));
  }

  static createFromControls({ difficulty, customValues }) {
    if (difficulty !== 'custom') {
      return this.getPreset(difficulty);
    }

    const baseline = this.getPreset('strong');

    return {
      id: 'custom',
      label: '사용자 지정',
      timeBudgetMs: Math.round(clampNumber(customValues.timeBudgetMs, 50, 10000, baseline.timeBudgetMs)),
      maxSimulations: Math.round(clampNumber(customValues.maxSimulations, 20, 20000, baseline.maxSimulations)),
      cpuct: clampNumber(customValues.cpuct, 0.2, 4, baseline.cpuct),
      rootTemperature: clampNumber(customValues.rootTemperature, 0, 2, baseline.rootTemperature),
      tacticalDepth: Math.round(clampNumber(customValues.tacticalDepth, 0, 3, baseline.tacticalDepth)),
      wideningBase: Math.round(clampNumber(customValues.wideningBase, 1, 32, baseline.wideningBase)),
      wideningScale: clampNumber(customValues.wideningScale, 0, 10, baseline.wideningScale),
    };
  }

  static summarize(config) {
    return `시간 ${config.timeBudgetMs}ms · 시뮬레이션 ${config.maxSimulations} · c_puct ${config.cpuct.toFixed(2)} · 온도 ${config.rootTemperature.toFixed(2)} · 전술 깊이 ${config.tacticalDepth} · 확장 ${config.wideningBase}/${config.wideningScale.toFixed(1)}`;
  }
}
