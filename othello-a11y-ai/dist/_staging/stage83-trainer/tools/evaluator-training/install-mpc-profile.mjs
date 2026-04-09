#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  ACTIVE_EVALUATION_PROFILE,
  ACTIVE_MOVE_ORDERING_PROFILE,
  ACTIVE_TUPLE_RESIDUAL_PROFILE,
} from '../../js/ai/evaluation-profiles.js';
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
  const toolPath = displayTrainingToolPath('install-mpc-profile.mjs');
  const mpcJsonPath = displayTrainingOutputPath('trained-mpc-profile.json');
  const outputModulePath = displayGeneratedProfilesModulePath();
  const summaryJsonPath = displayProjectPath('benchmarks', 'mpc_install_summary.json');
  console.log(`Usage:
  node ${toolPath} \
    --mpc-json ${mpcJsonPath} \
    [--output-module ${outputModulePath}] [--module-format compact|expanded] \
    [--summary-json ${summaryJsonPath}] \
    [--evaluation-json path/to/evaluation-profile.json] \
    [--move-ordering-json path/to/move-ordering-profile.json] \
    [--tuple-json path/to/tuple-residual-profile.json]

동작:
- MPC profile JSON을 앱용 learned-eval-profile.generated.js에 설치합니다.
- evaluation / move-ordering / tuple residual slot은 별도 JSON을 주지 않으면 현재 활성 module 값을 그대로 보존합니다.
- generated.js를 따로 첨부받지 못했더라도, MPC JSON만으로 현재 repo의 app 모듈을 안전하게 갱신할 수 있습니다.
`);
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h || !args['mpc-json']) {
  printUsage();
  process.exit(args.help || args.h ? 0 : 1);
}

const mpcJsonPath = resolveCliPath(args['mpc-json']);
const outputModulePath = args['output-module'] ? resolveCliPath(args['output-module']) : resolveGeneratedProfilesModulePath();
const moduleFormat = typeof args['module-format'] === 'string' ? args['module-format'] : 'compact';
const summaryJsonPath = args['summary-json'] ? resolveCliPath(args['summary-json']) : null;

const evaluationProfile = sanitizeEvaluationProfileForModule(
  loadJsonFileIfPresent(args['evaluation-json']) ?? ACTIVE_EVALUATION_PROFILE ?? null,
);
const moveOrderingProfile = sanitizeMoveOrderingProfileForModule(
  loadJsonFileIfPresent(args['move-ordering-json']) ?? ACTIVE_MOVE_ORDERING_PROFILE ?? null,
);
const tupleResidualProfile = sanitizeTupleResidualProfileForModule(
  loadJsonFileIfPresent(args['tuple-json']) ?? ACTIVE_TUPLE_RESIDUAL_PROFILE ?? null,
);
const mpcProfile = sanitizeMpcProfileForModule(loadJsonFileIfPresent(mpcJsonPath));

if (!mpcProfile) {
  throw new Error(`읽을 수 있는 MPC profile JSON이 없습니다: ${mpcJsonPath}`);
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
  mpcJsonPath,
  outputModulePath: writtenPath,
  moduleFormat,
  outputModuleBytes: moduleStats.size,
  evaluationProfileName: evaluationProfile?.name ?? null,
  moveOrderingProfileName: moveOrderingProfile?.name ?? null,
  tupleResidualProfileName: tupleResidualProfile?.name ?? null,
  mpcProfileName: mpcProfile?.name ?? null,
  mpcUsableCalibrationCount: Array.isArray(mpcProfile?.calibrations)
    ? mpcProfile.calibrations.filter((calibration) => calibration?.usable !== false).length
    : 0,
  mpcTotalCalibrationCount: Array.isArray(mpcProfile?.calibrations) ? mpcProfile.calibrations.length : 0,
  mpcRuntime: mpcProfile?.runtime ?? null,
};

console.log(`Installed MPC profile into ${writtenPath}`);
console.log(`  evaluation slot : ${evaluationProfile?.name ?? 'null'}`);
console.log(`  move-ordering   : ${moveOrderingProfile?.name ?? 'null'}`);
console.log(`  tuple residual  : ${tupleResidualProfile?.name ?? 'null'}`);
console.log(`  mpc slot        : ${mpcProfile?.name ?? 'null'}`);
console.log(`  usable/total    : ${summary.mpcUsableCalibrationCount}/${summary.mpcTotalCalibrationCount}`);
console.log(`  module format   : ${moduleFormat}`);
console.log(`  module size     : ${moduleStats.size} bytes`);

if (summaryJsonPath) {
  await fs.promises.mkdir(path.dirname(summaryJsonPath), { recursive: true });
  await fs.promises.writeFile(summaryJsonPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`Saved install summary to ${summaryJsonPath}`);
}
