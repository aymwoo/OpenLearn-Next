# Phase 73: Multi-Type Quiz Schema, Live WS Event & Teacher Live Dashboard — Research

**Researched:** 2026-06-07
**Domain:** Multi-type quiz data model extension + WebSocket event broadcasting + client-side live dashboard aggregation
**Confidence:** HIGH

## Summary

Phase 73 在 v4.0 单选 quiz 样板 + v2.2 WebSocket-first transport 基础上新增两个能力系：(1) 5 种题型（`single_choice` / `multi_choice` / `true_false` / `fill_blank` / `ordering`）的数据模型、DAL 写入/读取、学生提交、课后统计；(2) `quiz.answer.received` WebSocket 事件从 DAL 写入后经 Command Bus 解耦推送到教师 `/classroom` 控制室的「作答实时」sibling tab（Zustand 客户端聚合，零写 Server Action）。

**Primary recommendation:** 严格按照 v4.0 已建立的双层架构实施：(a) Plan 73-01 从 `plugins/quiz-sample/data-model.ts` 单一真相源出发 → 编译生成新 Drizzle schema → 手写 additive migration → 扩展 `buildQuizSampleRecapStats` 5 题型统计 → 写完 DAL 写入 hook 点；(b) Plan 73-02 从 Plan 73-01 的 hook 点接 `quiz.answer.received` 事件 → 经 Command Bus（不直连 transport）→ 教师 dashboard tab 客户端聚合。两 plan 顺序执行，不并行。

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Schema definition (`questionType` column) | Database / Storage | Compiler (build-time) | `data-model.ts` → `compile-plugin-data-model.ts` → Drizzle schema generation; migration applies DDL |
| DTO / allowlist extension | API / Backend | Compiler (build-time) | `plugin-data-model.ts` DTO schema + allowlist 在编译期 auto-generated，消费端反射读取 |
| DAL write (5-type student submit) | API / Backend | — | `dispatchPluginDataAccess` facade → Command Bus producer → handler → DB write（school-scoped, append-only） |
| DAL read (post-class stats) | API / Backend | — | `buildQuizSampleRecapStats` via direct governed DAL reads (no Command Bus for reads) |
| `quiz.answer.received` event publish | API / Backend | Transport | Server Action 写入成功后 `dispatchPlatformCommand` → handler → `publishTransportEvent` → WS adapter |
| WebSocket broadcast (teacher-only) | Transport | Frontend Server | `ws-server.ts` routes to teacher-only channel; Redis fanout optional delivery layer |
| Live dashboard client aggregation | Browser / Client | — | Zustand store: WS event pool → per-question aggregation cache + recent N submissions stream |
| Dashboard tab rendering | Browser / Client | — | React component in `/classroom` control room reading Zustand store; DESIGN.md tonal surface styling |
| Post-class recap rendering | Frontend Server (SSR) | Browser / Client | `ClassroomSessionRecapSurface` RSC → `buildQuizSampleRecapStats` DAL → DTO → client component |
| Access control (dashboard tab) | API / Backend | Browser / Client | `userProfiles.role = 'teacher' && classroomSessionId owner` — checked both in route and WS auth |

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `questionType` 列通过修改 `plugins/quiz-sample/data-model.ts`（单一真相源）→ 重跑 `scripts/compile-plugin-data-model.ts` 生成新 `quiz.ts` schema → 手写 Drizzle migration 落库。旧行默认 `single_choice`，保证 backward compat。
- **D-02:** `plugin_owned_quiz_responses` 表 schema 不变（保留 v4.0 唯一索引与 append-only 写入契约）。多题型 payload 通过 `selectedOption` 列承载 JSON（多选 = 数组、判断 = "true"/"false"、填空 = 字符串、排序 = 数组），复用 D-72.1-04 `isLatest` 翻转事务。
- **D-03:** 5 种题型枚举：`single_choice` | `multi_choice` | `true_false` | `fill_blank` | `ordering`。
- **D-04:** `quiz.answer.received` 事件通过 Command Bus 解耦：`submitQuizSampleAnswerAction` 写入成功后 `dispatchPlatformCommand({ type: "quiz.answer.received", payload })` → ws-server 订阅该 command type → 广播到 teacher-only channel。不直接耦合 Server Action 与 transport 层。
- **D-05:** 事件 envelope 遵循 v2.2 contract（`kind` / `correlationId` / `truthRef`），payload 含 `{ questionId, studentId, responseType, payload, receivedAt, classroomSessionId }`。
- **D-06:** Redis fanout（`REDIS_URL` 存在时启用）仅作 delivery layer，SQLite + DAL 仍是真相源（D-72.1-15）。
- **D-07:** 实时仪表盘客户端状态用 Zustand store 管理：WS 事件池 + 按题聚合缓存 + 最近 N 条流水。页面刷新丢失可接受（课后自动切 v4.0 recap stats）。
- **D-08:** 「作答实时」tab 作为 `/classroom` 控制室的 sibling tab，与现有 recap / control tab 水平并列。遵循 DESIGN.md tonal surface 层级。
- **D-09:** 「作答实时」tab 零写操作（grep 静态断言：不含 `update*` / `delete*` / `grade*` Server Action 引用）。
- **D-10:** `cacheTags.quizStats(sessionId)` 5 题型 stats DTO 段复用 v4.0 cache tag 体系，`updateTag` 在 `submitQuizSampleAnswerAction` 写入成功后失效。
- **D-11:** Plan 73-02 依赖 Plan 73-01 的 DAL 写入 hook 点（写入成功后触发 `quiz.answer.received`）。两 plan 不并行。

### the agent's Discretion

- 5 题型具体 payload JSON shape 设计（多选数组格式、判断布尔 vs 字符串、填空字符串格式、排序数组格式）
- Zustand store 内部结构设计（事件池上限、聚合缓存策略、N 值默认）
- Dashboard tab 在 `ClassroomControlPanel` 内的具体集成位置
- 新 Command Bus command type `quiz.answer.received` 的 handler 实现细节
- `buildQuizSampleRecapStats` 5 题型 stats 扩展的具体数据结构

