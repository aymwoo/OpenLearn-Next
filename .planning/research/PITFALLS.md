# Pitfalls Research

**Domain:** System Commands Bus -- 为受治理插件系统新增 HTTP 代理 + KV 配置存储
**Researched:** 2026-06-11
**Confidence:** HIGH（基于 2026 CVE 实际案例 + OWASP SSRF 最佳实践 + 现有代码库治理模型分析）

> **给 roadmap 作者的阅读说明**：
> 本里程碑在 v4.0/v4.2 已落地的受治理插件体系（`dispatchPluginDataAccess` facade、`assertActionExecutable` 治理门、`governanceAudits` 审计表、`PluginManifestSchema`、`Command Bus` + `pluginCommandRegistry`）之上新增两个 system 级命令。不是从零造安全模型，而是在**既有的 lifecycle/kill-switch/school-scope 三层防线上**叠加 HTTP 出口和 KV 存储的领域特有风险。以下 pitfalls 全部是在这套已存在的接缝上继续做时最容易翻车的点。Phase 编号从 77 开始。

---

## Critical Pitfalls

### Pitfall 1: SSRF -- WHATWG URL 解析器静默归一化绕过私有 IP 检查

**What goes wrong:**
Node.js 内建 `fetch` 使用 WHATWG URL 解析器，它对"特殊 scheme"（`http`/`https`）的输入做**静默归一化**。攻击者手写一个私有 IP 表达的 URL（如 `http://[::ffff:127.0.0.1]/`），WHATWG 解析器会把它转为压缩 hex 形式 `[::ffff:7f00:1]`。如果私有 IP 过滤在**解析后**用正则或字符串匹配，IPv4-mapped IPv6、IPv6 loopback（`[::1]`）、十进制 IP（`http://2130706433` = `http://127.0.0.1`）均可绕过。

**实际 CVE 验证（2026）：**
- **CVE-2026-43929**（ssrfcheck，CVSS 8.2）：`isSSRFSafeURL()` 用正则匹配点分十进制私网 IP，但 WHATWG 先把它归一化成了 hex -- 所有 7 个 IANA 私有 IPv4 范围全部可绕过。
- **CVE-2026-42260**（open-websearch）：`URL.hostname` 保留 `[...]` 括号包裹 IPv6 字面量，`isIP("[::1]")` 返回 `0`（不是 6），私有 IP 检查永不触发。
- **MoFA Issue #675**：`[::ffff:127.0.0.1]`、`[::ffff:169.254.169.254]` 多处 bypass。

**为什么在这个系统里特别危险：**
插件通过 `system.http.request` 获得 HTTP 出口能力后，SSRF 不仅可访问 metadata 端点（AWS `169.254.169.254`、GCP `metadata.google.internal`），还可以：
- 穿透学校网络内部服务（代码仓库、LDAP、监控面板）
- 利用 DNS rebinding 的 TOCTOU（第一次解析到合法 IP，第二次解析到 `127.0.0.1`）
- 通过 redirect 链二次跳转进入内网（`fetch` 默认跟随 redirect）
- 利用 Node 18+ `fetch` 不支持 `http.Agent` 的特性（无法插入传统私网拦截层）

**How to avoid:**
1. **使用独立 DNS 解析器，而非信任 OS resolver**。Undici 的 `Dispatcher` 层支持 `connect.lookup` 函数注入 -- 先解析 DNS，验证所有返回 IP 不在私网范围内，然后将验证过的 IP **pin 到 TCP 连接**上（不再二次 DNS 查询）。关闭 TOCTOU 窗口。
2. **IPv6 字面量必须在解析前剥离 `[]` 括号**，再用 `net.isIP()` 校验（不带括号的 `::1` 返回 6）。
3. **IPv4-mapped IPv6**（`::ffff:x.x.x.x`）单独处理：解析 mapped IPv4 部分，用 IPv4 私网规则判定。
4. **十进制/八进制/十六进制 IP 编码**：先检查 hostname 是否为纯数字/纯 hex 字符串，若是则按 IP 解析判定而非信任字符串形式。
5. **禁用自动 redirect 跟踪**：每个 redirect 目标必须重新过完整校验链（URL parse → DNS resolve → IP validate → pin）。对 `fetch` 使用 `{ redirect: "manual" }` 然后手动按 `Location` header 逐个校验。
6. **开放端口限制**：只允许 80/443，拒绝 dangerous ports（22/3306/6379/5432/27017/6443/2375/2376 等）。

