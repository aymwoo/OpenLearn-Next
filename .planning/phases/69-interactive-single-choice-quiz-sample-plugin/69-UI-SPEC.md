---
phase: 69
slug: interactive-single-choice-quiz-sample-plugin
status: draft
shadcn_initialized: true
preset: radix-nova
created: 2026-06-03
---

# Phase 69 — UI Design Contract

> 面向 Phase 69 的老师配置单选题 / 学生课堂作答 UI 契约。仅覆盖本 phase 必要界面，不扩展到 Phase 70+ 的统计复盘与 marketplace 生命周期界面。

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn |
| Preset | radix-nova（来源：`components.json`） |
| Component library | Radix primitives + 项目自定义 `ui/*` |
| Icon library | lucide |
| Font | Lexend（来源：`DESIGN.md` + `src/app/globals.css`） |

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | 选项标记、微型状态点、内联 icon gap |
| sm | 8px | label 与说明之间、按钮内紧凑间距 |
| md | 16px | 默认字段间距、卡内内容主间距 |
| lg | 24px | 卡片内 section 间距、题目与选项区分隔 |
| xl | 32px | 卡片与壳层之间主间距 |
| 2xl | 48px | modal / 答题主卡的大段留白 |
| 3xl | 64px | 页面级大段呼吸区，仅用于 shell 级布局 |

Exceptions: 交互控件最小点击高度 44px；老师端选项行最小高度 48px；学生端单选项卡最小高度 56px。

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Label | 14px | 600 | 1.4 |
| Heading | 20px | 600 | 1.2 |
| Display | 28px | 600 | 1.2 |

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#f5f7f9` | 课堂/备课外层背景、低压大底面 |
| Secondary (30%) | `#eef1f3` / `#ffffff` | tonal cards、配置区、答题卡、内层容器 |
| Accent (10%) | `#0050d4` + `#7b9cff` | 主 CTA、当前作答选中态、老师显式控制态、提交成功高亮 |
| Destructive | `#b31b25` | 关闭题目、删除选项、非法配置提示 |

Accent reserved for: 老师端“保存题目配置”按钮、学生端“提交答案/更新答案”按钮、当前选中选项、课堂开放中状态 badge、老师显式锁定/当前控制提示。不得把 accent 用到普通说明文字、容器描边或所有交互元素。

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | 保存题目配置 / 提交答案 |
| Empty state heading | 先完成这道单选题的设置 |
| Empty state body | 请填写题干、至少 2 个选项，并指定正确答案后再保存；保存后学生端才能在开课时冻结为课堂题目。 |
| Error state | 当前题目配置不完整，请补全题干、有效选项和正确答案后再继续。 |
| Destructive confirmation | 关闭答题：关闭后学生将不能继续改答；删除选项：仅可删除未被设为正确答案的空余选项。 |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none declared for this phase | not required |
| third-party | none | not applicable |

---

## Phase Scope and Source Locks

- 本 phase 只覆盖 `QUIZ-01` / `QUIZ-02` / `QUIZ-03`：老师配置单题单选、学生课堂内作答、append-only + `isLatest` 落库、全程治理可见。
- 不交付统计分布、正确率复盘、课后总结页；这些属于 Phase 70。
- 题目以 **classroom session 冻结快照** 为课堂真相源；老师课后修改备课配置不会反向影响已开课会话。
- 学生在题目开放时可改答；关闭或课堂切走后只读。
- UI 必须嵌入现有 authoring shell 与 classroom container，不重写整页框架。

来源：`69-CONTEXT.md`、`ROADMAP.md`、`REQUIREMENTS.md`。

---

## Existing Shell / Container Seam Contract

### 老师端接缝（authoring shell）

- 入口继续位于 `lesson-authoring-workspace.tsx` 既有 lesson flow 中；插件卡不新增独立页面。
- 交互承载位于现有 step editor modal 内，沿用现有两栏结构：左侧编辑、右侧学生视图预览。
- 插件专属卡必须显式标注“插件专属配置”与插件名，避免被误认成普通内置 quiz step 字段区。
- 不改动 authoring shell 的左侧资源库、主线 flow card、保存总流程按钮语义；只在选中本 plugin step 后进入专属配置体验。

### 学生端接缝（classroom / player container）

- 学生作答卡挂在现有 `player-surface` / runtime client 的主内容区内，不新建独立课堂页。
- 继续服从当前 runtime 规则：`locked` 时强制停留在当前题目；`unlocked` 时允许导航，但老师推荐步骤仍高亮。
- 课堂状态文案、重连条、老师控制提示继续复用现有 runtime 顶部状态带，不重复发明第二套系统提示。

### 教师控课接缝（classroom control）

- Phase 69 的老师控课只需支持“开放答题 / 关闭答题”语义映射到当前会话状态；不额外引入实时结果大屏。
- 名册、未完成名单、已提交人数仍在现有 classroom control / roster tonal panels 内显示；quiz plugin 自己只提供答题状态所需字段，不重做 teacher shell。

