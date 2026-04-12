# Stage 100 - MCTS-Solver / late solved-value propagation

## 요약
이번 단계에서는 Stage 93에서 남겨 두었던 후보 중 **MCTS-Solver / late solved-value propagation**을 실제 런타임에 붙여 보고, 채택 여부를 판정했다.

결론은 다음과 같다.

- **채택**: late exact/WLD solved subtree propagation
- **기본값**: `mctsSolverEnabled = true`
- **기본 WLD 확장 폭**: `mctsSolverWldEmpties = 2`
- **해석**: 이 lane은 **exact-margin optimizer가 아니라 late certainty / WLD-first optimizer**로 해석해야 한다.

즉, `exactEndgameEmpties` 바깥의 MCTS 구간에서도 내부 subtree가 exact/WLD 창에 들어오면 solver probe를 허용하고, 증명된 값은 rollout 평균 위로 끌어올려 selection / backprop / root result까지 전파한다.

## 구현 범위

### 1. SearchEngine 쪽
`js/ai/search-engine.js`

- `solveStateForMcts(state, rootPlayer)` 추가
  - `empties <= exactEndgameEmpties`면 exact solve
  - `empties <= exactEndgameEmpties + mctsSolverWldEmpties`면 WLD solve
  - 결과를 root perspective의 `score / reward / outcome / principalVariation`로 정규화
- MCTS 진입 시 `solveState` callback 전달
- MCTS root가 solved result를 돌려주면
  - `mctsRootSolvedOutcome`
  - `mctsRootSolvedExact`
  - `mctsRootSolvedScore`
  를 `findBestMove()` 최종 결과까지 노출
- root special-ending scout가 이미 solved된 MCTS root result를 다시 penalty로 덮어쓰지 않도록 early return 추가
- forced-pass MCTS 경로의 completion 판정에서 `rawFinalResult` 오타를 `finalResult` 기준으로 수정

### 2. MCTS 쪽
`js/ai/mcts.js`

- node에 solved metadata 추가
  - `solvedOutcome`
  - `solvedReward`
  - `solvedScore`
  - `solvedBucket`
  - `solvedSource`
  - `solvedExact`
  - `solvedPrincipalVariation`
- solved-state cache 추가
  - `solvedByStateHash`
- terminal / exact / WLD solved record 생성기 추가
- selection score 계산에서 solved reward가 있으면 rollout 평균 대신 우선 사용
- rollout 중 late subtree가 solver window에 들어오면 heuristic cutoff보다 먼저 exact/WLD probe 수행
- child expansion 직후에도 solver probe 수행
- backprop 이후 child solved 상태를 부모로 역전파하는 `refreshSolvedStateFromChildren()` 추가
  - maximizing node는 proven win child 1개만 있어도 즉시 WLD proven 가능
  - 모든 child가 solved면 draw/exact propagation까지 가능
- root result에 solved metadata를 싣고, solved child는 threat-penalty보다 solved score를 우선 사용하도록 조정

### 3. 검증 도구 / 테스트
추가 파일:

- `tools/engine-match/benchmark-mcts-solver-late-accuracy.mjs`
- `js/test/stage100_mcts_solver_runtime_smoke.mjs`
- `js/test/stage100_mcts_solver_late_accuracy_smoke.mjs`

도구는 late position 묶음에서 solver off/on을 exact reference와 비교해 다음을 집계한다.

- exact-best hit rate
- WLD agreement rate
- proven rate (`isExactResult || isWldResult`)
- chosen move의 exact score loss
- MCTS iteration / tree node / solver probe 통계

## 벤치 설정
공식 비교는 아래 설정으로 돌렸다.

- 알고리즘: `mcts-hybrid`
- `exactEndgameEmpties = 8`
- `mctsSolverWldEmpties = 2`
- `wldPreExactEmpties = 0`
- `maxDepth = 4`
- seed: `17, 31, 41, 53`
- late buckets: `9, 10, 11, 12 empties`
- time bucket: `40ms`, `120ms`
- exact reference: classic exact root search

산출물:

- `benchmarks/stage100_mcts_solver_late_accuracy_40ms_20260410.json`
- `benchmarks/stage100_mcts_solver_late_accuracy_20260410.json`
- `benchmarks/stage100_mcts_solver_adoption_summary_20260410.json`

## 핵심 결과

### Topline (40ms)
- solver off
  - exact-best hit: `12 / 16 = 75.0%`
  - WLD agreement: `15 / 16 = 93.75%`
  - proven: `0 / 16 = 0%`
- solver on
  - exact-best hit: `11 / 16 = 68.75%`
  - WLD agreement: `16 / 16 = 100%`
  - proven: `15 / 16 = 93.75%`

### Topline (120ms)
- solver off
  - exact-best hit: `13 / 16 = 81.25%`
  - WLD agreement: `15 / 16 = 93.75%`
  - proven: `0 / 16 = 0%`
- solver on
  - exact-best hit: `11 / 16 = 68.75%`
  - WLD agreement: `16 / 16 = 100%`
  - proven: `16 / 16 = 100%`

### bucket별 관찰

