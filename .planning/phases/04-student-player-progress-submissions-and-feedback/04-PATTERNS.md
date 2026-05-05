# Phase 04 — Pattern Map

## Existing analogs

| Role | Existing file | Pattern to reuse |
|------|---------------|------------------|
| Schema | `src/db/schema.ts` | `sqliteTable`, cascade references, explicit indexes, JSON columns |
| DTO | `src/lib/dto/lesson-authoring.ts` | Zod schemas plus exported inferred DTO types |
| DAL | `src/lib/dal/lesson-authoring.ts` | `import "server-only";`, scope assertions, DTO parsing before return |
| Actions | `src/actions/lesson-authoring-actions.ts` | `"use server"`, Zod `safeParse`, deterministic Chinese errors, `updateTag()` |
| Verification | `scripts/verify-phase3-authoring.ts` | Source-level invariant script with exact string checks |
| Student UI | `src/components/surfaces/student-dashboard-surface.tsx` | Tonal dashboard shell and resume CTA structure |
| Player UI | `src/components/surfaces/player-surface.tsx` | Two-column desktop player with step rail and learning canvas |
| Teacher route | `src/app/(teacher)/teacher/editor/page.tsx` | Async route loads DTO through DAL and passes props to surface |

## Concrete excerpts

```ts
// DAL boundary pattern
import "server-only";

export async function assertActiveTeacher() {
  const user = await getCurrentUserDTO();
  if (!user) throw new Error("TEACHER_AUTH_REQUIRED");
}
```

```ts
// Server Action cache pattern
"use server";
import { updateTag } from "next/cache";

updateTag(cacheTags.lesson(parsed.data.lessonId));
updateTag(cacheTags.steps(parsed.data.lessonId));
```

```tsx
// Route-to-DTO pattern
export default async function TeacherEditorPage() {
  const overview = await getTeacherAuthoringOverview();
  return <LessonEditorSurface overview={overview} lesson={lesson} />;
}
```

## Planning implications

- New learning code should mirror Phase 03 boundaries rather than inventing a
  separate architecture.
- Schema and DTO contracts must be created before DAL and UI work.
- Verification should be introduced before UI wiring so later plans can close
  exact invariant strings without interpretation.
