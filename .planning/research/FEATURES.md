# Feature Research

**Domain:** 插件系统 system 命令 — 文件存储代理 (system.file) + 应用内通知推送 (system.notification)
**Researched:** 2026-06-13
**Confidence:** HIGH — 核心模式经多源验证（Novu/Knock/Courier 通知系统 + Drivebase/OpenStack Manila/BlueSky 文件代理），且已分析现有 v4.3 system.* 命令架构作为集成基线

---

## 研究范围与方法

本研究聚焦 v4.4 新增的 `system.file` 和 `system.notification` 两条系统命令。以下能力已是 validated baseline，不重研：

- Command Bus + `dispatchPlatformCommand` + `PlatformCommandStore` + `platformCommandRegistry`（v3.0）
- governed action registry + plugin lifecycle + governance audit + kill switch（v3.0/v4.0）
- `dispatchPluginDataAccess` facade 模式：治理门前置 + 判别派发 + audit（v4.0 Phase 68）
- `PluginManifestSchema` 与 manifest `systemCommands` 声明段（v4.3）
- `dispatchSystemCommand` facade 统一入口（v4.3 Phase 79）
- `system.http.request` HTTP 代理 + SSRF 防护（v4.3 Phase 78）
- `system.config` KV 配置 + 三重前缀隔离（v4.3 Phase 79）
- `pluginOwnedBusinessData` 表 + `governanceAudits` 审计表（v4.0/4.3）
- marketplace 生命周期：install preflight / semver 升级 / uninstall retain/cleanup（v4.0）

**关键设计原则（从 v4.3 继承）：**
1. **声明式白名单**：manifest `systemCommands.system.file` / `system.notification` 在安装时校验，运行时 manifest re-parse + 匹配
2. **治理门前置，deny-first**：lifecycle + kill-switch + 白名单匹配，任何失败即终止并写 denial audit
3. **复用，不重造**：复用 `governanceAudits` 表、`assertActionExecutable`、`dispatchSystemCommand` facade 模式
4. **schoolId 永不进 payload**：由 governance-gate 从认证 session 派生注入

---

## Feature Landscape

### Table Stakes（用户预期的基础能力）

#### system.file（文件存储代理）

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 文件上传 (upload) | 插件需要持久化文件（作业附件、头像、资源包） | MEDIUM | multipart/binary body；单文件 ≤50MB；magic bytes 检测 |
| 文件下载 (download) | 插件需要读取已存储文件 | LOW | GET 直读；路径白名单隔离 |
| 文件删除 (delete) | 插件清理过期文件，防止存储膨胀 | LOW | 软删除优先；确认性操作含审计 |
| 文件列表 (list) | 插件枚举自身目录以构建资源管理器 | LOW | 按 prefix 过滤；分页返回 |
| 文件元数据 (metadata) | 查询文件大小、MIME 类型、创建时间 | LOW | stat 操作；不含内容 |
| 插件级路径隔离 | 插件 A 不得访问插件 B 的文件 | MEDIUM | `{schoolId}/{pluginId}/...` 路径前缀；schoolId 由 session 派生 |
| Manifest 声明白名单 | 安装时声明 allowedPaths + allowedOperations | MEDIUM | 扩展 SystemCommandDiscriminatedSchema |
| 全链路审计 | 每次文件操作写入 governance audit | LOW | 复用 writeSystemCommandAudit 模式 |
| 文件存储配额 (quota) | 管理员限制单插件/全校存储占用 | MEDIUM | 按 school+plugin 二维配额；含软/硬阈值 |

