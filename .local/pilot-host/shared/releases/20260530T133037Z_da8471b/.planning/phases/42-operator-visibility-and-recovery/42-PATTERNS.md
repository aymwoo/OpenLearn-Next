# Phase 42: Operator visibility and recovery - Pattern Map

**Mapped:** 2026-05-19
**Files analyzed:** 16
**Analogs found:** 16 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/components/surfaces/settings-surface.tsx` | component | request-response | `src/components/surfaces/settings-surface.tsx` | exact |
| `src/app/settings/labs/async-tasks/page.tsx` | route | request-response | `src/app/settings/labs/runtime-inspector/page.tsx` | exact |
| `src/components/surfaces/async-task-operator-surface.tsx` | component | request-response | `src/components/surfaces/runtime-inspector-surface.tsx` | role-match |
| `src/lib/dal/async-task-operator.ts` | service | CRUD | `src/lib/dal/runtime-inspector.ts` + `src/lib/dal/async-tasks.ts` | role-match |
| `src/lib/dto/async-task-operator.ts` | utility | transform | `src/features/async-tasks/shared/dto.ts` | role-match |
| `src/app/settings/labs/async-tasks/[taskId]/page.tsx` | route | request-response | `src/app/settings/labs/runtime-inspector/page.tsx` | exact |
| `src/components/surfaces/async-task-operator-detail-surface.tsx` | component | request-response | `src/components/surfaces/runtime-inspector-surface.tsx` + `src/components/surfaces/course-import-review-surface.tsx` | partial |
| `src/actions/async-task-operator-actions.ts` | action | request-response | `src/features/schedule/reminders/actions.ts` | exact |
| `src/features/async-tasks/server/recovery.ts` | service | event-driven | `src/features/schedule/reminders/server.ts` + `src/features/async-tasks/server/enqueue.ts` | partial |
| `src/features/async-tasks/server/registry.ts` | config | transform | `src/features/async-tasks/server/registry.ts` | exact |
| `src/features/async-tasks/shared/dto.ts` | utility | transform | `src/features/async-tasks/shared/dto.ts` | exact |
| `src/features/async-tasks/infra/queue-events.ts` | service | event-driven | `src/features/async-tasks/infra/queue-events.ts` | exact |
| `src/db/schema.ts` | model | CRUD | `src/db/schema.ts` (`asyncTasks` / `asyncTaskEvents`) | role-match |
| `src/lib/cache-policy.ts` | config | transform | `src/lib/cache-policy.ts` | exact |
| `scripts/verify-phase42-operator-recovery.ts` | test | batch | `scripts/verify-phase41-batch-import.ts` + `scripts/verify-phase39-async-tasks.ts` | exact |
| `package.json` | config | batch | `package.json` | exact |

## Pattern Assignments

### `src/components/surfaces/settings-surface.tsx`（settings labs 入口补充）

**Analog:** `src/components/surfaces/settings-surface.tsx`

**入口卡片模式**（lines 350-371）
```tsx
<QuickLink
  href="/settings/labs/runtime-inspector"
  title="Runtime Inspector"
  description="查看 transport timeline、degraded fallback 与当前 fanout topology。"
/>
```

**Labs surface 节奏模式**（lines 415-445）
```tsx
<main className="min-h-screen bg-surface px-4 py-6 text-on-surface sm:px-6 lg:px-8">
  <div className={cn(surfaceWidths.workspace, teacherSurfaceRhythm.stack, "flex flex-col")}>
    <section className={teacherSurfaceRhythm.section}>
```

**说明**
- async operator 入口应作为 settings 快捷入口中的同级 `QuickLink`。
- 保持 Settings Labs tonal/no-line 语言，不要引入新的 admin dashboard 视觉体系。

---

### `src/app/settings/labs/async-tasks/page.tsx`（operator 首页 route）

**Analog:** `src/app/settings/labs/runtime-inspector/page.tsx`

**Page 装配模式**（lines 1-18）
```tsx
import { RuntimeInspectorSurface } from "@/components/surfaces/runtime-inspector-surface";
import { getRuntimeInspectorDTO } from "@/lib/dal/runtime-inspector";

