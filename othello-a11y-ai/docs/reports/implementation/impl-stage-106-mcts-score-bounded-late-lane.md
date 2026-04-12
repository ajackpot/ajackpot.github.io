# Stage 106 - draw-aware / score-bounded late lane prototype와 채택 판정

## 요약
이번 단계의 목표는 Stage 104~105에서 정리된 MCTS late lane 위에,
**score-bounded / draw-aware propagation**을 실제로 붙여 본 뒤 기본값 채택 여부를 판정하는 것이었습니다.

결론은 다음과 같습니다.

- **실험 구현 자체는 채택**
  - `mctsScoreBoundsEnabled = true | false` 옵션을 추가했습니다.
  - root / best move의 score lower/upper bound, bound cut 통계, formatter / telemetry / benchmark / smoke를 모두 붙였습니다.
- **기본값 승격은 비채택**
  - 현재 기본 late lane(`exact=8`, solver `+2`, continuation `+3`, proof-priority handoff on)에서는
    bounds가 실제로 좁아지고 draw exact 승격도 일부 생겼지만,
    **exact-best / WLD agreement / proven rate에서 robust한 기본값 이득은 확인되지 않았습니다.**
  - 따라서 기본값은 계속 **`mctsScoreBoundsEnabled = false`**로 둡니다.

즉 이번 Stage 106은 “score-bound late lane 도입 + draw-aware benchmark + 기본값 채택 여부 판정” 단계였고,
판정 결과는 **experimental opt-in 유지, default 승격은 보류**입니다.

## 왜 이 검증이 필요한가
Stage 103~105까지의 late lane은 기본적으로 다음 순서를 따라왔습니다.

1. `12 empties` 근방에서 proof-priority bias로 WLD proof 순서를 앞당긴다.
2. `11 empties`부터는 continuation bridge로 같은 deadline 안 exact continuation을 더 밀어 준다.
3. root / subtree proof 상태는 Stage 102 telemetry로 제품 표면에 노출한다.

여기서 아직 빠져 있던 것은 **“승/패만이 아니라 점수 경계(lower/upper bound)를 late lane 안에 유지하는 일”**이었습니다.
특히 draw가 섞이는 오델로 말기에서는,
- `draw subtree`를 exact `0`으로 올릴 수 있는지,
- 아직 root가 unsolved여도 “최소한 0 이상 / 최대한 -1 이하” 같은 정보를 유지할 수 있는지,
- 이미 지배된 child를 조금이라도 덜 방문할 수 있는지
를 따로 봐야 했습니다.

따라서 이번 질문은 다음과 같았습니다.

1. score lower/upper bound를 late solved-subtree lane에 같이 전파하면,
2. 현재 Stage 104~105 기본 late lane에서는,
3. draw exact 승격이나 exact-best hit에서 실제 이득이 생기는가?

## 구현 내용

### 1) `js/ai/mcts.js`
다음 항목을 추가했습니다.

- node-level score bound 상태
  - `scoreLowerBound`
  - `scoreUpperBound`
- bound refresh / solve helper
  - `refreshScoreBounds()`
  - `refreshSolvedStateFromScoreBounds()`
  - `buildScoreBoundPrincipalVariation()`
- selection 단계 dominated child cut helper
  - `getTraversableChildrenWithScoreBounds()`
- analyzed move / root result annotation
  - `scoreLowerBound`
  - `scoreUpperBound`
  - `scoreBoundWidth`
  - `scoreBoundExact`
  - `mctsRootScoreLowerBound`
  - `mctsRootScoreUpperBound`
  - `mctsScoreBoundsEnabled`
- stats 추가
  - `mctsScoreBoundUpdates`
  - `mctsScoreBoundExactSolves`
  - `mctsScoreBoundOutcomeSolves`
  - `mctsScoreBoundDominatedChildrenSkipped`

핵심은 **기존 solver / proof lane을 지우지 않고 그 위에 bound layer를 겹친 것**입니다.
즉 지금 구현은 full score-bounded MCTS 전환이 아니라,
기존 late solved-subtree lane에 score bound를 병렬로 유지하는 prototype입니다.

