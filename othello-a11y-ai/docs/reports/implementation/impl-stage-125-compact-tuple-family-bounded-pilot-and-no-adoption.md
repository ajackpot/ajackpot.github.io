# Stage 125 - compact tuple family bounded pilot and no adoption

## 요약

Stage 124 검토에서 유일하게 다시 열기로 했던 **compact systematic short n-tuple additive lane**를 이번 Stage에서 실제로 실험했습니다.

판정은 **채택 없음(no adoption)** 입니다.

핵심 결론은 다음과 같습니다.

1. bounded synthetic teacher corpus + family pilot + current depth/exact replay + small Trineutron sanity check까지 묶어도, 새 family 가운데 어떤 것도 현재 active runtime을 넘지 못했습니다.
2. synthetic holdout에서는 `orthogonal-adjacent-pairs-outer2-v1`가 가장 낮은 verified holdout MAE를 냈지만, current late-search replay fidelity는 오히려 약했습니다.
3. depth replay에서는 `diagonal-adjacent-pairs-full-v1`가 새 family 중 가장 좋은 same-best parity를 냈지만, 여전히 `27/32`에 그쳤고 elapsed는 `+7.2%`로 악화됐습니다.
4. exact suite에서는 세 후보가 모두 안전했지만, exact safety만으로는 runtime adoption 근거가 되지 않았습니다.
5. small external sanity check에서도 diagonal pilot은 active baseline과 같은 score rate만 냈고 average disc margin / time / nodes는 더 나빴습니다.

따라서 이번 Stage는 **tuple lane의 bounded reopen을 실제로 닫았지만, 런타임은 바꾸지 않은 closeout stage**로 기록하는 것이 맞습니다.

## 배경

Stage 124 검토는 다음을 정리했습니다.

- 추가 MCTS late-lane retuning, 독립 move-ordering 재튜닝, broad hand-crafted evaluator 확장, 5–6 empties micro-specialization 추가 확대, broad special-ending 확장은 현재 저장소 기준으로 비재개 권고
- evaluator 쪽에서 다시 열 가치가 남아 있는 것은 **새 layout family에 한정한 compact short n-tuple additive pilot**뿐

즉 이번 Stage의 질문은 단순했습니다.

- 현재 active tuple residual(`top24-retrain-retrained-calibrated-lateb-endgame`)을 실제로 흔들 수 있는 compact family가 있는가
- 있다면 어느 family가 가장 유망한가
- 없다면 이 lane을 current in-repo evidence 기준에서 다시 닫을 수 있는가

## 실험 설계

### 1. bounded synthetic teacher corpus

이번 Stage에서는 먼저 현재 active runtime search를 teacher로 쓰는 작은 synthetic corpus를 만들었습니다.

- 산출물: `benchmarks/stage125/stage125_compact_tuple_family_pilot_corpus_20260412.jsonl`
- 총 상태 수: `236`
- bucket 구성
  - `late-a`: `84`
  - `late-b`: `72`
  - `endgame`: `80`
- empties 분포: `2~19`
- teacher 설정
  - preset: `custom`
  - style: `balanced`
  - `maxDepth = 6`
  - `timeLimitMs = 1500`
  - `exactEndgameEmpties = 10`
  - `aspirationWindow = 40`
  - `randomness = 0`

teacher summary:

- exact teacher case: `128 / 236`
- average teacher elapsed: `115.13ms`
- average teacher nodes: `1216.64`

이 corpus는 “offline 대규모 재학습”이 아니라, **현재 runtime과의 bounded compatibility screening**을 위한 작은 pilot corpus입니다.

### 2. family pilot 대상

Stage 124 권고를 따라 다음 세 family만 비교했습니다.

- main pilot: `diagonal-adjacent-pairs-full-v1`
- control: `orthogonal-adjacent-pairs-full-v1`
- low-cost control: `orthogonal-adjacent-pairs-outer2-v1`

공통 training 설정은 다음과 같습니다.

- `phaseBuckets = late-a, late-b, endgame`
- `holdoutMod = 5`, `holdoutResidue = 0`
- `tupleEpochs = 2`
- `tupleMinVisits = 4`
- `tupleLearningRate = 0.05`
- `tupleL2 = 0.0005`
- `tupleGradientClip = 90000`
- calibration scope: `holdout-selected`

재현 도구:

