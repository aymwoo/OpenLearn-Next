# Phase 58: Operator Recovery & Production Surfaces - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只负责把课堂投票样板链路里的 operator/support 诊断与恢复能力收口成正式 production surfaces：
让 operator 和 support 能按 school / classroom / lesson version / plugin / action / command / task 关联定位问题，
诚实看到 degraded posture，并在不改库的前提下执行标准恢复动作。

Phase 58 建立在 Phase 57 已完成的课堂内最小 recovery entrypoints、Phase 42 已完成的 async operator、
以及 Phase 52 已完成的 plugin lifecycle governance 之上。

本阶段不重做 teacher 课堂壳、不重写 runtime inspector / async platform / plugin governance baseline，
也不进入 deploy/release、backup/restore、load/degrade rehearsal；这些分别属于既有 baseline 或 Phase 59-60。

本阶段的正式职责是：
- 让 operator/support 从课堂 incident 出发，看到关联的 plugin、command、task 和 degraded posture；
- 把 classroom / plugin / command / task 诊断串成同一 authoritative read model truth；
- 把 retry / reconcile / resume / suspend / fallback 等恢复动作放到正式 operator surface；
- 用明确的 trust-boundary 语言暴露当前不能信任什么、仍可信什么、下一步去哪里。

</domain>

<decisions>
## Implementation Decisions

### Operator entry and information architecture
- **D-58-01:** Phase 58 不做单一 mega dashboard；继续保留 `runtime inspector`、`async operator`、`plugin governance` 三类独立 operator surface。
- **D-58-02:** Phase 58 必须新增以 `classroom/session` 为起点的 operator entry，把课堂 incident 作为默认入口，再通过显式关联跳转进入 runtime / plugin / command / task 详情。
- **D-58-03:** teacher 当前 classroom shell 中的最小 recovery 和课堂内告警继续保留；Phase 58 只补 operator/support production surfaces，不把课堂内诊断整体迁走。
- **D-58-16:** `Settings Labs` 在 Phase 58 中保留为 operator tooling 的汇总索引入口，但它的职责是承接跨课堂排障与 recent incidents，不取代 `classroom/session` 作为默认 incident 入口。
- **D-58-17:** classroom 页中的 operator 入口必须稳定存在，但默认保持低干扰；一旦出现 degraded / failed / blocked posture，它应升格为更显眼的 incident CTA。
- **D-58-18:** 当 operator 从 `Settings Labs` 进入且手里没有现成 classroom deep link 时，第一屏优先看到“课堂 incident 列表”，而不是先选工具页或先输入大量对象元数据检索。

### Primary tracing anchor and read-model organization
- **D-58-04:** operator 默认排查锚点固定为 `classroom/session`，不是 `command/task` 或 `plugin/action`；support 应先回答“这堂课现在发生了什么”，再下钻平台执行细节。
- **D-58-05:** authoritative operator read model 必须围绕单个 classroom/session 投影出 school、lesson version、runtime session、plugin、action、command、task 的关联状态，而不是让 operator 手工拼多页信息。
- **D-58-06:** support/operator 视图与研发视图必须共享同一 truth source；差异只能体现在信息深度与可见字段，不允许维护两套彼此漂移的 read model。
- **D-58-07:** `command`、`task`、`plugin` 仍保留各自专门 surface 或 detail view，但它们在 Phase 58 中属于 classroom incident 的下钻节点，不升级为首页主导航锚点。
- **D-58-19:** `classroom/session` operator 首屏采用“摘要优先”组织：先给 classroom/session 当前状态、degraded posture 与关联对象摘要，不把首屏做成 timeline-first 或 giant detail page。
- **D-58-20:** `classroom/session` 首屏上的关联信息优先按“当前问题 / incident cards”组织，而不是按 Runtime / Plugin / Command / Task 四大对象分区平铺；对象类型视图属于进一步下钻。
- **D-58-21:** `latest command`、`problem tasks`、`plugin posture` 等关联对象在首屏只停留在“状态 + 原因/影响 + 下一跳”粒度；attempt history、full timeline、raw diagnostics 留在 detail surfaces。

