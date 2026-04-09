# 구현 보고서 Stage 58 — Stronger opening hybrid reference suite benchmark

## 배경 / 목표
- Stage 57에서는 opening-book prefix corpus를 `search-reference` 한 종류와만 비교했습니다.
- 하지만 이 reference는
  - direct opening-book 반환만 끈 상태이고,
  - opening prior ordering은 약하게 남아 있으며,
  - depth/time budget도 상대적으로 얕았습니다.
- 이번 단계의 목표는 다음 세 가지였습니다.
  1. stronger reference 조건을 코드로 명시적으로 관리
  2. 하나의 candidate profile을 여러 reference에 대해 동시에 비교
  3. stronger reference 결과를 보더라도 기본 runtime profile을 바꿔야 하는지 판단 근거를 확보

## 변경 범위
- `js/ai/opening-tuning.js`
- `tools/evaluator-training/benchmark-opening-hybrid-tuning.mjs`
- `js/test/stage58_opening_hybrid_reference_suite_smoke.mjs`
- `benchmarks/stage58_opening_hybrid_reference_suite.json`
- `README.md`
- `tools/evaluator-training/README.md`
- `docs/reports/features/feature-opening-book-integration.md`
- `stage-info.json`

## 핵심 변경 사항
### 1) stronger reference profile 추가
`js/ai/opening-tuning.js`에 benchmark 전용 reference profile 두 가지를 더 추가했습니다.

- `search-reference-strong`
  - direct opening-book 비활성
  - opening prior selection bonus 비활성
  - ordering prior만 아주 약하게 유지
- `search-reference-pure`
  - direct opening-book 비활성
  - opening prior selection / ordering 모두 비활성

기존 `search-reference`는 Stage 57 baseline 재현용으로 그대로 유지했습니다.

### 2) benchmark 도구를 multi-reference suite로 확장
`tools/evaluator-training/benchmark-opening-hybrid-tuning.mjs`를 확장해,
기본적으로 다음 세 reference scenario를 함께 비교하도록 했습니다.

- `stage57-baseline`
  - depth 6 / time 900ms / `search-reference`
- `stage58-strong-assisted`
  - depth 8 / time 1600ms / `search-reference-strong`
- `stage58-strong-pure`
  - depth 7 / time 2200ms / `search-reference-pure`

또한 다음을 새로 저장합니다.

- scenario별 profile ranking
- reference pairwise agreement
- scenario 전체에서의 unanimous rate
- 여러 reference를 합친 overall ranking
  - `worstAgreementRate`
  - `averageAgreementRate`
  - `agreementSpread`

기존 단일 reference CLI도 호환됩니다.
`--reference-max-depth`, `--reference-time-limit-ms`, `--reference-opening-tuning-key`를 주면 custom single-reference 모드로 동작합니다.

## benchmark 설정과 결과
이번 단계에서 저장한 summary는 다음 설정을 사용했습니다.

- corpus: opening-book prefix states, `ply 0..12`, `182 states`
- candidate: `depth=4`, `time=450ms`, `exactEndgameEmpties=8`
- reference suite:
  - baseline: `depth=6`, `time=900ms`, `openingTuningKey='search-reference'`
  - strong-assisted: `depth=8`, `time=1600ms`, `openingTuningKey='search-reference-strong'`
  - strong-pure: `depth=7`, `time=2200ms`, `openingTuningKey='search-reference-pure'`

저장된 파일:
- `benchmarks/stage58_opening_hybrid_reference_suite.json`

### scenario별 요약
| reference | 1위 | agreement | 비고 |
|---|---|---:|---|
| `stage57-baseline` | `stage57-book-led` | 58.8% | 가장 빠르고 curated book 존중 쪽이 유리 |
| `stage58-strong-assisted` | `stage57-prior-light` | 58.2% | `stage57-book-led`는 57.7% |
| `stage58-strong-pure` | `stage57-prior-light` | 58.2% | `stage57-book-led`는 57.7% |

### overall ranking
| profile | worst agreement | avg agreement | spread | avg nodes | avg ms |
|---|---:|---:|---:|---:|---:|
| `stage57-prior-light` | 58.2% | 58.2% | 0.0% | 70.3 | 4.73 |
| `stage56-legacy` | 58.2% | 58.2% | 0.0% | 70.6 | 5.35 |
| `stage57-cautious` | 58.2% | 58.2% | 0.0% | 77.9 | 5.60 |
| `stage57-book-led` | 57.7% | 58.1% | 1.1% | 62.7 | 4.30 |

즉 stronger reference 기준으로는 `stage57-prior-light`가 가장 안정적이었지만,
차이는 0.5~1.1%p 수준의 작은 범위이고 `stage57-book-led`가 여전히 가장 빠릅니다.

## reference consistency 관찰
reference끼리도 완전 합의하지 않았습니다.

- baseline vs strong-assisted: **70.9%**
- baseline vs strong-pure: **64.8%**
- strong-assisted vs strong-pure: **83.0%**
- 세 reference가 모두 같은 수를 고른 unanimous rate: **61.5%**

즉 “더 강한 reference”라고 해도 opening prefix 영역에서는 여전히 search horizon과 ordering 정책에 따라 분기 의견이 남습니다.
이 때문에 Stage 58에서는 stronger reference 결과만으로 runtime 기본 profile을 즉시 교체하지 않았습니다.

## 해석
- `stage57-book-led`는 curated book를 더 과감히 신뢰하므로 baseline reference와는 잘 맞지만,
  stronger reference 두 개에서는 소폭 손해를 봤습니다.
- 반면 `stage57-prior-light`는 reference가 바뀌어도 agreement가 흔들리지 않았습니다.
- 하지만 stronger reference 자체가 서로도 100% 합의하지 않았고,
  `stage57-book-led`는 여전히 노드/시간 면에서 가장 저렴합니다.

따라서 이번 단계의 결론은 다음과 같습니다.

1. stronger reference benchmark는 유효하며 유지 가치가 있습니다.
2. `stage57-book-led`를 지금 바로 내리기보다는,
   다음 튜닝 단계에서 `stage57-book-led`와 `stage57-prior-light`의 절충 profile을 새로 만드는 것이 합리적입니다.
3. benchmark 결과는 “default 교체”보다 “다음 탐색 후보 압축”에 더 적합합니다.

## 테스트
다음 테스트를 다시 실행해 통과했습니다.

```bash
node js/test/core-smoke.mjs
node js/test/stage57_opening_hybrid_tuning_smoke.mjs
node js/test/stage58_opening_hybrid_reference_suite_smoke.mjs
```

## 다음 단계
- `stage57-book-led`와 `stage57-prior-light` 중간값에 가까운 새 profile을 1~2개 더 만들고,
  Stage 58 reference suite에 다시 태워 절충점을 찾을 수 있습니다.
- benchmark corpus를 named continuation/ambiguity-heavy prefix에 가중 sampling하도록 확장할 수 있습니다.
- reference suite에 deeper exact-like late-opening probe를 제한적으로 추가해, early horizon effect를 더 줄일 수 있습니다.
