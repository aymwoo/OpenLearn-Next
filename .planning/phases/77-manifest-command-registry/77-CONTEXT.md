# Phase 77: Manifest 声明 + Command Registry 注册 - Context

**Gathered:** 2026-06-11
**Status:** Ready for planning

<domain>
## Phase Boundary

此阶段交付两件事：

1. **`PluginManifest` 扩展**：在现有 `PluginManifestSchema` 中新增 `.optional()` 的 `systemCommands` 声明段，让插件在 manifest 中声明所需的系统命令（`system.http.request` + `system.config`）。声明使用 discriminated union 结构，`command` 字段判别，Zod schema 全量校验字段格式。
2. **`platformCommandRegistry` 扩展**：注册 2 个新的 `system.*` 命令类型（`system.http.request` + `system.config.set`），更新 `PlatformCommandTypeSchema` 和 `PlatformCommandSchema` 的 discriminated union，新增 4 个 governance audit 拒因码。

不交付：HTTP 代理实现（Phase 78）、KV 配置读写实现（Phase 79）、`dispatchSystemCommand` facade（Phase 79）。
</domain>

<decisions>
## Implementation Decisions

### systemCommands Schema 结构
- **D-01:** `systemCommands` 为顶层数组字段，使用 Zod discriminated union，判别字段名为 `command`。每个命令变体有独立 literal 和 payload shape。
- **D-02:** Phase 77 就定义完整 shape，包括 `allowedDomains`（含通配符格式 regex）、`allowedMethods`（z.enum 约束）、`allowedKeys`（含前缀通配格式 regex）。Phase 78/79 直接复用这些 schema。
- **D-03:** Schema 定义与 `PluginManifestSchema` 同文件：`src/lib/dto/resource-ai.ts`。
- **D-04:** `systemCommands` 字段为 `.optional()`，默认 `undefined`——不破坏已有 manifest。

### Install Preflight 校验深度
- **D-05:** Zod 全量校验——域名格式、method 值、key 格式等所有校验逻辑内嵌在 Zod schema 中（regex + refine + superRefine），`parseManifestOrThrow` 一把过。
- **D-06:** 校验失败使用具名拒因码（UPPER_SNAKE），如 `SYSTEM_COMMAND_DOMAIN_INVALID`、`SYSTEM_COMMAND_METHOD_INVALID`、`SYSTEM_COMMAND_KEY_INVALID`。
- **D-07:** install + upgrade 都跑校验——`parseManifestOrThrow` 在两条路径都调用，自然覆盖。
- **D-08:** 仅校验字段格式，不运行时查 registry。discriminatedUnion 的 literal 自然约束命令名——不在 union 中的命令名 Zod 直接拒绝。

### 已有 Manifest 兼容性保障
- **D-09:** 自动化兼容扫描 + vitest 断言——导入 `buildExternalQuizManifest` 和 `buildExternalHomeworkManifest`，用新 `PluginManifestSchema` 逐份 parse，断言不抛错。
- **D-10:** 测试覆盖两个方向：(A) 所有现有 manifest parse 通过（向后兼容）；(B) 构造包含合法 systemCommands 的新 manifest，parse 通过并断言解析结果正确。
- **D-11:** 同时覆盖非法声明的拒绝场景——无效域名、无效 method、无效 key 的 manifest parse 失败并抛出预期的具名拒因码。

### Governance ReasonCode 归属
- **D-12:** 新增 4 个拒因码追加到现有 `GovernanceDeniedReasonValues`（`src/features/runtime-platform/contracts/permissions.ts`）：`domain_not_allowed`、`method_not_allowed`、`private_ip_blocked`、`config_key_denied`。
- **D-13:** 审计记录粒度——每次 system command 调用至少 1 条 audit：deny 时记录 `decision=denied` + reasonCode，allow 时记录 `decision=allowed`。
- **D-14:** governanceAudits 的 `action` 字段直接使用 commandType 值（`system.http.request`、`system.config.set`、`system.config.get`）。
- **D-15:** 无需 schema migration——`governanceAudits.reasonCode` 当前为 `text` 无 enum 约束，新值直接写入。
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements & Roadmap
- `.planning/ROADMAP.md` §Phase 77 — 阶段目标、成功标准、依赖关系
- `.planning/REQUIREMENTS.md` §SYS-03, §SYS-05 — Manifest 声明段需求和 Command Bus 注册需求
- `.planning/PROJECT.md` §Current Milestone — v4.3 整体目标和 key context

