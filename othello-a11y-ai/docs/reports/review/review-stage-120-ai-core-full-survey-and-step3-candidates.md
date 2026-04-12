# 검토 보고서 Stage 120 — AI core 전수조사와 Step 3 테스트 후보 분류

## 목적

이번 단계의 목표는 새 기능을 바로 merge하는 것이 아니라,
현재 저장소 기준으로 아래 질문에 답하는 것이었습니다.

1. `README.md`, `docs/runtime-ai-reference.md`, 체크리스트, 기존 구현/검토 보고서 기준으로 아직 **유의미한 구현/최적화 테스트 후보**가 남아 있는가?
2. 남아 있다면 그것은 어느 카테고리에 속하고, **무엇을 어떻게 테스트해야 하는가?**
3. 반대로 과거 보고서와 최근 코드 상태를 함께 보면, 이제는 **굳이 다시 파지 않아도 되는 lane**은 무엇인가?

이번 단계에서도 `*.generated.js`는 학습/생성 도구 산출물이므로 **읽기 참고만 허용하고 구현 리팩토링 범위에서는 제외**했습니다.

## 조사 범위

### 문서

- `README.md`
- `docs/runtime-ai-reference.md`
- `docs/reports/checklists/ai-implementation-checklist.md`
- `docs/reports/implementation/impl-stage-45-move-ordering-replay-and-next-lane-decision.md`
- `docs/reports/implementation/impl-stage-59-opening-wrapup-candidates.md`
- `docs/reports/implementation/impl-stage-86-runtime-stability-hotpath-audit.md`
- `docs/reports/implementation/impl-stage-98-special-ending-wrapup-and-regression-suite.md`
- `docs/reports/implementation/impl-stage-118-mcts-root-maturity-gate-causality-closeout.md`
- `docs/reports/implementation/impl-stage-119-refactor-audit-and-documentation-closeout.md`
- `docs/reports/review/review-stage-12-external-engine-technique-survey-and-adoption-candidates.md`
- `docs/reports/review/review-stage-13-traditional-evaluator-audit.md`
- `docs/reports/review/review-stage-23-specialized-few-empties-exact-solver.md`
- `docs/reports/review/review-stage-24-exact-fastest-first-and-cut-aware-audit.md`

### 코드

#### `js/ai`
- `evaluation-profiles.js`
- `evaluator.js`
- `mcts.js`
- `opening-book-data.js`
- `opening-book.js`
- `opening-prior.js`
- `opening-tuning.js`
- `presets.js`
- `search-algorithms.js`
- `search-engine.js`
- `special-endings.js`
- `worker.js`

#### `js/core`
- `bitboard.js`
- `game-state.js`
- `rules.js`

#### 보조 경로
- `js/ui/engine-client.js`
- `js/test/benchmark-helpers.mjs`
- `tools/evaluator-training/*`
- `tools/docs/*`

## 외부 문헌 / 타 AI 사례 재확인 요약

이번 단계에서는 기존 Stage 12 조사 내용을 그대로 반복하지 않고,
현재 코드베이스에 **실제 다음 테스트 후보를 남길 만한 시사점**이 아직 유지되는지 다시 확인했습니다.

핵심 결론은 다음과 같았습니다.

1. **Othello에서는 여전히 강한 evaluator + minimax/Negascout 계열이 실용 기본선**입니다.
   즉 현재 저장소가 classic search를 중심으로 유지되는 방향 자체는 맞습니다.
2. **Multi-ProbCut(MPC)는 여전히 유효한 고전 기법이지만, calibration이 먼저**입니다.
   이미 저장소에도 calibrated profile slot과 active MPC profile이 들어와 있으므로,
   새 후보가 있다면 “새 MPC 이론”보다 **현재 active profile 주입 의미론을 정렬하는 쪽**이 더 우선입니다.
3. **compact short n-tuple / small table 계열은 여전히 브라우저 친화적인 강화 후보**입니다.
   특히 systematic short tuple이 Othello에서 강하다는 외부 근거는,
   현재 저장소의 tuple residual/training tooling과도 방향이 맞습니다.
4. **few-empties 미세 특화는 실제 hotspot이 남아 있을 때만 의미가 있습니다.**
   따라서 과거 Stage 24의 결론처럼, profiling이 small solver family hotspot을 다시 보여줄 때만 재진입하는 편이 맞습니다.

즉 외부 문헌을 다시 봐도,
이번 저장소의 Step 3 후보는
- 무거운 새 search trick 추가,
- 대형 신경망 탑재,
- 대규모 MCTS 재설계
보다는,
**현재 코드의 의미론 정렬 / hotpath 경량화 / 저비용 재검증** 쪽으로 수렴했습니다.

