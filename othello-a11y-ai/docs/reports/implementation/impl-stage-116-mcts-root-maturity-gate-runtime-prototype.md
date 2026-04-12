# Stage 116 - MCTS root-maturity gate runtime prototype

## 배경

Stage 115에서는 fixed-iteration screening 안에서

- baseline `legacy-root + rank`
- target `per-player + pnmax`

를 비교하고, baseline root maturity telemetry를 gate로 써서
**target late lane이 정말 필요한 지점을 post-hoc으로 골라내는 실험**을 진행했다.

그 결과 `best finite metric <= 1 or solved child` gate가

- activation `16/96`만으로
- target과 scenario-by-scenario로 동일한 결과를 내

가장 유력한 runtime 후보로 좁혀졌다.

하지만 Stage 115는 어디까지나 **post-hoc composite**였다.
즉 baseline을 끝까지 실행한 뒤 telemetry를 보고 target 결과를 택한 것이므로,
실제 runtime search 도중 selection policy를 바꾸는 것과는 다르다.

따라서 이번 Stage 116의 질문은 하나였다.

**같은 gate를 root proof-priority ranking 안에 직접 넣어도,
fixed-iteration에서는 target을 재현하고 time-budget에서도 이득을 남길 수 있는가?**

## 이번 단계 목표

- root proof-priority ranking에서만 동작하는 **runtime root-maturity gate prototype**을 넣는다.
- trigger는 Stage 115 strongest gate였던
  - `best-metric-lte-1-or-solved-child`
  를 기본 후보로 사용한다.
- gate가 켜질 때만
  - `legacy-root + rank`
  - → `per-player + pnmax`
  로 동적 전환한다.
- 그리고 이를
  - fixed-iteration
  - time-budget(`200/280ms`)
  둘 다에서 다시 판정한다.

## 구현 내용

### 1. runtime 옵션 표면 추가

`js/ai/search-engine.js`, `js/ai/mcts.js`에 다음 옵션을 추가했다.

- `mctsProofPriorityRootMaturityGateEnabled`
- `mctsProofPriorityRootMaturityGateMode`
- `mctsProofPriorityRootMaturityGateMetricMode`
- `mctsProofPriorityRootMaturityGateBiasMode`

기본값은 다음과 같다.

- enabled: `false`
- mode: `best-metric-lte-1-or-solved-child`
- target metric: `per-player`
- target bias: `pnmax`

즉 prototype 자체는 들어가지만,
**기본 late lane은 여전히 Stage 110/111/112 기본값(`legacy-root + rank`)을 유지**한다.

### 2. root proof-priority ranking 내부 gate 평가

`js/ai/mcts.js`의 root proof-priority ranking 경로에서,
현재 root proof frontier 상태를 바탕으로 gate를 평가하는 helper를 추가했다.

이번 prototype이 계산하는 root-maturity signal은 다음이다.

- solved child coverage
- solved child count
- finite proof metric count
- distinct finite proof metric count
- best / second finite metric
- root proof/disproof number

그리고 Stage 115 strongest gate에 맞춰
다음 조건이면 sticky activation을 수행한다.

- `best finite metric <= 1`
- 또는 `solved child exists`

한 번 활성되면 root node의 gate state에 기록해,
이후 같은 search 안에서는 target late lane을 계속 사용한다.

### 3. telemetry / UI summary 확장

새 runtime gate 상태가 결과에 드러나도록 다음 telemetry를 추가했다.

- gate enabled / mode / target metric / target bias
- gate activated 여부
- activation count / iteration / reason
- final eligibility snapshot
- solved coverage / solved move count
- best finite metric / second finite metric / distinct finite metric count
- gate checks / activations stats

`js/ui/formatters.js`에도 요약 문장을 추가해,
proof summary와 resolved options line에서 gate 상태를 바로 볼 수 있게 했다.

### 4. 전용 benchmark 도구 추가

새 도구:

- `tools/engine-match/benchmark-mcts-root-maturity-gate-runtime.mjs`

이 도구는 두 모드를 지원한다.

- `--mode fixed-iterations`
- `--mode time-budget`

항상 세 변형을 한 번에 비교한다.

- `base`: `legacy-root + rank`
- `target`: `per-player + pnmax`
- `runtime-gate`: root-maturity gate runtime prototype

### 5. 새 smoke 추가

- `js/test/stage116_mcts_root_maturity_gate_runtime_smoke.mjs`
- `js/test/stage116_mcts_root_maturity_gate_runtime_benchmark_smoke.mjs`

runtime smoke는 gate activation과 telemetry/UI summary를 직접 확인하고,
benchmark smoke는 fixed/time-budget 두 모드에서 JSON summary 형식을 검증한다.

## 실험 설정

### fixed-iteration 재검증

