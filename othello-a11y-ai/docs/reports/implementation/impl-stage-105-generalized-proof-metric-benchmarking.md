# Stage 105 - draw-aware / per-player generalized proof metric prototype와 채택 판정

## 요약
이번 단계의 목표는 Stage 103~104에서 late lane에 붙인 MCTS proof-priority bias를, 
기존의 **legacy root proof/disproof metric** 대신 **per-player generalized proof metric**으로 바꿨을 때 실제 이득이 있는지 확인하는 것이었습니다.

결론은 다음과 같습니다.

- **실험 구현 자체는 채택**
  - `mctsProofMetricMode = 'legacy-root' | 'per-player'` 옵션을 추가했습니다.
  - node별 per-player proof number, telemetry, UI summary, benchmark 도구, smoke를 모두 붙였습니다.
- **기본값 승격은 비채택**
  - 현재 Stage 104 기본 late lane(실질적으로 `12 empties` 근방에서만 proof-priority가 살아 있는 구성)에서는 `per-player`가 robust한 이득을 만들지 못했습니다.
  - 기본값은 계속 **`legacy-root`**로 둡니다.

즉 이번 Stage 105는 “새 metric 모드 도입 + 실제 late-lane benchmark + 기본값 채택 여부 판정” 단계였고,
판정 결과는 **experimental opt-in 유지, default 승격은 보류**입니다.

## 왜 이 검증이 필요한가
기존 Stage 103 proof-priority는 root-player proof/disproof rank를 selection bonus로 바꾸는 prototype이었습니다.
이 방식은 말기 WLD proof를 빨리 잡는 데에는 어느 정도 도움이 있었지만,
PN/PPN 문맥에서 자주 지적되는 draw / player asymmetry 문제를 완전히 다루지는 못합니다.

그래서 이번 단계의 질문은 다음이었습니다.

1. proof-priority metric을 root-player 기준에서 **per-player 기준**으로 바꾸면,
2. 적어도 현재 저장소의 late solved-subtree lane에서는,
3. draw / WLD proof / exact continuation 접속부가 실제로 더 좋아지는가?

중요한 현실 조건도 하나 있었습니다.
Stage 104 기본값은 이미
- `mctsExactContinuationExtraEmpties = 3`
- `mctsProofPriorityContinuationHandoffEnabled = true`

이므로, 현재 proof-priority는 사실상 **12 empties 근방**에서만 의미 있게 살아 있습니다.
따라서 이번 기본 채택 판정은 우선 **실제 기본 late lane**을 중심으로 봐야 했습니다.

## 구현 내용

### 1) `js/ai/mcts.js`
다음 항목을 추가했습니다.

- `proofNumbersByPlayer = { black, white }`
- `refreshPerPlayerProofNumbers()`
- selection bonus용 metric resolver에 `proofMetricMode` 분기 추가
  - `legacy-root`
  - `per-player`
- analyzed move / root result에 다음 annotation 추가
  - `pnBlackProofNumber`
  - `pnWhiteProofNumber`
  - `pnMetricMode`
  - `pnMetricPlayer`
  - `pnMetricProofNumber`
  - `mctsRootBlackProofNumber`
  - `mctsRootWhiteProofNumber`
  - `mctsProofMetricMode`
  - `mctsProofPriorityMetricMode`
  - `mctsProofPriorityMetricPlayer`
- stats에 `mctsGeneralizedProofNumberUpdates` 추가

핵심은 **기존 legacy proof/disproof 흐름을 지우지 않고 병렬로 유지**했다는 점입니다.
그래야 같은 코드베이스에서 `legacy-root`와 `per-player`를 바로 A/B benchmark 할 수 있습니다.

### 2) `js/ai/search-engine.js`
런타임 옵션과 telemetry를 연결했습니다.

- `mctsProofMetricMode` 옵션 해석 추가
- MCTS proof telemetry 확장
  - root black/white proof number
  - best move black/white proof number
  - metric mode / metric player / metric proof number
  - generalized proof update 통계

### 3) `js/ui/formatters.js`
proof summary 문장을 다음처럼 mode-aware 하게 바꿨습니다.

- legacy-root일 때
  - `proof-priority x0.15 (legacy proof-rank)`
  - `proof-priority x0.15 (legacy disproof-rank)`
- per-player일 때
  - `proof-priority x0.15 (per-player 흑)`
  - `proof-priority x0.15 (per-player 백)`

설정 요약에도 proof-priority metric mode가 같이 보이도록 했습니다.

### 4) benchmark / smoke 추가
새로 추가한 항목:

- `tools/engine-match/benchmark-mcts-proof-metric-mode.mjs`
- `js/test/stage105_mcts_generalized_proof_metric_runtime_smoke.mjs`
- `js/test/stage105_mcts_generalized_proof_metric_benchmark_smoke.mjs`

