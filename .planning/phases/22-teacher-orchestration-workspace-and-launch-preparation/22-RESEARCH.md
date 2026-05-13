# Phase 22 Research — Teacher orchestration workspace and launch preparation

**Date:** 2026-05-13
**Phase:** 22
**Status:** Complete

## Research question

What does the planner need to know to turn the current `/teacher/editor` and
`/teacher/launch` flow into a teacher-ready orchestration workspace without
breaking published-snapshot launch safety, teacher-owned route boundaries, or
the existing Stitch-aligned shell?

## Executive summary

- Phase 22 should extend existing lesson-authoring and classroom-launch
  contracts instead of creating a second session draft/config system.
- The safest implementation path is a three-part orchestration model:
  1. `editor preparation summary` on the existing teacher-owned
     `courseId + lessonId` editor path.
  2. `launch workspace DTO` built on top of `getClassroomConsoleDTO()` and
     published lesson snapshots.
  3. `focused regression + verifier guard` that locks route discipline,
     readiness grading, and published-snapshot-only launch behavior.
- Existing code already provides most of the raw ingredients:
  `getLessonPublishReadinessDTO()`, `getLessonEditorDTO().publishState`,
  `buildLaunchPreview()`, `ClassroomLaunchPreviewDTOSchema`,
  `ClassroomLaunchSurface`, and the existing launch/editor test suites.
- The real work is to promote those ingredients into a coherent teacher-facing
  preparation contract: explicit run sheet data, roster summary, launch
  readiness grading, and stable editor-to-launch orchestration cues.

## Existing code facts

### 1. `/teacher/editor` is already the only valid lesson-prep entry

- `src/app/(teacher)/teacher/editor/page.tsx` requires explicit `courseId` and
  `lessonId` and already refuses ambiguous global entry.
- `src/components/surfaces/lesson-editor-surface.tsx` and
  `src/components/authoring/lesson-editor-header-actions.tsx` already define the
  current teacher shell, metrics row, preview CTA, save/publish feedback, and
  editor settings modal.
- `src/lib/dal/lesson-authoring.ts` already centralizes teacher-owned lesson
  reads and publish readiness through `getLessonEditorDTO()` and
  `getLessonPublishReadinessDTO()`.

Planning implication: Phase 22 should add orchestration/preparation summary to
the existing editor DTO path and header/surface wiring instead of inventing a
parallel orchestration route.

### 2. `/teacher/launch` already has the right shell and published-snapshot boundary

- `src/app/(teacher)/teacher/launch/page.tsx` only reads
  `getClassroomConsoleDTO()` and hands it to `ClassroomLaunchSurface`.
- `src/components/surfaces/classroom-launch-surface.tsx` already separates the
  page into a primary new-launch area and a secondary live-session recovery
  area. This matches the locked decision that live recovery stays secondary.
- `src/components/classroom/classroom-launch-panel.tsx` already implements the
  teacher action path: select published lesson -> select class -> call
  `launchClassroomSessionAction()` -> push `/classroom?sessionId=...`.
- `src/lib/dal/classroom.ts` builds launch preview strictly from
  `publishedLessonVersions.snapshotJson` via `buildLaunchPreview()`.

Planning implication: the orchestration workspace should be an enriched version
of the existing launch surface, not a new admin-style screen.

### 3. Readiness is currently split across publish readiness and launch emptiness

- `getLessonPublishReadinessDTO()` already outputs structured `blockingIssues`
  for lesson title, objective, invalid payload, no active steps, and unavailable
  built-in plugin sources.
- `ClassroomLaunchPanel` currently blocks actual launch only when lesson/class
  selection is missing or the eventual action fails.
- `ClassroomConsoleDTO` today has only three launch-facing truths:
  live sessions, published lessons, and empty-state copy.

Planning implication: Phase 22 should not replace publish readiness. It should
derive a launch-preparation grading layer from existing publish state,
teaching-design metadata, roster presence, and published lesson availability.

### 4. The run sheet already has a strong starting point

- `ClassroomLaunchPreviewStepDTOSchema` already includes:
  `activityIntent`, `activityMode`, `estimatedMinutes`, `evidenceSummary`,
  `teachingDesignStatus`, `needsTeachingDesignRefinement`, and `materialCues`.
- `ClassroomLaunchPreview` already renders a card flow with duration, material
  cues, default-inference badges, and a published-snapshot-only notice.
- `TeacherLessonPreviewSurface` already shows the repo's preferred teacher-side
  wording for `默认推断` / `待完善` and avoids student-runtime semantics.

Planning implication: Phase 22 should promote `ClassroomLaunchPreview` from a
secondary preview into the main run-sheet stage, adding stronger launch context
and readiness framing instead of rewriting the component from scratch.

## Recommended implementation shape

### 1. Add a launch-preparation contract on both lesson-authoring and classroom DTOs

Recommended additions:

- `src/lib/dto/lesson-authoring.ts`
  - extend `LessonEditorDTOSchema.publishState` or add a sibling typed summary for
    launch preparation cues:
    - teaching-design completeness snapshot
    - evidence expectation coverage snapshot
    - material summary
    - launch-preparation readiness buckets
