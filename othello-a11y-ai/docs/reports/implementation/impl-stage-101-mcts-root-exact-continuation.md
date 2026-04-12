# Stage 101 - MCTS root exact continuation after proof

## 요약
이번 단계에서는 Stage 100에서 남겨 두었던 후속 후보 중 **root WLD proof 이후 exact-margin continuation**을 실제 런타임에 붙여 보고, 채택 여부를 판정했다.

결론은 다음과 같다.

- **채택**: MCTS root exact continuation after proof
- **기본값**: `mctsExactContinuationEnabled = true`
- **기본 추가 창**: `mctsExactContinuationExtraEmpties = 2`
- **해석**: 이 lane은 Stage 100의 late proof를 버리는 것이 아니라, **이미 얻은 root proof를 출발점으로 같은 deadline 안에서 exact root search를 한 번 더 이어 붙여 exact result로 승격할 수 있으면 승격하는 장치**다.

즉, 이번 단계의 핵심은 MCTS 내부 selection 정책을 다시 바꾸는 데 있지 않다.
먼저 Stage 100 solver가 만든 root solved result를 확보하고, 그 결과가 아직 non-exact라면, `exactEndgameEmpties + mctsExactContinuationExtraEmpties` 범위 안에서 **남은 시간으로 exact root continuation을 시도**한다.
완주되면 exact score / exact best move / analyzed move ordering을 exact 결과로 교체하고, 완주되지 못하면 기존 proven WLD result를 그대로 유지한다.

## 왜 이 절편을 먼저 택했는가
Stage 100의 약점은 분명했다.

- WLD proof는 빨리 잡히지만
- 여러 winning move가 있는 자리에서는 first-proven move에서 멈추어
- exact margin 기준 best move를 끝까지 재평가하지 못할 수 있었다.

이 약점을 줄이는 방법은 크게 두 가지였다.

1. MCTS 내부에 exact-margin continuation 논리를 더 깊게 섞는다.
2. root proof가 난 뒤, 별도의 exact root search를 같은 deadline 안에서 한 번 더 돌린다.

이번 단계에서는 2번을 택했다. 이유는 다음과 같다.

- Stage 100의 proof logic을 그대로 유지할 수 있다.
- 기존 exact root search (`searchRoot`)를 그대로 재사용할 수 있다.
- “증명은 이미 끝난 상태에서, 남은 시간으로 exact margin만 정리한다”는 의미가 명확하다.
- PN/PPN 실험을 나중에 붙이더라도, late solved-subtree lane과 exact continuation lane을 분리해 두는 편이 구조적으로 깔끔하다.

## 구현 범위

### 1. SearchEngine 옵션 / 통계 추가
`js/ai/search-engine.js`

추가 옵션:

- `mctsExactContinuationEnabled`
- `mctsExactContinuationExtraEmpties`

기본값:

- `mctsExactContinuationEnabled = true`
- `mctsExactContinuationExtraEmpties = 2`

추가 통계:

- `mctsExactContinuationRuns`
- `mctsExactContinuationCompletions`
- `mctsExactContinuationTimeouts`
- `mctsExactContinuationBestMoveChanges`

### 2. root proof 이후 exact continuation 추가
`js/ai/search-engine.js`

추가 메서드:

- `shouldRunMctsExactContinuation(rootEmptyCount, rootResult)`
- `applyMctsExactContinuationToRootResult(state, legalMoves, rootResult, rootEmptyCount)`

동작 요약:

1. MCTS root result가 이미 solved outcome을 가지고 있는지 확인한다.
2. 그 결과가 아직 exact가 아니고,
   `rootEmptyCount <= exactEndgameEmpties + mctsExactContinuationExtraEmpties` 조건을 만족하면 continuation을 시도한다.
3. continuation은 **같은 deadline 안에서** `searchRoot(...)`를 다시 태우는 방식으로 실행한다.
4. exact root search가 완주되면
   - root result를 exact result로 승격하고
   - analyzed move 목록을 exact score 기준으로 다시 정렬하고
   - `mctsRootSolvedExact = true`
   - `mctsRootSolvedSource = 'exact-continuation'`
   - `mctsRootSolvedScore = exact score`
   로 교체한다.
5. exact continuation이 시간 내에 끝나지 않으면, 기존 proven WLD root result를 그대로 유지한다.

### 3. MCTS 최종 루트 결과 적용 순서 조정
`js/ai/search-engine.js`

MCTS 최종 결과 처리 흐름을 다음처럼 바꾸었다.

