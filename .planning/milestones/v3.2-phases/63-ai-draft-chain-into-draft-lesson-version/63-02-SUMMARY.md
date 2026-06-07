---
phase: 63-ai-draft-chain-into-draft-lesson-version
plan: 02
subsystem: lesson-authoring-dal
tags: [dal, draft, snapshot, provenance, isolation]
requires: [draftLessonVersions 表 (63-01)]
provides: [persistDraftLessonVersion DAL 写入函数]
affects: [Plan 04 命令 handler (调用方)]
tech-stack:
  added: []
  patterns: [max(version)+1 单写入, 内联 snapshotJson 单表原子 INSERT, server-only DAL 边界]
key-files:
  created:
    - src/lib/dal/lesson-authoring.draft-persist.test.ts
  modified:
    - src/lib/dal/lesson-authoring.ts
decisions:
  - "snapshotJson 以对象 { steps } 写入（schema text json mode），与 publishLesson 范式一致，非手动 JSON.stringify"
  - "运行时写隔离断言改用 getTableName 按表名（字符串）比较，规避 vi.resetModules 导致的跨模块对象引用不等"
metrics:
  duration: ~15m
  completed: 2026-05-31
---

# Phase 63 Plan 02: persistDraftLessonVersion DAL 写函数 Summary

在 DAL 新增 `persistDraftLessonVersion`，把整课 AI 草稿 steps 以内联 `snapshotJson` 单条原子 INSERT 写入 `draftLessonVersions`（version=max+1、source='ai'、落库 sourceCommandId/createdById provenance），并以双隔离测试结构性证明绝不触碰 live `lessons`/`lessonSteps` 与学生读路径。

## What Was Built

- **`persistDraftLessonVersion(input)`**（lesson-authoring.ts:1456-1497）：
  - 取下一 version：`select coalesce(max(version),0)` where lessonId → +1（无既存从 1 起，仿 publishLesson:1398-1402）。
  - 单条 `insert(draftLessonVersions).values({...}).returning()`，`source` 硬编码 `"ai"`，`snapshotJson: { steps }` 内联整课快照。
  - 返回 `{ draftVersionId, version, stepCount }` 供 handler 构造事件 payload。
  - 新增 `draftLessonVersions` 到 `@/db/schema` 导入。
- **测试**（lesson-authoring.draft-persist.test.ts，6 用例全绿）：功能 Test 1-3（写入/版本递增/返回三元组）+ 隔离 A 运行时（唯一 insert 落 draftLessonVersion、live 表零写、update 零调用）+ 隔离 A 静态（函数体不含 lessons/lessonSteps 写）+ 隔离 B 读（learning.ts/classroom.ts 源码不引用 draftLessonVersions）。

## Invariants Honored

- **D-01 / DRAFT-01**：函数体只 `insert(draftLessonVersions)`，无任何 lessons/lessonSteps 的 insert/update（运行时 + 静态双断言）。
- **D-04 provenance**：source 硬编码 'ai'；createdById 由入参注入（DAL 不解析 actor）；不内嵌 step payload 到 source 列。
- **DRAFT-02**：唯一约束冲突不在 DAL try/catch 静默——向上抛，幂等终判留给 Plan 04 handler。
- **DRAFT-03 读隔离**：结构性证明学生/classroom 读路径不引用 draft 表。
- server-only DAL 边界保持（文件顶部既有 `import "server-only"`）。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - 测试断言修正] 写隔离 table 断言改用 getTableName**
- **Found during:** Task 2
- **Issue:** 计划隐含用对象引用相等断言插入的 table，但 `vi.resetModules()` + 动态 `import()` 使 DAL 与测试顶层 import 的 `draftLessonVersions` 来自不同模块实例，`toBe`/`toHaveBeenCalledWith` 均失败（Drizzle table 深比较亦报错）。
- **Fix:** 改用 `drizzle-orm` 的 `getTableName(...)` 按表名字符串 `"draftLessonVersion"` 断言，跨模块稳定。
- **Files modified:** src/lib/dal/lesson-authoring.draft-persist.test.ts
- **Commit:** 957fa1d

**2. [Rule 3 - 类型修正] mock 显式参数签名**
- **Issue:** `vi.fn(() => ...)` 推断空参数元组，`mock.calls[0][0]` 触发 TS tuple-index 错误。
- **Fix:** mock 加 `(_table: unknown)` / `(_values: unknown)` 参数签名 + `[0]!` 非空断言。副作用：2 条 `no-unused-vars` **warning**（非 error，lint exit 0；仓库多处同类 warning 容忍）。

> 注：snapshotJson 计划伪代码写 `JSON.stringify({steps})`，实际按 schema 的 `text(mode:"json")` 列与 publishLesson 范式传对象 `{ steps }`（Drizzle 自动序列化）—— 属对齐既有范式的实现选择，非偏离。

## Verify Results

- `pnpm typecheck`：**零新增**错误。完整错误集仅 2 条预期 pre-existing 跨 plan 缺口（bus.ts:129 / registry.ts:93，63-03 已加 PlatformCommandType 但 handler 待 63-04 登记），本 plan 未引入任何新错误。
- `pnpm vitest run src/lib/dal/lesson-authoring.draft-persist.test.ts`：6 passed (6)。
- `pnpm lint`：exit 0（0 errors，2 个新 warning 见上）。

## Self-Check: PASSED

- src/lib/dal/lesson-authoring.ts：FOUND（含 `export async function persistDraftLessonVersion`）
- src/lib/dal/lesson-authoring.draft-persist.test.ts：FOUND
- commit 41ec890：FOUND（feat 函数）
- commit 957fa1d：FOUND（test 测试）
