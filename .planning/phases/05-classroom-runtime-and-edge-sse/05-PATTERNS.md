# Phase 05: Classroom runtime and Edge SSE - Pattern Map

**Mapped:** 2026-05-05
**Files analyzed:** 14
**Analogs found:** 14 / 14

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/db/schema.ts` | model | CRUD / event-driven | `src/db/schema.ts` learning tables | exact |
| `src/lib/dto/classroom.ts` | model / DTO | transform / event-driven | `src/lib/dto/learning.ts` | exact |
| `src/lib/dal/classroom.ts` | service / DAL | CRUD / request-response | `src/lib/dal/learning.ts`, `src/lib/dal/lesson-authoring.ts` | exact |
| `src/actions/classroom-actions.ts` | server action | request-response | `src/actions/learning-actions.ts`, `src/actions/lesson-authoring-actions.ts` | exact |
| `src/app/api/classroom/[sessionId]/snapshot/route.ts` | route | request-response | `src/app/(student)/student/player/page.tsx` + `src/lib/dal/learning.ts` | role-match |
| `src/app/api/classroom/[sessionId]/events/route.ts` | route | streaming | research SSE Route Handler example | no local streaming analog |
| `src/components/surfaces/classroom-console-surface.tsx` | component | request-response / event-driven UI | same file | exact |
| `src/components/classroom/*` | component | request-response / event-driven UI | `src/components/surfaces/classroom-console-surface.tsx` | role-match |
| `src/components/surfaces/player-surface.tsx` | component | event-driven UI / request-response | same file | exact |
| `src/components/learning/classroom-runtime-client.tsx` | component / hook | streaming / event-driven | `src/components/surfaces/player-surface.tsx` + research EventSource example | partial |
| `src/app/(classroom)/classroom/page.tsx` | route | request-response | same file | exact |
| `src/app/(student)/student/player/page.tsx` | route | request-response / streaming UI | same file | exact |
| `src/lib/cache-policy.ts` | config | transform | same file | exact |
| Tests: `*.test.ts(x)` for classroom DTO/DAL/actions/schema/UI | test | batch / transform | existing Phase 04 tests | exact |

## Pattern Assignments

### `src/db/schema.ts` (model, CRUD / event-driven)

**Analog:** `src/db/schema.ts`

**Imports pattern** (lines 1-2):
```typescript
import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { AdapterAccountType } from "next-auth/adapters";
```

**Cascade FK + index pattern** (lines 94-112):
```typescript
export const classMembers = sqliteTable(
  "classMember",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    classId: text("classId").notNull().references(() => classes.id, { onDelete: "cascade" }),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
  },
  (table) => [index("classMember_classId_idx").on(table.classId), index("classMember_userId_idx").on(table.userId)]
);
```

**Published snapshot ownership pattern** (lines 235-252):
```typescript
export const publishedLessonVersions = sqliteTable(
  "publishedLessonVersion",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    lessonId: text("lessonId").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    snapshotJson: text("snapshotJson", { mode: "json" }).notNull(),
    publishedById: text("publishedById").notNull().references(() => users.id, { onDelete: "cascade" }),
    publishedAt: integer("publishedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [index("publishedLessonVersions_lessonId_version_idx").on(table.lessonId, table.version)]
);
```

**Append-only latest/history pattern** (lines 285-324):
```typescript
export const taskSubmissions = sqliteTable(
  "taskSubmission",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    publishedVersionId: text("publishedVersionId").notNull().references(() => publishedLessonVersions.id, { onDelete: "cascade" }),
    lessonId: text("lessonId").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    stepId: text("stepId").notNull().references(() => lessonSteps.id, { onDelete: "cascade" }),
    studentId: text("studentId").notNull().references(() => users.id, { onDelete: "cascade" }),
    attemptNo: integer("attemptNo").notNull(),
    payloadJson: text("payloadJson", { mode: "json" }).notNull(),
    isLatest: integer("isLatest", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("taskSubmissions_attempt_unique").on(table.publishedVersionId, table.stepId, table.studentId, table.attemptNo),
    index("taskSubmissions_history_idx").on(table.publishedVersionId, table.stepId, table.studentId, table.attemptNo),
  ]
);
```

**Apply to Phase 05:** add `classroomSessions`, `classroomParticipants`, `classroomEvents` with `onDelete: "cascade"`, session `version`, `locked` boolean integer, `activeStepId`, status enum, and indexes on `(sessionId, version)` / participants by session and user.

---

### `src/lib/dto/classroom.ts` (DTO, transform / event-driven)

**Analog:** `src/lib/dto/learning.ts`

**Zod DTO imports and primitives** (lines 1-15):
```typescript
import { z } from "zod";
import { lessonStepPayloadSchema } from "./lesson-authoring";

export const ProgressStateSchema = z.enum(["not_started", "in_progress", "completed", "skipped"]);
export const LearningStepDTOSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  type: z.enum(["content", "task", "quiz"]),
  title: z.string(),
  rank: z.string(),
  payload: lessonStepPayloadSchema,
});
```

**Runtime state pattern to extend** (lines 17-22):
```typescript
export const RuntimeStepStateDTOSchema = z.object({
  forcedStepId: z.string().nullable(),
  forcedLabel: z.string().default("老师指定"),
  locked: z.boolean().default(false),
  inaccessibleMessage: z.string().nullable().default(null),
});
```

**Composite DTO + derived types pattern** (lines 100-129, 194-212):
```typescript
export const StudentPlayerDTOSchema = z.object({
  shell: z.object({ lessonId: z.string(), publishedVersionId: z.string(), title: z.string(), objective: z.string(), steps: z.array(LearningStepDTOSchema) }),
  progress: z.object({ resumeStepId: z.string().nullable(), resumeLabel: z.string(), steps: z.array(LearningProgressDTOSchema) }),
  runtime: RuntimeStepStateDTOSchema,
});

export const StudentPlayerShellDTOSchema = StudentPlayerDTOSchema.shape.shell;
export const StudentPlayerPersonalDTOSchema = StudentPlayerDTOSchema.omit({ shell: true });
export type StudentPlayerDTO = z.infer<typeof StudentPlayerDTOSchema>;
```

**Apply to Phase 05:** define `ClassroomSnapshotDTOSchema`, `ClassroomParticipantDTOSchema`, `ClassroomEventDTOSchema`, `LaunchClassroomInputSchema`, `ChangeClassroomStepInputSchema`, `ChangeClassroomModeInputSchema`; export inferred types. Include `sessionId`, `lessonId`, `publishedVersionId`, `classId`, `activeStepId`, `locked`, `version`, sanitized participants, and conflict result shape.

---

### `src/lib/dal/classroom.ts` (service / DAL, CRUD / request-response)

**Analogs:** `src/lib/dal/learning.ts`, `src/lib/dal/lesson-authoring.ts`

**Server-only + imports pattern** (`learning.ts` lines 1-25):
```typescript
import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db";
import { classMembers, classes, courseClasses, courseEnrollments, courses, lessons, publishedLessonVersions, users } from "@/db/schema";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";
import { getUserMembershipsDTO } from "@/lib/dal/membership";
import { cacheTags } from "@/lib/cache-policy";
```

**Teacher authz pattern** (`lesson-authoring.ts` lines 90-107):
```typescript
export async function assertActiveTeacher(): Promise<TeacherScope> {
  const user = await getCurrentUserDTO();
  if (!user) throw new Error("TEACHER_AUTH_REQUIRED");
  const memberships = await getUserMembershipsDTO(user.id);
  const schoolIds = memberships
    .filter((membership) => membership.role === "teacher" && membership.status === "active")
    .map((membership) => membership.schoolId);
  if (schoolIds.length === 0) throw new Error("TEACHER_AUTH_REQUIRED");
  return { userId: user.id, schoolIds };
}
```

**Student authz pattern** (`learning.ts` lines 214-231):
```typescript
async function assertActiveStudent(): Promise<StudentScope> {
  const user = await getCurrentUserDTO();
  if (!user) throw new Error(INACCESSIBLE_LESSON_MESSAGE);
  const memberships = await getUserMembershipsDTO(user.id);
  const schoolIds = memberships
    .filter((membership) => membership.role === "student" && membership.status === "active")
    .map((membership) => membership.schoolId);
  if (schoolIds.length === 0) throw new Error(INACCESSIBLE_LESSON_MESSAGE);
  return { userId: user.id, studentName: user.name ?? "同学", schoolIds };
}
```

**Cached shell vs dynamic data pattern** (`learning.ts` lines 314-343, 408-455):
```typescript
async function getPublishedStudentPlayerShellDTO(input: { lessonId: string }): Promise<StudentPlayerShellDTO> {
  'use cache'
  cacheLife('hours')
  cacheTag(cacheTags.lesson(input.lessonId))
  cacheTag(cacheTags.steps(input.lessonId))
  // read published lesson snapshot only
}

export async function getStudentPlayerPersonalDTO(input: { lessonId: string; selectedStepId?: string | null; forcedStepId?: string | null; scope?: StudentScope }) {
  const scope = input.scope ?? await assertActiveStudent();
  // no 'use cache': request-specific progress/runtime reads stay dynamic
}
```

**Transaction / append-only pattern** (`learning.ts` lines 501-553):
```typescript
const inserted = await db.transaction(async (tx) => {
  const previous = await tx.query.taskSubmissions.findMany({ where: and(/* identity */), orderBy: desc(taskSubmissions.attemptNo) });
  const attemptNo = (previous[0]?.attemptNo ?? 0) + 1;
  await tx.update(taskSubmissions).set({ isLatest: false }).where(and(/* identity */));
  const [row] = await tx.insert(taskSubmissions).values({ ...payload, studentId: scope.userId, attemptNo, isLatest: true }).returning();
  if (!row) throw new Error("DUPLICATE_ATTEMPT");
  return row;
});
```

**Optimistic conflict pattern** (`lesson-authoring.ts` lines 283-307):
```typescript
if (input.expectedRevision && input.expectedRevision !== lesson.revision) {
  throw new Error("CONFLICT");
}
const [updated] = await db
  .update(lessons)
  .set({ title: input.title, objective: input.objective, revision: lesson.revision + 1, updatedAt: new Date() })
  .where(eq(lessons.id, input.lessonId))
  .returning();
