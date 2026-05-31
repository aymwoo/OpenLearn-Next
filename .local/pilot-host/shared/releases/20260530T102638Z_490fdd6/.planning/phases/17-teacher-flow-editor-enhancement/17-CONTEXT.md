# Phase 17: Teacher flow editor enhancement - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning
**Source:** User objective + current-state findings

<domain>
## Phase Boundary

本阶段把现有 `/teacher/editor` 从“课程内课时入口后的基础编辑页”升级为真正可用的
课堂流程编排器：教师可以在同一条 teacher-owned lesson flow 里组合 `content`、`task`、`quiz`
和内置教学环节插件，完成结构化属性编辑、流程预览与发布前阻断检查。

本阶段不引入任意插件脚本执行、不改变现有 DAL + Server Actions 边界、不把 editor
改造成跨课程全局入口，也不扩展到外部 marketplace、第三方插件代码运行或协作编辑。

</domain>

<decisions>
## Implementation Decisions

### Editor entry and scope
- **D-01:** `/teacher/editor` 继续保持显式 `courseId` + `lessonId` 的 course-aware 入口，不恢复任何全局第一课时回退。
- **D-02:** 本阶段必须是一次真实增强，不是小修小补；要交付可组合、可编辑、可预览、可阻断发布的完整增强闭环。
- **D-03:** 编辑器范围继续限定在教师自有 lesson flow，所有读取、写入、预览、发布前检查都必须复用 teacher-owned scope。

### Flow composition
- **D-04:** 课堂流程必须能在同一编排工作区内组合 `content`、`task`、`quiz` 与已启用的内置教学环节插件，而不是继续把 built-in plugin 只当作附加按钮能力。
- **D-05:** 内置教学环节插件的来源信息必须在 editor flow 中保留可追踪性，便于预览和发布前检查识别“当前步骤来自哪个 built-in plugin”。
- **D-06:** 现有 add / reorder / archive / duplicate 能力要保留，但编排体验需要从“基础卡片堆叠”升级为更清晰的一体化 flow composition contract。

### Preview and publish readiness
- **D-07:** `预览课堂` 不能继续是占位 CTA；本阶段必须提供真实 preview route、preview panel 或两者结合的可执行预览能力。
- **D-08:** 发布前检查必须从当前仅检查标题/目标/至少一个步骤，升级为结构化阻断检查，至少覆盖：缺失必填字段、无效 payload、不可用 built-in plugin、以及其他会阻止发布的关键问题。
- **D-09:** 发布阻断不仅是 UI 文案；服务端 publish 路径也必须复用同一套 readiness 规则，避免前端绕过。

### Constraints to preserve
- **D-10:** 所有数据访问继续严格走 `DAL + Server Actions`，UI/RSC 组件不能直连数据库。
- **D-11:** 所有写操作后继续显式执行 cache invalidation，保持 editor 的 read-your-writes 反馈。
- **D-12:** 插件安全边界不变化：禁止 `eval()`、动态执行第三方代码、直接 DB 访问或绕过 `Event -> Hook -> Action -> Core API`。
- **D-13:** 编辑器视觉继续遵守 Stitch 项目 `5322129002350954765` 与 `DESIGN.md`：简体中文、Lexend、tonal surfaces、无 1px 分割线。

### the agent's Discretion
- preview route 的具体 URL、preview panel 的摆放位置、编排区的局部信息层级、publish-readiness 文案的详细措辞，可在不违背上述锁定决策的前提下由 planner 收敛。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and scope
- `.planning/PROJECT.md` — 固定技术路线、缓存边界、DAL + Server Actions、安全与设计约束。
- `.planning/ROADMAP.md` — Phase 17 目标、成功标准、依赖阶段和 requirement IDs。
- `.planning/REQUIREMENTS.md` — `LESSON-03`、`LESSON-04`、`LESSON-07`、`LESSON-08`、`PLUGIN-01`、`PLUGIN-02`、`PLUGIN-05` 的正式要求。
- `.planning/STATE.md` — 已完成 course-aware editor handoff、built-in plugin registry、theme shell/runtime 等上下文决策。

### Existing implementation to extend
- `src/app/(teacher)/teacher/editor/page.tsx` — 现有显式 `courseId` / `lessonId` editor 入口。
- `src/components/surfaces/lesson-editor-surface.tsx` — 当前 editor 外层三栏 shell 与预览/发布 CTA 占位。
- `src/components/authoring/lesson-authoring-workspace.tsx` — 当前步骤编排、built-in quick add、移动/复制/归档能力。
- `src/components/authoring/lesson-step-editor.tsx` — 当前步骤 payload 编辑与保存能力。
- `src/components/authoring/authoring-status-panel.tsx` — 当前发布准备与发布动作入口。
- `src/lib/dal/lesson-authoring.ts` — 当前 teacher-owned lesson/step 读取、写入、发布与 LexoRank 排序。
- `src/actions/lesson-authoring-actions.ts` — 当前 editor 相关 Server Actions 与 cache invalidation。
- `src/lib/dal/plugins.ts` — 已启用 built-in teaching-step templates 的读取与安全 hook 执行路径。
- `src/lib/dto/resource-ai.ts` — built-in teaching-step template definitions 与 plugin manifest contract。

### Preview and runtime references
- `src/app/(student)/student/player/page.tsx` — 学生端 player 的 route shape 与 shell/personal 分离模式。
- `src/components/surfaces/player-surface.tsx` — 已有课堂流程预览可借鉴的沉浸式阅读/步骤呈现语言。
- `docs/teacher-classroom-flow-review.md` — 现有 teacher editor / publish / player / classroom runtime 的结构回顾。

</canonical_refs>

<specifics>
## Specific Ideas

- 现有 built-in teaching-step template 按钮不应只做“快捷新增”，而要进入统一流程轨道并保留来源元数据。
- preview 最好让教师在 editor 内看到即时概览，同时还能进入独立预览 route 检查完整课堂顺序。
- publish-readiness 面板需要像真实发布守门员，而不是静态提示卡片。

</specifics>

<deferred>
## Deferred Ideas

None — user goal stays within phase scope

</deferred>

---

*Phase: 17-teacher-flow-editor-enhancement*
*Context gathered: 2026-05-10*
