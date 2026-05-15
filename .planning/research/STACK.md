# Stack Research Memo — v2.0 Runtime Platform Foundations

**Project:** OpenLearn Next  
**Researched:** 2026-05-15  
**Confidence:** HIGH for adopt-now/defer sequencing, MEDIUM for later PostgreSQL/Redis/WebSocket cutover details until phase-specific validation

## Current Baseline

当前代码库已经不是“纯单体草稿”，而是一个**单 Next.js 16 应用 + 渐进式 feature/server 分层**：

- **Framework/runtime**：`next@16.2.4`、`react@19.2.5`、Turbopack、Node runtime 为主。
- **Auth**：`next-auth@5.0.0-beta.31` + `@auth/drizzle-adapter@1.11.2`。
- **DB**：`drizzle-orm@0.45.2` + `@libsql/client@0.17.3`，`drizzle.config.ts` 仍是 `dialect: 'sqlite'`。
- **Repo shape**：仍是**单 app 根目录工程**，但已经有 `src/features/`、`src/server/`；`pnpm-lock.yaml` 和 `pnpm-workspace.yaml` 已存在，说明仓库已具备切向 workspace 的基础，但**还没有真正 monorepo 编排**（无 `turbo.json`，无 `apps/*` / `packages/*` 落地）。
- **Realtime**：当前课堂链路已验证的是 **SSE**，不是 WebSocket。
- **Plugin/runtime safety**：当前已验证的是**声明式 manifest + allowlisted action**，还不是任意运行时插件执行。

**结论：** v2.0 不应同时推翻 Next.js/Auth.js/Drizzle 主干；应该在其上做**仓库结构升级 + Runtime Host 最小链路 + 未来基础设施抽象**。

## Recommended For This Milestone

这部分是 **v2.0 现在就该做** 的。

| Area | Adopt Now | Version / Shape | Why now |
|---|---|---|---|
| Workspace orchestration | **Turborepo** | `turbo@2.9.x` | 官方支持渐进式 monorepo；当前仓库已是 pnpm workspace 雏形，补上任务编排即可开始拆分 apps/packages，而不必先拆所有代码。 |
| Package manager posture | **Continue pnpm** | keep current | 仓库已经是 `pnpm-lock.yaml` + `pnpm-workspace.yaml`；不要在此 milestone 再切 npm/bun。 |
| App topology | **Move toward `apps/web` + `packages/*` + `runtimes/*` + `plugins/*`** | first step only | 这是 V2 架构目标本身；但首步只迁移当前主 app 到 `apps/web`，不要一次拆成多个独立部署。 |
| Core framework | **Keep Next.js App Router** | `next@16.2.x`, `react@19.2.x` | 当前产品已验证；Next 16 官方继续要求 `proxy.ts`、Cache Components、Server Actions 边界。此 milestone 不值得换框架。 |
| Runtime host implementation | **Minimal iframe Runtime Host** | browser iframe + `postMessage` + strict sandbox | 这是 V2 最关键的新能力，而且可在不引入新后端基础设施的情况下落地第一条真实 runtime 链路。 |
| Bridge contract | **TeachingBridge SDK/contract package** | internal package, Zod-validated message schema | 应立即把 runtime 与主站通信从 ad-hoc DOM/props 升级成显式协议，否则后面 iframe/plugin/agent 都会反复重做。 |
| Shared contracts | **Extract internal packages** | `packages/shared-types`, `packages/permissions`, `packages/teaching-bridge`, `packages/runtime-contracts` | 这是 monorepo restructuring 的最低收益点：先抽协议、权限、事件、DTO，不先拆 UI。 |
| Event model | **Introduce typed event envelope + local publisher abstraction** | package + app-local implementation | 现在就定义事件模型，但先用本地实现/SQLite durable log，不强上 Redis。先把“Action → Event”边界立住。 |
| Database adapter posture | **Keep Drizzle + DrizzleAdapter** | keep `drizzle-orm@0.45.x`, `@auth/drizzle-adapter@1.11.x` | Auth.js 官方 Drizzle 适配器本来就支持 SQLite/PostgreSQL；未来换数据库不需要先换 auth stack。 |
| Testing for runtime foundation | **Add cross-package verification** | keep Vitest/Playwright | v2.0 应验证 iframe host、bridge handshake、permission denial、event emission；不需要引入新测试框架。 |