```

**Apply to Phase 05:** DAL must own launch validation, roster non-empty check, participant creation, active step/mode mutations, `expectedVersion` conditional update, append-only event insert, and sanitized snapshot DTO return. Do not import DB from UI or Edge route.

---

### `src/actions/classroom-actions.ts` (server action, request-response)

**Analogs:** `src/actions/learning-actions.ts`, `src/actions/lesson-authoring-actions.ts`

**Server Action imports** (`learning-actions.ts` lines 1-18):
```typescript
"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { markStepProgress, saveAttemptFeedback, submitQuizAttempt, submitTaskAttempt } from "@/lib/dal/learning";
import { cacheTags } from "@/lib/cache-policy";
import { FeedbackInputSchema, MarkProgressInputSchema, SubmitQuizInputSchema, SubmitTaskInputSchema } from "@/lib/dto/learning";
```

**Action result and normalization** (`learning-actions.ts` lines 20-39):
```typescript
type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; message: string };

function normalizeInput(input: FormData | Record<string, unknown>) {
  if (!(input instanceof FormData)) return input;
  return Object.fromEntries(input.entries());
}

function validationError(message = validationMessage) {
  return { ok: false as const, error: "VALIDATION_ERROR", message };
}
```

**Zod validation + updateTag pattern** (`learning-actions.ts` lines 52-66):
```typescript
export async function markStepProgressAction(input: FormData | Record<string, unknown>): Promise<ActionResult<unknown>> {
  const parsed = MarkProgressInputSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return validationError();
  try {
    const result = await markStepProgress(parsed.data);
    if (result.studentId) updateTag(cacheTags.progress(parsed.data.lessonId, result.studentId));
    updateTag(cacheTags.teacherReview(parsed.data.lessonId));
    return { ok: true, data: result };
  } catch (error) {
    return handleLearningActionError(error);
  }
}
```

**Conflict error handling** (`lesson-authoring-actions.ts` lines 22-92):
```typescript
const conflictMessage = "检测到更新冲突，请刷新后重试。";

