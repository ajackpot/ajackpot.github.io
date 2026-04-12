import {
  CORNER_INDICES,
  indexToCoord,
} from '../core/bitboard.js';
import {
  analyzeSpecialEndingMove,
  moveProducesImmediateWipeout,
} from './special-endings.js';

const CORNER_INDEX_FLAGS = new Uint8Array(64);
for (const index of CORNER_INDICES) {
  CORNER_INDEX_FLAGS[index] = 1;
}

function isCornerIndex(index) {
  return Number.isInteger(index) && CORNER_INDEX_FLAGS[index] === 1;
}

const DEFAULT_MCTS_LITE_EXPLORATION = 1.35;
const DEFAULT_MCTS_LITE_MAX_ITERATIONS = 200000;
const DEFAULT_MCTS_LITE_MAX_TREE_NODES = 120000;
const DEFAULT_MCTS_GUIDED_PRIOR_VIRTUAL_VISITS = 1.5;
const DEFAULT_MCTS_GUIDED_PROGRESSIVE_BIAS = 0.4;
const DEFAULT_MCTS_GUIDED_EXPANSION_EPSILON = 0.08;
const DEFAULT_MCTS_GUIDED_EXPANSION_TOP_K = 2;
const DEFAULT_MCTS_GUIDED_ROLLOUT_CUTOFF_PLIES = 16;
const DEFAULT_MCTS_GUIDED_ROLLOUT_EPSILON = 0.14;
const DEFAULT_MCTS_GUIDED_ROLLOUT_TOP_K = 2;
const DEFAULT_MCTS_GUIDED_VALUE_WEIGHT = 0.8;
const DEFAULT_MCTS_GUIDED_ORDERING_WEIGHT = 0.55;
const DEFAULT_MCTS_GUIDED_OPENING_PRIOR_WEIGHT = 0.45;
const DEFAULT_MCTS_HYBRID_PRIOR_VIRTUAL_VISITS = 2.0;
const DEFAULT_MCTS_HYBRID_PROGRESSIVE_BIAS = 0.45;
const DEFAULT_MCTS_HYBRID_MINIMAX_REWARD_WEIGHT = 0.55;
const DEFAULT_MCTS_HYBRID_MINIMAX_POLICY_BLEND = 0.12;
const DEFAULT_MCTS_HYBRID_MINIMAX_DEPTH_LOW_TIME = 1;
const DEFAULT_MCTS_HYBRID_MINIMAX_DEPTH = 2;
const DEFAULT_MCTS_HYBRID_MINIMAX_TOP_K_LOW_DEPTH = 3;
const DEFAULT_MCTS_HYBRID_MINIMAX_TOP_K = 4;
const DEFAULT_MCTS_PROOF_PRIORITY_SCALE = 0;
const DEFAULT_MCTS_PROOF_PRIORITY_BIAS_MODE = 'rank';
const DEFAULT_MCTS_PROOF_PRIORITY_ROOT_MATURITY_GATE_MODE = 'best-metric-lte-1-or-solved-child';
const DEFAULT_MCTS_PROOF_PRIORITY_ROOT_MATURITY_GATE_METRIC_MODE = 'per-player';
const DEFAULT_MCTS_PROOF_PRIORITY_ROOT_MATURITY_GATE_BIAS_MODE = 'pnmax';
const DEFAULT_MCTS_PROOF_PRIORITY_ROOT_MATURITY_GATE_MIN_VISITS = 0;
const DEFAULT_MCTS_PROOF_PRIORITY_ROOT_MATURITY_GATE_BEST_FINITE_METRIC_THRESHOLD = 1;
const DEFAULT_MCTS_PROOF_PRIORITY_ROOT_MATURITY_GATE_REQUIRE_NO_SOLVED_CHILD = false;
const DEFAULT_MCTS_PROOF_PRIORITY_ROOT_MATURITY_GATE_MIN_DISTINCT_FINITE_METRIC_COUNT = 0;
const DEFAULT_MCTS_SCORE_BOUND_DRAW_PRIORITY_SCALE = 0.35;
const MAX_MCTS_PROOF_NUMBER = 1_000_000_000;
const GUIDED_VALUE_REWARD_SCALE = 90000;
const GUIDED_ORDERING_POLICY_SCALE = 140000;
const GUIDED_OPENING_PRIOR_SCALE = 35000;
const GUIDED_OPENING_PRIOR_MAX_PLY = 24;
const HYBRID_MINIMAX_REWARD_SCALE = 90000;
const SCORE_SCALE = 10000;
const MIN_SCORE_BOUND = -64 * SCORE_SCALE;
const MAX_SCORE_BOUND = 64 * SCORE_SCALE;
const FLOAT_EPSILON = 1e-9;
const ROLLOUT_DEADLINE_CHECK_INTERVAL = 8;
const HYBRID_MINIMAX_DEADLINE_CHECK_INTERVAL = 6;
const PRINCIPAL_VARIATION_LIMIT = 8;
const CANDIDATE_DEADLINE_CHECK_INTERVAL = 4;
const MCTS_IMMEDIATE_WIPEOUT_MAX_EMPTIES = 40;
const MCTS_ROOT_THREAT_MAX_EMPTIES = 40;
const ROOT_THREAT_DEADLINE_CHECK_INTERVAL = 4;
const ROOT_THREAT_TRAVERSAL_PENALTY_SCALE = 0.85;
const ROOT_THREAT_REWARD_SCALE = 180000;
const ROOT_THREAT_POLICY_SCALE = 120000;
const SOLVED_OUTCOME_ORDER = Object.freeze({
  loss: -1,
  draw: 0,
  win: 1,
});
const PLAYER_COLORS = Object.freeze(['black', 'white']);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isPlayerColor(color) {
  return color === 'black' || color === 'white';
}

function opponentColor(color) {
  return color === 'white' ? 'black' : 'white';
}

function createPerPlayerProofNumbers(initialValue = 1) {
  const normalized = Number.isFinite(initialValue) ? initialValue : 1;
  return {
    black: normalized,
    white: normalized,
  };
}

function normalizePrincipalVariation(principalVariation) {
  if (!Array.isArray(principalVariation) || principalVariation.length === 0) {
    return [];
  }

  const normalized = [];
  for (const moveIndex of principalVariation) {
    if (!Number.isInteger(moveIndex)) {
      continue;
    }
    normalized.push(moveIndex);
    if (normalized.length >= PRINCIPAL_VARIATION_LIMIT) {
      break;
    }
  }
  return normalized;
}

function areMoveIndexSequencesEqual(left, right) {
  const leftSequence = Array.isArray(left) ? left : [];
  const rightSequence = Array.isArray(right) ? right : [];
  if (leftSequence.length !== rightSequence.length) {
    return false;
  }
  for (let index = 0; index < leftSequence.length; index += 1) {
    if (leftSequence[index] !== rightSequence[index]) {
      return false;
    }
  }
  return true;
}

function rewardToScore(reward) {
  const normalized = Number.isFinite(reward)
    ? clamp(reward, -1, 1)
    : 0;
  return Math.round(normalized * SCORE_SCALE);
}

function boundedTanh(value, scale = 1) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const normalizedScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return Math.tanh(value / normalizedScale);
}

function resolveHybridMinimaxDepth(options = {}) {
  const explicit = Number(options.mctsHybridMinimaxDepth);
  if (Number.isFinite(explicit)) {
    return clamp(Math.round(explicit), 1, 3);
  }

  const timeLimitMs = Number(options.timeLimitMs);
  if (Number.isFinite(timeLimitMs) && timeLimitMs > 0 && timeLimitMs < 130) {
    return DEFAULT_MCTS_HYBRID_MINIMAX_DEPTH_LOW_TIME;
  }

  return DEFAULT_MCTS_HYBRID_MINIMAX_DEPTH;
}

function resolveHybridMinimaxTopK(options = {}, depth = DEFAULT_MCTS_HYBRID_MINIMAX_DEPTH) {
  const explicit = Number(options.mctsHybridMinimaxTopK);
  if (Number.isFinite(explicit)) {
    return clamp(Math.round(explicit), 1, 8);
  }

  return depth <= 1
    ? DEFAULT_MCTS_HYBRID_MINIMAX_TOP_K_LOW_DEPTH
    : DEFAULT_MCTS_HYBRID_MINIMAX_TOP_K;
}

function normalizeMctsOptions(options = {}, variant = 'lite') {
  const exploration = Number.isFinite(Number(options.mctsExploration))
    ? clamp(Number(options.mctsExploration), 0.1, 4)
    : DEFAULT_MCTS_LITE_EXPLORATION;
  const maxIterations = Number.isFinite(Number(options.mctsMaxIterations))
    ? Math.max(1, Math.round(Number(options.mctsMaxIterations)))
    : DEFAULT_MCTS_LITE_MAX_ITERATIONS;
  const maxTreeNodes = Number.isFinite(Number(options.mctsMaxNodes))
    ? Math.max(64, Math.round(Number(options.mctsMaxNodes)))
    : DEFAULT_MCTS_LITE_MAX_TREE_NODES;
  const solverExactEmpties = Number.isFinite(Number(options.exactEndgameEmpties))
    ? Math.max(0, Math.round(Number(options.exactEndgameEmpties)))
    : 0;
  const solverWldEmpties = Number.isFinite(Number(options.mctsSolverWldEmpties))
    ? Math.max(0, Math.round(Number(options.mctsSolverWldEmpties)))
    : 0;
  const useSolver = typeof options.solveState === 'function' && options.mctsSolverEnabled !== false;
  const useScoreBounds = useSolver && options.mctsScoreBoundsEnabled === true;
  const solverMaxEmpties = solverExactEmpties + solverWldEmpties;
  const proofPriorityScale = Number.isFinite(Number(options.mctsProofPriorityScale))
    ? clamp(Number(options.mctsProofPriorityScale), 0, 5)
    : DEFAULT_MCTS_PROOF_PRIORITY_SCALE;
  const useProofPriority = useSolver
    && options.mctsProofPriorityEnabled !== false
    && proofPriorityScale > 0;
  const proofMetricMode = resolveProofMetricMode(options.mctsProofMetricMode);
  const proofPriorityBiasMode = resolveProofPriorityBiasMode(options.mctsProofPriorityBiasMode);
  const proofPriorityRootMaturityGateEnabled = useProofPriority && options.mctsProofPriorityRootMaturityGateEnabled === true;
  const proofPriorityRootMaturityGateMode = resolveProofPriorityRootMaturityGateMode(options.mctsProofPriorityRootMaturityGateMode);
  const proofPriorityRootMaturityGateMetricMode = resolveProofMetricMode(
    options.mctsProofPriorityRootMaturityGateMetricMode ?? DEFAULT_MCTS_PROOF_PRIORITY_ROOT_MATURITY_GATE_METRIC_MODE,
  );
  const proofPriorityRootMaturityGateBiasMode = resolveProofPriorityBiasMode(
    options.mctsProofPriorityRootMaturityGateBiasMode ?? DEFAULT_MCTS_PROOF_PRIORITY_ROOT_MATURITY_GATE_BIAS_MODE,
  );
  const proofPriorityRootMaturityGateMinVisits = Number.isFinite(Number(options.mctsProofPriorityRootMaturityGateMinVisits))
    ? Math.max(0, Math.round(Number(options.mctsProofPriorityRootMaturityGateMinVisits)))
    : DEFAULT_MCTS_PROOF_PRIORITY_ROOT_MATURITY_GATE_MIN_VISITS;
  const proofPriorityRootMaturityGateBestFiniteMetricThreshold = Number.isFinite(Number(options.mctsProofPriorityRootMaturityGateBestFiniteMetricThreshold))
    ? Math.max(0, Math.round(Number(options.mctsProofPriorityRootMaturityGateBestFiniteMetricThreshold)))
    : DEFAULT_MCTS_PROOF_PRIORITY_ROOT_MATURITY_GATE_BEST_FINITE_METRIC_THRESHOLD;
  const proofPriorityRootMaturityGateRequireNoSolvedChild = options.mctsProofPriorityRootMaturityGateRequireNoSolvedChild === true;
  const proofPriorityRootMaturityGateMinDistinctFiniteMetricCount = Number.isFinite(Number(options.mctsProofPriorityRootMaturityGateMinDistinctFiniteMetricCount))
    ? Math.max(0, Math.round(Number(options.mctsProofPriorityRootMaturityGateMinDistinctFiniteMetricCount)))
    : DEFAULT_MCTS_PROOF_PRIORITY_ROOT_MATURITY_GATE_MIN_DISTINCT_FINITE_METRIC_COUNT;
  const proofPriorityMaxEmpties = useProofPriority
    ? (Number.isFinite(Number(options.mctsProofPriorityMaxEmpties))
      ? Math.max(0, Math.round(Number(options.mctsProofPriorityMaxEmpties)))
      : solverMaxEmpties)
    : 0;
  const scoreBoundDrawPriorityScale = Number.isFinite(Number(options.mctsScoreBoundDrawPriorityScale))
    ? clamp(Number(options.mctsScoreBoundDrawPriorityScale), 0, 5)
    : DEFAULT_MCTS_SCORE_BOUND_DRAW_PRIORITY_SCALE;
  const useScoreBoundDrawPriority = useScoreBounds
    && scoreBoundDrawPriorityScale > 0;
  const scoreBoundDrawPriorityMaxEmpties = useScoreBoundDrawPriority
    ? (proofPriorityMaxEmpties > 0 ? proofPriorityMaxEmpties : solverMaxEmpties)
    : 0;

  if (variant === 'guided') {
    return {
      variant: 'guided',
      exploration,
      maxIterations,
      maxTreeNodes,
      priorVirtualVisits: DEFAULT_MCTS_GUIDED_PRIOR_VIRTUAL_VISITS,
      progressiveBiasScale: DEFAULT_MCTS_GUIDED_PROGRESSIVE_BIAS,
      guidedExpansionEpsilon: DEFAULT_MCTS_GUIDED_EXPANSION_EPSILON,
      guidedExpansionTopK: DEFAULT_MCTS_GUIDED_EXPANSION_TOP_K,
      guidedRolloutCutoffPlies: DEFAULT_MCTS_GUIDED_ROLLOUT_CUTOFF_PLIES,
      guidedRolloutEpsilon: DEFAULT_MCTS_GUIDED_ROLLOUT_EPSILON,
      guidedRolloutTopK: DEFAULT_MCTS_GUIDED_ROLLOUT_TOP_K,
      guidedValueWeight: DEFAULT_MCTS_GUIDED_VALUE_WEIGHT,
      guidedOrderingWeight: DEFAULT_MCTS_GUIDED_ORDERING_WEIGHT,
      guidedOpeningPriorWeight: DEFAULT_MCTS_GUIDED_OPENING_PRIOR_WEIGHT,
      useOpeningPrior: typeof options.lookupOpeningPrior === 'function',
      useGuidedSelection: true,
      useGuidedRollout: true,
      useGuidedPrior: true,
      useHybridMinimaxPrior: false,
      hybridMinimaxDepth: 0,
      hybridMinimaxTopK: 0,
      hybridMinimaxRewardWeight: 0,
      hybridMinimaxPolicyBlend: 0,
      useSolver,
      useScoreBounds,
      solverExactEmpties,
      solverWldEmpties,
      solverMaxEmpties,
      useProofPriority,
      proofPriorityScale,
      proofPriorityMaxEmpties,
      useScoreBoundDrawPriority,
      scoreBoundDrawPriorityScale,
      scoreBoundDrawPriorityMaxEmpties,
      proofMetricMode,
      proofPriorityBiasMode,
      proofPriorityRootMaturityGateEnabled,
      proofPriorityRootMaturityGateMode,
      proofPriorityRootMaturityGateMetricMode,
      proofPriorityRootMaturityGateBiasMode,
      proofPriorityRootMaturityGateMinVisits,
      proofPriorityRootMaturityGateBestFiniteMetricThreshold,
      proofPriorityRootMaturityGateRequireNoSolvedChild,
      proofPriorityRootMaturityGateMinDistinctFiniteMetricCount,
    };
  }

  if (variant === 'hybrid') {
    const hybridMinimaxDepth = resolveHybridMinimaxDepth(options);
    const hybridMinimaxTopK = resolveHybridMinimaxTopK(options, hybridMinimaxDepth);
    return {
      variant: 'hybrid',
      exploration,
      maxIterations,
      maxTreeNodes,
      priorVirtualVisits: DEFAULT_MCTS_HYBRID_PRIOR_VIRTUAL_VISITS,
      progressiveBiasScale: DEFAULT_MCTS_HYBRID_PROGRESSIVE_BIAS,
      guidedExpansionEpsilon: DEFAULT_MCTS_GUIDED_EXPANSION_EPSILON,
      guidedExpansionTopK: DEFAULT_MCTS_GUIDED_EXPANSION_TOP_K,
      guidedRolloutCutoffPlies: DEFAULT_MCTS_GUIDED_ROLLOUT_CUTOFF_PLIES,
      guidedRolloutEpsilon: DEFAULT_MCTS_GUIDED_ROLLOUT_EPSILON,
      guidedRolloutTopK: DEFAULT_MCTS_GUIDED_ROLLOUT_TOP_K,
      guidedValueWeight: DEFAULT_MCTS_GUIDED_VALUE_WEIGHT,
      guidedOrderingWeight: DEFAULT_MCTS_GUIDED_ORDERING_WEIGHT,
      guidedOpeningPriorWeight: DEFAULT_MCTS_GUIDED_OPENING_PRIOR_WEIGHT,
      useOpeningPrior: typeof options.lookupOpeningPrior === 'function',
      useGuidedSelection: true,
      useGuidedRollout: true,
      useGuidedPrior: true,
      useHybridMinimaxPrior: true,
      hybridMinimaxDepth,
      hybridMinimaxTopK,
      hybridMinimaxRewardWeight: DEFAULT_MCTS_HYBRID_MINIMAX_REWARD_WEIGHT,
      hybridMinimaxPolicyBlend: DEFAULT_MCTS_HYBRID_MINIMAX_POLICY_BLEND,
      useSolver,
      useScoreBounds,
      solverExactEmpties,
      solverWldEmpties,
      solverMaxEmpties,
      useProofPriority,
      proofPriorityScale,
      proofPriorityMaxEmpties,
      useScoreBoundDrawPriority,
      scoreBoundDrawPriorityScale,
      scoreBoundDrawPriorityMaxEmpties,
      proofMetricMode,
      proofPriorityBiasMode,
      proofPriorityRootMaturityGateEnabled,
      proofPriorityRootMaturityGateMode,
      proofPriorityRootMaturityGateMetricMode,
      proofPriorityRootMaturityGateBiasMode,
      proofPriorityRootMaturityGateMinVisits,
      proofPriorityRootMaturityGateBestFiniteMetricThreshold,
      proofPriorityRootMaturityGateRequireNoSolvedChild,
      proofPriorityRootMaturityGateMinDistinctFiniteMetricCount,
    };
  }

  return {
    variant: 'lite',
    exploration,
    maxIterations,
    maxTreeNodes,
    priorVirtualVisits: 0,
    progressiveBiasScale: 0,
    guidedExpansionEpsilon: 1,
    guidedExpansionTopK: 1,
    guidedRolloutCutoffPlies: Number.POSITIVE_INFINITY,
    guidedRolloutEpsilon: 1,
    guidedRolloutTopK: 1,
    guidedValueWeight: 1,
    guidedOrderingWeight: 1,
    guidedOpeningPriorWeight: 0,
    useOpeningPrior: false,
    useGuidedSelection: false,
    useGuidedRollout: false,
    useGuidedPrior: false,
    useHybridMinimaxPrior: false,
    hybridMinimaxDepth: 0,
    hybridMinimaxTopK: 0,
    hybridMinimaxRewardWeight: 0,
    hybridMinimaxPolicyBlend: 0,
    useSolver,
    useScoreBounds,
    solverExactEmpties,
    solverWldEmpties,
    solverMaxEmpties,
    useProofPriority,
    proofPriorityScale,
    proofPriorityMaxEmpties,
    useScoreBoundDrawPriority,
    scoreBoundDrawPriorityScale,
    scoreBoundDrawPriorityMaxEmpties,
    proofMetricMode,
    proofPriorityBiasMode,
    proofPriorityRootMaturityGateEnabled,
    proofPriorityRootMaturityGateMode,
    proofPriorityRootMaturityGateMetricMode,
    proofPriorityRootMaturityGateBiasMode,
  };
}


