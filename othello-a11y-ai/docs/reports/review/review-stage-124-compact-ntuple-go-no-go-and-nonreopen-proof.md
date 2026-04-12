# 검토 보고서 Stage 124 — compact systematic short n-tuple additive lane 착수 여부와 비재개 lane 근거 정리

## 목적

이번 단계의 목표는 두 가지였습니다.

1. `compact systematic short n-tuple additive lane`를 **지금 실제로 다시 열 가치가 있는지** 판단한다.
2. 이전 단계에서 보류/제외했던 다음 lane들이 **현재 Stage 123 런타임 기준으로는 사실상 옆그레이드·다운그레이드이거나, 적어도 지금 다시 여는 것이 비효율적**이라는 점을 현재 코드/문서/외부 문헌 기준으로 다시 증명해 보고서로 남긴다.

대상 lane은 다음 다섯 가지입니다.

- 추가 MCTS late-lane retuning
- move-ordering 재튜닝
- 전통적 수작업 evaluator 확장
- 5–6 empties micro-specialization 추가 확대
- special-ending 추가 확장

사용자 요청대로, 위 다섯 lane 전체를 통째로 닫는 것이 목적은 아닙니다.
이번 단계에서는 **세부적으로 남아 있을 수 있는 숨은 필수/권장 후보가 정말 없는지도 다시 확인**했습니다.

## 조사 범위

### 내부 근거

- `README.md`
- `docs/runtime-ai-reference.md`
- `docs/reports/checklists/ai-implementation-checklist.md`
- `docs/reports/review/review-stage-13-traditional-evaluator-audit.md`
- `docs/reports/review/review-stage-23-specialized-few-empties-exact-solver.md`
- `docs/reports/review/review-stage-120-ai-core-full-survey-and-step3-candidates.md`
- `docs/reports/implementation/impl-stage-45-move-ordering-replay-and-next-lane-decision.md`
- `docs/reports/implementation/impl-stage-84-exact-micro-solver-threshold-extension.md`
- `docs/reports/implementation/impl-stage-98-special-ending-wrapup-and-regression-suite.md`
- `docs/reports/implementation/impl-stage-118-mcts-root-maturity-gate-causality-closeout.md`
- `docs/reports/implementation/impl-stage-119-refactor-audit-and-documentation-closeout.md`
- `benchmarks/stage52/stage52_tuple_lane_closeout_summary.md`
- `benchmarks/stage69_followup_decision.md`
- `benchmarks/stage84_exact_micro_solver_threshold_summary.json`
- `benchmarks/stage98_special_ending_regression_summary.json`
- `benchmarks/stage124/stage124_tuple_layout_candidate_size_summary.json`
- `benchmarks/stage124/stage124_compact_tuple_go_no_go_and_lane_status_summary_20260412.json`
- `dist/package-size-analysis.json`

### 코드 / 도구 확인

- `js/ai/evaluation-profiles.js`
- `js/ai/evaluator.js`
- `js/ai/search-engine.js`
- `js/ai/mcts.js`
- `js/ai/special-endings.js`
- `js/core/*`
- `tools/evaluator-training/README.md`
- `tools/evaluator-training/TOOL_INDEX.md`
- `tools/evaluator-training/run-multi-candidate-training-suite.mjs`
- `tools/evaluator-training/run-tuple-patch-suite.mjs`
- `tools/evaluator-training/run-tuple-layout-family-pilot.mjs`
- `tools/evaluator-training/estimate-tuple-layout-candidate-sizes.mjs`

또한 `js/ai`, `js/core` 경로에는 `TODO/FIXME/HACK`류의 소스 주석이 남아 있는지도 다시 확인했습니다.

## 현재 기준선 요약

현재 런타임은 다음 상태입니다.

- active evaluation profile: `trained-phase-linear-v1`
- active move-ordering profile: `stage44-candidateH2-edgePattern125-cornerPattern125-11-12`
- active tuple residual profile: `top24-retrain-retrained-calibrated-lateb-endgame`
- active MPC profile: `trained-mpc-overlap-8bucket-high-tight`
- exact micro-solver 기본 threshold: `6`
- special-ending safety net: root scout + internal immediate wipeout guard + MCTS root threat penalty 활성

현재 active tuple residual은

