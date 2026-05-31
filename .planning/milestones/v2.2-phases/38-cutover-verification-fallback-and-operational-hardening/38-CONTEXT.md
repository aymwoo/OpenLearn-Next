# Phase 38: Cutover verification, fallback, and operational hardening - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段固定建立在 Phase 36 与 Phase 37 已关闭的事实之上，不再继续扩展 transport
基础设施本身，而是把已经落地的 `ws + ioredis` classroom transport 收口为单一、
可验证、可说明、可演示、可归档的 milestone close posture。

Phase 38 的交付目标固定是四类能力收口：

1. **canonical verifier**：把 classroom、player、runtime 与 Redis fanout 的关键事实
   收口为 milestone 级单一可执行 gate，而不是继续依赖 Phase 36/37 各自 verifier 的
   人工拼接理解。
2. **fallback / rollback posture**：明确当 WebSocket 或 Redis 不可用时，系统到底
   保留什么能力、谁能看到什么状态、哪些路径回退到 SSE 或 durable snapshot，哪些
   只是 degraded local-only。
3. **local dev / demo / smoke path**：明确 repo-local 运行、双实例 smoke、Redis
   环境变量与验证前置条件，让 Phase 38 的 close 不是“只有作者本人知道怎么证明”。
4. **milestone close artifact**：输出明确的交付范围和排除项，只覆盖
   `ws + ioredis` classroom transport，不误扩展到 PostgreSQL、BullMQ、第二 runtime
   或 broader runtime-platform expansion。

本阶段不新增 PostgreSQL、BullMQ、Redis Streams、Socket.IO、第二 runtime、新的
durable truth source，也不因为 closeout 需要而回头重写 Phase 36/37 已经稳定的
transport seam 实现。

</domain>

<decisions>
## Locked Upstream Decisions

### Phase 36 truths that Phase 38 must preserve
- **D-38-01:** `ws` 已是课堂实时链路的正式双向 transport，`server.ts -> ws-server.ts`
  是真实 upgrade host，不能在 Phase 38 又把 cutover 口径写回“实验性附加通道”。
- **D-38-02:** SSE rollback surface 是已验证、被保留的设计内事实，不是遗留缺口。
  Phase 38 只能更清楚地记录它，不能假装它不存在。
- **D-38-03:** WebSocket 继续只承担 delivery，不成为新的业务真相源；durable truth
  仍然在 SQLite + DAL + canonical classroom/runtime write path。

### Phase 37 truths that Phase 38 must preserve
- **D-38-04:** Redis fanout 已锁定为 optional capability，不是默认 transport baseline。
- **D-38-05:** deploy capability 高于 product toggle；默认本地 posture 仍是
  `local_only`，缺 Redis 时允许诚实 skip Redis smoke。
- **D-38-06:** `classroomSession.transportModeSnapshot` 只影响新 session；既有会话
  不热切换 transport mode。
- **D-38-07:** Redis 继续只是 delivery layer；degraded fallback 允许 publisher
  实例 local-only 投递，但跨实例 attempt 必须记失败，不能伪装成 delivered。
- **D-38-08:** Redis degraded truth 只暴露给 `/settings`、runtime inspector 和 teacher
  `/classroom` operator surface；student-facing runtime 不扩散 Redis-specific copy。

### Phase 38-specific close posture rules
- **D-38-09:** milestone close 必须以可执行 gate 为主，不接受 prose-only 的“路线已完成”表述。
- **D-38-10:** 如果 Phase 38 发布新的 canonical verifier，它必须和 `verify:phase36`
  / `verify:phase37` 形成清晰层级关系，不能制造两个互相竞争的最终口径。
- **D-38-11:** fallback / rollback 文档必须明确区分以下几种状态：
  `ws cutover success`、`Redis optional disabled`、`Redis enabled and healthy`、
  `Redis degraded local-only`、`snapshot/SSE rollback posture`。
- **D-38-12:** local demo / smoke 路径必须写清环境前提，例如 `REDIS_URL`、
  `REDIS_FANOUT_ENABLED=true`、双实例启动方式与预期输出。
- **D-38-13:** milestone close artifact 必须显式写出仍在 deferred 的范围：
  PostgreSQL、BullMQ、Redis Streams、第二 runtime、第三方 runtime/package、AI runtime expansion。

</decisions>

<canonical_refs>
## Canonical References

**Downstream planning or execution work MUST read these first.**

### Milestone truth
- `.planning/ROADMAP.md` — Phase 38 的正式 goal、success criteria 与 2 个 plan 槽位。
- `.planning/REQUIREMENTS.md` — `RTPX-02` 与 `RTPX-03` 的 requirement truth，明确 Phase 37 已关闭 Redis fanout transport slice。
- `.planning/STATE.md` — 当前 milestone posture：Phase 37 complete，Phase 38 queued。

