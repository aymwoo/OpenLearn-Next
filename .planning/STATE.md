---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Course Import & Management
current_phase: 17
current_phase_name: teacher-flow-editor-enhancement
current_plan: 4
status: verifying
stopped_at: Completed 17-04-PLAN.md
last_updated: "2026-05-10T21:24:12+08:00"
last_activity: 2026-05-10
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 13
  completed_plans: 13
  percent: 100
---

# Project State

## Position

**Current Phase:** 17
**Current Phase Name:** teacher-flow-editor-enhancement
**Current Plan:** 4
**Total Plans in Phase:** 4
**Status:** Phase complete — ready for verification
**Progress:**
[██████████] 100%
**Last Activity:** 2026-05-10

**Last session:** 2026-05-10T09:29:59.285Z
**Stopped At:** Completed 17-04-PLAN.md
**Resume File:** None

## Accumulated Context

### Decisions

- 首页与学生中心继续保留单一 justified gradient stage，次级动作和说明模块全部退回 tonal cards。
- student/player 保持沉浸式主舞台，但把步骤骨架和回退态保持在低对比 tonal 容器中，优先保证当前学习上下文。
- settings 与 labs 快捷操作保留语义红橙风险色，不把危险动作并入品牌蓝 CTA 体系。
- 所有用户可见界面文案默认使用简体中文；仅在品牌名、协议名或技术名确有必要时保留英文。
- 将课堂运行页保持为单一渐变主舞台，其余控制与名册模块全部回落到 tonal cards，避免高频教师页面出现多重 hero 竞争。
- 结束课堂与待反馈状态继续使用语义色，而不是并入品牌蓝 CTA 体系，满足实时操作风险识别。
- [Phase 10]: 将 ghost-focus 输入、下拉与切换控件收敛到同一个 shared contract，避免登录与课堂 launch 再出现局部焦点漂移。
- [Phase 10]: 首页 remember-me 改成 aria-pressed 可见切换按钮并通过 hidden input 提交值，既去掉 checkbox 边框例外，也保留明确表单语义。
- [Phase 10]: 课堂 launch select 直接复用 tokenized ghost-focus field，不再保留任何本地 inset 1px outline 或自定义 RGBA focus recipe。
- [Phase 12]: 将 /teacher/launch 作为教师唯一的新开课堂准备入口 — /classroom 保持为 live runtime 控制台，避免准备页与运行台职责混合
- [Phase 12]: 恢复卡片通过 sessionId 精确回到目标课堂 — 恢复入口只暴露 teacher-scoped DTO 字段，且避免多 live classroom 时落回第一条会话
- [Phase 12]: 开课预览只读取已发布课时快照与已验证 payload，避免把草稿态误展示为可开课内容。
- [Phase 12]: 预览保持在 /teacher/launch 页面内联呈现，并在未选课时时显示平静占位说明。
- [Phase 12]: 内置教学环节元数据从 manifest 直接流向 DAL 与 labs UI，避免通过名称推断系统插件身份。
- [Phase 12]: 删除保护固定收敛在 DAL 层并返回 PLUGIN_BUILT_IN_NOT_DELETABLE，确保任何调用方都不能绕过普通删除路径。
- [Phase 12]: 开发 bootstrap 通过 upsert 真实写入五个默认启用的内置教学环节插件，保证 authoring 和管理界面共享同一 registry 数据源。
- [Phase 12]: 内置教学环节插件继续走 allowlisted action 到本地 typed widget 的安全链路，不新增任意脚本执行入口。
- [Phase 12]: 编排区把内置教学环节放在 `新增步骤` 同一层级的独立分组中，保持教师 direct quick-add 心智模型。
- [Phase 12]: Phase 12 通过 `verify:phase12` 守住 launch routing、built-in exposure、管理标签与 unsafe pattern 禁止。
- [Phase 12]: 五个内置教学环节 seed manifest 直接声明 suggestBuiltInTeachingStep / insertBuiltInTeachingStepTemplate，避免与 registry allowlist 漂移。
- [Phase 12]: Built-in template 解析只信任启用中的 registry record，缺少 template action 或 hook 未返回 typed template 时一律不产出模板。
- [Phase 12]: 将 built-in plugin 可见性落到独立 /settings/plugins route，明确满足 marketplace visibility 合同而不是继续复用 labs-only surface。
- [Phase 12]: built-in plugin marketplace 只保留启用/停用语义，不展示删除动作，避免系统内置插件被误解为可移除扩展。
- [Phase 12]: 将 Phase 12 verifier 的主证明面切到定向行为测试，而不是继续依赖源码字符串命中。 — 用真实回归替代字符串匹配，避免 broken phase 被误判通过。
- [Phase 12]: verify:phase12 同时保留 unsafe pattern 静态检查与 required-file 守卫。 — 但成功结论必须建立在目标 Vitest 回归套件全部通过之上。
- [Phase 13]: 课程中心读模型拆到独立 course-authoring DAL，避免 lesson-authoring 继续膨胀。
- [Phase 13]: 课程列表排序固定为 draft->published->archived，再按 updatedAt 倒序，避免 UI 二次排序漂移。
- [Phase 13]: 教师从课程卡先进入独立详情页，再进入课时管理，不再直接跳全局 editor。
- [Phase 13]: 课程 create action 只接受 schoolId、title、subject、grade 与可选 draft status，并在 schema 层拒绝未声明字段。
- [Phase 13]: 课程 update 继续收敛到 teacher-owned DAL 写路径，跨教师或跨学校课程一律返回未授权。
- [Phase 13]: 课程保存成功反馈保留在详情页表单区，而不是只依赖瞬时 toast。
- [Phase 13]: 课程中心 teacher read path 必须同时校验 school scope 与 ownerId，same-school foreign course 统一按 COURSE_NOT_FOUND 处理。
- [Phase 13]: TeacherCourseCenterDTO 由服务端输出 defaultSchoolId 与 availableSchools，建课流程不再硬编码 school-1。
- [Phase 13]: 建课抽屉只消费服务端 DTO 提供的 defaultSchoolId 与 availableSchools，不再保留任何 school-1 客户端默认值。
- [Phase 13]: 多学校教师在抽屉内显式选择学校，单学校教师显示只读学校摘要，无学校 scope 时直接禁用创建。
- [Phase 16]: `manifest.theme.layout` 已升级为 typed、allowlisted 的 region-based contract，禁止 `className`、`script`、原始 `style` 注入。
- [Phase 16]: 主题运行时继续复用 `activeThemeId -> DAL -> ThemeInjector -> TeacherSidebarShell` 单一路径，不新增平行主题系统。
- [Phase 16]: 教师端壳层固定支持 `left-nav`、`top-nav`、`top-nav-secondary-rail` 三种模式，`/teacher`、`/settings`、`/resources` 统一走同一 theme-aware shell。
- [Phase 16]: 设置页主题卡片改为读取 runtime-driven `结构摘要`，并在局部回退时显式展示 `局部回退` 说明。
- [Phase 16]: `verify:phase16` 已作为 phase-specific 验证入口落地，覆盖 runtime wiring、shell mode、设置页摘要和 unsafe contract guard。
- [Quick 260510-i4e]: 教师端各 surface 首屏统一收敛到同一组 rhythm token，hero 使用一致 shell/padding，普通首屏 section 统一使用相同圆角与 5/6 间距节奏。
- [Quick 260510-i8f]: 教师工作台首屏内二级卡片统一收敛到 `radius-card` 语义，外层 shell 与内层信息卡片的圆角层级分工更清晰。
- [Quick 260510-idr]: 教师端其它 surface 的二级 tonal cards 继续统一复用 `radius-card` 语义；shell 级容器仍保留 `radius-shell`，不混入圆形控件与主舞台。
- [Quick 260510-9s2]: `settings-surface`、`teacher-review-surface`、`library-surface` 的二级卡片统一复用 `teacherSurfaceRhythm.card` / `cardInset`，不再局部手写不同半径。
- [Quick 260510-kc9]: 默认主题重新和激活主题路径分流；无 `activeThemeId` 时回到浅色基线壳层，并通过共享 `surfaceWidths` contract 清理首页、设置、学生相关页面的局部窄版心回归。

