# 접근 가능한 오델로(리버시) AI 웹앱

정적 호스팅이 가능한 순수 HTML, CSS, JavaScript ES 모듈 프로젝트입니다. GitHub Pages 같은 환경에 그대로 올릴 수 있습니다.

## 구현 목표
- 비트보드(BigInt) 기반 규칙 엔진
- 브라우저에서 가능한 범위의 강한 AI
  - iterative deepening
  - alpha-beta / PVS
  - aspiration window
  - transposition table
  - killer / history move ordering
  - 후반 exact search
  - 10~14빈칸 구간의 exact teacher 기반 bucketed late move ordering 평가기
  - exact window에서는 generic history/positional/flip ordering을 거의 제거하고 trained ordering 신호를 더 강하게 쓰는 late ordering profile
  - 15~18빈칸 구간의 보수적 경량 fallback ordering 평가기
  - 단계별 평가 함수(기동성, 잠재 기동성, 코너, 코너 인접 위험, 프런티어, 위치 가중치, 안정성 근사, 패리티, 돌 수)
  - Robert Gatliff base 99개 + 추가 named continuation 12개를 합친 111개 seed line 기반 소형 오프닝북
  - compact opening prior 런타임 모듈, 오프닝 confidence gate / prior contradiction veto, hybrid root ordering
- 난이도와 별도로 고를 수 있는 엔진 스타일/성격 프리셋
  - 균형형
  - 공격형
  - 봉쇄형
  - 포지션형
  - 변칙형
- 완전 키보드 조작 가능 UI
- 표(`<table>`) 기반 보드
- 모든 칸 접근 가능한 이름 제공
- 돌 놓기 / 뒤집기 / 패스 / 종료 상황을 `aria-live`로 안내
- `사용자 지정`일 때만 직접 입력한 엔진 수치가 실제 적용되도록 제어

## 파일 구조
- `index.html`: 정적 진입점
- `styles.css`: 반응형 / 고대비 친화 스타일
- `docs/reports/README.md`: 구현/검토 보고서 규칙과 인덱스
- `docs/reports/templates/REPORT_TEMPLATE.md`: 새 보고서 템플릿
- `docs/reports/implementation/`: 실제 코드 반영 단계 보고서
- `docs/reports/review/`: 실험/검토 단계 보고서
- `docs/reports/features/`: 기능 단위 보충 문서
- `js/main.js`: 부트스트랩
- `js/core/bitboard.js`: 비트보드 유틸리티와 좌표 변환
- `js/core/rules.js`: 합법 수 생성과 뒤집기 계산
- `js/core/game-state.js`: 상태 객체와 수 적용
- `js/ai/evaluator.js`: 평가 함수
- `js/ai/evaluation-profiles.js`: 학습형 phase-bucket evaluator 프로필과 기본 seed weight
- `js/ai/learned-eval-profile.generated.js`: 오프라인 학습 결과를 앱에 주입하는 generated profile 슬롯
- `js/ai/search-engine.js`: 탐색 엔진
- `js/ai/opening-book-data.js`: 압축된 오프닝북 seed line 데이터
- `js/ai/opening-book.js`: 오프닝북 전개/조회 로직
- `js/ai/opening-prior.js`: compact opening prior 조회/대칭 복원 로직
- `js/ai/opening-prior.generated.js`: 학습 결과를 압축한 runtime opening prior 모듈
- `js/ai/opening-tuning.js`: opening book/prior hybrid 임계치 프로필과 resolver
- `js/ai/presets.js`: 난이도 프리셋, 스타일 프리셋, 사용자 지정 수치 해석
- `js/ai/worker.js`: AI 워커 엔트리
- `js/ui/app-controller.js`: 애플리케이션 제어기
- `js/ui/board-view.js`: 접근 가능한 표 보드 렌더링
- `js/ui/settings-panel-view.js`: 설정 패널 뷰
- `js/ui/formatters.js`: 접근성 이름 / 상태 문구 포맷터
- `js/ui/live-region-announcer.js`: `aria-live` 안내기
- `js/ui/engine-client.js`: 워커 우선 + 메인 스레드 폴백 엔진 클라이언트
- `js/test/core-smoke.mjs`: 규칙/평가/엔진 스모크 테스트
- `tests/ui_smoke.py`: 번들 기반 브라우저 UI 스모크 테스트
- `tests/virtual_host_smoke.py`: 원본 ES 모듈 그래프 로드 스모크 테스트
- `tools/evaluator-training/`: 오프라인 학습/다운로드/벤치마크 도구
- `tools/evaluator-training/benchmark-opening-hybrid-tuning.mjs`: opening hybrid gate / prior ordering 프로필을 baseline/strong/pure-search reference suite와 비교하는 벤치마크 도구
- `tools/evaluator-training/replay-opening-hybrid-reference-suite.mjs`: Stage 58 reference JSON을 재사용해 opening wrap-up 후보를 빠르게 재평가하는 replay 벤치마크 도구
- `tools/package/`: 경량 배포용/runtime용 패키지 생성 및 용량 분석 도구