function buildRootThreatPenaltyRecord(summary) {
  const rawPenalty = summary?.penalty ?? 0;
  if (!(rawPenalty > 0)) {
    return null;
  }

  const rewardPenalty = boundedTanh(rawPenalty, ROOT_THREAT_REWARD_SCALE);
  const policyPenalty = boundedTanh(rawPenalty, ROOT_THREAT_POLICY_SCALE);
  return {
    rawPenalty,
    rewardPenalty,
    policyPenalty,
    scorePenalty: rewardToScore(rewardPenalty),
    worstReply: summary?.worstReply ?? null,
  };
}

function collectRootThreatPenalties(state, legalMoves, rootPlayer, checkDeadline = null, stats = null) {
  const penalties = new Map();
  if (!state || !Array.isArray(legalMoves) || legalMoves.length === 0) {
    return penalties;
  }
  if (typeof state.getEmptyCount === 'function' && state.getEmptyCount() > MCTS_ROOT_THREAT_MAX_EMPTIES) {
    return penalties;
  }

  for (let moveIndex = 0; moveIndex < legalMoves.length; moveIndex += 1) {
    if (checkDeadline && (moveIndex % ROOT_THREAT_DEADLINE_CHECK_INTERVAL) === 0) {
      checkDeadline();
    }

    const move = legalMoves[moveIndex];
    if (stats) {
      stats.mctsRootThreatScans += 1;
    }

    const summary = analyzeSpecialEndingMove(state, move, {
      rootColor: rootPlayer,
      listMoves: (position) => position.getSearchMoves(),
      checkDeadline,
      deadlineCheckInterval: ROOT_THREAT_DEADLINE_CHECK_INTERVAL,
    });
    if (!summary || (summary.opponentReplyCount ?? 0) === 0) {
      continue;
    }

    const penalty = buildRootThreatPenaltyRecord(summary);
    if (penalty) {
      penalties.set(move.index, {
        ...penalty,
        moveIndex: move.index,
        moveCoord: move.coord ?? indexToCoord(move.index),
        opponentReplyCount: summary.opponentReplyCount,
      });
      if (stats) {
        stats.mctsRootThreatHits += 1;
      }
    }
  }

  return penalties;
}

function scoreTerminalStateForRoot(state, rootPlayer) {
  if (!state) {
    return 0;
  }
  return rewardToScore(clamp(state.getDiscDifferential(rootPlayer) / 64, -1, 1));
}

function findBestImmediateWipeoutOption(state, legalMoves, rootPlayer, checkDeadline = null) {
  if (!state || !Array.isArray(legalMoves) || legalMoves.length === 0) {
    return null;
  }
  if (typeof state.getEmptyCount === 'function' && state.getEmptyCount() > MCTS_IMMEDIATE_WIPEOUT_MAX_EMPTIES) {
    return null;
  }

  const { opponent } = state.getPlayerBoards();
  const moverColor = state.currentPlayer;
  const moverIsRoot = moverColor === rootPlayer;
  let best = null;

  for (let index = 0; index < legalMoves.length; index += 1) {
    if (checkDeadline && (index % CANDIDATE_DEADLINE_CHECK_INTERVAL) === 0) {
      checkDeadline();
    }

    const move = legalMoves[index];
    if (!moveProducesImmediateWipeout(opponent, move)) {
      continue;
    }

    const childState = state.applyMoveFast(move.index, move.flips ?? null);
    if (!childState) {
      continue;
    }

    const rootReward = clamp(childState.getDiscDifferential(rootPlayer) / 64, -1, 1);
    const moverReward = moverIsRoot ? rootReward : -rootReward;
    if (
      !best
      || moverReward > (best.moverReward ?? -Infinity) + FLOAT_EPSILON
      || (
        Math.abs(moverReward - (best.moverReward ?? -Infinity)) <= FLOAT_EPSILON
        && (
          rootReward > (best.rootReward ?? -Infinity) + FLOAT_EPSILON
          || (
            Math.abs(rootReward - (best.rootReward ?? -Infinity)) <= FLOAT_EPSILON
            && compareNodeIdentity(move, best.move) < 0
          )
        )
      )
    ) {
      best = {
        move,
        childState,
        legalMoveArrayIndex: index,
        rootReward,
        moverReward,
      };
    }
  }

  return best;
}

function removeMoveFromLegalMoves(legalMoves, selectedMove, preferredIndex = null) {
  if (!Array.isArray(legalMoves) || !selectedMove) {
    return -1;
  }

  const removalIndex = Number.isInteger(preferredIndex)
    && preferredIndex >= 0
    && preferredIndex < legalMoves.length
    && legalMoves[preferredIndex]?.index === selectedMove.index
      ? preferredIndex
      : legalMoves.findIndex((move) => move.index === selectedMove.index);
  if (removalIndex >= 0) {
    legalMoves.splice(removalIndex, 1);
  }
  return removalIndex;
}

function isTimeoutError(error) {
  return error instanceof Error && error.name === 'SearchTimeoutError';
}

function nodeSolvedReward(node) {
  return Number.isFinite(node?.solvedReward)
    ? clamp(node.solvedReward, -1, 1)
    : null;
}

function solvedOutcomeRank(outcome) {
  return SOLVED_OUTCOME_ORDER[outcome] ?? 0;
}

function meanReward(node) {
  const solvedReward = nodeSolvedReward(node);
  if (solvedReward !== null) {
    return solvedReward;
  }
  return node.visits > 0 ? (node.valueSum / node.visits) : 0;
}

function effectiveVisits(node) {
  return (node?.visits ?? 0) + Math.max(0, Number(node?.priorVirtualVisits ?? 0));
}

function effectiveMeanReward(node) {
  const solvedReward = nodeSolvedReward(node);
  if (solvedReward !== null) {
    return solvedReward;
  }

  const totalVisits = effectiveVisits(node);
  if (totalVisits <= 0) {
    return 0;
  }
  return ((node?.valueSum ?? 0) + ((node?.priorReward ?? 0) * (node?.priorVirtualVisits ?? 0))) / totalVisits;
}

function normalizeDecisionState(state) {
  let current = state;
  let forcedPasses = 0;

  while (!current.isTerminal()) {
    const legalMoves = current.getSearchMoves();
    if (legalMoves.length > 0) {
      return {
        state: current,
        legalMoves,
        forcedPasses,
      };
    }
    current = current.passTurnFast();
    forcedPasses += 1;
  }

  return {
    state: current,
    legalMoves: [],
    forcedPasses,
  };
}

function createMctsNode(state, legalMoves, forcedPasses = 0, edge = null, prior = null) {
  return {
    state,
    legalMoves,
    forcedPasses,
    moveIndex: Number.isInteger(edge?.index) ? edge.index : null,
    moveCoord: edge?.coord ?? (Number.isInteger(edge?.index) ? indexToCoord(edge.index) : null),
    flipCount: Number.isFinite(edge?.flipCount) ? edge.flipCount : null,
    visits: 0,
    valueSum: 0,
    priorReward: clamp(Number.isFinite(prior?.priorReward) ? prior.priorReward : 0, -1, 1),
    priorPolicy: clamp(Number.isFinite(prior?.priorPolicy) ? prior.priorPolicy : 0, -1, 1),
    priorVirtualVisits: Math.max(0, Number.isFinite(prior?.priorVirtualVisits) ? prior.priorVirtualVisits : 0),
    hybridPriorReward: Number.isFinite(prior?.hybridPriorReward) ? prior.hybridPriorReward : null,
    hybridPriorScore: Number.isFinite(prior?.hybridPriorScore) ? prior.hybridPriorScore : null,
    solvedOutcome: null,
    solvedReward: null,
    solvedScore: null,
    solvedBucket: null,
    solvedSource: null,
    solvedExact: false,
    solvedPrincipalVariation: [],
    proofNumber: 1,
    disproofNumber: 1,
    proofNumbersByPlayer: createPerPlayerProofNumbers(1),
    scoreLowerBound: MIN_SCORE_BOUND,
    scoreUpperBound: MAX_SCORE_BOUND,
    children: [],
  };
}

function createNodeFromNormalized(normalized, edge = null, prior = null) {
  return createMctsNode(
    normalized.state,
    normalized.legalMoves,
    normalized.forcedPasses,
    edge,
    prior,
  );
}

function createRootNode(state, legalMoves) {
  return createMctsNode(state, [...legalMoves], 0, null, null);
}

function compareNodeIdentity(left, right) {
  const leftIndex = Number.isInteger(left?.moveIndex ?? left?.index) ? (left.moveIndex ?? left.index) : Number.POSITIVE_INFINITY;
  const rightIndex = Number.isInteger(right?.moveIndex ?? right?.index) ? (right.moveIndex ?? right.index) : Number.POSITIVE_INFINITY;
  if (leftIndex !== rightIndex) {
    return leftIndex - rightIndex;
  }
  return String(left?.moveCoord ?? left?.coord ?? '').localeCompare(String(right?.moveCoord ?? right?.coord ?? ''));
}

function buildSolvedPrincipalVariationFromChild(child) {
  const principalVariation = [];
  if (Number.isInteger(child?.moveIndex)) {
    principalVariation.push(child.moveIndex);
  }
  if (Array.isArray(child?.solvedPrincipalVariation)) {
    for (const moveIndex of child.solvedPrincipalVariation) {
      if (!Number.isInteger(moveIndex) || principalVariation.length >= PRINCIPAL_VARIATION_LIMIT) {
        break;
      }
      principalVariation.push(moveIndex);
    }
  }
  return principalVariation;
}

function createTerminalSolvedRecord(state, rootPlayer) {
  const discDifferential = state.getDiscDifferential(rootPlayer);
  const reward = clamp(discDifferential / 64, -1, 1);
  return {
    outcome: reward > 0 ? 'win' : (reward < 0 ? 'loss' : 'draw'),
    reward,
    score: discDifferential * SCORE_SCALE,
    bucket: 'terminal',
    source: 'terminal',
    exact: true,
    principalVariation: [],
  };
}

function setSolvedFields(node, solved, stats = null) {
  if (!node || !solved) {
    return false;
  }

  const nextOutcome = solved.outcome === 'win' || solved.outcome === 'loss'
    ? solved.outcome
    : 'draw';
  const nextReward = clamp(
    Number.isFinite(solved.reward)
      ? solved.reward
      : (nextOutcome === 'win' ? 1 : (nextOutcome === 'loss' ? -1 : 0)),
    -1,
    1,
  );
  const nextScore = Number.isFinite(solved.score)
    ? solved.score
    : rewardToScore(nextReward);
  const nextBucket = typeof solved.bucket === 'string'
    ? solved.bucket
    : (solved.exact ? 'exact' : 'wld');
  const nextSource = typeof solved.source === 'string'
    ? solved.source
    : nextBucket;
  const nextExact = Boolean(solved.exact);
  const nextPrincipalVariation = normalizePrincipalVariation(solved.principalVariation);

  const changed = node.solvedOutcome !== nextOutcome
    || node.solvedReward !== nextReward
    || node.solvedScore !== nextScore
    || node.solvedBucket !== nextBucket
    || node.solvedSource !== nextSource
    || node.solvedExact !== nextExact
    || !areMoveIndexSequencesEqual(node.solvedPrincipalVariation, nextPrincipalVariation);
  if (!changed) {
    return false;
  }

  node.solvedOutcome = nextOutcome;
  node.solvedReward = nextReward;
  node.solvedScore = nextScore;
  node.solvedBucket = nextBucket;
  node.solvedSource = nextSource;
  node.solvedExact = nextExact;
  node.solvedPrincipalVariation = nextPrincipalVariation;
  if (stats) {
    stats.mctsSolverNodeSolves += 1;
  }
  return true;
}

function getWinnerColorFromSolvedOutcome(outcome, rootPlayer) {
  if (outcome === 'win') {
    return rootPlayer;
  }
  if (outcome === 'loss') {
    return opponentColor(rootPlayer);
  }
  return null;
}

function getPerPlayerProofNumber(node, player) {
  if (!isPlayerColor(player)) {
    return normalizeProofNumberValue(1);
  }
  return normalizeProofNumberValue(node?.proofNumbersByPlayer?.[player] ?? 1);
}

function setPerPlayerProofNumbers(node, nextProofNumbersByPlayer, stats = null) {
  if (!node) {
    return false;
  }

  const nextBlack = normalizeProofNumberValue(nextProofNumbersByPlayer?.black ?? 1);
  const nextWhite = normalizeProofNumberValue(nextProofNumbersByPlayer?.white ?? 1);
  const current = node.proofNumbersByPlayer ?? createPerPlayerProofNumbers(1);
  const changed = current.black !== nextBlack || current.white !== nextWhite;
  if (!changed) {
    return false;
  }

  node.proofNumbersByPlayer = {
    black: nextBlack,
    white: nextWhite,
  };
  if (stats) {
    stats.mctsGeneralizedProofNumberUpdates += 1;
  }
  return true;
}

