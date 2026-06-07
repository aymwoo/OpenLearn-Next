# Phase 64: Teacher Review & Accept-Publish Surface - Research

**Researched:** 2026-05-31
**Status:** Complete
**Question:** What do I need to know to PLAN this phase well?

## User Constraints

Source: `.planning/phases/64-teacher-review-accept-publish-surface/64-CONTEXT.md` [VERIFIED: codebase]

### Locked Implementation Decisions

- D-01: Use a single-column diff list with per-step state labels: new, modified, deleted, unchanged.
- D-02: Compare draft steps and live steps by native index position: `draftSteps[n]` against `liveSteps[n]`.
- D-03: Use an inline right-side edit panel for title, description, and markdown/content fields; do not use a modal and do not leave the diff view.
- D-04: Accepting a draft applies it to active `lessonSteps`; it does not publish automatically.
- D-05: Add lesson-level source backlinks such as `aiDraftAppliedAt` and `latestDraftVersionId`; do not add provenance columns to live `lessonSteps`.
- D-06: If active `lessonSteps` are non-empty, applying the draft must explicitly warn that current steps will be overwritten and the action is irreversible.
- D-07: Applied draft rows become `status: 'applied'`.
- D-08: Discarded draft rows become `status: 'discarded'` with `archivedAt`; keep the row and do not modify active `lessonSteps`.
- D-09: Embed review mode inside `/teacher/editor` with `?mode=review`.
- D-10: Show a glass top discovery prompt in edit mode when an unreviewed AI draft exists.
- D-11: In review mode, collapse the resource panel, render the diff list full-width, keep a top action bar, and slide the edit panel only when a step is selected.
- D-12: Preserve review edits in client state only while toggling between edit/review; refresh clears unsubmitted edits.
- D-13: Expose only title, description, and content fields in the review editor; do not expose type or advanced plugin/voting configuration.
- D-14: Support per-step accept/discard plus global accept/discard.

### Deferred Ideas

- Eval/guardrails belong to Phase 65.
- Multi-Agent/RAG/plugin-AI expansion is out of scope.
- Multi-version draft comparison, autosave of review edits, mobile-first review UI, and three-way merge conflict resolution are deferred.

## Project Constraints (from AGENTS.md)

- Use Next.js 16 App Router, React 19.2, Turbopack, Auth.js v5, Drizzle ORM, SQLite-first. [VERIFIED: AGENTS.md]
- UI and RSC components must not access DB directly; all reads/writes go through DAL and Server Actions. [VERIFIED: AGENTS.md]
- Node runtime is primary; Edge is only for SSE. Phase 64 DB/auth work must stay in Node server actions/DAL. [VERIFIED: AGENTS.md]
- Writes must update or invalidate explicit cache tags. Draft apply/discard must update `draft:${lessonId}`, `lesson:${lessonId}`, and `steps:${lessonId}`; course/teacher-course tags should follow authoring action patterns. [VERIFIED: `src/lib/cache-policy.ts`, `src/actions/lesson-authoring-actions.ts`]
- SQLite relations must cascade delete. New `latestDraftVersionId` FK must use `onDelete: "cascade"` if implemented as an FK. [VERIFIED: AGENTS.md]
- UI must align with Stitch project `5322129002350954765` and `DESIGN.md`: Lexend, no 1px divider lines, tonal surfaces, glass/gradient CTA. [VERIFIED: `DESIGN.md`, `64-UI-SPEC.md`]
- Before code edits during execution, GitNexus impact analysis is required for edited functions/classes/methods. [VERIFIED: AGENTS.md]

## Standard Stack

- No new runtime dependencies are needed. Use existing Drizzle/libSQL, Zod, Server Actions, React client components, local Button/Badge/Card primitives, lucide-react icons, and Vitest/React Testing Library. [VERIFIED: `package.json`, `components.json`, `src/components/ui/button.tsx`]
- The existing `components.json` declares shadcn-compatible local setup with `radix-nova`, Tailwind CSS variables in `src/app/globals.css`, and lucide icons. [VERIFIED: `components.json`, `src/app/globals.css`]
- Testing should use existing Vitest patterns: DAL tests in `src/lib/dal/*.test.ts`, Server Action tests in `src/actions/*.test.ts`, and jsdom RTL component tests in `src/components/**/*.test.tsx`. [VERIFIED: `src/lib/dal/lesson-authoring.test.ts`, `src/actions/lesson-authoring-actions.test.ts`, `src/components/authoring/lesson-authoring-workspace.test.tsx`]

## Existing Phase 63 Foundation

