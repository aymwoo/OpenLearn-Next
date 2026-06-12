---
phase: 78-system-http-request-http
verified: 2026-06-12T10:00:00Z
status: human_needed
score: 5/5
overrides_applied: 0
gaps:
  - truth: "Handler 使用的拒因码 redirect_denied / response_size_exceeded / timeout 未在 GovernanceDeniedReasonValues 枚举中定义"
    status: partial
    reason: "handler.ts 中 audit reasonCode 是 string | null 类型，未使用 GovernanceDeniedReason z.enum 约束。新增的 redirect_denied / response_size_exceeded / timeout 拒因码在 permissions.ts 的 GovernanceDeniedReasonValues 数组中缺失，但没有功能影响（Drizzle text 列接受任意字符串）"
    artifacts:
      - path: "src/features/runtime-platform/contracts/permissions.ts"
        issue: "GovernanceDeniedReasonValues 缺少 redirect_denied, response_size_exceeded, timeout 三个拒因码"
    missing:
      - "将 redirect_denied / response_size_exceeded / timeout 追加至 permissions.ts GovernanceDeniedReasonValues 枚举"
human_verification:
  - test: "运行 pnpm install 安装 undici 依赖后，执行 npx vitest run src/features/system-commands/*.test.ts 确认全部 56+ 测试通过"
    expected: "所有测试通过：ssrf-guard ~41 测试，audit ~6 测试，handler ~12 测试。ssrf-guard 测试因 undici 未安装而在验证时无法运行"
    why_human: "undici 未安装到 node_modules（package.json 已声明 ^8.4.1），需要 pnpm install 后才能运行测试；execute 函数涉及实际 HTTP 网络调用和 undici Agent 行为，grep 无法完全验证运行时行为"
  - test: "检查插件的 install preflight 流程：提交一个含 systemCommands.system.http.request 的 manifest，allowedDomains 设为 ['*.example.com']，allowedMethods 设为 ['GET', 'POST']——确认 install 时通过 Schema 校验"
    expected: "install 时 PluginManifestSchema.parse 通过，manifest 存入 pluginRegistrations.manifestJson；不合法域名（如 '..com'）被 DOMAIN_PATTERN regex 拒绝"
    why_human: "install preflight 是 Phase 77 的前置条件，通过 Schema 层校验——Phase 78 运行时 authorize 也用它；grep 可确认代码路径但无法端到端运行 preflight"
  - test: "端到端测试：安装含 system.http.request 的插件后，发起 system.http.request 调用，domain 为 https://api.example.com/data，验证返回正确响应并写入 governance audit"
    expected: "调用成功返回 { status, body, headers, finalUrl, redirectCount }；governanceAudits 表中出现一条 decision=allowed 的记录"
    why_human: "完整端到端流程（install → authorize → execute → audit）需要运行中的 Next.js 服务器和数据库，无法在 grep 层面验证"
---

# Phase 78: system.http.request HTTP 代理 — 验证报告

**Phase Goal:** 插件可通过 `system.http.request` 经 manifest 声明的白名单域名+方法代理 HTTPS 调用，系统在运行时逐请求校验白名单、执行 SSRF 防护并审计。
**Verified:** 2026-06-12T10:00:00Z
**Status:** human_needed
**Re-verification:** 否 — 初始验证

## 目标达成

### 可观察的真相

