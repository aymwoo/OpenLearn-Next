---
phase: 81-system-notification
verified: 2026-06-13T12:00:00Z
status: gaps_found
score: 15/17 must-haves verified
overrides_applied: 0
gaps:
  - truth: "用户可通过 POST /api/notification/mark-read 标记单条已读"
    status: partial
    reason: "前端 wiring 错误：notification-bell.tsx 和 notification-list.tsx 发送 { notificationId: id } 但 MarkReadSchema 是 discriminatedUnion('markAll')，要求 { markAll: false, notificationId: id }。mark-read API route 会因 Zod 校验失败返回 400。"
    artifacts:
      - path: "src/components/notification/notification-bell.tsx"
        issue: "line 38: JSON.stringify({ notificationId: id }) 应为 JSON.stringify({ markAll: false, notificationId: id })"
      - path: "src/components/notification/notification-list.tsx"
        issue: "line 20: JSON.stringify({ notificationId: id }) 应为 JSON.stringify({ markAll: false, notificationId: id })"
    missing:
      - "notification-bell.tsx line 38 改为 body: JSON.stringify({ markAll: false, notificationId: id })"
      - "notification-list.tsx line 20 改为 body: JSON.stringify({ markAll: false, notificationId: id })"
  - truth: "未读计数每 10s 轮询 GET /api/notification/unread-count"
    status: partial
    reason: "PLAN-03 must_haves 引用 useSWR，但项目未安装 SWR 依赖。实现使用 useEffect+setInterval+Page Visibility API 替代，功能等价的轮询已实现（10s interval + 不可见暂停 + 恢复立即拉取）。"
    artifacts:
      - path: "src/hooks/use-unread-count.ts"
        issue: "PLAN-03 must_haves 声明的 contains: 'useSWR' 未满足——无 SWR 导入。但实现是正确的原生轮询方案。"
    missing:
      - "接受当前 useEffect+setInterval 实现，或添加 SWR 依赖改用 useSWR"
---

# Phase 81: system.notification Verification Report

**Phase Goal:** 插件可通过 `system.notification.*` 命令向指定用户推送应用内通知，用户可查看通知列表、标记已读、查看未读计数，全链路治理审计，复用 v4.3 三段式链路

