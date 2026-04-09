# 접근 가능한 오델로(리버시) AI 웹앱

정적 호스팅이 가능한 순수 HTML, CSS, JavaScript ES 모듈 프로젝트입니다.
GitHub Pages 같은 환경에 그대로 올릴 수 있으며, 키보드 중심 사용성과 브라우저 내 AI 대국을 함께 목표로 합니다.

## 한눈에 보기
- 비트보드(BigInt) 기반 규칙 엔진과 브라우저 런타임 AI
- iterative deepening + alpha-beta / PVS + aspiration window + transposition table
- opening book + compact opening prior hybrid
- learned evaluation / move ordering / tuple residual / conservative MPC runtime lane
- 후반 exact search, specialized few-empties solver, exact fastest-first ordering
- 완전 키보드 조작 가능 UI와 `aria-live` 안내를 포함한 접근성 중심 보드 인터페이스

## 현재 AI 런타임 요약
현재 기본 런타임은 **정적 웹 앱 범위에서 강한 탐색형 오델로 AI**를 목표로 정리되어 있습니다.

- 기본 난이도/스타일: `normal` / `balanced`
- 탐색 코어: iterative deepening, alpha-beta / PVS, aspiration window, TT, killer/history, LMR, ETC
- 오프닝: 111개 seed line 기반 소형 opening book + compact WTHOR opening prior hybrid
- 평가: phase-bucket linear evaluator + tuple residual profile + stability 근사 + learned move-ordering profile
- 말기: preset별 exact 진입, custom 전용 root WLD `+2`, few-empties exact micro-solver(`6`까지), specialized 1~4 solver, exact fastest-first ordering
- 실행 경로: 워커 우선, 불가능한 환경에서는 메인 스레드 폴백

정확한 활성 프로필 이름, empties 구간별 탐색 경로, 사용자 노출 옵션과 내부 고정 옵션의 경계는 `docs/runtime-ai-reference.md`에 따로 정리했습니다.

## 문서 안내
- `docs/runtime-ai-reference.md`: **현재 런타임 기준** AI 구조/기본값/모듈 역할 설명
- `docs/reports/checklists/ai-implementation-checklist.md`: 현재 구현 체크리스트
- `docs/reports/README.md`: 구현/검토 보고서 허브
- `docs/reports/report-inventory.generated.md`: 생성된 전체 문서 인벤토리

원칙은 간단합니다.
루트 `README.md`와 `docs/runtime-ai-reference.md`는 **현재 코드 기준 안내**, `docs/reports/`는 **Stage별 이력과 채택/비채택 근거**를 맡습니다.

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
- `js/ai/worker.js`: AI 워커 엔트리
- `js/ui/*`: 앱 제어기, 접근 가능한 보드 뷰, 설정 패널, 라이브 리전 안내
- `docs/runtime-ai-reference.md`: 현재 AI 런타임 설명서
- `docs/reports/*`: 구현/검토 보고서, 체크리스트, 생성 인벤토리
- `tools/evaluator-training/*`: 학습/벤치/프로필 생성 도구
- `tools/package/*`: release/trainer 패키지 생성과 용량 분석 도구
- `tools/docs/generate-report-inventory.mjs`: 리포트 인벤토리 생성 도구

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
### 코어 / 런타임 회귀
```bash
node js/test/core-smoke.mjs
node js/test/perft.mjs
node js/test/stage83_custom_wld_toggle_smoke.mjs
node js/test/stage86_stability_hotpath_smoke.mjs
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
- `trainer`: 웹 앱 + 현재 권장 학습/재생성 도구만 포함

Windows에서는 `tools\\package\\analyze-package-size.bat`, `tools\\package\\build-release-packages.bat`를 사용할 수 있습니다.

## 현재 한계와 범위
- 이 프로젝트는 GitHub Pages용 순수 브라우저 JS 앱이므로, 네이티브 엔진의 대형 opening book이나 시스템 의존 최적화를 그대로 옮기지는 않습니다.
- 대형 패턴 테이블/신경망 계열 대신, 현재는 **phase-bucket linear evaluator + generated profile 주입 구조**를 기본으로 유지합니다.
- Stage별 보고서에는 과거 실험이 남아 있으므로, 보고서의 토글/후보가 현재 런타임에 그대로 존재한다고 가정하면 안 됩니다.
- MCTS처럼 방향이 다른 방법론은 현재 기본 AI 문서 범위에서 제외하며, 필요 시 별도 옵션 lane으로 다룹니다.
