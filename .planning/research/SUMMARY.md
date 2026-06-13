# 项目研究总结

**项目:** OpenLearn Next v4.4 — System Commands Bus 第二批
**领域:** 系统命令扩展 — 本地文件存储代理 (system.file) + 应用内通知推送 (system.notification)
**研究日期:** 2026-06-13
**置信度:** HIGH

## 执行摘要

本里程碑在 v4.3 已落地的 `dispatchSystemCommand` facade、`assertActionExecutable` 治理门、`PluginManifestSchema` 声明式白名单体系之上，扩展两个新的系统命令类型。**核心结论：零新依赖——所有能力均可由 Node.js 24 内置模块 + Drizzle ORM + Zod 4 + Next.js 16 现有栈提供，无需引入任何第三方 npm 包。**

`system.file` 提供插件隔离的本地文件 CRUD（上传/下载/删除/列举/移动/复制/元数据）。文件二进制内容走独立路径（API Route 流式传输），绝不会进入 JSON 化的 Command Bus envelope，这是架构级决策——避免二进制数据序列化膨胀、SQLite 性能退化、以及审计表污染。文件以内容寻址（SHA-256 hash 命名）存储于 `data/files/{schoolId}/{pluginId}/blobs/{sha256}`，逻辑文件名到内容 hash 的映射走 `pluginOwnedBusinessData` 的 append-only/isLatest 模式，天然防篡改、去重、与既有数据写入路径完全对齐。

`system.notification` 提供应用内通知推送，首发采用 DB 写入 + WebSocket best-effort 推送 + 客户端轮询回退模式。通知严格定义为应用内（in-app）通知，不做 Email/SMS/WebPush 等多渠道推送——这是刻意选择，避免过度设计。通知投递语义为"best-effort, database-native"：INSERT 进 `notifications` 表即投递成功，不引入 outbox/Redis queue。

**关键风险：** 文件系统路径穿越攻击、TOCTOU 竞态条件、通知跨校隐私泄漏、二进制数据误入 Command Bus。所有风险均有明确预防措施和测试验证策略，最核心的防护原则是：路径校验在 Zod schema 层 + 文件系统层双重生效，内容与元数据严格分离，schoolId 永不从 payload 读取而由治理门从 session 注入。

## 关键发现

### 推荐技术栈

零新依赖。两个命令完全基于现有 Stack 实现：

- **`node:fs/promises`（Node 24 内置）** — 所有文件操作。`writeFile`、`readFile`、`unlink`、`readdir`、`rename`、`copyFile`、`mkdir({recursive:true})`、`stat`、`access`、`createReadStream` 完整覆盖需求，API 稳定。
- **`node:crypto`（Node 24 内置）** — `crypto.randomUUID()` 生成唯一文件名与通知 ID。SHA-256 用于内容寻址存储的文件命名和完整性校验。
- **`node:path`（Node 24 内置）** — `path.normalize` + `path.join` 防止路径遍历攻击。
- **`node:stream`（Node 24 内置）** — `fs.createReadStream` → `Readable.toWeb()` 流式下载大文件，避免全量加载到内存。
- **mime-types 3.0.2（已安装）** — Content-Type 检测，Express 生态事实标准。
- **Drizzle ORM ~0.45.2** — `pluginFiles` 元数据表与 `notifications` 表 CRUD。与现有 Schema + migration 体系一致。
- **Zod ~4.4.3** — Payload 校验、manifest 白名单校验。复用项目既有 `z.strictObject` + `z.discriminatedUnion` 模式。
- **SQLite/libSQL（@libsql/client ^0.17.3）** — 持久化，支持事务原子性（配额检查→写入→计数更新在同一事务中）。

**明确不用的库：** multer（Express 耦合，与 Next.js App Router Web API 不兼容）、formidable/busboy（Next.js 16 内部已解析 multipart）、sharp（图片处理超出 scope）、S3 SDK（云存储超出 scope）、nanoid/uuid 包（`crypto.randomUUID()` 零依赖）、BullMQ（通知无队列语义需求）、Redis pub/sub（通知量级不需要独立中间件）、Firebase FCM/OneSignal/Web Push API（通知严格为应用内，非平台推送）。

