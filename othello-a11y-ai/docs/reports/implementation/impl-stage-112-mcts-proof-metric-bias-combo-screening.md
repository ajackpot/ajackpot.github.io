# Stage 112 — MCTS proof metric × bias combo screening

## 요약

이번 단계에서는 Stage 110/111 late lane을 그대로 유지한 채,
남아 있던 두 후보를 다시 좁혀 봤다.

- **deeper-only / root-off proof-priority gate**
- **`legacy-root` / `per-player` generalized proof metric × `rank` / `pnmax` bias formula 조합**

최종 판정은 다음과 같다.

- **채택한 것**
  - `tools/engine-match/benchmark-mcts-proof-priority-bias-mode.mjs`를 확장해 `--proof-metric-modes` 다중 스크리닝 지원 추가
  - Stage 112 combo benchmark smoke 추가
  - root-off pilot + metric/bias combo formal benchmark 산출물 추가
- **기본값으로 채택하지 않은 것**
  - deeper-only / root-off gate
  - `mctsProofMetricMode = per-player` 기본 승격
  - `mctsProofPriorityBiasMode = pnmax` 기본 승격
  - `per-player + pnmax` late lane 기본 승격
- **현재 기본값 변화**
  - 없음
  - 현재 late lane 기본값은 계속 `legacy-root + rank` 유지

즉 Stage 112는 **deeper-only 가설을 먼저 꺾고, literature-faithful combo(`per-player` + `pnmax`)까지 같은 rerun harness에서 다시 확인했지만, 기본값 승격은 보류한 screening stage**다.

## 배경

Stage 111의 다음 후보는 두 갈래였다.

1. `pnmax`를 **deeper-only / solved-near frontier**에만 걸어, 120ms의 안정성을 깨지 않고 280ms 이득만 남길 수 있는지 보는 것
2. Stage 105의 **per-player generalized proof metric**과 Stage 111의 **value-based bias formula**를 조합해, GPN-MCTS 쪽과 더 가까운 조합이 실제로도 더 나은지 보는 것

이번 단계에서는 먼저 1번을 아주 싸게 pre-screen하고,
그다음 의미가 남아 있으면 2번을 formal benchmark로 밀어 보는 순서를 택했다.

## 실제 구현

### 1. `tools/engine-match/benchmark-mcts-proof-priority-bias-mode.mjs`

기존 Stage 111 benchmark tool은 bias formula만 비교할 수 있었다.
이번 단계에서는 여기에 다중 proof metric mode sweep을 추가했다.

- 새 CLI
  - `--proof-metric-modes legacy-root,per-player`
- 기존 Stage 111 사용법은 그대로 유지
  - `--proof-metric-mode legacy-root`
  - `--proof-priority-bias-modes rank,pnmax,pnsum`
- multi-metric run일 때 variant key를
  - `legacy-root:rank`
  - `legacy-root:pnmax`
  - `per-player:rank`
  - `per-player:pnmax`
  처럼 분리해 저장

즉 이제 Stage 111 bias formula benchmark를 다시 쓰면서도,
Stage 112처럼 **proof metric × bias formula combo**를 한 번에 재현할 수 있다.

### 2. 새 smoke

추가한 파일:

- `js/test/stage112_mcts_proof_metric_bias_combo_benchmark_smoke.mjs`

이 smoke는 위 benchmark tool이 multi-metric 모드에서 4개 variant를 제대로 생성하고,
scenario/aggregate/topline 구조가 깨지지 않는지 확인한다.

## 1차 pre-screen — deeper-only / root-off gate

먼저 현재 late bucket에서 proof-priority가 실제로 어디서 작동하는지 확인했다.
12-empty root benchmark에서 `mctsProofPriorityMaxEmpties = 11`로 내려,
**root(12 empties)에서는 proof-priority를 끄고 그 아래만 허용**했다.

main 24-seed pilot 결과:

### 120ms

