# Stage 122 - allocation-light search move path

## 요약

Step 3의 두 번째 후보였던 **allocation-light search move path**를 채택했습니다.

이번 단계의 목적은 Stage 86에서 기각된 `rules.js` direct direction unroll을 다시 꺼내는 것이 아니라,
**classic search 내부 노드에서 매번 새로 만들어지는 move record의 자료구조/shape 비용을 더 싸게 만드는 것**이었습니다.

핵심 결론은 다음과 같습니다.

1. classic search 노드는 이제 기본적으로 `listPreparedSearchMoves()` 기반의 dedicated prepared move path를 사용합니다.
2. prepared move record는 ordering 단계에서 필요한 필드를 **고정 shape**로 미리 갖고 들어오므로, search-engine이 hotpath에서 매 move마다 property를 덧붙이며 shape를 바꾸는 비용을 줄입니다.
3. `flipCount`는 prepared builder 안에서 direction scan 중 inline으로 누적해, search move path에서 별도 `popcount(flips)`를 다시 부르지 않습니다.
4. baseline 경로는 `allocationLightSearchMoves: false`로 그대로 재현할 수 있어 A/B benchmark와 regression 해석이 가능합니다.
5. move record parity corpus와 search benchmark에서 의미론은 유지됐고, representative batch에서는 elapsed가 대체로 개선됐습니다.

## 배경

Stage 120 전수조사에서 `rules.js` / `bitboard.js` move-generation 계열이 midgame와 exact-tail 모두에서 반복적으로 hotspot으로 보였습니다.

다만 Stage 86에서 이미 확인했듯이,
`legalMovesBitboard()` / `computeFlips()`의 **explicit direct-call unroll**은 일관된 승리를 보이지 않았습니다.

그래서 이번 단계는 방향 전개 자체를 다시 바꾸기보다,
다음 두 지점을 더 좁게 겨냥했습니다.

- search-only move record builder의 allocation / object-shape 비용
- `flipCount` 계산을 위해 move마다 `popcount(flips)`를 따로 다시 부르는 비용

즉 이번 Stage는 “새 알고리즘”이 아니라,
**기존 classic search 의미론을 유지한 채 search node용 data-shape를 더 싸게 만드는 cleanup/refactor**로 보는 편이 맞습니다.

## 실제 코드 변경

### 1. `js/core/rules.js`에 prepared search move builder 추가

추가한 핵심은 `listPreparedSearchMoves(player, opponent)`입니다.

이 함수는
- 기존처럼 `legalMovesBitboard()`로 legal move bitboard를 구한 뒤,
- 각 legal move에 대해 prepared record를 만들고,
- ordering 단계에서 나중에 덧붙이던 metadata 슬롯을 고정 shape로 미리 넣습니다.

record에는 다음 필드가 처음부터 들어 있습니다.

- `index`
- `bit`
- `flips`
- `flipCount`
- `orderingOutcome`
- `childTableEntry`
- `opponentMoveCount`
- `opponentCornerReplies`
- `orderingScore`
- `etcPreparedChildTableEntry*`

즉 search-engine이 ordering 중 `move.orderingOutcome = ...`, `move.childTableEntry = ...` 식으로
shape를 계속 확장하는 대신,
같은 필드 자리에 값만 갱신하도록 바뀌었습니다.

### 2. inline `flipCount` accumulation

prepared builder 내부에서는 direction scan 중 captured disc 수를 직접 세어
`flipCount`를 누적합니다.

이렇게 하면 search move path에서
- `computeFlips()`로 flips를 만든 뒤
- `popcount(flips)`를 다시 호출하는
이중 비용을 줄일 수 있습니다.

중요한 점은 이 변화가 `computeFlips()` 자체의 의미론을 바꾼 것은 아니라는 점입니다.
search-only prepared path에 한해,
**같은 flips 결과를 만들면서 flipCount를 더 싸게 얻는 구현**을 추가한 것입니다.

### 3. `SearchEngine`에 default-on toggle 추가

`js/ai/search-engine.js`에는 internal experimental toggle인
`allocationLightSearchMoves`를 추가했습니다.

의미론은 다음과 같습니다.

- 기본값: `true`
- `true`: classic search 내부 노드가 prepared move path 사용
- `false`: 기존 `state.getSearchMoves()` 경로 유지

이 toggle은 사용자 노출 옵션이 아니라,
Step 3 benchmark / regression에서 baseline을 같은 Stage 안에서 재현하기 위한 내부 비교 손잡이입니다.

### 4. main search node에서 prepared path 사용

`SearchEngine.listSearchMoves(state)` helper를 추가하고,
classic WLD / exact negamax가 직접 `state.getSearchMoves()`를 부르던 곳을 이 helper로 정리했습니다.

즉 Stage 122의 실제 런타임 변화는
**classic search 내부 노드의 search move 생성 경로**에 집중됩니다.

root legal move UI/description용 `getLegalMoves()`는 그대로 유지됩니다.

## 검증

### 1. move record parity corpus

새 smoke는 `empties = 30/24/18/12`, `seed = 1/3/5` 상태들에 대해
baseline `state.getSearchMoves()`와 `listPreparedSearchMoves()`의 다음 필드를 직접 비교합니다.

- `index`
- `bit`
- `flips`
- `flipCount`

추가로 prepared record가 다음 고정 metadata slot을 기본값으로 갖는지도 확인합니다.

