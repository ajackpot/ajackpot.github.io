# 구현 검토 보고서 Stage 9 — exact window 전용 late ordering profile 재설계

## 이번 단계 목표
- Stage 8에서 추가한 exact-teacher bucketed ordering score를 **실제 exact search tree 감소**로 더 잘 연결한다.
- root ranking 지표뿐 아니라, 실제 `findBestMove()`의 노드 수와 시간까지 줄어드는지 다시 확인한다.
- 웹 앱의 실제 시간 제한(최대 15초) 안에서 의미 있는 개선이 있는지도 함께 본다.

## Stage 8까지의 상태 정리
Stage 8에서는 다음 두 가지를 얻었습니다.

1. `MoveOrderingEvaluator`가 child empties 기준으로 late bucket 문맥을 보게 됨
2. child empties `9~12` 구간에 exact teacher 기반 bucketed weight를 넣음

그 결과 10~13 empties holdout root-ordering 품질은 좋아졌지만,
13 empties exact-search benchmark에서는 **노드 수 감소가 거의 없었습니다.**

즉, Stage 8의 한계는 “ordering score의 품질”보다도,
그 점수가 **기존 ordering 결합 방식 안에서 충분히 강하게 작동하지 못했다**는 쪽에 더 가까웠습니다.

## 이번 단계에서 실제로 확인한 점

### 1) 13~14-empty trained bucket을 더 추가해도, root top move는 작은 표본에서 바로 크게 바뀌지 않았다
14 empties exact teacher 소표본(훈련 seeds `101~103`, holdout seeds `104~105`)을 다시 뽑아 보니,
child empties `13~14` 구간에서는 단순한 조합
- mobility `+2000`
- edgePattern `+1000`

이 훈련 표본에서는 맞는 방향을 보였지만,
`orderMoves()`의 root top move 자체는 Stage 8과 비교해 holdout에서 바뀌지 않았습니다.

즉, **bucket 확장만으로는 즉시 root ranking이 크게 달라지지 않았습니다.**

### 2) 실제 gain은 “trained score를 exact window에서 더 강하게 반영하는 결합 방식”에서 나왔다
현재 엔진의 move ordering은 기본적으로
- TT move
- corner move
- killer/history
- positional/risk
- 상대 기동성 / 코너 응수 / 지역 패리티
- lightweight ordering evaluator

를 모두 더하는 구조입니다.

이 구조에서 Stage 8의 exact-teacher bucket은 들어갔지만,
exact endgame 구간에서는 여전히
**generic positional/history ordering 신호가 너무 강하고, trained late-ordering 신호는 상대적으로 약한 편**이었습니다.

그래서 이번 단계는 ordering evaluator 자체보다,
**exact window에서 어떤 ordering 신호를 더 믿을지**를 다시 정리하는 쪽으로 방향을 옮겼습니다.

## 이번에 반영한 코드 변경

### 1) child empties `13~14` exact-teacher bucket 추가
파일:
- `js/ai/evaluator.js`

추가된 bucket:
- child empties `13~14`
  - mobility `+2000`
  - edgePattern `+1000`

의도:
- 14-empty exact 구간 바로 바깥/직전에서 trained ordering score가 아예 fallback으로만 남지 않도록,
  작은 teacher bucket을 하나 더 열어 둠

주의:
- 작은 표본에서는 이 bucket만으로 root top move가 달라지지는 않았습니다.
- 이번 단계의 실질적인 성능 개선은 아래 search-engine 결합 방식 변경에서 더 크게 나왔습니다.

### 2) exact window 전용 late ordering profile 추가
파일:
- `js/ai/search-engine.js`

새 메서드:
- `selectLateOrderingProfile(empties)`

핵심 아이디어:
- **exact endgame 창 안**에서는 generic positional/history ordering을 줄이고,
  trained lightweight ordering signal, 상대 기동성 억제, corner reply 억제, parity ordering bonus를 더 강하게 반영
- exact 직전의 pre-exact late 구간에서는 그보다 약한 완화 profile 적용
- 그 밖의 구간은 기존 scale 유지

