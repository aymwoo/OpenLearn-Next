# Architecture Research: System Commands Bus (v4.3)

**Domain:** Platform Command Bus extension -- `system.*` command group integration
**Researched:** 2026-06-11
**Confidence:** HIGH（所有引用基于现有代码库现场审计；实存文件路径、行号已逐一核验）

## 研究范围

本文档回答六个具体问题：
1. `system.http.request` 和 `system.config` 在 `PlatformCommandType` 层级中的位置
2. `dispatchSystemCommand` facade 的设计模式
3. manifest `systemCommands` 声明的结构与校验策略
4. system commands 的授权流程
5. `system.config` 的数据流与持久化策略
6. governance audit 的集成模式

---

## 1. 系统全景：System Commands 在现有架构中的位置

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        UI / Surface 层 (Server Actions)                       │
│  plugin-actions.ts / classroom-actions.ts / lesson-authoring-actions.ts      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────────────┐ │
│  │ dispatchPluginGover- │  │ dispatchPluginData-   │  │ dispatchSystem-     │ │
│  │ nanceCommand         │  │ Access                │  │ Command  **[NEW]**  │ │
│  │ (producers/plugin-   │  │ (plugin-data-access/  │  │ (facades/system.ts) │ │
│  │  governance.ts)      │  │  facade.ts)           │  │                     │ │
│  └──────────┬───────────┘  └──────────┬────────────┘  └──────────┬──────────┘ │
│             │                         │                            │           │
│             │     ┌───────────────────┼────────────────────────────┘           │
│             │     │                   │                                        │
│             ▼     ▼                   ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                    dispatchPlatformCommand (bus.ts)                   │    │
│  │  validate → resolveDedupe → persist → authorize → execute →          │    │
│  │  updateSummary → publishEvents                                       │    │
│  └──────────────────────────────┬───────────────────────────────────────┘    │
│                                 │                                              │
│                                 ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │               platformCommandRegistry (registry.ts)                  │    │
│  │  plugin.* (12) | lesson.draft.* (4) | plugin.data.* (2) |             │    │
│  │  quiz.answer.* (1) | system.* (3) **[NEW]**                          │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                 │                                              │
│                                 ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                     PlatformCommandStore                              │    │
│  │  表: platformCommand + platformCommandAttempt (Drizzle/SQLite)        │    │
│  │  现有实现: producers/plugin-governance.ts 内 platformCommandStore     │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                           Governance & Audit Layer                            │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  governanceAudit 表 (src/db/schema.ts:1325)                           │    │
│  │  targetType, targetId, pluginId, schoolId, action, decision,          │    │
│  │  reasonCode, actorId, actorScope, lifecycleState, killSwitchEnabled,  │    │
│  │  requestedCapabilitiesJson, grantedCapabilitiesJson,                  │    │
│  │  correlationId, payloadJson                                           │    │
│  │  — actorScope 枚举已含 "system" (schema.ts:1338)                      │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                           Data / Persistence Layer                            │
│  ┌──────────────────────────────┐  ┌────────────────────────────────────┐    │
│  │ pluginOwnedBusinessData      │  │ systemPluginConfig **[NEW]**        │    │
│  │ (schema.ts:1884)             │  │ 新独立表:                            │    │
│  │ - schoolId, pluginId, key,   │  │ - pluginRegistrationId →            │    │
│  │   payloadJson                │  │   pluginRegistrations (FK cascade)  │    │
│  │ - 唯一(schoolId,pluginId,key)│  │ - schoolId → schools (FK cascade)   │    │
│  │                              │  │ - configKey TEXT NOT NULL           │    │
│  │                              │  │ - configValueJson TEXT (JSON mode)  │    │
│  │                              │  │ - createdAt, updatedAt              │    │
│  │                              │  │ - 唯一(pluginRegistrationId,        │    │
│  │                              │  │   schoolId, configKey)              │    │
│  └──────────────────────────────┘  └────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 组件间交互与集成点

