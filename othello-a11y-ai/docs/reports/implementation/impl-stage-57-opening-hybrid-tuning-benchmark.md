# 구현 보고서 Stage 57 — Opening hybrid tuning benchmark

## 배경 / 목표
- Stage 56에서 compact opening prior와 confidence gate를 엔진에 연결했지만, 임계치는 코드 상수에 박혀 있어 벤치마크 기반 보정이 어려웠습니다.
- 실제 opening-book prefix 상태를 기준으로 보면,
  - 몇몇 named continuation에서는 direct book을 너무 쉽게 포기해 search가 off-book move를 택하는 경우가 있었고,
  - 반대로 모든 skip을 direct로 되돌리면 search-only reference 대비 오히려 나빠지는 사례도 섞여 있었습니다.
- 이번 단계의 목표는 다음 세 가지였습니다.
  1. opening hybrid 임계치를 별도 tuning profile로 분리
  2. search-only reference와 비교하는 소형 benchmark 도구 추가
  3. 기본 runtime profile을 benchmark 결과가 가장 좋은 쪽으로 조정

## 변경 범위
- `js/ai/opening-tuning.js`
- `js/ai/search-engine.js`
- `tools/evaluator-training/benchmark-opening-hybrid-tuning.mjs`
- `js/test/stage57_opening_hybrid_tuning_smoke.mjs`
- `benchmarks/stage57_opening_hybrid_tuning_benchmark.json`
- `README.md`
- `docs/reports/features/feature-opening-book-integration.md`

## 핵심 변경 사항
### 1) opening hybrid tuning profile 분리
- 새 모듈 `js/ai/opening-tuning.js`를 추가했습니다.
- 다음 값을 named profile로 관리합니다.
  - direct opening-book 사용 최대 ply / 항상 direct 허용 ply
  - single-candidate direct 허용 임계치
  - multi-candidate confidence gate score/share 임계치
  - opening selection에서 prior 기여도와 missing-prior penalty scale
  - root ordering에서 prior scale과 **off-book prior scale**
- 내장 profile은 다음 다섯 가지입니다.
  - `stage56-legacy`
  - `stage57-book-led`
  - `stage57-prior-light`
  - `stage57-cautious`
  - `search-reference`

### 2) search-engine 연결
- `SearchEngine`이 `openingTuningKey` / `openingTuningProfile`을 받아 runtime에서 profile을 resolve하도록 바꿨습니다.
- direct opening-book 판단은 더 이상 하드코딩 상수가 아니라 profile 값을 사용합니다.
- single-candidate named continuation은 기존의
  - `weight >= 3`
  - 또는 `priorCount >= 64 && priorShare >= 0.55`
  에 더해,
  - `elite prior support` (Stage 57 기본 profile에서는 `priorCount >= 1024 && priorShare >= 0.40`)
  도 별도로 허용할 수 있게 했습니다.
- root ordering의 opening prior bonus는 book candidate가 있는 상태에서 **off-book move에는 추가 scale**을 곱해 더 약하게 줄 수 있게 했습니다.

### 3) opening hybrid benchmark 도구 추가
- `tools/evaluator-training/benchmark-opening-hybrid-tuning.mjs`는 opening-book seed line의 unique prefix state를 corpus로 모읍니다.
- 기본적으로 candidate engine과 `search-reference` profile(= direct book 반환 비활성)을 비교해 다음을 집계합니다.
  - agreement rate
  - direct rate
  - off-book choice rate
  - average nodes / average elapsed ms
  - ply별 통계와 대표 mismatch 예시
- output은 JSON으로 저장됩니다.

## benchmark 설정과 결과
이번 단계에서 저장한 summary는 다음 설정을 사용했습니다.

- corpus: opening-book prefix states, `ply 0..12`, `182 states`
- candidate: `depth=4`, `time=450ms`, `exactEndgameEmpties=8`
- reference: `depth=6`, `time=900ms`, `exactEndgameEmpties=8`, `openingTuningKey='search-reference'`

저장된 파일:
- `benchmarks/stage57_opening_hybrid_tuning_benchmark.json`

요약 결과:

| profile | agreement | direct | off-book | avg nodes | avg ms |
|---|---:|---:|---:|---:|---:|
| `stage57-book-led` | 58.8% | 90.7% | 3.8% | 62.7 | 1.69 |
| `stage57-prior-light` | 58.2% | 89.6% | 4.4% | 70.3 | 1.92 |
| `stage56-legacy` | 58.2% | 89.6% | 4.4% | 70.6 | 1.92 |
| `stage57-cautious` | 58.2% | 88.5% | 5.5% | 77.9 | 2.08 |

즉 `stage57-book-led`가
- agreement는 가장 높고,
- direct use도 약간 늘었고,
- off-book 선택은 더 줄었고,
- 평균 노드/시간도 가장 낮았습니다.

## 관찰 메모
- benchmark corpus 전체에서 Stage 56 legacy와 Stage 57 book-led의 실제 move 변화는 많지 않았습니다.
- 하지만 바뀐 대표 예시 중 하나인
  - `F5D6C3D3C4F4F6G5E6` (Bond continuation, ply 9)
  에서는 legacy가 confidence skip 후 search로 `C5`를 택했지만,
  `stage57-book-led`는 direct opening-book으로 `D7`을 택했고,
  search-reference도 `D7`을 선호했습니다.
- 또 하나의 변화는 move 자체는 같지만 source가 `search -> opening-book`으로 바뀐 케이스라, strength를 유지하면서 노드만 줄였습니다.
- 반대로 너무 보수적인 `stage57-cautious`는 agreement 개선 없이 direct rate만 낮아져 채택하지 않았습니다.

## 기본값 채택
- 기본 runtime profile은 `DEFAULT_OPENING_HYBRID_TUNING_KEY = 'stage57-book-led'`로 설정했습니다.
- `stage56-legacy` profile은 그대로 남겨, 회귀 비교와 benchmark baseline으로 재사용할 수 있습니다.

## 테스트
다음 테스트를 다시 실행해 통과했습니다.

```bash
node js/test/core-smoke.mjs
node js/test/stage56_opening_prior_search_integration_smoke.mjs
node js/test/stage57_opening_hybrid_tuning_smoke.mjs
python3 tests/virtual_host_smoke.py
python3 tests/ui_smoke.py
```

## 다음 단계
- benchmark corpus를 opening-book prefix뿐 아니라 선택적 prior-heavy state까지 넓힐 수 있습니다.
- `search-reference`를 더 깊은 depth/time 설정으로 늘려 tuning 민감도를 다시 볼 수 있습니다.
- compact prior의 `maxPly` / `minPositionCount`를 바꿔 size-strength tradeoff를 재실험하면, tuning profile과 함께 더 좋은 조합이 나올 수 있습니다.
