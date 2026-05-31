---
phase: 20
slug: help-center-and-developer-guides
status: draft
shadcn_initialized: false
preset: none
created: 2026-05-11
---

# Phase 20 — UI Design Contract

> 面向 Phase 20 的帮助中心 UI 合同。目标是在产品内交付正式 `/help`
> 帮助中心，先完成“教师 / 开发者”受众分流，再通过独立子页承载开发者
> 详细指南，且全程继续复用 teacher shell 与现有视觉语言。

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | 自定义 UI primitives + Radix patterns |
| Icon library | lucide-react |
| Font | Lexend |

来源：`DESIGN.md`、`src/components/shell/teacher-sidebar-shell.tsx`、
`src/components/surfaces/settings-surface.tsx`、
`src/components/surfaces/plugin-marketplace-surface.tsx`。

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | icon 与标签内小间距 |
| sm | 8px | badge、辅助文本、紧凑按钮 |
| md | 16px | 默认内容间距 |
| lg | 24px | section 内部留白 |
| xl | 32px | 页面主模块分隔 |
| 2xl | 48px | overview 大块分区间距 |
| 3xl | 64px | hero 与主内容层之间呼吸感 |

帮助中心是内容型页面，但不是窄栏长文档。正文宽度必须保持 teacher-facing
surface 节奏，优先使用卡片分组、双列摘要和块状导航，而不是单列超长文章。

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.75 |
| Label | 14px | 600 | 1.4 |
| Heading | 28px | 600 | 1.25 |
| Display | 40px | 600 | 1.15 |
| Code caption | 13px | 600 | 1.5 |

约束：

1. 教师帮助区和开发者指南共用同一标题体系，不新增 docs-only 排版系统。
2. 正文以可读性优先，段落行高可略高于 dashboard/card 页面。
3. 教师帮助区不得出现代码块，因此不需要为教师页设计代码视觉层级。

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #f5f7f9 | 帮助页主背景、shell floor |
| Secondary (30%) | #eef1f3 | section、导航卡、目录卡 |
| Accent (10%) | #0050d4 / #7b9cff | 主入口、当前页、高优先 CTA、代码区强调 |
| Boundary note | #bc6c25 | “边界 / 受限” 提醒 |
| Future note | #5b6b8c | “未来扩展” 提醒 |

约束：

1. 延续 tonal surfaces 与无 1px divider 规则。
2. “当前可用 / 受限边界 / 未来扩展” 通过 surface tone、badge 和文案表达，
   不依赖表格描边或 warning box 堆砌。
3. 代码块只在开发者子页使用，底色可更深，但外层仍需嵌入 teacher-facing
   tonal card，而不是整页切换为 docs dark theme。

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| `/help` page title | 帮助中心 |
| Overview hero eyebrow | Help center |
| Overview hero title | 在产品内找到教师使用说明与开发接入指南 |
| Teacher split title | 我是教师 |
| Developer split title | 我是开发者 |
| Current state badge | 当前可用 |
| Boundary badge | 使用边界 |
| Future badge | 后续扩展 |
| Developer guide aside title | 本页覆盖 |

约束：

1. 语气必须是产品说明，不写 marketing slogan。
2. 所有 future 内容必须显式使用“后续扩展”或等价标签，禁止写成现在时。
3. 教师帮助只讲“做什么、去哪里、当前有什么限制”，不讲实现细节。
4. 开发者指南可以引用 `manifest`、`hook`、`action`、`theme runtime` 等术语。

---

## Route architecture contract

本阶段采用严格双层信息架构：一个总览页加若干独立详细子页。

### Required routes

| Route | Audience | Page role | Density |
|-------|----------|-----------|---------|
| `/help` | 教师 + 开发者 | 总览入口、角色分流、子页导航 | medium |
| `/help/plugins` | 开发者 | 插件开发详细指南 | high |
| `/help/themes` | 开发者 | 主题开发详细指南 | high |
| `/help/actions-interfaces` | 开发者 | schedule 扩展 actions / interfaces 指南 | high |

说明：

1. 本期不要求把教师帮助拆成单独长文子页；教师帮助以 `/help` 首页中的简洁
   产品使用区承载即可。
2. 详细子页最少只落上表 3 个开发者页，满足锁定范围。
3. 若实现时需要英文 slug，可保持上表；页面中文标题另配，不暴露 docs 风格
   文件命名给最终用户。

