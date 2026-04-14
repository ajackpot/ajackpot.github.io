#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { ENGINE_PRESETS } from '../../js/ai/presets.js';
import { parseArgs, relativePathFromCwd, resolveCliPath } from '../evaluator-training/lib.mjs';

const MATCHUPS = Object.freeze([
  Object.freeze({
    firstAlgorithm: 'classic',
    secondAlgorithm: 'classic-mtdf',
    slug: 'classic_vs_classic_mtdf',
  }),
  Object.freeze({
    firstAlgorithm: 'classic',
    secondAlgorithm: 'classic-mtdf-2ply',
    slug: 'classic_vs_classic_mtdf_2ply',
  }),
  Object.freeze({
    firstAlgorithm: 'classic-mtdf',
    secondAlgorithm: 'classic-mtdf-2ply',
    slug: 'classic_mtdf_vs_classic_mtdf_2ply',
  }),
]);

const DEFAULTS = Object.freeze({
  outputDir: 'benchmarks/stage133',
  scenarioKeys: ['beginner', 'easy', 'normal', 'hard'],
  openingPlies: 20,
  styleKey: 'balanced',
  positionSeedList: [17, 31, 41, 53, 71, 89, 97, 107, 131, 149, 167, 193],
  hardPositionSeedList: [17, 31, 41, 53, 71, 89, 97, 107],
  pairSeedList: [17, 31, 41, 53, 71, 89],
  hardPairSeedList: [17, 31, 41, 53],
  pairGames: 3,
  hardPairGames: 2,
  solverAdjudicationTimeMsScale: 6,
  smokePositionSeedList: [17, 31],
  smokePairSeedList: [17],
  smokePairGames: 1,
});

const SCENARIO_BUDGETS = Object.freeze({
  beginner: Object.freeze({
    positionSeedList: [...DEFAULTS.positionSeedList],
    pairSeedList: [...DEFAULTS.pairSeedList],
    pairGames: DEFAULTS.pairGames,
  }),
  easy: Object.freeze({
    positionSeedList: [...DEFAULTS.positionSeedList],
    pairSeedList: [...DEFAULTS.pairSeedList],
    pairGames: DEFAULTS.pairGames,
  }),
  normal: Object.freeze({
    positionSeedList: [...DEFAULTS.hardPositionSeedList],
    pairSeedList: [17, 31],
    pairGames: 1,
  }),
  hard: Object.freeze({
    positionSeedList: [17, 31, 41, 53],
    pairSeedList: [17],
    pairGames: 1,
  }),
  expert: Object.freeze({
    positionSeedList: [17, 31, 41, 53],
    pairSeedList: [17],
    pairGames: 1,
  }),
  impossible: Object.freeze({
    positionSeedList: [17, 31],
    pairSeedList: [17],
    pairGames: 1,
  }),
});

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/run-stage133-classic-mtdf-adoption-suite.mjs \
    [--output-dir benchmarks/stage133] \
    [--scenario-keys beginner,easy,normal,hard] \
    [--opening-plies 20] \
    [--style-key balanced] \
    [--smoke] [--force]

설명:
- 실제 classic preset(입문/쉬움/보통/어려움) 구성에 맞춰 classic vs classic-mtdf vs classic-mtdf-2ply를 throughput + paired self-play로 재평가합니다.
- scenario마다 classic 대비 점수차, fallback, nodes/ms, MTD(f) 재탐색 비용을 같이 기록하고, direct head-to-head까지 포함한 최종 채택 판정을 JSON으로 남깁니다.
- 기존 output JSON이 있으면 기본적으로 재사용하여 resume합니다. 다시 돌리려면 --force를 주십시오.
- --smoke를 주면 seed/games budget을 축소해 빠르게 형태만 검증합니다.
`);
}

function parseCsvStrings(value, fallback) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [...fallback];
  }

  const parsed = value
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);

  return parsed.length > 0 ? [...new Set(parsed)] : [...fallback];
}

function toFiniteInteger(value, fallback, minimum = Number.NEGATIVE_INFINITY, maximum = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
}

function average(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + Number(value ?? 0), 0) / values.length;
}

function weightedAverage(entries, valueSelector, weightSelector) {
  const filtered = (entries ?? []).filter((entry) => Number(weightSelector(entry)) > 0);
  if (filtered.length === 0) {
    return 0;
  }
  const totalWeight = filtered.reduce((sum, entry) => sum + Number(weightSelector(entry) ?? 0), 0);
  if (totalWeight <= 0) {
    return 0;
  }
  const weightedTotal = filtered.reduce(
    (sum, entry) => sum + (Number(valueSelector(entry) ?? 0) * Number(weightSelector(entry) ?? 0)),
    0,
  );
  return weightedTotal / totalWeight;
}

function runNodeScript(scriptPath, args, { cwd }) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: 'inherit',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status ?? 'unknown'}): ${scriptPath}`);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(outputPath, data) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function scenarioLabel(key) {
  return ENGINE_PRESETS[key]?.label ?? key;
}

