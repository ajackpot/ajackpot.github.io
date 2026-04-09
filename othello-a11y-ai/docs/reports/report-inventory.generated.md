# 생성된 리포트 인벤토리

이 문서는 `node tools/docs/generate-report-inventory.mjs`로 생성됩니다.
수동으로 문서 목록을 유지하지 않고, 현재 저장소 상태를 기준으로 구현/검토/기능/체크리스트 문서를 한 번에 정리합니다.

- 생성 시각: `2026-04-09T19:35:00+09:00`
- 현재 저장소 Stage: **Stage 87** (tag: `stage87`)
- 총 분류 문서 수: **70**

## 빠른 진입점
- [AI 구현 체크리스트](checklists/ai-implementation-checklist.md)
- [최신 구현 보고서 (Stage 87)](implementation/impl-stage-87-runtime-documentation-closeout.md)
- [생성된 리포트 인벤토리 JSON](report-inventory.generated.json)

## 요약
| 구분 | 설명 | 문서 수 | 최신 Stage |
| --- | --- | ---: | --- |
| 체크리스트 | 현재 구현 상태를 빠르게 확인하는 운영 문서 | 1 | — |
| 구현 | 실제 코드 변경이 반영된 구현 보고서 | 46 | Stage 87 |
| 검토 | 실험, 검토, 채택/비채택 판단 문서 | 22 | Stage 25 |
| 기능 | 특정 기능 단위의 보충 설계/통합 문서 | 1 | — |

## 체크리스트
| Stage | 파일 | 제목 |
| --- | --- | --- |
| — | [ai-implementation-checklist.md](checklists/ai-implementation-checklist.md) | AI 구현 체크리스트 |

