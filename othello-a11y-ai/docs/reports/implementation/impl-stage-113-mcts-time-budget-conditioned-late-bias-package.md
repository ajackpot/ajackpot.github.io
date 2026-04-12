# Stage 113 - MCTS time-budget-conditioned late-bias package screening

## 요약

이번 단계에서는 Stage 112가 남긴 다음 후보인 **time-budget-conditioned late-bias package**를 실제 runtime option으로 올려 검증했다.

핵심 가설은 단순했다.

- 낮은 budget에서는 기존 기본 late lane인 `legacy-root + rank`를 유지한다.
- 충분히 긴 budget에서만 `per-player + pnmax`로 runtime 전환한다.

실제 구현 표면은 다음 네 가지다.

- `mctsProofPriorityLateBiasPackageMode = fixed | budget-conditioned`
- `mctsProofPriorityLateBiasThresholdMs`
- `mctsProofPriorityLateBiasMetricMode`
- `mctsProofPriorityLateBiasBiasMode`

결론은 다음과 같다.

- **option / telemetry / benchmark surface 추가는 채택**
- **기본 late lane의 자동 승격은 미채택**
- 현재 기본값은 계속 `fixed`, 즉 `legacy-root + rank`

이유는 간단하다.

- `200ms` formal benchmark에서는 `>=200ms` 전환이 오히려 흔들렸다.
- `280ms`에서는 `>=240ms` 전환이 좋아 보였지만,
- 같은 단계에서 추가한 **duplicate-control benchmark**를 돌려 보니,
  그 개선 폭이 동일 실효 설정끼리도 재현되는 **time-budget noise** 범위와 겹쳤다.

## 구현

### 1. SearchEngine runtime option surface 추가

`js/ai/search-engine.js`

- `mctsProofPriorityLateBiasPackageMode`
- `mctsProofPriorityLateBiasThresholdMs`
- `mctsProofPriorityLateBiasMetricMode`
- `mctsProofPriorityLateBiasBiasMode`

를 experimental option으로 해석하게 했다.

runtime에서는 root MCTS 진입 시 `resolveMctsRootRuntimeConfig()`가 다음을 판단한다.

- continuation handoff로 proof-priority를 꺼야 하는지
- proof-priority lane 자체가 active인지
- 현재 budget이 package threshold 이상인지
- root가 실제 proof-priority depth 안인지

조건을 모두 만족하면,
root MCTS 호출 직전에만 `mctsProofMetricMode`와 `mctsProofPriorityBiasMode`를 runtime override 한다.

즉 **전역 기본 옵션을 바꾸지 않고 root search에만 조건부 late-bias package를 입힌다.**

### 2. telemetry / UI 노출 추가

`js/ai/search-engine.js`, `js/ui/formatters.js`

다음 telemetry를 결과에 붙였다.

- `proofPriorityLateBiasPackageMode`
- `proofPriorityLateBiasThresholdMs`
- `proofPriorityLateBiasMetricMode`
- `proofPriorityLateBiasBiasMode`
- `proofPriorityLateBiasEligibleByBudget`
- `proofPriorityLateBiasEligibleByDepth`
- `proofPriorityLateBiasActivated`

상태 요약 문장에는 package가 실제로 활성화되었을 때
`late-bias package ≥...ms (...)` 메모가 붙도록 했다.

옵션 리스트에도 budget-conditioned package가 설정되어 있으면
`240ms↑ per-player/pnmax` 식으로 보이게 했다.

### 3. benchmark tool 추가

`tools/engine-match/benchmark-mcts-late-bias-package.mjs`

이 도구는 다음 구조를 기본으로 사용한다.

- baseline `fixed legacy-root · rank`
- `budget-conditioned ≥T ms (per-player · pnmax)`

threshold를 여러 개 주면 같은 포지션/같은 seed에서 한 번에 비교한다.

즉

- `200ms`에서 `>=200ms`, `>=240ms`
- `280ms`에서 `>=200ms`, `>=240ms`
- control용 `>=1ms`, `>=240ms`, `>=1000ms`

같은 실험을 쉽게 반복할 수 있다.

### 4. smoke test 추가

- `js/test/stage113_mcts_late_bias_package_runtime_smoke.mjs`
- `js/test/stage113_mcts_late_bias_package_benchmark_smoke.mjs`

runtime smoke는

- `160ms`에서는 package가 **비활성**이어야 하고
- `280ms`에서는 package가 **활성**되어 `per-player + pnmax`가 telemetry에 찍혀야 한다

