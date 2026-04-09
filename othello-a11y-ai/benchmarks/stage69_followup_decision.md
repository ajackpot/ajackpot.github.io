# Stage 69 — finalist follow-up: micro-patch narrowing + noisy confirmation

Generated at: 2026-04-07T01:43:07.307634Z

## Scope

This round intentionally did **both** follow-up branches suggested at stage 68:

1. a finalist micro-patch search around the remaining mismatch slots, and
2. a second benchmark regime using a fresh noisy Trineutron pack.

The work stayed on the small-patch lane; no large-family retraining was reopened.

## What changed in tooling/docs

- Added example configs:
  - `tools/evaluator-training/examples/tuple-patch-suite.finalist-followup-search.example.json`
  - `tools/evaluator-training/examples/tuple-patch-suite.finalist-followup-depthonly.example.json`
- Updated `tools/evaluator-training/README.md` so the new finalist follow-up examples are discoverable.

## Focused micro-patch search (empties 24/20/18, seeds 1..12)

Baseline for the focused search was the active runtime module.
The source tuple profiles were:
- `diagonal-lite-top16`
- `diagonal-latea-endgame-top24`

Key results:

| candidate | same-best | nodes | time | remaining mismatch slots |
|---|---:|---:|---:|---|
| top16-control | 32/36 | 100.2% | 100.6% | e24-s12, e20-s12, e18-s6, e18-s11 |
| top16-latea095 | 33/36 | 100.6% | 100.8% | e24-s12, e20-s12, e18-s11 |
| top16-latea090 | 33/36 | 100.7% | 101.8% | e24-s12, e20-s12, e18-s11 |
| top16-midc095-latea095 | 33/36 | 100.6% | 102.4% | e24-s12, e20-s12, e18-s11 |
| top16-midc090-latea095 | 33/36 | 100.6% | 100.9% | e24-s12, e20-s12, e18-s11 |
| top16-latea080 | 34/36 | 101.3% | 102.6% | e24-s12, e18-s11 |
| top16-midc090-latea080 | 34/36 | 101.3% | 101.0% | e24-s12, e18-s11 |
| latea-control | 33/36 | 99.5% | 100.1% | e20-s12, e18-s6, e18-s11 |
| latea-latea095 | 33/36 | 99.6% | 100.0% | e20-s12, e18-s6, e18-s11 |
| latea-latea090 | 33/36 | 99.9% | 100.5% | e20-s12, e18-s6, e18-s11 |
| latea-latea080 | 34/36 | 100.5% | 101.1% | e20-s12, e18-s11 |

Interpretation:
- `late-a 0.80x` was the first setting that materially reduced the mismatch set.
- The strongest depth-preserving top16 patch was `top16-midc090-latea080`.
- The cleanest `latea` follow-up was `latea-latea080`.

## Full depth benchmark (72 cases)

Compared against the active baseline module:

| candidate | same-best | nodes | time | mismatch slots |
|---|---:|---:|---:|---|
| stage68 top16 control | 68/72 | 97.9% | 99.8% | 4 slots (stage68) |
| top16-midc090-latea080 | 70/72 | 98.5% | 99.1% | e24-s12, e18-s11 |
| latea-latea080 | 70/72 | 100.3% | 100.7% | e20-s12, e18-s11 |

Interpretation:
- Both micro-patches improved search fidelity over their stage68 parents.
- `top16-midc090-latea080` became the best depth-preserving diagonal patch in this lane.

## Exact benchmark (40 cases)

| candidate | same score | same best move | exact time |
|---|---:|---:|---:|
| top16-midc090-latea080 | 40/40 | 40/40 | 98.9% |
| latea-latea080 | 40/40 | 40/40 | 99.1% |

Both micro-patches stayed exact-safe on the 40-case set.

## Noisy confirmation match (fresh opening seeds 61/71/81/91, 3 openings each, 24 games/variant)

This was the second benchmark regime: fresh opening pack plus `their-noise-scale=4`.

| variant | games | W-L-D | scoreRate | avg disc diff | avg our time/game | avg our nodes/game |
|---|---:|---:|---:|---:|---:|---:|
| baseline | 24 | 18-6-0 | 0.750 | 10.29 | 1950.4ms | 38481.2 |
| stage68 top16 control | 24 | 15-9-0 | 0.625 | 11.17 | 2063.9ms | 39831.2 |
| top16-midc090-latea080 | 24 | 15-9-0 | 0.625 | 11.75 | 2161.4ms | 40424.8 |
| latea-latea080 | 24 | 16-8-0 | 0.667 | 11.79 | 2084.8ms | 39903.6 |

Pairwise slot comparison on the same 24 opening/color slots:
- `top16 control` vs baseline: better 8, worse 9, equal 7
- `top16 micro` vs baseline: better 10, worse 7, equal 7
- `latea micro` vs baseline: better 9, worse 7, equal 8

Interpretation:
- The noisy confirmation set did **not** justify replacing the active baseline.
- Both micro-patches improved something locally (depth fidelity or average disc margin), but neither cleared baseline on match score.
- Among the experimental patches, `latea-latea080` produced the best noisy match score, while `top16-midc090-latea080` produced the cleanest depth result.

## Module size snapshot

- stage68 top16 control: 13660 bytes
- top16-midc090-latea080: 14699 bytes
- latea-latea080: 12642 bytes

## Decision

1. **Keep the active baseline as the default runtime.**
2. **Do not reopen large-family training.**
3. **Treat `top16-midc090-latea080` as the best depth-fidelity experimental patch.**
4. **Treat `latea-latea080` as the best noisy-match experimental patch.**
5. **Move to cleanup / tiny tuple-specific patching only if more work is desired.**

Why baseline stays:
- On the fresh noisy Trineutron set, baseline scored **0.750**, ahead of `latea-latea080` (**0.667**) and both top16 variants (**0.625**).
- The micro-patches did improve the search-fidelity story, but not enough to overturn the external match result.

## Recommended next step

- If you want to finish now, keep baseline as default and archive the two experimental patches as reference artifacts.
- If you want one last small step, do **only** a tiny tuple-specific patch around the two surviving mismatch slots (`e24-s12`, `e18-s11` for top16 micro; `e20-s12`, `e18-s11` for latea micro). Do not schedule another retraining round.
