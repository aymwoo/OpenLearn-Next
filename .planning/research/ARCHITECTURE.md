# Architecture Research: system.file + system.notification 集成

**Domain:** 插件系统命令总线扩展（文件存储代理 + 应用内通知推送）
**Researched:** 2026-06-13
**Confidence:** HIGH

## System Overview

### system.file 和 system.notification 在现有架构中的位置

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Plugin (manifest.json)                              │
│  systemCommands: [                                                           │
│    { command: "system.file"     → allowedPaths, allowedOps, maxFileSize }    │
│    { command: "system.notification" → allowedTypes, targetRoles }            │
│  ]                                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                           dispatchSystemCommand facade                        │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  ① governance-gate: assertActionExecutable(verb, pluginKey)          │   │
│  │     → schoolId derived from session, lifecycle/kill-switch check     │   │
│  │  ② discriminate: system.file.* / system.notification.*               │   │
│  │  ③ route:                                                            │   │
│  │     - system.file.upload/download/delete  → Command Bus (PRODUCER)   │   │
│  │     - system.file.list/info/metadata       → DAL (READ, no audit)    │   │
│  │     - system.notification.send             → Command Bus (PRODUCER)  │   │
│  │     - system.notification.list/unread      → DAL (READ, no audit)    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│                      platformCommandRegistry (contracts.ts)                   │
│  ┌──────────────────┐  ┌──────────────────────────┐                         │
│  │ system.file.     │  │ system.notification.      │                         │
│  │ upload/download  │  │ send                      │                         │
│  │ delete           │  │                           │                         │
│  │ (Command Types)  │  │ (Command Type)            │                         │
│  └────────┬─────────┘  └────────────┬─────────────┘                         │
│           │ handler.authorize       │ handler.authorize                      │
│           │ handler.execute         │ handler.execute                        │
├───────────┴─────────────────────────┴───────────────────────────────────────┤
│                              Data Layer                                       │
│  ┌─────────────────────┐  ┌──────────────────────────────────────┐         │
│  │ systemFiles (SQLite)│  │ Local Disk (data/uploads/{schoolId}/ │         │
│  │ - metadata table    │  │           {pluginKey}/...)            │         │
│  │ - file records      │  │ - binary content on disk             │         │
│  │ - plugin+school     │  │ - metadata + reference in SQLite     │         │
│  │   isolation         │  │ - path: {schoolId}/{pluginKey}/...   │         │
│  └─────────────────────┘  │ - filename: hash-based UUID          │         │
│                           └──────────────────────────────────────┘         │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │ notifications (SQLite)                                            │     │
│  │ - id, userId, schoolId, pluginId, type, title, body, payloadJson │     │
│  │ - isRead, readAt, createdAt                                      │     │
│  │ - indexed: (userId, isRead, createdAt DESC)                      │     │
│  └──────────────────────────────────────────────────────────────────┘     │
├─────────────────────────────────────────────────────────────────────────────┤
│                            Realtime Delivery                                 │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │ notification.send execute → DB write → WS push (via publishTran  │     │
│  │ sportEvent or new user-specific channel)                         │     │
│  │                                                                  │     │
│  │ 推送通道：复用现有 WebSocket transport boundary                  │     │
│  │ 新 message kind: "notification.received"                         │     │
│  │ 用户级 channel: user:{userId} (与 classroom-session channel 不同)│     │
│  └──────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 关键设计问题解答

**Q1: 文件二进制数据如何通过 Command Bus？**

答案：**不通过。** JSON Command Bus envelope 不适合承载二进制数据。策略如下：

- `system.file.upload`: 通过独立的 **API Route** (`/api/system/file/upload`) 接收 multipart/form-data，然后内部调用 `dispatchSystemCommand` 传递**元数据引用**（文件名、大小、MIME 类型、目标路径）但不传递文件二进制本体。
- `system.file.download`: 通过 **API Route** (`/api/system/file/[fileId]/download`) 直接流式响应文件内容，不走 Command Bus。
- `system.file.delete/list/info`: 元数据操作走 Command Bus 或 DAL 读路径。

**Q2: 文件存储：文件内容在磁盘 vs SQLite？**

答案：**文件元数据在 SQLite，文件内容在磁盘。** SQLite 不适宜存储大文件二进制（性能退化，DB 膨胀）。磁盘路径结构：
```
data/uploads/{schoolId}/{pluginKey}/{hash-based-uuid}.{ext}
```
路径隔离即安全隔离：每个文件路径天然包含 schoolId 和 pluginKey，不可跨 school/plugin 访问。

