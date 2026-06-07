# Phase 73: Multi-Type Quiz Schema, Live WS Event & Teacher Live Dashboard — Context

**Gathered:** 2026-06-07
**Status:** Ready for planning

<domain>
## Phase Boundary

在 v4.0 单选 Quiz 样板 + v2.2 WebSocket-first transport 之上，扩展 5 种题型（`single_choice` / `multi_choice` / `true_false` / `fill_blank` / `ordering`）的数据模型/DAL/学生提交/统计，并将 `quiz.answer.received` 事件通过 Command Bus 推送到 `/classroom` 控制室的「作答实时」sibling tab（只读、Zustand 客户端聚合）。

**Scope anchor:** 10 sub-IDs (QUIZ-EXT-01-A..E + QUIZ-EXT-02-A..E)，2 个 plans (73-01: data model + DAL + submit + stats; 73-02: WS event + dashboard tab)。不重起 marketplace、governance、data-access verbs。
</domain>

<decisions>
## Implementation Decisions

### Schema & Data Model
- **D-01:** `questionType` 列通过修改 `plugins/quiz-sample/data-model.ts`（单一真相源）→ 重跑 `scripts/compile-plugin-data-model.ts` 生成新 `quiz.ts` schema → 手写 Drizzle migration 落库。旧行默认 `single_choice`，保证 backward compat。
- **D-02:** `plugin_owned_quiz_responses` 表 schema 不变（保留 v4.0 唯一索引与 append-only 写入契约）。多题型 payload 通过 `selectedOption` 列承载 JSON（多选 = 数组、判断 = "true"/"false"、填空 = 字符串、排序 = 数组），复用 D-72.1-04 `isLatest` 翻转事务。
- **D-03:** 5 种题型枚举：`single_choice` | `multi_choice` | `true_false` | `fill_blank` | `ordering`。

### Event & Transport
- **D-04:** `quiz.answer.received` 事件通过 Command Bus 解耦：`submitQuizSampleAnswerAction` 写入成功后 `dispatchPlatformCommand({ type: "quiz.answer.received", payload })` → ws-server 订阅该 command type → 广播到 teacher-only channel。不直接耦合 Server Action 与 transport 层。
- **D-05:** 事件 envelope 遵循 v2.2 contract（`kind` / `correlationId` / `truthRef`），payload 含 `{ questionId, studentId, responseType, payload, receivedAt, classroomSessionId }`。
- **D-06:** Redis fanout（`REDIS_URL` 存在时启用）仅作 delivery layer，SQLite + DAL 仍是真相源（D-72.1-15）。

### Client Architecture
- **D-07:** 实时仪表盘客户端状态用 Zustand store 管理：WS 事件池 + 按题聚合缓存 + 最近 N 条流水。页面刷新丢失可接受（课后自动切 v4.0 recap stats）。跨组件共享，不引入新依赖。

### UI Layout
- **D-08:** 「作答实时」tab 作为 `/classroom` 控制室的 sibling tab，与现有 recap / control tab 水平并列。遵循 DESIGN.md tonal surface 层级（Lexend、no 1px divider、glass/gradient CTA）。

### Scope & Discipline
- **D-09:** 「作答实时」tab 零写操作（grep 静态断言：不含 `update*` / `delete*` / `grade*` Server Action 引用）。写操作全部走 v4.0 command-bus 路径（D-72.1-09）。
- **D-10:** `cacheTags.quizStats(sessionId)` 5 题型 stats DTO 段复用 v4.0 cache tag 体系，`updateTag` 在 `submitQuizSampleAnswerAction` 写入成功后失效。
- **D-11:** Plan 73-02 依赖 Plan 73-01 的 DAL 写入 hook 点（写入成功后触发 `quiz.answer.received`）。两 plan 不并行。
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Quiz Data Model & Schema
- `src/plugins/quiz-sample/data-model.ts` — 插件数据模型的权威定义，需扩展 `questionType` 字段 + 类型化 payload union
- `src/db/schema/generated/plugin-owned/quiz.ts` — 自动生成的 Drizzle schema（由 compile-plugin-data-model 产出）
- `scripts/compile-plugin-data-model.ts` — 编译脚本，修改 data-model.ts 后需重跑

### Data Access & Allowlist
- `src/lib/dto/plugin-data-model.ts` — DTO 声明，需新增 `questionType` 字段 + 类型化 payload union
- `src/lib/dto/plugin-data-access-allowlist.ts` — allowlist，`quiz.questions` / `quiz.responses` 的 `getByIndex` / `aggregate` 需接受 `questionType`
- `src/db/schema/generated/plugin-owned/data-access-allowlist.ts` — 编译期派生 allowlist

### Quiz Runtime
- `src/actions/classroom-actions.ts` — `submitQuizSampleAnswerAction`（学生提交入口）和 `saveQuizSampleLessonStepAction`（教师配置入口）
- `src/lib/cache-policy.ts` — `cacheTags.quizStats(sessionId)` cache tag 定义

### WebSocket Transport (v2.2)
- `src/features/runtime-platform/seams/transport/ws-envelope.ts` — WS 消息 envelope 定义，需新增 `quiz.answer.received` 事件类型
- `src/features/runtime-platform/seams/transport/ws-server.ts` — WS 服务端，teacher-only 路由需确保不暴露给学生
- `src/features/runtime-platform/seams/transport/ws-auth.ts` — WS 鉴权，保留 `memberships.status === "active"` + `classMembers.userId` + `classroomSessions.teacherId`
- `src/features/runtime-platform/seams/transport/gateway.ts` — Transport gateway
- `src/features/runtime-platform/seams/transport/redis-fanout-manager.ts` — 可选 Redis fanout

