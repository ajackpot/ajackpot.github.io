# 구현 보고서 Stage 12 — Packed Hash Key 최적화

## 배경 / 목표

현재 엔진은 이미 다음 수준의 핵심 탐색 요소를 갖추고 있었습니다.

- iterative deepening
- aspiration window
- PVS(Principal Variation Search) 계열의 null-window 재탐색 구조
- transposition table
- killer / history heuristic
- late move reduction
- 소규모 exact endgame solver
- opening book

즉, 이번 단계에서 우선순위가 높은 것은 **새 pruning 기법을 성급히 추가하는 것**보다,
이미 있는 탐색 루프에서 **불필요한 per-node 오버헤드를 더 줄일 수 있는가**를 보는 일이었습니다.

검토 결과, 가장 눈에 띄는 저위험 후보는 `GameState.hashKey()`였습니다.
기존 구현은 다음과 같은 문자열 키를 매번 만들어 사용했습니다.

- `black.toString(16)`
- `white.toString(16)`
- `currentPlayer`
- 이들을 이어붙인 문자열

이 키는 다음 용도로 넓게 사용되고 있었습니다.

- transposition table lookup / store
- opening book lookup
- UI에서 비동기 탐색 시작 상태 확인

즉, **핫패스에 가까운 파생값인데 표현 비용이 비교적 큰 편**이었습니다.

## 변경 범위

### 1) 문자열 해시 키를 packed BigInt 키로 교체

파일:
- `js/core/game-state.js`

기존:
- 64비트 흑 비트보드와 64비트 백 비트보드를 각각 16진 문자열로 변환한 뒤
- side-to-move 문자열과 함께 조합한 문자열 키를 사용

변경 후:
- 흑 비트보드: 하위 64비트
- 백 비트보드: 상위 64비트(`<< 64n`)
- 백 차례 여부: 추가 플래그 비트(`<< 128n`)

즉, 동일 상태를 **정확한 packed BigInt key** 하나로 표현하도록 바꿨습니다.

장점:
- 문자열 변환 / 결합 비용 제거
- 정확한 상태 표현 유지
- `Map` key로 그대로 사용 가능
- 충돌 없는 exact key 유지

### 2) hash key 회귀 테스트 추가

파일:
- `js/test/core-smoke.mjs`

추가 검증:
- clone 후 같은 상태는 같은 hash key를 유지하는지
- side-to-move가 바뀌면 hash key도 달라지는지
- 반환 타입이 packed BigInt인지

## 왜 이 변경만 채택했는가

이번 단계에서는 선택지를 넓게 봤지만, 실제 merge는 보수적으로 제한했습니다.

채택하지 않은 이유:
- ProbCut / Multi-ProbCut: 오프라인 회귀식 보정과 신뢰 구간 설계가 먼저 필요
- 큰 패턴 테이블 확대: 학습/튜닝 데이터 파이프라인 없이 넣으면 회귀 리스크 큼
- CNN / 정책망 계열: 브라우저 번들 크기, 초기화 비용, 추론 비용 부담이 큼
- null-move pruning: Othello에서는 일반 체스형 null-move를 바로 가져오기 어렵고 안전성 검토가 더 필요

반면 packed hash key는:
- 의미 보존이 명확하고
- 구현 영향 범위가 작고
- 테스트 가능성이 높고
- TT / opening book / UI stale-search guard에 동시에 이득을 줄 수 있는
  전형적인 **저위험·고빈도 최적화 후보**였습니다.

## 검증

통과:
- `node js/test/core-smoke.mjs`
- `node js/test/perft.mjs`
- `python3 tests/ui_smoke.py`
- `python3 tests/virtual_host_smoke.py`

## 벤치마크

파일:
- `benchmarks/stage12_packed_hash_repeated_search_benchmark.json`

### A) hash 생성 비용 마이크로벤치

세팅:
- 16개 seeded-random 중반 상태
- fresh `GameState`를 계속 생성한 뒤 `hashKey()` 300,000회 호출

결과:
- baseline(string key): `77.98 ms`
- candidate(packed BigInt key): `56.65 ms`
- 변화: **약 27.35% 감소**

해석:
- “이미 캐시된 key를 읽는 속도”가 아니라,
  **새 상태에서 hash key를 실제로 만들어내는 비용**이 의미 있게 줄었습니다.

### B) 실제 탐색 벤치마크

세팅:
- 18 empties seeded-random 상태 12개
- `maxDepth = 5`
- `timeLimitMs = 1800`
- `exactEndgameEmpties = 12`
- baseline/candidate를 교차 순서로 4라운드 반복

집계 결과:
- baseline mean elapsed: `219.13 ms`
- candidate mean elapsed: `216.35 ms`
- 변화: **약 1.26% 감소**
- 평균 노드 수: 완전히 동일 (`1985.42`)
- 평균 TT hit / cutoff / completed depth: 동일

해석:
- 탐색 tree 자체를 바꾼 것이 아니라,
  **동일한 tree를 조금 더 싼 비용으로 탐색**하게 된 변화입니다.
- 노드 수와 best move가 같다는 점에서 기능 회귀 신호는 보이지 않았습니다.

## 리스크 / 주의점

- `hashKey()`의 반환 타입이 문자열에서 `BigInt`로 바뀌었으므로,
  외부에서 문자열 연산을 기대하는 코드는 있으면 안 됩니다.
- 현재 코드베이스에서는 사용처를 전부 확인했고,
  모두 `Map` key 비교 또는 equality 비교만 사용하고 있어 안전하다고 판단했습니다.
- `consecutivePasses`는 hash key에 넣지 않았습니다.
  이는 기존 구현과 동일한 의미이며,
  현재 엔진의 transposition / opening-book semantics를 유지합니다.

## 변경 파일

- `js/core/game-state.js`
- `js/test/core-smoke.mjs`
- `benchmarks/stage12_packed_hash_repeated_search_benchmark.json`

## 다음 단계 후보

이후의 강한 후보는 “코드에 바로 추가”보다 **오프라인 데이터 파이프라인 정비** 쪽입니다.

우선순위 순:
1. WTHOR / expert-game 기반 evaluator tuning 파이프라인 정리
2. empties bucket별 ProbCut / MPC 회귀식 추정 실험
3. compact systematic n-tuple 또는 작은 패턴 테이블의 late-mid / pre-exact 보강 실험

즉, Stage 12의 결론은:

> 이번 단계에서는 새 pruning보다,
> exact semantics를 유지하는 hash 표현 최적화가 더 안전하고 합리적인 채택안이었다.
