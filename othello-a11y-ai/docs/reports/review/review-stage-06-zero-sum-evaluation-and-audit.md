# 구현 검토 보고서 Stage 6

## 이번 단계 목표
- 탐색/평가/최적화의 실제 오류 여부를 추가 검증으로 확인
- 웹 환경에서 안전하게 적용 가능한 수정만 선별 반영
- 강한 오델로 엔진들의 기법과 현재 구조를 비교하여 다음 단계 후보를 정리

## 이번 단계에서 실제로 확인한 문제
### 1) 평가 함수가 항상 완전 제로섬이 아니던 문제
- 증상: 일부 국면에서 `evaluate(state, 'black') !== -evaluate(state, 'white')` 가 발생했습니다.
- 원인: 패턴 평균(`edgePatternScore`, `cornerPatternScore`), 지역 패리티 보간, 최종 합산 결과에서 `Math.round()`를 사용하고 있었기 때문입니다.
- 상세: JavaScript의 `Math.round(-30.5) === -30` 이므로, 양수/음수 쌍에서 절댓값이 반올림 과정에서 어긋날 수 있었습니다.
- 영향: negamax/TT/PVS가 전제하는 제로섬 성질을 미세하게 흔들 수 있습니다. 실제 값 차이는 작지만, 후반 미세한 창(window)이나 근접 수 비교에서 노이즈가 될 수 있습니다.

## 반영한 수정
- `evaluator.js`
  - `symmetricRound()` / `symmetricAverage()` 추가
  - 패턴 평균, 지역 패리티 보간, 최종 평가값에 대칭 반올림 적용
- `core-smoke.mjs`
  - 난수 회귀 국면들에 대해 평가 제로섬 성질을 자동 검증하도록 추가
- `perft.mjs`
  - 초기 국면 Perft 회귀 테스트(기본 깊이 8, `--full` 시 깊이 9) 추가
- `README.md`
  - Perft 테스트 실행 방법과 이번 수정 내용 반영

## 검증 결과
- 기존 `core-smoke.mjs`: 통과
- 추가 제로섬 회귀: 통과
- Perft(깊이 1~8): 공식 값과 일치
- 무작위 6빈칸 exact search 대조: 브루트포스 값과 일치
- 대칭 국면 평가/탐색 일관성 추가 점검: 이상 없음

## 강한 엔진들과 비교한 요약
현재 프로젝트는 이미 아래 요소를 갖추고 있습니다.
- bitboard
- iterative deepening
- alpha-beta / PVS 계열
- transposition table
- killer/history ordering
- opening book
- exact endgame search
- 패리티/기동성/안정성/패턴 기반의 수작업 평가 항목

하지만 최상위권 엔진들과 비교하면 다음 차이가 남아 있습니다.
- 대형 학습 기반 pattern evaluation
- differential pattern update
- Multi-ProbCut 같은 선택적 pruning
- SIMD / 병렬화 / Zobrist 기반 초고속 최적화
- 더 큰 opening book과 자동 확장/학습
- 특화된 endgame move ordering evaluator

## 다음 단계 후보
### 웹 환경에서도 비교적 현실적인 후보
1. 소형 learned pattern table 도입
2. move ordering 전용 경량 평가기 추가
3. Perft를 CI/배포 전 체크로 연결

### 웹 환경에서는 비용 대비 실익이 불확실한 후보
1. Multi-ProbCut
2. 큰 opening book 자동 학습/확장
3. SIMD/멀티스레드 중심 네이티브급 최적화
4. NNUE/압축 신경망 평가 함수

## 판단
- **실제 오류는 1건 확인되었고 수정했습니다.**
- 나머지는 치명적인 버그라기보다는, 최상위 엔진과의 격차를 줄이기 위한 고비용 강화 과제에 가깝습니다.
- 현재 코드베이스는 브라우저 정적 앱이라는 제약 안에서 상당히 잘 구성되어 있습니다.
