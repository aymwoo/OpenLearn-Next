# Phase 50: Boundary Freeze & Platform Vocabulary - Pattern Map

**Mapped:** 2026-05-21
**Files analyzed:** 8
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/actions/plugin-actions.ts` | route | request-response | `src/actions/plugin-actions.ts` | exact |
| `src/lib/dal/plugins.ts` | service | CRUD | `src/lib/dal/plugins.ts` | exact |
| `src/server/plugins/registry.ts` | service | transform | `src/server/plugins/registry.ts` | exact |
| `src/features/runtime-platform/seams/event-bus/contract.ts` | config | event-driven | `src/features/runtime-platform/seams/event-bus/contract.ts` | exact |
| `src/features/runtime-platform/seams/event-bus/default-adapter.ts` | service | event-driven | `src/features/runtime-platform/seams/event-bus/default-adapter.ts` | exact |
| `src/features/async-tasks/server/registry.ts` | config | batch | `src/features/async-tasks/server/registry.ts` | exact |
| `src/features/async-tasks/server/enqueue.ts` | service | batch | `src/features/async-tasks/server/enqueue.ts` | exact |
| `src/features/platform-core/contracts.ts` *(optional new anchor)* | config | transform | `src/features/runtime-platform/contracts/descriptors.ts` | partial |

## Pattern Assignments

### `src/actions/plugin-actions.ts` (route, request-response)

**Analog:** `src/actions/plugin-actions.ts`

**Imports + entrypoint posture** (lines 1-19):
```typescript
"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { getCurrentUserDTO } from "@/lib/dal/auth";
import {
  getPluginForSchool,
  listPluginsForSchool,
  preflightUninstallPlugin,
  registerPluginManifest,
  runPluginHook,
  setPluginEnabled,
  setPluginKillSwitch,
  transitionPluginLifecycle,
  uninstallPlugin,
} from "@/lib/dal/plugins";
```

**Auth helper pattern** (lines 61-76):
```typescript
function getPluginActionError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

