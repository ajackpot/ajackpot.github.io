import {
  C_SQUARE_INDICES,
  X_SQUARE_INDICES,
  indexToCoord,
  popcount,
} from '../core/bitboard.js';

const RISKY_ESCAPE_INDEX_FLAGS = new Uint8Array(64);
for (const index of X_SQUARE_INDICES) {
  RISKY_ESCAPE_INDEX_FLAGS[index] = 1;
}
for (const index of C_SQUARE_INDICES) {
  RISKY_ESCAPE_INDEX_FLAGS[index] = 1;
}

export const DEFAULT_SPECIAL_ENDING_PENALTY_PROFILE = Object.freeze({
  singleDiscPenalty: 210_000,
  doubleDiscPenalty: 110_000,
  tripleDiscPenalty: 60_000,
  tightSafeResponsePenalty: 70_000,
  narrowSafeResponsePenalty: 35_000,
  forcedWipeoutPenalty: 120_000,
  immediateTrapPenalty: 12_000,
  riskySafeResponsePenalty: 6_000,
});

function defaultCoordForMove(move) {
  if (!move) {
    return null;
  }
  if (move.isPass === true) {
    return 'pass';
  }
  if (typeof move.coord === 'string' && move.coord.length > 0) {
    return move.coord;
  }
  return Number.isInteger(move.index) ? indexToCoord(move.index) : null;
}

function maybeCheckDeadline(checkDeadline, index, interval) {
  if (typeof checkDeadline !== 'function') {
    return;
  }
  const normalizedInterval = Number.isInteger(interval) && interval > 0 ? interval : 0;
  if (normalizedInterval === 0 || (index % normalizedInterval) === 0) {
    checkDeadline();
  }
}

export function isRiskyEscapeIndex(index) {
  return Number.isInteger(index) && RISKY_ESCAPE_INDEX_FLAGS[index] === 1;
}

export function moveProducesImmediateWipeout(opponentBoard, move) {
  return typeof opponentBoard === 'bigint'
    && typeof move?.flips === 'bigint'
    && move.flips !== 0n
    && (opponentBoard & ~move.flips) === 0n;
}

export function countDiscsForColor(state, color) {
  if (!state) {
    return 0;
  }
  return popcount(color === 'black' ? state.black : state.white);
}

export function isWorseSpecialEndingReply(candidate, incumbent) {
  if (!candidate) {
    return false;
  }
  if (!incumbent) {
    return true;
  }
  if ((candidate.ourDiscCount ?? Infinity) !== (incumbent.ourDiscCount ?? Infinity)) {
    return (candidate.ourDiscCount ?? Infinity) < (incumbent.ourDiscCount ?? Infinity);
  }
  if ((candidate.safeResponses ?? Infinity) !== (incumbent.safeResponses ?? Infinity)) {
    return (candidate.safeResponses ?? Infinity) < (incumbent.safeResponses ?? Infinity);
  }
  if ((candidate.safeRiskyResponses ?? 0) !== (incumbent.safeRiskyResponses ?? 0)) {
    return (candidate.safeRiskyResponses ?? 0) > (incumbent.safeRiskyResponses ?? 0);
  }
  if ((candidate.immediateTrapResponses ?? 0) !== (incumbent.immediateTrapResponses ?? 0)) {
    return (candidate.immediateTrapResponses ?? 0) > (incumbent.immediateTrapResponses ?? 0);
  }
  return (candidate.responseCount ?? Infinity) < (incumbent.responseCount ?? Infinity);
}

export function computeSpecialEndingPenalty(
  summary,
  penaltyProfile = DEFAULT_SPECIAL_ENDING_PENALTY_PROFILE,
) {
  if (!summary) {
    return 0;
  }

  const normalizedProfile = {
    ...DEFAULT_SPECIAL_ENDING_PENALTY_PROFILE,
    ...(penaltyProfile ?? {}),
  };

  const ourDiscCount = summary.ourDiscCount ?? Infinity;
  const safeResponses = summary.safeResponses ?? Infinity;
  const responseCount = summary.responseCount ?? 0;
  const immediateTrapResponses = summary.immediateTrapResponses ?? 0;
  const safeRiskyResponses = summary.safeRiskyResponses ?? 0;

  let penalty = 0;

  if (ourDiscCount <= 1) {
    penalty += normalizedProfile.singleDiscPenalty;
  } else if (ourDiscCount <= 2) {
    penalty += normalizedProfile.doubleDiscPenalty;
  } else if (ourDiscCount <= 3) {
    penalty += normalizedProfile.tripleDiscPenalty;
  }

  if (safeResponses <= 2) {
    penalty += normalizedProfile.tightSafeResponsePenalty;
  } else if (safeResponses <= 3) {
    penalty += normalizedProfile.narrowSafeResponsePenalty;
  }

  if (responseCount > 0 && safeResponses === 0) {
    penalty += normalizedProfile.forcedWipeoutPenalty;
  }

  penalty += immediateTrapResponses * normalizedProfile.immediateTrapPenalty;
  penalty += safeRiskyResponses * normalizedProfile.riskySafeResponsePenalty;

  const severeDiscCollapse = ourDiscCount <= 1 && safeResponses <= 3;
  const severeSafeMoveSqueeze = ourDiscCount <= 2 && safeResponses <= 2;
  const forcedImmediateLoss = responseCount > 0 && safeResponses === 0;

  return (severeDiscCollapse || severeSafeMoveSqueeze || forcedImmediateLoss)
    ? penalty
    : 0;
}

