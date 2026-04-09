# AI 구현 체크리스트

이 문서는 **현재 기본 런타임에 실제로 남아 있는 구현**을 빠르게 확인하기 위한 체크리스트입니다.
역사 문서와 분리해서 읽는 것이 핵심이며, 상세 구조 설명은 `../../runtime-ai-reference.md`를 먼저 보는 편이 더 빠릅니다.

## 관련 문서
- [현재 AI 런타임 레퍼런스](../../runtime-ai-reference.md)
- [구현/검토 보고서 허브](../README.md)
- [생성된 리포트 인벤토리](../report-inventory.generated.md)

## 상태 라벨
- **활성**: 현재 기본 런타임에서 실제 사용됨
- **선택형**: 기본은 아니지만 UI, 특정 프리셋, 조건부 경로에서 사용됨
- **도구**: 런타임이 아니라 학습/벤치/패키징/검증용
- **역사**: 보고서에는 남아 있지만 현재 기본 런타임에는 남기지 않음

## 현재 기본 런타임 스냅샷

| 항목 | 현재 상태 | 근거 파일 |
| --- | --- | --- |
| 저장소 현재 Stage | **Stage 87** | `stage-info.json` |
| 기본 난이도 | `normal` | `js/ai/search-engine.js`, `js/ai/presets.js` |
| 기본 스타일 | `balanced` | `js/ai/presets.js` |
| 기본 오프닝 hybrid 프로필 | `stage59-cap9-prior-veto` | `js/ai/opening-tuning.js` |
| active evaluation profile | `trained-phase-linear-v1` | `js/ai/evaluation-profiles.js` |
| active move-ordering profile | `stage44-candidateH2-edgePattern125-cornerPattern125-11-12` | `js/ai/evaluation-profiles.js` |
| active tuple residual profile | `top24-retrain-retrained-calibrated-lateb-endgame` | `js/ai/evaluation-profiles.js` |
| active MPC profile | UI/worker 경로에서는 `trained-mpc-overlap-8bucket-high-tight`를 자동 주입 | `js/ui/engine-client.js`, `js/ai/worker.js` |
| exact micro-solver threshold | `optimizedFewEmptiesExactSolverEmpties = 6` | `js/ai/search-engine.js`, Stage 84 보고서 |
| specialized few-empties exact solver | 활성 | `js/ai/search-engine.js` |
| root WLD pre-exact | 기본 꺼짐 (`0`), 사용자 지정에서만 `+2` 선택 가능 | `js/ai/presets.js`, `js/ai/search-engine.js` |

## 난이도/스타일 프리셋 스냅샷

### 난이도 프리셋

| 프리셋 | 깊이 | 시간 제한(ms) | exact 시작 빈칸 | WLD pre-exact | 비고 |
| --- | ---: | ---: | ---: | ---: | --- |
| beginner | 2 | 160 | 4 | 0 | 가장 가벼운 입문용 |
| easy | 3 | 280 | 6 | 0 | 얕은 exact 포함 |
| normal | 4 | 500 | 8 | 0 | 기본 프리셋 |
| hard | 6 | 1400 | 10 | 0 | 깊은 탐색 |
| expert | 8 | 3900 | 12 | 0 | 적극적 exact |
| impossible | 10 | 12000 | 16 | 0 | 브라우저 범위의 최중량 |
| custom | 6 | 1500 | 10 | 0(기본) | 직접 입력/선택 |

### 스타일 프리셋

| 스타일 | 상태 | 설명 |
| --- | --- | --- |
| balanced | 활성 / 기본 | 표준 기준선 |
| aggressive | 활성 | 기동성과 변동성 강화 |
| fortress | 활성 | 안정성/봉쇄 성향 강화 |
| positional | 활성 | 코너/위치 감각 강화 |
| chaotic | 활성 | 근접 후보 다양성 확대 |

## 런타임 AI 구현 체크리스트

### 1. 탐색 코어

