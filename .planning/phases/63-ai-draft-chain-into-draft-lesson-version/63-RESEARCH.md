# Phase 63: AI Draft Chain into Draft Lesson Version - Research

**Researched:** 2026-05-31
**Domain:** Drizzle/SQLite schema 扩展 · Command Bus 写型命令 · 幂等/replay-safe 持久化 · provenance 数据建模
**Confidence:** HIGH（纯代码考古；技术栈由 AGENTS.md 锁定，无外部库选型，全部结论可在仓库源码逐行核验）

## Summary

本 phase 不是「选型」研究，而是「如何对称扩展既有 publish/version 快照模型 + Command Bus 写型链路」的代码考古。技术栈被 AGENTS.md 完全锁定（Next.js 16 / Drizzle SQLite / Zod / Command Bus），灰区只在表列细节、命名、幂等键组成。

三条核心发现决定 plan 质量：

1. **`publishLesson`（`src/lib/dal/lesson-authoring.ts:1374-1454`）是 `draftLessonVersions` 写入的精确镜像模板** —— version = `max(version)+1`、`snapshotJson = {lesson, course, steps, materials, publishedAt}`、insert+returning，然后回链父表。draft 写入应逐行对称，唯一新增列是 `source` + `sourceCommandId` provenance。`[VERIFIED: 源码]`

2. **Command Bus 的 dedupe 只对「终态」命令短路，对 `pending`（首次尝试崩溃在途）命令会 *重新执行***（`bus.ts:263-275`）。因此 D-03 的幂等 *不能只靠 command dedupe*：必须叠加 `draftLessonVersions` 上的确定性唯一约束，让重试 INSERT 撞约束而非产生重复行。这是本 phase 最易被忽略、最该写进 plan 的不变式。`[VERIFIED: 源码]`

3. **学生隔离是结构性保证，不是过滤逻辑** —— 所有学生运行时实体（`lessonStepProgress`、`taskSubmissions`、classroom 读路径）都 FK 到 `publishedVersionId`，从不引用 draft。`draftLessonVersions` 只要不接入任何学生可见读路径，「不自动发布」就由数据形状本身保证（DRAFT-03）。`[VERIFIED: 源码]`

**Primary recommendation:** 新建 `draftLessonVersions` 表（镜像 `publishedLessonVersions` + `source` 枚举 + `sourceCommandId` + 一个确定性唯一约束）；新增 `lesson.draft.persist` 命令（`dedupe:"required"`，envelope 携带稳定 `dedupeKey`）；handler 复用 `assertActiveTeacher` 越权先例 + `publishLesson` 快照逻辑；返回 `invalidation.tags=['draft:${lessonId}','lesson:${lessonId}']`；新增一条 `lesson.draft.persisted` summary-only 事件。幂等双保险：command dedupe + 表唯一约束。

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| draft 快照持久化 | API/Backend（Command Bus handler, server-only） | Database（draftLessonVersions） | 写入只经 `dispatchPlatformCommand`；UI/Edge/插件绝不直达（AGENTS.md Data Access 约束） |
| 越权校验（teacher∈school） | API/Backend（`authorize` + `assertActiveTeacher`） | — | teacherId/actor 取自授权闭包，绝不取自 payload/LLM（Phase 62 先例 `lesson-draft.ts:112-118`） |
| 幂等/replay-safe | API/Backend（bus dedupe） | Database（唯一约束兜底） | 命令级短路 + 表级确定性键，双层（见 Pitfall 1） |
| AI provenance 标记 | Database（`source`/`sourceCommandId` 列） | — | 版本级 provenance，不内嵌 step payload（D-04） |
| 缓存失效 | Frontend Server（Server Action `updateTag`） | API（handler 返回 invalidation.tags） | 写后 read-your-writes（AGENTS.md Caching 约束） |
| 学生不可见 | Database（无 FK/读路径接入 draft） | — | 结构性隔离，非运行时过滤（见 Pattern 3） |

## Standard Stack