이 benchmark는
- 전체 aggregate
- empties별 aggregate
- reference outcome(win/draw/loss)별 aggregate

를 함께 내기 때문에, draw-sensitive difference가 생기면 따로 볼 수 있습니다.

## 벤치 설계
이번에는 결과를 두 층으로 나눠 봤습니다.

### A. 현재 기본 late lane 검증
실제 Stage 104 기본 runtime을 그대로 둔 상태입니다.

- `exactEndgameEmpties = 8`
- `mctsSolverWldEmpties = 2`
- `mctsExactContinuationExtraEmpties = 3`
- `mctsProofPriorityContinuationHandoffEnabled = true`
- `mctsProofPriorityScale = 0.15`
- `mctsProofPriorityMaxEmpties = 12`
- empties: `12`
- seeds: `15,17,31,41,47,53,71,89,107,123,149,167`
  - 이 중 draw reference도 일부 포함되도록 골랐습니다.

### B. wider-lane diagnostic
proof-priority가 11 empties에서도 살아 있도록 진단용 구성을 따로 만들었습니다.

- `mctsExactContinuationExtraEmpties = 2`
- `mctsProofPriorityContinuationHandoffEnabled = false`
- empties: `11,12`
- draw / win / loss seed를 섞어 30포지션을 확인

이 구성은 현재 기본 runtime은 아니지만,
“per-player metric이 더 넓게 살아 있으면 draw 쪽에서 잠재 이득이 있는가?”를 보는 진단용입니다.

### C. fixed-iteration sanity
시간 제한 bench는 JIT / host load에 영향을 받을 수 있으므로,
대표 seed 몇 개는 `mctsMaxIterations`를 고정한 sanity check로 다시 확인했습니다.

- empties: `12`
- seeds: `15(draw)`, `17(loss)`, `71(win)`
- fixed iterations: `64,128,256,512`

## 결과

### 1) 현재 기본 late lane (`12 empties`) - 120ms
- legacy-root
  - exact-best `8/12 = 66.7%`
  - WLD agreement `11/12 = 91.7%`
  - proven `5/12 = 41.7%`
  - average score loss `23333`
- per-player
  - exact-best `7/12 = 58.3%`
  - WLD agreement `11/12 = 91.7%`
  - proven `4/12 = 33.3%`
  - average score loss `33333`

여기서는 **per-player가 오히려 한 칸 밀렸습니다.**
실제 차이는 거의 전부 `seed 17` loss-case 하나에서 나왔습니다.

- reference: `A1 / -40000`
- legacy-root: `A1 / -40000`, root loss proof까지 도달
- per-player: `C1 / -160000`, unsolved

즉 현재 기본 lane, 낮은 budget에서만 보면 **기본값 교체 근거가 없습니다.**

### 2) 현재 기본 late lane (`12 empties`) - 280ms
- legacy-root
  - exact-best `8/12 = 66.7%`
  - WLD agreement `12/12 = 100%`
  - proven `9/12 = 75.0%`
  - average score loss `21667`
- per-player
  - exact-best `8/12 = 66.7%`
  - WLD agreement `12/12 = 100%`
  - proven `9/12 = 75.0%`
  - average score loss `21667`

여기서는 **완전 동률**이었습니다.
즉 시간 여유가 조금 생기면 per-player가 더 좋아진다는 신호도 없었습니다.

### 3) wider-lane diagnostic - 120ms
- 전체 aggregate
  - legacy-root: exact-best `23/30`, proven `19/30`, exact-result `5/30`
  - per-player: exact-best `23/30`, proven `20/30`, exact-result `6/30`
- draw subset
  - legacy-root: proven `0.5`, exact-result `0.5`
  - per-player: proven `0.6`, exact-result `0.6`

여기서는 작은 차이가 하나 보였습니다.
`12 empties / seed 15 / draw`에서
- legacy-root는 same best move이지만 unsolved
- per-player는 same best move + root draw exact result

즉 **proof-priority가 더 넓게 살아 있는 진단 구성**에서는,
per-player가 draw proving을 약간 앞당기는 장면이 있었습니다.
다만 이 이득은 작고, exact-best나 average score loss를 바꾸는 수준은 아니었습니다.

### 4) wider-lane diagnostic - 280ms
- legacy-root = per-player
  - exact-best `24/30 = 80.0%`
  - WLD agreement `30/30 = 100%`
  - proven `27/30 = 90.0%`
  - exact-result `8/30 = 26.7%`
  - average score loss `15333`

즉 120ms에서 잠깐 보였던 diagnostic draw-lift도 280ms에서는 사라졌습니다.

### 5) fixed-iteration sanity
대표 seed `15(draw)`, `17(loss)`, `71(win)`를
`64 / 128 / 256 / 512` fixed iterations로 다시 돌렸을 때,
`legacy-root`와 `per-player`는 **모든 케이스에서 동일한 최종 선택 / solved status**를 보였습니다.

