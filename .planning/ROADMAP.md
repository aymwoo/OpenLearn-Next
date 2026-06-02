# ROADMAP

**Current milestone:** None
**Status:** Awaiting next milestone definition
**Current requirements file:** None. `v3.2` requirements are archived at `.planning/milestones/v3.2-REQUIREMENTS.md`.
**Latest archive:** `.planning/milestones/v3.2-ROADMAP.md`

## Overview

`v3.2` 已归档。仓库当前已经具备 LessonAgent 起草闭环的完整 baseline：server-only provider abstraction、typed tools、Command Bus 驱动的 run→persist→review→accept/discard 主链、以及 eval/guardrails/`verify:phase` close gate。

下一里程碑不应重开这些已验证 baseline，而应从 `v3.1` 的 single-school pilot truth 和 `v3.2` 的 AI draft loop truth 出发，选择新的 committed 用户价值切口。

## Milestones

- ✅ **v3.2 AI LessonAgent 起草闭环** - Archived 2026-06-02. See `.planning/milestones/v3.2-ROADMAP.md`.
- ✅ **v3.1 Single-School Pilot Production Readiness (Plugin-First)** - Archived 2026-05-30. See `.planning/milestones/v3.1-ROADMAP.md`.
- ✅ **v3.0 AI Native Educational OS Upgrade** - Archived 2026-05-23. See `.planning/milestones/v3.0-ROADMAP.md`.
- 🧊 **v2.4 Plugin Data Architecture & Default Plugins** - Phases 44-49 remain frozen historical context.
- ✅ **v2.3 Async Task Platform** - Archived 2026-05-20 with accepted gaps. See `.planning/milestones/v2.3-ROADMAP.md`.
- ✅ **v2.2 WebSocket Classroom Transport Cutover** - Archived 2026-05-18. See `.planning/milestones/v2.2-ROADMAP.md`.
- ✅ **v2.1 Safety Closure and Course Membership Loop** - Archived 2026-05-17.
- ✅ **v2.0 Runtime Platform Foundations** - Archived 2026-05-17.
- ✅ **v1.3 Teaching Orchestration & Classroom Intelligence** - Archived 2026-05-15.

## Phases

<details>
<summary>✅ v3.2 AI LessonAgent 起草闭环 (Phases 61-66) — SHIPPED 2026-06-02</summary>

- [x] **Phase 61: AI Provider Abstraction Layer** - 统一 provider 接口、密钥隔离、限流/配额与 typed 错误。 (completed 2026-05-31)
- [x] **Phase 62: LessonAgent Typed Tool Layer** - Zod 校验 typed tools、AI draft command handler 与 server-only orchestration facade。 (completed 2026-05-31)
- [x] **Phase 63: AI Draft Chain into Draft Lesson Version** - draft lesson version provenance、幂等写链与 `lesson.draft.persist` 命令落地。 (completed 2026-05-31)
- [x] **Phase 64: Teacher Review & Accept-Publish Surface** - 审校 diff、编辑、接受/丢弃与 Stitch/DESIGN 对齐的 review workspace。 (completed 2026-05-31)
- [x] **Phase 65: Eval, Guardrails & verify:phase Close Gate** - shared corpus、guardrails、`lesson.draft.rejected` 与 authoritative `verify:phase`。 (completed 2026-06-01)
- [x] **Phase 66: Wire AI LessonAgent Draft Loop End-to-End** - 补齐 teacher trigger、run→persist、accept/discard command-bus 路径并关闭 v3.2 audit gaps。 (completed 2026-06-02)

</details>

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

## Next Step

- 用 `/gsd-new-milestone` 正式定义下一里程碑（questioning → research → requirements → roadmap）。
