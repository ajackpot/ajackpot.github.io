# Stage 31 — 업로드된 move-ordering 가중치 검증 및 trineutron solver-cutoff 실전 벤치마크

## 목표

1. 사용자가 업로드한 `trained-move-ordering-profile.json`을 현재 앱에 안전하게 병합한다.
2. move-ordering 학습 결과가 late search 비용을 실제로 줄이는지 고정 국면 benchmark로 확인한다.
3. `trineutron/othello` 대국 benchmark를 종반 solver adjudication 방식으로 바꾸어, 종반 실수/노이즈를 줄인 실전 비교를 수행한다.

## 반영 내용

### 1) uploaded evaluator + move-ordering 병합

- `tools/evaluator-training/out/trained-evaluation-profile.json`
- `tools/evaluator-training/out/trained-move-ordering-profile.json`

을 기준으로 `tools/evaluator-training/export-profile-module.mjs`를 사용해
`js/ai/learned-eval-profile.generated.js`를 다시 생성했다.

이제 generated module에는 다음 두 slot이 모두 포함된다.

- `GENERATED_EVALUATION_PROFILE`
- `GENERATED_MOVE_ORDERING_PROFILE`

### 2) trineutron match harness 개선

`tools/engine-match/benchmark-vs-trineutron.mjs`를 다음 방식으로 확장했다.

- `phase-only` variant 추가
  - learned evaluator는 유지
  - learned move-ordering만 끈 비교군
- `solver-adjudication-empties` 도입
  - 빈칸 수가 임계값 이하가 되면 trineutron을 더 두지 않음
  - 우리 exact solver를 1회 호출해 승패와 disc diff를 판정
- `solver-adjudication-time-ms` 도입
- 게임 종료 방식을 `played-out` / `exact-adjudication`으로 기록
- exact adjudication에 사용된 노드 수와 시간도 집계

### 3) Windows 실행 래퍼 / 문서 갱신

- `tools/engine-match/benchmark-vs-trineutron.bat`
- `tools/engine-match/README.md`

기본값을 solver adjudication 방식에 맞게 업데이트했다.

## 검증

다음 회귀 테스트를 통과했다.

- `node js/test/core-smoke.mjs`
- `node js/test/perft.mjs`
- `node js/test/stage30_trineutron_adapter_smoke.mjs`

## 업로드된 프로필 점검 요약

### evaluator

- profile: `trained-phase-linear-v1`
- seen samples: `25,514,097`
- holdout count: `2,551,410`
- holdout MAE: `6.2213 stones`

### move-ordering

- profile: `trained-move-ordering-linear-v1`
- accepted roots: `2,500`
- holdout roots: `250`
- holdout top-1 accuracy: `0.496`
- holdout top-3 accuracy: `0.852`
- holdout mean regret: `1.2663 discs`

이 수치만 보면 move-ordering profile은 “late root teacher 근사체”로는 usable 하지만,
여전히 sample 수가 아주 큰 편은 아니므로 실전 대국 benchmark를 반드시 같이 봐야 한다.

## 고정 국면 benchmark 결과

### A. exact late benchmark (move-ordering only)

파일:
`benchmarks/stage31_uploaded_move_ordering_exact_profile_benchmark.json`

설정:

- baseline: learned evaluator + default late ordering
- candidate: learned evaluator + uploaded learned move-ordering
- empties: `10, 12, 14`
- seeds: `1..4`
- repetitions: `2`

결과:

- exact cases: `12 / 12`
- identical score: `12 / 12`
- identical best move: `10 / 12`
- nodes: `104,699 -> 96,817` (`-7.53%`)
- time: `3,738ms -> 3,339ms` (`-10.67%`)

해석:

- uploaded move-ordering profile은 **고정 late exact 국면**에서는 분명히 도움이 된다.
- 즉, “late exact root ordering 개선” 자체는 어느 정도 성공했다.

### B. depth-limited benchmark (move-ordering only)

파일:
`benchmarks/stage31_uploaded_move_ordering_depth_profile_benchmark.json`

설정:

- baseline: learned evaluator + default late ordering
- candidate: learned evaluator + uploaded learned move-ordering
- empties: `18, 20, 24`
- seeds: `1..6`
- depth: `6`

결과:

- identical best move: `18 / 18`
- nodes: `76,416 -> 76,409` (`-0.009%`)
- time: `4,325ms -> 4,274ms` (`-1.18%`)

해석:

- `18~24 empties` 범위에서는 효과가 거의 없다.
- 현재 profile은 **중반 ordering**이 아니라 **late exact / near-exact ordering**에 주로 기여하는 형태로 보인다.

## trineutron solver-cutoff 실전 benchmark 결과

배치 파일:

- `benchmarks/stage31_vs_trineutron_solver_adjudication_2openings_80ms.json`
- `benchmarks/stage31_vs_trineutron_solver_adjudication_2openings_80ms_seed21.json`
- `benchmarks/stage31_vs_trineutron_solver_adjudication_2openings_80ms_seed31.json`
- aggregate: `benchmarks/stage31_vs_trineutron_solver_adjudication_aggregate_seed11_21_31_80ms.json`

공통 설정:

- variants: `active`, `phase-only`, `legacy`
- openings: seed `11..12`, `21..22`, `31..32` (총 `6 openings`)
- paired games: `12 games / variant`
- opening-plies: `20`
- our-time-ms: `80`
- their-time-ms: `80`
- solver-adjudication-empties: `14`
- solver-adjudication-time-ms: `60000`

aggregate 결과:

### active = learned evaluator + learned move-ordering

- score: `6.5 / 12` (`54.17%`)
- W-L-D: `6-5-1`
- average disc diff: `+0.75`
- average our nodes / game: `34,354`
- average exact-adjudication nodes: `13,135`

### phase-only = learned evaluator + default move-ordering

- score: `7 / 12` (`58.33%`)
- W-L-D: `7-5-0`
- average disc diff: `+3.83`
- average our nodes / game: `32,011`
- average exact-adjudication nodes: `9,618`

### legacy = hand-tuned seed evaluator

- score: `6 / 12` (`50.00%`)
- W-L-D: `6-6-0`
- average disc diff: `-4.42`
- average our nodes / game: `33,871`
- average exact-adjudication nodes: `12,523`

## 결론

### 확정된 것

- uploaded move-ordering profile은 **late exact benchmark**에서는 이득이 있다.
- solver adjudication 방식은 의도대로 동작했고, 모든 대국이 `empties <= 14`에서 exact solver 한 번으로 종료 판정되었다.
- learned evaluator 자체는 여전히 legacy보다 좋은 실전 지표를 보인다.

### 아직 확정 못 한 것

- **learned move-ordering을 기본 채택본으로 볼지**는 아직 애매하다.
- 고정 late exact benchmark는 좋아졌지만,
  이번 trineutron 실전 aggregate에서는 `phase-only`가 `active`보다 score rate와 average disc diff에서 약간 더 좋았다.
- 즉, 이번 move-ordering weight는 **도입 후보**로는 의미가 있지만,
  **무조건 최종 채택본**이라고 하기에는 아직 증거가 부족하다.

## 권장 후속 작업

1. move-ordering root sample 수 확대
   - 현재 accepted roots `2,500`은 usable 하지만 작다.
   - 최소 `10k+` 정도로 늘려 late bucket 안정성을 다시 확인하는 편이 좋다.
2. `child-13-14`와 `child-15-18`를 분리해 재학습
   - 현재 profile은 `10~14` empties 개선은 보이지만,
     실제 match 전체에서는 `15~18` 영역의 line 선택이 아직 흔들릴 가능성이 있다.
3. trineutron suite를 12 openings 이상으로 확대
   - 지금 aggregate `12 games / variant`는 방향성 확인용으로는 충분하지만,
     채택 결정을 내리기엔 아직 작다.
4. 향후 MPC 도입 시
   - uploaded evaluator의 bucket residual 통계를 기반으로 sigma 추정치를 붙이면,
     exact boundary 직전 selective search를 더 체계적으로 다룰 수 있다.
