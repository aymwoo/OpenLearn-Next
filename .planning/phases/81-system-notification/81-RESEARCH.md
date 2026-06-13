# Phase 81: system.notification 应用内通知推送 - Research

**Researched:** 2026-06-13
**Domain:** 应用内通知系统（DB 持久化 + Command Bus 写入 + RESTful 读路径 + BullMQ 定期清理）
**Confidence:** HIGH

## Summary

Phase 81 为插件系统提供 `system.notification.send` 命令，经 v4.3 三段式 Command Bus 链路（manifest 声明 → governance gate → audit）向指定用户写入应用内通知。用户侧通过独立 API Routes（`/api/notification/*`）查看通知列表、标记已读、查询未读计数，经 Auth.js session 认证直接调用 DAL。前端 Bell icon 已存在于 teacher layout（静态占位），需要接入实时未读计数 + dropdown 预览 + 独立 `/notifications` 页面。

核心技术栈零新依赖：Drizzle ORM（通知表 + cursor 分页）、Zod 4.4.3（manifest schema + DTO 校验）、BullMQ v5.76.10（`upsertJobScheduler` 定期清理）、ioredis v5.10.1（INCR + EXPIRE 频率限制）。项目已有完整的 Command Bus 基础设施（`dispatchSystemCommand` facade、`assertActionExecutable` governance gate、`writeSystemCommandAudit`），Phase 81 只需新增 `system.notification.send` 分支并注册 handler。

**Primary recommendation:** 在 `dispatchSystemCommand` facade 新增 `system.notification.send` 分支，mirror `system.config.set` 的 Envelope + Command Bus 路径；handler 的 authorize 阶段完成 manifest `notificationTypes` 白名单校验 + `recipientUserId` 归属校验 + 频率限制（均写 denial audit），execute 阶段写入 `pluginNotifications` 表 + allowed audit；用户读路径走独立 API Routes 直连 DAL，不走 Command Bus。

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NOTIF-01 | 插件可通过 `system.notification.send` 向指定用户发送应用内通知 | 走 `dispatchSystemCommand` facade → `dispatchPlatformCommand`（见 Standard Stack / Architecture Patterns） |
| NOTIF-02 | 用户可查看通知列表（分页，时间倒序，默认每页 20 条） | 独立 API Route + DAL cursor-based 分页，mirror `pluginFiles` DAL（见 DAL Pattern） |
| NOTIF-03 | 用户可标记通知为已读（单条 / 全部已读） | `readAt` timestamp 字段，单条 UPDATE `WHERE id=? AND userId=?`，全部 UPDATE `WHERE userId=? AND readAt IS NULL` |
| NOTIF-04 | 用户可查看未读通知计数 | `SELECT COUNT(*) FROM pluginNotifications WHERE userId=? AND readAt IS NULL` |
| NOTIF-05 | manifest 声明 `notificationTypes` 白名单 | `SystemCommandNotificationSchema` 加入 `SystemCommandDiscriminatedSchema`（mirror `SystemCommandHttpRequestSchema.allowedDomains`） |
| NOTIF-06 | 频率限制：每插件每分钟 60 条 + 每用户每小时 30 条 | Redis INCR + EXPIRE（key: `notif:plugin:{pluginId}:{minute}` / `notif:user:{userId}:{hour}`） |
| NOTIF-07 | `recipientUserId` 必须经 `schoolId` 归属校验 | 查 `memberships` 表 `userId=? AND schoolId=? AND status='active'` |
| NOTIF-08 | 通知自动清理：超过 90 天的已读通知定期清除 | BullMQ `upsertJobScheduler` cron pattern `0 3 * * *`，DELETE `WHERE readAt IS NOT NULL AND createdAt < now() - 90 days` |
| SYS-06 | 复用 v4.3 三段式链路 | `manifest 声明 → assertActionExecutable → writeSystemCommandAudit`，已在 facade 和 handler 中实现 |

</phase_requirements>

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** 顶部导航栏 bell icon（显示未读计数 badge）+ dropdown（最近 5 条预览 + "查看全部"链接）+ 独立 `/notifications` 通知中心页面
- **D-02:** BullMQ repeatable job，每天凌晨 3:00 执行，自动删除 `readAt IS NOT NULL AND createdAt < now() - 90 days` 的通知。走 async task ledger 可观测。
- **D-03:** 通知表直接加 `readAt` timestamp 字段（`readAt: timestamp`），NULL = 未读。标记已读时更新 `readAt = now()`。"全部已读"批量更新 `WHERE userId = ? AND readAt IS NULL`。
- **D-04:** 用户端通知操作走独立 API Routes（`/api/notification/list`、`/api/notification/mark-read`、`/api/notification/unread-count`），Auth.js session 认证，直接调用 DAL 层。

### Claude's Discretion

