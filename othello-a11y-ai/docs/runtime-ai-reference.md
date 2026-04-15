# AI 런타임 레퍼런스

이 문서는 **현재 코드 기준**으로 살아 있는 AI 런타임만 설명합니다.
Stage별 실험 이력이나 비채택 후보는 `docs/reports/`에서 추적하고, 여기서는 실제 기본 경로와 유지보수 기준만 정리합니다.

## 문서 기준선과 버전 기준
- 저장소 stage/tag/updatedAt/summary의 단일 기준은 루트 `stage-info.json`입니다.
- **현재 코드 기준 안내**는 루트 `README.md`, 이 문서, `docs/reports/checklists/ai-implementation-checklist.md`를 함께 봅니다.
- Stage별 채택/비채택 근거와 역사 문서는 `docs/reports/implementation/*`, `docs/reports/review/*`에 남깁니다.
- 전체 문서 목록과 최신 구현 보고서 진입점은 수동 목록보다 `docs/reports/report-inventory.generated.md`를 우선 기준으로 봅니다.
- `package.json`은 Node ESM / 도구 실행용 최소 메타데이터 파일이며, 저장소 Stage 버전 기준으로 사용하지 않습니다.

## 읽는 순서
1. 저장소 Stage/tag/updatedAt/summary가 필요하면 루트 `stage-info.json`
2. 빠른 개요가 필요하면 루트 `README.md`
3. 현재 AI의 실제 구조와 기본값이 궁금하면 이 문서
4. 체크리스트가 필요하면 `docs/reports/checklists/ai-implementation-checklist.md`
5. 채택/비채택 근거와 최신 구현 보고서 진입점이 필요하면 `docs/reports/report-inventory.generated.md`

## 현재 기본 런타임 스냅샷

| 항목 | 현재 상태 | 근거 파일 |
| --- | --- | --- |
| 저장소 현재 Stage | **Stage 147** | `stage-info.json` |
| 기본 난이도 | `normal` | `js/ai/presets.js`, `js/ai/search-engine.js` |
| 기본 스타일 | `balanced` | `js/ai/presets.js` |
| 기본 AI 모드(search algorithm) | `classic-mtdf-2ply` (`Classic MTD(f)`) | `js/ai/search-algorithms.js`, `js/ai/search-engine.js` |
| 기본 opening hybrid key | `stage59-cap9-prior-veto` | `js/ai/opening-tuning.js` |
| active evaluation profile | `balanced13-alllate-smoothed stability extras 0.90x` | `js/ai/learned-eval-profile.generated.js`, `js/ai/evaluation-profiles.js` |
| active move-ordering profile | `trained-move-ordering-linear-v2` | `js/ai/learned-eval-profile.generated.js`, `js/ai/evaluation-profiles.js` |
| active tuple residual profile | `diagonal-top24-latea-endgame-patched-calibrated` | `js/ai/learned-eval-profile.generated.js`, `js/ai/evaluation-profiles.js` |
| active MPC profile | `balanced13-alllate-smoothed-stability-090__runtime-mpc` | `js/ai/learned-eval-profile.generated.js`, `js/ai/evaluation-profiles.js` |
| exact micro-solver threshold | `optimizedFewEmptiesExactSolverEmpties = 6` | `js/ai/search-engine.js` |
| allocation-light search move path | 활성 (`allocationLightSearchMoves = true`) | `js/core/rules.js`, `js/ai/search-engine.js` |
| specialized few-empties exact solver | 활성 | `js/ai/search-engine.js` |
| special-ending safety net | root scout + internal immediate wipeout guard + MCTS root threat penalty | `js/ai/search-engine.js`, `js/ai/mcts.js`, `js/ai/special-endings.js` |
| MCTS late solved-subtree lane | 활성 (`mctsSolverEnabled = true`, `mctsSolverWldEmpties = 2`) | `js/ai/search-engine.js`, `js/ai/mcts.js` |
| MCTS root exact continuation | 활성 (`mctsExactContinuationEnabled = true`, base `+3`) + adaptive post-proof continuation 기본 활성 (`mctsExactContinuationAdaptiveEnabled = true`, `loss-only`, 추가 `+1`) | `js/ai/search-engine.js`, `js/ui/formatters.js` |
| MCTS proof telemetry / UI summary | 활성 (`mctsProofTelemetry`, 상태 패널의 `말기 proof`) | `js/ai/search-engine.js`, `js/ui/formatters.js`, `js/ui/app-controller.js` |
| MCTS late proof-priority frontier bias | `mcts-hybrid` 기본 활성 (`mctsProofPriorityScale = 0.15`, `mctsProofMetricMode = legacy-root`, `mctsProofPriorityBiasMode = rank`), continuation 창 안에서는 runtime handoff로 자동 비활성. time-budget-conditioned late-bias package와 root-maturity gate refined runtime 표면은 추가됐지만 기본값은 계속 `fixed` / gate off | `js/ai/search-engine.js`, `js/ai/mcts.js`, `js/ui/formatters.js` |
| MCTS score-bound late lane | experimental opt-in (`mctsScoreBoundsEnabled = true`)만 제공, lane 내부 기본 `draw-blocker x0.35`, 전역 기본값은 꺼짐 | `js/ai/search-engine.js`, `js/ai/mcts.js`, `js/ui/formatters.js` |
| root WLD pre-exact | 기본 꺼짐, custom에서만 `+2` 선택 가능 | `js/ai/presets.js`, `js/ai/search-engine.js` |
| 실행 경로 | worker 우선, 실패 시 main-thread fallback | `js/ui/engine-client.js`, `js/ai/worker.js` |

## 모듈 지도

| 모듈 | 역할 | 비고 |
| --- | --- | --- |
| `js/core/bitboard.js` | 좌표/마스크/영역/가중치 비트보드 유틸리티 | 규칙/평가/탐색 공통 기반 |
| `js/core/rules.js` | 합법 수 생성, 뒤집기 계산, prepared search move record 생성 | move generation hotpath + allocation-light search move path |
| `js/core/game-state.js` | 상태, 패스, 수 적용 | 탐색 노드 상태 컨테이너 |
| `js/ai/evaluation-profiles.js` | generated/seed profile compile과 active profile 노출 | evaluation / ordering / tuple / MPC 진입점 |
| `js/ai/evaluator.js` | phase-bucket evaluator, tuple residual, stability/feature 계산, move-ordering evaluator | Stage 86에서 stability hotpath flattening 반영 |
| `js/ai/opening-book.js` | curated opening book 조회 | direct use + root ordering 참고 |
| `js/ai/opening-prior.js` | compact opening prior 조회 | book 보조와 ordering bias |
| `js/ai/opening-tuning.js` | opening hybrid key와 threshold/profile 해석 | 기본 key는 `stage59-cap9-prior-veto` |
| `js/ai/presets.js` | 난이도/스타일/custom 입력 해석 | 사용자 노출 설정 표면 |
| `js/ai/special-endings.js` | special-ending scout / trap penalty / immediate wipeout 공용 휴리스틱 | classic과 MCTS가 공유 |
| `js/ai/search-engine.js` | 탐색 엔진 본체 | opening → classic search / MCTS search → exact/WLD lane 통합, direct 기본 경로도 balanced13 runtime MPC profile 상속, classic 내부 노드는 prepared search move path 기본 사용 |
| `js/ai/worker.js` | 워커용 search wrapper | explicit `mpcProfile`가 없을 때 balanced13 runtime MPC semantics 유지 |
| `js/ui/engine-client.js` | 워커 우선 + main-thread fallback | UI와 direct engine의 balanced13 runtime MPC 기본 의미론을 동일하게 유지 |
| `js/ui/settings-panel-view.js` | 접히는 설정 패널, 난이도/스타일 상세 대화상자 렌더링 | 사용자 지정 엔진 수치를 detail dialog 중심으로 노출 |
| `js/ui/settings-cookie-store.js` | 설정 쿠키 읽기/쓰기/삭제 | GitHub Pages 하위 경로를 고려한 cookie persistence |
| `js/ui/dialog-utils.js` | 공용 dialog open/close/fallback helper | settings/manual-input dialog가 공유 |
| `js/ui/settings-search-algorithm-presentations.js` | 탐색 계열별 설정 노출 규칙과 안내 문구 helper | lite/guided/hybrid/classic presentation drift 방지 |

