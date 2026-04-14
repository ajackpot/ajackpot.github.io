# evaluator training tools

이 폴더는 **현재 채택된 evaluator lane** 기준으로 정리한 오프라인 학습 도구 모음입니다.

현재 권장 흐름은 여덟 가지입니다.

1. **Stage 136 balanced13 support-stack bundle**
   - `run-stage136-balanced13-support-stack-bundle`
2. **Stage 130 evaluation-profile 확장 bundle**
   - `run-stage130-evaluation-expansion-bundle`
3. **Stage 126 사용자 실행용 richer-corpus bundle**
   - `run-stage126-weight-learning-bundle`
4. **올인원 evaluation-profile 확장 candidate suite**
   - `run-evaluation-profile-candidate-suite`
5. **올인원 evaluation-profile micro-patch suite**
   - `run-evaluation-profile-patch-suite`
6. **올인원 다중 tuple 후보 학습 suite**
   - `run-multi-candidate-training-suite`
7. **올인원 다중 MPC 후보 학습 suite**
   - `run-mpc-candidate-training-suite`
8. **학습 완료 후보를 잘라내는 patch/prune/attenuate suite 및 단일 후보/파일럿 도구**
   - `run-tuple-patch-suite`, `train-phase-linear`, `run-tuple-layout-family-pilot`

핵심 원칙은 다음과 같습니다.

- 브라우저 런타임은 계속 **정적 JS + 작은 table lookup** 구조를 유지합니다.
- 더 큰 가중치는 **오프라인 학습**으로 만들고, 앱에는 compact generated module만 넣습니다.
- 현재 evaluator lane은 **phase-linear core + tuple residual additive layer**가 중심이지만, evaluation-profile lane도 다시 열어 **phase bucket 세분화 / optional scalar feature / smoothed interpolation** 을 실험할 수 있습니다.
- 대형 family 학습 뒤에는 곧바로 채택하지 말고, **small-patch lane**으로 late-b 억제 / tuple pruning / attenuation을 먼저 비교하는 것이 안전합니다.
- evaluation-profile 확장도 마찬가지로, broad candidate suite 뒤에 **micro-patch lane**으로 attenuation / interpolation off / late baseline blend를 다시 비교하는 것이 안전합니다.
- move-ordering 재학습은 역사적으로 중요하지만, **현재 기본 lane의 주력은 아닙니다.** 다만 특정 evaluation-profile finalist를 공정하게 붙일 때는 Stage 136처럼 support-stack bundle로 함께 다시 맞추는 편이 안전합니다.
- 여러 후보를 오래 돌릴 때는 **candidate별 출력 디렉터리 + status JSON + --resume** 을 기본으로 생각합니다.

## 현재 정리된 종료 상태

- 기본 브라우저 런타임은 현재 **Stage 136 balanced13 support-stack generated module**을 채택한 상태입니다. 이전 설치본 generated module은 `tools/engine-match/fixtures/historical-installed-modules/`에 기록용으로만 남깁니다.
- evaluation-profile lane은 **stage130 bundle / candidate suite / patch suite** 형태로 다시 열어 두었습니다. 기본 실험축은 bucket 세분화, optional late scalar feature, smoothed interpolation입니다.
- 대규모 layout family 재학습 lane은 문서/도구상으로는 남겨 두되, **지금 당장 기본 추천 흐름은 아닙니다.**
- tuple lane 새 corpus가 생기면 먼저 `run-multi-candidate-training-suite`로 후보를 만들고, 이어서 `run-tuple-patch-suite`로 small-patch lane을 여는 것이 권장 경로입니다.
- MPC lane 재학습은 `run-mpc-candidate-training-suite`로 baseline/high-only/overlap/both-mode 후보를 한 번에 묶어 돌린 뒤, suite summary 기준으로 채택/비채택을 결정하는 것이 권장 경로입니다.
- `entryScales`는 **마지막 남은 mismatch slot을 겨냥하는 미세 조정용**으로만 보고, 이를 새 기본 최적화 축으로 삼지는 않습니다.
- 즉 현재 유지/전달 관점의 우선순위는 **support-stack bundle / suite → patch suite → compact generated module export** 입니다. evaluation-profile lane도 같은 구조를 따릅니다.

## Stage 126 사용자 실행용 권장 bundle

현재 저장소 기준에서 **실험 가치가 남아 있는 오프라인 가중치 학습 lane**은 richer-corpus compact tuple family 재학습과 그 뒤의 compact patch follow-up뿐입니다. 그래서 Stage 126에서는 이를 바로 실행할 수 있는 wrapper와 config를 추가했습니다.

기본 진입점:

```bat
tools\evaluator-training\run-stage126-weight-learning-bundle.bat ^
  D:\othello-data\Egaroucid_Train_Data
```

또는:

```bash
node tools/evaluator-training/run-stage126-weight-learning-bundle.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --resume
```

권장 순서는 다음과 같습니다.

