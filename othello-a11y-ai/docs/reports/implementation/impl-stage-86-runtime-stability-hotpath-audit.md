# 구현 보고서 Stage 86 — 런타임 stability hotpath audit / refactor

## 배경 / 목표

문서 정리 전 단계에서 런타임, 특히 AI search/evaluator 경로를 다시 검수해 다음을 확인했습니다.

- 죽은 코드 / 과도한 추상화 / 중복 dispatch가 hotpath에 남아 있는지
- 같은 결과를 유지한 채 자료구조/루프 구조를 더 싸게 만들 수 있는지
- 실제 병목이 해결되는지, 또는 벤치에서 단지 노이즈인지

## 프로파일 결과

Stage 85 기준으로 depth-limited 18 empties 반복 search를 다시 CPU profile로 확인했을 때, search 루프보다 evaluator의 stability 정제 경로가 크게 노출됐습니다.
핫 함수는 대체로 다음 순서였습니다.

1. `isStabilityAxisProtected()`
2. `isConservativelyStable()`
3. `refineStableDiscs()`
4. `stabilityCounts()`
5. `populateEvaluationFeatureRecord()`

즉, 현재 런타임에서 가장 먼저 손댈 가치가 있는 후보는 **stability refinement 경로의 dispatch / full-board scan 비용**이었습니다.

## 변경 범위

### 1) 채택 — evaluator stability hotpath flattening
적용 내용:

- stability axis / direction mask lookup flattening
- `every()` / `some()` / axis object dispatch 제거
- `stable`이 항상 현재 플레이어의 부분집합이라는 invariant를 이용해 방향 보호 검사 단순화
- `player | opponent` occupied bitboard를 양측 stability 계산에서 재사용
- refinement pass마다 64칸 전체를 다시 훑지 않고 `player & ~currentStable`만 순회

수정 파일:
- `js/ai/evaluator.js`
- `js/test/stage86_stability_hotpath_smoke.mjs`
- `benchmarks/stage86_runtime_stability_hotpath_summary.json`

판정: **채택**

### 2) 보류/기각 — `rules.js` explicit direction loop unroll
시험 내용:

- `legalMovesBitboard()` / `computeFlips()`에서 generic `DIRECTIONS` iteration을 explicit direct-call 형태로 전개

결과:

- `depth20_d8`에서는 약간 빠를 수 있었지만,
- `depth18_d10`에서는 오히려 소폭 느려졌고,
- 전체적으로 Stage 86 채택안 위에 덧붙일 만큼의 일관된 이득이 없었습니다.

판정: **기각**

## 검증 방법과 결과

### evaluator parity
corpus: empties `26..12`, seed `1..6`

비교 항목:
- `Evaluator.evaluate()` score
- `stability`
- `stableDiscs`
- `opponentStableDiscs`

결과:
- mismatch `0`

즉, 이번 패치는 evaluator 결과를 바꾸지 않고 hotpath 비용만 줄였습니다.

### evaluator microbenchmark
corpus 64 positions, sample당 2,560 evaluations

- baseline median: `78.206ms`
- candidate median: `63.799ms`
- ratio: `0.8158`

sampled corpus에서 evaluator 단독 비용이 약 **18.4% 감소**했습니다.

### search integration benchmark
#### `depth20_d8`
- baseline: `3118ms`, nodes `59,721`
- candidate: `2783ms`, nodes `59,721`
- ratio: `0.8926`

#### `depth18_d10`
- baseline: `5975ms`, nodes `110,853`
- candidate: `4922ms`, nodes `110,853`
- ratio: `0.8238`

#### `exact10_control`
- baseline: `65ms`, nodes `456`
- candidate: `62ms`, nodes `456`
- ratio: `0.9538`

요약:
- depth-limited search에서 **노드 수 변화 없이** elapsed가 개선됐습니다.
- exact control도 동일 node / same move / same score를 유지했습니다.

## 관련 파일
- `js/ai/evaluator.js`
- `js/test/stage86_stability_hotpath_smoke.mjs`
- `benchmarks/stage86_runtime_stability_hotpath_summary.json`
- `docs/reports/implementation/impl-stage-86-runtime-stability-hotpath-audit.md`

## 회귀 확인
다음 테스트를 통과했습니다.

```bash
node js/test/core-smoke.mjs
node js/test/perft.mjs
node js/test/stage53_evaluator_tuple_refactor_smoke.mjs
node js/test/stage83_custom_wld_toggle_smoke.mjs
node js/test/stage86_stability_hotpath_smoke.mjs
```

## 리스크 / 비채택 항목
- 이번 패치는 evaluator/search 결과를 유지한 채 비용만 줄이는 런타임 리팩토링입니다.
- move-generation core(`legalMovesBitboard()` / `growDirectionalTargets()` / `computeFlips()`)는 다음 hotspot이지만, 이번에 시험한 direct unroll안은 일관된 승리를 보여주지 못해 채택하지 않았습니다.

## 결론
Stage 86에서는 **stability hotpath flattening 1건을 adopted runtime refactor로 확정**했습니다.

이 패치는
- evaluator/search 결과를 유지했고,
- sampled depth-limited search에서 실제 elapsed를 줄였고,
- exact/WLD 제어 경로를 건드리지 않았고,
- `rules.js` direct unroll 후보보다 더 일관된 효과를 보였습니다.

## 다음 단계
다음 단계가 문서/정리라면, 이 변경이 실제 프로젝트 문서에도 반영되도록 runtime reference / checklist / report inventory를 현재 코드 기준으로 다시 정리하는 것이 맞습니다.