**检测信号：**
- 单元测试中用 `http://[::ffff:127.0.0.1]:8080/` 发起请求 -- 若未被拒绝说明 SSRF 防线有漏洞
- 单元测试中用 `http://2130706433/`（= `http://127.0.0.1/`）测试十进制编码绕过
- 单元测试请求 DNS rebinding 场景（两次解析不同 IP）
- 测试中设置 `http://example.com` redirect 到 `http://127.0.0.1/` -- fetch 应拒绝跟随

**Phase to address:** 78（`system.http.request`），SSRF 防线必须在 HTTP 代理首次可被插件调用前就绪。

---

### Pitfall 2: Manifest `systemCommands` 白名单校验时机 TOCTOU

**What goes wrong:**
`PluginManifest` 的 `systemCommands` 声明段在 **install 时校验一次**，但插件在运行时调用 `system.http.request`，这两个时间点之间插件版本可能已升级、manifest 可能已变更。如果运行时 governance gate 只检查 `projectionRow.executable`（lifecycle/kill-switch）而不重新验证 manifest 白名单，插件可通过 semver upgrade 扩权后用旧 session 调用新系统命令。

**在这个系统中的具体风险：**
- v4.0 已建立 install 时 `manifestJson` 校验流程（`PluginManifestSchema.parse` + governance v2 superRefine）
- v4.0 已有的 `assertActionExecutable` 治理门只检查 lifecycle/kill-switch/school scope，**不检查 manifest 白名单内容**
- 如果 `dispatchSystemCommand` 复用既有 `assertActionExecutable` 模式而不额外加 manifest re-parse，插件安装后管理员修改 manifest（upgrade）即可在运行时绕过 system command 白名单

**How to avoid:**
1. **运行时逐请求校验 manifest**：`dispatchSystemCommand` 入口必须在每次调用时从 `pluginRegistrations` 反序列化 `manifestJson`，重新用 Zod schema parse，从 `systemCommands` 段中验证当前请求的 command + domain + method 仍在白名单内。
2. **不依赖 install 时的缓存白名单**：install 时 parse 的 manifest 内容可能已过期（upgrade 后），必须从插件注册记录重新读取最新 `manifestJson`。
3. **白名单校验必须发生在 governance gate 之后、command execution 之前**，顺序为：lifecycle/kill-switch → manifest 白名单 → 参数级校验（domain/method 匹配）→ 执行。任何一步失败都写 denial governance audit。
4. **升级路径的权限缩小**：`plugin.upgrade` 命令在 backfill→verify→cutover 过程中应检查新 manifest 的 `systemCommands` 声明，如果白名单缩小（之前允许的 domain 不再允许），需要记录审计事件。

**检测信号：**
- 安装 v1.0（允许 `api.example.com`）→ 升级到 v2.0（允许 `api.evil.com`）→ v1.0 创建但未完成的 session 能否调用 `api.evil.com`？应该被允许（因为 runtime 读取的是最新 manifest）。
- 治理门返回 `executable=true` 但 manifest 中没有 `systemCommands` 段，`dispatchSystemCommand` 是否正确拒绝？
- `system.http.request` 请求包含 manifest 中未声明的 method（manifest 声明 GET，实际调用 POST）是否被正确拒绝？

**Phase to address:** 79（`dispatchSystemCommand` facade），运行时 manifest 白名单重新验证必须在 facade 入口实现。

---

### Pitfall 3: 插件 KV 配置跨插件/跨学校数据隔离失败

