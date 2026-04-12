import { SearchEngine } from '../../js/ai/search-engine.js';

const EXACT_INFINITY = 10 ** 9;

function now() {
  if (typeof globalThis.performance?.now === 'function') {
    return globalThis.performance.now();
  }
  return Date.now();
}

function toFiniteInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

export function createExactSearchOptions({
  evaluationProfile,
  moveOrderingProfile,
  timeLimitMs = 60_000,
  maxDepth = 12,
  exactEndgameEmpties = 14,
} = {}) {
  return {
    presetKey: 'custom',
    styleKey: 'balanced',
    maxDepth: Math.max(1, toFiniteInteger(maxDepth, 12)),
    timeLimitMs: Math.max(1_000, toFiniteInteger(timeLimitMs, 60_000)),
    exactEndgameEmpties: Math.max(0, toFiniteInteger(exactEndgameEmpties, 14)),
    aspirationWindow: 0,
    randomness: 0,
    evaluationProfile,
    moveOrderingProfile,
    optimizedFewEmptiesExactSolver: true,
    specializedFewEmptiesExactSolver: true,
    exactFastestFirstOrdering: true,
    enhancedTranspositionCutoff: true,
    enhancedTranspositionCutoffWld: true,
    wldPreExactEmpties: 0,
  };
}

function prepareEngineForDirectExactSearch(engine) {
  engine.resetStats();
  engine.searchGeneration += 1;
  engine.trimTranspositionTable();
  engine.deadlineMs = now() + (engine.options?.timeLimitMs ?? 60_000);
}

export function renderBoardAscii(state) {
  const rows = [];
  for (let row = 7; row >= 0; row -= 1) {
    const cells = [];
    for (let col = 0; col < 8; col += 1) {
      const index = (row * 8) + col;
      const occupant = state.getCellOccupant(index);
      cells.push(occupant === 'black' ? 'B' : occupant === 'white' ? 'W' : '.');
    }
    rows.push(`${row + 1} ${cells.join(' ')}`);
  }
  rows.push('  A B C D E F G H');
  return rows;
}

export function runExactRootSearch(state, {
  evaluationProfile,
  moveOrderingProfile,
  timeLimitMs = 60_000,
  maxDepth = 12,
  exactEndgameEmpties = 14,
} = {}) {
  const engine = new SearchEngine(createExactSearchOptions({
    evaluationProfile,
    moveOrderingProfile,
    timeLimitMs,
    maxDepth,
    exactEndgameEmpties,
  }));
  return engine.findBestMove(state);
}

export function scoreExactRootMoves(state, {
  evaluationProfile,
  moveOrderingProfile,
  moveCoords = null,
  timeLimitMs = 60_000,
  maxDepth = 12,
  exactEndgameEmpties = 14,
} = {}) {
  const legalMoves = state.getLegalMoves();
  const legalMoveByCoord = new Map(legalMoves.map((move) => [move.coord, move]));
  const requestedCoords = Array.isArray(moveCoords) && moveCoords.length > 0
    ? [...new Set(moveCoords.map((coord) => String(coord ?? '').trim().toUpperCase()).filter(Boolean))]
    : legalMoves.map((move) => move.coord);

  const engine = new SearchEngine(createExactSearchOptions({
    evaluationProfile,
    moveOrderingProfile,
    timeLimitMs,
    maxDepth,
    exactEndgameEmpties,
  }));
  prepareEngineForDirectExactSearch(engine);

  const scoredMoves = [];
  for (const coord of requestedCoords) {
    const move = legalMoveByCoord.get(coord);
    if (!move) {
      continue;
    }
    const outcome = state.applyMoveFast(move.index, move.flips ?? null);
    if (!outcome) {
      continue;
    }
    const childResult = engine.negamax(
      outcome,
      Math.max(0, (engine.options?.maxDepth ?? maxDepth) - 1),
      -EXACT_INFINITY,
      EXACT_INFINITY,
      1,
      true,
    );
    scoredMoves.push({
      coord: move.coord,
      index: move.index,
      exactScore: -childResult.score,
      flipCount: move.flipCount,
    });
  }

  scoredMoves.sort((left, right) => {
    if (right.exactScore !== left.exactScore) {
      return right.exactScore - left.exactScore;
    }
    return left.index - right.index;
  });
  return scoredMoves;
}

function toSearchSummary(resultOrSummary) {
  if (!resultOrSummary) {
    return {
      bestMove: null,
      score: null,
    };
  }
  return {
    bestMove: resultOrSummary.bestMoveCoord ?? resultOrSummary.bestMove ?? null,
    score: resultOrSummary.score ?? null,
  };
}

export function auditExactBestMoveTieSwap(state, {
  evaluationProfile,
  referenceProfile = null,
  candidateProfile = null,
  referenceSummary = null,
  candidateSummary = null,
  verificationProfile = null,
  timeLimitMs = 60_000,
  maxDepth = 12,
  exactEndgameEmpties = 14,
  enumerateAllLegalMoves = false,
} = {}) {
  const reference = toSearchSummary(referenceSummary ?? runExactRootSearch(state, {
    evaluationProfile,
    moveOrderingProfile: referenceProfile,
    timeLimitMs,
    maxDepth,
    exactEndgameEmpties,
  }));
  const candidate = toSearchSummary(candidateSummary ?? runExactRootSearch(state, {
    evaluationProfile,
    moveOrderingProfile: candidateProfile,
    timeLimitMs,
    maxDepth,
    exactEndgameEmpties,
  }));

  const sameScore = reference.score === candidate.score;
  const sameBestMove = reference.bestMove === candidate.bestMove;
  const legalMoves = state.getLegalMoves().map((move) => move.coord);
  const verificationMoveCoords = enumerateAllLegalMoves
    ? legalMoves
    : [...new Set([reference.bestMove, candidate.bestMove].filter(Boolean))];

  const scoredMoves = sameScore && !sameBestMove
    ? scoreExactRootMoves(state, {
      evaluationProfile,
      moveOrderingProfile: verificationProfile ?? candidateProfile ?? referenceProfile,
      moveCoords: verificationMoveCoords,
      timeLimitMs,
      maxDepth,
      exactEndgameEmpties,
    })
    : [];
  const scoredMoveByCoord = new Map(scoredMoves.map((entry) => [entry.coord, entry]));
  const optimalMoves = scoredMoves
    .filter((entry) => entry.exactScore === reference.score)
    .map((entry) => entry.coord);

  const referenceVerified = reference.bestMove
    ? scoredMoveByCoord.get(reference.bestMove)?.exactScore === reference.score
    : false;
  const candidateVerified = candidate.bestMove
    ? scoredMoveByCoord.get(candidate.bestMove)?.exactScore === reference.score
    : false;

  return {
    sameScore,
    sameBestMove,
    sharedScore: sameScore ? reference.score : null,
    reference: reference,
    candidate: candidate,
    legalMoves,
    verifiedTieSwap: sameScore && !sameBestMove && referenceVerified && candidateVerified,
    referenceVerified,
    candidateVerified,
    optimalMoves,
    scoredMoves,
    state: state.toSerializable(),
    boardAscii: renderBoardAscii(state),
  };
}