1. `--phase eta` 로 대략적인 wall-time 추정
2. 기본값(`--phase all`)으로 ETA + richer-corpus family 학습 + compact patch follow-up을 한 번에 실행
3. `--phase patch` 로 compact top-k / bucket-restricted 후보 follow-up

기본 config는 다음 세 파일입니다.

- `examples/stage126-compact-tuple-richer-corpus.train-plus-bench.example.json`
- `examples/stage126-compact-tuple-richer-corpus.fullbudget-train-only.example.json`
- `examples/stage126-compact-tuple-patch-followup.example.json`

핵심 의도는 "학습 자체를 가능한 많이 열어 두기"가 아니라, **지금 다시 돌릴 가치가 남아 있는 lane만 사용자가 바로 돌릴 수 있게 묶는 것**입니다. 그래서 move-ordering / broad MPC / broad hand-crafted evaluator 계열은 기본 bundle에서 제외했습니다.

## Stage 136 balanced13 support-stack bundle

Stage 135 결선 후보 `balanced13-alllate-smoothed-stability-090`을 실제로 공정하게 붙이려면, evaluation-profile만 바꾸는 것으로는 부족합니다.
Stage 136에서는 `run-stage136-balanced13-support-stack-bundle`을 추가해 **balanced13 evaluation-profile 기준의 보조 학습 가중치 stack**을 한 번에 다시 만들 수 있게 했습니다.

기본 진입점:

```bat
tools\evaluator-training\run-stage136-balanced13-support-stack-bundle.bat ^
  D:\othello-data\Egaroucid_Train_Data
```

또는:

```bash
node tools/evaluator-training/run-stage136-balanced13-support-stack-bundle.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --phase all \
  --resume
```

기본 phase는 `all` 이며, 다음 순서로 진행됩니다.

1. tuple residual 재학습
2. tuple calibration
3. move-ordering 재학습
4. MPC calibration + runtime variant 생성
5. combined generated module export

기본 후보 source는 repo 안의 `tools/engine-match/fixtures/stage135-evaluation-profile-finalists/balanced13-alllate-smoothed-stability-090/` 입니다.
별도 `--evaluation-profile-json`을 주면 그 JSON을 기준으로 같은 support-stack bundle을 다시 돌릴 수도 있습니다.

부분 재실행도 가능합니다.

```bash
node tools/evaluator-training/run-stage136-balanced13-support-stack-bundle.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --phase mpc \
  --resume

node tools/evaluator-training/run-stage136-balanced13-support-stack-bundle.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --phase export \
  --resume
```

`--phase move-ordering|mpc|export` 는 같은 `--output-root` 아래의 선행 산출물(tuple calibrated / move-ordering / runtime MPC)을 재사용합니다.
누락된 prerequisite가 있으면 bundle이 즉시 중단하고 필요한 선행 파일을 알려 줍니다.

주요 산출물은 다음 구조로 남습니다.

```text
stage136-balanced13-support-stack/
  shared/
    source-evaluation-profile.json
    active-move-ordering-profile.json
    active-tuple-residual-profile.json
    active-mpc-profile.json
    resolved-stack-config.json
  tuple/
    trained-tuple-residual-profile.json
    trained-tuple-residual-profile.calibrated.json
  move-ordering/
    trained-move-ordering-profile.json
  mpc/
    trained-mpc-profile.json
    runtime-mpc-profile.json
  exported/
    learned-eval-profile.generated.js
    generated-module-summary.json
  bundle-manifest.json
  stage136-balanced13-support-stack-bundle-summary.json
```

이번 단계에서 같이 정리된 포인트는 다음과 같습니다.

- `train-move-ordering-profile`은 이제 teacher/runtime stack에서 `--teacher-tuple-profile-json off`, `--teacher-mpc-profile-json off`, `--tuple-profile-json off`, `--mpc-json off` 같은 **명시적 비활성화**를 지원합니다.
- `calibrate-mpc-profile`도 `--tuple-profile-json off`, `--mpc-profile-json off`를 받아, 의도치 않게 active support stack을 상속하지 않도록 할 수 있습니다.
- `calibrate-tuple-residual-profile`, `train-move-ordering-profile`, `calibrate-mpc-profile`에는 bucket lookup, reusable search-engine, calibration verification 단순화 같은 **저위험 가속화**가 같이 들어가 있습니다.

즉 Stage 136의 핵심 의도는 **balanced13을 active의 부속 가중치에 기대지 않고, 자기 소속 stack으로 다시 학습시켜 결선에 올릴 수 있게 만드는 것**입니다.

## Stage 130 evaluation-profile 확장 bundle

현재 저장소 기준에서 evaluation-profile 확장 실험을 다시 열고 싶다면, 가장 권장하는 진입점은 `run-stage130-evaluation-expansion-bundle` 입니다.

기본 진입점:

```bat
tools\evaluator-training\run-stage130-evaluation-expansion-bundle.bat ^
  D:\othello-data\Egaroucid_Train_Data
```

또는:

```bash
node tools/evaluator-training/run-stage130-evaluation-expansion-bundle.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --phase all \
  --resume
```

권장 순서는 다음과 같습니다.

