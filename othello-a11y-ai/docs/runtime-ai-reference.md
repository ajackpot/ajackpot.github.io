# AI 런타임 레퍼런스

이 문서는 **현재 코드 기준**으로 살아 있는 AI 런타임만 설명합니다.
Stage별 실험 이력이나 비채택 후보는 `docs/reports/`에서 추적하고, 여기서는 실제 기본 경로와 유지보수 기준만 정리합니다.

## 읽는 순서
1. 빠른 개요가 필요하면 루트 `README.md`
2. 현재 AI의 실제 구조와 기본값이 궁금하면 이 문서
3. 체크리스트가 필요하면 `docs/reports/checklists/ai-implementation-checklist.md`
4. 채택/비채택 근거가 필요하면 `docs/reports/report-inventory.generated.md`

## 현재 기본 런타임 스냅샷

| 항목 | 현재 상태 | 근거 파일 |
| --- | --- | --- |
| 저장소 현재 Stage | **Stage 87** | `stage-info.json` |
| 기본 난이도 | `normal` | `js/ai/presets.js`, `js/ai/search-engine.js` |
| 기본 스타일 | `balanced` | `js/ai/presets.js` |
| 기본 opening hybrid key | `stage59-cap9-prior-veto` | `js/ai/opening-tuning.js` |
| active evaluation profile | `trained-phase-linear-v1` | `js/ai/learned-eval-profile.generated.js`, `js/ai/evaluation-profiles.js` |
| active move-ordering profile | `stage44-candidateH2-edgePattern125-cornerPattern125-11-12` | `js/ai/learned-eval-profile.generated.js`, `js/ai/evaluation-profiles.js` |
| active tuple residual profile | `top24-retrain-retrained-calibrated-lateb-endgame` | `js/ai/learned-eval-profile.generated.js`, `js/ai/evaluation-profiles.js` |
| active MPC profile | `trained-mpc-overlap-8bucket-high-tight` | `js/ai/learned-eval-profile.generated.js`, `js/ai/evaluation-profiles.js` |
| exact micro-solver threshold | `optimizedFewEmptiesExactSolverEmpties = 6` | `js/ai/search-engine.js` |
| specialized few-empties exact solver | 활성 | `js/ai/search-engine.js` |
| root WLD pre-exact | 기본 꺼짐, custom에서만 `+2` 선택 가능 | `js/ai/presets.js`, `js/ai/search-engine.js` |
| 실행 경로 | worker 우선, 실패 시 main-thread fallback | `js/ui/engine-client.js`, `js/ai/worker.js` |

## 모듈 지도

| 모듈 | 역할 | 비고 |
| --- | --- | --- |
| `js/core/bitboard.js` | 좌표/마스크/영역/가중치 비트보드 유틸리티 | 규칙/평가/탐색 공통 기반 |
| `js/core/rules.js` | 합법 수 생성, 뒤집기 계산 | move generation hotpath |
| `js/core/game-state.js` | 상태, 패스, 수 적용 | 탐색 노드 상태 컨테이너 |
| `js/ai/evaluation-profiles.js` | generated/seed profile compile과 active profile 노출 | evaluation / ordering / tuple / MPC 진입점 |
| `js/ai/evaluator.js` | phase-bucket evaluator, tuple residual, stability/feature 계산, move-ordering evaluator | Stage 86에서 stability hotpath flattening 반영 |
| `js/ai/opening-book.js` | curated opening book 조회 | direct use + root ordering 참고 |
| `js/ai/opening-prior.js` | compact opening prior 조회 | book 보조와 ordering bias |
| `js/ai/opening-tuning.js` | opening hybrid key와 threshold/profile 해석 | 기본 key는 `stage59-cap9-prior-veto` |
| `js/ai/presets.js` | 난이도/스타일/custom 입력 해석 | 사용자 노출 설정 표면 |
| `js/ai/search-engine.js` | 탐색 엔진 본체 | opening → search → exact/WLD lane 통합 |
| `js/ai/worker.js` | 워커용 search wrapper | active MPC profile 자동 연결 |
| `js/ui/engine-client.js` | 워커 우선 + main-thread fallback | UI에서 AI 호출하는 실제 경로 |

## 탐색 파이프라인

### 1. 오프닝 단계
초반에는 curated opening book을 우선 조회합니다.
book 후보가 충분히 신뢰할 수 있을 때는 direct use를 허용하고, 그렇지 않으면 compact opening prior를 함께 사용해 root ordering bias와 contradiction veto를 적용합니다.

