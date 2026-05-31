# Phase 42: operator-visibility-and-recovery - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-19
**Phase:** 42-operator-visibility-and-recovery
**Areas discussed:** 运维入口放在哪里, 安全重试的产品语义, 任务详情页的信息层级, 健康总览看板看什么粒度

---

## 运维入口放在哪里

| Option | Description | Selected |
|--------|-------------|----------|
| 挂到 Settings Labs（推荐） | 复用现有 /settings、runtime-inspector、degraded/system 运维语气，最符合当前产品结构 | ✓ |
| 独立 Async 页面 | 给 async tasks 单独入口和页面层级，更像独立运营工作台 | |
| 双入口 | Settings 里有入口，同时保留一个可直达的独立 async 页面 | |

**User's choice:** 挂到 Settings Labs（推荐）
**Notes:** 希望延续现有运维入口语言，不再新起一套产品域。

| Option | Description | Selected |
|--------|-------------|----------|
| 独立子页（推荐） | 用单独的 `/settings/labs/async-tasks` 页面，延续 labs 导航，但不把 async 信息塞进现有 runtime inspector | ✓ |
| 并入 Runtime Inspector | 直接合并到 `/settings/labs/runtime-inspector`，把 transport 和 async 放在同一运维页 | |
| 留在 Settings 首页 | 不做独立子页，只在 `/settings` 或 `/settings/labs` 里增加 async 卡片和局部操作 | |

**User's choice:** 独立子页（推荐）
**Notes:** 希望是 labs 下平行于 runtime inspector 的专门页。

| Option | Description | Selected |
|--------|-------------|----------|
| admin+developer（推荐） | 延续现有 settings / inspector 的运维口径，让 school admin 和 developer 都能看，但数据按学校范围裁切 | ✓ |
| 仅 developer | 把 async operator 完全视为平台维护能力，不开放给学校 admin | |
| 分角色两套页 | developer 和 admin 看到不同页面与能力，产品面区分更强但实现更重 | |

**User's choice:** admin+developer（推荐）
**Notes:** operator 页面默认给 admin 与 developer 看，不做双套产品面。

| Option | Description | Selected |
|--------|-------------|----------|
| 平台健康（推荐） | 先看 worker connectivity、queue health、backlog posture、degraded status，再下钻任务 | ✓ |
| 失败任务 | 先把需要处理的 failed / stalled / retrying 任务列出来，偏故障处理台 | |
| 按任务族分组 | 先按 batch import、reminders 等 workload 展示各自状态，偏业务视角 | |

**User's choice:** 平台健康（推荐）
**Notes:** 首页先回答“平台是否健康”。

---

## 安全重试的产品语义

| Option | Description | Selected |
|--------|-------------|----------|
| 同任务内新 attempt（推荐） | 保留同一个 durable task 详情页，在 attempts/history 里追加一次 retry attempt，最利于 operator 连续排障 | ✓ |
| 新建 recovery task | 每次 retry 都创建新的 async task 记录，旧任务只保留失败事实 | |
| 按任务类型决定 | 有些任务同任务重试，有些任务新建任务，交给 registry 或 planner 细分 | |

**User's choice:** 同任务内新 attempt（推荐）
**Notes:** 希望 recovery 仍保持同一任务事实页连续性。

| Option | Description | Selected |
|--------|-------------|----------|
| 仅显式可重试任务（推荐） | 只有 registry 明确声明支持 recovery 的 failed task 才显示 retry action，避免误重试 | ✓ |
| 所有 failed task | 只要失败就允许 operator 点击 retry，由服务端再做拦截 | |
| failed+stalled | 对 failed 和 stalled_recovery 都默认给 retry 入口 | |

**User's choice:** 仅显式可重试任务（推荐）
**Notes:** 不希望对所有失败任务都裸露 retry CTA。

| Option | Description | Selected |
|--------|-------------|----------|
| 显式 recovery event（推荐） | 在任务 timeline / audit 里单独记录 operator retry，保留谁触发、何时触发、为何触发 | ✓ |
| 只更新状态 | 只把状态改回 queued 或 retrying，不单独强调人工 recovery | |
| 同时写 operator note | 除 recovery event 外，还要求 operator 填一段说明后再执行 | |

**User's choice:** 显式 recovery event（推荐）
**Notes:** 要求 recovery 动作是可审计的显式事件。

| Option | Description | Selected |
|--------|-------------|----------|
| queued / retrying（推荐） | 立刻诚实显示任务已进入恢复流程，后续再由 worker / QueueEvents 推进 | ✓ |
| 保留 failed 直到 pickup | 等 worker 真正 active 后再改状态，最保守但反馈更慢 | |
| 单独 recovery_pending | 增加专门人工恢复中状态，和自动 retry 区分更明显 | |

**User's choice:** queued / retrying（推荐）
**Notes:** 页面应即时反映恢复流程已经开始。

| Option | Description | Selected |
|--------|-------------|----------|
| 轻确认后执行（推荐） | 弹一次确认，说明会追加新 attempt 并写 recovery event，然后执行 | ✓ |
| 直接执行 | 不弹确认，点击即触发 retry | |
| 确认+填写原因 | 除了确认，还要求输入此次 recovery 的人工说明 | |

