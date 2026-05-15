# OpenLearn Next

## What This Is

OpenLearn Next 是一个面向未来教育的 AI 原生开源操作系统，核心是基于步骤的课堂流程引擎、AI 多 Agent 协作平台和开放插件生态。它让教师把课堂拆成导入、讲授、互动、练习、总结等可编排原子步骤，并为教师配备可协同产出教学包的 AI 团队。

系统面向学校、教师、学生、家长、开发者和 AI Agent，首发聚焦可运行的课堂编排与学习闭环，而不是一次性铺满完整教育 SaaS。

## Core Value

教师可以用可编程步骤编排一节课，并让学生端按进度可追踪地完成课堂流程。

## Current Milestone: v2.0 Runtime Platform Foundations

**Goal:** 把 OpenLearn Next 从当前单体教学应用推进为可渐进迁移的 Runtime Platform 骨架，并至少跑通一条真实的 sandboxed runtime-hosted courseware 链路。

**Target features:**
- 在主工程内引入 V2 边界：`src/features/*`、`packages/contracts/*`、runtime/plugin 适配层与 compatibility re-export。
- 交付最小 `Runtime Host + iframe sandbox + TeachingBridge` 主链路，并以 `HTML courseware` 作为首个内置 runtime 试点。
- 引入 canonical runtime event envelope、durable event log/outbox、runtime session persistence 与 inspector/audit timeline。
- 为 PostgreSQL、Redis/Event Bus、WebSocket 建立迁移 seam，但本 milestone 不做正式基础设施 cutover。
- 保持现有 `lesson -> launch -> classroom -> evidence` 主链路可继续运行，并以兼容回归作为安全门。

## Current Planning Posture

- 当前 active milestone 为 `v2.0 Runtime Platform Foundations`。
- 这轮 scope 以 V2 架构骨架和 runtime pilot 为先，不以补完旧 backlog 为主要目标。
- 当前 milestone 采用渐进兼容策略：直接重组主工程，但不接受 big-bang rewrite。
- `COURSE-07`、`AUTH-01`~`AUTH-06`、`DATA-01`~`DATA-05`、`CLASS-05` 仍保留为 project-level safety gaps，需要在 V2 过程中被收紧或纳入安全门。
- PostgreSQL、Redis/Event Bus、WebSocket 在本轮只建立 seam 和 adapter，不作为正式 cutover 的完成条件。

## Requirements

### Validated

- [x] 建立 Next.js 16 + React 19.2 + Turbopack 的应用基础设施。
- [x] 使用 Auth.js v5、Drizzle ORM 和 SQLite 首发实现角色鉴权基础。
- [x] 建立 DAL 边界，禁止 UI 组件直接访问数据库。
- [x] 实现 `users`、`accounts`、`sessions` 以及角色扩展的基础认证数据模型。
- [x] 使用 `proxy.ts` 做轻量路由保护，复杂鉴权下沉到 Server Actions 和 DAL。
- [x] 建立课程、课时和步骤模型，支持 `content`、`task`、`quiz` 三类原子步骤。
- [x] 实现教师端教案编辑器与 LexoRank 无级联拖拽排序。
- [x] 实现草稿自动保存和 Server Actions 写入后的缓存失效。
- [x] 实现学生端 PPR 播放器和基于 `StepProgress` 的断点续播。
- [x] 实现 Edge Runtime SSE 课堂广播，并支持 locked/unlocked 课堂模式。
- [x] 实现 Append-only `TaskSubmissions`，通过 `isLatest` 优化读取并保留历史尝试。
- [x] 构建 AI Agent 与 RAG 的基础架构，包括 LessonAgent、HomeworkAgent、DataAgent、TutorAgent、ParentAgent 的可扩展接口。
- [x] 建立 JSON 声明式 Theme + Plugin 注册、权限校验和 Hook 执行框架。
- [x] 完成 Stitch MCP 读取与本地页面映射对齐，覆盖首页、教师端、课堂控制台、教案编辑器、学生端、资源页、课程页、批改页以及新增管理/设置页面。（Validated in Phases 8-9）
- [x] 完成全局视觉收敛，移除遗留 1px border/outline 交互样式，并统一 tonal layering、Primary Blue CTA、ghost-focus、glass nav 与响应式视觉层级。（Validated in Phase 10: Global Visual Polish）
- [x] 实现教师端教学流程编排器、预览与发布准备检查，具备真实课堂流程建模的基础能力。（Validated in Phase 17）
- [x] 实现学生播放器、课堂 SSE 同步、课堂控制台、断点续播与课堂锁定模式，具备课堂运行基础闭环。（Validated in Phases 4-5, 12, 17）
- [x] 实现基础教师评价页，可按学生查看 progress、latest attempts、history 与短反馈，具备过程性评价基础视图。（Validated in Phase 4）
- [x] 实现 Teaching Schedule OS、班级/学生管理与相关教师工作台入口，为真实教学实施提供排课和名册上下文。（Validated in Phase 18 + quick follow-ups）
- [x] 教师已可以围绕单节课完成教学环节设计、课前准备、课堂实施、课后复盘的一体化工作流。（Validated in Phases 21-26）
- [x] 学生已可以在课堂中看到清晰的活动目标、当前环节要求、提交状态与课堂节奏反馈，并完成过程性学习证据提交。（Validated in Phase 23）
- [x] 教师已可以在课堂运行中看到名册、出勤/在线状态、环节推进、学习进度、提交数量和需要干预的学生。（Validated in Phase 24）
- [x] 教师已可以在统一评价工作流中整合 progress、task、quiz、presence、observation、feedback 等多源证据，完成轻量过程性评价。（Validated in Phase 24）
- [x] 系统已可以沉淀课堂事件、参与记录、学习证据和教学干预数据，并生成可追溯的统计分析与复盘视图。（Validated in Phases 21, 25, 26）
- [x] 新增教师端规划、运行、评价、分析页面已继续对齐 Stitch 设计语言，并达到当前 milestone 目标下的产品化质量。（Validated in Phase 26）