- `pnmax`, `maxEmpties = 11`
  - exact-best `15/24 = 62.5%`
  - proven `13/24 = 54.2%`
  - average score-loss `23,333`
  - **average proof-priority selection nodes = `0`**

### 280ms

- `pnmax`, `maxEmpties = 11`
  - exact-best `18/24 = 75.0%`
  - proven `20/24 = 83.3%`
  - average score-loss `12,500`
  - **average proof-priority selection nodes = `0`**

핵심은 숫자 자체보다 `selection nodes = 0`이다.
즉 현재 `12 empties` rerun에서는 proof-priority가 사실상 **root에서만 의미 있게 작동**하고,
그 root를 꺼 버리면 deeper-only gate는 lane 자체를 사실상 비활성화하는 것과 다르지 않았다.

그래서 이번 단계에서는 이 축을 여기서 멈추고,
formal 검증은 `proof metric × bias formula` 조합으로 넘겼다.

## formal benchmark 설계

비교는 Stage 110 late lane을 그대로 유지한 상태에서 진행했다.
즉 다음은 고정했다.

- algorithm: `mcts-hybrid`
- solver: on (`mctsSolverWldEmpties = 2`)
- exact continuation: on (`+3`)
- adaptive continuation: on
  - `loss-only`
  - extra empties `+1`
  - legal-move cap `0`
- proof-priority scale: `0.15`
- proof-priority max empties: `12`

그리고 proof lane만 다음 4조합으로 다시 돌렸다.

- `legacy-root + rank`
- `legacy-root + pnmax`
- `per-player + rank`
- `per-player + pnmax`

평가 위치는 모두 `12 empties`였고,
- main 24 seeds
- holdout 24 seeds
로 나누어 `120ms`, `280ms`를 각각 rerun했다.

중요한 점은, 이번 Stage 112 수치는 **같은 rerun harness에서 다시 측정한 값**이라는 것이다.
따라서 이전 Stage 111 숫자와 직접 1:1 비교하기보다,
이번 Stage 112의 네 조합을 **같은 실행 조건 안에서 서로 비교**하는 쪽이 맞다.

## 벤치 결과

### A. main + holdout 48 seeds 합산, 120ms

- `legacy-root + rank`
  - exact-best `31/48 = 64.6%`
  - proven `27/48 = 56.3%`
  - exact-result `4/48 = 8.3%`
  - average score-loss `20,625`
- `legacy-root + pnmax`
  - exact-best `29/48 = 60.4%`
  - proven `28/48 = 58.3%`
  - exact-result `5/48 = 10.4%`
  - average score-loss `23,542`
- `per-player + rank`
  - exact-best `29/48 = 60.4%`
  - proven `28/48 = 58.3%`
  - exact-result `5/48 = 10.4%`
  - average score-loss `23,542`
- `per-player + pnmax`
  - exact-best `31/48 = 64.6%`
  - proven `28/48 = 58.3%`
  - exact-result `5/48 = 10.4%`
  - average score-loss `25,208`

해석:

- `per-player + pnmax`가 exact-best는 baseline과 동률까지 따라왔지만,
  average score-loss가 가장 나빴다.
- `legacy-root + rank`는 proven/exact-result는 가장 높지 않아도,
  **120ms에서 가장 안전한 선택 품질**을 보였다.

### B. main + holdout 48 seeds 합산, 280ms

- `legacy-root + rank`
  - exact-best `36/48 = 75.0%`
  - proven `42/48 = 87.5%`
  - exact-result `17/48 = 35.4%`
  - average score-loss `13,333`
- `legacy-root + pnmax`
  - exact-best `36/48 = 75.0%`
  - proven `43/48 = 89.6%`
  - exact-result `18/48 = 37.5%`
  - average score-loss `11,250`
- `per-player + rank`
  - exact-best `36/48 = 75.0%`
  - proven `42/48 = 87.5%`
  - exact-result `18/48 = 37.5%`
  - average score-loss `13,333`
