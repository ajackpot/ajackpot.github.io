# Stage 35 — MPC calibration harness and next-pipeline decision

## Why this stage exists
While phase-evaluator and move-ordering weights are retraining, the most useful next piece of work is not another blind search tweak.
The engine now has:

- learned phase-bucket evaluator weights,
- learned late move-ordering weights,
- evaluator residual statistics per bucket.

What it still does **not** have is the actual calibration data required before any ProbCut / Multi-ProbCut style pruning can be attempted safely:

- shallow/deep score pairs,
- bucketed linear regressions,
- residual sigma estimates,
- holdout coverage checks for candidate z values.

So this stage builds the missing calibration harness first.

## Decision reached in this stage
Chosen next pipeline:

1. **MPC / ProbCut calibration harness**

Deferred, but still worthwhile later:

1. learned edge/corner pattern residual tables
2. WTHOR / expert move-prior pipeline

Reason for the ordering:

- MPC preparation was already identified earlier as the lowest-risk search-side next step.
- The current repo already stores evaluator residual stats, so the natural continuation is to add shallow/deep search-pair calibration rather than guessing cut parameters.
- Pattern residual tables are promising, but they are a second learning pipeline and are better run after the current evaluator retraining settles.
- WTHOR / expert prior work is also promising, but it is less directly connected to the current “learned evaluator → future selective search” path.

## What was implemented
### 1) New calibration tool
Added:

- `tools/evaluator-training/calibrate-mpc-profile.mjs`
- `tools/evaluator-training/calibrate-mpc-profile.bat`

The tool:

- reads corpus states from the existing training formats,
- filters them by empties bucket,
- runs a shallow search and a deep search for each accepted state,
- fits `deep ≈ intercept + slope * shallow` per bucket,
- records train / holdout residual metrics,
- measures holdout coverage for configurable z values,
- chooses the smallest z that satisfies the requested holdout coverage target,
- writes a standalone JSON calibration profile.

### 2) Smoke test
Added:

- `js/test/stage35_mpc_calibration_smoke.mjs`

The smoke test:

- generates two small synthetic corpora,
- runs the new calibration tool from an external cwd,
- writes a repo-relative benchmark JSON,
- verifies that the output shape is correct.

### 3) README update
Added a new README section for MPC calibration usage and expected output fields.

## Output profile shape
The generated JSON contains:

- metadata about the corpus / stride / holdout split,
- one calibration entry per empties bucket,
- shallow/deep depth pair,
- sample counts,
- fitted regression,
- train residual metrics,
- holdout residual metrics,
- z-coverage table,
- recommended z,
- shallow/deep search cost summaries,
- a conservative `usable` flag.

This file is intentionally **not** injected into runtime yet.
It is a preparation artifact for later MPC integration.

## Validation performed
Executed:

- `node js/test/core-smoke.mjs`
- `node js/test/perft.mjs`
- `node js/test/stage30_trineutron_adapter_smoke.mjs`
- `node js/test/stage35_mpc_calibration_smoke.mjs`

All passed.

## Expected next use
Once the retrained evaluation profile and move-ordering profile are stable, the intended next command is:

```bat
tools\evaluator-training\calibrate-mpc-profile.bat D:\othello-data\Egaroucid_Train_Data --evaluation-profile-json tools\evaluator-training\out\trained-evaluation-profile.json --move-ordering-profile-json tools\evaluator-training\out\trained-move-ordering-profile.json
```

Then, after inspecting correlation / sigma / holdout coverage, we can decide whether a conservative runtime ProbCut / MPC experiment is justified, and in which empties bands.
