# Stage 80 — ETC in-place prepared-move cleanup

## 배경
Stage 17 ETC 도입 보고서는 child outcome precompute와 ETC를 공유해 오버헤드를 줄이는 방향을 강조했고,
Stage 79 리뷰는 다음 비MPC 후보로 ETC-side hotpath cleanup을 권장했다.

이번 단계에서는 탐색 정책을 바꾸지 않고,
ETC helper가 subtree search에서 사용하던 `preparedMoves = legalMoves.map((move) => ({ ...move }))`
경로를 더 싸게 만들 수 있는지 확인했다.

## 구현 요약
- 새 runtime toggle: `etcInPlaceMovePreparation`
  - `false`: legacy clone path
  - `true`: original move array를 그대로 사용
- candidate 경로에서는 engine-specific `childTableEntry`를 shared move object에 기록하지 않는다.
- 대신 engine-agnostic한 `orderingOutcome`만 재사용한다.
- 따라서 동일한 move array를 다른 engine이 다시 보더라도 stale TT metadata 오염이 생기지 않는다.

## 기대 효과
- ETC helper에서 move object spread clone 제거
- subtree node마다 allocation / copy overhead 감소
- search tree / best move / score는 그대로 유지

## 안전성
- ETC bound 계산 규칙은 변경하지 않았다.
- ordering 단계에서 child TT는 계속 fresh lookup을 수행하므로, preferred child search 이후의 TT 변화도 그대로 반영된다.
- 신규 smoke test는 같은 shared move array를 서로 다른 engine이 연속 사용해도 결과가 오염되지 않음을 확인한다.
