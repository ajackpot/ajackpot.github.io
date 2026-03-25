# Step 4 Implementation Report — Pattern / Edge Evaluation Upgrade

## What changed

This step focused on the evaluation function rather than the core rule engine.

### 1) Added local pattern-based evaluation features

Files:
- `js/ai/evaluator.js`
- `js/ai/presets.js`
- `js/ai/search-engine.js`

New evaluation terms:
- `edgePattern`
  - Four 8-square edges are encoded as ternary patterns (empty / self / opponent).
  - A precomputed lookup table scores anchored corner-to-edge runs, dual-corner edge ownership, full-edge ownership, and risky edge occupation near empty corners.
- `cornerPattern`
  - Four oriented 3x3 corner regions are encoded as ternary patterns.
  - A precomputed lookup table scores safe corner ownership and region consolidation, while penalizing X/C-square style exposure when the corner is still empty.

Implementation notes:
- Both pattern tables are precomputed once at module load time.
- The evaluator remains zero-sum by construction.
- Pattern terms were added to `explainFeatures()` for debugging and future tuning.

### 2) Added evaluator controls to presets / styles

Files:
- `js/ai/presets.js`
- `js/ui/settings-panel-view.js` (automatic because custom fields are generated from `CUSTOM_ENGINE_FIELDS`)

New scale controls:
- `edgePatternScale`
- `cornerPatternScale`

Style preset adjustments:
- `fortress` now emphasizes edge/corner patterns more strongly.
- `positional` favors corner-pattern awareness.
- `aggressive` / `chaotic` de-emphasize pattern caution a bit.

### 3) Ensured transposition-table semantics stay correct

File:
- `js/ai/search-engine.js`

The transposition-table invalidation key list now includes the new evaluator scales so cached search results are not reused across meaningfully different evaluation semantics.

### 4) Stabilized live-region behavior for faster AI replies

File:
- `js/ui/live-region-announcer.js`

Because the new evaluator can lead to quicker replies in some short searches, the ARIA live region now keeps a small rolling window of the most recent messages for a short time instead of instantly replacing the previous one. This preserves the human move announcement even when the AI answers very quickly.

---

## Validation

### Regression tests

Passed:
- `node js/test/core-smoke.mjs`
- `python tests/ui_smoke.py`
- `python tests/virtual_host_smoke.py`

Additional smoke assertions added:
- `explainFeatures()` now exposes `edgePattern` and `cornerPattern`.
- A corner-ownership sequence scores better in `cornerPattern` than a nearby risky empty-corner sequence.
- Fortress style increases both new pattern scales.

---

## Benchmarks

### A) Late-position shallow-search quality vs exact endgame truth

Setup:
- 40 random legal positions with 10 empties.
- Exact reference move found with exact endgame search.
- Compared old Step-3 engine vs new Step-4 engine at shallow depths with `exactEndgameEmpties = 0`.

Results:

Depth 2:
- exact best-move match: old `20/40`, new `21/40`
- mean absolute score error: old `172,847`, new `164,399`

Depth 3:
- exact best-move match: old `21/40`, new `22/40`
- mean absolute score error: old `170,870`, new `160,850`

Depth 4:
- exact best-move match: old `21/40`, new `25/40`
- mean absolute score error: old `170,969`, new `159,611`

Interpretation:
- The new evaluator is clearly better at late-position horizon decisions in this benchmark.
- The biggest visible improvement appears at depth 4.

### B) Mixed midgame search cost sample

Setup:
- 12 random midgame positions.
- Full engine search at depth 4.

Results:
- mean searched nodes: old `920`, new `855`
- mean elapsed time: old `124.8 ms`, new `121.1 ms`

Interpretation:
- The pattern terms did not introduce a meaningful slowdown in this sample.
- Search was slightly cheaper on average, likely because move ordering / pruning behavior changed downstream from improved leaf evaluations.

### C) Tiny paired self-play pilot

A very small paired self-play pilot did **not** give a decisive Elo-style conclusion.
The results were mixed and too small to treat as proof of overall strength gain.

Interpretation:
- I am comfortable claiming the evaluator/horizon benchmark improved.
- I am **not** claiming a proven overall Elo increase yet from this step alone.

---

## Why this direction was chosen

The strongest public Othello engines and research lines consistently emphasize:
- pattern-based evaluation,
- staged evaluation,
- corner / edge local structures,
- and selective search such as MPC / Multi-ProbCut.

Given the current codebase already had solid bitboards, iterative deepening, PVS-style search, TT, and an opening book, the most natural next upgrade was to close the evaluation gap before attempting riskier selective-search changes.

---

## Recommended next step

Priority 1:
- Add a **small, carefully gated selective-search experiment**:
  - root-near ETC / enhanced transposition cutoff, or
  - a conservative ProbCut / MPC prototype only in ranges where regression checks stay stable.

Priority 2:
- Expand the pattern system from hand-crafted local tables toward:
  - edge+2X style patterns,
  - 2x5 / 3x3 corner family extensions,
  - or eventually learned pattern weights from a position corpus.