技术栈由 AGENTS.md / STACK.md 完全锁定，本 phase **不引入任何新依赖**。相关既有依赖：

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | （仓库现行） | SQLite schema + 查询 | 项目锁定；`publishedLessonVersions` 即用此定义 `[VERIFIED: schema.ts]` |
| drizzle-kit | `^0.31.10` | migration 生成 | `package.json:109` `[VERIFIED]` |
| zod | （仓库现行 v4 家族） | 边界校验 | 命令 payload / DTO 全用 zod `[VERIFIED: contracts.ts]` |
| vitest | `4.1.5` | 测试 | `package.json:118`，`pnpm test` `[VERIFIED]` |

**Installation:** 无新增。`[VERIFIED: 不需要 npm install]`

## Architecture Patterns

### System Architecture Diagram

```
教师触发起草 (已鉴权 Server Action)
        │  生成稳定 idempotencyKey = lessonId + 起草会话/意图ID
        ▼
[Server Action]  ──dispatchPlatformCommand(command, { dedupeKey })──┐
        │                                                            │
        ▼                                                            │
  lesson.draft.run (Phase 62, dedupe:optional)                       │
        │  纯生成：createDraftLessonStepTool → 校验 step 包           │
        │  resultSummary.step（不落库）                              │
        ▼                                                            │
  [新增] lesson.draft.persist (Phase 63, dedupe:REQUIRED) ◀──────────┘
        │
        ├─ bus.insertCommand(dedupeKey)
        │     ├─ created=false & status∈{succeeded,failed} → 短路返回旧结果(tags=[]) ★replay-safe
        │     └─ created=false & status=pending → 重新执行 ★需表唯一约束兜底
        │
        ├─ authorize: assertActiveTeacher() & schoolId∈scope.schoolIds
        │
        ├─ execute:
        │     ├─ 读 Phase 62 已校验 step 包（整课多步, lexorank 排序）
        │     ├─ snapshotJson = { lesson, steps[], materials, ... }  (镜像 publishLesson)
        │     ├─ INSERT draftLessonVersions { lessonId, version, snapshotJson,
        │     │         source:'ai', sourceCommandId, createdById, <unique key> }
        │     │         ▲ 撞唯一约束 → 幂等兜底（重试不产生重复行）
        │     └─ return { invalidation.tags:['draft:${lessonId}','lesson:${lessonId}'],
        │                 emittedEvents:[lesson.draft.persisted] (summary-only) }
        │
        ▼
  [platformEvents ledger]  commandId notNull+FK（事件唯一经父命令落账）
        │
        ▼
  [Server Action]  updateTag(invalidation.tags)  ← read-your-writes

  学生运行时 (lessonStepProgress / taskSubmissions / classroom)
        └─ 全部 FK→publishedVersionId，从不触及 draftLessonVersions ★结构性隔离
```

### Pattern 1: 镜像 publishLesson 的快照写入
**What:** `draftLessonVersions` 写入逐行对称 `publishLesson`。
**When to use:** execute() 内构造 + 落库。
**Source 模板（`src/lib/dal/lesson-authoring.ts:1398-1434`）:**
```typescript
// version = max+1（同 lessonId 维度自增）
const latest = await db
  .select({ value: sql<number>`coalesce(max(${draftLessonVersions.version}), 0)` })
  .from(draftLessonVersions)
  .where(eq(draftLessonVersions.lessonId, lessonId));
const version = (latest[0]?.value ?? 0) + 1;

const snapshotJson = { lesson, steps: frozenSteps, materials, draftedAt: new Date().toISOString() };

const [draft] = await db
  .insert(draftLessonVersions)
  .values({ lessonId, version, snapshotJson, source: "ai", sourceCommandId, createdById })
  .returning();
```
**关键差异:** publish 写完会回写 `lessons.publishedVersionId`/`status="published"`（`:1436-1444`）—— **draft 绝不做这一步**（D-01：永不触碰 live lessons/lessonSteps，不进发布路径）。