**Q3: 通知是实时推送还是轮询？**

答案：**两者兼备。** 写入路径走 Command Bus → DB 持久化 → WebSocket 推送（实时）。客户端也提供 HTTP 轮询回退（`system.notification.list` 只读 DAL）用于离线恢复和补拉。

## Component Boundaries

### 新增组件

| 组件 | 职责 | 通信对象 |
|------|------|---------|
| `system.file` handler (`src/features/system-commands/handler.file.ts`) | authorize: 解析 manifest 白名单，校验 allowedPaths/allowedOps/maxFileSize；execute: 文件 CRUD 逻辑 | `systemCommandStore`, `systemFiles` DAL, disk I/O |
| `system.notification` handler (`src/features/system-commands/handler.notification.ts`) | authorize: 解析 manifest，校验 allowedTypes/targetRoles；execute: 写入 notifications 表 + WS 发布 | `systemCommandStore`, `notifications` DAL, transport gateway |
| `systemFiles` 表 + DAL | 文件元数据持久化（路径、大小、MIME、上传者、schoolId、pluginId） | Drizzle, handler |
| `notifications` 表 + DAL | 通知持久化（userId、类型、标题、正文、已读状态） | Drizzle, handler, transport |
| API Routes: `/api/system/file/upload`, `/api/system/file/[fileId]/download` | 接收/发送二进制文件数据，与 handler 解耦 | handler, disk |
| `notification.received` WS message kind | 新增 WebSocket 消息类型，用户级推送 | ws-envelope, ws-connection-registry |

### 修改组件

| 组件 | 修改内容 | 影响范围 |
|------|---------|---------|
| `SystemCommandTypes` in `contracts.ts` | 追加 `system.file.upload`, `system.file.download`, `system.file.delete`, `system.notification.send` | discriminated union 扩增，所有现有 handler 不受影响 |
| `SystemCommandDiscriminatedSchema` in `resource-ai.ts` | 追加 `system.file` 和 `system.notification` 的 manifest 声明 shape | plugin install preflight 需要新校验 |
| `dispatchSystemCommand` facade | 追加判别分支：`system.file.*` → Command Bus/DAL, `system.notification.*` → Command Bus/DAL | additive 扩展 |
| `platformCommandRegistry` | 注册新 commandType handler | 与现有 registry 模式一致 |
| `GovernanceDeniedReasonValues` in `permissions.ts` | 可能需要加 `file_path_denied`、`file_size_exceeded`、`notification_type_denied` | additive 扩展 |
| `writeSystemCommandAudit` in `audit.ts` | `commandType` 联合类型追加新类型 | additive 扩展 |
| `ws-envelope.ts` `ClassroomWebSocketMessageKindSchema` | 追加 `"notification.received"` | 少量扩展 |
| `cache-policy.ts` | 追加 `systemFiles` 和 `notifications` 相关 tag | additive |

### 不修改组件

- `assertActionExecutable` (governance-gate.ts) — schoolId 派生逻辑不变，verb 已泛化为 string
- `publishTransportEvent` — 复用现有 transport seam
- `pluginRegistrations` 表结构 — manifestJson 已支持 `systemCommands` optional array
- `governanceAudits` 表 — `writeSystemCommandAudit` 已写入此表，commandType 参数化

## Data Flow

### system.file.upload 完整流程

```
Client (plugin runtime)
    ↓ multipart/form-data
POST /api/system/file/upload                    ← API Route (不经过 Command Bus)
    ↓
  1. 解析 File + metadata (fileName, path hint)
  2. 调用 dispatchSystemCommand({              
      commandType: "system.file.upload",        
      pluginKey, actorId,                        
      metadata: { fileName, mimeType, size,     
                   targetPath, ... }             
     })                                           
    ↓                                              
dispatchSystemCommand facade                     
    ↓ ① governance-gate                          
assertActionExecutable(verb="system.file.upload") 
    ↓ ② payload validation (Shape校验)          
Zod 拒绝：非法 path/mimeType/size/ops            
    ↓ ③ Command Bus execute                      
handler.file.ts: execute()                       
    ├── authorize: manifest 白名单匹配 allowedPaths + allowedOps
    ├── 生成 UUID 文件名 + 磁盘路径              
    ├── 写入文件到 data/uploads/{schoolId}/{pluginKey}/...
    ├── 写入 systemFiles 元数据记录               
    ├── 写 governanceAudit (allowed)             
    └── 返回 resultSummary: { fileId, url, name, size }
```

