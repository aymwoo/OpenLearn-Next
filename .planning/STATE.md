---
gsd_state_version: 1.0
milestone: v4.1
milestone_name: Authoritative Close Gate
status: executing
last_updated: "2026-06-08T03:36:29.761Z"
last_activity: 2026-06-08 -- Phase 73 execution started
progress:
  total_phases: 2
  completed_phases: 1
  total_plans: 2
  completed_plans: 2
  percent: 50
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-07 after v4.0 archive)

**Core value:** 教师可以用可编程步骤编排一节课，并让学生端按进度可追踪地完成课堂流程。
**Current focus:** Phase 73 — multi-type-quiz-schema-live-ws-event-teacher-live-dashboard

## Current Position

Phase: 73 (multi-type-quiz-schema-live-ws-event-teacher-live-dashboard) — EXECUTING
Plan: 1 of 2
Status: Executing Phase 73
Last activity: 2026-06-08 -- Phase 73 execution started
Next action: `/gsd:discuss-phase 73` (broad implementation wave) or `/gsd:plan-phase 73` (skip discussion given small N=2 bundle).

## Performance Metrics

**Velocity:**

- Total plans completed: 29 (v3.2 archived)
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: New milestone

| Phase 61 P00 | 25min | 2 tasks | 6 files |
| Phase 61 P01 | 20min | 2 tasks | 5 files |
| Phase 61 P02 | ~30min | 2 tasks | 3 files |
| Phase 61 P03 | ~6min | 1 tasks | 2 files |
| Phase 61 P04 | 20min | 2 tasks | 4 files |
| Phase 62 P03 | ~45min | 1 tasks | 6 files |
| Phase 62 P04 | ~40min | 1 tasks | 2 files |
| Phase 63 P01 | ~40min | 3 tasks | 5 files |
| Phase 65 P01 | 4min | 2 tasks | 3 files |
| Phase 65 P02 | 5min | 3 tasks | 3 files |
| Phase 65 P03 | 5min | 2 tasks | 1 files |
| Phase 65-eval-guardrails-verify-phase-close-gate P04 | 6m | 2 tasks | 4 files |
| Phase 65 P05 | 22m | 2 tasks | 2 files |
| Phase 66 P01 | 4min | 3 tasks | 4 files |
| Phase 66 P02 | 12min | 3 tasks | 3 files |
| Phase 66 P06 | 5min | 1 tasks | 1 files |
| Phase 66 P66-03 | 4min | 2 tasks | 2 files |
| Phase 66 P04 | 8min | 3 tasks | 4 files |
| Phase 66 P07 | 12min | 1 tasks | 1 files |
| Phase 66 P05 | ~18min | 1 tasks | 2 files |
| Phase 67 P01 | 13min | 2 tasks | 4 files |
| Phase 67 P03 | 25min | 2 tasks | 3 files |
| Phase 68 P01 | 35min | 3 tasks | 4 files |
| Phase 68-governed-declarative-data-access-verbs P02 | 6min | 3 tasks | 4 files |
| Phase 68 P03 | 55min | 3 tasks | 7 files |
| Phase 68 P04 | 10min | 2 tasks | 4 files |
| Phase 68 P05 | ~3h | 2 tasks | 6 files |
| Phase 69 P05 | 8 min | 2 tasks | 6 files |

**By v4.1 Phase (planned):**

| Phase | Plans | Status |
|-------|-------|--------|
| 73. Multi-Type Quiz & Live Dashboard | 0/2 | planning |
| 74. v4.1 Authoritative Close Gate | 0/2 | planning |

## Accumulated Context

### Roadmap Evolution