### Pattern 2: 新增写型命令（contracts → registry → handler 三处登记）
**What:** 与 `lesson.draft.run` 完全平行地新增 `lesson.draft.persist`。
**改动点（精确清单）:**
1. `contracts.ts:28` `LessonDraftCommandTypes` 追加 `"lesson.draft.persist"`。
2. `contracts.ts:136-140` 仿 `LessonDraftRunPayloadSchema` 新增 `.strict()` payload schema（含 `lessonId`、step 包/起草会话引用、idempotency 语义字段——**teacherId 绝不入 payload**）。
3. `contracts.ts:142-154` `PlatformCommandPayloadSchemas` 注册。
4. `contracts.ts:156-201` `PlatformCommandSchema` discriminated union 追加变体。
5. `registry.ts:86-92` 仿 `lesson.draft.run` 注册定义，但 **`dedupe:"required"`**（D-03，对照 `plugin.*` 全是 required）。
6. `handlers/lesson-draft.ts` 新增 `authorize`+`execute`（复用 `authorizeLessonDraftCommand` 越权模式 `:112-118`）。
`[VERIFIED: contracts.ts / registry.ts / lesson-draft.ts 全文已读]`

### Pattern 3: 结构性学生隔离（不写过滤逻辑）
**What:** draft 不可见性靠「不接入学生读路径」实现，而非 `status` 过滤。
**Evidence:** `lessonStepProgress`（`schema.ts:617-619`）、`taskSubmissions`（`schema.ts:648-650`）均 `references(publishedLessonVersions.id)`；`classroom.ts` 多处只 `db.query.publishedLessonVersions.findFirst`（`:1254,1403,1970,3732`）。`draftLessonVersions` 只要不被任何学生/classroom DAL 读取即天然隔离。`[VERIFIED: 源码]`

### Anti-Patterns to Avoid
- **回写 `lessons.publishedVersionId`/`status`** —— 那是 publish 专属，draft 做了就违反 D-01「不污染 live」。
- **把 provenance 塞进 step payload JSON** —— 违反 D-04 + summary-only 取向；provenance 必须是版本行级列。
- **只靠 command dedupe 保幂等** —— pending 崩溃会重放（见 Pitfall 1）。
- **在 execute 内调 `updateTag`** —— 缓存失效是 Server Action 职责；handler 只 *返回* `invalidation.tags`（`bus.ts:294,318` 由 ledger 记录，Server Action 消费）。
- **造第二套 step schema** —— 复用 `lessonStepPayloadSchema`（`dto/lesson-authoring.ts:154-158`）。

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 命令去重 | 自写 dedupe 表/逻辑 | `dedupe:"required"` + envelope `dedupeKey`（`bus.ts:105-123`） | 已有 `getCommandByDedupeKey`/`insertCommand` 原子化 |
| step 校验 | 新 zod schema | `lessonStepPayloadSchema` discriminated union | Phase 62 产出即此形状 |
| 越权校验 | 自查 membership | `assertActiveTeacher()`（`lesson-authoring.ts:241-257`，返回 `{userId, schoolIds}`） | 越权先例，actor 不入 payload |
| 快照构造 | 新 snapshot 格式 | 镜像 `publishLesson` 的 `snapshotJson` 形状 | Phase 64 整课 diff 复用 publish 链路前提 |
| 事件落账 | 直写 ledger | `emittedEvents` 经 bus → `appendPlatformEvents`（`bus.ts:313-321`） | 事件唯一经父 command（`platformEvents.commandId` notNull+FK） |
| version 自增 | 自管计数器 | `coalesce(max(version),0)+1`（`lesson-authoring.ts:1398-1402`） | publish 同模式 |

**Key insight:** 本 phase 90% 是「对称复制既有 publish + command 模式」，自造任何并行机制都是技术债。

## Runtime State Inventory

> 非 rename/migration phase（是新增表 + 新增 command），但涉及新 migration 与新命令登记，逐类显式核验：

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | 新建空表 `draftLessonVersions`，无既有数据迁移 | 仅 migration 建表；无回填 |
| Live service config | 无（命令注册是代码内 `platformCommandRegistry`，非外部服务） | 代码改 registry.ts |
| OS-registered state | None — 无 OS 级注册物，已核验 | 无 |
| Secrets/env vars | None — 复用既有 `DB_FILE_NAME`（drizzle.config.ts:8），无新密钥 | 无 |
| Build artifacts | 新 migration 文件 `drizzle/0014_phase63_*.sql`（最新为 `0013_*`，`drizzle/` 已列） | `drizzle-kit generate` 生成后随 PR 提交 |

