# ROADMAP

**Current milestone:** `v3.2 AI LessonAgent 起草闭环`
**Status:** Planning — phases drafted, awaiting plan-phase
**Current requirements file:** `.planning/REQUIREMENTS.md`
**Latest archive:** `.planning/milestones/v3.1-ROADMAP.md`

## Overview

`v3.2` 把 `v3.0` 已就绪的 AI-native contract（Command Bus、governed action registry、persisted event bus、AI discoverability）兑现成一条真正可用的 LessonAgent 起草闭环。本里程碑只打穿单个 Agent 的单条链路（N=1 强样板优先）：先建 server-side provider 抽象层，再建 Zod 校验的 typed tool 层，经 Command Bus 把 Agent 产出写入 draft lesson version（复用既有 publish/version 真相源），交付对齐 Stitch + DESIGN.md 的教师审校面，最后用 eval + guardrails + `verify:phase` close gate 封口。全程不破坏 SQLite-first、DAL-only、no-arbitrary-code、provider-key-server-only 约束，且不重建 `v3.0` 平台内核。

## Milestones

- 🚧 **v3.2 AI LessonAgent 起草闭环** - Phases 61-65 (in progress)
- ✅ **v3.1 Single-School Pilot Production Readiness (Plugin-First)** - Archived 2026-05-30. See `.planning/milestones/v3.1-ROADMAP.md`.
- ✅ **v3.0 AI Native Educational OS Upgrade** - Archived 2026-05-23. See `.planning/milestones/v3.0-ROADMAP.md`.
- 🧊 **v2.4 Plugin Data Architecture & Default Plugins** - Phases 44-49 remain frozen historical context.
- ✅ **v2.3 Async Task Platform** - Archived 2026-05-20 with accepted gaps. See `.planning/milestones/v2.3-ROADMAP.md`.
- ✅ **v2.2 WebSocket Classroom Transport Cutover** - Archived 2026-05-18. See `.planning/milestones/v2.2-ROADMAP.md`.
- ✅ **v2.1 Safety Closure and Course Membership Loop** - Archived 2026-05-17.
- ✅ **v2.0 Runtime Platform Foundations** - Archived 2026-05-17.
- ✅ **v1.3 Teaching Orchestration & Classroom Intelligence** - Archived 2026-05-15.

## Phases

### 🚧 v3.2 AI LessonAgent 起草闭环 (Phases 61-65)

**Milestone Goal:** 教师可触发 AI 起草一节课的步骤包，经审校后通过既有发布链路落地，全程经 Command Bus / 工具层治理。

- [ ] **Phase 61: AI Provider Abstraction Layer** - 统一 server-side provider 接口、密钥隔离、限流/配额与 typed 可重试错误，provider 可替换。
- [x] **Phase 62: LessonAgent Typed Tool Layer** - Zod 校验的 typed tools，只调 DAL / Command Bus，产出原子步骤包，关键节点写入 event bus。
- [ ] **Phase 63: AI Draft Chain into Draft Lesson Version** - 经 Command Bus 把 Agent 产出写入 AI-标注、幂等、replay-safe 的 draft lesson version，复用既有真相源。
- [ ] **Phase 64: Teacher Review & Accept-Publish Surface** - 起草结果的 diff / 编辑 / 接受发布 / 丢弃，对齐 Stitch + DESIGN.md。
- [ ] **Phase 65: Eval, Guardrails & verify:phase Close Gate** - 可重复 eval、越界 guardrails 与端到端 `verify:phase` 单一权威闭环闸门。

## Phase Details

