# Phase 81: system.notification 应用内通知推送 - Context

**Gathered:** 2026-06-13
**Status:** Ready for planning

## Phase Boundary

插件可通过 `system.notification.send` 向指定用户推送应用内通知，用户通过独立 API Routes 查看通知列表、标记已读、查看未读计数。全链路复用 v4.3 三段式：manifest 声明 → governance gate（assertActionExecutable）→ audit（writeSystemCommandAudit）。

**Requirements:** NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05, NOTIF-06, NOTIF-07, NOTIF-08, SYS-06（详见 REQUIREMENTS.md）

**In scope:**
- `system.notification.send` Command Bus 写入（插件 → Command Bus → 通知表）
- manifest `systemCommands.system.notification` 声明 `notificationTypes` 白名单
- 用户端 API Routes：通知列表（分页/倒序）、标记已读（单条/全部）、未读计数
- 频率限制：每插件每分钟 60 条 + 每用户每小时 30 条
- `recipientUserId` 经 `schoolId` 归属校验（查 memberships 表）
- Bell icon + dropdown 快速预览 + 独立 `/notifications` 通知中心页面
- BullMQ repeatable job：每天凌晨清理 90 天以上已读通知

**Out of scope (this phase):**
- WebSocket 实时推送通知 — 首发客户端轮询（deferred: NOTIF-N01）
- 通知偏好设置（按类型开关）— deferred: NOTIF-N02
- 外部推送通道（FCM/APNs/Email）— deferred: NOTIF-N03
- 通知模板/格式化引擎

## Implementation Decisions

### 通知 UI
- **D-01:** 顶部导航栏 bell icon（显示未读计数 badge）+ dropdown（最近 5 条预览 + "查看全部"链接）+ 独立 `/notifications` 通知中心页面（完整列表、分页、已读管理）

### 通知清理
- **D-02:** BullMQ repeatable job，每天凌晨 3:00 执行，自动删除 `readAt IS NOT NULL AND createdAt < now() - 90 days` 的通知。走 async task ledger 可观测。

### 已读追踪
- **D-03:** 通知表直接加 `readAt` timestamp 字段（`readAt: timestamp`），NULL = 未读。标记已读时更新 `readAt = now()`。"全部已读"批量更新 `WHERE userId = ? AND readAt IS NULL`。

### 通知 API
- **D-04:** 用户端通知操作走独立 API Routes（`/api/notification/list`、`/api/notification/mark-read`、`/api/notification/unread-count`），Auth.js session 认证，直接调用 DAL 层。与插件侧的 `system.notification.send`（Command Bus）路径分离。

### Claude's Discretion
- 通知表 schema 设计（字段：id, pluginId, schoolId, recipientUserId, notificationType, title, body, readAt, createdAt）
- manifest `SystemCommandNotificationSchema` 的具体 shape（`notificationTypes: string[]`，对齐 `SystemCommandHttpRequestSchema` 的 `allowedDomains` 模式）
- 频率限制的 Redis 计数器实现（每插件每分钟 key: `rate:plugin:{pluginId}:minute`，每用户每小时 key: `rate:user:{userId}:hour`）
- `recipientUserId` 归属校验：查 `courseMemberships` 和 `schoolMemberships` 表确认用户在 schoolId 范围内
- Bell icon 具体位置（顶部导航右侧，用户头像左侧）和样式（交 ui-phase 或 Claude 按 DESIGN.md 实现）
- 前端轮询间隔（10s，对齐现有 homework-submission-list 的 polling pattern）
- 通知 dropdown 显示条数（最近 5 条）
- `/notifications` 页面路由组归属（`(teacher)` + `(student)` 各自布局或公共路由）
- 新增 deny reason 码（如 `notification_type_not_allowed`、`rate_limit_exceeded`、`recipient_not_in_school`）
- BullMQ repeatable job 注册到 `src/server/workers/` 或新建通知清理 worker

## Canonical References

**下游 agent 必须在规划或实现前阅读以下文件。**

### Phase 81 直接上下文
- `.planning/ROADMAP.md` — Phase 81 goal + 5 success criteria（NOTIF-01..08 + SYS-06）
- `.planning/REQUIREMENTS.md` — NOTIF-01 至 NOTIF-08、SYS-06 完整需求定义

