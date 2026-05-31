# Pilot rollout checklist

## Rollout block trigger alignment

- [x] Confirm no unsupported rollout block trigger is active before deploy.
- [x] Operator actor: `phase60-rehearsal`
- [x] Rehearsal mode: `dry-run`
- [x] Planned rehearsal release id: `phase60-green-release`

## Canonical release truth

- [x] Canonical release path stays on `ops/deploy/deploy.sh`.
- [x] Rollout trigger source recorded as: Sample smoke regression was selected as the controlled rollback rehearsal trigger.

## Execution steps

- [x] Command: `bash ops/deploy/deploy.sh --environment pilot-single-school --actor phase60-rehearsal --shared-root /tmp/opencode/phase60-shared --current-root /tmp/opencode/phase60-current --base-url http://127.0.0.1:3000 --school-id phase60-dry-run-school --classroom-session-id phase60-dry-run-session-1 --lesson-version-id phase60-dry-run-published-version --plugin-id plugin-voting-proof --action-key launchVote --command-id phase60-command-1779962492861 --task-id phase60-task-1779962492861 --dry-run`

## Post-deploy verification

- [x] Phase 60 smoke check completed before rollback trigger evaluation.
- [x] /api/health and /api/ready stayed on the canonical probe path.

## Failure posture

- [x] Only sample-smoke regression or ready-blocker may trigger rollback.
