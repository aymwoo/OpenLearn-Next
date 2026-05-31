# AGENT.md - OpenLearn Next 架构与开发规范指南

## 一、 项目定位与核心愿景 (Project Overview)

**OpenLearn Next** 是一个面向未来教育的 AI 原生开源操作系统\[1\]。核心定位为：**基于步骤的课堂流程引擎 + AI 多 Agent 协作平台 + 开放插件生态**\[1\]\[2\]。核心理念在于“让课堂成为可编程系统，让教学变成可计算流程”\[3\]。系统将为每位教师配备专属的 AI 团队，通过拖拽式编排将课堂划分为导入、讲授、互动、练习、总结等原子步骤.

### 用户角色 (RBAC & ABAC)

系统支持多角色细粒度权限管控：超级管理员、学校管理员、教师、学生、家长、开发者以及 AI Agent\[5\]。

\--------------------------------------------------------------------------------

## 二、 核心技术栈 (Tech Stack)

全面拥抱 Next.js 16 生态，废弃旧版隐式行为，强调**显式控制与边缘计算**\[6\]\[7\]：

**Framework:** Next.js v16 (App Router) + React 19.2\[8\]

**Bundler:****Turbopack** (默认开启，提升 2-5倍 生产构建与极速 HMR)\[9\]

**Authentication:** Auth.js (NextAuth v5) + @auth/drizzle-adapter\[2\]

**Database & ORM:** PostgreSQL / SQLite + Drizzle ORM (强制级联删除与高频索引)\[2\]\[10\]

**State Management:****Nuqs** (用于 URL 驱动的全局状态，如分页/筛选) + **Zustand** (用于复杂客户端交互状态)\[11\]\[12\]

**Runtime:** Node.js 20.9+\[13\] / Edge Runtime (仅限于 SSE 实时同步)\[14\]\[15\]

\--------------------------------------------------------------------------------

## 三、 全栈架构与渲染策略最佳实践 (Next.js 16 Rules)

### 1\. 显式缓存模型 (Cache Components)

废弃 Next.js 15 的隐式 `fetch` 缓存模型，全面采用显式的 `"use cache"` 指令\[16\]\[17\]。

**静态/长周期内容**：对不常变动的组件（如公开教材、基础框架）使用 `"use cache"` 配合 `cacheLife` 策略\[18\]。

**缓存更新 (Read-your-writes)**：在 Server Actions 中执行数据写入后，**强制使用** `updateTag()` **或** `revalidateTag()` 使缓存立即失效，保证数据一致性\[19\]。

### 2\. 局部预渲染 (PPR: Partial Prerendering)

利用 Next.js 16 稳定的 PPR 特性，实现动静结合\[20\]\[21\]。

**静态外壳 (Static Shell)**：页面基础布局、导航栏等静态内容在构建时预渲染，实现毫秒级 TTFB\[22\]。

**动态流 (Dynamic Streaming)**：用户专属数据（如学习进度、购物车、实时答题）必须包裹在 `<Suspense>` 边界内，利用流式渲染在后台拉取\[23\]\[24\]。

### 3\. 数据访问层 (DAL) 与 Server Actions

**严禁 UI 组件直连数据库**：所有数据操作必须通过服务端的数据访问层 (DAL) 进行，并进行 DTO（数据传输对象）清洗。

**鉴权拦截**：`Server Actions` 和 DAL 函数内部必须调用 Auth.js 验证上下文 (`userId`, `role`)。

### 4\. 边缘网络拦截 (proxy.ts)

全面使用 `proxy.ts`（运行在 Node.js 运行时）替代旧版的 `middleware.ts`\[25\]\[26\]。

`proxy.ts` 仅处理轻量级的请求重写、重定向以及基于 Cookie 的初步访问保护\[15\]\[27\]，复杂的鉴权请后置于 Server Actions 或 DAL 中。

\--------------------------------------------------------------------------------

## 四、 核心业务模块设计

### 1\. 智能课堂编排与执行系统

**拖拽排版与 LexoRank 算法**：基于高效率 `LexoRank` 算法，在服务端支持无级联拖拽重排 (Order Rank)，草稿自动保存\[10\]\[28\]。

**实时课堂 (ActiveSession)**：基于 Edge Runtime 部署 SSE (Server-Sent Events) 服务\[14\]。支持“强制跟随 (locked)”与“自由模式 (unlocked)”切换。

**学生端播放器与断点续播**：系统根据 `StepProgress` 表自动定位进度。

