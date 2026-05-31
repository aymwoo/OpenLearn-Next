# Phase 16: Theme plugins and layout orchestration - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段把现有主题插件能力从视觉 token 切换扩展为声明式布局编排系统，
让 theme plugin 可以在既有 `manifest.theme -> ThemeInjector -> settings
switch -> teacher shell` 运行链路上，安全定义教师端导航壳层、页面级
region 编排、模块顺序与占比。

本阶段不引入任意脚本执行、任意 CSS 注入、平行主题运行路径，也不把
业务组件内部结构开放给主题重写。布局能力仍必须通过 allowlisted
regions、allowlisted page surfaces 和校验后的 manifest 数据生效。

</domain>

<decisions>
## Implementation Decisions

### 导航壳层与作用范围
- **D-01:** Phase 16 首发支持三种教师端主壳层组合：`left nav`、`top nav`、`top nav + left secondary rail`。
- **D-02:** 主题拥有一个 workspace 级默认壳层，但允许按页面覆写，不要求整个 `/teacher/**` 统一使用单一导航结构。
- **D-03:** 大多数 teacher-facing 页面都可覆写壳层；不预留 editor、launch、classroom runtime 等固定豁免页。
- **D-04:** 即使页面可覆写，布局编排也必须继续走 allowlisted route surface contract，不能变成任意页面自由拼装器。

### 页面编排覆盖范围
- **D-05:** Phase 16 的 page-surface orchestration 覆盖所有 teacher-facing 页面，而不是只覆盖 dashboard、settings 或少数入口页。
- **D-06:** 主题只允许改动页面级区域顺序与外层信息架构，不进入业务组件内部结构重排。
- **D-07:** 页面内的业务主模块实现、数据获取与交互语义仍由页面代码负责，主题只消费 allowlisted surface/module 映射结果。

### Layout contract 形态
- **D-08:** `manifest.theme` 需要从纯 token 描述扩展为 region-based contract，而不是继续停留在松散的 `layout: Record<string, string>`。
- **D-09:** 首发 allowlisted 顶层 regions 固定为：`primary-nav`、`secondary-nav`、`page-header`、`main-content`、`context-panel`、`page-footer`。
- **D-10:** 主题可控制 region 的顺序、位置、尺寸，并可对辅助 regions 做显隐控制，但 `primary-nav`、`page-header`、`main-content` 必须始终存在。
- **D-11:** region 内允许主题为每个 allowlisted region 选择模块集合、调整顺序并声明大小占比，但这些能力仅作用于页面级模块，不进入模块内部子结构。
- **D-12:** 模块大小占比不接受任意数值；只接受少量白名单比例枚举，例如 `30/70`、`40/60`、`50/50`、`60/40` 这类离散配置。

### Fallback 与设置页可理解性
- **D-13:** 当 theme layout 数据部分非法、缺失或与页面 surface 不兼容时，运行时采用按 region 局部回退，而不是整页回退或按模块逐项回退。
- **D-14:** 局部回退后的其余合法 regions 继续使用主题声明结果，保证 richer theme 在部分配置失效时仍可稳定降级。
- **D-15:** 设置页需要把 richer theme 的版式能力显示为结构摘要，例如“顶部导航 + 左侧辅栏 / 主内容 60:40 / 启用上下文侧栏”，而不是只保留一句风格描述。

### 沿用的既有约束
- **D-16:** 新布局能力继续沿用 school-scoped `manifest.theme` 注册、主题有效性校验、`activeThemeId` 切换与 `ThemeInjector` 注入链路，不新增平行主题系统。
- **D-17:** 主题插件仍必须是声明式 JSON，禁止 `eval()`、远程代码执行、任意 className 拼接和 unrestricted CSS injection。
- **D-18:** 主题布局 contract 必须通过 allowlist 校验后才能编译；缺失或无效配置时必须稳定退回当前默认教师布局。
- **D-19:** 视觉输出继续遵守 `DESIGN.md`：简体中文、Lexend、无 1px 分割线、tonal layering、glass/gradient CTA 的既有设计边界。

