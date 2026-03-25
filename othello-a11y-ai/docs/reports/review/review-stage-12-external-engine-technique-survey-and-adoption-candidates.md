# 검토 보고서 Stage 12 — 외부 Othello 엔진/학습 사례 조사와 도입 후보

## 목적

이번 단계의 목표는 단순히 “강한 엔진 이름을 더 모으는 것”이 아니라,
다음 질문에 답하는 것이었습니다.

1. 현재 웹 앱 엔진이 이미 갖춘 것과 아직 없는 것은 무엇인가?
2. Logistello / WZebra / Edax / Egaroucid 외에 참고할 만한 구현 계열은 무엇인가?
3. 브라우저 정적 호스팅 환경에서도 현실적으로 도입 가능한 후보는 무엇인가?

## 현재 엔진이 이미 갖춘 것

현 코드 기준으로 이미 들어가 있는 핵심 요소는 다음과 같습니다.

- iterative deepening
- aspiration window
- PVS 계열의 null-window 재탐색 구조
- transposition table
- killer / history heuristic
- late move reduction
- opening book
- exact small solver
- late-stage ordering profile / lightweight ordering evaluator

따라서 단순히 “고전적인 강엔진 기법”을 이름만 보고 더 넣는 접근은
중복 가능성이 높고, 이번 단계에서는 채택 우선순위가 낮았습니다.

## 추가로 참고할 만한 사례

### 1) BILL 계열

초기 강엔진 BILL은 단순히 더 깊게 읽는 프로그램이 아니라,
- 다양한 search / timing 기법
- 대량 패턴을 상수 시간에 인식하는 precomputed table
- Bayesian 방식의 feature 결합
을 조합해 강도를 끌어올린 사례입니다.

현재 코드에 주는 시사점:
- “패턴 기반 evaluator + 빠른 lookup”은 여전히 유효한 축이다.
- 브라우저에서도 큰 신경망보다 **작은 패턴 테이블**이 더 실용적일 수 있다.

### 2) Buro 계열의 학습형 평가함수 / ProbCut / Multi-ProbCut

Logistello 자체는 이미 잘 알려져 있지만,
실제로 재사용 가치가 큰 것은 엔진 이름보다 **방법론**입니다.

핵심 포인트:
- logistic regression으로 phase-independent feature weight를 추정한 초기 방식
- 이후 final disc differential을 라벨로 쓰는 pattern-heavy 회귀 방식
- shallow/deep search 상관을 이용해 가지를 쳐내는 ProbCut / Multi-ProbCut

현재 코드에 주는 시사점:
- search 자체보다 먼저 **오프라인 데이터 기반 evaluator tuning 파이프라인**이 필요하다.
- MPC는 매력적이지만, empties bucket별 회귀식 / 분산 추정이 없으면 바로 넣기 어렵다.

### 3) NTest

NTest는 공개 코드 기준으로 살펴볼 가치가 큰 사례였습니다.

확인 가능한 특징:
- 별도 `MPCCalc` 구성
- pattern 기반 evaluator
- cache / hash 기반 탐색 구조
- smart opening book 보정 및 transposition 처리
- negascout 계열 search
- near-end solver 진입

현재 코드에 주는 시사점:
- **book transposition 관리와 book correction 개념**은 현재 웹 앱에서도 축소판으로 도입 가능하다.
- evaluator와 search를 더 강하게 분리하고,
  오프라인 생성 산출물(계수 파일 / book 파일 / profile 파일)을 로딩하는 구조가 장기적으로 유리하다.

### 4) N-tuple 계열 학습 evaluator

Lucas와 Jaśkowski 계열 연구는
“큰 모델보다도 작은 lookup 기반 evaluator가 Othello에서는 매우 강할 수 있다”는 점을 잘 보여줍니다.

특히 주목한 점:
- temporal-difference learning 기반 n-tuple value function
- weighted piece counter / MLP보다 좋은 학습 효율
- systematic short straight n-tuple이 long random snake tuple보다 효과적일 수 있음
- size-2 tuple만으로도 매우 작은 가중치 집합으로 높은 성능 가능

현재 코드에 주는 시사점:
- 브라우저용으로는 CNN보다 **compact systematic n-tuple**이 훨씬 현실적이다.
- 현재 evaluator에 late-mid / pre-exact용 작은 보조 테이블을 붙이는 실험이 유망하다.

### 5) Preference-learning / move-prediction 계열

전문가 기보에서 “정답 수”를 맞히는 방향의 학습은
직접 승률 evaluator를 만드는 방식과는 다른 장점이 있습니다.

가능한 활용:
- opening / early-mid에서 root move ordering prior로 사용
- full evaluator 대체가 아니라 **ordering 보조 신호**로 사용
- top-k move ranking만 맞춰도 αβ tree에는 의미 있는 효과 가능

현재 코드에 주는 시사점:
- 현재 엔진은 ordering 신호가 이미 많은 편이므로,
  추가 학습 신호는 evaluator 전체를 뒤엎기보다 **root / shallow ordering prior**로 붙이는 편이 더 안전하다.

### 6) CNN / 딥러닝 계열

논문 사례는 존재하지만,
현재 웹 앱에는 우선순위가 높지 않다고 판단했습니다.

