# Pilot rollback checklist

Source trigger contract: `.planning/phases/55-pilot-scope-and-acceptance-gate/55-FAILURE-RECOVERY-MATRIX.md`

## Pilot rollback trigger alignment

- [ ] Confirm a `pilot rollback trigger` exists: sample-chain regression, health/ready failure, or unrecoverable operator-facing degradation in the pilot environment.
- [ ] Confirm previous green release id before acting.
- [ ] Record operator actor, reason, and evidence source in the incident log.
- [ ] Record OPS-01 correlation chain for the rollback event:
  - [ ] `schoolId`
  - [ ] `classroomSessionId`
  - [ ] `lessonVersionId`
  - [ ] `pluginId`
  - [ ] `actionKey`
  - [ ] `commandId`
  - [ ] `taskId`

## Canonical pointer and manifest checkpoints

- [ ] Immutable manifest source verified at `${OPENLEARN_RELEASE_MANIFESTS_DIR}/<releaseId>.json`.
- [ ] Canonical active pointer path: `${OPENLEARN_RELEASE_MANIFESTS_DIR}/current.json`
- [ ] Canonical green pointer path: `${OPENLEARN_RELEASE_MANIFESTS_DIR}/green.json`
- [ ] `green.json` references the previous green release that will become rollback target.
- [ ] Operator actor record location documented (incident timeline / release log / operator notebook).

## Execution steps

- [ ] Run `bash ops/deploy/rollback.sh --release-id <previous-green-release-id> --reason <reason> --shared-root <shared-root> --current-root <current-root> --base-url <base-url>`.
- [ ] Confirm systemd units restarted:
  - [ ] `openlearn-web.service`
  - [ ] `openlearn-worker.service`

## Post-rollback verification

- [ ] `/api/health` returns success after rollback.
- [ ] `/api/ready` returns success after rollback.
- [ ] `current.json` points to the rollback target release.
- [ ] If this rollback target is now the restored green baseline, confirm `green.json` was refreshed too.
- [ ] Confirm manifest `releaseId`, `gitSha`, `releaseDir`, and `rollbackTarget` still match the release actually reactivated.
- [ ] Confirm OPS-01 correlation fields remain available for incident/runtime/plugin/command/task drill-down.

## Escalation

- [ ] If `/api/health` or `/api/ready` still fails after rollback, escalate immediately per `backup / restore or deploy health failure` row in `55-FAILURE-RECOVERY-MATRIX.md`.
- [ ] Treat this as a restore trigger if canonical truth can no longer be trusted after rollback.