**What goes wrong:**
`system.config.get/set` 给每个插件分配 KV 存储，但键访问的隔离边界极易出错。常见失败模式：
- **键名前缀不一致**：get 用 `pluginKey:` 前缀，set 用 `pluginId:` 前缀（或反过来），导致一个插件能读到另一个插件的数据。
- **学校边界穿越**：`pluginOwnedBusinessData` 已有 `schoolId` 列，但如果 KV 操作使用全局唯一键名（如 `pluginConfig:{pluginKey}:{key}`）而**不在查询时强制 `schoolId` scope**，同一 pluginKey 安装在不同学校的实例可能读到彼此的配置。
- **键枚举**：`system.config.get` 若支持通配符/前缀匹配（如 `get("*")` 返回所有键），攻击者插件可枚举自身所有键甚至推测其他插件的键名模式。

**在这个系统中的具体风险：**
- `pluginOwnedBusinessData` 表按 `(pluginId, schoolId, key)` 三元组存储，school scope 已在数据模型中。
- 但 `system.config` 的新 facade 如果只按 `pluginKey` 查找而不强制注入 `schoolId`（类似 `assertActionExecutable` 中 session-derived schoolId），学校边界就会破。
- SQLite 的 `LIKE` 查询天然支持键前缀枚举，如果 `get` 接口接受 pattern 参数，攻击者可枚举所有其他插件的键。

**How to avoid:**
1. **键名三重前缀隔离**：存储键统一格式为 `{schoolId}:{pluginId}:{key}`，查询时三个组件均由 facade 注入（`schoolId` 来自 session，`pluginId` 来自治理门投影，`key` 来自调用参数）。插件声明 `key` 部分不可包含 `:` 字符（在 Zod 层校验）。
2. **禁止通配符/前缀查询**：`system.config.get` 仅支持精确键名查询，不接受 `*`/`?` pattern。如果需要列出所有键，返回的键列表必须先过 `schoolId` 过滤（但更好的是不提供 `list` 能力）。
3. **配置大小 + 数量限制**：单个 key 的 value size ≤ 64KB，单个插件的总 key count ≤ 100 项，总存储 ≤ 512KB。这些限制在 `set` 调用时强制执行（先 count + sum，再 insert/update）。
4. **Zod 边界校验**：`system.config` 入参 schema 中 `key` 字段用 `z.string().regex(/^[a-z][a-zA-Z0-9._-]{0,127}$/).refine(k => !k.includes(':'), "key must not contain namespace separator")`。
5. **复用既有 `pluginOwnedBusinessData` 表**：该表已有 `schoolId` + `pluginId` + `key` 三元组隔离 + `value TEXT`，新增 KV 操作不需要新建表，只需扩展 DAL 层动词。

**检测信号：**
- 安装同一 pluginKey 到两所学校，分别 set config，get 只返回自己学校的值。
- plugin A set `key=secret`，plugin B get `key=secret` -- 必须被拒绝或返回空（因为键名前缀不同）。
- `set` 一个 70KB 的 value -- 确认被拒绝（超过 64KB limit）。

**Phase to address:** 80（`system.config`），KV 隔离防线在 config 存储首次可被插件调用前就绪。

---

### Pitfall 4: Governance Audit 拒绝分支日志缺失

**What goes wrong:**
系统命令调用有多个拒绝点（lifecycle gate denial → manifest whitelist denial → per-request domain/method denial → SSRF private-ip denial → config key denial），但如果任何一个拒绝点在抛出错误前**忘了写 governance audit**，操作者将：
- 看不到任何 `deny` 审计记录 -- 系统静默工作
- 误以为"没有发生错误"而非"被拒绝"
- 无法追溯哪个插件在尝试越权操作

**在这个系统中的具体风险：**
- v4.0 `assertActionExecutable` 治理门在每个拒绝路径都调用了 `writeDenial`（见 `governance-gate.ts` L55-82），这是良好范例。
- 但 `dispatchSystemCommand` 的新拒绝点（manifest 白名单不匹配、domain/method 不在白名单中、SSRF 防护拒绝）若沿用不同的抛错模式（只抛 Error 不写 audit），审计链就会断裂。
- **最隐蔽的 gap**：deny 审计记录的 `payloadJson` 若缺少关键诊断信息（如被拒的 URL、被拒的方法、白名单的期望值），事后排查时会陷入"只知道被拒但不知道为什么"的困境。

