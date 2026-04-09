# Stage 36 구현 보고서 - 패키지 경량화 분석과 release profile 도입

## 요약
전체 소스 트리에는 누적 벤치마크 JSON, 보고서, 스모크 출력, synthetic corpus가 쌓여 있어 실제 배포/전달용 패키지가 불필요하게 비대해졌다. 이를 해결하기 위해 `runtime`/`trainer` 두 가지 경량 패키지 프로필과 용량 분석 도구를 추가했다.

## 확인한 문제
- `benchmarks/`가 가장 큰 비중을 차지했다.
- `docs/reports/`, `js/test/`, `tools/evaluator-training/out/`도 누적되면 전달용 패키지 크기를 키웠다.
- 학습/검증에 필요한 코드와 과거 산출물이 같은 zip에 묶여 있었다.

## 이번 단계에서 한 일
- `tools/package/lib.mjs` 추가
  - 저장소 스캔
  - 프로필별 파일 선택
  - staging 디렉터리 생성
  - zip 생성
- `tools/package/analyze-package-size.mjs` 추가
  - 전체 용량, 상위 폴더, 큰 파일, 프로필별 절감량 산출
- `tools/package/build-release-packages.mjs` 추가
  - `runtime`, `trainer` zip 생성
- Windows batch wrapper 추가
  - `tools/package/analyze-package-size.bat`
  - `tools/package/build-release-packages.bat`
- trainer 패키지에는 빈 `benchmarks/`, `tools/evaluator-training/out/`, `dist/`를 placeholder로 생성하도록 구현
- `js/test/stage36_package_profile_smoke.mjs` 추가

## 패키지 프로필
### runtime
정적 웹 앱 실행에 필요한 최소 파일만 포함한다.

### trainer
웹 앱 + 학습/검증/패키징 도구를 포함하되, 과거 benchmark/output은 제외한다.

## 검증
- staging-only smoke에서 runtime/trainer 포함/제외 규칙 검증
- core smoke / perft와 별개로 패키지 구성 자체를 검증 가능하게 함

## 기대 효과
- 최종 사용자 전달용 zip과 개발/학습용 zip을 분리할 수 있다.
- 벤치마크 JSON과 스모크 산출물이 커져도 배포 패키지는 일정하게 유지된다.
- 다음 단계에서 새 가중치를 첨부할 때도 trainer 패키지에만 필요한 도구를 담아 전달할 수 있다.
