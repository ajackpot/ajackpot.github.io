# Stage 104 — MCTS proof-priority ↔ exact continuation bridge readjustment

## 요약

이번 단계에서는 Stage 103의 proof-priority frontier bias와 Stage 101의 root exact continuation 사이의 **접속부를 다시 조정**했다.

결론은 **채택**이다.

이번 단계에서 채택한 것은 세 가지다.

- `mctsExactContinuationExtraEmpties` 기본값을 `2 → 3`으로 확장
- continuation 창 안에서는 proof-priority를 자동으로 끄는 **runtime handoff** 추가
- handoff 상태를 proof telemetry / UI summary / benchmark에서 확인할 수 있도록 계측 확장

핵심 해석은 이렇다.

- Stage 103의 proof-priority는 실제 효용이 주로 `12 empties` 근방에서만 잡혔다.
- Stage 101의 exact continuation은 `10 empties` 이하에서는 충분히 강했다.
- 그래서 기본값 기준 `11 empties`가 사실상 **WLD proof는 얻지만 exact continuation은 아직 안 붙는 비어 있는 절편**처럼 남아 있었다.
- 이번 단계는 그 절편을 메우는 것이 목표였다.

## 조사 결론

현재 코드 기준 late lane의 연결은 다음과 같았다.

1. `mcts-hybrid`가 late subtree에서 proof-priority bias로 WLD proof 순서를 앞당긴다.
2. root가 WLD proof를 얻고 continuation 창 안에 들어온 경우에만 exact root continuation이 실행된다.
3. 그러나 기본 continuation 추가 창이 `+2`였기 때문에 `exact=8` 환경에서는 `10 empties`까지만 continuation이 붙었다.
4. 반면 Stage 103의 proof-priority 기본 창은 `12 empties`였다.

즉 기본값 조합은 사실상 이렇게 동작했다.

- `12 empties`: proof-priority lane
- `11 empties`: proof-priority는 있지만 continuation은 아직 없음
- `10 empties 이하`: continuation lane

실제 quick probe에서도 이 해석이 재현됐다.

- `11 empties`에서는 baseline이 WLD proof에 머무르는 자리가 계속 나왔고,
- `+3 continuation`을 켜면 같은 예산 안에서 exact result로 올라오는 경우가 많았다.
- 반대로 continuation 창 안에서 proof-priority를 유지해도 exact-best / exact-result는 거의 늘지 않았고, 오히려 약간의 런타임만 더 쓰는 쪽이 많았다.

## 이번 단계에서 실제로 구현한 것

### 1. `js/ai/search-engine.js`

#### A. continuation 기본창 확장

기본 continuation 창을 다음처럼 변경했다.

- 이전: `mctsExactContinuationExtraEmpties = 2`
- 이후: `mctsExactContinuationExtraEmpties = 3`

즉 `exactEndgameEmpties = 8` 기본 환경에서는 root exact continuation이 이제 `11 empties`까지 들어간다.

#### B. root runtime handoff 추가

`resolveMctsRootRuntimeConfig()`를 추가해, root가 continuation 창 안에 들어오면 MCTS root search에서 proof-priority를 자동으로 끄도록 바꿨다.

기본 handoff 규칙:

- `mctsProofPriorityContinuationHandoffEnabled = true`
- root empties가 continuation 창 안이면
  - `mctsProofPriorityEnabled = false`
  - `mctsProofPriorityScale = 0`
  - `mctsProofPriorityMaxEmpties = 0`

이렇게 하면 continuation이 붙을 수 있는 root에서는 proof bias로 WLD proof를 더 미세하게 정렬하기보다, **남은 시간을 exact continuation에 더 집중**하게 된다.

#### C. telemetry 확장

MCTS 결과에 다음 runtime 정보를 붙였다.

- `mctsProofPriorityRuntimeEnabled`
- `mctsProofPriorityRuntimeScale`
- `mctsProofPriorityRuntimeMaxEmpties`
- `mctsProofPrioritySuppressedByContinuationWindow`

`createMctsProofTelemetry()`도 이 runtime 값을 우선 읽도록 바꿨다.
그래서 설정상 proof-priority가 기본 켜짐이어도, 실제 root runtime에서 handoff로 꺼진 경우 UI/telemetry가 그 상태를 그대로 반영한다.

### 2. `js/ui/formatters.js`

proof summary에 handoff note를 추가했다.

예:

- `continuation 적용, proof→continuation handoff`

즉 사용자는 이제 “proof-priority가 원래 켜져 있는 모드지만, 현재 root는 continuation이 우선이라 proof bias를 runtime에서 넘겨줬다”는 사실을 요약문에서 바로 볼 수 있다.

