---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: Plugin Marketplace & Plugin-Owned Data
status: executing
last_updated: "2026-06-03T11:38:01.090Z"
last_activity: 2026-06-03
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 17
  completed_plans: 17
  percent: 67
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-02)

**Core value:** 教师可以用可编程步骤编排一节课，并让学生端按进度可追踪地完成课堂流程。
**Current focus:** Phase 70 — question-stats-post-class-recap

## Current Position

Phase: 70 (question-stats-post-class-recap) — EXECUTING
Plan: 1 of 4
Status: Verification pending
Last activity: 2026-06-03 -- Phase 69 completed; Phase 70 close gate pending

> Corrective applied 2026-06-02 (mid-phase-68, before 68-03): plugin data-model compiler now injects append-only `attemptNo`/`isLatest` for tables with `uniques`; hand-authored migration `0006_worried_wallow.sql`. See `.planning/phases/68-governed-declarative-data-access-verbs/67-CORRECTIVE-isLatest.md`. No plan counters advanced.

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

## Accumulated Context

### Roadmap Evolution

- v3.2 roadmap 按 provider layer → tool layer → draft chain → review surface → eval/guardrails → closure wiring 的顺序执行完毕。
- `v3.2` 已归档到 `.planning/milestones/v3.2-ROADMAP.md`；根级 `ROADMAP.md` 现在只保留已归档 milestone 摘要与“等待下一里程碑”入口。
- milestone audit 先识别了 teacher trigger、run→persist、accept/discard command-bus 三个关键断缝；收尾 Phase 66 把这些跨 phase seam 作为真实 blocker 修复，而不是接受为 tech debt。

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

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
- [Phase 69]: Phase 69 close gate uses verifier-only OPENLEARN_VERIFY_ACTOR_ID override — Headless close-gate scripts cannot call Next request-scoped auth(); the bypass is explicit and verifier-only
- [Phase 69]: Phase 69 ships verify:phase69 without switching the global verify:phase alias — Phase 72 remains the planned convergence point for the single milestone gate

### Pending Todos

- Run `pnpm verify:phase70` and fix any remaining close-gate issues.
- Re-run `pnpm verify:phase69` to confirm Phase 70 recap work did not regress the interactive quiz sample baseline.

### Blockers/Concerns

- v4.0 红线必须在每个 phase success criteria 中显式断言：no eval / no arbitrary code、no plugin direct DB、no runtime DDL（compile-time Drizzle only）、SQLite+DAL 单一真相、no core-table pollution、样板插件无后门。
- Current working tree still contains unrelated source changes; future commits should stage only intended planning + fix files.

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

Last session: 2026-06-03T11:36:29.037Z
Stopped at: Phase 70 implementation landed; close gate verification pending
Resume file: None

## Operator Next Steps

- Run `pnpm verify:phase70`, then confirm `pnpm verify:phase69` still passes before advancing to Phase 71.