### 2.1 PlatformCommandType 层级：SystemCommandTypes 的新增位置

**现状**（contracts.ts）：
```
PlatformPluginGovernanceCommandTypes (12 个: plugin.install ... plugin.kill_switch.set)
LessonDraftCommandTypes             (4 个:  lesson.draft.run|persist|accept|discard)
PluginDataCommandTypes              (2 个:  plugin.data.insert|upsert)
QuizTransportCommandTypes           (1 个:  quiz.answer.received)
  → PlatformCommandTypeSchema = z.enum([...全部拼接...])
  → PlatformCommandSchema = z.discriminatedUnion("type", [...全部 variants...])
```
每个 type 组的 pattern 是：
1. 声明 `as const` 字符串数组
2. 加入 `z.enum` 
3. 定义对应 `PayloadSchema`
4. 注册到 `PlatformCommandPayloadSchemas`
5. 添加到 `PlatformCommandSchema` 的 discriminated union

**推荐新增**：

```typescript
// contracts.ts 新增 — SystemCommandTypes
export const SystemCommandTypes = [
  "system.http.request",
  "system.config.get",
  "system.config.set",
] as const;

// PlatformCommandTypeSchema 扩编
export const PlatformCommandTypeSchema = z.enum([
  ...PlatformPluginGovernanceCommandTypes,
  ...LessonDraftCommandTypes,
  ...PluginDataCommandTypes,
  ...QuizTransportCommandTypes,
  ...SystemCommandTypes,  // ★ 新增
]);
```

**为什么 system.config.get 要声明为命令类型？**
- `get` 是纯读操作，**不**走 Command Bus 的 write 路径
- 但是 `PlatformCommandTypeSchema` 是一个类型域——声明它使得 facade 的类型签名可以统一使用 `PlatformCommandType` 作为判别键
- 实际派发时 facade 会区分：`get` → 直接 DAL 读取（不走 Command Bus）；`set` / `http.request` → 经 producer 走 Command Bus
- 这与 `plugin.data.*` 的模式一致：insert/upsert 声明了类型，但读动词（getByIndex/count/aggregate）并不声明为命令类型，因为读不走 Command Bus
- **修正**：参照 plugin.data.* 的既有范式，**system.config.get 不应声明为 PlatformCommandType**。它只在 facade 层做类型判别，不需要进入 Command Bus。实际需要声明的只有两个：

```typescript
export const SystemCommandTypes = [
  "system.http.request",
  "system.config.set",
] as const;
```

| 文件 | 修改类型 | 改动内容 |
|------|----------|----------|
| `contracts.ts` | 修改 | 新增 `SystemCommandTypes`、`SystemHttpRequestPayloadSchema`、`SystemConfigSetPayloadSchema`，追加到 `PlatformCommandPayloadSchemas`，追加 discriminated union 两个 variants |
| `contracts.ts` | 修改 | `PlatformCommandTypeSchema` 扩展包含 `...SystemCommandTypes` |
| `registry.ts` | 修改 | 新增 2 条 registry entries，引用新 handler |

### 2.2 dispatchSystemCommand facade 设计

**参照模板**：`src/features/platform-core/plugin-data-access/facade.ts` (`dispatchPluginDataAccess`)

**现有 facade 的三段式结构**（facade.ts:43-118）：
```
① 治理门前置：assertActionExecutable({actorId, pluginKey, verb, correlationId})
   → 返回 {schoolId, projectionRow}
② 判别派发：
   - 写动词 (insert/upsert) → producePluginData* (经 Command Bus)
   - 读动词 (getByIndex/count/aggregate) → 直接 DAL 读取
③ 结果返回
```

**新增 facade 的三段式结构**：

