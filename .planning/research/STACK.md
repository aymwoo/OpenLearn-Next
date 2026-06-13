# Stack Research: system.file + system.notification

**Domain:** 系统命令扩展 — 本地文件存储代理 + 应用内通知推送
**Researched:** 2026-06-13
**Confidence:** HIGH

## Recommended Stack

### 核心结论：零新依赖

`system.file` 和 `system.notification` 两个系统命令的实现**不需要引入任何新的第三方 npm 依赖**。所有能力均可由现有栈（Node.js 24 内置模块 + Drizzle ORM + Zod 4 + Next.js 16 Server Actions/Route Handlers）提供。

---

## system.file — 文件存储代理

### 核心技术

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `node:fs/promises` | 内置 (Node 24) | 所有文件操作 | Node.js 24 `fs.promises` API 完整覆盖需求：`writeFile`、`readFile`、`unlink`、`readdir`、`rename`、`copyFile`、`mkdir({recursive:true})`、`stat`、`access`、`createReadStream`。零依赖，API 稳定 |
| `node:path` | 内置 (Node 24) | 路径安全处理 | `path.normalize` + `path.join` 防止路径遍历攻击；`path.extname` 提取扩展名。安全文件存储的基石 |
| `node:crypto` | 内置 (Node 24) | 确定性文件名生成 | `crypto.randomUUID()` 生成唯一文件名，防止原始文件名注入；SHA-256 可选用于文件完整性校验 |
| `node:stream` | 内置 (Node 24) | 大文件流式传输 | `fs.createReadStream` → `Readable.toWeb()` → `new Response(stream)` 实现流式下载，避免大文件全量加载到内存 |
| mime-types | 3.0.2 | Content-Type 检测 | `mime.lookup(path)` 从扩展名推导 MIME 类型，`mime.contentType(ext)` 生成完整 Content-Type header。Express/send 生态事实标准，零配置 |
| Drizzle ORM | ~0.45.2 | `pluginFiles` 元数据表 CRUD | 文件元数据（大小、类型、路径、上传时间、schoolId、pluginId、uploadedBy）存入 SQLite，物理文件存本地目录隔离存储，元数据与物理文件通过路径/ID 关联 |
| Zod 4 | ~4.4.3 | Payload 校验 + manifest 白名单校验 | `SystemFilePayloadSchema` 校验各操作 payload 形状；manifest `systemCommands` 声明段使用 discriminatedUnion 追加 `system.file.*` 的专用 shape |

### 架构决策：本地文件系统后端

**决策：** 使用项目根目录下的可配置存储目录（默认 `data/files/`），通过 `schoolId/pluginId/` 两级子目录实现物理隔离。

**理由：**
1. **对齐现有部署模型**：项目已使用 SQLite（libSQL）首发，本地文件系统与单文件数据库的部署模型一致——都是本地持久化，零外部服务依赖。
2. **安全隔离**：`{schoolId}/{pluginId}/{uuid}.{ext}` 路径结构确保插件只能访问自己 school+plugin 范围内的文件。文件存储于 Web 根目录外（`data/files/`），不可通过 URL 直接访问。
3. **零基础设施**：不需要 S3/MinIO/R2 等外部存储服务。适合单机/单校部署场景。
4. **manifest 白名单控制**：复用 v4.3 的 `systemCommands` 声明段模式，在 authorize 阶段校验路径前缀和操作类型。

**关键设计约束：**
- 文件名必须由服务端生成（`crypto.randomUUID()` + 保留原始扩展名），防止路径遍历攻击。
- 上传时检测扩展名白名单（从 manifest `allowedExtensions` 读取），可选 MIME 魔术字节验证（通过 `mime-types` 库校验 `file.type` 与扩展名一致）。
- 文件大小上限通过 manifest 声明 + 服务端配置双重限制（默认 50MB）。
- `download` 通过 Route Handler 流式返回（`fs.createReadStream` → `Readable.toWeb()` → `new Response(stream, {headers})`），支持 Range 请求以支持断点续传/视频拖动。
- `list` 仅列出元数据（从 `pluginFiles` 表查询），不遍历物理目录——物理目录结构是元数据的投影，不是查询源。
- 物理文件删除与元数据删除在同一事务中完成。如果物理删除成功但 DB 写入失败，残留物理文件由定期清理任务处理（或标记为 orphan）。

