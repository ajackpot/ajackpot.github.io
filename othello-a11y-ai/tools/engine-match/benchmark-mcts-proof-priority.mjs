#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { parseArgs, relativePathFromCwd, resolveCliPath } from '../evaluator-training/lib.mjs';

const DEFAULTS = Object.freeze({
  repoRoot: process.cwd(),
  outputJson: null,
  algorithm: 'mcts-hybrid',
  timeMs: 120,
  emptiesList: [9, 10, 11, 12],
  seedList: [17, 31, 41, 53],
  exactEndgameEmpties: 8,
  mctsSolverWldEmpties: 2,
  mctsProofPriorityScaleList: [0.15, 0.35, 0.65],
  mctsProofPriorityMaxEmpties: 12,
  maxDepth: 4,
  maxTableEntries: 90000,
  presetKey: 'custom',
  styleKey: 'balanced',
  referenceExactEmpties: 20,
  referenceTimeMs: 12000,
});

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/benchmark-mcts-proof-priority.mjs \
    [--repo-root .] \
    [--algorithm mcts-hybrid] \
    [--time-ms 120] \
    [--empties-list 9,10,11,12] \
    [--seed-list 17,31,41,53] \
    [--exact-endgame-empties 8] \
    [--mcts-solver-wld-empties 2] \
    [--proof-priority-scale-list 0.15,0.35,0.65] \
    [--proof-priority-max-empties 12] \
    [--output-json benchmarks/stage103_mcts_proof_priority_120ms.json]

설명:
- 같은 repo에서 late-position 묶음을 생성한 뒤, solver는 켜고 exact continuation은 꺼 둔 상태에서
  PN/PPN-inspired proof-priority bias off / 여러 scale 후보를 exact reference와 함께 비교합니다.
