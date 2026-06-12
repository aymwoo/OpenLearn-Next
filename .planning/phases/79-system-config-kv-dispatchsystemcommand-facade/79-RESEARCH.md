# Phase 79: system.config KV 配置 + dispatchSystemCommand facade - Research

**Researched:** 2026-06-12
**Domain:** Plugin system commands -- KV configuration storage + unified dispatch facade
**Confidence:** HIGH

## Summary

Phase 79 在 Phase 77/78 已铺设的 System Commands 基础设施之上交付两个核心能力：`system.config.get/set` KV 配置读写，以及 `dispatchSystemCommand` 统一入口 facade。所有组件均落位在 `src/features/system-commands/` 模块内（与 Phase 78 内聚）。

`dispatchSystemCommand` facade 采取「治理门泛化复用 + 判别派发 + handler 自治」三段式结构。`assertActionExecutable`（`governance-gate.ts`）的 `verb` 参数从 `PluginDataAccessVerb` 泛化为 `string`，一个函数同时服务 `dispatchPluginDataAccess` 和 `dispatchSystemCommand` 两个 facade。facade 只做治理门调用 + 审计日志写入，handler 层继续负责 manifest re-parse + 业务 authorize/execute。

`system.config` 使用 `pluginOwnedBusinessData` 表（非新建独立表），key 以 `{schoolId}:{pluginId}:{key}` 三重前缀隔离。set 走 Command Bus（构造 PlatformCommand envelope → `dispatchPlatformCommand`），get 纯读走 DAL（不过治理门，不声明为 PlatformCommandType）。manifest `allowedKeys` 白名单支持前缀通配（`homework:*`），handler 层每次调用 re-parse manifestJson 做匹配。

**Primary recommendation:** 在 Phase 78 handler/audit 的成熟模式上 additive 扩展——新建 facade.ts 做治理门+派发，扩展 handler.ts 添加 system.config 的 authorize/execute，扩展 audit.ts 的 action 字段支持 commandType 参数化，泛化 governance-gate.ts 的 verb 签名为 string。

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Governance gate (lifecycle + kill-switch + school scope) | API / Backend | -- | `assertActionExecutable` 从认证 session 派生 schoolId，检查插件 lifecycle 和 kill-switch state |
| Manifest 白名单 re-parse + allowedKeys 匹配 | API / Backend (handler) | -- | handler.authorize 每次从 `pluginRegistrations.manifestJson` 解析，验证 key 在白名单内 |
| system.config.set 写入 | API / Backend (handler) | Database / Storage | handler.execute 构造 key = `{schoolId}:{pluginId}:{key}`，upsert 到 `pluginOwnedBusinessData` |
| system.config.get 读取 | API / Backend (handler) | Database / Storage | handler 直接 DAL 查询 `pluginOwnedBusinessData`，不过 Command Bus |
| dispatchSystemCommand 派发 | API / Backend (facade) | -- | 治理门 → 判别派发（set→Command Bus / get→DAL）→ 结果返回 |
| Governance audit 写入 | API / Backend (audit.ts) | -- | 每次 deny/allowed 都写 `governanceAudits`，deny 先写 audit 再抛错 |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zod | ^4.x（项目现有） | Schema validation -- configKey 含 `:` 禁止、allowedKeys 白名单 re-parse、64KB 大小校验 | [VERIFIED: npm registry] 项目已用，`SystemCommandDiscriminatedSchema` discriminated union 已在 resource-ai.ts，Phase 77 已定义 `SystemConfigSetPayloadSchema` |
| Drizzle ORM | 0.45.2 | `pluginOwnedBusinessData` 表 upsert/select | [VERIFIED: npm registry] 项目约束，表已在 schema.ts:1884 定义 |
| libSQL/SQLite | 项目现有 | 持久化 | 项目约束，`pluginOwnedBusinessData` 表已有 `(schoolId, pluginId, key)` 唯一约束 |
| Node.js crypto (hash) | 24.1.0 内建 | facade correlationId 派生 | [VERIFIED: node --version] 项目已用，`dispatchPluginDataAccess` facade 同模式 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `createHash` (node:crypto) | Node 24 内建 | correlationId 稳定派生 | facade 每次调用生成 |
| `drizzle-orm` `eq` / `and` / `sql` | 0.45.2 | `pluginOwnedBusinessData` 精确查询 | system.config.get DAL 读取 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 复用 `pluginOwnedBusinessData`（CONTEXT D-08/D-09 决策） | 新建 `systemPluginConfig` 表（ARCHITECTURE.md 推荐） | CONTEXT 已锁定：复用现有表，不引入新表+migration。权衡：key 命名需 `{schoolId}:{pluginId}:{key}` 三重前缀，但避免了 schema 变更和双表同步 |
| `system.config.set` 不建独立 producer（CONTEXT D-08 决策） | 新建 `produceSystemConfigSet` producer | CONTEXT 已锁定：handler.execute 内直接构造 PlatformCommand envelope + 调 `dispatchPlatformCommand`。权衡：省掉一个 producer 文件，handler 内做 envelope 构造略增加 handler 复杂度 |
| `system.config.get` 不过治理门（CONTEXT D-06 决策） | 经治理门统一入口 | CONTEXT 已锁定：纯读不过治理门。权衡：读操作无需 lifecycle/kill-switch 检查，但 handler 层仍需做 manifest 白名单 re-parse |

