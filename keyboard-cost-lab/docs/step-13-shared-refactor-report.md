# 13단계 공통 코드 정리와 전반 리팩터링 보고서

## 이번 단계의 목표

서비스 유형이 7개까지 늘어나면서, 각 서비스 화면 파일 안에 반복되던 공통 로직을 정리해 이후 유지보수와 후속 서비스 추가 비용을 낮추는 것을 목표로 했다.

주요 대상은 다음 네 가지였다.

1. 메인 창과 수행 탭 사이의 메시지 연결과 시작 정보 저장
2. 공통 측정 규칙과 벤치마크 생성 대상 목록
3. 결과 내보내기, 설문 링크 생성, 비교 요약 카드 렌더링
4. 홈 화면 서비스 목록과 서비스 공개 상태 관리

## 이번 단계에서 정리한 공통 코드

### 1) 서비스 목록을 별도 데이터 파일로 분리

- 새 파일: `data/service-registry.js`
- 홈 화면의 서비스 카드 목록, 서비스 요약, 공개 상태, 경로 정보를 한곳에서 관리하도록 정리했다.
- `app.js`는 이제 이 목록을 읽어 홈 화면과 서비스 선택 흐름을 구성한다.

### 2) 공통 측정 규칙을 별도 파일로 분리

- 새 파일: `data/measurement-rules.js`
- 기존에는 각 서비스 화면이 같은 계측 규칙 문자열을 반복해서 들고 있었다.
- 이제 서비스 화면은 공통 규칙을 한 파일에서 가져오고, 벤치마크 생성 스크립트도 같은 규칙을 사용한다.
- 추가로, 서비스 화면이 `benchmark-manifest.js`를 통해 불필요한 그래프 파일까지 읽지 않도록 분리했다.

### 3) 벤치마크 생성 목록을 표 형태 데이터로 정리

- 새 파일: `data/benchmark-manifest.js`
- 수정 파일: `scripts/run-benchmark.mjs`
- 서비스별 그래프, 결과 JSON 파일명, 모듈 파일명, 안내 문구를 목록으로 관리하고 반복문으로 처리하도록 바꿨다.
- 이 변경으로 `run-benchmark.mjs`는 서비스마다 같은 코드를 반복하지 않게 되었다.

### 4) 메인 창·수행 탭 연결 공통 모듈 추가

- 새 파일: `lib/experiment-bridge.js`
- 다음 로직을 공통 함수로 옮겼다.
  - 앱 모드 판별
  - 세션 ID 생성/보존
  - BroadcastChannel 또는 storage 기반 메시지 전달
  - 수행 탭 시작 정보 저장/읽기/삭제
  - 수행 탭 URL 생성
  - 수행 탭 닫기 처리
  - 대화상자 초점 가두기

### 5) 결과 요약·내보내기 공통 모듈 추가

- 새 파일: `lib/service-shell.js`
- 다음 로직을 공통 함수로 옮겼다.
  - 용어 설명 카드 렌더링
  - 서비스 소개 카드 렌더링
  - 사전 계산 기준 표 렌더링
  - 수행 탭 실행 상태 문구 생성
  - 최종 비교안 요약 카드 렌더링
  - 사전 계산 기준 합계 집계
  - 결과 내보내기용 JSON 조립
  - 결과 파일 data URL 생성
  - 설문 링크 생성
  - 부호 있는 차이값 문자열 생성
  - 실제 지표 합계 집계 유틸리티

## 서비스 화면 파일에 반영한 정리

다음 파일들이 공통 모듈을 사용하도록 갱신되었다.

- `app.js`
- `comments-app.js`
- `product-app.js`
- `search-app.js`
- `settings-app.js`
- `filters-app.js`
- `checkout-app.js`

정리한 공통 항목은 다음과 같다.

- 세션 ID 생성 로직
- 메인 창/수행 탭 메시지 연결 로직
- 수행 시작 정보 저장과 읽기
- 수행 탭 닫기 처리
- 대화상자 초점 가두기
- 공통 용어 설명 카드
- 공통 사전 계산 기준 표
- 공통 수행 상태 문구
- 공통 최종 비교 카드
- 공통 결과 내보내기와 설문 링크 생성
- 공통 실제 지표 합산 유틸리티

## 코드량 변화

### 서비스 화면 파일 줄 수 변화

- `app.js`: 2039줄 → 1832줄, 207줄 감소
- `comments-app.js`: 1778줄 → 1658줄, 120줄 감소
- `product-app.js`: 1799줄 → 1679줄, 120줄 감소
- `search-app.js`: 1812줄 → 1692줄, 120줄 감소
- `settings-app.js`: 1841줄 → 1721줄, 120줄 감소
- `filters-app.js`: 1984줄 → 1864줄, 120줄 감소
- `checkout-app.js`: 1844줄 → 1724줄, 120줄 감소

서비스 화면 7개만 합산하면 총 927줄이 줄었다.

### 벤치마크 생성 스크립트 줄 수 변화

- `scripts/run-benchmark.mjs`: 111줄 → 35줄, 76줄 감소

## 동작 관점에서 의도한 변화

이번 단계의 목적은 동작 변경보다 구조 정리다. 따라서 다음 사용자 흐름은 유지했다.

- 홈 화면에서 서비스 유형 선택
- 서비스 화면에서 과업 준비
- 새 탭에서 비교안 A/B 수행
- 수행 성공 시 완료 안내 대화상자 표시
- 확인 시 수행 탭 자동 닫기
- 결과 요약과 설문 링크 생성

## 확인한 항목

### 문법 점검

```bash
node --check app.js
node --check comments-app.js
node --check product-app.js
node --check search-app.js
node --check settings-app.js
node --check filters-app.js
node --check checkout-app.js
node --check lib/experiment-bridge.js
node --check lib/service-shell.js
node --check data/service-registry.js
node --check data/benchmark-manifest.js
node --check data/measurement-rules.js
node --check scripts/run-benchmark.mjs
```

### 벤치마크 재생성

```bash
node scripts/run-benchmark.mjs
```

### 정적 서버 응답 확인

다음 응답을 확인했다.

- `index.html`
- `comments.html`
- `product.html`
- `search.html`
- `settings.html`
- `filters.html`
- `checkout.html`
- `data/benchmark-results-calendar.json`
- `data/benchmark-results-comments.json`

## 다음 단계에서 이어서 보기 좋은 항목

1. 서비스 화면 소개 카드도 공통 템플릿으로 한 번 더 묶기
2. 검색 결과 목록/검색 세부 조건, 설정 화면/신청·결제 흐름처럼 유사한 쌍의 서비스 로직을 더 큰 공통 모듈로 통합하기
3. 수동 점검표에서 공통 모듈 변경 시 다시 확인해야 할 핵심 항목을 별도 묶음으로 정리하기
