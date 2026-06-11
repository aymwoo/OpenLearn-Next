---
phase: 75-second-external-plugin-marketplace-generalization
plan: 02-GAP
type: execute
wave: 1
depends_on: ["01", "03", "04", "GAP"]
files_modified:
  - drizzle/0023_phase75_homework_upgrade.sql
  - drizzle/meta/_journal.json
  - drizzle/meta/0023_snapshot.json
autonomous: true
gap_closure: true
gaps: [1, 2]
requirements: [MKT-EXT-03]

must_haves:
  truths:
    - "D-10: Upgrade 迁移文件 drizzle/0023_phase75_homework_upgrade.sql 物理存在，包含 ALTER TABLE ADD COLUMN dueDate"
    - "D-10: journal 记录 0023 迁移条目，backfill→verify→cutover 三阶段可在真实数据库验证"
    - "D-09: semver upgrade 阶段因迁移文件补齐而关闭，全链路五阶段完整"
  artifacts:
    - path: "drizzle/0023_phase75_homework_upgrade.sql"
      provides: "homework upgrade 迁移 SQL（schema change: dueDate 列）"
      contains: "ALTER TABLE plugin_owned_homework_assignments"
    - path: "drizzle/meta/_journal.json"
      provides: "包含 0023 迁移条目的连续迁移日志"
      contains: "0023_phase75_homework_upgrade"
    - path: "drizzle/meta/0023_snapshot.json"
      provides: "drizzle-kit 格式的升级后 schema 快照"
      contains: "dueDate"
  key_links:
    - from: "plugins/homework/data-model.ts"
      to: "drizzle/0023_phase75_homework_upgrade.sql"
      via: "手写 ALTER TABLE ADD COLUMN（对齐编译产物 homework.ts 中的 dueDate 列声明）"
      pattern: "dueDate"
---

<objective>
关闭 VERIFICATION.md 中识别的 2 个 gap：补齐 homework upgrade 物理迁移文件（0023），更新 drizzle journal，使 D-10（upgrade 迁移验证）和 D-09（全链路五阶段）从 partial 变为 verified。

Purpose: homework upgrade v1.0.0→v1.1.0 的 schema change（dueDate 列）在物理数据库层面可执行，backfill→verify→cutover 三阶段可通过真实数据验证（非仅 mock 模式）。
Output: drizzle/0023_phase75_homework_upgrade.sql 存在 + journal 连续 + 数据库可迁移 + lifecycle.test.ts 全绿。
</objective>

<execution_context>
@/home/wuxf/Develop/OpenLearn-Next/.claude/get-shit-done/workflows/execute-plan.md
@/home/wuxf/Develop/OpenLearn-Next/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/phases/75-second-external-plugin-marketplace-generalization/75-CONTEXT.md
@.planning/phases/75-second-external-plugin-marketplace-generalization/75-VERIFICATION.md
@.planning/phases/75-second-external-plugin-marketplace-generalization/75-RESEARCH.md
@.planning/phases/75-second-external-plugin-marketplace-generalization/75-04-PLAN.md
@.planning/phases/75-second-external-plugin-marketplace-generalization/75-04-SUMMARY.md

<!-- 已编译产物（含 dueDate 列声明） -->
<interfaces>
从 src/db/schema/generated/plugin-owned/homework.ts:
```typescript
// plugin_owned_homework_assignments 表定义（编译产物）
export const pluginOwnedHomeworkAssignments = sqliteTable(
  "plugin_owned_homework_assignments",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    schoolId: text("schoolId").notNull().references(() => schools.id, { onDelete: "cascade" }),
    pluginId: text("pluginId").notNull().references(() => pluginRegistrations.id, { onDelete: "cascade" }),
    classroomSession: text("classroomSession").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    attachmentUrl: text("attachmentUrl"),
    dueDate: text("dueDate"),       // ← v1.1.0 新增列，0017 迁移中不存在
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  // ...
);
```

从 drizzle/0017_phase75_homework_tables.sql 的 assignments 表定义（无 dueDate）:
- 列：id, schoolId, pluginId, classroomSession, title, description, attachmentUrl, createdAt, updatedAt
- 缺少：dueDate