**Active Blockers:**

- Full `pnpm lint` is blocked by pre-existing lint errors in `.claude/`, `.opencode/`, and unrelated source files outside Plan 11-01.
- [Phase 17]: 把 builtInSource 持久化到 lesson step payload，后续 preview/readiness 不再依赖 UI 推断插件来源。
- [Phase 17]: publish readiness 收口在 teacher-owned DAL，并由 editor DTO 与 publish action 共用。
- [Phase 17]: 发布阻断通过 PUBLISH_BLOCKED 结构化返回 issues，而不是只依赖前端提示。
- [Phase 17]: 普通步骤和内置教学环节合并到同一 composer rail，避免编辑器继续分裂成资源卡片和步骤按钮两套心智模型。
- [Phase 17]: 流程卡片、侧边摘要和属性编辑器统一展示 builtInSource，来源信息不再只停留在服务端 DTO。
- [Phase 17]: step editor 重建 payload 时显式保留 builtInSource，防止教师编辑后丢失内置环节 provenance。
- [Phase 17]: teacher preview route 必须同时要求 courseId 和 lessonId，避免像旧 editor 一样落回模糊默认课时。
- [Phase 17]: 课堂预览继续只读取 teacher-owned draft DTO，不复用 student runtime、SSE 或个人学习进度。
- [Phase 17]: editor 页面同时保留 inline preview summary 与真实预览入口，避免把预览能力伪装成死按钮。
- [Phase 17]: editor 内的发布准备面板直接消费结构化 readiness issue 列表，不再用三字段布尔判断替代服务端 gate。
- [Phase 17]: 发布反馈保留在当前 shell 内，并在收到 PUBLISH_BLOCKED 时回填最新阻断项，而不是只弹通用失败提示。
- [Phase 17]: Phase 17 通过 verify:phase17 固定校验 preview route、publish gate、Server Actions wiring 和 editor/plugin 安全边界。

