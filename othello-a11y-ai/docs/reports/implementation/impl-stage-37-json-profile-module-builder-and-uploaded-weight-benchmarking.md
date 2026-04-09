# Stage 37 — JSON 기반 generated module 재구성 및 업로드 가중치 검증

## 목표
- 큰 `learned-eval-profile.generated.js`를 직접 전달받지 않아도, 사용자가 첨부한 `trained-evaluation-profile.json` / `trained-move-ordering-profile.json`만으로 앱용 generated module을 다시 만들 수 있게 한다.
- 재구성된 generated module을 실제 런타임에 설치하고, 업로드된 evaluation profile / move-ordering profile을 검색·실전 대국 기준으로 검증한다.
- 최종 전달 패키지에는 설치된 generated module이 포함되도록 유지한다.

## 구현 내용
### 1. generated module 재구성 스크립트 추가
새 스크립트:
- `tools/evaluator-training/build-generated-profile-module.mjs`
- `tools/evaluator-training/build-generated-profile-module.bat`

주요 동작:
- evaluation JSON / move-ordering JSON을 읽는다.
- 런타임 프로필 형식으로 정규화한다.
  - evaluation bucket weight는 런타임 canonicalization 결과를 반영한다.
  - move-ordering bucket은 런타임 fallback / key 정규화 규칙을 반영한다.
- `js/ai/learned-eval-profile.generated.js`를 다시 생성한다.
- 필요하면 summary JSON을 같이 쓴다.

### 2. generated module write 경로 정규화 강화
`tools/evaluator-training/lib.mjs`에 다음 정규화 계층을 추가했다.
- `sanitizeEvaluationProfileForModule(profile)`
- `sanitizeMoveOrderingProfileForModule(profile)`

이제 generated module write는 raw JSON을 그대로 덤프하지 않고, 런타임이 실제로 해석하는 bucket/weight 구조를 먼저 정규화해서 저장한다.

효과:
- feature 누락이 있어도 fallback이 일관되다.
- parity alias folding 같은 canonicalization 결과가 generated module과 런타임에서 어긋나지 않는다.
- 업로드 JSON의 metadata(`source`, `diagnostics`)는 유지된다.

### 3. 스모크 테스트 추가
새 테스트:
- `js/test/stage37_generated_module_builder_smoke.mjs`

검증 내용:
- 임시 evaluation JSON / move-ordering JSON 생성
- 새 builder 스크립트 실행
- 생성된 module import
- profile name, summary JSON, output size 검증

### 4. 문서 / 패키지 프로필 갱신
- `tools/evaluator-training/README.md`에 “attached JSON 두 개로 generated module 다시 만들기” 섹션 추가
- trainer 패키지 프로필에 `js/test/stage37_generated_module_builder_smoke.mjs` 포함
- stage36 package smoke에서 새 테스트 파일 포함 여부도 같이 확인

## 업로드 가중치 설치 결과
설치 입력:
- `/mnt/data/trained-evaluation-profile.json`
- `/mnt/data/trained-move-ordering-profile.json`

설치 결과:
- output module: `js/ai/learned-eval-profile.generated.js`
- module size: `36,244 bytes`
- evaluation profile: `trained-phase-linear-v1`
- move-ordering profile: `trained-move-ordering-linear-v1`

주의:
- 이번에 실제 설치에 사용된 move-ordering JSON은 파일 내용상 `trained-move-ordering-linear-v1`로 식별되었다.
- 즉, 업로드 파일명은 같더라도, 런타임에 반영된 프로필 이름은 v2가 아니라 v1이다.

## 검증 결과
### 1. 기본 테스트
- `node js/test/core-smoke.mjs` 통과
- `node js/test/perft.mjs` 통과
- `node js/test/stage30_trineutron_adapter_smoke.mjs` 통과
- `node js/test/stage37_generated_module_builder_smoke.mjs` 통과
- `node js/test/stage36_package_profile_smoke.mjs` 통과