는 점을 확인한다.

benchmark smoke는

- `fixed`
- `budget-conditioned:200`
- `budget-conditioned:240`

세 variant가 JSON 요약에 올바르게 기록되는지 확인한다.

## 벤치마크 설계

### 공통 설정

- algorithm: `mcts-hybrid`
- empties: `12`
- late lane baseline: Stage 110/112 기본 late lane
  - `mctsSolverWldEmpties = 2`
  - `mctsExactContinuationExtraEmpties = 3`
  - adaptive continuation on (`loss-only`, `+1`)
  - `mctsProofPriorityScale = 0.15`
  - `mctsProofPriorityMaxEmpties = 12`
  - `mctsProofPriorityContinuationHandoffEnabled = true`
- baseline metric/bias:
  - `legacy-root + rank`
- package target:
  - `per-player + pnmax`

### formal package benchmark

- main 24-seed
- holdout 24-seed
- budgets: `200ms`, `280ms`
- thresholds: `200`, `240`

### duplicate-control benchmark

`280ms`에서 다음을 같이 둬서 **동일 실효 설정 간 noise**를 직접 측정했다.

- `fixed`
- `budget-conditioned >= 1ms`
  - 항상 active → active duplicate A
- `budget-conditioned >= 240ms`
  - 항상 active → active duplicate B
- `budget-conditioned >= 1000ms`
  - 항상 inactive → inactive duplicate

즉,

- `>=1ms` 와 `>=240ms` 는 **실효 설정이 완전히 같은 active duplicate**
- `fixed` 와 `>=1000ms` 는 **실효 설정이 완전히 같은 inactive duplicate**

가 된다.

## 결과

### 1. formal package benchmark — 200ms

main 24 + holdout 24, 총 48포지션

- `fixed legacy-root · rank`
  - exact-best `32/48 = 66.7%`
  - proven `38/48 = 79.2%`
  - exact-result `11/48 = 22.9%`
  - average score-loss `19,167`

- `budget-conditioned >=200ms`
  - exact-best `31/48 = 64.6%`
  - proven `37/48 = 77.1%`
  - exact-result `12/48 = 25.0%`
  - average score-loss `21,250`

- `budget-conditioned >=240ms`
  - exact-best `32/48 = 66.7%`
  - proven `39/48 = 81.3%`
  - exact-result `12/48 = 25.0%`
  - average score-loss `17,083`
  - activation `0/48`

첫 번째 해석은 분명하다.

- `>=200ms` 전환은 formal benchmark에서 **기본 baseline보다 나빴다.**
- `>=240ms`는 원래 `200ms`에서는 activation이 `0`이어야 한다.
- 그런데 fixed와 미세하게 어긋난다는 것은,
  현재 harness가 이 경계 budget에서 **time-budget noise**를 가진다는 뜻이다.

즉 `200ms` 단계에서는 package 승격 근거가 없다.

### 2. formal package benchmark — 280ms

main 24 + holdout 24, 총 48포지션

- `fixed legacy-root · rank`
  - exact-best `36/48 = 75.0%`
  - proven `45/48 = 93.8%`
  - exact-result `18/48 = 37.5%`
  - average score-loss `11,667`

- `budget-conditioned >=200ms`
  - exact-best `37/48 = 77.1%`
  - proven `45/48 = 93.8%`
  - exact-result `21/48 = 43.8%`
  - average score-loss `11,250`

- `budget-conditioned >=240ms`
  - exact-best `38/48 = 79.2%`
  - proven `45/48 = 93.8%`
  - exact-result `22/48 = 45.8%`
  - average score-loss `10,417`

표면적으로는 `>=240ms`가 제일 좋다.

하지만 이 수치만으로 승격을 결정하지 않았다.

이유는 바로 다음 control 때문이다.

### 3. duplicate-control benchmark — 280ms

#### main 24

- `fixed`
  - exact-best `19/24`
  - proven `20/24`
  - exact-result `10/24`
  - average score-loss `11,667`

- active duplicate A: `>=1ms`
  - exact-best `19/24`
  - proven `21/24`
  - exact-result `11/24`
  - average score-loss `11,667`

- active duplicate B: `>=240ms`
  - exact-best `19/24`
  - proven `21/24`
  - exact-result `11/24`
  - average score-loss `11,667`

- inactive duplicate: `>=1000ms`
  - exact-best `19/24`
  - proven `20/24`
  - exact-result `10/24`
  - average score-loss `11,667`

main 24에서는 duplicate가 거의 완전히 겹쳤다.