- 通知表 schema 设计（字段：id, pluginId, schoolId, recipientUserId, notificationType, title, body, readAt, createdAt）
- manifest `SystemCommandNotificationSchema` 的具体 shape（`notificationTypes: string[]`）
- 频率限制的 Redis 计数器实现
- `recipientUserId` 归属校验：查 `memberships` 表确认用户在 schoolId 范围内
- Bell icon 具体位置和样式（交 ui-phase 或 Claude 按 DESIGN.md 实现）
- 前端轮询间隔（10s）
- 通知 dropdown 显示条数（最近 5 条）
- `/notifications` 页面路由组归属
- 新增 deny reason 码
- BullMQ repeatable job 注册到 worker

### Deferred Ideas (OUT OF SCOPE)

- NOTIF-N01: WebSocket 实时推送
- NOTIF-N02: 通知偏好设置
- NOTIF-N03: 外部推送通道（FCM/APNs/Email）
- 通知模板/格式化引擎
</user_constraints>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `system.notification.send` 写入通知 | API / Backend | — | 经 Command Bus → handler.execute 写入 DB；治理门校验 plugin lifecycle + school scope |
| 通知列表查询（分页/倒序） | API / Backend | — | 独立 API Route 经 Auth.js session 认证 → DAL 直查 DB |
| 标记已读（单条/全部） | API / Backend | — | API Route → DAL UPDATE |
| 未读计数查询 | API / Backend | — | API Route → DAL COUNT |
| 频率限制 | API / Backend | — | Redis INCR + EXPIRE，在 handler.authorize 阶段执行 |
| recipientUserId 归属校验 | API / Backend | — | 在 handler.authorize 阶段查 memberships 表 |
| 通知清理（90天以上已读） | API / Backend | — | BullMQ repeatable job 每天凌晨 3:00 执行 |
| Bell icon + badge + dropdown | Browser / Client | — | React component，10s 轮询 `/api/notification/unread-count` |
| `/notifications` 通知中心页面 | Browser / Client | Frontend Server (SSR) | RSC 页面 + 客户端分页交互 |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | ^0.45.2 [VERIFIED: npm registry] | 通知表 schema + CRUD + cursor 分页 | 项目统一 ORM，已有 pluginFiles、pluginOwnedBusinessData 等表的成熟模式 |
| Zod | ^4.4.3 [VERIFIED: npm registry] | `SystemCommandNotificationSchema`、DTO 校验、payload schema | 项目统一 schema 库，manifest discriminatedUnion 已定义 |
| BullMQ | ^5.76.10 [VERIFIED: npm registry] | `upsertJobScheduler` 注册定时清理任务 | 项目已有完整 async-task worker 基础设施 |
| ioredis | ^5.10.1 [VERIFIED: npm registry] | INCR + EXPIRE 频率限制 | 项目已有 BullMQ 连接的 ioredis 实例，可直接复用连接创建新 Redis client 用于限流 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | (existing) | Bell icon | 已在 teacher layout 中使用 |
| `next/cache` | built-in | `revalidateTag` 通知列表缓存失效 | 写入通知后刷新缓存 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| BullMQ `upsertJobScheduler` | `node-cron` + 独立进程 | node-cron 项目未使用且无法共享 ioredis 连接池；BullMQ 已有基础设施且走 async task ledger 可观测 |
| Redis INCR + EXPIRE | BullMQ rate limiter | BullMQ rate limiter 无法按 pluginId/userId 双层独立限流；INCR + EXPIRE 是标准模式，已在 CONTEXT.md D-06 指定 |
| cursor-based 分页 | offset-based 分页 | cursor-based 是项目 DAL 统一模式（见 `pluginFiles` 分页），对齐现有分页基础设施 |

**Installation:**
```bash
# 零新依赖 — 所有 package 已安装
```

