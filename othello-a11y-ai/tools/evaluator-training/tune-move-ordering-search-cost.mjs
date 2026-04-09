#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_EVALUATION_PROFILE } from '../../js/ai/evaluation-profiles.js';
import {
  playSeededRandomUntilEmptyCount,
  runMedianSearch,
} from '../../js/test/benchmark-helpers.mjs';
import {
  buildProfileStageMetadata,
  displayProjectPath,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  ensureArray,
  formatInteger,
  loadJsonFileIfPresent,
  MOVE_ORDERING_REGRESSION_FEATURE_KEYS,
  parseArgs,
  resolveCliPath,
  sanitizeMoveOrderingProfileForModule,
  toPortablePath,
} from './lib.mjs';
import { auditExactBestMoveTieSwap } from './exact-root-tie-utils.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('tune-move-ordering-search-cost.mjs');
  const evaluationProfilePath = displayTrainingOutputPath('trained-evaluation-profile.json');
  const moveOrderingProfilePath = displayTrainingOutputPath('trained-move-ordering-profile.json');
  const outputJsonPath = displayProjectPath('benchmarks', 'stage39_move_ordering_local_search.json');
  const bestProfilePath = displayTrainingOutputPath('stage39_local_search_best_move_ordering.json');
  console.log(`Usage:
  node ${toolPath} \
    [--evaluation-profile ${evaluationProfilePath}] \
    [--base-profile ${moveOrderingProfilePath}] \
    [--output-json ${outputJsonPath}] \
    [--best-profile-json ${bestProfilePath}] \
    [--features mobility,cornerAdjacency,edgePattern,cornerPattern,discDifferential] \
    [--feature-scales 0,0.25,0.5,0.75] \
    [--ranges 10-10,11-12,15-16,17-18] \
    [--fallback-ranges 15-16,17-18] \
    [--allowed-action-ids drop:11-12,scale:edgePattern:11-12:0.25] \
    [--max-rounds 1] [--max-actions-per-round 64] \
    [--min-actions-per-candidate 1] [--max-actions-per-candidate 1] \
    [--max-exact-score-mismatches 0] [--max-exact-best-move-mismatches 0] [--max-depth-best-move-mismatches 0] \
    [--allow-verified-exact-tie-swaps] \
    [--depth-weight 1] [--exact-weight 1] \
    [--depth-empties 17,15] [--exact-empties 13,11] \
    [--seed-start 1] [--seed-count 2] [--repetitions 1] \
    [--time-limit-ms 1500] [--max-depth 6] [--depth-exact-endgame-empties 10] \
    [--exact-time-limit-ms 4000] [--exact-max-depth 12] [--exact-endgame-empties 14]

설명:
- 현재 move-ordering profile에서 feature scale / bucket fallback 후보를 자동 생성하고,
  실제 검색 비용(nodes/time)과 root output agreement를 함께 비교하는 local-search tuner입니다.
- scale 후보는 각 trained bucket에 대해 독립적으로 생성됩니다.
- fallback 후보는 겹치는 trained bucket을 제거해서 runtime fallback ordering을 사용하게 합니다.
- --allowed-action-ids 로 허용한 atomic action id만 후보로 남겨, 상위 single action만 다시 pair로 좁혀 재탐색할 수 있습니다.
- round마다 가장 안전한(기본값: exact score/best move, depth best move 불일치 0) 개선안을 하나 채택해 다음 round로 진행합니다.
- --min-actions-per-candidate / --max-actions-per-candidate 로 독립적인 action 조합 후보(예: 2-action pair)를
  같은 round 안에서 함께 평가할 수 있습니다.
- --allow-verified-exact-tie-swaps 를 주면, exact score는 같지만 best move만 달라진 케이스를
  별도 exact root move scoring으로 다시 검사해서 실제 동점 최적수(safe tie swap)면 허용합니다.
`);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function toFiniteInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function toFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function roundWeight(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function parseEmptiesList(value, fallback) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [...fallback];
  }
  const parsed = value
    .split(',')
    .map((token) => Number(token.trim()))
    .filter((token) => Number.isInteger(token) && token >= 1 && token <= 40)
    .sort((left, right) => right - left);
  return parsed.length > 0 ? parsed : [...fallback];
}

function parseNumberList(value, fallback) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [...fallback];
  }
  const parsed = value
    .split(',')
    .map((token) => toFiniteNumber(token.trim(), null))
    .filter((token) => Number.isFinite(token));
  return parsed.length > 0 ? parsed : [...fallback];
}

function parseIdSet(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const parsed = value
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
  return parsed.length > 0 ? new Set(parsed) : null;
}

function parseFeatureList(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [
      'mobility',
      'cornerAdjacency',
      'edgePattern',
      'cornerPattern',
      'discDifferential',
    ];
  }
  const features = value.split(',').map((token) => token.trim()).filter(Boolean);
  return [...new Set(features.filter((feature) => MOVE_ORDERING_REGRESSION_FEATURE_KEYS.includes(feature)))];
}

function parseRangeSpec(rawRange) {
  const rangeText = String(rawRange ?? '').trim();
  const match = rangeText.match(/^(\d+)(?:-(\d+))?$/);
  if (!match) {
    throw new Error(`잘못된 empties range 형식입니다: ${rangeText}`);
  }
  const minEmpties = Number(match[1]);
  const maxEmpties = Number(match[2] ?? match[1]);
  if (!Number.isInteger(minEmpties) || !Number.isInteger(maxEmpties) || minEmpties < 0 || maxEmpties < minEmpties) {
    throw new Error(`유효하지 않은 empties range입니다: ${rangeText}`);
  }
  return {
    key: `${minEmpties}-${maxEmpties}`,
    minEmpties,
    maxEmpties,
  };
}

