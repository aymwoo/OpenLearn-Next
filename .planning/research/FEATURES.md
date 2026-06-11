# Feature Research

**Domain:** v4.3 System Commands Bus — 受治理插件系统的 HTTP 代理 + KV 配置命令
**Researched:** 2026-06-11
**Confidence:** HIGH（对既有代码库架构与 Figma/Shopify/Cloudflare 等外部系统的交叉验证）

---

## 研究范围与方法

本研究聚焦 v4.3 **新增价值**：`system.http.request` 和 `system.config` 两条系统命令的能力边界。下列能力已是 validated baseline，不重研：

- Command Bus + `dispatchPlatformCommand` + `PlatformCommandStore` + `platformCommandRegistry`（v3.0）
- governed action registry + plugin lifecycle + governance audit + kill switch（v3.0/v4.0）
- `dispatchPluginDataAccess` facade 模式：治理门前置 + 判别派发 + audit（v4.0 Phase 68）
- `PluginManifestSchema` 与 manifest v1/v2 声明段（v4.0）
- `pluginOwnedBusinessData` 表（`schoolId + pluginId + key` 唯一索引）（v4.0）
- marketplace 生命周期：install preflight / semver 升级 / uninstall retain/cleanup（v4.0 Phase 71）

**关键设计原则（从 v4.0 继承）：**
1. **声明式白名单，编译期生成，运行时零解析 manifest**：与 `dataModel` → `pluginDataAccessAllowlist` 同构
2. **治理门前置，deny-first**：lifecycle + kill-switch + 白名单匹配，任何失败即终止并写 denial audit
3. **复用，不重造**：`governanceAudits` 表、`assertActionExecutable`、`pluginOwnedBusinessData` 均直接复用
4. **Table stakes 在 v4.3，differentiator 明确标出并延后**

---

## Feature Landscape

### Table Stakes（v4.3 必须交付，缺失即产品不完整）