export default async function RuntimeInspectorPage({ searchParams }: { ... }) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const inspector = await getRuntimeInspectorDTO({
    runtimeSessionId: resolvedSearchParams.runtimeSessionId,
  });

  return <RuntimeInspectorSurface inspector={inspector} />;
}
```

**Shell 路由归属模式**（`src/lib/theme-layout/route-surface-registry.ts` lines 393-399）
```ts
if (pathname.startsWith("/settings/labs")) {
  return "/settings/labs";
}
```

**说明**
- page 保持极薄，只负责 query → DAL → surface。
- `/settings/labs/async-tasks` 会自动落入 `/settings/labs` shell，无需新增 route surface key。

---

### `src/components/surfaces/async-task-operator-surface.tsx`（operator 首页 surface）

**Analog:** `src/components/surfaces/runtime-inspector-surface.tsx`

**Hero + metric cards 模式**（lines 29-63）
```tsx
<section className={teacherSurfaceRhythm.hero}>
  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,22rem)] xl:items-start">
    <div className={surfaceWidths.heroTitle}>
      <Badge variant="accent" className="bg-surface-container-lowest text-primary">
        Runtime Inspector
      </Badge>
```

**显式 degraded alert 模式**（lines 65-74）
```tsx
<Card className="mt-6 bg-[#fff7ed] p-5 text-[#9a3412] sm:p-6">
  <p className="text-xs uppercase tracking-[0.2em]">Redis degraded</p>
  <h2 className="mt-2 text-[1.15rem] font-semibold">跨实例 fanout 当前未完全健康</h2>
</Card>
```

**列表区块模式**（lines 77-139）
```tsx
<section className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
  <Card className="bg-surface-container-lowest p-5 sm:p-6">
```

**说明**
- Phase 42 首页可直接复用“hero → metrics → degraded alert → second section list”的 inspector 节奏。
- 问题任务列表建议用 cards/stack，不要退回 data table。

---

### `src/lib/dal/async-task-operator.ts`（operator overview/detail DAL）

**Analog:** `src/lib/dal/runtime-inspector.ts`、`src/lib/dal/async-tasks.ts`

**operator scope resolver 模式**（`runtime-inspector.ts` lines 37-69）
```ts
const memberships = await getUserMembershipsDTO(user.id);
const activeMemberships = memberships.filter((membership) => membership.status === "active");
const activeSchoolIds = [...new Set(activeMemberships.map((membership) => membership.schoolId))];

if (activeMemberships.some((membership) => membership.role === "developer")) {
  return { role: "developer", actorId: user.id, schoolIds: activeSchoolIds };
}

if (activeMemberships.some((membership) => membership.role === "admin")) {
  return { role: "admin", actorId: user.id, schoolIds: activeSchoolIds };
}
```

**缓存 DAL 模式**（`async-tasks.ts` lines 43-58, 83-108）
```ts
"use cache";

