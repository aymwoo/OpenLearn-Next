---
phase: 81-system-notification
plan: 03
subsystem: notification-ui
tags: [frontend, notification, bullmq, cleanup, ui]
requires:
  - 81-02 (API Routes + DAL + DTO)
provides:
  - notification-bell component
  - notification-dropdown component
  - notification-item component
  - notification-list component
  - empty-state component
  - /notifications page
  - use-unread-count hook
  - use-notifications hook
  - relative-time utility
  - notification-cleanup worker
affects:
  - src/app/(teacher)/teacher/layout.tsx
  - src/db/schema.ts
tech-stack:
  added: []
  patterns:
    - "React client component hooks (useEffect polling + Page Visibility API)"
    - "BullMQ upsertJobScheduler + Drizzle DELETE"
    - "cursor-based 分页 (useNotifications)"
    - "相对时间格式化 (中文)"
key-files:
  created:
    - src/lib/relative-time.ts
    - src/hooks/use-unread-count.ts
    - src/hooks/use-notifications.ts
    - src/components/notification/notification-item.tsx
    - src/components/notification/notification-list.tsx
    - src/components/notification/empty-state.tsx
    - src/components/notification/notification-dropdown.tsx
    - src/components/notification/notification-bell.tsx
    - src/components/notification/notification-page-content.tsx
    - src/app/notifications/page.tsx
    - src/server/workers/notification-cleanup.ts
  modified:
    - src/app/(teacher)/teacher/layout.tsx
    - src/features/async-tasks/worker/bootstrap.ts
    - src/db/schema.ts
decisions:
  - "无 SWR 依赖 — 用 useEffect + setInterval + Page Visibility API 实现等价轮询"
  - "NotificationBell 是客户端组件，放在 teacher layout 的 headerActions 中（headerActions 通过 Suspense 包裹的 RSC 传递）"
  - "pluginNotifications 表定义在当前工作树同步了一份（81-01 在另一工作树中尚未合并）"
  - "notification-cleanup 使用 upsertJobScheduler 而非独立 Worker（cleanup processor 在 bootstrap.ts 中注册）"
metrics:
  duration: ""
  completed_date: ""
---

# Phase 81 Plan 03: 通知 UI + Cleanup Worker 执行总结

**One-liner:** Bell icon + badge 实时未读计数、dropdown 5 条预览、/notifications 通知中心页面、BullMQ 每日自动清理 90 天前已读通知

## 执行结果

| Item | Status |
|------|--------|
| 总任务数 | 3 |
| 已完成 | 3 |
| 提交数 | 3 |
| 状态 | COMPLETE |

## 任务完成情况

### Task 1: 前端组件 + hooks + relative-time 工具

**Commit:** `6e34f7a`

创建了完整的通知 UI 套件：
- `src/lib/relative-time.ts` — 中文相对时间格式化（刚刚/N分钟前/N小时前/N天前/YYYY-MM-DD）
- `src/hooks/use-unread-count.ts` — 未读计数 10s 轮询（useEffect + setInterval + Page Visibility API）
- `src/hooks/use-notifications.ts` — cursor-based 通知列表分页 hook
- 6 个 UI 组件：NotificationBell、NotificationDropdown、NotificationItem、NotificationList、EmptyState、NotificationPageContent
- `/notifications` RSC 页面（"通知中心" heading + "全部标为已读" button）
- teacher layout Bell icon 替换为 NotificationBell 组件

### Task 2: BullMQ 通知清理 worker

**Commit:** `fdceedf`

创建了通知清理基础设施：
- `src/server/workers/notification-cleanup.ts` — `registerNotificationCleanupScheduler`（cron: 0 0 3 * * *）+ `processNotificationCleanup`（DELETE WHERE readAt IS NOT NULL AND createdAt < 90 days）
- `bootstrap.ts` 在 `start()` 方法中注册 scheduler
- `schema.ts` 同步了 pluginNotifications 表定义

### Task 3: [BLOCKING] 数据库 Schema Push

执行 `npx drizzle-kit push`（从 main repo 运行），pluginNotifications 表及其 3 个索引已在 SQLite 中创建完成。

## 提交记录

| Commit | Type | Message |
|--------|------|---------|
| `6e34f7a` | feat | feat(81-03): 创建通知 UI 组件套件 + hooks + relative-time 工具 |
| `fdceedf` | feat | feat(81-03): BullMQ 通知清理 worker + schema 同步 |

## 偏差说明

### 自动修复的问题

**1. [Rule 3 - 阻塞] schema.ts 中缺少 pluginNotifications 表定义**
- **发现时:** Task 2 (typecheck 报错 Module has no exported member)
- **问题:** 81-01 创建的 pluginNotifications 表在另一个工作树中，当前工作树基于 81-01 之前的 commit
- **修复:** 从 main repo 的 schema.ts 复制 pluginNotifications 表定义到工作树中
- **文件修改:** src/db/schema.ts

**2. [Rule 2 - 关键功能] 无 SWR 依赖，使用原生 useEffect + setInterval 替代**
- **发现时:** Task 1 (package.json 中无 swr 依赖)
- **问题:** PLAN.md must_haves 引用 useSWR，但项目未安装 SWR
- **修复:** 使用 useEffect + setInterval + Page Visibility API 实现等价轮询功能，零新依赖
- **文件修改:** src/hooks/use-unread-count.ts

## Self-Check: PASSED

- [x] 所有 11 个新文件存在
- [x] 2 个工作树提交已确认（6e34f7a、fdceedf）
- [x] pluginNotifications 表在 SQLite 中已创建
- [x] typecheck 无新增错误
- [x] teacher layout Bell icon 已替换
- [x] notification-cleanup 已注册到 bootstrap.ts
