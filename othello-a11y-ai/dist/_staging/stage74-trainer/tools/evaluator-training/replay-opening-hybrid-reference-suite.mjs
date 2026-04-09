#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { GameState } from '../../js/core/game-state.js';
import { lookupOpeningBook } from '../../js/ai/opening-book.js';
import { listOpeningHybridTuningProfiles } from '../../js/ai/opening-tuning.js';
import { runMedianSearch } from '../../js/test/benchmark-helpers.mjs';
import {
  displayProjectPath,
  displayTrainingToolPath,
  formatInteger,
  parseArgs,
  resolveCliPath,
  toPortablePath,
} from './lib.mjs';

const DEFAULT_PROFILE_KEYS = Object.freeze([
  'stage57-book-led',
  'stage57-prior-light',
  'stage59-prior-veto',
  'stage59-cap9',
  'stage59-cap9-prior-veto',
]);

function printUsage() {
  const toolPath = displayTrainingToolPath('replay-opening-hybrid-reference-suite.mjs');
  const defaultReferencePath = displayProjectPath('benchmarks', 'stage58_opening_hybrid_reference_suite.json');
  const defaultOutputPath = displayProjectPath('benchmarks', 'stage59_opening_wrapup_candidates.json');
  console.log(`Usage:
  node ${toolPath} \
    [--reference-json ${defaultReferencePath}] \
    [--profile-keys ${DEFAULT_PROFILE_KEYS.join(',')}] \
    [--candidate-max-depth 4] [--candidate-time-limit-ms 450] [--candidate-exact-endgame-empties 10] \
    [--repetitions 1] \
    [--output-json ${defaultOutputPath}]

Stage 58 reference suite JSON을 재사용해, 새로운 opening hybrid candidate profile들을 빠르게 재평가합니다.
기존 stronger reference search를 다시 돌리지 않기 때문에 wrap-up 후보 비교에 적합합니다.
`);
}

function toFiniteInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

function parseProfileKeys(rawValue) {
  if (typeof rawValue !== 'string' || rawValue.trim() === '') {
    return [...DEFAULT_PROFILE_KEYS];
  }

  const keys = rawValue
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token !== '');

  return keys.length > 0 ? keys : [...DEFAULT_PROFILE_KEYS];
}

function stateFromSequence(sequence) {
  let state = GameState.initial();
  for (let cursor = 0; cursor < sequence.length; cursor += 2) {
    const coord = sequence.slice(cursor, cursor + 2);
    const legalMove = state.getLegalMoves().find((move) => move.coord === coord);
    if (!legalMove) {
      throw new Error(`Illegal prefix sequence while rebuilding state: ${sequence} @ ${coord}`);
    }
    state = state.applyMove(legalMove.index).state;
  }
  return state;
}

function createSearchOptions({
  maxDepth,
  timeLimitMs,
  exactEndgameEmpties,
  openingTuningKey,
}) {
  return {
    presetKey: 'custom',
    styleKey: 'balanced',
    maxDepth,
    timeLimitMs,
    exactEndgameEmpties,
    aspirationWindow: 40,
    openingRandomness: 0,
    searchRandomness: 0,
    openingTuningKey,
  };
}

function keyOfCase(entry) {
  return `${entry.ply}:${entry.prefixSequence}`;
}

function compareProfileRanking(left, right) {
  if (right.worstAgreementRate !== left.worstAgreementRate) {
    return right.worstAgreementRate - left.worstAgreementRate;
  }
  if (right.averageAgreementRate !== left.averageAgreementRate) {
    return right.averageAgreementRate - left.averageAgreementRate;
  }
  if (left.averageNodes !== right.averageNodes) {
    return left.averageNodes - right.averageNodes;
  }
  return left.profileKey.localeCompare(right.profileKey);
}

function loadReferenceSuite(referenceJsonPath) {
  const raw = JSON.parse(fs.readFileSync(referenceJsonPath, 'utf8'));
  if (!Array.isArray(raw?.referenceScenarios) || raw.referenceScenarios.length === 0) {
    throw new Error('Reference suite JSON must include a non-empty referenceScenarios array.');
  }
  return raw;
}

function buildCorpus(referenceSuite) {
  const firstScenario = referenceSuite.referenceScenarios[0];
  const baseCases = Array.isArray(firstScenario.referenceCases) ? firstScenario.referenceCases : [];
  if (baseCases.length === 0) {
    throw new Error('Reference suite JSON must include referenceCases for the first scenario.');
  }

  return baseCases.map((entry) => {
    const state = stateFromSequence(entry.prefixSequence);
    const bookHit = lookupOpeningBook(state);
    return {
      key: keyOfCase(entry),
      state,
      ply: entry.ply,
      prefixSequence: entry.prefixSequence,
      topNames: bookHit?.topNames?.map((nameEntry) => nameEntry.name) ?? [],
    };
  });
}