- `draftLessonVersions` already exists with `lessonId`, `version`, `snapshotJson`, `source`, `sourceCommandId`, `createdById`, `createdAt`, an index on `(lessonId, version)`, and a unique `(lessonId, sourceCommandId)` index. [VERIFIED: `src/db/schema.ts`]
- `persistDraftLessonVersion()` only inserts `draftLessonVersions` and deliberately does not write `lessons` or `lessonSteps`. Phase 64 must add separate apply/discard behavior instead of mutating this invariant. [VERIFIED: `src/lib/dal/lesson-authoring.ts`, `src/lib/dal/lesson-authoring.draft-persist.test.ts`]
- `lesson.draft.persist` is registered with `dedupe: "required"` and emits `lesson.draft.persisted` summary-only events with draft id, version, step count, and source. Phase 64 should not rework this command. [VERIFIED: `src/features/platform-core/commands/registry.ts`, `src/features/platform-core/commands/handlers/lesson-draft.ts`, `src/features/platform-core/events/contracts.ts`]
- The current schema does not yet have draft lifecycle columns (`status`, `archivedAt`) or lesson backlinks (`aiDraftAppliedAt`, `latestDraftVersionId`). These are Phase 64 schema work. [VERIFIED: `src/db/schema.ts`]

## Architecture Patterns

### Data Shape

- Add DTO schemas in `src/lib/dto/lesson-authoring.ts` for the review surface rather than passing raw Drizzle rows to UI. Needed DTOs:
  - latest draft summary with `draftVersionId`, `version`, `source`, `status`, `createdAt`, `stepCount`
  - review DTO containing `lesson`, live active steps, draft steps, and computed diff rows
  - diff row type: `new | modified | deleted | unchanged`, plus live/draft step references by index
  - apply/discard result DTOs with `lessonId`, `courseId`, `draftVersionId`, `status`, and step count
  [VERIFIED: existing DTO parser pattern in `src/lib/dto/lesson-authoring.ts`]

### DAL

- Add DAL reads/writes in `src/lib/dal/lesson-authoring.ts`, guarded by `assertActiveTeacher()` / `getScopedLesson()` patterns:
  - `getLatestDraftVersion(lessonId)` or `getLessonDraftReviewDTO({ lessonId })`
  - `applyDraftToLiveLesson({ lessonId, draftVersionId, editedSteps })`
  - `discardDraftLessonVersion({ lessonId, draftVersionId })`
  [VERIFIED: `getScopedLesson`, `getLessonEditorDTO`, `publishLesson`, `persistDraftLessonVersion` patterns in `src/lib/dal/lesson-authoring.ts`]
- Applying a draft should archive all active `lessonSteps` then insert replacement rows from draft/edited steps with LexoRank ranks. This matches the locked decision that accept fully replaces active steps. Use a DB transaction if available through Drizzle/libSQL; if project patterns lack transaction coverage, the plan should require adding one or documenting the safe fallback. [VERIFIED: `lessonSteps.archivedAt`, `src/lib/ranking/lexorank.ts` exists by project convention; transaction support must be checked during execution]
- `latestDraftVersionId` should point to `draftLessonVersions.id` and `aiDraftAppliedAt` should be set on apply; draft row `status` becomes `applied`. Discard sets `status: "discarded"` and `archivedAt` without touching live steps. [VERIFIED: CONTEXT D-05/D-07/D-08]

### Server Actions

- Extend `src/actions/lesson-authoring-actions.ts` with Zod-validated actions:
  - `applyDraftLessonVersionAction`
  - `discardDraftLessonVersionAction`
  - possibly a lightweight local-edit payload schema for reviewed draft steps
  [VERIFIED: existing action pattern and `handleActionError()`]
- On success, actions must call `updateTag()` for `cacheTags.draftLesson(lessonId)`, `cacheTags.lesson(lessonId)`, `cacheTags.steps(lessonId)`, and existing authoring tags when `courseId` is available. [VERIFIED: `invalidateLessonAuthoringTags()` and `cacheTags.draftLesson()`]

### Editor Integration

- `src/app/(teacher)/teacher/editor/page.tsx` currently accepts only `courseId` and `lessonId`; add `mode?: string` parsing and pass `mode` plus draft review DTO/summary to `LessonEditorSurface`. [VERIFIED: `src/app/(teacher)/teacher/editor/page.tsx`]
- `LessonEditorSurface` owns the header and passes the main workspace props. It is the right place for the glass discovery prompt and header segmented mode switch, while `LessonAuthoringWorkspace` is the right place for conditionally rendering the edit workspace or review workspace. [VERIFIED: `src/components/surfaces/lesson-editor-surface.tsx`, `src/components/authoring/lesson-authoring-workspace.tsx`]
- Extracting a dedicated `LessonDraftReviewWorkspace` component is recommended to avoid increasing `LessonAuthoringWorkspace` complexity; it can receive `review`, `lessonId`, and callbacks/actions. [VERIFIED: current `lesson-authoring-workspace.tsx` is already large and contains nested `FlowStepCard`]

## Don't Hand-Roll

- Do not create a second step payload schema. Reuse `lessonStepPayloadSchema` and existing `LessonStepPayload` types. [VERIFIED: `src/lib/dto/lesson-authoring.ts`]
- Do not create a standalone route outside `/teacher/editor`; Phase 64 is explicitly `?mode=review` inside the editor. [VERIFIED: CONTEXT D-09]
- Do not auto-publish after apply. The existing `publishLesson()` / `publishLessonAction()` chain remains the only publish path. [VERIFIED: CONTEXT D-04, `src/lib/dal/lesson-authoring.ts`]
- Do not expose step `type` or advanced plugin/voting config in the review edit panel. [VERIFIED: CONTEXT D-13, `64-UI-SPEC.md`]
- Do not import DB/DAL into client components. Client components call Server Actions only. [VERIFIED: AGENTS.md]