- layout: `orthogonal-adjacent-pairs-outer2-v1-patched-patched`
- tuple 수: `24`
- tuple 길이: 모두 `2`
- 총 ternary table size: `216`
- 적용 bucket: `late-b`, `endgame`

입니다.

즉 현재 저장소는 이미 **작은 size-2 tuple residual**을 실전 런타임에 넣고 있지만,
그 범위는 매우 제한적이며 bucket도 late-b/endgame 중심으로 좁게 사용하고 있습니다.

## 외부 문헌 재확인 요약

이번 단계에서는 “브라우저용 경량 Othello 엔진에서 다음 후보가 무엇이어야 하는가”만 다시 확인했습니다.

핵심 시사점은 다음과 같았습니다.

1. **짧고 systematic한 size-2 n-tuple은 Othello에서 여전히 강한 compact 후보**입니다.
   Jaśkowski는 systematic straight 2-tuples가 소수의 긴 random snake tuple보다 더 강했고, 최종 최고 성능 네트워크가 288 weights 수준의 매우 작은 모델이었다고 정리했습니다.
2. Lucas의 초기 Othello n-tuple 실험도, n-tuple이 당시 비교군이던 piece counter와 MLP를 학습 속도/성능 측면에서 앞섰다는 방향을 보여 줍니다.
3. 최근 Othello 문헌도 여전히 phase-conditioned tuple / small-table evaluator 쪽을 실용적인 설계 축으로 다룹니다.
4. 반대로 few-empties / special ending 쪽은 강한 엔진도 **단순하고 싼 ordering / trap check / speed-biased solver**를 유지하는 편입니다. 이미 현재 저장소가 채택한 방향과 크게 다르지 않습니다.
5. MPC는 여전히 강한 고전 기법이지만, 핵심은 “새 이론”보다 **calibration과 runtime semantics 정렬**입니다.

즉 외부 문헌을 다시 봐도,
현재 저장소에서 다시 열 만한 lane은 대형 새 검색 서브시스템보다 **compact short tuple additive pilot** 쪽이고,
나머지 lane은 새 근거 없이 다시 열면 대체로 반복 실험에 가까워집니다.

## 1. compact systematic short n-tuple additive lane 판단

## 결론

**실험 착수 권고**입니다.
다만 의미는 “지금 바로 기본값 채택”이 아니라,
**새 layout family에 한정한 작고 통제된 additive pilot을 여는 것이 맞다**는 뜻입니다.

## 왜 지금 다시 열 가치가 있는가

### A. Stage 52 close-out이 요구한 재오픈 조건과 정확히 맞는다

Stage 52는 evaluator lane을 다시 열더라도
**같은 family의 재학습 반복이 아니라 layout family 변경이 있을 때만** 다시 여는 것이 맞다고 정리했습니다.

이번 후보는 바로 그 조건을 만족합니다.
`compact systematic short n-tuple additive lane`은
기존 `orthogonal-adjacent-pairs-outer2` 계열을 또 재학습하자는 뜻이 아니라,
**새로운 short-pair family를 additive residual로 시험해 보자**는 뜻입니다.

### B. Stage 69가 같은 family 미세 패치의 한계를 이미 보여 줬다

Stage 69 follow-up에서는 diagonal micro-patch가
local search fidelity나 평균 disc margin은 조금 개선했지만,
신규 noisy Trineutron set에서 active baseline을 match score로 뒤집지 못했습니다.

즉 지금 evaluator lane을 다시 연다면,
**같은 family 안에서 더 미세 패치를 반복하는 것**보다
**새 family를 짧고 작게 비교하는 쪽**이 훨씬 합리적입니다.

### C. 현재 저장소는 이미 이 pilot을 감당할 도구를 갖고 있다

현재 저장소에는 다음이 이미 있습니다.

- built-in short pair layout library
- tuple family pilot 도구
- multi-candidate training suite
- patch/prune/attenuation suite
- compact generated module export
- size estimation 도구
- depth/exact benchmark 도구

즉 이 후보는 “새 알고리즘을 코드로 구현해야만 시작되는 lane”이 아니라,
**학습/내보내기/벤치 체인이 이미 있는 상태에서 비교 실험만 설계하면 되는 lane**입니다.

### D. compact성도 브라우저 기준에서 아직 감당 가능하다

Stage 124 size estimate 기준 compact generated module 증가량은 대략 다음과 같습니다.

