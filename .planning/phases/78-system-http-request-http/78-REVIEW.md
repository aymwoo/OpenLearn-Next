---
phase: 78-system-http-request-http
reviewed: 2026-06-12T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/features/system-commands/ssrf-guard.ts
  - src/features/system-commands/ssrf-guard.test.ts
  - src/features/system-commands/audit.ts
  - src/features/system-commands/audit.test.ts
  - src/features/system-commands/handler.ts
  - src/features/system-commands/handler.test.ts
  - src/features/platform-core/commands/registry.ts
findings:
  critical: 2
  warning: 4
  info: 5
  total: 11
status: issues_found
---

# Phase 78：代码审查报告

**审查时间：** 2026-06-12
**审查深度：** standard
**审查文件数：** 7
**状态：** issues_found

## 概述

审查了 system-commands 模块的 SSRF 防护、审计和 HTTP 代理处理器，以及 platform-core 命令注册表的相关部分。整体架构设计良好 — DNS 绑定 Agent、per-hop 重定向验证、header allowlist 过滤等防御措施都比较到位。但发现了 2 个需要立即修复的拦截级别问题和数个需要关注的警告。

## 拦截级别（Critical）

### CR-01：redirect 重定向时丢弃原始请求 headers，可能导致源站拒收

**文件：** `src/features/system-commands/handler.ts:719-729`
**问题：** 当 `executeRequest` 处理 3xx 重定向时，`filteredRequestHeaders` 被设为 `undefined`，body 也被丢弃。这在 `307 Temporary Redirect` / `308 Permanent Redirect` 场景下是错误的 — 根据 HTTP 规范，这些状态码要求**保留原始方法和请求体**重发给新 URL。当前实现一律将重定向请求降级为 GET 且不带任何 headers，可能破坏依赖身份验证头（如 Authorization）或 POST 重定向的 API 集成。

**修复建议：**
```typescript
// 在 executeRequest 的 3xx 处理部分（约 717 行），不应无条件丢弃 headers 和 body。
// 需要区分 301/302/303（改为 GET，丢弃 body）和 307/308（保留原方法和 body）：
const nextMethod = (response.status === 307 || response.status === 308) ? method : "GET";
const nextHeaders = (response.status === 307 || response.status === 308) ? headers : undefined;
const nextBody = (response.status === 307 || response.status === 308) ? body : undefined;

return executeRequest(
  nextUrl,
  nextMethod,
  nextHeaders,
  nextBody,
  redirectCount + 1,
  matchedEntry,
  command,
  timeout,
  maxSize,
);
```

同时，per-hop 中 `redirectMethod` 的判断逻辑（第 553 行 `const redirectMethod = redirectCount === 0 ? method : "GET"`）也需要同步修改以支持 307/308。

### CR-02：SSRF 防护 — IPv6 地址 `::1` 的 bypass 向量（双冒号表示法的变体未覆盖）

**文件：** `src/features/system-commands/ssrf-guard.ts:132`
**问题：** `isPrivateIP` 中对 IPv6 loopback 的检查使用严格字符串比较 `stripped === "::1"`。但 IPv6 还有其他合法的 loopback 表示形式，如 `0:0:0:0:0:0:0:1`（展开形式）、`::0:1` 等。如果攻击者能够以展开形式（绕过 DNS 解析的外部 hostname）传入 `0:0:0:0:0:0:0:1`，则 `::1` 的严格检查会失败，从而绕过 loopback 封锁。虽然 Node.js 的 `net.isIP()` 会认可 `0:0:0:0:0:0:0:1` 为有效 IPv6（family 6），但后续的 `=== "::1"` 检查无法匹配展开形式。

**修复建议：**
```typescript
if (family === 6) {
  // IPv6 loopback — 使用标准化比较而非字符串精确匹配
  // ::1 在 in6_addr 中对应的 16 字节为 [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1]
  if (stripped === "::1" || stripped === "0:0:0:0:0:0:0:1") return true;
  // 或者更彻底：使用 IP 到字节的转换做标准化比较
  // ...
}
```

更彻底的方案是使用 `dns.promises.lookup` 或 `net.isIPv6` 配合标准化，但当前环境不建议引入重依赖。至少在展开形式 `0:0:0:0:0:0:0:1` 上加一行检查可以堵塞最常见的 bypass。

## 警告（Warning）

### WR-01：error reason code 映射中存在未覆盖的代码分支

**文件：** `src/features/system-commands/handler.ts:421-431`
**问题：** `execute` 函数的 catch 块中，SSRF 错误消息以 `SSRF_` 开头被映射为 `private_ip_blocked`（422 行）。但检查 `createPinnedAgent` 抛出的错误：`SSRF_PRIVATE_IP_BLOCKED` — 是的，以 `SSRF_` 开头。但 `validateUrl` 抛出的错误如 `SSRF_HTTPS_REQUIRED` 和 `SSRF_NO_HOSTNAME` 也以 `SSRF_` 开头，同样会被映射为 `private_ip_blocked`。HTTPS 要求不符或空主机名被标记为"私有 IP 被封锁"在审计日志中是误导性的，会影响后续的故障排查和安全审计。

**修复建议：**
```typescript
if (message.startsWith("SSRF_PRIVATE_IP_BLOCKED")) {
  reasonCode = "private_ip_blocked";
} else if (message.startsWith("SSRF_HTTPS_REQUIRED") || message.startsWith("SSRF_NO_HOSTNAME")) {
  reasonCode = "domain_not_allowed";
} else if (message.includes("RESPONSE_SIZE_EXCEEDED")) {
  // ...
```

