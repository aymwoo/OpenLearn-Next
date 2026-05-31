# Phase 20: Help center and developer guides - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段交付产品内正式帮助中心 `/help`，让教师和开发者都能在应用内找到一份与当前代码库实现一致的中文帮助页，而不需要反向阅读源码或散落文档。

`/help` 不是纯 docs 跳转页，也不是新的插件市场、主题编辑器或开放平台。本阶段聚焦四件事：
1. 定义 `/help` 的正式页面结构与信息架构。
2. 以代码库当前真实实现为准，编写插件开发指南。
3. 以代码库当前真实实现为准，编写主题开发指南。
4. 说明当前可用的 schedule 相关扩展 actions / hooks / 用法边界，并给出足够具体的示例。

本阶段不扩展新的插件能力、不新增新的主题 contract、不把产品帮助中心演变成完整外部文档站，也不新增多入口分发体系；入口保持当前侧边栏 `/help` 单入口预期。

</domain>

<decisions>
## Implementation Decisions

### Audience and page role
- **D-01:** `/help` 是单个正式产品页，同时服务两类受众：教师用户与开发者。
- **D-02:** `/help` 首页必须先做受众分流，在同一页面中清晰区分“我是教师”和“我是开发者”两个入口区块，而不是直接混排长文。
- **D-03:** 教师帮助与开发者指南都保留在同一帮助体系下，但本阶段的主体内容重心偏向开发者指南；教师帮助保留为简洁、实用、面向产品使用的说明层。

### Information architecture
- **D-04:** 页面信息架构采用双层结构：`/help` 作为总览入口页，详细内容拆分为独立子路由，而不是把所有内容塞进一个超长单页。
- **D-05:** 至少应拆出插件指南、主题指南、actions/interfaces 指南这三类详细页或等价子页面；`/help` 总页负责概览、角色分流、进入各子页。
- **D-06:** `/help` 总页与子页仍需保持统一帮助中心心智，不做“产品页 + 外链 docs”混搭；详细页应继续沿用产品内 teacher-facing visual language。

### Content scope and truth source
- **D-07:** 内容范围以“当前已实现能力”为核心，但可以额外记录推荐未来扩展方向或边界提醒；这些未来方向必须明确标记为后续扩展、不可伪装成当前可用能力。
- **D-08:** 所有帮助内容都必须以当前代码实现与已存在规划文档为事实来源，优先忠实反映现状，而不是写理想化接口说明。
- **D-09:** 帮助页中必须明确区分“当前可用”“受限/边界”“未来扩展方向”，避免教师或开发者误判系统已有能力。

### Code examples strategy
- **D-10:** 代码示例采用差异化策略：插件与主题开发指南中可以直接放代码示例；教师帮助区不放代码示例。
- **D-11:** 示例必须服务于当前 manifest/theme/action contract 的理解，优先给最小可运行或最小可理解片段，而不是大段无上下文样板代码。
- **D-12:** 示例要与当前 schema、allowlist、Server Actions、school scope 和安全边界保持一致，不能复用已经过时的旧接口形态。

### Entry expectations
- **D-13:** 本阶段产品入口只保留现有侧边栏 `/help` 单入口，不额外要求在 settings、plugin marketplace、theme settings 或其他页面再新增帮助入口。
- **D-14:** 由于侧边栏已存在 `/help` 入口，本阶段需要把 `/help` 视为教师端正式一等页面，而不是二级附属弹窗或外部链接。

### Data interfaces and actions scope
- **D-15:** “可用的数据接口和 actions” 文档范围锁定为：插件扩展能力、主题运行链路相关能力，以及 schedule 扩展相关 hooks/actions；不要求把全系统所有 DAL/Server Actions 都纳入 `/help`。
- **D-16:** 插件部分必须覆盖当前 hook anchors、allowlisted actions、permission requirements、proposal/result 语义和 school-scoped activation path。
- **D-17:** 主题部分必须覆盖当前 `manifest.theme -> registerThemeTokens / setActiveThemeAction -> ThemeInjector -> teacher shell` 运行链路，以及 layout contract / fallback / school scope 边界。
- **D-18:** schedule 扩展部分必须明确它是 proposal-only 的扩展边界，只描述当前已开放的 `schedule.assistant` hook 与 schedule proposal actions，不把未开放的直接 runtime write 能力写成可用接口。