function parseRangeList(value, fallback) {
  if (typeof value !== 'string' || value.trim() === '') {
    return fallback.map(parseRangeSpec);
  }
  const parsed = value.split(',').map((token) => parseRangeSpec(token.trim()));
  const unique = new Map(parsed.map((range) => [range.key, range]));
  return [...unique.values()];
}

function rangesIntersect(left, right) {
  return left.minEmpties <= right.maxEmpties && left.maxEmpties >= right.minEmpties;
}

function createSearchOptions({ evaluationProfile, moveOrderingProfile, timeLimitMs, maxDepth, exactEndgameEmpties, aspirationWindow = 40, exactMode = false }) {
  return {
    presetKey: 'custom',
    styleKey: 'balanced',
    maxDepth,
    timeLimitMs,
    exactEndgameEmpties,
    aspirationWindow,
    randomness: 0,
    evaluationProfile,
    moveOrderingProfile,
    ...(exactMode ? {
      optimizedFewEmptiesExactSolver: true,
      specializedFewEmptiesExactSolver: true,
      exactFastestFirstOrdering: true,
      enhancedTranspositionCutoff: true,
      enhancedTranspositionCutoffWld: true,
    } : {}),
    wldPreExactEmpties: 0,
  };
}

function createAggregate() {
  return {
    cases: 0,
    nodes: 0,
    elapsedMs: 0,
    ttHits: 0,
    exactCases: 0,
  };
}

function updateAggregate(aggregate, summary) {
  aggregate.cases += 1;
  aggregate.nodes += Number(summary.nodes ?? 0);
  aggregate.elapsedMs += Number(summary.elapsedMs ?? 0);
  aggregate.ttHits += Number(summary.ttHits ?? 0);
  aggregate.exactCases += summary.exact ? 1 : 0;
}

function finalizeAggregate(aggregate) {
  return {
    cases: aggregate.cases,
    nodes: aggregate.nodes,
    elapsedMs: aggregate.elapsedMs,
    ttHits: aggregate.ttHits,
    exactCases: aggregate.exactCases,
  };
}

function percentageDelta(base, candidate) {
  if (!Number.isFinite(base) || base === 0 || !Number.isFinite(candidate)) {
    return null;
  }
  return ((candidate - base) / base) * 100;
}

function suiteOptionsFromArgs(args) {
  return {
    depth: {
      key: 'depth',
      emptiesList: parseEmptiesList(args['depth-empties'], [17, 15]),
      options: {
        timeLimitMs: Math.max(50, toFiniteInteger(args['time-limit-ms'], 1500)),
        maxDepth: Math.max(1, toFiniteInteger(args['max-depth'], 6)),
        exactEndgameEmpties: Math.max(0, toFiniteInteger(args['depth-exact-endgame-empties'], 10)),
      },
    },
    exact: {
      key: 'exact',
      emptiesList: parseEmptiesList(args['exact-empties'], [13, 11]),
      options: {
        timeLimitMs: Math.max(1000, toFiniteInteger(args['exact-time-limit-ms'], 4000)),
        maxDepth: Math.max(1, toFiniteInteger(args['exact-max-depth'], 12)),
        exactEndgameEmpties: Math.max(0, toFiniteInteger(args['exact-endgame-empties'], 14)),
      },
    },
  };
}

function buildRootCases({ depthSuite, exactSuite, seedStart, seedCount }) {
  const cases = [];
  for (const suite of [depthSuite, exactSuite]) {
    for (const empties of suite.emptiesList) {
      for (let seed = seedStart; seed < (seedStart + seedCount); seed += 1) {
        cases.push({
          suite: suite.key,
          empties,
          seed,
          state: playSeededRandomUntilEmptyCount(empties, seed),
        });
      }
    }
  }
  return cases;
}

function caseKey(testCase) {
  return `${testCase.suite}:${testCase.empties}:${testCase.seed}`;
}

function buildActionSlugPart(text) {
  return String(text)
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function compactScaleValue(value) {
  if (!Number.isFinite(value)) {
    return 'na';
  }
  const rounded = Math.round(value * 1000) / 1000;
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }
  return String(rounded).replace(/\./g, 'p');
}

function describeAction(action) {
  if (action.type === 'drop-range') {
    return `fallback@${action.range.key}`;
  }
  return `${action.featureKey}@${action.range.key}=x${action.scale}`;
}

function actionSlug(action) {
  if (action.type === 'drop-range') {
    return `fallback-${buildActionSlugPart(action.range.key)}`;
  }
  return `${buildActionSlugPart(action.featureKey)}-${buildActionSlugPart(action.range.key)}-x${compactScaleValue(action.scale)}`;
}

function describeActionChain(actions) {
  if (!Array.isArray(actions) || actions.length === 0) {
    return '(none)';
  }
  return actions.map((action) => describeAction(action)).join(' + ');
}

function actionChainSlug(actions) {
  if (!Array.isArray(actions) || actions.length === 0) {
    return 'none';
  }
  return actions.map((action) => actionSlug(action)).join('__');
}

function actionsConflict(left, right) {
  if (!left || !right) {
    return false;
  }
  if (left.id && right.id && left.id === right.id) {
    return true;
  }
  if (left.type === 'drop-range' && right.type === 'drop-range') {
    return rangesIntersect(left.range, right.range);
  }
  if (left.type === 'drop-range' || right.type === 'drop-range') {
    const dropAction = left.type === 'drop-range' ? left : right;
    const otherAction = left.type === 'drop-range' ? right : left;
    return rangesIntersect(dropAction.range, otherAction.range);
  }
  return left.featureKey === right.featureKey && rangesIntersect(left.range, right.range);
}

function createDerivedProfile(baseProfile, { name, description, actionChain, derivedFromPath }) {
  const nextProfile = cloneJson(sanitizeMoveOrderingProfileForModule(baseProfile));
  nextProfile.name = name;
  nextProfile.description = description;
  nextProfile.stage = buildProfileStageMetadata({
    kind: 'move-ordering-profile',
    status: 'derived-search-cost-local-search',
    derivedFromProfileName: baseProfile.name ?? null,
    ...(derivedFromPath ? { derivedFromProfilePath: toPortablePath(derivedFromPath) } : {}),
  });
  const baseSource = baseProfile && typeof baseProfile.source === 'object' && baseProfile.source
    ? cloneJson(baseProfile.source)
    : {};
  nextProfile.source = {
    ...baseSource,
    derivedFromProfileName: baseProfile.name ?? null,
    ...(derivedFromPath ? { derivedFromProfilePath: toPortablePath(derivedFromPath) } : {}),
    derivedAt: new Date().toISOString(),
    tuning: {
      type: 'search-cost-local-search',
      actionChain: actionChain.map((action) => ({
        type: action.type,
        ...(action.featureKey ? { featureKey: action.featureKey } : {}),
        range: action.range,
        ...(Number.isFinite(action.scale) ? { scale: action.scale } : {}),
      })),
    },
  };
  const baseDiagnostics = baseProfile && typeof baseProfile.diagnostics === 'object' && baseProfile.diagnostics
    ? cloneJson(baseProfile.diagnostics)
    : {};
  const {
    derivedVariant: _ignoredDerivedVariant,
    localSearch: _ignoredLocalSearch,
    ...baseDiagnosticsRest
  } = baseDiagnostics;
  nextProfile.diagnostics = {
    ...baseDiagnosticsRest,
    localSearch: {
      baseProfileName: baseProfile.name ?? null,
      ...(derivedFromPath ? { derivedFromProfilePath: toPortablePath(derivedFromPath) } : {}),
      actionChain: actionChain.map((action) => ({
        label: describeAction(action),
        type: action.type,
        ...(action.featureKey ? { featureKey: action.featureKey } : {}),
        range: action.range,
        ...(Number.isFinite(action.scale) ? { scale: action.scale } : {}),
      })),
    },
  };
  return nextProfile;
}

function applyScaleAction(profile, action) {
  const next = cloneJson(sanitizeMoveOrderingProfileForModule(profile));
  let changed = false;
  for (const bucket of next.trainedBuckets ?? []) {
    if (!rangesIntersect(bucket, action.range)) {
      continue;
    }
    const before = Number(bucket.weights?.[action.featureKey] ?? 0);
    const after = roundWeight(before * action.scale);
    if (after !== before) {
      bucket.weights[action.featureKey] = after;
      changed = true;
    }
  }
  return changed ? next : null;
}

function applyDropRangeAction(profile, action) {
  const next = cloneJson(sanitizeMoveOrderingProfileForModule(profile));
  const beforeLength = Array.isArray(next.trainedBuckets) ? next.trainedBuckets.length : 0;
  next.trainedBuckets = (next.trainedBuckets ?? []).filter((bucket) => !rangesIntersect(bucket, action.range));
  return next.trainedBuckets.length !== beforeLength ? next : null;
}

function applyAtomicAction(profile, action) {
  return action.type === 'drop-range'
    ? applyDropRangeAction(profile, action)
    : applyScaleAction(profile, action);
}

function applyAction(profile, action, metadata) {
  const modified = applyAtomicAction(profile, action);
  if (!modified) {
    return null;
  }
  return createDerivedProfile(modified, metadata);
}

function applyActionChain(profile, actions, metadata) {
  let currentProfile = cloneJson(sanitizeMoveOrderingProfileForModule(profile));
  let changed = false;
  for (const action of actions) {
    const nextProfile = applyAtomicAction(currentProfile, action);
    if (!nextProfile) {
      return null;
    }
    currentProfile = nextProfile;
    changed = true;
  }
  if (!changed) {
    return null;
  }
  return createDerivedProfile(currentProfile, metadata);
}

function buildCandidateActions(profile, { ranges, features, featureScales, fallbackRanges, maxActionsPerRound, includeZeroWeights, allowedActionIds = null }) {
  const normalizedProfile = sanitizeMoveOrderingProfileForModule(profile);
  const actions = [];
  const seen = new Set();

  for (const bucket of normalizedProfile.trainedBuckets ?? []) {
    for (const range of ranges) {
      if (!rangesIntersect(bucket, range)) {
        continue;
      }

      if (fallbackRanges.some((fallbackRange) => rangesIntersect(range, fallbackRange))) {
        const key = `drop:${range.key}`;
        if (!seen.has(key)) {
          seen.add(key);
          actions.push({ type: 'drop-range', range, id: key });
        }
      }

      for (const featureKey of features) {
        const currentWeight = Number(bucket.weights?.[featureKey] ?? 0);
        if (!includeZeroWeights && currentWeight === 0) {
          continue;
        }
        for (const scale of featureScales) {
          const nextWeight = roundWeight(currentWeight * scale);
          if (nextWeight === currentWeight) {
            continue;
          }
          const key = `scale:${featureKey}:${range.key}:${scale}`;
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);
          actions.push({
            type: 'scale',
            featureKey,
            range,
            scale,
            id: key,
          });
        }
      }
    }
  }

  const filteredActions = allowedActionIds instanceof Set
    ? actions.filter((action) => allowedActionIds.has(action.id))
    : actions;

  return maxActionsPerRound > 0 ? filteredActions.slice(0, maxActionsPerRound) : filteredActions;
}

function buildCandidateActionChains(actions, { minActionsPerCandidate, maxActionsPerCandidate }) {
  const normalizedMin = Math.max(1, Math.min(minActionsPerCandidate, maxActionsPerCandidate));
  const normalizedMax = Math.max(normalizedMin, maxActionsPerCandidate);
  const chains = [];
  const currentChain = [];

  function walk(startIndex) {
    if (currentChain.length >= normalizedMin && currentChain.length <= normalizedMax) {
      chains.push([...currentChain]);
    }
    if (currentChain.length >= normalizedMax) {
      return;
    }
    for (let index = startIndex; index < actions.length; index += 1) {
      const action = actions[index];
      if (currentChain.some((existingAction) => actionsConflict(existingAction, action))) {
        continue;
      }
      currentChain.push(action);
      walk(index + 1);
      currentChain.pop();
    }
  }

  walk(0);
  return chains;
}

function summarizeAgreement({
  candidateCases,
  baselineByKey,
  rootCaseByKey = null,
  baselineProfile = null,
  candidateProfile = null,
  evaluationProfile = null,
  exactVerificationOptions = null,
  allowVerifiedExactTieSwaps = false,
}) {
  const summary = {
    exactScoreMatches: 0,
    exactScoreMismatches: 0,
    exactBestMoveMatches: 0,
    exactBestMoveMismatches: 0,
    depthBestMoveMatches: 0,
    depthBestMoveMismatches: 0,
    depthScoreMatches: 0,
    depthScoreMismatches: 0,
    verifiedExactTieSwapCount: 0,
    effectiveExactBestMoveMismatches: 0,
    unverifiedExactBestMoveMismatches: 0,
    verifiedExactTieSwaps: [],
  };
  const exactTieMismatchCases = [];

  for (const candidateCase of candidateCases) {
    const baseline = baselineByKey.get(caseKey(candidateCase));
    if (!baseline) {
      continue;
    }
    if (candidateCase.suite === 'exact') {
      if (candidateCase.summary.score === baseline.summary.score) {
        summary.exactScoreMatches += 1;
      } else {
        summary.exactScoreMismatches += 1;
      }
      if (candidateCase.summary.bestMove === baseline.summary.bestMove) {
        summary.exactBestMoveMatches += 1;
      } else {
        summary.exactBestMoveMismatches += 1;
        if (candidateCase.summary.score === baseline.summary.score) {
          exactTieMismatchCases.push({
            key: caseKey(candidateCase),
            candidateCase,
            baseline,
          });
        }
      }
    } else {
      if (candidateCase.summary.bestMove === baseline.summary.bestMove) {
        summary.depthBestMoveMatches += 1;
      } else {
        summary.depthBestMoveMismatches += 1;
      }
      if (candidateCase.summary.score === baseline.summary.score) {
        summary.depthScoreMatches += 1;
      } else {
        summary.depthScoreMismatches += 1;
      }
    }
  }

  if (allowVerifiedExactTieSwaps && rootCaseByKey && evaluationProfile && exactVerificationOptions) {
    for (const mismatch of exactTieMismatchCases) {
      const rootCase = rootCaseByKey.get(mismatch.key);
      if (!rootCase?.state) {
        continue;
      }
      const audit = auditExactBestMoveTieSwap(rootCase.state, {
        evaluationProfile,
        referenceProfile: baselineProfile,
        candidateProfile,
        referenceSummary: mismatch.baseline.summary,
        candidateSummary: mismatch.candidateCase.summary,
        verificationProfile: candidateProfile,
        ...exactVerificationOptions,
        enumerateAllLegalMoves: false,
      });
      if (!audit.verifiedTieSwap) {
        continue;
      }
      summary.verifiedExactTieSwapCount += 1;
      summary.verifiedExactTieSwaps.push({
        suite: mismatch.candidateCase.suite,
        empties: mismatch.candidateCase.empties,
        seed: mismatch.candidateCase.seed,
        sharedScore: audit.sharedScore,
        baselineBestMove: audit.reference.bestMove,
        candidateBestMove: audit.candidate.bestMove,
        verifiedMoveScores: audit.scoredMoves.map((entry) => ({
          coord: entry.coord,
          exactScore: entry.exactScore,
        })),
      });
    }
  }

  summary.effectiveExactBestMoveMismatches = Math.max(0, summary.exactBestMoveMismatches - summary.verifiedExactTieSwapCount);
  summary.unverifiedExactBestMoveMismatches = summary.effectiveExactBestMoveMismatches;
  return summary;
}