1. `--phase eta` 로 대략적인 wall-time 추정
2. 기본값(`--phase all`)으로 ETA + evaluation-profile candidate 학습 + micro-patch follow-up을 한 번에 실행
3. `--phase patch` 로 finalist candidate에 대한 micro-patch follow-up

기본 config는 다음 두 파일입니다.

- `examples/evaluation-profile-candidate-suite.train-plus-bench.example.json`
- `examples/evaluation-profile-patch-suite.patch-plus-bench.example.json`

핵심 의도는, 손으로 bucket/feature 조합을 일일이 붙이지 않고도 **유력한 후보군을 한 번에 학습하고, 바로 follow-up patch까지 이어 갈 수 있게 묶는 것**입니다.

## 현재 권장 학습 대상

### 1) phase-bucket evaluator profile
중반~후반 전체 평가의 베이스입니다.

- 출력 JSON: `trained-evaluation-profile.json`
- 대표 도구: `train-phase-linear.mjs`, `benchmark-profile.mjs`

### 2) tuple residual profile
base evaluator 위에 얹는 pattern table 계층입니다.

- 출력 JSON: `trained-tuple-residual-profile.json`
- calibration 출력 JSON: `trained-tuple-residual-profile.calibrated.json`
- 대표 도구: `train-tuple-residual-profile.mjs`, `calibrate-tuple-residual-profile.mjs`

### 3) calibrated MPC profile
search 엔진의 selective pruning에 쓰는 shallow/deep 보정 profile입니다.

- 출력 JSON: `trained-mpc-profile.json`
- 대표 도구: `calibrate-mpc-profile.mjs`, `make-mpc-runtime-variant.mjs`, `run-mpc-candidate-training-suite.mjs`
- 권장 보관: **raw calibration JSON + runtime variant JSON 둘 다 유지**

### 4) generated runtime module
앱이 직접 import하는 배포용 모듈입니다.

- 출력 JS: `js/ai/learned-eval-profile.generated.js` 또는 별도 경로의 generated module
- 대표 도구: `build-generated-profile-module.mjs`, `export-profile-module.mjs`
- 기본 형식: **compact**

## 입력 데이터

지원 입력은 다음과 같습니다.

### Egaroucid 공개 학습 데이터(txt)
한 줄에 `64칸 board string + score` 형식입니다.

예시:

```text
-XO-OOXOOXX-OXOO-XXOXXOOX-OXOOXOOXOOOXXXO-XOOOXXO-O-OO---OOOX-O- 4
```

- `X`: 현재 둘 차례의 돌
- `O`: 상대 돌
- `-`: 빈칸
- 뒤 숫자: 현재 둘 차례 기준 예상 최종 돌 차이

### JSONL / NDJSON
다음 형식들을 읽습니다.

```json
{"board":"...64 chars...","score":4}
{"board":"...64 chars...","engineScore":12345}
{"black":"123","white":"456","currentPlayer":"black","target":23456}
```

## 빠른 시작

참고: Windows batch 래퍼들은 기본적으로 결과물을 `tools/evaluator-training/out/` 아래에 저장하며, repo의 기본 runtime module을 자동으로 덮어쓰지 않습니다. 실제 앱에 설치할 때만 `install-tuple-residual-profile` 또는 `export-profile-module`을 쓰는 것을 권장합니다.

### 1. 데이터 준비

```bat
tools\evaluator-training\download-egaroucid-data.bat D:\othello-data
```

압축을 푼 뒤 `Egaroucid_Train_Data` 폴더를 입력으로 사용하면 됩니다.

### 2. 예상 시간 확인

```bat
tools\evaluator-training\estimate-training-time.bat D:\othello-data\Egaroucid_Train_Data 200000
```

또는:

```bash
node tools/evaluator-training/estimate-training-time.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --sample-limit 200000
```

## 2-1. 권장: evaluation-profile 확장 candidate suite

`run-evaluation-profile-candidate-suite` 는 evaluation-profile 확장 후보를 **순차적으로** 학습하고, 필요하면 바로 benchmark까지 이어 주는 상위 suite입니다.

이 도구는 후보별로 다음을 실행합니다.

1. seed evaluation profile 생성(active 또는 지정 baseline에서 파생)
2. `train-phase-linear` 실행
3. compact generated module export
4. 선택적 profile/depth/exact benchmark
5. candidate status / suite summary / review summary 기록

### 가장 쉬운 실행

```bat
tools\evaluator-training\run-evaluation-profile-candidate-suite.bat D:\othello-data\Egaroucid_Train_Data
```

config 없이 실행하면 built-in 기본 후보 세트를 사용합니다.

- `balanced12-control-hard`
- `balanced13-control-hard`
- `balanced12-control-smoothed`
- `balanced13-control-smoothed`
- `default8-alllate-hard`
- `balanced12-alllate-smoothed`
- `balanced13-alllate-smoothed`

### config 파일로 실행