- `per-player + pnmax`
  - exact-best `37/48 = 77.1%`
  - proven `43/48 = 89.6%`
  - exact-result `19/48 = 39.6%`
  - average score-loss `10,417`

해석:

- `per-player + pnmax`가 280ms에서는 가장 좋았다.
- `legacy-root + pnmax`도 baseline `legacy-root + rank`보다 score-loss / proven / exact-result가 좋아졌다.
- 즉 Stage 111에서 보였던 **value-based bias의 280ms 이득**이,
  `per-player`와 결합하면 조금 더 강해지는 신호는 분명히 있다.

## 판정

### 채택한 것

- proof metric × bias formula combo benchmark tooling
  - `--proof-metric-modes`
- Stage 112 combo benchmark smoke
- root-off pilot + formal combo benchmark 산출물

### 기본값으로 채택하지 않은 것

- deeper-only / root-off gate
- `legacy-root + pnmax`
- `per-player + rank`
- `per-player + pnmax`
- `mctsProofMetricMode = per-player` 기본 승격
- `mctsProofPriorityBiasMode = pnmax` 기본 승격

### 이유

1. root-off pilot에서 proof-priority selection node 평균이 `0`으로 떨어져,
   현재 `12 empties` late bucket에서는 **deeper-only gate 자체가 거의 아무 것도 하지 못한다**는 점이 드러났다.
2. `per-player + pnmax`는 280ms에서는 가장 좋았지만,
   120ms에서는 exact-best 동률에도 average score-loss가 baseline보다 크게 나빴다.
3. `legacy-root + pnmax`도 280ms에서는 개선됐지만,
   120ms exact-best와 average score-loss를 함께 보면 baseline `legacy-root + rank`보다 robust하지 않았다.
4. 따라서 지금 시점에서 late lane 기본값을 바꾸려면,
   `120ms`와 `280ms`를 함께 놓고도 더 일관된 우세가 필요했다.

이번 Stage 112의 결론은 다음 한 줄로 요약할 수 있다.

> **현재 12-empty late bucket에서는 proof-priority가 거의 root-driven이고, per-player + pnmax 조합은 280ms에서는 가장 좋지만 120ms까지 포함하면 기본값으로 올릴 만큼 안정적이지 않다.**

## 회귀 확인

다음을 다시 실행해 통과했다.

- `node js/test/stage111_mcts_proof_priority_bias_mode_benchmark_smoke.mjs`
- `node js/test/stage112_mcts_proof_metric_bias_combo_benchmark_smoke.mjs`

추가로 문서 인벤토리 생성기도 다시 실행했다.

- `node tools/docs/generate-report-inventory.mjs`

## 산출물

- `benchmarks/stage112_mcts_proof_priority_root_off_pilot_12empties_120ms_24seeds_20260411_v1.json`
- `benchmarks/stage112_mcts_proof_priority_root_off_pilot_12empties_280ms_24seeds_20260411_v1.json`
- `benchmarks/stage112_mcts_proof_metric_bias_combo_12empties_120ms_24seeds_20260411_v1.json`
- `benchmarks/stage112_mcts_proof_metric_bias_combo_12empties_280ms_24seeds_20260411_v1.json`
- `benchmarks/stage112_mcts_proof_metric_bias_combo_12empties_120ms_holdout24_20260411_v1.json`
- `benchmarks/stage112_mcts_proof_metric_bias_combo_12empties_280ms_holdout24_20260411_v1.json`

## 다음 단계 후보

가장 자연스러운 다음 후보는 다음 둘 중 하나다.

1. **time-budget-conditioned late bias package**
   - 예: `<= 150ms`에서는 `legacy-root + rank`, `>= 200ms`에서는 `per-player + pnmax`
   - 이번 Stage 112 결과가 정확히 그 패턴을 시사한다.
2. **root-maturity gate**
   - proof-priority가 root-driven이라는 Stage 112 pilot 결과를 반영해,
     root proof frontier가 어느 정도 성숙한 뒤에만 `pnmax` 또는 `per-player + pnmax`로 전환하는 방식
