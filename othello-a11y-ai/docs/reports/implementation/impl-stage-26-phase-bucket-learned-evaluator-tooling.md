# Stage 26 구현 보고서 - phase-bucket learned evaluator 구조와 오프라인 학습 도구

## 배경
기존 evaluator는 전통적인 feature가 충분히 많았지만, 대부분의 weight가 수작업/선형 보간에 머물러 있어 공개 데이터 기반으로 재추정하기 어려웠다. 또한 GitHub Pages 정적 앱 특성상 브라우저 런타임에는 큰 모델을 직접 얹기보다, **오프라인 학습 → 작은 weight/profile export → 런타임 lookup/apply** 구조가 더 적합했다.

## 이번 단계 목표
- 런타임 evaluator를 **phase bucket profile** 기반으로 재편한다.
- 기존 feature를 유지하면서도 데이터 기반 weight로 교체할 수 있게 한다.
- 앱 내부에서 profile을 교체하는 경로를 만든다.
- 사용자가 로컬 자원으로 학습을 돌릴 수 있는 Node 기반 도구와 batch 파일을 제공한다.
- 추후 MPC 도입 시 필요한 residual mean/stddev 통계를 함께 남긴다.

## 적용 내용
### 1. evaluator 구조 변경
- `js/ai/evaluation-profiles.js`를 추가했다.
- 기본 런타임 evaluator는 이제 `legacy-seed-bucketed-v1` profile을 사용한다.
- bucket은 8개(`opening-a` ~ `endgame`)로 나누었다.
- 기본 seed weight는 기존 hand-tuned evaluator의 phase 보간식을 bucket midpoint에 사상해 생성한다.

즉, 기본 상태에서는 강한 구조 변화를 만들지 않으면서도, 런타임 evaluator가 이미 **학습 가능한 형태**로 바뀌었다.

### 2. generated profile 주입 슬롯 추가
- `js/ai/learned-eval-profile.generated.js`를 추가했다.
- 이 파일이 `null`이면 기본 seed profile을 사용한다.
- 학습 도구가 이 파일에 실제 profile object를 써 넣으면 앱이 바로 그 evaluator를 사용한다.

이 방식의 장점:
- 정적 호스팅 환경에서 추가 fetch가 필요 없다.
- worker/main-thread 모두 같은 JS module만 import하면 된다.
- 학습 후 배포 파일 교체가 간단하다.

### 3. 학습용 feature 확장
기존 feature를 유지하면서 아래 항목을 추가로 노출했다.

- `cornerMoveBalance`
- `cornerOrthAdjacency`
- `cornerDiagonalAdjacency`
- `stableDiscDifferential`
- `discDifferentialRaw`
- `parityGlobal`
- `parityRegion`

이들 역시 zero-sum을 유지하도록 설계하여 검색 엔진 의미를 깨뜨리지 않게 했다.

### 4. MoveOrderingEvaluator profile 외부화
- late ordering bucket은 더 이상 evaluator 내부 상수에만 묶어 두지 않고, profile module을 통해 주입 가능하도록 정리했다.
- 이번 단계에서는 기존 bucket 값을 그대로 seed로 사용한다.

### 5. 오프라인 학습 도구 추가
`tools/evaluator-training/` 아래에 다음 도구를 추가했다.

- `train-phase-linear.mjs`
  - Egaroucid txt 또는 JSONL 입력 지원
  - bucket별 ridge regression 수행
  - holdout split 지원
  - app-ready generated module 직접 출력 가능
- `benchmark-profile.mjs`
  - baseline seed vs candidate profile MAE / speed 비교
- `export-profile-module.mjs`
  - JSON profile → app-ready generated module 변환
- `generate-synthetic-corpus.mjs`
  - 공개 대용량 데이터 전에 파이프라인 스모크 테스트용 합성 데이터 생성
- `README.md`
  - 전체 워크플로와 권장 옵션 설명
- Windows batch 파일 3개
  - `download-egaroucid-data.bat`
  - `train-phase-linear.bat`
  - `benchmark-profile.bat`

## 학습 알고리즘 선택 이유
이번 단계에서는 대형 sparse tuple/pattern 회귀보다 **작은 dense linear regression + ridge prior**를 먼저 채택했다.

이유:
- 현재 앱 evaluator가 이미 강한 handcrafted feature를 가지고 있다.
- parameter 수가 매우 작아 브라우저 적용이 안전하다.
- 학습이 안정적이고, 수치 폭주 가능성이 낮다.
- prior를 기존 seed weight에 둘 수 있어 소규모 실험에서도 evaluator 의미가 쉽게 무너지지 않는다.
- residual mean/stddev 산출이 간단해서 MPC 후속 단계와 잘 연결된다.

## 테스트 및 결과
- `node js/test/core-smoke.mjs` 통과
- `node js/test/perft.mjs` 통과
- seed profile 기준 evaluator 20만 회 평가 속도 측정: 약 **25.9k eval/s**
- 합성 코퍼스 200샘플로 학습/export 스모크 테스트 성공
- generated profile을 앱 경로에 써 넣는 경로도 실제로 확인한 뒤, 전달용 패키지에서는 다시 `null` stub로 복원했다.

자세한 수치는 `benchmarks/stage26_phase_bucket_learned_evaluator_tooling_smoke.json`에 정리했다.

## 남은 과제
- 실제 공개 대규모 데이터(Egaroucid train data 등)로 충분한 샘플 수를 사용한 본학습 수행
- feature importance / bucket별 과적합 여부 확인
- tuple/pattern residual layer를 별도 실험 branch에서 추가 검토
- residual stddev를 사용한 MPC bucket 설계