### 操作分类与路由

**写操作（经 Command Bus）：**
| 操作 | commandType | 说明 |
|------|-------------|------|
| upload | `system.file.upload` | 接收 multipart/form-data，流式写入磁盘，插入元数据 |
| delete | `system.file.delete` | 删除物理文件 + 元数据记录 |
| move | `system.file.move` | 原子 rename + 更新元数据（同 school/plugin 内） |
| copy | `system.file.copy` | `fs.copyFile` + 插入新元数据记录 |

**读操作（纯 DAL，不声明为 PlatformCommandType）：**
| 操作 | 路由方式 | 说明 |
|------|---------|------|
| download | API Route Handler `GET /api/system/file/[fileId]` | 流式返回文件内容，设置 Content-Type/Content-Disposition headers |
| list | `dispatchSystemCommand({commandType:"system.file.list"})` | 经 facade governance gate → DAL 查询 `pluginFiles` 表 |
| metadata | `dispatchSystemCommand({commandType:"system.file.metadata"})` | 经 facade governance gate → DAL 查询单个文件元数据 |

> 注意：`download` 不经过 Command Bus，因为它是纯读取（不产生持久化副作用），使用 API Route Handler 实现流式传输。`list` 和 `metadata` 虽然用 facade 路由（走 governance gate），但不声明为 `PlatformCommandType`——镜像 `system.config.get` 的读语义。

---

## system.notification — 应用内通知推送

### 核心技术

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Drizzle ORM | ~0.45.2 | `notifications` 表 CRUD | 通知存储、查询、标记已读、未读计数；所有操作通过 DAL 层进行 |
| SQLite/libSQL | @libsql/client ^0.17.3 | 通知持久化 + 原子写入 | 通知写入与业务写入可在同一事务中完成（Outbox 模式），保证一致性 |
| Zod 4 | ~4.4.3 | Payload 校验 + 通知类型白名单校验 | `SystemNotificationPayloadSchema` 校验目标用户、通知类型、title/body/payload |
| `node:crypto` | 内置 (Node 24) | 通知 ID 生成 | `crypto.randomUUID()` 生成通知唯一 ID |

### 通知投递方式

**决策：首发采用客户端轮询（Polling）模式。**

| 方式 | 适用场景 | 本轮实现 |
|------|---------|---------|
| **轮询（Polling）** | MVP/首发 | 客户端每 N 秒 GET `/api/notifications?unreadOnly=true`；DAL 层 `getUserNotifications(userId)` 查询 `notifications` 表；与项目现有数据获取模式一致 |
| SSE（Server-Sent Events） | 实时通知 | 不实现。后续可复用现有 classroom SSE 的 `PRAGMA data_version` 轮询模式 |
| WebSocket | 高频实时 | 不实现。已有 `ws` 基础设施，后续若要集成可直接挂接 classroom WebSocket channel |

**选择轮询的理由：**
1. **对齐 MVP 复杂度**：`system.notification` 的核心价值是"插件能推通知、用户能看到"，轮询完全满足此需求。
2. **复用现有 pattern**：DAL 层 `getUserNotifications(userId)` → 客户端轮询，与已有 classroom 数据获取模式一致。
3. **零新基础设施**：不需要 Redis pub/sub、WebSocket 新 channel、或独立 worker 进程。
4. **渐进升级路径**：后续可挂接到 classroom WebSocket fanout 或 SSE channel，无需改表结构。

