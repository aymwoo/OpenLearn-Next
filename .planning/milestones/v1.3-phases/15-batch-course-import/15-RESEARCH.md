# Phase 15: Batch course import - Research

**Researched:** 2026-05-15
**Domain:** Teacher-scoped course batch import workflow in Next.js 16 / React 19.2 / SQLite
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Phase 15 首发导入格式固定为 `CSV`，不同时引入 XLSX 解析路径。
- **D-02:** 课程导入模板最终字段固定为 `标题 + 学科 + 年级 + 课程状态`。
- **D-03:** `标题 + 学科 + 年级` 是课程行的基础业务字段；新增 `课程状态` 列是为了保住真实的 `updated` 结果语义。
- **D-04:** 批量导入模板不包含班级关联列；`COURSE-06` 的 class association 继续留在课程详情页显式处理。

### Matching and duplicate handling
- **D-05:** 同一学校内，导入行命中已有课程的匹配键固定为 `标题 + 学科 + 年级`。
- **D-06:** 当前 `courses` schema 没有 school-scoped unique key，因此 Phase 15 需要在导入预览阶段显式做应用层重复检测，不能依赖数据库唯一约束兜底。
- **D-07:** 当一行命中已有课程时，首发不自动覆盖；预览台必须把它识别为“命中已有课程”，并允许教师逐行选择 `更新` 或 `跳过`。
- **D-08:** 同一份 CSV 内若两行落到同一个匹配键，固定视为批内冲突并阻断该行，不采用“最后一行生效”或“第一行生效”的隐式覆盖规则。

### Update semantics
- **D-09:** 为了保住真实 `updated` 结果，命中已有课程后的首发可更新字段固定为 `课程状态`。
- **D-10:** 如果导入行命中已有课程且 `课程状态` 与现有值一致，则该行结果记为 `skipped`，原因是“已存在且无变更”。
- **D-11:** 如果导入行命中已有课程且教师在预览台选择 `更新`，则仅更新课程状态；不在首发批量覆盖标题、学科或年级。
- **D-12:** 对于全新课程行，即使模板提供 `课程状态` 列，首发创建时也一律按 `draft` 新建；状态列只用于命中已有课程时的更新路径。

### Review and apply workflow
- **D-13:** 上传 CSV 后必须先进入独立导入审核台，再执行应用动作；不能在上传后直接写入课程数据。
- **D-14:** 审核台沿用项目已存在的 `draft -> row-level review -> explicit apply` 心智模型，而不是把 `/teacher/courses` 首页改造成临时审核页。
- **D-15:** 首发应用粒度固定为“整批统一应用”；教师先完成预览与命中行选择，再执行一次整批 apply。
- **D-16:** 整批 apply 允许部分成功：问题行保持 `skipped` 或 `failed`，其余可通过行照常创建或更新。
- **D-17:** 审核台中“命中已有课程”的行虽然是逐行决策，但该决策只用于标记该行在整批 apply 中是 `更新` 还是 `跳过`，不引入逐行单独提交。

### Result feedback and downstream flow
- **D-18:** 应用完成后，首发结果视图固定为“结果概览 + 行级结果页”，不能只用 toast 或仅导出文件替代产品内反馈。
- **D-19:** 结果概览必须显式区分 `created`、`updated`、`skipped`、`failed` 四类行数，并保留逐行原因。
- **D-20:** 结果页的主后续动作固定回到 `/teacher/courses`，继续衔接现有课程中心工作流。

### Existing constraints to preserve
- **D-21:** Phase 15 继续复用 `course-authoring` 的 `DAL + Server Actions` 边界，不新建平行课程导入子系统。
- **D-22:** 所有导入读写继续保持 teacher-owned / school-scoped 权限模型，不能导入同校其他教师的课程，也不能跨学校写入。
- **D-23:** Phase 15 不能绕过 Phase 14 已锁定的显式 lifecycle / delete / class association 语义；导入只处理课程实体与状态，不把独立动作重新混回批量流程。

