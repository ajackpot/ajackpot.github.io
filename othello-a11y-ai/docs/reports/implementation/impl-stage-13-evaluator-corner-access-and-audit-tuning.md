# 구현 보고서 Stage 13 — 평가 함수 감사와 corner-access 보강

## 배경 / 목표

이번 단계의 목적은 학습 기반 파이프라인으로 넘어가기 전에,
현재 전통적(static) evaluator를 마지막으로 한 번 더 점검하는 것이었습니다.

점검 질문은 세 가지였습니다.

1. 현재 evaluator가 **불필요하게 중복 평가**하는 부분이 있는가?
2. 전통적인 Othello 평가 항목 중에서 **빠진 핵심 신호**가 있는가?
3. 지금 시점에서 위험이 낮고 효과가 분명한 **마지막 수작업 보정**이 있는가?

검토 결과, mobility / potential mobility / corners / corner adjacency / frontier /
positional / edge pattern / corner pattern / stability / parity / disc differential의 큰 축은
이미 잘 갖춰져 있었고, 필수 수준에서 크게 빠진 것은 많지 않았습니다.

다만 late-game exact 샘플과 전술 포지션을 대조해 보니,
현재 evaluator는 **“지금 당장 코너를 집을 수 있는가”**를
corner ownership과 분리된 독립 신호로 거의 다루지 않고 있었습니다.

이는 다음과 같은 상황에서 일관된 under-valuation을 만들었습니다.

- 아직 코너를 실제로 먹지는 않았지만
- 현재 차례에 corner move가 열려 있고
- 상대는 같은 수준의 corner reply가 없는 상태

이 경우 기존 evaluator는 이미 있는 corner-adjacency / corner-pattern / mobility로 일부 감지했지만,
실제 exact score에 비해 평가를 덜 강하게 주는 경향이 확인되었습니다.

## 변경 범위

### 1) `cornerAccess` feature 추가

파일:
- `js/ai/evaluator.js`

추가 내용:
- 현재 관점의 legal move bitboard와 상대 관점의 legal move bitboard를 만든 뒤
- 각자 즉시 둘 수 있는 corner move 수를 비교하는 `cornerAccess` 신호를 추가했습니다.
- 값 범위는 기존 mobility/corner 계열과 같은 normalized difference(`-100 ~ 100`)입니다.

의도:
- “corner를 이미 소유했는가”와
- “corner를 지금 바로 집을 수 있는가”를 구분합니다.
- shallow leaf나 exact 직전 구간에서 static evaluator가
  전술적으로 중요한 immediate corner opportunity를 덜 놓치게 합니다.

가중치:
- phase에 따라 선형 증가하도록 두었습니다.
- 초중반에 과도하게 흔들지 않도록 시작값은 낮추고,
  후반으로 갈수록 크게 반영되도록 설계했습니다.

### 2) legal move bitboard 중복 계산 정리

파일:
- `js/ai/evaluator.js`

기존:
- mobility 계산용으로 legal moves를 만들고,
- 새 corner-access를 넣으려면 다시 legal moves를 만들게 되는 구조가 될 가능성이 있었습니다.

변경 후:
- `evaluate()`에서 perspective/player 기준 legal move bitboard를 한 번씩만 만들고
- mobility / cornerAccess / feature explanation이 이를 재사용하도록 정리했습니다.

효과:
- 새 feature를 추가하면서도 evaluation hot-path의 비용 증가를 피할 수 있었습니다.

### 3) 실제로 가중치가 0인 항목의 계산 생략

파일:
- `js/ai/evaluator.js`

변경:
- `discWeight === 0`인 구간에서는 disc differential 계산 생략
- `parityWeight === 0`인 구간에서는 parity heuristic 계산 생략

해석:
- 기존 코드도 수치적으로는 맞았지만,
  해당 phase에서 **결과에 반영되지 않는 값을 미리 계산**하고 있었습니다.
- Stage 13에서는 이 부분만 보수적으로 정리했습니다.

### 4) feature explanation 확장

파일:
- `js/ai/evaluator.js`
- `js/test/core-smoke.mjs`

추가:
- `cornerAccess`
- `cornerMoves`
- `opponentCornerMoves`

의도:
- 디버깅 시 “왜 이 포지션이 코너 기회가 있다고 판단됐는지”를
  바로 확인할 수 있도록 했습니다.

## 이번 단계에서 유지한 것 / 일부러 안 바꾼 것

### 유지한 것
- static positional matrix 자체는 유지
- corner adjacency / corner pattern / edge pattern 구조 유지
- stability heuristic 구조 유지
- frontier / potential mobility 유지

