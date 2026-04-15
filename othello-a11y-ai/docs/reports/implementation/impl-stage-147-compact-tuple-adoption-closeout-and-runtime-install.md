# Stage 147 - compact tuple adoption closeout, runtime install, and documentation finalization

## 요약
이번 단계의 목표는 Stage 126에서 다시 연 compact tuple relearning lane이 실제 active runtime 설치까지 끝난 뒤,
그 결과를 **현재 저장소 기준 문서로 정리하고**, 마지막으로 **필수/권장 수준의 리팩토링과 Stage 147 버전 동기화**까지 마무리하는 것이었습니다.

결론은 다음과 같습니다.

- **채택한 것**
  - Stage 144 confirmation → Stage 145 move-ordering compatibility replay → Stage 146 final adoption gate → Stage 147 install/post-adoption validation까지 이어진 compact tuple lane을 Stage 147 기준 implementation report로 문서화했습니다.
  - 현재 active runtime이 `diagonal-top24-latea-endgame-patched-calibrated` tuple residual과 `trained-move-ordering-linear-v2` ordering을 사용하는 상태임을 보고서/인벤토리 기준으로 명시했습니다.
  - Stage 144~147 engine-match 도구에서 반복되던 JSON I/O, cached subprocess 실행, throughput/head-to-head/search-cost 요약 유틸리티를 `tools/engine-match/lib-compact-tuple-adoption.mjs`로 분리했습니다.
  - `stage-info.json`, generated report inventory를 다시 맞춰 Stage 147을 문서 기준선으로 확정했습니다.
- **채택하지 않은 것**
  - broader regression 자체를 이번 단계에서 즉시 실행하는 것
  - Stage 144~147 decision logic까지 모두 하나의 거대한 generic runner로 합치는 대규모 재배선
  - release packaging 재생성이나 `dist/_staging/*` 재패키징
- **현재 기본 strength 변화**
  - 없습니다.
  - 이미 Stage 147 install/post-adoption validation에서 active runtime switch는 완료되었고, 이번 closeout은 그 결과를 믿고 읽을 수 있도록 **문서와 코드 구조를 정리하는 마감 단계**입니다.

## 현재 active runtime 상태
Stage 147 기준으로 현재 active generated module은 다음 구성을 사용합니다.

- evaluation: `balanced13-alllate-smoothed stability extras 0.90x`
- move-ordering: `trained-move-ordering-linear-v2`
- tuple residual: `diagonal-top24-latea-endgame-patched-calibrated`
- MPC: `balanced13-alllate-smoothed-stability-090__runtime-mpc`

설치 직전 active baseline은 다음 위치에 archive되어 있습니다.

- `tools/engine-match/fixtures/historical-installed-modules/active-precompact-tuple.learned-eval-profile.generated.js`

즉 compact tuple lane은 더 이상 후보가 아니라, **현재 active runtime의 일부로 설치된 상태**입니다.

## Stage 144~147 결과를 현재 문서 기준으로 정리하면
### 1. Stage 144 confirmation
Stage 126 weight-learning 산출물 가운데 최종 noisy confirmation까지 올릴 후보를 좁혔습니다.

- `diagonal-top24-latea-endgame`: primary line 유지
- `outer2-top24-lateb-endgame`: control line 유지

핵심은 **diagonal line이 noisy confirmation에서 탈락하지 않았다는 점**이었습니다.

### 2. Stage 145 move-ordering compatibility replay
`diagonal-top24-latea-endgame` tuple 위에서는 당시 active ordering(`candidateH2`)보다,
Stage 38 baseline ordering replay(`trained-move-ordering-linear-v2`)가 더 잘 맞는다는 결론이 나왔습니다.

즉 Stage 145의 실제 선택은

- tuple lane 유지
- ordering만 baseline replay로 회귀

였습니다.

### 3. Stage 146 final adoption gate
`diagonal-top24-latea-endgame + baseline ordering` stack이 paired self-play, throughput, depth/exact search-cost 게이트를 통과했습니다.

이 단계에서 판정은 `adopt-compact-tuple-runtime-switch`였고,
실제 설치 후보 generated module이 `benchmarks/stage146/selected-final-generated-module.js`로 고정됐습니다.

### 4. Stage 147 runtime install + post-adoption validation
Stage 146 selected module을 active runtime에 실제 설치했고,
archive된 previous-active baseline 대비 post-adoption validation까지 마쳤습니다.

결과적으로 compact tuple lane은 **실험 후보 → confirmation → compatibility replay → adoption gate → installed runtime** 순서를 모두 밟고 현재 기본값으로 닫혔습니다.

