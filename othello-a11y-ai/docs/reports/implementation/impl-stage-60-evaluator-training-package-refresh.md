# Stage 60 — evaluator training package refresh

## 이번 단계의 목표

- phase-linear + tuple residual 중심의 **현재 권장 학습 lane**을 다시 정리한다.
- learned-eval generated module을 **compact runtime format**으로 다시 쓸 수 있게 만든다.
- tuple layout family 비교를 위한 파일럿 스크립트와 크기 추정 스크립트를 추가한다.
- 전달용 `trainer` 패키지에서 legacy 실험 도구를 덜어낸다.

## 반영 내용

### 1. compact learned-eval module export

다음 도구가 compact export를 기본으로 지원한다.

- `build-generated-profile-module.mjs`
- `export-profile-module.mjs`
- `install-tuple-residual-profile.mjs`
- `train-phase-linear.mjs`
- `train-tuple-residual-profile.mjs`

compact export에서는 runtime에 불필요한 긴 메타데이터를 줄이고, built-in tuple layout은 full layout object 대신 `layoutName`만 남긴다.

### 2. tuple layout family 확장

`js/ai/evaluation-profiles.js`에 다음 built-in layout을 추가했다.

- `diagonal-adjacent-pairs-full-v1`
- `straight-adjacent-pairs-full-v1`

기존 layout 포함 전체 목록은 아래와 같다.

- `orthogonal-adjacent-pairs-outer2-v1`
- `orthogonal-adjacent-pairs-full-v1`
- `diagonal-adjacent-pairs-full-v1`
- `straight-adjacent-pairs-full-v1`

### 3. 새 보조 도구

- `estimate-tuple-layout-candidate-sizes.mjs`
  - built-in layout family별 compact generated module 예상 크기 비교
- `run-tuple-layout-family-pilot.mjs`
  - 여러 layout family를 순서대로 train → calibrate → module export까지 실행

### 4. 문서 재정비

- `tools/evaluator-training/README.md`
- `tools/evaluator-training/TOOL_INDEX.md`
- `tools/evaluator-training/LEGACY_TOOLS.md`
- `tools/package/README.md`

현재 패키지는 “지금 바로 corpus로 학습 가능한가”와 “생성된 JSON을 바로 전달 가능한가”를 기준으로 정리했다.

### 5. 전달용 trainer 패키지 정리

`tools/package/lib.mjs`의 `trainer` profile을 정리해 다음만 우선 담도록 조정했다.

- phase evaluator 학습/검증
- tuple residual 학습/검증/비교
- compact runtime module export
- tuple layout family pilot / size estimate
- opening prior 핵심 도구
- package / engine-match / 핵심 smoke tests

반대로 현재 기본 lane 밖의 late move-ordering 재학습 계열과 stage 특정 실험 도구는 trainer 패키지에서 제외한다.

## 측정 결과

### compact learned-eval module

요약 JSON: `benchmarks/stage60_generated_profile_module_compaction_summary.json`

- before: `139,726 bytes`
- after: `12,032 bytes`
- ratio: `0.0861`

### tuple layout family 구조적 크기 추정

요약 JSON: `benchmarks/stage60_tuple_layout_candidate_size_summary.json`

- baseline (eval + move-ordering only): `6,235 bytes`
- outer2: `16,442 bytes`
- orthogonal full: `26,056 bytes`
- diagonal full: `23,655 bytes`
- straight full: `42,902 bytes`

## 검증

실행한 스모크 테스트:

- `node js/test/stage60_tuple_layout_library_smoke.mjs`
- `node js/test/stage60_generated_profile_runtime_compaction_smoke.mjs`
- `node js/test/stage37_generated_module_builder_smoke.mjs`
- `node js/test/stage45_generated_module_builder_mpc_slot_smoke.mjs`
- `node js/test/stage36_package_profile_smoke.mjs`
- `node js/test/core-smoke.mjs`

모두 통과했다.