### Phase 61: AI Provider Abstraction Layer
**Goal**: 建立 `server/ai/providers` 统一抽象层，让调用方通过单一接口完成一次文本/结构化生成，密钥只在服务端 Node runtime 读取，调用受限流/配额保护，失败返回区分可重试的 typed 错误。
**Depends on**: Nothing (first phase of v3.2; reuses v3.0 platform core)
**Requirements**: PROV-01, PROV-02, PROV-03, PROV-04
**Success Criteria** (what must be TRUE):
  1. 调用方能通过统一 provider 接口完成一次 LLM 文本/结构化生成，替换底层 provider 实现不需要改动调用方代码。
  2. provider 密钥只在服务端 Node runtime 读取，在客户端、Edge runtime、插件 manifest 与浏览器响应中均不可见（有测试或检查证明不泄漏）。
  3. 超出限流/配额的 AI 调用返回明确可读错误，而不是静默失败或卡死。
  4. provider 调用失败（超时、上游错误、解析失败）返回 typed 错误，调用链能区分可重试与不可重试。
**Plans**: 5 plans
- [x] 61-00-PLAN.md — Wave 0：装 ai/@ai-sdk/openai-compatible + .env.example AI 段 + 共享测试夹具
- [x] 61-01-PLAN.md — Wave 1：config（server-only env 收口）+ errors + error-mapping（PROV-02/04）
- [x] 61-02-PLAN.md — Wave 2：redis-client + rate-limit（teacher+global 固定窗口，fail-closed）（PROV-03）
- [x] 61-03-PLAN.md — Wave 2：registry（createOpenAICompatible 装配 LanguageModel）（PROV-01）
- [x] 61-04-PLAN.md — Wave 3：facade + index barrel + no-leak 静态证明（PROV-01/02）

### Phase 62: LessonAgent Typed Tool Layer
**Goal**: 建立 `server/ai/tools` LessonAgent 工具层：一组 Zod 校验的 typed tools，输入输出在边界处被校验，只能经 DAL / Command Bus 读写，不可直连 DB、不可触 provider key、不可执行任意代码；教师能针对目标课时触发起草，Agent 产出符合 `content`/`task`/`quiz` schema 的步骤包，关键节点写入 v3.0 event bus。
**Depends on**: Phase 61
**Requirements**: AGENT-01, AGENT-02, AGENT-03, AGENT-04
**Success Criteria** (what must be TRUE):
  1. 用非法 payload 调用任一 LessonAgent tool 会在边界处被拒绝并返回校验错误。
  2. 工具层无法直连数据库、无法读取 provider key、无法执行任意代码（由边界约束与测试证明，只能走 DAL / Command Bus）。
  3. 教师能针对一节目标课时触发 LessonAgent 起草，得到符合 `content`/`task`/`quiz` 原子步骤 schema 的步骤包。
  4. Agent 起草过程关键节点（开始、工具调用、完成、失败）作为 typed platform events 写入 v3.0 event bus，operator 可追溯。
**Plans**: 4 plans
- [x] 62-01-PLAN.md — Wave 1：events/contracts.ts 新增三条 AI 域事件契约（lesson.draft.requested/tool.invoked/produced，`.strict()` summary-only）+ 契约单测（AGENT-04）
- [x] 62-02-PLAN.md — Wave 1：server/ai/tools `createDraftLessonStepTool` factory（teacherId 闭包注入、inputSchema 边界校验、只调 facade+只读 DAL）+ prompts + barrel + no-leak 静态证明（AGENT-01/02/03）
- [x] 62-03-PLAN.md — Wave 2：commands/contracts.ts 新增 `lesson.draft.run`（sentinel pluginId=core.lesson-agent，零改 scope/bus）+ handler（授权→调 tool→emit 三事件/失败抛错）+ registry 注册（AGENT-03/04）
- [x] 62-04-PLAN.md — Wave 3：server/ai/agents `draftLessonStep` 公共编排入口（构造 envelope→dispatchPlatformCommand→从 resultSummary 取回 step）+ 端到端集成测试（AGENT-03/04，闭合 SC3/SC4）