## 탐색 파이프라인

### 1. 오프닝 단계
초반에는 curated opening book을 우선 조회합니다.
book 후보가 충분히 신뢰할 수 있을 때는 direct use를 허용하고, 그렇지 않으면 compact opening prior를 함께 사용해 root ordering bias와 contradiction veto를 적용합니다.

현재 기본 hybrid key는 `stage59-cap9-prior-veto`입니다.
Stage 123 replay revalidation에서도 이 기본값이 `stage59-prior-veto`보다 더 높은 agreement를 유지해, 현재 런타임에서는 그대로 유지합니다. `stage59-prior-veto`는 direct rate와 latency가 더 낮은 저비용 대안으로만 남깁니다.
즉, 책을 완전히 버리지도 않고, prior를 책 대체물로 과신하지도 않으며, **직접 책 사용 / prior 보조 / 순수 탐색** 사이를 보수적으로 나눕니다.

### 2. 일반 탐색 단계
일반 경로의 기본값은 iterative deepening 기반 클래식 탐색이며, 현재 설치 기본 모드는 `Classic MTD(f)`입니다. 설정 패널에서는 같은 클래식 계열의 `Classic PVS`를 선택해 비교 기준선을 그대로 쓸 수 있고, 별도로 preset-aware MCTS lane도 고를 수 있습니다.

- `beginner`: `Classic MTD(f) / Classic PVS / MCTS Lite / MCTS Guided`
- `easy` 이상: `Classic MTD(f) / Classic PVS / MCTS Guided / MCTS Hybrid`

세부 모드는 다음과 같습니다.

- `mcts-lite`: UCT + random rollout baseline + late exact/WLD solved subtree probe + root exact continuation
- `mcts-guided`: progressive bias + heavy playout + cutoff evaluator + opening prior / ordering 기반 유도 정책 + late solved-value propagation + root exact continuation
- `mcts-hybrid`: guided lane 위에 shallow minimax / alpha-beta node prior를 추가한 informed-prior variant + late exact/WLD subtree solver + root exact continuation + proof/disproof frontier rank bias