#### A. `system.http.request` — HTTP 代理命令

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **域名白名单（manifest `allowedDomains`）** | 插件不能任意网络请求。Figma 的 `networkAccess.allowedDomains` 是行业基准。无白名单 = SSRF 攻击面完全敞开。 | LOW | 支持字面量域名（`api.example.com`）和通配符子域名（`*.example.com`）。不支持 `*` 全部开放（anti-feature）。install 时校验声明格式，运行时逐请求按域名匹配。 |
| **HTTP 方法限制（manifest `allowedMethods`）** | 多数插件只需 GET/POST。Figma 未区分方法，但教育场景有合规需求。 | LOW | 声明式 `allowedMethods: ["GET", "POST"]`。默认不开放 DELETE/PUT/PATCH 等写方法，除非显式声明。 |
| **SSRF 防护（DNS pinning + 私有 IP 阻断）** | HTTP 代理的安全底线。n8n 默认阻止 RFC 1918 / loopback / link-local / metadata IP。Node.js 生态有 `ssrf-guard`（DNS pinning 防 rebinding）。 | MEDIUM | 三阶段防御：(1) URL 解析阶段拒绝 `file://`/`gopher://` 等非 http(s) scheme、拒绝 localhost 字面量；(2) DNS 解析后将所有返回 IP 与私有 IP CIDR 列表比对，任一命中即拒绝；(3) 自定义 `http.Agent` 将 socket 钉在已验证 IP 上（防 TOCTOU DNS rebinding）。覆盖 IPv4 私有范围（10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16, 0.0.0.0/8, 100.64.0.0/10）和 IPv6（::1, fc00::/7, fe80::/10, ::ffff:0:0/96）。 |
| **超时控制（connect + read）** | 无超时的代理请求导致连接泄漏。NGINX 标准做法：`proxy_connect_timeout` + `proxy_read_timeout`。 | LOW | `connectTimeout` 默认 5s，`readTimeout` 默认 30s。用 `AbortController` + `setTimeout` 实现，不依赖底层 socket 超时。 |
| **响应大小限制（流式字节计数）** | Kong Response Size Limiting Plugin 只查 `Content-Length`，被 chunked 编码绕过。Telegraf `http_response` 插件用流式字节计数，更可靠。 | MEDIUM | 默认 5MB 上限。manifest 可声明 `maxResponseBytes` 覆盖（最大 50MB）。必须用流式读取 + 字节计数器，读到超过上限立即 `response.destroy()` 并返回 `response_size_exceeded`。 |
| **Header 白名单控制** | 任意 header（`Host`、`Cookie`、`X-Forwarded-*`）可导致请求走私、会话劫持。WordPress `wp_remote_get` 允许任意 header 历史上造成多起 SSRF CVE。 | LOW | 允许白名单 header：`Authorization`、`Content-Type`、`Accept`、`User-Agent`（可被插件覆盖）、自定义 `X-*` 头（与保留前缀不冲突）。硬编码禁止 `Host`、`Cookie`、`X-Forwarded-*`、`Proxy-Authorization`、`X-Real-IP`。 |
| **治理门前置（复用 `assertActionExecutable`）** | 与 `dispatchPluginDataAccess` 相同的 deny-first 模型：lifecycle + kill-switch + 越校拒绝必须在任何网络请求前执行。 | LOW | 直接复用 `governance-gate.ts` 的 `assertActionExecutable`，不改写。新增 `verb` 参数支持 `system.http.request`。 |
| **Governance Audit 全量记录** | v4.0 已证明审计是信任底线。每条 system command 调用都必须记录。 | LOW | 复用 `governanceAudits` 表。`action` = `system.http.request`。新增拒因码：`domain_not_allowed`、`method_not_allowed`、`private_ip_blocked`、`response_size_exceeded`、`timeout`、`dns_failed`、`connection_failed`。 |
| **结构化错误传播** | Figma 对未声明域名返回 CSP 错误字符串，对开发者不友好。需要可编程判断的拒因码。 | LOW | 区分 7 类拒因码：超时 / 域名未授权 / 方法未授权 / SSRF 阻断 / 响应过大 / DNS 失败 / 连接失败。调用方可通过拒因码决定重试/降级/报告。 |
| **默认 HTTPS-only** | 教育场景可能含学生 PII，HTTP 明文不可接受。 | LOW | 默认只允许 `https://`。manifest 可显式声明 `allowInsecureHttp: true`（需安装者审阅），但默认封禁。 |

#### B. `system.config` — KV 配置存储命令

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **插件级命名空间隔离** | 插件 A 不可读写插件 B 的配置。Shopify 用 `$app` namespace + `AppInstallation` owner。Hyades ADR-012 用 `(EXTENSION_POINT, EXTENSION, KEY)` 复合主键。 | LOW | 复用 `pluginOwnedBusinessData` 表及其 `(schoolId, pluginId, key)` 唯一索引。key 用 `config:` 前缀与业务数据区分。隔离由唯一索引 + DAL 层 `pluginId` scope 天然保障。 |
| **`get(key)` / `set(key, value)` 基础原语** | 最小可用 API。Cloudflare Workers KV: `get`/`put`。Hyades: `put`/`get`/`delete`。 | LOW | `system.config.get({ key })` 和 `system.config.set({ key, value })`。`get` 是只读 DAL 调用（不经 Command Bus producer）；`set` 是写入，经 Command Bus。复用 `dispatchPluginDataAccess` 的判别派发模式。 |
| **JSON 值类型** | 配置需要结构化。Cloudflare Workers KV 支持 text/json/arrayBuffer。Shopify metafields 有多种 declared type。 | LOW | 值存储为 JSON（`payloadJson` 列已是 JSON 模式）。plain string/number/boolean/object/array 均支持。不引入类型 schema 校验（那是不同器的能力，v4.4+ 考虑）。 |
| **配置大小限制** | Cloudflare Workers KV 限制 25 MiB/value。教育场景插件配置通常 < 10KB。 | LOW | 默认 64KB 上限。`set` 写入前逐值校验大小，超限即拒（`config_value_too_large`）。 |
| **manifest `allowedKeys` 声明** | 配置 key 需要白名单控制，防止插件写入任意 key 污染存储。 | LOW | manifest `systemCommands.system.config.allowedKeys`：支持字面量 key（`"apiKey"`）和通配符前缀（`"config:*"`）。运行时写入/读取不在白名单的 key 即拒绝（`config_key_denied`）。 |
| **治理门前置** | 同 `system.http.request`，lifecycle + kill-switch + 越校拒绝前置。 | LOW | 复用 `assertActionExecutable`。 |
| **Governance Audit 记录** | 每次 `get`/`set` 均记录。 | LOW | `action` = `system.config.get` / `system.config.set`。新增拒因码：`config_key_denied`、`config_value_too_large`。 |