이 결과는 중요합니다.
이번 단계에서 time-budget bench에서 보인 작은 차이들이,
새 metric이 분명한 구조적 우위라기보다 **경계 시간대의 미세 차이**일 가능성이 크다는 뜻이기 때문입니다.

## 판정
최종 판정은 다음과 같습니다.

### 채택한 것
- `mctsProofMetricMode` 옵션 자체
- per-player generalized proof metric 계산
- per-player proof telemetry / UI summary surface
- benchmark / smoke / adoption summary 도구

### 채택하지 않은 것
- **`per-player`의 기본값 승격**

### 현재 기본값
- `mctsProofMetricMode = legacy-root`

## 왜 기본값을 유지하는가
이번 단계만 놓고 보면, per-player generalized proof metric은 이론적으로는 흥미롭지만,
현재 저장소의 실제 late lane에서는 다음 문제가 있습니다.

1. **실제 활성 구간이 너무 좁다**
   - Stage 104 handoff 구조 때문에 proof-priority는 사실상 12 empties 근방에서만 의미가 큽니다.
2. **draw-aware 이득이 보여도 너무 작다**
   - diagnostic 120ms에서만 일부 draw proof lift가 보였고, 280ms에서는 사라졌습니다.
3. **기본 lane에서 robust win이 없다**
   - 120ms는 오히려 한 칸 밀렸고,
   - 280ms는 완전 동률이었습니다.
4. **fixed-iteration sanity에서는 구조적 차이가 거의 안 보였다**
   - 즉 “새 metric이 분명히 더 낫다”는 신호로 읽기 어렵습니다.

## 다음 단계에 남기는 결론
이번 단계의 해석은 명확합니다.

- **per-player generalized proof metric은 연구용 / 실험용 lane으로는 유지할 가치가 있다.**
- 그러나 **현재 late lane의 기본 proof metric을 당장 교체할 정도의 근거는 아니다.**

이 기능을 다시 검토할 가장 자연스러운 조건은 다음 둘 중 하나입니다.

1. draw를 더 직접 다루는 **score-bounded / draw-aware solving lane**이 추가될 때
2. proof-priority가 12 empties 단일 구간보다 조금 더 넓게 의미 있게 살아 있도록 late lane 구성이 다시 바뀔 때

즉, 이번 Stage 105는 “full adoption”이 아니라,
**다음 PN/PPN-inspired 확장 전 단계에서 필요한 generalized metric 실험판과 판정 도구를 확보한 단계**로 보는 것이 맞습니다.

## 관련 파일
- `js/ai/mcts.js`
- `js/ai/search-engine.js`
- `js/ui/formatters.js`
- `js/test/stage105_mcts_generalized_proof_metric_runtime_smoke.mjs`
- `js/test/stage105_mcts_generalized_proof_metric_benchmark_smoke.mjs`
- `tools/engine-match/benchmark-mcts-proof-metric-mode.mjs`
- `benchmarks/stage105_mcts_proof_metric_mode_12empties_120ms_20260411.json`
- `benchmarks/stage105_mcts_proof_metric_mode_12empties_280ms_20260411.json`
- `benchmarks/stage105_mcts_proof_metric_mode_11to12_diagnostic_120ms_20260411.json`
- `benchmarks/stage105_mcts_proof_metric_mode_11to12_diagnostic_280ms_20260411.json`
- `benchmarks/stage105_mcts_proof_metric_fixed_iteration_sanity_20260411.json`
- `benchmarks/stage105_mcts_proof_metric_adoption_summary_20260411.json`
- `docs/runtime-ai-reference.md`
- `stage-info.json`

## 검증
이번 단계에서 다시 실행한 검증:

```bash
node js/test/core-smoke.mjs
node js/test/stage100_mcts_solver_runtime_smoke.mjs
node js/test/stage100_mcts_solver_late_accuracy_smoke.mjs
node js/test/stage101_mcts_exact_continuation_runtime_smoke.mjs
node js/test/stage101_mcts_exact_continuation_benchmark_smoke.mjs
node js/test/stage102_mcts_proof_telemetry_runtime_smoke.mjs
node js/test/stage103_mcts_proof_priority_runtime_smoke.mjs
node js/test/stage103_mcts_proof_priority_benchmark_smoke.mjs
node js/test/stage104_mcts_continuation_bridge_runtime_smoke.mjs
node js/test/stage104_mcts_continuation_bridge_benchmark_smoke.mjs
node js/test/stage105_mcts_generalized_proof_metric_runtime_smoke.mjs
node js/test/stage105_mcts_generalized_proof_metric_benchmark_smoke.mjs
node tools/docs/generate-report-inventory.mjs --check
```
