# ROADMAP

**Latest archive:** `.planning/milestones/v4.0-ROADMAP.md`
**Latest milestone:** `v4.0 Plugin Marketplace & Plugin-Owned Data` (shipped 2026-06-07)
**Status:** ✅ v4.0 complete; no active milestone — start next via `/gsd:new-milestone`

## Overview

`v4.0` 已归档。仓库当前同时具备：

- `v3.2` 验证过的 AI LessonAgent 起草闭环（server-only provider abstraction、typed tools、Command Bus 驱动的 run→persist→review→accept/discard 主链、eval/guardrails/`verify:phase` close gate）。
- `v4.0` 验证过的声明式插件数据模型 + 受治理数据访问 + 互动答题样板 + 题目统计 + marketplace 生命周期（install / semver upgrade / retain/cleanup uninstall / active-session block）+ authoritative end-to-end `verify:phase` close gate。

下一里程碑应在已归档 baseline 之上选择新的 committed 用户价值切口（候选：多题型、实时大屏、AI 出题、跨 pluginKey 完整恢复、非答题类插件二次泛化——见 `v4.0-REQUIREMENTS.md` v2 段），而不是重开已交付能力。

## Milestones

- ✅ **v4.0 Plugin Marketplace & Plugin-Owned Data** — Phases 67-72 + 72.1 (shipped 2026-06-07). See `.planning/milestones/v4.0-ROADMAP.md` / `v4.0-REQUIREMENTS.md` / `v4.0-MILESTONE-AUDIT.md`.
- ✅ **v3.2 AI LessonAgent 起草闭环** — Archived 2026-06-02. See `.planning/milestones/v3.2-ROADMAP.md`.
- ✅ **v3.1 Single-School Pilot Production Readiness (Plugin-First)** — Archived 2026-05-30. See `.planning/milestones/v3.1-ROADMAP.md`.
- ✅ **v3.0 AI Native Educational OS Upgrade** — Archived 2026-05-23. See `.planning/milestones/v3.0-ROADMAP.md`.
- 🧊 **v2.4 Plugin Data Architecture & Default Plugins** — Phases 44-49 remain frozen historical context.
- ✅ **v2.3 Async Task Platform** — Archived 2026-05-20 with accepted gaps. See `.planning/milestones/v2.3-ROADMAP.md`.
- ✅ **v2.2 WebSocket Classroom Transport Cutover** — Archived 2026-05-18. See `.planning/milestones/v2.2-ROADMAP.md`.
- ✅ **v2.1 Safety Closure and Course Membership Loop** — Archived 2026-05-17.
- ✅ **v2.0 Runtime Platform Foundations** — Archived 2026-05-17.
- ✅ **v1.3 Teaching Orchestration & Classroom Intelligence** — Archived 2026-05-15.

## Phases

<details open>
<summary>✅ v4.0 Plugin Marketplace & Plugin-Owned Data (Phases 67-72 + 72.1) — SHIPPED 2026-06-07</summary>

- [x] **Phase 67: Declarative Plugin-Owned Data Model & Migration-Proof** — 声明式 `dataModel` DSL + Zod meta-schema + 编译器产出 checked-in Drizzle 迁移（独立片段文件），运行时零 DDL，迁移-proof 闸门覆盖插件自有表。 (DATA-01, DATA-02, DATA-03, DATA-04) (completed 2026-06-02)
- [x] **Phase 68: Governed Declarative Data-Access Verbs** — 白名单具名、Zod 校验、参数化的受治理读写动词，经 Command Bus + governed action registry，禁直连/禁原始 SQL，单一真相源。 (ACCESS-01, ACCESS-02, ACCESS-03) (completed 2026-06-03)
- [x] **Phase 69: Interactive Single-Choice Quiz Sample Plugin** — 老师配置单选题 + 学生课堂作答 + append-only/isLatest 写入插件自有结构表，全程走第三方同款治理路径、无后门。 (QUIZ-01, QUIZ-02, QUIZ-03) (completed 2026-06-03)
- [x] **Phase 70: Question Stats & Post-Class Recap** — 基于插件自有作答数据的只读统计投影（正确率/选项分布/作答人数，SQL GROUP BY 单一聚合源）+ Stitch/DESIGN 对齐课后复盘界面。 (STATS-01, STATS-02) (completed 2026-06-05)
- [x] **Phase 71: Marketplace Lifecycle — Install Governance, Semver Upgrade & Retain/Cleanup Uninstall** — external 插件发现/安装治理、semver backfill→verify→cutover 零丢失升级、retain/cleanup 卸载确认与审计、active-session 阻断。 (MKT-01, MKT-02, MKT-03, MKT-04, MKT-05) (completed 2026-06-05)
- [x] **Phase 72: End-to-End verify:phase Close Gate** — 对「声明→安装→老师配置→学生作答→统计复盘→升级/卸载治理」整链做单一权威可重复回归闸门。 (GATE-01) (completed 2026-06-05)
- [x] **Phase 72.1: Close gap: GATE-01 authoritative milestone close gate (INSERTED)** — 把 `verify:phase` 升级为可直接支撑 audit/archive 的 authoritative close gate，并补齐 70/71/72 formal verification + proof mapping + closeout。 (STATS-01/02, MKT-01..05, GATE-01) (completed 2026-06-07)

