# Stage49 tuple decision summary

- Full calibrated profile holdout-selected MAE: 6.772339 -> 6.669582 stones (-0.102757).
- Raw tuple mean shift on holdout-selected: -0.305488 stones.
- Calibrated tuple mean shift on holdout-selected: -0.000000 stones.

## Search benchmark vs no tuple

### Full calibrated (56 tuples, 4 buckets)
- Depth: nodes +1.864% , time +11.445%.
- Exact: nodes +0.000% , time -2.998%.

### Top24 patch
- Depth: nodes -0.073% , time +4.136%.
- Exact: nodes +0.000% , time -3.338%.

### late-b/endgame patch
- Depth: nodes -0.422% , time +0.034%.
- Exact: nodes +0.000% , time -3.925%.

## Decision

1. Do not spend a full Egaroucid retrain on the same 56-tuple layout yet.
2. First screen patch/prune candidates with the new patch tool.
3. If retraining is desired, warm-start only the reduced layout (top24 patch is the first candidate).
