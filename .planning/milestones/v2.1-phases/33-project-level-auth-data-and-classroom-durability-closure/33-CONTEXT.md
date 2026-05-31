# Phase 33: Project-level auth, data, and classroom durability closure - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段固定建立在 Phase 27-32 已完成的 runtime platform foundations 之上，目标不是继续扩
runtime type、transport cutover 或基础设施，而是把当前产品真正可 ship 所需的项目级安全与
持久化缺口收口成可信 posture。

Phase 33 只交付三类 closure：

1. 把 Auth.js session truth、角色进入面、`proxy.ts` 保护面，以及 Server Action 或 DAL 的 actor
   / school / ownership / enrollment scope 检查对齐成一条一致的 authz 链路。
2. 把高风险读写路径重新收口到 DAL + Server Actions only，补齐 DTO sanitation、Zod 输入校验、
   server-only boundary、索引与约束说明，避免 UI、client payload 或 ad hoc shaping 成为隐性真相源。
3. 把 classroom 的当前 step、lock mode、participants、events 与 Phase 28-32 已建立的 runtime
   session durability 对齐到 SQLite durable truth，避免“runtime durable 了，但 classroom 主真相还留在
   SSE memory 或宽松 DTO”这种错位状态。

本阶段不做 PostgreSQL cutover、Redis/Event Bus rollout、WebSocket 替换 SSE、多 runtime
type expansion，也不引入第二种 runtime host execution architecture。所有改动必须尽量复用现有
`auth`、`classroom`、`runtime-session`、`course-authoring` 结构。

</domain>

<decisions>
## Implementation Decisions

### Auth and route protection
- **D-01:** 认证真相继续固定在现有 Auth.js v5 + Drizzle auth tables 上，不新增第二套 session store
  或平行身份系统。
- **D-02:** `proxy.ts` 只负责 unauthenticated route-family redirect 与基础入口保护，真正的 actor / role /
  school / ownership / enrollment 校验仍必须留在 DAL 与 Server Actions；不能把授权正确性外包给 Proxy。
- **D-03:** 当前首发 UI 只显式开放 teacher、student、admin 工作区；但 server code 必须统一建模 future
  roles：`super_admin`、`school_admin`、`parent`、`developer`、`ai_agent`，并保持未完成 workflow 不出现在 UI。
- **D-04:** role-aware sign-in、post-sign-in route entry 与 route-family protection 必须共用同一角色枚举与
  scope 语义，不能继续出现 UI 想当然跳转、DAL 再临时兜底的双重逻辑。

### DAL, DTO, and action boundary
- **D-05:** 所有持久化读写继续固定走 `src/lib/dal/**` + `src/actions/**`，不新增 route handler-only shortcut、
  component-side DB import 或 runtime-specific parallel data path。
- **D-06:** DTO sanitation 必须以现有 `src/lib/dto/**` 为单一出口；UI 不得继续接收 raw row、token、密码、
  provider secret、内部 prompt、私有 plugin data 或未筛选的 JSON payload。
- **D-07:** 高风险路径优先收口现有 classroom、course-authoring、learning、auth、plugin / runtime 相关读写，
  而不是做一次性全仓库“大清洗”。完成线是 requirement truth 与主链路闭环，不是机械覆盖所有文件。
- **D-08:** 输入校验继续复用 Zod schema + inferred type 双导出模式；不新增第二套 validation library。

### SQLite durability and classroom truth
- **D-09:** Phase 28-32 已证明 runtime session、runtime event、transport attempt、inspector trace 可持久化；
  Phase 33 必须把 classroom session 自身的 active step、lock mode、participants、events 与这些 durable facts
  对齐，而不是再造新表或新 truth path。
- **D-10:** `CLASS-05` 的 closure 重点是“classroom truth 完整落在 SQLite，并能被 reconnect / recap /
  inspector / teacher monitoring 共享消费”，不是增加新 transport 或新实时协议。
- **D-11:** schema 变更必须继续坚持 SQLite-first、`onDelete: cascade`、documented indexes / unique
  constraints posture；不把后续 PostgreSQL 迁移需要提前折叠进 Phase 33。

### Runtime-platform foundation handoff
- **D-12:** Phase 27-32 交付的 runtime foundations 视为上游固定事实：single runtime-platform root、trusted host
  boundary、runtime session durability、capability governance、transport gateway、独立 inspector。Phase 33
  只能在这些 foundation 之上补 auth/data closure，不能回退或重构其主架构。
