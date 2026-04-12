# 오프닝북 통합 보고서

## 요약
- 이름 있는 오델로 오프닝 카탈로그를 바탕으로 소형 오프닝북을 추가했습니다.
- base seed line 99개에 selected named continuation 12개를 낮은 가중치로 추가해 총 111개로 확장했고, 런타임 전개 후 실제 조회 가능한 포지션 엔트리는 643개입니다.
- 오프닝북은 초기 12플라이까지 직접 수를 제안하고, 최대 18플라이까지는 탐색 루트 수 정렬 참고 정보로도 활용할 수 있게 설계했습니다.
- compact WTHOR opening prior를 별도 runtime 모듈로 연결해 direct opening 선택의 confidence gate와 root move ordering bias를 함께 제공합니다.
- Stage 59에서는 prior contradiction veto와 direct-use cap 9를 결합한 `stage59-cap9-prior-veto`를 기본 hybrid profile로 채택했고, Stage 123 replay revalidation에서도 이 기본값을 유지했습니다.
- 초기 위치에서는 엔진이 탐색 없이 즉시 북 수를 반환하지만, 애매한 분기나 prior가 강하게 반대하는 분기에서는 search로 복귀할 수 있습니다.

## 데이터 선정 방식
1. Robert Gatliff 오프닝 카탈로그의 이름 있는 라인과 출현 빈도 정보를 기준 데이터로 삼았습니다.
2. move sequence 목록 396개를 초기 국면의 색 보존 대칭(항등, 180도 회전, 주대각 반사, 부대각 반사) 기준으로 정리했습니다.
3. 그 결과 정확히 99개의 고유 base seed line이 남았고, 이를 compact opening book의 기반 입력으로 채택했습니다.
4. 이후 othlog의 named continuation 중 기존 full sequence와 겹치지 않는 12개를 count 1의 보조 line으로 추가했습니다.
5. 각 포지션에서는 가능한 다음 수마다 누적 빈도와 대표 오프닝 이름을 함께 저장합니다.

## 구현 세부 사항
### 추가 파일
- `js/ai/opening-book-data.js`
  - base 99개 seed line과 supplemental named continuation 12개를 분리해 보관합니다.
- `js/ai/opening-book.js`
  - seed line을 실제 포지션 엔트리로 전개하고 조회하는 모듈입니다.
  - 런타임에 한 번만 빌드되며 캐시됩니다.
- `js/ai/opening-prior.js`
  - compact runtime prior를 조회하고, canonical-4 대칭 압축을 현재 보드 방향의 합법 수들로 다시 복원합니다.
- `js/ai/opening-tuning.js`
  - opening book/prior hybrid 임계치와 보너스 scale을 named profile로 관리합니다.

### 엔진 통합
- `js/ai/search-engine.js`
  - 초기~초중반에는 `lookupOpeningBook(state)`와 `lookupOpeningPrior(state)`를 함께 확인합니다.
  - 히트가 있으면 스타일/위험도/기동성 + prior 결과를 반영한 경량 점수로 북 후보를 정렬합니다.
  - 직접 사용 구간에서는 confidence gate를 통과한 경우에만 탐색 없이 즉시 수를 반환하고, 기본 hybrid profile에서는 direct-use 상한을 9 ply로 줄였습니다.
  - WTHOR prior가 충분한 샘플 수로 선택 수를 강하게 반대하면 `prior contradiction veto`가 발동해 direct book을 취소하고 search로 복귀합니다.
  - 그 이후 구간에서는 full search를 유지하되, book/prior 후보가 있으면 루트 move ordering 보너스를 줍니다.
  - 결과 객체에 `source: 'opening-book' | 'search'`, `bookHit`, `openingPriorHit` 메타데이터를 추가했고, veto case에서는 `bookHit.priorContradictionVeto` 설명도 남깁니다.

### UI 반영
- `js/ui/formatters.js`
  - 최근 AI 탐색 요약과 설정 패널에서 split randomness와 오프닝북 직선택 정보를 표시합니다.
- `README.md`
  - 소형 오프닝북 구조와 추가 파일을 문서화했습니다.
- `tools/evaluator-training/benchmark-opening-hybrid-tuning.mjs`
  - opening-book prefix corpus를 search-only reference와 비교해 hybrid tuning profile을 평가합니다.

