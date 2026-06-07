---
phase: 67-declarative-plugin-owned-data-model-migration-proof
reviewed: 2026-06-02T09:28:13Z
depth: deep
files_reviewed: 11
files_reviewed_list:
  - src/lib/dto/plugin-data-model.ts
  - src/lib/dto/plugin-data-model.test.ts
  - plugins/quiz-sample/data-model.ts
  - scripts/compile-plugin-data-model.ts
  - scripts/gate-no-runtime-ddl.ts
  - scripts/verify-phase67-plugin-owned-data.ts
  - src/db/schema/generated/plugin-owned/quiz.ts
  - src/db/schema/generated/index.ts
  - src/db/schema.ts
  - drizzle/0005_lean_sage.sql
  - package.json
findings:
  critical: 1
  critical_resolved: 1
  warning: 6
  info: 5
  total: 12
status: blocker_resolved
resolution:
  CR-01: fixed in 5e215ed — TableSpecSchema.name 施加 IDENTIFIER 正则，新增 3 个注入边界测试，verify:phase + 全量 1424 测试通过。
  warnings: deferred（非 BLOCKER，记入 deferred-items / 后续 phase 处理）。
---

# Phase 67: 代码审查报告

**Reviewed:** 2026-06-02T09:28:13Z
**Depth:** deep（跨文件：声明 meta-schema → 编译器 → 生成产物 → 迁移 → 验证脚本全链路）
**Files Reviewed:** 11
**Status:** issues_found

## Summary

本 phase 的核心架构（「compile, don't execute」声明式数据模型 + 迁移优先 + 物理验证）方向正确，
生成产物 `quiz.ts`、迁移 `0005_lean_sage.sql`、schema.ts 三者在表名/列/索引/唯一约束/级联 FK 上**逐项对齐**，
`dataVersion DEFAULT 1` 也与迁移一致。

但**安全边界存在一处可被利用的注入缺口**：meta-schema 对列名（`name`）施加了 `IDENTIFIER` 正则，
却**唯独漏掉了表名（`TableSpec.name`）**的标识符校验。编译器把未净化的表名经 `toCamelCase` 直接拼成
`export const <id> = ...` 的裸标识符写入生成 TS，因此一个恶意/畸形的声明表名可向受治理的 schema 文件**注入任意 TS 代码**，
直接违背「插件禁止动态执行」与「声明面不可逃逸」的红线（CR-01，BLOCKER）。

此外，零运行时 DDL 静态 gate 作为「证明无运行时 DDL」的执法点，其逐行正则策略可被**跨行/变量拆分**轻易绕过，
naive 的 `//` 注释剥离会破坏含 `//` 的字符串行，self-exempt 的 `endsWith` 过宽——这些削弱了该 gate 所声称的保证强度（WR-01/02/03）。
建议在合并前修复 CR-01，并将 gate 的保证措辞从「证明」降级为「启发式拦截」或补强检测。

---

## Critical Issues

### CR-01: 表名缺失 `IDENTIFIER` 校验 → 经 `toCamelCase` 向生成 TS 注入任意代码

> **✅ RESOLVED（commit `5e215ed`）：** `TableSpecSchema.name` 已改为 `z.string().regex(IDENTIFIER)`，
> 与列名/`pluginKey` 同源把守。恶意表名（带 `plugin_owned_` 前缀但含 `;`/空格/`()` 等）在 `name` 字段
> 即被 `invalid_format` 拒，无法进入编译器。新增 3 个边界测试（注入片段拒绝 / 非标识符字符拒绝 /
> 合法 `plugin_owned_quiz_questions` 不误伤），`verify:phase` 4 关全过，全量 1424/1424 测试通过。
> 下方为原始审查记录，留档备查。

**File:** `src/lib/dto/plugin-data-model.ts:79` + `scripts/compile-plugin-data-model.ts:102,128`

**Issue:**
meta-schema 是声明面的「唯一安全边界」。`ColumnSpecSchema.name`（`plugin-data-model.ts:54`）与
`pluginKey`（`:137`）都用 `IDENTIFIER = /^[a-z][a-zA-Z0-9_]*$/` 把守，但 `TableSpecSchema.name`（`:79`）
**只有** `z.string().min(1)`，再加 superRefine 里的「前缀 + schoolId + DDL 关键字扫描」。

编译器随后把这个未净化的表名直接转成裸标识符：

