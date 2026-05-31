# Codebase Structure

**Analysis Date:** 2026-05-24

## Directory Layout

```
/home/wuxf/Develop/OpenLearn-Next/
├── src/
│   ├── app/                    # Next.js 16 App Router
│   ├── actions/                 # Server Actions
│   ├── components/              # 共享UI组件
│   ├── db/                      # Drizzle ORM
│   ├── features/                # 领域功能模块
│   ├── lib/                     # 核心库
│   ├── plugins/                 # 插件实现
│   ├── server/                  # 服务端工具
│   └── types/                   # 共享类型
├── drizzle/                     # 迁移文件
├── public/                      # 静态资源
└── docs/                        # 文档
```

## Route Groups (src/app/)

```
src/app/
├── (public)/                    # 公开首页 /
├── (teacher)/                   # 教师端 /teacher/*
│   ├── editor/                  # 教案编辑器
│   ├── review/                  # 作业批改
│   ├── students/                # 学生管理
│   └── schedule/                # 排课管理
├── (student)/                   # 学生端 /student/*
│   └── player/                  # 学习播放器
├── (classroom)/                 # 课堂 /classroom/*
├── (library)/                   # 资源库 /courses, /resources
├── (admin)/                     # 管理后台 /admin/*
├── (auth)/                      # 登录 /login
├── api/                         # API Routes
│   └── classroom/[sessionId]/events/  # SSE广播
└── runtime/                     # 运行时页面
    └── settings/                # 设置页面
```

## src/ Directory Purposes

**`src/app/`**
- Purpose: Next.js 16 App Router页面和布局
- Contains: 路由组布局、页面组件、API路由
- Key files: 路由组`(public)/`, `(teacher)/`, `(student)/`等各自的`layout.tsx`

**`src/actions/`**
- Purpose: Server Actions业务操作入口
- Contains: `classroom-actions.ts`, `course-authoring-actions.ts`, `plugin-actions.ts`等
- Key files: `plugin-actions.ts`（插件治理）, `classroom-actions.ts`（课堂管理）

**`src/components/`**
- Purpose: 共享React组件
- Contains: UI组件库
- Subdirs: `ui/`, `forms/`, `feedback/`

**`src/db/`**
- Purpose: Drizzle ORM数据库层
- Contains: `schema.ts`（主Schema ~80KB）
- Key files: `schema.ts`

**`src/lib/`**
- Purpose: 核心库和工具
- Contains: `dal/`, `dto/`, `auth/`, `ranking/`, `theme-layout/`, `cache-policy.ts`
- Key files: `dal/`（数据访问层）, `dto/`（Zod Schema）, `auth/`（Auth.js配置）

**`src/types/`**
- Purpose: 共享TypeScript类型
- Contains: 全局类型定义

## Key Module Locations

**Entry Points:**
- `src/app/(public)/page.tsx`: 首页
- `src/app/(teacher)/layout.tsx`: 教师端布局
- `src/app/(student)/layout.tsx`: 学生端布局

**Configuration:**
- `src/lib/auth/auth.config.ts`: Auth.js无DB配置（proxy用）
- `src/lib/auth/auth.ts`: Auth.js完整配置
- `src/proxy.ts`: Edge Runtime路由保护
- `drizzle.config.ts`: Drizzle配置

**Core Logic:**
- `src/lib/dal/classroom.ts`: 课堂DAL（~130KB）
- `src/lib/dal/learning.ts`: 学习DAL（~45KB）
- `src/lib/dal/plugins.ts`: 插件DAL（~44KB）
- `src/lib/dal/course-authoring.ts`: 课程创作DAL（~30KB）

**Testing:**
- 测试文件与源文件同目录，如`src/actions/classroom-actions.test.ts`
- Vitest配置使用`@`路径别名

## features/ Directory Organization

