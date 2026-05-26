# ROADMAP

**Current milestone:** `v3.1 Single-School Pilot Production Readiness (Plugin-First)`
**Status:** 🚧 Executing
**Latest archive:** `.planning/milestones/v3.0-ROADMAP.md`
**Current requirements file:** `.planning/REQUIREMENTS.md`

## Overview

`v3.1` 的目标不是继续扩平台抽象，而是在现有 SQLite + DAL truth、WebSocket-first classroom transport、optional Redis fanout、BullMQ worker、plugin governance 与 command/event baseline 之上，交付一个可上线、可值守、可恢复的单校试点样板。真实样板固定为“课堂投票插件”，主链路固定为“教师设计 -> 发布 -> 开课 -> 学生课堂完成 -> 教师与 operator 验证”，容量口径固定为单课堂 40 学生、同时 5 个课堂。

## Milestones

- 📋 **v3.1 Single-School Pilot Production Readiness (Plugin-First)** - Phases 55-60 planned.
- ✅ **v3.0 AI Native Educational OS Upgrade** - Phases 50-54 archived 2026-05-23. See `.planning/milestones/v3.0-ROADMAP.md`.
- 🧊 **v2.4 Plugin Data Architecture & Default Plugins** - Phases 44-49 frozen as historical context; not current milestone scope.
- ✅ **v2.3 Async Task Platform** - Phase 39-43 archived 2026-05-20 with accepted gaps. See `.planning/milestones/v2.3-ROADMAP.md`.
- ✅ **v2.2 WebSocket Classroom Transport Cutover** - Phase 36-38 archived 2026-05-18. See `.planning/milestones/v2.2-ROADMAP.md`.
- ✅ **v2.1 Safety Closure and Course Membership Loop** - Phase 33-35 archived 2026-05-17.
- ✅ **v2.0 Runtime Platform Foundations** - Phase 27-32 archived 2026-05-17.
- ✅ **v1.3 Teaching Orchestration & Classroom Intelligence** - Phase 21-26 archived 2026-05-15.

## Phases

- [x] **Phase 55: Pilot Scope & Acceptance Gate** - 冻结单校试点口径、课堂投票样板、40/5 容量目标、proof artifact 与 close gate。
- [x] **Phase 56: Voting Plugin Contract & Authoring Integration** - 打通课堂投票插件的 authoring、schema validation、compatibility gating、publish preflight 与 version freeze。
- [x] **Phase 57: Classroom Runtime Sample Chain** - 打通 launch readiness、teacher trigger、student participation、canonical result writes 与 teacher evidence。
- [x] **Phase 58: Operator Recovery & Production Surfaces** - 交付 classroom/plugin/command/task 关联诊断面、degraded honesty 与可执行恢复动作。 (completed 2026-05-26)
- [ ] **Phase 59: Deploy, Release & Recovery Baseline** - 交付 env discipline、CI/CD、health/ready、release traceability、backup/restore 与 restore drill。
- [ ] **Phase 60: Load, Degrade & Pilot Rehearsal** - 交付 k6/Playwright rehearsal、Redis degraded 与 worker backlog tests、rollout/rollback checklist。

## Phase Details

### Phase 55: Pilot Scope & Acceptance Gate
**Goal**: 团队可以用单一口径理解 `v3.1` 试点范围、真实样板、容量边界、proof artifact 和 close gate，不再把 milestone 写成泛生产化升级。
**Depends on**: Nothing (milestone kickoff)
**Requirements**: PILOT-01, PILOT-02, PILOT-03
**Success Criteria** (what must be TRUE):
  1. `v3.1` 样板插件、主链路、pilot role、容量口径、验收面都被正式固定。
  2. 每个后续 phase 都能映射回明确 requirement ids，而不是抽象“生产化”任务。
  3. proof artifact、failure taxonomy 与 recovery matrix 会在 phase kickoff 就定义，而不是到 close 再补。
  4. roadmap 明确复用现有 WebSocket-first、optional Redis fanout、BullMQ 与 SQLite + DAL truth baseline。

### Phase 56: Voting Plugin Contract & Authoring Integration
**Goal**: 教师可以在 lesson editor 中正式配置课堂投票插件步骤，并在 publish 前完成 schema/preflight/compatibility 校验。
**Depends on**: Phase 55
**Requirements**: PLUG-01, PLUG-02, CHAIN-01, CHAIN-02, SAFE-01, SAFE-02
**Success Criteria** (what must be TRUE):
  1. 教师只能看到当前学校可用、已启用、版本兼容的课堂投票插件能力。
  2. 投票插件步骤配置会通过正式 schema 校验、默认值与错误回显，而不是松散 JSON。
  3. publish/republish 会冻结可执行版本并执行 preflight，不把草稿配置带入课堂运行期。
  4. publish 失败会返回可解释错误，且重复敏感写操作具备幂等或 dedupe 语义。

