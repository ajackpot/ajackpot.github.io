# Trineutron 대국 벤치마크 도구

이 디렉터리는 `trineutron/othello` 엔진을 외부 기준 엔진으로 삼아, 현재 앱 엔진의 실전 대국력을 비교하는 도구입니다.

## 왜 필요한가

노드 수, 탐색 시간, holdout MAE만으로는 실제 대국력 상승을 온전히 판단하기 어렵습니다.
이 도구는 다음을 보완합니다.

- **실전 결과**: 승/패/무와 평균 기보 마진으로 비교
- **색상 공정성**: 같은 시작 국면에서 **흑/백을 바꿔 두 번** 대국
- **opening book 편향 완화**: 기본값으로 `opening-plies=20`을 사용하여, 우리 엔진의 opening book 직접 사용 구간(12수)과 advisory 구간(18수)을 지난 뒤 중반부터 비교
- **종반 노이즈 제거**: 기본값으로 `empties <= 14`가 되면 trineutron을 더 두지 않고, **우리 exact solver를 한 번만 호출**해 승패를 판정
- **학습 전/후 비교**: 기본값으로 현재 설치 generated module(`active`, 현재는 balanced13 support-stack), learned evaluator만 적용한 비교군(`phase-only`), 학습 전 seed evaluator(`legacy`)를 함께 돌려 비교

## 포함된 것

- `benchmark-search-algorithm-pair.mjs`
  - 내부 알고리즘 두 개를 같은 opening pair에서 흑/백 교차 대국시키는 generic self-play 벤치입니다.
  - `--progress-every-pairs` 로 장시간 실행의 진행률을 주기적으로 출력할 수 있습니다.
- `benchmark-classic-throughput-compare.mjs`
  - classic / classic-mtdf / classic-mtdf-2ply 같은 classic driver 변형의 처리량과 완료 깊이를 같은 opening position 묶음에서 비교합니다.
- `benchmark-profile-variant-pair.mjs`
  - 같은 search algorithm 아래에서 evaluation profile finalist 두 개를 같은 opening pair로 흑/백 교차 self-play시켜 실제 점수율을 비교합니다.
- `benchmark-profile-variant-throughput-compare.mjs`
  - active / finalist generated module을 같은 root position 묶음에서 비교해 profile variant별 처리량, 완료 깊이, move agreement를 계산합니다.
- `run-stage132-classic-mtdf-suite.mjs` / `run-stage132-classic-mtdf-suite.bat`
  - classic MTD(f) 후보 lane의 초기 throughput + paired self-play screening 배치입니다.
- `run-stage133-classic-mtdf-adoption-suite.mjs` / `run-stage133-classic-mtdf-adoption-suite.bat`
  - 실제 classic preset(입문/쉬움/보통/어려움)에 맞춘 preset-aligned adoption suite입니다.
  - 기존 JSON output을 재사용해 resume하고, `stage133_classic_mtdf_adoption_summary.json`에 최종 채택 판정을 남깁니다.
- `run-stage135-evaluation-profile-adoption-suite.mjs` / `run-stage135-evaluation-profile-adoption-suite.bat`
  - active / balanced12 / balanced13 evaluation profile finalists를 classic, MCTS, MTD(f) 재시험까지 묶어 최종 round-robin 채택 판정을 내립니다. 현재 설치본이 balanced13으로 교체된 뒤에는 historical fixture와 finalist generated module을 함께 써서 회고 비교를 계속할 수 있습니다.
  - 기존 JSON output을 재사용해 resume하고, `stage135_evaluation_profile_adoption_summary.json`과 notes markdown을 남깁니다.
- `opponents/trineutron-engine.mjs`
  - upstream `trineutron/othello` 브라우저 엔진을 Node에서 호출할 수 있도록 옮긴 어댑터입니다.
  - 원본 UI는 사람이 항상 흑, AI가 항상 백인 구조인데, 어댑터에서는 **흑/백 어느 쪽도 플레이 가능**하게 만들었습니다.
- `benchmark-vs-trineutron.mjs`
  - opening suite 생성, 흑/백 대칭 매치, solver adjudication, JSON 저장을 수행합니다.
  - `--variant-seed-mode shared` 로 여러 variant를 같은 opening/color/상대 난수 조건에 맞춰 더 공정하게 비교할 수 있습니다.
  - `--disable-mpc`, `--disable-move-ordering`, `--disable-tuple` 로 generated module 일부를 끄는 custom 비교군도 만들 수 있습니다.
- `benchmark-vs-trineutron.bat`
  - Windows용 실행 래퍼입니다.
- `run-trineutron-match-suite.mjs`
  - 여러 scenario와 variant를 순차 실행하고 `suite-summary.json` 으로 묶는 배치 러너입니다.
- `run-trineutron-match-suite.bat`
  - Windows용 실행 래퍼입니다.
- `../../third_party/trineutron-othello/`
  - upstream 원본 `scripts/main.js`와 MIT 라이선스 사본입니다.

## 빠른 실행 예시

```bat
tools\engine-match\benchmark-vs-trineutron.bat benchmarks\stage31_vs_trineutron_solver_cutoff.json
```

기본값:

- variants: `active,phase-only,legacy`
- games: `4` openings (`총 8판/variant`)
- opening-plies: `20`
- our-time-ms: `100`
- their-time-ms: `100`
- our-max-depth: `6`
- their-max-depth: `18`
- exact-endgame-empties: `10`
- solver-adjudication-empties: `14`
- solver-adjudication-time-ms: `60000`
- their-noise-scale: `4`

## 직접 파라미터를 주는 예시

```bat
node tools/engine-match/benchmark-vs-trineutron.mjs ^
  --output-json benchmarks\stage31_vs_trineutron_8openings.json ^
  --variants active,phase-only,legacy ^
  --games 8 ^
  --opening-plies 20 ^
  --seed 11 ^
  --our-time-ms 150 ^
  --their-time-ms 150 ^
  --our-max-depth 6 ^
  --their-max-depth 18 ^
  --exact-endgame-empties 10 ^
  --solver-adjudication-empties 14 ^
  --solver-adjudication-time-ms 60000 ^
  --their-noise-scale 4
```

### active vs no-MPC 검증 배치

```bat
tools\engine-match\run-trineutron-match-suite.bat ^
  --output-dir tools\engine-match\out\active-vs-no-mpc ^
  --config tools\engine-match\examples\trineutron-match-suite.active-vs-no-mpc.example.json
```

이 구성은 현재 active 설치본과, 같은 generated module에서 `--disable-mpc` 만 적용한 비교군을
scenario별로 따로 실행해 `suite-summary.json` 하나로 묶습니다.

### custom generated module에서 MPC만 끄기

```bat
node tools/engine-match/benchmark-vs-trineutron.mjs ^
  --variants custom ^
  --generated-module js/ai/learned-eval-profile.generated.js ^
  --disable-mpc ^
  --variant-label active-no-mpc ^
  --variant-seed-mode shared ^
  --games 4 --opening-plies 20 --seed 21 ^
  --our-time-ms 100 --their-time-ms 100 --their-noise-scale 4
```

## 해석 팁

- `active`는 현재 `learned-eval-profile.generated.js`에 들어 있는 generated evaluator와 learned move-ordering profile을 모두 사용합니다.
- `phase-only`는 같은 learned evaluator를 쓰되, learned move-ordering slot은 비워 둔 비교군입니다.
- `legacy`는 학습 전 기본 seed evaluator(`legacy-seed-bucketed-v1`)와 late ordering 기본값으로 비교합니다.
- `solver-adjudication-empties=14`라면 빈칸이 14개 이하가 되는 순간, 그 이후 기보는 실제로 두지 않고 exact score만 계산합니다.
- 따라서 `averagePlayedPly`는 **실제로 둔 수만** 집계한 값이고, 종반 solver가 처리한 수순은 포함하지 않습니다.
- `their-noise-scale=4`는 upstream 엔진의 난수 잡음을 유지합니다.
- 더 재현성 높은 비교가 필요하면 `their-noise-scale=0`으로 두고 진단용으로 볼 수 있습니다. 다만 이 경우 upstream 웹 배포 엔진과는 완전히 동일하지 않습니다.
- 같은 실행에서 여러 variant를 비교할 때는 `variant-seed-mode=shared` 를 권장합니다. opening/color뿐 아니라 상대 엔진 난수 시드도 맞춰 주기 때문입니다.

## 주의 사항

- upstream trineutron 엔진은 evaluation에 가우시안 잡음을 넣기 때문에, **판 수가 적으면 결과가 출렁일 수 있습니다.**
- 종반 solver adjudication은 **승패/기보 마진 비교를 더 안정적으로** 만들어 주지만, 중반부 착수 선택의 변동성 자체를 없애지는 않습니다.
- `their-max-depth` 기본값은 실용적인 오프라인 벤치마크를 위해 `18`로 제한했습니다. 종반은 solver adjudication으로 잘라내므로, 굳이 trineutron의 late exact spill까지 모두 재현할 필요가 없습니다.

## 출력 JSON 구조

JSON에는 다음 정보가 들어갑니다.

- benchmark options
- opening suite 정보
- variant별 집계(`wins/losses/draws`, `scoreRate`, `averageDiscDiff`, `averagePlayedPly`)
- exact adjudication 횟수와 해당 노드/시간 집계
- 색상별 집계
- 각 게임의 move log, 총 시간, 총 노드 수, 종료 방식(`played-out` 또는 `exact-adjudication`)


## generated module 직접 벤치하기

이제 `benchmark-vs-trineutron.mjs` 는 `--variants custom` 과 함께 `--generated-module` 또는 개별 JSON profile 입력을 받아,
앱의 `learned-eval-profile.generated.js` 를 임시 교체하지 않고도 candidate generated module을 바로 대국 벤치에 넣을 수 있습니다.

```bash
node tools/engine-match/benchmark-vs-trineutron.mjs \
  --variants custom \
  --generated-module tools/evaluator-training/out/learned-eval-profile.generated.js \
  --variant-label diagonal-latea-endgame-top24 \
  --games 2 --opening-plies 20 --seed 11 \
  --our-time-ms 100 --their-time-ms 100 --their-noise-scale 0
```

```bash
node tools/engine-match/run-stage135-evaluation-profile-adoption-suite.mjs
```

이 배치는 active, `balanced12-alllate-smoothed-stability-090`, `balanced13-alllate-smoothed-stability-090` finalist를 같은 opening 묶음에서 classic/MCTS self-play와 classic throughput까지 한 번에 비교합니다.