- `v4.0` roadmap 按 data contract (67) → access boundary (68) → sample write (69) → stats read (70) → lifecycle (71) → end-to-end close gate (72) → closure-phase 72.1 (hardened authoritative gate) 的顺序执行完毕。
- `v4.0` 已归档到 `.planning/milestones/v4.0-ROADMAP.md` / `v4.0-REQUIREMENTS.md` / `v4.0-MILESTONE-AUDIT.md`。
- 2026-06-07 `v4.1` 启动：scope selection 选定 N=2 bundle (QUIZ-EXT-01 + QUIZ-EXT-02)，同 `pluginKey = "quiz"`，复用 v4.0 单选样板 + v2.2 WebSocket-first transport；v4.1 ROADMAP.md 已落库（Phase 73 broad implementation + Phase 74 close gate）。
- v3.2 时代依赖项（v3.2 deferred items）继续保留为 historical accepted-risk，不进入 v4.0 closing scope。
- v4.0 v2 deferred 候选中 `QUIZ-EXT-01` + `QUIZ-EXT-02` 已被 v4.1 选中；剩余 `QUIZ-EXT-03` / `MKT-EXT-01..03` / `STORE-01` 继续 deferred。

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Milestone v4.1]: N=2 small bundle (QUIZ-EXT-01 + QUIZ-EXT-02)，统一 `pluginKey = "quiz"`，复用 v4.0 单选样板 + v2.2 WebSocket-first transport；不重做 marketplace / governance / data-access verbs
- [Milestone v4.1]: 2 phases (73 + 74)，hard cap 3 — phase 73 是宽幅实施 (QUIZ-EXT-01-A..E + QUIZ-EXT-02-A..E 10 个 sub-ID)，phase 74 是 close gate + retro (QUIZ-EXT-CLOSE-01..03)
- [Milestone v4.1]: 题型枚举 `single_choice` | `multi_choice` | `true_false` | `fill_blank` | `ordering`（5 种），全部走 D-72.1-04 append-only/`isLatest` 写入路径，`plugin_owned_quiz_responses` 表 schema 不变
- [Milestone v4.1]: 新增 `plugin_owned_quiz_questions.questionType TEXT NOT NULL` 列（additive migration，兼容旧 `single_choice` 行），D-67 forward + D-68 allowlist 同步
- [Milestone v4.1]: WS 事件 `quiz.answer.received` 是新 event kind，遵循 v2.2 contract envelope（`kind` / `correlationId` / `truthRef`），teacher-only channel；不创建新 WS endpoint
- [Milestone v4.1]: `process.env.REDIS_URL` 存在 → 复用 v2.2 Redis fanout 作 delivery layer；不存在 → 进程内总线（contract test 双分支）；SQLite + DAL 仍是真相源（D-72.1-15）
- [Milestone v4.1]: dashboard tab 是 `/classroom` 控制室内的 sibling tab，不创建新路由；访问控制 `userProfiles.role = 'teacher' && classroomSessionId 拥有者`；零写 Server Action（grep 静态断言）
- [Milestone v4.1]: 沿用 v4.0 72.1 close gate 范式，stage 5 → 7（保留 v4.0 5 stage + 新增多题型 stage + 新增实时仪表盘 stage）；新脚本 `scripts/verify-phase73-v41-close-gate.ts`
- [Milestone v4.1]: Manual Surface Sign-Off Ledger 新增 2 行（`/classroom` 实时仪表盘 tab + 多题型课后 recap 表面），沿用 v4.0 schema (proof artifact + status: passed + executed_by + executed_at + evidence note)
- [Milestone v4.1]: D-72.1-16 锁定 conclusion never leads evidence — phase 74 顺序：先 73-PROOF-MAPPING.md → 后 7 stage gate wiring → 再 73-VERIFICATION.md → 最后 73-CLOSEOUT.md