### system.file.download 流程

```
Client
    ↓
GET /api/system/file/[fileId]/download           ← API Route (不经过 Command Bus)
    ↓
  1. 直接调用 file DAL 查询元数据 (纯读)
  2. 校验 schoolId/pluginKey 隔离
  3. 流式响应文件内容 (stream pipeline)
  4. 写只读 audit (denied-but-recorded, 不需要 Command Bus)
```

### system.notification.send 完整流程

```
Client (plugin runtime)
    ↓
dispatchSystemCommand({                          
  commandType: "system.notification.send",        
  pluginKey, actorId,                             
  notification: { userId, type, title, body }      
})                                                 
    ↓ ① governance-gate                            
assertActionExecutable(verb="system.notification.send")
    ↓ ② payload validation                         
    ↓ ③ Command Bus execute                        
handler.notification.ts: execute()                  
    ├── authorize: manifest 白名单匹配 allowedTypes + targetRoles
    ├── 校验 targetUserId 在 plugin 所在 school
    ├── 写入 notifications 表
    ├── 写 governanceAudit (allowed)
    ├── 调用 publishTransportEvent({              
    │     sessionId: null,                         
    │     channel: "user:" + targetUserId,         ← 用户级 channel
    │     kind: "notification.received",           ← 新 WS kind
    │     payload: { notificationId, type, title, body }
    │   })
    └── 返回 resultSummary
```

### system.notification.list 流程 (只读)

```
Client (user)
    ↓
GET /api/notifications?unreadOnly=true&limit=20    ← 直接 DAL 读，不走 Command Bus
    ↓
DAL: 查询 notifications WHERE userId = ? AND (isRead = 0) ORDER BY createdAt DESC LIMIT 20
```

## Architectural Patterns

### Pattern 1: Write-via-Command-Bus, Read-direct-DAL

**来自:** v4.3 `system.config.set` (Command Bus) vs `system.config.get` (DAL)

**新应用:**
- `system.file.upload` / `system.file.download` / `system.file.delete` → Command Bus
- `system.file.list` / `system.file.info` / `system.file.metadata` → DAL (纯读)
- `system.notification.send` → Command Bus
- `system.notification.list` / `system.notification.unreadCount` → DAL (纯读)

**原则:** 只有**写入或副作用操作**进入 Command Bus。纯读取走 DAL，不触发治理审计写入、不占用命令记录。

### Pattern 2: Binary Bypass — API Route Bridge

**新引入:** Command Bus envelope 是 JSON，不能承载二进制。对于 file upload/download，引入 API Route 作为二进制桥梁。

```
Plugin → API Route (multipart/stream) → dispatchSystemCommand (metadata only) → Command Bus → execute
```

Download 反过来：客户端请求 API Route，API Route 直接读 DAL + 磁盘后流式响应。

### Pattern 3: Notification Delivery — DB + WS Dual Write

**复用:** `quiz.answer.received` 的 `publishTransportEvent` 模式。

通知写入：先写 DB（durable truth），再推 WS（best-effort delivery）。WS 失败不影响 DB 写入成功，客户端可通过轮询 DAL 补拉。

```typescript
// handler.notification.ts execute() 伪代码
await db.insert(notifications).values({...notification});
// Best-effort: WS 推送失败不抛错
try {
  await publishTransportEvent({
    channel: `user:${targetUserId}`,
    kind: "notification.received",
    payload: { notificationId, type, title, body }
  });
} catch {
  // 客户端会通过轮询补拉
}
```

### Pattern 4: Path-Based Isolation (system.file)

**来自:** `system.config` 的三重前缀隔离 (`{schoolId}:{pluginId}:{key}`)

**新应用:** 文件系统路径隔离：
```
data/uploads/{schoolId}/{pluginKey}/{category?}/{uuid}.{ext}
```
- `schoolId` 和 `pluginKey` 由 facade 注入（来自 governance-gate），绝不从 payload 读取
- 所有文件操作 path resolution 基于注入的 schoolId/pluginKey 做 prefix guard
- 禁止 `..` 路径穿越

## Anti-Patterns to Avoid

### Anti-Pattern 1: 文件二进制进 Command Bus

**错误:** 把文件的 Buffer/Uint8Array 放进 `PlatformCommand.payload`
**为什么错:** Command Bus envelope 经过 JSON 序列化 → Drizzle `payloadJson` 列，二进制数据会导致内存爆炸和 JSON 序列化失败
**正确做法:** 文件内容通过 API Route 直接写入磁盘，Command Bus 只传元数据引用

