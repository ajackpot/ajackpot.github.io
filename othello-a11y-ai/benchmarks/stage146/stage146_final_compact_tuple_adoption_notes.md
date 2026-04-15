# Stage 146 final compact tuple adoption gate notes

Final action: **adopt-compact-tuple-runtime-switch**
Selected variant: **diagonal-top24-latea-endgame-baseline-ordering**

## Candidate
- baseline: active
- candidate: diagonal-top24-latea-endgame-baseline-ordering

## Search-cost
- depth same-best rate: 91.7%
- exact same-score rate: 100.0%
- combined node delta: -11.525%
- combined elapsed delta: -13.994%

## Throughput
- candidate nodes/ms gain vs active: 19.43%
- candidate move agreement vs active: 100.0%

## Paired self-play
- primary weighted point gap: 0.000 (worst 0.000)
- all-scenarios weighted point gap: 0.000 (worst 0.000)
- sanity weighted point gap: 0.000

## Final decision
Action: adopt-compact-tuple-runtime-switch
Rationale: Stage 145 compatible ordering까지 반영한 diagonal compact-tuple candidate가 exact safety를 유지했고 paired self-play에서도 유의미한 열세를 보이지 않으면서 search-cost/throughput 효율 개선을 함께 보여 최종 runtime 교체 후보로 채택합니다.
Next action: prepare-runtime-install-and-post-adoption-validation
