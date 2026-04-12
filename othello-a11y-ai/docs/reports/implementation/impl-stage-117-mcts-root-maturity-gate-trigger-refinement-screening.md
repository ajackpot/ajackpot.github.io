# Stage 117 - MCTS root-maturity gate trigger refinement screening

## 배경

Stage 116에서는 Stage 115 post-hoc strongest gate였던

- `best finite metric <= 1 or solved child`

조건을 runtime root proof-priority ranking 안에 직접 넣어 보았다.

하지만 결과는 선택적 gate가 아니라 거의 **delayed always-on switch**에 가까웠다.

- fixed-iteration main 24 + holdout24a 24, 총 `96 scenario`
- activation `96/96`
- average activation iteration `~7`
- fixed-iteration에서는 target `per-player + pnmax`를 그대로 재현
- time-budget `200/280ms`에서는 exact-best / average score-loss gain을 재현하지 못함

즉 Stage 116의 핵심 문제는 gate 문장이 완전히 틀렸다기보다,
**transient root frontier에서 너무 이르게 거의 항상 만족하는 신호를 sticky trigger로 쓴 것**에 있었다.

이번 Stage 117의 질문은 다음으로 좁혀졌다.

**trigger를 늦추거나 더 좁히면, Stage 116의 거의 상시 activation을 줄이면서 target late lane을 필요한 구간에서만 재현할 수 있는가?**

## 이번 단계 목표

- runtime root-maturity gate에 더 정교한 trigger 조건을 추가한다.
- 먼저 time-budget pilot으로 후보를 좁힌다.
- 그다음 strongest 후보를
  - time-budget holdout
  - fixed-iteration main/holdout
  에 다시 걸어 판정한다.
- 기본 late lane 변경 여부를 결정한다.

## 구현 내용

### 1. refined runtime 옵션 표면 추가

`js/ai/search-engine.js`, `js/ai/mcts.js`에 다음 옵션을 추가했다.

- `mctsProofPriorityRootMaturityGateMinVisits`
- `mctsProofPriorityRootMaturityGateBestFiniteMetricThreshold`
- `mctsProofPriorityRootMaturityGateRequireNoSolvedChild`
- `mctsProofPriorityRootMaturityGateMinDistinctFiniteMetricCount`

그리고 gate mode도 확장했다.

- `best-metric-threshold`
- `best-metric-threshold-or-solved-child`

즉 기존의 고정된 `<= 1` 조건 대신,
**threshold / min-visits / no-solved-child / distinct finite metric count**를 조합할 수 있게 했다.

### 2. gate evaluator 세분화

runtime root gate evaluator는 이제 다음 순서로 eligibility를 판단한다.

1. gate mode
2. 현재 root visit 수
3. solved child 존재 여부 제한
4. finite metric threshold
5. distinct finite metric count 하한

그리고 activation / final snapshot 외에,
blocking 원인과 마지막 평가 원인도 telemetry에 남긴다.

추가된 telemetry 예시는 다음과 같다.

- `proofPriorityRootMaturityGateMinVisits`
- `proofPriorityRootMaturityGateBestFiniteMetricThreshold`
- `proofPriorityRootMaturityGateRequireNoSolvedChild`
- `proofPriorityRootMaturityGateMinDistinctFiniteMetricCount`
- `proofPriorityRootMaturityGateLastEvaluationReason`
- `proofPriorityRootMaturityGateLastBlockReason`

### 3. UI / resolved options 확장

`js/ui/formatters.js`는 root gate 설정을 다음처럼 요약할 수 있게 바뀌었다.

- `visits≥10`
- `metric≤3`
- `solved-child 없음`
- `distinct≥4`

즉 상태 패널 summary와 resolved options에서 refined trigger가 바로 드러난다.

### 4. 기존 benchmark 도구 확장

기존 Stage 116 도구인

- `tools/engine-match/benchmark-mcts-root-maturity-gate-runtime.mjs`

에 refined gate 인자를 추가했다.

- `--root-maturity-gate-min-visits`
- `--root-maturity-gate-best-metric-threshold`
- `--root-maturity-gate-require-no-solved-child`
- `--root-maturity-gate-min-distinct-finite-metric-count`

즉 fixed-iteration / time-budget 둘 다에서 같은 refined trigger 후보를 바로 다시 걸 수 있다.

### 5. 새 smoke 추가

- `js/test/stage117_mcts_root_maturity_gate_refinement_runtime_smoke.mjs`
- `js/test/stage117_mcts_root_maturity_gate_refinement_benchmark_smoke.mjs`

runtime smoke는

- activation case
- solved-child-present block case
- formatter / resolved options

를 직접 검증한다.

