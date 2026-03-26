# Stage 24 Review - Exact fastest-first and cut-aware ordering audit

## External survey recap

Relevant external signals for this stage:
- Zebra / Gunnar Andersson documentation points to **fastest-first** as a practical Othello endgame ordering heuristic.
- Edax few-empties / shallow endgame code explicitly favors **cheap, speed-oriented ordering** and limits more expensive general search machinery there.
- Later fastest-cut-first work formalizes the same basic intuition: if you can estimate both “chance of cut” and “subtree size”, try promising cuts with small subtrees first.
- MPC remains a separate, more calibration-heavy project; this stage was intentionally scoped to move ordering only.

## What was screened locally

Three exact-ordering variants were compared:

### Baseline
- Stage 23 ordering only
- no Stage 24 fastest-first features

### Candidate A: pure exact fastest-first
- exact bucket only
- sort moves by increasing opponent reply count
- previous late-ordering score used only as a tie-breaker

### Candidate B: cut-aware screening mode
- exact bucket only
- same reply-count size estimate as Candidate A
- on narrow windows, pass moves / favorable child TT bounds / corners get an added cut-priority layer

## Benchmark result

Source file:
- `benchmarks/stage24_exact_fastest_first_audit.json`

## Exact bucket (10 empties, 8 seeds, median-of-three)

### Baseline
- elapsed: `819ms`
- nodes: `11789`

### Candidate A: pure fastest-first
- elapsed: `565ms` (`-31.01%`)
- nodes: `8995` (`-23.70%`)
- exact fastest-first sorts: `577`
- move / outcome / score agreement vs baseline: `8 / 8`

### Candidate B: cut-aware screening
- elapsed: `600ms` (`-26.74%` vs baseline)
- nodes: `9592` (`-18.63%`)
- exact fastest-first sorts: `590`
- cut-aware sorts: `538`
- move / outcome / score agreement vs baseline: `8 / 8`

Interpretation:
- both Stage 24 candidates were safe on this set
- both improved over baseline
- but the **plain fastest-first** variant was better than the cut-aware screening mode

## Exact bucket (14 empties, 4 seeds, single-run heavier spot-check)

### Baseline
- elapsed: `7635ms`
- nodes: `126937`

### Candidate A: pure fastest-first
- elapsed: `5687ms` (`-25.51%`)
- nodes: `98819` (`-22.15%`)
- exact fastest-first sorts: `365`
- move / outcome / score agreement vs baseline: `4 / 4`

### Candidate B: cut-aware screening
- elapsed: `6746ms` (`-11.65%` vs baseline)
- nodes: `114139` (`-10.08%`)
- cut-aware sorts: `354`
- move / outcome / score agreement vs baseline: `4 / 4`

Interpretation:
- the heavier exact bucket confirms the same shape as the 10-empty audit
- plain fastest-first is the best of the three variants here as well

## WLD control bucket (12 empties, 8 seeds)

### Baseline
- elapsed: `1688ms`
- nodes: `29079`
- fastest-first exact sorts: `0`

### Candidate A: pure fastest-first
- elapsed: `1690ms`
- nodes: `29079`
- fastest-first exact sorts: `0`
- move / outcome / score agreement vs baseline: `8 / 8`

### Candidate B: cut-aware screening
- elapsed: `1614ms`
- nodes: `29079`
- fastest-first exact sorts: `0`
- cut-aware sorts: `0`
- move / outcome / score agreement vs baseline: `8 / 8`

Interpretation:
- Stage 24 is correctly isolated to the exact bucket
- the WLD bucket is structurally unchanged
- timing differences here are just noise because the node counts and ordering-activation counts are identical

## Conclusion

Stage 24 is worth shipping.

Shipped default:
- `exactFastestFirstOrdering = true`
- `exactFastestCutFirstOrdering = false`

Reason:
- exact bucket improvements were clear at both 10 and 14 empties
- move / score stayed unchanged in the audit sets
- WLD remained untouched
- the cut-aware screening mode was interesting, but the simpler pure fastest-first version was the stronger practical choice in this engine

## Recommended next candidates

Most natural next steps now look like:
1. **MPC preparation harness**
   - gather shallow/deep score pairs by depth pair
   - estimate error bands before attempting any real cut logic
2. **Few-empties ordering re-audit only if made cheaper still**
   - for example, narrower parity features or a cheaper square-type + parity representation
3. **Exact-only micro-specialization around 5-6 empties if profiling identifies overhead there**
   - only if the hotspot remains inside the small solver family after Stage 24

## Stage 24 conclusion in one line

The practical win was not the more elaborate cut-aware screening mode.
It was the simpler version:
- exact bucket only
- fewest opponent replies first
- keep the previous late-ordering score only as a tie-breaker
- leave WLD untouched
