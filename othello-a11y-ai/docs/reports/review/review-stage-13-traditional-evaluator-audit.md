# 검토 보고서 Stage 13 — 전통 evaluator 종합 감사

## 목적

학습 기반 evaluator tuning 단계로 넘어가기 전에,
현재 수작업(static) evaluator를 마지막으로 한 번 더 점검했습니다.

검토 포인트는 다음과 같았습니다.

1. 중복되거나 사실상 의미가 약한 평가가 있는가?
2. 빠진 중대한 전통적 패턴이 있는가?
3. 과대/과소 평가된 축이 있는가?
4. 지금 당장 넣는 것이 안전한가, 아니면 다음 data-driven 단계로 넘기는 것이 맞는가?

## 현재 evaluator의 구성 요약

현재 코드는 다음 축을 이미 갖추고 있었습니다.

- actual mobility
- potential mobility
- corner ownership
- empty-corner adjacency penalty
- frontier
- static positional matrix
- edge pattern table
- corner pattern table
- approximate stability
- parity
- disc differential

즉, “기본 항목이 빠져 있다”기보다,
세부 신호의 겹침과 빠진 즉시성(tactical immediacy) 신호를 보는 단계에 가까웠습니다.

## 항목별 판단

### 1) Mobility / Potential Mobility

판단:
- 유지 권고
- 삭제 비권고

이유:
- 둘은 비슷해 보여도 실제로는 다릅니다.
- actual mobility는 현재 수 선택 폭을,
  potential mobility는 다음 수들에서의 판 확장 가능성을 반영합니다.
- 다만 actual legal moves를 한 번 만든 뒤 재사용하는 정리는 가치가 있었습니다.

결론:
- feature 자체는 유지
- 계산 경로만 정리

### 2) Corner ownership / Corner adjacency / Corner pattern

판단:
- 구조 자체는 유지 권고
- 다만 immediate corner access가 빠져 있었음

관찰:
- 현재 구조는 “corner를 이미 소유했는가”와
  “empty corner 옆에서 위험하게 머물고 있는가”는 꽤 잘 반영합니다.
- 그러나 “지금 이 턴에 코너를 먹을 수 있는가”는
  mobility나 pattern 항목에 간접적으로만 반영되고 있었습니다.

결론:
- corner ownership / adjacency / pattern은 유지
- **cornerAccess**만 보강

### 3) Positional matrix

판단:
- 유지 권고
- 완전 재설계는 비권고

관찰:
- fixed matrix는 context-sensitive하지 않아서,
  corner를 이미 확보한 뒤의 X/C-square 가치까지 완벽하게 표현하지는 못합니다.
- 다만 현재 코드는 이를
  corner pattern / edge pattern / corner adjacency가 어느 정도 보정하고 있습니다.

결론:
- 지금 단계에서 matrix 자체를 크게 바꾸기보다,
  data-driven tuning 단계에서 stage bucket별로 다시 보는 것이 맞습니다.

### 4) Edge pattern

판단:
- 유지 권고
- 명시적 wing / mountain / gap 추가는 보류

관찰:
- 현 edge table은 anchored run, empty-corner exposure, double-corner 확보 등은 잡고 있습니다.
- 다만 named edge traps를 명시적으로 더 넣는 선택지는 남아 있습니다.

보류 이유:
- 효과 자체는 있을 수 있지만,
  수작업 규칙을 더 덧붙일수록 pattern / positional / adjacency와 겹칠 위험이 커집니다.
- 다음 단계의 learned table이나 data-driven tuning이 더 자연스러운 영역입니다.

### 5) Stability

판단:
- 유지 권고
- semi-stable / unstable 확대는 보류

관찰:
- 현재 stability는 conservative approximate stable discs + late refinement 구조입니다.
- 브라우저 정적 앱이라는 제약을 감안하면,
  완전 stability classification을 더 넓히는 것보다 현 구조가 안전합니다.

결론:
- 현 단계에서 필수 수정 없음

### 6) Frontier

판단:
- 유지 권고

관찰:
- frontier는 mobility와 어느 정도 연관되지만,
  “빈칸과 맞닿은 노출도”라는 별도 정보를 줍니다.
- 현재 weight도 phase가 진행될수록 줄어드는 구조라 과하지 않았습니다.

### 7) Parity / Disc differential

판단:
- feature 자체는 유지
- phase 밖 계산은 생략 권고

관찰:
- parity와 disc differential은 late-game에서 의미가 커지고,
  초중반에는 weight가 0 또는 매우 작습니다.
- 따라서 해당 phase에서 아예 쓰지 않는 계산은 생략해도 의미가 보존됩니다.

결론:
- feature 삭제는 하지 않음
- **unused phase 계산만 정리**

## 실제로 발견된 핵심 문제

### 문제 1) immediate corner access 과소평가

가장 명확하게 확인된 문제였습니다.

대표 포지션:
- `D3 C3 B3 B2 C4 A3`

이 포지션은 black가 즉시 `A1` corner를 먹을 수 있지만,
기존 evaluator는 이를 일부 간접 신호로만 반영했습니다.

결과적으로:
- 방향은 맞게 보더라도
- exact outcome 대비 점수 강도가 약했고,
- “corner가 이미 있는 상태”와 “corner를 지금 먹을 수 있는 상태”를 충분히 구분하지 못했습니다.

### 문제 2) weight 0 항목의 불필요 계산

이는 strength 문제보다 구현 문제였습니다.

- disc differential weight가 0인 구간에서도 값을 계산
- parity weight가 0인 구간에서도 breakdown 계산

수정은 보수적으로 가능했고, 실제로 비용 절감 효과도 확인됐습니다.

## 과대평가 / 과소평가 판단 요약

### 과소평가로 본 것
- immediate corner access
- immediate opponent corner concession threat

### 과대평가로 확정하지 않은 것
- corner adjacency
- corner pattern
- positional X/C-square penalty
- frontier

이유:
- 겹침은 있지만, exact 샘플에서 “필수적으로 줄여야 할 정도의 과대평가”로까지는 보이지 않았습니다.
- 오히려 late exact 샘플에서는 immediate corner 관련 신호 부족이 더 분명했습니다.

## 최종 채택안

이번 단계에서 실제로 권고/반영한 것은 딱 두 가지입니다.

1. **cornerAccess feature 추가**
2. **phase 밖에서 결과에 쓰이지 않는 계산 생략**

반대로 다음은 이번 단계에서 비채택으로 두었습니다.

- edge named trap heuristic 확대
- positional matrix 재학습 없는 수작업 재설계
- semi-stable/unstable 확장 분류
- learned evaluator의 일부를 성급히 수작업으로 흉내 내는 변경

## 최종 결론

현재 evaluator는 이미 전통적 축이 상당히 잘 갖춰져 있었고,
지금 시점에서 필수적으로 손볼 수준의 결함은 많지 않았습니다.

다만 마지막 수작업 단계에서 분명히 보였던 것은:

- **corner access의 독립 신호 부족**
- **phase 밖 불필요 계산 존재**

이 두 가지였습니다.

따라서 Stage 13 이후의 방향은
heuristic을 더 많이 덧대는 것이 아니라,
이제 정말로 다음 단계인 data-driven tuning으로 넘어가는 것이 맞습니다.
