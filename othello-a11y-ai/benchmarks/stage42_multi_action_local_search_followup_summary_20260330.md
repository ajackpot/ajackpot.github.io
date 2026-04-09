# Stage 42 multi-action local-search follow-up summary (2026-03-30)

## Retraining decision

No new `Egaroucid_Train_Data` retraining was needed in this step.

Reason: this step stayed entirely in the **search-cost follow-up / variant-screening** lane on top of the already adopted `stage41-candidateF-cornerPattern125-11-12` profile.

## Code changes in this step

- Updated `tools/evaluator-training/tune-move-ordering-search-cost.mjs`
  - added multi-action candidate-chain support through `--min-actions-per-candidate` and `--max-actions-per-candidate`
  - candidate chains now respect simple conflict rules so overlapping drop/scale actions are not combined into ambiguous pairs
  - round summaries now separate atomic-action counts from candidate-chain counts
- Added `js/test/stage42_multi_action_local_search_smoke.mjs`
  - verifies a `2-action` search enumerates chained candidates and writes a valid summary/best-profile JSON

Smoke checks run successfully after the change:

- `node js/test/stage39_move_ordering_local_search_smoke.mjs`
- `node js/test/stage40_exact_tie_swap_audit_smoke.mjs`
- `node js/test/stage41_variant_provenance_smoke.mjs`
- `node js/test/stage42_multi_action_local_search_smoke.mjs`

## Multi-action tooling smoke

Output: `benchmarks/stage42_multi_action_local_search_smoke.json`

The smoke used the active `candidateF` profile and forced `2-action` candidates only.

Result:
- atomic actions enumerated: `6`
- candidate action chains enumerated: `8`
- evaluated candidate chains: `8`

This confirms the tuner can now search pair-style move-ordering candidates instead of only single-step actions.

## Practical follow-up on the current active profile

To keep the real search cost bounded, the actual follow-up search in this step treated `candidateF` as the base and looked for **one more safe action** on top of it. That still explores a two-step profile relative to the earlier `candidateD` baseline, while avoiding an unnecessarily expensive full pair sweep.

### Exact-side `11-12` pilot (seed `1`)

Output: `benchmarks/stage42_candidateF_local_search_exact_11_12_seed1_1_20260330.json`

Top acceptable pilot candidates vs `candidateF`:
- `fallback@11-12`: `43,815 -> 43,456` weighted nodes (`-0.82%`)
- `edgePattern@11-12=x0.25`: `43,815 -> 43,574` (`-0.55%`)
- `edgePattern@11-12=x0`: `43,815 -> 43,719` (`-0.22%`)

These looked promising on the tiny pilot, so they were promoted to seed `1..4` validation before any adoption decision.

### Seed `1..4` validation of the fallback candidate

Output: `benchmarks/stage42_candidateE_vs_candidateF_seed1_4_validation_20260330.json`

Profiles:
- `candidateF`: `stage41-candidateF-cornerPattern125-11-12`
- `candidateE`: `stage41-candidateE-fallback11-12`

Result:
- depth nodes: `24326 -> 24218` (`-0.44%`)
- exact nodes: `128917 -> 137848` (`6.93%`)
- combined nodes: `153243 -> 162066` (`5.76%`)

Conclusion: the fallback candidate's small depth gain did **not** survive broader validation; exact cost regressed heavily.

### Seed `1..4` validation of the edgePattern candidates

Output: `benchmarks/stage42_candidateG_edgePattern_seed1_4_validation_20260330.json`

Profiles:
- `candidateF`: `stage41-candidateF-cornerPattern125-11-12`
- `candidateG25`: `stage42-candidateG-edgePattern25-11-12`
- `candidateG0`: `stage42-candidateG-edgePattern0-11-12`

Result:
- `candidateG25`
  - depth nodes: `24326 -> 24326` (`0.00%`)
  - exact nodes: `128917 -> 130198` (`0.99%`)
  - combined nodes: `153243 -> 154524` (`0.84%`)
- `candidateG0`
  - depth nodes: `24326 -> 24302` (`-0.10%`)
  - exact nodes: `128917 -> 130012` (`0.85%`)
  - combined nodes: `153243 -> 154314` (`0.70%`)

Conclusion: both edgePattern follow-ups were worse than the current active profile on the broader validation set.

### Depth-side `15-18` pilot (seed `1`)

Output: `benchmarks/stage42_candidateF_local_search_depth_15_18_seed1_1_20260330.json`

Result:
- no acceptable improving action was found
- the remaining `15-18` search space again behaved like a local optimum under the tested single-step screen

## Decision after this step

Keep `stage41-candidateF-cornerPattern125-11-12` as the active move-ordering profile.

Reason:
- the new multi-action tuner support is real and tested
- the first practical follow-up candidates found from `candidateF` did **not** survive seed `1..4` validation
- changing the active profile here would knowingly replace a validated winner with weaker candidates
