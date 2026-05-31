# Phase 44: Plugin Identity & Namespace Contract - Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 16
**Analogs found:** 16 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/db/schema.ts` | model | CRUD | `src/db/schema.ts` | exact |
| `drizzle/0011_phase44_plugin_identity_namespace.sql` | migration | transform | `drizzle/0009_phase43_knowledge_source_uniqueness.sql` | role-match |
| `src/lib/dal/plugins.ts` | service | request-response | `src/lib/dal/plugins.ts` | exact |
| `src/actions/plugin-actions.ts` | controller | request-response | `src/actions/plugin-actions.ts` | exact |
| `src/lib/dto/resource-ai.ts` | model | transform | `src/lib/dto/resource-ai.ts` | exact |
| `scripts/bootstrap-dev-db.ts` | utility | batch | `scripts/bootstrap-dev-db.ts` | exact |
| `src/server/plugins/registry.ts` | service | event-driven | `src/server/plugins/registry.ts` | exact |
| `src/lib/dal/lesson-authoring.ts` | service | CRUD | `src/lib/dal/lesson-authoring.ts` | exact |
| `src/components/surfaces/settings-surface.tsx` | component | request-response | `src/components/surfaces/settings-surface.tsx` | exact |
| `src/components/surfaces/plugin-marketplace-surface.tsx` | component | request-response | `src/components/surfaces/plugin-marketplace-surface.tsx` | exact |
| `src/lib/dal/plugins.test.ts` | test | request-response | `src/lib/dal/plugins.test.ts` | exact |
| `src/lib/dal/plugins.builtins.test.ts` | test | event-driven | `src/lib/dal/plugins.builtins.test.ts` | exact |
| `src/actions/plugin-actions.test.ts` | test | request-response | `src/actions/plugin-actions.test.ts` | exact |
| `src/components/surfaces/settings-surface.test.tsx` | test | request-response | `src/components/surfaces/settings-surface.test.tsx` | exact |
| `scripts/bootstrap-dev-db.test.ts` | test | batch | `scripts/bootstrap-dev-db.test.ts` | exact |
| `scripts/verify-phase44-plugin-identity.ts` | test | batch | `scripts/verify-phase43-validation-workloads.ts` | role-match |
| `scripts/prepare-dev-db.ts` | utility | batch | `scripts/prepare-dev-db.ts` | exact |
| `drizzle/meta/0011_snapshot.json` | metadata | transform | `drizzle/meta/0010_snapshot.json` | role-match |
| `drizzle/meta/_journal.json` | metadata | append-only | `drizzle/meta/_journal.json` | exact |
| `package.json` | config | script-entry | `package.json` | exact |

## Pattern Assignments

### `src/db/schema.ts` (model, CRUD)

**Analog:** `src/db/schema.ts`

**Imports pattern** (lines 1-2):
```typescript
import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { AdapterAccountType } from "next-auth/adapters";
```

**Current plugin table anchor** (lines 1089-1101):
```typescript
export const pluginRegistrations = sqliteTable("pluginRegistration", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  schoolId: text("schoolId").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  manifestJson: text("manifestJson", { mode: "json" }).notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  killSwitchEnabled: integer("killSwitchEnabled", { mode: "boolean" }).notNull().default(false),
  lifecycleState: text("lifecycleState", { enum: ["installed", "enabled", "mounted", "ready", "suspended", "disabled", "failed"] }).notNull().default("installed"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
});
```

**Unique constraint pattern** (lines 169-188, 515-553, 1011-1022):
```typescript
export const courseEnrollments = sqliteTable(..., (table) => [
  uniqueIndex("courseEnrollments_course_student_unique").on(table.courseId, table.studentId),
  index("courseEnrollments_courseId_idx").on(table.courseId),
]);

export const taskSubmissions = sqliteTable(..., (table) => [
  uniqueIndex("taskSubmissions_attempt_unique").on(table.publishedVersionId, table.stepId, table.studentId, table.attemptNo),
  uniqueIndex("taskSubmissions_latest_unique").on(table.publishedVersionId, table.stepId, table.studentId, table.isLatest),
]);