export function analyzeSpecialEndingReply(
  afterMove,
  reply,
  rootColor,
  options = {},
) {
  const {
    listMoves = (state) => state.getLegalMoves(),
    coordForMove = defaultCoordForMove,
    riskyEscapePredicate = isRiskyEscapeIndex,
    checkDeadline = null,
    deadlineCheckInterval = 0,
    onResponseState = null,
    onOpponentReplyState = null,
  } = options;

  const afterReply = afterMove?.applyMoveFast(reply?.index, reply?.flips ?? null);
  if (!afterReply) {
    return null;
  }

  const responses = listMoves(afterReply);
  const responseMoves = responses.length > 0
    ? responses
    : (afterReply.isTerminal() ? [] : [{ index: null, coord: 'pass', flips: null, isPass: true }]);

  let safeResponses = 0;
  let immediateTrapResponses = 0;
  let safeRiskyResponses = 0;

  for (let responseIndex = 0; responseIndex < responseMoves.length; responseIndex += 1) {
    maybeCheckDeadline(checkDeadline, responseIndex, deadlineCheckInterval);
    onResponseState?.(responseMoves[responseIndex], responseIndex);

    const response = responseMoves[responseIndex];
    const afterResponse = response.isPass === true
      ? afterReply.passTurnFast()
      : afterReply.applyMoveFast(response.index, response.flips ?? null);
    if (!afterResponse) {
      continue;
    }

    const opponentReplies = listMoves(afterResponse);
    let opponentCanImmediateWipeout = false;

    for (let opponentReplyIndex = 0; opponentReplyIndex < opponentReplies.length; opponentReplyIndex += 1) {
      maybeCheckDeadline(checkDeadline, opponentReplyIndex, deadlineCheckInterval);
      onOpponentReplyState?.(opponentReplies[opponentReplyIndex], opponentReplyIndex);

      const opponentReply = opponentReplies[opponentReplyIndex];
      const afterOpponentReply = afterResponse.applyMoveFast(
        opponentReply.index,
        opponentReply.flips ?? null,
      );
      if (!afterOpponentReply) {
        continue;
      }
      if (countDiscsForColor(afterOpponentReply, rootColor) === 0) {
        opponentCanImmediateWipeout = true;
        break;
      }
    }

    if (opponentCanImmediateWipeout) {
      immediateTrapResponses += 1;
    } else {
      safeResponses += 1;
      if (response.isPass !== true && riskyEscapePredicate(response.index)) {
        safeRiskyResponses += 1;
      }
    }
  }

  return {
    replyIndex: reply?.index ?? null,
    replyCoord: coordForMove(reply),
    ourDiscCount: countDiscsForColor(afterReply, rootColor),
    responseCount: responseMoves.length,
    safeResponses,
    immediateTrapResponses,
    safeRiskyResponses,
  };
}

export function analyzeSpecialEndingMove(
  state,
  move,
  options = {},
) {
  const {
    rootColor = state?.currentPlayer,
    listMoves = (position) => position.getLegalMoves(),
    coordForMove = defaultCoordForMove,
    penaltyProfile = DEFAULT_SPECIAL_ENDING_PENALTY_PROFILE,
    checkDeadline = null,
    deadlineCheckInterval = 0,
    onReplyState = null,
    onResponseState = null,
    onOpponentReplyState = null,
  } = options;

  const afterMove = state?.applyMoveFast(move?.index, move?.flips ?? null);
  if (!afterMove) {
    return null;
  }

  const opponentReplies = listMoves(afterMove);
  if (opponentReplies.length === 0) {
    return {
      penalty: 0,
      rootMoveIndex: move?.index ?? null,
      rootMoveCoord: coordForMove(move),
      rootColor,
      opponentReplyCount: 0,
      worstReply: null,
    };
  }

  let worstReply = null;
  for (let replyIndex = 0; replyIndex < opponentReplies.length; replyIndex += 1) {
    maybeCheckDeadline(checkDeadline, replyIndex, deadlineCheckInterval);
    onReplyState?.(opponentReplies[replyIndex], replyIndex);

    const summary = analyzeSpecialEndingReply(afterMove, opponentReplies[replyIndex], rootColor, {
      listMoves,
      coordForMove,
      checkDeadline,
      deadlineCheckInterval,
      onResponseState,
      onOpponentReplyState,
    });
    if (isWorseSpecialEndingReply(summary, worstReply)) {
      worstReply = summary;
    }
  }

  return {
    penalty: computeSpecialEndingPenalty(worstReply, penaltyProfile),
    rootMoveIndex: move?.index ?? null,
    rootMoveCoord: coordForMove(move),
    rootColor,
    opponentReplyCount: opponentReplies.length,
    worstReply,
  };
}
