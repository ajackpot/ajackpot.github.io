# Stage 63 training pipeline hardening

## 핵심 변경점

- `tools/evaluator-training/run-multi-candidate-training-suite.mjs`
  - 여러 후보를 한 번의 실행으로 순차 학습
  - shared phase evaluator / active snapshot 재사용
  - candidate별 status JSON 기록
  - `--resume`, `--plan-only`, `--continue-on-error` 지원
  - profile / depth / exact benchmark를 후보별로 선택 실행 가능
- `tools/evaluator-training/run-multi-candidate-training-suite.bat`
  - Windows용 배치 엔트리포인트 추가
- `tools/evaluator-training/examples/`
  - train-only / train-plus-bench 예제 config 추가
- `tools/evaluator-training/README.md`
  - 새 표준 엔트리포인트를 suite 기준으로 재정리
- `tools/evaluator-training/TOOL_INDEX.md`
  - 추천 엔트리포인트와 예제 config 반영
- `tools/package/lib.mjs`
  - trainer 패키지에 새 suite 도구, 예제 config, smoke test 포함
- `js/test/stage63_multi_candidate_training_suite_smoke.mjs`
  - tiny corpus 기준 end-to-end + resume 검증 추가
- `stage-info.json`
  - Stage 63 메타데이터로 갱신

## 추천 사용법

가장 간단한 실행:

```bat
tools/evaluator-training/run-multi-candidate-training-suite.bat D:/othello-data/Egaroucid_Train_Data
```

benchmark까지 포함한 예제 config로 실행:

```bat
tools/evaluator-training/run-multi-candidate-training-suite.bat ^
  D:/othello-data/Egaroucid_Train_Data ^
  tools/evaluator-training/out/stage63-suite ^
  --config tools/evaluator-training/examples/multi-candidate-suite.train-plus-bench.example.json ^
  --resume
```

## 검증 결과

다음 테스트를 통과했습니다.

- `js/test/core-smoke.mjs`
- `js/test/stage36_package_profile_smoke.mjs`
- `js/test/stage37_generated_module_builder_smoke.mjs`
- `js/test/stage45_generated_module_builder_mpc_slot_smoke.mjs`
- `js/test/stage60_generated_profile_runtime_compaction_smoke.mjs`
- `js/test/stage60_tuple_layout_library_smoke.mjs`
- `js/test/stage63_multi_candidate_training_suite_smoke.mjs`

Stage63 smoke는 tiny corpus를 직접 생성해 다음을 확인했습니다.

- shared phase evaluator 학습
- 2개 candidate(`outer2`, `diagonal`) 순차 학습
- calibration
- generated module export
- profile benchmark
- `--resume` 재실행 시 동일 signature step skip

## 패키지

현재 패키지 분석 요약:

- 전체 저장소: 625 files, 43771055 bytes
- runtime 패키지: 25 files, 3055655 bytes source
- trainer 패키지: 98 files, 3653420 bytes source

실제 zip 출력은 `dist/` 아래에 다시 생성했습니다.

## 전달 권장물

학습을 맡기는 쪽에는 다음 세 가지면 충분합니다.

- trainer 패키지 zip
- 이 보고서
- example config JSON 2종

대규모 학습 뒤에는 다시 아래 두 파일을 우선 전달받으면 됩니다.

- `trained-evaluation-profile.json`
- `trained-tuple-residual-profile.calibrated.json`