cacheLife("minutes");
cacheTag(cacheTags.asyncTaskList(input.actorId));
...
cacheTag(cacheTags.asyncTask(input.taskId));
```

**DTO parse 收口模式**（`runtime-inspector.ts` lines 301-337）
```ts
return RuntimeInspectorDTOSchema.parse({
  scopeRole: scope.role,
  ...
  timeline,
  emptyState: null,
});
```

**说明**
- 新 DAL 应该统一负责：权限范围、school 过滤、problem-task 排序、backlog posture 解释、detail grouping。
- 不要让 surface 客户端自己 sort `failed > stalled > retrying`。
- operator scope 直接镜像 runtime inspector，但去掉 teacher fallback。

---

### `src/lib/dto/async-task-operator.ts`（operator DTO）

**Analog:** `src/features/async-tasks/shared/dto.ts`

**Zod DTO 组织模式**（lines 19-80）
```ts
export const AsyncTaskHistoryEventDTOSchema = z.object({ ... }).strict();
export const AsyncTaskAttemptHistoryDTOSchema = z.object({ ... }).strict();
export const AsyncTaskDetailDTOSchema = AsyncTaskListItemDTOSchema.extend({
  queueJobId: z.string().nullable().default(null),
  latestAttemptNumber: z.number().int().nonnegative(),
  failure: AsyncTaskFailureContextDTOSchema.nullable().default(null),
  recovery: AsyncTaskRecoveryPostureDTOSchema.nullable().default(null),
  attempts: z.array(AsyncTaskAttemptHistoryDTOSchema).default([]),
  history: z.array(AsyncTaskHistoryEventDTOSchema).default([]),
}).strict();
```

**说明**
- operator-specific DTO 应独立建在 `src/lib/dto/async-task-operator.ts`，避免污染 teacher/staff 用的 shared DTO。
- 延续 `z.object(...).strict()` + `nullable().default(null)` 风格。

---

### `src/app/settings/labs/async-tasks/[taskId]/page.tsx`（detail route）

**Analog:** `src/app/settings/labs/runtime-inspector/page.tsx`

**动态 page 模式**（可复制相同组织方式）
```tsx
const detail = await getAsyncTaskOperatorDetailDTO({ taskId: params.taskId });
return <AsyncTaskOperatorDetailSurface detail={detail} />;
```

**说明**
- 仍然保持 route 极薄。
- detail route 的输入只应来自 params/searchParams，不应在 page 中直接查 DB/BullMQ。

---

### `src/components/surfaces/async-task-operator-detail-surface.tsx`（detail surface）

**Analog:** `src/components/surfaces/runtime-inspector-surface.tsx`、`src/components/surfaces/course-import-review-surface.tsx`

**顶部状态摘要/告警卡模式**（`course-import-review-surface.tsx` lines 145-168）
```tsx
<section
  className={cn(
    teacherSurfaceRhythm.section,
    dispatchFailed || asyncSummary.status === "failed"
      ? "bg-error-container text-on-error-container"
      : partialSuccess
        ? "bg-primary-container/12 text-on-surface"
        : "bg-surface-container-lowest text-on-surface",
  )}
>
```

**摘要卡网格模式**（`course-import-review-surface.tsx` lines 182-204）
```tsx
<section className={teacherSurfaceRhythm.section}>
  <div className="grid gap-4 lg:grid-cols-4">
    <SummaryCard label="..." value="..." />
  </div>
