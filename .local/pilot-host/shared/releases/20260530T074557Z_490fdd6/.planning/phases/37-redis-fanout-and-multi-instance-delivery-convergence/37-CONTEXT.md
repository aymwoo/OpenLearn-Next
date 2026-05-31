# Phase 37: Redis fanout and multi-instance delivery convergence - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段固定建立在 Phase 36 已完成的 `ws` classroom transport cutover 之上，
目标是为现有 WebSocket delivery path 增加可选的 `ioredis` fanout 能力，
让系统在显式启用且完成 Redis 配置时具备多实例分发能力，同时继续保持
transport 只是 delivery 层，而不是 classroom 或 runtime 的 durable truth source。

Phase 37 交付的是四类能力收口：

1. 在不改变 `publishTransportEvent()` canonical gateway、DAL、classroom session
   与 runtime session truth ownership 的前提下，把当前 `ws-adapter -> in-memory connection registry`
   升级为可选的 Redis-backed fanout path。
2. 明确 Redis topic / channel routing、publish/subscribe lifecycle 与会话级 transport mode
   快照语义，让 planner 能在现有 `sessionId/channel/kind/truthRef` 合同上收口实现。
3. 明确 Redis 不可用时的诚实降级与状态暴露：系统可回退到“仅当前实例本地 fanout”与既有 SSE rollback
   posture，但不能把跨实例 delivery failure 伪装成成功。
4. 为 Redis 模式补齐全局系统级设置、开发姿态与验证门，而不是默认把 Redis 变成新的强依赖。

本阶段不把 Redis 提升为默认基线，不把产品完成口径表述成“所有部署都已默认具备多实例分发”，
也不引入 PostgreSQL、BullMQ、Redis Streams、Socket.IO、第二 runtime、或新的业务真相源。

</domain>

<decisions>
## Implementation Decisions

### Redis fanout posture
- **D-01:** Phase 37 的 Redis fanout 固定为可选能力，不是默认 transport 基线；默认开发和单实例部署仍允许继续使用当前非 Redis 的单进程内存 fanout。
- **D-02:** Redis 模式启用后，也只能承担 WebSocket fanout / multi-instance delivery 职责；SQLite + DAL + classroom/runtime session write path 继续是唯一 durable truth。
- **D-03:** 业务侧继续只通过 `publishTransportEvent()` 进入 transport gateway；Phase 37 不允许新开一条绕过 gateway 的 Redis publish path。

### Enablement and authority
- **D-04:** Redis fanout 的启用条件同时存在于部署配置层和产品设置层，但部署配置是最终权威。
- **D-05:** 只有当服务端部署明确允许 Redis fanout 且 Redis 连接实际可用时，产品设置中的 Redis 模式才能生效；否则产品设置只能显示未就绪/不可启用状态，不能强行切换 transport。
- **D-06:** 产品内 Redis 设置固定为全局系统级设置，不按 school、不按 classroom session 分散配置。
- **D-07:** 只有 `developer` / `super_admin` 可以修改这个全局 Redis 设置；其他角色最多查看当前模式与健康状态。

### Session-scoped transport mode
- **D-08:** Redis 模式的产品设置变更只影响新创建的 classroom session；已存在会话不热切换 transport 模式。
- **D-09:** 具体落点固定为“在 classroom session 创建时快照本次会话的 transport mode”；后续连接握手、publish、subscribe 都消费该会话快照，而不是每次读取全局当前值。
- **D-10:** Phase 37 因此需要一个可持久化的全局系统配置真相源，供“创建课堂会话时快照 transport mode”读取；仓库当前没有现成的系统级 config table，可视为本阶段新增边界之一。

### Redis topic and routing granularity
- **D-11:** Redis topic 主作用域固定为 `classroomSessionId`，不改成 school-wide、instance-wide 或 runtime-only 顶层 topic。
- **D-12:** 在主作用域下，Redis routing 采用 `session + channel` 粒度，而不是把所有 snapshot / runtime / control 消息都塞进单一 session topic。
- **D-13:** 至少固定拆成 `classroom` 和 `runtime` 两类子 channel：step sync、lock/unlock、snapshot 等 classroom 语义走 classroom；runtime event / runtime teacher control 走 runtime。
- **D-14:** Phase 37 不把 topic 再细分到 per-command 或 per-runtime-instance 级别，避免订阅拓扑和恢复语义过早复杂化。