function summarizeCandidateAgainstScenario(resultsByKey, scenario) {
  const scenarioCases = Array.isArray(scenario.referenceCases) ? scenario.referenceCases : [];
  let agreementCount = 0;
  let directCount = 0;
  let searchCount = 0;
  let contradictionVetoCount = 0;
  let bookBackedChoiceCount = 0;
  let offBookChoiceCount = 0;
  let totalNodes = 0;
  let totalElapsedMs = 0;
  const mismatches = [];

  for (const referenceCase of scenarioCases) {
    const caseKey = keyOfCase(referenceCase);
    const resultEntry = resultsByKey.get(caseKey);
    if (!resultEntry) {
      continue;
    }

    const { result, summary, topNames } = resultEntry;
    const isAgreement = result.bestMoveCoord === referenceCase.referenceMove;
    if (isAgreement) {
      agreementCount += 1;
    }
    if (result.source === 'opening-book') {
      directCount += 1;
    } else {
      searchCount += 1;
    }
    if ((result.stats?.openingPriorContradictionVetoes ?? 0) > 0) {
      contradictionVetoCount += 1;
    }

    if (result.bookHit?.matchedMoveCoord) {
      bookBackedChoiceCount += 1;
    } else if (result.bookHit) {
      offBookChoiceCount += 1;
    }

    totalNodes += Number(summary.nodes ?? 0);
    totalElapsedMs += Number(summary.elapsedMs ?? 0);

    if (!isAgreement && mismatches.length < 12) {
      mismatches.push({
        ply: resultEntry.ply,
        prefixSequence: resultEntry.prefixSequence,
        topNames,
        resultMove: result.bestMoveCoord,
        resultSource: result.source,
        referenceMove: referenceCase.referenceMove,
        referenceScore: referenceCase.referenceScore,
        bookBackedChoice: Boolean(result.bookHit?.matchedMoveCoord),
        contradictionVeto: result.bookHit?.priorContradictionVeto ?? null,
        bookTopMoves: Array.isArray(result.analyzedMoves)
          ? result.analyzedMoves.slice(0, 3).map((move) => move.coord)
          : [],
      });
    }
  }

  const cases = scenarioCases.length;
  return {
    referenceScenarioKey: scenario.referenceScenario.key,
    referenceScenarioLabel: scenario.referenceScenario.label,
    cases,
    agreementCount,
    agreementRate: cases > 0 ? agreementCount / cases : 0,
    directCount,
    directRate: cases > 0 ? directCount / cases : 0,
    searchCount,
    searchRate: cases > 0 ? searchCount / cases : 0,
    contradictionVetoCount,
    contradictionVetoRate: cases > 0 ? contradictionVetoCount / cases : 0,
    bookBackedChoiceCount,
    bookBackedChoiceRate: cases > 0 ? bookBackedChoiceCount / cases : 0,
    offBookChoiceCount,
    offBookChoiceRate: cases > 0 ? offBookChoiceCount / cases : 0,
    averageNodes: cases > 0 ? totalNodes / cases : 0,
    averageElapsedMs: cases > 0 ? totalElapsedMs / cases : 0,
    mismatches,
  };
}

