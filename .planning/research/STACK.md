# Technology Stack — v3.1 单校试点生产可用 / 插件样板链路

**Project:** OpenLearn Next  
**Milestone:** v3.1  
**Researched:** 2026-05-24  
**Scope:** 只研究 v3.1 为了“单校试点生产可用、插件能力先行、课堂互动插件 + 教师设计到学生课堂完成真实样板”还需要新增或调整的 stack。**不重复定义已经成立的主栈，不把既有能力误写成未完成。**

---

## Current Baseline

先说清楚：**v3.1 不是重做基础设施，而是在已成立的平台和课堂主链路上补生产化支撑。**

### 1) 已经够用、应继续沿用的基础栈

| 类别 | 当前基线 | v3.1 判断 |
|---|---|---|
| App framework | Next.js 16.2.4 + React 19.2.5 + Turbopack | **够用，继续沿用** |
| Auth / DB | Auth.js v5 beta + Drizzle ORM + SQLite/libSQL | **够用，继续沿用** |
| 数据边界 | DAL + Server Actions only | **必须保持，不可回退** |
| 实时课堂 | `ws` WebSocket-first | **已落地，不重写** |
| 多实例 fanout | `ioredis` optional fanout | **已存在，不可误写为缺失** |
| 回退面 | SSE rollback surface | **已存在，继续保留** |
| 异步平台 | BullMQ + 独立 worker + SQLite task ledger | **已落地，直接复用** |
| 平台治理 | Command / Action / Event / Plugin lifecycle / operator observability | **已有内核，v3.1 只做产品化与生产化补强** |
| E2E / 测试 | Playwright + Vitest | **够用，直接复用** |

### 2) 代码库里已经存在、可直接作为 v3.1 支撑面的能力

- `/settings/labs` 已有 **Transport / Runtime Inspector / Async Operator / plugin lifecycle** 相关 operator 面。
- `src/features/platform-core/observability/operator-read-model.ts` 已有 **platform command timeline** 读取模型。
- `src/features/runtime-platform/seams/transport/redis-fanout-connection.ts` 已有 **Redis fanout capability + degraded health snapshot**。
- `src/features/async-tasks/infra/connection.ts` 与 worker heartbeat 已有 **BullMQ 连接健康与 worker 心跳**。
- `platformEvents` / `platformEventDispatches` / `platformCommands` 已是 **平台事件与命令真相链路**。

### 3) 当前基线里明确还没补齐、会阻碍“单校试点生产可用”的地方

这些不是“主链路没做完”，而是**生产运维支撑还不完整**：

- 仓库里 **没有 `.github/workflows/`**，说明标准 CI/CD 工作流尚未落库。
- 仓库里 **没有 Dockerfile / compose 文件 / `.env.example`**，说明交付与环境基线仍不够明确。
- 代码中仍有多处 `console.error/warn/log`，**结构化日志尚未标准化**。
- 没看到标准 `/health` / `/ready` route，**外部探活与发布门禁还不标准**。
- 没看到正式的 **backup / restore / drill** 工具链与 runbook 落库。
- 没看到面向课堂 WebSocket + teacher→student 样板链路的 **load test 基线**。

---

## Recommended Additions

v3.1 推荐新增的是**生产化支撑栈**，不是业务大框架。

### A. 多环境配置

**推荐：不引入新 config framework，直接复用 `zod` 做 server env schema。**

| 推荐项 | 技术 | 用途 | 边界 |
|---|---|---|---|
| 统一环境变量 schema | `zod`（复用现有） | 启动时校验 production/staging/local 必填项 | **不引入** `dotenv-flow`、Convict、大而全配置中心 |
| `env.server.ts` / `env.public.ts` | 项目内模块 | 收敛 `process.env` 散点读取 | UI 不直接读敏感 env |
| `.env.example` + 环境说明文档 | repo 文件 | 降低部署漂移 | 文档必须区分 single-node 与 multi-instance |

**v3.1 必须显式定义的 env 族：**

