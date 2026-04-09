# Stage 38 — stage metadata 정리와 move-ordering 학습 방향 결정

## 요약
이번 단계의 결론은 두 가지다.

1. **프로필 이름/버전 메타데이터는 stage 기준으로 통일한다.**
   - `v1`, `v2` 증분 이름은 폐기한다.
   - repo 루트의 `stage-info.json`을 기준으로 기본 프로필 이름을 자동 생성한다.
   - 기본 evaluation profile 이름: `trained-phase-linear-stage38`
   - 기본 move-ordering profile 이름: `trained-move-ordering-stage38`
   - 생성되는 JSON과 generated module에는 top-level `stage` 메타데이터를 함께 남긴다.

2. **현재 move-ordering 가중치 학습 파이프라인은 추가 장시간 재학습 대상으로 보지 않는다.**
   - 이유는 feature 몇 개가 빠졌기 때문만이 아니라, 목적 함수 자체가 “좋은 수의 값 회귀” 쪽에 더 가깝고, “컷을 빨리 내는 정렬”과 직접 일치하지 않기 때문이다.
   - 따라서 현 파이프라인으로 또다시 수십 분~수시간을 들여 가중치를 만들기보다, 먼저 실제 검색 비용 기준의 audit를 거치는 것이 맞다.

## 판단 근거
현재 late move-ordering trainer는 다음 성질을 가진다.

- root teacher search의 analyzed move score를 child-state feature에 회귀한다.
- target은 root-centered(`root-mean`)로 보정되지만, 여전히 “move value ranking”에 가깝다.
- 반면 실제 alpha-beta의 move ordering 목적은 **노드 수를 줄이고 cutoff를 앞당기는 것**이다.

즉,

- value ranking이 좋아도 search cost가 좋아진다는 보장은 없고,
- 특히 exact / near-exact Othello에서는 `fastest-first`, TT move, killer/history, pass/corner-reply 회피 같은 **탐색 맥락 신호**가 큰 비중을 차지한다.

현재 런타임도 learned move-ordering만으로 정렬하지 않는다. 실제 ordering score는 다음 합성 구조다.

- TT move / corner / book / killer / history
- positional / flip / risk penalty
- opponent mobility penalty / opponent corner reply penalty / pass bonus / region parity bonus
- 마지막에 learned lightweight ordering evaluator

따라서 learned move-ordering JSON만 따로 더 정교하게 만들어도, 그 이득은 제한적일 수 있다. 이 점을 먼저 실제 nodes/time 기준으로 검증해야 한다.

## 코드 변경 사항
### 1. stage metadata 파일 추가
- `stage-info.json` 추가
- 현재 stage를 파일에 저장하고, 학습 도구가 이를 읽어 기본 프로필 이름과 메타데이터를 생성하도록 변경

### 2. lib.mjs 기본 이름/메타데이터 정리
- `defaultEvaluationProfileName()`
- `defaultMoveOrderingProfileName()`
- `loadStageInfo()`
- `buildProfileStageMetadata()`

이제 기본 이름은 hard-coded `v1`, `v2`가 아니라 stage 파일을 따른다.

### 3. profile builder / generated module 정리
- evaluation profile builder와 move-ordering profile builder가 top-level `stage` 메타데이터를 포함하도록 변경
- generated module 정규화 시에도 `stage` 메타데이터를 보존하도록 수정

### 4. move-ordering search-cost audit 도구 추가
새 도구:

- `tools/evaluator-training/audit-move-ordering-search-cost.mjs`
- `tools/evaluator-training/audit-move-ordering-search-cost.bat`

이 도구는 다음 variant를 실제 검색 비용으로 비교할 수 있다.

- `legacy` : learned move-ordering 비활성화
- `full` : 현재 learned move-ordering 전체
- `no-edgePattern`
- `no-cornerPattern`
- `no-mobility`
- `no-cornerAdjacency`
- `no-discDifferential`
- `no-parity`

즉, value 회귀 지표가 아니라 **실제 nodes/time** 기준으로 어떤 feature가 도움이 되는지 먼저 본다.

### 5. 문서/패키지 반영
- `tools/evaluator-training/README.md`에 stage naming 규칙 추가
- README에 “현재 move-ordering trainer는 실험/진단용”이라는 판단과 search-cost audit 우선순위를 명시
- 패키지 프로필에 `stage-info.json` 포함

## 최종 결론
### evaluation profile
계속 진행 가치가 있다.

- 학습 데이터 기반 phase evaluator는 실제 search cost와 실전 성적 개선이 이미 확인된 방향이다.
- 따라서 evaluation profile 쪽은 stage38 이후에도 계속 고도화 대상으로 본다.