## Common Pitfalls

- `draftLessonVersions.snapshotJson` currently stores `{ steps: input.steps }`; apply/review code must parse and validate this shape before rendering or writing live steps. [VERIFIED: `persistDraftLessonVersion()`]
- Existing `lessonSteps.title` is separate from `payloadJson`; content/task/quiz payloads do not all have the same title field. Diff and review edit code must derive/edit title consistently:
  - content: `payload.title` and step title
  - task: `payload.prompt` as description/content source unless a separate reviewed title is carried
  - quiz: `payload.question`
  [VERIFIED: `deriveStepTitle()`, `getStepDescription()`]
- Existing `FlowStepCard` uses line-like visual elements (`w-1` rails). Phase 64 UI must obey the no-1px-divider rule in new review UI; use tonal surfaces and spacing. [VERIFIED: `DESIGN.md`, `64-UI-SPEC.md`]
- Applying by archiving old rows and inserting new rows is destructive to active steps. Confirmation copy and tests must prove discard leaves active steps untouched and apply does not affect published snapshots until the teacher separately publishes. [VERIFIED: CONTEXT D-04/D-06/D-08]
- Schema changes require migration-first discipline. Phase 64 will touch `src/db/schema.ts`; plan must include migration generation/application and tests for the new columns. [VERIFIED: AGENTS.md, existing `drizzle/0014_phase63_draft_lesson_versions.sql`]

## Recommended Plan Shape

1. Schema and DTO foundation:
   - add lifecycle/status columns and lesson backlinks
   - add DTO schemas and pure diff computation tests
   - generate/apply migration
2. DAL and Server Actions:
   - read latest pending draft and compute review DTO
   - apply draft to live steps with backlinks/status/cache result
   - discard draft without changing live steps
3. Editor UI integration:
   - parse `mode=review`
   - show glass discovery prompt and segmented mode switch
   - render single-column diff and client-only review edits
4. Verification and polish:
   - RTL tests for prompt/review controls/confirmations
   - source assertions for no DB import in UI
   - targeted DAL/action/component test runs

## Validation Architecture

| Requirement | Automated validation target | Manual validation |
|-------------|-----------------------------|-------------------|
| REVIEW-01 | Unit tests for diff computation (`new`, `modified`, `deleted`, `unchanged`) and RTL assertions that badges/text render in review mode. | Visual check that the diff is single-column and scannable. |
| REVIEW-02 | RTL tests for per-step accept/discard local state and side edit panel fields limited to title/description/content. | Confirm the panel does not expose type or advanced plugin config. |
| REVIEW-03 | DAL/action tests proving apply archives/replaces active steps, marks draft `applied`, sets lesson backlinks, and discard marks `discarded` without live-step writes. | Confirm publish remains a separate existing button after apply. |
| REVIEW-04 | Source assertions and component tests for Lexend/token classes, no new UI kit, no third-party registry blocks, and no obvious divider-heavy layout. | Browser check at desktop width against `64-UI-SPEC.md`. |

Quick commands for executor plans:
- `pnpm test -- src/lib/dal/lesson-authoring.test.ts src/lib/dal/lesson-authoring.draft-persist.test.ts`
- `pnpm test -- src/actions/lesson-authoring-actions.test.ts`
- `pnpm test -- src/components/surfaces/lesson-editor-surface.test.tsx src/components/authoring/lesson-authoring-workspace.test.tsx`
- `pnpm test -- src/db/schema.draft-lesson-versions.test.ts`

## Security Notes

- Threat S64-01: cross-school draft access. Mitigation: all read/apply/discard DAL methods must use `assertActiveTeacher()` and scoped lesson lookup before touching draft rows. [VERIFIED: existing DAL auth pattern]
- Threat S64-02: accidental publish. Mitigation: apply only changes live `lessonSteps`; `publishLesson()` remains separate and explicit. [VERIFIED: CONTEXT D-04]
- Threat S64-03: destructive overwrite without teacher awareness. Mitigation: UI confirmation when active steps are non-empty and action tests around destructive apply path. [VERIFIED: CONTEXT D-06]
- Threat S64-04: stale UI after write. Mitigation: Server Actions update draft, lesson, and steps cache tags after apply/discard. [VERIFIED: `src/actions/lesson-authoring-actions.ts`]
- Threat S64-05: snapshot payload leakage into domain events. Mitigation: if Phase 64 adds events, payloads must stay summary-only and use existing event contract patterns. [VERIFIED: `src/features/platform-core/events/contracts.ts`]

## Package Legitimacy Audit

No external packages are recommended or required for Phase 64.

## Confidence

- HIGH: Existing draft persistence, command bus, cache tag, DTO, action, and editor component patterns are directly verified in the repository.
- HIGH: UI contract is already approved in `64-UI-SPEC.md`.
- MEDIUM: Exact transaction API and LexoRank insertion helper details should be confirmed during execution before editing DAL apply logic.

## RESEARCH COMPLETE