- [Milestone v3.2]: 只打穿单个 LessonAgent 单条起草链路（N=1 强样板优先），复用 v3.0 Command Bus / action registry / event bus，不重建平台内核。
- [Milestone v3.2]: provider key 只在服务端 Node runtime，绝不进 Edge / 插件 manifest / 客户端。
- [Milestone v3.2]: Agent 产出经 Command Bus 写入 draft lesson version，复用既有 publish/version 真相源，不新建第二真相源。
- [Milestone v3.2]: 多 Agent 编排、RAG/Qdrant、MCP、插件触达 AI 继续 deferred。
- [Phase ?]: Pin ai/openai-compatible to ~minor (~6.0.193 / ~2.0.48); upgrades via dedicated PR
- [Phase ?]: AI fixtures target actual @ai-sdk/provider@3.0.x structured finishReason/usage shapes, not PLAN flat interfaces block
- [Phase 61]: Provider 错误模型用 discriminated-union（kind+retryable），跨包边界以 isInstance() 判型
- [Phase 61]: AI env 读取收口于 getProviderConfig(server-only)，缺失抛 AI_PROVIDER_NOT_CONFIGURED
- [Phase 61]: 61-02: enforceRateLimit teacher+global 双层固定窗口限流，超限抛 ProviderRateLimitError(retryAfter=key TTL)，Redis 不可达 fail-closed 拒绝放行
- [Phase 61]: 61-02: getAiRedis URL 解析 AI_REDIS_URL→BULLMQ_REDIS_URL→REDIS_URL，与 BullMQ 连接隔离，连接失败复位以便重连
- [Phase 61]: 61-03: getLanguageModel(modelId?) 收口 createOpenAICompatible 唯一装配点，provider 模块级 memoize，导出面仅 getLanguageModel；刻意收敛单 provider（N=1），待 N>1 升级 Map-based registry
- [Phase ?]: facade maxRetries 显式封顶为 2，本层不叠加自定义重试（缓解 retry-amplification）
- [Phase ?]: AI provider 公共面经 index.ts 具名 barrel 收口，不导出 config/registry 内部（PROV-02）
- [Phase 62]: 62-03: lesson.draft.run handler 严格只发 3 AI 域事件（无 succeeded），失败仅抛 PlatformCommandExecutionError 走 bus 唯一 generic platform.command.failed（D-53-07/08）；零改 scope schema / bus 失败路径
- [Phase 62]: 62-03: teacherId 从授权 actor（assertActiveTeacher().userId）闭包注入 typed tool，绝不取自 LLM/payload；步骤包仅经 command resultSummary 回传，不写 lesson/draft version（归 Phase 63）
- [Phase 62]: 62-03: plugins handler-map satisfies 由 Record<PlatformCommandType> 收窄为 Record<governance command types>，使新增 command 类型不被迫塞入 plugin handler map
- [Phase 62]: 62-04: lesson-agent 只暴露 server-only 编排 facade draftLessonStep，构造 envelope（system actor core.lesson-agent、sentinel pluginId、correlation 三字段、payload 无 teacherId）后经 dispatchPlatformCommand 唯一派发，从 resultSummary.step 取回；失败透传不静默吞错
- [Phase 62]: 62-04: 端到端集成测试用真实 bus + 真实 platformCommandRegistry + 真实 lesson-draft handler，仅注入 persistPlatformEvents 捕获三事件落账并断言 summary-only 信息隔离；agent 文件零 DB/env/LLM 直接依赖
- [Phase ?]: 65-02: illegal_step_type rejection uses sentinel stepType=content; never echoes LLM type literal (T-65-PII)
- [Phase ?]: 65-02: guardrail rejection propagates uncaught from draft tool; 65-04 handler distinguishes out-of-bounds from real generation failure
- [Phase 65]: EVAL-01: fixture-driven *.eval.test.ts replays shared draftStepCorpus through aiGenerateObject mock (D-01) — deterministic, no network/key
- [Phase 65]: draftFromCorpus helper casts ai SDK tool.execute (widened T|AsyncIterable<T>) back to LessonStepPayload, then narrows per-test via result.type guard
- [Phase ?]: 65-04: Guardrail rejection resolves as success-type outcome emitting one lesson.draft.rejected event, not platform.command.failed (D-11/D-53-08)
- [Phase ?]: 65-04: lesson.draft.rejected payload is summary-only (lessonId, stepType, reasonCode, teacherId) from cause fields, no step snapshot (T-65-PII/D-07)
- [Phase 65]: Phase 65 close gate (verify:phase65 / verify:phase) runs npm build + Phase 61-65 vitest regression + 14 D-10 static boundary checks; exit 1 on any failure
- [Phase ?]: Reused already-loaded draft row for version — no second DB read (66-01)
- [Phase ?]: Preserved summary-only event invariant: only scalar version/courseId added (66-01)
- [Phase 66]: 66-06: 6 项被 Phase 66 打通的需求保持 Wiring (Phase 66) 状态（checkbox 不勾选），端到端验证前不计 Complete；traceability Phase 列用 'Phase NN → 66' 同记构建相与打通相
- [Phase ?]: 66-04: review accept/discard Server Actions dispatch lesson.draft.accept/discard via Command Bus producer with required dedupeKey — no direct DAL writes, no second source of truth
- [Phase ?]: 66-07: assembled-loop closure spec drives both action paths through the real Command Bus; only @/db + ledger + adapter + plugin handlers + DALs are mocked
- [Phase 66]: 66-05 verify: live draft path goes draftLessonStep → bus lesson.draft.run → createDraftLessonStepTool → **aiGenerateObject** (facade.ts) — genuinely requires a configured OPENAI_COMPAT_* provider AND a reachable Redis (rate-limit is fail-closed). Earlier "deterministic / no LLM" note was wrong. In-sandbox neither exists, so end-to-end generation is verified by mock-provider unit/eval/integration tests (212/212), and Playwright verifies only the flag-gated trigger visibility + styling (D-03 hard-stop is backend-authoritative; UI hide is secondary).
- [Phase ?]: FK-to-core guarded by strict() unrecognized_keys, deliberately not a named reason constant
- [Phase ?]: DDL keyword scan via JSON.stringify(table) regex catches raw SQL in any string field
- [Phase ?]: Zero-DDL gate uses node:fs recursion (zero-dependency, CI-stable) scanning a superset of D-08 dirs
- [Phase ?]: Narrow literal DDL flagged only with an execution channel; interpolated template DDL always flagged
- [Phase ?]: scripts/prepare-dev-db.ts file-exempted as sanctioned drizzle migration-ledger bootstrap
- [Phase 67]: CR-01 fix — TableSpecSchema.name 必须过 IDENTIFIER 正则（与列名/pluginKey 同源）；表名经编译器 `export const ${toCamelCase(name)} = sqliteTable(` 直出 TS，仅 min(1) 校验可偷渡可执行 TS 注入并躲过 zero-DDL grep。
- [Phase 67]: schema-drift gate（src/db/schema.ts + 未推送 drizzle ORM）按 migration-first 视为已接受 false positive；fresh-DB 迁移已物理证明，闸门以 GSD_SKIP_SCHEMA_CHECK=true 旁路。
- [Phase ?]: [Phase 68] 68-01: 白名单编译期派生单一真相源(pluginDataAccessAllowlist)，消费层反射读取零硬编码；10 类具名拒因(7 形状本层+3 治理 Plan02)
- [Phase ?]: [Phase 68] 68-01: A1 spike = IDEAL — drizzle-zod 在 zod v4 对 SQLite text(col,{enum}) 派生 z.enum；picked schema 需 .strict() 才能拒多余字段(invalid_payload_rejected)
- [Phase ?]: 68-02: schoolId 仅由 session 派生，治理门不接受 schoolId 入参 (SC2)
- [Phase ?]: 68-02: 动词级审计复用既有 governanceAudits 表，无第二审计真相源
- [Phase 68]: Plan 68-04: dispatchPluginDataAccess facade routes 5 verbs (writes→Command Bus producers, reads→direct governed DAL); read verbs getByIndex/count/aggregate force session-derived schoolId scope, denied-only audit (D-04), aggregate projects {key,count} only (D-05)
- [Phase 68]: Phase 68 close gate uses Option A: only auth() stubbed via runner tsconfig remap; all else real against seeded temp libsql DB
- [Phase 68]: Fixed two production command-bus bugs surfaced by the real write path: zero-event ledger .values([]) crash and write-command correlation collapse causing silent data loss
- [Phase 69]: Phase 69 close gate uses a phase-specific auth stub via runner tsconfig remap; headless verification switches actors without changing production DAL/auth behavior
- [Phase 69]: Phase 69 ships verify:phase69 without switching the global verify:phase alias — Phase 72 remains the planned convergence point for the single milestone gate
- [Phase 69]: 2026-06-05 corrective: quiz sample classroom submit path must send governed plugin key `quiz` (not built-in registration id) into `dispatchPluginDataAccess`, otherwise `verify:phase69` fails with `non_school_actor_rejected`
- [Phase 70]: 70-01: 题目统计用单一 SQL GROUP BY 聚合源（cache tag `quizStats:${sessionId}` 失效），不回写核心 analytics 表
- [Phase 71]: 71-04: `/settings/plugins` 走 preflight-first / recover / block reason 三段式 UI，不在升级 / 卸载前暴露「一键」破坏性动作
- [Phase 72.1]: close gate 从「顺序编排器」升级为「authoritative milestone close gate」—— 必须 hard-fail unless `72.1-CLOSEOUT.md` / `72.1-PROOF-MAPPING.md` / `72-VERIFICATION.md` 存在 + Manual Surface Sign-Off Ledger `status: passed` + bridge / final-artifact / manual sign-off 三个独立阶段都绿
- [Phase 72.1]: 先 proof mapping 后 closeout、最后 gate wiring（D-72.1-16：conclusion never leads evidence）
- [Milestone v4.0 archive]: 14 atomic commits（2 prep + 11 executor + 1 state）+ 3 archive commits（archive files / REQUIREMENTS.md removal / RETROSPECTIVE.md append）后归档 v4.0；working tree clean at `f3d408e` on `main`

