# 구현 보고서 Stage 18 — Strict Root-Only WLD Pre-Exact 모드 도입

## 1. 배경 / 목표
이번 단계의 목표는 승무패 탐색(WLD search)을 단순한 속도 최적화가 아니라,
**정확 끝내기 직전 구간에서 결과 보장을 강화하는 보수적 기능**으로 검토하는 것이었다.

이번 단계에서 특히 지켜야 할 제약은 다음 두 가지였다.

1. `empties <= exactEndgameEmpties` 에서는 **절대로 WLD로 들어가지 않는다.**
2. depth-limited 탐색, exact 탐색, WLD 탐색은 **한 탐색 흐름 안에서 서로 섞이지 않는다.**

즉, 이번 구현은 “exact solver가 가능한 구간에서 멍청하게 WLD를 먼저 도는” 형태도 아니고,
“depth-limited search 도중 갑자기 WLD로 바뀌는” 형태도 아니다.
오직 **root 기준 pre-exact 구간**에서만 별도 WLD 모드로 진입한다.

## 2. 변경 범위
- `js/ai/search-engine.js`
- `js/ui/formatters.js`
- `js/test/core-smoke.mjs`
- `benchmarks/stage18_wld_pre_exact_root_benchmark.json`
- `docs/reports/implementation/impl-stage-18-strict-root-wld-pre-exact-mode.md`
- `docs/reports/review/review-stage-18-wld-pre-exact-root-benchmark.md`
- `docs/reports/README.md`

## 3. 핵심 구현 내용
### 3.1 `wldPreExactEmpties` 옵션 추가
실험용 옵션 `wldPreExactEmpties` 를 추가했다.
이 값은 `0 ~ 2` 로 제한했고, 의미는 다음과 같다.

- `0`: WLD pre-pass 비활성화
- `1`: `exactEndgameEmpties + 1` 에서만 root WLD 허용
- `2`: `exactEndgameEmpties + 2` 까지 root WLD 허용

기본값은 다음과 같이 보수적으로 잡았다.

- `maxDepth >= 8` 또는 `timeLimitMs >= 3000` 인 비교적 강한 탐색 설정에서는 기본 `1`
- 그보다 얕고 싼 탐색 설정에서는 기본 `0`

즉, shallow setting에서는 기본적으로 꺼져 있고,
late-endgame 품질 보강 효과를 기대할 수 있는 강한 설정에서만 자동으로 켜진다.

### 3.2 root 전용 진입 조건
WLD는 다음 조건을 **모두 만족할 때만** root에서 활성화된다.

- `rootEmptyCount > exactEndgameEmpties`
- `wldPreExactEmpties > 0`
- `rootEmptyCount <= exactEndgameEmpties + wldPreExactEmpties`

이 덕분에 exact 경계 내부는 언제나 기존 exact solver가 담당하고,
그보다 멀리 떨어진 구간은 기존 depth-limited search가 유지된다.

### 3.3 WLD 전용 solver를 별도 분리
이번 단계의 가장 중요한 구현 포인트는 **탐색기 분리**였다.
추가된 경로는 다음과 같다.

- `searchWldRoot()`
- `searchWldForcedPassRoot()`
- `wldNegamax()`
- `solveSmallWld()` / `solveSmallWldBoards()`

이 경로는 다음 원칙을 따른다.

- WLD root는 **iterative deepening을 사용하지 않는다.**
- WLD root는 일반 `negamax()` 를 호출하지 않는다.
- WLD path는 `solveSmallExact()` 를 호출하지 않고,
  별도의 WLD small solver만 사용한다.
- 반대로 exact root와 ordinary depth-limited root는 WLD solver를 호출하지 않는다.

즉, 이번 단계 구현은 root에서 탐색 모드를 **한 번 결정하면 끝까지 그 모드만 유지**한다.

### 3.4 WLD용 점수 / TT 처리
WLD는 정확한 석차가 아니라 승/무/패만 필요하므로,
전용 점수 체계를 다음과 같이 뒀다.

- 승리: `+10000`
- 무승부: `0`
- 패배: `-10000`

또한 TT를 공유하되, exact score와 혼동되지 않도록 다음 규칙을 사용했다.

- WLD 승리는 **lower bound** 로 저장 가능
- WLD 패배는 **upper bound** 로 저장 가능
- WLD 무승부는 `0`의 **exact** 로 저장 가능
- WLD TT hit를 다시 읽을 때는 값을 `win/draw/loss` domain으로 정규화해서 사용

이렇게 하면 나중 exact search가 TT를 읽더라도,
승/패는 “약한 exact bound”로만 참고되고,
무승부만 exact로 안전하게 재사용된다.

### 3.5 UI / 통계
UI summary에 `searchMode === 'wld-endgame'` 를 추가해,
다음 세 경우를 분리했다.

- 완료된 승무패 끝내기
- 시간 만료된 승무패 끝내기
- 휴리스틱 fallback

