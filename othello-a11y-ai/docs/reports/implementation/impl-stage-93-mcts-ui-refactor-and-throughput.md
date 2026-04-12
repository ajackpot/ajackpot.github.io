# Stage 93 - MCTS 모드 가용성 정리, 핫패스 리팩토링, 처리량 점검

## 요약
이번 단계에서는 세 가지 축을 함께 마무리했습니다.

1. **설정 옵션 구조 정리**
   - 모든 난이도에서 `MCTS Guided`, `MCTS Hybrid`를 선택할 수 있도록 하되,
   - `beginner`에서는 `MCTS Hybrid` 대신 `MCTS Lite`를 노출하도록 UI와 런타임 정규화를 맞췄습니다.

2. **MCTS 관련 코드 리팩토링 / 성능 최적화**
   - 기존 `mcts-lite / guided / hybrid` 구조는 유지하면서,
   - 반복적으로 발생하는 문자열 키 생성, 전체 정렬, 임시 배열 할당, 작은 자료구조 중복 생성 같은 핫패스를 줄였습니다.

3. **처리량 벤치와 문서 정리**
   - 새 처리량 비교 도구를 추가해, Stage 92 대비 현재 Stage 93 리팩토링이 실제 iteration/tree-node 처리량에 어떤 영향을 주는지 측정했습니다.
   - 결과와 향후 보강 후보를 문서로 정리하고, 런타임 레퍼런스/README/리포트 인벤토리까지 갱신했습니다.

추가/변경 파일:
- `js/ai/search-algorithms.js`
- `js/ui/settings-panel-view.js`
- `js/ui/app-controller.js`
- `js/ai/mcts.js`
- `tools/engine-match/benchmark-mcts-throughput-compare.mjs`
- `js/test/stage93_search_algorithm_availability_and_throughput_smoke.mjs`
- `benchmarks/stage93_mcts_refactor_throughput_compare.json`
- `README.md`
- `docs/runtime-ai-reference.md`
- `docs/reports/report-inventory.generated.*`

## 1) 설정 옵션 구조 정리
이번 단계에서 최종 반영한 노출 구조는 아래와 같습니다.

- `beginner`
  - `classic`
  - `mcts-lite`
  - `mcts-guided`
- `easy` 이상 (`easy / normal / hard / expert / impossible / custom`)
  - `classic`
  - `mcts-guided`
  - `mcts-hybrid`

핵심은 **프리셋별 허용 목록을 명시적으로 정의**하고,
UI와 런타임 해석 모두에서 같은 규칙을 쓰도록 만든 점입니다.

반영 내용:
- 설정 패널의 AI 모드 `<select>`가 현재 프리셋에 따라 동적으로 다시 구성됩니다.
- 선택값이 현재 프리셋에서 허용되지 않으면 자동으로 안전한 대체값으로 정규화됩니다.
  - `beginner`에서 `mcts-hybrid` → `mcts-lite`
  - `easy` 이상에서 `mcts-lite` → `mcts-guided`
- 설명 문구도 프리셋에 따라 함께 갱신됩니다.

즉, 이제 사용자는 설정상 불가능한 조합을 유지한 채 화면과 내부 상태가 어긋나는 상황을 만들기 어렵습니다.

## 2) 적용한 리팩토링 / 성능 최적화
이번 단계에서는 **동작 방식은 크게 바꾸지 않되, 현재 구조에서 무리 없이 회수 가능한 비용**을 먼저 줄였습니다.

### 2-1. 문자열 캐시 키 제거 또는 축소
기존 MCTS 보조 캐시 중 일부는 다음과 같은 형태의 문자열 키를 만들 수 있었습니다.

- `"${hash.toString(16)}:${color}"`
- `"${depth}:${hash.toString(16)}"`

이 방식은 JavaScript에서 해시 문자열 생성과 GC 부담을 함께 늘립니다.
이번 단계에서는 아래처럼 정리했습니다.

- guided ordering signal 캐시:
  - `color`별로 `Map<BigInt, signal>` 분리
- hybrid minimax prior 캐시:
  - `depth`별로 `Map<BigInt, score>` 분리

즉, `state.hashKey()`가 이미 `BigInt`로 존재하는 현재 코드베이스의 장점을 그대로 활용해,
중간 문자열 생성 비용을 줄였습니다.

