# Stage 102 - Othello Sensei 조사와 MCTS proof telemetry / UI annotation

## 이번 단계의 목표

직전 Stage 101까지는 다음이 확보되어 있었다.

1. MCTS late solved-subtree lane (`mctsSolverEnabled = true`)
2. root proof 이후 exact continuation (`mctsExactContinuationEnabled = true`)

하지만 **이 proof 정보들을 사용자가 실제로 이해할 수 있는 형태로 surface하고 있는가**는 아직 별도 검토가 없었다.
또한 proof-number / PN/PPN을 실제로 붙이기 전에, 공개 사례 중 가장 유의미해 보이는 **Othello Sensei가 어떤 구조로 proof-oriented 정보를 계산하고 노출하는지**를 코드 수준에서 먼저 확인할 필요가 있었다.

이번 Stage의 목표는 세 가지였다.

- Othello Sensei의 공개 구조를 조사한다.
- 그 외 공개 Othello 도구/엔진 사례도 함께 훑어 본다.
- 조사 결과를 바탕으로, 현재 저장소에서 바로 채택 가능한 **proof-oriented runtime/UI lane**을 구현한다.

## 조사 결론

### 1. Othello Sensei는 "별도 PN 모드"보다 "proof-oriented annotation 시스템"에 더 가깝다

README 공개 설명만 보면 Sensei는 다음을 강조한다.

- depth 1에서는 pattern-based evaluation
- deeper search에서는 unpublished tree-search algorithm
- alpha-beta 대비
  - continuous updates
  - solve까지 남은 시간/작업량 추정
  - opening book에서 "interesting" position 확장

즉, 처음부터 **검색 모드 자체를 PN/PPN으로 노출한다기보다, 탐색 중 얻게 되는 proof/certainty 관련 정보를 제품 표면에 올리는 성격**이 강하다.

그리고 실제 코드 구조를 더 보면 이 해석이 더 강해진다.

- `engine/` 아래에 `evaluatealphabeta`, `estimators`, `book`, `thor`, `playagainstsensei` 등 엔진 모듈이 분리되어 있다.
- `lib/ffi/ffi_engine.dart`에는 `Annotations` FFI 구조가 있고, 여기에
  - `prob_lower_eval`
  - `prob_upper_eval`
  - `proof_number_lower`
  - `disproof_number_upper`
  - `lower`, `upper`, `weak_lower`, `weak_upper`
  등이 직접 올라온다.
- `lib/state.dart`는 `GetCurrentAnnotations()` / `GetStartAnnotations()`를 호출해 이 annotation tree를 Flutter state로 복사한다.
- `engine/evaluatealphabeta/evaluator_alpha_beta.*`에는
  - `MoveIteratorDisproofNumber`
  - `VisitedToDisprove()`
  - `VisitedToProve()`
  등이 존재한다.
- `engine/estimators/endgame_time.h`에는 `ProofNumber(...)`, `DisproofNumberOverProb(...)` 같은 estimator가 있다.

즉, Sensei는 **알파베타 기반 solver/estimator 위에 proof/disproof/certainty annotation을 얹고, 그것을 FFI를 통해 그대로 UI에 노출하는 구조**로 보는 편이 맞다.

이것은 중요한 시사점을 준다.

> 우리 저장소도 PN/PPN full-mode를 당장 별도 top-level 엔진 모드로 추가하기 전에,
> 이미 확보한 late solver / exact continuation 결과를 proof-oriented telemetry로 구조화해 UI에 올리는 것이 더 자연스럽다.

### 2. 공개 Othello 도구 중 Sensei는 proof-oriented 제품 표면이 유난히 강한 편이다

공개 소개 기준으로 확인한 주요 사례는 다음과 같다.

- **Sensei**: move square에 evaluation + proof distance / probability를 보여 준다.
- **Saio**: eval best/all moves, library values, archive stats, endgame tutor를 강조한다.
- **Edax**: fast bitboard engine, PVS(alpha-beta), hash table, pattern eval, MultiProbCut 같은 강한 엔진 코어를 강조한다.
- **WZebra**: 오래된 분석 툴이지만 analysis / Thor archive / solving 기능 중심이다.

즉, 공개 설명 레벨에서는 **move-by-move proof distance / certainty를 UI 전면에 드러내는 사례는 Sensei가 가장 직접적**이었다.
반면 proof-number 계열 그 자체는 연구 문헌에서는 Othello 실험 도메인으로 분명히 존재한다.

- Weak Proof-Number Search는 Othello 실험을 포함한다.
- PPNS 관련 case study도 Othello/Connect Four를 다룬다.

따라서 이번 Stage의 결론은 다음과 같다.

1. **연구 레벨**에서는 Othello + proof-number류가 낯설지 않다.
2. **제품/앱 레벨**에서는 Sensei처럼 proof-oriented annotation을 전면에 내세운 사례가 드물다.
3. 그러므로 우리 저장소의 다음 코드 단계는 **full PN mode보다 proof telemetry/UI lane**이 우선이다.

## 채택 판정

- **채택**: MCTS proof telemetry / UI annotation lane
- **기본값**: 활성 (별도 strength-risk 없음)
- **비채택**: 이번 Stage에서 PN/PPN full-mode 자체를 top-level search algorithm으로 노출하는 작업

판정 이유는 단순하다.

