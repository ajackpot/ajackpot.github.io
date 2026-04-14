#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  ACTIVE_EVALUATION_PROFILE,
  ACTIVE_MOVE_ORDERING_PROFILE,
  ACTIVE_MPC_PROFILE,
  ACTIVE_TUPLE_RESIDUAL_PROFILE,
  DEFAULT_EVALUATION_PROFILE,
} from '../../js/ai/evaluation-profiles.js';
import { SearchEngine } from '../../js/ai/search-engine.js';
import { describeSearchAlgorithm, normalizeSearchAlgorithm } from '../../js/ai/search-algorithms.js';
import { GameState } from '../../js/core/game-state.js';
import { PLAYER_COLORS } from '../../js/core/rules.js';
import { createSeededRandom } from '../../js/test/benchmark-helpers.mjs';
import { TrineutronEngine } from './opponents/trineutron-engine.mjs';
import { formatInteger, loadJsonFileIfPresent, parseArgs } from '../evaluator-training/lib.mjs';

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/benchmark-vs-trineutron.mjs \
    [--output-json benchmarks/stage31_vs_trineutron.json] \
    [--variants active,phase-only,legacy[,custom]] \
    [--games 4] [--opening-plies 20] [--seed 1] \
    [--our-time-ms 100] [--their-time-ms 100] \
    [--our-max-depth 6] [--their-max-depth 18] \
    [--search-algorithm classic] [--aspiration-window 40] [--max-table-entries 180000] \
    [--exact-endgame-empties 10] \
    [--solver-adjudication-empties 14] [--solver-adjudication-time-ms 60000] \
    [--their-noise-scale 4] \
    [--variant-seed-mode shared|per-variant] \
    [--generated-module js/ai/learned-eval-profile.generated.js | --evaluation-json <file> [--move-ordering-json <file>] [--tuple-json <file>] [--mpc-json <file>]] \
    [--disable-move-ordering] [--disable-tuple] [--disable-mpc] \
    [--variant-label custom-candidate]

