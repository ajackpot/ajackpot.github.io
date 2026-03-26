# 검토 보고서 Stage 17 — Enhanced Transposition Cutoff 벤치마크 및 채택 판단

## 배경 / 목표
Stage 12 외부 엔진 조사에서 ETC(Enhanced Transposition Cutoff)는 비교적 유망한 후보로 남아 있었다.
특히 Egaroucid 문서에서는,
- legal move generation 이후
- child TT bound를 참조해
- move ordering 전에 pruning / window narrowing을 시도하는 흐름을 설명하고 있었다.

반면 같은 문서에서 ETC는 **오버헤드가 큰 편**이므로 root 근처에서만 쓰거나 구현 순서를 잘 잡아야 한다고도 언급한다.

이번 단계의 목표는 다음과 같았다.

1. ETC를 현재 JS 엔진 구조에 맞게 **보수적으로 구현**한다.
2. stability cutoff와 달리, 이번에는 실제 runtime 기준으로도 **기본 활성화할 가치가 있는지** 판단한다.

## 실험 범위
실험은 다음 범위에서 진행했다.

1. internal negamax subtree에만 conservative ETC를 적용
2. child outcome precompute / child TT ordering data를 재사용해 오버헤드 최소화
3. median-of-three 기준으로
   - depth-limited neutral case
   - pre-exact late-search case
   - exact late-search case
   를 함께 비교

비교 대상은 다음 두 가지였다.
- baseline: 같은 코드에서 `enhancedTranspositionCutoff = false`
- current: Stage 17 ETC 기본 활성화 상태

## 관련 파일
- `js/ai/search-engine.js`
- `js/test/core-smoke.mjs`
- `benchmarks/stage17_enhanced_transposition_cutoff_benchmark.json`
- `docs/reports/implementation/impl-stage-17-conservative-enhanced-transposition-cutoff.md`
- `docs/reports/review/review-stage-17-enhanced-transposition-cutoff-benchmark.md`

## 핵심 판단
### 1. 이번 ETC는 채택 가능
대표 late-search benchmark 9건 합산에서,
- move / score 변화 없음
- nodes 감소
- elapsed time도 소폭 감소
가 동시에 확인됐다.

즉 Stage 16 stability cutoff와 달리,
이번 ETC는 **보수적으로 넣어도 실제 JavaScript 엔진에서 순이득**이 남는 쪽으로 나왔다.

### 2. 다만 이득 폭은 “크다”보다는 “안전하게 누적된다”에 가깝다
aggregate median 기준 변화는 다음과 같다.

- baseline elapsed: `3707 ms`
- current elapsed: `3687 ms`
- elapsed delta: `-20 ms` (`-0.54%`)
- baseline nodes: `40701`
- current nodes: `39585`
- node delta: `-1116` (`-2.74%`)

즉 dramatic speedup이라기보다는,
이미 TT-first / late ordering / small exact solver가 들어간 엔진에
**추가 pruning을 무리 없이 얹은 소폭 개선**으로 보는 편이 정확하다.

### 3. fail-low pruning은 coverage rule 덕분에 안전성을 우선했다
부모 upper-bound는 모든 legal child의 상한이 필요하므로,
이번 구현은 child lower/exact entry가 **전부 갖춰졌을 때만** beta 축소를 허용했다.

이 때문에 더 공격적인 ETC보다 pruning 양은 적을 수 있지만,
현재 repo 목적상 correctness와 maintainability를 우선하는 판단이 맞다고 봤다.

## 벤치마크 결과 요약
상세 데이터는 `benchmarks/stage17_enhanced_transposition_cutoff_benchmark.json`에 있다.

대표 관측:
- `deterministic_depth_limited_ply19`
  - score / best move 유지
  - 시간과 노드 변화 거의 없음
  - ordinary depth-limited 구간에서 broad regression은 관찰되지 않음
- `seeded_pre_exact_14_empties_seed1`
  - `4441 -> 4259 nodes`
  - `497 ms`대에서 `478 ms` 수준으로 개선
- `seeded_exact_10_empties_seed1`
  - `1379 -> 1235 nodes`
  - 시간도 함께 감소
- `seeded_exact_12_empties_seed1`
  - `8479 -> 8106 nodes`
  - 시간도 함께 감소

반면 `seeded_pre_exact_16_empties_seed1`처럼 일부 케이스는 소폭 악화도 있었다.
즉 ETC가 모든 late position에서 일관되게 이득인 것은 아니지만,
대표 묶음 전체에서는 채택 쪽이 더 낫다는 결론이다.

## 정량 지표
current 쪽 합산 ETC stats:
- `etcNodes = 10758`
- `etcChildTableHits = 7141`
- `etcQualifiedBounds = 5043`
- `etcNarrowings = 426`
- `etcCutoffs = 385`

이 수치는 ETC가 실제로 살아 있고,
단순 계측만이 아니라 실 pruning까지 이어졌음을 보여 준다.

## 리스크 / 비채택 항목
이번 단계에서 **비채택** 또는 **보류**한 것:

1. root-level ETC early return
   - root 결과 구조(best move / analyzed moves / UI report)를 더 복잡하게 만들 수 있어 보류
2. aggressive fail-low narrowing
   - 일부 child coverage만으로 beta를 줄이는 형태는 안전하지 않아 비채택
3. broader activation
   - child outcome을 원래 precompute하지 않는 구간까지 확장하는 것은 오버헤드 리스크가 있어 비채택

## 결론
이번 단계의 ETC는 다음 이유로 **채택**한다.

1. representative benchmark에서 score / move 보존
2. aggregate median 기준 nodes 감소
3. aggregate elapsed도 소폭이지만 개선
4. 구현이 기존 ordering / TT path와 잘 맞물려 유지보수 부담이 낮음

즉, 이번 ETC는 “대형 기능”이라기보다는,
현재 엔진 상태에서 **안전하게 추가할 수 있는 고전적 pruning 보강**으로 평가한다.

## 외부 참고
- Egaroucid technical explanation
  - `https://www.egaroucid.nyanyan.dev/en/technology/explanation/`
- Chessprogramming Othello
  - `https://www.chessprogramming.org/Othello`

## 다음 단계
다음 단계 후보는 두 가지가 가장 자연스럽다.

1. **WLD pre-pass 실험**
   - full exact solve 직전 1~2수 구간에서 승무패 탐색이 branch reduction에 실제로 도움 되는지 측정
2. **late exact holdout 확장**
   - ETC / stability / future WLD 실험을 더 안정적으로 비교할 late-endgame benchmark coverage를 늘리기
