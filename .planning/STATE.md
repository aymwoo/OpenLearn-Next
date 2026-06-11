---
gsd_state_version: 1.0
milestone: v4.3
milestone_name: System Commands Bus（第一批）
status: planning
last_updated: "2026-06-11T09:30:00.000Z"
last_activity: 2026-06-11
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-11 after v4.2 close)

**Core value:** 教师可以用可编程步骤编排一节课，并让学生端按进度可追踪地完成课堂流程。
**Current focus:** v4.3 System Commands Bus（第一批）— Phase 77 ready to plan

## Current Position

Phase: 77 of 79 (Manifest 声明 + Command Registry 注册)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-06-11 — v4.3 路线图已创建，3 个阶段 5 个需求全覆盖

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 61 (v4.2 inclusive: v4.0=20 + v4.1=7 + v4.2=19 + earlier milestones)
- Average duration: —
- Total execution time: —

**By v4.2 Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 73. Multi-Type Quiz & Live Dashboard | 2/2 | complete |
| 74. v4.1 Authoritative Close Gate | 5/5 | complete |
| 75. 第二个 External 插件 + Marketplace 泛化 | 6/6 | complete |
| 76. v4.2 Authoritative Close Gate | 6/6 | complete |

**By v4.3 Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 77. Manifest 声明 + Command Registry 注册 | 0/0 | not started |
| 78. system.http.request HTTP 代理 | 0/0 | not started |
| 79. system.config KV 配置 + dispatchSystemCommand facade | 0/0 | not started |

## Accumulated Context

### Roadmap Evolution

- v4.3 在现有 Command Bus 骨架上新增 `system.*` 命令组，与 `plugin.*` / `lesson.draft.*` / `plugin.data.*` / `quiz.answer.*` 并列。
- 首发 `system.http.request`（HTTP 代理）和 `system.config`（KV 配置）两个命令。
- 安全模型：严格声明式白名单（manifest 声明 → install 校验 → runtime 逐请求匹配）。
- v4.2 基线已交付：homework 全链路 + marketplace 泛化 + 跨插件隔离 + 6-stage close gate。
- `verify:phase` alias 当前指向 v4.2 组合 gate。

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

- [Milestone v4.3]: system.* 命令组在现有 `platformCommandRegistry` 上 additive 扩展，不重做 Command Bus 架构
- [Milestone v4.3]: `system.config.get` 纯读走 DAL 不声明为 PlatformCommandType，`system.config.set` 走 Command Bus producer
- [Milestone v4.3]: schoolId 由认证 session 派生注入，绝不从 payload 读取
- [Milestone v4.3]: Phase 编号从 77 开始延续
- [Milestone v4.2]: D-06 阻断策略 — Stage 1-4 任一步失败即阻断后续全部 stage
- [Milestone v4.2]: 跨插件隔离 — quiz/homework schema/allowlist/DAL 三重隔离

### Pending Todos

- None.

### Blockers/Concerns

- None.

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
| v42_tech_debt | builtInTeachingStepButtonOrder 缺失 "作业" | accepted-risk | 2026-06-11 |
| v42_tech_debt | createHomeworkAssignmentAction orphaned | accepted-risk | 2026-06-11 |
| v42_tech_debt | Nyquist VALIDATION.md 全缺失（4/4 阶段） | accepted-risk | 2026-06-11 |
| v42_tech_debt | REQUIREMENTS.md 不存在 | accepted-risk | 2026-06-11 |

## Session Continuity

Last session: 2026-06-11T09:30:00Z
Stopped at: ROADMAP.md + STATE.md 已创建，v4.3 3 个阶段 5 个需求全覆盖，等待 `/gsd:plan-phase 77`
Resume file: None

## Operator Next Steps

- `/gsd:plan-phase 77` — 开始规划 Phase 77: Manifest 声明 + Command Registry 注册