**How to avoid:**
1. **统一拒绝审计写入器**：为 `dispatchSystemCommand` 新建一套 `writeSystemCommandDenial` 函数（与 `writePluginDataAccessAudit` 同级，复用同一 `governanceAudits` 表），每个拒绝点（lifecycle/manifest/domain/method/private-ip/config-key）都必须调用此写入器。
2. **action 字段语义化**：`action` 字段设为 `system.http.request` 或 `system.config.get`（含动词），`reasonCode` 使用新枚举值（`not_allowlisted` / `domain_not_allowed` / `method_not_allowed` / `private_ip_blocked` / `config_key_denied`），`payloadJson` 包含诊断上下文（被拒 URL、请求 method、期望白名单值）。
3. **deny 审计必须在抛错前完成**：拒绝路径的代码结构为 `await writeDenial(...) → throw SystemCommandError(...)`。任何先抛错后审计的路径都是 bug。
4. **`commandId` 关联**：如果 system command 经过 Command Bus 写入，deny 审计记录中必须包含 `commandId`（即便命令最终未执行）。这要求 facade 在治理门前先生成 `commandId` 而非事后补。

**检测信号：**
- 用 `not_allowlisted` reasonCode 搜 `governanceAudits` 表 -- 确认 deny 记录数与实际拒绝调用次数一致。
- `payloadJson` 中包含被拒的完整请求上下文而非空对象。
- 用不同 reasonCode 各触发一次拒绝 -- 审计表中有对应行。

**Phase to address:** 79（`dispatchSystemCommand` facade），统一的拒绝审计写入器作为 facade 的前置基础设施。

---

### Pitfall 5: Manifest Schema 演进破坏已有插件兼容性

**What goes wrong:**
`PluginManifest` 新增 `systemCommands` 可选字段后，已有插件（quiz、homework）的 manifest JSON **不包含**该字段。如果 Zod schema 设置不当（如 `systemCommands` 使用 `z.object().default()` 而非标记 `optional()` 或无默认值的可选），安装/升级已有插件时的 `PluginManifestSchema.parse()` 会抛错，阻止合法操作。

**在这个系统中的具体风险：**
- 已有 `PluginManifestSchema`（`src/lib/dto/resource-ai.ts` L761）使用 `z.object()` + `superRefine`，新增字段。
- `PluginRegistrationDTO` 包含 `manifestJson: PluginManifestSchema`，说明 manifest JSON 从数据库读出后会再次 parse。
- 如果新字段不是 `optional()` 或 `nullable()` 且有 `.default()`，已有数据库记录的 manifest JSON 解析会失败。
- 更隐蔽的风险：`PluginManifestGovernanceV2Schema`（governance v2 superRefine）只验证 `manifestVersion === 2` 时 `governance` 字段存在，**不**处理 manifestVersion 1 的兼容。`systemCommands` 如果被误放进 governance v2 段内，v1 插件会被永久锁定。

**How to avoid:**
1. **纯 additive 变更**：`systemCommands` 作为**完全可选**的顶级字段添加到 `PluginManifestSchema`，使用 `z.object({ ..., systemCommands: SystemCommandsSchema.optional() })` 而非 `.default()`。
2. **独立于 manifestVersion**：`systemCommands` 放在 `PluginManifestSchema` 顶级（与 `permissions`/`actions`/`anchors` 同级），不嵌套在 `governance` v2 段内。这样 manifest v1 和 v2 插件都受同一套 schema 校验。
3. **数据库记录的 JSON 反序列化必须容错**：`manifestJson` column 存储的是安装时的原始 JSON，新增字段后读出必须能成功 parse。在 Zod schema 变更后，跑全量 `pluginRegistrations` 扫描测试 -- 确认所有已有 manifest 都能通过 `PluginManifestSchema.parse()`。
4. **install 命令的参数化处理**：`plugin.install` handler 在最终落库前先 parse 新 schema，如果 parse 失败应返回具体错误信息，而非静默回退到旧 schema。

