#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { GameState } from '../../js/core/game-state.js';
import { lookupOpeningBook } from '../../js/ai/opening-book.js';
import { OPENING_BOOK_SEED_LINES } from '../../js/ai/opening-book-data.js';
import {
  getOpeningHybridTuningProfile,
  listOpeningHybridTuningProfiles,
  resolveOpeningHybridTuning,
} from '../../js/ai/opening-tuning.js';
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

const BENCHMARK_REFERENCE_SCENARIOS = Object.freeze({
  'stage57-baseline': Object.freeze({
    key: 'stage57-baseline',
    label: 'Stage 57 baseline reference',
    description: 'Stage 57 benchmark 재현용 reference입니다. search-only이지만 prior ordering은 약하게 유지합니다.',
    maxDepth: 6,
    timeLimitMs: 900,
    exactEndgameEmpties: 8,
    openingTuningKey: 'search-reference',
  }),
  'stage58-strong-assisted': Object.freeze({
    key: 'stage58-strong-assisted',
    label: 'Stage 58 strong assisted reference',
    description: 'direct opening-book을 끄고 depth/time budget을 늘린 stronger reference입니다. prior ordering은 극히 약하게만 남겨 깊이를 더 확보합니다.',
    maxDepth: 8,
    timeLimitMs: 1600,
    exactEndgameEmpties: 10,
    openingTuningKey: 'search-reference-strong',
  }),
  'stage58-strong-pure': Object.freeze({
    key: 'stage58-strong-pure',
    label: 'Stage 58 strong pure-search reference',
    description: 'direct opening-book과 opening prior ordering을 모두 끈 pure-search reference입니다.',
    maxDepth: 7,
    timeLimitMs: 2200,
    exactEndgameEmpties: 10,
    openingTuningKey: 'search-reference-pure',
  }),
});

const DEFAULT_REFERENCE_SCENARIO_KEYS = Object.freeze([
  'stage57-baseline',
  'stage58-strong-assisted',
  'stage58-strong-pure',
]);

