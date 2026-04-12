# Stage 118 - MCTS root-maturity gate causality closeout

## 배경

Stage 117까지의 strongest runtime candidate는 다음 조합이었다.

- gate mode: `best-metric-threshold`
- min visits: `10`
- best finite metric threshold: `3`
- solved child required absent: `true`
- min distinct finite metric count: `0`
- runtime switch: `legacy-root + rank -> per-player + pnmax`

fixed-iteration에서는 이 candidate가 target late lane을 거의 완벽하게 재현했지만,
Stage 117 시점의 time-budget 재검증은 **aggregate gain이 실제 gate activation에서 온 것인지**가 끝내 분명하지 않았다.

이번 Stage 118의 질문은 하나였다.

**gate activation이 실제로 base → target 출력 차이를 설명하는가?**

즉 aggregate exact-best / proven / score-loss가 아니라,
scenario-by-scenario로 다음을 직접 집계해야 했다.

- base와 target이 실제로 갈린 scenario 수
- 그 scenario들에서 runtime gate가 실제로 activation됐는지
- activation된 경우 runtime output이 target으로 이동했는지
- activation되지 않은 상태에서도 target과 같은 출력이 나오는지
- duplicate time-budget rerun에서 그 causal support가 안정적으로 재현되는지

## 이번 단계 목표

- strongest refined gate에 대해 activation-causal benchmark를 추가한다.
- fixed-iteration과 time-budget에서 causal support를 분리 집계한다.
- time-budget duplicate rerun까지 포함해 adoption 여부를 최종 판정한다.
- 더 시험할 PN/PPN 후보가 남는지 정리한다.

## 구현 내용

### 1. activation-causal 분석 도구 추가

새 도구를 추가했다.

- `tools/engine-match/analyze-mcts-root-maturity-gate-causality.mjs`

이 도구는 기존 runtime benchmark JSON을 읽어,
scenario마다 다음 signature를 비교한다.

- `bestMoveCoord`
- `score`
- `proven`
- `isExactResult`
- `rootSolvedOutcome`

그리고 다음 분류를 계산한다.

- `baseVsTargetDiffCount`
- `activationExplainsTargetShiftCount`
- `targetShiftWithoutActivationCount`
- `activationWithoutOutputChangeCount`
- `activationButRuntimeStillBaseCount`
- `activationButRuntimeDivergedFromBothCount`

즉 이제 root-maturity gate는 단순 aggregate가 아니라,
**실제 switch가 output shift를 만들었는지**로 판정할 수 있다.

### 2. causal analysis smoke 추가

- `js/test/stage118_mcts_root_maturity_gate_causality_analysis_smoke.mjs`

smoke는 synthetic benchmark JSON을 만들어,

- activation이 실제로 target shift를 설명한 경우
- activation 없이 target shift가 생긴 경우
- activation이 있었지만 출력은 그대로인 경우

를 모두 검증한다.

## 실험 설정

strongest candidate는 Stage 117과 같은 `v10` 설정을 그대로 사용했다.

- mode: `best-metric-threshold`
- `visits >= 10`
- `best finite metric <= 3`
- `solved child 없음`
- `distinct finite metric count` 제한 없음

비교 variant도 그대로 유지했다.

- `base`: `legacy-root + rank`
- `target`: `per-player + pnmax`
- `runtime-gate`: refined gate가 켜질 때만 base → target 전환

### fixed-iteration causal rerun

- empties: `12`
- iteration budget: `24`, `32`
- main `24 seed`
- holdout24a `24 seed`
- 총 `96 scenario`

### time-budget causal rerun A

- empties: `12`
- budgets: `200ms`, `280ms`
- main `24 seed`
- holdout24a `24 seed`
- 총 `96 scenario`

### time-budget duplicate rerun B

같은 조건을 한 번 더 반복해,
causal support가 stable한지 추가로 확인했다.

## 결과 요약

## 1. fixed-iteration에서는 gate가 바뀐 모든 scenario를 정확히 설명했다

`benchmarks/stage118_root_gate_causality_fixediter_summary_v10.json`

combined `96 scenario` 기준:

- gate activated: `50/96`
- base vs target changed: `5/96`
- activation explains target shift: `5/5`
- target shift without activation: `0/5`
- runtime vs target diff: `0/96`

즉 fixed-iteration에서는 strongest refined gate가
**실제로 필요한 scenario에서만 target shift를 만들었고,
바뀐 모든 scenario를 causal하게 설명했다.**

이 결과는 Stage 117의 “fixed-iteration target 재현”을 더 강한 형태로 확인한 셈이다.
이제는 단순히 aggregate가 같다는 수준이 아니라,
**base와 target이 갈린 5건 모두에서 runtime activation이 그 차이를 직접 만들었다**고 볼 수 있다.

## 2. time-budget rerun A에서는 좋아 보였지만, duplicate rerun B에서 무너졌다

### rerun A

`benchmarks/stage118_root_gate_causality_timebudget_summary_v10.json`

combined `96 scenario` 기준:

- gate activated: `50/96`
- base vs target changed: `4/96`
- activation explains target shift: `3/4`
- target shift without activation: `1/4`
- activation explains target shift rate among changed: `75.0%`

