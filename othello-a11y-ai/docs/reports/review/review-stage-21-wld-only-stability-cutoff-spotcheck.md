# 검토 보고서 Stage 21 — WLD 전용 Stability Cutoff spot-check

## 배경 / 목표

Stage 20에서 기법별 효과를 exact bucket과 WLD bucket으로 나눠 다시 보는 틀을 만들었고,
이번 단계에서는 그 첫 후속 실험으로 **stability cutoff가 WLD bucket에서는 다시 살아날 여지가 있는지** 점검했습니다.

중요한 제약은 그대로 유지했습니다.

- exact bucket에는 본 실험을 넣지 않는다.
- WLD는 dedicated root-only 경로에서만 사용한다.
- depth-limited / exact / WLD 경로를 서로 섞지 않는다.

## 이번 단계의 질문

1. stable-disc bound를 WLD score 체계로 바꾸면 실제 WLD search에서 pruning이 생기는가?
2. pruning이 생긴다면 **elapsed time 기준 순이득**도 나는가?
3. exact-reference outcome이나 선택 수 quality를 망치지 않는가?
4. 이 결과를 바탕으로 기본 활성화할 가치가 있는가?

## 실험 설정

### candidate

- `stabilityCutoffWld = true`
- `stabilityCutoffWldMaxEmpties = 6`

threshold는 무턱대고 높게 두지 않고, small WLD solver 직전의 매우 late WLD node에만 걸리도록 보수적으로 잡았습니다.

### baseline

- `stabilityCutoffWld = false`

### benchmark 구성

이번 spot-check는 로컬 실행 환경의 짧은 wall-clock 제한 때문에 representative subset으로 줄였습니다.

1. **expert-like 14 empties exact-reference set**
   - seeds: `23, 37, 48, 60`
   - baseline/candidate 모두 WLD bucket
   - exact reference는 `exactEndgameEmpties=14`로 별도 solve
2. **impossible-like 18 empties black spot-check**
   - seed: `72`
   - black to move
   - heavy WLD bucket representative 한 건 점검

상세 데이터는 `benchmarks/stage21_bucketed_wld_stability_cutoff_spotcheck.json`에 있습니다.

## 회귀 검증

다음 회귀는 모두 통과했습니다.

- `node js/test/core-smoke.mjs`
- `node js/test/perft.mjs`
- `python3 tests/ui_smoke.py`
- `python3 tests/virtual_host_smoke.py`

추가한 WLD stability 전용 회귀에서는

- proven win / loss
- draw-or-better / draw-or-worse narrow window pruning
- disabled path no-op
- exact bucket no-touch

를 모두 확인했습니다.

## 핵심 결과

### 1. 14-empty exact-reference set

합산 결과:

- baseline elapsed: `1371 ms`
- candidate elapsed: `2147 ms`
- delta: `+776 ms`
- baseline nodes: `14061`
- candidate nodes: `13790`
- delta: `-271`
- candidate stability WLD nodes: `5633`
- candidate stability WLD narrowings: `91`
- candidate stability WLD cutoffs: `91`

정확도/일치율:

- baseline vs candidate same move: `4 / 4`
- baseline vs candidate same outcome: `4 / 4`
- baseline vs candidate same score: `4 / 4`
- baseline outcome agreement vs exact: `4 / 4`
- candidate outcome agreement vs exact: `4 / 4`
- baseline move agreement vs exact: `2 / 4`
- candidate move agreement vs exact: `2 / 4`

즉,
**WLD stability cutoff는 실제로 작동해서 91번의 narrowing/cutoff를 만들었지만,
그 대가로 시간이 오히려 더 늘었습니다.**

### 2. 18-empty black spot-check

seed `72` 결과:

- baseline elapsed: `4382 ms`
- candidate elapsed: `5325 ms`
- delta: `+943 ms`
- baseline nodes: `25394`
- candidate nodes: `25085`
- delta: `-309`
- candidate stability WLD nodes: `12498`
- candidate stability WLD narrowings: `77`
- candidate stability WLD cutoffs: `77`

그리고 baseline/candidate는

- same move: `1 / 1`
- same outcome: `1 / 1`
- same score: `1 / 1`

였습니다.

즉 heavy black WLD spot-check에서도
**약간의 node 감소는 있었지만 elapsed time은 더 나빠졌습니다.**

## 해석

이번 결과는 Stage 16 exact prototype 때와 패턴이 비슷하지만,
관찰 구간이 exact bucket이 아니라 **WLD bucket**이라는 점이 다릅니다.

요약하면:

1. WLD bucket에서도 stable-disc bound는 **분명 pruning 근거로 쓸 수 있습니다.**
2. 실제로 narrow window에서 draw-or-better / draw-or-worse proof가 생기고, cutoff도 발생합니다.
3. 그러나 현재 JS 엔진에서는 stable-disc 계산 자체의 hot-path 비용이 여전히 큽니다.
4. 그 결과 **node 감소는 시간 감소로 이어지지 않았습니다.**

즉 이번 단계는 “WLD에서는 아예 안 된다”가 아니라,
**WLD에서도 correctness와 pruning 신호는 있으나, 현재 구현 비용으로는 여전히 순성능이 나쁘다**는 결론입니다.

## 최종 판단

### 기본 채택: 보류 / 비채택

이번 Stage 21 WLD 전용 stability cutoff는 **기본 활성화하지 않습니다.**

이유:

1. expert-like 14-empty exact-reference set에서 elapsed time이 악화되었습니다.
2. 18-empty black spot-check에서도 elapsed time이 악화되었습니다.
3. move/outcome quality를 해치지는 않았지만, 그렇다고 quality가 개선된 것도 확인되지 않았습니다.
4. 따라서 shipped default로 켜 둘 실익이 없습니다.

## 남긴 가치

비록 비채택이지만, 이번 단계로 다음 기반은 남았습니다.

- WLD bucket 전용 stability stats
- WLD-only stability regression tests
- stable bound cache
- threshold를 조절해 재실험할 수 있는 option path

즉 앞으로

- 더 싼 stable approximation
- 특정 edge/corner pattern에서만 selective activation
- WLD small-solver 직전 한정 활성화

같은 방향으로 다시 실험할 수 있습니다.

## 결론

Stage 21 결과는 다음 한 줄로 정리할 수 있습니다.

> **WLD bucket에서도 stability cutoff는 작동하지만, 현재 JavaScript 구현에서는 node를 조금 줄이는 대신 시간을 더 잡아먹으므로 기본 채택하지 않는다.**
