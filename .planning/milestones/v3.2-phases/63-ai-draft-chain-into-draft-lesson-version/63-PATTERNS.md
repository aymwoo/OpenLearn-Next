# Phase 63: AI Draft Chain into Draft Lesson Version - Pattern Map

**Mapped:** 2026-05-31
**Files analyzed:** 8 (新建/修改)
**Analogs found:** 8 / 8（全部命中既有镜像模板，零「无 analog」）

> 本相位 ~90% 是「对称复制既有 publish 快照写入 + Command Bus 写型命令登记」。每个新文件都有逐行镜像模板。下方所有片段均带 `file:line`，planner 可直接照搬。

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/db/schema.ts`（+`draftLessonVersions` 表） | model / schema | persistence (immutable snapshot) | `publishedLessonVersions` `schema.ts:592-609` | exact（对称镜像）|
| `src/lib/dal/lesson-authoring.ts`（+`persistDraftLessonVersion`） | service / DAL write | CRUD (insert + version 自增) | `publishLesson` `lesson-authoring.ts:1374-1454` | exact（逐行模板）|
| `src/features/platform-core/commands/contracts.ts`（+`lesson.draft.persist`） | config / contract | request-response (command envelope) | `lesson.draft.run` 契约 `contracts.ts:28,136-201` | exact |
| `src/features/platform-core/commands/registry.ts`（注册新命令） | config / registry | request-response | `lesson.draft.run` 注册项 `registry.ts:86-92` | exact |
| `src/features/platform-core/commands/handlers/lesson-draft.ts`（+persist handler） | controller / handler | request-response → DB write | `executeLessonDraftRun` 同文件 `:120-194` + `authorizeLessonDraftCommand :112-118` | exact |
| `src/features/platform-core/events/contracts.ts`（+`lesson.draft.persisted`） | config / event contract | event-driven (summary-only) | `LessonDraftProducedEventSchema` `events/contracts.ts:215-225` | exact |
| `src/lib/cache-policy.ts`（+`draftLesson` tag） | config | — | `lesson`/`steps` tag `cache-policy.ts:6-7` | exact |
| `src/features/platform-core/commands/handlers/lesson-draft.persist.test.ts`（新建测试） | test | unit | `lesson-draft.events.test.ts:1-77` mock 夹具 + `bus.test.ts:279-298` dedupe 夹具 | role-match |
| `drizzle/0014_phase63_*.sql`（migration 产物） | migration | DDL | `drizzle/0013_*.sql` 既有产物 | exact（生成器落点）|

---

## Pattern Assignments

### `src/db/schema.ts` — 新增 `draftLessonVersions`（model, persistence）

**Analog:** `publishedLessonVersions` `schema.ts:592-609`（唯一不可变快照表，draft 表的对称镜像）。

**镜像模板**（`schema.ts:592-609`）:
```typescript
export const publishedLessonVersions = sqliteTable(
  "publishedLessonVersion",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    lessonId: text("lessonId").notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    snapshotJson: text("snapshotJson", { mode: "json" }).notNull(),
    publishedById: text("publishedById").notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    publishedAt: integer("publishedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [index("publishedLessonVersions_lessonId_version_idx").on(table.lessonId, table.version)]
);
```

**`source` 枚举列先例**（仓库既有 enum-text 写法，`schema.ts:629` `lessonStepProgress.state`）:
```typescript
state: text("state", { enum: ["not_started", "in_progress", "completed", "skipped"] })
  .notNull().default("not_started"),
```
→ draft 列照此写 `source: text("source", { enum: ["ai","human","ai_edited"] }).notNull().default("ai")`。本 phase 只写 `"ai"`，三值全枚举入 schema 为 Phase 64 预留（D-04 / RESEARCH Open Q2）。

**唯一约束先例**（`taskSubmissions`/`lessonStepProgress` 复合 uniqueIndex，`schema.ts:636`）:
```typescript
uniqueIndex("lessonStepProgress_identity_unique").on(table.publishedVersionId, table.stepId, table.studentId),
```
→ DRAFT-02 幂等兜底用 `uniqueIndex(...).on(table.lessonId, table.sourceCommandId)`（或非空 idempotency 列）。

**与 analog 的关键差异（planner 必落实）:**
1. **新增 provenance 列** `source`（enum）+ `sourceCommandId`（回链产出命令，D-04）—— publish 表无此列。
2. **新增确定性唯一约束**（DRAFT-02 / Pitfall 1）—— publish 表只有普通 index，draft 必须叠加 unique 兜住 pending-崩溃-重放。`sourceCommandId` 入唯一约束需注意 SQLite「多 NULL 不冲突」语义；planner 倾向用**非空** idempotency 列。
3. `createdById`（对应 publish 的 `publishedById`）仍 `references(() => users.id, { onDelete: "cascade" })`——AGENTS.md「所有 FK cascade」强约束。
4. 若选「子表 `draftLessonStepVersions`」方案（A3 灰区），子表 FK→draftLessonVersions 同样 cascade，且父+子写入须 `db.transaction` 包裹（RESEARCH Pitfall 3）。

---

### `src/lib/dal/lesson-authoring.ts` — 新增 `persistDraftLessonVersion`（service, CRUD）

**Analog:** `publishLesson` `lesson-authoring.ts:1374-1454`（version 自增 + snapshot 构造 + insert+returning 的精确模板）。

**version 自增模板**（`lesson-authoring.ts:1398-1402`）:
```typescript
const latestVersion = await db
  .select({ value: sql<number>`coalesce(max(${publishedLessonVersions.version}), 0)` })
  .from(publishedLessonVersions)
  .where(eq(publishedLessonVersions.lessonId, input.lessonId));
const version = (latestVersion[0]?.value ?? 0) + 1;
```

**snapshot 构造 + insert+returning 模板**（`lesson-authoring.ts:1424-1434`）:
```typescript
const snapshotJson = {
  lesson: editor.lesson,
  course: editor.course,
  steps: frozenSteps,
  materials: editor.materials,
  publishedAt: new Date().toISOString(),
};
const [published] = await db
  .insert(publishedLessonVersions)
  .values({ lessonId: input.lessonId, version, snapshotJson, publishedById: scope.userId })
  .returning();
```

**越权先例**（`assertActiveTeacher` `lesson-authoring.ts:241-257`，返回 `{ userId, schoolIds }`）:
```typescript
export async function assertActiveTeacher(): Promise<TeacherScope> {
  const user = await getCurrentUserDTO();
  if (!user) throw new Error("TEACHER_AUTH_REQUIRED");
  const memberships = await getUserMembershipsDTO(user.id);
  const schoolIds = memberships
    .filter((m) => m.role === "teacher" && m.status === "active")
    .map((m) => m.schoolId);
  if (schoolIds.length === 0) throw new Error("TEACHER_AUTH_REQUIRED");
  return { userId: user.id, schoolIds };
}
```

**与 analog 的关键差异（DRAFT-01 命脉）:**
1. **绝不回写 live `lessons`** —— `publishLesson:1436-1444` 写完 version 后 `db.update(lessons).set({ publishedVersionId, status:"published", revision+1 })`。**draft 永不做这一步**（D-01：不触碰 live lessons/lessonSteps、不进发布路径）。draft 写入是**单表单 INSERT**，天然原子（RESEARCH Pitfall 3）。
2. `.values()` 多带 `source: "ai"` + `sourceCommandId`（provenance，D-04）+ `createdById`（对应 publish 的 `publishedById`）。
3. snapshot 的 `steps` 来源不同：publish 取 `editor.steps`（live lessonSteps 冻结）；draft 取**调用方传入的 Phase 62 已校验 step 包**（整课多步、lexorank 排序，D-02），形状复用 `lessonStepPayloadSchema`（`dto/lesson-authoring.ts`），**不造第二套 step schema**。
4. 不做 `getVotingPluginContext`/`resolveVotingExecutableContract`（publish 专属发布门禁，draft 无需）。

---

### `src/features/platform-core/commands/contracts.ts` — 新增 `lesson.draft.persist` 契约（config, request-response）

**Analog:** `lesson.draft.run` 命令契约 `contracts.ts:28,136-201`。

**四处平行登记**（精确清单，照搬 `lesson.draft.run` 走位）:

1. **命令类型**（`contracts.ts:28`）:
```typescript
export const LessonDraftCommandTypes = ["lesson.draft.run", "lesson.draft.persist"] as const;
```

2. **payload schema**（仿 `contracts.ts:136-140` `LessonDraftRunPayloadSchema`，必须 `.strict()`，**teacherId 绝不入 payload**）:
```typescript
const LessonDraftRunPayloadSchema = z.object({
  lessonId: z.string().min(1),
  stepType: z.enum(["content", "task", "quiz"]),
  intent: z.string().min(1),
}).strict();
```
→ persist payload 携带 `lessonId` + 整课 step 包/起草会话引用 + idempotency 语义字段，同样 `.strict()`。

3. **payload 注册表**（`contracts.ts:142-154`）追加 `"lesson.draft.persist": LessonDraftPersistPayloadSchema`。

4. **discriminated union 变体**（`contracts.ts:197-200`，仿 run）:
```typescript
PlatformCommandEnvelopeSchema.extend({
  type: z.literal("lesson.draft.run"),
  payload: LessonDraftRunPayloadSchema,
}),
```

**envelope 已内建 `dedupeKey`**（`contracts.ts:60`）—— 无需新增，调用方传入即可:
```typescript
dedupeKey: z.string().min(1).optional(),
```

**关键差异:** payload 字段不同（整课 step 包 vs 单步 stepType+intent）；语义从「生成」升级为「写入」。

---

### `src/features/platform-core/commands/registry.ts` — 注册新命令（config, request-response）

**Analog:** `lesson.draft.run` 注册项 `registry.ts:86-92`。

**模板**（`registry.ts:86-92`）:
```typescript
"lesson.draft.run": createPlatformCommandDefinition({
  commandType: "lesson.draft.run",
  payloadSchema: PlatformCommandPayloadSchemas["lesson.draft.run"],
  dedupe: "optional",
  authorize: lessonDraftCommandHandlers["lesson.draft.run"].authorize,
  execute: lessonDraftCommandHandlers["lesson.draft.run"].execute,
}),
```

**与 analog 的关键差异（DRAFT-02 / D-03）:** 新命令 **`dedupe: "required"`**（对照所有 `plugin.*` 写命令 `registry.ts:19,26,33,...` 均 required；只有 `draft.run` 与 `uninstall.preflight` 是 optional，因其无写副作用）。`satisfies Record<PlatformCommandType, ...>` 会强制新类型必须登记，类型系统兜底。

---

### `src/features/platform-core/commands/handlers/lesson-draft.ts` — 新增 persist handler（controller, request-response → DB write）

**Analog:** 同文件 `executeLessonDraftRun :120-194` + `authorizeLessonDraftCommand :112-118`。

**越权校验模板**（`lesson-draft.ts:112-118`，直接复用）:
```typescript
async function authorizeLessonDraftCommand(command: PlatformCommand): Promise<void> {
  const scope = await assertActiveTeacher();
  if (!scope.schoolIds.includes(command.scope.schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }
}
```

**actor 闭包注入先例**（`lesson-draft.ts:125-126`，teacherId 取自授权 actor，**绝不取自 LLM/payload**）:
```typescript
// teacherId 来源：已鉴权 actor（绝不取自 LLM/payload）。
const { userId: teacherId } = await assertActiveTeacher();
```

**successResult + invalidation.tags + emittedEvents 模板**（`lesson-draft.ts:52-64,142-186`）:
```typescript
function successResult(input: {
  resultSummary: Record<string, unknown> | null;
  invalidation: { tags: string[] };
  emittedEvents: PlatformSuccessOrDomainEvent[];
}): ExecutionResult {
  return { resultSummary: input.resultSummary, invalidation: input.invalidation,
    emittedEvents: input.emittedEvents, failureEvent: null, failureAttribution: null };
}
// ...
return successResult({
  resultSummary: { ... },
  invalidation: { tags: [] },            // ← persist 改为 ['draft:${lessonId}','lesson:${lessonId}']
  emittedEvents: [ withAudit({ eventType: "lesson.draft.produced", ... }, command.audit) ],
});
```

**handler 导出登记**（`lesson-draft.ts:189-194`，追加第二个 key）:
```typescript
export const lessonDraftCommandHandlers = {
  "lesson.draft.run": { authorize: ..., execute: ... },
} satisfies Record<"lesson.draft.run", Pick<PlatformCommandDefinition, "authorize" | "execute">>;
```
→ 扩成 `Record<"lesson.draft.run" | "lesson.draft.persist", ...>`，新增 persist 的 authorize+execute。

**失败语义模板**（`lesson-draft.ts:80-110` `throwDraftFailure` → `PlatformCommandExecutionError`，bus 落唯一 generic 失败事件）。

**与 analog 的关键差异（D-05 / DRAFT-01,03）:**
1. **execute 真正落库**——run 只调 `createDraftLessonStepTool` 生成、`invalidation:{tags:[]}`、`resultSummary.step` 不落库；persist 调 `persistDraftLessonVersion`（新 DAL）写 `draftLessonVersions`，返回 `invalidation.tags=['draft:${lessonId}','lesson:${lessonId}']`。
2. **execute 内绝不调 `updateTag`**——缓存失效是 Server Action 职责，handler 只**返回** `invalidation.tags`（RESEARCH Anti-Pattern）。
3. **发 `lesson.draft.persisted` summary-only 事件**（payload 仅 id/version/stepCount/source，绝不含 snapshotJson）。

---

### `src/features/platform-core/events/contracts.ts` — 新增 `lesson.draft.persisted` 事件（config, event-driven）

**Analog:** `LessonDraftProducedEventSchema` `events/contracts.ts:215-225`。

**模板**（`events/contracts.ts:215-225`）:
```typescript
export const LessonDraftProducedEventSchema = z.object({
  eventType: z.literal("lesson.draft.produced"),
  category: z.literal("domain"),
  aggregateType: z.literal("lesson"),
  aggregateId: z.string().min(1),
  payload: LessonDraftProducedPayloadSchema,
  audit: PlatformAuditMetadataSchema.default({ delegatedActor: null, approval: null }),
}).strict();
```

**三处 union 登记**（`events/contracts.ts:227-250`，必须三处都加，否则 bus 无法承载）:
```typescript
export const PlatformEventSchema = z.discriminatedUnion("eventType", [ ..., LessonDraftProducedEventSchema ]);   // :227-236
export const PlatformDomainEventSchema = z.union([ ..., LessonDraftProducedEventSchema ]);                        // :238-245
// PlatformSuccessOrDomainEventSchema 自动包含 domain union（:247-250）
```

**与 analog 的关键差异:** payload schema 为 summary-only（`draftVersionId`/`version`/`stepCount`/`source:'ai'`），**绝不含 `snapshotJson`**（沿用 62 summary-only 守卫）。新增对应 `LessonDraftPersistedPayloadSchema` + 导出 type（仿 `:266-268`）。是否新增该事件由 planner 定（D-05 灰区），但若发，必走此三处登记。

---

### `src/lib/cache-policy.ts` — 新增 `draftLesson` tag（config）

**Analog:** `lesson`/`steps` tag `cache-policy.ts:6-7`。

**模板**（`cache-policy.ts:6-7`）:
```typescript
lesson: (lessonId: string) => `lesson:${lessonId}`,
steps: (lessonId: string) => `steps:${lessonId}`,
```
→ 追加 `draftLesson: (lessonId: string) => \`draft:${lessonId}\`,`（cache-policy.ts 现无 draft tag）。

---

### 测试文件 — `lesson-draft.persist.test.ts`（test, unit）

**Analog:** `lesson-draft.events.test.ts:1-77`（同 handler 文件的 vi.hoisted mock 夹具）+ `bus.test.ts:279-298`（dedupe 行数断言夹具）。

**mock 夹具模板**（`lesson-draft.events.test.ts:1-24`）:
```typescript
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  assertActiveTeacher: vi.fn(),
  createDraftLessonStepTool: vi.fn(),
}));
vi.mock("@/lib/dal/lesson-authoring", () => ({ assertActiveTeacher: mocks.assertActiveTeacher }));
import { lessonDraftCommandHandlers } from "./lesson-draft";
```
→ persist 测试 mock `persistDraftLessonVersion`（新 DAL）+ `assertActiveTeacher`；断言越权拒绝、`source='ai'` 标注、不写 lessonSteps。

**dedupe 行数兜底断言模板**（`bus.test.ts:279-298`，DRAFT-02 关键）:
```typescript
const attempts = await dependencies.store.listAttempts(command.id);
expect(attempts).toHaveLength(1);
expect(execute).toHaveBeenCalledTimes(1);
```
→ persist 测试增量覆盖 **pending-崩溃-重放** 路径（RESEARCH Pitfall 1）：同 idempotencyKey 重试后 `draftLessonVersions` 行数恒 1（撞唯一约束兜底）。

**与 analog 的关键差异:** 新增 DAL 写入 mock + draft 隔离断言（classroom/学生路径不返回 draft，复用 `classroom.test.ts:49` db.query mock 范式）。

---

### migration — `drizzle/0014_phase63_*.sql`（migration, DDL）

**Analog:** `drizzle/0013_*.sql` 既有产物（最新为 `0013_phase54_audit_summary_truth.sql` / `0013_phase51_command_bus_foundation.sql`）。

**生成命令**（RESEARCH Pitfall 4 —— `pnpm db:generate` 脚本**不存在**）:
```bash
pnpm exec drizzle-kit generate   # 生成 0014_phase63_*.sql
pnpm db:migrate                  # 应用（= tsx prepare-dev-db.ts）
```
**与 analog 的关键差异:** 纯新增建表，无数据回填；migration 随 PR 提交。

---

## Shared Patterns

### Authentication / Access Control（V2/V4）
**Source:** `assertActiveTeacher` `lesson-authoring.ts:241-257` + `authorizeLessonDraftCommand` `lesson-draft.ts:112-118`
**Apply to:** persist handler 的 authorize + execute；actor 取自授权闭包 `userId`，schoolId 经 `command.scope.schoolId ∈ scope.schoolIds` 校验，**绝不取自 payload/LLM**。

### 幂等双层（DRAFT-02 命脉 / Pitfall 1）
**Source:** bus dedupe 短路 `bus.ts:263-275` + 表唯一约束先例 `schema.ts:636`
```typescript
// bus.ts:266-274 —— 仅终态命令短路；pending（首次崩溃在途）会落到 :277 之后 *重新 execute*
if (existing && existing.status !== "pending") {
  return PlatformCommandDispatchResultSchema.parse({
    commandId: existing.command.id, attemptNumber: existing.latestAttemptNumber,
    status: existing.status, resultSummary: existing.resultSummary,
    invalidation: { tags: [] },     // ← 短路返回空 tags（Pitfall 2，正确无害）
  });
}
```
**Apply to:** persist 命令 `dedupe:"required"` **叠加** `draftLessonVersions` 确定性唯一约束。**不可只靠 command dedupe**——pending 崩溃重放会二次 INSERT，靠唯一约束撞约束兜底。

### 事件 summary-only 守卫
**Source:** `lesson-draft.ts:142-186` resultSummary vs emittedEvents 分离
**Apply to:** `lesson.draft.persisted` payload 仅 id/version/count/source；整包 snapshot 仅入 `resultSummary`/落表，**不入事件 payload**。

### 写后缓存失效（read-your-writes）
**Source:** handler 返回 `invalidation.tags`，bus 经 `appendPlatformEvents` 记录，Server Action 消费
**Apply to:** persist execute 返回 `['draft:${lessonId}','lesson:${lessonId}']`；`updateTag` 由触发起草的 Server Action 调用，**不在 execute 内**。

---

## No Analog Found

无。本相位全部新文件均命中既有对称镜像模板（publish 快照 / command-bus 写命令 / AI 域事件 / cache tag）。

| 灰区项（非「无 analog」，CONTEXT 授权 planner 拍板） | 参照先例 |
|------|------|
| 内联 `stepsJson` vs 子表 `draftLessonStepVersions`（A3） | 内联→`publishedLessonVersions.snapshotJson`；子表→`lessonSteps` + `db.transaction` |
| 是否引入 `revision`/`isLatest`（Discretion） | `lessons.revision` `schema.ts:545` / `taskSubmissions.isLatest` `schema.ts:662` |
| idempotencyKey 确切组成（Open Q1） | envelope `dedupeKey` `contracts.ts:60` + `buildPlatformCommandDedupeKey`（bus.test.ts:472）|

---

## Metadata

**Analog search scope:** `src/db/schema.ts`、`src/lib/dal/lesson-authoring.ts`、`src/features/platform-core/commands/{contracts,registry,bus}.ts`、`commands/handlers/lesson-draft.ts`、`events/contracts.ts`、`src/lib/cache-policy.ts`、测试目录、`drizzle/`
**Files scanned:** 9 源文件 + 测试夹具 + migration 目录
**Pattern extraction date:** 2026-05-31

---

## PATTERN MAPPING COMPLETE

**Phase:** 63 - AI Draft Chain into Draft Lesson Version
**Files classified:** 9
**Analogs found:** 9 / 9（全部 exact 镜像，零无 analog）

### Coverage
- Files with exact analog: 8
- Files with role-match analog: 1（测试文件）
- Files with no analog: 0

### Key Patterns Identified
- **`draftLessonVersions` 逐行镜像 `publishedLessonVersions`**（`schema.ts:592-609`）+ 新增 `source`/`sourceCommandId` provenance 列 + 确定性唯一约束；**绝不回写 live `lessons`**（与 `publishLesson:1436-1444` 的唯一分歧）。
- **新写命令 = 五处平行登记**：contracts 类型(`:28`)/payload(`:136`)/注册表(`:142`)/union(`:197`) + registry(`:86`) + handler，唯一升级是 `dedupe:"required"`。
- **幂等必须双层**：bus dedupe 只对终态短路（`bus.ts:266`），pending 崩溃会重放 → 叠加表唯一约束兜底（DRAFT-02 命脉，最易漏）。
- **provenance/事件/缓存全部沿用 62 summary-only 守卫**，事件三处 union 登记（`events/contracts.ts:227-250`）。

### File Created
`.planning/phases/63-ai-draft-chain-into-draft-lesson-version/63-PATTERNS.md`

### Ready for Planning
Pattern mapping 完成。planner 可在 PLAN.md 各任务 action 直接引用上述 analog file:line 与可照搬片段。
