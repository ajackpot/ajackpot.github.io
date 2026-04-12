# Stage 115 - MCTS root-maturity / proof-maturity gate fixed-iteration screening

## 배경

Stage 113~114에서 `per-player + pnmax` late-bias package는

- **time-budget gating만으로는 noise와 구분되지 않았고**,
- **fixed-iteration control에서도 exact-best / average score-loss 개선이 없었다**.

즉, target late lane 자체는 일부 proof closure를 더 빨리 닫을 수는 있었지만,
**언제 그 lane을 켜야 하는지**가 핵심으로 남았다.

Stage 114 보고서의 다음 후보는 다음 두 줄기였다.

1. **root-maturity / proof-maturity gate**
2. 더 나아가면 **proof-maturity telemetry 자체를 먼저 늘린 뒤 gate를 설계**

이번 Stage 115에서는 두 방향을 함께 묶어,
**fixed-iteration benchmark 안에서 baseline root maturity telemetry를 계산하고,
그 telemetry를 gate로 써서 target late lane을 post-hoc composite로 선택하는 screening**을 먼저 진행했다.

## 이번 단계 목표

- Stage 114의 target 조합
  - baseline: `legacy-root + rank`
  - target: `per-player + pnmax`
- 를 그대로 유지한 채,
- **baseline search가 어느 정도 성숙했을 때만 target 결과를 택하는 gate**가
  - proof closure를 얼마나 회수하는지,
  - exact-best / score-loss 관점에서 새로운 이득이 생기는지,
  - activation을 얼마나 드물게 만들 수 있는지
  를 먼저 확인한다.

이번 단계는 **screening stage**이므로,
아직 runtime engine 내부에 dynamic gate를 직접 넣지는 않았다.

## 구현 내용

### 1. 새 benchmark 도구 추가

- `tools/engine-match/benchmark-mcts-root-maturity-gate-fixed-iterations.mjs`

이 도구는 다음 순서로 동작한다.

1. 같은 late position / 같은 seed / 같은 iteration budget에서
   - baseline(`legacy-root + rank`)
   - target(`per-player + pnmax`)
   를 각각 실행한다.
2. baseline 결과에서 root maturity telemetry를 계산한다.
3. gate 규칙에 따라
   - baseline 결과를 그대로 택하거나
   - target 결과로 교체하는
   **post-hoc composite variant**를 만든다.
4. base / target / gate variants를 한 번에 집계한다.

### 2. root maturity telemetry 추가 산출

도구 내부에서 다음 root-level maturity feature를 추출하도록 정리했다.

- `solvedCoverageRate`
- `exactCoverageRate`
- `solvedMoveCount`
- `exactSolvedMoveCount`
- `unresolvedMoveCount`
- `bestMoveSolved`
- `bestMoveSolvedOutcome`
- `rootProofNumber`
- `rootDisproofNumber`
- `bestMoveMetricProofNumber`
- `bestMoveProofRank`
- `finiteMetricCount`
- `distinctFiniteMetricCount`
- `bestFiniteMetric`
- `secondFiniteMetric`
- `bestFiniteMetricGap`

즉, Stage 114에서 말한

- root proof frontier가 좁아졌는지
- solved child가 생겼는지
- best proof metric이 충분히 진행됐는지

를 fixed-iteration 결과에서 직접 관찰할 수 있게 했다.

### 3. gate 후보

이번 screening에 올린 gate는 다음 다섯 가지다.

- `coverage-gte-0.50`
- `coverage-gte-0.75`
- `best-move-solved`
- `best-metric-lte-1`
- `best-metric-lte-1-or-solved-child`

마지막 조합은 screening 도중 추가했다.
이유는 보수적인 `coverage`/`best-move-solved` 계열은 draw closure는 잡았지만,
`best-metric-lte-1` 쪽은 win proof closure를 더 많이 회수했기 때문이다.

## 실험 설정

### 공통 조건

- algorithm: `mcts-hybrid`
- empties: `12`
- exact continuation:
  - base `+3`
  - adaptive `loss-only +1`
- proof-priority:
  - scale `0.15`
  - max empties `12`
- iteration budget:
  - `24`
  - `32`
- main `24 seed` + holdout `24 seed`
  - 총 `96 scenario` (`48 positions × 2 iteration buckets`)

### baseline / target

- baseline: `legacy-root + rank`
- target: `per-player + pnmax`

lower iteration bucket(`8/12/16`)은 Stage 114에서 base/target divergence가 거의 없었기 때문에,
이번 Stage 115 screening은 실제 차이가 처음 나타난 `24/32`에 집중했다.

## 결과 요약

### baseline vs target (재확인)

총 `96 scenario` 기준:

- baseline
  - exact-best `83/96`
  - proven `79/96`
  - exact-result `39/96`
  - average score-loss `5,416.7`
- target
  - exact-best `83/96`
  - proven `84/96`
  - exact-result `41/96`
  - average score-loss `5,416.7`

즉 target late lane은 다시 한 번

- **exact-best 변화 없음**
- **average score-loss 변화 없음**
- 대신 **proof closure +5**, **exact result +2**

로 정리됐다.

### 개별 gate 성능

총 `96 scenario` 기준:

| Variant | exact-best | proven | exact-result | avg score-loss | activation |
| --- | ---: | ---: | ---: | ---: | ---: |
| baseline | 83/96 | 79/96 | 39/96 | 5,416.7 | 0 |
| target | 83/96 | 84/96 | 41/96 | 5,416.7 | 0 |
| coverage ≥ 0.50 | 83/96 | 81/96 | 41/96 | 5,416.7 | 5 |
| coverage ≥ 0.75 | 83/96 | 81/96 | 41/96 | 5,416.7 | 3 |
| best move solved | 83/96 | 81/96 | 41/96 | 5,416.7 | 4 |
| best finite metric ≤ 1 | 83/96 | 83/96 | 40/96 | 5,416.7 | 15 |
| best finite metric ≤ 1 **or solved child** | 83/96 | **84/96** | **41/96** | **5,416.7** | **16** |