export const agentRegistry = sqliteTable("agentRegistry", {...}, (table) => [
  uniqueIndex("agentRegistry_agentKey_unique").on(table.agentKey)
]);
```

**Child table cascade pattern** (lines 1103-1144):
```typescript
pluginId: text("pluginId").notNull().references(() => pluginRegistrations.id, { onDelete: "cascade" }),
```

**Copy for Phase 44:** 保持 `sqliteTable(..., (table) => [...])` 形式，把 `pluginKey` / `dbNamespace` 的学校范围唯一约束直接挂在 `pluginRegistrations` 上，不要只做应用层检查。

---

### `drizzle/0011_phase44_plugin_identity_namespace.sql` (migration, transform)

**Analog:** `drizzle/0009_phase43_knowledge_source_uniqueness.sql`

**SQLite 去重 + 唯一索引样式** (lines 1-27):
```sql
DELETE FROM `knowledgeSource`
WHERE `id` IN (
  SELECT stale.`id`
  FROM `knowledgeSource` AS stale
  INNER JOIN `knowledgeSource` AS keep
    ON keep.`resourceId` = stale.`resourceId`
   AND (...keep is newer...)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `knowledgeSources_resourceId_unique` ON `knowledgeSource` (`resourceId`);
```

**SQLite 重建表样式** (from `drizzle/0008_phase43_validation_workloads.sql` lines 20-77):
```sql
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_asyncTask` (...);
--> statement-breakpoint
INSERT INTO `__new_asyncTask`(...) SELECT ... FROM `asyncTask`;--> statement-breakpoint
DROP TABLE `asyncTask`;--> statement-breakpoint
ALTER TABLE `__new_asyncTask` RENAME TO `asyncTask`;--> statement-breakpoint
CREATE UNIQUE INDEX `asyncTasks_queueJobId_unique` ON `asyncTask` (`queueJobId`);
```

**Copy for Phase 44:** 如果给 `pluginRegistration` 加非空列且要 backfill，优先沿用 “`__new_*` 重建表 + INSERT SELECT + unique index`” 模式；如果需要先清洗冲突记录，再复用 `DELETE stale + CREATE UNIQUE INDEX` 模式。

---

### `scripts/prepare-dev-db.ts` (utility, batch)

**Analog:** `scripts/prepare-dev-db.ts`

**Migration bridge pattern:** keep dev DB preparation migration-first, detect the latest applied migration from schema/journal state, and return the repo's canonical migration id instead of falling back to ad hoc push logic.

**Copy for Phase 44:** 扩展 bridge 检测时沿用现有 migration-first 流程，只增加 `0011_phase44_plugin_identity_namespace` 的识别，不要发明第二套 apply path。

---

### `drizzle/meta/0011_snapshot.json` and `drizzle/meta/_journal.json` (metadata)

**Analog:** previous numbered snapshot files plus the existing append-only journal

**Metadata pattern:** snapshot files track the schema image for the numbered migration; `_journal.json` only appends the new migration entry in sequence.

**Copy for Phase 44:** `0011_snapshot.json` 应只表达 Phase 44 之后的 schema state，`_journal.json` 只追加 `0011_phase44_plugin_identity_namespace`，不要重写历史 migration entries。

---

### `package.json` (config, script-entry)

**Analog:** `package.json`

**Script entry pattern:** phase verifiers are exposed as one canonical `verify:phaseNN` script that points to a single `scripts/verify-phaseNN-*.ts` entrypoint.

**Copy for Phase 44:** `verify:phase44` 应与现有 `verify:phase43` 等脚本保持同构，只新增唯一 close gate，不要拆成多个 competing phase-close commands。

---

### `src/lib/dal/plugins.ts` (service, request-response)

**Analog:** `src/lib/dal/plugins.ts`

**Imports + server-only boundary** (lines 1-18):
```typescript
import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { governanceAudits, pluginActionAudits, pluginHookRuns, pluginLifecycleTransitions, pluginRegistrations } from "@/db/schema";
import { getUserMembershipsDTO } from "@/lib/dal/membership";
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";
import { PluginActionInput, PluginActionResult, PluginManifest, PluginManifestSchema, PluginRegistrationDTO, PluginRegistrationDTOSchema } from "@/lib/dto/resource-ai";
```

**Auth/scope guard pattern** (lines 51-66):
```typescript
function assertActorId(actorId: string) {
  if (!actorId.trim()) {
    throw new Error("PLUGIN_ACTOR_REQUIRED");
  }
}

async function assertTeacherManagerScope(input: PluginManagerScopeInput) {
  assertActorId(input.actorId);
  const scope = await assertActiveTeacher();
  if (scope.userId !== input.actorId || !scope.schoolIds.includes(input.schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }
  return scope;
}
```

**DTO parse-at-boundary pattern** (lines 75-90):
```typescript
function toPluginDTO(record: typeof pluginRegistrations.$inferSelect): PluginRegistrationDTO {
  const manifest = PluginManifestSchema.parse(record.manifestJson);

  return PluginRegistrationDTOSchema.parse({
    id: record.id,
    schoolId: record.schoolId,
    name: record.name,
    manifestJson: manifest,
    enabled: record.enabled,
    killSwitchEnabled: record.killSwitchEnabled,
    lifecycleState: record.lifecycleState,
    builtIn: manifest.builtIn,
    defaultEnabled: manifest.defaultEnabled,
    nonDeletable: manifest.nonDeletable,
  });
}
```

**Create + lifecycle append pattern** (lines 240-265):
```typescript
export async function registerPluginManifest(input: RegisterPluginManifestInput) {
  await assertTeacherManagerScope({ actorId: input.actorId, schoolId: input.schoolId });

  const parsedManifest = PluginManifestSchema.parse(input.manifestJson);
  const [record] = await db.insert(pluginRegistrations).values({
    schoolId: input.schoolId,
    name: input.name,
    manifestJson: parsedManifest,
    enabled: parsedManifest.defaultEnabled,
    killSwitchEnabled: false,
    lifecycleState: parsedManifest.defaultEnabled ? "enabled" : "installed",
  }).returning();

  await appendPluginLifecycleTransition({
    pluginId: record.id,
    actorId: input.actorId,
    fromState: null,
    toState: record.lifecycleState,
    reason: "registered",
  });

  return toPluginDTO(record);
}
```

**Update-in-place pattern** (lines 290-315):
```typescript
const [record] = await db
  .update(pluginRegistrations)
  .set({ enabled: input.enabled, lifecycleState: input.enabled ? "enabled" : "disabled", updatedAt: new Date() })
  .where(and(eq(pluginRegistrations.id, input.pluginId), eq(pluginRegistrations.schoolId, input.schoolId)))
  .returning();

await appendPluginLifecycleTransition({ ... });
return { ...toPluginDTO(record), registeredThemeId };
```

**Hook deny/audit pattern** (lines 188-238, 422-600):
```typescript
await createHookRun(input.pluginId, input.hookAnchor, "failed", Date.now() - input.startedAt);
await createPluginAudit({ decision: "denied", reason: input.reason, ... });
await createGovernanceAudit({ decision: "denied", reason: input.reason, ... });

if (plugin.schoolId !== input.schoolId) {
  return denyHook({ ..., reason: "school_mismatch" });
}
```

**Built-in payload mutation debt anchor** (lines 554-562):
```typescript
const actionInput: PluginActionInput = manifest.builtIn
  ? {
      ...input.input,
      payload: {
        ...input.input.payload,
        pluginName: plugin.name,
      },
    }
  : input.input;
```

**Copy for Phase 44:** 在这个文件里收口 `installOrReconcilePlugin()` 最自然：保留 `assertTeacherManagerScope`、`PluginManifestSchema.parse()`、`appendPluginLifecycleTransition()`、`createPluginAudit()`；新增 `pluginKey` / `dbNamespace` 读取与冲突错误时，也继续沿用 `throw new Error("...")` 的错误语义，不要引入第二种返回风格。

---

### `src/actions/plugin-actions.ts` (controller, request-response)

**Analog:** `src/actions/plugin-actions.ts`

**Validation + actor resolution pattern** (lines 19-67):
```typescript
const RegisterPluginSchema = z.object({
  schoolId: z.string().min(1),
  name: z.string().min(1),
  manifestJson: PluginManifestSchema,
});

async function requireCurrentActorId() {
  const user = await getCurrentUserDTO();
  if (!user?.id) {
    throw new Error("AUTH_REQUIRED");
  }
  return user.id;
}
```

**Server Action success/failure pattern** (lines 69-81):
```typescript
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

**Mutation + cache invalidation pattern** (lines 84-117):
```typescript
const result = await setPluginEnabled({ ...parsed.data, actorId });
updateTag(cacheTags.pluginRegistry);
updateTag(cacheTags.plugin(parsed.data.pluginId));

if (result.registeredThemeId) {
  updateTag(cacheTags.themeRegistry);
  updateTag(cacheTags.theme(result.registeredThemeId));
}
```

**Related action analog** (`src/actions/course-import-actions.ts` lines 54-65):
```typescript
function invalidateCourseImportTags(actorId: string, schoolId: string, batchId: string) {
  updateTag(cacheTags.teacherCourses(actorId));
  updateTag(cacheTags.courseImportSchool(schoolId));
  updateTag(cacheTags.courseImportBatch(batchId));
}
```

**Copy for Phase 44:** Phase 44 若新增 reconcile/install action，继续走 `safeParse -> requireCurrentActorId -> DAL -> updateTag -> { success/error }`。不要在 action 内直接解析 `manifestJson.id` 或写 DB。

---

### `src/lib/dto/resource-ai.ts` (model, transform)

**Analog:** `src/lib/dto/resource-ai.ts`

**Built-in payload schema pattern** (lines 393-410):
```typescript
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

**Built-in definition registry pattern** (lines 413-557):
```typescript
export const BUILT_IN_TEACHING_STEP_DEFINITIONS = [
  { builtInKey: "directInstruction", pluginName: "教师讲授", ... },
  { builtInKey: "markdownDeck", pluginName: "Markdown 课件", ... },
  { builtInKey: "htmlCourseware", pluginName: "HTML 互动课件", ... },
] as const satisfies readonly BuiltInTeachingStepTemplatePayload[];
```

**Manifest schema pattern** (lines 562-583):
```typescript
export const PluginManifestSchema = z.object({
  id: z.string(),
  version: z.string(),
  manifestVersion: z.literal(1).or(z.literal(2)).default(1),
  permissions: z.array(PluginPermissionSchema).default([]),
  anchors: z.array(PluginHookAnchorSchema),
  actions: z.array(PluginActionSchema),
  builtIn: z.boolean().default(false),
  defaultEnabled: z.boolean().default(false),
  nonDeletable: z.boolean().default(false),
  theme: ThemeTokenRegistrySchema.optional(),
  governance: PluginManifestGovernanceV2Schema.optional(),
})
```

**Registration DTO pattern** (lines 585-597):
```typescript
export const PluginRegistrationDTOSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  name: z.string(),
  manifestJson: PluginManifestSchema,
  enabled: z.boolean(),
  killSwitchEnabled: z.boolean(),
  lifecycleState: PluginLifecycleStateSchema,
  builtIn: z.boolean(),
  defaultEnabled: z.boolean(),
  nonDeletable: z.boolean(),
});
```

**Copy for Phase 44:** 直接把 `pluginKey`、`dbNamespace`、来源字段加到 `PluginRegistrationDTOSchema`，保持 `PluginManifestSchema` 仍是 source-of-truth input，但 registration DTO 改为直接暴露 SQL truth，不要要求 UI 再看 `manifestJson.id`。

---

### `scripts/bootstrap-dev-db.ts` (utility, batch)

**Analog:** `scripts/bootstrap-dev-db.ts`

**Manifest seed input pattern** (lines 122-201, 203-286):
```typescript
const BUILT_IN_PLUGIN_DEFINITIONS = [
  {
    name: "教师讲授",
    manifest: {
      id: "builtin-teaching-step-direct-instruction",
      version: "1.0.0",
      permissions: ["lesson:write:suggestion"],
      anchors: ["lesson.sidebar"],
      actions: ["suggestBuiltInTeachingStep", "insertBuiltInTeachingStepTemplate"],
      builtIn: true,
      defaultEnabled: true,
      nonDeletable: true,
    },
  },
];
```

**Current name-based upsert debt** (lines 489-518):
```typescript
const existing = await db.query.pluginRegistrations.findFirst({
  where: and(eq(pluginRegistrations.schoolId, schoolId), eq(pluginRegistrations.name, definition.name)),
});

