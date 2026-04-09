# Stage 34 — cwd-independent training tool path resolution

## 배경
사용자 점검 결과, 학습 도구의 기본 출력 경로와 batch 래퍼가 `tools/evaluator-training/...`, `js/ai/...`, `benchmarks/...` 같은 문자열을 현재 작업 폴더(`cwd`) 기준으로 그대로 해석하고 있었다.

이 구조에서는 저장소 루트에서 실행할 때만 가장 안전했고, 다른 폴더에서 실행하면 다음 문제가 생길 수 있었다.

- `node tools/evaluator-training/...` 를 감싼 batch 래퍼가 스크립트를 찾지 못함
- 기본 출력 JSON / generated module / benchmark JSON 이 엉뚱한 폴더에 생성되거나 실패함
- `tools/evaluator-training/out/...` 같은 repo-relative 인자를 다른 cwd 에서 넘기면 입력/출력을 찾지 못함

## 점검 결과
문제의 핵심은 두 가지였다.

1. **ESM import 경로**
   - `../../js/ai/...` 같은 `import` 문은 Node ESM 기준으로 **모듈 파일 위치 기준**으로 해석된다.
   - 즉, 이 부분은 원래부터 cwd 영향이 없었고 수정 대상이 아니었다.

2. **CLI / batch 경로 해석**
   - 실제 문제는 `path.resolve('tools/...')`, `path.resolve('js/...')`, `node tools/evaluator-training/...` 같은 코드였다.
   - 이 부분은 cwd 에 따라 의미가 바뀌므로, 여기만 고치면 된다.

## 구현 내용
### 1) JS 공통 경로 계층 추가 (`tools/evaluator-training/lib.mjs`)
다음 helper 를 추가했다.

- `PROJECT_ROOT_DIR`
- `EVALUATOR_TRAINING_DIR`
- `resolveProjectPath(...)`
- `resolveTrainingToolPath(...)`
- `resolveTrainingOutputPath(...)`
- `resolveGeneratedProfilesModulePath()`
- `resolveCliPath(value)`
- `displayProjectPath(...)`
- `displayTrainingToolPath(...)`
- `displayTrainingOutputPath(...)`
- `displayGeneratedProfilesModulePath()`

### 2) repo-relative / cwd-relative 규칙 분리
`resolveCliPath(value)` 는 다음 규칙을 사용한다.

- 절대 경로면 그대로 사용
- `tools/evaluator-training/...`, `js/ai/...`, `benchmarks/...`, `docs/...`, `tests/...`, `third_party/...` 처럼 **repo 루트 하위 경로**처럼 보이면 저장소 루트 기준으로 해석
- `./...`, `../...` 로 시작하면 **현재 작업 폴더 기준**으로 해석
- 그 외 일반 상대 경로도 기존처럼 cwd 기준으로 해석

즉, 기존 README / batch / CLI 에서 많이 쓰던 repo-relative 인자 형식을 다른 폴더에서 실행해도 그대로 유지할 수 있게 했다.

### 3) 학습 도구 mjs 전반 적용
다음 스크립트에 경로 helper 를 적용했다.

- `train-phase-linear.mjs`
- `train-move-ordering-profile.mjs`
- `export-profile-module.mjs`
- `benchmark-profile.mjs`
- `benchmark-depth-search-profile.mjs`
- `benchmark-exact-search-profile.mjs`
- `audit-evaluation-profile.mjs`
- `audit-move-ordering-profile.mjs`
- `estimate-training-time.mjs`
- `generate-synthetic-corpus.mjs`
- `sample-corpus.mjs`

적용 범위:

- 기본 output JSON 경로
- 기본 generated module 경로
- benchmark output 경로
- 입력/출력 JSON 로딩 경로
- usage/help 에 출력되는 예시 경로

### 4) batch 공통 helper 추가
`tools/evaluator-training/_path-context.bat` 를 추가했다.

이 helper 는 batch 자신의 위치에서 다음 경로를 계산한다.

- `EVALUATOR_TRAINING_DIR`
- `OTHELLO_REPO_ROOT`
- `EVALUATOR_TRAINING_OUT`
- `EVALUATOR_GENERATED_MODULE`
- `OTHELLO_BENCHMARK_DIR`

이후 모든 batch 래퍼가 이 helper 를 `call` 하여, 현재 작업 폴더와 무관하게 자기 위치 기준으로 Node 스크립트와 기본 출력 경로를 잡도록 바꿨다.

### 5) README 보강
README 상단에 다음 내용을 추가했다.

- 이제 repo-relative 인자는 프로젝트 루트 기준으로 자동 해석됨
- `./...`, `../...` 는 여전히 cwd 기준임
- 직접 `node` 로 `.mjs` 를 실행할 때는 **스크립트 파일 경로 자체**는 현재 위치에서 접근 가능한 경로를 써야 하고, Windows 에서는 batch 래퍼가 이 부분까지 처리함

## 검증
### 엔진 회귀 검증
- `node js/test/core-smoke.mjs` 통과
- `node js/test/perft.mjs` 통과
- `node js/test/stage30_trineutron_adapter_smoke.mjs` 통과

### 새 경로 계층 검증
`node js/test/stage34_training_tool_path_context_smoke.mjs` 를 추가하고, 저장소 바깥 임시 cwd 에서 다음 시나리오를 검증했다.

1. `generate-synthetic-corpus.mjs` 를 **기본 output 경로 생략** 상태로 실행
   - 결과가 repo 의 `tools/evaluator-training/out/synthetic.jsonl` 에 생성되는지 확인
2. `sample-corpus.mjs` 에 `tools/evaluator-training/out/...` 입력/출력 인자를 넘겨 실행
   - repo-relative 인자가 외부 cwd 에서도 올바르게 해석되는지 확인
3. `train-phase-linear.mjs` 를 repo-relative input/output 인자로 실행
4. `export-profile-module.mjs` 로 `js/ai/...` repo-relative output 경로에 generated module 생성 확인
5. `benchmark-depth-search-profile.mjs` 로 `benchmarks/...` repo-relative output 경로에 결과 JSON 생성 확인

모든 검증이 통과했다.

## 사용자 첨부 move-ordering JSON
사용자가 이번 턴에서 첨부한 `trained-move-ordering-profile.json` 은 “오류인 것 같으므로 무시”라고 명시했으므로, 이번 단계에서는 검증/반영 대상으로 사용하지 않았다.

## 결론
이번 stage 에서 학습 파이프라인의 경로 해석 문제는 구조적으로 정리되었다.

- batch 래퍼는 cwd-independent
- mjs 스크립트는 repo-relative 인자를 cwd-independent 하게 해석
- README 와 help 출력도 현재 위치 기준 경로를 보여주도록 개선
- 기존 엔진 동작 회귀는 없고, 외부 cwd 에서의 실제 학습/export/benchmark 스모크도 통과