```
dispatchSystemCommand (新文件: src/features/platform-core/commands/facades/system.ts):
  ① 治理门前置：assertSystemActionExecutable({actorId, pluginKey, correlationId})
     → 返回 {schoolId, pluginId, manifestSystemCommands}
     → 内部复用 deriveActiveSchoolScope + projectPluginGovernance
  ② 判别派发：
     - system.http.request → produceSystemHttpRequest (经 Command Bus)
     - system.config.set     → produceSystemConfigSet (经 Command Bus)
     - system.config.get     → 直接 DAL 读取 system_plugin_config 表
  ③ 结果返回
```

**类型签名**：
```typescript
// 读操作（system.config.get）不走 Command Bus，只做 governance gate
type SystemCommandInput =
  | { type: "system.http.request"; pluginKey: string; url: string; method: string; headers?: Record<string,string>; body?: string; timeout?: number }
  | { type: "system.config.set"; pluginKey: string; configKey: string; configValue: unknown }
  | { type: "system.config.get"; pluginKey: string; configKey: string }

// 输入不携带 schoolId/pluginId——由 governance gate 从 session 派生注入
```

**关键不变式**（镜像 facade.ts:30-35 的注释契约）：
- **schoolId 唯一权威**：由治理门从认证 session 派生注入，facade 绝不读取 `input.schoolId`
- **治理前置**：gate 抛错时 producer/DAL 均不被调用
- **actor scope = "plugin"**：命令执行代表受治理插件行为

### 2.3 manifest systemCommands 声明

**存储策略**：声明存储于 `pluginRegistrations.manifestJson` 内作为 JSON 字段的一部分，不单独建表。

**Zod Schema**（新文件：`src/features/runtime-platform/contracts/system-commands.ts`）：

```typescript
import { z } from "zod";

// 允许精确域名 + 通配符子域名模式
const SystemHttpDomainPatternSchema = z.string().min(1).superRefine((val, ctx) => {
  // *.example.com 或 api.example.com
  if (!/^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(val)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid domain pattern" });
  }
  // 拒绝裸通配符 "*"（过于宽松）
  if (val === "*" || val === "*.") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "wildcard-only domain not allowed" });
  }
});

const SystemHttpMethodSchema = z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]);

const SystemHttpRequestDeclarationSchema = z.strictObject({
  allowedDomains: z.array(SystemHttpDomainPatternSchema).min(1),
  allowedMethods: z.array(SystemHttpMethodSchema).min(1),
  maxResponseSize: z.number().int().positive().max(5242880).default(1048576), // 最大5MB，默认1MB
  defaultTimeout: z.number().int().positive().max(30000).default(10000),      // 最大30s，默认10s
});

const SystemConfigDeclarationSchema = z.strictObject({
  // system.config.get/set 不需要额外白名单——插件只能读写自身的 config
  // 声明此节点仅作为显式 opt-in
  maxValueSize: z.number().int().positive().max(65536).default(65536), // 最大64KB
});

export const SystemCommandsDeclarationSchema = z.strictObject({
  "system.http.request": SystemHttpRequestDeclarationSchema.optional(),
  "system.config": SystemConfigDeclarationSchema.optional(),
});
```

**追加到 PluginManifestSchema**（修改 `src/lib/dto/resource-ai.ts:761`）：

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
  systemCommands: SystemCommandsDeclarationSchema.optional(),  // ★ 新增
}).superRefine(/* ... existing superRefine ... */);
```

**校验时机**：

| 阶段 | 校验内容 | 调用位置 |
|------|----------|----------|
| **install** | `SystemCommandsDeclarationSchema` 结构校验（域名格式、方法枚举在 Zod 边界就被拒） | `registerPluginManifestAction` → `PluginManifestSchema.parse()` |
| **upgrade** | 与新 manifest 一同校验（整个 manifestJson 替换） | `producePluginUpgradeCommand` → `PluginManifestSchema.parse()` |
| **runtime** | 逐请求域名匹配、方法匹配、SSRF 检查 | `dispatchSystemCommand` → governance gate |

**优势**：
- Install 时完成声明合法性校验，runtime 只做逐请求匹配，不做重复的结构校验
- 与 `governance` 字段（`PluginManifestGovernanceV2Schema`）并列，形成 manifest 的「治理声明」层
- 存储在 manifestJson 内，升级时原子替换，无独立表同步问题

### 2.4 授权流程

**5 层逐层把守**，任一失败即写 denial audit 并抛出具名错误：

```
插件调用 dispatchSystemCommand({type: "system.http.request", pluginKey, url, method, ...})
    │
    ▼