- **D-13:** classroom durability closure 应尽量直接复用 `src/features/runtime-platform/classroom/runtime-session.ts`
  已有的 durable evidence、outbox 和 session identity，而不是对 classroom 主链路另起 persistence vocabulary。
- **D-14:** 后续 Phase 34 的 course membership management 只能建立在本阶段收紧后的 auth/data contract 上，
  因此 Phase 33 需要把 `course-authoring` 当前对 enrollment / ownership 的约束先做诚实收口。

### Claude's discretion
- 角色枚举的精确命名、shared auth guard helper 的组织位置、DTO schema 拆分粒度可由 planner 收敛，
  只要保持单一 auth truth、DAL-only boundary 与尽量复用现有模块。
- Schema 审计的精确落点可由 planner 决定为 `schema.ts` 注释、测试或 verifier guard，但最终必须让
  `DATA-02` / `DATA-05` 有可验证证据，不停留在 backlog prose。
- Phase verifier 的具体结构可复用现有 `verify:phase27`-`verify:phase32` 模式，但必须新增真正属于
  Phase 33 的 auth/data/classroom drift guards。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and requirement truth
- `.planning/ROADMAP.md` — Phase 33 的正式 goal、success criteria 与四个 plan 槽位。
- `.planning/REQUIREMENTS.md` — `AUTH-01` ~ `AUTH-06`、`DATA-01` ~ `DATA-05`、`CLASS-05` 的 requirement truth。
- `.planning/STATE.md` — 当前 milestone posture，明确先收安全闭环，不继续扩 runtime/platform。
- `.planning/MILESTONES.md` 与 `.planning/milestones/v2.0-MILESTONE-AUDIT.md` — 说明 Phase 27-32 已完成，
  而项目级 auth/data/classroom durability gap 被明确 carry 到 Phase 33。

### Locked upstream runtime-platform foundations
- `.planning/phases/27-compatibility-baseline-and-v2-boundary-scaffolding/27-CONTEXT.md` — runtime-platform
  单根、shared contracts、future seams 但 no cutover 的上游边界。
- `.planning/phases/28-runtime-bridge-contracts-and-session-persistence/28-VERIFICATION.md` — runtime session、canonical
  events、cache-safe write semantics 已 durable。
- `.planning/phases/30-capability-enforcement-and-plugin-lifecycle/30-CONTEXT.md` — capability gate、lifecycle、audit
  semantics 已锁定，Phase 33 不重写治理边界。
- `.planning/phases/31-transport-boundary-and-runtime-inspector/31-CONTEXT.md` — transport 只是 delivery channel，
  durable truth 继续留在 runtime/classroom session path。
- `.planning/phases/32-end-to-end-hardening-and-milestone-proof/32-CONTEXT.md` — shared runtime host、classroom-first
  feedback、`runtimeSessionId` drill-down 与 proof chain 已成立。

### Existing auth and membership boundary
- `src/lib/auth/auth.ts`、`src/lib/auth/auth.config.ts` — 当前 Auth.js v5 配置、credentials provider 与 session shaping。
- `src/lib/dal/auth.ts` — 当前 `getCurrentUserDTO()` 与 school membership access 起点。
- `src/actions/auth-actions.ts` — 当前 sign-in / sign-out server action，体现 role intent 与 redirect posture。
- `src/proxy.ts` — 当前 route matcher 仍过宽且缺少 protected family truth，是 Phase 33 首要 auth surface。
- `src/lib/dto/user.ts`、`src/lib/dto/membership.ts` — 当前 user / membership DTO 与 future role 建模起点。

### Existing high-risk DAL and DTO surfaces
- `src/lib/dal/classroom.ts` — classroom launch、snapshot、teacher monitoring、runtime feedback 与 transport publish 主链路。
- `src/lib/dal/course-authoring.ts` — 课程 owner / school scope / enrollment 读取与写入的现有边界。
- `src/lib/dal/learning.ts` — 学生学习、进度、latest attempt 与 personal DTO 边界。
- `src/actions/classroom-actions.ts`、`src/actions/course-authoring-actions.ts`、`src/actions/learning-actions.ts` — 当前主链路
  Server Actions。
- `src/lib/dto/classroom.ts`、`src/lib/dto/course-authoring.ts`、`src/lib/dto/learning.ts`、`src/lib/dto/runtime-inspector.ts` —
  当前高频 DTO contract。

