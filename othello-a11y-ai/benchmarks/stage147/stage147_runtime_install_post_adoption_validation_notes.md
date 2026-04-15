# Stage 147 runtime install and post-adoption validation notes

Final action: **confirm-active-runtime-switch-installed**
Rollback performed: **no**

## Installation
- install performed: yes
- archive created: no
- installed matches selected: yes
- snapshot matches installed: yes

## Active runtime after install
- evaluation: balanced13-alllate-smoothed stability extras 0.90x
- move-ordering: trained-move-ordering-linear-v2
- tuple residual: diagonal-top24-latea-endgame-patched-calibrated
- MPC: balanced13-alllate-smoothed-stability-090__runtime-mpc

## Search-cost
- depth same-best rate: 91.7%
- exact same-score rate: 100.0%
- combined node delta vs previous active: -11.525%
- combined elapsed delta vs previous active: -14.253%

## Throughput
- installed nodes/ms gain vs previous active: 18.10%
- installed move agreement vs previous active: 100.0%

## Paired self-play
- primary weighted point gap: 0.000 (worst 0.000)
- all-scenarios weighted point gap: 0.000 (worst 0.000)
- sanity weighted point gap: 0.000

## Final decision
Action: confirm-active-runtime-switch-installed
Rationale: 설치된 active runtime이 Stage 146 selected module과 byte-level parity를 유지했고, archived previous-active 대비 paired self-play / throughput / explicit search-cost post-adoption validation도 최종 adoption gate와 같은 방향으로 통과했습니다.
Next action: treat-diagonal-compact-tuple-stack-as-active-default
