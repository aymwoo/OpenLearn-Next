# Deferred Items — Phase 67

Out-of-scope discoveries logged during execution. NOT fixed in this phase.

## Pre-existing: dev-db bridging tag detection is incomplete

- **Found during:** 67-02 Task 2 (fresh-db migrate verification)
- **Symptom:** Running `pnpm db:migrate` against a pre-existing `local.db` (created before phase63/64 schema was tracked) fails with `table draftLessonVersion already exists`. The `_journal.json` baseline already lists `0014_phase63_draft_lesson_versions`, but `detectExistingSchemaTag()` in `scripts/prepare-dev-db.ts` only recognizes up to `0002_daffy_xavin`, so it under-detects the real applied schema and replays migrations that already exist.
- **Scope:** Pre-existing defect in `scripts/prepare-dev-db.ts` bridging logic — unrelated to 67-02's compiler/migration changes. 67-02 was verified clean on a **fresh** DB (`pnpm db:migrate` applies `0005_lean_sage.sql` with no errors).
- **Suggested fix (future):** Extend `detectExistingSchemaTag()` to recognize phase53/63/64 schema markers so legacy `local.db` files bridge to the correct journal index instead of replaying tracked migrations.
- **Files:** `scripts/prepare-dev-db.ts`

## Code-review warnings (deferred from 67-REVIEW.md — non-BLOCKER)

CR-01 (BLOCKER) 已在收尾修复（commit `5e215ed`）。以下 6 个 WARNING 为防御纵深 / 一致性硬化项，非红线违规，留待 Phase 68（受治理访问动词，会重写读写边界）一并处理：

- **WR-01:** 零运行时 DDL gate 可被「跨行/变量拆分」绕过（`scripts/gate-no-runtime-ddl.ts:108-111`）。逐行正则无法兑现「证明」级保证；建议补跨行数据流近似或将措辞降级为 heuristic deny-list。
- **WR-02:** naive `//` 注释剥离会截断含 `//` 的字符串行造成漏检（`gate-no-runtime-ddl.ts:31-36` / `verify-phase67...ts:32-37`）。建议改 AST/token 级扫描（`typescript` 已是依赖）。
- **WR-03:** gate self-exempt 的裸 `endsWith(SELF_BASENAME)` 过宽（`:50`），`x-gate-no-runtime-ddl.ts` 之类可按命名免检。建议改精确相对路径判断。
- **WR-04:** `default` 未与列 `type` 做一致性校验，enum 默认值不在 `enumValues` 内也放行（`plugin-data-model.ts:57` + `compile-plugin-data-model.ts:81-85`）。该 `.default()` 渲染路径在 canonical quiz 模型未被覆盖。
- **WR-05:** 保留列名（id/pluginId/createdAt/updatedAt）被编译器静默丢弃，meta-schema 不拒不告警（`compile-plugin-data-model.ts:40,104-106`）。`schoolId` 形成「必须声明、声明即弃」反直觉契约。
- **WR-06:** 去重唯一约束 `["classroomSession","student","question"]` 未带 `schoolId` scope（`plugins/quiz-sample/data-model.ts:51`），存在理论跨租户写冲突面。建议改为 `["schoolId", ...]`。Phase 69（样板写入路径）落地前应解决。

5 个 INFO（弱启发式 DDL 关键字、gate 扫描根级遗漏、schoolId 列类型被忽略、drift guard 漏 untracked、块注释不剥离）见 67-REVIEW.md，影响更低，按需处理。
