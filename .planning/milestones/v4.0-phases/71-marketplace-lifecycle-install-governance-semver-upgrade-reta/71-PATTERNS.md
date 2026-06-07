# Phase 71: Marketplace Lifecycle — Install Governance, Semver Upgrade & Retain/Cleanup Uninstall - Pattern Map

**Mapped:** 2026-06-04  
**Files analyzed:** 20  
**Analogs found:** 20 / 20

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/components/surfaces/plugin-marketplace-surface.tsx` | component | request-response | `src/components/surfaces/plugin-marketplace-surface.tsx` | exact |
| `src/app/settings/plugins/page.tsx` | route | request-response | `src/app/settings/plugins/page.tsx` | exact |
| `src/actions/plugin-actions.ts` | action | request-response | `src/actions/plugin-actions.ts` | exact |
| `src/lib/dal/plugins.ts` | service | CRUD | `src/lib/dal/plugins.ts` | exact |
| `src/lib/dal/plugin-migration.ts` | service | batch / transform | `src/lib/dal/plugin-migration.ts` | exact |
| `src/lib/dal/classroom.ts` | service | request-response / event-driven | `src/lib/dal/classroom.ts` | partial-flow |
| `src/features/platform-core/plugins/governance-projection.ts` | utility | transform | `src/features/platform-core/plugins/governance-projection.ts` | exact |
| `src/features/platform-core/actions/registry.ts` | service | transform | `src/features/platform-core/actions/registry.ts` | exact |
| `src/features/platform-core/commands/handlers/plugins.ts` | service | request-response | `src/features/platform-core/commands/handlers/plugins.ts` | exact |
| `src/components/surfaces/plugin-lifecycle-operator-surface.tsx` | component | request-response | `src/components/surfaces/plugin-lifecycle-operator-surface.tsx` | exact |
| `src/components/surfaces/plugin-marketplace-surface.test.tsx` | test | request-response | `src/components/surfaces/plugin-marketplace-surface.test.tsx` | exact |
| `src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx` | test | request-response | `src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx` | exact |
| `src/lib/dal/plugins.test.ts` | test | CRUD | `src/lib/dal/plugins.test.ts` | exact |
| `src/actions/plugin-actions.test.ts` | test | request-response | `src/actions/plugin-actions.test.ts` | exact |
| `src/lib/plugins/external-catalog.ts` | utility | transform | `plugins/quiz-sample/manifest.ts`, `plugins/quiz-sample/data-model.ts` | role-match |
| `src/features/platform-core/commands/contracts.ts` | contract | transform | `src/features/platform-core/commands/contracts.ts` | exact |
| `src/features/platform-core/commands/handlers/plugins.test.ts` | test | request-response | `src/features/platform-core/commands/handlers/plugins.test.ts` | exact |
| `scripts/lib/phase71-marketplace-fixtures.ts` | test-helper | batch / CRUD | `scripts/verify-phase69-quiz-sample.ts`, `scripts/verify-phase70-quiz-stats.ts` | role-match |
| `package.json` | config | transform | `package.json` | exact |
| `scripts/verify-phase71-marketplace-lifecycle.ts` | test | batch | `scripts/verify-phase48-lifecycle-and-uninstall.ts`, `scripts/verify-phase69-quiz-sample.ts`, `scripts/verify-phase70-quiz-stats.ts` | role-match |

## Pattern Assignments

### `src/components/surfaces/plugin-marketplace-surface.tsx` (component, request-response)

**Analog:** `src/components/surfaces/plugin-marketplace-surface.tsx`

**Imports + SSR data load** (`src/components/surfaces/plugin-marketplace-surface.tsx:1-17`)
```tsx
import Link from 'next/link'
import { ChevronRight, Sparkles, Store } from 'lucide-react'

import { listPluginsAction, setPluginEnabledAction } from '@/actions/plugin-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StageHero } from '@/components/surfaces/stage-hero'
import { surfaceWidths } from '@/components/surfaces/surface-widths'
import { getCurrentUserSchoolIds } from '@/lib/dal/auth'