## 구현
| Stage | 파일 | 제목 |
| --- | --- | --- |
| Stage 87 | [impl-stage-87-runtime-documentation-closeout.md](implementation/impl-stage-87-runtime-documentation-closeout.md) | 구현 보고서 Stage 87 — 런타임 문서 정리 마감 |
| Stage 86 | [impl-stage-86-runtime-stability-hotpath-audit.md](implementation/impl-stage-86-runtime-stability-hotpath-audit.md) | 구현 보고서 Stage 86 — 런타임 stability hotpath audit / refactor |
| Stage 85 | [impl-stage-85-report-hub-and-ai-checklist-closeout.md](implementation/impl-stage-85-report-hub-and-ai-checklist-closeout.md) | 구현 보고서 Stage 85 — 리포트 허브/AI 체크리스트 마감 리팩토링 |
| Stage 84 | [impl-stage-84-exact-micro-solver-threshold-extension.md](implementation/impl-stage-84-exact-micro-solver-threshold-extension.md) | Stage 84 Implementation - Exact micro-solver threshold extension |
| Stage 80 | [impl-stage-80-etc-inplace-preparation-cleanup.md](implementation/impl-stage-80-etc-inplace-preparation-cleanup.md) | Stage 80 — ETC in-place prepared-move cleanup |
| Stage 63 | [impl-stage-63-multi-candidate-training-suite.md](implementation/impl-stage-63-multi-candidate-training-suite.md) | Stage 63 training pipeline hardening |
| Stage 60 | [impl-stage-60-evaluator-training-package-refresh.md](implementation/impl-stage-60-evaluator-training-package-refresh.md) | Stage 60 — evaluator training package refresh |
| Stage 59 | [impl-stage-59-opening-wrapup-candidates.md](implementation/impl-stage-59-opening-wrapup-candidates.md) | 구현 보고서 Stage 59 — Opening wrap-up 후보 적용/채택 |
| Stage 58 | [impl-stage-58-opening-hybrid-reference-suite.md](implementation/impl-stage-58-opening-hybrid-reference-suite.md) | 구현 보고서 Stage 58 — Stronger opening hybrid reference suite benchmark |
| Stage 57 | [impl-stage-57-opening-hybrid-tuning-benchmark.md](implementation/impl-stage-57-opening-hybrid-tuning-benchmark.md) | 구현 보고서 Stage 57 — Opening hybrid tuning benchmark |
| Stage 56 | [impl-stage-56-opening-prior-search-integration.md](implementation/impl-stage-56-opening-prior-search-integration.md) | 구현 보고서 Stage 56 — Opening prior search integration |
| Stage 55 | [impl-stage-55-opening-prior-runtime-compaction.md](implementation/impl-stage-55-opening-prior-runtime-compaction.md) | Stage 55 구현 보고서 — opening prior runtime compaction |
| Stage 54 | [impl-stage-54-opening-book-named-expansion.md](implementation/impl-stage-54-opening-book-named-expansion.md) | Stage 54 구현 보고서 — opening book named expansion |
| Stage 45 | [impl-stage-45-move-ordering-replay-and-next-lane-decision.md](implementation/impl-stage-45-move-ordering-replay-and-next-lane-decision.md) | Stage 45 - Move-ordering replay/orchestrator, optional MPC module slot, and next-lane decision |
| Stage 43 | [impl-stage-43-top-pair-move-ordering-local-search.md](implementation/impl-stage-43-top-pair-move-ordering-local-search.md) | Stage 43: top-pair move-ordering local search |
| Stage 42 | [impl-stage-42-multi-action-move-ordering-local-search.md](implementation/impl-stage-42-multi-action-move-ordering-local-search.md) | Stage 42 - Multi-action move-ordering local-search support and candidateF follow-up |
| Stage 39 | [impl-stage-39-search-cost-local-search-tuner.md](implementation/impl-stage-39-search-cost-local-search-tuner.md) | Stage 39 — move-ordering search-cost local-search tuner |
| Stage 38 | [impl-stage-38-stage-metadata-and-move-ordering-decision.md](implementation/impl-stage-38-stage-metadata-and-move-ordering-decision.md) | Stage 38 — stage metadata 정리와 move-ordering 학습 방향 결정 |
| Stage 37 | [impl-stage-37-json-profile-module-builder-and-uploaded-weight-benchmarking.md](implementation/impl-stage-37-json-profile-module-builder-and-uploaded-weight-benchmarking.md) | Stage 37 — JSON 기반 generated module 재구성 및 업로드 가중치 검증 |
| Stage 36 | [impl-stage-36-package-slimming-and-release-profiles.md](implementation/impl-stage-36-package-slimming-and-release-profiles.md) | Stage 36 구현 보고서 - 패키지 경량화 분석과 release profile 도입 |
| Stage 35 | [impl-stage-35-mpc-calibration-harness-and-next-pipeline-decision.md](implementation/impl-stage-35-mpc-calibration-harness-and-next-pipeline-decision.md) | Stage 35 — MPC calibration harness and next-pipeline decision |
| Stage 34 | [impl-stage-34-cwd-independent-training-path-resolution.md](implementation/impl-stage-34-cwd-independent-training-path-resolution.md) | Stage 34 — cwd-independent training tool path resolution |
| Stage 33 | [impl-stage-33-evaluation-profile-audit-and-bucket-exclusions.md](implementation/impl-stage-33-evaluation-profile-audit-and-bucket-exclusions.md) | Stage 33 — evaluation profile audit / parity alias canonicalization / bucket exclusion pipeline |
| Stage 32 | [impl-stage-32-move-ordering-root-centered-pipeline-and-audit.md](implementation/impl-stage-32-move-ordering-root-centered-pipeline-and-audit.md) | Stage 32 — move-ordering 파이프라인 보강: root-centered target, root-uniform weighting, audit 도구 |
| Stage 31 | [impl-stage-31-uploaded-move-ordering-validation-and-trineutron-solver-cutoff-benchmarking.md](implementation/impl-stage-31-uploaded-move-ordering-validation-and-trineutron-solver-cutoff-benchmarking.md) | Stage 31 — 업로드된 move-ordering 가중치 검증 및 trineutron solver-cutoff 실전 벤치마크 |
| Stage 30 | [impl-stage-30-trineutron-match-benchmarking.md](implementation/impl-stage-30-trineutron-match-benchmarking.md) | Stage 30 — trineutron 대국 벤치마크 도입 및 실전 비교 |
| Stage 29 | [impl-stage-29-move-ordering-profile-training-and-combined-export.md](implementation/impl-stage-29-move-ordering-profile-training-and-combined-export.md) | Stage 29 — late move-ordering 학습 도구 및 combined export 정비 |
| Stage 28 | [impl-stage-28-uploaded-profile-validation-bias-fix-and-search-benchmarks.md](implementation/impl-stage-28-uploaded-profile-validation-bias-fix-and-search-benchmarks.md) | Stage 28 — uploaded profile validation, side-to-move bias fix, and search benchmark tooling |
| Stage 27 | [impl-stage-27-training-eta-progress-and-sampling-tooling.md](implementation/impl-stage-27-training-eta-progress-and-sampling-tooling.md) | Stage 27 — learned evaluator training ETA / progress / sampling tooling |
| Stage 26 | [impl-stage-26-phase-bucket-learned-evaluator-tooling.md](implementation/impl-stage-26-phase-bucket-learned-evaluator-tooling.md) | Stage 26 구현 보고서 - phase-bucket learned evaluator 구조와 오프라인 학습 도구 |
| Stage 25 | [impl-stage-25-runtime-option-cleanup-and-dormant-logic-removal.md](implementation/impl-stage-25-runtime-option-cleanup-and-dormant-logic-removal.md) | 구현 보고서 Stage 25 — 런타임 옵션 정리와 dormant 로직 제거 |
| Stage 24 | [impl-stage-24-exact-fastest-first-ordering.md](implementation/impl-stage-24-exact-fastest-first-ordering.md) | Stage 24 Implementation - Exact-only fastest-first ordering with cut-aware screening |
| Stage 23 | [impl-stage-23-specialized-few-empties-exact-solver.md](implementation/impl-stage-23-specialized-few-empties-exact-solver.md) | Stage 23 Implementation - Specialized exact few-empties solver family |
| Stage 22 | [impl-stage-22-exact-only-few-empties-solver-and-stats-cleanup.md](implementation/impl-stage-22-exact-only-few-empties-solver-and-stats-cleanup.md) | Stage 22 Implementation - Exact-only few-empties solver and stats cleanup |
| Stage 21 | [impl-stage-21-wld-only-stability-cutoff-prototype.md](implementation/impl-stage-21-wld-only-stability-cutoff-prototype.md) | 구현 보고서 Stage 21 — WLD 전용 Stability Cutoff 프로토타입 |
| Stage 19 | [impl-stage-19-wld-range2-default-adoption-and-black-parity.md](implementation/impl-stage-19-wld-range2-default-adoption-and-black-parity.md) | 구현 보고서 Stage 19 — WLD `+2` 기본 채택 및 흑 차례 parity 구간 도달 |
| Stage 18 | [impl-stage-18-strict-root-wld-pre-exact-mode.md](implementation/impl-stage-18-strict-root-wld-pre-exact-mode.md) | 구현 보고서 Stage 18 — Strict Root-Only WLD Pre-Exact 모드 도입 |
| Stage 17 | [impl-stage-17-conservative-enhanced-transposition-cutoff.md](implementation/impl-stage-17-conservative-enhanced-transposition-cutoff.md) | 구현 보고서 Stage 17 — Conservative Enhanced Transposition Cutoff 도입 |
| Stage 15 | [impl-stage-15-exact-root-single-shot-and-ui-mode-annotation.md](implementation/impl-stage-15-exact-root-single-shot-and-ui-mode-annotation.md) | 구현 보고서 Stage 15 — exact root 단일 탐색화 및 UI 모드 표기 |
| Stage 14 | [impl-stage-14-root-exact-endgame-boundary-and-fallback-hardening.md](implementation/impl-stage-14-root-exact-endgame-boundary-and-fallback-hardening.md) | 구현 보고서 Stage 14 — root exact endgame 경계 수정 및 fallback 하드닝 |
| Stage 13 | [impl-stage-13-evaluator-corner-access-and-audit-tuning.md](implementation/impl-stage-13-evaluator-corner-access-and-audit-tuning.md) | 구현 보고서 Stage 13 — 평가 함수 감사와 corner-access 보강 |
| Stage 12 | [impl-stage-12-packed-hash-key-optimization.md](implementation/impl-stage-12-packed-hash-key-optimization.md) | 구현 보고서 Stage 12 — Packed Hash Key 최적화 |
| Stage 06 | [impl-stage-06-search-overhead-reduction-and-tt-first-search.md](implementation/impl-stage-06-search-overhead-reduction-and-tt-first-search.md) | Step 6 Implementation Report — Search Overhead Reduction and TT-First Search |
| Stage 05 | [impl-stage-05-exact-endgame-small-solver.md](implementation/impl-stage-05-exact-endgame-small-solver.md) | Step 5 Implementation Report — Exact Endgame Small-Solver |
| Stage 04 | [impl-stage-04-pattern-edge-evaluation-upgrade.md](implementation/impl-stage-04-pattern-edge-evaluation-upgrade.md) | Step 4 Implementation Report — Pattern / Edge Evaluation Upgrade |
| Stage 03 | [impl-stage-03-search-engine-comparison-and-optimization.md](implementation/impl-stage-03-search-engine-comparison-and-optimization.md) | Step 3 report: search-engine comparison and optimization |