### 2-2. 전체 정렬 대신 top-k 유지
guided / hybrid 쪽 후보 선별에서는 “상위 몇 개만” 실제로 필요하지만,
기존 방식은 전체 후보 배열을 만든 뒤 정렬하고 앞부분을 잘라 쓰는 비용이 있었습니다.

이번 단계에서는 아래 항목을 **incremental top-k 유지** 방식으로 바꿨습니다.

- guided expansion candidate scoring
- guided rollout candidate scoring
- hybrid minimax candidate ordering

효과:
- 전체 후보 수가 많을수록 불필요한 sort 비용 감소
- 중간 객체/배열 생성 축소
- 같은 `topK` 제한을 유지하면서도 핫패스가 더 평평해짐

### 2-3. weighted pick 중간 배열 제거
기존 weighted sampling은 대개 다음 흐름을 탔습니다.

1. 후보 배열 생성
2. 같은 길이의 weight 배열 생성
3. sampling

이번 단계에서는 `weightedPickBy(entries, weightResolver, random)` 형태로 바꿔,
별도 weight 배열을 만들지 않고 필요 시점에만 가중치를 계산하도록 정리했습니다.

### 2-4. 작은 선택 루프에서 sort/filter 제거
작은 루프라도 반복 횟수가 많으면 비용이 누적됩니다.
다음 부분을 단순 선형 스캔으로 바꿨습니다.

- `selectMostVisitedChild()`
  - `[...children].sort(...)[0]` → 선형 최대값 선택
- guided rollout의 코너 우선 선택
  - `filter()` 기반 임시 배열 생성 → 단일 패스 선택
- corner membership
  - `Set` 조회 → `Uint8Array` 플래그 조회

### 2-5. 불필요한 배열 복사 축소
child node 생성 시 이미 안전하게 전달 가능한 `legalMoves`를 다시 spread copy 하던 지점을 제거했습니다.
이 변경은 작아 보이지만 iteration 수가 많아질수록 누적 비용 차이가 납니다.

## 3) 추가로 조사한 MCTS 보강 후보
이번 단계에서는 코드 적용보다 **다음 라운드 후보 분류**도 함께 했습니다.
현재 구조와 기존 문헌/공개 구현 흐름을 기준으로 보면 아래 후보들이 가장 의미 있습니다.

### A. RAVE / AMAF
초반 방문 수가 적을 때 수 가치 추정을 더 빨리 안정시키는 대표적 MCTS 보강입니다.
현재 `guided` 계열처럼 rollout policy가 완전 랜덤이 아닌 경우에도 붙일 수 있지만,
보드별/색별 통계를 어떻게 합칠지 설계를 더 해야 해서 이번 단계에서는 보류했습니다.

### B. implicit minimax backups
현재 `hybrid`는 확장 시점의 shallow prior에 minimax 평가를 씁니다.
여기에 더해 backup 단계에도 heuristic/minimax 성분을 섞는 implicit minimax backups 계열을 넣으면,
rollout 평균과 정적 평가를 좀 더 안정적으로 결합할 수 있습니다.
다만 backup 의미가 바뀌는 만큼 strength 검증이 먼저 필요합니다.

### C. MCTS-Solver / late solved-value propagation
후반 exact/WLD를 root override로만 쓰지 말고,
MCTS 내부 subtree에도 solved / proven value를 전파하는 방식입니다.
현재 코드베이스는 late exact 인프라가 이미 강하므로 궁합이 좋지만,
노드 상태와 backup semantics가 함께 바뀌어 구현 범위가 더 큽니다.

### D. transposition-aware MCTS graph
오델로처럼 transpose가 잦은 게임에서는 트리보다 그래프 구조가 의미가 있습니다.
하지만 현재 browser-target 구현에서 그래프형 MCTS를 넣으려면
node ownership, visit accounting, cycle safety, update semantics까지 재정의해야 해서,
이번 단계의 “마감용 리팩토링” 범위를 넘는다고 판단했습니다.

즉, 이번 단계에서는 아래를 권장 수준으로 분류했습니다.

- **즉시 적용 권장**: 현재 코드 구조 안에서 비용만 줄이는 핫패스 리팩토링
- **다음 실험 단계 권장**: RAVE, implicit minimax backup, MCTS-Solver, transposition-aware MCTS