Stage 102부터는 MCTS 결과가 root proof / subtree proof를 얻었을 때, 그 상태를 별도 telemetry로 정리해 상태 패널의 **말기 proof** 문장으로도 노출합니다.
Stage 103부터는 `mcts-hybrid` late lane에서 proof/disproof frontier rank를 selection bonus로 바꾸는 **proof-priority bias**를 기본으로 켰고, summary에도 `proof-priority x...` 메모가 함께 붙습니다.
Stage 104에서는 root가 exact continuation 창에 들어오면 proof-priority를 같은 deadline 안 exact lane에 **handoff** 하도록 바꿔, continuation 창 안에서는 proof bias를 자동으로 끄고 exact continuation을 우선합니다.
Stage 105에서는 proof-priority metric을 `legacy-root`와 `per-player generalized proof metric`으로 분리해 late-lane benchmark를 다시 돌렸습니다. 결과적으로 현재 Stage 104 기본 late lane(사실상 `12 empties` 근방)에서는 `per-player`가 robust win을 만들지 못해서, **기본값은 `legacy-root` 유지**가 현재 기준입니다. `per-player`는 experimental opt-in과 telemetry/benchmark 표면으로만 남겨 둡니다.
Stage 106에서는 score-bounded / draw-aware late lane도 실험적으로 붙였습니다. `mctsScoreBoundsEnabled = true`일 때 root / best move의 lower/upper score bound와 bound cut 수를 telemetry와 summary 문장으로 노출하고, draw subtree는 exact `0`으로 승격할 수 있게 했습니다. 다만 `11~12 empties` validation 기준으로는 bound narrowing과 일부 draw exact 승격은 확인됐지만, **exact-best / average score loss에서 robust한 기본값 이득은 없어서 기본값은 계속 꺼 둡니다.**
Stage 107에서는 이 experimental lane 안에서 **dominated-child cut이 실제 traversal에 연결되도록 수정**하고, proof-priority ranking도 surviving frontier 기준으로 다시 계산하게 했습니다. 12-empties 24-seed time benchmark와 fixed-iteration benchmark를 다시 돌린 결과, exact-best 기본값 승격까지는 아니지만 proof completion과 score-loss가 소폭 좋아졌고 `dominated traversal selections = 0` invariant도 확인되어, **수정된 score-bounded lane 자체는 채택하되 기본값 승격은 계속 보류**하는 쪽으로 정리했습니다.
Stage 108에서는 이 lane을 마지막으로 한 번 더 밀어 보면서, **draw가 이미 확보됐지만 exact `0`으로 닫히지 않은 late root / subtree에서 남은 blocker child를 더 세게 미는 `draw-blocker` bonus**를 추가했습니다. formal 12-empties 24-seed benchmark에서는 exact-best hit은 그대로였지만, `280ms` 기준 proven/exact-result가 `83.3% / 8.3% -> 87.5% / 12.5%`로 좋아졌고 draw subset exact-result도 `50% -> 75%`로 올라갔습니다. 다만 전역 기본 strength를 바꿀 정도의 robust exact-best 우세는 끝내 나오지 않았기 때문에, **score-bounds는 계속 experimental opt-in으로 두되 lane 내부 기본 `mctsScoreBoundDrawPriorityScale = 0.35`만 채택**하는 선에서 정리했습니다. 이 Stage 108을 마지막으로, score-bounds-only 개선은 여기서 한 번 끊고 다음 단계부터는 PN/PPN 쪽으로 다시 돌아가는 것이 맞습니다.
Stage 109에서는 이 위에 새로운 strength feature를 더 얹지 않고, 대신 **late-lane 리팩토링 마감 정리**를 진행했습니다. 공용 node factory로 root/child 초기화를 합치고, solved principal variation 비교의 `JSON.stringify` 경로를 direct sequence equality helper로 바꾸고, solved-child propagation을 single-pass로 재작성했으며, traversal-time proof/draw ranking에서는 selection에 필요 없는 `byMoveIndex` Map 생성을 건너뛰도록 정리했습니다. 또 selection hot path에서 redundant `includes()` invariant 검사와 반복 option lookup을 덜어 냈습니다. 이 Stage 109는 기본 strength나 사용자 노출 옵션을 바꾸는 단계가 아니라, **다음 PN/PPN 단계에서 late lane을 다시 손보기 쉬운 형태로 납작하게 정리한 cleanup stage**로 보는 편이 맞습니다.
Stage 110에서는 PN/PPN full lane으로 점프하기 전에, Stage 104의 continuation bridge를 한 번 더 다듬어 **adaptive post-proof exact continuation**을 기본 late lane에 채택했습니다. 기본 continuation 창(`exact + 3`, 즉 `11 empties`) 안에서는 기존 handoff를 그대로 유지하고, 그 바로 바깥 `12 empties`에서는 proof-priority를 root search 동안 계속 켠 채 root가 `loss` WLD proof를 얻은 경우에만 exact continuation을 한 번 더 시도합니다. formal 12-empties 24-seed + holdout 24-seed 재검증에서는 full trigger(`loss-only`, legal-move cap 없음)가 `120ms`에서 exact-best `54.2% -> 58.3%`, WLD/proven `56.3% -> 58.3%`, average score-loss `49,375 -> 39,792`로 개선됐고, `280ms`에서는 exact-best `58.3% -> 72.9%`, exact-result `6.3% -> 33.3%`, average score-loss `27,708 -> 14,167`까지 좋아졌습니다. 이 과정에서 continuation merge가 root exact score와 다른 `bestMoveCoord`를 내보내던 latent bug도 함께 수정해, exact continuation이 루트 최선수를 잘못 보고하던 경계 사례를 정리했습니다.
Stage 111에서는 같은 Stage 110 late lane 위에서 proof-priority bonus 공식을 다시 스크리닝했습니다. 기존 Stage 103 기본값은 frontier **rank-normalized** bonus였지만, 이번에는 PN/PPN 문헌에서 제안하는 값 기반 공식인 `pnmax`, `pnsum`도 experimental option으로 추가해 `mctsProofPriorityBiasMode`로 비교할 수 있게 했습니다. formal 12-empties 24-seed + holdout 24-seed 재검증 결과, `120ms`에서는 기본 `rank`와 `pnmax`가 exact-best `31/48`로 같았지만 average score-loss는 `23,125 < 24,375`로 기본 `rank`가 더 안전했고, `280ms`에서는 `pnmax`가 exact-best `37/48 -> 38/48`, proven `44/48 -> 45/48`, exact-result `19/48 -> 22/48`, average score-loss `10,833 -> 10,417`로 소폭 앞섰습니다. `pnsum`은 두 budget을 합쳐도 `rank`를 안정적으로 넘지 못했고, `pnmax`도 120ms/280ms를 함께 보면 일관된 우세까지는 아니어서 **기본값은 계속 `rank` 유지**로 정리했습니다. 대신 bias formula 표면과 telemetry/benchmark 도구는 남겨 두어, 다음 PN/PPN 단계에서 per-player metric이나 deeper-only gate와 조합 실험을 이어갈 수 있게 했습니다.
Stage 112에서는 바로 그 다음 후보였던 **deeper-only/root-off gate**와 **proof metric × bias formula 조합**을 다시 좁혀 봤습니다. 먼저 12-empty root에서 `mctsProofPriorityMaxEmpties = 11`로 root bias를 끄는 pilot을 돌려 보니 main 24-seed 기준 proof-priority selection node 평균이 `0`으로 떨어져, 현재 late bucket의 proof-priority는 사실상 **root-driven**이라는 점이 확인됐습니다. 그래서 formal 재검증은 같은 Stage 110 late lane 위에서 `legacy-root/per-player` × `rank/pnmax` 4조합으로 다시 돌렸습니다. rerun baseline은 `legacy-root + rank`였고, 24-seed + holdout 24-seed 합산 결과 `120ms`에서는 exact-best `31/48`, average score-loss `20,625`로 가장 안전했습니다. `per-player + pnmax`는 `120ms` exact-best도 `31/48`로 같았지만 average score-loss가 `25,208`까지 악화됐고, `280ms`에서는 오히려 `per-player + pnmax`가 exact-best `36/48 -> 37/48`, proven `42/48 -> 43/48`, exact-result `17/48 -> 19/48`, average score-loss `13,333 -> 10,417`로 가장 좋았습니다. 즉 **280ms 이득은 보이지만 120ms까지 포함하면 기본 late lane을 바꿀 만큼 robust하지는 않다**고 판단해, 기본값은 계속 `legacy-root + rank` 유지로 정리했습니다. 대신 benchmark tool은 이제 `--proof-metric-modes`까지 받아 조합 스크리닝을 한 번에 재현할 수 있습니다.
여기서 노출되는 정보는 다음과 같습니다.
Stage 113에서는 Stage 112가 남긴 다음 후보였던 **time-budget-conditioned late-bias package**를 실제 runtime option으로 올려 검증했습니다. 구현 표면은 `mctsProofPriorityLateBiasPackageMode = fixed | budget-conditioned`, `mctsProofPriorityLateBiasThresholdMs`, `mctsProofPriorityLateBiasMetricMode`, `mctsProofPriorityLateBiasBiasMode` 네 가지이고, 기본 가설은 `legacy-root + rank`를 유지하다가 `timeLimitMs >= 240ms`일 때만 `per-player + pnmax`로 전환하는 것이었습니다. formal 재검증에서 `200ms` 합산 48포지션 기준 `>=200ms` 전환은 exact-best `32/48 -> 31/48`, proven `38/48 -> 37/48`, average score-loss `19,167 -> 21,250`로 오히려 흔들렸습니다. `>=240ms`는 200ms에서는 activation이 0이어야 하는데도 fixed baseline과 proven/exact-result가 조금 어긋나, 이 harness가 경계 예산에서 **time-budget noise**를 가진다는 신호를 드러냈습니다. `280ms` 합산 48포지션에서는 `>=240ms` 전환이 exact-best `36/48 -> 38/48`, exact-result `18/48 -> 22/48`, average score-loss `11,667 -> 10,417`로 좋아 보였지만, 같은 Stage 113에서 추가한 duplicate-control benchmark(`>=1ms`와 `>=240ms` active duplicate, `fixed`와 `>=1000ms` inactive duplicate)를 돌려 보니 holdout 24 기준 active duplicate끼리도 exact-best `18/24 vs 19/24`, average score-loss `10,833 vs 9,167` 정도의 흔들림이 재현됐습니다. 즉 보였던 280ms 이득의 크기가 **동일 실효 설정끼리의 time-budget noise 범위와 겹친다**고 판단해, 이번 단계에서는 **package option/tool/telemetry는 채택하되 기본값은 계속 `fixed` 유지**로 정리했습니다.
Stage 114에서는 Stage 113의 다음 판단으로 **fixed-iteration / noise-reduced control benchmark**를 추가했습니다. 핵심은 Stage 113 package가 실제로 전환하려던 두 late lane, 즉 baseline `legacy-root + rank`와 target `per-player + pnmax`를 deadline jitter 없이 같은 `mctsMaxIterations` 조건에서 직접 비교하는 것이었습니다. `timeLimitMs`는 넉넉하게 두고(`10000ms`) iteration budget만 `8/12/16/24/32`로 자른 12-empties main 24-seed + holdout 24-seed 합산 48포지션 결과, `24 iterations`에서 target이 proven `38/48 -> 41/48`, exact-result `22/48 -> 23/48`, `32 iterations`에서 proven `43/48 -> 44/48`, exact-result `24/48 -> 25/48`로 proof closure를 몇 건 더 닫기는 했지만, **exact-best는 전 bucket에서 완전히 동일**했고 average score-loss도 `8 iterations 53,750`, `12 iterations 30,000`, `16 iterations 12,500`, `24 iterations 7,917`, `32 iterations 9,583`으로 끝까지 같았습니다. 합산 240 scenario 중 실제 차이가 난 경우도 4건뿐이었고, 모두 draw/win proof completion timing 차이였지 착수 strength 차이는 아니었습니다. 따라서 Stage 114에서는 **late-bias package의 기본값 승격을 다시 미채택**으로 굳히고, 다음 후보는 budget-only gate가 아니라 root/proof maturity signal 쪽으로 넘기는 것이 맞다고 정리했습니다.
Stage 115에서는 그 다음 후보로 **root-maturity / proof-maturity gate screening**을 fixed-iteration 안에서 먼저 진행했습니다. baseline `legacy-root + rank`의 root maturity telemetry(`solvedCoverageRate`, `bestMoveSolved`, `bestFiniteMetric`, `finiteMetricCount` 등)를 추출해 post-hoc composite gate를 만들고, target `per-player + pnmax`와 비교했습니다. `24/32 iterations`, main 24-seed + holdout 24-seed 합산 96 scenario 기준 baseline은 exact-best `83/96`, proven `79/96`, exact-result `39/96`, average score-loss `5,416.7`, target은 exact-best `83/96`, proven `84/96`, exact-result `41/96`, average score-loss `5,416.7`였습니다. screening 결과 **`best finite metric <= 1 or solved child`** gate가 activation `16/96`만으로 target과 scenario-by-scenario로 완전히 같은 결과를 내 가장 유력한 runtime 후보로 좁혀졌지만, 이는 어디까지나 post-hoc composite였기 때문에 기본값 승격은 보류하고 실제 runtime prototype 단계로 넘겼습니다.
Stage 116에서는 바로 그 gate를 **runtime root proof-priority ranking 안에 직접 넣어** 재검증했습니다. 구현 표면은 `mctsProofPriorityRootMaturityGateEnabled`, `mctsProofPriorityRootMaturityGateMode`, `mctsProofPriorityRootMaturityGateMetricMode`, `mctsProofPriorityRootMaturityGateBiasMode` 네 가지이고, 현재 prototype은 root에서만 `legacy-root + rank -> per-player + pnmax` 전환을 수행합니다. 그런데 fixed-iteration main 24-seed + secondary holdout24a 합산 96 scenario에서는 gate가 평균 iteration `7.0` 부근에서 **96/96 전부 활성**되어 사실상 target lane의 delayed-always-on 형태로 붕괴했고, 결과도 target과 완전히 동일했습니다. time-budget `200/280ms` 같은 96 scenario에서는 baseline / target / runtime-gate의 exact-best가 모두 `70/96`로 같았고, proven은 `83/96 -> 85/96 -> 84/96`, average score-loss는 `14,791.7 -> 13,750.0 -> 14,791.7`로 runtime gate가 target의 score-loss 이득을 끝내 재현하지 못했습니다. 즉 Stage 116의 결론은 **runtime gate prototype 자체는 채택하되, 현재 trigger는 너무 일찍 거의 항상 켜져 selective gate 역할을 하지 못하므로 기본값은 계속 off**라는 쪽입니다.
Stage 117에서는 그 prototype을 다시 완화/정교화해, root-maturity gate trigger를 `minVisits`, `best finite metric threshold`, `no solved child`, `distinct finite metric count`로 조합할 수 있게 만들었습니다. main 24-seed + holdout24a 24-seed, 총 96 scenario fixed-iteration 재검증에서는 strongest refined candidate였던 `best-metric-threshold`, `visits>=10`, `metric<=3`, `solved-child 없음` gate가 activation을 `96/96 -> 50/96`로 줄이면서도 target `per-player + pnmax` late lane을 scenario-by-scenario로 그대로 재현했습니다. 하지만 time-budget `200/280ms` 같은 96 scenario에서는 aggregate상으로 `base 78/96, 94/96, 45/96, 8,958.3 -> target/runtime 79/96, 94/96, 47/96, 8,750.0`처럼 좋아 보여도, 실제 base와 target이 갈린 두 scenario 모두 runtime gate activation이 없는 상태에서 같은 결과가 나왔습니다. 즉 refined trigger는 **선택성 자체는 확실히 개선했지만, time-budget output gain을 gate switching의 직접 효과로 귀속할 수 있을 만큼 robust하지는 않았기 때문에 기본값은 계속 off**로 유지합니다.
Stage 118에서는 이 strongest refined gate를 마지막으로 한 번 더 닫기 위해 **activation-causal audit**를 추가했습니다. 새 분석 도구는 runtime benchmark JSON을 읽어 `bestMoveCoord / score / proven / isExactResult / rootSolvedOutcome` signature 기준으로, base와 target이 실제로 갈린 scenario에서 runtime gate activation이 그 이동을 직접 설명했는지 세기 시작합니다. fixed-iteration main 24-seed + holdout24a 24-seed, 총 96 scenario에서는 changed scenario가 `5`건뿐이었고 runtime gate는 그 `5/5`를 모두 정확히 설명했습니다. 하지만 time-budget `200/280ms` duplicate rerun을 두 번 합치면 총 192 scenario에서 base-target changed scenario가 `11`건으로 늘고, runtime gate가 그중 실제로 설명한 것은 `4/11 = 36.4%`에 그쳤습니다. 즉 strongest refined gate는 fixed-iteration에서는 causal support가 완전하지만, **time-budget에서는 duplicate rerun을 합쳐도 changed scenario의 minority만 설명하므로 전역 기본값으로는 끝내 부족하다**고 정리했습니다. 이 Stage 118을 끝으로, 현재 저장소 late lane 위에서 더 밀어 볼 PN/PPN retuning 후보는 사실상 소진되었다고 보는 편이 맞습니다.
Stage 119에서는 이어서 **리팩토링 / 문서화 closeout audit**를 진행했습니다. 가장 먼저 본 후보는 proof-priority finite metric 요약을 helper로 합치고 ranking/min-max/sum 집계를 single-pass style로 바꾸는 hot-path 정리였지만, extracted Stage 117 baseline과 같은 fixed-iteration 12-empties workload로 다시 재보니 average elapsed가 main에서 `base +11.60ms`, `target +10.21ms`, `runtime-gate +5.33ms`, holdout24a에서도 `base +4.69ms`, `target +2.17ms`, `runtime-gate +4.79ms`만큼 오히려 느려졌습니다. scenario signature는 `0` diff라 출력은 유지됐지만 wall time이 악화됐기 때문에 이 refactor는 채택하지 않고 되돌렸습니다. 결과적으로 현재 저장소에는 Stage 118 causal tooling과 문서 갱신만 남았고, **권장/필수 수준의 추가 engine refactor는 더 없다고 판단해 이번 작업을 문서화로 마감**했습니다.
Stage 120에서는 여기서 한 걸음 더 나아가, 엔진 strength 자체는 건드리지 않고 **문서 기준선과 Stage/version sync를 다시 고정**했습니다. `stage-info.json`을 저장소 Stage/tag/updatedAt/summary의 단일 기준으로 명시하고, README / runtime reference / checklist / report hub의 현재 Stage 표기를 다시 맞췄으며, stale 최신 보고서 고정 링크를 generated inventory 우선 규칙으로 바꾸고 `tools/docs/check-doc-sync.mjs`와 smoke test를 추가했습니다. 또 다음 전체 전수조사를 위해 `js/ai`, `js/core`, `tools/*`를 classic search / evaluator / opening / MCTS / worker-UI boundary / tooling support 같은 audit category seed로 먼저 묶어 두었습니다.
Stage 121에서는 Step 3의 첫 후보였던 **active MPC default parity hardening**을 채택했습니다. direct `SearchEngine()` 기본 경로와 `js/test/benchmark-helpers.mjs`도 이제 worker/UI fallback과 같은 active MPC profile을 기본 상속하며, explicit `mpcProfile: null`은 follow-up override에서도 유지되는 명시적 비활성화 의미론으로 보강했습니다. representative 12-case batch에서는 best move parity가 `12/12` 유지됐고 active MPC trigger case 세트에서 평균 node/time이 줄었지만, 한 trigger case에서 non-exact score divergence는 남아 있어 이번 Stage는 strength claim이 아니라 **runtime semantics / tooling parity adoption**으로 기록합니다.
Stage 122에서는 Step 3의 두 번째 후보였던 **allocation-light search move path**를 채택했습니다. classic search의 내부 노드용 수 생성은 이제 generic `state.getSearchMoves()` 대신 `listPreparedSearchMoves()` 기반 prepared move record 경로를 기본 사용하며, move object는 ordering metadata를 고정 shape로 미리 갖고 flipCount도 별도 `popcount()` 없이 inline으로 누적합니다. baseline 재현은 `allocationLightSearchMoves: false`로 계속 가능하고, 460-state parity corpus에서는 move record diff가 `0`, official benchmark에서는 search-move micro `0.923x`, depth-limited `0.966x`, WLD-14 `0.949x`, exact-14 `0.979x`, exact-10 `1.015x`가 나왔습니다. duplicate rerun에서는 micro `0.917x`, depth-limited `0.977x`, WLD-14 `0.919x`, exact-14 `0.961x`, exact-10 `0.972x`로 sign이 유지돼, **semantics-preserving runtime cleanup**으로 채택했습니다.

