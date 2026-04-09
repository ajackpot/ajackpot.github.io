# 구현 보고서 Stage 87 — 런타임 문서 정리 마감

## 배경 / 목표

Stage 85에서 리포트 허브와 AI 체크리스트를 분리했지만, 실제로는 다음 문제가 남아 있었습니다.

1. 루트 `README.md`가 **현재 사용법**보다 **과거 Stage 누적 변경 로그**에 가까웠습니다.
2. 직전 Stage 86 런타임 최적화 보고서와 요약 JSON이 프로젝트 트리 안에는 아직 반영되지 않았습니다.
3. “현재 AI 구조를 설명하는 문서”와 “Stage별 근거 문서”의 경계가 아직 완전히 선명하지 않았습니다.

Stage 87의 목표는 다음과 같습니다.

- 루트 문서를 현재 런타임 중심으로 다시 정리한다.
- 별도의 **runtime reference**를 추가해 AI 구조/기본값/유지보수 기준을 명시한다.
- 누락된 Stage 86 문서를 프로젝트 안으로 backfill한다.
- 체크리스트/허브/인벤토리를 최신 Stage와 맞춘다.
- hot AI 모듈에 짧은 상단 설명을 넣어 코드 안에서도 방향을 바로 읽을 수 있게 한다.

## 변경 범위

### 1) 루트 `README.md` 재작성
기존 README는 접근성, 실행 방법, 테스트 안내 자체는 유효했지만, 하단의 긴 “이번 단계에서 추가한 점” 누적 구간 때문에 현재 문서보다 Stage changelog에 가까웠습니다.

이번 정리에서는 다음 원칙으로 다시 썼습니다.

- 루트 README는 **현재 프로젝트 개요와 진입점**만 설명
- 역사/채택 근거는 `docs/reports/`로 이동
- 활성 runtime의 세부 구조는 `docs/runtime-ai-reference.md`로 이동

### 2) `docs/runtime-ai-reference.md` 신규 추가
이 문서는 보고서가 아니라 **현재 코드 기준 레퍼런스**입니다.
포함한 내용은 다음과 같습니다.

- 현재 기본 런타임 스냅샷
- active profile / exact micro-solver threshold / custom-only WLD 정책
- 모듈 지도
- opening → search → exact/WLD 탐색 파이프라인
- 사용자 노출 설정과 내부 고정 경계
- 유지보수 메모와 검증 진입점

### 3) Stage 86 문서 backfill
직전 런타임 단계에서 실제로 수행된 stability hotpath refactor는 코드와 테스트에는 반영돼 있었지만, 프로젝트 내부의 `docs/reports/implementation/`과 `benchmarks/`에는 파일이 비어 있었습니다.

따라서 이번 단계에서 다음을 반영했습니다.

- `docs/reports/implementation/impl-stage-86-runtime-stability-hotpath-audit.md`
- `benchmarks/stage86_runtime_stability_hotpath_summary.json`

이렇게 해서 **코드 / 보고서 / 요약 데이터**가 다시 같은 저장소 트리 안에서 만나도록 맞췄습니다.

### 4) 체크리스트 / 허브 정리
- `docs/reports/checklists/ai-implementation-checklist.md`
  - Stage 87 기준 snapshot 반영
  - runtime reference 링크 추가
  - Stage 86 stability hotpath 항목 추가
  - 검증 목록에 `stage86_stability_hotpath_smoke` 반영
- `docs/reports/README.md`
  - runtime reference를 빠른 진입점에 추가
  - 최신 구현 보고서를 Stage 87로 교체

### 5) 코드 안 상단 설명 추가
다음 파일 상단에 짧은 설명을 추가했습니다.

- `js/ai/search-engine.js`
- `js/ai/evaluator.js`

목적은 설계를 장황하게 다시 설명하는 것이 아니라, **현재 활성 lane과 책임 범위**를 파일을 열자마자 바로 파악할 수 있게 하는 것입니다.

## 관련 파일
- `README.md`
- `docs/runtime-ai-reference.md`
- `docs/reports/README.md`
- `docs/reports/checklists/ai-implementation-checklist.md`
- `docs/reports/implementation/impl-stage-86-runtime-stability-hotpath-audit.md`
- `docs/reports/implementation/impl-stage-87-runtime-documentation-closeout.md`
- `docs/reports/report-inventory.generated.md`
- `docs/reports/report-inventory.generated.json`
- `benchmarks/stage86_runtime_stability_hotpath_summary.json`
- `benchmarks/stage87_runtime_documentation_closeout_summary.json`
- `stage-info.json`
- `js/ai/search-engine.js`
- `js/ai/evaluator.js`

## 핵심 결정 사항

1. **루트 README는 현재 안내서로 유지한다.**
   - Stage별 누적 변경 로그는 더 이상 루트 README에 계속 쌓지 않습니다.

2. **runtime reference를 reports 밖으로 둔다.**
   - 이 문서는 역사 문서가 아니라 현재 코드 기준 안내서이므로 `docs/reports/`보다 `docs/` 루트가 더 적절합니다.

3. **누락된 Stage 문서는 반드시 저장소 안으로 backfill한다.**
   - 코드가 있고 최종 판단이 있었던 Stage라면, 보고서와 요약 데이터도 같은 트리에 있어야 유지보수성이 좋아집니다.

## 검증 방법과 결과

### 문서/인벤토리 검증
```bash
node tools/docs/generate-report-inventory.mjs
node tools/docs/generate-report-inventory.mjs --check
```

검증 시점 기준 문서 분포는 다음과 같습니다.
- implementation: 46개
- review: 22개
- features: 1개
- checklists: 1개
- total classified docs: 70개

추가로 루트 `README.md`는 **220줄 → 107줄**로 줄여, 현재 사용 안내 문서로 되돌렸습니다.
대신 현재 AI 구조 설명은 `docs/runtime-ai-reference.md`(128줄)로 분리했습니다.

### 런타임 회귀 확인
```bash
node js/test/core-smoke.mjs
node js/test/perft.mjs
node js/test/stage83_custom_wld_toggle_smoke.mjs
node js/test/stage86_stability_hotpath_smoke.mjs
```

문서 단계이지만, Stage 86 backfill과 코드 상단 설명 추가가 포함되므로 기존 핵심 회귀를 다시 확인합니다.

## 리스크 / 비채택 항목
- 이번 Stage는 문서/코드 주석 정리 단계이므로 게임 강도 자체를 바꾸지 않습니다.
- generated inventory는 자동 갱신되지만, checklist와 runtime reference는 여전히 사람이 읽기 좋게 관리하는 큐레이션 문서이므로 이후 런타임 구성이 바뀌면 함께 갱신해야 합니다.

## 다음 단계
이제 루트 README, runtime reference, checklist, Stage 86 backfill이 정리됐으므로, 이후 작업에서는 문서 구조를 다시 손보기보다 실제 런타임/학습 lane 변경이 생길 때 해당 문서만 함께 갱신하는 운영으로 들어가면 됩니다.