exact window profile:
- killer bonus: 축소
- history / positional / flip / risk penalty: 축소
- mobility penalty / corner-reply penalty / parity ordering: 약간 강화
- lightweight ordering evaluator: **3배**

pre-exact late profile:
- history / positional / flip / risk 쪽을 완만하게 줄임
- lightweight ordering evaluator: **1.75배**

해석:
- exact 구간에서는 “일반적인 중반 positional 감각”보다
  **late tactical truth에 더 가까운 ordering 신호**를 우선시하는 쪽이 더 논리적입니다.
- 이번 변경은 그 정책을 search-engine 레벨에서 명시한 것입니다.

### 3) 회귀 테스트 추가
파일:
- `js/test/core-smoke.mjs`

추가 확인:
- `selectTrainedBucket(13)`가 Stage 9의 13~14 bucket을 실제로 노출하는지
- exact window profile에서 `lightweightEvalScale > 1`
- exact window profile에서 `positionalScale < 1`

즉, 테스트가 이제
“exact 창 안에서는 trained ordering을 더 믿고, generic positional ordering은 덜 믿는다”
는 정책을 직접 고정합니다.

## 검증 결과

실행한 회귀/스모크 테스트:

- `node js/test/core-smoke.mjs`
- `node js/test/perft.mjs`
- `python3 tests/virtual_host_smoke.py`
- `python3 tests/ui_smoke.py`

모두 통과했습니다.

## 벤치마크 결과

### A) 14-empty root ordering train/holdout
파일:
- `benchmarks/ordering_exact_14_train_holdout_stage8_vs_stage9.json`

구성:
- 훈련 seeds: `101, 102, 103`
- holdout seeds: `104, 105`
- exact score는 별도 exact teacher로 계산
- 비교 대상은 `orderMoves()`의 root top move

결과:
- training:
  - Stage 8 top-1: `0.3333`
  - Stage 9 top-1: `0.3333`
  - mean top rank / regret도 동일
- holdout:
  - Stage 8 top-1: `1.0`
  - Stage 9 top-1: `1.0`
  - mean top rank / regret도 동일

해석:
- 13~14 bucket 확장만으로는 root top ordering이 바로 좋아졌다고 말하기 어렵습니다.
- 즉, 이번 단계의 실질 이득은 **root top ranking 개선**이 아니라
  **exact search 내부 tree shape 개선** 쪽에서 나왔습니다.

### B) 13 empties exact-search benchmark
파일:
- `benchmarks/ordering_search_13empties_stage8_vs_stage9.json`

설정:
- seeds `31~34`
- `maxDepth=4`
- `exactEndgameEmpties=16`

결과:
- Stage 8 mean nodes: `17788.75`
- Stage 9 mean nodes: `17302.25`
- Stage 8 mean ms: `1510.60`
- Stage 9 mean ms: `1414.45`
- best move / score agreement: 전 표본 일치

해석:
- Stage 9부터는 13-empty exact-search에서 **평균 노드 수가 실제로 감소**했습니다.
- 감소 폭은 크지 않지만, Stage 8에서 거의 보이지 않던 search-efficiency gain이
  이번 단계부터는 숫자로 확인됩니다.

### C) 14 empties exact-search benchmark (사용자 예산 15초)
파일:
- `benchmarks/ordering_search_14empties_stage8_vs_stage9.json`

설정:
- seeds `104, 105`
- `maxDepth=4`
- `exactEndgameEmpties=16`
- 앱과 동일한 15초 제한

결과:
- Stage 8 mean nodes: `90597.5`
- Stage 9 mean nodes: `59988.5`
- Stage 8 mean ms: `8256.90`
- Stage 9 mean ms: `5451.93`

개별적으로 보면:
- seed `104`에서 Stage 8은 첫 완주 iteration을 끝내지 못해 fallback(`score=-1e9`, move `A2`)으로 끝났고,
- Stage 9은 같은 15초 예산 안에서 exact line을 끝까지 읽어 `A8`, `-80000`을 반환했습니다.

