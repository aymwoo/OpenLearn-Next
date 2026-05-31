---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - scripts/seed-test-accounts.ts
  - scripts/bootstrap-dev-db.ts
autonomous: true
requirements: []
must_haves:
  truths:
    - "开发者执行一条命令后，本地 SQLite 会自动完成 schema 初始化与开发测试数据注入"
    - "现有 teacher@example.com / student@example.com 账号继续可用，并且挂到同一套开发学校数据上"
    - "开发环境中至少存在一套可直接用于课程/课堂联调的班级、课程、课时与发布版本数据"
    - "重复执行脚本不会不断追加重复的开发 seed 数据"
  artifacts:
    - path: "package.json"
      provides: "一条面向开发环境的数据库 bootstrap 命令入口"
    - path: "scripts/seed-test-accounts.ts"
      provides: "可被其他脚本复用的测试账号 seed 能力，同时保留独立执行能力"
    - path: "scripts/bootstrap-dev-db.ts"
      provides: "最小可重复执行的开发数据库初始化与课堂/课程 seed 脚本"
  key_links:
    - from: "package.json"
      to: "scripts/bootstrap-dev-db.ts"
      via: "npm script"
      pattern: "bootstrap.*dev|dev.*bootstrap"
    - from: "scripts/bootstrap-dev-db.ts"
      to: "scripts/seed-test-accounts.ts"
      via: "import and call exported seed helper"
      pattern: "seedTestAccounts"
    - from: "scripts/bootstrap-dev-db.ts"
      to: "src/db/schema.ts"
      via: "deterministic inserts/updates for school -> class -> course -> lesson chain"
      pattern: "classes|courses|lessons|lessonSteps|publishedLessonVersions"
---

<objective>
规划一个最小可用的开发数据库 bootstrap：用一条命令完成本地 SQLite schema 初始化，并在复用现有测试账号 seed 的前提下，补齐一套最基础、可重复执行的课堂/课程测试数据。

Purpose: 让开发环境从“只有账号”升级为“有账号且有可联调教学数据”，但仍保持单脚本、低抽象、无新基础设施。
Output: 一个可复用的账号 seed 导出、一个开发 bootstrap 脚本、一个 package.json 命令入口。
</objective>

<execution_context>
@/home/wuxf/Develop/OpenLearn-Next/.opencode/get-shit-done/workflows/execute-plan.md
@/home/wuxf/Develop/OpenLearn-Next/.opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@AGENTS.md
@package.json
@drizzle.config.ts
@src/db/index.ts
@src/db/schema.ts
@scripts/seed-test-accounts.ts

<interfaces>
From src/db/index.ts:
```ts
export const db = drizzle(client, { schema });
```

From scripts/seed-test-accounts.ts:
```ts
const TEST_SCHOOL_NAME = "OpenLearn 测试学校";
const TEST_ACCOUNTS = [
  { name: "测试教师", email: "teacher@example.com", password: "password" },
  { name: "测试学生", email: "student@example.com", password: "password" },
] as const;
```