---

## Shell integration contract

当前代码中 `TeacherSidebarShell` 挂在 `/teacher` 路由组与 `/settings` layout 复用
路径上，而侧边栏入口实际指向根路径 `/help`。Phase 20 必须解决这个接入缝隙。

### Mandatory integration rules

1. `/help` 与所有 `/help/*` 子页必须继续呈现在 `TeacherSidebarShell` 中。
2. 不允许把 `/help` 做成脱离 shell 的根级普通页面。
3. 不允许新建 docs-only layout、顶部站点导航、左侧 markdown 目录栏来替代
   teacher shell。
4. planner 必须先收敛一个 shell-compatible route 接入方案，再进入实现。

### Acceptable implementation directions

| Direction | Allowed | Reason |
|-----------|---------|--------|
| 把 `/help` 纳入 teacher-facing shell 可消费的路由布局 | yes | 与现有侧边栏入口及正式产品页定位一致 |
| 为 `/help` 扩展 route metadata / shell surface registry | yes | 符合 Phase 19 路由元数据路径 |
| 在 `/app/help` 下直接渲染脱离 shell 的内容页 | no | 违背 D-19 与 teacher-facing visual language |

---

## Navigation model

### Global path

`Sidebar /help 入口` → `/help` 总览页 → 开发者子页

### Required navigation semantics

| Location | Required behavior |
|----------|-------------------|
| Sidebar | 仍只保留 `/help` 一个入口；不新增新的 help 入口 |
| `/help` hero | 首屏必须先完成教师 / 开发者分流，不直接进入长正文 |
| Teacher section | 提供面向使用的快捷说明与产品入口，不承担详细技术文档 |
| Developer section | 提供 3 个详细指南入口卡片，并说明各页覆盖范围 |
| Detail page top area | 必须有返回 `/help` 的 breadcrumb 或返回链接 |
| Detail page in-page nav | 可有轻量目录摘要，但只能作为 page section 辅助，不得替代主 shell |

### Forbidden navigation patterns

1. 禁止在 `/help` 首页把教师说明和开发者文档混成同一长列表。
2. 禁止 detail page 再出现第三层深度路由，如 `/help/plugins/manifest`。
3. 禁止把子页入口做成外链 docs 或 GitHub 文档跳转。
4. 禁止在开发者页内再塞入教师 CTA，打断文档阅读流。

---

## Overview page contract

`/help` 是正式帮助中心首页，不是 markdown index。页面必须看起来像产品里的
一等内容页。

### Layout structure

| Region | Content |
|--------|---------|
| `page-header` | 标题“帮助中心”与简短说明，沿用 shell header 语义 |
| Hero section | 简述帮助中心用途、覆盖对象、当前事实来源 |
| Audience split | “我是教师”与“我是开发者”双卡并列或上下堆叠 |
| Teacher modules | 3-4 个简短使用模块，不放代码 |
| Developer modules | 3 个详细指南入口卡 + 覆盖范围摘要 |
| Trust note | 说明内容基于当前实现，并区分当前 / 边界 / 未来 |

### Visual density

| Block | Density | Notes |
|-------|---------|-------|
| Hero | low | 大标题 + 说明 + 1 组状态 badge |
| Audience split cards | medium | 是首页主要决策区，卡片尺寸要足够大 |
| Teacher help modules | medium | 一屏内可扫读，不进入长文 |
| Developer guide cards | medium-high | 需要包含覆盖主题、适合谁读、进入动作 |
| Trust note | low | 单个说明区块，压轴收口 |

### Audience split behavior

#### Teacher path

教师区块必须回答三个问题：

1. 去哪里完成常见操作。
2. 当前哪些能力已经存在。
3. 哪些内容属于开发者范围，不需要在这里展开。

教师区块推荐模块：

| Module | Content goal |
|--------|--------------|
| 使用帮助 | 说明插件、主题、schedule 扩展在产品中分别体现在哪里 |
| 当前可做 | 指向设置、插件市场、主题切换、schedule 页面等现有能力 |
| 使用边界 | 明确教师页不提供代码示例、不讨论底层 contract |

#### Developer path

开发者区块必须是首页的主导向区。