### v4.3 基础设施（Phase 81 的直接依赖）
- `src/features/system-commands/facade.ts` — `dispatchSystemCommand` 三段式入口，需要新增 `system.notification.send` 分支
- `src/features/system-commands/handler.ts` — `system.http.request` + `system.config` 的 authorize/execute 实现，Phase 81 handler 模式参考
- `src/features/platform-core/commands/registry.ts` — `platformCommandRegistry`，需要注册新 commandType
- `src/features/platform-core/commands/contracts.ts` — `PlatformCommandType`、`PlatformCommandDefinition`、`SystemCommandTypes`
- `src/lib/dto/resource-ai.ts` — `PluginManifestSchema`、`SystemCommandDiscriminatedSchema`（§882），需要新增 `system.notification` variant
- `src/features/runtime-platform/contracts/permissions.ts` — `GovernanceDeniedReasonValues`，需要新增通知相关拒因码
- `src/features/system-commands/audit.ts` — `writeSystemCommandAudit`

### Phase 80 参考（相邻 system 命令模式）
- `.planning/phases/80-system-file/80-CONTEXT.md` — Phase 80 的 Command Bus 集成模式和 API Route 架构
- `src/app/api/system/file/upload/route.ts` — Binary Bypass API Route 模式（upload 走 API Route → 内部调 Command Bus）

### BullMQ 基础设施
- `src/server/workers/async-task-worker.ts` — BullMQ worker 入口，通知清理 repeatable job 注册参考

## Existing Code Insights

### Reusable Assets
- **`dispatchSystemCommand` facade** (`src/features/system-commands/facade.ts`): `system.notification.send` 经此 facade 派发，与 `system.config.set` 的 Command Bus 路径一致
- **`assertActionExecutable`**: 治理门，`commandType` 作为 verb 传入，schoolId 自动注入
- **`writeSystemCommandAudit`**: 全链路审计写入，通知写入必定审计（成功/拒绝均写入）
- **`platformCommandRegistry`**: 新增 `system.notification.send` commandType 注册
- **`buildSystemCommandId` / `buildSystemCommandDedupeKey`**: 命令 ID 和去重 key 构造助手
- **BullMQ repeatable job**: 项目已有 repeatable job 模式（如 schedule reminders），通知清理复用

### Established Patterns
- **Command Bus authorize/execute**: authorize 中解析 manifest + 校验白名单（notificationTypes），execute 写入通知表 + audit
- **Discriminated union manifest**: `SystemCommandDiscriminatedSchema` 新增 `system.notification` variant
- **API Route + DAL 分离**: 用户端读操作走独立 API Route（类似 Phase 80 file download），不走 Command Bus
- **Client polling**: 10s 轮询对齐 homework-submission-list 模式
- **频率限制 via Redis**: 项目已有 ioredis，可用 INCR + EXPIRE 实现滑动窗口限流

### Integration Points
- **`src/lib/dto/resource-ai.ts`**: 新增 `SystemCommandNotificationSchema`，加入 `SystemCommandDiscriminatedSchema`
- **`src/features/system-commands/handler.ts`**: 新增 notification handler（authorize + execute）
- **`src/features/system-commands/facade.ts`**: `dispatchSystemCommand` 新增 `system.notification.send` 分支
- **`src/features/platform-core/commands/registry.ts`**: 注册 `system.notification.send` commandType
- **`src/features/runtime-platform/contracts/permissions.ts`**: 新增 deny reason 码
- **`src/db/schema.ts`**: 新增 `pluginNotifications` 表
- **`src/app/api/notification/`**: 新增 API Routes（list/mark-read/unread-count）
- **`src/lib/dal/notification.ts`**: 新增 DAL 层（list/markRead/unreadCount）
- **`src/server/workers/`**: 注册通知清理 repeatable job

## Specific Ideas

- 通知列表分页使用 cursor-based（对齐现有 DAL 模式），默认每页 20 条
- Redis 限流 key 设计：`notif:plugin:{pluginId}:{minute}` 和 `notif:user:{userId}:{hour}`，INCR + TTL 自动过期
- `recipientUserId` 归属校验在 authorize 阶段完成（查 memberships 表），拒绝时写 audit（reasonCode: `recipient_not_in_school`）
- 前端 bell icon 未读计数通过 `/api/notification/unread-count` 获取，每 10s 轮询（与通知列表共用 SWR/useInterval）
- BullMQ 清理 job 使用 `repeat` 选项（`{ pattern: '0 3 * * *' }`），jobId 固定为 `cleanup-notifications` 防止重复注册

## Deferred Ideas

None — 讨论一直保持在 Phase 81 范围内。

---

*Phase: 81-system.notification 应用内通知推送*
*Context gathered: 2026-06-13*
