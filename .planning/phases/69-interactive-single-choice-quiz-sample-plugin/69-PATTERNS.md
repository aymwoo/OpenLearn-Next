# Phase 69: Interactive Single-Choice Quiz Sample Plugin - Pattern Map

**Mapped:** 2026-06-03
**Files analyzed:** 15
**Analogs found:** 15 / 15

Phase 69 is an **integration phase over existing host seams**, not a greenfield plugin platform. The strongest analogs already exist in voting authoring, classroom launch/runtime control, built-in teaching-step registration, and Phase 68 governed plugin-owned writes.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `plugins/quiz-sample/data-model.ts` (MODIFY) | declarative schema source | compile-time | self + Phase 67 schema pattern | exact |
| `src/lib/dto/lesson-authoring.ts` (MODIFY) | contract / DTO | request-response | current `ClassroomVotingFrozenContract*` contracts | exact |
| `src/lib/dto/resource-ai.ts` (MODIFY) | built-in definition / template metadata | request-response | `classroomVoting` definition | exact |
| `src/lib/dal/lesson-authoring.ts` (MODIFY) | authoring persistence / hydration | CRUD | `saveVotingLessonStepConfig` + publish readiness | exact |
| `src/actions/lesson-authoring-actions.ts` (MODIFY) | server action boundary | request-response | `saveVotingLessonStepAction` | exact |
| `src/components/authoring/lesson-step-editor.tsx` (MODIFY) | teacher config UI | interactive UI | `classroomVoting` editor branch | exact |
| `src/lib/dal/classroom.ts` (MODIFY) | launch freeze + classroom DTO + control state | event-driven + CRUD | `launchClassroomSession` + `recordClassroomVotingRoundControl` | exact |
| `src/actions/classroom-actions.ts` (MODIFY) | classroom submit/control action boundary | request-response | existing classroom actions | exact |
| `src/components/classroom/classroom-control-panel.tsx` (MODIFY) | teacher open/close UI | interactive UI | existing voting round controls | exact |
| `src/components/learning/quiz-sample-step-card.tsx` (NEW or equivalent) | student answer card | interactive UI | `quiz-step-card.tsx` (shape) + UI-SPEC contract | role-match |
| `src/components/learning/classroom-runtime-client.tsx` (MODIFY) | choose quiz sample renderer | render routing | current `QuizStepCard` branching | exact |
| `src/features/runtime-platform/classroom/runtime-session.ts` (MODIFY iff runtime-host path reused) | runtime submit bridge | event-driven | current voting/runtime submit flow | role-match |
| `src/lib/dal/plugins.ts` or bootstrap path (MODIFY) | built-in plugin registration/template compatibility | request-response | current built-in teaching step resolution | exact |
| `scripts/verify-phase69-quiz-sample.ts` (NEW) | close gate | batch verification | `scripts/verify-phase68-data-access-verbs.ts` | exact |
| `package.json` (MODIFY) | verify command wiring | config | `verify:phase68` wiring | exact |

---

## Pattern Assignments

### `plugins/quiz-sample/data-model.ts` (MODIFY) — extend question snapshot in-place

**Analog:** self + Phase 67 declarative plugin-owned table pattern.

**Existing shape:**
```ts
{
  name: "plugin_owned_quiz_questions",
  columns: [
    { name: "schoolId", type: "text", notNull: true },
    { name: "classroomSession", type: "text", notNull: true },
    { name: "question", type: "text", notNull: true },
    { name: "prompt", type: "text", notNull: true },
    { name: "correctOption", type: "enum", enumValues: ["A", "B", "C", "D"] },
  ],
}
```

**Apply:** add fixed-slot option text columns on the same table, then let `plugin:compile` regenerate drizzle schema + allowlist + migration. Do **not** split to a second table.

---

### `src/lib/dal/lesson-authoring.ts` (MODIFY) — quiz sample config save uses voting transaction shape

**Analog:** `saveVotingLessonStepConfig`.

**Pattern:**
```ts
await db.transaction(async (tx) => {
  await tx.update(lessonSteps)...payloadJson: nextPayload...
  await upsertPluginStepExtensionWithTx({ tx, schoolId, pluginId, lessonStepId, payloadJson: extensionPayload })
  await tx.update(lessons).set({ revision: lesson.revision + 1, updatedAt: savedAt })
})
```

**Apply:** preserve the same optimistic concurrency, revision bump, and plugin step extension persistence, but replace voting-specific config schema and shell payload generation with quiz sample equivalents.

---

### `src/components/authoring/lesson-step-editor.tsx` (MODIFY) — plugin-specific editor inside existing shell

**Analog:** current `classroomVoting` editor branch.

**Pattern signals to copy:**
- local form state seeded from persisted config
- inline validation object per step
- dedicated save action path
- preview pane next to editor fields

**Apply:** keep the shell and save orchestration, but move quiz sample UI out of the voting-specific labels/validation/messages. This should become a clearly separate plugin-specific configuration card.

---

### `src/lib/dto/resource-ai.ts` (MODIFY) — built-in teaching-step definition for plugin discoverability

**Analog:** `BUILT_IN_TEACHING_STEP_DEFINITIONS` entry for `classroomVoting`.