| layout family | incremental bytes |
| --- | ---: |
| `orthogonal-adjacent-pairs-outer2-v1` | `+10,208` |
| `diagonal-adjacent-pairs-full-v1` | `+17,421` |
| `orthogonal-adjacent-pairs-full-v1` | `+19,822` |
| `straight-adjacent-pairs-full-v1` | `+36,668` |

현재 runtime package profile이 대략 `3.26MB` 수준이라는 점을 보면,
`+10KB ~ +20KB`의 short-pair family pilot은 브라우저 정적 앱 관점에서도 충분히 검토할 가치가 있습니다.
반면 `straight-full`은 같은 short-pair 계열 중에서도 비용이 너무 크므로 첫 실험으로는 비권장입니다.

## 왜 “실험 착수”이지 “즉시 채택”은 아닌가

- active baseline은 이미 noisy confirmation에서 살아남은 상태입니다.
- same-family patch lane은 baseline을 뒤집지 못했습니다.
- tuple lane은 local benchmark가 좋아 보여도 noisy match에서 뒤집히는 경우가 이미 있었습니다.
- additive lane은 runtime evaluator 품질뿐 아니라 **module size / startup cost / lookup locality / move-ordering 상호작용**까지 같이 봐야 합니다.

따라서 이번 lane은 **실험 대상**이지, 보고서 단계에서 바로 adopt할 후보는 아닙니다.

## 권장 실험 범위

### 1차 main pilot

- family: `diagonal-adjacent-pairs-full-v1`
- 형태: **additive residual**
- 초기 bucket: `late-a`, `late-b`, `endgame`
- 목적: genuinely new family인지 확인

### 1차 control pilot

- family: `orthogonal-adjacent-pairs-outer2-v1` 또는 `orthogonal-adjacent-pairs-full-v1`
- 목적: same-direction control / size 대비 효율 확인

### 1차에서 피할 것

- `straight-adjacent-pairs-full-v1`부터 시작하는 것
- midgame까지 넓게 여는 것
- active baseline을 바로 교체하려는 것
- move-ordering이나 MPC를 동시에 다시 만지는 것

## 채택 기준

pilot은 다음을 모두 확인한 뒤에만 다음 단계로 넘어가야 합니다.

1. exact/depth validation에서 안전성 유지
2. holdout search fidelity 개선
3. noisy match set에서 baseline 미만으로 떨어지지 않음
4. compact module size / startup cost가 브라우저 예산 안에 있음
5. 필요 시 move-ordering compatibility replay를 다시 돌려도 baseline 대비 의미 있는 악화가 없음

## 2. 추가 MCTS late-lane retuning — 비재개 권고

## 결론

**현재 저장소 기준 비재개 권고**입니다.

## 근거

- Stage 118은 root-maturity gate causal audit까지 마친 뒤, 현재 late lane 위에서 더 테스트할 PN/PPN retuning 후보가 사실상 없다고 정리했습니다.
- Stage 119는 그 다음 hot-path refactor 후보까지 실제 벤치로 검증했지만, wall time이 오히려 악화돼 채택하지 않았습니다.
- runtime reference도 현재 late-bias package / root-maturity gate / score-bounds는 실험 표면으로만 남기고 기본값 승격은 모두 보류라고 명시하고 있습니다.

즉 현재 저장소에서 late lane을 다시 연다면,
그것은 “threshold/bias/gate를 한 번 더 만진다”가 아니라
**새 구조적 아이디어를 도입한다**는 뜻이어야 합니다.

그 수준의 변화는 지금 단계의 경량 브라우저 앱 정리 목표와 맞지 않습니다.

## 숨은 세부 후보 재확인

완전히 0은 아닙니다.
다만 남은 것은 다음 정도뿐입니다.

- 특정 late trap corpus가 새로 발견되면 regression 추가
- full PN/PPN, DFPN, graph-aware subtree 같은 **새 구조 연구**

즉 **retuning** lane으로는 닫혔고,
남는 것은 **별도 연구 주제**뿐입니다.

## 3. move-ordering 재튜닝 — 비재개 권고

## 결론

**현재 저장소 기준 비재개 권고**입니다.

## 근거