**Installation:**
```bash
# 零外部依赖——所有能力由项目现有依赖提供
```

**Version verification:** 所有核心依赖版本来自项目现有 `package.json` 和 `node_modules` 现场确认（2026-06-12）。Node.js 24.1.0，pnpm 10.33.0，Drizzle ORM 0.45.2，Zod 4.x。

## Package Legitimacy Audit

> 本 Phase 不引入任何新外部包——全部复用项目现有依赖（Zod、Drizzle ORM、Node.js 内建模块）。

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| (none) | -- | -- | -- | -- | -- | No new packages |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
插件调用 dispatchSystemCommand({ commandType: "system.config.set", pluginKey, configKey, configValue })
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│              dispatchSystemCommand facade (facade.ts)                │
│                                                                      │
│  ① 治理门前置                                                       │
│     assertActionExecutable({ actorId, pluginKey, verb: commandType,  │
│       correlationId })                                               │
│     → 返回 { schoolId, projectionRow }                              │
│     → 拒绝时: writeSystemCommandAudit("denied") → throw              │
│                                                                      │
│  ② 判别派发                                                          │
│     ├─ commandType === "system.config.set"                           │
│     │    └→ handler.execute → 构造 PlatformCommand envelope          │
│     │       → dispatchPlatformCommand                                │
│     │       → Command Bus pipeline: validate → authorize → execute   │
│     │                                                                 │
│     ├─ commandType === "system.config.get"                           │
│     │    └→ handler.authorize（manifest allowedKeys re-parse）       │
│     │       → handler.execute（纯 DAL 读取 pluginOwnedBusinessData）│
│     │                                                                 │
│     └─ commandType === "system.http.request"（Phase 78 已有）       │
│          └→ systemHttpRequestHandler（不变）                         │
│                                                                      │
│  ③ 结果返回                                                          │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼  (system.config.set 路径)
┌─────────────────────────────────────────────────────────────────────┐
│                    Command Bus (bus.ts)                               │
│  validate → resolveDedupe → persist → authorize → execute →          │
│  updateSummary → publishEvents                                       │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼  (handler.authorize)
┌─────────────────────────────────────────────────────────────────────┐
│  manifest re-parse 白名单匹配 (handler.ts)                           │
│  → pluginRegistrations.manifestJson → PluginManifestSchema.parse     │
│  → systemCommands 段提取 command === "system.config"                 │
│  → allowedKeys 逐条匹配 configKey（前缀通配 homework:*）             │
│  → 拒绝: writeSystemCommandAudit("denied", "config_key_denied")      │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼  (handler.execute - set 路径)
┌─────────────────────────────────────────────────────────────────────┐
│  pluginOwnedBusinessData upsert                                      │
│  key = "{schoolId}:{pluginId}:{configKey}"                           │
│  INSERT ... ON CONFLICT (schoolId, pluginId, key) DO UPDATE          │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼  (handler.execute - get 路径)
┌─────────────────────────────────────────────────────────────────────┐
│  pluginOwnedBusinessData 直接 DAL 查询                               │
│  SELECT payloadJson WHERE schoolId=? AND pluginId=? AND key=?        │
│  不存在返回 null，不抛错                                              │
└─────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
src/features/system-commands/
├── facade.ts          # [新增] dispatchSystemCommand 统一入口——治理门+判别派发
├── handler.ts         # [扩展] 新增 system.config.set/get authorize+execute
├── audit.ts           # [扩展] writeSystemCommandAudit action 参数化
└── ssrf-guard.ts      # [不变] Phase 78 SSRF 防护
```

### Pattern 1: Facade 三段式（治理门泛化复用）

**What:** facade 只做治理门调用 + 判别派发 + 审计日志。handler 自治做 manifest re-parse + 业务 authorize/execute。

**When to use:** 所有 `system.*` 命令的统一入口。

**Example:**
```typescript
// Source: 镜像 dispatchPluginDataAccess (facade.ts:43-118) + CONTEXT D-04
export async function dispatchSystemCommand(input: {
  commandType: "system.config.set" | "system.config.get";
  pluginKey: string;
  actorId: string;
  configKey: string;
  configValue?: unknown;  // set 时提供
}) {
  const correlationId = buildSystemCommandCorrelationId(input);
  
  // ① 治理门前置：schoolId 由 session 派生注入
  const { schoolId, projectionRow } = await assertActionExecutable({
    actorId: input.actorId,
    pluginKey: input.pluginKey,
    verb: input.commandType,  // 泛化为 string
    correlationId,
  });
  
  // ② 判别派发
  if (input.commandType === "system.config.set") {
    return handler.set.execute({ /* ... */ });
  }
  if (input.commandType === "system.config.get") {
    return handler.get.authorize({ /* ... */ }).then(() => handler.get.execute({ /* ... */ }));
  }
}
```

### Pattern 2: Manifest Re-parse + allowedKeys 前缀通配匹配

**What:** handler.authorize 每次从 `pluginRegistrations.manifestJson` 反序列化 `PluginManifestSchema`，提取 `systemCommands` 中 `command === "system.config"` 的条目，逐条匹配 `allowedKeys`。前缀通配 `homework:*` 匹配 `homework:title` 等，不跨层（不匹配 `homework:sub:key`）。

**When to use:** system.config.set/get handler 的 authorize 阶段。

**Example:**
```typescript
// Source: 镜像 Phase 78 handler.ts authorize + CONTEXT D-10/D-11
async function authorizeSystemConfig({
  command, configKey
}: {
  command: PlatformCommand; configKey: string;
}): Promise<MatchedConfigEntry> {
  const row = await db.query.pluginRegistrations.findFirst({
    where: and(
      eq(pluginRegistrations.id, command.scope.pluginId),
      eq(pluginRegistrations.schoolId, command.scope.schoolId),
    ),
  });
  
  const manifest = PluginManifestSchema.parse(row.manifestJson);
  const systemCommands = manifest.systemCommands ?? [];
  
  // 提取 command === "system.config" 的条目
  const configEntries = systemCommands.filter(
    (entry): entry is typeof entry & { command: "system.config" } =>
      entry.command === "system.config",
  );
  
  // 逐条匹配 allowedKeys（前缀通配）
  for (const entry of configEntries) {
    for (const allowedKey of entry.allowedKeys) {
      if (matchConfigKey(allowedKey, configKey)) {
        return { matched: true, entry };
      }
    }
  }
  
  // No match → deny
  await writeSystemCommandAudit({ /* ... */, reasonCode: "config_key_denied" });
  throw new PlatformCommandExecutionError({ /* ... */ });
}

