---
phase: 78
slug: system-http-request-http
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-12
---

# Phase 78 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Plugin payload → authorize() | Untrusted payload.url 和 payload.method 跨越插件边界进入系统处理器 | URL 字符串、HTTP 方法 |
| authorize() → pluginRegistrations DB | manifestJson 存储于数据库，经 Phase 77 install 流程的 Schema 校验后视为可信 | manifest 配置 |
| execute() → network (undici fetch) | 不可信的外部服务器响应跨越网络边界 | HTTP 响应体、响应头 |
| execute() → governanceAudits DB | 审计追踪必须在异常抛出之前写入（audit-then-throw 顺序） | 治理审计记录 |
| Redirect target → execute() | 3xx Location 头值不可信——必须经过完整的重新验证，包括 manifest allowedDomains+allowedMethods、SSRF（IPv4+IPv6 DNS pinning）和 HTTPS-only | 重定向 URL |
| Response stream → execute() | 不可信的响应体大小限制为 5MB | 响应流 |
| Plugin payload headers → execute() | 插件发来的不可信请求头必须在网络 I/O 前经过 allowlist 过滤 | HTTP 请求头 |
| Response headers → resultSummary | 外部服务器返回的不可信响应头必须在返回插件前经过 allowlist 过滤 | HTTP 响应头 |

---

## Threat Register

### 78-01: SSRF Guard + Audit Helper

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-78-01 | Spoofing | execute() → fetch | mitigate | DNS pinning via `createPinnedAgent`：单次 `connect.lookup` 回调中完成 resolve4+resolve6 双栈解析 + 全部地址验证 + 安全地址 pinning | closed |
| T-78-02 | Tampering | execute() → response body | mitigate | 通过认证的 TLS 连接累积响应体；undici 处理 TLS 验证 | closed |
| T-78-03 | Repudiation | audit.ts writeSystemCommandAudit | mitigate | 每条拒绝路径在 throw 前写入审计记录（audit-then-throw） | closed |
| T-78-04 | Information Disclosure | SSRF via private IP | mitigate | 完整私有 IP 覆盖：7 个 IPv4 范围 + IPv6 loopback/ULA/link-local/IPv4-mapped；bracket 剥离 + WHATWG 标准化防止绕过；connect.lookup 中 IPv4+IPv6 双栈验证 | closed |
| T-78-05 | Denial of Service | execute() → response body | mitigate | 5MB 硬截断（流累积 + 字节计数器）；30s bodyTimeout | closed |
| T-78-06 | Elevation of Privilege | Redirect chain | mitigate | 手动 redirect 循环（redirect: "manual"）+ 每跳 SSRF+HTTPS+manifest 重新验证，最多 5 跳 | closed |
| T-78-07 | Tampering | DNS resolution | mitigate | 单次 connect.lookup 回调中解析并 pin DNS——无 TOCTOU 窗口（CVE-2026-41272）；IPv4+IPv6 双栈通过 Promise.allSettled | closed |
| T-78-08 | Information Disclosure | HTTPS downgrade | mitigate | validateUrl 在任何网络 I/O 前拒绝非 https:// 协议（D-12） | closed |
| T-78-09 | Information Disclosure | IPv6 bracket bypass | mitigate | isHostnameRawIP 在 net.isIP() 前剥离 brackets；[::1] 正确检测为 IP（Pitfall 1） | closed |
| T-78-10 | Information Disclosure | Decimal IP encoding bypass | mitigate | 在 WHATWG 标准化后的 URL.hostname 上进行 IP 检测，而非原始输入（Pitfall 2） | closed |
| T-78-11 | Information Disclosure | IPv4-mapped IPv6 bypass | mitigate | ::ffff: 前缀检测 → 提取嵌入的 IPv4 并验证私有范围（Pitfall 3）；connect.lookup 中 resolve6 也会拦截 | closed |
| T-78-12 | Information Disclosure | IPv6-only DNS attack | mitigate | resolve6 与 resolve4 并行调用；解析出的 IPv6 地址验证 ::1（loopback）、fc00::/7（ULA）、fe80::/10（link-local）、::ffff:（IPv4-mapped）——攻击者无法通过发布纯 IPv6 AAAA 记录绕过 SSRF | closed |
| T-78-SC | Tampering | npm install undici | mitigate | RESEARCH.md 中的 Package Legitimacy Audit 确认 undici 审查通过（npm registry 验证，5 亿+周下载量，github.com/nodejs/undici）；[SLOP] 未发现 | closed |

