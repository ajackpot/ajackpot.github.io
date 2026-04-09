# 구현 보고서 Stage 59 — Opening wrap-up 후보 적용/채택

## 목표
Stage 58까지의 stronger reference suite를 바탕으로,
오프닝 마무리 단계에서 가장 효과가 큰 후보만 골라 실제 코드에 적용하고,
채택/보류 결정을 수치로 남깁니다.

이번 단계의 질문은 세 가지였습니다.

1. curated opening book를 너무 과하게 믿는 분기를 어떻게 줄일 것인가?
2. direct opening-book 반환 깊이를 그대로 둘 것인가, 줄일 것인가?
3. 둘을 합친 절충안이 실제로 가장 좋은가?

## 추가/수정 파일
- `js/ai/opening-tuning.js`
- `js/ai/search-engine.js`
- `tools/evaluator-training/benchmark-opening-hybrid-tuning.mjs`
- `tools/evaluator-training/replay-opening-hybrid-reference-suite.mjs`
- `js/test/stage59_opening_wrapup_candidates_smoke.mjs`
- `benchmarks/stage59_opening_wrapup_candidates.json`

## 적용한 후보

### 1) prior contradiction veto
`search-engine.js`에 opening direct-use gate의 새 veto 조건을 추가했습니다.

직관은 단순합니다.

- book는 direct 반환을 허용하려고 함
- 하지만 WTHOR prior가 충분한 샘플 수를 갖고,
- book가 고른 수보다 다른 수를 훨씬 더 강하게 밀고 있으며,
- book가 고른 수의 prior rank가 낮을 때

직접 북 반환을 취소하고 search로 돌립니다.

이번 기본 threshold는 다음입니다.

- `priorContradictionVetoMinPly = 4`
- `priorContradictionVetoMinCount = 2000`
- `priorContradictionVetoMinRank = 2`
- `priorContradictionVetoMinShareDelta = 0.08`

즉 4 ply 이후, prior evidence가 2000건 이상이고,
book top choice가 prior 1위가 아니며,
prior 1위 점유율이 선택 수보다 8%p 이상 높으면 direct book을 취소합니다.

이 veto는 런타임 stats와 결과 metadata에도 남깁니다.

- `stats.openingPriorContradictionVetoes`
- `result.bookHit.priorContradictionVeto`

### 2) direct cap 9
기존 `stage57-book-led`는 direct opening-book 반환을 12 ply까지 허용했습니다.
Stage 58 benchmark를 보면 9~12 ply에서도 direct use가 많이 남아 stronger reference와 어긋나는 경우가 있었습니다.

그래서 후보로
- `stage59-cap9`
- `stage59-cap9-prior-veto`
를 추가해, direct opening-book 반환 상한을 9 ply로 줄였습니다.

### 3) wrap-up replay benchmark
Stage 58 reference suite는 reference 생성 자체가 무겁습니다.
후보를 여러 개 시험하는 마무리 단계에서는 reference를 다시 계산하기보다,
기존 `benchmarks/stage58_opening_hybrid_reference_suite.json`을 재사용하는 쪽이 더 적합합니다.

그래서 `tools/evaluator-training/replay-opening-hybrid-reference-suite.mjs`를 추가했습니다.

이 도구는
- Stage 58 reference JSON을 그대로 읽고
- 같은 prefix corpus(182 states)를 복원한 뒤
- candidate profile만 빠르게 재평가합니다.

## 결과
Replay benchmark 결과는 `benchmarks/stage59_opening_wrapup_candidates.json`에 저장했습니다.

기본 후보 5개의 종합 순위는 다음과 같습니다.

| 순위 | profile | worst agreement | avg agreement | avg nodes | direct rate |
|---|---|---:|---:|---:|---:|
| 1 | `stage59-cap9-prior-veto` | 60.4% | 62.1% | 292.9 | 60.4% |
| 2 | `stage59-prior-veto` | 59.9% | 61.2% | 94.5 | 85.7% |
| 3 | `stage59-cap9` | 58.2% | 59.0% | 261.1 | 65.4% |
| 4 | `stage57-prior-light` | 58.2% | 58.2% | 70.3 | 89.6% |
| 5 | `stage57-book-led` | 57.7% | 58.1% | 62.7 | 90.7% |