```
src/features/
├── runtime-platform/           # 运行时平台核心
│   ├── authoring/             # 教案创作
│   ├── classroom/             # 课堂session
│   ├── contracts/             # Bridge/Event/Permission定义
│   ├── host/                  # Host运行时
│   ├── host-actions/          # 守卫后的action
│   │   ├── guards.ts          # 三重守卫（capability+permission+lifecycle）
│   │   ├── plugin-host.ts     # 插件host action
│   │   └── runtime-host.ts    # 运行时host action
│   ├── launch/                # 启动
│   ├── player/               # 播放器
│   ├── plugins/              # 插件生命周期
│   ├── seams/                # 抽象层
│   │   ├── database/         # 数据库适配器
│   │   ├── event-bus/        # 事件总线适配器
│   │   └── transport/        # 传输适配器
│   └── shared/               # 共享DTO/cache
│
├── schedule/                 # 排课系统
│   ├── shared/
│   │   ├── dto/              # 排课DTO
│   │   ├── cache/            # 缓存
│   │   └── audit.ts          # 审计
│   ├── assistant.ts          # AI助手
│   ├── import.ts            # 导入
│   ├── operations.ts        # CRUD
│   ├── reminders.ts         # 提醒
│   └── runtime.ts           # 运行时
│
├── platform-core/            # 平台核心
│   ├── actions/             # 平台级action
│   ├── ai-contracts/        # AI相关契约
│   ├── commands/            # 命令生产者
│   ├── events/              # 事件处理
│   └── plugins/             # 插件核心
│
├── async-tasks/             # 异步任务
│   ├── dal.ts
│   └── operator.ts
│
└── class-management/        # 班级管理
```

## Naming Conventions

**Files:**
- 大驼峰：`ClassroomActions.ts`, `CourseAuthoring.ts`
- 小驼峰工具类：`cache-policy.ts`, `utils.ts`

**Directories:**
- 小写横杠分隔：`runtime-platform`, `class-management`

**Functions:**
- 小驼峰：`createClassroomDTO`, `resolveTeacherHostActor`
- Server Action：`xxxAction`后缀

**Types:**
- Schema后缀：`XxxSchema`, `XxxInputSchema`, `XxxOutputSchema`
- DTO类型：`XxxDTO` = `z.infer<typeof XxxSchema>`

## Where to Add New Code

**New Feature (e.g., 新增评分功能)：**
1. Server Action: `src/actions/grade-actions.ts`
2. DAL: `src/lib/dal/grade.ts`
3. DTO Schema: `src/lib/dto/grade.ts`
4. Database Schema: `src/db/schema.ts`添加grade相关表
5. Tests: `src/actions/grade-actions.test.ts`

**New Server Action：**
- 位置：`src/actions/[domain]-actions.ts`
- Zod输入校验
- 调用DAL函数

**New DAL Function：**
- 位置：`src/lib/dal/[domain].ts`
- 接受`unknown`输入，Zod Schema验证
- 返回业务对象（不是数据库行）

**New DTO Schema：**
- 位置：`src/lib/dto/[domain].ts`
- 组合验证和类型推断

**New Route Group：**
- 位置：`src/app/(new-group)/`
- 创建`layout.tsx`和`page.tsx`

## Special Directories

**`src/lib/auth/`**
- Purpose: Auth.js v5配置
- Contains: `auth.config.ts`（无DB），`auth.ts`（完整）
- Note: proxy.ts仅导入`authConfig`以保持Edge兼容

**`src/lib/ranking/`**
- Purpose: LexoRank排序实现
- Contains: `lexorank.ts`
- Note: 所有步骤排序必须通过此模块

**`src/lib/theme-layout/`**
- Purpose: 主题解析
- Contains: `route-surface-registry.ts`
- Note: 主题token按学校存储在`themeTokenRegistries`

**`src/features/runtime-platform/seams/`**
- Purpose: 抽象层（数据库/事件总线/传输）
- Contains: `database/`, `event-bus/`, `transport/`
- Note: 提供数据库、事件、传输的插拔式适配器

**`src/app/api/classroom/[sessionId]/events/`**
- Purpose: Classroom SSE广播
- Contains: `route.ts`（Edge Runtime）
- Note: 轮询SSE模式，2s间隔

---

*Structure analysis: 2026-05-24*