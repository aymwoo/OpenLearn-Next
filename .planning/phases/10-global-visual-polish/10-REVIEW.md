---
phase: 10-global-visual-polish
reviewed: 2026-05-06T23:23:08Z
depth: deep
files_reviewed: 15
files_reviewed_list:
  - src/actions/auth-actions.ts
  - src/app/(auth)/login/LoginForm.tsx
  - src/app/(auth)/login/page.tsx
  - src/app/(student)/student/player/page.tsx
  - src/app/(teacher)/teacher/layout.tsx
  - src/components/classroom/classroom-launch-panel.tsx
  - src/components/home/home-login-card.tsx
  - src/components/learning/teacher-review-surface.tsx
  - src/components/shell/sidebar.tsx
  - src/components/surfaces/home-surface.tsx
  - src/components/surfaces/player-surface.tsx
  - src/components/surfaces/settings-surface.tsx
  - src/components/surfaces/teacher-dashboard-surface.tsx
  - src/components/ui/ghost-field.ts
  - src/lib/dto/learning.ts
findings:
  critical: 3
  warning: 2
  info: 0
  total: 5
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-05-06T23:23:08Z
**Depth:** deep
**Files Reviewed:** 15
**Status:** issues_found

## Summary

本次是 Phase 10 在 `10-06 gap closure` 之后的复审，重点核查旧 `10-REVIEW.md`
里的 blocker/warning 是否仍存在。

结论：**issues_found**。先前 6 个问题里，`home-login-card` 的 checkbox
边框/ring 问题已被 `ghost-field` 收敛并修复；但其余 **5 个问题仍然存在**：

- 3 个 BLOCKER 仍未修复：登录 `roleIntent` 丢失、学生播放器学习模式写死、多个新入口仍是死链接/空动作。
- 2 个 WARNING 仍未修复：warning 语义色仍是页面内联 hex、品牌名仍出现 `OpenLear-Next` 拼写错误。

因此，Phase 10 目前 **不能判定为 clean**。

## Critical Issues

### CR-01: 登录页没有提交 `roleIntent`，学生入口仍会按教师流程处理

**Classification:** BLOCKER

**File:** `src/app/(auth)/login/page.tsx:41-57`, `src/app/(auth)/login/LoginForm.tsx:10-27`, `src/actions/auth-actions.ts:9-13`, `src/actions/auth-actions.ts:35-43`

**Issue:** `page.tsx` 读取了 `roleIntent` 并向用户展示“即将作为教师/学生访问工作区”，但 `LoginForm` 仍然没有接收或提交该字段。`signInAction()` 对缺失值使用 `z.enum(...).default("teacher")`，所以 `/login?roleIntent=student` 仍会退回教师鉴权与教师重定向路径。这说明旧 blocker 仍原样存在。

**Fix:** 把 `roleIntent` 作为 prop 传入 `LoginForm`，并通过隐藏字段提交；同时补 teacher/student 两条入口的回归测试。

```tsx
// src/app/(auth)/login/page.tsx
<LoginForm
  initialError={initialError}
  roleIntent={roleIntent === 'student' ? 'student' : 'teacher'}
/>

// src/app/(auth)/login/LoginForm.tsx
type LoginFormProps = {
  initialError?: string;
  roleIntent?: 'teacher' | 'student';
};

<form action={formAction} className="mt-8 grid gap-4">
  <input type="hidden" name="roleIntent" value={roleIntent ?? 'teacher'} />
  ...
</form>
```

### CR-02: 学生播放器仍把学习模式写死为“锁定跟随”

**Classification:** BLOCKER

**File:** `src/components/surfaces/player-surface.tsx:95-98`, `src/app/(student)/student/player/page.tsx:61-75`, `src/lib/dto/learning.ts:17-30`

**Issue:** DTO 已经提供了 `runtime.locked`，但页面层仍向 `PlayerPersonalRegion` 传 `player={null}`，`PlayerSurface` 的 hero metric 也仍然直接写死为“锁定跟随”。课堂如果实际是 unlocked，学生界面仍会显示错误状态。旧 blocker 仍存在。

**Fix:** 把真实 runtime 传到 surface 层，再根据 `runtime.locked` 渲染文案。