function refreshPerPlayerProofNumbers(node, rootPlayer, stats = null) {
  if (!node) {
    return false;
  }

  if (node.solvedOutcome !== null) {
    const winnerColor = getWinnerColorFromSolvedOutcome(node.solvedOutcome, rootPlayer);
    return setPerPlayerProofNumbers(node, {
      black: winnerColor === 'black' ? 0 : MAX_MCTS_PROOF_NUMBER,
      white: winnerColor === 'white' ? 0 : MAX_MCTS_PROOF_NUMBER,
    }, stats);
  }

  if (!Array.isArray(node.children) || node.children.length === 0) {
    return setPerPlayerProofNumbers(node, createPerPlayerProofNumbers(1), stats);
  }

  const unexpandedChildCount = Array.isArray(node.legalMoves) ? node.legalMoves.length : 0;
  const nextProofNumbersByPlayer = createPerPlayerProofNumbers(MAX_MCTS_PROOF_NUMBER);

  for (const player of PLAYER_COLORS) {
    const isOrNode = node.state?.currentPlayer === player;
    let proofNumber = isOrNode ? MAX_MCTS_PROOF_NUMBER : 0;

    for (const child of node.children) {
      const childProofNumber = getPerPlayerProofNumber(child, player);
      if (isOrNode) {
        proofNumber = Math.min(proofNumber, childProofNumber);
      } else {
        proofNumber = saturatingAddProofNumbers(proofNumber, childProofNumber);
      }
    }

    if (unexpandedChildCount > 0) {
      if (isOrNode) {
        proofNumber = Math.min(proofNumber, 1);
      } else {
        proofNumber = saturatingAddProofNumbers(proofNumber, unexpandedChildCount);
      }
    }

    nextProofNumbersByPlayer[player] = proofNumber;
  }

  return setPerPlayerProofNumbers(node, nextProofNumbersByPlayer, stats);
}

function normalizeScoreBoundValue(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(MIN_SCORE_BOUND, Math.min(MAX_SCORE_BOUND, Math.round(value)));
}

function getNodeScoreLowerBound(node) {
  return normalizeScoreBoundValue(node?.scoreLowerBound ?? MIN_SCORE_BOUND);
}

function getNodeScoreUpperBound(node) {
  return normalizeScoreBoundValue(node?.scoreUpperBound ?? MAX_SCORE_BOUND);
}

function setScoreBounds(node, lowerBound, upperBound, stats = null) {
  if (!node) {
    return false;
  }

  let nextLowerBound = normalizeScoreBoundValue(lowerBound);
  let nextUpperBound = normalizeScoreBoundValue(upperBound);
  if (nextLowerBound > nextUpperBound) {
    const collapsed = Math.max(MIN_SCORE_BOUND, Math.min(MAX_SCORE_BOUND, nextLowerBound));
    nextLowerBound = collapsed;
    nextUpperBound = collapsed;
  }

  const changed = node.scoreLowerBound !== nextLowerBound || node.scoreUpperBound !== nextUpperBound;
  if (!changed) {
    return false;
  }

  node.scoreLowerBound = nextLowerBound;
  node.scoreUpperBound = nextUpperBound;
  if (stats) {
    stats.mctsScoreBoundUpdates += 1;
  }
  return true;
}

function createSolvedScoreBounds(node) {
  if (!node || node.solvedOutcome === null) {
    return null;
  }

  if (node.solvedExact || node.solvedOutcome === 'draw') {
    const exactScore = node.solvedOutcome === 'draw'
      ? 0
      : normalizeScoreBoundValue(node.solvedScore ?? 0);
    return { lowerBound: exactScore, upperBound: exactScore };
  }

  if (node.solvedOutcome === 'win') {
    const lowerBound = Number.isFinite(node.solvedScore) && node.solvedScore > 0
      ? Math.max(SCORE_SCALE, normalizeScoreBoundValue(node.solvedScore))
      : SCORE_SCALE;
    return { lowerBound, upperBound: MAX_SCORE_BOUND };
  }

  if (node.solvedOutcome === 'loss') {
    const upperBound = Number.isFinite(node.solvedScore) && node.solvedScore < 0
      ? Math.min(-SCORE_SCALE, normalizeScoreBoundValue(node.solvedScore))
      : -SCORE_SCALE;
    return { lowerBound: MIN_SCORE_BOUND, upperBound };
  }

  return { lowerBound: MIN_SCORE_BOUND, upperBound: MAX_SCORE_BOUND };
}

function refreshScoreBounds(node, rootPlayer, stats = null) {
  if (!node) {
    return false;
  }

  if (node.solvedOutcome !== null) {
    const solvedBounds = createSolvedScoreBounds(node);
    return solvedBounds
      ? setScoreBounds(node, solvedBounds.lowerBound, solvedBounds.upperBound, stats)
      : false;
  }

  if (!Array.isArray(node.children) || node.children.length === 0) {
    return setScoreBounds(node, MIN_SCORE_BOUND, MAX_SCORE_BOUND, stats);
  }

  const maximizing = node.state?.currentPlayer === rootPlayer;
  const unexpandedChildCount = Array.isArray(node.legalMoves) ? node.legalMoves.length : 0;

  if (maximizing) {
    let lowerBound = MIN_SCORE_BOUND;
    let upperBound = unexpandedChildCount > 0 ? MAX_SCORE_BOUND : MIN_SCORE_BOUND;
    for (const child of node.children) {
      lowerBound = Math.max(lowerBound, getNodeScoreLowerBound(child));
      upperBound = Math.max(upperBound, getNodeScoreUpperBound(child));
    }
    return setScoreBounds(node, lowerBound, upperBound, stats);
  }

  let lowerBound = unexpandedChildCount > 0 ? MIN_SCORE_BOUND : MAX_SCORE_BOUND;
  let upperBound = MAX_SCORE_BOUND;
  for (const child of node.children) {
    lowerBound = Math.min(lowerBound, getNodeScoreLowerBound(child));
    upperBound = Math.min(upperBound, getNodeScoreUpperBound(child));
  }
  return setScoreBounds(node, lowerBound, upperBound, stats);
}

function selectScoreBoundPrincipalVariationChild(node, rootPlayer, targetScore = null) {
  if (!node?.children?.length) {
    return null;
  }

  const maximizing = node.state?.currentPlayer === rootPlayer;
  let bestChild = null;

  for (const child of node.children) {
    const lowerBound = getNodeScoreLowerBound(child);
    const upperBound = getNodeScoreUpperBound(child);
    if (Number.isFinite(targetScore) && (lowerBound > targetScore || upperBound < targetScore)) {
      continue;
    }

    if (!bestChild) {
      bestChild = child;
      continue;
    }

    const bestLowerBound = getNodeScoreLowerBound(bestChild);
    const bestUpperBound = getNodeScoreUpperBound(bestChild);
    if (maximizing) {
      const lowerGap = lowerBound - bestLowerBound;
      if (lowerGap !== 0) {
        if (lowerGap > 0) {
          bestChild = child;
        }
        continue;
      }
      const upperGap = upperBound - bestUpperBound;
      if (upperGap !== 0) {
        if (upperGap > 0) {
          bestChild = child;
        }
        continue;
      }
    } else {
      const upperGap = upperBound - bestUpperBound;
      if (upperGap !== 0) {
        if (upperGap < 0) {
          bestChild = child;
        }
        continue;
      }
      const lowerGap = lowerBound - bestLowerBound;
      if (lowerGap !== 0) {
        if (lowerGap < 0) {
          bestChild = child;
        }
        continue;
      }
    }

    if (compareNodeIdentity(child, bestChild) < 0) {
      bestChild = child;
    }
  }

  return bestChild;
}

function buildScoreBoundPrincipalVariation(node, rootPlayer, targetScore = null) {
  const child = selectScoreBoundPrincipalVariationChild(node, rootPlayer, targetScore);
  return child ? buildSolvedPrincipalVariationFromChild(child) : [];
}

function refreshSolvedStateFromScoreBounds(node, rootPlayer, stats = null) {
  if (!node) {
    return false;
  }

  const lowerBound = getNodeScoreLowerBound(node);
  const upperBound = getNodeScoreUpperBound(node);
  if (lowerBound > upperBound) {
    return false;
  }

  if (lowerBound == upperBound) {
    const exactScore = lowerBound;
    const outcome = exactScore > 0 ? 'win' : (exactScore < 0 ? 'loss' : 'draw');
    const alreadyExact = node.solvedExact
      && node.solvedOutcome == outcome
      && normalizeScoreBoundValue(node.solvedScore ?? 0) == exactScore;
    if (alreadyExact) {
      return false;
    }

    const changed = setSolvedFields(node, {
      outcome,
      reward: clamp(exactScore / MAX_SCORE_BOUND, -1, 1),
      score: exactScore,
      bucket: 'exact',
      source: 'score-bounds-exact',
      exact: true,
      principalVariation: buildScoreBoundPrincipalVariation(node, rootPlayer, exactScore),
    }, stats);
    if (changed && stats) {
      stats.mctsScoreBoundExactSolves += 1;
    }
    return changed;
  }

  if (lowerBound > 0) {
    if (node.solvedOutcome === 'win' && !node.solvedExact) {
      return false;
    }
    const changed = setSolvedFields(node, {
      outcome: 'win',
      reward: 1,
      score: SCORE_SCALE,
      bucket: 'wld',
      source: 'score-bounds',
      exact: false,
      principalVariation: buildScoreBoundPrincipalVariation(node, rootPlayer),
    }, stats);
    if (changed && stats) {
      stats.mctsScoreBoundOutcomeSolves += 1;
    }
    return changed;
  }

  if (upperBound < 0) {
    if (node.solvedOutcome === 'loss' && !node.solvedExact) {
      return false;
    }
    const changed = setSolvedFields(node, {
      outcome: 'loss',
      reward: -1,
      score: -SCORE_SCALE,
      bucket: 'wld',
      source: 'score-bounds',
      exact: false,
      principalVariation: buildScoreBoundPrincipalVariation(node, rootPlayer),
    }, stats);
    if (changed && stats) {
      stats.mctsScoreBoundOutcomeSolves += 1;
    }
    return changed;
  }

  return false;
}

function normalizeProofNumberValue(value) {
  if (!Number.isFinite(value) || value >= MAX_MCTS_PROOF_NUMBER) {
    return MAX_MCTS_PROOF_NUMBER;
  }
  return Math.max(0, Math.min(MAX_MCTS_PROOF_NUMBER, Math.round(value)));
}

function saturatingAddProofNumbers(left, right) {
  const normalizedLeft = normalizeProofNumberValue(left);
  const normalizedRight = normalizeProofNumberValue(right);
  if (normalizedLeft >= MAX_MCTS_PROOF_NUMBER || normalizedRight >= MAX_MCTS_PROOF_NUMBER) {
    return MAX_MCTS_PROOF_NUMBER;
  }
  return Math.min(MAX_MCTS_PROOF_NUMBER, normalizedLeft + normalizedRight);
}

function setProofNumbers(node, proofNumber, disproofNumber, stats = null) {
  if (!node) {
    return false;
  }

  const nextProofNumber = normalizeProofNumberValue(proofNumber);
  const nextDisproofNumber = normalizeProofNumberValue(disproofNumber);
  const changed = node.proofNumber !== nextProofNumber || node.disproofNumber !== nextDisproofNumber;
  if (!changed) {
    return false;
  }

  node.proofNumber = nextProofNumber;
  node.disproofNumber = nextDisproofNumber;
  if (stats) {
    stats.mctsProofNumberUpdates += 1;
  }
  return true;
}

function refreshProofNumbers(node, rootPlayer, stats = null) {
  if (!node) {
    return false;
  }

  if (node.solvedOutcome !== null) {
    return node.solvedOutcome === 'win'
      ? setProofNumbers(node, 0, MAX_MCTS_PROOF_NUMBER, stats)
      : setProofNumbers(node, MAX_MCTS_PROOF_NUMBER, 0, stats);
  }

  if (!Array.isArray(node.children) || node.children.length === 0) {
    return setProofNumbers(node, 1, 1, stats);
  }

  const isOrNode = node.state?.currentPlayer === rootPlayer;
  const unexpandedChildCount = Array.isArray(node.legalMoves) ? node.legalMoves.length : 0;
  let proofNumber = isOrNode ? MAX_MCTS_PROOF_NUMBER : 0;
  let disproofNumber = isOrNode ? 0 : MAX_MCTS_PROOF_NUMBER;

  for (const child of node.children) {
    const childProofNumber = normalizeProofNumberValue(child?.proofNumber ?? 1);
    const childDisproofNumber = normalizeProofNumberValue(child?.disproofNumber ?? 1);
    if (isOrNode) {
      proofNumber = Math.min(proofNumber, childProofNumber);
      disproofNumber = saturatingAddProofNumbers(disproofNumber, childDisproofNumber);
    } else {
      proofNumber = saturatingAddProofNumbers(proofNumber, childProofNumber);
      disproofNumber = Math.min(disproofNumber, childDisproofNumber);
    }
  }

  if (unexpandedChildCount > 0) {
    if (isOrNode) {
      proofNumber = Math.min(proofNumber, 1);
      disproofNumber = saturatingAddProofNumbers(disproofNumber, unexpandedChildCount);
    } else {
      proofNumber = saturatingAddProofNumbers(proofNumber, unexpandedChildCount);
      disproofNumber = Math.min(disproofNumber, 1);
    }
  }

  return setProofNumbers(node, proofNumber, disproofNumber, stats);
}

function shouldApplyProofPriorityAtNode(node, config) {
  if (!config?.useProofPriority || !Array.isArray(node?.children) || node.children.length < 2) {
    return false;
  }

  const empties = typeof node.state?.getEmptyCount === 'function'
    ? node.state.getEmptyCount()
    : Number.POSITIVE_INFINITY;
  return Number.isFinite(empties) && empties <= (config.proofPriorityMaxEmpties ?? -1);
}

function resolveProofMetricMode(value) {
  return value === 'per-player'
    ? 'per-player'
    : 'legacy-root';
}

function resolveProofPriorityBiasMode(value) {
  return value === 'pnmax' || value === 'pnsum'
    ? value
    : DEFAULT_MCTS_PROOF_PRIORITY_BIAS_MODE;
}

function resolveProofPriorityRootMaturityGateMode(value) {
  return value === 'coverage-gte-0.50'
    || value === 'coverage-gte-0.75'
    || value === 'best-metric-lte-1'
    || value === 'best-metric-lte-1-or-solved-child'
    || value === 'best-metric-threshold'
    || value === 'best-metric-threshold-or-solved-child'
    ? value
    : DEFAULT_MCTS_PROOF_PRIORITY_ROOT_MATURITY_GATE_MODE;
}

function resolveProofPriorityMetricDescriptor(node, rootPlayer, config = {}) {
  const metricMode = resolveProofMetricMode(config?.proofMetricMode);

  if (metricMode === 'per-player') {
    const metricPlayer = isPlayerColor(node?.state?.currentPlayer)
      ? node.state.currentPlayer
      : rootPlayer;
    return {
      metricMode,
      metricKey: 'proofNumber',
      metricPlayer,
      getMetric(child) {
        return getPerPlayerProofNumber(child, metricPlayer);
      },
    };
  }

  const metricKey = node.state?.currentPlayer === rootPlayer ? 'proofNumber' : 'disproofNumber';
  return {
    metricMode,
    metricKey,
    metricPlayer: null,
    getMetric(child) {
      return normalizeProofNumberValue(child?.[metricKey] ?? 1);
    },
  };
}

function collectDistinctFiniteProofMetrics(metrics) {
  const sortedFiniteMetrics = metrics
    .filter((metric) => Number.isFinite(metric) && metric < MAX_MCTS_PROOF_NUMBER)
    .sort((left, right) => left - right);
  const distinctFiniteMetrics = [];
  for (const metric of sortedFiniteMetrics) {
    if (distinctFiniteMetrics.length === 0 || distinctFiniteMetrics[distinctFiniteMetrics.length - 1] !== metric) {
      distinctFiniteMetrics.push(metric);
    }
  }
  return {
    finiteMetrics: sortedFiniteMetrics,
    distinctFiniteMetrics,
  };
}