| # | 真相 | 状态 | 证据 |
|---|------|------|------|
| 1 | 插件在 manifest 的 `systemCommands.system.http.request` 中声明 `allowedDomains`（支持 `*.example.com` 通配符）和 `allowedMethods`（GET/POST/PUT/DELETE/PATCH），声明在 install preflight 时校验合法性 | ✓ VERIFIED | `src/lib/dto/resource-ai.ts:801-818` — `SystemCommandHttpRequestSchema` 定义 `allowedDomains: z.array(z.string().regex(DOMAIN_PATTERN)).min(1)`，`DOMAIN_PATTERN` (line 781) 含 `(\*\.)` 组支持通配符。`installOrReconcilePluginWithTx` (plugins.ts:767) 在安装时 `PluginManifestSchema.parse(input.manifestJson)`。 |
| 2 | 系统逐请求校验目标域名匹配 `allowedDomains` + 方法匹配 `allowedMethods`，不匹配时拒绝并返回 `domain_not_allowed` / `method_not_allowed` audit | ✓ VERIFIED | `handler.ts:125-323` authorize 函数 — D-04 每次重新查询 manifestJson → D-05 逐条匹配（first-match-wins）→ D-06 通配符严格单级子域名。不匹配时 `writeSystemCommandAudit` 在 `throw` 前写入。 |
| 3 | SSRF 防护生效：DNS pinning（undici Agent `connect.lookup`）+ IPv6/IPv4-mapped/十进制编码检测 + redirect 链 re-validate，命中内网 IP 时拒绝并返回 `private_ip_blocked` | ✓ VERIFIED | `ssrf-guard.ts:190-264` — `createPinnedAgent` 通过 `Agent.connect.lookup` 回调执行 `resolve4` + `resolve6` 双栈解析（line 218-221），所有地址验证私有范围后 pin 到第一个安全地址。IPv6 bracket bypass (line 56-61), decimal IP (line 84-99 WHATWG normalize), IPv4-mapped IPv6 (line 68-71) 均在 `isPrivateIP` 中覆盖。handler.ts `executeRequest` (line 489-781) 实现手动 redirect 循环，每跳 per-hop manifest re-validation + SSRF 重校验。 |
| 4 | 请求强制 HTTPS-only（拒绝 plain HTTP），默认超时 30s，响应体上限 5MB 硬截断 | ✓ VERIFIED | `ssrf-guard.ts:84-99` — `validateUrl` 拒绝 `http://` (SSRF_HTTPS_REQUIRED)。handler.ts:368-369 — `timeout` 默认 30000ms，`maxResponseSize` 默认 5MB。handler.ts:480-481 — `bodyTimeout` 传给 Agent，`AbortSignal.timeout(timeout)`。handler.ts:741-748 — 流式读取 `reader.read()` + bytesRead 累计 + `reader.cancel("RESPONSE_SIZE_EXCEEDED")` 硬截断。 |
| 5 | 成功调用返回响应状态码和 body（5MB 内），每次调用至少产生 1 条 governance audit 记录 | ✓ VERIFIED | handler.ts:403-409 — 成功时返回 `{ status, body, headers, finalUrl, redirectCount }`。handler.ts:391 — 成功路径写入 `decision: "allowed"` audit。所有 deny 路径（authorize line 279, execute catch line 433, executeRequest line 507等）均在 throw 前写入 audit（audit-then-throw）。 |

**Score:** 5/5 真相已验证

### 需求覆盖

| 需求 | 来源计划 | 描述 | 状态 | 证据 |
|------|----------|------|------|------|
| SYS-01 | 78-01, 78-02 | 插件可通过 `system.http.request` 经白名单域名+方法代理 HTTP 调用，SSRF 防护，HTTPS-only，超时/大小限制，结构化拒因码 | ✓ SATISFIED | handler.ts (789 lines) 实现 authorize + execute；ssrf-guard.ts (264 lines) 实现 DNS pinning + IP 检测 + HTTPS 强制；audit.ts (68 lines) 实现 governance audit 写入；registry.ts 接线完毕 |

### 要求的产物

| 产物 | 预期 | 状态 | 详情 |
|------|------|------|------|
| `src/features/system-commands/ssrf-guard.ts` | DNS pinning (IPv4+IPv6) + IP 检测 + HTTPS-only 强制 + redirect 重验证，>=140 行，5 exports | ✓ VERIFIED | 264 行，5 exports: validateUrl, isHostnameRawIP, isPrivateIP, createPinnedAgent, MAX_REDIRECTS |
| `src/features/system-commands/audit.ts` | writeSystemCommandAudit governance audit helper，>=30 行 | ✓ VERIFIED | 68 行，1 export: writeSystemCommandAudit，db.insert(governanceAudits) |
| `src/features/system-commands/handler.ts` | authorize + execute for system.http.request，>=245 行，含 header allowlist 过滤 | ✓ VERIFIED | 789 行，1 export: systemHttpRequestHandler { "system.http.request": { authorize, execute } } |
| `src/features/platform-core/commands/registry.ts` | Updated registry with real system.http.request handler wired | ✓ VERIFIED | import systemHttpRequestHandler (line 11)，authorize 和 execute 已接线 (lines 157-160)，无 TODO Phase 78 |
| `package.json` | undici 作为直接依赖 | ✓ VERIFIED | `"undici": "^8.4.1"` (line 121) |
| `src/features/system-commands/ssrf-guard.test.ts` | ssrf-guard 单元测试 | ✓ VERIFIED | 346 行，~41 测试用例 |
| `src/features/system-commands/audit.test.ts` | audit 单元测试 | ✓ VERIFIED | 125 行，3 测试全部通过 |
| `src/features/system-commands/handler.test.ts` | handler 单元测试 | ✓ VERIFIED | 456 行，12 个 authorize 测试（通配符、first-match-wins、audit-before-throw） |

