# Stage 107 - true score-bounded late lane correction과 채택 판정

## 요약
이번 단계의 목표는 Stage 106에서 experimental opt-in으로 남겨 둔 **score-bounded late lane**을 다시 들여다보고,
실제로 이 lane이 “보이는 정보만 늘리는 층”인지, 아니면 **selection / traversal 자체에도 영향을 주는 진짜 late-lane policy**인지 확인하는 것이었습니다.

결론은 다음과 같습니다.

- **채택한 것**
  - `mctsScoreBoundsEnabled = true`일 때 dominated-child cut이 **실제 traversal**에 반영되도록 수정했습니다.
  - proof-priority ranking도 surviving frontier 기준으로 다시 계산하게 했습니다.
  - traversal invariant를 확인하는 새 stats / smoke / fixed-iteration benchmark를 추가했습니다.
- **채택하지 않은 것**
  - `mctsScoreBoundsEnabled = true`의 **기본값 승격**
- **현재 기본값**
  - `mctsScoreBoundsEnabled = false`

즉 이번 Stage 107은 “score-bounded lane을 기본값으로 켤지”보다 먼저,
**experimental lane이 실제로 의도한 policy를 수행하도록 바로잡고, 그 수정된 lane을 다시 판정한 단계**입니다.

## 왜 다시 봐야 했는가
Stage 106 보고서와 코드를 다시 따라가 보니, score-bound lane에는 중요한 어긋남이 있었습니다.

- `getTraversableChildrenWithScoreBounds()`가 dominated child를 걸러 낸다.
- 그러나 `selectChildForTraversal()`은 그 결과를 계산만 하고, 실제 순회는 여전히 `node.children` 전체를 돌고 있었다.

즉 Stage 106의 `bound cut` 통계는 “이 child는 건너뛰어야 한다”고 계산은 하고 있었지만,
실제 selection loop는 **그 child를 여전히 고를 수 있는 상태**였습니다.

이 문제를 그대로 두면,
score-bounds는 telemetry와 post-hoc annotation에는 의미가 있어도,
정작 **search frontier shaping**에는 제대로 연결되지 않습니다.
그래서 이번 Stage 107의 질문은 다음과 같이 바뀌었습니다.

1. dominated-child cut을 실제 traversal에 연결하고,
2. proof-priority ranking도 그 surviving frontier 기준으로 정렬하게 만들면,
3. 수정된 experimental lane은 적어도 **무해하거나 소폭 유리한 방향**으로 움직이는가?

## 구현 내용

### 1) `js/ai/mcts.js`
핵심 수정은 두 가지입니다.

#### A. 실제 traversal이 traversable frontier를 따르도록 수정
기존에는:
- `traversableChildren = getTraversableChildrenWithScoreBounds(...)`
- 계산만 해 두고
- 실제 loop는 `for (const child of node.children)`

형태였습니다.

이번에는 selection이 실제로:
- `traversableChildren`
만 순회하도록 수정했습니다.

즉 score-bounds experimental lane이 켜졌을 때는 이제 **dominated child가 실제 traversal candidate에서 빠집니다.**

#### B. proof-priority ranking도 surviving frontier 기준으로 재계산
기존 root/selection proof-priority ranking은 node의 전체 child를 기준으로 rank를 계산했습니다.
이렇게 되면,
score-bound cut으로 사실상 탐색 대상에서 빠질 child가 섞여 있어도
proof-priority bonus의 상대적 rank가 희석됩니다.

이번에는 `buildProofPriorityRanking()`이 optional child list를 받을 수 있게 바꾸고,
selection에서는 **`traversableChildren` 기준으로 rank**를 다시 계산하게 했습니다.

즉 이제 score-bounds와 proof-priority는
- one lane은 dominated child를 건너뛰고,
- 다른 lane은 남은 frontier 안에서 rank bonus를 주는
형태로 **같은 frontier를 공유**합니다.

#### C. traversal invariant stats 추가
새 stats:
- `mctsScoreBoundTraversalFilteredNodes`
- `mctsScoreBoundDominatedTraversalSelections`

의도:
- filtered frontier가 실제로 한 번이라도 생겼는지
- 그리고 그 상태에서 selection이 dominated child를 고른 적이 있었는지

를 분리해서 보게 했습니다.

Stage 107의 핵심 invariant는 다음입니다.

> `mctsScoreBoundDominatedTraversalSelections`는 항상 `0`이어야 한다.

이 값이 0이 아니면, “cut을 계산은 했지만 selection이 다시 dominated child를 골랐다”는 뜻이므로,
Stage 106에서 발견된 문제와 같은 종류의 오류가 재발한 것입니다.

### 2) `js/ai/search-engine.js`
proof telemetry가 새 traversal invariant stats를 함께 들고 가도록 연결했습니다.
직접 UI에 새 줄을 추가하지는 않았지만,
runtime 결과 / benchmark JSON / smoke에서
- traversal filtered nodes
- dominated traversal selections
를 확인할 수 있게 만들었습니다.

