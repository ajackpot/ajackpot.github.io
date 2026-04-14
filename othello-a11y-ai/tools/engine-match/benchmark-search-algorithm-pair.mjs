#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { describeSearchAlgorithm, normalizeSearchAlgorithm } from '../../js/ai/search-algorithms.js';
import { SearchEngine } from '../../js/ai/search-engine.js';
import { GameState, serializeMoveHistoryCompact } from '../../js/core/game-state.js';
import { PLAYER_COLORS } from '../../js/core/rules.js';
import { parseArgs, relativePathFromCwd, resolveCliPath } from '../evaluator-training/lib.mjs';
import { buildEngineProfileOverrides, describeVariantForSummary, loadProfileVariant } from './lib-profile-variants.mjs';

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US');

const DEFAULTS = Object.freeze({
  firstAlgorithm: 'mcts-lite',
  secondAlgorithm: 'mcts-guided',
  games: 3,
  openingPlies: 10,
  seed: 17,
  seedList: [17],
  timeMsList: [60, 120, 240],
  maxDepth: 4,
  exactEndgameEmpties: 8,
  solverAdjudicationEmpties: 12,
  solverAdjudicationTimeMs: 30000,
  maxTableEntries: 60000,
  aspirationWindow: 0,
  firstClassicSearchDriver: null,
  secondClassicSearchDriver: null,
  firstClassicMtdfGuessPlyOffset: null,
  secondClassicMtdfGuessPlyOffset: null,
  classicMtdfVerificationPassEnabled: true,
  presetKey: 'custom',
  styleKey: 'balanced',
  progressEveryPairs: 4,
});

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/benchmark-search-algorithm-pair.mjs \
    [--output-json benchmarks/stage90_mcts_lite_vs_guided_pilot.json] \
    [--first-algorithm mcts-lite] \
    [--second-algorithm mcts-guided] \
    [--games 3] \
    [--opening-plies 10] \
    [--seed 17] \
    [--seed-list 17,31] \
    [--time-ms-list 60,120,240] \
    [--max-depth 4] \
    [--exact-endgame-empties 8] \
    [--solver-adjudication-empties 12] \
    [--solver-adjudication-time-ms 30000] \
    [--max-table-entries 60000]
    [--aspiration-window 0]
    [--first-classic-search-driver pvs|mtdf] [--second-classic-search-driver pvs|mtdf]
    [--first-classic-mtdf-guess-ply-offset 1|2] [--second-classic-mtdf-guess-ply-offset 1|2]
    [--classic-mtdf-verification-pass-enabled true|false]
    [--generated-module js/ai/learned-eval-profile.generated.js | --evaluation-json <file> [--move-ordering-json <file>] [--tuple-json <file>] [--mpc-json <file>]]
    [--progress-every-pairs 4]