### Phase 63: AI Draft Chain into Draft Lesson Version
**Goal**: 打通起草写入链路：Agent 产出经 Command Bus 写入 draft lesson version，复用既有 publish/version 模型而非新建第二真相源；写入幂等且 replay-safe；draft 在数据上标注 AI 来源、与教师手工编辑可区分，且不会自动发布给学生。
**Depends on**: Phase 62
**Requirements**: DRAFT-01, DRAFT-02, DRAFT-03
**Success Criteria** (what must be TRUE):
  1. Agent 起草结果通过 Command Bus 写入 draft lesson version，复用既有 publish/version 模型，没有出现第二套课时真相源。
  2. 同一起草请求重试不会产生重复 draft，也不会污染已有课时内容（幂等、replay-safe）。
  3. AI 起草的 draft version 在数据上标注 AI 来源、可与教师手工编辑区分，且不会自动发布给学生。
**Plans**: 4 plans
- [x] 63-01-PLAN.md — Wave 1：schema.ts 新增 draftLessonVersions 镜像表（source/sourceCommandId provenance + (lessonId,sourceCommandId) 唯一约束 + FK cascade）+ drizzle/0014 migration（DRAFT-01/02）
- [x] 63-03-PLAN.md — Wave 1：contracts.ts 四处登记 lesson.draft.persist 命令（.strict payload，steps 复用 lessonStepPayloadSchema）+ events 新增 lesson.draft.persisted summary-only 事件（三处 union）+ cache-policy draftLesson tag（DRAFT-01/03）
- [x] 63-02-PLAN.md — Wave 2：DAL persistDraftLessonVersion（max+1 版本、内联快照单 INSERT、source='ai'、绝不写 live）+ 写/读双隔离证明测试（DRAFT-01/02/03）
- [x] 63-04-PLAN.md — Wave 3：executeLessonDraftPersist handler（授权校 schoolId→调 DAL→invalidation tags+emit 事件）+ registry 注册 dedupe:required + 幂等双层集成测试（DRAFT-01/02/03）

### Phase 64: Teacher Review & Accept-Publish Surface
**Goal**: 交付教师审校面：教师能看到 AI 起草与当前课时的步骤级 diff（新增/修改/删除），能逐项或整体编辑后再决定去留，能接受起草进入既有发布链路或丢弃且不影响原课时，界面对齐 Stitch 项目 `5322129002350954765` 与 `DESIGN.md`。
**Depends on**: Phase 63
**Requirements**: REVIEW-01, REVIEW-02, REVIEW-03, REVIEW-04
**Success Criteria** (what must be TRUE):
  1. 教师在审校界面能看到 AI 起草内容与当前课时的步骤级 diff（新增/修改/删除）。
  2. 教师能逐项或整体编辑 AI 起草的步骤后再决定去留。
  3. 教师能接受 AI 起草使其进入既有发布链路，或丢弃起草且不影响原课时。
  4. 审校界面对齐 Stitch `5322129002350954765` 与 `DESIGN.md`（Lexend、无 1px 分隔线、tonal surface、glass/gradient CTA）。
**Plans**: 4 plans
Plans:
- [x] 64-01-PLAN.md — Schema + DTO foundation (draft lifecycle fields, migration, diff DTOs, editable step schemas)
- [x] 64-02-PLAN.md — DAL layer (getLessonDraftReviewDTO, applyDraftToLiveLesson, discardDraftLessonVersion)
- [x] 64-03-PLAN.md — Server Actions + Commands/Events (apply/discard actions, lesson.draft.accept/discard commands, event contracts)
- [x] 64-04-PLAN.md — Editor UI integration (mode=review, glass prompt, diff workspace, edit panel, Stitch alignment)
**UI hint**: yes

