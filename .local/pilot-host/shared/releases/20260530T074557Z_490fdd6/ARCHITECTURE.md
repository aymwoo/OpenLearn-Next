# OpenLearn-Next 架构文档

## 1. 技术栈概览

```
┌─────────────────────────────────────────────────────────────┐
│                         前端                                  │
│  Next.js 16 (App Router) + React 19 + TypeScript 6          │
│  Tailwind CSS 4 + Radix UI + Lucide Icons                  │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                    认证层 (NextAuth 5)                       │
│         CredentialsProvider + JWT + DrizzleAdapter          │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                   服务端逻辑层                                │
│  Server Actions → DAL → DTO → Database                     │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                       数据层                                 │
│     SQLite/Turso + Drizzle ORM + @auth/drizzle-adapter      │
└─────────────────────────────────────────────────────────────┘
```

## 2. 核心依赖

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js | 16.2.4 |
| UI | React | 19.2.5 |
| 类型 | TypeScript | 6.0.3 |
| ORM | Drizzle ORM | 0.45.2 |
| 认证 | NextAuth | 5.0.0-beta.31 |
| 数据库 | libSQL/Turso | 0.17.3 |
| 样式 | Tailwind CSS | 4.2.4 |
| 验证 | Zod | 4.4.3 |
| 图表 | Mermaid | 11.15.0 |
| 测试 | Playwright | 1.59.1 |

## 3. 目录结构

```
src/
├── app/                    # Next.js App Router
│   ├── (admin)/           # 管理员路由组
│   ├── (auth)/           # 认证路由组
│   ├── (classroom)/      # 教室路由组
│   ├── (library)/        # 资源库路由组
│   ├── (public)/         # 公开路由组
│   ├── (student)/        # 学生路由组
│   ├── (teacher)/        # 教师路由组
│   ├── api/              # API 路由
│   │   ├── auth/         # NextAuth API
│   │   └── classroom/    # 教室 SSE
│   ├── help/             # 帮助中心
│   ├── login/             # 登录页
│   ├── settings/          # 设置页
│   └── layout.tsx         # 根布局
│
├── actions/               # Server Actions (服务端操作入口)
│   ├── auth-actions.ts
│   ├── classroom-actions.ts
│   ├── course-authoring-actions.ts
│   ├── course-import-actions.ts
│   ├── learning-actions.ts
│   ├── lesson-authoring-actions.ts
│   ├── class-management-actions.ts
│   ├── schedule-*.ts
│   ├── ai-rag-actions.ts
│   ├── mcp-actions.ts
│   ├── plugin-actions.ts
│   ├── resource-actions.ts
│   └── theme-actions.ts
│
├── components/            # React 组件
│   ├── ui/               # 基础 UI 组件
│   ├── classroom/        # 教室组件
│   ├── courses/          # 课程组件
│   ├── authoring/        # 创作组件
│   ├── learning/         # 学习组件
│   ├── shell/           # 布局壳
│   ├── surfaces/         # 表面组件
│   ├── theme/            # 主题组件
│   └── plugins/          # 插件组件
│
├── lib/                   # 核心库
│   ├── auth/             # 认证配置
│   │   ├── auth.ts       # NextAuth 实例
│   │   └── auth.config.ts # Edge 安全配置
│   ├── dal/              # 数据访问层
│   │   ├── user.ts
│   │   ├── membership.ts
│   │   ├── classroom.ts
│   │   ├── course-authoring.ts
│   │   ├── lesson-authoring.ts
│   │   ├── learning.ts
│   │   ├── class-management.ts
│   │   ├── resources.ts
│   │   ├── ai-rag.ts
│   │   ├── mcp.ts
│   │   ├── plugins.ts
│   │   ├── themes.ts
│   │   └── schedule-*.ts
│   ├── dto/              # 数据传输对象 (Zod schemas)
│   │   ├── user.ts
│   │   ├── membership.ts
│   │   ├── classroom.ts
│   │   ├── course-authoring.ts
│   │   ├── lesson-authoring.ts
│   │   ├── learning.ts
│   │   └── schedule.ts
│   ├── theme-layout/     # 主题布局系统
│   ├── utils.ts          # 工具函数 (cn)
│   ├── cache-policy.ts   # 缓存策略
│   └── navigation.ts     # 导航配置
│
├── server/               # 服务端模块
│   ├── ai/               # AI Agent
│   ├── mcp/              # MCP 服务器
│   ├── plugins/          # 插件系统
│   ├── rag/              # RAG 知识库
│   ├── schedule/         # 排课系统
│   └── themes/           # 主题系统
│
├── features/             # 功能模块
│   ├── class-management/  # 班级管理
│   └── schedule/         # 排课功能
│       ├── import/       # CSV 导入
│       ├── runtime/      # 运行时
│       ├── assistant/    # AI 助手
│       ├── reminders/    # 提醒
│       └── operations/  # 操作
│
├── db/                   # 数据库
│   ├── schema.ts         # Drizzle Schema
│   └── index.ts          # 数据库连接
│
└── types/                # 类型定义
```

