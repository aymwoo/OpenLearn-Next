---
phase: 78-system-http-request-http
plan: 02
type: execute
tags: [system.http.request, ssrf, http-proxy, governance-audit, dns-pinning, header-allowlist]
requires: [78-01]
provides: [system.http.request authorize + execute, registry wiring]
affects: [platformCommandRegistry]
subsystem: platform-core/commands
tech-stack:
  added: [undici ^8.4.1]
  patterns: [DNS pinning via connect.lookup, audit-then-throw, per-hop manifest re-validation, header allowlist filtering, resolve4+resolve6 dual-stack]
key-files:
  created: [src/features/system-commands/handler.ts, src/features/system-commands/handler.test.ts]
  merged_from_78-01: [src/features/system-commands/ssrf-guard.ts, src/features/system-commands/ssrf-guard.test.ts, src/features/system-commands/audit.ts, src/features/system-commands/audit.test.ts]
  modified: [src/features/platform-core/commands/registry.ts, package.json, pnpm-lock.yaml]
decisions:
  - "[78-02] authorize() returns MatchedHttpRequestEntry to enable per-hop manifest re-validation in execute()"
  - "[78-02] authorize() type mismatch resolved by wrapping in void-returning lambda at registry layer"
  - "[78-02] handler.ts is a single-file module containing both authorize, execute, and all helper functions (matchDomain, filterHeaders, executeRequest)"
  - "[78-02] 78-01 prerequisites (ssrf-guard, audit, undici install) executed inline since 78-01 had not been run"
duration: 482s
completed_date: 2026-06-12
---

# Phase 78 Plan 02: handler.ts + registry wiring 总结

**一行总结:** 实现 system.http.request 的 authorize（manifest 白名单校验）+ execute（SSRF 安全 HTTP 代理）并接入 platformCommandRegistry，替换 Phase 77 的 stub 占位符。

## 任务完成情况

| 任务 | 名称 | 提交 | 文件 |
|------|------|------|------|
| 前置 | 安装 undici 依赖 | `ffd9b3f` | package.json, pnpm-lock.yaml |
| 前置 (78-01 T1) | ssrf-guard.ts RED 测试 | `ee56547` | ssrf-guard.test.ts |
| 前置 (78-01 T1) | ssrf-guard.ts GREEN 实现 | `fdbc9de` | ssrf-guard.ts |
| 前置 (78-01 T2) | audit.ts RED 测试 | `c182e76` | audit.test.ts |
| 前置 (78-01 T2) | audit.ts GREEN 实现 | `50a7abf` | audit.ts |
| 1 | handler.ts authorize RED 测试 | `e9365b9` | handler.test.ts |
| 1+2 | handler.ts authorize+execute GREEN 实现 | `9d51322` | handler.ts |
| 3 | registry.ts 接入 | `2cc27df` | registry.ts |

## 关键决策

1. **78-01 前置产物合并执行**: 78-02 depends_on 78-01，但 78-01 尚未执行。本计划在执行 78-02 的任务前先创建了 78-01 所需的 ssrf-guard.ts、audit.ts 并安装了 undici 依赖。

2. **authorize 返回值类型**: authorize 返回 `MatchedHttpRequestEntry`（含 allowedDomains/allowedMethods），使 execute 可在每次 redirect hop 上重新验证。registry 层通过 `async (input) => { await handler.authorize(input); }` 包裹以适配 `Promise<void>` 签名。

3. **单文件 handler.ts**: authorize、execute、matchDomain、filterHeaders、executeRequest 都在 handler.ts 中，避免过度拆分。

## 实现亮点

- **D-04**: authorize 每次调用重新查询 `pluginRegistrations.manifestJson`，用 `PluginManifestSchema.parse` 解析
- **D-05**: First-match-wins——遍历 manifest 中 `system.http.request` 条目，首条域名+方法匹配即通过
- **D-06**: 严格单级子域名通配符——`*.example.com` 匹配 `api.example.com`，拒绝 `a.b.example.com` 和裸 `example.com`
- **D-10**: 手动 redirect 循环（`redirect: "manual"`），每跳重新验证：manifest allowedDomains+allowedMethods + SSRF (validateUrl + createPinnedAgent)
- **D-11**: 每次执行创建新 undici Agent，通过 `connect.lookup` 回调进行 IPv4+IPv6 双栈 DNS pinning
- **D-13**: 流式响应体累积，超 5MB 时 `reader.cancel("RESPONSE_SIZE_EXCEEDED")` 
- **Header allowlist**: 请求/响应头均通过 `filterHeaders()` 过滤：ALLOW Authorization, Content-Type, Accept, User-Agent, X-*（排除 X-Forwarded-*, X-Real-IP）；BLOCK Host, Cookie, Proxy-Authorization
- **Audit-then-throw**: 所有拒绝路径均在抛出异常前写入 governance audit 记录

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 78-01 前置未执行**
- **发现于:** 执行开始
- **问题:** 78-02 依赖 78-01 的产物 (ssrf-guard.ts, audit.ts, undici)，但 78-01-SUMMARY.md 不存在
- **修复:** 内联执行 78-01 的 3 个任务（undici 安装、ssrf-guard、audit）
- **文件修改:** ssrf-guard.ts, ssrf-guard.test.ts, audit.ts, audit.test.ts, package.json, pnpm-lock.yaml
- **提交:** ffd9b3f, ee56547, fdbc9de, c182e76, 50a7abf