// 前缀通配匹配：homework:* 匹配 homework:title
function matchConfigKey(pattern: string, key: string): boolean {
  if (pattern.endsWith(":*")) {
    const prefix = pattern.slice(0, -2); // "homework"
    return key.startsWith(prefix + ":") && !key.slice(prefix.length + 1).includes(":");
  }
  return pattern === key;
}
```

### Pattern 3: Command Bus 直调（无独立 producer）

**What:** `system.config.set` handler.execute 内部直接构造 `PlatformCommand` envelope 调 `dispatchPlatformCommand`，不符合 producer 模式。但与 Phase 78 `system.http.request` handler 的 registry 注册路径一致——handler 通过 registry 的 `createPlatformCommandDefinition` 注册，bus 自动调用 authorize/execute。

**实际上 Phase 79 应修正理解：** registry.ts 中 `system.config.set` 的 handler 已在 Phase 77 注册为 stub（authorize/execute 均为空实现）。Phase 79 的任务是将 stub 替换为真实实现，而非新建 producer。handler.execute 内部通过 `db.insert/update` 直接操作 `pluginOwnedBusinessData` 表——这是 Command Bus handler 的标准模式（mirror Phase 78 handler execute 内直接调 fetch）。

**修正后的数据流（匹配 CONTEXT D-08 的真实意图）：**

```
dispatchSystemCommand facade
  → assertActionExecutable（治理门）
  → 构造 PlatformCommand envelope { type: "system.config.set", scope, payload, ... }
  → dispatchPlatformCommand(envelope, dependencies)
  → bus 内部: validate → resolveDedupe → persist → authorize → execute
    → handler.authorize: manifest allowedKeys re-parse
    → handler.execute: db.insert(pluginOwnedBusinessData).values({...})