当前数据库 plugin_owned_homework_assignments 表结构（无 dueDate）:
- 列：id, schoolId, pluginId, classroomSession, title, description, attachmentUrl, createdAt, updatedAt
- 缺少：dueDate
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: 创建 upgrade 迁移 SQL 文件 + 更新 drizzle journal</name>
  <files>drizzle/0023_phase75_homework_upgrade.sql, drizzle/meta/_journal.json, drizzle/meta/0023_snapshot.json</files>
  <read_first>
    - 既有迁移文件：drizzle/0017_phase75_homework_tables.sql（无 dueDate 列的 assignments 初始表）
    - 编译产物：src/db/schema/generated/plugin-owned/homework.ts（含 dueDate 列声明，列定义完整）
    - 既有 journal：drizzle/meta/_journal.json（当前最新 idx=7，tag=0007_hard_echo，when=1780477916406）
    - 既有 snapshot 格式参考：drizzle/meta/0015_snapshot.json（prevId 链式结构）
    - data-model 源码：plugins/homework/data-model.ts（含 dueDate，v1.1.0 schema change）
    - CONTEXT.md D-10：upgrade 验证对标 quiz 标准，零丢失 + schema change
  </read_first>
  <action>
    ## Step 1: 创建 drizzle/0023_phase75_homework_upgrade.sql

    写入单条 ALTER TABLE 语句：
    ALTER TABLE plugin_owned_homework_assignments ADD COLUMN dueDate TEXT;

    这是 homework v1.0.0→v1.1.0 的 schema change：在 assignments 表新增可空 dueDate 列。
    不要包含 DROP/CREATE 语句，不要修改既有列。
    使用 TEXT 类型（对齐 Drizzle 编译产物中的 text("dueDate") 声明），可空无默认值（对齐 data-model.ts 中 notNull: false）。
    不需分割 statement-breakpoint（单条 SQL）。

    ## Step 2: 更新 drizzle/meta/_journal.json

    在 journal.entries 数组末尾追加新条目：
    {
      "idx": 8,
      "version": "7",
      "when": {当前 Unix 毫秒时间戳，使用 Date.now()},
      "tag": "0023_phase75_homework_upgrade",
      "breakpoints": true
    }

    保持既有 8 个条目不变（idx 0-7）。
    idx 必须是当前最大 idx（7）+ 1 = 8。
    version 使用 "7"（对齐 journal 中 Drizzle v7 的既有版本号）。
    breakpoints 为 true（对齐既有条目的设置）。

    ## Step 3: 创建 drizzle/meta/0023_snapshot.json

    基于 0015_snapshot.json 的完整结构，在其中追加 plugin_owned_homework_assignments 的 dueDate 列。
    完整列出 plugin_owned_homework_assignments 的快照格式表定义（含 dueDate TEXT 列），以及三表的全部列。
    snapshot 的 prevId 指向 journal 中上一个 entry 对应的 snapshot ID（0015_snapshot.json 的 id）。
    保留所有既有表定义不变，只更新 to: assignments 表的列定义追加 dueDate。
  </action>
  <verify>
    <automated>
      # 验证迁移文件存在且内容正确
      grep 'dueDate' drizzle/0023_phase75_homework_upgrade.sql

      # 验证 journal 包含 0023 条目
      grep '0023_phase75_homework_upgrade' drizzle/meta/_journal.json

      # 在数据库上直接执行迁移
      sqlite3 local.db "ALTER TABLE plugin_owned_homework_assignments ADD COLUMN dueDate TEXT;"

      # 验证 dueDate 列已添加
      sqlite3 local.db "PRAGMA table_info(plugin_owned_homework_assignments);" | grep dueDate
    </automated>
  </verify>
  <acceptance_criteria>
    - drizzle/0023_phase75_homework_upgrade.sql 存在，仅包含 `ALTER TABLE plugin_owned_homework_assignments ADD COLUMN dueDate TEXT;`
    - drizzle/meta/_journal.json 含 entries[8]：tag="0023_phase75_homework_upgrade"，idx=8
    - drizzle/meta/0023_snapshot.json 存在，含 dueDate 列，prevId 正确引用上一快照
    - sqlite3 local.db "PRAGMA table_info(plugin_owned_homework_assignments);" 输出中含 dueDate 列
    - plugin_owned_homework_assignments 中既有数据不丢失（可通过 SELECT count(*) 确认行数不变）
    - 既有行的 dueDate 值为 NULL
  </acceptance_criteria>
  <done>upgrade 迁移文件 + journal 条目 + snapshot 全部就位，dueDate 列已在数据库中添加。</done>
</task>