### 3. 새 벤치/스모크 추가

- `tools/engine-match/benchmark-mcts-continuation-bridge.mjs`
- `js/test/stage104_mcts_continuation_bridge_runtime_smoke.mjs`
- `js/test/stage104_mcts_continuation_bridge_benchmark_smoke.mjs`

이 벤치는 다음 두 상태를 exact reference에 대해 직접 비교한다.

- baseline emulation
  - continuation `+2`
  - proof-priority handoff **끔**
- candidate
  - continuation `+3`
  - proof-priority handoff **켬**

즉 “Stage 103 default late bridge”와 “Stage 104 bridge-adjusted runtime”을 같은 묶음에서 바로 비교한다.

## 벤치 설계

기본 screening은 다음처럼 구성했다.

- algorithm: `mcts-hybrid`
- exact threshold: `8`
- solver WLD: `+2`
- proof-priority scale: `0.15`
- proof-priority max empties: `12`
- empties: `9,10,11,12`
- seeds: `11,17,21,31,41,53,71,89`
- reference: classic exact (`exact=20`)
- budgets: `120ms`, `280ms`

추가로 `11 empties`, `80ms` spot-check를 따로 돌렸다.
이건 “실사용 예산보다 낮은 custom budget에서도 +3 continuation이 과도한지”를 확인하려는 용도였다.

## 벤치 결과

### A. 120ms main screening (`9~12 empties`, 32 positions)

baseline emulation:

- exact-best hit `24/32 = 75.0%`
- exact-result `16/32 = 50.0%`
- WLD agreement `32/32 = 100%`
- proven `32/32 = 100%`
- continuation applied `13/32 = 40.625%`
- average score loss `21875`

candidate:

- exact-best hit `28/32 = 87.5%`
- exact-result `24/32 = 75.0%`
- WLD agreement `32/32 = 100%`
- proven `32/32 = 100%`
- continuation applied `21/32 = 65.625%`
- average score loss `10000`

핵심 개선은 전부 `11 empties` bucket에서 발생했다.

`11 empties`:

- baseline exact-best `4/8 = 50%`
- candidate exact-best `8/8 = 100%`
- baseline exact-result `0/8 = 0%`
- candidate exact-result `8/8 = 100%`
- baseline continuation applied `0/8 = 0%`
- candidate continuation applied `8/8 = 100%`
- average score loss `47500 -> 0`
- average elapsed `18.625ms -> 56.125ms`

반대로 `9`와 `10 empties`는 정확도 변화 없이, 평균 elapsed가 약간 내려가거나 거의 그대로였다.
즉 handoff는 continuation 창 안에서 **정확도 손실 없이 proof-priority 비용을 줄이는 방향**으로만 작동했다.

### B. 280ms main screening (`9~12 empties`, 32 positions)

topline은 120ms와 같은 패턴이었다.

baseline emulation:

- exact-best hit `24/32 = 75.0%`
- exact-result `16/32 = 50.0%`
- WLD agreement `32/32 = 100%`
- proven `32/32 = 100%`
- continuation applied `13/32 = 40.625%`
- average score loss `21875`

candidate:

- exact-best hit `28/32 = 87.5%`
- exact-result `24/32 = 75.0%`
- WLD agreement `32/32 = 100%`
- proven `32/32 = 100%`
- continuation applied `21/32 = 65.625%`
- average score loss `10000`

역시 `11 empties`가 전부였다.

`11 empties`:

- baseline exact-best `4/8 = 50%`
- candidate exact-best `8/8 = 100%`
- baseline exact-result `0/8 = 0%`
- candidate exact-result `8/8 = 100%`
- baseline continuation applied `0/8 = 0%`
- candidate continuation applied `8/8 = 100%`
- average score loss `47500 -> 0`
- average elapsed `21.125ms -> 58.375ms`

중요한 점은 280ms에서도 `12 empties`는 그대로라는 것이다.

`12 empties`:

- baseline exact-best `4/8 = 50%`
- candidate exact-best `4/8 = 50%`
- exact-result 둘 다 `0/8`

즉 이번 조정은 **12 empties proof-priority lane을 대체한 것**이 아니라,
**그 다음 칸인 11 empties부터 continuation lane으로 더 일찍 넘겨주는 것**에 가깝다.

### C. 80ms spot-check (`11 empties`, 8 positions)

이 예산은 기본 사용자 노출 구간보다 낮지만, 연결부가 지나치게 무거운지 확인하기 위해 따로 봤다.

baseline emulation:

- exact-best `4/8 = 50%`
- exact-result `0/8 = 0%`
- continuation applied `0/8 = 0%`
- average score loss `47500`

