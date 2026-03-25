# Review Stage 5 Implementation Report — Conservative Selective Search (LMR)

## Why this step was chosen

After the previous review rounds, the engine already had:
- bitboards,
- iterative deepening with aspiration,
- PVS-style root/interior search,
- transposition-table reuse,
- an opening book,
- improved late-game parity/stability,
- and a specialized exact small-endgame path.

The next candidate improvements were:
1. add more hand-authored evaluation patterns (for example diagonal extensions), or
2. reduce search work more safely.

I chose **conservative Late Move Reduction (LMR)** first.

Reason:
- strong public Othello engines clearly rely on selective search,
- but ProbCut / Multi-ProbCut style pruning needs calibration data and is risky to drop directly into a browser-hosted JavaScript engine,
- while a tightly gated LMR can reduce obviously low-priority interior moves without touching exact endgame semantics.

## What changed

### 1) Added conservative LMR inside interior negamax search

File:
- `js/ai/search-engine.js`

Behavior:
- only **non-root** moves are eligible,
- only **late-ordered** moves are eligible,
- only **non-exact** nodes are eligible,
- near-endgame positions are excluded,
- corner moves and current killer moves are excluded,
- reduction is small and capped:
  - usually 1 ply,
  - 2 plies only for deeper searches and much later moves.

Search flow:
1. Search the late move first with a reduced null-window search.
2. If that reduced result does not raise alpha, keep the cheap result.
3. If it raises alpha, repair immediately with a full-depth null-window search.
4. If it still lands strictly inside the window, do the usual full-window re-search.

This keeps the change conservative:
- low-priority moves get cheaper,
- promising moves still receive normal treatment,
- exact endgames remain untouched.

### 2) Added explicit LMR stats

Files:
- `js/ai/search-engine.js`
- `js/ai/worker.js`

New stats fields:
- `lmrReductions`
- `lmrReSearches`
- `lmrFullReSearches`

These distinguish:
- how often reduced searches were attempted,
- how often they had to be repaired at full depth,
- and how often that still required a full-window search.

### 3) Added regression coverage

File:
- `js/test/core-smoke.mjs`

New assertions:
- a representative 18-empty seeded midgame search must actually trigger LMR,
- near-endgame exact search must keep `lmrReductions === 0`,
- earlier correctness regressions still pass unchanged.

## Validation

Passed:
- `node js/test/core-smoke.mjs`
- `python3 tests/virtual_host_smoke.py`
- `python3 tests/ui_smoke.py`

## Benchmarks

### A) Midgame cost sample

Setup:
- 20 seeded random legal positions with 18 empties
- search depth 5
- `exactEndgameEmpties = 12`
- compared against the previous reviewed Stage 4 baseline

Results:
- mean searched nodes: `1915.95 -> 1816.15` (**-5.2%**)
- mean elapsed time: `156.35 ms -> 145.60 ms` (**-6.9%**)
- completed depth: unchanged (`5` average in both runs)
- mean LMR reductions per search: `14.3`
- mean full-depth repairs: `1.3`
- mean full-window repairs: `0.2`
- best move on this sample: `20 / 20` same as the Stage 4 baseline

Interpretation:
- the optimization is doing real work,
- most reduced searches do **not** come back as dangerous tactical candidates,
- the search keeps the same completed depth while becoming cheaper.

### B) Exact endgame sanity check

Setup:
- 5 seeded random legal positions with 8 empties
- `exactEndgameEmpties = 16`
- compared with brute-force exact scores

Results:
- exact-score matches: baseline `5 / 5`, new `5 / 5`
- mean elapsed time: `8.6 ms -> 8.8 ms`
- mean searched nodes: `183 -> 183`
- LMR reductions in candidate: `0`
- best move agreement with baseline: `5 / 5`

Interpretation:
- exact behavior stayed unchanged in the sampled near-endgames,
- the LMR gating is correctly disabled where exact semantics matter most.

## Files changed in this step

- `js/ai/search-engine.js`
- `js/ai/worker.js`
- `js/test/core-smoke.mjs`
- `benchmarks/midgame_cost_stage4_vs_stage5.json`
- `benchmarks/exact_8empties_stage4_vs_stage5.json`
- `review-stage-05-conservative-selective-search-lmr.md`

## Recommended next step

The strongest public Othello engines still go further in two directions:

1. **calibrated selective search**
   - ProbCut / Multi-ProbCut style pruning,
   - only after collecting enough search statistics to set thresholds responsibly;

2. **stronger learned pattern evaluation**
   - especially diagonal / corner-extension patterns,
   - but preferably with tuning data rather than purely hand-written weights.

For this project, the next safe candidate is probably:
- collect benchmark data for selective-search calibration, or
- add one carefully bounded diagonal-pattern feature and benchmark it against this new baseline.