- `DB_FILE_NAME`
- `AUTH_SECRET`
- `NEXTAUTH_URL` / 对外 `APP_BASE_URL`
- `REDIS_URL`
- `REDIS_FANOUT_ENABLED`
- `BULLMQ_REDIS_URL`
- `ASYNC_TASKS_ENABLED`
- `INSTANCE_ID` / `RUNTIME_INSTANCE_ID` / `WORKER_INSTANCE_ID`
- `SENTRY_DSN` / `SENTRY_AUTH_TOKEN` / `SENTRY_ENVIRONMENT`（如采用 Sentry）
- 对象存储相关变量（如采用 Litestream / S3-compatible backup）

**判断：**这部分主要是工程纪律补齐，**不是新平台能力**。

### B. CI / CD

**推荐：GitHub Actions 作为最小可用 CI 基线。**

官方文档明确支持 Node.js build/test workflow、依赖缓存与多 job 编排。对 v3.1 来说，这已经够了。  
**推荐技术：**GitHub Actions（HIGH confidence，官方文档已核对）

| 推荐项 | 技术 | 用途 | 为什么是现在 |
|---|---|---|---|
| CI workflow | GitHub Actions | `pnpm install` / `lint` / `typecheck` / `build` / 核心 verifier / test | 当前仓库无 workflow，属于生产门槛缺口 |
| dependency cache | `actions/setup-node` cache + pnpm cache | 缩短 CI 时间 | 官方支持成熟 |
| deploy artifact | GitHub Actions artifact / image build | 为单校试点发布提供可追踪产物 | 不先上复杂平台 |
| release gate | 自定义 `verify:milestone-v3-1` | 样板链路作为发布前 gate | 比“只跑单元测试”更贴合本项目 |

**建议 CI 最少分成 4 个 job：**

1. `static`: lint + typecheck  
2. `build`: Next build + worker boot smoke  
3. `verification`: `verify:phase38`、`verify:phase52`、`verify:phase53`、v3.1 样板 verifier  
4. `e2e`: Playwright 跑“教师设计 → 发布 → launch → 学生课堂完成 → operator 可见”

**CD 边界：**

- 单校试点只需要 **single-host / small multi-instance** 交付路径。
- 推荐补 **Dockerfile + 简单 compose/部署脚本**，把 app / worker / Redis / backup sidecar 交付成可运行单元。
- **不引入 Kubernetes / Helm / ArgoCD**。

### C. 日志 / 监控 / 报警 / Trace

#### 1. 结构化日志

**推荐新增：`pino`**（HIGH confidence，官方 docs 已核对）

| 推荐项 | 技术 | 用途 | 边界 |
|---|---|---|---|
| App / worker JSON 日志 | `pino` | request / command / event / task / transport structured log | 取代散落 `console.*` |
| 敏感字段脱敏 | `pino` redaction | `authorization`、token、password、PII 脱敏 | 日志默认不能裸打学生/教师敏感信息 |
| child logger | `pino.child()` | 按 `commandId` / `classroomSessionId` / `pluginId` 绑定上下文 | 不引入重量级 log pipeline SDK |

**建议日志字段统一：**

- `requestId`
- `commandId`
- `correlationId`
- `taskId`
- `classroomSessionId`
- `runtimeSessionId`
- `pluginId`
- `schoolId`
- `actorId`
- `transportMode`
- `workerInstanceId`

#### 2. 错误监控 + Trace + 报警

**推荐新增：`@sentry/nextjs`**（MEDIUM-HIGH confidence，官方 docs 已核对）

原因很直接：v3.1 需要的是**尽快具备生产可观测性**，不是先搭一套 vendor-neutral observability platform。Sentry 在 Next.js、Server Actions、release、tracing、cron monitor 上都已经成熟，适合单校试点先行。

| 推荐项 | 技术 | 用途 | 为什么推荐 |
|---|---|---|---|
| 应用错误追踪 | `@sentry/nextjs` | 捕获 route handler、Server Actions、RSC/客户端错误 | Next.js 集成成熟 |
| 性能 tracing | Sentry tracing | 跟踪 teacher publish / plugin command / student submit / operator actions | v3.1 已有 command/event IDs，可天然接入 |
| release tracking | Sentry release | 将错误与某次发布绑定 | 对试点回滚极其重要 |
| cron / scheduled monitor | Sentry Cron Monitor | 监控 backup、restore-check、queue sweep 等定时任务 | 直接补报警能力 |

**判断：**

