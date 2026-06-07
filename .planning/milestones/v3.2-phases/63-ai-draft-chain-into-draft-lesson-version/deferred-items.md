# Phase 63 — Deferred / Out-of-Scope Items

## 63-01 执行期发现（scope 外，不修）

### D1: pre-existing typecheck errors（contracts/registry/handler 未对齐）
- **发现于:** 63-01 Task 1 `pnpm typecheck`
- **现象:**
  - `src/features/platform-core/commands/bus.ts(129,76)`: Property 'lesson.draft.persist' does not exist ...
  - `src/features/platform-core/commands/registry.ts(93,3)`: Property '"lesson.draft.persist"' is missing in Record<...>
- **根因:** 工作区中 `src/features/platform-core/commands/contracts.ts` 已被改动，向 `LessonDraftCommandTypes` 加入 `lesson.draft.persist`，但对应的 registry 注册项与 handler 尚未落地（属于 63-02/63-03/63-04 的工作）。
- **验证为既存:** `git stash` 掉本 plan 的 `src/db/schema.ts` 改动后，`pnpm typecheck` 报错完全相同（同样 2 条）。本 plan 的 `draftLessonVersions` 表新增引入 **0** 条新错误。
- **处置:** SCOPE BOUNDARY —— 不在 63-01 范围（仅 schema.ts + migration + schema 测试）。由 63-02/03/04 修复。本 plan 的 typecheck 门禁以「schema 改动零新增错误」判定通过。