- empties: `12`
- algorithm: `mcts-hybrid`
- iteration budget: `24`, `32`
- main `24 seed`
- secondary holdout `24a seed`
- 총 `96 scenario`

### time-budget 재검증

- empties: `12`
- algorithm: `mcts-hybrid`
- time budget: `200ms`, `280ms`
- main `24 seed`
- secondary holdout `24a seed`
- 총 `96 scenario`

공통적으로 Stage 110 기본 late lane은 유지했다.

- exact continuation base `+3`
- adaptive continuation `loss-only +1`
- proof-priority scale `0.15`
- proof-priority max empties `12`

## 결과 요약

### 1. fixed-iteration: runtime gate는 target을 완전히 재현했다

main 24 + holdout24a 24, 총 `96 scenario` 기준:

| Variant | exact-best | proven | exact-result | avg score-loss |
| --- | ---: | ---: | ---: | ---: |
| baseline | 78/96 | 81/96 | 46/96 | 8,750.0 |
| target | 78/96 | 85/96 | 48/96 | 8,750.0 |
| runtime gate | 78/96 | 85/96 | 48/96 | 8,750.0 |

scenario-by-scenario 비교에서도 runtime gate는
**target과 96/96 완전 일치**했다.

즉 fixed-iteration 관점에서는,
runtime 구현이 Stage 115 post-hoc strongest gate가 만들던 target 재현을 실제 search 안에서도 그대로 재현한 셈이다.

### 2. 하지만 activation은 전혀 희소하지 않았다

fixed-iteration 같은 96 scenario에서 runtime gate는

- activation `96/96`
- average activation iteration `7.0`
- activation reason `best-metric-lte-1` only

였다.

즉 Stage 115 post-hoc composite에서는 `16/96`만 켜졌던 strongest gate가,
runtime에서는 **거의 모든 포지션에서 아주 이르게 켜졌다.**

이는 `best finite metric <= 1` 신호가 final baseline snapshot에서는 희소했지만,
실제 search 도중의 **transient root frontier**에서는 거의 항상 한 번쯤 나타난다는 뜻이다.

결과적으로 현재 prototype은
**selective root-maturity gate라기보다, 초반 몇 iteration 뒤 target late lane으로 넘어가는 delayed-always-on switch**에 가깝다.

### 3. time-budget에서는 base와 target 사이의 중간 정도에 머물렀다

main 24 + holdout24a 24, 총 `96 scenario`, `200/280ms` 합산 기준:

| Variant | exact-best | proven | exact-result | avg score-loss |
| --- | ---: | ---: | ---: | ---: |
| baseline | 70/96 | 83/96 | 33/96 | 14,791.7 |
| target | 70/96 | 85/96 | 33/96 | 13,750.0 |
| runtime gate | 70/96 | 84/96 | 33/96 | 14,791.7 |

즉 runtime gate는

- exact-best: baseline / target / gate 모두 동일
- proven: baseline과 target 사이
- average score-loss: **target 이득을 재현하지 못하고 baseline 쪽으로 되돌아감**

이라는 결과를 냈다.

### 4. bucket별 관찰

#### 200ms

- baseline: exact-best `32/48`, proven `39/48`, exact-result `12/48`, avg score-loss `19,166.7`
- target: exact-best `34/48`, proven `40/48`, exact-result `13/48`, avg score-loss `15,833.3`
- runtime gate: exact-best `33/48`, proven `39/48`, exact-result `12/48`, avg score-loss `18,750.0`

200ms에서는 runtime gate가 baseline보다 아주 조금 나아질 때도 있었지만,
**target이 보인 gain을 온전히 회수하지 못했다.**

#### 280ms

- baseline: exact-best `38/48`, proven `44/48`, exact-result `21/48`, avg score-loss `10,416.7`
- target: exact-best `36/48`, proven `45/48`, exact-result `20/48`, avg score-loss `11,666.7`
- runtime gate: exact-best `37/48`, proven `45/48`, exact-result `21/48`, avg score-loss `10,833.3`

280ms에서는 runtime gate가 base와 target 사이에서 절충된 결과를 냈다.
하지만 **어느 쪽에도 robust win이라고 부를 만큼 우세하지는 않았다.**

## 핵심 해석

### 1. strongest post-hoc gate를 그대로 runtime에 옮기면 의미가 달라졌다

Stage 115 strongest gate는
**final baseline maturity snapshot을 보고 target result를 선택**하는 기준이었다.

반면 Stage 116 runtime gate는
**search 도중의 transient frontier signal**을 보고 즉시 selection policy를 바꾼다.

이 차이 때문에 같은 문장(`best finite metric <= 1 or solved child`)이라도
실제 runtime에서는 거의 전 포지션에서 이르게 한 번씩 만족해 버렸다.

즉 이번 단계는

