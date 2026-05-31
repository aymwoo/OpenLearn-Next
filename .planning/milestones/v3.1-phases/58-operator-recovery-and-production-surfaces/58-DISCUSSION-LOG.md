# Phase 58: Operator Recovery & Production Surfaces - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 58-operator-recovery-and-production-surfaces
**Areas discussed:** 课堂入口与导航锚点, 关联读模型的范围, Degraded honesty 口径, 恢复动作与确认分级

---

## 课堂入口与导航锚点

### 问题 1: incident 默认从哪里进入

| Option | Description | Selected |
|--------|-------------|----------|
| 课堂页主入口 | 默认从 classroom/session 进入，看到 incident 摘要后再跳 runtime inspector / async tasks / plugin governance。 | ✓ |
| Settings Labs 主入口 | 默认先到 `/settings/labs` 或其子页，再手动检索 classroom/session。 | |
| 双入口平权 | 课堂页和 Settings Labs 都当一等入口，不设主次。 | |

**User's choice:** 课堂页主入口
**Notes:** operator/support 的默认心智必须先回答“这堂课发生了什么”。

### 问题 2: Settings Labs 的角色

| Option | Description | Selected |
|--------|-------------|----------|
| 汇总索引入口 | Labs 继续保留，但主要做 operator 工具索引、最近 incident 列表和跨课堂跳转。 | ✓ |
| 完整主控台 | Labs 承载完整 operator 首页和主工作台。 | |
| 仅工具目录 | Labs 只列出工具入口，不承载 incident 索引。 | |

**User's choice:** 汇总索引入口
**Notes:** Labs 不能反客为主，但要承接没有 deep link 时的跨课堂排障入口。

### 问题 3: 课堂页入口的显性程度

| Option | Description | Selected |
|--------|-------------|----------|
| 稳定入口 + 故障时升格 | 平时保留稳定入口；故障时升格成更显眼 incident CTA。 | ✓ |
| 仅故障时出现 | 只有 degraded / failed / blocked posture 时显示。 | |
| 始终高显眼 | 始终做成显眼主按钮。 | |

**User's choice:** 稳定入口 + 故障时升格
**Notes:** 既要形成稳定心智，也不能把 teacher 壳改造成 operator console。

### 问题 4: Labs 没有 deep link 时如何找到课堂

| Option | Description | Selected |
|--------|-------------|----------|
| 按课堂 incident 列表 | 先给最近/活跃/异常课堂 incident 列表，再点进具体 classroom/session。 | ✓ |
| 按筛选检索课堂 | 先按 school / class / lesson version / session id 检索。 | |
| 按工具分类先选页 | 先选 runtime inspector / async tasks / plugin governance，再各自查找。 | |

**User's choice:** 按课堂 incident 列表
**Notes:** support 起点应贴近真实 incident，而不是对象导航。

---

## 关联读模型的范围

### 问题 1: classroom/session 首屏带出多大范围

| Option | Description | Selected |
|--------|-------------|----------|
| 摘要优先，相关对象可下钻 | 首屏展示 classroom/session 概况、lesson version、degraded posture、latest command/task/plugin 摘要与相关入口。 | ✓ |
| 尽量一次看全 | 首屏直接展开 command lineage、problem tasks、plugin posture、timeline 细节。 | |
| 最轻首屏 | 首屏只给课堂摘要和 related links。 | |

**User's choice:** 摘要优先，相关对象可下钻
**Notes:** 首屏不应膨胀成 giant detail page。

### 问题 2: 首屏固定摘要块

| Option | Description | Selected |
|--------|-------------|----------|
| 课堂态 + degraded + 关联对象摘要 | 展示 classroom/session 状态、影响中的 degraded posture、lesson version / runtime session / plugin posture / latest command / problem tasks 摘要。 | ✓ |
| 课堂态 + 时间线优先 | 课堂态之后立刻给 timeline。 | |
| 课堂态 + 恢复动作优先 | 课堂态之后先给 recovery actions。 | |

**User's choice:** 课堂态 + degraded + 关联对象摘要
**Notes:** operator 首屏先做 triage，再做动作或深挖。

### 问题 3: 下钻组织方式

| Option | Description | Selected |
|--------|-------------|----------|
| 按当前问题组织 | 先看到当前问题卡或 incident 卡，每张卡再指向相关 runtime / plugin / command / task detail。 | ✓ |
| 按对象类型组织 | 首屏直接分 Runtime / Plugin / Command / Task 四块。 | |
| 两者都放首屏 | incident cards 和对象分区一起放首屏。 | |

**User's choice:** 按当前问题组织
**Notes:** support 排障优先围绕当前问题，而不是平台对象分类。

### 问题 4: 关联对象摘要粒度

| Option | Description | Selected |
|--------|-------------|----------|
| 状态 + 原因 + 下一跳 | 每个对象只给当前状态、关键 reason/impact、一条明确 next link。 | ✓ |
| 状态 + 最近事件 | 再多给最近一次事件/attempt/timestamp。 | |
| 状态标签即可 | 只给状态标签和名称。 | |