Stage 123에서는 마지막 Step 3 후보였던 **opening default revalidation**을 다시 돌렸고, historical Stage 59-compatible replay(`d4 / 450ms`)와 current normal-runtime-like replay(`d6 / 1500ms`) 둘 다에서 `stage59-cap9-prior-veto`가 `stage59-prior-veto`보다 높은 agreement를 유지했습니다. 즉 current runtime 기준에서도 opening default는 **유지**가 맞고, `stage59-prior-veto`는 더 싼 대안으로만 남깁니다.

Stage 124에서는 남아 있던 다음 후보군을 다시 감사했습니다. 결론은 **새 layout family에 한정한 compact systematic short n-tuple additive pilot만 다음 실험 후보로 유지**하고, 추가 MCTS late-lane retuning / 독립 move-ordering 재튜닝 / broad hand-crafted evaluator 확장 / 5–6 empties micro-specialization 추가 확대 / broad special-ending 확장은 새 corpus·새 hotspot·새 evaluator family 변화 같은 근거가 생기기 전까지 비재개 권고로 두는 것이 맞다는 쪽이었습니다.
Stage 125에서는 그 compact family pilot을 실제로 bounded corpus + family pilot + depth/exact replay + small Trineutron sanity check까지 묶어 돌렸습니다. synthetic holdout에서는 `orthogonal-adjacent-pairs-outer2-v1`가 가장 낮은 verified MAE를 냈고, current depth replay에서는 `diagonal-adjacent-pairs-full-v1`가 same-best `27/32`로 새 family 중 가장 나았지만 elapsed는 `+7.2%`로 악화됐습니다. 18-case exact suite에서는 세 후보가 모두 exact-safe였지만, 4-game Trineutron sanity check에서는 diagonal pilot이 active baseline과 같은 score rate(`0.375`)를 내면서도 average disc margin/time/nodes가 더 나빴습니다. 그래서 **compact tuple family bounded pilot은 no-adoption으로 닫고, active runtime은 그대로 유지**합니다.
Stage 126에서는 이 결론을 뒤집지 않고, 사용자가 external corpus를 직접 학습시킬 수 있도록 **richer-corpus compact tuple suite + patch follow-up bundle**만 새로 정리했습니다. 즉 현재 저장소는 runtime semantics를 바꾸지 않은 채, 오프라인 학습 재시도에 필요한 stage-specific wrapper / config / trainer package를 함께 제공하는 상태입니다.
여기서 노출되는 정보는 다음과 같습니다.

