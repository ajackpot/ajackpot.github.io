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
  emptiesList: [12],
  seedList: [15, 17, 31, 41, 47, 53, 71, 89, 107, 123, 149, 167],
  exactEndgameEmpties: 8,
  mctsSolverWldEmpties: 2,
  mctsExactContinuationExtraEmpties: 3,
  mctsProofPriorityScale: 0.15,
  mctsProofPriorityMaxEmpties: 12,
  mctsProofPriorityContinuationHandoffEnabled: true,
  scoreBoundsVariants: ['off', 'on'],
  maxDepth: 4,
  maxTableEntries: 90000,
  presetKey: 'custom',
  styleKey: 'balanced',
  referenceExactEmpties: 20,
  referenceTimeMs: 12000,
});

const FULL_SCORE_BOUND = 64 * 10000;

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/benchmark-mcts-score-bounds.mjs \
    [--repo-root .] \
    [--algorithm mcts-hybrid] \
    [--time-ms 120] \
    [--empties-list 12] \
    [--seed-list 15,17,31,41,47,53,71,89,107,123,149,167] \
    [--exact-endgame-empties 8] \
    [--mcts-solver-wld-empties 2] \
    [--exact-continuation-extra-empties 3] \
    [--proof-priority-scale 0.15] \
    [--proof-priority-max-empties 12] \
    [--proof-priority-handoff true] \
    [--score-bounds-variants off,on] \
    [--output-json benchmarks/stage106_mcts_score_bounds_120ms.json]

설명:
- Stage 104/105 late lane(12 empties 근방 proof-priority + 11 empties continuation bridge)를 기준으로,
  score-bounds off 구성과 score-bounds on 구성을 exact reference와 함께 비교합니다.
- 결과 JSON에는 전체 aggregate뿐 아니라 reference outcome(win/draw/loss)별 aggregate도 포함됩니다.
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