## 카테고리별 조사 결과

## A. core move-generation / bitboard hotpath

대상 파일:
- `js/core/rules.js`
- `js/core/bitboard.js`
- `js/core/game-state.js`

### 관찰

중간 게임 representative search를 CPU profile로 다시 보면,
가장 눈에 띄는 함수는 다음과 같았습니다.

- `collectDirectionalFlips()`
- `growDirectionalTargets()`
- `buildLegalMoveRecords()`
- `listLegalSearchMoves()`
- `shift*()` 계열
- `indexFromBit()`
- `legalMovesBitboard()`

즉 현재 가장 큰 남은 runtime 후보는
search control 자체보다도 **rules/bitboard 기반 move generation + move record 구성 비용**입니다.

Stage 86에서 이미 `rules.js` explicit direction loop unroll은 일관된 승리를 보이지 못해 기각됐습니다.
따라서 이번에는 같은 후보를 다시 들고 오는 것이 아니라,
**allocation / data-shape / search-only move path** 쪽으로 좁혀 보는 것이 맞습니다.

### 판정

- **후보 유지**: 예
- **우선순위**: 매우 높음
- **Step 3 후보명**: allocation-light core move path

### Step 3에서 테스트할 것

1. search 내부 전용 경로에서 `buildLegalMoveRecords()`의 fresh object/array 할당을 줄일 수 있는가
2. public API를 바꾸지 않고, 내부 search path만 scratch buffer / packed record / delayed field materialization으로 경량화할 수 있는가
3. 동일 node / 동일 best move / 동일 score를 유지하면서 elapsed와 GC 비중을 낮출 수 있는가

### 테스트 조건

- `node js/test/core-smoke.mjs`
- `node js/test/perft.mjs`
- exact/WLD smoke 계열
- representative depth benchmark
- CPU profile 재비교
- same node / same move / same score 확인

## B. classic search orchestration / exact tail

대상 파일:
- `js/ai/search-engine.js`
- `js/ai/special-endings.js`
- `js/core/rules.js`

### 관찰

classic search 자체는 이미 상당히 정리되어 있습니다.
특히 다음은 과거 단계에서 의미 있게 닫혔습니다.

- few-empties exact lane: Stage 23/24/84/98까지 여러 차례 정리됨
- exact fastest-first ordering: Stage 24 채택 완료
- special-ending lane: Stage 98에서 regression suite까지 포함해 wrap-up

이번 단계에서 6-empties exact tail만 따로 profile을 보더라도,
지배적 hotspot이 “specialized few-empties family” 쪽으로 다시 튀지는 않았습니다.
오히려 여전히 `rules.js` / `bitboard.js` move-generation 비용이 더 크게 보였습니다.

즉 **5–6 empties 전용 미세 특화**는 이번 단계의 우선 후보로 남기지 않았습니다.

### 판정

- **후보 유지**: 제한적으로만
- **우선순위**: 낮음
- **즉시 Step 3 후보**: 없음

### 보류 메모

다만 다음 조건이 생기면 재검토할 수 있습니다.

- exact-tail 전용 CPU profile에서 small solver family가 다시 명확한 hotspot으로 드러날 때
- core move-generation 비용이 충분히 낮아진 뒤에도 5–6 empties family가 다음 병목으로 남을 때

## C. evaluator / profile compile / learned table lane

대상 파일:
- `js/ai/evaluator.js`
- `js/ai/evaluation-profiles.js`

### 관찰

현재 저장소는 이미 다음 기반을 갖고 있습니다.

- phase-bucket learned evaluator profile consume
- active move-ordering profile consume
- active tuple residual profile consume
- evaluator-training / module-builder / validation tooling

또한 Stage 13에서 전통적 수작업 evaluator 확장
(예: named edge trap 추가 확대, semi-stable/unstable 확장, 수작업 matrix 재설계)은
다음 learned/data-driven 단계보다 우선순위가 낮다고 정리해 둔 상태입니다.

이번 외부 문헌 재확인도 같은 방향을 지지했습니다.
즉 evaluator 쪽에서 남아 있는 의미 있는 큰 lane은
**새 수작업 휴리스틱 추가**가 아니라,
**작고 빠른 learned table / short n-tuple additive lane**입니다.

### 판정

- **후보 유지**: 예
- **우선순위**: 중간 (즉시 1순위는 아님)
- **Step 3 후보명**: compact systematic short n-tuple additive lane

### Step 3에서 테스트할 것