### Pending Todos

- Run GitNexus `gitnexus_impact` on `ws-server.ts` / `ws-envelope.ts` / `ws-auth.ts` before Phase 73 plan 73-02 edits (v2.2 transport blast radius).
- Decide whether to run `/gsd:discuss-phase 73` (small N=2 bundle, requirements already explicit) or jump to `/gsd:plan-phase 73` — discuss-phase optional given REQUIREMENTS.md sub-IDs A..E are already decomposed.
- Decide whether to insert Phase 73.1 (UX/UI research gap) after plan 73-02 — only if a real gap emerges, do not pre-add.
- Add `pnpm verify:phase73-v41-close-gate` to `package.json` scripts (referenced from ROADMAP phase 74 verify clause; not yet wired).

### Blockers/Concerns

- None. Working tree is clean at the close of Phase 72.1; home refactor (c7e7efb) and Phase 72.1 plan artifacts (c54e37a) landed in separate commits so the 11 atomic executor commits from waves 1-3 contain only Phase 72.1 scoped changes.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| milestone_close | atp-22-resource-ingest-product-trigger | accepted-risk | 2026-05-20 |
| milestone_close | atp-23-fourth-workload-proof-partial | accepted-risk | 2026-05-20 |
| proof_gap | missing-phase39-verification-artifact | accepted-risk | 2026-05-20 |
| proof_gap | missing-phase40-verification-and-script-entry | accepted-risk | 2026-05-20 |
| proof_gap | missing-phase41-verification-artifact | accepted-risk | 2026-05-20 |
| quick_task | 260515-9yu-phase-14-01-publish-unpublish-archive-1- | accepted-risk | 2026-05-23 |
| quick_task | 260515-ac7-phase-14-03-course-05-guardrail-1-eligib | accepted-risk | 2026-05-23 |
| quick_task | 260517-e35-full-suite-teacher-course-center-surface | accepted-risk | 2026-05-23 |
| quick_task | 260517-gnb-student-runtime-host-bootstrap-productio | accepted-risk | 2026-05-23 |
| quick_task | 260517-k2u-auth-localhost-untrustedhost | accepted-risk | 2026-05-23 |

