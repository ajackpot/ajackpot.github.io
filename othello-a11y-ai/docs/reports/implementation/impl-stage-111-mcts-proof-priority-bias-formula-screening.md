# Stage 111 — MCTS proof-priority bias formula screening

## 요약

이번 단계에서는 Stage 110의 기본 late lane을 그대로 유지한 채, proof-priority frontier bonus 공식을 다시 점검했다.
기존 Stage 103 기본값은 **frontier rank를 bonus로 바꾸는 rank-normalized bias**였고,
이번에는 여기에 더해 값 기반 공식인 **`pnmax`**와 **`pnsum`**을 실험적으로 붙여 실제로 더 나은지 비교했다.

최종 판정은 다음과 같다.

- **채택한 것**
  - `mctsProofPriorityBiasMode` experimental option 추가 (`rank`, `pnmax`, `pnsum`)
  - bias formula를 telemetry / UI summary / benchmark JSON에 노출
  - Stage 110 late lane 기준 formal bias-mode benchmark와 Stage 111 smoke 추가
- **기본값으로 채택하지 않은 것**
  - `pnmax`의 전역 기본 승격
  - `pnsum`의 전역 기본 승격
- **현재 기본값 변화**
  - **없음**
  - 기본 late lane은 계속 `mctsProofPriorityBiasMode = rank`를 사용한다.

즉 이번 Stage 111은 **새 bias formula 표면을 추가하고, formal 재검증까지 끝냈지만 기본값은 그대로 둔 screening stage**로 보는 것이 맞다.

## 배경

Stage 103에서 채택한 proof-priority는 late solved-subtree lane에서 child frontier를 정렬할 때,
proof/disproof number 자체를 직접 쓰지 않고 **root-relative frontier rank**를 normalized bonus로 바꾸는 방식이었다.
이 방식은 보수적이고 안정적이지만,
실제 proof value의 차이를 버리고 ranking 비용도 따로 든다는 약점이 있다.

이번 단계에서는 그 지점을 직접 건드렸다.
핵심 질문은 다음 하나였다.

- 현재 Stage 110 late lane(= adaptive post-proof exact continuation까지 포함된 기본 late lane) 위에서,
  기존 `rank` 대신 `pnmax` 또는 `pnsum`을 쓰면 exact-best / proof completion / score-loss가 더 좋아지는가?

## 실제 구현

### 1. `js/ai/mcts.js`

proof-priority ranking helper를 확장해 bias formula를 선택할 수 있게 했다.

- 새 내부 기본값: `DEFAULT_MCTS_PROOF_PRIORITY_BIAS_MODE = 'rank'`
- 새 formula resolver: `rank / pnmax / pnsum`
- `buildProofPriorityRanking()`이 이제
  - frontier rank 기반 normalized bonus (`rank`)
  - finite proof-number min/max 기반 bonus (`pnmax`)
  - finite proof-number sum 기반 bonus (`pnsum`)
  을 모두 계산할 수 있다.
- analyzed move / root result에도 bias mode를 남긴다.
  - `pnRootBiasMode`
  - `mctsProofPriorityBiasMode`

기존 selection 경로는 그대로 두고, **bonus 계산식만 바꿔 끼울 수 있는 형태**로 제한했다.

### 2. `js/ai/search-engine.js`

런타임 옵션 표면과 telemetry를 확장했다.

- 새 옵션 파싱
  - `mctsProofPriorityBiasMode`
- `mctsProofTelemetry`에 bias mode 추가
  - `proofPriorityBiasMode`

즉 search result만 보면 현재 run이 `rank`인지 `pnmax`인지 `pnsum`인지 바로 구분할 수 있다.

### 3. `js/ui/formatters.js`

설정 패널과 proof summary 문장에 bias formula를 함께 표시하도록 정리했다.

예:

- `proof-priority x0.15 (legacy proof-rank)`
- `proof-priority x0.15 (legacy proof · pnmax)`
- `proof-priority x0.15 (per-player 흑 · pnsum)`

즉 이번부터는 metric mode와 bias formula를 사람이 바로 같이 읽을 수 있다.

### 4. 새 벤치 / 새 smoke

추가한 파일은 다음과 같다.

- `tools/engine-match/benchmark-mcts-proof-priority-bias-mode.mjs`
- `js/test/stage111_mcts_proof_priority_bias_mode_runtime_smoke.mjs`
- `js/test/stage111_mcts_proof_priority_bias_mode_benchmark_smoke.mjs`

## 벤치 설계

이번 비교는 Stage 110 late lane 위에서만 진행했다.
즉 다음 설정을 baseline으로 고정했다.