**Version verification:** 所有推荐包已在 `node_modules` 中安装并在 `package.json` 中锁定，版本与 npm registry 最新版本兼容。

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| bullmq | npm | 8+ yrs | ~2M/wk | github.com/taskforcesh/bullmq | [OK] | Approved |
| ioredis | npm | 10+ yrs | ~8M/wk | github.com/redis/ioredis | [OK] | Approved |
| zod | npm | 6+ yrs | ~50M/wk | github.com/colinhacks/zod | [OK] | Approved |
| drizzle-orm | npm | 4+ yrs | ~2M/wk | github.com/drizzle-team/drizzle-orm | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PLUGIN (Host/Teacher Actor)                    │
│  system.notification.send({                                           │
│    notificationType, recipientUserId, title, body                     │
│  })                                                                    │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    dispatchSystemCommand facade                       │
│                                                                       │
│  ① assertActionExecutable(pluginKey, verb="system.notification.send")│
│     └─ lifecycle check + kill-switch + derive schoolId               │
│                                                                       │
│  ② Build PlatformCommand Envelope → dispatchPlatformCommand          │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Command Bus (dispatchPlatformCommand)              │
│                                                                       │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────────┐       │
│  │ payload   │───▶│  authorize    │───▶│  execute              │       │
│  │ validate  │    │  ┌─────────┐ │    │  ┌─────────────────┐ │       │
│  │ (Zod)     │    │  │ Manifest │ │    │  │ INSERT INTO      │ │       │
│  └──────────┘    │  │ re-parse │ │    │  │ pluginNotif...   │ │       │
│                  │  │ + types  │ │    │  │ VALUES (...)      │ │       │
│                  │  │ whitelist│ │    │  └─────────────────┘ │       │
│                  │  └─────────┘ │    │  ┌─────────────────┐ │       │
│                  │  ┌─────────┐ │    │  │ writeSystemCmd   │ │       │
│                  │  │ member  │ │    │  │ Audit(decision:  │ │       │
│                  │  │ -ships  │ │    │  │ "allowed")        │ │       │
│                  │  │ check   │ │    │  └─────────────────┘ │       │
│                  │  └─────────┘ │    └──────────────────────┘       │
│                  │  ┌─────────┐ │                                     │
│                  │  │ Redis   │ │    * Deny paths write audit         │
│                  │  │ rate    │ │      BEFORE throw                   │
│                  │  │ limit   │ │                                     │
│                  │  └─────────┘ │                                     │
│                  └──────────────┘                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    USER READS (Teacher / Student)                     │
│                                                                       │
│  GET /api/notification/list?cursor=&limit=20                         │
│  POST /api/notification/mark-read  { notificationId }                │
│  POST /api/notification/mark-read  { markAll: true }                 │
│  GET /api/notification/unread-count                                  │
│                                                                       │
│  Auth.js session → auth() wrapper → validate user → DAL query       │
│  (Does NOT go through Command Bus)                                    │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DAL (src/lib/dal/notification.ts)              │
│                                                                       │
│  getNotifications(userId, cursor?, limit) → paginated list           │
│  markNotificationRead(userId, notificationId) → single               │
│  markAllNotificationsRead(userId) → batch update                     │
│  getUnreadCount(userId) → number                                     │
│  insertNotification(input) → used by handler.execute only            │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SQLite (pluginNotifications table)                 │
│                                                                       │
│  id | pluginId | schoolId | recipientUserId | notificationType |     │
│  title | body | readAt | createdAt                                    │
│                                                                       │
│  Indexes:                                                             │
│    (recipientUserId, readAt) — list + unread count                   │
│    (recipientUserId, createdAt DESC) — list optimization             │
│    (readAt, createdAt) — cleanup job                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        BULLMQ WORKER (scheduled)                      │
│                                                                       │
│  upsertJobScheduler("cleanup-notifications",                          │
│    { pattern: "0 0 3 * * *" },  // 每天凌晨 3:00                     │
│    { name: "notification.cleanup", data: {} }                        │
│  )                                                                    │
│                                                                       │
│  worker processor:                                                    │
│    DELETE FROM pluginNotifications                                    │
│    WHERE readAt IS NOT NULL AND createdAt < now() - 90 days          │
└─────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
src/
├── db/
│   └── schema.ts                    # 新增 pluginNotifications 表定义
├── lib/
│   ├── dal/
│   │   └── notification.ts          # DAL: list/markRead/unreadCount/insertNotification
│   ├── dto/
│   │   ├── resource-ai.ts           # 新增 SystemCommandNotificationSchema
│   │   └── notification.ts          # 新增 NotificationDTO schemas
│   └── cache-policy.ts              # 新增通知列表 cache tags
├── features/
│   └── system-commands/
│       ├── facade.ts                # dispatchSystemCommand 新增 notification.send 分支
│       ├── handler.ts               # 新增 notification handler (authorize + execute)
│       └── audit.ts                 # writeSystemCommandAudit commandType 新增 notification.send
├── features/
│   ├── platform-core/commands/
│   │   ├── contracts.ts             # 新增 SystemNotificationSendPayloadSchema + PlatformCommand variant
│   │   └── registry.ts              # 注册 system.notification.send commandType
│   └── runtime-platform/contracts/
│       └── permissions.ts           # 新增 deny reason 码
├── features/
│   └── async-tasks/
│       └── worker/
│           └── processors/
│               └── notification-cleanup.ts  # 通知清理 processor
├── app/
│   └── api/
│       └── notification/
│           ├── list/route.ts        # GET notifications list (cursor pagination)
│           ├── mark-read/route.ts   # POST mark single / all read
│           └── unread-count/route.ts # GET unread count
├── app/
│   └── (common)/
│       └── notifications/
│           └── page.tsx             # /notifications 通知中心页面
├── components/
│   └── notification/
│       ├── notification-bell.tsx    # Bell icon + badge + dropdown preview
│       ├── notification-item.tsx    # 单条通知渲染
│       └── notification-list.tsx    # 通知列表（分页）
```

### Pattern 1: Command Bus Handler (authorize + execute)

**What:** handler 分为 authorize 和 execute 两个函数。authorize 中完成 manifest 重解析、白名单匹配、成员归属校验、频率限制——所有拒绝路径先写 audit 再 throw `PlatformCommandExecutionError`。execute 中写 DB + 写 allowed audit。

**When to use:** `system.notification.send` 的 Command Bus handler 实现。

**Example (authorize skeleton, from system.config pattern):**
```typescript
// Source: src/features/system-commands/handler.ts (existing system.config.set pattern)
async function notificationSendAuthorize({
  command,
}: {
  command: PlatformCommand;
}): Promise<void> {
  const notifCmd = command as SystemNotificationSendCommand;
  const pluginId = command.scope.pluginId;
  const schoolId = command.scope.schoolId;

  // 1. Manifest re-parse + notificationTypes whitelist match
  const { row, manifest, notificationEntries } = await resolveSystemNotificationManifestEntry(pluginId, schoolId);
  const lifecycleState = row.lifecycleState ?? "ready";

  const matchedType = notificationEntries.some((entry) =>
    entry.notificationTypes.includes(notifCmd.payload.notificationType),
  );
  if (!matchedType) {
    return void (await denySystemNotification({..., reasonCode: "notification_type_not_allowed", ...}));
  }

  // 2. recipientUserId membership check
  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.userId, notifCmd.payload.recipientUserId),
      eq(memberships.schoolId, schoolId),
      eq(memberships.status, "active"),
    ),
  });
  if (!membership) {
    return void (await denySystemNotification({..., reasonCode: "recipient_not_in_school", ...}));
  }

  // 3. Rate limit check (Redis)
  const pluginRateOk = await checkPluginRateLimit(pluginId);
  if (!pluginRateOk) {
    return void (await denySystemNotification({..., reasonCode: "rate_limit_exceeded", ...}));
  }
  const userRateOk = await checkUserRateLimit(notifCmd.payload.recipientUserId);
  if (!userRateOk) {
    return void (await denySystemNotification({..., reasonCode: "rate_limit_exceeded", ...}));
  }
}
```

**Example (execute skeleton):**
```typescript
// Source: src/features/system-commands/handler.ts (existing system.config.set pattern)
async function notificationSendExecute({
  command,
  attemptNumber: _attemptNumber,
}: {
  command: PlatformCommand;
  attemptNumber: number;
}): Promise<PlatformCommandExecutionResult> {
  const notifCmd = command as SystemNotificationSendCommand;

  const [notification] = await db
    .insert(pluginNotifications)
    .values({
      pluginId: command.scope.pluginId,
      schoolId: command.scope.schoolId,
      recipientUserId: notifCmd.payload.recipientUserId,
      notificationType: notifCmd.payload.notificationType,
      title: notifCmd.payload.title,
      body: notifCmd.payload.body,
    })
    .returning();

  await writeSystemCommandAudit({
    pluginId: command.scope.pluginId,
    schoolId: command.scope.schoolId,
    commandId: command.id,
    actorId: command.actor.actorId,
    actorScope: command.actor.actorScope,
    lifecycleState: "ready",
    correlationId: command.correlation.correlationId,
    decision: "allowed",
    payloadJson: {
      notificationId: notification.id,
      notificationType: notifCmd.payload.notificationType,
      recipientUserId: notifCmd.payload.recipientUserId,
    },
    commandType: "system.notification.send",
  });

  return successResult({ notificationId: notification.id });
}
```

### Pattern 2: Manifest Discriminated Union Extension

**What:** 在 `SystemCommandDiscriminatedSchema` 新增 `system.notification` variant，mirror `system.file` 和 `system.config` 的模式。

**When to use:** 在 `src/lib/dto/resource-ai.ts` 中定义 Schema。

```typescript
// Source: src/lib/dto/resource-ai.ts (existing SystemCommandConfigSchema pattern, line 827)
export const SystemCommandNotificationSchema = z.strictObject({
  notificationTypes: z
    .array(
      z.string().min(1).max(64).regex(/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*$/, {
        message: "SYSTEM_COMMAND_NOTIFICATION_TYPE_INVALID",
      }),
    )
    .min(1, { message: "SYSTEM_COMMAND_NOTIFICATION_TYPE_INVALID" }),
});

