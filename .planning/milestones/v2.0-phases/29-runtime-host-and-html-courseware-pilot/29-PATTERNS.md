# Phase 29 Patterns

## File analog map

| Target area | Closest analog | Pattern to reuse |
|---|---|---|
| Shared runtime surface shell | `src/components/learning/classroom-runtime-client.tsx` | one current-step renderer owns runtime region and delegates step-specific content |
| Teacher preview embedding | `src/components/surfaces/teacher-lesson-preview-surface.tsx` | preview route stays draft-only and renders per-step cards inside an existing surface shell |
| Student player route posture | `src/app/(student)/student/player/page.tsx` | cached shell plus Suspense personal loader, not one combined DTO read |
| Classroom-compatible host surface | `src/components/surfaces/classroom-console-surface.tsx` | live stage remains on `/classroom`, not a second teacher runtime route |
| Built-in runtime authoring entry | `src/lib/dal/plugins.ts` + `src/components/authoring/lesson-authoring-workspace.tsx` | built-in templates come from allowlisted plugin/template chain and inject a normal step payload |
| Runtime descriptor freeze | `src/lib/dal/lesson-authoring.ts` | `publishLesson()` freezes full `payload.runtime` into `publishedLessonVersions.snapshotJson` |
| Runtime submit bridge | `src/features/runtime-platform/classroom/runtime-session.ts` | save remains recoverable-only; submit bridges to current durable truth |
| Runtime recovery read model | `src/lib/dto/learning.ts` + `src/lib/dal/learning.ts` | personal runtime DTO carries latest recovery summary, not full state in shell |

## Concrete excerpts to mirror

### 1. Student player shell and personal split

```tsx
<Suspense fallback={<PlayerPersonalFallback shell={shell} />}>
  <PlayerPersonalLoader
    lessonId={shell.lessonId}
    selectedStepId={params?.stepId ?? null}
    shell={shell}
    scope={scope}
  />
</Suspense>
```

Phase 29 must keep runtime host consumption inside the personal/runtime region.

### 2. Current step renderer owns the runtime area

```tsx
function CurrentStepRenderer({ player, step }: { player: StudentPlayerDTO; step: LearningStepDTO }) {
  if (step.type === 'task') {
    return <TaskStepCard ... />
  }
}
```

Phase 29 should extend this pattern with a runtime-capable branch instead of
creating a second top-level player layout.

### 3. Preview route guard pattern

```tsx
if (!courseId || !lessonId) {
  return <PreviewGuidance ... />
}
```

Runtime preview must keep this strict route ownership and remain draft-only.

### 4. Built-in teaching-step injection pattern

```tsx
const builtInTemplates = lesson
  ? await listBuiltInTeachingStepTemplates({ actorId: scope.userId, schoolId: lesson.course.schoolId })
  : [];
```

Phase 29 should add the HTML runtime step through the same template list.

### 5. Built-in template payload pattern

```ts
export const BuiltInTeachingStepTemplatePayloadSchema = z.object({
  builtInKey: BuiltInTeachingStepKeySchema,
  pluginName: z.string(),
  title: z.string(),
  summary: z.string(),
  stepType: z.enum(["content", "task", "quiz"]),
  initialTitle: z.string(),
  initialPayload: lessonStepPayloadSchema,
});
```

The HTML runtime pilot should produce one normal lesson payload carrying
`payload.runtime`, not a parallel runtime-step model.

### 6. Existing descriptor contract to honor

```ts
export const RuntimeDescriptorSchema = z.object({
  kind: RuntimeDescriptorKindSchema,
  entry: z.object({
    sandbox: z.enum(["iframe", "worker", "wasm"]),
    bootstrap: z.string().min(1),
  }),
  submitTarget: RuntimeSubmitTargetSchema,
  requestedCapabilities: z.array(RuntimeCapabilitySchema).default([]),
});
```

Phase 29 must keep the pilot on `kind: "html-courseware"` and `sandbox:
"iframe"` instead of inventing new runtime descriptor fields.

### 7. Runtime write boundary pattern

```ts
export const invokeRuntimeHostAction = createGuardedHostAction({
  inputSchema: RuntimeHostRequestSchema,
  execute: async ({ actor, input }) => { ... },
});
```

Browser bridge requests from the iframe should still end here, or through the
matching server actions that delegate to it.

### 8. Classroom stage posture to preserve

```tsx
<ClassroomConsoleSurface
  consoleData={consoleData}
  initialSnapshot={snapshot}
  recap={recap}
  studentDetail={studentDetail}
/>
```

Runtime host rendering for live classroom must stay inside this same route and
surface posture.