- algorithm: `mcts-hybrid`
- solver: on (`mctsSolverWldEmpties = 2`)
- exact continuation: on (`+3`)
- adaptive continuation: on
  - `loss-only`
  - extra empties `+1`
  - legal-move cap `0`
- proof metric mode: `legacy-root`
- proof-priority scale: `0.15`
- proof-priority max empties: `12`

비교 대상은 다음 세 가지였다.

- `rank` (현재 기본값)
- `pnmax`
- `pnsum`

평가 위치는 모두 `12 empties`였고,
- main 24 seeds
- holdout 24 seeds
로 나누어 `120ms`, `280ms`를 각각 재검증했다.

## 벤치 결과

### A. main 24 seeds

#### 120ms

- `rank`
  - exact-best `16/24 = 66.7%`
  - proven `16/24 = 66.7%`
  - exact-result `3/24 = 12.5%`
  - average score-loss `19,167`
- `pnmax`
  - exact-best `16/24 = 66.7%`
  - proven `17/24 = 70.8%`
  - exact-result `4/24 = 16.7%`
  - average score-loss `21,667`
- `pnsum`
  - exact-best `15/24 = 62.5%`
  - proven `16/24 = 66.7%`
  - exact-result `4/24 = 16.7%`
  - average score-loss `23,333`

해석하면, 120ms main에서는 `pnmax`가 proof completion은 조금 늘렸지만,
기본 `rank`보다 exact-best나 score-loss에서 뚜렷한 우세는 없었다.

#### 280ms

- `rank`
  - exact-best `18/24 = 75.0%`
  - proven `20/24 = 83.3%`
  - exact-result `9/24 = 37.5%`
  - average score-loss `12,500`
- `pnmax`
  - exact-best `19/24 = 79.2%`
  - proven `21/24 = 87.5%`
  - exact-result `11/24 = 45.8%`
  - average score-loss `11,667`
- `pnsum`
  - exact-best `18/24 = 75.0%`
  - proven `20/24 = 83.3%`
  - exact-result `9/24 = 37.5%`
  - average score-loss `12,500`

280ms main에서는 `pnmax`가 분명히 가장 좋아 보였다.

### B. holdout 24 seeds

#### 120ms

- `rank`
  - exact-best `15/24 = 62.5%`
  - proven `15/24 = 62.5%`
  - exact-result `1/24 = 4.2%`
  - average score-loss `27,083`
- `pnmax`
  - exact-best `15/24 = 62.5%`
  - proven `15/24 = 62.5%`
  - exact-result `2/24 = 8.3%`
  - average score-loss `27,083`
- `pnsum`
  - exact-best `14/24 = 58.3%`
  - proven `15/24 = 62.5%`
  - exact-result `2/24 = 8.3%`
  - average score-loss `23,750`

holdout 120ms에서는 `rank`와 `pnmax`가 사실상 동률이었다.

#### 280ms

- `rank`
  - exact-best `19/24 = 79.2%`
  - proven `24/24 = 100%`
  - exact-result `10/24 = 41.7%`
  - average score-loss `9,167`
- `pnmax`
  - exact-best `19/24 = 79.2%`
  - proven `24/24 = 100%`
  - exact-result `11/24 = 45.8%`
  - average score-loss `9,167`
- `pnsum`
  - exact-best `19/24 = 79.2%`
  - proven `22/24 = 91.7%`
  - exact-result `11/24 = 45.8%`
  - average score-loss `8,333`

holdout 280ms에서도 `rank`와 `pnmax`는 거의 동률이었고,
`pnsum`은 score-loss는 좋아 보였지만 proven이 오히려 낮았다.

### C. main + holdout 48 seeds 합산

#### 120ms combined

- `rank`
  - exact-best `31/48 = 64.6%`
  - proven `31/48 = 64.6%`
  - exact-result `4/48 = 8.3%`
  - average score-loss `23,125`
- `pnmax`
  - exact-best `31/48 = 64.6%`
  - proven `32/48 = 66.7%`
  - exact-result `6/48 = 12.5%`
  - average score-loss `24,375`
- `pnsum`
  - exact-best `29/48 = 60.4%`
  - proven `31/48 = 64.6%`
  - exact-result `6/48 = 12.5%`
  - average score-loss `23,542`

즉 120ms 전체에서는 `pnmax`가 proof completion 쪽은 소폭 좋지만,
정확도와 score-loss를 같이 놓고 보면 기본 `rank`를 명확히 넘는다고 보기 어려웠다.

#### 280ms combined