</section>
```

**辅助 timeline 模式**（`runtime-inspector-surface.tsx` lines 107-139）
```tsx
<Card className="bg-surface-container-lowest p-5 sm:p-6">
  <div className="mt-5 grid gap-3">
    {inspector.timeline.map((item) => (
      <article key={item.id} className={cn(teacherSurfaceRhythm.card, "bg-surface-container-low p-4")}>
```

**说明**
- 顶部必须先放 status summary、latest error、progress snapshot、recovery posture、retry CTA。
- attempts 区域用 grouped sections；timeline 放在后半段，沿用 inspector 的 audit card 样式。

---

### `src/actions/async-task-operator-actions.ts`（retry server action）

**Analog:** `src/features/schedule/reminders/actions.ts`

**统一 ActionResult 模式**（lines 10-24）
```ts
type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; message: string; issues?: unknown[] };

function handleError(error: unknown) {
  if (error instanceof z.ZodError) {
    return { ok: false as const, error: "VALIDATION_ERROR", message: "..." };
  }
```

**成功后失效 tag 模式**（lines 43-50）
```ts
export async function retryScheduleReminderDispatchAction(input: { dispatchId: string }): Promise<ActionResult<unknown>> {
  try {
    const dto = await retryScheduleReminderDispatch(input);
    invalidateScheduleReminderTags(updateTag, dto.schoolId);
    return { ok: true, data: dto };
  } catch (error) {
    return handleError(error);
  }
}
```

**多 tag 精准失效模式**（`src/actions/course-import-actions.ts` lines 54-65）
```ts
function invalidateCourseImportAsyncTags(actorId: string, batchId: string, taskId: string) {
  updateTag(cacheTags.teacherCourses(actorId));
  updateTag(cacheTags.asyncTask(taskId));
  updateTag(cacheTags.asyncTaskList(actorId));
  updateTag(cacheTags.asyncTaskEntity("course_import_batch", batchId));
}
```

**说明**
- Phase 42 action 应返回统一 `{ ok, data/error }` 结构。
- 重试成功后至少要失效 detail tag、operator overview list tag、相关 entity tag；必要时再 `revalidatePath()`。

---

### `src/features/async-tasks/server/recovery.ts`（safe retry/recovery server）

**Analog:** `src/features/schedule/reminders/server.ts`、`src/features/async-tasks/server/enqueue.ts`

**server-only + auth + tx 模式**（`schedule/reminders/server.ts` lines 1-23, 160-206）
```ts
import "server-only";

export async function retryScheduleReminderDispatch(input: { dispatchId: string }) {
  const scope = await assertScheduleTeacherScope();
  const delivery = await db.query.scheduleReminderDispatch.findFirst({ ... });
  if (!delivery || !scope.schoolIds.includes(delivery.schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }
```

**写 DB + append audit 模式**（lines 183-203）
```ts
await db.transaction(async (tx) => {
  await tx.update(...)
  await appendScheduleAudit(tx, {
    schoolId: delivery.schoolId,
    entityType: "scheduleReminder",
    entityId: delivery.id,
    actionType: "retry_dispatch",
    actorId: scope.userId,
  });
});
```

**立即切换诚实状态模式**（`enqueue.ts` lines 133-177, 185-229）
```ts
const [updatedTask] = await db
  .update(asyncTasks)
  .set({
    status: "queued",
    enqueueIntentStatus: "dispatched",
    latestProgressJson: { stage: "queued", ... },
    updatedAt: dispatchAt,
  })
```

**说明**
- recovery server 需要做：operator auth → visibility/school scope → registry eligibility → terminal failed check → BullMQ retry → append recovery event → immediate durable snapshot update。
- 不要复用 `enqueueAsyncTask()`，因为它会新建 durable task row。

---

### `src/features/async-tasks/server/registry.ts`（recovery eligibility / visibility metadata）

**Analog:** `src/features/async-tasks/server/registry.ts`

**definition 声明模式**（lines 42-63）
```ts
export function createAsyncTaskDefinition(...) {
  const { payloadSchema, progressSchema, resultSchema, ...metadata } = input;
  return {
    ...AsyncTaskDefinitionMetadataSchema.parse(metadata),
    payloadSchema,
    progressSchema,
    resultSchema,
  };
}
```

**task definition 常量模式**（lines 106-131）
```ts
export const courseImportApplyBatchTaskDefinition = createAsyncTaskDefinition({
  taskType: "course_import.apply_batch",
  featureArea: "course_import",
  visibilityScope: "actor_owned",
  ...
  reliability: {
    queueName: "course-import",
    attempts: 3,
    backoff: { type: "exponential", delay: 2_000 },
  },
});
```

**说明**
- Phase 42 若补 `recovery` metadata，应延续 registry 常量声明，而不是散落到 action/DAL 中硬编码。
- `course_import.apply_batch` 的 operator 可见性与 recovery eligibility 应在 registry 里成为 truth source。

---

### `src/features/async-tasks/shared/dto.ts`（attempt/history 原子字段扩展）

**Analog:** `src/features/async-tasks/shared/dto.ts`

**嵌套 schema 模式**（lines 19-53）
```ts
export const AsyncTaskHistoryEventDTOSchema = z.object({ ... }).strict();
export const AsyncTaskAttemptHistoryDTOSchema = z.object({ ... }).strict();
export const AsyncTaskRecoveryPostureDTOSchema = z.object({ ... }).strict();
```

**说明**
- 若 planner 选择轻改 shared DTO，应只补“operator 可复用的原子字段”，例如 grouped attempt item 原子 schema、retry eligibility 原子 schema。
- 不要把 operator 页面专属大 DTO 直接塞进 shared 文件。

---

### `src/features/async-tasks/infra/queue-events.ts`（recovery projection / invalidation）

**Analog:** `src/features/async-tasks/infra/queue-events.ts`

**cache invalidation 模式**（lines 97-107）
```ts
function invalidateAsyncTaskCache(task: AsyncTaskRow) {
  updateTag(cacheTags.asyncTask(task.id));
  updateTag(cacheTags.asyncTaskList(task.actorId));
  updateTag(cacheTags.asyncTaskEntity(task.entityType, task.entityId));
```

**recovery posture 构造模式**（lines 109-125）
```ts
function buildRecoveryPosture(input: { posture: string; queueName: string; ... }) {
  return {
    posture: input.posture,
    queueName: input.queueName,
    updatedAt: new Date().toISOString(),
    instanceId: getBullmqInstanceId(),
  } satisfies RecoveryPosture;
}
```

**事件投影 + append-only event 模式**（lines 390-449）
```ts
const [updatedTask] = await db.transaction(async (tx) => {
  const [nextTask] = await tx.update(asyncTasks).set({ ... }).returning();
  await tx.insert(asyncTaskEvents).values(eventRow);
  return [nextTask];
});

invalidateAsyncTaskCache(updatedTask);
```

**说明**
- 若 retry 成功后的后续 QueueEvents 需要区分 operator-triggered recovery，应在这里沿用现有 projection 模式追加 event，不要另起第二套 projector。

---

### `src/db/schema.ts`（heartbeat / operator read model 持久化）

**Analog:** `src/db/schema.ts` `asyncTasks` / `asyncTaskEvents`（lines 258-367）

**SQLite table + index 模式**
```ts
export const asyncTasks = sqliteTable(
  "asyncTask",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    ...
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    index("asyncTasks_school_status_idx").on(table.schoolId, table.status),
  ]
);
```

**说明**
- 若增加 worker heartbeat truth，表结构、`timestamp_ms`、`crypto.randomUUID()`、`index(...)` 风格都应跟 schema 现有写法一致。
- 所有关联继续 `onDelete: cascade`。

---

### `src/lib/cache-policy.ts`（operator cache tags）

**Analog:** `src/lib/cache-policy.ts`

**tag factory 模式**（lines 24-34）
```ts
courseImportBatch: (batchId: string) => `course:import-batch:${batchId}`,
courseImportSchool: (schoolId: string) => `course:import-school:${schoolId}`,
asyncTask: (taskId: string) => `async-task:${taskId}`,
asyncTaskList: (actorId: string) => `async-task-list:${actorId}`,
asyncTaskEntity: (entityType: string, entityId: string) => `async-task-entity:${entityType}:${entityId}`,
```

**说明**
- Phase 42 需要新增 operator overview / school operator list / worker health tags 时，直接沿用这里的纯函数工厂命名风格。

---

### `scripts/verify-phase42-operator-recovery.ts`（verifier 脚本）

**Analog:** `scripts/verify-phase41-batch-import.ts`、`scripts/verify-phase39-async-tasks.ts`

**静态检查骨架**（`verify-phase41-batch-import.ts` lines 5-83, 94-154）
```ts
type StaticCheck = {
  label: string;
  passed: boolean;
};

function read(filePath: string) {
  return existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
}

const staticChecks: StaticCheck[] = [ ... ];
const failedChecks = staticChecks.filter((check) => !check.passed);
```

**聚焦 typecheck / vitest 模式**（`verify-phase39-async-tasks.ts` lines 38-103）
```ts
function runPhase39Typecheck() { ... }
function runVitest(paths: readonly string[], label: string) { ... }
```

**说明**
- Phase 42 verifier 应继续以 source-based static checks + focused suites 为主。
- 重点检查：route 存在、surface 不直连 BullMQ、action 有 updateTag、registry 含 recovery metadata、detail 首页信息层级 token 存在。

---

### `package.json`（verify script 注册）

**Analog:** `package.json`（lines 45-47）
```json
"verify:phase39": "node --import tsx scripts/verify-phase39-async-tasks.ts",
"verify:phase41": "node --import tsx scripts/verify-phase41-batch-import.ts",
"verify:theme-default-regression": "tsx scripts/verify-theme-default-regression.ts"
```

**说明**
- 新脚本命名保持 `verify:phase42` → `node --import tsx scripts/verify-phase42-operator-recovery.ts`。

## Shared Patterns

### 权限范围解析
**Source:** `src/lib/dal/runtime-inspector.ts` lines 37-69
**Apply to:** `src/lib/dal/async-task-operator.ts`, `src/features/async-tasks/server/recovery.ts`
```ts
const memberships = await getUserMembershipsDTO(user.id);
const activeMemberships = memberships.filter((membership) => membership.status === "active");
const activeSchoolIds = [...new Set(activeMemberships.map((membership) => membership.schoolId))];
```

### DAL/DTO 读取边界
**Source:** `src/lib/dal/async-tasks.ts` lines 43-108
**Apply to:** 所有 operator overview/detail 读取
```ts
"use cache";
cacheLife("minutes");
cacheTag(cacheTags.asyncTask(input.taskId));
return AsyncTaskDetailDTOSchema.parse(...);
```

### Action 错误包装
**Source:** `src/features/schedule/reminders/actions.ts` lines 10-24, 43-50
**Apply to:** `src/actions/async-task-operator-actions.ts`
```ts
type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; message: string; issues?: unknown[] };
```

### 写后立即失效
**Source:** `src/actions/course-import-actions.ts` lines 54-65、`src/features/async-tasks/infra/queue-events.ts` lines 97-107
**Apply to:** retry action、recovery projection、operator overview/detail refresh
```ts
updateTag(cacheTags.asyncTask(taskId));
updateTag(cacheTags.asyncTaskEntity(entityType, entityId));
```

### append-only event 审计
**Source:** `src/features/async-tasks/infra/queue-events.ts` lines 429-443
**Apply to:** operator recovery event、retry failed event、heartbeat anomaly event（若实现）
```ts
await tx.insert(asyncTaskEvents).values({
  taskId: task.id,
  eventType: projection.eventType,
  status: projection.status,
  attemptNumber: ...,
  payloadJson: { ... },
  createdAt: now,
});
```

### surface 信息层级
**Source:** `src/components/surfaces/runtime-inspector-surface.tsx` lines 29-75, `src/components/surfaces/course-import-review-surface.tsx` lines 145-204
**Apply to:** overview/detail 两个 operator surfaces
```tsx
Hero / summary cards / alert card 在前；timeline 作为下半区辅助审计。
```

## No Analog Found

无完全空白领域；Phase 42 的目标文件都能在现有 settings/operator/async-task/retry/verifier 代码中找到足够近的 analog。真正缺的是“组合方式”，不是基础模式。

## Metadata

**Analog search scope:** `src/components/surfaces`, `src/app/settings/labs`, `src/lib/dal`, `src/lib/dto`, `src/actions`, `src/features/async-tasks`, `src/features/schedule/reminders`, `src/db`, `scripts`

**Files scanned:** 20+

**Pattern extraction date:** 2026-05-19