function evaluateProfile(profileKey, corpus, referenceSuite, searchOptions, repetitions = 1) {
  const resultsByKey = new Map();
  let processed = 0;

  for (const entry of corpus) {
    const { result, summary, samples } = runMedianSearch(entry.state, searchOptions, repetitions);
    resultsByKey.set(entry.key, {
      ...entry,
      result,
      summary,
      samples,
    });

    processed += 1;
    if (processed % 24 === 0 || processed === corpus.length) {
      console.log(`  ${profileKey}: processed ${formatInteger(processed)} / ${formatInteger(corpus.length)} states...`);
    }
  }

  const perScenario = referenceSuite.referenceScenarios.map((scenario) => summarizeCandidateAgainstScenario(resultsByKey, scenario));
  const averageAgreementRate = perScenario.reduce((sum, scenario) => sum + scenario.agreementRate, 0) / perScenario.length;
  const worstAgreementRate = Math.min(...perScenario.map((scenario) => scenario.agreementRate));
  const averageNodes = perScenario.reduce((sum, scenario) => sum + scenario.averageNodes, 0) / perScenario.length;
  const averageElapsedMs = perScenario.reduce((sum, scenario) => sum + scenario.averageElapsedMs, 0) / perScenario.length;
  const averageDirectRate = perScenario.reduce((sum, scenario) => sum + scenario.directRate, 0) / perScenario.length;
  const averageContradictionVetoRate = perScenario.reduce((sum, scenario) => sum + scenario.contradictionVetoRate, 0) / perScenario.length;

  return {
    profileKey,
    referenceScenarios: perScenario,
    averageAgreementRate,
    worstAgreementRate,
    agreementSpread: averageAgreementRate - worstAgreementRate,
    averageNodes,
    averageElapsedMs,
    averageDirectRate,
    averageContradictionVetoRate,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const referenceJsonPath = typeof args['reference-json'] === 'string' && args['reference-json'].trim() !== ''
    ? resolveCliPath(args['reference-json'])
    : resolveCliPath(path.join('benchmarks', 'stage58_opening_hybrid_reference_suite.json'));
  const outputJsonPath = typeof args['output-json'] === 'string' && args['output-json'].trim() !== ''
    ? resolveCliPath(args['output-json'])
    : resolveCliPath(path.join('benchmarks', 'stage59_opening_wrapup_candidates.json'));
  const profileKeys = parseProfileKeys(args['profile-keys']);
  const knownProfileKeys = new Set(listOpeningHybridTuningProfiles().map((profile) => profile.key));
  const resolvedProfileKeys = profileKeys.filter((profileKey) => knownProfileKeys.has(profileKey));
  const unresolvedProfileKeys = profileKeys.filter((profileKey) => !knownProfileKeys.has(profileKey));
  const candidateMaxDepth = Math.max(1, toFiniteInteger(args['candidate-max-depth'], 4));
  const candidateTimeLimitMs = Math.max(50, toFiniteInteger(args['candidate-time-limit-ms'], 450));
  const candidateExactEndgameEmpties = Math.max(0, toFiniteInteger(args['candidate-exact-endgame-empties'], 10));
  const repetitions = Math.max(1, toFiniteInteger(args.repetitions, 1));

  if (resolvedProfileKeys.length === 0) {
    throw new Error('No valid profile keys were provided.');
  }

  const referenceSuite = loadReferenceSuite(referenceJsonPath);
  const corpus = buildCorpus(referenceSuite);

  console.log(`Reference suite source        : ${toPortablePath(path.relative(process.cwd(), referenceJsonPath) || referenceJsonPath)}`);
  console.log(`Replay corpus states          : ${formatInteger(corpus.length)}`);
  console.log(`Candidate profiles           : ${resolvedProfileKeys.join(', ')}`);

  const profiles = [];
  for (const profileKey of resolvedProfileKeys) {
    const searchOptions = createSearchOptions({
      maxDepth: candidateMaxDepth,
      timeLimitMs: candidateTimeLimitMs,
      exactEndgameEmpties: candidateExactEndgameEmpties,
      openingTuningKey: profileKey,
    });
    profiles.push(evaluateProfile(profileKey, corpus, referenceSuite, searchOptions, repetitions));
  }

  const ranking = [...profiles].sort(compareProfileRanking).map((profile, index) => ({
    rank: index + 1,
    profileKey: profile.profileKey,
    worstAgreementRate: profile.worstAgreementRate,
    averageAgreementRate: profile.averageAgreementRate,
    agreementSpread: profile.agreementSpread,
    averageNodes: profile.averageNodes,
    averageElapsedMs: profile.averageElapsedMs,
    averageDirectRate: profile.averageDirectRate,
    averageContradictionVetoRate: profile.averageContradictionVetoRate,
  }));

  const output = {
    generatedAt: new Date().toISOString(),
    sourceReferenceJson: toPortablePath(path.relative(process.cwd(), referenceJsonPath) || referenceJsonPath),
    corpus: {
      stateCount: corpus.length,
      minPly: Math.min(...corpus.map((entry) => entry.ply)),
      maxPly: Math.max(...corpus.map((entry) => entry.ply)),
    },
    benchmarkConfig: {
      candidate: {
        maxDepth: candidateMaxDepth,
        timeLimitMs: candidateTimeLimitMs,
        exactEndgameEmpties: candidateExactEndgameEmpties,
        repetitions,
      },
      profileKeys: resolvedProfileKeys,
    },
    unresolvedRequestedProfileKeys: unresolvedProfileKeys,
    sourceReferenceScenarios: referenceSuite.referenceScenarios.map((scenario) => scenario.referenceScenario),
    sourceReferenceConsistency: referenceSuite.referenceConsistency ?? null,
    profiles,
    ranking,
  };

  await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
  await fs.promises.writeFile(outputJsonPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  console.log(`Wrote replay benchmark summary to ${toPortablePath(path.relative(process.cwd(), outputJsonPath) || outputJsonPath)}`);
  for (const entry of ranking) {
    console.log(`  #${entry.rank} ${entry.profileKey}: worst ${(entry.worstAgreementRate * 100).toFixed(1)}%, avg ${(entry.averageAgreementRate * 100).toFixed(1)}%, nodes ${entry.averageNodes.toFixed(1)}, direct ${(entry.averageDirectRate * 100).toFixed(1)}%`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
