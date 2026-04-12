# Stage 123 - opening default revalidation and final runtime closeout

## 요약

Step 3의 마지막 후보였던 **opening default revalidation**을 이번 Stage에서 닫았습니다.

판정은 **기본값 교체 기각**입니다.
즉 현재 기본 opening hybrid key인 `stage59-cap9-prior-veto`를 그대로 유지하고,
저비용 대안인 `stage59-prior-veto`는 계속 **optional low-cost alternative**로만 남깁니다.

핵심 결론은 다음과 같습니다.

1. Stage 59와 같은 replay budget(`d4 / 450ms / exact10`)으로 다시 돌려도 `stage59-cap9-prior-veto`가 여전히 1위입니다.
2. 현재 기본 프리셋에 가까운 budget(`d6 / 1500ms / exact10`)으로 다시 돌리면 agreement 격차는 오히려 더 벌어집니다.
3. 두 프로필의 `prior contradiction veto` 발동률은 동일하고, 실제 trade-off는 여전히 **agreement 대 latency/nodes/direct-rate**입니다.
4. 따라서 이번 Stage는 opening runtime 코드를 바꾸는 adoption stage가 아니라, **default 유지 판정 + 문서/벤치 closeout stage**로 보는 편이 맞습니다.

## 배경

Stage 120 전수조사에서 opening subsystem 쪽에 남긴 질문은 단순했습니다.

- 기본 key `stage59-cap9-prior-veto`가 현재 런타임에서도 정말 최선인가
- `stage59-prior-veto`가 더 낮은 node/time 비용으로 충분히 납득 가능한 agreement를 주는가

Stage 59 당시에는 `stage59-cap9-prior-veto`가 strongest reference 종합 순위 1위였고,
`stage59-prior-veto`는 direct rate와 latency가 훨씬 낮은 **저비용 대안**으로 문서에 남았습니다.

그 뒤 Stage 121의 active MPC 의미론 정렬과 Stage 122의 allocation-light search move path 채택이 들어왔기 때문에,
opening default 판단도 **현재 코드 기준으로 한 번 더 확인**할 필요가 있었습니다.

## 테스트 방법

이번 Stage에서는 두 가지 replay를 나눠서 돌렸습니다.

### 1. Stage 59 wrap-up compatible replay

재현 스크립트:

```bash
node tools/evaluator-training/replay-opening-hybrid-reference-suite.mjs \
  --profile-keys stage59-prior-veto,stage59-cap9-prior-veto \
  --candidate-max-depth 4 \
  --candidate-time-limit-ms 450 \
  --candidate-exact-endgame-empties 10 \
  --repetitions 1 \
  --output-json benchmarks/stage123_opening_default_revalidation_replay_20260412.json
```

의도는 Stage 59 wrap-up 당시와 거의 같은 budget에서,
현재 런타임의 candidate behavior를 같은 reference suite에 다시 투영해 보는 것입니다.

### 2. current normal-runtime-like replay

재현 스크립트:

```bash
node tools/evaluator-training/replay-opening-hybrid-reference-suite.mjs \
  --profile-keys stage59-prior-veto,stage59-cap9-prior-veto \
  --candidate-max-depth 6 \
  --candidate-time-limit-ms 1500 \
  --candidate-exact-endgame-empties 10 \
  --repetitions 1 \
  --output-json benchmarks/stage123_opening_default_revalidation_replay_normal_20260412.json
```

이 budget은 current preset/runtime 감각에 더 가까운 쪽입니다.
즉 Stage 59의 역사적 결론을 그대로 반복하는 것이 아니라,
**지금 엔진이 실제로 더 많이 search fallback을 살렸을 때도 기본 key 유지가 맞는지**를 같이 봤습니다.

### 3. 새 orchestrator

위 두 replay를 한 번에 재현하고 비교하기 위해 다음 도구를 추가했습니다.

- `tools/benchmark/run-stage123-opening-default-revalidation-benchmark.mjs`

이 스크립트는
- quick replay,
- normal-runtime-like replay,
- historical Stage 59 baseline
을 함께 읽어 하나의 summary JSON로 묶습니다.

결과 summary:

- `benchmarks/stage123_opening_default_revalidation_benchmark_20260412.json`

## 결과

### A. Stage 59 wrap-up compatible replay

`stage59-cap9-prior-veto`
- worst agreement: `59.34%`
- average agreement: `60.99%`
- average nodes: `282.25`
- average elapsed: `12.97ms`
- average direct rate: `60.44%`

`stage59-prior-veto`
- worst agreement: `57.14%`
- average agreement: `59.52%`
- average nodes: `95.30`
- average elapsed: `4.93ms`
- average direct rate: `85.71%`

해석:
기본 key는 여전히 agreement 기준으로 우세했고,
대신 low-cost alternative는 direct rate와 latency가 확실히 더 낮았습니다.
즉 Stage 59 당시 trade-off 구조가 현재 런타임에서도 그대로 재현됐습니다.

