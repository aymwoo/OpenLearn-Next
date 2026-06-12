# Phase 79: system.config KV 配置 + dispatchSystemCommand facade - Context

**Gathered:** 2026-06-12
**Status:** Ready for planning

<domain>
## Phase Boundary

此阶段交付两件事：

1. **`system.config` handler**：实现 `system.config.set`（KV 配置写入，经 Command Bus producer → `pluginOwnedBusinessData` upsert）和 `system.config.get`（KV 配置读取，纯读走 DAL）。key 以 `{schoolId}:{pluginId}:{key}` 三重前缀隔离，Zod 层拒绝 key 含 `:`，单值上限 64KB。manifest `allowedKeys` 白名单校验支持前缀通配（`homework:*`）。

2. **`dispatchSystemCommand` facade**：作为 `system.*` 命令的统一入口，三段式结构——治理门（泛化后的 `assertActionExecutable`：lifecycle + kill-switch + school scope）→ 判别派发（路由到对应 handler）→ 结果返回。所有 deny 点先写 governance audit 再抛错，schoolId 由认证 session 派生注入。

不交付：新的 system command 类别（`system.notification.send` 等，属于后续 phase）。
</domain>

<decisions>
## Implementation Decisions

### Governance Gate 泛化
- **D-01:** 泛化 `assertActionExecutable`（`src/features/platform-core/plugin-data-access/governance-gate.ts`），将 `verb` 参数从 `PluginDataAccessVerb` 泛化为 `string`。插件定位逻辑不变（`deriveActiveSchoolScope` + `projectPluginGovernance`），一个函数同时服务 `dispatchPluginDataAccess` 和 `dispatchSystemCommand` 两个 facade。
- **D-02:** 泛化向后兼容——`dispatchPluginDataAccess` 调用的行为零变化，只是类型签名放宽。

### dispatchSystemCommand Facade 结构
- **D-03:** facade 放在 `src/features/system-commands/facade.ts`，与 `system-commands/` 内聚（非 `platform-core/plugin-data-access/` 同级）。
- **D-04:** facade 只做治理门 + 审计写入。三段式：`assertActionExecutable`（lifecycle/kill-switch/school scope）→ 判别派发（按 commandType 路由到 handler 的 authorize/execute）→ 结果返回。deny 时先写 audit 再抛错。
- **D-05:** handler 继续负责 manifest 白名单 re-parse + 业务 authorize/execute——与 Phase 78 `system.http.request` handler 的自治模式一致。facade 不做 manifest re-parse。

### system.config.get 路径
- **D-06:** `system.config.get` 不过治理门，纯读走 DAL——直接查询 `pluginOwnedBusinessData` 表。manifest `allowedKeys` 白名单校验在 handler 层做。
- **D-07:** `get` 不声明为 `PlatformCommandType`、不走 Command Bus、不写 audit。与 `REQUIREMENTS.md` SYS-02「纯读走 DAL（不声明为 PlatformCommandType）」一致。

### system.config.set 路径
- **D-08:** `system.config.set` 不建独立 producer。handler.execute 中直接构造 `PlatformCommand` envelope，调用 `dispatchPlatformCommand`（与 Phase 78 `system.http.request` handler 模式一致）。
- **D-09:** handler.execute 负责 `pluginOwnedBusinessData` 的 upsert 逻辑：构造 key = `{schoolId}:{pluginId}:{key}`，value 为 JSON 序列化后的 payload，写入 `pluginOwnedBusinessData` 表（dataKey/dataValue/pluginId/schoolId 字段）。

### Manifest 白名单匹配（handler 层）
- **D-10:** handler.authorize 复刻 Phase 78 `system.http.request` 的 re-parse 模式：从 `pluginRegistrations.manifestJson` 解析 → `PluginManifestSchema.parse` → 提取 `systemCommands` 中 `command === "system.config"` 的条目 → 逐条匹配 `allowedKeys`。
- **D-11:** 前缀通配匹配：`homework:*` 匹配 `homework:title`、`homework:deadline` 等，不跨层（不匹配 `homework:sub:key`）。
- **D-12:** key 含 `:` 字符在 Zod 层拒绝（`keySchema.refine`），不等到 manifest 匹配阶段。

