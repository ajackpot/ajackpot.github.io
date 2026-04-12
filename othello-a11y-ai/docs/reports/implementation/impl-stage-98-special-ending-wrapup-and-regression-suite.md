# Stage 98 - 특수 종국 안전망 정리, 공용 휴리스틱 리팩토링, 회귀셋 통합

## 요약
이번 단계는 사용자 요청으로 진행한 일련의 개선 작업을 **운영 가능한 형태로 마감**하는 단계입니다.
기능 추가 자체는 앞선 단계에서 대부분 끝났고, Stage 98에서는 다음을 정리했습니다.

1. **특수 종국(special ending) 대응 로직을 공용 모듈로 정리**했습니다.
   - classic root scout와 MCTS root threat penalty가 같은 함정 평가 규칙을 보도록 맞췄습니다.
   - 즉시 wipeout 판정도 `search-engine.js`, `mcts.js`가 같은 구현을 공유하도록 옮겼습니다.

2. **회귀 케이스를 공통 픽스처/헬퍼 기반으로 묶고**, 상위 통합 스모크 `stage98_special_ending_regression_suite.mjs`를 추가했습니다.
   - 이제 `F7`, `E2`, `D2`, 직접 wipeout 루트 같은 핵심 수순이 한 곳에서 관리됩니다.

3. **문서와 메타데이터를 갱신**했습니다.
   - 현재 런타임 문서에 special-ending safety net의 발동 조건과 범위를 명시했습니다.
   - Stage 98 보고서, Stage metadata, README, report inventory를 최신 상태로 맞췄습니다.

또한 이번 보고서에서는 앞선 실제 기능 변경까지 한 번에 묶어, 이번 작업 묶음의 최종 상태를 정리합니다.

- 접근성/UI: 설정 변경 시 live 영역 자동 낭독 제거, 수동 재낭독 버튼 추가
- 오프닝: `openingRandomness=0`에서도 좁은 동점권 분기만 허용하는 tie-band 추가
- classic: root special-ending scout + 내부 immediate wipeout guard 추가
- MCTS: immediate wipeout shortcut/bias + root threat penalty 추가
- 테스트/문서: shared heuristics + unified regression suite

## 이번 작업 묶음의 최종 설계

### 1) 접근성/UI
설정 패널 변경만으로 live region이 계속 읽히면 실제 대국 중에는 방해가 큽니다.
따라서 설정 영역은 더 이상 자동으로 읽히지 않도록 하고, 사용자가 원할 때만 현재 설정을 다시 읽는 버튼을 통해 안내하게 바꿨습니다.

핵심 원칙:
- 설정 변경 자체는 **silent**
- 사용자가 명시적으로 요청했을 때만 **one-shot live announcement**

### 2) opening randomness = 0 보정
기존에는 `openingRandomness=0`이면 book / prior가 사실상 단일 선택으로 고정되는 구간이 있었고, `f5` 다음 백이 `d6`만 반복해서 두는 현상이 대표적이었습니다.

현재는 다음처럼 정리했습니다.
- preset 기반 엔진(`hard / expert / impossible` 포함)에서는
- `openingRandomness=0`이어도
- **상위 2개 분기의 비중 차이가 매우 작을 때만** 좁은 tie-band를 적용해 약한 오프닝 다양성을 허용합니다.
- 반대로 차이가 큰 분기는 여전히 deterministic하게 유지합니다.
- `custom`에서의 `0`은 기존처럼 재현 가능성을 유지합니다.

즉, “완전 무작위”가 아니라 **실전적으로 거의 동점인 book 분기만 허용**하는 구조입니다.

### 3) special-ending safety net
사용자 제보 수순은 공통적으로 다음 패턴을 보였습니다.

- 중반 탐색이 정적 평가상으로는 괜찮아 보이는 수를 선택한다.
- 그러나 상대의 정확한 반박 이후 우리 돌 수가 1~2개 수준으로 급감한다.
- 그 뒤 탈출 수가 거의 없거나, 있어도 X/C 같은 위험 칸에 몰린다.
- 결과적으로 “전멸 루프” 또는 “꼭지점 헌납”으로 연결된다.

이 류의 문제를 대응하기 위해 안전망을 세 겹으로 구성했습니다.

#### A. root special-ending scout (classic + MCTS 공통 후처리)
루트에서 일반 탐색 결과가 나온 뒤, 상위 후보 일부만 다시 3-ply 수준으로 훑어 봅니다.
여기서 평가 함수는 쓰지 않고 상태 전개와 돌 수/응수 수만 봅니다.

현재 발동 조건:
- **root에서만 1회 실행**
- root empties `<= 44`
- `analyzedMoves >= 2`
- 상위 후보 `4~6개`만 검사