#### 9 empties
- solver on은 exact-best를 **보존**했다.
- proven rate는 `100%`가 되었고, 평균 iteration은
  - `40ms`: `59 -> 3.5`
  - `120ms`: `189.25 -> 3.5`
  로 크게 줄었다.
- exact child가 바로 reachable한 구간에서는 이번 lane이 가장 깔끔하게 이득을 준다.

#### 10 empties
- solver on은 WLD agreement를 `75% -> 100%`로 끌어올렸지만,
  exact-best hit는 낮아졌다.
- 이유는 root가 proven win/loss를 찾는 순간 WLD 기준으로는 충분하므로 더 큰 exact margin을 찾기 위해 다른 proven child를 끝까지 뒤지지 않기 때문이다.
- 대신 평균 iteration은
  - `40ms`: `60.5 -> 2.25`
  - `120ms`: `190.25 -> 2.25`
  로 극적으로 줄었다.

#### 11 empties
- `120ms` 기준으로 solver on이 off보다 더 좋은 exact-best/WLD 결과를 낸 샘플도 있었다.
  - exact-best hit: `50% -> 75%`
  - WLD agreement: `75% -> 100%`
  - average exact score loss: `40000 -> 5000`
- 즉, 이 lane은 항상 “정확도 희생”으로만 읽으면 안 되고, low-iteration proof가 root choice 자체를 더 안정화하는 샘플도 있다.

#### 12 empties
- solver on은 여전히 strong WLD lane으로 동작했지만, exact margin tie-break는 일관되게 개선되지 않았다.
- 다만 `40ms`에서는 average exact score loss가 `15000 -> 5000`으로 오히려 좋아졌고, proven rate도 `75%`까지 올라갔다.

## 판정
**채택**한다.

단, 채택 의미를 다음처럼 제한해서 해석한다.

1. **채택 대상은 late certainty / WLD optimization**이다.
2. 이 lane은 `exactEndgameEmpties` 밖에서 exact search를 대체하는 것이 아니라, 그 바로 바깥 MCTS 내부에서 subtree proof를 끌어오는 장치다.
3. 따라서 exact margin을 끝까지 따져야 하는 책임은 여전히 `exactEndgameEmpties` 경계 안쪽의 classic exact lane에 남겨 둔다.

실전적 의미는 다음과 같다.

- 증명 가능한 late subtree를 rollout 평균에 묻어 두지 않는다.
- root가 proven win/loss/draw가 되면 결과를 바로 UI/호출부에 알려줄 수 있다.
- 특히 low-time budget에서 “맞는 WLD 판정”과 “빠른 종료”가 좋아진다.

반대로 남는 단점도 명확하다.

- root가 proven win/loss가 된 뒤에는 **exact-margin continuation**이 없다.
- 그래서 여러 winning move가 있는 자리에서는 best-margin move 대신 first-proven move에 멈출 수 있다.

이 부분은 Stage 101 이후 후속 후보로 남긴다.

## PN/PPN 계획에 대한 현재 판단
이번 단계가 끝나면서 PN/PPN을 붙일 위치는 전보다 훨씬 명확해졌다.

추천 방향은 다음과 같다.

- **전 게임 top-level AI 모드로 바로 노출하지 않는다.**
- 먼저 **late solved-subtree lane** 위에 붙인다.

구체적으로는 아래 attachment point가 자연스럽다.

1. **solver window 내부 frontier selection**
   - 현재는 subtree가 late window에 들어오면 exact/WLD probe를 한 뒤 solved value를 역전파한다.
   - 여기서 아직 root가 proof되지 않은 경우, frontier child 확장 우선순위를 PN/PPN류의 proof/disproof metric으로 보조할 수 있다.

2. **late analysis / advanced option**
   - 웹 UI나 앱에서 “late proof assist” 혹은 “proved subtree” 성격의 고급 옵션으로 붙이는 편이 자연스럽다.
   - 즉, 기본 난이도 모드가 아니라 **말기 증명 보조 모드**로 소개하는 것이 안정적이다.

3. **root solved metadata 시각화**
   - 이미 root 결과에 solved outcome/exact 여부가 올라오기 시작했으므로, 이후 PN/PPN을 도입하면 proof/disproof 진행률이나 subtree proof source를 UI에 붙일 수 있다.

이번 Stage에서는 PN/PPN 자체는 아직 넣지 않았다.
하지만 **붙일 자리**는 사실상 이번 단계에서 마련되었다고 봐도 된다.

## 후속 후보
- root WLD proof 이후 **exact-margin continuation**
- PN/PPN late-solver attachment prototype
- solved subtree에 대한 UI annotation (`proved`, `exact`, `WLD`, proof source)
- transposition-aware solved-subtree cache 확장 여부 재검토

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

## 최종 메모
이번 Stage는 “MCTS를 exact search로 바꿨다”가 아니라,
**MCTS 내부에서 late subtree가 증명 가능해지는 순간 그 값을 실제로 믿고 전파하기 시작했다**는 의미를 가진다.

그래서 이 단계는 PN/PPN을 바로 공개 모드로 넣는 단계라기보다,
**나중에 PN/PPN을 가장 자연스럽게 붙일 수 있는 late solved-subtree substrate를 마련한 단계**로 보는 것이 맞다.
