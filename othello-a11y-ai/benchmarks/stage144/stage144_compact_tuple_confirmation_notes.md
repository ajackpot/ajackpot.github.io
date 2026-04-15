# Stage 144 compact tuple confirmation notes

Final action: **open-move-ordering-compatibility-replay**
Selected candidate: **diagonal-top24-latea-endgame**
Control candidate: **outer2-top24-lateb-endgame**

## Stage 124 next-step interpretation
- Stage 124/125 ordering대로 diagonal new-family patch가 noisy confirmation을 통과했으므로 다음 단계는 move-ordering compatibility replay입니다.

## Round-robin ranking
- diagonal-top24-latea-endgame: scoreRate 50.0%, avgDiscDiff 0.00, throughputGain 22.4%, rankingScore 0.5084
- outer2-top24-lateb-endgame: scoreRate 50.0%, avgDiscDiff 0.00, throughputGain 20.9%, rankingScore 0.5080
- active: scoreRate 50.0%, avgDiscDiff 0.00, throughputGain 0.0%, rankingScore 0.5000

## Active head-to-head checkpoints
- primary / diagonal-top24-latea-endgame: pointGap 0.0 pts, worst 0.0 pts over 6 games
- all / diagonal-top24-latea-endgame: pointGap 0.0 pts, worst 0.0 pts over 8 games
- primary / outer2-top24-lateb-endgame: pointGap 0.0 pts, worst 0.0 pts over 6 games
- all / outer2-top24-lateb-endgame: pointGap 0.0 pts, worst 0.0 pts over 8 games

## Throughput
- Classic MTD(f) 2ply throughput:
  - active: nodes/ms 7.09, depth 3.92, completion 100.0%, gain vs active 0.0%
  - diagonal-top24-latea-endgame: nodes/ms 8.54, depth 4.00, completion 100.0%, gain vs active 22.4%
  - outer2-top24-lateb-endgame: nodes/ms 8.40, depth 4.00, completion 100.0%, gain vs active 20.9%
- Classic throughput sanity:
  - active: nodes/ms 6.04, depth 3.63, completion 100.0%, gain vs active 0.0%
  - diagonal-top24-latea-endgame: nodes/ms 7.83, depth 3.88, completion 100.0%, gain vs active 46.5%
  - outer2-top24-lateb-endgame: nodes/ms 8.51, depth 4.00, completion 100.0%, gain vs active 65.1%

## Pair benchmarks
- active_vs_diagonal-top24-latea-endgame / Classic MTD(f) 2ply fast noisy 280ms: active 50.0% vs diagonal-top24-latea-endgame 50.0%, nodes/ms 9.77 vs 9.95
- active_vs_diagonal-top24-latea-endgame / Classic MTD(f) 2ply normal noisy 500ms: active 50.0% vs diagonal-top24-latea-endgame 50.0%, nodes/ms 8.36 vs 8.99
- active_vs_diagonal-top24-latea-endgame / Classic PVS sanity 280ms: active 50.0% vs diagonal-top24-latea-endgame 50.0%, nodes/ms 6.07 vs 6.62
- active_vs_outer2-top24-lateb-endgame / Classic MTD(f) 2ply fast noisy 280ms: active 50.0% vs outer2-top24-lateb-endgame 50.0%, nodes/ms 9.86 vs 10.26
- active_vs_outer2-top24-lateb-endgame / Classic MTD(f) 2ply normal noisy 500ms: active 50.0% vs outer2-top24-lateb-endgame 50.0%, nodes/ms 8.70 vs 9.25
- active_vs_outer2-top24-lateb-endgame / Classic PVS sanity 280ms: active 50.0% vs outer2-top24-lateb-endgame 50.0%, nodes/ms 6.30 vs 6.72
- diagonal-top24-latea-endgame_vs_outer2-top24-lateb-endgame / Classic MTD(f) 2ply fast noisy 280ms: diagonal-top24-latea-endgame 50.0% vs outer2-top24-lateb-endgame 50.0%, nodes/ms 9.70 vs 10.14
- diagonal-top24-latea-endgame_vs_outer2-top24-lateb-endgame / Classic MTD(f) 2ply normal noisy 500ms: diagonal-top24-latea-endgame 50.0% vs outer2-top24-lateb-endgame 50.0%, nodes/ms 8.24 vs 9.06
- diagonal-top24-latea-endgame_vs_outer2-top24-lateb-endgame / Classic PVS sanity 280ms: diagonal-top24-latea-endgame 50.0% vs outer2-top24-lateb-endgame 50.0%, nodes/ms 6.10 vs 6.62

## Final decision
Action: open-move-ordering-compatibility-replay
Rationale: Stage 124/125 ordering대로 diagonal new-family patch가 noisy confirmation을 통과했으므로 다음 단계는 move-ordering compatibility replay입니다.
