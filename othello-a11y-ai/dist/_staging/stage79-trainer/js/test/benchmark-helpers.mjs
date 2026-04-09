import assert from 'node:assert/strict';
import { GameState } from '../core/game-state.js';
import { SearchEngine } from '../ai/search-engine.js';

export function createSeededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

export function playSeededRandomUntilEmptyCount(targetEmptyCount, seed) {
  const random = createSeededRandom(seed);
  let current = GameState.initial();
  let guard = 0;

  while (!current.isTerminal() && current.getEmptyCount() > targetEmptyCount) {
    const legalMoves = current.getLegalMoves().sort((left, right) => left.coord.localeCompare(right.coord));
    current = legalMoves.length === 0
      ? current.passTurn()
      : current.applyMove(legalMoves[Math.floor(random() * legalMoves.length)].index).state;

    guard += 1;
    assert.ok(guard < 200, 'Seeded playout should not loop forever.');
  }

  return current;
}

export function classifyOutcomeFromScore(score) {
  if (score > 0) {
    return 'win';
  }
  if (score < 0) {
    return 'loss';
  }
  return 'draw';
}

export function summarizeResult(result, state, seed = null, extra = {}) {
  return {
    seed,
    currentPlayer: state.currentPlayer,
    empties: state.getEmptyCount(),
    legalMoves: state.getLegalMoves().length,
    bestMove: result.bestMoveCoord,
    score: result.score,
    outcome: classifyOutcomeFromScore(result.score),
    mode: result.searchMode ?? null,
    completion: result.searchCompletion ?? null,
    exact: Boolean(result.isExactResult),
    wld: Boolean(result.isWldResult),
    completedDepth: result.stats?.completedDepth ?? null,
    elapsedMs: result.stats?.elapsedMs ?? null,
    nodes: result.stats?.nodes ?? null,
    ttHits: result.stats?.ttHits ?? null,
    ttFirstSearches: result.stats?.ttFirstSearches ?? null,
    ttFirstCutoffs: result.stats?.ttFirstCutoffs ?? null,
    etcNodes: result.stats?.etcNodes ?? null,
    etcChildTableHits: result.stats?.etcChildTableHits ?? null,
    etcQualifiedBounds: result.stats?.etcQualifiedBounds ?? null,
    etcNarrowings: result.stats?.etcNarrowings ?? null,
    etcCutoffs: result.stats?.etcCutoffs ?? null,
    etcExactNodes: result.stats?.etcExactNodes ?? null,
    etcExactChildTableHits: result.stats?.etcExactChildTableHits ?? null,
    etcExactQualifiedBounds: result.stats?.etcExactQualifiedBounds ?? null,
    etcExactNarrowings: result.stats?.etcExactNarrowings ?? null,
    etcExactCutoffs: result.stats?.etcExactCutoffs ?? null,
    etcWldNodes: result.stats?.etcWldNodes ?? null,
    etcWldChildTableHits: result.stats?.etcWldChildTableHits ?? null,
    etcWldQualifiedBounds: result.stats?.etcWldQualifiedBounds ?? null,
    etcWldNarrowings: result.stats?.etcWldNarrowings ?? null,
    etcWldCutoffs: result.stats?.etcWldCutoffs ?? null,
    wldNodes: result.stats?.wldNodes ?? null,
    wldTtHits: result.stats?.wldTtHits ?? null,
    smallSolverCalls: result.stats?.smallSolverCalls ?? null,
    smallSolverNodes: result.stats?.smallSolverNodes ?? null,
    specializedFewEmptiesCalls: result.stats?.specializedFewEmptiesCalls ?? null,
    specializedFewEmpties1Calls: result.stats?.specializedFewEmpties1Calls ?? null,
    specializedFewEmpties2Calls: result.stats?.specializedFewEmpties2Calls ?? null,
    specializedFewEmpties3Calls: result.stats?.specializedFewEmpties3Calls ?? null,
    specializedFewEmpties4Calls: result.stats?.specializedFewEmpties4Calls ?? null,
    fastestFirstExactSorts: result.stats?.fastestFirstExactSorts ?? null,
    fastestFirstExactPassCandidates: result.stats?.fastestFirstExactPassCandidates ?? null,
    wldSmallSolverCalls: result.stats?.wldSmallSolverCalls ?? null,
    wldSmallSolverNodes: result.stats?.wldSmallSolverNodes ?? null,
    wldPreExactEmpties: result.options?.wldPreExactEmpties ?? null,
    exactFastestFirstOrdering: result.options?.exactFastestFirstOrdering ?? null,
    enhancedTranspositionCutoff: result.options?.enhancedTranspositionCutoff ?? null,
    enhancedTranspositionCutoffWld: result.options?.enhancedTranspositionCutoffWld ?? null,
    mpcProfileName: result.options?.mpcProfile?.name ?? null,
    mpcProbes: result.stats?.mpcProbes ?? null,
    mpcHighProbes: result.stats?.mpcHighProbes ?? null,
    mpcHighCutoffs: result.stats?.mpcHighCutoffs ?? null,
    mpcLowProbes: result.stats?.mpcLowProbes ?? null,
    mpcLowCutoffs: result.stats?.mpcLowCutoffs ?? null,
    ...extra,
  };
}

function compareSamples(left, right) {
  const elapsedLeft = Number(left.summary.elapsedMs ?? Number.POSITIVE_INFINITY);
  const elapsedRight = Number(right.summary.elapsedMs ?? Number.POSITIVE_INFINITY);
  if (elapsedLeft !== elapsedRight) {
    return elapsedLeft - elapsedRight;
  }

  const nodesLeft = Number(left.summary.nodes ?? Number.POSITIVE_INFINITY);
  const nodesRight = Number(right.summary.nodes ?? Number.POSITIVE_INFINITY);
  if (nodesLeft !== nodesRight) {
    return nodesLeft - nodesRight;
  }

  return 0;
}

export function runMedianSearch(state, options, repetitions = 3) {
  const samples = [];
  for (let index = 0; index < repetitions; index += 1) {
    const engine = new SearchEngine(options);
    const result = engine.findBestMove(state);
    samples.push({
      result,
      summary: summarizeResult(result, state),
    });
  }

  const sortedSamples = [...samples].sort(compareSamples);
  const chosen = sortedSamples[Math.floor(sortedSamples.length / 2)] ?? sortedSamples[0];
  return {
    result: chosen.result,
    summary: chosen.summary,
    samples: samples.map((sample) => sample.summary),
  };
}

export function sumBy(items, key) {
  return items.reduce((sum, item) => sum + Number(item?.[key] ?? 0), 0);
}
