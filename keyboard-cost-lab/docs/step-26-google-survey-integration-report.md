# Step 26 · Google 설문지 자동 응답 영역 연동

## 목적

Step 25에서 3개 서비스와 2개 과업 구조로 줄어든 테스트 페이지를 새 Google 설문지와 연결했다.
사용자는 테스트 페이지에서 예약 캘린더, 댓글 목록, 검색 결과 목록 과업을 모두 완료한 뒤, 결과 페이지 또는 홈 화면에서 Google 설문지로 이동할 수 있다.
이때 웹앱에 누적된 비교안 A/B 수행 기록은 설문지의 자동 응답 영역 6개 필드에 미리 입력된다.

## 반영한 설문 구조

연동 JSON의 `step-25-survey-v2` 스키마를 기준으로 반영했다.

- 서비스: 예약 캘린더, 댓글 목록, 검색 결과 목록
- 각 서비스 과업 수: 2개
- 필수 응답: 서비스별 4문항 × 3개 서비스, 전체 응답 4문항
- 자동 응답 영역: 서비스별 비교안 A/B 수행 기록 6개
- 설문지에 전달하지 않는 값: 식별 코드, 서비스 완료 순서, 실험 버전, 서비스별 수행 순서

## 변경 파일

- `data/survey-config.js`
  - 현재 Google Form의 응답 URL, 서비스 목록, 필수/선택 키, `entry.*` 매핑을 보관한다.
- `lib/survey-link.js`
  - 공통 저장소에 누적된 서비스 수행 기록을 읽는다.
  - 3개 서비스 완료 여부를 계산한다.
  - 서비스별 비교안 A/B 수행 합계를 자동 응답 영역 문장으로 바꾼다.
  - Google Form 미리 입력 URL을 만든다.
  - 홈 화면과 결과 화면에 설문지 제출 준비 패널을 렌더링한다.
- `app.js`, `comments-app.js`, `search-app.js`
  - 최종 결과 화면에 설문지 제출 준비 패널을 추가했다.
  - 댓글 목록과 검색 결과 목록도 예약 캘린더와 같은 브라우저 세션 키를 쓰도록 맞췄다.
  - 이전의 일반 query string 기반 설문 링크를 제거하고, Google Forms `entry.*` 기반 미리 입력 링크로 바꿨다.

## 자동 응답 영역에 들어가는 형식

각 자동 응답 필드는 JSON이 아니라 사람이 읽을 수 있는 짧은 요약 문장으로 채운다.

예시:

```text
합계: 완료 시간 23.0초, 키 입력 43회, 초점 이동 39회, 목표와 다른 선택 1회, 위치 다시 찾기 4회, 수행 완료 2개, 수행 불가능 0개
과업별: 1번 완료, 11.0초, 키 21회, 초점 19회, 오선택 1회, 다시 찾기 2회 / 2번 완료, 12.0초, 키 22회, 초점 20회, 다시 찾기 2회
```

## 화면 동작

- 홈 화면에는 `설문지 제출 준비` 패널이 표시된다.
- 3개 서비스가 모두 완료되기 전에는 남은 서비스를 안내한다.
- 3개 서비스가 모두 완료되면 `구글 설문지로 이동` 링크가 나타난다.
- 각 서비스 최종 결과 화면에도 같은 패널이 표시된다.
- 설문지의 서비스별 평가와 전체 의견은 사용자가 직접 작성한다.
- 자동 응답 영역에는 완료한 테스트 페이지 기록만 들어간다.

## 검증

다음 검사를 통과했다.

```bash
node --check app.js
node --check comments-app.js
node --check search-app.js
node --check data/survey-config.js
node --check lib/survey-link.js
npm run check
```

추가로 가짜 완료 기록을 만들어 미리 입력 URL을 생성하고, 아래 6개 자동 응답 필드가 모두 URL에 포함되는지 확인했다.

- `service.calendar.actualA`
- `service.calendar.actualB`
- `service.comments.actualA`
- `service.comments.actualB`
- `service.search.actualA`
- `service.search.actualB`

또한 URL 안에 다음 값이 들어가지 않는지 확인했다.

- `sessionId`
- `studyVersion`
- `completedServicesOrder`
- `service.calendar.order`
