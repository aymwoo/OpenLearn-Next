<!-- refreshed: 2026-05-24 -->
# Architecture

**Analysis Date:** 2026-05-24

## System Overview

Next.js 16 App Router 架构，采用严格分层数据访问模式。

```
┌─────────────────────────────────────────────────────────────┐
│                   UI Layer (RSC/Client)                     │
│           src/app/(teacher|student|classroom|...)           │
├─────────────────────────────────────────────────────────────┤
│              Server Actions (src/actions/)                  │
│         业务操作入口，Zod输入校验，调用DAL                    │
├─────────────────────────────────────────────────────────────┤
│                   DAL Layer (src/lib/dal/)                   │
│         Zod Schema验证，业务逻辑，数据格式转换               │
├─────────────────────────────────────────────────────────────┤
│              Drizzle ORM (src/db/) → SQLite                 │
│                   Schema定义，数据迁移                       │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Server Actions | 业务操作入口，Zod输入校验 | `src/actions/*.ts` |
| DAL | 数据访问逻辑，Zod验证，类型推断 | `src/lib/dal/*.ts` |
| Drizzle ORM | Schema定义，数据迁移 | `src/db/schema.ts` |
| DTO Schemas | 跨层验证和类型定义 | `src/lib/dto/*.ts` |

## Pattern Overview

**Overall:** 分层数据访问 + DTO/Zod验证模式

**Key Characteristics:**
- UI组件永不直接访问数据库
- DAL函数接受`unknown`输入，用Zod Schema验证
- DTO Schema同时用于验证和类型推断
- 所有外键使用`onDelete: cascade`

## Layers

**UI Layer (RSC/Client):**
- Purpose: React Server Components / 客户端组件渲染
- Location: `src/app/(route-group)/*`
- Contains: 页面组件、布局组件
- Depends on: Server Actions
- Used by: 浏览器端Next.js

**Server Actions Layer:**
- Purpose: 业务操作入口，处理用户意图
- Location: `src/actions/`
- Contains: `classroom-actions.ts`, `course-authoring-actions.ts`, `plugin-actions.ts`等
- Depends on: DAL层
- Used by: UI组件通过表单提交或`useAction`

**DAL Layer:**
- Purpose: 数据访问逻辑，Zod验证，业务规则
- Location: `src/lib/dal/`
- Contains: `classroom.ts`, `course-authoring.ts`, `plugins.ts`, `learning.ts`等
- Depends on: Drizzle ORM
- Used by: Server Actions

**Drizzle ORM Layer:**
- Purpose: Schema定义，数据库迁移，查询构建
- Location: `src/db/`
- Contains: `schema.ts`（主Schema，~80KB），`index.ts`
- Used by: DAL层

## Data Flow

### Primary Request Path (e.g., Create Classroom)

1. **UI提交** - `<form action={createClassroomAction}>` (`src/app/(teacher)/teacher/classroom/new/page.tsx`)
2. **Server Action接收** - `export async function createClassroomAction(formData: FormData)` (`src/actions/classroom-actions.ts`)
3. **Zod校验** - `CreateClassroomSchema.parse(Object.fromEntries(formData))`
4. **DAL调用** - `createClassroomDTO(input)` (`src/lib/dal/classroom.ts`)
5. **数据库写入** - `db.insert(classrooms).values(...)` → SQLite

### Plugin Lifecycle Flow

1. **Teacher请求** - `pluginActions.enablePlugin({ pluginId, schoolId })`
2. **Governance检查** - `resolveGovernance()` 校验capability + permission
3. **Lifecycle转换** - `installed → enabled → mounted → ready`
4. **审计日志** - `pluginLifecycleTransitions`表记录转换
5. **事件分发** - SSE广播给 classroom session

**State Management:**
- Next.js 16 `"use cache"` 用于公开/静态内容
- `<Suspense>` 包裹动态每用户数据
- Cache tags集中在`src/lib/cache-policy.ts`

## Auth Split Pattern

Auth.js v5采用分文件设计，保持Edge兼容：

**`src/lib/auth/auth.config.ts`** - 无数据库依赖的Proxy层配置
```typescript
export const authConfig = {
  providers: [],
  trustHost: true,
  pages: { signIn: "/" },
  callbacks: { authorized({ auth, request: { nextUrl } }) => ... }
} satisfies NextAuthConfig
```
- 仅导入`next-auth`，无Drizzle导入
- 可安全导入到`src/proxy.ts`

**`src/lib/auth/auth.ts`** - 完整实例（含DrizzleAdapter）
```typescript
const nodeAuthConfig = {
  ...authConfig,
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  providers: [CredentialsProvider({ ... })]
}
export const { handlers, auth, signIn, signOut } = NextAuth(nodeAuthConfig)
```

**`src/proxy.ts`** - Edge Runtime保护路由
```typescript
export default NextAuth(authConfig).auth  // 仅导入authConfig
export const config = { matcher: ["/teacher/:path*", ...] }
```

**Login流程：**
- 教师使用email登录
- 学生使用studentNumber登录
- `authorizeCredentials(credentials, "teacher" | "student")` 根据`roleIntent`解析身份字段

## Plugin System & Governance

### Lifecycle State Machine

```
installed → enabled → mounted → ready
    ↑                    ↓
    └──── suspended ←───┘
         ↓
     disabled
         ↓
       failed
```

状态转换规则：
- `installed → enabled`: 需要`not_allowlisted`检查通过
- `enabled → mounted`: 加载插件代码
- `mounted → ready`: 初始化完成
- `ready → suspended`: 教师暂停
- `suspended → enabled`: 恢复
- `kill_switch`可按学校禁用插件

### Governance审计

`governanceAudit`表记录所有操作决策：

**拒绝原因 (`GovernanceDeniedReason`)：**
- `not_allowlisted` - 不在白名单
- `capability_missing` - 缺少capability
- `permission_denied` - 权限不足
- `lifecycle_blocked` - 生命周期状态阻止
- `school_mismatch` - 学校不匹配
- `kill_switch` - 被killswitch禁用

**Capability定义 (`RuntimeCapability`)：**
```typescript
["runtime:ready", "runtime:event:emit", "runtime:state:save",
 "runtime:submission:create", "runtime:host-action:request"]
```

### Host Actions

`src/features/runtime-platform/host-actions/`实现capability + permission + lifecycle三重守卫：

```typescript
export function createGuardedHostAction({
  inputSchema,
  actorScopes,
  requiredPermission,
  resolveActor,
  resolveGovernance,
  execute
})
```

## Runtime Platform Architecture

### Directory Structure

```
src/features/runtime-platform/
├── authoring/          # 教案创作
├── classroom/         # 课堂运行时session管理
│   └── runtime-session.ts  # SSE广播、locked/unlocked模式
├── contracts/         # Bridge/Event/Permission类型定义
│   ├── bridge.ts      # 交互信封格式
│   ├── permissions.ts # Governance决策类型
│   └── events.ts     # 事件类型
├── host/              # Host运行时
├── host-actions/      # 守卫后的host action执行
│   ├── guards.ts      # capability + permission + lifecycle守卫
│   ├── plugin-host.ts
│   └── runtime-host.ts
├── launch/            # 运行时启动
├── player/           # 学生播放器
├── plugins/          # 插件生命周期管理
├── seams/            # 抽象层（数据库/事件总线/传输）
│   ├── database/
│   ├── event-bus/
│   └── transport/
└── shared/           # 共享DTO、cache、auth
```

### Classroom SSE

`src/app/api/classroom/[sessionId]/events/route.ts`：
- Edge Runtime
- 轮询SSE模式（每2s获取snapshot，版本变化时`event: snapshot`）
- `: keepalive`心跳
- `status === "ended"`时关闭stream
- 两种模式：`locked`（教师控制步骤）vs `unlocked`（学生自由导航）

## Schedule System Architecture

### Directory Structure

```
src/features/schedule/
├── assistant.ts       # AI排课助手
├── import.ts         # 批量导入
├── index.ts          # 入口
├── operations.ts     # CRUD操作
├── reminders.ts      # 提醒规则/分发
├── runtime.ts        # 排课运行时
└── shared/           # DTO、cache、边界映射
    ├── dto/
    │   ├── actions.ts
    │   ├── import.ts
    │   ├── operations.ts
    │   ├── reminders.ts
    │   └── runtime.ts
    ├── cache/
    └── audit.ts
```

### Core Entities

- **Bell Slots**: 上课时间段
- **Week Patterns**: 周规律（周一第1节...）
- **Term Calendars**: 学期日历
- **Teaching Assignments**: 教师分配
- **Recurring Entries**:  recurring规则
- **Overrides**: 例外覆盖
- **Holiday Calendars**: 节假日
- **Reminder Rules**: 提醒规则
- **Reminder Dispatches**: 提醒分发记录

## Key Abstractions

**LexoRank排序：**
- `src/lib/ranking/lexorank.ts`处理步骤排序
- 拖拽重排必须使用此模块
- 避免使用整数position列（会导致级联更新）

**Append-Only Submissions：**
- `taskSubmissions`、`quizAttempts`追加写入
- 事务中清除旧`isLatest`，插入新`isLatest: true`
- 保留完整尝试历史

## Entry Points

**Next.js App:**
- Location: `src/app/`（路由组布局）
- Triggers: HTTP请求到达对应路由
- Responsibilities: RSC渲染、布局组装

**Server Actions:**
- Location: `src/actions/*.ts`
- Triggers: 表单提交、`useActionState`
- Responsibilities: 业务操作处理

**API Routes:**
- Location: `src/app/api/*/route.ts`
- Triggers: HTTP API调用（如classroom SSE）
- Responsibilities: 实时流、webhook处理

## Architectural Constraints

- **Threading:** Node.js单线程 + Edge Runtime（classroom SSE）
- **Global state:** 无全局可变状态，依赖React组件树和Server Actions
- **Circular imports:** auth.config.ts（无DB）vs auth.ts（有DB）- proxy.ts仅导入authConfig避免循环
- **Cache strategy:** Next.js 16显式`"use cache"` + `<Suspense>`动态数据分离

## Cross-Cutting Concerns

**Logging:** 使用`server-only`标记的模块通过`console`输出
**Validation:** Zod Schema集中管理在`src/lib/dto/`
**Authentication:** Auth.js v5 split pattern（见上述）
**Error Handling:** Server Actions返回结构化错误，DAL抛出经过Zod验证的错误

---

*Architecture analysis: 2026-05-24*