### 通知写入路径

复用 v4.3 建立的 Command Bus + governance gate 模式：

```
插件调用 dispatchSystemCommand({commandType: "system.notification.send"})
  → ① facade 治理门前置（assertActionExecutable：lifecycle + kill-switch + school scope）
  → ② authorize（manifest 白名单校验通知类型 notificationTypes）
  → ③ execute（写入 notifications 表 + 返回 notificationId）
  → ④ audit（写入 system command audit）
```

### 通知表设计方向

```sql
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,                -- crypto.randomUUID()
  schoolId TEXT NOT NULL,             -- 学校隔离
  userId TEXT NOT NULL,               -- 接收者
  pluginId TEXT NOT NULL,             -- 发送插件（用于 manifest 白名单校验和展示来源）
  type TEXT NOT NULL,                 -- 通知类型（插件在 manifest systemCommands 中声明）
  title TEXT NOT NULL,                -- 通知标题
  body TEXT,                          -- 通知正文（可选）
  payloadJson TEXT,                   -- 结构化数据（action链接、资源ID等），JSON 序列化
  readAt INTEGER,                     -- NULL=未读，timestamp=已读时间
  createdAt INTEGER NOT NULL,         -- 创建时间（毫秒时间戳）
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user_unread ON notifications(schoolId, userId, readAt) WHERE readAt IS NULL;
CREATE INDEX idx_notifications_user_created ON notifications(schoolId, userId, createdAt);
```

### 为什么不需要的库

| Avoid | Why Not | Use Instead |
|-------|---------|-------------|
| Redis pub/sub (ioredis) | 通知实时推送不需要独立消息中间件；客户端轮询即可检测变更；该项目的 ioredis 用于 classroom fanout，通知量级不需要 | SQLite 表写入后客户端轮询 |
| BullMQ | 通知不需要队列语义（无重试、无优先级、无延迟投递需求）；为通知单独引入 worker 过度设计 | 直接 DAL 写入 |
| Firebase Cloud Messaging / OneSignal / Web Push API | **超出 scope**：`system.notification` 是应用内通知，不是平台推送；用户必须在登录态下查看 | — |
| `node-cron` / `node-schedule` | 通知默认为即时推送，无定时调度需求 | — |

**架构决策：应用内通知 vs 推送通知。** `system.notification` 严格定义为**应用内（in-app）通知**。通知存储于 `notifications` 表中，用户在 Web 界面内查收。不做浏览器 Push Notification、不做邮件/SMS 通知。通知数据不出服务器，不经过第三方推送服务。

---

## 与现有栈的集成

### 两个新命令在现有架构中的位置

| Integration Point | Approach | Notes |
|-------------------|----------|-------|
| `PlatformCommandType` | 新增变体 | 写操作：`system.file.upload`、`system.file.delete`、`system.file.move`、`system.file.copy`、`system.notification.send`。读操作（`system.file.list`、`system.file.metadata`）不声明为 `PlatformCommandType`——镜像 `system.config.get` 的纯 DAL 读模式 |
| `platformCommandRegistry` | 注册新 handler | 复用 `createPlatformCommandDefinition` pattern，每个新 commandType 定义 authorize + execute |
| `SystemCommandTypes` 常量 | 追加新类型 | 在 `contracts.ts` 中追加写操作的 commandTypes |
| `PlatformCommandPayloadSchemas` | 追加新 schema | 每个 commandType 定义专用 `.strict()` Zod schema |
| `dispatchSystemCommand` facade | 扩展判别分支 | 在现有三段式结构（治理门前置 → 判别派发 → 结果返回）中追加新 commandType 分支 |
| `PluginManifestSchema` systemCommands | 追加新 shape | 追加 `system.file` 和 `system.notification` 的专用声明 shape（`allowedPaths`、`allowedExtensions`、`maxFileSize`、`notificationTypes`） |
| `next.config.ts` | 追加 `serverActions.bodySizeLimit` | 文件上传需要更大的请求体限制，设置 `bodySizeLimit: '50mb'` |
| Governance gate (`assertActionExecutable`) | 复用现有 | 所有新命令在 facade 层经治理门检查 lifecycle + kill-switch + school scope |