#### C. Manifest `systemCommands` 声明段 + `dispatchSystemCommand` facade

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **`systemCommands` manifest 段** | 与 Figma `networkAccess`、Shopify TOML `[[extensions.metafields]]` 对齐。声明式权限管理。 | MEDIUM | 在 `PluginManifestSchema` 上 additive 扩展（optional 字段，不破坏 v1/v2 兼容性）。结构：`{ "system.http.request": { "allowedDomains": [...], "allowedMethods": [...], "maxResponseBytes"?: number, "allowInsecureHttp"?: boolean }, "system.config": { "allowedKeys": [...] } }`。 |
| **Install preflight 声明校验** | 与 `dataModel` install 校验同构：非法声明在安装时被拒，不给运行时留漏洞。 | LOW | 校验域名格式、方法名、key 格式（允许 `[a-zA-Z0-9._:-]+` 和通配符 `*`）、数值范围（maxResponseBytes 在 1KB-50MB）。 |
| **`dispatchSystemCommand` facade** | 与 `dispatchPluginDataAccess` 同级的新入口。治理门前置 + 判别派发 + audit。 | MEDIUM | 复用 `assertActionExecutable`（新增 verb 参数支持 system commands）。路由 `system.http.request` → HTTP 代理执行器，`system.config.get` → 直接 DAL 读，`system.config.set` → Command Bus producer。 |
| **`platformCommandRegistry` 扩展** | 新增三个 commandType 到 registry。 | LOW | 新增 `system.http.request`、`system.config.get`、`system.config.set`。与现有 `plugin.*`、`lesson.draft.*`、`plugin.data.*`、`quiz.answer.received` 并列。 |

---

### Differentiators（竞争优势，明确标记为"不在 v4.3"）

| Feature | Value Proposition | Complexity | 为何不在 v4.3 |
|---------|-------------------|------------|---------------|
| **配置版本管理 + 乐观锁（compareAndSwap）** | Hyades ADR-012 提供 `compareAndPut`/`compareAndDelete`，用 BIGINT VERSION 防并发丢失。SQLite 可启事务实现强一致性 CAS。 | HIGH | v4.3 单插件单学校场景，配置写入并发极低。需要时 v4.4 以 add-on 补充。 |
| **配置变更通知（change event）** | 插件需要配置热更新。需要事件总线集成。 | HIGH | 需跨插件通知协议 + 事件总线扩展，不在 v4.3 scope。 |
| **配置 TTL/过期** | Cloudflare Workers KV 有 `expirationTtl`。临时授权 token 场景可能用到。 | MEDIUM | 教育场景暂不需要，v4.4+ 考虑。 |
| **批量 HTTP 请求（并发控制）** | 插件可能需要同时调多个 API。 | MEDIUM | 单次调用足够 v4.3。批量需并发上限 + 总大小限制，v4.4 考虑。 |
| **响应缓存（含 `cacheTtl`）** | Cloudflare Workers KV 为读提供 `cacheTtl`。减少重复外部 API 调用延迟。 | MEDIUM | 教育场景 HTTP 调用量低，缓存价值有限。 |
| **prefix scan / 列出配置 key** | Cloudflare Workers KV 有 `list({ prefix })`。Hyades ADR-012 列为 future consideration。 | LOW | key 数量少（< 10）无需。v4.4 add-on。 |
| **请求/响应转换管道（interceptors）** | 插件 SDK 层的便利能力。 | MEDIUM | 属于 SDK 层，不是系统命令层。v5.0 考虑。 |
| **WebSocket 代理** | Figma 支持 `wss://` 声明。 | HIGH | 教育场景无此需求。v5.0 考虑。 |

