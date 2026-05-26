# Project Research Summary

**Project:** OpenLearn Next  
**Milestone:** v3.1 — 单校试点生产可用，插件能力先行，课堂互动插件 + 教师设计到学生课堂完成真实样板  
**Researched:** 2026-05-24  
**Confidence:** HIGH

## Milestone Framing

v3.1 不是下一轮“平台抽象升级”，也不是“全平台生产化大扫除”。四份研究结论一致：这一轮必须围绕一条**真实样板链路**收敛——教师设计课程中的课堂互动插件步骤，发布正式版本，开课，学生真实参与互动并写回结果，教师与 operator 能看到结果、定位故障、执行恢复。能否支撑**单校试点上线、值守、回滚、恢复**，才是本 milestone 的验收标准。

因此，v3.1 的主矛盾不是缺基础框架，而是**已有平台与课堂能力距离“可试点生产运行”还差最后一层生产化支撑与样板闭环**。正确做法是：保持现有 Next.js 16 + React 19 + SQLite + DAL + WebSocket-first + BullMQ + plugin governance 主骨架不变，优先打穿“课堂互动插件真实样板链”，再补 deploy、观测、恢复、压测、operator readiness 这些试点必需层。

一句话判断：**v3.1 应该是“在既有平台上交付一个可上线、可运维、可恢复的真实插件课堂样板”，而不是再造一套更抽象的平台。**

## Executive Summary

OpenLearn Next 当前已经具备相当强的 baseline：课堂主链路、SQLite durable truth、DAL-only 写路径、WebSocket-first transport、optional Redis fanout、BullMQ worker、platform command/event/plugin lifecycle 基础都已成立。v3.1 不需要换栈，也不应该重写实时链路、异步平台或插件框架。研究最明确的共识是：**先承认已有能力，避免把已经完成的基础设施误写成缺口。**

本 milestone 应优先交付两类东西：第一类是**样板主链路能力**，即教师配置课堂互动插件、发布、开课、学生交互完成、结果回写、教师/operator 可见；第二类是**生产 readiness 能力**，即 env 与部署基线、CI/CD gate、结构化日志、错误追踪、health/ready、备份恢复、restore drill、定向 load test、operator 支撑面。没有前者，v3.1 会再次滑向“平台更完整但学校仍不能试点”；没有后者，v3.1 只能 demo，不能上线。

主要风险也非常集中：一是 scope 漂移，继续做 infra-first 而不做真实样板；二是只做 happy path，不做幂等、补偿、回退、重试、断线恢复；三是把 Redis/WebSocket/BullMQ 误当 durable truth；四是 operator 面只对研发友好，不对校内实施和试点 support 友好。对应的应对策略也清晰：**先冻结试点口径与样板链路，再沿 authoritative write path 实现，再补 operator/recovery/load gate，最后才做更广泛泛化。**

## What Already Exists

以下内容应在 REQUIREMENTS 和 ROADMAP 里明确标注为 **baseline / 已有能力**，不要误写为 v3.1 待建设：

### 1. 主技术与系统骨架已成立

- Next.js 16.2.x + React 19.2.x + Turbopack
- Auth.js v5 beta + Drizzle ORM + SQLite/libSQL
- DAL + Server Actions only 数据边界
- WebSocket-first classroom transport
- optional Redis fanout 多实例分发能力
- BullMQ + dedicated worker + SQLite task ledger 异步执行层
- plugin lifecycle / command / event / operator observability 基础
- Playwright + Vitest 测试基础

### 2. 架构边界已经明确

- SQLite + DAL 是唯一 durable truth
- Redis / WebSocket / BullMQ 只是 delivery or orchestration substrate
- UI 不应绕过 DAL 直接写库
- 课堂状态、插件治理状态、任务状态都必须能从 SQLite authoritative state 重建
- 现有 `/settings/labs`、Runtime Inspector、Async Operator、plugin lifecycle/operator read model 已经提供 operator surface 起点

### 3. v3.1 应直接复用的已有能力

- lesson / editor / publish 主链路基础
- runtime-platform / classroom transport 基础
- platform-core 的 command / event / lifecycle 治理基础
- async-tasks 的 worker / heartbeat / queue health 能力
- settings / operator / diagnostics 现有入口

## Key Findings

### Recommended Stack

v3.1 的 stack 结论不是“加很多新技术”，而是**主栈保持稳定，仅补最小生产化支撑栈**。

