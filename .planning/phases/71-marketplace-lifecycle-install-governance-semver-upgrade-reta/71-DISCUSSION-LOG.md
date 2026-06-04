# Phase 71: Marketplace Lifecycle - Install Governance, Semver Upgrade & Retain/Cleanup Uninstall - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-04
**Phase:** 71-marketplace-lifecycle-install-governance-semver-upgrade-reta
**Areas discussed:** 目录与安装入口, 升级体验与闸门, 卸载与重装恢复, Active课堂冲突处理

---

## 目录与安装入口

| Option | Description | Selected |
|--------|-------------|----------|
| 同页双分区 | 同一个 marketplace 页面，先显示内置，再显示 external。 | ✓ |
| 单目录混排 | 内置和 external 混在同一列表里，用 badge 区分来源。 | |
| 独立 external 子页 | `/settings/plugins` 保留内置，external 另开子页或 tab。 | |

**User's choice:** 同页双分区
**Notes:** 用户希望保留一个统一入口，不把 marketplace 拆散。

| Option | Description | Selected |
|--------|-------------|----------|
| 治理摘要优先 | 先看版本、权限、声明的数据表/命名空间、来源类型，再点安装进入预检结果。 | ✓ |
| 一步安装优先 | 卡片直接给安装按钮，失败后再展示冲突/校验原因。 | |
| 详情抽屉优先 | 卡片只显示简版，点开抽屉再看详情和预检结论。 | |

**User's choice:** 治理摘要优先
**Notes:** 安装判断应先基于治理风险，而不是试错。

| Option | Description | Selected |
|--------|-------------|----------|
| 卡片内联拒因 | 直接在插件卡片内显示具名拒因，并保留重试入口。 | ✓ |
| 全局 toast + 日志 | 页面上只弹错误提示，详细原因去别处看。 | |
| 独立预检结果页 | 安装失败后跳到单独结果页。 | |

**User's choice:** 卡片内联拒因
**Notes:** 反馈应贴近当前操作对象。

| Option | Description | Selected |
|--------|-------------|----------|
| 运营控制台 | 强调治理、风险、版本、数据影响。 | |
| 应用商店 | 强调插件介绍和可发现性。 | ✓ |
| 教研资源库 | 强调教学价值和课堂用途。 | |

**User's choice:** 应用商店
**Notes:** 风格可以像商店，但不能滑向运营层 scope。

---

## 升级体验与闸门

| Option | Description | Selected |
|--------|-------------|----------|
| 先看升级预检 | 先看版本差异、数据迁移范围、风险与阻断项，再确认执行。 | ✓ |
| 直接升级按钮 | 像普通应用商店一样直接点升级。 | |
| 版本详情页 | 先进入单独详情页，再决定是否升级。 | |

**User's choice:** 先看升级预检
**Notes:** 升级不应被包装成轻量即时动作。

| Option | Description | Selected |
|--------|-------------|----------|
| 数据影响与阻断优先 | 先告诉 operator 是否有真实作答数据、会跑哪些迁移阶段、有没有 blocker。 | ✓ |
| 版本变更说明优先 | 先展示 changelog 和新功能。 | |
| 技术细节优先 | 先展示 dataVersion、迁移脚本、校验明细。 | |

**User's choice:** 数据影响与阻断优先
**Notes:** 首屏必须帮助 operator 判断能不能升，而不是想不想升。

| Option | Description | Selected |
|--------|-------------|----------|
| 分阶段进度 | 明确显示 backfill -> verify -> cutover 三阶段进度。 | ✓ |
| 单进度条 | 只显示“升级中...”。 | |
| 后台任务通知 | 点击后异步执行，用户离开页面。 | |

**User's choice:** 分阶段进度
**Notes:** 失败必须停在具体阶段，便于解释与审计。

| Option | Description | Selected |
|--------|-------------|----------|
| 停留旧版本并标记失败 | 旧版本继续可用，新版本不 cutover。 | ✓ |
| 进入半升级待修复 | 保留中间态，要求 operator 再决策。 | |
| 自动重试一次后再决定 | 系统先自救一次，再回显。 | |

