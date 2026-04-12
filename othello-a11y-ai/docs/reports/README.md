# 구현/검토 보고서 허브

이 디렉터리는 구현 이력, 실험/검토 문서, 현재 상태 체크리스트를 모아 두는 문서 허브입니다.
현재 코드 기준 설명은 루트 `README.md`와 `../runtime-ai-reference.md`에서 보고, 여기서는 **Stage별 근거와 역사**를 추적합니다.

## 문서 기준선
- 저장소 stage/tag/updatedAt/summary의 단일 기준은 `../../stage-info.json`입니다.
- **현재 코드 기준 안내**는 `../../README.md`, `../runtime-ai-reference.md`, `checklists/ai-implementation-checklist.md`를 먼저 봅니다.
- **Stage별 채택/비채택 근거와 역사**는 `implementation/`, `review/`에 남깁니다.
- 전체 문서 목록과 최신 구현 보고서 진입점은 수동 목록보다 `report-inventory.generated.md`, `report-inventory.generated.json`을 우선 기준으로 봅니다.
- `package.json`은 Node ESM / 도구 실행용 최소 메타데이터 파일이며, 저장소 Stage 버전 기준으로 사용하지 않습니다.

## 빠른 진입점
- [현재 AI 런타임 레퍼런스](../runtime-ai-reference.md)
- [AI 구현 체크리스트](checklists/ai-implementation-checklist.md)
- [생성된 리포트 인벤토리](report-inventory.generated.md)
- [현재 저장소 Stage 메타데이터](../../stage-info.json)

최신 구현 보고서의 직접 진입점은 정적 허브 문서에 하드코딩하지 않고, 생성된 인벤토리의 **빠른 진입점**을 기준으로 봅니다.

## 디렉터리 규칙
- `implementation/`: 실제 코드 변경이 반영된 구현 보고서
- `review/`: 실험, 검토, 채택/비채택 판단 문서
- `features/`: 특정 기능 단위의 보충 설계/통합 문서
- `checklists/`: 현재 구현 상태를 빠르게 확인하는 운영 체크리스트
- `templates/`: 새 보고서를 작성할 때 시작점으로 쓰는 템플릿

## 파일명 규칙
- 전부 **소문자 kebab-case**를 사용합니다.
- Stage 번호는 현재 저장소에서 사용하는 실제 숫자를 그대로 적습니다. `100` 이상도 그대로 세 자리 이상을 유지합니다.
- 권장 패턴:
  - 구현: `impl-stage-120-documentation-baseline-and-version-sync.md`
  - 검토: `review-stage-09-exact-window-late-ordering-profile-redesign.md`
  - 체크리스트: `ai-implementation-checklist.md`

## 제목 규칙
- H1 첫 줄에 **문서 종류 또는 Stage 번호 + 주제**가 바로 드러나야 합니다.
- 구현/검토 문서는 `# Stage N - 주제`, `# 구현 보고서 Stage N — 주제`, `# 검토 보고서 Stage N — 주제` 가운데 하나처럼 **Stage 번호가 제목 맨 앞에 보이는 형태**를 권장합니다.
- 기능 문서는 `# 기능 보고서 — 주제`, 체크리스트는 `# AI 구현 체크리스트`를 권장합니다.
- 기존 문서는 원래 제목을 유지해도 되지만, 새 문서는 Stage 번호와 주제가 H1만 봐도 드러나게 쓰는 편이 좋습니다.

## 운영 원칙
- **현재 코드와 역사 문서는 다를 수 있습니다.** 비채택 실험은 보고서와 benchmark JSON로 남기되, 실제 런타임 코드에서는 제거할 수 있습니다.
- “현재 무엇이 구현돼 있는가”를 확인할 때는 개별 Stage 보고서보다 **runtime reference / checklist**를 먼저 봅니다.
- 최신 구현 보고서 진입점은 수동으로 허브에 고정하지 말고, **generated inventory**의 빠른 진입점을 기준으로 봅니다.
- Stage가 바뀌면 먼저 `stage-info.json`을 갱신하고, 그 다음 현재 런타임 문서와 생성 인벤토리를 동기화합니다.

## 인벤토리 / 동기화 점검 방법
```bash
node tools/docs/generate-report-inventory.mjs
node tools/docs/generate-report-inventory.mjs --check
node tools/docs/check-doc-sync.mjs
```

- 기본 실행: `report-inventory.generated.md`, `report-inventory.generated.json` 갱신
- `--check`: 생성 결과와 현재 파일이 다르면 non-zero 종료
- `check-doc-sync.mjs`: `stage-info.json`, README, runtime reference, checklist, generated inventory의 Stage 표기가 서로 맞는지 점검
