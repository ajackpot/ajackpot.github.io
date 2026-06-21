# 16단계 보고서: 내부 식별값 비노출, 수행 탭 요청 표시 옵션, 예약 시간표 실행 동작 점검

## 1. 작업 배경

이번 단계는 15단계에서 수행 중 힌트를 제거하고 과업 종료 확인 흐름을 정리한 뒤, 실제 테스트 화면에서 발견된 세 가지 문제를 먼저 보정하는 단계다.

- 세션 ID 같은 내부 실험 번호가 화면에 노출될 필요가 없다.
- 과업 요청을 메인 창에서만 확인하는 방식은 원칙적으로 좋지만, 필요하면 수행 탭에서도 볼 수 있는 선택지가 있어야 한다.
- 예약 캘린더 B안의 시간표 항목이 일부 실행 방식에서 반응하지 않을 수 있다.

프로젝트의 연구 방향은 단순히 키보드로 조작 가능한지보다 목표 도달까지의 조작 비용과 실제 수행 결과를 보는 것이므로, 내부 식별값이나 과도한 안내가 사용자 화면에 드러나지 않게 유지했다.

## 2. 반영 내용

### 2.1 내부 식별값 화면 노출 제거

홈 화면과 과업 준비 화면에서 보이던 `실험 번호` 표시를 제거했다.

- 내부 세션 값은 계속 유지한다.
- 메인 창과 수행 탭 간 통신, 결과 파일, 설문 연동용 내부 값으로만 사용한다.
- 다운로드 파일명에서도 세션 ID를 보이는 이름으로 쓰지 않도록 세 서비스 결과 파일명을 고정 이름으로 정리했다.

### 2.2 과업 요청 사항 수행 탭 표시 옵션 추가

과업 준비 화면의 `이번 요청` 카드에 `과업 요청 사항을 수행 탭에서도 보기` 스위치를 추가했다.

- 기본값은 꺼짐이다.
- 켜면 새로 여는 수행 탭의 최상단에 `과업 요청 사항` 카드가 표시된다.
- 끄면 수행 탭에는 기존처럼 서비스 화면이 먼저 표시된다.
- 옵션 상태는 수행 탭을 열 때 시작 정보에 함께 저장되어 해당 탭에서만 사용된다.

수정 파일:

- `lib/utils.js`
- `app.js`
- `comments-app.js`
- `search-app.js`

### 2.3 예약 캘린더 B안 시간표 실행 동작 수정

예약 캘린더 B안의 시간표 항목은 방향키 이동과 Enter/Space 실행은 처리하고 있었지만, 버튼 자체에 일반 실행용 `data-action`이 없어 마우스 클릭이나 일부 보조기술 실행 방식에서 동작하지 않을 수 있었다.

수정 내용:

- B안 시간표 버튼에 `data-action="slot-open"`과 `data-dialog-mode="select"`를 추가했다.
- 기존 공통 클릭 처리기가 시간표 버튼도 같은 `slot-open` 경로로 처리할 수 있게 했다.
- Enter, Space, 마우스 클릭 모두 같은 예약 확인 대화상자로 이어지도록 했다.

### 2.4 예약 캘린더 주요 기능 점검

예약 캘린더에서 중요한 조작의 연결 상태를 정적으로 확인했다.

- 조건 적용
- 예약 시간 선택
- 예약 시간 안내 보기
- 현재 예약 취소
- 종료 확인 대화상자
- 종료 취소 후 계속 진행
- 종료 확정 후 기록 저장
- 하단의 예약 가능 시간 이동
- 점검 중 보조 기능 안내
- 상담 검색 입력란에서 Enter를 눌렀을 때 페이지 이동 없이 점검 중 안내 표시

이번 점검에서 직접 수정한 핵심 문제는 B안 시간표 항목 실행 누락과 상담 검색 폼 제출 시 무반응 가능성이다.

### 2.5 수행 중 힌트 문구 재점검

목표 행동 직후 뜨는 중립 대화상자의 설명에서 `요청한 동작`처럼 성공 여부를 암시할 수 있는 표현을 더 줄였다.

