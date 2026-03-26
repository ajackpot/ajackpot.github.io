# 검토 보고서 Stage 25 — dormant 런타임 로직 분류와 처리 기준

## 1. 문제 정의
현재 코드에는 “존재는 하지만 실제 인게임에서는 쓰이지 않는 로직”이 섞여 있었습니다.
이들을 한꺼번에 없애면 회귀 실험 기반까지 사라지고,
반대로 전부 남기면 가독성과 유지보수성이 나빠집니다.

따라서 이번 단계에서는 먼저 어떤 로직이 어떤 부류인지 분류했습니다.

## 2. 분류 결과
### A. 유지해야 하는 채택 경로
- `enhancedTranspositionCutoff`
- `wldPreExactEmpties`
- `optimizedFewEmptiesExactSolver`
- `specializedFewEmptiesExactSolver`
- `exactFastestFirstOrdering`

이들은 기본 엔진 strength를 실제로 구성합니다.

### B. 내부 baseline 비교용으로 의미가 있는 토글
- `optimizedFewEmptiesExactSolver: false`
- `specializedFewEmptiesExactSolver: false`
- `exactFastestFirstOrdering: false`

이들은 dormant dead code가 아니라, 채택된 기능의 회귀 비교 baseline입니다.
따라서 사용자 UI에는 올리지 않더라도 내부 토글로 남길 가치가 있습니다.

### C. 제거 대상 dormant 실험 경로
- `stabilityCutoff`
- `stabilityCutoffWld`
- `stabilityCutoffWldMaxEmpties`
- `exactFastestCutFirstOrdering`

공통점은 다음과 같습니다.

- 기본 프리셋에서 꺼져 있음
- UI에 노출되지 않음
- 최근 벤치마크에서 채택 가치가 없다고 이미 판정됨
- 남아 있을수록 옵션 해석, stats, 회귀, 문서를 함께 복잡하게 만듦

## 3. 사용자 옵션으로 노출하지 않은 이유
비활성 로직을 전부 사용자 지정 옵션으로 올릴 수도 있었지만,
이번 단계에서는 그 방안을 채택하지 않았습니다.

이유는 다음과 같습니다.

1. 사용자가 의미 있게 고를 수 있는 **trade-off knob**가 아니라, 이미 비채택된 실험 경로였습니다.
2. UI에 올리면 지원해야 할 조합이 늘어나고, docs와 테스트 부담도 커집니다.
3. “숨겨진 실험 옵션”이 많아질수록 앱의 설명 가능성이 떨어집니다.

즉 이번 케이스는 **노출보다 제거가 더 맞는 부류**였습니다.

## 4. evaluator.js 판단
`describeStableDiscBounds()`는 search-engine에서는 제거했지만 evaluator에는 남겼습니다.

이 함수는 현재 인게임 runtime path에는 닿지 않지만,
- 회귀 점검
- 안정성 bound 분석
- future research 준비
에 재사용할 수 있는 작은 보조 함수입니다.

따라서 evaluator 레벨에서는 “dead code”가 아니라 **diagnostic helper**로 분류했습니다.

## 5. 결론
이번 단계의 정리 기준은 다음 한 줄로 요약할 수 있습니다.

> 기본값이 꺼진 채 성능도 나빴던 search 실험 경로는 제거하고,
> 채택된 기능의 baseline 비교와 분석에 필요한 최소 보조 도구만 남긴다.

이 기준은 이후 MPC 준비 단계나 추가 endgame 기법 도입 단계에서도 그대로 적용하는 것이 좋습니다.
