---
phase: 25
slug: teaching-data-capture-and-session-analytics
status: draft
shadcn_initialized: false
preset: none
created: 2026-05-14
---

# Phase 25 — UI Design Contract

> 面向 Phase 25 的课堂 session recap UI 合同。目标是在不新开 analytics 主路由、不新造第二真相源的前提下，让教师在课堂结束后继续留在 `/classroom` 内完成可信、可追溯、可行动的课后复盘。

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | custom UI primitives + Radix patterns |
| Icon library | lucide-react |
| Font | Lexend |

来源：`DESIGN.md`、`src/app/globals.css`、`src/components/surfaces/classroom-console-surface.tsx`、`src/components/classroom/classroom-control-panel.tsx`、`src/components/classroom/classroom-student-detail-panel.tsx`、`src/components/learning/teacher-review-surface.tsx`。

---

## Source Decisions Used

| Source | Decisions translated into UI contract |
|--------|---------------------------------------|
| `25-CONTEXT.md` | `/classroom` 留作唯一 recap 主域；ended 后主舞台直接 takeover；history reopen 留在 classroom domain；student-first 主钻取；step diagnostics 仅作次级诊断；`待反馈提交` 与 `待跟进课堂信号` 必须拆开；participation 必须显式包含 `未评价` |
| `25-RESEARCH.md` | 继续沿用 single main-stage + tonal secondary panels；history list 需进入 console DTO；外层 recap read 优先 request-fresh；`/teacher/review` 只借语义不借主路径 |
| `STATE.md` | `/classroom` 保持单一渐变主舞台，其余控制/名册/干预模块落回 tonal cards；中文界面；危险动作不并入品牌蓝 CTA |
| `ROADMAP.md` / `REQUIREMENTS.md` | 对齐 ANALYTICS-01：completion、participation、submissions、feedback workload 都必须可见且可 drill down 到 supporting raw evidence |
| Current classroom surfaces | 继续复用 `teacherSurfaceRhythm`、classroom console hero、同路由 student detail、secondary rail 的信息节奏，不引入 utilitarian analytics dashboard |
| `DESIGN.md` + `globals.css` | Lexend、no-line、surface tonal layering、gradient CTA、ambient shadow、`surface` / `surface-container-low` / `surface-container-lowest`、`--radius-shell` / `--radius-card` |

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | 图标与短标签贴合、微型状态点 |
| sm | 8px | 标签组、标题辅助 meta、分组内紧凑信息 |
| md | 16px | 默认文本块、列表项内部间距、按钮文字与图标间距 |
| lg | 24px | recap 卡片内主次分组、summary 区块留白 |
| xl | 32px | 主舞台模块间距、左右分栏主间隙 |
| 2xl | 48px | hero 与 student-first drill-down 之间的大分隔 |
| 3xl | 64px | 页面级 section break，仅用于大屏 recap 主版面 |

Exceptions: 所有可点击记录项、学生列表项、标签切换、历史课堂记录项最小点击高度 44px；主 CTA 与主要 drill-down 操作最小高度 48px；移动端课堂记录卡可视觉紧凑，但不得低于 44px 点击面。

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.6 |
| Label | 14px | 600 | 1.4 |
| Heading | 24px | 600 | 1.2 |
| Display | 40px | 600 | 1.1 |

规则：

1. recap hero 标题、student summary 标题、step diagnostics 标题统一使用 Heading 或 Display，不降到后台表格小字。
2. 原始证据、解释文案、空态和错误说明统一使用 Body，不使用 12px 信息碎片字。
3. 统计标签、状态 badge、history entry meta、`未评价` 状态统一使用 Label。
4. 本阶段只允许 `400` 与 `600` 两档字重，避免 analytics 页面出现过度层级噪音。

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #f5f7f9 | page floor、ended recap 背景、外层大面 |
| Secondary (30%) | #eef1f3 | 次级 section、history rail、step diagnostics、grouped evidence container |
| Accent (10%) | #0050d4 / #7b9cff | `#0050d4` 用于主 CTA、当前选中对象、focus ring、headline 强调；`#7b9cff` 仅用于 recap hero gradient glow、selected fill、弱强调底色 |
| Destructive | #b31b25 / #fbe7e8 | 仅用于 `结束课堂`、不可恢复错误、危险确认 |

Accent reserved for: ended-session recap hero 渐变、当前选中的课堂记录项、当前选中的学生摘要项、当前选中的步骤诊断项、主 CTA、focus ring、headline metric 中需要一眼识别的单一重点数字。不得把 accent 扩散到所有 badge、所有辅助标签或所有链接。