- 이전: `mctsRawResult -> applySpecialEndingScoutToRootResult(...)`
- 이후: `mctsRawResult -> applyMctsExactContinuationToRootResult(...) -> applySpecialEndingScoutToRootResult(...)`

즉, special ending scout보다 먼저 exact continuation을 적용해, 이미 exact로 승격된 result가 후속 penalty 처리에 불필요하게 덮이지 않도록 했다.

### 4. Stage 100 benchmark/test 의미 고정
Stage 101을 도입하면서도 Stage 100의 solver-only 비교 의미가 바뀌지 않도록, 기존 도구와 스모크 테스트에는 exact continuation을 명시적으로 꺼 두었다.

수정 파일:

- `tools/engine-match/benchmark-mcts-solver-late-accuracy.mjs`
- `js/test/stage100_mcts_solver_runtime_smoke.mjs`

이렇게 해서 Stage 100 결과는 여전히 “solver off vs solver on” 비교로 유지되고, Stage 101 효과는 새로운 benchmark에서만 따로 보게 했다.

### 5. 새 benchmark / smoke test 추가
추가 파일:

- `tools/engine-match/benchmark-mcts-exact-continuation.mjs`
- `js/test/stage101_mcts_exact_continuation_runtime_smoke.mjs`
- `js/test/stage101_mcts_exact_continuation_benchmark_smoke.mjs`

새 benchmark는 아래 두 구성을 exact reference와 비교한다.

- `continuationOff`
- `continuationOn`

집계 항목:

- exact-best hit rate
- exact-result rate
- WLD agreement rate
- proven rate
- continuation applied rate
- best-move-change rate
- continuation stats average

## 벤치 설정
공식 비교는 아래 설정으로 돌렸다.

- 알고리즘: `mcts-hybrid`
- `exactEndgameEmpties = 8`
- `mctsSolverWldEmpties = 2`
- `mctsExactContinuationExtraEmpties = 2`
- `wldPreExactEmpties = 0`
- `maxDepth = 4`
- seed: `17, 31, 41, 53`
- late buckets: `9, 10 empties`
- time bucket: `120ms`, `280ms`
- exact reference: classic exact root search

산출물:

- `benchmarks/stage101_mcts_exact_continuation_120ms_20260410.json`
- `benchmarks/stage101_mcts_exact_continuation_280ms_20260410.json`
- `benchmarks/stage101_mcts_exact_continuation_adoption_summary_20260410.json`

## 핵심 결과

### Topline (120ms)
- continuation off
  - exact-best hit: `6 / 8 = 75.0%`
  - exact-result: `2 / 8 = 25.0%`
  - WLD agreement: `8 / 8 = 100%`
  - proven: `8 / 8 = 100%`
- continuation on
  - exact-best hit: `6 / 8 = 75.0%`
  - exact-result: `5 / 8 = 62.5%`
  - WLD agreement: `8 / 8 = 100%`
  - proven: `8 / 8 = 100%`
  - continuation applied: `3 / 8 = 37.5%`
  - best move changed: `1 / 8 = 12.5%`

해석:

- `120ms`에서는 exact-result rate가 분명히 올라간다.
- 다만 exact-best hit rate는 그대로다.
- 원인은 `10 empties` 구간에서 exact continuation이 세 자리에서 아직 deadline 안에 완주되지 못했기 때문이다.

### Topline (280ms)
- continuation off
  - exact-best hit: `6 / 8 = 75.0%`
  - exact-result: `2 / 8 = 25.0%`
  - WLD agreement: `8 / 8 = 100%`
  - proven: `8 / 8 = 100%`
- continuation on
  - exact-best hit: `8 / 8 = 100%`
  - exact-result: `8 / 8 = 100%`
  - WLD agreement: `8 / 8 = 100%`
  - proven: `8 / 8 = 100%`
  - continuation applied: `6 / 8 = 75.0%`
  - best move changed: `4 / 8 = 50.0%`

해석:

- `280ms`에서는 exact continuation이 이번 deterministic 9~10 empties suite에서 완전히 의미를 가진다.
- continuation off가 놓치던 exact best move를 continuation on이 모두 회복했다.
- 특히 `10 empties` bucket에서
  - exact-best hit: `50% -> 100%`
  - exact-result: `0% -> 100%`
  - average exact score loss: `15000 -> 0`
  로 개선되었다.

## bucket별 관찰