第 1 层：身份认证
    deriveActiveSchoolScope() → 获取 schoolId + userId
    失败 → denial: "non_school_actor_rejected"
    │
    ▼
第 2 层：Lifecycle + Kill-Switch
    projectPluginGovernance(snapshots) → 判定 executable
    失败 → denial: "lifecycle_not_executable" | "kill_switch_rejected"
    │
    ▼
第 3 层：Manifest 声明存在性
    manifestJson.systemCommands?.[commandGroup] 存在？
    - "system.http.request" → systemCommands["system.http.request"]
    - "system.config.set"/"system.config.get" → systemCommands["system.config"]
    失败 → denial: "not_allowlisted"
    │
    ▼
第 4 层：白名单逐请求匹配
    对 system.http.request:
      ├── 解析 URL hostname → 匹配 allowedDomains（含 *.example.com 通配符语义）
      ├── 检查 method ∈ allowedMethods
      └── SSRF 防护：DNS resolve → 检查 IP 为非 private/loopback/link-local
    失败 → denial: "domain_not_allowed" | "method_not_allowed" | "private_ip_blocked"
    │
    对 system.config.get/set:
      └── 检查 configKey 隔离（自动添加 pluginKey 前缀或校验前缀归属）
    失败 → denial: "config_key_denied"
    │
    ▼
第 5 层：Execute
    system.http.request → fetch(url, {method, headers, body, signal: AbortSignal.timeout(timeout)})
    system.config.set → INSERT OR REPLACE INTO systemPluginConfig
    system.config.get → SELECT FROM systemPluginConfig (直接 DAL)
    失败 → event: "platform.command.failed"
```

**新增 reason code**（追加到 `GovernanceDeniedReasonValues`, permissions.ts:32）：

```typescript
export const GovernanceDeniedReasonValues = [
  // ... 已有的 7 个 ...
  "not_allowlisted",
  "capability_missing",
  "permission_denied",
  "lifecycle_blocked",
  "school_mismatch",
  "kill_switch",
  "unsupported_action",
  // ★ 新增 4 个
  "domain_not_allowed",
  "method_not_allowed",
  "private_ip_blocked",
  "config_key_denied",
] as const;
```

**第 4 层 SSRF 防护详细设计**：

```typescript
// 在 system.http.request handler 的 authorize 中
const PRIVATE_IP_RANGES = [
  /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
  /^0\./, /^169\.254\./, /^::1$/, /^fc00:/, /^fd00:/, /^fe80:/,
];

