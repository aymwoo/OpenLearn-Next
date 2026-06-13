# Requirements: OpenLearn Next

**Defined:** 2026-06-13
**Core Value:** 教师可以用可编程步骤编排一节课，并让学生端按进度可追踪地完成课堂流程。

## v4.4 Requirements

Requirements for v4.4 System Commands Bus（第二批）— system.file + system.notification.

### File Storage (FILE)

- [ ] **FILE-01**: 插件可通过 `system.file.upload` 上传文件，文件以内容寻址（SHA-256）存储，元数据写入 SQLite
- [ ] **FILE-02**: 插件可通过 `system.file.download` 下载文件，经独立 API Route 流式返回（支持 Range 请求）
- [ ] **FILE-03**: 插件可通过 `system.file.delete` 删除文件（标记 isLatest=false，内容保留至 GC）
- [ ] **FILE-04**: 插件可通过 `system.file.list` 列出自身文件列表（按前缀过滤、分页）
- [ ] **FILE-05**: 插件可通过 `system.file.metadata` 获取单个文件的元数据（大小/MIME/SHA-256/创建时间）
- [ ] **FILE-06**: 文件存储以 `{schoolId}/{pluginKey}` 双重前缀物理隔离，跨插件/跨校不可访问
- [ ] **FILE-07**: manifest `systemCommands.system.file` 声明 `allowedPaths` 白名单，runtime 逐请求匹配路径前缀
- [ ] **FILE-08**: 路径穿越防护：多层校验覆盖 URL 编码变体（`%2e%2e%2f`）、null byte（`%00`）、parent reference（`..`）
- [ ] **FILE-09**: 文件大小配额：单文件上限 50MB + 每插件每校总容量上限可配置

### Notifications (NOTIF)

- [ ] **NOTIF-01**: 插件可通过 `system.notification.send` 向指定用户发送应用内通知
- [ ] **NOTIF-02**: 用户可查看通知列表（分页，按时间倒序，默认每页 20 条）
- [ ] **NOTIF-03**: 用户可标记通知为已读（单条 / 全部已读）
- [ ] **NOTIF-04**: 用户可查看未读通知计数
- [ ] **NOTIF-05**: manifest `systemCommands.system.notification` 声明 `notificationTypes` 白名单，runtime 逐请求匹配
- [ ] **NOTIF-06**: 频率限制：每插件每分钟 60 条 + 每用户每小时 30 条上限
- [ ] **NOTIF-07**: `recipientUserId` 必须经 `schoolId` 归属校验（查 memberships 表），防止跨校隐私泄漏
- [ ] **NOTIF-08**: 通知自动清理：超过 90 天的已读通知定期清除（保留未读通知）

### Cross-Command (SYS)

- [ ] **SYS-06**: `system.file.*` 和 `system.notification.*` 复用 v4.3 三段式链路：manifest 声明 → governance gate（`assertActionExecutable`）→ 全链路审计（`writeSystemCommandAudit`）

## vNext Requirements

Deferred to future milestones.

### File Storage Extensions

- **FILE-N01**: 文件移动/复制（move/copy）— 当前通过 upload+delete 组合替代
- **FILE-N02**: S3/R2 兼容存储后端 — 当前仅本地文件系统
- **FILE-N03**: 插件间文件共享（经 manifest 声明授权）— 当前严格插件隔离

### Notification Extensions

- **NOTIF-N01**: WebSocket 实时推送通知 — 当前采用客户端轮询 + 可选 WS fallback
- **NOTIF-N02**: 通知偏好设置（按类型开关）— 当前所有通知类型统一投递
- **NOTIF-N03**: 外部推送通道（FCM/APNs/Email）— 当前仅应用内通知

## Out of Scope

| Feature | Reason |
|---------|--------|
| S3/R2 云存储后端 | system.file 首发使用本地文件系统，云存储延后到未来里程碑 |
| WebSocket 实时通知推送 | 首发采用轮询模式，对齐现有 homework-submission-list 的 10s polling pattern |
| 通知偏好/免打扰设置 | v4.4 只做基础通知能力，偏好放在 vNext |
| 外部推送（FCM/APNs/邮件） | 应用内通知首发即可，外部通道复杂度高 |
| 文件公开分享/外链 | 安全边界内只做插件调用，不做外部用户直接访问 |
| 插件间文件共享 | 严格插件隔离，跨插件访问需独立里程碑设计 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FILE-01 | — | Pending |
| FILE-02 | — | Pending |
| FILE-03 | — | Pending |
| FILE-04 | — | Pending |
| FILE-05 | — | Pending |
| FILE-06 | — | Pending |
| FILE-07 | — | Pending |
| FILE-08 | — | Pending |
| FILE-09 | — | Pending |
| NOTIF-01 | — | Pending |
| NOTIF-02 | — | Pending |
| NOTIF-03 | — | Pending |
| NOTIF-04 | — | Pending |
| NOTIF-05 | — | Pending |
| NOTIF-06 | — | Pending |
| NOTIF-07 | — | Pending |
| NOTIF-08 | — | Pending |
| SYS-06 | — | Pending |

**Coverage:**
- v4.4 requirements: 17 total
- Mapped to phases: 0
- Unmapped: 17 ⚠️

---
*Requirements defined: 2026-06-13*
*Last updated: 2026-06-13 after milestone v4.4 requirements definition*