function getScenarioConfig(key, { smoke, openingPlies, styleKey }) {
  const preset = ENGINE_PRESETS[key];
  if (!preset) {
    throw new Error(`Unknown preset scenario: ${key}`);
  }

  const scenarioBudget = SCENARIO_BUDGETS[key] ?? SCENARIO_BUDGETS.beginner;
  const positionSeedList = smoke
    ? [...DEFAULTS.smokePositionSeedList]
    : [...scenarioBudget.positionSeedList];
  const pairSeedList = smoke
    ? [...DEFAULTS.smokePairSeedList]
    : [...scenarioBudget.pairSeedList];
  const pairGames = smoke
    ? DEFAULTS.smokePairGames
    : scenarioBudget.pairGames;
  const solverAdjudicationTimeMs = Math.max(5000, Math.round((preset.timeLimitMs ?? 500) * DEFAULTS.solverAdjudicationTimeMsScale));

  return {
    key,
    label: scenarioLabel(key),
    presetKey: key,
    styleKey,
    openingPlies,
    timeLimitMs: Math.round(preset.timeLimitMs ?? 500),
    maxDepth: Math.round(preset.maxDepth ?? 4),
    exactEndgameEmpties: Math.round(preset.exactEndgameEmpties ?? 8),
    aspirationWindow: Math.round(preset.aspirationWindow ?? 0),
    maxTableEntries: Math.round(preset.maxTableEntries ?? 90000),
    positionSeedList,
    pairSeedList,
    pairGames,
    solverAdjudicationEmpties: Math.max(
      Math.round(preset.exactEndgameEmpties ?? 8),
      Math.min(18, Math.round((preset.exactEndgameEmpties ?? 8) + 2)),
    ),
    solverAdjudicationTimeMs,
  };
}

function summarizeScenarioPreference({ classicVsMtdf, classicVsMtdf2, mtdfVsMtdf2 }) {
  const candidates = [
    {
      algorithm: 'classic-mtdf',
      pointGapVsClassic: Number(classicVsMtdf?.pointGap ?? 0),
      fallbackGapVsClassic: Number(classicVsMtdf?.algorithms?.['classic-mtdf']?.fallbackRate ?? 0)
        - Number(classicVsMtdf?.algorithms?.classic?.fallbackRate ?? 0),
      directGapVsOtherMtdf: Number(mtdfVsMtdf2?.pointGap ?? 0) * -1,
    },
    {
      algorithm: 'classic-mtdf-2ply',
      pointGapVsClassic: Number(classicVsMtdf2?.pointGap ?? 0),
      fallbackGapVsClassic: Number(classicVsMtdf2?.algorithms?.['classic-mtdf-2ply']?.fallbackRate ?? 0)
        - Number(classicVsMtdf2?.algorithms?.classic?.fallbackRate ?? 0),
      directGapVsOtherMtdf: Number(mtdfVsMtdf2?.pointGap ?? 0),
    },
  ].sort((left, right) => {
    if (right.pointGapVsClassic !== left.pointGapVsClassic) {
      return right.pointGapVsClassic - left.pointGapVsClassic;
    }
    if (right.directGapVsOtherMtdf !== left.directGapVsOtherMtdf) {
      return right.directGapVsOtherMtdf - left.directGapVsOtherMtdf;
    }
    return left.fallbackGapVsClassic - right.fallbackGapVsClassic;
  });

  const preferred = candidates[0] ?? null;
  if (!preferred || preferred.pointGapVsClassic <= 0) {
    return {
      preferredCandidate: null,
      recommendation: 'classic PVS를 유지하는 쪽이 더 안전합니다.',
    };
  }

  if (preferred.directGapVsOtherMtdf < -0.02) {
    return {
      preferredCandidate: null,
      recommendation: 'classic 대비 이득은 있지만 MTD(f) 내부 direct 비교에서 밀려 추가 확인이 필요합니다.',
    };
  }

  return {
    preferredCandidate: preferred.algorithm,
    recommendation: `${preferred.algorithm} 쪽이 이 preset 시나리오에서 가장 설득력 있습니다.`,
  };
}

