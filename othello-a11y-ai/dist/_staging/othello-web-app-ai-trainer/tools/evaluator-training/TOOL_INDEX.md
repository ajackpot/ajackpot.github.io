# tool index

## 0. 추천 엔트리포인트

### `run-stage126-weight-learning-bundle.mjs` / `.bat`
현재 저장소 기준에서 **실험 가치가 남아 있는 가중치 학습 lane만 묶은 stage-specific wrapper**입니다.

역할:
- richer-corpus compact tuple family 학습 suite 호출
- 필요하면 ETA 추정과 compact patch follow-up까지 같은 output root 아래로 정리
- stage126 bundle manifest / summary JSON 기록
- `--phase eta|suite|patch|all`, `--resume`, `--plan-only` 지원

권장 용도:
- 사용자가 외부 corpus를 직접 학습시킬 때
- 현재 runtime을 바꾸지 않고도, 실험 가치가 남은 tuple lane만 다시 열고 싶을 때
- trainer 패키지 하나만 전달해도 실행 경로를 바로 설명할 수 있게 하고 싶을 때

### `run-multi-candidate-training-suite.mjs` / `.bat`
현재 가장 권장하는 **올인원 다중 후보 학습 엔트리포인트**입니다.

역할:
- shared phase evaluator 준비
- candidate별 tuple residual 학습
- calibration
- generated module export
- 선택적 profile/depth/exact benchmark
- candidate별 status JSON과 suite summary 기록
- `--resume` 으로 중단 지점 재개

권장 용도:
- 여러 후보를 한 번에 돌리고 싶을 때
- 실험이 길어서 중간 실패/중단에 대비해야 할 때
- 후보마다 output을 분리해 남기고 싶을 때


### `run-mpc-candidate-training-suite.mjs` / `.bat`
현재 MPC 재학습에서 가장 권장하는 **올인원 다중 후보 엔트리포인트**입니다.

역할:
- candidate별 MPC calibration 학습
- runtime-variant 파생 JSON 생성
- generated module export
- 선택적 depth/exact benchmark
- candidate별 status JSON과 suite summary 기록
- `--resume` 으로 중단 지점 재개

권장 용도:
- baseline/high-only, overlap multi-check, both-mode soft-low 후보를 한 번에 비교하고 싶을 때
- 사용자가 학습을 돌린 뒤 `suite-summary.json`과 candidate profile만 회수해 채택/비채택을 결정할 때

### `run-tuple-patch-suite.mjs` / `.bat`
현재 small-patch lane에서 가장 권장하는 **올인원 patch / prune / attenuation 엔트리포인트**입니다.

역할:
- stage63 같은 기존 suite 산출물 또는 active tuple profile을 source로 선택
- 후보별 patch / prune / attenuation
- 선택적 calibration
- preview/final generated module export
- 선택적 profile/depth/exact benchmark
- candidate별 status JSON과 suite summary 기록
- `--resume` 으로 중단 지점 재개

권장 용도:
- 대규모 family를 곧바로 채택하기보다 late-b 억제 / lite 후보를 먼저 비교할 때
- 이미 학습이 끝난 후보 여러 개를 빠르게 작게 잘라서 다시 검증할 때
- 학습 자체보다 patch lane 의사결정이 더 중요할 때

### `run-tuple-layout-family-pilot.mjs` / `.bat`
layout family만 빠르게 비교하는 경량 파일럿입니다.

권장 용도:
- `orthogonal-full` / `diagonal-full` / `straight-full` 같은 family 비교를 빠르게 시작할 때
- benchmark 정책을 후보별로 세분화할 필요가 없을 때

> 현재 정리 기준의 기본 결론: **브라우저 기본값은 baseline runtime 유지**입니다. 사용자가 외부 corpus를 직접 돌릴 때는 먼저 `run-stage126-weight-learning-bundle`을 쓰고, 그 내부 구성요소로 `run-multi-candidate-training-suite`와 `run-tuple-patch-suite`를 이어 가는 것이 권장 경로입니다. MPC lane은 `run-mpc-candidate-training-suite` 중심으로 남기되, 이번 기본 bundle에는 넣지 않았습니다. `entryScales`는 마지막 미세 패치용입니다.

