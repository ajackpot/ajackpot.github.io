# Stage 27 — learned evaluator training ETA / progress / sampling tooling

## 목적
Stage 26에서 phase-bucket learned evaluator 파이프라인을 넣은 뒤, 실제 공개 데이터(Egaroucid_Train_Data)를 돌리기 시작하면 학습이 수십 분 이상 걸릴 수 있다는 운영성 문제가 드러났다. 이번 단계의 목표는 다음과 같다.

- 장시간 학습에서 진행률과 ETA를 콘솔에서 볼 수 있게 한다.
- 전체 본학습 전에 샘플만으로 예상 시간을 계산할 수 있게 한다.
- 본학습이 도는 동안 별도로 소형 실험용 코퍼스를 만들어 둘 수 있게 한다.
- 필요하면 diagnostics pass를 생략하고 weight만 먼저 생성할 수 있게 한다.

## 구현 내용
### 1) 학습/벤치마크 진행률 로그 추가
`train-phase-linear.mjs`, `benchmark-profile.mjs`에 `--progress-every` 옵션을 추가했다.

- 기본 배치 파일은 `250000` 샘플마다 진행률을 출력한다.
- 출력 정보:
  - 처리 샘플 수
  - phase 진행률
  - overall 진행률
  - 현재 sample/s
  - ETA

진행률은 단순 파일 개수 기준이 아니라 스트리밍 중 처리된 바이트를 기준으로 잡아, 여러 입력 파일을 넣었을 때도 자연스럽게 동작하도록 했다.

### 2) fit-only 운영 모드 추가
`train-phase-linear.mjs`에 `--skip-diagnostics` 옵션을 추가했다.

- 기본 모드: fit pass + diagnostics pass
- skip 모드: fit pass만 수행하고 profile JSON/module을 바로 저장
- 이후 진단은 `benchmark-profile.mjs`로 별도 수행 가능

이 옵션은 “weight를 먼저 빨리 적용하고 앱에서 직접 체감 테스트”를 하고 싶은 상황에서 특히 유용하다.

### 3) 예상 시간 추정 스크립트 추가
새 파일:

- `tools/evaluator-training/estimate-training-time.mjs`
- `tools/evaluator-training/estimate-training-time.bat`

이 스크립트는 입력 데이터 일부만 처리해 다음을 추정한다.

- fit pass 처리 속도
- diagnostics pass 처리 속도
- fit-only 예상 시간
- full train+diagnostics 예상 시간
- 낙관/보수 범위

`Egaroucid_Train_Data` 경로를 직접 지정하면 공식 공개 데이터의 총 샘플 수 `25,514,097`을 자동 기준으로 사용한다.

### 4) 샘플 코퍼스 추출 스크립트 추가
새 파일:

- `tools/evaluator-training/sample-corpus.mjs`
- `tools/evaluator-training/sample-corpus.bat`

기본적으로 stride 방식으로 원본에서 일부 샘플만 뽑아 한 파일로 저장한다.

사용 예:

- 100k: 빠른 smoke / lambda 스캔
- 1M: 중간 규모 pilot training
- full: 최종 본학습

### 5) 공용 라이브러리 확장
`tools/evaluator-training/lib.mjs`에 다음 보조 기능을 추가했다.

- 입력 파일 엔트리(path + size) 수집
- 총 입력 바이트 계산
- 공식 Egaroucid 공개 학습 데이터셋 자동 감지
- 바이트 기반 샘플 수 추정
- 숫자/시간 포맷 유틸
- `streamTrainingSamples()`에서 raw line, 파일/전체 바이트 진행 정보 노출

### 6) README 및 batch 갱신
README를 다음 흐름에 맞게 갱신했다.

1. 다운로드
2. 예상 시간 확인
3. 본학습 실행
4. fit-only 실행
5. 샘플 코퍼스 생성
6. 벤치마크
7. 앱 반영

기존 batch 파일도 진행률 옵션을 기본 포함하도록 수정했다.

## 검증
다음 항목을 확인했다.

### 도구 스모크
- `node tools/evaluator-training/estimate-training-time.mjs --input tools/evaluator-training/out/synthetic.jsonl --sample-limit 200 --target-scale 3000 --holdout-mod 5 --lambda 10000 --output-json tools/evaluator-training/out/time-estimate-smoke.json`
- `node tools/evaluator-training/train-phase-linear.mjs --input tools/evaluator-training/out/synthetic.jsonl --target-scale 3000 --holdout-mod 5 --lambda 10000 --progress-every 50 --skip-diagnostics --output-json tools/evaluator-training/out/train-skipdiag-smoke.json`
- `node tools/evaluator-training/train-phase-linear.mjs --input tools/evaluator-training/out/synthetic.jsonl --target-scale 3000 --holdout-mod 5 --lambda 10000 --progress-every 50 --output-json tools/evaluator-training/out/train-full-smoke.json`
- `node tools/evaluator-training/benchmark-profile.mjs --input tools/evaluator-training/out/synthetic.jsonl --candidate-profile tools/evaluator-training/out/train-full-smoke.json --progress-every 50 --benchmark-loops 5`
- `node tools/evaluator-training/sample-corpus.mjs --input tools/evaluator-training/out/synthetic.jsonl --output tools/evaluator-training/out/sample-smoke.jsonl --stride 3 --max-samples 10`

### 엔진 회귀 확인
- `node js/test/core-smoke.mjs`
- `node js/test/perft.mjs`

모두 통과했다.

## 시간 추정 기준 실측
반복 확장한 200k synthetic-like 코퍼스를 기준으로 throughput을 측정해 공식 Egaroucid 공개 데이터(`25,514,097` 샘플)로 환산했다.

결과 요약:

- fit pass: 약 `21.4k sample/s`
- diagnostics pass: 약 `12.6k sample/s`
- fit-only 예상: 약 `19분 50초`
- full train+diagnostics 예상: 약 `53분 39초`
- 실사용 범위: 약 `45분 36초 ~ 1시간 07분 04초`

세부 수치는 `benchmarks/stage27_training_time_estimate_from_200k_repeat.json`에 저장했다.

## 해석
현재 학습 도구의 병목은 선형계 해석 부분이 아니라, 거의 전적으로 **sample 스트리밍 + feature 추출 + diagnostics 재평가**에 있다.

따라서 운영 팁은 다음과 같다.

- 전체 본학습을 돌리기 전 `estimate-training-time.mjs`로 속도를 먼저 확인한다.
- 앱 반영을 빨리 보고 싶으면 `--skip-diagnostics`로 weight만 먼저 생성한다.
- lambda/scale/holdout 실험은 `sample-corpus.mjs`로 만든 100k~1M 코퍼스에서 먼저 돌린다.
- 전체 데이터는 최종 확정 파라미터로 1~2회만 돌리는 쪽이 효율적이다.