**2. [Rule 1 - Bug] `import "server-only"` 导致 vitest 无法加载**
- **发现于:** ssrf-guard.test.ts 首次运行
- **问题:** vitest 不支持 `server-only` 模块导入
- **修复:** 在测试文件顶部添加 `vi.mock("server-only", () => ({}))`
- **文件修改:** ssrf-guard.test.ts, audit.test.ts, handler.test.ts

**3. [Rule 1 - Bug] vi.mock 变量提升问题**
- **发现于:** handler.test.ts 首次运行
- **问题:** `mockFindFirst` 和 `mockWriteAudit` 在 vi.mock 工厂中不可用（hoisted 执行顺序）
- **修复:** 使用 `vi.hoisted()` 包裹 mock 变量声明
- **文件修改:** handler.test.ts

**4. [Rule 1 - Bug] registry.ts authorize 类型不兼容**
- **发现于:** tsc --noEmit
- **问题:** authorize 返回 `Promise<MatchedHttpRequestEntry>` 但 `PlatformCommandDefinition.authorize` 要求 `Promise<void>`
- **修复:** registry 中用 async wrapper `await handler.authorize(input)` 丢弃返回值
- **文件修改:** registry.ts

**5. [Rule 1 - Bug] audit.ts 枚举类型不匹配**
- **发现于:** tsc --noEmit
- **问题:** `actorScope` 和 `lifecycleState` 是 Drizzle schema 枚举类型，字符串字面量不兼容
- **修复:** 使用 `as const` 和类型断言
- **文件修改:** audit.ts

**6. [Rule 1 - Bug] handler.test.ts buildCommand 类型不兼容**
- **发现于:** tsc --noEmit
- **问题:** 测试助手的命令对象与 PlatformCommand discriminated union 不兼容
- **修复:** buildCommand 返回类型改为 `any`，调用 authorize 时使用 `command as any`
- **文件修改:** handler.test.ts

## Threat Flags

无新增威胁面——所有威胁已在计划威胁模型中覆盖（T-78-12 至 T-78-24）。

## Known Stubs

无已知存根——所有功能完整实现。

## 测试覆盖

- ssrf-guard.test.ts: 38 测试（HTTPS-only, IP 检测, 私有 IP 范围, DNS pinning）
- audit.test.ts: 6 测试（allow/deny 审计写入, 字段映射）
- handler.test.ts: 12 测试（authorize 白名单校验, 通配符匹配, first-match-wins, audit-before-throw）
- **总计: 56 测试全部通过**

## 验证清单

- [x] `npx vitest run src/features/system-commands/*.test.ts` 全部通过 (56/56)
- [x] `npx tsc --noEmit` 中 system-commands 和 registry 文件无类型错误
- [x] `satisfies Record<PlatformCommandType, PlatformCommandDefinition>` 检查通过
- [x] `TODO Phase 78` 不在 registry.ts 中
- [x] `systemHttpRequestHandler` 在 registry.ts 中被导入
- [x] `import "server-only"` 在 handler.ts、ssrf-guard.ts、audit.ts 中存在
- [x] `filterHeaders`、`ALLOWED_HEADER_NAMES`、`BLOCKED_X_HEADER_PREFIXES` 在 handler.ts 中存在
- [x] `x-forwarded-`、`x-real-ip` 在 handler.ts 中作为保留前缀被引用

## Self-Check

- [x] handler.ts 存在: `src/features/system-commands/handler.ts`
- [x] ssrf-guard.ts 存在: `src/features/system-commands/ssrf-guard.ts`
- [x] audit.ts 存在: `src/features/system-commands/audit.ts`
- [x] registry.ts 已修改: `src/features/platform-core/commands/registry.ts`
- [x] 所有提交已验证: `ffd9b3f`, `ee56547`, `fdbc9de`, `c182e76`, `50a7abf`, `e9365b9`, `9d51322`, `2cc27df`
- [x] SUMMARY.md 已创建: `.planning/phases/78-system-http-request-http/78-02-SUMMARY.md`