## 1. 데이터 준비 / 샘플링

### `download-egaroucid-data.bat`
공개 Egaroucid 학습 데이터를 내려받습니다.

### `estimate-training-time.mjs` / `.bat`
대규모 학습 전에 처리 속도와 예상 시간을 봅니다.

### `sample-corpus.mjs` / `.bat`
큰 corpus에서 stride 기반 샘플을 뽑아 작은 실험용 데이터를 만듭니다.

## 2. phase evaluator

### `train-phase-linear.mjs` / `.bat`
현재 base evaluator를 다시 학습합니다.

입력:
- 학습 corpus

출력:
- `trained-evaluation-profile.json`

### `benchmark-profile.mjs` / `.bat`
phase evaluator 또는 tuple 포함 candidate의 holdout/corpus 오차를 측정합니다.

## 3. tuple residual

### `train-tuple-residual-profile.mjs` / `.bat`
선택한 layout family와 bucket에 대해 tuple residual을 학습합니다.

### `calibrate-tuple-residual-profile.mjs` / `.bat`
학습된 tuple residual의 bucket bias를 재중심화합니다.

### `inspect-tuple-residual-profile.mjs` / `.bat`
layout, tuple 수, bucket 범위, 진단값을 빠르게 확인합니다.

### `patch-tuple-residual-profile.mjs` / `.bat`
이미 학습된 tuple residual profile을 재학습 없이 잘라내거나 약화시킵니다.

권장 용도:
- `keepTopTuples`, `keepBuckets`, `bucketScales`, `tupleScales`, `entryScales`로 lite 후보를 만들 때
- late-b attenuation, late-a+endgame only, endgame only 같은 소규모 patch 후보를 만들 때
- source candidate JSON만 가지고 빠르게 generated module을 다시 뽑고 싶을 때
- 남은 mismatch slot을 bucket:tuple@patternIndex 단위로 직접 조정하고 싶을 때

### `compare-tuple-residual-profiles.mjs` / `.bat`
여러 tuple residual JSON의 구조/진단값을 비교합니다.

### `benchmark-tuple-residual-profile.bat`
corpus 기준 tuple residual 후보를 빠르게 비교합니다.

### `benchmark-depth-tuple-residual-profile.bat`
깊이 제한 search 비용 기준으로 tuple residual 후보를 비교합니다.

### `benchmark-depth-search-profile.mjs` / `.bat`
phase evaluator / move-ordering / tuple / MPC 조합의 depth search 비용을 비교합니다.
이제 `--baseline-generated-module`, `--candidate-generated-module`, `--baseline-mpc-profile`, `--candidate-mpc-profile` 도 직접 받을 수 있습니다.

### `benchmark-exact-tuple-residual-profile.bat`
exact / near-exact 구간 search 비용 기준으로 tuple residual 후보를 비교합니다.

### `benchmark-exact-search-profile.mjs` / `.bat`
phase evaluator / move-ordering / tuple / MPC 조합의 exact search 비용을 비교합니다.
이제 `--baseline-generated-module`, `--candidate-generated-module`, `--baseline-mpc-profile`, `--candidate-mpc-profile` 도 직접 받을 수 있습니다.

## 4. layout / candidate 비교

### `run-tuple-patch-suite.mjs` / `.bat`
기존에 학습된 tuple 후보들을 small-patch lane으로 넘기는 상위 suite입니다.

특징:
- `source-suite-dir`에서 기존 candidate 산출물 자동 탐색
- active tuple snapshot 또는 외부 JSON도 source로 사용 가능
- `patch-tuple-residual-profile` + calibration + generated module export + benchmark를 순차 실행
- candidate별 `candidate-status.json`
- `suite-summary.json`
- `--resume`, `--plan-only`, `--continue-on-error`


### `estimate-tuple-layout-candidate-sizes.mjs` / `.bat`
각 built-in layout family가 compact generated module에서 대략 어느 정도 크기를 차지할지 추정합니다.

### `run-multi-candidate-training-suite.mjs` / `.bat`
다양한 tuple candidate를 순차적으로 묶어 돌리는 상위 suite입니다.