注意第 423 行 `message.startsWith("HTTPS_REQUIRED")` 永远不会被触发，因为 `validateUrl` 抛出 `"SSRF_HTTPS_REQUIRED"`（带 `SSRF_` 前缀）。该分支是死代码。

### WR-02：`executeRequest` 中 URL 构建可能丢失路径信息

**文件：** `src/features/system-commands/handler.ts:717`
**问题：** `new URL(location, currentUrl).href` — 当 `location` 是相对路径（如 `/new-path`）时，`new URL` 能正确解析。但 URL 的 `href` getter 会将百分比编码的字符保持编码状态，而 `currentUrl` 本身可能已经被部分解码。这不一定是 bug，但在某些边缘情况下（如重定向 URL 包含非 ASCII 字符的不同编码格式）可能导致路径不一致。建议添加防御性日志或直接使用 `new URL(location, currentUrl).toString()`（与 `.href` 等效），并确认 `location` header 的有效性。

### WR-03：`ip4ToInt` 对畸形输入最多产生 0，但不会报错

**文件：** `src/features/system-commands/ssrf-guard.ts:32-38`
**问题：** `ip4ToInt` 对 `"not.an.ip.address"` 这样的输入，`Number.parseInt("not", 10)` 返回 `NaN`，然后 `NaN << 8` 返回 `0`，最终 `>>> 0` 也返回 `0`。`0` 对应的 IP 是 `0.0.0.0`，而 `0.0.0.0/8` 在 `PRIVATE_IPV4_RANGES` 的第一个范围内（`0x00000000 - 0x00ffffff`），且 `isPrivateIPv4` 只在 `isIP(ip) === 4` 时才调用 `ip4ToInt`，所以实际不会造成误判。但函数本身缺乏防御性 — 如果未来有其他调用方在不经 `isIP` 检查的情况下使用它，可能产生错误的 true/false 结果。建议在函数内添加输入验证。

### WR-04：`createPinnedAgent` DNS 解析错误被暴露为 callback error，可能导致未捕获异常

**文件：** `src/features/system-commands/ssrf-guard.ts:256-258`
**问题：** `.catch((err: Error) => { callback(err, null, 0); })` — 当 `dns.resolve4` 或 `dns.resolve6` 抛出非 Error 对象（如 Promise rejection 传入字符串）时，`err` 类型为 `Error` 但实际值可能不是。虽然 `.catch` 的类型标注为 `Error`，但 JavaScript 不强制类型。这不是一个实际的安全漏洞，但增强类型安全可以防止潜在的问题。可以添加 `err instanceof Error ? err : new Error(String(err))` 确保 `callback` 第一个参数始终是 Error 实例。

## 信息（Info）

### IN-01：未使用的类型导入

**文件：** `src/features/system-commands/handler.ts:14`
**问题：** `import type { SystemCommandHttpRequestSchema } from "@/lib/dto/resource-ai";` — 该类型导入在 handler.ts 中从未被使用。它是一个 Zod schema 类型（通过 `z.infer`），但在 handler 中没有引用。应移除以减少导入噪音。

### IN-02：`filterHeaders` 中允许任意 `X-*` 头可能导致信息泄漏

**文件：** `src/features/system-commands/handler.ts:63`
**问题：** `lowerKey.startsWith("x-")` 允许所有非保留的 `X-*` 自定义头通过。虽然显式阻止了 `x-forwarded-*` 和 `x-real-ip`，但攻击者可以添加如 `x-internal-token`、`x-debug-info` 等潜在敏感头。这属于防御性设计建议而非 bug — 当前实现符合设计文档的要求，但建议在文档中注明所有 `X-*` 头均透传的风险。

### IN-03：测试中 hostname DNS 测试覆盖不足

**文件：** `src/features/system-commands/handler.test.ts`
**问题：** 测试文件对 `execute` 函数（hostname DNS 路径）的测试均被 mock 覆盖（ssrf-guard mock 返回 `createPinnedAgent: () => ({ closed: false })`），但未测试 DNS 解析回调中的 `SSRF_PRIVATE_IP_BLOCKED` 或 `SSRF_DNS_NO_ADDRESS` 分支。这不是测试文件的问题（per 审查规则不报告测试缺陷），但建议补充集成测试覆盖这些关键安全路径。

### IN-04：`audit.ts` 中 `payloadJson` 的类型为 `Record<string, unknown>` 没有 schema 验证

**文件：** `src/features/system-commands/audit.ts:16`
**问题：** `payloadJson: Record<string, unknown>` — audit 函数接受任意形状的 payload，没有运行时 schema 验证。调用方（handler.ts）传入的对象形状不一致（成功时有 `url, method, domain`，失败时有 `url, method, error`）。虽然 Zod schema 验证在审计函数中可能过重，但至少应通过 JSDoc 或类型约束明确 payload 的预期形状。

### IN-05：`executeRequest` 中响应的 `Content-Type` 未被用于选择正确的解码器

**文件：** `src/features/system-commands/handler.ts:764`
**问题：** `new TextDecoder("utf-8").decode(combined)` — 不论服务器返回什么 `Content-Type`，响应体始终用 UTF-8 解码。如果服务器返回 `text/html; charset=gb2312` 或二进制内容（`image/png`），解码结果将是乱码或损坏的数据。建议根据响应 `Content-Type` 选择正确的解码器，或在返回结果中包含原始的 `Content-Type` 头以便调用方自行处理。

---

_审查时间：2026-06-12_
_审查者：Claude (gsd-code-reviewer)_
_审查深度：standard_
