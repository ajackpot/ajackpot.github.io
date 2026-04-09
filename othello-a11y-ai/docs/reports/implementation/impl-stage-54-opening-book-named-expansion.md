# Stage 54 구현 보고서 — opening book named expansion

## 요약
- 기존 Robert Gatliff base seed 99개는 그대로 유지했습니다.
- othlog에서 확인한 named continuation 12개를 supplemental line으로 추가했습니다.
- supplemental line은 모두 `count = 1`로 넣어 초반 대표 수 빈도 분포를 거의 건드리지 않도록 했습니다.
- 오프닝북 요약 메타데이터에 `baseSeedLineCount`, `supplementalSeedLineCount`를 추가했습니다.
- 신규 스모크 테스트로 “기존 full sequence와 겹치지 않음 / endpoint uniqueness / named branch lookup”을 검증했습니다.

## 구현 배경
오프닝 prior 학습 파이프라인을 기다리는 동안, 현재 정적 브라우저 앱에 바로 넣을 수 있는 가벼운 확장으로 named continuation을 소량 보강했습니다.

핵심 제약은 다음 두 가지였습니다.
1. 기존 compact book의 초반 대표 수 분포를 망가뜨리지 않을 것
2. 기존 seed line과 똑같은 full sequence를 반복 추가하지 않을 것

## 변경 사항
### 1) `js/ai/opening-book-data.js`
- base catalog와 supplemental named line을 분리했습니다.
- supplemental line 12개를 추가했습니다.
  - `F.A.T. Draw`
  - `Bond`
  - `Public Draw`
  - `Nusa (幣)`
  - `Lightning Bolt`
  - `Ladybird`
  - `Christmas Tree`
  - `Superman`
  - `Jelly`
  - `Tank (戦車)`
  - `Tori Hook (酉フック)`
  - `Tori Straight (酉ストレート)`
- metadata에 다음 항목을 추가했습니다.
  - `baseSeedLineCount`
  - `supplementalSeedLineCount`
  - `seedLineCount`
- 확장 후 summary는 다음과 같습니다.
  - base 99
  - supplemental 12
  - total 111
  - expanded positions 643
  - max depth 21 ply

### 2) `js/test/core-smoke.mjs`
- opening book summary expectation을 새 count에 맞게 갱신했습니다.
- `Bond`, `Superman`, `Tori Hook/Tori Straight` prefix lookup 회귀를 추가했습니다.

### 3) `js/test/stage54_opening_book_named_expansion_smoke.mjs`
- base sequence dedupe 확인
- supplemental line이 base full sequence와 중복되지 않는지 확인
- 모든 seed endpoint hash uniqueness 확인
- supplemental line low-weight 정책(`count = 1`) 확인
- Tori branch named candidate lookup 확인

### 4) 문서
- `README.md`
- `docs/reports/features/feature-opening-book-integration.md`

## 설계 판단
- named continuation은 “강한 prior”가 아니라 “얕은 라벨 보강 + 깊은 branch seed”로 취급했습니다.
- 따라서 frequency를 새로 추정하지 않은 line은 `count = 1`로 두었습니다.
- 이 방식은 다음 단계에서 opening prior JSON/WTHOR prior를 붙일 때도 충돌이 적습니다.

## 검증
다음을 실행해 통과했습니다.

```bash
node js/test/core-smoke.mjs
node js/test/stage54_opening_book_named_expansion_smoke.mjs
```

## 다음 단계 메모
- 학습 완료 후 `trained-opening-prior-profile.json`이 준비되면,
  - opening confidence gate
  - opening prior + direct book hybrid
  - opening/search randomness 분리
  순으로 연결하는 것이 자연스럽습니다.