### Failure and degradation semantics
- **D-15:** 当 Redis 模式已启用但 publish / subscribe 发生故障时，系统必须诚实降级并显式记录 failure；不能把“多实例 fanout 已失效”伪装成 delivery 仍然正常。
- **D-16:** Redis 故障后的第一回退固定是“仅当前实例继续使用本地 connection registry 投递”；这样课堂可以继续，但只保证本实例，不保证跨实例一致性。
- **D-17:** SSE rollback posture 继续保留为已验证事实；但 Phase 37 不把 Redis 故障下的 recover 伪装成“透明成功”，而要明确区分“本实例仍可实时”和“跨实例 fanout 已失效”。
- **D-18:** Redis 相关降级状态必须同时暴露给 settings/inspector 与 classroom 操作者：前者看到完整模式和健康状态，后者在 `/classroom` 看到简洁但明确的 degradation 提示。

### Development and verification posture
- **D-19:** 本地开发默认不要求 Redis；开发者不启动 Redis 也应能继续跑当前单实例内存 fanout。
- **D-20:** Redis 模式与多实例 fanout 的完成证据必须落在专门的 Redis-focused verification command 或 `verify:phase37` gate 中，而不是只停留在手工说明或 runtime console output。
- **D-21:** Phase 37 的 close posture 必须诚实写明：Redis fanout 只在显式启用并完成配置时成立，默认仓库运行姿态仍兼容无 Redis 的单实例开发路径。

### the agent's Discretion
- Redis channel 的精确命名格式、adapter factory 结构、connection health probe 细节和 verifier 的具体脚本组织，可以由 planner 收敛，只要不违背 D-01 到 D-21。
- settings UI 是落在 `/settings` 还是 `/settings/labs` 的哪一块、如何展示“部署层允许但产品层关闭 / 部署层不允许”等状态，可由 planner 按现有设置面语言细化。
- classroom 页面上的 degradation 提示具体文案、密度与位置可由 planner 决定，但必须保持“操作者能明确知道跨实例 fanout 已失效”。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and requirement truth
- `.planning/ROADMAP.md` — Phase 37 的正式 goal、success criteria 与三个 plan 槽位；同时要注意本次 discussion 已把默认 Redis posture 收紧为“可选模式”，planner 需要诚实对待与 roadmap 原表述的张力。
- `.planning/REQUIREMENTS.md` — `RTPX-02` 的 requirement truth，以及本 milestone 仍固定在 `ws + ioredis` transport cutover 范围内。
- `.planning/PROJECT.md` — 当前 milestone 的总体 posture：`ws + ioredis` 只做 transport cutover，不让 Redis 反客为主成为业务真相源。
- `.planning/STATE.md` — 当前 Phase 36 已关闭、Phase 37 未开始的里程碑状态。

### Locked upstream transport decisions
- `.planning/phases/27-compatibility-baseline-and-v2-boundary-scaffolding/27-CONTEXT.md` — Redis / Event Bus / WebSocket seam 先以 adapter contract 形式存在，但不能变成 hidden cutover switch 或新的 truth ownership。
- `.planning/phases/31-transport-boundary-and-runtime-inspector/31-CONTEXT.md` — transport gateway 必须保持单一 publish 入口、`truth persisted + delivery attempted` 二段式语义，以及 transport 只是 delivery channel。
- `.planning/phases/32-end-to-end-hardening-and-milestone-proof/32-CONTEXT.md` — runtime/classroom proof path、inspector deep-link 与 transport 不是真相源的上游定论。
- `.planning/phases/33-project-level-auth-data-and-classroom-durability-closure/33-CONTEXT.md` — auth/data/classroom durable truth 已锁定，Phase 37 不能把 Redis 变成并行 persistence vocabulary。
- `.planning/phases/36-websocket-classroom-transport-cutover/36-CONTEXT.md` — Phase 36 已锁定 `ws` cutover 只处理 WebSocket，不处理 Redis fanout。
- `.planning/phases/36-websocket-classroom-transport-cutover/36-VERIFICATION.md` — 明确 Phase 36 已验证 `ws` route auth、canonical routing、WS-first consumers 与 SSE rollback posture，且 Redis 仍是 future-phase concern。