// Add to discriminated union:
export const SystemCommandDiscriminatedSchema = z.discriminatedUnion("command", [
  // ... existing variants
  z.strictObject({ command: z.literal("system.notification") }).merge(
    SystemCommandNotificationSchema,
  ),
]);
```

### Pattern 3: Cursor-Based DAL Pagination (mirror pluginFiles)

**What:** DAL 函数接受 `{ userId, cursor?, limit }`，返回 `{ items, nextCursor }`。cursor 使用 `createdAt` 值的 base64 编码（或直接传递 ISO 字符串）。

**When to use:** 通知列表查询。

```typescript
// Source: src/lib/dal/files.ts (existing cursor-based pagination pattern)
export async function getNotifications(input: {
  userId: string;
  cursor?: string;
  limit?: number;
}): Promise<{ items: NotificationDTO[]; nextCursor: string | null }> {
  const take = Math.min(input.limit ?? 20, 100);
  
  let cursorCondition = undefined;
  if (input.cursor) {
    const cursorDate = new Date(Buffer.from(input.cursor, "base64").toString());
    cursorCondition = lt(pluginNotifications.createdAt, cursorDate);
  }

  const rows = await db.query.pluginNotifications.findMany({
    where: and(
      eq(pluginNotifications.recipientUserId, input.userId),
      cursorCondition,
    ),
    orderBy: desc(pluginNotifications.createdAt),
    limit: take + 1,
  });

  const items = rows.slice(0, take);
  const nextCursor = rows.length > take
    ? Buffer.from(items[items.length - 1].createdAt.toISOString()).toString("base64")
    : null;

  return { items: items.map(toDTO), nextCursor };
}
```

### Anti-Patterns to Avoid

- **直接在 authorize 中查询 notificationTypes 而不重新解析 manifest:** 必须每次重新 `PluginManifestSchema.parse(row.manifestJson)` 以获取最新 manifest，不能依赖缓存。
- **频率限制使用 `Date.now()` 而非 Redis TTL 对齐:** 使用 `Math.floor(Date.now() / 60000)` 作为分钟窗口计算，配合 `INCR + EXPIRE` 实现原子操作。
- **读操作走 Command Bus:** NOTIF-02/03/04 是纯读操作，走独立 API Route + DAL，绝不创建 Command Bus envelope。
- **deny 路径先抛错后写 audit:** 遵循项目既有模式：先 `writeSystemCommandAudit` 再 `throw PlatformCommandExecutionError`。
- **cursor 分页使用 offset-based:** 对齐项目统一模式（`pluginFiles` DAL），使用 createdAt cursor，复用项目 infra。

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 通知表 CRUD | 自建 ORM/SQL 拼接 | Drizzle ORM (insert/findMany/update) | 项目统一 ORM，已有类型安全 + migration pipeline |
| 定期清理任务 | `setInterval` / `node-cron` | BullMQ `upsertJobScheduler` (cron pattern `0 0 3 * * *`) | 项目已有 BullMQ worker 进程，可观测（async task ledger），复用 ioredis 连接池 |
| 频率限制 | 内存 Map / 自建 Lua | ioredis `INCR` + `EXPIRE` | 分布式安全（多进程/多实例共享），已在 CONTEXT.md D-06 指定 |
| 通知列表分页 | offset/limit 自实现 | cursor-based（复用项目 pattern） | 项目统一分页模式，避免 offset 漂移 |
| 跨校隐私校验 | 自建 membership 查询逻辑 | Drizzle `findFirst` on `memberships` 表 | 复用现有 `memberships` 表（userId + schoolId + status 唯一索引） |
| Command Bus 派发 | 自定义消息队列 | `dispatchPlatformCommand` (项目基础设施) | Phase 77-79 已建立的 v4.3 三段式链路 |
| Manifest Schema 校验 | 自定义 validation | Zod `z.discriminatedUnion` (项目既有模式) | `SystemCommandDiscriminatedSchema` 已有 3 个 variant，新增第 4 个 |

**Key insight:** Phase 81 的主要复杂度不在新技术栈，而在正确遵循既有的三段式 Command Bus 模式（manifest 声明 → governance gate → audit）。所有拒绝路径必须先写 audit 再抛错——这是 v4.3 安全模型的核心不变式。

## Common Pitfalls

### Pitfall 1: `writeSystemCommandAudit` 的 commandType 需要扩展
**What goes wrong:** 调用 `writeSystemCommandAudit` 时使用 `"system.notification.send"` 作为 commandType，但该函数签名的类型注解中尚未包含该值。
**Why it happens:** `writeSystemCommandAudit` 的参数 `commandType` 类型是联合类型 `"system.http.request" | "system.config.set" | "system.config.get" | "system.file.upload" | "system.file.delete"`。
**How to avoid:** 在 `audit.ts` 的 `SystemCommandAuditInput.commandType` 中新增 `"system.notification.send"`。
**Warning signs:** TypeScript 编译错误 `Type '"system.notification.send"' is not assignable to type ...`。

### Pitfall 2: 频率限制 key 的时间窗口计算精度
**What goes wrong:** `INCR` 后如果进程崩溃，`EXPIRE` 未设置导致 key 永久存在（内存泄漏）。或在窗口边界处并发导致 count 被错误累加。
**Why it happens:** Redis `INCR` 和 `EXPIRE` 是两个独立命令，非原子性。
**How to avoid:** 使用 Lua script 或 pipeline 原子化执行：
```lua
-- 原子化的 INCR + EXPIRE
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return count
```
**Warning signs:** Redis key 不自动过期；边界时刻（如分钟切换）频率统计不准确。

### Pitfall 3: `recipientUserId` 归属校验的表选择
**What goes wrong:** 使用了不存在的 `courseMemberships` 或 `schoolMemberships` 表。
**Why it happens:** 项目中只有一张 `memberships` 表（`membership`），包含 `userId`、`schoolId`、`role`、`status` 字段。CONTEXT.md 提到的 "courseMemberships 和 schoolMemberships" 并不存在为独立表。
**How to avoid:** 统一使用 `memberships` 表查询：`WHERE userId=? AND schoolId=? AND status='active'`。
**Warning signs:** TypeScript 报错找不到 `courseMemberships` 或 `schoolMemberships`。

### Pitfall 4: BullMQ `upsertJobScheduler` 需要 Queue 实例但不可在 import-time 创建
**What goes wrong:** 在模块顶层 `new Queue(...)` 导致 ioredis 连接在 import 时即建立。
**Why it happens:** BullMQ Queue 构造会立即尝试连接 Redis。需要 lazy creation。
**How to avoid:** 在 worker bootstrap 的 `start()` 方法中创建 Queue 并调用 `upsertJobScheduler`，mirror 现有的 `startDueDispatchSweepLoop` 模式（见 `bootstrap.ts` 第 115-127 行）。
**Warning signs:** 模块 import 时报 Redis 连接错误。

### Pitfall 5: `PlatformCommandSchema` discriminatedUnion 遗漏 notification variant
**What goes wrong:** 新增了 `SystemNotificationSendPayloadSchema` 但未在 `PlatformCommandSchema` discriminaedUnion 中添加 variant。
**Why it happens:** `contracts.ts` 中 payload schema 和 PlatformCommandSchema 是分开定义的。
**How to avoid:** 在 `PlatformCommandPayloadSchemas` 添加 entry，在 `PlatformCommandSchema` discriminatedUnion 添加 variant，在 `SystemCommandTypes` 添加 `"system.notification.send"`——三处同步更新。
**Warning signs:** Zod runtime validation error for `system.notification.send` command type.

## Code Examples

### Manifest Schema (SystemCommandNotificationSchema)

```typescript
// Source: src/lib/dto/resource-ai.ts (mirroring SystemCommandConfigSchema, line 827)
// [VERIFIED: existing codebase pattern]

