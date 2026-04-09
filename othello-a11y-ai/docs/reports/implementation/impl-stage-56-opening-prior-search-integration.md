# 구현 보고서 Stage 56 — Opening prior search integration

## 배경 / 목표
- Stage 55에서 compact runtime opening prior를 설치했지만, 실제 탐색 엔진은 아직 이를 거의 사용하지 않았습니다.
- 이번 단계의 목표는 정적 웹앱 제약 안에서 opening book과 opening prior를 **보수적으로 혼합**하는 것입니다.
- 특히 다음 세 가지를 묶어 반영했습니다.
  1. direct opening-book 선택에 confidence gate 도입
  2. opening prior를 root ordering / opening selection에 연결
  3. 무작위성 옵션을 opening/search 두 축으로 분리

## 변경 범위
- `js/ai/search-engine.js`
- `js/ai/opening-prior.js`
- `js/ai/presets.js`
- `js/ui/formatters.js`
- `js/test/stage56_opening_prior_search_integration_smoke.mjs`
- `README.md`
- `docs/reports/features/feature-opening-book-integration.md`

## 핵심 변경 사항
### 1) opening/search randomness 분리
- 난이도/스타일/사용자 지정 옵션 해석에서 `randomness`를
  - `openingRandomness`
  - `searchRandomness`
  로 분리했습니다.
- 기존 `randomness` 입력은 하위 호환을 위해 두 값에 동시에 매핑하고, 내부 alias는 `searchRandomness`를 따르도록 유지했습니다.
- UI 요약도 두 값을 각각 표시하도록 바꿨습니다.

### 2) direct opening-book confidence gate
- 기존에는 direct-use 구간(<= 12 ply)에서 북 히트 시 곧바로 북 수를 반환했습니다.
- 이번 단계에서는
  - 초반 매우 이른 수는 그대로 direct 허용
  - 단일 후보라도 evidence가 약하면 search로 복귀 가능
  - 복수 후보는 lightweight opening score gap + book share + prior support를 함께 보고 direct 여부를 결정
  하도록 바꿨습니다.
- 애매한 분기에서는 `openingConfidenceSkips` 통계를 남기고 일반 탐색으로 돌아갑니다.

### 3) opening prior hybrid
- `createRootOpeningContext()`로 book/prior를 한데 모은 root opening context를 만들었습니다.
- direct opening-book 후보 선택에서는
  - curated book evidence
  - WTHOR prior share / priorScoreDelta
  - 위치/위험칸/상대 기동성 억제
  를 합친 경량 pseudo-eval을 사용합니다.
- full search로 들어가는 경우에도 root ordering에서
  - 기존 book ordering bonus
  - 새 opening prior ordering bonus
  를 함께 사용하도록 했습니다.

### 4) symmetry-expanded prior lookup
- compact prior는 canonical-4 대칭 기준으로 저장되므로, 대칭이 큰 포지션에서는 조회 시 후보 수가 하나만 보이는 문제가 있었습니다.
- `lookupOpeningPrior()`가 동일 canonical hash를 만드는 모든 변환을 추적하고, 런타임에서 후보 수를 현재 보드 방향의 합법 수 궤도(orbit)로 다시 확장하도록 수정했습니다.
- 그 결과 초기 보드 prior는 한 수(F5)만 보이는 대신 C4/D3/E6/F5 네 수 전체를 복원합니다.

## 관련 판단
- WTHOR prior는 **direct opening book의 완전 대체재**가 아니라,
  - ambiguous book branch의 confidence 보강
  - root move ordering bias
  용도로 쓰는 편이 현재 정적 웹앱 구조에 더 안전합니다.
- low-count prior를 과도하게 신뢰하지 않도록 coverage/log-count를 사용해 보너스를 완만하게 제한했습니다.

## 검증
다음 테스트를 다시 실행해 통과했습니다.

```bash
node js/test/core-smoke.mjs
node js/test/stage53_opening_prior_training_smoke.mjs
node js/test/stage54_opening_book_named_expansion_smoke.mjs
node js/test/stage55_opening_prior_runtime_compaction_smoke.mjs
node js/test/stage56_opening_prior_search_integration_smoke.mjs
python3 tests/virtual_host_smoke.py
python3 tests/ui_smoke.py
```

## 관찰 메모
- 설치된 runtime prior 기준으로 초기 보드 prior는 symmetry expansion 후 4개 합법 수를 모두 노출했습니다.
- direct opening-book 선택에서는 `openingRandomness`만 영향을 주고, `searchRandomness`는 영향을 주지 않도록 회귀를 추가했습니다.
- search 모드에서는 반대로 `searchRandomness`만 near-best root 선택 다양화에 영향을 주고, `openingRandomness`는 영향을 주지 않도록 회귀를 추가했습니다.

## 다음 단계
- confidence gate 임계치와 prior ordering bonus 크기를 벤치마크 기반으로 추가 보정할 수 있습니다.
- compact prior의 `maxPly` / `minPositionCount` / `minMoveCount`를 재조정해 strength-size tradeoff를 더 미세하게 맞출 수 있습니다.
- 필요하면 opening prior를 direct selection보다도 `root prior + shallow verify` 쪽으로 더 강하게 기울이는 실험을 할 수 있습니다.
