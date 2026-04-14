#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { describeSearchAlgorithm, normalizeSearchAlgorithm } from '../../js/ai/search-algorithms.js';
import { SearchEngine } from '../../js/ai/search-engine.js';
import { GameState } from '../../js/core/game-state.js';
import { parseArgs, relativePathFromCwd, resolveCliPath } from '../evaluator-training/lib.mjs';
import {
  ACTIVE_GENERATED_MODULE_PATH,
  buildEngineProfileOverrides,
  describeVariantForSummary,
  loadProfileVariant,
  parseVariantSpecList,
} from './lib-profile-variants.mjs';

const DEFAULTS = Object.freeze({
  searchAlgorithm: 'classic',
  variantSpecs: [
    { label: 'active', generatedModule: ACTIVE_GENERATED_MODULE_PATH },
  ],
  timeMsList: [160, 280, 500],
  positionSeedList: [17, 31, 41, 53, 71, 89, 97, 107],
  openingPlies: 20,
  randomMode: 'constant-zero',
  maxDepth: 4,
  exactEndgameEmpties: 8,
  aspirationWindow: 50,
  maxTableEntries: 90000,
  presetKey: 'custom',
  styleKey: 'balanced',
});

function printUsage() {
  console.log(`Usage:
  node tools/engine-match/benchmark-profile-variant-throughput-compare.mjs \
    [--output-json benchmarks/stage135_profile_throughput_classic.json] \
    [--search-algorithm classic] \
    [--variant-specs "active|js/ai/learned-eval-profile.generated.js;balanced12|tools/engine-match/fixtures/stage135-evaluation-profile-finalists/balanced12-alllate-smoothed-stability-090/learned-eval-profile.generated.js"] \
    [--time-ms-list 160,280,500] [--position-seed-list 17,31,41,53] [--opening-plies 20] \
    [--random-mode constant-zero] [--max-depth 4] [--exact-endgame-empties 8] \
    [--aspiration-window 50] [--max-table-entries 90000] \
    [--preset-key custom] [--style-key balanced]

설명:
- 같은 search algorithm / opening position 묶음에서 evaluation profile variant들의 root search 처리량과 완료 깊이를 비교합니다.
- variant-specs는 "label|generatedModulePath" 항목을 세미콜론으로 구분해 넣습니다.
- 첫 variant가 baseline이며, 나머지 variant는 baseline 대비 move/score agreement와 nodes/ms gain을 함께 계산합니다.
`);
}

function toFiniteInteger(value, fallback, minimum = Number.NEGATIVE_INFINITY, maximum = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
}

function parseCsvIntegers(value, fallback) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [...fallback];
  }

  const parsed = value
    .split(',')
    .map((token) => Number(token.trim()))
    .filter((token) => Number.isFinite(token) && token > 0)
    .map((token) => Math.round(token));

  return parsed.length > 0 ? [...new Set(parsed)] : [...fallback];
}

function createSeededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function withBenchRandom(mode, seed, callback) {
  const originalRandom = Math.random;
  if (mode === 'seeded') {
    Math.random = createSeededRandom(seed);
  } else {
    Math.random = () => 0;
  }

  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
}

function sortLegalMoves(state) {
  return state.getLegalMoves().sort((left, right) => left.coord.localeCompare(right.coord));
}

function createOpeningState(openingPlies, seed) {
  const random = createSeededRandom(seed);
  let state = GameState.initial();
  let guard = 0;

  while (!state.isTerminal() && state.moveHistory.length < openingPlies) {
    const legalMoves = sortLegalMoves(state);
    if (legalMoves.length === 0) {
      state = state.passTurn();
      guard += 1;
      if (guard > 120) {
        throw new Error('Opening generator exceeded pass guard.');
      }
      continue;
    }

    const chosen = legalMoves[Math.floor(random() * legalMoves.length)] ?? legalMoves[0];
    state = state.applyMove(chosen.index).state;
    guard += 1;
    if (guard > 120) {
      throw new Error('Opening generator exceeded guard.');
    }
  }

  return state;
}

function createEngine(profileVariant, options) {
  return new SearchEngine({
    presetKey: options.presetKey,
    styleKey: options.styleKey,
    searchAlgorithm: options.searchAlgorithm,
    maxDepth: options.maxDepth,
    timeLimitMs: options.timeLimitMs,
    exactEndgameEmpties: options.exactEndgameEmpties,
    wldPreExactEmpties: 0,
    aspirationWindow: options.aspirationWindow,
    openingRandomness: 0,
    searchRandomness: 0,
    randomness: 0,
    maxTableEntries: options.maxTableEntries,
    ...buildEngineProfileOverrides(profileVariant),
  });
}

