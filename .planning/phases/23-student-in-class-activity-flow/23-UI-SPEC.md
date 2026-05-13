---
phase: 23
slug: student-in-class-activity-flow
status: draft
shadcn_initialized: false
preset: none
created: 2026-05-13
---

# Phase 23 — UI Design Contract

> 面向 Phase 23 的学生课堂活动流 UI 合同。目标是在保留现有 student
> player、progress、task/quiz、SSE lock/unlock 语义的前提下，把学生端从
> “可用的课时阅读器”升级成“明确知道现在该做什么、要交什么、老师当前要求什么”
> 的课堂活动界面。

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | custom UI primitives + Radix patterns |
| Icon library | lucide-react |
| Font | Lexend |

来源：`DESIGN.md`、`src/app/globals.css`、
`src/components/surfaces/player-surface.tsx`、
`src/components/learning/classroom-runtime-client.tsx`、
`src/components/learning/task-step-card.tsx`、
`src/components/learning/quiz-step-card.tsx`。

---

## Source Decisions Used

| Source | Decisions translated into UI contract |
|--------|---------------------------------------|
| `STATE.md` | student/player 保持沉浸式主舞台；步骤骨架与回退态放在低对比 tonal 容器；中文界面；危险语义不用品牌蓝 |
| `ROADMAP.md` | Phase 23 覆盖 activity guidance、expected output、durable quick-response / evidence capture、兼容现有 progress/runtime |
| `REQUIREMENTS.md` | 对齐 ACT-01 / ACT-02；不得破坏 LEARN-01~09 与 CLASS-03~07 |
| `21-CONTEXT.md` | teachingDesign 与 evidenceExpectation 已是服务端真相；学生端首发只按需公开，不把其扩成正式评价系统 |
| `22-CONTEXT.md` / `22-RESEARCH.md` | 教师端 run sheet 已把材料提示、采证提醒、默认推断分层；学生端应消费同一事实来源，但改写成 classroom-friendly 文案 |
| Current player implementation | 继续使用 cached shell + Suspense personal state、左侧步骤轨、主步骤卡、reconnect banner、task/quiz append-only attempts |

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | 图标与短标签贴合、微型 badge 内边距 |
| sm | 8px | 状态行、chips、按钮内 icon gap |
| md | 16px | 默认文本块间距、字段组间距 |
| lg | 24px | 卡片内主内容分组、步骤元信息区 |
| xl | 32px | 主舞台内大块分隔、双列信息区 |
| 2xl | 48px | 页面 section 间距、主卡与次级卡分隔 |
| 3xl | 64px | 大屏 page-level breathing space |

Exceptions: 交互目标最小点击高度固定 44px；主 CTA、答案选项、快速回应提交区输入与按钮均不得低于 44px。视觉圆点或步骤序号可小于 44px，但必须嵌在满足 44px 点击面的容器中。

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.6 |
| Label | 14px | 600 | 1.4 |
| Heading | 24px | 600 | 1.2 |
| Display | 40px | 600 | 1.1 |

规则：

1. 当前步骤标题、课堂 guidance 标题、关键状态标题使用 Heading。
2. expected output、evidence prompt、错误恢复说明统一使用 Body，不降到 12px。
3. 标签、状态 badge、步骤 rail 元信息统一使用 Label。
4. 全站学生课堂文案只允许 `400` 与 `600` 两档字重，避免管理后台式的多层 font-weight 噪音。

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #f5f7f9 | 页面 floor、主背景、浅层沉浸壳层 |
| Secondary (30%) | #eef1f3 | 步骤卡 inset、辅助信息卡、表单承载面 |
| Accent (10%) | #0050d4 / #7b9cff | 主 CTA、当前步骤强调、已选答案、老师推荐跳转 |
| Destructive | #b31b25 | 仅用于提交失败、不可恢复错误、危险提示 |