### the agent's Discretion
- 审核台采用独立页面还是课程域下的独立子路由，只要保持“独立审核台”而不是首页内嵌，可由 planner 按现有课程路由结构收敛。
- 行级结果页采用 card list、table-like rows 还是 grouped sections，可由 planner 按现有 teacher surface 语言与导入行密度自行收敛。
- `failed` 与 `skipped` 的中文文案细节、badge 视觉层级和统计卡布局，可由 planner/implementer 基于现有 design system 调整，但必须保留四类结果语义。

### Deferred Ideas (OUT OF SCOPE)
- XLSX 首发支持 — 未来若教师确有强需求可再扩展，目前先不引入第二套解析链路。
- 模板内一并导入班级关联 — 超出本阶段边界，继续留在 Phase 14 已完成的课程详情显式关联工作流。
- 外部系统课程导入或同步（Moodle / Notion / connector）— 仍属 v2 / 后续里程碑候选，不并入当前本地结构化导入范围。
- 在批量导入中覆盖课程标题、学科、年级等身份字段 — 首发先锁为 status-only update，避免匹配键与可更新字段混淆。
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COURSE-08 | Teacher can import multiple courses from a structured batch file and receive row-level validation results before changes are applied. | Use CSV + Papa Parse on the client, but make server-side Zod validation and persisted `draft -> review -> apply` staging authoritative; reuse the schedule import batch/row pattern and independent review page pattern. [VERIFIED: codebase grep] [CITED: https://www.papaparse.com/docs] [VERIFIED: Context7 /colinhacks/zod] |
| COURSE-09 | Teacher can review import outcomes as created, updated, skipped, or failed rows without silently creating duplicates. | Use app-layer duplicate detection on `title + subject + grade` within school scope because `courses` has no school-scoped unique key; re-check conflicts at apply time, and surface explicit created / updated / skipped / failed counters plus row reasons. [VERIFIED: codebase grep] [VERIFIED: npm registry] [VERIFIED: Context7 /vercel/next.js] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- 必须继续使用 Next.js 16 App Router、React 19.2、Turbopack；本阶段不应引入平行框架或替代运行时。 [VERIFIED: AGENTS.md]
- UI 组件禁止直连数据库；课程导入的所有读写必须经过 DAL 和 Server Actions。 [VERIFIED: AGENTS.md]
- Node.js 20.9+ 是主运行时，Edge Runtime 仅用于 SSE；课程导入解析、预览、apply 应留在 Node-backed Server Actions / DAL。 [VERIFIED: AGENTS.md] [VERIFIED: local tool versions]
- Next.js 16 写入后必须显式更新或失效 cache tags；课程导入完成后必须更新 `teacher-courses:*` 与相关 `course:*` 标签。 [VERIFIED: AGENTS.md] [VERIFIED: codebase grep] [VERIFIED: Context7 /vercel/next.js]
- 数据库仍是 SQLite-first；如果新增 `courseImportBatch` / `courseImportRow` 一类表，关系必须 `onDelete: cascade`。 [VERIFIED: AGENTS.md]
- 设计必须继续参考 Stitch 项目 `5322129002350954765` 与 `DESIGN.md`；结果页和审核台不能退化为通用后台表格风格。 [VERIFIED: AGENTS.md]

## Summary

本阶段最稳妥的实现方式，是把“课程批量导入”做成**课程域内部的持久化 staging workflow**：浏览器负责读取本地 CSV 并给出快速反馈，服务端负责重新校验、做同校重复检测、保存草稿批次与行级状态，然后在独立审核台完成整批 apply。这个方向与现有 schedule import 的 `draft -> row review -> explicit apply` 模式一致，也符合 D-13~D-21 的锁定边界。 [VERIFIED: codebase grep] [VERIFIED: AGENTS.md]

现有课程域已经有稳定的 teacher-owned / school-scoped DAL 写路径：`createCourseForTeacherScoped()` 负责新建草稿课程，`updateCourseStatusForTeacherScoped()` 负责状态变更，`course-authoring-actions.ts` 已固定 `safeParse -> assertActiveTeacher -> DAL -> updateTag` 的动作形状。Phase 15 应直接复用这些写边界，而不是新造一条绕过权限的批处理入口。 [VERIFIED: codebase grep]

真正的规划难点不在“怎么读 CSV”，而在**如何同时满足 school-scope duplicate detection 与 teacher-owned mutation rules**。预览阶段必须在同一学校范围内用 `标题 + 学科 + 年级` 做命中检测，但 apply 阶段仍只能更新当前教师拥有的课程；因此 planner 需要明确一套行级分类矩阵，尤其要决定“命中同校其他教师课程”的行落到 `failed` 还是 `skipped`。这点在当前上下文里没有被直接锁死，是本研究唯一需要用户/讨论阶段确认的核心语义空白。 [VERIFIED: codebase grep] [ASSUMED]

**Primary recommendation:** 采用“CSV 客户端解析 + 服务端权威校验 + 课程域持久化批次/行 staging + 独立审核台 + 整批 apply + 结果页回课程中心”的单一路径。 [VERIFIED: codebase grep] [CITED: https://www.papaparse.com/docs] [VERIFIED: Context7 /vercel/next.js]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 本地 CSV 文件选择与即时解析 | Browser / Client | Frontend Server (SSR) | Papa Parse 官方支持直接解析浏览器 `File` 对象；这一步适合做即时 UX，但不能代替服务端校验。 [CITED: https://www.papaparse.com/docs] |
| 批次草稿持久化与行级预览状态计算 | API / Backend | Database / Storage | 重复检测、teacher scope 判定、状态分类属于业务逻辑；数据库只存储批次与行 truth。 [VERIFIED: codebase grep] |
| 同校重复检测与命中分类 | API / Backend | Database / Storage | `courses` 目前只有 `schoolId` / `ownerId` 索引，没有 school-scoped unique key，重复检测必须在应用层完成。 [VERIFIED: codebase grep] |
| 实际创建/更新课程 | API / Backend | Database / Storage | 课程写入已固定通过 teacher-owned DAL；UI 不允许直接操作数据库。 [VERIFIED: codebase grep] [VERIFIED: AGENTS.md] |
| 审核台与结果页渲染 | Frontend Server (SSR) | Browser / Client | 页面数据应由服务端读 DTO 后渲染，客户端只承载选择与提交交互。 [VERIFIED: codebase grep] |
| 写后读一致性与回流课程中心 | Frontend Server (SSR) | API / Backend | Next.js 16 推荐在 Server Actions 中用 `updateTag()` 保证 read-your-own-writes。 [VERIFIED: Context7 /vercel/next.js] |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | `16.2.4` in repo; latest registry `16.2.6` (published 2026-05-07) | App Router page flow, Server Actions, cache invalidation | 项目已固定 Next.js 16；`use cache` / `cacheTag` / `updateTag` 是当前官方路径，适合审核页与 apply 后结果刷新。 [VERIFIED: package.json] [VERIFIED: npm registry] [VERIFIED: Context7 /vercel/next.js] |
| Papa Parse | `5.5.3` (latest registry, published 2025-05-19) | 浏览器本地 CSV 解析 | 官方文档明确支持 `Papa.parse(file, config)`、`header: true`、`skipEmptyLines`、`complete` 回调，正好匹配上传模板场景。 [VERIFIED: package.json] [VERIFIED: npm registry] [CITED: https://www.papaparse.com/docs] |
| Zod | `4.4.3` (latest registry, published 2026-05-04) | 严格 row/batch/action 校验 | 当前仓库已广泛采用 `safeParse` 与 strict object contracts；Zod 官方文档直接覆盖 `strictObject`、`safeParse`、错误格式化。 [VERIFIED: package.json] [VERIFIED: npm registry] [VERIFIED: Context7 /colinhacks/zod] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@/lib/dal/course-authoring` | repo current | 课程 teacher-scoped 写边界 | 新建课程时复用 `createCourseForTeacherScoped()`；命中更新时只走课程状态写路径。 [VERIFIED: codebase grep] |
| `@/features/schedule/import/*` | repo current | 可复用的 staging / review / apply 模式参考 | 复用其批次+行、审核台、apply 前重检、部分成功语义；不要复用其 schedule-specific schema。 [VERIFIED: codebase grep] |
| Vitest | `4.1.5` in repo | DTO / DAL / action / surface regression | 当前仓库测试主干已建立在 Vitest，上手成本最低。 [VERIFIED: package.json] [VERIFIED: codebase grep] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSV + Papa Parse | XLSX + SheetJS | 这会引入第二套解析路径，直接违背 D-01。 [VERIFIED: CONTEXT.md] |
| 持久化 batch/row staging | 仅在 modal 内保留临时 preview state | 会丢失审核恢复、结果回看、审计与部分成功能力；与现有 schedule import 模式背离。 [VERIFIED: codebase grep] |
| 应用层 duplicate scan + apply-time recheck | 仅依赖数据库唯一约束 | `courses` 没有 school-scoped unique key，单靠 DB 约束无法满足 D-06。 [VERIFIED: codebase grep] |

**Installation:** 当前仓库已包含 `next`、`papaparse`、`zod`，本阶段按现有依赖即可推进，不应为了导入而新增第二解析库。 [VERIFIED: package.json]

**Version verification:** `next@16.2.6` 是 npm 当前最新稳定版，发布时间 2026-05-07；`papaparse@5.5.3` 发布时间 2025-05-19；`zod@4.4.3` 发布时间 2026-05-04。仓库当前分别锁在 `next@16.2.4`、`papaparse@5.5.3`、`zod@4.4.3`。对 Phase 15 来说应优先复用仓库已锁版本，而不是顺手升级基础框架。 [VERIFIED: npm registry] [VERIFIED: package.json]

## Architecture Patterns

### System Architecture Diagram

```text
Teacher uploads CSV
        ↓
Browser upload entry (/teacher/courses)
        ├─ Papa.parse(file, { header: true, skipEmptyLines: true })
        ├─ normalize BOM / Chinese headers / trim values
        └─ POST rows + sourceLabel to draftCourseImportAction
        ↓
Server Action: draftCourseImportAction
        ↓
Course import DAL
        ├─ Zod validate batch + rows
        ├─ detect duplicate keys inside same CSV
        ├─ query same-school courses by matching key
        ├─ classify row => create / matched / conflict / invalid
        └─ persist courseImportBatch + courseImportRow
        ↓
Independent review page (/teacher/courses/import/[batchId])
        ├─ teacher picks update/skip for matched rows
        ├─ review created / matched / invalid / blocked rows
        └─ submit one explicit apply action
        ↓
Server Action: applyCourseImportAction
        ├─ re-check duplicate/match state
        ├─ create via createCourseForTeacherScoped()
        ├─ update status via teacher-scoped DAL only
        ├─ mark row result created / updated / skipped / failed
        └─ updateTag(teacher-courses, affected course tags)
        ↓
Result page + return CTA to /teacher/courses
```

推荐把“导入”保持为课程域内的相邻模块，而不是继续把 `src/lib/dal/course-authoring.ts` 和 `src/actions/course-authoring-actions.ts` 做成更大的 all-in-one 文件；当前 `course-authoring.ts` 已有 588 行。 [VERIFIED: codebase grep]

### Recommended Project Structure
```text
src/
├── app/(teacher)/teacher/courses/page.tsx                  # 课程中心入口，挂导入 CTA
├── app/(teacher)/teacher/courses/import/[batchId]/page.tsx # 独立审核台 / 结果页入口
├── actions/course-import-actions.ts                        # draft/apply/result actions
├── lib/dto/course-import.ts                                # CSV row、batch、review、result DTO
├── lib/dal/course-import.ts                                # duplicate scan、preview、apply 逻辑
├── components/courses/course-import-dialog.tsx             # 上传入口
├── components/surfaces/course-import-review-surface.tsx    # 审核台 surface
└── db/schema.ts                                            # courseImportBatch / courseImportRow
```

### Pattern 1: Persisted draft → review → apply workflow
**What:** 导入第一步只生成批次草稿与行级分类结果，不直接写 `courses`。 [VERIFIED: CONTEXT.md] [VERIFIED: codebase grep]

**When to use:** 任何需要“先预览校验，再显式应用”的课程导入行为。 [VERIFIED: CONTEXT.md]

**Example:**
```typescript
// Source patterns: src/features/schedule/import/server.ts + updateTag docs
// [VERIFIED: codebase grep] [VERIFIED: Context7 /vercel/next.js]
export async function draftCourseImportAction(input: FormData) {
  const normalized = normalizeDraftCourseImportInput(input)
  const parsed = CourseImportDraftInputSchema.safeParse(normalized)
  if (!parsed.success) return validationError()

  const batch = await draftCourseImport(parsed.data) // persist batch + rows
  updateTag(cacheTags.teacherCourses(batch.actorId))
  return { ok: true, data: batch }
}
```

### Pattern 2: Two-level duplicate classification
**What:** 先查“同一 CSV 内重复键”，再查“同校已存在课程命中”；两类冲突不能混为一类。 [VERIFIED: CONTEXT.md] [VERIFIED: codebase grep]

**When to use:** 每一行都需要决定 create / matched / blocked 的时候。 [VERIFIED: CONTEXT.md]

**Example:**
```typescript
// Source pattern: schedule import classify first, approve later re-check
// [VERIFIED: codebase grep]
type MatchKey = `${string}::${string}::${string}`

function buildMatchKey(row: { title: string; subject: string; grade: string }): MatchKey {
  return `${row.title.trim()}::${row.subject.trim()}::${row.grade.trim()}`
}

// pass 1: same-file duplicates
// pass 2: same-school existing course matches
// pass 3: classify row as new / matched / blocked
```

### Pattern 3: Status-only update semantics
**What:** 新建行永远走 `draft` create；只有命中行且教师显式选择 `更新` 时，才允许写 `status`。 [VERIFIED: CONTEXT.md] [VERIFIED: codebase grep]

**When to use:** 命中已有课程后的 apply 阶段。 [VERIFIED: CONTEXT.md]

**Example:**
```typescript
// Source patterns: src/lib/dal/course-authoring.ts + context decisions
// [VERIFIED: codebase grep] [VERIFIED: CONTEXT.md]
if (row.kind === 'new') {
  await createCourseForTeacherScoped({
    schoolId,
    title: row.title,
    subject: row.subject,
    grade: row.grade,
    status: 'draft',
  })
}

if (row.kind === 'matched' && row.choice === 'update' && row.nextStatus !== row.currentStatus) {
  await updateMatchedCourseStatusForTeacherScoped({ courseId: row.courseId, status: row.nextStatus })
}
```

### Anti-Patterns to Avoid
- **上传即写库：** 直接在上传后创建/更新 `courses` 会违反 D-13，并让 `COURSE-08` 的 row-level preview 失真。 [VERIFIED: CONTEXT.md]
- **只在客户端做 preview：** 浏览器解析结果不能作为权威判断；apply 前必须由服务端重新校验并重查匹配。 [CITED: https://www.papaparse.com/docs] [VERIFIED: codebase grep]
- **把状态列用于新建课程：** D-12 已锁死“新建一律 draft”，不能因为模板有 `课程状态` 就直接写 published/archived。 [VERIFIED: CONTEXT.md]
- **把课程导入塞回 `/teacher/courses` 首页内嵌审核：** D-14 要求独立审核台，不是首页临时态。 [VERIFIED: CONTEXT.md]
- **只做 teacher-owned duplicate scan：** 成功标准要求同校范围内不能静默重复；只扫描当前教师课程会漏掉同校他人课程冲突。 [VERIFIED: CONTEXT.md] [ASSUMED]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 本地 CSV 解析 | 手写 `split(',')` / 正则 CSV parser | Papa Parse | CSV 引号、空行、BOM、header 模式、异步 FileReader 都是现成能力。 [CITED: https://www.papaparse.com/docs] |
| 行与批次输入校验 | if/else 拼装错误对象 | Zod strict schemas + `safeParse()` | Zod 已覆盖 strict object、数组嵌套与错误格式化，且仓库已有统一使用习惯。 [VERIFIED: Context7 /colinhacks/zod] [VERIFIED: codebase grep] |
| 导入 preview 生命周期 | 单个 modal 本地 state | 持久化 `batch + row` staging | 需要独立审核台、部分成功、失败原因、结果回看；schedule import 已证明该模式可行。 [VERIFIED: codebase grep] |
| 写后刷新 | 手动 `router.refresh()` 作为唯一刷新机制 | `updateTag()` + route refresh | Next.js 16 官方推荐在 Server Actions 用 `updateTag()` 做 read-your-own-writes。 [VERIFIED: Context7 /vercel/next.js] |

**Key insight:** Phase 15 的复杂度主要来自“业务语义分类”而不是“文件解析”；最值钱的复用点是 schedule import 的 staging 思路和 course-authoring 的 teacher-scoped write boundary。 [VERIFIED: codebase grep]

## Common Pitfalls

### Pitfall 1: Confusing school-scope detection with teacher-scope mutation
**What goes wrong:** 只扫描当前教师自己的课程会漏掉同校其他教师的同名课程，结果 silently create duplicates；反过来如果直接更新命中的 foreign-owned course，又会违反 D-22。 [VERIFIED: CONTEXT.md] [ASSUMED]

**Why it happens:** `getScopedCourses()` 现有实现天然是 teacher-owned 过滤，而成功标准要求 duplicate handling 发生在 school scope。 [VERIFIED: codebase grep] [VERIFIED: CONTEXT.md]

**How to avoid:** 预览阶段单独查询同校 `courses` 作为 duplicate index；apply 阶段写入仍只走 teacher-owned DAL。对 foreign-owned 命中行给出显式 blocking reason。 [VERIFIED: codebase grep] [ASSUMED]

**Warning signs:** 预览里看不到同校他人课程冲突，或 apply 后出现同校两门 `标题 + 学科 + 年级` 完全相同的课程。 [VERIFIED: CONTEXT.md] [ASSUMED]

### Pitfall 2: Treating preview classification as final truth
**What goes wrong:** 预览阶段判断“可创建/可更新”，但到 apply 时数据已变化，导致重复或状态覆盖漂移。 [VERIFIED: codebase grep] [VERIFIED: CONTEXT.md]

**Why it happens:** 预览和 apply 之间存在时间窗口；schedule import 的 approve 流程已经在写入前重新检查冲突。 [VERIFIED: codebase grep]

**How to avoid:** apply action 重新计算匹配键、重新查学校范围冲突、重新验证状态差异，再写入最终结果。 [VERIFIED: codebase grep] [ASSUMED]

**Warning signs:** 同一批次 preview 为 `ready`，apply 却产生未解释的 DB 错误或 unexpected duplicate。 [ASSUMED]

### Pitfall 3: Letting the CSV status column leak into create semantics
**What goes wrong:** 新课程直接按 CSV 中的 `课程状态` 创建成 published / archived，破坏 D-12。 [VERIFIED: CONTEXT.md]

**Why it happens:** 开发者容易复用手动表单 update contract，把 `status` 当通用字段。 [VERIFIED: codebase grep]

**How to avoid:** row classifier 先区分 `new` vs `matched`；只有 matched + teacher chose update + status changed 才允许消费状态列。 [VERIFIED: CONTEXT.md] [ASSUMED]

**Warning signs:** 导入结果里出现“created + published”，或新导入课程在课程中心直接以已发布状态出现。 [VERIFIED: CONTEXT.md]

### Pitfall 4: Reducing outcomes to a toast only
**What goes wrong:** 用户无法回看哪一行 created / updated / skipped / failed，也无法知道 why。 [VERIFIED: CONTEXT.md]

**Why it happens:** 当前课程中心已经有 toast/局部反馈路径，容易沿用到导入；但 D-18/D-19 明确要求结果视图。 [VERIFIED: CONTEXT.md] [VERIFIED: codebase grep]

**How to avoid:** 单独结果页固定包含 summary cards + row-level reasons + return-to-course-center CTA。 [VERIFIED: CONTEXT.md]

**Warning signs:** 设计稿里只有成功 toast，没有可刷新的结果 surface；或刷新后找不到本次导入结果。 [VERIFIED: CONTEXT.md]

## Code Examples

Verified patterns from official sources:

### Parse a local CSV file in the browser
```typescript
// Source: https://www.papaparse.com/docs
Papa.parse(file, {
  header: true,
  skipEmptyLines: true,
  complete: (results) => {
    console.log(results.data)
    console.log(results.errors)
  },
})
```

### Validate strict row payloads with Zod
```typescript
// Source: Context7 /colinhacks/zod
import * as z from 'zod'

const CourseImportRowSchema = z.strictObject({
  title: z.string(),
  subject: z.string(),
  grade: z.string(),
  status: z.enum(['draft', 'published', 'archived']),
})

const result = CourseImportRowSchema.safeParse(input)
if (!result.success) {
  console.log(result.error.issues)
}
```

### Invalidate cache after a Server Action write
```typescript
// Source: Context7 /vercel/next.js
'use server'

import { updateTag } from 'next/cache'

export async function applyCourseImport() {
  await writeRows()
  updateTag('teacher-courses:teacher-1')
  updateTag('course:course-123')
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 上传文件后直接写业务表 | 先 staging review，再 explicit apply | 已在当前代码库的 schedule import 中落地 | 这让 row-level validation、partial success、审计和结果回看都变得可实现。 [VERIFIED: codebase grep] |
| 只靠客户端状态刷新 | Server Actions + `updateTag()` | Next.js 16 cache model | apply 后可以保证课程中心和结果页读到新数据。 [VERIFIED: Context7 /vercel/next.js] |
| 依赖 DB unique 做重复控制 | 应用层 duplicate scan + apply-time recheck | 当前 `courses` schema 现状 | 因为 `courses` 没有 school-scoped unique key，重复控制必须前移到 preview/apply。 [VERIFIED: codebase grep] |

**Deprecated/outdated:**
- Phase 15 中同时支持 XLSX 解析的想法：当前已被 D-01 排除。 [VERIFIED: CONTEXT.md]
- 把审核态内嵌在 `/teacher/courses` 首页的方案：当前已被 D-14 排除。 [VERIFIED: CONTEXT.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 命中“同校但属于其他教师”的课程行，应该被记为 `failed`（而不是 `skipped`），并显示类似 `DUPLICATE_OWNED_BY_ANOTHER_TEACHER` 的显式原因。 | Summary / Common Pitfalls / Open Questions | 如果产品想把它归类为 `skipped`，结果统计、文案、测试断言都会不同。 |

## Open Questions

1. **命中同校其他教师课程时，结果桶应该是 `failed` 还是 `skipped`？**
   - What we know: D-22 禁止更新 foreign-owned course；成功标准又禁止 silently create duplicates。 [VERIFIED: CONTEXT.md]
   - What's unclear: 这类行属于“业务失败”还是“教师主动无法操作的跳过”。 [ASSUMED]
   - Recommendation: 默认收敛为 `failed`，原因更明确，也更符合“需要处理”的语义。 [ASSUMED]

2. **是否需要像 schedule import 一样保留历史批次列表，而不只是当前批次审核/结果页？**
   - What we know: schedule import 已有 batch list / latest batch 读取模式；Phase 15 只强制要求审核台与结果页。 [VERIFIED: codebase grep] [VERIFIED: CONTEXT.md]
   - What's unclear: 课程导入首发是否值得同时做“历史批次管理”。 [ASSUMED]
   - Recommendation: 先保证“当前批次审核 + 当前批次结果页 + 回课程中心”，历史批次列表只有在复用成本很低时再纳入 plan 3。 [ASSUMED]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | 继续使用现有教师登录态，并在 action / DAL 边界调用 `assertActiveTeacher()`。 [VERIFIED: codebase grep] |
| V3 Session Management | yes | 课程导入沿用现有 Auth.js 会话，不自建临时导入 token。 [VERIFIED: AGENTS.md] [ASSUMED] |
| V4 Access Control | yes | 所有导入写入必须保持 teacher-owned / school-scoped；不能更新 foreign-owned course。 [VERIFIED: CONTEXT.md] [VERIFIED: codebase grep] |
| V5 Input Validation | yes | CSV 头映射后仍走 Zod strict schemas 与 server-side revalidation。 [VERIFIED: Context7 /colinhacks/zod] [VERIFIED: codebase grep] |
| V6 Cryptography | no | 本阶段没有新增密码学需求；不要手写任何签名或加密逻辑。 [VERIFIED: AGENTS.md] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 更新了同校其他教师的课程 | Elevation of Privilege | 写入只能经过 teacher-owned DAL，preview 命中不等于允许更新。 [VERIFIED: CONTEXT.md] [VERIFIED: codebase grep] |
| preview 与 apply 之间发生竞态，导致重复创建 | Tampering | apply 前重新查询匹配键并重算行状态，不信任旧 preview。 [VERIFIED: codebase grep] [ASSUMED] |
| CSV 头部/BOM/空字符串导致字段错位 | Tampering | 复用 header normalize、trim、空字符串归一化，再做 Zod 校验。 [VERIFIED: codebase grep] [CITED: https://www.papaparse.com/docs] |
| 若未来导出用户输入到 CSV，可能触发公式注入 | Injection | 如果结果页提供“导出失败行”为 CSV，使用 Papa `unparse(..., { escapeFormulae: true })`。 [CITED: https://www.papaparse.com/docs] |

## Sources

### Primary (HIGH confidence)
- `/vercel/next.js` — queried for `use cache`, `cacheTag`, `updateTag`, and Server Action read-your-own-writes patterns. [VERIFIED: Context7 /vercel/next.js]
- `/colinhacks/zod` — queried for `strictObject`, `safeParse`, and validation error formatting patterns. [VERIFIED: Context7 /colinhacks/zod]
- `https://www.papaparse.com/docs` — checked local file parsing, `header`, `skipEmptyLines`, `complete`, and result/error/meta contracts. [CITED: https://www.papaparse.com/docs]
- npm registry — checked current versions and publish dates for `next`, `papaparse`, and `zod`. [VERIFIED: npm registry]
- `src/lib/dal/course-authoring.ts` — checked teacher-owned course query/write boundaries and current cache tags. [VERIFIED: codebase grep]
- `src/actions/course-authoring-actions.ts` — checked current action shape and tag invalidation pattern. [VERIFIED: codebase grep]
- `src/features/schedule/import/server.ts` / `actions.ts` / `template.ts` / `schedule-import-review-surface.tsx` — checked existing staging/review/apply pipeline and CSV helper pattern. [VERIFIED: codebase grep]
- `src/db/schema.ts` — checked `courses` indexes and absence of school-scoped unique key; checked schedule import batch/row schema pattern. [VERIFIED: codebase grep]
- `package.json` / `vitest.config.ts` — checked installed dependency pins and current test runner. [VERIFIED: package.json] [VERIFIED: codebase grep]

### Secondary (MEDIUM confidence)
- None.

### Tertiary (LOW confidence)
- None; all remaining uncertainty is captured in the Assumptions Log rather than presented as unverified fact.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Next.js / Zod / Papa Parse versions and APIs were verified via npm registry + Context7 / official docs. [VERIFIED: npm registry] [VERIFIED: Context7 /vercel/next.js] [VERIFIED: Context7 /colinhacks/zod] [CITED: https://www.papaparse.com/docs]
- Architecture: MEDIUM - the core staging pattern is strongly supported by existing schedule import code, but one result-bucket semantic (`failed` vs `skipped` for foreign-owned matches) still needs confirmation. [VERIFIED: codebase grep] [ASSUMED]
- Pitfalls: MEDIUM - most pitfalls are direct consequences of locked decisions and current code shape, but the exact handling of school-scope foreign-owned duplicates remains partially inferred. [VERIFIED: CONTEXT.md] [VERIFIED: codebase grep] [ASSUMED]

**Research date:** 2026-05-15
**Valid until:** 2026-06-14 for stack/API checks; revisit earlier if the team decides to upgrade Next.js or broaden import scope beyond CSV. [VERIFIED: npm registry] [VERIFIED: CONTEXT.md]

**Intentional omissions:**
- `## Runtime State Inventory` omitted because this is not a rename/refactor/migration phase. [VERIFIED: phase scope]
- `## Environment Availability` omitted because Phase 15 has no new external runtime/service dependency beyond existing Node/npm/pnpm tooling already present locally. [VERIFIED: local tool versions] [VERIFIED: package.json]
- `## Validation Architecture` omitted because `.planning/config.json` explicitly sets `workflow.nyquist_validation` to `false`. [VERIFIED: .planning/config.json]