- 루트가 exact까지 증명되었는지, 아니면 WLD만 증명되었는지
- root proof source가 direct solver / subtree propagation / exact continuation / score-bound propagation 중 어디인지
- root 후보들 중 몇 개가 solved/exact 상태인지
- score-bounds experimental lane이 켜져 있을 때 root / best move의 score bound 범위와 bound cut 발생 여부
- exact continuation이 적용되었는지, 혹은 현재 root가 continuation 창 안에 있는지

오프닝 직사용을 벗어나면 iterative deepening 기반의 alpha-beta / PVS 탐색으로 들어갑니다.
핵심 보조 장치는 다음과 같습니다.

- aspiration window
- transposition table
- killer / history ordering
- late move reductions (LMR)
- enhanced transposition cutoff (ETC)
- allocation-light prepared search move record path
- active MPC profile을 이용한 conservative fail-high 중심 runtime lane

### 2-1. 특수 종국 safety net
중반 탐색만으로는 `F7`, `E2`류의 전멸형 trap을 놓칠 수 있으므로, 현재 런타임에는 별도의 safety net을 둡니다.

- classic/MCTS 공통 **root special-ending scout**
  - root에서만 1회 실행
  - root empties `<= 44`
  - `analyzedMoves >= 2`일 때만 상위 `4~6` 후보를 3-ply 수준으로 bitboard-only 점검
  - classic 계열에서는 이 scout가 root move까지 합쳐 사실상 4-ply tactical lookahead 역할을 하므로, `maxDepth < 4`이면 자동 비활성화
- classic/WLD **internal immediate wipeout guard**
  - 내부 노드와 depth-0 leaf에서도 허용
  - 평가 함수 없이 1-ply 즉시 전멸 수를 ordering / leaf score에 반영
- MCTS **immediate wipeout bias + root threat penalty**
  - direct wipeout은 root/expansion/rollout/hybrid prior에서 즉시 반영
  - root threat penalty는 root에서만 1회, empties `<= 40`일 때 실행

즉, **깊은 특수 탐색은 root 1회, 내부 노드는 초경량 1-ply guard**라는 원칙으로 비용을 통제합니다.

### 3. 후반 ordering 단계
후반부에서는 모든 empties 구간에 같은 ordering 신호를 쓰지 않습니다.

- `10~14` empties: trained late move-ordering profile을 우선 사용
- `15~18` empties: 보수적인 lightweight fallback ordering lane 유지
- exact window 내부: generic history/positional/flip 비중을 크게 줄이고 exact late-ordering profile을 사용

추가로 Stage 78 이후에는 empties별 direct lookup과 ordering score table 캐시를 사용해 ordering hotpath를 평평하게 유지합니다.

### 4. exact / WLD 단계
말기 구간에서는 exact와 WLD를 같은 방식으로 섞지 않습니다.