- Stage 45는 move-ordering lane을 `candidateH2`에서 동결하고, 다음 우선순위를 MPC/runtime plumbing으로 넘기라고 명시했습니다.
- 당시 이유는 이미 adoption gain이 급격히 줄었고, follow-up 후보가 넓은 검증에서 유지되지 않았기 때문입니다.
- Stage 120 survey에서도 move-ordering 자체는 더 이상 즉시 Step 3 후보가 아니라는 판단이 유지됐습니다.

즉 지금 move-ordering을 다시 여는 것은
**현재 evaluator/search landscape가 크게 달라졌을 때**만 의미가 있습니다.
그 전에는 같은 plateau를 다시 확인할 가능성이 높습니다.

## 숨은 세부 후보 재확인

남아 있는 세부 후보가 있다면 딱 하나입니다.

- **새 tuple family가 실제로 채택 단계까지 올라왔을 때**, 그 evaluator와 current ordering의 궁합을 replay로 다시 확인하는 것

즉 move-ordering 자체를 독립 lane으로 재개하는 것이 아니라,
**새 evaluator 채택의 후속 compatibility check**로만 남습니다.

## 4. 전통적 수작업 evaluator 확장 — 비재개 권고

## 결론

**현재 저장소 기준 비재개 권고**입니다.

## 근거

Stage 13 감사는 이미 다음을 보여 줬습니다.

- mobility / potential mobility / corner / corner adjacency / frontier / positional / edge pattern / corner pattern / approximate stability / parity / disc differential 등 전통 축은 이미 넓게 갖춰져 있다.
- 그 단계에서 정말 남아 있던 핵심 수정은 `cornerAccess`와 phase 밖 계산 생략 정도였다.
- 그 이후의 방향은 더 많은 수작업 heuristic 추가가 아니라 **data-driven tuning**이 맞다고 정리했다.

현재 런타임은 그 뒤 learned phase evaluator + move-ordering profile + tuple residual까지 얹은 상태입니다.
따라서 지금 다시 수작업 feature를 많이 추가하는 것은,
대부분 다음 문제로 이어질 가능성이 큽니다.

- feature 중복
- weight interaction 불안정
- 실전 benchmark보다 코드 복잡도 증가
- tuple/data-driven lane과의 경계 흐림

## 숨은 세부 후보 재확인

남아 있는 것은 broad feature expansion이 아니라,
아주 작은 cleanup 정도뿐입니다.

- 실제 profiling에서 phase 밖 불필요 계산이 새로 보일 때 정리
- active learned lane을 건드리지 않는 범위의 trivial cleanup

즉 **새 수작업 evaluator 축을 추가하는 것은 권장되지 않습니다.**

## 5. 5–6 empties micro-specialization 확대 — 비재개 권고

## 결론

**현재 저장소 기준 비재개 권고**입니다.

## 근거

- Stage 23에서 specialized exact few-empties solver가 이미 들어갔습니다.
- Stage 24에서 exact fastest-first ordering과 cut-aware audit가 정리됐습니다.
- Stage 84는 exact micro-solver threshold를 다시 넓혀 보면서 `6`을 기본값으로 채택했고, `8`은 일반 preset-level 검증에서 안정적으로 우세하지 못해 보류했습니다.
- Stage 120 survey에서는 6-empties exact tail만 따로 profile을 다시 봐도, 지배적 hotspot이 small solver family보다 `rules.js` / `bitboard.js` move-generation 쪽에 더 많이 남아 있다고 정리했습니다.

즉 지금 5–6 empties lane을 다시 여는 것은,
이미 정리된 tail window를 한 번 더 미세 조정하는 데 가까우며,
현재 저장소의 주요 병목과도 맞지 않습니다.

## 숨은 세부 후보 재확인

완전히 닫힌 것은 아닙니다.
다만 재개 조건은 분명합니다.

- allocation-light move path 같은 상위 hotpath 정리 뒤에도 5–6 empties family가 다시 주병목으로 남을 때
- 새 exact-tail corpus에서 threshold `6`의 약점이 반복적으로 드러날 때

즉 **프로파일링이 다시 이 lane을 가리킬 때만** 재개하면 됩니다.
현재는 아닙니다.

## 6. special-ending 추가 확장 — 비재개 권고

## 결론

**현재 저장소 기준 비재개 권고**입니다.

## 근거

