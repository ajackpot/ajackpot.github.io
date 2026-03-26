# 구현 보고서 Stage 19 — WLD `+2` 기본 채택 및 흑 차례 parity 구간 도달

## 1. 배경 / 목표
Stage 18에서는 strict root-only WLD pre-exact 모드를 도입했지만,
기본 채택 범위는 `exactEndgameEmpties + 1` 에 머물렀다.
이 설계는 구조적으로는 안전했지만, 일반적인 parity에서는 `17 empties`가 백 차례인 경우가 많아
**흑 차례는 기본 설정으로 WLD를 거의 쓰지 못하는 비대칭**이 남았다.

이번 단계의 목표는 다음 두 가지였다.

1. **흑 차례 parity 구간까지 WLD를 기본으로 도달시킬 것**
2. 그 과정에서도 Stage 18에서 지킨 원칙,
   - `empties <= exactEndgameEmpties` 에서 WLD 금지
   - depth-limited / WLD / exact 탐색 혼합 금지
   를 그대로 유지할 것

즉 이번 단계는 “WLD를 더 일반화”한 것이 아니라,
**이미 분리해 둔 root-only WLD window를 `+2`까지 넓혀 검증한 뒤 채택한 단계**다.

## 2. 변경 범위
- `js/ai/search-engine.js`
- `js/test/core-smoke.mjs`
- `benchmarks/stage19_wld_range2_black_fairness_benchmark.json`
- `docs/reports/implementation/impl-stage-19-wld-range2-default-adoption-and-black-parity.md`
- `docs/reports/review/review-stage-19-wld-range2-black-parity-benchmark.md`
- `docs/reports/README.md`

## 3. 핵심 구현 내용
### 3.1 기본 WLD pre-exact window 규칙 조정
기존 기본 규칙은 비교적 강한 설정에서만 `wldPreExactEmpties = 1` 을 켰다.
이번 단계에서는 이를 다음으로 바꿨다.

- `maxDepth >= 8` **그리고** `timeLimitMs >= 3000` 이면 기본 `2`
- 그 외는 기본 `0`

즉,
- `expert`
- `impossible`
- 동급의 강한 custom setting
에서는 기본적으로 **`exactEndgameEmpties + 2` 까지 root-only WLD** 를 사용한다.
반대로 `hard` 이하나 shallow custom setting은 여전히 기본 off다.

이 규칙은 “시간만 길다” 또는 “깊이만 높다” 같은 애매한 경우까지 자동 활성화하지 않도록,
Stage 18보다 더 보수적인 gate를 둔 것이다.

### 3.2 탐색 구조는 그대로 유지
이번 단계에서 바꾼 것은 **기본 activation rule** 이지,
Stage 18의 strict separation 자체는 아니다.

여전히 다음 제약을 유지한다.

- exact root는 exact solver만 사용
- pre-exact WLD root는 WLD solver만 사용
- depth-limited root는 ordinary negamax만 사용
- WLD path 안에서 exact solver 호출 금지
- ordinary/exact path 안에서 WLD path 호출 금지

따라서 `+2` 채택은 “WLD를 일반 가속기로 섞어 넣은 것”이 아니라,
**이미 분리된 WLD root window를 흑 parity까지 넓힌 것**으로 이해하는 편이 맞다.

## 4. 회귀 테스트 추가
`js/test/core-smoke.mjs` 에 다음 회귀를 추가했다.

1. **6 empty / exact threshold 4 / `wldPreExactEmpties = 2`** 상태에서
   - root가 `wld-endgame` 모드로 진입하는지
   - 결과가 `isWldResult === true` 인지
   - brute-force exact outcome과 승/무/패가 일치하는지
2. 위 regression state가 실제로 **흑 차례 parity** 인지 확인
3. preset / custom default 규칙 검증
   - `hard` 기본값은 `0`
   - `expert`, `impossible` 기본값은 `2`
   - strong custom (`depth 8`, `3900ms`) 는 기본 `2`
   - shallow custom (`depth 6`, `5000ms`) 는 기본 `0`

이 테스트는 “흑도 `+2` WLD를 기본으로 탄다”는 목표를 직접 고정해 두는 역할을 한다.

## 5. 검증 방법과 결과
다음 테스트를 모두 통과했다.