| 상태 | 항목 | 현재 상태 | 주요 Stage / 파일 |
| --- | --- | --- | --- |
| 활성 | 비트보드 기반 규칙/탐색 | BigInt 비트보드, 합법수 생성, 뒤집기, 패스 처리 | `js/core/*`, `js/ai/search-engine.js` |
| 활성 | iterative deepening | 루트 탐색 기본 뼈대 | Stage 03, `js/ai/search-engine.js` |
| 활성 | alpha-beta / PVS | 주 탐색의 기본 알고리즘 | Stage 03, `js/ai/search-engine.js` |
| 활성 | aspiration window | 프리셋/사용자 지정 입력으로 크기 제어 | `js/ai/presets.js`, `js/ai/search-engine.js` |
| 활성 | transposition table | TT 저장/조회, 안전한 재사용, 부분 축출 | Stage 03/06/25, `js/ai/search-engine.js` |
| 활성 | TT-first hot path | 얕은 힌트보다 신뢰 가능한 TT 힌트를 우선 반영 | Stage 79, `js/ai/search-engine.js` |
| 활성 | killer/history ordering | 일반 탐색 move ordering 기본 신호 | Stage 03, `js/ai/search-engine.js` |
| 활성 | late move reductions (LMR) | 조건부 축소 + 재탐색 | `js/ai/search-engine.js` |
| 활성 | enhanced transposition cutoff (ETC) | exact/WLD 모두 child TT 재사용을 포함한 cutoff 경로 유지 | Stage 17/20/80/81, `js/ai/search-engine.js` |
| 활성 | pass/terminal TT 저장 | 패스/종료 노드도 재사용 | Stage 06 보강, `js/ai/search-engine.js` |
| 활성 | MPC runtime lane | UI/worker 기본 경로에서 active MPC profile 자동 연결 | Stage 72~74, `js/ui/engine-client.js`, `js/ai/worker.js` |

### 2. 말기 exact / WLD 경로

| 상태 | 항목 | 현재 상태 | 주요 Stage / 파일 |
| --- | --- | --- | --- |
| 활성 | exact endgame search | 프리셋별 `exactEndgameEmpties`부터 exact 진입 | Stage 05+, `js/ai/search-engine.js` |
| 활성 | small exact solver (1~4 empties) | few-empties exact 전용 bitboard solver 유지 | Stage 05/22, `js/ai/search-engine.js` |
| 활성 | specialized few-empties exact solver | 말기 작은 구간 전용 최적화 경로 유지 | Stage 23, `js/ai/search-engine.js` |
| 활성 | optimized few-empties exact solver | exact tail window를 threshold 6까지 확장 | Stage 84, `js/ai/search-engine.js` |
| 활성 | exact fastest-first ordering | 말기 exact 창에서 reply-count 기반 정렬 유지 | Stage 24/84, `js/ai/search-engine.js` |
| 선택형 | root WLD pre-exact `+2` | 기본 런타임에서는 꺼짐, custom에서만 선택 가능 | Stage 18/19/83, `js/ai/presets.js` |
| 활성 | WLD 전용 경로와 exact 경로 분리 | exact micro-solver 확장은 WLD와 분리 유지 | Stage 18/19/84, `js/ai/search-engine.js` |

### 3. 평가 함수와 프로필

| 상태 | 항목 | 현재 상태 | 주요 Stage / 파일 |
| --- | --- | --- | --- |
| 활성 | phase-bucket linear evaluator | active generated/seed profile 구조 유지 | Stage 26+, `js/ai/evaluation-profiles.js`, `js/ai/evaluator.js` |
| 활성 | zero-sum 정렬/반올림 | 관점 반전 시 평가 대칭성 유지 | Stage 06/33, `js/ai/evaluator.js` |
| 활성 | 전통 feature 세트 | mobility, potential mobility, corner, corner adjacency, frontier, positional, parity, disc differential | `js/ai/evaluator.js` |
| 활성 | pattern feature 세트 | edge/corner pattern 계열 유지 | Stage 04+, `js/ai/evaluator.js` |
| 활성 | stability 근사 | 코너/변 기반에서 내부 안정 돌까지 보수적으로 확장 | Stage 33, `js/ai/evaluator.js` |
| 활성 | stability hotpath flattening | axis/direction lookup flattening과 unstable-disc-only refinement scan 유지 | Stage 86, `js/ai/evaluator.js` |
| 활성 | tuple residual profile | evaluator에 residual 보정 신호 결합 | Stage 49~52, `js/ai/evaluation-profiles.js`, `js/ai/evaluator.js` |
| 선택형 | 스타일별 scale 보정 | custom에서는 스타일 보정 대신 직접 입력값 우선 | `js/ai/presets.js` |

### 4. move ordering / 후반 ordering

| 상태 | 항목 | 현재 상태 | 주요 Stage / 파일 |
| --- | --- | --- | --- |
| 활성 | trained move-ordering profile | active generated ordering profile 연결 | Stage 29/37/38/44, `js/ai/evaluation-profiles.js` |
| 활성 | child empties 기준 late bucket 선택 | 경계 직후 bucket/parity 문맥 반영 | Stage 29/32, `js/ai/evaluator.js`, `js/ai/search-engine.js` |
| 활성 | exact window용 late ordering profile | generic history/positional/flip 비중 축소, trained signal 비중 강화 | Stage 09/24, `js/ai/search-engine.js` |
| 활성 | 15~18 empties 경량 fallback ordering | exact 이전 구간용 보수적 ordering lane 유지 | Stage 11, `js/ai/search-engine.js` |
| 활성 | ordering hot-path precompute | empties direct lookup, risk lookup table, score table 캐시 유지 | Stage 78, `js/ai/search-engine.js`, `js/ai/evaluator.js` |

