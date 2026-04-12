# Stage 109 - 저장소 전반 리팩토링 감사와 문서화 마감 정리

## 요약
이번 단계의 목표는 Stage 88~108까지 누적된 MCTS late-lane / proof / score-bounds 계열 코드를 한 번에 훑고,
다음 대화로 넘어가기 전에 **중복 제거, 재사용 가능한 헬퍼 정리, 불필요한 할당 감소, 문서 최종 점검**을 끝내는 것이었습니다.

결론은 다음과 같습니다.

- **채택한 것**
  - MCTS node 초기화 경로를 공용 factory로 합쳤습니다.
  - solved principal variation 정규화/동등성 비교를 helper로 분리하고 `JSON.stringify` 기반 비교를 제거했습니다.
  - child solved-state propagation을 single-pass 스캔으로 다시 작성했습니다.
  - traversal 시 proof-priority / draw-priority ranking에서 **selection에 필요 없는 `byMoveIndex` Map 생성**을 건너뛰도록 정리했습니다.
  - selection hot path의 중복 option lookup과 의미 없는 `includes()` invariant 검사를 제거했습니다.
  - root analyzed-move export에서 같은 ranking metadata를 여러 번 다시 꺼내던 부분을 1회 lookup으로 정리했습니다.
  - Stage 109 smoke와 report inventory check를 추가하고 문서를 갱신했습니다.
- **채택하지 않은 것**
  - per-player proof number 저장 구조를 typed array로 전면 교체하는 큰 자료구조 변경
  - experimental score-bounds lane의 전역 기본값 승격
  - 다음 PN/PPN 단계 직전에 search-engine telemetry API를 크게 재배열하는 cosmetic refactor
- **현재 기본값 변화**
  - **없습니다.**
  - 이번 Stage 109는 사용자 노출 옵션이나 default strength를 바꾸는 단계가 아니라,
    **기존 Stage 100~108 기능을 더 다루기 쉬운 구조로 정리하고 다음 단계의 출발점을 깨끗하게 만드는 단계**입니다.

## 감사 범위
이번 감사에서 우선적으로 본 영역은 다음이었습니다.

1. `js/ai/mcts.js`
   - late solved-value propagation
   - root exact continuation 접속부
   - proof-priority / generalized proof metric / score-bounds / draw-blocker hot path
2. `js/ai/search-engine.js`
   - MCTS result/telemetry 결합부
   - 옵션 정규화와 late-lane handoff 접속부
3. `js/ui/formatters.js`, `docs/runtime-ai-reference.md`
   - proof telemetry summary 표면과 문서 정합성
4. `docs/reports/*`, `stage-info.json`
   - 다음 대화로 넘길 때 필요한 구현/검증 문서 최신화

검토하면서 본 후보는 크게 네 부류였습니다.

- hot path에서 **중복 순회 / 불필요한 객체 생성**이 있는가
- 같은 필드 집합이 여러 곳에 흩어져 있어 **추가 실험 때 수정 지점이 늘어나는가**
- 현재 자료구조가 이미 충분히 납작한데 괜히 더 큰 churn만 유발하는가
- 문서/리포트 인벤토리가 실제 저장소 상태와 어긋난 곳이 없는가

## 실제 적용한 리팩토링

### 1) MCTS node 생성 경로 병합
기존에는 `createNodeFromNormalized()`와 `createRootNode()`가 거의 같은 필드 집합을 따로 들고 있었습니다.
이 상태에서는 late-lane 관련 필드가 하나 더 늘 때마다 두 군데를 같이 고쳐야 했습니다.

이번에는 내부 공용 factory인 `createMctsNode()`를 두고,
- root node 생성
- expanded child node 생성
을 둘 다 이 경로로 통일했습니다.

이 변경은 성능보다는 **필드 추가/제거 시 drift를 줄이는 유지보수용 리팩토링**입니다.
다음에 PN/PPN prototype을 붙일 때 node-level field가 더 늘어날 가능성이 높기 때문에,
이 시점에서 합쳐 두는 편이 안전했습니다.