- `tools/evaluator-training/run-tuple-layout-family-pilot.mjs`
- Stage 125 orchestrator: `tools/benchmark/run-stage125-compact-tuple-family-pilot.mjs`

## 결과 1 — synthetic holdout

| family | tuple 수 | table size | generated module bytes | verified holdout MAE(stones) | verified Δ vs baseline |
| --- | ---: | ---: | ---: | ---: | ---: |
| `diagonal-adjacent-pairs-full-v1` | 98 | 882 | 30,802 | 25.7599 | -0.0326 |
| `orthogonal-adjacent-pairs-full-v1` | 112 | 1008 | 34,347 | 25.7519 | -0.0349 |
| `orthogonal-adjacent-pairs-outer2-v1` | 56 | 504 | 23,641 | 25.6958 | -0.0458 |

baseline generated module size는 `15,085 bytes`였습니다.

해석:

- 세 family 모두 raw synthetic holdout에서는 baseline 대비 MAE 개선이 있었습니다.
- 하지만 calibration 이후 verified gain은 `-0.03 ~ -0.05 stones` 수준으로 매우 작았습니다.
- main pilot으로 잡았던 diagonal family가 holdout 1위가 아니었고, low-cost control인 outer2가 오히려 가장 낮은 verified MAE를 냈습니다.

즉 **synthetic holdout만으로는 새 family adoption을 정당화할 정도의 분리 신호가 생기지 않았습니다.**

## 결과 2 — current depth replay

Depth benchmark 설정:

- empties: `18, 16, 14, 12`
- seed count: `8`
- `timeLimitMs = 1500`
- `maxDepth = 6`
- `exactEndgameEmpties = 10`

overall 결과:

| family | same-best | cases | node Δ | elapsed Δ |
| --- | ---: | ---: | ---: | ---: |
| `diagonal-adjacent-pairs-full-v1` | 27 | 32 | -3.43% | +7.22% |
| `orthogonal-adjacent-pairs-full-v1` | 26 | 32 | -1.58% | +9.43% |
| `orthogonal-adjacent-pairs-outer2-v1` | 24 | 32 | +1.26% | +5.27% |

해석:

- main pilot인 diagonal family가 **새 family 가운데 depth fidelity 1위**였습니다.
- 하지만 same-best가 `27/32`에 그쳐, current active runtime과 비교하면 여전히 best-move divergence가 `5`건 남았습니다.
- node 수는 약간 줄었지만 elapsed는 오히려 늘어 **search efficiency 개선으로 바로 해석하기 어려웠습니다.**
- synthetic holdout 1위였던 outer2 control은 current search replay에서는 오히려 가장 약했습니다.

즉 **holdout winner와 runtime-like replay winner가 갈라졌고, 둘 다 active baseline adoption까지는 못 올라왔습니다.**

## 결과 3 — exact safety replay

Exact benchmark 설정:

- empties: `10, 8, 6`
- seed count: `6`
- `maxDepth = 12`
- 총 case: `18`

세 family의 공통 결과:

- exact case: `18 / 18`
- identical score: `18 / 18`
- identical best move: `18 / 18`
- node ratio: `1.0`

elapsed는 세 후보 모두 더 낮았습니다.

- diagonal: `-24.05%`
- orthogonal full: `-21.08%`
- outer2: `-14.86%`

이 부분은 좋은 신호입니다. 다만 이번 lane의 질문은 “exact tail에서 안전한가”가 아니라 **active runtime을 대체할 정도로 전체 late evaluator family가 좋아졌는가**였기 때문에, exact safety만으로는 adoption을 정당화할 수 없습니다.

## 결과 4 — small Trineutron sanity check

full noisy confirmation까지는 이번 Stage 범위를 넘기므로, opening 2개(`seed 125~126`) × 양색 4게임의 작은 sanity check만 추가했습니다.

비교 대상:

- active baseline
- `diagonal-adjacent-pairs-full-v1` pilot

aggregate 결과:

| variant | games | wins | losses | draws | score rate | avg disc diff | avg our time/game | avg our nodes/game |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| active baseline | 4 | 1 | 2 | 1 | 0.375 | -5.0 | 2602.25ms | 23630.0 |
| diagonal pilot | 4 | 1 | 2 | 1 | 0.375 | -11.5 | 2915.5ms | 24260.25 |

