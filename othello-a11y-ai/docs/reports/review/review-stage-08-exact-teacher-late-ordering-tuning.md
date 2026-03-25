# 구현 검토 보고서 Stage 8 — exact teacher 기반 late ordering 튜닝

## 이번 단계 목표
- Stage 7에서 scaffold만 만들어 둔 경량 move ordering 평가기를 실제 late/endgame root 결과에 맞춰 다시 튜닝한다.
- hand-tuned 가중치 대신, exact root 결과를 teacher로 삼는 작은 bucketed ordering score를 만든다.
- 구조상 실익이 있는지 확인하기 위해 ordering 품질과 실제 탐색 비용을 다시 분리해서 본다.

## 이번에 확인한 핵심 사항
Stage 7의 경량 ordering evaluator는 구조 자체는 맞았지만,
- 가중치가 hand-tuned였고,
- search 쪽에서 ordering evaluator에 넘기는 `empties`가 parent empties라서,
- 13 -> 12처럼 late bucket 경계에 걸친 수에서는 post-move 문맥이 한 수 늦게 반영되는 문제가 있었습니다.

즉, 치명적인 규칙 버그는 아니지만, **ordering 전용 점수**라는 목적에 비해 teacher가 없었고,
경계 구간 문맥도 child state 기준으로 보지 못하고 있었습니다.

## 이번에 구현한 내용

### 1) child empties 기준으로 late ordering evaluator를 호출하도록 수정
파일:
- `js/ai/search-engine.js`

변경 전:
- child state를 평가하면서도 `empties`는 parent state 값을 넘김

변경 후:
- ordering evaluator가 실제 post-move 상태의 `childState.getEmptyCount()`를 받도록 수정

효과:
- 13 empties에서 수를 둔 뒤 12 empties가 되는 경우,
  Stage 8부터는 즉시 12-empty late bucket 문맥으로 점수화됩니다.

### 2) exact teacher 기반 bucketed late-ordering 가중치 추가
파일:
- `js/ai/evaluator.js`

새 구조:
- `MoveOrderingEvaluator` 안에 small trained bucket을 추가
- 현재 학습 반영 구간:
  - child empties `9~10` (부모 10~11 empties)
  - child empties `11~12` (부모 12~13 empties)
- 이 구간 밖(대략 부모 14~18 empties)에서는 기존 Stage 7의 보수적 fallback 경량 평가기를 계속 사용

현재 bucket weights:
- child empties 9~10:
  - mobility `+10000`
  - cornerAdjacency `-5000`
- child empties 11~12:
  - mobility `+5000`
  - cornerAdjacency `-5000`
  - edgePattern `-5000`

해석:
- 이 값들은 “일반 평가 함수”의 의미보다는,
  **기존 base ordering score 위에 late exact-best move를 더 잘 위로 올리기 위한 ordering 전용 보정값**입니다.
- 그래서 일반 평가 관점에서 직관적인 부호와 완전히 일치하지 않아도 됩니다.

### 3) 회귀 테스트 보강
파일:
- `js/test/core-smoke.mjs`

추가 확인:
- ordering evaluator 호출 자체가 late 구간에서 계속 활성화되는지
- 13 empties parent -> 12 empties child 전환 시,
  child-empty 기준 점수와 parent-empty 기준 점수가 실제로 달라지는지
- tiny exact 구간(8 empties)에서는 여전히 ordering evaluator가 꺼져 있는지

## 튜닝/검증 방법

### A) holdout ordering 품질 벤치마크
파일:
- `benchmarks/ordering_holdout_exact_10_13_stage7_vs_stage8.json`

설정:
- 10/11/12/13 empties 각각에 대해 seeded random holdout 시드 4개(`offset 13~16`)
- 각 루트 move의 정확한 점수는 exact search로 계산
- 비교 대상은 “탐색 후 정답 move”가 아니라,
  **탐색 전에 `orderMoves()`가 제시한 root top move가 exact-best와 얼마나 가까운지**

결과:
- Stage 7 top-1 exact match: `0.375`
- Stage 8 top-1 exact match: `0.5`
- Stage 7 mean top rank: `4.1875`
- Stage 8 mean top rank: `3.375`
- Stage 7 mean top regret: `68125`
- Stage 8 mean top regret: `49375`