export async function PluginMarketplaceSurface() {
  const schoolIds = await getCurrentUserSchoolIds()
  const schoolId = schoolIds[0] ?? null
  const pluginResult = schoolId ? await listPluginsAction({ schoolId }) : { success: true as const, data: [] }
  const pluginLoadError = pluginResult.success ? null : pluginResult.error ?? 'PLUGIN_LIST_FAILED'
```

**Inline server action form pattern** (`src/components/surfaces/plugin-marketplace-surface.tsx:18-26`)
```tsx
const submitPluginToggle = async (formData: FormData) => {
  'use server'

  await setPluginEnabledAction({
    pluginId: String(formData.get('pluginId') ?? ''),
    schoolId: String(formData.get('schoolId') ?? ''),
    enabled: String(formData.get('enabled') ?? '') === 'true',
  })
}
```

**Surface composition pattern** (`src/components/surfaces/plugin-marketplace-surface.tsx:29-47,49-67`)
```tsx
<main className="min-h-screen bg-surface px-4 py-6 text-on-surface sm:px-6 lg:px-8">
  <div className={`${surfaceWidths.workspace} flex flex-col gap-6`}>
    <StageHero
      badge="插件市场"
      title="系统内置教学环节"
      description="..."
      meta={<div className="flex flex-wrap items-center gap-3">...</div>}
      aside={<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">...</div>}
    />
```

**Card metadata / badge hierarchy** (`src/components/surfaces/plugin-marketplace-surface.tsx:76-115`)
```tsx
<article key={plugin.id} className="rounded-[1.75rem] bg-surface-container-lowest p-5 shadow-ambient">
  <div className="flex items-start justify-between gap-4">
    <div>
      <p className="text-lg font-semibold text-on-surface">{plugin.name}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge className="bg-primary/10 text-primary">系统内置</Badge>
        <Badge className="bg-surface-container-low text-on-surface-variant">Key: {plugin.pluginKey}</Badge>
        <Badge className="bg-surface-container-low text-on-surface-variant">NS: {plugin.dbNamespace}</Badge>
        <Badge className="bg-surface-container-low text-on-surface-variant">Type: {plugin.sourceType}</Badge>
      </div>
    </div>
```

**How to apply in Phase 71:** 延续 `StageHero + section + article card + inline form` 骨架；把当前 built-in-only 过滤改成 built-in/external 双分区，不新开页面；external 卡片优先复用 badge/InfoTile 样式承载治理摘要与内联拒因。

---

### `src/app/settings/plugins/page.tsx` (route, request-response)

**Analog:** `src/app/settings/plugins/page.tsx`

**Minimal route wrapper pattern** (`src/app/settings/plugins/page.tsx:1-10`)
```tsx
import { Suspense } from 'react'

import { PluginMarketplaceSurface } from '@/components/surfaces/plugin-marketplace-surface'

export default function SettingsPluginsPage() {
  return (
    <Suspense fallback={null}>
      <PluginMarketplaceSurface />
    </Suspense>
  )
}
```

**How to apply in Phase 71:** 保持 route 极薄；所有 marketplace 生命周期 UI 继续下沉到 `PluginMarketplaceSurface`，不要把 preflight/upgrade/uninstall 逻辑堆回 page 文件。

---

### `src/actions/plugin-actions.ts` (action, request-response)

**Analog:** `src/actions/plugin-actions.ts`

**Boundary validation pattern** (`src/actions/plugin-actions.ts:23-85`)
```ts
const RegisterPluginSchema = z.object({
  schoolId: z.string().min(1),
  name: z.string().min(1),
  manifestJson: PluginManifestSchema,
});

const UninstallPluginSchema = PluginBySchoolSchema.extend({
  retentionMode: z.enum(["retain", "cleanup"]).default("retain"),
  confirmationToken: z.string().min(1).optional(),
});
```

**Shared error + auth helpers** (`src/actions/plugin-actions.ts:87-159`)
```ts
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

**Mutation action pattern with producer + `updateTag()`** (`src/actions/plugin-actions.ts:160-191,645-667,673-690`)
```ts
const result = await dispatchPluginGovernanceCommand({
  type: "plugin.install",
  actor: { actorId, actorScope: "teacher" },
  scope: { schoolId: parsed.data.schoolId, pluginId: parsed.data.manifestJson.id },
  payload: { ... },
  source: "server-action",
  correlation: { producer: "plugin-actions.register" },
});
updateTag(cacheTags.pluginRegistry);
updateTag(cacheTags.plugin(pluginId));
```

**Teacher/operator split pattern** (`src/actions/plugin-actions.ts:348-392,395-450,482-567`)
```ts
const schoolId = await resolveOperatorSchoolId(actorId, parsed.data.pluginId, parsed.data.schoolId);
const result = await dispatchPluginGovernanceCommand({
  type: "plugin.reconcile",
  actor: { actorId, actorScope: "operator" },
  scope: { schoolId, pluginId: parsed.data.pluginId },
  payload: { ... },
```

**How to apply in Phase 71:** 新增 external install preflight / upgrade preflight / upgrade execute / recover install action 时，直接复制 `safeParse -> requireCurrentActorId -> dispatchPluginGovernanceCommand -> updateTag()` 结构；错误继续返回具名 token，不吞成 toast-only 文案。

---

### `src/lib/dal/plugins.ts` (service, CRUD)

**Analog:** `src/lib/dal/plugins.ts`

**Conflict / namespace helper pattern** (`src/lib/dal/plugins.ts:28-46`)
```ts
export const PLUGIN_KEY_CONFLICT = "PLUGIN_KEY_CONFLICT";
export const PLUGIN_DB_NAMESPACE_CONFLICT = "PLUGIN_DB_NAMESPACE_CONFLICT";

export function deriveDbNamespace(pluginKey: string) {
  const normalized = pluginKey
    .toLowerCase()
    .replace(/[-.:/@\s]+/g, "_")
```

**Install-or-reconcile transaction pattern** (`src/lib/dal/plugins.ts:550-663`)
```ts
const parsedManifest = PluginManifestSchema.parse(input.manifestJson);
const pluginKey = parsedManifest.id;
const derivedNamespace = deriveDbNamespace(pluginKey);
...
if (pluginKeyConflict) {
  throw new Error(PLUGIN_KEY_CONFLICT);
}
...
const [record] = await input.tx
  .insert(pluginRegistrations)
  .values({
    schoolId: input.schoolId,
    name: input.name,
    manifestJson: parsedManifest,
    pluginKey,
    dbNamespace: derivedNamespace,
    sourceType,
```

**Uninstall preflight counting + token pattern** (`src/lib/dal/plugins.ts:468-477,964-1052`)
```ts
function buildCleanupConfirmationToken(input: { ... }) {
  return `cleanup:${input.pluginId}:${input.lessonExtCount}:${input.stepExtCount}:${input.resourceExtCount}:${input.ownedBusinessCount}:${input.totalCount}`;
}

const [lessonExtensions, stepExtensions, resourceExtensions, ownedBusiness] = await Promise.all([
  db.select({ lessonId: pluginLessonExtensions.lessonId }).from(pluginLessonExtensions)...,
  db.select({ lessonStepId: pluginLessonStepExtensions.lessonStepId }).from(pluginLessonStepExtensions)...,
  db.select({ resourceId: pluginResourceExtensions.resourceId }).from(pluginResourceExtensions)...,
  db.select({ key: pluginOwnedBusinessData.key }).from(pluginOwnedBusinessData)...,
]);
```

**Retain vs cleanup execution pattern** (`src/lib/dal/plugins.ts:1061-1159`)
```ts
if (retentionMode === "cleanup") {
  if (input.confirmationToken !== preflight.cleanupConfirmationToken) {
    throw new Error("PLUGIN_CLEANUP_CONFIRMATION_REQUIRED");
  }

  const [deleted] = await input.tx
    .delete(pluginRegistrations)
    .where(and(eq(pluginRegistrations.id, input.pluginId), eq(pluginRegistrations.schoolId, input.schoolId)))
    .returning();
  return deleted ?? null;
}

const [updated] = await input.tx
  .update(pluginRegistrations)
  .set({
    enabled: false,
    killSwitchEnabled: false,
    lifecycleState: "disabled",
    uninstalledAt: new Date(),
    uninstallRetentionMode: "retain",
```

**Governance snapshot feed pattern** (`src/lib/dal/plugins.ts:479-547`)
```ts
const rows = await db.query.pluginRegistrations.findMany({
  where: eq(pluginRegistrations.schoolId, input.schoolId),
});

const uninstallRows = await Promise.all(
  rows.map(async (row) => ({
    pluginId: row.id,
    uninstall: await preflightUninstallPluginWithTx({ ... })
  }))
)
```

**How to apply in Phase 71:** external 安装预检、retain-recover、真实影响面补齐、active-classroom 阻断都应继续塞进这个 DAL 真相层；不要在 UI 或 command handler 里重复冲突检查、token 计算或 retain 语义。

---

### `src/lib/dal/plugin-migration.ts` (service, batch/transform)

**Analog:** `src/lib/dal/plugin-migration.ts`

**Server-only + Drizzle transaction boundary** (`src/lib/dal/plugin-migration.ts:1-18`)
```ts
import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
```

**Three-stage migration discipline** (`src/lib/dal/plugin-migration.ts:115-260,265-378,384-573`)
```ts
export async function backfillPluginJsonToSchema(...) { ... }

export async function verifyBackfillData(...) {
  ...
  return {
    matches: mismatches.length === 0,
    mismatches,
  };
}

export async function cutoverPluginJsonToSchema(...) {
  const verifyRes = await verifyBackfillData(...);
  if (!verifyRes.matches) {
    throw new Error(
      `CUTOVER_ABORTED: Verification failed for mismatching entity IDs: ${verifyRes.mismatches.join(", ")}`,
    );
  }

  await db.transaction(async (tx) => {
    ...
    throw new Error(`CUTOVER_FAILED_TRANSACTION_ROLLBACK: ${reason}`);
  });
}
```

**How to apply in Phase 71:** semver upgrade orchestration 必须复用 `backfill -> verify -> cutover` 三段式；verify 失败时维持旧版本可用，不要先切版本后补校验。

---

### `src/lib/dal/classroom.ts` (service, request-response / event-driven)

**Analog:** `src/lib/dal/classroom.ts` (partial, for live-session truth source)

**Live session persistence model** (`src/lib/dal/classroom.ts:4283-4295`)
```ts
const [newSession] = await tx.insert(classroomSessions).values({
  lessonId: payload.lessonId,
  publishedVersionId: payload.publishedVersionId,
  classId: payload.classId,
  teacherId: scope.userId,
  activeStepId: firstStep.id,
  locked: false,
  transportModeSnapshot: transportSettings.effectiveMode,
  status: "live",
  version: 1,
}).returning();
```

**Ended/live status query guard pattern** (`src/lib/dal/classroom.ts:3752-3759,4341-4344`)
```ts
const endedSessions = await db.query.classroomSessions.findMany({
  where: and(
    eq(classroomSessions.teacherId, scope.userId),
    eq(classroomSessions.status, "ended"),
    eq(classroomSessions.classId, input.classId),
  ),
});

if (session.status !== "live") throw new Error("CLASSROOM_ENDED");
```

**How to apply in Phase 71:** active classroom blocker 没有完整现成卸载 analog，但 live/ended 状态真相已经在这里；升级/卸载 preflight 与 execute guard 应直接基于 `classroomSessions.status` 后端查询，不做前端猜测。

---

### `src/features/platform-core/plugins/governance-projection.ts` (utility, transform)

**Analog:** `src/features/platform-core/plugins/governance-projection.ts`

**Projection input contract** (`src/features/platform-core/plugins/governance-projection.ts:11-29`)
```ts
export type PluginGovernanceProjectionInput = {
  pluginId: string;
  pluginKey: string;
  name: string;
  enabled: boolean;
  killSwitchEnabled: boolean;
  lifecycleState: PluginLifecycleState;
  uninstalledAt: Date | null;
  uninstallRetentionMode: "retain" | "cleanup" | null;
  sourceType: "default" | "external";
  dependencies: readonly string[];
  activationStatus: "idle" | "active" | "failed";
  failureDetail: string | null;
  uninstall: PreflightUninstallPluginResult;
```

**Lifecycle mapping and blocked reason pattern** (`src/features/platform-core/plugins/governance-projection.ts:70-92,147-247`)
```ts
if (input.uninstallRetentionMode === "retain" && input.uninstalledAt !== null) {
  return "uninstalled";
}

...

if (plugin.uninstallRetentionMode === "retain" && plugin.uninstalledAt !== null) {
  blocked = true;
  reasonCode = "not_installed";
} else if (plugin.killSwitchEnabled || plugin.lifecycleState === "suspended") {
  blocked = true;
  reasonCode = "kill_switch";
  recoveryAction = "resume";
}
```

**How to apply in Phase 71:** 新增 external installability / upgradeability / retained recovery / active-session block DTO 时，优先扩这个 projection，而不是在 surface 中手写 if/else 推断。

---

### `src/features/platform-core/actions/registry.ts` (service, transform)

**Analog:** `src/features/platform-core/actions/registry.ts`

**Bundle projection pattern** (`src/features/platform-core/actions/registry.ts:204-218,221-267`)
```ts
const [plugins, governanceSnapshots] = await Promise.all([
  listPluginsForSchool(input),
  listPluginGovernanceSnapshotRecords(input),
]);
const governanceProjection = projectPluginGovernance(governanceSnapshots);

return {
  pluginLifecycleRows: Array.from(bundle.pluginsById.values()).flatMap((plugin) => {
    const governance = bundle.governanceById.get(plugin.id);
    const snapshot = bundle.snapshotsById.get(plugin.id);
```

**Read-model accessors** (`src/features/platform-core/actions/registry.ts:269-314`)
```ts
export async function readGovernanceDashboardBundle(...) { ... }
export async function readExecutableActionCatalog(...) { ... }
export async function readBlockedActionDiagnostics(...) { ... }
export async function readPluginGovernanceLifecycle(...) { ... }
```

**How to apply in Phase 71:** `/settings/plugins` 新 UI 读模型继续从 registry bundle 拿；built-in/external 双分区、retain recover badge、upgrade blocker summary 最好从 bundle 层一次成型。

---

### `src/features/platform-core/commands/handlers/plugins.ts` (service, request-response)

**Analog:** `src/features/platform-core/commands/handlers/plugins.ts`

**Authorization split pattern** (`src/features/platform-core/commands/handlers/plugins.ts:62-94`)
```ts
if (command.actor.actorScope === "operator") {
  const memberships = await getUserMembershipsDTO(user.id);
  const operatorMemberships = activeMemberships.filter(
    (membership) => membership.role === "admin" || membership.role === "developer",
  );
  ...
}
```

**Install command -> DAL tx pattern** (`src/features/platform-core/commands/handlers/plugins.ts:194-241`)
```ts
const record = await db.transaction(async (tx) => installOrReconcilePluginWithTx({
  schoolId: command.payload.schoolId,
  pluginId: command.payload.existingRegistrationId,
  name: command.payload.name,
  installSource: command.payload.installSource,
  manifestJson,
  actorId: command.actor.actorId,
  actorScope: command.actor.actorScope,
  tx,
  commandContext: createCommandContext(input),
}));
```

**Preflight / uninstall command pattern** (`src/features/platform-core/commands/handlers/plugins.ts:572-654`)
```ts
const result = await db.transaction(async (tx) => preflightUninstallPluginWithTx({ ... }));

if (command.payload.retentionMode === "cleanup" && !command.payload.confirmationToken) {
  throwCommandFailure({
    message: "PLUGIN_CLEANUP_CONFIRMATION_REQUIRED",
    reasonCode: "cleanup_confirmation_required",
    recommendedRecoveryAction: "confirm_cleanup",
  });
}

const record = await db.transaction(async (tx) => uninstallPluginWithTx({ ... }));
```

**Retry-by-replay pattern** (`src/features/platform-core/commands/handlers/plugins.ts:672-909`)
```ts
const existing = await loadRetriedCommand(command.payload.commandId);
switch (existing.commandType as PlatformCommandType) {
  case "plugin.install": { ... }
  case "plugin.uninstall": { ... }
}
```

**How to apply in Phase 71:** install/upgrade/uninstall/recover 都继续走 command handler 编排；尤其 upgrade execute 很适合复制这里的 `authorize -> tx -> resultSummary -> invalidation tags -> emittedEvents` 结构。

---

### `src/components/surfaces/plugin-lifecycle-operator-surface.tsx` (component, request-response)

**Analog:** `src/components/surfaces/plugin-lifecycle-operator-surface.tsx`

**Client surface mutation state pattern** (`src/components/surfaces/plugin-lifecycle-operator-surface.tsx:110-128,187-208,325-349`)
```tsx
const [isPending, startTransition] = useTransition();
const [inlineError, setInlineError] = useState<Record<string, string | null>>({});
const [preflightResults, setPreflightResults] = useState<Record<string, PreflightUninstallPluginResult>>({});

startTransition(async () => {
  const result = await preflightUninstallPluginAction({ pluginId: plugin.pluginId, schoolId });
  if (!result.success || !result.data) {
    setInlineError(...)
    return;
  }
  setPreflightResults(...)
});
```

**Dialog + destructive confirmation pattern** (`src/components/surfaces/plugin-lifecycle-operator-surface.tsx:748-840`)
```tsx
<dialog ref={dialogRef} className={getNativeDialogClassName("lg", "min-w-[20rem]")}>
  ...
  <label className="mt-3 flex items-start gap-3 text-sm text-on-surface">
    <input aria-label="改为 cleanup 卸载" type="checkbox" ... />
    <span>改为 cleanup 卸载，清理 lesson / lesson step / resource / plugin-owned data。</span>
  </label>
```

**How to apply in Phase 71:** 如果 planner 选择在 `/settings/plugins` 用 drawer/detail panel 承载 upgrade preflight 或 uninstall confirm，直接复用这里的 `useTransition + inlineError + dialog/preflight state` 处理方式。

---

### `src/components/surfaces/plugin-marketplace-surface.test.tsx` (test, request-response)

**Analog:** `src/components/surfaces/plugin-marketplace-surface.test.tsx`

**Mock-at-boundary pattern** (`src/components/surfaces/plugin-marketplace-surface.test.tsx:8-39`)
```tsx
const pluginActionMocks = vi.hoisted(() => ({
  listPluginsAction: vi.fn(async () => ({ success: true, data: [...] })),
  setPluginEnabledAction: vi.fn(),
}));

vi.mock("@/actions/plugin-actions", () => ({
  listPluginsAction: pluginActionMocks.listPluginsAction,
  setPluginEnabledAction: pluginActionMocks.setPluginEnabledAction,
}));
```

**Behavior assertion style** (`src/components/surfaces/plugin-marketplace-surface.test.tsx:51-83`)
```tsx
render(await PluginMarketplaceSurface());
expect(screen.getByText("仅启用 / 停用，无删除语义")).toBeTruthy();
fireEvent.submit(screen.getByRole("button", { name: "停用环节" }).closest("form")!);
await waitFor(() => {
  expect(pluginActionMocks.setPluginEnabledAction).toHaveBeenCalledWith({ ... });
});
```

**How to apply in Phase 71:** 新增 dual-section、external card 内联拒因、recover badge、upgrade-preflight-first 断言时，保持当前 SSR render + action mock + visible copy assertion 风格。

---

### `src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx` (test, request-response)

**Analog:** `src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx`

**Rich dashboard fixture pattern** (`src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx:67-542`)
```tsx
const dashboardBundle: GovernanceDashboardBundle = {
  executableActionCatalog: [...],
  blockedActionDiagnostics: [...],
  pluginLifecycleRows: [...],
};
```

**Cleanup confirmation flow assertion** (`src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx:643-717`)
```tsx
fireEvent.click(within(externalPluginCard!).getByRole("button", { name: "打开卸载确认" }));
...
fireEvent.click(screen.getByRole("checkbox", { name: "改为 cleanup 卸载" }));
fireEvent.click(screen.getByRole("checkbox", { name: "我已确认 cleanup" }));
fireEvent.click(screen.getByRole("button", { name: "确认卸载插件" }));
await waitFor(() => {
  expect(pluginActionMocks.uninstallPluginAction).toHaveBeenLastCalledWith({
    pluginId: "plugin-ext",
    schoolId: "school-1",
    retentionMode: "cleanup",
    confirmationToken: "cleanup:plugin-ext:1:2:1:3:7",
  });
});
```

**Retain-uninstalled audit-only card assertion** (`src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx:911-932`)
```tsx
expect(within(pluginCard!).getAllByText("已卸载").length).toBeGreaterThan(0);
expect(within(pluginCard!).queryByRole("button", { name: "启用插件" })).toBeNull();
```

**How to apply in Phase 71:** 如果 marketplace 直接展示 retained/recover/blocked 状态，测试里继续用大 fixture 覆盖多 posture；尤其可复制 cleanup/retain/uninstalled card 断言方式。

---

### `src/lib/dal/plugins.test.ts` (test, CRUD)

**Analog:** `src/lib/dal/plugins.test.ts`

**Source seam guard pattern** (`src/lib/dal/plugins.test.ts:728-746`)
```ts
await installOrReconcilePluginWithTx({
  ...,
  actorScope: "system",
});

expect(assertActiveTeacher).not.toHaveBeenCalled();
```

**Preflight count assertions** (`src/lib/dal/plugins.test.ts:748-772,914-932`)
```ts
const result = await preflightUninstallPlugin({ ... });
expect(result).toMatchObject({
  blocked: false,
  lessonExtCount: 1,
  stepExtCount: 2,
  resourceExtCount: 1,
  ownedBusinessCount: 2,
  totalCount: 6,
});
```

**Retain/cleanup execution assertions** (`src/lib/dal/plugins.test.ts:886-909,935-1009`)
```ts
const result = await uninstallPluginWithTx({ ..., retentionMode: "cleanup", confirmationToken: "cleanup:plugin-1:1:0:0:0:1" });
expect(dbDelete).toHaveBeenCalled();

await expect(uninstallPluginWithTx({ ..., retentionMode: "cleanup", confirmationToken: "cleanup:plugin-1:0:0:0:0:0" }))
  .rejects.toThrow("PLUGIN_CLEANUP_CONFIRMATION_REQUIRED");
```

**How to apply in Phase 71:** 新增 structured quiz impact counts、active classroom blocker、retain-recover path、upgrade verify-failure old-version-safe 时，都应先加 DAL tests，沿用 `toMatchObject` + tx mock + thrown token 断言。

---

### `src/actions/plugin-actions.test.ts` (test, request-response)

**Analog:** `src/actions/plugin-actions.test.ts`

**Server action mock structure** (`src/actions/plugin-actions.test.ts:11-45,76-100`)
```ts
const mockGovernanceProducer = vi.hoisted(() => ({
  dispatchPluginGovernanceCommand: vi.fn(),
}));

vi.mock("next/cache", () => ({ updateTag }));
vi.mock("@/features/platform-core/commands/producers/plugin-governance", () => mockGovernanceProducer);
```

**Command payload + tag assertions** (`src/actions/plugin-actions.test.ts:130-166,830-881,894-934`)
```ts
expect(mockGovernanceProducer.dispatchPluginGovernanceCommand).toHaveBeenCalledWith({
  type: "plugin.install",
  actor: { actorId: "user-1", actorScope: "teacher" },
  ...
});
expect(updateTag).toHaveBeenCalledWith("plugin:registry");

expect(mockGovernanceProducer.dispatchPluginGovernanceCommand).toHaveBeenLastCalledWith(
  expect.objectContaining({
    payload: {
      schoolId: "school-1",
      pluginId: "plugin-1",
      retentionMode: "cleanup",
      confirmationToken: "cleanup:plugin-1:1:2:3:4:10",
    },
  }),
);
```

**How to apply in Phase 71:** 新 action 的首选测试是“发了什么 command + 打了哪些 cache tag + 保留了哪些 token”；不要把 UI 文案测试挤进 action test。

---

### `src/lib/plugins/external-catalog.ts` (utility, transform)

**Analog:** `plugins/quiz-sample/manifest.ts`, `plugins/quiz-sample/data-model.ts`

**Checked-in plugin contract pattern** (`plugins/quiz-sample/manifest.ts:1-60`, `plugins/quiz-sample/data-model.ts:1-120`)
```ts
export const quizSampleManifest = { ... }
export const quizSampleDataModel = { ... }
```

**How to apply in Phase 71:** external catalog 应继续用 checked-in constants 承载 manifest/version inventory，不引入远程 marketplace service；每个 external entry 复用现有 plugin manifest + dataModel 的静态声明结构，便于 install preflight 直接消费。

---

### `src/features/platform-core/commands/contracts.ts` (contract, transform)

**Analog:** `src/features/platform-core/commands/contracts.ts`

**Discriminated-union command contract pattern** (`src/features/platform-core/commands/contracts.ts:1-220`)
```ts
export const SomeCommandSchema = z.object({
  type: z.literal("...")
})
```

**How to apply in Phase 71:** `plugin.upgrade.preflight` 与 `plugin.upgrade` 要沿用现有 contracts 文件的 Zod schema + discriminated union 扩展模式，而不是在 handler 内隐式约定 payload 结构。

---

### `src/features/platform-core/commands/handlers/plugins.test.ts` (test, request-response)

**Analog:** `src/features/platform-core/commands/handlers/plugins.test.ts`

**Command handler regression pattern** (`src/features/platform-core/commands/handlers/plugins.test.ts:1-220`)
```ts
describe("plugin command handlers", () => {
  it("dispatches through the governed command path", async () => {
    ...
  })
})
```

**How to apply in Phase 71:** upgrade preflight / execute 的 command tests 应复用现有 handler 测试风格，断言 authorization、DAL orchestration、resultSummary 与 failure token，而不是把这些断言全部推给 action test。

---

### `scripts/lib/phase71-marketplace-fixtures.ts` (test-helper, batch / CRUD)

**Analog:** `scripts/verify-phase69-quiz-sample.ts`, `scripts/verify-phase70-quiz-stats.ts`

**Isolated SQLite seeding pattern** (`scripts/verify-phase69-quiz-sample.ts:10-90`, `scripts/verify-phase70-quiz-stats.ts:56-160`)
```ts
const DB_PATH = path.join("/tmp/opencode", `phase69-verify-${randomUUID()}.db`)
process.env.DB_FILE_NAME = `file:${DB_PATH}`
await materializeDrizzleMigrations(`file:${DB_PATH}`)
await seedFixtures(seedClient)
```

**How to apply in Phase 71:** fixture helper 应抽出 `create isolated db + run migrations + seed deterministic lifecycle rows` 三件事，供 `verify-phase71` 和后续 lifecycle tests 共用，避免把 retained/live/ended fixture 重复散落在多个脚本里。

---

### `package.json` (config, transform)

**Analog:** `package.json`

**Phase verifier script registration pattern** (`package.json` scripts section)
```json
{
  "scripts": {
    "verify:phase69": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase69-quiz-sample.ts",
    "verify:phase70": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase70-quiz-stats.ts"
  }
}
```

**How to apply in Phase 71:** `verify:phase71` 必须沿用既有 `server-only-node-shim.cjs + tsx script` 注册模式，保持 milestone phase verifier 的统一入口风格。

---

### `scripts/verify-phase71-marketplace-lifecycle.ts` (test, batch)

**Analog:** `scripts/verify-phase48-lifecycle-and-uninstall.ts`, `scripts/verify-phase69-quiz-sample.ts`, `scripts/verify-phase70-quiz-stats.ts`

**Focused suite runner pattern** (`scripts/verify-phase48-lifecycle-and-uninstall.ts:15-55,129-224`)
```ts
function runVitest(paths: readonly string[], label: string): void { ... }

console.log("[2/4] Running Phase 48 DAL/action behavior tests...");
runVitest([
  "src/lib/dal/plugins.test.ts",
  "src/actions/plugin-actions.test.ts",
], "Phase 48 DAL & action behavior tests");
```

**Real SQLite proof pattern** (`scripts/verify-phase69-quiz-sample.ts:10-24,158-317`)
```ts
const DB_PATH = path.join("/tmp/opencode", `phase69-verify-${randomUUID()}.db`);
process.env.DB_FILE_NAME = `file:${DB_PATH}`;

const seedClient = await materializeDrizzleMigrations(`file:${DB_PATH}`);
await seedFixtures(seedClient);
...
assert(responseRows.length === 2, `expected 2 response rows after re-answer, got ${responseRows.length}`);
```

**Static contract assertion pattern** (`scripts/verify-phase70-quiz-stats.ts:9-55`)
```ts
const dalSource = readFileSync("src/lib/dal/classroom.ts", "utf8");
assert(dalSource.includes("pluginOwnedQuizResponses"), "quiz sample recap must read plugin-owned responses");
```

**How to apply in Phase 71:** verifier 应混合三种模式：
1. 静态 seam 检查（新 command/action/route/script 是否接通）
2. focused vitest 子集
3. isolated SQLite 真数据 proof（seed quiz data -> upgrade -> verify -> retain -> recover -> cleanup -> live-session block）

## Shared Patterns

### Server Action 边界
**Source:** `src/actions/plugin-actions.ts:23-85,160-191`
**Apply to:** 所有 Phase 71 install/upgrade/uninstall/recover/preflight actions
```ts
const SomeSchema = z.object({ ... });
const parsed = SomeSchema.safeParse(data);
if (!parsed.success) return { success: false, error: parsed.error.message };

const actorId = await requireCurrentActorId();
const result = await dispatchPluginGovernanceCommand({ ... });
updateTag(cacheTags.pluginRegistry);
```

### 安装冲突与命名空间治理
**Source:** `src/lib/dal/plugins.ts:553-596`
**Apply to:** external install preflight / recover install
```ts
const parsedManifest = PluginManifestSchema.parse(input.manifestJson);
const pluginKey = parsedManifest.id;
const derivedNamespace = deriveDbNamespace(pluginKey);

if (pluginKeyConflict) {
  throw new Error(PLUGIN_KEY_CONFLICT);
}
if (namespaceConflict) {
  throw new Error(PLUGIN_DB_NAMESPACE_CONFLICT);
}
```

### Retain/Cleanup token
**Source:** `src/lib/dal/plugins.ts:468-477,1119-1122`
**Apply to:** uninstall preflight + cleanup execute
```ts
return `cleanup:${input.pluginId}:${input.lessonExtCount}:${input.stepExtCount}:${input.resourceExtCount}:${input.ownedBusinessCount}:${input.totalCount}`;

if (input.confirmationToken !== preflight.cleanupConfirmationToken) {
  throw new Error("PLUGIN_CLEANUP_CONFIRMATION_REQUIRED");
}
```

### Upgrade 三段式
**Source:** `src/lib/dal/plugin-migration.ts:393-399,415-471`
**Apply to:** semver upgrade execute
```ts
const verifyRes = await verifyBackfillData(...);
if (!verifyRes.matches) {
  throw new Error(`CUTOVER_ABORTED: ...`);
}

await db.transaction(async (tx) => {
  ...
  throw new Error(`CUTOVER_FAILED_TRANSACTION_ROLLBACK: ${reason}`);
});
```

### Projection-first UI posture
**Source:** `src/features/platform-core/plugins/governance-projection.ts:157-217`, `src/features/platform-core/actions/registry.ts:221-267`
**Apply to:** marketplace dual-section status rows / retained recover badge / blocker summary
```ts
if (plugin.uninstallRetentionMode === "retain" && plugin.uninstalledAt !== null) {
  reasonCode = "not_installed";
}

return {
  pluginLifecycleRows: Array.from(bundle.pluginsById.values()).flatMap((plugin) => { ... })
}
```

### Active classroom 真约束
**Source:** `src/lib/dal/classroom.ts:4283-4295,4341-4344`
**Apply to:** upgrade/uninstall preflight + execute guard
```ts
status: "live",

if (session.status !== "live") throw new Error("CLASSROOM_ENDED");
```

## No Analog Found

| File / Concern | Role | Data Flow | Reason |
|---|---|---|---|
| active-classroom occupancy list within plugin uninstall/upgrade preflight | service | request-response | repo 有 `classroomSessions.status` 真相与 live guard，但没有“按 plugin usage 列出受影响课堂/会话”的现成 DAL 聚合；Phase 71 需在 `plugins.ts` 基于 `classroom.ts`/schema 现有状态模型补一层新查询。 |

## Metadata

**Analog search scope:** `src/components/surfaces`, `src/app/settings`, `src/actions`, `src/lib/dal`, `src/features/platform-core`, `scripts`, `plugins`, `src/db/schema/generated/plugin-owned`  
**Files scanned closely:** 15  
**Pattern extraction date:** 2026-06-04
