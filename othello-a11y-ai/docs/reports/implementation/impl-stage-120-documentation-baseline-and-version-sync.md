# Stage 120 - 문서 기준선 정리와 버전 동기화

## 배경

Stage 119 보고서는 문서화 closeout를 선언했지만,
실제 저장소의 **현재 코드 기준 문서들끼리는 아직 미세한 어긋남**이 남아 있었다.

대표적으로 다음 문제가 있었다.

- `stage-info.json`은 Stage 119였는데, `docs/runtime-ai-reference.md` 스냅샷은 `Stage 117`,
  `docs/reports/checklists/ai-implementation-checklist.md` 스냅샷은 `Stage 98`로 남아 있었다.
- `docs/reports/README.md`의 빠른 진입점에는 여전히 `Stage 98` 구현 보고서가 고정 링크로 남아 있었다.
- 체크리스트 하단에는 여전히 `MCTS 및 방향이 다른 방법론은 범위 밖` 같은 오래된 문구가 남아 있어,
  현재 README/runtime reference가 설명하는 preset-aware MCTS 실험 lane과 충돌했다.

즉 다음 단계에서 `README + docs + js/ai + js/core` 전수조사를 하려면,
먼저 **문서 기준선 자체를 한 번 더 납작하게 정리**하는 편이 맞았다.

## 이번 단계의 목표

이번 Stage 120의 목표는 기능 추가가 아니라 다음 네 가지였다.

1. 저장소 Stage/version authority를 한 군데로 고정하기
2. 현재 코드 기준 문서 셋의 Stage 표기와 구조를 다시 맞추기
3. 보고서 허브에서 stale hardcoded 최신 링크를 줄이기
4. 다음 전수조사 단계에 바로 들어갈 수 있도록 카테고리 seed를 모아 두기

## 이번 단계에서 확정한 문서 기준선

이 Stage 120에서는 문서 기준을 다음처럼 고정했다.

- 저장소 stage/tag/updatedAt/summary의 단일 기준: `stage-info.json`
- 현재 코드 기준 문서 셋: 루트 `README.md`, `docs/runtime-ai-reference.md`, `docs/reports/checklists/ai-implementation-checklist.md`
- Stage별 채택/비채택 근거와 역사: `docs/reports/implementation/*`, `docs/reports/review/*`
- 최신 구현 보고서 진입점과 전체 문서 인덱스: `docs/reports/report-inventory.generated.md`, `docs/reports/report-inventory.generated.json`
- `package.json`은 Node ESM / 도구 실행용 최소 메타데이터 파일로만 유지하고,
  저장소 Stage/version authority로는 사용하지 않음

핵심은 **문서용 사람 친화 메타데이터와 도구용 Stage 메타데이터를 다시 `stage-info.json` 하나로 모은다**는 점이었다.

## 실제 수정 사항

### 1. 루트 README 정리

루트 `README.md`에는 다음을 반영했다.

- 현재 저장소 Stage를 명시하는 **저장소 메타데이터와 문서 기준선** 섹션 추가
- `stage-info.json`을 저장소 Stage/version authority로 명시
- `package.json`은 버전 authority가 아니라 도구용 최소 파일이라는 점 명시
- 테스트 진입점에 `node tools/docs/check-doc-sync.mjs`와 문서 인벤토리 check 명령 추가
- 주요 파일 구조에 `js/ai/search-algorithms.js`, `js/ai/mcts.js`, `tools/docs/*`를 더 명확히 반영

### 2. runtime reference 스냅샷 보정

`docs/runtime-ai-reference.md`에는 다음을 반영했다.

- 스냅샷의 저장소 현재 Stage를 현재 Stage로 동기화
- 기본 AI 모드(`classic`) 행 추가
- 문서 기준선/버전 기준 섹션 추가
- Stage 120 자체를 짧게 기록해, 이번 단계가 엔진 strength 변경이 아니라
  **문서 기준선 재정렬 단계**였음을 남김
- 검증 진입점에 문서 동기화 점검 명령 추가

### 3. reports 허브 구조 정리

`docs/reports/README.md`는 구조 자체를 다시 손봤다.

