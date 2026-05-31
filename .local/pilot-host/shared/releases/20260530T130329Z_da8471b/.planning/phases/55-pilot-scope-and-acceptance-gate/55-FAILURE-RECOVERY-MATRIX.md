# Phase 55 Failure Recovery Matrix

本文件冻结 `v3.1` 的 failure taxonomy、recovery actions 与 fallback / rollback triggers，供 Phase 56-60 和试点 support 直接引用。

## Failure Taxonomy

- authoring configuration invalid
- publish preflight blocked
- plugin disabled or incompatible
- launch readiness failed
- transport degraded or reconnect issue
- student submit timeout or duplicate
- worker backlog or retry failure
- backup / restore or deploy health failure

这些 failure groups 必须被视为 `v3.1` 的正式问题分类，而不是零散错误消息集合。

它们分别覆盖：
- 教师设计阶段的 schema/configuration 错误。
- publish 阶段的 compatibility/readiness 阻断。
- 课堂启动前后的 plugin enable/version/runtime context 问题。
- 课堂运行期的 transport、reconnect、submit 与 async post-processing 问题。
- 上线、恢复与试点值守层的 deploy/backup/restore 问题。

## Recovery Matrix

| Failure Group | Primary Owner | Operator Action | Developer Escalation | Evidence Source |
|---------------|---------------|-----------------|----------------------|-----------------|
| authoring configuration invalid | teacher + support | guide teacher to correct schema/config and rerun preflight | only if validation reason is incorrect or missing | authoring validation output, preflight logs, sample config artifact |
| publish preflight blocked | support + operator | inspect compatibility/preflight reasons, fix dependency or configuration, rerun publish | if publish blocker is inconsistent with actual plugin/runtime state | publish preflight output, version-freeze logs, operator diagnostics |
| plugin disabled or incompatible | operator | enable, reconcile, or switch to approved compatible version according to policy | if lifecycle state cannot converge through supported actions | plugin lifecycle diagnostics, command/event history, operator recovery panel |
| launch readiness failed | operator + teacher | stop launch, inspect readiness blockers, recover dependency or config, relaunch only after clear pass | if readiness remains blocked without actionable reason | launch readiness checks, classroom session logs, operator summary |
| transport degraded or reconnect issue | operator | follow degraded runbook, confirm fallback posture, monitor affected classroom(s), recover transport if possible | if degraded state exceeds accepted duration or student impact threshold | transport status, reconnect logs, classroom/session diagnostics |
| student submit timeout or duplicate | operator + teacher | confirm canonical write outcome, retry or guide resubmit only when safe, monitor incomplete students | if idempotency or dedupe semantics appear broken | submission logs, progress/evidence rows, teacher result panel |
| worker backlog or retry failure | operator | inspect queue lag, retry safe jobs, reconcile stuck projections, verify downstream visibility | if retry path loops or backlog cannot drain under normal operation | worker health, task history, retry logs, operator task diagnostics |
| backup / restore or deploy health failure | operator + release owner | halt rollout, execute rollback or restore checklist, rerun post-restore checks before resume | immediately if health checks fail after rollback or restore | deploy logs, health/ready output, restore drill logs, rollout checklist |

## Fallback and Rollback Triggers

- **runtime fallback trigger**: classroom transport enters documented degraded posture and cannot recover within the accepted operator window for an active pilot classroom.
- **pilot rollout block trigger**: publish, launch readiness, deploy health, or restore checks fail without a supported operator action that returns the system to green state.
- **pilot rollback trigger**: release causes classroom voting sample-chain regression, health/ready failure, or unrecoverable operator-facing degradation in the pilot environment.
- **restore trigger**: data integrity, migration outcome, or post-release health indicates canonical truth is unsafe to trust without restoring known-good state.

这些 trigger 必须被视为可执行条件，而不是抽象建议。

执行要求：
- fallback 必须有明确 operator owner 和 evidence source。
- rollback 必须绑定 release traceability 与 post-rollback verification。
- restore 必须绑定 post-restore checks，不允许“恢复完先继续上课再说”。