## 4. 数据访问层级 (DAL)

```
┌─────────────────────────────────────────────────────────────────┐
│                    UI 层 (RSC / Client)                         │
│         React Components → never touch DB directly             │
└─────────────────────────────┬───────────────────────────────────┘
                              │ Server Actions
┌─────────────────────────────▼───────────────────────────────────┐
│                   Server Actions 层                             │
│     auth-actions | classroom-actions | course-*.ts | ...       │
│     验证输入 → 调用 DAL → 返回结果                               │
└─────────────────────────────┬───────────────────────────────────┘
                              │ DAL Queries
┌─────────────────────────────▼───────────────────────────────────┐
│                   DAL 层 (src/lib/dal/)                         │
│   classroom.ts | course-authoring.ts | learning.ts | ...       │
│   - 数据库查询                                                   │
│   - 业务逻辑处理                                                │
│   - 不返回敏感字段 (如 password)                                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │ DTO Transform
┌─────────────────────────────▼───────────────────────────────────┐
│                   DTO 层 (src/lib/dto/)                         │
│           Zod schemas: UserDTO, MembershipDTO, ...              │
│           数据验证和转换                                        │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                    数据库层 (SQLite/Turso)                      │
│              Drizzle ORM + @auth/drizzle-adapter                │
└─────────────────────────────────────────────────────────────────┘
```

## 5. 路由组结构

```
┌──────────────────────────────────────────────────────────────────┐
│                         路由组架构                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  (public)      /          公开首页                                 │
│                                                                  │
│  (auth)        /auth/*    认证相关 (unauthorized)                │
│                                                                  │
│  (teacher)     /teacher/* 教师专属                               │
│                  ├─ /teacher/courses     课程管理                 │
│                  ├─ /teacher/editor     课程编辑                 │
│                  ├─ /teacher/students    学生管理                 │
│                  └─ ...                                          │
│                                                                  │
│  (student)     /student/* 学生专属                               │
│                  ├─ /student/player     学习播放器                │
│                  └─ ...                                          │
│                                                                  │
│  (admin)       /admin/*   管理员专属                              │
│                                                                  │
│  (classroom)   /classroom/* 教室功能                             │
│                                                                  │
│  (library)     /courses/*  资源库                                 │
│                  ├─ /courses           课程列表                  │
│                  └─ /resources         资源中心                  │
│                                                                  │
│  help/         /help/*    帮助中心                                │
│  settings/     /settings/* 设置                                  │
│  login/        /login     登录页                                  │
│  api/          /api/*     API 路由                                │
│                  ├─ /api/auth/*    NextAuth                     │
│                  └─ /api/classroom/* SSE 教室事件               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## 6. 认证模式

```
┌─────────────────────────────────────────────────────────────────┐
│                      认证架构                                    │
│                                                                  │
│  ┌──────────────┐     ┌──────────────────┐     ┌──────────────┐ │
│  │   教师       │     │     学生         │     │   管理员     │ │
│  │ email+password│    │ studentNumber+pwd │     │  ...        │ │
│  └──────┬───────┘     └────────┬─────────┘     └──────┬───────┘ │
│         │                     │                       │         │
│         └─────────────────────┼─────────────────────┘         │
│                               ▼                                 │
│                   ┌─────────────────────┐                       │
│                   │ CredentialsProvider │                       │
│                   └──────────┬──────────┘                       │
│                              │                                  │
│         ┌────────────────────┼────────────────────┐            │
│         ▼                    ▼                    ▼            │
│  ┌────────────┐     ┌────────────┐     ┌────────────┐            │
│  │   JWT      │     │ DrizzleAdapter│   │ Session   │            │
│  │  Strategy  │     │   (DB)      │     │ (DB)      │            │
│  └────────────┘     └────────────┘     └────────────┘            │
│                               │                                  │
│         ┌─────────────────────┼─────────────────────┐          │
│         ▼                     ▼                     ▼            │
│  ┌────────────┐     ┌────────────┐     ┌────────────┐            │
│  │   users    │     │ memberships │     │ accounts  │            │
│  │  sessions  │     │ verification│     │           │            │
│  └────────────┘     └────────────┘     └────────────┘            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 角色体系