- 기존: `요청한 동작의 처리 결과를 확인했습니다. 계속 진행하거나 과업 종료 버튼을 누를 수 있습니다.`
- 변경: `처리 결과를 확인했습니다. 화면을 계속 이용할 수 있습니다.`

최종 성공·실패 판정 메시지는 여전히 `과업 종료` → `예, 종료합니다` 이후의 기록 저장 대화상자에서만 표시된다.

## 3. 정적 점검 스크립트 추가

`scripts/static-quality-check.mjs`, `scripts/smoke-static-ui.mjs`, `scripts/smoke-contract.mjs`, `scripts/check-static-contracts.mjs`, `scripts/smoke-render-runner.mjs`를 정적·렌더링 계약 점검에 사용했다.

이 스크립트들은 다음을 확인한다.

- 사용자 화면 코드에 `실험 번호` 문구가 남아 있지 않은지
- 세 서비스 모두 과업 요청 표시 스위치와 수행 탭 요청 표시 영역을 연결했는지
- 예약 캘린더 B안 시간표 항목에 실행 동작이 연결되어 있는지
- 결과 파일 내려받기 이름에 세션 ID가 남아 있지 않은지
- 종료 확인 대화상자에서 최종 판정 메시지를 미리 노출하지 않는지
- 각 서비스와 공통 유틸리티의 `data-action` 값이 서비스 앱에서 처리되는지
- 렌더링 문자열 안의 `<button>`에 `data-action`이 빠진 항목이 없는지
- 세 서비스의 A/B 수행 화면이 핵심 콘텐츠와 과업 종료 버튼을 포함해 렌더링되는지
- 요청 표시 옵션을 켠 수행 화면에 과업 요청 카드가 표시되는지

`package.json`에는 `npm run check`로 정적 점검을 한 번에 실행할 수 있게 반영했다.

## 4. 검증 결과

실행한 점검:

```bash
node --check lib/utils.js
node --check lib/logger.js
node --check lib/service-shell.js
node --check lib/experiment-bridge.js
node --check app.js
node --check comments-app.js
node --check search-app.js
node --check data/*.js
node --check scripts/run-benchmark.mjs
node --check scripts/static-quality-check.mjs
node --check scripts/smoke-static-ui.mjs
node --check scripts/smoke-contract.mjs
node --check scripts/check-static-contracts.mjs
node --check scripts/smoke-render-runner.mjs
node scripts/run-benchmark.mjs
node scripts/static-quality-check.mjs
node scripts/smoke-static-ui.mjs
node scripts/smoke-contract.mjs
node scripts/check-static-contracts.mjs
node scripts/smoke-render-runner.mjs
```

파일 구성 확인:

```text
index.html
comments.html
search.html
data/benchmark-results-calendar.json
data/benchmark-results-comments.json
data/benchmark-results-search.json
```

이 환경에서는 로컬 정적 서버에 curl로 접속하는 끝단 확인은 재현하지 못했으므로, 브라우저에서의 실제 응답 확인은 수동 점검 항목으로 남겼다.

정적 계약 점검 결과:

```text
smoke-contract: ok
```

## 5. 남은 수동 점검

브라우저와 보조기술 조합별 끝단 동작은 수동 점검으로 남긴다.

우선 확인할 항목:

- 과업 준비 화면의 스위치를 끈 상태에서 수행 탭 최상단에 요청 카드가 나오지 않는지
- 스위치를 켠 상태에서 수행 탭 최상단에 요청 카드가 나오는지
- 예약 캘린더 B안 시간표 항목이 Enter, Space, 마우스 클릭으로 모두 예약 확인 대화상자를 여는지
- 상담 검색 입력란에서 Enter를 눌러도 점검 중 안내가 표시되는지
- `과업 종료` → `아니요, 계속합니다`가 과업으로 복귀하는지
- `과업 종료` → `예, 종료합니다` 이후에만 성공·실패 판정 메시지가 표시되는지
- 댓글 목록과 검색 결과 목록에서도 같은 종료 흐름이 유지되는지