if (existing) {
  await db.update(pluginRegistrations).set({ manifestJson: manifest, enabled: true, killSwitchEnabled: false, updatedAt: new Date() }).where(eq(pluginRegistrations.id, existing.id));
  continue;
}

await db.insert(pluginRegistrations).values({ schoolId, name: definition.name, manifestJson: manifest, enabled: true, killSwitchEnabled: false });
```

**Update-in-place theme seed pattern** (lines 520-556) + shared registry analog (`src/server/themes/registry.ts` lines 24-59):
```typescript
if (existing) {
  await db.update(pluginRegistrations).set({ ... }).where(eq(pluginRegistrations.id, existing.id));
} else {
  await db.insert(pluginRegistrations).values({ ... });
}

await registerThemeTokens(schoolId, definition.themeName, manifest.theme, actorId);
```

**Bootstrap orchestration pattern** (lines 583-624):
```typescript
export async function bootstrapDevDb() {
  ...
  await upsertBuiltInPlugins(seeded.school.id);
  await seedDefaultSystemTransportMode(seeded.teacher.id);
  for (const definition of DEV_THEME_PLUGIN_DEFINITIONS) {
    await upsertDevThemePlugin(seeded.school.id, seeded.teacher.id, definition);
  }
}
```

**Copy for Phase 44:** 把 built-in/dev theme seed 全部切到共享 reconcile helper，但保留 **update-in-place** 姿态；不要删旧后重建，因为 `lesson-authoring.ts` 依赖持久化 `pluginId`。

---

### `src/server/plugins/registry.ts` (service, event-driven)

**Analog:** `src/server/plugins/registry.ts`

**Allowlist + permission map pattern** (lines 13-33):
```typescript
export const PLUGIN_HOOK_ANCHORS = ["dashboard.widget", "lesson.sidebar", "schedule.assistant"] as const;
export const PLUGIN_ACTION_ALLOWLIST = [... ] as const;
export const PLUGIN_ACTION_PERMISSION_REQUIREMENTS = {
  addStepSuggestion: "lesson:write:suggestion",
  annotateLesson: "lesson:write:annotation",
  createNotificationStub: "notification:create:stub",
  suggestBuiltInTeachingStep: "lesson:write:suggestion",
  insertBuiltInTeachingStepTemplate: "lesson:write:suggestion",
} as const;
```

**Current display-name lookup debt** (lines 35-46):
```typescript
const BUILT_IN_TEACHING_STEP_BY_NAME = new Map(
  BUILT_IN_TEACHING_STEP_DEFINITIONS.map((definition) => [definition.pluginName, definition] as const),
);

