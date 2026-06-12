# Roadmap: OpenLearn Next

## Milestones

- ✅ **v1.3** — Teaching Orchestration & Classroom Intelligence (Phases 21-26, shipped 2026-05-15)
- ✅ **v2.0** — Runtime Platform Foundations (Phases 27-32, shipped 2026-05-17)
- ✅ **v2.1** — Safety Closure and Course Membership Loop (Phases 33-35, shipped 2026-05-17)
- ✅ **v2.2** — WebSocket Classroom Transport Cutover (Phases 36-38, shipped 2026-05-18)
- ✅ **v2.3** — Async Task Platform (Phases 39-43, shipped 2026-05-20)
- ✅ **v3.0** — AI Native Educational OS Upgrade (Phases 50-54, shipped 2026-05-23)
- ✅ **v3.1** — Single-School Pilot Production Readiness (Phases 55-60 + 60.1/60.2, shipped 2026-05-30)
- ✅ **v3.2** — AI LessonAgent 起草闭环 (Phases 61-66, shipped 2026-06-02)
- ✅ **v4.0** — Plugin Marketplace & Plugin-Owned Data (Phases 67-72 + 72.1, shipped 2026-06-07)
- ✅ **v4.1** — Multi-Question Types & Teacher Live Dashboard (Phases 73-74, shipped 2026-06-09) → [archive](milestones/v4.1-ROADMAP.md)
- ✅ **v4.2** — Marketplace 泛化验证 (Phases 75-76, shipped 2026-06-11) → [archive](milestones/v4.2-ROADMAP.md)
- 🚧 **v4.3** — System Commands Bus（第一批）(Phases 77-79, defining)

## Phases

<details>
<summary>✅ v4.2 Marketplace 泛化验证 (Phases 75-76) — SHIPPED 2026-06-11</summary>

- [x] Phase 75: 第二个 External 插件 + Marketplace 泛化验证 (6/6 plans) (completed 2026-06-11)
- [x] Phase 76: v4.2 Authoritative Close Gate (6 plans)

Plans:

- [x] 76-01-PLAN.md — Gate skeleton + alias target declaration (6-stage outer gate)
- [x] 76-02-PLAN.md — Stage 1+2 wiring: v4.0 gate regression + v4.1 quiz verification
- [x] 76-03-PLAN.md — Stage 3 wiring: Phase 75 homework full-chain verification
- [x] 76-04-PLAN.md — Stage 4: cross-plugin regression (verify:v42-cross-plugin)
- [x] 76-05-PLAN.md — Stage 5: formal verification + proof mapping
- [x] 76-06-PLAN.md — Stage 6: manual sign-off + closeout artifacts + audit + alias cutover

</details>

<details>
<summary>✅ v4.1 Multi-Question Types & Teacher Live Dashboard (Phases 73-74) — SHIPPED 2026-06-09</summary>

- [x] Phase 73: Multi-Type Quiz & Live Dashboard (2/2 plans) — completed 2026-06-08
- [x] Phase 74: v4.1 Authoritative Close Gate (5/5 plans) — completed 2026-06-09

</details>

<details>
<summary>✅ v4.0 Plugin Marketplace & Plugin-Owned Data (Phases 67-72.1) — SHIPPED 2026-06-07</summary>

- [x] Phase 67: Declarative Plugin Data Model (3/3 plans) — completed
- [x] Phase 68: Governed Data Access Verbs (5/5 plans) — completed
- [x] Phase 69: Quiz Sample Plugin (5/5 plans) — completed
- [x] Phase 70: Quiz Stats & Recap (1/1 plan) — completed
- [x] Phase 71: Marketplace Lifecycle (5/5 plans) — completed
- [x] Phase 72: End-to-End Close Gate (3/3 plans) — completed
- [x] Phase 72.1: Authoritative Close Gate Closure (3/3 plans) — completed 2026-06-07

</details>

<details>
<summary>✅ Earlier Milestones (v1.3—v3.2)</summary>

See `.planning/milestones/` for full archives.

</details>

### 🚧 v4.3 System Commands Bus（第一批）

**Milestone Goal:** 在现有 Command Bus 骨架上新增 `system.*` 命令组，让插件经声明式白名单调用系统级能力，首发 `system.http.request`（HTTP 代理）和 `system.config`（KV 配置）两个命令，打穿 manifest 声明 → governance gate → execute → audit 完整链路。

- [x] **Phase 77: Manifest 声明 + Command Registry 注册** - `PluginManifest` 支持 `systemCommands` 声明段 + `platformCommandRegistry` 新增 system command 类型 (completed 2026-06-11)
- [x] **Phase 78: system.http.request HTTP 代理** - 插件经白名单域名+方法代理 HTTP 调用，含 SSRF 防护、响应大小限制、超时控制 (completed 2026-06-12)
- [x] **Phase 79: system.config KV 配置 + dispatchSystemCommand facade** - 插件读/写自身 KV 配置 + 统一入口门面 (completed 2026-06-12)

### Phase 77: Manifest 声明 + Command Registry 注册

**Goal**: 插件可在 manifest 中声明所需 system 命令，install 时校验声明合法性；`platformCommandRegistry` 具备 `system.*` 命令类型的注册能力，governance audit 覆盖 system command denials。

**Depends on**: v4.2 baseline（Phase 76 complete）

**Requirements**: SYS-03, SYS-05

