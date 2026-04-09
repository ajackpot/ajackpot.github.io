#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  displayProjectPath,
  displayTrainingToolPath,
  parseArgs,
  resolveCliPath,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('analyze-next-optimization-lane.mjs');
  const outputJsonPath = displayProjectPath('benchmarks', 'stage45_next_optimization_lane_decision.json');
  console.log(`Usage:
  node ${toolPath} [--chain-replay-json benchmarks/stage45_move_ordering_chain_replay.json] [--output-json ${outputJsonPath}]

설명:
- Stage 39~44 move-ordering follow-up 결과를 모아 최근 marginal gain과 실패한 follow-up을 요약합니다.
- 필요한 경우 Stage 45 chain replay 결과도 함께 반영해, move-ordering을 더 밀지 아니면 다음 최적화 축으로 넘어갈지 추천합니다.
`);
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function percentage(value, digits = 5) {
  if (!Number.isFinite(value)) {
    return null;
  }
  return Number(value.toFixed(digits));
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const outputJsonPath = args['output-json']
  ? resolveCliPath(args['output-json'])
  : resolveCliPath('benchmarks/stage45_next_optimization_lane_decision.json');
const chainReplayPath = args['chain-replay-json']
  ? resolveCliPath(args['chain-replay-json'])
  : resolveCliPath('benchmarks/stage45_move_ordering_chain_replay.json');

const stage39 = loadJson(resolveCliPath('benchmarks/stage39_candidateD_adoption_decision_summary_20260330.json'));
const stage41 = loadJson(resolveCliPath('benchmarks/stage41_candidateF_adoption_decision_summary_20260330.json'));
const stage42 = loadJson(resolveCliPath('benchmarks/stage42_candidateF_followup_decision_summary_20260330.json'));
const stage43 = loadJson(resolveCliPath('benchmarks/stage43_top_pair_search_decision_summary_20260330.json'));
const stage44 = loadJson(resolveCliPath('benchmarks/stage44_candidateH2_adoption_decision_summary_20260330.json'));
const candidateHValidation = loadJson(resolveCliPath('benchmarks/stage43_candidateH_vs_candidateF_seed1_4_exact14_13_depth15_validation_20260330.json'));
const chainReplay = fs.existsSync(chainReplayPath) ? loadJson(chainReplayPath) : null;

const acceptedSegments = [
  {
    from: 'candidateC',
    to: 'candidateD',
    sameRunCombinedDeltaPercent: Number(stage39?.comparisons?.vsCandidateC?.nodes?.combined?.deltaPercent ?? NaN),
  },
  {
    from: 'candidateD',
    to: 'candidateF',
    sameRunCombinedDeltaPercent: Number(stage41?.applesToApples24Seed?.candidateFVsCandidateD?.combinedNodeDeltaPercent ?? NaN),
  },
  {
    from: 'candidateF',
    to: 'candidateH2',
    sameRunCombinedDeltaPercent: Number(stage44?.sameRunValidation24Seed?.vsPriorActive?.combinedNodes?.deltaPercent ?? NaN),
  },
].map((entry) => ({
  ...entry,
  sameRunCombinedDeltaPercent: percentage(entry.sameRunCombinedDeltaPercent),
}));

const candidateHCombinedDelta = (() => {
  const profiles = new Map((candidateHValidation?.profiles ?? []).map((entry) => [entry.key, entry]));
  const base = profiles.get('candidateF');
  const candidate = profiles.get('candidateH');
  if (!base || !candidate) {
    return null;
  }
  const baseCombined = Number(base?.suites?.depth?.overall?.nodes ?? 0) + Number(base?.suites?.exact?.overall?.nodes ?? 0);
  const candidateCombined = Number(candidate?.suites?.depth?.overall?.nodes ?? 0) + Number(candidate?.suites?.exact?.overall?.nodes ?? 0);
  return percentage(((candidateCombined - baseCombined) / baseCombined) * 100);
})();

const failedFollowUps = [
  {
    candidate: 'candidateE fallback@11-12',
    combinedNodeDeltaPercent: percentage(Number(stage42?.smallValidationSeed1_4?.candidateEvsCandidateF?.deltaVsCandidateF?.combinedNodeDeltaPercent ?? NaN)),
  },
  {
    candidate: 'candidateG25 edgePattern@11-12=x0.25',
    combinedNodeDeltaPercent: percentage(Number(stage42?.smallValidationSeed1_4?.candidateGEdgePatternVariantsVsCandidateF?.candidateG25DeltaVsCandidateF?.combinedNodeDeltaPercent ?? NaN)),
  },
  {
    candidate: 'candidateG0 edgePattern@11-12=x0',
    combinedNodeDeltaPercent: percentage(Number(stage42?.smallValidationSeed1_4?.candidateGEdgePatternVariantsVsCandidateF?.candidateG0DeltaVsCandidateF?.combinedNodeDeltaPercent ?? NaN)),
  },
  {
    candidate: 'candidateH top-pair fastpilot winner',
    combinedNodeDeltaPercent: candidateHCombinedDelta,
  },
];

const latestCurrent = {
  profileName: stage44?.activeProfileName ?? stage44?.adoptedProfileName ?? 'stage44-candidateH2-edgePattern125-cornerPattern125-11-12',
  vsBaselineCombinedPercent: percentage(Number(stage44?.sameRunValidation24Seed?.vsBaseline?.combinedDeltaPercent ?? NaN)),
  vsLegacyCombinedPercent: percentage(Number(stage44?.sameRunValidation24Seed?.vsLegacy?.combinedDeltaPercent ?? NaN)),
};

const recentAccepted = acceptedSegments.filter((entry) => Number.isFinite(entry.sameRunCombinedDeltaPercent));
const lastAccepted = recentAccepted[recentAccepted.length - 1] ?? null;
const priorAccepted = recentAccepted[recentAccepted.length - 2] ?? null;
const moveOrderingPlateau = Boolean(
  lastAccepted
  && Math.abs(lastAccepted.sameRunCombinedDeltaPercent) <= 0.05
  && priorAccepted
  && Math.abs(priorAccepted.sameRunCombinedDeltaPercent) <= 0.35
  && failedFollowUps.some((entry) => Number(entry.combinedNodeDeltaPercent) > 0)
);

const recommendation = moveOrderingPlateau
  ? {
      lane: 'pivot-to-mpc-calibration-and-runtime-plumbing',
      continueMoveOrderingManualSearch: false,
      rationale: [
        '최근 채택 이득이 candidateD→F -0.28809%, candidateF→H2 -0.01017%로 급격히 줄었습니다.',
        'candidateE / candidateG / candidateH 등 follow-up 후보가 더 넓은 검증에서 유지되지 않았습니다.',
        'Stage 35에서 이미 “evaluation / move-ordering이 안정화되면 MPC calibration/runtime 실험이 다음 축”으로 정리되어 있었습니다.',
      ],
      nextConcreteWork: [
        'move-ordering은 candidateH2에서 동결하고 재현용 replay/orchestrator만 유지',
        'real trained-mpc-profile.json이 들어오면 calibration profile을 generated module과 runtime option으로 연결',
        '그 다음 conservative MPC benchmark를 current H2 baseline과 same-run으로 비교',
      ],
      needsUserSuppliedCorpusForRealBenchmark: true,
      requestedUserArtifact: 'Egaroucid_Train_Data 전체 또는 calibrated trained-mpc-profile.json',
    }
  : {
      lane: 'continue-move-ordering-search',
      continueMoveOrderingManualSearch: true,
      rationale: [
        '최근 accepted segment가 아직 충분히 큰 편이거나 실패한 follow-up evidence가 부족합니다.',
      ],
      nextConcreteWork: [
        'exact 11-12 bucket pair/3-action search를 더 넓게 재탐색',
      ],
      needsUserSuppliedCorpusForRealBenchmark: false,
      requestedUserArtifact: null,
    };

const summary = {
  generatedAt: new Date().toISOString(),
  acceptedSegments,
  failedFollowUps,
  latestCurrent,
  stage42Decision: stage42?.decision ?? null,
  stage43Decision: stage43?.decision ?? null,
  chainReplay: chainReplay ? {
    path: chainReplayPath,
    finalStatus: chainReplay.finalStatus ?? null,
    segmentDeltas: chainReplay.segmentDeltas ?? [],
  } : null,
  moveOrderingPlateau,
  recommendation,
};

await fs.promises.mkdir(path.dirname(outputJsonPath), { recursive: true });
await fs.promises.writeFile(outputJsonPath, JSON.stringify(summary, null, 2), 'utf8');

console.log(`Saved next-lane analysis to ${outputJsonPath}`);
console.log(`  move-ordering plateau : ${moveOrderingPlateau}`);
console.log(`  recommendation        : ${recommendation.lane}`);
console.log(`  needs corpus/profile  : ${recommendation.needsUserSuppliedCorpusForRealBenchmark}`);