1. 현재 tuple residual tooling 위에 더 작은 short tuple 실험을 additive하게 얹을 수 있는가
2. holdout exact/depth benchmark에서 evaluator 품질 향상이 있는가
3. module size / startup cost / lookup locality가 브라우저 런타임에 맞는가
4. 기존 handcrafted evaluator를 교체하지 않고 **late-mid / pre-exact 보강**으로 제한하는 것이 유리한가

### 메모

이 후보는 유망하지만,
즉시 merge 가능한 작은 refactor라기보다 **새 learned lane**에 가깝습니다.
따라서 Step 3 초반에는 core/runtime parity 후보를 먼저 처리하는 편이 안전합니다.

## D. opening subsystem

대상 파일:
- `js/ai/opening-book.js`
- `js/ai/opening-book-data.js`
- `js/ai/opening-prior.js`
- `js/ai/opening-tuning.js`

### 관찰

현재 기본 hybrid key는 `stage59-cap9-prior-veto`입니다.
Stage 59 보고서를 다시 보면,
`stage59-prior-veto`는 strongest reference 종합 순위에서 한 단계 밀렸지만,
**direct rate / latency / nodes 비용 측면에서는 저비용 대안**으로 명시적으로 남겨 둔 상태입니다.

그 뒤로 evaluator/profile/runtime이 여러 차례 변했기 때문에,
Stage 59 당시의 opening default 판단이 **현재 런타임에서도 여전히 최선인지**는
한 번 더 재생성해 볼 가치가 있습니다.

이 후보는 새 구조 도입이 아니라,
이미 남겨 둔 두 프로필의 **현재 코드 기준 재검증**이어서 부담이 작습니다.

### 판정

- **후보 유지**: 예
- **우선순위**: 중간~높음
- **Step 3 후보명**: opening default revalidation (`stage59-cap9-prior-veto` vs `stage59-prior-veto`)

### Step 3에서 테스트할 것

1. current runtime 기준 replay/reference suite를 다시 돌렸을 때 기본 hybrid key가 여전히 `stage59-cap9-prior-veto`가 맞는가
2. `stage59-prior-veto`가 latency/nodes를 크게 줄이면서 agreement 저하를 충분히 감수 가능한 수준으로 만드는가
3. contradiction veto / direct-use cap / search fallback 비율이 현재 corpus에서 어떻게 달라지는가

### 테스트 조건

- opening hybrid reference replay 도구 재실행
- 현재 corpus 기준 benchmark JSON 재생성
- smoke / key 존재 검증 유지

## E. MCTS lane / proof-oriented late lane

대상 파일:
- `js/ai/mcts.js`
- `js/ai/search-engine.js`
- `js/ai/search-algorithms.js`

### 관찰

이 영역은 이미 최근 단계에서 매우 깊게 스크리닝됐습니다.

- Stage 118: root-maturity gate causality closeout
- Stage 119: late lane refactor/documentation closeout

두 문서를 같이 보면,
현재 저장소에서 추가로 밀어 볼 **PN/PPN retuning 후보는 사실상 소진**된 상태입니다.
즉 proof-priority, root-maturity gate, score-bounds 계열에서
지금 다시 작은 bias formula를 더 만지는 것은,
새로운 실익보다 churn 가능성이 더 큽니다.

### 판정

- **후보 유지**: 아니오
- **즉시 Step 3 후보**: 없음

### 이번 단계에서 제외한 이유

1. 최근 closeout 문서가 이미 “추가 retuning 후보 없음”에 가깝게 결론 냈음
2. 현재 저장소의 다음 병목은 MCTS bias 공식보다 core/runtime semantics 쪽에 가까움
3. Step 3를 지금 시작한다면, 다시 MCTS 실험군을 넓히는 것은 순서상 맞지 않음

## F. worker / UI / direct-engine / tooling boundary

대상 파일:
- `js/ui/engine-client.js`
- `js/ai/worker.js`
- `js/ai/search-engine.js`
- `js/test/benchmark-helpers.mjs`

### 관찰

이 카테고리에서 이번 단계의 가장 명확한 후보가 나왔습니다.

- `ACTIVE_MPC_PROFILE`는 존재함
- UI local fallback은 active MPC profile을 자동 주입함
- worker 경로도 active MPC profile을 자동 주입함
- 그러나 `new SearchEngine()` 기본 constructor 경로는 `mpcProfile: null`
- `js/test/benchmark-helpers.mjs`도 별도 주입이 없으면 결과 summary의 `mpcProfileName`이 `null`

즉 현재 저장소는 **같은 classic search라도 호출 경로에 따라 기본 MPC 의미론이 다릅니다.**
이 문제는 strength보다도,
- tooling benchmark 해석,
- direct constructor 사용 코드,
- regression 기준선
에 혼선을 만들 수 있습니다.