```bat
tools\evaluator-training\run-evaluation-profile-candidate-suite.bat ^
  D:\othello-data\Egaroucid_Train_Data ^
  tools\evaluator-training\out\stage130-eval-suite ^
  --config tools\evaluator-training\examples\evaluation-profile-candidate-suite.train-plus-bench.example.json ^
  --resume
```

직접 실행 예시:

```bash
node tools/evaluator-training/run-evaluation-profile-candidate-suite.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --output-dir tools/evaluator-training/out/stage130-eval-suite \
  --config tools/evaluator-training/examples/evaluation-profile-candidate-suite.train-plus-bench.example.json \
  --resume
```

### suite가 남기는 주요 산출물

```text
evaluation-profile-candidate-suite/
  suite-manifest.json
  suite-summary.json
  suite-review-summary.json
  shared/
    seed-base-evaluation-profile.json
    benchmark-baseline.generated.js
  candidates/
    balanced13-alllate-smoothed/
      seed-evaluation-profile.json
      trained-evaluation-profile.json
      learned-eval-profile.generated.js
      candidate-resolved-config.json
      candidate-status.json
      benchmarks/
        profile.benchmark.json
        depth-search.benchmark.json
        exact-search.benchmark.json
```

### built-in 후보 축

- **phase bucket family**: `default8`, `balanced12`, `balanced13`
- **feature family**: `control`, `late-parity-region`, `late-mobility-corner-counts`, `midlate-stability-counts`, `all-late-scalars`
- **sample assignment**: `hard`, `linear-adjacent`

### example config

- `tools/evaluator-training/examples/evaluation-profile-candidate-suite.train-only.example.json`
- `tools/evaluator-training/examples/evaluation-profile-candidate-suite.train-plus-bench.example.json`

첫 번째는 train/export 중심, 두 번째는 profile / depth / exact benchmark까지 같이 도는 예제입니다.

## 2-2. 권장: evaluation-profile micro-patch suite

`run-evaluation-profile-patch-suite` 는 candidate suite 결과를 source로 받아, final adoption 전에 **작은 attenuation / blend / interpolation toggle** 후보를 일괄 생성하는 상위 suite입니다.

이 도구는 후보별로 다음을 실행합니다.

1. source evaluation profile 선택(candidate suite finalist 또는 지정 source profile)
2. `patch-evaluation-profile` 실행
3. compact generated module export
4. 선택적 profile/depth/exact benchmark
5. candidate status / suite summary / review summary 기록

### 가장 쉬운 실행

```bat
tools\evaluator-training\run-evaluation-profile-patch-suite.bat tools\evaluator-training\out\stage130-eval-suite
```

`source-suite-dir`만 주면 review summary의 finalist 후보들 위에 기본 patch template 세트를 자동 전개합니다.

- `extras-090`
- `extras-075`
- `parity-090`
- `stability-090`
- `lateblend-010`
- `interp-off`

### config 파일로 실행

```bat
tools\evaluator-training\run-evaluation-profile-patch-suite.bat ^
  tools\evaluator-training\out\stage130-eval-suite ^
  tools\evaluator-training\out\stage130-eval-patch-suite ^
  --input D:\othello-data\Egaroucid_Train_Data ^
  --config tools\evaluator-training\examples\evaluation-profile-patch-suite.patch-plus-bench.example.json ^
  --resume
```

직접 실행 예시:

```bash
node tools/evaluator-training/run-evaluation-profile-patch-suite.mjs \
  --source-suite-dir tools/evaluator-training/out/stage130-eval-suite \
  --output-dir tools/evaluator-training/out/stage130-eval-patch-suite \
  --input D:/othello-data/Egaroucid_Train_Data \
  --config tools/evaluator-training/examples/evaluation-profile-patch-suite.patch-plus-bench.example.json \
  --resume
```

### suite가 남기는 주요 산출물

```text
evaluation-profile-patch-suite/
  suite-manifest.json
  suite-summary.json
  suite-review-summary.json
  shared/
    benchmark-baseline.generated.js
  candidates/
    balanced13-alllate-smoothed__interp-off/
      trained-evaluation-profile.patched.json
      patch-summary.json
      learned-eval-profile.generated.js
      candidate-resolved-config.json
      candidate-status.json
      benchmarks/
        profile.benchmark.json
        depth-search.benchmark.json
        exact-search.benchmark.json
```

### example config

- `tools/evaluator-training/examples/evaluation-profile-patch-suite.patch-only.example.json`
- `tools/evaluator-training/examples/evaluation-profile-patch-suite.patch-plus-bench.example.json`

첫 번째는 patch/export 중심, 두 번째는 profile / depth / exact benchmark까지 같이 도는 예제입니다.

## 3. 권장: 올인원 다중 후보 suite

가장 실용적인 엔트리포인트는 `run-multi-candidate-training-suite` 입니다.

이 도구는 후보별로 다음을 **순차적으로** 실행합니다.

1. shared phase evaluator 준비(재학습 또는 active/external JSON 재사용)
2. tuple residual 학습
3. calibration
4. generated module export
5. 선택적 profile/depth/exact benchmark
6. status JSON / summary JSON 기록

### 가장 쉬운 실행

