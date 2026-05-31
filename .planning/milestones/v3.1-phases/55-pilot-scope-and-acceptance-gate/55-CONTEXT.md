# Phase 55: Pilot Scope & Acceptance Gate - Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只负责冻结 `v3.1` 的单校试点口径、课堂投票样板、容量假设、proof artifact、failure taxonomy 与 recovery matrix，
让后续 Phase 56-60 能在同一套试点验收语言下推进。

Phase 55 的职责不是实现课堂投票插件 authoring/runtime、operator surface、CI/CD、backup/restore 或 load test 本身，
也不是重写任何既有 transport、async、plugin governance 主骨架。
它的工作是把“什么算试点成功、什么算失败、谁能恢复、需要留下什么证据、哪些工作不属于本 milestone”前置写死。

本阶段建立在现有事实之上：lesson editor / publish / classroom runtime / student progress 主链路已经存在，
WebSocket-first classroom transport、optional Redis fanout、BullMQ worker、SQLite + DAL durable truth、plugin lifecycle / command / event baseline 都已交付。
Phase 55 必须承认这些 baseline，而不是把它们误写成待建设缺口。

</domain>

<decisions>
## Implementation Decisions

### Pilot framing
- **D-55-01:** `v3.1` 被正式锁定为“单校试点生产可用（插件先行）”，不是下一轮平台抽象升级，也不是全平台生产化扫尾。
- **D-55-02:** `v3.1` 的真实样板固定为“课堂投票插件”，不同时追多个插件类型。
- **D-55-03:** `v3.1` 的主链路固定为“教师设计 -> 发布 -> 开课 -> 学生课堂完成 -> 教师与 operator 验证”。
- **D-55-04:** 试点容量口径固定为单课堂 40 名学生、同时 5 个课堂；后续 load/degrade gate 必须围绕这个数字建立。

### Proof and acceptance posture
- **D-55-05:** 每个后续 phase 都必须在 kickoff 时前置定义 proof artifacts，而不是 close 时补写。
- **D-55-06:** milestone close gate 必须同时覆盖 success criteria、failure taxonomy、recovery actions、runbook evidence 与 rehearsal evidence。
- **D-55-07:** operator/support 视角与研发诊断视角都属于 committed scope，但必须共享同一 authoritative read model truth。

### Baseline truth and deferred wall
- **D-55-08:** 现有 WebSocket-first transport、optional Redis fanout、BullMQ worker、SQLite + DAL truth、plugin lifecycle / command / event baseline 都属于已存在能力，roadmap 不得把它们重新表述为“待先建设基础设施”。
- **D-55-09:** SQLite + DAL 继续是唯一 durable truth；Redis、WebSocket、BullMQ 只能承担 delivery 或 orchestration 角色。
- **D-55-10:** 多校多租户、通用 plugin marketplace、Agent Runtime 扩张、PostgreSQL/Kubernetes/重型 observability 平台迁移继续明确 deferred，不自动进入 `v3.1` committed scope。

### the agent's Discretion
- Phase 55 可以把 proof artifact 组织成 markdown contract、matrix、checklist 或 verification inventory，只要后续 phases 能直接引用。
- failure taxonomy 与 recovery matrix 的字段名可以做最小正确命名，但必须覆盖 authoring/publish/launch/student submit/operator recovery 四大节点。
- 若需要建议 Phase 56-60 的计划拆分，可在不改变已锁定 milestone framing 的前提下做最小调整。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone truth and locked requirements
- `.planning/ROADMAP.md` — Phase 55 的正式 goal、requirements、success criteria 与 phase ordering。
- `.planning/REQUIREMENTS.md` — `PILOT-01`、`PILOT-02`、`PILOT-03` requirement truth。
- `.planning/PROJECT.md` — `v3.1` 的 current state、scope fence、out-of-scope 与 key decisions。
- `.planning/STATE.md` — 当前 milestone planning 状态与 next queued phase。

### Research decisions that lock this phase
- `.planning/research/SUMMARY.md` — `v3.1` 的统一 framing：单校试点、插件先行、课堂投票样板、40/5 容量口径。
- `.planning/research/FEATURES.md` — table stakes、sample-chain must-haves、requirement category 建议与 deferred wall。
- `.planning/research/ARCHITECTURE.md` — authoritative write path、operator surface、production layer build order。
- `.planning/research/PITFALLS.md` — scope 漂移、infra-first、happy-path-only、operator 不可执行等关键风险。

### Locked upstream context
- `.planning/milestones/v3.0-ROADMAP.md` — 最近归档 milestone 的计划写法与 phase detail 风格参考。
- `.planning/MILESTONES.md` — 既有 baseline 与历史 archive 边界。
- `.planning/phases/54-ai-native-contract-exposure/54-CONTEXT.md` — 最近 phase 的 planning artifact 结构参考。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- 现有 lesson editor / publish / classroom runtime / student progress 主链路已经存在，说明 Phase 55 不需要再证明“系统是否能上课”，而是要冻结“什么叫试点可上线”。
- WebSocket-first classroom transport、optional Redis fanout、BullMQ worker 与 operator surfaces 已提供 production posture 的技术锚点。
- plugin lifecycle / command / event baseline 已存在，说明样板插件应建立在既有治理模型之上，而不是再发明第二套插件运行时。

### Established Patterns
- milestone planning 文档会先锁定 scope、truth posture、deferred wall，再由后续 phase 消费。
- repo 已多次强调 SQLite + DAL 是唯一 durable truth，queue/transport 不得升格为真相源。
- 最近 phases 使用 `CONTEXT.md` + `RESEARCH.md` + numbered `PLAN.md` 作为正式 planning input，Phase 55 应沿用同一结构。

### Integration Points
- `.planning/ROADMAP.md` 与 `.planning/REQUIREMENTS.md` 现在已经给出 Phase 55 的 requirement ids 与 success criteria，Phase 55 文档需要把这些内容进一步落到 proof / failure / recovery contract。
- 后续 Phase 56-60 都需要从本阶段直接读取 sample chain、pilot capacity、proof artifact、failure taxonomy、recovery matrix。

</code_context>

<specifics>
## Specific Ideas

- 把 Phase 55 产出拆成三类权威输入：`pilot contract`、`proof inventory`、`failure & recovery matrix`。
- proof inventory 至少覆盖教师设计、publish preflight、classroom launch、student completion、operator recovery、deploy/release、backup/restore、load/degrade rehearsal。
- failure taxonomy 至少覆盖：配置非法、plugin disabled/incompatible、launch readiness fail、transport degraded、student submit timeout/retry、worker backlog/reconcile。
- recovery matrix 要明确每类 failure 的 owner、可执行动作、证据来源、何时需要 fallback 或 rollback。

</specifics>

<deferred>
## Deferred Ideas

- 直接开始实现课堂投票插件 authoring/runtime。
- 直接实现 operator surfaces、CI/CD、backup/restore 或 load tooling。
- 把 `v3.1` 扩成多校 SaaS、plugin marketplace、Agent Runtime、PostgreSQL/Kubernetes/OTel 平台升级。

</deferred>

---

*Phase: 55-Pilot Scope & Acceptance Gate*
*Context gathered: 2026-05-24*
