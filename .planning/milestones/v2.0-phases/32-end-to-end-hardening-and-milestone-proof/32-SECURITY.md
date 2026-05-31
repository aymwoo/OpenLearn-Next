---
phase: 32
slug: end-to-end-hardening-and-milestone-proof
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-17
---

# Phase 32 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| bootstrap script -> published lesson snapshot | canonical proof seed must stay deterministic and avoid a second runtime payload path | seeded runtime descriptor, published snapshot payload |
| runtime submit truth -> classroom read model | classroom proof feedback must stay server-owned and auditable | `runtimeSessionId`, `proofSummary`, classroom evidence |
| host result envelope -> iframe UI | runtime UI must not enter terminal success from untrusted or malformed host results | browser bridge result envelope, terminal-state flags |
| player shell -> runtime failure UX | recovery must preserve student context instead of route-bouncing out of the learning surface | retry intent, local draft state, shell banners |
| verifier static guards -> repository proof claims | close gate must reject proof drift and false-pass verifier behavior | verifier scripts, focused suites, close signal |
| classroom UI -> inspector route | proof feedback can deep-link only to the current proof session without weakening scope rules | `runtimeSessionId`, inspector href |
| iframe -> shared host bridge | pre-bootstrap handshake is allowed narrowly; other bridge traffic must remain instance-scoped | `runtime-frame-ready`, runtime bridge messages |
| classroom SSE -> teacher client refresh bridge | client refresh can react to SSE, but DTO truth must stay on the server side | snapshot version, `router.refresh()` trigger |
| host iframe sandbox -> runtime app route | iframe needs same-origin startup for the first-party pilot route without widening browser powers | iframe sandbox tokens, app route startup |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-32-01-01 | T | bootstrap-dev-db proof seed | mitigate | Canonical proof lesson reuses the existing `htmlCourseware` descriptor and still freezes through editor/publish snapshot flow; see `32-01-SUMMARY.md` and `scripts/bootstrap-dev-db.ts`. | closed |
| T-32-01-02 | R | runtime submit result | mitigate | Submit result carries `runtimeSessionId`, `classroomSessionId`, `actorId`, and `submittedAt`, preserving drill-down and auditability; see `32-01-SUMMARY.md`. | closed |
| T-32-01-03 | I | classroom first-feedback DTO | mitigate | Classroom DTO exposes only UI-ready proof summary and avoids leaking raw runtime state JSON; see `32-01-SUMMARY.md`, `32-VERIFICATION.md`. | closed |
| T-32-02-01 | T | terminal submit state | mitigate | Runtime enters locked terminal state only on trusted submit success; failed actions do not lock or discard draft context; see `32-02-SUMMARY.md`. | closed |
| T-32-02-02 | D | player failure recovery | mitigate | Save/submit failure stays on `/student/player` with retry CTA, preventing route-bounce denial of progress; confirmed in `32-HUMAN-UAT.md` and `32-VERIFICATION.md`. | closed |
| T-32-02-03 | I | success summary payload | mitigate | Student sees only UI-ready success summary, not raw bridge metadata or internal runtime state; see `32-02-SUMMARY.md`. | closed |
| T-32-03-01 | T | verify:phase32 guard coverage | mitigate | `verify:phase32` now checks proof seed, launch affordance, terminal posture, recovery, classroom proof, sandbox startup, inspector review, and demo handoff drift; see `32-03-SUMMARY.md`, `32-07-SUMMARY.md`, `32-VALIDATION.md`. | closed |
| T-32-03-02 | R | milestone proof regression suites | mitigate | Focused semantic regressions back the milestone close signal instead of string-only or snapshot-only proof; see `32-03-SUMMARY.md`. | closed |
| T-32-03-03 | D | chained verifier posture | mitigate | External close remains a single `verify:phase32` command while older phase verifiers stay internal prerequisites; see `32-03-SUMMARY.md`, `32-VERIFICATION.md`. | closed |
| T-32-04-01 | I | inspector deep-link CTA | mitigate | Classroom-first proof CTA uses the current proof `runtimeSessionId` only and preserves inspector scope rules; see `32-04-SUMMARY.md`, `32-VERIFICATION.md`. | closed |
| T-32-04-02 | R | demo handoff doc | mitigate | `32-DEMO-HANDOFF.md` explicitly documents bootstrap, accounts, proof order, and second-step inspector drill-down, removing oral handoff risk; see `32-04-SUMMARY.md`. | closed |
| T-32-04-03 | S | launch/classroom proof affordance | mitigate | Proof discoverability stays on existing surfaces and does not introduce a misleading second primary entry point; confirmed in `32-04-SUMMARY.md` and final UAT. | closed |
| T-32-05-01 | S | runtime bridge handshake | mitigate | Host accepts only the narrow pre-bootstrap `runtime-frame-ready` handshake and keeps all other messages instance-scoped; see `32-05-SUMMARY.md`. | closed |
| T-32-05-02 | T | runtime-host-client.tsx | mitigate | Save/submit/interact never receive pre-bootstrap relaxation, preserving instance filtering on sensitive runtime actions; see `32-05-SUMMARY.md`. | closed |
| T-32-05-03 | D | pilot iframe bootstrap | mitigate | Placeholder `runtime-pilot-pending` contract and focused regression prevent host/iframe deadlock from regressing; see `32-05-SUMMARY.md`. | closed |
| T-32-06-01 | T | teacher live refresh bridge | mitigate | Teacher refresh bridge uses SSE only as a `router.refresh()` trigger and keeps classroom snapshot DTO as the single truth source; see `32-06-SUMMARY.md`, `32-VERIFICATION.md`. | closed |
| T-32-06-02 | I | classroom proof card | mitigate | Classroom proof feedback consumes only `runtimeProof`, `runtimeSessionId`, and inspector href without exposing raw runtime state; see `32-06-SUMMARY.md`. | closed |
| T-32-06-03 | D | classroom live session refresh | mitigate | EventSource attaches only for live sessions and closes on teardown, avoiding stale or unbounded subscriptions; see `32-06-SUMMARY.md`. | closed |
| T-32-07-01 | E | runtime iframe sandbox | mitigate | iframe sandbox now adds only `allow-same-origin` while explicitly rejecting wider powers such as top navigation, popups, or downloads; see `32-07-SUMMARY.md`. | closed |
| T-32-07-02 | T | phase32 verifier | mitigate | `verify:phase32` includes a permanent sandbox startup drift guard covering required and forbidden tokens; see `32-07-SUMMARY.md`, `32-VALIDATION.md`. | closed |
| T-32-07-03 | I | runtime startup model | accept | Current pilot is a repo-local first-party route using the existing app shell; same-origin startup is accepted for that bounded context and does not expand to cross-origin or third-party embeds. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-32-01 | T-32-07-03 | The current runtime pilot is a first-party Next.js route inside the same application shell. Allowing same-origin startup is required for the bounded, repo-local pilot to boot correctly, while broader browser capabilities remain forbidden. | the agent security audit | 2026-05-17 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-17 | 21 | 21 | 0 | the agent (secure-phase) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-17
