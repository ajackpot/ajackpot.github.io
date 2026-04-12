import {
  runImmediateWipeoutGuardSmoke,
  runMctsImmediateWipeoutBiasSmoke,
  runMctsRootThreatPenaltySmoke,
  runSpecialEndingScoutSmoke,
} from './special-ending-regression-helpers.mjs';

runSpecialEndingScoutSmoke();
runImmediateWipeoutGuardSmoke();
runMctsImmediateWipeoutBiasSmoke();
runMctsRootThreatPenaltySmoke();

console.log('stage98 special ending regression suite passed');
