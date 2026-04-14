# Stage 126 - user-executable weight learning bundle and trainer refresh

## 요약

Stage 124 review와 Stage 125 bounded pilot까지 닫고 나면, 현재 저장소에서 **실험 가치가 남아 있는 가중치 학습 lane**은 사실상 하나뿐입니다.

- richer external corpus를 전제로 한 **compact systematic short n-tuple family 재학습**
- 그 뒤의 **compact patch/prune/attenuation follow-up**

이번 Stage의 목적은 이 lane을 다시 기본값 후보로 밀어 넣는 것이 아니라, **사용자가 직접 돌릴 수 있는 재현 가능한 offline learning bundle과 trainer package를 정리하는 것**이었습니다.

판정은 다음과 같습니다.

1. 브라우저 기본 런타임은 그대로 유지합니다.
2. 현재 시점의 default reopen lane은 Stage 125에서 no-adoption으로 닫힌 compact tuple family의 **richer-corpus rerun + patch follow-up**뿐입니다.
3. move-ordering retune, broad MPC reopen, broad hand-crafted evaluator 확장, 5–6 empties micro-specialization 확대, broad special-ending 확장은 **기본 bundle에서 제외**합니다.
4. 사용자는 새 wrapper 하나로 ETA → suite → patch 단계를 묶어서 실행할 수 있고, trainer package에도 같은 진입점을 그대로 포함합니다.

즉 이번 Stage는 **runtime closeout 이후의 user-executable offline learning handoff stage**입니다.

## 배경

Stage 124 review는 다음을 정리했습니다.

- compact systematic short n-tuple additive lane만이 다음 reopen 후보
- 나머지 lane은 current JS web-app context 기준에서 비재개 권고

Stage 125 bounded pilot은 실제로 다음을 돌렸습니다.

- synthetic teacher corpus
- compact family pilot (`diagonal`, `orthogonal-full`, `outer2`)
- depth/exact replay
- small Trineutron sanity check

결론은 **no-adoption**이었습니다. 다만 richer external corpus와 larger offline budget이 있으면 다시 시험해 볼 가치는 남았고, 사용자가 직접 이를 수행할 수 있도록 도구를 묶어 줄 필요가 생겼습니다.

## 이번 Stage에서 추가한 것

### 1. stage-specific wrapper

새 진입점:

- `tools/evaluator-training/run-stage126-weight-learning-bundle.mjs`
- `tools/evaluator-training/run-stage126-weight-learning-bundle.bat`

이 wrapper는 Stage 126 결론을 코드 레벨에서 고정합니다.

- `--phase eta`: corpus 기준 wall-time 추정
- 기본값(`--phase all`): ETA → richer-corpus tuple family 학습 → patch follow-up
- `--phase patch`: compact patch/prune/attenuation follow-up
- `--phase all`: ETA → suite → patch 순차 실행
- `--resume`, `--continue-on-error`, `--plan-only` 지원

또한 다음 산출물을 표준 경로에 남깁니다.

- `stage126-weight-learning-bundle-manifest.json`
- `stage126-weight-learning-bundle-summary.json`
- `tuple-family-suite/`
- `tuple-patch-followup/`

즉 사용자는 이제 “어떤 도구를 어떤 순서로 붙여야 하는가”를 다시 조합하지 않아도 됩니다.

### 2. Stage 126용 example config 3종

추가한 예시 설정은 다음과 같습니다.

- `tools/evaluator-training/examples/stage126-compact-tuple-richer-corpus.train-plus-bench.example.json`
- `tools/evaluator-training/examples/stage126-compact-tuple-richer-corpus.fullbudget-train-only.example.json`
- `tools/evaluator-training/examples/stage126-compact-tuple-patch-followup.example.json`

설계 원칙:

- family 비교는 Stage 125에서 가장 의미 있었던 후보만 남김
  - `diagonal-adjacent-pairs-full-v1`
  - `orthogonal-adjacent-pairs-full-v1`
  - `orthogonal-adjacent-pairs-outer2-v1`
- shared move-ordering / MPC는 **active runtime 기준**으로 유지
- patch follow-up은 top-k + bucket restriction 중심으로만 좁힘

즉 bundle은 “학습 가능성을 넓게 여는 범용 launcher”가 아니라, **지금 다시 돌릴 가치가 남은 후보만 남긴 실행 묶음**입니다.