Accent reserved for: 当前步骤主标题强调线索、`提交课堂回应`/`提交任务`/`提交答案` 主按钮、当前选中答案、老师推荐步骤跳转按钮、已完成确认文案、focus ring。不得把 accent 用于所有链接、所有 badge、所有装饰图标。

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | 提交课堂回应 |
| Empty state heading | 当前课堂还没有可进行的活动 |
| Empty state body | 请等待老师开启课堂或返回学生空间查看已发布课时。若已进入课堂但内容未出现，请刷新当前页面。 |
| Error state | 课堂连接已中断，系统会先保留最近一次课堂状态。请点击“重新连接课堂”；若仍失败，返回学生空间后重新进入本课。 |
| Destructive confirmation | none: 本阶段学生端不提供 destructive action，不出现删除、清空、放弃课堂等确认弹窗。 |

补充文案规则：

1. 学生端所有提示都要直接回答“现在做什么、交什么、下一步怎么办”。
2. 避免使用教师视角术语，如“readiness”“run sheet”“default inference”。
3. `teacher-only` 的 evidenceExpectation 不直接暴露原始字段名；学生端改写成“本步骤需要提交/无需提交”的自然语言。

---

## Phase 23 activity surface contract

### Overall structure

学生端 `/student/player` 继续保持“一主舞台 + 一条步骤轨 + 少量辅助提示”的结构，不新增第二个 hero，也不回退成普通 lesson reader。

固定结构：

1. **顶部 stage hero**：仅承载课时标题、目标、沉浸模式摘要。
2. **左侧步骤轨**：显示课堂顺序、当前状态、老师指定/推荐状态。
3. **右侧主舞台**：当前活动卡 + 次级课堂提示卡。
4. **reconnect / snapshot banner**：只在连接异常或状态恢复时显示。

要求：

1. 主舞台必须把“当前活动任务”放在第一视觉层，而不是把步骤列表做成主内容。
2. 左侧步骤轨在 locked 模式下只做状态说明，不提供误导性的可点击自由跳转。
3. 沉浸学习说明保持次级，不得压过当前活动卡。

### Active step card requirements

Phase 23 的当前步骤卡必须正式包含以下 6 个信息块：

1. **步骤标题**：当前步骤名称。
2. **活动 guidance**：学生此刻该做什么，必须是明确动作句。
3. **expected output**：学生本步骤最终要提交/产出的内容是什么。
4. **evidence expectation summary**：是否需要提交、提交什么、何时算完成。
5. **current completion state**：未开始 / 进行中 / 已完成，并给出下一步动作。
6. **step-specific action area**：阅读完成、课堂回应提交、任务提交、测验提交，只出现一个主动作焦点。

禁止：

1. 只展示 step title + 原正文，不补活动 guidance。
2. 让学生自己猜“是看完就行，还是必须回应/上传/选择答案”。
3. 在同一张卡里并列多个同级主按钮，造成课堂现场犹豫。

### Teaching-design mapping rules

服务端已有 `activityIntent`、`activityMode`、`estimatedMinutes`、
`evidenceExpectation`。学生端必须按下面方式消费：

1. `activityIntent` → 转成动作导向标题，例如“先阅读并抓住重点”“完成本次课堂作答”。
2. `activityMode` → 转成学习方式标签，例如“独立完成”“两人讨论”“全班跟随”。
3. `estimatedMinutes` → 固定显示为中文时长标签，如“预计 8 分钟”。
4. `evidenceExpectation.required=true` → 明确显示“本步骤需要提交课堂回应/任务结果/作答结果”。
5. `evidenceExpectation.required=false` → 显示“本步骤以课堂参与或老师观察为主，无需单独提交”。
6. `studentVisibility=teacher-only` → 不显示 teacher-only 原词，只保留学生可执行提示。

---

## Quick-response and evidence-capture contract

### New response pattern

除现有 task / quiz 外，Phase 23 的 quick-response / in-class evidence capture 统一使用与现有提交卡相同的 contract：**一个输入区 + 一个主提交按钮 + append-only 结果反馈**。

固定要求：

1. 输入区背景使用 `surface-container-low`，focus 后切到 `surface-container-lowest`。
2. 主按钮文案固定使用动作 + 对象，如“提交课堂回应”。
3. 成功反馈必须说明“已记录”，不使用模糊 toast-only 成功提示。
4. 历史记录继续按 append-only 展示“第 N 次回应 / 最新”，不覆盖旧记录。
5. 若步骤只需一次轻量 check-in，仍沿用 append-only 记录，不做 client-only toggle。

### Input guidance

快速回应输入区必须包含：