### Degraded honesty posture
- **D-58-08:** degraded posture 一律采用“强提示 + trust boundary”表达：明确写出当前不能信任什么、仍可信什么、下一步去哪里，不能退化成 badge-only 或 reason-code-only。
- **D-58-09:** Redis degraded、worker lag、transport fallback、plugin disabled / incompatible 等 posture 必须在 operator surface 上显式给出影响范围，至少区分“当前课堂受影响”与“平台级或多课堂受影响”。
- **D-58-10:** 当系统进入 fallback / degraded posture 时，surface 必须优先暴露 canonical truth 是否仍可读、当前只保证哪一层 correctness、以及 operator 是否需要立即介入；不能只说“有问题”而不说边界。
- **D-58-11:** degraded honesty 口径要跨 classroom、runtime inspector、async operator、plugin governance 保持一致；planner 不得让某一页用强告警、另一页只剩弱提示，造成 operator 认知分裂。
- **D-58-22:** 所有 degraded / fallback posture 都必须遵循固定三段模板：`仍可信什么 / 已不可信什么 -> 影响范围 -> 推荐下一步`；不同页面只能替换内容，不能改写顺序或省掉其中一段。

### Recovery action boundary and confirmation
- **D-58-12:** Phase 58 的 operator surface 必须提供可执行恢复动作，而不是只给日志和跳转；标准恢复路径的目标是“不改库即可恢复”。
- **D-58-13:** 恢复动作采用分级确认：`retry` / `reconcile` 走轻确认；`resume` / `suspend` / `fallback` 这类会改变运行姿态或影响课堂行为的动作必须给更明确的二次确认和影响提示。
- **D-58-14:** 恢复动作 availability 必须是 reason-gated 的。若当前上下文不安全或不适用，surface 必须明确说明为什么不能执行，并给出正确的下一个入口，而不是假装总能点。
- **D-58-15:** 所有 operator recovery action 都必须继续走 server-owned seams（Server Actions / command bus / DAL / audited recovery services），并留下 command / recovery audit / task history；禁止 DB surgery、浏览器本地改状态或旁路写入。
- **D-58-23:** Phase 58 的轻确认动作只限 `retry` 与 `reconcile`；`resume` 不得留在 quick path，它和 `suspend`、`fallback` 一样视为会改变运行姿态的高风险动作。
- **D-58-24:** `resume` / `suspend` / `fallback` 这类高风险动作必须在相关 detail view 中完成确认，而不是在 classroom/session 首屏直接执行；确认层必须强制显示影响范围、姿态变化和将写入的审计记录。
- **D-58-25:** 当某个恢复动作当前不可执行时，surface 必须保留该动作的可见性，但以 disabled + reason 的方式明确解释为什么现在不能做，并提供正确的下一步入口；不能直接隐藏，也不能等点击后才报错。

### the agent's Discretion
- classroom-anchored operator entry 的精确 route 名称、放在 `/settings/labs` 下还是以 classroom deep link 进入后再跳转，可由 planner 在现有 IA 下做最小正确收敛，但必须保持“从 classroom incident 出发”的默认心智模型。
- classroom/session 关联 read model 的 DTO 字段名、join strategy、以及 command/task correlation key 命名，可由 planner 结合现有 `runtimeSessionId` / `classroomSessionId` / `correlationId` / `commandId` / `taskId` 结构收敛。
- degraded posture 的具体阈值、risk label 和色阶文案可由 researcher / planner 依据当前 runtime / worker / transport truth 做最小正确设定，但必须满足 D-58-08 至 D-58-11 的 honesty posture。
- 分级确认的最终 UI 形态可由 planner 选择 inline confirm、modal、popover 或 detail-page confirm，只要风险层级和影响提示保持一致。
- `Settings Labs` 汇总入口里的 incident list 默认排序、过滤项、以及 classroom metadata 展示密度，可由 planner 结合现有 route / DTO 约束收敛，但它必须服务于“先找到出问题的课堂”这一目标，而不是退化成工具目录页。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone truth and locked requirements
- `.planning/ROADMAP.md` — Phase 58 的正式 goal、requirements、success criteria 与 phase ordering。
- `.planning/REQUIREMENTS.md` — `PLUG-03`、`OPS-01`、`OPS-02`、`OPS-03`、`SAFE-02` 的 requirement truth。
- `.planning/PROJECT.md` — `v3.1` scope fence、baseline truths、authoritative truth posture 与 out-of-scope。
- `.planning/STATE.md` — 当前 milestone posture，确认 Phase 57 已完成、Phase 58 是下一个 planning target。

