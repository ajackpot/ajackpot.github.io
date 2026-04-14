# Stage 129 - 설정 UI 리팩토링과 문서화 마감 정리

## 요약
이번 단계의 목표는 Stage 127~128에서 도입한 설정 대화상자 / 설정 쿠키 / 오프닝 tie-break 토글까지 포함해,
마지막으로 **UI 코드 구조를 한 번 더 정리하고 Stage/version 문서를 동기화한 뒤 마감**하는 것이었습니다.

결론은 다음과 같습니다.

- **채택한 것**
  - 대화상자 열기/닫기 공용 유틸리티를 `js/ui/dialog-utils.js`로 분리했습니다.
  - 탐색 계열별 설정 대화상자 노출 규칙과 안내 문구를 `js/ui/settings-search-algorithm-presentations.js`로 분리했습니다.
  - `SettingsPanelView` 안의 중복 분기와 중복 이벤트 핸들러를 줄였습니다.
  - README / runtime reference / checklist / generated inventory / `stage-info.json`을 Stage 129 기준으로 다시 맞췄습니다.
  - 새 presentation helper를 직접 검증하는 Stage 129 smoke test를 추가했습니다.
- **채택하지 않은 것**
  - 설정 패널을 여러 개의 DOM sub-view 클래스로 더 쪼개는 큰 구조 변경
  - 설정 UI를 framework-style state container로 바꾸는 대규모 재배선
  - `dist/_staging/*` 같은 기존 생성 산출물을 이번 단계에서 다시 패키징하는 작업
- **기본 strength 변화**
  - 없습니다.
  - 이번 Stage 129는 사용자 노출 기본값을 더 강하게 바꾸는 단계가 아니라,
    **이미 도입된 설정 UI/설정 의미론을 더 유지보수하기 쉬운 형태로 정리하는 closeout stage**입니다.

## 왜 리팩토링이 필요했는가
Stage 127~128까지의 설정 UI는 기능적으로는 이미 동작했지만,
유지보수 관점에서 두 가지 중복이 분명했습니다.

1. **대화상자 공통 동작 중복**
   - `SettingsPanelView`
   - `AppController`

   두 파일이 각각 `isDialogOpen/openDialog/closeDialog`를 따로 들고 있었습니다.
   기능은 같지만 수정 지점이 두 군데라 drift 위험이 있었습니다.

2. **탐색 계열별 노출 규칙/안내 문구 중복**
   - 난이도 상세 설정의 visible group 계산
   - 난이도 상태 안내 문구
   - 스타일 상태 안내 문구
   - 검색 계열 설명의 style suppression note

   이 로직이 `SettingsPanelView` 안 여러 함수에 흩어져 있어,
   예를 들어 `mcts-lite` 문구를 하나 바꾸면 여러 곳을 같이 수정해야 했습니다.

이번 단계의 핵심은 바로 이 두 중복을 줄이는 것이었습니다.

## 실제 적용한 리팩토링

### 1) 대화상자 공용 유틸리티 분리
새 파일 `js/ui/dialog-utils.js`를 추가해 다음을 공용화했습니다.

- `isDialogOpen()`
- `openDialog()`
- `closeDialog()`
- `focusFirstEnabledDialogControl()`

이제
- 설정 상세 대화상자
- 수동 착수 입력 대화상자

모두 같은 대화상자 열기/닫기 기준을 공유합니다.
특히 `showModal()` 지원 여부와 `open` attribute fallback을 한 곳에서 관리하게 되어,
나중에 dialog fallback을 더 조정해야 할 때 수정 지점이 줄었습니다.

### 2) 탐색 계열별 UI presentation 규칙 분리
새 파일 `js/ui/settings-search-algorithm-presentations.js`를 추가했습니다.
이 파일은 다음 질문에 대한 답을 한 곳에 모읍니다.

