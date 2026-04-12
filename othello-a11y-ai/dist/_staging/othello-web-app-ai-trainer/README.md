# 접근 가능한 오델로(리버시) AI 웹앱

정적 호스팅이 가능한 순수 HTML, CSS, JavaScript ES 모듈 프로젝트입니다.
GitHub Pages 같은 환경에 그대로 올릴 수 있으며, 키보드 중심 사용성과 브라우저 내 AI 대국을 함께 목표로 합니다.

## 한눈에 보기
- 비트보드(BigInt) 기반 규칙 엔진과 브라우저 런타임 AI
- iterative deepening + alpha-beta / PVS + aspiration window + transposition table
- opening book + compact opening prior hybrid
- learned evaluation / move ordering / tuple residual / conservative MPC runtime lane
- preset-aware experimental AI mode selector with MCTS Lite / MCTS Guided / MCTS Hybrid lanes
- root scout / immediate wipeout guard / MCTS root threat penalty를 포함한 special-ending safety net
- 후반 exact search, specialized few-empties solver, exact fastest-first ordering
- 완전 키보드 조작 가능 UI와 `aria-live` 안내를 포함한 접근성 중심 보드 인터페이스

## 저장소 메타데이터와 문서 기준선
- 현재 저장소 Stage: **Stage 126** (`stage-info.json` 기준)
- 저장소 stage/tag/updatedAt/summary의 단일 기준은 `stage-info.json`입니다.
- **현재 코드 기준 안내**는 루트 `README.md`, `docs/runtime-ai-reference.md`, `docs/reports/checklists/ai-implementation-checklist.md`를 먼저 봅니다.
- **Stage별 채택/비채택 근거와 역사**는 `docs/reports/implementation/*`, `docs/reports/review/*`에서 추적합니다.
- 전체 문서 목록과 최신 구현 보고서 진입점은 수동 목록보다 `docs/reports/report-inventory.generated.md`를 우선 기준으로 봅니다.
- `package.json`은 Node ESM / 도구 실행을 위한 최소 메타데이터 파일이며, 저장소 Stage 버전 기준으로 사용하지 않습니다.

## 현재 AI 런타임 요약
현재 기본 런타임은 **정적 웹 앱 범위에서 강한 탐색형 오델로 AI**를 목표로 정리되어 있습니다.

- 기본 난이도/스타일: `normal` / `balanced`
- 기본 AI 모드: `classic`
- 탐색 코어: iterative deepening, alpha-beta / PVS, aspiration window, TT, killer/history, LMR, ETC, allocation-light search move path
- 오프닝: 111개 seed line 기반 소형 opening book + compact WTHOR opening prior hybrid (`stage59-cap9-prior-veto` 기본값, Stage 123 replay revalidation 후 유지)
- 평가: phase-bucket linear evaluator + tuple residual profile + stability 근사 + learned move-ordering profile
- 말기: preset별 exact 진입, custom 전용 root WLD `+2`, few-empties exact micro-solver(`6`까지), specialized 1~4 solver, exact fastest-first ordering
- 특수 종국 안전망: root special-ending scout, classic/WLD immediate wipeout guard, MCTS immediate wipeout bias + root threat penalty
- 실험 모드: preset-aware AI mode selector (`beginner`는 `classic / mcts-lite / mcts-guided`, `easy` 이상은 `classic / mcts-guided / mcts-hybrid`)
  - `mcts-lite`: UCT + random rollout baseline
  - `mcts-guided`: guided policy + cutoff evaluator baseline
  - `mcts-hybrid`: guided lane 위에 shallow minimax prior를 얹는 informed-prior baseline
- 실행 경로: 워커 우선, 불가능한 환경에서는 메인 스레드 폴백
- MPC 기본 의미론: worker / UI fallback / direct `SearchEngine` 모두 active MPC profile을 기본 상속, `mpcProfile: null`은 명시적 비활성화로 유지
- search move path 기본 의미론: classic search 노드는 dedicated prepared move record 경로를 기본 사용하고, 내부 A/B 벤치에서는 `allocationLightSearchMoves: false`로 baseline을 재현
- compact tuple additive lane 상태: Stage 125 bounded family pilot을 실제로 돌렸지만 `diagonal-adjacent-pairs-full-v1`와 orthogonal control family 모두 active baseline을 넘지 못해 **채택하지 않았습니다**. active tuple residual profile은 그대로 유지하고, richer external corpus 또는 larger offline training budget이 생길 때만 이 lane을 다시 여는 것을 권고합니다.
- offline learning bundle 상태: Stage 126에서 user-executable richer-corpus compact tuple suite + patch follow-up wrapper/config를 추가했습니다. 현재 기본 런타임은 그대로 두고, 사용자가 외부 corpus로 직접 학습한 뒤 후보 JSON / generated module만 다시 검토하는 흐름을 권장합니다.