### Phase 57: Classroom Runtime Sample Chain
**Goal**: 课堂投票插件可以在真实课堂中从 launch 到学生完成稳定运行，并把结果写回 canonical progress/submission/evidence。
**Depends on**: Phase 56
**Requirements**: CHAIN-03, CHAIN-04, CHAIN-05, PLUG-03, SAFE-01, SAFE-02
**Plans:** 5 plans
Plans:
- [x] `57-01-PLAN.md` — 固化 launch readiness step/plugin 上下文与 voting runtime DTO 合同。
- [x] `57-02-PLAN.md` — 把 teacher 开始/结束投票并入既有 classroom control chain。
- [x] `57-03-PLAN.md` — 实现 student voting submit 的 overwrite/dedupe/cutoff/reconnect 语义。
- [x] `57-04-PLAN.md` — 交付 teacher 端实时汇总、未完成名单、冻结结果视图与当前 round 最小恢复入口。
- [x] `57-05-PLAN.md` — 增加 Phase 57 focused verifier / sample-chain gate，并把 browser/UAT proof 纳入硬门。
**Success Criteria** (what must be TRUE):
  1. classroom launch 会验证样板课的 runtime readiness，并绑定正确的 published snapshot。
  2. 教师触发投票 action 后，学生端能接收状态、参与互动并收到明确完成或失败反馈。
  3. 学生提交会写回 canonical classroom/runtime truth，而不是只停留在 transport 或临时状态。
  4. 刷新、重连、重复提交、局部失败不会破坏 canonical state，并且教师能看到结果汇总、未完成名单与当前 round 最小 recovery actions。

### Phase 58: Operator Recovery & Production Surfaces
**Goal**: operator 和 support 可以在不改库的前提下定位课堂投票样板链路中的故障，并执行恢复动作。
**Depends on**: Phase 57
**Requirements**: OPS-01, OPS-02, OPS-03, PLUG-03, SAFE-02
**Success Criteria** (what must be TRUE):
  1. operator 可以按 school/classroom/plugin/action/command/task 维度查看关联状态与失败归因。
  2. Redis degraded、worker lag、transport fallback、plugin disabled 等降级姿态会被显式暴露，而不是静默隐藏。
  3. 系统提供显式 recovery actions，例如 retry、reconcile、resume、suspend、fallback，而不是要求人工改库。
  4. 研发视图与学校实施/support 视图都能从同一 authoritative read model 获取信息。

### Phase 59: Deploy, Release & Recovery Baseline
**Goal**: 单校试点环境可以被重复部署、验证、备份、恢复，并具备 release traceability。
**Depends on**: Phase 58
**Requirements**: ENVR-01, ENVR-02, ENVR-03, SAFE-03, OPS-01
**Plans:** 3/5 plans executed
Plans:
- [x] `59-01-PLAN.md` — 固化 pilot env schema、`.env.example` 与 blocking/non-blocking Redis posture。 (completed 2026-05-26)
- [x] `59-02-PLAN.md` — 交付 `/api/health`、`/api/ready`、`/api/release` honest status surfaces。 (completed 2026-05-26)
- [ ] `59-03-PLAN.md` — 建立 `verify:phase59` 与 GitHub Actions release hard gate。
- [ ] `59-04-PLAN.md` — 固化 single-node deploy/rollback scripts、systemd units 与 release checklists。
- [ ] `59-05-PLAN.md` — 固化 backup/restore baseline、post-restore verification 与 restore drill artifact。
**Success Criteria** (what must be TRUE):
  1. env schema、`.env.example`、Dockerfile/compose 或等价部署脚本会收敛试点环境配置纪律。
  2. CI/CD 会在 lint/typecheck/test/build/migrate/health-check 失败时中止发布。
  3. 系统具备 health/ready surface、release version traceability、migration traceability 与 rollback checklist。
  4. SQLite 与附加资产都具备备份恢复基线，并至少完成一次 restore drill 与恢复后校验。

### Phase 60: Load, Degrade & Pilot Rehearsal
**Goal**: 团队可以通过 rehearsal 证明课堂投票样板在单校试点容量与降级场景下可用，并具备 rollout/rollback 准备。
**Depends on**: Phase 59
**Requirements**: LOAD-01, LOAD-02, OPS-02, ENVR-03, SAFE-03
**Success Criteria** (what must be TRUE):
  1. k6/Playwright 或等价 gate 会覆盖教师设计到学生完成的样板链路与 40/5 容量假设。
  2. Redis degraded、worker backlog、reconnect/retry、partial failure 场景有明确验证结果与可接受阈值。
  3. pilot rollout checklist、rollback checklist 与现场 runbook 已被 rehearsal 过，而不是只停留在文档。
  4. milestone close 不再依赖口头解释，关键 proof artifacts 可以直接复查。

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 55. Pilot Scope & Acceptance Gate | v3.1 | 3/3 | Complete | 2026-05-24 |
| 56. Voting Plugin Contract & Authoring Integration | v3.1 | 5/5 | Complete | 2026-05-25 |
| 57. Classroom Runtime Sample Chain | v3.1 | 5/5 | Complete | 2026-05-25 |
| 58. Operator Recovery & Production Surfaces | v3.1 | 8/8 | Complete    | 2026-05-26 |
| 59. Deploy, Release & Recovery Baseline | v3.1 | 3/5 | In Progress|  |
| 60. Load, Degrade & Pilot Rehearsal | v3.1 | 0 | Planned | - |

## Frozen Historical Context

`v2.4 Plugin Data Architecture & Default Plugins`（Phases 44-49）保留为历史 planning input。它不是当前 milestone，也不会自动把未完成 scope 带入 `v3.1`；只有当 `v3.1` phase planning 证明某项能力是课堂投票样板与单校试点的直接依赖时，才按最小必要原则吸收。
