# Stage 136 balanced13 support-stack notes

## 목적

Stage 135에서 `balanced13-alllate-smoothed-stability-090`은 evaluation-profile finalist까지는 올라왔지만, 실제 대국에서는 여전히 active의 support stack(`move-ordering`, `tuple residual`, `MPC`)을 공유하고 있었습니다.

Stage 136의 목적은 다음 두 가지입니다.

1. `balanced13`를 **자기 evaluation-profile 기준의 support stack**으로 다시 학습시킬 수 있는 올인원 bundle 제공
2. 그 과정에서 fit / diagnostics hotpath의 **필수/권장 수준 저위험 가속화**를 먼저 반영

## 이번 단계에서 반영한 필수 가속화

### 1. move-ordering fit / diagnostics
- child bucket lookup table precompute
- reusable `SearchEngine` pool
- holdout root bucket index 재사용
- regression vector scratch 재사용 경로 활용

### 2. MPC calibration
- calibration bucket lookup table precompute
- reusable `SearchEngine` pool
- running accepted-sample counter로 repeated reduce 제거

### 3. tuple calibration
- bucket lookup table precompute
- verification pass에서 `afterEvaluator`를 다시 호출하지 않고 `beforeResidual + biasDelta` 로 검증

## 마이크로 벤치 결과

기준 파일: `benchmarks/stage136/stage136_training_tool_speedups_summary.json`

- `train_move_ordering_profile`: `0.61s -> 0.5696s` (약 `1.071x`, `-6.6%`)
- `calibrate_mpc_profile`: `0.7112s -> 0.7008s` (약 `1.015x`, `-1.5%`)
- `calibrate_tuple_residual_profile`: `0.3856s -> 0.3718s` (약 `1.037x`, `-3.6%`)

표본이 작은 synthetic corpus라 수치는 보수적으로 보이지만, 세 도구 모두 저하 없이 같은 방향으로 줄었습니다.
이번 단계에서 더 중요한 변화는 **active support stack이 암묵적으로 섞여 들어가던 경로를 끊었다는 점**입니다.

## 새 bundle

엔트리포인트:

```bat
tools\evaluator-training\run-stage136-balanced13-support-stack-bundle.bat D:\othello-data\Egaroucid_Train_Data
```

또는:

```bash
node tools/evaluator-training/run-stage136-balanced13-support-stack-bundle.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --phase all \
  --resume
```

기본 단계:

1. tuple residual train
2. tuple calibration
3. move-ordering train
4. MPC calibration + runtime variant
5. combined generated module export

기본 source candidate:
- `tools/engine-match/fixtures/stage135-evaluation-profile-finalists/balanced13-alllate-smoothed-stability-090/`

## 회수하면 좋은 산출물

- `tuple/trained-tuple-residual-profile.calibrated.json`
- `move-ordering/trained-move-ordering-profile.json`
- `mpc/trained-mpc-profile.json`
- `mpc/runtime-mpc-profile.json`
- `exported/learned-eval-profile.generated.js`
- `stage136-balanced13-support-stack-bundle-summary.json`