### B. current normal-runtime-like replay

`stage59-cap9-prior-veto`
- worst agreement: `62.64%`
- average agreement: `64.47%`
- average nodes: `1849.29`
- average elapsed: `79.17ms`
- average direct rate: `60.44%`

`stage59-prior-veto`
- worst agreement: `59.89%`
- average agreement: `60.26%`
- average nodes: `584.47`
- average elapsed: `24.91ms`
- average direct rate: `85.71%`

해석:
budget을 키워 search fallback의 효과를 더 살리면,
`stage59-cap9-prior-veto`가 reference와 맞는 비율은 오히려 더 벌어졌습니다.
즉 `stage59-prior-veto`의 장점은 지금도 **싸다**는 데 있고,
기본값을 뒤집을 정도의 agreement recovery는 보이지 않았습니다.

### C. contradiction veto / cap / fallback 비율

이번 revalidation에서 중요한 점은 두 프로필의 `prior contradiction veto` rate가 동일하게 약 `4.95%`라는 것입니다.
즉 이번 비교의 핵심 차이는 veto 자체가 아니라,
**9-ply direct-use cap 때문에 더 많은 구간을 search fallback으로 넘기느냐**입니다.

정리하면:

- `stage59-prior-veto`
  - direct rate `85.71%`
  - search rate `14.29%`
- `stage59-cap9-prior-veto`
  - direct rate `60.44%`
  - search rate `39.56%`

그리고 현재 reference replay 기준에서는,
이 더 큰 search fallback 비율이 agreement 면에서 여전히 값을 합니다.

## historical Stage 59와의 비교

historical artifact `benchmarks/stage59_opening_wrapup_candidates.json`의 핵심 숫자는 다음과 같습니다.

- `stage59-cap9-prior-veto`: worst `60.44%`, avg `62.09%`
- `stage59-prior-veto`: worst `59.89%`, avg `61.17%`

즉 Stage 59 당시에도 current default가 1위였고,
Stage 123 current replay에서도 **순위 자체는 바뀌지 않았습니다.**

작은 수치 차이는 현재 런타임의 search semantics가 조금 달라진 데서 나왔지만,
판정 방향은 그대로 유지됐습니다.

## 채택/기각 판정

**기본값 교체는 기각**합니다.

구체적으로는 다음 판단입니다.

1. `stage59-prior-veto`는 여전히 좋은 **저비용 대안**입니다.
2. 하지만 default swap을 정당화하려면, current runtime 기준에서 agreement 손실이 충분히 상쇄돼야 합니다.
3. quick replay와 normal-runtime-like replay 둘 다 그 기준을 충족하지 못했습니다.
4. 따라서 `DEFAULT_OPENING_HYBRID_TUNING_KEY`는 계속 `stage59-cap9-prior-veto`로 유지합니다.

이번 Stage의 결론은 “opening subsystem에 변화 없음”이 아니라,
**현재 기본값을 다시 검증했고, 교체 근거가 부족하다는 것을 숫자로 닫았다**는 데 있습니다.

## 추가한 파일 / 산출물

- `tools/benchmark/run-stage123-opening-default-revalidation-benchmark.mjs`
- `js/test/stage123_opening_default_revalidation_smoke.mjs`
- `benchmarks/stage123_opening_default_revalidation_replay_20260412.json`
- `benchmarks/stage123_opening_default_revalidation_replay_normal_20260412.json`
- `benchmarks/stage123_opening_default_revalidation_benchmark_20260412.json`
- `docs/reports/implementation/impl-stage-123-opening-default-revalidation-and-final-runtime-closeout.md`

## 실행한 검증

```bash
node tools/benchmark/run-stage123-opening-default-revalidation-benchmark.mjs
node js/test/stage123_opening_default_revalidation_smoke.mjs
node js/test/stage59_opening_wrapup_candidates_smoke.mjs
node js/test/core-smoke.mjs
node js/test/perft.mjs
node js/test/stage83_custom_wld_toggle_smoke.mjs
node js/test/stage121_active_mpc_default_parity_smoke.mjs
node js/test/stage122_allocation_light_search_moves_smoke.mjs
node tools/docs/generate-report-inventory.mjs
node tools/docs/check-doc-sync.mjs
```

## 최종 정리

이로써 Stage 120 조사에서 Step 3로 넘긴 후보들은 모두 닫혔습니다.

1. active MPC default parity hardening → **채택**
2. allocation-light search move path → **채택**
3. opening default revalidation → **기본값 교체 기각 / 현재 default 유지**

즉 현재 클린 최종 런타임은
- active MPC semantics 정렬,
- allocation-light search move path,
- 기존 opening default 유지
까지 반영된 **Stage 123** 기준으로 정리됐습니다.