### 2) principal variation 정규화와 비교 경로 정리
`setSolvedFields()`는 solved principal variation 비교를 위해
- `filter().slice()`로 새 배열을 만들고
- 기존 배열과 새 배열을 각각 `JSON.stringify()`해서
- 문자열 비교
를 하고 있었습니다.

이 방식은 코드가 짧다는 장점은 있지만,
late solver / propagation이 자주 불릴 때는 **불필요한 배열/문자열 할당**이 생깁니다.

그래서 이번에는 다음 helper를 추가했습니다.

- `normalizePrincipalVariation()`
- `areMoveIndexSequencesEqual()`

이제 solved PV는 한 번만 정규화하고,
동등성 비교는 길이와 원소를 직접 비교합니다.
즉 **의미는 같게 유지하면서 hot path의 문자열화를 없앴습니다.**

### 3) solved child propagation의 single-pass 재작성
`refreshSolvedStateFromChildren()`는 이전까지
- solved child만 `filter()`로 따로 뽑고
- all-exact 여부를 다시 훑고
- best exact child를 다시 훑고
- best resolved child를 다시 훑고
- decisive child를 다시 훑는
식으로 여러 번 child 배열을 스캔하고 있었습니다.

이번에는 다음 helper를 먼저 분리했습니다.

- `shouldPreferSolvedScoreChild()`
- `shouldPreferSolvedOutcomeChild()`
- `shouldPreferDecisiveSolvedChild()`

그 위에 `refreshSolvedStateFromChildren()`를 **single-pass aggregation**으로 다시 썼습니다.
이제 한 번의 child loop 안에서
- solved child 수
- all-children-expanded 상황의 exact 가능 여부
- exact best child
- WLD best child
- decisive child
를 같이 모읍니다.

이 변경은 단순 micro-opt를 넘어서,
**“정확 score propagation / WLD propagation / decisive-child shortcut이 어떤 기준으로 child를 고르는지”**를
helper 이름으로 드러내 준다는 점에서도 유지보수 가치가 큽니다.

### 4) traversal-time ranking Map 할당 감소
Stage 103과 Stage 108의 ranking helper들은
selection에서 실제로 필요한 것은 `child -> metadata` 맵뿐인데도,
항상
- `byChild`
- `byMoveIndex`
를 둘 다 만들고 있었습니다.

문제는 이 함수들이 root summary 생성 때만 불리는 것이 아니라,
**selection hot path 안에서도 반복 호출**된다는 점입니다.

그래서 이번에는
- `buildProofPriorityRanking(..., includeMoveIndex = true)`
- `buildScoreBoundDrawPriorityRanking(..., includeMoveIndex = true)`
형태로 바꾸고,
selection에서는 `includeMoveIndex = false`를 넘겨
**필요 없는 `byMoveIndex` Map 생성을 건너뛰도록** 했습니다.

즉 root/report용 경로는 그대로 두고,
traversal 경로에서만 할당을 줄였습니다.

### 5) selection hot path의 작은 납작화
`selectChildForTraversal()` 안에서는 매 child마다
- `config?.progressiveBiasScale`
- `config?.proofPriorityScale`
- `config?.scoreBoundDrawPriorityScale`
- `config?.rootThreatByMoveIndex`
를 반복해서 꺼내고 있었습니다.

또 마지막에는 이미 `traversableChildren`에서 고른 `bestChild`에 대해
다시 `traversableChildren.includes(bestChild)`를 검사하는,
실질적으로 항상 불필요한 invariant check도 남아 있었습니다.

이번에는
- scale과 root-threat map을 loop 바깥 local 변수로 빼고
- 불필요한 `includes()` 검사를 제거했습니다.

이 변경은 아주 큰 알고리즘 변경은 아니지만,
selection이 많이 반복되는 코드라는 점에서 **작은 overhead를 줄이는 정리**로는 충분히 가치가 있었습니다.