function parseCsvVariants(value, fallback, allowedValues) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [...fallback];
  }

  const parsed = value
    .split(',')
    .map((token) => token.trim())
    .filter((token) => allowedValues.includes(token));

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
    mctsScoreBoundsEnabled: overrides.mctsScoreBoundsEnabled,
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
  const rootScoreLowerBound = Number.isFinite(proofTelemetry?.rootScoreLowerBound)
    ? proofTelemetry.rootScoreLowerBound
    : null;
  const rootScoreUpperBound = Number.isFinite(proofTelemetry?.rootScoreUpperBound)
    ? proofTelemetry.rootScoreUpperBound
    : null;
  const rootScoreBoundWidth = Number.isFinite(proofTelemetry?.rootScoreBoundWidth)
    ? proofTelemetry.rootScoreBoundWidth
    : null;
  const bestMoveScoreLowerBound = Number.isFinite(proofTelemetry?.bestMoveScoreLowerBound)
    ? proofTelemetry.bestMoveScoreLowerBound
    : null;
  const bestMoveScoreUpperBound = Number.isFinite(proofTelemetry?.bestMoveScoreUpperBound)
    ? proofTelemetry.bestMoveScoreUpperBound
    : null;
  const bestMoveScoreBoundWidth = Number.isFinite(proofTelemetry?.bestMoveScoreBoundWidth)
    ? proofTelemetry.bestMoveScoreBoundWidth
    : null;
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
    mctsSolverRootProofs: Number.isFinite(result?.stats?.mctsSolverRootProofs) ? result.stats.mctsSolverRootProofs : 0,
    mctsProofPrioritySelectionNodes: Number.isFinite(result?.stats?.mctsProofPrioritySelectionNodes)
      ? result.stats.mctsProofPrioritySelectionNodes
      : 0,
    mctsProofPriorityRankedChildren: Number.isFinite(result?.stats?.mctsProofPriorityRankedChildren)
      ? result.stats.mctsProofPriorityRankedChildren
      : 0,
    mctsScoreBoundUpdates: Number.isFinite(result?.stats?.mctsScoreBoundUpdates)
      ? result.stats.mctsScoreBoundUpdates
      : 0,
    mctsScoreBoundExactSolves: Number.isFinite(result?.stats?.mctsScoreBoundExactSolves)
      ? result.stats.mctsScoreBoundExactSolves
      : 0,
    mctsScoreBoundOutcomeSolves: Number.isFinite(result?.stats?.mctsScoreBoundOutcomeSolves)
      ? result.stats.mctsScoreBoundOutcomeSolves
      : 0,
    mctsScoreBoundDominatedChildrenSkipped: Number.isFinite(result?.stats?.mctsScoreBoundDominatedChildrenSkipped)
      ? result.stats.mctsScoreBoundDominatedChildrenSkipped
      : 0,
    mctsScoreBoundTraversalFilteredNodes: Number.isFinite(result?.stats?.mctsScoreBoundTraversalFilteredNodes)
      ? result.stats.mctsScoreBoundTraversalFilteredNodes
      : 0,
    mctsScoreBoundDominatedTraversalSelections: Number.isFinite(result?.stats?.mctsScoreBoundDominatedTraversalSelections)
      ? result.stats.mctsScoreBoundDominatedTraversalSelections
      : 0,
    scoreBoundsEnabled: Boolean(proofTelemetry?.scoreBoundsEnabled),
    rootScoreLowerBound,
    rootScoreUpperBound,
    rootScoreBoundWidth,
    bestMoveScoreLowerBound,
    bestMoveScoreUpperBound,
    bestMoveScoreBoundWidth,
    rootScoreBoundsNarrowed: Number.isFinite(rootScoreLowerBound)
      && Number.isFinite(rootScoreUpperBound)
      && (rootScoreLowerBound > -FULL_SCORE_BOUND || rootScoreUpperBound < FULL_SCORE_BOUND),
    bestMoveScoreBoundsNarrowed: Number.isFinite(bestMoveScoreLowerBound)
      && Number.isFinite(bestMoveScoreUpperBound)
      && (bestMoveScoreLowerBound > -FULL_SCORE_BOUND || bestMoveScoreUpperBound < FULL_SCORE_BOUND),
    rootSolved: Boolean(proofTelemetry?.rootSolved),
    rootSolvedOutcome: typeof proofTelemetry?.rootSolvedOutcome === 'string' ? proofTelemetry.rootSolvedOutcome : null,
    rootSolvedSource: typeof proofTelemetry?.rootSolvedSource === 'string' ? proofTelemetry.rootSolvedSource : null,
    proofPriorityEnabled: Boolean(proofTelemetry?.proofPriorityEnabled),
    proofPrioritySuppressedByContinuationWindow: Boolean(proofTelemetry?.proofPrioritySuppressedByContinuationWindow),
    exactContinuationApplied: Boolean(proofTelemetry?.exactContinuationApplied),
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
  const rootBoundsNarrowedCount = runs.filter((entry) => entry?.rootScoreBoundsNarrowed).length;
  const bestMoveBoundsNarrowedCount = runs.filter((entry) => entry?.bestMoveScoreBoundsNarrowed).length;
  const boundCutCount = runs.filter((entry) => (entry?.mctsScoreBoundDominatedChildrenSkipped ?? 0) > 0).length;
  const traversalFilteredCount = runs.filter((entry) => (entry?.mctsScoreBoundTraversalFilteredNodes ?? 0) > 0).length;
  const dominatedTraversalSelectionCount = runs.filter((entry) => (entry?.mctsScoreBoundDominatedTraversalSelections ?? 0) > 0).length;
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
    rootBoundsNarrowedCount,
    rootBoundsNarrowedRate: positions > 0 ? rootBoundsNarrowedCount / positions : null,
    bestMoveBoundsNarrowedCount,
    bestMoveBoundsNarrowedRate: positions > 0 ? bestMoveBoundsNarrowedCount / positions : null,
    boundCutCount,
    boundCutRate: positions > 0 ? boundCutCount / positions : null,
    traversalFilteredCount,
    traversalFilteredRate: positions > 0 ? traversalFilteredCount / positions : null,
    dominatedTraversalSelectionCount,
    dominatedTraversalSelectionRate: positions > 0 ? dominatedTraversalSelectionCount / positions : null,
    averageScoreLoss: average(runs.map((entry) => entry?.scoreLoss)),
    averageElapsedMs: average(runs.map((entry) => entry?.elapsedMs)),
    averageIterations: average(runs.map((entry) => entry?.mctsIterations)),
    averageTreeNodes: average(runs.map((entry) => entry?.mctsTreeNodes)),
    averageSolverStateProbes: average(runs.map((entry) => entry?.mctsSolverStateProbes)),
    averageSolverRootProofs: average(runs.map((entry) => entry?.mctsSolverRootProofs)),
    averageProofPrioritySelectionNodes: average(runs.map((entry) => entry?.mctsProofPrioritySelectionNodes)),
    averageProofPriorityRankedChildren: average(runs.map((entry) => entry?.mctsProofPriorityRankedChildren)),
    averageScoreBoundUpdates: average(runs.map((entry) => entry?.mctsScoreBoundUpdates)),
    averageScoreBoundExactSolves: average(runs.map((entry) => entry?.mctsScoreBoundExactSolves)),
    averageScoreBoundOutcomeSolves: average(runs.map((entry) => entry?.mctsScoreBoundOutcomeSolves)),
    averageScoreBoundDominatedChildrenSkipped: average(runs.map((entry) => entry?.mctsScoreBoundDominatedChildrenSkipped)),
    averageScoreBoundTraversalFilteredNodes: average(runs.map((entry) => entry?.mctsScoreBoundTraversalFilteredNodes)),
    averageScoreBoundDominatedTraversalSelections: average(runs.map((entry) => entry?.mctsScoreBoundDominatedTraversalSelections)),
    averageRootScoreBoundWidth: average(runs.map((entry) => entry?.rootScoreBoundWidth)),
    averageBestMoveScoreBoundWidth: average(runs.map((entry) => entry?.bestMoveScoreBoundWidth)),
  };
}

