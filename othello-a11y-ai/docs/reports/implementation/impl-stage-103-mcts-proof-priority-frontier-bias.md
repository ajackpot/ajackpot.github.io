# Stage 103 — MCTS proof-priority frontier bias

## 요약

이번 단계에서는 Stage 102에서 조사해 둔 Sensei류 proof-oriented lane과 PN/PPN 문헌을 바탕으로, **full PN/PPN 모드가 아니라 late solved-subtree lane에 붙는 경량 proof-priority bias**를 실제 코드로 넣고 벤치까지 돌려 채택 여부를 판정했다.

최종 판정은 **채택**이다.

다만 채택 의미는 분명히 제한적이다.

- 채택 대상: `mcts-hybrid` late lane의 **proof/disproof frontier priority bias**
- 비채택 대상: 전 게임용 독립 **PN/PPN top-level mode**
- 기본값: `mcts-hybrid`에서 `mctsProofPriorityEnabled = true`, `mctsProofPriorityScale = 0.15`
- 기본 late window: `mctsProofPriorityMaxEmpties = exactEndgameEmpties + mctsSolverWldEmpties + 2`
  - Stage 103 벤치 설정(`exact=8`, `solverWld=2`)에서는 실질적으로 `12 empties`

## 이번 단계에서 실제로 구현한 것

### 1. `js/ai/mcts.js`

late solver가 이미 있는 트리 위에 proof-number style bookkeeping을 얹었다.

- node에 `proofNumber`, `disproofNumber` 유지
- solved node / leaf / partial internal node에 대해 proof/disproof refresh 추가
- child selection에서 proof/disproof frontier rank를 **rank-normalized bonus**로 변환해 score에 합산
- root analyzed move에 PN 관련 annotation 추가
  - `pnProofNumber`
  - `pnDisproofNumber`
  - `pnRootRank`
  - `pnRootSelectionBonus`
- root result에 다음 필드 추가
  - `mctsRootProofNumber`
  - `mctsRootDisproofNumber`
  - `mctsProofPriorityMetric`

구현은 full generalized PN-MCTS가 아니라, 현재 코드베이스에 무리 없이 꽂히는 **root-player proof/disproof metric + rank bonus** 쪽으로 제한했다.

### 2. `js/ai/search-engine.js`

런타임 옵션과 telemetry를 연결했다.

- 새 옵션 파싱
  - `mctsProofPriorityEnabled`
  - `mctsProofPriorityScale`
  - `mctsProofPriorityMaxEmpties`
- 기본값 정책
  - `mcts-hybrid`에서만 기본 활성
  - 기본 scale `0.15`
  - 기본 empties window는 `exact + solver + 2`
- stats 추가
  - `mctsProofNumberUpdates`
  - `mctsProofPrioritySelectionNodes`
  - `mctsProofPriorityRankedChildren`
- `mctsProofTelemetry` 확장
  - proof-priority on/off
  - scale / max empties / depth eligibility
  - root proof/disproof number
  - best-move proof rank/bonus

### 3. `js/ui/formatters.js`

proof summary 문장에 proof-priority 메모를 노출했다.

예:

`루트 미증명, 후보 증명 2/3 ..., 출처 미상, proof-priority x0.15 (proof-rank).`

또한 설정 리스트에서도 `MCTS proof-priority` 항목을 확인할 수 있게 했다.

### 4. 새 벤치/스모크 추가

- `tools/engine-match/benchmark-mcts-proof-priority.mjs`
- `js/test/stage103_mcts_proof_priority_runtime_smoke.mjs`
- `js/test/stage103_mcts_proof_priority_benchmark_smoke.mjs`

## 벤치 설계

이번 단계의 목적은 “전체 게임 강도 일반 향상”이 아니라 **late proof acceleration / exact-best 회복** 여부를 보는 것이므로, Stage 100/101과 같은 late-position exact-reference benchmark를 기준으로 삼았다.

비교 설정은 다음과 같다.

- algorithm: `mcts-hybrid`
- solver: on
- exact continuation: off
  - proof-priority 자체 효과를 분리하기 위해 continuation은 끔
- main screening empties: `9,10,11,12`
- seeds: `17,31,41,53`
- reference: classic exact
- scale 후보: `0.15 / 0.35 / 0.65`
- negative control: `maxEmpties = 10`
- validation: `12 empties` 전용 8-seed 재검증

## 벤치 결과

### A. 120ms screening (`9~12 empties`, 16 positions)

baseline off:

- exact-best hit `8/16 = 50.0%`
- WLD agreement `16/16 = 100%`
- proven `12/16 = 75.0%`
- average score loss `38750`

scale `0.15`, `maxEmpties = 12`:

- exact-best hit `9/16 = 56.25%`
- WLD agreement `16/16 = 100%`
- proven `12/16 = 75.0%`
- average score loss `31250`

핵심은 **12-empties bucket**이다.

- off: exact-best `1/4 = 25%`, average score loss `100000`
- `0.15`: exact-best `2/4 = 50%`, average score loss `70000`

즉 120ms에서는 proof-priority 효과가 `9~11 empties`보다 **solver 직전 바깥쪽 12 empties**에서만 실제로 잡혔다.

### B. 280ms screening (`9~12 empties`, 16 positions)

baseline off:

- exact-best hit `9/16 = 56.25%`
- WLD agreement `16/16 = 100%`
- proven `15/16 = 93.75%`
- average score loss `31250`

scale `0.15`, `maxEmpties = 12`:

- exact-best hit `10/16 = 62.5%`
- WLD agreement `16/16 = 100%`
- proven `16/16 = 100%`
- average score loss `15000`

여기서도 핵심은 again `12 empties`였다.