export const SystemCommandNotificationSchema = z.strictObject({
  notificationTypes: z
    .array(
      z.string().min(1).max(64).regex(/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*$/, {
        message: "SYSTEM_COMMAND_NOTIFICATION_TYPE_INVALID",
      }),
    )
    .min(1, { message: "SYSTEM_COMMAND_NOTIFICATION_TYPE_INVALID" }),
});
```

### Payload Schema (SystemNotificationSendPayloadSchema)

```typescript
// Source: src/features/platform-core/commands/contracts.ts
// Pattern mirror: SystemConfigSetPayloadSchema

const SystemNotificationSendPayloadSchema = z.strictObject({
  recipientUserId: z.string().min(1),
  notificationType: z.string().min(1).max(64),
  title: z.string().min(1).max(256),
  body: z.string().min(1).max(2048),
});
```

### Database Schema (pluginNotifications)

```typescript
// Source: src/db/schema.ts (mirroring pluginFiles pattern, line 1917)

export const pluginNotifications = sqliteTable(
  "pluginNotification",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    pluginId: text("pluginId")
      .notNull()
      .references(() => pluginRegistrations.id, { onDelete: "cascade" }),
    schoolId: text("schoolId")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    recipientUserId: text("recipientUserId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    notificationType: text("notificationType").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    readAt: integer("readAt", { mode: "timestamp_ms" }), // NULL = unread
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    index("pluginNotif_user_read_idx").on(table.recipientUserId, table.readAt),
    index("pluginNotif_user_created_idx").on(table.recipientUserId, table.createdAt),
    index("pluginNotif_cleanup_idx").on(table.readAt, table.createdAt),
  ],
);
```

### Redis Rate Limiter (Lua script)

```typescript
// Source: ioredis documentation + CONTEXT.md D-06 specification
// [CITED: docs.bullmq.io/guide/job-schedulers, ioredis docs]