通过 `memberships` 表实现多角色支持：

| 角色 | 说明 |
|------|------|
| admin | 管理员 |
| teacher | 教师 |
| student | 学生 |
| parent | 家长 |
| developer | 开发者 |
| ai_agent | AI 代理 |

## 7. 数据模型关系

```
┌─────────────────────────────────────────────────────────────────┐
│                      核心实体关系                                │
│                                                                  │
│  ┌─────────┐       ┌─────────────┐                              │
│  │ schools │◄──────│ memberships │ (多对多 user-school)          │
│  └────┬────┘       └──────┬──────┘                              │
│       │                   │                                     │
│       │           ┌───────┴───────┐                             │
│       │           ▼               ▼                             │
│       │      ┌────────┐      ┌────────┐                        │
│       │      │  users │◄──────│ classes │                        │
│       │      └────────┘      └────┬────┘                        │
│       │                          │                              │
│       ▼                          ▼                              │
│  ┌─────────┐              ┌──────────┐                          │
│  │ courses │◄────────────│classMembers│ (多对多)                │
│  └────┬────┘              └──────────┘                          │
│       │                                                        │
│       ▼                                                        │
│  ┌─────────┐       ┌───────────┐      ┌────────────┐           │
│  │ lessons │◄──────│lessonSteps│      │ taskSubmiss│           │
│  └─────────┘       └───────────┘      └────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 关键表

**认证相关**
- `users` - 用户 (id, name, email, studentNumber, password, image)
- `accounts` - OAuth 账户
- `sessions` - 会话
- `verificationTokens` - 验证令牌

**组织架构**
- `schools` - 学校
- `memberships` - 成员身份 (user-school-role)
- `classes` - 班级
- `classMembers` - 班级成员

**课程相关**
- `courses` - 课程 (school-owner-title-subject-grade-status)
- `courseClasses` - 课程-班级关联
- `courseEnrollments` - 课程注册

**课时相关**
- `lessons` - 课时
- `lessonSteps` - 课时步骤 (type-payloadJson，使用 LexoRank 排序)
- `lessonMaterials` - 课时资料
- `publishedLessonVersions` - 已发布版本快照

**学习活动**
- `taskSubmissions` - 作业提交 (append-only, isLatest)
- `quizAttempts` - 测验尝试 (append-only, isLatest)
- `attemptFeedback` - 教师反馈

**教室实时**
- `classroomSessions` - 教室会话
- `classroomParticipants` - 参与者状态
- `classroomEvents` - 事件日志
- `classroomEvidence` - 证据采集

**排课系统**
- `scheduleTerm` - 学期
- `scheduleWeekPattern` - 周模式
- `scheduleBellSlot` - 课节
- `scheduleTeachingAssignment` - 教学分配
- `scheduleRecurringEntry` - 循环课程
- `scheduleOverride` - 代课/调课

**AI / MCP**
- `agentRegistry` - AI Agent 注册
- `mcpServers` - MCP 服务器
- `knowledgeSources` / `knowledgeChunks` - RAG 知识库

## 8. Server Actions 与 DAL 对应关系

```
┌─────────────────────────────────────────────────────────────────┐
│                    Server Actions → DAL                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  auth-actions.ts           →  (无 DAL, 直接操作 users 表)        │
│                                                                  │
│  classroom-actions.ts     →  dal/classroom.ts                    │
│                                                                  │
│  course-authoring-actions.ts → dal/course-authoring.ts           │
│                              dal/course-import.ts               │
│                                                                  │
│  lesson-authoring-actions.ts → dal/lesson-authoring.ts           │
│                                                                  │
│  learning-actions.ts      →  dal/learning.ts                     │
│                                                                  │
│  class-management-actions.ts → dal/class-management.ts          │
│                                                                  │
│  schedule-import-actions.ts → dal/schedule-import.ts             │
│  schedule-operations-actions.ts → dal/schedule-operations.ts     │
│  schedule-assistant-actions.ts → dal/schedule-assistant.ts       │
│  schedule-reminder-actions.ts → dal/schedule-reminders.ts        │
│                                                                  │
│  resource-actions.ts     →  dal/resources.ts                     │
│                                                                  │
│  ai-rag-actions.ts       →  dal/ai-rag.ts                        │
│                                                                  │
│  mcp-actions.ts         →  dal/mcp.ts                           │
│                                                                  │
│  plugin-actions.ts      →  dal/plugins.ts                       │
│                                                                  │
│  theme-actions.ts       →  dal/themes.ts                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 9. 教室实时系统 (SSE)

