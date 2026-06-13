# Phase 80: system.file 文件存储代理 - Context

**Gathered:** 2026-06-13
**Status:** Ready for planning

## Phase Boundary

插件可通过 `system.file.*` 命令安全地进行文件存储与管理。文件以 SHA-256 内容寻址存储于本地文件系统（Binary Bypass：二进制数据走 API Route，元数据走 Command Bus），插件+学校双重前缀隔离，全链路治理审计。

**Requirements:** FILE-01, FILE-02, FILE-03, FILE-04, FILE-05, FILE-06, FILE-07, FILE-08, FILE-09（详见 REQUIREMENTS.md）

**In scope:**
- 文件上传（multipart/form-data → API Route → 内容寻址存储 → 元数据入 Command Bus）
- 文件下载（独立 API Route 流式返回，支持 Range 请求）
- 文件删除（软删除 isLatest=false）、文件列表（前缀过滤 + 分页）、文件元数据查询
- manifest `systemCommands.system.file` 声明白名单（allowedPaths + allowedOperations）
- 路径穿越防护（URL 编码变体、null byte、parent reference）
- 文件配额：单文件 50MB + 每插件每校总容量上限
- {schoolId}/{pluginKey} 双重前缀物理隔离
- 复用 v4.3 三段式链路：manifest 声明 → governance gate → audit

**Out of scope (this phase):**
- S3/R2 兼容存储后端 — 当前仅本地文件系统（deferred: FILE-N02）
- 文件移动/复制（move/copy）— 通过 upload+delete 组合替代（deferred: FILE-N01）
- 插件间文件共享 — 严格插件隔离（deferred: FILE-N03）
- 文件公开分享/外链
- 文件恢复 API（restore）

## Implementation Decisions

### 上传接口形式
- **D-01:** 文件上传使用 `multipart/form-data`，支持流式传输，适合 50MB 大文件
- **D-02:** 上传 API Route 路径为 `/api/system/file/upload`，通过 Auth.js session 认证
- **D-03:** 上传时插件在 FormData 中附带 `fileName` 字段，服务端从 fileName 提取扩展名用于 `{sha256}.{ext}` 存储路径，原始文件名存入元数据表
- **D-04:** SHA-256 幂等：相同内容（同插件同校）重复上传时，不重复写磁盘，直接返回已有 fileId 和元数据

### 存储根目录配置
- **D-05:** 文件存储根目录通过环境变量 `FILE_STORAGE_ROOT` 配置，默认值 `data/files/`
- **D-06:** 目录结构不分桶，直接 `{schoolId}/{pluginKey}/{sha256}.{ext}`。SHA-256 天然均匀分布，无单目录热点问题
- **D-07:** 目录首次写入时懒创建（`mkdir recursive`），不需要启动预检查

### 删除与 GC 策略
- **D-08:** GC 由手动脚本触发（`scripts/gc-files.ts`），不使用 BullMQ 定时任务
- **D-09:** 软删除：`system.file.delete` 标记 `isLatest=false`，单文件删除。物理清除由 GC 脚本执行
- **D-10:** GC 脚本输出统计信息（删除数量、释放空间），不写 governanceAudit（运维操作非插件操作）
- **D-11:** 暂不提供文件恢复 API。GC 执行前可由运维手动恢复（操作 DB）

### 配额超限处理
- **D-12:** 超限返回结构化错误：单文件超限 HTTP 413，总容量超限 HTTP 507，body 含当前用量、配额上限、超出量
- **D-13:** 配额查询通过 `system.file.metadata` 返回（总文件数、总字节数、配额上限），插件上传前可自查
- **D-14:** 配额默认值硬编码（单文件 50MB、总计 500MB/插件/校），可通过环境变量 `FILE_QUOTA_MAX_SINGLE` / `FILE_QUOTA_TOTAL_PER_PLUGIN` 覆盖
- **D-15:** 配额流式检查：接收上传流时累计字节数，超限立即中断流并清理已写入部分

### Claude's Discretion
- API Route 内部调用 `dispatchSystemCommand` 的具体适配方式
- 流式 SHA-256 计算的实现细节（crypto.createHash 管道）
- Range 请求解析策略（单 range，HTTP 206）
- List 分页方式（cursor-based，对齐现有模式）
- 路径穿越防护的具体实现（复用 Phase 78 SSRF 防护层的 IP/域名校验模式进行路径规范化）
- manifest `SystemCommandFileSchema` 的具体 shape（allowedPaths + allowedOperations 字段）
- 新增 deny reason 码（如 `path_not_allowed`, `operation_not_allowed`, `quota_exceeded` 等）