const RATE_LIMIT_LUA = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return count
`;

// Usage:
// key: `notif:plugin:{pluginId}:{Math.floor(Date.now() / 60000)}`
// key: `notif:user:{userId}:{Math.floor(Date.now() / 3600000)}`
// TTL: 65s (minute window) / 3660s (hour window)
```

### BullMQ Repeatable Cleanup Job

```typescript
// Source: BullMQ v5.76.10 Queue API (installed in node_modules)
// [VERIFIED: node_modules/bullmq/dist/esm/classes/queue.d.ts line 193]

// In worker bootstrap (mirror startDueDispatchSweepLoop pattern):
const cleanupQueue = new Queue("notification-cleanup", {
  connection: await getBullmqProducerConnection(),
  prefix: getBullmqEnvironmentCapability().prefix,
});

await cleanupQueue.upsertJobScheduler(
  "cleanup-notifications",           // fixed jobSchedulerId
  { pattern: "0 0 3 * * *" },       // daily at 3:00 AM
  {
    name: "notification.cleanup",
    data: {},
    opts: {
      removeOnComplete: true,
      removeOnFail: 10,
    },
  },
);

// Worker processor:
async function processNotificationCleanup(job: Job) {
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000; // 90 days ago
  const result = await db
    .delete(pluginNotifications)
    .where(
      and(
        isNotNull(pluginNotifications.readAt),
        lt(pluginNotifications.createdAt, new Date(cutoff)),
      ),
    )
    .returning({ deletedId: pluginNotifications.id });

  return { deletedCount: result.length };
}
```

### API Route Pattern (list)

