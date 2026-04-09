# 구현 보고서 Stage 85 — 리포트 허브/AI 체크리스트 마감 리팩토링

## 배경 / 목표

Stage가 누적되면서 구현 보고서와 검토 보고서 수가 많아졌고, `docs/reports/README.md`의 수동 목록은 최신 상태를 충분히 따라가지 못했습니다.
또한 루트 `README.md`의 누적 변경 이력만으로는 **현재 런타임에 실제로 무엇이 살아 있는지**를 빠르게 파악하기 어려웠습니다.

Stage 85의 목표는 다음 두 가지입니다.

1. 현재 AI 구현 상태를 한눈에 볼 수 있는 **별도 체크리스트 문서**를 추가한다.
2. 리포트 허브를 **수동 나열 방식에서 생성 인벤토리 기반 구조**로 바꿔, 이후 Stage에서도 인덱스가 쉽게 낡지 않도록 한다.

## 변경 범위

### 1) 현재 상태 체크리스트 추가
- `docs/reports/checklists/ai-implementation-checklist.md`
- 다음 항목을 현재 코드 기준으로 정리했습니다.
  - 탐색 코어
  - 말기 exact / WLD 경로
  - evaluator / move ordering / opening 체계
  - 사용자 노출 설정과 안전 장치
  - 학습/벤치/패키징/검증 도구
  - 역사 문서로만 남기고 현재 런타임에는 남기지 않은 항목

### 2) 리포트 허브 구조 정리
- `docs/reports/README.md`를 **허브 문서** 중심으로 다시 작성했습니다.
- 수동으로 모든 파일을 길게 나열하던 방식 대신 다음 흐름으로 정리했습니다.
  - 빠른 진입점
  - 디렉터리 규칙
  - 운영 원칙
  - 생성 인벤토리 갱신 방법

### 3) 생성 인벤토리 도구 추가
- `tools/docs/generate-report-inventory.mjs`를 추가했습니다.
- 이 스크립트는 `docs/reports/`를 스캔해 다음 생성물을 만듭니다.
  - `docs/reports/report-inventory.generated.md`
  - `docs/reports/report-inventory.generated.json`
- `--check` 모드를 지원해, 생성 결과와 저장된 파일이 다르면 즉시 감지할 수 있게 했습니다.

### 4) 루트 README 진입점 보강
- 루트 `README.md`에 문서 허브/체크리스트/인벤토리 관련 진입점을 추가했습니다.
- Stage 84/85 누적 변경 요약도 함께 보강했습니다.

## 관련 파일
- `docs/reports/checklists/ai-implementation-checklist.md`
- `docs/reports/README.md`
- `docs/reports/report-inventory.generated.md`
- `docs/reports/report-inventory.generated.json`
- `tools/docs/generate-report-inventory.mjs`
- `README.md`
- `stage-info.json`
- `benchmarks/stage85_report_hub_refactor_summary.json`

## 핵심 결정 사항

1. **체크리스트는 수동 큐레이션 문서**로 유지합니다.
   - “현재 무엇이 구현되어 있는가”는 단순 파일 목록만으로는 충분하지 않기 때문입니다.
   - 따라서 체크리스트는 사람이 읽기 좋게 정리하고, 현재 활성/선택형/도구/역사 상태를 함께 기록합니다.

2. **문서 인벤토리는 생성물로 관리합니다.**
   - 구현/검토 보고서 목록은 시간이 지나면 계속 늘어나므로, 수동 목록보다 생성 스크립트가 더 안전합니다.

3. **리포트 허브는 짧게 유지합니다.**
   - 허브 문서는 “어디로 가야 하는지”를 안내하는 역할에 집중하고,
   - 전체 목록은 generated inventory,
   - 현재 상태 요약은 checklist로 분리합니다.

## 검증 방법과 결과

### 문서/인벤토리 검증
```bash
node tools/docs/generate-report-inventory.mjs
node tools/docs/generate-report-inventory.mjs --check
```

검증 시점 기준 문서 분포는 다음과 같습니다.
- implementation: 44개
- review: 22개
- features: 1개
- checklists: 1개

### 런타임 회귀 확인
Stage 85는 문서/운영 리팩토링 중심이지만, 기본 AI 경로가 깨지지 않았는지 기존 핵심 회귀를 다시 확인했습니다.

```bash
node js/test/core-smoke.mjs
node js/test/perft.mjs
node js/test/stage83_custom_wld_toggle_smoke.mjs
```

세 테스트 모두 통과했습니다.

## 벤치마크 / 근거 데이터
- 문서 정리 요약: `benchmarks/stage85_report_hub_refactor_summary.json`
- 생성 인벤토리: `docs/reports/report-inventory.generated.md`
- 현재 구현 상태 체크리스트: `docs/reports/checklists/ai-implementation-checklist.md`

## 리스크 / 비채택 항목
- 이번 Stage는 **게임플레이 강도 자체를 바꾸는 탐색 변경이 아닙니다.**
- 따라서 새 알고리즘 채택/비채택보다, **문서 가시성과 유지보수성** 개선이 핵심입니다.
- 체크리스트는 큐레이션 문서이므로, 이후 실제 런타임 구성이 바뀌면 수동 갱신이 필요합니다. 다만 전체 인벤토리는 생성물이라 수동 누락 가능성이 크게 줄었습니다.

## 다음 단계
- 남은 마감 단계에서는 코드 쪽 closeout이 필요할 경우, `search-engine.js`와 `README.md`의 누적 서술을 중심으로 **기본값/활성 경로/비활성 역사 항목의 경계**를 더 선명하게 정리하면 됩니다.
