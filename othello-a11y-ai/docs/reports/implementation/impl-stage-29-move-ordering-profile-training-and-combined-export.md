# Stage 29 — late move-ordering 학습 도구 및 combined export 정비

## 요약
이번 단계에서는 phase-bucket evaluator와 별도로, **late move-ordering 전용 학습 파이프라인**을 추가했다.

핵심 목표는 다음과 같았다.

1. exact / near-exact 구간에서 더 직접적으로 영향을 주는 `MoveOrderingEvaluator`를 별도 학습 대상로 분리한다.
2. 학습 결과를 앱에 반영할 때 evaluator profile과 move-ordering profile을 **독립 slot**으로 관리한다.
3. 한쪽만 다시 export해도 다른 쪽 slot이 지워지지 않도록 tooling을 정비한다.
4. 사용자가 작은 late-only corpus로 pilot 실험을 쉽게 돌릴 수 있게 batch / benchmark / sample 도구를 같이 제공한다.

## 런타임 변경
### 1. move-ordering feature를 명시적으로 분리
`js/ai/evaluation-profiles.js`

- `MOVE_ORDERING_FEATURE_KEYS` 추가
  - `mobility`
  - `corners`
  - `cornerAdjacency`
  - `edgePattern`
  - `cornerPattern`
  - `discDifferential`
  - `parity`
- `DEFAULT_MOVE_ORDERING_PROFILE` 추가
- `moveOrderingFallbackWeightsForEmpties()` 함수 분리
- move-ordering profile normalize / compile 경로 정리
- `makeMoveOrderingTrainingProfileFromWeights()` 추가

### 2. `MoveOrderingEvaluator`를 feature extractor 기반으로 정리
`js/ai/evaluator.js`

- `createEmptyMoveOrderingFeatureRecord()` 추가
- `populateMoveOrderingFeatureRecord()` 추가
- `MoveOrderingEvaluator.evaluate()`가 late ordering용 feature record를 직접 사용하도록 정리
- `MoveOrderingEvaluator.explainFeatures()` 추가

이 변경으로 move-ordering 학습 도구와 런타임이 동일 feature 정의를 공유하게 되었다.

## 학습 도구 추가
### 1. `train-move-ordering-profile.mjs`
새 스크립트는 raw corpus에서 late root를 추려 다음 절차로 학습한다.

1. root empties가 지정한 bucket 범위에 들어오는 sample만 선택
2. legal move가 2개 이상인 root만 사용
3. root마다 teacher search를 실행
4. root의 `analyzedMoves[].score`를 target으로 사용
5. 각 legal move의 child-state feature를 추출
6. bucket별 ridge regression으로 move-ordering weight 추정

지원 기능:

- `--child-buckets 10-10,11-12,13-14,15-16,17-18`
- `--sample-stride`, `--sample-residue`
- `--max-roots-per-bucket`
- `--exact-root-max-empties`
- `--teacher-depth`, `--teacher-time-limit-ms`
- `--teacher-evaluation-profile`
- `--teacher-move-ordering-profile`
- `--seed-profile`
- `--output-json`
- `--output-module`
- `--evaluation-profile-json`

### 2. move-ordering 회귀 도우미 추가
`tools/evaluator-training/lib.mjs`

- `MOVE_ORDERING_REGRESSION_FEATURE_KEYS`
- `createMoveOrderingFeatureScratch()`
- `fillMoveOrderingRegressionVectorFromState()`
- `moveOrderingWeightsObjectFromSolution()`
- `moveOrderingSolutionFromWeights()`
- `moveOrderingSeedSolutionForBucket()`
- `buildMoveOrderingProfileFromBucketWeights()`
- `renderGeneratedProfilesModule()`
- `writeGeneratedProfilesModule()`

## combined export 정비
### 1. `export-profile-module.mjs` 개선
이제 다음이 가능하다.

- evaluator JSON만 교체
- move-ordering JSON만 교체
- 둘 다 동시에 교체
- 한쪽 slot만 `null`로 비우기
- 명시하지 않은 쪽은 현재 활성 generated module 값을 보존