### v4.3 Research (已完成的里程碑级研究)
- `.planning/research/ARCHITECTURE.md` — System Commands 在现有架构中的位置、数据流、集成模式
- `.planning/research/FEATURES.md` — system.http.request 和 system.config 的能力边界、table stakes 定义
- `.planning/research/STACK.md` — 技术栈约束、依赖项列表
- `.planning/research/PITFALLS.md` — 已知陷阱和红线

### 关键源码（按修改顺序）
- `src/lib/dto/resource-ai.ts` — `PluginManifestSchema`（在此新增 `systemCommands`）
- `src/features/platform-core/commands/contracts.ts` — `PlatformCommandTypeSchema`、`PlatformCommandSchema`（追加变体）
- `src/features/platform-core/commands/registry.ts` — `platformCommandRegistry`（注册 2 个新 commandType）
- `src/features/runtime-platform/contracts/permissions.ts` — `GovernanceDeniedReasonValues`（追加 4 个拒因码）
- `src/lib/dal/plugins.ts` — `parseManifestOrThrow` / install preflight 流程
- `src/lib/plugins/external-catalog.ts` — 现有 quiz/homework manifest（兼容性扫描目标）
- `src/db/schema.ts` — `governanceAudits` 表（无需变更，仅确认 reasonCode 为 text）
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`PluginManifestSchema`** (`src/lib/dto/resource-ai.ts:761`)：在此扩展 `systemCommands` 字段，复用现有 `.superRefine` 范式
- **`platformCommandRegistry`** (`src/features/platform-core/commands/registry.ts:17`)：使用 `createPlatformCommandDefinition` 工厂注册 2 个新类型
- **`parseManifestOrThrow`** (`src/lib/dal/plugins.ts:282`)：manifest 校验入口，新增字段自动被 Zod parse 覆盖
- **`PluginDataModelSchema`** (`src/lib/dto/plugin-data-model.ts`)：声明式 schema 的具名拒因码范式参考（`PLUGIN_DATA_MODEL_REASONS`）

### Established Patterns
- **Zod discriminated union**：`PlatformCommandSchema` 已使用 `z.discriminatedUnion("type")` 处理多种命令变体，`systemCommands` 同步此模式
- **`.optional()` + `.superRefine`**：`PluginManifestSchema` 现有模式——`governance` 字段 `.optional()`，manifest v2 要求时通过 superRefine 校验
- **`createPlatformCommandDefinition`**：类型安全的工厂函数，所有现有命令类型均使用此模式注册
- **具名拒因码**：`UPPER_SNAKE` 常量数组 + `z.enum`，被 vitest 逐个断言——参考 `plugin-data-model.ts` 和 `draft-guardrails.ts`

### Integration Points
- **Install preflight**：`parseManifestOrThrow` → `PluginManifestSchema.parse` 自然覆盖 systemCommands 校验
- **Command Bus**：`dispatchPlatformCommand` (`bus.ts:241`) 通过 `readDefinition` 查 registry，新命令类型自动可用
- **Governance Audit**：`governanceAudits` 表 reasonCode 为 text 列，新增拒因码直接写入无需 migration
</code_context>

<specifics>
## Specific Ideas

无特定偏好——讨论中所有决策均达成一致，采用推荐方案。
</specifics>

<deferred>
## Deferred Ideas

None — 讨论保持在 phase scope 内。
</deferred>

---

*Phase: 77-Manifest 声明 + Command Registry 注册*
*Context gathered: 2026-06-11*
