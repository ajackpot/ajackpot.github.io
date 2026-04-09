# 패키지 경량화 도구

이 폴더는 전체 소스 트리에서 **전달용 패키지**를 따로 만드는 도구입니다.

## 왜 필요한가

개발 트리에는 다음이 계속 누적됩니다.

- `benchmarks/` 과거 단계별 JSON
- `docs/reports/` 구현/검토 보고서
- `js/test/`, `tests/` 각종 스모크 테스트
- `tools/evaluator-training/out/` 임시 산출물
- stage 전용 실험 스크립트

이 파일들은 개발에는 유용하지만, 사용자가 실제로 받아서 다시 학습하기에는 오히려 산만합니다.

## 패키지 프로필

### `runtime`
정적 웹 앱 실행에 필요한 최소 런타임만 포함합니다.

포함:
- `index.html`, `styles.css`, `README.md`, `stage-info.json`
- `js/core/`, `js/ui/`, `js/ai/` (테스트 제외)

제외:
- `benchmarks/`
- `docs/reports/`
- `tests/`, `js/test/`
- `tools/`

### `trainer`
**현재 권장 학습 lane만 담은 정리된 trainer 패키지**입니다.

포함:
- runtime 전체
- `tools/evaluator-training/` 중 현재 권장 도구
  - phase evaluator 학습
  - tuple residual 학습 / calibration / 비교
  - compact generated module export
  - layout family size 추정 / 다중 layout pilot
  - opening prior 핵심 도구
- `tools/package/`
- `tools/engine-match/`
- `third_party/trineutron-othello/`
- 핵심 smoke tests 일부

제외:
- 과거 benchmark JSON
- `docs/reports/`
- `tools/evaluator-training/out/` 기존 내용
- move-ordering 재학습 등 현재 기본 lane 밖의 legacy 실험 도구

패키지 안에는 대신 빈 출력 폴더와 안내용 README를 만들어 둡니다.

## 사용법

### 용량 분석

```bat
tools\package\analyze-package-size.bat
```

### 패키지 생성

```bat
tools\package\build-release-packages.bat --profiles runtime,trainer
```

또는:

```bash
node tools/package/build-release-packages.mjs --profiles runtime,trainer
```

기본 출력:

- `dist/othello-a11y-ai-runtime.zip`
- `dist/othello-a11y-ai-trainer.zip`

### staging 디렉터리만 만들기

```bash
node tools/package/build-release-packages.mjs --staging-only --profiles trainer
```

## 권장 운영 방식

- 사용자 배포 / GitHub Pages 업로드: `runtime`
- corpus를 직접 학습해서 JSON만 다시 전달: `trainer`
- 전체 역사 문서/실험 로그 보존: full source tree 별도 보관