## Common Pitfalls

### Pitfall 1: command dedupe 不覆盖 pending 崩溃 —— 必须叠加表唯一约束
**What goes wrong:** 以为 `dedupe:"required"` 就杜绝重复 draft。
**Why:** `bus.ts:263-275`——`insertCommand` 命中既有 dedupeKey 时，**仅当 `existing.status !== "pending"`（即 succeeded/failed/running 终态/在跑）才短路返回**；若首次尝试在 execute 写库前/中崩溃、命令仍停在 `pending`，**会落到 `:277` 之后重新 execute**，第二次 INSERT 产生重复 draft 行。
**How to avoid:** `draftLessonVersions` 加确定性唯一约束（如 `uniqueIndex(lessonId, sourceCommandId)` 或 `unique(lessonId, dedupeDerivedKey)`），让重放 INSERT 撞约束 → 幂等兜底。planner 在 D-03「二选一或叠加」处应选 **叠加**。
**Warning signs:** 同一 idempotencyKey 重试后 draft 行数 >1。
`[VERIFIED: bus.ts:256-280 全文]`

### Pitfall 2: dedupe 短路返回 `invalidation.tags=[]`
**What goes wrong:** Server Action 依赖 dispatch 结果的 tags 做 `updateTag`，replay 时拿到空数组，疑似「没失效缓存」。
**Why:** `bus.ts:272` 短路分支硬编码 `invalidation: { tags: [] }`。
**How to avoid:** 接受此语义 —— replay 命中的是「已成功的首次写入」，draft 早已存在、首次已失效缓存，空 tags 正确无害。planner 不要为此加补偿逻辑，但需在 Server Action 注释说明。
`[VERIFIED: bus.ts:266-274]`

### Pitfall 3: publishLesson 的 insert+update 非事务
**What goes wrong:** 照搬 publish 时连带照搬「两条独立 await（insert version 后 update lessons）」（`lesson-authoring.ts:1431-1444`），中途崩溃留下半写状态。
**Why:** publish 原代码就是两条顺序 await，非 `db.transaction`。
**How to avoid:** draft 写入是**单表单 INSERT**（不回写 lessons），天然原子，比 publish 更简单——**不要**引入对 lessons 的二次写。若 planner 选「子表存 step（`draftLessonStepVersions`）」方案，则父行+子行须 `db.transaction` 包裹。
`[VERIFIED: lesson-authoring.ts:1431-1444]`

### Pitfall 4: migration 脚本名不存在
**What goes wrong:** CONTEXT.md（`63-CONTEXT.md:96`）写「走 `pnpm db:generate`」，但 `package.json` **无 `db:generate` 脚本**（仅 `db:migrate`=prepare-dev-db.ts、`db:bootstrap:dev`）。
**Why:** 生成命令是 drizzle-kit 直调。
**How to avoid:** 生成 migration 用 `pnpm exec drizzle-kit generate`（或 `pnpm drizzle-kit generate`），再 `pnpm db:migrate` 应用。planner 写任务时勿引用不存在的 `db:generate`。
`[VERIFIED: package.json:67-69 无 db:generate]`

## Code Examples

### source 枚举列（仓库既有先例）
```typescript
// Source: src/db/schema.ts:203, 1216, 1349 —— text + enum 既定写法
source: text("source", { enum: ["ai", "human", "ai_edited"] }).notNull().default("ai"),
```
本 phase 只写 `"ai"`；`"ai_edited"` 为 Phase 64 预留（D-04）。`[VERIFIED]`

