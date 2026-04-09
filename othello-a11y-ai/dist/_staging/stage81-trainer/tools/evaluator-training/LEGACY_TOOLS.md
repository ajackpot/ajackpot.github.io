# legacy / diagnostic tools

이 문서는 **현재 기본 학습 lane에서는 주력으로 쓰지 않는 도구들**을 정리한 것입니다.

없애서는 안 되지만, 새 trainer 패키지에서는 우선순위를 낮게 두거나 제외합니다.

## 1. 무엇이 현재 표준인가

현재 표준 엔트리포인트는 다음입니다.

- `run-multi-candidate-training-suite.mjs`
- `run-tuple-patch-suite.mjs`
- `run-tuple-layout-family-pilot.mjs`
- `train-phase-linear.mjs`
- `train-tuple-residual-profile.mjs`
- `calibrate-tuple-residual-profile.mjs`
- `patch-tuple-residual-profile.mjs`
- `export-profile-module.mjs`

즉, 새 corpus에 대해 여러 후보를 돌릴 때는 먼저 **suite / patch suite / pilot / 단일 lane** 쪽을 보는 것이 맞습니다.

보충: `entryScales` 같은 entry-level micro patch는 도구상 지원하지만, **상시 주력 lane** 으로 보지는 않습니다. 마지막 남은 mismatch slot 정리나 진단용으로만 쓰는 편이 안전합니다.

## 2. late move-ordering 재학습 계열

다음 도구들은 역사적으로 중요하지만, 현재는 “기본 lane의 핵심”으로 보지 않습니다.

- `train-move-ordering-profile.mjs`
- `search-move-ordering-top-pairs.mjs`
- `make-move-ordering-variant.mjs`
- `tune-move-ordering-search-cost.mjs`
- `benchmark-move-ordering-profile-set.mjs`
- `replay-move-ordering-adoption-chain.mjs`
- `audit-move-ordering-profile.mjs`
- `audit-move-ordering-search-cost.mjs`
- 관련 batch wrappers

이유:
- 과거 기록상, move-ordering은 search-cost / cutoff-aware 목적 함수가 더 중요했고,
- 단순 회귀형 재학습을 반복하는 것만으로는 채택 근거가 약했습니다.

## 3. stage 특정 실험 보조 도구

다음 계열은 특정 stage의 실험 복원이나 일회성 분석용입니다.

- `analyze-next-optimization-lane.mjs`
- `audit-exact-best-move-tie-swaps.mjs`
- `merge-move-ordering-benchmark-batches.mjs`
- `run-tuple-retrain-pipeline.mjs`
- 일부 stage 전용 smoke output / temporary JSON

이유:
- 현재 사용자는 새 corpus로 **phase + tuple lane을 재학습하거나, 이미 학습된 후보를 patch lane으로 잘라서 JSON만 전달**하면 충분하기 때문입니다.
- 이 도구들은 비교적 높은 문맥 의존성을 가지며, 단독 전달 가치가 낮습니다.

## 4. 현재 패키지 운영 원칙

trainer 패키지는 다음 두 기준으로 정리합니다.

1. 지금 바로 새 corpus에 대해 돌릴 수 있는가
2. 생성된 JSON을 바로 비교/전달하는 데 필요한가

이 기준에 맞는 도구만 우선 포함하고, 나머지는 full source tree에 남기되 trainer 패키지에서는 뒤로 뺍니다.
