# 插件系统架构回顾

## Phase 11 implemented state

- `src/lib/dal/plugins.ts` 已提供 `setPluginEnabled`、`setPluginKillSwitch`、`listPluginsForSchool`、`getPluginForSchool`、`deletePluginForSchool`、`getEnabledPluginsForAnchor`、`runPluginHook`。
- `runPluginHook()` 现在在分发前强制检查学校隔离、成员资格和 manifest 权限；拒绝路径会记录 `permission_denied`、`school_mismatch`、`disabled`、`kill_switch`、`not_allowed` 等审计原因。
- `src/actions/plugin-actions.ts` 已在 action 边界使用 `PluginManifestSchema` 校验 manifest，不再以 `manifestJson: z.any()` 作为第一道用户输入边界。
- `src/components/plugins/plugin-renderer.tsx` 已将 `dashboard.widget` 与 `lesson.sidebar` 接入真实页面，并通过本地安全 widget 渲染 `stepSuggestion`、`lessonAnnotation`、`notificationStub`。
- `src/components/surfaces/settings-surface.tsx` 的 labs 区域已提供插件启用/停用控制，且仍然只走 Server Actions，不允许任意插件脚本执行。

### 明确不在 Phase 11 范围内

- 外部 plugin marketplace / registry
- arbitrary plugin JavaScript、WASM sandbox、remote dynamic import
- plugin-to-plugin communication
- plugin direct DB / Core API / provider-key access

> 下文“发现的问题/推荐修复优先级”保留为 Phase 11 之前的历史审计背景，不再代表当前实现状态。

## 架构总览

插件系统是一个**纯服务端**的扩展机制，以学校（school）为作用域。学校可以注册插件清单（manifest），声明 UI 锚点和允许的动作。当 hook 在指定锚点触发时，系统验证插件状态后通过 dispatcher 执行动作，并记录审计日志。

```
Client → Server Actions (plugin-actions.ts)
              ↓
         DAL (plugins.ts)
              ↓
      registry.ts (action dispatcher)
              ↓
    Drizzle ORM → SQLite
    (pluginRegistrations / pluginHookRuns / pluginActionAudits)
```

---

## 文件清单

| 文件 | 职责 |
|------|------|
| `src/db/schema.ts:586-613` | 数据库表定义：`pluginRegistrations`、`pluginHookRuns`、`pluginActionAudits` |
| `src/lib/dto/resource-ai.ts:125-159` | Zod schema：`PluginManifestSchema`、`PluginActionInputSchema`、`PluginRegistrationDTOSchema`、`PluginAuditDTOSchema` |
| `src/server/plugins/registry.ts` | Hook 锚点常量、动作允许列表常量、动作分发器 |
| `src/lib/dal/plugins.ts` | 数据访问层：注册、kill-switch、hook 执行、审计记录 |
| `src/actions/plugin-actions.ts` | Server Actions：客户端可调用的 DAL 封装 |
| `src/lib/cache-policy.ts:16-17` | 缓存标签：`pluginRegistry`、`plugin(id)` |

---

## 完整生命周期

### 阶段 1：注册（Registration）

**入口：** `registerPluginManifestAction()` — `plugin-actions.ts:27`

1. Server Action 验证输入（`RegisterPluginSchema`：schoolId、name、manifestJson）
2. 调用 DAL `registerPluginManifest()`
3. DAL 使用 `PluginManifestSchema.parse()` 解析并验证 manifest JSON
4. 插入 `pluginRegistrations` 行，**`enabled: false`**（强制禁用）、`killSwitchEnabled: false`
5. 刷新缓存标签 `plugin:registry`

### 阶段 2：启用控制

- **Kill-switch：** `setPluginKillSwitchAction()` — `plugin-actions.ts:40`，调用 `setPluginKillSwitch()` 切换 `killSwitchEnabled`
- **启用/禁用：** `enabled` 列存在于 schema 中，默认 `false`，但**没有对应的 API 可将其设为 `true`**

### 阶段 3：Hook 执行

