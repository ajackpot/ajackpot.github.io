# 키보드 조작 부담 실험

정적 웹앱으로 만드는 키보드·스위치 과도 조작 부담 평가용 실험 프로젝트입니다.

## 현재 구현 범위

- 서비스 카드 버튼 이름은 대상 서비스 이름을 포함해 서로 구분되도록 유지합니다.
- 홈 화면의 서비스 목록은 서비스 정보 묶음에서 경로와 공개 상태를 함께 관리해 새 서비스 추가 시 수정 범위를 줄입니다.
- 비교안 순서는 일곱 서비스 모두 `A → B`로 고정해 첫 진입 조건을 일관되게 유지합니다.
- 수행 탭의 서비스 콘텐츠에는 실험 설명 문구를 남기지 않고, 맨 아래 보조 영역만 별도로 둡니다.
- 과업 성공 시 완료 안내 팝업 대화상자가 뜨고, `확인`을 누르면 수행 탭이 자동으로 닫힙니다.
- 홈 화면에서 서비스 유형 선택
- 예약 캘린더 서비스 화면 진입
- 댓글 목록 서비스 화면 진입
- 상품 옵션 선택 서비스 화면 진입
- 검색 결과 목록 서비스 화면 진입
- 설정 화면 서비스 화면 진입
- 검색 세부 조건 서비스 화면 진입
- 신청·결제 흐름 서비스 화면 진입
- 메인 창에서 과업 내용 확인 후, 새 탭에서 비교안 A/B 수행
- 실제 기록과 사전 계산 기준 비교
- 결과 파일 내려받기와 설문지 연동 준비
- 단계 보고서, 용어 가이드, 수동 점검표 문서 기록
- 공통 메시지 브리지, 시작 정보 저장, 결과 내보내기, 비교 요약 렌더링을 서비스 공통 모듈로 묶음
- 공통 측정 규칙, 서비스 목록, 벤치마크 생성 목록을 별도 데이터 파일로 분리

## 서비스 유형

- `예약 캘린더`: 예약 시간 탐색, 예약 변경, 취소 후 재예약 과업
- `댓글 목록`: 댓글 정렬, 답글 보기, 댓글 정보 확인, 도움이 돼요 과업
- `상품 옵션 선택`: 색상·크기·추가 구성 선택, 옵션 설명 확인, 장바구니 담기 과업
- `검색 결과 목록`: 정렬 기준 변경, 자료 범위 선택, 미리보기, 저장, 바로 열기 과업
- `설정 화면`: 설명 보기, 설정 값 변경, 설정 묶음 저장 과업
- `검색 세부 조건`: 기간, 자료 종류, 담당 부서, 대상, 첨부 조건 선택 뒤 미리보기, 저장, 바로 열기 과업
- `신청·결제 흐름`: 신청 정보, 안내 수신, 결제 수단 선택과 제출 완료 과업

## 계측 규칙

- 실제 계측은 수행 탭에서 첫 조작이 들어갈 때 시작합니다.
- 수행 탭이 숨겨져 있는 동안의 시간은 실제 완료 시간에서 제외합니다.
- 수행 탭 맨 아래의 보조 버튼 조작은 실제 지표에 포함하지 않습니다.
- 과업 성공 뒤 완료 안내 팝업의 `확인` 버튼 조작은 기록 수집이 끝난 뒤에만 사용됩니다.
- 메인 창은 과업 내용을 다시 확인하는 용도로 유지합니다.

## 실행

```bash
cd keyboard-cost-lab
node scripts/run-benchmark.mjs
python -m http.server 4173
```

그 다음 브라우저에서 `http://localhost:4173`를 열고, 홈 화면에서 원하는 서비스 유형을 고릅니다.

## 주요 파일

