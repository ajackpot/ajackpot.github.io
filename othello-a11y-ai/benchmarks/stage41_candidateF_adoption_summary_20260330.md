# Stage 41 candidateF adoption summary (2026-03-30)

## Retraining decision

No new `Egaroucid_Train_Data` retraining was needed in this step.

Reason: the adopted change is a **manual search-cost follow-up** on top of the already adopted `candidateD` move-ordering profile. No new weight-learning corpus was touched.

## Code changes in this step

- Updated `tools/evaluator-training/tune-move-ordering-search-cost.mjs`
  - added `--progress-every` so broader local-search runs emit periodic progress instead of appearing stalled
- Updated `tools/evaluator-training/make-move-ordering-variant.mjs`
  - manual variants now drop stale active-adoption source/diagnostic metadata from the base profile before writing a derived variant
- Added `js/test/stage41_variant_provenance_smoke.mjs`
  - verifies a variant derived from the current active profile does not inherit stale adoption metadata

Smoke checks run successfully after the code changes and after the final active-profile rebuild:

- `node js/test/stage41_variant_provenance_smoke.mjs`
- `node js/test/stage37_generated_module_builder_smoke.mjs`
- `node js/test/stage39_move_ordering_local_search_smoke.mjs`
- `node js/test/stage40_exact_tie_swap_audit_smoke.mjs`

## Broad pilot search results

### Exact-side `11-12` pilot (seeds `1..2`)

Output: `benchmarks/stage41_candidateD_local_search_exact_11_12_broadpilot_seed1_2_20260330.json`

Best acceptable single-step action:
- `cornerPattern@11-12=x1.25`

Pilot delta vs active `candidateD`:
- depth nodes: `6365`
- exact nodes delta: `-0.02009%`
- combined nodes delta: `-0.01688%`

The signal was tiny, so it was treated as a wider-validation candidate rather than an immediate adoption.

### Depth-side `15-18` pilot (seeds `1..2`)

Output: `benchmarks/stage41_candidateD_local_search_depth_15_18_broadpilot_seed1_2_20260330.json`

Result:
- no acceptable improving action found
- on this broader pilot, the remaining `15-18` trained buckets behaved like a local optimum under the tested single-step search space

## Small validation vs `candidateD`

Output: `benchmarks/stage41_candidateF_vs_candidateD_seed1_4_validation_20260330.json`

Profiles compared:
- prior active `candidateD`: `stage39-candidateD-fallback10-10`
- candidate `candidateF`: `stage41-candidateF-cornerPattern125-11-12`

Result (`depth empties 16,15` and `exact empties 14,13,12,11`, seeds `1..4`):
- depth nodes: `24,325 -> 24,326` (`+0.00%`, +1 node)
- exact nodes: `128,927 -> 128,917` (`-0.01%`, -10 nodes)
- combined nodes: `153,252 -> 153,243` (`-0.01%`, -9 nodes)

This was still very small, but it stayed on the correct side of zero and preserved all tested root outputs, so it justified a full same-run wider validation.

## Same-run apples-to-apples 24-seed wider validation

Output: `benchmarks/stage41_candidateF_current_apples_to_apples_24seed_20260330.json`

Profiles compared in the **same execution**:
- `legacy`
- baseline `trained-move-ordering-linear-v2`
- prior active `candidateD`
- candidate `candidateF`

Root sets:
- depth roots: empties `19,18,17,16,15`
- exact roots: empties `14,13,12,11`
- seeds: `1..24`

### Overall nodes

| profile | depth | exact | combined |
| --- | ---: | ---: | ---: |
| legacy | 418,421 | 844,028 | 1,262,449 |
| baseline | 418,970 | 780,666 | 1,199,636 |
| candidateD | 418,584 | 754,642 | 1,173,226 |
| candidateF | 418,583 | 751,263 | 1,169,846 |

### Relative deltas for `candidateF`

- vs `candidateD`
  - depth: `-0.00024%`
  - exact: `-0.44776%`
  - combined: `-0.28809%`
- vs baseline
  - depth: `-0.09237%`
  - exact: `-3.76640%`
  - combined: `-2.48325%`
- vs legacy
  - depth: `0.03872%`
  - exact: `-10.99075%`
  - combined: `-7.33519%`

### Search-output agreement

Against prior active `candidateD`:
- depth: same score `120/120`, same best move `120/120`
- exact: same score `96/96`, same best move `96/96`

Against baseline:
- depth: same score `120/120`, same best move `120/120`
- exact: same score `96/96`, same best move `95/96`
- changed exact case vs baseline:
  - `(empties=11, seed=21)` `F1 -> H2` with unchanged score `-180000`

Against legacy:
- depth: same score `119/120`, same best move `120/120`
- exact: same score `96/96`, same best move `93/96`
- the three exact best-move differences vs legacy are the same tie-swap cases already verified in Stage 40

### By-root-empties delta vs prior active `candidateD`

Depth nodes:
- `19`: `90,607 -> 90,607` (`+0`)
- `18`: `103,872 -> 103,872` (`+0`)
- `17`: `85,360 -> 85,359` (`-1`)
- `16`: `78,658 -> 78,630` (`-28`)
- `15`: `60,087 -> 60,115` (`+28`)

Exact nodes:
- `14`: `420,335 -> 416,969` (`-3,366`)
- `13`: `215,721 -> 215,721` (`+0`)
- `12`: `84,534 -> 84,521` (`-13`)
- `11`: `34,052 -> 34,052` (`+0`)

The improvement is concentrated almost entirely at **exact root empties 14**.

## Important benchmarking note

The absolute depth nodes in this step should be compared only **within this same run**.

Reason: the depth suite is time-limited, so absolute node totals can drift across different executions and machine-load conditions even when the root set and options are the same. The adoption decision here was therefore made only from the same-run apples-to-apples comparison that included `legacy`, `baseline`, `candidateD`, and `candidateF` together.

## Active adoption

- Backed up the prior active profile to `tools/evaluator-training/out/stage41_candidateD_before_candidateF.json`
- Activated `stage41-candidateF-cornerPattern125-11-12` as `tools/evaluator-training/out/trained-move-ordering-profile.json`
- Rebuilt `js/ai/learned-eval-profile.generated.js`
- Saved generated-module summary to `benchmarks/stage41_candidateF_generated_profile_module_summary_20260330.json`
- Updated `stage-info.json` summary/timestamp while keeping the repo on Stage 38 labeling

## Decision after this step

Adopt `stage41-candidateF-cornerPattern125-11-12` as the repo's active move-ordering profile.

Reason:
- it is better than prior active `candidateD` on the same-run 24-seed validation set
- it also beats baseline and legacy in the same execution
- it preserves all root outputs vs `candidateD` and preserves all exact scores vs every tested comparator
- it required **no** new `Egaroucid_Train_Data` retraining, only a small search-cost-guided manual follow-up on top of the already adopted profile
