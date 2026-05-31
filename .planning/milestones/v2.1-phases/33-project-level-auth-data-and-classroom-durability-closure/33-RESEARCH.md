# Phase 33 research notes

## Summary

Phase 27-32 已经把 runtime-platform foundation 证明到“可运行、可治理、可追踪”的程度，
但 `.planning/REQUIREMENTS.md` 明确把 `AUTH-01` ~ `AUTH-06`、`DATA-01` ~ `DATA-05`、`CLASS-05`
继续保留为 Pending。当前真正的 ship blocker 不是 runtime 继续扩面，而是项目级 authz、DTO、
DAL、SQLite durability 与 classroom truth 没有形成同一条诚实的 closure 链路。

## Key findings

- `src/proxy.ts` 当前 matcher 为 `/((?!api|_next|favicon.ico).*)`，既没有显式 protected families truth，
  也没有体现 `teacher`、`student`、`classroom`、`admin` 与 API 家族的要求。
- `src/actions/auth-actions.ts` 已包含 role intent 与重定向语义，但角色建模仍停留在 teacher or student，
  与 `AUTH-03` 的 future roles posture 尚未系统对齐。
- `src/lib/dal/auth.ts` 使用 `UserDTOSchema` 对数据库行做 parse，但当前 DTO shaping 仍是“直接 parse raw row”；
  是否存在 raw row leakage，需要与 classroom、course-authoring、learning 等主链路一起审计。
- `src/lib/dal/course-authoring.ts` 已有 owner + school scope 硬性校验，是 Phase 33 收紧 `AUTH-05` 的重要基底；
  同时它已经接触 enrollment count，说明 Phase 34 的成员管理必须复用这里的 scope contract。
- `src/lib/dal/classroom.ts` 已大量依赖 durable classroom / evidence / runtime truth，但 requirement 仍认为 `CLASS-05`
  未 complete，说明 classroom session state、participants、events、lock mode 与 reconnect / snapshot / recap 之间
  还缺系统级证明，而不是单点功能不存在。
- `src/db/schema.ts` 已覆盖 auth、schools、courses、lessons、progress、submissions、classroom、runtime、plugin、theme
  等表组，并广泛使用 `onDelete: cascade` 与索引；但项目仍缺针对 `DATA-01` ~ `DATA-05` 的审计式验证与 documented proof。

## Planning posture

- Plan 1 先收 auth entry、future role vocabulary 与 `proxy.ts` protected family truth，对应 `AUTH-01` ~ `AUTH-04`。
- Plan 2 聚焦高风险 DAL、Server Actions、DTO sanitation，对应 `AUTH-05`、`AUTH-06`、`DATA-03`、`DATA-04`。
- Plan 3 聚焦 schema groups、cascade、indexes、classroom durability proof，对应 `DATA-01`、`DATA-02`、`DATA-05`、`CLASS-05`。
- Plan 4 建 `verify:phase33`，把前面三块 closure 收口成单一 gate，并同步处理 milestone-scoped lint or typecheck 回归噪音。

## Non-goals

- 不做 PostgreSQL / Redis / WebSocket cutover。
- 不引入第二种 runtime type 或新的 runtime execution path。
- 不绕开现有 `auth`、`classroom`、`runtime-session`、`course-authoring` 结构重建新 feature root。