이 첫 rerun만 보면,
Stage 117 때보다 gate causal support가 더 좋아진 것처럼 보인다.

### duplicate rerun B

`benchmarks/stage118_root_gate_causality_timebudget_summary_v10_dup.json`

combined `96 scenario` 기준:

- gate activated: `50/96`
- base vs target changed: `7/96`
- activation explains target shift: `1/7`
- target shift without activation: `1/7`
- activation but runtime still base: `3/7`
- activation but runtime diverged from both: `2/7`
- activation explains target shift rate among changed: `14.3%`

같은 조건 duplicate run에서 causal support가 `75.0% -> 14.3%`로 급락했다.
즉 Stage 117의 의심대로,
**time-budget에서는 gate가 실제로 출력 차이를 만든 경우와 deadline noise / rollout variance가 섞여 있고,
그 비율 자체도 안정적으로 재현되지 않는다.**

## 3. duplicate 두 번을 합치면 causal support는 minority에 머문다

`benchmarks/stage118_root_gate_causality_timebudget_summary_bothruns_v10.json`

두 time-budget rerun을 합친 `192 scenario` 기준:

- gate activated: `100/192`
- base vs target changed: `11/192`
- activation explains target shift: `4/11`
- target shift without activation: `2/11`
- activation explains target shift rate among changed: `36.4%`

즉 pooled duplicate 기준으로도,
strongest refined gate는 time-budget에서 바뀐 scenario의 **절반도 설명하지 못했다.**

fixed-iteration에서는 causal support가 완전했지만,
time-budget duplicate까지 합치면 실제 default-adoption 판단에 필요한 robustness는 부족하다.

## 최종 판정

### 1. `mctsProofPriorityRootMaturityGateEnabled = true` 기본 승격

**미채택**

이유:

- fixed-iteration causal support는 `5/5`로 완전했다.
- 하지만 time-budget duplicate pooled causal support는 `4/11 = 36.4%`에 불과했다.
- 같은 candidate가 한 rerun에서는 `3/4`, 다른 rerun에서는 `1/7`만 설명해,
  adoption을 걸 만큼 안정적이지 않았다.

즉 strongest refined gate는
**선택적 runtime experiment로는 의미가 있지만,
현재 late lane의 전역 기본값으로 올리기에는 time-budget robustness가 부족하다.**

### 2. 남은 PN/PPN 후보 여부

이번 Stage 118을 끝으로,
현재 저장소에서 남아 있던 **“기존 late lane 위에서 metric/bias/gate만 더 조정해 보는 PN/PPN 후보”는 사실상 소진**됐다고 판단했다.

정리하면 다음 후보들은 모두 끝났다.

- proof-priority 범위 확장
- `per-player` generalized proof metric 기본 승격
- `pnmax` / `pnsum` bias formula 기본 승격
- time-budget-conditioned late-bias package
- root-maturity / proof-maturity gate runtime adoption

이제 같은 축에서 남은 일은 더 세밀한 retuning이 아니라,
새로운 구조적 아이디어가 있어야 한다.

예를 들면 다음은 여전히 별도 연구 주제로는 남을 수 있다.

- full PN/PPN lane 또는 subtree solver lane 분리
- transposition-aware PN graph / DFPN 계열
- score-bounded PN-MCTS 계열 재설계
- draw-aware final selector를 실제 solved-child 분포가 달라진 뒤 다시 검증

하지만 **현재 저장소의 지금 late lane을 기준으로 당장 더 테스트할 “유력한 다음 후보”는 없다**고 보는 편이 맞다.

## 이번 단계 결론

- activation-causal analysis 도구와 smoke는 **채택**
- strongest refined root-maturity gate의 기본값 승격은 **미채택**
- 현재 저장소에서 추가로 테스트할 PN/PPN retuning 후보는 **없음**
- 다음 단계는 **리팩토링 / 문서화 closeout**로 넘어간다

## 관련 산출물

- `tools/engine-match/analyze-mcts-root-maturity-gate-causality.mjs`
- `js/test/stage118_mcts_root_maturity_gate_causality_analysis_smoke.mjs`
- `benchmarks/stage118_root_gate_causality_fixediter_main24_v10.json`
- `benchmarks/stage118_root_gate_causality_fixediter_holdout24a_v10.json`
- `benchmarks/stage118_root_gate_causality_fixediter_summary_v10.json`
- `benchmarks/stage118_root_gate_causality_timebudget_main24_v10.json`
- `benchmarks/stage118_root_gate_causality_timebudget_holdout24a_v10.json`
- `benchmarks/stage118_root_gate_causality_timebudget_main24_v10_dup.json`
- `benchmarks/stage118_root_gate_causality_timebudget_holdout24a_v10_dup.json`
- `benchmarks/stage118_root_gate_causality_timebudget_summary_v10.json`
- `benchmarks/stage118_root_gate_causality_timebudget_summary_v10_dup.json`
- `benchmarks/stage118_root_gate_causality_timebudget_summary_bothruns_v10.json`
- `benchmarks/stage118_root_gate_causality_adoption_summary_20260412.json`
