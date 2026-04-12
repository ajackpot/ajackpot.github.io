# Stage 114 - MCTS late-bias package fixed-iteration control

## 요약

이번 단계에서는 Stage 113이 남긴 두 후보 중 먼저 **fixed-iteration / noise-reduced control benchmark**를 진행했다.

선택 이유는 명확했다.

- Stage 113의 불확실성은 `280ms`에서 보인 package 이득 자체보다,
  **같은 실효 설정끼리도 비슷한 폭으로 흔들리는 deadline jitter**에 있었다.
- 따라서 다음 판단은 새 runtime gate를 더 얹는 것보다,
  먼저 **late-bias package target 조합 자체가 같은 search budget에서 정말 더 강한지**를 확인하는 편이 더 유력했다.

이번 단계 결론은 다음과 같다.

- **fixed-iteration control benchmark 도구/회귀셋 추가는 채택**
- **time-budget-conditioned late-bias package 기본값 승격은 다시 미채택**
- 현재 기본 late lane은 계속
  - `mctsProofMetricMode = legacy-root`
  - `mctsProofPriorityBiasMode = rank`
  - `mctsProofPriorityLateBiasPackageMode = fixed`

핵심 이유는 단순하다.

> fixed-iteration으로 deadline noise를 걷어 내고 다시 보면,
> `per-player + pnmax`는 `24/32 iterations`에서 proof completion을 몇 건 더 닫기는 했지만,
> **exact-best와 average score-loss는 baseline과 끝까지 동일**했다.

즉 Stage 113의 `280ms` time-budget 우세는 **순수 알고리즘 strength 우세로 보기에 너무 약하다**는 쪽이 더 타당해졌다.

## 왜 fixed-iteration control을 먼저 했는가

Stage 113의 문제는 “candidate가 완전히 틀렸다”라기보다,
`timeLimitMs` 경계와 host jitter 때문에 **같은 effective setting도 다르게 보였다**는 점이었다.

그래서 이번 단계에서는 package option 자체를 다시 만지지 않고,
Stage 113 package가 실제로 전환하려던 두 late lane을 **동일 iteration budget**에서 직접 비교했다.

- baseline: `legacy-root + rank`
- target: `per-player + pnmax`

이 비교는 Stage 113 package의 실질 질문과 같다.

- 낮은 budget에서는 baseline 유지
- 충분히 큰 budget에서는 target으로 전환

여기서 target이 고정 iteration에서도 안정적으로 더 좋아지지 않는다면,
package의 기본값 승격 근거도 약해진다.

## 구현

### 1. fixed-iteration control benchmark tool 추가

새 도구:

- `tools/engine-match/benchmark-mcts-late-bias-package-fixed-iterations.mjs`

이 도구는 다음 특성을 가진다.

- `mctsMaxIterations`로만 root search budget을 자른다.
- `timeLimitMs`는 넉넉하게(`10000ms` 기본) 두어 deadline cutoff를 거의 제거한다.
- baseline late lane(`legacy-root + rank`)과 target late lane(`per-player + pnmax`)을 같은 상태, 같은 seed, 같은 iteration budget에서 직접 비교한다.
- Stage 110 기본 late lane 전제는 그대로 유지한다.
  - `mctsSolverWldEmpties = 2`
  - base exact continuation `+3`
  - adaptive continuation on (`loss-only`, `+1`)
  - `mctsProofPriorityScale = 0.15`
  - `mctsProofPriorityMaxEmpties = 12`
  - continuation handoff on

즉 이 도구는 Stage 113 package runtime option을 다시 검증하는 것이 아니라,
**package가 activate될 때의 실질 late lane target 조합이 고정 iteration에서 더 강한지**를 재는 control benchmark다.

### 2. benchmark smoke 추가

새 smoke:

- `js/test/stage114_mcts_late_bias_package_fixed_iterations_benchmark_smoke.mjs`

확인하는 점은 다음과 같다.

- JSON summary가 정상 생성되는지
- summary type과 option parsing이 맞는지
- baseline/target 두 variant가 모두 기록되는지
- scenario마다 exact reference score가 채워지는지
- baseline은 `legacy-root + rank`, target은 `per-player + pnmax`로 실제 telemetry에 보이는지

## 벤치마크 설계

### 공통 설정

- algorithm: `mcts-hybrid`
- empties: `12`
- reference exact: classic exact `20 empties`, `6000ms`
- time limit: `10000ms`
  - deadline cutoff를 사실상 제거하기 위한 값
- iteration budgets: `8, 12, 16, 24, 32`
- baseline late lane:
  - `legacy-root + rank`
