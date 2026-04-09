# Stage 38 move-ordering candidate step 2 summary (2026-03-29)

## Goal

Starting from the stage38 rerun finding that the trained late move-ordering profile was sample-sensitive and that the learned `mobility` term looked misaligned with true search cost, this step built and benchmarked targeted candidate profiles against the same root sets.

## Code added in this step

- `tools/evaluator-training/make-move-ordering-variant.mjs`
  - derives a move-ordering profile by scaling selected feature weights over selected child-empties ranges
  - CLI spec format: `feature@min-max=scale`
- `tools/evaluator-training/benchmark-move-ordering-profile-set.mjs`
  - compares multiple move-ordering profiles on the same depth/exact root suites
  - supports `legacy=null` plus arbitrary labeled JSON profiles

Existing smoke still passes:
- `node js/test/stage38_stage_metadata_and_ordering_audit_smoke.mjs`

## Candidate family screened first

Built four mobility-only candidates from the active base profile `trained-move-ordering-linear-v2`.

- `stage38-candidateA-mob0-10-14`
- `stage38-candidateA-mob25-10-14`
- `stage38-candidateA-mob0-10-12`
- `stage38-candidateA-mob25-10-12`

Exact-screen result vs current full profile (`empties 14,13,12,11`, seeds `1..8`):

| candidate | exact nodes | vs full |
| --- | ---: | ---: |
| `stage38-candidateA-mob0-10-14` | 271,137 | -0.77% |
| `stage38-candidateA-mob0-10-12` | 271,401 | -0.67% |
| `stage38-candidateA-mob25-10-14` | 276,092 | +1.05% |
| `stage38-candidateA-mob25-10-12` | 276,105 | +1.05% |

Takeaway:
- quarter-strength mobility was clearly worse than full
- zeroing mobility helped, with `10-14` slightly better than `10-12`
- however, the mobility-only candidate still remained too close to legacy on exact and still above legacy on depth

## Hybrid candidate that actually wins

A stronger hybrid was then built:

`stage38-candidateB-mob0-10-12-fallback13-14`

Construction:
- start from `stage38-candidateA-mob0-10-12`
- keep learned buckets for child empties `10-12` but with `mobility = 0`
- **remove the trained `13-14` bucket entirely**, so child empties `13-14` fall back to the legacy late-ordering evaluator there

Interpretation:
- the search stack already applies a hard opponent-reply mobility penalty before the learned lightweight ordering score is added
- zeroing learned `mobility` in child empties `10-12` removes late double-counting where exact search is most amplified
- forcing `13-14` back to fallback/legacy ordering preserves the exact gains at child `10-12` while neutralizing the main depth-15 / exact-14 instability region

## Benchmarks for candidateB

### candidateB vs current full

Depth suite (`empties 19,18,17,16,15`, seeds `1..8`):
- full: `130,612`
- candidateB: `129,759` (**-0.65%**)
- same best move: `40/40`

Exact suite (`empties 14,13,12,11`, seeds `1..8`):
- full: `273,233`
- candidateB: `254,898` (**-6.71%**)
- same score: `32/32`
- same best move: `32/32`

Combined nodes on this root set:
- full: `403,845`
- candidateB: `384,657` (**-4.75%**)

### candidateB vs legacy

Depth suite:
- legacy: `129,723`
- candidateB: `129,759` (**+0.03%**, effectively tied)
- same best move: `39/40`
- changed move case: `depth empties=15, seed=3`, same score, `A6 -> A8`

Exact suite:
- legacy: `271,624`
- candidateB: `254,898` (**-6.16%**)
- same score: `32/32`
- same best move: `31/32`
- changed move case: `exact empties=12, seed=1`, same score, `H2 -> G7`

Combined nodes on this root set:
- legacy: `401,347`
- candidateB: `384,657` (**-4.16%**)

## By-root-empties view for candidateB

### Depth nodes

| root empties | legacy | full | candidateB |
| ---: | ---: | ---: | ---: |
| 19 | 28,333 | 28,333 | 28,333 |
| 18 | 26,359 | 26,441 | 26,365 |
| 17 | 29,393 | 29,509 | 29,545 |
| 16 | 22,833 | 23,021 | 22,656 |
| 15 | 22,805 | 23,308 | 22,860 |

### Exact nodes

| root empties | legacy | full | candidateB |
| ---: | ---: | ---: | ---: |
| 14 | 144,251 | 147,410 | 131,631 |
| 13 | 83,345 | 80,046 | 77,081 |
| 12 | 33,279 | 33,735 | 34,139 |
| 11 | 10,749 | 12,042 | 12,047 |

Key observation:
- almost the entire global win comes from **big improvements at exact root empties 14 and 13**, while depth stays essentially neutral vs legacy
- the remaining weak spots are still exact root empties `11` and `12`; candidateB wins anyway because the `14` bucket improvement is large enough to dominate the aggregate

## Output artifacts from this step

Profiles:
- `tools/evaluator-training/out/stage38_candidateA_mob0_10_14.json`
- `tools/evaluator-training/out/stage38_candidateA_mob25_10_14.json`
- `tools/evaluator-training/out/stage38_candidateA_mob0_10_12.json`
- `tools/evaluator-training/out/stage38_candidateA_mob25_10_12.json`
- `tools/evaluator-training/out/stage38_candidateB_mob0_10_12_fallback13_14.json`

Benchmarks:
- `benchmarks/stage38_candidateA_mob0_10_14_vs_full_exact_20260329.json`
- `benchmarks/stage38_candidateA_mob25_10_14_vs_full_exact_20260329.json`
- `benchmarks/stage38_candidateA_mob0_10_12_vs_full_exact_20260329.json`
- `benchmarks/stage38_candidateA_mob25_10_12_vs_full_exact_20260329.json`
- `benchmarks/stage38_candidateA_mob0_10_14_vs_full_depth_20260329.json`
- `benchmarks/stage38_candidateA_mob0_10_12_vs_full_depth_20260329.json`
- `benchmarks/stage38_candidateB_mob0_10_12_fallback13_14_vs_full_exact_20260329.json`
- `benchmarks/stage38_candidateB_mob0_10_12_fallback13_14_vs_full_depth_20260329.json`
- `benchmarks/stage38_candidateB_vs_legacy_exact_20260329.json`
- `benchmarks/stage38_candidateB_vs_legacy_depth_20260329.json`

## Step decision

Within the current-file audit root set, `stage38-candidateB-mob0-10-12-fallback13-14` is the first candidate that is:
- clearly better than the current full trained profile
- clearly better than legacy overall
- score-stable against both references

This makes it the best adoption candidate found so far.