- stale한 `Stage 98` 고정 빠른 링크 제거
- 최신 구현 보고서는 정적 허브 문서가 아니라 **generated inventory의 빠른 진입점**을 기준으로 보도록 변경
- Stage 번호 자릿수 규칙을 `두 자리 권장`에서
  **실제 숫자를 그대로 쓰고 100+도 그대로 유지**하는 규칙으로 정리
- 제목 규칙도 실제 저장소 관례에 맞게 `Stage N - 주제` 계열을 허용하도록 완화
- 문서 인벤토리/동기화 점검 명령을 한곳에 모아 둠

### 4. 체크리스트 범위 재정렬

`docs/reports/checklists/ai-implementation-checklist.md`에는 다음을 반영했다.

- Stage 스냅샷을 현재 Stage로 갱신
- active MPC profile 항목을 현재 active profile 이름 기준으로 정리
- 기본 AI 모드(`classic`)와 실행 경로(worker 우선 / main-thread fallback) 항목 추가
- preset-aware AI mode selector,
  `mcts-lite / guided / hybrid`,
  solved-subtree lane,
  root exact continuation,
  proof telemetry,
  proof-priority,
  score-bounds experimental lane을 **현재 범위 안의 선택형 구현**으로 다시 분류
- 하단의 오래된 `MCTS 및 방향이 다른 방법론은 범위 밖` 문구를
  실제 범위 밖인 `PN/PPN full mode`, `transposition-aware MCTS graph`, `RAVE/AMAF` 쪽으로 좁힘
- 도구 섹션에 문서 동기화 점검 도구를 추가

### 5. 동기화 점검 도구 추가

이번 단계의 구조적 최적화는 수동 수정으로 끝내지 않았다.

다음 파일을 새로 추가했다.

- `tools/docs/check-doc-sync.mjs`
- `js/test/stage120_documentation_sync_smoke.mjs`

이 도구는 다음을 검사한다.

- `stage-info.json`의 현재 Stage/tag
- `README.md`
- `docs/runtime-ai-reference.md`
- `docs/reports/checklists/ai-implementation-checklist.md`
- `docs/reports/report-inventory.generated.md`
- `docs/reports/report-inventory.generated.json`

즉 이후 Stage에서 문서 Stage 표기가 다시 어긋나도,
**수동 눈검사만 하지 않고 명령으로 바로 확인**할 수 있게 했다.

## 이번 단계에서 바꾸지 않은 것

이번 Stage 120은 문서 기준선 정리 단계이므로,
런타임 엔진 strength나 알고리즘 자체는 바꾸지 않았다.

따라서 이번 단계에서는 다음을 하지 않았다.

- `js/ai/search-engine.js` hot path 변경
- `js/ai/mcts.js` late lane retuning
- `js/ai/evaluator.js` feature / cache 구조 변경
- `opening-book / opening-prior / tuning` 로직 변경
- `*.generated.js` 산출물 재생성

즉 **현재 Stage 120은 문서/메타데이터/점검 흐름 정리** 단계이지,
엔진 리팩토링 채택 단계가 아니다.

## 검증

이번 단계에서는 다음 명령으로 문서 동기화를 확인했다.

```bash
node tools/docs/generate-report-inventory.mjs
node tools/docs/check-doc-sync.mjs
node js/test/stage109_report_inventory_smoke.mjs
node js/test/stage120_documentation_sync_smoke.mjs
```

의도한 확인 포인트는 다음과 같았다.

- 새 Stage 구현 보고서가 inventory에 정상 반영되는가
- `stage-info.json`과 README/runtime reference/checklist/inventory가 같은 Stage를 가리키는가
- 생성 인벤토리 check smoke가 계속 통과하는가
- 새 문서 동기화 smoke가 정상 통과하는가

## 다음 단계용 사전 수집 자료 / 카테고리 seed

다음 전체 전수조사 단계에서 바로 사용할 수 있도록,
이번 Stage 120에서는 다음 카테고리 seed를 미리 묶어 두었다.

### A. classic search orchestration / exact tail

주요 파일:

- `js/ai/search-engine.js`
- `js/core/rules.js`
- `js/core/game-state.js`
- `js/core/bitboard.js`
- `js/ai/special-endings.js`

다음 단계에서 볼 질문:

- classic lane hot path에 아직 의미 있는 branch/lookup/copy 납작화 후보가 남아 있는가
- exact/WLD 경계, ordering precompute, TT reuse, pass/terminal 처리에서 테스트 후보가 남아 있는가
- special-ending safety net이 classic과 MCTS에서 중복 계산을 만들고 있지 않은가

### B. evaluator / profile compile / move-ordering path

주요 파일:

- `js/ai/evaluator.js`
- `js/ai/evaluation-profiles.js`

다음 단계에서 볼 질문:

- feature 계산 경로에 캐시/lookup/flattening 후보가 남아 있는가
- move-ordering lightweight eval과 tuple residual 접속부에서 분리 또는 병합 가치가 있는가
- generated profile consume 쪽에 dormant 또는 과도한 normalization이 남아 있는가

### C. opening subsystem

주요 파일:

- `js/ai/opening-book.js`
- `js/ai/opening-book-data.js`
- `js/ai/opening-prior.js`
- `js/ai/opening-tuning.js`

다음 단계에서 볼 질문:

- opening book / prior / hybrid tuning 사이에 lookup 중복이나 normalization 과잉이 남아 있는가
- contradiction veto / ordering bias / direct-use gate를 더 좁게 테스트할 후보가 있는가
- hash normalization / cache 경로에 자료구조 교체 가치가 있는가

### D. MCTS lane / proof-oriented late lane

주요 파일:

- `js/ai/mcts.js`
- `js/ai/search-engine.js`
- `js/ai/search-algorithms.js`

다음 단계에서 볼 질문:

- Stage 119에서 닫힌 refactor 후보 외에 아직 **테스트 가치가 남아 있는 작은 리팩토링**이 있는가
- proof telemetry / score-bounds / continuation / bias formula 주변에서 구조적 중복이 남아 있는가
- 옵션 해석 / mode gate / runtime handoff 표면 중 문서와 코드가 추가로 어긋나는 곳은 없는가

### E. worker / UI engine boundary

주요 파일:

- `js/ai/worker.js`
- `js/ui/engine-client.js`
- `js/ui/app-controller.js`
- `js/ui/settings-panel-view.js`

다음 단계에서 볼 질문:

- worker / main-thread fallback 사이 설정 주입이나 결과 요약 경로에 중복이 있는가
- custom/preset normalization과 UI 요약 생성이 불필요하게 갈라져 있는가
- serialization / message payload / fallback path에 테스트 후보가 남아 있는가

### F. tooling / benchmark / packaging / documentation support

주요 파일:

- `tools/engine-match/*`
- `tools/docs/*`
- `tools/package/*`
- `tests/*`

다음 단계에서 볼 질문:

- benchmark reproducibility와 time-budget noise 관리 측면에서 추가로 정리할 도구 후보가 있는가
- report inventory / doc sync automation을 더 확장할 가치가 있는가
- runtime/trainer package 구성과 현재 문서 설명 사이에 어긋남이 남아 있는가

## 범위 메모

다음 전수조사 단계에서도 다음 원칙은 유지한다.

- `*.generated.js`는 작성 코드가 아니라 학습/생성 도구 산출물이므로 **구현 리팩토링 범위에서 제외**한다.
- 다만 active profile 이름, metadata, runtime consume 경로를 검증할 때는
  현재 상태 참고용 읽기 범위에는 포함한다.

## 결론

Stage 120의 결론은 간단하다.

이번 단계의 목적은 새 strength 후보를 채택하는 것이 아니라,
다음 전수조사 단계가 혼선 없이 시작되도록 **문서 기준선과 Stage/version sync를 다시 고정하는 것**이었다.

이제 다음 단계에서는

- 문서 기준선은 `stage-info.json` + current-runtime docs로 고정되어 있고
- stale 최신 링크 문제도 줄였고
- 사전 카테고리 seed도 마련해 두었으므로,

README / docs / `js/ai` / `js/core` 전수조사를 바로 시작할 수 있다.
