# Stage 84 Implementation - Exact micro-solver threshold extension

## 목표

이미 Stage 22/23에서 도입한 **exact 전용 bitboard alpha-beta few-empties solver**를 조금 더 넓은 말기 구간까지 재사용할지 검토하고, 채택 가능한 기본값을 정합니다.

핵심 아이디어는 다음과 같습니다.

- 새 알고리즘을 추가로 넣기보다, 이미 검증된 exact-only board solver를 더 넓은 tail window에 재사용한다.
- 이 경로 안에서는 상태 객체/TT/PVS 레이어를 거치지 않으므로, final plies에서 JS 오버헤드를 줄일 수 있다.
- WLD는 건드리지 않고 exact bucket에만 적용한다.

## 구현 내용

1. `optimizedFewEmptiesExactSolverEmpties` 옵션을 추가했습니다.
   - 허용 범위: `4..8`
   - Stage 84 채택 기본값: `6`
2. exact-only board solver 진입 조건을 `empties <= threshold`로 확장했습니다.
3. widened few-empties solver 내부에 **exact fastest-first reply-count ordering**을 추가했습니다.
4. 통계 항목을 추가했습니다.
   - `optimizedFewEmpties5Calls..8Calls`
   - `optimizedFewEmptiesFastestFirstSorts`
   - `optimizedFewEmptiesFastestFirstPassCandidates`
5. WLD small solver 경로는 변경하지 않았습니다.

## 결과 요약

자세한 숫자는 `benchmarks/stage84_exact_micro_solver_threshold_summary.json`에 정리했습니다.

실무 판단만 요약하면:

- `threshold = 4` : 기존 Stage 83 baseline
- `threshold = 6` : exact-8 / exact-10 / normal / hard 쪽에서 가장 안정적
- `threshold = 8` : heavier exact-14 spot-check에서는 좋아 보였지만, 더 일반적인 median-of-three preset 검증에서는 6을 일관되게 넘지 못함

## 채택 판단

- **채택**: `optimizedFewEmptiesExactSolverEmpties = 6`
- **보류**: 기본값 `8`

채택 이유:

1. exact bucket 성능 향상은 분명했고,
2. exact score는 샘플 세트에서 유지됐으며,
3. WLD는 구조적으로 그대로였고,
4. 기본값 8은 일부 무거운 bucket에서는 좋아도, 더 일반적인 preset-level 검증에서 6보다 안정적이지 않았습니다.

## 후속 메모

- 차후 stronger preset 전용 follow-up을 한다면 `threshold = 8`을 다시 검토할 수 있습니다.
- 다만 baseline default는 보수적으로 `6`이 더 적절했습니다.
