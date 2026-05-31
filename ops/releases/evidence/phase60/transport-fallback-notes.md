# Phase 60 transport fallback rehearsal notes

- Trigger: pending manual rehearsal
- Trust boundary: WebSocket-first transport with SSE only as rollback surface
- Impact scope: single-school pilot classroom voting sample chain
- Operator action: execute the approved transport fallback runbook and capture the classroom/session scope
- Escalation condition: degraded posture lasts longer than 180000 ms or becomes teacher-visible enough to threaten pilot trust
- Conclusion: manual artifact required; this file must be updated during the live rehearsal
- Close gate status: manual evidence only; update `ops/releases/evidence/phase60/transport-fallback-notes.md` during the live rehearsal and do not treat it as an automated pass bit.
