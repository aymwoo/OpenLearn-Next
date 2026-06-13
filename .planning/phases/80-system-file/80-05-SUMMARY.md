---
phase: 80-system-file
plan: 05
subsystem: infra
tags: [gc, node:fs, drizzle, sqlite, cleanup]

# Dependency graph
requires:
  - phase: 80-01
    provides: pluginFiles 表（schema），Command Bus 类型系统，拒因码
  - phase: 80-02
    provides: resolveStoragePath 工具函数，文件存储路径解析
provides:
  - 垃圾回收脚本 scripts/gc-files.ts：扫描 isLatest=false 的 upload 行，物理删除磁盘文件，输出统计信息
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 独立 Node.js CLI 脚本模式（scripts/ 目录，tsx 运行，@/ 路径别名）

key-files:
  created:
    - scripts/gc-files.ts
  modified: []

key-decisions:
  - "使用 node:fs 内置模块（existsSync/statSync/unlinkSync），零新依赖"
  - "仅删除 operation='upload' 且 isLatest=false 的行——delete 操作 diskPath 为 null，无需清理"
  - "不写 governanceAudit（D-10：运维操作非插件操作）"
  - "支持 --dry-run 标志，运维可先预览后执行"

patterns-established:
  - "独立脚本模式：import \"@/db\" 和 \"@/db/schema\" 使用 tsconfig paths，通过 npx tsx 运行"

requirements-completed: [FILE-03]

# Metrics
duration: 16min
completed: 2026-06-13
---

# Phase 80 Plan 05: GC 垃圾回收脚本 Summary

**创建 scripts/gc-files.ts——扫描软删除（isLatest=false）上传行，物理删除磁盘文件，输出人类可读统计信息，支持 --dry-run，零新依赖**

## Performance

- **Duration:** 16 min
- **Started:** 2026-06-13T08:07:22Z
- **Completed:** 2026-06-13T08:23:29Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- scripts/gc-files.ts 创建完成，可通过 `npx tsx scripts/gc-files.ts` 直接运行
- 查询 pluginFiles WHERE operation="upload" AND isLatest=false，获取所有待回收行
- 使用 node:fs 内置模块（existsSync/statSync/unlinkSync）检查和删除物理文件
- 输出统计信息：Scanned（扫描行数）、Deleted（已删除文件数）、Freed（释放字节数，人类可读格式）
- 支持 --dry-run 标志——仅打印将要删除的内容，不实际执行 unlink
- 不写入 governanceAudit 表（对齐 D-10 决策：GC 是运维操作，非插件操作）
- `npx tsc --noEmit` 零错误通过

## Task Commits

Each task was committed atomically:

1. **Task 1: 创建 GC 垃圾回收脚本 (scripts/gc-files.ts)** - `dbe7e7d` (feat)

## Files Created/Modified
- `scripts/gc-files.ts` - GC 垃圾回收脚本：扫描 pluginFiles 中 operation="upload" 且 isLatest=false 的行，检查物理文件是否存在，若存在则 unlink，输出 Scanned/Deleted/Freed 统计信息，支持 --dry-run，不写 governanceAudit

## Decisions Made
None - followed plan as specified. 所有设计决策已在 Plan 前端（CONTEXT.md D-08/D-09/D-10）和威胁模型（T-80-22/23/24）中预先确定。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Drizzle .all() 返回 Promise，需 await**
- **Found during:** Task 1
- **Issue:** `db.select().from().where().all() as DeletableRow[]` 类型错误——`.all()` 返回 `Promise<T>`，不能直接 cast 为数组
- **Fix:** 将表达式包装为 `(await db.select()...).from().where(...))` 
- **Files modified:** scripts/gc-files.ts
- **Verification:** `npx tsc --noEmit` 重新通过
- **Committed in:** dbe7e7d (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** 类型系统修正，zero scope creep。

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 80 全部 5 个 plans 已完成
- system.file 子系统的命令实现（80-03）+ API Routes（80-04）+ GC 脚本（80-05）均已就绪
- 可进入 Phase 81（system.notification 应用内通知推送）

---
*Phase: 80-system-file*
*Plan: 05*
*Completed: 2026-06-13*