## Next Steps

1. Run the remaining Phase 13 human UAT flows in `.planning/phases/13-course-center-foundation/13-HUMAN-UAT.md`.
2. Decide whether to return to the milestone mainline with Phase 14 now that theme layout orchestration and repo-wide typecheck are green.
3. When preparing a commit or PR, keep Phase 16 code and planning artifacts grouped atomically.

## Performance Metrics

| Scope        | Duration | Tasks   | Files    |
| ------------ | -------- | ------- | -------- |
| Phase 10 P06 | 4 min    | 2 tasks | 4 files  |
| Phase 12 P01 | 2 min    | 2 tasks | 8 files  |
| Phase 12 P02 | 1 min    | 2 tasks | 5 files  |
| Phase 12 P03 | 2 min    | 3 tasks | 5 files  |
| Phase 12 P04 | 1 min    | 3 tasks | 10 files |
| Phase 12 P06 | 2 min    | 2 tasks | 2 files  |
| Phase 12 P08 | 2 min    | 2 tasks | 4 files  |
| Phase 12 P07 | 3 min    | 2 tasks | 3 files  |
| Phase 12 P09 | 12 min   | 2 tasks | 5 files  |
| Phase 13 P01 | 6 min    | 2 tasks | 8 files  |
| Phase 13 P02 | 4 min    | 2 tasks | 8 files  |
| Phase 13 P03 | 23 min   | 2 tasks | 8 files  |
| Phase 13 P04 | 2 min    | 2 tasks | 3 files  |
| Phase 13 P05 | 3 min    | 2 tasks | 3 files  |
| Phase 17 P01 | 3 min | 2 tasks | 6 files |
| Phase 17 P02 | 7 min | 2 tasks | 4 files |
| Phase 17 P03 | 5 min | 2 tasks | 5 files |
| Phase 17 P04 | 8 min | 2 tasks | 6 files |

### Quick Tasks Completed