### Active

- [ ] 系统在不破坏现有课堂主链路的前提下完成 V2 主工程边界重组，并建立清晰的 runtime、contract、plugin 接缝。
- [ ] 教师可以在现有 lesson/classroom 流程中运行一个 sandboxed `HTML courseware` runtime step，并让学生完成真实交互与提交。
- [ ] 系统对 runtime / plugin 行为形成 canonical event log、capability enforcement 与 inspector/audit timeline。
- [ ] 系统为 PostgreSQL、Redis/Event Bus、WebSocket 建立后续迁移 seam，但本里程碑不把这些高风险 cutover 绑为完成条件。

### Carry-over safety gaps

- [ ] `COURSE-07` 仍未完成：课程学生关联管理继续保留为后置业务 gap。
- [ ] `AUTH-01` ~ `AUTH-06` 仍未整体标记为完成。
- [ ] `DATA-01` ~ `DATA-05` 仍未整体标记为完成。
- [ ] `CLASS-05` 仍需继续补证课堂 session durability 的完整 requirement 闭环。

### Out of Scope

- PostgreSQL 作为首发数据库 — 首发只实现 SQLite，后续再扩展多数据库部署路径。
- 完整移动原生 App — 当前以 Web 和响应式体验为主。
- 任意第三方插件代码执行 — 插件只允许声明式 JSON、受限 Hook 和 Core API 动作。
- 插件直接访问数据库或核心 API — 所有扩展必须走 `Event -> Hook -> Action -> Core API`。
- 完整 LMS 替代能力 — Moodle 等系统先通过 MCP/插件互联，不在 v1 复刻完整生态。
- 在 v2.0 内正式完成 PostgreSQL 主库切换 — 本轮先建立数据库方言与迁移 seam，再在后续 milestone 切换。
- 在 v2.0 内以 Redis/Event Bus 或 WebSocket 全面替换当前 SSE/同步写主链路 — 本轮先抽象 transport 和 event boundary，再分阶段迁移。
- 在 v2.0 内首发多 runtime、plugin marketplace 或完整 AI runtime — 先用一个内置 `HTML courseware` runtime pilot 验证平台内核。

## Context

OpenLearn Next 的产品判断是：课堂应成为可编程系统，教学应变成可计算流程。核心业务围绕教师编排课堂、学生按步骤参与、系统记录学习进度和提交、AI Agent 辅助生成与分析展开。

当前代码已经具备 `courses`、`courseClasses`、`courseEnrollments`、`lessons`、`publishedLessonVersions`、`lessonStepProgress`、`taskSubmissions`、`quizAttempts`、`classroomSessions`、`classroomParticipants`、`classroomEvents` 等核心 schema，也已经支持教师端编排、预览、发布，学生端学习与提交，课堂端 SSE 运行，以及基础教师评价与课表/名册能力。

