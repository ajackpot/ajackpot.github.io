# 구현 보고서 Stage 21 — WLD 전용 Stability Cutoff 프로토타입

## 요약

이번 단계에서는 Stage 16에서 exact endgame 쪽에서 한 번 비채택으로 정리했던 stable-disc bound를, **exact bucket에는 손대지 않고 WLD bucket 안에서만** 다시 실험할 수 있도록 보수적인 프로토타입을 추가했습니다.

핵심 목표는 다음 두 가지였습니다.

1. `exactEndgameEmpties < empties <= exactEndgameEmpties + 2`의 **dedicated WLD 경로 안에서만** stable-disc bound를 사용한다.
2. exact search / depth-limited search / WLD search의 경계는 그대로 유지하면서, WLD 내부에서만 **win/loss/draw bound로 변환**해 pruning 가능성을 다시 측정한다.

최종적으로는 기능을 **기본 활성화하지 않고**, 실험 옵션으로만 남겼습니다.

## 변경 파일

- `js/ai/search-engine.js`
- `js/ai/worker.js`
- `js/test/benchmark-helpers.mjs`
- `js/test/core-smoke.mjs`
- `js/test/stage21_wld_stability_cutoff_benchmark.mjs`
- `benchmarks/stage21_bucketed_wld_stability_cutoff_spotcheck.json`
- `docs/reports/implementation/impl-stage-21-wld-only-stability-cutoff-prototype.md`
- `docs/reports/review/review-stage-21-wld-only-stability-cutoff-spotcheck.md`

## 구현 내용

### 1. WLD 전용 experimental option 추가

`SearchEngine` option 해석 단계에 다음 실험 옵션을 추가했습니다.

- `stabilityCutoff`
- `stabilityCutoffWld`
- `stabilityCutoffWldMaxEmpties`

이번 단계에서는 실제 적용 경로를 **WLD bucket 전용**으로만 열어 두었습니다.
즉 `stabilityCutoffWld`가 켜져 있어도 exact bucket에는 적용하지 않습니다.

`stabilityCutoffWldMaxEmpties`는 stability helper를 언제부터 허용할지 제어하는 보수적 threshold이고, Stage 21 spot-check에서는 **6 empties**를 대표 candidate로 사용했습니다.

### 2. stable-disc bound cache 추가

stable-disc bound 계산은 evaluator 쪽에서 이미 존재했지만, 검색 hot path에서 반복 호출될 경우 비용이 커집니다.
그래서 `state.hashKey()` 기반의 간단한 `stabilityBoundCache`를 `SearchEngine` 내부에 추가했습니다.

캐시에는 다음 정보를 저장합니다.

- evaluator가 계산한 `stableBounds`
- 이를 WLD score 체계로 변환한 `wldBounds`

`resetStats()` 시 캐시도 함께 비우도록 했습니다.

### 3. exact score bound를 WLD bound로 변환

stable-disc helper가 반환하는 값은 disc difference 기준의 안전한 범위입니다.
WLD search에서는 score 체계가 `-10000 / 0 / 10000`이므로, 이를 다음처럼 변환했습니다.

- `lowerBound > 0` → WLD lower bound = `10000`
- `lowerBound == 0` → WLD lower bound = `0`
- `upperBound < 0` → WLD upper bound = `-10000`
- `upperBound == 0` → WLD upper bound = `0`

그리고 lower/upper가 같은 값으로 만나면 WLD exact result로 취급합니다.

즉 이 프로토타입은 다음 네 종류를 다룰 수 있습니다.

- **즉시 win proof**
- **즉시 loss proof**
- **draw-or-better proof**
- **draw-or-worse proof**

### 4. WLD bucket에서만 helper 적용

`wldNegamax()`의 small WLD solver 분기 다음, legal move generation 이전에
`applyStabilityCutoff(state, alpha, beta, 'wld')`를 추가했습니다.

이 배치는 다음 의도를 가집니다.

- TT hit가 먼저 있으면 stable 계산을 생략
- tiny late leaf는 기존 small WLD solver가 처리
- 그보다 조금 위의 late WLD node에서만 안정석 bound를 시험

exact solver나 ordinary `negamax()`에는 본 프로토타입을 연결하지 않았습니다.

### 5. WLD 전용 stats 추가

다음 통계를 추가했습니다.

- `stabilityNodes`
- `stabilityCacheHits`
- `stabilityNarrowings`
- `stabilityCutoffs`
- `stabilityExacts`
- `stabilityWldNodes`
- `stabilityWldCacheHits`
- `stabilityWldNarrowings`
- `stabilityWldCutoffs`
- `stabilityWldExacts`

exact bucket용 카운터도 틀은 맞춰 두었지만, 이번 Stage 21 구현에서는 실제로 증가하지 않도록 유지했습니다.

### 6. 회귀 테스트 추가

`core-smoke`에 다음 회귀를 추가했습니다.

- stable lower bound가 **즉시 WLD win**으로 번역되는지
- stable upper bound가 **즉시 WLD loss**로 번역되는지
- `[-1, 0]` window에서 **draw-or-better** proof가 fail-high 되는지
- `[0, 1]` window에서 **draw-or-worse** proof가 fail-low 되는지
- `stabilityCutoffWld=false`일 때 helper가 완전히 비활성인지
- exact bucket search에서 WLD stability stats가 여전히 **0**인지

## 구현 후 상태

- 기능은 **실험 옵션 형태로만 존재**
- shipped default는 여전히 `stabilityCutoffWld = false`
- exact bucket에는 영향 없음
- WLD bucket에서만 별도 benchmark 가능

즉 Stage 21의 결과물은 “바로 채택한 최적화”가 아니라,
**WLD bucket에 한정된 stability-cutoff prototype + 전용 계측/회귀 기반**입니다.