**Pattern:**
```ts
{
  builtInKey: "classroomVoting",
  pluginKey: "builtin-teaching-step-classroom-voting",
  pluginName: "课堂投票",
  stepType: "quiz",
  initialPayload: { ... },
  authoringContract: { ... }
}
```

**Apply:** define a real built-in teaching-step metadata path for quiz sample if the phase chooses to expose it through the same host route. Do not leave quiz sample as only a data-model file with no host discoverability.

---

### `src/lib/dal/classroom.ts` (MODIFY) — launch-time freeze belongs in `launchClassroomSession`

**Analog:** current launch flow already parses published snapshot steps and validates plugin runtime readiness before creating the session.

**Pattern:**
```ts
const snapshot = parseSnapshot(published.snapshotJson)
const steps = parseSnapshotSteps(snapshot, lesson.id)
// validate plugin readiness per step
await db.transaction(async (tx) => {
  const [session] = await tx.insert(classroomSessions)...
  await tx.insert(classroomParticipants)...
  await tx.insert(classroomEvents)...
})
```

**Apply:** insert question-freeze writes here, not in UI or later lazy runtime hooks. Session creation is the correct authoritative seam.

---

### `src/components/classroom/classroom-control-panel.tsx` (MODIFY) — open/close semantics reuse voting control pattern

**Analog:** `sendRuntimeCommand("start-voting-round" | "end-voting-round")` + fallback `recordRuntimeTeacherControlAction`.

**Apply:** use the same control transport/fallback path, but expose quiz sample wording and state. Avoid inventing a second classroom control protocol.

---

### `src/components/learning/quiz-sample-step-card.tsx` (NEW or equivalent) — visual language can differ, submit semantics cannot

**Analog:** `quiz-step-card.tsx` for selection/submit/history skeleton.

**What to keep:**
- local selected answer state
- submit button explicit, not auto-submit on click
- refresh / status feedback after success

**What to change:**
- no core `submitQuizAttemptAction`
- no teacher-feedback/history assumptions from core quiz flow
- honor plugin-owned latest answer + open/closed round state
- visual language per `69-UI-SPEC.md`

---

### `src/features/runtime-platform/classroom/runtime-session.ts` (MODIFY if reused) — runtime host bridge is optional, governed submit boundary is not

**Analog:** current runtime submit path writes `classroomEvidence` plus `recordRuntimeQuizAttempt` or `recordRuntimeTaskSubmission` based on bridge targets.

**Apply:** if quiz sample stays outside runtime host, a dedicated classroom action may be simpler. If it does reuse runtime host, the bridge target must point to governed plugin-owned writes rather than core quiz tables.

---

### `src/lib/dal/plugins.ts` / built-in registration path (MODIFY) — treat quiz sample as a real built-in-compatible plugin

**Analog:** `listBuiltInTeachingStepTemplates` / `getBuiltInTeachingStepTemplateForSchool` / built-in plugin compatibility checks.

**Apply:** use the same manifest/governance/template path so quiz sample remains lifecycle-visible and governance-auditable. Do not hardcode a hidden non-registered plugin just because it is “sample”.

---

## Shared Patterns

### Shared Pattern 1: plugin step extension as teacher-side plugin config truth
**Source:** `upsertPluginStepExtensionWithTx` in `src/lib/dal/plugin-data.ts`

Use this for teacher-side plugin config. It already enforces `(schoolId, pluginId, lessonStepId)` scoping and keeps plugin config off the core lesson schema.

### Shared Pattern 2: governance-visible plugin-owned writes through the public facade
**Source:** `dispatchPluginDataAccess` + `pluginDataUpsertHandler`

Any quiz sample answer persistence must go through this exact path so Phase 68 guarantees remain intact.

### Shared Pattern 3: lifecycle compatibility checks before launch
**Source:** `isVotingPluginRuntimeReady` in `src/lib/dal/classroom.ts`

Launch should fail early if the plugin is disabled, kill-switched, or governance-contract incompatible.

### Shared Pattern 4: session-scoped read models, not live joins back to authoring truth
**Source:** published snapshot + classroom session + voting round artifacts

Once class starts, runtime DTOs should derive from session-scoped truth, not mutable authoring config.

---

## File-by-File Notes

| File | Must Preserve | Must Change |
|------|---------------|-------------|
| `lesson-step-editor.tsx` | existing shell, save/reset orchestration | voting-only branching, labels, validation, save action wiring |
| `lesson-authoring.ts` | transaction shape, revision bump, plugin extension path | voting-specific contracts/shell payload generation |
| `classroom.ts` | launch auth, participant/session creation, teacher control artifacts | add launch freeze + quiz sample classroom DTO state |
| `classroom-runtime-client.tsx` | shell and route-level branching | swap in quiz sample renderer for quiz sample steps |
| `quiz-step-card.tsx` analog | explicit submit UX | persistence target and answer-state semantics |
| `plugins.ts` / built-in host | governance/lifecycle visibility | include quiz sample in reachable built-in-compatible path |

---

## Anti-Patterns

- Adding a special direct DB write in a component or server action that bypasses `dispatchPluginDataAccess`.
- Freezing question rows at publish time rather than launch time.
- Reading option text from lesson step payload after launch instead of from question snapshot rows.
- Reusing `quiz-step-card.tsx` unchanged and pretending it is plugin-owned just because the UI looks similar.
- Leaving quiz sample without a built-in/plugin registration story, which would make governance checks impossible to assert.