## 구현 중 확인한 핵심 포인트
- 초기 보드는 8개 전체 정다면체 대칭이 아니라, **색을 보존하는 4개 대칭**만 그대로 적용 가능합니다.
- 90도 회전이나 수평/수직 반사는 시작 배치에서 흑백 돌을 서로 교환해 버리므로, seed line 전개에 그대로 쓰면 불법 수가 생깁니다.
- 따라서 색을 보존하는 4개 대칭만 사용해 전개했습니다.

## 검증 결과
### 오프닝북 요약
- base seed line 수: 99
- supplemental named line 수: 12
- 총 seed line 수: 111
- 전개 후 포지션 수: 643
- 최대 북 깊이: 21 ply

### 동작 예시
- 초기 위치에서 결과:
  - `source = opening-book`
  - 탐색 노드 `0`
  - `bookHits = 1`, `bookMoves = 1`, `openingPriorHits = 1`
- 검색 모드 테스트 위치에서는:
  - `source = search`
  - direct book에 과도하게 의존하지 않고 기존 탐색기로 복귀
  - 필요 시 `openingPriorHit` 메타데이터와 root ordering bias를 함께 사용

## 테스트
다음 테스트를 모두 다시 실행해 통과했습니다.

```bash
node js/test/core-smoke.mjs
python3 tests/ui_smoke.py
python3 tests/virtual_host_smoke.py
```

## 비고
- 이번 구현은 “대형 토너먼트 북”이 아니라 브라우저 정적 앱에 적합한 compact opening book입니다.
- supplemental line은 모두 count 1로 넣어 base 빈도 분포를 거의 건드리지 않도록 했습니다.
- Stage 57에서는 `stage57-book-led` tuning profile을 기본값으로 채택해, book이 있을 때 off-book prior ordering을 더 약하게 주고 single-candidate named continuation 일부는 강한 prior support가 있을 때만 direct로 허용하도록 다듬었습니다.
- `benchmarks/stage57_opening_hybrid_tuning_benchmark.json` 기준으로, `stage57-book-led`는 legacy 대비 agreement 58.2%→58.8%, direct rate 89.6%→90.7%, off-book choice 4.4%→3.8%, 평균 노드 70.6→62.7을 기록했습니다.
- Stage 58의 다중 reference suite(`benchmarks/stage58_opening_hybrid_reference_suite.json`)에서는 baseline 외에 stronger assisted search와 pure-search reference까지 함께 비교했습니다. 그 결과 `stage57-book-led`는 가장 빠르지만 stronger reference와의 worst-case agreement는 57.7%로 소폭 낮았고, `stage57-prior-light`/`stage56-legacy`/`stage57-cautious`는 58.2%로 동일했습니다.
- 다만 reference끼리도 완전 합의하지 않았습니다. baseline vs strong-assisted는 70.9%, baseline vs pure-search는 64.8%, strong-assisted vs pure-search는 83.0% agreement를 보였습니다.
- Stage 59에서는 replay benchmark(`benchmarks/stage59_opening_wrapup_candidates.json`)로 남은 후보를 재평가해, `prior contradiction veto`와 `direct cap 9`를 함께 적용한 `stage59-cap9-prior-veto`를 최종 기본값으로 채택했습니다.
- 이 profile은 multi-reference 기준 worst agreement 60.4%, average agreement 62.1%로 가장 높았고, contradiction veto는 전체 corpus의 약 4.9% case에서만 발동했습니다. 반면 `stage59-prior-veto`는 direct rate 85.7%를 유지하는 저비용 대안으로 남겼고, cap만 줄인 `stage59-cap9`는 채택하지 않았습니다.
- Stage 123 replay revalidation(`benchmarks/stage123_opening_default_revalidation_benchmark_20260412.json`)에서도 결론은 바뀌지 않았습니다. Stage 59-compatible replay에서는 `stage59-cap9-prior-veto`가 worst/average agreement `59.3% / 61.0%`로 `stage59-prior-veto`(`57.1% / 59.5%`)를 앞섰고, current normal-runtime-like replay(`d6 / 1500ms`)에서는 격차가 `62.6% / 64.5%` 대 `59.9% / 60.3%`로 더 벌어졌습니다.
