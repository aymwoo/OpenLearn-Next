---
phase: 80-system-file
plan: 02
type: execute
wave: 2
subsystem: system.file
tags: [dal, file-storage, path-guard, quota, mime]

requires: [80-01]
provides: [pluginFiles DAL CRUD, path sanitization, storage path builder, stream quota check, MIME fallback]
affects: ["80-03", "80-04"]

one-liner: "文件存储 DAL 层（6 函数 + schoolId/pluginId 双重隔离）+ 工具库（四层路径穿越防护、存储路径构建、流式配额检查、MIME 回退）"

tech-stack:
  added: []
  patterns: ["Drizzle ORM query/mutate", "server-only DAL", "node:stream Transform", "node:path resolve", "append-only isLatest pattern", "cursor-based pagination"]

key-files:
  created:
    - src/lib/dal/files.ts
    - src/lib/dal/files.test.ts
    - src/features/system-commands/file-path-guard.ts
    - src/features/system-commands/file-path-guard.test.ts
    - src/lib/file-storage/storage-path.ts
    - src/lib/file-storage/storage-path.test.ts
    - src/lib/file-storage/quota-check.ts
    - src/lib/file-storage/quota-check.test.ts
    - src/lib/file-storage/mime-fallback.ts
    - src/lib/file-storage/mime-fallback.test.ts
  modified: []
  deleted: []

decisions: []
metrics:
  duration: ""
  completed_date: ""
---

# Phase 80 Plan 02: 文件存储 DAL + 工具库 总结

**一语句：** 创建了 pluginFiles 表的完整 DAL 层（含 6 个导出函数，强制 schoolId+pluginId 双重隔离）和 4 个工具模块（路径穿越防护、存储路径构建、流式配额检查、MIME 类型回退）。

## 完成内容

### Task 1: 文件 DAL 层 (src/lib/dal/files.ts)

**提供能力：** pluginFiles 表的完整 CRUD 操作

| 函数 | 功能 |
|------|------|
| `getFileBySha256(schoolId, pluginId, sha256)` | 幂等查询：WHERE schoolId+pluginId+sha256+isLatest=true+operation="upload" |
| `insertFileRecord({...})` | 插入新上传记录，operation="upload"，isLatest=true |
| `getFileRecord(schoolId, pluginId, fileId)` | 按 fileId 查询，强制 schoolId+pluginId+isLatest 过滤 |
| `listFiles({ schoolId, pluginId, prefix, limit })` | cursor-based 分页，支持 fileName 前缀过滤（JavaScript 层），limit+1 检测 hasMore |
| `getFileMetadata(schoolId, pluginId, fileId)` | 返回完整元数据（sizeBytes/sha256/mimeType/createdAt） |
| `softDeleteFile(schoolId, pluginId, fileId)` | 事务内：UPDATE isLatest=false + INSERT operation="delete" 行 |

**双重隔离：** 所有查询的 where 子句强制包含 `and(eq(schoolId), eq(pluginId))`。

**测试覆盖：** 12 个 vitest 测试（schoolId+pluginId 双重隔离、cursor-based 分页、soft delete 事务原子性）。

### Task 2: 路径穿越防护 + 存储路径工具

**file-path-guard.ts：** `sanitizeFilePath(rawPath)` — 四层防护管线：
1. 双重 `decodeURIComponent`（捕获 `%2e%2e%2f` 和 `%252f` 变体）
2. Null byte 拒绝
3. Parent reference（`..`）拒绝
4. `path.resolve` + 前缀验证（确保路径在 `ABSOLUTE_STORAGE_ROOT` 内）

**storage-path.ts：** 两个函数：
- `buildStoragePath(schoolId, pluginKey, sha256, extension)` → `{FILE_STORAGE_ROOT}/{schoolId}/{pluginKey}/{sha256}.{ext}`
- `resolveStoragePath(relativePath)` → 将相对 diskPath 解析为绝对文件系统路径

**测试覆盖：** 11 个 vitest 测试（path traversal 攻击向量、存储路径格式验证）。

### Task 3: 配额检查 + MIME 回退工具

**quota-check.ts：** `QuotaTransform`（extends `stream.Transform`）：
- `_transform` 累计 bytesWritten，超限时 callback(error("QUOTA_EXCEEDED:label"))
- 支持自定义 label（默认 "file_upload"）

**mime-fallback.ts：** `getMimeType(fileName, dbMimeType?)`：
- DB MIME 优先 → 扩展名查找（17 种常见映射）→ `application/octet-stream`

**测试覆盖：** 12 个 vitest 测试（配额超限、累计字节、MIME 优先级、未知扩展名回退）。

## 验证结果

| 检查项 | 状态 |
|--------|------|
| `npx tsc --noEmit` 所有 5 个新文件 | 零错误 |
| 35 个 vitest 测试 | 全部通过 |
| schoolId+pluginId 双重隔离 | 测试验证通过 |
| 路径穿越防护（%2e%2e%2f、%252e%252e%252f、\x00、..、../） | 全部返回 null |
| stream.Transform 配额超限中断 | error("QUOTA_EXCEEDED:label") 正确触发 |

## 偏差说明

无 — 计划完全按预期执行。每个 TDD 任务：RED（测试失败）→ GREEN（实现通过）→ 提交。

## 威胁覆盖

| Threat ID | 组件 | 状态 |
|-----------|------|------|
| T-80-05 | sanitizeFilePath 四层防护 | 已实现 |
| T-80-06 | DAL 双重隔离 | 已实现（所有查询强制 schoolId+pluginId） |
| T-80-07 | QuotaTransform 流中断 | 已实现 |
| T-80-08 | diskPath 相对路径存储 | 已实现（resolveStoragePath 在 root 下解析） |
| T-80-09 | softDeleteFile 事务 | 已实现（Drizzle transaction） |
| T-80-SC | 零新依赖 | 已满足（仅 Node.js 内置模块） |

## 提交记录

| 提交 | 类型 | 描述 |
|------|------|------|
| `7beb7ef` | test | RED: files.test.ts 失败测试 |
| `f46ca28` | feat | GREEN: files.ts DAL 完整实现 |
| `b38e8ce` | test | RED: file-path-guard + storage-path 失败测试 |
| `8efceb4` | feat | GREEN: sanitizeFilePath + storage path builder 实现 |
| `f439c6b` | test | RED: quota-check + mime-fallback 失败测试 |
| `05b37c2` | feat | GREEN: QuotaTransform + getMimeType 实现 |

## Self-Check: PASSED

- [x] `src/lib/dal/files.ts` 存在 — 导出 6 个函数
- [x] `src/features/system-commands/file-path-guard.ts` 存在 — 导出 `sanitizeFilePath`
- [x] `src/lib/file-storage/storage-path.ts` 存在 — 导出 `buildStoragePath` 和 `resolveStoragePath`
- [x] `src/lib/file-storage/quota-check.ts` 存在 — 导出 `QuotaTransform`
- [x] `src/lib/file-storage/mime-fallback.ts` 存在 — 导出 `getMimeType`
- [x] `npx tsc --noEmit` 零错误
- [x] 35/35 vitest 测试通过
- [x] 所有 6 次提交已记录