function evaluateProfile({ profile, evaluationProfile, rootCases, depthSuite, exactSuite, repetitions, depthWeight, exactWeight }) {
  const bySuite = {
    depth: createAggregate(),
    exact: createAggregate(),
  };
  const cases = [];

  for (const testCase of rootCases) {
    const suiteConfig = testCase.suite === 'exact' ? exactSuite : depthSuite;
    const summary = runMedianSearch(
      testCase.state,
      createSearchOptions({
        evaluationProfile,
        moveOrderingProfile: profile,
        ...suiteConfig.options,
        aspirationWindow: testCase.suite === 'exact' ? 0 : 40,
        exactMode: testCase.suite === 'exact',
      }),
      repetitions,
    ).summary;

    updateAggregate(bySuite[testCase.suite], summary);
    cases.push({
      suite: testCase.suite,
      empties: testCase.empties,
      seed: testCase.seed,
      summary,
    });
  }

  const finalizedDepth = finalizeAggregate(bySuite.depth);
  const finalizedExact = finalizeAggregate(bySuite.exact);
  const combinedNodes = finalizedDepth.nodes + finalizedExact.nodes;
  const weightedNodes = (finalizedDepth.nodes * depthWeight) + (finalizedExact.nodes * exactWeight);
  const combinedElapsedMs = finalizedDepth.elapsedMs + finalizedExact.elapsedMs;

  return {
    profileName: profile?.name ?? null,
    suites: {
      depth: finalizedDepth,
      exact: finalizedExact,
    },
    combined: {
      nodes: combinedNodes,
      weightedNodes,
      elapsedMs: combinedElapsedMs,
    },
    cases,
  };
}

function compareCandidateRank(left, right) {
  if (left.acceptable !== right.acceptable) {
    return left.acceptable ? -1 : 1;
  }
  const leftExactScoreMismatches = left.agreement.exactScoreMismatches;
  const rightExactScoreMismatches = right.agreement.exactScoreMismatches;
  if (leftExactScoreMismatches !== rightExactScoreMismatches) {
    return leftExactScoreMismatches - rightExactScoreMismatches;
  }
  const leftExactBestMoveMismatches = left.agreement.effectiveExactBestMoveMismatches ?? left.agreement.exactBestMoveMismatches;
  const rightExactBestMoveMismatches = right.agreement.effectiveExactBestMoveMismatches ?? right.agreement.exactBestMoveMismatches;
  if (leftExactBestMoveMismatches !== rightExactBestMoveMismatches) {
    return leftExactBestMoveMismatches - rightExactBestMoveMismatches;
  }
  const leftDepthBestMoveMismatches = left.agreement.depthBestMoveMismatches;
  const rightDepthBestMoveMismatches = right.agreement.depthBestMoveMismatches;
  if (leftDepthBestMoveMismatches !== rightDepthBestMoveMismatches) {
    return leftDepthBestMoveMismatches - rightDepthBestMoveMismatches;
  }
  if (left.evaluation.combined.weightedNodes !== right.evaluation.combined.weightedNodes) {
    return left.evaluation.combined.weightedNodes - right.evaluation.combined.weightedNodes;
  }
  if (left.evaluation.suites.exact.nodes !== right.evaluation.suites.exact.nodes) {
    return left.evaluation.suites.exact.nodes - right.evaluation.suites.exact.nodes;
  }
  if (left.evaluation.suites.depth.nodes !== right.evaluation.suites.depth.nodes) {
    return left.evaluation.suites.depth.nodes - right.evaluation.suites.depth.nodes;
  }
  return left.actionLabel.localeCompare(right.actionLabel);
}

function decorateCandidateResult({
  actions,
  profile,
  baselineProfile,
  evaluation,
  baselineEvaluation,
  baselineByKey,
  rootCaseByKey,
  evaluationProfile,
  exactVerificationOptions,
  allowVerifiedExactTieSwaps,
  thresholds,
}) {
  const agreement = summarizeAgreement({
    candidateCases: evaluation.cases,
    baselineByKey,
    rootCaseByKey,
    baselineProfile,
    candidateProfile: profile,
    evaluationProfile,
    exactVerificationOptions,
    allowVerifiedExactTieSwaps,
  });
  const acceptable = agreement.exactScoreMismatches <= thresholds.maxExactScoreMismatches
    && agreement.effectiveExactBestMoveMismatches <= thresholds.maxExactBestMoveMismatches
    && agreement.depthBestMoveMismatches <= thresholds.maxDepthBestMoveMismatches;
  return {
    action: actions.length === 1 ? actions[0] : null,
    actions,
    actionCount: actions.length,
    actionLabel: describeActionChain(actions),
    actionSlug: actionChainSlug(actions),
    profileName: profile.name ?? null,
    acceptable,
    agreement,
    evaluation: {
      profileName: evaluation.profileName,
      suites: {
        depth: {
          ...evaluation.suites.depth,
          nodeDeltaVsBasePercent: percentageDelta(baselineEvaluation.suites.depth.nodes, evaluation.suites.depth.nodes),
          elapsedDeltaVsBasePercent: percentageDelta(baselineEvaluation.suites.depth.elapsedMs, evaluation.suites.depth.elapsedMs),
        },
        exact: {
          ...evaluation.suites.exact,
          nodeDeltaVsBasePercent: percentageDelta(baselineEvaluation.suites.exact.nodes, evaluation.suites.exact.nodes),
          elapsedDeltaVsBasePercent: percentageDelta(baselineEvaluation.suites.exact.elapsedMs, evaluation.suites.exact.elapsedMs),
        },
      },
      combined: {
        ...evaluation.combined,
        nodeDeltaVsBasePercent: percentageDelta(baselineEvaluation.combined.nodes, evaluation.combined.nodes),
        weightedNodeDeltaVsBasePercent: percentageDelta(baselineEvaluation.combined.weightedNodes, evaluation.combined.weightedNodes),
        elapsedDeltaVsBasePercent: percentageDelta(baselineEvaluation.combined.elapsedMs, evaluation.combined.elapsedMs),
      },
    },
  };
}

