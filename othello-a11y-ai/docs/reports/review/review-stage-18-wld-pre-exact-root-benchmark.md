# 검토 보고서 Stage 18 — WLD Pre-Exact Root 벤치마크 및 채택 판단

## 1. 배경 / 목표
이번 단계의 쟁점은 “WLD search를 도입할 것인가” 자체보다,
**어디에, 어떤 형태로 도입해야 올바른가**였다.

이번 단계에서 전제로 삼은 원칙은 명확하다.

1. `empties <= exactEndgameEmpties` 에서는 exact search가 우선이다.
2. WLD는 exact search를 대체하는 일반 가속기가 아니라,
   **exact 직전 1~2칸 구간에서 결과를 먼저 확정해 보는 별도 모드**다.
3. depth-limited / WLD / exact는 한 탐색 경로 안에서 서로 섞지 않는다.

따라서 이번 평가는 “WLD를 넣으면 빨라지나?” 보다는,
**strict root-only pre-exact WLD가 품질과 비용 면에서 채택 가능한가**에 초점을 맞췄다.

## 2. 실험 범위
비교한 대상은 다음 세 가지였다.

- baseline: `wldPreExactEmpties = 0`
- candidate A: `wldPreExactEmpties = 1`
- candidate B: `wldPreExactEmpties = 2`

실험은 크게 세 묶음으로 나눴다.

1. **17 empty / +1 / strong config / exact reference 비교**
2. **17 empty / +1 / low-depth screening**
3. **18 empty / +2 / strong config screening**

핵심은 17 empty `+1` 구간은 exact reference를 만들어
실제로 outcome 품질이 개선되는지 확인했고,
18 empty `+2` 구간은 아직 screening만 했다는 점이다.

## 3. 핵심 관찰
### 3.1 설계 제약은 제대로 지켜졌다
회귀 테스트와 코드 구조상,
이번 구현은 다음 금지사항을 모두 피했다.

- exact root에서 WLD 진입
- pre-exact window 밖에서 WLD 진입
- WLD root에서 iterative deepening 사용
- WLD root에서 일반 `negamax()` 사용
- WLD root에서 `solveSmallExact()` 사용

즉, 이번 구현은 사용자가 우려한 “중간에 탐색 모드를 섞는 형태”가 아니다.

### 3.2 `+1` 은 속도 최적화가 아니라 outcome 보강이다
17 empty exact-reference benchmark 합산 결과:

- baseline move agreement vs exact: `3 / 4`
- WLD +1 move agreement vs exact: `3 / 4`
- baseline outcome agreement vs exact: `3 / 4`
- WLD +1 outcome agreement vs exact: `4 / 4`
- 시간: `18267 ms -> 19523 ms` (`+6.88%`)
- nodes: `159371 -> 354757` (`+122.60%`)

즉 `+1` 은 best move agreement를 더 좋게 만들지는 않았지만,
**승/무/패 결과는 한 단계 더 정확하게 만들었다.**
대신 계산량은 명확히 늘었다.

따라서 `+1` 을 “exact search를 더 빨리 하기 위한 장치”로 해석하면 안 되고,
**강한 설정에서 root outcome을 더 안전하게 확정하는 장치**로 보는 것이 맞다.

### 3.3 shallow setting에서는 절대 기본 활성화하면 안 된다
17 empty low-depth screening에서는 결과가 매우 나빴다.

- 시간: `275 ms -> 20786 ms`
- nodes: `1035 -> 354757`

즉 얕은 탐색에서는 baseline depth-limited search가 이미 매우 싸기 때문에,
WLD +1은 사실상 과잉 계산이었다.
이 결과 때문에 기본 활성화를
`maxDepth >= 8 || timeLimitMs >= 3000` 으로 제한한 판단은 타당하다.

### 3.4 `+2` 는 신호는 좋지만 근거가 부족하다
18 empty strong-config screening에서는 `+2` 가 오히려 더 빨랐다.

- 시간: `31609 ms -> 14649 ms` (`-53.66%`)
- nodes: `259975 -> 284811` (`+9.55%`)
- outcome agreement: `3 / 3`
- move agreement: `2 / 3`

즉 시간상으로는 상당히 매력적인 신호가 있다.
그러나 한 샘플에서 move가 바뀌었고,
무엇보다 아직 **exact move-quality reference가 없다.**

이번 repo의 운영 원칙은 late-endgame 쪽에서
“빨라 보이는 것”보다 “정확하다고 검증된 것”을 우선 채택하는 것이므로,
`+2` 를 기본값으로 올리기에는 아직 이르다.

## 4. 채택 판단
### 채택: 제한적 채택
다음 형태로 **채택**한다.

- `wldPreExactEmpties = 1`
- strict root-only WLD mode
- exact boundary 바깥에서만 동작
- 기본 자동 활성화는 strong search setting에만 허용

채택 이유는 다음과 같다.

1. 사용자 제약을 만족하는 구조적 분리가 구현되었다.
2. 17 empty exact-reference 비교에서 outcome agreement가 `3/4 -> 4/4` 로 개선됐다.
3. exact / depth-limited / WLD 혼합에 따른 correctness 리스크를 피했다.
4. shallow search 쪽 오버헤드는 activation gate로 제어했다.

### 비채택: 기본 `+2`
`wldPreExactEmpties = 2` 는 이번 단계에서 **비채택**한다.

이유:
- 품질 근거가 아직 부족함
- move drift가 이미 한 번 관측됨
- exact reference holdout 없이 기본값으로 올리기엔 위험함

## 5. 리스크 / 주의점
이번 WLD 채택은 다음 전제를 붙여야 안전하다.

1. **speed win을 약속하는 기능이 아니다.**
   - strong config에서는 outcome 품질 보강이 핵심 이득이다.
2. shallow config에서는 기본 off가 맞다.
3. TT 공유는 허용했지만,
   exact score와 동일시하지 않도록 승/패는 bound로만 다뤄야 한다.
4. 향후 `+2` 를 채택하려면 반드시 exact reference coverage를 늘려야 한다.

## 6. 결론
이번 단계의 최종 판단은 다음과 같다.

- WLD pre-pass는 **채택 가능**하다.
- 그러나 그 의미는 “exact 경계 안에서도 먼저 돌리는 속도 최적화”가 아니다.
- 올바른 도입 방식은 **exact 경계 바깥 `+1` 구간의 strict root-only mode** 다.
- `+2` 는 유망하지만 아직 증거가 부족하므로 보류한다.

즉, 이번 단계는 WLD를 무리하게 일반화하지 않고,
**검증된 좁은 범위에서만 보수적으로 엔진에 편입**한 단계라고 보는 것이 맞다.

## 7. 다음 단계
다음 우선순위는 다음 둘 중 하나가 적절하다.

1. **18 empty exact-reference holdout 확대**
   - `+2` 채택 여부를 제대로 판단하기 위한 데이터 보강
2. **WLD-informed exact ordering / bound reuse 검토**
   - 현재 root WLD 결과와 TT bound를 exact solver가 어디까지 안전하게 활용할 수 있는지 추가 실험