slot-by-slot으로는 `better 2 / worse 1 / equal 1`이었지만, aggregate로 보면 diagonal pilot은

- score rate 동률
- average disc margin 악화
- average time 증가
- average nodes 증가

였습니다.

즉 **새 family를 다음 단계로 escalate할 외부 noisy signal도 충분하지 않았습니다.**

## 채택 / 기각 판정

이번 Stage의 판정은 **채택 없음(no adoption)** 입니다.

정리하면 다음과 같습니다.

1. main pilot `diagonal-adjacent-pairs-full-v1`는 새 family 중 가장 promising했지만, synthetic holdout 1위도 아니었고 runtime depth replay에서도 active baseline을 넘지 못했습니다.
2. `orthogonal-adjacent-pairs-outer2-v1`는 synthetic holdout에서 가장 좋았지만, search replay fidelity는 오히려 더 낮아 control winner 수준에 머물렀습니다.
3. exact safety는 세 후보가 모두 만족했지만, adoption 판단의 필요조건일 뿐 충분조건은 아니었습니다.
4. small Trineutron sanity check도 “조금 더 큰 offline budget으로 바로 이어 가자”라고 말할 정도의 긍정 신호를 만들지 못했습니다.

따라서 이번 Stage에서는

- active runtime을 **그대로 유지**하고
- compact tuple family lane은 **bounded reproducible pilot까지 완료한 상태로 archive**하며
- richer external corpus 또는 larger offline training budget이 생기기 전까지는 **이 lane을 다시 열지 않는 것**이 맞습니다.

## 남긴 후속 규칙

이번 Stage가 “tuple lane 전체 영구 폐기”를 뜻하는 것은 아닙니다.
다만 current in-repo evidence 기준으로는 다음 정도만 남깁니다.

1. richer external corpus가 생기면 reopen 가능
2. reopen 시 첫 후보는 다시 `diagonal-adjacent-pairs-full-v1`
3. 단, 그 경우에도 evaluator adoption 이전에 **move-ordering compatibility replay**를 바로 붙여야 함

즉 남은 hidden sub-candidate는 “새 family + richer corpus + ordering compatibility replay” 조합뿐이고, 지금처럼 bounded in-repo evidence만으로는 더 진행하지 않습니다.

## 추가한 파일 / 산출물

- `tools/benchmark/run-stage125-compact-tuple-family-pilot.mjs`
- `js/test/stage125_compact_tuple_family_pilot_smoke.mjs`
- `benchmarks/stage125/stage125_compact_tuple_family_pilot_corpus_20260412.jsonl`
- `benchmarks/stage125/stage125_compact_tuple_family_pilot_summary_20260412.json`
- `benchmarks/stage125/stage125_compact_tuple_family_pilot_decision_summary_20260412.json`
- `benchmarks/stage125/depth/*`
- `benchmarks/stage125/exact/*`
- `benchmarks/stage125/stage125_active_vs_trineutron_seed125_games2_20260412.json`
- `benchmarks/stage125/stage125_diagonal_pilot_vs_trineutron_seed125_games2_20260412.json`
- `docs/reports/implementation/impl-stage-125-compact-tuple-family-bounded-pilot-and-no-adoption.md`

## 실행한 검증

```bash
node tools/benchmark/run-stage125-compact-tuple-family-pilot.mjs --summary-only
node js/test/stage125_compact_tuple_family_pilot_smoke.mjs
node js/test/core-smoke.mjs
node tools/docs/generate-report-inventory.mjs
node tools/docs/check-doc-sync.mjs
node js/test/stage109_report_inventory_smoke.mjs
node js/test/stage120_documentation_sync_smoke.mjs
```

## 최종 정리

Stage 124 검토에서 열어 둔 유일한 evaluator reopen lane은 이번 Stage 125에서 실제 bounded pilot까지 닫혔습니다.

결론은 다음 한 줄로 요약할 수 있습니다.

- **compact tuple family lane은 구조적으로 가능하지만, 현재 bounded evidence로는 active runtime 교체 근거가 부족하다.**

따라서 현재 저장소의 실제 런타임 의미론은 여전히

- Stage 121 active MPC default parity hardening 채택
- Stage 122 allocation-light search move path 채택
- Stage 123 opening default 유지
- Stage 124 lane decision review 문서화
- Stage 125 compact tuple bounded pilot no-adoption closeout

까지 반영된 상태로 정리됩니다.