function printUsage() {
  const toolPath = displayTrainingToolPath('benchmark-opening-hybrid-tuning.mjs');
  const outputJsonPath = displayProjectPath('benchmarks', 'stage59_opening_wrapup_candidates.json');
  console.log(`Usage:
  node ${toolPath} \
    [--profile-keys ${DEFAULT_PROFILE_KEYS.join(',')}] \
    [--min-ply 0] [--max-ply 12] [--state-limit 0] [--repetitions 1] \
    [--candidate-max-depth 5] [--candidate-time-limit-ms 700] [--candidate-exact-endgame-empties 10] \
    [--reference-scenarios ${DEFAULT_REFERENCE_SCENARIO_KEYS.join(',')}] \
    [--reference-max-depth 7] [--reference-time-limit-ms 1500] [--reference-exact-endgame-empties 10] \
    [--reference-opening-tuning-key search-reference] \
    [--output-json ${outputJsonPath}]

Opening book seed line의 unique prefix state들을 모아,
여러 opening hybrid tuning profile을 하나 이상의 search reference scenario와 비교합니다.

기본값은 Stage 57 baseline + Stage 58 stronger reference suite를 모두 비교합니다.
기존 단일 reference 옵션(--reference-max-depth 등)을 주면 custom reference 1개만 사용합니다.
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

function parseReferenceScenarioKeys(rawValue) {
  if (typeof rawValue !== 'string' || rawValue.trim() === '') {
    return [...DEFAULT_REFERENCE_SCENARIO_KEYS];
  }

  const keys = rawValue
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token !== '');

  return keys.length > 0 ? keys : [...DEFAULT_REFERENCE_SCENARIO_KEYS];
}

function hasLegacyReferenceOverrides(args) {
  return [
    'reference-max-depth',
    'reference-time-limit-ms',
    'reference-exact-endgame-empties',
    'reference-opening-tuning-key',
  ].some((key) => Object.hasOwn(args, key));
}

function normalizeReferenceScenario(rawScenario) {
  const openingTuningKey = resolveOpeningHybridTuning(rawScenario.openingTuningKey).key;
  return Object.freeze({
    key: rawScenario.key,
    label: rawScenario.label,
    description: rawScenario.description,
    maxDepth: Math.max(1, toFiniteInteger(rawScenario.maxDepth, 6)),
    timeLimitMs: Math.max(50, toFiniteInteger(rawScenario.timeLimitMs, 900)),
    exactEndgameEmpties: Math.max(0, toFiniteInteger(rawScenario.exactEndgameEmpties, 8)),
    openingTuningKey,
  });
}

function createCustomReferenceScenario(args) {
  const referenceMaxDepth = Math.max(1, toFiniteInteger(args['reference-max-depth'], 7));
  const referenceTimeLimitMs = Math.max(50, toFiniteInteger(args['reference-time-limit-ms'], 1500));
  const referenceExactEndgameEmpties = Math.max(0, toFiniteInteger(args['reference-exact-endgame-empties'], 10));
  const referenceOpeningTuningKey = typeof args['reference-opening-tuning-key'] === 'string' && args['reference-opening-tuning-key'].trim() !== ''
    ? args['reference-opening-tuning-key'].trim()
    : 'search-reference';

  return normalizeReferenceScenario({
    key: 'custom-reference',
    label: 'Custom reference',
    description: 'CLI override로 지정한 단일 reference scenario입니다.',
    maxDepth: referenceMaxDepth,
    timeLimitMs: referenceTimeLimitMs,
    exactEndgameEmpties: referenceExactEndgameEmpties,
    openingTuningKey: referenceOpeningTuningKey,
  });
}

function resolveReferenceScenarios(args) {
  if (typeof args['reference-scenarios'] === 'string' && args['reference-scenarios'].trim() !== '') {
    const requestedKeys = parseReferenceScenarioKeys(args['reference-scenarios']);
    const resolved = requestedKeys
      .map((scenarioKey) => BENCHMARK_REFERENCE_SCENARIOS[scenarioKey])
      .filter(Boolean)
      .map(normalizeReferenceScenario);

    return {
      requestedKeys,
      unresolvedKeys: requestedKeys.filter((scenarioKey) => !Object.hasOwn(BENCHMARK_REFERENCE_SCENARIOS, scenarioKey)),
      scenarios: resolved.length > 0 ? resolved : DEFAULT_REFERENCE_SCENARIO_KEYS.map((scenarioKey) => normalizeReferenceScenario(BENCHMARK_REFERENCE_SCENARIOS[scenarioKey])),
      mode: 'suite',
    };
  }

  if (hasLegacyReferenceOverrides(args)) {
    return {
      requestedKeys: ['custom-reference'],
      unresolvedKeys: [],
      scenarios: [createCustomReferenceScenario(args)],
      mode: 'custom-single',
    };
  }

  return {
    requestedKeys: [...DEFAULT_REFERENCE_SCENARIO_KEYS],
    unresolvedKeys: [],
    scenarios: DEFAULT_REFERENCE_SCENARIO_KEYS.map((scenarioKey) => normalizeReferenceScenario(BENCHMARK_REFERENCE_SCENARIOS[scenarioKey])),
    mode: 'default-suite',
  };
}

function createSearchOptions({
  maxDepth,
  timeLimitMs,
  exactEndgameEmpties,
  openingTuningKey,
  openingTuningProfile = null,
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
    ...(openingTuningProfile ? { openingTuningProfile } : {}),
  };
}

function collectOpeningPrefixStates({ minPly = 0, maxPly = 12, stateLimit = 0 } = {}) {
  const byHash = new Map();

  for (const seed of OPENING_BOOK_SEED_LINES) {
    let state = GameState.initial();
    const sequence = seed.sequence;

    for (let cursor = 0; cursor < sequence.length; cursor += 2) {
      const ply = state.moveHistory.length;
      if (ply >= minPly && ply <= maxPly) {
        const hashText = state.hashKey().toString();
        if (!byHash.has(hashText)) {
          const bookHit = lookupOpeningBook(state);
          if (bookHit) {
            byHash.set(hashText, {
              key: hashText,
              state: state.clone(),
              prefixSequence: state.moveHistory.map((action) => action.coord).join(''),
              ply,
              topNames: bookHit.topNames.map((entry) => entry.name),
            });
          }
        }
      }

      if (ply >= maxPly) {
        break;
      }

      const coord = sequence.slice(cursor, cursor + 2);
      const legalMove = state.getLegalMoves().find((move) => move.coord === coord);
      if (!legalMove) {
        break;
      }
      state = state.applyMove(legalMove.index).state;
    }
  }

  const states = [...byHash.values()].sort((left, right) => {
    if (left.ply !== right.ply) {
      return left.ply - right.ply;
    }
    if (left.prefixSequence !== right.prefixSequence) {
      return left.prefixSequence.localeCompare(right.prefixSequence);
    }
    return left.key.localeCompare(right.key);
  });

  if (stateLimit > 0 && states.length > stateLimit) {
    return states.slice(0, stateLimit);
  }
  return states;
}

function createAggregate(profile, referenceScenario) {
  return {
    profileKey: profile.key,
    profileLabel: profile.label,
    description: profile.description,
    profile,
    referenceScenarioKey: referenceScenario.key,
    referenceScenarioLabel: referenceScenario.label,
    cases: 0,
    agreementCount: 0,
    directCount: 0,
    searchCount: 0,
    directAgreementCount: 0,
    searchAgreementCount: 0,
    bookBackedChoiceCount: 0,
    offBookChoiceCount: 0,
    confidenceSkipCount: 0,
    openingPriorHitCount: 0,
    openingHybridDirectMoves: 0,
    nodesTotal: 0,
    elapsedMsTotal: 0,
    completedDepthTotal: 0,
    byPly: new Map(),
    mismatches: [],
  };
}

function updateAggregate(aggregate, stateInfo, result, referenceResult) {
  const bookHit = lookupOpeningBook(stateInfo.state);
  const isDirect = result.source === 'opening-book';
  const agrees = result.bestMoveCoord === referenceResult.bestMoveCoord;
  const bookBackedChoice = Boolean(bookHit?.candidates?.some((candidate) => candidate.moveIndex === result.bestMoveIndex));

  aggregate.cases += 1;
  aggregate.agreementCount += agrees ? 1 : 0;
  aggregate.directCount += isDirect ? 1 : 0;
  aggregate.searchCount += isDirect ? 0 : 1;
  aggregate.directAgreementCount += isDirect && agrees ? 1 : 0;
  aggregate.searchAgreementCount += !isDirect && agrees ? 1 : 0;
  aggregate.bookBackedChoiceCount += bookBackedChoice ? 1 : 0;
  aggregate.offBookChoiceCount += bookBackedChoice ? 0 : 1;
  aggregate.confidenceSkipCount += Number(result.stats?.openingConfidenceSkips ?? 0);
  aggregate.openingPriorHitCount += result.openingPriorHit ? 1 : 0;
  aggregate.openingHybridDirectMoves += Number(result.stats?.openingHybridDirectMoves ?? 0);
  aggregate.nodesTotal += Number(result.stats?.nodes ?? 0);
  aggregate.elapsedMsTotal += Number(result.stats?.elapsedMs ?? 0);
  aggregate.completedDepthTotal += Number(result.stats?.completedDepth ?? 0);

  const bucket = aggregate.byPly.get(stateInfo.ply) ?? {
    ply: stateInfo.ply,
    cases: 0,
    agreementCount: 0,
    directCount: 0,
    searchCount: 0,
    offBookChoiceCount: 0,
  };
  bucket.cases += 1;
  bucket.agreementCount += agrees ? 1 : 0;
  bucket.directCount += isDirect ? 1 : 0;
  bucket.searchCount += isDirect ? 0 : 1;
  bucket.offBookChoiceCount += bookBackedChoice ? 0 : 1;
  aggregate.byPly.set(stateInfo.ply, bucket);

  if (!agrees && aggregate.mismatches.length < 12) {
    aggregate.mismatches.push({
      ply: stateInfo.ply,
      prefixSequence: stateInfo.prefixSequence,
      topNames: stateInfo.topNames,
      resultMove: result.bestMoveCoord,
      resultSource: result.source,
      referenceMove: referenceResult.bestMoveCoord,
      referenceScore: referenceResult.score,
      bookBackedChoice,
      bookTopMoves: bookHit?.candidates?.slice(0, 4).map((candidate) => candidate.coord) ?? [],
    });
  }
}

function finalizeAggregate(aggregate) {
  const cases = Math.max(1, aggregate.cases);
  const byPly = [...aggregate.byPly.values()]
    .sort((left, right) => left.ply - right.ply)
    .map((bucket) => ({
      ...bucket,
      agreementRate: bucket.agreementCount / Math.max(1, bucket.cases),
      directRate: bucket.directCount / Math.max(1, bucket.cases),
      offBookChoiceRate: bucket.offBookChoiceCount / Math.max(1, bucket.cases),
    }));

  return {
    profileKey: aggregate.profileKey,
    profileLabel: aggregate.profileLabel,
    description: aggregate.description,
    profile: aggregate.profile,
    referenceScenarioKey: aggregate.referenceScenarioKey,
    referenceScenarioLabel: aggregate.referenceScenarioLabel,
    cases: aggregate.cases,
    agreementCount: aggregate.agreementCount,
    agreementRate: aggregate.agreementCount / cases,
    directCount: aggregate.directCount,
    directRate: aggregate.directCount / cases,
    searchCount: aggregate.searchCount,
    searchRate: aggregate.searchCount / cases,
    directAgreementCount: aggregate.directAgreementCount,
    directAgreementRate: aggregate.directAgreementCount / Math.max(1, aggregate.directCount),
    searchAgreementCount: aggregate.searchAgreementCount,
    searchAgreementRate: aggregate.searchAgreementCount / Math.max(1, aggregate.searchCount),
    bookBackedChoiceCount: aggregate.bookBackedChoiceCount,
    bookBackedChoiceRate: aggregate.bookBackedChoiceCount / cases,
    offBookChoiceCount: aggregate.offBookChoiceCount,
    offBookChoiceRate: aggregate.offBookChoiceCount / cases,
    confidenceSkipCount: aggregate.confidenceSkipCount,
    openingPriorHitCount: aggregate.openingPriorHitCount,
    openingHybridDirectMoves: aggregate.openingHybridDirectMoves,
    averageNodes: aggregate.nodesTotal / cases,
    averageElapsedMs: aggregate.elapsedMsTotal / cases,
    averageCompletedDepth: aggregate.completedDepthTotal / cases,
    byPly,
    mismatches: aggregate.mismatches,
  };
}

function rankProfiles(finalizedProfiles) {
  return finalizedProfiles.map((profile, rankIndex) => ({
    rank: rankIndex + 1,
    profileKey: profile.profileKey,
    agreementRate: profile.agreementRate,
    directRate: profile.directRate,
    offBookChoiceRate: profile.offBookChoiceRate,
    averageElapsedMs: profile.averageElapsedMs,
    averageNodes: profile.averageNodes,
  }));
}

function summarizeProfileAcrossReferences(profile, referenceScenarioResults) {
  const byReference = referenceScenarioResults
    .map((scenarioResult) => scenarioResult.profiles.find((entry) => entry.profileKey === profile.key))
    .filter(Boolean);

  const referenceCount = Math.max(1, byReference.length);
  const agreementRates = byReference.map((entry) => entry.agreementRate);
  const averageAgreementRate = agreementRates.reduce((sum, value) => sum + value, 0) / referenceCount;
  const worstAgreementRate = agreementRates.length > 0 ? Math.min(...agreementRates) : 0;
  const bestAgreementRate = agreementRates.length > 0 ? Math.max(...agreementRates) : 0;
  const averageDirectRate = byReference.reduce((sum, entry) => sum + entry.directRate, 0) / referenceCount;
  const averageOffBookChoiceRate = byReference.reduce((sum, entry) => sum + entry.offBookChoiceRate, 0) / referenceCount;
  const averageNodes = byReference.reduce((sum, entry) => sum + entry.averageNodes, 0) / referenceCount;
  const averageElapsedMs = byReference.reduce((sum, entry) => sum + entry.averageElapsedMs, 0) / referenceCount;

  return {
    profileKey: profile.key,
    profileLabel: profile.label,
    description: profile.description,
    profile,
    referenceCount: byReference.length,
    averageAgreementRate,
    worstAgreementRate,
    bestAgreementRate,
    agreementSpread: bestAgreementRate - worstAgreementRate,
    averageDirectRate,
    averageOffBookChoiceRate,
    averageNodes,
    averageElapsedMs,
    byReference: byReference.map((entry) => ({
      referenceScenarioKey: entry.referenceScenarioKey,
      referenceScenarioLabel: entry.referenceScenarioLabel,
      agreementRate: entry.agreementRate,
      directRate: entry.directRate,
      offBookChoiceRate: entry.offBookChoiceRate,
      averageNodes: entry.averageNodes,
      averageElapsedMs: entry.averageElapsedMs,
      averageCompletedDepth: entry.averageCompletedDepth,
    })),
  };
}

function buildReferenceConsistency(referenceScenarioResults) {
  if (referenceScenarioResults.length === 0) {
    return {
      scenarioCount: 0,
      unanimousCaseCount: 0,
      unanimousRate: 0,
      byPair: [],
    };
  }

  const caseKeys = referenceScenarioResults[0].referenceCases.map((entry) => `${entry.ply}:${entry.prefixSequence}`);
  const scenarioCaseMaps = referenceScenarioResults.map((scenarioResult) => ({
    scenario: scenarioResult.referenceScenario,
    byCaseKey: new Map(scenarioResult.referenceCases.map((entry) => [`${entry.ply}:${entry.prefixSequence}`, entry])),
  }));

  let unanimousCaseCount = 0;
  for (const caseKey of caseKeys) {
    const moves = scenarioCaseMaps
      .map((scenarioCaseMap) => scenarioCaseMap.byCaseKey.get(caseKey)?.referenceMove ?? null)
      .filter(Boolean);
    if (moves.length > 0 && new Set(moves).size === 1) {
      unanimousCaseCount += 1;
    }
  }

  const byPair = [];
  for (let leftIndex = 0; leftIndex < scenarioCaseMaps.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < scenarioCaseMaps.length; rightIndex += 1) {
      const leftScenario = scenarioCaseMaps[leftIndex];
      const rightScenario = scenarioCaseMaps[rightIndex];
      let cases = 0;
      let agreementCount = 0;
      const disagreements = [];

      for (const caseKey of caseKeys) {
        const leftCase = leftScenario.byCaseKey.get(caseKey);
        const rightCase = rightScenario.byCaseKey.get(caseKey);
        if (!leftCase || !rightCase) {
          continue;
        }
        cases += 1;
        const agrees = leftCase.referenceMove === rightCase.referenceMove;
        agreementCount += agrees ? 1 : 0;
        if (!agrees && disagreements.length < 12) {
          disagreements.push({
            ply: leftCase.ply,
            prefixSequence: leftCase.prefixSequence,
            leftReferenceScenarioKey: leftScenario.scenario.key,
            rightReferenceScenarioKey: rightScenario.scenario.key,
            leftMove: leftCase.referenceMove,
            rightMove: rightCase.referenceMove,
            leftCompletedDepth: leftCase.completedDepth,
            rightCompletedDepth: rightCase.completedDepth,
          });
        }
      }

      byPair.push({
        leftReferenceScenarioKey: leftScenario.scenario.key,
        rightReferenceScenarioKey: rightScenario.scenario.key,
        cases,
        agreementCount,
        agreementRate: agreementCount / Math.max(1, cases),
        disagreements,
      });
    }
  }

  return {
    scenarioCount: referenceScenarioResults.length,
    unanimousCaseCount,
    unanimousRate: unanimousCaseCount / Math.max(1, caseKeys.length),
    byPair,
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const profileKeys = parseProfileKeys(args['profile-keys']);
const minPly = Math.max(0, toFiniteInteger(args['min-ply'], 0));
const maxPly = Math.max(minPly, toFiniteInteger(args['max-ply'], 12));
const stateLimit = Math.max(0, toFiniteInteger(args['state-limit'], 0));
const repetitions = Math.max(1, toFiniteInteger(args.repetitions, 1));
const candidateMaxDepth = Math.max(1, toFiniteInteger(args['candidate-max-depth'], 5));
const candidateTimeLimitMs = Math.max(50, toFiniteInteger(args['candidate-time-limit-ms'], 700));
const candidateExactEndgameEmpties = Math.max(0, toFiniteInteger(args['candidate-exact-endgame-empties'], 10));
const outputJsonPath = args['output-json'] ? resolveCliPath(args['output-json']) : null;

const referenceScenarioResolution = resolveReferenceScenarios(args);
const referenceScenarios = referenceScenarioResolution.scenarios;

const requestedProfiles = profileKeys.map((profileKey) => getOpeningHybridTuningProfile(profileKey));
const uniqueProfiles = [...new Map(requestedProfiles.map((profile) => [profile.key, profile])).values()];
const availableProfileKeys = listOpeningHybridTuningProfiles().map((profile) => profile.key);
const unresolvedKeys = profileKeys.filter((profileKey) => !availableProfileKeys.includes(profileKey));

const states = collectOpeningPrefixStates({ minPly, maxPly, stateLimit });
if (states.length === 0) {
  console.error('No opening book prefix states matched the requested ply range.');
  process.exit(1);
}

const candidateOptionsByProfileKey = new Map(uniqueProfiles.map((profile) => [
  profile.key,
  createSearchOptions({
    maxDepth: candidateMaxDepth,
    timeLimitMs: candidateTimeLimitMs,
    exactEndgameEmpties: candidateExactEndgameEmpties,
    openingTuningKey: profile.key,
  }),
]));
const scenarioContexts = referenceScenarios.map((referenceScenario) => ({
  referenceScenario,
  referenceOptions: createSearchOptions(referenceScenario),
  aggregates: uniqueProfiles.map((profile) => createAggregate(profile, referenceScenario)),
  referenceCases: [],
}));

console.log(`Opening tuning benchmark states : ${formatInteger(states.length)} (ply ${minPly}..${maxPly})`);
console.log(`Candidate profiles             : ${uniqueProfiles.map((profile) => profile.key).join(', ')}`);
console.log(`Reference scenarios           : ${referenceScenarios.map((scenario) => `${scenario.key}[d${scenario.maxDepth}/t${scenario.timeLimitMs}]`).join(', ')}`);
if (unresolvedKeys.length > 0) {
  console.log(`Unresolved requested keys     : ${unresolvedKeys.join(', ')} -> defaulted by resolver`);
}
if (referenceScenarioResolution.unresolvedKeys.length > 0) {
  console.log(`Unresolved reference scenarios: ${referenceScenarioResolution.unresolvedKeys.join(', ')} -> default suite used`);
}

for (let index = 0; index < states.length; index += 1) {
  const stateInfo = states[index];
  const candidateResultsByProfileKey = new Map();

  for (const profile of uniqueProfiles) {
    const candidateResult = runMedianSearch(
      stateInfo.state,
      candidateOptionsByProfileKey.get(profile.key),
      repetitions,
    ).result;
    candidateResultsByProfileKey.set(profile.key, candidateResult);
  }

  for (const scenarioContext of scenarioContexts) {
    const referenceResult = runMedianSearch(
      stateInfo.state,
      scenarioContext.referenceOptions,
      repetitions,
    ).result;

    scenarioContext.referenceCases.push({
      ply: stateInfo.ply,
      prefixSequence: stateInfo.prefixSequence,
      referenceMove: referenceResult.bestMoveCoord,
      referenceSource: referenceResult.source,
      referenceMode: referenceResult.searchMode,
      referenceScore: referenceResult.score,
      completedDepth: referenceResult.stats?.completedDepth ?? null,
      elapsedMs: referenceResult.stats?.elapsedMs ?? null,
      nodes: referenceResult.stats?.nodes ?? null,
      openingPriorHit: Boolean(referenceResult.openingPriorHit),
    });

    for (const aggregate of scenarioContext.aggregates) {
      updateAggregate(
        aggregate,
        stateInfo,
        candidateResultsByProfileKey.get(aggregate.profileKey),
        referenceResult,
      );
    }
  }

  if ((index + 1) % 24 === 0 || (index + 1) === states.length) {
    console.log(`  processed ${formatInteger(index + 1)} / ${formatInteger(states.length)} states...`);
  }
}

const referenceScenarioResults = scenarioContexts.map((scenarioContext) => {
  const finalizedProfiles = scenarioContext.aggregates.map(finalizeAggregate)
    .sort((left, right) => {
      if (right.agreementRate !== left.agreementRate) {
        return right.agreementRate - left.agreementRate;
      }
      if (left.averageElapsedMs !== right.averageElapsedMs) {
        return left.averageElapsedMs - right.averageElapsedMs;
      }
      return left.averageNodes - right.averageNodes;
    });

  return {
    referenceScenario: scenarioContext.referenceScenario,
    profiles: finalizedProfiles,
    ranking: rankProfiles(finalizedProfiles),
    referenceCases: scenarioContext.referenceCases,
  };
});

console.log('\nReference scenario summaries:');
for (const scenarioResult of referenceScenarioResults) {
  console.log(`- ${scenarioResult.referenceScenario.key} (${scenarioResult.referenceScenario.label})`);
  for (const profile of scenarioResult.profiles) {
    console.log(
      `    · ${profile.profileKey.padEnd(18)} `
      + `agree=${(profile.agreementRate * 100).toFixed(1).padStart(5)}% `
      + `direct=${(profile.directRate * 100).toFixed(1).padStart(5)}% `
      + `off-book=${(profile.offBookChoiceRate * 100).toFixed(1).padStart(5)}% `
      + `avgNodes=${formatInteger(profile.averageNodes)} `
      + `avgMs=${profile.averageElapsedMs.toFixed(1)}`
    );
  }
}

const overallProfiles = uniqueProfiles
  .map((profile) => summarizeProfileAcrossReferences(profile, referenceScenarioResults))
  .sort((left, right) => {
    if (right.worstAgreementRate !== left.worstAgreementRate) {
      return right.worstAgreementRate - left.worstAgreementRate;
    }
    if (right.averageAgreementRate !== left.averageAgreementRate) {
      return right.averageAgreementRate - left.averageAgreementRate;
    }
    if (left.averageElapsedMs !== right.averageElapsedMs) {
      return left.averageElapsedMs - right.averageElapsedMs;
    }
    return left.averageNodes - right.averageNodes;
  });

console.log('\nOverall ranking across references:');
for (const [rankIndex, profile] of overallProfiles.entries()) {
  console.log(
    `- #${rankIndex + 1} ${profile.profileKey.padEnd(18)} `
    + `worstAgree=${(profile.worstAgreementRate * 100).toFixed(1).padStart(5)}% `
    + `avgAgree=${(profile.averageAgreementRate * 100).toFixed(1).padStart(5)}% `
    + `spread=${(profile.agreementSpread * 100).toFixed(1).padStart(5)}% `
    + `avgNodes=${formatInteger(profile.averageNodes)} `
    + `avgMs=${profile.averageElapsedMs.toFixed(1)}`
  );
}

