#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  displayProjectPath,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  formatInteger,
  loadJsonFileIfPresent,
  parseArgs,
  resolveCliPath,
  resolveProjectPath,
  toPortablePath,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('search-move-ordering-top-pairs.mjs');
  const baseProfilePath = displayTrainingOutputPath('trained-move-ordering-profile.json');
  const outputJsonPath = displayProjectPath('benchmarks', 'stage43_move_ordering_top_pairs.json');
  const bestProfilePath = displayTrainingOutputPath('stage43_top_pair_best_move_ordering.json');
  console.log(`Usage:
  node ${toolPath} \
    [--base-profile ${baseProfilePath}] \
    [--output-json ${outputJsonPath}] \
    [--best-profile-json ${bestProfilePath}] \
    [--top-singles 8] [--pair-count 2] \
    [--features corners,cornerAdjacency,edgePattern,cornerPattern,parity] \
    [--feature-scales 0,0.25,0.5,0.75,1.25,1.5] \
    [--ranges 11-12] [--fallback-ranges 11-12] \
    [--seed-start 1] [--seed-count 2] \
    [--allow-verified-exact-tie-swaps]

설명:
- 먼저 single-action local search를 돌려 acceptable 후보를 정렬합니다.
- improving single 후보를 우선하고, 부족하면 나머지 acceptable single 후보로 top-N을 채웁니다.
- 그 top-N atomic action만 다시 pair(기본 2-action)로 좁혀 재탐색해서 비용을 통제합니다.
- 실제 후보 평가/안전성 판정은 기존 tune-move-ordering-search-cost.mjs를 그대로 사용합니다.
`);
}

function toFiniteInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function ensureDirectoryFor(filePath) {
  return fs.promises.mkdir(path.dirname(filePath), { recursive: true });
}

function runNodeScript(args, { cwd, label }) {
  console.log(`\n[${label}] ${args.join(' ')}`);
  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

function isImprovingCandidate(candidate) {
  return Number(candidate?.evaluation?.combined?.weightedNodeDeltaVsBasePercent) < 0;
}

function rangesIntersect(left, right) {
  return left?.minEmpties <= right?.maxEmpties && left?.maxEmpties >= right?.minEmpties;
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

function countValidCombinations(actions, pairCount) {
  let count = 0;
  const chosen = [];
  function walk(startIndex) {
    if (chosen.length === pairCount) {
      count += 1;
      return;
    }
    for (let index = startIndex; index < actions.length; index += 1) {
      const action = actions[index];
      if (chosen.some((existing) => actionsConflict(existing, action))) {
        continue;
      }
      chosen.push(action);
      walk(index + 1);
      chosen.pop();
    }
  }
  walk(0);
  return count;
}

function selectTopSinglesForPairSearch(rankedSingles, { topSingles, pairCount }) {
  const remaining = rankedSingles
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ candidate }) => candidate?.actions?.[0]?.id);
  const selectedSingles = [];
  const selectedAtomicActions = [];
  const selectedActionIds = [];

  while (remaining.length > 0) {
    let bestIndex = -1;
    let bestScore = null;
    for (let index = 0; index < remaining.length; index += 1) {
      const entry = remaining[index];
      const atomicAction = entry.candidate.actions[0];
      if (!atomicAction?.id || selectedActionIds.includes(atomicAction.id)) {
        continue;
      }
      const nextActions = [...selectedAtomicActions, atomicAction];
      const nextValidPairCount = countValidCombinations(nextActions, pairCount);
      const compatibilityCount = selectedAtomicActions.filter((existingAction) => !actionsConflict(existingAction, atomicAction)).length;
      const improvingBoost = isImprovingCandidate(entry.candidate) ? 1 : 0;
      const score = [
        nextValidPairCount,
        compatibilityCount,
        improvingBoost,
        -entry.index,
      ];
      if (!bestScore || score.some((value, pos) => value !== bestScore[pos]) && (
        score[0] > bestScore[0]
        || (score[0] === bestScore[0] && score[1] > bestScore[1])
        || (score[0] === bestScore[0] && score[1] === bestScore[1] && score[2] > bestScore[2])
        || (score[0] === bestScore[0] && score[1] === bestScore[1] && score[2] === bestScore[2] && score[3] > bestScore[3])
      )) {
        bestScore = score;
        bestIndex = index;
      }
    }

    if (bestIndex < 0) {
      break;
    }

    const [{ candidate }] = remaining.splice(bestIndex, 1);
    const atomicAction = candidate.actions[0];
    selectedSingles.push(candidate);
    selectedAtomicActions.push(atomicAction);
    selectedActionIds.push(atomicAction.id);

    const validPairCount = countValidCombinations(selectedAtomicActions, pairCount);
    const enoughSingles = selectedSingles.length >= topSingles;
    if (enoughSingles && validPairCount > 0) {
      break;
    }
  }

  return {
    selectedSingles,
    selectedAtomicActions,
    selectedActionIds,
    validPairCount: countValidCombinations(selectedAtomicActions, pairCount),
  };
}