**Verified:** 2026-06-13
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                                     | Status     | Evidence                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | pluginNotifications 表存在于 Drizzle schema 中，9 字段 + 3 索引 + FK                                                 | ✓ VERIFIED | src/db/schema.ts:1964-2000，9 字段（id/pluginId/schoolId/recipientUserId/notificationType/title/body/readAt/createdAt），3 FK cascade，3 复合索引         |
| 2   | manifest 中 system.notification 在 SystemCommandDiscriminatedSchema 中为合法 variant                                  | ✓ VERIFIED | src/lib/dto/resource-ai.ts:882-891（SystemCommandNotificationSchema），902-914（discriminatedUnion 第 4 variant）                                            |
| 3   | PlatformCommandType 联合类型包含 system.notification.send                                                                | ✓ VERIFIED | src/features/platform-core/commands/contracts.ts:39-45（SystemCommandTypes 数组包含 "system.notification.send"），50-56（PlatformCommandTypeSchema）        |
| 4   | GovernanceDeniedReasonValues 包含 notification 相关拒因码                                                               | ✓ VERIFIED | src/features/runtime-platform/contracts/permissions.ts:47-49（notification_type_not_allowed / rate_limit_exceeded / recipient_not_in_school）               |
| 5   | Notification DTO schemas 文件存在并导出完整类型                                                                          | ✓ VERIFIED | src/lib/dto/notification.ts:14-55（NotificationInsertSchema / NotificationDTOSchema / MarkReadSchema），所有类型已导出                                    |
| 6   | 插件经 dispatchSystemCommand 调用 system.notification.send 能写入通知且写入 audit 记录                                  | ✓ VERIFIED | src/features/system-commands/handler.ts:1829-1868（execute 用 insertNotification + writeSystemCommandAudit），facade.ts:468-509（facade 分支 + envelope）  |
| 7   | manifest notificationTypes 白名单生效：未声明的 notificationType 被拒绝并写 denial audit                                | ✓ VERIFIED | src/features/system-commands/handler.ts:1708-1743（notificationEntries.length===0 → deny；forEach includes 检查）                                        |
| 8   | recipientUserId 经 memberships 表校验归属 schoolId，跨校写入被拒绝                                                  | ✓ VERIFIED | src/features/system-commands/handler.ts:1747-1766（memberships 查询 WHERE userId=recipientUserId AND schoolId=schoolId AND status='active'）               |
| 9   | 频率限制：每插件每分钟 >60 条被拒绝，每用户每小时 >30 条被拒绝                                                        | ✓ VERIFIED | src/features/system-commands/rate-limiter.ts:37-49（checkPluginRateLimit 60/min），66-79（checkUserRateLimit 30/hr），Lua 原子化 INCR+EXPIRE，FAIL-OPEN  |
| 10  | 用户可通过 GET /api/notification/list 分页查看自己的通知（倒序）                                                        | ✓ VERIFIED | src/app/api/notification/list/route.ts（Auth.js session + getNotifications cursor-based DESC），src/lib/dal/notification.ts:101-131（cursor 分页）     |
| 11  | 用户可通过 POST /api/notification/mark-read 标记单条/全部已读                                                        | ⚠️ PARTIAL | mark-read route 存在且正确（line 21-55）。但前端 wiring 错误：notification-bell.tsx:38 和 notification-list.tsx:20 发送 `{notificationId:id}` 而非 `{markAll:false, notificationId:id}`，将被 Zod discriminatedUnion 拒绝。全部标记已读（notification-page-content.tsx:25 `{markAll:true}`）不受影响。 |
| 12  | 用户可通过 GET /api/notification/unread-count 获取未读计数                                                              | ✓ VERIFIED | src/app/api/notification/unread-count/route.ts（Auth.js session + getUnreadCount），src/hooks/use-unread-count.ts（10s 轮询 + Page Visibility API）  |
| 13  | 所有拒绝路径先写 audit 再抛 PlatformCommandExecutionError                                                             | ✓ VERIFIED | src/features/system-commands/handler.ts:1621-1677（denySystemNotification 先 writeSystemCommandAudit(decision:"denied") 后 throw），所有 5 个拒绝分支均遵循此模式 |
| 14  | 通知时间显示为"刚刚"/"N分钟前"/"N小时前"/"N天前"格式                                                            | ✓ VERIFIED | src/lib/relative-time.ts（完整的相对时间格式化：<60s → "刚刚"，1-59min → "N分钟前"，1-23h → "N小时前"，1-30d → "N天前"，>30d → YYYY-MM-DD）          |
| 15  | 顶部导航栏 Bell icon 显示未读计数 badge，有未读时 icon 变 primary 色                                               | ✓ VERIFIED | src/components/notification/notification-bell.tsx（useUnreadCount hook + badge "9+" overflow + primary/on-surface-variant 颜色切换），teacher/layout.tsx line 63 已替换 |
| 16  | 超过 90 天的已读通知每天凌晨 3:00 自动删除                                                                              | ✓ VERIFIED | src/server/workers/notification-cleanup.ts（cron: "0 0 3 * * *"，DELETE WHERE readAt IS NOT NULL AND createdAt < cutoff(90天)），bootstrap.ts line 187 已注册 |
| 17  | 点击 Bell icon 展开 dropdown，显示最近 5 条通知预览 + 查看全部链接                                                   | ✓ VERIFIED | src/components/notification/notification-dropdown.tsx（notifications.slice(0,5) + "查看全部" Link + "最近通知" heading + 360px 宽度）                 |

**Score:** 15/17 truths verified (2 partial)

### Partial/Failed Truths Detail

**Truth 11 — 单条标记已读前端 wiring 错误：**

- `notification-bell.tsx` line 38：`JSON.stringify({ notificationId: id })`
- `notification-list.tsx` line 20：`JSON.stringify({ notificationId: id })`
- MarkReadSchema 定义（`src/lib/dto/notification.ts:50-53`）：
  ```typescript
  z.discriminatedUnion("markAll", [
    z.strictObject({ markAll: z.literal(true) }),
    z.strictObject({ markAll: z.literal(false), notificationId: z.string().min(1) }),
  ])
  ```
