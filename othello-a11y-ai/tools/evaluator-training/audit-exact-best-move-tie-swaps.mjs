#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_EVALUATION_PROFILE } from '../../js/ai/evaluation-profiles.js';
import { playSeededRandomUntilEmptyCount } from '../../js/test/benchmark-helpers.mjs';
import {
  displayProjectPath,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  formatInteger,
  loadJsonFileIfPresent,
  parseArgs,
  resolveCliPath,
  toPortablePath,
} from './lib.mjs';
import {
  auditExactBestMoveTieSwap,
  runExactRootSearch,
} from './exact-root-tie-utils.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('audit-exact-best-move-tie-swaps.mjs');
  const evaluationProfilePath = displayTrainingOutputPath('trained-evaluation-profile.json');
  const referenceProfilePath = displayTrainingOutputPath('stage39_candidateC_before_candidateD.json');
  const candidateProfilePath = displayTrainingOutputPath('trained-move-ordering-profile.json');
  const outputJsonPath = displayProjectPath('benchmarks', 'stage40_exact_best_move_tie_swap_audit.json');
  console.log(`Usage:
  node ${toolPath} \
    --reference-profile ${referenceProfilePath} \
    --candidate-profile ${candidateProfilePath} \
    [--evaluation-profile ${evaluationProfilePath}] \
    [--output-json ${outputJsonPath}] \
    [--empties 11,12,13] [--seed-start 1] [--seed-count 12] \
    [--time-limit-ms 60000] [--max-depth 12] [--exact-endgame-empties 14] \
    [--enumerate-all-legal-moves]

동일 exact score인데 best move만 달라진 케이스를 다시 exact root move scoring으로 감사해서
실제로 동점 최적수(safe tie swap)인지 확인합니다.
`);
}

function toFiniteInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function parseEmptiesList(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [11, 12, 13];
  }
  return value
    .split(',')
    .map((token) => Number(token.trim()))
    .filter((token) => Number.isInteger(token) && token >= 1 && token <= 20)
    .sort((left, right) => right - left);
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h || !args['reference-profile'] || !args['candidate-profile']) {
  printUsage();
  process.exit(args.help || args.h ? 0 : 1);
}

const referenceProfilePath = resolveCliPath(args['reference-profile']);
const candidateProfilePath = resolveCliPath(args['candidate-profile']);
const evaluationProfilePath = args['evaluation-profile'] ? resolveCliPath(args['evaluation-profile']) : null;
const outputJsonPath = args['output-json'] ? resolveCliPath(args['output-json']) : null;

const referenceProfile = loadJsonFileIfPresent(referenceProfilePath);
const candidateProfile = loadJsonFileIfPresent(candidateProfilePath);
const evaluationProfile = loadJsonFileIfPresent(evaluationProfilePath) ?? DEFAULT_EVALUATION_PROFILE;
if (!referenceProfile) {
  throw new Error(`reference profile JSON을 읽을 수 없습니다: ${referenceProfilePath}`);
}
if (!candidateProfile) {
  throw new Error(`candidate profile JSON을 읽을 수 없습니다: ${candidateProfilePath}`);
}

const emptiesList = parseEmptiesList(args.empties);
const seedStart = Math.max(1, toFiniteInteger(args['seed-start'], 1));
const seedCount = Math.max(1, toFiniteInteger(args['seed-count'], 12));
const timeLimitMs = Math.max(1_000, toFiniteInteger(args['time-limit-ms'], 60_000));
const maxDepth = Math.max(1, toFiniteInteger(args['max-depth'], 12));
const exactEndgameEmpties = Math.max(0, toFiniteInteger(args['exact-endgame-empties'], 14));
const enumerateAllLegalMoves = Boolean(args['enumerate-all-legal-moves']);

console.log(`Reference profile : ${referenceProfile.name ?? path.basename(referenceProfilePath)}`);
console.log(`Candidate profile : ${candidateProfile.name ?? path.basename(candidateProfilePath)}`);
console.log(`Evaluation profile: ${evaluationProfile.name ?? 'default-eval'}`);
console.log(`Exact cases       : empties=${emptiesList.join(', ')} seeds=${seedStart}..${seedStart + seedCount - 1}`);
console.log(`Options           : maxDepth=${maxDepth} exactEndgameEmpties=${exactEndgameEmpties} timeLimitMs=${timeLimitMs}`);
console.log(`Enumerate all legal moves: ${enumerateAllLegalMoves}`);