function resolveBuiltInTeachingStep(input: PluginActionInput) {
  const pluginName = typeof input.payload.pluginName === "string" ? input.payload.pluginName : null;
  if (!pluginName) {
    return null;
  }
  return BUILT_IN_TEACHING_STEP_BY_NAME.get(pluginName as BuiltInTeachingPluginName) ?? null;
}
```

**Dispatch pattern** (lines 48-102):
```typescript
case "insertBuiltInTeachingStepTemplate": {
  const definition = resolveBuiltInTeachingStep(input);
  if (!definition) {
    return { proposalType: "unknown", payload: input.payload, denied: true };
  }

  return {
    proposalType: "builtInTeachingStepTemplate",
    payload: BuiltInTeachingStepTemplatePayloadSchema.parse(definition),
  };
}
```

**Copy for Phase 44:** 保留 `switch(action)` + typed `Schema.parse(...)` 输出，但把 built-in definition lookup 从 `pluginName` 切到 `builtInKey` 或 `pluginKey`。`pluginName` 只保留在返回 payload 里做展示。

---

### `src/lib/dal/lesson-authoring.ts` (service, CRUD)

**Analog:** `src/lib/dal/lesson-authoring.ts`

**Teacher auth anchor** (lines 174-191):
```typescript
export async function assertActiveTeacher(): Promise<TeacherScope> {
  const user = await getCurrentUserDTO();
  if (!user) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }
  const memberships = await getUserMembershipsDTO(user.id);
  const schoolIds = memberships.filter((membership) => membership.role === "teacher" && membership.status === "active").map((membership) => membership.schoolId);
  if (schoolIds.length === 0) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }
  return { userId: user.id, schoolIds };
}
```

**Built-in availability map** (lines 292-314):
```typescript
function getBuiltInPluginAvailabilityMap(plugins: Array<{ id: string; enabled: boolean; killSwitchEnabled: boolean; manifestJson?: { builtIn?: boolean } | null; }>) {
  return new Map(
    plugins.map((plugin) => [plugin.id, Boolean(plugin.enabled && !plugin.killSwitchEnabled && plugin.manifestJson?.builtIn)]),
  );
}
```

**Critical pluginId stability check** (lines 498-516):
```typescript
const builtInSource = parsedStep.payload.builtInSource;
if (!builtInSource) {
  continue;
}