통계도 다음 항목을 추가했다.

- `wldRootSearches`
- `wldNodes`
- `wldTtHits`
- `wldSmallSolverCalls`
- `wldSmallSolverNodes`

## 4. 검증 방법과 결과
### 4.1 자동 테스트
다음 테스트를 모두 통과했다.

- `node js/test/core-smoke.mjs`
- `node js/test/perft.mjs`
- `python3 tests/ui_smoke.py`
- `python3 tests/virtual_host_smoke.py`

### 4.2 신규 회귀 테스트
`js/test/core-smoke.mjs` 에 다음 회귀를 추가했다.

1. **5 empty / exact threshold 4 / pre-exact +1** 상태에서
   - `searchMode === 'wld-endgame'`
   - `isWldResult === true`
   - brute-force exact 결과와 승/무/패가 일치
2. 같은 실험에서
   - `runIterativeDeepening()` 호출 금지
   - 일반 `negamax()` 호출 금지
   - `solveSmallExact()` 호출 금지
3. **exact root** 는 WLD로 라우팅되지 않는지 검증
4. **pre-exact window 밖** 은 WLD로 라우팅되지 않는지 검증
5. UI summary가 `승무패 끝내기` 라벨을 노출하는지 검증

## 5. 벤치마크 / 근거 데이터
상세 수치는 `benchmarks/stage18_wld_pre_exact_root_benchmark.json` 에 기록했다.

### 5.1 strong config, 17 empty, exact reference 비교 (`+1`)
비교 설정:
- baseline: `wldPreExactEmpties = 0`
- candidate: `wldPreExactEmpties = 1`
- strong config: `maxDepth = 10`, `timeLimitMs = 12000`, `exactEndgameEmpties = 16`
- exact reference: 동일 root를 `exactEndgameEmpties = 17` 로 완전 해석

aggregate 결과:
- baseline move agreement vs exact: `3 / 4`
- WLD +1 move agreement vs exact: `3 / 4`
- baseline outcome agreement vs exact: `3 / 4`
- WLD +1 outcome agreement vs exact: `4 / 4`
- 시간: `18267 ms -> 19523 ms` (`+6.88%`)
- nodes: `159371 -> 354757` (`+122.60%`)

즉, `+1` 은 **속도를 줄이는 대신 outcome 보장을 강화**하는 형태였다.
대표적으로 seed 37 케이스에서 baseline은 loss로 읽었지만,
WLD +1은 exact reference와 같은 win을 확정했다.

### 5.2 low-depth config, 17 empty, `+1` screening
설정:
- `maxDepth = 4`
- `timeLimitMs = 15000`
- `exactEndgameEmpties = 16`

aggregate 결과:
- 시간: `275 ms -> 20786 ms` (`+7458.55%`)
- nodes: `1035 -> 354757` (`+34175%`)

즉 shallow search에서는 WLD +1이 전혀 맞지 않았다.
이 때문에 기본 활성화 규칙을 strong config 쪽으로만 제한했다.

### 5.3 strong config, 18 empty, `+2` screening
설정:
- `maxDepth = 10`
- `timeLimitMs = 12000`
- `exactEndgameEmpties = 16`
- candidate: `wldPreExactEmpties = 2`

aggregate 결과:
- baseline vs WLD +2 outcome agreement: `3 / 3`
- baseline vs WLD +2 move agreement: `2 / 3`
- 시간: `31609 ms -> 14649 ms` (`-53.66%`)
- nodes: `259975 -> 284811` (`+9.55%`)

즉 `+2` 는 강한 설정에서 오히려 빠르게 끝나는 경우도 있었지만,
샘플 1건에서 수가 바뀌었고,
아직 exact move-quality reference가 충분하지 않다.
그래서 이번 단계에서는 **기본 채택하지 않았다.**

## 6. 채택 / 비채택 결정
### 채택
- **strict root-only WLD pre-exact mode**
- 기본 채택 범위는 `wldPreExactEmpties = 1`
- 단, 자동 기본값은 `maxDepth >= 8 || timeLimitMs >= 3000` 인 경우에만 `1`

### 비채택 / 보류
- `wldPreExactEmpties = 2` 기본 활성화
- WLD 내부에서 exact solver 호출
- exact solver 내부에서 WLD 호출
- depth-limited 탐색 도중 WLD 전환
- WLD를 exact search 시간 단축용 general optimization으로 취급하는 설계

## 7. 다음 단계
이 단계 이후의 자연스러운 후속 작업은 두 가지다.

1. `+2` 구간에 대한 **exact reference holdout 확대**
   - 18 empty 쪽은 속도 이점 신호가 있으나 품질 근거가 아직 부족하다.
2. exact solver에서 **기존 WLD TT bound 재활용**을 더 정교하게 검토
   - 현재도 안전한 bound 재사용은 가능하지만,
     ordering / aspiration 관점에서 더 활용할 여지가 있는지 별도 검토가 필요하다.