즉, 항상 실행하지는 않습니다.
초반/단일강제수/이미 exact인 짧은 루트처럼 이득이 적은 구간에서는 생략됩니다.

#### B. internal immediate wipeout guard (classic / WLD)
루트 외 노드에서는 multi-ply scout를 반복하지 않고, 대신 **1-ply 즉시 wipeout 수**만 매우 싸게 확인합니다.
이 검사는 평가 함수를 쓰지 않고 비트보드 뒤집힘만 보면 되므로, 내부 노드와 depth-0 leaf에서도 부담이 작습니다.

현재 역할:
- move ordering에서 즉시 wipeout 수를 최상단으로 올림
- negamax / WLD leaf에서도 즉시 wipeout을 정확 종국값으로 처리
- trap 수의 PV에 즉시 반격 수를 드러내게 함

즉, 내부 노드는 “깊게 보지 않고도 확실한 전멸 수는 놓치지 않기”가 목표입니다.

#### C. MCTS immediate wipeout bias + root threat penalty
MCTS는 탐색 성격상 alpha-beta와 같은 leaf semantics를 그대로 쓰지 않으므로 별도 보강을 넣었습니다.

현재 구조:
- immediate wipeout root shortcut
- immediate wipeout expansion preference
- immediate wipeout rollout selection
- hybrid shallow minimax prior에서 direct wipeout terminal 반영
- root threat penalty (루트 1회, empties `<= 40`)

여기서 root threat penalty는 사실상 root special-ending scout와 같은 함정 요약을 MCTS root scoring에 주입하는 역할입니다.
반면 내부 노드에서는 classic과 마찬가지로 1-ply guard만 유지하고, 다중 ply trap preview는 돌리지 않습니다.

## 루트 / 내부 노드 발동 조건 정리

사용자가 이번 작업 중 특히 확인하고 싶어 한 질문은 “이 브루트포스/특수 탐색을 언제 켜고 언제 끌 것인가”였습니다.
현재 코드 기준 결론은 다음과 같습니다.

| 구간 | 현재 정책 | 이유 |
| --- | --- | --- |
| classic root | 조건부 1회 root scout | 함정을 정확히 거르되 루트 한정으로 비용 통제 |
| classic 내부 노드 | 1-ply immediate wipeout만 허용 | 값싸고 확실한 전멸 수만 잡아도 충분 |
| WLD 내부 노드 | 1-ply immediate wipeout 허용 | exact/WLD 의미와 잘 맞고 leaf에서도 정확 |
| MCTS root | immediate wipeout + root threat penalty | rollout 평균만으로 trap을 싫어하기 어려운 구간 보강 |
| MCTS 내부 노드 | 1-ply immediate wipeout만 유지 | MCTS 비용 통제, rollout/expansion 의미 보존 |

즉, “깊은 특수 종국 점검은 루트 1회, 내부는 초경량 즉시 체크”가 이번 저장소의 최종 채택안입니다.

## prior art 정리
이번 작업에서 참고한 공개 자료는 크게 두 축입니다.

### Egaroucid
- 기술 설명: <https://www.egaroucid.nyanyan.dev/en/technology/explanation/>
- 공개 저장소: <https://github.com/Nyanyan/Egaroucid>

참고한 핵심 포인트:
- bitboard-only fast enumeration으로 특수 종국 여부를 먼저 확인하는 발상
- legal move generation 단계에서 immediate wipeout을 강하게 취급하는 방향

이번 구현은 Egaroucid의 전체 구조를 그대로 옮긴 것이 아니라,
**browser-target JS 앱에서 감당 가능한 비용으로 줄여서 적용한 근사형**입니다.

### Edax
- 공개 소스 예시: <https://github.com/abulmo/edax-reversi/blob/master/src/endgame.c>

참고한 핵심 포인트:
- few-empties 구간에서 hole parity / square type ordering / stability cutoff 중심으로 설계를 단순화하는 방식
- 즉, 깊은 특수 로직을 어디에나 넣기보다 말기에서 ordering과 cutoff 품질을 높이는 쪽의 전통적 설계

이번 저장소는 두 방향 중간쯤에 서 있습니다.
- root에서는 Egaroucid식 trap scout를 얕게 채택
- 내부에서는 Edax류의 “더 싼 ordering / tactical guard” 쪽으로 무게를 둠

## 이번 단계의 리팩토링

### 1) `js/ai/special-endings.js` 신규 추가
다음 로직을 공용 모듈로 정리했습니다.
- immediate wipeout 판정
- 위험 탈출 칸(X/C) 판정
- trap reply severity 비교
- penalty 계산
- 3-ply trap summary 생성

