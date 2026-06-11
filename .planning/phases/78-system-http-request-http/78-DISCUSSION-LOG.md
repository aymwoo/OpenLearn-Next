# Phase 78: system.http.request HTTP 代理 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-11
**Phase:** 78-system.http.request HTTP 代理
**Areas discussed:** Handler 文件组织, Manifest 白名单访问路径, Governance audit 集成方式, HTTP 客户端与 redirect 策略

---

## Handler 文件组织

| Option | Description | Selected |
|--------|-------------|----------|
| 新建 handlers/system-commands.ts | 与现有 plugin-data.ts、lesson-draft.ts 同目录同模式，Phase 79 的 system.config.set 也放入此文件 | |
| 新建独立 feature 目录 | `src/features/system-commands/http-request/`，含 handler.ts + ssrf-guard.ts + audit.ts 等子模块。更内聚但引入新目录层级 | ✓ |
| 直接写在 registry.ts 内 | authorize + execute 逻辑内联到 registry.ts 的 createPlatformCommandDefinition 调用中 | |

**Module split decision:**

| Option | Description | Selected |
|--------|-------------|----------|
| 三模块：handler + ssrf + audit | handler.ts（authorize+execute）、ssrf-guard.ts（DNS pinning + IP 检测 + HTTPS 强制）、audit.ts（governance audit） | ✓ |
| 四模块：拆细 authorize/execute | authorize.ts + execute.ts + ssrf-guard.ts + audit.ts | |
| 你来决定 | agent 根据实现复杂度自行判断 | |

**Registry integration decision:**

| Option | Description | Selected |
|--------|-------------|----------|
| 沿用现有导出模式 | handler.ts 导出 `{ "system.http.request": { authorize, execute } }` | ✓ |
| 直接导出 authorize/execute | 独立函数导出，registry.ts 按函数引用 | |
| 你来决定 | agent 自行选择 | |

---

## Manifest 白名单访问路径

| Option | Description | Selected |
|--------|-------------|----------|
| 查 pluginRegistrations 表 | 每次调用通过 pluginId 查 manifestJson，用 PluginManifestSchema.parse 解析 | ✓ |
| 通过 command scope 注入 | 调用方在构造 command 时将解析好的 systemCommands 注入 scope | |
| 内存缓存 + DB 回退 | 首次查询后缓存解析结果，plugin upgrade 时失效 | |

**Match strategy decision:**

| Option | Description | Selected |
|--------|-------------|----------|
| 提取 http.request 条目后逐条匹配 | filter command==='system.http.request'，逐条匹配 allowedDomains/allowedMethods，首条命中即通过 | ✓ |
| 合并所有条目后匹配 | 将所有条目的 allowedDomains/allowedMethods 合并为一个集合统一匹配 | |
| 你来决定 | agent 自行决定 | |

**Wildcard matching decision:**

| Option | Description | Selected |
|--------|-------------|----------|
| 标准 glob 匹配 | *.example.com 匹配单层子域名 | |
| 支持多层通配 | *.example.com 匹配任意深度子域名 | |
| 严格子域名匹配 | *.example.com 匹配所有直接子域名，不跨层 | ✓ |

---

## Governance audit 集成方式

| Option | Description | Selected |
|--------|-------------|----------|
| 新建 writeSystemCommandAudit | audit.ts 中专用 helper，字段对齐 system command 场景 | ✓ |
| 复用 governanceAudits 表直写 | handler 中直接 db.insert，无 helper 封装 | |
| 复用 writePluginDataAccessAudit | 扩展现有 helper 兼容 system command 场景 | |

**Audit fields decision:**

| Option | Description | Selected |
|--------|-------------|----------|
| 标准字段 + 请求上下文 | action + decision + reasonCode + actorId + schoolId + pluginId + payloadJson（url/method/domain） | ✓ |
| 最小字段 | action + decision + reasonCode + pluginId | |
| 你来决定 | agent 自行决定 | |

---

## HTTP 客户端与 redirect 策略

| Option | Description | Selected |
|--------|-------------|----------|
| 双层防护：pre-flight + connect.lookup | DNS 解析检测 IP + undici Agent DNS pinning，双重保险 | |
| 仅 connect.lookup DNS pinning | undici Agent connect.lookup 中解析 DNS 并检测 IP，一次 DNS 查询 | ✓ |
| 仅 pre-flight IP 检测 | 发请求前解析 DNS、检测 IP，不依赖 undici Agent | |

**Redirect handling decision:**

| Option | Description | Selected |
|--------|-------------|----------|
| 手动 redirect 循环 + 每跳 re-validate | 禁用 undici 自动 redirect，手动处理 3xx，每跳重新校验白名单 + SSRF + HTTPS，最多 5 跳 | ✓ |
| undici 自动 redirect + post-hoc 校验 | 让 undici 处理 redirect，请求完成后检查最终 URL | |
| 禁止 redirect | 收到 3xx 直接拒绝返回 redirect_denied | |

**undici Agent configuration decision:**

| Option | Description | Selected |
|--------|-------------|----------|
| 每次请求创建 Agent | 每次 execute 创建新 Agent，配置 connect.lookup + bodyTimeout + headersTimeout，请求级隔离 | ✓ |
| 全局共享 Agent | 单例 Agent 复用连接池，请求级差异通过 options 覆盖 | |
| 你来决定 | agent 自行决定 | |

---

## the agent's Discretion

以下决策留给 agent 在规划和实现时自行判断：
- 请求/响应 header 白名单的具体列表
- 超时和大小上限是否允许插件按请求覆盖 manifest 声明的默认值
- `ssrf-guard.ts` 中 IP 检测的具体实现（IPv4 私有段 + IPv6 私有段 + 特殊地址）

## Deferred Ideas

None — 讨论保持在 phase scope 内。
