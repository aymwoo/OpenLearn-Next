---
gsd_state_version: 1.0
milestone: v4.4
milestone_name: System Commands Bus（第二批）
status: executing
last_updated: "2026-06-13T02:52:35.042Z"
last_activity: 2026-06-13 -- Phase 80 execution started
progress:
  total_phases: 2
  completed_phases: 0
  total_plans: 5
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-13 after v4.4 start)

**Core value:** 教师可以用可编程步骤编排一节课，并让学生端按进度可追踪地完成课堂流程。
**Current focus:** Phase 80 — system-file

## Current Position

Phase: 80 (system-file) — EXECUTING
Plan: 1 of 5
Status: Executing Phase 80
Last activity: 2026-06-13 -- Phase 80 execution started

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 71（v4.3 inclusive: v4.0=20 + v4.1=7 + v4.2=19 + v4.3=6 + earlier milestones）
- Average duration: —
- Total execution time: —

**By v4.3 Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 77. Manifest 声明 + Command Registry 注册 | 2/2 | complete |
| 78. system.http.request HTTP 代理 | 2/2 | complete |
| 79. system.config KV 配置 + dispatchSystemCommand facade | 2/2 | complete |

**v4.4 Phases (current):**

| Phase | Plans | Status |
|-------|-------|--------|
| 80. system.file 文件存储代理 | 0/0 | not started |
| 81. system.notification 应用内通知推送 | 0/0 | not started |

## Accumulated Context

### Roadmap Decisions

- v4.4 分 2 个 Phase：Phase 80 (system.file 全量) + Phase 81 (system.notification 全量 + SYS-06 复用验证)
- 压缩至 2 Phase 的理由：coarse granularity 下两个独立子系统各形成一个完整交付边界，phase 内写操作验证安全模型后读操作自然跟随
- Phase 80 先于 Phase 81：system.file 的 Binary Bypass 架构复杂度最高，先验证 API Route bridge + Command Bus 模式，notification 的 DB+轮询 模式可借鉴
- 零新依赖：两个命令完全基于 Node 24 内置模块 + Drizzle + Zod 实现
- system.file 二进制不进 Command Bus（Binary Bypass）：upload 走 API Route → 内部调 Command Bus（仅元数据），download 走独立 API Route 流式返回
- 内容寻址存储（SHA-256）：{schoolId}/{pluginKey}/{sha256}.{ext}
- system.notification 首发 DB 写入 + 客户端轮询（对齐现有 10s polling pattern），WS best-effort 推送可选增强
- 文件配额：单文件 50MB + 每插件每校总容量上限

### Decisions

Decisions are logged in PROJECT.md Key Decisions table. Recent decisions affecting current work:

- [v4.4 roadmap]: Phase 编号从 80 开始（v4.3 截止于 79）
- [v4.4 roadmap]: 17 个 v4.4 requirements 全量映射：FILE-01..09 → Phase 80，NOTIF-01..08 + SYS-06 → Phase 81
- [v4.4 roadmap]: coarse granularity 下压缩到 2 Phase，两个独立子系统各自形成完整交付边界

### Pending Todos

- None.

### Blockers/Concerns

- None.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v43_uat_gap | Phase 79: 79-HUMAN-UAT.md (4 scenarios partial) | accepted-risk | 2026-06-12 |
| v43_verification_gap | Phase 78: 78-VERIFICATION.md (human_needed) | accepted-risk | 2026-06-12 |
| v43_verification_gap | Phase 79: 79-VERIFICATION.md (human_needed) | accepted-risk | 2026-06-12 |
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

Last session: 2026-06-13T02:29:28.042Z
Stopped at: Phase 80 UI-SPEC approved
Resume file: .planning/phases/80-system-file/80-UI-SPEC.md
