---
phase: 64-teacher-review-accept-publish-surface
plan: "03"
subsystem: server-actions, commands, events
tags: [zod, server-actions, cache-tags, command-bus, event-sourcing, draft-review, tdd]

# Dependency graph
requires:
  - phase: 64-02
    provides: "applyDraftToLiveLesson DAL, discardDraftLessonVersion DAL, ApplyDraftResultDTO, DiscardDraftResultDTO"
provides:
  - "applyDraftLessonVersionAction: Zod-validated Server Action wrapping applyDraftToLiveLesson with cache invalidation (draft/lesson/steps/course/teacherCourses)"
  - "discardDraftLessonVersionAction: Zod-validated Server Action wrapping discardDraftLessonVersion with cache invalidation (draft/lesson)"
  - "lesson.draft.accept + lesson.draft.discard command registrations (dedupe:required) with handler stubs"
  - "Three summary-only domain event schemas: LessonDraftAcceptedEvent, LessonDraftDiscardedEvent, LessonDraftAppliedEvent"
affects: [64-04-editor-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Action follows publishLessonAction pattern: Zod parse → assertActiveTeacher → call DAL → invalidate cache tags → handle errors"
    - "editedSteps schema uses .strict() on inner items to reject unknown fields (type/pluginConfig/executableConfig per D-13)"
    - "DRAFT_NOT_PENDING maps to structured error with Chinese message; DRAFT_NOT_FOUND maps to NOT_FOUND via handleActionError"
    - "Command handlers follow existing authorize→execute→successResult pattern with summary-only withAudit events"
    - "Event payloads are summary-only (.strict(), no *Json keys, no snapshotJson) — consistent with Phase 62/63 conventions"

key-files:
  created:
    - src/actions/lesson-authoring-draft-review-actions.test.ts
  modified:
    - src/actions/lesson-authoring-actions.ts
    - src/features/platform-core/commands/contracts.ts
    - src/features/platform-core/commands/registry.ts
    - src/features/platform-core/commands/handlers/lesson-draft.ts
    - src/features/platform-core/events/contracts.ts
    - src/features/platform-core/commands/handlers/plugins.test.ts

key-decisions:
  - "editedSteps inner schema uses .strict() to reject type/pluginConfig/executableConfig fields — aligns with D-13 constraint that type is non-editable in review"
  - "discardDraftLessonVersionAction invalidates only draft+lesson tags (not steps/course/teacherCourses) since discard doesn't modify lessonSteps"
  - "handler emitted event payload version=0 placeholder — the DAL result (ApplyDraftResultDTO) does not include the draft version number"
  - "LessonDraftAppliedEventSchema is CONTRACT-ONLY — no handler emits it yet, defined for future dispatch"

patterns-established:
  - "Pattern 1: apply action invalidates standard authoring tags (teacherCourses/course/lesson/steps) PLUS draft tag"
  - "Pattern 2: discard action invalidates only draft+lesson tags (no steps mutation per D-08)"
  - "Pattern 3: handler stubs use version=0 placeholder with documented rationale"

requirements-completed: [REVIEW-02, REVIEW-03]

# Metrics
duration: 12min
completed: 2026-05-31
---

# Phase 64 Plan 03: Server Actions + Command/Event Integration 总结

**实现 applyDraftLessonVersionAction 和 discardDraftLessonVersionAction 两个 Server Action，注册 lesson.draft.accept/discard 命令，定义三个总结性领域事件 schema。**

## 性能

- **耗时:** 12 分钟
- **开始时间:** 2026-05-31T21:43:00Z
- **结束时间:** 2026-05-31T21:56:00Z
- **任务数:** 2
- **修改文件数:** 7

## 成果
- `applyDraftLessonVersionAction`：Zod 校验入参（含可选 `editedSteps`），调用 `assertActiveTeacher()` 鉴权，调用 Plan 02 的 `applyDraftToLiveLesson`，成功后失效 `draft/lesson/steps/course/teacherCourses` 共 5 个 cache tag
- `discardDraftLessonVersionAction`：Zod 校验入参，`assertActiveTeacher()` 鉴权，调用 `discardDraftLessonVersion`，成功后失效 `draft/lesson` 共 2 个 cache tag（不涉及 steps，因丢弃不修改 lessonSteps）
- `handleActionError` 新增 `DRAFT_NOT_PENDING` → 结构化中文错误 { error: "DRAFT_NOT_PENDING", message: "该草稿已处理，请刷新后重试。" }，`DRAFT_NOT_FOUND` → NOT_FOUND 映射
- `editedSteps` 内层 schema 使用 `.strict()` 拒绝 `type` / `pluginConfig` / `executableConfig` 字段，遵守 D-13 约束
- 在命令系统中注册 `lesson.draft.accept` 和 `lesson.draft.discard`（dedupe:required），handler 遵循现有 authorize→DAL→emit 模式
- 定义三个 summary-only 事件 schema 并集成到 `PlatformEventSchema` / `PlatformDomainEventSchema` / `PlatformSuccessOrDomainEventSchema`

## 任务提交

每个任务按 TDD 原子化提交：

1. **任务 1 RED: 添加失败测试** — `08905e3`（test：15 个测试覆盖 apply/discard 所有路径）
2. **任务 1 GREEN: 实现 Server Actions** — `4182ecb`（feat：applyDraftSchema、discardDraftSchema、两个 action 函数、错误映射）
3. **fix: .strict() 修正** — `35f6bbd`（fix：editedSteps 内层 schema 加 .strict() 拒绝 type 字段）
4. **任务 2: 命令注册 + 事件契约** — `a517e0e`（feat：5 文件修改，命令类型/registry/handler/事件 schema）

## 创建/修改的文件
- `src/actions/lesson-authoring-draft-review-actions.test.ts` — 新建：15 个测试（8 apply + 7 discard），覆盖有效输入、cache tag 失效、校验、鉴权、错误映射（新增 296 行）
- `src/actions/lesson-authoring-actions.ts` — 新增 import（applyDraftToLiveLesson / discardDraftLessonVersion），2 个 Zod schema（applyDraftSchema / discardDraftSchema），2 个 action 函数（applyDraftLessonVersionAction / discardDraftLessonVersionAction），handleActionError 新增 DRAFT_NOT_PENDING / DRAFT_NOT_FOUND（新增约 53 行）
- `src/features/platform-core/commands/contracts.ts` — LessonDraftCommandTypes 扩为 4 项，新增 2 个 payload schema，PlatformCommandPayloadSchemas 和 PlatformCommandSchema 各新增 2 个条目（新增约 37 行）
- `src/features/platform-core/commands/registry.ts` — 登记 lesson.draft.accept 和 lesson.draft.discard（dedupe:required）（新增约 14 行）
- `src/features/platform-core/commands/handlers/lesson-draft.ts` — 新增 executeLessonDraftAccept / executeLessonDraftDiscard handler 函数，lessonDraftCommandHandlers 扩为 4 键（新增约 82 行）
- `src/features/platform-core/events/contracts.ts` — 新增 3 个 payload schema + 3 个 event schema，集成到 3 个联集，新增 6 个 type 导出（新增约 80 行）
- `src/features/platform-core/commands/handlers/plugins.test.ts` — 修复硬编码 registry keys 断言，新增 `lesson.draft.accept` 和 `lesson.draft.discard`（Rule 1 自动修复）

## 决策记录
- `editedSteps` 内层 schema 使用 `.strict()` 拒绝 `type`/`pluginConfig`/`executableConfig` 字段 — 与 D-13 约束一致（type 不可在审校中修改）
- `discardDraftLessonVersionAction` 只失效 draft 和 lesson tag — 丢弃 D-08 确保不写入 lessonSteps，因此无需失效 steps tag
- handler 发出的事件 payload 中 `version: 0` 为占位值 — `ApplyDraftResultDTO` 不含 version 字段，handler 层无法解析
- `LessonDraftAppliedEventSchema` 为 CONTRACT-ONLY 定义 — 当前无 handler 发出此事件，保留供后续 Phase 或显式派发使用

## 与计划的偏差

### 自动修复的问题

**1. [Rule 1 - Bug] 修复 plugins.test.ts 硬编码 registry keys 断言**

- **发现于:** 任务 2（registry 注册）
- **问题:** `plugins.test.ts` 使用硬编码的 registry keys 数组 `toEqual([...包含 lesson.draft.run, lesson.draft.persist])`，缺少新增的 `lesson.draft.accept` 和 `lesson.draft.discard`
- **修复:** 在期望数组中追加 `"lesson.draft.accept"` 和 `"lesson.draft.discard"`
- **修改文件:** src/features/platform-core/commands/handlers/plugins.test.ts
- **验证:** `pnpm vitest run src/features/platform-core/commands` — 44 个测试全部通过
- **提交于:** `a517e0e`（任务 2 提交）

---

**总计偏差:** 1 个自动修复（Rule 1）
**影响评估:** 修复预存测试对 registry 键的硬编码断言 — 无范围蔓延，属必要的前向兼容修正。

## 已知问题

无阻塞问题。以下为已知存根：

## 已知存根

1. **handler 事件 payload `version: 0` 占位符** — `src/features/platform-core/commands/handlers/lesson-draft.ts` line ~257/295：`ApplyDraftResultDTO` 不包含 version，handler 使用硬编码 `version: 0`。后续可在 DAL 返回中添加 version 字段后更新。

2. **LessonDraftAppliedEventSchema CONTRACT-ONLY** — `src/features/platform-core/events/contracts.ts`：schema 已定义并集成到联集，但无 handler 发出此事件。这是计划中明确的设计（"emitter deferred to future Phase or explicit later dispatch"）。

## 威胁标志

无 — 所有 STRIDE 缓解措施已实现：
- S64-01（Spoofing）：applyDraftLessonVersionAction 和 discardDraftLessonVersionAction 均通过 Zod 校验 + assertActiveTeacher 鉴权
- S64-04（Tampering）：Actions 显式调用 updateTag 失效 draft/lesson/steps/course/teacherCourses 缓存标签
- S64-05（Information Disclosure）：所有三个新事件 payload schema 均为 summary-only（.strict()，无 *Json 键，无 snapshotJson）
- S64-08（Repudiation）：dedupe:required 确保每个 accept/discard 操作唯一，事件账本提供审计追踪

## 需要用户配合的部分

无 — 本计划无需外部服务配置。

## 下一阶段准备状态
- Server Actions 已就绪供 UI 组件直接调用（`applyDraftLessonVersionAction` / `discardDraftLessonVersionAction`）
- 命令审计追踪（`lesson.draft.accept` / `lesson.draft.discard`）已在 command bus 注册
- 事件契约（accepted / discarded / applied）已定义并集成到类型系统
- 87 个测试全部通过（15 新 + 28 回归 + 44 命令域）
- TypeScript 类型检查零错误
- Ready for Phase 64 Plan 04（编辑器 UI 集成）

---

*阶段: 64-teacher-review-accept-publish-surface*
*完成时间: 2026-05-31*

## Self-Check: PASSED

- ✅ `src/actions/lesson-authoring-draft-review-actions.test.ts` 存在
- ✅ `src/actions/lesson-authoring-actions.ts` 包含 applyDraftLessonVersionAction 和 discardDraftLessonVersionAction
- ✅ 4 个提交在 git log 中（08905e3, 4182ecb, 35f6bbd, a517e0e）
- ✅ 87 个相关测试全部通过
- ✅ pnpm typecheck 零错误
