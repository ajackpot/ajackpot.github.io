#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  displayGeneratedProfilesModulePath,
  displayProjectPath,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  loadJsonFileIfPresent,
  parseArgs,
  resolveCliPath,
  resolveGeneratedProfilesModulePath,
  sanitizeEvaluationProfileForModule,
  sanitizeMoveOrderingProfileForModule,
  sanitizeTupleResidualProfileForModule,
  sanitizeMpcProfileForModule,
  writeGeneratedProfilesModule,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('build-generated-profile-module.mjs');
  const defaultEvaluationJsonPath = displayTrainingOutputPath('trained-evaluation-profile.json');
  const defaultMoveOrderingJsonPath = displayTrainingOutputPath('trained-move-ordering-profile.json');
  const defaultTupleJsonPath = displayTrainingOutputPath('trained-tuple-residual-profile.json');
  const defaultMpcJsonPath = displayTrainingOutputPath('trained-mpc-profile.json');
  const defaultOutputModulePath = displayTrainingOutputPath('learned-eval-profile.generated.js');
  const defaultSummaryJsonPath = displayProjectPath('benchmarks', 'generated_profile_module_summary.json');
  console.log(`Usage:
  node ${toolPath} \
    [--evaluation-json ${defaultEvaluationJsonPath}] \
    [--move-ordering-json ${defaultMoveOrderingJsonPath}] \
    [--tuple-json ${defaultTupleJsonPath}] \
    [--mpc-json ${defaultMpcJsonPath}] \
    [--output-module ${defaultOutputModulePath}] \
    [--module-format compact|expanded] \
    [--summary-json ${defaultSummaryJsonPath}]

설명:
- 첨부된 evaluation / move-ordering / tuple residual / optional MPC JSON만으로 app용 learned-eval-profile.generated.js를 다시 생성합니다.
- generated.js를 따로 첨부하지 않아도, 이 스크립트로 동일한 런타임 모듈을 만들 수 있습니다.
- 입력 JSON을 정규화해 bucket/feature 누락이나 alias folding 결과가 모듈에 안전하게 반영되도록 합니다.
- 기본 출력은 compact runtime 형식이며, --module-format expanded를 주면 비교/디버그용 pretty module을 만들 수 있습니다.
`);
}

