# Stage 135 evaluation profile adoption notes

Final action: **keep-two-finalists**
Selected variant: **balanced13**
Finalists: balanced13, active

## Round-robin ranking
- balanced13: scoreRate 60.0%, avgDiscDiff 12.80, throughputGain 15.7%, rankingScore 0.6309
- active: scoreRate 55.0%, avgDiscDiff 6.40, throughputGain 0.0%, rankingScore 0.5628
- balanced12: scoreRate 35.0%, avgDiscDiff -19.20, throughputGain 12.9%, rankingScore 0.3160

## Throughput
- Classic throughput:
  - active: nodes/ms 17.90, depth 3.96, completion 100.0%, gain vs active 0.0%
  - balanced12: nodes/ms 18.95, depth 4.00, completion 100.0%, gain vs active 8.0%
  - balanced13: nodes/ms 19.53, depth 4.00, completion 100.0%, gain vs active 12.1%
- Classic MTD(f) 2ply throughput:
  - active: nodes/ms 17.72, depth 4.00, completion 100.0%, gain vs active 0.0%
  - balanced12: nodes/ms 20.85, depth 4.00, completion 100.0%, gain vs active 22.8%
  - balanced13: nodes/ms 20.68, depth 4.00, completion 100.0%, gain vs active 23.0%

## Pair benchmarks
- active_vs_balanced12 / Classic PVS 280ms: active 50.0% vs balanced12 50.0% (gap 0.0pp)
- active_vs_balanced12 / Classic PVS 500ms: active 50.0% vs balanced12 50.0% (gap 0.0pp)
- active_vs_balanced12 / MCTS Guided 280ms: active 100.0% vs balanced12 0.0% (gap -100.0pp)
- active_vs_balanced12 / MCTS Hybrid 500ms: active 50.0% vs balanced12 50.0% (gap 0.0pp)
- active_vs_balanced13 / Classic PVS 280ms: active 50.0% vs balanced13 50.0% (gap 0.0pp)
- active_vs_balanced13 / Classic PVS 500ms: active 50.0% vs balanced13 50.0% (gap 0.0pp)
- active_vs_balanced13 / MCTS Guided 280ms: active 100.0% vs balanced13 0.0% (gap -100.0pp)
- active_vs_balanced13 / MCTS Hybrid 500ms: active 0.0% vs balanced13 100.0% (gap 100.0pp)
- balanced12_vs_balanced13 / Classic PVS 280ms: balanced12 50.0% vs balanced13 50.0% (gap 0.0pp)
- balanced12_vs_balanced13 / Classic PVS 500ms: balanced12 50.0% vs balanced13 50.0% (gap 0.0pp)
- balanced12_vs_balanced13 / MCTS Guided 280ms: balanced12 0.0% vs balanced13 100.0% (gap 100.0pp)
- balanced12_vs_balanced13 / MCTS Hybrid 500ms: balanced12 0.0% vs balanced13 100.0% (gap 100.0pp)

## MTD(f) retest
- active / MTD(f) easy-band 280ms: classic 50.0% vs classic-mtdf-2ply 50.0% (gap 0.0pp)
- active / MTD(f) normal-band 500ms: classic 50.0% vs classic-mtdf-2ply 50.0% (gap 0.0pp)
- balanced13 / MTD(f) easy-band 280ms: classic 50.0% vs classic-mtdf-2ply 50.0% (gap 0.0pp)
- balanced13 / MTD(f) normal-band 500ms: classic 50.0% vs classic-mtdf-2ply 50.0% (gap 0.0pp)

Rationale: balanced13가 약간 앞서지만 active와의 차이가 아직 작아 결선 2개 유지 쪽이 안전합니다.