---

### Anti-Features（看似合理，实则危险，明确排除）

| Feature | 为什么有人想要 | 为什么危险 | 正确的替代方案 |
|---------|---------------|-----------|--------------|
| **`allowedDomains: ["*"]` 开放所有域名** | "插件开发者不想每次新增 API 都改 manifest" | 等于放弃 SSRF 防护。教育场景：插件运行在学校网络内，内部服务不可暴露。Figma 虽允许但要求 reasoning——对教育场景不够。 | 逐域名声明 + 通配符子域名（`*.example.com`）。不给 `*` 选项。 |
| **允许访问 `localhost` / 内网 IP** | "开发调试方便" "需要访问学校内部 API" | 教科书级 SSRF 漏洞。恶意插件可扫描内网、攻击数据库、读取 metadata service（`169.254.169.254`）。 | 硬编码禁止所有 RFC 1918 / loopback / link-local / metadata IP。不可配置绕过。开发用 mock provider。 |
| **插件间配置共享/读取** | "插件 A 需要读插件 B 的配置来协同" | 打破插件隔离边界。Shopify app-owned metafields 刻意不暴露给其他 app。更危险：让插件依赖其他插件的内部配置格式。 | 如需跨插件通信，走正式的 Plugin Action / Host Action 合约路径。 |
| **多键原子写入（配置事务）** | "多个配置项需一起生效" | SQLite 默认模式下原子多键写入需额外谨慎。单键 set 已满足需求。 | 单键 set。未来如需原子多键，走 Command Bus `dedupe: "required"` 事务包装。 |
| **允许插件声明任意 HTTP header** | "API 需要自定义 Authorization / X-API-Key" | 允许 `Host`/`Cookie`/`X-Forwarded-For` 可导致请求走私、SSRF 升级、会话劫持。WordPress 历史上因此多次爆 CVE。 | 白名单 header 集合：`Authorization`、`Content-Type`、`Accept`、`User-Agent`、自定义 `X-*`（不与保留前缀冲突）。禁止 `Host`、`Cookie`、`X-Forwarded-*`、`Proxy-Authorization`。 |
| **允许 http:// 明文协议** | "某些 API 无 HTTPS" | 教育场景可能含学生 PII，明文可被中间人篡改、窃取。 | 默认只允许 `https://`。manifest 可声明 `allowInsecureHttp: true`（需安装者审阅），但默认封禁。 |
| **不限制响应大小** | "API 返回大量数据" | 无上限等于 DoS 向量。Kong 的 Response Size Limiting Plugin 证明了必须有上限。 | 默认 5MB，manifest 可声明到最大 50MB。流式字节计数，超限即截断 + `response_size_exceeded`。 |
| **允许重定向到非白名单域名** | "某些 API 有 3xx redirect" | 301/302 可绕过白名单。未校验的 redirect 是常见 SSRF 向量。 | 每个 redirect hop 重新校验域名白名单 + SSRF 防护。不在白名单的 redirect 目标即拒绝（`domain_not_allowed`）。 |
| **HTTP proxy 通过环境变量 `HTTP_PROXY` 自动转发** | "公司网络需要代理" | 插件通过系统代理访问可能绕过白名单（因为代理目标 IP 已变化）。 | v4.3 不做企业代理适配。插件直连声明域名。代理需求 v4.4+ 以显式配置形式提供。 |

