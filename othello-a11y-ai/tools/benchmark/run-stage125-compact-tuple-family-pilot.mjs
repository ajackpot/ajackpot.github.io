import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { bitFromIndex } from '../../js/core/bitboard.js';
import { playSeededRandomUntilEmptyCount, runMedianSearch } from '../../js/test/benchmark-helpers.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const DATE_SUFFIX = '20260412';
const STAGE_DIR = path.join(repoRoot, 'benchmarks', 'stage125');
const DEPTH_DIR = path.join(STAGE_DIR, 'depth');
const EXACT_DIR = path.join(STAGE_DIR, 'exact');
const FAMILY_PILOT_OUTPUT_DIR = path.join(repoRoot, 'tools', 'evaluator-training', 'out', 'stage125-family-pilot');
const FAMILY_PILOT_SUMMARY_PATH = path.join(STAGE_DIR, `stage125_compact_tuple_family_pilot_summary_${DATE_SUFFIX}.json`);
const CORPUS_PATH = path.join(STAGE_DIR, `stage125_compact_tuple_family_pilot_corpus_${DATE_SUFFIX}.jsonl`);
const SUMMARY_PATH = path.join(STAGE_DIR, `stage125_compact_tuple_family_pilot_decision_summary_${DATE_SUFFIX}.json`);
const ACTIVE_MATCH_PATH = path.join(STAGE_DIR, `stage125_active_vs_trineutron_seed125_games2_${DATE_SUFFIX}.json`);
const DIAGONAL_MATCH_PATH = path.join(STAGE_DIR, `stage125_diagonal_pilot_vs_trineutron_seed125_games2_${DATE_SUFFIX}.json`);
const BASELINE_GENERATED_MODULE_PATH = path.join(repoRoot, 'js', 'ai', 'learned-eval-profile.generated.js');

const LAYOUTS = Object.freeze([
  'diagonal-adjacent-pairs-full-v1',
  'orthogonal-adjacent-pairs-full-v1',
  'orthogonal-adjacent-pairs-outer2-v1',
]);

const MAIN_PILOT_LAYOUT = 'diagonal-adjacent-pairs-full-v1';
const TRAINING_GROUPS = Object.freeze([
  {
    bucket: 'late-a',
    empties: [13, 14, 15, 16, 17, 18, 19],
    seeds: Array.from({ length: 12 }, (_, index) => index + 1),
  },
  {
    bucket: 'late-b',
    empties: [7, 8, 9, 10, 11, 12],
    seeds: Array.from({ length: 12 }, (_, index) => index + 21),
  },
  {
    bucket: 'endgame',
    empties: [2, 3, 4, 5, 6],
    seeds: Array.from({ length: 16 }, (_, index) => index + 41),
  },
]);

function relativePortable(targetPath) {
  return path.relative(repoRoot, targetPath).split(path.sep).join('/');
}

function parseArgs(argv) {
  const parsed = {
    output: SUMMARY_PATH,
    summaryOnly: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--output') {
      parsed.output = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }
    if (token === '--summary-only') {
      parsed.summaryOnly = true;
    }
  }
  return parsed;
}

function runNodeScript(scriptPath, args, { label } = {}) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    stdio: 'inherit',
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 128,
  });
  assert.equal(result.status, 0, `${label ?? path.basename(scriptPath)} should succeed.`);
}

function stateToPerspectiveBoardString(state) {
  const { player, opponent } = state.getPlayerBoards(state.currentPlayer);
  let board = '';
  for (let index = 0; index < 64; index += 1) {
    const bit = bitFromIndex(index);
    if ((player & bit) !== 0n) {
      board += 'X';
    } else if ((opponent & bit) !== 0n) {
      board += 'O';
    } else {
      board += '-';
    }
  }
  return board;
}