- v3.1 先上 `Sentry + Pino`，是最短路径。
- **不建议本 milestone 直接上完整 OpenTelemetry collector / Prometheus / Grafana / Loki 全家桶。**
- 若要保留未来可迁移性，可以只追加 `@opentelemetry/api` 作为内部 trace seam，但**不要把 v3.1 变成 observability 平台建设里程碑**。

### D. Backup / Restore

#### 1. SQLite 持久库

**推荐新增：Litestream**（HIGH confidence，官方 docs 已核对）

Litestream 官方能力正好适合 SQLite-first：持续复制 WAL 变化到对象存储，并支持 restore / point-in-time / integrity check。对单校试点非常匹配。

| 推荐项 | 技术 | 用途 | 边界 |
|---|---|---|---|
| SQLite 持续复制 | Litestream | `local.db`/生产 SQLite 文件持续备份到 S3-compatible 存储 | 不改数据库，不引入 PostgreSQL |
| 恢复演练 | `litestream restore` | 从最近快照或指定时间点恢复 | 必须配 restore drill |
| 冷备 runbook | 项目脚本 + 文档 | 发布前/事故后手工恢复 | 必须验证可用，而非只“理论有备份” |

#### 2. 文件 / 上传物 / 配置

**推荐新增：restic**（HIGH confidence，官方 docs 已核对）

用途不是替代 Litestream，而是补：

- 上传资源目录
- 备份配置
- 导出 artifacts
- 周期性校验 snapshot 仓库完整性

官方 docs 支持 `backup`、`snapshots`、`check --read-data`，适合做**加密冷备 + 校验**。

**推荐边界：**

- SQLite 主恢复靠 Litestream。
- 文件与附加资产靠 restic。
- v3.1 至少要有：**每日自动备份 + 每周 restore drill + 每周完整性 check**。

### E. Load Test

**推荐新增：k6**（HIGH confidence，官方 docs 已核对）

原因：v3.1 要证明的不只是 HTTP page load，而是**真实课堂链路在单校规模下可稳定运行**。

| 推荐项 | 技术 | 用途 | 应测场景 |
|---|---|---|---|
| HTTP + API load | `k6` | 测 teacher editor/save/publish、student submit、operator read model | 典型课前/课中突发峰值 |
| WebSocket scenario | `k6/ws` | 测 classroom session connect、broadcast、lock/unlock、step switch | 课堂同步稳定性 |
| threshold gate | `checks` + `thresholds` | 把 SLO 写成自动失败门槛 | 作为 pre-pilot gate |

**单校试点建议先定义 3 个基线场景：**

1. `teacher-authoring-publish`  
2. `classroom-live-40-students`  
3. `plugin-sample-chain-end-to-end`

**不建议引入：**JMeter、Locust、分布式压测平台。k6 足够。

### F. Operator / Admin 面

**判断：现有 operator foundation 已够，不要重做后台。应做的是“补生产运维视图”。**

| 当前已有 | v3.1 动作 | 原因 |
|---|---|---|
| `/settings/labs` | 扩展，不重写 | 已是 operator 聚合入口 |
| Runtime Inspector | 扩展 transport / classroom health 信息 | 已有真实链路上下文 |
| Async Operator | 扩展 queue / worker / stuck-job 视图 | 已有 durable truth |
| Plugin settings / lifecycle surface | 扩展 installation/sample plugin 状态 | 已有治理模型 |
| `/admin` shell | 保留最小 admin 面 | 单校试点不值得建第二套运营后台 |

**v3.1 需要新增的不是 UI framework，而是 operator 数据面：**

- deploy version / release id
- env posture 摘要（不暴露 secrets）
- Redis fanout enabled/degraded state
- BullMQ worker heartbeat / backlog
- recent failed commands / failed tasks / failed event dispatches
- sample plugin install status
- backup last success / last restore drill result
- load test latest report summary

### G. 插件样板链路支撑

“课堂互动插件 + 教师设计到学生课堂完成”这条样板链路，v3.1 不缺主业务框架，缺的是**生产级验收与回归栈**。