해석:
- 이것은 단순한 미세 개선이 아니라,
  **웹 앱의 실제 시간 제한 안에서 결과 품질 자체를 바꾼 개선**입니다.
- 즉, Stage 9의 ordering profile 변경은 exact window에서 실전성이 있습니다.

### D) 14 empties exact-search benchmark (제한 완화)
파일:
- `benchmarks/ordering_search_14empties_unlimited_stage8_vs_stage9.json`

설정:
- seeds `104, 105`
- `maxDepth=4`
- `exactEndgameEmpties=16`
- 내부 옵션을 직접 바꿔 시간 제한 사실상 해제

결과:
- Stage 8 mean nodes: `92764`
- Stage 9 mean nodes: `59988.5`
- Stage 8 mean ms: `8262.79`
- Stage 9 mean ms: `5327.75`
- best move / score agreement: 전 표본 일치

해석:
- Stage 9의 이득은 단지 timeout 회피만이 아닙니다.
- 시간 제한을 사실상 풀어도,
  **같은 정답 move/score를 유지하면서 exact-search tree 자체가 더 작아졌습니다.**

## 이번 단계 결론

### 얻은 것
- exact window 안에서 generic positional/history ordering을 줄이고,
  trained late-ordering signal을 더 강하게 반영하는 **전용 ordering profile**을 만들었습니다.
- 그 결과 Stage 8에서는 거의 보이지 않던 node 감소가
  Stage 9부터는 13 empties와 14 empties exact-search benchmark에서 실제로 관찰됐습니다.
- 특히 14 empties에서는 웹 앱의 15초 예산 안에서
  **Stage 8이 fallback으로 끝나던 케이스를 Stage 9이 정상 exact 결과로 바꾸는 개선**이 있었습니다.

### 아직 남은 한계
- 13~14 bucket 자체만 놓고 보면, 작은 train/holdout root-ordering 샘플에서 top move를 바로 바꾼 것은 아닙니다.
- 즉, 현재 gain의 핵심은 “teacher bucket 추가”보다
  **search-engine의 exact-window 결합 방식 개선**입니다.
- 15~18 empties 쪽은 아직 fallback 경량 평가기 의존도가 남아 있습니다.

## 판단
이번 단계는 Stage 8의 “trained ordering score를 만들어 두었지만 tree reduction은 작던 상태”에서,
그 점수를 **exact search 내부에서 실제로 먹히게 만든 단계**입니다.

즉, 이번 단계의 핵심은
“평가기만 더 만들었다”가 아니라,
**exact window에서는 어떤 ordering 신호를 더 신뢰할지 구조적으로 다시 정리했다**
는 데 있습니다.

## 다음 단계 추천
1. **15~18 empty bucket도 teacher 기반으로 더 보강**
   - 지금은 13~14까지만 추가 bucket이 있고, 더 이른 late 구간은 fallback 비중이 큼

2. **endgame ordering profile의 수치 자체를 더 직접 튜닝**
   - 현재 수치는 benchmark 기반의 수작업 보정
   - 작은 search-cost objective로 더 미세 조정 가능

3. **learned pattern evaluation 쪽으로 이동 여부 재평가**
   - move ordering gain이 보이기 시작했으므로,
   - 다음 투자 우선순위가 ordering 추가 보정인지, full evaluator 학습인지 다시 비교할 수 있음

## 이번 단계에서 변경한 파일
- `js/ai/evaluator.js`
- `js/ai/search-engine.js`
- `js/test/core-smoke.mjs`
- `README.md`
- `benchmarks/ordering_exact_14_train_holdout_stage8_vs_stage9.json`
- `benchmarks/ordering_search_13empties_stage8_vs_stage9.json`
- `benchmarks/ordering_search_14empties_stage8_vs_stage9.json`
- `benchmarks/ordering_search_14empties_unlimited_stage8_vs_stage9.json`
- `review-stage-09-exact-window-late-ordering-profile-redesign.md`