- `index.html`: 홈 화면과 예약 캘린더 실험 진입점
- `app.js`: 예약 캘린더 실험 흐름과 홈 화면
- `comments.html`: 댓글 목록 실험 진입점
- `comments-app.js`: 댓글 목록 실험 흐름
- `product.html`: 상품 옵션 선택 실험 진입점
- `product-app.js`: 상품 옵션 선택 실험 흐름
- `search.html`: 검색 결과 목록 실험 진입점
- `search-app.js`: 검색 결과 목록 실험 흐름
- `settings.html`: 설정 화면 실험 진입점
- `settings-app.js`: 설정 화면 실험 흐름
- `filters.html`: 검색 세부 조건 실험 진입점
- `filters-app.js`: 검색 세부 조건 실험 흐름
- `checkout.html`: 신청·결제 흐름 실험 진입점
- `checkout-app.js`: 신청·결제 흐름 실험 흐름
- `styles.css`: 공통 화면 스타일
- `data/`: 시나리오, 과업, 사전 계산 그래프, 사전 계산 결과, 서비스 목록, 공통 측정 규칙
- `data/service-registry.js`: 홈 화면 서비스 목록과 공개 상태
- `data/benchmark-manifest.js`: 벤치마크 생성 대상과 출력 파일 목록
- `data/measurement-rules.js`: 공통 계측 규칙
- `lib/`: 사전 계산 엔진, 기록 수집기, 유틸리티, 공통 실행 흐름 모듈
- `lib/experiment-bridge.js`: 메인 창·수행 탭 메시지 연결, 시작 정보 저장, 초점 가두기
- `lib/service-shell.js`: 공통 비교 요약, 결과 내보내기, 설문 링크 생성
- `scripts/run-benchmark.mjs`: 서비스별 사전 계산 결과 생성 스크립트
- `docs/`: 단계별 구현 보고서, 용어 가이드, 수동 점검표

## 설문지 연동

- 예약 캘린더: `app.js` 안의 `SURVEY_CONFIG.baseUrl`
- 댓글 목록: `comments-app.js` 안의 `SURVEY_CONFIG.baseUrl`
- 상품 옵션 선택: `product-app.js` 안의 `SURVEY_CONFIG.baseUrl`
- 검색 결과 목록: `search-app.js` 안의 `SURVEY_CONFIG.baseUrl`
- 설정 화면: `settings-app.js` 안의 `SURVEY_CONFIG.baseUrl`
- 검색 세부 조건: `filters-app.js` 안의 `SURVEY_CONFIG.baseUrl`
- 신청·결제 흐름: `checkout-app.js` 안의 `SURVEY_CONFIG.baseUrl`

위 주소를 실제 설문지 주소로 바꾸면 결과 전달 링크를 생성합니다.

## 문서

- `docs/step-01-calendar-prototype-report.md`: 1단계 예약 캘린더 시범 구현 보고서
- `docs/step-02-home-flow-and-language-guide-report.md`: 2단계 서비스 선택 흐름·용어 정비 보고서
- `docs/language-guideline-wcag-3.1.3-kwcag.md`: 화면 문구 작성 가이드
- `docs/step-03-keyboard-audit-and-focus-report.md`: 3단계 키보드 점검·초점 흐름 정비 보고서
- `docs/step-04-separated-runner-and-timing-report.md`: 4단계 메인 창·수행 탭 분리와 계측 규칙 정비 보고서
- `docs/step-05-comments-service-and-checklist-report.md`: 5단계 댓글 목록 서비스 추가와 점검표 정리 보고서
- `docs/step-06-product-service-report.md`: 6단계 상품 옵션 선택 서비스 추가 보고서
- `docs/step-07-labels-and-runner-cleanup-report.md`: 7단계 버튼 이름 구분 가능성 보완과 수행 탭 정리 보고서
- `docs/step-08-order-and-completion-dialog-report.md`: 8단계 비교안 순서 고정과 완료 대화상자·자동 닫기 보완 보고서
- `docs/step-09-search-results-service-report.md`: 9단계 검색 결과 목록 서비스 추가 보고서
- `docs/step-10-settings-service-report.md`: 10단계 설정 화면 서비스 추가 보고서
- `docs/step-11-search-filter-service-report.md`: 11단계 검색 세부 조건 서비스 추가 보고서
- `docs/step-12-checkout-service-report.md`: 12단계 신청·결제 흐름 서비스 추가 보고서
- `docs/step-13-shared-refactor-report.md`: 13단계 공통 코드 정리와 전반 리팩터링 보고서
- `docs/manual-release-checklist.md`: 배포 전 수동 점검표