- off: exact-best `2/4 = 50%`, proven `3/4 = 75%`, avg score loss `70000`
- `0.15`: exact-best `3/4 = 75%`, proven `4/4 = 100%`, avg score loss `5000`

즉 280ms에서는 **root proof completion**과 **exact-best recovery**가 둘 다 개선됐다.

### C. negative control — `maxEmpties = 10`

같은 280ms, scale `0.35`에서 `maxEmpties = 10`으로 줄이면 결과가 오히려 나빠졌다.

전체:

- off: exact-best `56.25%`, proven `93.75%`, avg score loss `31250`
- max10: exact-best `56.25%`, proven `87.5%`, avg score loss `40000`

특히 `12 empties`:

- off: proven `75%`, avg score loss `70000`
- max10: proven `50%`, avg score loss `105000`

즉 proof-priority는 **solver lane 자체와 같은 창(10 empties)** 에서 켜면 거의 inert하고, 실제로 의미가 생기는 위치는 **solver lane보다 2 empties 앞선 12 empties** 근방이었다.

### D. scale validation — `12 empties`, 8 seeds

120ms:

- off: exact-best `50%`, proven `12.5%`
- `0.15`: exact-best `50%`, proven `25%`
- `0.35`: exact-best `37.5%`, proven `25%`

280ms:

- off: exact-best `50%`, proven `87.5%`
- `0.15`: exact-best `50%`, proven `87.5%`
- `0.35`: exact-best `50%`, proven `87.5%`

이 재검증 기준으로는 `0.15`가 `0.35`보다 **동일하거나 더 안전한 쪽**이었다.
120ms 12-empties 검증에서 `0.35`가 exact-best를 1개 더 잃은 반면, `0.15`는 그 하락이 없었다.

## 해석

이번 prototype은 full PN/PPN 모드가 아니다.

정확히는 다음과 같이 해석하는 편이 맞다.

- late subtree가 아직 완전 solve는 아니지만, proof/disproof frontier 쪽으로 **어느 child를 먼저 더 파 볼지**를 미세 조정하는 lane
- solver / continuation이 실제 값을 확정하는 기존 Stage 100/101 구조는 그대로 둠
- proof-priority는 그 앞단에서 **증명 순서**를 살짝 정렬하는 역할만 맡음

그래서 이 기능은 다음과 같은 특성을 보였다.

- `9~11 empties`에서는 이미 solver/continuation 영향이 강해 큰 차이가 거의 없음
- `12 empties` 같은 solver 직전 바깥쪽에서만 눈에 띄는 차이 발생
- WLD agreement는 유지하면서, proof completion과 exact-best recovery가 조금 개선됨

즉 이 기능은 “엔진 전체를 PN 엔진으로 바꾼다”가 아니라, **기존 MCTS late lane에 proof-ordering hint를 붙여 놓는다**는 의미로 보는 편이 정확하다.

## 채택 결정

채택한다.

채택 설정은 다음과 같다.

- `mcts-hybrid` 기본 활성
- `mctsProofPriorityScale = 0.15`
- `mctsProofPriorityMaxEmpties = exactEndgameEmpties + mctsSolverWldEmpties + 2`

채택 이유는 다음 세 가지다.

1. `maxEmpties = 10`은 무의미하거나 오히려 나빴고, `+2`에서만 late bucket 개선이 재현됐다.
2. `0.15`는 screening/validation 전체에서 **가장 보수적이면서 손해가 적은 scale**이었다.
3. WLD agreement를 떨어뜨리지 않고 root proof completion / exact-best recovery를 개선했다.

## 이번 단계에서 채택하지 않은 것

- full PN/PPN top-level mode
- per-player generalized proof-number bookkeeping 전체 도입
- PPNS/PPN 전용 root move selector
- transposition-aware PN graph

이들은 여전히 다음 연구 lane으로 남긴다.
다만 이제는 proof telemetry와 frontier bias가 이미 있으므로, 다음부터는 “문헌 아이디어를 넣었다”가 아니라 **실제로 어떤 bucket의 proof completion이 빨라졌는지**를 바로 재볼 수 있게 되었다.

## 회귀 확인

다음을 다시 실행해 모두 통과했다.

- `node js/test/core-smoke.mjs`
- `node js/test/stage100_mcts_solver_runtime_smoke.mjs`
- `node js/test/stage100_mcts_solver_late_accuracy_smoke.mjs`
- `node js/test/stage101_mcts_exact_continuation_runtime_smoke.mjs`
- `node js/test/stage101_mcts_exact_continuation_benchmark_smoke.mjs`
- `node js/test/stage102_mcts_proof_telemetry_runtime_smoke.mjs`
- `node js/test/stage103_mcts_proof_priority_runtime_smoke.mjs`
- `node js/test/stage103_mcts_proof_priority_benchmark_smoke.mjs`

## 산출물

- `benchmarks/stage103_mcts_proof_priority_120ms_20260410.json`
- `benchmarks/stage103_mcts_proof_priority_280ms_20260410.json`
- `benchmarks/stage103_mcts_proof_priority_280ms_max10_20260410.json`
- `benchmarks/stage103_mcts_proof_priority_12empties_120ms_scale_validation_20260410.json`
- `benchmarks/stage103_mcts_proof_priority_12empties_280ms_scale_validation_20260410.json`
- `benchmarks/stage103_mcts_proof_priority_adoption_summary_20260410.json`

## 다음 단계 후보

가장 자연스러운 다음 절편은 다음 둘 중 하나다.

1. **proof-priority를 per-player / draw-aware generalized metric으로 확장**해서 late draw bucket에서의 민감도를 올리는 것
2. **proof-priority + exact continuation 접속부**를 다시 재검증해서, root proof가 난 뒤 exact continuation completion까지 연쇄적으로 빨라지는지 보는 것
