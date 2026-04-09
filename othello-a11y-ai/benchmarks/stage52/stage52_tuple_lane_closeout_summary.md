# Stage 52 tuple evaluator close-out

## 결론

- **현재 채택 유지**: `top24-retrain-retrained-calibrated-lateb-endgame`
- **업로드된 2차 전체 재학습 결과**: **실질적 진전 없음**
- **다음 우선순위**: **MPC / search pruning**
- **evaluator 재오픈 조건**: 같은 layout 반복 재학습이 아니라 **layout family 변경**이 있을 때만

## 확인 결과

### 1) 업로드한 2차 재학습 candidate vs 이미 채택된 candidate

- runtime equivalent: `True`
- exact object equality: `False`
- metadata-only difference: `True`
- top-level diff keys: `description, name, patch, source`
- shared evaluator semantic hash: `3329ca1f7f149e4c5483195badef4af92215b6cf962b071e8903c84a0617bd3b`
- shared trainedBuckets hash: `d2e2bc44b0d79124ec29455c7e0f0e181cfaeee5c5fc9ef7627fd75417374d7e`

즉, **가중치/버킷/layout 기준 evaluator는 이미 채택한 후보와 동일**합니다.
달라진 것은 이름/설명/source/patch metadata 정도입니다.

### 2) 업로드한 candidate JSON vs 업로드한 generated.js

- runtime equivalent: `True`
- exact object equality: `False`
- metadata-only difference: `True`
- top-level diff keys: `patch`

즉, 업로드한 `generated.js`는 **런타임 동작은 맞지만** `patch` provenance metadata가 빠져 있었습니다.

### 3) 업로드한 generated.js 직접 활성화 테스트

- status: `passed`
- stdout: `core-smoke: all assertions passed`

따라서 `generated.js`가 **기능적으로 잘못된 것은 아니고**, provenance 보존만 부족했습니다.

### 4) stage52 수정사항

- tuple profile JSON -> `generated.js` 재생성 시 `patch` metadata 보존
- `compare-tuple-residual-profiles.mjs/.bat` 추가
- active generated module을 다시 생성해 **JSON과 generated.js가 exact match**하도록 정리

## 최종 판단

이번 2차 전체 재학습은 **같은 evaluator family / 같은 patched layout 안에서는 사실상 수렴**한 것으로 보는 편이 맞습니다.
따라서 이 lane은 여기서 마무리하고,

1. **현재 late-b/endgame 채택본 유지**
2. **MPC / search pruning으로 다음 단계 이동**
3. evaluator를 다시 만질 때는 **새 epochs가 아니라 새 layout family**를 먼저 고려

가 가장 적절합니다.
