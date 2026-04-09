# Stage 51 tuple pipeline validation and decision

## Verdict

- `top24-retrain.generated.js` in the uploaded pipeline is **wrong** for adoption. It contains the pre-calibration tuple profile `top24-retrain-retrained`, not the final calibrated candidate `top24-retrain-retrained-calibrated`.
- After manual JSON->JS reintegration, the **full top24 retrained calibrated** candidate is still **not recommended**. It regresses `core-smoke` when activated and remains slower in the uploaded wide benchmarks.
- The best follow-up candidate is **not** the raw retrained output. The best follow-up candidate is a **small post-patch** of that retrained result: `top24-retrain-retrained-calibrated-lateb-endgame`.

## Why the uploaded full retrain is not adopted

1. Manual verification showed that the uploaded `generated.js` was built from the wrong stage of the pipeline.
2. Even after correcting the module, activating the full retrained calibrated tuple caused a `core-smoke` regression in the exact-root partial-timeout path.
3. The uploaded wide benchmark already showed a wall-clock slowdown.
   - depth: 39/40 same best move, nodes -2.535%, time +7.404%
   - exact: 30/30 same score and best move, nodes 0%, time +6.391%

## Recommended candidate

Use the retrained result only after a conservative post-patch:

- candidate: `top24-retrain-retrained-calibrated-lateb-endgame`
- active-module smoke: passed
- vs no tuple (wide depth): 40/40 same best move, nodes -0.459%, time -1.283%
- vs no tuple (wide exact): 30/30 same score and best move, nodes 0%, time -2.880%
- vs previous stage50 `late-b/endgame` patch: still slightly faster in both wide depth and wide exact comparisons

## Pipeline/tooling updates

The retrain pipeline has been updated so that:

- `*.generated.js` is rebuilt from the **final candidate** after calibration / final patch
- optional `--final-*` post-patch arguments are supported
- new preset: `top24-retrain-lateb-endgame`
- `--install-final` now installs the same evaluation / move-ordering combination that the pipeline benchmarked

## One-shot command going forward

```bat
tools\evaluator-trainingun-tuple-retrain-pipeline.bat D:\othello-data\Egaroucid_Train_Data C:\weights	rained-tuple-residual-profile.calibrated.json --preset top24-retrain-lateb-endgame --install-final
```