## 검토
| Stage | 파일 | 제목 |
| --- | --- | --- |
| Stage 25 | [review-stage-25-dormant-runtime-logic-classification.md](review/review-stage-25-dormant-runtime-logic-classification.md) | 검토 보고서 Stage 25 — dormant 런타임 로직 분류와 처리 기준 |
| Stage 24 | [review-stage-24-exact-fastest-first-and-cut-aware-audit.md](review/review-stage-24-exact-fastest-first-and-cut-aware-audit.md) | Stage 24 Review - Exact fastest-first and cut-aware ordering audit |
| Stage 23 | [review-stage-23-specialized-few-empties-exact-solver.md](review/review-stage-23-specialized-few-empties-exact-solver.md) | Stage 23 Review - Specialized exact few-empties solver audit |
| Stage 22 | [review-stage-22-few-empties-exact-vs-wld-buckets.md](review/review-stage-22-few-empties-exact-vs-wld-buckets.md) | Stage 22 Review - Few-empties exact solver audit and next candidates |
| Stage 21 | [review-stage-21-wld-only-stability-cutoff-spotcheck.md](review/review-stage-21-wld-only-stability-cutoff-spotcheck.md) | 검토 보고서 Stage 21 — WLD 전용 Stability Cutoff spot-check |
| Stage 19 | [review-stage-19-wld-range2-black-parity-benchmark.md](review/review-stage-19-wld-range2-black-parity-benchmark.md) | 검토 보고서 Stage 19 — WLD `+2` black parity 벤치마크 및 채택 판단 |
| Stage 18 | [review-stage-18-wld-pre-exact-root-benchmark.md](review/review-stage-18-wld-pre-exact-root-benchmark.md) | 검토 보고서 Stage 18 — WLD Pre-Exact Root 벤치마크 및 채택 판단 |
| Stage 17 | [review-stage-17-enhanced-transposition-cutoff-benchmark.md](review/review-stage-17-enhanced-transposition-cutoff-benchmark.md) | 검토 보고서 Stage 17 — Enhanced Transposition Cutoff 벤치마크 및 채택 판단 |
| Stage 16 | [review-stage-16-stability-cutoff-prototype-screening.md](review/review-stage-16-stability-cutoff-prototype-screening.md) | 검토 보고서 Stage 16 — Stability Cutoff 프로토타입 스크리닝 |
| Stage 15 | [review-stage-15-exact-root-ux-and-overhead-audit.md](review/review-stage-15-exact-root-ux-and-overhead-audit.md) | 검토 보고서 Stage 15 — exact root UX 및 중복 비용 감사 |
| Stage 14 | [review-stage-14-late-game-boundary-bug-audit.md](review/review-stage-14-late-game-boundary-bug-audit.md) | 검토 보고서 Stage 14 — late-game boundary bug 감사 |
| Stage 13 | [review-stage-13-traditional-evaluator-audit.md](review/review-stage-13-traditional-evaluator-audit.md) | 검토 보고서 Stage 13 — 전통 evaluator 종합 감사 |
| Stage 12 | [review-stage-12-external-engine-technique-survey-and-adoption-candidates.md](review/review-stage-12-external-engine-technique-survey-and-adoption-candidates.md) | 검토 보고서 Stage 12 — 외부 Othello 엔진/학습 사례 조사와 도입 후보 |
| Stage 11 | [review-stage-11-15-16-bucket-17-18-pre-exact-profile-experiment.md](review/review-stage-11-15-16-bucket-17-18-pre-exact-profile-experiment.md) | 구현 검토 보고서 Stage 11 — `15~16` bucket / `17~18` pre-exact profile 실험 결과 |
| Stage 10 | [review-stage-10-exact-window-ordering-profile-retuning.md](review/review-stage-10-exact-window-ordering-profile-retuning.md) | 구현 검토 보고서 Stage 10 — exact window ordering profile 재튜닝 |
| Stage 09 | [review-stage-09-exact-window-late-ordering-profile-redesign.md](review/review-stage-09-exact-window-late-ordering-profile-redesign.md) | 구현 검토 보고서 Stage 9 — exact window 전용 late ordering profile 재설계 |
| Stage 08 | [review-stage-08-exact-teacher-late-ordering-tuning.md](review/review-stage-08-exact-teacher-late-ordering-tuning.md) | 구현 검토 보고서 Stage 8 — exact teacher 기반 late ordering 튜닝 |
| Stage 07 | [review-stage-07-lightweight-move-ordering-evaluator-experiment.md](review/review-stage-07-lightweight-move-ordering-evaluator-experiment.md) | 구현 검토 보고서 Stage 7 — 경량 move ordering 평가기 실험 |
| Stage 06 | [review-stage-06-zero-sum-evaluation-and-audit.md](review/review-stage-06-zero-sum-evaluation-and-audit.md) | 구현 검토 보고서 Stage 6 |
| Stage 05 | [review-stage-05-conservative-selective-search-lmr.md](review/review-stage-05-conservative-selective-search-lmr.md) | Review Stage 5 Implementation Report — Conservative Selective Search (LMR) |
| Stage 04 | [review-stage-04-engine-audit.md](review/review-stage-04-engine-audit.md) | Engine Audit Review - Stage 4 |
| Stage 03 | [review-stage-03-engine-audit.md](review/review-stage-03-engine-audit.md) | Engine Audit Review - Stage 3 |

## 기능
| Stage | 파일 | 제목 |
| --- | --- | --- |
| — | [feature-opening-book-integration.md](features/feature-opening-book-integration.md) | 오프닝북 통합 보고서 |