- Stage 98은 special-ending lane을 공용 모듈 + unified regression suite까지 포함해 제품형으로 마감했습니다.
- 현재 classic과 MCTS 모두 shared heuristic을 사용하며, root scout / internal immediate wipeout guard / MCTS root threat penalty가 이미 정착돼 있습니다.
- 외부 prior art를 다시 봐도, Egaroucid는 cheap bitboard-only special-ending countermeasure를 사용하고, Edax도 few-empties 쪽을 speed-biased ordering과 단순화된 endgame path로 처리합니다. 현재 저장소의 방향은 이 둘의 중간 정도로 충분히 실용적입니다.

즉 special-ending lane은 지금 “기능이 부족해서 더 크게 넓혀야 하는” 상태가 아니라,
**새 failure class가 나오면 회귀 케이스를 추가하는 운영 단계**에 가깝습니다.

## 숨은 세부 후보 재확인

남아 있는 세부 후보는 broad expansion이 아니라 다음뿐입니다.

- 새 함정 수순이 발견되면 `special-ending-regression` 케이스 추가
- 기존 heuristics 수치가 그 새 corpus에서 실패할 때만 국소 조정 검토

즉 현재는 **확장 lane**이 아니라 **regression maintenance lane**입니다.

## 숨은 필수/권장 후보 재점검 결과

이번 단계에서 `js/ai`, `js/core` 소스 경로의 `TODO/FIXME/HACK`류를 다시 확인했지만,
실제 미해결 구현 메모는 발견되지 않았습니다.

즉 지금 남아 있는 필수/권장 후보는
“주석으로 숨어 있던 미완성 기능”이 아니라,
이미 문서화된 후보들 중 무엇을 다시 열 것인가의 문제였습니다.

그 결과 현재 숨은 필수/권장 후보는 다음처럼 정리됩니다.

### 남겨 둘 것

1. **compact systematic short n-tuple additive pilot**
2. 그 pilot이 실제로 살아남았을 때의 **move-ordering compatibility replay**
3. 새 trap corpus 발견 시의 **special-ending regression 추가**
4. future profiling이 다시 가리킬 때만 여는 **5–6 empties 재검토**

### 지금 남기지 않을 것

- 추가 MCTS late-lane retuning
- evaluator 변화 없이 독립적으로 다시 여는 move-ordering retuning
- broad hand-crafted evaluator expansion
- broad special-ending expansion

## 최종 결론

이번 단계의 최종 판단은 다음과 같습니다.

### A. 다음 실험 후보

- **채택 권고**: `compact systematic short n-tuple additive lane`
- 단, **새 layout family + compact additive pilot + late bucket 중심**으로만 시작
- 1차 main pilot은 `diagonal-adjacent-pairs-full-v1`이 가장 적절
- `straight-full`은 첫 실험에서 제외 권고

### B. 현재 비재개 권고 lane

- 추가 MCTS late-lane retuning
- move-ordering 재튜닝
- 전통적 수작업 evaluator 확장
- 5–6 empties micro-specialization 추가 확대
- special-ending 추가 확장

### C. 예외 조건

위 lane들이 영구적으로 금지된 것은 아닙니다.
다만 다시 열려면 반드시 다음 중 하나가 먼저 있어야 합니다.

- 새 구조적 아이디어
- 새 failure corpus
- 새 profiling hotspot
- 새 evaluator family 채택으로 인한 search landscape 변화

그 전에는 대부분 **같은 plateau를 다시 확인하는 비용**에 가까울 가능성이 높습니다.

## 권장 후속 순서

1. `compact systematic short n-tuple additive pilot`를 **새 family 한정**으로 설계한다.
2. family pilot 결과가 살아남으면 depth/exact/noisy match를 다시 검증한다.
3. 그 후보가 실제 adoption 직전까지 올라오면, 그때만 move-ordering compatibility replay를 다시 연다.
4. 나머지 lane은 새 근거가 생기기 전까지 reopening하지 않는다.

## 관련 산출물

- `benchmarks/stage124/stage124_tuple_layout_candidate_size_summary.json`
- `benchmarks/stage124/stage124_compact_tuple_go_no_go_and_lane_status_summary_20260412.json`
- `docs/runtime-ai-reference.md`
- `docs/reports/checklists/ai-implementation-checklist.md`
- `docs/reports/report-inventory.generated.md`