- `src/lib/dto/classroom.ts`
  - add orchestration-specific DTOs for:
    - roster summary
    - run-sheet hero/meta summary
    - launch readiness buckets (`blocking`, `attention`, `advisory`)
    - preparation emphasis summary that remains read-only

Important: do not introduce session-specific editable notes, per-launch draft
state, or alternate publish-state truth.

### 2. Derive launch readiness from existing facts, not UI heuristics

The launch workspace should combine:

- published lesson existence
- linked class existence / non-empty roster
- publish readiness contract
- teaching-design fallback/refinement markers already present in preview/launch DTOs
- material cue coverage already available in `buildLaunchPreview()`

Recommended grading:

- **blocking**
  - no published lessons
  - selected lesson has no launchable classes / empty roster
- **attention**
  - inferred teaching design exists
  - evidence expectations need refinement
  - run sheet lacks explicit material/evidence richness on some steps
- **advisory**
  - improvements that help orchestration quality but must not block launch

This preserves the locked decision of “少量硬阻断 + 明确提醒”.

### 3. Keep roster scope summary-only in Phase 22

The launch workspace should show:

- selected class name
- total student count
- optional simple anomaly counts if available from roster records

It must not add:

- exclude-student controls
- subgroup launch
- multi-class launch
- pre-launch roster editing

The current data model already supports class membership lookup at session launch;
Phase 22 only needs a summary read model above it.

### 4. Preserve the current editor-to-launch discipline

Recommended user flow:

1. teacher edits a lesson in `/teacher/editor?courseId=...&lessonId=...`
2. editor surface exposes launch-preparation summary and existing preview CTA
3. teacher goes to `/teacher/launch`
4. launch workspace reads published lesson snapshot only
5. launch action still creates a classroom session through the same Server Action

Do not route launch from draft lesson state or pass client-composed preview data
into `launchClassroomSessionAction()`.

### 5. Reuse existing verifier patterns instead of ad hoc checks

The repo already has phase-specific verifiers:

- `scripts/verify-phase17-editor.ts`
- `scripts/verify-phase19-shell-route-metadata.ts`
- `scripts/verify-phase21-contracts.ts`

Phase 22 should follow the same pattern:

- static checks for route discipline, DTO/surface contract strings, and
  published-snapshot-only wording
- targeted Vitest suites for editor readiness, launch panel/surface behavior,
  and route-boundary coverage

## Recommended plan split

### Plan 22-01 — editor-side orchestration and preparation summary

Own:

- lesson-authoring DTO additions
- lesson-authoring DAL aggregation for launch preparation summary
- editor/header/status surface wiring for preparation cues

### Plan 22-02 — launch workspace and run sheet

Own:

- classroom DTO additions
- classroom DAL launch-workspace aggregation
- `/teacher/launch` surface restructuring around a main run sheet,
  roster summary, and readiness panel

### Plan 22-03 — verification and route-boundary guard

Own:

- regression tests across editor + launch
- phase verifier script
- package command
- route-boundary assertions to ensure teacher-owned entry and
  published-snapshot-only launch remain locked

## Risks and landmines

1. **Accidentally creating a second launch-config system**
   If Phase 22 adds editable session-specific notes, runtime emphasis drafts, or
   per-launch overrides, it violates the locked scope.

2. **Letting launch preview read draft lesson state**
   This would break the Phase 21 published-snapshot boundary and make launch
   behavior diverge from what students actually receive.

3. **Treating all preparation gaps as blockers**
   That would turn the workspace into an over-strict checklist instead of a
   teacher-facing preparation aid.

4. **Overloading the surface with multiple competing heroes**
   The launch page already has one primary task. Phase 22 should strengthen that
   main stage, not add a second or third competing hero.

5. **Solving roster summary with direct DB logic in components**
   All launch/readiness aggregation must stay in DAL + DTO boundaries.

## Testing guidance

- `src/lib/dal/lesson-authoring.test.ts`
  - launch-preparation summary calculation
  - readiness bucket derivation from existing publish state
- `src/lib/dal/classroom.test.ts`
  - launch workspace DTO assembly
  - published-snapshot-only run sheet behavior
  - class roster summary / empty-roster blocking
- `src/components/authoring/authoring-status-panel.test.tsx`
  - editor-side orchestration/readiness cue rendering
- `src/components/authoring/lesson-editor-header-actions.test.tsx`
  - launch/preparation CTA messaging remains inside existing header discipline
- `src/components/classroom/classroom-launch-panel.test.tsx`
  - readiness display and launch action remain grounded in published version id
- new launch surface test if needed
  - main-stage run sheet and secondary recovery area hierarchy
- `pnpm verify:phase22`
  - static checks + focused regression suite

## Research conclusion

Phase 22 is best planned as an extension of existing authoring and launch
contracts, not as a new subsystem. The planner should anchor on the current
teacher-owned editor path, current published-snapshot launch path, and current
Stitch-aligned launch shell, then layer explicit orchestration summary,
roster-aware readiness grading, and a verifier on top.