**继续沿用的核心技术：**
- **Next.js 16 + React 19**：继续作为唯一应用承载层，不重开 framework 级改造。
- **Auth.js v5 + Drizzle + SQLite**：继续作为认证与 durable truth 基线，不切 PostgreSQL。
- **DAL + Server Actions**：继续作为唯一正式写路径，不允许插件或 UI 绕过。
- **WebSocket-first + optional Redis fanout**：继续作为课堂实时交付层，不重写 transport。
- **BullMQ + worker**：继续作为异步编排与后处理层，不另起 workflow engine。

**v3.1 推荐新增的生产支撑栈：**
- **Zod-based env schema**：统一环境变量校验与多环境纪律。
- **GitHub Actions**：最小可用 CI/CD 与 release gate。
- **Pino**：结构化日志、redaction、跨 command/session/task/plugin 的关联日志。
- **@sentry/nextjs**：错误追踪、tracing、release 绑定、定时监控与报警基础。
- **Litestream**：SQLite 持续备份与 restore 基线。
- **restic**：上传资源、配置、附加资产冷备。
- **k6**：课堂场景定向压测与 SLO threshold gate。
- **Dockerfile + compose/部署脚本 + .env.example**：单校试点可重复交付基线。

### Expected Features

v3.1 的 feature 结论非常明确：必须围绕**课堂互动插件真实样板链路**组织需求，而不是继续扩“平台能力目录”。

**Must have / table stakes：**
- 多环境配置与 secrets discipline
- CI/CD + 发布前 gate + migration gate
- classroom / plugin / command / task / transport 可观测性
- SQLite + 文件资产备份恢复 + restore drill
- 关键链路幂等、补偿、重试、回退
- lesson/plugin config/student submission/operator input 强校验
- 单课堂与有限多课堂并发 load test
- 至少一类课堂互动插件 action 从教师配置到学生完成完全真实可用

**样板链路必须包含：**
- 教师在 lesson editor 配置插件步骤
- 发布前 preflight / readiness
- publish 生成正式可执行版本
- classroom launch 绑定正确 runtime snapshot
- 教师课中真实触发插件 action
- 学生收到状态、参与互动、提交并写回 canonical progress/submission/evidence
- 教师与 operator 看到结果、失败原因与可恢复动作

**应 defer 的内容：**
- 通用 plugin marketplace / 商店化生态
- 多校多租户完整 SaaS 运营体系
- 全量 observability 平台（Prometheus/Grafana/Loki/ELK 全家桶）
- Workflow engine / Temporal / Agent runtime 真执行
- 任意第三方远程插件执行
- 互联网级大规模压测体系

### Architecture Approach

架构研究的主结论是：**v3.1 是“在现有架构上接入生产层”，不是新架构。** 所有新增能力都必须继续挂在现有 authoritative write path 上：UI/teacher action/student submit/operator action → Server Action/Node entrypoint → Command Bus 或 domain service → DAL → SQLite → audit/ledger/outbox → WebSocket/Redis/BullMQ 负责交付或编排。

**Major components / layers：**
1. **Lesson / editor / publish flow** — 承担教师设计、发布与 plugin-bound 配置冻结。
2. **Classroom runtime / transport** — 承担开课、同步、互动广播、学生跟随与重连恢复。
3. **Plugin governance + action execution** — 承担 plugin install/enable/compatibility/dispatch/result contract。
4. **Async tasks / worker** — 承担 post-class projection、reconcile、retry、summary 等异步后处理。
5. **Operator read models / diagnostics surfaces** — 承担 classroom/plugin/command/task/recovery/backup/health 的正式观测面。
6. **Deployment / observability / recovery layers** — 承担试点环境发布、观测、备份、恢复、load validation。

### Critical Pitfalls

1. **把“生产可用”写成泛化口号** — 必须改写成单校试点可验证标准：哪种插件、哪条链路、什么容量、允许什么人工介入、必须具备哪些恢复动作。
2. **只做 infra，不做真实样板链路** — 每个基础设施任务都要明确挂靠样板链路节点，否则 defer。
3. **只做 happy path，不做恢复/补偿/回退** — 必须覆盖重复点击、断线重连、插件失败、发布回滚、任务重试、operator 手动干预。
4. **把 Redis/WebSocket/BullMQ 当 durable truth** — 所有 canonical state 必须可从 SQLite + DAL 重建。
5. **把插件先行做成纯框架建设** — 先证明课堂互动插件真实价值，再沉淀通用能力。
6. **operator 面只对研发友好** — 必须提供学校实施/support 能理解的业务语言与 next-step 动作。
7. **没有 rollout/runbook/capacity 假设就上线** — 没有课前 checklist、故障应对、灰度/回滚条件，就不能称为试点生产可用。