**Success Criteria** (what must be TRUE):

  1. `PluginManifest` 的 Zod schema 支持 `.optional()` 的 `systemCommands` 声明段，`system.http.request` 和 `system.config` 各有专用 shape 校验，不合法声明在 install preflight 时被拒绝并给出具名拒因
  2. `platformCommandRegistry` 新增 2 个 commandType（`system.http.request` + `system.config.set`），`PlatformCommandTypeSchema` 和 `PlatformCommandSchema` 的 discriminated union 已追加对应变体
  3. governance audit 新增 4 个 reasonCode（`domain_not_allowed` / `method_not_allowed` / `private_ip_blocked` / `config_key_denied`），每次 system command deny 至少产生 1 条 audit 记录
  4. 已有 quiz/homework manifest 全量兼容性扫描通过——`.optional()` 声明段不破既有的 install/upgrade 流程

**Plans**: 2 plans

Plans:

- [x] 77-01-PLAN.md — PluginManifestSchema 扩展 systemCommands 声明段 + 全量兼容性扫描
- [x] 77-02-PLAN.md — platformCommandRegistry 注册 system 命令 + GovernanceDeniedReasonValues 扩展

**UI hint**: yes

### Phase 78: system.http.request HTTP 代理

**Goal**: 插件可通过 `system.http.request` 经 manifest 声明的白名单域名+方法代理 HTTPS 调用，系统在运行时逐请求校验白名单、执行 SSRF 防护并审计。

**Depends on**: Phase 77

**Requirements**: SYS-01

**Success Criteria** (what must be TRUE):

  1. 插件在 manifest 的 `systemCommands.system.http.request` 中声明 `allowedDomains`（支持 `*.example.com` 通配符）和 `allowedMethods`（GET/POST/PUT/DELETE/PATCH），声明在 install preflight 时校验合法性
  2. 插件发起 `system.http.request` 调用时，系统逐请求校验目标域名匹配 `allowedDomains` + 方法匹配 `allowedMethods`，不匹配时拒绝并返回 `domain_not_allowed` / `method_not_allowed` audit
  3. SSRF 防护生效：DNS pinning（undici Agent `connect.lookup`）+ IPv6/IPv4-mapped/十进制编码检测 + redirect 链 re-validate，命中内网 IP 时拒绝并返回 `private_ip_blocked`
  4. 请求强制 HTTPS-only（拒绝 plain HTTP），默认超时 30s，响应体上限 5MB 硬截断
  5. 成功调用返回响应状态码和 body（5MB 内），每次调用至少产生 1 条 governance audit 记录

**Plans**: 2 plans

Plans:
**Wave 1**

- [x] 78-01-PLAN.md — SSRF guard (DNS pinning, IP detection, HTTPS-only) + governance audit helper

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 78-02-PLAN.md — system.http.request handler (authorize manifest whitelist + execute HTTP proxy) + registry wiring

**UI hint**: yes

### Phase 79: system.config KV 配置 + dispatchSystemCommand facade

**Goal**: 插件可通过 `system.config.get/set` 读写自身 KV 配置（三重前缀隔离，不跨插件访问）；`dispatchSystemCommand` facade 作为统一入口，治理门前置，schoolId 由 session 派生。

**Depends on**: Phase 77（可并行于 Phase 78）

**Requirements**: SYS-02, SYS-04

**Success Criteria** (what must be TRUE):

  1. 插件可调用 `system.config.set` 写入自身 KV 配置，key 自动以 `{schoolId}:{pluginId}:{key}` 前缀隔离，key 名含 `:` 时被 Zod 层拒绝，单值上限 64KB
  2. 插件可调用 `system.config.get` 读取自身配置，返回 JSON 值，无权限读取其他插件的 key（跨插件隔离验证通过）
  3. `dispatchSystemCommand` facade 三段式结构生效：治理门（`assertActionExecutable` lifecycle + kill-switch + school scope）→ 判别派发（manifest 白名单 re-parse → 路由到对应 handler）→ 结果返回
  4. 所有 deny 点先写 governance audit 再抛错，schoolId 由认证 session 派生注入、绝不从 payload 读取
  5. `system.config.set` 写经 Command Bus producer → `pluginOwnedBusinessData` upsert，`system.config.get` 纯读走直接 governed DAL

**Plans**: 2 plans

Plans:
**Wave 1**

- [x] 79-01-PLAN.md — 治理门泛化（verb→string）+ audit 参数化 + dispatchSystemCommand facade 入口

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 79-02-PLAN.md — system.config.set/get handler + registry stub 替换 + facade 判别派发补全

**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|---------------|--------|-----------|
| 73. Multi-Type Quiz & Live Dashboard | v4.1 | 2/2 | Complete | 2026-06-08 |
| 74. v4.1 Authoritative Close Gate | v4.1 | 5/5 | Complete | 2026-06-09 |
| 75. 第二个 External 插件 + Marketplace 泛化验证 | v4.2 | 6/6 | Complete | 2026-06-11 |
| 76. v4.2 Authoritative Close Gate | v4.2 | 6/6 | Complete | 2026-06-11 |
| 77. Manifest 声明 + Command Registry 注册 | v4.3 | 2/2 | Complete | 2026-06-11 |
| 78. system.http.request HTTP 代理 | v4.3 | 2/2 | Complete    | 2026-06-12 |
| 79. system.config KV 配置 + dispatchSystemCommand facade | v4.3 | 2/2 | Complete    | 2026-06-12 |

---

_For current project status and next milestone planning, see `.planning/PROJECT.md`_
