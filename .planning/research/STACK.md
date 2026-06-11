# Stack Research — System Commands Bus (v4.3)

**Domain:** Plugin System Commands — secure HTTP proxy + KV config for a governed plugin marketplace
**Researched:** 2026-06-11
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js (built-in) | 20.9+ | Runtime | 项目约束，bundled undici 支持 `Agent` + `connect.lookup` 实现 DNS 层面 SSRF 防护 |
| undici `Agent` (bundled) | ~6.x (Node 20) / ~7.x (Node 22+) | HTTP dispatcher with custom DNS resolution | 零额外依赖的 DNS 拦截：通过 `connect.lookup` 在 socket 连接前完成 IP 解析+校验+固定，消除 DNS rebinding TOCTOU |
| Zod | 4.x（项目现有） | Schema validation | 已在项目中使用；`discriminatedUnion` 的 `.options` 展开模式可直接追加新的命令变体 |
| Drizzle ORM | 项目现有 | Database access | 项目约束；现有 `governanceAudits` 表已具备复用形状 |
| libSQL/SQLite | 项目现有 | Primary database | 项目约束 |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `undici` (bundled `Agent`) | Node 20 内建 | DNS-level SSRF guard via `connect.lookup` | 在 `system.http.request` handler 中创建自定义 `Agent` 拦截 DNS，阻止私有/保留/链路本地 IP，固定已校验地址 |
| `dns` (built-in `node:dns`) | Node 20 内建 | 手动 DNS 解析 + IP 校验 | 在 `connect.lookup` 回调中使用 `dns.resolve4`/`dns.resolve6` 解析域名，用内联 CIDR 匹配校验非内网 IP |
| `drizzle-orm` `eq` / `sql` | 项目现有 | KV config 的 SQL 层操作 | 操作现有 `pluginOwnedBusinessData` 表进行配置读写 |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| vitest | 单元测试 | 项目现有；需为 `system.http.request` handler 添加 mock HTTP server 测试 |
| `pnpm verify:phase` | Close gate | 遵循项目现有 phase 验证范式 |

## Installation

```bash
# 零外部依赖 —— system.http.request 所需能力由 Node.js 20+ 内建模块提供：
# - node:dns (DNS 解析 + IP 校验)
# - node:net (IP 地址族判定)
# - undici Agent (custom lookup via connect option)

# system.config 不需要额外包 —— 直接复用现有 Drizzle + SQLite

# 开发依赖（保持与项目现有一致）
npm install -D vitest @vitest/coverage-v8
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| 内建 `node:dns` + undici `Agent.connect.lookup` | `request-filtering-agent` (v3.2.0) | 如果项目降级使用 `node-fetch` 而不是 `globalThis.fetch`。注意：该库依赖 `http.Agent`，不兼容原生 `fetch` |
| 内建 `node:dns` + undici `Agent.connect.lookup` | `nullspace` | 如果需要现成的 `safeFetch` 包装器。注意：包维护状态不确定，且引入额外依赖 |
| 内建 `node:dns` + undici `Agent.connect.lookup` | `agent-fetch` | 如果需要 Rust 原生 DNS 解析器（Hickory DNS）的确定性行为。适用场景：需要 rate limiting + body size limits + SSRF 一体化。成本：Rust 原生绑定增加构建复杂度 |
| 内建 `node:dns` + undici `Agent.connect.lookup` | `ssrf-guard` | 如果项目升级到 Node.js 24+。提供 `createPinnedDispatcher` 开箱即用的 DNS 固定 |
| 复用 `pluginOwnedBusinessData` 表 | 新建独立 `pluginConfigs` 表 | 如果插件配置需要频繁按 `key` 单独查询和索引。目前 `system.config.get` 总是按 `(schoolId, pluginId)` 全量加载（写少读多，配置尺寸小），JSON 列比独立 KV 行更适合 |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `request-filtering-agent` | 依赖 `http.Agent`，Node.js 原生 `fetch`（基于 undici）不支持该接口 | 内建 undici `Agent` 的 `connect.lookup` |
| `ssrf-req-filter` | 同上，基于 `http.Agent`，不兼容原生 `fetch` | 同上 |
| 独立 KV 表（EAV 模式，每行一个 key-value） | 过度设计。插件配置是写少读多、一次加载全部的场景，JSON 列比独立行更适合（写入频率低、配置尺寸通常 < 10KB） | 复用 `pluginOwnedBusinessData` 表 |
| `node-fetch` / `axios` (作为 fetch 替换) | 增加不必要的依赖。Node.js 20+ 原生 `fetch` 已足够，且可通过 undici Agent 控制 DNS | 原生 `globalThis.fetch` + undici Agent |
| 新独立配置表（如 `pluginConfigs`） | `pluginOwnedBusinessData` 已有 `(schoolId, pluginId, key)` 的唯一约束和 JSON payload 列，是 `system.config` 的天然载体。新建表会增加迁移和维护负担 | `pluginOwnedBusinessData` |
| 为 system.http.request 引入新的 HTTP 客户端库 | Node.js 原生 `fetch` 已满足需求；undici Agent 机制允许插入 DNS 层安全控制 | 原生 `fetch` + undici `Agent` |

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Node.js 20 (bundled undici ~6.x) | `Agent` + `connect.lookup` | 低版本 undici 使用 `connect.lookup` callback API，不支持 v7+ 的 `interceptors.dns` API；使用 callback 风格确保兼容性 |
| Zod 4.x | `z.discriminatedUnion` | `PlatformCommandSchema` 使用 discriminated union；添加新 `system.*` 类型的推荐方式：展开 `.options` 数组并追加新变体 |
| Drizzle ORM | 现有 schema | `governanceAudits` 表支持 `targetType: "plugin" | "runtime"`，system command audit 可复用现有表，`targetType` 维持 `"plugin"`（命令scope是插件级） |

## Stack Patterns by Variant

### DNS + SSRF Protection Pattern（零依赖）

**Always:** 在处理每个 `system.http.request` 时，创建一次性 undici `Agent`：

1. 使用 `new URL()` 解析目标 URL（排除协议走私）
2. 验证 hostname 是否在 manifest 声明的 `allowedDomains` 白名单中
3. 在 `Agent.connect.lookup` 回调中：
   a. DNS 解析 hostname
   b. 校验解析结果是否在私有/保留/链路本地地址范围
   c. 如果 IP 非法，callback(error) 阻止连接
   d. 如果 IP 合法，callback(null, address, family) 继续连接
4. 将 Agent 作为 `dispatcher` 传入 `fetch(url, { dispatcher: agent, ... })`
5. 设置 `AbortSignal.timeout()` 控制超时
6. 限制响应大小（先读 `content-length` header，超过上限则中止）

```typescript
import { Agent } from "undici";
import { isIP } from "node:net";
import { promises as dns } from "node:dns";

