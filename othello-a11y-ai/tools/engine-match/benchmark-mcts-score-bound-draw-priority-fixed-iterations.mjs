#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { parseArgs, relativePathFromCwd, resolveCliPath } from '../evaluator-training/lib.mjs';

const DEFAULTS = Object.freeze({
  repoRoot: process.cwd(),
  outputJson: null,
  algorithm: 'mcts-hybrid',
  iterationsList: [24, 32],
  emptiesList: [12],
  seedList: [15, 17, 31, 41, 47, 53, 71, 89, 107, 123, 149, 167],
  drawPriorityScales: [0, 0.35, 0.5],
  exactEndgameEmpties: 8,
  mctsSolverWldEmpties: 2,
  mctsExactContinuationExtraEmpties: 3,
  mctsProofPriorityScale: 0.15,
  mctsProofPriorityMaxEmpties: 12,
  mctsProofPriorityContinuationHandoffEnabled: true,
  maxDepth: 4,
  maxTableEntries: 90000,
  presetKey: 'custom',
  styleKey: 'balanced',
  referenceExactEmpties: 20,
  referenceTimeMs: 12000,
  timeLimitMs: 10000,
});

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/benchmark-mcts-score-bound-draw-priority-fixed-iterations.mjs \
    [--repo-root .] \
    [--iterations-list 24,32] \
    [--empties-list 12] \
    [--seed-list 15,17,...] \
    [--draw-priority-scales 0,0.35,0.5] \
    [--output-json benchmarks/stage108_mcts_score_bound_draw_priority_fixed_iterations.json]
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

function parseCsvNumbers(value, fallback) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [...fallback];
  }
  const parsed = value
    .split(',')
    .map((token) => Number(token.trim()))
    .filter((token) => Number.isFinite(token) && token >= 0)
    .map((token) => Math.round(token * 100) / 100);
  return parsed.length > 0 ? [...new Set(parsed)] : [...fallback];
}

function parseBoolean(value, fallback) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
      return false;
    }
  }
  return fallback;
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
    mctsMaxIterations: overrides.mctsMaxIterations,
    maxDepth: overrides.maxDepth,
    exactEndgameEmpties: overrides.exactEndgameEmpties,
    wldPreExactEmpties: overrides.wldPreExactEmpties ?? 0,
    mctsSolverEnabled: overrides.mctsSolverEnabled,
    mctsSolverWldEmpties: overrides.mctsSolverWldEmpties,
    mctsExactContinuationEnabled: overrides.mctsExactContinuationEnabled ?? true,
    mctsExactContinuationExtraEmpties: overrides.mctsExactContinuationExtraEmpties ?? 3,
    mctsProofPriorityEnabled: overrides.mctsProofPriorityEnabled,
    mctsProofPriorityScale: overrides.mctsProofPriorityScale,
    mctsProofPriorityMaxEmpties: overrides.mctsProofPriorityMaxEmpties,
    mctsProofPriorityContinuationHandoffEnabled: overrides.mctsProofPriorityContinuationHandoffEnabled,
    mctsProofMetricMode: overrides.mctsProofMetricMode ?? 'legacy-root',
    mctsScoreBoundsEnabled: overrides.mctsScoreBoundsEnabled ?? true,
    mctsScoreBoundDrawPriorityScale: overrides.mctsScoreBoundDrawPriorityScale ?? 0,
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
        mctsMaxIterations: undefined,
        exactEndgameEmpties: sharedOptions.referenceExactEmpties,
        wldPreExactEmpties: 0,
        mctsSolverEnabled: false,
        mctsSolverWldEmpties: 0,
        mctsExactContinuationEnabled: false,
        mctsExactContinuationExtraEmpties: 0,
        mctsProofPriorityEnabled: false,
        mctsProofPriorityScale: 0,
        mctsProofPriorityMaxEmpties: 0,
        mctsProofPriorityContinuationHandoffEnabled: false,
        mctsProofMetricMode: 'legacy-root',
        mctsScoreBoundsEnabled: false,
        mctsScoreBoundDrawPriorityScale: 0,
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
  return child.currentPlayer === rootPlayer ? childResult.score : -childResult.score;
}

