# Phase 42: operator-visibility-and-recovery - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段固定建立在 Phase 39-41 已完成的事实上：async task 的 typed registry、durable
truth、worker runtime、QueueEvents projection、batch import 产品面都已经存在。Phase 42 的职责
不是再证明“任务能不能跑”，也不是把 teacher/staff 的业务页扩成通用任务中心，而是把 async
platform 补成 **可运营、可排障、可安全恢复** 的能力。

Phase 42 只交付四类 operator 能力：

1. 提供 async platform 的 operator 入口，让 admin / developer 能从 settings labs 进入专门
   的 async operator 页面，而不是继续把运维信息塞进 teacher/staff 产品面。
2. 提供平台级健康总览，明确展示 worker connectivity、queue health、backlog posture 与
   degraded status，并把问题任务放到 operator 的待处理视图里。
3. 提供单个 async task 的运行详情页，让 operator 能看到状态摘要、latest error、progress
   snapshot、attempt history、recovery posture 与辅助审计 timeline。
4. 提供显式、安全、可审计的 retry/recovery action，只允许对明确支持 recovery 的 failed
   task 执行恢复，而不是依赖手工 patch 数据。

本阶段不新增 teacher/staff-facing task center，不把 batch import detail 迁移成通用 operator
事实页，也不把 scheduled reminders / event post-processing / resource processing 真 workload
接到平台上；这些属于 Phase 43 或后续 milestone。

</domain>

<decisions>
## Implementation Decisions

### Operator 入口与页面归属
- **D-42-01:** Phase 42 的 async operator 能力固定挂在 `Settings Labs` 体系内，而不是另起独立产品域。
- **D-42-02:** async operator 采用独立子页承载，规划为类似 `/settings/labs/async-tasks` 的专门页面；不并入现有 `runtime-inspector` 页面，也不只做 settings 首页局部卡片。
- **D-42-03:** 该 operator 页面默认面向 `admin + developer` 角色；数据仍按学校范围与角色范围裁切，不做 school 之外的全局暴露。
- **D-42-04:** async operator 首页第一屏必须先回答“平台当前是否健康”，优先于 workload 业务细节或任务族分区。

### 健康总览与问题任务首页
- **D-42-05:** 首页主结构固定为“平台健康 + 问题任务”两段式：上半部分看 worker / queue / degraded / backlog posture，下半部分直接列出需要 operator 处理的任务。
- **D-42-06:** backlog posture 不只显示原始计数，必须做风险分层表达，让 operator 一眼看出是正常、堆积还是异常，而不是自己读数字判断。
- **D-42-07:** 若 worker 断连、queue 不可用或平台进入 degraded posture，首页必须像现有 runtime inspector 一样给出显式告警卡，单独说明当前不能信任什么、以及接下来去哪里排查。
- **D-42-08:** 首页里的“问题任务”列表默认按“待处理优先”组织，优先展示 failed、stalled recovery、长期 retrying 等需要人工介入的任务，而不是简单按最近时间倒序。

### 任务详情页的信息层级
- **D-42-09:** 单个 async task 详情页固定采用“状态摘要优先”的信息层级；operator 打开页面后先看当前状态、latest error、recovery posture、最近 progress，再继续下钻 attempts 与 timeline。
- **D-42-10:** 若任务失败，latest error 必须在详情页顶部作为单独错误卡提升呈现，而不是埋在时间线或 attempts 列表中。
- **D-42-11:** attempt history 采用“按 attempt 分组”的产品语义组织，而不是纯事件流；每次尝试应能看见开始、失败、完成与人工 recovery 之间的关系。
- **D-42-12:** progress snapshot 需要直接出现在顶部摘要区，至少包含 progress label、processed/total 或等价结构，以及最近更新时间；operator 不应靠滚动到下方才看到当前推进情况。
- **D-42-13:** timeline 在详情页中是辅助审计轨迹，而不是主判断界面；它主要用于复盘与核对事件，不取代顶部摘要、错误卡与 attempts 分组。

