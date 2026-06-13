---
phase: 81-system-notification
plan: 01
type: execute
subsystem: notification/data-model
tags: [schema, dto, manifest, command-contracts, governance]
depends_on: []
requires: [NOTIF-05, NOTIF-07, SYS-06]
provides:
  - pluginNotifications Drizzle 表定义
  - SystemCommandNotificationSchema manifest 声明 schema
  - Notification DTO schemas (insert / query / mark-read)
  - PlatformCommandType system.notification.send 注册
  - 3 个新治理拒因码
affects:
  - src/db/schema.ts
  - src/lib/dto/resource-ai.ts
  - src/lib/dto/notification.ts
  - src/features/platform-core/commands/contracts.ts
  - src/features/runtime-platform/contracts/permissions.ts
tech-stack:
  added: []
  patterns:
    - "sqliteTable with .references() cascade FK (pluginRegistrations / schools / users)"
    - "z.discriminatedUnion variant (第 4 variant: system.notification)"
    - "z.strictObject payload schema (SystemNotificationSendPayloadSchema)"
    - "decoupled DTO file (src/lib/dto/notification.ts)"
    - "GovernanceDeniedReason enum 扩展"
key-files:
  created:
    - src/lib/dto/notification.ts
  modified:
    - src/db/schema.ts
    - src/lib/dto/resource-ai.ts
    - src/features/platform-core/commands/contracts.ts
    - src/features/runtime-platform/contracts/permissions.ts
decisions:
  - "pluginNotifications 表采用 append-only 模式，readAt NULL = unread"
  - "notificationTypes manifest 白名单正则 ^[a-z][a-z0-9_]*(?:\\.[a-z][a-z0-9_]*)*$ 防注入"
  - "system.notification.send 为唯一声明为 PlatformCommandType 的写命令；读操作纯 DAL 不注册命令类型"
duration: 9min
completed: "2026-06-13"
---

# Phase 81 Plan 01: 数据模型 + 类型契约基础层 Summary

建立 system.notification 的 Drizzle 表定义、Zod manifest schema、DTO 合约和拒因码，为 Wave 2 的 Command Bus handler 和用户读路径提供类型安全基础。

## Tasks Completed

| # | Task | Type | Commit | Files |
|---|------|------|--------|-------|
| 1 | 创建 pluginNotifications Drizzle 表定义 | auto | `28cf4a1` | `src/db/schema.ts` |
| 2 | 新增 manifest schema + DTO + 命令类型契约 | auto | `5d4976b` | `src/lib/dto/resource-ai.ts`, `src/lib/dto/notification.ts`, `src/features/platform-core/commands/contracts.ts`, `src/features/runtime-platform/contracts/permissions.ts` |

## Deliverables

### pluginNotifications 表 (Task 1)

- 表名: `pluginNotification`，9 个字段
- FK 级联: pluginId → pluginRegistrations, schoolId → schools, recipientUserId → users
- readAt: 可 NULL（未读标记），createdAt: 自动时间戳
- 三个复合索引: `pluginNotif_user_read_idx` (recipientUserId, readAt), `pluginNotif_user_created_idx` (recipientUserId, createdAt), `pluginNotif_cleanup_idx` (readAt, createdAt)

### Manifest Schema (Task 2A)

- `SystemCommandNotificationSchema` — `notificationTypes: z.array(...).min(1)`，类型名正则 `/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*$/`
- `SystemCommandDiscriminatedSchema` 扩展为 4 variants（http.request, config, file, notification）

### DTO Schemas (Task 2B)

- `NotificationInsertSchema` — handler 入口校验
- `NotificationDTOSchema` — API 响应映射
- `MarkReadSchema` — 标记已读（markAll / 单条 notificationId）

### 命令类型契约 (Task 2C)

- `SystemCommandTypes` 新增 `"system.notification.send"`
- `SystemNotificationSendPayloadSchema`
- `PlatformCommandPayloadSchemas` 新增 key
- `PlatformCommandSchema` discriminatedUnion 新增 variant

### 拒因码 (Task 2D)

- `notification_type_not_allowed`
- `rate_limit_exceeded`
- `recipient_not_in_school`

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — this plan is purely data model + type contract foundation. All schemas are fully defined and wired; no placeholder values or unresolved data sources exist. The Command Bus handler implementation and user-facing read paths are deferred to Wave 2 (Plan 02, 03) per the phase design.

## Threat Flags

None — all schemas use Zod strict enforcement. The notificationTypes regex and payload length limits (title max 256, body max 2048) provide input sanitization. FK constraints with cascade delete enforce referential integrity at the DB layer. The threat model entries T-81-01/02/03 are all compile-time mitigations satisfied by this plan's type contracts.

## Verification

- [x] Task 1: `grep -c "export const pluginNotifications" src/db/schema.ts` = 1
- [x] Task 2A: `grep -c "SystemCommandNotificationSchema" src/lib/dto/resource-ai.ts` = 2
- [x] Task 2B: `grep -c "NotificationInsertSchema" src/lib/dto/notification.ts` = 2
- [x] Task 2C: `grep -c "system.notification.send" src/features/platform-core/commands/contracts.ts` = 3
- [x] Task 2D: `grep -c "notification_type_not_allowed" src/features/runtime-platform/contracts/permissions.ts` = 1
- [ ] `pnpm typecheck` — not passing in baseline (pre-existing errors in unrelated files: quiz-data-access.test.ts, ssrf-guard.ts, homework lifecycle.test.ts, plugin-lifecycle-operator-surface.tsx). No new type errors introduced by this plan.

## Self-Check: PASSED

All created/modified files verified existent; all commits confirmed in git log.