function summarizeRun(result, chosenExactScore, referenceScore) {
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
    referenceScore,
    exactBestHit: Number.isFinite(chosenExactScore) && Number.isFinite(referenceScore) ? chosenExactScore === referenceScore : false,
    wldAgreement: Number.isFinite(chosenExactScore) && Number.isFinite(referenceScore) ? classifyOutcome(chosenExactScore) === classifyOutcome(referenceScore) : false,
    proven: Boolean(result?.isExactResult || result?.isWldResult),
    scoreLoss: Number.isFinite(chosenExactScore) && Number.isFinite(referenceScore) ? referenceScore - chosenExactScore : null,
    scoreBoundsEnabled: Boolean(proofTelemetry?.scoreBoundsEnabled),
    scoreBoundDrawPriorityEnabled: Boolean(proofTelemetry?.scoreBoundDrawPriorityEnabled),
    scoreBoundDrawPriorityScale: Number.isFinite(proofTelemetry?.scoreBoundDrawPriorityScale) ? proofTelemetry.scoreBoundDrawPriorityScale : null,
    scoreBoundDrawPriorityMode: proofTelemetry?.scoreBoundDrawPriorityMode ?? null,
    scoreBoundDrawPriorityBlockerCount: Number.isFinite(proofTelemetry?.scoreBoundDrawPriorityBlockerCount)
      ? proofTelemetry.scoreBoundDrawPriorityBlockerCount
      : null,
    rootScoreLowerBound: Number.isFinite(proofTelemetry?.rootScoreLowerBound) ? proofTelemetry.rootScoreLowerBound : null,
    rootScoreUpperBound: Number.isFinite(proofTelemetry?.rootScoreUpperBound) ? proofTelemetry.rootScoreUpperBound : null,
    rootScoreBoundWidth: Number.isFinite(proofTelemetry?.rootScoreBoundWidth) ? proofTelemetry.rootScoreBoundWidth : null,
    mctsIterations: Number.isFinite(result?.stats?.mctsIterations) ? result.stats.mctsIterations : null,
    mctsTreeNodes: Number.isFinite(result?.stats?.mctsTreeNodes) ? result.stats.mctsTreeNodes : null,
    mctsSolverRootProofs: Number.isFinite(result?.stats?.mctsSolverRootProofs) ? result.stats.mctsSolverRootProofs : null,
    mctsScoreBoundDominatedChildrenSkipped: Number.isFinite(result?.stats?.mctsScoreBoundDominatedChildrenSkipped) ? result.stats.mctsScoreBoundDominatedChildrenSkipped : null,
    mctsScoreBoundTraversalFilteredNodes: Number.isFinite(result?.stats?.mctsScoreBoundTraversalFilteredNodes) ? result.stats.mctsScoreBoundTraversalFilteredNodes : null,
    mctsScoreBoundDominatedTraversalSelections: Number.isFinite(result?.stats?.mctsScoreBoundDominatedTraversalSelections) ? result.stats.mctsScoreBoundDominatedTraversalSelections : null,
    mctsScoreBoundDrawPrioritySelectionNodes: Number.isFinite(result?.stats?.mctsScoreBoundDrawPrioritySelectionNodes) ? result.stats.mctsScoreBoundDrawPrioritySelectionNodes : null,
    mctsScoreBoundDrawPriorityRankedChildren: Number.isFinite(result?.stats?.mctsScoreBoundDrawPriorityRankedChildren) ? result.stats.mctsScoreBoundDrawPriorityRankedChildren : null,
    mctsScoreBoundDrawPriorityBlockerChildren: Number.isFinite(result?.stats?.mctsScoreBoundDrawPriorityBlockerChildren) ? result.stats.mctsScoreBoundDrawPriorityBlockerChildren : null,
  };
}

function average(values) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (filtered.length === 0) {
    return null;
  }
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function aggregateRuns(key, label, scale, runs) {
  const total = runs.length;
  const exactBestHits = runs.filter((entry) => entry?.exactBestHit).length;
  const wldAgreementHits = runs.filter((entry) => entry?.wldAgreement).length;
  const provenHits = runs.filter((entry) => entry?.proven).length;
  const exactResultHits = runs.filter((entry) => entry?.isExactResult).length;
  return {
    key,
    label,
    drawPriorityScale: scale,
    total,
    exactBestHits,
    exactBestHitRate: total > 0 ? exactBestHits / total : null,
    wldAgreementHits,
    wldAgreementRate: total > 0 ? wldAgreementHits / total : null,
    provenHits,
    provenRate: total > 0 ? provenHits / total : null,
    exactResultHits,
    exactResultRate: total > 0 ? exactResultHits / total : null,
    averageScoreLoss: average(runs.map((entry) => entry?.scoreLoss)),
    averageIterations: average(runs.map((entry) => entry?.mctsIterations)),
    averageTreeNodes: average(runs.map((entry) => entry?.mctsTreeNodes)),
    averageSolverRootProofs: average(runs.map((entry) => entry?.mctsSolverRootProofs)),
    averageScoreBoundDominatedChildrenSkipped: average(runs.map((entry) => entry?.mctsScoreBoundDominatedChildrenSkipped)),
    averageScoreBoundTraversalFilteredNodes: average(runs.map((entry) => entry?.mctsScoreBoundTraversalFilteredNodes)),
    averageScoreBoundDominatedTraversalSelections: average(runs.map((entry) => entry?.mctsScoreBoundDominatedTraversalSelections)),
    averageScoreBoundDrawPrioritySelectionNodes: average(runs.map((entry) => entry?.mctsScoreBoundDrawPrioritySelectionNodes)),
    averageScoreBoundDrawPriorityRankedChildren: average(runs.map((entry) => entry?.mctsScoreBoundDrawPriorityRankedChildren)),
    averageScoreBoundDrawPriorityBlockerChildren: average(runs.map((entry) => entry?.mctsScoreBoundDrawPriorityBlockerChildren)),
    averageRootScoreBoundWidth: average(runs.map((entry) => entry?.rootScoreBoundWidth)),
  };
}