**User's choice:** 状态 + 原因 + 下一跳
**Notes:** 首页要足够判断去哪里，但不展开 full attempts/timeline。

---

## Degraded honesty 口径

### 问题 1: degraded 首先回答什么

| Option | Description | Selected |
|--------|-------------|----------|
| 哪些 truth 仍可信、哪些已不可信 | 先交代 trust boundary，再谈原因和动作。 | ✓ |
| 受影响范围 | 先说影响了当前课堂还是多课堂/平台。 | |
| 建议动作 | 先告诉 operator 现在该点什么。 | |

**User's choice:** 哪些 truth 仍可信、哪些已不可信
**Notes:** honesty 的第一责任是先讲清 trust boundary。

### 问题 2: 第二层信息

| Option | Description | Selected |
|--------|-------------|----------|
| 影响范围 | 继续说明是当前 classroom、同 school 多课堂，还是平台级问题。 | ✓ |
| 建议动作 | 直接给 operator 下一步。 | |
| 原因细节 | 先展开技术原因/指标细节。 | |

**User's choice:** 影响范围
**Notes:** 先 triage，再决定是否立即介入。

### 问题 3: 第三层信息

| Option | Description | Selected |
|--------|-------------|----------|
| 推荐下一步 | 告诉 operator 去哪个 detail 页、是否需要立即介入、是否可先观察。 | ✓ |
| 技术细节展开 | 直接展开 metric、attempt、timeline 细节。 | |
| 相关恢复动作 | 直接把 CTA 提到第三层最前。 | |

**User's choice:** 推荐下一步
**Notes:** production surface 先提供正确下一步，而不是立刻淹没在技术细节里。

### 问题 4: 跨 posture 的统一方式

| Option | Description | Selected |
|--------|-------------|----------|
| 固定三段模板 | 所有 posture 都按 `仍可信/不可信 -> 影响范围 -> 推荐下一步` 输出。 | ✓ |
| 大体一致，允许各页自由发挥 | 只要求信息齐全，顺序可变。 | |
| 按 posture 类型分模板 | transport / worker / plugin 各用各的模板。 | |

**User's choice:** 固定三段模板
**Notes:** 不允许跨页出现不同 honesty 节奏，避免 operator 认知分裂。

---

## 恢复动作与确认分级

### 问题 1: 哪些动作属于轻确认

| Option | Description | Selected |
|--------|-------------|----------|
| 仅 retry / reconcile | 只有局部、可重试的动作走轻确认。 | ✓ |
| retry / reconcile / resume | 把 `resume` 也视作较轻动作。 | |
| 所有动作都轻确认 | 所有 recovery action 都走 quick confirm。 | |

**User's choice:** 仅 retry / reconcile
**Notes:** `resume` 也算会改变运行姿态的高风险动作，不能留在 quick path。

### 问题 2: 高风险动作确认层的强制信息

| Option | Description | Selected |
|--------|-------------|----------|
| 影响范围 + 姿态变化 + 审计记录 | 明确影响哪些课堂/对象、姿态怎么变、并写 recovery audit/command history。 | ✓ |
| 技术原因 + 目标状态 | 更强调为什么这样做、做完会变成什么。 | |
| 只显示目标动作说明 | 只说将执行什么。 | |

**User's choice:** 影响范围 + 姿态变化 + 审计记录
**Notes:** 高风险动作必须显式交代 blast radius 和会留下的审计痕迹。

### 问题 3: 动作不可执行时的表现

| Option | Description | Selected |
|--------|-------------|----------|
| 显示禁用原因 + 正确下一步 | 按钮可见但 reason-gated，解释为什么不能做，并指向正确入口。 | ✓ |
| 直接隐藏按钮 | 界面更干净，但 operator 不知道系统本来支持该动作。 | |
| 允许点击后再报错 | 点击执行后再告诉用户不安全。 | |

**User's choice:** 显示禁用原因 + 正确下一步
**Notes:** 不可执行也要保持“可理解”，不能做假动作或隐形能力。

### 问题 4: 高风险动作在哪里确认

| Option | Description | Selected |
|--------|-------------|----------|
| 进入相关 detail 页后确认 | 首屏只提示可执行和风险，真正确认放到关联 detail 页。 | ✓ |
| 首屏直接确认 | 在 classroom/session 首屏直接完成重确认。 | |
| 两处都能确认 | 首屏和 detail 页都能执行重确认。 | |

**User's choice:** 进入相关 detail 页后确认
**Notes:** 上下文完整度优先于首屏操作速度。

---

## the agent's Discretion

- classroom-anchored operator route 的精确 URL 命名。
- classroom incident list 的默认排序、过滤项与 metadata 密度。
- degraded posture 的具体阈值、risk label 和视觉色阶文案。
- 轻确认与重确认最终采用 inline confirm、modal、popover 还是 detail-page confirm 的具体 UI 载体。

## Deferred Ideas

None — discussion stayed within phase scope.