- `orderingOutcome = null`
- `childTableEntry = null`
- `opponentMoveCount = null`
- `opponentCornerReplies = null`
- `orderingScore = 0`
- `etcPreparedChildTableEntryReady = false`
- `etcPreparedChildTableEntry = null`
- `etcPreparedChildTableEntryOwnerId = 0`
- `etcPreparedChildTableEntryGeneration = 0`
- `etcPreparedChildTableEntryTtStores = 0`

별도로 더 넓은 ad-hoc parity corpus(`empties 30..8`, `seed 1..20`) 460 state에서도
move record diff가 `0`임을 확인했습니다.

### 2. representative search parity

새 Stage 122 smoke는 `20 / 14 / 10 empties` 대표 상태에서
`allocationLightSearchMoves: false` vs `true`를 비교해 다음을 확인합니다.

- `bestMoveCoord`
- `score`
- `searchMode`
- `searchCompletion`
- `nodes`

모두 동일했습니다.

### 3. official benchmark

재현 스크립트:

```bash
node tools/benchmark/run-stage122-allocation-light-search-move-path-benchmark.mjs
```

결과 파일:

- `benchmarks/stage122_allocation_light_search_move_path_benchmark_20260412.json`

#### move-generation micro

- corpus: `64` states (`empties 24..10`, step `2`, `seed 1..8`)
- repetition: `2500`
- baseline: `1795.906ms`
- candidate: `1658.309ms`
- ratio: `0.9234`

즉 search move record 생성만 떼어 놓고 보면 약 **7.7%** 정도 빨랐습니다.

#### depth-limited `20 empties / d8`

- baseline: `3008ms`, nodes `65,028`
- candidate: `2906ms`, nodes `65,028`
- ratio: `0.9661`

#### WLD bucket `14 empties`

- baseline: `489ms`, nodes `22,245`
- candidate: `464ms`, nodes `22,245`
- ratio: `0.9489`

#### exact bucket `14 empties`

- baseline: `1836ms`, nodes `24,091`
- candidate: `1798ms`, nodes `24,091`
- ratio: `0.9793`

#### exact bucket `10 empties`

- baseline: `67ms`, nodes `553`
- candidate: `68ms`, nodes `553`
- ratio: `1.0149`

즉 공식 배치에서는
- midgame depth-limited,
- WLD bucket,
- exact 14 bucket
에서 개선이 보였고,
아주 작은 exact 10 bucket은 사실상 **중립에 가까운 노이즈 수준**으로 남았습니다.

### 4. duplicate control rerun

같은 benchmark 배치를 한 번 더 rerun한 control에서는 다음이 나왔습니다.

- micro: `0.9174x`
- depth-limited: `0.9768x`
- WLD-14: `0.9192x`
- exact-14: `0.9613x`
- exact-10: `0.9722x`

즉 duplicate rerun에서도 **improvement sign이 유지**됐습니다.

## 회귀 확인

다음 테스트를 통과했습니다.

```bash
node js/test/core-smoke.mjs
node js/test/perft.mjs
node js/test/stage83_custom_wld_toggle_smoke.mjs
node js/test/stage121_active_mpc_default_parity_smoke.mjs
node js/test/stage122_allocation_light_search_moves_smoke.mjs
node js/test/stage76_trineutron_match_suite_smoke.mjs
```

## 채택 판정

**채택**합니다.

채택 이유는 다음과 같습니다.

1. move record / node / best move / score parity가 유지됐습니다.
2. prepared move path가 classic search 의미론을 바꾸지 않고 hotpath 자료구조만 정리합니다.
3. official benchmark와 control rerun 모두에서 elapsed sign이 전반적으로 개선 쪽이었습니다.
4. exact 10 bucket의 첫 공식 실행은 `+1ms`로 소폭 흔들렸지만,
   절대 시간이 매우 작고 duplicate rerun에서 바로 반대로 돌아선 수준이므로 채택을 막는 근거로 보기는 어렵습니다.
5. baseline opt-out toggle(`allocationLightSearchMoves: false`)을 남겨 두었기 때문에,
   이후 Step 3 후보나 추가 benchmark에서도 같은 Stage 안에서 A/B 비교를 계속 재현할 수 있습니다.

## 리스크 / 범위

- 이 Stage는 classic search 내부 노드의 move record path만 다룹니다.
  root UI용 `getLegalMoves()`나 generated profile, opening default, MCTS lane 구조는 건드리지 않았습니다.
- `allocationLightSearchMoves`는 내부 벤치/회귀용 opt-out이며, 현재 UI 표면으로 노출하지 않습니다.
- Stage 86에서 기각된 direct direction unroll은 이번에도 다시 채택하지 않았습니다.
  이번 Stage의 채택 포인트는 **direction dispatch 변경이 아니라 prepared record path**입니다.

## 관련 파일

- `js/core/rules.js`
- `js/ai/search-engine.js`
- `js/test/stage122_allocation_light_search_moves_smoke.mjs`
- `tools/benchmark/run-stage122-allocation-light-search-move-path-benchmark.mjs`
- `benchmarks/stage122_allocation_light_search_move_path_benchmark_20260412.json`
- `docs/reports/implementation/impl-stage-122-allocation-light-search-move-path.md`

## 다음 후보

Step 3 큐에서 남은 주요 후보는 이제 다음 하나입니다.

1. `opening default revalidation`

즉 Step 3의 남은 순차 검증은
runtime semantics / move-path cleanup을 정리한 현재 기준 위에서,
기존 opening default의 유지/교체 여부를 다시 확인하는 단계로 넘어가는 것이 맞습니다.
