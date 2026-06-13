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
- ✅ **v4.3** — System Commands Bus（第一批）(Phases 77-79, shipped 2026-06-12) → [archive](milestones/v4.3-ROADMAP.md)
- 🚧 **v4.4** — System Commands Bus（第二批）(Phases 80-81, in progress)

## Phases

<details>
<summary>✅ v4.3 System Commands Bus（第一批）(Phases 77-79) — SHIPPED 2026-06-12</summary>

- [x] Phase 77: Manifest 声明 + Command Registry 注册 (2/2 plans) (completed 2026-06-11)
- [x] Phase 78: system.http.request HTTP 代理 (2/2 plans) (completed 2026-06-12)
- [x] Phase 79: system.config KV 配置 + dispatchSystemCommand facade (2/2 plans) (completed 2026-06-12)

</details>

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

### 🚧 v4.4 System Commands Bus（第二批）(In Progress)

**Milestone Goal:** 扩展 system.* 命令组，新增 `system.file`（文件存储代理）和 `system.notification`（应用内通知推送）两个系统命令，复用 v4.3 三段式链路。

### Phase 80: system.file 文件存储代理
**Goal**: 插件可通过 `system.file.*` 命令安全地进行文件存储与管理，文件以内容寻址（SHA-256）存储于本地文件系统，元数据写入 SQLite，插件+学校双重隔离，全链路治理审计
**Depends on**: Phase 79（v4.3 dispatchSystemCommand facade + assertActionExecutable 治理门）
**Requirements**: FILE-01, FILE-02, FILE-03, FILE-04, FILE-05, FILE-06, FILE-07, FILE-08, FILE-09
**Success Criteria** (what must be TRUE):
  1. 插件可通过 API Route 上传文件，文件以 SHA-256 内容寻址存储，元数据写入 pluginFiles 表，Command Bus 只传元数据引用（二进制不进 envelope）
  2. 插件可通过独立 API Route 流式下载文件，支持 Range 请求和正确的 Content-Type/Content-Disposition 头
  3. 插件可删除文件（标记 isLatest=false）并列出/查询自身文件（按前缀过滤、分页、元数据）
  4. 文件存储以 `{schoolId}/{pluginKey}` 双重前缀物理隔离，跨插件/跨校访问被拒绝
  5. manifest 声明白名单生效：安装时声明 allowedPaths + allowedOperations，runtime 逐请求匹配路径前缀；路径穿越防护覆盖 URL 编码变体和 parent reference；单文件 50MB + 每插件每校总容量配额生效
**Plans**: TBD
**UI hint**: yes

### Phase 81: system.notification 应用内通知推送
**Goal**: 插件可通过 `system.notification.*` 命令向指定用户推送应用内通知，用户可查看通知列表、标记已读、查看未读计数，全链路治理审计，复用 v4.3 三段式链路
**Depends on**: Phase 80
**Requirements**: NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05, NOTIF-06, NOTIF-07, NOTIF-08, SYS-06
**Success Criteria** (what must be TRUE):
  1. 插件可通过 `system.notification.send` 向指定用户发送通知，走完整 Command Bus 路径（治理门 → authorize → execute → audit），manifest 声明 notificationTypes 白名单生效
  2. 用户可查看通知列表（分页、倒序），标记单条或全部已读，查看未读计数
  3. 频率限制生效：每插件每分钟 60 条、每用户每小时 30 条上限；recipientUserId 经 schoolId 归属校验防跨校隐私泄漏
  4. 超过 90 天的已读通知自动清理（保留未读通知）
  5. `system.file.*` 和 `system.notification.*` 完整复用 v4.3 三段式链路：manifest 声明 → governance gate（assertActionExecutable）→ audit（writeSystemCommandAudit），Command Bus facade 判别分支扩展正确
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|---------------|--------|-----------|
| 73. Multi-Type Quiz & Live Dashboard | v4.1 | 2/2 | Complete | 2026-06-08 |
| 74. v4.1 Authoritative Close Gate | v4.1 | 5/5 | Complete | 2026-06-09 |
| 75. 第二个 External 插件 + Marketplace 泛化验证 | v4.2 | 6/6 | Complete | 2026-06-11 |
| 76. v4.2 Authoritative Close Gate | v4.2 | 6/6 | Complete | 2026-06-11 |
| 77. Manifest 声明 + Command Registry 注册 | v4.3 | 2/2 | Complete | 2026-06-11 |
| 78. system.http.request HTTP 代理 | v4.3 | 2/2 | Complete | 2026-06-12 |
| 79. system.config KV 配置 + dispatchSystemCommand facade | v4.3 | 2/2 | Complete | 2026-06-12 |
| 80. system.file 文件存储代理 | v4.4 | 0/0 | Not started | - |
| 81. system.notification 应用内通知推送 | v4.4 | 0/0 | Not started | - |

---

_For current project status and next milestone planning, see `.planning/PROJECT.md`_