### 6) root analyzed-move export의 Map lookup 중복 제거
root result를 만들 때 각 child마다
같은 `rootProofPriorityRanking.byChild.get(child)`와
`rootScoreBoundDrawPriorityRanking.byChild.get(child)`를
여러 필드에 대해 반복해서 다시 호출하고 있었습니다.

이번에는 map callback 안에서
- `proofPriorityMetadata`
- `scoreBoundDrawPriorityMetadata`
를 한 번만 받아 재사용하도록 정리했습니다.

이 경로는 traversal만큼 뜨겁지는 않지만,
결과 export 코드의 가독성을 분명히 올렸고 Map lookup도 줄었습니다.

## 적용하지 않은 후보와 이유

### A. per-player proof number를 array/typed-array로 전면 교체
처음 감사 대상에는 `proofNumbersByPlayer`를 `{ black, white }` object 대신
2-slot array나 typed array로 바꾸는 후보도 있었습니다.

하지만 이번 정리 단계에서는 이 후보를 적용하지 않았습니다.
이유는 다음과 같습니다.

- telemetry / result export / UI summary / benchmark JSON에서 사람 눈으로 읽기 좋은 key를 이미 많이 사용 중입니다.
- 지금 단계에서 구조를 전면 교체하면, 변경 파급 범위가 Stage 105~108의 실험 표면 전체로 퍼집니다.
- 반면 현재 late-lane width와 child branching을 고려하면, 이득이 **확실히 큰지**는 아직 불분명합니다.

즉 **큰 churn 대비 확실한 이득이 부족**해서 이번에는 보류했습니다.

### B. score-bounds 전역 기본값 승격
Stage 106~108에서 계속 본 것처럼,
score-bounds lane은 draw exact closure / proof completion에서는 의미 있는 신호가 있지만,
여전히 **robust한 exact-best 기본값 우세**까지는 보여 주지 못했습니다.

그래서 이번 리팩토링 단계에서도
`mctsScoreBoundsEnabled = true`를 기본값으로 올리는 결정은 하지 않았습니다.

### C. search-engine telemetry API 대정리
`createMctsProofTelemetry()`는 여전히 길고, 더 잘게 쪼갤 수 있습니다.
하지만 이건 다음 PN/PPN 단계에서 telemetry 항목이 한 번 더 바뀔 가능성이 높습니다.

지금 크게 흔들면 cosmetic churn만 커질 수 있으므로,
이번에는 **문서 정합성과 테스트 유지**까지만 보고 구조 대이동은 보류했습니다.

## 검증과 관측

### 1) 대표 late-lane probe - solved quality 유지, 평균 elapsed 소폭 개선
`tools/engine-match/benchmark-mcts-score-bound-draw-priority.mjs`로
`12 empties`, `6 seeds`, `120ms`, `draw-priority x0.35` probe를 baseline(Stage 108 코드)과 refactor 후 코드에 대해 각각 다시 돌렸습니다.

요약:

- exact-best hit: `5/6 -> 5/6` (변화 없음)
- proven: `3/6 -> 3/6` (변화 없음)
- average elapsed: `113.33ms -> 111.83ms`
- average iterations: `10.67 -> 10.5`

여기서 iteration 수는 deadline 기반 미세 잡음이 섞여 있으므로 큰 의미를 두기 어렵고,
중요한 점은 **solved quality가 그대로 유지된 채 평균 elapsed가 아주 소폭 내려갔다**는 것입니다.
즉 이번 정리는 적어도 late-lane probe 기준으로 **품질 regression 없이 유지**되는 쪽으로 읽는 것이 맞습니다.

### 2) fixed-iteration wall-clock probe - 전체 실행 시간 소폭 개선
같은 계열 workload를 fixed-iteration benchmark로 다시 재서,
host timing noise보다 traversal/propagation 자체 비용을 더 보려 했습니다.

