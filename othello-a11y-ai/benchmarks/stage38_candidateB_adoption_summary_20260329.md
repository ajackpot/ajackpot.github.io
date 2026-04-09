# Stage 38 candidateB adoption summary (2026-03-29)

## Goal

This step activated `stage38-candidateB-mob0-10-12-fallback13-14` as the repo's active move-ordering profile, rebuilt the generated runtime module, reran the Stage 38 search-cost audit on the active profile, and then validated the adoption on a wider 24-seed root set.

## Code and repo updates in this step

- Activated `tools/evaluator-training/out/trained-move-ordering-profile.json` from `stage38_candidateB_mob0_10_12_fallback13_14.json`
- Added stage/adoption metadata to the active move-ordering JSON and rebuilt `js/ai/learned-eval-profile.generated.js`
- Backed up the prior active trained profile to `tools/evaluator-training/out/stage38_baseline_trained_move_ordering_linear_v2.json`
- Added `tools/evaluator-training/merge-move-ordering-benchmark-batches.mjs`
  - merges split benchmark batches by profile key and case identity
  - recomputes suite aggregates and `vsLegacy` / `vsFull` deltas after merge
- Added `js/test/stage38_benchmark_batch_merge_smoke.mjs`

Smoke checks run successfully:
- `node js/test/stage37_generated_module_builder_smoke.mjs`
- `node js/test/stage38_stage_metadata_and_ordering_audit_smoke.mjs`
- `node js/test/stage38_benchmark_batch_merge_smoke.mjs`

## Active runtime confirmation

The regenerated runtime module now imports the following active move-ordering profile:

- name: `stage38-candidateB-mob0-10-12-fallback13-14`
- trained bucket count: `4`
- stage metadata status: `active-adopted-candidateB`

This is important because the dropped `13-14` trained bucket is preserved in the generated module, so child empties `13-14` do in fact use fallback/legacy ordering at runtime.

## Audit A — active candidateB search-cost audit (same Stage 38 audit root set)

Output: `benchmarks/stage38_candidateB_active_search_cost_audit_20260329.json`

Config:
- evaluation profile: `trained-phase-linear-v1`
- active move-ordering profile: `stage38-candidateB-mob0-10-12-fallback13-14`
- depth roots: empties `19,18,17,16,15`
- exact roots: empties `14,13,12,11`
- seeds: `1..4`

Depth overall ranking by nodes:
1. `legacy` — `57,374` nodes (-0.71% vs active full, +0.00% vs legacy)
2. `no-edgePattern` — `57,782` nodes (-0.01% vs active full, +0.71% vs legacy)
3. `full` — `57,787` nodes (+0.00% vs active full, +0.72% vs legacy)
4. `no-mobility` — `57,787` nodes (+0.00% vs active full, +0.72% vs legacy)
5. `no-corners` — `57,787` nodes (+0.00% vs active full, +0.72% vs legacy)
6. `no-cornerPattern` — `57,787` nodes (+0.00% vs active full, +0.72% vs legacy)
7. `no-discDifferential` — `57,787` nodes (+0.00% vs active full, +0.72% vs legacy)
8. `no-parity` — `57,787` nodes (+0.00% vs active full, +0.72% vs legacy)
9. `no-cornerAdjacency` — `57,814` nodes (+0.05% vs active full, +0.77% vs legacy)

Exact overall ranking by nodes:
1. `no-discDifferential` — `129,826` nodes (-1.16% vs active full, -13.85% vs legacy)
2. `full` — `131,349` nodes (+0.00% vs active full, -12.84% vs legacy)
3. `no-mobility` — `131,349` nodes (+0.00% vs active full, -12.84% vs legacy)
4. `no-corners` — `131,349` nodes (+0.00% vs active full, -12.84% vs legacy)
5. `no-parity` — `131,349` nodes (+0.00% vs active full, -12.84% vs legacy)
6. `no-cornerAdjacency` — `131,363` nodes (+0.01% vs active full, -12.83% vs legacy)
7. `no-cornerPattern` — `131,619` nodes (+0.21% vs active full, -12.66% vs legacy)
8. `no-edgePattern` — `133,557` nodes (+1.68% vs active full, -11.37% vs legacy)
9. `legacy` — `150,693` nodes (+14.73% vs active full, +0.00% vs legacy)