### 2. move-ordering 단독 효과 (phase-only 대비)
#### exact search benchmark
- file: `benchmarks/stage37_uploaded_move_ordering_exact_profile_benchmark.json`
- 조건: empties `10,12,14`, 12 cases
- same score: `12/12`
- same best move: `10/12`
- nodes: `104,699 -> 96,817` (`-7.53%`)
- time: `5,866ms -> 5,367ms` (`-8.50%`)

해석:
- exact / near-exact 구간에서는 late move-ordering이 여전히 유효한 pruning 이득을 보였다.
- 단, 일부 root에서는 ordering이 바뀌었다.

#### depth-limited benchmark
- file: `benchmarks/stage37_uploaded_move_ordering_depth_profile_benchmark.json`
- 조건: empties `14,16,18`, 24 cases
- same best move: `24/24`
- nodes: `70,640 -> 69,721` (`-1.30%`)
- time: `7,574ms -> 7,418ms` (`-2.06%`)

해석:
- depth-limited 중후반에서는 ordering 추가 이득이 작았다.
- 즉, 이번 move-ordering profile은 “고정 late exact 성능 개선 쪽이 더 뚜렷하고, 실전 전체 성적 개선 폭은 작을 수 있다”는 기존 경향을 유지했다.

### 3. evaluation profile 효과 (legacy 대비)
#### depth-limited benchmark
- file: `benchmarks/stage37_uploaded_evaluation_depth_vs_legacy_benchmark.json`
- 조건: empties `18,20,24`, 24 cases
- same best move: `14/24`
- nodes: `119,367 -> 91,963` (`-22.96%`)
- time: `11,581ms -> 8,473ms` (`-26.84%`)

해석:
- 새 evaluation profile은 legacy 대비 탐색량과 시간에서 분명한 개선을 보였다.
- best move 변화도 꽤 있었으므로, evaluator 자체가 실제 의사결정에도 영향을 주고 있다.

### 4. trineutron 실전 대국 (solver adjudication)
aggregate file:
- `benchmarks/stage37_vs_trineutron_aggregate_seed11_21_31_2x80ms.json`

구성:
- seeds: `11`, `21`, `31`
- 각 seed당 `2 openings`
- 총 `12 games / variant`
- opening plies `20`
- `empties <= 14`부터는 우리 exact solver로 승패 판정

결과:
- `active` (installed eval + installed ordering)
  - `8/12 = 66.7%`
  - avg disc diff `+7.17`
- `phase-only` (installed eval, no learned move-ordering)
  - `8/12 = 66.7%`
  - avg disc diff `+8.83`
- `legacy`
  - `7.5/12 = 62.5%`
  - avg disc diff `-0.83`

해석:
- 새 evaluation profile은 legacy보다 실전 기준으로도 우세하다.
- 이번 소표본에서는 active와 phase-only의 승점 차는 나지 않았다.
- 평균 disc diff는 phase-only가 active보다 약간 높게 나와, move-ordering profile은 “검색 비용 개선용” 가치는 있지만 “실전 성적 개선”은 아직 추가 표본 확인이 필요하다.
- 모든 대국은 solver adjudication으로 종료되어, 종반에서 trineutron의 노이즈는 제거되었다.

## 결론
1. **사용성 측면**
   - 이제 JSON 두 개만 있으면 generated module을 안정적으로 다시 만들 수 있다.
   - 사용자가 큰 `learned-eval-profile.generated.js`를 직접 첨부할 필요가 없다.

2. **evaluation profile**
   - 이번 업로드 evaluation profile은 legacy 대비 채택 가치가 높다.
   - 검색량/시간, 실전 대국 모두에서 개선 신호가 있다.

3. **move-ordering profile**
   - exact / near-exact late benchmark에서는 분명한 이득이 있다.
   - 하지만 현재 표본에서는 phase-only 대비 실전 승점 개선이 확인되지는 않았다.
   - 따라서 채택은 가능하지만, “late exact search optimization” 성격으로 이해하는 것이 정확하다.

4. **다음 우선순위**
   - 이 설치본을 기준으로 MPC calibration을 돌려 shallow/deep residual 통계를 본다.
   - move-ordering은 accepted roots 확대 또는 feature 재선별로 추가 재학습 후보를 유지한다.