## 4) 처리량 비교 벤치
새 도구:
- `tools/engine-match/benchmark-mcts-throughput-compare.mjs`

목적:
- 동일한 opening position 묶음에서
- 같은 시간 제한을 주고
- baseline(Stage 92)과 candidate(Stage 93)의 평균 iteration / tree node 처리량을 비교

실행 예:

```bash
node tools/engine-match/benchmark-mcts-throughput-compare.mjs \
  --candidate-root . \
  --baseline-root /mnt/data/work_stage93_baseline/stage83 \
  --time-ms-list 160,280,500 \
  --position-seed-list 17,31,41,53,71,89 \
  --opening-plies 12 \
  --random-mode constant-zero \
  --output-json benchmarks/stage93_mcts_refactor_throughput_compare.json
```

결과 요약 (`benchmarks/stage93_mcts_refactor_throughput_compare.json`):

| algorithm | timeLimitMs | Stage 92 avg iterations | Stage 93 avg iterations | 변화 |
| --- | ---: | ---: | ---: | --- |
| mcts-guided | 160 | 56.67 | 62.33 | +10.0% |
| mcts-guided | 280 | 114.00 | 116.17 | +1.9% |
| mcts-guided | 500 | 218.50 | 229.00 | +4.8% |
| mcts-hybrid | 160 | 38.00 | 38.67 | +1.8% |
| mcts-hybrid | 280 | 64.33 | 68.50 | +6.5% |
| mcts-hybrid | 500 | 125.33 | 125.00 | -0.3% |

해석:
- `guided`는 세 구간 모두 iteration 처리량이 증가했습니다.
- `hybrid`도 `160 / 280ms`에서는 개선이 보였고, `500ms`에서는 사실상 동급 범위의 미세 변동으로 보입니다.
- 즉, 이번 리팩토링은 적어도 **회귀 없이 유지되며, 특히 guided lane에서 유의미한 처리량 개선**을 보였습니다.

주의점:
- 이 벤치는 **처리량 벤치**이지 strength benchmark가 아닙니다.
- iteration 수가 늘었다고 해서 실제 대국 강도가 항상 같은 비율로 오르는 것은 아닙니다.
- 따라서 강도 판단은 기존 pair benchmark와 별도로 계속 보는 것이 안전합니다.

## 5) 검증
실행한 주요 검증:

```bash
node js/test/core-smoke.mjs
node js/test/stage88_mcts_lite_smoke.mjs
node js/test/stage89_mcts_guided_smoke.mjs
node js/test/stage91_mcts_hybrid_smoke.mjs
node js/test/stage92_search_algorithm_pair_multiseed_smoke.mjs
node js/test/stage93_search_algorithm_availability_and_throughput_smoke.mjs
node tools/docs/generate-report-inventory.mjs --check
```

`stage93_search_algorithm_availability_and_throughput_smoke`는 다음을 함께 확인합니다.

- preset별 AI 모드 노출 구조
- preset 전환 시 정규화 규칙
- throughput benchmark 도구가 실제 JSON 산출물을 생성하는지

## 6) 결론
이번 단계로 다음이 정리되었습니다.

1. 사용자가 원한 **최종 설정 구조**가 UI/런타임 모두에 반영되었습니다.
   - `beginner`: `Lite` 선택 가능
   - `easy` 이상: `Guided / Hybrid` 선택 가능

2. MCTS 관련 코드에서 지금 당장 회수 가능한 **핫패스 비용 절감**을 반영했습니다.
   - 문자열 캐시 키 축소
   - 전체 정렬/임시 배열 감소
   - 작은 자료구조 최적화

3. 새 처리량 비교 도구로, 리팩토링이 **실제 iteration/tree-node 처리량 측면에서 최소한 회귀 없이 유지**됨을 확인했습니다.

4. 추가 보강 후보도 정리했습니다.
   - 다음 유력 후보: `RAVE`, `implicit minimax backups`, `MCTS-Solver`, `transposition-aware MCTS`

즉, 이번 단계는 새로운 알고리즘 하나를 더 붙이는 단계라기보다,
**현재 MCTS 실험 라인을 제품형 설정 구조로 마감하고, 다음 실험을 위한 엔진 바닥을 정리한 단계**에 가깝습니다.
