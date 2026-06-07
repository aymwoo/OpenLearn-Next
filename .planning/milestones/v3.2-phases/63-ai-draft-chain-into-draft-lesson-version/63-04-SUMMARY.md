---
phase: 63-ai-draft-chain-into-draft-lesson-version
plan: "04"
subsystem: commands
tags: [command-bus, draft, persist, dedupe, idempotency, lesson-agent]

requires:
  - phase: 63-ai-draft-chain-into-draft-lesson-version
    plan: "02"
    provides: persistDraftLessonVersion DAL (DRAFT-01)
  - phase: 63-ai-draft-chain-into-draft-lesson-version
    plan: "03"
    provides: lesson.draft.persist command contract + event schema

provides:
  - executeLessonDraftPersist handler (命令子系统写链入口)
  - lesson.draft.persist registry 登记 (dedupe:required)
  - 幂等双层证明：bus dedupe 短路 + 表层唯一约束兜底
  - handler 单测 + 集成测试全覆盖

affects: [64-ai-draft-review-surface]

tech-stack:
  added: []
  patterns:
    - "handler 范式复用：签名 ExecutionInput<T>，授权经 authorizeLessonDraftCommand(command) 单参数 void，actor 取自 assertActiveTeacher().userId"
    - "successResult 返回 invalidation.tags + withAudit 包裹 summary-only 事件"
    - "dedupe:required 命令层幂等 + 表层唯一约束 (lessonId, sourceCommandId) 双层兜底"

key-files:
  created:
    - src/features/platform-core/commands/handlers/lesson-draft.persist.test.ts — handler 单测 + 幂等集成测试
  modified:
    - src/features/platform-core/commands/handlers/lesson-draft.ts — 新增 executeLessonDraftPersist handler + lessonDraftCommandHandlers 扩 persist 键
    - src/features/platform-core/commands/registry.ts — 登记 lesson.draft.persist (dedupe:required)
    - src/features/platform-core/commands/handlers/plugins.test.ts — 修复 registry keys 断言含 lesson.draft.persist

key-decisions:
  - "dedupe:required 置于 registry 层（命令层幂等），handler 不自行实现 dedupe 逻辑"
  - "sourceCommandId 取自 command.id（provenance + 表层幂等键），createdById 取自 assertActiveTeacher().userId，二者均闭包注入不入 payload"
  - "pending-replay 终态语义固化：DAL 不吞唯一约束冲突，错误向上传播；终态 draftLessonVersions count 恒 1"
  - "事件 payload 仅 summary-only（draftVersionId/version/stepCount/source），不携带 snapshotJson"

requirements-completed: [DRAFT-01, DRAFT-02, DRAFT-03]

duration: 10min
completed: 2026-05-31
---

# Phase 63 Plan 04: lesson.draft.persist 命令写入收口 Summary

**handler + registry + 幂等双层集成测试，完成 AI Draft Chain 写链端到端闭环**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-31T10:58:35Z
- **Completed:** 2026-05-31T11:08:59Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- `executeLessonDraftPersist` handler 落地：签名 `ExecutionInput<LessonDraftPersistCommand>`，授权经 `authorizeLessonDraftCommand(command)` 单参数 void，actor 取 `assertActiveTeacher().userId`，闭包注入 `sourceCommandId=command.id` / `createdById=teacherId` 调 Plan 02 DAL
- registry 登记 `lesson.draft.persist`（dedupe:required），命令层幂等第一层；`satisfies Record<PlatformCommandType, ...>` 类型保障登记完整性
- 幂等双层证明：用例 A 经 bus dedupe 短路（同 dedupeKey 二次 dispatch → handler 仅执行一次）；用例 B pending-崩溃-重放（同 command.id 二次执行 → DAL 唯一约束冲突抛错，终态 count 恒 1）
- 事件 payload summary-only（draftVersionId/version/stepCount/source:"ai"），无 *Json 键；withAudit 承载审计元数据
- teacherId/source 绝不出现在命令 payload；不在 execute 内调用 updateTag()

## Task Commits

1. **Task 1 RED: handler 失败测试** — `a6500a3` (test)
2. **Task 1 GREEN: handler 实现 + handlers 登记** — `b1bd34b` (feat)
3. **Task 2: registry 注册 + 测试修复** — `31af354` (feat)
4. **Task 3: 幂等集成测试** — `5f9d37e` (test)

