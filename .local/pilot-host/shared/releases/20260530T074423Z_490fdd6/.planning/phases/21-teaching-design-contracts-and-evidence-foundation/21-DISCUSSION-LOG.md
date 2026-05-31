# Phase 21: teaching-design-contracts-and-evidence-foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-12
**Phase:** 21-teaching-design-contracts-and-evidence-foundation
**Areas discussed:** 教学元数据深度, 证据期待的结构, 课堂时间线粒度, 旧课时兼容策略

---

## 教学元数据深度

### 元数据深度

| Option | Description | Selected |
|--------|-------------|----------|
| 固定四字段(推荐) | 只先锁 `activityIntent` / `estimatedMinutes` / `activityMode` / `evidenceExpectation` 四类字段 | |
| 少数字段+规则推断 | 只补少量字段，其余继续按 step type 推断 | |
| 四字段+更多教学语义 | 四字段之外继续预留更丰富教学语义 | ✓ |

**User's choice:** 四字段+更多教学语义
**Notes:** 用户希望 Phase 21 不只是补最薄的一层字段，而是让 step 具备更真实的教学设计语义，但仍不更换现有线性步骤模型。

### 时长表达

| Option | Description | Selected |
|--------|-------------|----------|
| 单个分钟数(推荐) | 用一个整数分钟数表达时长 | ✓ |
| 时长区间 | 用范围表达，例如 5-8 分钟 | |
| 继续自动推断 | 继续只按 step type 规则推断 | |

**User's choice:** 单个分钟数(推荐)
**Notes:** 用户希望后续 preview、launch 和 analytics 能直接消费稳定数值。

### 活动方式合同

| Option | Description | Selected |
|--------|-------------|----------|
| 受限枚举(推荐) | 固定选项，便于统一 UI 和统计 | ✓ |
| 自由文本 | 教师自己写活动方式 | |
| 枚举+其他 | 固定选项加补充说明 | |

**User's choice:** 受限枚举(推荐)
**Notes:** 用户明确偏向 typed contract，而不是自由文本漂移。

### 首发消费面

| Option | Description | Selected |
|--------|-------------|----------|
| 编辑器+预览+开课预览(推荐) | 先进入 teacher authoring / preview / launch preview | ✓ |
| 仅编辑器内可见 | 先只落数据合同，不扩其他页面 | |
| 老师学生两端都先看到 | 本期就同步进入学生 runtime | |

**User's choice:** 编辑器+预览+开课预览(推荐)
**Notes:** 用户不希望 Phase 21 提前侵入 Phase 23 的 student runtime 深改。

---

## 证据期待的结构

### 结构深度

| Option | Description | Selected |
|--------|-------------|----------|
| 轻量结构(推荐) | 结构化表达证据类型、提示语和轻量辅助字段 | ✓ |
| 一句自然语言说明 | 只写一句说明 | |
| 接近 rubric | 直接上评价维度和等级 | |

**User's choice:** 轻量结构(推荐)
**Notes:** 用户希望它足够 typed，可被 UI 和后续持久化消费，但不想在本期引入 rubric 复杂度。

### 服务对象

| Option | Description | Selected |
|--------|-------------|----------|
| 先服务教师(推荐) | 主要帮助教师设计、准备和记录证据 | ✓ |
| 教师和学生同时服务 | 同一份 expectation 两端共用 | |
| 先服务系统聚合 | 主要为了机器可读和后续分析 | |

**User's choice:** 先服务教师(推荐)
**Notes:** 学生端不是本期主消费方。

### 默认公开度

| Option | Description | Selected |
|--------|-------------|----------|
| 默认教师侧，学生按需公开(推荐) | 默认教师内部使用，学生按需看到公开部分 | ✓ |
| 默认全部公开 | 所有 expectation 都直接给学生看 | |
| 默认不公开 | 完全不进入学生侧语义 | |

**User's choice:** 默认教师侧，学生按需公开(推荐)
**Notes:** 用户希望保留教师观察与评价空间。

### 建模中心

| Option | Description | Selected |
|--------|-------------|----------|
| 证据类型+提示语(推荐) | 以 evidence type 和 prompt 为中心建模 | ✓ |
| 仅活动产出类型 | 只表达学生交什么 | |
| 仅评价目标 | 只表达教师想看什么能力 | |

**User's choice:** 证据类型+提示语(推荐)
**Notes:** 这是 downstream agent 需要直接继承的关键建模方向。

---

## 课堂时间线粒度

### 首发记录范围

| Option | Description | Selected |
|--------|-------------|----------|
| 关键三类全记(推荐) | presence、evidence、intervention 三类都系统化持久化 | ✓ |
| 只记 evidence 与 intervention | 不系统化保留 presence 历史 | |
| 只记关键教师动作 | 最小化记录范围 | |

**User's choice:** 关键三类全记(推荐)
**Notes:** 用户明确希望后续 recap / eval / analytics 都有可信事实源。

### Presence 事实

| Option | Description | Selected |
|--------|-------------|----------|
| 状态变化时间线(推荐) | 记录 connected / reconnecting / offline 的变化轨迹 | ✓ |
| 只保留最新状态 | 继续只看 participant 当前状态 | |
| 状态+停留时长 | 直接计算每段时长 | |