## 문서/리포트 관리
- 구현/검토 보고서는 루트가 아니라 `docs/reports/` 아래에 모아 두었습니다.
- 새 문서는 `docs/reports/templates/REPORT_TEMPLATE.md`를 기준으로 작성하는 것을 권장합니다.
- 파일명은 소문자 kebab-case와 두 자리 Stage 번호를 사용합니다.

## 접근성 설계 요약
- 보드는 `<table>`로 렌더링됩니다.
- 64칸 전부 네이티브 `<button>` 입니다.
- 각 칸의 접근 가능한 이름 예시:
  - `검은 돌 D5`
  - `흰 돌 E4`
  - `둘 수 있는 빈칸 C4`
  - `빈칸 A1`
- 돌 색상은 좌표보다 먼저 읽히도록 구성했습니다.
- Tab 순차 탐색으로 칸을 순서대로 확인할 수 있습니다.
- Enter / Space는 마우스 클릭과 동일하게 동작합니다.
- 방향키와 Home / End로 인접 칸 또는 같은 행의 양 끝으로 빠르게 이동할 수 있습니다.
- 착수, 뒤집힘, 패스, 되돌리기, 종료는 라이브 영역에서 자동 안내됩니다.

## 실행 방법
브라우저 보안 정책 때문에 로컬에서는 정적 서버로 여는 것이 가장 안전합니다.

예시:
```bash
python3 -m http.server 8000
```

그 뒤 브라우저에서 프로젝트 폴더를 엽니다.

정적 호스팅 시에는 그대로 업로드하면 됩니다.

## 테스트
### 1. 코어 엔진 스모크 테스트
```bash
node js/test/core-smoke.mjs
```

### 1.5. Perft 회귀 테스트
오델로 규칙 엔진의 합법 수 생성 / 뒤집기 / 패스 처리 검증용입니다. 기본은 깊이 8까지, `--full`을 붙이면 깊이 9까지 확인합니다.
```bash
node js/test/perft.mjs
node js/test/perft.mjs --full
```

### 2. 브라우저 UI 스모크 테스트
```bash
python3 tests/ui_smoke.py
```

### 3. 원본 모듈 그래프 스모크 테스트
```bash
python3 tests/virtual_host_smoke.py
```


## 패키지 경량화
전체 개발 트리에는 단계별 `benchmarks/`, `docs/reports/`, `tools/evaluator-training/out/`, 테스트 파일이 누적되어 있습니다. 실제 배포나 가중치 전달에는 대부분 필요하지 않으므로, Stage 36부터는 별도의 패키지 프로필을 지원합니다.

```bash
node tools/package/analyze-package-size.mjs
node tools/package/build-release-packages.mjs --profiles runtime,trainer
```

- `runtime`: 웹 앱 실행에 필요한 최소 파일만 포함
- `trainer`: 웹 앱 + **현재 권장 evaluator/opening-prior 학습 도구**만 포함하는 정리된 trainer 패키지. 과거 benchmark/output과 stage 전용 실험 도구는 제외

Windows에서는 `tools\package\analyze-package-size.bat`, `tools\package\build-release-packages.bat`를 사용할 수 있습니다.