```

### Anti-Patterns to Avoid

- **Anti-pattern: facade 内做 manifest re-parse** — handler 层自治做 manifest 白名单验证（CONTEXT D-05），facade 只做治理门+派发。
- **Anti-pattern: system.config.get 走 Command Bus** — 纯读操作不产生 command record，不走 dedupe 逻辑（CONTEXT D-06/D-07）。
- **Anti-pattern: 从 payload 读取 schoolId** — schoolId 唯一权威来自认证 session 派生注入（governance-gate.ts），handler 使用 `command.scope.schoolId`。
- **Anti-pattern: configKey 不过 Zod 层校验就进 manifest 匹配** — Zod 层拒绝含 `:` 的 key（D-12），manifest 匹配时不需再检查 `:` 字符。
- **Anti-pattern: 为 set 路径新建独立 producer 文件** — CONTEXT D-08 明确不建独立 producer，handler.execute 内直接操作 DAL（同 Phase 78 handler 内直接调 fetch）。

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Key 前缀隔离（多租户+多插件） | 自定义 key 前缀拼接函数 | 三重前缀：`${schoolId}:${pluginId}:${configKey}`，由 handler 注入前两段，configKey 由 Zod 校验不含 `:` | 消除前缀不一致导致的跨插件/跨学校数据泄漏 |
| configKey Zod 层校验 | 运行时字符串检查 | `z.string().min(1).refine(k => !k.includes(":"), "key must not contain colon")` | 类型安全，边界先行——在 Zod 解析阶段就拒绝非法 key |
| 64KB 大小限制 | 写入后检查 | handler.authorize 中 `JSON.stringify(configValue).length <= 65536` 预校验 | 拒绝 oversized payload 在写入前，避免浪费 DB 写入 |
| manifest allowedKeys 通配匹配 | 正则表达式匹配 | 自定义 `matchConfigKey(pattern, key)` 函数：`prefix:*` → checks `key.startsWith(prefix + ":") && no deeper colons` | Phase 78 `matchDomain` 同模式，简单可靠 |
| correlationId 派生 | 随机 UUID | `createHash("sha256").update(`system-cmd:${commandType}:${pluginKey}:${actorId}`).digest("hex")` | 稳定可复现的 correlationId，镜像 facade.ts `buildFacadeCorrelationId` |
| pluginOwnedBusinessData upsert | 手动 SELECT + INSERT/UPDATE 分支 | SQLite `INSERT ... ON CONFLICT (schoolId, pluginId, key) DO UPDATE SET payloadJson = excluded.payloadJson, updatedAt = excluded.updatedAt` | 原子 upsert，避免 race condition |

**Key insight:** `pluginOwnedBusinessData` 表已有 `(schoolId, pluginId, key)` 唯一约束——利用 SQLite 的 ON CONFLICT 语义实现原子 upsert，不需要应用层先查后写。

## Runtime State Inventory

> 本 Phase 为新增功能，非 rename/refactor/migration 阶段——无需 Runtime State Inventory。所有变更为 additive（新增 facade + 扩展 handler + 替换 registry stub）。

## Common Pitfalls

### Pitfall 1: KEY_PATTERN 与 `:` 拒绝逻辑冲突

**What goes wrong:** Phase 77 定义的 `KEY_PATTERN`（`resource-ai.ts:793`）允许 `homework:deadline` 格式（恰好一个 `:` 分隔两段标识符）。但 CONTEXT D-12 要求「key 含 `:` 字符在 Zod 层拒绝」。这两个约束矛盾——`KEY_PATTERN` 是 manifest allowedKeys 的声明格式，允许声明 `homework:*` 前缀通配，但 runtime configKey 调用不应包含 `:`。

**How to avoid:**
- `KEY_PATTERN` 保持不变——它是 manifest 声明的 allowedKeys 白名单格式（允许 `:` 表达前缀通配）
- configKey 的 Zod 层新增独立 schema：`z.string().min(1).max(256).refine(k => !k.includes(":"), "config key must not contain colon")`——这是 runtime 调用的 payload 校验
- manifest allowedKeys 声明 `["homework:*"]` 是合法声明；runtime 调用 `configKey = "homework:deadline"` 需要在 handler 的 input schema 中被拒绝

**Warning signs:** KEY_PATTERN 和 configKey Zod schema 使用同一个正则，导致 either manifest 不支持前缀通配，or runtime 允许含 `:` 的 key。

### Pitfall 2: `assertActionExecutable` 泛化破坏已有调用

**What goes wrong:** D-01 将 `verb` 参数从 `PluginDataAccessVerb` 泛化为 `string`。如果 `dispatchPluginDataAccess` 调用处依赖 TypeScript 对 verb 的类型窄化（如 `switch` 穷尽检查），泛化后编译通过但运行时可能传入未预期的 system command verb。

**How to avoid:**
- `dispatchPluginDataAccess` 内部 switch 语句已有 `default` 分支（facade.ts:112-118），泛化不影响已有兜底逻辑
- `writeDenial` 内部使用 `input.verb` 构造 `payloadJson`，泛化为 string 后 audit 记录仍正确
- 确认 `dispatchPluginDataAccess` 的所有调用方都传 PluginDataAccessVerb（5 个：insert/upsert/getByIndex/count/aggregate），泛化不改变这些调用方的行为

**Warning signs:** 泛化后 `dispatchPluginDataAccess` 的 switch 穷尽检查失效（但已有 default 兜底所以不算 breaking）。

### Pitfall 3: audit action 字段硬编码 vs 参数化

**What goes wrong:** Phase 78 的 `writeSystemCommandAudit` 硬编码 `action: "system.http.request"`。Phase 79 新增 `system.config.set`/`system.config.get` 后，同一个 audit 函数需要写不同的 action 值。

**How to avoid:**
- 扩展 `writeSystemCommandAudit` 添加 `commandType` 参数（如 `"system.config.set"` | `"system.config.get"`）
- `action` 字段使用传入的 `commandType` 而非硬编码
- [CITED: CONTEXT D-13/D-14] "audit action 字段直接使用 commandType"
- 与 Phase 78 已有调用方兼容：Phase 78 的调用传入 `"system.http.request"` 即可

**Warning signs:** 不修改 audit.ts 而新建第二个 audit 函数——导致审计逻辑分裂。

### Pitfall 4: `system.config.get` handler 权限检查缺失

**What goes wrong:** D-06 说 `system.config.get` 不过治理门，但如果 handler 也不做 manifest allowedKeys 校验，插件即可读取任意 key（包括通过猜测 key 名尝试读取其他插件的配置）。

**How to avoid:**
- `system.config.get` handler 层仍需做 manifest re-parse + allowedKeys 匹配（与 set 完全相同的前置 authorize 逻辑）
- 唯一区别：get 不经过 Command Bus 的 write 路径（不过 `dispatchPlatformCommand`，不写 command record）
- 三重前缀隔离（`{schoolId}:{pluginId}:{key}`）在 DAL 查询时强制注入：`WHERE schoolId=? AND pluginId=? AND key=?`

**Warning signs:** `system.config.get` handler 的 authorize 被跳过，直接 execute DAL 查询。

## Code Examples

Verified patterns from official sources and existing codebase:

### system.config.set handler authorize + execute

```typescript
// Source: 镜像 Phase 78 handler.ts authorize + CONTEXT D-09/D-10
// src/features/system-commands/handler.ts 扩展

