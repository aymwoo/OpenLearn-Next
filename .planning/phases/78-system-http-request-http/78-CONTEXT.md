# Phase 78: system.http.request HTTP 代理 - Context

**Gathered:** 2026-06-11
**Status:** Ready for planning

<domain>
## Phase Boundary

此阶段交付 `system.http.request` 命令的完整实现——替换 Phase 77 中 `platformCommandRegistry` 的 stub handler（TODO），实现：

1. **authorize**: 运行时 manifest 白名单校验——从 `pluginRegistrations.manifestJson` 解析插件声明的 `allowedDomains` + `allowedMethods`，逐条匹配请求的 url/method
2. **execute**: HTTP 代理执行——通过 undici 发起 HTTPS 请求，含 SSRF 防护（DNS pinning）、响应大小硬截断（5MB）、超时控制（默认 30s）、手动 redirect 链 re-validate
3. **Governance audit**: 每次调用写 audit 记录（allow + deny 都记录），deny 时使用具名拒因码（`domain_not_allowed` / `method_not_allowed` / `private_ip_blocked` / `redirect_denied`）

不交付：`dispatchSystemCommand` facade（Phase 79）、`system.config` 实现（Phase 79）。
</domain>

<decisions>
## Implementation Decisions

### Handler 文件组织
- **D-01:** 新建独立 feature 目录——不放在现有 `handlers/` 子目录下，而是 `src/features/system-commands/`（与 `platform-core` 同级）。Phase 79 的 `system.config` handler 也放入此目录。
- **D-02:** 三模块拆分：`handler.ts`（authorize + execute 主逻辑）、`ssrf-guard.ts`（DNS pinning + IP 检测 + HTTPS 强制）、`audit.ts`（`writeSystemCommandAudit` governance audit 写入辅助）。
- **D-03:** 沿用现有导出模式——`handler.ts` 导出 `{ "system.http.request": { authorize, execute } }` 对象，`registry.ts` 通过 `systemHttpRequestHandler["system.http.request"].authorize` 方式引用。

### Manifest 白名单访问路径
- **D-04:** 每次 `authorize()` 调用从 `pluginRegistrations` 表查询 `manifestJson`（通过 `command.scope.pluginId`），用 `PluginManifestSchema.parse` 解析，提取 `systemCommands` 数组。
- **D-05:** 提取 `command === "system.http.request"` 的条目后逐条匹配——对每条声明的 `allowedDomains` 做通配符匹配、`allowedMethods` 做枚举匹配。首条命中即通过（短路）。
- **D-06:** 通配符匹配为严格子域名匹配——`*.example.com` 匹配 `api.example.com`、`cdn.example.com` 等直接子域名，不跨层（不匹配 `a.b.example.com`），不匹配裸域 `example.com`。

### Governance audit 集成方式
- **D-07:** 新建 `writeSystemCommandAudit()` 专用 helper（在 `audit.ts` 中），独立于 `writePluginDataAccessAudit`。写入 `governanceAudits` 表。
- **D-08:** 审计字段：`action` = commandType（`system.http.request`）、`decision` = `allowed` | `denied`、`reasonCode`、`actorId`、`schoolId`、`pluginId`、`payloadJson`（含 `{ url, method, domain }` 以便复现决策）。

### HTTP 客户端与 redirect 策略
- **D-09:** DNS pinning 仅通过 undici Agent `connect.lookup` 回调实现——连接时解析 DNS + 检测 IP（含 IPv6/IPv4-mapped/十进制编码检测），一次 DNS 查询完成 pinning + 检测。
- **D-10:** 手动 redirect 循环——设置 undici `maxRedirections: 0`（禁用自动 redirect），手动处理 3xx 响应。每跳重新校验：域名白名单 + SSRF（DNS pinning）+ HTTPS-only。最多 5 跳后拒绝返回 `redirect_denied`。
- **D-11:** 每次 `execute()` 调用创建新的 undici `Agent` 实例（非全局共享），配置 `connect.lookup`（DNS pinning）、`bodyTimeout`（默认 30s）、`headersTimeout`。请求级隔离确保 command 之间互不影响。
- **D-12:** HTTPS-only——在 `ssrf-guard.ts` 中校验 URL protocol，非 `https:` 直接拒绝（在 DNS 解析前即拦截）。
- **D-13:** 响应大小 5MB 硬截断——在 undici response body stream 层做累加截断，超限后销毁 stream 并返回错误。

### 未覆盖的决策（agent 自行决定）
- 请求/响应 header 白名单的具体列表（安全 vs 实用平衡）
- 超时和大小上限是否允许插件按请求覆盖 manifest 声明的默认值
- `ssrf-guard.ts` 中 IP 检测的具体实现（IPv4 私有段 + IPv6 私有段 + 特殊地址）
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements & Roadmap
- `.planning/ROADMAP.md` §Phase 78 — 阶段目标、5 项成功标准、依赖关系
- `.planning/REQUIREMENTS.md` §SYS-01 — system.http.request 需求（白名单匹配、SSRF 防护、HTTPS-only、超时/大小限制、audit）
- `.planning/PROJECT.md` §Current Milestone — v4.3 System Commands Bus 整体目标和 key context

