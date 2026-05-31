## Phase 36 context

### Why this is a new phase

- `v2.1` 已归档，不能把新的 WebSocket cutover 继续塞进已关闭 milestone。
- Phase 31 已经把 transport gateway、SSE-first adapter 和 durable delivery attempt truth 落到主干，这次不需要再做一轮 transport abstraction。
- Phase 33-35 已经收口 auth、DAL、DTO、classroom durability 与 active-scope baseline，因此当前 blast radius 可以集中在 realtime cutover 本身。

### Committed scope

- 技术选型固定为 `ws + ioredis`。
- Phase 36 只处理 `ws` 双向 classroom transport 的正式 cutover 基线。
- Redis fanout、多实例分发和交付恢复留到 Phase 37 收口，但 Phase 36 的消息信封和连接模型必须提前为 `ioredis` 适配留出稳定边界。

### Must preserve

- 业务真相仍由 SQLite、DAL、Server Actions、classroom session 与 canonical runtime/classroom event path 持有。
- WebSocket route handler 不能成为 direct DB shortcut。
- 当前 teacher control、student sync、runtime command、snapshot recovery、locked/unlocked 课堂语义不能回退。

### Non-goals

- 不在本 phase 处理 PostgreSQL、第二 runtime、sandbox 增强、第三方 runtime/package 或 AI runtime。
- 不复用 `.planning/roadmaps/PHASE-33-36-ROADMAP.md` 作为正式 source of truth；该文档包含旧编号和更大 scope，只作为历史草案参考。
