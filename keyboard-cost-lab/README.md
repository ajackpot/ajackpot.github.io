# 키보드 조작 부담 실험

정적 웹앱으로 만드는 키보드·스위치 과도 조작 부담 평가용 실험 프로젝트입니다.

## 현재 구현 범위

- 홈 화면에서 서비스 유형 선택
- 예약 캘린더 서비스 화면 진입
- 댓글 목록 서비스 화면 진입
- 상품 옵션 선택 서비스 화면 진입
- 메인 창에서 과업 내용 확인 후, 새 탭에서 비교안 A/B 수행
- 실제 기록과 사전 계산 기준 비교
- 결과 파일 내려받기와 설문지 연동 준비
- 단계 보고서, 용어 가이드, 수동 점검표 문서 기록

## 서비스 유형

- `예약 캘린더`: 예약 시간 탐색, 예약 변경, 취소 후 재예약 과업
- `댓글 목록`: 댓글 정렬, 답글 보기, 댓글 정보 확인, 도움이 돼요 과업
- `상품 옵션 선택`: 색상·크기·추가 구성 선택, 옵션 설명 확인, 장바구니 담기 과업

## 계측 규칙

- 실제 계측은 수행 탭에서 첫 조작이 들어갈 때 시작합니다.
- 수행 탭이 숨겨져 있는 동안의 시간은 실제 완료 시간에서 제외합니다.
- 수행 탭 맨 아래의 보조 버튼 조작은 실제 지표에 포함하지 않습니다.
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
- `styles.css`: 공통 화면 스타일
- `data/`: 시나리오, 과업, 사전 계산 그래프, 사전 계산 결과
- `lib/`: 사전 계산 엔진, 기록 수집기, 유틸리티
- `scripts/run-benchmark.mjs`: 서비스별 사전 계산 결과 생성 스크립트
- `docs/`: 단계별 구현 보고서, 용어 가이드, 수동 점검표

## 설문지 연동

- 예약 캘린더: `app.js` 안의 `SURVEY_CONFIG.baseUrl`
- 댓글 목록: `comments-app.js` 안의 `SURVEY_CONFIG.baseUrl`
- 상품 옵션 선택: `product-app.js` 안의 `SURVEY_CONFIG.baseUrl`

위 주소를 실제 설문지 주소로 바꾸면 결과 전달 링크를 생성합니다.

## 문서

- `docs/step-01-calendar-prototype-report.md`: 1단계 예약 캘린더 시범 구현 보고서
- `docs/step-02-home-flow-and-language-guide-report.md`: 2단계 서비스 선택 흐름·용어 정비 보고서
- `docs/language-guideline-wcag-3.1.3-kwcag.md`: 화면 문구 작성 가이드
- `docs/step-03-keyboard-audit-and-focus-report.md`: 3단계 키보드 점검·초점 흐름 정비 보고서
- `docs/step-04-separated-runner-and-timing-report.md`: 4단계 메인 창·수행 탭 분리와 계측 규칙 정비 보고서
- `docs/step-05-comments-service-and-checklist-report.md`: 5단계 댓글 목록 서비스 추가와 점검표 정리 보고서
- `docs/step-06-product-service-report.md`: 6단계 상품 옵션 선택 서비스 추가 보고서
- `docs/manual-release-checklist.md`: 배포 전 수동 점검표