### 镜像表骨架（draftLessonVersions）
```typescript
// 模板: src/db/schema.ts:592-609 publishedLessonVersions
export const draftLessonVersions = sqliteTable(
  "draftLessonVersion",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    lessonId: text("lessonId").notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),     // AGENTS.md: FK 必 cascade
    version: integer("version").notNull(),
    snapshotJson: text("snapshotJson", { mode: "json" }).notNull(),
    source: text("source", { enum: ["ai", "human", "ai_edited"] }).notNull().default("ai"),
    sourceCommandId: text("sourceCommandId"),                     // 回链产出命令做 provenance 审计
    createdById: text("createdById").notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    index("draftLessonVersions_lessonId_version_idx").on(table.lessonId, table.version),
    uniqueIndex("draftLessonVersions_idempotency_unique").on(table.lessonId, table.sourceCommandId), // Pitfall 1 兜底
  ]
);
```
注：`sourceCommandId` 若作唯一约束的一部分须考虑 NULL 语义（SQLite 多 NULL 不冲突）——planner 可改用非空 idempotency 列。`[VERIFIED: 镜像 publishedLessonVersions + taskSubmissions 唯一约束写法 schema.ts:636]`

### 新事件变体（summary-only）
```typescript
// 模板: src/features/platform-core/events/contracts.ts:215-225 LessonDraftProducedEventSchema
export const LessonDraftPersistedEventSchema = z.object({
  eventType: z.literal("lesson.draft.persisted"),
  category: z.literal("domain"),
  aggregateType: z.literal("lesson"),
  aggregateId: z.string().min(1),
  payload: z.object({                       // summary-only：绝不含 snapshotJson
    draftVersionId: z.string().min(1),
    version: z.number().int().positive(),
    stepCount: z.number().int().nonnegative(),
    source: z.literal("ai"),
  }),
  audit: PlatformAuditMetadataSchema.default({ delegatedActor: null, approval: null }),
}).strict();
// 须并入 contracts.ts:227-250 三处 union（PlatformEventSchema / PlatformDomainEventSchema / ...）
```
`[VERIFIED: events/contracts.ts:191-250]`

### 新缓存 tag
```typescript
// 加入 src/lib/cache-policy.ts:1-36 cacheTags（既有 lesson/steps 风格）
draftLesson: (lessonId: string) => `draft:${lessonId}`,
```
`[VERIFIED: cache-policy.ts 现无 draft tag]`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 「草稿」=live lessons+lessonSteps（教师工作面） | 新增 `draftLessonVersions` AI 提案快照（对称 publish） | Phase 63 | live 真相不被 AI 触碰 |
| `lesson.draft.run` 纯生成 dedupe:optional | 新增 `lesson.draft.persist` 写入 dedupe:required | Phase 63 | 生成/写入语义分离（D-05） |

**Deprecated/outdated:** 无。`agentProposals` 表 **刻意不复用**（D-01：与 lesson 版本模型脱节）。

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `lesson.draft.persist` 的输入是「Phase 62 已校验 step 包」经调用方传入（而非 persist 命令内部再调 draft.run 生成） | Pattern 2 | 若改为 persist 内部生成，payload schema 与聚合机制不同；CONTEXT D-02「单步如何聚合」留给 planner，二者均合法 |
| A2 | 整课聚合采「一次性整课起草」而非「多次 draft.run 累积进同一 version 容器」 | Diagram | CONTEXT 显式留给 planner（D-02/Discretion）；影响 idempotencyKey 组成与是否需 isLatest |
| A3 | snapshot 采内联 `stepsJson`（非子表 `draftLessonStepVersions`） | Code Examples | CONTEXT Discretion 项；子表方案需 `db.transaction` + 额外 FK cascade |

**注:** 三项均为 CONTEXT.md 明确划定的 planner 灰区，非研究遗漏；列此供 plan 时显式拍板。

## Open Questions

1. **idempotencyKey 确切组成（`lessonId + 起草会话ID` vs `lessonId + 意图hash`）**
   - 已知: D-03 要求调用方稳定生成、dedupe:required。
   - 不清楚: 「一次起草会话」的标识从何而来（教师 UI 触发时生成？Phase 64 才有 UI）。
   - 建议: 本 phase 由触发起草的 Server Action / 测试夹具生成 UUID 形 sessionId；planner 定字段名。

