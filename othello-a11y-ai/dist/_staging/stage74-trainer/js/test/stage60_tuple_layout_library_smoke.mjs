import assert from 'node:assert/strict';

import {
  listTupleResidualLayoutNames,
  resolveTupleResidualLayout,
} from '../ai/evaluation-profiles.js';

const names = listTupleResidualLayoutNames();
assert.ok(names.includes('orthogonal-adjacent-pairs-outer2-v1'));
assert.ok(names.includes('orthogonal-adjacent-pairs-full-v1'));
assert.ok(names.includes('diagonal-adjacent-pairs-full-v1'));
assert.ok(names.includes('straight-adjacent-pairs-full-v1'));

const orthogonalFull = resolveTupleResidualLayout('orthogonal-adjacent-pairs-full-v1');
const diagonalFull = resolveTupleResidualLayout('diagonal-adjacent-pairs-full-v1');
const straightFull = resolveTupleResidualLayout('straight-adjacent-pairs-full-v1');

assert.equal(orthogonalFull.tupleCount, 112);
assert.equal(orthogonalFull.totalTableSize, 1008);
assert.equal(diagonalFull.tupleCount, 98);
assert.equal(diagonalFull.totalTableSize, 882);
assert.equal(straightFull.tupleCount, 210);
assert.equal(straightFull.totalTableSize, 1890);

console.log('stage60 tuple layout library smoke passed');