### Phase 65: Eval, Guardrails & verify:phase Close Gate
**Goal**: 建立 AI 起草链路的质量与闭环闸门：一组可重复运行的 eval 验证起草输出在 schema 合法性与基本教学结构上达标；guardrails 拦截越界输出（非法 step 类型、超长、注入禁止内容）并记录；提供 `verify:phase` close gate 对整条链路做端到端回归，作为里程碑 close 的单一权威闸门。
**Depends on**: Phase 64
**Requirements**: EVAL-01, EVAL-02, EVAL-03
**Success Criteria** (what must be TRUE):
  1. 存在一组可重复运行的 eval，验证 LessonAgent 起草输出在 schema 合法性与基本教学结构上达标。
  2. guardrails 能拦截 Agent 越界输出（非法 step 类型、超长、注入既有约束禁止的内容），被拦截输出记录可查。
  3. `verify:phase` close gate 对 AI 起草链路做端到端回归校验，并作为里程碑 close 的单一权威闸门通过。
**Plans**: 5 plans
- [x] 65-01-PLAN.md — Guardrail reason-code contract + DraftGuardrailRejection + shared draft-step corpus
- [x] 65-02-PLAN.md — Guardrail validator (assertStepWithinGuardrails) + tool wiring
- [x] 65-03-PLAN.md — EVAL-01 eval suite: schema legality + teaching-structure invariants
- [x] 65-04-PLAN.md — lesson.draft.rejected contract + handler instanceof-rejection branch
- [x] 65-05-PLAN.md — verify:phase65 close gate + authoritative verify:phase alias

## Progress

**Execution Order:**
Phases execute in numeric order: 61 → 62 → 63 → 64 → 65

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 61. AI Provider Abstraction Layer | v3.2 | 5/5 | Complete   | 2026-05-31 |
| 62. LessonAgent Typed Tool Layer | v3.2 | 4/4 | Complete   | 2026-05-31 |
| 63. AI Draft Chain into Draft Lesson Version | v3.2 | 4/4 | Complete   | 2026-05-31 |
| 64. Teacher Review & Accept-Publish Surface | v3.2 | 4/4 | Complete   | 2026-05-31 |
| 65. Eval, Guardrails & verify:phase Close Gate | v3.2 | 5/5 | Complete   | 2026-06-01 |

<details>
<summary>✅ v3.1 Single-School Pilot Production Readiness (Plugin-First) (Phases 55-60, 60.1, 60.2) — SHIPPED 2026-05-30</summary>

- [x] **Phase 55: Pilot Scope & Acceptance Gate** - 冻结单校试点口径、课堂投票样板、40/5 容量目标、proof artifact 与 close gate。 (completed 2026-05-24)
- [x] **Phase 56: Voting Plugin Contract & Authoring Integration** - 打通课堂投票插件的 authoring、schema validation、compatibility gating、publish preflight 与 version freeze。 (completed 2026-05-25)
- [x] **Phase 57: Classroom Runtime Sample Chain** - 打通 launch readiness、teacher trigger、student participation、canonical result writes 与 teacher evidence。 (completed 2026-05-25)
- [x] **Phase 58: Operator Recovery & Production Surfaces** - 交付 classroom/plugin/command/task 关联诊断面、degraded honesty 与可执行恢复动作。 (completed 2026-05-26)
- [x] **Phase 59: Deploy, Release & Recovery Baseline** - 交付 env discipline、CI/CD、health/ready、release traceability、backup/restore 与 restore drill。 (completed 2026-05-27)
- [x] **Phase 60: Load, Degrade & Pilot Rehearsal** - 交付 k6/Playwright rehearsal、Redis degraded、worker backlog tests、rollout/rollback checklist 与 closeout evidence。 (completed 2026-05-30)
- [x] **Phase 60.1: Replace dry-run phase60 proof with live rehearsal evidence** - 用 live smoke/capacity/drills/rollout-rollback rehearsal evidence 替换 dry-run close artifacts。 (completed 2026-05-30)
- [x] **Phase 60.2: Wire frozen voting contract into launch and runtime** - 把 frozen voting contract 接入 runtime truth，关闭 `PLUG-01` / `CHAIN-03`。 (completed 2026-05-28)

</details>
