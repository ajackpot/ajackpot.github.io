# 구현 검토 보고서 Stage 7 — 경량 move ordering 평가기 실험

## 이번 단계 목표
- 후반 move ordering 전용 경량 평가기를 현재 JS 엔진 구조에 보수적으로 붙여 본다.
- 실제로 탐색량/시간/후반 exact ordering 품질에 의미 있는 개선이 있는지 확인한다.
- 개선이 불분명하면 브라우저 환경에서 왜 실익이 제한적인지도 정리한다.

## 배경
강한 오델로 엔진들은 후반 move ordering을 위해 일반 평가 함수보다 더 작은 전용 평가기를 따로 쓰는 경우가 있습니다.
특히 Egaroucid는 후반 탐색에서 일부 패턴만 쓰는 경량 평가기를 사용한다고 공개 기술 문서에 설명합니다.

다만 현재 프로젝트는:
- JS BigInt 비트보드,
- 브라우저 정적 호스팅,
- differential pattern update 미구현,
- 완전 탐색/전이표/패리티/즉시 기동성 ordering이 이미 존재

라는 조건이어서, 같은 아이디어를 그대로 이식해도 실익이 작을 수 있습니다.

## 이번에 구현한 내용
### 1) `MoveOrderingEvaluator` 추가
파일:
- `js/ai/evaluator.js`

구성:
- 일반 평가 함수보다 훨씬 작은 feature subset만 사용
- 현재 버전의 입력 항목:
  - mobility
  - corner ownership
  - empty-corner adjacency
  - edge pattern
  - corner pattern
  - late disc differential
  - late global parity

의도:
- full evaluator의 stability / frontier / potential mobility / region parity 같은 상대적으로 무거운 부분을 빼고,
- 후반 ordering에 필요한 “대략적인 국면 좋음/나쁨”만 빠르게 추정하려는 목적

### 2) 탐색기와의 연결
파일:
- `js/ai/search-engine.js`

반영 방식:
- 기존 ordering 점수(TT / killer / history / 위험 칸 / 상대 기동성 / 코너 응수 / 지역 패리티) 위에
  경량 평가기를 추가 보조 신호로 붙였습니다.
- stats에 `orderingEvalCalls`를 추가해 실제 호출 여부를 추적할 수 있게 했습니다.

### 3) 매우 작은 exact 구간에서는 비활성화
실험 결과, 8빈칸 exact ordering 샘플에서는 경량 평가기가 뚜렷한 개선 없이 약간의 노이즈를 만들 수 있었습니다.
그래서 현재 병합본에서는 경량 평가기를 **기본적으로 10~18빈칸 구간에서만** 켜고,
그보다 더 작은 exact 구간에서는 끄도록 제한했습니다.

### 4) 회귀 테스트 추가
파일:
- `js/test/core-smoke.mjs`

추가 검증:
- `MoveOrderingEvaluator`도 제로섬 평가를 유지하는지 확인
- 12빈칸 late-search 샘플에서는 `orderingEvalCalls > 0`
- 8빈칸 tiny exact 샘플에서는 `orderingEvalCalls === 0`

## 벤치마크 결과

### A) 프로토타입 exact-ordering 품질 점검 (8 empties)
파일:
- `benchmarks/ordering_eval_prototype_exact_8empties_stage7.json`

설정:
- seeded random 8빈칸 국면 12개
- baseline(Stage 6) ordering vs
- 경량 평가기를 강제로 켠 prototype ordering 비교
- 각 루트 move를 exact score로 채점하여 top-ordered move의 rank / regret 비교

결과:
- top-1 exact match rate:
  - baseline: `41.7%`
  - prototype: `41.7%`
- mean top rank:
  - baseline: `2.17`
  - prototype: `2.58`
- mean regret (disc difference):
  - baseline: `7.58`
  - prototype: `7.42`

해석:
- 아주 작은 exact 구간에서는 개선이 일관되지 않았습니다.
- 일부 샘플은 좋아졌지만(seed 10), 일부 샘플은 오히려 baseline exact-best ordering을 흐렸습니다(seed 6).
- 따라서 tiny exact 구간까지 경량 평가기를 억지로 밀어 넣는 것은 현재 형태로는 설득력이 약했습니다.

### B) 병합본 late-search cost 점검 (13 empties)
파일:
- `benchmarks/ordering_eval_search_13empties_stage6_vs_stage7.json`

설정:
- seeded random 13빈칸 국면 4개
- Stage 6 baseline vs Stage 7 병합본 비교
- `exactEndgameEmpties = 16`

결과:
- mean searched nodes:
  - baseline: `17799.75`
  - stage7: `17799.75`
- mean elapsed time:
  - baseline: `1457.08 ms`
  - stage7: `1478.62 ms`
- best move agreement:
  - `4 / 4`
- mean `orderingEvalCalls`:
  - `22.5`

해석:
- 경량 평가기가 실제로 호출되기는 했습니다.
- 하지만 현재 구현/가중치/활성 구간만으로는 **탐색량 감소가 확인되지 않았습니다.**
- 시간도 큰 차이는 아니지만 이 표본에서는 소폭 불리했습니다.
- 즉, “아이디어 자체는 타당하지만, 현재 브라우저 JS 구현에서는 아직 실전 이득이 불분명”하다는 결론입니다.

## 검증 결과
통과:
- `node js/test/core-smoke.mjs`
- `node js/test/perft.mjs`
- `python3 tests/virtual_host_smoke.py`
- `python3 tests/ui_smoke.py`

## 결론
### 이번 단계에서 얻은 것
- 경량 move ordering 평가기를 넣을 **구조적 자리**는 확인했습니다.
- 후반 ordering 평가기용 stats / 테스트 / 벤치마크 기반도 마련했습니다.
- tiny exact 구간에서는 현재 방식이 노이즈가 될 수 있다는 점도 확인했습니다.

### 아직 부족한 점
현재 구현은:
- differential pattern update가 없고,
- 가중치가 hand-tuned 수준이며,
- ordering evaluator가 full search와 다른 목적을 위해 별도 튜닝된 것이 아니기 때문에,

강한 엔진들이 얻는 실익을 재현하지 못했습니다.

### 판단
- **구조 실험 자체는 성공**
- **실전 성능 개선은 아직 미확인**
- 따라서 이번 단계는 “명확한 성능 향상 패치”라기보다
  **다음 튜닝/학습 단계로 넘어가기 위한 scaffold 구축**에 가깝습니다.

## 다음 단계 추천
실익을 더 보려면 다음 둘 중 하나가 더 적합합니다.

1. **ordering evaluator 자체를 학습/튜닝**
   - tiny feature subset에 대해 late/exact outcome을 teacher로 사용
   - 현재 hand-tuned weight를 작은 learned table 또는 phase별 weight로 교체

2. **ordering evaluator보다 learned pattern table 쪽으로 이동**
   - 현재 full evaluator 또는 ordering evaluator에 들어갈 작은 learned pattern table을 추가
   - 브라우저 환경에서는 이것이 더 직접적인 strength gain으로 이어질 가능성이 큼

## 이번 단계에서 변경한 파일
- `js/ai/evaluator.js`
- `js/ai/search-engine.js`
- `js/test/core-smoke.mjs`
- `README.md`
- `benchmarks/ordering_eval_prototype_exact_8empties_stage7.json`
- `benchmarks/ordering_eval_search_13empties_stage6_vs_stage7.json`
- `review-stage-07-lightweight-move-ordering-evaluator-experiment.md`