### 安全重试与 recovery 语义
- **D-42-14:** failed task 的 recovery 采用“同一 durable task 内追加新 attempt”的事实模型，不为每次人工 retry 新建第二个任务事实页。
- **D-42-15:** retry CTA 只对 registry 明确声明支持 recovery 的 failed task 展示；不是所有失败任务都默认允许重试。
- **D-42-16:** operator 点击 retry 后，系统必须写入显式的 recovery event，记录谁在何时触发了恢复动作，而不是只把状态静默改回 queued/running。
- **D-42-17:** retry 触发后，任务详情页应立即回到 `queued / retrying` 这类诚实状态，明确告诉 operator 当前已经进入恢复流程，而不是继续伪装成 terminal failed。
- **D-42-18:** retry 交互采用“轻确认后执行”模式：在执行前明确说明会追加新 attempt 并写 recovery event，但不强制 operator 填写长文本说明。

### the agent's Discretion
- async operator 子页的精确 route segment、导航文案与 labs 入口卡片名称，可由 planner 结合现有 `settings-surface.tsx` 与 `/settings/labs` 路由结构做最小正确收敛，但必须保持“Settings Labs 下的独立 operator 子页”这一定位。
- 风险分层的具体阈值与 label（例如 queued backlog 多大算 warning / critical）可由 researcher / planner 根据现有 async ledger 字段和 workload 规模收敛，但必须输出明确的 operator-facing posture，而不是裸数字。
- 详情页最终采用单栏、双栏或摘要 + 下钻 section 的具体布局可由 planner 结合 `runtime-inspector-surface.tsx` 与现有 teacher surface rhythm 收敛，但信息层级已锁定，不能让 timeline 抢主位。
- 轻确认交互的精确 UI 形态可由 planner 选择 modal、popover confirm 或等价安全确认模式，但必须在执行前明确“追加新 attempt + 写 recovery event”的语义。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone truth
- `.planning/ROADMAP.md` — Phase 42 的正式 goal、requirements、success criteria 与 3 个 plan 槽位。
- `.planning/REQUIREMENTS.md` — `ATP-15`、`ATP-16`、`ATP-17`、`ATP-18` 的 requirement truth。
- `.planning/PROJECT.md` — v2.3 Async Task Platform 的总体边界，以及 SQLite + DAL truth、非 big-bang rewrite 等非协商约束。
- `.planning/STATE.md` — 当前 milestone / phase 状态，确认 Phase 41 已完成、Phase 42 为下一步。

### Locked upstream decisions
- `.planning/phases/39-async-contracts-and-durable-task-truth/39-CONTEXT.md` — visibility scope、durable truth、enqueue honesty、partial success platform posture 已锁定。
- `.planning/phases/40-bullmq-infra-seam-and-worker-reliability-posture/40-CONTEXT.md` — worker 独立进程、QueueEvents durable projection、retry/idempotency/recovery posture 的平台边界已锁定。
- `.planning/phases/41-first-real-product-slice-batch-import-async-workflow/41-CONTEXT.md` — teacher/staff-facing async product surface 已锁定为业务实体页 truth，不应被 Phase 42 替代。

### Existing operator / settings anchors
- `src/components/surfaces/settings-surface.tsx` — settings 与 labs 入口的既有产品语言、管理权限入口与显式 degraded/system posture 表达方式。
- `src/app/settings/labs/runtime-inspector/page.tsx` — labs 子页的当前 page 组织方式，可直接类比新的 async operator route。
- `src/components/surfaces/runtime-inspector-surface.tsx` — hero + health metrics + degraded alert + timeline 的既有 operator surface 参考。
- `src/lib/dal/runtime-inspector.ts` — admin / developer / teacher 范围解析、session-scoped inspect 读取与 timeline 组装模式。
- `src/lib/dal/system-transport-settings.ts` — developer / super_admin 管理能力、健康探测、deploy status 与 degraded posture 的 DTO 组织方式。

