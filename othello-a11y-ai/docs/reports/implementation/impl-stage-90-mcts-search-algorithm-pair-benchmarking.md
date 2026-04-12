# Stage 90 - MCTS Lite vs Guided pair benchmarking

## 요약
이번 단계에서는 `mcts-lite`와 `mcts-guided`를 **같은 random opening에서 색을 바꿔 두 번씩** 붙이는 내부 벤치 도구를 추가했습니다.

추가 파일:
- `tools/engine-match/benchmark-search-algorithm-pair.mjs`
- `js/test/stage90_search_algorithm_pair_benchmark_smoke.mjs`
- `benchmarks/stage90_mcts_lite_vs_guided_pilot.json`

핵심 목적은 다음과 같습니다.

1. 난이도 배치 전에 `Lite`와 `Guided`의 상대 강도를 빠르게 확인한다.
2. 같은 opening을 색만 바꿔 두어 흑/백 편향을 줄인다.
3. 후반은 기존 classic exact lane으로 adjudication하여 벤치 시간을 줄인다.
4. 이후 `mcts-hybrid`가 추가되면 같은 도구로 다시 비교한다.

## 벤치 방식
기본 도구는 다음과 같이 실행합니다.

```bash
node tools/engine-match/benchmark-search-algorithm-pair.mjs \
  --output-json benchmarks/stage90_mcts_lite_vs_guided_pilot.json \
  --first-algorithm mcts-lite \
  --second-algorithm mcts-guided \
  --games 3 \
  --opening-plies 10 \
  --time-ms-list 60,120,240
```

이번 파일럿에서는 다음 설정을 사용했습니다.

- paired openings per bucket: `3` (`6` actual games)
- opening plies: `10`
- exact adjudication: empties `<= 12`
- exact threshold during play: `8`
- max depth: `4`
- 같은 opening pair를 `60 / 120 / 240ms` 전 시간 버킷에서 재사용

## 파일럿 결과
`benchmarks/stage90_mcts_lite_vs_guided_pilot.json` 기준:

| timeLimitMs | Lite score | Guided score | 해석 |
| --- | ---: | ---: | --- |
| 60 | 1.0 / 6 (16.7%) | 5.0 / 6 (83.3%) | Guided 우세 |
| 120 | 0.5 / 6 (8.3%) | 5.5 / 6 (91.7%) | Guided 크게 우세 |
| 240 | 0.0 / 6 (0%) | 6.0 / 6 (100%) | Guided 완전 우세 |

추가 관찰:
- 이번 파일럿에서는 `60 / 120 / 240ms` 전 구간에서 두 알고리즘 모두 search completion fallback 비율이 `0%`였습니다.
- `Guided`는 `Lite`보다 평균 iteration 수는 적었지만, evaluator / progressive bias / heavy playout 덕분에 더 좋은 수를 고르는 경향이 확인되었습니다.
- 현재 표본에서는 `Guided`의 우세가 **아주 낮은 시간 버킷(60ms)** 부터 이미 나타났습니다.

## 현재 판단
현 시점의 임시 판단은 다음과 같습니다.

- 강도 기준으로는 `mcts-guided`가 `mcts-lite`보다 **일관되게 강합니다**.
- 따라서 향후 난이도 배치에서 `Lite`는 “Guided가 아직 불안정해서”가 아니라, **의도적으로 더 약하고 더 엉뚱한 실험 모드**로 배치하는 쪽이 자연스럽습니다.
- preset 매핑 초안으로는 아래 방향이 맞습니다.
  - `beginner / easy` 쪽 후보: `mcts-lite`
  - 그보다 높은 실험 버킷 후보: `mcts-guided`

다만 이번 결과는 여전히 small pilot이므로, 실제 preset 연결 전에 아래 추가 확인이 필요합니다.

1. paired openings 수를 더 늘린 재실행
2. 실제 preset time (`160 / 280 / 500ms`) 중심 재측정
3. `mcts-hybrid` 추가 후 `guided vs hybrid` 재비교

## 결론
이번 단계로 **난이도 배치용 근거를 쌓는 최소 벤치 인프라**가 준비되었고, 첫 파일럿 기준으로는 `Guided > Lite` 방향성이 분명하게 보이기 시작했습니다. 다음 구현 단계에서는 이 도구를 그대로 재사용해 `mcts-hybrid`를 붙인 뒤, `guided` 대비 실제로 분리되는지 확인하면 됩니다.