async function generateSyntheticTeacherCorpus(outputPath) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const rows = [];
  const byEmpties = new Map();
  const byBucket = new Map();
  let exactTeacherCases = 0;
  let totalTeacherElapsedMs = 0;
  let totalTeacherNodes = 0;

  for (const group of TRAINING_GROUPS) {
    for (const empties of group.empties) {
      for (const seed of group.seeds) {
        const state = playSeededRandomUntilEmptyCount(empties, seed);
        const summary = runMedianSearch(
          state,
          {
            presetKey: 'custom',
            styleKey: 'balanced',
            maxDepth: 6,
            timeLimitMs: 1500,
            exactEndgameEmpties: 10,
            aspirationWindow: 40,
            randomness: 0,
          },
          1,
        ).summary;

        rows.push({
          board: stateToPerspectiveBoardString(state),
          engineScore: summary.score,
          empties,
          seed,
          bucket: group.bucket,
          teacher: 'stage125-active-search-depth6-exact10',
          teacherMode: summary.mode,
          teacherExact: Boolean(summary.exact),
          teacherElapsedMs: summary.elapsedMs,
          teacherNodes: summary.nodes,
        });

        byEmpties.set(empties, (byEmpties.get(empties) ?? 0) + 1);
        byBucket.set(group.bucket, (byBucket.get(group.bucket) ?? 0) + 1);
        if (summary.exact) {
          exactTeacherCases += 1;
        }
        totalTeacherElapsedMs += Number(summary.elapsedMs ?? 0);
        totalTeacherNodes += Number(summary.nodes ?? 0);
      }
    }
  }

  await fs.writeFile(outputPath, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');

  return {
    outputPath: relativePortable(outputPath),
    rows: rows.length,
    exactTeacherCases,
    averageTeacherElapsedMs: rows.length > 0 ? totalTeacherElapsedMs / rows.length : 0,
    averageTeacherNodes: rows.length > 0 ? totalTeacherNodes / rows.length : 0,
    byBucket: Object.fromEntries([...byBucket.entries()].sort((left, right) => left[0].localeCompare(right[0]))),
    byEmpties: Object.fromEntries([...byEmpties.entries()].sort((left, right) => left[0] - right[0])),
  };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function summarizeExistingCorpus(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const byEmpties = new Map();
  const byBucket = new Map();
  let exactTeacherCases = 0;
  let totalTeacherElapsedMs = 0;
  let totalTeacherNodes = 0;

  for (const line of lines) {
    const row = JSON.parse(line);
    byEmpties.set(row.empties, (byEmpties.get(row.empties) ?? 0) + 1);
    if (typeof row.bucket === 'string') {
      byBucket.set(row.bucket, (byBucket.get(row.bucket) ?? 0) + 1);
    }
    if (row.teacherExact) {
      exactTeacherCases += 1;
    }
    totalTeacherElapsedMs += Number(row.teacherElapsedMs ?? 0);
    totalTeacherNodes += Number(row.teacherNodes ?? 0);
  }

  return {
    outputPath: relativePortable(filePath),
    rows: lines.length,
    exactTeacherCases,
    averageTeacherElapsedMs: lines.length > 0 ? totalTeacherElapsedMs / lines.length : 0,
    averageTeacherNodes: lines.length > 0 ? totalTeacherNodes / lines.length : 0,
    byBucket: Object.fromEntries([...byBucket.entries()].sort((left, right) => left[0].localeCompare(right[0]))),
    byEmpties: Object.fromEntries([...byEmpties.entries()].sort((left, right) => left[0] - right[0])),
  };
}

async function statBytes(filePath) {
  const stat = await fs.stat(filePath);
  return stat.size;
}

function pickPilotCandidate(summary, layoutName) {
  return (summary.candidates ?? []).find((candidate) => candidate.layoutName === layoutName) ?? null;
}

function toRate(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null;
}

function outcomePoints(outcome) {
  if (outcome === 'win') {
    return 1;
  }
  if (outcome === 'draw') {
    return 0.5;
  }
  return 0;
}

function compareMatchSlots(activeGames, candidateGames) {
  const candidateBySlot = new Map(candidateGames.map((game) => [`${game.openingSeed}:${game.ourColor}`, game]));
  const comparisons = [];
  let better = 0;
  let worse = 0;
  let equal = 0;

  for (const activeGame of activeGames) {
    const slotKey = `${activeGame.openingSeed}:${activeGame.ourColor}`;
    const candidateGame = candidateBySlot.get(slotKey);
    if (!candidateGame) {
      continue;
    }

    const activePoints = outcomePoints(activeGame.outcome);
    const candidatePoints = outcomePoints(candidateGame.outcome);
    const pointDelta = candidatePoints - activePoints;
    const discDelta = Number(candidateGame.ourDiscDiff ?? 0) - Number(activeGame.ourDiscDiff ?? 0);
    let verdict = 'equal';
    if (pointDelta > 0 || (pointDelta === 0 && discDelta > 0)) {
      verdict = 'better';
      better += 1;
    } else if (pointDelta < 0 || (pointDelta === 0 && discDelta < 0)) {
      verdict = 'worse';
      worse += 1;
    } else {
      equal += 1;
    }

    comparisons.push({
      openingSeed: activeGame.openingSeed,
      color: activeGame.ourColor,
      activeOutcome: activeGame.outcome,
      candidateOutcome: candidateGame.outcome,
      activeDiscDiff: activeGame.ourDiscDiff,
      candidateDiscDiff: candidateGame.ourDiscDiff,
      pointDelta,
      discDelta,
      verdict,
    });
  }

  return {
    comparedSlots: comparisons.length,
    better,
    worse,
    equal,
    comparisons,
  };
}

function summarizeDepthOrExact(json) {
  return {
    overall: json.overall,
    byEmpties: (json.byEmpties ?? []).map((bucket) => ({
      empties: bucket.empties,
      cases: bucket.cases,
      identicalBestMoveCases: bucket.identicalBestMoveCases,
      identicalBestMoveRate: toRate(bucket.identicalBestMoveCases, bucket.cases),
      identicalScoreCases: bucket.identicalScoreCases ?? null,
      identicalScoreRate: Number.isInteger(bucket.identicalScoreCases)
        ? toRate(bucket.identicalScoreCases, bucket.cases)
        : null,
      candidateNodeRatio: bucket.baselineNodes > 0 ? bucket.candidateNodes / bucket.baselineNodes : null,
      candidateElapsedRatio: bucket.baselineElapsedMs > 0 ? bucket.candidateElapsedMs / bucket.baselineElapsedMs : null,
    })),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  await fs.mkdir(STAGE_DIR, { recursive: true });
  await fs.mkdir(DEPTH_DIR, { recursive: true });
  await fs.mkdir(EXACT_DIR, { recursive: true });

  const corpusSummary = args.summaryOnly
    ? await summarizeExistingCorpus(CORPUS_PATH)
    : await generateSyntheticTeacherCorpus(CORPUS_PATH);

  if (!args.summaryOnly) {
    runNodeScript(
      path.join(repoRoot, 'tools', 'evaluator-training', 'run-tuple-layout-family-pilot.mjs'),
      [
        '--input', CORPUS_PATH,
        '--output-dir', FAMILY_PILOT_OUTPUT_DIR,
        '--skip-phase-training',
        '--layouts', LAYOUTS.join(','),
        '--phase-buckets', 'late-a,late-b,endgame',
        '--holdout-mod', '5',
        '--holdout-residue', '0',
        '--tuple-sample-stride', '1',
        '--tuple-epochs', '2',
        '--tuple-min-visits', '4',
        '--tuple-learning-rate', '0.05',
        '--tuple-l2', '0.0005',
        '--tuple-gradient-clip', '90000',
        '--calibration-scope', 'holdout-selected',
        '--calibration-shrink', '1.0',
        '--calibration-max-bias-stones', '1.5',
        '--summary-json', FAMILY_PILOT_SUMMARY_PATH,
      ],
      { label: 'stage125 tuple layout family pilot' },
    );

    for (const layoutName of LAYOUTS) {
      const candidateModulePath = path.join(FAMILY_PILOT_OUTPUT_DIR, layoutName, 'learned-eval-profile.generated.js');
      const depthOutputPath = path.join(DEPTH_DIR, `${layoutName}_depth_benchmark_${DATE_SUFFIX}.json`);
      const exactOutputPath = path.join(EXACT_DIR, `${layoutName}_exact_benchmark_${DATE_SUFFIX}.json`);

      runNodeScript(
        path.join(repoRoot, 'tools', 'evaluator-training', 'benchmark-depth-search-profile.mjs'),
        [
          '--baseline-generated-module', BASELINE_GENERATED_MODULE_PATH,
          '--candidate-generated-module', candidateModulePath,
          '--output-json', depthOutputPath,
          '--empties', '18,16,14,12',
          '--seed-start', '101',
          '--seed-count', '8',
          '--repetitions', '1',
          '--time-limit-ms', '1500',
          '--max-depth', '6',
          '--exact-endgame-empties', '10',
        ],
        { label: `${layoutName} depth benchmark` },
      );

      runNodeScript(
        path.join(repoRoot, 'tools', 'evaluator-training', 'benchmark-exact-search-profile.mjs'),
        [
          '--baseline-generated-module', BASELINE_GENERATED_MODULE_PATH,
          '--candidate-generated-module', candidateModulePath,
          '--output-json', exactOutputPath,
          '--empties', '10,8,6',
          '--seed-start', '201',
          '--seed-count', '6',
          '--repetitions', '1',
          '--time-limit-ms', '60000',
          '--max-depth', '12',
        ],
        { label: `${layoutName} exact benchmark` },
      );
    }

    runNodeScript(
      path.join(repoRoot, 'tools', 'engine-match', 'benchmark-vs-trineutron.mjs'),
      [
        '--output-json', ACTIVE_MATCH_PATH,
        '--variants', 'active',
        '--games', '2',
        '--opening-plies', '20',
        '--seed', '125',
        '--our-time-ms', '100',
        '--their-time-ms', '100',
        '--our-max-depth', '6',
        '--their-max-depth', '18',
        '--exact-endgame-empties', '10',
        '--solver-adjudication-empties', '14',
        '--solver-adjudication-time-ms', '60000',
        '--their-noise-scale', '4',
      ],
      { label: 'stage125 active trineutron sanity check' },
    );

    runNodeScript(
      path.join(repoRoot, 'tools', 'engine-match', 'benchmark-vs-trineutron.mjs'),
      [
        '--output-json', DIAGONAL_MATCH_PATH,
        '--variants', 'custom',
        '--generated-module', path.join(FAMILY_PILOT_OUTPUT_DIR, MAIN_PILOT_LAYOUT, 'learned-eval-profile.generated.js'),
        '--variant-label', 'diagonal-full-pilot',
        '--games', '2',
        '--opening-plies', '20',
        '--seed', '125',
        '--our-time-ms', '100',
        '--their-time-ms', '100',
        '--our-max-depth', '6',
        '--their-max-depth', '18',
        '--exact-endgame-empties', '10',
        '--solver-adjudication-empties', '14',
        '--solver-adjudication-time-ms', '60000',
        '--their-noise-scale', '4',
      ],
      { label: 'stage125 diagonal trineutron sanity check' },
    );
  }

  const baselineModuleBytes = await statBytes(BASELINE_GENERATED_MODULE_PATH);
  const pilotSummary = await readJson(FAMILY_PILOT_SUMMARY_PATH);
  const candidateSummaries = [];
  let bestVerifiedHoldoutCandidate = null;
  let bestDepthCandidate = null;

  for (const layoutName of LAYOUTS) {
    const pilotCandidate = pickPilotCandidate(pilotSummary, layoutName);
    assert.ok(pilotCandidate, `Missing pilot candidate: ${layoutName}`);

    const depthJson = await readJson(path.join(DEPTH_DIR, `${layoutName}_depth_benchmark_${DATE_SUFFIX}.json`));
    const exactJson = await readJson(path.join(EXACT_DIR, `${layoutName}_exact_benchmark_${DATE_SUFFIX}.json`));
    const candidateSummary = {
      layoutName,
      tupleCount: pilotCandidate.tupleCount,
      totalTableSize: pilotCandidate.totalTableSize,
      generatedModuleBytes: pilotCandidate.generatedModuleBytes,
      generatedModuleByteDeltaVsBaseline: pilotCandidate.generatedModuleBytes - baselineModuleBytes,
      rawHoldoutSelectedMaeInStones: pilotCandidate.rawHoldoutSelectedMaeInStones,
      rawHoldoutSelectedMaeDeltaInStones: pilotCandidate.rawHoldoutSelectedMaeDeltaInStones,
      verifiedHoldoutSelectedMaeInStones: pilotCandidate.verifiedHoldoutSelectedMaeInStones,
      verifiedHoldoutSelectedMaeDeltaInStones: pilotCandidate.verifiedHoldoutSelectedMaeDeltaInStones,
      depthBenchmark: summarizeDepthOrExact(depthJson),
      exactBenchmark: summarizeDepthOrExact(exactJson),
    };
    candidateSummaries.push(candidateSummary);

    if (!bestVerifiedHoldoutCandidate || candidateSummary.verifiedHoldoutSelectedMaeInStones < bestVerifiedHoldoutCandidate.verifiedHoldoutSelectedMaeInStones) {
      bestVerifiedHoldoutCandidate = candidateSummary;
    }
    if (!bestDepthCandidate || (candidateSummary.depthBenchmark.overall.identicalBestMoveCases > bestDepthCandidate.depthBenchmark.overall.identicalBestMoveCases)) {
      bestDepthCandidate = candidateSummary;
    }
  }

  const activeMatchJson = await readJson(ACTIVE_MATCH_PATH);
  const diagonalMatchJson = await readJson(DIAGONAL_MATCH_PATH);
  const activeVariant = activeMatchJson.variants?.[0] ?? null;
  const diagonalVariant = diagonalMatchJson.variants?.[0] ?? null;
  assert.ok(activeVariant, 'Missing active Trineutron variant summary.');
  assert.ok(diagonalVariant, 'Missing diagonal Trineutron variant summary.');

  const matchSlotComparison = compareMatchSlots(activeVariant.games ?? [], diagonalVariant.games ?? []);

  const output = {
    benchmark: 'stage125_compact_tuple_family_bounded_pilot',
    generatedAt: new Date().toISOString(),
    runtimeBaselineStage: 123,
    corpus: corpusSummary,
    artifacts: {
      familyPilotSummaryJson: relativePortable(FAMILY_PILOT_SUMMARY_PATH),
      activeTrineutronJson: relativePortable(ACTIVE_MATCH_PATH),
      diagonalTrineutronJson: relativePortable(DIAGONAL_MATCH_PATH),
      baselineGeneratedModule: relativePortable(BASELINE_GENERATED_MODULE_PATH),
    },
    pilotConfig: {
      layouts: LAYOUTS,
      phaseBuckets: ['late-a', 'late-b', 'endgame'],
      holdoutMod: 5,
      tupleSampleStride: 1,
      tupleEpochs: 2,
      tupleMinVisits: 4,
      tupleLearningRate: 0.05,
      tupleL2: 0.0005,
      tupleGradientClip: 90000,
      depthBenchmark: {
        empties: [18, 16, 14, 12],
        seedStart: 101,
        seedCount: 8,
        timeLimitMs: 1500,
        maxDepth: 6,
        exactEndgameEmpties: 10,
      },
      exactBenchmark: {
        empties: [10, 8, 6],
        seedStart: 201,
        seedCount: 6,
        maxDepth: 12,
      },
      trineutronSanityCheck: {
        openings: 2,
        openingSeedStart: 125,
        ourTimeMs: 100,
        theirTimeMs: 100,
        theirNoiseScale: 4,
        note: 'Active and diagonal pilot were run as separate single-variant jobs with the same settings to avoid the multi-variant runner instability observed for this custom generated module.',
      },
    },
    baselineGeneratedModuleBytes: baselineModuleBytes,
    candidates: candidateSummaries,
    bestVerifiedHoldoutCandidate: {
      layoutName: bestVerifiedHoldoutCandidate.layoutName,
      verifiedHoldoutSelectedMaeInStones: bestVerifiedHoldoutCandidate.verifiedHoldoutSelectedMaeInStones,
      verifiedHoldoutSelectedMaeDeltaInStones: bestVerifiedHoldoutCandidate.verifiedHoldoutSelectedMaeDeltaInStones,
    },
    bestDepthCandidate: {
      layoutName: bestDepthCandidate.layoutName,
      identicalBestMoveCases: bestDepthCandidate.depthBenchmark.overall.identicalBestMoveCases,
      cases: bestDepthCandidate.depthBenchmark.overall.cases,
      nodeDeltaPercent: bestDepthCandidate.depthBenchmark.overall.nodeDeltaPercent,
      elapsedDeltaPercent: bestDepthCandidate.depthBenchmark.overall.elapsedDeltaPercent,
    },
    trineutronSanityCheck: {
      active: {
        variantKey: activeVariant.variantKey,
        variantLabel: activeVariant.variantLabel,
        aggregate: activeVariant.aggregate,
      },
      diagonalPilot: {
        variantKey: diagonalVariant.variantKey,
        variantLabel: diagonalVariant.variantLabel,
        aggregate: diagonalVariant.aggregate,
      },
      slotComparison: matchSlotComparison,
    },
    decision: {
      verdict: 'keep-active-baseline-no-stage125-adoption',
      adoptedLayout: null,
      reasons: [
        'The bounded pilot produced small synthetic-holdout gains for all three compact pair families, but the verified post-calibration improvement stayed tiny and did not clearly separate a new family from the existing outer2 control.',
        'On the current late search replay, the main diagonal pilot had the best same-best depth fidelity among the new families, but still changed best moves in 5 of 32 cases and regressed elapsed time despite a modest node reduction.',
        'The outer2 control won the synthetic holdout but lost more search-fidelity cases against the current active runtime and even increased nodes on the bounded depth suite.',
        'All candidates stayed exact-safe on the 18-case exact suite, so the lane remains structurally viable, but exact safety alone is not enough to justify adoption.',
        'The small Trineutron sanity check tied the active baseline on score rate over 4 games, yet the diagonal pilot was worse on average disc margin and consumed more time/nodes per game, so there is no external signal strong enough to escalate the lane right now.',
      ],
      nextAction: 'Archive the bounded pilot as a reproducible reference, keep the active runtime unchanged, and only reopen this tuple-family lane when a richer external corpus or a larger offline training budget is available.',
      survivingHiddenSubcandidate: 'If the lane is ever reopened, start from diagonal-adjacent-pairs-full-v1 again but with a richer corpus and immediately follow with move-ordering compatibility replay before any runtime adoption decision.',
    },
  };

  await fs.writeFile(args.output, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${relativePortable(args.output)}`);
}

await main();
