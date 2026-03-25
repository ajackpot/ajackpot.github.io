# 검토 보고서 Stage 14 — late-game boundary bug 감사

## 1. 배경
사용자 보고에 따르면, 후반부에서 AI가 갑자기 깊이를 읽지 못하고 이상 수를 두며, 특히 마지막 흑 수 이후에는 `완료 깊이 0 / 평가 -10억`까지 노출됐다. 설정은 아래와 같았다.

- 사람: 흑
- AI: 백
- `maxDepth=10`
- `exactEndgameEmpties=16`

## 2. 가설
사용자가 제기한 핵심 가설은 다음과 같았다.

> 실제 게임 상태가 17 empties 이상이면 아직 midgame depth-limited search여야 하는데,
> 구현이 subtree에서 16 empties 이하가 되는 순간 exact search를 켜고 있는 것 같다.

이 가설은 코드와 재현 결과 모두로 지지됐다.

## 3. 감사 결과
### 3.1 구현 상의 문제
기존 `negamax()`는 현재 노드 empties를 기준으로 exact 여부를 매번 다시 계산했다.

따라서 루트 기준으로는 exact window 밖인 포지션도 탐색 도중 exact search로 변질될 수 있었다.

### 3.2 증상과의 대응
이 설계는 보고된 세 증상과 정확히 맞아떨어진다.

- 21 empties 루트: depth 5쯤에서 16 empties 진입 → 실제로는 사실상 exact
- 19 empties 루트: depth 3쯤에서 16 empties 진입 → 실제로는 사실상 exact
- 17 empties 루트: depth 1만 들어가도 16 empties 진입 → 첫 iteration부터 timeout 가능

즉, 완료 깊이 `4 / 2 / 0`은 우연이 아니라 subtree exact 재점화 구조와 정합적이다.

## 4. 부수 문제
### 4.1 fallback sentinel 노출
루트 반복 심화가 하나도 완료되지 않을 때 `findBestMove()`는 내부 fallback을 반환했는데, 이 fallback이 `score=-INFINITY`와 동일한 내부 표현을 갖고 있었다.

그래서 UI 요약에는 실제 평가가 아니라 내부 센티널 `-1000000000`이 그대로 노출됐다.

### 4.2 후보 수 선택 품질
기존 fallback은 사실상 정렬되지 않은 첫 legal move 중심이라, timeout이 발생했을 때 수 선택 품질도 불필요하게 낮았다.

## 5. 채택한 수정 방향
이번 감사에서는 아래 두 가지를 채택했다.

1. exact endgame 경계를 **루트 상태 정책**으로 고정
2. fallback을 **finite heuristic candidate selection**으로 교체

이 방향은 다음 이유로 적절하다.

- 사용자가 조절하는 설정 의미와 일치한다.
- 시간 예산이 갑자기 붕괴하는 문제를 해소한다.
- UI가 내부 센티널을 외부로 노출하지 않게 된다.
- 전통적 탐색 엔진의 설정 해석으로도 더 자연스럽다.

## 6. 수정 후 관찰
동일한 재현 수순에서,
- 21 empties는 depth 10,
- 19 empties는 depth 9,
- 17 empties는 depth 10
까지 다시 올라왔다.

특히 17 empties 케이스가 더 이상 `depth 0 / -10억`으로 무너지지 않고, 약 7초 내에 정상적인 depth-10 결과를 반환했다는 점이 핵심이다.

## 7. 남겨 둔 항목
- exact root 상태를 별도 모드로 요약해 UI에 표시하는 개선
- exact root에서 반복 심화 자체를 줄이는 최적화
- late-game PV/score 설명 강화

이 항목들은 유용하지만, 이번 버그의 원인 수정과는 분리하는 편이 안전하다고 판단했다.

## 8. 결론
사용자가 제기한 가설은 맞았다. 문제의 본질은 **subtree exact 재점화**였고, `depth 0 / -10억`은 그 결과 발생한 timeout + sentinel fallback 노출의 결합 증상이였다.
