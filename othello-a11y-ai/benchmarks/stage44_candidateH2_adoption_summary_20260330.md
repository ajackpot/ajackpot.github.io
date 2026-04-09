# Stage 44 candidateH2 adoption summary (2026-03-30)

## Retraining decision

No new `Egaroucid_Train_Data` retraining was needed in this step.

Reason: this step only validates and adopts a **manual search-cost top-pair follow-up** on top of the already adopted `candidateF` move-ordering profile.

## What changed

- Ran a same-run apples-to-apples validation for `candidateH2` against:
  - `legacy`
  - baseline `trained-move-ordering-linear-v2`
  - prior active `candidateF`
- Confirmed exact output stability against `candidateF`.
- Adopted a clean renamed profile:
  - `stage44-candidateH2-edgePattern125-cornerPattern125-11-12`
- Rebuilt `js/ai/learned-eval-profile.generated.js`
- Backed up the prior active profile to:
  - `tools/evaluator-training/out/stage44_candidateF_before_candidateH2.json`

## candidateH2 definition

`candidateH2` applies the following action chain on top of `candidateF`:

- `edgePattern@11-12=x1.25`
- `cornerPattern@11-12=x1.25`

## Same-run validation results

### 8-seed same-run check

Output:
- `benchmarks/stage44_candidateH2_current_apples_to_apples_8seed_20260330.json`

Against prior active `candidateF`:

- depth nodes: `157,937 -> 157,917` (-0.01266%)
- exact nodes: `251,346 -> 251,234` (-0.04456%)
- combined nodes: `409,283 -> 409,151` (-0.03225%)

Exact tie/output audit (`benchmarks/stage44_candidateH2_vs_candidateF_exact_tie_audit_seed1_8_20260330.json`):

- same score: `32/32`
- same best move: `32/32`
- verified tie swaps: `0`

### 24-seed same-run wider validation

Output:
- `benchmarks/stage44_candidateH2_current_apples_to_apples_24seed_20260330.json`

Against prior active `candidateF`:

- depth nodes: `418,583 -> 418,572` (-0.00263%)
- exact nodes: `751,263 -> 751,155` (-0.01438%)
- combined nodes: `1,169,846 -> 1,169,727` (-0.01017%)

Against baseline:

- combined nodes delta: `-2.49317%`

Against legacy:

- combined nodes delta: `-6.88436%`

### Output agreement vs prior active `candidateF` on the 24-seed run

- depth: same score `120/120`, same best move `120/120`
- exact: same score `96/96`, same best move `96/96`

There were **no** depth or exact root-output differences vs `candidateF` in the 24-seed same-run benchmark.

### By-root-empties node delta vs prior active `candidateF` (24-seed run)

Depth:
- `19`: `0`
- `18`: `0`
- `17`: `-10`
- `16`: `+1`
- `15`: `-2`

Exact:
- `14`: `-130`
- `13`: `+22`
- `12`: `0`
- `11`: `0`

The net gain is still concentrated at **exact root empties 14**, with a tiny depth-side gain at `17` and `15`.

## Smoke checks after adoption

- `node js/test/stage37_generated_module_builder_smoke.mjs`
- `node js/test/stage41_variant_provenance_smoke.mjs`
- `node js/test/stage43_top_pair_local_search_smoke.mjs`

All passed.

## Decision

Adopt `stage44-candidateH2-edgePattern125-cornerPattern125-11-12` as the repo's active move-ordering profile.

Why:

- it remains slightly better than `candidateF` on both the 8-seed and 24-seed same-run validations
- it preserves every tested depth and exact root output against `candidateF`
- it also remains better than baseline and legacy in the same 24-seed execution

## Important note

This is a **very small** improvement.

So while `candidateH2` is the best validated known manual follow-up so far, the result should be read as a low-margin refinement, not as a large algorithmic gain.
