# 15단계 구현 보고서: 수행 중 힌트 제거, 과업 종료 확인, 수행 화면 렌더링 점검

## 1. 작업 배경

이번 단계는 실제 테스트 중 사용자가 과업을 올바르게 수행하고 있는지 알 수 있는 메시지가 수행 탭 안에서 노출되는 문제를 줄이고, 과업 종료 버튼을 실수로 눌렀을 때 즉시 종료되는 흐름을 막기 위해 진행했다. 또한 예약 캘린더의 두 번째 A/B 화면에서 콘텐츠가 탐색되지 않는 현상을 확인하고, 같은 문제가 다른 서비스에 있는지 함께 점검했다.

최신 연구 문서의 기준처럼 이 프로젝트는 단순히 키보드로 조작 가능한지 여부가 아니라 목표에 도달하기까지의 조작 비용과 실제 수행 성과를 보는 실험이다. 따라서 수행 중에는 성공·실패 판단을 유도하지 않고, 사용자의 실제 탐색과 판단 결과를 기록하는 쪽으로 맞췄다.

## 2. 반영 범위

대상 서비스는 현재 공개 범위인 3개 서비스다.

- 예약 캘린더: `app.js`
- 댓글 목록: `comments-app.js`
- 검색 결과 목록: `search-app.js`
- 공통 유틸리티: `lib/utils.js`
- 실제 기록 수집: `lib/logger.js`
- 렌더링 점검 스크립트: `scripts/smoke-render-runner.mjs`

## 3. 수행 중 힌트 제거

### 3.1 제거한 항목

각 수행 탭에서 다음 요소를 제거했다.

- 화면낭독용 상태 메시지 영역
- `목표 행동을 완료했습니다`, `예약이 접수되었습니다`, `요청한 댓글 작업을 완료했습니다`처럼 성공 여부를 암시할 수 있는 안내
- 방향키나 탭키 사용 방법을 알려 주는 보조 탐색 힌트
- 목표 행동 직후 성공·실패에 가까운 문구

### 3.2 남긴 항목

실제 서비스라면 보여 줄 수 있는 중립적 처리 결과는 남겼다.

예를 들어 예약 시간 선택 후에는 `예약 확정` 대화상자가 열리지만, 그 안에서는 예약이 맞는지 틀린지 말하지 않는다. 댓글 답글 보기, 자료 저장, 자료 미리보기 닫기 같은 기능도 `표시했습니다`, `저장했습니다`, `닫았습니다` 정도의 서비스 동작만 알려 주며, 과업 정답 여부는 알려 주지 않는다.

## 4. 과업 종료 확인 대화상자 추가

`과업 종료` 버튼을 누르면 바로 종료하지 않고 다음 확인 대화상자가 열린다.

- 제목: `과업을 종료하시겠습니까?`
- 안내: `예를 누르면 현재 상태로 과업 기록을 저장하고 다음 단계로 넘어갑니다. 아니요를 누르면 계속 수행할 수 있습니다.`
- 버튼: `아니요, 계속합니다`, `예, 종료합니다`

동작은 다음과 같다.

- `아니요, 계속합니다`: 대화상자를 닫고 수행 탭으로 돌아간다.
- `예, 종료합니다`: 현재 상태를 판정해 기록하고, 그 뒤 최종 결과 대화상자를 보여 준다.
- `Escape`: 확인 대화상자를 닫고 수행을 계속한다.

과업 종료 확인 대화상자의 버튼 조작은 하단 보조 영역과 같은 운영 조작이므로 실제 과업 조작 지표에서 제외했다.

## 5. 최종 과업 결과 판정 방식

과업 결과는 사용자가 `과업 종료` 확인 대화상자에서 `예, 종료합니다`를 누른 뒤에만 표시된다.

### 5.1 예약 캘린더

결과 메시지 예시는 다음과 같다.

- `과업 수행에 성공했습니다.`
- `요청한 상담 예약 시간과 다른 시간을 예약했습니다.`
- `기존 예약 취소를 완료하지 못했습니다.`
- `예약 확정 화면을 확인하지 않았습니다.`
- `예약 확정 화면에 진입하지 못했습니다.`

### 5.2 댓글 목록

결과 메시지 예시는 다음과 같다.

- `과업 수행에 성공했습니다.`
- `요청한 댓글과 다른 댓글에서 작업했습니다.`
- `요청한 댓글 목록 조건을 맞추지 못했습니다.`
- `댓글 작업 확인 화면을 확인하지 않았습니다.`
- `요청한 댓글 작업을 완료하지 못했습니다.`

### 5.3 검색 결과 목록

결과 메시지 예시는 다음과 같다.