### Product and UI constraints
- **D-19:** `/help` 总页和详细页继续复用 teacher shell 与既有产品视觉语言，不新造一套文档站 UI。
- **D-20:** 帮助页需要是结构化中文内容页，但仍然保持教育产品视觉气质：Lexend、tonal surfaces、无 1px divider、与现有 teacher-facing surfaces 协调。
- **D-21:** 由于本阶段包含正式新 route、总览页与多个详细页的信息架构和页面表现，进入 plan-phase 前建议补一个专用 UI gate，避免后续内容结构和页面层级在实现时漂移。

### Claude's Discretion
- `/help` 子路由的精确命名、总览页模块顺序、教师帮助区的具体粒度、以及示例代码长短，可由 planner 在不违背上述决策的前提下收敛。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/ROADMAP.md` — Phase 20 的目标、成功标准、3 个计划槽位，以及 `/help` 需同时服务教师与开发者的正式范围。
- `.planning/REQUIREMENTS.md` — 全局产品、安全、DAL、插件、主题与 schedule 扩展边界的正式需求来源。
- `.planning/STATE.md` — 已锁定的插件、主题、teacher shell、schedule proposal-only、中文界面与设计决策。
- `.planning/PROJECT.md` — 固定技术路线、设计语言、DAL + Server Actions 约束、以及 `/help` 必须遵守的项目级限制。

### Existing architecture and prior phase decisions
- `.planning/phases/16-theme-plugins-and-layout-orchestration/16-CONTEXT.md` — 主题 layout contract、teacher shell 单一路径、settings 结构摘要与 fallback 相关锁定决策。
- `.planning/phases/18-teaching-schedule-os/18-CONTEXT.md` — schedule 扩展必须保持 proposal-only、不能直接写 runtime schedule 的锁定决策。
- `.planning/phases/19-teacher-shell-route-metadata-system/19-CONTEXT.md` — teacher-facing shell 已走 route metadata + centralized shell resolver，`/help` 设计需与这一路径兼容。
- `.planning/phases/19-teacher-shell-route-metadata-system/19-UI-SPEC.md` — 最近一期 teacher shell UI gate 参考，可借鉴 UI gate 的输出粒度和约束方式。

### Plugin and theme docs the user explicitly asked to ground on
- `docs/plugin-system-review.md` — 当前插件系统已实现能力、生命周期、manifest 结构、action/hook 审计与历史设计背景。
- `docs/theme-system-design.md` — 当前主题注册表、校验、运行时注入、school scope 与主题数据结构设计背景。
- `docs/plugin-theme-implementation-plan.md` — 插件启用到主题注册、主题切换、ThemeInjector 和 settings 接入链路的实施背景。

### Current code contracts and runtime integration
- `src/lib/dto/resource-ai.ts` — `PluginManifestSchema`、`ThemeTokenRegistrySchema`、`PluginActionSchema`、hook anchor、proposal payload 与 DTO 合同的真实来源。
- `src/server/plugins/registry.ts` — 当前 `PLUGIN_HOOK_ANCHORS`、`PLUGIN_ACTION_ALLOWLIST`、permission requirements、dispatch 行为与 schedule proposal actions 的真实来源。
- `src/actions/plugin-actions.ts` — 插件注册、启停、查询、运行 hook 的 Server Actions 边界与输入 schema。
- `src/lib/dal/plugins.ts` — school-scoped 插件管理、enabled plugins by anchor、hook 审计、permission check 与 denial path 的真实实现来源。
- `src/actions/theme-actions.ts` — `setActiveThemeAction()`、`registerThemeTokensAction()` 的真实调用边界与缓存刷新路径。
- `src/lib/dal/themes.ts` — 有效主题查询、当前 actor theme runtime 解析、school scope 与 layout runtime 的真实实现来源。
- `src/components/theme/theme-injector.tsx` — 当前主题 CSS variable 与 layout runtime 注入路径。
- `src/components/shell/teacher-sidebar-shell.tsx` — 主题布局最终进入 teacher shell 的消费点。

### Product routing and entry points
- `src/components/shell/sidebar.tsx` — `/help` 入口已经存在于教师侧边栏，说明它是正式产品页。
- `src/app/(teacher)/teacher/layout.tsx` — 当前 teacher route 组使用 `TeacherSidebarShell` 的主 layout 入口。
- `src/app/settings/layout.tsx` — 共享 teacher shell 的次级 route consumer，可作为 `/help` 路由接入样式参考。
- `src/lib/navigation.ts` — 当前全局与 teacher navigation 项定义，帮助判断 `/help` 是否需要进入其他导航体系。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/shell/teacher-sidebar-shell.tsx`：现有 teacher-facing shell，可直接承载 `/help` 总页与详细页，不必新建 docs-only layout。
- `src/components/surfaces/settings-surface.tsx`：已有较成熟的“总览入口 + 卡片分区 + 说明文案” surface 语言，可复用于帮助中心首页的信息架构。
- `src/components/surfaces/plugin-marketplace-surface.tsx`：已有“Hero + 指标卡 + 主内容 + 侧栏说明”的 teacher-facing内容页模式，适合借鉴到开发指南子页。
- `src/lib/dto/resource-ai.ts`：当前插件与主题 contract 的单一 schema 来源，帮助页示例和字段说明必须对齐这里。
- `src/server/plugins/registry.ts`：当前 allowlisted hooks/actions 与 permission requirements 的单一真实来源，适合作为 actions/interfaces 文档主数据源。