`stage59-cap9-prior-veto`의 scenario별 수치는 다음과 같습니다.

| reference | agreement | direct rate | contradiction veto rate | avg nodes | avg ms |
|---|---:|---:|---:|---:|---:|
| `stage57-baseline` | 63.7% | 60.4% | 4.9% | 292.9 | 14.9 |
| `stage58-strong-assisted` | 60.4% | 60.4% | 4.9% | 292.9 | 14.9 |
| `stage58-strong-pure` | 62.1% | 60.4% | 4.9% | 292.9 | 14.9 |

## 채택/보류 결정

### 채택: `stage59-cap9-prior-veto`
이 profile을 기본 runtime default로 채택했습니다.

이유는 명확합니다.

- baseline/strong/pure 세 reference를 모두 본 worst-case agreement가 가장 높음
- average agreement도 가장 높음
- average elapsed가 약 14.9ms로, 정적 웹 앱에서 감당 가능한 범위
- veto가 실제로는 약 4.9% case에서만 발동하므로, 오프닝북을 완전히 버리는 접근이 아님

### 보류: `stage59-prior-veto`
이 profile은 direct rate를 85.7%로 많이 유지하면서도,
`stage57-book-led` 대비 agreement를 크게 개선했습니다.

- worst 57.7% → 59.9%
- avg 58.1% → 61.2%

노드도 94.5로 낮아 매우 매력적입니다.
다만 stronger reference까지 포함한 종합 순위에서는 `stage59-cap9-prior-veto`가 조금 더 높으므로,
이번에는 기본값으로 올리지 않고 “저비용 대안 후보”로 남겼습니다.

### 보류: `stage59-cap9`
단순 direct cap만으로도 stronger reference 쪽은 개선됐지만,
prior contradiction veto가 없는 경우 개선 폭이 제한적이었습니다.

즉 “깊이를 줄이는 것”만으로는 부족했고,
실제로 중요한 건 “WTHOR prior가 강하게 반대하는 특정 분기를 veto하는 것”이었습니다.

### 기각: veto된 경우에 더 깊은 fallback search를 주는 안
프로토타입으로 시험해 본 결과,
동일한 veto case에서 fallback search depth/time을 더 올려도 stronger reference alignment가 추가로 좋아지지 않았고,
baseline agreement만 내려가는 경우가 있어 채택하지 않았습니다.

## 대표 회귀 예시
대표 veto 예시는 `C4E3F5E6`입니다.

- `stage57-book-led`: direct opening-book `F4`
- `stage59-prior-veto`: prior contradiction veto 발동 후 search `F6`

해당 국면에서는 Stage 57 baseline / Stage 58 strong-assisted / Stage 58 strong-pure reference가 모두 `F6`를 고릅니다.

또 다른 변화는 late direct cap입니다.

- prefix `C4C3D3C5B3F4B5B4C6D6` (10 ply)
- `stage57-book-led`: direct opening-book `F5`
- `stage59-cap9-prior-veto`: search fallback

즉 이번 단계의 변화는
- 초중반 controversial branch에서는 veto,
- 10 ply 이후부터는 direct book 자체를 줄이는
두 축으로 정리됩니다.

## 결론
Stage 59에서의 결론은 다음과 같습니다.

1. 가장 큰 효과는 **prior contradiction veto**였습니다.
2. 그 다음 큰 효과는 **direct-use cap을 12 → 9 ply로 줄이는 것**이었습니다.
3. 둘을 결합한 `stage59-cap9-prior-veto`가 strongest multi-reference 기준으로 최선이었습니다.
4. 따라서 opening hybrid 기본값은 `stage59-cap9-prior-veto`로 올렸습니다.

## 검증
```bash
node js/test/core-smoke.mjs
node js/test/stage56_opening_prior_search_integration_smoke.mjs
node js/test/stage57_opening_hybrid_tuning_smoke.mjs
node js/test/stage58_opening_hybrid_reference_suite_smoke.mjs
node js/test/stage59_opening_wrapup_candidates_smoke.mjs
```
