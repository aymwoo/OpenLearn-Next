# Phase 58: Operator Recovery & Production Surfaces - Pattern Map

**Mapped:** 2026-05-26
**Focus:** 仅覆盖 verification 里的两个 blocker gap closure
**Files analyzed:** 10
**Analogs found:** 9 / 10

## Gap Scope

本次只收口两条硬阻塞：

1. `plugin/action` deep link 指向不存在 route，`PluginLifecycleOperatorSurface` 仍是 orphaned surface。
2. operator/admin/developer 无法通过真正的 operator scope 执行 plugin `resume` / `suspend` / `fallback`，当前 mutation 仍落到 teacher-scoped 路径。

## File Classification

| 最可能修改/新增文件 | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/settings/labs/plugins/[pluginId]/page.tsx` | route | request-response | `src/app/settings/labs/commands/[commandId]/page.tsx` | exact-ish |
| `src/app/settings/labs/plugins/[pluginId]/actions/[actionKey]/page.tsx` | route | request-response | `src/app/settings/labs/async-tasks/[taskId]/page.tsx` + `src/app/settings/labs/commands/[commandId]/page.tsx` | partial |
| `src/lib/dal/classroom-incident-operator.ts` | DAL | request-response | `src/lib/dal/classroom-incident-list.ts` + 当前文件自身 | exact |
| `src/components/surfaces/plugin-lifecycle-operator-surface.tsx` | component/surface | event-driven | 当前文件自身 | exact |
| `src/actions/plugin-actions.ts` | server action | request-response | `src/actions/async-task-operator-actions.ts` + 当前文件自身 | role-match |
| `src/actions/operator-posture-recovery-actions.ts` | server action | request-response | 当前文件自身 + `src/actions/operator-classroom-recovery-actions.ts` | exact |
| `src/features/runtime-platform/contracts/permissions.ts` | contract/config | transform | 当前文件自身 | exact |
| `src/features/platform-core/commands/handlers/plugins.ts` | command handler | event-driven | 当前文件自身 + `src/lib/dal/runtime-inspector.ts` scope pattern | role-match |
| `scripts/verify-phase58-operator-recovery-and-surfaces.ts` | verifier script | batch | 当前文件自身 + `scripts/verify-phase57-classroom-runtime.ts` + `scripts/verify-phase52-action-registry-and-lifecycle.ts` | exact |
| `scripts/verify-phase58-operator-recovery-and-surfaces.test.ts` | test | batch | 当前文件自身 | exact |

## Pattern Assignments

### 1) `src/app/settings/labs/plugins/[pluginId]/page.tsx`（新增 route, request-response）

**首选类比：** `src/app/settings/labs/commands/[commandId]/page.tsx:1-30`

**可直接复制的 thin page 模式**

```ts
import { notFound } from "next/navigation";

import { PlatformCommandOperatorDetailSurface } from "@/components/surfaces/platform-command-operator-detail-surface";
import { getPlatformCommandWithTimeline } from "@/features/platform-core/observability/operator-read-model";
import { getCurrentUserSchoolIds } from "@/lib/dal/auth";

const schoolIds = await getCurrentUserSchoolIds();
const detail = await getPlatformCommandWithTimeline({ commandId, schoolIds });

if (!detail.command) {
  notFound();
}
```

**应用方式**
- route 只做 `params -> server read model -> notFound -> surface render`。
- 不在 page 里拼 plugin/action/command/task 多份请求。
- page 应保持和 `incidents/[sessionId]/page.tsx:1-15` 一样薄。

**应避免的反模式**
- 不要仿照 `src/app/settings/plugins/page.tsx:1-10`，那个 route 只挂 `PluginMarketplaceSurface`，是 discovery/marketplace，不是 operator governance detail。

---

### 2) `src/app/settings/labs/plugins/[pluginId]/actions/[actionKey]/page.tsx`（新增 route, request-response）

**首选类比：**
- `src/app/settings/labs/async-tasks/[taskId]/page.tsx:1-13`
- `src/app/settings/labs/commands/[commandId]/page.tsx:1-30`

**可复用的 detail route 组合模式**

```ts
import { AsyncTaskOperatorDetailSurface } from "@/components/surfaces/async-task-operator-detail-surface";
import { getAsyncTaskOperatorDetailDTO } from "@/lib/dal/async-task-operator";