같은 시작 국면마다 색을 바꿔 두 번 대국해 흑/백 편향을 상쇄합니다.
opening-plies 기본값을 20으로 두어, 자사 엔진의 opening book 직접 사용 구간(12수)과 advisory 구간(18수)을 넘긴 뒤 중반부터 비교합니다.
solver-adjudication-empties 기본값은 14로, 그 시점부터는 trineutron을 더 두지 않고 우리 exact solver를 한 번만 호출해 승패를 판정합니다.
variant-seed-mode=shared 를 사용하면 여러 variant를 같은 실행에서 비교할 때도 opening/color별 상대 엔진 난수 시드를 공유해 보다 공정하게 비교할 수 있습니다.
`);
}

function toFiniteInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function parseVariantSeedMode(value) {
  return value === 'shared' ? 'shared' : 'per-variant';
}

function parseVariantList(value, { includeCustom = false } = {}) {
  const defaultVariants = includeCustom ? ['custom'] : ['active', 'phase-only', 'legacy'];
  if (typeof value !== 'string' || value.trim() === '') {
    return defaultVariants;
  }
  const allowed = new Set(['active', 'phase-only', 'legacy', ...(includeCustom ? ['custom'] : [])]);
  const parsed = value
    .split(',')
    .map((token) => token.trim())
    .filter((token) => allowed.has(token));
  return parsed.length > 0 ? [...new Set(parsed)] : defaultVariants;
}

function createOurEngineOptions({
  evaluationProfile,
  moveOrderingProfile,
  tupleResidualProfile,
  mpcProfile,
  timeLimitMs,
  maxDepth,
  exactEndgameEmpties,
  maxTableEntries = 180000,
  searchAlgorithm = 'classic',
  aspirationWindow = 40,
}) {
  return {
    presetKey: 'custom',
    styleKey: 'balanced',
    searchAlgorithm,
    maxDepth,
    timeLimitMs,
    exactEndgameEmpties,
    aspirationWindow,
    randomness: 0,
    maxTableEntries,
    evaluationProfile,
    moveOrderingProfile,
    tupleResidualProfile,
    mpcProfile,
    wldPreExactEmpties: 0,
  };
}

function createOpeningState(openingPlies, seed) {
  const random = createSeededRandom(seed);
  let state = GameState.initial();
  const moves = [];
  let guard = 0;

  while (!state.isTerminal() && moves.length < openingPlies) {
    const legalMoves = state.getLegalMoves().sort((left, right) => left.coord.localeCompare(right.coord));
    if (legalMoves.length === 0) {
      state = state.passTurn();
      moves.push(`${state.getOpponentColor(state.currentPlayer)}:pass`);
      guard += 1;
      if (guard > 120) {
        throw new Error('Opening generator exceeded guard while handling passes.');
      }
      continue;
    }

    const chosen = legalMoves[Math.floor(random() * legalMoves.length)] ?? legalMoves[0];
    moves.push(`${state.currentPlayer}:${chosen.coord}`);
    state = state.applyMove(chosen.index).state;
    guard += 1;
    if (guard > 120) {
      throw new Error('Opening generator exceeded guard.');
    }
  }

  return {
    state,
    openingMoves: moves,
    openingPliesCompleted: moves.length,
    openingSeed: seed,
  };
}

function discDiffForColor(state, color) {
  const counts = state.getDiscCounts();
  return color === PLAYER_COLORS.BLACK
    ? counts.black - counts.white
    : counts.white - counts.black;
}

function outcomeFromDiff(diff) {
  if (diff > 0) {
    return 'win';
  }
  if (diff < 0) {
    return 'loss';
  }
  return 'draw';
}

function createAggregate() {
  return {
    games: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    points: 0,
    discDiff: 0,
    totalPlayedPly: 0,
    totalOurTimeMs: 0,
    totalTheirTimeMs: 0,
    totalOurNodes: 0,
    totalTheirNodes: 0,
    exactAdjudications: 0,
    exactAdjudicationTimeMs: 0,
    exactAdjudicationNodes: 0,
  };
}

function updateAggregate(aggregate, game) {
  aggregate.games += 1;
  aggregate.totalPlayedPly += Number(game.playedPly ?? 0);
  aggregate.discDiff += Number(game.ourDiscDiff ?? 0);
  aggregate.totalOurTimeMs += Number(game.ourStats.totalElapsedMs ?? 0);
  aggregate.totalTheirTimeMs += Number(game.theirStats.totalElapsedMs ?? 0);
  aggregate.totalOurNodes += Number(game.ourStats.totalNodes ?? 0);
  aggregate.totalTheirNodes += Number(game.theirStats.totalNodes ?? 0);
  aggregate.exactAdjudications += Number(game.ourStats.exactAdjudications ?? 0);
  aggregate.exactAdjudicationTimeMs += Number(game.ourStats.exactAdjudicationElapsedMs ?? 0);
  aggregate.exactAdjudicationNodes += Number(game.ourStats.exactAdjudicationNodes ?? 0);

  if (game.outcome === 'win') {
    aggregate.wins += 1;
    aggregate.points += 1;
  } else if (game.outcome === 'loss') {
    aggregate.losses += 1;
  } else {
    aggregate.draws += 1;
    aggregate.points += 0.5;
  }
}

function finalizeAggregate(aggregate) {
  return {
    ...aggregate,
    scoreRate: aggregate.games > 0 ? aggregate.points / aggregate.games : 0,
    averageDiscDiff: aggregate.games > 0 ? aggregate.discDiff / aggregate.games : 0,
    averagePlayedPly: aggregate.games > 0 ? aggregate.totalPlayedPly / aggregate.games : 0,
    averageOurTimeMsPerGame: aggregate.games > 0 ? aggregate.totalOurTimeMs / aggregate.games : 0,
    averageTheirTimeMsPerGame: aggregate.games > 0 ? aggregate.totalTheirTimeMs / aggregate.games : 0,
    averageOurNodesPerGame: aggregate.games > 0 ? aggregate.totalOurNodes / aggregate.games : 0,
    averageTheirNodesPerGame: aggregate.games > 0 ? aggregate.totalTheirNodes / aggregate.games : 0,
    averageExactAdjudicationTimeMs: aggregate.exactAdjudications > 0 ? aggregate.exactAdjudicationTimeMs / aggregate.exactAdjudications : 0,
    averageExactAdjudicationNodes: aggregate.exactAdjudications > 0 ? aggregate.exactAdjudicationNodes / aggregate.exactAdjudications : 0,
  };
}

async function loadCustomVariantProfilesFromArgs(args) {
  const generatedModulePath = typeof args['generated-module'] === 'string' && args['generated-module'].trim() !== ''
    ? path.resolve(args['generated-module'])
    : null;
  let evaluationProfile = null;
  let moveOrderingProfile = null;
  let tupleResidualProfile = null;
  let mpcProfile = null;

  if (generatedModulePath) {
    const imported = await import(pathToFileURL(generatedModulePath).href);
    evaluationProfile = imported.GENERATED_EVALUATION_PROFILE ?? imported.default ?? null;
    moveOrderingProfile = imported.GENERATED_MOVE_ORDERING_PROFILE ?? null;
    tupleResidualProfile = imported.GENERATED_TUPLE_RESIDUAL_PROFILE ?? null;
    mpcProfile = imported.GENERATED_MPC_PROFILE ?? null;
  }

  const explicitEvaluation = loadJsonFileIfPresent(args['evaluation-json']);
  const explicitMoveOrdering = loadJsonFileIfPresent(args['move-ordering-json']);
  const explicitTuple = loadJsonFileIfPresent(args['tuple-json']);
  const explicitMpc = loadJsonFileIfPresent(args['mpc-json']);
  if (explicitEvaluation) {
    evaluationProfile = explicitEvaluation;
  }
  if (Object.hasOwn(args, 'move-ordering-json')) {
    moveOrderingProfile = explicitMoveOrdering;
  }
  if (Object.hasOwn(args, 'tuple-json')) {
    tupleResidualProfile = explicitTuple;
  }
  if (Object.hasOwn(args, 'mpc-json')) {
    mpcProfile = explicitMpc;
  }

  const disableMoveOrdering = Boolean(args['disable-move-ordering']);
  const disableTuple = Boolean(args['disable-tuple']);
  const disableMpc = Boolean(args['disable-mpc']);
  if (disableMoveOrdering) {
    moveOrderingProfile = null;
  }
  if (disableTuple) {
    tupleResidualProfile = null;
  }
  if (disableMpc) {
    mpcProfile = null;
  }

  if (!evaluationProfile && !moveOrderingProfile && !tupleResidualProfile && !mpcProfile) {
    return null;
  }

  const variantLabel = typeof args['variant-label'] === 'string' && args['variant-label'].trim() !== ''
    ? args['variant-label'].trim()
    : [
      evaluationProfile?.name ?? null,
      moveOrderingProfile?.name ?? ((Object.hasOwn(args, 'move-ordering-json') || disableMoveOrdering) ? 'no learned move-ordering' : null),
      tupleResidualProfile?.name ?? ((Object.hasOwn(args, 'tuple-json') || disableTuple) ? 'no tuple residual' : null),
      mpcProfile?.name ?? ((Object.hasOwn(args, 'mpc-json') || disableMpc) ? 'no mpc' : null),
    ].filter(Boolean).join(' / ');

  return {
    key: 'custom',
    label: variantLabel || 'custom-profile-set',
    evaluationProfile,
    moveOrderingProfile,
    tupleResidualProfile,
    mpcProfile,
    generatedModulePath,
    disabledFeatures: {
      moveOrdering: disableMoveOrdering,
      tupleResidual: disableTuple,
      mpc: disableMpc,
    },
  };
}

function createVariantDefinitions(config, { customVariant = null } = {}) {
  const active = {
    key: 'active',
    label: `active-generated+ordering (${ACTIVE_EVALUATION_PROFILE?.name ?? 'generated'} / ${ACTIVE_MOVE_ORDERING_PROFILE?.name ?? 'default'} / ${ACTIVE_TUPLE_RESIDUAL_PROFILE?.name ?? 'no tuple'} / ${ACTIVE_MPC_PROFILE?.name ?? 'no mpc'})`,
    createEngine(overrides = {}) {
      return new SearchEngine(createOurEngineOptions({
        evaluationProfile: ACTIVE_EVALUATION_PROFILE,
        moveOrderingProfile: ACTIVE_MOVE_ORDERING_PROFILE,
        tupleResidualProfile: ACTIVE_TUPLE_RESIDUAL_PROFILE,
        mpcProfile: ACTIVE_MPC_PROFILE,
        timeLimitMs: overrides.timeLimitMs ?? config.ourTimeMs,
        maxDepth: overrides.maxDepth ?? config.ourMaxDepth,
        exactEndgameEmpties: overrides.exactEndgameEmpties ?? config.exactEndgameEmpties,
        maxTableEntries: overrides.maxTableEntries ?? config.maxTableEntries,
        searchAlgorithm: overrides.searchAlgorithm ?? config.searchAlgorithm,
        aspirationWindow: overrides.aspirationWindow ?? config.aspirationWindow,
      }));
    },
  };

  const phaseOnly = {
    key: 'phase-only',
    label: `active-phase-only (${ACTIVE_EVALUATION_PROFILE?.name ?? 'generated'} / no learned move-ordering / no tuple residual / ${ACTIVE_MPC_PROFILE?.name ?? 'no mpc'})`,
    createEngine(overrides = {}) {
      return new SearchEngine(createOurEngineOptions({
        evaluationProfile: ACTIVE_EVALUATION_PROFILE,
        moveOrderingProfile: null,
        tupleResidualProfile: null,
        mpcProfile: ACTIVE_MPC_PROFILE,
        timeLimitMs: overrides.timeLimitMs ?? config.ourTimeMs,
        maxDepth: overrides.maxDepth ?? config.ourMaxDepth,
        exactEndgameEmpties: overrides.exactEndgameEmpties ?? config.exactEndgameEmpties,
        maxTableEntries: overrides.maxTableEntries ?? config.maxTableEntries,
        searchAlgorithm: overrides.searchAlgorithm ?? config.searchAlgorithm,
        aspirationWindow: overrides.aspirationWindow ?? config.aspirationWindow,
      }));
    },
  };

  const legacy = {
    key: 'legacy',
    label: `legacy-seed (${DEFAULT_EVALUATION_PROFILE.name} / no learned move-ordering / no tuple residual / no mpc)`,
    createEngine(overrides = {}) {
      return new SearchEngine(createOurEngineOptions({
        evaluationProfile: DEFAULT_EVALUATION_PROFILE,
        moveOrderingProfile: null,
        tupleResidualProfile: null,
        mpcProfile: null,
        timeLimitMs: overrides.timeLimitMs ?? config.ourTimeMs,
        maxDepth: overrides.maxDepth ?? config.ourMaxDepth,
        exactEndgameEmpties: overrides.exactEndgameEmpties ?? config.exactEndgameEmpties,
        maxTableEntries: overrides.maxTableEntries ?? config.maxTableEntries,
        searchAlgorithm: overrides.searchAlgorithm ?? config.searchAlgorithm,
        aspirationWindow: overrides.aspirationWindow ?? config.aspirationWindow,
      }));
    },
  };

  const variants = { active, 'phase-only': phaseOnly, legacy };
  if (customVariant) {
    variants.custom = {
      key: 'custom',
      label: customVariant.label,
      createEngine(overrides = {}) {
        return new SearchEngine(createOurEngineOptions({
          evaluationProfile: customVariant.evaluationProfile ?? ACTIVE_EVALUATION_PROFILE,
          moveOrderingProfile: Object.hasOwn(customVariant, 'moveOrderingProfile')
            ? customVariant.moveOrderingProfile
            : ACTIVE_MOVE_ORDERING_PROFILE,
          tupleResidualProfile: Object.hasOwn(customVariant, 'tupleResidualProfile')
            ? customVariant.tupleResidualProfile
            : ACTIVE_TUPLE_RESIDUAL_PROFILE,
          mpcProfile: Object.hasOwn(customVariant, 'mpcProfile')
            ? customVariant.mpcProfile
            : ACTIVE_MPC_PROFILE,
          timeLimitMs: overrides.timeLimitMs ?? config.ourTimeMs,
          maxDepth: overrides.maxDepth ?? config.ourMaxDepth,
          exactEndgameEmpties: overrides.exactEndgameEmpties ?? config.exactEndgameEmpties,
          maxTableEntries: overrides.maxTableEntries ?? config.maxTableEntries,
          searchAlgorithm: overrides.searchAlgorithm ?? config.searchAlgorithm,
          aspirationWindow: overrides.aspirationWindow ?? config.aspirationWindow,
        }));
      },
    };
  }

  return variants;
}

function searchWithEngine(engine, state, engineKey, seed) {
  if (engineKey === 'trineutron') {
    return engine.findBestMove(state, { seed });
  }
  return engine.findBestMove(state);
}

function normalizeMoveRecord(result, actor, color) {
  return {
    actor,
    color,
    bestMove: result.bestMoveCoord,
    bestMoveIndex: result.bestMoveIndex,
    score: result.score,
    elapsedMs: result.stats?.elapsedMs ?? null,
    nodes: result.stats?.nodes ?? null,
    completedDepth: result.stats?.completedDepth ?? null,
    searchCompletion: result.searchCompletion ?? null,
    searchMode: result.searchMode ?? null,
  };
}

function buildGameSeed(baseSeed, variantIndex, openingIndex, colorIndex, { variantSeedMode = 'per-variant' } = {}) {
  const variantSalt = variantSeedMode === 'shared' ? 0 : variantIndex;
  return (((baseSeed + 1) * 0x9E3779B1) ^ (variantSalt * 0x85EBCA6B) ^ (openingIndex * 0xC2B2AE35) ^ colorIndex) >>> 0;
}

function buildSearchSeed(gameSeed, ply) {
  return (gameSeed ^ Math.imul((ply + 1) >>> 0, 0x27D4EB2D)) >>> 0;
}

function exactDiscDiffFromResult(result, perspectiveColor, ourColor) {
  if (!Number.isFinite(result?.score)) {
    return null;
  }
  const signedScore = perspectiveColor === ourColor ? result.score : -result.score;
  return Math.round(signedScore / 10000);
}

function tryExactAdjudication({
  variant,
  state,
  ourColor,
  solverAdjudicationEmpties,
  solverAdjudicationTimeMs,
  solverAdjudicationMaxDepth,
}) {
  if (!(state instanceof GameState)) {
    throw new TypeError('tryExactAdjudication expects a GameState instance.');
  }

  if (!Number.isInteger(solverAdjudicationEmpties) || solverAdjudicationEmpties <= 0) {
    return null;
  }

  if (state.isTerminal() || state.getEmptyCount() > solverAdjudicationEmpties) {
    return null;
  }

  const exactEngine = variant.createEngine({
    timeLimitMs: solverAdjudicationTimeMs,
    maxDepth: solverAdjudicationMaxDepth,
    exactEndgameEmpties: solverAdjudicationEmpties,
    maxTableEntries: 260000,
  });
  const result = exactEngine.findBestMove(state);
  const searchCompletion = result.searchCompletion ?? 'unknown';
  const exactEnough = Boolean(result.isExactResult)
    || result.searchMode === 'terminal'
    || (searchCompletion === 'complete' && state.getEmptyCount() <= solverAdjudicationEmpties);

  if (!exactEnough || !Number.isFinite(result.score)) {
    return null;
  }

  const ourDiscDiff = exactDiscDiffFromResult(result, state.currentPlayer, ourColor);
  if (!Number.isFinite(ourDiscDiff)) {
    return null;
  }

  return {
    perspectiveColor: state.currentPlayer,
    empties: state.getEmptyCount(),
    score: result.score,
    ourDiscDiff,
    outcome: outcomeFromDiff(ourDiscDiff),
    bestMove: result.bestMoveCoord,
    searchMode: result.searchMode ?? null,
    searchCompletion,
    principalVariationLength: Array.isArray(result.principalVariation) ? result.principalVariation.length : 0,
    stats: {
      elapsedMs: Number(result.stats?.elapsedMs ?? 0),
      nodes: Number(result.stats?.nodes ?? 0),
      completedDepth: Number(result.stats?.completedDepth ?? 0),
      ttHits: Number(result.stats?.ttHits ?? 0),
    },
  };
}

function runSingleGame({
  startingState,
  openingSeed,
  openingMoves,
  ourVariant,
  ourColor,
  theirColor,
  theirTimeMs,
  theirMaxDepth,
  theirNoiseScale,
  solverAdjudicationEmpties,
  solverAdjudicationTimeMs,
  solverAdjudicationMaxDepth,
  gameSeed,
}) {
  let state = startingState.clone();
  const ourEngine = ourVariant.createEngine();
  const theirEngine = new TrineutronEngine({
    timeLimitMs: theirTimeMs,
    maxDepth: theirMaxDepth,
    noiseScale: theirNoiseScale,
    seed: buildSearchSeed(gameSeed, state.ply),
  });
  const moveLog = [];
  const ourStats = {
    totalElapsedMs: 0,
    totalNodes: 0,
    moveCount: 0,
    exactAdjudications: 0,
    exactAdjudicationElapsedMs: 0,
    exactAdjudicationNodes: 0,
  };
  const theirStats = {
    totalElapsedMs: 0,
    totalNodes: 0,
    moveCount: 0,
  };

  let guard = 0;
  while (!state.isTerminal()) {
    const adjudication = tryExactAdjudication({
      variant: ourVariant,
      state,
      ourColor,
      solverAdjudicationEmpties,
      solverAdjudicationTimeMs,
      solverAdjudicationMaxDepth,
    });
    if (adjudication) {
      ourStats.totalElapsedMs += adjudication.stats.elapsedMs;
      ourStats.totalNodes += adjudication.stats.nodes;
      ourStats.exactAdjudications += 1;
      ourStats.exactAdjudicationElapsedMs += adjudication.stats.elapsedMs;
      ourStats.exactAdjudicationNodes += adjudication.stats.nodes;
      return {
        openingSeed,
        openingMoves,
        ourVariantKey: ourVariant.key,
        ourVariantLabel: ourVariant.label,
        ourColor,
        theirColor,
        outcome: adjudication.outcome,
        ourDiscDiff: adjudication.ourDiscDiff,
        finalCounts: null,
        playedPly: state.ply - startingState.ply,
        moveLog,
        ourStats,
        theirStats,
        gameSeed,
        termination: 'exact-adjudication',
        adjudication,
      };
    }

    const legalMoves = state.getLegalMoves();
    if (legalMoves.length === 0) {
      moveLog.push({
        actor: state.currentPlayer === ourColor ? 'our-engine' : 'trineutron',
        color: state.currentPlayer,
        type: 'pass',
      });
      state = state.passTurn();
      guard += 1;
      if (guard > 200) {
        throw new Error('Match guard exceeded while passing.');
      }
      continue;
    }

    const actingOurEngine = state.currentPlayer === ourColor;
    const engineKey = actingOurEngine ? ourVariant.key : 'trineutron';
    const engine = actingOurEngine ? ourEngine : theirEngine;
    const result = searchWithEngine(engine, state, engineKey, buildSearchSeed(gameSeed, state.ply));

    if (!Number.isInteger(result.bestMoveIndex) || !state.isLegalMove(result.bestMoveIndex)) {
      throw new Error(`Illegal move from ${engineKey}: ${result.bestMoveCoord} (${result.bestMoveIndex})`);
    }

    moveLog.push(normalizeMoveRecord(
      result,
      actingOurEngine ? 'our-engine' : 'trineutron',
      state.currentPlayer,
    ));

    if (actingOurEngine) {
      ourStats.totalElapsedMs += Number(result.stats?.elapsedMs ?? 0);
      ourStats.totalNodes += Number(result.stats?.nodes ?? 0);
      ourStats.moveCount += 1;
    } else {
      theirStats.totalElapsedMs += Number(result.stats?.elapsedMs ?? 0);
      theirStats.totalNodes += Number(result.stats?.nodes ?? 0);
      theirStats.moveCount += 1;
    }

    state = state.applyMove(result.bestMoveIndex).state;
    guard += 1;
    if (guard > 200) {
      throw new Error('Match guard exceeded while applying moves.');
    }
  }

  const counts = state.getDiscCounts();
  const ourDiscDiff = discDiffForColor(state, ourColor);
  const outcome = outcomeFromDiff(ourDiscDiff);
  return {
    openingSeed,
    openingMoves,
    ourVariantKey: ourVariant.key,
    ourVariantLabel: ourVariant.label,
    ourColor,
    theirColor,
    outcome,
    ourDiscDiff,
    finalCounts: counts,
    playedPly: state.ply - startingState.ply,
    moveLog,
    ourStats,
    theirStats,
    gameSeed,
    termination: 'played-out',
    adjudication: null,
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const customVariant = await loadCustomVariantProfilesFromArgs(args);
const variantsToRun = parseVariantList(args.variants, { includeCustom: Boolean(customVariant) });
const games = Math.max(1, toFiniteInteger(args.games, 4));
const openingPlies = Math.max(0, toFiniteInteger(args['opening-plies'], 20));
const seed = Math.max(1, toFiniteInteger(args.seed, 1));
const ourTimeMs = Math.max(10, toFiniteInteger(args['our-time-ms'], 100));
const theirTimeMs = Math.max(10, toFiniteInteger(args['their-time-ms'], 100));
const ourMaxDepth = Math.max(1, toFiniteInteger(args['our-max-depth'], 6));
const theirMaxDepth = Math.max(1, toFiniteInteger(args['their-max-depth'], 18));
const searchAlgorithm = normalizeSearchAlgorithm(args['search-algorithm'] ?? 'classic');
const aspirationWindow = Math.max(0, toFiniteInteger(args['aspiration-window'], 40));
const maxTableEntries = Math.max(1000, toFiniteInteger(args['max-table-entries'], 180000));
const exactEndgameEmpties = Math.max(0, toFiniteInteger(args['exact-endgame-empties'], 10));
const solverAdjudicationEmpties = Math.max(0, toFiniteInteger(args['solver-adjudication-empties'], 14));
const solverAdjudicationTimeMs = Math.max(1000, toFiniteInteger(args['solver-adjudication-time-ms'], 60000));
const solverAdjudicationMaxDepth = Math.max(
  Math.max(1, ourMaxDepth),
  toFiniteInteger(args['solver-adjudication-max-depth'], Math.max(ourMaxDepth, solverAdjudicationEmpties)),
);
const theirNoiseScale = Math.max(0, toFiniteInteger(args['their-noise-scale'], 4));
const variantSeedMode = parseVariantSeedMode(args['variant-seed-mode']);
const outputJsonPath = args['output-json'] ? path.resolve(args['output-json']) : null;

const config = {
  ourTimeMs,
  theirTimeMs,
  ourMaxDepth,
  theirMaxDepth,
  searchAlgorithm,
  aspirationWindow,
  maxTableEntries,
  exactEndgameEmpties,
  solverAdjudicationEmpties,
  solverAdjudicationTimeMs,
  solverAdjudicationMaxDepth,
  theirNoiseScale,
  variantSeedMode,
};

const variantDefinitions = createVariantDefinitions(config, { customVariant });
const openings = [];
let openingSeedCursor = seed;
while (openings.length < games) {
  const opening = createOpeningState(openingPlies, openingSeedCursor);
  if (!opening.state.isTerminal() && opening.state.getLegalMoves().length > 0) {
    openings.push(opening);
  }
  openingSeedCursor += 1;
}

console.log(`Opening plies       : ${openingPlies}`);
console.log(`Opening seed range  : ${seed}..${openingSeedCursor - 1}`);
const searchAlgorithmLabel = describeSearchAlgorithm(searchAlgorithm)?.label ?? searchAlgorithm;
console.log(`Our search          : ${searchAlgorithm} (${searchAlgorithmLabel}), aspiration=${aspirationWindow}, table=${maxTableEntries}`);
console.log(`Our engine time     : ${ourTimeMs}ms, depth=${ourMaxDepth}, exactEndgameEmpties=${exactEndgameEmpties}`);
console.log(`Solver adjudication : empties<=${solverAdjudicationEmpties ? solverAdjudicationEmpties : 'disabled'}, time=${solverAdjudicationTimeMs}ms, depth=${solverAdjudicationMaxDepth}`);
console.log(`Trineutron time     : ${theirTimeMs}ms, depth=${theirMaxDepth}, noiseScale=${theirNoiseScale}`);
console.log(`Variant seed mode   : ${variantSeedMode}`);
console.log(`Variants            : ${variantsToRun.join(', ')}`);
if (customVariant) {
  console.log(`Custom profiles     : eval=${customVariant.evaluationProfile?.name ?? 'none'}, ordering=${customVariant.moveOrderingProfile?.name ?? 'none'}, tuple=${customVariant.tupleResidualProfile?.name ?? 'none'}, mpc=${customVariant.mpcProfile?.name ?? 'none'}`);
  if (customVariant.generatedModulePath) {
    console.log(`Custom module path  : ${customVariant.generatedModulePath}`);
  }
}
console.log(`Games per variant   : ${games} openings x 2 colors = ${games * 2}`);

const summaries = [];
for (let variantIndex = 0; variantIndex < variantsToRun.length; variantIndex += 1) {
  const variantKey = variantsToRun[variantIndex];
  const variant = variantDefinitions[variantKey];
  if (!variant) {
    continue;
  }

  console.log(`\n[variant: ${variant.label}]`);
  const aggregate = createAggregate();
  const byColor = {
    black: createAggregate(),
    white: createAggregate(),
  };
  const gameResults = [];

  for (let openingIndex = 0; openingIndex < openings.length; openingIndex += 1) {
    const opening = openings[openingIndex];
    const blackGame = runSingleGame({
      startingState: opening.state,
      openingSeed: opening.openingSeed,
      openingMoves: opening.openingMoves,
      ourVariant: variant,
      ourColor: PLAYER_COLORS.BLACK,
      theirColor: PLAYER_COLORS.WHITE,
      theirTimeMs,
      theirMaxDepth,
      theirNoiseScale,
      solverAdjudicationEmpties,
      solverAdjudicationTimeMs,
      solverAdjudicationMaxDepth,
      gameSeed: buildGameSeed(seed, variantIndex, openingIndex, 0, { variantSeedMode }),
    });
    const whiteGame = runSingleGame({
      startingState: opening.state,
      openingSeed: opening.openingSeed,
      openingMoves: opening.openingMoves,
      ourVariant: variant,
      ourColor: PLAYER_COLORS.WHITE,
      theirColor: PLAYER_COLORS.BLACK,
      theirTimeMs,
      theirMaxDepth,
      theirNoiseScale,
      solverAdjudicationEmpties,
      solverAdjudicationTimeMs,
      solverAdjudicationMaxDepth,
      gameSeed: buildGameSeed(seed, variantIndex, openingIndex, 1, { variantSeedMode }),
    });

    for (const game of [blackGame, whiteGame]) {
      updateAggregate(aggregate, game);
      updateAggregate(byColor[game.ourColor], game);
      gameResults.push(game);
      console.log(
        `opening#${String(openingIndex + 1).padStart(2, '0')} ${game.ourColor.padEnd(5)} `
        + `${game.outcome.padEnd(4)} diff=${String(game.ourDiscDiff).padStart(3, ' ')} `
        + `our ${formatInteger(game.ourStats.totalNodes)}n/${formatInteger(game.ourStats.totalElapsedMs)}ms `
        + `vs tri ${formatInteger(game.theirStats.totalNodes)}n/${formatInteger(game.theirStats.totalElapsedMs)}ms `
        + `[${game.termination}]`,
      );
    }
  }

  const summary = {
    variantKey,
    variantLabel: variant.label,
    aggregate: finalizeAggregate(aggregate),
    byColor: {
      black: finalizeAggregate(byColor.black),
      white: finalizeAggregate(byColor.white),
    },
    games: gameResults,
  };
  summaries.push(summary);

  console.log(`score: ${summary.aggregate.points}/${summary.aggregate.games} (${(summary.aggregate.scoreRate * 100).toFixed(1)}%)`);
  console.log(`W-L-D: ${summary.aggregate.wins}-${summary.aggregate.losses}-${summary.aggregate.draws}`);
  console.log(`avg disc diff: ${summary.aggregate.averageDiscDiff.toFixed(2)}`);
  console.log(`exact adjudications: ${summary.aggregate.exactAdjudications}/${summary.aggregate.games}`);
}

