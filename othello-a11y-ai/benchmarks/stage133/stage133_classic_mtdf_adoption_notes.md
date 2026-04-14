# Stage 133 classic MTD(f) adoption notes

- Decision: **hold-experimental-mtdf-only**
- Selected candidate: `classic-mtdf` (most promising overall, but not strong enough for default replacement)
- Rationale: throughput improved clearly, but preset-aligned paired self-play did not produce a stable, broad win over classic PVS.

## Preset-aligned snapshot

- beginner (160ms): `classic-mtdf-2ply` edged classic by +2.8pp, but lost to `classic-mtdf` in direct MTD(f) head-to-head.
- easy (280ms): `classic-mtdf` tied classic, while `classic-mtdf-2ply` trailed classic by -5.6pp.
- normal (500ms): both MTD(f) variants were effectively tied with classic in the sampled paired suite.
- hard (1400ms): sampled paired suite stayed tied; throughput still favored MTD(f), but the paired evidence was too small and too flat to justify a default swap.

## Takeaway

Keep `classic-mtdf` and `classic-mtdf-2ply` as experimental aliases and benchmark lanes.
Do not replace the default classic PVS driver unless a later, larger paired suite shows a stable positive gap across the main preset buckets.
