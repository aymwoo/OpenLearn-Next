---
status: partial
phase: 80-system-file
source: [80-VERIFICATION.md]
started: 2026-06-13T03:30:00Z
updated: 2026-06-13T03:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. 完整上传流程
expected: POST /api/system/file/upload 接收 multipart → SHA-256 计算 → 磁盘写入 → 元数据入 pluginFiles 表 → 返回 fileId
result: [pending]

### 2. 相同内容幂等上传
expected: 相同文件内容上传两次 → 第二次不重写磁盘 → 返回相同 fileId 和元数据
result: [pending]

### 3. 流式下载 + HTTP 206 Range
expected: GET /api/system/file/download 支持 bytes=N-M 和 bytes=-N → 返回 206 Partial Content + Content-Range 头
result: [pending]

### 4. 配额超限行为
expected: 上传超 50MB 单文件 → HTTP 413；超总容量 → HTTP 507 → body 含当前用量/配额/超出量
result: [pending]

### 5. 路径穿越防护
expected: 含 ../ 或 URL 编码变体的路径 → sanitizeFilePath 拒绝 → 400/403
result: [pending]

### 6. GC 垃圾回收脚本
expected: `npx tsx scripts/gc-files.ts --dry-run` 预览软删除文件 → `npx tsx scripts/gc-files.ts` 实际删除 → 输出统计信息
result: [pending]

### 7. 跨插件隔离
expected: 插件 A 上传的文件 → 插件 B 尝试下载 → 404 拒绝
result: [pending]

### 8. 未认证请求被拒
expected: 无 session cookie 的请求 → 所有 API Route → 401 Unauthorized
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps
