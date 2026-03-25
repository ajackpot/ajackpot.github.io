# 구현 검토 보고서 Stage 11 — `15~16` bucket / `17~18` pre-exact profile 실험 결과

## 이번 단계 목표

Stage 10까지의 결론은 분명했습니다.

- exact window 안에서는 generic midgame ordering 신호를 크게 비우고
- trained late-ordering 신호와 exact-tactical ordering 제약을 더 믿는 편이 실제 tree를 더 줄였습니다.

그 다음 후보로 남아 있던 것은 두 가지였습니다.

1. **child-empty `15~16` bucket을 제한적으로 추가**
2. **`17~18` empties 전용 pre-exact ordering profile을 따로 분리**

사용자 코멘트대로 둘 다 큰 기대를 걸기는 어려웠지만,
**실제로 실험해 볼 가치는 있는 후보**였기 때문에 이번 단계에서는 두 가설을 모두 소형 벤치마크로 검증했습니다.

## 실험 원칙

이번 단계는 **“좋은 아이디어처럼 보이는가”가 아니라 “실제 JS 브라우저 엔진 tree를 줄이는가”**만 봤습니다.

즉, ordering 점수나 root ranking이 바뀌는 것 자체는 부차적이고,
최종 판단 기준은 다음이었습니다.

- `findBestMove()` 실제 노드 수
- 15초 예산 안에서의 실제 완료 깊이
- best move / score 일치 여부
- ordering 변화가 있어도 tree가 줄지 않으면 **채택하지 않음**

## 후보 A — child-empty `15~16` bucket

### 시도한 bucket 후보

`MoveOrderingEvaluator`에 `15~16` child-empty bucket을 임시로 붙여
몇 가지 단순 가중치를 시험했습니다.

대표 후보:
- A1: mobility `+1000`, cornerAdjacency `-500`, edgePattern `+1000`
- A2: mobility `+1500`, cornerAdjacency `-1000`, edgePattern `+500`
- A3: mobility `+500`, edgePattern `+1500`

정식 코드에는 넣지 않았고, benchmark용 monkey patch로만 시험했습니다.

### 빠른 root-ordering screening

먼저 expensive search 전에, seeded random state 120개에 대해 root ordering이 얼마나 바뀌는지 봤습니다.

파일:
- `benchmarks/stage11_ordering_screening_scans.json`

관찰:
- A3는 `16 empties`에서 **120개 중 92개**의 전체 ordering을 바꿨고,
  top move도 **8개** 상태에서 바꿨습니다.
- `17 empties`에서도 전체 ordering은 **89개** 상태에서 달라졌고,
  top move는 **6개** 상태에서 바뀌었습니다.

즉, 이 후보는 **ordering score를 실제로 건드리고 있었습니다.**
문제는 그 다음입니다.

### 실제 exact-search benchmark

bench:
- `benchmarks/stage11_bucket_15_16_stage10_vs_candidateA3.json`

세팅:
- `exactEndgameEmpties = 16`
- `timeLimitMs = 15000`
- `maxDepth = 4`

cases:
- `16 empties`: seeds `13, 80, 119`
- `17 empties`: seeds `23, 37, 49, 58`

결과:
- mean nodes: `150684.0 -> 150684.0`
- mean ms: `7452.14 -> 7222.86`
- score agreement: `7 / 7`
- move agreement: `7 / 7`

중요한 점:
- **노드 수는 7개 전 표본에서 정확히 동일했습니다.**
- 시간만 약간 줄어든 것처럼 보이지만, 이건 node 감소 없이 나온 변화라
  ordering 개선이라기보다 런타임 흔들림으로 보는 편이 안전합니다.

### 해석

이 후보는
- root ordering 자체는 많이 바꾸지만
- **실제 αβ / PVS tree 구조는 거의 못 바꿨습니다.**

즉, 현재 Stage 10 exact profile + TT + killer/history 체계 위에서는
`15~16` bucket이 **새 pruning/cutoff를 만들어 내지 못했습니다.**

결론:
- **후보 A는 채택하지 않았습니다.**

## 후보 B — `17~18` pre-exact profile 분리

### 시도한 profile 후보

Stage 10의 pre-exact profile보다 조금 더 “late tactical” 쪽을 믿는 방향을 시험했습니다.

대표 후보:
- B1:
  - killer `0.75 / 0.65`
  - history `0.25`
  - positional `0.35`
  - flip `0.35`
  - risk `0.55`
  - mobility penalty `1.15`
  - corner reply `1.20`
  - parity `1.15`
  - lightweight evaluator `2.5`
- B2:
  - B1보다 조금 약한 보수형
  - lightweight evaluator `2.1`
  - history/positional/flip/risk는 baseline보다 약간만 낮춤

역시 정식 코드에는 넣지 않았고 benchmark patch로만 검증했습니다.

### 빠른 root-ordering screening

파일:
- `benchmarks/stage11_ordering_screening_scans.json`

관찰:
- B1은 `17 empties`에서 전체 ordering을 **75/120** 상태에서 바꿨지만,
  top move는 **2개** 상태에서만 바꿨습니다.