### 3. trainer package profile refresh

trainer profile에도 Stage 126 wrapper / config / smoke를 포함시켰습니다.

- `tools/package/lib.mjs`
- `tools/package/README.md`

이제 trainer 패키지는 다음 목적에 바로 맞습니다.

- 사용자가 external corpus를 직접 학습
- 결과 JSON/generated module만 다시 전달
- 웹 앱 기본 런타임은 건드리지 않은 채, candidate review만 후속 수행

### 4. 문서 진입점 정리

다음 문서를 함께 갱신했습니다.

- `README.md`
- `docs/runtime-ai-reference.md`
- `docs/reports/checklists/ai-implementation-checklist.md`
- `tools/evaluator-training/README.md`
- `tools/evaluator-training/TOOL_INDEX.md`
- `tools/package/README.md`
- `stage-info.json`

핵심 메시지는 일관되게 하나입니다.

- **현재 기본 런타임은 Stage 123 채택 상태 그대로 유지**
- Stage 126은 **offline relearning handoff tooling**만 추가

## 기본 권장 실행 순서

### 1. ETA

```bash
node tools/evaluator-training/run-stage126-weight-learning-bundle.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --phase eta
```

### 2. richer-corpus suite

```bash
node tools/evaluator-training/run-stage126-weight-learning-bundle.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --output-root tools/evaluator-training/out/stage126-weight-learning \
  --resume
```

### 3. patch follow-up

```bash
node tools/evaluator-training/run-stage126-weight-learning-bundle.mjs \
  --input D:/othello-data/Egaroucid_Train_Data \
  --output-root tools/evaluator-training/out/stage126-weight-learning \
  --phase patch \
  --resume
```

Windows에서는 동일한 경로를 `.bat` wrapper로 호출하면 됩니다.

## 기본 bundle에서 제외한 것

이번 Stage는 “사용자가 돌릴 수 있으니 다 열어 두자”가 아니라, **실험 가치가 남은 것만 남기자**가 목적이었습니다. 따라서 기본 bundle에서는 다음을 제외했습니다.

- independent move-ordering retuning
- broad MPC re-open
- broad hand-crafted evaluator expansion
- 5–6 empties micro-specialization expansion
- broad special-ending expansion

이 축들은 보고서와 도구는 남겨 두되, **현재 기본 handoff 경로에는 넣지 않습니다.**

## 검증

다음 검증을 통과해야 Stage 126을 닫을 수 있습니다.

- `node js/test/stage126_weight_learning_bundle_smoke.mjs`
- `node js/test/core-smoke.mjs`
- `node js/test/stage36_package_profile_smoke.mjs`
- `node tools/docs/generate-report-inventory.mjs`
- `node tools/docs/generate-report-inventory.mjs --check`
- `node tools/docs/check-doc-sync.mjs`
- `node js/test/stage109_report_inventory_smoke.mjs`
- `node js/test/stage120_documentation_sync_smoke.mjs`
- `node tools/package/analyze-package-size.mjs`
- `node tools/package/build-release-packages.mjs --profiles trainer`

### 패키징 결과

패키징 결과는 다음과 같습니다.

- `runtime`: `29 files`, `3.26 MB` source
- `trainer`: `159 files`, `4.51 MB` source → `1.32 MB zip`
- trainer zip: `dist/othello-web-app-ai-trainer.zip`

즉 Stage 126 bundle을 포함해도 trainer 전달물은 충분히 작고, 사용자는 전체 개발 트리를 받지 않고도 **권장 offline learning lane**만 바로 실행할 수 있습니다.

## 결론

Stage 126은 새 evaluator default를 채택한 Stage가 아닙니다.

대신 다음을 완료한 Stage입니다.

1. 현재 저장소에서 **실험 가치가 남은 유일한 offline weight-learning lane**을 고정
2. 그 lane을 사용자가 직접 돌릴 수 있는 wrapper / config / batch 제공
3. trainer package까지 같은 진입점을 포함하도록 정리
4. 기본 웹 앱 런타임은 건드리지 않고, 후속 candidate review만 다시 열 수 있는 handoff 구조 마련

즉 이제 사용자는 richer external corpus만 준비하면, 저장소 내부 도구를 다시 조립하지 않고도 **ETA → family suite → patch follow-up** 전체를 직접 수행할 수 있습니다.
