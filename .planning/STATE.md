---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Course Import & Management
current_phase: 13
current_phase_name: course-center-foundation
current_plan: 5
status: verifying
stopped_at: Completed 13-05-PLAN.md
last_updated: "2026-05-09T13:26:30.860Z"
last_activity: 2026-05-09
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 5
  completed_plans: 5
  percent: 100
---

# Project State

## Position

**Current Phase:** 13
**Current Phase Name:** course-center-foundation
**Current Plan:** 5
**Total Plans in Phase:** 5
**Status:** Phase complete — ready for verification
**Progress:**
[██████████] 100%
**Last Activity:** 2026-05-09

**Last session:** 2026-05-09T13:26:30.856Z
**Stopped At:** Completed 13-05-PLAN.md
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

**Active Blockers:**

- Full `pnpm lint` is blocked by pre-existing lint errors in `.claude/`, `.opencode/`, and unrelated source files outside Plan 11-01.

## Next Steps

1. Start Phase 13 to build the teacher course center and manual course management flows.
2. Reuse the existing DAL, DTO, and cache-tag boundaries instead of creating a parallel course-management write path.
3. Keep v1.2 scope explicit: no real external system import, no bidirectional sync, and no SIS automation in this milestone.

## Performance Metrics

| Scope | Duration | Tasks | Files |
|-------|----------|-------|-------|
| Phase 10 P06 | 4 min | 2 tasks | 4 files |
| Phase 12 P01 | 2 min | 2 tasks | 8 files |
| Phase 12 P02 | 1 min | 2 tasks | 5 files |
| Phase 12 P03 | 2 min | 3 tasks | 5 files |
| Phase 12 P04 | 1 min | 3 tasks | 10 files |
| Phase 12 P06 | 2 min | 2 tasks | 2 files |
| Phase 12 P08 | 2 min | 2 tasks | 4 files |
| Phase 12 P07 | 3 min | 2 tasks | 3 files |
| Phase 12 P09 | 12 min | 2 tasks | 5 files |
| Phase 13 P01 | 6 min | 2 tasks | 8 files |
| Phase 13 P02 | 4 min | 2 tasks | 8 files |
| Phase 13 P03 | 23 min | 2 tasks | 8 files |
| Phase 13 P04 | 2 min | 2 tasks | 3 files |
| Phase 13 P05 | 3 min | 2 tasks | 3 files |

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260506-04q | 使用stitch中的以下页面重构首页, Stitch Project ID: 5322129002350954765, Screen 1: 首页 - OpenLear-Next ID: 79dd3433e6c44f0792e0ada2ebf71337 | 2026-05-05 | 939b608 | [260506-04q-stitch-stitch-project-id-532212900235095](./quick/260506-04q-stitch-stitch-project-id-532212900235095/) |
| 260507-hly | 修改首页的样式，参照 Stitch 首页，分为学生和教师两个入口，默认学生登录，点击登录后直接验证并跳转到学生或教师首页 | 2026-05-07 | aeab00f | [260507-hly-stitch](./quick/260507-hly-stitch/) |
| 260507-kdx | 为添加一个用于开发环境的脚本，用来初始化数据库和基础的测试的数据 | 2026-05-07 | 94e3d56 | [260507-kdx-dev-db-bootstrap](./quick/260507-kdx-dev-db-bootstrap/) |
| 260507-r7m | 修复教师首页课表说明文案宽度异常 | 2026-05-07 | b35e052 | [260507-r7m-teacher-copy-width](./quick/260507-r7m-teacher-copy-width/) |
| 260507-qf6 | 根据 Stitch 项目 5322129002350954765 的教学流程编排屏幕，生成课堂教学活动编排页面 | 2026-05-07 | e3e7a3a | [260507-qf6-classroom-lesson-orchestrator-stitch](./quick/260507-qf6-classroom-lesson-orchestrator-stitch/) |
| 260507-r59 | 严格按照 stitch 中的首页样式布局来重构首页，stitch 中没有的内容不需要有，使用 Stitch 项目 5322129002350954765 的首页屏幕 79dd3433e6c44f0792e0ada2ebf71337 作为唯一视觉与内容来源 | 2026-05-07 | 4cda668 | [260507-r59-stitch-stitch-stitch-5322129002350954765](./quick/260507-r59-stitch-stitch-stitch-5322129002350954765/) |
| 260507-rto | 首页的布局需要稍微调整一下，左边占三分之二，右边占三分之一，注意图片中有些组件的 max width 过于狭窄，需要修正这个问题。 | 2026-05-07 | 4f66729 | [260507-rto-max-width](./quick/260507-rto-max-width/) |
| 260507-saw | 新建一个班级管理页面，并添加到左边栏的导航中，班级管理页面完全按照 Stitch 项目 5322129002350954765 的屏幕 154c66ef0dc643a7a3edd7ed520fc999 实现。 | 2026-05-07 | aeef097 | [260507-saw-stitch-5322129002350954765-154c66ef0dc64](./quick/260507-saw-stitch-5322129002350954765-154c66ef0dc64/) |
| 260507-rto | 首页的布局需要稍微调整一下，左边占三分之二，右边占三分之一，注意图片中有些组件的 max width 过于狭窄，需要修正这个问题。 | 2026-05-07 | 4f66729 | [260507-rto-max-width](./quick/260507-rto-max-width/) |
| 260507-t1c | 将所有页面改为中文界面，继续替换 class-management、home、login、settings、teacher layout 等处残留英文，并补充中文界面约定与更新 STATE。 | 2026-05-07 | b72498a | [260507-t1c-ui-copy-chinese](./quick/260507-t1c-ui-copy-chinese/) |
| 260507-tcl | 班级管理页面 filter pills 替换为独立可选芯片（在读/请假/男/女）、批量操作图标对齐 Stitch（Trash2）、student avatar 调整为 Stitch 比例 | 2026-05-07 | f0ede6e | [260507-tcl-stitch](./quick/260507-tcl-stitch/) |
| 260507-u75 | 学生列表对齐 Stitch bb82bea4 紧凑 3 列布局：5 名学生、图片头像、筛选增加"所有"选项 | 2026-05-07 | 12f7a3b | [260507-u75-stitch-bb82bea424fd4a7eb9d21cf206fe56fe](./quick/260507-u75-stitch-bb82bea424fd4a7eb9d21cf206fe56fe/) |
| 260507-v0p | 新增学生卡片视图：圆形头像 SVG 进度环、姓名学号，表格/卡片双视图切换 | 2026-05-07 | 1f5f783 | [260507-v0p-stitch-bb82bea4](./quick/260507-v0p-stitch-bb82bea4/) |
| 2026-05-08 | fast | 移除教师工作台页面的 max-w-[1280px] 限制 | ✅ |
| 2026-05-09 | fast | 资源中心页面/resources和设置页面/settings没有左边导航，需要改成和/teacher一致 | ✅ |

## Current Position

Phase: 13 (course-center-foundation) — VERIFYING
Plan: 5 of 5
Status: Phase complete — ready for verification
Last activity: 2026-05-09