### move-ordering profile
**현재 방식으로는 잠정 동결한다.**

정확한 표현은 다음과 같다.

- “완전히 폐기”까지는 아니다. exact/near-exact 일부 구간에서 소폭 이득이 있을 수 있다.
- 하지만 **새로운 장시간 재학습을 계속 돌릴 대상도 아니다.**
- 지금 필요한 것은 새 가중치 생산이 아니라, **search-cost audit를 통해 실제로 어느 feature가 도움이 되는지 먼저 검증하는 절차**다.

따라서 stage38 시점의 운영 지침은 다음과 같다.

1. phase evaluator 학습/검증은 계속 진행
2. move-ordering 가중치는 현재 파이프라인으로 추가 재학습하지 않음
3. move-ordering 개선이 필요하면 먼저 `audit-move-ordering-search-cost` 실행
4. 그 결과가 분명히 좋을 때만, 이후에 search-cost / cutoff-aware 목적 함수로 새 파이프라인을 설계

즉, stage38의 결론은 **“move-ordering 학습을 더 돌리자”가 아니라 “지금 방식의 재학습은 멈추고, 먼저 search-cost audit로 설계를 재판정하자”** 이다.

## Addendum (2026-03-29) — candidateB 채택과 더 넓은 검증

이후 search-cost audit와 candidate screening을 실제로 진행한 결과, Stage 38의 move-ordering 결론은 “파이프라인 장시간 재학습 보류” 자체는 유지하되, **현 가중치에서 search-cost 기준으로 수동 조정한 candidateB는 active profile로 채택 가능**하다는 쪽으로 업데이트되었다.

채택한 profile:
- `stage38-candidateB-mob0-10-12-fallback13-14`

핵심 조정:
- child empties `10-12`에서 learned `mobility = 0`
- child empties `13-14` trained bucket 제거 → runtime fallback/legacy ordering 사용

채택 후 wider validation(roots identical, seeds `1..24`) 결과:
- depth nodes: previous active baseline 대비 `-0.12%`
- exact nodes: previous active baseline 대비 `-2.56%`
- combined nodes: previous active baseline 대비 `-1.77%`
- exact root best move agreement vs previous active baseline: `96/96`
- depth root best move agreement vs previous active baseline: `120/120`

즉, Stage 38의 최종 운영 지침은 다음과 같이 정리된다.

1. move-ordering trainer의 목적 함수 자체는 search-cost / cutoff-aware 재설계 전까지 장시간 재학습 대상으로 보지 않는다.
2. 그러나 search-cost audit로 검증된 **수동 파생 candidate는 active profile로 채택할 수 있다.**
3. 현재 active move-ordering profile은 `candidateB`이며, 다음 실험 후보는 `discDifferential` 추가 완화 여부다.



## Addendum (2026-03-29) — candidateC 채택과 파생 variant stage metadata 정정

후속 실험에서 active `candidateB`에 대해 `discDifferential`을 추가로 완화한 `candidateC`를 스크리닝했다.

채택한 profile:
- `stage38-candidateC-disc0-10-12`

핵심 조정:
- active `candidateB`의 남은 trained bucket 중 child empties `10-12`에서만 `discDifferential = 0`
- child empties `15-18` 쪽 `discDifferential`은 유지

채택 근거:
- 4-seed screening에서 `discDifferential@10-12=0`이 active 대비 exact nodes `-1.16%`를 기록했고 depth nodes는 동일했다.
- 24-seed wider validation에서도 depth nodes는 active와 완전히 동일했고, exact nodes는 `760,707 -> 759,187`로 추가 `-0.20%` 개선됐다.
- active `candidateB` 대비 wider validation의 root output agreement는 depth `120/120`, exact `96/96`로 완전 일치였다.

또한 이번 단계에서 `make-move-ordering-variant.mjs`의 stage metadata를 정정했다. 이전에는 파생 candidate JSON이 base profile의 `stage.status=active-*`를 그대로 물려받을 수 있었는데, 이제 파생 variant는 명시적으로 `stage.status = derived-variant`를 기록한다.

따라서 Stage 38의 현재 active move-ordering profile은 다음과 같이 갱신된다.

- 기존 active: `stage38-candidateB-mob0-10-12-fallback13-14`
- 현재 active: `stage38-candidateC-disc0-10-12`

이 addendum 이후의 운영 지침은 다음과 같다.

1. move-ordering trainer의 장시간 재학습 보류 방침은 유지한다.
2. search-cost audit로 검증된 미세 조정 candidate는 계속 채택 가능하다.
3. 현재 active profile은 `candidateC`이며, 이후에는 추가 수동 미세조정보다 search-cost-aware trainer 설계로 복귀하는 편이 더 자연스럽다.