function evaluateProofPriorityRootMaturityGate(node, rootPlayer, config = {}) {
  const mode = resolveProofPriorityRootMaturityGateMode(config?.proofPriorityRootMaturityGateMode);
  const baseMetricMode = resolveProofMetricMode(config?.proofMetricMode);
  const baseBiasMode = resolveProofPriorityBiasMode(config?.proofPriorityBiasMode);
  const targetMetricMode = resolveProofMetricMode(
    config?.proofPriorityRootMaturityGateMetricMode ?? DEFAULT_MCTS_PROOF_PRIORITY_ROOT_MATURITY_GATE_METRIC_MODE,
  );
  const targetBiasMode = resolveProofPriorityBiasMode(
    config?.proofPriorityRootMaturityGateBiasMode ?? DEFAULT_MCTS_PROOF_PRIORITY_ROOT_MATURITY_GATE_BIAS_MODE,
  );
  const minVisits = Number.isFinite(Number(config?.proofPriorityRootMaturityGateMinVisits))
    ? Math.max(0, Math.round(Number(config.proofPriorityRootMaturityGateMinVisits)))
    : DEFAULT_MCTS_PROOF_PRIORITY_ROOT_MATURITY_GATE_MIN_VISITS;
  const bestFiniteMetricThreshold = Number.isFinite(Number(config?.proofPriorityRootMaturityGateBestFiniteMetricThreshold))
    ? Math.max(0, Math.round(Number(config.proofPriorityRootMaturityGateBestFiniteMetricThreshold)))
    : DEFAULT_MCTS_PROOF_PRIORITY_ROOT_MATURITY_GATE_BEST_FINITE_METRIC_THRESHOLD;
  const requireNoSolvedChild = config?.proofPriorityRootMaturityGateRequireNoSolvedChild === true;
  const minDistinctFiniteMetricCount = Number.isFinite(Number(config?.proofPriorityRootMaturityGateMinDistinctFiniteMetricCount))
    ? Math.max(0, Math.round(Number(config.proofPriorityRootMaturityGateMinDistinctFiniteMetricCount)))
    : DEFAULT_MCTS_PROOF_PRIORITY_ROOT_MATURITY_GATE_MIN_DISTINCT_FINITE_METRIC_COUNT;
  const currentVisits = Number.isFinite(node?.visits)
    ? Math.max(0, Math.round(node.visits))
    : 0;
  const children = Array.isArray(node?.children) ? node.children : [];
  const pendingMoveCount = Array.isArray(node?.legalMoves) ? node.legalMoves.length : 0;
  const candidateMoveCount = children.length + pendingMoveCount;
  const solvedMoveCount = children.filter((child) => typeof child?.solvedOutcome === 'string').length;
  const solvedChildExists = solvedMoveCount > 0;
  const solvedCoverageRate = candidateMoveCount > 0
    ? solvedMoveCount / candidateMoveCount
    : null;
  const descriptor = resolveProofPriorityMetricDescriptor(node, rootPlayer, { proofMetricMode: baseMetricMode });
  const metrics = children.map((child) => descriptor.getMetric(child));
  const { finiteMetrics, distinctFiniteMetrics } = collectDistinctFiniteProofMetrics(metrics);
  const bestFiniteMetric = distinctFiniteMetrics[0] ?? null;
  let eligible = false;
  let activationReason = null;
  let evaluationReason = null;
  let blockReason = null;
  if (node?.solvedOutcome === null) {
    let baseEligible = false;
    let baseReason = null;
    if (mode === 'coverage-gte-0.50') {
      baseEligible = Number.isFinite(solvedCoverageRate) && solvedCoverageRate >= 0.5;
      baseReason = baseEligible ? 'coverage-gte-0.50' : null;
    } else if (mode === 'coverage-gte-0.75') {
      baseEligible = Number.isFinite(solvedCoverageRate) && solvedCoverageRate >= 0.75;
      baseReason = baseEligible ? 'coverage-gte-0.75' : null;
    } else if (mode === 'best-metric-lte-1') {
      baseEligible = Number.isFinite(bestFiniteMetric) && bestFiniteMetric <= 1;
      baseReason = baseEligible ? 'best-metric-lte-1' : null;
    } else if (mode === 'best-metric-lte-1-or-solved-child') {
      const bestMetricEligible = Number.isFinite(bestFiniteMetric) && bestFiniteMetric <= 1;
      baseEligible = solvedChildExists || bestMetricEligible;
      baseReason = solvedChildExists
        ? 'solved-child'
        : bestMetricEligible
          ? 'best-metric-lte-1'
          : null;
    } else if (mode === 'best-metric-threshold') {
      baseEligible = Number.isFinite(bestFiniteMetric) && bestFiniteMetric <= bestFiniteMetricThreshold;
      baseReason = baseEligible ? `best-metric-lte-${bestFiniteMetricThreshold}` : null;
    } else {
      const bestMetricEligible = Number.isFinite(bestFiniteMetric) && bestFiniteMetric <= bestFiniteMetricThreshold;
      baseEligible = solvedChildExists || bestMetricEligible;
      baseReason = solvedChildExists
        ? 'solved-child'
        : bestMetricEligible
          ? `best-metric-lte-${bestFiniteMetricThreshold}`
          : null;
    }

    eligible = baseEligible;
    activationReason = baseReason;
    evaluationReason = baseReason;

    if (eligible && currentVisits < minVisits) {
      eligible = false;
      activationReason = null;
      evaluationReason = 'min-visits';
      blockReason = 'min-visits';
    }
    if (eligible && requireNoSolvedChild && solvedChildExists) {
      eligible = false;
      activationReason = null;
      evaluationReason = 'solved-child-present';
      blockReason = 'solved-child-present';
    }
    if (eligible && distinctFiniteMetrics.length < minDistinctFiniteMetricCount) {
      eligible = false;
      activationReason = null;
      evaluationReason = 'distinct-finite-metrics';
      blockReason = 'distinct-finite-metrics';
    }
  }

  return {
    mode,
    baseMetricMode,
    baseBiasMode,
    targetMetricMode,
    targetBiasMode,
    minVisits,
    currentVisits,
    bestFiniteMetricThreshold,
    requireNoSolvedChild,
    minDistinctFiniteMetricCount,
    solvedChildExists,
    eligible,
    activationReason,
    evaluationReason,
    blockReason,
    candidateMoveCount,
    solvedMoveCount,
    solvedCoverageRate,
    bestFiniteMetric,
    secondFiniteMetric: distinctFiniteMetrics[1] ?? null,
    finiteMetricCount: finiteMetrics.length,
    distinctFiniteMetricCount: distinctFiniteMetrics.length,
  };
}

function resolveProofPriorityModesForNode(node, rootPlayer, config = {}, stats = null, allowActivation = stats !== null) {
  const defaultMetricMode = resolveProofMetricMode(config?.proofMetricMode);
  const defaultBiasMode = resolveProofPriorityBiasMode(config?.proofPriorityBiasMode);
  if (node?.moveIndex !== null || config?.proofPriorityRootMaturityGateEnabled !== true) {
    return {
      metricMode: defaultMetricMode,
      biasMode: defaultBiasMode,
      rootMaturityGateState: node?.moveIndex === null ? (node?.proofPriorityRootMaturityGateState ?? null) : null,
    };
  }

  const evaluation = evaluateProofPriorityRootMaturityGate(node, rootPlayer, config);
  const existingState = node.proofPriorityRootMaturityGateState && typeof node.proofPriorityRootMaturityGateState === 'object'
    ? node.proofPriorityRootMaturityGateState
    : {
      activated: false,
      activationCount: 0,
      activationIteration: null,
      activationReason: null,
    };

  existingState.mode = evaluation.mode;
  existingState.baseMetricMode = evaluation.baseMetricMode;
  existingState.baseBiasMode = evaluation.baseBiasMode;
  existingState.targetMetricMode = evaluation.targetMetricMode;
  existingState.targetBiasMode = evaluation.targetBiasMode;
  existingState.minVisits = evaluation.minVisits;
  existingState.bestFiniteMetricThreshold = evaluation.bestFiniteMetricThreshold;
  existingState.requireNoSolvedChild = evaluation.requireNoSolvedChild;
  existingState.minDistinctFiniteMetricCount = evaluation.minDistinctFiniteMetricCount;
  existingState.lastEligible = evaluation.eligible;
  existingState.lastCurrentVisits = evaluation.currentVisits;
  existingState.lastSolvedChildExists = evaluation.solvedChildExists;
  existingState.lastBlockReason = evaluation.blockReason;
  existingState.lastCandidateMoveCount = evaluation.candidateMoveCount;
  existingState.lastSolvedMoveCount = evaluation.solvedMoveCount;
  existingState.lastSolvedCoverageRate = evaluation.solvedCoverageRate;
  existingState.lastBestFiniteMetric = evaluation.bestFiniteMetric;
  existingState.lastSecondFiniteMetric = evaluation.secondFiniteMetric;
  existingState.lastFiniteMetricCount = evaluation.finiteMetricCount;
  existingState.lastDistinctFiniteMetricCount = evaluation.distinctFiniteMetricCount;
  existingState.lastEvaluationReason = evaluation.evaluationReason;
  if (stats) {
    stats.mctsProofPriorityRootMaturityGateChecks += 1;
  }
  if (allowActivation && evaluation.eligible && existingState.activated !== true) {
    existingState.activated = true;
    existingState.activationCount = (existingState.activationCount ?? 0) + 1;
    existingState.activationIteration = Number.isFinite(node?.visits)
      ? Math.max(0, Math.round(node.visits))
      : 0;
    existingState.activationReason = evaluation.activationReason;
    if (stats) {
      stats.mctsProofPriorityRootMaturityGateActivations += 1;
    }
  }

  node.proofPriorityRootMaturityGateState = existingState;
  return {
    metricMode: existingState.activated ? evaluation.targetMetricMode : defaultMetricMode,
    biasMode: existingState.activated ? evaluation.targetBiasMode : defaultBiasMode,
    rootMaturityGateState: existingState,
  };
}

function buildProofPriorityRanking(node, rootPlayer, config, stats = null, childList = null, includeMoveIndex = true) {
  if (!shouldApplyProofPriorityAtNode(node, config)) {
    return null;
  }

  const resolvedModes = resolveProofPriorityModesForNode(node, rootPlayer, config, stats, stats !== null);
  const descriptor = resolveProofPriorityMetricDescriptor(node, rootPlayer, { proofMetricMode: resolvedModes.metricMode });
  const biasMode = resolvedModes.biasMode;
  const rankedChildren = Array.isArray(childList) && childList.length > 0
    ? childList
    : node.children;
  const rankedEntries = rankedChildren
    .map((child) => ({
      child,
      metric: descriptor.getMetric(child),
    }))
    .sort((left, right) => {
      const metricGap = left.metric - right.metric;
      if (metricGap !== 0) {
        return metricGap;
      }
      return compareNodeIdentity(left.child, right.child);
    });

  let currentRank = 0;
  let previousMetric = null;
  for (let index = 0; index < rankedEntries.length; index += 1) {
    const entry = rankedEntries[index];
    if (index === 0 || entry.metric !== previousMetric) {
      currentRank = index + 1;
      previousMetric = entry.metric;
    }
    entry.rank = currentRank;
  }

  const maxRank = rankedEntries[rankedEntries.length - 1]?.rank ?? 1;
  const finiteMetrics = rankedEntries
    .map((entry) => entry.metric)
    .filter((metric) => Number.isFinite(metric) && metric < MAX_MCTS_PROOF_NUMBER);
  const finiteMin = finiteMetrics.length > 0 ? Math.min(...finiteMetrics) : null;
  const finiteMax = finiteMetrics.length > 0 ? Math.max(...finiteMetrics) : null;
  const finiteSum = finiteMetrics.length > 0
    ? finiteMetrics.reduce((sum, metric) => sum + metric, 0)
    : 0;
  const byChild = new Map();
  const byMoveIndex = includeMoveIndex ? new Map() : null;
  for (const entry of rankedEntries) {
    const metric = entry.metric;
    const finiteMetric = Number.isFinite(metric) && metric < MAX_MCTS_PROOF_NUMBER;
    let normalizedBonus = 0;
    if (biasMode === 'pnmax') {
      normalizedBonus = finiteMetric && finiteMin !== null && finiteMax !== null
        ? (1 - ((metric - finiteMin) / (1 + finiteMax - finiteMin)))
        : 0;
    } else if (biasMode === 'pnsum') {
      normalizedBonus = finiteMetric
        ? (1 - (metric / (1 + finiteSum)))
        : 0;
    } else {
      normalizedBonus = maxRank > 1
        ? (1 - (entry.rank / maxRank))
        : 0;
    }
    const metadata = {
      metric,
      rank: entry.rank,
      normalizedBonus: clamp(normalizedBonus, 0, 1),
    };
    byChild.set(entry.child, metadata);
    if (byMoveIndex && Number.isInteger(entry.child?.moveIndex)) {
      byMoveIndex.set(entry.child.moveIndex, metadata);
    }
  }

  if (stats) {
    stats.mctsProofPrioritySelectionNodes += 1;
    stats.mctsProofPriorityRankedChildren += rankedEntries.length;
  }

  return {
    metricMode: descriptor.metricMode,
    metricKey: descriptor.metricKey,
    metricPlayer: descriptor.metricPlayer,
    biasMode,
    byChild,
    byMoveIndex,
    maxRank,
    rootMaturityGateState: resolvedModes.rootMaturityGateState,
  };
}

function getTraversableChildrenWithScoreBounds(node, rootPlayer, config, stats = null) {
  if (!Array.isArray(node?.children) || node.children.length < 2 || !config?.useScoreBounds) {
    return node?.children ?? [];
  }

  const maximizing = node.state?.currentPlayer === rootPlayer;
  if (maximizing) {
    let bestLowerBound = MIN_SCORE_BOUND;
    let secondBestLowerBound = MIN_SCORE_BOUND;
    let bestLowerBoundCount = 0;
    for (const child of node.children) {
      const lowerBound = getNodeScoreLowerBound(child);
      if (lowerBound > bestLowerBound) {
        secondBestLowerBound = bestLowerBound;
        bestLowerBound = lowerBound;
        bestLowerBoundCount = 1;
      } else if (lowerBound === bestLowerBound) {
        bestLowerBoundCount += 1;
      } else if (lowerBound > secondBestLowerBound) {
        secondBestLowerBound = lowerBound;
      }
    }

    const filtered = [];
    for (const child of node.children) {
      const lowerBound = getNodeScoreLowerBound(child);
      const upperBound = getNodeScoreUpperBound(child);
      const alternativeLowerBound = lowerBound === bestLowerBound && bestLowerBoundCount === 1
        ? secondBestLowerBound
        : bestLowerBound;
      const dominated = upperBound < alternativeLowerBound;
      if (!dominated) {
        filtered.push(child);
      } else if (stats) {
        stats.mctsScoreBoundDominatedChildrenSkipped += 1;
      }
    }

    return filtered.length > 0 ? filtered : node.children;
  }

  let bestUpperBound = MAX_SCORE_BOUND;
  let secondBestUpperBound = MAX_SCORE_BOUND;
  let bestUpperBoundCount = 0;
  for (const child of node.children) {
    const upperBound = getNodeScoreUpperBound(child);
    if (upperBound < bestUpperBound) {
      secondBestUpperBound = bestUpperBound;
      bestUpperBound = upperBound;
      bestUpperBoundCount = 1;
    } else if (upperBound === bestUpperBound) {
      bestUpperBoundCount += 1;
    } else if (upperBound < secondBestUpperBound) {
      secondBestUpperBound = upperBound;
    }
  }

  const filtered = [];
  for (const child of node.children) {
    const lowerBound = getNodeScoreLowerBound(child);
    const upperBound = getNodeScoreUpperBound(child);
    const alternativeUpperBound = upperBound === bestUpperBound && bestUpperBoundCount === 1
      ? secondBestUpperBound
      : bestUpperBound;
    const dominated = lowerBound > alternativeUpperBound;
    if (!dominated) {
      filtered.push(child);
    } else if (stats) {
      stats.mctsScoreBoundDominatedChildrenSkipped += 1;
    }
  }

  return filtered.length > 0 ? filtered : node.children;
}