**入口：** `runPluginHookAction()` — `plugin-actions.ts:54`，触发 `runPluginHook()` — `dal/plugins.ts:43`

执行顺序：
1. 按 pluginId 加载插件
2. **守卫 1：** 检查存在/已启用/未 kill-switch。任一失败 → 记录 "failed" hookRun + denied 审计，返回 null
3. **守卫 2：** 重新解析 manifest JSON，检查 `anchors.includes(hookAnchor)` 和 `actions.includes(input.action)`。任一失败 → 记录 "failed" hookRun + denied 审计，返回 null
4. **分发：** 调用 `dispatchPluginAction(input)`
5. **记录成功：** 插入 "success" hookRun + actionAudit

### 阶段 4：审计

- 每次 hook 调用生成一条 `pluginHookRuns` 行和一条 `pluginActionAudits` 行
- 失败时，审计载荷包含 `{ denied: true, reason: "not_found" | "disabled" | "kill_switch" | "not_allowed" }`
- 成功时，审计载荷包含 `{ ...input.payload, result }`

---

## 数据库 Schema

### pluginRegistrations (schema.ts:586-595)

| 列名 | 类型 | 备注 |
|------|------|------|
| id | text PK (UUID) | 自动生成 |
| schoolId | text FK → schools.id | 级联删除 |
| name | text NOT NULL | 人类可读标签 |
| manifestJson | text (JSON 模式) NOT NULL | 插件清单 |
| enabled | integer (boolean) | 默认 false |
| killSwitchEnabled | integer (boolean) | 默认 false |
| createdAt | integer (timestamp_ms) | 自动生成 |
| updatedAt | integer (timestamp_ms) | 自动生成 |

### pluginHookRuns (schema.ts:597-604)

| 列名 | 类型 | 备注 |
|------|------|------|
| id | text PK (UUID) | 自动生成 |
| pluginId | text FK → pluginRegistrations.id | 级联删除 |
| hookAnchor | text NOT NULL | 触发的锚点 |
| status | text enum: "success" / "failed" | 执行结果 |
| durationMs | integer NOT NULL | 总耗时（含两次数据库插入） |
| createdAt | integer (timestamp_ms) | 自动生成 |

### pluginActionAudits (schema.ts:606-613)

| 列名 | 类型 | 备注 |
|------|------|------|
| id | text PK (UUID) | 自动生成 |
| pluginId | text FK → pluginRegistrations.id | 级联删除 |
| action | text NOT NULL | 执行的动作 |
| payloadJson | text (JSON 模式) NOT NULL | 载荷 |
| actorId | text FK → users.id (nullable) | 操作者 |
| createdAt | integer (timestamp_ms) | 自动生成 |

---

## Manifest Schema (resource-ai.ts:125-131)

```typescript
PluginManifestSchema = z.object({
  id: z.string(),
  version: z.string(),
  permissions: z.array(z.string()).default([]),
  anchors: z.array(z.enum(["dashboard.widget", "lesson.sidebar"])),
  actions: z.array(z.enum([
    "addStepSuggestion",
    "annotateLesson",
    "createNotificationStub"
  ])),
})
```

### 已定义的 Hook 锚点

| 锚点 | 预期渲染位置 | 当前状态 |
|------|-------------|---------|
| `dashboard.widget` | 教师/学生仪表盘底部 | 未接入任何页面 |
| `lesson.sidebar` | 课时编辑器右侧栏 / 学生播放器侧栏 | 未接入任何页面 |

### Action Dispatcher (registry.ts:6-17)

纯同步函数，将动作名称映射为提案类型：

| 输入动作 | 输出 proposalType |
|---------|------------------|
| `addStepSuggestion` | `stepSuggestion` |
| `annotateLesson` | `lessonAnnotation` |
| `createNotificationStub` | `notificationStub` |
| (其他) | `unknown` + `{ denied: true }` |

---

## 发现的问题

### P0 — 阻断性