## Session Continuity

Last session: 2026-06-08T03:36:29.706Z
Stopped at: Phase 74 context gathered
Resume file: .planning/phases/74-v4-1-authoritative-close-gate-multi-type-live-dashboard/74-CONTEXT.md

## Operator Next Steps

- v4.0 milestone 已于 2026-06-07 归档，archive 文件在 `.planning/milestones/v4.0-{ROADMAP,REQUIREMENTS,MILESTONE-AUDIT}.md`。
- v4.1 ROADMAP.md 已于 2026-06-07 落库（2 phases, 4 planned plans, N=2 bundle）。STATE.md 已同步到 v4.1 planning 状态。
- Recommended next step: `/gsd:plan-phase 73` (broad implementation wave: QUIZ-EXT-01 + QUIZ-EXT-02)，复用 v4.0 phase 69/70 plan scaffold + GitNexus 上游分析 v2.2 transport。
- 然后 `/gsd:plan-phase 74` (close gate + retro)，复用 v4.0 72.1 plan scaffold；产物 `73-VERIFICATION.md` / `73-PROOF-MAPPING.md` / `73-CLOSEOUT.md` 三件套。
- Optional follow-up:
  1. 67 / 68 phase 的 Nyquist frontmatter 字段回填 `nyquist_compliant: true`（metadata consistency gap，验证本身已通过）。
  2. `72.1-PROOF-MAPPING.md` Manual Surface Sign-Off Ledger 的 2 行 executor 静态证据可被你真实观察 `/settings/plugins` 与课后复盘面板后替换为人类 `executed_by` / `executed_at` / `evidence note`；`proof artifact` + `status: passed` 保持有效。