这意味着“可运行的课堂闭环基础”已经存在，而当前 `v2.0 Runtime Platform Foundations` 的核心不是再做一轮 CRUD 扩写，而是把现有系统推进为可渐进迁移的 Runtime Platform。当前主工程仍以 `src/app` 为中心，已经有 `src/features/schedule/*` 这种 feature 化先例，但还没有真正落地 runtime host、runtime bridge、typed event/outbox、plugin lifecycle 与 monorepo-style contract packages。

这轮里程碑采用“单体内平台化”路线：继续保留现有 Next.js 16、Auth.js v5、Drizzle、SQLite、SSE、DAL + Server Actions 主干，同时在主工程内引入 `src/features/*`、`packages/contracts/*`、runtime/plugin 适配层与 compatibility re-export，并以一个 sandboxed `HTML courseware` runtime step 作为平台方向的首个真实演示链路。

用户角色采用 RBAC 与 ABAC 混合模型，包含超级管理员、学校管理员、教师、学生、家长、开发者和 AI Agent。所有 Server Actions 与 DAL 函数都必须验证 `userId`、`role` 和必要资源权限。

技术栈明确采用 Next.js 16 App Router、React 19.2、Turbopack、Auth.js v5、`@auth/drizzle-adapter`、Drizzle ORM、SQLite 首发、Nuqs 和 Zustand。Next.js 16 缓存策略必须显式控制，静态或长周期内容使用 `"use cache"`，写入后通过 `updateTag()` 或 `revalidateTag()` 保证 read-your-writes。

渲染策略应利用 PPR：导航、布局和公开课程框架作为静态外壳预渲染；学习进度、课堂状态、实时答题等用户态数据放入 `<Suspense>` 边界并流式加载。

数据库约束要求所有关联表设置 `onDelete: cascade`。高频提交表采用 Append-only 机制，`TaskSubmissions` 使用 `isLatest` 标记当前读取版本，并配合 Zod 做结构化校验。

AI 生态包括多 Agent 协同和 RAG 知识库。教材库支持 PDF 等多模态解析，向量库目标为 Qdrant；MCP 连接 Moodle、GitHub、Notion、企业微信/钉钉，并可接入 Next.js Devtools MCP 辅助开发期调试。

旧 v1.2 的课程导入范围明确限定为手动新建与批量导入，不在当前 backlog planning 起点自动扩写为真实外部系统导入。Moodle、Notion 等外部平台的真实同步或导入能力继续保留在后续里程碑候选范围内，通过 MCP 或专门的集成边界接入。

UI 设计源来自 Stitch 项目 `5322129002350954765`，项目名为“晨曦在线课堂”。后续实现页面时必须优先匹配同名或同职能页面：`首页 - OpenLear-Next (一屏精简版)` 对应首页，`教师工作台 - 简体中文版` 对应教师 dashboard，`课堂教学流程编排 - 优化布局版` 对应教案/步骤编排器，`学生仪表盘 - OpenLear-Next (新亮色版)` 对应学生 dashboard，`学生学习页面 - OpenLear-Next` 和 `全屏沉浸学习模式 - OpenLear-Next` 对应学生播放器，`课堂教学流程运行管理` 和 `课堂教学运行管理 - 优化版` 对应实时课堂控制台，`教学资源中心` 和 `课程中心` 对应资源与课程管理。

本地 `DESIGN.md` 定义视觉约束为 The Luminous Academy：Lexend 字体、简体中文界面、Sunlit Studio 风格、无 1px 分割线、以 surface tonal layering 取代边框、Primary Blue 渐变 CTA、glassmorphism 浮层、纯白 action card、柔和 ambient shadow。Stitch 设计系统补充 The Tactile Horizon：Anchor Blue、Growth Green、asymmetric balance、tonal islands、rounded-full 按钮和高级教育产品质感。

`OpenLearn-Next-V2-Architecture-Plan.md` 提供了 PostgreSQL、Redis Streams、WebSocket、`/apps`、`/packages`、`/runtimes`、插件生命周期和 runtime sandbox 的目标蓝图，但本 milestone 不把这些基础设施切换一次性绑定到交付成功。研究结论是：先用 typed bridge、canonical event log/outbox、runtime host、capability enforcement 和 transport abstraction 把平台边界立住，再分阶段推进数据库、事件总线和实时链路的正式 cutover。