function createVariantDisplayLabel(scoreBoundsVariant) {
  return scoreBoundsVariant === 'on'
    ? 'score-bounds on'
    : 'score-bounds off';
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
  const mctsExactContinuationExtraEmpties = toFiniteInteger(args['exact-continuation-extra-empties'], DEFAULTS.mctsExactContinuationExtraEmpties, 0, 8);
  const mctsProofPriorityScale = toFiniteNumber(args['proof-priority-scale'], DEFAULTS.mctsProofPriorityScale, 0, 5, 2);
  const mctsProofPriorityMaxEmpties = toFiniteInteger(args['proof-priority-max-empties'], DEFAULTS.mctsProofPriorityMaxEmpties, 0, 20);
  const mctsProofPriorityContinuationHandoffEnabled = parseBoolean(
    args['proof-priority-handoff'],
    DEFAULTS.mctsProofPriorityContinuationHandoffEnabled,
  );
  const scoreBoundsVariants = parseCsvVariants(
    args['score-bounds-variants'],
    DEFAULTS.scoreBoundsVariants,
    ['off', 'on'],
  );
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

  const variantConfigs = scoreBoundsVariants.map((scoreBoundsVariant) => ({
    key: scoreBoundsVariant,
    label: createVariantDisplayLabel(scoreBoundsVariant),
    scoreBoundsEnabled: scoreBoundsVariant === 'on',
  }));

  const scenarios = [];
  const runsByVariant = new Map(variantConfigs.map((variant) => [variant.key, []]));
  const runsByVariantAndEmptyCount = new Map();
  const runsByVariantAndReferenceOutcome = new Map();
  const referenceOutcomes = ['win', 'draw', 'loss'];

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
      const referenceOutcome = Number.isFinite(referenceExactScore)
        ? classifyOutcome(referenceExactScore)
        : null;

      const scenario = {
        emptyCount,
        seed,
        rootPlayer,
        legalMoveCount: legalMoves.length,
        reference: {
          bestMoveCoord: reference?.bestMoveCoord ?? null,
          score: Number.isFinite(reference?.score) ? reference.score : null,
          exactScore: Number.isFinite(referenceExactScore) ? referenceExactScore : null,
          outcome: referenceOutcome,
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
          mctsExactContinuationEnabled: true,
          mctsExactContinuationExtraEmpties,
          mctsProofPriorityEnabled: true,
          mctsProofPriorityScale,
          mctsProofPriorityMaxEmpties,
          mctsProofPriorityContinuationHandoffEnabled,
          mctsProofMetricMode: 'legacy-root',
          mctsScoreBoundsEnabled: variant.scoreBoundsEnabled,
          maxTableEntries,
        }));

        const result = withBenchRandom(seed * 100 + 7, () => engine.findBestMove(state));
        const chosenMove = legalMoves.find((move) => move.coord === result?.bestMoveCoord) ?? null;
        const chosenExactScore = evaluateMoveExactScore(state, chosenMove, rootPlayer, exactReferenceAccessor);
        const summarized = summarizeRun(result, chosenExactScore, referenceExactScore);
        scenario.variants[variant.key] = summarized;
        runsByVariant.get(variant.key).push(summarized);
        runsByVariantAndEmptyCount.get(`${variant.key}:${emptyCount}`).push(summarized);
        if (referenceOutcome !== null) {
          const outcomeKey = `${variant.key}:${referenceOutcome}`;
          if (!runsByVariantAndReferenceOutcome.has(outcomeKey)) {
            runsByVariantAndReferenceOutcome.set(outcomeKey, []);
          }
          runsByVariantAndReferenceOutcome.get(outcomeKey).push(summarized);
        }
      }

      scenarios.push(scenario);
      console.log(
        `[score-bounds] empties=${emptyCount} seed=${seed} ref=${scenario.reference.bestMoveCoord}/${scenario.reference.exactScore}`,
      );
    }
  }

  const aggregates = variantConfigs.map((variant) => aggregateRuns(variant.key, runsByVariant.get(variant.key) ?? []));
  const aggregatesByEmptyCount = emptiesList.map((emptyCount) => ({
    emptyCount,
    variants: variantConfigs.map((variant) => aggregateRuns(variant.key, runsByVariantAndEmptyCount.get(`${variant.key}:${emptyCount}`) ?? [])),
  }));
  const aggregatesByReferenceOutcome = referenceOutcomes.map((outcome) => ({
    outcome,
    variants: variantConfigs.map((variant) => aggregateRuns(variant.key, runsByVariantAndReferenceOutcome.get(`${variant.key}:${outcome}`) ?? [])),
  }));

  const toplineByLabel = Object.fromEntries(aggregates.map((aggregate) => [aggregate.label, aggregate]));
  const bestExactBestHitRate = Math.max(...aggregates.map((aggregate) => aggregate.exactBestHitRate ?? 0));
  const bestProvenRate = Math.max(...aggregates.map((aggregate) => aggregate.provenRate ?? 0));
  const bestExactResultRate = Math.max(...aggregates.map((aggregate) => aggregate.exactResultRate ?? 0));

  const summary = {
    type: 'mcts-score-bounds-benchmark',
    generatedAt: new Date().toISOString(),
    repoRoot: relativePathFromCwd(repoRoot),
    options: {
      algorithm,
      timeMs,
      emptiesList,
      seedList,
      exactEndgameEmpties,
      mctsSolverWldEmpties,
      mctsExactContinuationExtraEmpties,
      mctsProofPriorityScale,
      mctsProofPriorityMaxEmpties,
      mctsProofPriorityContinuationHandoffEnabled,
      scoreBoundsVariants,
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
    aggregatesByReferenceOutcome,
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
      bestExactResultRate,
      bestExactResultLabels: aggregates
        .filter((aggregate) => (aggregate.exactResultRate ?? 0) === bestExactResultRate)
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