| 推荐项 | 技术 | 用途 |
|---|---|---|
| milestone E2E gate | Playwright（复用现有） | 真正跑 teacher→publish→launch→student→operator evidence |
| deterministic seed 数据 | TS seed scripts（复用 `tsx`） | 建立可重复试点演示与回归环境 |
| sample plugin fixture | 项目内 built-in/default plugin fixture | 确保插件链路不是 demo-only 手工路径 |
| synthetic monitoring | Sentry Cron / simple smoke job | 定时验证样板链路关键 API 和 classroom launch |

---

## Production Gaps

下面是 v3.1 若不补，会直接影响“单校试点生产可用”的缺口。

| 领域 | 当前状态 | 风险 | v3.1 应补什么 |
|---|---|---|---|
| 多环境配置 | `process.env` 读取分散 | 环境漂移、部署时漏变量 | Zod env schema + `.env.example` + 环境文档 |
| CI | 仓库无 workflow | 回归靠人工 | GitHub Actions CI |
| CD | 无标准交付件 | 发布不可重复 | Dockerfile + 部署脚本/compose + release 流程 |
| 日志 | 仍有 `console.*` | 生产排障困难 | `pino` structured logging |
| 错误报警 | 未见正式错误平台 | 线上故障只能看日志 | `@sentry/nextjs` |
| Trace | 目前偏应用内 read model | 跨 publish→command→event→task→student submit 难追 | Sentry tracing（必要时加 OTel API seam） |
| 探活 | 未见标准 health/ready route | 无法稳定接入外部探活与发布门禁 | `/api/health` + `/api/ready` |
| Backup | 未见正式工具链 | SQLite 单点风险 | Litestream |
| Restore drill | 未见 restore 验证 | “有备份但恢复不了” | restore script + 演练记录 |
| 文件冷备 | 未见统一方案 | 上传/资源丢失无兜底 | restic |
| Load test | 未见正式基线 | 单校试点前无容量把握 | k6 场景与阈值 |
| Operator readiness | 分散存在、未形成生产 readiness bundle | 值班信息不完整 | 单页 readiness / health / backup / release 汇总 |
| 样板链路验证 | 现有 verifier 偏 phase close | 试点演示链路回归不足 | Playwright + milestone-specific gate |

---

## What Not To Add

v3.1 目标是**试点可用**，不是“企业级基础设施大全”。以下技术不该在本 milestone 引入：

| 不该新增 | 原因 | 用什么代替 |
|---|---|---|
| PostgreSQL / pgvector | 违背 SQLite-first；迁移 blast radius 过大 | 继续 SQLite + Litestream |
| Kafka / NATS / Redis Streams | 当前 WebSocket-first + optional Redis fanout 已成立；会制造第二真相源 | 继续 SQLite truth + Redis delivery-only |
| Kubernetes / Helm / ArgoCD | 单校试点过重 | Dockerfile + compose / 单机部署脚本 |
| Prometheus + Grafana + Loki 全家桶 | v3.1 观测性目标过度膨胀 | Sentry + Pino 即可起步 |
| ELK / OpenSearch 日志平台 | 对当前规模过重 | 先输出 JSON logs 到宿主平台/文件 |
| Temporal / 工作流引擎 | 不是本 milestone 的主矛盾 | 继续 Command Bus + BullMQ |
| 新 UI admin 框架 | 现有 `/settings/labs` / `/admin` 已可复用 | 扩展现有 operator 面 |
| Cypress / 另一套 E2E 栈 | repo 已有 Playwright | 统一 Playwright |
| Docker Swarm / service mesh | 单校试点完全过重 | 简单单机/双实例部署 |

特别强调：

- **不能把 WebSocket-first + optional Redis fanout 写成“待建设”**。
- **不能把 BullMQ worker 写成“未来才需要”**；它已经是现有异步平台一部分。
- **不能把 v3.1 变成多租户 SaaS infra rewrite**；本 milestone 是单校试点生产化。

---

## Notes For Requirements

下面这些应直接转成 v3.1 requirements / roadmap 语言。

### 1) 推荐写进 requirement 的 stack 决策

1. **继续沿用当前主栈**：Next.js 16、React 19、Auth.js v5、Drizzle、SQLite、DAL、WebSocket-first、optional Redis fanout、BullMQ worker。  
2. **新增生产化支撑栈**：
   - `pino`：结构化日志
   - `@sentry/nextjs`：错误监控、trace、release、报警基础
   - Litestream：SQLite 持续备份/恢复
   - restic：文件与配置冷备
   - k6：负载测试