이전에는 `search-engine.js`, `mcts.js`에 거의 같은 논리가 흩어져 있었는데,
이제 두 엔진 계열이 같은 규칙과 같은 숫자를 공유합니다.

### 2) 테스트 공통 헬퍼 추가
`js/test/special-ending-regression-helpers.mjs`를 추가했습니다.
포함 내용:
- 회귀 수순 문자열
- engine builder
- root scout disable helper
- classic/MCTS regression runner
- 공통 assertion helper

즉, 이제 `stage94~97`은 개별 단위 smoke이면서도,
실제 시나리오 정의와 assertion 핵심은 한 곳에서 관리됩니다.

### 3) 통합 회귀셋 추가
`js/test/stage98_special_ending_regression_suite.mjs`

이 파일은 다음을 한 번에 검증합니다.
- classic root scout
- classic/WLD immediate wipeout guard
- MCTS immediate wipeout shortcut/bias
- MCTS root threat penalty

개별 smoke는 유지하되, 운영 기준선은 `stage98` 하나로 빠르게 돌릴 수 있게 했습니다.

## 실제 회귀 요약
`benchmarks/stage98_special_ending_regression_summary.json` 기준 요약:

### classic
- case1 (`...e8`): `F7` trap penalty `334000`, 최종 선택 `F8`
- case2 (`...d1`): `E2` trap penalty `310000`, 최종 선택 `H4`
- leaf immediate wipeout: `D1`, 점수 `290000`

### MCTS
- `mcts-lite`: root shortcut `D1`, case1 `F8`, case2 `B2`
- `mcts-guided`: root shortcut `D1`, case1 `H6`, case2 `H4`
- `mcts-hybrid`: root shortcut `D1`, case1 `H6`, case2 `H4`

즉, 현재는 classic과 세 MCTS 변형 모두에서 제보 trap이 최종 선택으로 남지 않습니다.

## 관련 파일
주요 변경 파일:
- `js/ai/special-endings.js`
- `js/ai/search-engine.js`
- `js/ai/mcts.js`
- `js/test/special-ending-regression-helpers.mjs`
- `js/test/stage94_special_ending_scout_smoke.mjs`
- `js/test/stage95_immediate_wipeout_guard_smoke.mjs`
- `js/test/stage96_mcts_immediate_wipeout_bias_smoke.mjs`
- `js/test/stage97_mcts_root_threat_penalty_smoke.mjs`
- `js/test/stage98_special_ending_regression_suite.mjs`
- `benchmarks/stage98_special_ending_regression_summary.json`
- `docs/runtime-ai-reference.md`
- `docs/reports/README.md`
- `README.md`
- `stage-info.json`

## 검증
이번 단계에서 다시 실행한 주요 검증:

```bash
node js/test/stage94_special_ending_scout_smoke.mjs
node js/test/stage95_immediate_wipeout_guard_smoke.mjs
node js/test/stage96_mcts_immediate_wipeout_bias_smoke.mjs
node js/test/stage97_mcts_root_threat_penalty_smoke.mjs
node js/test/stage98_special_ending_regression_suite.mjs
node js/test/core-smoke.mjs
node js/test/perft.mjs
node js/test/stage56_opening_prior_search_integration_smoke.mjs
node js/test/stage83_custom_wld_toggle_smoke.mjs
node js/test/stage88_mcts_lite_smoke.mjs
node js/test/stage89_mcts_guided_smoke.mjs
node js/test/stage90_search_algorithm_pair_benchmark_smoke.mjs
node js/test/stage91_mcts_hybrid_smoke.mjs
node js/test/stage91_search_algorithm_pair_hybrid_smoke.mjs
node js/test/stage93_search_algorithm_availability_and_throughput_smoke.mjs
node tools/docs/generate-report-inventory.mjs --check
```

## 결론
이번 Stage 98로 이번 작업 묶음은 다음 상태로 마감할 수 있게 됐습니다.

1. **UI 접근성 문제**는 수동 재낭독 방식으로 정리됐습니다.
2. **오프닝 0-무작위의 과도한 단일화**는 좁은 tie-band로 완화됐습니다.
3. **classic의 특수 종국 허점**은 root scout + immediate wipeout guard로 막았습니다.
4. **MCTS의 같은 계열 허점**도 immediate wipeout bias + root threat penalty로 보강했습니다.
5. **중복된 특수 종국 휴리스틱**은 공용 모듈로 정리됐습니다.
6. **회귀셋과 문서**까지 저장소 내부 기준선으로 정리됐습니다.

즉, 이번 작업은 단순 버그 픽스를 넘어서,
**특수 종국 함정을 다루는 최소 비용 안전망을 classic과 MCTS 양쪽에 제품형으로 정착시킨 마감 단계**라고 볼 수 있습니다.
