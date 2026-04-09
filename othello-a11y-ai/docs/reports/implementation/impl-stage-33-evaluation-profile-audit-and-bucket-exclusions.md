# Stage 33 — evaluation profile audit / parity alias canonicalization / bucket exclusion pipeline

## 요약
이번 단계에서는 move-ordering 때와 비슷한 방식으로 **phase-bucket evaluator profile 자체를 감사(audit)** 할 수 있는 도구를 추가하고, 학습 파이프라인에 **bucket별 feature exclusion** 과 **safe parity alias canonicalization** 을 넣었다.

핵심 목표는 다음 둘이었다.

1. 현재 학습된 evaluator profile이 실제로 어떤 feature를 과장하거나 놓치고 있는지 확인하기
2. 문제가 보이면 전체 구조를 뒤엎지 않고, **선택적으로 재학습** 할 수 있는 안전한 파이프라인을 제공하기

이번 단계의 결론은 다음과 같다.

- 현재 업로드된 learned evaluator는 **legacy seed보다 late exact 기준으로는 더 낫다**.
- 다만 late exact random audit 기준으로는 `potentialMobility`, `bias`, `discDifferentialRaw`, `edgePattern` 이 **약간 과장**되었을 가능성이 있다.
- 반대로 `frontier`, `mobility`, `cornerPattern`, `stableDiscDifferential`, `discDifferential` 쪽은 현재 late bucket에서 의미 있는 신호를 주고 있다.
- 그리고 training/runtime 구조상 **empties 19 이상 bucket에서 `parity`, `parityGlobal`, `parityRegion` 이 사실상 같은 feature** 가 되므로, 이 부분은 이제 기본값으로 canonicalize 하도록 정리했다.

## 변경 사항

### 1) safe parity alias canonicalization
`js/ai/evaluation-profiles.js` 에서 bucket이 전부 `empties > 18` 범위인 경우:

- `parity += parityGlobal + parityRegion`
- `parityGlobal = 0`
- `parityRegion = 0`

으로 정리하도록 바꿨다.

이 구간에서는 런타임 feature 값이 항상 동일하므로, **평가 결과는 그대로 유지** 하면서도 profile 해석과 재학습이 훨씬 덜 흔들린다.

적용 bucket:

- `opening-a`
- `opening-b`
- `midgame-a`
- `midgame-b`
- `midgame-c`

### 2) `train-phase-linear.mjs` 에 feature exclusion 지원 추가
새 옵션:

- `--exclude-features bias,potentialMobility`
- `--exclude-features-by-bucket "late-a:potentialMobility,edgePattern,bias;late-b:potentialMobility"`
- `--keep-parity-aliases`

동작 방식:

- 제외된 feature는 회귀 행렬에서 빼고,
- 해당 weight는 **seed/prior profile 값 유지**
- bucket마다 다른 exclusion 세트를 줄 수 있다.

즉, full retrain을 하더라도 특정 feature만 legacy/manual 값으로 남기는 **보수적 재학습** 이 가능해졌다.

### 3) `audit-evaluation-profile.mjs` 추가
새 audit 스크립트는 두 모드를 지원한다.

#### corpus mode
학습/검증 코퍼스를 직접 읽어:

- candidate / baseline MAE, RMSE
- feature contribution share
- feature ablation
- trained feature residual correlation
- omitted diagnostic residual correlation

을 계산한다.

#### random-exact mode
seeded random late positions를 exact solve해서:

- late bucket 중심의 evaluator 오차
- late exact에서 과장되는 feature
- late exact에서 빠진 신호

를 빠르게 확인할 수 있다.

### 4) 배치 파일 추가
- `tools/evaluator-training/audit-evaluation-profile.bat`

이제 corpus mode / random-exact mode 둘 다 동일 배치 파일로 그대로 호출할 수 있다.

## 현재 업로드된 evaluator profile 점검 결과

사용한 점검:

- `tools/evaluator-training/audit-evaluation-profile.mjs`
- mode: `--random-exact`
- empties: `14,13,12,11,10,9,8,7`
- seeds: `1..4`
- 총 32개 exact-labeled late position