const output = {
  generatedAt: new Date().toISOString(),
  benchmark: 'stage31-trineutron-match-suite',
  opponent: {
    name: 'trineutron/othello',
    repo: 'https://github.com/trineutron/othello',
    site: 'https://trineutron.github.io/othello/',
    timeLimitMs: theirTimeMs,
    maxDepth: theirMaxDepth,
    noiseScale: theirNoiseScale,
    solverAdjudicationEmpties,
    solverAdjudicationTimeMs,
    solverAdjudicationMaxDepth,
  },
  customVariant: customVariant ? {
    label: customVariant.label,
    evaluationProfileName: customVariant.evaluationProfile?.name ?? null,
    moveOrderingProfileName: customVariant.moveOrderingProfile?.name ?? null,
    tupleResidualProfileName: customVariant.tupleResidualProfile?.name ?? null,
    mpcProfileName: customVariant.mpcProfile?.name ?? null,
    generatedModulePath: customVariant.generatedModulePath ?? null,
    disabledFeatures: customVariant.disabledFeatures ?? {
      moveOrdering: false,
      tupleResidual: false,
      mpc: false,
    },
  } : null,
  options: {
    variants: variantsToRun,
    games,
    openingPlies,
    seed,
    searchAlgorithm,
    aspirationWindow,
    maxTableEntries,
    ourTimeMs,
    ourMaxDepth,
    exactEndgameEmpties,
    solverAdjudicationEmpties,
    solverAdjudicationTimeMs,
    solverAdjudicationMaxDepth,
    theirTimeMs,
    theirMaxDepth,
    theirNoiseScale,
    variantSeedMode,
  },
  openings: openings.map((opening) => ({
    openingSeed: opening.openingSeed,
    openingPliesCompleted: opening.openingPliesCompleted,
    openingMoves: opening.openingMoves,
    currentPlayer: opening.state.currentPlayer,
    empties: opening.state.getEmptyCount(),
  })),
  variants: summaries,
};

if (outputJsonPath) {
  await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
  await fs.promises.writeFile(outputJsonPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\nSaved benchmark summary to ${outputJsonPath}`);
}