const detail = await getAsyncTaskOperatorDetailDTO({ taskId });

return <AsyncTaskOperatorDetailSurface detail={detail} />;
```

**应用方式**
- 新 action detail route 应继续是 thin page。
- 若 planner 选择复用 `PluginLifecycleOperatorSurface` 做 filtered detail host，page 负责传 `pluginId/actionKey`；filtering/disabled reason 留在 surface 或 server DTO。
- 若 planner 选择新建更薄的 action detail surface，也应沿用 `summary -> confirm -> next step` 节奏，不做 raw log page。

**无现成 exact analog**
- 仓库里还没有 `plugin action detail route`。
- 直接组合 `command detail route` 的 page 壳 + `async detail` 的 summary-first 承载，是当前最接近模式。

---

### 3) `src/lib/dal/classroom-incident-operator.ts`（修改 href 组装）

**首选类比：** 当前文件自身 `:98-110` + `src/lib/dal/classroom-incident-list.ts:170-192`

**当前 broken href 片段（要改，不要再复制）**

```ts
const pluginHref = incident.pluginId
  ? `/settings/labs/plugins/${incident.pluginId}`
  : `/settings/labs/incidents/${session.id}`;
const pluginActionHref = incident.pluginId && incident.pluginActionKey
  ? `/settings/labs/plugins/${incident.pluginId}/actions/${incident.pluginActionKey}`
  : pluginHref;
```

**relation chip 模式**（可继续沿用）

```ts
{
  kind: "command",
  label: commandSummary ?? latestCommand.commandType,
  href: `/settings/labs/commands/${latestCommand.commandId}`,
}
```

**应用方式**
- 所有 `detailHref / nextStepHref` 继续在 DAL 中统一生成，别把 href 拼接下沉到 UI。
- 只有在 route 真存在时，incident DTO 才应该吐出稳定 plugin/action href。
- 若 planner 先临时收敛到已有 route，也必须在同一个 DAL 文件里统一收口，不要让 surface 自己 fallback。

**应避免的反模式**
- `verification` 已证明：生成不存在的 href 会让 OPS-01/PLUG-03 直接失效。
- 不要把 raw `pluginId/actionKey` 扔给前端再让组件自行决定跳哪里。

---

### 4) `src/components/surfaces/plugin-lifecycle-operator-surface.tsx`（必须挂到正式 route）

**首选类比：** 当前文件自身 `:146-155`, `:493-509`, `:571-658`

**可直接复用的 executable vs diagnostics split**

```ts
const executablePlugins = useMemo(
  () => dashboard.pluginLifecycleRows.filter((plugin) => plugin.executableActionCatalog.length > 0),
  [dashboard.pluginLifecycleRows],
);
const diagnosticPlugins = useMemo(
  () => dashboard.pluginLifecycleRows.filter(
    (plugin) => plugin.blockedActionDiagnostics.length > 0 || plugin.blocked,
  ),
  [dashboard.pluginLifecycleRows],
);
```

**可直接复用的 honesty 卡模式**

```ts
const honestyCard = toPluginLifecycleHonestyCard(plugin);