### Locked pilot contract and recovery expectations
- `.planning/phases/55-pilot-scope-and-acceptance-gate/55-PILOT-CONTRACT.md` — 锁定 `teacher design -> publish -> launch -> student completion -> teacher/operator verification` 样板链路与 baseline truths。
- `.planning/phases/55-pilot-scope-and-acceptance-gate/55-FAILURE-RECOVERY-MATRIX.md` — 锁定正式 failure taxonomy、owner、operator action、evidence source 以及 fallback / rollback triggers。
- `.planning/phases/55-pilot-scope-and-acceptance-gate/55-PROOF-INVENTORY.md` — Phase 58 必须产出的 operator read-model / recovery actions / degraded posture proof 口径。

### Upstream phase handoff that remains locked
- `.planning/phases/57-classroom-runtime-sample-chain/57-CONTEXT.md` — classroom voting runtime、teacher-visible consequence、当前 round 最小 recovery entrypoints 的锁定边界。
- `.planning/phases/42-operator-visibility-and-recovery/42-CONTEXT.md` — async operator 的 Settings Labs 归属、summary-first posture、risk-tiered recovery 先例。
- `.planning/phases/52-action-registry-plugin-lifecycle-governance/52-CONTEXT.md` — plugin governance 的 executable-vs-diagnostic split、reason-gated recovery、lifecycle truth。

