# Stage 22 Implementation - Exact-only few-empties solver and stats cleanup

## Summary

This stage did two things:

1. Removed a readability issue by extracting the duplicated empty-search-stats object into a shared `createEmptySearchStats()` helper and reusing it from both `search-engine.js` and `worker.js`.
2. Added a new exact-bucket-only optimization for the last 1-4 empties:
   - `optimizedFewEmptiesExactSolver` option (default `true`)
   - alpha-beta inside the exact small solver
   - cheap square-type ordering for the exact small solver only
   - no change to the WLD small solver

## Why this exact scope

A first prototype tried to reuse heavier few-empties ordering ideas for both exact and WLD:
- parity/hole-region bias
- fastest-first style opponent-mobility scoring
- alpha-beta in both exact and WLD small solvers

Local spot checks showed that this reduced small-solver node counts but was slower overall in JavaScript because the ordering work cost more than it saved, especially in the WLD bucket.

The adopted version keeps only the part that screened well:
- exact bucket: enable alpha-beta plus cheap square-type ordering
- WLD bucket: leave the Stage 21 solver unchanged

## Code changes

### Shared stats cleanup

Added:
- `createEmptySearchStats()` in `js/ai/search-engine.js`

Updated:
- `SearchEngine.resetStats()` now calls the shared helper
- `js/ai/worker.js` now imports and uses the same helper for fallback results

This removes the duplicated large stats literal from the worker path.

### Exact few-empties solver

Added:
- `optimizedFewEmptiesExactSolver` option resolution and toggle
- `isOptimizedFewEmptiesExactSolverEnabled()`
- `scoreFewEmptiesExactMove()`
- `generateFewEmptiesExactMoves()`
- `solveSmallExactBoardsFullWidth()` baseline-compatible path

Changed:
- `solveSmallExactBoards()` now selects between:
  - full-width baseline (`optimizedFewEmptiesExactSolver: false`)
  - exact-only alpha-beta + square-type ordering (`true`)
- exact small-solver TT stores now use the correct bound flag derived from the current window instead of always forcing `exact`

Unchanged on purpose:
- `solveSmallWldBoards()`
- WLD pre-exact control flow
- depth-limited / WLD / exact bucket boundaries

## Test additions

`js/test/core-smoke.mjs` now verifies:

1. direct 4-empty optimized exact solve still matches brute-force exact score
2. optimized exact few-empties solve does not visit more small-solver nodes than the full-width baseline on the direct regression
3. a 10-empty exact-bucket regression preserves move and score while reducing exact small-solver work
4. a 12-empty WLD regression keeps WLD behavior and WLD small-solver work unchanged

## Validation run

Passed locally:

- `node js/test/core-smoke.mjs`
- `node js/test/perft.mjs`
- `python3 tests/ui_smoke.py`
- `python3 tests/virtual_host_smoke.py`

## Result

The shipped default is:
- `optimizedFewEmptiesExactSolver = true`

Reason:
- exact bucket showed a measurable speedup in the bucketed audit
- WLD bucket stayed unchanged by design
- the heavier cross-bucket prototype was not adopted