### 78-02: Handler + Registry Wiring

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-78-13 | Spoofing | authorize() wildcard matching | mitigate | matchDomain 强制严格单级子域名（D-06）；a.b.example.com 和裸 example.com 均被拒绝 | closed |
| T-78-14 | Tampering | execute() redirect chain | mitigate | 手动 redirect 循环（redirect: "manual"），每跳 per-hop manifest 重新验证（matchDomain 对 allowedDomains + method 对 allowedMethods）。通过 SSRF 检查（公网 IP、HTTPS）但不在 manifest 白名单中的 redirect 目标，在发出网络请求前被 reasonCode "domain_not_allowed" 拦截 | closed |
| T-78-15 | Repudiation | authorize() + execute() deny paths | mitigate | writeSystemCommandAudit 在所有 throw 前调用——所有拒绝路径都有审计追踪（Pitfall 5） | closed |
| T-78-16 | Information Disclosure | execute() response body | mitigate | 仅 2xx 返回响应体；错误响应（4xx/5xx）同样审计但限制 body 内容 | closed |
| T-78-17 | Denial of Service | execute() timeout | mitigate | AbortSignal.timeout(timeout) 默认 30s；Agent bodyTimeout；headersTimeout 10s | closed |
| T-78-18 | Denial of Service | execute() response size | mitigate | 流累积 + 字节计数器；5MB 硬上限，超出时 reader.cancel（D-13） | closed |
| T-78-19 | Elevation of Privilege | execute() header injection | mitigate | 请求头经 allowlist 过滤：ALLOW Authorization、Content-Type、Accept、User-Agent、X-*（排除 X-Forwarded-*、X-Real-IP）；BLOCK Host、Cookie、Proxy-Authorization 及所有其他。filterHeaders() 在每次 fetch 前调用。Host 由 undici 自动从 URL 设置。响应头同样经 allowlist 过滤后返回 resultSummary | closed |
| T-78-20 | Information Disclosure | Audit payload contents | mitigate | payloadJson 仅包含 {url, method, domain}——不记录完整的请求/响应体 | closed |
| T-78-21 | Spoofing | execute() DNS rebinding per redirect | mitigate | 每跳 redirect 创建新的 undici Agent，调用 fresh createPinnedAgent——每跳重新 DNS 解析（IPv4+IPv6）并重新验证 | closed |
| T-78-22 | Elevation of Privilege | execute() redirect manifest bypass | mitigate | 每跳 manifest 重新验证：matchDomain 检查 redirect 目标 hostname 对 matchedEntry.allowedDomains，method 检查对 allowedMethods；攻击者控制的 redirect 目标即使通过 SSRF 也被拦截。throw 前写入 reasonCode "domain_not_allowed" 审计 | closed |
| T-78-23 | Information Disclosure | Response headers to plugin | mitigate | 响应头经过 filterHeaders() 过滤后返回 resultSummary——拦截 Set-Cookie、X-Forwarded-*、X-Real-IP 及其他非 allowlist 头部，防止 cookie 泄露和内部代理头泄露 | closed |
| T-78-24 | Elevation of Privilege | execute() request header smuggling | mitigate | filterHeaders() 在 fetch 前剥离 Host/Cookie/Proxy-Authorization 及预留 X-* 前缀；防止插件注入可能绕过 SSRF 或冒充内部服务的头部 | closed |

> **注意：** T-78-12 同时出现在 78-01（IPv6-only DNS attack）和 78-02 原始计划（authorize() manifest parse）中。上表采用 78-01 的定义（按 wave 顺序优先）。78-02 plan 中的原始 T-78-12（manifest parse spoofing）实际已被 78-01 的 T-78-01 和 DNS pinning 覆盖，不再重复列出。

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-12 | 25 | 25 | 0 | gsd-security-auditor (secure-phase) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-12