<task type="auto">
  <name>Task 2: 验证 upgrade 迁移三阶段 + 跨插件回归全绿</name>
  <files>无（纯验证任务）</files>
  <read_first>
    - lifecycle 测试：src/plugins/homework/__tests__/lifecycle.test.ts（mock 模式，upgrade 三阶段 + uninstall + 重装）
    - cross-plugin-regression 测试：src/plugins/homework/__tests__/cross-plugin-regression.test.ts（6 检查点 A-F）
    - VERIFICATION.md D-10 验收标准：backfill→verify→cutover 三阶段 + 零丢失
    - VERIFICATION.md D-09 验收标准：全链路五阶段完整
    - LOCAL DEV SETUP: 当前数据库三表已存在，assignments 表已有 dueDate 列（Task 1 已添加）
  </read_first>
  <action>
    ## Step 1: 验证 lifecycle 测试通过

    运行：pnpm vitest run src/plugins/homework/__tests__/lifecycle.test.ts

    该测试以 mock 模式验证 upgrade 三阶段：
    - backfill：既有 assignments/submissions/grades 数据可读取
    - cutover：新列 dueDate 可写入（验证 producePluginDataInsert 被正确传入 dueDate 值）
    - verify：三表数据行数不变（零丢失断言）
    - 加上 uninstall + 重装 + governance gate 共 10 个测试

    确认 10/10 全部通过。

    ## Step 2: 验证跨插件回归测试通过

    运行：pnpm vitest run src/plugins/homework/__tests__/cross-plugin-regression.test.ts

    确认 6 检查点（A-F）全部通过：
    - A: quiz install 不受影响
    - B: homework dataModel 编译后 quiz 全绿
    - C: homework + quiz 步骤编辑器共存
    - D: homework + quiz 提交双绿
    - E: homework upgrade 后 quiz 数据完整
    - F: homework uninstall 后 quiz 功能正常

    ## Step 3: 验证 pnpm verify:phase75 双绿

    运行：pnpm verify:phase75

    确认顺序执行 quiz-sample-step-card.test.tsx（3 个测试）和 homework/ 插件测试（18 个测试），exit 0。

    ## Step 4: 数据库完整性确认

    确认 plugin_owned_homework_assignments 表中：
    - 既有行的 dueDate 为 NULL（Schema change 对既有数据零影响）
    - 新插入的行可正常设置 dueDate 值
    - 三表数据完整性不受影响
  </action>
  <verify>
    <automated>
      # 核心验证：lifecycle + regression + quiz 全部通过
      pnpm vitest run src/plugins/homework/__tests__/lifecycle.test.ts
      pnpm vitest run src/plugins/homework/__tests__/cross-plugin-regression.test.ts
      pnpm verify:phase75
    </automated>
  </verify>
  <acceptance_criteria>
    - pnpm vitest run src/plugins/homework/__tests__/lifecycle.test.ts：10/10 通过（upgrade 三阶段 + uninstall + 重装 + governance gate）
    - pnpm vitest run src/plugins/homework/__tests__/cross-plugin-regression.test.ts：6 检查点全绿
    - pnpm verify:phase75 exit 0（quiz + homework 双绿）
    - plugin_owned_homework_assignments 表 dueDate 列存在，既有行 dueDate IS NULL
    - 三表数据完整（count 不变）
  </acceptance_criteria>
  <done>upgrade 迁移三阶段验证通过，跨插件双绿，全链路五阶段覆盖确认完整。</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| migration SQL → SQLite | upgrade 迁移仅 ADD COLUMN，不修改既有数据，无删除风险 |
| journal entry → migrate() | journal 条目驱动 drizzle migrate，错误条目会阻止迁移或重复执行 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-75-GAP-01 | Tampering | upgrade 迁移 SQL 内容 | mitigate | 单条 ALTER TABLE ADD COLUMN，对齐编译产物 homework.ts 中 dueDate 声明 |
| T-75-GAP-02 | Denial of Service | journal idx 冲突 | mitigate | idx=8 接续既有最大 idx=7，无重复 |
| T-75-GAP-SC | Tampering | npm/pip/cargo installs | accept | 本 plan 无新包安装 |
</threat_model>

<verification>
- drizzle/0023_phase75_homework_upgrade.sql 物理存在，含 ALTER TABLE ADD COLUMN dueDate
- drizzle/meta/_journal.json 含 0023 条目（idx=8）
- drizzle/meta/0023_snapshot.json 存在
- 数据库 plugin_owned_homework_assignments 表含 dueDate TEXT 列
- 既有数据零丢失
- lifecycle.test.ts 10/10 通过
- cross-plugin-regression.test.ts 全绿
- pnpm verify:phase75 exit 0
</verification>

<success_criteria>
- D-10 从 partial 变为 verified：upgrade 迁移文件 + journal + snapshot 全部就位
- D-09 从 partial 变为 verified：semver upgrade 阶段因迁移补齐而关闭，全链路五阶段完整
- 14/14 must-haves 全部 verified
- VERIFICATION.md gaps 列表清零
</success_criteria>

<output>
Create .planning/phases/75-second-external-plugin-marketplace-generalization/75-02-GAP-SUMMARY.md when done
</output>