```
┌─────────────────────────────────────────────────────────────────┐
│                    教室实时架构                                  │
│                                                                  │
│  ┌─────────┐    SSE Events    ┌─────────┐                      │
│  │ Client  │◄───────────────│ /api/classroom│                   │
│  │(Student)│                 │ /[sessionId] │                  │
│  └────┬────┘                 │ /events       │                  │
│       │                      └────────┬───────┘                  │
│       │                              │                          │
│       │    ┌──────────────────────────┘                          │
│       │    │                                                   │
│       │    ▼                                                   │
│  ┌────┴────┐      ┌────────────┐      ┌────────────┐          │
│  │Teacher  │      │Classroom   │      │  DAL       │          │
│  │Control  │─────►│  Service   │─────►│ classroom  │          │
│  └─────────┘      └────────────┘      └────────────┘          │
│                                                                  │
│  支持模式:                                                       │
│  - locked: 教师控制步骤                                         │
│  - unlocked: 学生自由导航                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 10. 排课系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      排课系统架构                                │
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │ CSV Importer │     │Connector API│     │ Manual Entry │    │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘    │
│         │                    │                    │            │
│         └────────────────────┼────────────────────┘            │
│                              ▼                                   │
│                   ┌─────────────────────┐                       │
│                   │  schedule-import    │                       │
│                   │  (Server Actions)   │                       │
│                   └──────────┬──────────┘                       │
│                              │                                  │
│         ┌────────────────────┼────────────────────┐             │
│         ▼                    ▼                    ▼             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  schedule   │    │  schedule   │    │  schedule   │         │
│  │  Term       │    │  BellSlot   │    │  Recurring  │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐                         │
│  │ AI Assistant │     │   Reminders  │                         │
│  │ (Proposals)  │     │   (Dispatch) │                         │
│  └──────────────┘     └──────────────┘                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 11. AI / RAG 系统

```
┌─────────────────────────────────────────────────────────────────┐
│                      AI / RAG 架构                              │
│                                                                  │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐    │
│  │   Agent    │      │    MCP      │      │    RAG      │    │
│  │  Registry  │      │   Servers   │      │  Knowledge  │    │
│  └──────┬──────┘      └──────┬──────┘      └──────┬──────┘    │
│         │                    │                    │             │
│         └────────────────────┼────────────────────┘             │
│                              ▼                                   │
│                   ┌─────────────────────┐                       │
│                   │   Server Actions    │                       │
│                   │  ai-rag-actions.ts  │                       │
│                   │   mcp-actions.ts    │                       │
│                   └──────────┬──────────┘                       │
│                              │                                  │
│         ┌────────────────────┼────────────────────┐             │
│         ▼                    ▼                    ▼             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ agentRegistr│    │ mcpServers │    │knowledgeSrc │         │
│  │ agentPropos │    │ mcpCapabil │    │knowledgeCnks│         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 12. 缓存策略