### Deferred Ideas (OUT OF SCOPE)

- `QUIZ-EXT-03` (post-class interactive review / AI 出题)
- `MKT-EXT-01/02/03` (marketplace extras)
- `STORE-01` (商业 storefront)
- 非 quiz 类插件、upgrade dry-run、跨 pluginKey 恢复
- 教师批改 / 评分 / 排名 / 竞争机制
- 新建 WS endpoint / 第二 transport runtime
- `plugin_owned_quiz_responses` 表 schema 变更

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | 0.45.2 (installed) | Schema definition + migrations | Project standard; SQLite dialect with `drizzle-kit@0.31.10` for migration generation |
| Next.js 16 Cache | 16.2.4 (installed) | `updateTag` / `cacheTags.quizStats()` | Project standard; `submitQuizSampleAnswerAction` already calls `updateTag(cacheTags.quizStats(sessionId))` |
| Zod | 4.4.3 (installed) | DTO schema validation | Project standard; DTO layers in `src/lib/dto/classroom.ts` use Zod extensively |
| `dispatchPluginDataAccess` | (internal) | Governed 5-verb data access facade | Project built-in; all quiz DAL operations go through this single entry point |
| Command Bus (`dispatchPlatformCommand`) | (internal) | Write command dedup + event emission | Project built-in; `quiz.answer.received` will be a new command type in the registry |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zustand | 5.0.14 (npm latest, not yet installed) | Client-side WS event state management | Dashboard tab client-side aggregation: event pool + per-question cache + recent N stream |
| `ws` | 8.20.1 (installed) | WebSocket server | v2.2 `classroom-ws` transport already uses `ws`; new event kind rides existing connection |
| `subscribeClassroomSocket` | (internal) | Client-side WS subscriber | `ClassroomControlPanel` already uses this; dashboard tab subscribes via same client |
| `buildClassroomWebSocketServerEnvelope` | (internal) | WS envelope builder | Builds `quiz.answer.received` envelope for teacher broadcast |
| `publishTransportEvent` / `gateway.ts` | (internal) | Transport publish gateway | Routes `quiz.answer.received` through WS adapter + optional Redis fanout |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand 5 | React Context + useReducer | Zustand provides selector-based subscriptions (avoids unnecessary re-renders with large event pools) and is already in the project's recommended stack |
| New WS endpoint | Reuse v2.2 `/api/ws/classroom/` | Decision locked: v2.2 endpoint reused, no new endpoint created |
| Server Action → direct WS push | Command Bus → transport | Decision locked: Command Bus decouples write from transport layer |

**Installation:**
```bash
npm install zustand@5.0.14
```

**Version verification:**
- `npm view zustand version` → 5.0.14 (2026-06-07) [VERIFIED: npm registry]
- `npm view next version` → 16.2.7 (latest; project pinned at 16.2.4) [VERIFIED: npm registry]
- `npm view zod version` → 4.4.3 (matches project pin) [VERIFIED: npm registry]
- `npm view ws version` → 8.21.0 (project at 8.20.1) [VERIFIED: npm registry]
- Drizzle ORM 0.45.2 + drizzle-kit 0.31.10 confirmed via local install [VERIFIED: local node_modules]

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| zustand | npm | ~6 yrs | ~8M/wk | github.com/pmndrs/zustand | [ASSUMED] | Approved — well-known, high-downloads, official docs verified |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*Slopcheck JSON parsing failed — `zustand` tagged `[ASSUMED]` per protocol. However, the package is verified via npm registry inspection: 6+ years old, ~8M weekly downloads, official GitHub repo `pmndrs/zustand`. Risk is negligible.*

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│ Plan 73-01: Multi-Type Quiz Data Model + DAL + Stats                 │
│                                                                      │
│  data-model.ts ──► compile-plugin-data-model ──► quiz.ts (generated) │
│       │                    │                      │                  │
│       ▼                    ▼                      ▼                  │
│  +questionType        +allowlist entry      +questionType column     │
│  +5-type payloads     accepts questionType   Drizzle migration       │
│                                                                      │
│  submitQuizSampleAnswerAction                                        │
│       │                                                              │
│       ▼                                                              │
│  dispatchPluginDataAccess(verb:"upsert", table:"...quiz_responses")  │
│       │                                                              │
│       ├──► append-only/isLatest flip (D-72.1-04)                     │
│       ├──► updateTag(cacheTags.quizStats(sessionId))                 │
│       └──► [Hook point for Plan 73-02]                               │
│                                                                      │
│  buildQuizSampleRecapStats (extended)                                │
│       │                                                              │
│       ├──► single_choice: countByOption (existing)                   │
│       ├──► multi_choice: countByOptionSet (new)                      │
│       ├──► true_false: countByBool (new)                             │
│       ├──► fill_blank: topAnswers (new)                              │
│       └──► ordering: topOrderings (new)                              │
│                                                                      │
│  ClassroomSessionRecapSurface ──► grouped by questionType            │
└──────────────────────────────────────────────────────────────────────┘

                               │
                               │ Plan 73-02 depends on Plan 73-01's
                               │ DAL write hook point
                               ▼