function shouldApplyScoreBoundDrawPriorityAtNode(node, rootPlayer, config, childList = null) {
  if (!config?.useScoreBoundDrawPriority || !config?.useScoreBounds) {
    return false;
  }

  const children = Array.isArray(childList) && childList.length > 0
    ? childList
    : node?.children;
  if (!Array.isArray(children) || children.length < 2) {
    return false;
  }

  const empties = typeof node?.state?.getEmptyCount === 'function'
    ? node.state.getEmptyCount()
    : Number.POSITIVE_INFINITY;
  if (
    Number.isFinite(empties)
    && Number.isFinite(config?.scoreBoundDrawPriorityMaxEmpties)
    && empties > (config.scoreBoundDrawPriorityMaxEmpties ?? -1)
  ) {
    return false;
  }

  const lowerBound = getNodeScoreLowerBound(node);
  const upperBound = getNodeScoreUpperBound(node);
  const maximizing = node?.state?.currentPlayer === rootPlayer;
  return maximizing
    ? lowerBound === 0 && upperBound > 0
    : upperBound === 0 && lowerBound < 0;
}

function buildScoreBoundDrawPriorityRanking(node, rootPlayer, config, stats = null, childList = null, includeMoveIndex = true) {
  const rankedChildren = Array.isArray(childList) && childList.length > 0
    ? childList
    : node?.children;

  if (!shouldApplyScoreBoundDrawPriorityAtNode(node, rootPlayer, config, rankedChildren)) {
    return null;
  }

  const maximizing = node?.state?.currentPlayer === rootPlayer;
  const rankedEntries = rankedChildren
    .map((child) => {
      const lowerBound = getNodeScoreLowerBound(child);
      const upperBound = getNodeScoreUpperBound(child);
      const blocker = maximizing
        ? upperBound > 0
        : lowerBound < 0;
      const urgency = maximizing
        ? upperBound
        : -lowerBound;
      return {
        child,
        blocker,
        lowerBound,
        upperBound,
        scoreBoundWidth: upperBound - lowerBound,
        urgency,
      };
    })
    .sort((left, right) => {
      if (left.blocker !== right.blocker) {
        return left.blocker ? -1 : 1;
      }

      if (left.blocker && right.blocker) {
        const urgencyGap = right.urgency - left.urgency;
        if (urgencyGap !== 0) {
          return urgencyGap;
        }

        const widthGap = right.scoreBoundWidth - left.scoreBoundWidth;
        if (widthGap !== 0) {
          return widthGap;
        }
      } else {
        const widthGap = left.scoreBoundWidth - right.scoreBoundWidth;
        if (widthGap !== 0) {
          return widthGap;
        }

        const lowerGap = right.lowerBound - left.lowerBound;
        if (lowerGap !== 0) {
          return lowerGap;
        }

        const upperGap = right.upperBound - left.upperBound;
        if (upperGap !== 0) {
          return upperGap;
        }
      }

      return compareNodeIdentity(left.child, right.child);
    });

  let blockerRank = 0;
  let blockerCount = 0;
  const byChild = new Map();
  const byMoveIndex = includeMoveIndex ? new Map() : null;
  for (const entry of rankedEntries) {
    if (entry.blocker) {
      blockerCount += 1;
    }
  }
  if (blockerCount === 0) {
    return null;
  }

  for (const entry of rankedEntries) {
    let rank = null;
    let normalizedBonus = 0;
    if (entry.blocker) {
      blockerRank += 1;
      rank = blockerRank;
      normalizedBonus = blockerCount > 1
        ? (1 - ((rank - 1) / blockerCount))
        : 1;
    }

    const metadata = {
      blocker: entry.blocker,
      lowerBound: entry.lowerBound,
      upperBound: entry.upperBound,
      scoreBoundWidth: entry.scoreBoundWidth,
      urgency: entry.urgency,
      rank,
      normalizedBonus,
    };
    byChild.set(entry.child, metadata);
    if (byMoveIndex && Number.isInteger(entry.child?.moveIndex)) {
      byMoveIndex.set(entry.child.moveIndex, metadata);
    }
  }

  if (stats) {
    stats.mctsScoreBoundDrawPrioritySelectionNodes += 1;
    stats.mctsScoreBoundDrawPriorityRankedChildren += rankedEntries.length;
    stats.mctsScoreBoundDrawPriorityBlockerChildren += blockerCount;
  }

  return {
    mode: 'draw-blocker',
    byChild,
    byMoveIndex,
    blockerCount,
    rankedChildCount: rankedEntries.length,
  };
}

function getSolvedStateForState(state, rootPlayer, checkDeadline, config, caches, stats) {
  if (!config?.useSolver || typeof config.solveState !== 'function' || !state) {
    return null;
  }

  const empties = typeof state.getEmptyCount === 'function'
    ? state.getEmptyCount()
    : Number.POSITIVE_INFINITY;
  if (!Number.isFinite(empties) || empties > (config.solverMaxEmpties ?? -1)) {
    return null;
  }

  const hashKey = state.hashKey();
  if (caches.solvedByStateHash.has(hashKey)) {
    if (stats) {
      stats.mctsSolverCacheHits += 1;
    }
    return caches.solvedByStateHash.get(hashKey) ?? null;
  }

  checkDeadline?.();
  if (stats) {
    stats.mctsSolverStateProbes += 1;
  }
  const solved = config.solveState(state, rootPlayer) ?? null;
  caches.solvedByStateHash.set(hashKey, solved);
  if (stats && solved?.bucket === 'exact') {
    stats.mctsSolverExactHits += 1;
  } else if (stats && solved?.bucket === 'wld') {
    stats.mctsSolverWldHits += 1;
  }
  return solved;
}

function maybeSolveNode(node, rootPlayer, checkDeadline, config, caches, stats) {
  if (!node) {
    return false;
  }
  if (node.solvedOutcome !== null) {
    return true;
  }
  if (node.state?.isTerminal()) {
    return setSolvedFields(node, createTerminalSolvedRecord(node.state, rootPlayer), stats);
  }

  const solved = getSolvedStateForState(node.state, rootPlayer, checkDeadline, config, caches, stats);
  if (!solved) {
    return false;
  }
  return setSolvedFields(node, {
    ...solved,
    source: solved.source ?? solved.bucket ?? 'solver',
  }, stats);
}

function shouldPreferSolvedScoreChild(candidate, current, maximizing) {
  if (!candidate) {
    return false;
  }
  if (!current) {
    return true;
  }

  const scoreGap = (candidate.solvedScore ?? 0) - (current.solvedScore ?? 0);
  if (scoreGap !== 0) {
    return maximizing ? scoreGap > 0 : scoreGap < 0;
  }
  return compareNodeIdentity(candidate, current) < 0;
}

function shouldPreferSolvedOutcomeChild(candidate, current, maximizing) {
  if (!candidate) {
    return false;
  }
  if (!current) {
    return true;
  }

  const rankGap = solvedOutcomeRank(candidate.solvedOutcome) - solvedOutcomeRank(current.solvedOutcome);
  if (rankGap !== 0) {
    return maximizing ? rankGap > 0 : rankGap < 0;
  }

  const candidateScore = Number.isFinite(candidate.solvedScore) ? candidate.solvedScore : null;
  const currentScore = Number.isFinite(current.solvedScore) ? current.solvedScore : null;
  if (candidateScore !== null && currentScore !== null && candidateScore !== currentScore) {
    return maximizing ? candidateScore > currentScore : candidateScore < currentScore;
  }

  return compareNodeIdentity(candidate, current) < 0;
}

function shouldPreferDecisiveSolvedChild(candidate, current, maximizing) {
  if (!candidate) {
    return false;
  }
  if (!current) {
    return true;
  }

  const candidateScore = Number.isFinite(candidate.solvedScore) ? candidate.solvedScore : null;
  const currentScore = Number.isFinite(current.solvedScore) ? current.solvedScore : null;
  if (candidateScore !== null && currentScore !== null && candidateScore !== currentScore) {
    return maximizing ? candidateScore > currentScore : candidateScore < currentScore;
  }

  return compareNodeIdentity(candidate, current) < 0;
}

function refreshSolvedStateFromChildren(node, rootPlayer, stats = null) {
  if (!node || !Array.isArray(node.children) || node.children.length === 0) {
    return false;
  }

  const maximizing = node.state.currentPlayer === rootPlayer;
  const allChildrenExpanded = node.legalMoves.length === 0 && node.children.length > 0;
  const decisiveOutcome = maximizing ? 'win' : 'loss';
  let solvedChildCount = 0;
  let allChildrenExact = allChildrenExpanded;
  let bestExactChild = null;
  let bestResolvedChild = null;
  let decisiveChild = null;

  for (const child of node.children) {
    if (child?.solvedOutcome === null) {
      continue;
    }

    solvedChildCount += 1;
    if (allChildrenExpanded) {
      if (child.solvedExact && Number.isFinite(child.solvedScore)) {
        if (shouldPreferSolvedScoreChild(child, bestExactChild, maximizing)) {
          bestExactChild = child;
        }
      } else {
        allChildrenExact = false;
      }

      if (shouldPreferSolvedOutcomeChild(child, bestResolvedChild, maximizing)) {
        bestResolvedChild = child;
      }
    }

    if (child.solvedOutcome === decisiveOutcome && shouldPreferDecisiveSolvedChild(child, decisiveChild, maximizing)) {
      decisiveChild = child;
    }
  }

  if (solvedChildCount === 0) {
    return false;
  }

  if (allChildrenExpanded && solvedChildCount === node.children.length) {
    if (allChildrenExact && bestExactChild) {
      const changed = setSolvedFields(node, {
        outcome: bestExactChild.solvedOutcome ?? 'draw',
        reward: Number.isFinite(bestExactChild.solvedReward) ? bestExactChild.solvedReward : 0,
        score: Number.isFinite(bestExactChild.solvedScore) ? bestExactChild.solvedScore : 0,
        bucket: 'exact',
        source: 'propagated-exact',
        exact: true,
        principalVariation: buildSolvedPrincipalVariationFromChild(bestExactChild),
      }, stats);
      if (changed && stats) {
        stats.mctsSolverPropagationUpdates += 1;
      }
      return changed;
    }

    const outcome = bestResolvedChild?.solvedOutcome ?? 'draw';
    const drawExact = outcome === 'draw';
    const changed = setSolvedFields(node, {
      outcome,
      reward: outcome === 'win' ? 1 : (outcome === 'loss' ? -1 : 0),
      score: outcome === 'draw' ? 0 : rewardToScore(outcome === 'win' ? 1 : -1),
      bucket: drawExact ? 'exact' : 'wld',
      source: drawExact ? 'propagated-exact' : 'propagated',
      exact: drawExact,
      principalVariation: buildSolvedPrincipalVariationFromChild(bestResolvedChild),
    }, stats);
    if (changed && stats) {
      stats.mctsSolverPropagationUpdates += 1;
    }
    return changed;
  }

  if (!decisiveChild) {
    return false;
  }

  const changed = setSolvedFields(node, {
    outcome: decisiveOutcome,
    reward: decisiveOutcome === 'win' ? 1 : -1,
    score: rewardToScore(decisiveOutcome === 'win' ? 1 : -1),
    bucket: 'wld',
    source: 'propagated',
    exact: false,
    principalVariation: buildSolvedPrincipalVariationFromChild(decisiveChild),
  }, stats);
  if (changed && stats) {
    stats.mctsSolverPropagationUpdates += 1;
  }
  return changed;
}

function pickRandomExpansionMove(node, random, rootPlayer = null, stats = null, checkDeadline = null, config = null) {
  if (!Array.isArray(node.legalMoves) || node.legalMoves.length === 0) {
    return null;
  }

  const immediateWipeout = rootPlayer === null
    ? null
    : findBestImmediateWipeoutOption(node.state, node.legalMoves, rootPlayer, checkDeadline);
  if (immediateWipeout?.move) {
    removeMoveFromLegalMoves(node.legalMoves, immediateWipeout.move, immediateWipeout.legalMoveArrayIndex);
    if (stats) {
      stats.mctsImmediateWipeoutSelections += 1;
      stats.mctsImmediateWipeoutExpansionSelections += 1;
    }
    return immediateWipeout.move;
  }

  let candidateMoves = node.legalMoves;
  if (node.moveIndex === null && config?.rootThreatByMoveIndex instanceof Map) {
    const safeMoves = node.legalMoves.filter((move) => !(config.rootThreatByMoveIndex.get(move.index)?.scorePenalty > 0));
    if (safeMoves.length > 0) {
      candidateMoves = safeMoves;
      if (stats) {
        stats.mctsRootThreatRootSafeExpansionSkips += 1;
      }
    }
  }

  const moveIndex = candidateMoves.length === 1
    ? 0
    : Math.floor(random() * candidateMoves.length);
  const selectedMove = candidateMoves[moveIndex] ?? null;
  if (!selectedMove) {
    return null;
  }

  removeMoveFromLegalMoves(node.legalMoves, selectedMove);
  return selectedMove;
}

function selectChildForTraversal(node, rootPlayer, exploration, config, stats = null) {
  const maximizing = node.state.currentPlayer === rootPlayer;
  const parentVisits = Math.max(1, node.visits);
  const logParentVisits = Math.log(parentVisits);
  const priorVirtualVisits = config?.priorVirtualVisits ?? 0;
  const usePriorBiasedValues = priorVirtualVisits > 0;
  const progressiveBiasScale = config?.progressiveBiasScale ?? 0;
  const proofPriorityScale = config?.proofPriorityScale ?? 0;
  const scoreBoundDrawPriorityScale = config?.scoreBoundDrawPriorityScale ?? 0;
  const rootThreatByMoveIndex = node.moveIndex === null && config?.rootThreatByMoveIndex instanceof Map
    ? config.rootThreatByMoveIndex
    : null;
  const traversableChildren = getTraversableChildrenWithScoreBounds(node, rootPlayer, config, stats);
  if (stats && Array.isArray(node?.children) && traversableChildren.length < node.children.length) {
    stats.mctsScoreBoundTraversalFilteredNodes += 1;
  }
  const proofPriorityRanking = buildProofPriorityRanking(node, rootPlayer, config, stats, traversableChildren, false);
  const scoreBoundDrawPriorityRanking = buildScoreBoundDrawPriorityRanking(node, rootPlayer, config, stats, traversableChildren, false);
  let bestChild = null;
  let bestScore = -Infinity;
  let bestPerspectiveMean = -Infinity;

  for (const child of traversableChildren) {
    const childMean = usePriorBiasedValues
      ? effectiveMeanReward(child)
      : meanReward(child);
    const perspectiveMean = maximizing ? childMean : -childMean;
    const denominatorVisits = Math.max(1, usePriorBiasedValues ? effectiveVisits(child) : child.visits);
    const explorationTerm = exploration * Math.sqrt(logParentVisits / denominatorVisits);
    const policyPerspective = maximizing
      ? (child.priorPolicy ?? 0)
      : -(child.priorPolicy ?? 0);
    const progressiveBiasTerm = progressiveBiasScale > 0
      ? (progressiveBiasScale * policyPerspective) / (1 + Math.max(0, child.visits))
      : 0;
    const rootThreatPenalty = rootThreatByMoveIndex
      ? rootThreatByMoveIndex.get(child.moveIndex) ?? null
      : null;
    const rootThreatTerm = rootThreatPenalty?.rewardPenalty > 0
      ? -((rootThreatPenalty.rewardPenalty * ROOT_THREAT_TRAVERSAL_PENALTY_SCALE) / (1 + Math.max(0, child.visits)))
      : 0;
    const proofPriorityMetadata = proofPriorityRanking?.byChild?.get(child) ?? null;
    const proofPriorityTerm = proofPriorityMetadata && proofPriorityScale > 0
      ? proofPriorityScale * (proofPriorityMetadata.normalizedBonus ?? 0)
      : 0;
    const scoreBoundDrawPriorityMetadata = scoreBoundDrawPriorityRanking?.byChild?.get(child) ?? null;
    const scoreBoundDrawPriorityTerm = scoreBoundDrawPriorityMetadata && scoreBoundDrawPriorityScale > 0
      ? scoreBoundDrawPriorityScale * (scoreBoundDrawPriorityMetadata.normalizedBonus ?? 0)
      : 0;
    const score = perspectiveMean
      + explorationTerm
      + progressiveBiasTerm
      + rootThreatTerm
      + proofPriorityTerm
      + scoreBoundDrawPriorityTerm;

    if (
      score > bestScore + FLOAT_EPSILON
      || (
        Math.abs(score - bestScore) <= FLOAT_EPSILON
        && (
          perspectiveMean > bestPerspectiveMean + FLOAT_EPSILON
          || (
            Math.abs(perspectiveMean - bestPerspectiveMean) <= FLOAT_EPSILON
            && compareNodeIdentity(child, bestChild) < 0
          )
        )
      )
    ) {
      bestChild = child;
      bestScore = score;
      bestPerspectiveMean = perspectiveMean;
    }
  }

  return bestChild;
}