2. **`source` 枚举落表取值集**
   - 已知: 倾向 `'ai' | 'human' | 'ai_edited'`，本 phase 只写 `'ai'`。
   - 建议: 三值全枚举入 schema（向前兼容 Phase 64），写入恒 `'ai'`。

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| drizzle-kit | migration 生成 | ✓ | `^0.31.10` (`package.json:109`) | — |
| SQLite/libSQL | 表落地 | ✓ | `DB_FILE_NAME=file:local.db` (drizzle.config.ts:8) | — |
| vitest | 测试 | ✓ | `4.1.5` | — |
| tsx | db:migrate 脚本 | ✓ | （`package.json:67` 使用中） | — |

**Missing dependencies:** 无。纯仓库内扩展。`[VERIFIED: package.json]`

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 |
| Config file | （仓库 vitest 配置；`pnpm test` 入口 `package.json:69`） |
| Quick run command | `pnpm test -- src/features/platform-core/commands` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DRAFT-01 | persist 命令经 Bus 写 `draftLessonVersions`，snapshot 形状复用 step schema，不写 lessonSteps | unit | `pnpm test -- handlers/lesson-draft` | ❌ Wave 0（新 handler 测试）|
| DRAFT-02 | 同 idempotencyKey 重试：dedupe 短路 **且** 表唯一约束兜底（行数恒 1）；含 pending-崩溃-重放路径 | unit | `pnpm test -- commands/bus` | ❌ Wave 0 |
| DRAFT-03 | 行级 `source='ai'`/`sourceCommandId` 可查；无任何学生/classroom 读路径触及 draft | unit | `pnpm test -- dal/classroom`（断言不读 draft）+ 新 draft DAL 测试 | ⚠️ `classroom.test.ts` 存在(`:49` mock publishedLessonVersions)，需新增 draft 隔离断言 |

### Sampling Rate
- **Per task commit:** `pnpm test -- <touched path>` + `pnpm typecheck`
- **Per wave merge:** `pnpm test -- src/features/platform-core src/lib/dal`
- **Phase gate:** `pnpm test` 全绿 + `pnpm typecheck` + `pnpm lint` 后入 `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/features/platform-core/commands/handlers/lesson-draft.test.ts` — persist handler（DRAFT-01/03），含越权拒绝 + source 标注断言
- [ ] bus dedupe replay 测试增量 — 覆盖 `pending` 崩溃重放 → 表唯一约束兜底（DRAFT-02 关键路径，Pitfall 1）
- [ ] draft DAL 读取测试 — 断言学生/classroom 路径不返回 draft（DRAFT-03 结构隔离）
- [ ] migration 应用 smoke — `pnpm db:migrate` 后 `draftLessonVersions` 存在且约束就位

*现有 `classroom.test.ts` 提供 db.query mock 夹具范式（`:49`）可复用。*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `assertActiveTeacher()` —— 命令 authorize 阶段（`lesson-draft.ts:112-118`） |
| V3 Session Management | no | 复用 Auth.js v5 会话，本 phase 不触碰 |
| V4 Access Control | yes | `schoolId ∈ scope.schoolIds` 越权校验；teacherId/actor 取自授权闭包，**绝不**取自 payload/LLM |
| V5 Input Validation | yes | command payload `.strict()` zod schema（`contracts.ts:140`）；step 包 `lessonStepPayloadSchema` |
| V6 Cryptography | no | 无加密需求 |

### Known Threat Patterns for（Command Bus 写型 + AI 起草）

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| LLM 注入 lessonId/teacherId 越权写他校 draft | Elevation of Privilege / Tampering | teacherId 来自 `assertActiveTeacher().userId` 闭包注入；lessonId 经 `.strict()` 校验且 authorize 阶段校 schoolId 归属（沿用 62 先例） |
| 重放/重复请求灌重复 draft | Tampering | dedupe:required + 表唯一约束（双层，Pitfall 1） |
| AI draft 泄漏给学生（自动发布） | Information Disclosure | 结构性隔离：draft 无学生/classroom 读路径，不回写 lessons.status（Pattern 3） |
| 事件 payload 泄漏整包 snapshot | Information Disclosure | summary-only 守卫，事件 payload 仅 id/version/count（沿用 62） |
| 命令绕过 Bus 直写表 | Tampering / Repudiation | server-only handler + `platformEvents.commandId` notNull+FK，写入唯一经 dispatch |