```bat
tools\evaluator-training\run-multi-candidate-training-suite.bat D:\othello-data\Egaroucid_Train_Data
```

config 없이 실행하면 기본 3-family 후보를 사용합니다.

- `orthogonal-adjacent-pairs-full-v1`
- `diagonal-adjacent-pairs-full-v1`
- `straight-adjacent-pairs-full-v1`

### config 파일로 실행

```bat
tools\evaluator-training\run-multi-candidate-training-suite.bat ^
  D:\othello-data\Egaroucid_Train_Data ^
  tools\evaluator-training\out\stage63-suite ^
  --config tools\evaluator-training\examples\multi-candidate-suite.train-only.example.json ^
  --resume
```

직접 실행 예시:

```bash
node tools/evaluator-training/run-multi-candidate-training-suite.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --output-dir tools/evaluator-training/out/stage63-suite \
  --config tools/evaluator-training/examples/multi-candidate-suite.train-plus-bench.example.json \
  --resume
```

### suite가 남기는 주요 산출물

`output-dir` 아래에 다음 구조를 만듭니다.

```text
multi-candidate-training-suite/
  suite-config.resolved.json
  suite-summary.json
  shared/
    active-evaluation-profile.snapshot.json
    active-move-ordering-profile.snapshot.json
    trained-evaluation-profile.json               # phase 재학습 시
    suite-shared-status.json
  candidates/
    diagonal-full/
      candidate-config.resolved.json
      candidate-status.json
      trained-tuple-residual-profile.json
      trained-tuple-residual-profile.calibrated.json
      tuple-residual-calibration-summary.json
      learned-eval-profile.preview.generated.js
      learned-eval-profile.generated.js
      benchmarks/
        profile.benchmark.json
        depth.benchmark.json
        exact.benchmark.json
```

### resume / plan-only

긴 학습에서는 아래 두 옵션을 적극 권장합니다.

- `--resume` : 성공한 step과 동일한 signature의 산출물이 남아 있으면 건너뜁니다.
- `--plan-only` : 실제 실행 없이 어떤 command가 호출될지 먼저 확인합니다.

### example config

- `tools/evaluator-training/examples/multi-candidate-suite.train-only.example.json`
- `tools/evaluator-training/examples/multi-candidate-suite.train-plus-bench.example.json`

첫 번째는 train/calibrate/export만, 두 번째는 benchmark까지 같이 돕는 예제입니다.

## 3-1. 권장: MPC 다중 후보 suite

MPC 재학습은 `run-mpc-candidate-training-suite`가 가장 실용적인 엔트리포인트입니다.

이 도구는 후보별로 다음을 **순차적으로** 실행합니다.

1. `calibrate-mpc-profile`
2. `make-mpc-runtime-variant`
3. generated module export
4. 선택적 depth/exact benchmark
5. status JSON / summary JSON 기록

### 가장 쉬운 실행

```bat
tools\evaluator-training\run-mpc-candidate-training-suite.bat D:\othello-data\Egaroucid_Train_Data
```

config 없이 실행하면 다음 기본 후보 세트를 사용합니다.

- `baseline-4bucket-high`
- `overlap-8bucket-high-safe`
- `overlap-8bucket-high-tight`
- `overlap-8bucket-both-softlow`

### config 파일로 실행

```bat
tools\evaluator-training\run-mpc-candidate-training-suite.bat ^
  D:\othello-data\Egaroucid_Train_Data ^
  tools\evaluator-training\out\mpc-suite ^
  --config tools\evaluator-training\examples\mpc-candidate-suite.train-plus-bench.example.json ^
  --resume
```

직접 실행 예시:

```bash
node tools/evaluator-training/run-mpc-candidate-training-suite.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --output-dir tools/evaluator-training/out/mpc-suite \
  --config tools/evaluator-training/examples/mpc-candidate-suite.train-plus-bench.example.json \
  --resume
```

### suite가 남기는 주요 산출물

```text
mpc-candidate-training-suite/
  suite-config.resolved.json
  suite-summary.json
  shared/
    active-evaluation-profile.snapshot.json
    active-move-ordering-profile.snapshot.json
    active-tuple-residual-profile.snapshot.json
    active-mpc-profile.snapshot.json
  candidates/
    overlap-8bucket-high-safe/
      candidate-config.resolved.json
      candidate-status.json
      trained-mpc-profile.raw.json
      trained-mpc-profile.json
      learned-eval-profile.generated.js
      benchmarks/
        depth.benchmark.json
        exact.benchmark.json
```

사용자가 실행 후 회수해 주시면 좋은 핵심 파일은 다음입니다.

- `suite-summary.json`
- 각 candidate의 `trained-mpc-profile.json`
- 채택 후보가 있다면 해당 `learned-eval-profile.generated.js` 또는 benchmark JSON

### example config

- `tools/evaluator-training/examples/mpc-candidate-suite.train-only.example.json`
- `tools/evaluator-training/examples/mpc-candidate-suite.train-plus-bench.example.json`