#### system.notification（应用内通知推送）

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 创建通知 (send) | 插件向特定用户发送通知 | MEDIUM | 走 Command Bus；payload: type, title, body, recipientId, linkUrl |
| 通知列表查询 | 用户查看自身通知历史 | LOW | 按 recipientId 查询；分页 |
| 未读计数 (unread count) | 用户需要知道新通知数量 | LOW | `COUNT WHERE read_at IS NULL` |
| 单条已读标记 | 点击通知后标记已读 | LOW | `UPDATE read_at = NOW()` |
| 批量全部已读 | 一键清除所有未读 | LOW | `UPDATE WHERE read_at IS NULL` |
| 通知类型分类 | 不同类型需不同 UI 渲染 | MEDIUM | type 字段 = `{pluginKey}:{eventName}` |
| 双重隔离 (school + plugin) | 跨学校/跨插件不可见 | LOW | schoolId 从 session 注入；pluginId 从 manifest 注入 |

### Differentiators（竞争差异化能力）

#### system.file

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 声明式路径白名单（manifest 集成） | 安装时 review 路径声明，运行时无需配置 | MEDIUM | 复用 system.http.request 的 manifest 声明白名单范式 |
| 文件审计日志 | 运营者可查询「谁在何时做了什么」 | MEDIUM | 复用 governanceAudit 表；每条操作含 decision + reasonCode |
| 强制 magic bytes 类型检测 | 防止伪装 MIME 类型的恶意文件 | MEDIUM | 服务端检测；配置允许列表 |
| 存储配额分级告警 | 80% 通知插件；95% 阻止写入 | MEDIUM | 软配额→通知；硬配额→拒绝 |
| 文件移动/重命名 | 插件重新组织自身文件结构 | LOW | 纯路径更新；隔离边界内 |
| 预签名 URL（临时共享链接） | 有时效的外部可访问链接 | HIGH | 需独立签名机制；后续 milestone |

#### system.notification

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 未读/已读双态 + unseen 计数 | 比 unread 计数更干净：打开馈线即消除角标 | MEDIUM | 类似 Facebook/Knock 的 seen 语义；适合教育场景 |
| 通知模板与动态插值 | `{studentName} 完成了 {quizTitle}` | MEDIUM | payload 携带 template variables |
| 通知偏好 (per-plugin on/off) | 用户可关闭不关心的插件通知 | MEDIUM | 首版 per-plugin 开关；后续迭代粒度 |
| 通知持久化 + 90 天清理 | 防止数据库膨胀 | MEDIUM | 软删除 + 定时任务清理 |
| 插件间引用通知 | 通知可引用其他插件实体 | HIGH | JSON payload + 路由到目标 surface |

### Anti-Features（常见请求但当前不该做的功能）

#### system.file

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| 插件跨目录访问 | 插件希望共享资源 | 破坏隔离模型核心假设；教育合规要求数据隔离 | 通过 system.http.request 调用其他插件的 API |
| 云端存储后端 (S3/MinIO) | 扩展性和 CDN | 撕裂隔离和合规假设；Out of Scope | 本地优先；后续 backend plugin 扩展 |
| 目录 mkdir/rmdir | 复杂文件树管理 | 增加审计和配额计算复杂度 | 用 key prefix 模拟层级（`exports/2024/report.pdf`） |
| 文件版本控制 | 回滚文件修改 | 存储膨胀、配额难预测、语义混淆 | 插件自行在应用层管理版本 |
| 公开 URL（不经 auth） | 简化分享 | 教育数据隐私合规红线 | pre-signed URL 必须带时效签名 |
| 大文件分片上传 | 视频/大型课件 | MVP 场景极少；增加状态管理和清理复杂度 | 单次上传 ≤50MB 覆盖课件 PDF/图片/小视频 |
| 文件全文搜索 | 搜索文件内容 | 需要额外搜索索引层 | 文件名搜索 + 元数据过滤足够 |