### Existing transport implementation to extend
- `src/features/runtime-platform/seams/transport/contract.ts` — 当前 transport mode、attempt status、consumer trace schema 的真相源；Phase 37 的 Redis 路径必须从这里扩展，而不是自建并行 contract。
- `src/features/runtime-platform/seams/transport/gateway.ts` — 当前 canonical publish 入口、attempt trace 写入、primary/supplemental adapter 语义，Phase 37 的 Redis 接入必须沿用这条边界。
- `src/features/runtime-platform/seams/transport/ws-adapter.ts` — 当前 WebSocket adapter 仍直接依赖本地 `classroomWebSocketConnectionRegistry.broadcast()`；这是 Phase 37 变更 Redis fanout 的第一落点。
- `src/features/runtime-platform/seams/transport/ws-connection-registry.ts` — 当前单实例内存连接表；Phase 37 需要保留其“本实例最终投递”职责，但不能再把它当成唯一 fanout 机制。
- `src/features/runtime-platform/seams/transport/ws-server.ts` — 当前真实 upgrade host、连接注册和 snapshot emit 入口；后续 Redis subscribe 消费后仍会回到这里注册出来的本地 sockets。
- `src/features/runtime-platform/seams/index.ts` — 当前 transport seam export 与 default/supported adapter posture。
- `src/features/runtime-platform/seams/event-bus/contract.ts` — 仓库里已经存在 `redis-streams` 的 future event-bus seam vocabulary；Phase 37 需要避免把 WebSocket fanout 和 event-bus truth path 混成一回事。
- `src/features/runtime-platform/seams/event-bus/default-adapter.ts` — 当前 in-process event-bus default posture，可作为“非 Redis 默认运行姿态”的参考边界。

### Existing persistence and inspector anchors
- `src/db/schema.ts` — `transportDeliveryAttempts`、`transportConsumerTraces`、`runtimeEventOutbox` 的 schema truth；Phase 37 的 Redis failure / degradation 语义必须继续映射到这里，而不是另建外部状态源。
- `src/lib/dal/runtime-inspector.ts` — 现有 transport attempt / consumer trace 的读取面，后续 Redis 模式和 degrade 状态需要能被 inspector 解释。
- `src/components/surfaces/runtime-inspector-surface.tsx` — 当前独立 inspector 产品面；Phase 37 若暴露 Redis 模式或 failure posture，优先接在这里而不是再建新 operator page。
- `src/lib/dal/classroom.ts` — 当前 classroom snapshot、teacher control、runtime feedback 与 transport publish 主链路；Redis fanout 不能绕开这条写链。

### Settings and system-control references
- `src/app/settings/page.tsx` — 现有通用设置入口。
- `src/app/settings/labs/page.tsx` — 现有实验室/扩展设置入口；若 Redis 模式被视为系统级 transport capability，这里是候选挂点之一。
- `src/components/surfaces/settings-surface.tsx` — 现有 settings surface，同时展示主题、插件、labs 入口；Phase 37 若增加全局 Redis 模式设置，需要沿用这里的 server-first settings surface pattern，而不是另起新管理台。
- `src/actions/theme-actions.ts` — 现有 settings mutation action 参考，但它走的是 actor/cookie 级主题设置，不适用于 Phase 37 的全局系统配置；planner 应把它当作 UI/action 模式参考，而不是 persistence 方案参考。

### Bootstrap and verification references
- `package.json` — 现有 `verify:phaseNN` 注册模式，以及 `ioredis` 已经在依赖中存在。
- `scripts/verify-phase36-websocket-cutover.ts` — 当前 phase verifier 形状与 honest rollback note 模板；Phase 37 应延续“静态 guard + focused suites + honest posture output”的模式。
- `scripts/bootstrap-dev-db.ts` — 当前 repo-local bootstrap 基线；Phase 37 若需要本地系统配置 seed、或标识 Redis mode 默认关闭，应优先接在这里或同类 bootstrap 路径上。
- `server.ts` — 当前 Node host 真实承载 WebSocket upgrade；Phase 37 的 Redis fanout 仍然建立在这个 host posture 上，不改成独立 transport service。

### Architecture direction
- `OpenLearn-Next-V2-Architecture-Plan.md` — 长线方向里出现了 Redis / Event Bus / WebSocket / Observability，但本阶段只能抽取“未来可扩展”方向，不能把该文档当成直接执行 PostgreSQL/Redis Streams/big-bang cutover 的授权。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `publishTransportEvent()`：已经把 transport publish、attempt persistence、supplemental adapter failure trace 统一收口，是 Phase 37 最应该保住的单入口。
- `wsRuntimeTransportAdapter`：虽然当前只做本机内存 broadcast，但它已经是 websocket delivery 的独立 adapter 边界，适合插入 Redis publish/subscribe。
- `classroomWebSocketConnectionRegistry`：当前连接注册、describeSession、broadcast 语义已经清晰，可继续承担“本实例最后一跳投递”的职责。
- `transportDeliveryAttempts` / `transportConsumerTraces`：已有 transport attempt 与 consumer trace durable schema，可直接承载 Redis mode、degradation、supplemental failure 等证据。
- `RuntimeInspectorSurface` + `getRuntimeInspectorDTO()`：已有单一 operator surface，可以消费新增的 Redis mode / failure posture，而不需要再新建监控页。
- `SettingsSurface`：已有 server-rendered settings surface 和 server action 提交模式；全局 Redis 设置的产品入口应尽量复用这种组织方式。