첫 번째는 calibrate/variant/export만, 두 번째는 depth/exact benchmark까지 같이 돕는 예제입니다.

## 4. 권장: small-patch / prune / attenuation suite

대규모 family를 다시 학습하기보다, 이미 학습된 후보를 안전하게 잘라내고 약화시키며 비교하고 싶을 때는
`run-tuple-patch-suite`가 가장 실용적입니다.

이 도구는 후보별로 다음을 **순차적으로** 실행합니다.

1. source tuple profile 선택(stage63 suite candidate / active snapshot / external JSON)
2. patch / prune / attenuation
3. 선택적 calibration
4. preview/final generated module export
5. 선택적 profile/depth/exact benchmark
6. status JSON / summary JSON 기록

### 가장 쉬운 실행

```bat
tools\evaluator-training\run-tuple-patch-suite.bat tools\evaluator-training\out\stage63-suite
```

`source-suite-dir`만 주면 기본 small-patch 후보 세트를 사용합니다.

- `active-lateb-attenuated`
- `diagonal-lite-top24`
- `diagonal-latea-endgame-top16`
- `straight-lite-top24`
- `orthogonal-endgame-top16`

### config 파일로 실행

```bat
tools\evaluator-training\run-tuple-patch-suite.bat ^
  tools\evaluator-training\out\stage63-suite ^
  tools\evaluator-training\out\stage65-patch-suite ^
  --config tools\evaluator-training\examples\tuple-patch-suite.patch-only.example.json ^
  --resume
```

corpus까지 붙여 calibration / profile benchmark까지 같이 하려면:

```bat
tools\evaluator-training\run-tuple-patch-suite.bat ^
  tools\evaluator-training\out\stage63-suite ^
  tools\evaluator-training\out\stage65-patch-suite-bench ^
  --input D:\othello-data\Egaroucid_Train_Data ^
  --config tools\evaluator-training\examples\tuple-patch-suite.patch-plus-bench.example.json ^
  --resume
```

직접 실행 예시:

```bash
node tools/evaluator-training/run-tuple-patch-suite.mjs \
  --source-suite-dir tools/evaluator-training/out/stage63-suite \
  --output-dir tools/evaluator-training/out/stage65-patch-suite \
  --config tools/evaluator-training/examples/tuple-patch-suite.patch-only.example.json \
  --resume
```

### suite가 남기는 주요 산출물

```text
tuple-patch-suite/
  suite-config.resolved.json
  suite-summary.json
  shared/
    active-evaluation-profile.snapshot.json
    active-move-ordering-profile.snapshot.json
    active-tuple-residual-profile.snapshot.json
  candidates/
    diagonal-lite-top24/
      candidate-config.resolved.json
      candidate-status.json
      trained-tuple-residual-profile.patched.json
      tuple-residual-patch-summary.json
      learned-eval-profile.preview.generated.js
      trained-tuple-residual-profile.patched.calibrated.json   # calibration 사용 시
      tuple-residual-calibration-summary.json                  # calibration 사용 시
      learned-eval-profile.generated.js
      benchmarks/
        profile.benchmark.json
        depth.benchmark.json
        exact.benchmark.json
```

### patch에서 자주 쓰는 조합

- **late-b attenuation**: `bucketScales: { "late-b": 0.5 }`
- **top-N lite 후보**: `keepTopTuples: 16` 또는 `24`
- **late-a + endgame only**: `keepBuckets: ["late-a", "endgame"]`
- **entry-level micro patch**: `entryScales: { "late-a:F1-G2@8": 0.5 }` 또는 `entryScales: { "midgame-c:B7-A8@4": 0.8 }`
- **endgame only**: `keepBuckets: ["endgame"]`

### example config

- `tools/evaluator-training/examples/tuple-patch-suite.patch-only.example.json`
- `tools/evaluator-training/examples/tuple-patch-suite.patch-plus-bench.example.json`
- `tools/evaluator-training/examples/tuple-patch-suite.diagonal-hybrid-search.example.json`
- `tools/evaluator-training/examples/tuple-patch-suite.finalist-followup-search.example.json`
- `tools/evaluator-training/examples/tuple-patch-suite.finalist-followup-depthonly.example.json`
- `tools/evaluator-training/examples/tuple-patch-suite.final-entry-followup.example.json`

첫 번째는 patch/export 중심, 두 번째는 calibration / profile / depth / exact benchmark까지 같이 도는 예제입니다.
세 번째는 `diagonal-lite` 계열 2차 patch search를 바로 재현할 수 있는 소형 예제입니다.
네 번째와 다섯 번째는 stage68 이후처럼 finalist 후보를 미세 감쇠하고,
먼저 depth-only로 빠르게 좁힌 뒤 full depth / exact / engine-match로 넘기는 follow-up 라운드를 재현하는 예제입니다.
여섯 번째는 남은 mismatch slot을 tuple table entry 단위로 직접 줄이는 마지막 micro-patch 라운드를 재현하는 예제입니다.

## 5. 단일 후보 파이프라인

### A. phase evaluator 학습

