# Stage 23 Implementation - Specialized exact few-empties solver family

## Summary

This stage adds a new **exact-only specialized few-empties solver family** for the last 1-4 empties.

Shipped result:
- `specializedFewEmptiesExactSolver` option added
- default: `true`
- scope: **exact bucket only**
- WLD bucket: unchanged

The implementation goal was to get the practical part of an Edax-style `solve_3 / solve_4` optimization without mixing WLD and exact search, and without changing the Stage 19/20 boundary rules.

## Why this scope

By Stage 22, the exact small solver already had:
- alpha-beta
- cheap square-type ordering
- exact/WLD bucket separation

What still remained was generic overhead in the last 1-4 empties:
- move-object construction
- generic recursive dispatch
- repeated full-path logic even when the number of empties is already tiny

The low-risk candidate for this stage was therefore:
- keep the existing Stage 22 exact solver path for general use
- add a tighter specialized family only for exact 1-4 empties
- leave WLD untouched

## Screened variant that was not shipped

A first implementation also tried to carry **hole-parity style ordering** into the specialized path.

Local screening showed:
- it reduced exact small-solver nodes even further
- but in this JavaScript engine the extra parity-ordering work erased the timing gain and could become slightly slower overall on realistic exact-root benchmarks

So the shipped Stage 23 path keeps the specialized recursion, but the ordering inside that path remains **cheap square-type ordering only**.

## Code changes

## 1. New option and stats

Added option resolution for:
- `specializedFewEmptiesExactSolver`

Added stats counters:
- `specializedFewEmptiesCalls`
- `specializedFewEmpties1Calls`
- `specializedFewEmpties2Calls`
- `specializedFewEmpties3Calls`
- `specializedFewEmpties4Calls`

These make it possible to verify that the specialized path is actually reached in realistic exact-root searches.

## 2. Specialized exact 1-4 empties solver family

Added:
- `orderSpecializedFewEmptiesIndices()`
- `solveSpecializedFewEmptiesExactBoards()`
- `solveSpecializedExact1()`
- `solveSpecializedExact2()`
- `solveSpecializedExact3()`
- `solveSpecializedExact4()`

Behavior:
- exact score only
- alpha-beta preserved for 2/3/4 empties
- pass handling preserved
- square-type ordering only
- no WLD entry from this path

## 3. Exact small-solver dispatch

Changed `solveSmallExactBoards()` so that:
- if `optimizedFewEmptiesExactSolver` is `false`, Stage 21 full-width baseline remains available
- else if `specializedFewEmptiesExactSolver` is `true` and `empties <= 4`, dispatch goes to the Stage 23 specialized family
- otherwise the Stage 22 optimized generic exact solver remains in use

This makes the Stage 23 feature easy to benchmark in isolation.

## 4. Benchmark helper and regression coverage

Updated `js/test/benchmark-helpers.mjs` to expose the new specialized few-empties counters.

Extended `js/test/core-smoke.mjs` with Stage 23 regressions that verify:
- direct four-empty exact score preservation
- dedicated specialized dispatch is really hit
- realistic ten-empty exact-root move/score preservation
- WLD bucket remains untouched

Added benchmark script:
- `js/test/stage23_specialized_few_empties_exact_benchmark.mjs`

## Validation run

Passed locally:
- `node js/test/core-smoke.mjs`
- `node js/test/perft.mjs`
- `python3 tests/ui_smoke.py`
- `python3 tests/virtual_host_smoke.py`

## Result

The shipped default is:
- `specializedFewEmptiesExactSolver = true`

Reason:
- realistic exact-root timing improved
- exact move/score stayed unchanged on the audit set
- WLD bucket stayed unchanged by design