benchmark smoke는

- fixed-iterations
- time-budget

두 모드에서 새 gate 인자가 JSON summary에 반영되는지 확인한다.

## screening 후보

이번 단계에서는 refined trigger를 다음 두 후보로 좁혔다.

### 후보 A - narrower gate (`v10d4`)

- mode: `best-metric-threshold`
- min visits: `10`
- threshold: `3`
- require no solved child: `true`
- min distinct finite metric count: `4`

### 후보 B - broader gate (`v10`)

- mode: `best-metric-threshold`
- min visits: `10`
- threshold: `3`
- require no solved child: `true`
- min distinct finite metric count: `0`

즉 A는 더 선택적이고, B는 같은 gate를 더 넓게 허용한다.

## 실험 설정

### time-budget pilot / revalidation

- empties: `12`
- budgets: `200ms`, `280ms`
- main `24 seed`
- holdout24a `24 seed`

### fixed-iteration revalidation

- empties: `12`
- iteration budget: `24`, `32`
- main `24 seed`
- holdout24a `24 seed`

항상 세 variant를 같이 비교했다.

- `base`: `legacy-root + rank`
- `target`: `per-player + pnmax`
- `runtime-gate`: refined gate가 켜질 때만 `legacy-root + rank -> per-player + pnmax`

## 결과 요약

## 1. narrower gate (`v10d4`)는 선택적이었지만 너무 보수적이었다

### time-budget, main 24 + holdout24a 24 = 총 `96 scenario`

| Variant | exact-best | proven | exact-result | avg score-loss | activation |
| --- | ---: | ---: | ---: | ---: | ---: |
| base | 77/96 | 92/96 | 45/96 | 9,166.7 | 0 |
| target | 77/96 | 93/96 | 46/96 | 9,166.7 | 0 |
| runtime gate (`v10d4`) | 77/96 | 93/96 | 46/96 | 9,166.7 | 23/96 |

aggregate만 보면 target과 같아 보이지만,
이 후보는 fixed-iteration으로 가면 target 재현을 일부 놓친다.

### fixed-iteration, main 24 + holdout24a 24 = 총 `96 scenario`

| Variant | exact-best | proven | exact-result | avg score-loss | activation |
| --- | ---: | ---: | ---: | ---: | ---: |
| base | 78/96 | 81/96 | 46/96 | 8,750.0 | 0 |
| target | 78/96 | 85/96 | 48/96 | 8,750.0 | 0 |
| runtime gate (`v10d4`) | 78/96 | 83/96 | 46/96 | 8,750.0 | 24/96 |

즉 `v10d4`는 activation을 Stage 116의 `96/96`에서 `24/96` 수준으로 줄이는 데는 성공했지만,
그만큼 target late lane이 만들던 proof closure까지 일부 놓쳤다.

결론적으로 `v10d4`는 **선택성은 좋아졌지만 너무 보수적**이었다.

## 2. broader gate (`v10`)는 fixed-iteration에서 target을 정확히 재현했다

### fixed-iteration, main 24 + holdout24a 24 = 총 `96 scenario`

| Variant | exact-best | proven | exact-result | avg score-loss | activation |
| --- | ---: | ---: | ---: | ---: | ---: |
| base | 78/96 | 81/96 | 46/96 | 8,750.0 | 0 |
| target | 78/96 | 85/96 | 48/96 | 8,750.0 | 0 |
| runtime gate (`v10`) | 78/96 | 85/96 | 48/96 | 8,750.0 | 50/96 |

그리고 scenario-by-scenario로도 `runtime gate == target`이었다.

즉 `v10`은

- Stage 116의 `96/96` always-on activation을
- `50/96` 수준으로 줄이면서도
- fixed-iteration에서는 target late lane을 그대로 재현했다.

이 점에서 이번 단계 strongest runtime 후보는 `v10`으로 정리된다.

## 3. 하지만 time-budget에서는 그 gain이 gate activation에서 온 것이 아니었다

### time-budget, main 24 + holdout24a 24 = 총 `96 scenario`

| Variant | exact-best | proven | exact-result | avg score-loss | activation |
| --- | ---: | ---: | ---: | ---: | ---: |
| base | 78/96 | 94/96 | 45/96 | 8,958.3 | 0 |
| target | 79/96 | 94/96 | 47/96 | 8,750.0 | 0 |
| runtime gate (`v10`) | 79/96 | 94/96 | 47/96 | 8,750.0 | 50/96 |

aggregate만 보면 `runtime gate`가 target을 정확히 따라가며,
base보다도

- exact-best `+1`
- exact-result `+2`
- average score-loss `-208.3`

좋아 보인다.