---

## Feature Dependencies

```
system.http.request / system.config
    │
    ├──requires──> dispatchSystemCommand facade
    │                  │
    │                  ├──requires──> assertActionExecutable（复用 governance-gate.ts）
    │                  │                  ├──已有: PluginLifecycle + KillSwitch (v3.0/v4.0)
    │                  │                  └──新增: 支持 system.* verb 参数
    │                  │
    │                  ├──requires──> PlatformCommandStore + dispatchPlatformCommand (v3.0)
    │                  │                  └──新增: system.http.request / system.config.get / system.config.set
    │                  │
    │                  └──requires──> governanceAudits 表 (v3.0/v4.0)
    │                                     └──新增: system.http.request / system.config.* action + 新拒因码
    │
    ├──requires──> systemCommands manifest 段
    │                  │
    │                  ├──requires──> PluginManifestSchema (v4.0)
    │                  │                  └──新增: optional systemCommands 字段（additive，不破坏 v1/v2）
    │                  │
    │                  └──requires──> Install preflight 声明校验 (复用 v4.0 Phase 71 模式)
    │                                     └──新增: 域名/Method/Key 格式校验 + 数值范围校验
    │
    ├──requires──> platformCommandRegistry (v3.0)
    │                  └──新增: 三个 system.* commandType + 对应 handler
    │
    └──uses──> pluginOwnedBusinessData (v4.0)
                       └──system.config 复用该表，prefix "config:" 隔离配置与业务数据
```

### Dependency Notes

- **`dispatchSystemCommand` 依赖 `assertActionExecutable`**：直接复用 `src/features/platform-core/plugin-data-access/governance-gate.ts`。治理门需扩展以接受新的 verb 类型（`system.http.request` / `system.config.get` / `system.config.set`），并能为 system config 命令映射到 manifest `allowedKeys` 白名单校验。这是 MEDIUM 复杂度的接缝。
- **Manifest 扩展是 additive**：`systemCommands` 是可选字段。不含该字段的 manifest（v1/v2 旧插件）在 install 时通过校验（无系统命令权限）。向后兼容。
- **`governanceAudits` 表不需要 schema 变更**：现有列 `action`（文本）、`reasonCode`（文本）、`payloadJson`（JSON）已足够承载 system command 审计。新增的是拒因码枚举值，不是 schema 列。
- **`pluginOwnedBusinessData` 直接复用**：`system.config.set` 写入 `pluginOwnedBusinessData`，`system.config.get` 从中读取。key 前缀 `config:` 确保与其他业务数据不冲突。DAL 层已有 `upsertPluginOwnedBusinessData` / `getPluginOwnedBusinessData`。
- **SSRF 防护是新增代码，不依赖第三方库**：私有 IP CIDR 匹配表内置在代码中。Node.js `dns.resolve` + 自定义 `http.Agent`（`createConnection` 覆盖）实现 DNS pinning。不引入新的 npm 依赖（减少供应链攻击面）。

---

## MVP Definition（v4.3 Committed Scope）

### Launch With（v4.3）

- [ ] **SYS-01 `system.http.request`**：域名白名单 + 方法限制 + SSRF 防护（DNS pinning + 私有 IP CIDR）+ connect/read 超时 + 流式响应大小限制 + header 白名单 + HTTPS-only 默认 + redirect 重校验 + 结构化拒因码
- [ ] **SYS-02 `system.config.get/set`**：插件级隔离 KV 配置（`pluginOwnedBusinessData` 复用 + `config:` 前缀）+ manifest `allowedKeys` 白名单 + JSON 值类型 + 64KB 大小限制 + 治理审计
- [ ] **SYS-03 manifest `systemCommands` 声明段**：在 `PluginManifestSchema` 新增 optional `systemCommands` 字段 + install preflight 校验域名/Method/Key 格式 + 编译期白名单生成
- [ ] **SYS-04 `dispatchSystemCommand` facade**：统一入口，治理门前置（`assertActionExecutable`）+ 判别派发（HTTP → 代理执行器，config.get → DAL 读，config.set → Command Bus producer）+ audit
- [ ] **SYS-05 `platformCommandRegistry` 扩展**：新增 `system.http.request`、`system.config.get`、`system.config.set` commandType + handler（authorize + execute）