- Zod discriminatedUnion 要求 discriminator 字段 `markAll` 存在。发送 `{notificationId: "xxx"}` 会导致解析失败返回 `{ error: "Invalid request", status: 400 }`。
- **全部标为已读**功能正常（`notification-page-content.tsx:25` 发送 `{markAll: true}`，符合 schema）。
- **修复方式：** 在两处改为 `JSON.stringify({ markAll: false, notificationId: id })`。

**Truth 17（部分上下文）— PLAN 03 must_haves 的 "contains: useSWR" 未满足：**

- 项目未安装 SWR 依赖（npm ls swr 为空）。实现使用原生 `useEffect + setInterval + Page Visibility API`，功能完全等价：10s 轮询、页面不可见时暂停、恢复可见时立即拉取。
- 这属于可接受实现偏差（功能已实现，无需外部依赖）。

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/db/schema.ts` | pluginNotifications 表 + 9 字段 + 3 FK + 3 索引 | ✓ VERIFIED | 8.8/10 实质性：完整表定义（line 1964-2000），包含所有要求的字段、FK 和索引 |
| `src/lib/dto/resource-ai.ts` | SystemCommandNotificationSchema + discriminatedUnion variant | ✓ VERIFIED | 9/10：SystemCommandNotificationSchema（line 882-891）+ 第 4 variant（line 912-914） |
| `src/lib/dto/notification.ts` | NotificationInsertSchema + NotificationDTOSchema + MarkReadSchema | ✓ VERIFIED | 9/10：3 个 schema 完整定义并导出（line 14-55） |
| `src/features/platform-core/commands/contracts.ts` | SystemCommandTypes + SystemNotificationSendPayloadSchema + PlatformCommandSchema variant | ✓ VERIFIED | 10/10：SystemCommandTypes 包含 "system.notification.send"（line 44），PayloadSchema（line 320-325），PayloadSchemas key（line 351），discriminatedUnion variant（line 447-450） |
| `src/features/runtime-platform/contracts/permissions.ts` | 3 个拒因码 | ✓ VERIFIED | 10/10：notification_type_not_allowed / rate_limit_exceeded / recipient_not_in_school（line 47-49） |
| `src/features/system-commands/handler.ts` | notificationSendAuthorize + notificationSendExecute | ✓ VERIFIED | 9/10：完整的 5-step authorize（manifest→白名单→membership→双层限流）+ execute（insert + audit）+ denySystemNotification helper |
| `src/features/system-commands/facade.ts` | dispatchSystemCommand 新增 system.notification.send 分支 | ✓ VERIFIED | 9/10：notifPayload 参数 + envelope 构造 + dispatchPlatformCommand 调用（line 468-509） |
| `src/features/system-commands/audit.ts` | commandType 联合类型新增 system.notification.send | ✓ VERIFIED | 10/10：line 18 已扩展 |
| `src/features/platform-core/commands/registry.ts` | system.notification.send 注册 | ✓ VERIFIED | 10/10：createPlatformCommandDefinition + dedupe:"required" + authorize/execute handler（line 189-198） |
| `src/lib/dal/notification.ts` | 5 个 DAL 函数 | ✓ VERIFIED | 9/10：insert/get/list/mark-read/mark-all-read/count，Zod unknown→parse 模式，cursor 分页，所有权校验 |
| `src/features/system-commands/rate-limiter.ts` | checkPluginRateLimit + checkUserRateLimit | ✓ VERIFIED | 9/10：Lua INCR+EXPIRE 原子化，plugin 60/min（65s TTL），user 30/hr（3660s TTL），FAIL-OPEN |
| `src/app/api/notification/list/route.ts` | GET 通知列表 API | ✓ VERIFIED | 9/10：auth() session + getNotifications cursor 分页 + 401 处理 |
| `src/app/api/notification/mark-read/route.ts` | POST 标记已读 API | ✓ VERIFIED | 9/10：MarkReadSchema.safeParse + discriminatedUnion 分支 + auth() session |
| `src/app/api/notification/unread-count/route.ts` | GET 未读计数 API | ✓ VERIFIED | 9/10：auth() session + getUnreadCount + no-store cache |
| `src/features/async-tasks/worker/bootstrap.ts` | 通知清理 worker 注册 | ✓ VERIFIED | 9/10：import + registerNotificationCleanupScheduler().catch()（line 26, 187） |
| `src/server/workers/notification-cleanup.ts` | BullMQ scheduler + processor | ✓ VERIFIED | 9/10：registerNotificationCleanupScheduler（line 29-62）+ processNotificationCleanup（line 70-91），cron "0 0 3 * * *"，仅删除已读>90天 |
| `src/lib/cache-policy.ts` | notification cache tag | ✓ VERIFIED | 10/10：line 40 notifications: (userId: string) |
| `src/components/notification/notification-bell.tsx` | Bell icon + badge + dropdown trigger | ✓ VERIFIED | 实体性已验证。单条已读 wiring 错误（见 truth 11） |
| `src/components/notification/notification-dropdown.tsx` | Dropdown 面板（最近 5 条 + 查看全部） | ✓ VERIFIED | 9/10：360px 宽度，最近 5 条，空状态，"查看全部" Link，Escape/外部点击关闭 |
| `src/components/notification/notification-item.tsx` | 单条通知行组件 | ✓ VERIFIED | 9/10：min-height 56px，未读 primary dot，relativeTime，body line-clamp |
| `src/components/notification/notification-list.tsx` | 通知列表 + 加载更多 | ✓ VERIFIED | 实体性已验证。单条已读 wiring 错误（见 truth 11） |
| `src/components/notification/notification-page-content.tsx` | 页面内容组件（通知中心 heading + 全部标为已读） | ✓ VERIFIED | 9/10：max-w-[680px]，"通知中心" heading，"全部标为已读" button（{markAll:true} 正确） |
| `src/components/notification/empty-state.tsx` | 空状态组件 | ✓ VERIFIED | 9/10：Inbox icon，居中布局，title + body |
| `src/app/notifications/page.tsx` | /notifications RSC 页面 | ✓ VERIFIED | 8/10：metadata title "通知中心"，渲染 NotificationPageContent |
| `src/hooks/use-unread-count.ts` | 未读计数轮询 hook | ✓ VERIFIED | 8/10：useEffect+setInterval 10s polling + Page Visibility API + 初始加载（替代 SWR，功能等价） |
| `src/hooks/use-notifications.ts` | 通知列表分页 hook | ✓ VERIFIED | 9/10：cursor-based fetchPage + append/CursorRef + loadMore + mutate |
| `src/lib/relative-time.ts` | 相对时间格式化 | ✓ VERIFIED | 9/10：完整处理所有时间范围（刚刚/N分钟前/N小时前/N天前/YYYY-MM-DD） |

**Artifact Score:** 25/27 artifacts fully verified (2 with partial wiring issues)

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| dispatchSystemCommand (facade.ts) | dispatchPlatformCommand | Command Bus envelope | ✓ WIRED | 已验证：facade.ts:468-509 构造 envelope 并调用 dispatchPlatformCommand |
| notificationSendAuthorize (handler.ts) | memberships 表 | db.query.memberships.findFirst | ✓ WIRED | 已验证：handler.ts:1747-1753（eq userId + schoolId + status active） |
| checkPluginRateLimit (rate-limiter.ts) | Redis INCR+EXPIRE | Lua script | ✓ WIRED | 已验证：rate-limiter.ts:15-21（Lua script）+ line 43（eval）+ line 47（FAIL-OPEN） |
| GET /api/notification/list (route.ts) | DAL getNotifications | auth() → session.user.id | ✓ WIRED | 已验证：route.ts:21-27 + 调用 getNotifications({userId}) |
| notification-bell.tsx | /api/notification/unread-count | useUnreadCount hook 10s polling | ✓ WIRED | 已验证：bell.tsx:18（useUnreadCount）+ unread-count.ts:26（fetch /api/notification/unread-count） |
| /notifications page.tsx | /api/notification/list | useNotifications hook | ✓ WIRED | 已验证：notification-page-content.tsx:16 + notification-list.tsx:11（useNotifications）+ use-notifications.ts:46（fetch /api/notification/list） |
| notification-bell.tsx → mark-read | /api/notification/mark-read | fetch POST | ⚠️ BROKEN | JSON shape 不匹配：{notificationId} vs {markAll:false, notificationId} |
| notification-list.tsx → mark-read | /api/notification/mark-read | fetch POST | ⚠️ BROKEN | JSON shape 不匹配：{notificationId} vs {markAll:false, notificationId} |
| notification-page-content.tsx → mark-read | /api/notification/mark-read | fetch POST {markAll:true} | ✓ WIRED | 已验证：JSON shape 匹配 discriminatedUnion |
| BullMQ cleanup | pluginNotifications 表 | Drizzle DELETE | ✓ WIRED | 已验证：notification-cleanup.ts:77-84（DELETE WHERE readAt IS NOT NULL AND createdAt < cutoff） |
| system.notification variant (resource-ai.ts) | SystemCommandNotificationSchema | z.discriminatedUnion merge | ✓ WIRED | 已验证：resource-ai.ts:912-913 |
| Bootstrap cleanup | notification-cleanup.ts | registerNotificationCleanupScheduler | ✓ WIRED | 已验证：bootstrap.ts:26（import）+ line 187（调用） |

**Key Links Score:** 10/12 WIRED

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| use-unread-count.ts | count (useState) | fetch /api/notification/unread-count → auth() session → getUnreadCount → DB COUNT(*), WHERE recipientUserId=userId AND readAt IS NULL | ✓ Real DB query (isNull + eq) | ✓ FLOWING |
| use-notifications.ts | items (useState) | fetch /api/notification/list → auth() session → getNotifications → DB findMany WHERE recipientUserId=userId ORDER BY DESC | ✓ Real DB query (findMany + cursor) | ✓ FLOWING |
| notification-page-content.tsx | markAll:true | fetch /api/notification/mark-read → auth() session → markAllNotificationsRead → DB UPDATE WHERE recipientUserId AND readAt IS NULL | ✓ Real DB update | ✓ FLOWING |
| notification-bell.tsx | 单条 markRead | fetch /api/notification/mark-read { notificationId } → MarkReadSchema.safeParse → 400 失败 | ✗ Zod discriminatedUnion 拒绝（缺少 markAll discriminator） | ⚠️ STATIC (wiring bug) |
| notification-list.tsx | 单条 markRead | 同上 | ✗ 同上 | ⚠️ STATIC (wiring bug) |
| handler notificationSendExecute | inserted.id | insertNotification → DB INSERT INTO pluginNotifications | ✓ Real DB insert | ✓ FLOWING |
| handler notificationSendAuthorize | memberRow | db.query.memberships.findFirst WHERE userId + schoolId + status active | ✓ Real DB query | ✓ FLOWING |
| processNotificationCleanup | deletedCount | db.delete(pluginNotifications) WHERE isNotNull(readAt) AND lt(createdAt, cutoff) | ✓ Real DB delete | ✓ FLOWING |

**Data-Flow Score:** 6/8 FLOWING, 2 STATIC (same wiring bug root cause)

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| pluginNotifications 表定义存在 | `grep -c "export const pluginNotifications" src/db/schema.ts` | 1 | ✓ PASS |
| handler 5-step authorize | `grep -c "notificationSendAuthorize\|denySystemNotification\|notificationSendExecute" src/features/system-commands/handler.ts` | 7 | ✓ PASS |
| SystemCommandTypes 包含 notification | `grep "system.notification.send" src/features/platform-core/commands/contracts.ts \| wc -l` | 3 | ✓ PASS |
| DAL 5 函数全部存在 | `grep -c "export async function" src/lib/dal/notification.ts` | 5 | ✓ PASS |
| Rate limiter FAIL-OPEN | `grep -c "FAIL-OPEN\|return true" src/features/system-commands/rate-limiter.ts` | 5 | ✓ PASS |
| API Routes Auth.js | `grep -c "auth()" src/app/api/notification/*/route.ts \| tail -1` | 3 (1 per file) | ✓ PASS |
| cleanup cron pattern | `grep "0 0 3" src/server/workers/notification-cleanup.ts` | 1 match | ✓ PASS |
| UI 组件文件全部存在 | `ls src/components/notification/*.tsx \| wc -l` | 6 | ✓ PASS |
| Bell icon 已替换 | `grep -c "NotificationBell" src/app/\(teacher\)/teacher/layout.tsx` | 2 | ✓ PASS |
| 无空返回 stub | `grep -r "return null\|return \[\]\|return {}" src/components/notification/ src/hooks/use-*.ts 2>/dev/null \| wc -l` | 0 | ✓ PASS |
| 零 debt marker | `grep -r "TBD\|FIXME\|XXX\|TODO\|HACK" src/components/notification/ src/hooks/use-*.ts src/app/notifications/ src/lib/relative-time.ts src/server/workers/notification-cleanup.ts 2>/dev/null \| wc -l` | 0 | ✓ PASS |

**Spot-checks Score:** 11/11 PASS

### Probe Execution

Phase 81 无声明 probe 文件，无常规 `scripts/*/tests/probe-*.sh`。

| Probe | Command | Result | Status |
| ----- | ------- | ------ | ------ |
| N/A | N/A | Phase 81 不是 migration/tooling 类型，SUMMARY 中无 probe 声明 | ? SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| NOTIF-01 | 81-02 | 插件可通过 system.notification.send 向指定用户发送应用内通知 | ✓ SATISFIED | handler.ts:1829-1868（execute 写入 pluginNotifications）+ facade.ts:468-509（dispatch 分支） |
| NOTIF-02 | 81-02, 81-03 | 用户可查看通知列表（分页，按时间倒序，默认每页 20 条） | ✓ SATISFIED | API list route + DAL getNotifications（cursor 分页 DESC）+ /notifications 页面（NotificationList + loadMore） |
| NOTIF-03 | 81-02, 81-03 | 用户可标记通知为已读（单条 / 全部已读） | ⚠️ PARTIAL | 全部已读正常。单条已读 wiring bug（notification-bell/list 发送错误 JSON shape） |
| NOTIF-04 | 81-02, 81-03 | 用户可查看未读通知计数 | ✓ SATISFIED | API unread-count route + useUnreadCount hook + Bell badge |
| NOTIF-05 | 81-01, 81-02 | manifest systemCommands.system.notification 声明 notificationTypes 白名单 | ✓ SATISFIED | SystemCommandNotificationSchema（resource-ai.ts:882-891）+ handler authorize manifest re-parse + allowlist check |
| NOTIF-06 | 81-02 | 频率限制：每插件每分钟 60 条 + 每用户每小时 30 条上限 | ✓ SATISFIED | rate-limiter.ts（plugin 60/min + user 30/hr + Redis INCR+EXPIRE Lua） |
| NOTIF-07 | 81-01, 81-02 | recipientUserId 必须经 schoolId 归属校验（memberships） | ✓ SATISFIED | handler.ts:1747-1766（memberships WHERE userId=recipientUserId AND schoolId=schoolId AND status='active'） |
| NOTIF-08 | 81-03 | 通知自动清理：超过 90 天的已读通知定期清除 | ✓ SATISFIED | notification-cleanup.ts（cron "0 0 3 * * *"，DELETE WHERE readAt IS NOT NULL AND createdAt < 90days） |
| SYS-06 | 81-01, 81-02 | system.notification.* 复用 v4.3 三段式链路 | ✓ SATISFIED | manifest 声明（resource-ai.ts discriminatedUnion）→ governance gate（handler authorize 5-step check）→ audit（writeSystemCommandAudit decision:denied/allowed） |

**Requirements Score:** 8/9 SATISFIED, 1/9 PARTIAL (NOTIF-03 单条已读 wiring bug)

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| N/A | N/A | Zero debt markers (TBD/FIXME/XXX) in all phase files | N/A | N/A |
| N/A | N/A | Zero placeholder/empty returns in UI components | N/A | N/A |
| N/A | N/A | Zero hardcoded empty data in source files | N/A | N/A |

**Anti-patterns Score:** All clear — 0 blockers, 0 warnings

### Human Verification Required

#### 1. 通知 Bell icon 视觉显示验证

**Test:** 在 teacher layout 中查看顶部导航栏的 Bell icon——确认有未读通知时 icon 变为 primary 色且 badge 显示正确计数（1-9 数字，10+ 显示 "9+"），无未读时 icon 为 on-surface-variant 且无 badge。
**Expected:** Bell icon 颜色正确切换，badge pill（primary 背景 + on-primary 文字），tooltip 显示 "通知"。
**Why human:** 视觉颜色、CSS transition、tooltip 行为无法通过 grep 验证。

#### 2. Dropdown 交互验证

**Test:** 点击 Bell icon——确认 dropdown 从右上角弹出（360px 宽度，最近 5 条通知 + "查看全部" link），点击外部或按 Escape 关闭 dropdown。
**Expected:** Dropdown 有 glassmorphism 效果（backdrop-blur + shadow-lg），通知项按时间倒序排列，未读通知有 primary 左侧圆点，点击通知项标记已读并关闭 dropdown。
**Why human:** CSS 动画（scale + fade in, origin top-right）、点击外部/键盘交互、视觉布局无法通过代码分析验证。

#### 3. /notifications 页面完整流程验证

**Test:** 访问 `/notifications`——确认页面标题 "通知中心"、右侧 "全部标为已读" button（带 CheckCheck icon）、通知列表显示、底部 "加载更多" button（当有更多时）。
**Expected:** 点击 "全部标为已读" 后所有通知变为已读状态（无 primary 圆点），点击 "加载更多" 追加下一页，max-width 680px 居中。
**Why human:** 完整用户流程（身份验证 + 数据加载 + 状态转换）涉及 Auth.js session、Drizzle 查询等运行时行为。

#### 4. 相对时间显示验证

**Test:** 查看通知列表中的时间显示——确认当前时间 <1 分钟前显示 "刚刚"，1-59 分钟显示 "N分钟前"，1-23 小时显示 "N小时前"，1-30 天显示 "N天前"，超过 30 天显示 YYYY-MM-DD 日期。
**Expected:** 相对时间格式正确，中文字符串显示无乱码。
**Why human:** 时间计算依赖当前时间（动态），需在浏览器中实时验证。

#### 5. 通知清理 BullMQ worker 运行时验证

**Test:** 启动 async task worker（BullMQ），确认 notification-cleanup scheduler 在 Redis 中注册了 upsertJobScheduler（cron "0 0 3 * * *"），下次 3:00 AM 触发时应执行 cleanup 删除 90 天前的已读通知。
**Expected:** BullMQ 面板显示 jobScheduler "cleanup-notifications"，job 执行后 console.log 输出清理计数。
**Why human:** BullMQ 运行时行为依赖 Redis 连接和调度器，无法通过静态分析验证。

### Gaps Summary

发现 2 个 wiring bug，共享同一个根因：

**根因：前端单条标记已读的 JSON payload shape 与 API MarkReadSchema 不匹配。**

- `MarkReadSchema` 使用 `z.discriminatedUnion("markAll")`，要求 discriminator 字段 `markAll` 必须存在
- `notification-bell.tsx`（line 38）和 `notification-list.tsx`（line 20）发送 `{ notificationId: id }`
- 正确的 payload 应为 `{ markAll: false, notificationId: id }`
- 影响范围：前端单条标记已读功能无法工作（API 返回 400）
- 全部标为已读（`{ markAll: true }`）不受影响（`notification-page-content.tsx:25` 正确）

**修复步骤（预计 2 分钟）：**
1. `notification-bell.tsx` line 38：`JSON.stringify({ notificationId: id })` → `JSON.stringify({ markAll: false, notificationId: id })`
2. `notification-list.tsx` line 20：同样的修改

**次要偏差：SWR 依赖缺失（已接受）**

- PLAN-03 must_haves 要求 `useSWR`，但项目未安装 SWR
- 实现使用原生 `useEffect + setInterval + Page Visibility API`，功能完全等价
- 建议：更新 PLAN-03 must_haves 的 `contains` 字段以反映实际实现，或添加 SWR 依赖

---

_Verified: 2026-06-13_
_Verifier: Claude (gsd-verifier)_
