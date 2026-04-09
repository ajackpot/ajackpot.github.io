# 구현/검토 보고서 허브

이 디렉터리는 구현 이력, 실험/검토 문서, 현재 상태 체크리스트를 모아 두는 문서 허브입니다.
현재 코드 기준 설명은 루트 `README.md`와 `../runtime-ai-reference.md`에서 보고, 여기서는 **Stage별 근거와 역사**를 추적합니다.

## 빠른 진입점
- [현재 AI 런타임 레퍼런스](../runtime-ai-reference.md)
- [AI 구현 체크리스트](checklists/ai-implementation-checklist.md)
- [생성된 리포트 인벤토리](report-inventory.generated.md)
- [Stage 87 구현 보고서 — 런타임 문서 정리 마감](implementation/impl-stage-87-runtime-documentation-closeout.md)

## 디렉터리 규칙
- `implementation/`: 실제 코드 변경이 반영된 구현 보고서
- `review/`: 실험, 검토, 채택/비채택 판단 문서
- `features/`: 특정 기능 단위의 보충 설계/통합 문서
- `checklists/`: 현재 구현 상태를 빠르게 확인하는 운영 체크리스트
- `templates/`: 새 보고서를 작성할 때 시작점으로 쓰는 템플릿

## 파일명 규칙
- 전부 **소문자 kebab-case**를 사용합니다.
- Stage 번호가 있는 문서는 두 자리 번호를 권장합니다.
- 권장 패턴:
  - 구현: `impl-stage-03-search-engine-comparison-and-optimization.md`
  - 검토: `review-stage-09-exact-window-late-ordering-profile-redesign.md`
  - 체크리스트: `ai-implementation-checklist.md`

## 제목 규칙
- 구현: `# 구현 보고서 Stage 03 — 주제`
- 검토: `# 검토 보고서 Stage 09 — 주제`
- 기능: `# 기능 보고서 — 주제`
- 체크리스트: `# AI 구현 체크리스트`

기존 문서는 원래 제목을 유지해도 되지만, 앞으로 추가되는 문서는 위 형식을 권장합니다.

## 운영 원칙
- **현재 코드와 역사 문서는 다를 수 있습니다.** 비채택 실험은 보고서와 benchmark JSON로 남기되, 실제 런타임 코드에서는 제거할 수 있습니다.
- “현재 무엇이 구현돼 있는가”를 확인할 때는 개별 Stage 보고서보다 **runtime reference / checklist**를 먼저 봅니다.
- 전체 문서 목록과 최신 Stage 분포는 수동 목록 대신 **generated inventory**를 기준으로 봅니다.

## 인벤토리 갱신 방법
```bash
node tools/docs/generate-report-inventory.mjs
node tools/docs/generate-report-inventory.mjs --check
```

- 기본 실행: `report-inventory.generated.md`, `report-inventory.generated.json` 갱신
- `--check`: 생성 결과와 현재 파일이 다르면 non-zero 종료