if (!pluginAvailability.get(builtInSource.pluginId)) {
  blockingIssues.push(
    buildIssue({
      code: "BUILT_IN_PLUGIN_UNAVAILABLE",
      message: `内置教学环节插件“${builtInSource.pluginName}”当前不可用，请替换或重新启用后再发布。`,
      stepId: step.id,
      pluginId: builtInSource.pluginId,
      builtInKey: builtInSource.builtInKey,
      pluginName: builtInSource.pluginName,
    }),
  );
}
```

**Copy for Phase 44:** 这个文件是 Phase 44 的风险锚点。任何 built-in reconcile 都必须保持 `pluginRegistrations.id` 稳定，否则这里会直接把历史步骤判为不可发布。

---

### `src/components/surfaces/settings-surface.tsx` (component, request-response)

**Analog:** `src/components/surfaces/settings-surface.tsx`

**Server surface data-loading pattern** (lines 13-27, 405-418):
```typescript
import { listPluginsAction, setPluginEnabledAction } from "@/actions/plugin-actions";
...
const pluginResult = schoolId
  ? await listPluginsAction({ schoolId })
  : { success: true as const, data: [] };
const plugins = pluginResult.success ? (pluginResult.data ?? []) : [];

const submitPluginToggle = async (formData: FormData) => {
  "use server";
  await setPluginEnabledAction({
    pluginId: String(formData.get("pluginId") ?? ""),
    schoolId: String(formData.get("schoolId") ?? ""),
    enabled: String(formData.get("enabled") ?? "") === "true",
  });
};
```

**Card rhythm / tonal surface pattern** (lines 422-423, 454-479, 574-672):
```tsx
<div className={cn(surfaceWidths.workspace, teacherSurfaceRhythm.stack, "flex flex-col")}>
...
<div className={cn(teacherSurfaceRhythm.cardInset, "p-5")}>
...
<section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient">
```

**Current plugin metadata rendering** (lines 588-623):
```tsx
<p className="font-semibold text-on-surface">{plugin.name}</p>
<div className="mt-3 flex flex-wrap gap-2">
  {plugin.builtIn ? <Badge className="bg-primary/10 text-primary">系统内置</Badge> : null}
  {plugin.defaultEnabled ? <Badge className="bg-surface-container-low text-on-surface">默认开启</Badge> : null}
  <Badge className="bg-surface-container-low text-on-surface-variant">
    {plugin.manifestJson.id}
  </Badge>