function summarizeCandidate(candidate) {
  const exactMismatch = candidate?.agreement?.effectiveExactBestMoveMismatches ?? candidate?.agreement?.exactBestMoveMismatches ?? null;
  return {
    actionLabel: candidate?.actionLabel ?? null,
    actionCount: candidate?.actionCount ?? null,
    actionIds: (candidate?.actions ?? []).map((action) => action?.id).filter(Boolean),
    acceptable: Boolean(candidate?.acceptable),
    improving: isImprovingCandidate(candidate),
    weightedNodes: candidate?.evaluation?.combined?.weightedNodes ?? null,
    weightedNodeDeltaVsBasePercent: candidate?.evaluation?.combined?.weightedNodeDeltaVsBasePercent ?? null,
    depthNodes: candidate?.evaluation?.suites?.depth?.nodes ?? null,
    exactNodes: candidate?.evaluation?.suites?.exact?.nodes ?? null,
    exactScoreMismatches: candidate?.agreement?.exactScoreMismatches ?? null,
    effectiveExactBestMoveMismatches: exactMismatch,
    depthBestMoveMismatches: candidate?.agreement?.depthBestMoveMismatches ?? null,
    verifiedExactTieSwapCount: candidate?.agreement?.verifiedExactTieSwapCount ?? 0,
    profileName: candidate?.profileName ?? null,
  };
}