function candidateImproves(candidate, baselineEvaluation) {
  return candidate.acceptable
    && candidate.evaluation.combined.weightedNodes < baselineEvaluation.combined.weightedNodes;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const evaluationProfilePath = args['evaluation-profile'] ? resolveCliPath(args['evaluation-profile']) : null;
const baseProfilePath = args['base-profile'] ? resolveCliPath(args['base-profile']) : resolveCliPath(displayTrainingOutputPath('trained-move-ordering-profile.json'));
const outputJsonPath = args['output-json'] ? resolveCliPath(args['output-json']) : null;
const bestProfileJsonPath = args['best-profile-json'] ? resolveCliPath(args['best-profile-json']) : null;

const evaluationProfile = loadJsonFileIfPresent(evaluationProfilePath) ?? DEFAULT_EVALUATION_PROFILE;
const baseProfile = loadJsonFileIfPresent(baseProfilePath);
if (!baseProfile) {
  throw new Error(`base profile JSON을 읽을 수 없습니다: ${baseProfilePath}`);
}

const normalizedBaseProfile = sanitizeMoveOrderingProfileForModule(baseProfile);
const features = parseFeatureList(args.features);
if (features.length === 0) {
  throw new Error('최소 하나 이상의 유효한 feature가 필요합니다.');
}
const featureScales = parseNumberList(args['feature-scales'], [0, 0.25, 0.5, 0.75])
  .filter((value, index, array) => Number.isFinite(value) && array.indexOf(value) === index)
  .sort((left, right) => left - right);
const ranges = parseRangeList(args.ranges, ['10-10', '11-12', '15-16', '17-18']);
const fallbackRanges = parseRangeList(args['fallback-ranges'], ['15-16', '17-18']);
const includeZeroWeights = Boolean(args['include-zero-weights']);
const allowedActionIds = parseIdSet(args['allowed-action-ids']);
const maxRounds = Math.max(1, toFiniteInteger(args['max-rounds'], 1));
const maxActionsPerRound = Math.max(0, toFiniteInteger(args['max-actions-per-round'], 64));
const minActionsPerCandidate = Math.max(1, toFiniteInteger(args['min-actions-per-candidate'], 1));
const maxActionsPerCandidate = Math.max(minActionsPerCandidate, toFiniteInteger(args['max-actions-per-candidate'], 1));
const seedStart = Math.max(1, toFiniteInteger(args['seed-start'], 1));
const seedCount = Math.max(1, toFiniteInteger(args['seed-count'], 2));
const repetitions = Math.max(1, toFiniteInteger(args.repetitions, 1));
const depthWeight = Math.max(0, toFiniteNumber(args['depth-weight'], 1));
const exactWeight = Math.max(0, toFiniteNumber(args['exact-weight'], 1));
const allowVerifiedExactTieSwaps = Boolean(args['allow-verified-exact-tie-swaps']);
const progressEvery = Math.max(0, toFiniteInteger(args['progress-every'], 0));
const thresholds = {
  maxExactScoreMismatches: Math.max(0, toFiniteInteger(args['max-exact-score-mismatches'], 0)),
  maxExactBestMoveMismatches: Math.max(0, toFiniteInteger(args['max-exact-best-move-mismatches'], 0)),
  maxDepthBestMoveMismatches: Math.max(0, toFiniteInteger(args['max-depth-best-move-mismatches'], 0)),
};

const suiteMap = suiteOptionsFromArgs(args);
const depthSuite = suiteMap.depth;
const exactSuite = suiteMap.exact;
const rootCases = buildRootCases({ depthSuite, exactSuite, seedStart, seedCount });
const rootCaseByKey = new Map(rootCases.map((entry) => [caseKey(entry), entry]));
const exactVerificationOptions = {
  timeLimitMs: exactSuite.options.timeLimitMs,
  maxDepth: exactSuite.options.maxDepth,
  exactEndgameEmpties: exactSuite.options.exactEndgameEmpties,
};

console.log(`Evaluation profile : ${evaluationProfile.name ?? 'default-eval'}`);
console.log(`Base profile       : ${normalizedBaseProfile.name ?? path.basename(baseProfilePath ?? 'move-ordering.json')}`);
console.log(`Features           : ${features.join(', ')}`);
console.log(`Feature scales     : ${featureScales.join(', ')}`);
console.log(`Ranges             : ${ranges.map((range) => range.key).join(', ')}`);
console.log(`Fallback ranges    : ${fallbackRanges.map((range) => range.key).join(', ') || '(none)'}`);
console.log(`Allowed action ids : ${allowedActionIds ? [...allowedActionIds].join(', ') : '(all)'}`);
console.log(`Seeds              : ${seedStart}..${seedStart + seedCount - 1} | repetitions=${repetitions}`);
console.log(`Depth suite        : empties=${depthSuite.emptiesList.join(', ')} depth=${depthSuite.options.maxDepth} exact=${depthSuite.options.exactEndgameEmpties}`);
console.log(`Exact suite        : empties=${exactSuite.emptiesList.join(', ')} depth=${exactSuite.options.maxDepth} exact=${exactSuite.options.exactEndgameEmpties}`);
console.log(`Safety thresholds  : exactScore<=${thresholds.maxExactScoreMismatches}, exactBest<=${thresholds.maxExactBestMoveMismatches}, depthBest<=${thresholds.maxDepthBestMoveMismatches}`);
console.log(`Verified tie swaps : ${allowVerifiedExactTieSwaps}`);
console.log(`Candidate actions  : min=${minActionsPerCandidate} max=${maxActionsPerCandidate}`);
console.log(`Allowed actions    : ${allowedActionIds ? formatInteger(allowedActionIds.size) : '(all generated actions)'}`);
console.log(`Progress logging   : ${progressEvery > 0 ? `every ${progressEvery} candidate(s)` : 'off'}`);

const rounds = [];
let currentProfile = normalizedBaseProfile;
let currentActionChain = [];
let currentEvaluation = evaluateProfile({
  profile: currentProfile,
  evaluationProfile,
  rootCases,
  depthSuite,
  exactSuite,
  repetitions,
  depthWeight,
  exactWeight,
});
const initialEvaluation = currentEvaluation;
const initialEvaluationByKey = new Map(initialEvaluation.cases.map((entry) => [caseKey(entry), entry]));

console.log(`Base nodes         : depth=${formatInteger(currentEvaluation.suites.depth.nodes)} exact=${formatInteger(currentEvaluation.suites.exact.nodes)} combined=${formatInteger(currentEvaluation.combined.nodes)} weighted=${formatInteger(currentEvaluation.combined.weightedNodes)}`);

for (let roundIndex = 0; roundIndex < maxRounds; roundIndex += 1) {
  const actions = buildCandidateActions(currentProfile, {
    ranges,
    features,
    featureScales,
    fallbackRanges,
    maxActionsPerRound,
    includeZeroWeights,
    allowedActionIds,
  });
  const actionChains = buildCandidateActionChains(actions, {
    minActionsPerCandidate,
    maxActionsPerCandidate,
  });
  console.log(
    `\n[round ${roundIndex + 1}] current=${currentProfile.name ?? '(unnamed)'} `
    + `atomicActions=${formatInteger(actions.length)} candidateChains=${formatInteger(actionChains.length)}`,
  );

  const baselineByKey = new Map(currentEvaluation.cases.map((entry) => [caseKey(entry), entry]));
  const candidates = [];
  let progressBestCandidate = null;
  const progressWidth = String(actionChains.length || 1).length;

  for (const actionsForCandidate of actionChains) {
    const nextActionChain = [...currentActionChain, ...actionsForCandidate];
    const candidateProfileName = `${currentProfile.name ?? 'move-ordering'}__${actionChainSlug(actionsForCandidate)}`;
    const candidateProfile = applyActionChain(currentProfile, actionsForCandidate, {
      name: candidateProfileName,
      description: `${currentProfile.description ?? 'move-ordering profile'} (${describeActionChain(actionsForCandidate)} tuned by search-cost local search)`,
      actionChain: nextActionChain,
      derivedFromPath: baseProfilePath ? path.relative(process.cwd(), baseProfilePath) : null,
    });
    if (!candidateProfile) {
      continue;
    }

    const evaluation = evaluateProfile({
      profile: candidateProfile,
      evaluationProfile,
      rootCases,
      depthSuite,
      exactSuite,
      repetitions,
      depthWeight,
      exactWeight,
    });

    const candidateResult = decorateCandidateResult({
      actions: actionsForCandidate,
      profile: candidateProfile,
      baselineProfile: currentProfile,
      evaluation,
      baselineEvaluation: currentEvaluation,
      baselineByKey,
      rootCaseByKey,
      evaluationProfile,
      exactVerificationOptions,
      allowVerifiedExactTieSwaps,
      thresholds,
    });
    candidates.push(candidateResult);
    if (!progressBestCandidate || compareCandidateRank(candidateResult, progressBestCandidate) < 0) {
      progressBestCandidate = candidateResult;
    }
    if (progressEvery > 0 && (candidates.length % progressEvery) === 0) {
      const weightedDeltaText = Number.isFinite(candidateResult.evaluation.combined.weightedNodeDeltaVsBasePercent)
        ? `${candidateResult.evaluation.combined.weightedNodeDeltaVsBasePercent.toFixed(2)}%`
        : 'n/a';
      const bestWeightedDeltaText = Number.isFinite(progressBestCandidate?.evaluation?.combined?.weightedNodeDeltaVsBasePercent)
        ? `${progressBestCandidate.evaluation.combined.weightedNodeDeltaVsBasePercent.toFixed(2)}%`
        : 'n/a';
      console.log(
        `    progress ${String(candidates.length).padStart(progressWidth)}/${actionChains.length}: `
        + `${candidateResult.actionLabel} -> weighted ${formatInteger(candidateResult.evaluation.combined.weightedNodes)} (${weightedDeltaText}), `
        + `best=${progressBestCandidate?.actionLabel ?? 'n/a'} (${bestWeightedDeltaText})`,
      );
    }
  }

  candidates.sort(compareCandidateRank);

  const selectedCandidate = candidates.find((candidate) => candidateImproves(candidate, currentEvaluation)) ?? null;
  const roundSummary = {
    round: roundIndex + 1,
    baseProfileName: currentProfile.name ?? null,
    baseEvaluation: currentEvaluation,
    actionCount: actions.length,
    atomicActionCount: actions.length,
    candidateActionCount: actionChains.length,
    candidateCount: candidates.length,
    candidates,
    selectedCandidate,
  };
  rounds.push(roundSummary);

  console.log(`  evaluated candidates : ${formatInteger(candidates.length)}`);
  for (const candidate of candidates.slice(0, Math.min(8, candidates.length))) {
    const deltaText = Number.isFinite(candidate.evaluation.combined.weightedNodeDeltaVsBasePercent)
      ? `${candidate.evaluation.combined.weightedNodeDeltaVsBasePercent.toFixed(2)}%`
      : 'n/a';
    console.log(
      `  ${candidate.actionLabel.padEnd(56)} acceptable=${String(candidate.acceptable).padEnd(5)} `
      + `weighted=${formatInteger(candidate.evaluation.combined.weightedNodes).padStart(8)} (${deltaText.padStart(8)}) `
      + `exactMismatch=${candidate.agreement.exactScoreMismatches}/${candidate.agreement.effectiveExactBestMoveMismatches}`
      + (candidate.agreement.verifiedExactTieSwapCount > 0 ? `(+${candidate.agreement.verifiedExactTieSwapCount}tie)` : '')
      + ` depthMismatch=${candidate.agreement.depthBestMoveMismatches}`,
    );
  }

  if (!selectedCandidate) {
    console.log('  no acceptable improving action found; stopping local search.');
    break;
  }

  console.log(`  selected           : ${selectedCandidate.actionLabel}`);
  currentActionChain = [...currentActionChain, ...selectedCandidate.actions];
  const nextProfile = applyActionChain(currentProfile, selectedCandidate.actions, {
    name: `${normalizedBaseProfile.name ?? 'move-ordering'}__local-search-r${roundIndex + 1}-${selectedCandidate.actionSlug}`,
    description: `${normalizedBaseProfile.description ?? 'move-ordering profile'} (local-search tuned through ${selectedCandidate.actionLabel})`,
    actionChain: currentActionChain,
    derivedFromPath: baseProfilePath ? path.relative(process.cwd(), baseProfilePath) : null,
  });
  if (!nextProfile) {
    console.log('  selected action could not be reapplied; stopping local search.');
    break;
  }
  currentProfile = nextProfile;
  currentEvaluation = evaluateProfile({
    profile: currentProfile,
    evaluationProfile,
    rootCases,
    depthSuite,
    exactSuite,
    repetitions,
    depthWeight,
    exactWeight,
  });
}

const finalAgreementVsBase = summarizeAgreement({
  candidateCases: currentEvaluation.cases,
  baselineByKey: initialEvaluationByKey,
  rootCaseByKey,
  baselineProfile: normalizedBaseProfile,
  candidateProfile: currentProfile,
  evaluationProfile,
  exactVerificationOptions,
  allowVerifiedExactTieSwaps,
});

const summary = {
  generatedAt: new Date().toISOString(),
  evaluationProfileName: evaluationProfile.name ?? null,
  baseProfileName: normalizedBaseProfile.name ?? null,
  baseProfilePath: baseProfilePath ? toPortablePath(path.relative(process.cwd(), baseProfilePath) || path.basename(baseProfilePath)) : null,
  options: {
    features,
    featureScales,
    ranges,
    fallbackRanges,
    includeZeroWeights,
    allowedActionIds: allowedActionIds ? [...allowedActionIds] : null,
    maxRounds,
    maxActionsPerRound,
    minActionsPerCandidate,
    maxActionsPerCandidate,
    seedStart,
    seedCount,
    repetitions,
    depthWeight,
    exactWeight,
    allowVerifiedExactTieSwaps,
    thresholds,
    depthSuite: {
      emptiesList: depthSuite.emptiesList,
      options: depthSuite.options,
    },
    exactSuite: {
      emptiesList: exactSuite.emptiesList,
      options: exactSuite.options,
    },
  },
  rounds,
  final: {
    profile: currentProfile,
    actionChain: currentActionChain.map((action) => ({
      label: describeAction(action),
      type: action.type,
      ...(action.featureKey ? { featureKey: action.featureKey } : {}),
      range: action.range,
      ...(Number.isFinite(action.scale) ? { scale: action.scale } : {}),
    })),
    evaluation: currentEvaluation,
    agreementVsBase: finalAgreementVsBase,
    improvementVsBase: {
      depthNodeDeltaPercent: percentageDelta(initialEvaluation.suites.depth.nodes, currentEvaluation.suites.depth.nodes),
      exactNodeDeltaPercent: percentageDelta(initialEvaluation.suites.exact.nodes, currentEvaluation.suites.exact.nodes),
      combinedNodeDeltaPercent: percentageDelta(initialEvaluation.combined.nodes, currentEvaluation.combined.nodes),
      weightedNodeDeltaPercent: percentageDelta(initialEvaluation.combined.weightedNodes, currentEvaluation.combined.weightedNodes),
    },
  },
};

if (outputJsonPath) {
  await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
  await fs.promises.writeFile(outputJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(`\nSaved tuning summary to ${outputJsonPath}`);
}

if (bestProfileJsonPath) {
  await fs.promises.mkdir(path.dirname(bestProfileJsonPath), { recursive: true });
  await fs.promises.writeFile(bestProfileJsonPath, `${JSON.stringify(currentProfile, null, 2)}\n`, 'utf8');
  console.log(`Saved best profile to ${bestProfileJsonPath}`);
}