### 功能范围

**Table Stakes（必须实现）：**

system.file:
- 文件上传（multipart/form-data，≤50MB，magic bytes 检测）
- 文件下载（流式响应，Content-Type/Content-Disposition header）
- 文件删除（软删除 + 审计）
- 文件列表（按 prefix 过滤，分页）
- 文件元数据查询（大小/MIME/创建时间）
- 插件级路径隔离（`{schoolId}/{pluginKey}/...`，schoolId 由治理门注入）
- Manifest 声明白名单（安装时声明 allowedPaths + allowedOperations）
- 全链路治理审计（每次操作写 governanceAudit）

system.notification:
- 创建通知（走 Command Bus，治理门 + manifest 白名单）
- 通知列表查询（按 userId，分页）
- 未读计数
- 单条/批量已读标记
- 通知类型定义（`{pluginKey}:{eventName}`）
- 双重隔离（school 从 session 注入，pluginId 从 manifest 注入）

**差异化能力（Phase 2）：**

system.file:
- 声明式路径白名单（manifest 集成，安装时 review，运行时自动校验）
- 强制 magic bytes 类型检测（防止伪装 MIME 类型）
- 存储配额分级告警（80% 软配额通知，95% 硬配额拒绝写入）
- 文件移动/复制（rename + copy 原子操作）

system.notification:
- 未读/已读双态 + unseen 计数
- 通知偏好（per-plugin on/off 开关）
- 通知持久化 + 90 天清理策略

**明确延后（v2+）：**

system.file: 云存储后端 (S3/MinIO)、公开 URL / pre-signed URL、文件版本控制、大文件分片上传、目录 mkdir/rmdir、全文搜索、插件跨目录访问。
system.notification: 多渠道推送 (Email/SMS/WebPush)、实时 WebSocket 直推（首发走轮询）、已读回执、通知分组/折叠、定时发送/延迟队列、富文本 HTML 通知、三维偏好矩阵。

### 架构方法

复用 v4.3 建立的三段式模式：**dispatchSystemCommand facade → Command Bus → governance audit**。文件操作和通知操作通过扩展现有 facade 的判别分支实现，不新建独立授权路径。

**二进制分离策略（核心架构决策）：**
- 文件写入：API Route (`POST /api/system/file/upload`) 接收 multipart/form-data → 内部调用 `dispatchSystemCommand` 传元数据引用 → Command Bus 中仅记录操作元数据 → handler 执行时写磁盘 + 记数据库
- 文件下载：API Route (`GET /api/system/file/[fileId]/download`) 直接流式响应，不走 Command Bus
- 通知发送：走完整 Command Bus 路径（治理门前置 → authorize → execute → audit）
- 通知查询：直接 DAL 读（`GET /api/notifications`），不走 Command Bus

**关键模式：**
1. **Write-via-Command-Bus, Read-direct-DAL** — 只有写入/副作用操作进入 Command Bus，纯读取走 DAL（镜像 v4.3 `system.config.get` vs `system.config.set`）
2. **Binary Bypass** — JSON Command Bus envelope 不承载二进制数据
3. **DB + WS Dual Write** — 通知先写 DB（durable truth），再推 WS（best-effort），WS 失败不影响命令成功
4. **Path-Based Isolation** — 学校+插件隔离在路径和数据库层双重生效

**新增组件：**
- handler.file.ts / handler.notification.ts — authorize + execute
- file-storage.ts — 磁盘 I/O 工具
- file-dal.ts / notification-dal.ts — DAL 层
- API Routes: /api/system/file/upload、/api/system/file/[fileId]/download、/api/notifications
- DB 表: pluginFiles（元数据）+ notifications

### 关键陷阱与防范