설명:
- 같은 random opening에서 색을 바꿔 두 번 대국하여 색 편향을 줄입니다.
- --seed-list를 주면 seed마다 games개의 opening pair를 실행하여 표본을 쉽게 넓힐 수 있습니다.
- 각 시나리오는 지정한 time-ms-list 버킷마다 games * seedCount개의 opening pair(실제 2 * games * seedCount 판)를 실행합니다.
- solver-adjudication-empties 이하에 들어가면 classic exact lane으로 승패/디스크 차를 판정하여 전체 시간을 줄입니다.
- 현재 도구는 mcts-lite / mcts-guided / mcts-hybrid 같은 내부 알고리즘 조합 비교에 그대로 사용할 수 있습니다.
- progress-every-pairs를 주면 paired opening 진행 상황을 주기적으로 출력해 장시간 벤치의 진행률을 확인할 수 있습니다.
- generated-module / evaluation-json 계열 옵션을 주면 두 알고리즘 모두 같은 custom profile 묶음을 공유한 상태에서 비교할 수 있습니다.
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
  algorithm,
  classicSearchDriver = null,
  classicMtdfGuessPlyOffset = null,
  classicMtdfVerificationPassEnabled = true,
  timeLimitMs,
  maxDepth,
  exactEndgameEmpties,
  aspirationWindow,
  maxTableEntries,
  presetKey,
  styleKey,
  profileVariant = null,
}) {
  return new SearchEngine({
    presetKey,
    styleKey,
    searchAlgorithm: algorithm,
    ...(typeof classicSearchDriver === 'string' && classicSearchDriver.trim() !== ''
      ? { classicSearchDriver }
      : {}),
    ...(Number.isFinite(Number(classicMtdfGuessPlyOffset))
      ? { classicMtdfGuessPlyOffset: Math.max(1, Math.min(2, Math.round(Number(classicMtdfGuessPlyOffset)))) }
      : {}),
    classicMtdfVerificationPassEnabled,
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
  target.totalGuidedPolicySelections += Number(result.stats?.mctsGuidedPolicySelections ?? 0);
  target.totalGuidedPriorUses += Number(result.stats?.mctsGuidedPriorUses ?? 0);
  target.totalHybridPriorSearches += Number(result.stats?.mctsHybridPriorSearches ?? 0);
  target.totalHybridPriorCacheHits += Number(result.stats?.mctsHybridPriorCacheHits ?? 0);
  target.totalHybridPriorNodes += Number(result.stats?.mctsHybridPriorNodes ?? 0);
  target.totalHybridPriorUses += Number(result.stats?.mctsHybridPriorUses ?? 0);

  if (result.searchCompletion === 'complete') {
    target.completedSearches += 1;
  } else {
    target.heuristicFallbackSearches += 1;
  }

  const modeKey = result.searchMode ?? 'unknown';
  target.searchModes[modeKey] = (target.searchModes[modeKey] ?? 0) + 1;
}

function finalizePerColorStats(stats) {
  const averageElapsedMsPerTurn = stats.turns > 0 ? stats.totalElapsedMs / stats.turns : 0;
  return {
    ...stats,
    averageElapsedMsPerTurn,
    averageNodesPerTurn: stats.turns > 0 ? stats.totalNodes / stats.turns : 0,
    averageNodesPerMs: averageElapsedMsPerTurn > 0 ? stats.totalNodes / stats.totalElapsedMs : 0,
    averageCutoffsPerTurn: stats.turns > 0 ? stats.totalCutoffs / stats.turns : 0,
    averageTtHitsPerTurn: stats.turns > 0 ? stats.totalTtHits / stats.turns : 0,
    averageMtdfPassesPerTurn: stats.turns > 0 ? stats.totalMtdfPasses / stats.turns : 0,
    averageMtdfFailHighsPerTurn: stats.turns > 0 ? stats.totalMtdfFailHighs / stats.turns : 0,
    averageMtdfFailLowsPerTurn: stats.turns > 0 ? stats.totalMtdfFailLows / stats.turns : 0,
    averageMtdfVerificationPassesPerTurn: stats.turns > 0 ? stats.totalMtdfVerificationPasses / stats.turns : 0,
    averageMctsIterationsPerTurn: stats.turns > 0 ? stats.totalMctsIterations / stats.turns : 0,
    averageMctsRolloutsPerTurn: stats.turns > 0 ? stats.totalMctsRollouts / stats.turns : 0,
    averageMctsTreeNodesPerTurn: stats.turns > 0 ? stats.totalMctsTreeNodes / stats.turns : 0,
    completionRate: stats.turns > 0 ? stats.completedSearches / stats.turns : 0,
  };
}

function createAlgorithmAggregate() {
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

function absorbGameStatsIntoAggregate(aggregate, stats) {
  aggregate.turns += Number(stats.turns ?? 0);
  aggregate.passes += Number(stats.passes ?? 0);
  aggregate.completedSearches += Number(stats.completedSearches ?? 0);
  aggregate.heuristicFallbackSearches += Number(stats.heuristicFallbackSearches ?? 0);
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

  for (const [key, value] of Object.entries(stats.searchModes ?? {})) {
    aggregate.searchModes[key] = (aggregate.searchModes[key] ?? 0) + Number(value ?? 0);
  }
}

function finalizeAlgorithmAggregate(aggregate) {
  const averageElapsedMsPerTurn = aggregate.turns > 0 ? aggregate.totalElapsedMs / aggregate.turns : 0;
  return {
    ...aggregate,
    scoreRate: aggregate.games > 0 ? aggregate.points / aggregate.games : 0,
    averageDiscDiff: aggregate.games > 0 ? aggregate.discDiff / aggregate.games : 0,
    averageElapsedMsPerGame: aggregate.games > 0 ? aggregate.totalElapsedMs / aggregate.games : 0,
    averageElapsedMsPerTurn,
    averageNodesPerGame: aggregate.games > 0 ? aggregate.totalNodes / aggregate.games : 0,
    averageNodesPerTurn: aggregate.turns > 0 ? aggregate.totalNodes / aggregate.turns : 0,
    averageNodesPerMs: averageElapsedMsPerTurn > 0 ? aggregate.totalNodes / aggregate.totalElapsedMs : 0,
    averageCutoffsPerTurn: aggregate.turns > 0 ? aggregate.totalCutoffs / aggregate.turns : 0,
    averageTtHitsPerTurn: aggregate.turns > 0 ? aggregate.totalTtHits / aggregate.turns : 0,
    averageMtdfPassesPerTurn: aggregate.turns > 0 ? aggregate.totalMtdfPasses / aggregate.turns : 0,
    averageMtdfFailHighsPerTurn: aggregate.turns > 0 ? aggregate.totalMtdfFailHighs / aggregate.turns : 0,
    averageMtdfFailLowsPerTurn: aggregate.turns > 0 ? aggregate.totalMtdfFailLows / aggregate.turns : 0,
    averageMtdfVerificationPassesPerTurn: aggregate.turns > 0 ? aggregate.totalMtdfVerificationPasses / aggregate.turns : 0,
    averageMctsIterationsPerTurn: aggregate.turns > 0 ? aggregate.totalMctsIterations / aggregate.turns : 0,
    averageMctsRolloutsPerTurn: aggregate.turns > 0 ? aggregate.totalMctsRollouts / aggregate.turns : 0,
    averageMctsTreeNodesPerTurn: aggregate.turns > 0 ? aggregate.totalMctsTreeNodes / aggregate.turns : 0,
    completionRate: aggregate.turns > 0 ? aggregate.completedSearches / aggregate.turns : 0,
    fallbackRate: aggregate.turns > 0 ? aggregate.heuristicFallbackSearches / aggregate.turns : 0,
    pointsAsBlackRate: aggregate.blackGames > 0 ? aggregate.pointsAsBlack / aggregate.blackGames : 0,
    pointsAsWhiteRate: aggregate.whiteGames > 0 ? aggregate.pointsAsWhite / aggregate.whiteGames : 0,
  };
}

function pointValueFromBlackDiff(blackDiff, color) {
  if (blackDiff === 0) {
    return 0.5;
  }
  if (color === PLAYER_COLORS.BLACK) {
    return blackDiff > 0 ? 1 : 0;
  }
  return blackDiff < 0 ? 1 : 0;
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

function createExactAdjudicator({ timeLimitMs, maxTableEntries, styleKey, profileVariant = null }) {
  return new SearchEngine({
    presetKey: 'custom',
    styleKey,
    searchAlgorithm: 'classic',
    maxDepth: 1,
    timeLimitMs,
    exactEndgameEmpties: 64,
    wldPreExactEmpties: 0,
    aspirationWindow: 0,
    openingRandomness: 0,
    searchRandomness: 0,
    randomness: 0,
    maxTableEntries: Math.max(180000, maxTableEntries),
    ...buildEngineProfileOverrides(profileVariant),
  });
}

function adjudicateExact(state, adjudicator) {
  const result = adjudicator.findBestMove(state, {
    exactEndgameEmpties: state.getEmptyCount(),
    wldPreExactEmpties: 0,
  });
  if (!result?.isExactResult || result.searchCompletion !== 'complete' || !Number.isFinite(result.score)) {
    return null;
  }

  const normalizedDiff = Math.round(result.score / 10000);
  const blackDiff = state.currentPlayer === PLAYER_COLORS.BLACK
    ? normalizedDiff
    : -normalizedDiff;

  return {
    blackDiff,
    scoreFromCurrentPlayerPerspective: normalizedDiff,
    result,
  };
}

function summarizeGameForAlgorithm(game, algorithm) {
  if (game.blackAlgorithm === algorithm) {
    return {
      color: PLAYER_COLORS.BLACK,
      stats: game.statsByColor.black,
      points: pointValueFromBlackDiff(game.blackDiff, PLAYER_COLORS.BLACK),
      discDiff: game.blackDiff,
    };
  }

  if (game.whiteAlgorithm === algorithm) {
    return {
      color: PLAYER_COLORS.WHITE,
      stats: game.statsByColor.white,
      points: pointValueFromBlackDiff(game.blackDiff, PLAYER_COLORS.WHITE),
      discDiff: -game.blackDiff,
    };
  }

  return null;
}

function buildRecommendation(firstAlgorithm, secondAlgorithm, firstAggregate, secondAggregate) {
  const pointGap = secondAggregate.scoreRate - firstAggregate.scoreRate;
  const fallbackGap = secondAggregate.fallbackRate - firstAggregate.fallbackRate;

  if (pointGap >= 0.2 && secondAggregate.fallbackRate <= 0.05) {
    return `${secondAlgorithm}가 충분히 분리되어 우세합니다. 이 시간 버킷부터 ${secondAlgorithm} 배치를 우선 검토할 만합니다.`;
  }
  if (pointGap >= 0.1) {
    return `${secondAlgorithm} 쪽이 우세하지만 분리 폭은 아직 중간 수준입니다. 실제 난이도 배치는 더 많은 opening pair로 확인하는 편이 안전합니다.`;
  }
  if (pointGap <= -0.1) {
    return `${firstAlgorithm}가 이 시간 버킷에서는 더 안정적입니다. ${secondAlgorithm}는 더 높은 timeLimitMs에서 다시 확인하는 편이 좋습니다.`;
  }
  if (fallbackGap >= 0.12) {
    return `${secondAlgorithm}가 이 시간 버킷에서는 heuristic fallback 비율이 높습니다. 아직 안정 배치 구간으로 보기 어렵습니다.`;
  }
  return `두 알고리즘 차이가 아직 작습니다. 이 버킷 alone으로는 난이도 분리 근거가 약합니다.`;
}

function playSingleGame({
  startingState,
  openingMeta,
  blackAlgorithm,
  whiteAlgorithm,
  blackClassicSearchDriver = null,
  whiteClassicSearchDriver = null,
  blackClassicMtdfGuessPlyOffset = 1,
  whiteClassicMtdfGuessPlyOffset = 1,
  classicMtdfVerificationPassEnabled = true,
  timeLimitMs,
  maxDepth,
  exactEndgameEmpties,
  aspirationWindow,
  solverAdjudicationEmpties,
  solverAdjudicationTimeMs,
  maxTableEntries,
  presetKey,
  styleKey,
  profileVariant = null,
  gameSeed,
}) {
  let state = startingState.clone();
  const initialPly = state.ply;
  const engines = {
    black: createEngine({
      algorithm: blackAlgorithm,
      classicSearchDriver: blackClassicSearchDriver,
      classicMtdfGuessPlyOffset: blackClassicMtdfGuessPlyOffset,
      classicMtdfVerificationPassEnabled,
      timeLimitMs,
      maxDepth,
      exactEndgameEmpties,
      aspirationWindow,
      maxTableEntries,
      presetKey,
      styleKey,
      profileVariant,
    }),
    white: createEngine({
      algorithm: whiteAlgorithm,
      classicSearchDriver: whiteClassicSearchDriver,
      classicMtdfGuessPlyOffset: whiteClassicMtdfGuessPlyOffset,
      classicMtdfVerificationPassEnabled,
      timeLimitMs,
      maxDepth,
      exactEndgameEmpties,
      aspirationWindow,
      maxTableEntries,
      presetKey,
      styleKey,
      profileVariant,
    }),
  };
  const adjudicator = solverAdjudicationEmpties >= 0
    ? createExactAdjudicator({
      timeLimitMs: solverAdjudicationTimeMs,
      maxTableEntries,
      styleKey,
      profileVariant,
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
    const algorithm = color === PLAYER_COLORS.BLACK ? blackAlgorithm : whiteAlgorithm;
    const engine = engines[colorKey];
    const searchSeed = mixSeed(gameSeed, state.ply, state.getEmptyCount(), color, algorithm, blackAlgorithm, whiteAlgorithm);
    const result = withSeededRandom(searchSeed, () => engine.findBestMove(state));
    mergeSearchResultIntoPerColorStats(statsByColor[colorKey], result);

    let moveIndex = Number.isInteger(result?.bestMoveIndex) ? result.bestMoveIndex : null;
    let applied = moveIndex === null ? null : state.applyMove(moveIndex);
    if (!applied) {
      moveIndex = legalMoves[0]?.index ?? null;
      applied = moveIndex === null ? null : state.applyMove(moveIndex);
    }
    if (!applied) {
      throw new Error(`Unable to apply a legal move for ${algorithm} at ply ${state.ply}.`);
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
  const winnerAlgorithm = winnerColor === PLAYER_COLORS.BLACK
    ? blackAlgorithm
    : winnerColor === PLAYER_COLORS.WHITE
      ? whiteAlgorithm
      : null;

  return {
    openingSeed: openingMeta.openingSeed,
    openingHash: openingMeta.openingHash,
    openingMoves: [...openingMeta.openingMoves],
    openingCompactSequence: openingMeta.openingCompactSequence,
    openingPlyCompleted: openingMeta.openingPlyCompleted,
    gameSeed,
    timeLimitMs,
    blackAlgorithm,
    whiteAlgorithm,
    totalPly: adjudication ? state.ply : state.ply,
    playedPlyAfterOpening: Math.max(0, state.ply - initialPly),
    blackDiff,
    winnerColor,
    winnerAlgorithm,
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

function summarizeScenario({
  firstAlgorithm,
  secondAlgorithm,
  timeLimitMs,
  pairs,
}) {
  const aggregates = {
    [firstAlgorithm]: createAlgorithmAggregate(),
    [secondAlgorithm]: createAlgorithmAggregate(),
  };

  const allGames = [];

  for (const pair of pairs) {
    for (const game of [pair.firstAsBlack, pair.secondAsBlack]) {
      allGames.push(game);

      for (const algorithm of [firstAlgorithm, secondAlgorithm]) {
        const summary = summarizeGameForAlgorithm(game, algorithm);
        if (!summary) {
          continue;
        }

        const aggregate = aggregates[algorithm];
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
    [firstAlgorithm]: finalizeAlgorithmAggregate(aggregates[firstAlgorithm]),
    [secondAlgorithm]: finalizeAlgorithmAggregate(aggregates[secondAlgorithm]),
  };

  return {
    timeLimitMs,
    pairedOpenings: pairs.length,
    totalGames: allGames.length,
    firstAlgorithm,
    secondAlgorithm,
    algorithms: finalized,
    pointGap: finalized[secondAlgorithm].scoreRate - finalized[firstAlgorithm].scoreRate,
    recommendation: buildRecommendation(
      firstAlgorithm,
      secondAlgorithm,
      finalized[firstAlgorithm],
      finalized[secondAlgorithm],
    ),
    pairs,
  };
}

function logScenarioSummary(summary) {
  const first = summary.algorithms[summary.firstAlgorithm];
  const second = summary.algorithms[summary.secondAlgorithm];
  console.log(
    [
      `${summary.timeLimitMs}ms`,
      `${summary.firstAlgorithm} ${first.points.toFixed(1)}/${first.games} (${(first.scoreRate * 100).toFixed(1)}%)`,
      `${summary.secondAlgorithm} ${second.points.toFixed(1)}/${second.games} (${(second.scoreRate * 100).toFixed(1)}%)`,
      `gap ${(summary.pointGap * 100).toFixed(1)}pp`,
      `fallback ${summary.firstAlgorithm} ${(first.fallbackRate * 100).toFixed(1)}% / ${summary.secondAlgorithm} ${(second.fallbackRate * 100).toFixed(1)}%`,
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

const firstAlgorithm = normalizeSearchAlgorithm(args['first-algorithm'] ?? DEFAULTS.firstAlgorithm);
const secondAlgorithm = normalizeSearchAlgorithm(args['second-algorithm'] ?? DEFAULTS.secondAlgorithm);

if (firstAlgorithm === secondAlgorithm) {
  throw new Error('first-algorithm and second-algorithm must be different for a meaningful pair benchmark.');
}

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
const firstClassicSearchDriver = typeof args['first-classic-search-driver'] === 'string' && args['first-classic-search-driver'].trim() !== ''
  ? args['first-classic-search-driver'].trim()
  : DEFAULTS.firstClassicSearchDriver;
const secondClassicSearchDriver = typeof args['second-classic-search-driver'] === 'string' && args['second-classic-search-driver'].trim() !== ''
  ? args['second-classic-search-driver'].trim()
  : DEFAULTS.secondClassicSearchDriver;
const firstClassicMtdfGuessPlyOffset = toFiniteInteger(
  args['first-classic-mtdf-guess-ply-offset'],
  DEFAULTS.firstClassicMtdfGuessPlyOffset,
  1,
  2,
);
const secondClassicMtdfGuessPlyOffset = toFiniteInteger(
  args['second-classic-mtdf-guess-ply-offset'],
  DEFAULTS.secondClassicMtdfGuessPlyOffset,
  1,
  2,
);
const classicMtdfVerificationPassEnabled = typeof args['classic-mtdf-verification-pass-enabled'] === 'string'
  ? args['classic-mtdf-verification-pass-enabled'].trim().toLowerCase() !== 'false'
  : DEFAULTS.classicMtdfVerificationPassEnabled;
const presetKey = typeof args['preset-key'] === 'string' && args['preset-key'].trim() !== ''
  ? args['preset-key'].trim()
  : DEFAULTS.presetKey;
const styleKey = typeof args['style-key'] === 'string' && args['style-key'].trim() !== ''
  ? args['style-key'].trim()
  : DEFAULTS.styleKey;
const progressEveryPairs = toFiniteInteger(args['progress-every-pairs'], DEFAULTS.progressEveryPairs, 0, 10_000);

const sharedProfileVariant = (typeof args['generated-module'] === 'string' && args['generated-module'].trim() !== '')
  || (typeof args['evaluation-json'] === 'string' && args['evaluation-json'].trim() !== '')
  || (typeof args['move-ordering-json'] === 'string' && args['move-ordering-json'].trim() !== '')
  || (typeof args['tuple-json'] === 'string' && args['tuple-json'].trim() !== '')
  || (typeof args['mpc-json'] === 'string' && args['mpc-json'].trim() !== '')
  ? await loadProfileVariant({
    label: 'shared-profile',
    generatedModule: args['generated-module'] ?? null,
    evaluationJson: args['evaluation-json'] ?? null,
    moveOrderingJson: args['move-ordering-json'] ?? null,
    tupleJson: args['tuple-json'] ?? null,
    mpcJson: args['mpc-json'] ?? null,
  })
  : null;

const firstLabel = describeSearchAlgorithm(firstAlgorithm)?.label ?? firstAlgorithm;
const secondLabel = describeSearchAlgorithm(secondAlgorithm)?.label ?? secondAlgorithm;

console.log(`Running internal pair benchmark: ${firstAlgorithm} (${firstLabel}) vs ${secondAlgorithm} (${secondLabel})`);
console.log(`Scenarios: ${timeMsList.join(', ')} ms | paired openings per seed: ${games} | seeds: ${seedList.join(', ')} | opening plies: ${openingPlies}`);
console.log(`Classic driver overrides: first=${firstClassicSearchDriver ?? 'default'} (guess ${Number.isFinite(Number(firstClassicMtdfGuessPlyOffset)) ? firstClassicMtdfGuessPlyOffset : 'default'}) | second=${secondClassicSearchDriver ?? 'default'} (guess ${Number.isFinite(Number(secondClassicMtdfGuessPlyOffset)) ? secondClassicMtdfGuessPlyOffset : 'default'}) | aspiration ${aspirationWindow}`);
console.log(`Progress logging: every ${progressEveryPairs} paired opening(s)`);
if (sharedProfileVariant) {
  console.log(`Shared profile override: ${sharedProfileVariant.evaluationProfile?.name ?? 'custom'} | move ordering ${sharedProfileVariant.moveOrderingProfile?.name ?? 'null'} | tuple ${sharedProfileVariant.tupleResidualProfile?.name ?? 'null'} | mpc ${sharedProfileVariant.mpcProfile?.name ?? 'null'}`);
}

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

      const firstAsBlackSeed = mixSeed(baseSeed, timeLimitMs, pairIndex, 'first-as-black');
      const secondAsBlackSeed = mixSeed(baseSeed, timeLimitMs, pairIndex, 'second-as-black');

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
          blackAlgorithm: firstAlgorithm,
          whiteAlgorithm: secondAlgorithm,
          blackClassicSearchDriver: firstClassicSearchDriver,
          whiteClassicSearchDriver: secondClassicSearchDriver,
          blackClassicMtdfGuessPlyOffset: firstClassicMtdfGuessPlyOffset,
          whiteClassicMtdfGuessPlyOffset: secondClassicMtdfGuessPlyOffset,
          classicMtdfVerificationPassEnabled,
          timeLimitMs,
          maxDepth,
          exactEndgameEmpties,
          aspirationWindow,
          solverAdjudicationEmpties,
          solverAdjudicationTimeMs,
          maxTableEntries,
          presetKey,
          styleKey,
          profileVariant: sharedProfileVariant,
          gameSeed: firstAsBlackSeed,
        }),
        secondAsBlack: playSingleGame({
          startingState: openingMeta.state,
          openingMeta,
          blackAlgorithm: secondAlgorithm,
          whiteAlgorithm: firstAlgorithm,
          blackClassicSearchDriver: secondClassicSearchDriver,
          whiteClassicSearchDriver: firstClassicSearchDriver,
          blackClassicMtdfGuessPlyOffset: secondClassicMtdfGuessPlyOffset,
          whiteClassicMtdfGuessPlyOffset: firstClassicMtdfGuessPlyOffset,
          classicMtdfVerificationPassEnabled,
          timeLimitMs,
          maxDepth,
          exactEndgameEmpties,
          aspirationWindow,
          solverAdjudicationEmpties,
          solverAdjudicationTimeMs,
          maxTableEntries,
          presetKey,
          styleKey,
          profileVariant: sharedProfileVariant,
          gameSeed: secondAsBlackSeed,
        }),
      });
      pairSerial += 1;
      if (progressEveryPairs > 0 && (pairSerial % progressEveryPairs === 0 || pairSerial === totalPairsForScenario)) {
        console.log(`  progress ${pairSerial}/${totalPairsForScenario} paired opening(s) @ ${timeLimitMs}ms`);
      }
    }
  }

  const scenarioSummary = summarizeScenario({
    firstAlgorithm,
    secondAlgorithm,
    timeLimitMs,
    pairs,
  });
  scenarioSummary.seedList = [...seedList];
  scenarioSummary.seedCount = seedList.length;
  scenarioSummary.pairedOpeningsPerSeed = games;
  scenarioSummaries.push(scenarioSummary);
  logScenarioSummary(scenarioSummary);
}

const finalSummary = {
  type: 'internal-search-algorithm-pair-benchmark',
  generatedAt: new Date().toISOString(),
  options: {
    firstAlgorithm,
    secondAlgorithm,
    firstLabel,
    secondLabel,
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
    firstClassicSearchDriver,
    secondClassicSearchDriver,
    firstClassicMtdfGuessPlyOffset,
    secondClassicMtdfGuessPlyOffset,
    classicMtdfVerificationPassEnabled,
    presetKey,
    styleKey,
    progressEveryPairs,
  },
  sharedProfileVariant: sharedProfileVariant ? describeVariantForSummary(sharedProfileVariant) : null,
  scenarios: scenarioSummaries,
  condensedRecommendations: scenarioSummaries.map((scenario) => ({
    timeLimitMs: scenario.timeLimitMs,
    recommendation: scenario.recommendation,
    pointGap: scenario.pointGap,
    firstAlgorithmScoreRate: scenario.algorithms[firstAlgorithm].scoreRate,
    secondAlgorithmScoreRate: scenario.algorithms[secondAlgorithm].scoreRate,
    firstAlgorithmFallbackRate: scenario.algorithms[firstAlgorithm].fallbackRate,
    secondAlgorithmFallbackRate: scenario.algorithms[secondAlgorithm].fallbackRate,
  })),
};

const outputJsonPath = writeJsonIfRequested(args['output-json'], finalSummary);
if (outputJsonPath) {
  console.log(`Saved benchmark summary to ${relativePathFromCwd(outputJsonPath) ?? outputJsonPath}`);
}

console.log(`Completed ${NUMBER_FORMATTER.format(scenarioSummaries.length)} scenario(s), ${NUMBER_FORMATTER.format(scenarioSummaries.reduce((sum, scenario) => sum + scenario.totalGames, 0))} game(s).`);