### 2) `js/ai/search-engine.js`
런타임 옵션과 telemetry를 연결했습니다.

- `mctsScoreBoundsEnabled` 옵션 해석 추가
- draw-aware WLD solve 처리
  - `mctsScoreBoundsEnabled = true`일 때 WLD draw subtree는 exact `0`으로 취급 가능
- MCTS proof telemetry 확장
  - root / best move score lower/upper bound
  - root / best move bound width
  - score-bound updates / exact solves / dominated cuts 통계

### 3) `js/ui/formatters.js`
proof summary 문장과 옵션 요약을 확장했습니다.

- summary에 bound가 실제로 좁아졌을 때만
  - `score-bound <lower>..<upper>`
  - `bound cuts <n>`
  메모를 붙입니다.
- resolved options 목록에도
  - `MCTS score-bounds: 활성/끔`
  이 보이도록 했습니다.

### 4) benchmark / smoke 추가
새로 추가한 항목:

- `tools/engine-match/benchmark-mcts-score-bounds.mjs`
- `js/test/stage106_mcts_score_bounds_runtime_smoke.mjs`
- `js/test/stage106_mcts_score_bounds_benchmark_smoke.mjs`

이 benchmark는
- 전체 aggregate
- empties별 aggregate
- reference outcome(win/draw/loss)별 aggregate

를 함께 내기 때문에,
draw subset에서만 생기는 차이도 따로 볼 수 있습니다.

## 벤치 설계
이번에는 결과를 세 층으로 나눠 봤습니다.

### A. 현재 기본 late lane 검증 (`12 empties`)
실제 Stage 104~105 기본 runtime을 그대로 둔 상태입니다.

- `exactEndgameEmpties = 8`
- `mctsSolverWldEmpties = 2`
- `mctsExactContinuationExtraEmpties = 3`
- `mctsProofPriorityScale = 0.15`
- `mctsProofPriorityMaxEmpties = 12`
- `mctsProofPriorityContinuationHandoffEnabled = true`
- `mctsProofMetricMode = legacy-root`
- `mctsScoreBoundsEnabled = off | on`
- empties: `12`
- seeds: `15,17,31,41,47,53,71,89,107,123,149,167`

### B. continuation window check (`11 empties`)
Stage 104 bridge 이후 `11 empties`는 proof-priority보다 continuation 쪽이 더 강한 구간입니다.
따라서 score-bounds가 여기서도 exact-result 승격이나 draw handling에 의미가 있는지 따로 봤습니다.

- 나머지 옵션은 동일
- empties: `11`
- seeds: 위와 동일한 12개

### C. fixed-iteration sanity
120ms 경계는 host load / JIT / bookkeeping overhead 영향을 받을 수 있으므로,
대표 seed 몇 개는 `mctsMaxIterations`를 고정해 다시 확인했습니다.

- empties: `12`
- seeds: `15(draw)`, `71(win)`, `89(loss)`, `167(draw)`
- fixed iterations: `16,24,32`

이 sanity는 “보인 차이가 구조적인가, 아니면 time-budget overhead인가?”를 분리하기 위한 용도입니다.

## 결과

### 1) 기본 late lane (`12 empties`) - 120ms
- score-bounds off
  - exact-best `8/12 = 66.7%`
  - WLD agreement `11/12 = 91.7%`
  - proven `6/12 = 50.0%`
  - exact-result `0/12 = 0%`
  - average score loss `26666.67`
- score-bounds on
  - exact-best `8/12 = 66.7%`
  - WLD agreement `11/12 = 91.7%`
  - proven `6/12 = 50.0%`
  - exact-result `1/12 = 8.3%`
  - average score loss `30000`

여기서는 **draw exact 승격 1건**이 생겼지만,
정작 exact-best나 WLD agreement는 올라가지 않았고,
loss-case 1건에서 평균 점수 손실이 더 나빠졌습니다.

