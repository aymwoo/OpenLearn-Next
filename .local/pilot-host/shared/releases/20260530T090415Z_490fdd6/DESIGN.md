# Design System & Architecture Specification

**Luminous Academy** — 面向 K-12 的高端学习平台

---

## 1. Creative North Star

**核心理念：Sunlit Studio（阳光画室）**

拒绝传统 K-12 软件的堆砌感和"塑料感"，打造如高端实体教室般的编辑出版级学习环境。界面如阳光充足的工作室——自然光、高质量纸张、清澈玻璃。

**设计原则：**
- **刻意的不对称 +  tonal depth**：元素如漂浮在有组织的空间中
- **禁止线条分隔**：用背景移位和色调过渡代替 1px 实线
- **重叠表面 + 变化字体比例**：创造节奏感，引导学生注意力

---

## 2. Architecture Overview

### 2.1 System Architecture

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
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Core Patterns

**分层数据访问：**
- UI 组件永不直接访问数据库
- DAL 函数接受 `unknown` 输入，Zod Schema 验证
- DTO Schema 组合验证和类型推断

**Append-Only Submissions：**
- `taskSubmissions`、`quizAttempts`、`runtimeStepStates`、`runtimeStepSessions`
- 事务中清除旧 `isLatest`，插入新 `isLatest: true`
- 保留完整尝试历史

**LexoRank 排序：**
- Steps 使用 LexoRank rank 字符串，非整数 position
- 拖拽排序必须通过 `src/lib/ranking/lexorank.ts`
- 禁止使用整数 position 列（会导致级联更新）

### 2.3 Auth Split Pattern

```
src/lib/auth/auth.config.ts     → 无 DB 依赖，Edge-safe
src/lib/auth/auth.ts            → 完整实例（含 DrizzleAdapter）
src/proxy.ts                   → 仅导入 authConfig，Edge Runtime 保护
```

---

## 3. Color & Surface Philosophy

### 3.1 Surface Hierarchy

