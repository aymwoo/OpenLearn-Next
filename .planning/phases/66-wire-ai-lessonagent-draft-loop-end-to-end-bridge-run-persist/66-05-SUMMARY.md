---
phase: 66-wire-ai-lessonagent-draft-loop-end-to-end-bridge-run-persist
plan: 05
subsystem: ui
tags: [react, nextjs, server-actions, lesson-agent, ai-draft, authoring]

# Dependency graph
requires:
  - phase: 66-03
    provides: draftLessonWithAgentAction server action (flag-gated, strict zod, server-derived schoolId)
provides:
  - Teacher-facing 「AI 起草」 trigger button in the lesson flow header (primary gradient + Sparkles)
  - Inline intent panel (stepType segmented control 内容/任务/测验 + intent textarea + 生成草稿 submit)
  - Client wiring to draftLessonWithAgentAction with { lessonId, stepType, intent }
  - Flag-driven visibility: trigger hidden when lessonAgentEnabled is false (server authoritative)
affects: [teacher-editor, lesson-authoring-workspace, draft-review, flag-threading]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Flag-gated UI control: visibility driven by server-provided lessonAgentEnabled prop; backend AGENT_DISABLED remains the authoritative fallback (D-03a)"
    - "Error-code → copy mapping in client: AGENT_DISABLED closes panel with 未启用 message, other errors keep panel open with retry copy + preserved input"
    - "Unconditional hooks: new useState added before the review-mode early returns to avoid worsening the existing conditional-hooks ordering"

key-files:
  created:
    - .planning/phases/66-wire-ai-lessonagent-draft-loop-end-to-end-bridge-run-persist/66-05-SUMMARY.md
  modified:
    - src/components/authoring/lesson-authoring-workspace.tsx
    - src/components/authoring/lesson-authoring-workspace.test.tsx

key-decisions:
  - "lessonAgentEnabled threaded as optional prop (default false); server component flag threading (page→surface→workspace) is a precondition OUT OF this plan's file scope and is flagged for the human gate"
  - "New AI-panel useState hooks placed before the review-mode early returns to keep hooks unconditional"
  - "Segmented control reuses libraryFilters pill pattern but uses font 400/600 (not font-medium 500) per UI-SPEC §typography 2-weight contract for the new surface"
  - "Single aiFeedback line rendered below the header so success/disabled feedback survives panel close while generation errors keep the panel open with preserved input"

patterns-established:
  - "AI draft trigger pattern: primary gradient Button (min-h-12) + inline tonal panel (rounded-[var(--radius-card)], shadow-ambient, no border) on surface-container-lowest"

requirements-completed: [DRAFT-01]

# Metrics
duration: ~18min
completed: 2026-06-01
---

# Phase 66 Plan 05: 课时编辑器「AI 起草」触发器 Summary

**Teacher-facing 「AI 起草」 primary-gradient trigger + inline intent panel (stepType segmented control + intent textarea + 生成草稿) wired to the flag-gated `draftLessonWithAgentAction`, hidden when the agent flag is off.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-06-01T15:10:00Z (approx)
- **Completed (code):** 2026-06-01T15:27:34Z
- **Tasks:** 1 of 2 complete (Task 2 = blocking human-verify, PENDING-HUMAN)
- **Files modified:** 2 (+1 SUMMARY)

## Accomplishments
- Added the 「AI 起草」 trigger to the Flow-main header action row, rendered only when `lessonAgentEnabled` is true (server authoritative; backend `AGENT_DISABLED` is the fallback safety net).
- Built the inline intent panel: `stepType` segmented control (内容/任务/测验 reusing `stepLabels`), intent textarea with the spec placeholder, and a 「生成草稿」 submit that disables while pending / when intent is empty and shows the `正在生成草稿…` loading label.
- Wired submit to `draftLessonWithAgentAction({ lessonId, stepType, intent })` with spec-exact state handling: success closes panel + `AI 草稿已生成，去审校 →`; `AGENT_DISABLED` closes panel + `AI 起草功能未启用。`; other failures keep the panel open + `草稿生成失败，请稍后重试。` with input preserved.
- Extended the co-located test: mocked `@/actions/lesson-agent-actions` and added 4 tests (hidden-when-off, open+submit success, AGENT_DISABLED fallback, generation-failure-keeps-panel). All 19 tests pass; typecheck clean project-wide.