### 전체 지표

- candidate learned evaluator MAE: **9.549 discs**
- baseline legacy seed evaluator MAE: **10.447 discs**

즉, 현재 learned evaluator는 적어도 이 late exact 점검 세트에서는 **baseline보다 개선** 되어 있다.

### feature ablation 해석
제거하면 오히려 MAE가 커져서 **필요한 feature** 로 보인 것:

- `frontier`
- `mobility`
- `cornerPattern`
- `stableDiscDifferential`
- `discDifferential`

제거하면 오히려 MAE가 줄어서 **과장 가능성** 이 보인 것:

- `potentialMobility`
- `bias`
- `discDifferentialRaw`
- `edgePattern`
- `cornerAdjacency`

여기서 중요한 점은, 이 결과가 **late exact random suite 기준** 이라는 것이다. 따라서 바로 전 bucket과 endgame 인접 구간을 다듬는 데는 강한 힌트가 되지만, opening / midgame까지 그대로 일반화해서 해석하면 안 된다.

### residual correlation 해석
trained feature residual correlation 상위는 대략 다음 쪽이 컸다.

- `frontier`
- `discDifferentialRaw`
- `discDifferential`
- `mobility`
- `cornerAccess`

omitted diagnostic residual correlation 상위는 다음 쪽이 컸다.

- `opponentMoveCount`
- `opponentStableDiscs`
- `cornerMoveCount`

해석:

- 이미 들어간 feature 중에서도 일부는 late exact 구간에서 **아직 weight calibration 여지** 가 있다.
- 학습 feature에 직접 쓰지 않는 보조 진단값 중에서는 `opponentMoveCount` 계열이 residual과 꽤 연관을 보였다.
- 그러나 이 단계에서는 우선 **feature 추가보다 exclusion + 재학습 audit** 경로를 먼저 여는 쪽이 더 보수적이고 안전하다.

## 검증

실행 및 통과:

- `node js/test/core-smoke.mjs`
- `node js/test/perft.mjs`
- `node tools/evaluator-training/train-phase-linear.mjs ... --exclude-features-by-bucket ... --skip-diagnostics`
- `node tools/evaluator-training/audit-evaluation-profile.mjs --input ...` (synthetic smoke)
- `node tools/evaluator-training/audit-evaluation-profile.mjs --random-exact ...`

추가 확인:

- parity alias folding 전/후로 sampled random state에서 evaluator 결과를 비교했을 때 **mismatch 0건**
- 즉, canonicalization은 score를 바꾸지 않고 profile 구조만 정리한다.

## 권장 다음 단계

1. move-ordering 재학습이 끝나는 동안, evaluator는 새 audit 도구로 **holdout corpus audit** 을 한 번 돌린다.
2. 만약 holdout corpus에서도 late bucket에서 `potentialMobility / edgePattern / bias / discDifferentialRaw` 쪽이 계속 음의 ablation delta를 보이면:

```bash
node tools/evaluator-training/train-phase-linear.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --exclude-features-by-bucket "late-a:potentialMobility,edgePattern,bias,discDifferentialRaw;late-b:potentialMobility,edgePattern,bias,discDifferentialRaw" \
  --output-json tools/evaluator-training/out/trained-evaluation-profile.json \
  --output-module js/ai/learned-eval-profile.generated.js
```

같은 식으로 **보수적 재학습** 을 먼저 시도하는 것이 좋다.

3. 반대로 corpus audit에서는 early/mid buckets가 건강하고 late exact random audit에서만 과장이 보인다면, exclusion은 late bucket에만 한정해야 한다.

## 산출물

- `tools/evaluator-training/audit-evaluation-profile.mjs`
- `tools/evaluator-training/audit-evaluation-profile.bat`
- `benchmarks/stage33_current_profile_random_exact_audit.json`
- `benchmarks/stage33_corpus_audit_smoke.json`
- `benchmarks/stage33_evaluation_pipeline_update_and_audit_summary.json`
- `tools/evaluator-training/out/stage33_train_exclusion_smoke.json`

