# Stage 43: top-pair move-ordering local search

## 이번 단계의 목적

Stage 42에서 추가한 multi-action local search는 모든 pair를 그대로 열면 비용이 너무 커졌습니다.
그래서 이번 단계에서는:

1. single-action 후보를 먼저 실제 search-cost 기준으로 정렬하고,
2. 그중 상위 후보만 다시 pair로 좁혀 재탐색하는
3. 비용 제어형 top-pair local-search 흐름을 새로 추가했습니다.

## 실제 구현

### 1) `tune-move-ordering-search-cost.mjs`

- `--allowed-action-ids` 추가
- 특정 atomic action id만 남겨서 candidate chain을 만들 수 있게 수정
- 상위 single action만 다시 pair로 좁혀 재탐색하는 wrapper가 이 옵션을 사용합니다.

### 2) `search-move-ordering-top-pairs.mjs`

새 wrapper를 추가했습니다.

- 1차: single-action search
- 2차: 상위 single action을 다시 pair search
- improving single 후보를 우선하되, 동률이 많을 때 같은 feature/range만 과하게 뽑히지 않도록
  **compatible-pair count를 늘리는 방향으로 greedy diversity selection**을 적용했습니다.

이 greedy selection은 Stage 43 작업 중 실제로 필요해졌습니다.
초기 버전은 동률 후보가 `cornerPattern` 쪽으로 몰려서 pair 공간이 지나치게 좁아졌고,
개선 후에는 `edgePattern + cornerPattern` pair가 실제로 탐색되도록 바뀌었습니다.

### 3) smoke test 추가

- `js/test/stage43_top_pair_local_search_smoke.mjs`

검증 항목:

- single-pass raw summary 생성
- pair-pass raw summary 생성
- pair-pass의 `allowedActionIds` 기록
- pair candidate가 실제로 2-action chain으로 구성되는지 확인
- compatibility-aware selection 후 valid pair count가 1개 이상인지 확인

## 이번 단계에서 실제로 찾은 후보

### tiny exact-14 pilot

base: `stage41-candidateF-cornerPattern125-11-12`

작은 root set(empties 14 / depth 15, seed 1)에서:

- single best: `edgePattern@11-12=x0.25`
- pair best(다양성 선택 후):
  - `edgePattern@11-12=x0.25 + cornerPattern@11-12=x1.25`

이 첫 pair 후보는 seed 1..4 reduced validation에서 robust하지 않았습니다.

### fast pilot에서 나온 더 안정적인 pair 후보

`top4` restricted pair fast-pilot에서:

- `edgePattern@11-12=x1.25 + cornerPattern@11-12=x1.25`

이 후보를 `candidateH2`로 저장했습니다.

## 검증 결과

### seed 1..4 full suite validation

`candidateH2` vs active `candidateF`

- depth nodes: `24,326 -> 24,295` (`-0.13%`)
- exact nodes: `128,917 -> 128,857` (`-0.05%`)
- combined nodes: `153,243 -> 153,152` (`-0.06%`)

### exact tie / output audit

exact root set `(empties 14,13,12,11 × seeds 1..4)` 에서

- same score: `16/16`
- same best move: `16/16`
- verified tie swap: `0`

즉 현재 확인 범위에서는 **output이 완전히 동일**하면서 search nodes만 아주 조금 줄었습니다.

## 이번 단계의 결론

- top-pair search tooling 자체는 유효합니다.
- diversity-aware top-N selection도 실제로 필요했고, 구현 후 pair 탐색 품질이 좋아졌습니다.
- `candidateH2`는 seed 1..4 full suite에서는 `candidateF`보다 미세하게 좋았습니다.
- 다만 개선 폭이 매우 작고, 이번 세션 안에서는 더 넓은 8+/24-seed same-run validation을 끝까지 돌리지 못했습니다.

따라서 이번 단계에서는 **active profile 채택은 보류**하고,
`candidateH2`를 **provisional candidate**로 남기는 것이 가장 안전합니다.