### Established Patterns
- transport 继续固定为“truth persisted + delivery attempted”语义；delivery failure 不能反向改写 durable truth。
- current default posture 仍是 centralized seam metadata + no hidden switch；如果引入 Redis 模式，必须让 deploy authority 与 product setting 的优先级关系非常明确。
- WebSocket 当前是 `server.ts -> ws-server.ts -> ws-auth / registry / adapter` 的真实 host 边界；Redis fanout 应在 adapter / registry 一侧扩展，而不是把 handshake 或 classroom DAL 逻辑搬去 Redis layer。
- settings 现有产品面主要处理 actor-visible preferences 和 plugin/theme toggles；Phase 37 会首次引入“数据库全局系统配置”这种新 persistence boundary，不能误复用 cookie-based actor setting 模式。
- 当前仓库没有通用 `systemConfig` / `siteSetting` / `globalSetting` 表；这意味着 Phase 37 的全局 Redis 设置不是简单接线，而是新增系统配置真相源。

### Integration Points
- `src/features/runtime-platform/seams/transport/ws-adapter.ts`：把“本机 registry broadcast”升级成“可选 Redis fanout + 本地最终投递”的直接落点。
- `src/features/runtime-platform/seams/transport/gateway.ts`：若需要让 Redis mode 影响 adapter 选择、attempt metadata 或 degradation trace，这里是唯一合法入口。
- `src/features/runtime-platform/seams/index.ts` 与相关 tests：需要同步反映 supported adapter posture、default posture 和 no-hidden-switch assertions 的新现实。
- `src/lib/dal/classroom.ts` 的 classroom session create path：transport mode 会话级快照的直接落点，应在创建 session 时固定，而不是在 ws handshake 时读取当前全局值。
- `src/db/schema.ts`：新增全局系统配置表、以及可能的 classroom session transport-mode snapshot 字段，都应在这里定义并带上清晰 cascade / index posture。
- `src/components/surfaces/settings-surface.tsx`、`src/app/settings/page.tsx`、`src/app/settings/labs/page.tsx`：产品级 Redis mode 状态、权限显示和 developer/super-admin mutation 的候选入口。
- `src/lib/dal/runtime-inspector.ts` 与 `src/components/surfaces/runtime-inspector-surface.tsx`：Redis degraded / fallback-to-local-instance 状态的解释面。
- `scripts/verify-phase37-*.ts` 或等价 verifier：Redis mode 的 focused gate 应落在这里，而不是继续复用 Phase 36 verifier。

</code_context>

<specifics>
## Specific Ideas

- 用户明确要求：Redis fanout 不是默认打开，而是“部署配置允许 + 产品内全局设置开启”时才生效。
- 用户明确要求：产品设置存在，但最终权威必须是部署配置，不能出现产品层强行覆盖基础设施能力的情况。
- 用户明确要求：全局 Redis 设置只允许 `developer` / `super_admin` 修改，且只影响新 classroom session。
- 用户明确要求：transport mode 在 classroom session 创建时快照，避免同一会话在运行中热切换。
- 用户明确要求：Redis topic 至少按 `classroomSessionId + classroom/runtime channel` 拆分，不接受把所有 fanout 都塞进单一 topic。
- 用户明确要求：Redis 故障时必须诚实降级为“仅当前实例本地 fanout 可用”，并让课堂操作者与 settings/inspector 都能看到这个事实。
- 用户明确要求：本地开发默认不强依赖 Redis，但必须有专门的 Redis verification gate 证明该模式可用。

</specifics>

<deferred>
## Deferred Ideas

- 把 Redis fanout 提升为所有环境默认基线，或把 Phase 37 对外宣称成“默认多实例已完成”。
- 按 school 或按 classroom session 分散配置 Redis 模式。
- 允许运行中的课堂热切换 transport mode。
- 把 Redis topic 再细分到 per-command / per-runtime-instance 级别。
- Redis 故障时继续伪装跨实例 fanout 正常，或把 failure 隐藏成仅日志可见。
- 让学生侧也直接看到 Redis degrade 状态提示。
- 复用 cookie / actor-level preference 方式来持久化全局 Redis 设置。
- 把 Redis Streams、BullMQ、PostgreSQL、Socket.IO 或第二 runtime 一并拉进本阶段。

</deferred>

---

*Phase: 37-redis-fanout-and-multi-instance-delivery-convergence*
*Context gathered: 2026-05-18*