#### holdout 24

- `fixed`
  - exact-best `19/24`
  - proven `24/24`
  - exact-result `10/24`
  - average score-loss `9,167`

- active duplicate A: `>=1ms`
  - exact-best `18/24`
  - proven `24/24`
  - exact-result `10/24`
  - average score-loss `10,833`

- active duplicate B: `>=240ms`
  - exact-best `19/24`
  - proven `24/24`
  - exact-result `11/24`
  - average score-loss `9,167`

- inactive duplicate: `>=1000ms`
  - exact-best `19/24`
  - proven `24/24`
  - exact-result `11/24`
  - average score-loss `9,167`

여기가 결정적이다.

- `>=1ms`와 `>=240ms`는 **실효 설정이 완전히 같은 active duplicate**인데,
  holdout에서 exact-best가 `18/24 vs 19/24`, average score-loss가 `10,833 vs 9,167`로 갈렸다.
- `fixed`와 `>=1000ms`도 **실효 설정이 완전히 같은 inactive duplicate**인데,
  exact-result가 `10/24 vs 11/24`로 갈렸다.

즉 이 budget/seed 영역에서는,
현재 관측되는 `+1 hit`, `+1 exact-result`, `~1,500 내외 score-loss 차이` 정도는
**실제 개선일 수도 있지만 time-budget noise만으로도 재현되는 범위**라고 봐야 한다.

## 판정

### 채택

- `mctsProofPriorityLateBiasPackageMode` runtime option surface
- 관련 threshold / target metric / target bias option
- package telemetry / UI summary
- `benchmark-mcts-late-bias-package.mjs`
- Stage 113 runtime/benchmark smoke

### 미채택

- `mctsProofPriorityLateBiasPackageMode = budget-conditioned` 기본 승격
- `>=240ms -> per-player + pnmax` 자동 전환의 기본 반영

### 현재 기본 late lane 유지

- `mctsProofMetricMode = legacy-root`
- `mctsProofPriorityBiasMode = rank`
- `mctsProofPriorityLateBiasPackageMode = fixed`
- Stage 110 adaptive post-proof continuation 유지

## 왜 미채택인가

한 문장으로 요약하면 이렇다.

> `280ms`에서 좋아 보인 package 이득의 크기가, 같은 단계에서 측정한 duplicate-control noise 범위와 겹쳤다.

즉 이번 단계에서는

- “전환 후보 자체가 완전히 틀렸다”가 아니라,
- **현재 time-budget harness만으로는 기본값 승격을 정당화할 만큼 robust한 증거가 아니다**

라는 쪽으로 해석하는 것이 맞다.

## 실행한 검증

- `node js/test/stage110_mcts_adaptive_continuation_runtime_smoke.mjs`
- `node js/test/stage111_mcts_proof_priority_bias_mode_runtime_smoke.mjs`
- `node js/test/stage112_mcts_proof_metric_bias_combo_benchmark_smoke.mjs`
- `node js/test/stage113_mcts_late_bias_package_runtime_smoke.mjs`
- `node js/test/stage113_mcts_late_bias_package_benchmark_smoke.mjs`
- `node js/test/core-smoke.mjs`

## 산출물

- `benchmarks/stage113_mcts_late_bias_package_12empties_200ms_24seeds_20260411_v1.json`
- `benchmarks/stage113_mcts_late_bias_package_12empties_200ms_holdout24_20260411_v1.json`
- `benchmarks/stage113_mcts_late_bias_package_12empties_280ms_24seeds_20260411_v1.json`
- `benchmarks/stage113_mcts_late_bias_package_12empties_280ms_holdout24_20260411_v1.json`
- `benchmarks/stage113_mcts_late_bias_package_noise_control_12empties_280ms_24seeds_20260411_v1.json`
- `benchmarks/stage113_mcts_late_bias_package_noise_control_12empties_280ms_holdout24_20260411_v1.json`

## 다음 단계 후보

가장 자연스러운 다음 후보는 둘 중 하나다.

1. **fixed-iteration / fixed-node control benchmark**
   - time-budget noise를 줄인 조건에서 late-bias package를 다시 재평가
   - “실제 strength 차이”와 “deadline jitter”를 더 분리할 수 있다.

2. **root-maturity / proof-maturity gate**
   - 단순히 budget만 보지 말고,
     root proof frontier가 일정 수준 성숙했을 때만 `per-player + pnmax`로 전환
   - Stage 112의 root-driven 결과와 Stage 113의 budget noise 관찰을 함께 반영하는 다음 후보다.
