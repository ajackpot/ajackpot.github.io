#!/usr/bin/env node
import path from 'node:path';

import {
  ACTIVE_EVALUATION_PROFILE,
  ACTIVE_MOVE_ORDERING_PROFILE,
  ACTIVE_MPC_PROFILE,
  ACTIVE_TUPLE_RESIDUAL_PROFILE,
} from '../../js/ai/evaluation-profiles.js';
import {
  displayGeneratedProfilesModulePath,
  displayTrainingOutputPath,
  displayTrainingToolPath,
  loadJsonFileIfPresent,
  parseArgs,
  resolveCliPath,
  resolveGeneratedProfilesModulePath,
  writeGeneratedProfilesModule,
} from './lib.mjs';

function printUsage() {
  const toolPath = displayTrainingToolPath('export-profile-module.mjs');
  const evaluationJsonPath = displayTrainingOutputPath('trained-evaluation-profile.json');
  const moveOrderingJsonPath = displayTrainingOutputPath('trained-move-ordering-profile.json');
  const tupleJsonPath = displayTrainingOutputPath('trained-tuple-residual-profile.json');
  const mpcJsonPath = displayTrainingOutputPath('trained-mpc-profile.json');
  const outputModulePath = displayGeneratedProfilesModulePath();
  console.log(`Usage:
  node ${toolPath} \
    [--evaluation-json ${evaluationJsonPath}] \
    [--move-ordering-json ${moveOrderingJsonPath}] \
    [--tuple-json ${tupleJsonPath}] \
    [--mpc-json ${mpcJsonPath}] \
    [--clear-evaluation-profile] [--clear-move-ordering-profile] [--clear-tuple-profile] [--clear-mpc-profile] \
    [--output-module ${outputModulePath}] [--module-format compact|expanded]

Backward-compatible alias:
  --input-json == --evaluation-json

동작:
- 명시한 profile JSON이 있으면 그것을 사용합니다.
- 명시하지 않은 쪽은 현재 활성 generated module 값을 유지합니다.
- --clear-* 를 주면 해당 slot은 null로 비웁니다.
`);
}

const args = parseArgs(process.argv.slice(2));
const evaluationJsonPath = args['evaluation-json'] ?? args['input-json'] ?? null;
const moveOrderingJsonPath = args['move-ordering-json'] ?? null;
const tupleJsonPath = args['tuple-json'] ?? null;
const mpcJsonPath = args['mpc-json'] ?? null;
const clearEvaluationProfile = Boolean(args['clear-evaluation-profile']);
const clearMoveOrderingProfile = Boolean(args['clear-move-ordering-profile']);
const clearTupleProfile = Boolean(args['clear-tuple-profile']);
const clearMpcProfile = Boolean(args['clear-mpc-profile']);

if (
  args.help
  || args.h
  || (!evaluationJsonPath && !moveOrderingJsonPath && !tupleJsonPath && !mpcJsonPath && !clearEvaluationProfile && !clearMoveOrderingProfile && !clearTupleProfile && !clearMpcProfile)
) {
  printUsage();
  process.exit(args.help || args.h ? 0 : 1);
}

const outputModulePath = args['output-module'] ? resolveCliPath(args['output-module']) : resolveGeneratedProfilesModulePath();
const moduleFormat = typeof args['module-format'] === 'string' ? args['module-format'] : 'compact';
const evaluationProfile = clearEvaluationProfile
  ? null
  : (loadJsonFileIfPresent(evaluationJsonPath) ?? ACTIVE_EVALUATION_PROFILE ?? null);
const moveOrderingProfile = clearMoveOrderingProfile
  ? null
  : (loadJsonFileIfPresent(moveOrderingJsonPath) ?? ACTIVE_MOVE_ORDERING_PROFILE ?? null);
const tupleResidualProfile = clearTupleProfile
  ? null
  : (loadJsonFileIfPresent(tupleJsonPath) ?? ACTIVE_TUPLE_RESIDUAL_PROFILE ?? null);
const mpcProfile = clearMpcProfile
  ? null
  : (loadJsonFileIfPresent(mpcJsonPath) ?? ACTIVE_MPC_PROFILE ?? null);

await writeGeneratedProfilesModule(outputModulePath, {
  evaluationProfile,
  moveOrderingProfile,
  tupleResidualProfile,
  mpcProfile,
}, {
  moduleFormat,
});

console.log(`Saved app-ready module to ${outputModulePath}`);
console.log(`  module format      : ${moduleFormat}`);
console.log(`  evaluation profile : ${evaluationProfile?.name ?? 'null'}`);
console.log(`  move-ordering slot : ${moveOrderingProfile?.name ?? 'null'}`);
console.log(`  tuple residual slot: ${tupleResidualProfile?.name ?? 'null'}`);
console.log(`  mpc slot           : ${mpcProfile?.name ?? 'null'}`);
