# Stage 43 top-pair local-search summary (2026-03-30)

## 무엇을 했는가

- `tune-move-ordering-search-cost.mjs`에 `--allowed-action-ids`를 추가해서
  상위 single action만 다시 pair로 제한할 수 있게 했습니다.
- `search-move-ordering-top-pairs.mjs` / `.bat` wrapper를 추가했습니다.
- top-N single 후보를 고를 때 compatible pair count를 키우는 방향의
  greedy diversity selection을 넣었습니다.
- Stage 43 smoke test를 추가했습니다.

## 실제 탐색 결과

### tiny exact-13 / depth-15 pilot

- pair 후보 중 base를 확실히 넘는 조합은 없었습니다.

### tiny exact-14 / depth-15 pilot

- first pair candidate:
  - `edgePattern@11-12=x0.25 + cornerPattern@11-12=x1.25`
- 하지만 reduced validation(seed 1..4, depth 15, exact 14/13)에서는
  `candidateF`보다 나빠서 폐기했습니다.

### fast-pilot restricted top4 exact-14 / depth-15

- provisional best pair (`candidateH2`):
  - `edgePattern@11-12=x1.25 + cornerPattern@11-12=x1.25`

## candidateH2 검증

### seed 1..4 full suite

`candidateF` vs `candidateH2`

- depth overall nodes
  - `24,326 -> 24,295` (`-0.13%`)
- exact overall nodes
  - `128,917 -> 128,857` (`-0.05%`)
- combined nodes
  - `153,243 -> 153,152` (`-0.06%`)

### exact output audit (empties 14,13,12,11 × seeds 1..4)

- same score: `16/16`
- same best move: `16/16`
- verified tie swaps: `0`

## 결론

- top-pair local search tooling은 실제로 유용했고,
  diversity-aware selection 없이는 pair 공간이 지나치게 좁아졌습니다.
- `candidateH2`는 현재 확인한 범위에서는 `candidateF`보다 미세하게 좋고,
  exact output도 완전히 같습니다.
- 다만 개선 폭이 매우 작기 때문에, 더 넓은 same-run validation(예: seed 1..8 이상)
  전에는 active profile 교체를 보류하는 편이 안전합니다.