### Recommended immediate repo target

```text
/apps
  /web                # 当前 Next.js 主应用迁入这里

/packages
  /shared-types
  /permissions
  /teaching-bridge
  /runtime-contracts
  /event-core

/runtimes
  /html-courseware    # 最小 runnable runtime 示例

/plugins
  /html-courseware    # manifest + assets + runtime metadata
```

### Milestone-safe technical choices

1. **Runtime Host 先做成 `apps/web` 内的受控宿主页**，不要先起第二个独立服务。  
2. **TeachingBridge 先基于浏览器标准能力**：`postMessage` / `MessageChannel` + origin 校验 + Zod schema。  
3. **事件总线先抽象接口，不先上 Redis Streams**。先做到：`Server Action -> EventPublisher -> durable log/outbox -> consumer hook`。  
4. **数据库继续 SQLite 为 source of truth**，但开始重构出“数据库工厂/方言边界”，为 PostgreSQL 预留切换点。  

## Defer For Later

这部分是 **明确后置**，不要塞进 v2.0 foundation milestone。

| Area | Defer To Later | Recommended later choice | Why defer |
|---|---|---|---|
| Primary DB migration | SQLite → PostgreSQL cutover | `pg@8.20.x` + Drizzle PostgreSQL dialect | 当前项目约束仍是 SQLite-first。runtime foundation 的主要风险不在数据库，而在结构和隔离边界。不要把数据迁移和 runtime host 混在一个 milestone。 |
| Redis-backed queue/event infra | Real Redis bus / workers | `bullmq@5.76.x` + `ioredis@5.10.x` | BullMQ 官方明确依赖 ioredis 和阻塞连接模型，更适合“已有后台 worker”阶段；当前先抽象 bus 接口即可。 |
| Bidirectional realtime | WebSocket gateway | `socket.io@4.8.x` / client `4.8.x` | Socket.IO 的强项是重连、房间、ack、多节点广播；这些是后续协作/多人 runtime 阶段价值更大，不是最小 runtime host 所必需。 |
| Dedicated realtime app | `apps/realtime` or gateway | separate service later | 现在先保住现有 SSE 课堂路径，不要把实时网关、课堂现网和 runtime foundation 一起翻。 |
| AI runtime isolation service | `apps/ai-gateway` / worker runtime | later phase | 当前 milestone 重点是 courseware/plugin runtime，不是 agent 执行平面。 |
| pgvector migration | Qdrant replacement or coexistence | evaluate only after Postgres becomes primary DB | 当前 RAG 边界已围绕 Qdrant 设计；此时切向量栈只会扩大变量面。 |
| Object storage | MinIO rollout | later when runtime assets/uploads require it | 先证明 runtime host 与 bridge；对象存储不是 foundation blocker。 |
| CRDT collaboration | Yjs / collaborative editor | later collaboration milestone | 这是 WebSocket 后的第二层复杂度，不能和 runtime host 首次落地绑定。 |

## Migration Notes

建议按下面顺序推进，避免“重构 + 基础设施迁移 + 实时协议切换”三件事叠加爆炸。

### 1. Repository first, runtime second

先做：

- 引入 `turbo.json`
- 落地 `apps/web`
- 抽 `packages/shared-types` / `packages/permissions` / `packages/teaching-bridge`
- 保持应用行为不变

**理由：** Turborepo 官方支持渐进接入；先把仓库骨架和任务依赖稳定下来，再加 runtime host，调试面最小。

### 2. Minimal Runtime Host inside current web app

在 `apps/web` 内新增：

- runtime host route/page
- iframe sandbox container
- TeachingBridge handshake
- runtime capability allowlist
- one minimal `html-courseware` runtime sample

**目标不是多 runtime 完整平台**，而是先证明：

