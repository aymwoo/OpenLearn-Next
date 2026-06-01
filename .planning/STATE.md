---
gsd_state_version: 1.0
milestone: v3.2
milestone_name: AI LessonAgent 起草闭环
status: executing
last_updated: "2026-06-01T02:40:19.644Z"
last_activity: 2026-06-01
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 22
  completed_plans: 21
  percent: 80
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-31)

**Core value:** 教师可以用可编程步骤编排一节课，并让学生端按进度可追踪地完成课堂流程。
**Current focus:** Phase 65 — eval-guardrails-verify-phase-close-gate

## Current Position

Phase: 65 (eval-guardrails-verify-phase-close-gate) — EXECUTING
Plan: 5 of 5
Status: Ready to execute
Last activity: 2026-06-01

Progress: [██████████] 95%

## Performance Metrics

**Velocity:**

- Total plans completed: 0 (this milestone)
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

## Accumulated Context

### Roadmap Evolution

- v3.2 roadmap drafted phases 61-65, continuing numbering from v3.1 (ended at 60 + inserted 60.1/60.2).
- Build order: provider layer → tool layer → draft chain → review surface → eval/guardrails/close gate (strict dependency order).
- `v3.1` 已归档到 `.planning/milestones/v3.1-ROADMAP.md`；根级 `ROADMAP.md` 现承载 v3.2 active phases 与 v3.1 collapsed summary。

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

### Pending Todos

- Execute Phase 61 via `/gsd-execute-phase 61` — Wave 0 first (装 ai@6.0.193 + @ai-sdk/openai-compatible@2.0.48 + fixtures).
- (optional) Fold plan-checker 的 1 MEDIUM + 2 LOW 清晰度建议进 61-02/61-03 plan 文案。

### Blockers/Concerns

- Phase 64 是 UI phase（对齐 Stitch 5322129002350954765 + DESIGN.md）；执行前考虑 `/gsd-ui-phase 64` 生成 UI-SPEC。
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

Last session: 2026-06-01T02:40:07.609Z
Stopped at: Phase 64 plans complete (4 plans, all reviewed, 2 warnings fixed)
Resume file: None

## Operator Next Steps

- Execute Phase 61 with `/gsd-execute-phase 61` (Wave 0 must run first — installs SDK + test fixtures)
- Consider `/gsd-ui-phase 64` before executing the teacher review surface
