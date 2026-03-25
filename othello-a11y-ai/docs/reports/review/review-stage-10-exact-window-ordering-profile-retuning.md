# 구현 검토 보고서 Stage 10 — exact window ordering profile 재튜닝

## 이번 단계 목표

Stage 9의 다음 자연스러운 후보는 두 가지였습니다.

1. child empties `15~18` 구간까지 teacher bucket을 더 확장하기
2. exact window 안에서 어떤 ordering 신호를 더 믿을지 다시 튜닝하기

실험을 먼저 돌려 보니, **브라우저 JavaScript 환경에서 `16~18` empties exact teacher 데이터를 충분히 모으는 비용이 예상보다 훨씬 컸습니다.**
대표적으로 low-branching 16-empty 샘플도 단일 exact root 수집에 수십 초가 걸렸고, 17-empty 이상은 표본 수집 속도가 더 나빴습니다.

그래서 이번 단계는
- `15~18` bucket 확장을 바로 넣기보다,
- **이미 exact window에서 작동 중인 ordering profile의 결합 강도를 다시 튜닝**해서
- 실제 `findBestMove()`의 노드 수와 시간을 줄이는 쪽에 집중했습니다.

## 이번 단계에서 확인한 핵심

Stage 9의 exact ordering profile은 이미
- generic positional/history ordering 비중을 줄이고
- trained lightweight ordering evaluator를 더 강하게 쓰는 방향이었습니다.

하지만 15-empty exact benchmark를 다시 보면,
- 아직도 killer/history/positional/flip 쪽 generic 신호가 exact ordering 안에 일정 비중으로 남아 있었고,
- `13~14` exact-teacher bucket을 쓰는 trained ordering signal은 더 강하게 밀어도 되는 여지가 있었습니다.

즉, 이번 단계의 질문은
**“exact 창 안에서는 일반 중반 ordering 감각을 어디까지 지워도 되는가?”**
였습니다.

## 후보 프로필 탐색 결과

15-empty exact 샘플 몇 개를 기준으로 exact profile 후보를 비교했습니다.

관찰:
- `lightweightEvalScale`만 단순히 올리는 것은 일관되지 않았습니다.
- 반면 exact 창 안에서
  - `history / positional / flip`을 사실상 0으로 내리고,
  - `risk`는 약한 잔여 패널티만 남기고,
  - `mobility / corner-reply / parity / trained ordering` 쪽을 더 강화하는 프로필이
  실제 exact tree를 더 작게 만들었습니다.

이 패턴은 15-empty 작은 훈련 샘플뿐 아니라, 따로 잡은 holdout 15-empty 샘플과 14-empty / 13-empty exact benchmark에도 이어졌습니다.

## 이번에 반영한 코드 변경

파일:
- `js/ai/search-engine.js`

변경된 exact-window late ordering profile:

기존 Stage 9:
- killerPrimary `0.65`
- killerSecondary `0.55`
- history `0.18`
- positional `0.2`
- flip `0.2`
- risk `0.45`
- mobility penalty `1.1`
- corner-reply penalty `1.15`
- parity `1.15`
- lightweight evaluator `3`

Stage 10:
- killerPrimary `0.5`
- killerSecondary `0.4`
- history `0`
- positional `0`
- flip `0`
- risk `0.25`
- mobility penalty `1.2`
- corner-reply penalty `1.25`
- parity `1.25`
- lightweight evaluator `4.5`

해석:
- exact 창 안에서는 **generic midgame ordering noise를 거의 제거**하고,
- trained late-ordering score와 exact-tactical 제약(상대 기동성, 코너 응수, 패리티)을 더 강하게 믿도록 만든 것입니다.

## 테스트 보강

파일:
- `js/test/core-smoke.mjs`

추가/강화한 확인:
- exact-window ordering profile은 `lightweightEvalScale >= 4`
- exact-window ordering profile은 `historyScale === 0`
- exact-window ordering profile은 `positionalScale === 0`
- exact-window ordering profile은 `flipScale === 0`
- exact-window ordering profile은 `riskScale < 0.3`

즉, 테스트가 이제
**Stage 10의 정책: “exact 창 안에서는 generic ordering noise를 거의 쓰지 않는다”**
를 직접 고정합니다.

## 검증 결과

통과한 회귀/스모크 테스트:

- `node js/test/core-smoke.mjs`
- `node js/test/perft.mjs`
- `python3 tests/virtual_host_smoke.py`
- `python3 tests/ui_smoke.py`

모두 통과했습니다.

## 벤치마크 결과

### A) 15 empties exact-search — tuning sample
파일:
- `benchmarks/exact_ordering_profile_15empties_train_stage9_vs_stage10.json`

