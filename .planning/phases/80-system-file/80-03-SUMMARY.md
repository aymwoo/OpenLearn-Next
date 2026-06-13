---
phase: 80-system-file
plan: 03
subsystem: system-commands
tags: [system-commands, command-bus, file-storage, plugin-governance, manifest, audit]

# Dependency graph
requires:
  - phase: 80-01
    provides: "pluginFiles schema + DAL (insertFileRecord, softDeleteFile, getFileMetadata)"
  - phase: 80-02
    provides: "PlatformCommandPayloadSchemas (system.file.upload/delete) + platformCommandRegistry patterns"
provides:
  - "systemFileHandler with authorize + execute for upload/delete via Command Bus"
  - "platformCommandRegistry entries for system.file.upload and system.file.delete"
  - "dispatchSystemCommand facade branches for system.file.upload and system.file.delete"
  - "Audit commandType union extended to system.file.upload and system.file.delete"
affects: [80-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "manifest re-parse + first-match-wins for file paths (mirror of system.config pattern)"
    - "denySystemFile: audit-before-throw for file operations (mirror of denySystemConfig)"
    - "Binary Bypass invariant: upload only metadata through Command Bus"
    - "buildFileCommandDedupeKey: fileId-based dedup for system.file commands"

key-files:
  modified:
    - "src/features/system-commands/handler.ts"
    - "src/features/platform-core/commands/registry.ts"
    - "src/features/system-commands/facade.ts"
    - "src/features/system-commands/audit.ts"
    - "src/features/system-commands/handler.test.ts"

key-decisions:
  - "diskPath as authorization path: SystemFileUploadPayloadSchema has no filePath field, so diskPath serves as the logical file path for manifest matching"
  - "Generic buildFileCommandDedupeKey helper: accepts any key string (fileId/sha256) rather than modifying existing buildSystemCommandDedupeKey"
  - "Delete authorize simplified: checks only allowedOperations for 'delete' (not required to match allowedPaths since fileId is sufficient)"
  - "manifest.json re-parsed on every authorize request (same pattern as system.config): ensures manifest updates take effect immediately"

patterns-established:
  - "systemFileHandler architecture: mirror of systemConfigHandler with resolveSystemFileManifestEntry, matchFilePath, denySystemFile"
  - "First-match-wins for file authorization: iterate manifest entries, first entry with both matching path prefix and operation → authorized"
  - "Path prefix matching: pattern ending in '/' does startsWith matching, otherwise exact match"

requirements-completed: [FILE-01, FILE-03, FILE-07]

# Metrics
duration: 20min
completed: 2026-06-13
---

# Phase 80 Plan 03: system.file Command Bus 集成 — handler + registry + facade + audit 全链路

**将 system.file 命令接入 v4.3 Command Bus 三段式链路：handler authorize/execute + registry 注册 + facade 派发 + audit 扩展**

## Performance

- **Duration:** 约 20 min
- **Tasks:** 3
- **Files modified:** 5
- **Commits:** 5 (RED + GREEN + 2 task + 1 fix)

## Accomplishments

- handler.ts 中新增 systemFileHandler（system.file.upload 和 system.file.delete 的 authorize + execute），遵循 manifest re-parse + first-match-wins 模式的 authorized/manifest 白名单校验
- platformCommandRegistry 中注册 system.file.upload 和 system.file.delete 两个 commandType，带 payload schema + dedupe + 治理门
- dispatchSystemCommand facade 新增 system.file.upload（元数据 only，Binary Bypass）和 system.file.delete 分支
- audit.ts commandType union 扩展为包含 system.file.upload 和 system.file.delete
- 所有 deny 路径在 throw PlatformCommandExecutionError 前先调用 writeSystemCommandAudit（audit-before-throw）
- 37 个测试全部通过（新增 11 个 systemFileHandler 测试 + 原有 26 个测试无回归）

## Task Commits

1. **Task 1 (RED):** `27a9f10` test(80-system.file-03): add failing tests for systemFileHandler authorize + execute
2. **Task 1 (GREEN):** `bd69742` feat(80-system.file-03): implement systemFileHandler — authorize + execute for upload/delete
3. **Task 2:** `c508ddc` feat(80-system.file-03): register system.file commands + extend audit commandType union
4. **Task 3:** `d271441` feat(80-system.file-03): extend dispatchSystemCommand facade with system.file branches
5. **Fix:** `d86d59f` fix(80-system.file-03): use diskPath for authorize matching instead of nonexistent filePath

## Files Created/Modified

- `src/features/system-commands/handler.ts` — 新增 systemFileHandler（imports, types, matchFilePath, resolveSystemFileManifestEntry, denySystemFile, authorize/execute for upload+delete, export）
- `src/features/platform-core/commands/registry.ts` — 新增 systemFileHandler import + system.file.upload 和 system.file.delete 注册项
- `src/features/system-commands/facade.ts` — 新增 fileId/fileMeta 输入参数 + system.file.upload/delete 派发分支 + buildFileCommandDedupeKey helper
- `src/features/system-commands/audit.ts` — commandType union 扩展为包含 system.file.upload 和 system.file.delete
- `src/features/system-commands/handler.test.ts` — 新增 11 个 systemFileHandler 测试（authorize: upload/delete 的 pass/deny 路径；execute: insert/soft-delete 的 success 路径）

## Decisions Made

- **diskPath 用作授权路径**：SystemFileUploadPayloadSchema 中无 filePath 字段，因此使用 diskPath 作为 manifest 匹配的逻辑路径（Rule 1 修复）
- **buildFileCommandDedupeKey 独立 helper**：新建独立 helper 接受 generic key 参数而非修改现有 buildSystemCommandDedupeKey，避免影响已有功能
- **Delete authorize 简化检查**：仅检查 allowedOperations 中是否包含 "delete"（无需检查 allowedPaths，因为 fileId 即可定位文件）

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] filePath 字段不存在于 SystemFileUploadPayloadSchema**
- **Found during:** Task 3 之后的整体类型检查（tsc --noEmit）
- **Issue:** handler.ts 中 `sysCmd.payload.filePath` 引用不存在的字段——SystemFileUploadPayloadSchema 定义的是 diskPath 而非 filePath
- **Fix:** 将 authorize 函数中的 `filePath` 改为 `diskPath`，同步更新测试中的参数
- **Files modified:** handler.ts, handler.test.ts
- **Verification:** tsc --noEmit 零错误，37 个测试全部通过
- **Committed in:** d86d59f

---

**Total deviations:** 1 auto-fixed (Rule 1 Bug)
**Impact on plan:** 修复是类型正确性必需——不影响语义，diskPath 天然适合作为授权匹配路径。

## Issues Encountered

- worktree 环境中 vitest 命令无法直接调用——通过 `pnpm install` + `node ./node_modules/vitest/vitest.mjs run` 直接引用 mjs 入口文件解决
- worktree 中文件路径不匹配——所有 Edit/Write 操作须使用 `~/.claude/worktrees/agent-a64b2c847dc21c19c/` 前缀路径

## Next Phase Readiness

- system.file 的三段式 Command Bus 链路已完成：governance gate → manifest authorize → execute（DAL 写）+ audit
- registry.ts 的 satisfies 约束通过——新增的 system.file.upload/delete 类型已在 PlatformCommandType union 中匹配
- 为 Plan 80-04（API Route 实现——upload/download 的 HTTP bridge）做好了准备：Command Bus 的元数据通道已贯通

---
*Phase: 80-system-file*
*Completed: 2026-06-13*
