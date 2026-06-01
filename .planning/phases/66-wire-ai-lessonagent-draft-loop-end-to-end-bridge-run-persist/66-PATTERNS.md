# Phase 66: Wire AI LessonAgent Draft Loop End-to-End - Pattern Map

**Mapped:** 2026-06-01
**Files analyzed:** 8 (7 modify + 1 create)
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/server/ai/agents/lesson-agent.ts` (MODIFY) | agent orchestration | request-response (sequential dispatch) | `src/features/platform-core/commands/producers/plugin-governance.ts` | role-match |
| `src/features/platform-core/commands/producers/lesson-draft.ts` (CREATE) | producer (envelope builder) | request-response | `src/features/platform-core/commands/producers/plugin-governance.ts` | exact |
| `src/features/platform-core/commands/handlers/lesson-draft.ts` (MODIFY) | command-handler | event-driven (success+emit) | self (in-file `run` handler) | exact (same file) |
| `src/actions/lesson-authoring-actions.ts` (MODIFY) | server-action | request-response (dispatch + invalidate) | `publishLessonAction` (same file, line 406) | exact (same file) |
| `src/lib/dal/lesson-authoring.ts` (MODIFY) | DAL | CRUD (result DTO shaping) | self (`applyDraftToLiveLesson` line 1620) | exact (same file) |
| `src/lib/dto/lesson-authoring.ts` (MODIFY) | dto schema | transform | self (sibling result schemas) | exact (same file) |
| `src/components/authoring/lesson-authoring-workspace.tsx` (MODIFY) | component (client) | event-driven (UI trigger) | self (`libraryFilters` pills + header action row) | exact (same file) |
| `src/lib/dal/ai-rag.ts` (consume only) | DAL (read) | CRUD | `getAgentRegistryDTO` (line 33) | reference |

## Pattern Assignments

### `src/features/platform-core/commands/producers/lesson-draft.ts` (CREATE — producer)

**Analog:** `src/features/platform-core/commands/producers/plugin-governance.ts`

**Why:** D-01 keeps the handler pure (no nested dispatch). The agent (`lesson-agent.ts`) must dispatch `lesson.draft.run` then `lesson.draft.persist` sequentially. Mirror the existing typed-envelope-builder producer so the agent builds command inputs the same way governance does.

**Envelope shape to mirror** (`BaseProducerInput`):
```typescript
// type/actor/scope/payload + optional dedupe/correlation/audit/source
type BaseProducerInput<TType extends string, TPayload> = {
  type: TType;
  actor: PlatformActor;
  scope: { schoolId: string; pluginId: string };
  payload: TPayload;
  dedupeKey?: string;
  correlation?: { correlationId: string; causationId: string; producer: string };
  audit?: PlatformAuditContext;
  source?: string;
};
```

**Pattern to copy:** one exported builder per command (`buildLessonDraftRunCommand`, `buildLessonDraftPersistCommand`) returning the validated command input. Each builder sets `scope.pluginId = LESSON_AGENT_PLUGIN_ID` and leaves `teacherId` out of the payload (injected later at authorize). Producer dispatch returns `PlatformCommandDispatchResult`.

**Critical invariant (from RESEARCH + lesson-agent.ts):** `teacherId` MUST NEVER appear in the payload. Payload schemas are `.strict()` (contracts.ts:135-170): `run = { lessonId, stepType, intent }`, `persist = { lessonId, steps[] }`.

---

### `src/server/ai/agents/lesson-agent.ts` (MODIFY — agent orchestration)

**Analog:** existing `draftLessonStep` in same file (currently dispatches only `lesson.draft.run`).

**Current state:** `draftLessonStep` (~line 178) dispatches `lesson.draft.run` only, using:
- sentinel `LESSON_AGENT_PLUGIN_ID = "core.lesson-agent"`
- system actor
- `mapPersistedCommand`
- `defaultInProcessPlatformEventAdapter`

**Change (D-01):** after `lesson.draft.run` resolves, sequentially dispatch `lesson.draft.persist` using the run result's draft `steps`. Both dispatches go through `dispatchPlatformCommand` — never call the handler or DAL directly.

**Dispatch signature (bus.ts:241):**
```typescript
dispatchPlatformCommand(
  commandInput: unknown,
  dependencies: PlatformCommandBusDependencies,
): Promise<PlatformCommandDispatchResult>
```

**Result shape to consume** (`PlatformCommandDispatchResultSchema`):
```typescript
{ commandId, attemptNumber, status, resultSummary, invalidation: { tags } }
```
Read `result.resultSummary` from the `run` dispatch to obtain the generated steps, then feed them into the `persist` command input built by the new producer. Await each dispatch; do not parallelize (persist depends on run output).

---

### `src/features/platform-core/commands/handlers/lesson-draft.ts` (MODIFY — command-handler)

**Analog:** the `run` handler in the same file (the canonical `successResult` + `withAudit` emit pattern).

**Success + emit pattern to follow** (run handler):
```typescript
return successResult({
  resultSummary,
  invalidation,
  emittedEvents: [
    withAudit(
      { eventType, category, aggregateType, aggregateId, payload },
      command.audit,
    ),
  ],
});
```
- teacherId resolved via `assertActiveTeacher()` (never from payload)
- `DraftGuardrailRejection` → emit `lesson.draft.rejected` as a **success** event (not a throw)
- real failure → `throwDraftFailure`
- handler map keys at ~335-351: `lesson.draft.run` / `persist` / `accept` / `discard`

**Change 1 — version bug (D-05).** accept handler emits `lesson.draft.accepted` (~283) and discard emits `lesson.draft.discarded` (~321). Both currently hardcode `version: 0` with a TODO (~289 / ~327). Replace with `result.version` now that the DAL result DTOs carry `version` (see DTO + DAL sections).

**Change 2 — courseId regression (hidden dependency from RESEARCH).** The accept handler currently drops `courseId` from `resultSummary` at ~270-273. After D-04 rewires the action to dispatch, the action's cache invalidation needs `courseId` back. Add `courseId` (now available on `ApplyDraftResultDTO`) into the accept `resultSummary`.

---

### `src/actions/lesson-authoring-actions.ts` (MODIFY — server-action)

**Analog:** `publishLessonAction` (line 406, same file) — the canonical "assertActiveTeacher → call → invalidate → ActionResult" shape.

**Pattern to copy** (publishLessonAction):
```typescript
// 1. assertActiveTeacher()
// 2. perform the operation
// 3. invalidateLessonAuthoringTags(actorId, courseId, lessonId)   // line 140
// 4. return ActionResult success
// errors → handleActionError(...)  // line 147, maps CONFLICT
```

**Change (D-04):** `applyDraftLessonVersionAction` (435) and `discardDraftLessonVersionAction` (456) currently call the DAL directly (441 / 456). Rewire both to `dispatchPlatformCommand` instead.

**After dispatch, read invalidation inputs from the result:**
- `invalidateLessonAuthoringTags(actorId, courseId, lessonId)` (helper at line 140) **requires `courseId`**. Source `courseId` from `result.resultSummary` — this is exactly why the handler change above must re-add `courseId` to the accept `resultSummary`.
- keep `handleActionError` (147) for `CONFLICT` mapping from dispatch failures.

**Command payload schemas to build** (contracts.ts:135-170, all `.strict()`):
```typescript
accept  = { lessonId, draftVersionId, editedSteps?: [{ index, title, description, content }] }
discard = { lessonId, draftVersionId }
// teacherId / source / schoolId injected at authorize — never in payload
```

---

### `src/lib/dal/lesson-authoring.ts` (MODIFY — DAL result shaping)

**Analog:** `applyDraftToLiveLesson` (line 1620) — already loads the `draft` row (line 1629) whose `draft.version` column is in scope.

**Current returns:**
```typescript
// applyDraftToLiveLesson (1721)
return ApplyDraftResultDTOSchema.parse({ lessonId, courseId, draftVersionId, appliedStepCount });

