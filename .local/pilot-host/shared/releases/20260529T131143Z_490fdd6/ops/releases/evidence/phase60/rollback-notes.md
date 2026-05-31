# Pilot rollback checklist

## Pilot rollback trigger alignment

- [x] Confirmed trigger: `sample-smoke-regression`
- [x] Trigger reason: Sample smoke regression was selected as the controlled rollback rehearsal trigger.
- [x] Operator actor: `phase60-rehearsal`

## Canonical pointer and manifest checkpoints

- [x] Rollback target release id: `phase60-green-release`
- [x] Canonical rollback path stays on `ops/deploy/rollback.sh`.

## Execution steps

- [x] Command: `bash ops/deploy/rollback.sh --release-id phase60-green-release --reason Sample smoke regression was selected as the controlled rollback rehearsal trigger. --shared-root /tmp/opencode/phase60-shared --current-root /tmp/opencode/phase60-current --base-url http://127.0.0.1:3000 --dry-run`

## Post-rollback verification

- [x] /api/health status: `200`
- [x] /api/ready status: `200`
- [x] Sample smoke status: `dry-run`
- [x] Rehearsal mode: `dry-run`

## Escalation

- [x] If any post-rollback proof is not green, escalate to restore posture immediately.
