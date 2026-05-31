# Phase 51: Command Bus Foundation - Pattern Map

**Mapped:** 2026-05-21
**Files analyzed:** 17
**Analogs found:** 17 / 17

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/features/platform-core/commands/contracts.ts` | utility | request-response | `src/features/platform-core/contracts.ts` | role-match |
| `src/features/platform-core/commands/bus.ts` | service | request-response | `src/features/async-tasks/server/enqueue.ts` | data-flow-match |
| `src/features/platform-core/commands/registry.ts` | config | request-response | `src/features/async-tasks/server/registry.ts` | exact |
| `src/features/platform-core/commands/handlers/plugins.ts` | service | CRUD | `src/lib/dal/plugins.ts` | role-match |
| `src/features/platform-core/commands/producers/plugin-governance.ts` | utility | request-response | `src/actions/plugin-actions.ts` | role-match |
| `src/features/platform-core/index.ts` | barrel | module export | `src/features/platform-core/index.ts` | exact |
| `src/actions/plugin-actions.ts` | controller | request-response | `src/actions/plugin-actions.ts` | exact |
| `src/features/runtime-platform/host-actions/plugin-host.ts` | middleware | request-response | `src/features/runtime-platform/host-actions/plugin-host.ts` | exact |
| `src/db/schema.ts` | model | CRUD | `src/db/schema.ts` | exact |
| `src/features/platform-core/commands/bus.test.ts` | test | request-response | `src/features/runtime-platform/host-actions/guards.test.ts` | role-match |
| `src/actions/plugin-actions.test.ts` | test | request-response | `src/actions/plugin-actions.test.ts` | exact |
| `src/features/platform-core/commands/handlers/plugins.test.ts` | test | CRUD | `src/lib/dal/plugins.test.ts` | role-match |
| `src/features/runtime-platform/host-actions/plugin-host.test.ts` | test | request-response | `src/features/runtime-platform/host-actions/guards.test.ts` | role-match |
| `src/lib/dal/plugins.test.ts` | test | CRUD | `src/lib/dal/plugins.test.ts` | exact |
| `scripts/bootstrap-dev-db.ts` | script | bootstrap / request-response | `scripts/bootstrap-dev-db.ts` | exact |
| `scripts/prepare-dev-db.ts` | script | migration bridge | `scripts/prepare-dev-db.ts` | exact |
| `scripts/verify-phase51-command-bus.ts` | script | static verification | `scripts/verify-phase44-plugin-identity.ts` | role-match |
| `package.json` | config | verifier entrypoint | `package.json` | exact |
| `drizzle/0013_phase51_command_bus_foundation.sql` | migration | schema evolution | `drizzle/0011_phase44_plugin_identity_namespace.sql` | role-match |
| `drizzle/meta/0013_snapshot.json` | migration metadata | schema snapshot | `drizzle/meta/0011_snapshot.json` | exact |

## Producer Search Evidence

Repo-wide code search during Phase 51 planning found the current plugin governance mutation entrypoints at:

- `src/actions/plugin-actions.ts` — direct mutation Server Action seam. `[VERIFIED: grep installOrReconcilePlugin|registerPluginManifest|setPluginEnabled|transitionPluginLifecycle|setPluginKillSwitch|preflightUninstallPlugin|uninstallPlugin]`
- `scripts/bootstrap-dev-db.ts` — real non-UI plugin install/reconcile producer seam. `[VERIFIED: grep installOrReconcilePlugin scripts/bootstrap-dev-db.ts]`
- `src/features/runtime-platform/host-actions/plugin-host.ts` — host action surface exists today, but governance mutation actions have not yet been wired and must be made explicit in `51-03`. `[VERIFIED: grep publish-event|read-lifecycle src/features/runtime-platform/host-actions/plugin-host.ts]`

Repo-wide code search did **not** find any current worker / async producer that dispatches plugin governance mutations directly. This absence must be recorded in planning and guarded by `scripts/verify-phase51-command-bus.ts` so future producers cannot quietly bypass the shared seam. `[VERIFIED: grep installOrReconcilePlugin|setPluginEnabled|transitionPluginLifecycle|setPluginKillSwitch|preflightUninstallPlugin|uninstallPlugin scripts src]`

## Pattern Assignments

### `src/features/platform-core/commands/contracts.ts` (utility, request-response)

**Analog:** `src/features/platform-core/contracts.ts`

**Imports + contract enums** (`src/features/platform-core/contracts.ts:1-17`):
```ts
import { z } from "zod";