### Claude's Discretion
- 壳层内部的具体 CSS grid/flex 实现、每个 region 的默认 spacing token、结构摘要文案格式、allowlisted 模块命名和最终 DTO 形状，可由 planner 和 implementer 在不违背上述锁定决策的前提下收敛。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/PROJECT.md` — 项目固定技术路线、安全约束、设计边界，以及声明式 theme/plugin 仍需沿用 school-scoped 运行路径的锁定背景。
- `.planning/REQUIREMENTS.md` — `PLUGIN-05`、`PLUGIN-06` 的正式需求来源，以及插件/主题安全边界。
- `.planning/ROADMAP.md` — Phase 16 的目标、成功标准、计划拆分，以及必须保持 `manifest.theme -> ThemeInjector -> settings switch -> teacher shell` 单一路径的要求。
- `.planning/STATE.md` — 当前已积累的 UI、theme、teacher shell 相关决策与里程碑上下文。

### Theme and plugin design references
- `docs/theme-system-design.md` — 主题注册表、`ThemeInjector`、token 编译和设计系统守卫的设计背景与现状说明。
- `docs/plugin-theme-implementation-plan.md` — 既有 theme plugin 启用链路、settings 切换、ThemeInjector 注入和插件/主题关系的实施背景。

### Existing implementation to extend
- `src/lib/dto/resource-ai.ts` — `ThemeTokenRegistrySchema`、`PluginManifestSchema` 和 theme/plugin DTO 契约；Phase 16 需要在这里把 theme contract 从 token 扩展为 region-based layout schema。
- `src/server/themes/tokens.ts` — 当前 theme token 验证、layout token allowlist 与 CSS variable 编译逻辑，是 richer layout validation 的直接基础。
- `src/lib/dal/themes.ts` — school-scoped 主题读取与 active theme 解析路径；Phase 16 仍需复用这里的有效主题与 actor scope 边界。
- `src/actions/theme-actions.ts` — `setActiveThemeAction()`、`registerThemeTokensAction()` 与 cache 失效路径，必须继续作为 richer theme 的切换和注册入口。
- `src/lib/dal/plugins.ts` — `manifest.theme` 在插件启用时的主题注册入口，Phase 16 仍要通过这里承接主题插件注册。

### Runtime shell and surface integration
- `src/components/theme/theme-injector.tsx` — 当前把合法主题编译为 `:root` CSS variables 的运行时注入器，是 richer layout runtime 的核心扩展点。
- `src/app/layout.tsx` — 根布局中 `ThemeInjector` 的接入点，决定 richer theme 的运行时注入边界。
- `src/app/(teacher)/teacher/layout.tsx` — 当前固定左侧 `Sidebar` + 顶部 header 的教师端壳层实现，Phase 16 需要把这里改造成 theme-aware shell。
- `src/components/shell/sidebar.tsx` — 当前左侧导航组件，Phase 16 需要决定如何把它复用为 allowlisted navigation regions，而不是直接废弃。
- `src/components/surfaces/settings-surface.tsx` — 当前主题设置页只显示名称与简短描述；Phase 16 需要在这里加入 richer layout 结构摘要和可理解性反馈。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ThemeInjector`：已经提供从 active theme 到 CSS variables 的唯一运行时入口，适合继续承载 richer layout compile 结果。
- `ThemeTokenRegistrySchema` / `PluginManifestSchema`：现有 manifest 校验边界已经存在，可直接扩展为 layout contract schema。
- `setPluginEnabled()` in `src/lib/dal/plugins.ts`：启用插件时会自动注册 `manifest.theme`，确保 richer layout 仍可沿用插件启用链路进入系统。
- `setActiveThemeAction()` 和 `getActiveThemeForCurrentActor()`：已经形成 theme 切换与 actor/school scope 校验闭环，可继续复用。
- `Sidebar` 与 `TeacherLayout`：现有教师端导航和壳层组件是最直接的 region 抽象来源，不必从零新建另一套主题壳层系统。

### Established Patterns
- theme/plugin 能力已经统一收敛到声明式 JSON + schema 校验 + DAL/Action/runtime injector 的路径，说明 Phase 16 也必须通过 schema 和 allowlist 扩展，而不是塞入任意运行时逻辑。
- 当前主题编译结果主要是 CSS variables，这意味着 richer layout 最好先表达为“已校验的布局数据 + 有限 CSS/runtime 映射”，而不是任意组件树生成。
- 教师端壳层当前是固定结构，说明 Phase 16 需要先抽出 shell contract，再把 route surfaces 绑定进可覆写的 regions。
- settings 页当前只认识“默认主题 / 某个主题名称”的低语义切换模式，说明 richer theme 必须补上结构摘要，否则教师无法理解主题差异。

### Integration Points
- `src/lib/dto/resource-ai.ts`：新增 region-based layout schema、region visibility 规则、模块大小比例枚举和 page-surface contract。
- `src/server/themes/tokens.ts`：补 richer layout validation、layout compile 和 region-level fallback 策略。
- `src/components/theme/theme-injector.tsx`：继续负责把合法 theme layout 编译结果注入运行时。
- `src/app/(teacher)/teacher/layout.tsx`：接入 theme-aware shell 选择、top/left/secondary rail 组合和 page-level override。
- `src/components/shell/sidebar.tsx` 及相邻 shell 组件：拆分或复用为 `primary-nav` / `secondary-nav` region 的基础实现。
- `src/components/surfaces/settings-surface.tsx`：展示 richer theme 的布局摘要与回退后仍可理解的说明信息。

</code_context>

<specifics>
## Specific Ideas

- 主题默认拥有一个 workspace 级壳层，但大多数 teacher-facing 页面可以单独覆写为另一种 allowlisted shell 组合。
- richer theme 的首发重点不是“任意拖拽页面”，而是用 region-based contract 做出 materially different information architecture。
- region 内模块编排只到页面级 surface/module 顺序与比例，不重写模块内部业务结构。
- 设置页需要把主题版式能力说清楚，优先展示结构摘要，而不是先做复杂缩略预览。

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-Theme plugins and layout orchestration*
*Context gathered: 2026-05-10*