- target late lane:
  - `per-player + pnmax`

### seed 세트

- main 24:
  - `15,17,31,41,47,53,71,89,107,123,149,167,191,223,257,281,307,331,359,383,419,443,467,491`
- holdout 24:
  - `11,19,29,37,43,59,67,73,97,113,131,157,173,199,211,239,269,293,317,347,373,401,431,479`

## 결과

## 1. main 24 - overall

총 `24 seeds × 5 iteration budgets = 120` scenario

- baseline `legacy-root + rank`
  - exact-best `83/120 = 69.2%`
  - proven `64/120 = 53.3%`
  - exact-result `38/120 = 31.7%`
  - average score-loss `23,833`

- target `per-player + pnmax`
  - exact-best `83/120 = 69.2%`
  - proven `67/120 = 55.8%`
  - exact-result `40/120 = 33.3%`
  - average score-loss `23,833`

main에서도 exact-best와 score-loss는 완전히 같고,
proof closure만 소폭 좋아졌다.

## 2. holdout 24 - overall

총 `24 seeds × 5 iteration budgets = 120` scenario

- baseline `legacy-root + rank`
  - exact-best `80/120 = 66.7%`
  - proven `71/120 = 59.2%`
  - exact-result `45/120 = 37.5%`
  - average score-loss `21,667`

- target `per-player + pnmax`
  - exact-best `80/120 = 66.7%`
  - proven `72/120 = 60.0%`
  - exact-result `45/120 = 37.5%`
  - average score-loss `21,667`

holdout에서는 차이가 더 줄어들었다.

## 3. 합산 48포지션 기준 iteration별 비교

main 24 + holdout 24, 총 `48`포지션

### 8 iterations

- baseline
  - exact-best `19/48 = 39.6%`
  - proven `4/48 = 8.3%`
  - exact-result `4/48 = 8.3%`
  - average score-loss `53,750`

- target
  - exact-best `19/48 = 39.6%`
  - proven `4/48 = 8.3%`
  - exact-result `4/48 = 8.3%`
  - average score-loss `53,750`

완전 동일하다.

### 12 iterations

- baseline
  - exact-best `30/48 = 62.5%`
  - proven `19/48 = 39.6%`
  - exact-result `14/48 = 29.2%`
  - average score-loss `30,000`

- target
  - exact-best `30/48 = 62.5%`
  - proven `19/48 = 39.6%`
  - exact-result `14/48 = 29.2%`
  - average score-loss `30,000`

여기도 동일하다.

### 16 iterations

- baseline
  - exact-best `36/48 = 75.0%`
  - proven `31/48 = 64.6%`
  - exact-result `19/48 = 39.6%`
  - average score-loss `12,500`

- target
  - exact-best `36/48 = 75.0%`
  - proven `31/48 = 64.6%`
  - exact-result `19/48 = 39.6%`
  - average score-loss `12,500`

여기까지도 완전히 같다.

### 24 iterations

- baseline
  - exact-best `39/48 = 81.3%`
  - proven `38/48 = 79.2%`
  - exact-result `22/48 = 45.8%`
  - average score-loss `7,917`

- target
  - exact-best `39/48 = 81.3%`
  - proven `41/48 = 85.4%`
  - exact-result `23/48 = 47.9%`
  - average score-loss `7,917`

여기서 처음으로 target이 proof completion만 약간 더 닫는다.
하지만 **착수 품질은 그대로**다.

### 32 iterations

- baseline
  - exact-best `39/48 = 81.3%`
  - proven `43/48 = 89.6%`
  - exact-result `24/48 = 50.0%`
  - average score-loss `9,583`

- target
  - exact-best `39/48 = 81.3%`
  - proven `44/48 = 91.7%`
  - exact-result `25/48 = 52.1%`
  - average score-loss `9,583`

`32 iterations`에서도 해석은 같다.
proof closure가 `+1` 늘었지만,
**exact-best와 average score-loss는 그대로**다.

## 4. 어떤 포지션에서만 차이가 났는가

합산 48포지션 × 5 budgets = `240` scenario 중,
baseline과 target이 실제로 달랐던 경우는 **4건**뿐이었다.

- seed `47`, `24 iterations`
  - 같은 draw-best move를 선택
  - target만 exact draw closure 달성
- seed `167`, `32 iterations`
  - 같은 draw-best move를 선택
  - target만 exact draw closure 달성
- seed `419`, `24 iterations`
  - 같은 win-best move를 선택
  - target만 WLD win closure 달성