- `rank`
  - exact-best `37/48 = 77.1%`
  - proven `44/48 = 91.7%`
  - exact-result `19/48 = 39.6%`
  - average score-loss `10,833`
- `pnmax`
  - exact-best `38/48 = 79.2%`
  - proven `45/48 = 93.8%`
  - exact-result `22/48 = 45.8%`
  - average score-loss `10,417`
- `pnsum`
  - exact-best `37/48 = 77.1%`
  - proven `42/48 = 87.5%`
  - exact-result `20/48 = 41.7%`
  - average score-loss `10,417`

280ms 전체에서는 `pnmax`가 가장 낫다.
다만 차이는 여전히 **작고 한쪽 budget(280ms)에 집중된 개선**이었다.

### D. PNMax scale retune check

`pnmax`가 main 280ms에서 좋아 보였기 때문에, scale도 약하게 다시 확인했다.

main 24 seeds 기준:

- `pnmax x0.10`, 120ms
  - exact-best `16/24`
  - average score-loss `15,833`
- `pnmax x0.12`, 120ms
  - exact-best `16/24`
  - average score-loss `25,000`

겉보기에는 `x0.10`이 main 120ms에서 좋아 보였지만,
holdout 24 seeds로 다시 돌리면 `pnmax x0.10`, 120ms는

- exact-best `12/24 = 50.0%`
- average score-loss `30,417`

로 오히려 크게 흔들렸다.

즉 **bias formula를 바꾸면 scale retune으로 해결될 것 같아 보여도, holdout에서 안정적으로 재현되지는 않았다.**

## 판정

### 채택한 것

- experimental runtime surface
  - `mctsProofPriorityBiasMode = rank | pnmax | pnsum`
- bias-aware telemetry / summary / benchmark surface
- Stage 111 runtime / benchmark smoke

### 기본값으로 채택하지 않은 것

- `mctsProofPriorityBiasMode = pnmax`
- `mctsProofPriorityBiasMode = pnsum`

### 이유

1. `pnmax`는 **280ms에서는 분명히 좋아 보였지만**, 120ms까지 포함하면 `rank`를 안정적으로 넘지 못했다.
2. `pnsum`은 score-loss 일부 개선 신호가 있었지만, exact-best / proven을 함께 보면 훨씬 불안정했다.
3. `pnmax` scale retune(`0.10`, `0.12`)도 holdout에서 robust하게 재현되지 않았다.
4. 현재 기본 late lane은 이미 Stage 110 adaptive continuation까지 포함되어 있기 때문에,
   여기서 기본 bias formula까지 바꾸려면 **120ms/280ms를 같이 놓고 더 일관된 우세**가 필요했다.

따라서 Stage 111의 결론은 다음 한 줄로 요약된다.

> **값 기반 proof-priority bias는 실험 표면으로는 남길 가치가 있지만, 현재 기본 late lane의 전역 기본값을 `rank`에서 바꿀 만큼 robust하지는 않았다.**

## 회귀 확인

다음을 다시 실행해 통과했다.

- `node js/test/stage111_mcts_proof_priority_bias_mode_runtime_smoke.mjs`
- `node js/test/stage111_mcts_proof_priority_bias_mode_benchmark_smoke.mjs`
- `node js/test/stage110_mcts_adaptive_continuation_runtime_smoke.mjs`
- `node js/test/stage110_mcts_adaptive_continuation_benchmark_smoke.mjs`
- `node js/test/stage105_mcts_generalized_proof_metric_runtime_smoke.mjs`
- `node js/test/stage103_mcts_proof_priority_runtime_smoke.mjs`
- `node js/test/stage109_report_inventory_smoke.mjs`

## 산출물

- `benchmarks/stage111_mcts_proof_priority_bias_mode_12empties_120ms_24seeds_20260411_v1.json`
- `benchmarks/stage111_mcts_proof_priority_bias_mode_12empties_280ms_24seeds_20260411_v1.json`
- `benchmarks/stage111_mcts_proof_priority_bias_mode_12empties_120ms_holdout24_20260411_v1.json`
- `benchmarks/stage111_mcts_proof_priority_bias_mode_12empties_280ms_holdout24_20260411_v1.json`

## 다음 단계 후보

가장 자연스러운 다음 후보는 다음 둘 중 하나다.

1. **`pnmax`를 deeper-only / solved-near frontier에만 거는 gate**를 붙여, 120ms의 안정성을 깨지 않고 280ms 이득만 남길 수 있는지 보는 것
2. **Stage 105의 per-player metric과 Stage 111의 bias formula를 조합**해, draw-capable late bucket에서 generalized metric + value-based bias가 같이 먹히는지 다시 보는 것