来源：`lesson-authoring-workspace.tsx`、`lesson-step-editor.tsx`、`classroom.ts`、`classroom-control-panel.tsx`、`classroom-roster-panel.tsx`、`classroom-runtime-client.tsx`。

---

## Teacher UI Contract — 插件专属配置卡

### 信息架构

老师端配置卡固定分为 4 个区块，自上而下：

1. **插件身份头部**
   - 标题：`互动单选题 · 插件专属配置`
   - 副文案：`课堂开始时会冻结为本次 session 的题目快照`
   - badge：`Sample Plugin` / `单选题` / `2–4 个选项`

2. **题目主体区**
   - 字段顺序固定：题干 → 选项 A-D → 正确答案
   - 选项默认显示 2 行，最多显示 4 行
   - 未启用槽位以“未启用”占位显示，弱化呈现，不可选中为正确答案

3. **校验与冻结说明区**
   - 持续显示三条规则：`至少 2 个选项` / `正确答案必须命中已启用选项` / `已开课会话不会同步后续修改`
   - 校验失败时在字段下方原位报错，不使用 toast 作为唯一反馈

4. **操作区**
   - 主按钮：`保存题目配置`
   - 次按钮：`取消`
   - 保存中：`正在保存题目配置...`

### 视觉约束

- 配置卡容器使用 `bg-surface-container-low` 或 `bg-surface-container-lowest`，通过 tonal 层级分区；禁止 1px border。
- 插件身份头部可用轻玻璃感 badge 或柔和底色块，但不得做成 marketplace 卡片风格。
- 选项 A-D 左侧使用圆角字母 token（A/B/C/D），字母 token 用 secondary tonal 底，不用纯描边。
- 正确答案选择器必须一眼可见，不能埋进高级设置。
- 右侧学生预览卡继续保留，但内容改为“正式答题卡预览”，而不是普通 quiz 摘要。

### 交互约束

- 题干失焦或保存时触发非空校验。
- 当仅有 2 或 3 个有效选项时，正确答案下拉只展示已启用选项。
- 删除选项时，如果该选项当前是正确答案，先阻止并提示用户改选正确答案。
- 任何非法配置必须在老师端保存前被阻断，不能等到开课时才报错。
- 保存成功反馈采用内联状态文本，不弹全屏 modal。

---

## Student UI Contract — 课堂答题卡

### 卡片结构

学生端答题卡固定由以下区域组成：

1. **题目头部**
   - eyebrow：`课堂单选题`
   - 主标题：题干全文
   - 辅助文案：`请选择 1 个答案` / `本题已关闭` / `你已提交，可在开放期间修改`

2. **选项区**
   - 2–4 个纵向大卡选项
   - 每个选项包含：字母 token、正文、当前选中态
   - 不使用 radio 的浏览器默认样式；使用整卡可点击交互

3. **提交区**
   - 主按钮：开放未答时 `提交答案`；开放已答时 `更新答案`
   - 次信息：最近一次提交状态 / 已记录时间 / 仍可修改提示

4. **结果反馈区（仅本 phase 的最小反馈）**
   - 不展示全班统计
   - 只展示个人提交确认：`已记录你的答案` / `答案已更新`
   - 若课堂已关闭，则显示冻结提示，不展示统计图

### 视觉约束

- 答题卡是学生主舞台中的白色 / 浅 tonal 主卡，四周保留足够留白，营造“正式答题卡”而非轻投票条。
- 选项卡默认 `surface-container-low`，hover 提升到 `surface-container-high`；选中时改为 `primary` 的低饱和底 + 更强标题字重。
- 主 CTA 使用 blue gradient（`primary → primary_container`），full 圆角。
- 禁止用表格线、列表线、分割线切开各选项；用卡片间 12–16px 垂直间距区分。

### 交互约束

- 选项点击即本地选中，但**不自动提交**；必须点击主按钮后才算正式作答。
- 在开放状态下，若学生已有 latest 答案，重新选择后按钮文案变为 `更新答案`。
- 提交完成后保持可见确认状态，不清空当前选择。
- 若网络重连或 snapshot fallback，保留最近一次本地已提交选择，并等待 durable snapshot 对齐。
- 当老师关闭题目或课堂切走当前 step：
  - 选项立即变只读
  - 主按钮禁用
  - 状态文案切到 `本题已关闭，当前答案已冻结`

---

## Classroom State Contract

本 phase 只允许三种课堂答题状态，文案与视觉必须统一：

| State | Badge / 文案 | UI 行为 | 颜色语义 |
|------|---------------|---------|---------|
| 开放中 | `开放作答` | 可选项、可提交、可改答 | accent / primary 系 |
| 已关闭 | `已关闭` | 只读、按钮禁用、显示冻结说明 | secondary tonal + 弱化 accent |
| 已作答 | `已作答` | 开放中仍可改答；关闭后只读 | success 语义可用轻 tertiary，不可抢过主 accent |

