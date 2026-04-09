# Stage 55 구현 보고서 — opening prior runtime compaction

## 요약
- `trained-opening-prior-profile.json`은 학습/진단용 full profile로 유지하고,
  `opening-prior.generated.js`는 기본적으로 compact runtime 형식으로 생성하도록 바꿨습니다.
- compact 형식은 position마다 `[hashHex, ply, totalCount, moveIndex, count, priorScore, ...]`만 남깁니다.
- `js/ai/opening-prior.js`가 compact profile을 직접 lookup할 수 있도록 확장했습니다.
- builder / trainer 양쪽에서 compact module 생성 옵션을 지원합니다.
- 사용자가 업로드한 실제 opening prior JSON으로 앱용 `js/ai/opening-prior.generated.js`를 다시 생성해 설치했습니다.

## 배경
stage53 파이프라인은 학습 자체는 정상적으로 수행했지만, 산출물을 그대로 generated module로 내보내는 경로가 너무 장황했습니다.

문제는 다음과 같았습니다.

1. full JSON이 candidate당 진단 필드를 너무 많이 남긴다.
   - `meanActualScore`, `meanTheoreticalScore`, `winRate`, `share`, `rank` 등
2. generated module builder가 이 full profile을 거의 그대로 pretty-printed JS로 다시 쓴다.
3. 결과적으로 “학습/검수용 산출물”과 “런타임 배포물”의 구분이 흐려졌다.

이번 단계의 목표는 **학습 JSON은 그대로 두되, 정적 웹 앱이 실제로 import할 런타임 module만 따로 압축**하는 것이었습니다.

## 변경 사항
### 1) `js/ai/opening-prior.js`
- compact runtime profile(`format: "compact-v1"`)을 읽을 수 있도록 확장했습니다.
- `hashEncoding` 개념을 추가했습니다.
  - full profile 기본: `decimal`
  - compact profile 기본: `hex`
- `canonicalizeOpeningPriorState()`가 `stateHashDecimal`, `stateHashHex`를 함께 계산할 수 있게 했고,
  lookup 시 profile의 `hashEncoding`에 맞춰 key를 생성합니다.
- compact profile은 전체를 즉시 expanded object로 풀지 않고,
  `positionsByKey`에는 raw compact entry를 두고 실제 조회 시점에만 decode합니다.
- decode 결과는 cache해서 반복 lookup 비용을 줄였습니다.

### 2) `tools/evaluator-training/lib.mjs`
- opening prior generated module용 정규화 계층을 확장했습니다.
- 새 compact runtime builder 로직을 추가했습니다.
  - 기본 format: `compact`
  - compact hash encoding 기본: `hex`
- compact profile에는 다음만 남깁니다.
  - top-level metadata 일부
  - `positions: [[hashHex, ply, totalCount, moveIndex, count, priorScore, ...], ...]`
- source/diagnostics는 summary 위주로 축약해서 남깁니다.
- `renderGeneratedOpeningPriorModule()`는 compact일 때 minified JSON을 사용해 크기를 더 줄입니다.

### 3) `tools/evaluator-training/build-opening-prior-module.mjs`
- generated module builder가 기본적으로 compact runtime module을 만들도록 바꿨습니다.
- 새 옵션을 지원합니다.
  - `--format compact|expanded`
  - `--hash-encoding hex|decimal`
  - `--max-ply`
  - `--min-position-count`
  - `--min-move-count`
  - `--max-candidates-per-position`
- summary JSON에 다음을 기록합니다.
  - 입력 JSON bytes
  - output module bytes
  - size ratio
  - runtime profile summary

### 4) `tools/evaluator-training/train-opening-prior.mjs`
- 학습 JSON은 full profile 그대로 저장합니다.
- `--output-module`로 쓰는 generated module은 기본 compact format으로 생성합니다.
- module slimming을 위한 별도 옵션을 추가했습니다.
  - `--module-format`
  - `--module-hash-encoding`
  - `--module-max-ply`
  - `--module-min-position-count`
  - `--module-min-move-count`
  - `--module-max-candidates-per-position`

### 5) 실제 uploaded profile 설치
사용자가 업로드한 `trained-opening-prior-profile.json`으로 실제 앱용 module을 다시 생성했습니다.

- input JSON: `56,314,173 bytes`
- output module: `2,705,826 bytes`
- ratio: `4.80%`
- output file: `js/ai/opening-prior.generated.js`
- summary: `benchmarks/stage55_uploaded_opening_prior_compaction_summary.json`

이 module은 다음 metadata를 가집니다.
- name: `trained-opening-prior-stage53`
- positions: `40,192`
- candidate moves: `102,812`
- holdout coverage: `0.8501`
- holdout top1: `0.7232`
- holdout top3: `0.9637`

## 테스트
### 새 테스트
- `js/test/stage55_opening_prior_runtime_compaction_smoke.mjs`

검증 내용:
- synthetic WTHOR corpus로 full opening prior JSON 생성
- `build-opening-prior-module.mjs --format compact`
- `build-opening-prior-module.mjs --format expanded`
- compact module이 expanded module보다 작은지 확인
- compact module을 `lookupOpeningPrior()`로 실제 조회 가능 여부 확인
- summary JSON의 ratio 비교 확인

### 실행 결과
다음을 실행해 통과했습니다.

```bash
node js/test/core-smoke.mjs
node js/test/stage53_opening_prior_training_smoke.mjs
node js/test/stage54_opening_book_named_expansion_smoke.mjs
node js/test/stage55_opening_prior_runtime_compaction_smoke.mjs
```

## 설계 판단
### 왜 full JSON을 없애지 않았는가
full JSON은 여전히 필요합니다.

- 학습 결과를 사람이 점검할 수 있어야 하고,
- holdout / score field / per-move diagnostics를 다시 볼 수 있어야 하며,
- 나중에 다른 runtime threshold로 regenerated module을 다시 빌드할 수 있어야 하기 때문입니다.

즉:
- `trained-opening-prior-profile.json` = 학습/검수용 원본
- `opening-prior.generated.js` = 앱 배포용 런타임 산출물

으로 역할을 분리하는 편이 맞습니다.

### 왜 hex + flat array를 선택했는가
- decimal hash보다 hex hash가 짧습니다.
- move object 배열보다 flat numeric array가 훨씬 작습니다.
- 브라우저에서 필요한 값은 실제로 `moveIndex`, `count`, `priorScore`, `totalCount`, `ply` 정도입니다.
- `coord`, `rank`, `share` 같은 값은 런타임에서 쉽게 복원 가능합니다.

그래서 compact runtime module에서는 flat array가 가장 단순하면서도 이득이 컸습니다.

## 다음 단계 메모
이제 opening prior는 크기 측면에서 정적 웹 앱에 올릴 수 있는 수준까지 내려왔으므로,
다음 단계는 search-engine 결합입니다.

우선순위는 다음과 같습니다.
1. opening confidence gate
2. opening prior + direct book hybrid
3. opening randomness / search randomness 분리
4. low-count deep position은 weak root prior / move ordering bias로만 사용
