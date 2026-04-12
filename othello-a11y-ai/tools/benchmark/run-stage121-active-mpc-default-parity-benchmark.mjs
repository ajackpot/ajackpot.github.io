import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ACTIVE_MPC_PROFILE } from '../../js/ai/evaluation-profiles.js';
import { SearchEngine } from '../../js/ai/search-engine.js';
import { EngineClient } from '../../js/ui/engine-client.js';
import {
  playSeededRandomUntilEmptyCount,
  runMedianSearch,
} from '../../js/test/benchmark-helpers.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

function parseArgs(argv) {
  const parsed = {
    output: path.join(repoRoot, 'benchmarks', 'stage121_active_mpc_default_parity_benchmark_20260412.json'),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--output') {
      parsed.output = path.resolve(argv[index + 1]);
      index += 1;
    }
  }

  return parsed;
}

function average(items, key) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }
  const total = items.reduce((sum, item) => sum + Number(item?.[key] ?? 0), 0);
  return total / items.length;
}

function countWhere(items, predicate) {
  return items.reduce((count, item) => count + (predicate(item) ? 1 : 0), 0);
}

const args = parseArgs(process.argv.slice(2));
const activeMpcName = ACTIVE_MPC_PROFILE?.name ?? null;
if (!activeMpcName) {
  throw new Error('Active MPC profile is required for the stage121 default parity benchmark.');
}

const sharedOptions = Object.freeze({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 8,
  timeLimitMs: 2500,
  exactEndgameEmpties: 8,
  aspirationWindow: 40,
  randomness: 0,
  maxTableEntries: 140000,
  wldPreExactEmpties: 0,
});

const representativeState = playSeededRandomUntilEmptyCount(24, 3);
const directDefaultResult = new SearchEngine(sharedOptions).findBestMove(representativeState);
const directNullResult = new SearchEngine({
  ...sharedOptions,
  mpcProfile: null,
}).findBestMove(representativeState);
const client = new EngineClient();
const clientFallbackResult = await client.search(representativeState, sharedOptions);
const helperSummary = runMedianSearch(representativeState, sharedOptions, 1).summary;
const helperNullSummary = runMedianSearch(representativeState, {
  ...sharedOptions,
  mpcProfile: null,
}, 1).summary;

const batchCases = [];
for (const empties of [24, 28, 30, 32]) {
  for (const seed of [1, 3, 5]) {
    const state = playSeededRandomUntilEmptyCount(empties, seed);
    const activeResult = new SearchEngine(sharedOptions).findBestMove(state);
    const nullResult = new SearchEngine({
      ...sharedOptions,
      mpcProfile: null,
    }).findBestMove(state);
    batchCases.push({
      empties,
      seed,
      legalMoves: state.getLegalMoves().length,
      bestMoveActive: activeResult.bestMoveCoord,
      bestMoveNull: nullResult.bestMoveCoord,
      scoreActive: activeResult.score,
      scoreNull: nullResult.score,
      mpcProfileNameActive: activeResult.options?.mpcProfile?.name ?? null,
      mpcProfileNameNull: nullResult.options?.mpcProfile?.name ?? null,
      mpcProbesActive: activeResult.stats?.mpcProbes ?? 0,
      mpcHighCutoffsActive: activeResult.stats?.mpcHighCutoffs ?? 0,
      nodesActive: activeResult.stats?.nodes ?? 0,
      nodesNull: nullResult.stats?.nodes ?? 0,
      nodeDeltaActiveMinusNull: Number(activeResult.stats?.nodes ?? 0) - Number(nullResult.stats?.nodes ?? 0),
      elapsedMsActive: activeResult.stats?.elapsedMs ?? 0,
      elapsedMsNull: nullResult.stats?.elapsedMs ?? 0,
      elapsedDeltaActiveMinusNull: Number(activeResult.stats?.elapsedMs ?? 0) - Number(nullResult.stats?.elapsedMs ?? 0),
      sameBestMove: activeResult.bestMoveCoord === nullResult.bestMoveCoord,
      sameScore: activeResult.score === nullResult.score,
    });
  }
}