| Surface | Token | 用途 |
|---------|-------|------|
| Base | `surface` (#f5f7f9) | 应用底色 |
| Section | `surface-container-low` (#eef1f3) | 大内容区、侧边栏 |
| Action | `surface-container-lowest` (#ffffff) | 主卡片颜色 |

### 3.2 The "No-Line" Rule

**禁止使用 1px 实线分隔内容块。** 使用背景移位或色调过渡：
- 侧边栏：使用 `surface-container-low` 背景，非 `border-right`
- 列表项：通过留白或 hover 态分隔，禁用 `border-bottom`

### 3.3 Glass & Gradient Rule

**浮动元素使用 Glassmorphism：**
- 导航栏、工具提示
- `surface` 颜色 80% 透明度 + `backdrop-blur: 12-20px`

**Primary CTA 使用渐变：**
- `primary` (#0050d4) → `primary_container` (#7b9cff)
- 135 度角线性渐变
- 提供触觉感和高端光泽

---

## 4. Typography

**字体：Lexend（专用阅读优化字体）**

| 层级 | 字号 | 用途 |
|------|------|------|
| Display | 3.5rem (-0.02em) | 大创意、欢迎时刻 |
| Headline | - | 页面标题，`on_surface` (#2c2f31) |
| Title | - | 卡片标题、子导航 |
| Body | 1rem (body-lg) | 教学内容 |
| Label | - | 微文案、标签，`on_surface_variant` (#595c5e) |

---

## 5. Component Specifications

### 5.1 Buttons

| 类型 | 样式 |
|------|------|
| Primary | 渐变填充（`primary` → `primary_container`），`full` 圆角，`on_primary` 高对比度文字 |
| Secondary | `surface-container-highest` 背景 + `primary` 文字，无边框 |
| Tertiary | 无背景，`primary` 文字，低强调操作 |

### 5.2 Cards & Lists

- **禁止 divider lines**
- 列表项通过留白或 hover 态 `surface-container-low` 分隔
- 卡片：`surface-container-lowest` (#ffffff)，`radius: 2`

### 5.3 Input Fields

- 背景：`surface-container-low`
- Focus 态：白色背景 + 2px `primary` ghost-border（发光效果）

### 5.4 Subject Chips

- `secondary_container`、`tertiary_container`
- 使用 `on_container` 文字色确保 K-12 可读性标准

---

## 6. Route Groups

```
src/app/
├── (public)/           # 公开首页 /
├── (teacher)/          # /teacher/*（编辑器、批改、学生、排课）
├── (student)/          # /student/*（播放器）
├── (classroom)/        # /classroom/*
├── (library)/          # /courses, /resources
├── (admin)/            # /admin/*
├── (auth)/             # /login
└── api/                # API Routes（含 SSE 广播）
```

---

## 7. Plugin System & Governance

### 7.1 Lifecycle State Machine

```
installed → enabled → mounted → ready
    ↑                    ↓
    └──── suspended ←───┘
         ↓
     disabled
         ↓
       failed
```

### 7.2 Governance Audit

`governanceAudit` 表记录所有操作决策：

| 拒绝原因 | 含义 |
|----------|------|
| `not_allowlisted` | 不在白名单 |
| `capability_missing` | 缺少 capability |
| `permission_denied` | 权限不足 |
| `lifecycle_blocked` | 生命周期状态阻止 |
| `school_mismatch` | 学校不匹配 |
| `kill_switch` | 被 kill switch 禁用 |

### 7.3 Host Actions 三重守卫

```typescript
createGuardedHostAction({
  inputSchema,
  actorScopes,           // capability 检查
  requiredPermission,    // permission 检查
  resolveActor,
  resolveGovernance,     // lifecycle 检查
  execute
})
```

---

## 8. Classroom SSE

**位置：** `src/app/api/classroom/[sessionId]/events/route.ts`

**模式：** 轮询 SSE（每 2s fetch snapshot）

```
1. fetch("/api/classroom/${sessionId}/snapshot")
2. 版本变化 → event: snapshot
3. 否则 → : keepalive
4. status === "ended" → 关闭流
```

**两种模式：**
- `locked`：教师控制步骤
- `unlocked`：学生自由导航

---

## 9. Project Structure

```
src/
├── app/                    # Next.js 16 App Router
├── actions/                # Server Actions
├── components/             # 共享 UI 组件
├── db/                     # Drizzle ORM (schema.ts ~80KB)
├── features/               # 领域功能模块
│   ├── runtime-platform/   # 运行时平台核心
│   │   ├── classroom/     # 课堂 session
│   │   ├── contracts/     # Bridge/Event/Permission
│   │   ├── host-actions/  # 守卫后的 action
│   │   └── seams/         # 抽象层（DB/Event/Transport）
│   ├── schedule/          # 排课系统
│   └── platform-core/     # 平台核心
├── lib/                    # 核心库
│   ├── dal/               # 数据访问层 (~250KB+ DAL 代码)
│   ├── dto/               # Zod Schema
│   ├── auth/              # Auth.js v5 split config
│   ├── ranking/           # LexoRank
│   └── theme-layout/      # 主题解析
└── plugins/               # 插件实现
```

---

## 10. Key Constraints

| 约束 | 说明 |
|------|------|
| 禁止实线分隔 | 使用 `surface` 层级替代 |
| LexoRank 排序 | 禁止整数 position 列 |
| Append-Only | `isLatest` 模式保留历史 |
| Auth Split | proxy.ts 仅导入 `authConfig` |
| DAL 输入验证 | 接受 `unknown`，Zod 解析 |
| Cache 策略 | 公开/静态用 `"use cache"`，动态用 `<Suspense>` |

---

## 11. Do's and Don'ts

### Do
- 使用 `surface-container-lowest` (#ffffff) 作为内容主表面
- 使用 Glassmorphism 处理导航元素
- 保持 Lexend 字体比例的友好、乐观语调
- 使用简体中文界面

### Don't
- **禁止** 1px 实线分隔内容块
- **禁止** 使用纯黑 (#000000) 文字，使用 `on_surface` (#2c2f31)
- **禁止** 使用暗灰色阴影（使用 tinted 阴影：`rgba(44, 47, 49, 0.06)`）
- **禁止** 界面拥挤，必要时移入 "More" 菜单

---

*Last updated: 2026-05-24*