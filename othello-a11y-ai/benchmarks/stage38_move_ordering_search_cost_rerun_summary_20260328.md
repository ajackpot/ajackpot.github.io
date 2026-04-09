# Stage 38 move-ordering search-cost rerun summary (2026-03-28)

## Current-file audit findings

- Current stage metadata file is `stage38`, but the **actually loaded active profiles** in `js/ai/learned-eval-profile.generated.js` are still:
  - evaluation: `trained-phase-linear-v1`
  - move ordering: `trained-move-ordering-linear-v2`
- The active move-ordering profile contains 5 trained buckets:
  - child empties `17-18`
  - child empties `15-16`
  - child empties `13-14`
  - child empties `11-12`
  - child empties `10`

## Code change made before rerun

`tools/evaluator-training/audit-move-ordering-search-cost.mjs`
- fixed default ablation variant generation so it now includes **all** move-ordering features dynamically
- this closes an omission where `no-corners` was supported but not included in the default audit list

`js/test/stage38_stage_metadata_and_ordering_audit_smoke.mjs`
- updated smoke test so the default audit path is exercised
- now asserts that `no-corners` is included by default

## Benchmark A — full vs legacy

Output: `benchmarks/stage38_move_ordering_search_cost_rerun_full_vs_legacy_20260328.json`

Config:
- evaluation profile: `trained-phase-linear-v1`
- move-ordering profile: `trained-move-ordering-linear-v2`
- variants: `legacy`, `full`
- depth roots: empties `19,18,17,16,15`
- exact roots: empties `14,13,12,11`
- seeds: `1..8`
- repetitions: `1`
- depth: `maxDepth=6`, `timeLimitMs=1500`, `depthExactEndgameEmpties=10`
- exact: `maxDepth=12`, `timeLimitMs=4000`, `exactEndgameEmpties=14`

Headline:
- depth overall: `legacy 129,723 nodes` vs `full 130,612 nodes` (**+0.69% worse**)
- exact overall: `legacy 271,624 nodes` vs `full 273,233 nodes` (**+0.59% worse**)

By-root-empties (nodes, legacy -> full):
- depth 19: `28,333 -> 28,333` (0.00%)
- depth 18: `26,359 -> 26,441` (+0.31%)
- depth 17: `29,393 -> 29,509` (+0.39%)
- depth 16: `22,833 -> 23,021` (+0.82%)
- depth 15: `22,805 -> 23,308` (+2.21%)
- exact 14: `144,251 -> 147,410` (+2.19%)
- exact 13: `83,345 -> 80,046` (-3.96%)
- exact 12: `33,279 -> 33,735` (+1.37%)
- exact 11: `10,749 -> 12,042` (+12.03%)

Search-output agreement:
- depth: same score `40/40`, same best move `39/40`
- exact: same score `32/32`, same best move `31/32`

Notable case behavior:
- some exact cases improved strongly (for example `empties=13, seed=1`: `15,887 -> 11,895`, `-25.13%`)
- but several exact small-root cases regressed sharply (for example `empties=11, seed=6`: `2,013 -> 2,985`, `+48.29%`)
- one depth case changed root move while keeping the same score (`empties=15, seed=3`, `A6 -> A8`)

## Benchmark B — full ablation audit

Output: `benchmarks/stage38_move_ordering_search_cost_rerun_ablation_20260328.json`

Config:
- evaluation profile: `trained-phase-linear-v1`
- move-ordering profile: `trained-move-ordering-linear-v2`
- variants:
  - `legacy`
  - `full`
  - `no-mobility`
  - `no-corners`
  - `no-cornerAdjacency`
  - `no-edgePattern`
  - `no-cornerPattern`
  - `no-discDifferential`
  - `no-parity`
- depth roots: empties `19,18,17,16,15`
- exact roots: empties `14,13,12,11`
- seeds: `1..4`
- repetitions: `1`
- depth: `maxDepth=6`, `timeLimitMs=1500`, `depthExactEndgameEmpties=10`
- exact: `maxDepth=12`, `timeLimitMs=4000`, `exactEndgameEmpties=14`

Depth overall ranking by nodes:
1. `legacy` — `57,374`
2. `no-cornerPattern` — `58,028`
3. `no-mobility` — `58,033`
4. `no-edgePattern` — `58,054`
5. `no-cornerAdjacency` — `58,057`
6. `no-discDifferential` — `58,057`
7. `full` / `no-corners` / `no-parity` — `58,058`

Depth takeaway:
- late learned ordering is slightly **worse than legacy** on this depth suite
- ablating individual learned features barely changes the result, so the overhead/regression is broad rather than tied to one dominant feature here

Exact overall ranking by nodes:
1. `no-mobility` — `131,058`
2. `no-cornerAdjacency` — `136,976`
3. `full` / `no-corners` / `no-parity` — `136,980`
4. `no-discDifferential` — `137,052`
5. `no-cornerPattern` — `137,451`
6. `no-edgePattern` — `137,718`
7. `legacy` — `150,693`

Exact takeaway:
- learned ordering is materially **better than legacy** on this 4-seed exact subset (`-9.10%` nodes for `full`)
- `mobility` looks actively harmful inside this exact subset: removing it yields another `-4.32%` nodes relative to `full`
- `corners` and `parity` appear neutral in this subset (`full`, `no-corners`, `no-parity` are identical in aggregate nodes)
- `edgePattern` and `cornerPattern` look mildly helpful, because removing them makes nodes worse

## Immediate interpretation

The current `trained-move-ordering-linear-v2` profile is **not a clean global win** on the current-file search-cost benchmark.

- On a wider 8-seed rerun, it is slightly worse than legacy overall in both depth and exact totals.
- On a smaller 4-seed exact subset, it beats legacy clearly, but the ablation audit suggests the `mobility` term may be the main component still misaligned with true cutoff efficiency.
- The profile therefore looks **high variance / sample-sensitive** rather than robustly adopted.

## Suggested next coding step

Build a search-cost candidate profile from the current weights by starting with:
- zeroing or sharply downscaling `mobility` in the `10-14` child-empties buckets
- keeping `edgePattern` / `cornerPattern`
- rerunning the same audit and then a direct `legacy` vs `full` vs `candidateA` benchmark on the same root set