</details>

<details>
<summary>✅ v3.2 AI LessonAgent 起草闭环 (Phases 61-66) — SHIPPED 2026-06-02</summary>

- [x] **Phase 61: AI Provider Abstraction Layer** — 统一 provider 接口、密钥隔离、限流/配额与 typed 错误。 (completed 2026-05-31)
- [x] **Phase 62: LessonAgent Typed Tool Layer** — Zod 校验 typed tools、AI draft command handler 与 server-only orchestration facade。 (completed 2026-05-31)
- [x] **Phase 63: AI Draft Chain into Draft Lesson Version** — draft lesson version provenance、幂等写链与 `lesson.draft.persist` 命令落地。 (completed 2026-05-31)
- [x] **Phase 64: Teacher Review & Accept-Publish Surface** — 审校 diff、编辑、接受/丢弃与 Stitch/DESIGN 对齐的 review workspace。 (completed 2026-05-31)
- [x] **Phase 65: Eval, Guardrails & verify:phase Close Gate** — shared corpus、guardrails、`lesson.draft.rejected` 与 authoritative `verify:phase`。 (completed 2026-06-01)
- [x] **Phase 66: Wire AI LessonAgent Draft Loop End-to-End** — 补齐 teacher trigger、run→persist、accept/discard command-bus 路径并关闭 v3.2 audit gaps。 (completed 2026-06-02)

</details>

<details>
<summary>✅ v3.1 Single-School Pilot Production Readiness (Plugin-First) (Phases 55-60, 60.1, 60.2) — SHIPPED 2026-05-30</summary>

- [x] **Phase 55: Pilot Scope & Acceptance Gate** — 冻结单校试点口径、课堂投票样板、40/5 容量目标、proof artifact 与 close gate。 (completed 2026-05-24)
- [x] **Phase 56: Voting Plugin Contract & Authoring Integration** — 打通课堂投票插件的 authoring、schema validation、compatibility gating、publish preflight 与 version freeze。 (completed 2026-05-25)
- [x] **Phase 57: Classroom Runtime Sample Chain** — 打通 launch readiness、teacher trigger、student participation、canonical result writes 与 teacher evidence。 (completed 2026-05-25)
- [x] **Phase 58: Operator Recovery & Production Surfaces** — 交付 classroom/plugin/command/task 关联诊断面、degraded honesty 与可执行恢复动作。 (completed 2026-05-26)
- [x] **Phase 59: Deploy, Release & Recovery Baseline** — 交付 env discipline、CI/CD、health/ready、release traceability、backup/restore 与 restore drill。 (completed 2026-05-27)
- [x] **Phase 60: Load, Degrade & Pilot Rehearsal** — 交付 k6/Playwright rehearsal、Redis degraded、worker backlog tests、rollout/rollback checklist 与 closeout evidence。 (completed 2026-05-30)
- [x] **Phase 60.1: Replace dry-run phase60 proof with live rehearsal evidence** — 用 live smoke/capacity/drills/rollout-rollback rehearsal evidence 替换 dry-run close artifacts。 (completed 2026-05-30)
- [x] **Phase 60.2: Wire frozen voting contract into launch and runtime** — 把 frozen voting contract 接入 runtime truth，关闭 `PLUG-01` / `CHAIN-03`。 (completed 2026-05-28)

</details>

## Next Step

`/gsd:new-milestone` —— 在已归档 v4.0 / v3.2 / v3.1 baseline 之上建立下一 milestone（scope 候选：多题型、实时大屏、AI 出题、跨 pluginKey 完整恢复、非答题类插件二次泛化，详见 `v4.0-REQUIREMENTS.md` v2 段）。