```typescript
// Source: src/app/api/system/file/download/route.ts (Phase 80 API Route pattern)
// [VERIFIED: existing codebase]

import { auth } from "@/lib/auth/auth";
import { getNotifications } from "@/lib/dal/notification";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);

  const result = await getNotifications({
    userId: session.user.id,
    cursor,
    limit: Math.min(limit, 100),
  });

  return NextResponse.json(result);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 通知写入无治理 | 三段式 Command Bus（manifest → gate → audit） | Phase 77-79 (v4.3) | 通知写入有完整 governance + 审计 |
| 无频率限制 | Redis INCR + EXPIRE 双层限流 | Phase 81 (NEW) | 防止单插件滥用通知 |
| 无通知系统 | pluginNotifications 表 + API Routes + UI | Phase 81 (NEW) | 插件可推送应用内通知，用户可管理 |
| BullMQ `add(repeat: {})` (deprecated) | `upsertJobScheduler` (v5.16.0+) | BullMQ v5.16.0 | 新 API 更明确且防重复注册 |

**Deprecated/outdated:**
- BullMQ `queue.add("name", data, { repeat: { pattern: "..." } })` — 使用 `upsertJobScheduler` 替代
- 内存 Map rate limiter — 使用 Redis 分布式限流

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `memberships` 表（`membership`）是项目中唯一的成员关系表，足以验证 `recipientUserId` 归属 | Architecture Patterns / Common Pitfalls | **LOW** — CONTEXT.md 提到 `courseMemberships` 和 `schoolMemberships`，但代码库中只有 `memberships` 表。如果项目还有独立的学生-班级映射需要验证，可能需要额外查 `classMembers` 表。但不影响 school 级归属判断。 |
| A2 | Redis 在部署环境中可达（`BULLMQ_REDIS_URL` 已配置） | Standard Stack | **MEDIUM** — 开发环境 Redis 未运行。频率限制依赖 Redis，如果 Redis 不可达需要 fail-open 策略（允许通知发送但记录告警）或使频率限制为 no-op。 |
| A3 | 通知 Bell icon 在 teacher layout 中的位置（用户头像左侧）保持不变 | Architecture Patterns | **LOW** — 即使位置微调，组件实现逻辑不变。 |
| A4 | `/notifications` 页面放在 `(common)` 路由组（不做 layout 包裹） | Architecture Patterns | **LOW** — 可以在 teacher/student 各自 layout 下分别创建页面，两种方案都是可接受的。 |

## Open Questions

1. **Redis 不可达时的频率限制 fallback 策略**
   - What we know: 项目已使用 ioredis（BullMQ 连接），开发环境 Redis 未运行。频率限制在 authorize 阶段执行——如果 Redis 不可达，是否需要 fail-open（允许发送）还是 fail-closed（拒绝发送）？
   - What's unclear: CONTEXT.md 未指定 Redis 不可达时的行为。
   - Recommendation: FAIL-OPEN（允许发送但记录告警 log），避免因 Redis 故障导致所有通知丢失。日志中标注 `[notification-rate-limit] redis unavailable, skipping rate check`。这与 BullMQ 基础设施的 fail-open 模式对齐。

2. **`notificationType` 的命名规范**
   - What we know: manifest 中 `notificationTypes: string[]`，handler 逐请求匹配。CONTEXT.md 未给出类型命名规范。
   - What's unclear: 是使用反向域名（如 `system.file.quota_exceeded`）还是简单标签（如 `homework_due`）？
   - Recommendation: 使用 `pluginKey.notificationType` 的 dot-delimited 格式（如 `homework-plugin.assignment_due`），对齐 manifest 中 `pluginKey` 的既有命名模式。此规范不影响 Phase 81 实现（只做 string match），但应在文档中建议。

3. **通知 cleanup 是否需要 async task ledger 记录**
   - What we know: CONTEXT.md D-02 说 "走 async task ledger 可观测"。这意味着清理任务应作为 async task 入队并记录执行结果。
   - What's unclear: 是否需要注册为完整的 `asyncTaskDefinition`（类似 `schedule.reminder_delivery`），还是用简单的 `upsertJobScheduler` 直接执行？
   - Recommendation: 采用简化方式——`upsertJobScheduler` 注册 repeatable job，worker processor 直接执行 DELETE 并返回 `{ deletedCount }`。不需要完整的 asyncTaskRegistry + enqueueAsyncTask 链路，因为 cleanup 是系统级定时操作而非用户触发。输出可观测性通过 BullMQ 内置的 job log 和 worker 日志满足。

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | 所有代码 | ✓ | v24.1.0 | — |
| pnpm | 包管理 / scripts | ✓ | 10.33.0 | — |
| Redis (via ioredis) | 频率限制 + BullMQ | ✗ (dev) | — | FAIL-OPEN: 频率限制 skip（记录告警）；BullMQ cleanup 跳过（日志告警） |
| BullMQ / ioredis | 通知清理 job + 频率限制 | ✓ (installed) | 5.76.10 / 5.10.1 | — |
| Drizzle ORM | 通知表 CRUD | ✓ (installed) | 0.45.2 | — |
| Zod | Schema 校验 | ✓ (installed) | 4.4.3 | — |
| SQLite (libSQL) | 通知持久化 | ✓ | 项目已有 | — |

**Missing dependencies with no fallback:**
- Redis（频率限流 + 通知清理）— 部署环境需确认 `BULLMQ_REDIS_URL` 已配置。开发环境可跳过这两项功能。

**Missing dependencies with fallback:**
- Redis（dev 环境）→ 频率限制 FAIL-OPEN，清理 job 跳过。

## Validation Architecture

> Skipped: `workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Auth.js v5 session — API Routes 使用 `auth()` wrapper |
| V3 Session Management | yes | Auth.js JWT strategy — session 自动管理 |
| V4 Access Control | yes | 通知读路径：仅 owner user；写路径：manifest whitelist + membership 校验 |
| V5 Input Validation | yes | Zod 4 — manifest schema + payload schema + DTO |
| V6 Cryptography | no | 无加密需求（通知内容为纯文本，传输经 HTTPS） |