## Required Production-Readiness Scope

下面这些是 v3.1 应明确写进 REQUIREMENTS 的**生产可用范围**：

### 1. Deploy & Env Baseline

- `env.server.ts` / `env.public.ts` 收敛环境变量读取
- `.env.example` 与 single-node / multi-instance 环境说明
- Dockerfile + 简单 compose 或部署脚本
- `/api/health` 与 `/api/ready`
- release version / migration / plugin build traceability

### 2. Release Safety & CI Gate

- GitHub Actions workflow
- static/build/verification/e2e 四类 job
- 发布前 migration gate 与 health-check
- milestone-specific verifier：教师设计 → 发布 → launch → 学生完成 → operator 可见

### 3. Observability & Operator Readiness

- Pino 结构化日志
- Sentry 错误追踪、tracing、release tagging、cron/smoke monitor
- commandId / correlationId / classroomSessionId / taskId / pluginId 跨层关联
- operator 可查看 transport、queue、plugin、backup、deploy、load、failure summary
- degraded posture honesty：Redis degraded、worker lag、transport fallback 必须可见

### 4. Data Safety & Recovery

- Litestream 持续备份 SQLite
- restic 冷备上传资源与配置资产
- restore script、restore drill、post-restore checks
- append-only / canonical write discipline
- 关键 mutation 幂等、防重、补偿、reconcile

### 5. Pilot Validation & Load Confidence

- k6 场景化压测：teacher-authoring-publish、classroom-live-40-students、plugin-sample-chain-end-to-end
- Redis degraded posture 测试
- worker backlog / retry correctness 测试
- Playwright 样板链路 E2E gate
- closeout proof artifact 与 operator/runbook evidence

## Recommended Requirement Categories

建议 REQUIREMENTS.md 直接按以下类别组织，而不是按技术组件散写：

### 1. `SAMPLE-CHAIN`

定义教师设计 → 发布 → 开课 → 插件互动 → 学生完成 → 教师验证这条真实样板链。

应包含：
- plugin step authoring
- publish preflight / version freeze
- classroom runtime readiness
- student interaction completion
- teacher evidence / summary visibility

### 2. `PLUGIN-PROD`

定义“插件 action 真正可用”的 contract，而不是 registry demo。

应包含：
- action resolve / dispatch / result contract
- enabled/install/version compatibility
- schema validation
- failure taxonomy
- operator recovery actions

### 3. `ENV-RELEASE`

定义从开发到试点环境的交付稳定性。

应包含：
- env layering / secrets discipline
- migration gate
- artifact/version traceability
- staged deploy / rollback posture
- release checklist / health-check

### 4. `OPS-OBS`

定义现场是否看得见、查得出、处理得了。

应包含：
- command/plugin/classroom/task 关联观测
- degraded posture honesty
- diagnostics / alert surface
- operator runbook
- school/classroom/plugin/action drill-down

### 5. `DATA-SAFETY`

定义真相源正确性与恢复能力。

应包含：
- input/schema validation
- backup / restore / post-restore checks
- append-only / canonical write discipline
- idempotency / dedupe / compensation
- replay-safe mutation semantics

### 6. `PERF-LOAD`

定义单校试点真实容量，而不是理论扩展性。

应包含：
- 单课堂 join 峰值
- classroom fanout
- 学生高峰提交
- reconnect / retry 行为
- 压测基线与通过阈值

## Recommended Phase Sequencing

下面的 phase sequencing 适合直接作为 ROADMAP.md 起点。

### Phase 1: Freeze Pilot Scope & Acceptance Gate
**Rationale:** 先收敛试点学校画像、样板插件类型、容量假设、close gate，避免 roadmap 再次写成“泛生产化升级”。  
**Delivers:** 单校试点口径、真实样板链定义、成功/失败/恢复验收标准、proof artifact 清单。  
**Addresses:** `SAMPLE-CHAIN`, `ENV-RELEASE`。  
**Avoids:** scope 漂移、infra-first、proof 最后补。