**检测信号：**
- 对已有 quiz plugin 的 manifest JSON 跑 `PluginManifestSchema.parse()` -- 确认不抛错。
- 对已有 homework plugin 的 manifest JSON 跑 `PluginManifestSchema.parse()` -- 确认不抛错。
- 对新 manifest（含 `systemCommands`）跑 parse -- 确认新字段被正确提取。
- `pluginRegistrations` 表中的所有已有记录都能通过新 schema parse。

**Phase to address:** 77（manifest `systemCommands` 声明段定义），schema 定义就在此 phase 完成，必须在 schema 完成后立即执行已有插件兼容性扫描。

---

### Pitfall 6: HTTP 代理无速率/并发/大小限制导致资源耗尽

**What goes wrong:**
一个恶意（或被入侵的）插件利用 `system.http.request` 发起海量并发 HTTP 请求、超大响应体下载、无限重试循环，耗尽服务器网络带宽、内存和文件描述符。

**在这个系统中的具体风险：**
- Node.js 单线程 event loop 对并发 HTTP 请求的承压能力有限，过多的 in-flight 请求会导致所有其他请求排队。
- 插件在 session 生命周期内可多次调用 `system.http.request` -- 没有跨请求的调用计数或速率限制。
- 响应体大小无上限可能导致内存耗尽（例如插件请求一个 2GB 的文件）。

**How to avoid:**
1. **严格超时**：每个 HTTP 请求总超时 ≤ 10s（含 DNS 解析 + 连接 + 读取），使用 `AbortSignal.timeout(10000)`。
2. **响应体大小限制**：`Content-Length` 头校验 + 流式读取时的累计字节计数。超出 5MB 时 abort 连接并返回 `response_size_exceeded` 错误。
3. **每个插件实例的并发限制**：同一 pluginId 同时最多 3 个 in-flight `system.http.request` 调用。用内存 Map 计数（插件 3 次调用完成后 decrement），超并发立即拒绝。
4. **单次 session 调用限制**：每个 runtime session 生命周期内最多 50 次 HTTP 调用。这个计数存储在 session state 中。
5. **禁止 redirect looping**：最多允许 3 次 redirect，超过则中止。
6. **请求头大小限制**：总请求头 ≤ 8KB，防止 header injection 攻击。

**检测信号：**
- 并发触发 5 次 HTTP 请求同时 out -- 第 4/5 次被拒绝（并发限制 = 3）。
- 在 session 中连续发起 51 次请求 -- 第 51 次被拒绝。
- 请求一个 10MB 的响应 -- 在 5MB 处中止。
- 请求需要 30 秒的超慢服务器 -- 10 秒后超时。

**Phase to address:** 78（`system.http.request`），速率和资源限制与 HTTP 代理核心实现一并交付。

---

### Pitfall 7: `dispatchSystemCommand` 与 `dispatchPluginDataAccess` 治理门异构化

**What goes wrong:**
两个 facade 分别实现自己版本的 governance gate、audit writer、school scope derivation 和 lifecycle check。表面看起来都"做了治理"，但内部实现细节不同（例如一个检查了 kill-switch+lifecycle，另一个只检查 lifecycle），导致系统命令和数据访问的安全态势不一致。操作者无法用统一的心智模型理解"什么情况下插件行为会被拒绝"。

**在这个系统中的具体风险：**
- `assertActionExecutable` 是 `dispatchPluginDataAccess` 的治理门，它包含完整的 lifecycle/kill-switch/school scope 校验 + denial audit。
- 如果 `dispatchSystemCommand` 重新实现一套"简化版"治理门（例如只检查 `projectionRow.executable`），后续 lifecycle state machine 的变更（新增 `failed` 状态语义）可能只更新了一边。
- 审计记录的 `action` 字段语义不一致：`plugin.data.insert` vs `system.http.request` 可以共存，但如果两者的 `reasonCode` 枚举不同、`payloadJson` 结构不同，dashboard 和操作者面板的渲染逻辑会分支爆炸。