### 판정

- **후보 유지**: 예
- **우선순위**: 매우 높음
- **Step 3 후보명**: active MPC default parity hardening

### Step 3에서 테스트할 것

1. direct `new SearchEngine()` 경로도 active MPC profile을 기본 주입하도록 맞출 것인가
2. 또는 반대로 UI/worker 자동 주입을 제거하고 모든 경로를 explicit opt-in으로 통일할 것인가
3. 어느 쪽이든 “explicit `mpcProfile: null`은 비활성화 의도”라는 의미론은 유지해야 하는가
4. benchmark helper / tooling summary가 현재 active/default 의미론을 정확히 반영하는가

### 테스트 조건

- direct constructor / UI fallback / worker 경로의 option snapshot parity 비교
- explicit `mpcProfile: null` preserve test
- representative MPC-trigger benchmark
- benchmark helper summary parity 확인

## 이번 단계의 최종 후보 큐

우선순위 순으로 정리하면 다음과 같습니다.

### 1. active MPC default parity hardening

성격:
- correctness / runtime semantics / tooling parity

왜 남겼는가:
- 현재 코드에서 실제로 경로별 의미론이 갈라져 있음
- 작은 수정으로도 benchmark 해석과 runtime 일관성을 높일 수 있음

Step 3 테스트 초안:
- direct/UI/worker parity smoke
- explicit null override smoke
- helper summary parity check

### 2. allocation-light core move path

성격:
- profiler-backed runtime optimization

왜 남겼는가:
- midgame와 exact-tail 모두에서 `rules.js` / `bitboard.js` move-generation 계열이 반복적으로 hotspot으로 보임
- Stage 86에서 기각된 것은 “direct unroll”이지, allocation-light search path 전체가 아님

Step 3 테스트 초안:
- search-only scratch/packed move path prototype
- core/perft/exact regression
- elapsed/GC/profile 재측정

### 3. opening default revalidation

성격:
- existing candidate re-check

왜 남겼는가:
- `stage59-prior-veto`가 여전히 저비용 대안으로 문서에 남아 있음
- current runtime 기준으로 다시 보면 결론이 달라질 가능성이 아주 높지는 않지만, 비용 대비 확인 가치가 있음

Step 3 테스트 초안:
- replay/reference suite rerun
- agreement/direct-rate/nodes/latency 재비교
- default 유지 또는 교체 판정

### 4. compact systematic short n-tuple additive lane

성격:
- larger learned lane / reserve candidate

왜 남겼는가:
- 외부 문헌 방향과 현재 training/tooling이 잘 맞음
- 단, 지금 당장 1순위로 처리할 작은 refactor는 아님

Step 3 테스트 초안:
- limited additive residual experiment
- holdout benchmark
- module size/runtime cost audit

## 이번 단계에서 의도적으로 제외한 것

### 1. 추가 MCTS proof-priority / root-maturity / score-bounds retuning

이유:
- Stage 118/119 closeout와 충돌
- 현재 저장소의 다음 병목으로 보기 어려움

### 2. move-ordering 추가 local-search 재튜닝

이유:
- Stage 45에서 사실상 freeze 선언
- 다음 lane은 MPC/runtime plumbing으로 이미 pivot됨

### 3. 전통적 수작업 evaluator feature 확대

이유:
- Stage 13 결론과 외부 문헌 방향 모두 learned/data-driven 쪽이 더 자연스러움

### 4. 5–6 empties micro-specialization 재진입

이유:
- 이번 profiling에서 small solver family hotspot 재확인 실패
- 현재는 rules/bitboard hotpath가 더 우선

### 5. special-ending lane 추가 분기 확대

이유:
- Stage 98에서 wrap-up 및 regression suite 정리 완료
- 이번 단계에서 새 구조 후보가 보이지 않았음

## 결론

이번 전수조사의 결론은 다음과 같습니다.

1. **즉시 Step 3로 넘길 만한 실질 후보는 3개**입니다.
   - active MPC default parity hardening
   - allocation-light core move path
   - opening default revalidation
2. compact short n-tuple additive lane은 유망하지만,
   현재 순차 테스트의 **첫 배치**보다는 다음 배치에 가깝습니다.
3. 반대로 MCTS late-lane retuning, move-ordering 재튜닝, 5–6 empties micro-specialization은
   현재 코드/문서/프로파일 기준으로는 다시 파지 않는 편이 낫습니다.

즉 Step 3는
**경로 의미론 정렬 → core hotpath 실험 → opening default 재검증**
순으로 가는 것이 가장 합리적입니다.
