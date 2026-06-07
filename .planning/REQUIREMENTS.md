# v4.1 REQUIREMENTS — Multi-Question Types & Teacher Live Dashboard

**Status:** Draft
**Milestone:** v4.1
**Source scope selection:** 2026-06-07 new-milestone flow; user chose QUIZ-EXT-01 + QUIZ-EXT-02 bundle (N=2, bound to same pluginKey `quiz`).

> v4.1 extends the v4.0 plugin marketplace baseline (interactive single-choice quiz + recap stats) and the v2.2 classroom WebSocket-first transport. It does **not** redefine the marketplace, governance, or data-access verbs; it only extends the `quiz` sample's data model and surfaces a live teacher dashboard tab.

---

## REQ-IDs in this milestone

| REQ-ID | Title | Status | v4.0 baseline it extends |
|--------|-------|--------|--------------------------|
| `QUIZ-EXT-01` | 多题型互动答题 | proposed | v4.0 single-choice quiz sample (phase 69) |
| `QUIZ-EXT-02` | 教师只读实时作答流水嶀 | proposed | v2.2 WebSocket-first classroom transport + v4.0 recap stats (phase 70) |
| `QUIZ-EXT-CLOSE` | v4.1 close gate (verify:phase 扩展) | proposed | v4.0 authoritative close gate (phase 72.1) |

Each REQ is broken into sub-IDs (A..E) below. Sub-IDs are independently testable.

---

## QUIZ-EXT-01 — 多题型互动答题

**Why:** v4.0 课堂互动答题只支持单选，老师希望在同一堂课里能混合使用多选、判断、填空、排序等题型。需求是“题型可配 + 提交端到端 + 课后可统计”，而**不是**重起插件体系 / marketplace。

### QUIZ-EXT-01-A — Schema 扩展
- 表格：`plugin_owned_quiz_questions` 加列 `questionType TEXT NOT NULL` (枚举：`single_choice` | `multi_choice` | `true_false` | `fill_blank` | `ordering`)。
- 默认值：旧 schema 迁移完成后新插入行默认 `single_choice`，保持单选问答兼容。
- 验证：迁移脚本能在含旧数据 / 不含旧数据两种 SQLite 状态下向前演进；`__drizzle_migrations` 元数据连续。
- 出错状态：迁移失败 → 自动回滚 + 错误信息指出失败点（D-72.1-08 治理路径）。

### QUIZ-EXT-01-B — Data model 声明
- 文件：`src/plugins/quiz-sample/data-model.ts` 扩展 `fields` 声明新 `questionType` 字段 + 各题型 payload JSON 子集（`payloadMulti` / `payloadTrueFalse` / `payloadFillBlank` / `payloadOrdering`）。
- DTO 调整：`src/lib/dto/plugin-data-model.ts` 新增 `questionType` 字段 + 类型化 payload union。
- allowlist：`src/lib/dto/plugin-data-access-allowlist.ts` 调整 `quiz.questions` 与 `quiz.responses` 的 `getByIndex` / `aggregate` 可选索引列以包含 `questionType`。
- 验证：编译期 Zod schema 接受新字段；旧 `single_choice` payload 仍合法。

### QUIZ-EXT-01-C — DAL 访问
- 老师可以 insert 一条多选题（payload 为多选答案数组），insert 一条判断题（payload 为 `true | false`），insert 一条填空题（payload 为多行字符串），insert 一条排序题（payload 为选项 ID 序列）。
- 老师可以 `getByIndex` 按 `questionType` 过滤拿回该课某类型的所有题。
- 老师可以 `count` / `aggregate` 各题型的提交分布。
- 验证：DAL 单元测试覆盖每个题型 insert / getByIndex / count / aggregate 4 条 verb × 5 种题型 = 20 个用例。

### QUIZ-EXT-01-D — 学生端提交
- 提交路径沿用 v4.0 `plugin_owned_quiz_responses` append-only/isLatest 写入。
- payload 类型对应 questionType：单选 = 字符串 / 多选 = 字符串数组 / 判断 = 布尔 / 填空 = 字符串 / 排序 = 字符串数组。
- 一个学生在一道题上反复提交 → 旧 `isLatest` 翻转为 `false`，新行 `isLatest` 翻转为 `true`（沿用 D-72.1-04）。
- 验证：4 条 verb 的 `append-only` 测试 + `isLatest` 翻转测试跨 5 种题型。