### Add After Validation（v4.4+）

- [ ] 配置版本管理 + 乐观锁（compareAndSwap）— 当并发配置写入场景出现时
- [ ] 配置变更通知 — 当插件需要配置热更新时
- [ ] 配置 TTL/过期 — 当临时授权 token 等场景出现时
- [ ] 批量 HTTP 请求 — 当单插件需要多 API 调用时
- [ ] 响应缓存 — 当外部 API 调用量成为性能瓶颈时
- [ ] 配置 prefix scan — 当 key 数量超过 20 时

### Future Consideration（v5.0+）

- [ ] WebSocket 代理 — 只有实时数据推送场景才需要
- [ ] 跨插件配置共享（正式合约路径）— 需要跨插件通信协议
- [ ] 请求/响应转换管道（interceptors）— 属于插件 SDK 层，非系统命令层

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| 域名白名单（manifest 声明式）| HIGH | LOW | P1 |
| HTTP 方法限制（manifest 声明式）| HIGH | LOW | P1 |
| SSRF 防护（DNS pinning + 私有 IP CIDR）| HIGH | MEDIUM | P1 |
| 超时控制（connect + read）| HIGH | LOW | P1 |
| 响应大小限制（流式字节计数）| MEDIUM | MEDIUM | P1 |
| Header 白名单控制 | MEDIUM | LOW | P1 |
| 默认 HTTPS-only（可选 http 开关）| HIGH | LOW | P1 |
| Redirect 重校验 | HIGH | LOW | P1 |
| 结构化错误传播（7 类拒因码）| MEDIUM | LOW | P1 |
| 治理门前置（复用 `assertActionExecutable`）| HIGH | LOW | P1 |
| Governance Audit 全量记录 | HIGH | LOW | P1 |
| 插件级 KV 命名空间隔离 | HIGH | LOW | P1 |
| `get`/`set` 基础原语 | HIGH | LOW | P1 |
| JSON 值类型 | HIGH | LOW | P1 |
| 配置大小限制（64KB）| MEDIUM | LOW | P1 |
| manifest `allowedKeys` 白名单 | MEDIUM | LOW | P1 |
| `systemCommands` manifest 段 + install 校验 | HIGH | MEDIUM | P1 |
| `dispatchSystemCommand` facade | HIGH | MEDIUM | P1 |
| `platformCommandRegistry` 扩展（3 个新 commandType）| HIGH | LOW | P1 |
| 配置版本管理 + 乐观锁 | LOW | HIGH | P2 |
| 配置变更通知 | MEDIUM | HIGH | P2 |
| 配置 TTL/过期 | LOW | MEDIUM | P2 |
| 批量 HTTP 请求 | LOW | MEDIUM | P2 |
| 响应缓存 | LOW | MEDIUM | P2 |
| 配置 prefix scan | LOW | LOW | P2 |
| 请求/响应转换管道 | LOW | MEDIUM | P3 |

**Priority key:** P1 = v4.3 必须交付；P2 = v4.4+ 验证后追加；P3 = v5.0+ 或明确不做。

---

## Competitor Feature Analysis

### HTTP 代理能力对比