┌──────────────────────────────────────────────────────────────────────┐
│ Plan 73-02: WS Event + Teacher Live Dashboard                        │
│                                                                      │
│  submitQuizSampleAnswerAction (DAL write success)                    │
│       │                                                              │
│       ▼                                                              │
│  dispatchPlatformCommand({                                           │
│    type: "quiz.answer.received",                                     │
│    payload: { questionId, studentId, responseType, payload, ... }    │
│  })                                                                  │
│       │                                                              │
│       ▼                                                              │
│  Command Bus → registry handler → persistPlatformEvents              │
│       │                                                              │
│       └──► publishTransportEvent(                                    │
│              channel: "classroom",                                   │
│              kind: "quiz.answer.received",                           │
│              truthRef: { type: "classroom-event", id, ... }         │
│            )                                                         │
│               │                                                      │
│               ├──► ws-adapter.ts → buildServerEnvelope               │
│               │       │                                              │
│               │       ├──► classroomRedisFanoutManager.deliver()     │
│               │       │    (if REDIS_URL; delivery only)             │
│               │       └──► ws-connection-registry → WebSocket.send() │
│               │           (teacher-only routing)                     │
│               │                                                      │
│  Client: subscribeClassroomSocket({ actorScope: "teacher" })         │
│       │                                                              │
│       ▼                                                              │
│  onRuntimeEvent(envelope) → if kind === "runtime.event" &&           │
│    payload.kind === "quiz.answer.received"                           │
│       │                                                              │
│       ▼                                                              │
│  Zustand store (useQuizLiveAnswerStore)                              │
│       │                                                              │
│       ├──► eventPool: QuizAnswerEvent[] (ring buffer, max 200)       │
│       ├──► perQuestionAggregation: Map<questionId, AggregatedStats>  │
│       └──► recentNStream: QuizAnswerEvent[] (latest N=20)            │
│               │                                                      │
│               ▼                                                      │
│  LiveAnswerDashboardSurface (read-only, zero write Server Actions)   │
│       │                                                              │
│       ├──► QuestionAggregationPanel (per-question distribution)      │
│       ├──► RecentAnswersStream (latest N submissions)                │
│       └──► FillBlankTopAnswers (top answers for fill_blank)          │
└──────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (additions only)

```
plugins/quiz-sample/
├── data-model.ts              # [MODIFY] Add questionType + 5-type payload declarations
│
src/db/
├── drizzle/
│   └── 000X_add_question_type.sql  # [NEW] Hand-written migration
├── schema/generated/plugin-owned/
│   ├── quiz.ts                # [REGENERATE] Auto-generated with questionType column
│   └── data-access-allowlist.ts  # [REGENERATE] Auto-generated with questionType in allowlist
│
src/lib/
├── dto/
│   ├── plugin-data-model.ts   # [MODIFY] Add questionType to ColumnSpecSchema / accept new payload
│   └── classroom.ts           # [MODIFY] Extend ClassroomSessionRecapQuizQuestionStatDTOSchema for 5 types
├── dal/
│   └── classroom.ts           # [MODIFY] Extend buildQuizSampleRecapStats + submitQuizSampleAnswer
│
src/actions/
└── classroom-actions.ts       # [MODIFY] submitQuizSampleAnswerAction: add Command Bus dispatch hook
│
src/features/
├── platform-core/commands/
│   ├── registry.ts            # [MODIFY] Register "quiz.answer.received" command type handler
│   └── handlers/
│       └── quiz-answer-received.ts  # [NEW] Command handler: emit event → publishTransportEvent
├── runtime-platform/seams/transport/
│   ├── ws-envelope.ts         # [MODIFY] Add "quiz.answer.received" to message kind enum (or via runtime.event)
│   └── ws-adapter.ts          # [MODIFY] resolveWebSocketTransportKind: handle quiz events
│
src/components/classroom/
├── live-answer-dashboard-surface.tsx  # [NEW] Read-only dashboard component
├── live-answer-dashboard-store.ts     # [NEW] Zustand store for WS event aggregation
└── classroom-control-panel.tsx        # [MODIFY] Add "作答实时" tab entry
```

### Pattern 1: Data Model → Schema Generation Pipeline

**What:** Modify the single source of truth (`plugins/quiz-sample/data-model.ts`) → run `compile-plugin-data-model.ts` → get generated Drizzle schema + auto-updated allowlist → hand-write Drizzle migration for additive column.

**When to use:** Whenever the plugin-owned table schema needs to change. This is the established pattern from Phase 67–68.

**Example:**
```typescript
// Source: plugins/quiz-sample/data-model.ts (existing pattern)
// ADD to the plugin_owned_quiz_questions table columns array:
{
  name: "questionType",
  type: "enum",
  notNull: true,
  enumValues: ["single_choice", "multi_choice", "true_false", "fill_blank", "ordering"],
  default: "single_choice",
},
```

**After modifying, run:**
```bash
npx tsx scripts/compile-plugin-data-model.ts
npx drizzle-kit generate  # generates migration
```

### Pattern 2: append-only/isLatest Write (D-72.1-04)

**What:** Student submissions use `dispatchPluginDataAccess({ verb: "upsert", ... })` which, for tables with `uniques` declared, automatically executes `UPDATE SET isLatest = false` → `INSERT isLatest = true` in a transaction. The `selectedOption` column stores JSON for multi-choice answers.

**When to use:** All student quiz answer submissions, regardless of question type. The facade handles the `isLatest` flip transparently.

**Example:**
```typescript
// Source: src/lib/dal/classroom.ts:2324-2335 (existing pattern, to be extended)
const writeResult = await dispatchPluginDataAccess({
  actor: user.id,
  pluginKey: "quiz",
  verb: "upsert",
  table: "plugin_owned_quiz_responses",
  values: {
    classroomSession: session.id,
    student: user.id,
    question: payload.stepId,
    selectedOption: payload.selectedOption, // Now accepts: string, array, "true"/"false"
  },
});
```

### Pattern 3: Command Bus → Transport Event Publish

**What:** A Server Action, after successful DAL write, dispatches a `PlatformCommand` via `dispatchPlatformCommand()`. The command's handler emits a `PlatformEvent`, which the in-process event adapter routes to `publishTransportEvent()`. This decouples the write path from the transport delivery.

**When to use:** For `quiz.answer.received` — a new command type with a dedicated handler. Pattern mirrors Phase 62 `lesson.draft.run` producer → handler → event flow.