이유:
- 번들 크기 증가
- 모델 로딩 / 초기화 비용
- 브라우저에서의 추론 비용
- 현재 엔진의 탐색 기반 구조와 결합했을 때 대비 효율이 불확실

즉, “연구적으로 가능”과 “지금 이 코드베이스에 채택할 가치가 높음”은 다릅니다.

## 도입 후보 정리

### A. 바로 권고 가능한 것

### A-1) exact packed hash 유지 및 추가 해시 최적화

이번 Stage 12에서 실제로 반영한 내용입니다.

추가 후보:
- child state 생성 시 hash까지 같이 계산하는 incremental path 검토
- TT key와 opening-book key 표현을 문서로 고정

우선순위: **높음**

### A-2) 오프라인 evaluator tuning 파이프라인 구축

추천 이유:
- 현재 가장 부족한 것은 search 알고리즘 수보다 **데이터 기반 weight 추정 체계**입니다.
- WTHOR / expert game / exact label을 활용한 오프라인 튜닝은
  브라우저 런타임 비용을 거의 늘리지 않으면서 strength를 개선할 수 있습니다.

권장 산출물:
- stage bucket별 weight 파일
- exact-label late-stage fit 결과
- holdout benchmark 자동 비교 스크립트

우선순위: **매우 높음**

### A-3) compact pattern / n-tuple 보조 evaluator 실험

추천 형태:
- late-mid / pre-exact empties 구간 전용
- size-2 또는 매우 작은 systematic tuple
- root ordering과 static evaluator 둘 다에 제한적으로 사용

장점:
- 브라우저 친화적
- lookup 기반이라 빠름
- 기존 evaluator 위에 additive하게 붙이기 쉬움

우선순위: **높음**

### B. 실험은 권장하지만 즉시 merge는 비권고

### B-1) ProbCut / Multi-ProbCut

도입 전 필요 조건:
- empties bucket별 shallow/deep score 상관 데이터
- 회귀식과 분산 추정
- 오검출에 대한 안전한 fail-safe 설계

판단:
- 가치가 크지만 지금은 **데이터 파이프라인이 먼저**입니다.

우선순위: **중간~높음**

### B-2) expert move prior 기반 root ordering

도입 전 필요 조건:
- WTHOR / expert logs에서 상태-선택수 데이터셋 구성
- symmetry normalization
- 현재 root ordering과 충돌하지 않는 scale 조정

판단:
- 전체 evaluator 교체보다 리스크가 낮고,
  opening / shallow-mid에서는 꽤 유망합니다.

우선순위: **중간**

### B-3) opening book 품질 향상

후보:
- transposition-aware book consolidation
- weight 외에 결과 신뢰도 / 추천 폭 관리
- shallow search와 결합한 book correction

판단:
- 현재 코드에도 이미 book이 있으므로,
  엔진 strength보다는 opening 안정성을 높이는 방향으로 유효합니다.

우선순위: **중간**

### C. 현재는 비권고

### C-1) 큰 CNN / 정책망 직접 탑재

비권고 이유:
- JS 정적 호스팅 환경 비용 대비 효율이 불확실
- 모델 관리/배포 부담 큼
- 현재 엔진 병목과 직접 맞닿아 있지 않음

### C-2) 대형 endgame DB / 병렬 탐색

비권고 이유:
- 배포 크기 / 메모리 / 브라우저 환경 제약이 큼
- 정적 웹 앱의 운영 모델과 잘 맞지 않음

### C-3) 체스식 null-move pruning의 직접 이식

비권고 이유:
- Othello에서는 일반 체스형 직수 패스 가정이 안전하지 않음
- 검증 비용이 크고 실익이 불확실

## 최종 판단

현재 코드베이스의 다음 강한 방향은 **새 검색 트릭을 더 넣는 것**보다,
다음 두 축을 정리하는 것입니다.

1. **오프라인 학습 / 튜닝 파이프라인 구축**
   - WTHOR / expert game / exact label
   - evaluator weight와 ordering prior를 파일로 생성

2. **작고 빠른 learned table 추가**
   - compact systematic n-tuple 또는 작은 pattern table
   - late-mid / pre-exact 구간 보강

즉, 지금 시점의 우선순위는 다음과 같습니다.

1. 채택 완료: packed hash key 최적화
2. 다음 강추: data-driven evaluator tuning 파이프라인
3. 그 다음 후보: compact n-tuple / pattern 보강
4. 준비 후 실험: ProbCut / Multi-ProbCut
5. 보류: CNN / 대형 모델 / 병렬화

## 이번 단계에서 코드에 바로 넣지 않은 이유

이번 단계는 “좋아 보이는 아이디어”를 넓게 조사했지만,
merge 기준은 보수적으로 유지했습니다.

즉,
- 지금 당장 데이터 없이 넣으면 위험한 것,
- 번들/초기화 비용이 큰 것,
- 실제 JS 브라우저 환경에서 재현성이 낮은 것은
이번 단계에서는 **보고서에만 남기고 코드에는 넣지 않았습니다.**

그 결과 이번 Stage 12의 merge는
- packed hash key 최적화
- 관련 회귀 테스트
- 관련 벤치마크 기록
으로 제한했습니다.
