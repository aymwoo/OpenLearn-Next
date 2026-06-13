---
phase: 80-system-file
plan: "01"
subsystem: system.file
tags:
  - schema
  - dto
  - contracts
  - governance
depends_on: []
requirements:
  - FILE-01
  - FILE-02
  - FILE-03
  - FILE-04
  - FILE-05
  - FILE-06
  - FILE-07
  - FILE-09
tech-stack:
  added: []
  patterns:
    - Drizzle sqliteTable append-only isLatest
    - Zod strictObject + discriminatedUnion
    - PATH_PATTERN regex validation
  config: []
key-files:
  created:
    - src/lib/dto/resource-ai.file.test.ts
    - src/features/platform-core/commands/file-types.test.ts
    - drizzle/0024_phase80_plugin_files.sql
  modified:
    - src/db/schema.ts
    - src/lib/dto/resource-ai.ts
    - src/features/platform-core/commands/contracts.ts
    - src/features/runtime-platform/contracts/permissions.ts
    - drizzle/meta/_journal.json
    - src/features/platform-core/commands/system-commands.test.ts
decisions:
  - PATH_PATTERN uses negative lookahead (?!.*\.\.) to reject parent traversal while still allowing single dots in file names
  - pluginFiles migration SQL created manually (drizzle-kit generate blocked by pre-existing meta snapshot collision between 0005/0007 sharing same prevId)
  - system.file payload schemas follow same strictObject pattern as system.config schemas
  - existing system-commands.test.ts updated to reflect new type counts (21→23 types, 11→14 deny reasons)
duration_mins: 9
completed_date: 2026-06-13
one-liner: 建立 pluginFiles 表 + 扩展 manifest DTO (SystemCommandFileSchema) + 扩展 Command Bus 类型系统 (upload/delete) + 新增文件治理拒因码
---

# Phase 80 Plan 01: system.file 类型/契约/数据模型基础层 — 摘要

## 计划执行摘要

建立了 Phase 80 (system.file) 的类型/契约/数据模型基础层。创建了 pluginFiles 表，扩展了 manifest DTO schemas（SystemCommandFileSchema），扩展了 Command Bus 类型系统（PlatformCommandType + payload schemas），并添加了三项新的治理审计拒因码。

## 已完成任务

### 任务 1：创建 pluginFiles 表 (schema.ts) — 提交 `b056509`

- 在 `src/db/schema.ts` 中添加了 `pluginFiles` 表定义
- 列：id（文本主键，UUID）、schoolId（FK→schools，级联）、pluginId（FK→pluginRegistrations，级联）、operation（"upload"|"delete" 文本枚举）、sha256（可为空）、fileName、mimeType（可为空）、diskPath（可为空）、sizeBytes（可为空）、isLatest（整数布尔值，默认 true）、previousRowId（可为空）、createdAt（timestamp_ms）
- 3 项索引：pluginFiles_school_plugin_latest_idx（schoolId+pluginId+isLatest）、pluginFiles_sha256_idx（sha256）、pluginFiles_school_plugin_sha256_upload_unique（唯一，schoolId+pluginId+sha256，用于幂等上传去重）
- 迁移 SQL（0024_phase80_plugin_files.sql）手动创建——因预存在的元数据快照冲突（0005/0007 共享同一 prevId）阻止了 `drizzle-kit generate`
- 迁移 SQL 在内存 SQLite 上验证通过并成功应用于 local.db

### 任务 2：扩展 DTO schemas (resource-ai.ts) — 提交 `08dee4a` (RED) + `a7353bb` (GREEN)

- 在 SYSTEM_COMMAND_REASONS 中新增：`"SYSTEM_COMMAND_PATH_INVALID"` 和 `"SYSTEM_COMMAND_OPERATION_INVALID"`
- 新增 PATH_PATTERN 常量（`/^(?!.*\.\.)[a-zA-Z0-9_\-.\\/]+$/`）——允许字母数字、下划线、连字符、点号、斜杠，但拒绝父目录遍历
- 新增 `SystemCommandFileSchema`（z.strictObject，包含 allowedPaths、allowedOperations、可选的 maxSingleFileSize/maxTotalStorage）
- 在 `SystemCommandDiscriminatedSchema` 中新增 `system.file` 变体（带 z.literal("system.file")）
- **测试：** 16/16 通过，全部 35 项现有 resource-ai 测试仍通过

### 任务 3：扩展 Command Bus 类型和拒因码 — 提交 `36a3ef5` (RED) + `68fd604` (GREEN)