## Files Created/Modified

- `src/features/platform-core/commands/handlers/lesson-draft.ts` — 新增 `executeLessonDraftPersist` handler，导入 `persistDraftLessonVersion` + `cacheTags`，`lessonDraftCommandHandlers` 扩为 `Record<"lesson.draft.run" | "lesson.draft.persist", ...>`
- `src/features/platform-core/commands/handlers/lesson-draft.persist.test.ts` — 新建：handler 单测 5 项 + 幂等双层集成测试 2 项
- `src/features/platform-core/commands/registry.ts` — 追加 `lesson.draft.persist` 登记项（dedupe:required）
- `src/features/platform-core/commands/handlers/plugins.test.ts` — 修复 registry keys 硬编码断言（Rule 1：含新增 `lesson.draft.persist`）

## Decisions Made

- dedupe:required 置于 registry 层，handler 内不自行实现 dedupe 逻辑（遵循 command bus 契约）
- pending-replay 终态语义明确：DAL 不吞唯一约束冲突，错误向上传播至调用方；最终 draftLessonVersions 行数恒为 1
- sourceCommandId 经 command.id 闭包注入（不来自 payload），同时作为 provenance 追溯键和表层唯一约束键

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 修复 plugins.test.ts registry keys 硬编码断言**

- **Found during:** Task 2 (registry 登记)
- **Issue:** `plugins.test.ts` 用 `toEqual([...])` 硬编码 registry keys 列表，缺少新增的 `lesson.draft.persist`
- **Fix:** 在期望数组中追加 `"lesson.draft.persist"`
- **Files modified:** src/features/platform-core/commands/handlers/plugins.test.ts
- **Verification:** `pnpm test -- src/features/platform-core/commands` 202 test files / 1290 tests 全绿
- **Committed in:** `31af354` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1)
**Impact on plan:** 修复预存测试对 registry 键的硬编码断言——无范围蔓延，属必要的前向兼容修正。

## Threat Mitigation Verification

| Threat ID | Mitigation | Verified |
|-----------|-----------|----------|
| T-63-01 (越权) | `authorizeLessonDraftCommand(command)` 校验 schoolId | Test 2 断言 schoolId 越权抛错 + DAL 未调用 |
| T-63-02 (重放) | dedupe:required + 表层唯一约束 | 用例 A（bus dedupe 短路）+ 用例 B（约束冲突兜底）均 count=1 |
| T-63-03 (伪造) | teacherId/source 闭包注入不入 payload | Test 5 断言 sourceCommandId=command.id, createdById=userId |
| T-63-04 (泄漏) | 事件 payload .strict() summary-only | Test 4 断言 payload 无 *Json 键 |
| T-63-05 (绕 bus) | 写逻辑仅经 handler→DAL | handler 为 server-only，DAL 不导出给客户端 |
| T-63-06 (无审计) | sourceCommandId 落库 + withAudit 事件 | emittedEvents[0].audit 存在，sourceCommandId 经 DAL 写入 |
| T-63-07 (DoS) | dedupe:required + assertActiveTeacher | 双重防护——accepted risk |

## Issues Encountered

无阻塞问题。Task 3 集成测试因 handler 与 registry 已在 Task 1-2 就绪，RED 阶段测试即通过——行为验证型 TDD，非实现驱动型。

## Next Phase Readiness

- lesson.draft.persist 可经 bus dispatch，授权 + DAL 写入 + 事件 + 失效闭环完整（DRAFT-01/02/03）
- 幂等双层证明完毕：双 dispatch / pending 重放后 draftLessonVersions 恒 1 行
- 事件 summary-only、teacherId/createdById 不入 payload、不在 execute 内 updateTag —— 全部不变式守住
- Ready for Phase 64（教师审校面 UI）

---

*Phase: 63-ai-draft-chain-into-draft-lesson-version*
*Completed: 2026-05-31*

## Self-Check: PASSED

- ✅ All 4 key files exist on disk
- ✅ All 5 commits found in git log (a6500a3, b1bd34b, 31af354, 5f9d37e, 40038fc)
- ✅ Command domain regression: 202 test files / 1290 tests passed
- ✅ Typecheck: 0 errors
- ✅ Lint: 0 errors on changed files
