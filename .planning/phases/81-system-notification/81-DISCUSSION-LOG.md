# Phase 81: system.notification 应用内通知推送 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-13
**Phase:** 81-system.notification 应用内通知推送
**Areas discussed:** 通知 UI 入口与形态, 通知清理机制, 已读状态追踪策略, 通知列表 API 设计

---

## 通知 UI 入口与形态

| Option | Description | Selected |
|--------|-------------|----------|
| Bell icon + 独立页面 | 顶部导航栏加 bell icon（显示未读计数 badge），点击展开 dropdown 显示最近 5 条，底部「查看全部」进入独立通知中心页面（/notifications）。对齐 GitHub/通用产品模式。 | ✓ |
| 仅顶栏 bell + dropdown | 只在顶部导航栏加 bell icon + dropdown，显示最近通知列表，支持滚动加载更多。 | |
| 仅独立通知页面 | 不做 bell icon，只在侧边栏或导航中加「通知中心」入口，跳转到独立页面。 | |

**User's choice:** Bell icon + 独立页面（推荐）
**Notes:** 学生和教师都需要通知功能，bell icon 嵌入现有顶部导航用户头像区域。

---

## 通知清理机制

| Option | Description | Selected |
|--------|-------------|----------|
| BullMQ repeatable job | 注册 BullMQ repeatable job（每天凌晨 3:00），自动扫描并删除超过 90 天的已读通知。项目已有 BullMQ + worker 基础设施。 | ✓ |
| 手动 GC 脚本 | 类似 Phase 80 文件 GC，由运维手动或 cron 触发。 | |
| DB 层定时清理 | 在 API 请求中附带清理逻辑。 | |

**User's choice:** BullMQ repeatable job（推荐）
**Notes:** 通知清理是规律性定期操作，与文件 GC 的按需触发不同。BullMQ 可观测、可重试、有任务 ledger。

---

## 已读状态追踪策略

| Option | Description | Selected |
|--------|-------------|----------|
| readAt 字段 | 在通知表直接加 readAt timestamp 字段。标记已读时更新该字段。查询简单：WHERE readAt IS NULL。 | ✓ |
| 独立 notificationReads 表 | 创建 notificationReads 关联表（userId, notificationId, readAt）。可追溯每条已读记录。 | |
| 软删除模式 | 复用 append-only/isLatest 模式。 | |

**User's choice:** readAt 字段（推荐）
**Notes:** 通知已读是一次性操作，不需要保留历史变迁。简单直接。

---

## 通知列表 API 设计

| Option | Description | Selected |
|--------|-------------|----------|
| 独立 API Route + DAL | 创建 /api/notification/* API Routes，走 Auth.js session 认证，直接调用 DAL 层。与 Command Bus 路径分离。 | ✓ |
| Server Actions | 通过 Server Actions 获取通知数据。与现有页面数据获取模式一致。 | |
| 混合模式 | 核心查询走 API Route，标记已读走 Server Actions。 | |

**User's choice:** 独立 API Route + DAL（推荐）
**Notes:** 插件侧 `system.notification.send` 走 Command Bus，用户侧操作走独立 API Route，两条路径职责清晰。

---

## Claude's Discretion

- 通知表 schema 设计（id, pluginId, schoolId, recipientUserId, notificationType, title, body, readAt, createdAt）
- manifest `SystemCommandNotificationSchema` 的 shape（notificationTypes: string[]）
- 频率限制 Redis 计数器实现
- recipientUserId 归属校验实现
- Bell icon 位置和样式（按 DESIGN.md）
- 前端轮询间隔（10s，对齐现有模式）
- 通知 dropdown 显示条数（5 条）
- /notifications 页面路由组归属
- 新增 deny reason 码
- BullMQ repeatable job 注册位置

## Deferred Ideas

None — discussion stayed within phase scope.