## Project Constraints (from AGENTS.md)

- **SQLite-first，所有 FK `onDelete:"cascade"`** —— `draftLessonVersions.lessonId`/`createdById` 必 cascade。
- **UI 禁直连 DB；全走 DAL + Server Actions** —— draft 写入只经 Command Bus handler（server-only）。
- **写后显式 `updateTag()`/`revalidateTag()`** —— handler 返回 `invalidation.tags`，Server Action 消费失效 `draft:${lessonId}`/`lesson:${lessonId}`。
- **Drizzle migration-first，不靠 `push`** —— `drizzle-kit generate` → `pnpm db:migrate`（注意：CONTEXT 的 `db:generate` 脚本不存在，见 Pitfall 4）。
- **事件 summary-only** —— `lesson.draft.persisted` payload 不含 `*Json`。
- **无 UI** —— 审校界面归 Phase 64，本 phase 纯服务端。

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 新建 `draftLessonVersions` 快照表，镜像 `publishedLessonVersions`，存不可变 AI 起草提案；**永不就地触碰 live `lessonSteps`**；非第二真相源；FK `lessonId` cascade；snapshot 复用 `lessonStepPayloadSchema`；**不复用 `agentProposals`**。
- **D-02:** 整课多步草稿版本（一 version = 一节课完整步骤序列，含 lexorank 排序），非单步追加；单步产出累积/编排成整课（聚合机制 planner 定）。
- **D-03:** 客户端显式 `idempotencyKey` + 新持久化 command `dedupe:"required"`；Bus 命中 dedupeKey 直接返回先前结果；写入幂等点：command dedupe 与表唯一约束「二选一或叠加」。
- **D-04:** draft version 行加 `source`（`'ai'|'human'|'ai_edited'`，取值 planner 定）+ `sourceCommandId` 回链；版本级 provenance，**不内嵌 step payload**；**不自动发布**（学生可见走既有 `status` 过滤）。
- **D-05:** 新增独立持久化 command（`lesson.draft.version.write`/`lesson.draft.persist`，命名 planner 定），承接已校验步骤包 + idempotencyKey 写表；`lesson.draft.run` 维持纯生成不落库；写入仍只经 Command Bus，事件经父 command 落账；是否新增 `draft.persisted` 事件变体 planner 定。

### the agent's Discretion
- 表列细节（内联 `stepsJson` vs 子表 `draftLessonStepVersions`）、`source` 枚举确切取值、idempotencyKey 确切组成、新命令命名、是否新增专属事件变体。
- 单步聚合成整课 version 的确切机制（一次性整课起草 vs 多次累积进同一容器）。
- 是否引入乐观锁/`revision`/`isLatest` 到 `draftLessonVersions`（参照 `lessons.revision`/`taskSubmissions.isLatest`）。

### Deferred Ideas (OUT OF SCOPE)
- 教师审校/接受/apply draft→live 的 UI 与交互（Phase 64）。
- draft→publish 整课 diff 可视化、并发冲突解决（Phase 64）。
- `ai_edited` 实际写入路径（本 phase 仅枚举预留，Phase 64 写入）。
- 多 Agent（Homework/Data/Tutor/Parent）写各自 draft（本 phase 仅 LessonAgent）。
- Eval/guardrails/起草质量评估（Phase 65）；RAG 增强（Future）。

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DRAFT-01 | 经 Command Bus 写 draft lesson version，复用 publish/version 模型，不建第二真相源 | Pattern 1（镜像 publishLesson）+ Pattern 2（新命令登记）+ 镜像表骨架 |
| DRAFT-02 | 写入幂等且 replay-safe，重试不重复/不污染 | Pitfall 1（dedupe + 表唯一约束双层）+ Diagram dedupe 分支 |
| DRAFT-03 | draft 标注 AI 来源、与人工可区分、不自动发布 | D-04 `source`/`sourceCommandId` 列 + Pattern 3 结构性学生隔离 |

