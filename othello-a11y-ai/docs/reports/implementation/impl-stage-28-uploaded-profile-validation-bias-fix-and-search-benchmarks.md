# Stage 28 — uploaded profile validation, side-to-move bias fix, and search benchmark tooling

## 목적
사용자가 실제 공개 데이터로 1회 본학습을 돌려 얻은 `trained-evaluation-profile.json` / `learned-eval-profile.generated.js`를 받아,

1. 구조와 반영 상태가 정상인지 검증하고,
2. 앱/엔진 회귀가 없는지 확인하고,
3. 실제 탐색에서 어떤 효과가 나는지 benchmark를 추가하고,
4. 문제점이 있으면 런타임이나 도구 쪽에서 바로 보정한다.

## 점검 결과 요약
### 1) 파일 구조 자체는 정상
업로드된 JSON profile과 generated module은 동일한 phase-bucket evaluator를 담고 있었고, source metadata도 기대한 형식이었다.

핵심 진단 수치:

- `seenSamples`: `25,514,097`
- `holdout`: `2,551,410`
- 전체 holdout MAE: 약 `18,663.85`
- 전체 holdout RMSE: 약 `24,390.47`
- stone 단위 holdout MAE: 약 `6.221`

즉, **학습 도구가 profile을 제대로 만들었는지** 자체는 “예”였다.

### 2) 그러나 그대로 앱에 꽂으면 zero-sum 회귀가 깨졌다
업로드 profile을 그대로 `js/ai/learned-eval-profile.generated.js`에 넣고 `node js/test/core-smoke.mjs`를 돌리면,

- late-game opposite-perspective evaluation zero-sum assertion 실패

가 발생했다.

원인은 learned profile의 bucket별 `bias`가 **일반 상수항**처럼 적용되고 있었기 때문이다.

하지만 이 profile은 학습 데이터가 사실상 **side-to-move perspective** 기준으로 들어오기 때문에,
`bias`는 상수항이라기보다 **side-to-move advantage term**으로 해석하는 쪽이 맞다.

따라서 런타임 evaluator에서 다음 방식으로 보정했다.

- `color === state.currentPlayer` 이면 `+bias`
- 반대 관점 평가면 `-bias`

이 보정 후:

- `node js/test/core-smoke.mjs` 통과
- `node js/test/perft.mjs` 통과

즉, **업로드 profile 자체를 버리지는 않고**, bias의 의미를 런타임에서 올바르게 해석하도록 수정했다.

## 구현 내용
### 1) learned bias를 signed side-to-move term으로 적용
수정 파일:

- `js/ai/evaluator.js`

변경 내용:

- `weights.bias`를 무조건 더하지 않고,
  `color === state.currentPlayer ? +weights.bias : -weights.bias`로 적용
- opposite perspective probe에서도 evaluator가 zero-sum을 유지하도록 보정

이 변경은 실제 search leaf에서 `state.currentPlayer` 관점 평가를 할 때는 기존 profile 예측값을 그대로 유지하고,
분석/회귀 테스트/양 관점 비교에서만 잘못된 비대칭을 없앤다.

### 2) SearchEngine에 외부 profile 주입 경로 정식 추가
수정 파일:

- `js/ai/search-engine.js`

변경 내용:

- `evaluationProfile`
- `moveOrderingProfile`

를 엔진 옵션으로 직접 주입할 수 있게 했다.

또한 transposition-table semantics 비교에도 profile 객체를 포함시켜,
profile이 바뀐 경우 기존 table 의미가 섞이지 않도록 했다.

이 변경 덕분에 **generated module을 갈아끼우지 않고도** benchmark 스크립트에서 baseline/candidate profile을 직접 비교할 수 있게 되었다.

### 3) search benchmark 도구 추가
새 파일:

- `tools/evaluator-training/benchmark-depth-search-profile.mjs`
- `tools/evaluator-training/benchmark-depth-search-profile.bat`
- `tools/evaluator-training/benchmark-exact-search-profile.mjs`
- `tools/evaluator-training/benchmark-exact-search-profile.bat`

용도:

- depth-limited search에서 profile 변경이 **노드 수 / 시간 / 수 변경**에 어떤 영향을 주는지 비교
- exact root search에서 profile 변경이 **정확 결과 일치 / exact root cost**에 어떤 영향을 주는지 비교

### 4) README 업데이트
수정 파일:

- `tools/evaluator-training/README.md`

추가 내용:

- holdout benchmark 외에 search benchmark 명령 예시 추가
- bias의 의미가 signed side-to-move term이라는 운영 주의사항 추가

## 실측 benchmark
### A. exact root benchmark
실행:

```bash
node tools/evaluator-training/benchmark-exact-search-profile.mjs \
  --candidate-profile tools/evaluator-training/out/trained-evaluation-profile.json \
  --output-json benchmarks/stage28_uploaded_profile_validation_and_exact_root_benchmark.json \
  --empties 10,12,14 \
  --seed-count 6 \
  --repetitions 1 \
  --time-limit-ms 60000 \
  --max-depth 12
```

결과 요약:

- `same score`: `18 / 18`
- `same best move`: `18 / 18`
- total nodes: `142,828 -> 142,828` (`100.0%`)
- total time: `5,112ms -> 5,053ms` (`98.8%`)

해석:

- exact root 구간에서는 현재 엔진이 별도 exact / ordering 경로를 많이 타기 때문에,
  **메인 evaluator learned profile 교체만으로는 exact node 수가 거의 바뀌지 않았다.**
- 즉, “본학습 evaluator를 넣었는데 exact 후반이 왜 거의 안 달라지지?”라는 현상은 정상이다.
  이 구간은 차후 **move-ordering profile 학습**이 더 직접적이다.

### B. depth-limited search benchmark
실행:

```bash
node tools/evaluator-training/benchmark-depth-search-profile.mjs \
  --candidate-profile tools/evaluator-training/out/trained-evaluation-profile.json \
  --output-json benchmarks/stage28_uploaded_profile_depth_search_benchmark.json \
  --empties 18,20,24 \
  --seed-count 8 \
  --repetitions 1 \
  --time-limit-ms 2000 \
  --max-depth 6 \
  --exact-endgame-empties 10
```

전체 요약:

- `same best move`: `14 / 24`
- total nodes: `119,367 -> 91,963` (`77.0%`)
- total time: `7,045ms -> 5,132ms` (`72.8%`)

empties별 경향:

- 24 empties: nodes `82.5%`, time `72~78%` 근방
- 20 empties: nodes `86.7%`, time `83.8%`
- 18 empties: nodes `63.5%`, time `63.6%`

해석:

- uploaded learned evaluator는 **depth-limited mid/late-midgame search 비용을 꽤 줄였다.**
- 다만 best move가 10/24 케이스에서 달라졌으므로, “더 빨라졌다 = 더 강해졌다”라고 바로 단정하면 안 된다.

### C. 로컬 exact alignment sanity check
추가로 작은 exact holdout 성격의 검사를 따로 만들었다.

파일:

- `benchmarks/stage28_local_exact_alignment_checks.json`

내용:

1. 10/12/14 empties의 seeded exact states에서 static evaluator score와 exact score의 차이 비교
2. 14 empties에서 depth-6 search best move가 exact best move와 일치하는지 비교

결과 요약:

- static exact-alignment MAE: baseline 대비 candidate가 약 `1.111x` 더 큼
- 14 empties exact best-move match: baseline `3 / 6`, candidate `2 / 6`

해석:

- 이번 1회차 learned profile은 **로컬 late exact 정렬 관점에서는 baseline보다 낫다고 보기 어렵다.**
- 따라서 이 profile은 “즉시 최종 채택본”이라기보다 **중반 탐색 가속이 확인된 1차 실험본**으로 보는 편이 맞다.

## 최종 판단
이번 업로드 가중치는 다음 기준으로 보면 성공/미완이 섞여 있다.

### 성공한 점
- 학습 도구가 실제 대용량 공개 데이터로 정상 동작했다.
- generated module 반영 형식이 맞았다.
- bias semantics를 바로잡자 앱 회귀 테스트를 통과했다.
- 중반~후반 초입의 depth-limited search에서는 노드 수와 시간을 유의미하게 줄였다.

### 아직 미완인 점
- local exact-alignment 기준으로는 baseline보다 확실히 좋아졌다고 보기 어렵다.
- exact root 후반 비용은 메인 evaluator 교체만으로 거의 변하지 않았다.
- 즉, 지금 profile만으로 “전 구간 엔진 강화 완료”라고 결론내리기는 이르다.

## 다음 단계 권장안
우선순위는 다음과 같다.

1. **move-ordering learned profile 분리 학습**
   - exact / near-exact 구간은 main evaluator보다 move ordering 쪽 영향이 더 직접적이다.
2. **late bucket 보정 전략 추가**
   - 예: late-a / late-b / endgame bucket만 별도 exact-aligned corpus로 재학습하거나,
     seed와 learned를 bucket별로 blend
3. **small pilot exact-holdout 자동 벤치마크를 학습 파이프라인에 연결**
   - 학습 후 “holdout MAE + local exact sanity”를 같이 보고 채택 여부를 결정하도록 자동화

## 검증 목록
- `node js/test/core-smoke.mjs`
- `node js/test/perft.mjs`
- `node tools/evaluator-training/benchmark-exact-search-profile.mjs ...`
- `node tools/evaluator-training/benchmark-depth-search-profile.mjs ...`
- local exact alignment check script (one-off) → `benchmarks/stage28_local_exact_alignment_checks.json`