**Flow:**
```
submitQuizSampleAnswerAction (DAL write success)
  → dispatchPlatformCommand({ type: "quiz.answer.received", payload: {...} })
  → handler: quizAnswerReceivedHandler
    → emits: { type: "quiz.answer.received", payload: {...} }
    → inProcessEventAdapter → publishTransportEvent({ channel: "classroom", kind: "quiz.answer.received" })
    → ws-adapter.deliver() → buildServerEnvelope → Redis fanout / WebSocket broadcast
```

### Pattern 4: Zustand Store for WS Event Aggregation

**What:** A Zustand store subscribes to the existing `subscribeClassroomSocket` (via `onRuntimeEvent` callback) and maintains an in-memory event pool + per-question aggregation cache. Page refresh clears state (acceptable constraint — post-class recap covers persistence).

**When to use:** Client-side aggregation of high-frequency events where SQLite writes aren't needed for live display.

**Store shape:**
```typescript
// Source: pattern inferred from Zustand docs + existing subscribeClassroomSocket usage
type QuizLiveAnswerStore = {
  eventPool: QuizAnswerEvent[];           // ring buffer, last 200 events
  perQuestionCache: Map<string, {         // questionId → aggregated stats
    questionType: QuestionType;
    distribution: Record<string, number>;  // option/count pairs
    totalAnswers: number;
    lastUpdatedAt: string;
  }>;
  recentStream: QuizAnswerEvent[];        // last N (default 20) events
  addEvent: (event: QuizAnswerEvent) => void;
  clearSession: () => void;
};
```

### Anti-Patterns to Avoid

- **Server Action → direct WS push:** Bypasses Command Bus, loses dedup/auditability. Decision locked (D-04): must go through Command Bus.
- **New WS endpoint:** Creates second transport surface, breaks v2.2 contract. Decision locked: reuse `/api/ws/classroom/`.
- **`plugin_owned_quiz_responses` schema change:** Would break v4.0 unique indices. Decision locked: use `selectedOption` column for all payloads.
- **Dashboard tab writes to DB:** Violates D-09 read-only posture. Must grep-verify zero write operations.
- **Integer position reordering:** Would cause cascade updates. LexoRank is the project standard for ordering.
- **Bypassing `compile-plugin-data-model.ts`:** Hand-editing `src/db/schema/generated/quiz.ts` directly would cause drift from the source `data-model.ts` and break the compilation pipeline.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Client-side event state management | Custom React Context + reducer for WS events | Zustand 5.0 store with selector subscriptions | Zustand provides efficient re-render control (subscribers only re-render when their selected slice changes), which matters with high-frequency WS events. Already recommended in project STACK.md. |
| append-only/isLatest write logic | Custom transaction with manual `UPDATE` + `INSERT` | `dispatchPluginDataAccess({ verb: "upsert", ... })` | The facade transparently handles `isLatest` flip based on `uniques` declaration. Battle-tested in v4.0 Phase 69. |
| Command deduplication | Custom idempotency key | `dispatchPlatformCommand` with `dedupeKey` | Command Bus provides built-in dedup: same command → returns cached result, no duplicate execution. |
| WS routing (teacher vs student) | Custom role check in message handler | Existing `ws-auth.ts` + `actorScope` | `authenticateClassroomWebSocket` already derives `actorScope` from session membership. Dashboard tab subscribes with `actorScope: "teacher"`. |
| Real-time stats aggregation SQL | Live SQL queries on every WS event | Client-side Zustand aggregation from WS event pool | SQLite is the truth source for recap, but live dashboard uses in-memory aggregation to avoid DB write churn on every student answer. Post-class recap falls back to DAL queries. |
| Schema migration generation | `drizzle-kit push` (dev-only) | `drizzle-kit generate` + hand-reviewed migration | Migration-first discipline required by project; `push` is only for local experiments. |

**Key insight:** v4.0 established a layered architecture where the same facade (`dispatchPluginDataAccess`) serves all 5 verbs for any plugin-owned table. Phase 73 extends the `questionType` column in the questions table and the `selectedOption` payload semantics in the responses table — both riding the existing facade without new governance paths. The only truly "new" infrastructure is the `quiz.answer.received` Command Bus → transport bridge and the client-side Zustand store.

## Runtime State Inventory

> Phase 73 is additive (extends existing tables, adds new column/client components), not a rename/refactor/migration of deployed runtime state. The following categories are assessed for completeness.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Existing `plugin_owned_quiz_questions` rows without `questionType` — migration must backfill `DEFAULT 'single_choice'` | Data migration: `ALTER TABLE ADD COLUMN questionType TEXT NOT NULL DEFAULT 'single_choice'` handles existing rows automatically |
| Live service config | No live service config affected — Redis fanout is already configured in v2.2 transport, new event type rides same channel | None |
| OS-registered state | None — web app, no OS state | None — verified by architecture review |
| Secrets/env vars | `REDIS_URL` — already present in v2.2 transport config; `AUTH_SECRET` — unchanged | None |
| Build artifacts | `src/db/schema/generated/plugin-owned/quiz.ts` — must be regenerated after `data-model.ts` change | Rebuild: run `npx tsx scripts/compile-plugin-data-model.ts` after editing data-model.ts |

**Nothing found in category:** OS-registered state (none), Live service config (none beyond existing Redis setup), Secrets (unchanged).

## Common Pitfalls

### Pitfall 1: DTO Schema Drift — Old `single_choice` Payload Rejected

**What goes wrong:** After extending Zod schema with discriminated union for 5 question types, the existing `single_choice` payload (which was just `z.enum(["A","B","C","D"])`) may fail validation under the new union schema if backward compatibility is not explicitly tested.

**Why it happens:** Zod discriminated unions require all variants to have unique discriminators. If the new DTO schema changes the shape of `selectedOption` from a simple string to a union that requires a `responseType` discriminator, old payloads break.

