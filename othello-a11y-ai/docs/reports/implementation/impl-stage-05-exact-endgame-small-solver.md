# Step 5 Implementation Report — Exact Endgame Small-Solver

## Why this step was chosen

This step prioritized **exact endgame search acceleration** over speculative forward pruning.

Rationale:
- The current engine already switches into exact search when the number of empties is small enough.
- In Othello, exact-search speed strongly affects playing strength because many practical positions are decided by how early the engine can solve the endgame.
- Near-terminal trees are leaf-heavy, so optimizing only the last few empties can accelerate a much larger exact-search envelope upstream.
- Compared with ProbCut / MPC, this path is lower risk because it preserves exactness and does not require calibration data.

## What changed

### 1) Added a specialized exact solver for very small endgames

File:
- `js/ai/search-engine.js`

New behavior:
- When the search is already in exact-endgame mode and the position has **4 or fewer empties**, the engine now routes to a dedicated solver.
- The solver works directly on bitboards and enumerates only the remaining empty squares.
- It handles pass sequences correctly and returns the exact terminal score.

Design choices:
- The solver is intentionally **fully exact**.
- It does **not** depend on the heuristic evaluator.
- It avoids the normal `GameState` allocation path and the normal search move-ordering/TT overhead for the final tiny subtree.

### 2) Added dedicated solver statistics

Files:
- `js/ai/search-engine.js`
- `js/ai/worker.js`

New stats fields:
- `smallSolverCalls`
- `smallSolverNodes`

These make it easier to understand whether speed gains came from better pruning or from reducing per-node overhead in the last few plies.

### 3) Added regression coverage for exact small-endgame correctness

File:
- `js/test/core-smoke.mjs`

New assertions:
- A deterministic 4-empty position is generated.
- Its exact score is computed independently via a slow brute-force recursive solver.
- The engine result must match that exact score.
- The specialized small-endgame solver must actually be exercised in that scenario.

## Validation

Passed:
- `node js/test/core-smoke.mjs`
- `python tests/ui_smoke.py`
- `python tests/virtual_host_smoke.py`

## Benchmarks

Benchmark settings:
- exact search enabled with `exactEndgameEmpties = 16`
- compared Step 4 vs Step 5
- random legal positions generated at fixed empty counts

### A) 4 empties — 16 positions

- Step 4: `3.06 ms`
- Step 5: `1.58 ms`
- Speedup: **1.94x**
- Exact score / best move agreement: **100%**

### B) 6 empties — 16 positions

- Step 4: `7.63 ms`
- Step 5: `3.49 ms`
- Speedup: **2.19x**
- Exact score / best move agreement: **100%**

### C) 8 empties — 12 positions

- Step 4: `34.01 ms`
- Step 5: `14.48 ms`
- Speedup: **2.35x**
- Exact scores matched on all positions
- One position chose a **different move with the same exact score**

### D) 10 empties — 8 positions

- Step 4: `240.18 ms`
- Step 5: `88.17 ms`
- Speedup: **2.72x**
- Exact score / best move agreement: **100%**

## Interpretation

The improvement is real, but it should be interpreted correctly:
- The engine is not mainly pruning more aggressively here.
- Instead, it is doing the last few plies much more cheaply.
- In some samples, the normal negamax node count drops sharply because a large portion of the work has been moved into the specialized small-endgame solver.

This is desirable for a browser-hosted Othello engine because exactness is preserved while late-search overhead falls substantially.

## Files changed in this step

- `js/ai/search-engine.js`
- `js/ai/worker.js`
- `js/test/core-smoke.mjs`

## Recommended next step

Now that the final tiny subtrees are cheaper, the next best candidate is likely one of:

1. **Root-near ETC (Enhanced Transposition Cutoff)**
   - moderate complexity
   - moderate speed benefit
   - low tactical risk when heavily gated

2. **Stability cutoff in late exact search**
   - somewhat higher implementation complexity
   - potentially useful in solved-near-endgame positions
   - overhead must be controlled carefully

Given the current codebase, ETC is probably the safer immediate next experiment.
