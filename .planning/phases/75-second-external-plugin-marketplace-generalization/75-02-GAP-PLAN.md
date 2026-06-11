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

<!-- Journal 连续性说明 -->
**Journal 现状：** 0017 migration 不在 journal 中。数据库 homework 三表通过 preview 直接创建，而非 drizzle-kit migrate。
仅需添加 0023 条目（idx=8），不需要添加 0017 条目。
drizzle-kit migrate() 仅执行 journal 中标记为未应用的迁移——0023（ALTER TABLE）对已存在的 homework 表可以正常执行，不会因 0017 不在 journal 中而报错。

<!-- 0007 snapshot 参考 -->
**0007_snapshot.json:** id = f505c29e-c214-4380-9583-72f0ca8b508a，不含任何 homework 表定义。
0023_snapshot.json 的 prevId 必须指向此 id，代表 0007→0023 之间的累积变更（含 0017 建表 + 0023 加列）。
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: 创建 upgrade 迁移 SQL 文件 + 更新 drizzle journal</name>
  <files>drizzle/0023_phase75_homework_upgrade.sql, drizzle/meta/_journal.json, drizzle/meta/0023_snapshot.json</files>
  <read_first>
    - 既有迁移文件：drizzle/0017_phase75_homework_tables.sql（无 dueDate 列的 assignments 初始表）
    - 编译产物：src/db/schema/generated/plugin-owned/homework.ts（含 dueDate 列声明，列定义完整）
    - 既有 journal：drizzle/meta/_journal.json（当前最新 idx=7，tag=0007_hard_echo，when=1780477916406；version 列大多为 "6"，仅 idx=4 为 "7"）
    - 既有 snapshot 格式参考：drizzle/meta/0007_snapshot.json（id: f505c29e-c214-4380-9583-72f0ca8b508a，不含 homework 表）
    - 重要：0015 和 0017 均不在 journal 中——0017 migration SQL 存在但 journal 未记录；数据库 homework 三表由 preview 直接创建，非通过 drizzle-kit migrate
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
      "version": "6",
      "when": {当前 Unix 毫秒时间戳，使用 Date.now()},
      "tag": "0023_phase75_homework_upgrade",
      "breakpoints": true
    }

    保持既有 8 个条目不变（idx 0-7）。
    idx 必须是当前最大 idx（7）+ 1 = 8。
    version 使用 "6"（对齐 journal 中大多数条目的版本号：8 条中 7 条使用 "6"，仅 idx=4 使用 "7"）。
    breakpoints 为 true（对齐既有条目的设置）。

    **Journal 连续性说明：** 0017（CREATE TABLE homework 三表）不在 journal 中，不需要添加 0017 条目。
    原因：数据库 homework 三表通过 preview 直接创建，非通过 drizzle-kit migrate 创建。
    仅需添加 0023 条目（idx=8），drizzle-kit migrate() 仅执行 journal 中标记为未应用的迁移——
    0023 的 ALTER TABLE 对已存在的 homework 表可以正常执行，不会因 0017 不在 journal 中而报错。

    ## Step 3: 创建 drizzle/meta/0023_snapshot.json

    基于 0007_snapshot.json 的完整结构构建——复制 0007_snapshot.json 的全部内容作为基础，
    然后在其中新增三张 homework 表的完整列定义。

    **prevId：** 指向 0007_snapshot.json 的 id = f505c29e-c214-4380-9583-72f0ca8b508a。
    注意：不是 0015 的 id（c76fcb64-ac06-40a2-a604-2e5e024d3970），因为 0015 也不含 homework 表定义。

    **需新增的三表（按 drizzle-kit snapshot 格式）：**

    1. plugin_owned_homework_assignments — 完整列定义（与编译产物对齐）：
       - id TEXT PK
       - schoolId TEXT NOT NULL → schools.id
       - pluginId TEXT NOT NULL → pluginRegistrations.id
       - classroomSession TEXT NOT NULL
       - title TEXT NOT NULL
       - description TEXT
       - attachmentUrl TEXT
       - dueDate TEXT           ← v1.1.0 新增（本次升级的核心列）
       - createdAt INTEGER NOT NULL
       - updatedAt INTEGER NOT NULL
       - 索引：schoolId_classroomSession_idx ON (schoolId, classroomSession)

    2. plugin_owned_homework_submissions — 完整列定义：
       - id TEXT PK
       - schoolId TEXT NOT NULL → schools.id
       - pluginId TEXT NOT NULL → pluginRegistrations.id
       - classroomSession TEXT NOT NULL
       - student TEXT NOT NULL
       - assignment TEXT NOT NULL
       - content TEXT NOT NULL
       - attachmentUrl TEXT
       - attemptNo INTEGER NOT NULL
       - isLatest INTEGER NOT NULL DEFAULT 1
       - createdAt INTEGER NOT NULL
       - updatedAt INTEGER NOT NULL
       - 索引：schoolId_classroomSession_assignment_idx ON (schoolId, classroomSession, assignment)
       - 唯一索引：classroomSession_student_assignment_attemptNo_unique ON (classroomSession, student, assignment, attemptNo)
       - 索引：classroomSession_student_assignment_isLatest_idx ON (classroomSession, student, assignment, isLatest)

    3. plugin_owned_homework_grades — 完整列定义：
       - id TEXT PK
       - schoolId TEXT NOT NULL → schools.id
       - pluginId TEXT NOT NULL → pluginRegistrations.id
       - classroomSession TEXT NOT NULL
       - student TEXT NOT NULL
       - submission TEXT NOT NULL
       - score INTEGER
       - comment TEXT
       - attemptNo INTEGER NOT NULL
       - isLatest INTEGER NOT NULL DEFAULT 1
       - createdAt INTEGER NOT NULL
       - updatedAt INTEGER NOT NULL
       - 索引：schoolId_classroomSession_submission_idx ON (schoolId, classroomSession, submission)
       - 唯一索引：classroomSession_student_submission_attemptNo_unique ON (classroomSession, student, submission, attemptNo)
       - 索引：classroomSession_student_submission_isLatest_idx ON (classroomSession, student, submission, isLatest)

    snapshot 的 schema 中保留 0007_snapshot.json 的所有既有表定义不变，只追加上述三表。
    生成新的 snapshot id（UUID v4）。
    version 使用 "6"（对齐 journal entries 的大多数版本号）。
  </action>
  <verify>
    <automated>
      # 验证迁移文件存在且内容正确
      grep 'dueDate' drizzle/0023_phase75_homework_upgrade.sql

      # 验证 journal 包含 0023 条目
      grep '0023_phase75_homework_upgrade' drizzle/meta/_journal.json

      # 验证 journal 新条目 version 为 "6"
      python3 -c "import json; d=json.load(open('drizzle/meta/_journal.json')); e=[x for x in d['entries'] if x['tag']=='0023_phase75_homework_upgrade']; assert len(e)==1 and e[0]['version']=='6', f'version mismatch: {e}'"

      # 验证 snapshot prevId 指向 0007
      python3 -c "import json; d=json.load(open('drizzle/meta/0023_snapshot.json')); assert d['prevId']=='f505c29e-c214-4380-9583-72f0ca8b508a', f'prevId mismatch: {d[\"prevId\"]}'"

      # 验证 snapshot 含三表完整列定义
      python3 -c "import json; d=json.load(open('drizzle/meta/0023_snapshot.json')); tables=[t for t in d['tables'] if 'plugin_owned_homework' in t]; assert len(tables)==3, f'Expected 3 homework tables, got {len(tables)}'"

      # 在数据库上直接执行迁移
      sqlite3 local.db "ALTER TABLE plugin_owned_homework_assignments ADD COLUMN dueDate TEXT;"

      # 验证 dueDate 列已添加
      sqlite3 local.db "PRAGMA table_info(plugin_owned_homework_assignments);" | grep dueDate
    </automated>
  </verify>
  <done>upgrade 迁移文件 + journal 条目 + snapshot 全部就位，dueDate 列已在数据库中添加。journal version 对齐 "6"，snapshot prevId 指向 0007。</done>