**User's choice:** 停留旧版本并标记失败
**Notes:** 用户明确偏向 rollback-safe posture。

---

## 卸载与重装恢复

| Option | Description | Selected |
|--------|-------------|----------|
| 默认 retain | 主按钮默认“停用并保留数据”。 | ✓ |
| 先二选一 | 一上来就先选 retain 或 cleanup。 | |
| 默认 cleanup | 默认做彻底删除。 | |

**User's choice:** 默认 retain
**Notes:** 与 requirement 中的 retain-first 保持一致。

| Option | Description | Selected |
|--------|-------------|----------|
| 影响面计数 + token | 先展示将删除多少作答、影响多少复盘，再要求 token。 | ✓ |
| 风险文案优先 | 先给大段危险提示。 | |
| 仅 token 确认 | 只要求输入 token。 | |

**User's choice:** 影响面计数 + token
**Notes:** 危险感来自真实影响面，而不是抽象警告。

| Option | Description | Selected |
|--------|-------------|----------|
| 恢复提示 + 历史接管 | 明确提示“已接管保留数据”。 | ✓ |
| 看起来像普通升级 | 弱化重装概念。 | |
| 必须手动选择恢复 | 还要再点一次“接管旧数据”。 | |

**User's choice:** 恢复提示 + 历史接管
**Notes:** 重装与恢复需要被诚实表达，而不是伪装成普通版本变更。

| Option | Description | Selected |
|--------|-------------|----------|
| 已卸载但可恢复 | 仍可见，但明显不是运行中。 | ✓ |
| 已停用 | 和普通 disabled 差不多。 | |
| 隐藏出主目录 | 只在历史记录里可见。 | |

**User's choice:** 已卸载但可恢复
**Notes:** 用户希望 recovery 的可发现性保留在目录主视图中。

---

## Active课堂冲突处理

| Option | Description | Selected |
|--------|-------------|----------|
| 硬阻断并解释原因 | 直接阻止升级，明确提示进行中课堂占用。 | ✓ |
| 允许排队延后 | 现在登记，课堂结束后自动执行。 | |
| 允许强制升级 | 给高权限用户强制入口。 | |

**User's choice:** 硬阻断并解释原因
**Notes:** 对真实课堂作答链路优先求稳。

| Option | Description | Selected |
|--------|-------------|----------|
| 是，统一硬阻断 | 升级和卸载都用同一冲突语义。 | ✓ |
| 升级阻断，retain可放行 | 允许 retain 卸载继续。 | |
| 卸载更宽松 | 只阻断 cleanup。 | |

**User's choice:** 是，统一硬阻断
**Notes:** 用户不希望 operator 面对两套不同冲突规则。

| Option | Description | Selected |
|--------|-------------|----------|
| 哪几个课堂正在占用 | 优先展示受影响课堂/会话。 | ✓ |
| 只说当前不可操作 | 给通用错误。 | |
| 先给恢复建议 | 先说“请先结束课堂”。 | |

**User's choice:** 哪几个课堂正在占用
**Notes:** 先告诉 operator 具体冲突对象，才能行动。

| Option | Description | Selected |
|--------|-------------|----------|
| 查看受影响课堂 + 稍后重试 | 给出查看课堂和回头重试的后续动作。 | ✓ |
| 自动订阅完成后提醒 | 系统记住意图，结束后提醒。 | |
| 申请强制执行 | 提供 override 流程。 | |

**User's choice:** 查看受影响课堂 + 稍后重试
**Notes:** 用户不要自动排队，也不要危险 override。

---

## the agent's Discretion

- dual-section marketplace 的具体版式和 summary 字段视觉层级可由规划阶段决定。
- retain 恢复提示、badge 和 CTA wording 可由 UI 规划阶段细化。

## Deferred Ideas

- 自动排队等课堂结束后执行升级/卸载
- 被阻断后自动订阅提醒
- destructive 操作 override / 强制执行
- 商店运营层功能（计费、评分、开发者门户、自动审核）