### Phase 2: Plugin Sample Contract & Authoring Integration
**Rationale:** 没有教师侧可配置、可预检、可发布的插件步骤，后面所有 production 工作都没有锚点。  
**Delivers:** plugin-bound step schema、authoring form、visibility gating、preview/preflight、publish version freeze、compatibility checks。  
**Addresses:** `SAMPLE-CHAIN`, `PLUGIN-PROD`, `DATA-SAFETY`。  
**Uses baseline:** lesson/editor/publish flow、command/lifecycle 基础、DAL/SQLite authoritative write。  
**Avoids:** 把插件只做成 framework 或 registry 展示。

### Phase 3: Classroom Runtime Sample Chain
**Rationale:** v3.1 的核心是“教师设计到学生完成”真实成立，必须先打穿课堂运行闭环。  
**Delivers:** classroom launch readiness、plugin runtime activation snapshot、teacher trigger、student interaction/submit、canonical evidence/progress/submission 回写、teacher result visibility。  
**Addresses:** `SAMPLE-CHAIN`, `PLUGIN-PROD`, `DATA-SAFETY`。  
**Uses baseline:** WebSocket-first transport、optional Redis fanout、runtime-platform、BullMQ post-processing。  
**Avoids:** happy path only、authoring/runtime 脱节、实时体验压过正确性。

### Phase 4: Operator Recovery & Production Surfaces
**Rationale:** 样板链能跑还不够，必须让试点 support 和 operator 能定位、恢复、值守。  
**Delivers:** transport health、task health、plugin governance diagnostics、command/event timeline、backup status、retry/reconcile/resume/suspend/fallback 动作、双层 operator 视图。  
**Addresses:** `OPS-OBS`, `DATA-SAFETY`, `PLUGIN-PROD`。  
**Uses baseline:** `/settings/labs`、Runtime Inspector、Async Operator、operator read models。  
**Avoids:** operator 只对研发友好、故障仍需手改库。

### Phase 5: Deploy / Observability / Recovery Baseline
**Rationale:** 在样板链与 operator 面稳定后，再补统一 deploy、日志、追踪、备份恢复，最贴近真实试点。  
**Delivers:** env schema、.env.example、Dockerfile/compose、health/ready、GitHub Actions、Pino、Sentry、Litestream、restic、restore drill、release traceability。  
**Addresses:** `ENV-RELEASE`, `OPS-OBS`, `DATA-SAFETY`。  
**Avoids:** 有功能无交付、有备份无恢复、有日志无定位。

### Phase 6: Load / Degrade / Pilot Rehearsal
**Rationale:** 生产可用必须经过课堂峰值、降级、恢复、上线 rehearsal 验证。  
**Delivers:** k6 场景压测、Redis degraded tests、worker backlog tests、Playwright E2E gate、runbook rehearsal、pilot rollout/rollback checklist。  
**Addresses:** `PERF-LOAD`, `OPS-OBS`, `ENV-RELEASE`。  
**Avoids:** 单校不设容量假设、现场靠开发扛、只在 happy path 演示。

### Phase Ordering Rationale

- **先冻结样板与验收，再做实现**：否则所有“生产化”都会散。
- **先样板链，后生产层补强**：没有真实链路，observability/backup/load work 没有锚点。
- **先 authoritative flow，后 operator projection**：先把真相写对，再把状态读清楚。
- **先 SQLite truth recovery，后 Redis/BullMQ rebuild**：恢复顺序必须 truth-first。
- **先 honest degradation，后性能优化**：单校试点更怕不可解释的失败，而不是绝对性能不够极致。

## Research Flags

### 规划期建议继续深挖的 phase

- **Phase 2（Plugin Sample Contract & Authoring Integration）**：需要明确课堂互动插件的具体样板类型、配置 schema、compatibility contract、preflight 判定规则。
- **Phase 3（Classroom Runtime Sample Chain）**：需要细化 runtime snapshot、学生重连恢复、证据写回、插件失败隔离与多插件共存策略。
- **Phase 4（Operator Recovery & Production Surfaces）**：需要细化 operator 双层视图、可执行恢复动作矩阵、support 语言和 runbook 编排。
- **Phase 6（Load / Degrade / Pilot Rehearsal）**：需要把容量假设转成具体阈值与 rehearsal 脚本。

### 规划期可直接采用标准模式、通常不必额外 research-phase 的部分

- **Deploy / env schema / GitHub Actions baseline**：模式成熟，重点是项目内落地，不是外部技术探索。
- **Pino + Sentry baseline**：集成路径成熟，重点在 trace key 与 operator/read model 对齐。
- **Litestream + restic baseline**：方案已足够明确，重点是 runbook 与 drill discipline。

