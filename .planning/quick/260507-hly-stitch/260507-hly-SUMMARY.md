---
phase: quick
plan: 1
subsystem: "home-login"
tags:
  - "ui"
  - "auth"
  - "stitch"
dependencies:
  requires:
    - "existing home surface"
    - "Auth.js credentials flow"
  provides:
    - "direct home-page role login"
    - "role-based post-login redirects"
  affects:
    - "src/components/surfaces/home-surface.tsx"
    - "src/components/home/home-login-card.tsx"
    - "src/actions/auth-actions.ts"
    - "src/app/(auth)/login/page.tsx"
    - "src/app/(auth)/login/LoginForm.tsx"
tech-stack:
  added: []
  patterns:
    - "single gradient hero with embedded login card"
    - "shared roleIntent across home and /login"
key-files:
  created: []
  modified:
    - "src/components/surfaces/home-surface.tsx"
    - "src/components/home/home-login-card.tsx"
    - "src/actions/auth-actions.ts"
    - "src/app/(auth)/login/page.tsx"
    - "src/app/(auth)/login/LoginForm.tsx"
key-decisions:
  - "首页登录卡默认落在学生入口，并直接嵌入主舞台而不是继续跳独立登录页。"
  - "teacher 登录成功后改为进入 /teacher，而不是 /teacher/editor。"
  - "独立 /login 页面复用同一套 roleIntent 语义与文案，避免首页和登录页分叉。"
metrics:
  tasks-completed: 3
  files-modified: 5
  date-completed: "2026-05-07"
---

# Phase quick Plan 1: Stitch 双入口首页登录 Summary

将首页收敛为单一 Stitch 风格渐变主舞台 + 直接登录卡，明确区分学生/教师入口并默认学生，同时把首页与 `/login` 的 `roleIntent` 语义统一到同一条认证跳转链路。

## Completed Tasks

1. **Task 1: 将首页首屏收敛为 Stitch 风格的双入口登录舞台** (Commit: `6255068`)
   - 把首页主视觉改为单一 gradient stage，并把 `HomeLoginCard` 嵌入主舞台。
   - 移除首页 hero 中仅做跳转的重复登录 CTA，保留最小必要的次级动作。
   - 将首页登录默认入口切换为学生，登录卡文案随角色切换同步更新。

2. **Task 2: 打通首页登录提交到角色首页的认证链路** (Commit: `68ff8e5`)
   - 将 `signInAction` 默认 `roleIntent` 改为 `student`。
   - 成功登录后学生跳转 `/student`，教师跳转 `/teacher`。
   - `/login` 页显式承接 `roleIntent` 并传递给 `LoginForm`，共享提交语义与测试账号提示。

3. **Task 3: 做一轮最小回归，确认首页入口与跳转语义闭环** (Commit: `aeab00f`)
   - 为首页角色切换按钮补充 `aria-pressed`，收紧当前激活态语义。
   - 通过目标文件 scoped eslint 与项目 `typecheck`，确认首页与登录页闭环行为成立。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] 全量 `npm run lint` 被仓库既有问题阻塞**
- **Found during:** Task 3
- **Issue:** 全量 lint 失败来自本任务范围外的既有文件，包含 `src/actions/plugin-actions.ts`、`src/actions/resource-actions.ts`、`src/components/learning/classroom-runtime-client.tsx`、多处 DAL 文件与根目录脚本。
- **Fix:** 未扩大本 quick task 作用域；改为对计划涉及文件执行 scoped eslint，并保留 `npm run typecheck` 验证实现闭环。
- **Files modified:** None (documented only)
- **Reference:** `.planning/quick/260507-hly-stitch/deferred-items.md`

## Known Stubs

None.

## Threat Flags

None.
