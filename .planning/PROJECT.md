# OpenLearn Next

## What This Is

OpenLearn Next 是一个面向未来教育的 AI 原生开源操作系统，核心是基于步骤的课堂流程引擎、AI 多 Agent 协作平台和开放插件生态。它让教师把课堂拆成导入、讲授、互动、练习、总结等可编排原子步骤，并为教师配备可协同产出教学包的 AI 团队。

系统面向学校、教师、学生、家长、开发者和 AI Agent，首发聚焦可运行的课堂编排与学习闭环，而不是一次性铺满完整教育 SaaS。

## Core Value

教师可以用可编程步骤编排一节课，并让学生端按进度可追踪地完成课堂流程。

## Current Milestone: v1.2 Course Import & Management

**Goal:** 补齐课程导入与课程管理核心能力，让教师可以实际添加课程、管理课程，并从课程进入后续课时/教案管理流程。

**Target features:**
- 提供教师可用的课程中心，支持课程列表、查看和基础信息管理
- 支持手动新建课程，并补齐编辑、发布/下线、归档/删除等生命周期动作
- 支持课程与班级、学生的关联管理
- 支持批量导入课程，并返回逐行校验与导入结果反馈
- 提供从课程进入课时/教案管理的明确入口

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

### Active

- [ ] 教师可以在课程中心查看、创建、编辑、发布、归档和删除课程。
- [ ] 教师可以批量导入课程，并获得逐行校验、重复冲突与导入结果反馈。
- [ ] 教师可以为课程关联班级/学生，并从课程直接进入课时/教案管理流程。

### Out of Scope

- PostgreSQL 作为首发数据库 — 首发只实现 SQLite，后续再扩展多数据库部署路径。
- 完整移动原生 App — 当前以 Web 和响应式体验为主。
- 任意第三方插件代码执行 — 插件只允许声明式 JSON、受限 Hook 和 Core API 动作。
- 插件直接访问数据库或核心 API — 所有扩展必须走 `Event -> Hook -> Action -> Core API`。
- 完整 LMS 替代能力 — Moodle 等系统先通过 MCP/插件互联，不在 v1 复刻完整生态。

## Context

OpenLearn Next 的产品判断是：课堂应成为可编程系统，教学应变成可计算流程。核心业务围绕教师编排课堂、学生按步骤参与、系统记录学习进度和提交、AI Agent 辅助生成与分析展开。

当前代码已经具备 `courses`、`courseClasses`、`courseEnrollments`、`lessons` 等基础 schema 与部分 DAL / Server Action 能力，也已经支持教师创建课程草稿和课时草稿。但 `/teacher/courses` 的可用课程中心、批量导入闭环、课程关联管理以及从课程进入教案管理的教师工作流仍未完成，这也是本 milestone 的直接补齐目标。

用户角色采用 RBAC 与 ABAC 混合模型，包含超级管理员、学校管理员、教师、学生、家长、开发者和 AI Agent。所有 Server Actions 与 DAL 函数都必须验证 `userId`、`role` 和必要资源权限。

技术栈明确采用 Next.js 16 App Router、React 19.2、Turbopack、Auth.js v5、`@auth/drizzle-adapter`、Drizzle ORM、SQLite 首发、Nuqs 和 Zustand。Next.js 16 缓存策略必须显式控制，静态或长周期内容使用 `"use cache"`，写入后通过 `updateTag()` 或 `revalidateTag()` 保证 read-your-writes。

渲染策略应利用 PPR：导航、布局和公开课程框架作为静态外壳预渲染；学习进度、课堂状态、实时答题等用户态数据放入 `<Suspense>` 边界并流式加载。

数据库约束要求所有关联表设置 `onDelete: cascade`。高频提交表采用 Append-only 机制，`TaskSubmissions` 使用 `isLatest` 标记当前读取版本，并配合 Zod 做结构化校验。

AI 生态包括多 Agent 协同和 RAG 知识库。教材库支持 PDF 等多模态解析，向量库目标为 Qdrant；MCP 连接 Moodle、GitHub、Notion、企业微信/钉钉，并可接入 Next.js Devtools MCP 辅助开发期调试。

v1.2 的课程导入范围明确限定为手动新建与批量导入，不在本 milestone 接入真实外部系统导入。Moodle、Notion 等外部平台的真实同步或导入能力继续保留在后续 milestone，通过 MCP 或专门的集成边界接入。

UI 设计源来自 Stitch 项目 `5322129002350954765`，项目名为“晨曦在线课堂”。后续实现页面时必须优先匹配同名或同职能页面：`首页 - OpenLear-Next (一屏精简版)` 对应首页，`教师工作台 - 简体中文版` 对应教师 dashboard，`课堂教学流程编排 - 优化布局版` 对应教案/步骤编排器，`学生仪表盘 - OpenLear-Next (新亮色版)` 对应学生 dashboard，`学生学习页面 - OpenLear-Next` 和 `全屏沉浸学习模式 - OpenLear-Next` 对应学生播放器，`课堂教学流程运行管理` 和 `课堂教学运行管理 - 优化版` 对应实时课堂控制台，`教学资源中心` 和 `课程中心` 对应资源与课程管理。

本地 `DESIGN.md` 定义视觉约束为 The Luminous Academy：Lexend 字体、简体中文界面、Sunlit Studio 风格、无 1px 分割线、以 surface tonal layering 取代边框、Primary Blue 渐变 CTA、glassmorphism 浮层、纯白 action card、柔和 ambient shadow。Stitch 设计系统补充 The Tactile Horizon：Anchor Blue、Growth Green、asymmetric balance、tonal islands、rounded-full 按钮和高级教育产品质感。

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
| v1.2 先做手动新建与批量导入课程 | 先补齐教师真实可用的课程运营闭环，避免在同一 milestone 混入外部系统集成复杂度 | — Pending |
| 课程管理继续沿用 DAL + Server Actions + school-scoped 授权边界 | 课程、班级、学生关联都属于高风险学校数据，必须复用现有权限模型与缓存失效策略 | — Pending |

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
*Last updated: 2026-05-09 after milestone v1.2 definition*