**User's choice:** 轻确认后执行（推荐）
**Notes:** 需要轻确认，但不引入重型表单。

---

## 任务详情页的信息层级

| Option | Description | Selected |
|--------|-------------|----------|
| 状态摘要优先（推荐） | 先看当前状态、latest error、recovery posture、最近进度，再继续下钻 attempts/timeline | ✓ |
| 完整时间线优先 | 一进入先给 unified timeline，让 operator 自己从事件流读结论 | |
| 左右双栏 | 左边摘要、右边时间线，同时展示但信息密度更高 | |

**User's choice:** 状态摘要优先（推荐）
**Notes:** 详情页首先要给结论，再给证据。

| Option | Description | Selected |
|--------|-------------|----------|
| 顶部单独错误卡（推荐） | 紧跟状态摘要后，显式告诉 operator 为什么失败、是否可重试 | ✓ |
| 嵌入时间线首条 | 不做单独 error card，把错误留在 timeline 事件里 | |
| attempt 区块顶部 | 把错误主要和 attempts 放在一起，默认不单独提升 | |

**User's choice:** 顶部单独错误卡（推荐）
**Notes:** latest error 需要被明确提升，而不是埋在下钻结构中。

| Option | Description | Selected |
|--------|-------------|----------|
| 按 attempt 分组（推荐） | 每次尝试一块，展示开始/失败/完成/恢复动作，最适合排障 | ✓ |
| 纯事件流 | 不强调第几次尝试，只保留时间序事件 | |
| 最新 attempt 单独突出 | 最新尝试展开，旧 attempts 折叠成摘要 | |

**User's choice:** 按 attempt 分组（推荐）
**Notes:** operator 需要按尝试轮次理解问题，而不是只看事件流。

| Option | Description | Selected |
|--------|-------------|----------|
| 摘要区直接展示（推荐） | 在顶部摘要里直接放 progress label、processed/total、last updated，operator 不用滚动就能看到 | ✓ |
| 只在 attempt 内展示 | progress 主要属于每次执行尝试，顶部不单列 | |
| 摘要+attempt 都有 | 顶部展示最近快照，同时在每个 attempt 里保留细节 | |

**User's choice:** 摘要区直接展示（推荐）
**Notes:** progress 是当前态的一部分，应与摘要并列出现。

| Option | Description | Selected |
|--------|-------------|----------|
| 辅助审计轨迹（推荐） | 主要用于复盘和核对事件，主判断还是靠摘要、error、attempts | ✓ |
| 主排障界面 | operator 主要靠 timeline 判断问题，其它区块只是补充 | |
| 仅展开查看 | 默认折叠，只有需要时才展开完整 timeline | |

**User's choice:** 辅助审计轨迹（推荐）
**Notes:** timeline 是审计和复盘工具，不是详情页主结构。

---

## 健康总览看板看什么粒度

| Option | Description | Selected |
|--------|-------------|----------|
| 平台健康 + 问题任务（推荐） | 顶部先看 worker / queue / degraded / backlog，下面紧接 failed、retrying、stalled 等需要处理的任务 | ✓ |
| 纯平台健康 | 只做平台态和总量，不在首页直接列任务 | |
| 按 workload 分区 | 首页先按 batch import、reminders 等任务族拆区看健康 | |

**User's choice:** 平台健康 + 问题任务（推荐）
**Notes:** 首页同时回答“平台怎么样”和“我现在该处理什么”。

| Option | Description | Selected |
|--------|-------------|----------|
| 风险分层（推荐） | 直接告诉 operator 正常/堆积/异常，而不是只报数字 | ✓ |
| 原始计数 | 只展示 queued、running、failed 数量，让 operator 自己判断 | |
| 趋势为主 | 更强调过去一段时间 backlog 变化，而不是当前快照 | |

**User's choice:** 风险分层（推荐）
**Notes:** backlog posture 需要被产品化成 operator 可直接理解的风险状态。

| Option | Description | Selected |
|--------|-------------|----------|
| 显式告警卡（推荐） | 像 runtime-inspector 一样单独高亮，直接说明当前不能信任什么、该去哪里排查 | ✓ |
| 融入 metric badge | 只在指标卡里用 badge 标红，不单独拉出告警区 | |
| 只放任务列表顶部 | 不做全局告警，等用户滚到问题任务区再看到 | |

**User's choice:** 显式告警卡（推荐）
**Notes:** degraded posture 需要独立提升，不应淹没在普通指标中。

| Option | Description | Selected |
|--------|-------------|----------|
| 待处理优先（推荐） | failed、stalled_recovery、长期 retrying 的任务优先排前，像 operator 待办队列 | ✓ |
| 最近异常优先 | 按最近发生时间排序，更像异常事件流 | |
| 按严重度分组 | 先分 degraded / blocked / recoverable，再看每组里的任务 | |

**User's choice:** 待处理优先（推荐）
**Notes:** 问题任务列表更像 operator 待办，而不是简单日志流。

---

## the agent's Discretion

- async operator 子页的精确路由名、导航标题与入口文案
- backlog 风险分层的具体阈值与标签
- 详情页最终单栏/双栏版式与轻确认交互组件形态

## Deferred Ideas

None.