function selectMostVisitedChild(node, config) {
  if (!node?.children?.length) {
    return null;
  }

  const usePriorBiasedValues = (config?.priorVirtualVisits ?? 0) > 0;
  let bestChild = null;
  let bestVisits = -Infinity;
  let bestMean = -Infinity;

  for (const child of node.children) {
    const visits = child?.visits ?? 0;
    const mean = usePriorBiasedValues ? effectiveMeanReward(child) : meanReward(child);
    if (
      visits > bestVisits
      || (
        visits === bestVisits
        && (
          mean > bestMean + FLOAT_EPSILON
          || (
            Math.abs(mean - bestMean) <= FLOAT_EPSILON
            && compareNodeIdentity(child, bestChild) < 0
          )
        )
      )
    ) {
      bestChild = child;
      bestVisits = visits;
      bestMean = mean;
    }
  }

  return bestChild;
}

function buildPrincipalVariationFromNode(node, config, limit = PRINCIPAL_VARIATION_LIMIT) {
  const principalVariation = [];
  let current = node;

  while (current && Number.isInteger(current.moveIndex) && principalVariation.length < limit) {
    principalVariation.push(current.moveIndex);
    if (Array.isArray(current.solvedPrincipalVariation) && current.solvedPrincipalVariation.length > 0) {
      for (const moveIndex of current.solvedPrincipalVariation) {
        if (!Number.isInteger(moveIndex) || principalVariation.length >= limit) {
          break;
        }
        principalVariation.push(moveIndex);
      }
      break;
    }
    current = selectMostVisitedChild(current, config);
  }

  return principalVariation;
}

function createGuidedCaches() {
  return {
    rewardByStateHash: new Map(),
    orderingByStateHashBlack: new Map(),
    orderingByStateHashWhite: new Map(),
    openingPriorByStateHash: new Map(),
    openingPriorMoveMaps: new WeakMap(),
    hybridMinimaxScoreByDepth: new Map(),
    solvedByStateHash: new Map(),
  };
}

function getOrderingSignalCache(caches, moverColor) {
  return moverColor === 'white'
    ? caches.orderingByStateHashWhite
    : caches.orderingByStateHashBlack;
}

function getHybridMinimaxDepthCache(caches, depth) {
  if (!caches.hybridMinimaxScoreByDepth.has(depth)) {
    caches.hybridMinimaxScoreByDepth.set(depth, new Map());
  }
  return caches.hybridMinimaxScoreByDepth.get(depth);
}

function getOpeningPriorHit(state, config, caches) {
  if (!config.useOpeningPrior || state.ply > GUIDED_OPENING_PRIOR_MAX_PLY) {
    return null;
  }

  const hashKey = state.hashKey();
  if (!caches.openingPriorByStateHash.has(hashKey)) {
    caches.openingPriorByStateHash.set(hashKey, config.lookupOpeningPrior?.(state) ?? null);
  }
  return caches.openingPriorByStateHash.get(hashKey) ?? null;
}

function getOpeningPriorMoveMap(hit, caches) {
  if (!hit) {
    return null;
  }

  let moveMap = caches.openingPriorMoveMaps.get(hit);
  if (!moveMap) {
    moveMap = new Map((Array.isArray(hit.moves) ? hit.moves : []).map((move) => [move.moveIndex, move]));
    caches.openingPriorMoveMaps.set(hit, moveMap);
  }
  return moveMap;
}

function getHeuristicRewardForState(state, rootPlayer, config, caches) {
  if (state.isTerminal()) {
    return clamp(state.getDiscDifferential(rootPlayer) / 64, -1, 1);
  }

  if ((typeof config.evaluator?.evaluate !== 'function') || (!config.useGuidedPrior && !config.useHybridMinimaxPrior)) {
    return clamp(state.getDiscDifferential(rootPlayer) / 64, -1, 1);
  }

  const hashKey = state.hashKey();
  if (!caches.rewardByStateHash.has(hashKey)) {
    const evaluatorScore = config.evaluator.evaluate(state, rootPlayer);
    caches.rewardByStateHash.set(hashKey, boundedTanh(evaluatorScore, GUIDED_VALUE_REWARD_SCALE));
  }
  return caches.rewardByStateHash.get(hashKey) ?? 0;
}

function evaluateStateScoreForRoot(state, rootPlayer, config) {
  if (state.isTerminal()) {
    if (typeof config.evaluator?.evaluateTerminal === 'function') {
      return config.evaluator.evaluateTerminal(state, rootPlayer);
    }
    return state.getDiscDifferential(rootPlayer) * SCORE_SCALE;
  }

  if (typeof config.evaluator?.evaluate === 'function') {
    return config.evaluator.evaluate(state, rootPlayer);
  }

  return state.getDiscDifferential(rootPlayer) * 1000;
}

function getMoveOrderingSignal(childState, moverColor, config, caches) {
  if (typeof config.moveOrderingEvaluator?.evaluate !== 'function') {
    return 0;
  }

  const orderingCache = getOrderingSignalCache(caches, moverColor);
  const hashKey = childState.hashKey();
  if (!orderingCache.has(hashKey)) {
    const orderingScore = config.moveOrderingEvaluator.evaluate(childState, moverColor);
    orderingCache.set(hashKey, boundedTanh(orderingScore, GUIDED_ORDERING_POLICY_SCALE));
  }
  return orderingCache.get(hashKey) ?? 0;
}

function getOpeningPriorSignal(openingPriorHit, moveIndex, caches) {
  const moveMap = getOpeningPriorMoveMap(openingPriorHit, caches);
  if (!moveMap) {
    return 0;
  }

  const moveEntry = moveMap.get(moveIndex);
  if (!moveEntry) {
    return 0;
  }

  if (Number.isFinite(moveEntry.priorScore)) {
    return boundedTanh(moveEntry.priorScore, GUIDED_OPENING_PRIOR_SCALE);
  }

  return 0;
}

function composeGuidedMovePolicy({
  state,
  move,
  childState,
  rootPlayer,
  config,
  caches,
  openingPriorHit,
  stats,
}) {
  const moverColor = state.currentPlayer;
  const orderingSignal = getMoveOrderingSignal(childState, moverColor, config, caches);
  const openingSignal = getOpeningPriorSignal(openingPriorHit, move.index, caches);
  if (openingSignal !== 0 && stats) {
    stats.mctsGuidedPriorUses += 1;
  }

  let moverPolicy = (
    (orderingSignal * config.guidedOrderingWeight)
    + (openingSignal * config.guidedOpeningPriorWeight)
  );
  if (isCornerIndex(move.index)) {
    moverPolicy = Math.max(moverPolicy, 0.92);
  }
  moverPolicy = clamp(moverPolicy, -1, 1);

  const rootPerspectivePolicy = moverColor === rootPlayer ? moverPolicy : -moverPolicy;
  return {
    moverPolicy,
    rootPerspectivePolicy,
  };
}

function compareGuidedExpansionCandidate(left, right) {
  const policyGap = (right?.moverPolicy ?? 0) - (left?.moverPolicy ?? 0);
  if (Math.abs(policyGap) > FLOAT_EPSILON) {
    return policyGap > 0 ? 1 : -1;
  }

  const rewardGap = (right?.priorReward ?? 0) - (left?.priorReward ?? 0);
  if (Math.abs(rewardGap) > FLOAT_EPSILON) {
    return rewardGap > 0 ? 1 : -1;
  }

  return compareNodeIdentity(left?.move, right?.move);
}

function compareGuidedRolloutCandidate(left, right) {
  const policyGap = (right?.moverPolicy ?? 0) - (left?.moverPolicy ?? 0);
  if (Math.abs(policyGap) > FLOAT_EPSILON) {
    return policyGap > 0 ? 1 : -1;
  }
  return compareNodeIdentity(left?.move, right?.move);
}

function compareHybridMinimaxCandidate(left, right) {
  const orderGap = (right?.orderScore ?? 0) - (left?.orderScore ?? 0);
  if (Math.abs(orderGap) > FLOAT_EPSILON) {
    return orderGap > 0 ? 1 : -1;
  }

  const policyGap = (right?.moverPolicy ?? 0) - (left?.moverPolicy ?? 0);
  if (Math.abs(policyGap) > FLOAT_EPSILON) {
    return policyGap > 0 ? 1 : -1;
  }

  const rewardGap = (right?.heuristicReward ?? 0) - (left?.heuristicReward ?? 0);
  if (Math.abs(rewardGap) > FLOAT_EPSILON) {
    return rewardGap > 0 ? 1 : -1;
  }

  return compareNodeIdentity(left?.move, right?.move);
}

function insertTopCandidate(candidates, candidate, compareCandidate, limit = Number.POSITIVE_INFINITY) {
  if (!candidate || !Number.isFinite(limit) || limit <= 0) {
    return;
  }

  let insertIndex = candidates.length;
  for (let index = 0; index < candidates.length; index += 1) {
    if (compareCandidate(candidate, candidates[index]) < 0) {
      insertIndex = index;
      break;
    }
  }

  if (insertIndex >= limit) {
    return;
  }

  candidates.splice(insertIndex, 0, candidate);
  if (candidates.length > limit) {
    candidates.pop();
  }
}

function weightedPickBy(entries, weightResolver, random) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return null;
  }

  let totalWeight = 0;
  for (let index = 0; index < entries.length; index += 1) {
    const weight = Number(weightResolver(entries[index], index));
    if (Number.isFinite(weight) && weight > 0) {
      totalWeight += weight;
    }
  }
  if (totalWeight <= FLOAT_EPSILON) {
    return entries[0] ?? null;
  }

  let threshold = random() * totalWeight;
  for (let index = 0; index < entries.length; index += 1) {
    const weight = Number(weightResolver(entries[index], index));
    if (!Number.isFinite(weight) || weight <= 0) {
      continue;
    }
    threshold -= weight;
    if (threshold <= 0) {
      return entries[index];
    }
  }

  return entries[entries.length - 1] ?? null;
}

function scoreGuidedExpansionCandidates(node, rootPlayer, checkDeadline, config, caches, stats, limit = node.legalMoves.length) {
  const openingPriorHit = getOpeningPriorHit(node.state, config, caches);
  const candidates = [];
  const candidateLimit = Math.max(1, Math.min(node.legalMoves.length, Math.round(limit)));
  const rootThreatByMoveIndex = node.moveIndex === null && config?.rootThreatByMoveIndex instanceof Map
    ? config.rootThreatByMoveIndex
    : null;

  for (let index = 0; index < node.legalMoves.length; index += 1) {
    if ((index % CANDIDATE_DEADLINE_CHECK_INTERVAL) === 0) {
      checkDeadline();
    }

    const move = node.legalMoves[index];
    const childState = node.state.applyMoveFast(move.index, move.flips ?? null);
    if (!childState) {
      continue;
    }

    const normalizedChild = normalizeDecisionState(childState);
    const policy = composeGuidedMovePolicy({
      state: node.state,
      move,
      childState,
      rootPlayer,
      config,
      caches,
      openingPriorHit,
      stats,
    });
    const baseReward = getHeuristicRewardForState(normalizedChild.state, rootPlayer, config, caches);
    let moverPolicy = policy.moverPolicy;
    let priorPolicy = policy.rootPerspectivePolicy;
    let priorReward = clamp(
      (baseReward * config.guidedValueWeight)
      + (priorPolicy * (1 - config.guidedValueWeight)),
      -1,
      1,
    );

    const rootThreatPenalty = rootThreatByMoveIndex?.get(move.index) ?? null;
    if (rootThreatPenalty?.rewardPenalty > 0) {
      moverPolicy = clamp(moverPolicy - rootThreatPenalty.policyPenalty, -1, 1);
      priorPolicy = clamp(priorPolicy - rootThreatPenalty.rewardPenalty, -1, 1);
      priorReward = clamp(priorReward - rootThreatPenalty.rewardPenalty, -1, 1);
      stats.mctsRootThreatPriorUses += 1;
    }

    insertTopCandidate(candidates, {
      move,
      legalMoveArrayIndex: index,
      normalizedChild,
      moverPolicy,
      priorPolicy,
      priorReward,
      rootThreatPenalty,
    }, compareGuidedExpansionCandidate, candidateLimit);
  }

  return candidates;
}

function pickGuidedExpansionMove(node, rootPlayer, random, checkDeadline, config, caches, stats) {
  const immediateWipeout = findBestImmediateWipeoutOption(node.state, node.legalMoves, rootPlayer, checkDeadline);
  if (immediateWipeout?.move) {
    removeMoveFromLegalMoves(node.legalMoves, immediateWipeout.move, immediateWipeout.legalMoveArrayIndex);
    stats.mctsGuidedPolicySelections += 1;
    stats.mctsImmediateWipeoutSelections += 1;
    stats.mctsImmediateWipeoutExpansionSelections += 1;
    const normalizedChild = normalizeDecisionState(immediateWipeout.childState);
    return {
      move: immediateWipeout.move,
      legalMoveArrayIndex: immediateWipeout.legalMoveArrayIndex,
      normalizedChild,
      moverPolicy: 1,
      priorPolicy: immediateWipeout.rootReward,
      priorReward: immediateWipeout.rootReward,
      isImmediateWipeout: true,
    };
  }

  const candidateLimit = Math.max(1, Math.min(config.guidedExpansionTopK, node.legalMoves.length));
  const candidates = scoreGuidedExpansionCandidates(node, rootPlayer, checkDeadline, config, caches, stats, candidateLimit);
  if (candidates.length === 0) {
    return null;
  }

  const selected = random() < config.guidedExpansionEpsilon
    ? candidates[Math.floor(random() * candidates.length)]
    : weightedPickBy(
      candidates,
      (entry, index) => (
        (candidates.length - index)
        + Math.max(0, entry.moverPolicy) * 2
        + (isCornerIndex(entry.move.index) ? 1.5 : 0)
      ),
      random,
    );
  if (!selected) {
    return null;
  }

  removeMoveFromLegalMoves(node.legalMoves, selected.move, selected.legalMoveArrayIndex);

  stats.mctsGuidedPolicySelections += 1;
  return selected;
}

function scoreGuidedRolloutCandidates(state, legalMoves, rootPlayer, checkDeadline, config, caches, stats, limit = legalMoves.length) {
  const openingPriorHit = getOpeningPriorHit(state, config, caches);
  const candidates = [];
  const candidateLimit = Math.max(1, Math.min(legalMoves.length, Math.round(limit)));

  for (let index = 0; index < legalMoves.length; index += 1) {
    if ((index % CANDIDATE_DEADLINE_CHECK_INTERVAL) === 0) {
      checkDeadline();
    }

    const move = legalMoves[index];
    const childState = state.applyMoveFast(move.index, move.flips ?? null);
    if (!childState) {
      continue;
    }

    const policy = composeGuidedMovePolicy({
      state,
      move,
      childState,
      rootPlayer,
      config,
      caches,
      openingPriorHit,
      stats,
    });

    insertTopCandidate(candidates, {
      move,
      childState,
      moverPolicy: policy.moverPolicy,
    }, compareGuidedRolloutCandidate, candidateLimit);
  }

  return candidates;
}

function pickGuidedRolloutMove(state, legalMoves, rootPlayer, random, checkDeadline, config, caches, stats) {
  const immediateWipeout = findBestImmediateWipeoutOption(state, legalMoves, rootPlayer, checkDeadline);
  if (immediateWipeout?.move) {
    stats.mctsGuidedPolicySelections += 1;
    stats.mctsImmediateWipeoutSelections += 1;
    stats.mctsImmediateWipeoutRolloutSelections += 1;
    return {
      move: immediateWipeout.move,
      childState: immediateWipeout.childState,
      isImmediateWipeout: true,
    };
  }

  let chosenCorner = null;
  let cornerCount = 0;
  for (let index = 0; index < legalMoves.length; index += 1) {
    const move = legalMoves[index];
    if (!isCornerIndex(move.index)) {
      continue;
    }
    cornerCount += 1;
    if (cornerCount === 1 || random() < (1 / cornerCount)) {
      chosenCorner = move;
    }
  }
  if (chosenCorner) {
    stats.mctsGuidedPolicySelections += 1;
    return {
      move: chosenCorner,
      childState: state.applyMoveFast(chosenCorner.index, chosenCorner.flips ?? null),
    };
  }

  const candidateLimit = Math.max(1, Math.min(config.guidedRolloutTopK, legalMoves.length));
  const candidates = scoreGuidedRolloutCandidates(state, legalMoves, rootPlayer, checkDeadline, config, caches, stats, candidateLimit);
  if (candidates.length === 0) {
    return null;
  }

  const selected = random() < config.guidedRolloutEpsilon
    ? candidates[Math.floor(random() * candidates.length)]
    : weightedPickBy(
      candidates,
      (entry, index) => (
        (candidates.length - index)
        + Math.max(0, entry.moverPolicy) * 2.5
      ),
      random,
    );

  stats.mctsGuidedPolicySelections += 1;
  return selected ?? null;
}