seeds:
- `10, 41, 58`

결과:
- mean nodes: `54336.33 -> 52071.33` (**-4.2%**)
- mean ms: `3025.33 -> 2939.00` (**-2.9%**)
- best move / score agreement: `3 / 3`

해석:
- 튜닝에 쓴 작은 샘플에서는 무난한 개선이 확인됐습니다.
- 다만 이 표본만으로는 과적합 위험을 배제하기 어렵기 때문에 아래 holdout을 따로 봤습니다.

### B) 15 empties exact-search — holdout sample
파일:
- `benchmarks/exact_ordering_profile_15empties_holdout_stage9_vs_stage10.json`

seeds:
- `3, 33, 34`

결과:
- mean nodes: `137207.00 -> 111949.33` (**-18.4%**)
- mean ms: `8357.00 -> 6617.00` (**-20.8%**)
- best move / score agreement: `3 / 3`

해석:
- holdout 쪽에서 오히려 개선 폭이 더 컸습니다.
- 즉, 이번 프로필 변경은 단순한 training-sample 맞춤이 아니라
  **exact 15-empty search에서 generic ordering noise를 줄이는 방향이 실제로 먹힌다**는 신호로 해석할 수 있습니다.

### C) 14 empties exact-search
파일:
- `benchmarks/exact_ordering_profile_14empties_stage9_vs_stage10.json`

seeds:
- `104, 105`

결과:
- mean nodes: `59988.5 -> 44983.5` (**-25.0%**)
- mean ms: `3726.5 -> 2859.5` (**-23.3%**)
- best move / score agreement: `2 / 2`

해석:
- Stage 9에서 이미 개선됐던 14-empty exact benchmark가
  Stage 10에서 한 번 더 줄었습니다.
- exact window 안에서는 generic ordering 신호를 더 줄이는 편이 확실히 유리했습니다.

### D) 13 empties exact-search
파일:
- `benchmarks/exact_ordering_profile_13empties_stage9_vs_stage10.json`

seeds:
- `31, 32, 33, 34`

결과:
- mean nodes: `17302.25 -> 15854.5` (**-8.4%**)
- mean ms: `1009.0 -> 914.0` (**-9.4%**)
- exact score agreement: `4 / 4`
- move+score agreement: `3 / 4`

주의:
- seed `33`에서는 best move 좌표가 바뀌었지만 exact score는 동일했습니다.
- 즉, **동률 최선수 중 다른 수를 고른 케이스**로 보는 것이 맞습니다.

해석:
- 13-empty 쪽에서도 exact tree가 조금 더 줄었습니다.
- 이번 변경은 14~15 empties뿐 아니라, 그보다 약간 더 안쪽 exact 구간에도 나쁘지 않게 이어집니다.

## 이번 단계 결론

### 얻은 것
- exact window ordering에서 generic history/positional/flip 신호를 더 강하게 제거하고,
  trained late-ordering signal과 exact-tactical ordering 신호를 더 믿는 쪽으로 재튜닝했습니다.
- 그 결과 13/14/15 empties exact benchmark에서 모두 실제 노드 수와 시간이 줄었습니다.
- 특히 14-empty와 15-empty holdout 샘플에서는 개선 폭이 꽤 뚜렷했습니다.

### 이번 단계에서 일부러 하지 않은 것
- `15~18` child-empty teacher bucket 확장은 이번 단계에 넣지 않았습니다.
- 이유는 **브라우저 JS exact-search로 충분한 teacher 데이터를 모으는 비용이 너무 컸고,**
  이번 exact-profile retune만으로도 이미 실측 이득이 뚜렷했기 때문입니다.

## 판단

Stage 10은
“exact window에서는 어떤 ordering 신호를 더 신뢰할지”를 다시 튜닝해,
**기존 trained evaluator가 더 잘 작동하도록 만든 단계**입니다.

즉, 이번 핵심은 새 feature를 늘린 것이 아니라,
**exact 구간에서 generic midgame ordering을 과감히 비우고 late tactical truth에 더 가까운 신호를 남긴 것**
입니다.

## 다음 후보

다음 단계 후보는 두 갈래입니다.

1. **child-empty `15~16` bucket만 제한적으로 추가**
   - 17~18까지 욕심내기보다,
   - exact teacher를 수집 가능한 16-empty root 표본부터 보수적으로 열기

2. **정확 탐색 진입 직전(pre-exact) 프로필 분리**
   - 현재는 Stage 9의 pre-exact profile을 유지하고 있으므로,
   - `17~18` empties 쪽에서 “exact 직전” ordering을 따로 다시 튜닝할 여지가 있습니다.
