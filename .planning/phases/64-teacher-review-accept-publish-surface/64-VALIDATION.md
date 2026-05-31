---
phase: 64
slug: teacher-review-accept-publish-surface
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-31
---

# Phase 64 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + React Testing Library |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- src/lib/dal/lesson-authoring.test.ts src/actions/lesson-authoring-actions.test.ts` |
| **Full suite command** | `pnpm test -- src/db/schema.draft-lesson-versions.test.ts src/lib/dal/lesson-authoring.test.ts src/lib/dal/lesson-authoring.draft-persist.test.ts src/actions/lesson-authoring-actions.test.ts src/components/surfaces/lesson-editor-surface.test.tsx src/components/authoring/lesson-authoring-workspace.test.tsx` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task-specific `pnpm test -- ...` command from its PLAN.md.
- **After every plan wave:** Run `pnpm test -- src/db/schema.draft-lesson-versions.test.ts src/lib/dal/lesson-authoring.test.ts src/actions/lesson-authoring-actions.test.ts src/components/surfaces/lesson-editor-surface.test.tsx src/components/authoring/lesson-authoring-workspace.test.tsx`.
- **Before `$gsd-verify-work`:** Full suite above plus `pnpm typecheck` must be green.
- **Max feedback latency:** 90 seconds for targeted checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 64-01-01 | 01 | 1 | REVIEW-01/03 | S64-01/S64-02 | Draft schema/DTOs expose review data without DB access from UI | unit/source | `pnpm test -- src/db/schema.draft-lesson-versions.test.ts src/lib/dto/lesson-authoring.test.ts` | ✅ existing infra | ⬜ pending |
| 64-01-02 | 01 | 1 | REVIEW-01 | S64-01 | Diff rows classify new/modified/deleted/unchanged from validated DTOs | unit | `pnpm test -- src/lib/dal/lesson-authoring.test.ts` | ✅ existing infra | ⬜ pending |
| 64-02-01 | 02 | 2 | REVIEW-03 | S64-01/S64-02/S64-03 | Apply replaces active steps only after authorized scoped lookup and marks draft applied | unit/integration | `pnpm test -- src/lib/dal/lesson-authoring.test.ts` | ✅ existing infra | ⬜ pending |
| 64-02-02 | 02 | 2 | REVIEW-03 | S64-04 | Server Actions validate input and update draft/lesson/steps cache tags | unit | `pnpm test -- src/actions/lesson-authoring-actions.test.ts` | ✅ existing infra | ⬜ pending |
| 64-03-01 | 03 | 3 | REVIEW-01/02/04 | S64-03 | Editor review mode renders single-column diff, limited fields, and no type/plugin controls | RTL/source | `pnpm test -- src/components/surfaces/lesson-editor-surface.test.tsx src/components/authoring/lesson-authoring-workspace.test.tsx` | ✅ existing infra | ⬜ pending |
| 64-03-02 | 03 | 3 | REVIEW-02/03/04 | S64-02/S64-03 | Per-step/global accept-discard controls and confirmations match UI-SPEC copy | RTL | `pnpm test -- src/components/authoring/lesson-authoring-workspace.test.tsx` | ✅ existing infra | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No Wave 0 scaffold is needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Desktop visual review against tonal/no-line UI contract | REVIEW-04 | Automated tests can assert copy/classes, but final composition requires visual inspection | Open `/teacher/editor?courseId={id}&lessonId={id}&mode=review` with a pending draft and compare against `64-UI-SPEC.md`. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-31