### Existing persistence and verification anchors
- `src/db/schema.ts` — Auth.js tables、membership、course、lesson、progress、submission、classroom、runtime、plugin、theme
  schema truth。
- `src/db/schema.learning.test.ts`、`src/features/runtime-platform/classroom/runtime-session.test.ts`、
  `src/lib/dal/classroom.test.ts`、`src/lib/dal/course-authoring.test.ts`、`src/actions/auth-actions.test.ts` — 当前最接近 Phase 33
  验证面的现有测试锚点。
- `scripts/verify-phase27-runtime-platform.ts` 到 `scripts/verify-phase32-end-to-end.ts` — 单一 phase verifier 模式先例。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets
- `getCurrentUserDTO()` 已经把 Auth.js session 映射到 DTO，是 Phase 33 收口 shared actor resolution 的最近邻入口。
- `assertActiveTeacher()` 与 `course-authoring` 现有 owner or school scope 逻辑，说明仓库已经接受“DAL 内硬性授权检查”模式。
- `classroom.ts` 已通过 `publishTransportEvent()`、runtime proof extraction、snapshot / recap DTO 使用 durable evidence；
  说明 `CLASS-05` 更像补齐 classroom 主真相，而不是新增 transport。
- `src/lib/dto/**` 广泛采用 Zod schema + parse，适合继续做 DTO-only sanitation，而不用重建新的 mapper framework。
- `src/db/schema.ts` 已有大量 cascade FK 与高频索引，但项目级 `DATA-01` ~ `DATA-05` 还缺“系统性 audit + verifier”层。

### Established patterns
- Server-only data access 已在大部分 feature DAL 中成立，但 auth、membership、course enrollment 与 classroom participant
  仍存在 requirement-level closure 不完整的问题。
- 当前路由保护仍偏“能工作即可”，而 requirement truth 要求 protected family 与 actor-scope guards 一致，这正是
  `proxy.ts` + DAL 双层收口的原因。
- Runtime-platform 已证明 durable truth 优先于 transport；Phase 33 的 classroom durability closure 必须沿用这个原则。
- Course management 当前以 owner + school scope 为中心，适合 Phase 33 先把 enrollment / membership auth contract 锁死，
  再让 Phase 34 在其上实现真正的 COURSE-07。

### Integration points
- `src/lib/auth/*` + `src/proxy.ts`：auth truth、protected route matcher、future role model。
- `src/lib/dal/auth.ts`、`src/lib/dal/classroom.ts`、`src/lib/dal/course-authoring.ts`、`src/lib/dal/learning.ts`：高风险 data boundary。
- `src/actions/auth-actions.ts`、`src/actions/classroom-actions.ts`、`src/actions/course-authoring-actions.ts`、`src/actions/learning-actions.ts`：
  Server Action boundary 与 Zod parse contract。
- `src/db/schema.ts`：Auth.js tables、membership、course enrollment、classroom session / participant / event durability、
  indexes / unique constraints / cascade 行为。
- `scripts/verify-phase33-auth-data-durability.ts`（待建）+ focused suites：Phase 33 canonical gate 的直接落点。

</code_context>

<specifics>
## Specific Ideas

- 先锁“谁可以进、谁可以看、谁可以改”，再锁“返回给 UI 的到底是不是 DTO”，最后锁“classroom truth 是否真的 durable”。
- 把 Phase 33 拆成 auth entry / route protection、DAL or DTO tightening、schema or durability audit、phase verifier 四块，能最小化与
  Phase 27-32 foundation 的耦合。
- 通过 focused verifiers 证明 `AUTH-05` / `AUTH-06` / `CLASS-05`，比大范围代码迁移更符合当前 milestone 风险优先级。

</specifics>

<deferred>
## Deferred Ideas

- PostgreSQL primary cutover、Redis/Event Bus rollout、WebSocket replacing SSE。
- 第二种 runtime type、remote runtime packages、runtime platform expansion。
- COURSE-07 的完整成员管理 UI loop；它属于 Phase 34。
- 全仓库一次性重写所有 DAL / DTO；Phase 33 只聚焦 ship-critical auth/data/classroom paths。

</deferred>

---

*Phase: 33-project-level-auth-data-and-classroom-durability-closure*
*Context gathered: 2026-05-17*
