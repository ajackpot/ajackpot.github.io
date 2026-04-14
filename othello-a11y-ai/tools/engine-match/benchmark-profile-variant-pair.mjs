#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { describeSearchAlgorithm, normalizeSearchAlgorithm } from '../../js/ai/search-algorithms.js';
import { SearchEngine } from '../../js/ai/search-engine.js';
import { GameState, serializeMoveHistoryCompact } from '../../js/core/game-state.js';
import { PLAYER_COLORS } from '../../js/core/rules.js';
import { parseArgs, relativePathFromCwd, resolveCliPath } from '../evaluator-training/lib.mjs';
import {
  ACTIVE_GENERATED_MODULE_PATH,
  buildEngineProfileOverrides,
  describeVariantForSummary,
  loadProfileVariant,
} from './lib-profile-variants.mjs';

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US');

const DEFAULTS = Object.freeze({
  searchAlgorithm: 'classic',
  games: 2,
  openingPlies: 20,
  seed: 17,
  seedList: [17],
  timeMsList: [280],
  maxDepth: 4,
  exactEndgameEmpties: 8,
  solverAdjudicationEmpties: 14,
  solverAdjudicationTimeMs: 8000,
  maxTableEntries: 90000,
  aspirationWindow: 50,
  presetKey: 'custom',
  styleKey: 'balanced',
  progressEveryPairs: 4,
});

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/benchmark-profile-variant-pair.mjs \
    [--output-json benchmarks/stage135_active_vs_balanced12_classic.json] \
    [--search-algorithm classic] \
    [--first-label active] [--first-generated-module js/ai/learned-eval-profile.generated.js] \
    [--second-label balanced12] [--second-generated-module tools/engine-match/fixtures/stage135-evaluation-profile-finalists/balanced12-alllate-smoothed-stability-090/learned-eval-profile.generated.js] \
    [--games 2] [--opening-plies 20] [--seed-list 17,31] \
    [--time-ms-list 280,500] [--max-depth 4] [--exact-endgame-empties 8] \
    [--solver-adjudication-empties 14] [--solver-adjudication-time-ms 8000] \
    [--aspiration-window 50] [--max-table-entries 90000] \
    [--preset-key custom] [--style-key balanced] [--progress-every-pairs 4]