candidate:

- exact-best `7/8 = 87.5%`
- exact-result `7/8 = 87.5%`
- continuation applied `7/8 = 87.5%`
- average score loss `10000`
- average elapsed `58.875ms`

즉 `+3 continuation`은 80ms에서도 완전히 무너지지 않았고, 적어도 `11 empties`에서는 여전히 강한 개선 방향을 보였다.

## +4 continuation exploratory check

`mctsExactContinuationExtraEmpties = 4`도 짧게 확인했다.

`12 empties`, 120ms:

- exact-best `50% -> 62.5%`
- exact-result `0% -> 25%`
- average elapsed `72.75ms -> 117.375ms`

`12 empties`, 280ms:

- exact-best `50% -> 75%`
- exact-result `0% -> 62.5%`
- average elapsed `105.75ms -> 212ms`

즉 `+4`는 효과가 전혀 없는 건 아니었지만, 120ms와 280ms 사이 편차가 크고 비용 상승도 상당했다.
이번 단계 기본값은 **11 empties를 안정적으로 메우는 +3**까지만 채택하는 편이 더 안전했다.

## 해석

이번 단계의 핵심은 “proof-priority를 더 강하게 만들었다”가 아니다.
정확한 해석은 다음에 가깝다.

- `12 empties`: proof-priority lane이 여전히 담당
- `11 empties`: Stage 104부터 continuation lane이 담당
- `10 empties 이하`: continuation lane 유지

그리고 continuation 창 안에서는 proof-priority를 자동으로 끄므로, 연결이 이렇게 정리된다.

- **proof-priority는 continuation 바깥 1칸짜리 bridge lane**
- **continuation은 그 다음 칸부터 exact 승격 lane**

즉 proof-priority와 continuation이 서로 겹쳐서 같은 root에서 중복으로 시간을 쓰기보다,
**proof-ordering lane → exact continuation lane**으로 역할이 명확하게 분리되었다.

## 채택 결정

채택한다.

채택 기본값은 다음과 같다.

- `mctsExactContinuationEnabled = true`
- `mctsExactContinuationExtraEmpties = 3`
- `mctsProofPriorityContinuationHandoffEnabled = true`
- `mctsProofPriorityScale = 0.15` 유지
- `mctsProofPriorityMaxEmpties = exact + solver + 2` 유지

채택 이유는 세 가지다.

1. `11 empties`에서 baseline의 빈 절편을 사실상 없앴다.
2. 전체 exact-best / exact-result를 올리면서 WLD agreement와 proven rate는 그대로 유지했다.
3. continuation 창 안에서는 proof-priority를 자동으로 넘겨 줘서, 연결부 의미가 runtime/telemetry/UI에서 일관되게 보인다.

## 이번 단계에서 채택하지 않은 것

- `mctsExactContinuationExtraEmpties = 4` 기본화
- continuation 창 안에서 proof-priority와 exact continuation을 동시에 강하게 유지하는 중첩 lane
- draw-aware generalized proof metric / per-player generalized proof bookkeeping

이들은 다음 단계 또는 그 다음 단계 후보로 남긴다.
이번 단계는 어디까지나 **proof-priority와 exact continuation의 접속부 정리**에 집중했다.

## 회귀 확인

다음을 다시 실행해 통과를 확인했다.

- `node js/test/core-smoke.mjs`
- `node js/test/stage100_mcts_solver_runtime_smoke.mjs`
- `node js/test/stage100_mcts_solver_late_accuracy_smoke.mjs`
- `node js/test/stage101_mcts_exact_continuation_runtime_smoke.mjs`
- `node js/test/stage101_mcts_exact_continuation_benchmark_smoke.mjs`
- `node js/test/stage102_mcts_proof_telemetry_runtime_smoke.mjs`
- `node js/test/stage103_mcts_proof_priority_runtime_smoke.mjs`
- `node js/test/stage103_mcts_proof_priority_benchmark_smoke.mjs`
- `node js/test/stage104_mcts_continuation_bridge_runtime_smoke.mjs`
- `node js/test/stage104_mcts_continuation_bridge_benchmark_smoke.mjs`

## 산출물

- `benchmarks/stage104_mcts_continuation_bridge_120ms_20260410.json`
- `benchmarks/stage104_mcts_continuation_bridge_280ms_20260410.json`
- `benchmarks/stage104_mcts_continuation_bridge_11empties_80ms_20260410.json`
- `benchmarks/stage104_mcts_continuation_bridge_12empties_candidate4_120ms_20260410.json`
- `benchmarks/stage104_mcts_continuation_bridge_12empties_candidate4_280ms_20260410.json`