**How to avoid:** 
- Keep `selectedOption` as a flexible column (`text` not `enum`) in the responses table
- In the new DTO, use `z.union([z.string(), z.array(z.string()), z.boolean()])` for the payload field
- Write explicit backward-compat test: verify old `{ selectedOption: "A" }` still validates

**Warning signs:** Zod validation errors in `submitQuizSampleAnswerAction` after schema change; existing Phase 69 integration tests fail.

### Pitfall 2: `questionType` Enum Causes `selectedOption` Column Drift

**What goes wrong:** The `questionType` is on `plugin_owned_quiz_questions` (the questions table), but `selectedOption` is on `plugin_owned_quiz_responses` (the answers table). If the code assumes `selectedOption` enum values map to question type (e.g., `selectedOption.enum: ["A","B","C","D"]` works for single_choice but not for multi_choice arrays), the auto-generated allowlist's `enumColumns` will be wrong.

**Why it happens:** The compiler generates `enumColumns` for `selectedOption` based on the declared enum values in `data-model.ts`. Currently it's `["A","B","C","D"]`. For multi-type support, `selectedOption` must become a free-form text column (not enum) since it stores JSON for multi_choice arrays.

**How to avoid:**
- Change `selectedOption` in `data-model.ts` from `type: "enum"` to `type: "text"` with `notNull: true`
- Remove `enumValues` from its declaration
- The allowlist will treat it as a plain text column, accepting any string (including JSON)
- Validation is moved to the DTO/Server Action layer (Zod discriminated union)

### Pitfall 3: Command Bus Event Not Reaching WS Transport

**What goes wrong:** `dispatchPlatformCommand({ type: "quiz.answer.received" })` succeeds and emits an event, but the event never reaches the WS adapter → teacher dashboard shows no live updates.

**Why it happens:** The event from the command handler must be picked up by the in-process event adapter, which must then call `publishTransportEvent()`. If the event type is not in the adapter's routing table, or if the `publishTransportEvent` channel/kinds don't match what `ws-adapter.ts` expects, the event is silently dropped.

**How to avoid:**
- Follow the existing `lesson.draft.run` → `publishTransportEvent` pattern in `plugin-data.ts` producer
- Ensure the event's `channel` is `"classroom"` and `kind` starts with a known prefix (`quiz.` → resolves to `runtime.event` in `resolveWebSocketTransportKind`)
- Add `quiz.` prefix handling in `ws-adapter.ts:resolveWebSocketTransportKind` if not already covered
- Integration test: mock the transport layer, assert `publishTransportEvent` is called with correct envelope

### Pitfall 4: Teacher-Only WS Event Leaking to Students

**What goes wrong:** The `quiz.answer.received` event is broadcast to all WebSocket connections in the session, including students, potentially leaking other students' answers.

**Why it happens:** The current `classroomRedisFanoutManager.deliver()` broadcasts to all connections in a session. Teacher-only filtering must happen either at the WS server level or the fanout level.

**How to avoid:**
- In `ws-adapter.ts:deliver()`, filter connections by `actorScope === "teacher"` before sending
- The `classroomWebSocketConnectionRegistry` already tracks `actorScope` per connection — use this to filter
- Alternatively, use the existing `classroomRedisFanoutManager` subchannel routing to create a `teacher-only` subchannel
- Integration test: connect as student, verify no `quiz.answer.received` events received

### Pitfall 5: Zustand Store Leaking Across Sessions

**What goes wrong:** When the teacher switches between sessions or closes a tab, the Zustand store retains events from the previous session, showing stale data.

**Why it happens:** Zustand stores are module-level singletons by default. Without explicit session-scoped cleanup, event pools accumulate across sessions.

**How to avoid:**
- Store is created per-component or per-hook call (not module-level singleton)
- Use `useEffect` cleanup to call `store.clearSession()` when sessionId changes
- The `subscribeClassroomSocket` subscription is already session-scoped (keyed by `sessionId`) — align store lifecycle with subscription lifecycle
- Use Zustand's `createStore` (not `create`) for scoped instances, or React context to scope the store

## Code Examples

Verified patterns from the existing codebase:

### Pattern: dispatchPluginDataAccess for quiz answer submission

```typescript
// Source: src/lib/dal/classroom.ts:2324-2335
// This is the existing write path — Phase 73 extends it with multi-type payloads

const writeResult = await dispatchPluginDataAccess({
  actor: user.id,
  pluginKey: "quiz",
  verb: "upsert",
  table: "plugin_owned_quiz_responses",
  values: {
    classroomSession: session.id,
    student: user.id,
    question: payload.stepId,
    selectedOption: payload.selectedOption, // Now accepts: "A" | ["A","C"] | "true" | "填空文本" | ["id1","id2"]
  },
});
```

### Pattern: buildClassroomWebSocketServerEnvelope for event broadcast

```typescript
// Source: src/features/runtime-platform/seams/transport/ws-envelope.ts:104-120
// Phase 73 will use this to wrap quiz.answer.received events

const serverEnvelope = buildClassroomWebSocketServerEnvelope({
  sessionId,
  actor: { userId, scope: "teacher", schoolId },
  kind: "runtime.event",  // quiz events ride the runtime.event kind
  correlationId,
  payload: {
    channel: "classroom",
    kind: "quiz.answer.received",
    questionId, studentId, responseType, payload: answerPayload, receivedAt, classroomSessionId,
  },
});
```

### Pattern: subscribeClassroomSocket for teacher dashboard

```typescript
// Source: src/components/classroom/classroom-control-panel.tsx:135-161 + classroom-ws-client.ts:107-155
// Existing pattern; Phase 73 dashboard tab subscribes identically

const subscription = subscribeClassroomSocket({
  sessionId,
  actorScope: "teacher",
  onRuntimeEvent(envelope) {
    if (envelope.payload.kind === "quiz.answer.received") {
      // Route to Zustand store
      useQuizLiveAnswerStore.getState().addEvent(envelope.payload);
    }
  },
  onSnapshot(snapshot) { /* existing handler */ },
  onTransportError() { /* fallback */ },
  onClose() { /* cleanup */ },
});
```