- preset별 `exactEndgameEmpties`에서 exact search 진입
- custom에서만 root WLD `+2`를 선택적으로 활성화 가능
- MCTS 계열은 내부적으로 `exactEndgameEmpties + mctsSolverWldEmpties` 창에 들어오면 exact/WLD solver probe와 solved-value propagation을 사용
- `mcts-hybrid`는 continuation 창 바깥의 바로 앞 late lane에서 proof/disproof frontier rank bias를 켜서, 아직 exact lane 바깥인 subtree의 proof 순서를 조금 더 앞당깁니다
- 현재 기본 proof-priority metric은 `legacy-root`이고, 기본 bias formula는 `rank`입니다. Stage 105의 `per-player generalized proof metric`과 Stage 111의 값 기반 bias 공식(`pnmax`, `pnsum`)도 experimental option으로 남아 있지만, 현재 기본 late lane에서는 robust 채택 신호가 없어 기본값은 그대로 유지합니다.
- Stage 113의 time-budget-conditioned late-bias package와 Stage 117의 refined root-maturity gate도 둘 다 experimental 표면으로 남아 있습니다. 특히 root-maturity gate는 root proof frontier가 어느 정도 성숙했다고 판단될 때만 `legacy-root + rank -> per-player + pnmax`로 동적 전환하는 실험 lane입니다. strongest refined candidate는 여전히 `best finite metric <= 3`, `visits >= 10`, `solved child 없음` 조합이지만, Stage 118 activation-causal audit까지 합치면 fixed-iteration changed scenario는 `5/5` 설명한 반면 time-budget duplicate rerun pooled changed scenario는 `4/11 = 36.4%`만 설명해 전역 기본값으로는 계속 부족합니다.
- Stage 106의 `mctsScoreBoundsEnabled`는 experimental opt-in입니다. 켜면 root / child score lower/upper bound를 late lane에 함께 전파하고, draw subtree는 exact `0`으로 승격하며, 지배된 child는 selection에서 건너뛸 수 있습니다. Stage 108부터는 이 lane 안에서 `draw-blocker` bonus도 함께 사용해, draw root를 exact `0`으로 닫지 못하게 막는 남은 child를 조금 더 앞당겨 방문합니다. 다만 12 empties validation에서도 exact-best 기본값 우세는 끝내 확인되지 않아, 전역 기본값은 계속 `false`이고 lane 내부 기본 보너스만 `mctsScoreBoundDrawPriorityScale = 0.35`로 남겨 둡니다.
- root가 WLD proof를 얻고 root empties가 `exactEndgameEmpties + mctsExactContinuationExtraEmpties` 이하이면, 같은 deadline 안에서 exact root continuation을 1회 더 시도하고 완주 시 exact result로 승격합니다. 기본 continuation 창은 `+3`이라서 `exact=8` 기준 `11 empties`까지 handoff continuation이 붙습니다.
- Stage 110부터는 그 바로 바깥 `12 empties`에서 **adaptive post-proof continuation**도 기본 활성입니다. 현재 기본 gate는 `loss-only`, 추가 깊이 `+1`, legal-move cap 없음이며, proof-priority는 root search 동안 유지한 채 root가 `loss` WLD proof를 얻은 경우에만 post-proof exact continuation을 한 번 더 시도합니다.
- continuation 창 안에서는 proof-priority를 자동으로 끄는 handoff를 사용해, WLD proof를 얻은 뒤 남은 시간을 exact continuation에 더 집중합니다. adaptive continuation은 handoff를 넓히지 않고, handoff 창 바깥에서만 post-proof exact lane을 조건부로 덧붙입니다.
- `1~4` empties: specialized few-empties exact solver
- `5~6` empties: optimized exact micro-solver tail window
- exact lane 내부에서는 exact fastest-first reply-count ordering 유지

`optimizedFewEmptiesExactSolverEmpties`의 현재 기본 threshold는 `6`입니다.
Stage 84 검증 기준으로 `8`보다 보편적 exact workload에서 더 안정적인 선택이어서 기본값으로 채택되었습니다.

## 사용자 노출 설정과 내부 고정 경계

### 사용자에게 직접 노출되는 설정
- 난이도 프리셋 (`beginner` ~ `impossible`, `custom`)
- 스타일 프리셋 (`balanced`, `aggressive`, `fortress`, `positional`, `chaotic`, `custom`)
- AI 모드
  - `beginner`: `Classic MTD(f) / Classic PVS / MCTS Lite / MCTS Guided`
  - `easy` 이상: `Classic MTD(f) / Classic PVS / MCTS Guided / MCTS Hybrid`
- 난이도 상세 설정 / 스타일 상세 설정 대화상자
  - 메인 설정 화면에서는 사용자 지정 수치를 직접 노출하지 않고 detail dialog로 엽니다.
  - 난이도 상세 설정은 현재 탐색 계열에 맞는 fieldset만 보여 줍니다.
  - 스타일 상세 설정은 모든 계열에서 같은 evaluator scale을 편집하지만, `mcts-lite`에서는 값만 보관되고 메인 탐색에는 적용되지 않습니다.
- 설정 쿠키 저장 / 자동 복원 / 초기화
  - 사용자가 현재 설정을 cookie에 저장하면 다음 로드 때 자동 복원합니다.
  - cookie 초기화는 현재 세션 값은 유지하고, 다음 로드부터 기본값으로 돌아갑니다.
- custom 수치 입력
  - classic 계열: 깊이, aspiration window
  - 공통: 시간 제한, exact 시작 empties, root WLD `+2`, opening/search randomness, opening tie-break 무작위 선택, TT 크기
  - MCTS 계열: exploration, iteration/node cap
  - guided/hybrid 계열: proof-priority 관련 값
  - hybrid 전용: shallow minimax prior 깊이와 후보 수
  - 스타일 계열: evaluator scale 배율

### 내부에서 고정된 기본 런타임 선택
- active evaluation / move-ordering / tuple residual / MPC profile 이름
- opening hybrid 기본 key
- classic MPC는 calibrated `deepDepth`가 현재 `maxDepth`를 넘는 후보를 자동 제외
- `optimizedFewEmptiesExactSolverEmpties = 6`
- `mctsSolverEnabled = true`
- `mctsSolverWldEmpties = 2`
- `mctsExactContinuationEnabled = true`
- `mctsExactContinuationExtraEmpties = 3`
- `mctsExactContinuationAdaptiveEnabled = true`
- `mctsExactContinuationAdaptiveExtraEmpties = 1`
- `mctsExactContinuationAdaptiveOutcomeMode = loss-only`
- `mctsExactContinuationAdaptiveMaxLegalMoves = 0`
- `mcts-hybrid`에서 `mctsProofPriorityEnabled = true`, `mctsProofPriorityScale = 0.15`, `mctsProofPriorityMaxEmpties = exact + solver + 2`
- `mctsProofMetricMode = legacy-root`
- `mctsProofPriorityBiasMode = rank`
- `mctsProofPriorityLateBiasPackageMode = fixed`
- experimental late-bias package candidate: `>= 240ms -> per-player / pnmax` (기본값은 아님)
- `mctsProofPriorityRootMaturityGateEnabled = false`
- refined root-maturity gate strongest candidate: `best-metric-threshold [visits≥10, metric≤3, solved-child 없음] -> per-player / pnmax` (기본값은 아님)
- `mctsScoreBoundsEnabled = false`
- `mctsScoreBoundDrawPriorityScale = 0.35` (score-bounds lane을 켰을 때만 의미 있음)
- `mctsProofPriorityContinuationHandoffEnabled = true`
- special-ending safety net activation rule
  - root scout: root only / empties `<= 44`
  - MCTS root threat: root only / empties `<= 40`
  - internal guard: 1-ply immediate wipeout only
- exact fastest-first ordering on
- worker / UI fallback / direct `SearchEngine`의 active MPC 기본 의미론 정렬