### Established Patterns
- 当前产品里的正式页面都走 app route + shell + surface 组合，而不是独立文档系统；Phase 20 也应遵守这一产品内页面模式。
- 插件与主题能力都已经形成 `schema -> DAL/Action -> runtime` 的约束路径，说明帮助页文档也应沿这个顺序讲解，而不是只列字段。
- schedule 扩展已经明确是 proposal-only，这意味着帮助页必须把“建议/草案”与“直接写入”边界说清楚。
- 项目此前已有 `UI-SPEC.md` 作为复杂 teacher-facing 页面实现前的 UI gate，说明 Phase 20 可以沿用该工作流，而不是裸进 plan。

### Integration Points
- `src/app/**`：需要新增 `/help` 总页与若干详细子页 route。
- `src/components/surfaces/`：大概率需要新增 help center surface 与开发指南类 surface，保持产品内视觉一致。
- `src/components/shell/sidebar.tsx`：入口已存在，Phase 20 主要是把 route 真正接起来，而不是新加导航入口。
- `docs/*.md` + `src/lib/dto/*` + `src/actions/*` + `src/lib/dal/*`：规划时需要决定帮助页内容如何从这些真实来源提炼，避免实现后快速陈旧。

</code_context>

<specifics>
## Specific Ideas

- `/help` 首页先做“教师 / 开发者”角色分流，但仍保留在同一帮助中心里。
- 详细页拆分优先围绕三条主线：插件开发、主题开发、schedule 扩展 actions/interfaces。
- 开发者页里允许直接放代码示例；教师帮助区只保留使用说明、能力边界和相关页面入口，不放代码。
- 内容可以同时呈现“当前可用 + 边界限制 + 后续扩展方向”，但必须视觉和文案上明确区分，防止把 roadmap 愿景误写成现状。
- 入口预期保持最小化：仅用当前侧边栏 `/help` 单入口完成本期目标。

</specifics>

<deferred>
## Deferred Ideas

- 在 `/settings`、插件市场、主题设置页增加上下文帮助入口 — 有价值，但不属于本阶段锁定入口范围。
- 把 `/help` 演进为外部 docs 站、支持全文搜索、版本化文档或交互式 API explorer — 属于独立文档平台能力，不在本阶段范围。
- 把全系统所有 DAL / Server Actions 都纳入帮助中心 — 当前阶段只聚焦插件、主题和 schedule 扩展相关接口。

</deferred>

---

*Phase: 20-help-center-and-developer-guides*
*Context gathered: 2026-05-11*
