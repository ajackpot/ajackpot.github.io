# Stage 30 — trineutron 대국 벤치마크 도입 및 실전 비교

## 요약

이번 단계에서는 `trineutron/othello` 엔진을 외부 기준 엔진으로 붙여, 현재 앱 엔진의 **실전 대국력**을 비교할 수 있는 오프라인 대국 벤치마크를 추가했다.

핵심 목적은 다음과 같다.

- 학습 전/후 엔진이 실제 대국 결과에서 얼마나 달라졌는지 비교
- 노드 수 / 시간 감소만으로는 부족한 부분을 승률 및 평균 기보 마진으로 보완
- 흑/백 편향을 줄이기 위해 같은 시작 국면에서 색을 바꿔 두 번씩 대국
- opening book 직접 사용 구간을 지나 중반부터 비교하여 evaluator 차이를 더 잘 드러내기

## 도입한 구성

### 1) trineutron 엔진 Node 어댑터

추가 파일:

- `tools/engine-match/opponents/trineutron-engine.mjs`

역할:

- upstream 브라우저 전용 코드를 Node에서 호출 가능한 형태로 변환
- 현재 앱의 `GameState`를 trineutron의 padded-board 형식으로 변환
- 원본 UI의 `human(color)` 제약을 제거하여 **흑/백 어느 쪽도** 플레이 가능하게 함
- search / eval 구조는 원본 알고리즘을 최대한 유지

### 2) 대국 벤치마크 스크립트

추가 파일:

- `tools/engine-match/benchmark-vs-trineutron.mjs`
- `tools/engine-match/benchmark-vs-trineutron.bat`
- `tools/engine-match/README.md`

기능:

- seeded random opening suite 생성
- 같은 시작 국면에서 흑/백을 바꿔 paired game 2판 진행
- 현재 generated profile(`active`)와 legacy seed evaluator(`legacy`)를 모두 비교 가능
- JSON 결과 저장

### 3) third-party 소스 보관

추가 파일:

- `third_party/trineutron-othello/scripts/main.js`
- `third_party/trineutron-othello/LICENSE`
- `third_party/trineutron-othello/SOURCE.md`

의미:

- upstream 원본 및 라이선스 근거를 패키지 안에 남김

### 4) smoke test

추가 파일:

- `js/test/stage30_trineutron_adapter_smoke.mjs`

검증 내용:

- 초기 흑 차례에서 합법 수 반환
- 백 차례에서도 합법 수 반환
- 여러 수 연속 호출에서도 불법 수가 나오지 않음

## 벤치마크 설계 포인트

### 흑/백 편향 제거

같은 opening position마다:

- 1판: 우리 엔진 흑 / trineutron 백
- 1판: 우리 엔진 백 / trineutron 흑

으로 붙인다.

### opening book 영향 완화

기본값을 `opening-plies=20`으로 두었다.

의도:

- opening book direct use 구간을 지난 뒤 비교
- evaluator / search 차이가 실제 대국 결과에 더 잘 반영되게 하기 위함

### trineutron 난수성 대응

upstream 엔진은 evaluation에 가우시안 잡음을 넣는다.
그래서 단판 결과가 출렁일 수 있다.

대응:

- seeded opening suite 사용
- paired color swap 사용
- 필요 시 `their-noise-scale=0`으로 deterministic diagnostic 모드도 가능

### late exact spill 방지

실용적인 오프라인 대량 대국에서 지나친 late exact spill을 막기 위해,
기본 `their-max-depth`를 `18`로 두었다.

## 현재 샘플 결과

샘플 설정:

- openings: 총 4개 (seed 11..12, 21..22에서 2개씩)
- 각 opening당 paired 2판
- variant당 총 8판
- opening-plies: 20
- our-time-ms: 80
- their-time-ms: 80
- our-max-depth: 6
- their-max-depth: 18

집계 결과:

### active-generated

- 8판
- 6승 2패 0무
- score rate: 75.0%
- 평균 disc diff: +25.25

색상별:

- 흑: 2승 2패, 평균 +3.50
- 백: 4승 0패, 평균 +47.00

### legacy-seed

- 8판
- 3승 5패 0무
- score rate: 37.5%
- 평균 disc diff: -12.125

색상별:

- 흑: 0승 4패, 평균 -26.00
- 백: 3승 1패, 평균 +1.75

## 해석

이 샘플만으로 Elo를 단정할 수는 없지만, 다음은 분명하다.

- **현재 active-generated 엔진은 trineutron을 상대로 우세한 샘플 결과를 보였다.**
- **legacy-seed 엔진은 같은 조건에서 열세였다.**
- 따라서 이번 학습형 evaluator 반영은 단순 노드 수 절감이 아니라,
  외부 기준 엔진과의 실제 대국 결과 측면에서도 긍정적인 방향일 가능성이 높다.

특히 흑 차례 성적이 아직 불안정하므로,
다음 단계에서는 move-ordering learned profile까지 결합한 뒤 같은 대국 벤치마크를 다시 돌려
흑 성적이 같이 개선되는지 확인하는 것이 중요하다.

## 생성된 주요 산출물

- `benchmarks/stage30_smoke_vs_trineutron.json`
- `benchmarks/stage30_vs_trineutron_2openings_80ms_combined.json`
- `benchmarks/stage30_vs_trineutron_2openings_80ms_seed21.json`
- `benchmarks/stage30_vs_trineutron_aggregate_seed11_21_80ms.json`

## 검증

실행 완료:

- `node js/test/core-smoke.mjs`
- `node js/test/perft.mjs`
- `node js/test/stage30_trineutron_adapter_smoke.mjs`

## 다음 권장 단계

1. move-ordering learned profile 학습 완료 후 generated module 갱신
2. 같은 trineutron 대국 벤치마크를 동일 opening suite / 동일 시간 조건으로 재실행
3. active vs legacy뿐 아니라
   - evaluator-only learned
   - evaluator + move-ordering learned
   를 분리 비교
4. 판 수를 8 openings 이상으로 늘려 결과 안정화
