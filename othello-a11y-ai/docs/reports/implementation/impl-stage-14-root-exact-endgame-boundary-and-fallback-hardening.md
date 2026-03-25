# 구현 보고서 Stage 14 — root exact endgame 경계 수정 및 fallback 하드닝

## 1. 배경 / 목표
사용자 실전 재현 수순에서, 빈칸이 17~21칸 남은 구간부터 AI가 깊이를 제대로 못 읽고 비정상 수를 선택하는 증상이 확인됐다. 특히 `exactEndgameEmpties=16`, `maxDepth=10` 설정에서 다음과 같은 문제가 재현됐다.

- 39수 `G1` 이후(백 차례, 21 empties): 완료 깊이 4
- 41수 `A2` 이후(백 차례, 19 empties): 완료 깊이 2
- 43수 `G5` 이후(백 차례, 17 empties): 완료 깊이 0, 평가값 `-1000000000`

목표는 다음 두 가지였다.

1. `exactEndgameEmpties`를 **루트 실제 게임 상태 기준 경계**로 해석하도록 고친다.
2. 어떤 이유로든 반복 심화가 한 번도 완료되지 못했을 때, UI에 내부 센티널 값 `±10^9`가 노출되지 않도록 fallback을 안전하게 만든다.

## 2. 변경 범위
- `js/ai/search-engine.js`
- `js/test/core-smoke.mjs`
- `benchmarks/stage14_subtree_exact_boundary_regression.json`
- `docs/reports/README.md`

## 3. 핵심 원인
기존 `negamax()`는 모든 내부 노드에서 아래 조건을 다시 평가했다.

- `empties <= exactEndgameEmpties`

이 때문에 루트가 17, 19, 21 empties인 경우에도 탐색 도중 자식/손자 노드가 16 empties 이하로 내려가면 그 지점부터 정확 끝내기 탐색이 켜졌다. 결과적으로:

- 21 empties 루트는 대략 깊이 5 부근에서 사실상 16-ply exact로 변질
- 19 empties 루트는 깊이 3 부근에서 exact로 변질
- 17 empties 루트는 깊이 1만 들어가도 바로 exact로 변질

마지막 케이스에서는 depth-1 iteration 자체가 제한 시간 안에 끝나지 못해 `runIterativeDeepening()`가 완료 결과를 하나도 남기지 못했고, `findBestMove()`의 fallback 객체에 들어 있던 내부 센티널 `-INFINITY`가 그대로 UI까지 흘러갔다.

## 4. 구현 내용
### 4.1 root exact 경계 고정
`findBestMove()`에서 루트 상태의 empties를 기준으로 `rootExactEndgame`를 한 번만 계산하고, 이를 전체 탐색에 전달하도록 바꿨다.

- `searchRoot(..., rootExactEndgame)`
- `searchForcedPassRoot(..., rootExactEndgame)`
- `negamax(..., rootExactEndgame)`

`negamax()` 내부에서는 더 이상 현재 노드 empties로 exact 여부를 다시 켜지 않는다.

즉, 이번 탐색의 성격은 아래처럼 고정된다.

- 루트 empties `<= exactEndgameEmpties`: 정확 끝내기 탐색
- 루트 empties `> exactEndgameEmpties`: 끝까지 depth-limited 탐색

### 4.2 fallback 결과 하드닝
루트 반복 심화가 0회 완료되어도 내부 센티널이 노출되지 않도록 `buildRootFallback()`를 추가했다.

이 fallback은:
- 루트 legal move들을 기존 ordering 로직으로 정렬하고
- 각 후보의 1-ply 후속 상태를 간단 평가해
- **유한한 score**와 **유한한 candidate score 목록**을 구성한다.

이제 timeout 등으로 `runIterativeDeepening()`이 `null`을 반환해도,
- `bestMoveIndex`
- `bestMoveCoord`
- `score`
- `analyzedMoves[*].score`

모두 유한값을 유지한다.

## 5. 검증 방법과 결과
### 5.1 자동 테스트
다음 테스트를 통과했다.

- `node js/test/core-smoke.mjs`
- `node js/test/perft.mjs`
- `python3 tests/ui_smoke.py`
- `python3 tests/virtual_host_smoke.py`

### 5.2 신규 회귀 테스트
`js/test/core-smoke.mjs`에 두 가지 회귀 테스트를 추가했다.

1. **subtree exact boundary regression**
   - 주신 수순의 43수 `G5` 직후(백 차례, 17 empties) 포지션 사용
   - `maxDepth=1`, `exactEndgameEmpties=16`
   - `solveSmallExact()`를 강제로 예외 발생하도록 덮어쓴 뒤 검색
   - 테스트가 통과한다는 것은, 루트가 exact 경계 밖일 때 depth-1 search가 subtree exact로 내려가지 않았다는 뜻이다.

2. **fallback finite-score regression**
   - `runIterativeDeepening()`를 강제로 `null` 반환하게 덮어씀
   - fallback 결과의 전체 score와 analyzed move score들이 모두 finite인지 확인

## 6. 재현 데이터
`benchmarks/stage14_subtree_exact_boundary_regression.json`에 수정 전/후 비교 결과를 기록했다.

핵심 수치:

- 39수 `G1` 직후(백 차례, 21 empties)
  - 수정 전: depth 4
  - 수정 후: depth 10
- 41수 `A2` 직후(백 차례, 19 empties)
  - 수정 전: depth 2
  - 수정 후: depth 9
- 43수 `G5` 직후(백 차례, 17 empties)
  - 수정 전: depth 0, score `-1000000000`, best `G2`
  - 수정 후: depth 10, score `135605`, best `G7`

## 7. 리스크 / 비채택 항목
- transposition table의 exact entry는 여전히 언제든 재사용될 수 있다. 이는 “subtree exact를 새로 켜는 것”이 아니라 이미 계산된 정확값 재활용이므로 유지했다.
- root exact 위치에서 반복 심화를 1회로 줄이는 최적화는 이번 단계에서 넣지 않았다. 정확성 이슈를 먼저 해결하고, exact root의 UX/속도 다듬기는 별도 단계로 남긴다.
- UI 문구를 `정확 끝내기` 여부까지 더 자세히 표시하는 개선도 이번에는 범위 밖으로 두었다.

## 8. 다음 단계
- 필요하면 exact root 상태에서의 반복 심화 단축과 표시 개선을 별도 최적화로 다룬다.
- 이후 단계는 WTHOR/expert-game 기반 ordering / evaluator tuning scaffold로 이어가는 것이 자연스럽다.