### Pattern: State-of-the-Art Drizzle Migration (additive column)

```sql
-- Source: Drizzle migration pattern from project history
-- Migration file: src/db/drizzle/000X_add_question_type.sql

ALTER TABLE plugin_owned_quiz_questions 
ADD COLUMN questionType TEXT NOT NULL DEFAULT 'single_choice';
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `selectedOption.enum: ["A","B","C","D"]` in data-model | `selectedOption.type: "text"` (free-form, stores JSON) | Phase 73 | Enables multi_choice arrays, true_false booleans, fill_blank strings, ordering arrays in the same column |
| `correctOption.enum: ["A","B","C","D"]` | Retained for single_choice; new `correctAnswer` JSON column for other types or per-type validation in DTO | Phase 73 (decision at discretion) | Multi-type questions need different correct answer shapes |
| Quiz submit: only validates A/B/C/D | Validates per questionType: array for multi_choice, boolean for true_false, string for fill_blank, array for ordering | Phase 73 | Server Action validation boundary expands |
| Recap stats: countByOption only | countByOptionSet + countByBool + topAnswers + topOrderings | Phase 73 | Recap surface renders different visualizations per questionType |
| No WS events for student answers | `quiz.answer.received` via Command Bus | Phase 73 | Teacher gets real-time answer visibility |

**Deprecated/outdated:**
- `selectedOption` as `enum` type in `data-model.ts` — must become `text` to support multi-type JSON payloads
- `QuizSampleAnswerSlotSchema = z.enum(["A","B","C","D"])` — must become `z.union([z.string(), z.array(z.string()), z.boolean()])` or discriminated union

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Zustand 5.0.14 is compatible with React 19.2 (project version) | Standard Stack | Zustand 5 dropped React <18 support but should work with 19; if compatibility issue exists, fallback to React Context + useReducer |
| A2 | `resolveWebSocketTransportKind` in `ws-adapter.ts` handles `quiz.` prefix via the generic `runtime.event` catch-all | Architecture Patterns | If the routing fails, `quiz.answer.received` events won't reach WebSocket; need to verify with integration test |
| A3 | `classroomRedisFanoutManager.deliver()` broadcasts to all connections regardless of `actorScope` — teacher-only filtering must be added | Common Pitfalls | Student connections could receive other students' answer data; must verify filtering exists or implement it |
| A4 | The `selectedOption` column in `plugin_owned_quiz_responses` can be changed from `enum` to `text` without breaking existing Drizzle queries (the `enum` type in SQLite is just a `CHECK` constraint on a TEXT column) | Standard Stack | SQLite `TEXT` columns with enum check constraint are compatible; removing the enum makes it pure TEXT — existing `SELECT ... WHERE selectedOption = 'A'` queries still work |
| A5 | `questionType` default `'single_choice'` migration works for existing rows without data loss | Common Pitfalls | If existing rows have null `questionType` after migration (due to missing DEFAULT), the DAL will fail on reads; verify with migration test on seeded DB |

## Open Questions

1. **`quiz.answer.received` command type registration location**
   - What we know: New command type must be registered in the Command Bus registry (`src/features/platform-core/commands/registry.ts`). The handler should emit a `PlatformEvent` that the in-process event adapter picks up and routes to `publishTransportEvent`.
   - What's unclear: Whether to create a standalone `quiz-answer-received.ts` handler or extend an existing handler. The `plugin-data.ts` producer already handles `plugin.data.insert`/`plugin.data.upsert` — `quiz.answer.received` could either be a separate command type with its own handler, or be emitted as a side effect within the existing upsert handler.
   - Recommendation: Use a **separate command type** with a dedicated handler, dispatched by `submitQuizSampleAnswerAction` after the DAL write succeeds. This keeps the write path clean (existing `plugin.data.upsert` handles the DB write) and the notification path separate.

2. **Multi-choice correct answer storage**
   - What we know: For `single_choice`, `correctOption` is `"A"|"B"|"C"|"D"`. For `multi_choice`, the correct answer is `["A","C"]`. For `true_false`, it's `true`/`false`. For `fill_blank`, it's a string. For `ordering`, it's an ordered array.
   - What's unclear: Whether to add a `correctAnswer` TEXT column to `plugin_owned_quiz_questions` for non-single_choice types, or to overload `correctOption`.
   - Recommendation: **Keep `correctOption` as-is** for single_choice backward compat. Add a new `correctAnswer` TEXT column (nullable, only used for non-single_choice types) in the data-model declaration. The recap stats builder reads `questionType` first, then uses the appropriate correct answer field.

3. **Selected option DTO validation strategy**
   - What we know: The `QuizSampleAnswerSlotSchema` is `z.enum(["A","B","C","D"])` and is used in both the Server Action input validation and the DAL write. It must be expanded to accept 5 types.
   - What's unclear: Whether to use a Zod discriminated union based on question type (requiring a DB lookup before validation) or a relaxed union that validates per-type in the DAL layer.
   - Recommendation: Use a **relaxed input schema** at the Server Action boundary (`z.union([z.string(), z.array(z.string()), z.boolean()])`), then validate shape-per-type in the DAL `submitQuizSampleAnswer` function after looking up `questionType`. This keeps the action boundary simple and puts type-specific validation where the question data is already loaded.

4. **Dashboard tab placement in ClassroomControlPanel layout**
   - What we know: The dashboard tab is a sibling to the existing control panel, not a new route. The `ClassroomConsoleSurface` renders either `ClassroomSessionRecapSurface` (ended) or `ClassroomControlPanel` (live).
   - What's unclear: Whether the dashboard tab is inside `ClassroomControlPanel` (as a tab within the live view) or a separate sibling surface alongside it.
   - Recommendation: Place it **inside** `ClassroomControlPanel` as a tab alongside the existing control view. The control panel already has a sidebar (right column with `ClassroomRosterPanel`, etc.) and a main content area — the dashboard tab can occupy the main content area when selected, replacing the step list/voting round view.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | 24.1.0 | — (exceeds v20.9 minimum) |
| npm | Package management | ✓ | 11.7.0 | — |
| SQLite (libSQL) | Database | ✓ | 3.53.2 (system) + `@libsql/client` | — |
| Drizzle Kit | Migration generation | ✓ | 0.31.10 | — |
| `ws` (WebSocket) | WS server | ✓ | 8.20.1 (in node_modules) | — |
| Redis | Optional fanout | ✗ | — | Process-local bus (contract test verifies equivalence) |
| Zustand | Client state store | ✗ | Not installed (npm: 5.0.14 available) | npm install required |
| `slopcheck` | Package legitimacy | ✓ | 0.6.1 | — |

**Missing dependencies with no fallback:**
- Zustand — must be installed before Plan 73-02 implementation

**Missing dependencies with fallback:**
- Redis — optional; contract test must verify behavior equivalence with/without `REDIS_URL`

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (project standard) |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run --reporter=verbose src/lib/dal/classroom.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QUIZ-EXT-01-A | `questionType` column exists in `plugin_owned_quiz_questions` with 5 enum values; migration backward-compatible with old rows defaulting to `single_choice` | unit (migration) | `npx vitest run src/db/schema/` | ❌ Wave 0 — new migration needs test |
| QUIZ-EXT-01-B | `data-model.ts` compiles correctly with new `questionType` field; allowlist accepts `questionType` in `getByIndex`/`aggregate` | unit (compiler) | `npx vitest run src/lib/dto/plugin-data-model.test.ts` | ✅ Existing pattern — extend with new assertions |
| QUIZ-EXT-01-C | 5 question types × 4 verbs (insert/getByIndex/count/aggregate) = 20 DAL test cases | unit (DAL) | `npx vitest run src/lib/dal/classroom.test.ts` | ✅ Existing pattern — extend with 20 new cases |
| QUIZ-EXT-01-D | append-only/isLatest flip for all 5 question types; `updateTag(cacheTags.quizStats())` fires on write | unit (DAL) | `npx vitest run src/lib/dal/classroom.test.ts` | ✅ Existing pattern — extend |
| QUIZ-EXT-01-E | `buildQuizSampleRecapStats` returns correct stats for 5 types; `ClassroomSessionRecapSurface` renders grouped by `questionType` | unit + snapshot | `npx vitest run src/lib/dal/classroom.test.ts src/components/classroom/classroom-session-recap-surface.test.tsx` | ✅ Existing pattern — extend |
| QUIZ-EXT-02-A | `quiz.answer.received` event schema valid; teacher-only channel verified; 30 concurrent submissions reach dashboard | integration (WS) | `npx vitest run src/features/runtime-platform/seams/transport/` | ❌ Wave 0 — new WS event integration test needed |
| QUIZ-EXT-02-B | Redis fanout contract test: with and without `REDIS_URL` | unit (contract) | `npx vitest run src/features/runtime-platform/seams/transport/redis-fanout-manager.test.ts` | ✅ Existing pattern — extend with quiz event type |
| QUIZ-EXT-02-C | Dashboard tab renders at `/classroom`; teacher-only access control | unit (component + auth) | `npx vitest run src/components/classroom/live-answer-dashboard-surface.test.tsx` | ❌ Wave 0 |
| QUIZ-EXT-02-D | Per-question aggregation + recent N stream renders correctly with sample events | unit (component) | `npx vitest run src/components/classroom/live-answer-dashboard-surface.test.tsx` | ❌ Wave 0 |
| QUIZ-EXT-02-E | grep: dashboard surface contains zero `update*`/`delete*`/`grade*` Server Action calls | static (grep) | `grep -q "update.*=\|delete.*=\|grade.*=" src/components/classroom/live-answer-dashboard-surface.tsx` | ❌ Wave 0 — must be added to verify script |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose` (targeting changed files)
- **Per wave merge:** `npx vitest run` (full suite)
- **Phase gate:** `pnpm verify:phase73` (new script combining unit + integration + grep assertions)