**How to avoid:**
1. **复用 `assertActionExecutable`**（governance gate）：`dispatchSystemCommand` 第一层调用与 `dispatchPluginDataAccess` 完全相同的治理门函数。这确保 lifecycle/kill-switch/school scope 校验逻辑零异构。
2. **只在治理门通过后执行 manifest 白名单 + 参数级校验**：这些是 system command 独有的层，但在同一拒绝审计写入器之上。
3. **审计记录共享同一 `governanceAudits` 表 + 统一 `action` 命名约定**：`system.http.request`、`system.config.get`、`system.config.set` 都使用同一张表，字段语义对齐。
4. **`reasonCode` 枚举分层**：第一层（lifecycle/kill-switch/school scope）复用 `PluginDataAccessReason`。第二层（manifest/domain/method/private-ip/config-key）新增 `SystemCommandReason`，与第一层不冲突。

**检测信号：**
- 对 disabled 插件同时调用 `dispatchPluginDataAccess` 和 `dispatchSystemCommand` -- 两者返回的拒因应一致。
- 对 kill-switch 启用的插件同时调用 -- 两者返回的拒因应一致。
- 跨学校调用的拒绝语义一致。

**Phase to address:** 79（`dispatchSystemCommand` facade），facade 的治理门复用必须在设计阶段就确立。

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| SSRF 检查只用正则匹配 hostname（不解析 DNS）| 快速实现，无 DNS 依赖 | 所有 DNS rebinding / CNAME 链攻击可绕过 | NEVER |
| Manifest 白名单只在 install 时检查 | 减少运行时开销 | upgrade 后白名单变更不生效，权限漂移 | NEVER |
| KV 配置不校验 `schoolId` scope | 简化查询（全局唯一键） | 不同学校同 plugin 互相读写配置 | NEVER |
| Deny 审计只在"关键拒绝点"写，local-only 抛错 | 减少审计表写入量 | 无法追溯越权尝试，安全事件无法复盘 | NEVER |
| `systemCommands` schema 用 `.default()` 而非 `.optional()` | 避免 `undefined` 检查 | 所有已有插件 manifest 解析失败 | NEVER |
| HTTP 时长/大小不设限 | 实现简单 | 一个恶意插件可打挂整个服务器 | NEVER |
| 新 facade 重新实现治理门 | 更快交付，不碰已有代码 | 双层治理逻辑漂移，future 变更只更新一边 | NEVER |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `dispatchSystemCommand` → `assertActionExecutable` | 跳过 governance gate 直接执行业务逻辑 | 与 `dispatchPluginDataAccess` 完全相同的治理门调用链 |
| `system.http.request` → Node.js `fetch` | 直接 `fetch(url)` 不配置 dispatcher | 用 Undici `Agent` 的 `connect.lookup` 注入预验证 IP，pin 住连接 |
| `system.config` → `pluginOwnedBusinessData` | 新建独立配置表 | 复用已有表（已有 schoolId+pluginId+key 三元组），新增 `key` 前缀约定 |
| `systemCommands` manifest → `PluginManifestSchema` | 嵌套在 `governance` v2 字段内 | 放在顶级，与 `permissions`/`actions` 同级，独立于 manifestVersion |
| Command Bus `system.*` 命令定义 | 跳过 `dedupe: "required"` 配置 | 保持与 `plugin.data.insert` 等命令同等级的幂等语义 |
| Zod schema 新增字段 | 不测试已有数据库记录的反序列化 | `PluginManifestSchema.parse(dbRecord.manifestJson)` 全量扫描 |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| 每个 `system.http.request` 调用都用 `dns.resolve4` 做同步 DNS 解析 | 10s+ 的递增延迟 | 使用 Undici pinned dispatcher（DNS 解析一次，验证后 pin IP） | 10+ 插件同时调用 |
| 每次 `system.config.get` 都扫全表 `pluginOwnedBusinessData` | 慢查询堆积 | 在 `(pluginId, schoolId, key)` 上建立联合索引 | 插件配置项 > 50 条 |
| Governance gate 每次都加载全量 `governanceSnapshotRecords` | 每个插件调用都扫全表 | 缓存 `projectPluginGovernance` 结果（TTL 30s），仅在 lifecycle transition 后 invalidate | 5+ 插件频繁调用 |
| KV config 值直接存大 JSON 字符串 | 100KB+ 的单行数据，Drizzle 序列化开销大 | 拆分大 JSON 为多个 key 或限制单 key ≤ 64KB | 插件试图存储复杂配置对象 |
| HTTP 请求无并发控制 | event loop 被所有插件共享，一个插件占用所有 socket | 每个 pluginId 最高 3 并发 + session 级调用限制 | 5+ 插件同时发起请求 |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| 直接信任 `URL.hostname` 做私有 IP 字串匹配 | 致命 -- IPv6/十进制/hex 编码全部可绕过 | DNS resolve → IP validate → pin connection，不信任字符串 hostname |
| `fetch(url, { redirect: "follow" })` 默认跟踪 redirect | 高 -- redirect 可指向内网 `127.0.0.1` | `redirect: "manual"`，每个 redirect 重新过完整校验链 |
| `system.config.set` 接受任意 key 名 | 中 -- 键名碰撞可覆盖其他插件配置 | key 名强制 `{schoolId}:{pluginId}:` 前缀，由 facade 注入不可控部分 |
| `PluginManifest` 新字段无 Zod strict 模式 | 中 -- 攻击者可在 manifest 注入无法识别的额外字段 | `SystemCommandsSchema` 使用 `z.strictObject`，拒额外字段 |
| Governance audit `payloadJson` 含原始 URL | 中 -- 审计表可能含私网地址或凭证参数 | URL 脱敏（只记录 hostname 和 method，不记录完整 path + query string） |
| `system.http.request` 允许任意 port | 高 -- 可访问内网开放端口（数据库、Redis、Docker socket） | 只允许 80/443，显式拒绝 dangerous ports |

