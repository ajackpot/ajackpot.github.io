# 아키텍처 메모

## 전체 구조

이 프로젝트는 UI, 대국 상태, 엔진, 접근성 안내를 분리한 **계층형 구조**를 사용합니다.

- **UI 계층**: DOM 렌더링과 사용자 입력 처리
- **애플리케이션 계층**: 흐름 제어, 상태 전환, AI 호출
- **도메인 계층**: 체스 상태와 규칙, 내러이션, 보드 표현 모델
- **엔진 계층**: PUCT/MCTS 탐색, 평가, prior, 캐시, 오프닝 북

## 적용한 패턴

### 1. Controller

`AppController`가 전체 사용자 흐름을 조정합니다.

- 새 게임 시작
- 수 선택/이동
- 프로모션 선택
- 엔진 탐색 시작/취소/반영
- UI 렌더링 타이밍 관리

즉, 화면과 엔진을 직접 서로 연결하지 않고 컨트롤러를 통해 의존 방향을 정리했습니다.

### 2. Facade

`EngineFacade`는 Web Worker와의 메시지 송수신을 숨깁니다.

UI 계층은 Worker API를 직접 다루지 않고 다음만 알면 됩니다.

- `search(...)`
- `cancelAll()`

탐색 취소 시 Worker를 종료하고 새로 만드는 로직도 이 클래스 안으로 캡슐화했습니다.

### 3. Factory

`SearchConfigFactory`는 난이도 프리셋과 사용자 지정 파라미터를 하나의 검색 설정 객체로 만듭니다.

이 덕분에 UI가 개별 엔진 파라미터를 흩어지게 다루지 않아도 됩니다.

### 4. Adapter

`ChessJsAdapter`는 `chess.js`를 감싸는 어댑터입니다.

장점은 다음과 같습니다.

- 외부 라이브러리 의존을 한 곳에 집중
- 도메인/엔진 코드가 라이브러리 API 세부 구현에 덜 묶임
- 나중에 다른 체스 규칙 엔진으로 교체하기 쉬움

### 5. ViewModel / Presentation Model

`BoardViewModel`은 내부 체스 상태를 화면 렌더링용 데이터로 변환합니다.

- 좌표
- 기물 이름
- 심볼
- 선택 상태
- 직전 이동 경로
- 접근 가능한 이름

보드 렌더러는 이 ViewModel만 보고 DOM을 만듭니다.

### 6. Observer / Event Bus

`EventBus`는 세션 변경과 음성 안내 메시지를 느슨하게 전달합니다.

- `session:changed`
- `announcement`

이를 통해 `GameSession`은 특정 UI 구현에 직접 의존하지 않습니다.

### 7. Strategy 성격의 의존성 주입

`HybridPuctEngine`은 생성자에서 `evaluator`, `movePrior`, `openingBook`, `transpositionTable` 등을 받습니다.

따라서 다음과 같은 교체가 쉽습니다.

- `StaticEvaluator` → `NeuralEvaluator`
- 휴리스틱 `MovePrior` → 정책망 기반 prior
- 더 큰 오프닝 북

## 클래스별 책임

### `AppController`
- 앱 초기화
- 사용자 입력 이벤트 결선
- 렌더링 호출
- AI 수 탐색 흐름 관리

### `GameSession`
- 체스 상태 보관
- 선택/이동/프로모션/되돌리기 처리
- 게임 스냅샷 생성
- 보조기기용 메시지 트리거

### `MoveNarrator`
- 선택/해제/이동/잡기/체크/종료 안내 문장 생성

### `BoardRenderer`
- 표 기반 체스판 렌더링
- 버튼/방향키 포커스 이동 처리
- 보드 내부 포커스 복원

### `ControlsView`
- 난이도/색상/버튼/프로모션 UI 관리
- 사용자 지정 입력 잠금/해제

### `StatusView`
- 현재 차례, 엔진 상태, 후보수, 기보 렌더링

### `HybridPuctEngine`
- 루트 확장
- PUCT 선택
- progressive widening
- 방문 수/가치 백업
- 루트 수 선택

### `StaticEvaluator`
- 재료/위치/폰 구조/킹 안전 평가
- 얕은 전술 negamax/quiescence

### `MovePrior`
- 수 후보 우선순위 계산
- 캡처/승진/캐슬링/체크/전개/중앙 장악 반영

## 엔진 데이터 흐름

1. 현재 FEN을 Worker로 전달
2. Worker 안에서 `HybridPuctEngine` 생성
3. 오프닝 북 확인
4. 루트 노드 확장 및 prior 부여
5. PUCT 반복 시뮬레이션
6. 진행상황을 `progress` 메시지로 UI에 전달
7. 최종 선택 수와 통계를 `result`로 반환
8. `GameSession.applyEngineMove()`로 실제 반영

## 접근성 설계 이유

이번 프로젝트는 일반적인 `div` 기반 체스판 대신 **네이티브 표 + 버튼** 구조를 선택했습니다.

그 이유는 다음과 같습니다.

- 사용자가 `Tab`만으로 64칸을 순서대로 훑을 수 있어야 함
- 각 칸이 독립적인 포커스 대상이어야 함
- 보드가 본질적으로 행/열 정보를 가지므로 표 의미론과 잘 맞음

`grid` 패턴처럼 복잡한 roving tabindex를 강제하지 않고도 요구사항을 충족할 수 있도록 설계했습니다. 대신 방향키 이동은 보조 기능으로 추가했습니다.

## 브라우저 환경 최적화 포인트

- Worker 분리로 UI 멈춤 최소화
- 대형 신경망 미탑재로 메모리 부담 완화
- vendorized `chess.js` 사용으로 정적 배포 단순화
- build step 없이 바로 배포 가능

## 향후 강화 방향

1. 소형 정책/가치망 도입
2. 반복심화 보조 탐색 추가
3. 더 깊은 전술 탐색에 대한 시간 분배 최적화
4. opening book 확장
5. endgame 전용 evaluator 추가
