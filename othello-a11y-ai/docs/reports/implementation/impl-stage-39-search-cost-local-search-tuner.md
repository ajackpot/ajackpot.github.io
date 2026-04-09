# Stage 39 — move-ordering search-cost local-search tuner

## 요약
이번 단계에서는 Stage 38의 수동 candidate screening 흐름을 실제 코드로 일반화했다.

핵심 추가물은 다음 두 가지다.

1. `tools/evaluator-training/tune-move-ordering-search-cost.mjs`
   - 현재 move-ordering profile에서 feature scale / bucket fallback 후보를 자동 생성한다.
   - 같은 root 세트에서 실제 search cost(nodes/time)와 root output agreement를 함께 비교한다.
   - 안전 조건(exact score / exact best move / depth best move mismatch 허용치)을 만족하는 후보만 round별로 채택한다.

2. `tools/evaluator-training/make-move-ordering-variant.mjs` 확장
   - 기존 scale-spec 외에 `--drop-range 13-14` 같은 문법을 지원한다.
   - 즉, 특정 trained bucket을 제거해서 runtime fallback ordering으로 되돌리는 variant를 CLI만으로 만들 수 있다.

이 단계의 목적은 **문서 설계에서 멈추지 않고**, Stage 38에서 반복된 수동 미세조정을 실제 tooling으로 옮기는 것이다.

## 배경
Stage 38에서는 다음 사실이 확인되었다.

- value 회귀 기반 move-ordering trainer는 search cost를 직접 최적화하지 않는다.
- 그래서 새 장시간 재학습보다, 먼저 search-cost audit와 소규모 candidate screening이 더 중요했다.
- 하지만 candidateA / B / C의 탐색은 사람이 직접 가설을 세우고 JSON을 바꾸고 벤치를 다시 돌리는 식으로 진행되었다.

이 방식은 다음 한계가 있었다.

- feature 하나씩 후보를 만들 때 반복 작업이 많다.
- fallback candidate(예: bucket 제거)는 CLI 한 번으로 만들 수 없었다.
- 결과를 nodes만 볼지, exact score / best move agreement까지 같이 볼지 매번 사람이 따로 해석해야 했다.

따라서 이번 단계에서는 **작은 search-cost local search**를 자동화하는 도구를 추가했다.

## 코드 변경 사항
### 1. `tune-move-ordering-search-cost.mjs`
새 도구는 다음 입력을 받는다.

- base move-ordering profile
- evaluation profile
- feature 목록 (`mobility`, `cornerAdjacency`, `edgePattern`, `cornerPattern`, `discDifferential` 등)
- feature scale 후보 (`0`, `0.5`, `0.75` 등)
- scale을 적용할 empties range 목록
- fallback 후보를 허용할 empties range 목록
- depth / exact benchmark root set
- output safety threshold

동작 흐름은 다음과 같다.

1. 현재 profile에서 single-action candidate를 자동 생성
   - `feature@range=xscale`
   - `fallback@range`
2. 동일 root set에서 실제 검색 실행
3. nodes / time과 output agreement를 함께 기록
4. 안전 조건을 만족하면서 weighted nodes가 줄어드는 최적 single action을 선택
5. `max-rounds`까지 반복 가능

기본 정렬 우선순위는 다음 순서다.

1. acceptable 여부
2. exact score mismatch 수
3. exact best move mismatch 수
4. depth best move mismatch 수
5. weighted nodes
6. exact nodes
7. depth nodes

즉, 단순히 nodes만 적은 후보를 뽑는 것이 아니라 **출력 안정성을 우선한 보수적 local search**다.

### 2. `make-move-ordering-variant.mjs` 확장
이전에는 scale-spec만 지원했다.

이번 단계부터는:

- `--scale-spec mobility@10-12=0.5`
- `--drop-range 13-14`

를 함께 줄 수 있다.

`drop-range`와 겹치는 trained bucket은 JSON에서 제거되고, 해당 empties 범위는 런타임에서 fallback ordering을 사용한다.

진단 메타데이터에도 다음이 함께 기록된다.

- `removedBucketCount`
- `removedBuckets`
- `source.tuning.dropRanges`

