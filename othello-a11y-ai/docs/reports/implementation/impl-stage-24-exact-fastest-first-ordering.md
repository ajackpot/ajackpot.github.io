# Stage 24 Implementation - Exact-only fastest-first ordering with cut-aware screening

## Summary

This stage adds an **exact-only fastest-first ordering path** and ships it as the new default.

Shipped result:
- `exactFastestFirstOrdering` option added
- default: `true`
- scope: **exact bucket only**
- WLD bucket: unchanged

Screened but **not shipped**:
- `exactFastestCutFirstOrdering`
- kept as an explicit experimental toggle for future audits
- default: `false`

## Why this stage

By Stage 23, the engine already had:
- separate exact and WLD buckets
- ETC in the exact bucket
- exact-only few-empties solver improvements
- specialized exact `solve_1..4` handling

The next low-risk search-side candidate was not a new solver family, but a different way to order moves **inside the exact bucket**.

The external signals that motivated this were:
- Zebra / Gunnar Andersson material pointing to **fastest-first** as a practical Othello endgame ordering idea
- Edax few-empties code emphasizing that shallow endgame search should favor **cheap, speed-oriented ordering**, not a heavy general-purpose move ordering stack
- later fastest-cut-first work formalizing the same family of ideas as “try cut-likely and small subtrees first”

Given the current JavaScript engine architecture, the most realistic implementation target was:
- keep WLD untouched
- keep correctness unchanged
- only reorder exact nodes
- start with the cheaper “fewest opponent replies first” form
- screen a cut-aware variant separately instead of shipping both at once

## Cleanup done first

Before adding the new heuristic, a small readability / reuse cleanup was made in the ordering path:
- corner membership checks now reuse `CORNER_INDEX_SET` instead of repeated `CORNER_INDICES.includes(...)`
- ordering now reuses precomputed child reply counts and corner-reply counts instead of recomputing them inside multiple exact-ordering paths
- an unused parameter in the specialized few-empties ordering helper was removed
- leftover unused local variables in the specialized exact 2/3/4 solver family were removed

This kept the new heuristic local to the move-ordering code instead of spreading more duplicate child-inspection logic around the file.

## Code changes

## 1. New options and stats

Added options:
- `exactFastestFirstOrdering`
- `exactFastestCutFirstOrdering`

Added stats:
- `fastestFirstExactSorts`
- `fastestCutFirstExactSorts`
- `fastestFirstExactPassCandidates`
- `fastestCutFirstExactTtHints`

These make it possible to verify:
- the shipped exact fastest-first path actually runs
- the WLD bucket stays untouched
- the cut-aware screening mode really reaches its alternate ordering path

## 2. Exact-only fastest-first path

Added helpers:
- `shouldUseExactFastestFirstOrdering()`
- `parentLowerBoundFromChildTableEntry()`
- `parentUpperBoundFromChildTableEntry()`
- `estimateExactFastestCutPriority()`
- `orderExactFastestFirstMoves()`

The shipped ordering policy is intentionally simple:
- only active in the exact bucket
- only above the exact small-solver floor (`empties >= 5`)
- precompute child outcomes for ordering
- sort primarily by **fewest opponent replies first**
- use the previous late-ordering score only as a tie-breaker

So the practical shipped heuristic is:
1. exact node only
2. move that leaves fewer replies for the opponent first
3. if tied, reuse the Stage 20-23 late-ordering score

## 3. Cut-aware screening mode

The non-shipped screening mode keeps the same fastest-first size estimate, but adds a narrow-window priority layer:
- pass-producing moves are boosted
- child TT bounds that imply a strong parent lower bound are boosted
- corner moves get a small bonus
- reply count still breaks ties underneath those cut hints

This was only intended to test whether a lightweight “fastest-cut-first style” layer beats plain fastest-first in this engine.

## 4. Child reply-count reuse in ordering

`orderMoves()` now computes and attaches, when child inspection is already happening:
- `opponentMoveCount`
- `opponentCornerReplies`

`scoreMoveForOrdering()` consumes those cached values when present.

This is both a small cleanup and a way to keep the Stage 24 ordering feature from paying the same inspection cost twice.

## 5. Call-site wiring

`orderMoves()` now receives bucket / window context from:
- root fallback (`general`)
- root exact search (`exact`)
- root WLD search (`wld`)
- subtree exact search (`exact` or `general` depending on root mode)
- subtree WLD search (`wld`)

This makes the Stage 24 logic explicit:
- exact bucket can use fastest-first
- WLD bucket cannot
- general depth-limited search remains on the previous ordering profile

## Validation

Passed locally:
- `node js/test/core-smoke.mjs`
- `node js/test/perft.mjs`
- `python3 tests/ui_smoke.py`
- `python3 tests/virtual_host_smoke.py`

## Result

The shipped default is:
- `exactFastestFirstOrdering = true`
- `exactFastestCutFirstOrdering = false`

Reason:
- exact bucket timing improved clearly in the audit sets
- exact move / score stayed unchanged in the audit sets
- WLD bucket stayed unchanged by construction
- the cut-aware screening mode preserved correctness but was weaker than plain fastest-first in this JavaScript implementation