function summarizeOneResult(positionIndex, result) {
  return {
    positionIndex,
    bestMoveIndex: Number.isInteger(result?.bestMoveIndex) ? result.bestMoveIndex : null,
    bestMoveCoord: typeof result?.bestMoveCoord === 'string' ? result.bestMoveCoord : null,
    score: Number.isFinite(result?.score) ? result.score : null,
    searchMode: result?.searchMode ?? null,
    searchDriver: result?.searchDriver ?? null,
    completedDepth: Number(result?.stats?.completedDepth ?? 0),
    elapsedMs: Number(result?.stats?.elapsedMs ?? 0),
    nodes: Number(result?.stats?.nodes ?? 0),
    cutoffs: Number(result?.stats?.cutoffs ?? 0),
    ttHits: Number(result?.stats?.ttHits ?? 0),
    mtdfPasses: Number(result?.stats?.mtdfPasses ?? 0),
    mtdfFailHighs: Number(result?.stats?.mtdfFailHighs ?? 0),
    mtdfFailLows: Number(result?.stats?.mtdfFailLows ?? 0),
    mtdfVerificationPasses: Number(result?.stats?.mtdfVerificationPasses ?? 0),
    mctsIterations: Number(result?.stats?.mctsIterations ?? 0),
    mctsRollouts: Number(result?.stats?.mctsRollouts ?? 0),
    mctsTreeNodes: Number(result?.stats?.mctsTreeNodes ?? 0),
    guidedPriorUses: Number(result?.stats?.guidedPriorUses ?? 0),
    hybridPriorUses: Number(result?.stats?.hybridPriorUses ?? 0),
    completion: result?.searchCompletion ?? null,
  };
}

function averageBy(entries, key) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return 0;
  }
  const total = entries.reduce((sum, entry) => sum + Number(entry?.[key] ?? 0), 0);
  return total / entries.length;
}

function buildAggregate(variantLabel, timeLimitMs, samples) {
  return {
    variantLabel,
    timeLimitMs,
    samples,
    averageCompletedDepth: averageBy(samples, 'completedDepth'),
    averageElapsedMs: averageBy(samples, 'elapsedMs'),
    averageNodes: averageBy(samples, 'nodes'),
    averageCutoffs: averageBy(samples, 'cutoffs'),
    averageTtHits: averageBy(samples, 'ttHits'),
    averageMtdfPasses: averageBy(samples, 'mtdfPasses'),
    averageMtdfFailHighs: averageBy(samples, 'mtdfFailHighs'),
    averageMtdfFailLows: averageBy(samples, 'mtdfFailLows'),
    averageMtdfVerificationPasses: averageBy(samples, 'mtdfVerificationPasses'),
    averageMctsIterations: averageBy(samples, 'mctsIterations'),
    averageMctsRollouts: averageBy(samples, 'mctsRollouts'),
    averageMctsTreeNodes: averageBy(samples, 'mctsTreeNodes'),
    averageGuidedPriorUses: averageBy(samples, 'guidedPriorUses'),
    averageHybridPriorUses: averageBy(samples, 'hybridPriorUses'),
    completionRate: samples.length > 0
      ? samples.filter((sample) => sample.completion === 'complete').length / samples.length
      : 0,
    nodesPerMs: averageBy(samples, 'elapsedMs') > 0
      ? averageBy(samples, 'nodes') / averageBy(samples, 'elapsedMs')
      : 0,
  };
}

function compareAgainstBaseline(baselineAggregate, candidateAggregate) {
  const baselineSamples = baselineAggregate?.samples ?? [];
  const candidateSamples = candidateAggregate?.samples ?? [];
  const sampleCount = Math.min(baselineSamples.length, candidateSamples.length);
  let moveMatches = 0;
  let scoreMatches = 0;
  let candidateDeeperCount = 0;
  let baselineDeeperCount = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const baseline = baselineSamples[index];
    const candidate = candidateSamples[index];
    if (baseline?.bestMoveIndex === candidate?.bestMoveIndex) {
      moveMatches += 1;
    }
    if (baseline?.score === candidate?.score) {
      scoreMatches += 1;
    }
    if (Number(candidate?.completedDepth ?? 0) > Number(baseline?.completedDepth ?? 0)) {
      candidateDeeperCount += 1;
    } else if (Number(candidate?.completedDepth ?? 0) < Number(baseline?.completedDepth ?? 0)) {
      baselineDeeperCount += 1;
    }
  }

  return {
    baselineVariant: baselineAggregate.variantLabel,
    candidateVariant: candidateAggregate.variantLabel,
    timeLimitMs: candidateAggregate.timeLimitMs,
    sampleCount,
    moveAgreementRate: sampleCount > 0 ? moveMatches / sampleCount : 0,
    scoreAgreementRate: sampleCount > 0 ? scoreMatches / sampleCount : 0,
    candidateAverageDepthGain: candidateAggregate.averageCompletedDepth - baselineAggregate.averageCompletedDepth,
    candidateAverageNodesGainRate: baselineAggregate.averageNodes > 0
      ? (candidateAggregate.averageNodes - baselineAggregate.averageNodes) / baselineAggregate.averageNodes
      : 0,
    candidateNodesPerMsGainRate: baselineAggregate.nodesPerMs > 0
      ? (candidateAggregate.nodesPerMs - baselineAggregate.nodesPerMs) / baselineAggregate.nodesPerMs
      : 0,
    candidateDeeperRate: sampleCount > 0 ? candidateDeeperCount / sampleCount : 0,
    baselineDeeperRate: sampleCount > 0 ? baselineDeeperCount / sampleCount : 0,
  };
}

