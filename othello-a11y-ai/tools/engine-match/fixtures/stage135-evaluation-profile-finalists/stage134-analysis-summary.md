# Stage 134 evaluation-candidate review

## Structural validation

- Suite candidates: 13/13 success
- Patch candidates: 18/18 success
- Generated module import/shape check: 31 checked, 0 functional mismatches
- Functional mismatches were none; the remaining issues were metadata-only quirks:
  - generated modules still report stage metadata as stage129
  - candidate-resolved-config.json leaves interpolation null for smoothed candidates even though trained profiles/generated modules correctly enable linear-adjacent-midpoint interpolation

## Uploaded-candidate ranking

Top choice: **balanced12-alllate-smoothed-stability-090**
Backup finalist: **balanced13-alllate-smoothed-stability-090**

### Top candidates
- `balanced12-alllate-smoothed-stability-090`: source holdout 6.029334 stones, profile ΔMAE -0.256319, depth-node Δ -4.006%, module 21235B
- `balanced13-alllate-smoothed-stability-090`: source holdout 6.029078 stones, profile ΔMAE -0.253469, depth-node Δ -2.871%, module 22029B
- `balanced12-alllate-smoothed-lateblend-010`: source holdout 6.029334 stones, profile ΔMAE -0.244496, depth-node Δ -4.085%, module 21686B
- `balanced13-alllate-smoothed-lateblend-010`: source holdout 6.029078 stones, profile ΔMAE -0.242715, depth-node Δ -3.680%, module 22461B

## External trineutron checks

- Deterministic 80ms: all three profiles tied on score rate.
- Deterministic 160ms: balanced12 beat the current active build on the same gauntlet.
- Noisy 100ms: the current active build remained best.

This means the best uploaded candidate is not yet a clean universal replacement for the current active profile, but it is still the strongest within the uploaded candidate batch.

## MTD(f) retest with the best candidate

- Beginner / 160ms
  - baseline classic vs classic-mtdf: 50:50
  - candidate classic vs classic-mtdf: 58.3:41.7 in favor of classic
- Easy / 280ms
  - baseline classic vs classic-mtdf: 50:50
  - candidate classic vs classic-mtdf: 37.5:62.5 in favor of classic-mtdf
  - candidate classic vs classic-mtdf-2ply: 50:50
  - candidate classic-mtdf vs classic-mtdf-2ply: 41.7:58.3

Interpretation:

- Better evaluation quality does materially improve the viability of MTD(f), especially around the easy/280ms band.
- The effect is still preset-dependent and not stable enough to justify a full default swap yet.
- The MTD(f) lane should stay reopened, but as a focused follow-up on the selected evaluation candidate rather than as an immediate adoption.