### Governance Audit 写入
- **D-13:** 新建 `writeSystemCommandAudit()` 专用 helper，放在 `src/features/system-commands/audit.ts`（Phase 78 已有同名文件和基本实现，Phase 79 扩展）。
- **D-14:** audit action 字段直接使用 commandType（`system.config.set` / `system.config.get`），与 Phase 77 D-14 一致。
- **D-15:** 拒绝时使用 Phase 77 已追加的拒因码：`config_key_denied`（key 不在白名单）、复用 `lifecycle_blocked` / `kill_switch`（治理门拒绝）。

### 模块结构
- **D-16:** `src/features/system-commands/` 目录内聚——facade.ts（dispatchSystemCommand）+ handler.ts（扩展 Phase 78，新增 system.config 的 authorize/execute）+ audit.ts（writeSystemCommandAudit）+ ssrf-guard.ts（Phase 78 已有，不变）。
- **D-17:** handler 导出模式沿用 Phase 78：`export const systemConfigHandler = { "system.config.set": { authorize, execute }, "system.config.get": { authorize, execute } }`。

### Claude's Discretion
以下结构级决策由 plans 的 files_modified、模块划分和任务 action 隐含执行，不再显式追踪：
- `assertActionExecutable` 泛化的具体类型签名变更（保持最小 diff）
- `system.config.get` 的 DAL 查询函数命名和缓存策略
- handler 内 key 构造、value JSON 序列化/反序列化的具体实现
- audit helper 与 Phase 78 现有 audit.ts 的合并方式
- facade 错误处理的具体异常类型
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements & Roadmap
- `.planning/ROADMAP.md` §Phase 79 — 阶段目标、5 项成功标准、依赖关系
- `.planning/REQUIREMENTS.md` §SYS-02, §SYS-04 — system.config KV 配置需求和 dispatchSystemCommand facade 需求
- `.planning/PROJECT.md` §Current Milestone — v4.3 System Commands Bus 整体目标和 key context

### 先前 Phase Context（按依赖顺序）
- `.planning/phases/77-manifest-command-registry/77-CONTEXT.md` — systemCommands schema 结构、registry 注册模式、拒因码定义
- `.planning/phases/78-system-http-request-http/78-CONTEXT.md` — handler authorize/execute 签名、manifest re-parse 模式、audit 结构

### v4.3 Research（已完成的里程碑级研究）
- `.planning/research/ARCHITECTURE.md` — System Commands 在现有架构中的位置、Command Bus 数据流
- `.planning/research/FEATURES.md` — system.config 能力边界、KV 配置的 table stakes
- `.planning/research/STACK.md` — 技术栈约束、依赖项
- `.planning/research/PITFALLS.md` — 已知陷阱和红线