</div>
```

**Copy for Phase 44:** UI 继续保持 `teacherSurfaceRhythm` + `Badge` 的节奏，但把 badge 来源从 `plugin.manifestJson.id` 替换为 DTO 里的正式 `pluginKey` / `dbNamespace` / source metadata；不要在组件里自己推导 identity。

---

### `src/components/surfaces/plugin-marketplace-surface.tsx` (component, request-response)

**Analog:** `src/components/surfaces/plugin-marketplace-surface.tsx`

**Filter built-ins at surface boundary** (lines 11-16):
```typescript
const pluginResult = schoolId ? await listPluginsAction({ schoolId }) : { success: true as const, data: [] }
const plugins = (pluginResult.success ? pluginResult.data ?? [] : []).filter((plugin) => plugin.builtIn)
```

**Hero + metric composition pattern** (lines 30-45):
```tsx
<StageHero
  badge="插件市场"
  title="系统内置教学环节"
  description="...默认开启，可按课堂运行需要停用或重新启用..."
  meta={...}
  aside={
    <div className="grid gap-3 ...">
      <MetricCard label="系统内置" value={String(plugins.length)} />
      <MetricCard label="当前启用" value={String(plugins.filter((plugin) => plugin.enabled).length)} />
    </div>
  }
/>
```

**Current secondary metadata badge** (lines 68-107):
```tsx
<div className="mt-3 flex flex-wrap gap-2">
  <Badge className="bg-primary/10 text-primary">系统内置</Badge>
  {plugin.defaultEnabled ? <Badge className="bg-surface-container-low text-on-surface">默认开启</Badge> : null}
  <Badge className="bg-surface-container-low text-on-surface-variant">{plugin.manifestJson.id}</Badge>
</div>
```

**Role-match layout analog** (`src/components/surfaces/teacher-course-center-surface.tsx` lines 50-57, 148-223):
```tsx
<div className={teacherSurfaceRhythm.stack}>
  <section className={teacherSurfaceRhythm.hero}>...</section>
  <section className={teacherSurfaceRhythm.section}>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">...</div>
  </section>
