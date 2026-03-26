# 구현 보고서 Stage 17 — Conservative Enhanced Transposition Cutoff 도입

## 1. 배경 / 목표
Stage 16에서 stability cutoff는 correctness는 확보했지만 JavaScript hot path에서 순이득이 나지 않아 비채택으로 정리했다.
다음 후보로 남은 것은 외부 Othello 엔진들이 설명하는 **Enhanced Transposition Cutoff(ETC)** 였다.

ETC의 핵심은 현재 노드 자체의 TT hit가 없어도,
- 자식 노드를 한 번 전개한 뒤
- 자식 TT bound를 모아
- 부모의 αβ window를 좁히거나 즉시 cutoff하는 것이다.

다만 외부 설명에서도 ETC는 **반복적인 child TT 조회 비용** 때문에 아무 데나 넣으면 손해가 날 수 있다고 정리되어 있다.
이번 단계의 목표는 다음과 같다.

1. correctness를 해치지 않는 **보수적 ETC 규칙**을 정한다.
2. 기존 move ordering이 이미 수행하던 child inspection과 **작업을 공유**해서 오버헤드를 줄인다.
3. representative late-search benchmark에서 순이득이 확인되면 기본 엔진에 채택한다.

## 2. 변경 범위
- `js/ai/search-engine.js`
- `js/test/core-smoke.mjs`
- `benchmarks/stage17_enhanced_transposition_cutoff_benchmark.json`
- `docs/reports/implementation/impl-stage-17-conservative-enhanced-transposition-cutoff.md`
- `docs/reports/review/review-stage-17-enhanced-transposition-cutoff-benchmark.md`
- `docs/reports/README.md`

## 3. 구현 내용
### 3.1 ETC 적용 범위는 internal negamax subtree로 제한
ETC를 `searchRoot()`에 바로 넣어 root-level early return까지 허용하면,
- fail-high bound는 비교적 안전하게 best move를 지목할 수 있어도
- fail-low upper-bound만으로는 루트에서 보여 줄 best move / analyzedMoves를 충분히 구성하기 어렵다.

그래서 이번 단계에서는 **root 조기 종료는 하지 않고**, `negamax()` 내부 subtree에서만 conservative ETC를 적용했다.
루트는 기존처럼 실제 검색 결과를 쌓아 UI가 사용할 수 있는 정보 구조를 유지한다.

### 3.2 child outcome precompute와 ETC를 공유
이번 도입의 핵심은 ETC 전용으로 child state를 새로 만드는 대신,
기존 move ordering이 이미 child outcome을 들여다보는 구간과 **동일한 게이트**를 쓰도록 만든 것이다.

즉 ETC는 다음 경우에만 켠다.
- root-adjacent node (`ply <= 1`), 또는
- late node (`empties <= 18`)로서
- 원래도 ordering이 child outcome을 미리 계산하는 구간

이렇게 하면 ETC가 하는 추가 일은 주로
- child TT bound 판독
- bound 집계
정도로 제한되고, child state 생성 비용을 별도로 거의 늘리지 않는다.

### 3.3 bound 규칙을 보수적으로 분리
부모 노드 값을 `max(children)`로 보면,
자식 TT 정보에서 안전하게 얻을 수 있는 정보는 두 종류다.

1. **부모 lower-bound**
   - child가 `exact` 또는 `upper`이면
   - 부모는 `-childValue` 이상의 값을 가질 수 있다.
   - 이 값은 **한 자식만으로도** 안전하므로, 곧바로 `alpha`를 올릴 수 있다.

2. **부모 upper-bound**
   - child가 `exact` 또는 `lower`이면
   - 그 자식 수의 부모 점수 상한은 `-childValue`다.
   - 하지만 부모 전체 상한은 **모든 legal child**에 대한 상한이 있어야만 안전하다.
   - 따라서 이번 구현은 **모든 legal child가 qualifying lower/exact TT entry를 줄 때만** `beta`를 내린다.

이 규칙 때문에 구현은 다음과 같은 성격을 가진다.
- fail-high 쪽 pruning은 비교적 자주 발생할 수 있다.
- fail-low 쪽 pruning은 더 보수적이고, coverage가 충분할 때만 발생한다.