### 关键源码（按修改顺序）
- `src/features/platform-core/plugin-data-access/governance-gate.ts:43` — `assertActionExecutable`（D-01 泛化目标）
- `src/features/platform-core/plugin-data-access/facade.ts:43` — `dispatchPluginDataAccess` facade 参考模式
- `src/features/platform-core/plugin-data-access/audit.ts` — `writePluginDataAccessAudit` audit 写入参考
- `src/features/system-commands/handler.ts` — Phase 78 handler（D-10/D-17 扩展目标）
- `src/features/system-commands/audit.ts` — Phase 78 audit helper（D-13 扩展目标）
- `src/features/platform-core/commands/registry.ts:162-172` — `system.config.set` stub 定义（Phase 79 替换）
- `src/features/platform-core/commands/contracts.ts` — `SystemConfigSetPayloadSchema`、`PlatformCommandTypeSchema`
- `src/features/platform-core/commands/producers/plugin-data.ts` — `producePluginDataUpsert` 写 producer 参考模式
- `src/features/platform-core/commands/bus.ts:241` — `dispatchPlatformCommand` 派发入口
- `src/lib/dto/resource-ai.ts:845-852` — `SystemCommandDiscriminatedSchema`（system.config 声明 shape）
- `src/db/schema.ts` — `governanceAudits`、`pluginOwnedBusinessData` 表定义
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`assertActionExecutable`** (`governance-gate.ts:43`)：治理门前置——lifecycle + kill-switch + school scope 检查。D-01 泛化后直接复用。
- **`dispatchPluginDataAccess`** (`plugin-data-access/facade.ts:43`)：三段式 facade 参考——治理门 → 判别派发 → 结果返回。
- **`writePluginDataAccessAudit`** (`plugin-data-access/audit.ts`)：audit 写入模式参考——字段设计和签名。
- **`dispatchPlatformCommand`** (`bus.ts:241`)：Command Bus 派发管道——validate → authorize → execute → persist events。handler 经此写入。
- **`PluginManifestSchema.parse`** (`resource-ai.ts:854`)：manifest 解析入口，handler authorize 中 re-parse manifestJson。
- **`SystemCommandDiscriminatedSchema`** (`resource-ai.ts:845`)：已导出的 discriminated union，handler 提取 system.config 条目。
- **`createPlatformCommandDefinition`** (`registry.ts:13`)：类型安全的工厂函数，替换 stub 时使用。

### Established Patterns
- **Command Bus handler 签名**：`authorize({ command }) => void` / `execute({ command, attemptNumber }) => PlatformCommandExecutionResult`——handler 严格遵循。
- **Manifest re-parse**：handler.authorize 每次从 `pluginRegistrations.manifestJson` 解析 → `PluginManifestSchema.parse` → 提取匹配条目。Phase 78 D-04/D-05。
- **具名拒因码**：`UPPER_SNAKE` 常量 + `z.enum`，在 `permissions.ts` 集中定义——Phase 77 已追加 `config_key_denied`。
- **schoolId 注入**：由认证 session 派生，绝不从 payload 读取——facade 和 handler 遵循此原则。
- **append-only 审计**：`governanceAudits` 表只追加不修改——每次调用写 1 条 audit（deny 时也写）。

### Integration Points
- **`platformCommandRegistry`**：Phase 79 替换 `system.config.set` 的 authorize/execute stub——不改变注册结构。
- **`dispatchPlatformCommand`**：handler 通过标准 Command Bus 管道被调用——validate → authorize → execute → persist events。
- **`dispatchSystemCommand` facade**：新增入口——治理门 → 判别派发 → handler。调用方（runtime platform / plugin code）经此入口调用 system commands。
- **`pluginRegistrations` 表**：handler authorize 从此表读取 `manifestJson`。
- **`pluginOwnedBusinessData` 表**：system.config.set 写入此表——dataKey/dataValue/pluginId/schoolId。
- **`governanceAudits` 表**：audit 直接写入——reasonCode 为 text 列无需 migration。
</code_context>

<specifics>
## Specific Ideas

无特定偏好——讨论中所有决策均达成一致，采用推荐方案。

- 治理门采用泛化 `assertActionExecutable` 方案（一个函数服务两种 facade）
- `system.config.get` 不过治理门，纯读走 DAL
- `system.config.set` 不建独立 producer，直接构造 envelope 调 `dispatchPlatformCommand`
- facade 只做治理门+审计，handler 自治做 manifest 白名单
- audit 新建专用 helper
- facade 放 `system-commands/` 内聚
</specifics>

<deferred>
## Deferred Ideas

None — 讨论保持在 phase scope 内。
</deferred>

---

*Phase: 79-system.config KV 配置 + dispatchSystemCommand facade*
*Context gathered: 2026-06-12*