return honestyCard ? (
  <div>
    {honestyCard.sections.map((section) => (
      <p key={section.id}>
        <span className="font-medium">{section.label}：</span>
        {section.content}
      </p>
    ))}
  </div>
) : null;
```

**可直接复用的高风险 detail confirm 模式**

```ts
{activeDetailConfirm ? (
  <div>
    <p>影响范围</p>
    <p>姿态变化</p>
    <p>将写入的审计记录</p>
    <Button onClick={() => submitHighRiskRecoveryAction(plugin, activeDetailConfirm.action)}>
      确认...
    </Button>
  </div>
) : null}
```

**应用方式**
- 最小正确修复是：让正式 page/route 导入并渲染这个 surface，而不是重写一套 plugin governance UI。
- route 层应给它喂 server-owned dashboard / plugin lifecycle read model；surface 继续负责 diagnostics host 和高风险确认。
- 如果新增 action detail route，优先让它继续复用这套 confirm host，而不是另写一套 button + dialog。

**应避免的反模式**
- 当前最大反模式不是组件本身，而是“只有测试 import，页面没有 import”。
- 不要改成 marketplace card；`src/components/surfaces/plugin-marketplace-surface.tsx:14-25,106-115` 是 teacher discovery/toggle，不是 operator detail。

---

### 5) `src/actions/plugin-actions.ts`（operator-scope 写路径）

**首选类比：**
- 缓存/Server Action 入口：`src/actions/async-task-operator-actions.ts:54-69`
- operator scope 解析：`src/lib/dal/runtime-inspector.ts:37-69`、`src/lib/dal/classroom-incident-operator.ts:32-53`、`src/lib/dal/async-task-operator.ts:55-82`

**可复用的 operator scope 解析模式**

```ts
const memberships = await getUserMembershipsDTO(user.id);
const activeMemberships = memberships.filter((membership) => membership.status === "active");
const schoolIds = [...new Set(activeMemberships.map((membership) => membership.schoolId))];

if (activeMemberships.some((membership) => membership.role === "developer")) {
  return { role: "developer", schoolIds };
}

if (activeMemberships.some((membership) => membership.role === "admin")) {
  return { role: "admin", schoolIds };
}
```

**可复用的 Server Action invalidation 模式**

```ts
const result = await retryAsyncTaskForOperator(parsed.data);
updateTag(cacheTags.asyncTask(result.taskId));
updateTag(cacheTags.asyncTaskEntity(result.entityType, result.entityId));
updateTag(cacheTags.asyncTaskList(result.actorId));
revalidatePath("/settings/labs/async-tasks");
revalidatePath(`/settings/labs/async-tasks/${result.taskId}`);
```

**当前必须避免复制的 teacher-only 反模式**

```ts
const memberships = (await getUserMembershipsDTO(actorId)).filter(
  (membership) => membership.status === "active" && membership.role === "teacher",
);
```

以及这些 dispatch：

```ts
actor: { actorId, actorScope: "teacher" }
```

`src/actions/plugin-actions.ts:104-121` 与 `:136-153`, `:171-186`, `:221-252`, `:268-280`, `:296-308`, `:325-337`, `:428-440`, `:456-463` 都体现了当前 teacher 绑定。

**应用方式**
- 继续保留当前 action entrypoint + `dispatchPluginGovernanceCommand()` + `updateTag()` 结构。
- 但 scope 解析不能再只认 `teacher`；要复用现有 admin/developer school-scoped operator 模式。
- mutation 入口自己承担 tag/path freshness，不要把 freshness 推给 `router.refresh()`。

---

### 6) `src/actions/operator-posture-recovery-actions.ts`（薄包装，但不能再委托 teacher-only action）

**首选类比：** 当前文件 `:47-91` + `src/actions/operator-classroom-recovery-actions.ts:15-43`

**可直接复用的薄包装结构**

```ts
const parsed = OperatorPostureRecoveryInputSchema.safeParse(input);
if (!parsed.success) {
  return { success: false, error: parsed.error.message };
}

updateTag(cacheTags.pluginRegistry);
updateTag(cacheTags.plugin(parsed.data.pluginId));
revalidateAll(parsed.data.revalidatePaths);
```

**当前必须避免复制的反模式**

```ts
const result = parsed.data.recoveryAction === "fallback"
  ? await setPluginKillSwitchAction(...)
  : await transitionPluginLifecycleAction(...)
```

这里的问题不是 wrapper 本身，而是它继续委托到 teacher-scoped `plugin-actions.ts`。

**应用方式**
- 保持 `operator-posture-recovery-actions.ts` 作为高风险 detail confirm 的统一入口。
- 但 plugin 分支必须调用“operator-safe plugin mutation seam”，不能继续间接走 teacher-only action。
- 继续在 entrypoint 做 `updateTag` / `revalidatePath`，和 `operator-classroom-recovery-actions.ts:39-41` 保持一致。

---

### 7) `src/features/runtime-platform/contracts/permissions.ts` + `src/features/platform-core/commands/handlers/plugins.ts`（真正 operator scope 的接口约束）

**首选类比：**
- 当前 actor scope 合同：`src/features/runtime-platform/contracts/permissions.ts:30-31,57-60`
- 当前 plugin handler 授权：`src/features/platform-core/commands/handlers/plugins.ts:59-69`

**当前接口约束**

```ts
export const RuntimeActorScopeValues = ["host", "teacher", "student", "plugin", "system"] as const;
export const RuntimeActorScopeSchema = z.enum(RuntimeActorScopeValues);
```

```ts
if (command.actor.actorScope === "system") {
  return;
}

