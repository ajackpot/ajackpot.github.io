# 구현 보고서 Stage 25 — 런타임 옵션 정리와 dormant 로직 제거

## 1. 배경
Stage 16, 21, 24에서 stability cutoff와 cut-aware fastest-first는 각각 실험되었지만 기본 채택되지 않았습니다.
그런데 실제 코드에는 다음과 같은 off-by-default 경로가 계속 남아 있었습니다.

- `stabilityCutoff`
- `stabilityCutoffWld`
- `stabilityCutoffWldMaxEmpties`
- `exactFastestCutFirstOrdering`

이들은 UI에도 노출되지 않았고, 기본 프리셋에서도 켜지지 않았으며, 최근 벤치마크 기준으로도 채택 가치가 없었습니다.

## 2. 이번 단계의 원칙
이번 단계에서는 dormant 로직을 세 부류로 나눴습니다.

1. **실제 채택되어 기본 경로에서 쓰이는 로직**
   - 유지
2. **회귀 baseline 비교에 여전히 의미가 있는 on/off 토글**
   - 내부 토글로 유지
3. **기본값이 꺼진 채로 남아 있고, 성능 이득도 입증되지 않은 실험 경로**
   - 제거

사용자 지정 옵션으로 노출할지 여부도 검토했지만,
이번에 제거한 경로들은 “취향 차이”가 아니라 **명확히 비채택된 실험**이므로 UI에 올리지 않기로 했습니다.

## 3. 코드 변경
### 3.1 `js/ai/search-engine.js`
다음 dormant 경로를 제거했습니다.

- WLD stability cutoff helper 호출부
- stability bound cache 및 관련 stats
- `stabilityCutoff*` 옵션 해석 로직
- `exactFastestCutFirstOrdering` 옵션 해석 로직
- cut-aware fastest-first 우선순위 계산 헬퍼
- cut-aware fastest-first 전용 stats

정리 후 남은 것은 다음입니다.

- 채택된 `exactFastestFirstOrdering`
- 채택된 `enhancedTranspositionCutoff`
- 채택된 `wldPreExactEmpties`
- 채택된 exact few-empties solver 계열

### 3.2 `js/ai/evaluator.js`
`describeStableDiscBounds()`는 제거하지 않았습니다.
이 함수는 더 이상 런타임 search pruning에는 쓰이지 않지만,
다음 목적 때문에 보존합니다.

- conservative bound 회귀 테스트
- 후속 endgame / MPC 준비 실험의 분석 보조
- 안정성 추정이 evaluator 수준에서 여전히 유효한지 점검

즉 **runtime pruning 로직은 제거하고, evaluator 보조 함수는 유지**했습니다.

### 3.3 테스트/보조 스크립트 정리
- `js/test/core-smoke.mjs`
  - Stage 21 WLD stability prototype 회귀 제거
  - Stage 24 cut-aware screening 회귀 제거
- `js/test/benchmark-helpers.mjs`
  - 제거된 stats / option 필드 정리
- `js/test/stage24_exact_fastest_first_benchmark.mjs`
  - cut-aware variant 제거, baseline vs fastest-first만 남김
- `js/test/stage21_wld_stability_cutoff_benchmark.mjs`
  - 삭제

## 4. 문서 정리
- `docs/reports/README.md`
  - 누락된 Stage 목록 보완
  - “역사 문서와 현재 코드가 다를 수 있음”을 명시
- 루트 `README.md`
  - Stage 25 cleanup 원칙과 제거 범위를 반영

## 5. 핵심 판단
이번 단계의 판단은 다음과 같습니다.

- **비채택 실험 토글은 사용자 옵션으로 올리지 않는다.**
- **성능이 검증된 경로만 런타임에 남긴다.**
- **분석에 재사용 가능한 evaluator helper는 남긴다.**
- **과거 실험 결과는 문서와 benchmark JSON로 보존한다.**

## 6. 관련 파일
- `README.md`
- `docs/reports/README.md`
- `js/ai/search-engine.js`
- `js/ai/evaluator.js`
- `js/test/core-smoke.mjs`
- `js/test/benchmark-helpers.mjs`
- `js/test/stage24_exact_fastest_first_benchmark.mjs`

## 7. 검증
- `node js/test/core-smoke.mjs`
- `node js/test/perft.mjs`
- `python3 tests/ui_smoke.py`
- `python3 tests/virtual_host_smoke.py`

## 8. 결과 요약
Stage 25는 엔진 강화를 위한 새 pruning 기법 도입 단계가 아니라,
**이미 비채택 판정을 받은 dormant 경로를 런타임 코드에서 걷어내고 문서/테스트와 현재 상태를 다시 맞춘 정리 단계**입니다.
