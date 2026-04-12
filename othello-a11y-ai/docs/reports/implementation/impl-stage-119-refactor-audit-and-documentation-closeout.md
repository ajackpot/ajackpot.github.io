# Stage 119 - 리팩토링 감사와 문서화 마감 정리

## 배경

Stage 118에서 root-maturity gate causal audit까지 끝낸 결과,
현재 저장소 late lane에서 추가로 밀어 볼 PN/PPN retuning 후보는 사실상 소진됐다.

따라서 이번 단계의 질문은 다음으로 바뀌었다.

**이제 남은 권장/필수 수준의 리팩토링 후보가 실제로 있는가? 있다면 적용할 가치가 있는가?**

사용자 요청 범위는 다음을 포함했다.

- 재사용 가능한 코드 정리
- 모듈화 / 추상화
- 중복 기능 병합 또는 분리
- 자료구조 선택 재검토(`array / map / set / object / json / BigInt / ArrayBuffer` 등)
- 실제 성능 병목이 있으면 해결되는지 검증

## 감사 범위

이번 Stage 119에서는 다음 영역을 집중적으로 다시 봤다.

1. `js/ai/mcts.js`
   - proof-priority ranking hot path
   - root-maturity gate evaluator
   - finite proof metric 요약 경로
2. `js/ai/search-engine.js`
   - proof telemetry export / summary 결합부
3. `tools/engine-match/*`
   - 새 Stage 118 causal analysis 도구가 기존 benchmark 흐름과 잘 맞는지
4. 문서 / inventory / stage metadata
   - Stage 118 closeout 후 현재 기본 런타임 설명이 실제 코드와 맞는지

## 이번 단계에서 실제로 검토한 리팩토링 후보

### 후보 A - proof-priority finite metric 정리 리팩토링

가장 먼저 본 후보는 `js/ai/mcts.js`의 proof-priority 주변이었다.

문제의식은 다음과 같았다.

- root-maturity gate evaluator가 solved child / finite metric / distinct metric을 보기 위해
  배열 생성과 추가 순회를 수행한다.
- proof-priority ranking도 child metric 정렬 뒤 rank assignment와 finite metric 집계를 따로 한다.
- 따라서 이 둘을 helper로 합치고,
  finite metric min/max/sum / distinct count를 single-pass로 정리하면
  late-lane wall time을 조금 줄일 수 있을 가능성이 있었다.

즉 이 후보의 목표는

- 중복 finite-metric logic을 helper로 재사용 가능하게 만들고
- hot path 임시 배열 할당을 줄이며
- fixed-iteration late-lane throughput을 조금이라도 개선하는 것

이었다.

### 후보 B - per-player proof number 자료구조 전환

`{ black, white }` object를 2-slot array나 typed array로 바꾸는 방안도 다시 검토했다.

하지만 이번 단계에서는 적용하지 않았다.

이유:

- 파급 범위가 Stage 105~118의 telemetry / result export / UI summary 전체로 넓다.
- 현재 late-lane에서 이 구조 변경이 확실한 wall-clock gain을 줄지 근거가 아직 부족하다.
- 자료구조 churn에 비해 리스크가 크다.

즉 이번 closeout 단계에서 필요한 수준의 후보는 아니라고 판단했다.

### 후보 C - search-engine telemetry 대정리

telemetry export 쪽은 여전히 길지만,
이는 성능 병목이라기보다 **표면 복잡도** 문제에 가깝다.

그리고 Stage 118에서 이미 PN/PPN retuning 후보를 닫아 버렸기 때문에,
지금 telemetry API를 크게 흔드는 것은 documentation closeout 직전에 unnecessary churn을 늘릴 가능성이 높았다.

따라서 이번 단계에서는 cosmetic 대정리는 보류했다.

## 실제로 시도한 리팩토링과 결과

## 1. finite metric 정리 리팩토링은 wall time이 악화되어 채택하지 않았다

후보 A는 scratch refactor로 실제 구현까지 해 보았다.
핵심은 다음이었다.

- proof-priority ranking에서 finite metric min/max/sum을 별도 배열 없이 정리
- root-maturity gate evaluator에서 solved child / finite metric / distinct metric을 helper로 묶기
- 관련 경로를 single-pass style로 납작하게 만드는 것