const scope = await assertActiveTeacher();

if (scope.userId !== command.actor.actorId || !scope.schoolIds.includes(command.scope.schoolId)) {
  throw new Error("TEACHER_AUTH_REQUIRED");
}
```

**应用方式**
- 如果 planner 选择“真实 operator scope”，这里是必须一起收口的接口边界。
- 光改 `plugin-actions.ts` 不够；handler 仍会把非 system/teacher actor 挡掉。
- 最接近的正向授权模式是 runtime-inspector/async operator/classroom incident 的 `admin/developer + schoolIds` 解析，而不是再发明第三套。

**应避免的反模式**
- 不要只改 UI 文案或 wrapper 名字，底层 actorScope/authorize 仍是 teacher。
- 不要只在 verifier 里断言“operator”字样，代码路径却没有真实 operator authz。

---

### 8) `scripts/verify-phase58-operator-recovery-and-surfaces.ts`（route existence / scope / proof hard gate）

**首选类比：**
- 当前 Phase 58 verifier：`scripts/verify-phase58-operator-recovery-and-surfaces.ts:105-212,220-263`
- 阶段化 gate 节奏：`scripts/verify-phase57-classroom-runtime.ts:120-146`
- 静态 token 断言写法：`scripts/verify-phase52-action-registry-and-lifecycle.ts:95-245`

**可直接复用的 route existence 模式**

```ts
commandDetailRouteExists: existsSync(
  path.join(process.cwd(), "src/app/settings/labs/commands/[commandId]/page.tsx"),
),
```

**可直接复用的静态 close-gate 模式**

```ts
const staticChecks = evaluatePhase58StaticChecks({...});
const failedChecks = staticChecks.filter((check) => !check.passed);
if (failedChecks.length > 0) {
  process.exit(1);
}
```

**可直接复用的 proof hard gate 模式**

```ts
runVitest(getPhase58VerificationSuitePaths(), "...");
run(process.execPath, [
  "--require",
  "./scripts/server-only-node-shim.cjs",
  "--import",
  "tsx",
  "scripts/proof-phase58-operator-recovery.ts",
], "...");
```

**本次 gap closure 应新增的硬检查**
- plugin route existence：`src/app/settings/labs/plugins/[pluginId]/page.tsx`
- plugin action route existence：`src/app/settings/labs/plugins/[pluginId]/actions/[actionKey]/page.tsx`
- route 挂载而非 orphan：检查 page source 真正 import/render `PluginLifecycleOperatorSurface`
- operator scope 真正落地：检查 `plugin-actions.ts` 不再只过滤 `membership.role === "teacher"`，且不再统一写死 `actorScope: "teacher"`

**应避免的反模式**
- verifier 只检查 token 存在，不检查 route 文件存在。
- verifier 只检查 surface 文件存在，不检查 page 是否挂载。
- verifier 只检查“operator”命名，不检查实际 authz/scope 分支。

---

### 9) `scripts/verify-phase58-operator-recovery-and-surfaces.test.ts`（verifier 自测）

**首选类比：** 当前文件 `:42-116`

**可复用模式**

```ts
const checks = evaluatePhase58StaticChecks({ ...mock sources... });
expect(checks).toHaveLength(8);
expect(checks.every((check) => check.passed)).toBe(true);
```

**应用方式**
- 当 verifier 新增 plugin routes / operator scope 检查时，自测也要同步加 mock token 与 routeExists 布尔值。
- 继续把 verifier 自测写成纯 source-string contract test，不需要真实启动 app。

## Shared Patterns

### A. `/settings/labs/...` detail route 一律薄 page + server-owned read model
**来源：**
- `src/app/settings/labs/commands/[commandId]/page.tsx:1-30`
- `src/app/settings/labs/incidents/[sessionId]/page.tsx:1-15`
- `src/app/settings/labs/async-tasks/[taskId]/page.tsx:1-13`

**统一做法**
- page 只做 `params/searchParams -> DAL/read model -> notFound/fallback -> surface`。
- 不在 page 里做权限推断、数据拼接、客户端恢复逻辑。

### B. operator/admin/developer 授权沿用现有 school-scoped membership 解析
**来源：**
- `src/lib/dal/runtime-inspector.ts:37-69,71-90`
- `src/lib/dal/async-task-operator.ts:55-82`
- `src/lib/dal/classroom-incident-operator.ts:32-53`

**统一做法**
- active memberships
- `developer` 优先，其次 `admin`
- 只在 `scope.schoolIds.includes(targetSchoolId)` 时放行

### C. Server Action 自己负责 freshness
**来源：**
- `src/actions/async-task-operator-actions.ts:62-69`
- `src/actions/operator-classroom-recovery-actions.ts:25-43`
- `src/actions/plugin-actions.ts:124-127,187-201,253-255,338-340,441-443`

**统一做法**
- mutation 成功后立刻 `updateTag()`
- 对 operator detail/list route 一起 `revalidatePath()`

### D. 高风险恢复动作只在 detail confirm host 内完成
**来源：**
- `src/components/surfaces/platform-command-operator-detail-surface.tsx:165-248`
- `src/components/surfaces/plugin-lifecycle-operator-surface.tsx:601-657`

**统一做法**
- 必须展示：`影响范围` / `姿态变化` / `将写入的审计记录`
- summary surface 只能导流，不应直接执行 posture-changing mutation

### E. verifier = static checks + focused suites + proof hard gate
**来源：**
- `scripts/verify-phase58-operator-recovery-and-surfaces.ts:215-263`
- `scripts/verify-phase57-classroom-runtime.ts:120-146`

**统一做法**
- 先静态挡回 route/orphan/scope 回退
- 再跑 focused Vitest
- 最后跑 proof script

## 应避免直接复制的反模式

| 来源文件 | 不要复制的内容 | 原因 |
|---|---|---|
| `src/actions/plugin-actions.ts:104-121` | `membership.role === "teacher"` 的 school 解析 | 会把 operator/admin/developer 写路径重新打回 teacher scope |
| `src/actions/plugin-actions.ts:136-153` 等 | `actorScope: "teacher"` | 与 verification blocker 2 完全同源 |
| `src/features/platform-core/commands/handlers/plugins.ts:59-69` | teacher/system 二选一授权 | 无法证明真实 operator scope 可执行 mutation |
| `src/app/settings/plugins/page.tsx:1-10` | 直接把 deep link 指向 marketplace | 这是发现页，不是 operator governance detail |
| `src/lib/dal/classroom-incident-operator.ts:98-103` | 输出不存在 route 的 href | verification 已证实会形成断链 |

## No Analog Found

| 文件 | Role | Data Flow | 说明 |
|---|---|---|---|
| `src/app/settings/labs/plugins/[pluginId]/actions/[actionKey]/page.tsx` | route | request-response | 仓库里没有 plugin action detail 的现成 route；应组合 command detail page 壳 + plugin governance confirm host 模式 |
| “真正 operator scope 的 plugin mutation seam” | server action / authz | request-response | 仓库里现有 plugin mutation 全是 teacher-scoped；需组合现有 operator scope 解析模式与 plugin command dispatch 模式 |

## Metadata

- **Analog search scope:** `src/app/settings/labs/**`, `src/components/surfaces/**`, `src/actions/**`, `src/lib/dal/**`, `src/features/platform-core/**`, `scripts/**`
- **重点读取文件:** route pages、plugin/action mutations、operator DAL scope、phase verifier scripts
- **结论:** 本次 gap closure 不需要新造 dashboard；应优先补齐 `labs plugin detail route + action detail route + operator-safe plugin auth path + verifier hard gate`。
