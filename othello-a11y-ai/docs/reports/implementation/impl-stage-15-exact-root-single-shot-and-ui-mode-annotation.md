# 구현 보고서 Stage 15 — exact root 단일 탐색화 및 UI 모드 표기

## 1. 배경 / 목표
Stage 14에서 `exactEndgameEmpties` 경계 해석을 루트 상태 기준으로 바로잡으면서, 17~21 empties 구간의 subtree exact 오작동은 해결됐다. 다만 exact window 안쪽 루트(예: 16 empties 이하)에서는 두 가지 잔여 문제가 남아 있었다.

1. **반복 심화 중복 비용**
   - exact root는 깊이 1에서도 이미 끝까지 푼다.
   - 그런데 구현은 여전히 `depth = 1..maxDepth`를 순회하며 root loop를 반복했다.
2. **UI 가시성 부족**
   - exact root 결과도 기존 요약에서는 `완료 깊이 10` 같은 depth-limited 탐색처럼 보였다.
   - 반대로 exact 시도가 timeout으로 fallback 되었을 때도, 사용자는 “정확 계산이 끝난 것인지 / 휴리스틱 대체인지”를 알 수 없었다.

이번 단계의 목표는 다음과 같다.

- exact root에서 반복 심화를 **한 번의 단일 탐색**으로 줄인다.
- 탐색 결과에 **검색 모드 메타데이터**를 실어 UI가 `정확 끝내기` / `정확 끝내기 미완료`를 명시하도록 한다.

## 2. 변경 범위
- `js/ai/search-engine.js`
- `js/ui/formatters.js`
- `js/test/core-smoke.mjs`
- `benchmarks/stage15_exact_root_single_shot_and_ui_mode_benchmark.json`
- `docs/reports/README.md`

## 3. 구현 내용
### 3.1 exact root 단일 탐색
`SearchEngine`에 `runSingleDepthSearch()`를 추가했다.

이 함수는:
- 지정 depth 한 번만 탐색하고
- 성공 시 `stats.completedDepth`를 그 depth로 기록하며
- timeout이면 `null`을 반환한다.

`findBestMove()`에서는 루트 상태가 exact window 안(`rootEmptyCount <= exactEndgameEmpties`)일 때 더 이상 `runIterativeDeepening()`을 호출하지 않는다.
대신 아래처럼 **한 번만** 탐색한다.

- 일반 root: `searchRoot(..., depth = options.maxDepth, rootExactEndgame=true)`
- 패스 root: `searchForcedPassRoot(..., depth = options.maxDepth, rootExactEndgame=true)`

여기서 depth를 `1`이 아니라 `options.maxDepth`로 유지한 이유는, exact 여부와 무관하게 late-game move ordering 보조 신호들이 `depthRemaining`을 참고하기 때문이다. 즉, 결과 자체는 exact이되, 기존 최종 iteration 수준의 ordering horizon은 유지한다.

### 3.2 결과 메타데이터 추가
검색 결과 객체에 다음 메타데이터를 추가했다.

- `searchMode`
  - `opening-book`
  - `depth-limited`
  - `exact-endgame`
  - `terminal`
- `isExactResult`
  - exact root 탐색이 실제로 완료된 경우 `true`
  - exact root timeout으로 fallback 한 경우 `false`
- `rootEmptyCount`
- `exactThreshold`

이 메타데이터는 worker/local-engine 경로 모두 그대로 UI까지 전달된다.

### 3.3 UI 요약 문구 개선
`formatSearchSummary()`를 확장해 아래를 구분한다.

- `searchMode === 'exact-endgame' && isExactResult === true`
  - `정확 끝내기`로 표기
  - depth 문구 대신 현재 빈칸 수와 exact 결과임을 우선 표기
- `searchMode === 'exact-endgame' && isExactResult === false`
  - `정확 끝내기 미완료로 휴리스틱 대체`로 표기
- `searchMode === 'terminal'`
  - terminal 상태 전용 요약 출력

이제 exact root 결과가 더 이상 일반 depth-limited 검색처럼 보이지 않는다.

## 4. 검증 방법과 결과
### 4.1 자동 테스트
다음 테스트를 모두 통과했다.

- `node js/test/core-smoke.mjs`
- `node js/test/perft.mjs`
- `python3 tests/ui_smoke.py`
- `python3 tests/virtual_host_smoke.py`

### 4.2 신규 회귀 테스트
`js/test/core-smoke.mjs`에 exact root 관련 회귀 테스트를 추가했다.

1. **exact-root one-shot regression**
   - exact root 상태(4 empties)에서 `runIterativeDeepening()`를 강제로 예외 처리
   - 검색이 정상 통과하면, exact root 경로가 iterative deepening을 타지 않았다는 뜻이다.

2. **exact-root UI mode regression**
   - exact root 완료 결과에 대해
     - `searchMode === 'exact-endgame'`
     - `isExactResult === true`
     - `formatSearchSummary()`가 `정확 끝내기`를 포함하는지 확인

3. **exact-root fallback annotation regression**
   - `runSingleDepthSearch()`를 강제로 `null` 반환하게 덮어씀
   - fallback 결과가
     - `searchMode === 'exact-endgame'`
     - `isExactResult === false`
     - `formatSearchSummary()`가 `정확 끝내기 미완료`를 포함하는지 확인

## 5. 벤치마크 / 근거 데이터
`benchmarks/stage15_exact_root_single_shot_and_ui_mode_benchmark.json`에 Stage 14 대비 비교를 기록했다.

핵심 결과:

- `exact_root_16_empties_after_white_g2`
  - 수정 전: `H1`, score `0`, `10503ms`, `196536 nodes`
  - 수정 후: `H1`, score `0`, `7194ms`, `125480 nodes`
  - 변화: 시간 약 **31.5% 감소**, 노드 약 **36.2% 감소**

- `seeded_exact_root_8_empties_seed6`
  - 수정 전: `A3`, score `300000`, `17ms`, `242 nodes`
  - 수정 후: `A3`, score `300000`, `16ms`, `178 nodes`
  - 변화: 시간 약 **5.9% 감소**, 노드 약 **26.4% 감소**

즉, exact 결과와 최선 수는 유지하면서 exact root 중복 비용을 줄였다.

## 6. 리스크 / 비채택 항목
- `completedDepth` 자체는 여전히 숫자로 유지했다. 내부 탐색과 일부 기존 테스트가 이 값을 사용하기 때문이다.
- exact root에서 depth를 `1`로 낮추는 방식은 채택하지 않았다. ordering horizon이 약해져 오히려 exact 탐색 시간이 늘 수 있기 때문이다.
- 상태 패널 자체에 별도 배지를 추가하는 UI 레이아웃 변경은 이번에는 하지 않았다. 기존 `최근 AI 탐색` 텍스트 요약 강화만으로도 사용성 개선 효과가 충분했다.

## 7. 다음 단계
- exact root 결과에 PV 길이 / 남은 빈칸 / 확정 여부를 조금 더 구조적으로 보여 주는 UI 개선은 선택적으로 가능하다.
- 탐색/평가 체계의 다음 큰 단계는 WTHOR/expert-game 기반 ordering/evaluator tuning scaffold 쪽이 자연스럽다.