function rolloutFromNodeState(startState, rootPlayer, random, checkDeadline, stats, config, caches) {
  let current = startState;
  let rolloutPlies = 0;

  while (!current.isTerminal()) {
    if ((rolloutPlies % ROLLOUT_DEADLINE_CHECK_INTERVAL) === 0) {
      checkDeadline();
    }

    const solved = getSolvedStateForState(current, rootPlayer, checkDeadline, config, caches, stats);
    if (solved) {
      stats.mctsRollouts += 1;
      stats.mctsRolloutPlies += rolloutPlies;
      return clamp(solved.reward ?? 0, -1, 1);
    }

    if (
      config.useGuidedRollout
      && Number.isFinite(config.guidedRolloutCutoffPlies)
      && rolloutPlies >= config.guidedRolloutCutoffPlies
    ) {
      stats.mctsCutoffEvaluations += 1;
      stats.mctsRollouts += 1;
      stats.mctsRolloutPlies += rolloutPlies;
      return getHeuristicRewardForState(current, rootPlayer, config, caches);
    }

    const legalMoves = current.getSearchMoves();
    if (legalMoves.length === 0) {
      current = current.passTurnFast();
      continue;
    }

    const immediateWipeout = findBestImmediateWipeoutOption(current, legalMoves, rootPlayer, checkDeadline);
    if (immediateWipeout?.childState) {
      current = immediateWipeout.childState;
      rolloutPlies += 1;
      stats.mctsImmediateWipeoutSelections += 1;
      stats.mctsImmediateWipeoutRolloutSelections += 1;
      continue;
    }

    if (config.useGuidedRollout) {
      const chosen = pickGuidedRolloutMove(current, legalMoves, rootPlayer, random, checkDeadline, config, caches, stats);
      if (chosen?.childState) {
        current = chosen.childState;
        rolloutPlies += 1;
        continue;
      }
    }

    const moveIndex = legalMoves.length === 1
      ? 0
      : Math.floor(random() * legalMoves.length);
    const move = legalMoves[moveIndex];
    current = current.applyMoveFast(move.index, move.flips ?? null);
    rolloutPlies += 1;
  }

  stats.mctsRollouts += 1;
  stats.mctsRolloutPlies += rolloutPlies;
  return current.getDiscDifferential(rootPlayer) / 64;
}

function scoreHybridMinimaxCandidates(state, legalMoves, rootPlayer, checkDeadline, config, caches, stats) {
  const openingPriorHit = getOpeningPriorHit(state, config, caches);
  const candidates = [];
  const moverColor = state.currentPlayer;
  const candidateLimit = Math.max(1, config.hybridMinimaxTopK);

  for (let index = 0; index < legalMoves.length; index += 1) {
    if ((index % CANDIDATE_DEADLINE_CHECK_INTERVAL) === 0) {
      checkDeadline();
    }

    const move = legalMoves[index];
    const childState = state.applyMoveFast(move.index, move.flips ?? null);
    if (!childState) {
      continue;
    }

    const policy = composeGuidedMovePolicy({
      state,
      move,
      childState,
      rootPlayer,
      config,
      caches,
      openingPriorHit,
      stats,
    });
    const heuristicReward = getHeuristicRewardForState(childState, rootPlayer, config, caches);
    const moverHeuristicReward = moverColor === rootPlayer ? heuristicReward : -heuristicReward;
    let orderScore = (policy.moverPolicy * 1.35) + (moverHeuristicReward * 0.75);
    if (isCornerIndex(move.index)) {
      orderScore += 1.5;
    }

    insertTopCandidate(candidates, {
      move,
      childState,
      orderScore,
      moverPolicy: policy.moverPolicy,
      heuristicReward,
    }, compareHybridMinimaxCandidate, candidateLimit);
  }

  return candidates;
}

function runHybridMinimaxValue({
  state,
  depth,
  alpha,
  beta,
  rootPlayer,
  checkDeadline,
  config,
  caches,
  stats,
}) {
  const depthCache = getHybridMinimaxDepthCache(caches, depth);
  const hashKey = state.hashKey();
  if (depthCache.has(hashKey)) {
    stats.cacheHits += 1;
    return depthCache.get(hashKey);
  }

  stats.nodes += 1;
  if ((stats.nodes % HYBRID_MINIMAX_DEADLINE_CHECK_INTERVAL) === 0) {
    checkDeadline();
  }

  if (state.isTerminal() || depth <= 0) {
    const score = evaluateStateScoreForRoot(state, rootPlayer, config);
    depthCache.set(hashKey, score);
    return score;
  }

  const legalMoves = state.getSearchMoves();
  if (legalMoves.length === 0) {
    const score = runHybridMinimaxValue({
      state: state.passTurnFast(),
      depth: depth - 1,
      alpha,
      beta,
      rootPlayer,
      checkDeadline,
      config,
      caches,
      stats,
    });
    depthCache.set(hashKey, score);
    return score;
  }

  const immediateWipeout = findBestImmediateWipeoutOption(state, legalMoves, rootPlayer, checkDeadline);
  if (immediateWipeout?.childState) {
    const score = scoreTerminalStateForRoot(immediateWipeout.childState, rootPlayer);
    depthCache.set(hashKey, score);
    stats.mctsImmediateWipeoutHybridPriorHits += 1;
    return score;
  }

  const maximizing = state.currentPlayer === rootPlayer;
  const candidates = scoreHybridMinimaxCandidates(state, legalMoves, rootPlayer, checkDeadline, config, caches, null);
  let bestScore = maximizing ? -Infinity : Infinity;

  for (const candidate of candidates) {
    const value = runHybridMinimaxValue({
      state: candidate.childState,
      depth: depth - 1,
      alpha,
      beta,
      rootPlayer,
      checkDeadline,
      config,
      caches,
      stats,
    });

    if (maximizing) {
      bestScore = Math.max(bestScore, value);
      alpha = Math.max(alpha, bestScore);
    } else {
      bestScore = Math.min(bestScore, value);
      beta = Math.min(beta, bestScore);
    }

    if (alpha >= beta) {
      break;
    }
  }

  if (!Number.isFinite(bestScore)) {
    bestScore = evaluateStateScoreForRoot(state, rootPlayer, config);
  }

  depthCache.set(hashKey, bestScore);
  return bestScore;
}

function getHybridMinimaxPriorForState(state, rootPlayer, checkDeadline, config, caches, stats) {
  if (!config.useHybridMinimaxPrior || (config.hybridMinimaxDepth ?? 0) <= 0) {
    return null;
  }

  const depthCache = getHybridMinimaxDepthCache(caches, config.hybridMinimaxDepth);
  const hashKey = state.hashKey();
  if (depthCache.has(hashKey)) {
    const score = depthCache.get(hashKey);
    stats.mctsHybridPriorCacheHits += 1;
    return {
      score,
      reward: boundedTanh(score, HYBRID_MINIMAX_REWARD_SCALE),
    };
  }

  stats.mctsHybridPriorSearches += 1;
  const hybridStats = {
    nodes: 0,
    cacheHits: 0,
  };
  const score = runHybridMinimaxValue({
    state,
    depth: config.hybridMinimaxDepth,
    alpha: -Infinity,
    beta: Infinity,
    rootPlayer,
    checkDeadline,
    config,
    caches,
    stats: hybridStats,
  });
  stats.mctsHybridPriorNodes += hybridStats.nodes;
  stats.mctsHybridPriorCacheHits += hybridStats.cacheHits;

  return {
    score,
    reward: boundedTanh(score, HYBRID_MINIMAX_REWARD_SCALE),
  };
}

function resolveExpandedNodePrior({
  normalizedChild,
  expansion,
  rootPlayer,
  checkDeadline,
  config,
  caches,
  stats,
}) {
  let priorReward = expansion?.priorReward ?? 0;
  let priorPolicy = expansion?.priorPolicy ?? 0;
  let hybridPriorReward = null;
  let hybridPriorScore = null;

  if (config.useHybridMinimaxPrior && normalizedChild?.state) {
    const hybridPrior = getHybridMinimaxPriorForState(
      normalizedChild.state,
      rootPlayer,
      checkDeadline,
      config,
      caches,
      stats,
    );
    if (hybridPrior) {
      hybridPriorReward = hybridPrior.reward;
      hybridPriorScore = hybridPrior.score;
      priorReward = clamp(
        (priorReward * (1 - config.hybridMinimaxRewardWeight))
        + (hybridPrior.reward * config.hybridMinimaxRewardWeight),
        -1,
        1,
      );
      if ((config.hybridMinimaxPolicyBlend ?? 0) > 0) {
        priorPolicy = clamp(
          (priorPolicy * (1 - config.hybridMinimaxPolicyBlend))
          + (hybridPrior.reward * config.hybridMinimaxPolicyBlend),
          -1,
          1,
        );
      }
      stats.mctsHybridPriorUses += 1;
    }
  }

  return {
    priorReward,
    priorPolicy,
    priorVirtualVisits: config.priorVirtualVisits,
    hybridPriorReward,
    hybridPriorScore,
  };
}

