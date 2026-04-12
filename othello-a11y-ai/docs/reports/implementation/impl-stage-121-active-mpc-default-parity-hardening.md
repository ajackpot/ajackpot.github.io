# Stage 121 - active MPC default parity hardening

## 요약

Step 3의 첫 후보였던 **active MPC default parity hardening**을 채택했습니다.

이번 단계의 목적은 strength 실험을 하나 더 얹는 것이 아니라,
이미 worker/UI 기본 경로에서 활성화되어 있던 **active MPC profile의 기본 의미론을 direct `SearchEngine` / tooling 경로까지 정렬**하는 것이었습니다.

핵심 결론은 다음과 같습니다.

1. `SearchEngine` direct constructor 기본 경로도 이제 installed active MPC profile을 기본 상속합니다.
2. `js/test/benchmark-helpers.mjs`는 별도 override가 없으면 실제 런타임과 같은 active MPC semantics를 반영합니다.
3. `mpcProfile: null`은 여전히 **명시적 비활성화 의도**로 취급되며, follow-up override에서도 유지되도록 보강했습니다.
4. representative batch에서는 best move parity가 유지됐고, 일부 trigger case에서는 active MPC가 node/time을 줄였습니다.
5. 다만 한 trigger case에서 non-exact score divergence가 남아 있으므로, 이 Stage는 **runtime semantics / tooling parity 채택**이지 새 strength claim은 아닙니다.

## 배경

Stage 120 전수조사에서 가장 우선순위가 높게 남은 후보는 worker / UI / direct-engine / tooling boundary의 MPC 기본 의미론 정렬이었습니다.

당시 관찰은 단순했습니다.

- worker 경로: active MPC profile 자동 연결
- UI fallback 경로: active MPC profile 자동 연결
- direct `new SearchEngine()` 기본 constructor: `mpcProfile = null`
- `js/test/benchmark-helpers.mjs`: 별도 override가 없으면 결과 summary의 `mpcProfileName = null`

즉 **같은 classic search라도 호출 경로에 따라 기본 MPC 의미론이 달랐고**, 이 차이가 벤치 해석과 regression baseline에 혼선을 만들고 있었습니다.

## 실제 코드 변경

### 1. `SearchEngine` 기본 MPC fallback 정렬

`js/ai/search-engine.js`에서 `resolveOptionsFromInput()`에 MPC fallback 인자를 추가하고,
constructor 기본 경로가 `ACTIVE_MPC_PROFILE`을 상속하도록 바꿨습니다.

이제 다음 경로들이 동일한 기본 의미론을 가집니다.

- direct `new SearchEngine()`
- direct `new SearchEngine(customOptions)`
- worker 경로
- UI main-thread fallback
- `benchmark-helpers` 기반 회귀/벤치

### 2. explicit `mpcProfile: null` preserve 보강

direct constructor와 helper가 active MPC 기본값을 상속하도록만 바꾸면,
기존에 `mpcProfile: null`로 명시적으로 비활성화한 엔진이 follow-up override에서 다시 active profile로 돌아갈 위험이 있습니다.

이를 피하기 위해 `updateOptions()`에서는 **현재 엔진이 이미 들고 있는 `mpcProfile` 값**을 fallback으로 넘기도록 정리했습니다.

즉 다음 의미론을 유지합니다.

- 처음부터 override가 없으면 active MPC 기본 상속
- `mpcProfile: null`을 한 번 명시하면, 이후 override에서 `mpcProfile`을 생략해도 null 유지
- 다시 active MPC로 돌리고 싶다면 explicit profile을 다시 넘겨야 함

### 3. 새 smoke / benchmark 추가

추가한 파일:

- `js/test/stage121_active_mpc_default_parity_smoke.mjs`
- `tools/benchmark/run-stage121-active-mpc-default-parity-benchmark.mjs`
- `benchmarks/stage121_active_mpc_default_parity_benchmark_20260412.json`

## 검증

### smoke / regression

실행한 회귀는 다음과 같습니다.

```bash
node js/test/stage121_active_mpc_default_parity_smoke.mjs
node js/test/core-smoke.mjs
node js/test/stage71_mpc_runtime_smoke.mjs
node js/test/stage72_mpc_lowcut_smoke.mjs
node js/test/stage76_trineutron_match_suite_smoke.mjs
```

모두 통과했습니다.

특히 새 Stage 121 smoke는 다음을 직접 확인합니다.

- bare `SearchEngine()` default가 active MPC profile을 상속하는지
- representative MPC-trigger 상태에서 direct path가 실제로 probe를 수행하는지
- explicit `mpcProfile: null`이 초기 search와 follow-up override 모두에서 유지되는지
- `benchmark-helpers` summary가 active/default 의미론을 반영하는지
- `EngineClient` fallback과 direct `SearchEngine`이 같은 기본 의미론을 갖는지

### representative batch benchmark

재현 스크립트:

```bash
node tools/benchmark/run-stage121-active-mpc-default-parity-benchmark.mjs
```

결과 파일:

- `benchmarks/stage121_active_mpc_default_parity_benchmark_20260412.json`

요약:

- case 수: `12`
- best move parity: `12 / 12`
- same score: `11 / 12`
- active MPC trigger case 수: `3`
- active MPC가 node를 줄인 case 수: `3`
- active MPC가 node를 늘린 case 수: `2`
- average node delta (`active - null`): `-769.33`
- average elapsed delta (`active - null`): `-60.42ms`

대표 trigger 상태(`empties=24`, `seed=3`)에서는 다음이 확인됐습니다.

- default direct path: active MPC profile 사용, `mpcProbes = 29`, `mpcHighCutoffs = 26`
- explicit null path: `mpcProbes = 0`
- `EngineClient` fallback: direct path와 같은 best move / score / active profile 이름 보고
- helper summary: default에서 active profile 이름 보고, explicit null에서 null 보고

## score divergence에 대한 해석

12-case batch 중 1개 trigger case에서는 best move는 같지만 non-exact score가 달랐습니다.

이는 active MPC가 selective pruning을 포함한 **depth-limited runtime lane**이라는 점과 일관적입니다.
이번 단계의 목표는 exactness claim이 아니라,
이미 채택되어 있던 active MPC runtime lane을 **호출 경로별로 같은 기본 의미론으로 정렬**하는 것이므로,
이 차이는 채택을 막는 결격 사유로 보지 않았습니다.

다만 이 사실은 중요하므로,
이번 Stage의 결론은 “active MPC default parity hardening 채택”이지
“active MPC default가 항상 더 정확하거나 더 강하다”는 식으로 과장하지 않습니다.

## 채택 판정

**채택**합니다.

채택 이유:

1. 실제 앱 런타임(worker/UI)과 direct/tooling 경로의 의미론 차이를 제거합니다.
2. explicit null opt-out을 보존해 기존 MPC 비활성화 regression도 깨지지 않습니다.
3. representative batch에서 best move parity가 유지됐고, trigger case에서는 평균 node/time도 나쁘지 않았습니다.
4. 변화 범위가 작고, 회귀 스모크가 이미 통과했습니다.

## 남은 후보

Step 3 큐에서 남은 다음 후보는 여전히 다음 둘입니다.

1. `allocation-light core move path`
2. `opening default revalidation`

이번 Stage는 그중 첫 번째 후보를 만지기 전에,
현재 런타임/도구 경계의 의미론을 먼저 닫아 두는 정리 단계로 보는 편이 맞습니다.