---

## "Looks Done But Isn't" Checklist

- [ ] **SSRF 防线**: 经常缺失 IPv6 bypass 测试 -- 验证 `[::ffff:127.0.0.1]`、`[::1]`、`http://2130706433/` 都被拒
- [ ] **SSRF 防线**: 经常缺失 redirect chain re-validation -- 验证 302 → `127.0.0.1` 被拒
- [ ] **Manifest 白名单**: 经常缺失运行时 re-parse -- 验证 upgrade 后的 manifest 白名单在已有 session 中生效
- [ ] **Governance audit**: 经常缺失 deny 路径的审计记录 -- 对每个 reasonCode 触发一次 deny，检查 audit 表存在
- [ ] **KV 隔离**: 经常缺失跨学校隔离测试 -- 同一 pluginKey 在不同学校 set，交叉 get，确认不可见
- [ ] **KV 隔离**: 经常缺失键枚举测试 -- `get("")` / `get("*")` 应返回 empty 而非列出所有键
- [ ] **并发控制**: 经常缺失 session 级限流测试 -- 51 次调用后第 51 次被拒
- [ ] **Schema 兼容**: 经常缺失已有 manifest 扫描 -- Drizzle query `pluginRegistrations` 所有行的 `manifestJson` 是否可通过新 `PluginManifestSchema`
- [ ] **HTTP 超时**: 经常缺失超时响应测试 -- 模拟 30s 慢响应，确认 10s 后被 abort
- [ ] **Governance gate 复用**: 经常缺失异构测试 -- disabled plugin 同时调用 `dispatchPluginDataAccess` 和 `dispatchSystemCommand`，拒因必须一致

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| SSRF 绕过在生产环境被发现 | HIGH | 临时 disable 所有使用 `system.http.request` 的插件 → 修补 SSRF 防线 → 审计 `governanceAudits` 表确认是否有实际利用 → re-enable |
| Manifest schema 破坏已有插件 | MEDIUM | 回滚 schema 变更（设为 `.optional()`）→ 全量扫描已有 manifest → 修复后重新部署 |
| 跨插件 KV 数据泄漏 | HIGH | 立即暂停 `system.config` → 审计所有 config 读写记录 → 隔离受影响的配置数据 → 添加前缀隔离后恢复 |
| 资源耗尽（HTTP 泛滥） | LOW | kill-switch 启用 → 隔离问题插件 → 添加并发/速率限制 → 重新启用 |
| Audit gap 中有历史拒绝记录缺失 | LOW | 不可恢复（日志已丢失）-- 只能为未来调用的审计完整性做修补 |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| #1 SSRF -- URL 解析器归一化绕过 | 78 (`system.http.request`) | 5 个 SSRF bypass payload 的 vitest 测试，全部预期拒绝 |
| #2 Manifest 白名单 TOCTOU | 79 (`dispatchSystemCommand`) | upgrade 后旧 session 调用新 domain 被拒，vitest |
| #3 KV 配置跨插件隔离 | 80 (`system.config`) | 跨学校 + 跨插件交叉 get 测试，vitest |
| #4 Audit deny 日志缺失 | 79 (`dispatchSystemCommand`) | 每个 reasonCode 的 deny 记录存在性验证，vitest |
| #5 Manifest schema 兼容性 | 77 (manifest schema 定义) | 已有插件 manifest 全量 scan + parse，build 时检查 |
| #6 HTTP 速率/资源耗尽 | 78 (`system.http.request`) | 并发/count/timeout/body-size 限制的边界测试，vitest |
| #7 治理门异构化 | 79 (`dispatchSystemCommand`) | 对比 `dispatchPluginDataAccess` 和 `dispatchSystemCommand` 的拒因一致性，vitest |