### 3) `tools/engine-match/benchmark-mcts-score-bounds.mjs`
기존 time-budget benchmark에도 새 stats를 함께 실었습니다.
그래서 120ms / 280ms validation에서
- bound cut count
- traversal filtered count
- dominated traversal selection count
를 한 번에 볼 수 있습니다.

### 4) 새 fixed-iteration benchmark 추가
새 도구:
- `tools/engine-match/benchmark-mcts-score-bounds-fixed-iterations.mjs`

이유는 간단합니다.
Stage 106~107 경계의 차이는 12 empties late lane이라도 host load / JIT / bookkeeping overhead의 영향을 받기 쉽습니다.
따라서 “정말 policy가 좋아졌는지”를 보려면,
같은 time budget이 아니라 **같은 iteration budget**으로 off/on을 직접 비교할 필요가 있습니다.

이번 fixed-iteration benchmark는
- `12 empties`
- 12 seeds
- iterations `8 / 12 / 16 / 24 / 32 / 48`

를 기준으로 off/on을 비교합니다.

### 5) 새 smoke 추가
- `js/test/stage107_mcts_true_score_bounds_runtime_smoke.mjs`
- `js/test/stage107_mcts_true_score_bounds_benchmark_smoke.mjs`

runtime smoke에서는 실제로 bound cut이 발생하는 draw-case에서
- `mctsScoreBoundTraversalFilteredNodes > 0`
- `mctsScoreBoundDominatedTraversalSelections == 0`
- `mctsProofPriorityRankedChildren(on) < off`
를 확인합니다.

즉 “filtered frontier가 생겼고, ranking도 그 frontier 기준으로 줄었으며,
selection은 dominated child를 다시 고르지 않았다”를 한 번에 체크합니다.

## 벤치 설계

### A. time-budget validation (`12 empties`, 24 seeds)
현재 late lane에서 score-bounds가 실질적으로 살아 있는 곳은 사실상 `12 empties` 근방이므로,
이번 time benchmark는 그 구간에 집중했습니다.

- empties: `12`
- seeds: `15,17,31,41,47,53,71,89,107,123,149,167,191,223,257,281,307,331,359,383,419,443,467,491`
- budgets: `120ms`, `280ms`
- off vs on
- reference: classic exact search

### B. fixed-iteration validation (`12 empties`, 12 seeds)
- empties: `12`
- seeds: `15,17,31,41,47,53,71,89,107,123,149,167`
- iterations: `8,12,16,24,32,48`
- off vs on
- same exact reference

이 benchmark는 “host timing noise를 걷어낸 algorithmic signal”을 보는 용도입니다.

## 결과

### 1) 24-seed time benchmark - 120ms
- off
  - exact-best `15/24 = 62.5%`
  - WLD agreement `22/24 = 91.7%`
  - proven `15/24 = 62.5%`
  - average score loss `29166.67`
- on
  - exact-best `15/24 = 62.5%`
  - WLD agreement `22/24 = 91.7%`
  - proven `16/24 = 66.7%`
  - average score loss `23333.33`

즉 120ms에서는 **exact-best는 동률**, WLD도 동률이었고,
root proof / score-loss 쪽이 **아주 소폭 좋아졌습니다.**

다만 중요한 점은,
이 120ms 24-seed suite에서는 traversal filtered count가 `0`이었습니다.
즉 이 구간의 소폭 개선을 “dominated-child cut activation 자체의 직접 효과”라고 과하게 읽으면 안 됩니다.
이 결과는 어디까지나 **neutral-to-slightly-better** 정도로 읽는 것이 안전합니다.

### 2) 24-seed time benchmark - 280ms
- off
  - exact-best `15/24 = 62.5%`
  - WLD agreement `23/24 = 95.8%`
  - proven `20/24 = 83.3%`
  - average score loss `20833.33`
- on
  - exact-best `15/24 = 62.5%`
  - WLD agreement `23/24 = 95.8%`
  - proven `21/24 = 87.5%`
  - average score loss `20833.33`

여기서는 strength 지표가 대부분 **동률 또는 +1 proven** 정도였습니다.
하지만 Stage 107 correction의 핵심 evidence는 따로 있었습니다.

- traversal filtered count: `0 -> 3/24`
- dominated traversal selection count: `0`
- bound cut count: `0 -> 3/24`
- average root score-bound width: `1280000 -> 605416.67`
- average best-move score-bound width: `1280000 -> 578750`

즉 이제 score-bounded lane은
“bound cut을 계산만 하는 상태”가 아니라,
**실제로 filtered frontier를 만들고,
그 상태에서도 dominated child를 다시 고르지 않는 상태**가 되었습니다.

그리고 그 correction이 outcome을 악화시키지는 않았습니다.