### Existing code anchors and current surfaces
- `src/components/classroom/classroom-control-panel.tsx` — classroom shell 内已存在的当前 round recovery、transport degraded 提示与 runtime inspector deep link。
- `src/actions/classroom-actions.ts` — 当前 voting round recovery action server entrypoint 与 control-chain adapter。
- `src/lib/dto/classroom.ts` — current voting round、transport degraded、classroom snapshot 的 DTO truth。
- `src/lib/dal/runtime-inspector.ts` — runtime inspector 的 scope resolution、timeline assembly、degraded posture 读取与 health summary。
- `src/lib/dto/runtime-inspector.ts` — runtime inspector surface contract、timeline lane 与 health vocabulary。
- `src/app/settings/labs/runtime-inspector/page.tsx` — runtime inspector 当前 route 入口。
- `src/components/surfaces/runtime-inspector-surface.tsx` — single-timeline + degraded honesty 的既有 operator UI 节奏。
- `src/features/async-tasks/server/operator-read-model.ts` — async task operator 的 task/event read seam。
- `src/lib/dto/async-task-operator.ts` — async operator overview/detail、backlog posture、retry eligibility contract。
- `src/app/settings/labs/async-tasks/page.tsx` — async operator overview route。
- `src/components/surfaces/async-task-operator-surface.tsx` — summary-first operator 首页、backlog degraded 卡、problem-task 列表。
- `src/components/surfaces/async-task-operator-detail-surface.tsx` — detail summary -> attempts -> timeline 的既有 operator detail 节奏。
- `src/features/platform-core/observability/operator-read-model.ts` — platform command / event timeline 的现有 operator read model seam。
- `src/components/surfaces/plugin-lifecycle-operator-surface.tsx` — executable action catalog、治理诊断、reason-gated recovery 和 uninstall posture。
- `src/components/surfaces/settings-surface.tsx` — plugin governance 当前挂在 Settings Labs 页面中的入口与信息架构现状。
- `src/app/settings/labs/page.tsx` — Settings Labs 顶层入口，可作为新增 operator 关联入口的宿主。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/classroom/classroom-control-panel.tsx`：已经把 classroom 作为最贴近 incident 的入口，现成拥有 current voting round recovery、transport degraded banner、runtime inspector link，可直接作为 Phase 58 的 classroom-anchored operator entry 起点。
- `src/lib/dal/runtime-inspector.ts` + `src/components/surfaces/runtime-inspector-surface.tsx`：已经有单条时间线、health summary、degraded honesty 卡片和 role-scoped inspect 读取，适合作为 runtime / transport drill-down 面。
- `src/features/async-tasks/server/operator-read-model.ts` + `src/components/surfaces/async-task-operator-surface.tsx`：已经落地 summary-first async operator 首页，可复用 backlog posture、problem tasks、detail drill-down 的 operator rhythm。
- `src/components/surfaces/async-task-operator-detail-surface.tsx`：已经把 detail 定为“摘要 -> attempts -> timeline”，可作为 Phase 58 高风险恢复动作的 detail-level承载先例。
- `src/components/surfaces/plugin-lifecycle-operator-surface.tsx`：已经锁定 executable action catalog 和 blocked diagnostics 分离、recommended recovery action、reason-gated CTA 的治理模式。
- `src/features/platform-core/observability/operator-read-model.ts`：已有 platform command + event timeline 的读取 seam，可用于补齐 classroom incident 到 command lineage 的关联。

### Established Patterns
- operator tooling 在当前仓库中倾向挂在 `Settings Labs` 体系下的专门页面，而不是揉进 teacher 主业务面或做成 generic admin dashboard。
- degraded posture 必须显式告诉 operator 当前不能信任什么、仍可信什么、下一步去哪；runtime inspector 和 async operator 都已经采用这种 honesty posture。
- 恢复动作必须是显式、reason-gated、可审计的；plugin governance 与 async operator 都明确拒绝“默认自动恢复”或无条件 retry。
- canonical truth 仍由 SQLite + DAL / command ledger / task ledger 持有；operator surface 应消费 authoritative read model，而不是直接读 substrate 或浏览器本地状态。
- teacher 课堂壳可以承载当前课堂的最小恢复动作，但跨课堂、跨对象、跨平台排障应落到 operator surfaces，而不是继续把 classroom shell 演化成 operator console。

### Integration Points
- 需要一个新的 classroom/session operator correlation read model，把 `classroomSessionId` 连接到 runtime session、plugin posture、platform command timeline、async task detail。
- 需要在 classroom entry、runtime inspector、async operator、plugin governance 之间补齐 deep links / correlation chips / related incidents，避免 operator 手动复制 ID 多页跳转。
- 需要让 platform command observability 从当前 read seam 进入正式 operator drill-down，而不是停留在“有读模型、缺 product surface”的状态。
- 需要把现有 classroom recovery、plugin recovery、task retry 等动作统一到 risk-tiered confirmation posture，并保持 command / audit trail 一致。
- 需要在 `classroom/session` operator 首屏提供 problem-first incident cards，并把关联对象摘要控制在“状态 + 原因/影响 + 下一跳”的粒度，避免首页直接膨胀成 detail view。
- 需要让 `Settings Labs` 的现有入口既能承接工具索引，也能承接 classroom incident list / recent incidents，形成没有 deep link 时的 support 起点。

</code_context>

<specifics>
## Specific Ideas

- operator 默认从 classroom incident 进入，再根据关联线索跳到 runtime inspector、plugin governance 或 async task detail，而不是先进入平台内部对象视角。
- `Settings Labs` 作为跨课堂排障索引入口时，第一屏优先给 recent classroom incidents，而不是让 operator 先在工具页之间做对象级导航。
- 保持 `runtime inspector`、`async operator`、`plugin governance` 三类 surface 的独立节奏，但用 correlation links 和 classroom/session incident cards 把它们缝合成同一条故障链。
- degraded posture 一律使用固定三段 honesty 模板：`仍可信/不可信 -> 影响范围 -> 推荐下一步`。
- 恢复动作采用风险分级：`retry` / `reconcile` 快速执行；`resume` / `suspend` / `fallback` 只能在 detail view 做重确认，并显式提示影响范围、姿态变化与审计记录。

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 58-Operator Recovery & Production Surfaces*
*Context gathered: 2026-05-25*
