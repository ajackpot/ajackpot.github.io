# Stage 108 - score-bounded draw-blocker priority와 마지막 채택 판정

## 요약
이번 단계의 목표는 Stage 107까지 experimental opt-in으로 남겨 둔 **score-bounded late lane**을 마지막으로 한 번 더 밀어 보면서,
이 축에서 더 얻을 것이 있는지 판정하는 것이었습니다.

결론은 다음과 같습니다.

- **채택한 것**
  - `mctsScoreBoundsEnabled = true`인 experimental lane 안에 **draw-blocker priority bonus**를 추가했습니다.
  - lane 내부 기본값으로 `mctsScoreBoundDrawPriorityScale = 0.35`를 채택했습니다.
  - 관련 telemetry / summary / benchmark / smoke를 추가했습니다.
- **채택하지 않은 것**
  - `mctsScoreBoundsEnabled = true`의 **전역 기본값 승격**
- **현재 기본값**
  - `mctsScoreBoundsEnabled = false`
  - 다만 score-bounds lane을 켰을 때는 내부 기본 `draw-blocker x0.35`가 함께 적용됩니다.

즉 이번 Stage 108은 “score-bounds를 전역 기본 경로로 올릴지”가 아니라,
**이 experimental lane이 draw exact closure 쪽에서 마지막으로 얻을 수 있는 실질 신호를 더 얻고도 전역 승격까지는 못 간다**는 점을 확인한 단계입니다.

## 왜 이 후보를 봤는가
Stage 106과 Stage 107의 score-bounds는 다음 두 가지는 해냈습니다.

1. root / child score lower/upper bound를 실제로 유지한다.
2. dominated child cut이 실제 traversal에 연결된다.

하지만 아직 selection 쪽에는 빈틈이 남아 있었습니다.

- draw root 또는 draw-like late subtree에서
- 이미 `draw는 확보`했지만
- exact `0`으로 완전히 닫히지 못하게 막는 child 몇 개가 남아 있을 때,
- 그 **blocker child**를 selection이 별도로 더 앞당겨 주지는 않았다.

그래서 이번 Stage 108의 질문은 다음과 같았습니다.

> score-bounds experimental lane 안에서,
> exact `0`을 방해하는 late blocker child를 조금 더 세게 밀면
> draw exact closure / proof completion이 실제로 좋아지는가?

## 구현 내용

### 1) `js/ai/mcts.js`
score-bounds와 proof-priority 사이에 새로운 **draw-blocker ranking**을 추가했습니다.

핵심 아이디어는 다음과 같습니다.

- 최대화 노드에서 `lower = 0`, `upper > 0`이면
  - 이 노드는 이미 최소한 draw는 확보했지만,
  - 아직 exact `0`으로 닫히지 않았다는 뜻입니다.
  - 이때 `upper > 0`인 child가 exact draw closure를 막는 blocker입니다.
- 최소화 노드에서 `upper = 0`, `lower < 0`이면
  - 반대 방향의 blocker는 `lower < 0`인 child입니다.

이 조건에서만 rank-normalized bonus를 주고,
late lane 바깥이나 일반 win/loss subtree에서는 bonus가 들어가지 않게 했습니다.

추가된 주요 함수/필드:
- `buildScoreBoundDrawPriorityRanking()`
- `shouldApplyScoreBoundDrawPriorityAtNode()`
- selection score의 `scoreBoundDrawPriorityTerm`
- root / analyzed move annotation
  - `mctsScoreBoundDrawPriorityEnabled`
  - `mctsScoreBoundDrawPriorityScale`
  - `mctsScoreBoundDrawPriorityMode`
  - `mctsScoreBoundDrawPriorityBlockerCount`

### 2) `js/ai/search-engine.js`
score-bounds lane 내부 기본 draw priority scale을 **`0.35`**로 올렸습니다.
다만 `mctsScoreBoundsEnabled`가 여전히 `false`가 기본값이므로,
이 변화는 score-bounds lane을 명시적으로 켰을 때만 의미가 있습니다.

