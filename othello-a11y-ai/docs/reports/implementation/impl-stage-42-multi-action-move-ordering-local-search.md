# Stage 42 - Multi-action move-ordering local-search support and candidateF follow-up

## What changed

This step extends the Stage 39 search-cost local-search tuner so it can evaluate **action chains**, not just single atomic actions.

The practical goal is simple: once the repo reaches a single-step local optimum, we still need a way to test whether a **small combination of harmless changes** can beat the current active profile.

## Tuner updates

`tools/evaluator-training/tune-move-ordering-search-cost.mjs`

Added:
- `--min-actions-per-candidate`
- `--max-actions-per-candidate`

Behavior:
- the tuner still builds atomic actions the same way as before
- it now also enumerates compatible action chains whose length is between the configured minimum and maximum
- candidate summaries now keep both:
  - `atomicActionCount`
  - `candidateActionCount`

Compatibility rules for chained actions:
- overlapping `drop-range` actions are not combined
- a `drop-range` action is not combined with a scale action that touches the same range
- multiple scale actions on the same feature/range are not combined

This keeps pair candidates easy to reason about and avoids ambiguous order-sensitive chains.

## New smoke coverage

`js/test/stage42_multi_action_local_search_smoke.mjs`

The smoke forces a `2-action` search and checks that:
- atomic actions are enumerated
- candidate action chains are enumerated
- all tested candidates contain exactly two actions
- chained labels are visible in the summary JSON

## Follow-up search strategy

A fully broad pair search from the current active profile is still expensive, especially when exact-side validation is included. To keep the benchmark cost honest, this step used the new tooling in two layers:

1. prove the pair-capable tuner works through the new smoke test
2. continue the real move-ordering follow-up from the current active profile with **one more action on top of candidateF**

That is still a multi-step search relative to the earlier baseline, but it keeps the real benchmark budget under control.

## Search outcome

The first exact-side pilot on `candidateF` produced small positive signals for:
- `fallback@11-12`
- `edgePattern@11-12=x0.25`
- `edgePattern@11-12=x0`

However, seed `1..4` validation showed that all of those were worse than `candidateF` once the root set widened.

The depth-side `15-18` pilot also failed to find any acceptable improvement.

## Result

No active-profile adoption was made in this step.

The important deliverable is the new **multi-action local-search infrastructure** plus the evidence that the first candidateF follow-up signals were not robust enough to replace the current active profile.