- “Stage 115에서 고른 gate 문장이 틀렸다”기보다는
- **그 gate를 runtime에서 sticky하게 쓰면 훨씬 더 공격적인 trigger가 된다**

는 점을 확인한 단계다.

### 2. fixed-iteration 재현 성공만으로는 충분하지 않았다

runtime gate가 fixed-iteration에서 target을 `96/96` 그대로 재현한 것은 분명 의미가 있다.
즉 구현 자체가 틀려서 엉뚱한 경로를 탄 것은 아니다.

하지만 우리가 원하는 것은

- proof closure timing 회수
- 가능하면 exact-best / score-loss까지 건드리는 **selective gate**

이다.

현재 prototype은 selective하지 못해,
사실상 target late lane을 더 늦게 켜는 형태에 그쳤다.

### 3. 현재 trigger는 다음 refinement 없이는 기본값으로 올리기 어렵다

이번 결과는 다음을 시사한다.

- `best finite metric <= 1` 단독 신호는 너무 흔하다.
- runtime gate로 쓰려면
  - coverage,
  - distinct finite metric count,
  - best/second metric gap,
  - solved child 종류(draw/win/loss),
  - minimum iteration / minimum ranked-child count
  같은 **추가 성숙도 조건**이 필요할 가능성이 높다.

즉 Stage 116의 결론은
**runtime gate라는 방향 자체는 맞지만, 현재 strongest gate 문장을 그대로 sticky runtime trigger로 쓰는 것은 너무 이르다**에 가깝다.

## 채택 판정

### 채택

- runtime root-maturity gate prototype 구현
- runtime telemetry / UI summary / resolved options 노출
- fixed-iteration + time-budget 겸용 benchmark tool
- Stage 116 smoke / benchmark smoke

### 미채택

- `mctsProofPriorityRootMaturityGateEnabled = true` 기본 승격
- `best-metric-lte-1-or-solved-child -> per-player + pnmax` prototype의 기본 적용
- 현재 late lane 기본값 변경

## 왜 기본 승격하지 않았는가

핵심 이유는 두 가지다.

1. **gate가 너무 자주, 너무 일찍 켜졌다.**
   - fixed/time-budget 모두 activation `96/96`
   - average activation iteration `~7`
   - 사실상 selective gate가 아님

2. **time-budget에서 robust strength 이득이 없었다.**
   - exact-best 합산은 baseline / target / gate 모두 동일
   - average score-loss는 target이 가장 좋았지만 runtime gate는 그 이득을 보존하지 못함

따라서 이번 단계의 판정은

- **prototype 자체는 성공**
- 하지만 **현재 trigger는 기본값으로 승격할 수 없음**

이다.

## 이번 단계 산출물

- `js/ai/mcts.js`
- `js/ai/search-engine.js`
- `js/ui/formatters.js`
- `tools/engine-match/benchmark-mcts-root-maturity-gate-runtime.mjs`
- `js/test/stage116_mcts_root_maturity_gate_runtime_smoke.mjs`
- `js/test/stage116_mcts_root_maturity_gate_runtime_benchmark_smoke.mjs`
- `benchmarks/stage116_mcts_root_maturity_gate_runtime_fixed_iterations_12empties_24seeds_20260411_v1.json`
- `benchmarks/stage116_mcts_root_maturity_gate_runtime_fixed_iterations_12empties_holdout24a_20260411_v1.json`
- `benchmarks/stage116_mcts_root_maturity_gate_runtime_12empties_200_280ms_24seeds_20260411_v1.json`
- `benchmarks/stage116_mcts_root_maturity_gate_runtime_12empties_200_280ms_holdout24a_20260411_v1.json`

## 실행한 검증

- `node js/test/stage116_mcts_root_maturity_gate_runtime_smoke.mjs`
- `node js/test/stage116_mcts_root_maturity_gate_runtime_benchmark_smoke.mjs`
- `node js/test/stage109_report_inventory_smoke.mjs`
- `node js/test/core-smoke.mjs`

## 다음 단계 후보

Stage 116까지 오면서 방향은 더 분명해졌다.

다음 후보는 단순하다.

1. **gate trigger refinement**
   - `best finite metric <= 1`에 추가 조건을 붙여
   - truly selective runtime gate를 다시 찾는다.

2. 후보 예시
   - minimum iteration / minimum ranked-child count
   - `distinctFiniteMetricCount >= 2`
   - `bestFiniteMetric <= 1` **and** `secondFiniteMetric <= k`
   - solved child 존재 시 outcome별(draw/win/loss) 분리
   - coverage / metric-gap 결합 gate

즉 이번 단계는
**runtime root-maturity gate를 실제 엔진에 넣었을 때 어떤 종류의 over-activation이 생기는지**를 확인한 단계라고 보는 편이 가장 정확하다.