### 9 empties
- continuation off도 일부는 이미 exact였다.
- 하지만 continuation on은 WLD-only result를 모두 exact로 승격해 `exactResultRate = 100%`를 만들었다.
- exact-best hit는 `120ms`, `280ms` 모두 `100%`를 유지했다.

### 10 empties
- 이번 후보의 진짜 시험대는 여기였다.
- continuation off는 WLD proof에는 성공하지만, exact margin 기준 최선 수를 끝까지 회수하지 못하는 샘플이 남아 있었다.
- continuation on은
  - `120ms`에서는 일부만 승격되어 exact-result 개선에 머물렀고
  - `280ms`에서는 전 샘플 exact solve에 도달해 exact-best miss를 제거했다.

## 판정
**채택**한다.

단, 이 채택은 다음처럼 해석하는 편이 정확하다.

1. 이번 lane은 Stage 100의 proof logic을 대체하지 않는다.
2. 이미 확보한 root proof를 바탕으로, **남은 시간으로 exact margin을 정리하는 late exactifier**다.
3. 따라서 효과는 budget 의존적이다.
   - 낮은 custom budget에서는 exact-result rate 개선이 더 두드러지고
   - 현재 실제 사용자 노출 구간인 `easy` 이상(`280ms` 이상)에서는 exact-best까지 실질적으로 회복된다.

이번 저장소 기준으로는 MCTS가 UI에서 `easy` 이상에서 노출되므로, 기본값 활성화 판단은 충분히 정당하다.

## PN/PPN에 대한 현재 판단
이번 단계가 끝나면서 PN/PPN을 붙일 위치는 더 또렷해졌다.

- **전 게임 top-level proof-number 모드**를 곧바로 노출하는 것보다
- **기존 late solved-subtree lane 안에서 proof-priority policy를 보조적으로 붙이는 방향**이 더 자연스럽다.

즉, 순서는 아래처럼 보는 것이 맞다.

1. Stage 100: late subtree proof를 실제 runtime value로 전파
2. Stage 101: root proof 뒤 exact continuation으로 exact margin 회수
3. 다음 후보: PN/PPN류 proof-priority frontier selection을 late lane 안에 attachment

이렇게 보면 PN/PPN은 “새 엔진 모드”라기보다, **이미 마련된 late solver / continuation substrate 위에 얹는 고급 proof bias**로 해석하는 편이 안정적이다.

## 후속 후보
- PN/PPN late-lane prototype
- proved/exact root metadata UI 노출
- root continuation window를 empties / branching factor / remaining time 기준으로 더 정교하게 조건화할지 검토
- solved-subtree cache 확장과 transposition-aware late lane 재검토

## 회귀 / 검증
실행 확인:

- `node js/test/core-smoke.mjs`
- `node js/test/stage88_mcts_lite_smoke.mjs`
- `node js/test/stage89_mcts_guided_smoke.mjs`
- `node js/test/stage90_search_algorithm_pair_benchmark_smoke.mjs`
- `node js/test/stage91_mcts_hybrid_smoke.mjs`
- `node js/test/stage91_search_algorithm_pair_hybrid_smoke.mjs`
- `node js/test/stage92_search_algorithm_pair_multiseed_smoke.mjs`
- `node js/test/stage93_search_algorithm_availability_and_throughput_smoke.mjs`
- `node js/test/stage94_special_ending_scout_smoke.mjs`
- `node js/test/stage95_immediate_wipeout_guard_smoke.mjs`
- `node js/test/stage96_mcts_immediate_wipeout_bias_smoke.mjs`
- `node js/test/stage97_mcts_root_threat_penalty_smoke.mjs`
- `node js/test/stage98_special_ending_regression_suite.mjs`
- `node js/test/stage100_mcts_solver_runtime_smoke.mjs`
- `node js/test/stage100_mcts_solver_late_accuracy_smoke.mjs`
- `node js/test/stage101_mcts_exact_continuation_runtime_smoke.mjs`
- `node js/test/stage101_mcts_exact_continuation_benchmark_smoke.mjs`

## 최종 메모
이번 Stage는 “proof가 났다”에서 멈추지 않고,
**proof가 난 root를 exact margin까지 가능한 범위에서 바로 끌어올리는 연결부**를 마련한 단계다.

그래서 이번 단계의 의미는 단순한 말기 정확도 향상보다,
**late proof lane과 exact lane을 같은 runtime budget 안에서 접속시키는 구조를 확보했다**는 데 있다.
이 구조 위에서 다음 단계의 PN/PPN 실험도 훨씬 자연스럽게 진행할 수 있다.