- **contracts.ts：** 在 SystemCommandTypes 中新增 `system.file.upload`、`system.file.delete`；新增 SystemFileUploadPayloadSchema 和 SystemFileDeletePayloadSchema；在 PlatformCommandPayloadSchemas 中新增对应条目；在 PlatformCommandSchema discriminatedUnion 中新增两个变体
- **permissions.ts：** 在 GovernanceDeniedReasonValues 中新增 `"path_not_allowed"`、`"operation_not_allowed"`、`"quota_exceeded"`
- **Pre-existing tests 修复：** 更新 system-commands.test.ts 中硬编码的计数测试（21→23 类型，11→14 拒因码），以及预期 SystemCommandTypes 确切值——这些是 Phase 77-79 的预存在测试，需要更新以反映新增内容
- **测试：** 14/14 新测试通过，全部 48 项现有 system-commands 测试仍通过

## 计划验证

- [x] pluginFiles 表存在于 `src/db/schema.ts` 中，与 RESEARCH.md 第 536-565 行的完整形状匹配 ✓
- [x] 迁移 SQL 已创建，pluginFiles 表成功应用于 local.db ✓
- [x] `npx drizzle-kit generate` 因预存在的元数据快照冲突被阻止——手动创建迁移 SQL 并验证
- [x] SystemCommandFileSchema 已导出，带 PATH_PATTERN 验证 ✓
- [x] SYSTEM_COMMAND_REASONS 包含 "SYSTEM_COMMAND_PATH_INVALID" 和 "SYSTEM_COMMAND_OPERATION_INVALID" ✓
- [x] SystemCommandDiscriminatedSchema 包含 system.file 变体 ✓
- [x] SystemCommandTypes 包含 "system.file.upload" 和 "system.file.delete" ✓
- [x] PlatformCommandPayloadSchemas 包含 system.file.upload 和 system.file.delete 的条目 ✓
- [x] PlatformCommandSchema discriminatedUnion 包含 system.file.upload 和 system.file.delete 变体 ✓
- [x] GovernanceDeniedReasonValues 包含 "path_not_allowed"、"operation_not_allowed"、"quota_exceeded" ✓
- [x] 修改的文件未引入 tsc 错误 ✓
- [x] 所有三项任务的新测试（16+14=30）全部通过 ✓

## 偏离计划情况

### 自动修复的问题

**1. [规则 1 — 漏洞] PATH_PATTERN 正则未拒绝父目录遍历**
- **在任务 2 期间发现：** 初始的 `/^[a-zA-Z0-9_\-.\\/]+$/` 模式允许 `..`，因为 `.` 是一个包含的字符
- **修复：** 添加了负向前瞻 `(?!.*\.\.)` 以拒绝任何位置的 `..`
- **修改文件：** src/lib/dto/resource-ai.ts
- **提交：** a7353bb（与 GREEN 阶段实现相同）

**2. [规则 3 — 阻塞问题] drizzle-kit generate 因预存在元数据快照冲突失败**
- **在任务 1 期间发现：** `drizzle-kit generate` 报错 0005_snapshot.json 和 0007_snapshot.json 指向同一父快照
- **修复：** 手动创建迁移 SQL 0024_phase80_plugin_files.sql 并更新 _journal.json（迁移 SQL 验证通过，表已成功创建）。预存在的元数据冲突未解决——这是本 Plan 范围之外的问题。
- **修改文件：** drizzle/0024_phase80_plugin_files.sql（新增），drizzle/meta/_journal.json（修改）
- **提交：** b056509（任务 1）

**3. [规则 1 — 漏洞] 预存在测试硬编码计数与新类型不匹配**
- **在任务 3 期间发现：** system-commands.test.ts 断言确切的 SystemCommandTypes 值 [system.http.request, system.config.set] 计数为 21，GovernanceDeniedReasonValues 计数为 11
- **修复：** 更新以反映新的 4 项类型和 14 项拒因码
- **修改文件：** src/features/platform-core/commands/system-commands.test.ts
- **提交：** 68fd604（任务 3 GREEN 阶段的一部分）

## 已知存根

- 无

## 威胁标志

- 无——所有修改均遵循 `<threat_model>` 中的既定 Drizzle/Zod 模式

## 已推迟项目

- `drizzle-kit generate` 因预存在元数据快照冲突（0005/0007 共享同一 prevId）被阻止。后续 Plan 将需要手动创建迁移，或应在主仓库中解决冲突。因现有迁移和生成流程不会因本次更改而回归，影响较小。

## 自检：通过

- [x] src/db/schema.ts 包含 pluginFiles 表定义
- [x] drizzle/0024_phase80_plugin_files.sql 存在
- [x] src/lib/dto/resource-ai.ts 导出 SystemCommandFileSchema
- [x] src/features/platform-core/commands/contracts.ts 包含 system.file.upload 和 .delete
- [x] src/features/runtime-platform/contracts/permissions.ts 包含 3 项新拒因码
- [x] 所有 6 项提交均存在于 git 日志中