补充语义色：`待跟进课堂信号` 使用 attention 语义（暖黄系底色 + 深色文字）而不是 destructive 红；`待反馈提交` 使用中性 tonal + 主色文字，不与课堂风险信号混色。

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | 查看学生复盘 |
| Empty state heading | 还没有可回看的课堂记录 |
| Empty state body | 请先完成一节课堂，结束后系统会在当前课堂页展示本次复盘；也可以从这里回看最近的课堂记录。 |
| Error state | 课堂复盘暂时无法加载，请刷新当前页面重试；若仍失败，请回到课堂记录列表重新打开本次课堂。 |
| Destructive confirmation | 结束课堂：确认结束本次课堂并进入课后复盘？结束后学生端将停止同步，但你仍可在当前页面查看本节复盘。 |

补充文案规则：

1. user-facing 文案统一使用简体中文。
2. recap 文案优先回答“这节课结果如何、谁需要看、下一步做什么”，而不是堆叠 analytics 术语。
3. `未评价` 必须原样出现，不用“默认正常”“暂无异常”之类粉饰文案替代。
4. `/teacher/review` 只在次级说明里以“去批改中心处理提交反馈”出现，不能在 `/classroom` recap 中抢主标题。

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not applicable |
| third-party | none | not applicable |

---

## Phase 25 recap route contract

### `/classroom` remains the only recap domain

1. ended-session recap 固定留在 `/classroom`，不新增 `/teacher/analytics`、`/teacher/session-recap` 或任何新的 analytics 一级导航。
2. 课堂记录的 reopen 行为固定为同路由切换：仍由 `sessionId` 驱动当前上下文，不把教师抛出 classroom domain。
3. `/teacher/review` 继续是 lesson-level task / quiz feedback 路径，只承接 `待反馈提交` 的后续动作，不承担本次 session 的主复盘入口。

### Main-stage takeover after session end

1. 当 `session.status === ended` 时，`/classroom` 主舞台必须直接从 live runtime hero 切换为 recap hero。
2. live 状态下的步骤切换按钮、锁定/自由浏览切换、互动工具区不得继续占据主舞台首屏。
3. ended recap 首屏固定顺序为：
   - recap hero（课时、班级、结束时间、课堂状态）
   - headline metrics（完成、参与、提交、工作量）
   - workload split
   - student-first recap 区
4. ended recap 仍保留 classroom 上下文说明，避免看起来像新开的一页后台分析仪表盘。

---

## Session history entry pattern

1. `/classroom` 的次级 rail 顶部固定出现 `课堂记录` 模块，承担 live session 与 ended session 的统一入口。
2. 记录列表按以下顺序呈现：
   - 进行中的课堂（若存在）置顶
   - 最近结束的课堂按时间倒序排列
3. 每条记录最少展示：课时名、班级名、状态、结束或更新时间。
4. 当前选中记录使用低强度 accent fill + 更高对比文字；未选中项使用 `surface-container-lowest` tonal card。
5. 点击历史记录后，主舞台在当前 `/classroom` 上下文中切换到该 session recap；不得整页跳转到其他 teacher route。
6. 记录列表空态文案固定为：`还没有课堂记录` / `开始并结束一节课堂后，这里会保留你的课堂复盘入口。`

---

## Student-first recap information architecture

### Overall structure

student-first recap 固定为主钻取结构，不允许被 step-first 或 timeline-first 替代。

桌面端结构：

1. 左侧：学生摘要列表（固定宽列）
2. 右侧：选中学生的 session 摘要与 grouped evidence

移动端结构：

1. 先显示学生摘要列表
2. 点选后在同页下方展开该学生摘要
3. step diagnostics 始终排在学生复盘之后

### Student list item contract

每个学生摘要项必须同时包含：

1. 学生姓名
2. 完成状态摘要
3. 参与状态 badge：`积极参与 / 正常参与 / 需要关注 / 未评价`
4. 本次 session 的课堂证据或提交数量摘要
5. 是否进入 follow-up 队列的短标签

禁止：

1. 只显示姓名 + 分数式数字。
2. 用匿名图表取代具体学生行。
3. 把 `未评价` 静默并入 `正常参与`。

### Selected student summary first, evidence second

进入单个学生后，固定内容顺序为：

1. 学生 session 摘要卡
2. grouped evidence 分组区
3. 必要时再展示 timeline 细项

学生 session 摘要卡最少包含：

1. 完成情况
2. 参与状态
3. 提交 / 回应情况
4. 当前是否需要老师跟进

