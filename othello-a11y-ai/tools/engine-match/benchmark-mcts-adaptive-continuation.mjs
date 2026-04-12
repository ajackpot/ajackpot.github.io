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
  seedList: [15, 17, 31, 41, 47, 53, 71, 89, 107, 123, 149, 167, 191, 223, 257, 281, 307, 331, 359, 383, 419, 443, 467, 491],
  exactEndgameEmpties: 8,
  mctsSolverWldEmpties: 2,
  mctsExactContinuationExtraEmpties: 3,
  mctsExactContinuationAdaptiveExtraEmpties: 1,
  adaptiveOutcomeModeList: ['loss-only', 'non-win'],
  adaptiveMaxLegalMovesList: [0, 4],
  proofPriorityScale: 0.15,
  proofPriorityMaxEmpties: 12,
  maxDepth: 4,
  maxTableEntries: 90000,
  presetKey: 'custom',
  styleKey: 'balanced',
  referenceExactEmpties: 20,
  referenceTimeMs: 6000,
});

const ADAPTIVE_OUTCOME_MODES = new Set(['loss-only', 'non-win', 'all']);

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/benchmark-mcts-adaptive-continuation.mjs \
    [--repo-root .] \
    [--algorithm mcts-hybrid] \
    [--time-ms 120] \
    [--empties-list 12] \
    [--seed-list 15,17,31,41] \
    [--exact-endgame-empties 8] \
    [--mcts-solver-wld-empties 2] \
    [--mcts-exact-continuation-extra-empties 3] \
    [--adaptive-extra-empties 1] \
    [--adaptive-outcome-mode-list loss-only,non-win] \
    [--adaptive-max-legal-moves-list 0,4] \
    [--proof-priority-scale 0.15] \
    [--proof-priority-max-empties 12] \
    [--output-json benchmarks/stage110_mcts_adaptive_continuation.json]

설명:
- Stage 104 기본 late lane(+3 continuation, continuation 창에서만 proof handoff) 위에,
  12 empties 근방에서만 root WLD proof 이후 exact continuation을 조건부로 한 번 더 시도하는 adaptive 후보들을 비교합니다.
