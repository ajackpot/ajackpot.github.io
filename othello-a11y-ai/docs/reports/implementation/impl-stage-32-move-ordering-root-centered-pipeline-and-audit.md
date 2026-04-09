# Stage 32 — move-ordering 파이프라인 보강: root-centered target, root-uniform weighting, audit 도구

## 이번 단계의 목표
기존 move-ordering 학습은 `teacher analyzedMoves.score`를 그대로 회귀했습니다. 이 방식은 구현이 간단하지만, 실제로는 다음과 같은 약점이 있었습니다.

1. **root 공통 절대 score offset이 그대로 섞임**
   - move-ordering은 root 내부의 상대적 순서가 중요합니다.
   - 그런데 raw target을 그대로 맞추면, root마다 공통으로 붙는 절대 value offset을 feature가 대신 설명하려고 하며 ranking signal이 흐려질 수 있습니다.

2. **legal move 수가 많은 root가 회귀를 지배함**
   - 기존 방식은 move 단위로 샘플이 추가되므로, 10수 root가 4수 root보다 2.5배 큰 영향력을 가집니다.
   - move-ordering 품질은 root 단위로 보는 것이 자연스럽기 때문에, root 간 영향력 균형이 필요합니다.

3. **과장된 feature / 누락된 신호를 확인할 도구 부족**
   - 기존 진단은 top-1, regret 정도만 확인했습니다.
   - 어떤 feature가 실제로 과장되었는지, 어떤 tactical signal이 residual에 남는지 보기 어려웠습니다.

## 구현한 변경점

### 1) `train-move-ordering-profile.mjs` 기본 학습 목표 변경
다음 옵션을 추가하고 기본값도 바꿨습니다.

- `--target-mode raw|root-mean|best-gap`
  - 기본값: `root-mean`
  - 각 root에서 teacher move score 평균을 빼고 학습합니다.
  - 목적: 절대 score offset보다 **root 내부 순서**를 더 잘 맞추도록 유도

- `--root-weighting per-move|uniform`
  - 기본값: `uniform`
  - root별 총 영향력을 비슷하게 유지합니다.
  - 목적: legal move 수가 많은 root가 회귀를 과도하게 지배하지 않도록 방지

- `--exact-root-weight-scale <number>`
  - 기본값: `1.0`
  - exact teacher root를 depth teacher root보다 더 크게 반영하고 싶을 때 사용

### 2) feature 제외 실험 지원
- `--exclude-features cornerPattern,edgePattern`
- 특정 feature를 학습에서 제외하고 zero weight로 고정할 수 있게 했습니다.
- audit 결과에서 “이 feature를 빼면 오히려 ordering이 좋아진다”는 신호가 나오면, 바로 다음 학습 실험으로 이어질 수 있게 했습니다.

### 3) holdout diagnostics 확장
학습 결과 JSON의 `diagnostics`에 다음을 추가했습니다.

- `holdoutPairwise`
  - root 내부 모든 move pair에 대한 ordering 정확도
  - `weightedAccuracy`도 같이 기록
- `featureContribution`
  - feature별 평균 절대 기여량과 전체 기여 비중
- `ablationAudit`
  - feature를 하나씩 제거했을 때 top-1 / regret / pairwise가 어떻게 바뀌는지 계산
  - 제거 시 성능이 올라가면 **과장 가능성**으로 볼 수 있음
- `omittedFeatureResidualCorrelation`
  - 현재 모델에 직접 들어가지 않는 tactical 후보 feature와 residual의 상관관계
  - 예: `opponentMoveCountRaw`, `opponentCornerReplies`, `flipCount`, `riskXSquare`, `riskCSquare`
  - 상관이 크면 **누락 신호** 후보로 볼 수 있음

### 4) `audit-move-ordering-profile.mjs` 추가
완성된 move-ordering profile을 **재학습 없이** 다시 점검할 수 있는 standalone audit 도구를 추가했습니다.

