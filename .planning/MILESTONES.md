# Milestones

## v2.2 WebSocket Classroom Transport Cutover (Archived: 2026-05-18)

**Closure scope:** Phase 36-38 only
**Delivered scope:** 3 phases, 9 plans
**Archive status:** Milestone scope closed; websocket baseline, optional Redis fanout, and canonical close artifacts shipped.

### Delivered in scope

- Phase 36: 课堂实时链路已切到 authenticated WebSocket transport baseline，并保留 SSE rollback surface。
- Phase 37: `ioredis` fanout、session transport snapshot、degraded honesty 与 operator transport visibility 已落地。
- Phase 38: `verify:phase38`、parity proof、fallback matrix、demo runbook 与 closeout artifact 已把 v2.2 close posture 收口为单一 gate。

### Known gaps kept outside this milestone close

- close 时不存在 `v2.2` milestone audit 文件；本次归档按用户明确接受风险继续。
- `RTPX-01` PostgreSQL cutover、broader `RTPX-02` async worker/BullMQ slice、`RTPX-04`、`RTPX-05`、`RTPX-06` 继续 deferred。

## v2.1 Safety Closure and Course Membership Loop (Archived: 2026-05-17)

**Closure scope:** Phase 33-35 only
**Delivered scope:** 3 phases, 8 plans
**Archive status:** Milestone scope closed; repository-wide lint backlog remains outside this milestone close.

### Delivered in scope

- Phase 33: 项目级 auth、DAL、DTO、schema posture 与 classroom durability 已收口到单一 safety gate。
- Phase 34: 课程详情内的课程成员查看、添加、移除与约束反馈闭环已落地。
- Phase 35: `verify:phase35` 已把 milestone prerequisites、milestone-scoped lint baseline、full typecheck 与 honest backlog partition 收口到单一 close gate。

### Known gaps kept outside this milestone close

- repo-wide `lint` 仍保留历史 error，主要集中在旧 authoring、markdown、runtime-host 和部分历史测试 surface。
- PostgreSQL、Redis/Event Bus、WebSocket 与多 runtime expansion 继续 deferred，不因本次 close 自动进入执行状态。

## v2.0 Runtime Platform Foundations (Archived: 2026-05-17)

**Closure scope:** Phase 27-32 only
**Delivered scope:** 6 phases, 27 plans
**Archive status:** Milestone scope closed; project-level auth, data, classroom durability, and course membership gaps remain outside this milestone close.

### Delivered in scope

- Phase 27: 兼容性基线、runtime-platform feature roots、shared contracts 与 infra seams 已落地。
- Phase 28: versioned TeachingBridge、runtime session persistence、canonical runtime events 与 cache-safe write semantics 已落地。
- Phase 29: shared Runtime Host、sandboxed iframe、teacher/student/classroom 三处 runtime wiring 与 HTML courseware pilot 已落地。
- Phase 30: capability enforcement、manifest v2、lifecycle persistence 与 governance audit 已落地。
- Phase 31: transport boundary、SSE-first gateway、runtime inspector 与 timeline health 已落地。
- Phase 32: end-to-end hardening、proof handoff、canonical `verify:phase32` 与 milestone demo close 已落地。

### Known gaps kept outside this milestone close

- `AUTH-01` ~ `AUTH-06`: 项目级认证与授权 requirement 仍待整体收口。
- `DATA-01` ~ `DATA-05`: 数据层 requirement 仍待整体收口。
- `CLASS-05`: classroom durability requirement 仍待进一步补证与收口。
- `COURSE-07`: 课程学生成员管理闭环仍待完成。

## v1.3 Teaching Orchestration & Classroom Intelligence (Archived: 2026-05-15)

**Closure scope:** Phase 21-26 only
**Delivered scope:** 6 phases, 24 plans
**Archive status:** Milestone scope closed; this archive does not mark the full project requirement set as complete.

### Delivered in scope

- Phase 21: teaching-design metadata、课堂 evidence、teacher timeline 与步骤时长可见性已经落地。
- Phase 22: `/teacher/launch` 已升级为面向课堂实施的 orchestration workspace，并补齐 lesson preparation summary 与 readiness gating。
- Phase 23: 学生端课堂活动 guidance 与 quick response 证据写链路已经落地。
- Phase 24: `/classroom` 已具备 live roster monitoring、teacher-only formative evaluation 与单学生 detail 聚合证据面板。
- Phase 25: session recap、参与度/提交/反馈工作量聚合与 evidence drill-down 已落地。
- Phase 26: `/teacher/trends` recent-session 趋势与多条教师主路径的 Stitch-aligned productization 已交付。

### Known gaps kept outside this milestone close

- `COURSE-04` ~ `COURSE-09`: 仍属于 v1.2 carry-over backlog，没有因为 v1.3 close 自动完成。
- `AUTH-01` ~ `AUTH-06`: 认证与授权 requirement 仍未整体标记为 complete。
- `DATA-01` ~ `DATA-05`: 数据层 requirement 仍未整体标记为 complete。
- `CLASS-05`: 课堂 session durability requirement 仍需继续对齐与补证。