### Anti-Pattern 2: 文件元数据和二进制存储在同一列

**错误:** 把文件内容以 base64 或 blob 存入 SQLite
**为什么错:** SQLite 大二进制存储性能退化；备份/迁移困难；写入时锁竞争严重
**正确做法:** 文件内容在磁盘，SQLite 只存元数据 + 磁盘路径引用

### Anti-Pattern 3: 通知写入和 WS 推送强绑定

**错误:** WS 推送失败 → 整个 send 命令回滚
**为什么错:** WS 是 best-effort delivery，不能因为网络问题阻止 DB 持久化。通知必须先落地（durable truth），再推送。
**正确做法:** DB write 成功即命令成功，WS 推送失败只记 warning 日志。

### Anti-Pattern 4: 为通知创建新的 transport channel

**错误:** 新建独立的 `/api/ws/notification` WebSocket endpoint
**为什么错:** 现有 WebSocket server 已有鉴权、连接注册、session 管理、Redis fanout。新建 endpoint 重复这些层。
**正确做法:** 在现有 Classroom WebSocket 中新增 `notification.received` message kind，channel 收窄到 `user:{userId}`。

### Anti-Pattern 5: notification targetUserId 从 payload 读取

**错误:** payload 中直接包含 `targetUserId`，由插件指定
**为什么错:** 破坏 school scoping，插件可以跨校推送
**正确做法:** targetUserId 必须在 authorize 阶段校验其在 plugin 所在的 school(s) 中有有效 membership。仅允许向同校用户推送。

## Scalability Considerations

| 关注点 | 单机/SQLite (当前) | 多实例扩展方向 |
|--------|-------------------|--------------|
| 文件存储 | 本地磁盘 `data/uploads/` | S3-compatible object storage (MinIO/R2)，文件 ID 映射到 object key |
| 文件并发写入 | SQLite WAL 足够 (单写锁) | 对象存储天然分布式，无需锁 |
| 通知查询 | SQLite `(userId, isRead, createdAt)` 索引，<1000 用户无压力 | PostgreSQL read replica 分担查询 |
| 通知实时推送 | 单机 WS 直推 | Redis fanout (已有 `redis-fanout-manager.ts`)，广播到所有 WS 实例 |
| 通知保留 | 后台清理 job，保留最近 100 条/用户 | 同样策略，批量 DELETE |
| 文件大小 | 上限由 maxFileSize manifest 声明控制 | 相同逻辑，上限由对象存储 SLA 决定 |

## Recommended Project Structure

```
src/features/system-commands/
├── handler.ts                    # 现有 system.http.request + system.config (不变)
├── handler.file.ts               # [NEW] system.file 的 authorize/execute
├── handler.notification.ts       # [NEW] system.notification 的 authorize/execute
├── facade.ts                     # 扩增 (追加判别分支)
├── audit.ts                      # 小改 (commandType 联合类型追加)
├── ssrf-guard.ts                 # 不变
├── file-storage.ts               # [NEW] 磁盘 I/O 工具 (writeFile, readFile, deleteFile)
├── file-dal.ts                   # [NEW] systemFiles 表 DAL (insert/get/delete/list)
├── notification-dal.ts           # [NEW] notifications 表 DAL (insert/list/markRead)
├── *.test.ts                     # 对应测试

src/app/api/system/file/
├── upload/route.ts               # [NEW] POST multipart/form-data upload endpoint
├── [fileId]/download/route.ts    # [NEW] GET 文件下载流式响应

src/app/api/notifications/
├── route.ts                      # [NEW] GET 当前用户通知列表
├── [notificationId]/mark-read/
│   └── route.ts                  # [NEW] PATCH 标记已读

src/db/schema.ts                  # [NEW] systemFiles + notifications 表定义
src/lib/cache-policy.ts           # [NEW] systemFiles + notifications cache tags
```

## Suggested Build Order

1. **Phase: system.file (基础 CRUD)**
   - DB migration: `systemFiles` 表
   - DAL: `file-dal.ts` (insert/getById/list/delete)
   - 磁盘工具: `file-storage.ts`
   - manifest shape: `SystemCommandFileSchema` 追加到 discriminated union
   - contracts: `system.file.upload`, `system.file.download`, `system.file.delete` 命令类型 + payload schemas
   - handler: `handler.file.ts` authorize + execute
   - API Routes: `/api/system/file/upload` (接收 multipart), `/api/system/file/[fileId]/download` (流式)
   - registry 注册 + facade 判别
   - governance audit 审计记录
   