function fileExists(filePath) {
  if (!filePath) {
    return false;
  }
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function maybeDefaultInputPath(candidatePath) {
  return fileExists(candidatePath) ? candidatePath : null;
}

function createProfileSummary(profile, kind) {
  if (!profile) {
    return null;
  }

  if (kind === 'evaluation') {
    const holdoutMaeInStones = profile?.diagnostics?.holdout?.maeInStones ?? null;
    return {
      version: profile.version ?? null,
      name: profile.name ?? null,
      phaseBucketCount: Array.isArray(profile.phaseBuckets) ? profile.phaseBuckets.length : 0,
      holdoutMaeInStones,
    };
  }

  if (kind === 'move-ordering') {
    const top1Accuracy = profile?.diagnostics?.holdoutRoots?.top1Accuracy ?? null;
    const top3Accuracy = profile?.diagnostics?.holdoutRoots?.top3Accuracy ?? null;
    return {
      version: profile.version ?? null,
      name: profile.name ?? null,
      trainedBucketCount: Array.isArray(profile.trainedBuckets) ? profile.trainedBuckets.length : 0,
      holdoutTop1Accuracy: top1Accuracy,
      holdoutTop3Accuracy: top3Accuracy,
    };
  }

  if (kind === 'tuple') {
    const holdoutMaeInStones = profile?.diagnostics?.holdoutSelected?.candidate?.maeInStones ?? null;
    const holdoutMaeDeltaInStones = profile?.diagnostics?.holdoutSelected?.delta?.maeInStones ?? null;
    return {
      version: profile.version ?? null,
      name: profile.name ?? null,
      layoutName: profile?.layout?.name ?? null,
      tupleCount: Array.isArray(profile?.layout?.tuples) ? profile.layout.tuples.length : 0,
      trainedBucketCount: Array.isArray(profile.trainedBuckets) ? profile.trainedBuckets.length : 0,
      totalTableSize: profile?.layout?.totalTableSize ?? null,
      holdoutMaeInStones,
      holdoutMaeDeltaInStones,
    };
  }

  return {
    version: profile.version ?? null,
    name: profile.name ?? null,
    calibrationCount: Array.isArray(profile.calibrations) ? profile.calibrations.length : 0,
    usableCalibrationCount: Array.isArray(profile.calibrations) ? profile.calibrations.filter((entry) => entry?.usable).length : 0,
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const defaultEvaluationJsonPath = maybeDefaultInputPath(resolveCliPath('tools/evaluator-training/out/trained-evaluation-profile.json'));
const defaultMoveOrderingJsonPath = maybeDefaultInputPath(resolveCliPath('tools/evaluator-training/out/trained-move-ordering-profile.json'));
const defaultTupleJsonPath = maybeDefaultInputPath(resolveCliPath('tools/evaluator-training/out/trained-tuple-residual-profile.json'));
const defaultMpcJsonPath = maybeDefaultInputPath(resolveCliPath('tools/evaluator-training/out/trained-mpc-profile.json'));

const evaluationJsonPath = args['evaluation-json']
  ? resolveCliPath(args['evaluation-json'])
  : defaultEvaluationJsonPath;
const moveOrderingJsonPath = args['move-ordering-json']
  ? resolveCliPath(args['move-ordering-json'])
  : defaultMoveOrderingJsonPath;
const tupleJsonPath = args['tuple-json']
  ? resolveCliPath(args['tuple-json'])
  : defaultTupleJsonPath;
const mpcJsonPath = args['mpc-json']
  ? resolveCliPath(args['mpc-json'])
  : defaultMpcJsonPath;

if (!evaluationJsonPath && !moveOrderingJsonPath && !tupleJsonPath && !mpcJsonPath) {
  printUsage();
  process.exit(1);
}

const outputModulePath = args['output-module']
  ? resolveCliPath(args['output-module'])
  : resolveCliPath('tools/evaluator-training/out/learned-eval-profile.generated.js');
const moduleFormat = typeof args['module-format'] === 'string' ? args['module-format'] : 'compact';
const summaryJsonPath = args['summary-json'] ? resolveCliPath(args['summary-json']) : null;

const rawEvaluationProfile = loadJsonFileIfPresent(evaluationJsonPath);
const rawMoveOrderingProfile = loadJsonFileIfPresent(moveOrderingJsonPath);
const rawTupleProfile = loadJsonFileIfPresent(tupleJsonPath);
const rawMpcProfile = loadJsonFileIfPresent(mpcJsonPath);
const evaluationProfile = sanitizeEvaluationProfileForModule(rawEvaluationProfile);
const moveOrderingProfile = sanitizeMoveOrderingProfileForModule(rawMoveOrderingProfile);
const tupleResidualProfile = sanitizeTupleResidualProfileForModule(rawTupleProfile);
const mpcProfile = sanitizeMpcProfileForModule(rawMpcProfile);

if (!evaluationProfile && !moveOrderingProfile && !tupleResidualProfile && !mpcProfile) {
  throw new Error('No readable profile JSON was provided.');
}

const writtenPath = await writeGeneratedProfilesModule(outputModulePath, {
  evaluationProfile,
  moveOrderingProfile,
  tupleResidualProfile,
  mpcProfile,
}, {
  moduleFormat,
});
const moduleStats = await fs.promises.stat(writtenPath);

const summary = {
  generatedAt: new Date().toISOString(),
  evaluationJsonPath,
  moveOrderingJsonPath,
  tupleJsonPath,
  mpcJsonPath,
  outputModulePath: writtenPath,
  moduleFormat,
  outputModuleBytes: moduleStats.size,
  evaluationProfile: createProfileSummary(evaluationProfile, 'evaluation'),
  moveOrderingProfile: createProfileSummary(moveOrderingProfile, 'move-ordering'),
  tupleResidualProfile: createProfileSummary(tupleResidualProfile, 'tuple'),
  mpcProfile: createProfileSummary(mpcProfile, 'mpc'),
};

console.log(`Saved generated profile module to ${writtenPath}`);
console.log(`  evaluation profile : ${evaluationProfile?.name ?? 'null'}`);
console.log(`  move-ordering slot : ${moveOrderingProfile?.name ?? 'null'}`);
console.log(`  tuple residual slot: ${tupleResidualProfile?.name ?? 'null'}`);
console.log(`  mpc slot           : ${mpcProfile?.name ?? 'null'}`);
console.log(`  module format      : ${moduleFormat}`);
console.log(`  module size        : ${moduleStats.size} bytes`);

if (summaryJsonPath) {
  await fs.promises.mkdir(path.dirname(summaryJsonPath), { recursive: true });
  await fs.promises.writeFile(summaryJsonPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`Saved summary JSON to ${summaryJsonPath}`);
}