async function requireCurrentActorId() {
  const user = await getCurrentUserDTO();
  if (!user?.id) {
    throw new Error("AUTH_REQUIRED");
  }

  return user.id;
}
```

**Mutation producer + invalidation stays at entrypoint** (lines 114-126):
```typescript
export async function transitionPluginLifecycleAction(data: z.infer<typeof TransitionPluginLifecycleSchema>) {
  const parsed = TransitionPluginLifecycleSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const actorId = await requireCurrentActorId();
    const result = await transitionPluginLifecycle({ ...parsed.data, actorId });
    updateTag(cacheTags.pluginRegistry);
    updateTag(cacheTags.plugin(parsed.data.pluginId));
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: getPluginActionError(error, "PLUGIN_LIFECYCLE_TRANSITION_FAILED") };
  }
}
```

**Phase-50 copy note:** 只复制“Zod parse -> require actor -> call DAL -> `updateTag()` -> normalized error”的 producer 外形；不要在本阶段把 command bus 真正下沉进这里。

---

### `src/lib/dal/plugins.ts` (service, CRUD)

**Analog:** `src/lib/dal/plugins.ts`

**Imports + DAL boundary** (lines 1-22):
```typescript
import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  governanceAudits,
  pluginActionAudits,
  pluginHookRuns,
  pluginLifecycleTransitions,
  pluginRegistrations,
} from "@/db/schema";
import type { PluginLifecycleState, RuntimeActorScope } from "@/features/runtime-platform/contracts/permissions";
```

**Domain helper / DTO shaping pattern** (lines 138-157):
```typescript
function toPluginDTO(record: typeof pluginRegistrations.$inferSelect): PluginRegistrationDTO {
  const manifest = PluginManifestSchema.parse(record.manifestJson);

  return PluginRegistrationDTOSchema.parse({
    id: record.id,
    schoolId: record.schoolId,
    name: record.name,
    manifestJson: manifest,
    pluginKey: record.pluginKey,
    dbNamespace: record.dbNamespace,
    sourceType: record.sourceType,
    installSource: record.installSource,
    enabled: record.enabled,
    killSwitchEnabled: record.killSwitchEnabled,
    lifecycleState: record.lifecycleState,
  });
}
```

**Install/reconcile truth seam** (lines 299-409):
```typescript
export async function installOrReconcilePlugin(input: InstallOrReconcilePluginInput) {
  await assertTeacherManagerScope({ actorId: input.actorId, schoolId: input.schoolId });

  const parsedManifest = PluginManifestSchema.parse(input.manifestJson);
  const pluginKey = parsedManifest.id;
  const derivedNamespace = deriveDbNamespace(pluginKey);
  // ... conflict checks + update-in-place semantics ...

  const [record] = await db
    .insert(pluginRegistrations)
    .values({
      schoolId: input.schoolId,
      name: input.name,
      manifestJson: parsedManifest,
      pluginKey,
      dbNamespace: derivedNamespace,
      sourceType,
      installSource: input.installSource,
      enabled,
      killSwitchEnabled,
      lifecycleState,
    })
    .returning();
```

**Transactional mutation + append-only audit pattern** (lines 607-673):
```typescript
const [record] = await db.transaction(async (tx) => {
  const [updated] = await tx
    .update(pluginRegistrations)
    .set({
      lifecycleState: input.targetState,
      enabled: isRunnablePluginState(input.targetState),
      killSwitchEnabled: input.targetState === "suspended",
      updatedAt: new Date(),
    })
    .where(and(eq(pluginRegistrations.id, input.pluginId), eq(pluginRegistrations.schoolId, input.schoolId)))
    .returning();

  await tx.insert(pluginLifecycleTransitions).values({
    pluginId: plugin.id,
    actorId: input.actorId,
    fromState: plugin.lifecycleState,
    toState: input.targetState,
    reason: input.reason,
  });
```

**Phase-50 copy note:** `plugins.ts` 现在是“真实领域持久化 + 审计 + lifecycle append”样板；Phase 50 只能把它重新标注为 plugin domain DAL，不要继续往里长 platform authority。

---

### `src/server/plugins/registry.ts` (service, transform)

**Analog:** `src/server/plugins/registry.ts`

**Static catalog constants** (lines 13-33):
```typescript
export const PLUGIN_HOOK_ANCHORS = ["dashboard.widget", "lesson.sidebar", "schedule.assistant"] as const;
export const PLUGIN_ACTION_ALLOWLIST = [
  "addStepSuggestion",
  "annotateLesson",
  "createNotificationStub",
  "suggestBuiltInTeachingStep",
  "insertBuiltInTeachingStepTemplate",
] as const;
export const PLUGIN_ACTION_PERMISSION_REQUIREMENTS = {
  addStepSuggestion: "lesson:write:suggestion",
  annotateLesson: "lesson:write:annotation",
  createNotificationStub: "notification:create:stub",
} as const;
```

**Controlled resolution helper** (lines 49-72):
```typescript
function resolveBuiltInTeachingStep(input: PluginActionInput) {
  const pluginKey = typeof input.payload.pluginKey === "string" ? input.payload.pluginKey : null;
  if (pluginKey) {
    const resolved = BUILT_IN_TEACHING_STEP_BY_KEY.get(pluginKey as any);
    if (resolved) {
      return resolved;
    }
  }
  // builtInKey fallback, then display-name fallback
}
```

**Static dispatch switch pattern** (lines 74-127):
```typescript
export function dispatchPluginAction(input: PluginActionInput): PluginActionResult {
  switch (input.action) {
    case "addStepSuggestion":
      return { proposalType: "stepSuggestion", payload: input.payload };
    case "annotateLesson":
      return { proposalType: "lessonAnnotation", payload: input.payload };
    default:
      return { proposalType: "unknown", payload: input.payload, denied: true };
  }
}
```

**Phase-50 copy note:** 这是“受控实现目录 / static implementation catalog”样板。可加 ownership 注释或 TODO anchor，但不要在这里实现 dynamic discoverability、lifecycle gating、conflict authority。

---

### `src/features/runtime-platform/seams/event-bus/contract.ts` (config, event-driven)

**Analog:** `src/features/runtime-platform/seams/event-bus/contract.ts`

**Ownership contract schema** (lines 3-34):
```typescript
export const RuntimeEventBusDeliverySchema = z.enum(["in-process", "redis-streams"]);

export const RuntimeEventBusOwnershipSchema = z.object({
  sourceOfTruth: z.literal("classroom-session-write-path"),
  delivery: RuntimeEventBusDeliverySchema,
  posture: z.literal("default-only"),
  notes: z.array(z.string()).default([]),
});

export interface RuntimeEventBusAdapter {
  readonly id: string;
  readonly ownership: RuntimeEventBusOwnership;
  describeOwnership(): RuntimeEventBusOwnership;
  publish(event: RuntimeEventEnvelope): Promise<void>;
  subscribe(topic: string, handler: RuntimeEventHandler): () => void;
}
```

**Phase-50 copy note:** 如果 planner 要新增 `src/features/platform-core/contracts.ts`，最应该复制的是这种 “Zod schema + literal ownership posture + exported type/interface” 写法，而不是复制 runtime 行为本身。

---

### `src/features/runtime-platform/seams/event-bus/default-adapter.ts` (service, event-driven)

**Analog:** `src/features/runtime-platform/seams/event-bus/default-adapter.ts`

**Frozen ownership instance** (lines 10-18):
```typescript
const ownership: RuntimeEventBusOwnership = RuntimeEventBusOwnershipSchema.parse({
  sourceOfTruth: "classroom-session-write-path",
  delivery: "in-process",
  posture: "default-only",
  notes: [
    "Event delivery is in-process only for Phase 27.",
    "Publishing does not move truth ownership away from the SQLite-backed classroom/session path.",
  ],
});
```

**Minimal adapter implementation** (lines 20-58):
```typescript
class DefaultRuntimeEventBusAdapter implements RuntimeEventBusAdapter {
  readonly id = "event-bus-default-adapter";
  readonly ownership = ownership;
  private readonly subscribers = new Map<string, Set<RuntimeEventHandler>>();

  describeOwnership(): RuntimeEventBusOwnership {
    return this.ownership;
  }

  async publish(event: RuntimeEventEnvelope): Promise<void> {
    const parsed = RuntimeEventEnvelopeSchema.parse(event);
    const handlers = this.subscribers.get(parsed.topic);
    if (!handlers || handlers.size === 0) return;
    await Promise.all([...handlers].map((handler) => handler(parsed)));
  }
}
```

**Phase-50 copy note:** 对 runtime-only posture 的“事实冻结”最好直接复用这种 top-level `ownership` 常量 + `describeOwnership()` 模式；不要重命名成 platform event truth。

---

### `src/features/async-tasks/server/registry.ts` (config, batch)

**Analog:** `src/features/async-tasks/server/registry.ts`

**Typed definition factory** (lines 64-86):
```typescript
export function createAsyncTaskDefinition<
  PayloadSchema extends z.ZodTypeAny,
  ProgressSchema extends z.ZodTypeAny,
  ResultSchema extends z.ZodTypeAny,
>(
  input: AsyncTaskDefinitionInput<PayloadSchema, ProgressSchema, ResultSchema>,
): AsyncTaskDefinition<PayloadSchema, ProgressSchema, ResultSchema> {
  const { payloadSchema, progressSchema, resultSchema, operatorRecovery, ...metadata } = input;
  return {
    ...AsyncTaskDefinitionMetadataSchema.parse(metadata),
    operatorRecovery: AsyncTaskOperatorRecoveryMetadataSchema.parse(operatorRecovery ?? {}),
    payloadSchema,
    progressSchema,
    resultSchema,
  };
}
```

**Task semantics example** (lines 193-223):
```typescript
export const classroomSessionSummaryTaskDefinition = createAsyncTaskDefinition({
  taskType: "classroom.session_summary",
  featureArea: "runtime",
  visibilityScope: "school_operator",
  entityRefKind: "classroom_session",
  labelKey: "asyncTasks.classroom.sessionSummary.label",
  summaryKey: "asyncTasks.classroom.sessionSummary.summary",
  payloadSchema: ClassroomSessionSummaryTaskPayloadSchema,
  progressSchema: AsyncTaskProgressSnapshotSchema,
  resultSchema: ClassroomSessionSummaryTaskResultSchema,
  reliability: {
    queueName: "classroom-summary",
    attempts: 3,
    idempotency: { strategy: "task_id" },
  },
});
```

**Registry export pattern** (lines 257-265):
```typescript
export const asyncTaskRegistry = {
  [platformHealthCheckTaskDefinition.taskType]: platformHealthCheckTaskDefinition,
  [courseImportApplyBatchTaskDefinition.taskType]: courseImportApplyBatchTaskDefinition,
  [scheduleReminderDeliveryTaskDefinition.taskType]: scheduleReminderDeliveryTaskDefinition,
  [classroomSessionSummaryTaskDefinition.taskType]: classroomSessionSummaryTaskDefinition,
} satisfies Record<string, AsyncTaskDefinition>;
```

**Phase-50 copy note:** 这就是“task = deferred execution/orchestration unit”的现成样板。可在注释里引用，不要把 task registry 重新叙述成 command registry。

---

### `src/features/async-tasks/server/enqueue.ts` (service, batch)

**Analog:** `src/features/async-tasks/server/enqueue.ts`

**Persist-first then orchestrate** (lines 32-117):
```typescript
export async function enqueueAsyncTask(input: EnqueueAsyncTaskInput) {
  const definition = asyncTaskRegistry[input.taskType];
  if (!definition) {
    throw new Error("ASYNC_TASK_TYPE_NOT_FOUND");
  }

  const payload = definition.payloadSchema.parse(input.payload);
  const [task] = await db
    .insert(asyncTasks)
    .values({
      actorId: input.actorId,
      schoolId: input.schoolId,
      taskType: definition.taskType,
      status: input.dispatchFailureReason ? "dispatch_failed" : initialStatus,
      payloadJson: payload,
    })
    .returning();
```

**Queue dispatch as secondary substrate** (lines 122-180):
```typescript
if (input.dispatchRequested && !input.dispatchFailureReason) {
  const queue = await getAsyncTaskQueue(input.taskType);
  const dispatchOptions = buildAsyncTaskJobOptions({
    taskId: task.id,
    taskType: definition.taskType,
    reliability: definition.reliability,
  });
  const job = await queue.add(definition.taskType, payload, dispatchOptions);

  const [updatedTask] = await db
    .update(asyncTasks)
    .set({
      queueJobId: job.id,
      status: "queued",
      enqueueIntentStatus: "dispatched",
    })
    .where(eq(asyncTasks.id, task.id))
    .returning();
}
```

**Phase-50 copy note:** 这是“truth 在 SQLite，queue 只是 orchestration substrate”的最强类比。Platform boundary 文档可直接引用这层分离。

---

### `src/features/platform-core/contracts.ts` *(optional new anchor)* (config, transform)

**Primary analog:** `src/features/runtime-platform/contracts/descriptors.ts`

**Supporting analog:** `src/features/runtime-platform/contracts/index.ts`

**Schema + exported types pattern** (from `descriptors.ts` lines 102-117):
```typescript
export const PluginLifecycleOwnershipSchema = z.object({
  ownerType: z.enum(["host", "plugin-manager", "school-admin"]),
  installScope: z.enum(["global", "school"]),
  lifecycleState: PluginLifecycleStateSchema,
});

export type PluginLifecycleOwnership = z.infer<typeof PluginLifecycleOwnershipSchema>;
```

**Barrel export pattern** (from `index.ts` lines 1-11):
```typescript
export * from "./bridge";
export * from "./events";
export * from "./permissions";
export * from "./descriptors";

export * as bridge from "./bridge";
export * as events from "./events";
```

**Recommended Phase-50 posture:** 如果 planner 认为 BOUND-02 需要代码证据，优先做 type-only / comment-only anchor，例如：
- `PlatformOwnershipVocabularySchema`
- `PlatformCommandBoundarySchema`
- `PlatformAuthorityNotes`（字符串数组 / 注释）

不要在这个文件里实现 dispatch、registry conflict logic、outbox writes 或 lifecycle orchestrator。

---

## Shared Patterns

### 1. Producer keeps validation, auth, and cache invalidation
**Source:** `src/actions/plugin-actions.ts` lines 69-76, 114-126
**Apply to:** 所有现有入口文件（Server Actions / future plugin host adapters / async processor adapters）
```typescript
async function requireCurrentActorId() {
  const user = await getCurrentUserDTO();
  if (!user?.id) {
    throw new Error("AUTH_REQUIRED");
  }
  return user.id;
}

const result = await transitionPluginLifecycle({ ...parsed.data, actorId });
updateTag(cacheTags.pluginRegistry);
updateTag(cacheTags.plugin(parsed.data.pluginId));
```

### 2. Ownership contracts use Zod literals + explicit posture notes
**Source:** `src/features/runtime-platform/seams/event-bus/contract.ts` lines 17-22; `src/features/runtime-platform/seams/event-bus/default-adapter.ts` lines 10-18; `src/features/runtime-platform/seams/transport/contract.ts` lines 76-81
**Apply to:** runtime-only comments, optional `platform-core` anchor file, authority/vocabulary freeze artifacts
```typescript
export const RuntimeEventBusOwnershipSchema = z.object({
  sourceOfTruth: z.literal("classroom-session-write-path"),
  delivery: RuntimeEventBusDeliverySchema,
  posture: z.literal("default-only"),
  notes: z.array(z.string()).default([]),
});
```

### 3. Durable truth first, delivery/orchestration second
**Source:** `src/features/async-tasks/server/enqueue.ts` lines 52-91, 122-180; `src/features/runtime-platform/seams/event-bus/default-adapter.ts` lines 14-17
**Apply to:** BOUND-03 wording, async/runtime ownership comments, future command/event planning notes
```typescript
const [task] = await db.insert(asyncTasks).values({
  actorId: input.actorId,
  schoolId: input.schoolId,
  taskType: definition.taskType,
  payloadJson: payload,
}).returning();

const job = await queue.add(definition.taskType, payload, dispatchOptions);
```

### 4. Static catalog is separate from dynamic authority
**Source:** `src/server/plugins/registry.ts` lines 13-33, 74-127
**Apply to:** `src/server/plugins/registry.ts` comments and any platform-core docs that distinguish `action` vs implementation catalog
```typescript
export const PLUGIN_ACTION_ALLOWLIST = [
  "addStepSuggestion",
  "annotateLesson",
  "createNotificationStub",
] as const;

export function dispatchPluginAction(input: PluginActionInput): PluginActionResult {
  switch (input.action) {
    case "addStepSuggestion":
      return { proposalType: "stepSuggestion", payload: input.payload };
    default:
      return { proposalType: "unknown", payload: input.payload, denied: true };
  }
}
```

### 5. Existing SQLite truth anchors should be cited, not redefined
**Source:** `src/db/schema.ts` lines 859-887, 1089-1122
**Apply to:** ownership map docs, canonical truth section, deferred wall rationale
```typescript
export const runtimeEventOutbox = sqliteTable("runtimeEventOutbox", {
  runtimeSessionId: text("runtimeSessionId").notNull(),
  classroomSessionId: text("classroomSessionId").notNull(),
  eventType: text("eventType").notNull(),
  deliveryStatus: text("deliveryStatus", { enum: ["pending", "sent", "failed"] }).notNull().default("pending"),
});

export const pluginRegistrations = sqliteTable("pluginRegistration", {
  schoolId: text("schoolId").notNull(),
  pluginKey: text("pluginKey").notNull(),
  dbNamespace: text("dbNamespace").notNull(),
  lifecycleState: text("lifecycleState", { enum: ["installed", "enabled", "mounted", "ready", "suspended", "disabled", "failed"] }).notNull().default("installed"),
});
```

## No Analog Found

None. `src/features/platform-core/` 尚不存在，但 `runtime-platform` contracts/seams 已提供足够强的 partial analog，可供 planner 复制“contract-only anchor”写法。

## Metadata

**Analog search scope:** `src/actions`, `src/lib/dal`, `src/server/plugins`, `src/features/runtime-platform`, `src/features/async-tasks`, `src/db`, `.planning/phases/44-*`, `.planning/phases/43-*`
**Files scanned:** 13
**Pattern extraction date:** 2026-05-21