### 3.4 ordering 단계와 child TT lookup 재사용
`orderMoves()`는 이제 이미 준비된 `orderingOutcome`과 `childTableEntry`를 재사용할 수 있다.
덕분에 ETC가 먼저 child TT를 본 노드에서는,
나중 ordering 단계가 같은 child TT를 다시 찾지 않아도 된다.

즉 이번 단계의 실질적 구현은
- ETC 추가
- 동시에 기존 late ordering path와의 중복 제거
라는 두 효과를 함께 갖는다.

### 3.5 통계 항목 추가
벤치마크와 회귀 추적을 위해 다음 stats를 추가했다.
- `etcNodes`
- `etcChildTableHits`
- `etcQualifiedBounds`
- `etcNarrowings`
- `etcCutoffs`

이 값으로 “ETC가 실제로 발동했는지”, “어디까지 bound가 충분했는지”, “실제 pruning으로 이어졌는지”를 분리해 볼 수 있다.

## 4. 검증 방법과 결과
### 4.1 자동 테스트
다음 테스트를 모두 통과했다.

- `node js/test/core-smoke.mjs`
- `node js/test/perft.mjs`
- `python3 tests/ui_smoke.py`
- `python3 tests/virtual_host_smoke.py`

### 4.2 신규 회귀 테스트
`js/test/core-smoke.mjs`에 다음 회귀를 추가했다.

1. **synthetic fail-high ETC regression**
   - child upper-bound 하나만으로 부모 lower-bound cutoff가 안전하게 일어나는지 검증
2. **synthetic fail-low ETC regression**
   - 모든 legal child가 lower-bound를 제공할 때만 부모 upper-bound fail-low가 허용되는지 검증
3. **search activity regression**
   - 실제 iterative deepening search에서 ETC stats가 0이 아니게 잡히는지 확인

## 5. 벤치마크 / 근거 데이터
상세 수치는 `benchmarks/stage17_enhanced_transposition_cutoff_benchmark.json`에 기록했다.

median-of-three 기준 aggregate 결과:

- baseline (ETC off)
  - `3707 ms`
  - `40701 nodes`
- current (ETC on)
  - `3687 ms`
  - `39585 nodes`
- 변화
  - 시간 `-20 ms` (`-0.54%`)
  - 노드 `-1116` (`-2.74%`)

추가로 current 쪽에서는 합산
- `etcNodes = 10758`
- `etcQualifiedBounds = 5043`
- `etcNarrowings = 426`
- `etcCutoffs = 385`
가 관측됐다.

즉 ETC가 문서상 개념으로만 들어간 것이 아니라,
실제 late subtree에서 window narrowing / cutoff로 이어졌음을 확인했다.

## 6. 리스크 / 설계상 보수성
- root search는 early return하지 않는다.
- 부모 upper-bound(`beta` 축소)는 **모든 legal child coverage가 있을 때만** 허용한다.
- activation도 child outcome precompute가 이미 수행되는 구간으로 제한한다.

이 때문에 공격적인 ETC보다는 pruning 양이 적을 수 있지만,
현재 JS 엔진의 correctness와 UI 구조를 유지하면서 채택 가능한 수준의 보수적 개선을 우선했다.

## 7. 외부 참고
- Egaroucid technical explanation (ETC, pruning order, near-root overhead)
  - `https://www.egaroucid.nyanyan.dev/en/technology/explanation/`
- Chessprogramming Othello page (historical Othello ETC reference)
  - `https://www.chessprogramming.org/Othello`

## 8. 다음 단계
현재 구조에서 다음 우선순위 후보는 다음 둘이다.

1. **WLD pre-pass 실험**
   - full solve 직전 1~2수 구간에 한정해 WLD 탐색이 ordering / branch reduction에 주는 효과를 확인
2. **ETC 추가 미세조정**
   - 현재는 conservative coverage 규칙을 우선 채택했으므로,
     representative holdout를 더 늘려 activation 범위나 fail-low gate를 더 다듬을 여지가 있다.