2. **Phase: system.file (只读操作)**
   - `system.file.list` / `system.file.info` / `system.file.metadata`: 纯 DAL 读
   - facade 判别分支（读路径不写 audit）

3. **Phase: system.notification (写入)**
   - DB migration: `notifications` 表
   - DAL: `notification-dal.ts` (insert/markRead/list)
   - manifest shape: `SystemCommandNotificationSchema`
   - contracts: `system.notification.send` 命令类型
   - handler: `handler.notification.ts`
   - WS envelope: 新增 `notification.received` message kind
   - publishTransportEvent with user-level channel
   - registry 注册 + facade 判别

4. **Phase: system.notification (读取 + 收件箱 UI)**
   - API Route: `/api/notifications` (GET)
   - `markRead` API Route
   - 前端通知面板组件（可选，如产品需要）

**理由:** system.file 是 system.notification 的前置（无依赖关系但 file 涉及的二进制处理更复杂，先验证磁盘 IO/API Route bridge 模式，再复用类似模式到 notification 的 DB+WS write pattern）。system.file 的基础 CRUD 和只读分两个 phase 降低 blast radius。

## Integration Points Summary

| 集成点 | 接口 | 数据格式 | 新增/修改 |
|--------|------|---------|----------|
| PluginManifest → install preflight | `systemCommands[]` discriminated union | JSON (manifest.json) | 修改: 追加 `system.file` + `system.notification` variant |
| Plugin → dispatchSystemCommand | facade 函数调用 | TypeScript typed params | 修改: 追加判别分支 |
| dispatchSystemCommand → Command Bus | `dispatchPlatformCommand(envelope, ...)` | PlatformCommand discriminated union | 修改: 追加 commandType |
| Command Bus → handler.authorize | manifest re-parse + allowedPaths/allowedOps 白名单匹配 | manifest entry → boolean | 新增 |
| Command Bus → handler.execute | `execute({command, attemptNumber})` | PlatformCommand → resultSummary | 新增 |
| handler.execute → governanceAudits | `writeSystemCommandAudit(input)` | audit record (DB row) | 小改: commandType 联合 |
| handler.execute → 文件磁盘 | `file-storage.ts` 工具函数 | Node.js fs API | 新增 |
| handler.execute → WebSocket | `publishTransportEvent(...)` | RuntimeTransportEnvelope | 修改: 新 channel `user:{id}` + 新 kind |
| 客户端 → 文件上传 | `POST /api/system/file/upload` | multipart/form-data | 新增 API Route |
| 客户端 → 文件下载 | `GET /api/system/file/[fileId]/download` | binary stream | 新增 API Route |
| 客户端 → 通知查询 | `GET /api/notifications` | JSON | 新增 API Route |
| systemFiles table | Drizzle query via file-dal.ts | Drizzle query | 新增 DB 表 |
| notifications table | Drizzle query via notification-dal.ts | Drizzle query | 新增 DB 表 |

## Sources

- 项目内部代码分析 (HIGH confidence)
  - `src/features/platform-core/commands/contracts.ts` — Command Bus envelope + discriminated union 模式
  - `src/features/system-commands/facade.ts` — dispatchSystemCommand facade + governance-gate 集成
  - `src/features/system-commands/handler.ts` — system.http.request / system.config 的 authorize/execute 模式
  - `src/features/platform-core/plugin-data-access/governance-gate.ts` — schoolId 派生 + assertActionExecutable
  - `src/db/schema.ts` — pluginOwnedBusinessData, governanceAudits, platformCommands 表结构
  - `src/lib/dto/resource-ai.ts` — SystemCommandDiscriminatedSchema + PluginManifest schema
  - `src/features/runtime-platform/seams/transport/ws-envelope.ts` — ClassroomWebSocketMessageKind
  - `src/features/runtime-platform/contracts/permissions.ts` — notification:create:stub 已存在
  - `src/features/platform-core/commands/handlers/quiz-answer-received.ts` — transport publish 模式
- Web 研究 (MEDIUM confidence)
  - Next.js App Router file upload best practices — multipart/form-data via API Route or Server Action
  - In-app notification DB schema — userId + type + payload + isRead pattern with composite indexes
  - SQLite WAL mode for concurrent read/write performance

---
*Architecture research for: v4.4 system.file + system.notification integration*
*Researched: 2026-06-13*
