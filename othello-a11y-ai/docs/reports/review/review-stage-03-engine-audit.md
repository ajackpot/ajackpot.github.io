# Engine Audit Review - Stage 3

## Scope
This stage focused on two late-game / search-quality improvements that were identified in the previous review round:

1. Replacing the evaluator's flat global parity heuristic with a conservative region-aware parity blend.
2. Improving transposition-table replacement and trimming so that newer / exact / deeper entries survive more reliably.

## Code Changes

### 1) Region-aware parity in `js/ai/evaluator.js`
- Added connected empty-region detection via flood fill.
- Split parity into:
  - `globalParityScore(...)`
  - `computeRegionParityScore(...)`
  - `describeParityHeuristic(...)`
- Blended the old global parity with a region-aware score for late positions.
- Added parity breakdown fields to `explainFeatures(...)`:
  - `parityGlobal`
  - `parityRegion`
  - `parityRegionCount`
  - `parityOddRegions`
  - `parityEvenRegions`

### 2) Region-based late move ordering in `js/ai/search-engine.js`
- Replaced the old quadrant-parity ordering bonus with connected-region parity metadata.
- Move ordering now prefers odd-region entries in late positions instead of relying on coarse quadrant masks.

### 3) TT replacement / aging improvements in `js/ai/search-engine.js`
- Added a transposition-entry priority function that gives meaningful preference to exact entries while still respecting depth.
- Updated replacement logic so a moderately shallower exact entry can replace a bound entry for the same position.
- Added generation-aware trimming that preferentially evicts stale shallow bounds before falling back to generic oldest-entry deletion.
- Moved `searchGeneration` advancement earlier so the trim logic has a meaningful age signal at the start of each new root search.

### 4) Shared utility in `js/core/bitboard.js`
- Added `connectedRegions(bitboard, expand = neighbors)` for reusable connected-component detection on bitboards.

## Regression Coverage Added
In `js/test/core-smoke.mjs`:

- Region-parity regression:
  - confirms that two isolated singleton odd regions are recognized as separate regions,
  - confirms region-aware parity softens the old flat global-even penalty,
  - confirms parity stays zero-sum across perspectives.

- TT replacement regression:
  - confirms a shallower exact entry can replace a moderately deeper bound entry for the same state.

- TT trimming regression:
  - confirms stale shallow bound entries are evicted before a recent deep exact entry during table overflow trimming.

## Validation Run
Passed:
- `node js/test/core-smoke.mjs`
- `python3 tests/virtual_host_smoke.py`
- `python3 tests/ui_smoke.py`

Additional manual exact-search spot checks also matched brute force on seeded 8-empty positions.