### DAL 层新增

- `src/lib/dal/system-file.ts` — 文件元数据 DAL（`insertFileMetadata`、`getFileById`、`listFiles`、`updateFileMetadata`、`deleteFileMetadata`）
- `src/lib/dal/system-notification.ts` — 通知 DAL（`insertNotification`、`getUserNotifications`、`markNotificationRead`、`countUnread`）

### DTO 层新增

- `src/lib/dto/system-file.ts` — 各文件操作的 Zod payload schema（`SystemFileUploadPayloadSchema`、`SystemFileDeletePayloadSchema`、`SystemFileListPayloadSchema` 等）
- `src/lib/dto/system-notification.ts` — `SystemNotificationSendPayloadSchema`（校验 userId、type、title、body、payload）

---

## 安装指令

```bash
# system.file + system.notification 不需要新依赖
# 零新增包安装

# 确认 mime-types 已安装（应已存在于项目）：
pnpm ls mime-types   # 应返回 3.0.2
```

---

## 可选方案对比

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `node:fs/promises` 直接操作 | S3 SDK (`@aws-sdk/client-s3`) | 当需要多实例水平扩展、海量文件存储、CDN 分发时。超出本轮 scope |
| `crypto.randomUUID()` | `nanoid` 5.x | 当 URL 安全和更短 ID（21字符 vs 36字符）是硬需求时。但 UUIDv4 已有足够熵，且 `crypto.randomUUID()` 零依赖 |
| 轮询通知查询 | SSE 实时推送 | 当通知需要 < 1s 延迟的实时感知时。可在后续 phase 升级 |
| Drizzle ORM + SQLite | Redis 缓存通知计数 | 当通知量级达到百万级、高并发未读计数查询成为瓶颈时 |
| API Route Handler 文件下载 | Server Action 直接返回 | 当文件较小（<1MB）且不需要 Range 支持时。Route Handler 提供更精确的 HTTP 控制 |

---

## What NOT to Use

| Avoid | Why Not | Use Instead |
|-------|---------|-------------|
| `multer` | 深度依赖 Express/Connect `(req, res, next)` middleware 模式，与 Next.js App Router 的 Web API `Request`/`FormData` 不兼容 | `await file.arrayBuffer()` → `Buffer.from()` / `new Uint8Array()`（原生 Web API） |
| `formidable` | 基于 `IncomingMessage` EventEmitter 模式；Next.js 16 已在内部解析 multipart，重复引入造成重复解析 | 原生 `FormData` + `File` API |
| `busboy` | Next.js 16 内部已使用 busboy 解析 multipart form data；重复引入造成重复解析和内存浪费 | 原生 `FormData` API |
| `sharp` | 图片处理超出本轮 scope（FILE-01/FILE-02 不做图片变换） | 不做变换 |
| `@aws-sdk/client-s3` / `@aws-sdk/lib-storage` | **明确超出 scope**：`system.file` 是本地文件系统代理，不是云存储 | — |
| `nanoid` / `uuid` (npm 包) | Node.js 24 `crypto.randomUUID()` 原生提供 UUIDv4，零依赖，性能更好 | `crypto.randomUUID()` |
| `mkdirp` / `make-dir` | Node.js 10.12+ 内置 `fs.mkdir(path, {recursive: true})`，功能完全覆盖 | 内置 API |
| 独立通知推送服务（FCM/APNs/OneSignal） | **超出 scope**：`system.notification` 是应用内通知，不是平台推送 | — |
| BullMQ 为通知新增 worker | 通知不需要队列语义（无重试/优先级/延迟），写入即完成 | 直接 DAL 写入 |
| Redis pub/sub 为通知新增 channel | 通知量级不需要独立消息中间件；客户端轮询即可 | 轮询 + 后续可选 SSE |