설명:
- 같은 search algorithm 아래에서 두 evaluation profile variant를 같은 opening pair로 흑/백 교차 대국시켜 실제 self-play 점수율을 비교합니다.
- solver-adjudication-empties 이하에서는 neutral exact solver로 승패를 판정해 전체 시간을 줄입니다.
- profile variant 비교에 집중하기 위해 기본값은 deterministic custom preset입니다.
`);
}

function toFiniteInteger(value, fallback, minimum = Number.NEGATIVE_INFINITY, maximum = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
}

function parseTimeMsList(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [...DEFAULTS.timeMsList];
  }

  const parsed = value
    .split(',')
    .map((token) => Number(token.trim()))
    .filter((token) => Number.isFinite(token) && token > 0)
    .map((token) => Math.round(token));

  return parsed.length > 0 ? [...new Set(parsed)] : [...DEFAULTS.timeMsList];
}

function parseSeedList(value, fallbackSeed = DEFAULTS.seed) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [fallbackSeed];
  }

  const parsed = value
    .split(',')
    .map((token) => Number(token.trim()))
    .filter((token) => Number.isFinite(token) && token > 0)
    .map((token) => Math.round(token));

  return parsed.length > 0 ? [...new Set(parsed)] : [fallbackSeed];
}

function algorithmHash(value) {
  let hash = 2166136261 >>> 0;
  const text = String(value ?? '');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

function mixSeed(seed, ...parts) {
  let mixed = (seed >>> 0) || 0x9e3779b9;
  for (const part of parts) {
    const numeric = typeof part === 'string'
      ? algorithmHash(part)
      : ((Number(part) >>> 0) || 0);
    mixed ^= (numeric + 0x9e3779b9 + ((mixed << 6) >>> 0) + (mixed >>> 2)) >>> 0;
    mixed >>>= 0;
  }
  return mixed >>> 0;
}

function createSeededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function withSeededRandom(seed, callback) {
  const originalRandom = Math.random;
  Math.random = createSeededRandom(seed);
  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
}

function sortLegalMoves(state) {
  return state.getLegalMoves().sort((left, right) => left.coord.localeCompare(right.coord));
}

function createOpeningState(openingPlies, seed) {
  const random = createSeededRandom(seed);
  let state = GameState.initial();
  const openingMoves = [];
  let guard = 0;

  while (!state.isTerminal() && openingMoves.length < openingPlies) {
    const legalMoves = sortLegalMoves(state);
    if (legalMoves.length === 0) {
      openingMoves.push(`${state.currentPlayer}:pass`);
      state = state.passTurn();
      guard += 1;
      if (guard > 120) {
        throw new Error('Opening generator exceeded guard while handling passes.');
      }
      continue;
    }

    const chosen = legalMoves[Math.floor(random() * legalMoves.length)] ?? legalMoves[0];
    openingMoves.push(`${state.currentPlayer}:${chosen.coord}`);
    state = state.applyMove(chosen.index).state;
    guard += 1;
    if (guard > 120) {
      throw new Error('Opening generator exceeded guard.');
    }
  }

  return {
    state,
    openingMoves,
    openingPlyCompleted: openingMoves.length,
    openingSeed: seed >>> 0,
    openingHash: state.hashKey().toString(),
    openingCompactSequence: serializeMoveHistoryCompact(state.moveHistory),
  };
}

function createEngine({
  searchAlgorithm,
  timeLimitMs,
  maxDepth,
  exactEndgameEmpties,
  aspirationWindow,
  maxTableEntries,
  presetKey,
  styleKey,
  profileVariant,
}) {
  return new SearchEngine({
    presetKey,
    styleKey,
    searchAlgorithm,
    maxDepth,
    timeLimitMs,
    exactEndgameEmpties,
    wldPreExactEmpties: 0,
    aspirationWindow,
    openingRandomness: 0,
    searchRandomness: 0,
    randomness: 0,
    maxTableEntries,
    ...buildEngineProfileOverrides(profileVariant),
  });
}

function createExactAdjudicator({ timeLimitMs, maxTableEntries, styleKey }) {
  return new SearchEngine({
    presetKey: 'custom',
    styleKey,
    searchAlgorithm: 'classic',
    maxDepth: 64,
    timeLimitMs,
    exactEndgameEmpties: 64,
    wldPreExactEmpties: 0,
    aspirationWindow: 0,
    openingRandomness: 0,
    searchRandomness: 0,
    randomness: 0,
    maxTableEntries,
  });
}

function adjudicateExact(state, engine) {
  const result = engine.findBestMove(state);
  if (!result) {
    return null;
  }
  const score = Number(result.score);
  if (!Number.isFinite(score)) {
    return null;
  }
  const scoreFromCurrentPlayerPerspective = Math.max(-64, Math.min(64, Math.round(score)));
  const blackDiff = state.currentPlayer === PLAYER_COLORS.BLACK
    ? scoreFromCurrentPlayerPerspective
    : -scoreFromCurrentPlayerPerspective;
  return {
    blackDiff,
    scoreFromCurrentPlayerPerspective,
    stats: result.stats ?? null,
  };
}

function createPerColorStats() {
  return {
    turns: 0,
    passes: 0,
    completedSearches: 0,
    heuristicFallbackSearches: 0,
    totalElapsedMs: 0,
    totalNodes: 0,
    totalCutoffs: 0,
    totalTtHits: 0,
    totalMtdfPasses: 0,
    totalMtdfFailHighs: 0,
    totalMtdfFailLows: 0,
    totalMtdfVerificationPasses: 0,
    totalMctsIterations: 0,
    totalMctsRollouts: 0,
    totalMctsRolloutPlies: 0,
    totalMctsTreeNodes: 0,
    totalMctsCutoffEvaluations: 0,
    totalGuidedPolicySelections: 0,
    totalGuidedPriorUses: 0,
    totalHybridPriorSearches: 0,
    totalHybridPriorCacheHits: 0,
    totalHybridPriorNodes: 0,
    totalHybridPriorUses: 0,
    searchModes: {},
  };
}

function mergeSearchResultIntoPerColorStats(target, result) {
  if (!target || !result) {
    return;
  }

  target.turns += 1;
  target.totalElapsedMs += Number(result.stats?.elapsedMs ?? 0);
  target.totalNodes += Number(result.stats?.nodes ?? 0);
  target.totalCutoffs += Number(result.stats?.cutoffs ?? 0);
  target.totalTtHits += Number(result.stats?.ttHits ?? 0);
  target.totalMtdfPasses += Number(result.stats?.mtdfPasses ?? 0);
  target.totalMtdfFailHighs += Number(result.stats?.mtdfFailHighs ?? 0);
  target.totalMtdfFailLows += Number(result.stats?.mtdfFailLows ?? 0);
  target.totalMtdfVerificationPasses += Number(result.stats?.mtdfVerificationPasses ?? 0);
  target.totalMctsIterations += Number(result.stats?.mctsIterations ?? 0);
  target.totalMctsRollouts += Number(result.stats?.mctsRollouts ?? 0);
  target.totalMctsRolloutPlies += Number(result.stats?.mctsRolloutPlies ?? 0);
  target.totalMctsTreeNodes += Number(result.stats?.mctsTreeNodes ?? 0);
  target.totalMctsCutoffEvaluations += Number(result.stats?.mctsCutoffEvaluations ?? 0);
  target.totalGuidedPolicySelections += Number(result.stats?.guidedPolicySelections ?? 0);
  target.totalGuidedPriorUses += Number(result.stats?.guidedPriorUses ?? 0);
  target.totalHybridPriorSearches += Number(result.stats?.hybridPriorSearches ?? 0);
  target.totalHybridPriorCacheHits += Number(result.stats?.hybridPriorCacheHits ?? 0);
  target.totalHybridPriorNodes += Number(result.stats?.hybridPriorNodes ?? 0);
  target.totalHybridPriorUses += Number(result.stats?.hybridPriorUses ?? 0);

  const completion = result.searchCompletion ?? null;
  if (completion === 'complete') {
    target.completedSearches += 1;
  }
  if (result.searchMode === 'heuristic-fallback') {
    target.heuristicFallbackSearches += 1;
  }

  const modeKey = result.searchMode ?? 'unknown';
  target.searchModes[modeKey] = (target.searchModes[modeKey] ?? 0) + 1;
}

function finalizePerColorStats(stats) {
  const turns = Math.max(1, Number(stats.turns ?? 0));
  const totalElapsedMs = Number(stats.totalElapsedMs ?? 0);
  return {
    turns: Number(stats.turns ?? 0),
    passes: Number(stats.passes ?? 0),
    completedSearches: Number(stats.completedSearches ?? 0),
    heuristicFallbackSearches: Number(stats.heuristicFallbackSearches ?? 0),
    completionRate: Number(stats.turns ?? 0) > 0 ? Number(stats.completedSearches ?? 0) / Number(stats.turns ?? 0) : 0,
    fallbackRate: Number(stats.turns ?? 0) > 0 ? Number(stats.heuristicFallbackSearches ?? 0) / Number(stats.turns ?? 0) : 0,
    totalElapsedMs,
    averageElapsedMs: totalElapsedMs / turns,
    totalNodes: Number(stats.totalNodes ?? 0),
    averageNodes: Number(stats.totalNodes ?? 0) / turns,
    totalCutoffs: Number(stats.totalCutoffs ?? 0),
    averageCutoffs: Number(stats.totalCutoffs ?? 0) / turns,
    totalTtHits: Number(stats.totalTtHits ?? 0),
    averageTtHits: Number(stats.totalTtHits ?? 0) / turns,
    totalMtdfPasses: Number(stats.totalMtdfPasses ?? 0),
    averageMtdfPasses: Number(stats.totalMtdfPasses ?? 0) / turns,
    totalMtdfFailHighs: Number(stats.totalMtdfFailHighs ?? 0),
    averageMtdfFailHighs: Number(stats.totalMtdfFailHighs ?? 0) / turns,
    totalMtdfFailLows: Number(stats.totalMtdfFailLows ?? 0),
    averageMtdfFailLows: Number(stats.totalMtdfFailLows ?? 0) / turns,
    totalMtdfVerificationPasses: Number(stats.totalMtdfVerificationPasses ?? 0),
    averageMtdfVerificationPasses: Number(stats.totalMtdfVerificationPasses ?? 0) / turns,
    totalMctsIterations: Number(stats.totalMctsIterations ?? 0),
    averageMctsIterations: Number(stats.totalMctsIterations ?? 0) / turns,
    totalMctsRollouts: Number(stats.totalMctsRollouts ?? 0),
    averageMctsRollouts: Number(stats.totalMctsRollouts ?? 0) / turns,
    totalMctsRolloutPlies: Number(stats.totalMctsRolloutPlies ?? 0),
    averageMctsRolloutPlies: Number(stats.totalMctsRolloutPlies ?? 0) / turns,
    totalMctsTreeNodes: Number(stats.totalMctsTreeNodes ?? 0),
    averageMctsTreeNodes: Number(stats.totalMctsTreeNodes ?? 0) / turns,
    totalMctsCutoffEvaluations: Number(stats.totalMctsCutoffEvaluations ?? 0),
    averageMctsCutoffEvaluations: Number(stats.totalMctsCutoffEvaluations ?? 0) / turns,
    totalGuidedPolicySelections: Number(stats.totalGuidedPolicySelections ?? 0),
    averageGuidedPolicySelections: Number(stats.totalGuidedPolicySelections ?? 0) / turns,
    totalGuidedPriorUses: Number(stats.totalGuidedPriorUses ?? 0),
    averageGuidedPriorUses: Number(stats.totalGuidedPriorUses ?? 0) / turns,
    totalHybridPriorSearches: Number(stats.totalHybridPriorSearches ?? 0),
    averageHybridPriorSearches: Number(stats.totalHybridPriorSearches ?? 0) / turns,
    totalHybridPriorCacheHits: Number(stats.totalHybridPriorCacheHits ?? 0),
    averageHybridPriorCacheHits: Number(stats.totalHybridPriorCacheHits ?? 0) / turns,
    totalHybridPriorNodes: Number(stats.totalHybridPriorNodes ?? 0),
    averageHybridPriorNodes: Number(stats.totalHybridPriorNodes ?? 0) / turns,
    totalHybridPriorUses: Number(stats.totalHybridPriorUses ?? 0),
    averageHybridPriorUses: Number(stats.totalHybridPriorUses ?? 0) / turns,
    nodesPerMs: totalElapsedMs > 0 ? Number(stats.totalNodes ?? 0) / totalElapsedMs : 0,
    searchModes: Object.entries(stats.searchModes ?? {})
      .sort((left, right) => right[1] - left[1])
      .map(([key, count]) => ({ key, count })),
  };
}

function winnerColorFromBlackDiff(blackDiff) {
  if (blackDiff > 0) {
    return PLAYER_COLORS.BLACK;
  }
  if (blackDiff < 0) {
    return PLAYER_COLORS.WHITE;
  }
  return null;
}

function playSingleGame({
  startingState,
  openingMeta,
  firstVariant,
  secondVariant,
  firstVariantLabel,
  secondVariantLabel,
  searchAlgorithm,
  timeLimitMs,
  maxDepth,
  exactEndgameEmpties,
  aspirationWindow,
  solverAdjudicationEmpties,
  solverAdjudicationTimeMs,
  maxTableEntries,
  presetKey,
  styleKey,
  gameSeed,
  firstAsBlack,
}) {
  let state = startingState.clone();
  const initialPly = state.ply;
  const blackVariant = firstAsBlack ? firstVariant : secondVariant;
  const whiteVariant = firstAsBlack ? secondVariant : firstVariant;
  const blackVariantLabel = firstAsBlack ? firstVariantLabel : secondVariantLabel;
  const whiteVariantLabel = firstAsBlack ? secondVariantLabel : firstVariantLabel;

  const engines = {
    black: createEngine({
      searchAlgorithm,
      timeLimitMs,
      maxDepth,
      exactEndgameEmpties,
      aspirationWindow,
      maxTableEntries,
      presetKey,
      styleKey,
      profileVariant: blackVariant,
    }),
    white: createEngine({
      searchAlgorithm,
      timeLimitMs,
      maxDepth,
      exactEndgameEmpties,
      aspirationWindow,
      maxTableEntries,
      presetKey,
      styleKey,
      profileVariant: whiteVariant,
    }),
  };
  const adjudicator = solverAdjudicationEmpties >= 0
    ? createExactAdjudicator({
      timeLimitMs: solverAdjudicationTimeMs,
      maxTableEntries,
      styleKey,
    })
    : null;

  const statsByColor = {
    black: createPerColorStats(),
    white: createPerColorStats(),
  };

  let adjudication = null;
  let guard = 0;

  while (!state.isTerminal()) {
    if (adjudicator && state.getEmptyCount() <= solverAdjudicationEmpties) {
      adjudication = adjudicateExact(state, adjudicator);
      if (adjudication) {
        break;
      }
    }

    const legalMoves = sortLegalMoves(state);
    if (legalMoves.length === 0) {
      const colorKey = state.currentPlayer === PLAYER_COLORS.BLACK ? 'black' : 'white';
      statsByColor[colorKey].passes += 1;
      state = state.passTurn();
      guard += 1;
      if (guard > 200) {
        throw new Error('Self-play guard exceeded while handling passes.');
      }
      continue;
    }

    const color = state.currentPlayer;
    const colorKey = color === PLAYER_COLORS.BLACK ? 'black' : 'white';
    const engine = engines[colorKey];
    const variantLabel = color === PLAYER_COLORS.BLACK ? blackVariantLabel : whiteVariantLabel;
    const searchSeed = mixSeed(gameSeed, state.ply, state.getEmptyCount(), color, variantLabel, searchAlgorithm);
    const result = withSeededRandom(searchSeed, () => engine.findBestMove(state));
    mergeSearchResultIntoPerColorStats(statsByColor[colorKey], result);

    let moveIndex = Number.isInteger(result?.bestMoveIndex) ? result.bestMoveIndex : null;
    let applied = moveIndex === null ? null : state.applyMove(moveIndex);
    if (!applied) {
      moveIndex = legalMoves[0]?.index ?? null;
      applied = moveIndex === null ? null : state.applyMove(moveIndex);
    }
    if (!applied) {
      throw new Error(`Unable to apply a legal move for ${variantLabel} at ply ${state.ply}.`);
    }

    state = applied.state;
    guard += 1;
    if (guard > 200) {
      throw new Error('Self-play guard exceeded.');
    }
  }

  const terminalCounts = adjudication ? null : state.getDiscCounts();
  const blackDiff = adjudication
    ? adjudication.blackDiff
    : (terminalCounts.black - terminalCounts.white);
  const winnerColor = winnerColorFromBlackDiff(blackDiff);
  const winnerVariantLabel = winnerColor === PLAYER_COLORS.BLACK
    ? blackVariantLabel
    : winnerColor === PLAYER_COLORS.WHITE
      ? whiteVariantLabel
      : null;

  return {
    openingSeed: openingMeta.openingSeed,
    openingHash: openingMeta.openingHash,
    openingMoves: [...openingMeta.openingMoves],
    openingCompactSequence: openingMeta.openingCompactSequence,
    openingPlyCompleted: openingMeta.openingPlyCompleted,
    gameSeed,
    timeLimitMs,
    searchAlgorithm,
    blackVariantLabel,
    whiteVariantLabel,
    totalPly: state.ply,
    playedPlyAfterOpening: Math.max(0, state.ply - initialPly),
    blackDiff,
    winnerColor,
    winnerVariantLabel,
    isDraw: blackDiff === 0,
    adjudicated: Boolean(adjudication),
    adjudicationEmptyCount: adjudication ? state.getEmptyCount() : null,
    adjudicationScoreFromCurrentPlayerPerspective: adjudication?.scoreFromCurrentPlayerPerspective ?? null,
    finalCounts: terminalCounts,
    finalCompactSequence: serializeMoveHistoryCompact(state.moveHistory),
    statsByColor: {
      black: finalizePerColorStats(statsByColor.black),
      white: finalizePerColorStats(statsByColor.white),
    },
  };
}

function createVariantAggregate() {
  return {
    games: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    points: 0,
    discDiff: 0,
    blackGames: 0,
    whiteGames: 0,
    pointsAsBlack: 0,
    pointsAsWhite: 0,
    totalTurns: 0,
    totalElapsedMs: 0,
    totalNodes: 0,
    totalCutoffs: 0,
    totalTtHits: 0,
    totalMtdfPasses: 0,
    totalMtdfFailHighs: 0,
    totalMtdfFailLows: 0,
    totalMtdfVerificationPasses: 0,
    totalMctsIterations: 0,
    totalMctsRollouts: 0,
    totalMctsRolloutPlies: 0,
    totalMctsTreeNodes: 0,
    totalMctsCutoffEvaluations: 0,
    totalGuidedPolicySelections: 0,
    totalGuidedPriorUses: 0,
    totalHybridPriorSearches: 0,
    totalHybridPriorCacheHits: 0,
    totalHybridPriorNodes: 0,
    totalHybridPriorUses: 0,
    completedSearches: 0,
    heuristicFallbackSearches: 0,
    searchModes: {},
  };
}

function absorbGameStatsIntoAggregate(aggregate, stats) {
  aggregate.totalTurns += Number(stats.turns ?? 0);
  aggregate.totalElapsedMs += Number(stats.totalElapsedMs ?? 0);
  aggregate.totalNodes += Number(stats.totalNodes ?? 0);
  aggregate.totalCutoffs += Number(stats.totalCutoffs ?? 0);
  aggregate.totalTtHits += Number(stats.totalTtHits ?? 0);
  aggregate.totalMtdfPasses += Number(stats.totalMtdfPasses ?? 0);
  aggregate.totalMtdfFailHighs += Number(stats.totalMtdfFailHighs ?? 0);
  aggregate.totalMtdfFailLows += Number(stats.totalMtdfFailLows ?? 0);
  aggregate.totalMtdfVerificationPasses += Number(stats.totalMtdfVerificationPasses ?? 0);
  aggregate.totalMctsIterations += Number(stats.totalMctsIterations ?? 0);
  aggregate.totalMctsRollouts += Number(stats.totalMctsRollouts ?? 0);
  aggregate.totalMctsRolloutPlies += Number(stats.totalMctsRolloutPlies ?? 0);
  aggregate.totalMctsTreeNodes += Number(stats.totalMctsTreeNodes ?? 0);
  aggregate.totalMctsCutoffEvaluations += Number(stats.totalMctsCutoffEvaluations ?? 0);
  aggregate.totalGuidedPolicySelections += Number(stats.totalGuidedPolicySelections ?? 0);
  aggregate.totalGuidedPriorUses += Number(stats.totalGuidedPriorUses ?? 0);
  aggregate.totalHybridPriorSearches += Number(stats.totalHybridPriorSearches ?? 0);
  aggregate.totalHybridPriorCacheHits += Number(stats.totalHybridPriorCacheHits ?? 0);
  aggregate.totalHybridPriorNodes += Number(stats.totalHybridPriorNodes ?? 0);
  aggregate.totalHybridPriorUses += Number(stats.totalHybridPriorUses ?? 0);
  aggregate.completedSearches += Number(stats.completedSearches ?? 0);
  aggregate.heuristicFallbackSearches += Number(stats.heuristicFallbackSearches ?? 0);

  for (const entry of stats.searchModes ?? []) {
    aggregate.searchModes[entry.key] = (aggregate.searchModes[entry.key] ?? 0) + Number(entry.count ?? 0);
  }
}

function summarizeGameForVariant(game, variantLabel) {
  if (game.blackVariantLabel === variantLabel) {
    return {
      color: PLAYER_COLORS.BLACK,
      discDiff: Number(game.blackDiff ?? 0),
      points: game.blackDiff > 0 ? 1 : game.blackDiff < 0 ? 0 : 0.5,
      stats: game.statsByColor.black,
    };
  }
  if (game.whiteVariantLabel === variantLabel) {
    return {
      color: PLAYER_COLORS.WHITE,
      discDiff: Number(game.blackDiff ?? 0) * -1,
      points: game.blackDiff < 0 ? 1 : game.blackDiff > 0 ? 0 : 0.5,
      stats: game.statsByColor.white,
    };
  }
  return null;
}

function finalizeVariantAggregate(aggregate) {
  const turns = Math.max(1, Number(aggregate.totalTurns ?? 0));
  const games = Math.max(1, Number(aggregate.games ?? 0));
  return {
    games: Number(aggregate.games ?? 0),
    wins: Number(aggregate.wins ?? 0),
    losses: Number(aggregate.losses ?? 0),
    draws: Number(aggregate.draws ?? 0),
    points: Number(aggregate.points ?? 0),
    scoreRate: Number(aggregate.points ?? 0) / games,
    averageDiscDiff: Number(aggregate.discDiff ?? 0) / games,
    blackGames: Number(aggregate.blackGames ?? 0),
    whiteGames: Number(aggregate.whiteGames ?? 0),
    scoreRateAsBlack: Number(aggregate.blackGames ?? 0) > 0 ? Number(aggregate.pointsAsBlack ?? 0) / Number(aggregate.blackGames ?? 0) : 0,
    scoreRateAsWhite: Number(aggregate.whiteGames ?? 0) > 0 ? Number(aggregate.pointsAsWhite ?? 0) / Number(aggregate.whiteGames ?? 0) : 0,
    totalTurns: Number(aggregate.totalTurns ?? 0),
    averageElapsedMs: Number(aggregate.totalElapsedMs ?? 0) / turns,
    averageNodes: Number(aggregate.totalNodes ?? 0) / turns,
    averageCutoffs: Number(aggregate.totalCutoffs ?? 0) / turns,
    averageTtHits: Number(aggregate.totalTtHits ?? 0) / turns,
    averageMtdfPasses: Number(aggregate.totalMtdfPasses ?? 0) / turns,
    averageMtdfFailHighs: Number(aggregate.totalMtdfFailHighs ?? 0) / turns,
    averageMtdfFailLows: Number(aggregate.totalMtdfFailLows ?? 0) / turns,
    averageMtdfVerificationPasses: Number(aggregate.totalMtdfVerificationPasses ?? 0) / turns,
    averageMctsIterations: Number(aggregate.totalMctsIterations ?? 0) / turns,
    averageMctsRollouts: Number(aggregate.totalMctsRollouts ?? 0) / turns,
    averageMctsRolloutPlies: Number(aggregate.totalMctsRolloutPlies ?? 0) / turns,
    averageMctsTreeNodes: Number(aggregate.totalMctsTreeNodes ?? 0) / turns,
    averageMctsCutoffEvaluations: Number(aggregate.totalMctsCutoffEvaluations ?? 0) / turns,
    averageGuidedPolicySelections: Number(aggregate.totalGuidedPolicySelections ?? 0) / turns,
    averageGuidedPriorUses: Number(aggregate.totalGuidedPriorUses ?? 0) / turns,
    averageHybridPriorSearches: Number(aggregate.totalHybridPriorSearches ?? 0) / turns,
    averageHybridPriorCacheHits: Number(aggregate.totalHybridPriorCacheHits ?? 0) / turns,
    averageHybridPriorNodes: Number(aggregate.totalHybridPriorNodes ?? 0) / turns,
    averageHybridPriorUses: Number(aggregate.totalHybridPriorUses ?? 0) / turns,
    completionRate: Number(aggregate.totalTurns ?? 0) > 0 ? Number(aggregate.completedSearches ?? 0) / Number(aggregate.totalTurns ?? 0) : 0,
    fallbackRate: Number(aggregate.totalTurns ?? 0) > 0 ? Number(aggregate.heuristicFallbackSearches ?? 0) / Number(aggregate.totalTurns ?? 0) : 0,
    nodesPerMs: Number(aggregate.totalElapsedMs ?? 0) > 0 ? Number(aggregate.totalNodes ?? 0) / Number(aggregate.totalElapsedMs ?? 0) : 0,
    searchModes: Object.entries(aggregate.searchModes ?? {})
      .sort((left, right) => right[1] - left[1])
      .map(([key, count]) => ({ key, count })),
  };
}

function buildRecommendation(firstVariantLabel, secondVariantLabel, firstAggregate, secondAggregate) {
  const pointGap = Number(secondAggregate?.scoreRate ?? 0) - Number(firstAggregate?.scoreRate ?? 0);
  if (Math.abs(pointGap) < 0.01) {
    return '두 profile variant의 paired score가 사실상 동률입니다.';
  }

  const betterLabel = pointGap > 0 ? secondVariantLabel : firstVariantLabel;
  const worseLabel = pointGap > 0 ? firstVariantLabel : secondVariantLabel;
  const betterAggregate = pointGap > 0 ? secondAggregate : firstAggregate;
  const worseAggregate = pointGap > 0 ? firstAggregate : secondAggregate;
  const fallbackGap = Number(betterAggregate?.fallbackRate ?? 0) - Number(worseAggregate?.fallbackRate ?? 0);

  if (fallbackGap > 0.05 && Math.abs(pointGap) < 0.1) {
    return `${betterLabel}가 점수율은 앞서지만 fallback이 더 많아 추가 확인이 필요합니다.`;
  }
  return `${betterLabel}가 ${worseLabel}보다 paired score 기준 우세합니다.`;
}

function summarizeScenario({ firstVariantLabel, secondVariantLabel, timeLimitMs, pairs }) {
  const aggregates = {
    [firstVariantLabel]: createVariantAggregate(),
    [secondVariantLabel]: createVariantAggregate(),
  };

  const allGames = [];

  for (const pair of pairs) {
    for (const game of [pair.firstAsBlack, pair.secondAsBlack]) {
      allGames.push(game);

      for (const variantLabel of [firstVariantLabel, secondVariantLabel]) {
        const summary = summarizeGameForVariant(game, variantLabel);
        if (!summary) {
          continue;
        }

        const aggregate = aggregates[variantLabel];
        aggregate.games += 1;
        aggregate.discDiff += Number(summary.discDiff ?? 0);

        if (summary.points === 1) {
          aggregate.wins += 1;
        } else if (summary.points === 0) {
          aggregate.losses += 1;
        } else {
          aggregate.draws += 1;
        }
        aggregate.points += summary.points;

        if (summary.color === PLAYER_COLORS.BLACK) {
          aggregate.blackGames += 1;
          aggregate.pointsAsBlack += summary.points;
        } else {
          aggregate.whiteGames += 1;
          aggregate.pointsAsWhite += summary.points;
        }

        absorbGameStatsIntoAggregate(aggregate, summary.stats);
      }
    }
  }

  const finalized = {
    [firstVariantLabel]: finalizeVariantAggregate(aggregates[firstVariantLabel]),
    [secondVariantLabel]: finalizeVariantAggregate(aggregates[secondVariantLabel]),
  };

  return {
    timeLimitMs,
    pairedOpenings: pairs.length,
    totalGames: allGames.length,
    firstVariantLabel,
    secondVariantLabel,
    variants: finalized,
    pointGap: finalized[secondVariantLabel].scoreRate - finalized[firstVariantLabel].scoreRate,
    recommendation: buildRecommendation(
      firstVariantLabel,
      secondVariantLabel,
      finalized[firstVariantLabel],
      finalized[secondVariantLabel],
    ),
    pairs,
  };
}

function logScenarioSummary(summary) {
  const first = summary.variants[summary.firstVariantLabel];
  const second = summary.variants[summary.secondVariantLabel];
  console.log(
    [
      `${summary.timeLimitMs}ms`,
      `${summary.firstVariantLabel} ${first.points.toFixed(1)}/${first.games} (${(first.scoreRate * 100).toFixed(1)}%)`,
      `${summary.secondVariantLabel} ${second.points.toFixed(1)}/${second.games} (${(second.scoreRate * 100).toFixed(1)}%)`,
      `gap ${(summary.pointGap * 100).toFixed(1)}pp`,
      `nodes/ms ${summary.firstVariantLabel} ${first.nodesPerMs.toFixed(2)} / ${summary.secondVariantLabel} ${second.nodesPerMs.toFixed(2)}`,
    ].join(' | '),
  );
  console.log(`  -> ${summary.recommendation}`);
}

function writeJsonIfRequested(outputJsonPath, data) {
  if (!outputJsonPath) {
    return null;
  }

  const resolved = resolveCliPath(outputJsonPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return resolved;
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printUsage();
  process.exit(0);
}

const searchAlgorithm = normalizeSearchAlgorithm(args['search-algorithm'] ?? DEFAULTS.searchAlgorithm);
const games = toFiniteInteger(args.games, DEFAULTS.games, 1, 200);
const openingPlies = toFiniteInteger(args['opening-plies'], DEFAULTS.openingPlies, 0, 60);
const seed = toFiniteInteger(args.seed, DEFAULTS.seed, 1, 0x7fffffff);
const seedList = parseSeedList(args['seed-list'], seed);
const timeMsList = parseTimeMsList(args['time-ms-list']);
const maxDepth = toFiniteInteger(args['max-depth'], DEFAULTS.maxDepth, 1, 12);
const exactEndgameEmpties = toFiniteInteger(args['exact-endgame-empties'], DEFAULTS.exactEndgameEmpties, 0, 24);
const solverAdjudicationEmpties = toFiniteInteger(args['solver-adjudication-empties'], DEFAULTS.solverAdjudicationEmpties, -1, 24);
const solverAdjudicationTimeMs = toFiniteInteger(args['solver-adjudication-time-ms'], DEFAULTS.solverAdjudicationTimeMs, 100, 300000);
const maxTableEntries = toFiniteInteger(args['max-table-entries'], DEFAULTS.maxTableEntries, 1000, 600000);
const aspirationWindow = toFiniteInteger(args['aspiration-window'], DEFAULTS.aspirationWindow, 0, 5000);
const presetKey = typeof args['preset-key'] === 'string' && args['preset-key'].trim() !== ''
  ? args['preset-key'].trim()
  : DEFAULTS.presetKey;
const styleKey = typeof args['style-key'] === 'string' && args['style-key'].trim() !== ''
  ? args['style-key'].trim()
  : DEFAULTS.styleKey;
const progressEveryPairs = toFiniteInteger(args['progress-every-pairs'], DEFAULTS.progressEveryPairs, 0, 10_000);

const firstLabel = typeof args['first-label'] === 'string' && args['first-label'].trim() !== ''
  ? args['first-label'].trim()
  : 'active';
const secondLabel = typeof args['second-label'] === 'string' && args['second-label'].trim() !== ''
  ? args['second-label'].trim()
  : 'candidate';

const firstGeneratedModule = typeof args['first-generated-module'] === 'string' && args['first-generated-module'].trim() !== ''
  ? args['first-generated-module'].trim()
  : ACTIVE_GENERATED_MODULE_PATH;
const secondGeneratedModule = typeof args['second-generated-module'] === 'string' && args['second-generated-module'].trim() !== ''
  ? args['second-generated-module'].trim()
  : null;

if (!secondGeneratedModule) {
  throw new Error('second-generated-module is required.');
}

const firstVariant = await loadProfileVariant({
  label: firstLabel,
  generatedModule: firstGeneratedModule,
});
const secondVariant = await loadProfileVariant({
  label: secondLabel,
  generatedModule: secondGeneratedModule,
});

const searchLabel = describeSearchAlgorithm(searchAlgorithm)?.label ?? searchAlgorithm;
console.log(`Running profile-variant pair benchmark: ${firstLabel} vs ${secondLabel} | algorithm ${searchAlgorithm} (${searchLabel})`);
console.log(`Scenarios: ${timeMsList.join(', ')} ms | paired openings per seed: ${games} | seeds: ${seedList.join(', ')} | opening plies: ${openingPlies}`);
console.log(`Progress logging: every ${progressEveryPairs} paired opening(s)`);

const scenarioSummaries = [];

for (let scenarioIndex = 0; scenarioIndex < timeMsList.length; scenarioIndex += 1) {
  const timeLimitMs = timeMsList[scenarioIndex];
  const pairs = [];
  let pairSerial = 0;
  const totalPairsForScenario = seedList.length * games;

  for (let seedIndex = 0; seedIndex < seedList.length; seedIndex += 1) {
    const baseSeed = seedList[seedIndex];

    for (let pairIndex = 0; pairIndex < games; pairIndex += 1) {
      const openingSeed = mixSeed(baseSeed, pairIndex, openingPlies, 'opening');
      const openingMeta = createOpeningState(openingPlies, openingSeed);

      const firstAsBlackSeed = mixSeed(baseSeed, timeLimitMs, pairIndex, 'first-as-black', searchAlgorithm);
      const secondAsBlackSeed = mixSeed(baseSeed, timeLimitMs, pairIndex, 'second-as-black', searchAlgorithm);

      pairs.push({
        pairIndex: pairSerial,
        pairIndexWithinSeed: pairIndex,
        seedIndex,
        baseSeed,
        openingSeed,
        openingHash: openingMeta.openingHash,
        openingMoves: [...openingMeta.openingMoves],
        openingCompactSequence: openingMeta.openingCompactSequence,
        openingPlyCompleted: openingMeta.openingPlyCompleted,
        firstAsBlack: playSingleGame({
          startingState: openingMeta.state,
          openingMeta,
          firstVariant,
          secondVariant,
          firstVariantLabel: firstLabel,
          secondVariantLabel: secondLabel,
          searchAlgorithm,
          timeLimitMs,
          maxDepth,
          exactEndgameEmpties,
          aspirationWindow,
          solverAdjudicationEmpties,
          solverAdjudicationTimeMs,
          maxTableEntries,
          presetKey,
          styleKey,
          gameSeed: firstAsBlackSeed,
          firstAsBlack: true,
        }),
        secondAsBlack: playSingleGame({
          startingState: openingMeta.state,
          openingMeta,
          firstVariant,
          secondVariant,
          firstVariantLabel: firstLabel,
          secondVariantLabel: secondLabel,
          searchAlgorithm,
          timeLimitMs,
          maxDepth,
          exactEndgameEmpties,
          aspirationWindow,
          solverAdjudicationEmpties,
          solverAdjudicationTimeMs,
          maxTableEntries,
          presetKey,
          styleKey,
          gameSeed: secondAsBlackSeed,
          firstAsBlack: false,
        }),
      });
      pairSerial += 1;
      if (progressEveryPairs > 0 && (pairSerial % progressEveryPairs === 0 || pairSerial === totalPairsForScenario)) {
        console.log(`  progress ${pairSerial}/${totalPairsForScenario} paired opening(s) @ ${timeLimitMs}ms`);
      }
    }
  }

  const scenarioSummary = summarizeScenario({
    firstVariantLabel: firstLabel,
    secondVariantLabel: secondLabel,
    timeLimitMs,
    pairs,
  });
  scenarioSummary.seedList = [...seedList];
  scenarioSummary.seedCount = seedList.length;
  scenarioSummary.pairedOpeningsPerSeed = games;
  scenarioSummaries.push(scenarioSummary);
  logScenarioSummary(scenarioSummary);
}

const firstSummary = describeVariantForSummary(firstVariant);
const secondSummary = describeVariantForSummary(secondVariant);
const finalSummary = {
  type: 'profile-variant-pair-benchmark',
  generatedAt: new Date().toISOString(),
  options: {
    searchAlgorithm,
    searchLabel,
    games,
    openingPlies,
    seed,
    seedList,
    timeMsList,
    maxDepth,
    exactEndgameEmpties,
    solverAdjudicationEmpties,
    solverAdjudicationTimeMs,
    maxTableEntries,
    aspirationWindow,
    presetKey,
    styleKey,
    progressEveryPairs,
  },
  variants: {
    [firstLabel]: firstSummary,
    [secondLabel]: secondSummary,
  },
  scenarios: scenarioSummaries,
  condensedRecommendations: scenarioSummaries.map((scenario) => ({
    timeLimitMs: scenario.timeLimitMs,
    recommendation: scenario.recommendation,
    pointGap: scenario.pointGap,
    firstVariantScoreRate: scenario.variants[firstLabel].scoreRate,
    secondVariantScoreRate: scenario.variants[secondLabel].scoreRate,
    firstVariantFallbackRate: scenario.variants[firstLabel].fallbackRate,
    secondVariantFallbackRate: scenario.variants[secondLabel].fallbackRate,
    firstVariantNodesPerMs: scenario.variants[firstLabel].nodesPerMs,
    secondVariantNodesPerMs: scenario.variants[secondLabel].nodesPerMs,
  })),
};

const outputJsonPath = writeJsonIfRequested(args['output-json'], finalSummary);
if (outputJsonPath) {
  console.log(`Saved benchmark summary to ${relativePathFromCwd(outputJsonPath) ?? outputJsonPath}`);
}

console.log(`Completed ${NUMBER_FORMATTER.format(scenarioSummaries.length)} scenario(s), ${NUMBER_FORMATTER.format(scenarioSummaries.reduce((sum, scenario) => sum + scenario.totalGames, 0))} game(s).`);