- seed `269`, `24 iterations`
  - 서로 다른 win move를 택했지만 exact score는 둘 다 `+4` discs로 동일
  - target만 WLD win closure 달성

즉 차이는 전부 **proof completion telemetry** 쪽이고,
착수 strength가 더 좋아졌다고 읽을 수 있는 사례는 없었다.

## 해석

이번 단계에서 가장 중요한 결론은 다음이다.

### A. Stage 113의 280ms 우세는 “실제 strength 우세”라고 보기 어렵다

Stage 113에서는 `>=240ms` package가 time-budget benchmark에서

- exact-best `36/48 -> 38/48`
- exact-result `18/48 -> 22/48`
- average score-loss `11,667 -> 10,417`

처럼 좋아 보였다.

하지만 fixed-iteration control에서 다시 보면,
iteration을 충분히 준 뒤에도 target은

- exact-best: **동일**
- average score-loss: **동일**
- proven/exact-result: **소폭 증가**

패턴으로 정리된다.

즉 Stage 113의 time-budget 우세는

- 일부는 deadline jitter,
- 일부는 같은 move 품질 위에 올라간 proof closure timing 차이

로 읽는 편이 맞다.

### B. target 조합이 “나쁜” 것은 아니지만, 기본값을 바꿀 정도로 강하지는 않다

`per-player + pnmax`가 완전히 무의미한 것은 아니다.

- `24/32 iterations`에서 draw/win proof completion이 약간 더 잘 닫힌다.
- proven/exact-result는 baseline보다 `+1 ~ +3` 정도 좋아진다.

다만 현재 기준선에서 더 중요한 지표인

- exact-best
- average score-loss
- holdout robustness

에서는 **차이가 없다.**

따라서 이 조합은 “고예산에서 쓸 수도 있는 흥미로운 실험 후보” 정도이지,
기본 late lane을 자동 전환할 이유는 아직 없다.

## 판정

### 채택

- `benchmark-mcts-late-bias-package-fixed-iterations.mjs`
- Stage 114 fixed-iteration benchmark smoke
- 문서/인벤토리 갱신

### 미채택

- `mctsProofPriorityLateBiasPackageMode = budget-conditioned` 기본 승격
- `timeLimitMs >= 240ms -> per-player + pnmax` 자동 전환의 기본 반영

### 현재 기본 late lane 유지

- `mctsProofMetricMode = legacy-root`
- `mctsProofPriorityBiasMode = rank`
- `mctsProofPriorityLateBiasPackageMode = fixed`
- Stage 110 adaptive post-proof continuation 유지

## 왜 이번에는 더 강하게 미채택인가

Stage 113의 미채택 이유가

- “time-budget noise 범위와 겹친다”

였다면,
이번 Stage 114의 미채택 이유는 더 단단하다.

- **noise를 줄인 fixed-iteration control에서도 exact-best / score-loss 우세가 나오지 않았다.**

즉 지금은 단순 budget gate를 더 만지는 것보다,
아예 **언제 target late lane을 켜야 하는지 다른 신호를 찾는 편이 낫다.**

## 실행한 검증

- `node js/test/stage113_mcts_late_bias_package_benchmark_smoke.mjs`
- `node js/test/stage114_mcts_late_bias_package_fixed_iterations_benchmark_smoke.mjs`
- `node js/test/stage109_report_inventory_smoke.mjs`
- `node js/test/core-smoke.mjs`

## 산출물

- `benchmarks/stage114_mcts_late_bias_package_fixed_iterations_12empties_24seeds_20260411_v1.json`
- `benchmarks/stage114_mcts_late_bias_package_fixed_iterations_12empties_holdout24_20260411_v1.json`

## 다음 단계 후보

이제 다음 후보의 우선순위는 더 분명해졌다.

1. **root-maturity / proof-maturity gate**
   - budget이 아니라
     - root proof frontier가 충분히 좁아졌는지
     - ranked child가 실제로 몇 개 살아 있는지
     - root가 unsolved이지만 best move proof가 어느 정도 진행됐는지
     같은 **search-internal 성숙도 신호**를 gate로 쓰는 방향
   - Stage 112의 “root-driven” 관찰과 Stage 114의 “budget-only gate는 약함”을 함께 반영한다.

2. 더 나아가면 **proof-maturity telemetry 자체를 먼저 늘린 뒤 gate를 설계**하는 단계
   - 현재 telemetry만으로도 selection nodes / ranked children / root solved 여부는 보이지만,
     gate를 설계하려면 root child proof distribution이나 top-2 gap 같은 추가 지표가 더 유용할 수 있다.