1. **路径穿越攻击（Critical）** — Zod schema 层拒绝 `..`、`/`、`\`、`%`、`\0`；文件系统层 `fs.realpath()` 消解符号链接后校验以 storageRoot 开头；`O_NOFOLLOW` 标志禁止 symlink 跟随。测试必须覆盖 `%2e%2e%2f` 等 URL 编码变体。

2. **TOCTOU 竞态条件（Critical）** — 文件描述符锚定（预打开根目录 fd，所有操作相对该 fd）；先写临时文件再原子 rename；禁止符号链接（`lstat` 检测）；配额操作加 SQLite 事务锁；不使用 `fs.access() + fs.open()` 组合。

3. **二进制数据误入 Command Bus（Critical）** — 架构级决策：文件内容绝不进 Command Bus。上传走 API Route bridging，Command Bus 只传元数据。验证手段：`platformCommands.payloadJson` 和 `governanceAudits.payloadJson` 中无任何 Buffer/二进制引用。

4. **通知跨校隐私泄漏（Critical）** — schoolId 从治理门注入，绝不从 payload 读取；投递端双重校验 `recipientUserId` 的 schoolId 一致性（查询 `memberships` 表）；Zod schema 限制 payload 为纯文本（禁止 HTML 和嵌套对象）。

5. **治理门未复用（Critical）** — 所有新命令统一经过 `dispatchSystemCommand` facade 和 `assertActionExecutable` 治理门。新拒因码统一注册在 system-commands feature 的命名空间中。

6. **通知轰炸与疲劳（Moderate）** — manifest 声明频率上限 + SQLite 滑动窗口计数器执行层强制 + 通知重要性分级（urgent/normal/low）+ 课堂静默模式。

7. **内容寻址 vs 覆盖模式选型（Moderate）** — 推荐内容寻址（SHA-256 命名 blobs + pluginOwnedBusinessData 映射），实现 append-only 不可变性。如果时间吃紧可降级为覆盖模式 + 文件操作日志。

## 路线图影响

基于研究，建议分四个 Phase：

### Phase 1: system.file 核心实现

**理由:** system.file 的二进制分离策略、内容寻址存储、路径安全防护是整个里程碑中技术复杂度最高的部分。先验证"API Route bridge → Command Bus → handler → 磁盘 + 数据库"的完整链路，为后续通知的 DB+WS 模式提供集成范例。文件和通知之间无强依赖，可分 phase 独立开发。

**交付物:**
- DB migration: pluginFiles 表
- 磁盘工具: file-storage.ts（内容寻址存储，SHA-256 命名 blobs）
- DAL: file-dal.ts（insert/getById/list/delete/updateMetadata）
- Manifest shape 扩展: SystemCommandDiscriminatedSchema 新增 system.file 变体
- PlatformCommandType 扩展: system.file.upload、system.file.delete
- Handler: handler.file.ts authorize + execute
- API Routes: POST /api/system/file/upload、GET /api/system/file/[fileId]/download
- Registry 注册 + facade 判别分支
- Governance audit 审计记录
- 路径穿越防护（双重校验）+ TOCTOU 防御（fd 锚定 + 原子 rename）

**处理的 Pitfalls:** #1 路径穿越、#2 TOCTOU 竞态、#3 配额基础、#4 二进制分离、#5 文件类型校验、#6 append-only 冲突（内容寻址选型）

### Phase 2: system.file 只读 + 配额 + 移动/复制

**理由:** 读操作无副作用，不写 governance audit，可直接 DAL 查询。配额功能依赖 Phase 1 的上传计量基础。两者可合并在一个 phase 中——读操作极低成本，配额是上传安全闭环的必要补充。

**交付物:**
- system.file.list / system.file.metadata 纯 DAL 读路径
- system.file.move / system.file.copy（同 school+plugin 内原子操作）
- 存储配额（school+plugin 二维）：manifest 声明 quota → SQLite 事务内检查→写入→更新计数
- 全局磁盘水位告警（80% 拒绝新写入）
- Magic bytes 检测加强

**处理的 Pitfalls:** #3 配额耗尽（事务化配额锁 + 全局水位）

### Phase 3: system.notification 核心实现

**理由:** 通知功能独立于文件存储，无依赖。通知写入走 Command Bus 的完整路径，是对 v4.3 facade 模式的又一次验证。选择在 system.file 之后做，避免两个新命令的实现复杂度并行叠加。

**交付物:**
- DB migration: notifications 表（含 expiresAt、idempotencyKey 字段）
- DAL: notification-dal.ts（insert/list/markRead/countUnread）
- Manifest shape 扩展: SystemCommandDiscriminatedSchema 新增 system.notification 变体
- PlatformCommandType 扩展: system.notification.send
- Handler: handler.notification.ts authorize + execute
- WebSocket envelope 扩展: 新增 notification.received message kind + user-level channel
- 频率限制（SQLite 滑动窗口计数器，per-plugin + per-user 双重限制）
- 投递路径 schoolId 双重校验（查询 memberships 表验证 recipientUserId）
- Governance audit 审计记录

**处理的 Pitfalls:** #7 通知轰炸、#8 跨校隐私泄漏、#9 投递保证适度设计、#10 通知表增长（expiresAt + 索引）

### Phase 4: system.notification 读取 + 集成收尾

**理由:** 通知的查询/标记已读是纯 DAL 读操作，成本低。与 Phase 3 可分但保持功能完整。此 Phase 同时完成两者的集成收尾工作。

**交付物:**
- API Route: GET /api/notifications（分页查询，支持 unreadOnly 过滤）
- API Route: PATCH /api/notifications/[id]/mark-read、PUT /api/notifications/mark-all-read
- 通知偏好（per-plugin on/off，pluginOwnedBusinessData 存储）
- 90 天清理 job（复用 asyncTask 表基础设施）
- 配额告警 → notification.send 交叉集成
- 端到端集成测试（跨 school 场景、并发场景、配额场景）

**处理的 Pitfalls:** #10 通知无限增长（清理 job）、#11 治理门复用验证（集成测试覆盖）

### Phase 排序理由

1. **system.file 优先** — 技术复杂度最高（二进制分离、内容寻址存储、路径安全）。先验证"API Route bridge + Command Bus"模式，再复用到通知的"DB + WS"模式。
2. **读操作紧跟写操作** — 写操作验证安全模型后（路径隔离、治理门集成），读操作自然跟随。而且读操作成本极低，快速产出完整功能闭环。
3. **通知在文件之后** — 避免两个新命令的并行复杂度叠加。且通知的 DB + WS pattern 可以借鉴文件操作中已验证的 Command Bus 集成经验。
4. **每个 Phase 控制在 3-5 天** — 符合既有的短迭代节奏。

### 研究标记

**需要深度研究的 Phase:**
- **Phase 1 (system.file 核心)** — 内容寻址存储策略的具体实现细节（blobs 目录组织、GC 算法、hash 映射的 isLatest 行管理）需要设计 review。路径安全校验的边界条件需要编码前确认。
- **Phase 3 (system.notification 核心)** — WebSocket user-level channel 与现有 classroom session channel 的连接管理隔离需要确认。频率限制的 SQLite 滑动窗口实现方案需要设计 review。

**标准模式，可跳过研究的 Phase:**
- **Phase 2 (system.file 只读 + 配额)** — 纯 DAL 读路径（镜像 system.config.get）；配额实现本质是 SQLite 事务 + 计数更新（镜像现有 DAL 模式）。
- **Phase 4 (system.notification 读取 + 集成)** — 纯 DAL 读 + 已有 asyncTask 基础设施 + 常规 API Route。Pattern 明确。

## 信心评估

| 领域 | 信心 | 说明 |
|------|------|------|
| Stack | HIGH | 所有技术栈均为内置模块或已安装依赖，经项目既有代码验证。mime-types 已安装（3.0.2），Node 24 所有 API 稳定。零新依赖风险。 |
| Features | HIGH | 核心特征经多源验证（Novu/Knock 通知系统 + Drivebase/OpenStack Manila 文件代理），P1/P2/P3 优先级有明确矩阵。现有 v4.3 system.* 架构已验证可扩展性。 |
| Architecture | HIGH | 集成模式直接复用 v4.3 facade、治理门、Command Bus 三段式结构。二进制分离策略在多个研究中一致推荐。Discriminated union 扩展已验证。 |
| Pitfalls | HIGH | 陷阱基于 2024-2026 实际 CVE 案例（CVE-2025-23084、CVE-2024-21891、CVE-2025-67124）+ Node.js 安全最佳实践 + 现有代码库治理模型分析。每个陷阱有具体测试验证策略。 |

**整体信心:** HIGH — 所有研究均基于官方文档、实际 CVE、和项目既有代码库的直接分析，无推测性结论。

### 需要关注的问题

- **内容寻址存储 vs 覆盖模式的选择** — 研究推荐内容寻址（SHA-256 命名 blobs + pluginOwnedBusinessData 映射），但增加实现复杂度。如果 Phase 1 时间吃紧，可降级为覆盖模式 + 文件操作日志（"可追溯但不可恢复"），明确记录技术债务。
- **通知投递：轮询 vs WebSocket** — 研究建议首发 DB 写入 + WS best-effort 推送（对齐 ARCHITECTURE 的 Pattern 3），客户端同时支持轮询回退（用于离线恢复）。WS 推送复用现有 publishTransportEvent 模式，成本低。
- **文件扩展黑白名单的完整列表** — 研究建议"拒绝 SVG、HTML、JavaScript、WebAssembly"，但完整拒绝清单需要在实现阶段与安全 review 确定。
- **notifications 表的 expiresAt 清理策略** — 研究建议 90 天过期 + 30 天宽限期，需与产品确认是否合适。

## 数据来源

### 主要（HIGH confidence）
- Node.js 24 官方文档 — fs/promises、stream、crypto.randomUUID() API 稳定性确认
- mime-types 3.0.2 npm — MIME 类型映射表，Express 生态标准
- Next.js 16 官方文档 — serverActions.bodySizeLimit + FormData + Route Handlers + 流式响应
- Drivebase Storage Providers (deepwiki.com/drivebase) — IStorageProvider interface + capabilities 声明范式
- Knock In-App Notifications (docs.knock.app) — seen/read states, feed UI, badge counts
- Novu Inbox (docs.novu.co/platform/inbox) — multi-channel, templates, preference center
- OpenStack Glance Per-Tenant Quotas — 配额资源类型与执行模式
- CVE-2025-23084 — Node.js path.join Windows 盘符穿越
- CVE-2024-21891 — Node.js Permission Model 路径穿越绕过
- CVE-2025-67124 — miniserve TOCTOU + symlink race
- h3 serveStatic 安全公告 (GHSA-wr4h-v87w-p3r7) — 百分号编码路径穿越
- Node.js Permission Model 稳定化 PR #56201 — TOCTOU 不可完全解决
- GitLab Notifications ADR-001 — 通知 DB schema 设计
- Dependency Track Notification Outbox ADR — outbox 模式的反面教材
- 项目既有代码库（直接源码分析）：
  - src/features/system-commands/facade.ts — dispatchSystemCommand facade
  - src/features/system-commands/handler.ts — handler authorize/execute 模式
  - src/features/system-commands/audit.ts — writeSystemCommandAudit
  - src/features/platform-core/commands/contracts.ts — Command Bus 契约 + discriminated union
  - src/features/platform-core/commands/registry.ts — platformCommandRegistry
  - src/features/platform-core/plugin-data-access/governance-gate.ts — assertActionExecutable
  - src/lib/dto/resource-ai.ts — SystemCommandDiscriminatedSchema + PluginManifest
  - src/db/schema.ts — 表结构风格参考

### 次要（MEDIUM confidence）
- Next.js file upload patterns — Web 搜索 + 社区讨论确认接口模式
- SQLite in-app notification polling — PRAGMA data_version 轮询方案
- BlueSky Proxy (USENIX) — Write-back caching, log-structured layout
- OpenStack Manila Multi-Tenant Gateway — FSAL plugin architecture
- TOCTOU 学术共识综述 — Dean & Hu (2004)
- CVE-2025-32959 — CUBA Platform 无限制文件上传 DoS
- Appcues "In-app notifications best practices" — UX 指南

---
*研究完成: 2026-06-13*
*准备进入路线图: 是*