하지만 scenario-by-scenario를 보면,
base와 target이 실제로 달랐던 경우는 **딱 2건**이었다.

- seed `11`, `200ms`
- seed `431`, `280ms`

그리고 더 중요한 점은,
이 두 경우 모두 **runtime gate activation이 일어나지 않은 상태에서** `runtime-gate`가 target과 같은 결과를 냈다는 사실이다.

즉 이번 단계의 strongest runtime 후보 `v10`은

- fixed-iteration에서는 실제 activation을 통해 target을 재현했지만
- time-budget에서는 관찰된 aggregate gain이 **gate switching의 직접 효과라기보다 deadline jitter / timing overhead와 겹쳐 보인 결과**로 해석하는 편이 맞다.

다시 말해, **time-budget에서 “좋아 보인 수치”와 “실제 gate가 output을 바꾼 경우”가 일치하지 않았다.**

## 해석

### 1. refined trigger는 Stage 116의 거의 상시 activation 문제를 확실히 줄였다

이 점은 분명한 성과다.

- Stage 116: activation `96/96`
- Stage 117 strongest candidate `v10`: activation `50/96`
- Stage 117 narrower candidate `v10d4`: activation `24/96`

즉 refined gate는 적어도 **“언제나 너무 빨리 켜지는 trigger”** 문제를 줄이는 데는 성공했다.

### 2. 그러나 우리가 필요한 것은 selective activation 자체가 아니라, output-level gain이다

`v10`은 fixed-iteration에서 target 재현에 성공했고,
`v10d4`는 더 선택적이었다.

하지만 현재 late lane의 더 중요한 기준은 여전히

- exact-best
- average score-loss
- time-budget robustness

이다.

이번 단계 strongest candidate `v10`은 time-budget aggregate에서 좋아 보였지만,
그 gain이 실제 gate activation과 연결되지 않았다.

즉 현재 refined runtime gate는

- fixed-iteration에서는 “selective late lane reproducer”가 되었지만
- time-budget에서는 아직 **실전 gain을 책임 있게 귀속할 수 있는 selective gate**가 아니다.

### 3. 따라서 기본값 승격 기준에는 아직 못 미친다

이번 단계 strongest 후보조차

- unconditional late-bias package보다 훨씬 나아진 선택성을 보여 주었고
- fixed-iteration에서는 target 재현을 달성했지만
- time-budget output gain의 원인이 실제 gate switching이라고 확인되지는 않았다.

그러므로 지금 시점에서

- `mctsProofPriorityRootMaturityGateEnabled = true`
- refined trigger preset의 전역 기본값 승격

으로 가는 것은 아직 이르다.

## 판정

### 채택

- refined root-maturity gate runtime 표면 추가
- `best-metric-threshold`, `best-metric-threshold-or-solved-child` gate mode 추가
- gate `minVisits / threshold / noSolvedChild / minDistinct` 옵션 추가
- telemetry / UI summary / benchmark JSON 확장
- Stage 117 smoke / benchmark smoke

### 미채택

- refined runtime gate 기본값 승격
- `mctsProofPriorityRootMaturityGateEnabled = true` 기본값 승격
- strongest candidate `v10`의 전역 기본 적용

## 현재 정리된 strongest experimental candidate

이번 단계 strongest experimental candidate는 다음이다.

- mode: `best-metric-threshold`
- min visits: `10`
- threshold: `3`
- require no solved child: `true`
- min distinct finite metric count: `0`
- target late lane: `per-player + pnmax`

즉 shorthand로 쓰면

**`best finite metric <= 3`, `visits >= 10`, `solved child 없음`일 때만 `legacy-root + rank -> per-player + pnmax`**

이다.

하지만 이는 어디까지나 **strongest experimental runtime candidate**일 뿐,
현재 기본 late lane은 계속 다음으로 유지한다.

- `mctsProofMetricMode = legacy-root`
- `mctsProofPriorityBiasMode = rank`
- `mctsProofPriorityRootMaturityGateEnabled = false`

## 다음 단계 제안

이제 가장 자연스러운 다음 단계는 두 갈래 중 하나다.

1. **activation-causal benchmark**를 추가해,
   time-budget에서 gate activation이 실제로 output을 바꾼 경우만 따로 집계한다.
2. 혹은 root-maturity gate는 여기서 experimental로 고정하고,
   다시 PN/PPN 다른 후보군으로 넘어간다.

이번 Stage 117만 놓고 보면,
가장 중요한 결론은 다음 한 줄로 정리할 수 있다.

**refined gate는 확실히 더 선택적이 되었지만, 아직 time-budget output gain을 안정적으로 자기 공으로 만들지는 못했다.**