특징:
- config JSON 지원
- shared active snapshot 저장
- candidate별 `candidate-status.json`
- `suite-summary.json`
- `--resume`, `--plan-only`, `--continue-on-error`

### `run-mpc-candidate-training-suite.mjs` / `.bat`
MPC calibration 후보를 순차적으로 묶어 돌리는 상위 suite입니다.

특징:
- config JSON 지원
- shared active evaluation/move-ordering/tuple/MPC snapshot 저장
- candidate별 `trained-mpc-profile.raw.json`, `trained-mpc-profile.json`, `learned-eval-profile.generated.js` 생성
- `suite-summary.json`
- `--resume`, `--plan-only`, `--continue-on-error`

### `run-tuple-layout-family-pilot.mjs` / `.bat`
여러 layout family를 한 번에 train → calibrate → module export까지 돌리는 경량 비교 도구입니다.

## 5. runtime module export

### `build-generated-profile-module.mjs` / `.bat`
evaluation / move-ordering / tuple / MPC JSON을 받아 app용 generated module을 만듭니다.

### `export-profile-module.mjs`
명시하지 않은 slot은 현재 active runtime module 값을 보존한 채 새 generated module을 만듭니다.

### `make-mpc-runtime-variant.mjs` / `.bat`
이미 학습된 MPC profile의 회귀 계수는 그대로 두고, 현재 search 엔진이 실제로 사용하는 `enableHighCut`, `enableLowCut`, `maxChecksPerNode`, `minDepth`, `minDepthGap`, `maxDepthDistance`, `minPly`, `highScale`, `lowScale`, `depthDistanceScale` 및 `intervalScale`만 바꾼 파생 후보를 만듭니다.
`defaultMode`, `maxTriesPerNode`, `highResidualScale`, `lowResidualScale` 같은 별칭도 함께 받을 수 있습니다.
문헌 기반 MPC 튜닝을 빠르게 비교 벤치마크할 때 권장합니다.

### `install-tuple-residual-profile.mjs` / `.bat`
현재 active evaluation / move-ordering / MPC를 보존하면서 tuple residual만 교체할 때 씁니다.

### `install-mpc-profile.mjs` / `.bat`
현재 active evaluation / move-ordering / tuple residual을 보존하면서 MPC slot만 교체할 때 씁니다.
학습된 `trained-mpc-profile.json`이나 suite에서 뽑은 후보를 브라우저용 `learned-eval-profile.generated.js`에 바로 반영할 때 권장합니다.

## 6. opening prior

### `train-opening-prior.mjs` / `.bat`
기보 / prior 학습 JSON을 만듭니다.

### `build-opening-prior-module.mjs` / `.bat`
opening prior JSON을 compact runtime module로 변환합니다.

### `benchmark-opening-hybrid-tuning.mjs`
opening book + prior hybrid 후보를 reference suite와 비교합니다.

### `replay-opening-hybrid-reference-suite.mjs`
이미 만든 reference suite JSON을 재사용해 후보를 빠르게 다시 평가합니다.

## 7. 예제 설정 파일

### `examples/multi-candidate-suite.train-only.example.json`
train/calibrate/export만 포함한 tuple 기본 예제입니다.

### `examples/multi-candidate-suite.train-plus-bench.example.json`
profile/depth/exact benchmark까지 같이 도는 tuple 예제입니다.

### `examples/mpc-candidate-suite.train-only.example.json`
MPC calibrate/runtime-variant/export만 포함한 기본 예제입니다.

### `examples/mpc-candidate-suite.train-plus-bench.example.json`
MPC depth/exact benchmark까지 같이 도는 예제입니다.

### `examples/tuple-patch-suite.patch-only.example.json`
patch/export 중심의 small-patch suite 예제입니다.

### `examples/tuple-patch-suite.patch-plus-bench.example.json`
calibration / profile / depth / exact benchmark까지 같이 도는 small-patch suite 예제입니다.

### `examples/tuple-patch-suite.final-entry-followup.example.json`
남은 mismatch slot을 entryScales로 직접 줄여보는 마지막 micro-patch 예제입니다.