import { db } from "@/db";
import { pluginRegistrations, pluginOwnedBusinessData } from "@/db/schema";
import { PluginManifestSchema } from "@/lib/dto/resource-ai";
import { eq, and, sql } from "drizzle-orm";

// ── Zod schemas ──
const ConfigKeySchema = z.string().min(1).max(256)
  .refine(k => !k.includes(":"), "config key must not contain colon");

const SystemConfigSetInputSchema = z.strictObject({
  configKey: ConfigKeySchema,
  configValue: z.unknown()
    .refine(v => {
      try { JSON.stringify(v); return true; } catch { return false; }
    }, "configValue must be JSON-serializable")
    .superRefine((v, ctx) => {
      const size = new TextEncoder().encode(JSON.stringify(v)).length;
      if (size > 65536) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `configValue size ${size} exceeds 64KB limit`,
        });
      }
    }),
});

// ── Key matching (mirror Phase 78 matchDomain) ──
function matchConfigKey(pattern: string, key: string): boolean {
  if (pattern.endsWith(":*")) {
    const prefix = pattern.slice(0, -2);
    // homework:* matches homework:title, NOT homework:sub:key (no deep nesting)
    return key.startsWith(prefix + ":") && !key.slice(prefix.length + 1).includes(":");
  }
  return pattern === key;
}

// ── Authorize ──
async function systemConfigSetAuthorize({
  command,
}: {
  command: PlatformCommand;
}): Promise<void> {
  const pluginId = command.scope.pluginId;
  const schoolId = command.scope.schoolId;
  const configKey = (command.payload as SystemConfigSetPayload).configKey;

  const row = await db.query.pluginRegistrations.findFirst({
    where: and(
      eq(pluginRegistrations.id, pluginId),
      eq(pluginRegistrations.schoolId, schoolId),
    ),
  });

  if (!row) {
    await writeSystemCommandAudit({
      pluginId, schoolId, commandId: command.id,
      actorId: command.actor.actorId,
      actorScope: command.actor.actorScope,
      lifecycleState: "ready",
      correlationId: command.correlation.correlationId,
      decision: "denied",
      reasonCode: "config_key_denied",
      commandType: "system.config.set",
      payloadJson: { configKey },
    });
    throw new PlatformCommandExecutionError({ /* ... */ });
  }

  const manifest = PluginManifestSchema.parse(row.manifestJson);
  const systemCommands = manifest.systemCommands ?? [];
  const configEntries = systemCommands.filter(
    (e): e is typeof e & { command: "system.config" } => e.command === "system.config",
  );

  if (configEntries.length === 0) {
    await writeSystemCommandAudit({
      pluginId, schoolId, commandId: command.id,
      actorId: command.actor.actorId,
      actorScope: command.actor.actorScope,
      lifecycleState: row.lifecycleState ?? "ready",
      correlationId: command.correlation.correlationId,
      decision: "denied",
      reasonCode: "config_key_denied",
      commandType: "system.config.set",
      payloadJson: { configKey },
    });
    throw new PlatformCommandExecutionError({ /* ... */ });
  }

  for (const entry of configEntries) {
    for (const allowedKey of entry.allowedKeys) {
      if (matchConfigKey(allowedKey, configKey)) return; // authorized
    }
  }

  await writeSystemCommandAudit({
    pluginId, schoolId, commandId: command.id,
    actorId: command.actor.actorId,
    actorScope: command.actor.actorScope,
    lifecycleState: row.lifecycleState ?? "ready",
    correlationId: command.correlation.correlationId,
    decision: "denied",
    reasonCode: "config_key_denied",
    commandType: "system.config.set",
    payloadJson: { configKey },
  });
  throw new PlatformCommandExecutionError({ /* ... */ });
}