### 2\. 数据库 Schema 约束

数据库所有关联表**必须设定** `onDelete: cascade` **级联删除**\[28\]。

**基础认证表**：`users` (包含角色扩展)、`accounts`、`sessions`\[14\]。

**课程表结构**：`Lessons` -> `Steps` (通过 `lessonId` 级联关联，支持 `content`, `task`, `quiz` 三种原子形态)\[28\]。

**高频写入表优化**：针对学生的 `TaskSubmissions` (作业提交表) 采用 **Append-only** 机制。引入 `isLatest` 字段并结合 Zod 结构化校验，确保读取性能且记录所有尝试过程\[10\]。

\--------------------------------------------------------------------------------

## 五、 AI 系统与 RAG 生态 (AI & MCP Ecosystem)

### 1\. 原生多 Agent 协同体系

为教师配备由 LLM 驱动的全能助理\[29\]：

`LessonAgent` (教案编排与生成)、`HomeworkAgent` (作业自动批改)、`DataAgent` (学情风险分析预警)、`TutorAgent` (学生答疑)、`ParentAgent` (家校沟通方案)。

多个 Agent 可响应统一的指令并协同工作输出完整教学包\[30\]。

### 2\. RAG 知识库与 MCP 协议互联

**教材库 (RAG)**：支持 PDF 等多模态解析，利用 Qdrant 向量数据库实现基于校本教材的精准溯源问答\[30\]。

**模型上下文协议 (MCP)**：将外部工具转化为 AI Skills，支持对接 Moodle、GitHub、Notion、企业微信/钉钉，并引入 `Next.js Devtools MCP` 以提供开发阶段的实时 AI 上下文调试\[25\]\[30\]。

\--------------------------------------------------------------------------------

## 六、 统一扩展插件机制 (Theme + Plugin Spec)

系统的所有功能扩展必须遵循统一、安全、声明式的框架协议，将 Theme(UI 扩展) 与 Plugin(逻辑扩展) 合二为一\[31\]。

### 1\. 声明式 JSON 配置驱动

扩展必须基于严格的 JSON 配置，包含清单：`{ "name": "example-extension", "type": "theme | plugin", "version": "1.0.0", "permissions": [], "ui": {}, "hooks": {} }`\[32\]。

### 2\. 安全性第一 (Safety First Principles)

**绝对禁止的动作**：禁止使用 `eval()`、动态导入执行第三方用户代码、禁止插件直接访问数据库 (DB) 或直接调用核心 API\[33\]。

**沙箱执行流程**：必须遵循 `Event → Hook → Action → Core API` 的规范\[33\]。

**上下文注入**：系统执行插件动作前必须校验其 `permissions` 声明，且只能注入安全的上下文参数：`{ userId: string, lessonId?: string, courseId?: string }`\[34\]。

### 3\. 可扩展 Hook 锚点

**UI 注入点**：`dashboard.widget`, `lesson.sidebar` 等\[34\]。

**行为注入点**：`onLessonComplete`, `onUserLogin` 等\[34\]。允许的开放行为目前限制为：`addPoints` (积分系统)、`createNotification` (发送通知) 等受限动作\[33\]。

\--------------------------------------------------------------------------------

## 七、 演进路线与开发优先级 (Roadmap & Priority)

开发进度请严格遵守以下优先级以降低风险\[35\]\[36\]：

**Phase 1 - 基础设施构建**：落地 Next.js 16 + Turbopack + Drizzle DAL，建立 `users/accounts` 角色鉴权机制，并利用 `proxy.ts` 进行路由保护。建立基于 Nuqs 与 Zustand 的状态管理基线\[11\]。

**Phase 2 - 教案编辑器与排序**：构建 `Lessons` 与 `Steps`，实现 LexoRank 无级联拖拽重排与草稿系统（核心使用 Server Actions）。

**Phase 3 - PPR 播放器与断点追踪**：实现基于局部预渲染 (PPR) 的学生端播放器，静态渲染课程框架，利用 `<Suspense>` 加载动态学习进度 (`StepProgress`)。

**Phase 4 - 实时同步与高频提交**：通过 Edge Runtime 开发 SSE 课堂广播接口；实现 Append-only 模式的高频 `TaskSubmissions`\[10\]。

**Phase 5 - AI 与 插件扩展体系**：构建 Agent RAG 工作流；实现 JSON 驱动的 Plugin 注册表架构及权限校验 Hook 引擎\[36\]。
---