**User's choice:** 状态变化时间线(推荐)
**Notes:** 用户此时不要求直接计算停留时长，先把 durable history 做实。

### Intervention 记录形态

| Option | Description | Selected |
|--------|-------------|----------|
| 轻量事件记录(推荐) | 短标签或短备注 | |
| 富文本观察记录 | 更完整的课堂观察文字记录 | ✓ |
| 只打标签 | 仅用标签表示 | |

**User's choice:** 富文本观察记录
**Notes:** 后续又进一步锁定：这是“课堂过程记录”，不是正式评价草稿。

### 所属边界

| Option | Description | Selected |
|--------|-------------|----------|
| 严格 session-owned(推荐) | 所有 timeline/evidence 都以课堂 session 为主边界 | ✓ |
| lesson-owned | 主要挂 lesson / step | |
| 双重归属 | 同时挂 session 和 lesson | |

**User's choice:** 严格 session-owned(推荐)
**Notes:** 用户不希望单次课堂事实和 lesson 抽象层混在一起。

### Intervention 进一步细化

| Option | Description | Selected |
|--------|-------------|----------|
| 课堂过程记录(推荐) | 留下过程事实，不直接变成正式评价草稿 | ✓ |
| 正式评价草稿 | 记录本身就进入评价链路 | |
| 两者兼有 | 同时承载过程和正式评价 | |

**User's choice:** 课堂过程记录(推荐)
**Notes:** 这是避免 Phase 21 scope creep 到 Phase 24 的关键边界。

### Intervention 对象层级

| Option | Description | Selected |
|--------|-------------|----------|
| 单个学生为主(推荐) | 主要围绕个人记录 | |
| 单个步骤为主 | 主要围绕环节记录 | |
| 同时支持学生和全班 | 既能针对个人，也能记全班观察 | ✓ |

**User's choice:** 同时支持学生和全班
**Notes:** 用户希望课堂过程记录既可针对个体，也可留全班层面的教学观察。

### Intervention 输入方式

| Option | Description | Selected |
|--------|-------------|----------|
| 短标题+正文(推荐) | 标题 + 正文，轻结构但信息完整 | ✓ |
| 纯富文本正文 | 全自由输入 | |
| 标签+正文+状态 | 更强结构但更像正式评价 | |

**User's choice:** 短标题+正文(推荐)
**Notes:** 用户要富文本观察能力，但不希望合同膨胀成完整评价模型。

### 可见性

| Option | Description | Selected |
|--------|-------------|----------|
| 仅教师内部(推荐) | 默认只给教师侧看 | ✓ |
| 教师和学生都可见 | 学生也可见 | |
| 教师可见，后续可选分享 | 预留分享机制 | |

**User's choice:** 仅教师内部(推荐)
**Notes:** 这类记录首发不进入学生可见面。

---

## 旧课时兼容策略

### Lesson 兼容方式

| Option | Description | Selected |
|--------|-------------|----------|
| 静默默认化+后续提醒(推荐) | 先保证兼容，后续 readiness 再显式提醒 | ✓ |
| 进入编辑器就提示补齐 | 一打开就提醒，但不阻断 | |
| 立即要求补齐 | 先补元数据再继续 | |

**User's choice:** 静默默认化+后续提醒(推荐)
**Notes:** 用户明确优先“不打断已有课堂链路”。

### Published snapshot 兼容方式

| Option | Description | Selected |
|--------|-------------|----------|
| 读取时做 fallback(推荐) | 服务端读旧 snapshot 时补默认结构 | ✓ |
| 后台迁移历史快照 | 全量回填历史快照 | |
| 只兼容 lesson，不兼容旧快照 | 要求重新发布旧课时 | |

**User's choice:** 读取时做 fallback(推荐)
**Notes:** 用户不希望先做破坏性数据迁移。

### 默认值提示位置

| Option | Description | Selected |
|--------|-------------|----------|
| 编辑器和开课预览(推荐) | 在教师最容易修正的地方提示默认推断来源 | ✓ |
| 仅编辑器 | 只在 authoring 场景提示 | |
| 所有相关页面都提示 | 编辑器、预览、launch、classroom 都提示 | |

**User's choice:** 编辑器和开课预览(推荐)
**Notes:** 用户不希望 live classroom 和 student runtime 被过多兼容提示打扰。

### 严格度

| Option | Description | Selected |
|--------|-------------|----------|
| 允许继续，但标为待完善(推荐) | 不阻断，先标记待完善 | ✓ |
| 编辑器内阻断保存 | 元数据不完整就不让保存 | |
| 开课时阻断 | 到 launch 阶段才强制补齐 | |

**User's choice:** 允许继续，但标为待完善(推荐)
**Notes:** 用户把真正 readiness 阻断留给后续 phase，而不是在 Phase 21 提前收紧。

---

## the agent's Discretion

- `activityMode`、`evidenceType`、`timeline entryType` 的精确枚举值
- richer teaching semantics 在四字段之外的最小扩展子字段集
- 全班范围 intervention 的持久化 target shape

## Deferred Ideas

- 课程编排细节 — 后续更适合 `Phase 22`
- 上课流程控制 — 后续更适合 `Phase 22-24`
- 学生评价实现 — 后续更适合 `Phase 24`
- 统计数据汇总 — 后续更适合 `Phase 25`
- 分析学生学习行为 — 后续更适合 `Phase 25-26`
