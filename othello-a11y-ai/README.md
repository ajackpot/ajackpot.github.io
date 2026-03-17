# 접근 가능한 오델로(리버시) AI 웹앱

정적 호스팅이 가능한 순수 HTML, CSS, JavaScript ES 모듈 프로젝트입니다. GitHub Pages 같은 환경에 그대로 올릴 수 있습니다.

## 구현 목표
- 비트보드(BigInt) 기반 규칙 엔진
- 브라우저에서 가능한 범위의 강한 AI
  - iterative deepening
  - alpha-beta / PVS
  - aspiration window
  - transposition table
  - killer / history move ordering
  - 후반 exact search
  - 단계별 평가 함수(기동성, 잠재 기동성, 코너, 코너 인접 위험, 프런티어, 위치 가중치, 안정성 근사, 패리티)
- 완전 키보드 조작 가능 UI
- 표(`<table>`) 기반 보드
- 모든 칸 접근 가능한 이름 제공
- 돌 놓기 / 뒤집기 / 패스 / 종료 상황을 `aria-live`로 안내
- `사용자 지정`일 때만 직접 입력한 엔진 수치가 실제 적용되도록 제어

## 파일 구조
- `index.html`: 정적 진입점
- `styles.css`: 반응형 / 고대비 친화 스타일
- `js/main.js`: 부트스트랩
- `js/core/bitboard.js`: 비트보드 유틸리티와 좌표 변환
- `js/core/rules.js`: 합법 수 생성과 뒤집기 계산
- `js/core/game-state.js`: 상태 객체와 수 적용
- `js/ai/evaluator.js`: 평가 함수
- `js/ai/search-engine.js`: 탐색 엔진
- `js/ai/presets.js`: 난이도 프리셋과 사용자 지정 수치 해석
- `js/ai/worker.js`: AI 워커 엔트리
- `js/ui/app-controller.js`: 애플리케이션 제어기
- `js/ui/board-view.js`: 접근 가능한 표 보드 렌더링
- `js/ui/settings-panel-view.js`: 설정 패널 뷰
- `js/ui/formatters.js`: 접근성 이름 / 상태 문구 포맷터
- `js/ui/live-region-announcer.js`: `aria-live` 안내기
- `js/ui/engine-client.js`: 워커 우선 + 메인 스레드 폴백 엔진 클라이언트
- `js/test/core-smoke.mjs`: 규칙/평가/엔진 스모크 테스트
- `tests/ui_smoke.py`: 번들 기반 브라우저 UI 스모크 테스트
- `tests/virtual_host_smoke.py`: 원본 ES 모듈 그래프 로드 스모크 테스트

## 접근성 설계 요약
- 보드는 `<table>`로 렌더링됩니다.
- 64칸 전부 네이티브 `<button>` 입니다.
- 각 칸의 접근 가능한 이름 예시:
  - `검은 돌 D5`
  - `흰 돌 E4`
  - `둘 수 있는 빈칸 C4`
  - `빈칸 A1`
- 돌 색상은 좌표보다 먼저 읽히도록 구성했습니다.
- Tab 순차 탐색으로 칸을 순서대로 확인할 수 있습니다.
- Enter / Space는 마우스 클릭과 동일하게 동작합니다.
- 방향키와 Home / End로 인접 칸 또는 같은 행의 양 끝으로 빠르게 이동할 수 있습니다.
- 착수, 뒤집힘, 패스, 되돌리기, 종료는 라이브 영역에서 자동 안내됩니다.

## 실행 방법
브라우저 보안 정책 때문에 로컬에서는 정적 서버로 여는 것이 가장 안전합니다.

예시:
```bash
python3 -m http.server 8000
```

그 뒤 브라우저에서 프로젝트 폴더를 엽니다.

정적 호스팅 시에는 그대로 업로드하면 됩니다.

## 테스트
### 1. 코어 엔진 스모크 테스트
```bash
node js/test/core-smoke.mjs
```

### 2. 브라우저 UI 스모크 테스트
```bash
python3 tests/ui_smoke.py
```

### 3. 원본 모듈 그래프 스모크 테스트
```bash
python3 tests/virtual_host_smoke.py
```

## 현재 확인한 사항
- 규칙 엔진 합법 수/뒤집기 정상
- 탐색 엔진 합법 수 반환 정상
- 사용자 지정 수치가 `사용자 지정` 프리셋에서만 적용됨
- 보드 64칸 모두 버튼으로 제공됨
- 접근 가능한 이름 형식 정상
- 사람 착수 후 `aria-live` 안내 정상
- AI 응수 후 기록 증가 정상
- 되돌리기 정상
- 사람이 백일 때 새 게임 시작 시 AI 선착수 정상

## 비고
- 워커가 가능한 환경에서는 워커를 우선 사용합니다.
- 워커를 만들 수 없는 환경에서는 메인 스레드 엔진으로 자동 폴백합니다.
