---
phase: 32
slug: end-to-end-hardening-and-milestone-proof
status: approved
shadcn_initialized: false
preset: none
created: 2026-05-16
reviewed_at: 2026-05-16T00:00:00Z
---

# Phase 32 — UI Design Contract

> 面向 Phase 32 的 milestone proof UI 合同。目标是在不新增 dashboard 或第二条
> runtime 主路由的前提下，把现有 launch、player、classroom、inspector 收口成
> 一条可复演示、可恢复、可排障的 proof surface 链路。

---

## Design system

| Property | Value |
|---|---|
| Component library | existing repo surfaces + local UI primitives |
| Icon library | `lucide-react` |
| Font | Lexend |
| Visual language | tonal surfaces, one clear stage hero, restrained gradient emphasis |

来源：`DESIGN.md`、`src/components/surfaces/classroom-launch-surface.tsx`、
`src/components/learning/classroom-runtime-client.tsx`、
`src/components/classroom/classroom-control-panel.tsx`、
`src/components/surfaces/runtime-inspector-surface.tsx`。

---

## Source decisions used

| Source | Decisions translated into UI contract |
|---|---|
| `32-CONTEXT.md` | canonical teacher-launched proof、terminal submit posture、failure recovery、classroom-first feedback、inspector second-step drill-down |
| `ROADMAP.md` | Phase 32 必须在现有 surfaces 上完成 proof，不新增 milestone dashboard |
| `REQUIREMENTS.md` | 对齐 `RHOST-04`：学生在既有学习流里完成真实互动并提交结构化结果 |
| `29-UI-SPEC.md` | 继续沿用 shared Runtime Host 的 tonal shell、surface-specific cue 和 no-line rule |
| `31-CONTEXT.md` | inspector 保持独立页面 + unified timeline + `runtimeSessionId` 默认锚点 |

---

## Proof surface chain

Phase 32 的产品级 proof 固定经过四个已有 surface：

1. `/teacher/editor` / 已发布 lesson 作为 proof 源头
2. `/teacher/launch` 作为 proof 入口与课堂发起面
3. `/classroom` 与 `/student/player` 作为 first confirmation / first failure 面
4. `/settings/labs/runtime-inspector` 作为第二步排障与 trace review 面

禁止：

1. 新建 milestone dashboard
2. 把 `/student/player` 直达变成同级主证明路径
3. 把 inspector 做成 `/classroom` 内嵌主视图

---

## Submit terminal posture contract

### Student runtime host

submit 成功后，runtime surface 必须进入明确 terminal state：

1. 主输入区锁定，只读显示
2. `保存当前状态` 立即禁用
3. 不再出现“继续编辑后再提交”语义
4. 显示本次结构化提交摘要
5. 显示成功确认 copy

### Required success copy

| Element | Copy |
|---|---|
| Success heading | 已提交本次互动结果 |
| Success body | 你的观察结论和当前把握度已经记录到课堂中，老师现在可以在课堂面板看到你的完成状态。 |
| Summary label | 本次提交摘要 |

### Forbidden posture

1. submit 成功后仍保留可编辑 textarea/select
2. save 与 submit 同时可用
3. 只弹 toast，不留下页面内成功态

---

## Failure recovery contract

### Student-side

save 或 submit 失败时：

1. 学生停留在当前 runtime surface
2. 当前草稿与摘要继续可见
3. 明确告诉学生失败的是哪一个动作
4. 主 CTA 固定为 `重试刚才的操作`
5. 不自动跳转上一页，也不自动跳转 inspector

### Required failure copy

| Situation | Copy |
|---|---|
| Save failed | 当前状态暂未保存成功，请直接重试保存，系统会保留你刚才填写的内容。 |
| Submit failed | 本次互动结果暂未提交成功，请重试当前提交；老师会先在课堂面板看到异常状态。 |
| Retry CTA | 重试刚才的操作 |

---

## Classroom first-feedback contract

`/classroom` 是教师看到 proof 成功或异常的第一界面。

要求：

1. 当前运行面板必须能显示学生 runtime submit 已完成或 submit 异常的即时提示
2. 若已拿到 `runtimeSessionId`，可显示 inspector drill-down CTA
3. 该 CTA 是次级排障动作，不压过 live classroom 主舞台
4. 成功提示强调“学生已完成当前互动提交”，而不是内部 runtime 术语

推荐 copy：

- `已有学生完成当前互动提交`
- `当前互动结果待重试，可进入运行排查`
- `查看运行轨迹`

---

## Inspector drill-down contract

inspector 仍是独立 operator 页面，但需要更像 proof 第二步，而不是孤立实验室页。

要求：

1. 页面默认聚焦由 query 提供的 `runtimeSessionId`
2. 首屏必须看得出当前看的就是刚才那次 proof session
3. 允许显示轻量 proof context（runtime id、actor scope、selected session）
4. 不新增 tab，不回退到 overview-first posture

推荐 copy：

- `当前 proof 会话`
- `查看本次运行轨迹`
- `沿时间线排查治理、传输与消费状态`

---

## Launch entry contract

`/teacher/launch` 需要对 canonical demo path 更可发现，但不能变成 demo hub。

要求：

1. 在现有 launch surface 内给出轻量 proof affordance
2. 文案明确说明“可使用 seeded demo lesson 演示完整 runtime proof”或等价含义
3. 该 affordance 是辅助发现，不是第二个 hero
4. 继续以已发布课时 + 班级启动为唯一主操作

---

## Spacing and sizing

| Token | Value | Usage |
|---|---|---|
| sm | 8px | badge / inline status gaps |
| md | 16px | status block / summary block spacing |
| lg | 24px | host shell group spacing |
| xl | 32px | major section separation |

Host-specific rules:

1. terminal summary block 使用 `surface-container-low` 或 `surface-container-lowest`
   的 inset card，不新增边框
2. failure / success messages 应在 host shell 或 classroom panel 内留出独立信息块
3. inspector deep-link block 不得挤压 unified timeline 主体

---

## Typography

| Role | Size | Weight | Usage |
|---|---|---|---|
| Success / failure heading | 20-24px | 600 | terminal and recovery state titles |
| Body | 14-16px | 400 | explanatory copy |
| Label | 12-14px | 600 | summary labels, state badges |

规则：

1. 不使用开发者控制台式密集小字作为核心状态
2. proof summary 优先让教师/学生看懂结果，而不是暴露 internal schema 名称

---

## Color

| Role | Value | Usage |
|---|---|---|
| Dominant | existing `surface` / `surface-container-lowest` | page floor and main cards |
| Secondary | existing `surface-container-low` | summary, status, and inset blocks |
| Accent | primary gradient / primary tokens | canonical CTA and selected proof focus |
| Success | semantic green already used in repo | submit success confirmation |
| Warning | semantic amber | degraded but recoverable states |
| Destructive | semantic red | submit/save failures only |

规则：

1. 不引入 neon / terminal / debug-console 风格
2. 成功与失败必须在 tonal language 内表达，不破坏教育产品语言

---

## Visual guardrails

1. 不新增 milestone dashboard 或 demo hub 页面
2. 不让 inspector CTA 在 `/classroom` 中变成主 CTA
3. 不在成功后仍显示可保存/可编辑姿态
4. 不把失败恢复设计成跳出当前学习上下文
5. 不使用 1px divider lines，继续遵守 no-line rule

---

## Checker sign-off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Terminal submit posture: PASS
- [ ] Dimension 4 Failure recovery: PASS
- [ ] Dimension 5 Classroom-first proof posture: PASS
- [ ] Dimension 6 Inspector handoff safety: PASS

**Approval:** approved