function createVariantLabel(scale) {
  return scale > 0 ? `draw-priority x${scale}` : 'draw-priority off';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    process.exit(0);
  }

  const repoRoot = resolveCliPath(args['repo-root'] ?? DEFAULTS.repoRoot);
  const outputJson = args['output-json'] ? resolveCliPath(args['output-json']) : null;
  const algorithm = String(args.algorithm ?? DEFAULTS.algorithm).trim() || DEFAULTS.algorithm;
  const iterationsList = parseCsvIntegers(args['iterations-list'], DEFAULTS.iterationsList);
  const emptiesList = parseCsvIntegers(args['empties-list'], DEFAULTS.emptiesList);
  const seedList = parseCsvIntegers(args['seed-list'], DEFAULTS.seedList);
  const drawPriorityScales = parseCsvNumbers(args['draw-priority-scales'], DEFAULTS.drawPriorityScales);
  const exactEndgameEmpties = toFiniteInteger(args['exact-endgame-empties'], DEFAULTS.exactEndgameEmpties, 0, 20);
  const mctsSolverWldEmpties = toFiniteInteger(args['mcts-solver-wld-empties'], DEFAULTS.mctsSolverWldEmpties, 0, 12);
  const mctsExactContinuationExtraEmpties = toFiniteInteger(args['exact-continuation-extra-empties'], DEFAULTS.mctsExactContinuationExtraEmpties, 0, 8);
  const mctsProofPriorityScale = toFiniteNumber(args['proof-priority-scale'], DEFAULTS.mctsProofPriorityScale, 0, 5, 2);
  const mctsProofPriorityMaxEmpties = toFiniteInteger(args['proof-priority-max-empties'], DEFAULTS.mctsProofPriorityMaxEmpties, 0, 20);
  const mctsProofPriorityContinuationHandoffEnabled = parseBoolean(args['proof-priority-handoff'], DEFAULTS.mctsProofPriorityContinuationHandoffEnabled);
  const maxDepth = toFiniteInteger(args['max-depth'], DEFAULTS.maxDepth, 1, 64);
  const maxTableEntries = toFiniteInteger(args['max-table-entries'], DEFAULTS.maxTableEntries, 1000, 5000000);
  const presetKey = String(args['preset-key'] ?? DEFAULTS.presetKey);
  const styleKey = String(args['style-key'] ?? DEFAULTS.styleKey);
  const referenceExactEmpties = toFiniteInteger(args['reference-exact-empties'], DEFAULTS.referenceExactEmpties, 0, 64);
  const referenceTimeMs = toFiniteInteger(args['reference-time-ms'], DEFAULTS.referenceTimeMs, 1, 120000);
  const timeLimitMs = toFiniteInteger(args['time-limit-ms'], DEFAULTS.timeLimitMs, 1, 120000);

  const { SearchEngine, GameState } = await loadRepoModules(repoRoot);
  const exactReferenceAccessor = createExactReferenceAccessor(SearchEngine, {
    presetKey,
    styleKey,
    maxDepth,
    maxTableEntries,
    referenceExactEmpties,
    referenceTimeMs,
  });

  const variantConfigs = drawPriorityScales.map((scale, index) => ({
    key: `scale-${String(index).padStart(2, '0')}`,
    label: createVariantLabel(scale),
    scale,
  }));

  const scenarios = [];
  const runsByVariant = new Map(variantConfigs.map((variant) => [variant.key, []]));
  const runsByVariantAndIteration = new Map();
  const runsByVariantAndEmptyCount = new Map();

  for (const iterationBudget of iterationsList) {
    for (const variant of variantConfigs) {
      runsByVariantAndIteration.set(`${variant.key}:${iterationBudget}`, []);
    }

    for (const emptyCount of emptiesList) {
      for (const variant of variantConfigs) {
        runsByVariantAndEmptyCount.set(`${variant.key}:${iterationBudget}:${emptyCount}`, []);
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
          iterationBudget,
          rootPlayer,
          legalMoveCount: legalMoves.length,
          reference: {
            bestMoveCoord: reference?.bestMoveCoord ?? null,
            score: Number.isFinite(reference?.score) ? reference.score : null,
            exactScore: Number.isFinite(referenceExactScore) ? referenceExactScore : null,
            outcome: Number.isFinite(referenceExactScore) ? classifyOutcome(referenceExactScore) : null,
          },
          variants: {},
        };

        for (const variant of variantConfigs) {
          const engine = new SearchEngine(createSearchOptions({
            presetKey,
            styleKey,
            searchAlgorithm: algorithm,
            timeLimitMs,
            mctsMaxIterations: iterationBudget,
            maxDepth,
            exactEndgameEmpties,
            wldPreExactEmpties: 0,
            mctsSolverEnabled: true,
            mctsSolverWldEmpties,
            mctsExactContinuationEnabled: true,
            mctsExactContinuationExtraEmpties,
            mctsProofPriorityEnabled: true,
            mctsProofPriorityScale,
            mctsProofPriorityMaxEmpties,
            mctsProofPriorityContinuationHandoffEnabled,
            mctsProofMetricMode: 'legacy-root',
            mctsScoreBoundDrawPriorityScale: variant.scale,
            maxTableEntries,
          }));

          const result = withBenchRandom(seed * 100 + 7, () => engine.findBestMove(state));
          const chosenMove = legalMoves.find((move) => move.coord === result?.bestMoveCoord) ?? null;
          const chosenExactScore = evaluateMoveExactScore(state, chosenMove, rootPlayer, exactReferenceAccessor);
          const summarized = summarizeRun(result, chosenExactScore, referenceExactScore);
          scenario.variants[variant.key] = summarized;
          runsByVariant.get(variant.key).push(summarized);
          runsByVariantAndIteration.get(`${variant.key}:${iterationBudget}`).push(summarized);
          runsByVariantAndEmptyCount.get(`${variant.key}:${iterationBudget}:${emptyCount}`).push(summarized);
        }

        scenarios.push(scenario);
        console.log(`[score-bound-draw-priority-fixed] iters=${iterationBudget} empties=${emptyCount} seed=${seed} ref=${scenario.reference.bestMoveCoord}/${scenario.reference.exactScore}`);
      }
    }
  }

  const aggregates = variantConfigs.map((variant) => aggregateRuns(variant.key, variant.label, variant.scale, runsByVariant.get(variant.key) ?? []));
  const aggregatesByIteration = iterationsList.map((iterationBudget) => ({
    iterationBudget,
    variants: variantConfigs.map((variant) => aggregateRuns(
      variant.key,
      variant.label,
      variant.scale,
      runsByVariantAndIteration.get(`${variant.key}:${iterationBudget}`) ?? [],
    )),
  }));
  const aggregatesByEmptyCount = iterationsList.flatMap((iterationBudget) => emptiesList.map((emptyCount) => ({
    iterationBudget,
    emptyCount,
    variants: variantConfigs.map((variant) => aggregateRuns(
      variant.key,
      variant.label,
      variant.scale,
      runsByVariantAndEmptyCount.get(`${variant.key}:${iterationBudget}:${emptyCount}`) ?? [],
    )),
  })));

  const summary = {
    type: 'mcts-score-bound-draw-priority-fixed-iterations-benchmark',
    generatedAt: new Date().toISOString(),
    repoRoot: relativePathFromCwd(repoRoot),
    options: {
      algorithm,
      iterationsList,
      emptiesList,
      seedList,
      drawPriorityScales,
      exactEndgameEmpties,
      mctsSolverWldEmpties,
      mctsExactContinuationExtraEmpties,
      mctsProofPriorityScale,
      mctsProofPriorityMaxEmpties,
      mctsProofPriorityContinuationHandoffEnabled,
      maxDepth,
      maxTableEntries,
      presetKey,
      styleKey,
      referenceExactEmpties,
      referenceTimeMs,
      timeLimitMs,
    },
    variants: variantConfigs,
    scenarios,
    aggregates,
    aggregatesByIteration,
    aggregatesByEmptyCount,
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