### v4.3 Research（已完成的里程碑级研究）
- `.planning/research/ARCHITECTURE.md` — System Commands 在现有架构中的位置、Command Bus 数据流
- `.planning/research/FEATURES.md` — system.http.request 能力边界、table stakes 定义
- `.planning/research/STACK.md` — 技术栈约束、依赖项（undici 已内置 Node.js 20.9+）
- `.planning/research/PITFALLS.md` — 已知陷阱和红线（SSRF 绕过手法、DNS rebinding、redirect 攻击面）

### 关键源码（按修改顺序）
- `src/features/platform-core/commands/registry.ts:151-161` — `system.http.request` stub 定义（Phase 78 替换 TODO）
- `src/features/platform-core/commands/contracts.ts:237-244` — `SystemHttpRequestPayloadSchema`（已定义，Phase 78 直接使用）
- `src/features/platform-core/commands/contracts.ts:39` — `SystemCommandTypes`（已含 `system.http.request`）
- `src/lib/dto/resource-ai.ts:845-852` — `SystemCommandDiscriminatedSchema` + `PluginManifestSchema` 中的 `systemCommands` 字段
- `src/features/runtime-platform/contracts/permissions.ts` — `GovernanceDeniedReasonValues`（Phase 77 已追加 4 个拒因码）
- `src/features/platform-core/plugin-data-access/governance-gate.ts` — `assertActionExecutable` 参考实现（治理门模式，Phase 79 用）
- `src/features/platform-core/plugin-data-access/audit.ts` — `writePluginDataAccessAudit` 参考实现（audit 写入模式）
- `src/db/schema.ts` — `governanceAudits` 表定义（确认字段结构，Phase 78 直接写入）
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`createPlatformCommandDefinition`** (`registry.ts:11`)：类型安全的工厂函数，Phase 78 替换其 authorize/execute stub
- **`dispatchPlatformCommand`** (`bus.ts:241`)：Command Bus dispatch 管道——validate → authorize → execute → persist events。Phase 78 handler 的 authorize/execute 在此管道内执行
- **`PluginManifestSchema.parse`** (`resource-ai.ts:854`)：manifest 解析入口，authorize 中用于 re-parse manifestJson
- **`SystemCommandDiscriminatedSchema`** (`resource-ai.ts:845`)：已导出的 discriminated union，可直接用于提取 system.http.request 条目
- **`writePluginDataAccessAudit`** (`plugin-data-access/audit.ts`)：audit 写入参考模式——Phase 78 参照其签名和字段设计 `writeSystemCommandAudit`
- **`assertActionExecutable`** (`plugin-data-access/governance-gate.ts:43`)：治理门模式参考——schoolId 由 session 派生、deny 先写 audit 再抛错。Phase 79 会复用此函数，Phase 78 只需了解其模式

### Established Patterns
- **Command Bus handler 签名**：`authorize({ command }) => void` / `execute({ command, attemptNumber }) => PlatformCommandExecutionResult`——Phase 78 handler 严格遵循
- **具名拒因码**：`UPPER_SNAKE` 常量 + `z.enum`，在 `permissions.ts` 中集中定义——Phase 78 使用 Phase 77 已追加的 `domain_not_allowed` / `method_not_allowed` / `private_ip_blocked`
- **schoolId 注入**：由认证 session 派生，绝不从 payload 读取——Phase 78 handler 遵循此原则（audit 写入时使用 session-derived schoolId）
- **append-only 审计**：`governanceAudits` 表只追加不修改——Phase 78 每次调用写 1 条 audit（deny 时也写）

### Integration Points
- **`platformCommandRegistry`**：Phase 78 替换 `system.http.request` 的 `authorize` 和 `execute` stub——不改变注册结构
- **`dispatchPlatformCommand`**：Phase 78 handler 通过标准 Command Bus 管道被调用——validate → authorize → execute → persist events
- **`pluginRegistrations` 表**：authorize 从此表读取 `manifestJson`——需确认 DAL 层有此查询能力
- **`governanceAudits` 表**：audit 直接写入——`reasonCode` 为 text 列无需 migration
</code_context>

<specifics>
## Specific Ideas

无特定偏好——讨论中所有决策均达成一致，采用推荐方案。

- 用户选择所有 4 个默认选项中的推荐方案
- DNS pinning 采用 connect.lookup-only 方式（而非双层防护）
- Redirect 采用手动循环方式（安全优先）
- undici Agent 采用每次请求新建方式（隔离优先）
</specifics>

<deferred>
## Deferred Ideas

None — 讨论保持在 phase scope 内。

</deferred>

---

*Phase: 78-system.http.request HTTP 代理*
*Context gathered: 2026-06-11*