const cases = [];
const summary = {
  totalCases: 0,
  sameScoreCases: 0,
  sameBestMoveCases: 0,
  scoreMismatchCases: 0,
  rawBestMoveMismatchCases: 0,
  verifiedTieSwapCases: 0,
  unverifiedBestMoveMismatchCases: 0,
};

for (const empties of emptiesList) {
  for (let seed = seedStart; seed < (seedStart + seedCount); seed += 1) {
    summary.totalCases += 1;
    const state = playSeededRandomUntilEmptyCount(empties, seed);
    const referenceResult = runExactRootSearch(state, {
      evaluationProfile,
      moveOrderingProfile: referenceProfile,
      timeLimitMs,
      maxDepth,
      exactEndgameEmpties,
    });
    const candidateResult = runExactRootSearch(state, {
      evaluationProfile,
      moveOrderingProfile: candidateProfile,
      timeLimitMs,
      maxDepth,
      exactEndgameEmpties,
    });

    const caseAudit = auditExactBestMoveTieSwap(state, {
      evaluationProfile,
      referenceProfile,
      candidateProfile,
      referenceSummary: referenceResult,
      candidateSummary: candidateResult,
      verificationProfile: candidateProfile,
      timeLimitMs,
      maxDepth,
      exactEndgameEmpties,
      enumerateAllLegalMoves,
    });

    if (caseAudit.sameScore) {
      summary.sameScoreCases += 1;
    } else {
      summary.scoreMismatchCases += 1;
    }
    if (caseAudit.sameBestMove) {
      summary.sameBestMoveCases += 1;
    } else {
      summary.rawBestMoveMismatchCases += 1;
      if (caseAudit.verifiedTieSwap) {
        summary.verifiedTieSwapCases += 1;
      } else {
        summary.unverifiedBestMoveMismatchCases += 1;
      }
    }

    cases.push({
      empties,
      seed,
      reference: {
        bestMove: caseAudit.reference.bestMove,
        score: caseAudit.reference.score,
        nodes: referenceResult.stats?.nodes ?? null,
        elapsedMs: referenceResult.stats?.elapsedMs ?? null,
      },
      candidate: {
        bestMove: caseAudit.candidate.bestMove,
        score: caseAudit.candidate.score,
        nodes: candidateResult.stats?.nodes ?? null,
        elapsedMs: candidateResult.stats?.elapsedMs ?? null,
      },
      audit: caseAudit,
    });

    const marker = caseAudit.sameBestMove
      ? '='
      : (caseAudit.verifiedTieSwap ? '~' : '!');
    console.log(
      `empties=${empties} seed=${String(seed).padStart(2, '0')} ${marker} `
      + `${caseAudit.reference.bestMove}/${caseAudit.reference.score} -> ${caseAudit.candidate.bestMove}/${caseAudit.candidate.score} `
      + `nodes ${formatInteger(referenceResult.stats?.nodes ?? 0)} -> ${formatInteger(candidateResult.stats?.nodes ?? 0)}`,
    );
  }
}

const output = {
  generatedAt: new Date().toISOString(),
  evaluationProfileName: evaluationProfile.name ?? null,
  referenceProfileName: referenceProfile.name ?? null,
  candidateProfileName: candidateProfile.name ?? null,
  referenceProfilePath: toPortablePath(path.relative(process.cwd(), referenceProfilePath) || path.basename(referenceProfilePath)),
  candidateProfilePath: toPortablePath(path.relative(process.cwd(), candidateProfilePath) || path.basename(candidateProfilePath)),
  options: {
    emptiesList,
    seedStart,
    seedCount,
    timeLimitMs,
    maxDepth,
    exactEndgameEmpties,
    enumerateAllLegalMoves,
  },
  summary,
  cases,
};

console.log('\n[summary]');
console.log(`cases=${summary.totalCases}`);
console.log(`same score=${summary.sameScoreCases}/${summary.totalCases}, same best move=${summary.sameBestMoveCases}/${summary.totalCases}`);
console.log(`verified tie swaps=${summary.verifiedTieSwapCases}, unverified best-move mismatches=${summary.unverifiedBestMoveMismatchCases}`);

if (outputJsonPath) {
  await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
  await fs.promises.writeFile(outputJsonPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Saved tie-swap audit to ${outputJsonPath}`);
}