---

## 版本兼容性

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Node.js 24 | `fs/promises`、`path`、`crypto.randomUUID()`、`stream` | 所有目标 API 在 Node 20+ 稳定，项目使用 Node 24 |
| Next.js 16.2.x | `serverActions.bodySizeLimit`、`FormData`、`File`、Route Handlers | 所有使用的 API 在 Next.js 16 稳定；`bodySizeLimit` 配置已从 experimental 毕业 |
| Drizzle ORM ~0.45.2 | SQLite 驱动 | 完整支持，无已知兼容问题。`sqliteTable` + `text` + `integer` 类型匹配通知表和文件元数据表需求 |
| mime-types 3.0.2 | Node 24 | 纯静态数据映射，无运行时依赖冲突 |
| Zod ~4.4.3 | `z.strictObject` + `z.discriminatedUnion` + `z.enum` | 所有 payload schema 使用项目现有 Zod 4 API |

---

## 配置要求

### next.config.ts 变更

```typescript
const nextConfig: NextConfig = {
  // ... 现有配置 ...
  serverActions: {
    bodySizeLimit: '50mb',  // system.file.upload 需要
  },
}
```

### 存储目录结构

```
data/files/                  # 存储根目录（gitignore，Web 根外）
  {schoolId}/                # 学校隔离
    {pluginId}/              # 插件隔离
      {uuid}.{ext}           # crypto.randomUUID() + 保留原始扩展名
```

`data/files/` 必须在 `.gitignore` 中。

---

## Sources

- **HIGH confidence** — Node.js 24 `node:fs/promises` 官方文档：[nodejs.org/api/fs.html#promises-api](https://nodejs.org/api/fs.html#promises-api) — 确认 `writeFile`、`readFile`、`mkdir({recursive})`、`createReadStream` 等 API 稳定性
- **HIGH confidence** — `mime-types` 3.0.2 npm：[npmjs.com/package/mime-types](https://www.npmjs.com/package/mime-types) — 确认文件扩展名到 MIME 类型的映射表，Express 生态标准
- **HIGH confidence** — Next.js Server Actions `bodySizeLimit`：[nextjs.org/docs/app/api-reference/config/next-config-js/serverActions](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions) — 确认配置已从 experimental 毕业
- **HIGH confidence** — 项目既有源码（直接读取）：
  - `src/features/platform-core/commands/contracts.ts` — 现有 Command Bus 契约，`SystemCommandTypes` 常量 + `PlatformCommandSchema` discriminated union 追加模式
  - `src/features/platform-core/commands/registry.ts` — `platformCommandRegistry` 注册模式
  - `src/features/system-commands/facade.ts` — `dispatchSystemCommand` 三段式 facade 模式
  - `src/features/system-commands/handler.ts` — handler 的 authorize + execute 模式
  - `src/features/platform-core/plugin-data-access/governance-gate.ts` — `assertActionExecutable` 治理门接口
  - `src/lib/dto/resource-ai.ts` — `PluginManifestSchema` 定义位置
  - `src/db/schema.ts` — 现有表结构，确定新表命名和字段风格
  - `package.json` — 确认 `mime-types` 已安装（3.0.2）及其他依赖版本
- **MEDIUM confidence** — Next.js file upload patterns — Web 搜索 + 社区讨论确认 Server Action 中 `FormData` + `File.arrayBuffer()` 是推荐模式
- **MEDIUM confidence** — SQLite in-app notification polling — Web 搜索确认 `PRAGMA data_version` 轮询是 SQLite 场景下高效的实时检测方案

---
*Stack research for: system.file + system.notification (v4.4 System Commands Bus 第二批)*
*Researched: 2026-06-13*
