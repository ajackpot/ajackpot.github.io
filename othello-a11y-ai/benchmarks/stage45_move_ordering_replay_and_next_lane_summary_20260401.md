# Stage 45 move-ordering replay + next-lane summary (2026-04-01)

## What changed in code

This step did **not** retrain on `Egaroucid_Train_Data`.

Instead it added two kinds of tooling:

1. **Move-ordering chain replay / decision tooling**
   - `tools/evaluator-training/replay-move-ordering-adoption-chain.mjs`
   - `tools/evaluator-training/replay-move-ordering-adoption-chain.bat`
   - `tools/evaluator-training/analyze-next-optimization-lane.mjs`
   - `tools/evaluator-training/analyze-next-optimization-lane.bat`
   - `js/test/stage45_move_ordering_chain_replay_smoke.mjs`

2. **Initial MPC-lane plumbing**
   - `build-generated-profile-module.mjs` now accepts optional `--mpc-json`
   - `tools/evaluator-training/lib.mjs` now supports sanitizing / embedding an MPC profile into `learned-eval-profile.generated.js`
   - `js/ai/evaluation-profiles.js` now exports `ACTIVE_MPC_PROFILE`
   - `js/test/stage45_generated_module_builder_mpc_slot_smoke.mjs`

The generated runtime module was rebuilt after the MPC-slot change. The current runtime still has:
- active evaluation profile: `trained-phase-linear-v1`
- active move-ordering profile: `stage44-candidateH2-edgePattern125-cornerPattern125-11-12`
- active MPC profile slot: `null`

## Validation run in this step

Passed:
- `node js/test/stage37_generated_module_builder_smoke.mjs`
- `node js/test/stage43_top_pair_local_search_smoke.mjs`
- `node js/test/stage45_generated_module_builder_mpc_slot_smoke.mjs`
- `node js/test/stage45_move_ordering_chain_replay_smoke.mjs`

## Replay result

The new replay tool regenerated the adopted candidate chain directly from the baseline profile and verified that the reconstructed profiles match the stored reference profiles at the **trained-bucket weight level**:

- baseline -> `candidateB`
  - `mobility@10-12=0`
  - `drop 13-14`
- `candidateB` -> `candidateC`
  - `discDifferential@10-12=0`
- `candidateC` -> `candidateD`
  - `drop 10-10`
- `candidateD` -> `candidateF`
  - `cornerPattern@11-12=x1.25`
- `candidateF` -> `candidateH2`
  - `edgePattern@11-12=x1.25`
  - `cornerPattern@11-12=x1.25`

Reduced replay artifact:
- `benchmarks/stage45_move_ordering_chain_replay_reduced_20260401.json`

Important note:
- the reduced replay uses a **tiny root set** (`depth empties 15`, `exact empties 13`, seed `1`) only to prove the replay/orchestration path is reproducible.
- on that tiny root set, baseline happens to beat the later follow-up chain.
- this does **not** contradict the previously adopted larger same-run validations; it is a reminder that tiny pilots are not adoption-quality evidence.

## Decision on whether to keep pushing move-ordering

The decision tool combined the larger existing same-run validations from Stages 39/41/44 with the failed broader follow-ups from Stages 42/43.

Accepted same-run gains:
- `candidateC -> candidateD`: **-0.40843%** combined nodes
- `candidateD -> candidateF`: **-0.28809%** combined nodes
- `candidateF -> candidateH2`: **-0.01017%** combined nodes

Failed broader follow-ups:
- `candidateE fallback@11-12`: **+5.75752%**
- `candidateG25 edgePattern@11-12=x0.25`: **+0.83593%**
- `candidateG0 edgePattern@11-12=x0`: **+0.69889%**
- `candidateH` fastpilot pair winner: **+0.98097%** on its broader validation

Current active profile (`candidateH2`) still remains better than:
- baseline: **-2.49317%** combined nodes on the Stage 44 24-seed same-run benchmark
- legacy: **-6.88436%** combined nodes on the same benchmark

### Conclusion

**Do not keep manually pushing move-ordering right now.**

Reason:
- the latest validated gain (`candidateF -> candidateH2`) is already at the **0.01%** level,
- several nearby follow-up candidates fail once validation broadens,
- the current manual search space is behaving like a plateau.

## Chosen next lane

Pivot to:
- **MPC calibration and runtime plumbing**

This matches the earlier Stage 35 pipeline decision: once evaluator + move-ordering weights are stable enough, the next low-risk search-side lane is not more blind move-ordering tuning, but conservative MPC / ProbCut preparation and integration.

## What is still needed from the user for the next real benchmark

No new artifact was needed for this Stage 45 coding step.

But the **next real MPC benchmark** will need one of:
- the full `Egaroucid_Train_Data` corpus, or
- a pre-generated `trained-mpc-profile.json`

This is **not** a request for new weight learning in the current step.
It is the calibration input needed for the next optimization lane after move-ordering has been frozen at `candidateH2`.