### 2. `train-phase-linear.mjs` 개선
기존에는 `--output-module`을 주면 move-ordering slot이 무조건 `null`로 덮였다.
이제는 다음처럼 동작한다.

- `--move-ordering-profile-json`을 주면 그 JSON을 같이 export
- 인자를 주지 않으면 현재 활성 move-ordering slot을 보존
- `--clear-move-ordering-profile`을 주면 move-ordering slot을 비움

즉, phase evaluator를 다시 학습해도 late move-ordering profile을 잃지 않는다.

## 샘플/벤치 도구 정비
### 1. `sample-corpus.mjs`
다음 옵션을 추가했다.

- `--min-empties`
- `--max-empties`

이제 late-only corpus를 쉽게 만들 수 있다.

### 2. search benchmark 스크립트 확장
`benchmark-depth-search-profile.mjs`
`benchmark-exact-search-profile.mjs`

이제 두 스크립트 모두 다음 조합을 지원한다.

- evaluator만 비교
- move-ordering만 비교
- evaluator + move-ordering 둘 다 비교

추가 옵션:

- `--baseline-profile`
- `--candidate-profile`
- `--baseline-move-ordering-profile`
- `--candidate-move-ordering-profile`

### 3. Windows batch 추가
추가한 batch:

- `train-move-ordering-profile.bat`
- `benchmark-depth-move-ordering-profile.bat`
- `benchmark-exact-move-ordering-profile.bat`

또한 `sample-corpus.bat`은 late empties 필터 인자를 받을 수 있게 수정했다.

## 스모크 검증
### 공통 회귀 테스트
- `node js/test/core-smoke.mjs` 통과
- `node js/test/perft.mjs` 통과

### move-ordering 학습 스모크
late synthetic mixed corpus(empties 11 / 12 / 14 root)로 다음 경로를 검증했다.

1. `train-move-ordering-profile.mjs` 실행
2. move-ordering JSON 생성
3. combined generated module 생성
4. depth benchmark 실행
5. exact benchmark 실행

생성 결과:

- `tools/evaluator-training/out/stage29_trained-move-ordering-smoke.json`
- `tools/evaluator-training/out/stage29_learned-eval-profile.generated.js`
- `tools/evaluator-training/out/stage29_exported_combined.generated.js`

### 스모크 benchmark 결과
#### depth benchmark
- baseline evaluator: `trained-phase-linear-v1`
- candidate evaluator: 동일
- candidate move-ordering: `trained-move-ordering-linear-v1`
- cases: 4
- same best move: 4 / 4
- nodes: `9,675 -> 9,939`
- time: `979ms -> 897ms`

#### exact benchmark
- cases: 4
- exact: 4 / 4
- same score: 4 / 4
- same best move: 3 / 4
- nodes: `9,820 -> 9,725`
- time: `536ms -> 456ms`

이 결과는 합성/소형 데이터 기준의 **파이프라인 스모크**이며, 최종 strength 판단에는 실데이터로 학습한 profile과 더 넓은 holdout benchmark가 필요하다.

## 사용자 워크플로우
권장 흐름은 다음과 같다.

1. `sample-corpus`로 late-only corpus를 작게 만든다.
2. `train-move-ordering-profile`로 bucket당 root 수를 작게 잡고 pilot을 돈다.
3. `holdoutRoots.top1Accuracy`, `meanRegret`, search benchmark를 본다.
4. 괜찮으면 bucket당 root 수와 stride를 늘려 본학습한다.
5. 완성된 `trained-move-ordering-profile.json` 또는 `learned-eval-profile.generated.js`를 업로드해 검증/채택 여부를 판단한다.

## 결론
이번 단계로 다음이 가능해졌다.

- 메인 evaluator와 별도로 late move-ordering을 직접 학습
- phase evaluator / move-ordering profile의 안전한 병행 관리
- late-only pilot 실험과 benchmark 자동화
- 사용자가 학습한 move-ordering weight를 별도 파일로 전달받아 바로 검증하는 workflow 구축