| Card | Must explain |
|------|--------------|
| 插件开发 | manifest、hook anchors、allowlisted actions、permission 边界 |
| 主题开发 | theme token、注册链路、ThemeInjector、teacher shell 消费路径 |
| Actions / interfaces | `schedule.assistant`、proposal-only 语义、允许动作与限制 |

每张卡至少包含：

1. 中文标题。
2. 一句覆盖范围描述。
3. “当前可用”标签。
4. 可选“包含代码示例”提示。
5. 进入详细页 CTA。

---

## Detail page template contract

所有 `/help/*` 子页共用同一内容模板，不分别发明三套 UI。

### Shared page structure

| Region | Required content |
|--------|------------------|
| Top return row | 返回 `/help` + 当前页标题 |
| Intro card | 本页读者、覆盖范围、相关事实来源 |
| Main narrative sections | 按“当前可用 → 运行链路 / 用法 → 边界”组织 |
| Code examples | 仅开发者页出现，放在正文主栏 |
| Side summary | 本页覆盖、关键约束、相关页面入口 |
| Future section | 单独收纳未来扩展方向，不能混入当前能力 |

### Shared visual pattern

1. 主栏阅读，右侧窄辅栏摘要，参考 `plugin-marketplace-surface` 的主内容 + aside
   结构。
2. section 之间靠 tonal layer 和留白分隔，不使用 1px divider。
3. 代码块外面仍放在 rounded tonal card 中，保持产品页质感。
4. 右侧辅栏只做“覆盖范围 / 关键术语 / 跳转相关页”摘要，不承载正文主信息。

---

## Detail page specifics

### `/help/plugins`

本页是插件开发指南，不是 marketplace 使用说明。

#### Required section order

1. 本页说明：适合谁、覆盖哪些代码路径。
2. 当前可用：manifest 结构、hook anchors、allowlisted actions、permission requirements。
3. 运行链路：`registerPluginManifestAction` / school scope / enable path /
   hook dispatch / audit。
4. 最小示例：最小 `manifest` 与 action payload 示例。
5. 使用边界：无 arbitrary JS、无 direct DB、无 plugin-to-plugin、无外部 marketplace。
6. 后续扩展：保留为未来，不写成现有能力。

#### Required emphasis

| Topic | Emphasis |
|-------|----------|
| Hook anchors | 明确当前 anchors 真实值，不写想象中的扩展点 |
| Action allowlist | 必须与 `src/server/plugins/registry.ts` 对齐 |
| Permission requirements | 必须说明权限是 allowlisted、受控执行 |
| School scope | 必须强调 school-scoped activation |

### `/help/themes`

本页是主题开发与生效链路指南，不是单纯 token 字段表。

#### Required section order

1. 本页说明：主题指南覆盖范围。
2. 当前可用：`manifest.theme`、theme tokens、validation status。
3. 运行链路：`registerThemeTokensAction` / `setActiveThemeAction` /
   `ThemeInjector` / teacher shell。
4. layout contract：`shell`、`pages`、fallback、school scope 边界。
5. 最小示例：最小 theme token / page override 片段。
6. 使用边界：仅 Lexend、无独立 docs layout、必须走现有 runtime。
7. 后续扩展：light/dark、多市场等未来方向单列。

#### Required emphasis

| Topic | Emphasis |
|-------|----------|
| Runtime path | 必须完整串起 `manifest.theme -> registerThemeTokens / setActiveThemeAction -> ThemeInjector -> teacher shell` |
| Layout contract | 必须讲清 route surface、fallback、required regions |
| Scope | 必须强调 school-scoped theme visibility |

### `/help/actions-interfaces`

本页聚焦当前开放的 schedule 扩展边界，不扩写成全平台 API 文档。

#### Required section order

1. 本页说明：为什么只覆盖 schedule 扩展相关接口。
2. 当前可用：`schedule.assistant` hook、proposal actions、annotation / draft / proposal 类型。
3. 运行语义：proposal-only，不直接写 runtime schedule。
4. 最小示例：action payload 与结果示例。
5. 使用边界：未开放 direct runtime write、未开放全系统 DAL/Server Actions。
6. 后续扩展：未来可能开放的扩展方向，但明确未实现。

#### Required emphasis

| Topic | Emphasis |
|-------|----------|
| Proposal-only | 这是本页最高优先级约束 |
| Current hook | 当前只写 `schedule.assistant`，不能暗示更多已开放 hooks |
| Allowed actions | 必须与 registry allowlist 精确对齐 |

