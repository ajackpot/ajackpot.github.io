# Step 01 보고서 · 예약 캘린더 A/B 프로토타입 + 벤치마크

작성 시각: 자동 생성 결과 기준

## 1. 이번 단계 목표

첫 번째 서비스 유형인 **예약 캘린더**에 대해 다음을 한 번에 구현하는 것이 목표였다.

1. 정적 웹앱 수준의 A/B 테스트 페이지
2. 3개 과업에 대한 사전 벤치마크 스크립트
3. 실제 수행 로그와 사전 벤치마크를 한 화면에서 비교하는 결과 요약
4. 다음 서비스 유형으로 확장 가능한 공통 구조

## 2. 완료된 구현 범위

### 2.1 정적 웹앱

- `index.html`
- `styles.css`
- `app.js`

동작 개요:

- 세션 ID 생성
- AB/BA 자동 순서 배정
- 조건 A / 조건 B 각 3개 과업 수행
- 필터 적용 → 결과 탐색 → 슬롯 모달 → 예약/변경/취소
- 과업 직후 실제 로그와 사전 벤치마크 비교
- 조건 종료 후 요약
- 최종 A/B 비교 + JSON 다운로드 + 설문 링크용 URL 생성

### 2.2 예약 캘린더 시나리오

- `data/calendar-scenario.js`
- `data/tasks-calendar.js`

포함 내용:

- 1주 단위 슬롯 데이터
- 상담사 / 비대면·대면 / 30분·45분 필터
- 3개 과업
  - 화요일 14:30 비대면 예약
  - 같은 날 13:30으로 변경
  - 기존 예약 취소 후 목요일 10:00 대면 예약

### 2.3 벤치마크 엔진

- `lib/benchmark-engine.js`
- `data/benchmark-profiles.js`
- `data/benchmark-graphs-calendar.js`
- `scripts/run-benchmark.mjs`
- `data/benchmark-results-calendar.json`
- `data/benchmark-results-calendar.js`

구조:

- 프로필: 키보드 / 화면낭독 / 스위치
- 범위: lower / expected / upper
- 비용 버킷: entry / repeated / recovery
- 입력 요소: navMoves, activations, decisions, waits, speechUnits, scanSteps, contextResets

### 2.4 로그 수집

- `lib/logger.js`

현재 수집 항목:

- 총 키 입력 수
- Tab / Shift+Tab / Arrow / Enter / Space / Escape / Home / End
- focus 이동 수
- revisit 수
- wrong selection 수
- modal escape 수
- modal return 수
- focus loss 수
- pointer activation 수
- booking cancel 수
- task completion time

## 3. 조건 A / B 구현 차이

### 조건 A · 고비용 구조

- 결과보다 헤더/보조 링크/필터가 먼저 노출
- 슬롯 행마다 `선택` / `상세` 버튼 분리
- 모달 열림 시 초기 초점 이동 없음
- 모달 닫힘 시 결과 상단으로 복귀
- 현재 예약 패널이 결과 뒤에 위치

### 조건 B · 개선 구조

- 결과로 이동 가능한 스킵 링크 제공
- 슬롯을 layout grid처럼 묶어 단일 탭 진입 후 방향키 이동
- 모달 열림 시 첫 액션으로 초점 이동
- 모달 닫힘 시 호출한 슬롯으로 복귀
- 현재 예약 패널을 더 빠른 위치에 배치
- 필터 적용 후 결과 제목으로 초점 이동

## 4. 이번 단계의 벤치마크 결과

3개 과업 전체 expected 합계:

| 프로필 | 조건 A | 조건 B | 감소량 | 감소율 |
|---|---:|---:|---:|---:|
| 키보드 | 140.4초 | 58.2초 | 82.2초 | 58.5% |
| 화면낭독 | 245.5초 | 98.8초 | 146.7초 | 59.8% |
| 스위치 | 342.6초 | 139.2초 | 203.4초 | 59.4% |

과업별 expected 감소폭:

| 과업 | 키보드 | 화면낭독 | 스위치 |
|---|---:|---:|---:|
| 과업 1 예약 | 30.2초 | 52.5초 | 71.3초 |
| 과업 2 변경 | 24.1초 | 43.0초 | 60.2초 |
| 과업 3 취소 후 재예약 | 27.9초 | 51.2초 | 71.9초 |

## 5. 파일 구조

```text
keyboard-cost-lab/
  index.html
  styles.css
  app.js
  package.json
  README.md
  data/
    calendar-scenario.js
    tasks-calendar.js
    benchmark-profiles.js
    benchmark-graphs-calendar.js
    benchmark-results-calendar.json
    benchmark-results-calendar.js
  lib/
    benchmark-engine.js
    logger.js
    utils.js
  scripts/
    run-benchmark.mjs
  docs/
    step-01-calendar-prototype-report.md
```

## 6. 실행 방법

```bash
cd keyboard-cost-lab
node scripts/run-benchmark.mjs
python -m http.server 4173
```

이후 브라우저에서 `http://localhost:4173` 접속.

## 7. 확인된 사항

- 모든 JS 파일 문법 검사를 통과했다.
- 벤치마크 생성 스크립트를 실제 실행해 결과 파일을 생성했다.

## 8. 아직 남아 있는 점

### 8.1 아직 거친 부분

- 실제 사용자 검증 전이므로 벤치마크 파라미터는 교정 전 값이다.
- SR/스위치 비용은 구조적 추정치이며 실제 사용성 데이터로 재보정해야 한다.
- A 조건은 의도적으로 불리한 구조이지만, 실제 사례와의 유사성을 더 다듬을 여지가 있다.

### 8.2 다음 단계 후보

1. 캘린더 프로토타입 미세조정
   - 로그 항목 정제
   - 결과 해석 문장 강화
   - 설문 앱 실제 URL 연동

2. 두 번째 서비스 유형 추가
   - 채팅 / 댓글 리스트
   - 같은 실험 프레임 재사용
   - task graph만 새로 작성

3. 세 번째 서비스 유형 추가
   - 블록 에디터

## 9. 다음 단계에서 유지할 원칙

- 구현보다 먼저 **과도한 순차 탐색 비용**이라는 문제 정의를 유지한다.
- A/B 차이는 콘텐츠 양이 아니라 **탐색 구조**에서 만들어야 한다.
- 벤치마크는 예측 도구이며, 실제 로그로 교정해야 한다.
- 탭 스톱 감소가 곧바로 성공은 아니므로 발견 가능성 저하도 함께 본다.