```
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js 16 缓存策略                          │
│                                                                  │
│  cacheComponents: true (全局开启组件缓存)                        │
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐                   │
│  │   "use cache"   │    │    <Suspense>    │                   │
│  │  (静态/公开内容) │    │  (动态/用户数据) │                   │
│  └────────┬────────┘    └────────┬────────┘                   │
│           │                      │                              │
│           ▼                      ▼                              │
│  ┌─────────────────────────────────────────┐                   │
│  │         Cache Tags (集中管理)            │                   │
│  │         src/lib/cache-policy.ts         │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                  │
│  更新流程:                                                       │
│  Server Action 写操作 → updateTag() / revalidateTag()          │
│  → 确保写入者立即看到自己的更改                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 13. 设计系统规则

| 规则 | 说明 |
|------|------|
| 字体 | Lexend (Google Fonts) |
| 语言 | 简体中文 UI |
| 边框 | 不使用 1px solid borders 分隔，使用 tonal surface 分层 |
| 主色调 | `surface`, `surface-container-low`, `surface-container-lowest` |
| CTA 按钮 | 渐变填充 (primary → primary_container) 135° 角 |
| 浮动元素 | 玻璃态效果 (backdrop-blur) |
| 工具函数 | `cn()` from `src/lib/utils.ts` |

## 14. 关键设计模式

### LexoRank 步骤排序
- `lessonSteps.rank` 使用 LexoRank 字符串，非整数位置
- 拖拽排序必须通过 `src/lib/ranking/lexorank.ts`
- 避免批量更新其他行的整数位置

### Append-Only 提交
- `taskSubmissions` 和 `quizAttempts` 是追加型表
- 每次写入: (1) 事务中清除前序 `isLatest`, (2) 插入新行 `isLatest: true`
- 保留完整的尝试历史

### Auth Split Pattern
- `auth.config.ts` - Edge 安全配置，无 Drizzle 导入
- `auth.ts` - 完整实例，含 DrizzleAdapter
- `proxy.ts` - 仅导入 authConfig，保护 `/teacher`, `/student`, `/classroom`, `/admin`

## 15. 系统完整结构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          客户端层 (Browser)                                  │
│    React Components + Server Actions + Suspense + SSE                      │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────────────┐
│                          Next.js 16 App Router                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        路由组 (Route Groups)                         │   │
│  │  (teacher)          │ (student)     │ (admin)   │ (classroom)     │   │
│  │  /teacher/*        │ /student/*    │ /admin/*  │ /classroom/*    │   │
│  │  课程管理/编辑      │ 学习播放器     │ 系统管理   │ 实时教室        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    布局系统 (Layouts + Surfaces)                     │   │
│  │  TeacherCourseCenterSurface │ LessonEditorSurface │ ...            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │ Server Actions
┌─────────────────────────────────────▼───────────────────────────────────────┐
│                         Server Actions 层                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │auth-actions  │ │course-*.ts    │ │learning-    │ │classroom-    │     │
│  │              │ │              │ │actions.ts   │ │actions.ts    │     │
│  ├──────────────┤ ├──────────────┤ ├──────────────┤ ├──────────────┤     │
│  │lesson-       │ │class-       │ │schedule-*.ts│ │ai-rag-       │     │
│  │authoring.ts  │ │management.ts│ │              │ │actions.ts    │     │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘     │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │ DAL Queries
┌─────────────────────────────────────▼───────────────────────────────────────┐
│                          DAL 层 (src/lib/dal/)                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  业务逻辑处理 │ 权限校验 │ 数据转换 │ 缓存管理                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  │ classroom   │ │ course-     │ │ lesson-     │ │  learning    │        │
│  │ .ts         │ │ authoring   │ │ authoring   │ │  .ts         │        │
│  ├─────────────┤ ├─────────────┤ ├─────────────┤ ├─────────────┤        │
│  │ class-      │ │ resources   │ │ schedule-* │ │  ai-rag      │        │
│  │ management  │ │ .ts         │ │             │ │              │        │
│  ├─────────────┤ ├─────────────┤ ├─────────────┤ ├─────────────┤        │
│  │ plugins     │ │ themes      │ │ mcp         │ │              │        │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘        │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │ DTO Transform
┌─────────────────────────────────────▼───────────────────────────────────────┐
│                        DTO 层 (src/lib/dto/)                                │
│          Zod schemas: UserDTO | CourseDTO | LessonDTO | ...                 │
│          数据验证、类型转换、敏感字段过滤                                    │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────────────┐
│                      数据库层 (SQLite/Turso)                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Drizzle ORM + @auth/drizzle-adapter              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │  users   │ │ courses  │ │  lessons │ │classroom │ │ schedule │        │
│  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤        │
│  │memberships│ │lessonSteps│ │taskSubs  │ │classEvents│ │ mcpServers│        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 16. 插件架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           插件系统架构                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                       插件注册层 (Plugin Registry)                  │    │
│  │                                                                       │    │
│  │   pluginRegistrations 表 ─────────────────────────────────────────►│    │
│  │        │                      │                                      │    │
│  │        ▼                      ▼                                      │    │
│  │   ┌──────────┐        ┌──────────────┐        ┌──────────────┐    │    │
│  │   │ manifest │        │  enabled     │        │   hooks      │    │    │
│  │   │  JSON   │        │  killSwitch  │        │  anchors     │    │    │
│  │   └──────────┘        └──────────────┘        └──────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│  ┌─────────────────────────────────▼─────────────────────────────────────┐  │
│  │                      插件 Hook 锚点 (Hook Anchors)                     │  │
│  │                                                                       │  │
│  │   "dashboard.widget"  ←───  教师工作台挂件                           │  │
│  │   "lesson.sidebar"     ←───  课时侧边栏扩展                           │  │
│  │   "schedule.assistant"←───  排课AI助手                               │  │
│  │                                                                       │  │
│  │   触发点: 教师编辑课时 | 课堂进行中 | 排课建议                         │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│  ┌─────────────────────────────────▼─────────────────────────────────────┐  │
│  │                      插件动作分发 (Action Dispatch)                   │  │
│  │                                                                       │  │
│  │   允许的动作 (PLUGIN_ACTION_ALLOWLIST):                               │  │
│  │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │  │
│  │   │addStepSuggestion│  │annotateLesson  │  │suggestBuiltIn   │       │  │
│  │   │                 │  │                │  │TeachingStep     │       │  │
│  │   └─────────────────┘  └─────────────────┘  └─────────────────┘       │  │
│  │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │  │
│  │   │createSchedule  │  │createSchedule  │  │annotateSchedule │       │  │
│  │   │OverrideProposal│  │ReminderDraft   │  │Conflict         │       │  │
│  │   └─────────────────┘  └─────────────────┘  └─────────────────┘       │  │
│  │                                                                       │  │
│  │   权限模型:                                                           │  │
│  │   lesson:write:suggestion  →  课时写建议                              │  │
│  │   lesson:write:annotation  →  课时标注                               │  │
│  │   schedule:write:proposal  →  排课提案写入                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│  ┌─────────────────────────────────▼─────────────────────────────────────┐  │
│  │                       内置教学步骤插件                                 │  │
│  │                                                                       │  │
│  │   BUILT_IN_TEACHING_STEP_DEFINITIONS:                                 │  │
│  │   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │  │
│  │   │  warming-up     │  │   discussion   │  │   reflection   │       │  │
│  │   │   暖场活动      │  │   课堂讨论      │  │   课堂反思      │       │  │
│  │   ├────────────────┤  ├────────────────┤  ├────────────────┤       │  │
│  │   │   breakout     │  │   polling      │  │   exit-ticket  │       │  │
│  │   │   分组讨论      │  │   即时投票      │  │   出门票        │       │  │
│  │   └────────────────┘  └────────────────┘  └────────────────┘       │  │
│  │                                                                       │  │
│  │   每个步骤包含:                                                        │  │
│  │   - pluginName, builtInKey, stepType                                  │  │
│  │   - title, summary, defaultPayload                                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 插件工作流

```
┌─────────────────────────────────────────────────────────────────┐
│                      插件调用流程                                 │
│                                                                  │
│  1. 教师在课时编辑器中                                        │
│         │                                                      │
│         ▼                                                      │
│  2. 调用 Server Action → plugin-actions.ts                     │
│         │                                                      │
│         ▼                                                      │
│  3. DAL 校验权限 (assertActiveTeacher)                         │
│         │                                                      │
│         ▼                                                      │
│  4. dispatchPluginAction() 分发动作                           │
│         │                                                      │
│         ├──► addStepSuggestion    → 返回 stepSuggestion        │
│         ├──► annotateLesson        → 返回 lessonAnnotation      │
│         ├──► suggestBuiltInTeachingStep → 内置步骤建议           │
│         └──► createScheduleOverrideProposal → 排课提案          │
│                                                                  │
│  5. 创建审计日志 (pluginActionAudits 表)                       │
│         │                                                      │
│         ▼                                                      │
│  6. 返回 PluginActionResult 给前端                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 17. 教学环节 (Teaching Flow)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           教学完整环节                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 阶段一: 备课 (Preparation)                                           │   │
│  │                                                                       │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │   │
│  │  │ 创建课程      │→│ 创建课时      │→│ 编辑步骤     │                │   │
│  │  │ (course)     │  │ (lesson)     │  │ (lessonStep)│                │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │   │
│  │         │                                                    │        │   │
│  │         │    ┌─────────────────────────────────────────┐    │        │   │
│  │         └───►│        步骤类型 (Step Types)            │◄───┘        │   │
│  │              │                                         │            │   │
│  │              │  content (内容讲解)                      │            │   │
│  │              │    ↓ activityIntent: "explain"          │            │   │
│  │              │    ↓ estimatedMinutes: 12               │            │   │
│  │              │    ↓ evidenceExpectation: observation   │            │   │
│  │              │                                         │            │   │
│  │              │  task (练习任务)                         │            │   │
│  │              │    ↓ activityIntent: "practice"         │            │   │
│  │              │    ↓ estimatedMinutes: 15               │            │   │
│  │              │    ↓ evidenceExpectation: submission   │            │   │
│  │              │                                         │            │   │
│  │              │  quiz (测验)                             │            │   │
│  │              │    ↓ activityIntent: "check"            │            │   │
│  │              │    ↓ estimatedMinutes: 8                 │            │   │
│  │              │    ↓ evidenceExpectation: quiz-response │            │   │
│  │              └─────────────────────────────────────────┘            │   │
│  │                                                                    │   │
│  │  ┌──────────────────────────────────────────────────────────────┐  │   │
│  │  │ 插件扩展 (Plugin Extensions)                                  │  │   │
│  │  │  dashboard.widget │ lesson.sidebar │ schedule.assistant       │  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 阶段二: 发布 (Publishing)                                           │   │
│  │                                                                       │   │
│  │   lesson-authoring-actions.ts → publishLesson()                      │   │
│  │                                                                       │   │
│  │   发布流程:                                                          │   │
│  │   1. 验证课时完整性 (LessonPublishReadiness)                        │   │
│  │   2. 创建 publishedLessonVersions 快照                             │   │
│  │   3. 更新 lesson.publishedVersionId                                 │   │
│  │   4. 分配 LexoRank 排序                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 阶段三: 授课 (Live Classroom)                                        │   │
│  │                                                                       │   │
│  │   ┌──────────────────────────────────────────────────────────┐      │   │
│  │   │                 教室会话 (ClassroomSession)               │      │   │
│  │   │                                                          │      │   │
│  │   │  状态: launched → active → ended                         │      │   │
│  │   │  模式: locked (教师控制) | unlocked (学生自由导航)         │      │   │
│  │   └──────────────────────────────────────────────────────────┘      │   │
│  │                                                                       │   │
│  │   ┌────────────────┐    ┌────────────────┐    ┌────────────────┐     │   │
│  │   │  教师控制       │    │  学生参与      │    │  SSE 实时      │     │   │
│  │   │  startClassroom │    │  joinClassroom │    │  events       │     │   │
│  │   │  advanceStep    │◄──►│  submitAnswer  │◄──►│  broadcast    │     │   │
│  │   │  lock/unlock    │    │  viewProgress  │    │               │     │   │
│  │   └────────────────┘    └────────────────┘    └────────────────┘     │   │
│  │                                                                       │   │
│  │   ┌────────────────────────────────────────────────────────────┐      │   │
│  │   │              实时数据记录                                   │      │   │
│  │   │                                                          │      │   │
│  │   │  classroomEvents    ← 教师动作 (active_step_changed)      │      │   │
│  │   │  classroomEvidence  ← 学生证据 (submission/response)       │      │   │
│  │   │  classroomTimeline  ← 时间线 (presence/intervention)      │      │   │
│  │   │  lessonStepProgress ← 学生进度 (in_progress/completed)     │      │   │
│  │   └────────────────────────────────────────────────────────────┘      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 阶段四: 学习回顾 (Review & Submission)                               │   │
│  │                                                                       │   │
│  │   学生端 (learning-actions.ts):                                     │   │
│  │   1. getStudentLessonProgress() → 查看进度                           │   │
│  │   2. submitTaskAnswer() → taskSubmissions 表                        │   │
│  │   3. submitQuizAttempt() → quizAttempts 表                           │   │
│  │                                                                       │   │
│  │   ┌────────────────────────────────────────────────────────────┐      │   │
│  │   │                 Append-Only 提交历史                        │      │   │
│  │   │                                                          │      │   │
│  │   │  taskSubmissions:                                         │      │   │
│  │   │  - attemptNo 自增                                          │      │   │
│  │   │  - isLatest 标识最新                                       │      │   │
│  │   │  - 历史完整保留                                            │      │   │
│  │   │                                                          │      │   │
│  │   │  quizAttempts:                                            │      │   │
│  │   │  - 同上                                                    │      │   │
│  │   └────────────────────────────────────────────────────────────┘      │   │
│  │                                                                       │   │
│  │   教师端:                                                           │   │
│  │   - 查看学生提交 (attemptFeedback)                                   │   │
│  │   - 评价作业                                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 教学设计 (Teaching Design) 模型

每个课时步骤 (lessonStep) 都包含教学设计元数据：

```typescript
type TeachingDesign = {
  activityIntent: "explain" | "practice" | "check" | "explore" | "reflect";
  estimatedMinutes: number;
  activityMode: "mini-lecture" | "independent" | "group" | "assessment" | "discussion";
  evidenceExpectation: {
    evidenceType: "observation" | "submission" | "quiz-response" | "artifact";
    prompt: string;
    required: boolean;
    checklist: string[];
    tags: string[];
    studentVisibility: "teacher-only" | "class-visible" | "student-self";
  };
};
```

### 课时发布流程

```
createCourse → createLesson → addLessonStep → publishLesson
     │              │              │              │
     ▼              ▼              ▼              ▼
  courses        lessons      lessonSteps   publishedLessonVersions
                                                  │
                                                  ▼
                                           lesson.publishedVersionId
                                                  │
                                                  ▼
                                           学生可见该课时
```

---

## 18. 环境配置

```bash
# .env.local
DATABASE_URL=          # Turso/SQLite 连接
AUTH_SECRET=           # NextAuth 密钥
AUTH_URL=              # 认证 URL
```