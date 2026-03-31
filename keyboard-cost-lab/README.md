# 키보드 조작 부담 실험

정적 웹앱으로 만드는 키보드·스위치 과도 조작 부담 평가용 실험 프로젝트입니다.

## 현재 구현 범위

- 홈 화면에서 서비스 유형 선택
- 예약 캘린더 서비스 화면 진입
- 비교안 A/B 과업 수행
- 실제 기록과 사전 계산 기준 비교
- 결과 파일 내려받기와 설문지 연동 준비
- 단계 보고서와 용어 가이드 문서 기록
- 키보드 점검에 맞춘 초점 이동·대화상자 복귀 정비

## 실행

```bash
cd keyboard-cost-lab
node scripts/run-benchmark.mjs
python -m http.server 4173
```

그 다음 브라우저에서 `http://localhost:4173`를 엽니다.

## 구조

- `index.html`: 홈 화면과 실험 진입점
- `app.js`: 서비스 선택, 실험 흐름, 결과 화면 렌더링
- `styles.css`: 공통 화면 스타일
- `data/`: 시나리오, 과업, 사전 계산 그래프, 사전 계산 결과
- `lib/`: 사전 계산 엔진, 기록 수집기, 유틸리티
- `scripts/run-benchmark.mjs`: 사전 계산 결과 생성 스크립트
- `docs/`: 단계별 구현 보고서와 용어 가이드

## 설문지 연동

`app.js` 안의 `SURVEY_CONFIG.baseUrl`을 실제 설문지 주소로 바꾸면 결과 전달 링크를 생성합니다.

## 문서

- `docs/step-01-calendar-prototype-report.md`: 1단계 예약 캘린더 시범 구현 보고서
- `docs/step-02-home-flow-and-language-guide-report.md`: 2단계 서비스 선택 흐름·용어 정비 보고서
- `docs/language-guideline-wcag-3.1.3-kwcag.md`: 화면 문구 작성 가이드
- `docs/step-03-keyboard-audit-and-focus-report.md`: 3단계 키보드 점검·초점 흐름 정비 보고서