function summarizeCandidate({ algorithm, scenarioEntries, throughputEntries, directHeadToHeadEntries }) {
  const weightedPointGapVsClassic = weightedAverage(scenarioEntries, (entry) => entry.pointGapVsClassic, (entry) => entry.totalGames);
  const weightedFallbackGapVsClassic = weightedAverage(scenarioEntries, (entry) => entry.fallbackGapVsClassic, (entry) => entry.totalTurns);
  const weightedNodesPerMsGainRate = weightedAverage(throughputEntries, (entry) => entry.nodesPerMsGainRate, (entry) => entry.sampleCount);
  const weightedDepthGain = weightedAverage(throughputEntries, (entry) => entry.depthGain, (entry) => entry.sampleCount);
  const directHeadToHeadWeightedPointGap = weightedAverage(directHeadToHeadEntries, (entry) => entry.pointGap, (entry) => entry.totalGames);
  const directHeadToHeadWorstPointGap = directHeadToHeadEntries.length > 0
    ? Math.min(...directHeadToHeadEntries.map((entry) => Number(entry.pointGap ?? 0)))
    : 0;
  const worstPointGapVsClassic = scenarioEntries.length > 0
    ? Math.min(...scenarioEntries.map((entry) => Number(entry.pointGapVsClassic ?? 0)))
    : 0;
  const scenarioWinCountVsClassic = scenarioEntries.filter((entry) => Number(entry.pointGapVsClassic ?? 0) > 0).length;
  const scenarioLossCountVsClassic = scenarioEntries.filter((entry) => Number(entry.pointGapVsClassic ?? 0) < 0).length;

  let recommendation = 'hold';
  if (
    weightedPointGapVsClassic >= 0.03
    && worstPointGapVsClassic >= -0.03
    && weightedFallbackGapVsClassic <= 0.03
    && weightedNodesPerMsGainRate >= 0
    && directHeadToHeadWeightedPointGap >= -0.01
    && directHeadToHeadWorstPointGap >= -0.05
  ) {
    recommendation = 'adopt-default';
  } else if (weightedPointGapVsClassic <= -0.02 || worstPointGapVsClassic <= -0.08) {
    recommendation = 'reject-default';
  }

  return {
    algorithm,
    scenarioWinCountVsClassic,
    scenarioLossCountVsClassic,
    weightedPointGapVsClassic,
    worstPointGapVsClassic,
    weightedFallbackGapVsClassic,
    weightedNodesPerMsGainRate,
    weightedDepthGain,
    directHeadToHeadWeightedPointGap,
    directHeadToHeadWorstPointGap,
    recommendation,
  };
}