// ── Execute ──
async function systemConfigSetExecute({
  command,
}: {
  command: PlatformCommand;
  attemptNumber: number;
}): Promise<PlatformCommandExecutionResult> {
  const pluginId = command.scope.pluginId;
  const schoolId = command.scope.schoolId;
  const configKey = (command.payload as SystemConfigSetPayload).configKey;
  const configValue = (command.payload as SystemConfigSetPayload).configValue;

  // 构造隔离 key：{schoolId}:{pluginId}:{configKey}
  const storageKey = `${schoolId}:${pluginId}:${configKey}`;

  await db
    .insert(pluginOwnedBusinessData)
    .values({
      schoolId,
      pluginId,
      key: storageKey,
      payloadJson: configValue,
    })
    .onConflictDoUpdate({
      target: [pluginOwnedBusinessData.schoolId, pluginOwnedBusinessData.pluginId, pluginOwnedBusinessData.key],
      set: {
        payloadJson: sql`excluded.payloadJson`,
        updatedAt: sql`excluded.updatedAt`,
      },
    });

  await writeSystemCommandAudit({
    pluginId, schoolId, commandId: command.id,
    actorId: command.actor.actorId,
    actorScope: command.actor.actorScope,
    lifecycleState: "ready",
    correlationId: command.correlation.correlationId,
    decision: "allowed",
    commandType: "system.config.set",
    payloadJson: { configKey, byteLength: JSON.stringify(configValue).length },
  });

  return {
    resultSummary: { configKey, pluginId, schoolId },
    invalidation: { tags: [] },
    emittedEvents: [],
    failureEvent: null,
    failureAttribution: null,
  };
}
```

### system.config.get handler

```typescript
// Source: 镜像 set handler authorize + CONTEXT D-06/D-07 (纯读走DAL)
// get 不过 Command Bus，handler 独立导出为直接调用的函数

async function systemConfigGetAuthorize({
  pluginId, schoolId, configKey
}: {
  pluginId: string; schoolId: string; configKey: string;
}): Promise<void> {
  // Manifest re-parse + allowedKeys 匹配（与 set authorize 完全相同的逻辑）
  // ...
}

async function systemConfigGetExecute({
  pluginId, schoolId, configKey
}: {
  pluginId: string; schoolId: string; configKey: string;
}): Promise<unknown | null> {
  const storageKey = `${schoolId}:${pluginId}:${configKey}`;

  const row = await db.query.pluginOwnedBusinessData.findFirst({
    where: and(
      eq(pluginOwnedBusinessData.schoolId, schoolId),
      eq(pluginOwnedBusinessData.pluginId, pluginId),
      eq(pluginOwnedBusinessData.key, storageKey),
    ),
    columns: { payloadJson: true },
  });

  return row?.payloadJson ?? null;
}
```

### dispatchSystemCommand facade

```typescript
// Source: 镜像 dispatchPluginDataAccess (facade.ts:43-118) + CONTEXT D-03/D-04
// src/features/system-commands/facade.ts

import { createHash } from "node:crypto";
import { assertActionExecutable } from "@/features/platform-core/plugin-data-access/governance-gate";
import { writeSystemCommandAudit } from "./audit";

export async function dispatchSystemCommand(input: {
  commandType: string;
  pluginKey: string;
  actorId: string;
  configKey?: string;
  configValue?: unknown;
}) {
  const correlationId = buildSystemCommandCorrelationId(input);

  // ① 治理门前置
  const { schoolId, projectionRow } = await assertActionExecutable({
    actorId: input.actorId,
    pluginKey: input.pluginKey,
    verb: input.commandType,  // 泛化为 string
    correlationId,
  });

  // ② 判别派发
  if (input.commandType === "system.config.set") {
    // 构造 PlatformCommand envelope → dispatchPlatformCommand
    // → handler.authorize + handler.execute
    // ...
  }

  if (input.commandType === "system.config.get") {
    // 纯读：handler.authorize（manifest re-parse）→ handler.execute（DAL 查询）
    await systemConfigGetAuthorize({
      pluginId: projectionRow.pluginId,
      schoolId,
      configKey: input.configKey!,
    });
    return systemConfigGetExecute({
      pluginId: projectionRow.pluginId,
      schoolId,
      configKey: input.configKey!,
    });
  }

  if (input.commandType === "system.http.request") {
    // Phase 78 已有——透传
  }
}