### 보류한 것
- edge의 wing / mountain / gap 류 명시 패턴 추가
- positional matrix의 완전한 context-sensitive 재설계
- semi-stable / unstable 분류 확대
- learned table이나 n-tuple 보강

보류 이유:
- 이번 단계는 “전통 evaluator의 마지막 보수적 보정”이 목표였고,
  위 항목들은 방향성은 있어도 수작업 heuristic으로 섣불리 넣기보다
  다음 단계의 data-driven tuning 쪽으로 넘기는 편이 더 안전하다고 봤습니다.

## 검증

통과:
- `node js/test/core-smoke.mjs`
- `node js/test/perft.mjs`
- `python3 tests/ui_smoke.py`
- `python3 tests/virtual_host_smoke.py`

추가 회귀:
- `D3 C3 B3 B2 C4 A3` 포지션에서
  black 관점 `cornerAccess = 100`, `cornerMoves = ["A1"]`가 정확히 보고되는지 검증
- 반대 관점에서는 zero-sum으로 `cornerAccess = -100`이 되는지 검증

## 근거 데이터

파일:
- `benchmarks/stage13_evaluator_corner_access_audit.json`

### A) exact late-game 샘플 적합도 비교

세팅:
- seeded-random late position
- empties 6 / 8 버킷
- 각 버킷 120개 샘플
- baseline(Stage 12 evaluator) vs candidate(Stage 13 evaluator)
- exact score와의 상관 / MAE 비교

결과:
- baseline correlation: `0.7110`
- candidate correlation: `0.7583`
- baseline MAE: `132,569.42`
- candidate MAE: `122,072.58`

해석:
- exact outcome에 대한 방향성과 크기 예측이 모두 개선되었습니다.
- 즉, 이번 변경은 “설명용 feature만 추가”가 아니라
  late static evaluation 품질 개선으로도 관측됐습니다.

### B) evaluator 비용 비교

세팅:
- empties 36 / 24 / 16 / 8 상태 32개
- black/white 양 관점 평가를 5,000회 반복

결과:
- baseline: `13,733.02 ms`
- candidate: `11,749.01 ms`
- 변화: **약 14.45% 감소**

원인:
- legal move bitboard 재사용
- parity / disc differential의 phase-aware 계산 생략

즉, Stage 13은 strength 쪽 개선만이 아니라,
**평가 hot-path 정리로 비용도 함께 줄인 변경**이었습니다.

### C) 전술 포지션 확인

대표 포지션:
- `D3 C3 B3 B2 C4 A3`

특징:
- black가 즉시 `A1` 코너를 먹을 수 있음
- white는 대응 corner move가 없음

결과:
- baseline black score: `32,158`
- candidate black score: `59,189`
- `cornerAccess = 100`
- `cornerMoves = ["A1"]`

반대로 위험 포지션:
- `D3 C3 B3 B2 B1`

결과:
- baseline black score: `-36,681`
- candidate black score: `-63,010`
- `cornerAccess = -100`
- `opponentCornerMoves = ["A1"]`

해석:
- evaluator가 immediate corner opportunity / corner concession threat를
  기존보다 분명하게 반영하게 되었습니다.

## 변경 파일

- `js/ai/evaluator.js`
- `js/test/core-smoke.mjs`
- `benchmarks/stage13_evaluator_corner_access_audit.json`

## 리스크 / 주의점

- cornerAccess는 mobility 계열에서 파생된 signal이라,
  과도하게 키우면 corner ownership과 mobility를 함께 중복 반영할 수 있습니다.
- 이를 피하기 위해 독립 feature로는 추가했지만,
  가중치는 corner ownership보다 낮은 수준에서 phase-dependent하게 두었습니다.
- edge 명시 패턴까지 한 번에 늘리지 않은 이유도,
  수작업 heuristic의 중복/과적합 리스크를 줄이기 위함입니다.

## 최종 판단

Stage 13의 결론은 다음과 같습니다.

1. 현재 evaluator에는 **즉시 corner access 신호가 실질적으로 부족**했다.
2. 반면 다른 전통 항목은 이미 꽤 잘 갖춰져 있어 대규모 재설계는 불필요했다.
3. 이번 단계의 마지막 수작업 업데이트는
   **corner-access 보강 + 불필요 계산 정리** 정도가 가장 안전하고 합리적이었다.

다음 단계는 이제 전통 heuristic을 더 억지로 늘리기보다,
WTHOR/exact label 기반 데이터 튜닝으로 넘어가는 쪽이 맞습니다.