정확한 활성 프로필 이름, empties 구간별 탐색 경로, 사용자 노출 옵션과 내부 고정 옵션의 경계는 `docs/runtime-ai-reference.md`에 따로 정리했습니다.

## 문서 안내
- `stage-info.json`: **현재 저장소 Stage/tag/updatedAt/summary** 기준 메타데이터
- `docs/runtime-ai-reference.md`: **현재 런타임 기준** AI 구조/기본값/모듈 역할 설명
- `docs/reports/checklists/ai-implementation-checklist.md`: 현재 구현 체크리스트
- `docs/reports/README.md`: 구현/검토 보고서 허브
- `docs/reports/report-inventory.generated.md`: 생성된 전체 문서 인벤토리와 최신 구현 보고서 진입점

원칙은 간단합니다.
루트 `README.md`와 `docs/runtime-ai-reference.md`는 **현재 코드 기준 안내**, `docs/reports/`는 **Stage별 이력과 채택/비채택 근거**를 맡습니다.
저장소 Stage/tag/updatedAt/summary는 `stage-info.json` 하나로 맞추고, 최신 구현 보고서 진입점은 수동 목록보다 생성된 인벤토리를 우선합니다.

## 주요 파일 구조
- `index.html`: 정적 진입점
- `styles.css`: 반응형 / 고대비 친화 스타일
- `js/main.js`: 부트스트랩
- `js/core/bitboard.js`: 비트보드 유틸리티와 좌표 변환
- `js/core/rules.js`: 합법 수 생성과 뒤집기 계산
- `js/core/game-state.js`: 상태 객체와 수 적용
- `js/ai/evaluator.js`: 평가 함수와 move-ordering evaluator
- `js/ai/evaluation-profiles.js`: active evaluation / ordering / tuple / MPC profile compile
- `js/ai/search-engine.js`: 탐색 엔진 본체
- `js/ai/opening-book*.js`: curated opening book 데이터/조회
- `js/ai/opening-prior*.js`: compact opening prior 데이터/조회
- `js/ai/opening-tuning.js`: opening hybrid profile
- `js/ai/presets.js`: 난이도/스타일 프리셋과 custom 입력 해석
- `js/ai/search-algorithms.js`: preset-aware AI 모드 선택기(`classic / mcts-*`)
- `js/ai/special-endings.js`: special-ending scout / trap penalty / immediate wipeout 공용 휴리스틱
- `js/ai/mcts.js`: `mcts-lite / guided / hybrid` runtime lane
- `js/ai/worker.js`: AI 워커 엔트리
- `js/ui/*`: 앱 제어기, 접근 가능한 보드 뷰, 설정 패널, 라이브 리전 안내
- `docs/runtime-ai-reference.md`: 현재 AI 런타임 설명서
- `docs/reports/*`: 구현/검토 보고서, 체크리스트, 생성 인벤토리
- `tools/docs/*`: 리포트 인벤토리/문서 동기화 점검 도구
- `tools/evaluator-training/*`: 학습/벤치/프로필 생성 도구
- `tools/package/*`: release/trainer 패키지 생성과 용량 분석 도구

## 접근성 요약
- 보드는 `<table>` 기반으로 렌더링됩니다.
- 64칸 전부 네이티브 `<button>`으로 제공합니다.
- 각 칸은 좌표와 상태를 함께 읽는 접근 가능한 이름을 가집니다.
- Enter / Space, 방향키, Home / End로 보드를 조작할 수 있습니다.
- 착수, 뒤집힘, 패스, 되돌리기, 종료는 `aria-live` 영역에서 자동 안내합니다.

## 실행 방법
브라우저 보안 정책 때문에 로컬에서는 정적 서버로 여는 것이 가장 안전합니다.

```bash
python3 -m http.server 8000
```

그 뒤 브라우저에서 프로젝트 폴더를 엽니다.
정적 호스팅 시에는 그대로 업로드하면 됩니다.

## 테스트
### 문서 / 메타데이터 동기화
```bash
node tools/docs/check-doc-sync.mjs
node tools/docs/generate-report-inventory.mjs --check
```

### 코어 / 런타임 회귀
```bash
node js/test/core-smoke.mjs
node js/test/perft.mjs
node js/test/stage83_custom_wld_toggle_smoke.mjs
node js/test/stage86_stability_hotpath_smoke.mjs
node js/test/stage88_mcts_lite_smoke.mjs
node js/test/stage89_mcts_guided_smoke.mjs
node js/test/stage90_search_algorithm_pair_benchmark_smoke.mjs
node js/test/stage91_mcts_hybrid_smoke.mjs
node js/test/stage91_search_algorithm_pair_hybrid_smoke.mjs
node js/test/stage92_search_algorithm_pair_multiseed_smoke.mjs
node js/test/stage93_search_algorithm_availability_and_throughput_smoke.mjs
node js/test/stage94_special_ending_scout_smoke.mjs
node js/test/stage95_immediate_wipeout_guard_smoke.mjs
node js/test/stage96_mcts_immediate_wipeout_bias_smoke.mjs
node js/test/stage97_mcts_root_threat_penalty_smoke.mjs
node js/test/stage98_special_ending_regression_suite.mjs
node js/test/stage109_report_inventory_smoke.mjs
node js/test/stage120_documentation_sync_smoke.mjs
node js/test/stage121_active_mpc_default_parity_smoke.mjs
node js/test/stage122_allocation_light_search_moves_smoke.mjs
node js/test/stage123_opening_default_revalidation_smoke.mjs
node js/test/stage125_compact_tuple_family_pilot_smoke.mjs
```

