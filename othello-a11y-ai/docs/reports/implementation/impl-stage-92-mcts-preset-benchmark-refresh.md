# Stage 92 - MCTS preset-time benchmark refresh and multi-seed pair sampling

## 요약
이번 단계에서는 내부 pair benchmark 도구에 **multi-seed sampling**을 추가하고, 그 도구로 `mcts-guided`와 `mcts-hybrid`를 실제 preset 시간대인 `160 / 280 / 500ms`에서 다시 측정했습니다.

추가/변경 파일:
- `tools/engine-match/benchmark-search-algorithm-pair.mjs`
- `js/test/stage92_search_algorithm_pair_multiseed_smoke.mjs`
- `benchmarks/stage92_mcts_guided_vs_hybrid_preset_refresh.json`

핵심 목적은 다음과 같습니다.

1. 파일럿(`80 / 160ms`)에서 보였던 `guided vs hybrid` 차이가 실제 preset 시간대에서도 유지되는지 확인한다.
2. 작은 single-seed pilot의 분산을 줄이기 위해 **seed를 늘린 paired openings**로 다시 측정한다.
3. 결과를 바탕으로 `Lite / Guided / Hybrid`를 난이도 또는 실험 슬롯에 어떻게 배치할지 임시 초안을 잡는다.

## 도구 변경
기존 pair benchmark는 한 번의 seed에서만 opening pair를 생성했습니다.
이번 단계에서는 다음을 추가했습니다.

- `--seed-list 17,31` 형태의 multi-seed 입력
- 시나리오별 `seedCount`, `pairedOpeningsPerSeed`, `seedList` 출력
- 같은 time bucket 안에서 seed마다 `games`개의 opening pair를 실행하여 표본을 손쉽게 확장

즉, 이제 한 번의 실행으로 아래와 같은 샘플링이 가능합니다.

```bash
node tools/engine-match/benchmark-search-algorithm-pair.mjs \
  --output-json benchmarks/stage92_mcts_guided_vs_hybrid_preset_refresh.json \
  --first-algorithm mcts-guided \
  --second-algorithm mcts-hybrid \
  --games 3 \
  --opening-plies 10 \
  --seed-list 17,31 \
  --time-ms-list 160,280,500
```

이 설정은 bucket당 다음을 뜻합니다.

- seed 수: `2`
- paired openings per seed: `3`
- total paired openings: `6`
- actual games: `12`

## 벤치 설정
이번 refresh 실행은 아래 설정을 사용했습니다.

- first algorithm: `mcts-guided`
- second algorithm: `mcts-hybrid`
- time buckets: `160 / 280 / 500ms`
- opening plies: `10`
- seeds: `17, 31`
- paired openings per seed: `3`
- total paired openings per bucket: `6`
- total games per bucket: `12`
- exact threshold during play: `8`
- solver adjudication: empties `<= 14`
- max table entries: `90000`

## 결과
`benchmarks/stage92_mcts_guided_vs_hybrid_preset_refresh.json` 기준:

| timeLimitMs | Guided score | Hybrid score | 해석 |
| --- | ---: | ---: | --- |
| 160 | 8.0 / 12 (66.7%) | 4.0 / 12 (33.3%) | Guided 우세 |
| 280 | 5.5 / 12 (45.8%) | 6.5 / 12 (54.2%) | Hybrid 미세 우세 |
| 500 | 5.5 / 12 (45.8%) | 6.5 / 12 (54.2%) | Hybrid 미세 우세 |

추가 관찰:

- 이번 refresh에서는 `160 / 280 / 500ms` 전 구간에서 두 알고리즘 모두 fallback 비율이 `0%`였습니다.
- `Hybrid`는 shallow minimax prior 비용 때문에 turn당 평균 iteration 수는 `Guided`보다 적었습니다.
- 그럼에도 `280 / 500ms`에서는 점수상 소폭 우세가 나왔고, `160ms`에서는 반대로 `Guided`가 더 안정적으로 우세했습니다.
- 즉, **Hybrid가 항상 Guided보다 낫다**거나, 반대로 **Guided가 전 시간대에서 더 강하다**고 단정할 정도로 차이가 크지 않았습니다.

## 현재 판단
이번 refresh 기준의 임시 판단은 다음과 같습니다.

1. `mcts-guided`는 `160ms` 버킷에서 더 안정적입니다.
   - beginner/easy 같은 더 짧은 실험 슬롯으로 내릴수록 `Guided`보다 `Hybrid`가 유리하다고 보기는 어렵습니다.

2. `mcts-hybrid`는 `280 / 500ms`에서 **소폭 우세 가능성**은 보였지만, 아직 분리 폭이 충분히 크지 않습니다.
   - 이번 표본만으로 `normal` 시간대의 기본 실험 MCTS를 `Hybrid`로 확정하는 것은 이릅니다.

3. 실제 배치 초안은 아래 방향이 가장 안전합니다.
   - `MCTS Lite`: 의도적으로 약한 beginner/easy 실험 슬롯
   - `MCTS Guided`: 현재 기준의 **주력 baseline experimental MCTS**
   - `MCTS Hybrid`: 아직은 별도 실험 슬롯 유지, 더 큰 표본 확보 전까지 auto-promotion 보류

즉, 이번 단계 결과는 `Guided`를 완전히 밀어내는 `Hybrid` 승격 근거라기보다, **Hybrid가 중간 시간대 이상에서 sidegrade/upgrade 가능성을 보였으니 추가 측정을 할 가치가 있다**는 쪽에 가깝습니다.

## 결론
이번 단계로 다음 두 가지가 정리되었습니다.

1. pair benchmark 도구가 이제 **multi-seed 기반 재측정**까지 감당할 수 있게 되었습니다.
2. `guided vs hybrid`는 실제 preset 시간대에서 **명확한 단일 승자보다 시간대별 성향 차이**에 가깝다는 점이 드러났습니다.

따라서 다음 단계에서는 아래 둘 중 하나가 자연스럽습니다.

- paired openings 수를 더 늘려 `280 / 500ms` 차이가 유지되는지 재확인한다.
- 또는 현재 결과를 기준으로 UI 난이도 설명/실험 모드 설명에 임시 배치 문구만 추가하고, auto-mapping은 보류한다.