해석:
- Stage 8의 teacher-tuned bucket은 holdout root ordering 품질을 실제로 개선했습니다.
- 특히 11/13 empties 일부 샘플에서는 Stage 7이 exact-best를 상당히 아래에 두던 경우를 Stage 8이 바로잡았습니다.

### B) 실제 late exact-search 비용 벤치마크
파일:
- `benchmarks/ordering_search_13empties_stage7_vs_stage8.json`

설정:
- 13 empties seeded random 시드 4개(`31~34`)
- 각 시드당 Stage 7 / Stage 8을 2회씩 실행
- `maxDepth=4`, `exactEndgameEmpties=16`

결과:
- Stage 7 mean nodes: `17788.75`
- Stage 8 mean nodes: `17788.75`
- Stage 7 mean ms: `1160.375`
- Stage 8 mean ms: `1123.875`
- best move agreement: `4 / 4`
- score agreement: `4 / 4`

해석:
- 이번 샘플에서는 **탐색 노드 수 감소는 확인되지 않았습니다.**
- 시간은 소폭 유리했지만, 표본이 작고 노드 수가 같으므로 명확한 search-efficiency 향상으로 단정할 단계는 아닙니다.
- 즉, Stage 8은 “ordering 품질” 자체는 개선했지만,
  그 효과가 아직 αβ exact search의 전체 tree 크기 절감으로는 바로 이어지지 않았습니다.

## 이번 단계 결론

### 좋아진 점
- Stage 7의 hand-tuned ordering evaluator를,
  적어도 10~13 empties 구간에서는 **exact teacher에 맞춘 bucketed ordering score**로 바꾸었습니다.
- parent empties가 아니라 child empties 기준으로 문맥을 잡도록 해,
  late bucket 경계 구간의 한 템포 늦은 반영도 없앴습니다.
- holdout root-ordering 품질은 분명히 좋아졌습니다.

### 아직 한계인 점
- 13 empties exact-search 비용 벤치마크에서는 node 감소가 아직 없습니다.
- 즉, 현재 형태는 “정렬 품질 개선”은 맞지만,
  실전 search-efficiency 개선은 아직 제한적입니다.

## 판단
- **구현/모델링 측면에서는 Stage 7보다 명확히 전진**
- **정렬 품질 지표는 개선**
- **그러나 실제 탐색량 개선은 아직 미확인**

따라서 이번 단계는
“ordering evaluator가 헛도는 상태에서 exact teacher 기반 모델로 바뀐 단계”로 보는 것이 정확합니다.
다만 다음 단계에서 실전 탐색량까지 줄이려면,
단순 additive late score만으로는 부족할 가능성이 큽니다.

## 다음 단계 추천
1. **14~18 empties 구간까지 teacher-tuned bucket 확장**
   - 지금은 10~13 empties 쪽만 튜닝되었고, 더 이른 late 구간은 fallback입니다.

2. **ordering score의 결합 방식 자체 재설계**
   - 현재는 기존 ordering 위에 additive correction만 얹고 있습니다.
   - exact search 쪽에서는 이 정도로는 tree shape가 거의 안 바뀔 수 있습니다.
   - TT / parity / mobility / trained late score의 우선순위를 분리한 전용 endgame ordering 경로가 더 나을 수 있습니다.

3. **실제 search 비용을 줄이는 지표로 다시 튜닝**
   - 지금은 exact-best root ranking을 teacher로 삼았지만,
   - 다음 단계에서는 root rank보다도 `node count` 자체를 줄이는 방향의 목적 함수를 써 보는 편이 더 직접적일 수 있습니다.

## 이번 단계에서 변경한 파일
- `js/ai/evaluator.js`
- `js/ai/search-engine.js`
- `js/test/core-smoke.mjs`
- `README.md`
- `benchmarks/ordering_holdout_exact_10_13_stage7_vs_stage8.json`
- `benchmarks/ordering_search_13empties_stage7_vs_stage8.json`
- `review-stage-08-exact-teacher-late-ordering-tuning.md`