대표 draw-case는 `seed 15`였습니다.
- off: same best move `A8`, unsolved
- on: same best move `A8`, root draw exact, root bound `0..0`, bound cuts `14`

반대로 `seed 89` loss-case에서는
- off: `A1`, root loss proof
- on: `A2`, unsolved

로 밀렸습니다.
즉 **“proof / bound 정보는 좋아지는데, 낮은 deadline에서는 bookkeeping overhead가 일부 실전 성능을 갉을 수 있다”**는 신호가 여기서 나왔습니다.

### 2) 기본 late lane (`12 empties`) - 280ms
- score-bounds off
  - exact-best `8/12 = 66.7%`
  - WLD agreement `12/12 = 100%`
  - proven `9/12 = 75.0%`
  - exact-result `2/12 = 16.7%`
  - average score loss `21666.67`
- score-bounds on
  - exact-best `8/12 = 66.7%`
  - WLD agreement `12/12 = 100%`
  - proven `9/12 = 75.0%`
  - exact-result `2/12 = 16.7%`
  - average score loss `21666.67`

여기서는 **strength 지표가 완전히 동률**이었습니다.
하지만 bound telemetry는 분명히 살아 있었습니다.

- root bound narrowed rate: `0% -> 91.7%`
- best-move bound narrowed rate: `0% -> 91.7%`
- bound cut rate: `0% -> 25%`
- average root score-bound width: `1280000 -> 580833.33`
- average best-move score-bound width: `1280000 -> 474166.67`

즉 280ms에서는 **실력이 좋아졌다고 말할 근거는 부족하지만, bound visibility와 pruning signal 자체는 분명히 생긴다**고 보는 편이 맞습니다.

### 3) draw subset (`12 empties`) 해석
`12 empties` draw reference 4포지션만 보면,
120ms에서는
- off: proven `0`, exact-result `0`
- on: proven `1/4`, exact-result `1/4`

이었고,
280ms에서는
- off = on: exact-best `1.0`, WLD agreement `1.0`, proven `0.5`, exact-result `0.5`

이었습니다.
즉 draw-aware 이득은 **있어도 아주 국소적**이었고,
시간이 조금만 늘어나면 기본 late lane과 차이가 사라졌습니다.

### 4) continuation window (`11 empties`) - 120ms / 280ms
`11 empties`에서는 이미 continuation bridge가 강하기 때문에,
score-bounds의 역할은 실력 상승보다 **결과의 성격을 더 빨리 exact 쪽으로 밀어 주는 것**에 가까웠습니다.

#### 120ms
- off
  - exact-best `7/12 = 58.3%`
  - proven `12/12 = 100%`
  - exact-result `10/12 = 83.3%`
  - average score loss `63333.33`
- on
  - exact-best `7/12 = 58.3%`
  - proven `12/12 = 100%`
  - exact-result `11/12 = 91.7%`
  - average score loss `63333.33`

즉 **exact-result는 1건 늘었지만 best move 자체는 그대로**였습니다.

#### 280ms
- off = on
  - exact-best `7/12 = 58.3%`
  - proven `12/12 = 100%`
  - exact-result `12/12 = 100%`
  - average score loss `55000`

여기서는 이미 continuation이 충분히 강해서 차이가 사라졌습니다.

### 5) fixed-iteration sanity
대표 seed를 fixed iterations로 다시 보면,
경계 시간대에서 보였던 차이는 대부분 **time-budget overhead**에 가깝다는 해석이 가능했습니다.

- `seed 89` loss-case
  - 120ms bench에서는 off만 root loss proof를 끝냈습니다.
  - 그러나 fixed `16` iterations에서는 off/on이 **둘 다 `A1`, root loss proof**를 동일하게 냈고,
    on만 root bound를 `-64..-1`로 좁혔습니다.
- `seed 15` draw-case
  - fixed `24` iterations에서 off/on이 **둘 다 draw exact**를 냈습니다.
  - on만 root bound `0..0`, bound cuts `14`를 기록했습니다.