#### 1. 插件永远无法启用
**`dal/plugins.ts:16`** — 注册时强制 `enabled: false`。整个代码库中没有 `setPluginEnabled()` 函数或对应的 Server Action。`enabled` 列存在于 schema 中，但没有任何 API 路径能将其设为 `true`。插件系统实际上处于完全不可用状态。

#### 2. 权限声明从未执行
**`resource-ai.ts:128`** — `PluginManifestSchema.permissions` 是 `z.array(z.string()).default([])`。此字段存储在 manifest JSON 中，但在 `runPluginHook()` 中**从未被检查**。声明 `permissions: ["delete-everything"]` 的插件与声明 `permissions: []` 的插件被同等对待。

### P1 — 安全隐患

#### 3. 无学校隔离
**`dal/plugins.ts:43`** — `runPluginHook()` 接收 `actorId` 但从不验证操作者与插件属于同一学校。`pluginRegistrations.schoolId` 从未与 `memberships` 或任何认证表进行交叉引用。学校 A 的用户可以调用学校 B 注册的插件。

#### 4. Action 层将 manifest 放宽为 `z.any()`
**`plugin-actions.ts:13`** — `RegisterPluginSchema` 将 `manifestJson` 类型设为 `z.any()`，将所有结构验证推迟到 DAL。如果 DAL 的 `PluginManifestSchema.parse()` 抛出异常，错误被泛化捕获为 `error.message`，用户无法获得关于清单具体问题的结构性反馈。

### P2 — 完善性

#### 5. 每次 hook 运行时重复解析 manifest
**`dal/plugins.ts:62`** — `PluginManifestSchema.parse(plugin.manifestJson)` 在每次调用时执行，尽管清单在注册时已验证。不必要的 CPU 开销。

#### 6. 缺少插件列表/删除 API
DAL 只有 `registerPluginManifest()` 和 `setPluginKillSwitch()`。没有 `getPlugin()` / `listPlugins()` / `deletePlugin()`。系统可以创建插件，但永远无法通过 API 检索或清理它们。

#### 7. 无 UI 集成
Hook 锚点 `dashboard.widget` 和 `lesson.sidebar` 已定义，但在任何页面、布局或组件中均未被引用。插件提案没有渲染管线。

#### 8. 没有测试
零个测试文件覆盖插件系统。唯一的验证是 `verify-phase6-foundations.ts` 中的静态字符串搜索。

#### 9. 常量定义重复
`PLUGIN_HOOK_ANCHORS` 和 `PLUGIN_ACTION_ALLOWLIST` 常量在 `registry.ts` 中导出，但在代码库的其他地方从未被导入。枚举值在 `resource-ai.ts` 的 Zod schema 中重复定义为 Zod 枚举，创建了两个真实来源。

#### 10. Hook 运行计时粗糙
`durationMs` 从 `runPluginHook()` 开始到结束测量，包含两次数据库插入。它没有分离出 `dispatchPluginAction()` 本身消耗的时间。

---

## 推荐修复优先级

| 优先级 | 问题 | 修复方案 |
|--------|------|---------|
| P0 | 无启用 API | 添加 `setPluginEnabled(pluginId, enabled)` 到 DAL，添加 `setPluginEnabledAction()` Server Action |
| P0 | 权限未执行 | 在 `runPluginHook()` 中针对作用域允许列表执行 `permissions` 检查，或从 manifest schema 中移除该字段 |
| P1 | 无学校隔离 | 使用 `actorId` + `plugin.schoolId` 在 `runPluginHook()` 中添加 `memberships` 交叉检查 |
| P1 | manifest 为 `z.any()` | 在调用 DAL 之前将 `PluginManifestSchema` 验证移至 Server Action |
| P2 | manifest 重复解析 | 移除 `runPluginHook()` 中冗余的 `.parse()` — 信任已存储的 manifest |
| P2 | 缺少 CRUD | 添加 `getPlugin()`、`listPlugins(schoolId)`、`deletePlugin()` 到 DAL 和 Server Actions |
| P3 | 无测试 | 添加 DAL 函数的 Vitest 测试 |
| P3 | 无 UI 接入 | 将 hook 锚点接入 shell 布局并渲染插件提案 |