Audit takeaway:
- `candidateB` remains clearly better than `legacy` on this exact subset: `131,349` vs `150,693` nodes (-12.84%).
- `candidateB` still gives up a small amount on the depth subset: `57,787` vs `57,374` nodes (+0.72%).
- After the mobility fix, `no-mobility` becomes effectively identical to `candidateB`, which is expected because `candidateB` already zeroed mobility where the exact gain mattered.
- The new exact-side hint is `no-discDifferential`, which beats active `candidateB` by `-1.16%` on this 4-seed audit while leaving the depth subset unchanged.
- `edgePattern` still looks helpful: removing it worsens exact nodes to `133,557`.

## Audit B — wider validation after adoption

Output: `benchmarks/stage38_candidateB_adoption_wider_validation_20260329.json`

Config:
- profiles: `legacy`, previous active `trained-move-ordering-linear-v2` (`baseline`), new active `candidateB` (`active`)
- same root empties as the Stage 38 rerun
- seeds: `1..24` (merged from split batches)

### Overall nodes

| suite | legacy | baseline | active | active vs baseline | active vs legacy |
| --- | ---: | ---: | ---: | ---: | ---: |
| depth | 368,622 | 368,501 | 368,065 | -0.12% | -0.15% |
| exact | 844,028 | 780,666 | 760,707 | -2.56% | -9.87% |
| combined | 1,212,650 | 1,149,167 | 1,128,772 | -1.77% | -6.92% |

### Search-output agreement

Against previous active baseline:
- depth: same score `119/120`, same best move `120/120`
  - one depth-limited root (`empties=16, seed=6`) kept the same best move `A8` but the reported root score shifted `96917 -> 96575`
- exact: same score `96/96`, same best move `96/96`

Against legacy:
- depth: same score `119/120`, same best move `119/120`
- exact: same score `96/96`, same best move `94/96`

Changed root-move cases vs legacy with unchanged score:
- depth: `empties=15, seed=3`, `A6 -> A8`
- exact: `empties=13, seed=21`, `A5 -> F1`
- exact: `empties=12, seed=1`, `H2 -> G7`

### By-root-empties view

Depth nodes:

| root empties | legacy | baseline | active |
| ---: | ---: | ---: | ---: |
| 19 | 82,208 | 82,208 | 82,208 |
| 18 | 83,541 | 83,585 | 83,632 |
| 17 | 78,212 | 78,345 | 78,337 |
| 16 | 65,554 | 65,473 | 65,389 |
| 15 | 59,107 | 58,890 | 58,499 |

Exact nodes:

| root empties | legacy | baseline | active |
| ---: | ---: | ---: | ---: |
| 14 | 485,335 | 439,896 | 422,386 |
| 13 | 238,185 | 220,347 | 217,384 |
| 12 | 86,222 | 85,540 | 86,083 |
| 11 | 34,286 | 34,883 | 34,854 |


Wider-validation takeaway:
- `candidateB` remains the best of the three profiles on the wider 24-seed validation set.
- The main gain is still exact root empties `14` and `13`, where active saves `17,510` and `2,963` nodes respectively vs the previous active baseline.
- Active is slightly worse than baseline at exact root empties `12` and `11`, but not by enough to offset the `14` / `13` gains.
- Depth remains effectively neutral, but active still edges out both baseline and legacy in the merged total.
- Relative to the previous active baseline, active is now a stable adoption candidate: all `96/96` exact root best moves matched baseline, and depth best moves also matched baseline `120/120`.

## Decision after this step

Adopt `stage38-candidateB-mob0-10-12-fallback13-14` as the repo's active move-ordering profile.

Reason:
- it survives wider validation better than the previous active trained profile
- it is materially better than legacy in the exact subset that dominates the overall gain
- it keeps output behavior stable against the previous active baseline

## Most natural next step

Use the new audit hint to screen one more conservative follow-up candidate based on active `candidateB`:
- zero `discDifferential` in the remaining trained buckets
- rerun the same active-vs-baseline-vs-legacy wider validation
- only adopt if the wider validation, not just the 4-seed audit subset, also improves
