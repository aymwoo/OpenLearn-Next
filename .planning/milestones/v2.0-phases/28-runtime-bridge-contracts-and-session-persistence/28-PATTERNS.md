# Phase 28 Patterns

## File analog map

| Target area | Closest analog | Pattern to reuse |
|---|---|---|
| Runtime contracts | `src/features/runtime-platform/contracts/*.ts` | Zod schema + inferred type dual export |
| Runtime payload on lesson steps | `src/lib/dto/lesson-authoring.ts` | optional typed block on existing discriminated union payload |
| Published freeze path | `src/lib/dal/lesson-authoring.ts` | `publishLesson()` snapshots current DTO state into `publishedLessonVersions.snapshotJson` |
| Append-only latest persistence | `src/db/schema.ts` task/quiz tables | append-only rows + `isLatest` uniqueness |
| Classroom truth bridge | `src/lib/dal/classroom.ts` | teacher/student scoped durable write functions |
| Cache invalidation | `src/actions/classroom-actions.ts` | server action updates `cacheTags.classroom(...)` plus downstream tags |
| Student resume integration | `src/lib/dal/learning.ts` | shell/personal split with classroom-aware personal DTO |
| Host entry safety | `src/features/runtime-platform/host-actions/guards.ts` | resolve trusted actor on server, then validate input |

## Concrete excerpts to mirror

### 1. Dual-export contract pattern

```ts
export const RuntimeEventEnvelopeSchema = z.object({...});
export type RuntimeEventEnvelope = z.infer<typeof RuntimeEventEnvelopeSchema>;
```

### 2. Payload extension pattern

```ts
export const taskStepPayloadSchema = z.object({
  type: z.literal("task"),
  ...,
  teachingDesign: TeachingDesignInputSchema.optional(),
  builtInSource: builtInSourceSchema.optional(),
});
```

Phase 28 should add `runtime: RuntimeDescriptorSchema.optional()` in the same
style.

### 3. Snapshot freeze pattern

```ts
const snapshotJson = {
  lesson: editor.lesson,
  course: editor.course,
  steps: editor.steps.filter((step) => !step.archivedAt),
  materials: editor.materials,
  publishedAt: new Date().toISOString(),
};
```

Runtime descriptor must flow through this same snapshot.

### 4. Append-only latest pattern

```ts
await tx.update(taskSubmissions).set({ isLatest: false }).where(...);
await tx.insert(taskSubmissions).values({ ..., attemptNo, isLatest: true });
```

Use the same latest-history posture for runtime session/state recovery.

### 5. Cache-safe mutation pattern

```ts
const result = await recordStudentQuickResponse(parsed.data);
updateTag(cacheTags.classroom(parsed.data.sessionId));
updateTag(cacheTags.progress(parsed.data.lessonId, result.studentId));
updateTag(cacheTags.submission(parsed.data.lessonId, result.studentId));
```

Runtime submit should follow the same explicit invalidation discipline.

### 6. Server-owned personal runtime pattern

```ts
return StudentPlayerPersonalDTOSchema.parse({
  progress: {...},
  stepActivities,
  runtime: {
    forcedStepId,
    classroomSessionId,
    classroomVersion,
    ...
  },
});
```

Runtime session recovery should be injected into the personal DTO path, not the
cached shell.
