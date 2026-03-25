# Engine Audit Review - Stage 4

## Scope
This stage focused on three follow-up items from the previous review round:

1. Improving the evaluator's stability approximation beyond corner-anchored edges.
2. Tightening search reuse around pass / terminal nodes.
3. Comparing the updated browser engine with the previous review stage on exact late-game samples.

## Summary
The search framework itself remains broadly sound. I did **not** find a new correctness bug on the level of the earlier root-PV mismatch bug.

The main code change in this stage is therefore an **incremental strength improvement**, not an emergency bug fix:

- stability is now estimated more realistically in dense late-game positions,
- pass nodes are now cached in the transposition table,
- and the engine exposes stable-disc counts for easier analysis and regression checking.

## Code Changes

### 1) Conservative iterative stability refinement in `js/ai/evaluator.js`
Previously, stability was approximated almost entirely by:
- corner-anchored edge runs, and
- fully occupied edges.

That was safe but too coarse. It missed late-game interior discs that become effectively locked because all four axes are protected by already-stable same-color chains or by fully occupied lines.

This stage adds:
- precomputed direction masks for each square,
- precomputed line masks for horizontal / vertical / diagonal / anti-diagonal axes,
- a conservative `isConservativelyStable(...)` test,
- an iterative refinement loop that grows stable discs from trusted edge anchors.

Important design choice:
- the refinement is intentionally conservative; it is meant to be a safe lower-bound style approximation, not an expensive exact stability solver.
- it only activates in denser positions (`<= 26` empties) to limit evaluation overhead.

### 2) Stable-disc counts exposed in `explainFeatures(...)`
`Evaluator.explainFeatures(...)` now also returns:
- `stableDiscs`
- `opponentStableDiscs`

This makes targeted evaluator regressions much easier and avoids having to infer stability changes only through the normalized score.

### 3) Pass / terminal TT storage in `js/ai/search-engine.js`
`negamax(...)` now stores transposition-table entries for:
- terminal positions,
- pass nodes (non-terminal positions with no legal move for the side to move).

This is a safe optimization. It does not change game-theoretic correctness, but it improves reuse when the same pass state is re-entered under different search windows or repeated analyses.

## Regression Coverage Added
In `js/test/core-smoke.mjs`:

- **Interior stability regression**
  - confirms that a dense late-game structure with one additional protected interior disc now increases the counted stable discs and the reported stability score.

- **Pass-node TT regression**
  - confirms that a searched pass node is stored in the transposition table,
  - confirms that the cached value matches the returned negamax score,
  - confirms that the cached move marker remains `null`.

## Direct Comparison vs Stage 3
Two small benchmarks were run against the previous reviewed engine (Stage 3).

### A) Exact late-game regret benchmark
File: `benchmarks/late_exact_stage3_vs_stage4.json`

Setup:
- 12 seeded random positions,
- each with exactly 12 empties,
- exact reference from the current engine with `exactEndgameEmpties = 16`,
- comparison target: shallow search (`maxDepth = 4`, `exactEndgameEmpties = 6`) so the evaluator still matters.

Result:
- Stage 3 average regret: **20000**
- Stage 4 average regret: **16666.67**
- Stage 3 exact-best matches: **7 / 12**
- Stage 4 exact-best matches: **8 / 12**

Interpretation:
- This is a **modest but real late-game quality gain** on the sampled positions.
- The main visible win was seed 6, where Stage 3 missed the exact-best move while Stage 4 matched it.

### B) Search-cost benchmark
File: `benchmarks/search_cost_stage3_vs_stage4.json`

Setup:
- 8 seeded random positions,
- each with 20 empties,
- deterministic `maxDepth = 4` search with a large time cap.

Result:
- Stage 3 average elapsed time: **63.75 ms**
- Stage 4 average elapsed time: **78.5 ms**
- Stage 3 average nodes: **668.875**
- Stage 4 average nodes: **677**

Interpretation:
- the new evaluator costs some extra time,
- but node counts stay nearly unchanged,
- so this is mostly an **evaluation-cost increase**, not a search-ordering regression.

In other words: the new stability logic is not free, but the current sample suggests the cost is moderate and localized.

## Why I did not add ProbCut / MPC here
I reviewed this as a candidate next step, but I did **not** apply it in this stage.

Reason:
- selective pruning of the ProbCut / MPC family is strong when well-tuned,
- but it depends on calibrated depth-pair / threshold behavior for the engine's own evaluator,
- and dropping it into this browser engine without that calibration would create unnecessary tactical risk.

So for this round I preferred a safer change:
- improve evaluator information quality,
- improve TT reuse,
- keep the search result trustworthy.

## Validation Run
Passed:
- `node js/test/core-smoke.mjs`
- `python3 tests/virtual_host_smoke.py`
- `python3 tests/ui_smoke.py`

## Current Takeaway
After four review rounds, the engine still looks architecturally solid for a static browser Othello app.

The remaining gap versus top native engines is less about obvious bugs and more about:
- richer learned/pattern evaluation,
- large opening books,
- and statistically tuned selective search.

This stage therefore improves the current heuristic engine in a way that is:
- small in code size,
- regression-tested,
- and plausibly strength-positive in late play.