function buildTunerArgs({
  tunerPath,
  baseProfilePath,
  outputJsonPath,
  bestProfileJsonPath,
  features,
  featureScales,
  ranges,
  fallbackRanges,
  minActionsPerCandidate,
  maxActionsPerCandidate,
  seedStart,
  seedCount,
  passthroughArgs,
  allowedActionIds = null,
}) {
  const args = [
    tunerPath,
    '--base-profile', baseProfilePath,
    '--output-json', outputJsonPath,
    '--best-profile-json', bestProfileJsonPath,
    '--features', features,
    '--feature-scales', featureScales,
    '--ranges', ranges,
    '--fallback-ranges', fallbackRanges,
    '--min-actions-per-candidate', String(minActionsPerCandidate),
    '--max-actions-per-candidate', String(maxActionsPerCandidate),
    '--max-rounds', '1',
    '--seed-start', String(seedStart),
    '--seed-count', String(seedCount),
  ];
  if (allowedActionIds && allowedActionIds.length > 0) {
    args.push('--allowed-action-ids', allowedActionIds.join(','));
  }
  for (const [key, value] of passthroughArgs) {
    if (value === null || value === undefined || value === false) continue;
    if (value === true) {
      args.push(`--${key}`);
      continue;
    }
    if (Array.isArray(value)) {
      for (const entry of value) args.push(`--${key}`, String(entry));
      continue;
    }
    args.push(`--${key}`, String(value));
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const repoRoot = resolveProjectPath();
const tunerPath = path.join(repoRoot, 'tools', 'evaluator-training', 'tune-move-ordering-search-cost.mjs');
const baseProfilePath = args['base-profile'] ? resolveCliPath(args['base-profile']) : resolveCliPath(displayTrainingOutputPath('trained-move-ordering-profile.json'));
const outputJsonPath = args['output-json'] ? resolveCliPath(args['output-json']) : resolveCliPath(displayProjectPath('benchmarks', 'stage43_move_ordering_top_pairs.json'));
const bestProfileJsonPath = args['best-profile-json'] ? resolveCliPath(args['best-profile-json']) : resolveCliPath(displayTrainingOutputPath('stage43_top_pair_best_move_ordering.json'));

const baseProfile = loadJsonFileIfPresent(baseProfilePath);
if (!baseProfile) throw new Error(`base profile JSON을 읽을 수 없습니다: ${baseProfilePath}`);

const topSingles = Math.max(2, toFiniteInteger(args['top-singles'], 8));
const pairCount = Math.max(2, toFiniteInteger(args['pair-count'], 2));
const seedStart = Math.max(1, toFiniteInteger(args['seed-start'], 1));
const seedCount = Math.max(1, toFiniteInteger(args['seed-count'], 2));
const features = typeof args.features === 'string' && args.features.trim() !== '' ? args.features.trim() : 'corners,cornerAdjacency,edgePattern,cornerPattern,parity';
const featureScales = typeof args['feature-scales'] === 'string' && args['feature-scales'].trim() !== '' ? args['feature-scales'].trim() : '0,0.25,0.5,0.75,1.25,1.5';
const ranges = typeof args.ranges === 'string' && args.ranges.trim() !== '' ? args.ranges.trim() : '11-12';
const fallbackRanges = typeof args['fallback-ranges'] === 'string' && args['fallback-ranges'].trim() !== '' ? args['fallback-ranges'].trim() : '11-12';

const singleOutputJsonPath = args['single-output-json'] ? resolveCliPath(args['single-output-json']) : path.join(os.tmpdir(), `stage43_single_${Date.now()}.json`);
const pairOutputJsonPath = args['pair-output-json'] ? resolveCliPath(args['pair-output-json']) : path.join(os.tmpdir(), `stage43_pair_${Date.now()}.json`);
const singleBestProfileJsonPath = args['single-best-profile-json'] ? resolveCliPath(args['single-best-profile-json']) : path.join(os.tmpdir(), `stage43_single_best_${Date.now()}.json`);

const passthroughKeySet = new Set([
  'evaluation-profile',
  'max-actions-per-round',
  'max-exact-score-mismatches',
  'max-exact-best-move-mismatches',
  'max-depth-best-move-mismatches',
  'allow-verified-exact-tie-swaps',
  'depth-weight',
  'exact-weight',
  'depth-empties',
  'exact-empties',
  'repetitions',
  'time-limit-ms',
  'max-depth',
  'depth-exact-endgame-empties',
  'exact-time-limit-ms',
  'exact-max-depth',
  'exact-endgame-empties',
  'include-zero-weights',
  'progress-every',
]);
const passthroughArgs = [...passthroughKeySet].filter((key) => Object.hasOwn(args, key)).map((key) => [key, args[key]]);

await ensureDirectoryFor(outputJsonPath);
await ensureDirectoryFor(bestProfileJsonPath);
await ensureDirectoryFor(singleOutputJsonPath);
await ensureDirectoryFor(pairOutputJsonPath);
await ensureDirectoryFor(singleBestProfileJsonPath);

console.log(`Base profile       : ${baseProfile?.name ?? path.basename(baseProfilePath)}`);
console.log(`Top singles        : ${topSingles}`);
console.log(`Pair action count  : ${pairCount}`);
console.log(`Ranges             : ${ranges}`);
console.log(`Fallback ranges    : ${fallbackRanges}`);
console.log(`Seeds              : ${seedStart}..${seedStart + seedCount - 1}`);

const singleArgs = buildTunerArgs({
  tunerPath,
  baseProfilePath,
  outputJsonPath: singleOutputJsonPath,
  bestProfileJsonPath: singleBestProfileJsonPath,
  features,
  featureScales,
  ranges,
  fallbackRanges,
  minActionsPerCandidate: 1,
  maxActionsPerCandidate: 1,
  seedStart,
  seedCount,
  passthroughArgs,
});
runNodeScript(singleArgs, { cwd: repoRoot, label: 'single-pass' });

const singleSummary = JSON.parse(fs.readFileSync(singleOutputJsonPath, 'utf8'));
const singleCandidates = Array.isArray(singleSummary?.rounds?.[0]?.candidates) ? singleSummary.rounds[0].candidates : [];
const acceptableSingles = singleCandidates.filter((candidate) => candidate?.acceptable);
const improvingSingles = acceptableSingles.filter(isImprovingCandidate);
const remainingSingles = acceptableSingles.filter((candidate) => !isImprovingCandidate(candidate));
const rankedSingles = [...improvingSingles, ...remainingSingles];
const {
  selectedSingles,
  selectedActionIds,
  selectedAtomicActions,
  validPairCount,
} = selectTopSinglesForPairSearch(rankedSingles, { topSingles, pairCount });
if (selectedActionIds.length < pairCount || validPairCount === 0) {
  throw new Error(`pair 재탐색에 필요한 compatible single action이 부족합니다. selected=${selectedActionIds.length}, validPairs=${validPairCount}`);
}

console.log(`\nSelected single actions (${formatInteger(selectedActionIds.length)} | validPairs=${formatInteger(validPairCount)}): ${selectedActionIds.join(', ')}`);

const pairArgs = buildTunerArgs({
  tunerPath,
  baseProfilePath,
  outputJsonPath: pairOutputJsonPath,
  bestProfileJsonPath,
  features,
  featureScales,
  ranges,
  fallbackRanges,
  minActionsPerCandidate: pairCount,
  maxActionsPerCandidate: pairCount,
  seedStart,
  seedCount,
  passthroughArgs,
  allowedActionIds: selectedActionIds,
});
runNodeScript(pairArgs, { cwd: repoRoot, label: 'pair-pass' });

const pairSummary = JSON.parse(fs.readFileSync(pairOutputJsonPath, 'utf8'));
const pairCandidates = Array.isArray(pairSummary?.rounds?.[0]?.candidates) ? pairSummary.rounds[0].candidates : [];
const bestPairCandidate = pairCandidates[0] ?? null;
const selectedPairCandidate = pairSummary?.rounds?.[0]?.selectedCandidate ?? null;

const summary = {
  generatedAt: new Date().toISOString(),
  baseProfileName: baseProfile?.name ?? null,
  baseProfilePath: toPortablePath(path.relative(repoRoot, baseProfilePath) || path.basename(baseProfilePath)),
  options: { topSingles, pairCount, features, featureScales, ranges, fallbackRanges, seedStart, seedCount, passthroughArgs: Object.fromEntries(passthroughArgs) },
  rawOutputs: {
    singleOutputJsonPath: toPortablePath(path.relative(repoRoot, singleOutputJsonPath) || path.basename(singleOutputJsonPath)),
    pairOutputJsonPath: toPortablePath(path.relative(repoRoot, pairOutputJsonPath) || path.basename(pairOutputJsonPath)),
    bestProfileJsonPath: toPortablePath(path.relative(repoRoot, bestProfileJsonPath) || path.basename(bestProfileJsonPath)),
  },
  singlePass: {
    baseEvaluation: singleSummary?.rounds?.[0]?.baseEvaluation ?? singleSummary?.final?.evaluation ?? null,
    candidateCount: singleCandidates.length,
    acceptableCount: acceptableSingles.length,
    improvingCount: improvingSingles.length,
    selectedSingles: selectedSingles.map(summarizeCandidate),
  },
  pairPass: {
    baseEvaluation: pairSummary?.rounds?.[0]?.baseEvaluation ?? pairSummary?.final?.evaluation ?? null,
    candidateCount: pairCandidates.length,
    validPairCount,
    selectedActionIds,
    bestPairCandidate: bestPairCandidate ? summarizeCandidate(bestPairCandidate) : null,
    selectedCandidate: selectedPairCandidate ? summarizeCandidate(selectedPairCandidate) : null,
    finalImprovementVsBase: pairSummary?.final?.improvementVsBase ?? null,
    finalAgreementVsBase: pairSummary?.final?.agreementVsBase ?? null,
  },
};

await fs.promises.writeFile(outputJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(`\nSaved top-pair summary to ${outputJsonPath}`);