### QUIZ-EXT-01-E — 课后统计
- `src/lib/dal/plugin-owned/quiz/stats.ts` 扩展：除了原 v4.0 单选 `countByOption` / `accuracyRate`，新增多选 `countByOptionSet`、判断 `countByBool`、填空 `topAnswers`、排序 `topOrderings`。
- `classroom-session-recap-surface.tsx` 复用 v4.0 recap surface，按 `questionType` 分组渲染新统计。
- 验证：5 种题型 stats DAL 单元测试 + recap 渲染快照（用 RSC snapshot / vitest 表格断言）。

---

## QUIZ-EXT-02 — 教师只读实时作答流水嶀

**Why:** 老师在课堂上需要看到全班作答进度与选项分布，实时调整讲解节奏。v2.2 已经把 classroom WebSocket-first 通路搭好，v4.1 只是把“作答事件”接入这条通路并渲染一个教师只读 tab。

### QUIZ-EXT-02-A — WebSocket 事件接入
- 事件类型：`quiz.answer.received` (teacher-only channel)，payload 包含 `questionId` / `studentId` / `responseType` / `payload` / `receivedAt` / `classroomSessionId`。
- 复用 v2.2 `classroom-ws` 通道（`src/lib/runtime/ws/` 或 `src/lib/transport/classroom-ws.ts`），不创建新 WS endpoint。
- 触发点：DAL 写入 `plugin_owned_quiz_responses` 后由 server action 推 `quiz.answer.received` 到 teacher 频道。
- 验证：手动验证脚本 + 集成测试：30 个并发学生提交 → 老师端 30 个事件顺序到达（顺序由 `receivedAt` 决定，可接受毫秒级抖动）。

### QUIZ-EXT-02-B — 可选 Redis fanout
- 如果 `process.env.REDIS_URL` 存在 → 复用 v2.2 Redis fanout（仅作 delivery layer），把 `quiz.answer.received` 多实例广播。
- 如果不存在 → 直接进程内总线，行为与 v4.0 recap 一致。
- 事实源：仍然在 SQLite + DAL；Redis 是 delivery 不是 source of truth（D-72.1-15）。
- 验证：`REDIS_URL` 存在/缺失两种环境配置下行为等价（contract test）。

### QUIZ-EXT-02-C — 教师控制台 tab
- 入口：`/classroom` 教师控制室加一个 tab "作答实时"（不创建新路由；与现有 recap / control tab 并列）。
- 访问控制：只有 `userProfiles.role = 'teacher'` 且是 `classroomSessionId` 拥有者能看。
- 验证：访问控制单元测试 + 渲染测试。

### QUIZ-EXT-02-D — 实时视图
- 视图 = 按题聚合的选项分布（单选 / 多选 / 判断 / 排序）+ 填空题 top answers。
- 视图 = 最近 N 条作答流水（默认 N=20，可配置 N=5/20/50）。
- 数据源：WebSocket 事件 → 客户端临时聚合（不写 DB），下课后切换到 v4.0 recap stats。
- 验证：浏览器端集成测试 + 服务端单元测试（事件 schema + 聚合算法）。

### QUIZ-EXT-02-E — 只读姿势
- 老师**不能**在这个 tab 上：批改、打分、踢人、改题、推送提示。
- 该 tab 与教师控制室其他操作完全隔离；任何写操作走 v4.0 command-bus 路径（D-72.1-09）。
- 验证：grep 校验 dashboard surface 无 Server Action `update*` / `delete*` / `grade*` 调用。

---

## QUIZ-EXT-CLOSE — v4.1 close gate

**Why:** v4.1 沿用 v4.0 单一 close gate 范式，但 close gate 必须新增多题型 + 实时仪表盘两层验证。