grouped evidence 固定分成四组，不允许先丢一条混合时间线：

1. `完成情况`
2. `提交与反馈`
3. `过程评价`
4. `课堂时间线`

---

## Secondary step-diagnostics posture

1. `环节诊断` 只能作为辅助诊断面，不能出现在 recap 首屏 hero 之前，也不能成为默认第一个 drill-down tab。
2. 桌面端将其放在 student-first 复盘区之后的次级 tonal section；移动端固定排在选中学生摘要之后。
3. 每个步骤诊断项最少展示：步骤名、完成概览、提交概览、掉队/需关注人数。
4. 默认文案必须强调它的辅助定位：`用于判断哪一环节需要回看，不替代学生复盘主路径。`
5. step diagnostics 使用 `surface-container-low` + `surface-container-lowest` 层级，不得使用与主舞台同等强度的 gradient hero。

---

## Workload summary visual hierarchy

1. `教师后续工作` 区固定拆成两个并列卡片，不允许先显示一个混合总数再让老师自己猜组成。
2. 阅读顺序固定为：
   - `待跟进课堂信号`
   - `待反馈提交`
   先回答“谁需要处理”，再回答“哪些提交要回到批改中心”。
3. `待跟进课堂信号` 卡片使用 attention 语义色与更强提示文案；当数量为 0 时回落到中性 tonal card。
4. `待反馈提交` 卡片使用更克制的 tonal surface，并明确提示其来源是最新 task / quiz 提交。
5. 两张卡片都必须包含：
   - 数量
   - 统计口径一句话解释
   - 最多 2-3 条代表性 next-step 文案
6. 这两张卡片不得合并为 donut chart、堆叠柱状图或难以快速行动的抽象可视化。

---

## Participation display posture

1. participation 概览固定为四个 bucket：`积极参与 / 正常参与 / 需要关注 / 未评价`。
2. `未评价` 使用中性 surface + `on-surface-variant` 文案，不使用成功色或 attention 色伪装。
3. 学生列表、selected student 摘要和 headline 参与度概览必须共享同一 `未评价` 文案，不允许一个地方写“暂未记录”、另一个地方写“正常参与”。
4. `需要关注` 可以使用 attention 语义，但不得用 destructive 红夸大为错误。
5. participation 主指标只接受显式教师评价结果；UI 不得依据完成率、提交率或在线状态自动推断参与档位。

---

## Responsive and empty-state contract

### Responsive behavior

1. **Desktop (`xl` 及以上)**：保留 `主舞台 + 次级 rail` 结构；student-first drill-down 使用 `320px 列表 + minmax(0,1fr) 详情`。
2. **Tablet (`md`~`lg`)**：headline metrics 允许 2x2 排布；workload split 仍保持双卡，但 student list 与 selected student summary 改为上下堆叠。
3. **Mobile (`<md`)**：ended recap 必须完整可读，不沿用 live classroom 的“建议使用桌面端控课”阻断姿态；所有模块改为单列，课堂记录列表在 student recap 之前。
4. 移动端不出现横向滚动的数据面板；若统计项过多，改为纵向堆叠，不压缩到不可读 badge 墙。

### Empty states

1. **无课堂记录**：显示全页 calm empty state，引导“先完成一节课堂”。
2. **选中学生无课堂证据**：显示 `本次课堂还没有该学生的课堂证据`，并补一句 `可先查看过程评价或课堂时间线。`
3. **选中学生无过程评价**：显示 `本次课堂还没有留下过程评价`，并显式保留 `未评价` 状态。
4. **无步骤诊断数据**：显示 `本次课堂暂时没有可用的环节诊断`，不以 0 图表占位。
5. **无待处理工作**：显示积极但克制的完成态：`本次课堂的后续工作已清空`，不使用庆祝型大插画。

---

## Visual guardrails

1. 继续遵守 Stitch / `DESIGN.md` 的 teacher-facing 语言：单一渐变主舞台、tonal secondary panels、无 1px divider、Lexend、ambient shadow。
2. 不把 recap 做成通用 admin analytics dashboard；首屏以“本节课刚结束”的复盘语境为主，而不是“数据中心”。
3. 不以 chart-first 方式呈现核心结论；headline metrics 必须配中文标签、原始人数或分母说明，并能继续 drill down。
4. 不引入第二个 hero 来承载 step diagnostics、history list 或 `/teacher/review` 引流。
5. 不让 `/teacher/review` 入口在视觉上压过 student-first recap；如果存在跳转，只能是次级按钮或行内链接。

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