## 이번 단계에서 진행한 리팩토링
Stage 144~147 도구는 짧은 기간에 연속으로 추가되면서 다음 유틸리티가 파일마다 반복됐습니다.

- JSON 읽기/쓰기
- text write helper
- cached subprocess 실행 (`maybeRun`)
- variant spec 문자열 조립
- weighted average 계산
- throughput/head-to-head/search-cost 요약 helper

이번 closeout에서는 이 중 **정책/판정 로직과 무관한 공통 부분만** 분리했습니다.

### 새 공용 모듈
- `tools/engine-match/lib-compact-tuple-adoption.mjs`

### 분리한 것
- `readJson`, `writeJson`, `writeText`
- `maybeRun`
- `buildVariantSpecString`
- `slugForPair`, `allVariantPairs`
- `weightedAverage`
- `summarizeThroughputVariant`
- `summarizeHeadToHead`
- `summarizeDepth`, `summarizeExact`, `summarizeCombinedSearchCost`

### 그대로 둔 것
- Stage별 후보군 정의
- Stage별 adoption/compatibility/install 판정 함수
- Stage별 notes markdown 구성
- Stage별 fixture/output 경로와 smoke contract

즉 이번 리팩토링은 **중복 제거와 유지보수성 개선**이 목적이고,
Stage 144~147의 의사결정 의미론을 다시 일반화하거나 재설계하는 것은 의도적으로 하지 않았습니다.

## 문서화 마감 정리
이번 closeout으로 문서 허브의 공백도 메웠습니다.

이전까지 generated inventory의 최신 구현 보고서는 Stage 129에서 멈춰 있었지만,
이제 Stage 147 implementation report가 추가되어 다음이 맞춰집니다.

- `stage-info.json`
- `docs/reports/implementation/impl-stage-147-compact-tuple-adoption-closeout-and-runtime-install.md`
- `docs/reports/report-inventory.generated.md`
- `docs/reports/report-inventory.generated.json`

이제 문서 허브에서 compact tuple lane의 reopen부터 install closeout까지를
Stage 147 기준으로 한 번에 추적할 수 있습니다.

## broader regression 방향 (이번 단계에서는 실행하지 않음)
이번 단계에서는 broader regression을 실제로 돌리지 않았습니다.
다만 다음 release/package 정리 전에 권장하는 범위는 다음 정도로 제한하는 편이 좋습니다.

1. **core correctness / default runtime 회귀**
   - `core-smoke`, `perft`, Stage 83/86/123/143 기본 smoke
2. **active vs archived previous-active 비교 회귀**
   - depth / exact / throughput matrix를 compact tuple installed runtime과 previous-active archive 기준으로 다시 한 번 묶기
3. **opening/default/UI/worker fallback 회귀**
   - opening default revalidation smoke
   - settings cookie / dialog / worker fallback smoke
4. **tooling closeout 회귀**
   - Stage 144~147 suite smoke
   - report inventory / doc sync
   - trainer/package 쪽 `resume` / `force` / `plan-only` 동작 점검

핵심은 broader regression도 **현재 active runtime과 directly adjacent한 축만 좁게 묶어서** 실행하고,
compact tuple adoption lane과 무관한 오래된 실험 축까지 다시 넓히지 않는 것입니다.

## 검증
이번 closeout에서 최소한 다음을 다시 확인했습니다.

```bash
node tools/docs/check-doc-sync.mjs
node tools/docs/generate-report-inventory.mjs
node tools/docs/generate-report-inventory.mjs --check
node js/test/stage120_documentation_sync_smoke.mjs
node js/test/stage143_release_defaults_smoke.mjs
node js/test/stage144_compact_tuple_confirmation_suite_smoke.mjs
node js/test/stage145_move_ordering_compatibility_replay_smoke.mjs
node js/test/stage146_final_compact_tuple_adoption_gate_smoke.mjs
node js/test/stage147_runtime_install_post_adoption_validation_smoke.mjs
```

## 결론
Stage 147 closeout의 의미는 새 strength를 더 키운 데 있지 않습니다.

이번 단계는

1. compact tuple adoption lane이 실제 active runtime으로 끝났음을 Stage 147 보고서로 남기고,
2. Stage 144~147 도구 중복을 최소한으로 정리하며,
3. 생성 인벤토리 기준으로도 최신 구현 보고서가 Stage 147을 가리키게 만든

**문서화/리팩토링/버전 동기화 마감 단계**입니다.

즉 이제 저장소 기준선은
**“compact tuple lane은 채택과 설치가 끝난 현재 기본값이며, broader regression은 다음 release 정리 전에 좁게 수행할 후속 과제”**
로 읽으면 됩니다.
