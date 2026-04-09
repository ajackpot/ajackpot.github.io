# Stage 39 move-ordering local-search tuner summary (2026-03-29)

## What changed
This step moved the Stage 38 manual move-ordering screening workflow into actual code.

Added:
- `tools/evaluator-training/tune-move-ordering-search-cost.mjs`
- `tools/evaluator-training/tune-move-ordering-search-cost.bat`
- `js/test/stage39_move_ordering_local_search_smoke.mjs`

Extended:
- `tools/evaluator-training/make-move-ordering-variant.mjs`
  - now supports `--drop-range <min>-<max>` to remove trained buckets and use runtime fallback ordering

Smoke checks run successfully:
- `node js/test/stage39_move_ordering_local_search_smoke.mjs`
- `node --check tools/evaluator-training/tune-move-ordering-search-cost.mjs`
- `node --check tools/evaluator-training/make-move-ordering-variant.mjs`

## Pilot A — remaining 15-18 buckets
Base profile:
- active `stage38-candidateC-disc0-10-12`

Search space:
- features: `mobility, cornerAdjacency, edgePattern, cornerPattern, discDifferential`
- ranges: `15-16, 17-18`
- fallback ranges: `15-16, 17-18`
- depth roots: `18, 16`
- exact roots: `13, 11`
- seeds: `1`

Outcome:
- no acceptable improving action found
- on this small root set, the remaining `15-18` trained buckets did not show a useful next single-step change

Output:
- `benchmarks/stage39_candidateC_local_search_pilot_20260329.json`

## Pilot B — exact-side 10-12 buckets
Search space:
- features: `corners, cornerAdjacency, parity`
- ranges: `10-10, 11-12`
- fallback ranges: `10-10, 11-12`
- depth roots: `15`
- exact roots: `13, 11`
- seeds: `1`

Chosen action:
- `fallback@10-10`

Pilot delta vs active `candidateC`:
- depth nodes: `3,132 -> 3,135` on the single depth root set used for this pilot (`+0.10%`)
- exact nodes: `13,761 -> 13,428` (`-2.42%`)
- combined/weighted nodes: `16,893 -> 16,563` (`-1.95%`)
- exact score agreement: `2/2`
- exact best-move agreement: `2/2`
- depth best-move agreement: `1/1`

Generated candidate profile:
- `tools/evaluator-training/out/stage39_candidateD_local_search_exact_smallpilot_best.json`

Effective change:
- remove trained bucket `10-10`
- keep `11-12`, `15-16`, `17-18` trained buckets
- runtime falls back to default move-ordering weights at child empties `10`

## Validation vs active `candidateC`
### Exact validation (`empties 14,13,12,11`, seeds `1..4`)
Output:
- `benchmarks/stage39_candidateD_fallback10_exact_validation_seed1_4_20260329.json`

Result:
- same score: `16/16`
- same best move: `16/16`
- nodes: `129,826 -> 128,927` (`-0.69%`)
- time: `4,423ms -> 4,244ms` (`-4.05%`)

By root empties:
- `14`: `77,468 -> 77,333` (`-0.17%`)
- `13`: `33,273 -> 33,348` (`+0.23%`)
- `12`: `15,401 -> 14,970` (`-2.80%`)
- `11`: `3,684 -> 3,276` (`-11.07%`)

### Depth validation (`empties 16,15`, seeds `1..4`)
Output:
- `benchmarks/stage39_candidateD_fallback10_depth_validation_seed1_4_20260329.json`

Result:
- same best move: `8/8`
- nodes: `20,640 -> 20,616` (`-0.12%`)
- time: `1,443ms -> 1,388ms` (`-3.81%`)

## Takeaway
- the new tuner is useful in practice, not just in theory
- it reproduced a plausible next candidate automatically: **fallback at child empties 10**
- the resulting `candidateD` improved on the small validation set while preserving root outputs exactly on the tested exact cases and preserving best moves on the tested depth cases
- because this validation set is still smaller than the earlier 24-seed adoption checks, the candidate is best treated as a **wider-validation candidate**, not yet the active profile
