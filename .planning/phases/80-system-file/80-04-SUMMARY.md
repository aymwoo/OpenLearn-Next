---
phase: 80-system-file
plan: 04
subsystem: api
tags: [system.file, multipart-upload, streaming-download, range-request, content-addressed-storage, sha256, command-bus]

# Dependency graph
requires:
  - phase: 80-01
    provides: 文件表 schema、DAL 层（getFileBySha256/getFileRecord/listFiles/getFileMetadata/softDeleteFile）
  - phase: 80-02
    provides: 路径防护（sanitizeFilePath）、存储路径（buildStoragePath/resolveStoragePath）、配额检查（QuotaTransform）、MIME 回退（getMimeType）
  - phase: 80-03
    provides: Command Bus facade dispatchSystemCommand（system.file.upload/delete 分支）、handler authorize/execute
provides:
  - POST /api/system/file/upload — multipart 流式上传，SHA-256 幂等，QuotaTransform 配额检查，Binary Bypass 元数据入 Command Bus
  - GET /api/system/file/download — 流式下载，RFC 7233 Range 支持（HTTP 206），schoolId+pluginId 双重隔离
  - POST /api/system/file/delete — 通过 facade Command Bus 软删除（isLatest=false）
  - GET /api/system/file/list — cursor-based 分页 + prefix 前缀过滤
  - GET /api/system/file/metadata — 完整文件元数据 + 配额信息（总文件数/字节数/上限）
affects: [80-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Binary Bypass: 二进制数据通过 API Route 流式处理（node:stream）绕过 Command Bus，仅元数据入 Bus"
    - "API Route 认证：auth() 从 Auth.js session 获取 actorId，x-plugin-key 头传递插件标识"
    - "流式处理：crypto.createHash + QuotaTransform + fs.createWriteStream + stream.pipeline 管道"
    - "TDD 模式：先写失败测试（vitest mock），再实现，最后重构"

key-files:
  created:
    - src/app/api/system/file/upload/route.ts
    - src/app/api/system/file/download/route.ts
    - src/app/api/system/file/delete/route.ts
    - src/app/api/system/file/list/route.ts
    - src/app/api/system/file/metadata/route.ts
    - src/app/api/system/file/file-api.test.ts
  modified: []

key-decisions:
  - "上传流使用 Node.js 内置 crypto.createHash + Transform stream 管道，不引入第三方包"
  - "认证模式：API Route 直接调用 auth() 获取 session.user.id 作为 actorId"
  - "schoolId 派生：通过 getCurrentUserSchoolIds() 获取用户所属学校列表，取首个"
  - "pluginKey 通过 x-plugin-key 请求头传递，不在 URL 参数中暴露"
  - "临时文件使用 fs.mkdir(_tmp) + createWriteStream({ flags: 'wx' }) 防并发竞态"

patterns-established:
  - "API Route 错误响应：结构化 { error, message } + 标准 HTTP 状态码（401/400/403/404/409/413/507/500）"
  - "流式 Response：Node.js Readable.toWeb() 转换 + Content-Disposition/Cache-Control 安全头"
  - "cursor-based 分页：listFiles DAL 返回 { files, nextCursor }，API 透传"

requirements-completed: [FILE-01, FILE-02, FILE-03, FILE-04, FILE-05, FILE-06, FILE-08, FILE-09]

# Metrics
duration: ~4min
completed: 2026-06-13
---

# Phase 80 Plan 04: API Routes Summary

**5 个 system.file API Route 与 Binary Bypass 上传管道：流式 multipart 上传 + SHA-256 幂等 + Range 下载 + Command Bus 软删除 + cursor 分页列表 + 元数据+配额查询**

## Performance

- **Duration:** ~4min
- **Started:** 2026-06-13T07:54:50Z
- **Completed:** 2026-06-13T07:58:38Z
- **Tasks:** 3
- **Files modified:** 6 (all new)

## Accomplishments

- POST /api/system/file/upload：multipart 流式上传，SHA-256 计算 + QuotaTransform（默认50MB）+ 磁盘写入 + 元数据经 Command Bus
- GET /api/system/file/download：fs.createReadStream 流式返回，RFC 7233 Range 支持（HTTP 206 + suffix range）
- POST /api/system/file/delete：通过 dispatchSystemCommand facade 软删除
- GET /api/system/file/list：cursor-based 分页 + 文件名前缀过滤
- GET /api/system/file/metadata：完整元数据 + 插件配额聚合（总文件数/字节数/上限）
- 所有路由：Auth.js session 认证、schoolId+pluginId 双重隔离、路径穿越防护、11 个 vitest 全部通过

## Task Commits

Each task was committed atomically:

1. **Task 1: upload API Route** - `02b0f5c` (feat)
2. **Task 2: download API Route** - `1d49a4e` (feat)
3. **Task 3: delete + list + metadata API Routes (TDD)** - `926a2a7` (test) / `26005e2` (feat) / `8070358` (refactor)

Additional fix: `73b10a1` — 修复测试 mock null 类型断言

## Files Created/Modified

- `src/app/api/system/file/upload/route.ts` — multipart 流式上传，SHA-256 + QuotaTransform + 磁盘写入 + Command Bus 元数据
- `src/app/api/system/file/download/route.ts` — 流式下载，Range 请求解析（RFC 7233），HTTP 206 支持
- `src/app/api/system/file/delete/route.ts` — facade 软删除，dispatchSystemCommand("system.file.delete")
- `src/app/api/system/file/list/route.ts` — cursor 分页列表 + 前缀过滤
- `src/app/api/system/file/metadata/route.ts` — 文件元数据 + 配额聚合查询
- `src/app/api/system/file/file-api.test.ts` — 11 个 vitest 测试覆盖 delete/list/metadata

## Decisions Made

- 认证通过 `auth()` 直接获取 session，而非中间件代理（与现有 DAL 层一致）
- schoolId 通过 `getCurrentUserSchoolIds()` 派生，取用户首个学校（与现有模式一致）
- pluginKey 使用 `x-plugin-key` HTTP 头传递，保持 URL 清洁
- 上传临时文件存储在 `FILE_STORAGE_ROOT/_tmp/` 目录，使用 `flags: "wx"` 防止并发写入

## Deviations from Plan

None — plan executed exactly as written. 所有实现完全对齐 PATTERNS.md 第 420-581 行的代码模式、RESEARCH.md 第 406-528 行的实现细节和 CONTEXT.md 的 D-01~D-15 锁定决策。

## Issues Encountered

- 测试 mock 返回 null 时的 TypeScript 类型推断问题：通过 `null as any` 类型断言修复
- metadata route 初始导入未使用的 `count`/`sum` drizzle-orm 函数：refactor 阶段修复

## Next Phase Readiness

- 5 个 API Route 全部实现并通过 tsc 类型检查和 vitest 测试（11/11 PASS）
- 所有路由遵循 Binary Bypass 架构：二进制数据走 API Route，元数据走 Command Bus
- schoolId+pluginId 双重隔离已在前置 Plan 的 DAL 层实施，API Route 层正确透传
- 准备进入 Phase 80 的验证/测试阶段

---
*Phase: 80-system-file*
*Completed: 2026-06-13*