## 현재 확인한 사항
- 규칙 엔진 합법 수/뒤집기 정상
- 탐색 엔진 합법 수 반환 정상
- 사용자 지정 수치가 `사용자 지정` 프리셋에서만 적용됨
- 보드 64칸 모두 버튼으로 제공됨
- 접근 가능한 이름 형식 정상
- 사람 착수 후 `aria-live` 안내 정상
- AI 응수 후 기록 증가 정상
- 되돌리기 정상
- 사람이 백일 때 새 게임 시작 시 AI 선착수 정상

## 비고
- 워커가 가능한 환경에서는 워커를 우선 사용합니다.
- 워커를 만들 수 없는 환경에서는 메인 스레드 엔진으로 자동 폴백합니다.


## 이번 단계에서 추가한 점
- 난이도와 독립적인 `스타일 / 성격` 선택기를 추가했습니다.
- 난이도 프리셋에 `쉬움`(깊이 3, 후반 6칸 exact search)과 `불가능`(깊이 10, 후반 16칸 exact search)을 추가했습니다.
- `불가능`은 10초 이상 생각할 수 있는 최중량 옵션으로, 이 정적 브라우저 앱 안에서 가장 강한 퍼포먼스를 목표로 합니다.
- 스타일 프리셋은 평가 함수 가중치와 수 선택 다양성을 함께 조절합니다.
- 사용자 지정 프리셋에서는 스타일 보정을 끄고, 입력한 수치가 그대로 적용되도록 했습니다.
- 전이표는 동일한 평가 의미를 유지하는 옵션 변경에서는 재사용되도록 바꿨습니다.
- 전이표가 가득 찼을 때 전체 삭제 대신 부분 축출을 수행합니다.
- 지나치게 얕은 전이표 수는 move ordering 힌트로 과신하지 않도록 보수적으로 사용합니다.
- 위험 칸(X/C-square) 패널티는 스타일에 따라 다르게 반영됩니다.
- Robert Gatliff의 이름 있는 오프닝 카탈로그를 기본으로 하고, selected named continuation 12개를 얹은 111개 seed line 소형 오프닝북으로 확장했습니다.
- supplemental named line은 count 1의 낮은 가중치로 넣어, 초반 대표 수 빈도는 거의 유지하면서 깊은 named continuation 라벨과 후보 폭만 보강했습니다.
- 오프닝북은 초기~초중반에 즉시 수를 제안하고, 그 이후 구간에서도 루트 수 정렬 참고 정보로 함께 사용할 수 있습니다.
- compact WTHOR opening prior를 런타임에 연결해, direct book 후보를 confidence gate로 더 보수적으로 고르고 탐색 루트에서는 prior 기반 ordering bias를 함께 사용합니다.
- opening hybrid 임계치를 별도 profile(`js/ai/opening-tuning.js`)로 분리했고, Stage 57에서는 curated book를 더 존중하는 `stage57-book-led` profile을 기본값으로 올렸습니다.
- `tools/evaluator-training/benchmark-opening-hybrid-tuning.mjs`로 opening-book prefix corpus(기본 0~12 ply)를 reference search와 비교하는 소형 벤치마크를 추가했습니다.
- Stage 57 benchmark(`benchmarks/stage57_opening_hybrid_tuning_benchmark.json`)에서는 `stage57-book-led`가 Stage 56 legacy보다 agreement 58.2%→58.8%, direct use 89.6%→90.7%, off-book choice 4.4%→3.8%, 평균 노드 70.6→62.7로 가장 균형이 좋았습니다.
- Stage 58에서는 benchmark를 다중 reference suite(`benchmarks/stage58_opening_hybrid_reference_suite.json`)로 확장해, `search-reference` baseline뿐 아니라 `search-reference-strong`(더 깊은 assisted search)과 `search-reference-pure`(opening prior ordering까지 끈 pure-search)까지 함께 비교합니다.
- stronger reference 둘은 baseline과 64.8%~70.9%만 합의했고, 서로도 83.0% 수준만 일치했습니다. 따라서 Stage 58에서는 기본 runtime profile을 바로 교체하지 않고, `stage57-book-led`를 유지한 채 stronger reference에서 더 안정적인 후보를 다음 튜닝 입력으로 남겼습니다.
- Stage 59에서는 stronger reference를 재활용하는 replay benchmark(`benchmarks/stage59_opening_wrapup_candidates.json`)를 추가해, 남은 후보 중 효과가 큰 `prior contradiction veto`와 `direct opening-book cap 12→9`를 집중 비교했습니다.
- 그 결과 `stage59-cap9-prior-veto`가 worst agreement 60.4%, average agreement 62.1%로 가장 높았고, veto는 전체 corpus의 약 4.9% case에서만 발동했습니다. 따라서 기본 runtime profile을 `stage59-cap9-prior-veto`로 교체했습니다.
- 저비용 대안으로는 `stage59-prior-veto`도 유지합니다. 이 프로필은 direct rate 85.7%를 지키면서도 `stage57-book-led` 대비 worst agreement 57.7%→59.9%, average agreement 58.1%→61.2%로 개선됐지만, 종합 순위는 `stage59-cap9-prior-veto`가 더 높았습니다.
- 무작위성 옵션은 `오프닝 수 무작위성`과 `중반 이후 근접 수 무작위성`으로 분리했고, 기존 `randomness` 입력은 하위 호환으로 search/random alias에 매핑합니다.
- 최근 AI 탐색 요약에 오프닝북 사용 여부와 대표 계열을 표시합니다.
- 안정성 평가는 코너/가득 찬 변 위주 근사에서, 후반부에 내부 안정 돌까지 보수적으로 전파하는 iterative stability 근사로 확장했습니다.
- `explainFeatures()`는 안정 돌 수(`stableDiscs`, `opponentStableDiscs`)도 함께 노출하여 디버깅과 회귀 점검에 활용할 수 있습니다.
- 패스 노드와 종료 노드도 전이표에 저장하여, 같은 패스 국면을 다시 읽을 때 재사용되도록 했습니다.
- 코어 스모크 테스트에 내부 안정성 회귀와 패스 노드 전이표 회귀를 추가했습니다.
- 평가 함수의 패턴 평균/패리티 보간/최종 점수 반올림을 대칭 반올림으로 바꿔, 모든 관점에서 평가가 완전 제로섬을 유지하도록 수정했습니다.
- `js/test/perft.mjs`를 추가하여 초기 국면 Perft(깊이 1~8, 선택적으로 9) 회귀 검증을 자동화했습니다.
- 후반부 ordering은 10~14빈칸 구간에서 exact root 결과를 teacher로 삼아 맞춘 bucketed late-ordering 가중치를 우선 사용하고, 그보다 이른 15~18빈칸 구간에서는 기존의 보수적 경량 fallback 평가기를 사용합니다.
- ordering evaluator는 **실제 child empties**를 기준으로 late bucket을 고르므로, 14→13이나 13→12처럼 경계에 걸친 수 직후에도 적절한 bucket/parity 문맥이 즉시 반영됩니다.
- exact endgame 창 안에서는 generic history/positional/flip ordering 비중을 사실상 제거하고, trained ordering / 상대 기동성 억제 / 코너 응수 억제 / 지역 패리티 쪽을 더 강하게 반영하는 late ordering profile을 따로 사용합니다.
- Stage 9 벤치마크에서는 13빈칸 exact-search 평균 노드가 줄었고, 14빈칸 exact-search에서는 같은 정답 수/점수를 유지한 채 평균 노드와 시간이 더 크게 줄었습니다.
- 다만 8빈칸 이하의 매우 작은 exact 구간에서는 여전히 오히려 노이즈가 될 수 있어 비활성화합니다.
- Stage 25에서는 **실제 인게임 경로에 닿지 않거나 기본값이 꺼진 채 성능 이득이 없던 실험 토글**을 정리했습니다.
- Stage 26에서는 evaluator를 **phase-bucket learned weight profile** 구조로 재편하고, `corner orthogonal/diagonal adjacency`, `corner move balance`, `stable disc differential`, `raw disc differential`, `parity global/region` 같은 추가 학습 feature를 노출했습니다.
- `js/ai/learned-eval-profile.generated.js`가 비어 있으면 legacy-seed bucket profile을 쓰고, 학습 도구가 generated profile을 쓰면 앱이 그대로 그 weight를 적용합니다.
- `tools/evaluator-training/`에는 Egaroucid 공개 학습 데이터(txt) 또는 JSONL을 읽어 **ridge regression 기반 phase-bucket weight 재추정**, holdout 검증, app-ready generated module export를 수행하는 스크립트와 Windows batch 파일을 추가했습니다.
- 출력 JSON에는 bucket별 residual mean/stddev도 함께 남겨, 향후 MPC 후보 실험에서 바로 재사용할 수 있도록 했습니다.
- `search-engine.js`에서는 `stabilityCutoff*` 계열과 `exactFastestCutFirstOrdering` 경로를 제거하고, 채택된 exact fastest-first / ETC / WLD pre-exact 경로만 남겼습니다.
- `evaluator.js`의 `describeStableDiscBounds()`는 런타임 pruning이 아니라 회귀/분석용 보조 함수로만 유지합니다.
- `docs/reports/README.md`는 누락된 Stage 목록을 보완했고, 비채택 실험은 문서로 남기되 실제 코드에서는 제거할 수 있다는 운영 원칙을 명시했습니다.

