---
phase: 29
slug: runtime-host-and-html-courseware-pilot
status: approved
shadcn_initialized: false
preset: none
created: 2026-05-16
reviewed_at: 2026-05-16T00:00:00Z
---

# Phase 29 — UI Design Contract

> 面向 Phase 29 的 Runtime Host 与 HTML courseware pilot UI 合同。目标是在不打破
> 既有 teacher preview、student player、classroom live console 视觉语言与边界的
> 前提下，把同一个 sandboxed runtime host 稳定嵌入三类 surface。

---

## Design system

| Property | Value |
|---|---|
| Component library | custom UI primitives + existing repo surfaces |
| Icon library | lucide-react |
| Font | Lexend |
| Visual language | tonal surfaces + one stage hero + restrained gradient emphasis |

来源：`DESIGN.md`、`src/components/surfaces/teacher-lesson-preview-surface.tsx`、
`src/components/surfaces/player-surface.tsx`、
`src/components/surfaces/classroom-console-surface.tsx`、
`src/components/learning/classroom-runtime-client.tsx`。

---

## Source decisions used

| Source | Decisions translated into UI contract |
|---|---|
| `STATE.md` | teacher/classroom 保持单一主舞台，次级模块全部回落 tonal cards；student/player 保持沉浸式主舞台；中文界面默认 |
| `ROADMAP.md` | Phase 29 要在 preview、player、classroom 三类 surface 内交付同一个 sandboxed runtime host |
| `REQUIREMENTS.md` | 对齐 `RHOST-01`、`RHOST-02`、`RHOST-03`，不越界到 capability governance 和 transport inspector |
| `28-CONTEXT.md` | runtime bootstrap 只给最小上下文，save 与 submit 语义分离，runtime 不得成为新的 truth owner |
| Current surfaces | teacher preview 已是 draft-only，player 已是 shell/personal split，classroom 已是 same-route live console |

---

## Runtime host shell contract

所有 surface 中的 Runtime Host 必须共享同一组视觉与交互规则。

固定结构：

1. **Host chrome**：标题、状态 badge、可选运行说明。
2. **Sandbox frame container**：真正承载 iframe 的区域。
3. **Host status row**：加载中、已连接、恢复中、提交成功、提交失败。
4. **Fallback panel**：bootstrap 失败、runtime 不可用或 sandbox 初始化失败时显示。

要求：

1. host shell 外层必须是 tonal surface，不能把 iframe 裸露在页面上。
2. iframe 区默认需要稳定最小高度，避免页面首屏跳动。
3. loading、error、reconnect 都显示在 host shell 内，而不是散落成 route-level toast。
4. 运行态信息只说明“当前正在加载/同步/提交什么”，不泄露内部 schema 名或 bridge 实现术语。

---

## Teacher preview contract

### Role

teacher preview 里的 Runtime Host 只表达“教师草稿下该 runtime step 的预览长什么样”，
不是 live classroom，也不是 student personal state。

### Required UI cues

1. badge 明确写出“教师草稿预览”或等价文案。
2. runtime 区显式说明“不包含学生进度与课堂运行态”。
3. 若 step 为 runtime-capable，应在该 step card 内显示 host shell，而不是只显示纯文本 body。
4. preview 中不出现提交次数、恢复态、学生视角完成状态。

### Copy rules

- 推荐文案：`运行预览`、`草稿课件预览`、`当前仅模拟宿主加载，不读取课堂实时数据`。
- 禁止文案：`sessionId`、`runtime submit bridge`、`capabilityContext`。

---

## Student player contract

### Role

student player 中的 Runtime Host 是当前步骤主舞台的一部分，必须服从既有的
`activity guidance -> expected output -> 提交要求 -> 当前状态 -> 主动作区` 结构。

### Required integration rules

1. runtime-capable step 仍显示在当前活动壳内，不绕开 `StepActivityShell`。
2. runtime host 是主动作区的一部分，而不是独立第二舞台。
3. 如果老师锁定课堂，host 仍可完成本步骤互动，但不能让学生绕过锁定跳转其它步骤。
4. reconnect / snapshot fallback banner 继续由 player 外层统一承载，不在 iframe 内重复做第二套。

### State cues

1. 首次 bootstrap：显示 `正在准备互动课件` 或等价文案。
2. save 成功：显示次级反馈，不得暗示“已正式提交”。
3. submit 成功：显示明确结果，例如 `已记录本次互动结果`。
4. runtime 不可用：退回 tonal fallback 卡，并告诉学生下一步怎么做。

---

## Classroom-compatible teacher stage contract

### Role

`/classroom` 中的 Runtime Host 是教师视角的课堂当前步骤舞台，不是新 teacher route。

### Required posture