From src/db/schema.ts (seed chain to reuse, not redesign):
```ts
export const schools;
export const memberships;
export const classes;
export const classMembers;
export const courses;
export const courseClasses;
export const courseEnrollments;
export const lessons;
export const lessonSteps;
export const publishedLessonVersions;
export const classroomSessions;
export const classroomParticipants;
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: 把现有测试账号 seed 收敛成可复用入口</name>
  <files>scripts/seed-test-accounts.ts</files>
  <action>直接在现有脚本上做最小改造：导出 `seedTestAccounts()`（必要时返回 school / teacher / student 的主键与基础信息），并保留当前 `npm run seed:test-accounts` 的独立 CLI 行为。不要引入新的 seed framework、基类、fixtures 目录或共享抽象层；只把当前脚本从“只能自执行”提升为“既能自执行，也能被开发 bootstrap 脚本调用”。</action>
  <verify>
    <automated>tsx scripts/seed-test-accounts.ts</automated>
  </verify>
  <done>`seed-test-accounts.ts` 仍可独立执行，且新的开发 bootstrap 脚本可以直接 import 同一份账号 seed 逻辑，不需要复制账号创建代码。</done>
</task>

<task type="auto">
  <name>Task 2: 添加单命令开发数据库 bootstrap 脚本</name>
  <files>package.json, scripts/bootstrap-dev-db.ts</files>
  <action>新增一个面向开发环境的 package script（如 `db:bootstrap:dev`），用现有 `drizzle-kit push` + `tsx scripts/bootstrap-dev-db.ts` 完成 schema 初始化与 seed；在 `scripts/bootstrap-dev-db.ts` 中复用 Task 1 导出的 `seedTestAccounts()`，并只补最小正确数据链：同一所测试学校下的一条开发班级、一门课程、课程与班级关联、学生选课、一节课、2-3 个 lesson steps、一个 published lesson version；如课堂运行页当前最小联调确实依赖 runtime 数据，则再补一条 live classroom session 与 student participant，但不要扩成完整多班级/多课程 seed 体系。所有写入都必须按固定 name/title/email 查询后 update-or-create，或在受控范围内先清理再重建子记录，确保重复执行不产生重复 seed。</action>
  <verify>
    <automated>DB_FILE_NAME=file:/tmp/openlearn-dev-bootstrap.db npm run db:bootstrap:dev</automated>
  </verify>
  <done>仓库中存在一条单命令开发 bootstrap 入口；首次执行能完成 schema + seed，且生成的最小数据足以支撑本地课程/课堂页面联调。</done>
</task>

<task type="auto">
  <name>Task 3: 为重复执行建立最小回归闭环</name>
  <files>scripts/bootstrap-dev-db.ts, package.json</files>
  <action>在不新增额外验证脚本文件的前提下，给 bootstrap 过程补齐可观察的完成信号：命令结束时输出本次准备好的 canonical 开发数据（学校、班级、课程、课时/发布版本，以及 teacher/student 登录账号）；同时把验证命令设计成“同一 DB 连续跑两次”再做一次内联查询断言，确认 canonical 数据只保留一套，不会因二次执行产生重复班级、课程、课时或发布版本。避免为此再造第二套 seed 逻辑，验证仍围绕同一 `scripts/bootstrap-dev-db.ts` 完成。</action>
  <verify>
    <automated>DB_FILE_NAME=file:/tmp/openlearn-dev-bootstrap.db npm run db:bootstrap:dev && DB_FILE_NAME=file:/tmp/openlearn-dev-bootstrap.db npm run db:bootstrap:dev && DB_FILE_NAME=file:/tmp/openlearn-dev-bootstrap.db tsx --eval "import { count, eq } from 'drizzle-orm'; import { db } from './src/db/index.ts'; import { schools, classes, courses, lessons, publishedLessonVersions } from './src/db/schema.ts'; const [school] = await db.select({ value: count() }).from(schools).where(eq(schools.name, 'OpenLearn 测试学校')); const [klass] = await db.select({ value: count() }).from(classes).where(eq(classes.name, '开发测试班级')); const [course] = await db.select({ value: count() }).from(courses).where(eq(courses.title, '开发测试课程')); const [lesson] = await db.select({ value: count() }).from(lessons).where(eq(lessons.title, '开发测试课时')); const [published] = await db.select({ value: count() }).from(publishedLessonVersions); if (school?.value !== 1 || klass?.value !== 1 || course?.value !== 1 || lesson?.value !== 1 || !published?.value) process.exit(1);"</automated>
  </verify>
  <done>同一开发数据库连续执行 bootstrap 两次后，canonical 学校/班级/课程/课时数据仍保持单份，命令输出也能直接告诉开发者接下来该用哪些账号和数据进行联调。</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| CLI → SQLite DB | 开发脚本直接写入本地数据库，若幂等控制失效会污染 seed 数据 |
| Hardcoded dev seed → app auth/runtime | 测试账号与课堂数据会被本地应用直接消费，必须明确限定为开发用途 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-01 | T | `scripts/bootstrap-dev-db.ts` | mitigate | 使用固定 canonical 标识与受控 update-or-create / scoped replace，避免重复执行造成数据篡改式膨胀 |
| T-quick-02 | I | `scripts/seed-test-accounts.ts` | accept | 仅为本地开发测试账号，无生产凭据；在日志与脚本命名中明确 dev/test 用途即可 |
| T-quick-03 | D | `package.json` bootstrap 命令 | mitigate | 命令只依赖现有 Drizzle + SQLite + tsx，不引入额外服务或长链依赖，保持快速可恢复 |
</threat_model>

<verification>
- `npm run seed:test-accounts` 继续可独立运行。
- `npm run db:bootstrap:dev` 能在空 DB 上完成 schema + seed。
- 同一 DB 连续执行两次 bootstrap 后，开发学校/班级/课程/课时仍保持单份 canonical 数据。
- 命令输出明确给出 teacher@example.com / student@example.com 以及对应开发课程链路，便于本地联调。
</verification>

<success_criteria>
仓库新增了一条真正可用的开发数据库初始化命令；它复用现有测试账号 seed，而不是复制或另起一套体系；它只补一套最小课堂/课程数据，不扩成通用 seed 平台；并且可重复执行、不产生重复数据。</success_criteria>

<output>
After completion, create `.planning/quick/260507-kdx-dev-db-bootstrap/260507-kdx-SUMMARY.md`
</output>