### 关键链路验证

| 从 | 到 | 通过 | 状态 | 详情 |
|----|----|------|------|------|
| ssrf-guard.ts validateUrl | node:net isIP | bracket-stripped hostname check | ✓ WIRED | line 108: `isIP(stripped) !== 0` |
| ssrf-guard.ts createPinnedAgent | undici Agent.connect.lookup | DNS resolve4 + resolve6 + IP validation callback | ✓ WIRED | lines 211-263: `connect: { lookup(hostname, options, callback) { Promise.allSettled([dns.resolve4, dns.resolve6])... } }` |
| ssrf-guard.ts createPinnedAgent | node:dns/promises resolve6 | IPv6 DNS resolution alongside resolve4 | ✓ WIRED | line 220: `dns.resolve6(hostname)` |
| audit.ts writeSystemCommandAudit | governanceAudits table | Drizzle insert | ✓ WIRED | line 36: `db.insert(governanceAudits).values({...})` |
| handler.ts authorize | pluginRegistrations table (manifestJson) | Drizzle query | ✓ WIRED | line 136: `db.query.pluginRegistrations.findFirst(...)` |
| handler.ts authorize | PluginManifestSchema.parse | Zod manifest re-parse | ✓ WIRED | line 185: `PluginManifestSchema.parse(row.manifestJson)` |
| handler.ts authorize | writeSystemCommandAudit | audit helper on deny | ✓ WIRED | lines 144, 196, 279: audit 在 throw 前写入 |
| handler.ts execute | ssrf-guard.ts | validateUrl + createPinnedAgent | ✓ WIRED | line 11: import; line 653: `createPinnedAgent(targetHostname, timeout)` |
| handler.ts execute | fetch() with undici Agent dispatcher | SSRF-safe HTTP execution | ✓ WIRED | line 657: `dispatcher: agent`, line 671: `fetch(currentUrl, ...)` |
| handler.ts execute | writeSystemCommandAudit | audit helper on success/failure | ✓ WIRED | lines 391, 433: audit 写入 |
| handler.ts executeRequest | manifest allowedDomains + allowedMethods | per-hop redirect target re-validation | ✓ WIRED | lines 556-650: `matchDomain(pattern, targetHostname)` 每跳重验证 |
| handler.ts header filtering | ALLOWED_HEADER_NAMES / BLOCKED_X_HEADER_PREFIXES | filterHeaders() helper | ✓ WIRED | lines 34-68: 常量定义 + filterHeaders 函数 |
| registry.ts | handler.ts | systemHttpRequestHandler import | ✓ WIRED | line 11 import, lines 157-160 接线 |

### 数据流追踪 (Level 4)

| 产物 | 数据变量 | 数据源 | 产生真实数据 | 状态 |
|------|----------|--------|-------------|------|
| handler.ts authorize | `command.payload.url` | Plugin command bus 管道传入的 payload | ✓ 是 — validateUrl 解析后提取 hostname | ✓ FLOWING |
| handler.ts authorize | `row.manifestJson` | `db.query.pluginRegistrations.findFirst` — 真实数据库查询 | ✓ 是 — PluginManifestSchema.parse 后提取 systemCommands | ✓ FLOWING |
| handler.ts executeRequest | `response.body` | undici fetch 返回的 ReadableStream | ✓ 是 — `reader.read()` 流式累积，解码为 UTF-8 文本 | ✓ FLOWING |
| handler.ts execute resultSummary | `{ status, body, headers, finalUrl, redirectCount }` | fetch response + filterHeaders + 流累积 | ✓ 是 — 每次网络调用返回真实数据 | ✓ FLOWING |

### 反模式扫描

