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

## Shared stop rules

- reconnect <= 15000 ms
- worker backlog <= 120000 ms
- partial failure ratio < 0.02
- degraded duration <= 180000 ms

## Controlled rollout and rollback

- Rehearsal release id: `20260530T100232Z_490fdd6`
- Rollback trigger: `sample-smoke-regression`
- Trigger reason: Sample smoke regression was selected as the controlled rollback rehearsal trigger.
- Mode: `live`
- Transport fallback: manual evidence only; update `ops/releases/evidence/phase60/transport-fallback-notes.md` during the live rehearsal and do not treat it as an automated pass bit.

## Go/No-Go

- Verdict: `go`
- Rationale: Rollback recovered health, ready, and sample smoke.
- Closeout note: live pilot-host evidence recorded on the canonical release path.