- `seed 71` win-case
  - off/on이 동일한 `G4`와 root win proof를 냈고,
    on만 positive lower bound `+1..+64`를 유지했습니다.
- `seed 167` draw-case
  - off/on이 동일한 최종 선택을 유지했고,
    on만 draw lower bound `0..+64`와 bound cuts를 기록했습니다.

즉 이번 Stage 106 구현은 **구조적으로 다른 최종 선택을 만들어 내는 강한 새 policy**라기보다,
같은 late proof lane 위에 **의미 있는 bound 정보를 덧입히는 layer**에 더 가깝습니다.

## 판정
최종 판정은 다음과 같습니다.

### 채택한 것
- `mctsScoreBoundsEnabled` experimental 옵션
- node-level score lower/upper bound 유지
- draw-aware bound solve / bound cut helper
- root / best move score-bound telemetry
- score-bound formatter / option summary surface
- 전용 benchmark / smoke / adoption summary 도구

### 채택하지 않은 것
- **`mctsScoreBoundsEnabled = true`의 기본값 승격**

### 현재 기본값
- `mctsScoreBoundsEnabled = false`

## 왜 기본값을 유지하는가
이번 단계 결과를 요약하면 다음과 같습니다.

1. **bounds는 실제로 좁아진다**
   - 12 empties 280ms 기준 root bound narrowed rate가 `0% -> 91.7%`였습니다.
2. **draw exact 승격도 일부 생긴다**
   - 12 empties 120ms에서 exact-result가 `0 -> 1`로 늘었습니다.
3. **하지만 robust strength win은 없다**
   - 12 empties 120ms: exact-best 동률, average score loss 악화
   - 12 empties 280ms: 주요 strength 지표 완전 동률
   - 11 empties continuation window: exact-result만 약간 좋아지고 best move는 그대로
4. **negative case는 time-budget overhead 설명이 더 잘 맞는다**
   - fixed-iteration sanity에서는 같은 iterations에서 off/on이 같은 선택과 solved status를 냈습니다.

따라서 현재 코드베이스에서 score-bounds는
**“default strength feature”라기보다 “late proof lane의 해석력과 draw-awareness를 높이는 experimental layer”**로 보는 것이 맞습니다.

## 다음 단계에 남기는 결론
이번 Stage 106의 해석은 명확합니다.

- score-bounds는 **버릴 기능은 아니다.**
  - root / best move bound, draw exact 승격, bound cut telemetry는 실제로 의미가 있다.
- 그러나 아직은 **기본값으로 올릴 만큼 강한 실전 이득이 없다.**

이 기능을 다시 검토할 가장 자연스러운 조건은 다음 둘 중 하나입니다.

1. proof-priority / continuation / score-bounds를 더 강하게 결합한 **true score-bounded late lane**으로 확장할 때
2. draw를 포함한 3-way outcome을 더 직접 다루는 generalized proof / score-bounded policy가 추가될 때

즉 이번 Stage 106은 “full adoption”이 아니라,
**다음 draw-aware / PN-inspired 확장을 위해 score-bound telemetry와 late-lane prototype을 확보한 단계**로 보는 것이 맞습니다.

## 관련 파일
- `js/ai/mcts.js`
- `js/ai/search-engine.js`
- `js/ui/formatters.js`
- `js/test/stage106_mcts_score_bounds_runtime_smoke.mjs`
- `js/test/stage106_mcts_score_bounds_benchmark_smoke.mjs`
- `tools/engine-match/benchmark-mcts-score-bounds.mjs`
- `benchmarks/stage106_mcts_score_bounds_12empties_120ms_20260411.json`
- `benchmarks/stage106_mcts_score_bounds_12empties_280ms_20260411.json`
- `benchmarks/stage106_mcts_score_bounds_11empties_120ms_20260411.json`
- `benchmarks/stage106_mcts_score_bounds_11empties_280ms_20260411.json`
- `benchmarks/stage106_mcts_score_bounds_fixed_iteration_sanity_20260411.json`
- `benchmarks/stage106_mcts_score_bounds_adoption_summary_20260411.json`