- Stage 60에서는 learned-eval generated module에도 compact export를 기본 적용해, evaluation/move-ordering/tuple slot을 같은 내용 기준으로 더 작은 JS 모듈로 재생성할 수 있게 했습니다.
- tuple residual built-in layout family를 `orthogonal-adjacent-pairs-full-v1`, `diagonal-adjacent-pairs-full-v1`, `straight-adjacent-pairs-full-v1`까지 확장했고, `estimate-tuple-layout-candidate-sizes.mjs`와 `run-tuple-layout-family-pilot.mjs`로 후보 크기 추정과 다중 layout 파일럿 학습을 바로 돌릴 수 있게 했습니다.
- `tools/evaluator-training/README.md`, `TOOL_INDEX.md`, `LEGACY_TOOLS.md`를 현재 lane 기준으로 다시 정리했고, trainer 패키지는 이제 phase-linear + tuple residual + opening prior 중심의 핵심 도구만 담도록 정리했습니다.
- Stage 78에서는 비-MPC 후속으로 move-ordering 핫패스를 정리해, late-ordering profile / lightweight ordering eligibility / ordering score 계수를 empties별 캐시로 전개했습니다.
- `MoveOrderingEvaluator`는 trained bucket을 매 평가마다 선형 검색하지 않고 empties direct lookup으로 고르게 했고, fallback ordering 가중치도 precomputed lookup으로 재사용합니다.
- `getPositionalRisk()`는 배열 includes 대신 정적 lookup table을 사용하고, 관련 회귀는 `js/test/stage78_move_ordering_runtime_cleanup_smoke.mjs`로 고정했습니다.

