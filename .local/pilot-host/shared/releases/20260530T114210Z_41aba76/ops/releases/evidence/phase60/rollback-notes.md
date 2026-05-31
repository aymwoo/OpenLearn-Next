# Pilot rollback checklist

## Pilot rollback trigger alignment

- [x] Confirmed trigger: `sample-smoke-regression`
- [x] Trigger reason: Sample smoke regression was selected as the controlled rollback rehearsal trigger.
- [x] Operator actor: `phase60-rehearsal`

## Canonical pointer and manifest checkpoints

- [x] Rollback target release id: `20260530T102638Z_490fdd6`
- [x] Canonical rollback path stays on `ops/deploy/rollback.sh`.

## Execution steps

- [x] Command: `bash ops/deploy/rollback.sh --release-id 20260530T102638Z_490fdd6 --reason Sample smoke regression was selected as the controlled rollback rehearsal trigger. --shared-root /home/wuxf/Develop/OpenLearn-Next/.local/pilot-host/shared --current-root /home/wuxf/Develop/OpenLearn-Next/.local/pilot-host/current --base-url http://127.0.0.1:3000`

## Post-rollback verification

- [x] /api/health status: `200`
- [x] /api/ready status: `200`
- [x] Sample smoke status: `passed`
- [x] Rehearsal mode: `live`

## Escalation

- [x] If any post-rollback proof is not green, escalate to restore posture immediately.