현재 기본 hybrid key는 `stage59-cap9-prior-veto`입니다.
즉, 책을 완전히 버리지도 않고, prior를 책 대체물로 과신하지도 않으며, **직접 책 사용 / prior 보조 / 순수 탐색** 사이를 보수적으로 나눕니다.

### 2. 일반 탐색 단계
오프닝 직사용을 벗어나면 iterative deepening 기반의 alpha-beta / PVS 탐색으로 들어갑니다.
핵심 보조 장치는 다음과 같습니다.

- aspiration window
- transposition table
- killer / history ordering
- late move reductions (LMR)
- enhanced transposition cutoff (ETC)
- active MPC profile을 이용한 conservative fail-high 중심 runtime lane

### 3. 후반 ordering 단계
후반부에서는 모든 empties 구간에 같은 ordering 신호를 쓰지 않습니다.

- `10~14` empties: trained late move-ordering profile을 우선 사용
- `15~18` empties: 보수적인 lightweight fallback ordering lane 유지
- exact window 내부: generic history/positional/flip 비중을 크게 줄이고 exact late-ordering profile을 사용

추가로 Stage 78 이후에는 empties별 direct lookup과 ordering score table 캐시를 사용해 ordering hotpath를 평평하게 유지합니다.

### 4. exact / WLD 단계
말기 구간에서는 exact와 WLD를 같은 방식으로 섞지 않습니다.

- preset별 `exactEndgameEmpties`에서 exact search 진입
- custom에서만 root WLD `+2`를 선택적으로 활성화 가능
- `1~4` empties: specialized few-empties exact solver
- `5~6` empties: optimized exact micro-solver tail window
- exact lane 내부에서는 exact fastest-first reply-count ordering 유지

`optimizedFewEmptiesExactSolverEmpties`의 현재 기본 threshold는 `6`입니다.
Stage 84 검증 기준으로 `8`보다 보편적 exact workload에서 더 안정적인 선택이어서 기본값으로 채택되었습니다.

## 사용자 노출 설정과 내부 고정 경계

### 사용자에게 직접 노출되는 설정
- 난이도 프리셋 (`beginner` ~ `impossible`, `custom`)
- 스타일 프리셋 (`balanced`, `aggressive`, `fortress`, `positional`, `chaotic`)
- custom 수치 입력
  - 깊이
  - 시간 제한
  - exact 시작 empties
  - root WLD `+2` 사용 여부
  - opening/search randomness
  - 평가 scale 계열

### 내부에서 고정된 기본 런타임 선택
- active evaluation / move-ordering / tuple residual / MPC profile 이름
- opening hybrid 기본 key
- `optimizedFewEmptiesExactSolverEmpties = 6`
- exact fastest-first ordering on
- worker 경로의 active MPC profile 자동 주입

### 현재 기본 런타임에 남기지 않은 것
- `stabilityCutoff*` 런타임 pruning 토글
- `exactFastestCutFirstOrdering` 별도 토글
- 강한 프리셋에서의 자동 root WLD `+2`
- MCTS 같은 다른 방법론

## 유지보수 메모
- **TT 의미가 바뀌는 옵션**(`wldPreExactEmpties` 등)이 바뀌면 전이표를 바로 비웁니다.
- 반대로 theme/accessibility 같은 UI-only 변경은 AI 엔진 재시작 원인이 되지 않도록 분리되어 있습니다.
- Stage 86 이후 stability 평가 hotpath는 axis/direction lookup flattening과 unstable-disc-only refinement scan을 사용합니다. 결과를 바꾸지 않고 evaluator 비용만 낮추는 방향의 정리입니다.
- 보고서에는 과거 실험이 남아 있으므로, “보고서에 있다 = 현재 런타임에 있다”로 읽지 말고 이 문서나 체크리스트를 우선 기준으로 삼는 것이 안전합니다.

## 검증 진입점
```bash
node tools/docs/generate-report-inventory.mjs --check
node js/test/core-smoke.mjs
node js/test/perft.mjs
node js/test/stage83_custom_wld_toggle_smoke.mjs
node js/test/stage86_stability_hotpath_smoke.mjs
```

필요하면 그 다음에 `python3 tests/ui_smoke.py`, `python3 tests/virtual_host_smoke.py`로 브라우저/모듈 로드까지 확인합니다.