- `node js/test/core-smoke.mjs`
- `node js/test/perft.mjs`
- `python3 tests/ui_smoke.py`
- `python3 tests/virtual_host_smoke.py`

즉,
- WLD +2 기본 규칙 변경
- black parity regression 추가
- preset default 변경
에도 기존 규칙/엔진/UI 회귀는 깨지지 않았다.

## 6. 벤치마크 / 근거 데이터
상세 데이터는 `benchmarks/stage19_wld_range2_black_fairness_benchmark.json` 에 정리했다.

### 6.1 14-empty exact-reference set (`exactEndgameEmpties = 12` 기준 `+2`)
이 구간은 `expert` 급 설정의 `+2` root window에 해당한다.
모든 케이스는 **흑 차례**였고, exact reference를 직접 만들 수 있었다.

합산 결과:
- baseline move agreement vs exact: `6 / 8`
- WLD +2 move agreement vs exact: `6 / 8`
- baseline outcome agreement vs exact: `5 / 8`
- WLD +2 outcome agreement vs exact: `8 / 8`
- 시간: `4909 ms -> 3117 ms` (`-36.50%`)
- nodes: `82626 -> 94964` (`+14.93%`)

핵심은 다음이다.

- move agreement는 baseline과 **동률**이었다.
- outcome agreement는 WLD +2가 **완승**했다.
- 특히 seed `48`, `60`, `104`에서 baseline은 승패를 잘못 읽었고,
  WLD +2는 exact reference와 일치했다.
- 시간도 오히려 줄었다.

즉 `+2` 는 이 구간에서 단순히 parity를 맞춘 것이 아니라,
**정확한 outcome을 더 안정적으로 보장하면서도 runtime은 오히려 줄일 수 있었다.**

### 6.2 18-empty black holdout (`exactEndgameEmpties = 16`, impossible급)
이 구간은 사용자가 특별히 지적한 **흑 차례 parity bucket** 이다.
full exact reference는 여전히 비싸서,
이번 단계에서는 black holdout 5건으로 completion / cost / move drift를 따로 확인했다.

합산 결과:
- 모든 케이스가 **흑 차례**
- baseline vs WLD +2 move agreement: `2 / 5`
- baseline vs WLD +2 outcome agreement: `5 / 5`
- candidate completed: `4 / 5`
- candidate timeout fallback: `1 / 5`
- 시간: `36886 ms -> 19989 ms` (`-45.81%`)
- nodes: `542571 -> 611801` (`+12.76%`)

해석:
- `+2` 는 이 구간에서 **확실히 흑 parity bucket을 건드린다.**
- 대부분의 케이스에서 baseline보다 더 빨리 끝났고,
  WLD outcome도 안정적으로 얻었다.
- 다만 seed `186`처럼 **무거운 loss proof** 에서는 12초 예산 안에 끝내지 못하고
  heuristic fallback으로 내려오는 경우가 남았다.

즉 `18 empties` 흑 구간에서도 `+2` 는 충분히 유효하지만,
**speed win이 100% 보장되는 기능은 아니다.**

## 7. 채택 / 리스크
### 채택
- strong preset / strong custom setting에서 기본 `wldPreExactEmpties = 2`
- Stage 18의 strict root-only WLD separation 유지
- black parity regression 고정

### 남는 리스크
- `18 empties` impossible holdout에서 일부 loss proof는 아직 timeout fallback이 발생한다.
- 따라서 `+2`는 “항상 더 빠른 최적화”가 아니라,
  **흑 parity까지 outcome solver를 기본 적용하는 기능**으로 이해해야 한다.
- future tuning은 WLD bucket과 exact bucket을 분리해 보는 편이 더 맞다.

## 8. 다음 단계
다음 단계는 다음 두 갈래 중 하나가 자연스럽다.

1. **기법별 benchmark를 exact / WLD bucket으로 분리**
   - ETC, stability cutoff, ordering 보강을 두 구간에서 따로 평가
2. **WLD 내부 전용 보강 기법 재검토**
   - 예: WLD에서의 stability cutoff 재실험
   - 또는 WLD bucket 전용 cutoff / ordering 보강

이번 Stage 19는 요약하면,
**“Stage 18에서 안전하게 열어 둔 root-only WLD 창을 finally `+2`까지 기본 채택하여,
흑 차례 parity에서도 WLD가 실제로 작동하도록 만든 단계”** 다.