| #          | Description                                                                                                                                                                      | Date                                                                          | Commit  | Directory                                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| 260506-04q | 使用stitch中的以下页面重构首页, Stitch Project ID: 5322129002350954765, Screen 1: 首页 - OpenLear-Next ID: 79dd3433e6c44f0792e0ada2ebf71337                                      | 2026-05-05                                                                    | 939b608 | [260506-04q-stitch-stitch-project-id-532212900235095](./quick/260506-04q-stitch-stitch-project-id-532212900235095/) |
| 260507-hly | 修改首页的样式，参照 Stitch 首页，分为学生和教师两个入口，默认学生登录，点击登录后直接验证并跳转到学生或教师首页                                                                 | 2026-05-07                                                                    | aeab00f | [260507-hly-stitch](./quick/260507-hly-stitch/)                                                                     |
| 260507-kdx | 为添加一个用于开发环境的脚本，用来初始化数据库和基础的测试的数据                                                                                                                 | 2026-05-07                                                                    | 94e3d56 | [260507-kdx-dev-db-bootstrap](./quick/260507-kdx-dev-db-bootstrap/)                                                 |
| 260507-r7m | 修复教师首页课表说明文案宽度异常                                                                                                                                                 | 2026-05-07                                                                    | b35e052 | [260507-r7m-teacher-copy-width](./quick/260507-r7m-teacher-copy-width/)                                             |
| 260507-qf6 | 根据 Stitch 项目 5322129002350954765 的教学流程编排屏幕，生成课堂教学活动编排页面                                                                                                | 2026-05-07                                                                    | e3e7a3a | [260507-qf6-classroom-lesson-orchestrator-stitch](./quick/260507-qf6-classroom-lesson-orchestrator-stitch/)         |
| 260507-r59 | 严格按照 stitch 中的首页样式布局来重构首页，stitch 中没有的内容不需要有，使用 Stitch 项目 5322129002350954765 的首页屏幕 79dd3433e6c44f0792e0ada2ebf71337 作为唯一视觉与内容来源 | 2026-05-07                                                                    | 4cda668 | [260507-r59-stitch-stitch-stitch-5322129002350954765](./quick/260507-r59-stitch-stitch-stitch-5322129002350954765/) |
| 260507-rto | 首页的布局需要稍微调整一下，左边占三分之二，右边占三分之一，注意图片中有些组件的 max width 过于狭窄，需要修正这个问题。                                                          | 2026-05-07                                                                    | 4f66729 | [260507-rto-max-width](./quick/260507-rto-max-width/)                                                               |
| 260507-saw | 新建一个班级管理页面，并添加到左边栏的导航中，班级管理页面完全按照 Stitch 项目 5322129002350954765 的屏幕 154c66ef0dc643a7a3edd7ed520fc999 实现。                                | 2026-05-07                                                                    | aeef097 | [260507-saw-stitch-5322129002350954765-154c66ef0dc64](./quick/260507-saw-stitch-5322129002350954765-154c66ef0dc64/) |
| 260507-rto | 首页的布局需要稍微调整一下，左边占三分之二，右边占三分之一，注意图片中有些组件的 max width 过于狭窄，需要修正这个问题。                                                          | 2026-05-07                                                                    | 4f66729 | [260507-rto-max-width](./quick/260507-rto-max-width/)                                                               |
| 260507-t1c | 将所有页面改为中文界面，继续替换 class-management、home、login、settings、teacher layout 等处残留英文，并补充中文界面约定与更新 STATE。                                          | 2026-05-07                                                                    | b72498a | [260507-t1c-ui-copy-chinese](./quick/260507-t1c-ui-copy-chinese/)                                                   |
| 260507-tcl | 班级管理页面 filter pills 替换为独立可选芯片（在读/请假/男/女）、批量操作图标对齐 Stitch（Trash2）、student avatar 调整为 Stitch 比例                                            | 2026-05-07                                                                    | f0ede6e | [260507-tcl-stitch](./quick/260507-tcl-stitch/)                                                                     |
| 260507-u75 | 学生列表对齐 Stitch bb82bea4 紧凑 3 列布局：5 名学生、图片头像、筛选增加"所有"选项                                                                                               | 2026-05-07                                                                    | 12f7a3b | [260507-u75-stitch-bb82bea424fd4a7eb9d21cf206fe56fe](./quick/260507-u75-stitch-bb82bea424fd4a7eb9d21cf206fe56fe/)   |
| 260507-v0p | 新增学生卡片视图：圆形头像 SVG 进度环、姓名学号，表格/卡片双视图切换                                                                                                             | 2026-05-07                                                                    | 1f5f783 | [260507-v0p-stitch-bb82bea4](./quick/260507-v0p-stitch-bb82bea4/)                                                   |
| 2026-05-08 | fast                                                                                                                                                                             | 移除教师工作台页面的 max-w-[1280px] 限制                                      | ✅      |
| 2026-05-09 | fast                                                                                                                                                                             | 资源中心页面/resources和设置页面/settings没有左边导航，需要改成和/teacher一致 | ✅      |
| 260510-07a | settings页面设置主题除了默认的主题之外，提示当前学校还没有可用主题。启用带有 manifest.theme 的插件后，这里会显示可选项。                                                         | 2026-05-09                                                                    | 304ce1b | [260510-07a-settings-manifest-theme](./quick/260510-07a-settings-manifest-theme/)                                   |
| 260510-0kh | 再创建一个版式也不一样的主题                                                                                                                                                     | 2026-05-09                                                                    | d4fce9d | [260510-0kh-second-distinct-theme](./quick/260510-0kh-second-distinct-theme/)                                       |
| 260510-i4e | 统一教师端各具体 surface 的首屏卡片间距与圆角节奏                                                                                                                                | 2026-05-10                                                                    | 未提交  | [260510-i4e-surface](./quick/260510-i4e-surface/)                                                                   |
| 260510-i8f | 统一教师端首屏内二级卡片的圆角层级语义                                                                                                                                           | 2026-05-10                                                                    | 未提交  | [260510-i8f-teacher-dashboard-card-radius-semantics](./quick/260510-i8f-teacher-dashboard-card-radius-semantics/)   |
| 260510-idr | 将 radius-card 二级卡片圆角语义扩展到其他教师端 surfaces                                                                                                                         | 2026-05-10                                                                    | 未提交  | [260510-idr-radius-card-surfaces](./quick/260510-idr-radius-card-surfaces/)                                         |
| 260510-9s2 | 统一 settings-surface、teacher-review-surface、library-surface 的二级卡片圆角语义                                                                                                | 2026-05-10                                                                    | 未提交  | [260510-9s2-surface-secondary-card-radius](./quick/260510-9s2-surface-secondary-card-radius/)                       |
| 260510-kc9 | 经过主题插件改动之后，我的默认的主题的界面和之前不一样了，深色浅色比较混乱，而且不必要的文字段落宽度限制又回来了，比如首页就变成了图片中的样子，其他页面也存在这个情况，检查原因并系统的修正 | 2026-05-10 | 068fc1b | [260510-kc9-theme-default-regression-fix](./quick/260510-kc9-theme-default-regression-fix/) |
| 260510-oml | 修复 /teacher/editor Blocking Route：将主题 cookie 读取移入 Suspense 安全边界 | 2026-05-10 | c196830 | [260510-oml-teacher-editor-blocking-route-cookie-sus](./quick/260510-oml-teacher-editor-blocking-route-cookie-sus/) |
| 260510-pcj | 移除 teacher editor 左侧课程/班级摘要卡，保留其余编排区 | 2026-05-10 | 708e57d | [260510-pcj-teacher-editor](./quick/260510-pcj-teacher-editor/) |
| 260510-pn1 | 修复 RootLayout html 节点 hydration mismatch，忽略浏览器扩展注入属性 | 2026-05-10 | f51decf | [260510-pn1-rootlayout-html-hydration-mismatch](./quick/260510-pn1-rootlayout-html-hydration-mismatch/) |
| 260510-pun | 移除 /teacher/editor 页面最下面左侧的竖条组件 | 2026-05-10 | 6a51652 | [260510-pun-teacher-editor](./quick/260510-pun-teacher-editor/) |
| 260510-qor | 清理 `.planning/tmp` 临时 manifest，并删除根目录 `README.md` 生成草稿 | 2026-05-10 | 未提交 | [260510-qor-planning-tmp-readme-md](./quick/260510-qor-planning-tmp-readme-md/) |
| 260510-tlq | 在/teacher/editor页面，在流程主线中的组件区块增加编辑按钮，底部的步骤编辑器及其他步骤编辑的组件改为点击组件编辑按钮的时候以抽屉的形式展开 | 2026-05-10 | 0efc8a0 | [260510-tlq-teacher-editor](./quick/260510-tlq-teacher-editor/) |
| 260510-u37 | 继续修改/teacher/editor页面，根据stitch页面中的资源库部分重构课堂流程组件，将编辑教学流程中的环节的抽屉换成modal，效果同教学流程编排-拖拽交互状态(Nimbus)页面一致，并实现实时预览效果 | 2026-05-10 | 待更新 | [260510-u37-teacher-editor-stitch-modal-nimbus](./quick/260510-u37-teacher-editor-stitch-modal-nimbus/) |
| 260510-uko | 继续修改 /teacher/editor 页面，移除资源库底部的当前编排概览、有效步骤、内置环节、普通步骤统计块，保持其余 Nimbus 资源库与 modal 实现不变 | 2026-05-10 | bc1a7ec | [260510-uko-teacher-editor-nimbus-modal](./quick/260510-uko-teacher-editor-nimbus-modal/) |
| 260510-uwv | 继续修改 /teacher/editor 页面，将 data-testid=lesson-flow-composer 的资源库区裁成只保留内层 rounded rail，移除上方标题说明与筛选按钮外壳 | 2026-05-10 | a90e782 | [260510-uwv-teacher-editor-data-testid-lesson-flow-c](./quick/260510-uwv-teacher-editor-data-testid-lesson-flow-c/) |
| 260510-v1f | 继续修改 /teacher/editor 页面，移除 lesson-flow-composer 外层带 section 壳的样式，只保留其内部资源库内容结构 | 2026-05-10 | 23f738e | [260510-v1f-teacher-editor-lesson-flow-composer-sect](./quick/260510-v1f-teacher-editor-lesson-flow-composer-sect/) |

## Current Position

Phase: 17 (teacher-flow-editor-enhancement) — EXECUTING
Plan: 4 of 4
Status: Phase complete — ready for verification
Last activity: 2026-05-10 - Completed quick task 260510-v1f: 移除 /teacher/editor 左侧 lesson-flow-composer 外层 section 壳