---

## Sources

- CVE-2026-43929 -- ssrfcheck SSRF via IPv4-mapped IPv6 normalization: https://advisories.gitlab.com/npm/ssrfcheck/CVE-2026-43929/
- CVE-2026-42260 -- open-websearch SSRF via bracketed IPv6 + non-resolving hostname bypass: https://advisories.gitlab.com/npm/open-websearch/CVE-2026-42260/
- WHATWG URL Issue #893 -- malformed URL normalization introduces SSRF risks: https://lists.w3.org/Archives/Public/public-webapps-github/2026Jan/0013.html
- OWASP SSRF Prevention in Node.js: https://owasp.org/www-community/pages/controls/SSRF_Prevention_in_Nodejs
- ssrf-guard -- Undici-based SSRF prevention with pinned DNS: https://github.com/jonathanong/ssrf-guard
- agent-fetch -- sandboxed HTTP client with Hickory DNS atomic resolution: https://github.com/Parassharmaa/agent-fetch
- nullspace -- DNS cache floor + socket pinning for rebinding resistance: https://socket.dev/npm/package/nullspace
- request-filtering-agent -- SSRF prevention via custom http.Agent (NOTE: not compat with fetch): https://github.com/azu/request-filtering-agent
- TOCTOU of Trust -- why L3 point-in-time governance fails: https://dev.to/piiiico/toctou-of-trust-why-agent-governance-must-be-continuous-3270
- MoFA HTTP request tool SSRF bypass Issue #675: https://github.com/mofa-org/mofa/issues/675
- Astrid Plugins -- ScopedKvStore namespace isolation pattern: https://docs.rs/astrid-plugins/latest/astrid_plugins/
- Splinter -- multi-tenant in-memory KV with per-tenant extension isolation (USENIX OSDI '18)
- Michael F. Angelo Patent -- auditing coupled with authorization decision logic: US20080066146A1
- MCP-Zero Epic 5 -- modern audit/logging with correlation IDs: https://github.com/abwaters/mcp-zero/issues/7
- OpenLearn-Next 现有代码库：
  - `dispatchPluginDataAccess` facade: `src/features/platform-core/plugin-data-access/facade.ts`
  - `assertActionExecutable` governance gate: `src/features/platform-core/plugin-data-access/governance-gate.ts`
  - `writePluginDataAccessAudit`: `src/features/platform-core/plugin-data-access/audit.ts`
  - `PluginManifestSchema`: `src/lib/dto/resource-ai.ts` L761
  - `PluginManifestGovernanceV2Schema`: `src/features/runtime-platform/contracts/descriptors.ts` L69
  - `platformCommandRegistry`: `src/features/platform-core/commands/registry.ts`
  - `projectPluginGovernance`: `src/features/platform-core/plugins/governance-projection.ts`
  - `PluginDataModelSchema`: `src/lib/dto/plugin-data-model.ts`

---
*Pitfalls research for: v4.3 System Commands Bus -- HTTP proxy + KV config for governed plugin system*
*Researched: 2026-06-11*