### 3. stage39 smoke test 추가
새 smoke:
- `js/test/stage39_move_ordering_local_search_smoke.mjs`

이 테스트는 다음을 검증한다.

1. `make-move-ordering-variant.mjs --drop-range`가 정상 동작하는지
2. `tune-move-ordering-search-cost.mjs`가 작은 root set에서 후보를 실제로 생성/평가하는지
3. summary JSON과 best-profile JSON이 정상 생성되는지

## 실제 pilot 결과
이번 단계에서 새 tuner를 현재 active profile `stage38-candidateC-disc0-10-12`에 바로 적용해 작은 pilot을 돌렸다.

### Pilot A — 남은 15-18 bucket screen
설정:
- features: `mobility, cornerAdjacency, edgePattern, cornerPattern, discDifferential`
- ranges: `15-16, 17-18`
- fallback ranges: `15-16, 17-18`
- depth roots: `18, 16`
- exact roots: `13, 11`
- seeds: `1`

결과:
- 안전 조건을 만족하는 후보는 많았지만, **nodes가 줄어드는 후보는 없었다.**
- 즉, 현재 active profile 기준으로 남아 있는 `15-18` trained bucket은 이 작은 root set에서는 더 만질 만한 신호가 거의 없었다.

### Pilot B — exact-side 10-12 bucket small screen
설정:
- features: `corners, cornerAdjacency, parity`
- ranges: `10-10, 11-12`
- fallback ranges: `10-10, 11-12`
- depth roots: `15`
- exact roots: `13, 11`
- seeds: `1`

결과:
- `fallback@10-10`이 선택되었다.
- weighted nodes: `16,893 -> 16,563` (`-1.95%`)
- exact score mismatch: `0`
- exact best move mismatch: `0`
- depth best move mismatch: `0`

즉, 현재 active `candidateC`에서도 **child empties 10 bucket은 trained bucket보다 runtime fallback ordering이 더 낫다**는 작은 신호가 새 local-search tooling으로 다시 포착되었다.

## follow-up validation
pilot에서 뽑힌 후보:
- `stage38-candidateC-disc0-10-12__local-search-r1-fallback-10-10`

이 후보를 active `candidateC`와 비교해서 작은 추가 검증을 수행했다.

### Exact validation (`empties 14,13,12,11`, seeds `1..4`)
- same score: `16/16`
- same best move: `16/16`
- nodes: `129,826 -> 128,927` (`-0.69%`)
- time: `4,423ms -> 4,244ms` (`-4.05%`)

empties별로 보면:
- `14`: `-0.17%`
- `13`: `+0.23%`
- `12`: `-2.80%`
- `11`: `-11.07%`

즉, `13`에서 아주 작은 giveback이 있지만 `11`과 `12`에서 더 크게 줄어 overall exact nodes는 감소했다.

### Depth validation (`empties 16,15`, seeds `1..4`)
- same best move: `8/8`
- nodes: `20,640 -> 20,616` (`-0.12%`)
- time: `1,443ms -> 1,388ms` (`-3.81%`)

깊이 제한 bench에서도 나빠지지 않았고, 오히려 아주 소폭 개선됐다.

## 이번 단계의 결론
1. Stage 38의 수동 search-cost candidate workflow를 **실제 도구로 일반화하는 코딩 단계**는 완료되었다.
2. 새 tuner는 현재 active `candidateC`에서도 다시 후보를 찾아낼 수 있었고, 그 결과 `fallback@10-10`이라는 작은 follow-up candidate를 만들었다.
3. 이 `candidateD`는 작은 추가 검증에서 active 대비:
   - exact `-0.69%`
   - depth `-0.12%`
   - output agreement exact `16/16`, depth `8/8`
   를 기록했다.
4. 아직은 seed 수와 root 세트가 기존 adoption 단계보다 작으므로, **즉시 active 교체까지는 하지 않고 wider validation 후보로 유지**하는 것이 보수적이다.

즉, 이번 단계의 핵심은 “문서 설계”가 아니라 **실제 local-search tuner 구현 + pilot candidate 생성 + 소규모 검증 완료**다.