## Canonical References

**下游 agent 必须在规划或实现前阅读以下文件。**

### Phase 80 直接上下文
- `.planning/ROADMAP.md` — Phase 80 goal + 9 success criteria（逐条对应 FILE-01~09）
- `.planning/REQUIREMENTS.md` — FILE-01 至 FILE-09 完整需求定义

### v4.3 基础设施（Phase 80 的直接依赖）
- `src/features/system-commands/facade.ts` — `dispatchSystemCommand` 三段式入口（治理门 → 判别派发 → 结果返回），Phase 80 需要在此新增 system.file.* 分支
- `src/features/system-commands/handler.ts` — `system.http.request` + `system.config` 的 authorize/execute 实现，Phase 80 的 handler 模式参考
- `src/features/platform-core/commands/registry.ts` — `platformCommandRegistry`，Phase 80 需要注册新的 commandType
- `src/features/platform-core/commands/contracts.ts` — `PlatformCommandType`、`PlatformCommandDefinition`、`SystemCommandTypes`，需要扩展
- `src/lib/dto/resource-ai.ts` — `PluginManifestSchema`、`SystemCommandDiscriminatedSchema`（§854、§845），需要新增 `system.file` variant
- `src/features/runtime-platform/contracts/permissions.ts` — `GovernanceDeniedReasonValues`，需要新增文件相关拒因码

### 安全模式参考
- `src/features/system-commands/handler.ts` §78-96 — `matchDomain` 模式（白名单匹配），文件路径匹配可参考此结构
- Phase 78 SSRF 防护层：DNS pinning + HTTPS-only + 内网 IP 检测 + redirect 链重校验 — 路径穿越防护可复用此多层校验模式

## Existing Code Insights

### Reusable Assets
- **`dispatchSystemCommand` facade** (`src/features/system-commands/facade.ts`): Phase 80 的 `system.file.upload`（元数据部分）、`system.file.delete` 通过此 facade 派发。`system.file.download`/`system.file.list`/`system.file.metadata` 类似 `system.config.get` 走纯 DAL 读
- **`assertActionExecutable`**: 治理门已泛化 verb，`commandType` 作为 verb 传入，schoolId 自动注入
- **`writeSystemCommandAudit`**: 全链路审计写入，Phase 80 所有操作复用
- **`platformCommandRegistry`**: 新增 `system.file.upload`、`system.file.delete` 等 commandType 注册
- **`buildSystemCommandId` / `buildSystemCommandDedupeKey`**: 命令 ID 和去重 key 构造助手

### Established Patterns
- **Command Bus authorize/execute**: 每个 commandType 实现 `authorize(input: {command})` + `execute(input: {command, attemptNumber})`，authorize 中解析 manifest 并校验白名单
- **Discriminated union manifest**: `SystemCommandDiscriminatedSchema` 使用 `z.discriminatedUnion("command")`，Phase 80 新增 `system.file` variant
- **Append-only (isLatest)**: 文件删除复用 `taskSubmissions`/`quizAttempts` 的 append-only 模式
- **Binary Bypass**: upload API Route 接收文件流、计算 SHA-256、写磁盘，然后调用 Command Bus 写入元数据（类似 `system.http.request` 的 API Route → 内部调 Command Bus 模式）
- **纯 DAL 读**: download/list/metadata 不走 Command Bus，类似 `system.config.get`

### Integration Points
- **`src/lib/dto/resource-ai.ts`**: 新增 `SystemCommandFileSchema`（allowedPaths + allowedOperations），加入 `SystemCommandDiscriminatedSchema`
- **`src/features/system-commands/handler.ts`**: 新增 file handler（authorize + execute）
- **`src/features/system-commands/facade.ts`**: `dispatchSystemCommand` 新增 `system.file.*` 分支
- **`src/features/platform-core/commands/registry.ts`**: 注册新的 commandType
- **`src/features/runtime-platform/contracts/permissions.ts`**: 新增 file 相关 deny reason
- **`src/app/api/system/file/`**: 新增 API Route（upload + download）
- **`src/db/schema.ts`**: 新增 `pluginFiles` 表

## Specific Ideas

- upload API Route 接收 multipart 后流式计算 SHA-256，不将整个文件加载到内存
- download API Route 使用 `fs.createReadStream` + `pipe` 到 Response，原生支持背压
- 流式配额检查：在 pipe 中插入 Transform stream 累计字节数

## Deferred Ideas

None — 讨论一直保持在 Phase 80 范围内。

---

*Phase: 80-system.file 文件存储代理*
*Context gathered: 2026-06-13*
