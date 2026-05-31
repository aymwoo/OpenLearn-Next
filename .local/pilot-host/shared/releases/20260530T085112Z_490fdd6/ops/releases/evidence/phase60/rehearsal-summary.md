# Phase 60 rehearsal summary

Machine-readable sources:
- `ops/releases/evidence/phase60/smoke-result.json`
- `ops/releases/evidence/phase60/capacity-result.json`
- `ops/releases/evidence/phase60/drill-results.json`
- `ops/releases/evidence/phase60/transport-fallback-notes.md`

## Sample smoke

- Status: `dry-run`
- Blocking failure: none

## Capacity gate

- Status: `dry-run`
- Blocking failure: none

## Automated drills

- Status: `dry-run`
- Blocking failure: none

## Shared stop rules

- reconnect <= 15000 ms
- worker backlog <= 120000 ms
- partial failure ratio < 0.02
- degraded duration <= 180000 ms

## Controlled rollout and rollback

- Rehearsal release id: `phase60-green-release`
- Rollback trigger: `sample-smoke-regression`
- Trigger reason: Sample smoke regression was selected as the controlled rollback rehearsal trigger.
- Mode: `dry-run`
- Transport fallback: manual evidence only; update `ops/releases/evidence/phase60/transport-fallback-notes.md` during the live rehearsal and do not treat it as an automated pass bit.

## Go/No-Go

- Verdict: `no-go`
- Rationale: Dry-run artifacts are authoring-only and cannot satisfy PILOT-03 / LOAD-01 / LOAD-02 until a live pilot-host rehearsal replaces them.
- Closeout note: This file is currently an authoring artifact, not milestone close evidence.
