# Stage 45 - Move-ordering replay/orchestrator, optional MPC module slot, and next-lane decision

## Why this stage exists

By Stage 44, the repo had a validated current best move-ordering profile (`candidateH2`), but two practical problems remained:

1. the adopted manual candidate chain (baseline -> B -> C -> D -> F -> H2) was spread across many steps and not easily reproducible in one command,
2. the project needed an explicit decision on whether to keep spending effort on move-ordering or to pivot to the next optimization lane.

This stage solves both by:
- adding a replay/orchestrator for the adopted move-ordering chain,
- adding an automated lane-analysis summary,
- and starting the **next lane** with optional MPC-profile module plumbing.

## What was implemented

### 1) Move-ordering chain replay tool

Added:
- `tools/evaluator-training/replay-move-ordering-adoption-chain.mjs`
- `tools/evaluator-training/replay-move-ordering-adoption-chain.bat`

The tool:
- starts from the stored Stage 38 baseline move-ordering profile,
- reconstructs `candidateB`, `candidateC`, `candidateD`, `candidateF`, and `candidateH2` using the actual applied transforms,
- saves regenerated variants,
- verifies each regenerated profile matches the stored reference at the trained-bucket content level,
- optionally benchmarks the whole chain in one same-run execution.

This turns the previous multi-step manual history into a replayable workflow.

### 2) Lane analysis tool

Added:
- `tools/evaluator-training/analyze-next-optimization-lane.mjs`
- `tools/evaluator-training/analyze-next-optimization-lane.bat`

The tool reads the larger validation artifacts from Stages 39/41/42/43/44 and summarizes:
- accepted same-run gains,
- failed broader follow-ups,
- current-vs-baseline and current-vs-legacy status,
- and a recommendation for whether move-ordering should continue or be frozen.

The current recommendation is to **freeze move-ordering at candidateH2 and pivot to MPC calibration/runtime plumbing**.

### 3) Optional MPC slot in generated profile modules

Updated:
- `tools/evaluator-training/lib.mjs`
- `tools/evaluator-training/build-generated-profile-module.mjs`
- `js/ai/evaluation-profiles.js`

What changed:
- generated profile modules can now embed an optional third JSON input: `--mpc-json`
- the generated module now exports `GENERATED_MPC_PROFILE`
- runtime profile helpers now expose `ACTIVE_MPC_PROFILE`

This does **not** turn MPC on yet.
It only removes the next packaging / module-builder blocker so a future calibrated MPC profile can be dropped in without reworking the generated-module path again.

## Validation

Passed:
- `node js/test/stage37_generated_module_builder_smoke.mjs`
- `node js/test/stage43_top_pair_local_search_smoke.mjs`
- `node js/test/stage45_generated_module_builder_mpc_slot_smoke.mjs`
- `node js/test/stage45_move_ordering_chain_replay_smoke.mjs`

Additional runtime-module rebuild performed successfully with `mpc slot = null`.

## Outcome

### Move-ordering status

Keep the current active move-ordering profile:
- `stage44-candidateH2-edgePattern125-cornerPattern125-11-12`

Do **not** keep manually pushing this lane right now.
The accepted gains have dropped into the “very small refinement” range, while nearby broader follow-ups fail to hold up.

### Next lane

The next concrete optimization lane should be:
- **MPC calibration + conservative runtime experiment**

Stage 45 only adds the replay/orchestration and the module-plumbing needed to start that lane cleanly.
A real MPC benchmark will still require either:
- `Egaroucid_Train_Data`, or
- a ready `trained-mpc-profile.json`

## Why this stage matters

Without this stage, the repo had a best-known move-ordering profile but no compact way to replay how it was obtained, and no explicit point where the project says “this lane is good enough; move on.”

Stage 45 provides that stopping point:
- move-ordering is reproducible,
- the diminishing-return evidence is explicit,
- and the project is now technically ready to accept a calibrated MPC profile in the generated-module pipeline.