function writeJsonIfRequested(outputJsonPath, data) {
  if (!outputJsonPath) {
    return null;
  }

  const resolved = resolveCliPath(outputJsonPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return resolved;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const searchAlgorithm = normalizeSearchAlgorithm(args['search-algorithm'] ?? DEFAULTS.searchAlgorithm);
  const searchLabel = describeSearchAlgorithm(searchAlgorithm)?.label ?? searchAlgorithm;
  const variantSpecs = parseVariantSpecList(args['variant-specs'], DEFAULTS.variantSpecs);
  if (variantSpecs.length < 2) {
    throw new Error('At least two variant specs are required.');
  }
  const timeMsList = parseCsvIntegers(args['time-ms-list'], DEFAULTS.timeMsList);
  const positionSeedList = parseCsvIntegers(args['position-seed-list'], DEFAULTS.positionSeedList);
  const openingPlies = toFiniteInteger(args['opening-plies'], DEFAULTS.openingPlies, 0, 60);
  const randomMode = typeof args['random-mode'] === 'string' && args['random-mode'].trim() !== ''
    ? args['random-mode'].trim()
    : DEFAULTS.randomMode;
  const maxDepth = toFiniteInteger(args['max-depth'], DEFAULTS.maxDepth, 1, 12);
  const exactEndgameEmpties = toFiniteInteger(args['exact-endgame-empties'], DEFAULTS.exactEndgameEmpties, 0, 24);
  const aspirationWindow = toFiniteInteger(args['aspiration-window'], DEFAULTS.aspirationWindow, 0, 5000);
  const maxTableEntries = toFiniteInteger(args['max-table-entries'], DEFAULTS.maxTableEntries, 1000, 600000);
  const presetKey = typeof args['preset-key'] === 'string' && args['preset-key'].trim() !== ''
    ? args['preset-key'].trim()
    : DEFAULTS.presetKey;
  const styleKey = typeof args['style-key'] === 'string' && args['style-key'].trim() !== ''
    ? args['style-key'].trim()
    : DEFAULTS.styleKey;

  const variants = [];
  for (const spec of variantSpecs) {
    variants.push(await loadProfileVariant({
      label: spec.label,
      generatedModule: spec.generatedModule,
    }));
  }

  console.log(`Running profile-variant throughput compare | algorithm ${searchAlgorithm} (${searchLabel})`);
  console.log(`Variants: ${variants.map((variant) => variant.label).join(', ')}`);
  console.log(`Time buckets: ${timeMsList.join(', ')} ms | positions: ${positionSeedList.length} | opening plies: ${openingPlies}`);

  const openingStates = positionSeedList.map((seed) => createOpeningState(openingPlies, seed));
  const aggregatesByTime = [];
  const baselineLabel = variants[0].label;

  for (const timeLimitMs of timeMsList) {
    const perVariantAggregates = {};
    for (const variant of variants) {
      const engine = createEngine(variant, {
        searchAlgorithm,
        timeLimitMs,
        maxDepth,
        exactEndgameEmpties,
        aspirationWindow,
        maxTableEntries,
        presetKey,
        styleKey,
      });
      const samples = openingStates.map((state, index) => withBenchRandom(randomMode, positionSeedList[index] ^ timeLimitMs, () => {
        const result = engine.findBestMove(state.clone());
        return summarizeOneResult(index, result);
      }));
      perVariantAggregates[variant.label] = buildAggregate(variant.label, timeLimitMs, samples);
    }

    const baselineAggregate = perVariantAggregates[baselineLabel];
    const comparisons = variants.slice(1).map((variant) => compareAgainstBaseline(baselineAggregate, perVariantAggregates[variant.label]));
    aggregatesByTime.push({
      timeLimitMs,
      variants: perVariantAggregates,
      comparisons,
    });
    console.log(`${timeLimitMs}ms | ${variants.map((variant) => `${variant.label} depth ${perVariantAggregates[variant.label].averageCompletedDepth.toFixed(2)} nodes/ms ${perVariantAggregates[variant.label].nodesPerMs.toFixed(2)}`).join(' | ')}`);
  }

  const finalSummary = {
    type: 'profile-variant-throughput-compare',
    generatedAt: new Date().toISOString(),
    options: {
      searchAlgorithm,
      searchLabel,
      timeMsList,
      positionSeedList,
      openingPlies,
      randomMode,
      maxDepth,
      exactEndgameEmpties,
      aspirationWindow,
      maxTableEntries,
      presetKey,
      styleKey,
    },
    variants: Object.fromEntries(variants.map((variant) => [variant.label, describeVariantForSummary(variant)])),
    baselineVariant: baselineLabel,
    timeBuckets: aggregatesByTime,
  };

  const outputJsonPath = writeJsonIfRequested(args['output-json'], finalSummary);
  if (outputJsonPath) {
    console.log(`Saved benchmark summary to ${relativePathFromCwd(outputJsonPath) ?? outputJsonPath}`);
  }
}

await main();
