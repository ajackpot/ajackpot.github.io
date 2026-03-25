# Step 3 report: search-engine comparison and optimization

## What was compared

The current browser engine was compared against stronger Othello/Reversi engine families and technical writeups cited by the user:

- Egaroucid technology explanation
- Edax / Edax-AVX
- Zebra
- Logistello papers

## Main conclusion from the comparison

The current engine already had:

- bitboard board representation
- iterative deepening
- PVS / null-window re-search pattern
- transposition table
- opening book
- a hand-crafted heuristic evaluator

However, compared with stronger engines, the main gaps were:

1. **Evaluation quality gap**
   - Strong engines rely heavily on pattern-based, phase-aware evaluation.
   - The current engine still uses a simpler hand-crafted feature mix.

2. **Selective search gap**
   - Multi-ProbCut / related forward-pruning ideas are not implemented.

3. **Othello-specific move ordering gap**
   - The current engine had basic TT / killer / history / corner ordering.
   - Stronger engines put more weight on endgame-specific ordering, shallow-search reuse, and parity-aware ordering.

4. **Search-state overhead**
   - The original browser search path still carried UI-oriented move history/action payloads through deep search.
   - This is convenient for UI logic but unnecessarily expensive inside the engine.

## Changes implemented in this step

### 1) Lightweight search-state transitions

Added a fast internal search path:

- `GameState.applyMoveFast(index, precomputedFlips)`
- `GameState.passTurnFast()`
- `GameState.getSearchMoves()`
- `rules.applyMoveBitWithFlips()`
- `rules.listLegalSearchMoves()`

This keeps deep search from repeatedly building heavy action/move-history objects.

### 2) Reduced duplicated flip computation in search

Search move generation now carries precomputed flips for search nodes, and the fast move application path can reuse them.

This removes a significant amount of duplicated work in internal nodes.

### 3) Stronger move ordering

Ordering now uses, in addition to the previous heuristics:

- child TT information from previous iterative-deepening passes
- opponent reply mobility from fast bitboard counting
- opponent corner-reply penalties from fast bitboard counting
- pass-forcing bonuses
- quadrant-parity ordering bonus in late positions

### 4) Reuse of precomputed child states in ordering

When ordering already produced a child state, search reuses it instead of re-applying the same move immediately afterward.

## Regression / correctness status

Validated after the changes:

- `node js/test/core-smoke.mjs`
- `python tests/ui_smoke.py`
- `python tests/virtual_host_smoke.py`

Added smoke coverage for:

- `applyMoveFast()` equivalence against normal `applyMove()`
- `getSearchMoves()` legal-move equivalence against the full-detail move generator

## Benchmark snapshot used during this step

### Depth-6 mixed midgame/late-midgame sample (12 positions)

Baseline before this step:

- average nodes: 6506.33
- average time: 685.42 ms

After this step:

- average nodes: 6465.08
- average time: 497.50 ms

### Depth-10 / exact-endgame-14 sample

Position A (12 empties):

- baseline: 3502 ms, 97052 nodes
- after: 2481 ms, 78468 nodes

Position B (12 empties):

- baseline: 1420 ms, 46356 nodes
- after: 1071 ms, 37490 nodes

The best move / final score remained the same on the sampled positions checked during this step.

## What remains as the biggest strength gap

The biggest remaining gap is still **evaluation quality**, not rules or basic alpha-beta structure.

If a later step should focus on playing strength rather than raw speed, the best next targets are:

1. phase-aware edge / corner pattern evaluation improvements
2. a compact pattern table evaluator
3. selective search (carefully gated MPC / ProbCut-style experiments)
4. further endgame ordering / exact-solver micro-optimizations