补充规则：

- `开放中 + 未作答`：提示“请选择 1 个答案后提交”。
- `开放中 + 已作答`：提示“已记录，可在老师关闭前修改”。
- `已关闭 + 已作答/未作答`：都统一为冻结终态，不允许再触发提交动作。
- 不新增“公布答案”“统计生成中”等 Phase 70 才需要的状态。

---

## Visual and Interaction Constraints

1. **中文优先**：所有标签、按钮、错误文案、状态文案均用简体中文；保留技术字段英文仅限内部 key，不出现在界面正文。
2. **无 1px 分隔线**：配置区、选项区、状态区全部用 tonal 背景、阴影、留白切层。
3. **Tonal surfaces 优先**：不使用边框盒子堆叠。主卡 `#fff`，次卡 `#eef1f3`，强调块用 `#e7ebef`。
4. **CTA 必须是 glass/gradient 语言**：主 CTA 用渐变；浮层提示 / 状态带可用轻玻璃化处理。
5. **交互控件最小 44px**：老师端保存、删除、正确答案选择器；学生端选项卡与提交按钮均满足触达面积。
6. **状态反馈优先内联**：字段错误、提交成功、题目关闭都在原位说明；toast 只能作补充。
7. **不制造第二信息中心**：authoring 总保存提示、classroom 顶部连接状态、runtime 锁定提示继续由原有 shell 承担；插件组件只负责 plugin 特有语义。
8. **正式答题感**：学生端语气与视觉应强调“有标准答案的课堂题”，不得做成轻量 poll、emoji 投票或娱乐化卡片。

---

## Acceptance Criteria

### A. 老师端插件专属配置卡

- [ ] 在现有 authoring shell 内可进入 quiz sample plugin 的专属配置卡，不新增独立页面。
- [ ] 配置卡明确展示插件身份，不会与普通测验字段区混淆。
- [ ] 老师可配置题干、2–4 个选项、正确答案；未启用槽位不显示为可答项。
- [ ] 非法配置在保存前即被原位拦截：题干为空、有效选项不足 2 个、正确答案不在启用项内。
- [ ] 保存按钮与保存中反馈符合本 spec 文案与视觉层级。

### B. 学生端课堂答题卡

- [ ] 学生在现有 classroom/player 容器内看到正式答题卡，而非独立页面或投票条。
- [ ] 选项以整卡形式点击，支持 2–4 个选项展示。
- [ ] 点击选项不会自动提交；必须点击 `提交答案` / `更新答案`。
- [ ] 提交后给出内联成功反馈，并在开放期允许改答。

### C. 课堂状态

- [ ] 至少清晰覆盖 `开放作答 / 已关闭 / 已作答` 三种状态。
- [ ] 关闭后学生端立即只读，不能再改答。
- [ ] 已作答但未关闭时，界面明确说明仍可修改 latest 答案。

### D. 壳层接缝

- [ ] 不重写 `lesson-authoring-workspace` 外层布局。
- [ ] 不重写 `player-surface` / runtime shell 外层布局。
- [ ] 不复制已有课堂连接状态、锁定状态系统，只接入现有状态条与 snapshot 语义。

### E. 视觉一致性

- [ ] 全界面使用 Lexend、中文优先、无 1px divider、tonal surfaces、glass/gradient CTA。
- [ ] accent 仅用于本 spec 约定的关键元素，不滥用。
- [ ] 老师端与学生端都保持教育产品的“高端工作室”气质，而不是通用后台模板。

---

## Source Notes

| Source | Decisions Used |
|--------|----------------|
| `69-CONTEXT.md` | phase boundary、session freeze、2–4 选项、append-only latest、独立 plugin UI、teacher/student 体验目标 |
| `ROADMAP.md` | Phase 69 只做配置与作答，不做 70+ 统计与复盘 |
| `REQUIREMENTS.md` | QUIZ-01 / QUIZ-02 / QUIZ-03 验收范围 |
| `DESIGN.md` | Lexend、无 1px 线、tonal depth、glass/gradient CTA |
| `components.json` | shadcn 已初始化、preset=`radix-nova`、icon=`lucide` |
| `src/app/globals.css` | 全局色板、spacing token、radius token |
| `lesson-authoring-workspace.tsx` | authoring shell 接缝、modal step editor 入口、现有 tonal authoring 语言 |
| `lesson-step-editor.tsx` | 既有 quiz/voting 编辑器模式、左右栏编辑+预览结构 |
| `classroom.ts` | classroom snapshot / `currentVotingRound` / state 语义 / participant 状态 |
| `classroom-runtime-client.tsx` | 学生端 runtime 状态条、locked/unlocked、reconnect 文案接缝 |
| `classroom-control-panel.tsx` / `classroom-roster-panel.tsx` | 教师控课、未完成名单、已提交人数所在壳层 |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