function buildSystemCommandCorrelationId(input: { commandType: string; pluginKey: string; actorId: string }): string {
  const base = `system-cmd:${input.commandType}:${input.actorId}:${input.pluginKey}`;
  return createHash("sha256").update(base).digest("hex");
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `assertActionExecutable` 接受 `PluginDataAccessVerb` | 泛化为 `string` | Phase 79 | 一个函数同时服务 `dispatchPluginDataAccess` 和 `dispatchSystemCommand` |
| `writeSystemCommandAudit` 硬编码 `action: "system.http.request"` | 参数化 `commandType` 字段 | Phase 79 | audit 表 action 字段支持多个 commandType |
| `system.config.set` registry stub（throw Error） | 真实 handler | Phase 79 | Command Bus 可正常派发 system.config.set |
| `pluginOwnedBusinessData` 仅用于 marketplace 生命周期数据 | 也用于 system.config KV 配置 | Phase 79 | 三重前缀隔离确保不与既有 key 冲突 |

**Deprecated/outdated:**
- `registry.ts:170` `throw new Error("system.config.set handler not implemented — Phase 79")` — Phase 79 替换为真实 handler

## Assumptions Log

> 本 Phase 的所有实现决策均来自 CONTEXT.md 中的锁定决策（D-01 至 D-17），或在既有代码库中有明确参考模式（Phase 78 handler、Phase 68 facade）。零 `[ASSUMED]` 标记。

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| (none) | -- | -- | -- |

## Open Questions (RESOLVED)

1. **`pluginOwnedBusinessData` 的 `key` 列是否支持 `:` 字符？**
   - What we know: 表定义为 `text("key").notNull()`，SQLite 对 text 列无字符限制。
   - What's unclear: 确认已有 marketplace 数据是否使用 `:` 作为 key 的一部分——如有冲突，需选择不同分隔符。
   - Recommendation: 在实现前检查 `pluginOwnedBusinessData` 表现有 key 值，确认 `{schoolId}:{pluginId}:` 前缀不与现有 key 冲突。如有冲突，可用 `::` 双冒号作为分隔符。
   - **RESOLVED (D-06):** key 列支持 `:` 字符（SQLite text 无字符限制）。三重前缀构造为 `{schoolId}:{pluginId}:{configKey}`，configKey 已在 Zod 层拒绝含 `:` 字符，因此 `:` 仅作为前缀分隔符出现，不与现有 key 冲突。参考 CONTEXT.md D-06。

2. **`system.config.get` 的 facade 入口参数是否需要 `configKey` Zod 校验？**
   - What we know: CONTEXT D-12 说 "key 含 `:` 字符在 Zod 层拒绝"。但 get 不过 Command Bus（没有 PlatformCommandSchema 的自动校验）。
   - **RESOLVED (D-12):** 需要。facade 入口处使用 `ConfigKeySchema`（`z.string().min(1).max(256).refine(k => !k.includes(":"))`）对 configKey 做显式 Zod 校验，确保 set/get 两端边界一致。参考 CONTEXT.md D-12。
   - Recommendation: facade 入口处对 `configKey` 显式做 Zod 校验（使用 `ConfigKeySchema`），确保边界一致。

3. **`dispatchSystemCommand` facade 是否需要为 `system.config.set` 构造 PlatformCommand envelope 并调用 `dispatchPlatformCommand`，而非直接操作 DAL？**
   - What we know: CONTEXT D-08 说 "handler.execute 中直接构造 PlatformCommand envelope，调用 dispatchPlatformCommand（与 Phase 78 system.http.request handler 模式一致）"。但 Phase 78 handler 实际是通过 registry 注册 + bus 管道调用的，不是 facade 内直接构造 envelope。
   - What's unclear: CONTEXT D-08 的真实意图是 facade 构造 envelope 后调 `dispatchPlatformCommand`，还是 facade 调 handler 而 handler 替换 registry 注册后经由 bus 自动调用？
   - **RESOLVED (D-08 + D-04):** facade 构造 PlatformCommand envelope → 调用 `dispatchPlatformCommand` → bus 内部自动走 validate → dedupe → persist → authorize → execute 管道。handler 通过 registry 注册，bus 自动调用 handler.authorize + handler.execute。参考 CONTEXT.md D-08 和 D-04。
   - Recommendation: 采用与 Phase 78 一致的模式——handler 替换 registry 中的 stub，facade 构造 PlatformCommand envelope 后调用 `dispatchPlatformCommand`（与 plugin-data producer 的 `dispatchPluginDataWriteCommand` 模式一致）。这样 system.config.set 走完整的 Command Bus 管道（validate → dedupe → persist → authorize → execute）。

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | 运行时 | Yes | 24.1.0 | -- |
| pnpm | 包管理 | Yes | 10.33.0 | -- |
| Drizzle ORM | DAL 查询 | Yes | 0.45.2 | -- |
| Zod | Schema validation | Yes | 4.x | -- |
| SQLite/libSQL | 持久化 | Yes | 项目现有 | -- |

**Missing dependencies with no fallback:** 无——所有依赖均已就绪。
**Missing dependencies with fallback:** 无。

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | session 认证 → `assertActionExecutable` 中 `deriveActiveSchoolScope` 派生 actor 身份 |
| V3 Session Management | Yes | schoolId 由 session 派生注入，绝不从 payload 读取 |
| V4 Access Control | Yes | 三重前缀隔离（schoolId:pluginId:key）+ manifest allowedKeys 白名单 + 治理门 lifecycle/kill-switch |
| V5 Input Validation | Yes | Zod：configKey 不含 `:`、configValue JSON 可序列化 + 64KB 上限、allowedKeys 白名单 re-parse |
| V6 Cryptography | No | 本 Phase 无加密操作——数据持久化在 SQLite 本地 |

### Known Threat Patterns for system.config KV

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 跨插件 config 读取（plugin A 读取 plugin B 的 key） | Information Disclosure | 三重前缀隔离：key 格式为 `{schoolId}:{pluginId}:{key}`，DAL 查询强制注入 schoolId + pluginId |
| 跨学校 config 读取（School A 的 plugin 读取 School B 的配置） | Information Disclosure | 同上，schoolId 由 session 派生注入 |
| 超大 configValue 导致 DB 行膨胀 | Denial of Service | 单值 64KB 上限，handler.authorize 预校验 |
| configKey 注入 `:` 绕过前缀隔离 | Tampering / Elevation of Privilege | Zod 层 `refine(k => !k.includes(":"))` 拒绝 |
| 绕过 manifest allowedKeys 白名单 | Elevation of Privilege | handler.authorize 每次 re-parse manifestJson，逐个匹配 allowedKeys |
| SQL 注入 via configKey | Tampering | Drizzle ORM 参数化查询，不使用字符串拼接 |
| Deny 分支审计缺失 | Repudiation | 所有拒绝点先写 `writeSystemCommandAudit` 再抛错 |

## Sources

### Primary (HIGH confidence)
- [Context7: Unavailable] — Context7 MCP 未配置，使用代码库直接审计替代。
- [Codebase: `src/features/system-commands/handler.ts`] — Phase 78 system.http.request handler（authorize/execute 模式参考）
- [Codebase: `src/features/system-commands/audit.ts`] — Phase 78 writeSystemCommandAudit（需扩展 action 参数化）
- [Codebase: `src/features/platform-core/plugin-data-access/governance-gate.ts`] — assertActionExecutable（D-01 泛化目标）
- [Codebase: `src/features/platform-core/plugin-data-access/facade.ts`] — dispatchPluginDataAccess（三段式 facade 参考）
- [Codebase: `src/features/platform-core/plugin-data-access/audit.ts`] — writePluginDataAccessAudit（审计写入参考模式）
- [Codebase: `src/features/platform-core/commands/contracts.ts`] — SystemConfigSetPayloadSchema + PlatformCommandSchema discriminated union
- [Codebase: `src/features/platform-core/commands/registry.ts`] — system.config.set stub（Phase 79 替换）
- [Codebase: `src/features/platform-core/commands/producers/plugin-data.ts`] — dispatchPluginDataWriteCommand / dispatchPlatformCommand 调用模式
- [Codebase: `src/features/platform-core/commands/bus.ts`] — dispatchPlatformCommand 管道（validate → dedupe → authorize → execute）
- [Codebase: `src/lib/dto/resource-ai.ts`] — SystemCommandConfigSchema、SystemCommandDiscriminatedSchema、PluginManifestSchema
- [Codebase: `src/features/runtime-platform/contracts/permissions.ts`] — GovernanceDeniedReasonValues（含 config_key_denied）
- [Codebase: `src/db/schema.ts`] — pluginOwnedBusinessData 表（L1884）+ governanceAudits 表（L1325）
- [CONTEXT.md: `.planning/phases/79-system-config-kv-dispatchsystemcommand-facade/79-CONTEXT.md`] — D-01 至 D-17 锁定决策
- [REQUIREMENTS.md: `.planning/REQUIREMENTS.md`] — SYS-02、SYS-04 需求定义

### Secondary (MEDIUM confidence)
- [`.planning/research/ARCHITECTURE.md`] — v4.3 System Commands 架构研究（构建顺序、数据流、不变式）
- [`.planning/research/PITFALLS.md`] — SSRF、TOCTOU、KV 隔离等已知陷阱
- [`.planning/research/STACK.md`] — 技术栈选择（DNS pinning、KV 配置模式）
- [Phase 78 CONTEXT: `.planning/phases/78-system-http-request-http/78-CONTEXT.md`] — handler authorize/execute 签名、manifest re-parse 模式
- [Phase 77 CONTEXT: `.planning/phases/77-manifest-command-registry/77-CONTEXT.md`] — SystemCommandDiscriminatedSchema 结构、registry 注册模式、拒因码

### Tertiary (LOW confidence)
- 无——所有发现均来自既有代码库审计或锁定决策文档。

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 全部复用项目现有依赖（Zod、Drizzle ORM、Node.js 内建模块），无新外部包引入
- Architecture: HIGH — facade 三段式模式已在 `dispatchPluginDataAccess`（v4.0）验证稳定；handler authorize/execute 模式已在 Phase 78 `system.http.request` 验证；manifest re-parse 模式已在 Phase 78 验证
- Pitfalls: HIGH — 所有已识别 pitfalls 来自 PITFALLS.md（Phase 77/78 研究阶段）的跨阶段验证 + 代码库现场审计

**Research date:** 2026-06-12
**Valid until:** 2026-07-11（稳定 API 域——Zod/Drizzle ORM/pluginOwnedBusinessData 表结构无近期变更计划）