</div>
```

**Copy for Phase 44:** 保留 marketplace 的“只展示 built-in、只启停不删除”语义和 StageHero 结构；但 metadata 文案要改为正式字段，避免继续把 `manifestJson.id` 当作二级真相。

---

### `src/lib/dal/plugins.test.ts` / `src/lib/dal/plugins.builtins.test.ts` / `src/actions/plugin-actions.test.ts` (test)

**Analogs:** same files

**Static contract test pattern** (`src/lib/dal/plugins.test.ts` lines 8-70):
```typescript
const source = readFileSync("src/lib/dal/plugins.ts", "utf8");
expect(source).toContain("assertActiveTeacher");
expect(source).toContain("await createPluginAudit");
expect(source).toContain("await createGovernanceAudit");
```

**Behavioral mock test pattern** (`src/lib/dal/plugins.builtins.test.ts` lines 49-83, 111-151):
```typescript
function createBuiltInPlugin(overrides: Record<string, unknown> = {}) {
  return {
    id: "plugin-built-in-1",
    schoolId: "school-1",
    name: "教师讲授",
    enabled: true,
    ...
    manifestJson: { id: "built-in-direct-instruction", ... },
    ...overrides,
  };
}

expect(dispatchPluginAction).toHaveBeenCalledWith(
  expect.objectContaining({ action: "insertBuiltInTeachingStepTemplate", pluginId: "plugin-built-in-1" }),
);
```

**Action cache invalidation test pattern** (`src/actions/plugin-actions.test.ts` lines 77-97, 125-163):
```typescript
expect(mockPluginDAL.registerPluginManifest).toHaveBeenCalledWith({ ..., actorId: "user-1" });
expect(updateTag).toHaveBeenCalledWith("plugin:registry");
expect(updateTag).toHaveBeenCalledWith("plugin:plugin-1");
```

**Copy for Phase 44:**
- `plugins.test.ts`：补充 `pluginKey` / `dbNamespace` / conflict token / reconcile helper 文本断言。
- `plugins.builtins.test.ts`：补充 built-in lookup 不再依赖 `pluginName` 的行为测试。
- `plugin-actions.test.ts`：若新增 reconcile action，继续断言 `actorId` 透传和 `updateTag(cacheTags.pluginRegistry)`。

---

### `src/components/surfaces/settings-surface.test.tsx` (test, request-response)

**Analog:** `src/components/surfaces/settings-surface.test.tsx`

**Mock DTO shape pattern** (lines 47-64):
```typescript
data: [
  {
    id: "plugin-1",
    schoolId: "school-1",
    name: "教师讲授",
    builtIn: true,
    defaultEnabled: true,
    enabled: true,
    killSwitchEnabled: false,
    manifestJson: { id: "builtin.direct-instruction" },
  },
],
```

**Static UI token assertion pattern** (lines 218-237):
```typescript
expect(source).toContain("插件管理");
expect(source).toContain("setPluginEnabledAction");
expect(source).toContain("总开关");
expect(source).toContain("/settings/plugins");
```

**Rendered interaction assertion pattern** (lines 239-263):
```typescript
render(await PluginMarketplaceSurface());
expect(screen.getByText("教师讲授")).toBeTruthy();
expect(screen.getByText("builtin.direct-instruction")).toBeTruthy();
fireEvent.submit(toggleForm!);
await waitFor(() => {
  expect(pluginActionMocks.setPluginEnabledAction).toHaveBeenCalledWith({ pluginId: "plugin-1", schoolId: "school-1", enabled: false });
});
```

**Copy for Phase 44:** 更新 mock DTO 以包含 `pluginKey` / `dbNamespace`，并把静态断言从 `manifestJson.id` 切到正式字段展示。

---

### `scripts/bootstrap-dev-db.test.ts` (test, batch)

**Analog:** `scripts/bootstrap-dev-db.test.ts`

**Static file contract pattern** (lines 9-34):
```typescript
const source = readFileSync("scripts/bootstrap-dev-db.ts", "utf8");
const registrySource = readFileSync("src/server/themes/registry.ts", "utf8");

expect(source).toContain("for (const definition of DEV_THEME_PLUGIN_DEFINITIONS)");
expect(source).toContain("await upsertDevThemePlugin(seeded.school.id, seeded.teacher.id, definition)");
expect(registrySource).toContain("export async function registerThemeTokens");
```

**Copy for Phase 44:** 如果 bootstrap 改为 shared reconcile helper，就沿用这种静态回归测试，断言脚本确实改走 helper，而不是残留 `eq(pluginRegistrations.name, definition.name)`。

---

### `scripts/verify-phase44-plugin-identity.ts` (test, batch)

**Analog:** `scripts/verify-phase43-validation-workloads.ts`

**Helper + static-check array pattern** (lines 10-23, 91-192):
```typescript
function read(filePath: string) {
  return existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
}