### Wave 0 Gaps
- [ ] `src/components/classroom/live-answer-dashboard-surface.test.tsx` — covers QUIZ-EXT-02-C, QUIZ-EXT-02-D, QUIZ-EXT-02-E
- [ ] `src/components/classroom/live-answer-dashboard-store.test.ts` — Zustand store unit tests (event pool, aggregation, clearSession)
- [ ] `src/features/platform-core/commands/handlers/quiz-answer-received.test.ts` — command handler unit test
- [ ] `src/features/runtime-platform/seams/transport/` — WS integration test for `quiz.answer.received` routing
- [ ] `scripts/verify-phase73-quiz-ext.ts` — new verify script with 8+ static assertions + 3+ executable assertions (per ROADMAP)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Auth.js v5 JWT via `ws-auth.ts` — `getToken()` + `memberships.status === "active"` + `classMembers.role === "student"` / `session.teacherId === userId` |
| V3 Session Management | yes | WS connection bound to classroom session; `subscribeClassroomSocket` is sessionId-scoped; connection drops → state cleared |
| V4 Access Control | yes | Teacher-only WS channel: `actorScope === "teacher"` guards `quiz.answer.received` delivery; dashboard tab access: `userProfiles.role = 'teacher' && classroomSessionId owner` |
| V5 Input Validation | yes | Zod: `QuizSampleAnswerSlotSchema` extends to validate 5 types; `ws-envelope.ts` validates all incoming envelopes; DTO layer validates stats payloads |
| V6 Cryptography | no | No cryptographic operations in this phase |

