# 검토 보고서 Stage 16 — Stability Cutoff 프로토타입 스크리닝

## 배경 / 목표

외부 Othello 엔진 조사 과정에서 late exact endgame 구간에 **stable-disc 기반 bound**를 이용해 αβ window를 줄이거나 즉시 cutoff하는 기법이 널리 언급된다는 점을 확인했습니다.

이번 단계의 목표는 다음 두 가지였습니다.

1. 현재 엔진의 conservative stable-disc 계산을 이용해 **정확성에 영향을 주지 않는 안정한 bound**를 만들 수 있는지 검증한다.
2. 그 bound를 exact endgame search에 넣었을 때 **실제 JavaScript 실행 환경에서도 순이득**이 나는지 측정한다.

## 실험 범위

실험은 다음 순서로 진행했습니다.

1. stable-disc 수 `B`, `W`로부터 최종 disc difference의 안전한 범위
   - lower bound = `2B - 64`
   - upper bound = `64 - 2W`
   를 사용하는 프로토타입을 작성했습니다.
2. seeded late-endgame exact positions에서 brute-force exact score가 위 범위 안에 들어오는지 검증했습니다.
3. 프로토타입을 exact endgame search에 연결해 baseline 대비 nodes / elapsed time을 비교했습니다.
4. 결과가 순이득인지 확인한 뒤 채택 여부를 결정했습니다.

## 관련 파일

이번 단계에서 최종 반영한 파일은 다음과 같습니다.

- `js/ai/evaluator.js`
- `js/test/core-smoke.mjs`
- `benchmarks/stage16_stability_cutoff_prototype_screening.json`
- `docs/reports/review/review-stage-16-stability-cutoff-prototype-screening.md`

## 핵심 결정 사항

### 1. stable-disc bound helper는 유지

현재 evaluator의 conservative stable-disc 계산은 이미 late-game 안정성 feature에 쓰이고 있었고, 이 계산으로부터 exact endgame score의 **보수적 lower/upper bound**를 쉽게 만들 수 있었습니다.

따라서 search에 즉시 넣지는 않더라도, 이 helper 자체는 이후 ETC / WLD / solver 보강 실험에서 다시 사용할 수 있으므로 유지했습니다.

### 2. search-engine 내 Stability Cutoff는 이번 단계에서는 비채택

프로토타입은 correctness 측면에서는 문제가 없었습니다.
그러나 representative solved set 기준으로는 node 수 이득이 매우 작고, stable-disc 계산 오버헤드 때문에 elapsed time이 오히려 증가했습니다.

즉,
- **정확성은 확보되었지만**
- **현재 JS 엔진의 hot path에서는 비용 대비 pruning 강도가 충분하지 않았다**
는 결론입니다.

## 검증 방법과 결과

### 정확성 검증

`core-smoke`에 late exact regression positions를 추가해,
- conservative stable-disc lower/upper bound가
- brute-force exact score를 항상 포함하는지
검증했습니다.

해당 회귀 검증은 통과했습니다.

### 기존 회귀 검증

다음 기존 검증도 다시 통과했습니다.

- `node js/test/core-smoke.mjs`
- `node js/test/perft.mjs`

## 벤치마크 / 근거 데이터

상세 수치는 `benchmarks/stage16_stability_cutoff_prototype_screening.json`에 정리했습니다.

대표 solved exact case 6개 합산 결과는 다음과 같습니다.

- baseline nodes: `20,856`
- prototype nodes: `20,822`
- node delta: `-34` (`-0.16%`)
- baseline elapsed: `3,141 ms`
- prototype elapsed: `3,332 ms`
- elapsed delta: `+191 ms` (`+6.08%`)

즉, pruning 자체는 일부 생겼지만, JS 환경에서 stable-disc 계산 비용이 그 이득을 상쇄했습니다.

## 리스크 / 비채택 항목

이번 단계에서 비채택으로 결론낸 항목:

- **late exact-search Stability Cutoff 활성화**

비채택 이유:

1. representative solved set에서 elapsed time 기준 순이득이 없었습니다.
2. node 감소가 매우 제한적이었습니다.
3. current engine은 already-small exact solver / TT-first / late ordering이 있어, stable-disc 계산 비용이 상대적으로 더 크게 드러났습니다.

## 다음 단계

가장 유망한 다음 후보는 다음 둘 중 하나입니다.

1. **Conservative ETC (Enhanced Transposition Cutoff)**
   - 이미 있는 TT와 더 직접적으로 결합되므로, stable-disc 계산보다 hot-path 비용이 낮을 가능성이 있습니다.
2. **WLD pre-pass 실험**
   - exact solve 직전 1~2수 구간에서만 한정적으로 시도하면, score-maximizing solve의 ordering/branch reduction에 도움이 될 가능성이 있습니다.

현재 상태에서는 **ETC를 먼저 시험하는 것이 더 우선순위가 높다**고 판단합니다.
