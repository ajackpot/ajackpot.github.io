# Stage 22 Review - Few-empties exact solver audit and next candidates

## External survey recap

Relevant external signals gathered for this stage:

- Edax endgame code explicitly documents a few-empties/shallow path where move ordering is restricted to hole parity and square type, with no hash table and only limited anticipated cutoffs.
- Edax also has dedicated 4-empty handling before that shallow path continues.
- Zebra documentation describes a fastest-first heuristic.
- Deft Reversi documents fastest-first as an endgame move-ordering heuristic based on reducing opponent legal moves.
- Strong Othello-program surveys report that modern engines typically switch from outcome search to exact score search, and that selective endgame search / MPC-style ideas are more complex and tuning-heavy.

## What was screened locally

### Candidate A: exact + WLD few-empties alpha-beta with heavy ordering

Prototype ingredients:
- alpha-beta in exact and WLD small solvers
- parity/hole-region bias
- square-type ordering
- fastest-first style opponent-mobility scoring

Observed outcome:
- reduced small-solver node counts
- slower total wall-clock time in JS, especially in WLD

Decision:
- rejected as a shipped default

### Candidate B: exact-only alpha-beta with cheap square-type ordering

Prototype ingredients:
- exact small solver only
- alpha-beta
- cheap square-type ordering
- no WLD changes

Observed outcome:
- exact bucket speedup
- exact move/score preserved on the audit set
- WLD bucket unchanged

Decision:
- adopted

## Bucketed benchmark result

Using the Stage 22 audit script:

### Exact bucket (10 empties)

Baseline vs candidate:
- elapsed: `703ms -> 577ms` (`-126ms`, `-17.92%`)
- nodes: `10730 -> 11789` (`+1059`)
- exact small-solver nodes: `198413 -> 94023` (`-52.61%`)
- move agreement: `8/8`
- outcome agreement: `8/8`
- score agreement: `8/8`

Interpretation:
- the top-level search-node counter rises because the optimized few-empties exact solver now returns bound-aware results instead of always behaving like a full-width exact leaf
- nevertheless, the expensive exact small-solver work drops sharply and total time improves

### WLD bucket (12 empties)

Baseline vs candidate:
- elapsed: `1128ms -> 1119ms` (`-9ms`, noise-level)
- nodes: unchanged
- WLD small-solver calls/nodes: unchanged
- move/outcome/score agreement: `8/8`

Interpretation:
- the optimization is correctly isolated to the exact bucket

## Current recommendation order

### Good next candidates

1. **Dedicated exact solve_3 / solve_4 style specializations**
   - same bucket as the adopted Stage 22 change
   - likely more implementation effort than Stage 22
   - still lower risk than MPC

2. **Bucketed fastest-first / fastest-cut-first audit for exact only**
   - keep it outside WLD first
   - prefer cheap features over repeated mobility recomputation
   - only ship if time improves, not just node count

3. **MPC preparation work, not direct adoption**
   - add a calibration harness for shallow/deep score pairs
   - measure correlation and error by depth pair and bucket
   - only then decide whether MPC is viable for this engine

### Deferred for now

- heavy few-empties parity + fastest-first ordering inside WLD
- broad cross-bucket selective endgame pruning
- direct MPC adoption without calibration

## Stage 22 conclusion

The practical low-risk win was not “full Edax-style shallow search” and not “WLD fastest-first”.
It was a narrower change:

- clean up duplicated stats code
- improve the exact bucket’s last 1-4 empties solver only
- keep the WLD bucket untouched until a dedicated WLD audit shows a real timing gain