1. 一句明确 prompt。
2. 一句提交格式提示，例如“1-2 句话说明你的结论”或“上传截图前先写下观察结果”。
3. 一句 durability 文案，固定表达“提交后会作为一次新的课堂记录保存”。

### Attempt history

学生端历史区保持现有 task/quiz 语言，但视觉上降为次级层：

1. 最新一次尝试卡置顶。
2. 历史项使用次级 tonal cards，不得与当前输入区竞争。
3. teacher feedback 继续在最新记录附近显示，不拆到独立面板。

---

## Runtime and lock-state contract

### Locked mode

当 `runtime.locked=true` 时：

1. 非当前步骤在步骤轨中视觉降级并标记不可操作。
2. 学生仍可看见完整步骤顺序，但点击跳转不可触发。
3. 主舞台顶部 badge 固定显示“老师指定”。
4. 若当前步骤需要提交，提交区仍可使用；锁定只限制导航，不限制完成本步骤。

### Unlocked mode

当 `runtime.locked=false` 且存在 `teacherRecommendedStepId` 时：

1. 当前步骤外可展示“老师推荐” pill。
2. 页面顶部可出现一个次级 CTA：“前往老师推荐步骤”。
3. 该 CTA 必须是次级或单一 accent 跳转按钮，不得与当前步骤主提交动作并列抢主。

### Reconnect state

连接异常与恢复态合同：

1. reconnect banner 只出现在 SSE 异常、snapshot fallback、手动恢复时。
2. banner 文案必须解释“当前看到的是最近一次课堂状态”。
3. 手动恢复按钮固定为 `重新连接课堂`。
4. reconnect banner 使用 secondary tonal 容器，不使用 destructive 红，除非课堂完全不可恢复。

---

## Interaction states and affordances

### Buttons and targets

1. 主按钮最小高度 48px；次级按钮最小高度 44px。
2. 所有答案选项、步骤链接、quick tools 实际点击区域最小 44px。
3. hover / active 只做轻微位移和 tonal 变化，保持当前 repo 的 `hover:-translate-y-0.5` 语言。

### Form fields

1. textarea / text input 默认显示一句 label，不允许 placeholder-only。
2. focus ring 继续使用 `primary` ghost-border，不引入黑色或系统蓝默认边框。
3. 错误提示紧贴字段下方，不只在页面顶部出现。

### Choice inputs

测验与 check-in 选项卡必须遵守：

1. 已选状态使用 accent 背景/文字，不依赖单纯 icon。
2. 未选状态仍保持足够对比度与点击面。
3. 若已有最新提交且不可重试，选项区保留可读但不继续作为主交互焦点。

---

## State-specific copy and visuals

### Content step

1. content 步骤必须新增 `活动提示` 与 `完成后动作` 两块，不再只显示“学习提示 / 完成状态”的通用壳文案。
2. “已完成阅读”保留为 content-only CTA，不挪用到 task / quick response / quiz。

### Task step

1. task 步骤保留“最近一次尝试 + 新提交输入区 + 历史记录”。
2. 在 prompt 之上新增 expected output 摘要，例如“你需要提交一段文字 / 图片 / 文件链接”。

### Quiz step

1. quiz 步骤在题目上方增加一句课堂化 guidance，例如“先独立作答，再等待老师讲解”。
2. 结果反馈仍放在本卡内，不跳出到独立结果页。

### Quick-response step

若 Phase 23 以现有 step 类型扩展轻量回应能力，则 UI 必须看起来比 task 更轻：

1. 输入区更短。
2. guidance 更直接。
3. 成功反馈更即时。
4. 但持久化与历史展示仍与 task submission 对齐。

---

## Visual guardrails

1. 不引入 utilitarian admin 表单页或 checklist dashboard 风格。
2. 不在学生端暴露 teacher-only readiness、fallback reason code、DTO field name。
3. 不使用 1px divider lines；继续用 tonal layering 区分信息层。
4. 不让“课堂笔记 / 同伴列表”这类 quick tools 成为 Phase 23 主范围；它们保持占位或次级。
5. 不把错误、断线、老师锁定全部渲染成同一种红色警告块。
6. 不把主舞台拆成多标签页，避免课堂现场额外导航成本。

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not applicable |
| third-party | none | not applicable |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
