# Phase 60 rehearsal summary

Machine-readable sources:
- `ops/releases/evidence/phase60/smoke-result.json`
- `ops/releases/evidence/phase60/capacity-result.json`
- `ops/releases/evidence/phase60/drill-results.json`
- `ops/releases/evidence/phase60/transport-fallback-notes.md`

## Sample smoke

- Status: `passed`
- Blocking failure: none

## Capacity gate

- Status: `passed`
- Blocking failure: none

## Automated drills

- Status: `escalate`
- Blocking failure: none
- Manual requirement: `transport-fallback-notes.md` still has to be completed as a manual rehearsal artifact

## Shared stop rules

- reconnect <= 15000 ms
- worker backlog <= 120000 ms
- partial failure ratio < 0.02
- degraded duration <= 180000 ms

## Controlled rollout and rollback

- Attempted rehearsal release id: `20260530T114210Z_41aba76`
- Current green release id before rerun: `20260530T102638Z_490fdd6`
- Rollback trigger: `not-credited`
- Trigger reason: `ops/deploy/deploy.sh` failed during the live deploy rehearsal (`SQLITE_BUSY` at `src/lib/dal/classroom.ts:1661` plus a Phase 57 browser-proof timeout), so this run did not produce trustworthy rollback evidence.
- Mode: `live`
- Transport fallback: manual evidence only; update `ops/releases/evidence/phase60/transport-fallback-notes.md` during the live rehearsal and do not treat it as an automated pass bit.
- Failure log: `/home/wuxf/.local/share/opencode/tool-output/tool_e78b54c41001JFLzlmOZ6bim0H`

## Go/No-Go

- Verdict: `no-go`
- Rationale: Live smoke, capacity, and drill artifacts were regenerated on the approved pilot target, but the canonical deploy rehearsal failed on a live `SQLITE_BUSY` write lock and never produced trustworthy rollback proof.
- Closeout note: keep `PILOT-03`, `LOAD-01`, and `LOAD-02` blocked at the milestone audit until the canonical rollout/rollback rehearsal reruns cleanly on the pilot host.