이 스크립트는 sampled root에 대해 teacher search를 다시 실행한 뒤,

- top-1 / top-3 / mean regret
- pairwise / weighted pairwise accuracy
- feature contribution
- feature ablation
- omitted-feature residual correlation

을 다시 계산해 줍니다.

## 런타임 영향
런타임 `MoveOrderingEvaluator` 자체의 기본 score 구조는 유지했습니다. 즉,

- 현재 브라우저 앱이 사용하는 late ordering 경로의 구조적 위험은 늘리지 않고,
- 오프라인 파이프라인의 **학습 목표와 진단 품질**을 먼저 개선했습니다.

또한 `populateMoveOrderingFeatureRecord()`에 다음 raw/tactical field를 노출했습니다.

- `myMoveCountRaw`
- `opponentMoveCountRaw`
- `opponentCornerReplies`
- `passFlag`
- `flipCount`
- `riskXSquare`
- `riskCSquare`

이 값들은 audit에서 residual correlation 분석에 바로 사용됩니다.

## 로컬 검증

### 정적 검증
- `node --check tools/evaluator-training/train-move-ordering-profile.mjs`
- `node --check tools/evaluator-training/audit-move-ordering-profile.mjs`
- `node --check js/ai/evaluator.js`

### 기존 회귀 테스트
- `node js/test/core-smoke.mjs` 통과
- `node js/test/perft.mjs` 통과

### end-to-end smoke
- small mixed late corpus로 `train-move-ordering-profile.mjs` 실행
- `stage32_trained-move-ordering-smoke.json` 생성 확인
- `audit-move-ordering-profile.mjs`로 같은 corpus 재평가 확인

## 현재 업로드된 v1 move-ordering profile에 대한 새 audit 관찰
작은 랜덤 late-position suite(27개 후보 중 bucket당 3 root, 총 15 root audit)에서,
현재 업로드된 `trained-move-ordering-linear-v1`을 raw-target 기준으로 다시 보면 다음과 같은 신호가 나왔습니다.

- top-1: **66.7%**
- pairwise accuracy: **69.0%**
- weighted pairwise accuracy: **84.3%**
- mean regret: **0.189 discs**

feature contribution 비중은 대략 다음과 같았습니다.

- mobility: **38.2%**
- cornerPattern: **32.6%**
- edgePattern: **9.1%**
- parity: **8.0%**

feature ablation에서는 다음 신호가 확인됐습니다.

- `cornerPattern` 제거 시 pairwise accuracy **+2.65pp**
- `edgePattern` 제거 시 pairwise accuracy **+1.47pp**
- `mobility` 제거 시 pairwise accuracy **-13.57pp**

즉, 작은 audit 기준으로는:

- `mobility`는 확실히 핵심 signal이고,
- `cornerPattern`과 `edgePattern`은 약간 과하게 들어갔을 가능성이 있습니다.

누락 신호 쪽에서는 raw-target audit에서 residual 상관이 아주 크게 남지는 않았지만,
상대적으로는 `flipCount`, `riskCSquare`, `opponentCornerReplies`가 위쪽에 나타났습니다.

이 결과만으로 바로 feature를 삭제하는 것은 이르지만,
**다음 본학습에서 `cornerPattern` 제외 / 축소 실험을 병행할 가치가 있음**을 시사합니다.

## 다음 단계 권장
1. 새 기본값(`root-mean`, `uniform`)으로 move-ordering 재학습
2. 학습 완료 후 `audit-move-ordering-profile.mjs` 실행
3. audit에서
   - 제거 시 성능이 오르는 feature
   - residual 상관이 반복적으로 크게 남는 tactical signal
   을 확인
4. 필요하면 `--exclude-features`로 pilot 재학습
5. 통과본을 trineutron benchmark + exact benchmark로 다시 검증

## 산출물
- 학습 스크립트 업데이트
- standalone audit 스크립트 추가
- batch launcher 추가
- README 업데이트
- smoke / audit JSON 산출