### iteration bucket별 관찰

#### 24 iterations

- baseline: proven `35/48`, exact-result `18/48`
- target: proven `39/48`, exact-result `19/48`
- strongest gate (`best-metric-lte-1-or-solved-child`):
  - proven `39/48`
  - exact-result `19/48`
  - activation `13/48`

#### 32 iterations

- baseline: proven `44/48`, exact-result `21/48`
- target: proven `45/48`, exact-result `22/48`
- strongest gate (`best-metric-lte-1-or-solved-child`):
  - proven `45/48`
  - exact-result `22/48`
  - activation `3/48`

## 핵심 해석

### 1. 보수적 gate는 draw closure만 일부 회수했다

`coverage-gte-0.50`, `coverage-gte-0.75`, `best-move-solved`는
activation 수는 적었지만,
대체로 이미 draw child가 거의 정리된 경우만 잡아냈다.

그래서

- exact-result `+2`
- proven `+2`

정도는 회수했지만,
win proof closure 쪽은 놓쳤다.

### 2. `best-metric-lte-1`는 더 공격적이지만 draw exact 하나를 놓쳤다

`best-metric-lte-1`는
baseline root frontier 안에 **즉시 proof 진행 신호**가 있는 경우를 넓게 잡으면서

- proven `79 -> 83`

까지 끌어올렸다.

하지만 `seed 47 / 24 iterations` 같은 draw closure 케이스는
finite metric 자체가 이미 사라진 상태라서,
정확히 그 한 건을 놓쳤다.

### 3. `best finite metric ≤ 1 or solved child`가 target을 완전히 재현했다

이번 단계의 가장 중요한 결과는 이것이다.

`best-metric-lte-1-or-solved-child` gate는

- 총 `96 scenario`에서 **scenario-by-scenario로 target 결과와 완전히 동일**했다.
- aggregate만 같은 것이 아니라,
  - `bestMoveCoord`
  - `score`
  - `proven`
  - `isExactResult`
  - `exactBestHit`
  - `mctsRootSolvedOutcome`
  가 전부 target과 일치했다.
- 그런데 activation은 **16/96 = 16.7%**에 불과했다.

즉 이번 fixed-iteration 샘플에서는,
**“solved child가 생겼거나, best finite proof metric이 1 이하로 내려갔다”**는 신호만으로
`per-player + pnmax` target lane이 실제로 필요한 지점을 거의 정확히 찍어낼 수 있었다.

## 채택 판정

### 채택

- **root-maturity / proof-maturity screening tool 자체**
- baseline root maturity telemetry 정리
- post-hoc composite gate 후보군 검증

### 미채택

- runtime 기본값 변경
- `per-player + pnmax` 기본 승격
- root-maturity gate 기본 승격

## 왜 기본 승격을 아직 하지 않았는가

이번 결과는 꽤 강한 screening signal이지만,
아직은 **post-hoc composite** 단계다.

즉,

- baseline을 한 번 끝까지 돌려 telemetry를 얻은 뒤,
- 그 결과를 보고 target 결과를 선택한 것과,
- 실제 runtime search 도중 root에서 dynamic하게 gate를 발동시켜
  selection policy를 바꾸는 것은
동일하지 않다.

이번 Stage 115는

- **“어떤 gate를 구현해야 하느냐”**는 질문에는 거의 답을 줬지만,
- **“그 gate를 runtime에 직접 넣었을 때도 똑같이 동작하느냐”**는 질문에는 아직 답하지 않았다.

게다가 더 중요한 채택 기준인

- exact-best
- average score-loss

는 base / target / gate 전부 동일하다.
즉 이 gate가 회수하는 것은 어디까지나 **proof closure / exact result timing**이며,
현재 샘플에서는 **move strength 이득**으로 이어지지 않았다.

따라서 이번 단계의 결론은 다음과 같다.

- **gate 후보는 뚜렷하게 좁혀졌다.**
- 하지만 **runtime implementation + 재검증 전까지는 기본 승격하지 않는다.**

## 이번 단계 산출물

- `tools/engine-match/benchmark-mcts-root-maturity-gate-fixed-iterations.mjs`
- `js/test/stage115_mcts_root_maturity_gate_fixed_iterations_benchmark_smoke.mjs`
- `benchmarks/stage115_mcts_root_maturity_gate_fixed_iterations_12empties_24seeds_20260411_v1.json`
- `benchmarks/stage115_mcts_root_maturity_gate_fixed_iterations_12empties_holdout24_20260411_v1.json`

## 실행한 검증

- `node js/test/stage115_mcts_root_maturity_gate_fixed_iterations_benchmark_smoke.mjs`
- `node js/test/stage109_report_inventory_smoke.mjs`
- `node js/test/core-smoke.mjs`

## 다음 단계 후보

이제 다음 단계는 사실상 하나로 좁혀졌다.

1. **runtime root-maturity gate prototype**
   - root proof-priority ranking에서만
   - `solved child exists || best finite metric <= 1`
     신호가 잡히면
   - `legacy-root + rank -> per-player + pnmax`
     로 dynamic 전환하는 실 구현

2. 그다음 **fixed-iteration + time-budget 재검증**
   - post-hoc composite와 실제 runtime gate가 같은 결과를 내는지
   - 200/280ms time-budget에서도 proof closure gain이 유지되는지
   - activation이 여전히 드문지

즉 Stage 115의 성과는
**“무슨 gate를 구현할지 더 이상 거의 모호하지 않다”**는 데 있다.