`Teacher page / Student page -> Runtime Host -> iframe -> TeachingBridge -> host action/event`

### 3. Event abstraction before Redis

现在就定义统一事件：

```text
id / type / actor / scope / payload / createdAt / traceId
```

但实现先用：

- in-process publisher
- SQLite durable event/outbox table
- local consumer hooks for audit / analytics / notifications

**这样做的价值：** 后面切 Redis/BullMQ 时换的是 transport，不是整个业务语义。

### 4. PostgreSQL compatibility prep before PostgreSQL cutover

v2.0 里只做准备动作：

- 把 `src/db/index.ts` 这类“直接绑定 libsql”的入口抽成工厂
- 避免新 runtime/event schema 写死 SQLite-only 假设
- 把 auth/db initialization 保持为可替换驱动，但**继续使用 `@auth/drizzle-adapter`**

**不要在这一步做** 数据双写、全量迁移、线上切库。

### 5. Redis/BullMQ after DB direction is stable

等 PostgreSQL 方向和事件模型稳定后，再引入：

- Redis for queue / event fanout / cross-instance invalidation needs
- BullMQ workers for async runtime processing

否则你会先把系统拆成“多服务 + 多存储”，却还没验证 runtime host 本身是否是对的。

### 6. WebSocket after runtime semantics are real

先保留当前课堂 **SSE**。等出现以下真实需求再切：

- runtime 内双向交互频繁
- presence/rooms 成为核心模型
- 跨节点广播成为实际需求
- 协作编辑/白板进入 roadmap

届时再单独上 Socket.IO gateway，更稳。

## Do Not Do Yet

这些是本 milestone **明确不要做** 的：

1. **不要替换 Next.js / React / Auth.js 主干。** 这不是框架重选 milestone。  
2. **不要把 SQLite、PostgreSQL、Redis、WebSocket 一次性全上。** 这会让任何问题都无法定位。  
3. **不要为 runtime host 提前引入独立微服务群。** 先在 `apps/web` 内跑通最小链路。  
4. **不要把当前 SSE 课堂链路直接改成 WebSocket。** 当前课堂能力已验证，WebSocket 应该是后续 realtime milestone，不是 foundation blocker。  
5. **不要把插件系统从声明式安全边界直接升级为任意 JS 执行。** v2.0 可以做 iframe runtime，不代表要放开插件直接拿宿主权限。  
6. **不要把 Qdrant 立即换成 pgvector。** 这和 runtime foundation 没有直接耦合。  
7. **不要改用 `@auth/pg-adapter` 作为迁移前提。** 既然项目已经走 Drizzle，后续 PostgreSQL 也应优先继续走 `@auth/drizzle-adapter`，减少 auth blast radius。  
8. **不要把 monorepo restructuring 和业务大范围功能重写绑在一起。** 先迁结构，后迁实现。  

## Sources

- `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `OpenLearn-Next-V2-Architecture-Plan.md`, `package.json`, `drizzle.config.ts`, `src/db/index.ts` — current repo baseline. Confidence: HIGH.
- Next.js official docs: `proxy` API, self-hosting, `transpilePackages`, Next 16 cache/runtime behavior. Last updated 2026-05-13. Confidence: HIGH.
- Auth.js official docs: v5 migration, Drizzle adapter, edge-compatible split config, universal `auth()`. Confidence: HIGH.
- Drizzle official docs: SQLite/PostgreSQL dialect configuration and PostgreSQL setup. Confidence: HIGH.
- Turborepo official docs: incremental monorepo adoption and repository structuring. Confidence: HIGH.
- Socket.IO official docs v4 (last updated 2026-03-04): strengths are bidirectional comms, reconnection, rooms, acknowledgements, multi-node scaling. Confidence: HIGH.
- BullMQ official docs: Redis/ioredis connection model and worker requirements. Confidence: HIGH.
- Context7 MCP was unavailable in this agent session due API key failure; library verification used the required CLI fallback plus official docs. Confidence note: MEDIUM process risk, LOW content risk because official docs were also checked.
