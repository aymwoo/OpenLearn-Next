# Phase 70: Question Stats & Post-Class Recap - Pattern Map

**Mapped:** 2026-06-03
**Files analyzed:** 8
**Analogs found:** 8 / 8

Phase 70 is a read-model and recap-surface phase over existing classroom recap seams. The strongest analogs already exist in `computeClassroomSessionRecap`, `ClassroomSessionRecapDTOSchema`, `ClassroomSessionRecapSurface`, and cache-tag invalidation at classroom action boundaries.

## File Classification

| New/Modified File | Role | Closest Analog | Match Quality |
|-------------------|------|----------------|---------------|
| `src/lib/cache-policy.ts` (MODIFY) | cache tag single source | existing `teacherReview` / `classroom` tags | exact |
| `src/lib/dto/classroom.ts` (MODIFY) | recap DTO contract | current `ClassroomSessionRecapDTOSchema` | exact |
| `src/lib/dal/classroom.ts` (MODIFY) | single DAL aggregate + recap integration | current `computeClassroomSessionRecap` | exact |
| `src/actions/classroom-actions.ts` (MODIFY) | cache invalidation after submit | current `submitQuizSampleAnswerAction` | exact |
| `src/components/classroom/classroom-session-recap-surface.tsx` (MODIFY) | teacher recap UI | current recap surface sections | exact |
| `src/components/classroom/classroom-session-recap-surface.test.tsx` (MODIFY) | recap UI assertions | existing recap component tests | exact |
| `src/lib/dal/classroom.test.ts` (MODIFY) | DAL/DTO behavior verification | existing phase 25 recap contract tests + phase 69 classroom tests | exact |
| `scripts/verify-phase70-quiz-stats.ts` (NEW) | close gate | `scripts/verify-phase69-quiz-sample.ts` | exact |

## Pattern Assignments

### `src/lib/dal/classroom.ts` — extend the recap seam, not the plugin facade

**Analog:** current `computeClassroomSessionRecap` reads core latest submissions and builds one recap artifact/DTO.

**Apply:** add a private helper that computes quiz sample per-question stats from plugin-owned tables and injects the result into recap DTO construction. Keep the public read seam on `getClassroomSessionRecapDTO`.

### `src/lib/dto/classroom.ts` — add a dedicated recap section schema

**Analog:** current recap DTO uses nested typed sections (`summary`, `workload`, `studentSummaries`, `stepSummaries`).

**Apply:** introduce a typed `quizSampleStats` recap section with explicit question cards, option distribution rows, and denominator labels rather than loose maps or `Record<string, number>` bags.

### `src/components/classroom/classroom-session-recap-surface.tsx` — add another tonal section, not a new page

**Analog:** existing hero, workload, student recap, and step diagnostics sections are all self-contained tonal cards inside one surface.

**Apply:** add a "题目复盘" section with per-question cards inside the same surface rhythm. Reuse tonal cards, badges, and glass/gradient actions where helpful.

### `src/actions/classroom-actions.ts` + `src/lib/cache-policy.ts` — cache tags stay centralized

**Analog:** submit actions already refresh `classroom`, `progress`, `submission`, `teacherReview` tags.

**Apply:** add `quizStats(sessionId)` to `cacheTags` and invalidate it from `submitQuizSampleAnswerAction`.

## Anti-Patterns

- Reusing core `quizAttempts` recap logic for quiz sample plugin stats.
- Adding a new durable summary table or writing stats into existing `classroomSessionSummary`.
- Building a chart-heavy BI dashboard disconnected from the current recap UI rhythm.
- Letting cache tag names appear as ad-hoc string literals outside `cache-policy.ts`.
