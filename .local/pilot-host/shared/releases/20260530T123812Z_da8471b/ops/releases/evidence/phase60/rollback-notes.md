# Pilot rollback checklist

## Pilot rollback trigger alignment

- [ ] Confirmed trigger for this live attempt.
- Trigger reason: the canonical deploy rehearsal failed inside `ops/deploy/deploy.sh` before this run produced trustworthy rollback proof.
- [x] Operator actor remains `phase60-rehearsal`.

## Canonical pointer and manifest checkpoints

- [x] Canonical rollback path remains `ops/deploy/rollback.sh`.
- [ ] Rollback target release id can be credited for this live attempt.

## Execution steps

- [ ] No trustworthy explicit `ops/deploy/rollback.sh` invocation was captured for this failed attempt.
- Required rerun path: `bash ops/deploy/rollback.sh --release-id <previous-green-release-id> --reason <live-failure-reason> --shared-root /home/wuxf/Develop/OpenLearn-Next/.local/pilot-host/shared --current-root /home/wuxf/Develop/OpenLearn-Next/.local/pilot-host/current --base-url http://127.0.0.1:3000`

## Post-rollback verification

- [ ] `/api/health` / `/api/ready` / sample-smoke recovery cannot be credited from this attempt.
- Blocking reason: the rollout rehearsal failed with `SQLITE_BUSY` and a Phase 57 browser-proof timeout before rollback evidence was written.

## Escalation

- [x] Treat rollback evidence as missing for closeout until the canonical rollback script is rerun and its post-rollback probes are captured.
