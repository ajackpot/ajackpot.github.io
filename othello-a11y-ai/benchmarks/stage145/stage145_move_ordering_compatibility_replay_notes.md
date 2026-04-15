# Stage 145 move-ordering compatibility replay notes

Target candidate: **diagonal-top24-latea-endgame**
Final action: **select-compatible-ordering-switch**
Selected move-ordering: **baseline** (trained-move-ordering-linear-v2)

## Replay chain verification
- baseline: tools/evaluator-training/out/stage38_baseline_trained_move_ordering_linear_v2.json
- candidateB: matches stored reference (mobility@10-12=0; drop 13-14)
- candidateC: matches stored reference (discDifferential@10-12=0)
- candidateD: matches stored reference (no scales; drop 10-10)
- candidateF: matches stored reference (cornerPattern@11-12=1.25)
- candidateH2: matches stored reference (edgePattern@11-12=1.25, cornerPattern@11-12=1.25)

## Throughput vs H2
- candidateH2: nodes/ms 15.93, gain vs H2 0.00%, depth gain 0.000
- candidateF: nodes/ms 18.60, gain vs H2 22.92%, depth gain 0.000
- candidateD: nodes/ms 18.27, gain vs H2 21.32%, depth gain 0.000
- candidateC: nodes/ms 18.92, gain vs H2 25.65%, depth gain 0.000
- candidateB: nodes/ms 18.75, gain vs H2 24.99%, depth gain 0.000
- baseline: nodes/ms 19.25, gain vs H2 27.83%, depth gain 0.000
- legacy: nodes/ms 19.49, gain vs H2 29.08%, depth gain 0.000

## Search-cost challenger ranking
- #1 baseline: viable=yes, combined nodes -0.437%, depth same-best 100.0%, exact same-score 100.0%, throughput gain 27.83%
- #2 candidateC: viable=yes, combined nodes -0.111%, depth same-best 100.0%, exact same-score 100.0%, throughput gain 25.65%
- #3 candidateB: viable=yes, combined nodes -0.111%, depth same-best 100.0%, exact same-score 100.0%, throughput gain 24.99%
- #4 candidateF: viable=yes, combined nodes -0.005%, depth same-best 100.0%, exact same-score 100.0%, throughput gain 22.92%
- #5 legacy: viable=yes, combined nodes 0.000%, depth same-best 100.0%, exact same-score 100.0%, throughput gain 29.08%
- #6 candidateD: viable=yes, combined nodes 0.010%, depth same-best 100.0%, exact same-score 100.0%, throughput gain 21.32%

## Paired self-play checkpoints vs H2
- baseline: primary gap 0.000, worst 0.000 | sanity gap 0.000
- candidateC: primary gap 0.000, worst 0.000 | sanity gap 0.000

## Final decision
Action: select-compatible-ordering-switch
Rationale: baseline가 diagonal candidate 위에서 H2 대비 search-cost/throughput 이득을 보였고 paired self-play에서도 유의미한 악화를 보이지 않아 compatible ordering으로 승격합니다.
Next action: open-final-compact-tuple-adoption-gate
