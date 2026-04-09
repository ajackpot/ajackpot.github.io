# Stage 38 candidateC adoption summary (2026-03-29)

## Goal

This step screened a follow-up `candidateC` derived from the active `candidateB`, fixed a stage-metadata bug in the move-ordering variant generator, validated the best `candidateC` on the same 24-seed wider root set, and then adopted it as the repo's active move-ordering profile.

## Code and repo updates in this step

- Fixed `tools/evaluator-training/make-move-ordering-variant.mjs`
  - derived profiles no longer inherit stale `stage.status=active-*`
  - new derived variants now write `stage.status = "derived-variant"` with the base profile name/path recorded in stage metadata
- Extended `js/test/stage38_stage_metadata_and_ordering_audit_smoke.mjs`
  - now verifies the variant generator writes the new derived stage metadata correctly
- Regenerated the candidate JSONs after the tooling fix
- Backed up the prior active profile to `tools/evaluator-training/out/stage38_candidateB_before_candidateC.json`
- Activated `stage38-candidateC-disc0-10-12` as `tools/evaluator-training/out/trained-move-ordering-profile.json`
- Rebuilt `js/ai/learned-eval-profile.generated.js`
- Updated `stage-info.json` and appended a new Stage 38 implementation addendum

Smoke checks run successfully after the tooling change and after the final active-profile rebuild:
- `node js/test/stage37_generated_module_builder_smoke.mjs`
- `node js/test/stage38_stage_metadata_and_ordering_audit_smoke.mjs`
- `node js/test/stage38_benchmark_batch_merge_smoke.mjs`

## Screening A — 4-seed candidateC screen on the Stage 38 audit root set

Chosen candidate family:
- base: active `stage38-candidateB-mob0-10-12-fallback13-14`
- follow-up hypothesis: zero `discDifferential`

Screened variants:
- `stage38-candidateC-disc0-all`
- `stage38-candidateC-disc0-10-12`
- `stage38-candidateC-disc0-15-18`

Key result:
- `discDifferential@10-12=0` captured **all** of the observed gain.
- Removing `discDifferential` only in `15-18` produced no node change on this root set.
- Because the `10-12`-only candidate matched the stronger all-buckets variant on nodes while changing fewer weights, it was selected as the wider-validation candidate.

4-seed node totals:

| suite | legacy | active candidateB | candidateC (`discDifferential@10-12=0`) | delta vs active |
| --- | ---: | ---: | ---: | ---: |
| depth | 57,374 | 57,787 | 57,787 | +0.00% |
| exact | 150,693 | 131,349 | 129,826 | -1.16% |

By-root-empties on the screening set, the exact gain came almost entirely from root empties `13`:
- root empties `14`: `-2` nodes vs active
- root empties `13`: `-1,479` nodes vs active
- root empties `12`: `-42` nodes vs active
- root empties `11`: unchanged

## Validation B — wider 24-seed validation on the same root set as the prior adoption check

Output: `benchmarks/stage38_candidateC_wider_validation_merged_with_prior_20260329.json`

Config:
- profiles: `legacy`, previous baseline `trained-move-ordering-linear-v2`, current active `candidateB`, new `candidateC`
- depth roots: empties `19,18,17,16,15`
- exact roots: empties `14,13,12,11`
- seeds: `1..24`

### Overall nodes

| suite | legacy | baseline | active candidateB | candidateC | candidateC vs active | candidateC vs baseline | candidateC vs legacy |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| depth | 368,622 | 368,501 | 368,065 | 368,065 | +0.00% | -0.12% | -0.15% |
| exact | 844,028 | 780,666 | 760,707 | 759,187 | -0.20% | -2.75% | -10.05% |
| combined | 1,212,650 | 1,149,167 | 1,128,772 | 1,127,252 | -0.13% | -1.91% | -7.04% |

### Search-output agreement

Against active `candidateB`:
- depth: same score `120/120`, same best move `120/120`
- exact: same score `96/96`, same best move `96/96`
- there were **no** changed roots versus active: `candidateC` matched active on all `216/216` root outputs

Against previous baseline:
- depth: same score `119/120`, same best move `120/120`
- exact: same score `96/96`, same best move `96/96`
- the only difference versus baseline remained the existing depth-limited score drift on `(empties=16, seed=6)` with the same best move `A8`

Against legacy:
- depth: same score `119/120`, same best move `119/120`
- exact: same score `96/96`, same best move `94/96`
- changed best-move cases vs legacy still had unchanged score:
  - depth `(empties=15, seed=3)`: `A6 -> A8`
  - exact `(empties=13, seed=21)`: `A5 -> F1`
  - exact `(empties=12, seed=1)`: `H2 -> G7`

### By-root-empties view

Depth nodes remained exactly unchanged versus active:

| root empties | active candidateB | candidateC |
| ---: | ---: | ---: |
| 19 | 82,208 | 82,208 |
| 18 | 83,632 | 83,632 |
| 17 | 78,337 | 78,337 |
| 16 | 65,389 | 65,389 |
| 15 | 58,499 | 58,499 |

Exact nodes:

| root empties | active candidateB | candidateC | delta |
| ---: | ---: | ---: | ---: |
| 14 | 422,386 | 422,244 | -142 |
| 13 | 217,384 | 216,028 | -1,356 |
| 12 | 86,083 | 86,039 | -44 |
| 11 | 34,854 | 34,876 | +22 |

Wider-validation takeaway:
- `candidateC` is a strict improvement over active `candidateB` on the merged 24-seed validation set.
- The entire gain is exact-side; depth stays bit-identical to active.
- The gain again comes mainly from root empties `13`, with a smaller help at `14` and `12`, and a very small giveback at `11`.
- Because output agreement against active is perfect, this is a low-risk adoption.

## Active runtime confirmation after adoption

The regenerated runtime module now imports:
- move-ordering profile name: `stage38-candidateC-disc0-10-12`
- trained bucket count: `4`
- stage metadata status: `active-adopted-candidateC`

## Decision after this step

Adopt `stage38-candidateC-disc0-10-12` as the repo's active move-ordering profile.

Reason:
- it keeps depth behavior unchanged vs active `candidateB`
- it lowers exact nodes on the wider validation set
- it matches active `candidateB` on all root best moves and scores in the 24-seed validation
- it is the more conservative form of the `discDifferential` ablation, because the `15-18` buckets did not show any measurable benefit in screening

## Most natural next step

Two reasonable follow-ups remain:
1. stop manual micro-tuning here and move the effort back to search-cost-aware trainer design, because the remaining gains are now very small
2. if one more local screen is desired, test whether the tiny exact-side loss at root empties `11` can be removed without giving back the empties `13` gain