1. 保持 `/classroom` 现有 live hero + control panels 的结构。
2. runtime host 只能嵌入 live classroom 当前步骤主区或相关 stage 区域。
3. teacher stage 中的 runtime host 必须能反映当前 classroom snapshot 更新。
4. 若 teacher 发送 lock/unlock 或 focus-step 相关更新，host shell 只负责反映结果，
   不把 teacher control 直接塞进 iframe 内实现。

### Visual rules

1. 课堂主舞台继续可以有更强的 gradient context，但 iframe 外壳仍须是可读的 tonal 容器。
2. 侧栏名册、干预、历史面板不因为 runtime host 引入而改成第二个 hero。
3. 运行状态 badge 保持教师操作语义，例如 `课堂运行中`、`已同步到当前环节`。

---

## Spacing and sizing

| Token | Value | Usage |
|---|---|---|
| sm | 8px | host 内部 badge 与标签间距 |
| md | 16px | host shell 常规内容间距 |
| lg | 24px | host shell 主要分组间距 |
| xl | 32px | host shell 与相邻卡片之间 |

Host-specific rules:

1. iframe 初始最小高度不低于 `320px`。
2. 桌面端推荐高度区间 `420px` 到 `720px`，由 height sync 更新。
3. 移动端和窄视口下，host 需优先保证完整宽度与可滚动页面，而不是追求固定大高度。

---

## Typography

| Role | Size | Weight | Usage |
|---|---|---|---|
| Host title | 20-24px | 600 | runtime block 标题 |
| Host status | 14px | 600 | 连接、提交、恢复状态 |
| Host helper copy | 14-16px | 400 | 预览说明、fallback 文案 |
| Embedded labels | 12-14px | 600 | small badges、surface-specific role cue |

规则：

1. 不在 host 内引入管理后台式多层级字重。
2. 与 iframe 无关的辅助说明保持次级。
3. 当前主动作、成功提交、错误恢复要用清晰短句，不写长段实现说明。

---

## Color

| Role | Value | Usage |
|---|---|---|
| Dominant | existing `surface-container-lowest` family | host shell 主容器 |
| Secondary | existing `surface-container-low` family | 说明块、状态块、fallback inset |
| Accent | existing primary tokens | 当前运行状态、主按钮、连接成功 |
| Warning | semantic amber | 预览限制、runtime degraded mode |
| Destructive | semantic red | bootstrap 失败、submit 失败且需教师/学生重试 |

规则：

1. 不新增 neon、terminal、developer-console 风格。
2. 不把所有状态都做成红色 warning。
3. iframe 外壳和页面其余 tonal cards 必须保持同一个教育产品语言。

---

## Copywriting contract

| Element | Copy |
|---|---|
| Preview host badge | 运行预览 |
| Player loading | 正在准备互动课件 |
| Player reconnect | 正在恢复课堂互动状态 |
| Submit success | 已记录本次互动结果 |
| Save success | 已保存当前进度，可稍后继续 |
| Generic fallback title | 当前互动课件暂不可用 |
| Generic fallback body | 你可以稍后刷新当前页面；若问题持续存在，请返回上一页后重新进入。 |

补充文案规则：

1. 预览强调“这是草稿预览，不是 live classroom”。
2. 学生端强调“现在做什么、结果是否已记录”。
3. 教师课堂端强调“当前是否已同步到课堂状态”。
4. 不直接暴露 `runtime`, `bridge`, `capability` 这类内部术语给终端用户。

---

## Interaction states

### Buttons and targets

1. host 外层所有按钮最小高度 44px。
2. 提交与重试按钮不能只放在 iframe 内部；host 至少要有可解释的外层状态反馈。
3. 如果某些动作完全在 iframe 内完成，host 仍要同步显示提交中/已提交/失败态。

### Loading and degraded states

1. bootstrap 中：显示 skeleton 或 tonal loading panel。
2. iframe message 超时：显示次级 warning 状态，并提供重试。
3. snapshot fallback：由 host 外层说明“当前显示的是最近一次课堂状态”。

### Accessibility

1. host shell 要有明确标题和状态文本。
2. 关键状态变化要能通过可访问文本读出。
3. fallback 按钮文案必须明确，例如 `重新加载互动课件`、`重新连接课堂`。

---

## Visual guardrails

1. 不把 runtime host 做成开发工具面板、浏览器控制台或黑底 hacker UI。
2. 不在 preview/player/classroom 三处做三种完全不同的 iframe 外壳风格。
3. 不让 iframe 边缘裸露出浏览器默认白边、黑边或 debug 文案。
4. 不新增第二条 classroom teacher runtime 主路径。
5. 不因为 runtime host 引入而打破 player 的沉浸主舞台或 classroom 的单主舞台节奏。

---

## Checker sign-off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** approved
