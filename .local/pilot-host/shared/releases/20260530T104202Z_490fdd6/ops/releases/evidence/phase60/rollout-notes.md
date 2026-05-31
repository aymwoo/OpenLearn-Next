# Pilot rollout checklist

## Rollout block trigger alignment

- [x] Confirm no unsupported rollout block trigger is active before deploy.
- [x] Operator actor: `phase60-rehearsal`
- [x] Rehearsal mode: `live`
- [x] Planned rehearsal release id: `20260530T100232Z_490fdd6`

## Canonical release truth

- [x] Canonical release path stays on `ops/deploy/deploy.sh`.
- [x] Rollout trigger source recorded as: Sample smoke regression was selected as the controlled rollback rehearsal trigger.

## Execution steps

- [x] Command: `bash ops/deploy/deploy.sh --environment pilot-single-school-local --actor phase60-rehearsal --shared-root /home/wuxf/Develop/OpenLearn-Next/.local/pilot-host/shared --current-root /home/wuxf/Develop/OpenLearn-Next/.local/pilot-host/current --base-url http://127.0.0.1:3000 --school-id 50bd91b9-8464-44ca-8472-27d9307407bd --classroom-session-id 21e15223-7cda-4112-bf1b-616ec29b1194 --lesson-version-id aad2a7e1-250b-4e63-bce5-dbec62c2d498 --plugin-id plugin-voting-proof --action-key launchVote --command-id phase60-command-1780136797964 --task-id phase60-task-1780136797964`

## Post-deploy verification

- [x] Phase 60 smoke check completed before rollback trigger evaluation.
- [x] /api/health and /api/ready stayed on the canonical probe path.

## Failure posture

- [x] Only sample-smoke regression or ready-blocker may trigger rollback.
