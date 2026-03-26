# Stage 23 Review - Specialized exact few-empties solver audit

## External survey recap

Relevant external signals for this stage:
- Edax endgame code has dedicated `solve_3` and `search_solve_4` style handling for the last few empties.
- The Edax few-empties/shallow path also explicitly states that move ordering is limited to hole parity and square type, with no hash table and only limited anticipated cutoffs.
- Zebra / Gunnar Andersson documentation still points to **fastest-first** as a separate candidate family rather than something that must be bundled into the last-4 exact solver.
- MPC / ProbCut remains a different class of work because it needs calibration and selectivity control, not just a local endgame refactor.

## What was tested locally

### Candidate A: specialized exact 1-4 empties with parity-aware ordering

Observed behavior during local screening:
- fewer exact small-solver nodes than the Stage 22 path
- but weaker wall-clock results in JavaScript on realistic exact-root cases

Decision:
- **not shipped**

### Candidate B: specialized exact 1-4 empties with cheap square-type ordering only

Observed behavior:
- same root nodes as Stage 22 on the realistic exact bucket
- noticeably fewer exact small-solver nodes
- better wall-clock time
- WLD bucket unchanged

Decision:
- **adopted**

## Benchmark result

Source file:
- `benchmarks/stage23_specialized_few_empties_exact_solver_audit.json`

### Direct 4-empty exact roots (6 seeds)

Baseline vs candidate:
- elapsed: `8ms -> 8ms` (`0%`)
- nodes: unchanged
- exact small-solver nodes: `176 -> 124` (`-29.55%`)
- move/outcome/score agreement: `6/6`

Interpretation:
- direct 4-empty roots are effectively timing-neutral in this environment
- but the specialized path clearly reduces exact small-solver work

### Exact bucket (10 empties, 8 seeds)

Baseline vs candidate:
- elapsed: `869ms -> 759ms` (`-110ms`, `-12.66%`)
- root nodes: unchanged at `11789`
- exact small-solver nodes: `94023 -> 69141` (`-26.46%`)
- specialized few-empties calls: `0 -> 69141`
- specialized `solve_3`-family calls: `0 -> 11233`
- specialized `solve_4`-family calls: `0 -> 5971`
- move/outcome/score agreement: `8/8`

Interpretation:
- this is the important result
- the gain does not come from changing the main tree shape
- it comes from making the last 1-4 exact-solver work cheaper

### WLD bucket (12 empties, 8 seeds)

Baseline vs candidate:
- elapsed: `1653ms -> 1632ms` (`-21ms`, noise-level)
- nodes: unchanged
- exact small-solver nodes: unchanged at `0`
- specialized few-empties calls: unchanged at `0`
- move/outcome/score agreement: `8/8`

Interpretation:
- Stage 23 is correctly isolated to the exact bucket
- WLD behavior is unchanged

## Conclusion

Stage 23 is worth shipping.

Reason:
- exact bucket improves materially on realistic roots
- move and score stay unchanged on the audit set
- WLD remains untouched
- parity-aware ordering inside this specialized path was screened, but the cheaper square-type-only version was the one that actually paid off in JavaScript

## Recommended next candidates

Best next candidates now look like:
1. **Exact-only fastest-first / fastest-cut-first audit**
   - keep it bucketed away from WLD at first
   - only ship if timing improves, not just node count
2. **MPC preparation harness**
   - gather shallow/deep score pairs by depth pair
   - estimate error bands before attempting any selective cut logic
3. **Revisit hole-parity ordering only if it can be made cheaper**
   - for example, a narrower exact-only trigger or a lower-overhead representation

## Stage 23 conclusion in one line

The practical win was not “full Edax shallow-search parity ordering”.
It was a narrower change:
- keep Stage 22 exact ordering as the general path
- specialize the exact solver family for the last 1-4 empties
- leave WLD untouched
