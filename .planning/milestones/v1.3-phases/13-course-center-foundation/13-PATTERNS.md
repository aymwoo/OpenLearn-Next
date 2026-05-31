# Phase 13: Course center foundation - Patterns

## Existing analogs

| Target | Analog file | Pattern to reuse |
|--------|-------------|------------------|
| Teacher route shell | `src/app/(teacher)/teacher/layout.tsx` | 教师路由已包含 `/teacher/courses` 入口 |
| Course card surface | `src/components/surfaces/library-surface.tsx` | 课程中心 hero + card grid 的 tonal card 节奏 |
| Course/lesson detail visual density | `src/components/surfaces/lesson-editor-surface.tsx` | 大标题 + metrics + tonal nested panels |
| Teacher authorization | `src/lib/dal/lesson-authoring.ts` | `assertActiveTeacher()` + `assertSchoolAccess()` |
| Action validation contract | `src/actions/lesson-authoring-actions.ts` | Zod + `ActionResult` + `updateTag()` |
| Ghost field input style | `src/components/ui/ghost-field.ts` | 输入框 / select 的 shared focus contract |

## Interface snippets

### Authorization baseline

From `src/lib/dal/lesson-authoring.ts`:

```ts
export async function assertActiveTeacher(): Promise<{ userId: string; schoolIds: string[] }>
```

### Existing course DTO baseline

From `src/lib/dto/lesson-authoring.ts`:

```ts
export const CourseDTOSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  ownerId: z.string(),
  title: z.string(),
  subject: z.string(),
  grade: z.string(),
  status: z.string(),
  lessonCount: z.number().int().nonnegative().default(0),
  classLabels: z.array(z.string()).default([]),
  enrollmentCount: z.number().int().nonnegative().default(0),
  updatedAt: z.string(),
})
```

### Action contract baseline

From `src/actions/lesson-authoring-actions.ts`:

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; message: string }
```

### Cache tag baseline

From `src/lib/cache-policy.ts`:

```ts
export const cacheTags = {
  course: (courseId: string) => `course:${courseId}`,
  lesson: (lessonId: string) => `lesson:${lessonId}`,
  steps: (lessonId: string) => `steps:${lessonId}`,
}
```