### 3) fixed-iteration benchmark - 핵심 구간은 `24 iterations`
fixed-iteration benchmark에서 가장 중요한 bucket은 `24 iterations`였습니다.

#### 24 iterations
- off
  - exact-best `8/12 = 66.7%`
  - WLD agreement `12/12 = 100%`
  - proven `8/12 = 66.7%`
  - exact-result `1/12 = 8.3%`
- on
  - exact-best `8/12 = 66.7%`
  - WLD agreement `12/12 = 100%`
  - proven `9/12 = 75.0%`
  - exact-result `2/12 = 16.7%`

그리고 같은 bucket에서:
- traversal filtered count: `0 -> 4/12`
- dominated traversal selection count: `0`
- average proof-priority ranked children: `73.42 -> 69.00`
- average root score-bound width: `1280000 -> 580833.33`

즉 Stage 107 correction이 실제로 살아 있는 가장 명확한 증거는 이 bucket입니다.

- exact-best를 망치지 않았고,
- WLD도 그대로 유지했으며,
- proof completion과 exact-result를 **+1씩** 올렸고,
- traversal은 실제로 filtered frontier를 사용했습니다.

### 4) fixed-iteration - 낮은 iteration과 높은 iteration의 해석
#### 8 / 12 / 16 iterations
- off = on
  - exact-best 동일
  - WLD agreement 동일
  - proven 동일

즉 correction이 **낮은 iteration에서 무리하게 search choice를 망치지는 않았다**고 보는 편이 맞습니다.

#### 32 / 48 iterations
- off = on
  - exact-best 동일
  - WLD agreement 동일
  - proven 동일

즉 충분히 iteration이 커지면,
이미 solver/continuation lane이 대부분 정리하기 때문에
Stage 107 correction의 차이는 다시 사라집니다.

이것도 자연스러운 결과입니다.
이번 수정은 “12 empties late frontier shaping”에 가까운 correction이지,
전체 말기 엔진을 다른 알고리즘으로 바꾸는 패치는 아니기 때문입니다.

## 판정

### 채택한 것
- score-bounds experimental lane 안에서 dominated-child cut을 **실제 traversal**에 반영한 수정
- surviving frontier 기준 proof-priority ranking 재계산
- traversal invariant stats
  - `mctsScoreBoundTraversalFilteredNodes`
  - `mctsScoreBoundDominatedTraversalSelections`
- fixed-iteration benchmark 도구
- Stage 107 runtime / benchmark smoke

### 채택하지 않은 것
- `mctsScoreBoundsEnabled = true`의 기본값 승격

### 현재 기본값
- `mctsScoreBoundsEnabled = false`

## 왜 기본값은 계속 꺼 두는가
이번 Stage 107 결과를 한 줄로 요약하면 이렇습니다.

- **correction 자체는 옳다.**
  - 이제 score-bounds lane은 실제로 filtered frontier를 만든다.
  - dominated child를 다시 고르지 않는다는 invariant도 확인됐다.
- **하지만 기본값 승격까지는 아직 약하다.**
  - 12 empties 24-seed 120ms/280ms에서 exact-best는 동률이었다.
  - fixed-iteration에서도 24-iteration bucket에서 proof completion 개선은 있었지만, robust exact-best win까지는 가지 않았다.

즉 Stage 107은 “score-bounded late lane을 기본으로 켜도 된다”라기보다,
**experimental lane이 실제 의도대로 동작하도록 바로잡고,
그 수정된 lane을 앞으로 다시 확장할 수 있게 만든 단계**로 보는 것이 맞습니다.

## 다음 단계에 남기는 결론
Stage 107 이후의 가장 자연스러운 다음 질문은 다음 둘 중 하나입니다.

1. 이 corrected score-bounded lane 위에
   **draw-aware / score-bounded proof-priority policy**를 더 얹을 것인지
2. 아니면 현재처럼 experimental lane correction까지만 유지하고,
   PN/PPN 쪽 다음 후보를 다시 볼 것인지

현재 결과만 놓고 보면,
Stage 107은 **lane correction 채택 / default promotion 보류**가 가장 자연스럽습니다.

## 관련 파일
- `js/ai/mcts.js`
- `js/ai/search-engine.js`
- `tools/engine-match/benchmark-mcts-score-bounds.mjs`
- `tools/engine-match/benchmark-mcts-score-bounds-fixed-iterations.mjs`
- `js/test/stage107_mcts_true_score_bounds_runtime_smoke.mjs`
- `js/test/stage107_mcts_true_score_bounds_benchmark_smoke.mjs`
- `benchmarks/stage107_mcts_true_score_bounds_12empties_120ms_24seeds_20260411.json`
- `benchmarks/stage107_mcts_true_score_bounds_12empties_280ms_24seeds_20260411.json`
- `benchmarks/stage107_mcts_true_score_bounds_fixed_iterations_12empties_20260411.json`