### Classroom Control Room
- `src/app/(teacher)/classroom/` — `/classroom` 路由，需新增「作答实时」sibling tab
- `src/components/classroom/` — 现有 classroom 组件，新 `live-answer-dashboard-surface.tsx` 需在此目录

### Prior Phase Baselines
- v4.0 Phase 69 — quiz sample baseline（`pluginKey = "quiz"`、`dispatchPluginDataAccess` facade）
- v4.0 Phase 70 — recap surface（`getClassroomSessionRecapDTO` + `buildQuizSampleRecapStats` + `ClassroomSessionRecapSurface`）
- v4.0 Phase 72.1 — authoritative close gate（D-72.1-04 append-only/isLatest、D-72.1-09 写操作隔离、D-72.1-15 真相源、D-72.1-16 conclusion never leads evidence）

### Requirements
- `.planning/REQUIREMENTS.md` — v4.1 requirements（QUIZ-EXT-01-A..E + QUIZ-EXT-02-A..E + QUIZ-EXT-CLOSE-01..03，13 sub-IDs）
- `.planning/ROADMAP.md` — v4.1 phase 73/74 详细规划（patterns、verify、success criteria、cross-phase risks）
- `.planning/codebase/ARCHITECTURE.md` — 系统架构（分层数据访问、Command Bus、WS transport、plugin governance）
- `.planning/codebase/INTEGRATIONS.md` — 外部集成（Auth.js v5、Redis/ioredis、BullMQ）
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`dispatchPluginDataAccess` facade** (`src/features/runtime-platform/`): 5 个受治理动词（insert/upsert/getByIndex/count/aggregate），写走 Command Bus producer、读走 governed DAL。Phase 73 所有 DAL 操作经此 facade。
- **`buildQuizSampleRecapStats`** (v4.0 phase 70): 单选 `countByOption` / `accuracyRate`，需扩展多选 `countByOptionSet`、判断 `countByBool`、填空 `topAnswers`、排序 `topOrderings`。
- **`ClassroomSessionRecapSurface`** (v4.0 phase 70): 课后 recap 渲染，需按 `questionType` 分组渲染 5 题型 stats。
- **Zustand** (已在 stack 中): `zustand@5.0.x`，用于客户端 WS 事件聚合 store。
- **`cacheTags.quizStats(sessionId)`**: 复用 v4.0 cache tag 体系，`updateTag` 在写入成功后失效。

### Established Patterns
- **DTO + Zod 验证**: `src/lib/dto/` 定义 schema → `src/lib/dal/` 消费，UI 不直连 DB。
- **Append-only/isLatest**: `plugin_owned_quiz_responses` 事务中 `UPDATE SET isLatest = false` → `INSERT isLatest = true`，保留完整尝试历史（D-72.1-04）。
- **WS envelope contract**: `src/features/runtime-platform/seams/transport/ws-envelope.ts` 定义 `kind` / `correlationId` / `truthRef`，`quiz.answer.received` 遵循同款。
- **Command Bus 解耦**: `dispatchPlatformCommand` 统一写操作入口，`quiz.answer.received` 作为新 command type 接入。
- **Migration-first**: Drizzle migration 管理 schema 变更，不依赖 `drizzle-kit push`。

### Integration Points
- **`submitQuizSampleAnswerAction`** (`src/actions/classroom-actions.ts`): 写入 `plugin_owned_quiz_responses` 后 → `dispatchPlatformCommand(quiz.answer.received)` → ws-server 广播。这是 Plan 73-01 → 73-02 的依赖连接点。
- **`saveQuizSampleLessonStepAction`**: 教师配置题型入口，需接受 5 种题型 payload。
- **`/classroom` 路由**: 现有 recap / control tab，新增「作答实时」sibling tab。不创建新路由。
- **Auth split**: `ws-auth.ts` 鉴权保留 `memberships.status === "active"` + `classMembers.userId` + `classroomSessions.teacherId`；dashboard tab 访问控制 `userProfiles.role = 'teacher' && classroomSessionId 拥有者`。
- **Plugin governance**: `pluginKey = "quiz"` 走既有 `dispatchPluginDataAccess` facade，不新增 governance path。
</code_context>

<specifics>
## Specific Ideas

- 用户明确要求 Command Bus 作为 WS 事件的解耦层，而非 Server Action 直推 transport。
- 用户偏好保持一致 UI 模式：sibling tab 与现有 recap/control 并列，不引入侧边面板或 inline section。
- 用户选择 Zustand 管理客户端聚合状态，认可"刷新丢失可接受"的约束。
- 用户强调 data-model.ts 作为 schema 的单一真相源，不绕过编译生成链路。
</specifics>

<deferred>
## Deferred Ideas

- `QUIZ-EXT-03` (post-class interactive review / AI 出题) — 暂缓，等 v4.1 用户使用情况。
- `MKT-EXT-01/02/03` (marketplace extras) — v4.2 之后。
- `STORE-01` (商业 storefront) — 暂缓。
- 非 quiz 类插件、upgrade dry-run、跨 pluginKey 恢复 — 明确排除。
- 教师批改 / 评分 / 排名 / 竞争机制 — 明确排除（v4.1 实时仪表盘是只读的）。
- 新建 WS endpoint / 第二 transport runtime — 明确排除。
- `plugin_owned_quiz_responses` 表 schema 变更 — 明确排除。
</deferred>

---

*Phase: 73-Multi-Type Quiz Schema, Live WS Event & Teacher Live Dashboard*
*Context gathered: 2026-06-07*