async function checkSsrfRisk(hostname: string): Promise<void> {
  // 使用 dns.promises.resolve4 / resolve6（Node.js 内置）
  const addresses = await dns.promises.resolve4(hostname).catch(() => []);
  for (const addr of addresses) {
    if (PRIVATE_IP_RANGES.some((re) => re.test(addr))) {
      throw new Error("private_ip_blocked");
    }
  }
}
```

### 2.5 system.config 数据流

**推荐方案：新增独立 SQLite 表 `systemPluginConfig`。**

**与 `pluginOwnedBusinessData` 的对比**：

| 维度 | pluginOwnedBusinessData (schema.ts:1884) | systemPluginConfig (新表) |
|------|-------------------------------------------|----------------------------|
| 用途 | 通用业务数据——marketplace 生命周期的 misc 数据 | system.config 语义——插件声明式 KV 配置 |
| 主键/唯一约束 | `(schoolId, pluginId, key)` | `(pluginRegistrationId, schoolId, configKey)` |
| 值类型 | payloadJson (任意 JSON) | configValueJson (任意 JSON，但有 maxValueSize 限制) |
| 生命周期 | 跟随 uninstall retain/cleanup 策略 | 跟随插件注册 (ON DELETE CASCADE) |
| 访问模式 | 通用 key-value 查询 | configKey 命名隔离 (auto-prefix pluginKey) |

**不复用 `pluginOwnedBusinessData` 的核心原因**：
1. 语义不同——business data 是 marketplace 操作的附属数据，system.config 是插件运行时配置
2. 生命周期不同——business data 受 retain/cleanup 策略控制，system.config 应始终 ON DELETE CASCADE
3. 隔离边界不同——business data 的 key 不强制 pluginKey 前缀，configKey 必须隔离

**新表 Drizzle 定义**（追加到 `src/db/schema.ts`）：

```typescript
export const systemPluginConfig = sqliteTable(
  "system_plugin_config",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    pluginRegistrationId: text("pluginRegistrationId")
      .notNull()
      .references(() => pluginRegistrations.id, { onDelete: "cascade" }),
    schoolId: text("schoolId")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    configKey: text("configKey").notNull(),
    configValueJson: text("configValueJson", { mode: "json" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("system_plugin_config_plugin_key_unique").on(
      table.pluginRegistrationId, table.schoolId, table.configKey
    ),
  ]
);
```

**数据流**：

```
system.config.set:
  → dispatchSystemCommand({type: "system.config.set", pluginKey, configKey, configValue})
  → 治理门 (5 层通过)
  → produceSystemConfigSet → dispatchPlatformCommand({type: "system.config.set", ...})
  → handler.authorize: configKey 归属校验, configValue 大小校验 (≤ maxValueSize)
  → handler.execute:
      INSERT INTO system_plugin_config (...) VALUES (...)
      ON CONFLICT (pluginRegistrationId, schoolId, configKey) DO UPDATE
      SET configValueJson = excluded.configValueJson, updatedAt = excluded.updatedAt
  → resultSummary: { pluginKey, configKey, byteLength }

system.config.get:
  → dispatchSystemCommand({type: "system.config.get", pluginKey, configKey})
  → 治理门 (5 层通过)
  → 直接 DAL 读取 (不经 Command Bus):
      SELECT configValueJson FROM system_plugin_config
      WHERE pluginRegistrationId = ? AND schoolId = ? AND configKey = ?
  → 不存在返回 null，不抛错
  → 记录 allowed audit（无 command record）
```

### 2.6 Governance Audit 集成

**复用 `governanceAudit` 表**（schema.ts:1325），追加新的 reasonCode 枚举值。

**每次 system command 调用产生的审计记录**：

| 场景 | governanceAudit 记录 | platformCommand 记录 | platformEvent 记录 |
|------|---------------------|---------------------|-------------------|
| governance gate 拒绝 | 1 条 (denied, reasonCode) | 0 条 | 0 条 |
| write (http.request/set) 成功 | 1 条 (allowed) | 1 条 (succeeded) | N 条 (command.succeeded + domain events) |
| write (http.request/set) 失败 | 1 条 (allowed) | 1 条 (failed) | 1 条 (command.failed) |
| read (config.get) 成功 | 1 条 (allowed) | 0 条 | 0 条 |

**Denial audit 示例**：

```typescript
// domain_not_allowed 拒绝
{
  targetType: "plugin",
  targetId: pluginId,
  pluginId: pluginId,
  schoolId: schoolId,
  action: "system.http.request",
  decision: "denied",
  reasonCode: "domain_not_allowed",
  actorId: teacherUserId,
  actorScope: "plugin",      // 代表插件行为
  lifecycleState: "ready",
  killSwitchEnabled: false,
  requestedCapabilitiesJson: [],
  grantedCapabilitiesJson: [],
  correlationId: "system-cmd:sha256...",
  payloadJson: {
    pluginKey: "my-plugin",
    commandType: "system.http.request",
    url: "https://evil.com/data",
    method: "GET",
    manifestAllowedDomains: ["api.example.com"],
    deniedReason: "hostname evil.com not in allowed domains"
  }
}
```

**与 Command Event 的关联**：
- 治理 audit 与 Command Event 通过 `correlationId` 关联
- 联查路径：`governanceAudit.correlationId → platformCommands.correlationJson.correlationId → platformEvents.correlationId`

---

## 3. 组件设计

### 3.1 新增文件清单（7 个）

| 文件 | 层 | 职责 |
|------|-----|------|
| `src/features/runtime-platform/contracts/system-commands.ts` | Contract | `SystemCommandsDeclarationSchema`、`SystemHttpRequestDeclarationSchema`、`SystemConfigDeclarationSchema` |
| `src/features/platform-core/commands/handlers/system-http-request.ts` | Handler | `system.http.request` 的 authorize (白名单匹配 + SSRF) + execute (HTTP fetch) |
| `src/features/platform-core/commands/handlers/system-config.ts` | Handler | `system.config.set` 的 authorize + execute (DB upsert)；`get` 不注册为 handler |
| `src/features/platform-core/commands/producers/system.ts` | Producer | `produceSystemHttpRequest` / `produceSystemConfigSet`，镜像 `producers/plugin-data.ts` |
| `src/features/platform-core/commands/facades/system.ts` | Facade | `dispatchSystemCommand` 统一入口——治理门 + 判别派发 |
| `src/lib/dal/system-config.ts` | DAL | `system_plugin_config` 表的直接读取（get 用）+ 写入辅助 |
| `src/lib/dto/system-command.ts` | DTO | `SystemCommandInputSchema` + 类型导出（纯 DTO，无服务端边界） |

### 3.2 修改文件清单（6 个）

| 文件 | 修改幅度 | 改动内容 |
|------|----------|----------|
| `src/features/platform-core/commands/contracts.ts` | 中等 | 新增 `SystemCommandTypes`、2 个 payload schemas、2 个 discriminated union variants、扩展 `PlatformCommandTypeSchema` |
| `src/features/platform-core/commands/registry.ts` | 小 | 新增 2 条 registry entries |
| `src/features/runtime-platform/contracts/permissions.ts` | 小 | `GovernanceDeniedReasonValues` 追加 4 个 reason code |
| `src/lib/dto/resource-ai.ts` | 小 | `PluginManifestSchema` 追加 `systemCommands` 可选字段 |
| `src/db/schema.ts` | 小 | 新增 `systemPluginConfig` 表 + 导出 |
| `src/actions/plugin-actions.ts` | 极小 | import 新类型（如需在 action 层暴露 system command 入口） |

### 3.3 不动文件（明确排除）

以下组件零修改：
- **`bus.ts`** (`dispatchPlatformCommand`) — 不修改，`system.*` 走同一 bus，通过 type 区分
- **`platformCommandStore`** — system producer 创建自己的 store 实例，使用同样的 Drizzle 表
- **`plugin-governance.ts` / `plugin-data.ts` producers** — 不变
- **`plugin-data-access/facade.ts`** — 不变
- **`governanceAudit` 表结构** — 不变，仅追加 reasonCode 枚举值
- **`pluginRegistrations` 表结构** — 不变，manifestJson 内新增字段不需要 schema 变更
- **`RuntimeCapabilityValues`** — 不变，system commands 不经过 capability gate（走 manifest 白名单 gate）

---

## 4. 架构模式

### 模式 1：Facade-Producer-Handler 三层派发（既有模式镜像）

```
dispatchSystemCommand (facade)
  → governance gate (lifecycle + kill-switch + manifest allowlist)
  → discriminate:
      - write (http.request / config.set) → producer → Command Bus → handler.authorize → handler.execute
      - read  (config.get)             → 直接 DAL 读取
```

对标 `dispatchPluginDataAccess` → `producePluginData*` → `plugin-data handlers`，已在 v4.0 验证稳定。

### 模式 2：Manifest 声明 → Install 校验 → Runtime 逐请求匹配

```
Plugin manifest.json:
  { "systemCommands": {
      "system.http.request": {
        "allowedDomains": ["*.example.com", "api.github.com"],
        "allowedMethods": ["GET", "POST"],
        "maxResponseSize": 1048576
      },
      "system.config": {}
    }
  }
      │（install 时）
      ▼
  PluginManifestSchema.parse() 
    → SystemCommandsDeclarationSchema 边界校验（域名格式、方法枚举）
    → 存入 pluginRegistrations.manifestJson（JSON 字段）
      │（runtime 时）
      ▼
  dispatchSystemCommand()
    → 从 manifestJson 提取 systemCommands 声明
    → URL hostname vs allowedDomains 通配符匹配
    → method vs allowedMethods 枚举匹配
    → SSRF DNS rebinding 检测
```

### 反模式：避免的架构选择

**反模式 1：给 `system.*` 创建独立的 Command Bus**
- 为什么不：分裂命令总线破坏统一审计和事件流
- 正确做法：复用 `dispatchPlatformCommand`，通过新增 `SystemCommandTypes` 区分

**反模式 2：`system.config.get` 走 Command Bus 的 write 路径**
- 为什么不：纯读操作不应产生 command record（污染 `platformCommands` 表），也不应进入 dedupe 逻辑
- 正确做法：governance gate 后直接 DAL 读取（参照 `getByIndex`/`count`/`aggregate` 不声明命令类型的模式）

**反模式 3：`systemCommands` 声明单独建表**
- 为什么不：manifestJson 已经是完整、已校验的声明文件，单独建表会产生双份真相和同步问题
- 正确做法：存储于 manifestJson 内，升级时原子替换

**反模式 4：无 SSRF 防护的 HTTP 代理**
- 为什么不：插件声明的白名单域名可能经 DNS rebinding 指向内网地址
- 正确做法：resolve DNS → 检查返回 IP 是否私有/回环/链路本地 → 拒绝

---

## 5. 构建顺序与依赖

```
Phase 77: Schema & Contract Layer（零业务依赖）
  ├── 77.1: systemPluginConfig 表（schema.ts）
  ├── 77.2: SystemCommandTypes + payload schemas（contracts.ts）
  ├── 77.3: SystemCommandsDeclarationSchema（system-commands.ts）
  ├── 77.4: PluginManifestSchema 追加 systemCommands（resource-ai.ts）
  └── 77.5: GovernanceDeniedReasonValues 追加 4 个 reason code（permissions.ts）
      │
      ▼
Phase 78: Core Infrastructure（依赖 Phase 77 的 schema/contract）
  ├── 78.1: system.config DAL（system-config.ts — 读写 systemPluginConfig）
  ├── 78.2: system.http.request handler（authorize + execute）
  ├── 78.3: system.config set handler（authorize + execute）
  ├── 78.4: system command producers（producers/system.ts）
  └── 78.5: Registry entries（registry.ts）
      │
      ▼
Phase 79: Facade & Governance Gate（依赖 Phase 78 的 handler/producer）
  ├── 79.1: dispatchSystemCommand facade（facades/system.ts）
  ├── 79.2: Governance gate extension（system-specific allowlist matching + SSRF check）
  └── 79.3: Audit writer（system access audit 的 writeSystemAccessAudit）
      │
      ▼
Phase 80: End-to-End Validation
  ├── 80.1: system.http.request SSRF 防护测试
  ├── 80.2: system.config 跨插件隔离测试
  ├── 80.3: Manifest install-time 校验测试
  └── 80.4: Governance audit 覆盖验证
```

**依赖链关键约束**：
- Phase 78 依赖 Phase 77 的完整 schema/contract（handlers 需要 payload schema 来定义 authorize/execute 签名）
- Phase 79 依赖 Phase 78 的 handler + producer（facade 需要调用 producer + 直接 DAL）
- Phase 80 依赖 Phase 79（e2e 测试需要 facade 入口）

---

## 6. 不变式与回归防护

实施时必须保证以下不变式不破：

| # | 不变式 | 来源 |
|---|--------|------|
| 1 | **schoolId 唯一权威**：system commands 的 schoolId 不由 payload 注入，由 governance gate 从 session 派生 | facade.ts:30-32 |
| 2 | **Command Bus 统一**：所有写操作经 `dispatchPlatformCommand`，不引入第二个 bus | bus.ts |
| 3 | **插件数据隔离**：插件 A 不能读插件 B 的 system.config；不能以插件 B 的身份发 HTTP 请求 | governance-gate.ts |
| 4 | **读写路径分离**：读操作（config.get）不经 Command Bus 写入路径 | facade.ts:86-118 |
| 5 | **审计完备**：每个 system command 调用至少 1 条 governanceAudit 记录 | audit 契约 |
| 6 | **既有命令零影响**：`plugin.*` / `lesson.draft.*` / `plugin.data.*` / `quiz.answer.*` 行为不变，测试全部绿 | 回归约束 |
| 7 | **Manifest 单信源**：systemCommands 声明只存在于 manifestJson 内，无独立表同步 | install action |
| 8 | **SSRF 防护**：所有 system.http.request 的 URL 在 handler.authorize 中做 DNS resolve + IP 检查 | 安全约束 |

---

## 来源

所有架构引用来源于实存代码审计（2026-06-11）：

- **Command contracts**：`src/features/platform-core/commands/contracts.ts` — `PlatformCommandTypeSchema` (L39-44)、`PlatformCommandSchema` discriminated union (L255-332)、`PlatformCommandPayloadSchemas` (L233-253)
- **Command registry**：`src/features/platform-core/commands/registry.ts` — `platformCommandRegistry` (L17-151)、四组命令组的 handler 引入
- **Command Bus**：`src/features/platform-core/commands/bus.ts` — `dispatchPlatformCommand` (L241-378)、`PlatformCommandStore` interface (L36-66)、dedupe 逻辑 (L105-123)
- **Plugin governance producer**：`src/features/platform-core/commands/producers/plugin-governance.ts` — `dispatchPluginGovernanceCommand` (L264-283)、`platformCommandStore` 实现 (L166-252)、BaseProducerInput 类型
- **Plugin data producer**：`src/features/platform-core/commands/producers/plugin-data.ts` — 写动词 produce/BaseProducerInput 模式
- **Plugin data facade**：`src/features/platform-core/plugin-data-access/facade.ts` — `dispatchPluginDataAccess` 三段式 (L43-118)
- **Governance gate**：`src/features/platform-core/plugin-data-access/governance-gate.ts` — `assertActionExecutable` (L43-102)、`deriveActiveSchoolScope` (L104-123)
- **DB schema**：`src/db/schema.ts` — `governanceAudits` (L1325-1352)、`platformCommands` (L370-410)、`pluginOwnedBusinessData` (L1884-1904)
- **Manifest schema**：`src/lib/dto/resource-ai.ts:761` (`PluginManifestSchema`)
- **Permissions**：`src/features/runtime-platform/contracts/permissions.ts:30` (`RuntimeActorScopeValues`)、:32 (`GovernanceDeniedReasonValues`)

---
*Architecture research for: v4.3 System Commands Bus*
*Researched: 2026-06-11*