const benchmarkSummary = {
  benchmark: 'stage121_active_mpc_default_parity_hardening',
  generatedAt: new Date().toISOString(),
  activeMpcProfileName: activeMpcName,
  sharedOptions,
  representativeState: {
    empties: representativeState.getEmptyCount(),
    legalMoves: representativeState.getLegalMoves().length,
    seed: 3,
    directDefault: {
      bestMove: directDefaultResult.bestMoveCoord,
      score: directDefaultResult.score,
      mpcProfileName: directDefaultResult.options?.mpcProfile?.name ?? null,
      mpcProbes: directDefaultResult.stats?.mpcProbes ?? 0,
      mpcHighCutoffs: directDefaultResult.stats?.mpcHighCutoffs ?? 0,
      nodes: directDefaultResult.stats?.nodes ?? 0,
      elapsedMs: directDefaultResult.stats?.elapsedMs ?? 0,
    },
    directExplicitNull: {
      bestMove: directNullResult.bestMoveCoord,
      score: directNullResult.score,
      mpcProfileName: directNullResult.options?.mpcProfile?.name ?? null,
      mpcProbes: directNullResult.stats?.mpcProbes ?? 0,
      mpcHighCutoffs: directNullResult.stats?.mpcHighCutoffs ?? 0,
      nodes: directNullResult.stats?.nodes ?? 0,
      elapsedMs: directNullResult.stats?.elapsedMs ?? 0,
    },
    engineClientFallback: {
      bestMove: clientFallbackResult.bestMoveCoord,
      score: clientFallbackResult.score,
      mpcProfileName: clientFallbackResult.options?.mpcProfile?.name ?? null,
      mpcProbes: clientFallbackResult.stats?.mpcProbes ?? 0,
      mpcHighCutoffs: clientFallbackResult.stats?.mpcHighCutoffs ?? 0,
      nodes: clientFallbackResult.stats?.nodes ?? 0,
      elapsedMs: clientFallbackResult.stats?.elapsedMs ?? 0,
    },
    helperSummary: {
      mpcProfileName: helperSummary.mpcProfileName,
      mpcProbes: helperSummary.mpcProbes,
      bestMove: helperSummary.bestMove,
      score: helperSummary.score,
      nodes: helperSummary.nodes,
      elapsedMs: helperSummary.elapsedMs,
    },
    helperExplicitNullSummary: {
      mpcProfileName: helperNullSummary.mpcProfileName,
      mpcProbes: helperNullSummary.mpcProbes,
      bestMove: helperNullSummary.bestMove,
      score: helperNullSummary.score,
      nodes: helperNullSummary.nodes,
      elapsedMs: helperNullSummary.elapsedMs,
    },
  },
  batchSummary: {
    caseCount: batchCases.length,
    sameBestMoveCount: countWhere(batchCases, (item) => item.sameBestMove),
    differentBestMoveCount: countWhere(batchCases, (item) => !item.sameBestMove),
    sameScoreCount: countWhere(batchCases, (item) => item.sameScore),
    mpcTriggeredCaseCount: countWhere(batchCases, (item) => item.mpcProbesActive > 0),
    lowerNodeCountWithActiveMpc: countWhere(batchCases, (item) => item.nodeDeltaActiveMinusNull < 0),
    higherNodeCountWithActiveMpc: countWhere(batchCases, (item) => item.nodeDeltaActiveMinusNull > 0),
    fasterCountWithActiveMpc: countWhere(batchCases, (item) => item.elapsedDeltaActiveMinusNull < 0),
    slowerCountWithActiveMpc: countWhere(batchCases, (item) => item.elapsedDeltaActiveMinusNull > 0),
    averageNodeDeltaActiveMinusNull: average(batchCases, 'nodeDeltaActiveMinusNull'),
    averageElapsedDeltaActiveMinusNull: average(batchCases, 'elapsedDeltaActiveMinusNull'),
  },
  batchCases,
};

await fs.mkdir(path.dirname(args.output), { recursive: true });
await fs.writeFile(args.output, `${JSON.stringify(benchmarkSummary, null, 2)}\n`, 'utf8');
console.log(`Wrote ${path.relative(repoRoot, args.output)}`);