| Feature | Figma Plugins | VS Code Extensions | Shopify Apps | OpenLearn v4.3 |
|---------|--------------|-------------------|-------------|----------------|
| 域名白名单 | 声明式 `networkAccess.allowedDomains`（通配符） | 无限制（extension host 可任意 fetch） | 无限制（app 在 Shopify 外部运行） | 声明式 `systemCommands.system.http.request.allowedDomains`（通配符） |
| 方法限制 | 无 | 无 | 无 | 声明式 `allowedMethods` |
| SSRF 防护 | 依赖 CSP `default-src data:` + null origin | 无（完整 Node.js 网络权限） | 无 | DNS pinning + 私有 IP CIDR 阻断（IPv4/IPv6 全覆盖） |
| 超时控制 | SDK 内置（不暴露配置） | 开发者自行处理 | 开发者自行处理 | 命令层 `connectTimeout` + `readTimeout` |
| 响应大小限制 | 无 | 无 | 无 | 流式字节计数，默认 5MB，manifest 可覆盖到 50MB |
| Header 控制 | `fetch` 标准（无额外限制） | 完整 `http` 模块（无限制） | 无限制 | 白名单 header 集合，硬禁危险头 |
| 治理审计 | Figma 人工 review 流程 | 无 | 无 | 全量 `governanceAudits` 记录（allowed/denied + 拒因码） |
| 错误语义 | CSP 错误字符串（不可编程） | 标准 Error 对象 | 标准 HTTP 错误 | 7 类结构化拒因码，可编程判断 |
| HTTPS-only | 协议在 manifest 声明中可指定 | 无限制 | 无限制 | 默认 `https://`，可选 `allowInsecureHttp` |

### KV 配置能力对比

| Feature | Cloudflare Workers KV | Shopify Metafields | Hyades ADR-012 | OpenLearn v4.3 |
|---------|----------------------|-------------------|----------------|----------------|
| 命名空间隔离 | Namespace 级别 | AppInstallation + `$app` namespace | `(EXTENSION_POINT, EXTENSION, KEY)` 复合主键 | `(schoolId, pluginId, key)` 唯一索引 + `config:` 前缀 |
| 值类型 | text/json/arrayBuffer/stream | 声明式类型（single_line_text_field, json, number...） | JSON 字符串 | JSON（无 schema 校验） |
| 大小限制 | 25 MiB/value | 无明确文档 | 无 | 64KB 默认 |
| 乐观锁/版本 | 无（最终一致性，last-write-wins） | 无显式版本 | `compareAndPut`/`compareAndDelete`（BIGINT VERSION） | v4.3 不包含 |
| TTL/过期 | `expirationTtl` 或绝对 Unix 时间戳 | 无 | 无 | v4.3 不包含 |
| 前缀扫描 | `list({ prefix })` | GraphQL `metafields` query 可过滤 | Future consideration | v4.3 不包含 |
| 治理审计 | 无 | 依赖 App 自身审计 | 无 | 全量 `governanceAudits` 记录 |
| 跨插件读取 | Namespace 级隔离 | App-owned 对其他 app 不可见 | EXTENSION 级隔离 | 不可跨插件读取 |

---

## Sources

### 现有代码库分析（一手，HIGH confidence）
- `src/features/platform-core/commands/registry.ts` — 现有 `platformCommandRegistry` 结构，`plugin.*`/`lesson.draft.*`/`plugin.data.*`/`quiz.answer.received` 命令组
- `src/features/platform-core/commands/contracts.ts` — Command envelope、payload schemas、`PlatformCommandDefinition` 接口、`PlatformCommandType` 枚举
- `src/features/platform-core/commands/bus.ts` — `dispatchPlatformCommand` 总线：validate → authorize → execute → persist → audit
- `src/features/platform-core/plugin-data-access/facade.ts` — `dispatchPluginDataAccess` facade 模式（治理门前置 → 判别派发 → producer/DAL 路由）
- `src/features/platform-core/plugin-data-access/governance-gate.ts` — `assertActionExecutable`：lifecycle + kill-switch + 越校拒绝 + denial audit
- `src/db/schema.ts` — `governanceAudits` 表（已含 `action`、`reasonCode`、`actorScope`、`requestedCapabilitiesJson`、`grantedCapabilitiesJson` 等列），`pluginOwnedBusinessData` 表（`schoolId + pluginId + key` 唯一索引）
- `src/lib/dto/resource-ai.ts` — `PluginManifestSchema`（manifestVersion 1/2，permissions, anchors, actions, governance 段）
- `src/features/runtime-platform/contracts/descriptors.ts` — `PluginManifestGovernanceV2Schema`（capabilities, permissions, lifecycle）