```bat
tools\evaluator-training\train-phase-linear.bat D:\othello-data\Egaroucid_Train_Data
```

직접 실행:

```bash
node tools/evaluator-training/train-phase-linear.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --target-scale 3000 \
  --holdout-mod 10 \
  --lambda 5000 \
  --progress-every 250000 \
  --output-json tools/evaluator-training/out/trained-evaluation-profile.json
```

### B. tuple residual 학습

```bat
tools\evaluator-training\train-tuple-residual-profile.bat D:\othello-data\Egaroucid_Train_Data
```

직접 실행 예시:

```bash
node tools/evaluator-training/train-tuple-residual-profile.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --evaluation-profile-json tools/evaluator-training/out/trained-evaluation-profile.json \
  --layout-name diagonal-adjacent-pairs-full-v1 \
  --phase-buckets midgame-c,late-a,late-b,endgame \
  --sample-stride 4 \
  --epochs 1 \
  --learning-rate 0.05 \
  --l2 0.0005 \
  --gradient-clip 90000 \
  --min-visits 32 \
  --progress-every 250000 \
  --output-json tools/evaluator-training/out/trained-tuple-residual-profile.json
```

### C. tuple residual calibration

```bat
tools\evaluator-training\calibrate-tuple-residual-profile.bat tools\evaluator-training\out\trained-tuple-residual-profile.json
```

직접 실행:

```bash
node tools/evaluator-training/calibrate-tuple-residual-profile.mjs \
  --tuple-json tools/evaluator-training/out/trained-tuple-residual-profile.json \
  --corpus D:/othello-data/Egaroucid_Train_Data \
  --evaluation-profile-json tools/evaluator-training/out/trained-evaluation-profile.json \
  --scope holdout-selected \
  --shrink 1.0 \
  --max-bias-stones 1.5 \
  --progress-every 250000 \
  --output-json tools/evaluator-training/out/trained-tuple-residual-profile.calibrated.json
```

### D. app용 generated module 재생성

```bash
node tools/evaluator-training/build-generated-profile-module.mjs \
  --evaluation-json tools/evaluator-training/out/trained-evaluation-profile.json \
  --tuple-json tools/evaluator-training/out/trained-tuple-residual-profile.calibrated.json \
  --output-module tools/evaluator-training/out/learned-eval-profile.generated.js \
  --module-format compact
```

현재는 **JSON 두 개**만 넘겨받아도 충분합니다.

- `trained-evaluation-profile.json`
- `trained-tuple-residual-profile.calibrated.json`

generated module 자체는 선택 사항입니다.

### E. balanced13 support-stack 재학습

Stage 135 결선 후보 balanced13에 대해 move-ordering / tuple residual / MPC까지 공정하게 다시 맞추려면 아래 bundle을 사용하십시오.

```bat
tools\evaluator-training\run-stage136-balanced13-support-stack-bundle.bat ^
  D:\othello-data\Egaroucid_Train_Data
```

직접 실행:

```bash
node tools/evaluator-training/run-stage136-balanced13-support-stack-bundle.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --resume
```

MPC만 다시 이어서 돌리고 싶으면:

```bash
node tools/evaluator-training/run-stage136-balanced13-support-stack-bundle.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --phase mpc \
  --resume
```

export만 다시 만들고 싶으면:

```bash
node tools/evaluator-training/run-stage136-balanced13-support-stack-bundle.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --phase export \
  --resume
```

학습 후 회수하면 좋은 핵심 파일은 다음입니다.

- `tuple/trained-tuple-residual-profile.calibrated.json`
- `move-ordering/trained-move-ordering-profile.json`
- `mpc/trained-mpc-profile.json`
- `mpc/runtime-mpc-profile.json`
- `exported/learned-eval-profile.generated.js`
- `stage136-balanced13-support-stack-bundle-summary.json`

## 6. layout family 빠른 파일럿

`run-tuple-layout-family-pilot.mjs` 는 layout 비교만 빠르게 돌리고 싶을 때 여전히 유용합니다.

```bash
node tools/evaluator-training/run-tuple-layout-family-pilot.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --layouts orthogonal-adjacent-pairs-full-v1,diagonal-adjacent-pairs-full-v1,straight-adjacent-pairs-full-v1 \
  --output-dir tools/evaluator-training/out/tuple-layout-family-pilot \
  --module-format compact
```

이 도구는 **layout만 다른 후보를 빠르게 비교**할 때 적합합니다. 후보마다 benchmark 정책까지 세분화하고 싶으면 `run-multi-candidate-training-suite.mjs` 쪽이 더 적합합니다.

## 7. layout family 후보

현재 built-in tuple layout은 다음 네 가지입니다.

- `orthogonal-adjacent-pairs-outer2-v1`
- `orthogonal-adjacent-pairs-full-v1`
- `diagonal-adjacent-pairs-full-v1`
- `straight-adjacent-pairs-full-v1`

구조적 용량 상한을 먼저 보고 싶으면:

```bash
node tools/evaluator-training/estimate-tuple-layout-candidate-sizes.mjs \
  --module-format compact \
  --summary-json benchmarks/tuple_layout_candidate_size_summary.json
```