- adaptive 후보는 proof-priority를 root search 동안 유지한 채, post-proof continuation만 조건부로 추가합니다.
`);
}

function toFiniteInteger(value, fallback, minimum = Number.NEGATIVE_INFINITY, maximum = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
}

function toFiniteNumber(value, fallback, minimum = Number.NEGATIVE_INFINITY, maximum = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(minimum, Math.min(maximum, parsed));
}

function parseCsvIntegers(value, fallback) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [...fallback];
  }

  const parsed = value
    .split(',')
    .map((token) => Number(token.trim()))
    .filter((token) => Number.isFinite(token) && token >= 0)
    .map((token) => Math.round(token));

  return parsed.length > 0 ? [...new Set(parsed)] : [...fallback];
}

function parseAdaptiveOutcomeModes(value, fallback) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [...fallback];
  }

  const parsed = value
    .split(',')
    .map((token) => token.trim())
    .filter((token) => ADAPTIVE_OUTCOME_MODES.has(token));

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
    mctsExactContinuationEnabled: overrides.mctsExactContinuationEnabled,
    mctsExactContinuationExtraEmpties: overrides.mctsExactContinuationExtraEmpties,
    mctsExactContinuationAdaptiveEnabled: overrides.mctsExactContinuationAdaptiveEnabled,
    mctsExactContinuationAdaptiveExtraEmpties: overrides.mctsExactContinuationAdaptiveExtraEmpties,
    mctsExactContinuationAdaptiveOutcomeMode: overrides.mctsExactContinuationAdaptiveOutcomeMode,
    mctsExactContinuationAdaptiveMaxLegalMoves: overrides.mctsExactContinuationAdaptiveMaxLegalMoves,
    mctsProofPriorityEnabled: overrides.mctsProofPriorityEnabled,
    mctsProofPriorityScale: overrides.mctsProofPriorityScale,
    mctsProofPriorityMaxEmpties: overrides.mctsProofPriorityMaxEmpties,
    mctsProofPriorityContinuationHandoffEnabled: overrides.mctsProofPriorityContinuationHandoffEnabled,
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
        mctsExactContinuationAdaptiveEnabled: false,
        mctsExactContinuationAdaptiveExtraEmpties: 0,
        mctsExactContinuationAdaptiveOutcomeMode: 'loss-only',
        mctsExactContinuationAdaptiveMaxLegalMoves: 0,
        mctsProofPriorityEnabled: false,
        mctsProofPriorityScale: 0,
        mctsProofPriorityMaxEmpties: 0,
        mctsProofPriorityContinuationHandoffEnabled: true,
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
  const proofTelemetry = result?.mctsProofTelemetry ?? null;
  const rootSolvedOutcome = typeof result?.mctsRootSolvedOutcome === 'string'
    ? result.mctsRootSolvedOutcome
    : (typeof result?.wldOutcome === 'string' ? result.wldOutcome : null);
  const proven = Boolean(result?.isExactResult || result?.isWldResult || rootSolvedOutcome !== null);
  const scoreLoss = Number.isFinite(chosenExactScore) && Number.isFinite(referenceScore)
    ? referenceScore - chosenExactScore
    : null;

  return {
    bestMoveCoord: result?.bestMoveCoord ?? null,
    score: Number.isFinite(result?.score) ? result.score : null,
    searchMode: result?.searchMode ?? null,
    searchCompletion: result?.searchCompletion ?? null,
    elapsedMs: Number.isFinite(result?.stats?.elapsedMs)
      ? result.stats.elapsedMs
      : (Number.isFinite(result?.elapsedMs) ? result.elapsedMs : null),
    isExactResult: Boolean(result?.isExactResult),
    isWldResult: Boolean(result?.isWldResult),
    rootSolvedOutcome,
    rootSolvedExact: Boolean(result?.mctsRootSolvedExact),
    chosenExactScore: Number.isFinite(chosenExactScore) ? chosenExactScore : null,
    chosenExactOutcome: Number.isFinite(chosenExactScore) ? classifyOutcome(chosenExactScore) : null,
    exactBestHit: Number.isFinite(chosenExactScore) && Number.isFinite(referenceScore)
      ? chosenExactScore === referenceScore
      : false,
    wldAgreement: rootSolvedOutcome !== null && Number.isFinite(referenceScore)
      ? rootSolvedOutcome === classifyOutcome(referenceScore)
      : false,
    scoreLoss,
    proven,
    continuationAttempted: Boolean(result?.mctsExactContinuationAttempted),
    continuationCompleted: Boolean(result?.mctsExactContinuationCompleted),
    continuationApplied: Boolean(result?.mctsExactContinuationApplied),
    continuationBestMoveChanged: Boolean(result?.mctsExactContinuationBestMoveChanged),
    adaptiveContinuationEnabled: Boolean(proofTelemetry?.adaptiveContinuationEnabled),
    adaptiveContinuationEligible: Boolean(proofTelemetry?.adaptiveContinuationEligible),
    adaptiveContinuationTriggered: Boolean(result?.mctsExactContinuationAdaptiveTriggered ?? proofTelemetry?.adaptiveContinuationTriggered),
    adaptiveContinuationDepthEligible: Boolean(proofTelemetry?.adaptiveContinuationDepthEligible),
    adaptiveContinuationLegalMoveEligible: Boolean(proofTelemetry?.adaptiveContinuationLegalMoveEligible),
    adaptiveContinuationOutcomeEligible: Boolean(proofTelemetry?.adaptiveContinuationOutcomeEligible),
    proofPriorityEnabled: Boolean(proofTelemetry?.proofPriorityEnabled),
    proofPriorityDepthEligible: Boolean(proofTelemetry?.proofPriorityDepthEligible),
    proofPrioritySuppressedByContinuationWindow: Boolean(proofTelemetry?.proofPrioritySuppressedByContinuationWindow),
    continuationDepthEligible: Boolean(proofTelemetry?.continuationDepthEligible),
    mctsIterations: Number.isFinite(result?.stats?.mctsIterations) ? result.stats.mctsIterations : 0,
    mctsTreeNodes: Number.isFinite(result?.stats?.mctsTreeNodes) ? result.stats.mctsTreeNodes : 0,
    mctsProofPrioritySelectionNodes: Number.isFinite(result?.stats?.mctsProofPrioritySelectionNodes)
      ? result.stats.mctsProofPrioritySelectionNodes
      : 0,
    exactContinuationAdaptiveRuns: Number.isFinite(result?.stats?.mctsExactContinuationAdaptiveRuns)
      ? result.stats.mctsExactContinuationAdaptiveRuns
      : 0,
    exactContinuationAdaptiveCompletions: Number.isFinite(result?.stats?.mctsExactContinuationAdaptiveCompletions)
      ? result.stats.mctsExactContinuationAdaptiveCompletions
      : 0,
    exactContinuationAdaptiveTimeouts: Number.isFinite(result?.stats?.mctsExactContinuationAdaptiveTimeouts)
      ? result.stats.mctsExactContinuationAdaptiveTimeouts
      : 0,
    exactContinuationAdaptiveBestMoveChanges: Number.isFinite(result?.stats?.mctsExactContinuationAdaptiveBestMoveChanges)
      ? result.stats.mctsExactContinuationAdaptiveBestMoveChanges
      : 0,
  };
}

function average(values) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (filtered.length === 0) {
    return null;
  }
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value ?? 0), 0);
}

function aggregateRuns(label, runs) {
  const positions = runs.length;
  const exactBestHits = runs.filter((entry) => entry?.exactBestHit).length;
  const exactResultCount = runs.filter((entry) => entry?.isExactResult).length;
  const wldAgreementCount = runs.filter((entry) => entry?.wldAgreement).length;
  const provenCount = runs.filter((entry) => entry?.proven).length;
  const continuationAppliedCount = runs.filter((entry) => entry?.continuationApplied).length;
  const adaptiveContinuationTriggeredCount = runs.filter((entry) => entry?.adaptiveContinuationTriggered).length;

  return {
    label,
    positions,
    exactBestHits,
    exactBestHitRate: positions > 0 ? exactBestHits / positions : null,
    exactResultCount,
    exactResultRate: positions > 0 ? exactResultCount / positions : null,
    wldAgreementCount,
    wldAgreementRate: positions > 0 ? wldAgreementCount / positions : null,
    provenCount,
    provenRate: positions > 0 ? provenCount / positions : null,
    continuationAppliedCount,
    continuationAppliedRate: positions > 0 ? continuationAppliedCount / positions : null,
    adaptiveContinuationTriggeredCount,
    adaptiveContinuationTriggeredRate: positions > 0 ? adaptiveContinuationTriggeredCount / positions : null,
    averageScoreLoss: average(runs.map((entry) => entry?.scoreLoss)),
    averageElapsedMs: average(runs.map((entry) => entry?.elapsedMs)),
    averageAdaptiveContinuationRuns: average(runs.map((entry) => entry?.exactContinuationAdaptiveRuns)),
    averageAdaptiveContinuationCompletions: average(runs.map((entry) => entry?.exactContinuationAdaptiveCompletions)),
    averageAdaptiveContinuationTimeouts: average(runs.map((entry) => entry?.exactContinuationAdaptiveTimeouts)),
    averageAdaptiveContinuationBestMoveChanges: average(runs.map((entry) => entry?.exactContinuationAdaptiveBestMoveChanges)),
    averageProofPrioritySelectionNodes: average(runs.map((entry) => entry?.mctsProofPrioritySelectionNodes)),
  };
}

function buildAggregateEntry(empties, entries, candidateVariants) {
  const baselineRuns = entries.map((entry) => entry.baseline);
  const baseline = aggregateRuns('stage104-default', baselineRuns);
  const candidates = candidateVariants.map((variant) => {
    const runs = entries.map((entry) => entry.candidates.find((candidate) => candidate.label === variant.label));
    const aggregate = aggregateRuns(variant.label, runs);
    return {
      ...aggregate,
      outcomeMode: variant.outcomeMode,
      adaptiveMaxLegalMoves: variant.maxLegalMoves,
      deltas: {
        exactBestHitRate: (aggregate.exactBestHitRate ?? 0) - (baseline.exactBestHitRate ?? 0),
        exactResultRate: (aggregate.exactResultRate ?? 0) - (baseline.exactResultRate ?? 0),
        wldAgreementRate: (aggregate.wldAgreementRate ?? 0) - (baseline.wldAgreementRate ?? 0),
        provenRate: (aggregate.provenRate ?? 0) - (baseline.provenRate ?? 0),
        averageScoreLoss: (aggregate.averageScoreLoss ?? 0) - (baseline.averageScoreLoss ?? 0),
        averageElapsedMs: (aggregate.averageElapsedMs ?? 0) - (baseline.averageElapsedMs ?? 0),
      },
    };
  });

  return {
    empties,
    positions: entries.length,
    baseline,
    candidates,
  };
}

function buildToplineSummary(scenarios, candidateVariants) {
  const baselineRuns = scenarios.map((entry) => entry.baseline);
  const baseline = aggregateRuns('stage104-default', baselineRuns);
  const candidates = candidateVariants.map((variant) => {
    const runs = scenarios
      .map((scenario) => scenario.candidates.find((candidate) => candidate.label === variant.label))
      .filter(Boolean);
    const aggregate = aggregateRuns(variant.label, runs);
    return {
      ...aggregate,
      outcomeMode: variant.outcomeMode,
      adaptiveMaxLegalMoves: variant.maxLegalMoves,
      deltas: {
        exactBestHitRate: (aggregate.exactBestHitRate ?? 0) - (baseline.exactBestHitRate ?? 0),
        exactResultRate: (aggregate.exactResultRate ?? 0) - (baseline.exactResultRate ?? 0),
        wldAgreementRate: (aggregate.wldAgreementRate ?? 0) - (baseline.wldAgreementRate ?? 0),
        provenRate: (aggregate.provenRate ?? 0) - (baseline.provenRate ?? 0),
        averageScoreLoss: (aggregate.averageScoreLoss ?? 0) - (baseline.averageScoreLoss ?? 0),
        averageElapsedMs: (aggregate.averageElapsedMs ?? 0) - (baseline.averageElapsedMs ?? 0),
      },
    };
  });

  return {
    positions: scenarios.length,
    baseline,
    candidates,
  };
}

function buildCandidateVariants(options) {
  const variants = [];
  const seenLabels = new Set();

  for (const outcomeMode of options.adaptiveOutcomeModeList) {
    for (const maxLegalMoves of options.adaptiveMaxLegalMovesList) {
      const label = maxLegalMoves > 0
        ? `adaptive-${outcomeMode}-lm${maxLegalMoves}`
        : `adaptive-${outcomeMode}`;
      if (seenLabels.has(label)) {
        continue;
      }
      seenLabels.add(label);
      variants.push({
        label,
        outcomeMode,
        maxLegalMoves,
        overrides: {
          mctsExactContinuationAdaptiveEnabled: true,
          mctsExactContinuationAdaptiveExtraEmpties: options.mctsExactContinuationAdaptiveExtraEmpties,
          mctsExactContinuationAdaptiveOutcomeMode: outcomeMode,
          mctsExactContinuationAdaptiveMaxLegalMoves: maxLegalMoves,
        },
      });
    }
  }

  return variants;
}

async function benchmarkAdaptiveContinuation(options) {
  const { SearchEngine, GameState } = await loadRepoModules(options.repoRoot);
  const candidateVariants = buildCandidateVariants(options);
  const exactReferenceAccessor = createExactReferenceAccessor(SearchEngine, options);
  const scenarios = [];

  for (const empties of options.emptiesList) {
    for (const seed of options.seedList) {
      const generated = withBenchRandom(seed, () => createLatePosition(GameState, empties, seed));
      const state = normalizeAfterPasses(generated);
      const legalMoves = sortLegalMoves(state);
      const rootPlayer = state.currentPlayer;
      const reference = exactReferenceAccessor.getResult(state);
      const referenceBestMove = legalMoves.find((move) => move.coord === reference.bestMoveCoord) ?? legalMoves[0] ?? null;
      const referenceScore = evaluateMoveExactScore(state, referenceBestMove, rootPlayer, exactReferenceAccessor);

      const baselineEngine = new SearchEngine(createSearchOptions({
        presetKey: options.presetKey,
        styleKey: options.styleKey,
        searchAlgorithm: options.algorithm,
        timeLimitMs: options.timeMs,
        maxDepth: options.maxDepth,
        exactEndgameEmpties: options.exactEndgameEmpties,
        wldPreExactEmpties: 0,
        mctsSolverEnabled: true,
        mctsSolverWldEmpties: options.mctsSolverWldEmpties,
        mctsExactContinuationEnabled: true,
        mctsExactContinuationExtraEmpties: options.mctsExactContinuationExtraEmpties,
        mctsExactContinuationAdaptiveEnabled: false,
        mctsExactContinuationAdaptiveExtraEmpties: 0,
        mctsExactContinuationAdaptiveOutcomeMode: 'loss-only',
        mctsExactContinuationAdaptiveMaxLegalMoves: 0,
        mctsProofPriorityEnabled: true,
        mctsProofPriorityScale: options.proofPriorityScale,
        mctsProofPriorityMaxEmpties: options.proofPriorityMaxEmpties,
        mctsProofPriorityContinuationHandoffEnabled: true,
        maxTableEntries: options.maxTableEntries,
      }));
      const baselineResult = withBenchRandom(seed, () => baselineEngine.findBestMove(state));
      const baselineMove = legalMoves.find((move) => move.coord === baselineResult.bestMoveCoord) ?? null;
      const baselineExactScore = evaluateMoveExactScore(state, baselineMove, rootPlayer, exactReferenceAccessor);
      const baseline = summarizeRun(baselineResult, baselineExactScore, referenceScore);

      const candidates = [];
      for (const variant of candidateVariants) {
        const engine = new SearchEngine(createSearchOptions({
          presetKey: options.presetKey,
          styleKey: options.styleKey,
          searchAlgorithm: options.algorithm,
          timeLimitMs: options.timeMs,
          maxDepth: options.maxDepth,
          exactEndgameEmpties: options.exactEndgameEmpties,
          wldPreExactEmpties: 0,
          mctsSolverEnabled: true,
          mctsSolverWldEmpties: options.mctsSolverWldEmpties,
          mctsExactContinuationEnabled: true,
          mctsExactContinuationExtraEmpties: options.mctsExactContinuationExtraEmpties,
          mctsProofPriorityEnabled: true,
          mctsProofPriorityScale: options.proofPriorityScale,
          mctsProofPriorityMaxEmpties: options.proofPriorityMaxEmpties,
          mctsProofPriorityContinuationHandoffEnabled: true,
          maxTableEntries: options.maxTableEntries,
          ...variant.overrides,
        }));
        const result = withBenchRandom(seed, () => engine.findBestMove(state));
        const move = legalMoves.find((entry) => entry.coord === result.bestMoveCoord) ?? null;
        const exactScore = evaluateMoveExactScore(state, move, rootPlayer, exactReferenceAccessor);
        candidates.push({
          label: variant.label,
          outcomeMode: variant.outcomeMode,
          adaptiveMaxLegalMoves: variant.maxLegalMoves,
          ...summarizeRun(result, exactScore, referenceScore),
        });
      }

      scenarios.push({
        empties,
        seed,
        currentPlayer: state.currentPlayer,
        legalMoveCount: legalMoves.length,
        reference: {
          bestMoveCoord: reference.bestMoveCoord,
          score: referenceScore,
          outcome: classifyOutcome(referenceScore),
          searchCompletion: reference.searchCompletion ?? null,
          elapsedMs: Number.isFinite(reference?.stats?.elapsedMs)
            ? reference.stats.elapsedMs
            : (Number.isFinite(reference?.elapsedMs) ? reference.elapsedMs : null),
        },
        baseline,
        candidates,
      });
    }
  }

  const aggregates = options.emptiesList.map((empties) => buildAggregateEntry(
    empties,
    scenarios.filter((entry) => entry.empties === empties),
    candidateVariants,
  ));

  return {
    type: 'mcts-adaptive-continuation-benchmark',
    generatedAt: new Date().toISOString(),
    repoRoot: options.repoRoot,
    options: {
      algorithm: options.algorithm,
      timeMs: options.timeMs,
      emptiesList: options.emptiesList,
      seedList: options.seedList,
      exactEndgameEmpties: options.exactEndgameEmpties,
      mctsSolverWldEmpties: options.mctsSolverWldEmpties,
      mctsExactContinuationExtraEmpties: options.mctsExactContinuationExtraEmpties,
      mctsExactContinuationAdaptiveExtraEmpties: options.mctsExactContinuationAdaptiveExtraEmpties,
      adaptiveOutcomeModeList: options.adaptiveOutcomeModeList,
      adaptiveMaxLegalMovesList: options.adaptiveMaxLegalMovesList,
      proofPriorityScale: options.proofPriorityScale,
      proofPriorityMaxEmpties: options.proofPriorityMaxEmpties,
      maxDepth: options.maxDepth,
      maxTableEntries: options.maxTableEntries,
      presetKey: options.presetKey,
      styleKey: options.styleKey,
      referenceExactEmpties: options.referenceExactEmpties,
      referenceTimeMs: options.referenceTimeMs,
    },
    candidateVariants: candidateVariants.map((variant) => ({
      label: variant.label,
      outcomeMode: variant.outcomeMode,
      adaptiveMaxLegalMoves: variant.maxLegalMoves,
      adaptiveExtraEmpties: options.mctsExactContinuationAdaptiveExtraEmpties,
    })),
    scenarios,
    aggregates,
    topline: buildToplineSummary(scenarios, candidateVariants),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printUsage();
    return;
  }

  const options = {
    repoRoot: typeof args['repo-root'] === 'string' ? resolveCliPath(args['repo-root']) : DEFAULTS.repoRoot,
    outputJson: typeof args['output-json'] === 'string' ? resolveCliPath(args['output-json']) : DEFAULTS.outputJson,
    algorithm: typeof args.algorithm === 'string' && args.algorithm.trim() !== '' ? args.algorithm.trim() : DEFAULTS.algorithm,
    timeMs: toFiniteInteger(args['time-ms'], DEFAULTS.timeMs, 1),
    emptiesList: parseCsvIntegers(args['empties-list'], DEFAULTS.emptiesList),
    seedList: parseCsvIntegers(args['seed-list'], DEFAULTS.seedList),
    exactEndgameEmpties: toFiniteInteger(args['exact-endgame-empties'], DEFAULTS.exactEndgameEmpties, 0),
    mctsSolverWldEmpties: toFiniteInteger(args['mcts-solver-wld-empties'], DEFAULTS.mctsSolverWldEmpties, 0),
    mctsExactContinuationExtraEmpties: toFiniteInteger(
      args['mcts-exact-continuation-extra-empties'],
      DEFAULTS.mctsExactContinuationExtraEmpties,
      0,
    ),
    mctsExactContinuationAdaptiveExtraEmpties: toFiniteInteger(
      args['adaptive-extra-empties'],
      DEFAULTS.mctsExactContinuationAdaptiveExtraEmpties,
      0,
      2,
    ),
    adaptiveOutcomeModeList: parseAdaptiveOutcomeModes(args['adaptive-outcome-mode-list'], DEFAULTS.adaptiveOutcomeModeList),
    adaptiveMaxLegalMovesList: parseCsvIntegers(args['adaptive-max-legal-moves-list'], DEFAULTS.adaptiveMaxLegalMovesList),
    proofPriorityScale: toFiniteNumber(args['proof-priority-scale'], DEFAULTS.proofPriorityScale, 0, 5),
    proofPriorityMaxEmpties: toFiniteInteger(args['proof-priority-max-empties'], DEFAULTS.proofPriorityMaxEmpties, 0, 16),
    maxDepth: toFiniteInteger(args['max-depth'], DEFAULTS.maxDepth, 1),
    maxTableEntries: toFiniteInteger(args['max-table-entries'], DEFAULTS.maxTableEntries, 1000),
    presetKey: typeof args['preset-key'] === 'string' ? args['preset-key'] : DEFAULTS.presetKey,
    styleKey: typeof args['style-key'] === 'string' ? args['style-key'] : DEFAULTS.styleKey,
    referenceExactEmpties: toFiniteInteger(args['reference-exact-empties'], DEFAULTS.referenceExactEmpties, 1),
    referenceTimeMs: toFiniteInteger(args['reference-time-ms'], DEFAULTS.referenceTimeMs, 1000),
  };

  const summary = await benchmarkAdaptiveContinuation(options);
  if (options.outputJson) {
    fs.mkdirSync(path.dirname(options.outputJson), { recursive: true });
    fs.writeFileSync(options.outputJson, `${JSON.stringify(summary, null, 2)}\n`);
    console.log(`Wrote summary to ${relativePathFromCwd(options.outputJson) ?? options.outputJson}`);
  } else {
    console.log(JSON.stringify(summary, null, 2));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
