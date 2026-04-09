# Stage 74 MPC candidate review

## 결론

- provisional adoption: **overlap-8bucket-high-tight**
- status: **소규모 패치 단계로 이동**, 추가 대규모 MPC 재학습은 보류
- 이유: high-tight가 확장 표본에서도 d8/d10에서 가장 안정적으로 플러스였고, both-softlow는 low-cut이 거의 살아나지 않았으며, micro-patch는 단일 구간 개선은 있었지만 전체적으로 high-tight를 일관되게 넘지 못했습니다.

## 후보 구조 점검

| candidate | usable/total | module bytes | runtime | 평균 corr | 평균 holdout RMSE |
|---|---:|---:|---|---:|---:|
| baseline-4bucket-high | 4 | 13860 | mode=high, checks=1, high=1, low=1 | 0.9835 | 12008.5 |
| overlap-8bucket-high-safe | 8 | 15078 | mode=high, checks=2, high=1, low=1 | 0.9801 | 14730.7 |
| overlap-8bucket-high-tight | 8 | 15085 | mode=high, checks=2, high=0.93, low=1 | 0.9801 | 14698.4 |
| overlap-8bucket-both-softlow | 8 | 15087 | mode=both, checks=2, high=1, low=0.9 | 0.9802 | 14765.5 |

## 1차 벤치마크

| candidate | d8 nodes | d8 time | d8 same move | d10 nodes | d10 time | d10 same move | exact same score/move | low cutoffs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline-4bucket-high | 100.00% | 97.76% | 12/12 | 101.23% | 99.24% | 6/6 | 6/6 / 6/6 | 0 |
| overlap-8bucket-high-safe | 97.90% | 95.78% | 12/12 | 100.09% | 100.10% | 6/6 | 18/18 / 18/18 | 0 |
| overlap-8bucket-high-tight | 97.78% | 93.98% | 12/12 | 98.69% | 95.25% | 6/6 | 18/18 / 18/18 | 0 |
| overlap-8bucket-both-softlow | 98.27% | 95.75% | 12/12 | 102.08% | 99.04% | 6/6 | 18/18 / 18/18 | 2 |

## 확장 표본 비교

| candidate | d8(24 cases) nodes | d8(24 cases) time | d10(12 cases) nodes | d10(12 cases) time | exact(18 cases) same score/move |
|---|---:|---:|---:|---:|---:|
| overlap-8bucket-high-safe | 99.78% | 97.02% | 99.43% | 99.12% | 18/18 / 18/18 |
| overlap-8bucket-high-tight | 98.77% | 96.27% | 98.15% | 96.12% | 18/18 / 18/18 |

## high-tight micro-patch 비교

| patch | d8 nodes | d8 time | d10 nodes | d10 time | 판단 |
|---|---:|---:|---:|---:|---|
| high-tight-h95 | 97.12% | 94.69% | 100.76% | 96.88% | d8는 좋았지만 d10에서 원본 high-tight보다 열세 |
| high-tight-h90 | 97.58% | 95.54% | 99.67% | 97.14% | 중간 수준, 원본 high-tight 우세 |
| high-tight-onecheck | 97.26% | 94.01% | 97.16% | 96.79% | d8는 좋았지만 d10에서 원본 high-tight보다 열세 |

## 판단

1. **재학습을 바로 반복할 필요는 낮습니다.** 현재 학습된 후보 중에서는 overlap-8bucket-high-tight가 가장 설득력 있습니다.
2. **low-cut 확장 학습은 아직 보류**가 맞습니다. both-softlow는 sampled d10에서 low cutoff가 거의 발생하지 않았고 overall도 high-tight보다 못했습니다.
3. **다음 단계는 소규모 패치/채택 검증**이 적절합니다. 즉, high-tight를 active candidate로 올린 뒤 더 큰 benchmark batch 또는 실제 엔진 대국에서 확인하는 순서가 좋습니다.

## 설치 상태

- active generated module: `trained-mpc-overlap-8bucket-high-tight`
- installer added: `tools/evaluator-training/install-mpc-profile.mjs` / `.bat`
- selected profile snapshot: `tools/evaluator-training/out/stage74-selected-mpc-profile.json`
