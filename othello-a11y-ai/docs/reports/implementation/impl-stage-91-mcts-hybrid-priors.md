# Stage 91 - MCTS Hybrid informed-prior lane

## 요약
이번 단계에서는 `mcts-guided` 위에 **shallow minimax / alpha-beta node prior**를 얹는 `mcts-hybrid` 실험 모드를 추가했습니다.

추가/변경 파일:
- `js/ai/mcts.js`
- `js/ai/search-engine.js`
- `js/ai/search-algorithms.js`
- `js/ui/formatters.js`
- `tools/engine-match/benchmark-search-algorithm-pair.mjs`
- `js/test/stage91_mcts_hybrid_smoke.mjs`
- `js/test/stage91_search_algorithm_pair_hybrid_smoke.mjs`
- `benchmarks/stage91_mcts_guided_vs_hybrid_pilot.json`

핵심 목적은 다음과 같습니다.

1. `Lite → Guided → Hybrid` 순으로 실험 MCTS 계열을 확장할 수 있는 최소 구조를 만든다.
2. hybrid 비용을 과도하게 키우지 않기 위해, shallow minimax를 **rollout 전체가 아니라 새로 확장되는 노드의 prior**에만 사용한다.
3. 기존 guided rollout / cutoff evaluator / opening prior / ordering evaluator를 그대로 재사용해 현재 코드베이스와의 결합 비용을 낮춘다.
4. 추가한 pair benchmark 도구로 `guided vs hybrid`의 초기 상대 강도를 바로 점검한다.

## 구현 방식
이번 hybrid는 다음 원칙으로 구현했습니다.

- selection / rollout은 `mcts-guided`의 guided policy를 그대로 사용
- 새 child node를 만들 때만 shallow minimax를 호출
- minimax는 evaluator leaf + move-ordering 기반 ordering + top-k pruning을 사용
- minimax 결과를 `priorReward`와 일부 `priorPolicy`에 섞고, guided보다 약간 큰 `priorVirtualVisits`를 부여
- root가 exact/WLD 임계값에 들어가면 기존 classic exact/WLD lane이 계속 override

즉, 이번 단계의 `mcts-hybrid`는 “guided baseline 위에 informed-prior만 추가한 버전”에 가깝습니다.
rollout 전체를 alpha-beta로 바꾸는 heavier hybrid는 아직 넣지 않았습니다.

## 내부 통계
검색 통계에 아래 카운터를 추가했습니다.

- `mctsHybridPriorSearches`
- `mctsHybridPriorCacheHits`
- `mctsHybridPriorNodes`
- `mctsHybridPriorUses`

이 값들은 root result와 내부 pair benchmark 집계 JSON에도 함께 남도록 했습니다.

## 파일럿 벤치
도구:

```bash
node tools/engine-match/benchmark-search-algorithm-pair.mjs \
  --output-json benchmarks/stage91_mcts_guided_vs_hybrid_pilot.json \
  --first-algorithm mcts-guided \
  --second-algorithm mcts-hybrid \
  --games 2 \
  --opening-plies 8 \
  --time-ms-list 80,160 \
  --solver-adjudication-empties 14
```

이번 파일럿 설정:
- paired openings per bucket: `2` (`4` actual games)
- opening plies: `8`
- exact threshold during play: `8`
- solver adjudication: empties `<= 14`
- seed: `17`

`benchmarks/stage91_mcts_guided_vs_hybrid_pilot.json` 기준:

| timeLimitMs | Guided score | Hybrid score | 해석 |
| --- | ---: | ---: | --- |
| 80 | 0.0 / 4 (0%) | 4.0 / 4 (100%) | Hybrid 우세 |
| 160 | 2.0 / 4 (50%) | 2.0 / 4 (50%) | 동률 |

추가 관찰:
- `80ms` 파일럿에서는 `Hybrid`가 `Guided`보다 평균 iteration 수는 적었지만, node prior 덕분에 더 좋은 수를 고른 표본이 나왔습니다.
- `160ms`에서는 양쪽이 동률이어서, 아직 “Hybrid가 Guided를 완전히 대체한다”고 말하기는 어렵습니다.
- 현재 표본은 여전히 small pilot이므로, 난이도 preset 매핑을 확정하기에는 부족합니다.

## 현재 판단
임시 판단은 다음과 같습니다.

- `mcts-hybrid`는 적어도 **실제로 작동하는 별도 성향의 lane**으로 올라왔습니다.
- 작은 표본에서는 `80ms` 구간에서 `Hybrid` 우세가 보였고, `160ms` 구간에서는 차이가 사라졌습니다.
- 따라서 지금 단계에서는 `Hybrid > Guided`를 단정하기보다, **낮은 시간대에서 분리 가능성이 보이는지 더 확인할 가치가 있다** 정도로 보는 편이 안전합니다.

## 결론
이번 단계로 실험 MCTS 계열은 다음 3단 구조가 되었습니다.

- `mcts-lite`: random rollout baseline
- `mcts-guided`: guided policy + cutoff evaluator baseline
- `mcts-hybrid`: guided baseline + shallow minimax informed priors

다음 단계에서는 pair benchmark 표본을 조금 더 늘리거나, 실제 preset 후보 시간대(`160 / 280 / 500ms`)로 옮겨 `guided`와 `hybrid`를 다시 비교하면 됩니다.