#### system.notification

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| 多渠道推送 (Email/SMS/WebPush) | 多渠道触达 | 5-10x 复杂度；需集成第三方服务 | 首版仅 in-app；后续作为通道插件引入 |
| 实时 WebSocket 推送 | 即时看到新通知 | 需要 per-user WS 连接管理 | 首版走轮询模式（10s polling pattern） |
| 已读回执 (read receipts) | 发送者知道接收者已读 | 1:N 写入放大显著 | 需要确认的工作流用专门的 task step |
| 通知分组/折叠 | 减少冗余 | 分组逻辑 + 去重 + 摘要生成复杂度高 | 由发送通知的插件决定是否聚合 |
| 定时发送/延迟队列 | 定时提醒 | 需要持久化调度器 | 插件在应用层实现；后续复用 async task |
| 富文本通知内容 | 品牌化渲染 | XSS 风险 + 存储膨胀 | 纯文本 + 可选 link URL |
| 三维偏好矩阵 (type × plugin × channel) | 完全控制 | 99% 用户只需要总开关 | 首版 per-plugin on/off |

---

## Feature Dependencies

```
system.file (upload)
    └─requires─> manifest systemCommands extension (FILE-02)
                     └─requires─> SystemCommandDiscriminatedSchema 变体新增
                          └─requires─> PluginManifest install preflight 校验

system.file (quota)
    └─requires─> system.file (upload) 可测量用量
    └─enhances─> system.notification (软配额→通知告警)

system.file (magic bytes)
    └─enhances─> system.file (upload) 安全层

system.notification (send)
    └─requires─> Command Bus dispatch（写操作）
    └─requires─> governance-gate（lifecycle/kill-switch scope）
    └─requires─> manifest systemCommands 变体新增

system.notification (mark read / unread count)
    └─requires─> system.notification (send) 已有通知记录

system.notification (preferences)
    └─requires─> system.notification (send) 已有通知类型
    └─conflicts──> 过早引入多维偏好矩阵 (complexity trap)

system.file + system.notification
    └─独立无强依赖──> 可分 phase 开发
    └─弱交叉──> 配额告警 → notification.send（可延迟）
```

---

## MVP Definition

### Phase 1: system.file 基础 (FILE-01 + FILE-02)

- [ ] **Manifest 声明白名单** — `SystemCommandDiscriminatedSchema` 新增 `system.file` 变体：`allowedPaths`（pattern array）+ `allowedOperations`（`upload`/`download`/`delete`/`list`/`metadata`）
- [ ] **system.file.upload** — 路径隔离 `{schoolId}/{pluginId}/...`，≤50MB，magic bytes 检测
- [ ] **system.file.download** — 按 key/path 下载自身隔离范围内文件
- [ ] **system.file.delete** — 软删除 + 审计
- [ ] **system.file.list** — prefix 过滤 + 分页
- [ ] **system.file.metadata** — 大小/MIME/创建时间
- [ ] **全链路审计** — 每次操作写 governance audit
- [ ] **双重隔离** — schoolId 由 session 派生；pluginId 由治理门注入

### Phase 2: system.notification 基础 (NOTIF-01)

- [ ] **Manifest 声明白名单** — `SystemCommandDiscriminatedSchema` 新增 `system.notification` 变体：`allowedNotificationTypes`
- [ ] **system.notification.send** — 走 Command Bus；payload: type, title, body, recipientId, linkUrl, metadata
- [ ] **通知列表查询** — 按 recipientId 分页
- [ ] **未读计数** — `COUNT WHERE read_at IS NULL`
- [ ] **单条/批量已读** — PATCH 单条 / PUT 批量
- [ ] **通知类型定义** — `type = "{pluginKey}:{eventName}"`
- [ ] **双重隔离** — schoolId 从 session 注入

### Add After Core

- [ ] system.file.move / system.file.copy
- [ ] system.file 存储配额（school+plugin 二维）
- [ ] system.file pre-signed URL（后续 milestone）
- [ ] system.notification 偏好（per-plugin on/off）
- [ ] system.notification 90 天清理策略

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| system.file.upload/download/delete/list/metadata | HIGH | MEDIUM | P1 |
| system.file manifest 声明白名单 | HIGH | MEDIUM | P1 |
| system.file 全链路审计 | HIGH | LOW | P1 |
| system.notification.send | HIGH | MEDIUM | P1 |
| system.notification 列表/未读计数/标记已读 | HIGH | LOW | P1 |
| system.notification manifest 声明 | HIGH | LOW | P1 |
| system.file magic bytes 检测 | MEDIUM | LOW | P2 |
| system.file 存储配额 | MEDIUM | MEDIUM | P2 |
| system.notification 偏好设置 | MEDIUM | MEDIUM | P2 |
| system.file move/copy | LOW | LOW | P2 |
| system.file pre-signed URL | MEDIUM | HIGH | P3 |
| system.notification 清理策略 | LOW | MEDIUM | P3 |