그 다음 extracted Stage 117 baseline과 scratch refactor를 **같은 호스트에서 같은 benchmark tool**로 다시 비교했다.

### 비교 설정

- 도구: `tools/engine-match/benchmark-mcts-root-maturity-gate-runtime.mjs`
- mode: `fixed-iterations`
- empties: `12`
- iteration budgets: `24`, `32`
- main `24 seed`
- holdout24a `24 seed`
- 비교 대상
  - baseline control: extracted Stage 117 repo
  - current candidate: scratch refactor branch

핵심은 fixed-iteration이라서,
iteration 수가 같고 scenario output이 같은 상태에서 **average elapsed wall time**만 비교할 수 있다는 점이었다.

### main 24 결과

`benchmarks/stage119_root_gate_refactor_fixediter_main24_stage117baseline_control.json` vs
`benchmarks/stage119_root_gate_refactor_fixediter_main24_v2.json`

- `base`
  - average elapsed `182.29ms -> 193.90ms` (`+11.60ms`)
- `target`
  - average elapsed `178.23ms -> 188.44ms` (`+10.21ms`)
- `runtime-gate`
  - average elapsed `178.98ms -> 184.31ms` (`+5.33ms`)
- scenario signature diff: `0`

### holdout24a 결과

`benchmarks/stage119_root_gate_refactor_fixediter_holdout24a_stage117baseline_control.json` vs
`benchmarks/stage119_root_gate_refactor_fixediter_holdout24a_v2.json`

- `base`
  - average elapsed `186.69ms -> 191.38ms` (`+4.69ms`)
- `target`
  - average elapsed `183.75ms -> 185.92ms` (`+2.17ms`)
- `runtime-gate`
  - average elapsed `182.92ms -> 187.71ms` (`+4.79ms`)
- scenario signature diff: `0`

즉 이 scratch refactor는

- 출력은 완전히 같았지만
- fixed-iteration wall time은 main / holdout 모두에서 **악화**됐다.

따라서 이번 후보는 **채택하지 않고 되돌렸다.**

## 2. 최종 저장소에는 regressive engine refactor를 남기지 않았다

Stage 119의 중요한 결론은 단순히 “후보가 실패했다”가 아니라,
**실패한 refactor를 최종 코드에 남기지 않았다**는 점이다.

즉 현재 최종 저장소의 engine hot path는

- Stage 117 runtime late lane 기본값
- Stage 118 causal analysis tooling 추가
- Stage 119 documentation closeout

상태이고,
proof-priority finite metric consolidation scratch refactor는 **최종 채택되지 않았다.**

## 최종 판단

### 채택한 것

- Stage 118 causal analysis tooling / smoke / 보고서 정리
- Stage 119 refactor audit / benchmark summary / 문서 정리
- runtime reference와 report inventory 최신화

### 채택하지 않은 것

- proof-priority finite metric consolidation hot-path refactor
- per-player proof number 자료구조의 array / typed-array 전환
- search-engine telemetry API 대정리

## 이번 단계의 의미

이 Stage 119는 “큰 구조 변경을 더 해야 한다”는 결론이 아니라,
오히려 **현재 저장소 기준으로 권장/필수 수준의 engine refactor는 더 이상 없다**는 결론에 가깝다.

- 추가 PN/PPN retuning 후보는 Stage 118에서 닫혔다.
- engine hot-path refactor 후보는 실제 benchmark로 검증했더니 오히려 느려졌다.
- 자료구조 전면 교체나 telemetry 대정리는 지금 시점에 churn 대비 이득이 부족하다.

따라서 이번 작업은 여기서 문서화까지 마감하는 편이 맞다.

## 관련 산출물

- `benchmarks/stage119_root_gate_refactor_fixediter_main24_stage117baseline_control.json`
- `benchmarks/stage119_root_gate_refactor_fixediter_holdout24a_stage117baseline_control.json`
- `benchmarks/stage119_root_gate_refactor_fixediter_main24_v2.json`
- `benchmarks/stage119_root_gate_refactor_fixediter_holdout24a_v2.json`
- `benchmarks/stage119_refactor_audit_summary_20260412.json`