### Known Threat Patterns for Quiz/WS Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Student injects fake `quiz.answer.received` via WS client | Spoofing | WS messages from students are validated as `ClientEnvelopeSchema`; only server-emitted events reach teacher dashboard — students cannot publish `runtime.event` messages with teacher scope |
| Teacher dashboard XSS from student-submitted fill_blank text | Tampering / XSS | React auto-escapes JSX text; fill_blank answers rendered as text content (not `dangerouslySetInnerHTML`); Zod validation ensures string type |
| Timing attack: observing other students' answers via WS event timing | Information Disclosure | Teacher-only channel authenticated by `ws-auth.ts`; student connections never receive `quiz.answer.received`; student actor scope never gets `runtime.event` of this type |
| Denial of Service: flood of `quiz.answer.received` events overwhelms client | Denial of Service | Zustand store ring buffer capped at 200 events; per-question aggregation is O(1) per event; browser tab can throttle rendering via `requestAnimationFrame` |
| SQL injection via `selectedOption` payload | Tampering | All DB writes go through `dispatchPluginDataAccess` which uses parameterized Drizzle ORM queries — no raw SQL concatenation; Zod validation before DAL access |

## Sources

### Primary (HIGH confidence)
- `plugins/quiz-sample/data-model.ts` — existing quiz data model declaration (single truth source, Phase 67) [VERIFIED: local codebase]
- `scripts/compile-plugin-data-model.ts` — compiler that generates Drizzle schema from data-model declarations [VERIFIED: local codebase]
- `src/db/schema/generated/plugin-owned/quiz.ts` — auto-generated quiz schema (verified consistent with data-model.ts) [VERIFIED: local codebase]
- `src/db/schema/generated/plugin-owned/data-access-allowlist.ts` — auto-generated allowlist [VERIFIED: local codebase]
- `src/lib/dto/plugin-data-model.ts` — DTO meta-schema with `PluginDataModelSchema` Zod validation [VERIFIED: local codebase]
- `src/lib/dto/classroom.ts` — Classroom DTO schemas including `ClassroomSessionRecapQuizStatsSectionDTOSchema` [VERIFIED: local codebase]
- `src/lib/dal/classroom.ts` — `submitQuizSampleAnswer` + `buildQuizSampleRecapStats` implementation [VERIFIED: local codebase]
- `src/actions/classroom-actions.ts` — `submitQuizSampleAnswerAction` with `updateTag(cacheTags.quizStats())` [VERIFIED: local codebase]
- `src/lib/cache-policy.ts` — `cacheTags.quizStats(sessionId)` definition [VERIFIED: local codebase]
- `src/features/platform-core/plugin-data-access/facade.ts` — `dispatchPluginDataAccess` facade with 5-verb routing [VERIFIED: local codebase]
- `src/features/platform-core/commands/bus.ts` — `dispatchPlatformCommand` implementation [VERIFIED: local codebase]
- `src/features/platform-core/commands/producers/plugin-data.ts` — write-verb producers for `plugin.data.insert`/`plugin.data.upsert` [VERIFIED: local codebase]
- `src/features/runtime-platform/seams/transport/ws-envelope.ts` — WS envelope schema with message kinds [VERIFIED: local codebase]
- `src/features/runtime-platform/seams/transport/ws-server.ts` — WS server with `handleClassroomWebSocketClientMessage` [VERIFIED: local codebase]
- `src/features/runtime-platform/seams/transport/ws-auth.ts` — `authenticateClassroomWebSocket` with membership/role checks [VERIFIED: local codebase]
- `src/features/runtime-platform/seams/transport/ws-adapter.ts` — `wsRuntimeTransportAdapter.deliver()` method [VERIFIED: local codebase]
- `src/features/runtime-platform/seams/transport/gateway.ts` — `publishTransportEvent` with adapter routing [VERIFIED: local codebase]
- `src/features/runtime-platform/seams/transport/contract.ts` — `RuntimeTransportEnvelopeSchema` and related types [VERIFIED: local codebase]
- `src/components/classroom/classroom-control-panel.tsx` — current control panel with WS subscription + voting round display [VERIFIED: local codebase]
- `src/components/classroom/classroom-ws-client.ts` — `subscribeClassroomSocket` with `onRuntimeEvent` callback [VERIFIED: local codebase]
- `src/components/classroom/classroom-session-recap-surface.tsx` — recap surface rendering quiz stats [VERIFIED: local codebase]
- `src/app/(classroom)/classroom/page.tsx` — classroom route with session/recap routing [VERIFIED: local codebase]
- `/websites/zustand_pmnd_rs` — Zustand official docs (Context7 ID, not queried — verified via npm registry + GitHub repo) [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- `.planning/ROADMAP.md` — v4.1 roadmap with Phase 73 requirements and patterns [CITED: project planning doc]
- `.planning/REQUIREMENTS.md` — v4.1 requirements with sub-IDs [CITED: project requirements doc]
- `.planning/STATE.md` — project state and accumulated decisions [CITED: project state doc]
- npm registry — version checks for zustand, next, zod, ws [VERIFIED: npm registry]
- `DESIGN.md` — Lexend, no 1px dividers, tonal surfaces, glass/gradient CTA constraints [CITED: project design doc]

### Tertiary (LOW confidence)
- Zustand 5 usage patterns with React 19 — inferred from npm package description and version compatibility; not verified via Context7 docs [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all core libraries are already installed and verified; Zustand is the only addition and is a well-known package
- Architecture: HIGH — patterns are all established in v4.0/v2.2 baseline; new components follow existing conventions
- Pitfalls: MEDIUM — identified 5 specific pitfalls based on codebase analysis; WS event routing edge cases need integration test verification
- Validation: MEDIUM — test infrastructure exists; specific test cases mapped to requirements; Wave 0 gaps identified

**Research date:** 2026-06-07
**Valid until:** 2026-07-07 (30 days — stable patterns, no fast-moving external dependency)