또한 telemetry / stats도 함께 연결했습니다.

새 stats:
- `mctsScoreBoundDrawPrioritySelectionNodes`
- `mctsScoreBoundDrawPriorityRankedChildren`
- `mctsScoreBoundDrawPriorityBlockerChildren`

### 3) `js/ui/formatters.js`
score-bounds lane이 켜지고 draw-blocker bonus가 활성일 때,
옵션 요약과 proof summary에
- `draw-blocker x...`
- `blockers ...`
메모가 붙도록 했습니다.

### 4) 새 benchmark / smoke 추가
새 도구:
- `tools/engine-match/benchmark-mcts-score-bound-draw-priority.mjs`
- `tools/engine-match/benchmark-mcts-score-bound-draw-priority-fixed-iterations.mjs`

새 smoke:
- `js/test/stage108_mcts_score_bound_draw_priority_runtime_smoke.mjs`
- `js/test/stage108_mcts_score_bound_draw_priority_benchmark_smoke.mjs`

runtime smoke는 대표 draw seed에서
- off는 exact draw를 닫지 못하고
- `x0.5`는 exact draw를 닫으며
- draw priority stats가 실제로 올라가고
- dominated traversal selections는 여전히 `0`
인 것을 확인합니다.

## 벤치 설계

### A. formal time-budget benchmark
`12 empties`, `24 seeds`, classic exact reference

- budgets: `120ms`, `280ms`
- variants:
  - off (`0`)
  - `x0.2`
  - `x0.35`
  - `x0.5`

### B. fixed-iteration benchmark
`12 empties`, `12 seeds`, classic exact reference

- iteration budgets: `24`, `32`
- variants:
  - off (`0`)
  - `x0.35`
  - `x0.5`

이 두 축을 같이 본 이유는 간단합니다.

- time-budget benchmark는 실제 앱/웹 런타임에 더 가깝고
- fixed-iteration benchmark는 host timing noise를 걷어낸 algorithmic signal을 보여 줍니다.

## 결과

### 1) formal 120ms - exact-best는 그대로, `x0.35`만 약간 더 안전
전체 24-seed 결과:

- off
  - exact-best `15/24 = 62.5%`
  - proven `15/24 = 62.5%`
  - exact-result `0/24 = 0%`
  - average score loss `25000`
- `x0.35`
  - exact-best `15/24 = 62.5%`
  - proven `15/24 = 62.5%`
  - exact-result `0/24 = 0%`
  - average score loss `21666.67`
- `x0.5`
  - exact-best `15/24 = 62.5%`
  - proven `15/24 = 62.5%`
  - exact-result `0/24 = 0%`
  - average score loss `25000`

즉 120ms에서는 draw-blocker bonus가 **exact-best를 올리지는 못했습니다.**
다만 `x0.35`는 같은 exact-best / proven 상태에서 average score loss를 조금 더 낮췄고,
`x0.2`는 오히려 proven과 score loss가 약간 흔들렸습니다.

여기서 읽을 수 있는 것은 다음입니다.

- 너무 약한 scale은 확실한 이득이 없다.
- 너무 강한 scale은 낮은 budget에서 굳이 더 낫지 않다.
- `x0.35`가 120ms 기준으로는 가장 무난하다.

### 2) formal 280ms - draw exact closure는 분명히 좋아짐
전체 24-seed 결과:

- off
  - exact-best `15/24 = 62.5%`
  - proven `20/24 = 83.3%`
  - exact-result `2/24 = 8.3%`
  - average score loss `20833.33`
- `x0.35`
  - exact-best `15/24 = 62.5%`
  - proven `21/24 = 87.5%`
  - exact-result `3/24 = 12.5%`
  - average score loss `20833.33`
- `x0.5`
  - exact-best `15/24 = 62.5%`
  - proven `21/24 = 87.5%`
  - exact-result `3/24 = 12.5%`
  - average score loss `20833.33`