| 文件 | 行 | 模式 | 严重性 | 影响 |
|------|----|------|--------|------|
| handler.ts:436 | 488 | `"redirect_denied"` 拒因码未在 GovernanceDeniedReasonValues 中定义 | WARNING | 运行时功能正常（Drizzle text 列），但类型安全不足 |
| handler.ts:430 | 482 | `"timeout"` 拒因码未在 GovernanceDeniedReasonValues 中定义 | WARNING | 同上 |
| handler.ts:427 | 479 | `"response_size_exceeded"` 拒因码未在 GovernanceDeniedReasonValues 中定义 | WARNING | 同上 |

### 行为抽查

| 行为 | 命令 | 结果 | 状态 |
|------|------|------|------|
| audit.test.ts 3 tests pass | `npx vitest run src/features/system-commands/audit.test.ts` | PASS 3/3 | ✓ PASS |
| ssrf-guard.test.ts | `npx vitest run src/features/system-commands/ssrf-guard.test.ts` | undici 模块在 node_modules 中不存在 | ? SKIP — 需要 pnpm install |
| handler.test.ts 12 tests | `npx vitest run src/features/system-commands/handler.test.ts` | 依赖 ssrf-guard.ts → undici，同上 | ? SKIP — 需要 pnpm install |

### 已延期项

无 — 所有 Phase 78 的需求在本阶段交付。

### 需人工验证

#### 1. 运行完整测试套件（依赖安装后）

**测试:** 运行 `pnpm install && npx vitest run src/features/system-commands/*.test.ts`
**预期:** 所有测试通过：ssrf-guard ~41 测试，audit ~6 测试，handler ~12 测试
**为什么需要人工验证:** undici 未安装到 node_modules（package.json 已声明 `^8.4.1`），需要 `pnpm install`。ssrf-guard.test.ts 导入的 `Agent from "undici"` 在 node_modules 缺失时会导致 `ERR_MODULE_NOT_FOUND`。audit.test.ts 已验证通过（3/3）。

#### 2. 端到端：install preflight → authorize → execute → audit

**测试:** 
1. 安装含 `systemCommands: [{ command: "system.http.request", allowedDomains: ["*.example.com"], allowedMethods: ["GET"] }]`的插件
2. 通过 Command Bus 发起 `system.http.request` 调用，`url: "https://api.example.com/data"`
3. 验证返回 `{ status, body, headers, finalUrl, redirectCount }`
4. 验证 governanceAudits 表中存在 `decision: "allowed"` 记录
**预期:** 调用成功，返回响应数据，audit 写入
**为什么需要人工验证:** 完整端到端流程需要运行的 Next.js 服务器 + 数据库 + PluginRegistrations 表中有记录 + undici 可进行实际 DNS lookup 和网络请求。grep 可确认代码路径但无法端到端运行。

#### 3. 端到端：拒绝场景验证

**测试:** 
1. 发起调用到不在 whitelist 中的 domain → 确认返回 `domain_not_allowed` deny audit
2. 发起调用到 matched domain 但不允许的 method → 确认返回 `method_not_allowed` deny audit
3. 发起 `http://` 调用 → 确认 `SSRF_HTTPS_REQUIRED` 抛出
4. 发起调用到 redirect chain 到非 whitelist domain → 确认 `domain_not_allowed` deny audit
**预期:** 所有 deny 场景均在 throw 前写入 audit 记录
**为什么需要人工验证:** 需要运行中的 Command Bus 管道来端到端测试这些场景

### 差距总结

Phase 78 的 5 个可观察真相全部验证通过。核心代码（ssrf-guard.ts, audit.ts, handler.ts, registry.ts）完整性高，关键链路（DNS pinning, manifest re-parse, per-hop redirect re-validation, header allowlist filtering, audit-then-throw）全部正确接线。

一个次要差距：handler.ts 中使用的 `redirect_denied`, `response_size_exceeded`, `timeout` 三个拒因码未追加到 `GovernanceDeniedReasonValues` 枚举（permissions.ts）。这不影响功能（Drizzle text 列接受任意字符串），但类型安全不足。建议在权限定义中追加这些枚举值。

undici 未安装到 node_modules 阻止了测试运行——需要 `pnpm install`。package.json 中已正确声明 `"undici": "^8.4.1"`。

---

_已验证: 2026-06-12T10:00:00Z_
_验证者: Claude (gsd-verifier)_
