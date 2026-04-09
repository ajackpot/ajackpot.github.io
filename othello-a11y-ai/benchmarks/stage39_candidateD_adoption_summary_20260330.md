# Stage 39 candidateD adoption summary (2026-03-30)

## Decision on retraining

No new `Egaroucid_Train_Data` retraining was needed for this step.

Reason: `candidateD` is a **search-cost local-search / bucket-fallback** follow-up on top of the already learned Stage 38 move-ordering profile. The actual weight-learning corpus was not revisited in this step.

## Code updates in this step

- Fixed `tools/evaluator-training/tune-move-ordering-search-cost.mjs`
  - local-search-derived profiles now drop stale inherited `diagnostics.derivedVariant` blocks
  - new local-search diagnostics now record the current base profile name/path cleanly
- Updated `js/test/stage39_move_ordering_local_search_smoke.mjs`
  - now asserts the chosen smoke candidate is `fallback@10-10` on `stage38-candidateC-disc0-10-12`
  - verifies the saved best profile uses `stage.status = "derived-search-cost-local-search"`
  - verifies stale `diagnostics.derivedVariant` is not inherited
- Regenerated a clean `stage39-candidateD-fallback10-10` JSON from the local-search output
- Backed up the prior active profile to `tools/evaluator-training/out/stage39_candidateC_before_candidateD.json`
- Activated `stage39-candidateD-fallback10-10` as `tools/evaluator-training/out/trained-move-ordering-profile.json`
- Rebuilt `js/ai/learned-eval-profile.generated.js`
- Updated `stage-info.json` summary/timestamp while keeping `stage38` naming/tagging intact

Smoke checks run successfully after the tooling fix and after the final active-profile rebuild:

- `node js/test/stage37_generated_module_builder_smoke.mjs`
- `node js/test/stage38_stage_metadata_and_ordering_audit_smoke.mjs`
- `node js/test/stage38_benchmark_batch_merge_smoke.mjs`
- `node js/test/stage39_move_ordering_local_search_smoke.mjs`

## Wider validation — 24 seeds on the same root set

Output: `benchmarks/stage39_candidateD_wider_validation_merged_with_prior_20260329.json`

Profiles compared: `legacy`, previous baseline `trained-move-ordering-linear-v2`, prior active `candidateC`, new `candidateD`

Root sets:
- depth roots: empties `19,18,17,16,15`
- exact roots: empties `14,13,12,11`
- seeds: `1..24`

### Overall nodes

| suite | prior active candidateC | candidateD | candidateD vs candidateC | candidateD vs baseline | candidateD vs legacy |
| --- | ---: | ---: | ---: | ---: | ---: |
| depth | 368,065 | 368,006 | -0.02% | -0.13% | -0.17% |
| exact | 759,187 | 754,642 | -0.60% | -3.33% | -10.59% |
| combined | 1,127,252 | 1,122,648 | -0.41% | -2.31% | -7.42% |

### Search-output agreement

Against prior active `candidateC`:
- depth: same score `120/120`, same best move `120/120`
- exact: same score `96/96`, same best move `95/96`
- changed root-output case(s) vs prior active:
  - exact `(empties=11, seed=21)` F1 -> H2 with unchanged score `-180000`

Against previous baseline:
- depth: same score `119/120`, same best move `120/120`
- exact: same score `96/96`, same best move `95/96`

Against legacy:
- depth: same score `119/120`, same best move `119/120`
- exact: same score `96/96`, same best move `93/96`

### By-root-empties view vs prior active `candidateC`

Depth nodes:

| root empties | candidateC | candidateD | delta |
| ---: | ---: | ---: | ---: |
| 19 | 82,208 | 82,208 | +0 |
| 18 | 83,632 | 83,632 | +0 |
| 17 | 78,337 | 78,337 | +0 |
| 16 | 65,389 | 65,389 | +0 |
| 15 | 58,499 | 58,440 | -59 |

Exact nodes:

| root empties | candidateC | candidateD | delta |
| ---: | ---: | ---: | ---: |
| 14 | 422,244 | 420,335 | -1,909 |
| 13 | 216,028 | 215,721 | -307 |
| 12 | 86,039 | 84,534 | -1,505 |
| 11 | 34,876 | 34,052 | -824 |

Wider-validation takeaway:
- `candidateD` is better than prior active `candidateC` on the merged 24-seed validation set.
- The gain is concentrated on the exact side, but depth also improves slightly at root empties `15`.
- The only changed root move versus prior active is one exact case with the **same exact root score**, which is consistent with an alternative equal-valued move rather than a regression in solved value.
- Relative to the older baseline and to legacy, `candidateD` is now the best nodes result of the tested set.

## Active runtime confirmation after adoption

The regenerated runtime module now imports:
- move-ordering profile name: `stage39-candidateD-fallback10-10`
- trained bucket count: `3`
- stage metadata status: `active-adopted-candidateD`

## Decision after this step

Adopt `stage39-candidateD-fallback10-10` as the repo's active move-ordering profile.

Reason:
- it improves wider-validation nodes versus prior active `candidateC`
- it also beats the previous baseline and legacy totals on the same root set
- it preserves all exact scores and all depth best moves; the one changed exact best move keeps the same exact score
- it required **no** new Egaroucid retraining, only local search / fallback selection on top of the already learned profile