// 私有/保留地址范围（RFC 1918, RFC 6598, RFC 6890, RFC 5735）
const PRIVATE_RANGES = [
  { start: 0x0A000000, end: 0x0AFFFFFF },   // 10.0.0.0/8
  { start: 0x64400000, end: 0x647FFFFF },   // 100.64.0.0/10 (CGNAT)
  { start: 0x7F000000, end: 0x7FFFFFFF },   // 127.0.0.0/8 (loopback)
  { start: 0xA9FE0000, end: 0xA9FEFFFF },   // 169.254.0.0/16 (link-local)
  { start: 0xAC100000, end: 0xAC1FFFFF },   // 172.16.0.0/12
  { start: 0xC0A80000, end: 0xC0A8FFFF },   // 192.168.0.0/16
];

function isPrivateIPv4(ip: string): boolean {
  if (isIP(ip) !== 4) return false;
  const num = ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
  return PRIVATE_RANGES.some(range => num >= range.start && num <= range.end);
}

function createSsrfsafeDispatcher(allowedDomains: string[]): Agent {
  return new Agent({
    connect: {
      lookup(hostname, _options, callback) {
        // Step 1: 域名白名单校验
        const allowed = allowedDomains.some(pattern => {
          if (pattern.startsWith("*.")) {
            return hostname.endsWith(pattern.slice(1)) || hostname === pattern.slice(2);
          }
          return hostname === pattern;
        });
        if (!allowed) {
          return callback(new Error("SSRF_DOMAIN_NOT_ALLOWED"), null, 0);
        }

        // Step 2: DNS 解析
        dns.resolve4(hostname).then(addresses => {
          if (addresses.length === 0) {
            return callback(new Error("SSRF_DNS_NO_ADDRESS"), null, 0);
          }
          // Step 3: 校验所有解析地址
          for (const addr of addresses) {
            if (isPrivateIPv4(addr)) {
              return callback(new Error("SSRF_PRIVATE_IP_BLOCKED"), null, 0);
            }
          }
          // Step 4: 固定第一个合法地址（消除 TOCTOU）
          callback(null, addresses[0], 4);
        }).catch(err => callback(err, null, 0));
      },
    },
  });
}
```

**为什么不需要第三方库：** 内建 `node:dns` + `node:net` 足以判断 IP 是否私有。undici `Agent.connect.lookup` 在 DNS 解析时完成校验，解析结果直接传给连接层，**不存在第二次解析窗口**——DNS rebinding 攻击者无法绕过。CVE-2026-41272 的根本原因正是"校验时解析一次，连接时再解析一次"——本方案在同一个 `connect.lookup` 中完成校验+连接，从根本上消除 TOCTOU 窗口。

### Plugin KV Config Pattern

**Always:** 使用 `pluginOwnedBusinessData` 表：

- `system.config.set`：`INSERT ... ON CONFLICT (schoolId, pluginId, key) DO UPDATE SET payloadJson=..., updatedAt=...`
- `system.config.get`：`SELECT payloadJson FROM pluginOwnedBusinessData WHERE schoolId=? AND pluginId=?`（返回全部配置或按key过滤）

**如果插件配置量极大（罕见，每个插件预期 < 50 个 key）：**
- 考虑在 `system.config.get` 中添加可选 `key` 参数（传入单个 key 时只取一行）
- 考虑缓存层（`unstable_cache` with tag `pluginConfig:${pluginId}`）

### Manifest Schema Extension Pattern

在 `src/lib/dto/resource-ai.ts` 的 `PluginManifestSchema` 中使用 `.extend()`：

```typescript
// 新增 systemCommands schema
const SystemCommandHttpRequestSchema = z.object({
  command: z.literal("system.http.request"),
  allowedDomains: z.array(z.string().min(1)).min(1),
  allowedMethods: z.array(z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"])).min(1),
});

const SystemCommandConfigSchema = z.object({
  command: z.literal("system.config"),
  // system.config 无需额外声明——每个插件自动获得自身配置的读写权限
});

const SystemCommandDeclarationSchema = z.discriminatedUnion("command", [
  SystemCommandHttpRequestSchema,
  SystemCommandConfigSchema,
]);

// 在 PluginManifestSchema 中追加（使用 .extend() 或重建 z.object）
// 方式：在现有 z.object({...}) 中追加 systemCommands 字段
export const PluginManifestSchema = z.object({
  // ... 现有字段 ...
  systemCommands: z.array(SystemCommandDeclarationSchema).default([]),
});
```

### Command Bus Extension Pattern

在 `src/features/platform-core/commands/contracts.ts` 中：

```typescript
// 1. 新增命令类型常量
export const SystemCommandTypes = [
  "system.http.request",
  "system.config.get",
  "system.config.set",
] as const;

// 2. 追加到 PlatformCommandTypeSchema
export const PlatformCommandTypeSchema = z.enum([
  ...PlatformPluginGovernanceCommandTypes,
  ...LessonDraftCommandTypes,
  ...PluginDataCommandTypes,
  ...QuizTransportCommandTypes,
  ...SystemCommandTypes,  // ← 新增
]);

// 3. 定义 payload schemas
const SystemHttpRequestPayloadSchema = z.object({
  pluginKey: z.string().min(1),
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
}).strict();

// 4. 追加到 payload schemas map
export const PlatformCommandPayloadSchemas = {
  // ... 现有 ...
  "system.http.request": SystemHttpRequestPayloadSchema,
  "system.config.get": SystemConfigGetPayloadSchema,
  "system.config.set": SystemConfigSetPayloadSchema,
} as const;

// 5. 在 PlatformCommandSchema discriminatedUnion 中追加变体
// 使用模式：z.discriminatedUnion("type", [
//   ... 现有变体,
//   PlatformCommandEnvelopeSchema.extend({
//     type: z.literal("system.http.request"),
//     payload: SystemHttpRequestPayloadSchema,
//   }),
//   ... 更多新变体,
// ])
```

## Sources

- **HIGH confidence** — [Node.js undici Discussion #3721 — Agent chaining with interceptors](https://github.com/nodejs/undici/discussions/3721) — 确认 `Agent.compose()` + `connect.lookup` 的用法
- **HIGH confidence** — [CVE-2026-41272 — Flowise SSRF TOCTOU bypass](https://github.com/advisories/GHSA-2x8m-83vc-6wv4) — 证实 DNS rebinding 是核心威胁，修复手段为 DNS pinning（resolve+validate+pin 在同一调用链）
- **HIGH confidence** — [request-filtering-agent v3.2.0](https://www.npmjs.com/package/request-filtering-agent?activeTab=versions) — 确认 v3.x 支持 Node 20/22，但不兼容原生 `fetch`
- **HIGH confidence** — 项目既有源码（直接读取）：
  - `src/features/platform-core/commands/contracts.ts` — 现有 Command Bus 契约，`PlatformCommandSchema` 使用 `z.discriminatedUnion` + `.extend` 模式
  - `src/features/platform-core/commands/registry.ts` — `platformCommandRegistry` 使用 `satisfies Record<PlatformCommandType, PlatformCommandDefinition>`
  - `src/features/runtime-platform/contracts/descriptors.ts:69` — `PluginManifestGovernanceV2Schema` 的扩展位置
  - `src/lib/dto/resource-ai.ts:761` — `PluginManifestSchema` 的完整定义（`z.object` + `superRefine`）
  - `src/db/schema.ts:1884` — `pluginOwnedBusinessData` 表结构，已有 `(schoolId, pluginId, key)` 唯一约束 + JSON payload 列
  - `src/db/schema.ts:1325` — `governanceAudits` 表结构，已支持 plugin 级审计
  - `src/features/platform-core/plugin-data-access/audit.ts` — 现有的 audit 写入函数模式
  - `src/features/platform-core/plugin-data-access/facade.ts` — `dispatchPluginDataAccess` facade 模式，`dispatchSystemCommand` 应遵循同级结构

---
*Stack research for: v4.3 System Commands Bus — system.http.request + system.config*
*Researched: 2026-06-11*
