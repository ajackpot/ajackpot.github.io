# 구현/검토 보고서 정리 규칙

이 디렉터리는 구현 이력과 실험/검토 문서를 한곳에서 관리하기 위한 문서 허브입니다.

## 디렉터리 규칙
- `implementation/`: 실제 코드 변경이 반영된 구현 보고서
- `review/`: 실험, 검토, 채택/비채택 판단을 남기는 리뷰 보고서
- `features/`: 특정 기능(예: 오프닝북) 단위의 보충 설계/통합 문서
- `templates/`: 새 보고서를 작성할 때 시작점으로 쓰는 템플릿

## 파일명 규칙
- 전부 **소문자 kebab-case**를 사용합니다.
- 루트에 `IMPLEMENTATION_REPORT_*` 형태로 두지 않고, 의미별 하위 폴더에 둡니다.
- Stage 번호가 있는 문서는 두 자리로 고정합니다.
- 권장 패턴:
  - 구현: `impl-stage-03-search-engine-comparison-and-optimization.md`
  - 검토: `review-stage-09-exact-window-late-ordering-profile-redesign.md`
  - 기능: `feature-opening-book-integration.md`

## 제목 규칙
- 구현: `# 구현 보고서 Stage 03 — 주제`
- 검토: `# 검토 보고서 Stage 09 — 주제`
- 기능: `# 기능 보고서 — 주제`

기존 문서는 원래 제목을 유지해도 되지만, 앞으로 추가되는 문서는 위 형식을 권장합니다.

## 본문 권장 섹션
1. 배경 / 목표
2. 변경 또는 실험 범위
3. 관련 파일
4. 핵심 결정 사항
5. 검증 방법과 결과
6. 벤치마크 / 근거 데이터
7. 리스크 / 비채택 항목
8. 다음 단계

## 운영 메모
- **현재 코드와 역사 문서는 다를 수 있습니다.** 비채택 실험은 보고서와 벤치마크 JSON로는 남기되, 실제 런타임 코드에서는 제거할 수 있습니다.
- 사용자 노출 옵션은 실제 플레이에서 의미 있는 선택지만 남기고, 성능이 나빴던 실험 토글은 문서로만 보존하는 것을 원칙으로 합니다.

## 현재 문서 목록
### 구현
- `implementation/impl-stage-03-search-engine-comparison-and-optimization.md`
- `implementation/impl-stage-04-pattern-edge-evaluation-upgrade.md`
- `implementation/impl-stage-05-exact-endgame-small-solver.md`
- `implementation/impl-stage-06-search-overhead-reduction-and-tt-first-search.md`
- `implementation/impl-stage-12-packed-hash-key-optimization.md`
- `implementation/impl-stage-13-evaluator-corner-access-and-audit-tuning.md`
- `implementation/impl-stage-14-root-exact-endgame-boundary-and-fallback-hardening.md`
- `implementation/impl-stage-15-exact-root-single-shot-and-ui-mode-annotation.md`
- `implementation/impl-stage-17-conservative-enhanced-transposition-cutoff.md`
- `implementation/impl-stage-18-strict-root-wld-pre-exact-mode.md`
- `implementation/impl-stage-19-wld-range2-default-adoption-and-black-parity.md`
- `implementation/impl-stage-21-wld-only-stability-cutoff-prototype.md`
- `implementation/impl-stage-22-exact-only-few-empties-solver-and-stats-cleanup.md`
- `implementation/impl-stage-23-specialized-few-empties-exact-solver.md`
- `implementation/impl-stage-24-exact-fastest-first-ordering.md`
- `implementation/impl-stage-25-runtime-option-cleanup-and-dormant-logic-removal.md`

### 검토
- `review/review-stage-03-engine-audit.md`
- `review/review-stage-04-engine-audit.md`
- `review/review-stage-05-conservative-selective-search-lmr.md`
- `review/review-stage-06-zero-sum-evaluation-and-audit.md`
- `review/review-stage-07-lightweight-move-ordering-evaluator-experiment.md`
- `review/review-stage-08-exact-teacher-late-ordering-tuning.md`
- `review/review-stage-09-exact-window-late-ordering-profile-redesign.md`
- `review/review-stage-10-exact-window-ordering-profile-retuning.md`
- `review/review-stage-11-15-16-bucket-17-18-pre-exact-profile-experiment.md`
- `review/review-stage-12-external-engine-technique-survey-and-adoption-candidates.md`
- `review/review-stage-13-traditional-evaluator-audit.md`
- `review/review-stage-14-late-game-boundary-bug-audit.md`
- `review/review-stage-15-exact-root-ux-and-overhead-audit.md`
- `review/review-stage-16-stability-cutoff-prototype-screening.md`
- `review/review-stage-17-enhanced-transposition-cutoff-benchmark.md`
- `review/review-stage-18-wld-pre-exact-root-benchmark.md`
- `review/review-stage-19-wld-range2-black-parity-benchmark.md`
- `review/review-stage-21-wld-only-stability-cutoff-spotcheck.md`
- `review/review-stage-22-few-empties-exact-vs-wld-buckets.md`
- `review/review-stage-23-specialized-few-empties-exact-solver.md`
- `review/review-stage-24-exact-fastest-first-and-cut-aware-audit.md`
- `review/review-stage-25-dormant-runtime-logic-classification.md`

### 기능
- `features/feature-opening-book-integration.md`
