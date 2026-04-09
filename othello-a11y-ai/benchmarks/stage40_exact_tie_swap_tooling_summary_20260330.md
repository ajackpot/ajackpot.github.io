# Stage 40 exact tie-swap tooling summary (2026-03-30)

## Why this step was needed

The Stage 39 move-ordering adoption left one exact wider-validation root where the best move changed while the exact root score stayed the same:

- candidateC -> candidateD exact `(empties=11, seed=21)`
- best move changed `F1 -> H2`
- exact score stayed `-180000`

That pattern is usually a benign equal-valued root tie, but until this step the local-search tuner only knew how to count raw best-move mismatches. It could not distinguish:

- harmful exact regressions, from
- safe exact tie swaps between multiple optimal root moves.

This step adds tooling that verifies the difference with explicit exact root move scoring.

## Code added

### New reusable helper

- `tools/evaluator-training/exact-root-tie-utils.mjs`

Provides:

- exact root search helpers
- per-move exact root scoring for selected legal moves
- board ASCII rendering for audits
- `auditExactBestMoveTieSwap(...)` to verify whether two different best moves are both exact-optimal

### New CLI tool

- `tools/evaluator-training/audit-exact-best-move-tie-swaps.mjs`

Purpose:

- compare two move-ordering profiles on exact roots
- find same-score / different-best-move cases
- verify whether they are safe tie swaps
- optionally enumerate all legal exact-optimal moves for each audited root

### Local-search tuner upgrade

- `tools/evaluator-training/tune-move-ordering-search-cost.mjs`

New flag:

- `--allow-verified-exact-tie-swaps`

Behavior:

- keeps exact score mismatches disallowed by default
- when the flag is enabled, exact best-move mismatches with the **same exact score** are rechecked by explicit exact root move scoring
- only mismatches verified as equal-valued optimal moves are discounted from the safety threshold

## Smoke coverage

### New smoke test

- `js/test/stage40_exact_tie_swap_audit_smoke.mjs`

It verifies three things:

1. the tie-swap audit tool proves `candidateC -> candidateD` at `(empties=11, seed=21)` is a real exact tie
2. the tuner **without** `--allow-verified-exact-tie-swaps` rejects `fallback@10-10`
3. the tuner **with** `--allow-verified-exact-tie-swaps` accepts `fallback@10-10`

### Regression check

- `js/test/stage39_move_ordering_local_search_smoke.mjs`

Still passes after the tuner change.

## Targeted audit results

Output:

- `benchmarks/stage40_targeted_exact_tie_swap_audit_20260330.json`

Summary:

- audited cases: `4`
- raw best-move mismatches: `4`
- verified tie swaps: `4`
- unverified best-move mismatches: `0`

Verified cases:

1. `candidateC vs candidateD`, exact `(empties=11, seed=21)`
   - reported change: `F1 -> H2`
   - verified exact-optimal set: `F1, H2, G7`

2. `legacy vs candidateD`, exact `(empties=13, seed=21)`
   - reported change: `A5 -> F1`
   - verified exact-optimal set: `F1, H2, A5`

3. `legacy vs candidateD`, exact `(empties=12, seed=1)`
   - reported change: `H2 -> G7`
   - verified exact-optimal set: `D1, H2, G7`

4. `legacy vs candidateD`, exact `(empties=11, seed=21)`
   - reported change: `F1 -> H2`
   - verified exact-optimal set: `F1, H2, G7`

## Conclusion

The Stage 39 exact best-move differences observed so far are not solved-value regressions. They are verified root tie swaps among multiple exact-optimal moves.

This means future search-cost local search can safely keep optimizing when the only disagreement is a verified exact tie, instead of conservatively discarding those candidates as if they were real exact regressions.
