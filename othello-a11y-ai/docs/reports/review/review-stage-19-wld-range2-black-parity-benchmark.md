# 검토 보고서 Stage 19 — WLD `+2` black parity 벤치마크 및 채택 판단

## 1. 배경 / 쟁점
Stage 18까지의 구조는 옳았다.

- exact boundary 안에서는 exact가 우선이고
- 그 바깥 `+1` 구간에서만 root-only WLD를 쓰며
- depth-limited / WLD / exact는 서로 섞지 않는다.

문제는 **parity 비대칭**이었다.
일반적인 Othello 진행에서는 `exactEndgameEmpties + 1` 이 백 차례가 되는 경우가 많아,
기본 `+1` 채택만으로는 **흑 차례는 WLD 혜택을 거의 못 받는다.**

그래서 이번 단계의 핵심 질문은 다음이었다.

> `+2` 를 기본으로 올려서 흑 차례 parity bucket까지 WLD를 도달시켜도 되는가?

## 2. 이번 단계의 평가 원칙
이번 단계는 한 가지 숫자만 보지 않았다.
`+2`는 outcome solver이기 때문에,
**exact bucket** 과 **WLD/black-parity bucket** 을 나눠 봐야 했다.

따라서 두 종류의 근거를 같이 사용했다.

1. **14-empty exact-reference set**
   - `exactEndgameEmpties = 12` 기준 `+2` 구간
   - exact reference로 move / outcome 정답 비교 가능
2. **18-empty black holdout**
   - `exactEndgameEmpties = 16` 기준 `+2` 구간
   - 흑 parity bucket에 실제로 도달하는지,
     그리고 cost / completion behavior가 어떤지 확인

이 분리는 앞으로 다른 기법을 평가할 때도 그대로 유지할 가치가 있다.

## 3. 핵심 결과
### 3.1 14-empty exact-reference에서는 `+2`가 명확히 우세했다
8개 exact-reference 케이스 합산 결과:

- baseline move agreement vs exact: `6 / 8`
- WLD +2 move agreement vs exact: `6 / 8`
- baseline outcome agreement vs exact: `5 / 8`
- WLD +2 outcome agreement vs exact: `8 / 8`
- 시간: `4909 ms -> 3117 ms` (`-36.50%`)
- nodes: `82626 -> 94964` (`+14.93%`)

이 결과는 꽤 중요하다.

- move agreement는 **나빠지지 않았다.**
- outcome agreement는 **완전히 좋아졌다.**
- 시간도 **오히려 줄었다.**

즉 이 구간에서 `+2`는 “흑도 WLD를 탄다”는 형식적 목표만 충족한 것이 아니라,
**실제 엔진 판단을 더 정확하게 만든다.**

특히 seed `48`, `60`, `104`는 baseline의 오판을 WLD +2가 바로잡은 대표 사례였다.

### 3.2 18-empty black holdout은 흑 parity 도달 자체를 확인해 준다
5개 impossible급 holdout 결과:

- 모든 케이스가 **흑 차례**
- baseline vs WLD +2 move agreement: `2 / 5`
- baseline vs WLD +2 outcome agreement: `5 / 5`
- candidate completed: `4 / 5`
- candidate timeout fallback: `1 / 5`
- 시간: `36886 ms -> 19989 ms` (`-45.81%`)
- nodes: `542571 -> 611801` (`+12.76%`)

이 수치가 의미하는 것은 다음이다.

- `+2`를 켜면 드디어 **흑 차례 18-empty bucket에서도 WLD가 실제로 작동**한다.
- 대부분의 케이스는 baseline보다 더 빨리 끝난다.
- 다만 일부 loss proof는 여전히 무거워서 timeout fallback이 남는다.

즉 `+2`는 이 구간에서 “항상 더 빠르다”고 약속할 수는 없지만,
**흑 parity 구간을 기본 coverage에 포함시킨다**는 목적에는 분명히 부합한다.

## 4. 왜 채택 가능한가
이번 단계에서 `+2`를 채택 가능한 이유는 세 가지다.

### A. exact-reference에서 outcome 품질 이득이 이미 증명되었다
가장 load-bearing한 근거는 14-empty exact-reference다.
이 구간에서 WLD +2는 outcome agreement를 `5/8 -> 8/8` 로 끌어올렸고,
move agreement는 baseline과 동률이었다.