## 현재 한계와 비고
- 이 프로젝트는 GitHub Pages용 순수 브라우저 JS 앱이므로, 네이티브 Othello 엔진이 쓰는 대형 opening book, SIMD 최적화, pattern-based evaluation, Multi-ProbCut 같은 기법을 그대로 이식하기는 어렵습니다.
- 따라서 오프닝북은 브라우저 정적 앱에 맞춘 소형 책 형태로 넣었고, 고빈도 이름 있는 오프닝과 그 대칭/전치 계열을 우선 반영했습니다.
- WTHOR 계열 opening prior는 학습/검수용 full JSON이 아니라 compact runtime module로 축소해 넣는 것을 전제로 하며, 직접 책을 대체하기보다 confidence gate와 root ordering bias로 보수적으로 섞는 것이 현재 구조에 더 잘 맞습니다.
- pattern-based learned evaluation 전체를 대형 패턴 테이블이나 신경망으로 바로 밀어 넣지는 않았고, 우선은 **작은 phase-bucket linear evaluator + generated profile 주입 구조**를 먼저 넣었습니다. 더 큰 패턴/tuple 계열은 이 구조 위에서 단계적으로 실험하는 것이 안전합니다.
- 일부 Stage 보고서는 과거 실험을 보존하기 위한 역사 문서이므로, 보고서에 등장하는 비채택 토글이 현재 코드에 그대로 남아 있지는 않을 수 있습니다.