type StaticCheck = { label: string; passed: boolean };
const staticChecks: StaticCheck[] = [ ... ];

const failedChecks = staticChecks.filter((check) => !check.passed);
if (failedChecks.length > 0) {
  console.error("Phase 43 verification failed");
  ...
  process.exit(1);
}
```

**Vitest dispatch pattern** (lines 34-49, 194-218):
```typescript
function runVitest(paths: readonly string[], label: string) { ... }
runVitest(["src/lib/dal/async-task-operator.test.ts", ...], "phase 43 operator-facing regression slices");
run("node", ["--import", "tsx", "scripts/verify-phase42-operator-recovery.ts"], "phase 42 regression");
```

**Copy for Phase 44:** verifier 脚本很适合复用同样结构：静态检查 `schema/plugins/actions/registry/bootstrap/surfaces` 是否都改到 `pluginKey` / `dbNamespace` truth，再串最小 Vitest slice。

## Shared Patterns

### 1. Teacher-scoped DAL guard
**Sources:**
- `src/lib/dal/plugins.ts` lines 51-66
- `src/lib/dal/lesson-authoring.ts` lines 174-191

**Apply to:** `plugins.ts`, any new reconcile helper, any new plugin verifier that touches protected DAL paths

```typescript
assertActorId(input.actorId);
const scope = await assertActiveTeacher();
if (scope.userId !== input.actorId || !scope.schoolIds.includes(input.schoolId)) {
  throw new Error("TEACHER_AUTH_REQUIRED");
}
```

### 2. SQL truth + DTO parse-at-boundary
**Sources:**
- `src/lib/dal/plugins.ts` lines 75-90
- `src/lib/dto/resource-ai.ts` lines 562-597

**Apply to:** `pluginKey`, `dbNamespace`, source/install metadata

```typescript
const manifest = PluginManifestSchema.parse(record.manifestJson);
return PluginRegistrationDTOSchema.parse({ ...record, manifestJson: manifest, ...derivedFlags });
```

### 3. Update-in-place, never delete+insert, for stable IDs
**Sources:**
- `src/lib/dal/plugins.ts` lines 290-315
- `src/server/themes/registry.ts` lines 29-59
- `src/lib/dal/lesson-authoring.ts` lines 498-516

**Apply to:** default plugin reconcile, bootstrap seed, repair paths

```typescript
if (existing) {
  await db.update(table).set({ ...updatedFields, updatedAt: new Date() }).where(eq(table.id, existing.id));
} else {
  await db.insert(table).values({ ... });
}
```

### 4. Server Action mutation freshness
**Sources:**
- `src/actions/plugin-actions.ts` lines 69-117
- `src/actions/course-import-actions.ts` lines 54-65

**Apply to:** any new install/reconcile action

```typescript
updateTag(cacheTags.pluginRegistry);
updateTag(cacheTags.plugin(result.id));
```

### 5. Built-in display name is display-only
**Sources:**
- `src/server/plugins/registry.ts` lines 35-46
- `src/lib/dto/lesson-authoring.ts` lines 40-44
- `src/lib/dal/lesson-authoring.ts` lines 505-514

**Apply to:** registry dispatch, suggestion/template payloads, UI copy

```typescript
pluginName: z.string().min(1)
```

保留 `pluginName` 做展示，但 canonical lookup 改用 `pluginKey` / `builtInKey`。

### 6. Teacher surface visual rhythm
**Sources:**
- `src/components/surfaces/settings-surface.tsx` lines 422-423, 454-479, 574-672
- `src/components/surfaces/teacher-course-center-surface.tsx` lines 50-57, 148-223

**Apply to:** settings / marketplace 上新增 identity metadata 的 UI

```tsx
<div className={cn(surfaceWidths.workspace, teacherSurfaceRhythm.stack, "flex flex-col")}>
<section className={teacherSurfaceRhythm.section}>...</section>
<div className={cn(teacherSurfaceRhythm.cardInset, "p-4")}>
```

## No Analog Found

无。Phase 44 所需改动全部能在现有 schema / DAL / action / surface / migration / verifier 模式中找到直接参照。

## Metadata

**Analog search scope:** `src/db`, `src/lib/dal`, `src/actions`, `src/lib/dto`, `src/server/plugins`, `src/components/surfaces`, `scripts`, `drizzle`

**Files scanned:** 23

**Pattern extraction date:** 2026-05-20