### Step 3 후보 1 회귀/의미론 벤치
```bash
node tools/benchmark/run-stage121-active-mpc-default-parity-benchmark.mjs
```

### Step 3 후보 2 런타임 벤치
```bash
node tools/benchmark/run-stage122-allocation-light-search-move-path-benchmark.mjs
```

### Step 3 후보 3 오프닝 기본값 재검증
```bash
node tools/benchmark/run-stage123-opening-default-revalidation-benchmark.mjs
```

### Stage 125 compact tuple family bounded pilot
```bash
node tools/benchmark/run-stage125-compact-tuple-family-pilot.mjs
# 이미 생성된 산출물만 다시 요약할 때
node tools/benchmark/run-stage125-compact-tuple-family-pilot.mjs --summary-only
node js/test/stage125_compact_tuple_family_pilot_smoke.mjs
```

### Stage 126 user-executable weight learning bundle
```bash
node tools/evaluator-training/run-stage126-weight-learning-bundle.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --phase eta

node tools/evaluator-training/run-stage126-weight-learning-bundle.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --output-root tools/evaluator-training/out/stage126-weight-learning \
  --phase suite \
  --resume

node tools/evaluator-training/run-stage126-weight-learning-bundle.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --output-root tools/evaluator-training/out/stage126-weight-learning \
  --phase patch \
  --resume

node js/test/stage126_weight_learning_bundle_smoke.mjs
```

### 내부 AI 모드 대국 벤치
```bash
node tools/engine-match/benchmark-search-algorithm-pair.mjs \
  --output-json benchmarks/stage92_mcts_guided_vs_hybrid_preset_refresh.json \
  --first-algorithm mcts-guided \
  --second-algorithm mcts-hybrid \
  --games 3 \
  --opening-plies 10 \
  --seed-list 17,31 \
  --time-ms-list 160,280,500
```

### MCTS 처리량 비교 벤치
```bash
node tools/engine-match/benchmark-mcts-throughput-compare.mjs \
  --candidate-root . \
  --baseline-root /path/to/stage92-repo \
  --time-ms-list 160,280,500 \
  --position-seed-list 17,31,41,53,71,89 \
  --opening-plies 12 \
  --random-mode constant-zero \
  --output-json benchmarks/stage93_mcts_refactor_throughput_compare.json
```

### 브라우저/UI 스모크
```bash
python3 tests/ui_smoke.py
python3 tests/virtual_host_smoke.py
```

## 패키지 경량화
개발 트리에는 단계별 `benchmarks/`, `docs/reports/`, 학습 산출물, 테스트 파일이 함께 들어 있습니다.
실제 배포나 가중치 전달에는 대부분 필요하지 않으므로 별도의 패키지 프로필을 지원합니다.

```bash
node tools/package/analyze-package-size.mjs
node tools/package/build-release-packages.mjs --profiles runtime,trainer
```

- `runtime`: 웹 앱 실행에 필요한 최소 파일만 포함
- `trainer`: 웹 앱 + 현재 권장 학습/재생성 도구만 포함하며, Stage 126 richer-corpus weight learning bundle wrapper/config도 함께 담습니다.

Windows에서는 `tools\\package\\analyze-package-size.bat`, `tools\\package\\build-release-packages.bat`를 사용할 수 있습니다.

## 현재 한계와 범위
- 이 프로젝트는 GitHub Pages용 순수 브라우저 JS 앱이므로, 네이티브 엔진의 대형 opening book이나 시스템 의존 최적화를 그대로 옮기지는 않습니다.
- 대형 패턴 테이블/신경망 계열 대신, 현재는 **phase-bucket linear evaluator + generated profile 주입 구조**를 기본으로 유지합니다.
- Stage별 보고서에는 과거 실험이 남아 있으므로, 보고서의 토글/후보가 현재 런타임에 그대로 존재한다고 가정하면 안 됩니다.
- MCTS처럼 방향이 다른 방법론은 기본 강력 엔진과 별도 lane으로 다룹니다. 현재는 preset-aware 실험 모드(`beginner`: `Lite / Guided`, `easy` 이상: `Guided / Hybrid`)가 포함되어 있으며, `Hybrid`는 guided rollout 위에 shallow minimax / alpha-beta prior를 얹는 informed-prior 계열입니다.