</task>

<task type="auto">
  <name>Task 2: 验证 upgrade 迁移三阶段 + 跨插件回归全绿 + drizzle-kit migrate 兼容性</name>
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

    ## Step 4: drizzle-kit migrate 兼容性确认

    **验证：** 0017 migration SQL 存在但不在 journal 中，drizzle-kit migrate 仅执行标记为未应用的迁移。
    0023 的 ALTER TABLE 对已存在的 homework 表可以正常执行。

    验证方式：
    - 确认 prepare-dev-db.ts 中 migrate() 不会因 0017 不在 journal 中而报错
    - 确认 ALTER TABLE ADD COLUMN 在表已存在时仍正常执行
    - 可选项：删除 local.db 后重新运行完整 bootstrap 流程，确认 0023 迁移被正确标记并跳过（因为 0017 不在 journal 中，表通过代码直接创建）

    ## Step 5: 数据库完整性确认

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

      # drizzle-kit migrate 兼容性验证
      # 确认 0017 不在 journal 中也不会导致 migrate 报错
      python3 -c "
      import json
      journal = json.load(open('drizzle/meta/_journal.json'))
      tags = {e['tag'] for e in journal['entries']}
      assert '0017_phase75_homework_tables' not in tags, '0017 unexpectedly in journal'
      assert '0023_phase75_homework_upgrade' in tags, '0023 missing from journal'
      print('Journal state OK: 0017 absent, 0023 present')
      "
    </automated>
  </verify>
  <done>upgrade 迁移三阶段验证通过，跨插件双绿，全链路五阶段覆盖确认完整。drizzle-kit migrate 兼容性已验证（0017 不在 journal 中不阻断 0023 执行）。</done>
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
| T-75-GAP-03 | Denial of Service | 0017 不在 journal 中导致 migrate() 失败 | mitigate | 0017 的表通过 preview 代码直接创建，drizzle-kit migrate() 仅执行 journal 中的未应用迁移；0023 的 ALTER TABLE 对已存在表无影响，Task 2 Step 4 明确验证 |
| T-75-GAP-SC | Tampering | npm/pip/cargo installs | accept | 本 plan 无新包安装 |
</threat_model>

<verification>
- drizzle/0023_phase75_homework_upgrade.sql 物理存在，含 ALTER TABLE ADD COLUMN dueDate
- drizzle/meta/_journal.json 含 0023 条目（idx=8，version="6"）
- drizzle/meta/0023_snapshot.json 存在，prevId 指向 0007_snapshot.json
- 数据库 plugin_owned_homework_assignments 表含 dueDate TEXT 列
- 既有数据零丢失
- lifecycle.test.ts 10/10 通过
- cross-plugin-regression.test.ts 全绿
- pnpm verify:phase75 exit 0
- drizzle-kit migrate 不因 0017 不在 journal 中而报错
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