### 현재 기본 런타임에 남기지 않은 것
- `stabilityCutoff*` 런타임 pruning 토글
- `exactFastestCutFirstOrdering` 별도 토글
- 강한 프리셋에서의 자동 root WLD `+2`
- proof-number search / PN/PPN full-mode, transposition-aware MCTS graph, RAVE/AMAF 같은 더 무거운 실험 lane
- `mctsProofMetricMode = per-player`의 기본값 승격. 현재는 experimental opt-in만 허용합니다.
- `mctsScoreBoundsEnabled = true`의 기본값 승격. Stage 108까지의 재검증에서도 12 empties late lane에서 draw exact closure / proof completion 개선은 있었지만 robust exact-best 기본값 이득은 끝내 부족했으므로, 계속 experimental opt-in으로만 남깁니다.
- `mctsProofPriorityLateBiasPackageMode = budget-conditioned`의 기본값 승격. Stage 113 duplicate-control에서는 280ms 이득이 time-budget noise 범위와 겹쳤고, Stage 114 fixed-iteration control에서도 `per-player + pnmax`가 proof completion만 약간 더 닫을 뿐 exact-best / average score-loss 우세는 끝내 만들지 못해 기본값으로는 계속 보류합니다.
- `mctsProofPriorityRootMaturityGateEnabled = true`의 기본값 승격. Stage 116 runtime prototype은 거의 항상 너무 일찍 켜졌고, Stage 117 refined trigger는 activation을 줄이면서 fixed-iteration target 재현까지는 회수했습니다. 그러나 Stage 118 activation-causal audit까지 합치면 time-budget duplicate rerun pooled changed scenario를 `4/11 = 36.4%`만 설명해, gate activation이 output gain의 직접 원인이라고 보기에는 여전히 부족하므로 기본값으로는 계속 보류합니다.
- 다만 Sensei류의 proof-oriented UI annotation은 일부 telemetry 형태로 이미 도입되었고, 이는 full PN/PPN mode와는 별개의 관측/UX lane으로 유지합니다.
- Stage 125 bounded compact tuple family pilot은 당시 no-adoption으로 닫혔지만, 이후 Stage 126 richer external weight-learning → Stage 144 confirmation → Stage 145 move-ordering compatibility replay → Stage 146 final adoption gate → Stage 147 install/post-adoption validation을 거치며 lane이 다시 열렸습니다. 현재 active tuple residual은 `diagonal-top24-latea-endgame-patched-calibrated`, active move-ordering은 `trained-move-ordering-linear-v2`이고, pre-switch baseline은 `tools/engine-match/fixtures/historical-installed-modules/active-precompact-tuple.learned-eval-profile.generated.js`에 archive되어 있습니다.
- 독립 move-ordering 재튜닝, broad hand-crafted evaluator 확장, 5–6 empties 추가 미세 특화, broad special-ending 확장은 현재 저장소 기준으로는 비재개 권고입니다. 새 failure corpus나 profiling hotspot, evaluator family 변화가 생긴 뒤에만 다시 봅니다.

## 유지보수 메모
- **TT 의미가 바뀌는 옵션**(`wldPreExactEmpties` 등)이 바뀌면 전이표를 바로 비웁니다.
- 반대로 theme/accessibility 같은 UI-only 변경은 AI 엔진 재시작 원인이 되지 않도록 분리되어 있습니다.
- 설정 UI의 탐색 계열별 안내 문구와 fieldset 노출 규칙은 `js/ui/settings-search-algorithm-presentations.js`를 단일 기준으로 유지합니다. lite/guided/hybrid/classic 문구를 바꿀 때는 이 helper를 먼저 수정하는 편이 안전합니다.
- dialog fallback/open-close 규칙은 `js/ui/dialog-utils.js`를 공용 기준으로 유지합니다. settings dialog와 수동 착수 dialog가 같은 helper를 공유합니다.
- Stage 86 이후 stability 평가 hotpath는 axis/direction lookup flattening과 unstable-disc-only refinement scan을 사용합니다. 결과를 바꾸지 않고 evaluator 비용만 낮추는 방향의 정리입니다.
- 보고서에는 과거 실험이 남아 있으므로, “보고서에 있다 = 현재 런타임에 있다”로 읽지 말고 이 문서나 체크리스트를 우선 기준으로 삼는 것이 안전합니다.

## 검증 진입점
```bash
node tools/docs/check-doc-sync.mjs
node tools/docs/generate-report-inventory.mjs --check
node js/test/core-smoke.mjs
node js/test/perft.mjs
node js/test/stage83_custom_wld_toggle_smoke.mjs
node js/test/stage86_stability_hotpath_smoke.mjs
node js/test/stage88_mcts_lite_smoke.mjs
node js/test/stage89_mcts_guided_smoke.mjs
node js/test/stage90_search_algorithm_pair_benchmark_smoke.mjs
node js/test/stage91_mcts_hybrid_smoke.mjs
node js/test/stage91_search_algorithm_pair_hybrid_smoke.mjs
node js/test/stage92_search_algorithm_pair_multiseed_smoke.mjs
node js/test/stage93_search_algorithm_availability_and_throughput_smoke.mjs
node js/test/stage94_special_ending_scout_smoke.mjs
node js/test/stage95_immediate_wipeout_guard_smoke.mjs
node js/test/stage96_mcts_immediate_wipeout_bias_smoke.mjs
node js/test/stage97_mcts_root_threat_penalty_smoke.mjs
node js/test/stage98_special_ending_regression_suite.mjs
node js/test/stage100_mcts_solver_runtime_smoke.mjs
node js/test/stage100_mcts_solver_late_accuracy_smoke.mjs
node js/test/stage101_mcts_exact_continuation_runtime_smoke.mjs
node js/test/stage101_mcts_exact_continuation_benchmark_smoke.mjs
node js/test/stage102_mcts_proof_telemetry_runtime_smoke.mjs
node js/test/stage103_mcts_proof_priority_runtime_smoke.mjs
node js/test/stage103_mcts_proof_priority_benchmark_smoke.mjs
node js/test/stage104_mcts_continuation_bridge_runtime_smoke.mjs
node js/test/stage104_mcts_continuation_bridge_benchmark_smoke.mjs
node js/test/stage105_mcts_generalized_proof_metric_runtime_smoke.mjs
node js/test/stage105_mcts_generalized_proof_metric_benchmark_smoke.mjs
node js/test/stage106_mcts_score_bounds_runtime_smoke.mjs
node js/test/stage106_mcts_score_bounds_benchmark_smoke.mjs
node js/test/stage107_mcts_true_score_bounds_runtime_smoke.mjs
node js/test/stage107_mcts_true_score_bounds_benchmark_smoke.mjs
node js/test/stage108_mcts_score_bound_draw_priority_runtime_smoke.mjs
node js/test/stage108_mcts_score_bound_draw_priority_benchmark_smoke.mjs
node js/test/stage109_mcts_refactor_runtime_smoke.mjs
node js/test/stage110_mcts_adaptive_continuation_runtime_smoke.mjs
node js/test/stage110_mcts_adaptive_continuation_benchmark_smoke.mjs
node js/test/stage111_mcts_proof_priority_bias_mode_runtime_smoke.mjs
node js/test/stage111_mcts_proof_priority_bias_mode_benchmark_smoke.mjs
node js/test/stage112_mcts_proof_metric_bias_combo_benchmark_smoke.mjs
node js/test/stage113_mcts_late_bias_package_runtime_smoke.mjs
node js/test/stage113_mcts_late_bias_package_benchmark_smoke.mjs
node js/test/stage114_mcts_late_bias_package_fixed_iterations_benchmark_smoke.mjs
node js/test/stage115_mcts_root_maturity_gate_fixed_iterations_benchmark_smoke.mjs
node js/test/stage116_mcts_root_maturity_gate_runtime_smoke.mjs
node js/test/stage116_mcts_root_maturity_gate_runtime_benchmark_smoke.mjs
node js/test/stage109_report_inventory_smoke.mjs
node js/test/stage120_documentation_sync_smoke.mjs
node js/test/stage121_active_mpc_default_parity_smoke.mjs
node js/test/stage122_allocation_light_search_moves_smoke.mjs
node js/test/stage123_opening_default_revalidation_smoke.mjs
node js/test/stage125_compact_tuple_family_pilot_smoke.mjs
node js/test/stage126_custom_setting_groups_smoke.mjs
node js/test/stage126_search_engine_custom_style_support_smoke.mjs
node js/test/stage126_weight_learning_bundle_smoke.mjs
node js/test/stage127_settings_cookie_smoke.mjs
node js/test/stage128_opening_tie_randomization_smoke.mjs
node js/test/stage128_classic_depth_gate_smoke.mjs
node js/test/stage129_settings_ui_presentation_smoke.mjs
node js/test/stage132_classic_mtdf_search_driver_smoke.mjs
node js/test/stage136_balanced13_support_stack_bundle_smoke.mjs
node js/test/stage137_mtdf_root_light_probe_smoke.mjs
node js/test/stage138_pvs_aspiration_defaults_smoke.mjs
node js/test/stage139_mtdf_etc_suppression_smoke.mjs
node js/test/stage142_trineutron_algorithm_modes_smoke.mjs
node js/test/stage143_release_defaults_smoke.mjs
```