### 5. 오프닝 체계

| 상태 | 항목 | 현재 상태 | 주요 Stage / 파일 |
| --- | --- | --- | --- |
| 활성 | 소형 opening book | 111개 seed line 기반 소형 책 유지 | Stage 54, `js/ai/opening-book*.js` |
| 활성 | compact opening prior | 런타임 압축 prior 모듈 연결 | Stage 55, `js/ai/opening-prior*.js` |
| 활성 | opening hybrid tuning | confidence gate / direct use / ordering bias 조합 | Stage 56~59, `js/ai/opening-tuning.js` |
| 활성 | prior contradiction veto | 기본 hybrid key `stage59-cap9-prior-veto`에 포함 | Stage 59, `js/ai/opening-tuning.js` |
| 활성 | opening randomness / search randomness 분리 | 초반과 중후반 무작위성 제어를 분리 | Stage 59, `js/ai/presets.js` |

### 6. 사용자 노출 설정 / 안전 장치

| 상태 | 항목 | 현재 상태 | 주요 Stage / 파일 |
| --- | --- | --- | --- |
| 활성 | typed custom controls | number/select 기반으로 사용자 지정 엔진 입력 렌더링 | Stage 83, `js/ui/settings-panel-view.js` |
| 활성 | custom 전용 엔진 수치 적용 | custom이 아닐 때는 프리셋 우선 | `js/ai/presets.js`, `js/main.js` |
| 활성 | WLD pre-exact 변경 시 TT 무효화 | 의미가 바뀌는 옵션 변경에 대해 TT 즉시 비움 | Stage 83, `js/main.js`, `js/ai/search-engine.js` |
| 활성 | UI-only 설정 변경 시 AI 재시작 방지 | theme/accessibility 변경이 search runtime을 불필요하게 건드리지 않음 | Stage 83, `js/main.js` |

## 도구 / 검증 / 배포 체크리스트

| 상태 | 항목 | 현재 상태 | 주요 파일 |
| --- | --- | --- | --- |
| 도구 | evaluator 학습 파이프라인 | ridge regression, generated module export, holdout 검증 | `tools/evaluator-training/*` |
| 도구 | move-ordering 튜닝/재생성 | local search, benchmark replay, profile merge 도구 유지 | `tools/evaluator-training/*`, `benchmarks/*` |
| 도구 | opening hybrid benchmark/replay | reference suite 비교와 replay 도구 유지 | `tools/evaluator-training/benchmark-opening-hybrid-tuning.mjs`, `replay-opening-hybrid-reference-suite.mjs` |
| 도구 | engine match harness | Trineutron 비교/대전 도구 유지 | `tools/engine-match/*`, `third_party/trineutron-othello/*` |
| 도구 | package slimming | runtime/trainer 패키지 생성과 용량 분석 유지 | `tools/package/*` |
| 도구 | report inventory generator | 보고서 인덱스를 수동 관리 대신 생성물로 유지 | `tools/docs/generate-report-inventory.mjs` |
| 도구 | 코어 회귀 | core smoke / perft / stage83 custom WLD smoke / stage86 stability smoke 유지 | `js/test/core-smoke.mjs`, `js/test/perft.mjs`, `js/test/stage83_custom_wld_toggle_smoke.mjs`, `js/test/stage86_stability_hotpath_smoke.mjs` |
| 도구 | 브라우저 UI 스모크 | 번들/원본 모듈 로드 스모크 유지 | `tests/ui_smoke.py`, `tests/virtual_host_smoke.py` |

## 현재 기본 런타임에 남기지 않은 것

| 상태 | 항목 | 현재 판단 |
| --- | --- | --- |
| 역사 | `stabilityCutoff*` 런타임 pruning 토글 | 보고서에는 남기되 기본 런타임에서는 제거 |
| 역사 | `exactFastestCutFirstOrdering` 별도 토글 | 채택된 exact fastest-first 경로만 남기고 별도 토글 제거 |
| 역사 | 강한 프리셋 자동 WLD `+2` | Stage 83에서 default/custom 정책 정리 후 custom 선택형만 유지 |
| 범위 밖 | MCTS 및 방향이 다른 방법론 | 별도 옵션으로 추후 검토 예정, 이 체크리스트 범위에서는 제외 |

## 이 문서를 읽는 순서
1. **현재 무엇이 실제 살아 있는지**만 보려면 이 문서를 먼저 확인합니다.
2. 구조와 역할까지 알고 싶으면 `../../runtime-ai-reference.md`를 엽니다.
3. 문서 전체 목록이 필요하면 `../report-inventory.generated.md`를 엽니다.
4. 특정 채택/비채택 근거가 궁금하면 해당 Stage 구현/검토 보고서로 내려갑니다.
