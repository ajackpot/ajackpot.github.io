#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { parseArgs, relativePathFromCwd, resolveCliPath } from '../evaluator-training/lib.mjs';

const DEFAULTS = Object.freeze({
  outputDir: 'benchmarks/stage132',
  timeMsList: '60,120,240',
  positionSeedList: '17,31,41,53,71,89',
  pairSeedList: '17,31,41,53',
  games: 2,
  openingPlies: 20,
  maxDepth: 6,
  exactEndgameEmpties: 8,
  solverAdjudicationEmpties: 10,
  solverAdjudicationTimeMs: 10000,
  aspirationWindow: 50,
  maxTableEntries: 90000,
});

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/run-stage132-classic-mtdf-suite.mjs \
    [--output-dir benchmarks/stage132] \
    [--time-ms-list 60,120,240] \
    [--position-seed-list 17,31,41,53,71,89] \
    [--pair-seed-list 17,31,41,53] \
    [--games 2] \
    [--opening-plies 20] \
    [--max-depth 6] \
    [--exact-endgame-empties 8] \
    [--solver-adjudication-empties 10] \
    [--solver-adjudication-time-ms 10000] \
    [--aspiration-window 50] \
    [--max-table-entries 90000]

설명:
- classic vs classic-mtdf / classic-mtdf-2ply 후보를 throughput + paired self-play로 한 번에 평가합니다.
- opening-plies 기본값을 20으로 잡아 opening-book advisory/direct lane의 간섭을 줄였습니다.
- 최종 summary JSON에는 후보별 처리량/깊이 gain, paired self-play 점수차, 보수적 채택 권고가 정리됩니다.
`);
}

function toFiniteInteger(value, fallback, minimum = Number.NEGATIVE_INFINITY, maximum = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
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

function average(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + Number(value ?? 0), 0) / values.length;
}

function summarizeCandidate({ algorithm, throughputSummary, pairSummary }) {
  const throughputComparisons = (throughputSummary?.comparisonsAgainstBaseline ?? [])
    .filter((entry) => entry.candidateAlgorithm === algorithm);
  const pairScenarios = pairSummary?.scenarios ?? [];

  const averagePointGap = average(pairScenarios.map((scenario) => scenario.pointGap));
  const worstPointGap = pairScenarios.length > 0
    ? Math.min(...pairScenarios.map((scenario) => Number(scenario.pointGap ?? 0)))
    : 0;
  const averageFallbackGap = average(pairScenarios.map((scenario) => (
    Number(scenario.algorithms?.[algorithm]?.fallbackRate ?? 0)
    - Number(scenario.algorithms?.classic?.fallbackRate ?? 0)
  )));
  const averageDepthGain = average(throughputComparisons.map((entry) => entry.candidateAverageDepthGain));
  const averageNodesPerMsGainRate = average(throughputComparisons.map((entry) => entry.candidateNodesPerMsGainRate));
  const averageMoveAgreementRate = average(throughputComparisons.map((entry) => entry.moveAgreementRate));
  const averageScoreAgreementRate = average(throughputComparisons.map((entry) => entry.scoreAgreementRate));

  let recommendation = 'hold';
  if (averagePointGap >= 0.10 && worstPointGap >= 0 && averageFallbackGap <= 0.03) {
    recommendation = 'adopt-candidate';
  } else if (averagePointGap <= -0.05) {
    recommendation = 'reject-candidate';
  }

  return {
    algorithm,
    averagePointGap,
    worstPointGap,
    averageFallbackGap,
    averageDepthGain,
    averageNodesPerMsGainRate,
    averageMoveAgreementRate,
    averageScoreAgreementRate,
    recommendation,
  };
}

function writeJson(outputPath, data) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const cwd = process.cwd();
  const outputDir = resolveCliPath(typeof args['output-dir'] === 'string' && args['output-dir'].trim() !== ''
    ? args['output-dir'].trim()
    : DEFAULTS.outputDir);
  const timeMsList = typeof args['time-ms-list'] === 'string' && args['time-ms-list'].trim() !== ''
    ? args['time-ms-list'].trim()
    : DEFAULTS.timeMsList;
  const positionSeedList = typeof args['position-seed-list'] === 'string' && args['position-seed-list'].trim() !== ''
    ? args['position-seed-list'].trim()
    : DEFAULTS.positionSeedList;
  const pairSeedList = typeof args['pair-seed-list'] === 'string' && args['pair-seed-list'].trim() !== ''
    ? args['pair-seed-list'].trim()
    : DEFAULTS.pairSeedList;
  const games = toFiniteInteger(args.games, DEFAULTS.games, 1, 200);
  const openingPlies = toFiniteInteger(args['opening-plies'], DEFAULTS.openingPlies, 0, 60);
  const maxDepth = toFiniteInteger(args['max-depth'], DEFAULTS.maxDepth, 1, 16);
  const exactEndgameEmpties = toFiniteInteger(args['exact-endgame-empties'], DEFAULTS.exactEndgameEmpties, 0, 24);
  const solverAdjudicationEmpties = toFiniteInteger(args['solver-adjudication-empties'], DEFAULTS.solverAdjudicationEmpties, -1, 24);
  const solverAdjudicationTimeMs = toFiniteInteger(args['solver-adjudication-time-ms'], DEFAULTS.solverAdjudicationTimeMs, 100, 300000);
  const aspirationWindow = toFiniteInteger(args['aspiration-window'], DEFAULTS.aspirationWindow, 0, 5000);
  const maxTableEntries = toFiniteInteger(args['max-table-entries'], DEFAULTS.maxTableEntries, 1000, 1_000_000);

  fs.mkdirSync(outputDir, { recursive: true });

  const throughputPath = path.join(outputDir, 'classic_throughput_compare.json');
  const classicVsMtdfPath = path.join(outputDir, 'classic_vs_classic_mtdf_pair.json');
  const classicVsMtdf2Path = path.join(outputDir, 'classic_vs_classic_mtdf_2ply_pair.json');
  const summaryPath = path.join(outputDir, 'stage132_classic_mtdf_suite_summary.json');

  runNodeScript(
    path.resolve(cwd, 'tools/engine-match/benchmark-classic-throughput-compare.mjs'),
    [
      '--algorithms', 'classic,classic-mtdf,classic-mtdf-2ply',
      '--time-ms-list', timeMsList,
      '--position-seed-list', positionSeedList,
      '--opening-plies', String(openingPlies),
      '--max-depth', String(maxDepth),
      '--exact-endgame-empties', String(exactEndgameEmpties),
      '--aspiration-window', String(aspirationWindow),
      '--max-table-entries', String(maxTableEntries),
      '--output-json', throughputPath,
    ],
    { cwd },
  );

  for (const [algorithm, outputPath] of [
    ['classic-mtdf', classicVsMtdfPath],
    ['classic-mtdf-2ply', classicVsMtdf2Path],
  ]) {
    runNodeScript(
      path.resolve(cwd, 'tools/engine-match/benchmark-search-algorithm-pair.mjs'),
      [
        '--first-algorithm', 'classic',
        '--second-algorithm', algorithm,
        '--games', String(games),
        '--opening-plies', String(openingPlies),
        '--seed-list', pairSeedList,
        '--time-ms-list', timeMsList,
        '--max-depth', String(maxDepth),
        '--exact-endgame-empties', String(exactEndgameEmpties),
        '--solver-adjudication-empties', String(solverAdjudicationEmpties),
        '--solver-adjudication-time-ms', String(solverAdjudicationTimeMs),
        '--max-table-entries', String(maxTableEntries),
        '--aspiration-window', String(aspirationWindow),
        '--output-json', outputPath,
      ],
      { cwd },
    );
  }

  const throughputSummary = JSON.parse(fs.readFileSync(throughputPath, 'utf8'));
  const classicVsMtdfSummary = JSON.parse(fs.readFileSync(classicVsMtdfPath, 'utf8'));
  const classicVsMtdf2Summary = JSON.parse(fs.readFileSync(classicVsMtdf2Path, 'utf8'));

  const candidates = [
    summarizeCandidate({ algorithm: 'classic-mtdf', throughputSummary, pairSummary: classicVsMtdfSummary }),
    summarizeCandidate({ algorithm: 'classic-mtdf-2ply', throughputSummary, pairSummary: classicVsMtdf2Summary }),
  ].sort((left, right) => {
    if (right.averagePointGap !== left.averagePointGap) {
      return right.averagePointGap - left.averagePointGap;
    }
    return right.averageNodesPerMsGainRate - left.averageNodesPerMsGainRate;
  });

  const selectedCandidate = candidates[0] ?? null;
  const adoptionRecommendation = selectedCandidate?.recommendation === 'adopt-candidate'
    ? selectedCandidate.algorithm
    : null;

  const summary = {
    type: 'stage132-classic-mtdf-suite',
    generatedAt: new Date().toISOString(),
    options: {
      outputDir: relativePathFromCwd(outputDir) ?? outputDir,
      timeMsList,
      positionSeedList,
      pairSeedList,
      games,
      openingPlies,
      maxDepth,
      exactEndgameEmpties,
      solverAdjudicationEmpties,
      solverAdjudicationTimeMs,
      aspirationWindow,
      maxTableEntries,
    },
    outputs: {
      throughputPath: relativePathFromCwd(throughputPath) ?? throughputPath,
      classicVsMtdfPath: relativePathFromCwd(classicVsMtdfPath) ?? classicVsMtdfPath,
      classicVsMtdf2Path: relativePathFromCwd(classicVsMtdf2Path) ?? classicVsMtdf2Path,
    },
    candidates,
    selectedCandidate,
    adoptionRecommendation,
  };

  writeJson(summaryPath, summary);
  console.log(`Saved Stage 132 summary to ${relativePathFromCwd(summaryPath) ?? summaryPath}`);
}

main();
