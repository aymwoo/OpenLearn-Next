# Phase 73-01 Summary: Multi-Type Quiz Schema Extension

## Overview
Extended the v4.0 quiz plugin from single-choice only to 5 question types:
- `single_choice` — A/B/C/D single correct answer
- `multi_choice` — Multiple correct options (stored as comma-separated "A,B")
- `true_false` — Boolean correct/incorrect
- `fill_blank` — Free text answer
- `ordering` — Ranked sequence (stored as rank string "A,B,C")

## Commits (6 total)

### Task 1: Schema Extension
**Commit:** `5eebe11` — `feat(73-01): add questionType column to quiz plugin schema`

- Extended `plugins/quiz-sample/data-model.ts` with `questionType` enum column
  - 5 values: `single_choice`, `multi_choice`, `true_false`, `fill_blank`, `ordering`
- Regenerated Drizzle schema (`src/db/schema/generated/plugin-owned/quiz.ts`)
- Regenerated allowlist (`src/db/schema/generated/plugin-owned/data-access-allowlist.ts`)
- Created migration `drizzle/0016_phase73_question_type.sql`

### Task 2: DTO Extension
**Commit:** `2be5eef` — `feat(73-01): add QuestionTypeSchema and 5-type quiz stats DTO union`

- Added `QuestionTypeSchema` to `src/lib/dto/plugin-data-model.ts`
- Extended `ClassroomSessionRecapQuizQuestionStatDTOSchema` in `src/lib/dto/classroom.ts`
  to 5-type discriminated union with type-specific stats structures:
  - `single_choice`: A/B/C/D option slots with `isCorrect`
  - `multi_choice`: Combo slots (e.g., "A,B")
  - `true_false`: trueCount/falseCount with `correctAnswer`
  - `fill_blank`/`ordering`: `topAnswers[]` text aggregation

### Task 3: DAL Test Cases
**Commit:** `af83a18` — `test(73-01): add 25 DAL test cases for quiz plugin 5-type questionType`

- Created `src/features/platform-core/plugin-data-access/quiz-data-access.test.ts`
- 25 test cases covering 5 verbs × 5 question types:
  - **insert**: single_choice, multi_choice, true_false, fill_blank, ordering
  - **upsert**: same 5 types
  - **getByIndex**: same 5 types
  - **count**: same 5 types
  - **aggregate**: same 5 types (group by questionType)

### Task 4: Action + DAL Extension
**Commit:** `3b82d9a` — `feat(73-01): extend submitQuizSampleAnswer for 5-type payload + append-only`

- Extended `quizSampleSubmitSchema` to 5-type discriminated union
- Changed `plugin_owned_quiz_responses.selectedOption` from enum to text (supports
  comma-separated combos for multi_choice, text for fill_blank, rank string for ordering)
- Implemented append-only + `isLatest` flip in `submitQuizSampleAnswer`:
  - Clear previous `isLatest = false` in transaction
  - Insert new row with `isLatest = true` and auto-incremented `attemptNo`
- Added `questionType` field to return value
- TODO: `quiz.answer.received` hook dispatch (deferred to 73-02)

### Task 5: Aggregation + UI Extension
**Commit:** `3955427` — `feat(73-01): extend buildQuizSampleRecapStats for 5-type aggregation`

- Extended `buildQuizSampleRecapStats` in `classroom.ts`:
  - Query `questionType` from `pluginOwnedQuizQuestions`
  - Build type-specific stats aggregation based on `questionType`
  - single_choice: countByOption with correctRate
  - multi_choice: countByOptionSet (unique combos)
  - true_false: countByBool with correct answer
  - fill_blank/ordering: topAnswers text aggregation
- Extended `ClassroomSessionRecapSurface` component:
  - Type-narrowed rendering for each question type
  - Single choice: A/B/C/D bar chart with correct indicator
  - Multi choice: ranked combo bars
  - True/false: T/F comparison bars
  - Fill blank/ordering: top N text answers list

### Test Fix
**Commit:** `a195980` — `test(73-01): fix quiz-data-access.test.ts mock call argument type assertions`

- Fixed TypeScript errors when accessing mock call arguments
- Used proper casting pattern `(mock.calls[0] as unknown[])[0]`

## Files Modified/Created

| File | Change |
|------|--------|
| `plugins/quiz-sample/data-model.ts` | Added `questionType` enum column |
| `drizzle/0016_phase73_question_type.sql` | Migration for questionType column |
| `src/db/schema/generated/plugin-owned/quiz.ts` | Regenerated |
| `src/db/schema/generated/plugin-owned/data-access-allowlist.ts` | Regenerated |
| `src/lib/dto/plugin-data-model.ts` | Added `QuestionTypeSchema` |
| `src/lib/dto/classroom.ts` | Extended DTO schemas + DAL logic |
| `src/actions/classroom-actions.ts` | Extended `quizSampleSubmitSchema` |
| `src/lib/dal/classroom.ts` | Extended `submitQuizSampleAnswer` + `buildQuizSampleRecapStats` |
| `src/components/classroom/classroom-session-recap-surface.tsx` | Extended 5-type UI rendering |
| `src/features/platform-core/plugin-data-access/quiz-data-access.test.ts` | 25 test cases |

## Acceptance Criteria Status

| Criterion | Status |
|-----------|--------|
| `questionType` column in schema | ✅ |
| 5-type discriminated union DTOs | ✅ |
| `QuestionTypeSchema` exported | ✅ |
| `allowlist` includes questionType index | ✅ |
| 25 DAL test cases (5 verbs × 5 types) | ✅ |
| `submitQuizSampleAnswer` handles 5 types | ✅ |
| Append-only + `isLatest` flip | ✅ |
| `buildQuizSampleRecapStats` 5-type aggregation | ✅ |
| `ClassroomSessionRecapSurface` 5-type rendering | ✅ |
| All tasks committed separately | ✅ |

## Known Issues / Deferred

1. **`quiz.answer.received` platform command hook** — Deferred to Phase 73-02 (Task 4
   adds TODO comment in `submitQuizSampleAnswer`)
2. **Pre-existing TypeScript errors** in unrelated files:
   - `plugin-lifecycle-operator-surface.tsx` — Missing `PreflightUninstallPluginResult` properties
   - `ai-contracts/registry.ts` — Missing `plugin.upgrade.preflight` command type
3. **Test file errors** in `classroom-session-recap-surface.test.tsx` — Mock data uses old
   `slot` property for multi_choice stats (needs update to use `combo`)
4. **Verification script** `verify-phase69-quiz-sample.ts` — Uses old `submitQuizSampleAnswer`
   input format without `questionType`

## Phase 73 Remaining Work

- **73-02**: Live WebSocket events for teacher dashboard + `quiz.answer.received` hook
- **73-03**: Student-facing UI updates for 5-type quiz submission
- **73-04**: Analytics/aggregation for non-single-choice question types