### QUIZ-EXT-CLOSE-01 — verify:phase 脚本扩展
- `scripts/verify-phase72-close-gate.ts` 复制为 `scripts/verify-phase73-v41-close-gate.ts`。
- 新增阶段：5 → 7（保留 v4.0 5 阶段 + 多题型 1 阶段 + 实时仪表盘 1 阶段）。
- 校验物：插件 schema 包含 `questionType` / `plugin_owned_quiz_questions` 含新列 / WS 事件 schema 文档 / dashboard tab 路由 / Server Action 写操作隔离。
- 验证：脚本本地运行全绿；CI 同 v4.0。

### QUIZ-EXT-CLOSE-02 — Manual Surface Sign-Off Ledger
- 仿照 v4.0 `72.1-PROOF-MAPPING.md` Manual Surface Sign-Off Ledger，加 2 行：`/classroom` 实时仪表盘 tab + 多题型课后 recap 表面。
- 验证：ledger 存在 + 每行 `status: passed`（静态证据路径或真实人审，遵循 v4.0 契约）。

### QUIZ-EXT-CLOSE-03 — Retro / 归档就绪
- 关闭前确认 v4.1 满足：所有 QUIZ-EXT-01/02 sub-IDs 通过 + close gate 全绿 + 文档 / STATE 同步。
- 验证：phase 73/74/75（计划中）有对应的 CLOSEOUT / PROOF-MAPPING / VERIFICATION 三件套。

---

## Explicitly out of scope for v4.1 (deferred)

- `QUIZ-EXT-03` (post-class interactive review) — 暂缓，等 v4.1 用户使用情况决定。
- `MKT-EXT-01/02/03` (marketplace extras) — 暂缓，等 v4.2 之后。
- `STORE-01` (storefront) — 暂缓。
- 任何非 quiz 类插件（lesson / homework / data agent 等）。
- 任何插件升级 dry-run / 跨 pluginKey 恢复 / 商店运营层。
- 任何教师批改 / 评分 / 排名 / 竞争机制（明确排除：v4.1 实时仪表盘是只读的）。

---

## v4.0 REQ-IDs (deferred for reference)

The following REQ-IDs from `v4.0-REQUIREMENTS.md` v2 段 are still deferred (carried over from v4.0 v2 selection, not in v4.1 scope):

- `QUIZ-EXT-03`: post-class interactive review
- `MKT-EXT-01`: marketplace preview/embed
- `MKT-EXT-02`: marketplace search
- `MKT-EXT-03`: marketplace ranking
- `STORE-01`: commercial storefront

They are kept here for traceability; selecting one in the next milestone is a separate user decision.

---

## Traceability

Populated by `.planning/ROADMAP.md` (v4.1, drafted 2026-06-07).

| Requirement | Sub-IDs | Phase | Status |
|-------------|---------|-------|--------|
| `QUIZ-EXT-01` (多题型互动答题) | A, B, C, D, E | Phase 73 (Plan 73-01) | Pending |
| `QUIZ-EXT-02` (教师只读实时作答流水嶀) | A, B, C, D, E | Phase 73 (Plan 73-02) | Pending |
| `QUIZ-EXT-CLOSE` (v4.1 close gate) | CLOSE-01, CLOSE-02, CLOSE-03 | Phase 74 (Plans 74-01, 74-02) | Pending |

**Coverage:**

- v4.1 requirements: 3 (1 macro + 2 product) → decomposed to 13 sub-IDs
- Mapped to phases: 13/13 ✓
- Orphaned: 0
- Hard-cap honored: 2 phases ≤ 3 (per v4.1 ROADMAP constraint)

**Phase pattern:**

- Phase 73 — broad implementation (N=2, coupled small bundle, executed as 2 plans in wave 1; Plan 73-02 depends on Plan 73-01's DAL write hook).
- Phase 74 — close gate + retro (wave 1 = executable verifier + formal verification; wave 2 = PROOF-MAPPING + Manual Sign-Off Ledger + archive-ready CLOSEOUT; D-72.1-16 discipline).

**Excluded (deferred to v4.2+ or later):**

`QUIZ-EXT-03`, `MKT-EXT-01/02/03`, `STORE-01`, non-`quiz` plugins, upgrade dry-run, cross-pluginKey recovery, storefront ops, write-side teacher grading / leaderboard / competition mechanics.

---

*Last updated: 2026-06-07 after v4.1 scope confirmation; traceability added after ROADMAP draft.*