즉 “WLD가 disc-optimal move를 망친다”는 우려는 적어도 이 benchmark에서는 확인되지 않았다.

### B. black parity 도달이라는 사용자의 목표를 실제로 달성한다
Stage 18의 `+1` 은 사실상 백 parity 쪽이었다.
이번 `+2` 채택으로 비로소 18-empty 흑 차례 bucket이 기본 동작 범위 안으로 들어왔다.

이 점은 단순한 cosmetic change가 아니라,
**색상에 따른 late solver coverage의 비대칭을 줄이는 변경**이다.

### C. 구조적 안전장치는 Stage 18 그대로다
이번 변경은 탐색기 구조를 섞지 않는다.

- exact boundary 안은 exact
- boundary 밖 `+2`는 root-only WLD
- ordinary depth-limited는 그대로 ordinary search

따라서 correctness 리스크는
“모드를 섞어서 생기는 구조적 오류”가 아니라,
주로 **runtime / timeout trade-off** 쪽에 있다.
이건 benchmark와 fallback 정책으로 관리 가능한 종류의 리스크다.

## 5. 왜 무조건적 speed optimization으로 보면 안 되는가
이번 `+2` 채택을 “성능 향상” 하나로 요약하면 오해가 생긴다.

- 14-empty exact-reference에서는 시간도 좋아졌지만
- 18-empty black holdout에서는 노드 수가 오히려 늘었고
- seed `186`처럼 timeout fallback도 남았다.

즉 `+2`는 “항상 tree를 줄이는 pruning”이 아니라,
**정확한 WLD outcome을 더 이른 root bucket까지 적용하는 기능**이다.

이 성격을 인정해야,
앞으로 ETC / stability cutoff / ordering 보강을 실험할 때도
“exact bucket에서 좋은가?” 와 “WLD bucket에서 좋은가?” 를 분리해서 볼 수 있다.

## 6. 최종 판단
최종 판단은 **채택**이다.

채택 형태:
- strong preset / strong custom (`maxDepth >= 8 && timeLimitMs >= 3000`) 에서
  기본 `wldPreExactEmpties = 2`
- 그 외 설정은 기본 `0`
- explicit override는 계속 허용

이 판단의 이유는 다음과 같다.

1. 14-empty exact-reference에서 품질 이득이 명확하다.
2. 흑 차례 parity bucket까지 WLD coverage를 확장한다.
3. move agreement는 baseline보다 나빠지지 않았다.
4. 구조적 안전장치는 유지된다.
5. 남는 리스크는 timeout fallback이지만, 이는 일부 holdout에서만 관찰되었고
   fallback 경로가 이미 존재한다.

## 7. 남는 과제
이번 채택 이후에는 benchmark 설계 자체를 조금 바꾸는 편이 맞다.

### 7.1 기법별 실험을 exact / WLD bucket으로 분리
사용자 제안대로,
앞으로는 기법별 테스트 케이스를 최소한 두 묶음으로 보는 편이 좋다.

- **exact bucket**: disc score 정확도 / nodes / time
- **WLD bucket**: outcome 정확도 / completion / fallback 빈도 / time

### 7.2 WLD 전용 보강 후보 재검토
특히 흥미로운 후속 후보는 다음이다.

- WLD에서의 stability cutoff 재실험
- WLD bucket 전용 ordering / cutoff 보강
- `18 empties` loss proof timeout 케이스 완화

## 8. 결론
이번 Stage 19의 결론은 단순하다.

**`+2` 는 채택할 가치가 있다.**

이유는 “흑도 WLD를 쓰게 되어서”만이 아니라,
exact-reference가 가능한 구간에서 이미 **outcome 품질 우위가 확인되었고**,
그 연장선에서 `18 empties` 흑 parity bucket까지 기본 coverage를 넓힐 수 있기 때문이다.

따라서 이번 단계는
**“Stage 18의 안전한 root-only WLD 구조를 그대로 유지한 채,
흑 차례 parity까지 기본 WLD 범위를 확장한 단계”** 로 정리하는 것이 가장 정확하다.
