# Step 6 Implementation Report — Search Overhead Reduction and TT-First Search

## Why this step was chosen

For this step, I did **not** prioritize adding a brand-new pruning method first.

Instead, I focused on a lower-risk question:

> Is the current engine doing unnecessary work inside the existing search loop?

After reviewing the current code and re-checking the search flow, two issues stood out:

1. **The engine was still doing redundant work per node**
   - `negamax()` checked terminality first, which internally regenerated legal-move information.
   - It then generated legal moves again for actual search.
   - This duplicated mobility work on almost every non-terminal node.

2. **The engine did not exploit the previous-best TT move early enough**
   - Even when a transposition-table move was available from earlier iterations, the engine still ran full move-ordering preparation before searching it.
   - That means move-ordering overhead was often paid even in cases where the old PV move would quickly raise alpha or fail high.

Given the current browser-hosted JavaScript codebase, these changes were judged to have:
- **lower implementation risk** than ProbCut / MPC,
- **better expected speed return** than immediately adding more pruning complexity,
- and **no tactical correctness risk**, because they preserve the same search result semantics.

## What changed

### 1) Searched the previous TT/PV move before full move ordering

File:
- `js/ai/search-engine.js`

New behavior:
- At the **root** and in **interior negamax nodes**, if a usable transposition-table best move is available, the engine now:
  1. removes that move from the candidate list,
  2. searches it immediately,
  3. only performs full move ordering for the remaining moves if needed.

Benefits:
- avoids paying ordering overhead before searching the move most likely to be best,
- allows earlier alpha updates,
- allows earlier beta cutoffs,
- aligns better with iterative deepening behavior.

New stats:
- `ttFirstSearches`
- `ttFirstCutoffs`

### 2) Removed redundant terminal detection work inside `negamax()`

File:
- `js/ai/search-engine.js`

Old flow:
- TT probe
- terminal check
- small exact solver check
- legal move generation

Problem:
- terminal check itself generated move information again.

New flow:
- TT probe
- small exact solver check
- legal move generation once
- if no legal move, only then check whether the opponent also has none

Effect:
- reduces repeated legal-move work in the hot path,
- preserves exact pass/terminal handling.

### 3) Added lightweight immutable-state caches

File:
- `js/core/game-state.js`

Added lazy caches for:
- empty bitboard
- empty count
- disc counts
- transposition-table hash key string

Why this matters:
- the state object is immutable, so these derived values are safe to cache,
- `hashKey()` in particular was repeatedly rebuilding a hex-string key from bitboards,
- empty-count and emptiness were also queried repeatedly during search and evaluation.

### 4) Updated worker fallback stats and regression tests

Files:
- `js/ai/worker.js`
- `js/test/core-smoke.mjs`

Added regression coverage for:
- repeated deterministic search on the same position,
- confirming that TT-first search is actually exercised on the second search.

## Validation

Passed:
- `node js/test/core-smoke.mjs`
- `python tests/ui_smoke.py`
- `python tests/virtual_host_smoke.py`

## Benchmarks

### A) Mixed midgame / late-midgame sample

Setup:
- 30 deterministic random positions
- same seed before/after
- 20 positions from earlier/midgame plies
- 10 positions from later plies
- search settings: depth 6, exact-endgame threshold 10 empties

Results:
- **Step 5**: `665.82 ms` average, `8458.43` nodes average
- **Step 6**: `594.97 ms` average, `8506.53` nodes average

Interpretation:
- about **10.6% faster** wall-clock time,
- with essentially the **same search size** (slightly more nodes, but lower overhead per node / per search step).

### B) Endgame-heavy sample

Setup:
- 10 deterministic random positions around 10–18 empties
- search settings: depth 8, exact-endgame threshold 14 empties

Results:
- **Step 5**: `3420.97 ms` average
- **Step 6**: `3385.36 ms` average

Interpretation:
- only a **small endgame speed gain** here,
- which is expected because this step mainly targets **search-loop overhead and TT/PV handling**, not deeper exact-endgame solving itself.

### C) TT-first usage signal

On the mixed-position benchmark, TT-first search was triggered many times during iterative deepening and subtree search:
- `ttFirstSearches`: `19229`
- `ttFirstCutoffs`: `11484`

This strongly suggests the optimization is not cosmetic; it is actually being used in practical search.

## Interpretation

This step improved performance mainly by making the existing search cheaper:
- less duplicated mobility work,
- less repeated state-derivation work,
- earlier exploitation of the previously best move.

It is **not** primarily a pruning-strength step.
That is why the node count stayed almost flat while wall-clock time dropped meaningfully.

This makes the engine a better foundation for more advanced search ideas later, because:
- the baseline hot path is leaner,
- transposition-table move reuse is now better integrated,
- and future ETC / MPC experiments can be evaluated against a cleaner baseline.

## Files changed in this step

- `js/ai/search-engine.js`
- `js/core/game-state.js`
- `js/ai/worker.js`
- `js/test/core-smoke.mjs`

## Recommended next step

Now that the core search loop is cheaper, the next best candidate is probably one of:

1. **Root-near ETC (Enhanced Transposition Cutoff)**
   - still a good candidate,
   - especially now that TT/PV usage is already improved,
   - but should remain heavily gated to avoid overhead.

2. **Conservative late-search stability cutoff**
   - only in windows and depths where the bound can realistically matter,
   - because stable-disc computation itself has overhead.

3. **More advanced exact-endgame kernels beyond the current tiny-solver path**
   - useful if the main target becomes stronger solved-endgame performance rather than general midgame responsiveness.