```tsx
// src/app/(student)/student/player/page.tsx
const personal = await getStudentPlayerPersonalDTO({ lessonId, selectedStepId, forcedStepId: null, scope });

<PlayerSurface shell={shell} runtime={personal.runtime} personalSlot={...} />

// src/components/surfaces/player-surface.tsx
type PlayerSurfaceProps = {
  shell: StudentPlayerShellDTO | null;
  runtime?: RuntimeStepStateDTO | null;
  personalSlot: React.ReactNode;
};

<p className="mt-2 text-2xl font-semibold">
  {runtime?.locked ? '锁定跟随' : '自由浏览'}
</p>
```

### CR-03: 多个 Phase 10 新入口仍然是死链接或空动作

**Classification:** BLOCKER

**File:** `src/components/shell/sidebar.tsx:96-99`, `src/app/(teacher)/teacher/layout.tsx:66-76`, `src/components/home/home-login-card.tsx:122-145`, `src/components/surfaces/teacher-dashboard-surface.tsx:81-83`

**Issue:** 旧 blocker 仍成立：

- `sidebar.tsx` 仍链接到 `/help`，仓库内没有对应 `src/app/**/help/page.tsx`；
- `teacher/layout.tsx` 的“今日概览 / 教学日历 / 消息通知”仍是 `href="#"`，主按钮“开启新课堂”仍无行为；
- `home-login-card.tsx` 的“忘记密码 / 立即注册”仍是 `href="#"`；
- `teacher-dashboard-surface.tsx` 的“查看完整日历”仍是 `href="#"`。

这些入口会把用户送到 404 或空操作，不是单纯占位文案，而是可点击但不可用的 shipped UI。

**Fix:** 未实现前不要渲染成可点击入口；要么绑定真实路由，要么改成禁用/纯文本状态，并补 smoke test 校验关键导航不落到 `#` 或缺失路由。

```tsx
// 未实现前改成不可点击文案
<span className="rounded-full px-4 py-2 text-sm text-on-surface-variant">
  帮助中心（即将上线）
</span>

// 或绑定真实路由
<Link href="/teacher/calendar">教学日历</Link>
```

## Warnings

### WR-01: warning 语义色仍然散落为页面内联 hex，Phase 10 语义统一未完成

**Classification:** WARNING

**File:** `src/components/learning/teacher-review-surface.tsx:57-58`, `src/components/learning/teacher-review-surface.tsx:81-82`, `src/components/learning/teacher-review-surface.tsx:99-100`, `src/components/learning/teacher-review-surface.tsx:193-195`, `src/components/learning/teacher-review-surface.tsx:230-231`, `src/components/surfaces/settings-surface.tsx:209-219`, `src/components/surfaces/settings-surface.tsx:266-285`

**Issue:** `待反馈 / 故障 / 风险` 相关状态仍直接写成 `#fff3cd`、`#856404`、`#fff2df`、`#bc6c25` 等页面私有颜色。`10-06` 只统一了 ghost-focus 控件，没有收敛这些语义色，所以旧 warning 仍存在，后续页面会继续漂移。

**Fix:** 在全局 token 与共享 primitive 中新增 `warning` 语义，再替换页面内联 hex。

```tsx
// globals.css
--color-warning-container: #fff3cd;
--color-on-warning-container: #856404;

// badge.tsx
warning: 'bg-warning-container text-on-warning-container'

// usage
<Badge variant="warning">待反馈</Badge>
```

### WR-02: 用户可见品牌名仍写成 `OpenLear-Next`

**Classification:** WARNING

**File:** `src/components/surfaces/home-surface.tsx:25-28`, `src/components/surfaces/settings-surface.tsx:45-47`

**Issue:** 对外文案仍显示 `OpenLear-Next`，与项目正式名称 `OpenLearn Next` 不一致。旧 warning 仍存在，而且现在仍是多处手写，说明品牌文案没有收敛到单一来源。

**Fix:** 修正文案，并抽成共享常量，避免再次手写出错。

```ts
export const APP_BRAND_NAME = 'OpenLearn Next';
```

---

_Reviewed: 2026-05-06T23:23:08Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