### Figma 插件系统（MEDIUM-HIGH confidence，官方文档）
- [How Plugins Run](https://developers.figma.com/docs/plugins/how-plugins-run/) — 双线程沙箱架构（主线程无浏览器 API，iframe UI 线程有 fetch）
- [Making Network Requests](https://developers.figma.com/docs/plugins/making-network-requests/) — `networkAccess.allowedDomains` 白名单声明、CSP 阻断、CORS 限制
- [Version 1, Update 66](https://developers.figma.com/docs/plugins/updates/2023/05/10/version-1-update-66/) — `networkAccess` 引入，支持通配符/路径匹配/WebSocket

### VS Code 扩展系统（MEDIUM confidence，GitHub issues）
- [VS Code #236423](https://github.com/microsoft/vscode/issues/236423) — `http.fetchAdditionalSupport` 覆写全局 fetch 导致扩展中断
- [VS Code #173861](https://github.com/microsoft/vscode/issues/173861) — Proxy agent patch 阻止 HTTP keep-alive 连接复用

### Shopify App 配置存储（MEDIUM-HIGH confidence，官方文档）
- [Metafields API](https://shopify.dev/docs/api/checkout-ui-extensions/2025-10/target-apis/platform-apis/metafields-api) — Namespace + Key + Value + Type 的 KV 模型
- [Using metafields for custom data](https://shopify.dev/docs/apps/build/checkout/metafields) — 三种所有权模型（App-Owned / App-Data / Merchant-Owned）
- [App-Data Metafields Guide](https://www.cleverence.com/articles/shopify-dev-documentation/use-app-data-metafields-shopify-dev-4821/) — AppInstallation owner 隔离

### SSRF 防护（MEDIUM-HIGH confidence，开源库 + 平台文档）
- [ssrf-guard (Node.js)](https://github.com/jonathanong/ssrf-guard) — DNS pinning + `safeFetch` 自动 re-validate redirects
- [n8n SSRF Protection](https://docs.n8n.io/hosting/securing/ssrf-protection/) — 默认阻止所有私有/保留 IP 范围
- [nullspace (Node.js)](https://socket.dev/npm/package/nullspace) — 全量 IPv4/IPv6 边界覆盖（hex/octal/decimal 编码攻击面）

### KV 配置最佳实践（MEDIUM-HIGH confidence）
- [Dependency-Track Hyades ADR-012](https://dependencytrack.github.io/hyades/0.7.0-alpha.2-SNAPSHOT/architecture/decisions/012-extension-kv-store/) — 版本号乐观锁、复合主键隔离、`compareAndPut`/`compareAndDelete`、in-memory test store
- [Cloudflare Workers KV Limits](https://developers.cloudflare.com/kv/platform/limits/) — 512B key / 25 MiB value / 1 write/sec per key / 最终一致性
- [Cloudflare Workers KV How KV Works](https://developers.cloudflare.com/kv/concepts/how-kv-works/) — 最终一致性模型、cacheTtl、负缓存

### HTTP 代理控制（MEDIUM confidence）
- [Kong Response Size Limiting Plugin](https://docs.konghq.com/hub/optum/kong-response-size-limiting/) — `Content-Length` 头检查模式（chunked 绕过）
- NGINX proxy timeout/buffer 标准配置 — `proxy_connect_timeout`, `proxy_read_timeout`, `proxy_buffers`
- [Telegraf http_response plugin](https://github.com/influxdata/telegraf) — 流式字节计数（`response_body_max_size`）

---
*Feature research for: v4.3 System Commands Bus（system.http.request + system.config）*
*Researched: 2026-06-11*