## Watch-outs / Pitfalls

### Top watch-outs

1. **不要把 v3.1 写成“平台继续升级”**：必须始终回到单校试点与课堂互动样板。
2. **不要把已有 baseline 误写成缺口**：WebSocket-first、optional Redis fanout、BullMQ、platform governance 已经存在。
3. **不要只做教师端 authoring**：必须把发布、开课、学生完成、证据回写、operator visibility 一起纳入。
4. **不要只证明 happy path**：必须显式覆盖断线、重复提交、失败重试、发布回滚、插件 disable、worker backlog、Redis degraded。
5. **不要让 operator 继续依赖研发**：现场故障必须有 school/support 可执行的 next step。
6. **不要让 production readiness 只停留在文档**：health、backup、restore、load、release gate 都必须是可执行 artifact。

### Phase-specific warnings

- **Phase 1**：若试点口径不冻结，后续 phases 会被“整体生产化升级”吞掉。
- **Phase 2**：最容易滑向“通用插件框架建设”，而不是课堂互动插件真实能力。
- **Phase 3**：最容易只打通设计和展示，不补发布、开课、提交、结束、证据闭环。
- **Phase 4**：最容易只有研发能恢复，operator 没有真实动作面。
- **Phase 5/6**：最容易只有技术基线，没有 rollout、灰度、回滚与课堂场景容量验证。

## What Not to Include in v3.1

以下内容应明确排除出 v3.1：

- PostgreSQL / pgvector 切库
- Kafka / NATS / Redis Streams / 第二套事件平台
- Kubernetes / Helm / ArgoCD / service mesh
- Prometheus + Grafana + Loki / ELK 等完整观测平台建设
- Temporal / 通用 workflow engine
- 新建第二套 admin / operator 后台
- Cypress 或第二套 E2E 栈
- 通用 plugin marketplace、安装评分、商店流程
- 多校多租户运营体系
- Agent runtime / skill runtime 真执行
- 任意第三方远程插件执行
- 以“生产化”为名重写 WebSocket、Redis fanout、BullMQ 或 plugin host 主骨架

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | 主栈与新增生产支撑栈边界清楚，且大量内容已由项目现状和官方资料验证。 |
| Features | HIGH | 样板链路、table stakes、defer 范围收敛非常清晰。 |
| Architecture | HIGH | authoritative flow、integration points、build order、truth boundary 都高度一致。 |
| Pitfalls | HIGH | 风险集中且可操作，四份研究对主风险判断几乎一致。 |

**Overall confidence:** HIGH

### Gaps to Address

- **课堂互动插件样板类型仍需最终冻结**：应在 requirements 阶段明确是投票、问答、抢答、即时反馈还是其他单一强样板。
- **试点容量口径需定量化**：需要把“单课堂人数、同时在线课堂数、广播频率、提交峰值、可接受延迟”写成数字门槛。
- **operator 角色切分需落细**：研发诊断视图与学校实施/support 视图的分层需要在规划中写清。
- **恢复动作矩阵需具体化**：retry、reconcile、resume、suspend、fallback 分别适用于哪些失败类型，需要在 phase planning 中细化。
- **proof artifact 需要前置定义**：每个 phase 启动时就定义要交什么 evidence，而不是 close 时再补。

## Sources

### Primary (HIGH confidence)
- `.planning/research/STACK.md` — v3.1 生产支撑栈、baseline 与不应新增项。
- `.planning/research/FEATURES.md` — 样板链路、table stakes、requirement categories 与 defer 边界。
- `.planning/research/ARCHITECTURE.md` — authoritative write path、integration points、production layers 与 build order。
- `.planning/research/PITFALLS.md` — 单校试点导向下的 critical pitfalls、phase warnings、roadmap implications。
- `.planning/PROJECT.md` — 当前项目约束、durable truth posture、既有能力与下一 milestone 总目标。
- `.planning/MILESTONES.md` / `.planning/STATE.md` — 已交付 baseline、planning 状态、deferred lessons。

### Documentation-verified via research
- Next.js / Auth.js / Drizzle / GitHub Actions / Pino / Sentry / Litestream / restic / k6 官方文档与 Context7 校验结果，已在各分研究文件中引用。

---
*Research completed: 2026-05-24*  
*Ready for requirements: yes*  
*Ready for roadmap: yes*