const referenceConsistency = buildReferenceConsistency(referenceScenarioResults);
console.log('\nReference consistency:');
console.log(`- unanimous rate : ${(referenceConsistency.unanimousRate * 100).toFixed(1)}%`);
for (const pair of referenceConsistency.byPair) {
  console.log(`- ${pair.leftReferenceScenarioKey} vs ${pair.rightReferenceScenarioKey}: ${(pair.agreementRate * 100).toFixed(1)}% (${formatInteger(pair.agreementCount)}/${formatInteger(pair.cases)})`);
}

const primaryReferenceResult = referenceScenarioResults[0] ?? null;
const summary = {
  generatedAt: new Date().toISOString(),
  corpus: {
    source: 'opening-book seed prefix states',
    minPly,
    maxPly,
    stateCount: states.length,
    stateLimit,
    samplePrefixes: states.slice(0, 16).map((stateInfo) => ({
      ply: stateInfo.ply,
      prefixSequence: stateInfo.prefixSequence,
      topNames: stateInfo.topNames,
    })),
  },
  benchmarkConfig: {
    repetitions,
    candidate: {
      maxDepth: candidateMaxDepth,
      timeLimitMs: candidateTimeLimitMs,
      exactEndgameEmpties: candidateExactEndgameEmpties,
    },
    referenceMode: referenceScenarioResolution.mode,
    reference: primaryReferenceResult
      ? {
        scenarioKey: primaryReferenceResult.referenceScenario.key,
        maxDepth: primaryReferenceResult.referenceScenario.maxDepth,
        timeLimitMs: primaryReferenceResult.referenceScenario.timeLimitMs,
        exactEndgameEmpties: primaryReferenceResult.referenceScenario.exactEndgameEmpties,
        openingTuningKey: primaryReferenceResult.referenceScenario.openingTuningKey,
      }
      : null,
    referenceScenarios: referenceScenarios.map((scenario) => ({
      key: scenario.key,
      label: scenario.label,
      maxDepth: scenario.maxDepth,
      timeLimitMs: scenario.timeLimitMs,
      exactEndgameEmpties: scenario.exactEndgameEmpties,
      openingTuningKey: scenario.openingTuningKey,
    })),
  },
  unresolvedRequestedProfileKeys: unresolvedKeys,
  unresolvedReferenceScenarioKeys: referenceScenarioResolution.unresolvedKeys,
  profiles: primaryReferenceResult?.profiles ?? [],
  ranking: primaryReferenceResult?.ranking ?? [],
  referenceCases: primaryReferenceResult?.referenceCases ?? [],
  referenceScenarios: referenceScenarioResults,
  overallProfiles,
  overallRanking: overallProfiles.map((profile, rankIndex) => ({
    rank: rankIndex + 1,
    profileKey: profile.profileKey,
    worstAgreementRate: profile.worstAgreementRate,
    averageAgreementRate: profile.averageAgreementRate,
    agreementSpread: profile.agreementSpread,
    averageElapsedMs: profile.averageElapsedMs,
    averageNodes: profile.averageNodes,
  })),
  referenceConsistency,
};

if (outputJsonPath) {
  await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
  await fs.promises.writeFile(outputJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(`\nWrote benchmark summary to ${toPortablePath(path.relative(process.cwd(), outputJsonPath) || path.basename(outputJsonPath))}`);
}