## Sources

### Primary (HIGH confidence) — 全部仓库源码逐行核验
- `src/lib/dal/lesson-authoring.ts:1374-1454`（publishLesson 快照模板）、`:241-257`（assertActiveTeacher）
- `src/db/schema.ts:530-659`（lessons/lessonSteps/publishedLessonVersions/lessonStepProgress/taskSubmissions）、`:203,1216,1349`（source enum 先例）
- `src/features/platform-core/commands/contracts.ts`（全文，命令契约/dedupe/invalidation）
- `src/features/platform-core/commands/bus.ts:105-123,245-339`（dedupe 解析 + dispatch 短路语义）
- `src/features/platform-core/commands/registry.ts`（全文，dedupe required/optional 登记）
- `src/features/platform-core/commands/handlers/lesson-draft.ts`（全文，Phase 62 handler analog）
- `src/features/platform-core/events/contracts.ts:191-268`（事件 schema + union 登记）
- `src/lib/dto/lesson-authoring.ts:114-211`（step payload / LessonStepDTO 形状）
- `src/lib/cache-policy.ts`（全文，cacheTags 约定）
- `src/lib/dal/classroom.ts:1254,1403,1970,3732`（学生读路径只读 publishedLessonVersions）
- `package.json:67-69,108-118`、`drizzle.config.ts`、`drizzle/`（migration 工作流）
- `.planning/phases/63-.../63-CONTEXT.md`、`.planning/REQUIREMENTS.md:25-27,75-77`、`.planning/ROADMAP.md:69-77`

### Secondary / Tertiary
- 无外部来源 —— 技术栈锁定，纯仓库考古。

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 无新依赖，AGENTS.md 锁定，逐行核验。
- Architecture: HIGH — publishLesson/command-bus 镜像模式全文已读。
- Pitfalls: HIGH — dedupe 短路语义、非事务写、缺失脚本均源码/`package.json`核验。
- Discretion 灰区: 标注为 Assumptions（A1-A3），CONTEXT 明确授权 planner 决策。

**Research date:** 2026-05-31
**Valid until:** 仓库代码变更前有效（建议 plan 阶段前 30 天内复核 schema.ts / commands/ 无重构）

## RESEARCH COMPLETE

**Phase:** 63 - AI Draft Chain into Draft Lesson Version
**Confidence:** HIGH

### Key Findings
- `publishLesson`（lesson-authoring.ts:1374-1454）是 `draftLessonVersions` 写入的逐行镜像模板；draft 唯一新增 `source`+`sourceCommandId`，且**不回写 lessons**。
- Command Bus dedupe 只对终态命令短路，`pending`（首次崩溃在途）会**重新执行** → 幂等必须 command dedupe **叠加** 表唯一约束（Pitfall 1，DRAFT-02 命脉）。
- 学生「不可见/不自动发布」是结构性保证：所有学生运行时实体 FK→publishedVersionId，从不引用 draft（DRAFT-03）。
- 新命令 = contracts/registry/handler 三处平行登记 `lesson.draft.persist`（`dedupe:"required"`），复用 Phase 62 越权与 summary-only 模式。
- 文档坑：CONTEXT 引用的 `pnpm db:generate` 脚本不存在，实际用 `drizzle-kit generate`（Pitfall 4）。

### File Created
`.planning/phases/63-ai-draft-chain-into-draft-lesson-version/63-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | 无新依赖，逐行核验 |
| Architecture | HIGH | publish + command-bus 镜像模式全文已读 |
| Pitfalls | HIGH | dedupe 语义/非事务/缺脚本均源码核验 |

### Open Questions
- idempotencyKey 确切组成（起草会话标识来源，Phase 64 前无 UI）—— planner/Server Action 定。
- snapshot 存法（内联 vs 子表）、是否引入 isLatest/revision —— CONTEXT 授权 planner（A1-A3）。

### Ready for Planning
Research complete. Planner 可据此创建 PLAN.md：表 DDL、`lesson.draft.persist` 三处登记、幂等双层、provenance 列、事件变体、缓存 tag 与 Wave 0 测试缺口均已落点。
