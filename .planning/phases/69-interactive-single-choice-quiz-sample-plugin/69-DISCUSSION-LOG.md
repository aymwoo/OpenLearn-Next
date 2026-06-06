# Phase 69: Interactive Single-Choice Quiz Sample Plugin - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-03
**Phase:** 69-interactive-single-choice-quiz-sample-plugin
**Areas discussed:** 配置真相源, 选项数量规则, 重复作答规则, 课堂交互形态

---

## 配置真相源

### 冻结时机

| Option | Description | Selected |
|--------|-------------|----------|
| 每次开课冻结 | 备课/发布里维护题目，真正开课时按 classroom session 固定一份独立题目；已开课堂不受后续改题影响。 | ✓ |
| 发布时冻结 | 一经发布就固定下来；后续每次开课都复用同一题目快照。 | |
| 始终共享最新 | 题目始终指向老师当前最新配置。 | |

**User's choice:** 每次开课冻结
**Notes:** 题目 authoritative snapshot 必须随 `classroomSession` 冻结。

### 备课期正式配置位置

| Option | Description | Selected |
|--------|-------------|----------|
| 先放现有步骤配置 | 老师继续在 lesson step / plugin extension 里编辑；launch 时再写入 `plugin_owned_quiz_questions`。 | ✓ |
| 直接写 questions 表 | 备课时就直写 plugin-owned question snapshot。 | |
| 双写两边 | 备课时同时写现有配置和 plugin-owned 表。 | |

**User's choice:** 先放现有步骤配置
**Notes:** 先沿用现有 authoring 保存链路，避免在未开课时强行创造 session 作用域。

### 选项文本落库方式

| Option | Description | Selected |
|--------|-------------|----------|
| 补进 questions 表字段 | 把 A-D 选项文本也纳入 `plugin_owned_quiz_questions` 结构表。 | ✓ |
| 继续留在步骤配置 | 展示选项仍回读 lesson/plugin extension 配置。 | |
| 拆第二张 options 表 | 为每题再建一张 option 明细表。 | |

**User's choice:** 补进 questions 表字段
**Notes:** downstream agent 需要显式扩充当前 question table schema，避免双真相源。

---

## 选项数量规则

### 允许配置的选项数

| Option | Description | Selected |
|--------|-------------|----------|
| 固定 4 项 | 严格对齐当前 A-D 枚举。 | |
| 2 到 4 项 | 老师可配 2、3、4 项；底层仍用 A-D 槽位。 | ✓ |
| 恰好 3 项 | 贴近旧课堂投票默认体验。 | |

**User's choice:** 2 到 4 项
**Notes:** 保持单选样板贴近日常课堂题，而不是被旧投票样板习惯绑死。

### 未使用槽位表达

| Option | Description | Selected |
|--------|-------------|----------|
| 保留 A-D 槽位，空值禁用 | 结构上仍是 A-D 四个槽位；未填写选项不展示、不可作答。 | ✓ |
| 重新编号压缩 | 实际有几个选项就只生成几个字母。 | |
| 必须补满 4 项 | 保存前强制老师补齐到 4 项。 | |

**User's choice:** 保留 A-D 槽位，空值禁用
**Notes:** 与当前 enum / selectedOption / generated schema 的方向最一致。

### 作者侧硬校验

| Option | Description | Selected |
|--------|-------------|----------|
| 至少2项且正确答案必须落在启用项 | 题干非空，至少 2 个非空选项，正确答案只能选已启用项。 | ✓ |
| 只校验题干非空 | 宽松保存，后续阶段再拦。 | |
| 四项都必须唯一且非空 | 规则更严。 | |

**User's choice:** 至少2项且正确答案必须落在启用项
**Notes:** 不把坏配置留到 publish / launch 才处理。

---

## 重复作答规则

### 是否允许改答

| Option | Description | Selected |
|--------|-------------|----------|
| 允许改答，latest 生效 | 历史保留，课堂当前结果看 latest。 | ✓ |
| 提交即锁定 | 学生只能答一次。 | |
| 老师可配置 | 是否可改答成为题目设置。 | |

**User's choice:** 允许改答，latest 生效
**Notes:** 直接拥抱 Phase 68 已准备好的 append-only + `isLatest` 语义。

### 改答截止条件

| Option | Description | Selected |
|--------|-------------|----------|
| 题目关闭或课堂切走后结束 | 仅在老师仍开放该题时允许改答。 | ✓ |
| 直到整节课结束 | 切到别的环节后仍能回来改题。 | |
| 提交后有短时窗口 | 例如 10 秒内可改答。 | |

**User's choice:** 题目关闭或课堂切走后结束
**Notes:** 不新增短时窗口这类额外 capability。

### 统计口径

| Option | Description | Selected |
|--------|-------------|----------|
| 每个学生每题只算 latest 一票 | 历史 attempt 只用于审计与回溯。 | ✓ |
| 每次提交都计入 | 每次改答都算进统计。 | |
| 作答人数按首次，分布按 latest | 混合口径。 | |

**User's choice:** 每个学生每题只算 latest 一票
**Notes:** 为 Phase 70 统计投影预先锁定口径。

---

## 课堂交互形态

### 总体方向

| Option | Description | Selected |
|--------|-------------|----------|
| 复用现有壳子，替换真相源 | 尽量沿用旧 voting / quiz shell。 | |
| 独立一套插件 UI | 让样板插件拥有更独立的配置与作答体验。 | ✓ |
| 只复用教师端 | 前后体验分开。 | |

**User's choice:** 独立一套插件 UI
**Notes:** 这改变了 Phase 69 的实现轮廓，不再只是“旧壳子换后端真相源”。

### 独立程度

| Option | Description | Selected |
|--------|-------------|----------|
| 独立表单和作答视图，但嵌在现有页面壳内 | 老师端/学生端各自独立，但不重写整页框架。 | ✓ |
| 连页面壳都独立 | 老师端和学生端都做成更独立的整块页面。 | |
| 只有学生端独立 | 作者侧继续走旧壳子。 | |

**User's choice:** 独立表单和作答视图，但嵌在现有页面壳内
**Notes:** 保留现有 authoring / classroom 页面级结构和导航节奏。

### 老师侧感受

| Option | Description | Selected |
|--------|-------------|----------|
| 明显是插件专属配置卡 | 老师能感知这是 quiz sample plugin 的独立配置块。 | ✓ |
| 看起来仍像普通 quiz step | 尽量弱化插件感。 | |
| 像课堂投票的变体 | 延续 voting 视觉和话术。 | |

**User's choice:** 明显是插件专属配置卡
**Notes:** 不要伪装成普通 quiz step 编辑器。

### 学生侧感受

| Option | Description | Selected |
|--------|-------------|----------|
| 像正式答题卡 | 更强调有标准答案的课堂题。 | ✓ |
| 像即时投票 | 更轻量快速。 | |
| 介于两者之间 | 保留课堂节奏，但更严肃。 | |

**User's choice:** 像正式答题卡
**Notes:** 后续 UI 和 wording 都应更靠近答题而不是 polling。

---

## the agent's Discretion

- 独立插件 UI 的具体组件拆分和文件组织由 planner / executor 自定。
- A-D 选项文本如何编码进单表结构由 research / planner 细化，但必须保持结构化、单表、零双写真相源。
- launch 冻结接缝的具体落点由 planner 结合现有课堂启动链路决定。

## Deferred Ideas

- 题目统计与课后复盘留到 Phase 70。
- marketplace 生命周期治理留到 Phase 71。
- 端到端 close gate 留到 Phase 72。
- 多题型、游戏化、实时大屏、AI 出题继续 deferred。