## 8. 벤치마크

### phase evaluator holdout/corpus 벤치마크

```bash
node tools/evaluator-training/benchmark-profile.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --baseline-profile tools/evaluator-training/out/trained-evaluation-profile.json \
  --candidate-profile tools/evaluator-training/out/trained-evaluation-profile.json \
  --candidate-tuple-profile tools/evaluator-training/out/trained-tuple-residual-profile.calibrated.json
```

### tuple residual corpus 벤치마크

```bat
tools\evaluator-training\benchmark-tuple-residual-profile.bat D:\othello-data\Egaroucid_Train_Data tools\evaluator-training\out\trained-tuple-residual-profile.calibrated.json
```

### depth / exact search 비용 벤치마크

```bat
tools\evaluator-training\benchmark-depth-tuple-residual-profile.bat tools\evaluator-training\out\trained-tuple-residual-profile.calibrated.json
tools\evaluator-training\benchmark-exact-tuple-residual-profile.bat tools\evaluator-training\out\trained-tuple-residual-profile.calibrated.json
```

이제 depth / exact 벤치도 generated module을 직접 받을 수 있습니다.
임시로 앱 파일을 교체하거나 evaluation / move-ordering / tuple JSON을 다시 분해하지 않아도 됩니다.

```bash
node tools/evaluator-training/benchmark-depth-search-profile.mjs \
  --baseline-generated-module js/ai/learned-eval-profile.generated.js \
  --candidate-generated-module tools/evaluator-training/out/learned-eval-profile.generated.js \
  --empties 26,24,22,20,18,16 --seed-start 1 --seed-count 12 \
  --time-limit-ms 2000 --max-depth 6 --exact-endgame-empties 10

node tools/evaluator-training/benchmark-exact-search-profile.mjs \
  --baseline-generated-module js/ai/learned-eval-profile.generated.js \
  --candidate-generated-module tools/evaluator-training/out/learned-eval-profile.generated.js \
  --empties 14,13,12,11,10 --seed-start 1 --seed-count 8 --repetitions 3 \
  --time-limit-ms 60000 --max-depth 12
```

개별 `--candidate-profile` / `--candidate-move-ordering-profile` / `--candidate-tuple-profile` 인자는 그대로 유지되며, 지정하면 generated module에서 불러온 slot을 덮어씁니다.

### generated module 그대로 Trineutron 대국 벤치에 넣기

`tools/engine-match/benchmark-vs-trineutron.mjs` 는 이제 `--generated-module` 또는 개별 `--evaluation-json` / `--move-ordering-json` / `--tuple-json` 입력을 받아,
임시로 앱 파일을 교체하지 않고도 candidate generated module을 직접 대국 벤치에 넣을 수 있습니다.

```bash
node tools/engine-match/benchmark-vs-trineutron.mjs \
  --variants custom \
  --generated-module tools/evaluator-training/out/learned-eval-profile.generated.js \
  --variant-label diagonal-latea-endgame-top24 \
  --games 2 --opening-plies 20 --seed 11 \
  --our-time-ms 100 --their-time-ms 100 --their-noise-scale 0
```

## 9. compact generated module

Stage 60부터 learned evaluator generated module도 **compact runtime export**를 기본으로 지원합니다.

- 기본값: `--module-format compact`
- 비교/디버그용: `--module-format expanded`

compact 모드에서는 다음을 줄입니다.

- pretty JSON 제거
- runtime에 불필요한 `diagnostics`, `source`, 긴 설명 문자열 제거
- built-in tuple layout은 full layout object 대신 `layoutName`만 유지

즉, 사용자에게 꼭 필요한 것은 **학습 JSON**이지, 큰 generated module 파일이 아닙니다.

## 10. opening prior 도구

opening prior는 evaluator lane과 별개로 유지합니다.
필요할 때만 아래 도구를 사용하십시오.

- `train-opening-prior.mjs`
- `build-opening-prior-module.mjs`
- `benchmark-opening-hybrid-tuning.mjs`
- `replay-opening-hybrid-reference-suite.mjs`

## 11. 어떤 파일을 보내면 되는가

현재 evaluator lane 기준으로는 보통 아래 파일 조합이면 충분합니다.

### evaluation-profile lane

1. `trained-evaluation-profile.json` 또는 `trained-evaluation-profile.patched.json`
2. `suite-summary.json`
3. 가능하면 `suite-review-summary.json`

### tuple lane

1. `trained-evaluation-profile.json`
2. `trained-tuple-residual-profile.calibrated.json`

같이 보내면 도움이 되는 선택 항목:

- `learned-eval-profile.generated.js`
- depth / exact benchmark JSON
- `tuple_layout_candidate_size_summary.json`
- `tuple-layout-family-pilot-summary.json`

## 12. 도구 색인

짧은 용도별 요약은 아래 문서를 보십시오.

- `tools/evaluator-training/TOOL_INDEX.md`
- `tools/evaluator-training/LEGACY_TOOLS.md`