### Async platform anchors
- `src/lib/dal/async-tasks.ts` — actor/entity/detail 三种读取面，包含 `getAsyncTaskDetailDTO()`、task list、history 读取缓存边界。
- `src/features/async-tasks/shared/dto.ts` — `AsyncTaskDetailDTO` 已包含 queueJobId、failure、recovery、attempts、history 等 Phase 42 直接复用的字段基底。
- `src/features/async-tasks/shared/contract.ts` — async task status、visibility、progress、result 与 retrying/stalled recovery vocabulary 的平台 truth。
- `src/features/async-tasks/infra/queue-events.ts` — queued/running/retrying/stalled recovery 等状态投影与 cache invalidation 锚点。
- `src/features/async-tasks/server/registry.ts` — task definition / reliability metadata 的声明入口，Phase 42 的 retry eligibility 需要以此为源头。

### Recovery action reference
- `src/features/schedule/reminders/server.ts` — 一个现成的显式 retry server action / audit 先例，可帮助规划 Phase 42 的 recovery action posture。
- `src/features/schedule/reminders/actions.ts` — server action 包装、错误处理与 tag invalidation 的当前仓库写法。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/surfaces/settings-surface.tsx`：已经有 `/settings` 到 `/settings/labs` 的系统运维入口语言，适合挂新的 async operator 入口而不破坏现有 IA。
- `src/components/surfaces/runtime-inspector-surface.tsx`：已有 health metrics、degraded alert、timeline 这三种关键 operator 呈现部件，可直接迁移视觉和信息节奏。
- `src/lib/dal/async-tasks.ts`：已提供 actor list、entity list、detail 读取面，并天然符合 SQLite + cacheTag 的 truth discipline。
- `src/features/async-tasks/shared/dto.ts`：`AsyncTaskDetailDTO` 已经承载 failure、recovery、attempt history、history event，不需要重新发明第二套详情 DTO。
- `src/features/schedule/reminders/server.ts`：已有 retry action + audit 的轻量 recovery 样板，可为 Phase 42 的 operator retry 提供语义先例。

### Established Patterns
- 项目里的 operator / system 能力倾向挂在 settings labs 或独立 inspector 页面，不与 teacher 主业务页混写。
- degraded posture 必须显式暴露，不能只靠日志或隐含 badge；transport settings 与 runtime inspector 都已验证了这一点。
- 应用表面必须消费 DAL / DTO truth，而不是直读外部 substrate；Phase 42 的 operator 页面也必须延续这一模式。
- timeline 在现有 inspector 中已经是复盘轨迹，而非唯一判断面；这和本次锁定的“摘要优先”信息层级一致。

### Integration Points
- 需要新增 settings labs 下的 async operator page / route，并接入现有 settings navigation 体系。
- 需要扩展 async task DAL / DTO，把首页健康总览、问题任务列表、详情页摘要与 retry eligibility 组织成 operator-facing read models。
- 需要在 async task server / action 层新增显式 recovery action，并把 recovery event、attempt append、cache invalidation 一并收口。
- 需要把 registry 中的 reliability / recovery metadata 明确暴露给 operator 层，支撑“仅显式可重试任务”这一产品规则。

</code_context>

<specifics>
## Specific Ideas

- async operator 放在 Settings Labs 下的独立子页，和现有 runtime inspector 平行，而不是嵌入 teacher 业务页或直接混到 runtime inspector。
- async operator 首页先给平台健康与 degraded posture，再给问题任务待办队列，不做 workload-first 的首页。
- task detail 页固定先看状态摘要、latest error、progress snapshot，再看 attempts，最后看 timeline 审计轨迹。
- retry recovery 保持同一 durable task 详情页连续性：operator 追加新 attempt，页面立即回到 queued / retrying，并单独写 recovery event。

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 42-operator-visibility-and-recovery*
*Context gathered: 2026-05-19*