```
// compile-plugin-data-model.ts
const exportName = toCamelCase(table.name);          // L102，未做标识符净化
...
`export const ${exportName} = sqliteTable(`,         // L128，裸拼接进生成 TS
```

`toCamelCase` 只按 `/[_-]/` 切分（`:43-51`），不会移除 `;`、空格、`()` 等字符。构造一个声明表名：

```
name: "plugin_owned_x; maliciousImport()"
```

- 通过 `startsWith("plugin_owned_")` ✓
- 不含 `CREATE|ALTER|DROP`，绕过 `DDL_KEYWORDS` 扫描 ✓
- `min(1)` ✓

`toCamelCase` 产出 `"pluginOwnedX; maliciousImport()"`，最终写入生成文件：

```ts
export const pluginOwnedX; maliciousImport() = sqliteTable(
```

该生成文件会被 barrel（`src/db/schema/generated/index.ts`）→ `src/db/schema.ts` 再被 app / `drizzle-kit generate` import，
**import 时即执行 `maliciousImport()`**。这是从声明数据直达受治理 schema 的任意代码执行（RCE），
正是威胁模型 T-67-07「声明面不可表达跨界逃逸」要堵死的路径。列名做了正则、表名没做，属一致性遗漏。

**Fix:** 在 `TableSpecSchema.name` 上施加与列名同等的标识符约束（去掉前缀后仍须为安全标识符），并在编译器侧对
`exportName` 做防御性断言：

```ts
// plugin-data-model.ts —— 表名须为安全标识符
name: z.string().regex(/^plugin_owned_[a-z][a-zA-Z0-9_]*$/, { error: () => "MISSING_OWNED_PREFIX" }),

// compile-plugin-data-model.ts renderTable() 起始处，defense-in-depth
if (!/^[a-z][a-zA-Z0-9]*$/.test(exportName)) {
  throw new Error(`unsafe export identifier derived from table name: ${table.name}`);
}
```

---

## Warnings

### WR-01: 零运行时 DDL gate 可被「跨行/变量拆分」绕过

**File:** `scripts/gate-no-runtime-ddl.ts:108-111`

**Issue:**
`executedLiteralDdl` 要求 DDL 正则与执行通道正则**在同一行**同时命中；`interpolatedDdl` 要求
`CREATE|ALTER|DROP` 关键字与反引号在同一行。把构造与执行拆成两行即可逃逸：

```ts
const ddl = "CREATE TABLE plugin_evil (...)"; // 本行有 DDL 但无执行通道 → 不告警
client.execute(ddl);                          // 本行有执行通道但无 DDL 关键字 → 不告警
```

模板插值同理：`const verb = "CREATE";` 再 `` const sql = `${verb} TABLE ${n}` `` 第二行无 `CREATE` 字面量。
该 gate 是 phase 声称「证明无任何运行时 DDL 路径」的执法点（文件头注释），逐行正则无法兑现「证明」级保证。

**Fix:** 至少补一条「执行通道行的实参变量名回溯」或对全文件做跨行的「DDL 字面量 → 执行通道」数据流近似；
或将注释/计划中的措辞从「proves no runtime code path executes DDL」降级为「heuristic deny-list」，避免误导后续审计。

### WR-02: naive `//` 注释剥离会截断含 `//` 的字符串行，造成 gate 漏检

**File:** `scripts/gate-no-runtime-ddl.ts:31-36`（`verify-phase67...ts:32-37` 同款）

**Issue:**
`line.replace(/\/\/.*$/, "")` 不区分注释与字符串字面量。任何含 `//` 的字符串（如 URL `"https://..."`）
会被从 `//` 处整行截断，截断点之后的内容**不参与扫描**。攻击者可把 DDL 执行片段排在同一行某个含 `//`
的字符串之后，使其落入被剥离区间而漏检；正常代码也会产生误报/漏报。

**Fix:** 用最小词法器跳过字符串/模板字面量再剥注释，或改用 AST（`typescript` 已是依赖）做 token 级扫描。

### WR-03: gate self-exempt 的 `endsWith(SELF_BASENAME)` 过宽

**File:** `scripts/gate-no-runtime-ddl.ts:50`

**Issue:**
```ts
if (relativePosixPath.endsWith(`/${SELF_BASENAME}`) || relativePosixPath.endsWith(SELF_BASENAME)) return false;
```
后半段裸 `endsWith("gate-no-runtime-ddl.ts")` 会把 `plugins/evil/x-gate-no-runtime-ddl.ts` 之类文件也豁免出扫描范围，
形成「按命名约定即可免检」的旁路。

**Fix:** 去掉裸 `endsWith` 分支，仅保留带分隔符/精确相对路径的判断（`relativePosixPath === "scripts/gate-no-runtime-ddl.ts"`）。

### WR-04: `default` 未与列 `type` 做一致性校验；enum 默认值不在 `enumValues` 内也放行

**File:** `src/lib/dto/plugin-data-model.ts:57` + `scripts/compile-plugin-data-model.ts:81-85`

**Issue:**
`default: z.union([z.string(), z.number(), z.boolean()]).optional()` 与列 `type` 完全解耦。
`type: "integer"` 却 `default: "abc"`、或 `type: "enum", enumValues:["A","B"]` 却 `default:"Z"` 均能通过校验，
编译器照单全收地渲染 `.default("abc")` / `.default("Z")`，把类型错误下沉到 drizzle 生成/运行期。
该 `.default()` 渲染路径在 canonical quiz 模型中**完全未被覆盖**（quiz 无任何 default 列），属未测试的潜在缺陷。

**Fix:** 在 `ColumnSpecSchema.superRefine` 中按 `type` 校验 `default`（integer→number、boolean→boolean、
text→string、enum→必须 ∈ enumValues、timestamp→拒绝或限定数值）。

### WR-05: 保留列名被编译器静默丢弃，meta-schema 不拒绝也不告警

**File:** `scripts/compile-plugin-data-model.ts:40,104-106`

**Issue:**
`RESERVED_COLUMNS = {id, schoolId, pluginId, createdAt, updatedAt}`，`renderTable` 用
`.filter((c) => !RESERVED_COLUMNS.has(c.name))` 直接剔除同名声明列。meta-schema 对此**无任何拒因**。
若插件声明了 `createdAt: text` 或 `id: text` 作为其业务列，会被**静默删除**并替换为编译器注入版本，
作者无从察觉数据模型丢列。`schoolId` 还被特殊对待：声明里必须有它（满足 `MISSING_SCHOOL_SCOPE`），
却又会被丢弃——形成「必须声明、声明即弃」的反直觉契约。

**Fix:** 在 meta-schema 把 `id/pluginId/createdAt/updatedAt` 列为非法声明列（新增 `RESERVED_COLUMN_NAME` 拒因），
对 `schoolId` 则文档化为「scope 标记列」并校验其 `type: "text"`，避免静默丢弃。

### WR-06: 去重唯一约束未带 `schoolId` scope，存在跨租户写冲突面

**File:** `plugins/quiz-sample/data-model.ts:51`（生成于 `quiz.ts:40`，迁移 `0005_lean_sage.sql:31`）

**Issue:**
`uniques: [{ columns: ["classroomSession", "student", "question"] }]` 不含 `schoolId`。复合索引（`:49`）已带
`schoolId`，唯一约束却没有。AGENTS 约束要求 plugin-owned 表「必须携带 schoolId scope」。由于 plugin-owned 表
不能 FK 到 core，`classroomSession` 只是插件提供的 text，无法保证跨校全局唯一——理论上 school B 的写入可因
`(classroomSession, student, question)` 撞键被 school A 已存在行阻塞，构成跨租户写干扰/存在性泄漏（虽 UUID 实际碰撞概率低）。

**Fix:** 将去重唯一约束改为 `["schoolId", "classroomSession", "student", "question"]`，保持租户隔离一致。

---

## Info

### IN-01: `RAW_SQL_FORBIDDEN` 的 DDL 关键字扫描是弱启发式

**File:** `src/lib/dto/plugin-data-model.ts:49,105`

`DDL_KEYWORDS = /\b(CREATE|ALTER|DROP)\b/i` 仅覆盖三词，`INSERT/DELETE/UPDATE/;/--` 不在内；`\b` 在 `CREATE_X`
这类带下划线场景会漏配；同时会对合法文本（如某 enum 值含 "Create"）误报。它是结构化 schema 之上的 defense-in-depth，
真正的安全靠结构约束，措辞上不应当作主要防线依赖。

### IN-02: gate 仅扫描 `src/scripts/plugins`，遗漏仓库根级运行时文件

**File:** `scripts/gate-no-runtime-ddl.ts:17`

`SCAN_ROOTS = ["src","scripts","plugins"]` 未含根级 `server.ts` 等运行时入口。若未来根级文件执行 DDL 将漏检。
建议显式纳入根级 `*.ts` 或在注释中标注该边界为已知取舍。

### IN-03: 声明的 `schoolId` 列类型/属性被编译器忽略

**File:** `scripts/compile-plugin-data-model.ts:40,110`

meta-schema 只要求存在名为 `schoolId` 且 `notNull` 的列，不限制其 `type`。编译器无视声明、固定注入
`text("schoolId").notNull().references(...)`。声明 `schoolId: integer` 也会通过校验却被替换为 text，易误导。
与 WR-05 合并修复为佳。

### IN-04: drift guard 依赖 git 跟踪，未跟踪的生成文件可逃过 `git diff`

**File:** `scripts/verify-phase67-plugin-owned-data.ts:190-194`

`git diff --exit-code src/db/schema/generated` 不会报告**未被 git 跟踪**的新生成文件。若新插件生成的文件尚未
`git add`，重编译产生新文件时漂移检测可能漏判。建议追加 `git status --porcelain` 对 untracked 文件兜底。

### IN-05: gate 不剥离块注释 `/* */`，可能产生误报

**File:** `scripts/gate-no-runtime-ddl.ts:31`

`withoutLineComments` 只处理 `//` 行注释。块注释中的 `` `CREATE ...` `` 示例会被当作 interpolatedDdl 误报为违规。
当前代码库未触发，但作为示例/文档放入受扫描目录时会误伤。

---

_Reviewed: 2026-06-02T09:28:13Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