export const PlatformAuthorityAreaSchema = z.enum([
  "command_execution",
  "action_registry",
  "plugin_lifecycle_orchestration",
  "platform_event_outbox",
]);

export const PlatformLegacySeamPostureSchema = z.enum([
  "future_command_producer_adapter",
  "plugin_domain_dal",
  "static_implementation_catalog",
  "runtime_transport_only",
  "runtime_durable_anchor_only",
]);
```

**Notes/anchor style** (`src/features/platform-core/contracts.ts:18-22`):
```ts
export const PLATFORM_CORE_AUTHORITY_NOTES = [
  "Phase 50 boundary freeze: platform-core is the authoritative orchestration layer for v3.0 phase 1.",
  "Authority naming parity follows .planning/phases/50-boundary-freeze-and-platform-vocabulary/50-OWNERSHIP-MAP.md.",
  "This anchor is contract-only: no dispatch, handler registry, outbox write, or lifecycle orchestration implementation belongs here.",
] as const;
```

**Copy:** `z.enum(...)` + exported note constants + `z.infer` types. Keep this file contract-only.

---

### `src/features/platform-core/commands/bus.ts` (service, request-response)

**Analog:** `src/features/async-tasks/server/enqueue.ts` (primary) + `src/features/async-tasks/server/recovery.ts` (retry/attempt history)

**Service imports + server-only posture** (`src/features/async-tasks/server/enqueue.ts:1-13`):
```ts
import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { asyncTaskEvents, asyncTasks } from "@/db/schema";
import { AsyncTaskDetailDTOSchema, asyncTaskRegistry } from "@/features/async-tasks";
```

**Primary record write before orchestration** (`src/features/async-tasks/server/enqueue.ts:32-91`):
```ts
export async function enqueueAsyncTask(input: EnqueueAsyncTaskInput) {
  const definition = asyncTaskRegistry[input.taskType];

  if (!definition) {
    throw new Error("ASYNC_TASK_TYPE_NOT_FOUND");
  }

  const payload = definition.payloadSchema.parse(input.payload);
  ...
  const [task] = await db
    .insert(asyncTasks)
    .values({
      actorId: input.actorId,
      schoolId: input.schoolId,
      taskType: definition.taskType,
      ...
      payloadJson: payload,
    })
    .returning();
```

**Append history rows separately** (`src/features/async-tasks/server/enqueue.ts:93-117`):
```ts
  const eventRows: AsyncTaskEventInsert[] = [
    {
      taskId: task.id,
      eventType: "task.created",
      status: "pending_enqueue",
      payloadJson: {
        actorId: input.actorId,
        schoolId: input.schoolId,
        taskType: definition.taskType,
      },
    },
  ];

  const events = await db.insert(asyncTaskEvents).values(eventRows).returning();
```

**Retry = same record + new attempt** (`src/features/async-tasks/server/recovery.ts:93-174`):
```ts
  const previousAttemptNumber = task.latestAttemptNumber;
  const nextAttemptNumber = previousAttemptNumber + 1;

  const seededTaskRows = await db.transaction(async (tx) => {
    const updatedRows = await tx
      .update(asyncTasks)
      .set({
        status: "retrying",
        latestAttemptNumber: nextAttemptNumber,
        latestFailureReason: null,
      })
      ...

    await tx.insert(asyncTaskEvents).values([
      {
        taskId: task.id,
        eventType: "task.operator_recovery_requested",
        attemptNumber: previousAttemptNumber,
      },
      {
        taskId: task.id,
        eventType: "task.retry_seeded",
        attemptNumber: nextAttemptNumber,
      },
    ]);
  });
```

**Copy:** validate command type early, parse payload before write transaction, persist command row first-class, append attempt rows, and model retry as `same command + next attemptNumber`.

---

### `src/features/platform-core/commands/registry.ts` (config, request-response)

**Analog:** `src/features/async-tasks/server/registry.ts`

**Definition builder pattern** (`src/features/async-tasks/server/registry.ts:64-85`):
```ts
export function createAsyncTaskDefinition<...>(
  input: AsyncTaskDefinitionInput<PayloadSchema, ProgressSchema, ResultSchema>,
): AsyncTaskDefinition<PayloadSchema, ProgressSchema, ResultSchema> {
  const { payloadSchema, progressSchema, resultSchema, operatorRecovery, ...metadata } = input;

  if (!isZodSchema(payloadSchema) || !isZodSchema(progressSchema) || !isZodSchema(resultSchema)) {
    throw new Error(
      "Async task definitions require payloadSchema, progressSchema, and resultSchema.",
    );
  }

  return {
    ...AsyncTaskDefinitionMetadataSchema.parse(metadata),
    operatorRecovery: AsyncTaskOperatorRecoveryMetadataSchema.parse(operatorRecovery ?? {}),
    payloadSchema,
    progressSchema,
    resultSchema,
  };
}
```

**Registry map pattern** (`src/features/async-tasks/server/registry.ts:257-263`):
```ts
export const asyncTaskRegistry = {
  [platformHealthCheckTaskDefinition.taskType]: platformHealthCheckTaskDefinition,
  [courseImportApplyBatchTaskDefinition.taskType]: courseImportApplyBatchTaskDefinition,
  ...
} satisfies Record<string, AsyncTaskDefinition>;
```

**Copy:** expose a small `createPlatformCommandDefinition()` helper and a single explicit registry object keyed by command type.

---

### `src/features/platform-core/commands/handlers/plugins.ts` (service, CRUD)

**Analog:** `src/lib/dal/plugins.ts`

**Install wrapper stays thin** (`src/lib/dal/plugins.ts:464-468`):
```ts
export async function registerPluginManifest(input: RegisterPluginManifestInput) {
  return installOrReconcilePlugin({
    ...input,
    installSource: "manual",
  });
}
```

**Enable delegates to lifecycle transition and optional side effect** (`src/lib/dal/plugins.ts:471-504`):
```ts
export async function setPluginEnabled(input: SetPluginEnabledInput) {
  await assertTeacherManagerScope({ actorId: input.actorId, schoolId: input.schoolId });
  ...
  const result = await transitionPluginLifecycle({
    actorId: input.actorId,
    schoolId: input.schoolId,
    pluginId: input.pluginId,
    targetState: input.enabled ? "enabled" : "disabled",
    reason: input.enabled ? "enabled" : "disabled",
  });
  ...
}
```

**Lifecycle mutation uses one transaction + audits** (`src/lib/dal/plugins.ts:608-673`):
```ts
  const [record] = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(pluginRegistrations)
      .set({
        lifecycleState: input.targetState,
        enabled: isRunnablePluginState(input.targetState),
        killSwitchEnabled: input.targetState === "suspended",
      })
      .returning();

    await tx.insert(pluginLifecycleTransitions).values({
      pluginId: plugin.id,
      actorId: input.actorId,
      fromState: plugin.lifecycleState,
      toState: input.targetState,
      reason: input.reason,
    });

    await tx.insert(pluginActionAudits).values({
      pluginId: plugin.id,
      action: "plugin.lifecycle.transition",
      decision: "allowed",
      correlationId,
      payloadJson: { fromState: plugin.lifecycleState, toState: input.targetState, reason: input.reason },
      actorId: input.actorId,
    });
```

**Preflight read model** (`src/lib/dal/plugins.ts:679-749`):
```ts
export async function preflightUninstallPlugin(input: PluginBySchoolInput): Promise<PreflightUninstallPluginResult | null> {
  await assertTeacherManagerScope({ actorId: input.actorId, schoolId: input.schoolId });
  ...
  return {
    pluginId: plugin.id,
    schoolId: plugin.schoolId,
    blocked: false,
    reason: null,
    lessonExtCount,
    stepExtCount,
    resourceExtCount,
    ownedBusinessCount,
    totalCount: lessonExtCount + stepExtCount + resourceExtCount + ownedBusinessCount,
  };
}
```

**Uninstall transaction** (`src/lib/dal/plugins.ts:769-799`):
```ts
  const [record] = await db.transaction(async (tx) => {
    await tx.insert(governanceAudits).values({
      targetType: "plugin",
      targetId: plugin.id,
      action: "plugin.uninstall",
      decision: "allowed",
      correlationId,
    });

    const [deleted] = await tx
      .delete(pluginRegistrations)
      .where(and(eq(pluginRegistrations.id, input.pluginId), eq(pluginRegistrations.schoolId, input.schoolId)))
      .returning();

    return [deleted ?? null] as const;
  });
```

**Copy:** handlers should reuse DAL helpers, preserve teacher-scope assertions, and keep domain mutation + audit/ledger writes in one SQLite transaction.

---

### `src/lib/dal/plugins.ts` (service, CRUD)

**Analog:** `src/lib/dal/plugins.ts`

**Current mutation seam stays authoritative** (`src/lib/dal/plugins.ts:300-306,592-799`):
```ts
export async function installOrReconcilePlugin(input: InstallOrReconcilePluginInput) {
  ...
}

export async function transitionPluginLifecycle(input: TransitionPluginLifecycleInput) {
  ...
}
```

**Copy:** Phase 51 changes this file in place rather than replacing it. Keep plugin persistence and domain invariants in DAL, add tx-aware helper variants plus `commandId` attribution, and leave legacy exports as thin wrappers during producer migration.

---

### `src/features/platform-core/commands/producers/plugin-governance.ts` (utility, request-response)

**Analog:** `src/actions/plugin-actions.ts`

**Validation + shared auth helper** (`src/actions/plugin-actions.ts:22-77`):
```ts
const SetEnabledSchema = z.object({
  pluginId: z.string().min(1),
  schoolId: z.string().min(1),
  enabled: z.boolean(),
});

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

**Producer adapter call shape** (`src/actions/plugin-actions.ts:94-112`):
```ts
export async function setPluginEnabledAction(data: z.infer<typeof SetEnabledSchema>) {
  const parsed = SetEnabledSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const actorId = await requireCurrentActorId();
    const result = await setPluginEnabled({ ...parsed.data, actorId });
    updateTag(cacheTags.pluginRegistry);
    updateTag(cacheTags.plugin(parsed.data.pluginId));
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: getPluginActionError(error, "PLUGIN_SET_ENABLED_FAILED") };
  }
}
```

**Copy:** producer helper should keep `safeParse -> resolve actor -> dispatch -> normalized result/error`; do **not** put `updateTag()` in shared producer code if host/worker also consume it.

---

### `src/actions/plugin-actions.ts` (controller, request-response)

**Analog:** `src/actions/plugin-actions.ts`

**Imports + entrypoint posture** (`src/actions/plugin-actions.ts:1-21`):
```ts
"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { getCurrentUserDTO } from "@/lib/dal/auth";
import { ... } from "@/lib/dal/plugins";
import { cacheTags } from "@/lib/cache-policy";

// Phase 50 boundary freeze: Server Actions are future PlatformCommand producer adapters; keep updateTag() at the entrypoint.
```

**Mutation action pattern** (`src/actions/plugin-actions.ts:79-91`):
```ts
export async function registerPluginManifestAction(data: z.infer<typeof RegisterPluginSchema>) {
  const parsed = RegisterPluginSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  try {
    const actorId = await requireCurrentActorId();
    const result = await registerPluginManifest({ ...parsed.data, actorId });
    updateTag(cacheTags.pluginRegistry);
    updateTag(cacheTags.plugin(result.id));
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: getPluginActionError(error, "PLUGIN_REGISTER_FAILED") };
  }
}
```

**Delete/preflight split** (`src/actions/plugin-actions.ts:171-200`):
```ts
export async function deletePluginAction(data: z.infer<typeof PluginBySchoolSchema>) {
  ...
  const result = await uninstallPlugin({ ...parsed.data, actorId });
  updateTag(cacheTags.pluginRegistry);
  updateTag(cacheTags.plugin(parsed.data.pluginId));
  return { success: true, data: result };
}

export async function preflightUninstallPluginAction(data: z.infer<typeof PluginBySchoolSchema>) {
  ...
  const result = await preflightUninstallPlugin({ ...parsed.data, actorId });
  return { success: true, data: result };
}
```

**Copy:** keep server action as thin adapter; replace direct DAL imports with command producer/dispatch imports, but preserve `safeParse`, `AUTH_REQUIRED`, and `updateTag()` ownership.

---

### `src/features/platform-core/index.ts` (barrel, module export)

**Analog:** `src/features/platform-core/index.ts`

**Existing barrel posture** (`src/features/platform-core/index.ts:1`):
```ts
export * from "./contracts";
```

**Copy:** keep `platform-core` export surface minimal and explicit. Phase 51 should extend the barrel only enough to expose the new commands module without leaking internal-only implementation files accidentally.

---

### `src/features/runtime-platform/host-actions/plugin-host.ts` (middleware, request-response)

**Analog:** `src/features/runtime-platform/host-actions/plugin-host.ts`

**Guarded host action registration** (`src/features/runtime-platform/host-actions/plugin-host.ts:14-25`):
```ts
const PluginHostRequestSchema = z.object({
  sessionId: z.string().min(1),
  pluginId: z.string().min(1),
  action: z.enum(["publish-event", "read-lifecycle"]),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const invokePluginHostAction = createGuardedHostAction({
  inputSchema: PluginHostRequestSchema,
  actorScopes: ["plugin", "host", "system", "teacher"],
  requiredPermission: "host:plugin:lifecycle:read",
```

**Governance resolution before execute** (`src/features/runtime-platform/host-actions/plugin-host.ts:26-81`):
```ts
  resolveGovernance: async ({ actor, input, requiredPermission }) => {
    if (input.action === "read-lifecycle") {
      return createDeniedGovernanceDecision({
        action: input.action,
        actor,
        targetSchoolId: actor.schoolId,
        reason: "unsupported_action",
        requiredPermission: requiredPermission ?? null,
      });
    }

    const plugin = await getPluginForSchool({ actorId: actor.actorId, schoolId: actor.schoolId, pluginId: input.pluginId });
    ...
  },
```

**Execute switch shape** (`src/features/runtime-platform/host-actions/plugin-host.ts:82-111`):
```ts
  execute: async ({ actor, input }) => {
    switch (input.action) {
      case "publish-event": {
        await defaultRuntimeEventBusAdapter.publish({
          topic: `plugin:${input.pluginId}`,
          sessionId: input.sessionId,
          eventType: "plugin-host-action",
          payload: {
            actorId: actor.actorId,
            ...input.payload,
          },
        });
        break;
      }
```

**Copy:** for host producer migration, keep trusted actor resolution + governance deny reasons + explicit `switch` on action name.

---

### `src/db/schema.ts` (model, CRUD)

**Analog:** `src/db/schema.ts`

**Primary row + history row model** (`src/db/schema.ts:258-367`):
```ts
export const asyncTasks = sqliteTable(
  "asyncTask",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    actorId: text("actorId").notNull().references(() => users.id, { onDelete: "cascade" }),
    schoolId: text("schoolId").notNull().references(() => schools.id, { onDelete: "cascade" }),
    taskType: text("taskType").notNull(),
    ...
    latestAttemptNumber: integer("latestAttemptNumber").notNull().default(0),
    latestFailureReason: text("latestFailureReason"),
  },
  (table) => [
    index("asyncTasks_actor_status_idx").on(table.actorId, table.status),
    uniqueIndex("asyncTasks_queueJobId_unique").on(table.queueJobId),
  ]
);

export const asyncTaskEvents = sqliteTable(
  "asyncTaskEvent",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    taskId: text("taskId").notNull().references(() => asyncTasks.id, { onDelete: "cascade" }),
    eventType: text("eventType").notNull(),
    attemptNumber: integer("attemptNumber").notNull().default(0),
  },
```

**Plugin durability anchors** (`src/db/schema.ts:1110-1193`):
```ts
export const pluginLifecycleTransitions = sqliteTable("pluginLifecycleTransition", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  pluginId: text("pluginId").notNull().references(() => pluginRegistrations.id, { onDelete: "cascade" }),
  fromState: text("fromState", { enum: [...] }),
  toState: text("toState", { enum: [...] }).notNull(),
  reason: text("reason"),
  actorId: text("actorId").references(() => users.id, { onDelete: "cascade" }),
});

export const pluginActionAudits = sqliteTable("pluginActionAudit", {
  ...
  correlationId: text("correlationId"),
  payloadJson: text("payloadJson", { mode: "json" }).notNull(),
});

export const governanceAudits = sqliteTable("governanceAudit", {
  ...
  correlationId: text("correlationId").notNull(),
  payloadJson: text("payloadJson", { mode: "json" }).notNull(),
});
```

**Copy:** new command tables should follow `primary table + append-only attempt/history table`, use `crypto.randomUUID()`, JSON columns, indexes on status/createdAt, and `onDelete: "cascade"` foreign keys.

---

### `src/features/platform-core/commands/bus.test.ts` (test, request-response)

**Analog:** `src/features/runtime-platform/host-actions/guards.test.ts`

**Mock setup + helper factory** (`src/features/runtime-platform/host-actions/guards.test.ts:1-18,40-51`):
```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));
...

const guardedAction = createGuardedHostAction({
  inputSchema,
  actorScopes: ["teacher"],
  requiredPermission: "host:classroom:control",
  resolveActor: async () => teacherActor,
  execute: async ({ actor, input }) => ({ ok: true, actorId: actor.actorId, result: input.payload.result }),
});
```

**Negative/positive contract assertions** (`src/features/runtime-platform/host-actions/guards.test.ts:166-197`):
```ts
it("rejects dto parse failures before execution", async () => {
  await expect(guardedAction({ sessionId: "session-1", payload: { result: "" } })).rejects.toThrowError();
});

it("rejects governance-denied actions before execute", async () => {
  const governanceDeniedAction = createGuardedHostAction({ ... });
  await expect(governanceDeniedAction({ sessionId: "session-1", payload: { result: "ok" } }))
    .rejects.toThrowError("HOST_ACTION_DENIED:capability_missing");
});
```

**Copy:** bus tests should be helper-driven, assert validate/authorize/dispatch failure modes explicitly, and verify pipeline errors before handler execution.

---

### `src/actions/plugin-actions.test.ts` (test, request-response)

**Analog:** `src/actions/plugin-actions.test.ts`

**Module mock pattern** (`src/actions/plugin-actions.test.ts:5-31`):
```ts
const updateTag = vi.fn();
const getCurrentUserDTOMock = vi.fn();

const mockPluginDAL = vi.hoisted(() => ({
  registerPluginManifest: vi.fn(),
  setPluginEnabled: vi.fn(),
  transitionPluginLifecycle: vi.fn(),
  ...
}));

vi.mock("next/cache", () => ({ updateTag }));
vi.mock("@/lib/dal/auth", () => ({ getCurrentUserDTO: (...args: unknown[]) => getCurrentUserDTOMock(...args) }));
vi.mock("@/lib/dal/plugins", () => mockPluginDAL);
```

**Success assertions with invalidation** (`src/actions/plugin-actions.test.ts:84-113,155-171`):
```ts
expect(mockPluginDAL.registerPluginManifest).toHaveBeenCalledWith({
  schoolId: "school-1",
  name: "Test Plugin",
  manifestJson: mockManifest,
  actorId: "user-1",
});
expect(updateTag).toHaveBeenCalledWith("plugin:registry");
expect(updateTag).toHaveBeenCalledWith("plugin:plugin-1");
...
expect(updateTag).toHaveBeenCalledWith("theme:registry");
expect(updateTag).toHaveBeenCalledWith("theme:theme-1");
```

**Error-token assertions** (`src/actions/plugin-actions.test.ts:348-356`):
```ts
mockPluginDAL.uninstallPlugin.mockRejectedValueOnce(new Error("UNINSTALL_BLOCKED_DEFAULT_PLUGIN"));

const result = await deletePluginAction({ pluginId: "plugin-1", schoolId: "school-1" });

expect(result).toMatchObject({ success: false, error: "UNINSTALL_BLOCKED_DEFAULT_PLUGIN" });
```

**Copy:** keep action tests mock-heavy and assert both returned token and exact invalidation side effects.

---

### `src/features/platform-core/commands/handlers/plugins.test.ts` (test, CRUD)

**Analog:** `src/lib/dal/plugins.test.ts`

**Contract-heavy test posture** (`src/lib/dal/plugins.test.ts:222-228,618-713`):
```ts
it("centralizes plugin install and reconcile truth in one DAL seam", () => {
  expect(source).toContain("export async function installOrReconcilePlugin");
});

const { preflightUninstallPlugin, uninstallPlugin } = await import("./plugins");
```

**Copy:** handler tests should focus on explicit command-family coverage, same-command retry semantics, and blocked uninstall/lifecycle edge cases, while mocking DAL helpers instead of duplicating DAL behavior tests.

---

### `src/features/runtime-platform/host-actions/plugin-host.test.ts` (test, request-response)

**Analog:** `src/features/runtime-platform/host-actions/guards.test.ts`

**Guarded action test shape** (`src/features/runtime-platform/host-actions/guards.test.ts:166-197`):
```ts
it("rejects dto parse failures before execution", async () => {
  await expect(guardedAction({ sessionId: "session-1", payload: { result: "" } })).rejects.toThrowError();
});

it("rejects governance-denied actions before execute", async () => {
  ...
});
```

**Copy:** host tests should assert explicit governance command dispatch, invalidation-tag handling, and preserved deny-reason behavior using the existing guarded-host test style.

---

### `src/lib/dal/plugins.test.ts` (test, CRUD)

**Analog:** `src/lib/dal/plugins.test.ts`

**Source-as-contract assertions** (`src/lib/dal/plugins.test.ts:126-144,196-224`):
```ts
it("is server-only and exposes school-scoped lifecycle APIs", () => {
  expect(source.trimStart().startsWith('import "server-only";')).toBe(true);
  expect(source).toContain("export async function setPluginEnabled");
});

it("persists lifecycle transitions and governance audit metadata", () => {
  expect(source).toContain("pluginLifecycleTransitions");
  expect(source).toContain("governanceAudits");
  expect(source).toContain("correlationId");
});
```

**Mocked tx pattern** (`src/lib/dal/plugins.test.ts:101-124`):
```ts
transactionMock.mockImplementation(async (callback) => callback({
  insert: dbInsert,
  update: dbUpdate,
  delete: dbDelete,
}));
```

**Copy:** keep DAL tests source-aware and transaction-mock-heavy so Phase 51 can assert new `WithTx` helpers and `commandId` audit linkage without requiring a full DB integration suite for every edge case.

---

### `scripts/bootstrap-dev-db.ts` (script, bootstrap / request-response)

**Analog:** `scripts/bootstrap-dev-db.ts`

**Current bootstrap plugin seam** (`scripts/bootstrap-dev-db.ts:480-505`):
```ts
async function upsertBuiltInPlugins(schoolId: string, actorId: string) {
  for (const definition of BUILT_IN_PLUGIN_DEFINITIONS) {
    const manifest = PluginManifestSchema.parse(definition.manifest);
    await installOrReconcilePlugin({
      actorId,
      schoolId,
      name: definition.name,
      manifestJson: manifest,
      installSource: "bootstrap",
    });
  }
}
```

**Copy:** treat bootstrap as a real non-UI producer seam. Replace direct DAL mutation calls with one shared producer helper, but keep manifest parsing and bootstrap/seed install-source intent at the script edge.

---

### `scripts/prepare-dev-db.ts` (script, migration bridge)

**Analog:** `scripts/prepare-dev-db.ts`

**Schema-tag bridge pattern** (`scripts/prepare-dev-db.ts:67-120,253-258`):
```ts
async function detectExistingSchemaTag() {
  const hasPhase44PluginIdentityNamespaceSchema =
    hasPhase43KnowledgeChunkUniquenessSchema
    && await columnExists("pluginRegistration", "pluginKey")
    && await columnExists("pluginRegistration", "dbNamespace")
    && await indexExists("pluginRegistration_school_pluginKey_unique");
}

export async function prepareDevDb() {
  await bridgeExistingSchemaIfNeeded();
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
```

**Copy:** Phase 51 migration bridge should follow the same sentinel detection style: detect new command ledger tables/columns/indexes first, then sync `__drizzle_migrations` metadata before calling `migrate()`.

---

### `scripts/verify-phase51-command-bus.ts` (script, static verification)

**Analog:** `scripts/verify-phase44-plugin-identity.ts`

**Static drift guard pattern** (`scripts/verify-phase44-plugin-identity.ts:18-45,149-225`):
```ts
function read(filePath: string): string {
  const absolutePath = path.join(process.cwd(), filePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

function nonCommentIncludes(source: string, token: string): boolean {
  return withoutLineComments(source).includes(token);
}
```

**Copy:** build `verify:phase51` as a static-plus-focused-suite script: read source files directly, reject direct mutation DAL imports in migrated producers, assert explicit command names remain present, and encode the current code-search truth that bootstrap exists while worker/async governance producers do not.

---

### `package.json` (config, verifier entrypoint)

**Analog:** `package.json`

**Verifier script convention** (`package.json:45-57`):
```json
"verify:phase44": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase44-plugin-identity.ts",
"verify:phase48": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase48-lifecycle-and-uninstall.ts",
"db:migrate": "tsx scripts/prepare-dev-db.ts"
```

**Copy:** add `verify:phase51` using the same `node --require ./scripts/server-only-node-shim.cjs --import tsx ...` convention when the verifier reads server-only modules or DAL source.

---

### `drizzle/0013_phase51_command_bus_foundation.sql` (migration, schema evolution)

**Analog:** `drizzle/0011_phase44_plugin_identity_namespace.sql`

**Migration structure pattern** (`drizzle/0011_phase44_plugin_identity_namespace.sql:1-24`):
```sql
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_pluginRegistration` (
  `id` text PRIMARY KEY NOT NULL,
  ...
);
```

**Copy:** keep migration SQL explicit and SQLite-native: create or rebuild tables, add indexes, and include any one-time backfill needed for command/audit linkage in plain SQL rather than hiding it behind runtime-only repair code.

---

### `drizzle/meta/0013_snapshot.json` (migration metadata, schema snapshot)

**Analog:** `drizzle/meta/0011_snapshot.json`

**Snapshot metadata pattern** (`drizzle/meta/0011_snapshot.json:1-6`):
```json
{
  "version": "6",
  "dialect": "sqlite",
  "id": "3240f600-ee25-480e-be02-5c48212e4c6c",
  "prevId": "86ed0af5-4565-411e-a2fe-ece97b98dbef"
}
```

**Copy:** maintain normal Drizzle snapshot metadata generation so `prepare-dev-db.ts` and future schema bridging can reason about the Phase 51 migration as a first-class checkpoint.

## Shared Patterns

### Validation at the boundary
**Source:** `src/actions/plugin-actions.ts:22-60`, `src/actions/async-task-operator-actions.ts:13-17`
**Apply to:** all command producers and adapter entrypoints
```ts
const RetryAsyncTaskForOperatorInputSchema = z
  .object({ taskId: z.string().trim().min(1) })
  .strict();

const parsed = RetryAsyncTaskForOperatorInputSchema.safeParse(input);
if (!parsed.success) {
  return handleError(parsed.error);
}
```

### Trusted actor resolution before dispatch
**Source:** `src/actions/plugin-actions.ts:70-77`, `src/features/runtime-platform/host-actions/guards.ts:115-138`
**Apply to:** server action + host + worker producer adapters
```ts
async function requireCurrentActorId() {
  const user = await getCurrentUserDTO();
  if (!user?.id) {
    throw new Error("AUTH_REQUIRED");
  }
  return user.id;
}
```

```ts
export async function resolveTeacherHostActor(...) {
  const user = await getCurrentUserDTO();
  ...
  return SchoolScopedActorConstraintSchema.parse({
    actorId: user.id,
    schoolId: teacherMembership.schoolId,
    actorScope: "teacher",
    hostPermissions: [...new Set(grantedPermissions)],
  });
}
```

### Central authorize wrapper
**Source:** `src/features/runtime-platform/host-actions/guards.ts:203-233`
**Apply to:** bus authorize stage / host adapters
```ts
export function createGuardedHostAction<TInput extends z.ZodTypeAny, TOutput>({ ... }) {
  return async (input: z.input<TInput>) => {
    const parsedTrustedContext = GuardedHostActionContextSchema.parse({ actor: await resolveActor() });
    const parsedInput = inputSchema.parse(input);
    ...
    if (resolveGovernance) {
      const decision = await resolveGovernance({ actor: parsedActor, input: parsedInput, requiredPermission });
      assertGovernanceAllowed(decision);
    }
    return execute({ actor: parsedActor, input: parsedInput });
  };
}
```

### Durable main-row + attempt/history-row pattern
**Source:** `src/db/schema.ts:258-367`, `src/features/async-tasks/server/recovery.ts:93-174`
**Apply to:** command ledger + command attempts
```ts
latestAttemptNumber: integer("latestAttemptNumber").notNull().default(0)
```
```ts
await tx.insert(asyncTaskEvents).values([
  { taskId: task.id, eventType: "task.operator_recovery_requested", attemptNumber: previousAttemptNumber },
  { taskId: task.id, eventType: "task.retry_seeded", attemptNumber: nextAttemptNumber },
]);
```

### Dedupe helper pattern
**Source:** `src/features/async-tasks/shared/idempotency.ts:11-33`
**Apply to:** command dedupe key generation and producer-visible fallback keys
```ts
export function buildAsyncTaskJobId(input: AsyncTaskIdentityInput) {
  switch (input.reliability.idempotency?.strategy) {
    case "task_type_and_task_id":
      return `${input.taskType}:${input.taskId}`;
    case "task_id":
    default:
      return input.taskId;
  }
}
```

### Cache invalidation stays at adapter edge
**Source:** `src/actions/plugin-actions.ts:83-89`, `src/actions/async-task-operator-actions.ts:62-69`
**Apply to:** server actions only; bus should return invalidation intent, not call `next/cache`
```ts
const result = await retryAsyncTaskForOperator(parsed.data);
updateTag(cacheTags.asyncTask(result.taskId));
updateTag(cacheTags.asyncTaskEntity(result.entityType, result.entityId));
updateTag(cacheTags.asyncTaskList(result.actorId));
revalidatePath("/settings/labs/async-tasks");
```

### Static plugin catalog, not command authority
**Source:** `src/server/plugins/registry.ts:13-34,75-129`
**Apply to:** plugin command handlers that need implementation lookup after authorization
```ts
export const PLUGIN_ACTION_ALLOWLIST = [
  "addStepSuggestion",
  "annotateLesson",
  ...
] as const;

export function dispatchPluginAction(input: PluginActionInput): PluginActionResult {
  switch (input.action) {
    case "addStepSuggestion":
      return { proposalType: "stepSuggestion", payload: input.payload };
    ...
  }
}
```

## No Analog Found

None. There is no exact existing Command Bus, but all required patterns can be composed from current async-task durability, plugin DAL governance, and adapter-edge invalidation patterns.

## Metadata

**Analog search scope:** `src/features/platform-core`, `src/features/async-tasks/server`, `src/features/runtime-platform/host-actions`, `src/actions`, `src/lib/dal`, `src/server/plugins`, `src/db`

**Files scanned:** targeted reads on 15 core files after globbing the main platform/action/dal/schema directories

**Pattern extraction date:** 2026-05-21