## Constraints

- **Tech stack**: 必须使用 Next.js 16 App Router、React 19.2、Turbopack、Auth.js v5、Drizzle ORM、SQLite 首发 — 这是项目指定的基础技术路线。
- **Data access**: UI 组件禁止直连数据库，所有读写必须通过 DAL 和 Server Actions — 确保权限、DTO 清洗和未来扩展一致。
- **Runtime**: Node.js 20.9+ 为主，Edge Runtime 仅用于 SSE 实时同步 — 避免把复杂数据库鉴权放到边缘层。
- **Caching**: Next.js 16 必须显式缓存，写入后必须更新或失效 tag — 防止课堂进度和编辑器出现陈旧数据。
- **Database**: 首发只针对 SQLite，所有关联必须 cascade delete — 先降低部署复杂度，同时保证数据清理正确。
- **Realtime**: 课堂广播使用 SSE，支持 locked/unlocked — 满足教师强制跟随和学生自由浏览两种课堂模式。
- **Security**: 插件禁止 `eval()`、动态执行第三方代码、直接访问 DB 或核心 API — 插件只能走声明式权限与受限动作。
- **Design**: 页面实现必须参考 Stitch 项目 `5322129002350954765` 与 `DESIGN.md` — 避免通用模板化 UI，保持既定教育产品视觉语言。

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 使用 Next.js 16 + React 19.2 + Turbopack | 对齐未来生态、显式缓存、PPR 和极速构建目标 | — Pending |
| 首发仅支持 SQLite | 降低 v1 部署复杂度，先验证课堂流程核心价值 | — Pending |
| DAL + Server Actions 作为唯一数据访问入口 | 集中权限校验、DTO 清洗和缓存失效逻辑 | — Pending |
| 使用 `proxy.ts` 替代 `middleware.ts` | 对齐 Next.js 16 运行时约束，只做轻量保护 | — Pending |
| 课堂步骤排序采用 LexoRank | 支持拖拽重排时无级联更新，适合高频编辑 | — Pending |
| 学生提交采用 Append-only + `isLatest` | 保留所有尝试历史，同时优化最新提交读取 | — Pending |
| 插件系统采用声明式 JSON + Hook + Core API | 保持扩展能力同时控制安全边界 | — Pending |
| UI 实现绑定 Stitch 项目 `5322129002350954765` | 让首页、教师中心、学生端和课堂控制台继承既定设计 | — Pending |
| 旧 v1.2 的 Phase 14/15 继续只覆盖课程生命周期、关联与批量导入 | 保持 backlog 边界稳定，避免课程运营尾项继续吞掉课堂实施新范围 | — Pending |
| 课堂流程继续沿用现有线性步骤模型，并在需要时再评估 branching 或图式流程 | 先把真实课堂实施闭环做深，再决定是否进入更复杂流程结构 | — Pending |
| 过程性评价首发聚焦 evidence aggregation、observation、feedback 和 deterministic analytics | 先避免 gradebook 级复杂度，把教师日常教学决策所需信息做全 | — Pending |
| 统计分析首发必须基于现有真实课堂与学习数据计算，不依赖 AI 自动总结 | 先建立可信数据面，再叠加 DataAgent 或 insight narration | — Pending |
| v2.0 采用“单体内平台化”而非 big-bang rewrite | 在保留现有 Next.js、DAL 与课堂主链路的前提下建立 runtime boundary 与 contract，降低迁移 blast radius | — Pending |
| v2.0 首个 runtime 试点使用 `HTML courseware` + iframe sandbox + TeachingBridge | 用一条真实可运行的课件链路验证 Runtime Platform 方向，并为后续多 runtime 提供最小基准 | — Pending |
| v2.0 的事件系统先采用 canonical event log/outbox，不先把 Event Bus 变成 primary write path | 保住当前 read-your-writes、缓存失效和课堂同步正确性，再逐步引入 Redis/Event Bus | — Pending |
| PostgreSQL、Redis/Event Bus、WebSocket 本轮只建立 seam，不做正式 cutover | 避免基础设施大迁移与 runtime host 重构耦合失控 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-15 after starting milestone v2.0 Runtime Platform Foundations*
