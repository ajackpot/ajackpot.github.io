import assert from 'node:assert/strict';

import { MoveOrderingEvaluator, getPositionalRisk } from '../ai/evaluator.js';
import { SearchEngine } from '../ai/search-engine.js';
import { resolveMoveOrderingBuckets } from '../ai/evaluation-profiles.js';

function manualBucketForEmpties(buckets, empties) {
  return buckets.find((bucket) => empties >= bucket.minEmpties && empties <= bucket.maxEmpties) ?? null;
}

const evaluator = new MoveOrderingEvaluator();
const buckets = resolveMoveOrderingBuckets();
for (let empties = 0; empties <= 64; empties += 1) {
  assert.equal(
    evaluator.selectTrainedBucket(empties)?.key ?? null,
    manualBucketForEmpties(buckets, empties)?.key ?? null,
    `Bucket lookup should remain stable at empties=${empties}`,
  );
}

assert.equal(getPositionalRisk(0), 'corner', 'Corners should still be labeled as corners.');
assert.equal(getPositionalRisk(9), 'x-square', 'X-squares should still be labeled as x-squares.');
assert.equal(getPositionalRisk(1), 'c-square', 'C-squares should still be labeled as c-squares.');
assert.equal(getPositionalRisk(27), 'normal', 'Neutral squares should still be labeled as normal.');

const engine = new SearchEngine({
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 8,
  exactEndgameEmpties: 12,
  timeLimitMs: 100,
  randomness: 0,
});

assert.deepEqual(
  engine.selectLateOrderingProfile(12),
  {
    killerPrimaryScale: 0.5,
    killerSecondaryScale: 0.4,
    historyScale: 0,
    positionalScale: 0,
    flipScale: 0,
    riskScale: 0.25,
    mobilityPenaltyScale: 1.2,
    cornerReplyPenaltyScale: 1.25,
    passBonusScale: 1,
    parityScale: 1.25,
    lightweightEvalScale: 4.5,
  },
  'Exact late-ordering profile should remain unchanged.',
);
assert.deepEqual(
  engine.selectLateOrderingProfile(13),
  {
    killerPrimaryScale: 0.85,
    killerSecondaryScale: 0.8,
    historyScale: 0.45,
    positionalScale: 0.55,
    flipScale: 0.6,
    riskScale: 0.75,
    mobilityPenaltyScale: 1.05,
    cornerReplyPenaltyScale: 1.1,
    passBonusScale: 1,
    parityScale: 1.05,
    lightweightEvalScale: 1.75,
  },
  'Late lightweight profile should remain unchanged.',
);
assert.deepEqual(
  engine.selectLateOrderingProfile(19),
  {
    killerPrimaryScale: 1,
    killerSecondaryScale: 1,
    historyScale: 1,
    positionalScale: 1,
    flipScale: 1,
    riskScale: 1,
    mobilityPenaltyScale: 1,
    cornerReplyPenaltyScale: 1,
    passBonusScale: 1,
    parityScale: 1,
    lightweightEvalScale: 1,
  },
  'General late-ordering profile should remain unchanged.',
);

assert.equal(engine.shouldUseLightweightOrderingEvaluator(12, 2), true, 'Exact-window nodes should still allow lightweight ordering evaluation when depth > 1.');
assert.equal(engine.shouldUseLightweightOrderingEvaluator(12, 1), false, 'Depth-1 nodes should still skip lightweight ordering evaluation.');
assert.equal(engine.shouldUseLightweightOrderingEvaluator(19, 2), false, 'Nodes beyond the late-window threshold should still skip lightweight ordering evaluation.');

assert.equal(engine.orderingScoreTableByEmptyCount[12].passBonus, 2_500_000, 'Exact-window pass bonus should be precomputed without changing its value.');
assert.equal(engine.orderingScoreTableByEmptyCount[13].xSquarePenalty, 112_500, 'Late lightweight x-square penalty should match the prior rounded value.');
assert.equal(engine.orderingScoreTableByEmptyCount[19].mobilityPenaltyPerMove, 1_200, 'General-window mobility penalty should remain unchanged.');

console.log('stage78 move-ordering runtime cleanup smoke passed');