function handleActionError(error: unknown) {
  if (error instanceof Error && error.message === "CONFLICT") {
    return { ok: false as const, error: "CONFLICT", message: conflictMessage };
  }
  if (error instanceof z.ZodError) return validationError();
  throw error;
}
```

**Apply to Phase 05:** add launch/change-step/change-mode/refresh actions. Parse with classroom DTO schemas, call DAL only, use `updateTag(cacheTags.classroom(sessionId))` on successful writes, return conflict DTO without auto replay.

---

### `src/app/api/classroom/[sessionId]/snapshot/route.ts` (route, request-response)

**Analog:** `src/app/(student)/student/player/page.tsx` + DAL boundaries

**Route/page dynamic read pattern** (`student/player/page.tsx` lines 41-57):
```typescript
export default async function StudentPlayerPage({ searchParams }: StudentPlayerPageProps) {
  const params = await searchParams
  let shell: StudentPlayerShellDTO | null = null
  let scope: StudentPlayerScope | null = null
  try {
    const dashboard = await getStudentDashboardDTO()
    const lessonId = params?.lessonId ?? dashboard.lessons[0]?.lessonId
    if (lessonId) {
      scope = await assertStudentCanOpenPlayer({ lessonId })
      shell = await getStudentPlayerShellDTO({ lessonId, scope })
    }
  } catch {
    shell = null
    scope = null
  }
}
```

**Apply to Phase 05:** Route Handler should call `getClassroomSnapshotDTO({ sessionId })`, rely on DAL authz, return sanitized JSON DTO, and never use `updateTag()`. Keep Node runtime for DB/Auth.

---

### `src/app/api/classroom/[sessionId]/events/route.ts` (route, streaming)

**Analog:** No local streaming analog; use verified research SSE pattern.

**Edge SSE route pattern** (`05-RESEARCH.md` lines 238-273):
```typescript
export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let lastVersion = 0;
      const abort = request.signal;
      while (!abort.aborted) {
        const snapshot = await fetchSnapshotThroughNode(request, lastVersion);
        if (snapshot.version > lastVersion) {
          lastVersion = snapshot.version;
          controller.enqueue(encoder.encode(`event: snapshot\nid: ${snapshot.version}\ndata: ${JSON.stringify(snapshot)}\n\n`));
        } else {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store" } });
}
```

**Apply to Phase 05:** Edge route must not import `@/db`, `drizzle-orm`, or DB-backed `auth.ts`. It should fetch Node snapshot endpoint and emit only versioned sanitized snapshots or keepalive comments.

---

### `src/components/surfaces/classroom-console-surface.tsx` and `src/components/classroom/*` (component, request-response / event-driven UI)

**Analog:** `src/components/surfaces/classroom-console-surface.tsx`

**UI imports** (lines 1-4):
```typescript
import { Activity, MonitorUp, Radio, UsersRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { classroomParticipants, demoCourse, demoLesson, lessonSteps } from '@/lib/demo-data'
```

**No-line tonal shell pattern** (lines 18-44):
```tsx
<section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
  <div className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient sm:p-6">
    <Badge variant="accent" className="mb-4 bg-surface-container-lowest">
      {demoCourse.classLabel} · 课堂运行
    </Badge>
    <h1 className="max-w-3xl text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[3rem]">
      {demoLesson.title}
    </h1>
    <Card className="bg-surface-container-lowest p-5 sm:p-6">
      <p className="text-sm text-on-surface-variant">当前步骤</p>
      <h2 className="mt-2 text-2xl font-semibold">{currentStep.title} · {currentStep.focus}</h2>
    </Card>
  </div>
</section>
```

**Lock mode visual pattern** (lines 46-58):
```tsx
<Card className="bg-surface-container-lowest p-5 sm:p-6">
  <p className="text-sm text-on-surface-variant">课堂模式</p>
  <div className="mt-4 grid gap-3">
    <div className="rounded-3xl bg-primary-container/25 p-5 text-primary">
      <p className="text-2xl font-semibold">锁定跟随</p>
      <p className="mt-2 text-sm">学生端跟随教师当前步骤。</p>
    </div>
  </div>
</Card>
```

**Participant list pattern** (lines 62-83):
```tsx
<Card className="bg-surface-container-lowest p-5 sm:p-6">
  <div className="flex items-center gap-3"><UsersRound className="size-6 text-primary" aria-hidden /><h2 className="text-2xl font-semibold">学生状态</h2></div>
  <div className="mt-5 space-y-3">
    {classroomParticipants.map((participant) => (
      <div key={participant.name} className="rounded-3xl bg-surface-container-low p-4">
        <p className="font-semibold">{participant.name}</p>
        <Badge variant={participant.status === '已跟随' ? 'success' : 'default'}>{participant.status}</Badge>
      </div>
    ))}
  </div>
</Card>
```

**Apply to Phase 05:** replace demo imports with `ClassroomConsoleDTO`; split launch selector, live control panel, conflict recovery card, participant roster. Preserve tonal `Card`/`Badge` styling and Simplified Chinese copy.

---

### `src/components/surfaces/player-surface.tsx` and `src/components/learning/classroom-runtime-client.tsx` (component, streaming / event-driven UI)

**Analog:** `src/components/surfaces/player-surface.tsx`

**Imports + Server Action form pattern** (lines 1-16, 38-42):
```typescript
import Link from 'next/link'
import { BookOpen, CheckCircle2, Focus, MonitorPlay } from 'lucide-react'
import { markStepProgressAction } from '@/actions/learning-actions'
import type { LearningStepDTO, ProgressState, StudentPlayerDTO } from '@/lib/dto/learning'

async function completeContentStep(formData: FormData) {
  'use server'
  await markStepProgressAction(formData)
}
```

**Teacher-forced precedence** (lines 170-175):
```typescript
const player = { shell, ...personal } satisfies StudentPlayerDTO
const currentStep = player.shell.steps.find((step) => step.id === player.runtime.forcedStepId)
  ?? player.shell.steps.find((step) => step.id === player.progress.resumeStepId)
  ?? player.shell.steps[0]
```

**Step rail pattern to adapt for locked disabled steps** (lines 187-207):
```tsx
{player.shell.steps.map((step, index) => {
  const state = getStepState(player, step.id)
  const isCurrent = step.id === currentStep.id
  const isForced = player.runtime.forcedStepId === step.id
  return (
    <Link key={step.id} href={stepHref(player, step)} className={`min-w-56 rounded-full p-4 transition ${isCurrent ? 'bg-surface-container-lowest shadow-ambient' : 'bg-surface-container-lowest/70'}`}>
      <span className={`grid size-10 place-items-center rounded-full text-sm font-semibold ${state === 'completed' ? 'bg-tertiary-container text-tertiary' : 'bg-primary-container/25 text-primary'}`}>{index + 1}</span>
      <p className="text-sm text-on-surface-variant">{isForced ? '老师指定' : stateCopy[state]}</p>
    </Link>
  )
})}
```

**Client EventSource pattern** (`05-RESEARCH.md` lines 286-299):
```typescript
useEffect(() => {
  const source = new EventSource(`/api/classroom/${sessionId}/events`);
  source.addEventListener("snapshot", (event) => {
    const snapshot = ClassroomSnapshotDTOSchema.parse(JSON.parse(event.data));
    reconcileOnlyIfNewer(snapshot);
  });
  source.onerror = () => setConnectionState("reconnecting");
  return () => source.close();
}, [sessionId]);
```

**Apply to Phase 05:** introduce a small `'use client'` runtime component for SSE only. Preserve existing task/quiz draft components. Locked mode should disable non-current navigation with explanatory copy; unlocked mode shows teacher step as recommendation.

---

### `src/app/(classroom)/classroom/page.tsx` (route, request-response)

**Analog:** same file

**Current route entry** (lines 1-5):
```typescript
import { ClassroomConsoleSurface } from '@/components/surfaces/classroom-console-surface'

export default function ClassroomPage() {
  return <ClassroomConsoleSurface />
}
```

**Apply to Phase 05:** keep thin route. Load DTO in page or streamed child, then pass sanitized data to `ClassroomConsoleSurface`. Do not import DB into the component.

---

### `src/app/(student)/student/player/page.tsx` (route, request-response / streaming UI)

**Analog:** same file

**Suspense streamed personal region** (lines 25-39, 59-70):
```tsx
async function PlayerPersonalLoader({ lessonId, selectedStepId, shell, scope }: Props) {
  const personal = await getStudentPlayerPersonalDTO({ lessonId, selectedStepId, forcedStepId: null, scope })
  return <PlayerPersonalRegion shell={shell} personal={personal} />
}

return (
  <PlayerSurface
    shell={shell}
    personalSlot={
      shell && scope ? (
        <Suspense fallback={<PlayerPersonalFallback shell={shell} />}>
          <PlayerPersonalLoader lessonId={shell.lessonId} selectedStepId={params?.stepId ?? null} shell={shell} scope={scope} />
        </Suspense>
      ) : null
    }
  />
)
```

**Apply to Phase 05:** keep cached shell outside request-specific runtime. Add classroom snapshot/runtime loader under Suspense or inside personal region. Do not place classroom runtime reads in cached shell function.

---

### `src/lib/cache-policy.ts` (config, transform)

**Analog:** same file

**Cache tag vocabulary** (lines 1-11):
```typescript
export const cacheTags = {
  lesson: (lessonId: string) => `lesson:${lessonId}`,
  steps: (lessonId: string) => `steps:${lessonId}`,
  progress: (lessonId: string, userId: string) => `progress:${lessonId}:${userId}`,
  submission: (lessonId: string, userId: string) => `submission:${lessonId}:${userId}`,
  teacherReview: (lessonId: string) => `teacher-review:${lessonId}`,
  classroom: (sessionId: string) => `classroom:${sessionId}`,
} as const
```

**Route boundary vocabulary** (lines 43-55):
```typescript
{
  route: '/student/player',
  staticShell: ['lesson chrome', 'step navigation'],
  suspenseRegions: ['student progress', 'latest submission', 'classroom live state'],
  cacheTags: ['lesson:${lessonId}', 'steps:${lessonId}', 'progress:${lessonId}:${userId}', 'classroom:${sessionId}'],
  rules: ['cache lesson chrome and step navigation', 'stream personal and classroom runtime state'],
},
{
  route: '/classroom',
  suspenseRegions: ['classroom live state'],
  cacheTags: ['lesson:${lessonId}', 'classroom:${sessionId}'],
}
```

**Apply to Phase 05:** reuse `cacheTags.classroom(sessionId)` in classroom Server Actions. Add helper tags only if needed for launch lists (e.g. class/session list), and document that snapshot/SSE routes do not call `updateTag()`.

---

### Tests (test, batch / transform)

**Analogs:** Phase 04 source-scanning tests

**DAL test pattern** (`learning.test.ts` lines 36-45, 62-83):
```typescript
const source = readFileSync("src/lib/dal/learning.ts", "utf8");

it("is server-only and requires an active student", () => {
  expect(source.trimStart().startsWith('import "server-only";')).toBe(true);
  expect(source).toContain("assertActiveStudent");
  expect(source).toContain("getCurrentUserDTO");
});

it("splits player reads into cached shell and dynamic personal data", () => {
  expect(source).toContain("cacheLife('hours')");
  expect(source).toContain("cacheTag(cacheTags.lesson(input.lessonId))");
});
```

**Action test pattern** (`learning-actions.test.ts` lines 7-29):
```typescript
it("validates all learning mutations before calling the DAL", () => {
  expect(source.trimStart().startsWith('"use server";')).toBe(true);
  expect(source).toContain("MarkProgressInputSchema.safeParse");
});

it("updates progress, submission, and teacher review cache tags after successful writes", () => {
  expect(source).toContain("updateTag(cacheTags.progress");
});
```

**Schema cascade test pattern** (`schema.learning.test.ts` lines 23-27):
```typescript
const learningSection = schema.slice(schema.indexOf("export const lessonStepProgress"));
expect(learningSection.match(/onDelete: "cascade"/g)?.length ?? 0).toBeGreaterThanOrEqual(10);
```

**UI route Suspense test pattern** (`student-player-surfaces.test.ts` lines 26-33):
```typescript
expect(routeSource).toContain("Suspense");
expect(routeSource).toContain("getStudentPlayerShellDTO");
expect(routeSource).toContain("getStudentPlayerPersonalDTO");
expect(routeSource).toContain("<Suspense");
expect(routeSource).not.toContain("getStudentPlayerDTO({");
```

**Apply to Phase 05:** add tests asserting Edge SSE route has `runtime = "edge"`, no `@/db`/`drizzle-orm` imports, classroom actions validate schemas and update classroom tag, DAL is server-only and uses `expectedVersion`, schema has cascade FKs and version/event indexes, UI preserves Suspense and locked disabled copy.

## Shared Patterns

### Auth and authorization

**Source:** `src/lib/dal/lesson-authoring.ts` lines 90-107 and `src/lib/dal/learning.ts` lines 214-231  
**Apply to:** `src/lib/dal/classroom.ts`, snapshot route through DAL, classroom Server Actions.

```typescript
const user = await getCurrentUserDTO();
const memberships = await getUserMembershipsDTO(user.id);
const schoolIds = memberships
  .filter((membership) => membership.role === "teacher" && membership.status === "active")
  .map((membership) => membership.schoolId);
if (schoolIds.length === 0) throw new Error("TEACHER_AUTH_REQUIRED");
```

### DTO validation at boundaries

**Source:** `src/lib/dto/learning.ts` lines 5-22, 186-212  
**Apply to:** classroom DTOs, action inputs, SSE payloads.

```typescript
export const MutationResultDTOSchema = z.object({
  ok: z.boolean(),
  lessonId: z.string().optional(),
  studentId: z.string().optional(),
  successMessage: z.string().optional(),
  error: z.string().optional(),
});
export type MutationResultDTO = z.infer<typeof MutationResultDTOSchema>;
```

### Server Action cache invalidation

**Source:** `src/actions/learning-actions.ts` lines 52-66 and `src/lib/cache-policy.ts` lines 1-11  
**Apply to:** launch, change active step, change lock mode, end classroom.

```typescript
const result = await markStepProgress(parsed.data);
if (result.studentId) updateTag(cacheTags.progress(parsed.data.lessonId, result.studentId));
updateTag(cacheTags.teacherReview(parsed.data.lessonId));
return { ok: true, data: result };
```

### Explicit cached shell vs dynamic runtime

**Source:** `src/lib/dal/learning.ts` lines 314-343 and `src/app/(student)/student/player/page.tsx` lines 59-70  
**Apply to:** student player classroom runtime and teacher classroom live state.

```typescript
'use cache'
cacheLife('hours')
cacheTag(cacheTags.lesson(input.lessonId))
cacheTag(cacheTags.steps(input.lessonId))
```

```tsx
<Suspense fallback={<PlayerPersonalFallback shell={shell} />}>
  <PlayerPersonalLoader lessonId={shell.lessonId} selectedStepId={params?.stepId ?? null} shell={shell} scope={scope} />
</Suspense>
```

### Edge SSE boundary

**Source:** `05-RESEARCH.md` lines 238-273  
**Apply to:** `src/app/api/classroom/[sessionId]/events/route.ts` only.

```typescript
export const runtime = "edge";
export const dynamic = "force-dynamic";
return new Response(stream, {
  headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store" },
});
```

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/app/api/classroom/[sessionId]/events/route.ts` | route | streaming | No existing local Edge/SSE Route Handler exists; use verified research pattern and test import boundary. |

## Metadata

**Analog search scope:** `src/**/*.ts`, `src/**/*.tsx`, `**/*test*.{ts,tsx}`  
**Files scanned:** 60+ glob matches; 16 files read directly  
**Pattern extraction date:** 2026-05-05