- baseline wall time: `4.08s`
- refactor wall time: `4.05s`

차이는 크지 않지만,
이번 Stage 109가 기능 추가가 아니라 **불필요한 할당과 중복 순회를 줄이는 cleanup**이었다는 점을 감안하면,
**회귀 없이 약간 더 가벼워진 정도**로 해석하는 편이 맞습니다.

### 3) 일반 MCTS throughput - 글로벌 회귀는 보이지 않음
`benchmark-mcts-throughput-compare.mjs`로
`mcts-guided`, `mcts-hybrid`의 `160ms / 280ms` opening throughput도 baseline과 비교했습니다.

관측:

- `mcts-guided 160ms`: iteration `+14.4%`
- `mcts-guided 280ms`: 거의 동률 (`+0.34%`)
- `mcts-hybrid 160ms`: 거의 동률 (`+1.1%`)
- `mcts-hybrid 280ms`: 거의 동률 범위의 미세 흔들림 (`-1.16%`)

즉 전역적으로도 **뚜렷한 throughput regression은 보이지 않았고**,
관측된 차이는 대부분 미세 벤치 잡음 범위로 보는 편이 안전합니다.

## 문서화와 handoff 정리
이번 단계에서 문서 쪽은 다음을 같이 마감했습니다.

- `docs/runtime-ai-reference.md`
  - 저장소 현재 Stage를 109로 갱신
  - Stage 109가 **기능 추가가 아닌 internal refactor / docs closeout**이라는 점 명시
  - 검증 진입점에 Stage 109 smoke 추가
- `stage-info.json`
  - Stage 109 요약 반영
- `docs/reports/implementation/`
  - 이번 보고서 추가
- `docs/reports/report-inventory.generated.*`
  - 생성 결과 갱신
- 새 smoke
  - `stage109_mcts_refactor_runtime_smoke.mjs`
  - `stage109_report_inventory_smoke.mjs`

즉 다음 대화로 넘어갈 때는
- 코드 구조
- 최신 benchmark summary
- 문서 inventory
- smoke 진입점
이 모두 Stage 109 기준으로 맞춰진 상태가 됩니다.

## 최종 판정

### 채택
- shared MCTS node factory
- principal variation normalization / direct equality helper
- single-pass solved-child propagation
- traversal-time ranking Map allocation trim
- selection hot path local caching / redundant invariant removal
- analyzed-move metadata lookup dedup
- Stage 109 smoke + report inventory closeout

### 비채택
- typed-array 전면 치환 같은 큰 자료구조 rewrite
- score-bounds 전역 기본값 승격
- search-engine telemetry API 대정리

### 현재 의미
이번 Stage 109는 strength를 다시 크게 올린 단계가 아니라,
**Stage 100~108에서 붙은 late-lane 실험들을 다음 단계에서 다시 건드리기 쉽도록 납작하게 정리한 단계**입니다.

즉 다음 대화에서 PN/PPN 쪽으로 다시 들어갈 때,
- node field drift 위험은 줄었고
- solved propagation은 한 번에 읽히며
- traversal ranking helper는 report용/selection용 할당이 분리되어 있고
- 문서와 smoke도 저장소 상태와 다시 맞아 있습니다.

## 검증
이번 단계에서 직접 확인한 항목:

- `node js/test/core-smoke.mjs`
- `node js/test/stage100_mcts_solver_runtime_smoke.mjs`
- `node js/test/stage101_mcts_exact_continuation_runtime_smoke.mjs`
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
- `node js/test/stage109_mcts_refactor_runtime_smoke.mjs`
- `node js/test/stage109_report_inventory_smoke.mjs`
- `node tools/docs/generate-report-inventory.mjs --check`

추가 benchmark 산출물은 `benchmarks/stage109_refactor_audit_summary_20260411.json`과
`benchmarks/stage109_mcts_refactor_throughput_compare.json`에 정리했습니다.
