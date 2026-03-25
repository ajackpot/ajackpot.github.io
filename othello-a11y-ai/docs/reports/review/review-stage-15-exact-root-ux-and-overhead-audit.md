# 검토 보고서 Stage 15 — exact root UX 및 중복 비용 감사

## 1. 배경
Stage 14 이후 late-game boundary bug 자체는 해결됐지만, exact root(루트 empties가 `exactEndgameEmpties` 이하)에서는 여전히 두 가지 관점의 아쉬움이 남아 있었다.

- **엔진 관점**: exact tree를 이미 한 번 풀었는데도 iterative deepening이 root를 다시 훑는다.
- **사용자 관점**: 결과가 exact인지 depth-limited인지 UI에서 즉시 구분되지 않는다.

## 2. 감사 결과
### 2.1 중복 비용은 실제로 존재했다
exact root에서는 `negamax()`가 depth cutoff를 무시하므로, depth 1 iteration만으로도 사실상 전체 exact tree를 푼다.
그 뒤 depth 2..maxDepth iteration은 주로 transposition table exact value를 재사용하지만, root move loop와 일부 ordering 비용은 다시 지불한다.

실측 결과(16 empties root)에서:
- 최선 수와 exact score는 변하지 않았고,
- 시간은 약 31.5%, 노드는 약 36.2% 줄었다.

이는 “완전히 다른 탐색을 했기 때문”이 아니라, **같은 exact 결과를 얻기 위해 root 반복을 줄였기 때문**으로 해석하는 것이 맞다.

### 2.2 UI 해석 가능성이 낮았다
기존 요약은 exact root도 다음처럼 읽혔다.

- `평가 X, 완료 깊이 10, ...`

이 문구만 보면 사용자는 다음을 구분할 수 없다.

- depth-limited 10-ply 탐색인지
- exact endgame 완주인지
- exact 시도가 timeout으로 fallback 되었는지

특히 exact 시도가 실패한 경우에도 bounded fallback score는 정상 숫자로 보이기 때문에, **명시적 모드 표기 없이는 오해 가능성**이 있다.

## 3. 채택한 방향의 타당성
이번 단계에서 채택한 방향은 다음 두 축이다.

1. **exact root는 단일 탐색**
2. **결과는 exact / exact 미완료 / depth-limited를 구분해 표기**

이 접근이 적절한 이유는 다음과 같다.

- exact 여부는 루트 정책으로 이미 정의되어 있다.
- exact root에서는 iterative deepening의 본래 목적(점진적 심화, aspiration 안정화)이 크게 줄어든다.
- 반면 사용자 설명 가능성은 크게 좋아진다.

## 4. 이번에 유지한 것
- exact root에서도 ordering은 최대 depth horizon을 그대로 사용했다.
- `completedDepth` 통계는 제거하지 않았다.
- 별도 UI 위젯/배지는 도입하지 않고, 텍스트 요약만 보강했다.

이 판단은 변경 범위를 작게 유지하면서도 사용자가 가장 혼동하던 지점을 바로잡는 데 유리하다.

## 5. 남아 있는 한계
- exact root가 매우 큰 경우(예: 16 empties에서도 까다로운 포지션)는 여전히 timeout 가능성이 있다.
- 이 경우 `정확 끝내기 미완료`가 표시되더라도, fallback move 자체는 휴리스틱 품질에 의존한다.
- 따라서 exact window를 무작정 더 키우는 것보다는, 이후 ordering/evaluator tuning이 병행되는 편이 낫다.

## 6. 결론
Stage 15는 Stage 14의 정확성 수정 위에 남아 있던 **UX 혼동과 exact root 중복 비용**을 정리한 단계다.

- exact root는 이제 한 번만 푼다.
- exact 결과는 이제 exact라고 표시된다.
- exact 실패 fallback도 더 이상 “정확 계산이 끝난 것처럼” 보이지 않는다.

즉, late-game에서의 **설정 의미, 실제 탐색 동작, UI 설명**이 한층 더 일치하게 되었다.
