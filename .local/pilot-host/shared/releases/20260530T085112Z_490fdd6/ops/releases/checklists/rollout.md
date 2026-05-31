# Pilot rollout checklist

Source trigger contract: `.planning/phases/55-pilot-scope-and-acceptance-gate/55-FAILURE-RECOVERY-MATRIX.md`

## Rollout block trigger alignment

- [ ] Confirm no `pilot rollout block trigger` is active before deploy: publish failure, launch readiness failure, deploy health failure, or restore failure without a supported operator action back to green.
- [ ] Record operator actor and timestamp in the release notes or incident log before starting.
- [ ] Record OPS-01 correlation chain before starting the command:
  - [ ] `schoolId`
  - [ ] `classroomSessionId`
  - [ ] `lessonVersionId`
  - [ ] `pluginId`
  - [ ] `actionKey`
  - [ ] `commandId`
  - [ ] `taskId`

## Canonical release truth

- [ ] Immutable manifest path: `ops/releases/manifests/<releaseId>.json` (or `${OPENLEARN_RELEASE_MANIFESTS_DIR}/<releaseId>.json` on host).
- [ ] Canonical active pointer: `${OPENLEARN_RELEASE_MANIFESTS_DIR}/current.json`
- [ ] Canonical previous green pointer: `${OPENLEARN_RELEASE_MANIFESTS_DIR}/green.json`
- [ ] Previous green release id captured before rollout.
- [ ] Operator actor record location documented (incident timeline / release log / operator notebook).

## Execution steps

- [ ] Run `bash ops/deploy/deploy.sh --environment <env> --actor <actor> --shared-root <shared-root> --current-root <current-root> --base-url <base-url> --school-id <schoolId> --classroom-session-id <classroomSessionId> --lesson-version-id <lessonVersionId> --plugin-id <pluginId> --action-key <actionKey> --command-id <commandId> --task-id <taskId>`.
- [ ] Confirm systemd units are the official runtime surface:
  - [ ] `openlearn-web.service`
  - [ ] `openlearn-worker.service`
- [ ] Confirm immutable manifest contains `gitSha`, `rollbackTarget`, `migrations.status`, `gates`, `systemdUnits`, `restoreDrill`, and `operatorCorrelation`.

## Post-deploy verification

- [ ] `/api/health` returns success.
- [ ] `/api/ready` returns success.
- [ ] `current.json` points to the just-deployed release.
- [ ] `green.json` now also points to the just-deployed release because post-deploy verification passed.
- [ ] OPS-01 correlation fields in the manifest can be traced back to operator surfaces (runtime inspector / plugin / command / async task).

## Failure posture

- [ ] If migration or `/api/ready` fails, treat it as a rollout block trigger and verify `rollback.sh` executed immediately against the previous green release.
- [ ] Confirm `current.json` was rewound to the previous green release if rollout failed.
- [ ] Do not continue pilot traffic until health/ready are green again.