function buildFinalDecision({ selectedCandidate, candidates }) {
  if (!selectedCandidate) {
    return {
      action: 'keep-classic-pvs-default',
      candidate: null,
      rationale: ['유효한 MTD(f) 후보가 집계되지 않았습니다.'],
    };
  }

  if (selectedCandidate.recommendation === 'adopt-default') {
    return {
      action: `adopt-${selectedCandidate.algorithm}-as-classic-default`,
      candidate: selectedCandidate.algorithm,
      rationale: [
        `${selectedCandidate.algorithm}가 classic 대비 가중 평균 점수차 ${selectedCandidate.weightedPointGapVsClassic.toFixed(3)}를 기록했습니다.`,
        `최악 시나리오 점수차가 ${selectedCandidate.worstPointGapVsClassic.toFixed(3)}로 큰 역전이 없고, throughput gain도 ${selectedCandidate.weightedNodesPerMsGainRate.toFixed(3)}입니다.`,
        `MTD(f) 내부 direct 비교에서도 가중 점수차 ${selectedCandidate.directHeadToHeadWeightedPointGap.toFixed(3)}로 비열세 이상입니다.`,
      ],
    };
  }

  if (selectedCandidate.recommendation === 'reject-default') {
    return {
      action: 'keep-classic-pvs-default',
      candidate: null,
      rationale: [
        `${selectedCandidate.algorithm}가 일부 구간에서 classic 대비 열세였습니다.`,
        '기본 classic driver를 PVS에서 교체할 만큼 분리된 우세는 확인되지 않았습니다.',
      ],
    };
  }

  return {
    action: 'hold-experimental-mtdf-only',
    candidate: selectedCandidate.algorithm,
    rationale: [
      `${selectedCandidate.algorithm}가 가장 유망하지만, 기본값 전면 교체 기준에는 아직 보수적으로 미달합니다.`,
      'alias 또는 숨은 실험 옵션으로는 유지할 가치가 있습니다.',
    ],
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const smoke = Boolean(args.smoke);
  const force = Boolean(args.force);
  const outputDir = resolveCliPath(typeof args['output-dir'] === 'string' && args['output-dir'].trim() !== ''
    ? args['output-dir'].trim()
    : DEFAULTS.outputDir);
  const scenarioKeys = parseCsvStrings(args['scenario-keys'], DEFAULTS.scenarioKeys);
  const openingPlies = toFiniteInteger(args['opening-plies'], DEFAULTS.openingPlies, 0, 40);
  const styleKey = typeof args['style-key'] === 'string' && args['style-key'].trim() !== ''
    ? args['style-key'].trim()
    : DEFAULTS.styleKey;
  const cwd = process.cwd();

  fs.mkdirSync(outputDir, { recursive: true });

  const scenarioSummaries = [];
  const candidateScenarioEntries = {
    'classic-mtdf': [],
    'classic-mtdf-2ply': [],
  };
  const candidateThroughputEntries = {
    'classic-mtdf': [],
    'classic-mtdf-2ply': [],
  };
  const directHeadToHeadEntries = {
    'classic-mtdf': [],
    'classic-mtdf-2ply': [],
  };

  for (const scenarioKey of scenarioKeys) {
    const scenario = getScenarioConfig(scenarioKey, {
      smoke,
      openingPlies,
      styleKey,
    });

    const throughputPath = path.join(outputDir, `${scenario.key}_throughput.json`);
    if (force || !fs.existsSync(throughputPath)) {
      runNodeScript(
      path.resolve(cwd, 'tools/engine-match/benchmark-classic-throughput-compare.mjs'),
      [
        '--algorithms', 'classic,classic-mtdf,classic-mtdf-2ply',
        '--time-ms-list', String(scenario.timeLimitMs),
        '--position-seed-list', scenario.positionSeedList.join(','),
        '--opening-plies', String(scenario.openingPlies),
        '--max-depth', String(scenario.maxDepth),
        '--exact-endgame-empties', String(scenario.exactEndgameEmpties),
        '--aspiration-window', String(scenario.aspirationWindow),
        '--max-table-entries', String(scenario.maxTableEntries),
        '--preset-key', scenario.presetKey,
        '--style-key', scenario.styleKey,
        '--output-json', throughputPath,
      ],
      { cwd },
    );
    } else {
      console.log(`Reusing existing throughput output: ${relativePathFromCwd(throughputPath) ?? throughputPath}`);
    }
    const throughputSummary = readJson(throughputPath);

    const matchupOutputs = {};
    for (const matchup of MATCHUPS) {
      const matchupPath = path.join(outputDir, `${scenario.key}_${matchup.slug}.json`);
      if (force || !fs.existsSync(matchupPath)) {
        runNodeScript(
        path.resolve(cwd, 'tools/engine-match/benchmark-search-algorithm-pair.mjs'),
        [
          '--first-algorithm', matchup.firstAlgorithm,
          '--second-algorithm', matchup.secondAlgorithm,
          '--games', String(scenario.pairGames),
          '--opening-plies', String(scenario.openingPlies),
          '--seed-list', scenario.pairSeedList.join(','),
          '--time-ms-list', String(scenario.timeLimitMs),
          '--max-depth', String(scenario.maxDepth),
          '--exact-endgame-empties', String(scenario.exactEndgameEmpties),
          '--solver-adjudication-empties', String(scenario.solverAdjudicationEmpties),
          '--solver-adjudication-time-ms', String(scenario.solverAdjudicationTimeMs),
          '--max-table-entries', String(scenario.maxTableEntries),
          '--aspiration-window', String(scenario.aspirationWindow),
          '--preset-key', scenario.presetKey,
          '--style-key', scenario.styleKey,
          '--progress-every-pairs', '1',
          '--output-json', matchupPath,
        ],
        { cwd },
      );
      } else {
        console.log(`Reusing existing pair output: ${relativePathFromCwd(matchupPath) ?? matchupPath}`);
      }
      matchupOutputs[matchup.slug] = {
        path: relativePathFromCwd(matchupPath) ?? matchupPath,
        summary: readJson(matchupPath),
      };
    }

    const throughputComparisons = throughputSummary.comparisonsAgainstBaseline ?? [];
    const classicVsMtdf = matchupOutputs.classic_vs_classic_mtdf.summary?.scenarios?.[0] ?? null;
    const classicVsMtdf2 = matchupOutputs.classic_vs_classic_mtdf_2ply.summary?.scenarios?.[0] ?? null;
    const mtdfVsMtdf2 = matchupOutputs.classic_mtdf_vs_classic_mtdf_2ply.summary?.scenarios?.[0] ?? null;
    const scenarioPreference = summarizeScenarioPreference({ classicVsMtdf, classicVsMtdf2, mtdfVsMtdf2 });

    for (const algorithm of ['classic-mtdf', 'classic-mtdf-2ply']) {
      const versusClassic = algorithm === 'classic-mtdf' ? classicVsMtdf : classicVsMtdf2;
      if (versusClassic) {
        const baseline = versusClassic.algorithms?.classic ?? null;
        const candidate = versusClassic.algorithms?.[algorithm] ?? null;
        candidateScenarioEntries[algorithm].push({
          scenarioKey: scenario.key,
          label: scenario.label,
          totalGames: Number(versusClassic.totalGames ?? 0),
          totalTurns: Number(candidate?.turns ?? 0),
          pointGapVsClassic: Number(versusClassic.pointGap ?? 0),
          fallbackGapVsClassic: Number(candidate?.fallbackRate ?? 0) - Number(baseline?.fallbackRate ?? 0),
          candidateScoreRate: Number(candidate?.scoreRate ?? 0),
          baselineScoreRate: Number(baseline?.scoreRate ?? 0),
        });
      }

      const throughputEntry = throughputComparisons.find((entry) => entry.candidateAlgorithm === algorithm);
      if (throughputEntry) {
        candidateThroughputEntries[algorithm].push({
          scenarioKey: scenario.key,
          label: scenario.label,
          sampleCount: Number(throughputEntry.sampleCount ?? 0),
          depthGain: Number(throughputEntry.candidateAverageDepthGain ?? 0),
          nodesPerMsGainRate: Number(throughputEntry.candidateNodesPerMsGainRate ?? 0),
          moveAgreementRate: Number(throughputEntry.moveAgreementRate ?? 0),
          scoreAgreementRate: Number(throughputEntry.scoreAgreementRate ?? 0),
        });
      }
    }

    if (mtdfVsMtdf2) {
      directHeadToHeadEntries['classic-mtdf'].push({
        scenarioKey: scenario.key,
        label: scenario.label,
        totalGames: Number(mtdfVsMtdf2.totalGames ?? 0),
        pointGap: Number(mtdfVsMtdf2.pointGap ?? 0) * -1,
      });
      directHeadToHeadEntries['classic-mtdf-2ply'].push({
        scenarioKey: scenario.key,
        label: scenario.label,
        totalGames: Number(mtdfVsMtdf2.totalGames ?? 0),
        pointGap: Number(mtdfVsMtdf2.pointGap ?? 0),
      });
    }

    scenarioSummaries.push({
      scenarioKey: scenario.key,
      label: scenario.label,
      config: {
        presetKey: scenario.presetKey,
        styleKey: scenario.styleKey,
        openingPlies: scenario.openingPlies,
        timeLimitMs: scenario.timeLimitMs,
        maxDepth: scenario.maxDepth,
        exactEndgameEmpties: scenario.exactEndgameEmpties,
        aspirationWindow: scenario.aspirationWindow,
        maxTableEntries: scenario.maxTableEntries,
        positionSeedList: scenario.positionSeedList,
        pairSeedList: scenario.pairSeedList,
        pairGames: scenario.pairGames,
        solverAdjudicationEmpties: scenario.solverAdjudicationEmpties,
        solverAdjudicationTimeMs: scenario.solverAdjudicationTimeMs,
      },
      outputs: {
        throughputPath: relativePathFromCwd(throughputPath) ?? throughputPath,
        classicVsMtdfPath: matchupOutputs.classic_vs_classic_mtdf.path,
        classicVsMtdf2Path: matchupOutputs.classic_vs_classic_mtdf_2ply.path,
        mtdfVsMtdf2Path: matchupOutputs.classic_mtdf_vs_classic_mtdf_2ply.path,
      },
      throughputComparisons,
      pairComparisons: {
        classicVsMtdf: classicVsMtdf,
        classicVsMtdf2: classicVsMtdf2,
        mtdfVsMtdf2: mtdfVsMtdf2,
      },
      preferredCandidate: scenarioPreference.preferredCandidate,
      recommendation: scenarioPreference.recommendation,
    });
  }

  const candidates = [
    summarizeCandidate({
      algorithm: 'classic-mtdf',
      scenarioEntries: candidateScenarioEntries['classic-mtdf'],
      throughputEntries: candidateThroughputEntries['classic-mtdf'],
      directHeadToHeadEntries: directHeadToHeadEntries['classic-mtdf'],
    }),
    summarizeCandidate({
      algorithm: 'classic-mtdf-2ply',
      scenarioEntries: candidateScenarioEntries['classic-mtdf-2ply'],
      throughputEntries: candidateThroughputEntries['classic-mtdf-2ply'],
      directHeadToHeadEntries: directHeadToHeadEntries['classic-mtdf-2ply'],
    }),
  ].sort((left, right) => {
    if (right.weightedPointGapVsClassic !== left.weightedPointGapVsClassic) {
      return right.weightedPointGapVsClassic - left.weightedPointGapVsClassic;
    }
    if (right.directHeadToHeadWeightedPointGap !== left.directHeadToHeadWeightedPointGap) {
      return right.directHeadToHeadWeightedPointGap - left.directHeadToHeadWeightedPointGap;
    }
    return right.weightedNodesPerMsGainRate - left.weightedNodesPerMsGainRate;
  });

  const selectedCandidate = candidates[0] ?? null;
  const finalDecision = buildFinalDecision({ selectedCandidate, candidates });
  const summary = {
    type: 'stage133-classic-mtdf-adoption-suite',
    generatedAt: new Date().toISOString(),
    options: {
      outputDir: relativePathFromCwd(outputDir) ?? outputDir,
      scenarioKeys,
      openingPlies,
      styleKey,
      smoke,
      force,
    },
    scenarios: scenarioSummaries,
    candidates,
    selectedCandidate,
    finalDecision,
  };

  const summaryPath = path.join(outputDir, 'stage133_classic_mtdf_adoption_summary.json');
  writeJson(summaryPath, summary);

  console.log(`Saved Stage 133 summary to ${relativePathFromCwd(summaryPath) ?? summaryPath}`);
  console.log(`Final decision: ${finalDecision.action}`);
  for (const reason of finalDecision.rationale ?? []) {
    console.log(`  - ${reason}`);
  }
}

main();