- 현재 저장소에는 이미 Stage 100/101을 통해 **late proof substrate**가 있다.
- 하지만 proof 결과가 사용자에게는 그냥 `isWldResult`, `isExactResult` 플래그 정도로만 보였다.
- Sensei 조사 결과, 공개 사례의 핵심 가치는 proof search 자체뿐 아니라 **그 진행 상태와 certainty를 사용자가 읽을 수 있게 surface하는 데** 있었다.
- 이 lane은 strength regression 위험이 사실상 없고, 이후 PN/PPN prototype을 올릴 때도 UX/관측 기반으로 재사용 가능하다.

## 실제 구현 내용

### 1. `SearchEngine`에 MCTS proof telemetry 추가

`js/ai/search-engine.js`

새 메서드:

- `createMctsProofTelemetry(result)`
- `attachMctsProofTelemetry(result)`

여기서 계산하는 항목:

- root solved 여부 / solved outcome / exact 여부 / solved source
- analyzed root move 수, solved move 수, exact solved move 수, unresolved move 수
- solved coverage / exact coverage
- solved move outcome 분포 (win/draw/loss)
- best move solved 상태
- root가 late solver window 안에 있는지
- continuation 설정/창/attempt/applied 여부
- solver probe / hit / propagation / root proof 통계 요약

### 2. MCTS 최종 반환값에 telemetry 부착

`findBestMove()`의 MCTS 경로와 MCTS forced-pass 경로에서 최종 result에

- `mctsProofTelemetry`

를 붙이도록 했다.

이제 UI나 디버깅 코드가 `mctsProofTelemetry`만 읽어도 root proof 상태를 바로 해석할 수 있다.

### 3. UI formatter에 proof summary 추가

`js/ui/formatters.js`

추가:

- `formatMctsProofSummary(result)`

표시 내용:

- 루트가 exact인지 WLD인지
- 후보 증명 coverage
- exact/WLD/unresolved 분포
- proof source
- continuation 적용 여부
- root가 late-solver 창 안에 있는지

### 4. 상태 패널에 `말기 proof` 문장 노출

`js/ui/app-controller.js`

기존 "최근 AI 탐색" 블록 아래에, MCTS 결과이고 proof telemetry가 존재할 때만

- `말기 proof:`

줄을 추가로 렌더링한다.

이로써 사용자는 단순히 추천 수와 평가값만 보는 것이 아니라,

- 지금 결과가 root exact인지
- 단지 WLD proof인지
- root exact continuation이 적용됐는지
- 몇 개 후보가 실제로 solved 상태인지

를 바로 읽을 수 있다.

## 예시 해석

예를 들어 Stage 101 대표 late root에서 continuation이 적용되면, 상태 패널에는 대략 다음과 같은 정보가 뜬다.

- 루트 exact 승리
- 후보 증명 5/5
- 정확 5, WLD 0, 미해결 0
- 출처 root exact continuation
- continuation 적용
- root late-solver 창 안

반대로 root가 아직 exact까지는 안 올라가고 WLD proof만 얻은 경우에는,

- 루트 WLD 승리/패배/무승부
- 후보 증명 coverage
- unresolved move 수
- continuation 창 안/미완료 여부

를 보여 준다.

즉, Sensei처럼 "증명과 certainty를 UI로 surface한다"는 방향을 현재 저장소 구조에 맞게 가장 가볍게 이식한 셈이다.

## 회귀 및 스모크

확인한 테스트:

- `node js/test/core-smoke.mjs`
- `node js/test/stage100_mcts_solver_runtime_smoke.mjs`
- `node js/test/stage100_mcts_solver_late_accuracy_smoke.mjs`
- `node js/test/stage101_mcts_exact_continuation_runtime_smoke.mjs`
- `node js/test/stage101_mcts_exact_continuation_benchmark_smoke.mjs`
- `node js/test/stage102_mcts_proof_telemetry_runtime_smoke.mjs`

모두 통과했다.

## 이번 Stage의 의미

이번 단계는 PN/PPN full-mode를 직접 넣은 단계가 아니다.
대신 다음 두 가지를 확보했다.

1. **Sensei류의 proof-oriented 제품 표면이 왜 의미가 있는지**를 공개 구조 기준으로 확인했다.
2. 현재 저장소에서도 **late proof / exact continuation 결과를 사용자에게 읽히는 형태로 surface하는 기본 틀**을 만들었다.

이후 PN/PPN prototype을 붙이게 되면, 새 알고리즘이 실제로 무엇을 더 빨리 증명하는지,
그리고 그 결과가 UI에서 어떻게 설명될지를 훨씬 쉽게 연결할 수 있다.

## 다음 후보

가장 자연스러운 다음 단계는 다음 둘 중 하나다.

1. **late lane용 PN/PPN-inspired frontier priority prototype**
   - full-mode가 아니라, 아직 root가 미증명일 때 어떤 child/subtree를 더 우선 탐색할지 보조하는 방식
2. **proof telemetry 확장**
   - analyzed move list / candidate panel에도 solved source, exact/WLD, coverage를 더 자세히 노출

현재 우선순위는 1번이 더 높다.
다만 이번 Stage에서 proof telemetry를 먼저 확보했기 때문에, 이제는 PN/PPN prototype을 붙여도 결과 해석이 훨씬 수월하다.