- `18 empties`에서는 전체 ordering을 **82/120** 상태에서,
  top move는 **8개** 상태에서 바꿨습니다.

즉, profile 분리는 분명히 ordering 점수를 바꾸고 있었습니다.

### `17 empties` manageable exact-search benchmark

bench:
- `benchmarks/stage11_pre_exact_17_stage10_vs_candidateB1.json`

cases:
- seeds `23, 37, 49, 58`

결과:
- mean nodes: `166957.5 -> 166957.5`
- mean ms: `8244.5 -> 7909.25`
- score agreement: `4 / 4`
- move agreement: `4 / 4`

핵심:
- **노드 수가 4개 전 표본에서 정확히 동일**
- 시간만 조금 줄었지만, 역시 node 변화가 없어서 ordering 개선의 근거로 쓰기 어렵습니다.

### `18 empties` 15초 budget benchmark

bench:
- `benchmarks/stage11_pre_exact_18_stage10_vs_candidates.json`

cases:
- seeds `60, 48, 72`

baseline(Stage 10):
- 세 표본 모두 15초 예산을 꽉 써서 종료
- completedDepth는 `1`
- 즉, 이 구간은 여전히 매우 무겁습니다.

결과:
- B1:
  - mean nodes: `290159.33 -> 290134.33` (**-0.0086%**)
  - 시간은 세 표본 모두 동일하게 15초 사용
  - 사실상 **무시 가능한 변화**
- B2:
  - mean nodes: `290159.33 -> 296817.0` (**+2.29%**)
  - 명확한 개선 없음, 오히려 약간 악화

### A+B 결합도 확인

같은 파일의 `combo3`는
- A3 bucket + B1 profile을 같이 켠 실험입니다.

결과:
- mean nodes: `290159.33 -> 297614.33` (**+2.57%**)

즉, 둘을 합쳐도 좋아지지 않았습니다.

## 이번 단계 결론

### 얻은 것
- `15~16` child-empty bucket과 `17~18` pre-exact profile 분리는
  **ordering score 자체는 충분히 많이 바꾼다**는 것을 확인했습니다.
- 하지만 Stage 10 기준 엔진 위에서,
  그 ordering 변화가 **실제 αβ tree 감소로 이어지지 않는다**는 것도 확인했습니다.
- 특히 `15~16` bucket은 manageable exact benchmark에서
  **노드 수를 단 한 건도 바꾸지 못했습니다.**
- `17~18` pre-exact profile도
  `17 empties` exact benchmark에서는 **노드 변화 0**,
  `18 empties` 15초 예산 benchmark에서는 **거의 0 또는 악화**였습니다.

### 판단
이번 단계의 결론은 명확합니다.

**Stage 10의 설계가 이미 이 구간에서는 충분히 보수적이고,  
이번에 시험한 `15~16 bucket` / `17~18 pre-exact profile` 후보는  
“ordering을 바꾸는 것”까지는 성공했지만 “실제 search tree를 줄이는 것”에는 실패했습니다.**

따라서 이번 Stage 11에서는
- 엔진 로직은 **변경하지 않았고**
- Stage 10 코드를 그대로 유지했습니다.

즉, 이번 단계는 **“좋아 보이는 후보를 실험했지만 채택하지 않기로 한 단계”**입니다.

## 검증

이번 단계에서는 엔진 코드 변경을 merge하지 않았으므로,
기준선(Stage 10 유지)에 대해 회귀 검증만 다시 확인했습니다.

통과:
- `node js/test/core-smoke.mjs`
- `node js/test/perft.mjs`
- `python3 tests/virtual_host_smoke.py`

참고:
- `tests/ui_smoke.py`는 이번 인터페이스에서는 안정적으로 완료 여부를 재확인하지 못했습니다.
  이번 단계에서는 엔진 로직을 유지했기 때문에, 핵심 판단은 search/evaluator benchmark와
  위 회귀 테스트 통과를 기준으로 내렸습니다.

## 산출물

- `benchmarks/stage11_bucket_15_16_stage10_vs_candidateA3.json`
- `benchmarks/stage11_pre_exact_17_stage10_vs_candidateB1.json`
- `benchmarks/stage11_pre_exact_18_stage10_vs_candidates.json`
- `benchmarks/stage11_ordering_screening_scans.json`

## 다음 후보

이번 두 후보가 모두 채택되지 않았기 때문에,
다음 단계가 있다면 방향은 다시 바뀌는 편이 맞습니다.

남는 후보는 대략 두 갈래입니다.

1. **ordering이 아니라 evaluator 자체의 late-stage discrimination을 더 높이는 방향**
   - 예: small learned table / sparse feature 추가
2. **search profile보다 data/benchmark coverage를 늘리는 방향**
   - 더 많은 manageable exact sample을 모아
   - 어떤 구간에서 정말 tree가 줄어드는지 다시 찾기

하지만 현재까지의 데이터만 보면,
적어도 이번에 검토한 두 후보는 **Stage 10 baseline을 넘지 못했습니다.**