## Task Commits

1. **Task 1: Add AI 起草 trigger + inline intent panel** - `49ec811` (feat)

**Plan metadata:** `<docs-hash>` (docs: complete plan)

_Task 2 (visual + functional human-verify) is a blocking checkpoint — NOT self-approved. See "Human Verification (PENDING)" below._

## Files Created/Modified
- `src/components/authoring/lesson-authoring-workspace.tsx` - Added `lessonAgentEnabled` prop + `AiDraftStepType` type, AI-panel state hooks, `submitAiDraft` handler, the gradient trigger button (`data-testid="lesson-ai-draft-trigger"`), and the inline panel (`data-testid="lesson-ai-draft-panel"`, submit `lesson-ai-draft-submit`, feedback `lesson-ai-draft-feedback`).
- `src/components/authoring/lesson-authoring-workspace.test.tsx` - Mocked the agent action; added the 「AI 起草」 trigger describe block (4 tests).
- `.planning/.../66-05-SUMMARY.md` - This summary.

## Decisions Made
- See `key-decisions` frontmatter. Most consequential: `lessonAgentEnabled` is an optional prop and the **server-side flag threading (page.tsx → lesson-editor-surface.tsx → workspace) is intentionally OUT OF this plan's declared file scope** (`files_modified` lists only the workspace). Until that thread is added, the prop defaults to `false` and the trigger stays hidden in the running app. This is flagged as a precondition for the human-verify checkpoint.

## Deviations from Plan
None - plan executed exactly as written. The new server-action import in the test mock is required to keep existing tests green (standard test-isolation), not a behavior deviation.

## Issues Encountered
None during implementation. One scope boundary noted (flag threading precondition above) rather than an issue.

## Known Stubs
None. The trigger is fully wired to the real server action. The only gap is the upstream flag-threading prop wiring (documented above as out-of-scope precondition), not a stub in this plan's code.

## Human Verification (PENDING)

**Task 2 — `checkpoint:human-verify` (blocking, NOT self-approved):**

Precondition for a live click-through: thread `lessonAgentEnabled` from the server component into `<LessonAuthoringWorkspace>` (via `getAgentRegistryDTO` in `src/app/(teacher)/teacher/editor/page.tsx` → `src/components/surfaces/lesson-editor-surface.tsx`). This wiring is outside 66-05's `files_modified` scope.

Verification steps (from the plan):
1. Seed test DB `agentRegistry` LessonAgent row `enabled=true` (direct write — do NOT flip the seed default).
2. Run the app, open a lesson authoring workspace as an active teacher.
3. Confirm the 「AI 起草」 button appears in the flow header with gradient + Sparkles.
4. Click → inline panel opens; pick a stepType, type an intent, click 「生成草稿」.
5. Confirm success feedback (`AI 草稿已生成，去审校 →`) and a persisted draft version for the lesson.
6. Set the registry row `enabled=false` → reload → confirm the button is hidden.
7. Confirm styling matches DESIGN.md (no 1px divider lines, tonal surfaces, Lexend).

## Next Phase Readiness
- Code-complete and unit-verified; this is the last plan (66-05) of Phase 66.
- Blocker: the visual/functional human-verify gate is pending, and it requires the upstream flag-threading wiring (out-of-scope precondition) to exercise the live path.

---
*Phase: 66-wire-ai-lessonagent-draft-loop-end-to-end-bridge-run-persist*
*Completed (code): 2026-06-01*