- 현재 탐색 계열에서 난이도 상세 설정에 어느 fieldset을 보여 줄 것인가?
- 현재 탐색 계열에서 난이도 상태 안내를 어떻게 읽을 것인가?
- 현재 탐색 계열에서 style suppression note가 필요한가?
- 현재 탐색 계열에서 스타일 상세 설정 문구를 어떻게 보여 줄 것인가?

이전에는 `SettingsPanelView` 안에 같은 분기(`classic / lite / guided / hybrid`)가 여러 함수로 반복됐지만,
이제는 helper가 반환하는 presentation 정보를 사용하도록 정리했습니다.

이 변경의 장점은 다음과 같습니다.

- guided/hybrid/lite 문구 drift 방지
- 노출 group과 상태 안내 문구의 의미 일치
- 후속으로 새 탐색 계열을 추가할 때 수정 지점 축소
- presentation-only 로직의 독립 smoke test 가능

### 3) SettingsPanelView의 작은 정리
`SettingsPanelView`에는 기능 변경 없이 다음 정리를 넣었습니다.

- `input` / `change` 이벤트의 동일한 처리 경로를 `handleSettingsFormMutation()`으로 합침
- 설정 대화상자 open 시 첫 enabled control focus를 dialog helper로 통일
- 난이도/스타일 상태 note와 dialog presentation sync를 helper 호출로 단순화

즉 Stage 127~128 기능은 그대로 두고,
**“기능은 유지하되 내부 branching과 중복 호출을 줄이는 방향”**으로만 손봤습니다.

## 문서 / 버전 마감 정리
이번 단계에서는 `stage-info.json`을 다음 기준으로 다시 갱신했습니다.

- `stage = 129`
- `tag = stage129`
- `label = Stage 129`
- `updatedAt`, `summary` 갱신

그리고 여기에 맞춰 다음 문서들을 동기화했습니다.

- 루트 `README.md`
- `docs/runtime-ai-reference.md`
- `docs/reports/checklists/ai-implementation-checklist.md`
- generated report inventory (`.md`, `.json`)

문서 내용에서도 이번 설정 UI 정리의 실제 현재 상태가 드러나도록 보강했습니다.

- guided/hybrid는 더 이상 UI에서 experimental 문구를 붙이지 않는다는 점
- `mcts-lite`만 스타일 미적용 경고가 남는다는 점
- 사용자 지정 난이도/스타일이 detail dialog 중심으로 노출된다는 점
- 설정 쿠키 저장/자동 복원/초기화가 현재 UI 표면에 포함된다는 점
- 오프닝 tie-break 무작위 선택 토글이 custom 난이도 표면에 있다는 점

## 검증
이번 단계에서 최소한 다음을 다시 확인했습니다.

```bash
node js/test/stage126_custom_setting_groups_smoke.mjs
node js/test/stage126_search_engine_custom_style_support_smoke.mjs
node js/test/stage127_settings_cookie_smoke.mjs
node js/test/stage128_opening_tie_randomization_smoke.mjs
node js/test/stage128_classic_depth_gate_smoke.mjs
node js/test/stage129_settings_ui_presentation_smoke.mjs
node js/test/stage120_documentation_sync_smoke.mjs
node tools/docs/generate-report-inventory.mjs --check
python3 tests/ui_smoke.py
python3 tests/settings_cookie_smoke.py
python3 tests/virtual_host_smoke.py
```

## 결론
Stage 129는 새 strength feature를 더 넣는 단계가 아니라,
이미 도입된 설정 기능을 다음 작업에서도 덜 헷갈리게 유지할 수 있도록
**UI presentation 규칙과 dialog 동작을 정리하고, Stage/version 문서를 다시 맞춘 마감 단계**입니다.

즉 이번 단계의 가치는 “기능 추가”보다
**설정 UI를 더 안전하게 유지보수할 수 있는 구조와, 지금 저장소 상태를 바로 믿고 읽을 수 있는 문서 기준선**을 만든 데 있습니다.