---

## Content state labeling contract

帮助中心所有页面必须显式标记内容状态。

| State | UI treatment | Meaning |
|-------|--------------|---------|
| 当前可用 | accent / primary tone badge | 已在代码与运行时中存在 |
| 使用边界 | warm neutral badge or inset note | 已有限制、禁止或不支持 |
| 后续扩展 | muted secondary badge | 有规划或可演进，但当前不可用 |

约束：

1. 每个详细页至少出现一次这 3 类状态中的前两类。
2. 若出现未来内容，必须单独成块，位于正文后部。
3. 不允许在同一段内混写“当前可用”和“未来计划”，导致读者误读。

---

## Teacher-facing content rules

教师帮助区必须保持轻量，不做技术教育。

### Required rules

1. 不放代码块。
2. 不放 schema 字段表。
3. 不解释 hook、DTO、DAL、Server Action 内部实现。
4. 可以链接到现有产品页，如 `/settings`、`/settings/plugins`、`/teacher/schedule`
   等真实入口。
5. 说明重点是“你能做什么”和“当前有哪些边界”。

### Forbidden rules

1. 禁止把教师区做成开发者页的摘要版复制。
2. 禁止出现 `manifest.theme`、`dispatchPluginAction()` 这类底层实现名词堆叠。
3. 禁止为了对齐开发者指南而强行增加长正文。

---

## Developer-facing content rules

开发者页必须具备“足够可用但不过度承诺”的技术密度。

### Required rules

1. 代码示例只给最小可理解片段。
2. 示例必须与当前 schema、allowlist、scope 和 runtime 路径一致。
3. 说明顺序优先是“入口 / 运行链路 / 限制”，不是只列字段。
4. 右侧 aside 中要有“本页覆盖”与“不要误用”的摘要提示。
5. 可引用真实文件路径作为事实来源，但页面正文仍需对产品用户可读。

---

## Route metadata and shell registry boundary

Phase 19 已将 teacher-facing shell 约束到 route metadata 路径。Phase 20 的 UI
合同必须保证 `/help` 兼容这一架构，而不是回退到字符串特判。

### Required boundary

1. `/help` 及其子页在 shell system 中必须拥有明确 route identity。
2. 如果现有 `TEACHER_THEME_ROUTE_KEYS` 不包含 `/help`，plan-phase 必须补齐 route
   metadata 与 surface 定义。
3. 新增 `/help` 路由时，`Sidebar` 的现有 `/help` 入口必须能正确高亮或通过
   `activePath` 反映当前子页状态。
4. 不允许在 shell 组件里硬编码 `pathname.startsWith("/help")` 作为唯一长期方案。

---

## Regression contract for planner and executor

计划与实现必须至少验证以下回归点：

1. `/help` 首页在 teacher shell 内渲染，而不是外链 docs 或脱离 shell 的普通页。
2. 首页首屏先看到“教师 / 开发者”分流，而不是直接长文正文。
3. `/help/plugins`、`/help/themes`、`/help/actions-interfaces` 三个子页都存在。
4. 教师帮助区没有任何代码示例。
5. 开发者指南包含“当前可用 / 使用边界”，并在需要时单独标出“后续扩展”。
6. `schedule` 指南明确写明 proposal-only，不能误导为 direct runtime write。
7. 详细页依旧使用 teacher-facing tonal surfaces，不引入 docs-only UI。
8. 新增 `/help` route 接入与 Phase 19 route metadata 体系兼容，不回流到
   `TeacherSidebarShell` 内部业务特判。

---

## Implementation notes for plan-phase

以下 UI 决策已锁定，`gsd-plan-phase 20` 应直接承接：

1. `/help` 首页承载教师 / 开发者分流。
2. 开发者详细页固定为 3 个：插件、主题、actions/interfaces。
3. 教师帮助区留在首页，不扩成独立长文站点。
4. `/help` 与子页都必须继续复用 teacher shell。
5. 页面表现必须更像结构化产品内容页，而不是 markdown 文档站。

---

## Checker sign-off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visual hierarchy: PASS
- [ ] Dimension 3 Navigation: PASS
- [ ] Dimension 4 Shell integration: PASS
- [ ] Dimension 5 Content state labeling: PASS
- [ ] Dimension 6 Registry safety: PASS

**Approval:** pending