3. **多环境配置不引入新框架**：复用 `zod` 构建 env schema。  
4. **CI/CD 使用 GitHub Actions**，并以 milestone verifier + Playwright 样板链路作为发布 gate。  
5. **operator/admin 扩展现有 surface，不新建第二后台。**

### 2) 建议 requirement 显式写清的边界

- 单校试点支持 **single-node** 为主；如部署为多实例，启用现有 `redis_fanout`。  
- Redis 继续是 **delivery/orchestration-only**，不成为业务 truth。  
- BullMQ 继续是 **async execution layer**，不成为业务 truth。  
- SQLite 继续是 durable truth；通过 Litestream 提升可恢复性，而不是切库。  
- 生产可用的定义里必须包含：**observability、backup/restore、load test、release gate、operator readiness**。  

### 3) 建议 roadmap 单列的交付包

**建议把 v3.1 stack 相关工作拆成 4 个交付包：**

1. **Deploy & Env Baseline**  
   env schema、`.env.example`、Dockerfile、部署脚本、health/ready route

2. **Observability Baseline**  
   Pino、Sentry、release tagging、关键 command/task/classroom tracing、报警接线

3. **Recovery Baseline**  
   Litestream、restic、backup policy、restore drill、operator backup status

4. **Pilot Validation Baseline**  
   GitHub Actions、Playwright 样板链路 gate、k6 基线、operator readiness summary

---

## Bottom Line

v3.1 不需要换主栈。  
**正确做法是：在当前已经成立的 WebSocket-first + optional Redis fanout + BullMQ + platform-core 基线上，补齐 production readiness stack。**

最小且正确的新增组合是：

- `pino`
- `@sentry/nextjs`
- Litestream
- restic
- k6
- GitHub Actions workflow
- Zod-based env schema
- Dockerfile / compose-or-equivalent deployment baseline

这套组合足以支撑：

- 单校试点生产发布
- 插件样板链路稳定演示
- 出问题可观测
- 数据可恢复
- 课堂容量有基线

而且**不会破坏当前项目已经成立的技术决策。**

---

## Sources

### Project-local sources

- `.planning/PROJECT.md` — 当前状态、约束、WebSocket-first 与 optional Redis fanout 已落地、BullMQ 已落地。**Confidence: HIGH**
- `.planning/MILESTONES.md` — v2.2 / v2.3 / v3.0 已交付事实。**Confidence: HIGH**
- `.planning/STATE.md` — 当前处于新 milestone planning。**Confidence: HIGH**
- `package.json` — 当前依赖版本与已有脚本。**Confidence: HIGH**
- `src/features/runtime-platform/seams/transport/redis-fanout-connection.ts` — Redis fanout capability 与 degraded health snapshot。**Confidence: HIGH**
- `src/features/async-tasks/infra/connection.ts` — BullMQ 连接能力、worker instance、健康快照。**Confidence: HIGH**
- `src/features/platform-core/observability/operator-read-model.ts` — operator 命令/事件可观测读取模型。**Confidence: HIGH**
- `src/components/surfaces/settings-surface.tsx` — 现有 operator/labs surface 已覆盖 transport、runtime inspector、async operator 入口。**Confidence: HIGH**
- 仓库 glob 检查：未发现 `.github/workflows/*`、Dockerfile、compose、`.env.example`。**Confidence: HIGH**

### Documentation-verified sources

- Context7 CLI `/websites/github_en_actions` — GitHub Actions Node.js build/test/cache workflow。**Confidence: HIGH**
- Context7 CLI `/pinojs/pino` — structured logging、redaction、child logger。**Confidence: HIGH**
- Context7 CLI `/getsentry/sentry-docs` — Next.js setup、Server Action instrumentation、tracing、cron monitor。**Confidence: MEDIUM-HIGH**
- Context7 CLI `/grafana/k6-docs` — thresholds、checks、HTTP/load testing patterns。**Confidence: HIGH**
- Context7 CLI `/benbjohnson/litestream` — SQLite continuous replication、restore、integrity check。**Confidence: HIGH**
- Context7 CLI `/restic/restic` — backup、snapshots、repository check/restore verification。**Confidence: HIGH**
