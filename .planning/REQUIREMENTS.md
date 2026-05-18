# Requirements: OpenLearn Next

**Defined:** 2026-05-18
**Core Value:** 教师可以用可编程步骤编排一节课，并让学生端按进度可追踪地完成课堂流程。

## v2.3 Requirements

Requirements for milestone `v2.3 Async Task Platform`. Each maps to exactly one roadmap phase.

### Async Task Platform Core

- [ ] **ATP-01**: Developer can register background tasks through one typed task registry with per-task payload, progress, result, and retry contracts.
- [ ] **ATP-02**: Server code can enqueue background tasks only through one application-level enqueue boundary instead of direct queue calls from UI routes or clients.
- [ ] **ATP-03**: System stores durable async task records, progress snapshots, and terminal outcomes in SQLite instead of relying on Redis or BullMQ job state as the source of truth.
- [ ] **ATP-04**: System runs background jobs in a dedicated worker process that is separate from the web server lifecycle.
- [ ] **ATP-05**: Developer can project BullMQ runtime events back into the durable task ledger and stable DTOs for product surfaces.

### Reliability and Safety

- [ ] **ATP-06**: Each background task type can define retry, backoff, and dead-letter posture explicitly.
- [ ] **ATP-07**: Background task execution is idempotent or deduplicated so retries or duplicate deliveries do not corrupt business state.
- [ ] **ATP-08**: Worker shutdown, restart, and stalled-job recovery preserve honest task status instead of silently losing execution state.
- [ ] **ATP-09**: System records task failure reasons, attempt history, and recovery posture in a way operators can inspect later.
- [ ] **ATP-10**: Background task execution continues to respect DAL, validation, and cache invalidation boundaries instead of bypassing existing server-side discipline.

### Async User Experience

- [ ] **ATP-11**: Teacher or staff user can trigger supported long-running operations as asynchronous jobs instead of waiting on one blocking request.
- [ ] **ATP-12**: Teacher or staff user can see task status such as queued, running, completed, failed, or retrying from product-facing surfaces.
- [ ] **ATP-13**: Teacher or staff user can see task result summaries or failure feedback that explain what finished, partially finished, or needs attention.
- [ ] **ATP-14**: Product surfaces keep user-visible state honest and do not treat "queued" as "done".

### Operator Visibility and Recovery

- [ ] **ATP-15**: Operator can inspect queue health, worker connectivity, backlog posture, and degraded status for the async platform.
- [ ] **ATP-16**: Operator can inspect task run details, attempt history, progress snapshots, and the latest error for a specific task.
- [ ] **ATP-17**: Operator can safely retry supported failed tasks through an explicit recovery action instead of manual data patching.
- [ ] **ATP-18**: Operator-facing surfaces expose async task state through application read models and DTOs rather than direct BullMQ admin state.

### Validation Workloads

- [ ] **ATP-19**: System can process at least one batch import workflow on the async platform with durable progress and partial-result reporting.
- [ ] **ATP-20**: System can run scheduled reminder jobs on the async platform with explicit scheduling and delivery status.
- [ ] **ATP-21**: System can run event post-processing jobs on the async platform without turning the worker path into a new primary business write path.
- [ ] **ATP-22**: System can run resource-processing jobs on the async platform with durable status and operator-visible failures.
- [ ] **ATP-23**: At least four real task families share the same platform contracts, enqueue path, worker posture, and operator visibility model.

## Future Requirements

### Async Platform Expansion

- **ATP-V2-01**: System can orchestrate dependent async task graphs or flows after the single-task platform is proven stable.
- **ATP-V2-02**: System can support separate concurrency classes or worker pools for CPU-heavy and IO-heavy workloads.
- **ATP-V2-03**: System can support a broader async worker slice of `RTPX-02`, including richer orchestration and larger distributed job topologies.

### Deferred Runtime Platform Frontier

- **RTPX-01**: Developer can cut the primary durable store from SQLite to PostgreSQL after runtime-platform contracts and migration tooling are proven.
- **RTPX-04**: System can host a second built-in runtime type after the first HTML courseware pilot is stable.
- **RTPX-05**: Admin can manage third-party runtime or plugin packages only after local built-in contracts, trust boundaries, and audit tooling are stable.
- **RTPX-06**: System can run AI runtime workflows inside the same capability and audit framework after human-approval and evaluation gates are proven.

## Out of Scope

| Feature | Reason |
|---------|--------|
| PostgreSQL cutover in v2.3 | This milestone should validate async platform patterns without coupling them to a primary database migration. |
| Classroom realtime mainline rewrite | `v2.2` just closed transport cutover; this milestone should not reopen the classroom live path. |
| AI runtime expansion | Async platform should first be validated with deterministic product jobs before AI workload expansion. |
| Third-party runtime/package governance | Trust, packaging, and marketplace concerns are separate from proving the internal async platform. |
| Full DAG/workflow engine | This milestone should establish queue, worker, status, and recovery basics before graph orchestration. |
| Redis/BullMQ as application source of truth | Durable task truth must remain in SQLite + DAL read models. |

## Traceability

Which phases cover which requirements. Each requirement maps to exactly one roadmap phase.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ATP-01 | Phase 39 | Planned |
| ATP-02 | Phase 39 | Planned |
| ATP-03 | Phase 39 | Planned |
| ATP-04 | Phase 40 | Planned |
| ATP-05 | Phase 40 | Planned |
| ATP-06 | Phase 40 | Planned |
| ATP-07 | Phase 40 | Planned |
| ATP-08 | Phase 40 | Planned |
| ATP-09 | Phase 40 | Planned |
| ATP-10 | Phase 40 | Planned |
| ATP-11 | Phase 41 | Planned |
| ATP-12 | Phase 41 | Planned |
| ATP-13 | Phase 41 | Planned |
| ATP-14 | Phase 41 | Planned |
| ATP-15 | Phase 42 | Planned |
| ATP-16 | Phase 42 | Planned |
| ATP-17 | Phase 42 | Planned |
| ATP-18 | Phase 42 | Planned |
| ATP-19 | Phase 41 | Planned |
| ATP-20 | Phase 43 | Planned |
| ATP-21 | Phase 43 | Planned |
| ATP-22 | Phase 43 | Planned |
| ATP-23 | Phase 43 | Planned |

**Coverage:**
- v2.3 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-05-18*
*Last updated: 2026-05-18 after defining the v2.3 roadmap*