- proof-priority는 root-player proof/disproof frontier rank를 selection bonus로 바꾸는 prototype입니다.
`);
}

function toFiniteInteger(value, fallback, minimum = Number.NEGATIVE_INFINITY, maximum = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
}

function toFiniteNumber(value, fallback, minimum = Number.NEGATIVE_INFINITY, maximum = Number.POSITIVE_INFINITY, precision = 2) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const clamped = Math.max(minimum, Math.min(maximum, parsed));
  const multiplier = 10 ** precision;
  return Math.round(clamped * multiplier) / multiplier;
}

function parseCsvIntegers(value, fallback) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [...fallback];
  }

  const parsed = value
    .split(',')
    .map((token) => Number(token.trim()))
    .filter((token) => Number.isFinite(token) && token > 0)
    .map((token) => Math.round(token));

  return parsed.length > 0 ? [...new Set(parsed)] : [...fallback];
}

function parseCsvNumbers(value, fallback, minimum = Number.NEGATIVE_INFINITY, maximum = Number.POSITIVE_INFINITY, precision = 2) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [...fallback];
  }

  const parsed = value
    .split(',')
    .map((token) => Number(token.trim()))
    .filter((token) => Number.isFinite(token) && token >= minimum && token <= maximum)
    .map((token) => {
      const multiplier = 10 ** precision;
      return Math.round(token * multiplier) / multiplier;
    });

  return parsed.length > 0 ? [...new Set(parsed)] : [...fallback];
}

function createSeededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function withBenchRandom(seed, callback) {
  const originalRandom = Math.random;
  Math.random = createSeededRandom(seed);
  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
}

function classifyOutcome(score) {
  if (score > 0) {
    return 'win';
  }
  if (score < 0) {
    return 'loss';
  }
  return 'draw';
}

function sortLegalMoves(state) {
  return state.getLegalMoves().sort((left, right) => left.coord.localeCompare(right.coord));
}

function createLatePosition(GameState, targetEmptyCount, seed) {
  const random = createSeededRandom(seed);
  let state = GameState.initial();
  let guard = 0;

  while (!state.isTerminal() && state.getEmptyCount() > targetEmptyCount) {
    const legalMoves = sortLegalMoves(state);
    state = legalMoves.length === 0
      ? state.passTurn()
      : state.applyMove(legalMoves[Math.floor(random() * legalMoves.length)].index).state;

    guard += 1;
    if (guard > 200) {
      throw new Error('Late-position generator exceeded guard.');
    }
  }

  return state;
}

function normalizeAfterPasses(state) {
  let current = state;
  let passes = 0;
  while (!current.isTerminal() && current.getLegalMoves().length === 0) {
    current = current.passTurn();
    passes += 1;
    if (passes > 4) {
      throw new Error('Pass normalization exceeded guard.');
    }
  }
  return current;
}

async function loadRepoModules(repoRoot) {
  const searchEngineModulePath = path.resolve(repoRoot, 'js', 'ai', 'search-engine.js');
  const gameStateModulePath = path.resolve(repoRoot, 'js', 'core', 'game-state.js');
  const [{ SearchEngine }, { GameState }] = await Promise.all([
    import(pathToFileURL(searchEngineModulePath).href),
    import(pathToFileURL(gameStateModulePath).href),
  ]);
  return { SearchEngine, GameState };
}

function createSearchOptions(overrides = {}) {
  return {
    presetKey: overrides.presetKey,
    styleKey: overrides.styleKey,
    searchAlgorithm: overrides.searchAlgorithm,
    timeLimitMs: overrides.timeLimitMs,
    maxDepth: overrides.maxDepth,
    exactEndgameEmpties: overrides.exactEndgameEmpties,
    wldPreExactEmpties: overrides.wldPreExactEmpties ?? 0,
    mctsSolverEnabled: overrides.mctsSolverEnabled,
    mctsSolverWldEmpties: overrides.mctsSolverWldEmpties,
    mctsExactContinuationEnabled: overrides.mctsExactContinuationEnabled ?? false,
    mctsExactContinuationExtraEmpties: overrides.mctsExactContinuationExtraEmpties ?? 0,
    mctsProofPriorityEnabled: overrides.mctsProofPriorityEnabled,
    mctsProofPriorityScale: overrides.mctsProofPriorityScale,
    mctsProofPriorityMaxEmpties: overrides.mctsProofPriorityMaxEmpties,
    aspirationWindow: 0,
    openingRandomness: 0,
    searchRandomness: 0,
    randomness: 0,
    maxTableEntries: overrides.maxTableEntries,
  };
}

function createExactReferenceAccessor(SearchEngine, sharedOptions) {
  const resultCache = new Map();

  return {
    getResult(state) {
      const key = state.hashKey();
      if (resultCache.has(key)) {
        return resultCache.get(key);
      }

      const engine = new SearchEngine(createSearchOptions({
        ...sharedOptions,
        searchAlgorithm: 'classic',
        timeLimitMs: sharedOptions.referenceTimeMs,
        exactEndgameEmpties: sharedOptions.referenceExactEmpties,
        wldPreExactEmpties: 0,
        mctsSolverEnabled: false,
        mctsSolverWldEmpties: 0,
        mctsExactContinuationEnabled: false,
        mctsExactContinuationExtraEmpties: 0,
        mctsProofPriorityEnabled: false,
        mctsProofPriorityScale: 0,
        mctsProofPriorityMaxEmpties: 0,
      }));
      const result = engine.findBestMove(state);
      resultCache.set(key, result);
      return result;
    },
  };
}

function evaluateMoveExactScore(state, move, rootPlayer, exactReferenceAccessor) {
  if (!move) {
    return null;
  }

  const applied = state.applyMove(move.index);
  if (!applied?.state) {
    return null;
  }

  const child = normalizeAfterPasses(applied.state);
  if (child.isTerminal()) {
    return child.getDiscDifferential(rootPlayer) * 10000;
  }

  const childResult = exactReferenceAccessor.getResult(child);
  return child.currentPlayer === rootPlayer
    ? childResult.score
    : -childResult.score;
}

function summarizeRun(result, chosenExactScore, referenceScore) {
  const proven = Boolean(result?.isExactResult || result?.isWldResult);
  const scoreLoss = Number.isFinite(chosenExactScore) && Number.isFinite(referenceScore)
    ? referenceScore - chosenExactScore
    : null;
  const proofTelemetry = result?.mctsProofTelemetry ?? null;
  return {
    bestMoveCoord: result?.bestMoveCoord ?? null,
    score: Number.isFinite(result?.score) ? result.score : null,
    searchMode: result?.searchMode ?? null,
    searchCompletion: result?.searchCompletion ?? null,
    isExactResult: Boolean(result?.isExactResult),
    isWldResult: Boolean(result?.isWldResult),
    wldOutcome: result?.wldOutcome ?? null,
    mctsRootSolvedOutcome: result?.mctsRootSolvedOutcome ?? null,
    mctsRootSolvedExact: Boolean(result?.mctsRootSolvedExact),
    chosenExactScore,
    chosenExactOutcome: Number.isFinite(chosenExactScore) ? classifyOutcome(chosenExactScore) : null,
    exactBestHit: Number.isFinite(chosenExactScore) && chosenExactScore === referenceScore,
    wldAgreement: Number.isFinite(chosenExactScore) && classifyOutcome(chosenExactScore) === classifyOutcome(referenceScore),
    scoreLoss,
    proven,
    elapsedMs: Number.isFinite(result?.stats?.elapsedMs) ? result.stats.elapsedMs : null,
    mctsIterations: Number.isFinite(result?.stats?.mctsIterations) ? result.stats.mctsIterations : null,
    mctsTreeNodes: Number.isFinite(result?.stats?.mctsTreeNodes) ? result.stats.mctsTreeNodes : null,
    mctsSolverStateProbes: Number.isFinite(result?.stats?.mctsSolverStateProbes) ? result.stats.mctsSolverStateProbes : 0,
    mctsSolverCacheHits: Number.isFinite(result?.stats?.mctsSolverCacheHits) ? result.stats.mctsSolverCacheHits : 0,
    mctsSolverExactHits: Number.isFinite(result?.stats?.mctsSolverExactHits) ? result.stats.mctsSolverExactHits : 0,
    mctsSolverWldHits: Number.isFinite(result?.stats?.mctsSolverWldHits) ? result.stats.mctsSolverWldHits : 0,
    mctsSolverNodeSolves: Number.isFinite(result?.stats?.mctsSolverNodeSolves) ? result.stats.mctsSolverNodeSolves : 0,
    mctsSolverPropagationUpdates: Number.isFinite(result?.stats?.mctsSolverPropagationUpdates) ? result.stats.mctsSolverPropagationUpdates : 0,
    mctsSolverRootProofs: Number.isFinite(result?.stats?.mctsSolverRootProofs) ? result.stats.mctsSolverRootProofs : 0,
    mctsProofNumberUpdates: Number.isFinite(result?.stats?.mctsProofNumberUpdates) ? result.stats.mctsProofNumberUpdates : 0,
    mctsProofPrioritySelectionNodes: Number.isFinite(result?.stats?.mctsProofPrioritySelectionNodes) ? result.stats.mctsProofPrioritySelectionNodes : 0,
    mctsProofPriorityRankedChildren: Number.isFinite(result?.stats?.mctsProofPriorityRankedChildren) ? result.stats.mctsProofPriorityRankedChildren : 0,
    mctsRootProofNumber: Number.isFinite(result?.mctsRootProofNumber) ? result.mctsRootProofNumber : null,
    mctsRootDisproofNumber: Number.isFinite(result?.mctsRootDisproofNumber) ? result.mctsRootDisproofNumber : null,
    bestMoveProofRank: Number.isFinite(proofTelemetry?.bestMoveProofRank) ? proofTelemetry.bestMoveProofRank : null,
    bestMoveProofBonus: Number.isFinite(proofTelemetry?.bestMoveProofBonus) ? proofTelemetry.bestMoveProofBonus : null,
    proofPriorityMetric: typeof proofTelemetry?.proofPriorityMetric === 'string' ? proofTelemetry.proofPriorityMetric : null,
    proofPriorityEnabled: Boolean(proofTelemetry?.proofPriorityEnabled),
    proofPriorityDepthEligible: Boolean(proofTelemetry?.proofPriorityDepthEligible),
  };
}

function average(values) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (filtered.length === 0) {
    return null;
  }
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function aggregateRuns(label, runs) {
  const positions = runs.length;
  const exactBestHits = runs.filter((entry) => entry?.exactBestHit).length;
  const wldAgreements = runs.filter((entry) => entry?.wldAgreement).length;
  const provenCount = runs.filter((entry) => entry?.proven).length;
  const exactResultCount = runs.filter((entry) => entry?.isExactResult).length;
  const rootSolvedCount = runs.filter((entry) => entry?.mctsRootSolvedOutcome !== null).length;
  return {
    label,
    positions,
    exactBestHits,
    exactBestHitRate: positions > 0 ? exactBestHits / positions : null,
    wldAgreements,
    wldAgreementRate: positions > 0 ? wldAgreements / positions : null,
    provenCount,
    provenRate: positions > 0 ? provenCount / positions : null,
    exactResultCount,
    exactResultRate: positions > 0 ? exactResultCount / positions : null,
    rootSolvedCount,
    rootSolvedRate: positions > 0 ? rootSolvedCount / positions : null,
    averageScoreLoss: average(runs.map((entry) => entry?.scoreLoss)),
    averageElapsedMs: average(runs.map((entry) => entry?.elapsedMs)),
    averageIterations: average(runs.map((entry) => entry?.mctsIterations)),
    averageTreeNodes: average(runs.map((entry) => entry?.mctsTreeNodes)),
    averageSolverStateProbes: average(runs.map((entry) => entry?.mctsSolverStateProbes)),
    averageSolverRootProofs: average(runs.map((entry) => entry?.mctsSolverRootProofs)),
    averageProofNumberUpdates: average(runs.map((entry) => entry?.mctsProofNumberUpdates)),
    averageProofPrioritySelectionNodes: average(runs.map((entry) => entry?.mctsProofPrioritySelectionNodes)),
    averageProofPriorityRankedChildren: average(runs.map((entry) => entry?.mctsProofPriorityRankedChildren)),
    averageBestMoveProofRank: average(runs.map((entry) => entry?.bestMoveProofRank)),
  };
}

function createVariantKey(scale) {
  if (!Number.isFinite(scale) || scale <= 0) {
    return 'off';
  }
  return `scale_${String(scale).replace(/\./g, '_')}`;
}

function createVariantDisplayLabel(scale) {
  if (!Number.isFinite(scale) || scale <= 0) {
    return 'proof-priority off';
  }
  return `proof-priority x${scale}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    process.exit(0);
  }

  const repoRoot = resolveCliPath(args['repo-root'] ?? DEFAULTS.repoRoot);
  const outputJson = args['output-json']
    ? resolveCliPath(args['output-json'])
    : null;
  const algorithm = String(args.algorithm ?? DEFAULTS.algorithm).trim() || DEFAULTS.algorithm;
  const timeMs = toFiniteInteger(args['time-ms'], DEFAULTS.timeMs, 1, 60000);
  const emptiesList = parseCsvIntegers(args['empties-list'], DEFAULTS.emptiesList);
  const seedList = parseCsvIntegers(args['seed-list'], DEFAULTS.seedList);
  const exactEndgameEmpties = toFiniteInteger(args['exact-endgame-empties'], DEFAULTS.exactEndgameEmpties, 0, 20);
  const mctsSolverWldEmpties = toFiniteInteger(args['mcts-solver-wld-empties'], DEFAULTS.mctsSolverWldEmpties, 0, 12);
  const proofPriorityScaleList = parseCsvNumbers(args['proof-priority-scale-list'], DEFAULTS.mctsProofPriorityScaleList, 0.01, 5, 2);
  const mctsProofPriorityMaxEmpties = toFiniteInteger(args['proof-priority-max-empties'], DEFAULTS.mctsProofPriorityMaxEmpties, 0, 20);
  const maxDepth = toFiniteInteger(args['max-depth'], DEFAULTS.maxDepth, 1, 64);
  const maxTableEntries = toFiniteInteger(args['max-table-entries'], DEFAULTS.maxTableEntries, 1000, 5000000);
  const presetKey = String(args['preset-key'] ?? DEFAULTS.presetKey);
  const styleKey = String(args['style-key'] ?? DEFAULTS.styleKey);
  const referenceExactEmpties = toFiniteInteger(args['reference-exact-empties'], DEFAULTS.referenceExactEmpties, 0, 64);
  const referenceTimeMs = toFiniteInteger(args['reference-time-ms'], DEFAULTS.referenceTimeMs, 1, 120000);

  const { SearchEngine, GameState } = await loadRepoModules(repoRoot);
  const exactReferenceAccessor = createExactReferenceAccessor(SearchEngine, {
    presetKey,
    styleKey,
    maxDepth,
    maxTableEntries,
    referenceExactEmpties,
    referenceTimeMs,
  });

  const scales = [0, ...proofPriorityScaleList.filter((value) => Number.isFinite(value) && value > 0)];
  const variantConfigs = scales.map((scale) => ({
    key: createVariantKey(scale),
    label: createVariantDisplayLabel(scale),
    enabled: scale > 0,
    scale,
    maxEmpties: scale > 0 ? mctsProofPriorityMaxEmpties : 0,
  }));

  const scenarios = [];
  const runsByVariant = new Map(variantConfigs.map((variant) => [variant.key, []]));
  const runsByVariantAndEmptyCount = new Map();

  for (const emptyCount of emptiesList) {
    for (const variant of variantConfigs) {
      runsByVariantAndEmptyCount.set(`${variant.key}:${emptyCount}`, []);
    }

    for (const seed of seedList) {
      const state = createLatePosition(GameState, emptyCount, seed);
      const rootPlayer = state.currentPlayer;
      const legalMoves = sortLegalMoves(state);
      const reference = exactReferenceAccessor.getResult(state);
      const referenceMove = legalMoves.find((move) => move.coord === reference?.bestMoveCoord) ?? null;
      const referenceExactScore = evaluateMoveExactScore(state, referenceMove, rootPlayer, exactReferenceAccessor);

      const scenario = {
        emptyCount,
        seed,
        rootPlayer,
        legalMoveCount: legalMoves.length,
        reference: {
          bestMoveCoord: reference?.bestMoveCoord ?? null,
          score: Number.isFinite(reference?.score) ? reference.score : null,
          outcome: Number.isFinite(referenceExactScore) ? classifyOutcome(referenceExactScore) : null,
        },
        variants: {},
      };

      for (const variant of variantConfigs) {
        const engine = new SearchEngine(createSearchOptions({
          presetKey,
          styleKey,
          searchAlgorithm: algorithm,
          timeLimitMs: timeMs,
          maxDepth,
          exactEndgameEmpties,
          wldPreExactEmpties: 0,
          mctsSolverEnabled: true,
          mctsSolverWldEmpties,
          mctsExactContinuationEnabled: false,
          mctsExactContinuationExtraEmpties: 0,
          mctsProofPriorityEnabled: variant.enabled,
          mctsProofPriorityScale: variant.scale,
          mctsProofPriorityMaxEmpties: variant.maxEmpties,
          maxTableEntries,
        }));

        const result = withBenchRandom(seed, () => engine.findBestMove(state));
        const chosenMove = legalMoves.find((move) => move.coord === result?.bestMoveCoord) ?? null;
        const chosenExactScore = evaluateMoveExactScore(state, chosenMove, rootPlayer, exactReferenceAccessor);
        const summarized = summarizeRun(result, chosenExactScore, referenceExactScore);
        scenario.variants[variant.key] = summarized;
        runsByVariant.get(variant.key).push(summarized);
        runsByVariantAndEmptyCount.get(`${variant.key}:${emptyCount}`).push(summarized);
      }

      scenarios.push(scenario);
      console.log(
        `[proof-priority] empties=${emptyCount} seed=${seed} ref=${scenario.reference.bestMoveCoord}/${scenario.reference.score}`,
      );
    }
  }

  const aggregates = variantConfigs.map((variant) => aggregateRuns(variant.key, runsByVariant.get(variant.key) ?? []));
  const aggregatesByEmptyCount = emptiesList.map((emptyCount) => ({
    emptyCount,
    variants: variantConfigs.map((variant) => aggregateRuns(variant.key, runsByVariantAndEmptyCount.get(`${variant.key}:${emptyCount}`) ?? [])),
  }));

  const toplineByLabel = Object.fromEntries(aggregates.map((aggregate) => [aggregate.label, aggregate]));
  const bestExactBestHitRate = Math.max(...aggregates.map((aggregate) => aggregate.exactBestHitRate ?? 0));
  const bestProvenRate = Math.max(...aggregates.map((aggregate) => aggregate.provenRate ?? 0));

  const summary = {
    type: 'mcts-proof-priority-benchmark',
    generatedAt: new Date().toISOString(),
    repoRoot: relativePathFromCwd(repoRoot),
    options: {
      algorithm,
      timeMs,
      emptiesList,
      seedList,
      exactEndgameEmpties,
      mctsSolverWldEmpties,
      proofPriorityScaleList,
      mctsProofPriorityMaxEmpties,
      maxDepth,
      maxTableEntries,
      presetKey,
      styleKey,
      referenceExactEmpties,
      referenceTimeMs,
    },
    variants: variantConfigs,
    scenarios,
    aggregates,
    aggregatesByEmptyCount,
    topline: {
      positions: scenarios.length,
      byLabel: toplineByLabel,
      bestExactBestHitRate,
      bestExactBestHitLabels: aggregates
        .filter((aggregate) => (aggregate.exactBestHitRate ?? 0) === bestExactBestHitRate)
        .map((aggregate) => aggregate.label),
      bestProvenRate,
      bestProvenLabels: aggregates
        .filter((aggregate) => (aggregate.provenRate ?? 0) === bestProvenRate)
        .map((aggregate) => aggregate.label),
    },
  };

  if (outputJson) {
    fs.mkdirSync(path.dirname(outputJson), { recursive: true });
    fs.writeFileSync(outputJson, JSON.stringify(summary, null, 2));
    console.log(`Saved JSON summary to ${relativePathFromCwd(outputJson)}`);
  } else {
    console.log(JSON.stringify(summary, null, 2));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
