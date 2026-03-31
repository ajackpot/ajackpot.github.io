# Keyboard Cost Lab

정적 웹앱 기반의 키보드/스위치 과도 조작 비용 평가용 프로토타입입니다.

## 실행

```bash
cd keyboard-cost-lab
node scripts/run-benchmark.mjs
python -m http.server 4173
```

그 다음 브라우저에서 `http://localhost:4173`를 엽니다.

## 구조

- `index.html`: 캘린더 A/B 테스트 진입점
- `app.js`: 실험 흐름 및 렌더링
- `data/`: 시나리오, 과업, 벤치마크 그래프, 벤치마크 결과
- `lib/`: 벤치마크 엔진, 로거, 유틸리티
- `scripts/run-benchmark.mjs`: 사전 벤치마크 결과 생성 스크립트
- `docs/`: 단계별 구현 보고서

## 설문 연동

`app.js` 내부 `SURVEY_CONFIG.baseUrl`을 실제 설문 URL로 바꾸면 결과 전달 링크를 생성합니다.