### Known Threat Patterns for Notification Systems

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 跨校隐私泄漏（recipientUserId 不在 schoolId 下） | Information Disclosure | authorize 阶段查 `memberships` 表进行 `userId + schoolId + status='active'` 校验 |
| 通知轰炸（单插件高频发送） | Denial of Service | Redis INCR + EXPIRE：每插件每分钟 60 条上限 |
| 单用户通知轰炸 | Denial of Service | Redis INCR + EXPIRE：每用户每小时 30 条上限 |
| Manifest 未声明的 notificationType | Elevation of Privilege | authorize 阶段 re-parse manifest + notificationTypes 白名单匹配 |
| 注入通知内容（XSS via title/body） | Tampering | Zod `max(256)` / `max(2048)` 限制字段长度；前端渲染时走 React JSX 自动转义 |
| 未认证用户读取通知 | Spoofing | API Routes 经 `auth()` 获取 session，userId 从 session 派生绝不从 query param 获取 |
| 通知表数据膨胀 | Denial of Service | BullMQ 每日清理：DELETE `readAt IS NOT NULL AND createdAt < now() - 90 days` |
| 生命周期异常插件发送通知 | Elevation of Privilege | `assertActionExecutable` 已阻止 lifecycle blocked/kill-switched 插件 |

## Sources

### Primary (HIGH confidence)
- src/features/system-commands/facade.ts — `dispatchSystemCommand` 三段式入口（system.config.set / system.file.upload 分支模式）
- src/features/system-commands/handler.ts — handler authorize/execute 模式 + deny 先写 audit 再抛错
- src/features/system-commands/audit.ts — `writeSystemCommandAudit` 签名 + commandType 联合类型
- src/features/platform-core/commands/contracts.ts — `PlatformCommandPayloadSchemas` + `PlatformCommandSchema` discriminatedUnion
- src/features/platform-core/commands/registry.ts — `platformCommandRegistry` 注册模式
- src/lib/dto/resource-ai.ts — `SystemCommandDiscriminatedSchema` + manifest schema 模式
- src/features/runtime-platform/contracts/permissions.ts — `GovernanceDeniedReasonValues`
- src/db/schema.ts — 现有表结构（`memberships`、`pluginFiles`、`governanceAudits`）+ Drizzle 模式
- src/lib/dal/files.ts — cursor-based DAL 分页模式
- src/lib/dal/membership.ts — `getUserMembershipsDTO` 现有函数
- src/features/async-tasks/worker/bootstrap.ts — BullMQ worker 启动模式 + sweep loop
- src/features/async-tasks/infra/bullmq.ts — Queue/Worker 创建模式
- src/features/async-tasks/infra/connection.ts — ioredis 连接 + 环境变量
- src/features/schedule/reminders/server.ts — sweep loop 执行定时任务模式
- src/app/(teacher)/teacher/layout.tsx — Bell icon 现有占位（line 63）
- node_modules/bullmq/dist/esm/classes/queue.d.ts — `upsertJobScheduler` API 验证（line 193）

### Secondary (MEDIUM confidence)
- BullMQ official docs (docs.bullmq.io/guide/job-schedulers) — `upsertJobScheduler` cron pattern (`0 0 3 * * *`)
- ioredis docs — INCR + EXPIRE 原子操作 pattern

### Tertiary (LOW confidence)
- WebSearch results for rate limiting patterns — general INCR + EXPIRE approach（标准模式，高可信度不标记为 LOW）

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 零新依赖，所有包已安装并验证。BullMQ `upsertJobScheduler` API 已通过 node_modules 类型定义验证。
- Architecture: HIGH — 三段式 Command Bus 链路 completly 代码库验证，handler authorize/execute 模式清晰。
- Pitfalls: HIGH — 基于 Phase 78/79/80 实现经验和代码审查，所有陷阱均可在代码库中找到验证。

**Research date:** 2026-06-13
**Valid until:** 2026-06-27 (30 days — 技术栈稳定)