현재 권장 offline learning bundle을 다시 돌릴 때는 다음 진입점을 사용합니다.

```bash
node tools/evaluator-training/run-stage126-weight-learning-bundle.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --phase eta

node tools/evaluator-training/run-stage126-weight-learning-bundle.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --output-root tools/evaluator-training/out/stage126-weight-learning \
  --resume

node tools/evaluator-training/run-stage126-weight-learning-bundle.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --output-root tools/evaluator-training/out/stage126-weight-learning \
  --phase patch \
  --resume
```

late solver 정확도/증명율 비교가 필요하면 다음도 사용합니다.

```bash
node tools/engine-match/benchmark-mcts-solver-late-accuracy.mjs \
  --repo-root . \
  --time-ms 40 \
  --empties-list 9,10,11,12 \
  --seed-list 17,31,41,53 \
  --output-json benchmarks/stage100_mcts_solver_late_accuracy_40ms_20260410.json
```

root exact continuation off/on 비교가 필요하면 다음도 사용합니다.

```bash
node tools/engine-match/benchmark-mcts-exact-continuation.mjs   --repo-root .   --time-ms 280   --empties-list 9,10   --seed-list 17,31,41,53   --output-json benchmarks/stage101_mcts_exact_continuation_280ms_20260410.json
```

proof-priority off/on 및 scale screening이 필요하면 다음도 사용합니다.

```bash
node tools/engine-match/benchmark-mcts-proof-priority.mjs \
  --repo-root . \
  --time-ms 280 \
  --empties-list 9,10,11,12 \
  --seed-list 17,31,41,53 \
  --proof-priority-scale-list 0.15,0.35,0.65 \
  --proof-priority-max-empties 12 \
  --output-json benchmarks/stage103_mcts_proof_priority_280ms_20260410.json
```

proof-priority ↔ exact continuation 접속부 비교가 필요하면 다음도 사용합니다.

```bash
node tools/engine-match/benchmark-mcts-continuation-bridge.mjs \
  --repo-root . \
  --time-ms 120 \
  --empties-list 9,10,11,12 \
  --seed-list 11,17,21,31,41,53,71,89 \
  --output-json benchmarks/stage104_mcts_continuation_bridge_120ms_20260410.json
```

legacy-root vs per-player generalized proof metric 비교가 필요하면 다음도 사용합니다.

```bash
node tools/engine-match/benchmark-mcts-proof-metric-mode.mjs \
  --repo-root . \
  --empties-list 12 \
  --seed-list 15,17,31,41,47,53,71,89,107,123,149,167 \
  --time-ms 120 \
  --output-json benchmarks/stage105_mcts_proof_metric_mode_12empties_120ms_20260411.json
```

rank vs PNMax/PNSum proof-priority bias formula screening이 필요하면 다음도 사용합니다.

```bash
node tools/engine-match/benchmark-mcts-proof-priority-bias-mode.mjs \
  --repo-root . \
  --empties-list 12 \
  --seed-list 15,17,31,41,47,53,71,89,107,123,149,167,191,223,257,281,307,331,359,383,419,443,467,491 \
  --time-ms 280 \
  --proof-priority-bias-modes rank,pnmax,pnsum \
  --output-json benchmarks/stage111_mcts_proof_priority_bias_mode_12empties_280ms_24seeds_20260411.json
```

proof metric × bias formula 조합 screening이 필요하면 같은 도구에 `--proof-metric-modes`를 추가해 다음처럼 사용합니다.

```bash
node tools/engine-match/benchmark-mcts-proof-priority-bias-mode.mjs \
  --repo-root . \
  --empties-list 12 \
  --seed-list 15,17,31,41,47,53,71,89,107,123,149,167,191,223,257,281,307,331,359,383,419,443,467,491 \
  --time-ms 280 \
  --proof-metric-modes legacy-root,per-player \
  --proof-priority-bias-modes rank,pnmax \
  --output-json benchmarks/stage112_mcts_proof_metric_bias_combo_12empties_280ms_24seeds_20260411.json
```

refined root-maturity gate를 fixed-iteration / time-budget 둘 다 비교하려면 다음 도구를 사용합니다.

```bash
node tools/engine-match/benchmark-mcts-root-maturity-gate-runtime.mjs \
  --repo-root . \
  --mode time-budget \
  --empties-list 12 \
  --seed-list 15,17,31,41,47,53,71,89,107,123,149,167,191,223,257,281,307,331,359,383,419,443,467,491 \
  --time-ms-list 200,280 \
  --root-maturity-gate-mode best-metric-threshold \
  --root-maturity-gate-min-visits 10 \
  --root-maturity-gate-best-metric-threshold 3 \
  --root-maturity-gate-require-no-solved-child true \
  --output-json benchmarks/stage117_root_gate_refinement_timebudget_main24_v10.json
```

score-bounds lane 안의 draw-blocker 우선순위 비교가 필요하면 다음도 사용합니다.

```bash
node tools/engine-match/benchmark-mcts-score-bound-draw-priority.mjs \
  --repo-root . \
  --time-ms 280 \
  --empties-list 12 \
  --seed-list 15,17,31,41,47,53,71,89,107,123,149,167,191,223,257,281,307,331,359,383,419,443,467,491 \
  --output-json benchmarks/stage108_mcts_score_bound_draw_priority_12empties_280ms_20260411.json
```

처리량 비교가 필요하면 다음도 사용합니다.

```bash
node tools/engine-match/benchmark-mcts-throughput-compare.mjs \
  --candidate-root . \
  --baseline-root /path/to/stage92-repo \
  --time-ms-list 160,280,500 \
  --position-seed-list 17,31,41,53,71,89 \
  --opening-plies 12 \
  --random-mode constant-zero \
  --output-json benchmarks/stage93_mcts_refactor_throughput_compare.json
```

필요하면 그 다음에 `python3 tests/ui_smoke.py`, `python3 tests/virtual_host_smoke.py`로 브라우저/모듈 로드까지 확인합니다.