즉 `280ms`에서는 `x0.35`와 `x0.5`가 모두
- exact-best는 그대로 유지하면서
- proven / exact-result를 한 칸 더 올렸습니다.

특히 draw subset(4 positions)에서는:

- off
  - proven `50%`
  - exact-result `50%`
  - average root bound width `320000`
- `x0.35`
  - proven `75%`
  - exact-result `75%`
  - average root bound width `160000`
- `x0.5`
  - proven `75%`
  - exact-result `75%`
  - average root bound width `160000`

즉 이번 정책의 실질 이득은 **draw root exact closure 가속**으로 읽는 것이 맞습니다.

### 3) fixed-iteration benchmark - `x0.5`가 조금 더 강하지만, time-budget 우세는 아님
#### 24 iterations
- off
  - proven `75.0%`
  - exact-result `16.7%`
  - average root bound width `580833.33`
- `x0.35`
  - proven `83.3%`
  - exact-result `25.0%`
  - average root bound width `527500`
- `x0.5`
  - proven `91.7%`
  - exact-result `33.3%`
  - average root bound width `474166.67`

#### 32 iterations
- off
  - proven `83.3%`
  - exact-result `25.0%`
  - average root bound width `527500`
- `x0.35`
  - proven `91.7%`
  - exact-result `33.3%`
  - average root bound width `474166.67`
- `x0.5`
  - proven `91.7%`
  - exact-result `33.3%`
  - average root bound width `474166.67`

즉 fixed-iteration만 보면 `x0.5`가 24-iteration draw closure 쪽에서 조금 더 강합니다.
하지만 formal time-budget benchmark에서는 `x0.35`가 `280ms`에서 같은 결과를 내고,
`120ms`에서는 더 보수적으로 안정적이었습니다.

그래서 lane 내부 기본값은 **`0.35`**로 두는 편이 더 안전합니다.

## 최종 판정

### 채택
- score-bounds experimental lane 안의 **draw-blocker priority bonus**
- lane 내부 기본 `mctsScoreBoundDrawPriorityScale = 0.35`
- 새 telemetry / summary / benchmark / smoke

### 비채택
- `mctsScoreBoundsEnabled = true`의 **전역 기본값 승격**

### 현재 해석
이번 Stage 108이 보여 준 것은,
score-bounds-only 축에서 아직 남아 있던 실질 후보는 **draw exact closure 우선순위** 정도였고,
그것은 실제로 late lane 안에서 의미 있는 개선을 냈다는 점입니다.

하지만 동시에 분명해진 것도 있습니다.

- exact-best hit를 robust하게 올리는 신호는 끝내 나오지 않았다.
- 이 축의 남은 이득은 주로 **draw / near-draw subtree closure**에 국한된다.
- 따라서 score-bounds를 전역 기본 경로로 승격할 근거는 아직 없다.

즉 Stage 108은 **score-bounds-only 개선을 여기서 한 번 마무리하고,
다음 단계부터는 PN/PPN 쪽으로 다시 돌아가는 것이 맞다**는 판정까지 포함합니다.

## 검증
이번 단계에서 직접 확인한 항목:

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
- `node js/test/stage105_mcts_generalized_proof_metric_runtime_smoke.mjs`
- `node js/test/stage105_mcts_generalized_proof_metric_benchmark_smoke.mjs`
- `node js/test/stage106_mcts_score_bounds_runtime_smoke.mjs`
- `node js/test/stage106_mcts_score_bounds_benchmark_smoke.mjs`
- `node js/test/stage107_mcts_true_score_bounds_runtime_smoke.mjs`
- `node js/test/stage107_mcts_true_score_bounds_benchmark_smoke.mjs`
- `node js/test/stage108_mcts_score_bound_draw_priority_runtime_smoke.mjs`
- `node js/test/stage108_mcts_score_bound_draw_priority_benchmark_smoke.mjs`

모두 통과했습니다.
