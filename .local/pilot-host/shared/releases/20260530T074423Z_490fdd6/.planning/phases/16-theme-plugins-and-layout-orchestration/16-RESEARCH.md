# Phase 16: Theme plugins and layout orchestration - Research

**Created:** 2026-05-10  
**Status:** Complete

## Research question

如何在不引入任意代码执行、不新增平行主题系统的前提下，把现有
`manifest.theme -> ThemeInjector -> settings switch -> teacher shell`
链路从 token-only 主题扩展为可校验的教师端布局编排系统？

## Current baseline

- `ThemeTokenRegistrySchema` 已支持颜色、surface、radius、typography，且额外有
  一个过于宽松的 `layout: Record<string, string>`。
- `validateThemeTokens()` 目前只做 surface role、Lexend、少量 layout length 校验，
  无法表达区域、模块、壳层模式和局部回退。
- `ThemeInjector` 已能把合法主题编译为 `:root` CSS variables，但它只理解平面 token。
- `setPluginEnabled()` 会在启用插件时自动注册 `manifest.theme`，说明 richer layout
  仍应沿用现有 plugin/theme 注册链路。
- 教师壳层当前由 `src/app/(teacher)/teacher/layout.tsx` 硬编码为左侧 sidebar + 顶部
  header；`TeacherSidebarShell` 已额外消费少量 layout CSS variables，但还不是完整的
  route-aware layout runtime。

## Recommended architecture

### 1. Expand the manifest contract to typed, region-based layout data

把当前宽松 `layout: Record<string, string>` 升级为结构化 contract：

- `shell.mode`: `left-nav` | `top-nav` | `top-nav-secondary-rail`
- `shell.defaultRegions`: allowlisted region 列表
- `pages`: 以 teacher-facing route surface key 为键的 page override map
- `regions`: 仅允许 `primary-nav`、`secondary-nav`、`page-header`、`main-content`、
  `context-panel`、`page-footer`
- `modules`: 仅允许 allowlisted page-level module key
- `split`: 仅允许离散枚举，如 `30/70`、`40/60`、`50/50`、`60/40`
- `hidden`: 仅允许辅助 region；`primary-nav`、`page-header`、`main-content`
  必须保留

### 2. Compile once, then resolve per route with region-level fallback

新增 theme runtime compiler：

- 输入：`ThemeTokenRegistry`
- 输出：
  - `cssVariables`: 继续给 `ThemeInjector`
  - `layoutRuntime`: 已校验的 shell/page/region/module DTO
  - `summary`: 设置页可读中文摘要
- fallback 粒度：按 region 回退到默认 teacher layout，而不是整页回退，也不是模块级逐项回退

### 3. Keep a single runtime path

不要新增第二套 theme runtime。推荐把运行时收敛为：

`manifest.theme -> registerThemeTokens -> DAL resolve -> compileThemeRuntime -> ThemeInjector + teacher shell`

其中：

- `ThemeInjector` 仍负责注入 CSS variables
- teacher shell / route layout 从同一份 compiled runtime 读取结构信息
- settings 页面从同一份 compiled runtime 读取摘要信息

### 4. Use an allowlisted teacher surface registry

为 teacher-facing routes 建立单一 registry，而不是让主题直接拼任意 pathname：

- `/teacher`
- `/teacher/classes`
- `/teacher/courses`
- `/teacher/courses/[courseId]`
- `/teacher/courses/[courseId]/lessons`
- `/teacher/students`
- `/teacher/review`
- `/teacher/launch`
- `/teacher/editor`
- `/settings`
- `/settings/labs`
- `/settings/plugins`
- `/resources`

每个 route surface 只暴露 allowlisted page-level modules；业务组件内部结构不开放给主题。

## Architecture patterns to follow

1. **Schema-first validation**  
   先在 `src/lib/dto/resource-ai.ts` 锁死类型和 allowlist，再让 DAL / runtime 消费。

2. **Compile, don’t interpret live**  
   运行时只消费已经编译好的 theme layout DTO，不在 React 组件里做自由拼装。

3. **Route registry over freeform path matching**  
   页面可覆写，但必须命中 allowlisted surface contract，满足 D-04、D-05。

4. **Region-level fallback**  
   某个 region 非法时只替换该 region 为默认布局；其余合法 region 继续保留主题结果。

5. **Summary from runtime, not from theme name**  
   settings 页摘要必须由编译后的 layout runtime 生成，避免继续靠 `getThemeDescription(themeName)`
   这类名称猜测逻辑。

## Don’t hand-roll

- 不要允许 `layout: Record<string, string>` 无限扩展 key/value。
- 不要通过 `dangerouslySetInnerHTML` 注入任意布局 HTML。
- 不要让主题声明 className、Tailwind token 名或任意 CSS 属性。
- 不要为布局主题另建独立 cookie、独立注册表或独立设置入口。
- 不要把 editor、launch、classroom runtime 设成代码里的硬豁免；应该通过 route registry
  给出默认 surface，而非直接跳过 theme runtime。

## Common pitfalls

1. **Whole-page fallback is too destructive**  
   这会违背 D-13、D-14，并让 richer layout 一处配置错误就完全失效。

2. **Theme summary coupled to theme name**  
   当前 settings 文案通过名称推断“星夜/晨光”，Phase 16 必须改为结构摘要。

3. **Shell mode without page registry**  
   只切 top nav / left nav 还不够；页面 region/module 需要统一 surface registry。

4. **Applying theme only to dashboard**  
   会违反 D-05。必须至少为所有 teacher-facing routes 提供 allowlisted default surface。

5. **Using unrestricted ratios**  
   任意百分比会把 contract 变成自由 CSS 注入的变体，违背 D-12、D-17。

## Security and trust boundaries

| Boundary | Risk | Required mitigation |
|---|---|---|
| plugin manifest -> theme registry | 非法 layout 数据进入系统 | schema + allowlist + enum 校验 |
| theme registry -> runtime compiler | 编译时接受任意 region/module | route surface registry + region/module allowlist |
| runtime compiler -> shell rendering | 非法配置破坏整个教师端结构 | region-level fallback + required region guard |
| settings summary -> teacher decision | 摘要与真实布局漂移 | summary 由 compiled runtime 生成 |

## Architectural responsibility map

| Layer | Responsibilities | Must not do |
|---|---|---|
| `src/lib/dto/resource-ai.ts` | 定义 theme layout schema、枚举、DTO | 不能写运行时 fallback 逻辑 |
| `src/server/themes/tokens.ts` / runtime compiler | 校验、编译、region-level fallback、摘要生成 | 不能直接读 cookies 或渲染页面 |
| `src/lib/dal/themes.ts` | school-scoped theme 读取与 actor scope 校验 | 不能拼 UI 文案 |
| `src/actions/theme-actions.ts` | active theme 切换与 cache/tag 更新 | 不能绕过 DAL scope guard |
| `ThemeInjector` | 注入 CSS variables 与必要 runtime metadata | 不能自行决定页面结构 |
| teacher shell / settings surfaces | 消费 compiled runtime，渲染壳层与摘要 | 不能信任未经编译的 raw manifest |

## Implementation recommendation

按 4 个 plans 拆分最稳妥：

1. schema + compiler contract
2. active theme runtime resolution + injector integration
3. teacher shell + route surface orchestration
4. settings summary + regression coverage

这样能保持接口先行，并把最关键的不确定性（contract/fallback）放在前两步解决。
