# Stage50 tuple direction analysis summary

## full_calibrated
- Depth: same best move 39/40, nodes +1.435%, time +10.081%.
- Exact: same score 30/30, same best move 30/30, nodes +0.000%, time -2.551%.
- Depth mismatch case: empties 22 seed 8 H1 -> G6.

## lateb_endgame
- Depth: same best move 40/40, nodes -0.325%, time -0.264%.
- Exact: same score 30/30, same best move 30/30, nodes +0.000%, time -2.482%.

## top24
- Depth: same best move 39/40, nodes -2.588%, time +0.438%.
- Exact: same score 30/30, same best move 30/30, nodes +0.000%, time -0.938%.
- Depth mismatch case: empties 22 seed 8 H1 -> G6.

## recommendation
- late-b/endgame patch is the safest immediate adoption candidate.
- top24 patch is the strongest reduced-layout retrain seed candidate.
- full 56-tuple layout still looks too expensive to justify a full retrain on the same shape.
