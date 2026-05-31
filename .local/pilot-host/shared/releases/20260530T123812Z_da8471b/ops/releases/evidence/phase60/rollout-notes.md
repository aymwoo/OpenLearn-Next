# Pilot rollout checklist

## Rollout block trigger alignment

- [x] Confirm no unsupported rollout block trigger is active before deploy.
- [x] Operator actor: `phase60-rehearsal`
- [x] Rehearsal mode: `live`
- [x] Attempted rehearsal release id: `20260530T114210Z_41aba76`

## Canonical release truth

- [x] Canonical release path stayed on `ops/deploy/deploy.sh`.
- [x] Live pre-rollout evidence was regenerated before the canonical deploy attempt:
  - `ops/releases/evidence/phase60/smoke-result.json` → `passed` at `2026-05-30T11:41:17.657Z`
  - `ops/releases/evidence/phase60/capacity-result.json` → `passed` at `2026-05-30T11:41:19.812Z`
  - `ops/releases/evidence/phase60/drill-results.json` → `escalate` at `2026-05-30T11:41:22.161Z`

## Execution steps

- [x] Command: `bash ops/deploy/deploy.sh --environment pilot-single-school-local --actor phase60-rehearsal --shared-root /home/wuxf/Develop/OpenLearn-Next/.local/pilot-host/shared --current-root /home/wuxf/Develop/OpenLearn-Next/.local/pilot-host/current --base-url http://127.0.0.1:3000 --school-id 50bd91b9-8464-44ca-8472-27d9307407bd --classroom-session-id 9331a485-8ffb-4c11-b1f9-86d87220d717 --lesson-version-id d5a4aef4-6a09-4efe-8f79-1ccd7cb87bcf --plugin-id plugin-voting-proof --action-key launchVote --command-id phase60-command-1780141330832 --task-id phase60-task-1780141330832`

## Post-deploy verification

- [ ] Canonical deploy rehearsal completed successfully.
- Failure 1: `SQLITE_BUSY: database is locked` while inserting `classroomParticipant` at `src/lib/dal/classroom.ts:1661` during the embedded Phase 57 browser proof.
- Failure 2: Playwright timed out waiting for `已提交，等待老师结束本轮投票` in `scripts/proof-phase57-classroom-runtime.ts:818`.
- Failure log: `/home/wuxf/.local/share/opencode/tool-output/tool_e78b54c41001JFLzlmOZ6bim0H`

## Failure posture

- [x] Only sample-smoke regression or ready-blocker remain the allowed rollback triggers.
- [ ] This attempt cannot be credited as a successful rollout rehearsal for closeout.