function runMctsSearch({
  state,
  legalMoves,
  options = {},
  stats,
  checkDeadline,
  random = Math.random,
  variant = 'lite',
  evaluator = null,
  moveOrderingEvaluator = null,
  lookupOpeningPrior = null,
  solveState = null,
}) {
  const resolvedOptions = normalizeMctsOptions({
    ...options,
    evaluator,
    moveOrderingEvaluator,
    lookupOpeningPrior,
    solveState,
  }, variant);
  resolvedOptions.evaluator = evaluator;
  resolvedOptions.moveOrderingEvaluator = moveOrderingEvaluator;
  resolvedOptions.lookupOpeningPrior = lookupOpeningPrior;
  resolvedOptions.solveState = solveState;

  const rootPlayer = state.currentPlayer;
  const root = createRootNode(state, legalMoves);
  const caches = createGuidedCaches();
  let treeNodeCount = 1;
  let iterations = 0;
  let rootSolvedRecorded = false;

  const rootImmediateWipeout = findBestImmediateWipeoutOption(state, legalMoves, rootPlayer, checkDeadline);
  if (rootImmediateWipeout?.move) {
    const score = scoreTerminalStateForRoot(rootImmediateWipeout.childState, rootPlayer);
    stats.mctsImmediateWipeoutSelections += 1;
    stats.mctsImmediateWipeoutRootShortcuts += 1;
    stats.mctsTreeNodes = 1;
    stats.nodes = Math.max(stats.nodes ?? 0, 1);
    return {
      bestMoveIndex: rootImmediateWipeout.move.index,
      bestMoveCoord: rootImmediateWipeout.move.coord ?? indexToCoord(rootImmediateWipeout.move.index),
      score,
      principalVariation: [rootImmediateWipeout.move.index],
      analyzedMoves: [{
        index: rootImmediateWipeout.move.index,
        coord: rootImmediateWipeout.move.coord ?? indexToCoord(rootImmediateWipeout.move.index),
        score,
        principalVariation: [rootImmediateWipeout.move.index],
        flipCount: rootImmediateWipeout.move.flipCount ?? null,
        visits: 1,
        meanReward: rootImmediateWipeout.rootReward,
        effectiveMeanReward: rootImmediateWipeout.rootReward,
        forcedPasses: 0,
        priorPolicy: rootImmediateWipeout.rootReward,
        priorReward: rootImmediateWipeout.rootReward,
        hybridPriorReward: null,
        hybridPriorScore: null,
        immediateWipeout: true,
      }],
      didPass: false,
      searchCompletion: 'complete',
      rootAnalyzedMoveCount: 1,
      rootLegalMoveCount: legalMoves.length,
      mctsRootVisits: 1,
      mctsVariant: resolvedOptions.variant,
      immediateWipeoutRootShortcut: true,
    };
  }

  let rootThreatByMoveIndex = new Map();
  try {
    rootThreatByMoveIndex = collectRootThreatPenalties(state, legalMoves, rootPlayer, checkDeadline, stats);
  } catch (error) {
    if (!isTimeoutError(error)) {
      throw error;
    }
  }
  resolvedOptions.rootThreatByMoveIndex = rootThreatByMoveIndex;

  while (iterations < resolvedOptions.maxIterations) {
    try {
      checkDeadline();

      const path = [root];
      let node = root;

      while (
        node.solvedOutcome === null
        && node.legalMoves.length === 0
        && node.children.length > 0
        && !node.state.isTerminal()
      ) {
        node = selectChildForTraversal(node, rootPlayer, resolvedOptions.exploration, resolvedOptions, stats);
        if (!node) {
          break;
        }
        path.push(node);
        maybeSolveNode(node, rootPlayer, checkDeadline, resolvedOptions, caches, stats);
      }

      if (!node) {
        break;
      }

      if (node !== root) {
        maybeSolveNode(node, rootPlayer, checkDeadline, resolvedOptions, caches, stats);
      }
      if (
        node.solvedOutcome === null
        && !node.state.isTerminal()
        && node.legalMoves.length > 0
        && treeNodeCount < resolvedOptions.maxTreeNodes
      ) {
        const expansion = resolvedOptions.useGuidedSelection
          ? pickGuidedExpansionMove(node, rootPlayer, random, checkDeadline, resolvedOptions, caches, stats)
          : null;
        const expansionMove = expansion?.move ?? pickRandomExpansionMove(
          node,
          random,
          rootPlayer,
          stats,
          checkDeadline,
          resolvedOptions,
        );
        if (expansionMove) {
          const normalizedChild = expansion?.normalizedChild ?? normalizeDecisionState(
            node.state.applyMoveFast(expansionMove.index, expansionMove.flips ?? null),
          );
          if (normalizedChild?.state) {
            const resolvedPrior = resolveExpandedNodePrior({
              normalizedChild,
              expansion,
              rootPlayer,
              checkDeadline,
              config: resolvedOptions,
              caches,
              stats,
            });
            const childNode = createNodeFromNormalized(
              normalizedChild,
              expansionMove,
              resolvedPrior,
            );
            node.children.push(childNode);
            node = childNode;
            path.push(childNode);
            maybeSolveNode(node, rootPlayer, checkDeadline, resolvedOptions, caches, stats);
            treeNodeCount += 1;
          }
        }
      }

      const reward = node.solvedOutcome !== null
        ? clamp(node.solvedReward ?? 0, -1, 1)
        : rolloutFromNodeState(node.state, rootPlayer, random, checkDeadline, stats, resolvedOptions, caches);
      if (node.solvedOutcome !== null) {
        stats.mctsRollouts += 1;
      }
      for (const visitedNode of path) {
        visitedNode.visits += 1;
        visitedNode.valueSum += reward;
      }

      iterations += 1;
      for (let pathIndex = path.length - 1; pathIndex >= 0; pathIndex -= 1) {
        const pathNode = path[pathIndex];
        refreshSolvedStateFromChildren(pathNode, rootPlayer, stats);
        if (resolvedOptions.useScoreBounds) {
          refreshScoreBounds(pathNode, rootPlayer, stats);
          refreshSolvedStateFromScoreBounds(pathNode, rootPlayer, stats);
        }
        refreshProofNumbers(pathNode, rootPlayer, stats);
        refreshPerPlayerProofNumbers(pathNode, rootPlayer, stats);
      }
      if (root.solvedOutcome !== null) {
        if (!rootSolvedRecorded && stats) {
          stats.mctsSolverRootProofs += 1;
        }
        rootSolvedRecorded = true;
        break;
      }
    } catch (error) {
      if (isTimeoutError(error)) {
        break;
      }
      throw error;
    }
  }

  stats.mctsIterations = iterations;
  stats.mctsTreeNodes = treeNodeCount;
  stats.nodes = Math.max(
    stats.nodes ?? 0,
    treeNodeCount
      + (stats.mctsRolloutPlies ?? 0)
      + (stats.mctsCutoffEvaluations ?? 0)
      + (stats.mctsHybridPriorNodes ?? 0),
  );

  if (resolvedOptions.useScoreBounds) {
    refreshScoreBounds(root, rootPlayer, stats);
    refreshSolvedStateFromScoreBounds(root, rootPlayer, stats);
  }
  refreshProofNumbers(root, rootPlayer, stats);
  refreshPerPlayerProofNumbers(root, rootPlayer, stats);

  const completedChildren = root.children.filter((child) => (child.visits ?? 0) > 0);
  if (completedChildren.length === 0 || iterations <= 0) {
    return null;
  }

  const rootProofPriorityRanking = buildProofPriorityRanking(root, rootPlayer, resolvedOptions);
  const rootProofPriorityRootMaturityGateState = rootProofPriorityRanking?.rootMaturityGateState
    ?? (root.proofPriorityRootMaturityGateState ?? null);
  const effectiveProofMetricMode = rootProofPriorityRanking?.metricMode
    ?? resolvedOptions.proofMetricMode
    ?? 'legacy-root';
  const effectiveProofPriorityBiasMode = rootProofPriorityRanking?.biasMode
    ?? resolvedOptions.proofPriorityBiasMode
    ?? DEFAULT_MCTS_PROOF_PRIORITY_BIAS_MODE;
  const rootScoreBoundDrawPriorityRanking = buildScoreBoundDrawPriorityRanking(root, rootPlayer, resolvedOptions, null, completedChildren);
  const analyzedMoves = completedChildren.map((child) => {
    const actualMean = meanReward(child);
    const effectiveMean = (resolvedOptions.priorVirtualVisits ?? 0) > 0
      ? effectiveMeanReward(child)
      : actualMean;
    const reportedMean = child.visits > 0 ? actualMean : effectiveMean;
    const rootThreatPenalty = rootThreatByMoveIndex.get(child.moveIndex) ?? null;
    const solvedScore = Number.isFinite(child.solvedScore) ? child.solvedScore : null;
    const scoreLowerBound = getNodeScoreLowerBound(child);
    const scoreUpperBound = getNodeScoreUpperBound(child);
    const scoreBoundWidth = scoreUpperBound - scoreLowerBound;
    const proofPriorityMetadata = rootProofPriorityRanking?.byChild?.get(child) ?? null;
    const scoreBoundDrawPriorityMetadata = rootScoreBoundDrawPriorityRanking?.byChild?.get(child) ?? null;
    const rawScore = solvedScore ?? rewardToScore(reportedMean);
    const score = solvedScore ?? (
      rootThreatPenalty?.rewardPenalty > 0
        ? rewardToScore(clamp(reportedMean - rootThreatPenalty.rewardPenalty, -1, 1))
        : rawScore
    );
    return {
      index: child.moveIndex,
      coord: child.moveCoord ?? indexToCoord(child.moveIndex),
      score,
      rawScore,
      principalVariation: buildPrincipalVariationFromNode(child, resolvedOptions),
      flipCount: child.flipCount,
      visits: child.visits,
      meanReward: actualMean,
      effectiveMeanReward: effectiveMean,
      forcedPasses: child.forcedPasses,
      priorPolicy: child.priorPolicy,
      priorReward: child.priorReward,
      hybridPriorReward: child.hybridPriorReward,
      hybridPriorScore: child.hybridPriorScore,
      solvedOutcome: child.solvedOutcome,
      solvedSource: child.solvedSource,
      solvedExact: child.solvedExact,
      solvedScore,
      solvedReward: child.solvedReward,
      scoreLowerBound,
      scoreUpperBound,
      scoreBoundWidth,
      scoreBoundExact: scoreLowerBound === scoreUpperBound,
      pnProofNumber: child.proofNumber,
      pnDisproofNumber: child.disproofNumber,
      pnBlackProofNumber: getPerPlayerProofNumber(child, 'black'),
      pnWhiteProofNumber: getPerPlayerProofNumber(child, 'white'),
      pnMetricMode: rootProofPriorityRanking?.metricMode ?? resolvedOptions.proofMetricMode ?? 'legacy-root',
      pnMetricPlayer: rootProofPriorityRanking?.metricPlayer ?? null,
      pnMetricProofNumber: proofPriorityMetadata?.metric ?? null,
      pnSelectionMetric: rootProofPriorityRanking?.metricKey ?? null,
      pnRootBiasMode: rootProofPriorityRanking?.biasMode ?? resolvedOptions.proofPriorityBiasMode ?? DEFAULT_MCTS_PROOF_PRIORITY_BIAS_MODE,
      pnRootRank: proofPriorityMetadata?.rank ?? null,
      pnRootSelectionBonus: proofPriorityMetadata?.normalizedBonus ?? null,
      scoreBoundDrawPriorityMode: rootScoreBoundDrawPriorityRanking?.mode ?? null,
      scoreBoundDrawPriorityBlocker: Boolean(scoreBoundDrawPriorityMetadata?.blocker),
      scoreBoundDrawPriorityRank: scoreBoundDrawPriorityMetadata?.rank ?? null,
      scoreBoundDrawPriorityBonus: scoreBoundDrawPriorityMetadata?.normalizedBonus ?? null,
      mctsRootThreatPenaltyScore: solvedScore === null ? (rootThreatPenalty?.scorePenalty ?? 0) : 0,
      mctsRootThreatPenaltyReward: solvedScore === null ? (rootThreatPenalty?.rewardPenalty ?? 0) : 0,
      mctsRootThreatPenaltyRaw: solvedScore === null ? (rootThreatPenalty?.rawPenalty ?? 0) : 0,
      mctsRootThreatWorstReply: solvedScore === null ? (rootThreatPenalty?.worstReply ?? null) : null,
    };
  }).sort((left, right) => {
    const leftSolvedWin = left.solvedOutcome === 'win';
    const rightSolvedWin = right.solvedOutcome === 'win';
    if (leftSolvedWin !== rightSolvedWin) {
      return leftSolvedWin ? -1 : 1;
    }

    const leftSolvedLoss = left.solvedOutcome === 'loss';
    const rightSolvedLoss = right.solvedOutcome === 'loss';
    if (leftSolvedLoss !== rightSolvedLoss) {
      return leftSolvedLoss ? 1 : -1;
    }

    if (left.solvedOutcome !== null && right.solvedOutcome !== null) {
      const rankGap = solvedOutcomeRank(right.solvedOutcome) - solvedOutcomeRank(left.solvedOutcome);
      if (rankGap !== 0) {
        return rankGap;
      }

      if (left.solvedOutcome === 'win' && right.solvedOutcome === 'win') {
        const lowerGap = (right.scoreLowerBound ?? MIN_SCORE_BOUND) - (left.scoreLowerBound ?? MIN_SCORE_BOUND);
        if (lowerGap !== 0) {
          return lowerGap;
        }
        const upperGap = (right.scoreUpperBound ?? MAX_SCORE_BOUND) - (left.scoreUpperBound ?? MAX_SCORE_BOUND);
        if (upperGap !== 0) {
          return upperGap;
        }
      } else if (left.solvedOutcome === 'loss' && right.solvedOutcome === 'loss') {
        const upperGap = (right.scoreUpperBound ?? MAX_SCORE_BOUND) - (left.scoreUpperBound ?? MAX_SCORE_BOUND);
        if (upperGap !== 0) {
          return upperGap;
        }
        const lowerGap = (right.scoreLowerBound ?? MIN_SCORE_BOUND) - (left.scoreLowerBound ?? MIN_SCORE_BOUND);
        if (lowerGap !== 0) {
          return lowerGap;
        }
      } else {
        const widthGap = (left.scoreBoundWidth ?? Number.POSITIVE_INFINITY) - (right.scoreBoundWidth ?? Number.POSITIVE_INFINITY);
        if (widthGap !== 0) {
          return widthGap;
        }
      }

      const solvedScoreGap = (right.solvedScore ?? right.score ?? 0) - (left.solvedScore ?? left.score ?? 0);
      if (solvedScoreGap !== 0) {
        return solvedScoreGap;
      }
    }

    const leftThreatened = (left.mctsRootThreatPenaltyScore ?? 0) > 0;
    const rightThreatened = (right.mctsRootThreatPenaltyScore ?? 0) > 0;
    if (leftThreatened !== rightThreatened) {
      return leftThreatened ? 1 : -1;
    }

    if (leftThreatened && rightThreatened) {
      const penaltyGap = (left.mctsRootThreatPenaltyScore ?? 0) - (right.mctsRootThreatPenaltyScore ?? 0);
      if (penaltyGap !== 0) {
        return penaltyGap;
      }

      const scoreGap = (right.score ?? 0) - (left.score ?? 0);
      if (scoreGap !== 0) {
        return scoreGap;
      }
    }

    const visitGap = (right.visits ?? 0) - (left.visits ?? 0);
    if (visitGap !== 0) {
      return visitGap;
    }

    const scoreGap = (right.score ?? 0) - (left.score ?? 0);
    if (scoreGap !== 0) {
      return scoreGap;
    }

    return compareNodeIdentity(left, right);
  });

  const bestMove = analyzedMoves[0];
  return {
    bestMoveIndex: bestMove.index,
    bestMoveCoord: bestMove.coord,
    score: bestMove.score,
    principalVariation: [...bestMove.principalVariation],
    analyzedMoves,
    didPass: false,
    searchCompletion: 'complete',
    rootAnalyzedMoveCount: analyzedMoves.length,
    rootLegalMoveCount: legalMoves.length,
    mctsRootVisits: root.visits,
    mctsVariant: resolvedOptions.variant,
    mctsRootSolvedOutcome: root.solvedOutcome,
    mctsRootSolvedSource: root.solvedSource,
    mctsRootSolvedExact: root.solvedExact,
    mctsRootSolvedScore: root.solvedScore,
    mctsRootScoreLowerBound: getNodeScoreLowerBound(root),
    mctsRootScoreUpperBound: getNodeScoreUpperBound(root),
    mctsRootProofNumber: root.proofNumber,
    mctsRootDisproofNumber: root.disproofNumber,
    mctsRootBlackProofNumber: getPerPlayerProofNumber(root, 'black'),
    mctsRootWhiteProofNumber: getPerPlayerProofNumber(root, 'white'),
    mctsProofMetricMode: effectiveProofMetricMode,
    mctsProofMetricConfiguredMode: resolvedOptions.proofMetricMode ?? 'legacy-root',
    mctsScoreBoundsEnabled: Boolean(resolvedOptions.useScoreBounds),
    mctsProofPriorityMetric: rootProofPriorityRanking?.metricKey ?? null,
    mctsProofPriorityMetricMode: effectiveProofMetricMode,
    mctsProofPriorityMetricPlayer: rootProofPriorityRanking?.metricPlayer ?? null,
    mctsProofPriorityBiasMode: effectiveProofPriorityBiasMode,
    mctsProofPriorityConfiguredBiasMode: resolvedOptions.proofPriorityBiasMode ?? DEFAULT_MCTS_PROOF_PRIORITY_BIAS_MODE,
    mctsProofPriorityRootMaturityGateEnabled: Boolean(resolvedOptions.proofPriorityRootMaturityGateEnabled),
    mctsProofPriorityRootMaturityGateMode: resolvedOptions.proofPriorityRootMaturityGateMode ?? DEFAULT_MCTS_PROOF_PRIORITY_ROOT_MATURITY_GATE_MODE,
    mctsProofPriorityRootMaturityGateMetricMode: resolvedOptions.proofPriorityRootMaturityGateMetricMode ?? DEFAULT_MCTS_PROOF_PRIORITY_ROOT_MATURITY_GATE_METRIC_MODE,
    mctsProofPriorityRootMaturityGateBiasMode: resolvedOptions.proofPriorityRootMaturityGateBiasMode ?? DEFAULT_MCTS_PROOF_PRIORITY_ROOT_MATURITY_GATE_BIAS_MODE,
    mctsProofPriorityRootMaturityGateMinVisits: Number.isFinite(resolvedOptions.proofPriorityRootMaturityGateMinVisits)
      ? Math.max(0, Math.round(resolvedOptions.proofPriorityRootMaturityGateMinVisits))
      : DEFAULT_MCTS_PROOF_PRIORITY_ROOT_MATURITY_GATE_MIN_VISITS,
    mctsProofPriorityRootMaturityGateBestFiniteMetricThreshold: Number.isFinite(resolvedOptions.proofPriorityRootMaturityGateBestFiniteMetricThreshold)
      ? Math.max(0, Math.round(resolvedOptions.proofPriorityRootMaturityGateBestFiniteMetricThreshold))
      : DEFAULT_MCTS_PROOF_PRIORITY_ROOT_MATURITY_GATE_BEST_FINITE_METRIC_THRESHOLD,
    mctsProofPriorityRootMaturityGateRequireNoSolvedChild: Boolean(resolvedOptions.proofPriorityRootMaturityGateRequireNoSolvedChild),
    mctsProofPriorityRootMaturityGateMinDistinctFiniteMetricCount: Number.isFinite(resolvedOptions.proofPriorityRootMaturityGateMinDistinctFiniteMetricCount)
      ? Math.max(0, Math.round(resolvedOptions.proofPriorityRootMaturityGateMinDistinctFiniteMetricCount))
      : DEFAULT_MCTS_PROOF_PRIORITY_ROOT_MATURITY_GATE_MIN_DISTINCT_FINITE_METRIC_COUNT,
    mctsProofPriorityRootMaturityGateActivated: Boolean(rootProofPriorityRootMaturityGateState?.activated),
    mctsProofPriorityRootMaturityGateActivationCount: Number.isFinite(rootProofPriorityRootMaturityGateState?.activationCount)
      ? rootProofPriorityRootMaturityGateState.activationCount
      : 0,
    mctsProofPriorityRootMaturityGateActivationIteration: Number.isFinite(rootProofPriorityRootMaturityGateState?.activationIteration)
      ? rootProofPriorityRootMaturityGateState.activationIteration
      : null,
    mctsProofPriorityRootMaturityGateActivationReason: rootProofPriorityRootMaturityGateState?.activationReason ?? null,
    mctsProofPriorityRootMaturityGateLastEvaluationReason: rootProofPriorityRootMaturityGateState?.lastEvaluationReason ?? null,
    mctsProofPriorityRootMaturityGateLastBlockReason: rootProofPriorityRootMaturityGateState?.lastBlockReason ?? null,
    mctsProofPriorityRootMaturityGateFinalEligible: Boolean(rootProofPriorityRootMaturityGateState?.lastEligible),
    mctsProofPriorityRootMaturityGateSolvedCoverageRate: Number.isFinite(rootProofPriorityRootMaturityGateState?.lastSolvedCoverageRate)
      ? rootProofPriorityRootMaturityGateState.lastSolvedCoverageRate
      : null,
    mctsProofPriorityRootMaturityGateSolvedMoveCount: Number.isFinite(rootProofPriorityRootMaturityGateState?.lastSolvedMoveCount)
      ? rootProofPriorityRootMaturityGateState.lastSolvedMoveCount
      : 0,
    mctsProofPriorityRootMaturityGateBestFiniteMetric: Number.isFinite(rootProofPriorityRootMaturityGateState?.lastBestFiniteMetric)
      ? rootProofPriorityRootMaturityGateState.lastBestFiniteMetric
      : null,
    mctsProofPriorityRootMaturityGateSecondFiniteMetric: Number.isFinite(rootProofPriorityRootMaturityGateState?.lastSecondFiniteMetric)
      ? rootProofPriorityRootMaturityGateState.lastSecondFiniteMetric
      : null,
    mctsProofPriorityRootMaturityGateDistinctFiniteMetricCount: Number.isFinite(rootProofPriorityRootMaturityGateState?.lastDistinctFiniteMetricCount)
      ? rootProofPriorityRootMaturityGateState.lastDistinctFiniteMetricCount
      : 0,
    mctsScoreBoundDrawPriorityEnabled: Boolean(resolvedOptions.useScoreBoundDrawPriority),
    mctsScoreBoundDrawPriorityScale: resolvedOptions.scoreBoundDrawPriorityScale ?? 0,
    mctsScoreBoundDrawPriorityMode: rootScoreBoundDrawPriorityRanking?.mode ?? null,
    mctsScoreBoundDrawPriorityBlockerCount: rootScoreBoundDrawPriorityRanking?.blockerCount ?? 0,
  };
}

export function runMctsLiteSearch(args) {
  return runMctsSearch({
    ...args,
    variant: 'lite',
  });
}

export function runMctsGuidedSearch(args) {
  return runMctsSearch({
    ...args,
    variant: 'guided',
  });
}

export function runMctsHybridSearch(args) {
  return runMctsSearch({
    ...args,
    variant: 'hybrid',
  });
}