---

## Competitor Feature Analysis

### 文件存储代理

| Feature | VSCode Extension FS | Drivebase | OpenLearn system.file |
|---------|---------------------|-----------|----------------------|
| 隔离模型 | Per-extension workspace | Per-tenant encrypted | {schoolId}/{pluginId} 双重隔离 |
| 声明式白名单 | package.json contributes | IStorageProvider capabilities | manifest systemCommands.system.file |
| 配额 | 无 | 无 | 按 school+plugin 二维配额（P2） |
| 审计 | 无 | 有限日志 | 全链路 governance audit |
| 文件操作 | full fs（危险） | upload/download/move/copy/delete | CRUD + list + metadata（收口） |
| 后端扩展 | 无 | S3/GDrive/Dropbox/OneDrive plugins | 本地优先，后端插件可扩展（后续） |

### 应用内通知

| Feature | Novu | Knock | OpenLearn system.notification |
|---------|------|-------|-------------------------------|
| 渠道 | Email/SMS/Push/Chat/In-App | Email/Push/In-App | In-App only (MVP) |
| 状态模型 | seen/read/archived | seen/read/archived | unseen → read（双态简化） |
| 偏好 | Per-type × per-channel | Per-type × per-channel × per-entity | Per-plugin on/off (MVP) |
| 模板系统 | React Email + Handlebars | Template Editor + variables | JSON payload + variables (MVP) |
| 隔离模型 | Per-tenant (workspace) | Per-tenant (environment) | {schoolId}:{pluginId} 双重隔离 |
| 审计 | 有限（发送日志） | 有限（delivery log） | 全链路 governance audit |
| 实时推送 | WebSocket | WebSocket | 10s polling (MVP) |

OpenLearn 的差异化：不是做通用通知/文件平台，而是在教育场景的受治理插件架构下，为每个 system 命令提供 manifest 声明 → governance gate → audit 三段式安全闭环。

---

## Sources

- **Drivebase Storage Providers**: https://deepwiki.com/drivebase/drivebase/3-storage-providers — IStorageProvider interface + capabilities declaration (HIGH)
- **Knock In-App Notifications**: https://docs.knock.app/integrations/in-app/knock — seen/read states, feed UI, badge counts (HIGH)
- **Novu Inbox**: https://docs.novu.co/platform/inbox — multi-channel, templates, preference center (HIGH)
- **BlueSky Proxy (USENIX)**: Write-back caching, log-structured layout, pluggable backends (MEDIUM)
- **OpenStack Glance Per-Tenant Quotas**: https://docs.openstack.org/glance/2026.1/admin/quotas.html — quota resource types, enforcement modes (HIGH)
- **OpenStack Manila Multi-Tenant Gateway**: https://wiki.openstack.org/wiki/Manila_Networking/Gateway_mediated — FSAL plugin architecture (MEDIUM)
- **Notification DB Schema**: https://datavidhya.com/data-modeling/notification-system/ — multi-table with recipients, preferences, delivery logs (MEDIUM)
- **Notification Preferences**: https://appmaster.io/blog/notification-preferences-quiet-hours-digests-tracking — toggles, quiet hours, digests (MEDIUM)
- **Existing v4.3 system.* architecture** (`src/features/system-commands/`, `src/features/platform-core/commands/contracts.ts`) — manifest → governance → audit 三段式链路 (HIGH)

---
*Feature research for: system.file + system.notification (v4.4 System Commands Bus 第二批)*
*Researched: 2026-06-13*