### Locked upstream verification
- `.planning/phases/36-websocket-classroom-transport-cutover/36-VERIFICATION.md` — Phase 36 已证明 `ws` handshake、canonical routing、WS-first consumers 与 SSE rollback surface。
- `.planning/phases/37-redis-fanout-and-multi-instance-delivery-convergence/37-VERIFICATION.md` — Phase 37 已证明 optional Redis fanout、session snapshot、degraded observability、canonical `verify:phase37` gate。

### Phase 37 close artifacts
- `.planning/phases/37-redis-fanout-and-multi-instance-delivery-convergence/37-01-SUMMARY.md`
- `.planning/phases/37-redis-fanout-and-multi-instance-delivery-convergence/37-02-SUMMARY.md`
- `.planning/phases/37-redis-fanout-and-multi-instance-delivery-convergence/37-03-SUMMARY.md`

### Existing verifier and bootstrap anchors
- `scripts/verify-phase36-websocket-cutover.ts`
- `scripts/verify-phase37-redis-fanout.ts`
- `scripts/bootstrap-dev-db.ts`
- `package.json`

### Existing code anchors to audit rather than redesign
- `server.ts`
- `src/app/api/ws/classroom/[sessionId]/route.ts`
- `src/features/runtime-platform/seams/transport/gateway.ts`
- `src/features/runtime-platform/seams/transport/ws-server.ts`
- `src/features/runtime-platform/seams/transport/ws-adapter.ts`
- `src/features/runtime-platform/seams/transport/redis-fanout-manager.ts`
- `src/features/runtime-platform/seams/transport/redis-fanout-connection.ts`
- `src/components/classroom/classroom-control-panel.tsx`
- `src/components/classroom/classroom-live-snapshot-refresh.tsx`
- `src/components/learning/classroom-runtime-client.tsx`
- `src/components/surfaces/settings-surface.tsx`
- `src/components/surfaces/runtime-inspector-surface.tsx`

</canonical_refs>

<code_context>
## Existing Code Insights

### What is already true in code
- 仓库已经有两个 phase-specific verifiers：`verify:phase36`、`verify:phase37`。
- 仓库已经有 route-level honesty：WebSocket GET route 返回 `426`，并保留 rollback
  surface 说明。
- 仓库已经有 operator-visible transport state：`/settings`、runtime inspector、teacher
  `/classroom` degraded banner。
- 仓库已经有 local dev honest posture：默认 `local_only`，只在显式提供 Redis capability
  时运行 Redis smoke。

### What Phase 38 likely needs to add
- 一个 milestone-level canonical gate，或者清晰编排现有 phase gates 的总门。
- route-by-route parity proof，证明 classroom / player / runtime 主链在当前 cutover 后的
  合同是稳定且可重复验证的。
- repo-local runbook 或 closeout doc，明确如何本地证明双实例 fanout、degraded local-only、
  fallback / rollback posture 与 operator observability。
- 最终 milestone close artifact，把“已交付”和“仍 deferred”边界写死。

### What Phase 38 should not do by default
- 不应默认重构 `gateway.ts`、`ws-server.ts`、`redis-fanout-manager.ts` 等已收口的主实现，
  除非 closeout 过程发现真实 gap。
- 不应把 observability closeout 变成新的 product surface 开发任务。
- 不应把 BullMQ 或 broader async worker 支持误并入 `RTPX-02` 的本期 close 口径。

</code_context>

<specifics>
## Specific Questions Phase 38 Must Resolve

1. **Canonical gate shape**
   - 是发布新的 `verify:phase38`，还是编排 `verify:phase36` + `verify:phase37` + 新的 closeout checks？
   - 最终对外“milestone complete”的唯一命令是什么？

2. **Parity proof scope**
   - route-by-route parity 是否只锁定 `classroom / player / runtime` 三条主链？
   - `settings / runtime inspector / teacher classroom degraded affordance` 是否也必须纳入 milestone close gate？

3. **Fallback / rollback documentation**
   - 哪些事实已经在代码和 verifier 输出里存在，哪些仍只隐含在 summary 文档？
   - 是否需要单独的 fallback matrix 文档来解释各种故障下的系统行为？

4. **Local demo and smoke posture**
   - 是否需要 repo 内新增演示手册，明确 Redis 启动、双实例启动、双 client smoke、以及预期日志或 UI 结果？
   - 现有 `bootstrap-dev-db.ts` 和 `verify:phase37:redis` 是否已经足够，还是还缺一份面向人类的 runbook？

5. **Milestone close boundary**
   - 最终 close artifact 如何明确写出：只覆盖 `ws + ioredis` classroom transport，
     不覆盖 PostgreSQL、第二 runtime、BullMQ、第三方 runtime/package？

</specifics>

<deferred>
## Deferred Ideas

- 把 `RTPX-02` 扩大为 BullMQ 或 broader async worker rollout。
- 新建 transport admin console 或第二套 operator product surface。
- 新增第二 built-in runtime。
- PostgreSQL、Socket.IO、Redis Streams cutover。
- 为了 closeout 而大范围重写 Phase 36/37 已稳定的 transport seams。

</deferred>

---

*Phase: 38-cutover-verification-fallback-and-operational-hardening*
*Context gathered: 2026-05-18*