// discardDraftLessonVersion (1764)
return DiscardDraftResultDTOSchema.parse({ lessonId, draftVersionId, discardedAt });
```

**Change (D-05):** add `version: draft.version` to both `.parse({...})` payloads. `draft.version` is already available from the loaded draft row (1629) in `applyDraftToLiveLesson`; load/read the equivalent version in `discardDraftLessonVersion`. (For reference, `persistDraftLessonVersion` at 1781 computes `version = max + 1`, `source = "ai"`, inserting only into `draftLessonVersions`.)

---

### `src/lib/dto/lesson-authoring.ts` (MODIFY — dto schemas)

**Analog:** the two sibling result schemas themselves (lines 462-477).

**Current:**
```typescript
ApplyDraftResultDTOSchema   = { lessonId, courseId, draftVersionId, appliedStepCount }
DiscardDraftResultDTOSchema = { lessonId, draftVersionId, discardedAt }
```

**Change (D-05):** add `version: z.number()` (match the column type — integer) to **both** schemas. This is the type contract that unblocks `result.version` in the handler and is the source of truth the DAL `.parse()` calls validate against. Edit the DTO schema **before** the DAL so the parse does not reject the new field.

---

### `src/components/authoring/lesson-authoring-workspace.tsx` (MODIFY — client component)

**Analog:** in-file `libraryFilters` pill row (214-224) for the segmented control, and the header action row (295-303) for button placement.

**File facts:**
- `"use client"` (line 1); imports `Sparkles`, `Save`, etc. from `lucide-react` (line 4)
- server actions imported as a named block from `@/actions/lesson-authoring-actions` (lines 6-11) — add the new draft actions here
- uses `useState` / `useMemo` / `useEffect` (line 3)
- review mode returns early (95-101) — keep the AI trigger out of that branch
- `Button` from `@/components/ui/button` (line 12); primary variant = gradient `bg-linear-135 from-primary to-primary-container`

**Segmented control pattern to copy** (stepType 内容/任务/测验, from libraryFilters pills):
```tsx
<div className="mt-4 flex gap-2 overflow-x-auto pb-1">
  {options.map((opt) => (
    <button
      key={opt.id}
      type="button"
      onClick={() => setStepType(opt.id)}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
        stepType === opt.id
          ? "bg-primary/10 text-primary"
          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
      }`}
    >
      {opt.label}
    </button>
  ))}
</div>
```
Reuse `stepLabels` (41-44): `content="内容"`, `task="任务"`, `quiz="测验"`.

**Trigger button placement** (mirror 「保存」 in header action row 295-303):
```tsx
<Button type="button" aria-label="AI 起草" className="h-10 gap-2 px-4 text-sm" onClick={openDraftPanel}>
  <Sparkles className="size-4" aria-hidden />
  AI 起草
</Button>
```
Per UI-SPEC: add 「AI 起草」button + inline intent panel (stepType segmented + intent field + 「生成草稿」submit). No new route; inline state via `useState`.

---

## Shared Patterns

### Command dispatch (Command Bus only)
**Source:** `src/features/platform-core/commands/bus.ts:241`
**Apply to:** lesson-agent.ts, lesson-authoring-actions.ts (apply/discard)
```typescript
const result = await dispatchPlatformCommand(commandInput, dependencies);
// result: { commandId, attemptNumber, status, resultSummary, invalidation: { tags } }
```
Never bypass the bus to call a handler or DAL method directly for a draft mutation.

### Teacher resolution & payload hygiene
**Source:** handlers/lesson-draft.ts (`assertActiveTeacher()`), contracts.ts:135-170 (`.strict()` payloads)
**Apply to:** all draft command builders and handlers
- `teacherId` is resolved server-side via `assertActiveTeacher()`, never carried in the command payload.
- All payload schemas are `.strict()` — extra keys throw. Build exactly the declared shape.

### Cache invalidation after write
**Source:** `invalidateLessonAuthoringTags(actorId, courseId, lessonId)` (lesson-authoring-actions.ts:140); `publishLessonAction` (406)
**Apply to:** apply/discard actions
Requires `courseId` → must flow from handler `resultSummary` (drives the accept-handler `courseId` re-add).

### Feature-flag gating (read-only)
**Source:** `getAgentRegistryDTO()` (ai-rag.ts:33) → seeds from `agentRegistrySeed` (registry.ts)
**Apply to:** AI 起草 entry point
LessonAgent flag is `lesson_agent_enabled`, seeded `enabled: false` (registry.ts:5-14). Check the registry DTO's `featureFlag`/`enabled` before exposing/running the draft loop. `getAgentRegistryDTO` already calls `assertActiveTeacher()`.

## No Analog Found

None — every file has an in-codebase analog (most in the same file or the governance producer).

## Metadata

**Analog search scope:**
`src/features/platform-core/commands/{bus,contracts}.ts`, `.../commands/producers/`, `.../commands/handlers/lesson-draft.ts`, `src/actions/lesson-authoring-actions.ts`, `src/lib/dal/{lesson-authoring,ai-rag}.ts`, `src/lib/dto/lesson-authoring.ts`, `src/server/ai/agents/{lesson-agent,registry}.ts`, `src/components/authoring/lesson-authoring-workspace.tsx`, `src/components/ui/button.tsx`
**Files scanned:** 12
**Pattern extraction date:** 2026-06-01