- `과업 수행에 성공했습니다.`
- `요청한 자료와 다른 자료에서 작업했습니다.`
- `요청한 검색 조건을 맞추지 못했습니다.`
- `자료 작업 확인 화면을 확인하지 않았습니다.`
- `요청한 자료 작업을 완료하지 못했습니다.`

## 6. 예약 캘린더 두 번째 화면 콘텐츠 누락 수정

점검 중 예약 캘린더 비교안 B 렌더링에서 `chunkArray`가 정의되지 않은 문제가 확인됐다. A/B 순서가 무작위이기 때문에 두 번째 화면이 B일 때 콘텐츠가 비어 있거나 수행 창 준비 실패처럼 보일 수 있었다.

수정 내용은 다음과 같다.

- `lib/utils.js`에 `chunkArray(items, size)` 공통 함수를 추가했다.
- `app.js`에서 `chunkArray`를 명시적으로 가져오도록 수정했다.
- 예약 캘린더 A/B, 댓글 목록 A/B, 검색 결과 목록 A/B를 모두 수행 화면 렌더링 점검 대상으로 포함했다.

## 7. 수행 화면 렌더링 점검 스크립트 추가

브라우저 자동화가 환경에 따라 불안정할 수 있으므로, 최소한 수행 화면이 빈 화면이 되지 않는지 확인하는 정적 렌더링 점검 스크립트를 추가했다.

```bash
node scripts/smoke-render-runner.mjs
```

이 스크립트는 다음 조합을 모두 렌더링한다.

- 예약 캘린더 A
- 예약 캘린더 B
- 댓글 목록 A
- 댓글 목록 B
- 검색 결과 목록 A
- 검색 결과 목록 B

각 화면에서 확인하는 항목은 다음과 같다.

- 서비스 핵심 콘텐츠 표식이 포함되는가
- 수행 탭 하단의 `과업 종료` 버튼이 포함되는가
- `수행 창을 준비할 수 없습니다` 오류가 나오지 않는가
- 출력된 HTML 길이가 비정상적으로 짧지 않은가
- 초기 수행 화면에 성공·실패 힌트 문구나 이전 상태 메시지 영역이 포함되지 않는가

## 8. 검증 결과

다음 명령을 실행했다.

```bash
node --check lib/utils.js
node --check lib/logger.js
node --check lib/service-shell.js
node --check lib/experiment-bridge.js
node --check app.js
node --check comments-app.js
node --check search-app.js
node --check data/benchmark-graphs-calendar.js
node --check data/benchmark-graphs-comments.js
node --check data/benchmark-graphs-search.js
node --check data/benchmark-manifest.js
node --check data/benchmark-profiles.js
node --check data/benchmark-results-calendar.js
node --check data/benchmark-results-comments.js
node --check data/benchmark-results-search.js
node --check data/calendar-scenario.js
node --check data/comments-scenario.js
node --check data/measurement-rules.js
node --check data/search-scenario.js
node --check data/service-registry.js
node --check data/tasks-calendar.js
node --check data/tasks-comments.js
node --check data/tasks-search.js
node --check scripts/run-benchmark.mjs
node scripts/run-benchmark.mjs
node scripts/smoke-render-runner.mjs
```

수행 화면 렌더링 점검 결과는 다음과 같다.

```text
calendar variantA: marker=true footer=true error=false hints=0 length=25309
calendar variantB: marker=true footer=true error=false hints=0 length=23410
comments variantA: marker=true footer=true error=false hints=0 length=13916
comments variantB: marker=true footer=true error=false hints=0 length=9914
search variantA: marker=true footer=true error=false hints=0 length=15252
search variantB: marker=true footer=true error=false hints=0 length=10331
```

이 결과로 세 서비스의 A/B 수행 화면이 모두 핵심 콘텐츠와 과업 종료 버튼을 포함해 렌더링되고, 초기 수행 화면에 금지한 성공·실패 힌트 문구가 포함되지 않는 것을 확인했다.

## 9. 남은 점검

브라우저 정책과 보조기술 조합에 따라 실제 초점 이동과 탭 닫기 동작은 달라질 수 있으므로, 다음 수동 점검은 계속 필요하다.

- 수행 중 성공·실패 힌트가 보이거나 읽히지 않는지 확인
- 과업 종료 버튼을 누르면 확인 대화상자가 먼저 열리는지 확인
- `아니요, 계속합니다`로 수행을 계속할 수 있는지 확인
- `예, 종료합니다` 뒤에만 최종 과업 결과가 나오는지 확인
- 예약 캘린더 B가 첫 번째 또는 두 번째 화면으로 나와도 콘텐츠가 탐색되는지 확인
- 댓글 목록과 검색 결과 목록에서도 같은 흐름이 유지되는지 확인
