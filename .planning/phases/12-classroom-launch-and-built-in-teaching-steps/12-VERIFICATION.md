---
phase: 12-classroom-launch-and-built-in-teaching-steps
verified: 2026-05-09T09:10:00Z
status: passed
score: 11/11 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 5/11
  gaps_closed:
    - "教师可以从专用开课页安全地选择可开课内容，并在创建后进入正确的 live classroom 运行台"
    - "系统内置教学环节插件作为真实、可用、默认启用的 registry 记录存在"
    - "作者编排页中的内置教学环节与插件启停状态保持一致"
    - "内置教学环节在 plugin marketplace 中可见，或有已接受的等价替代实现"
    - "Phase 12 自带的 verifier 能实际拦截 launch / built-in 回归"
  gaps_remaining: []
  regressions: []
---

# Phase 12: Classroom Launch and Built-in Teaching Steps Verification Report

本次为 **re-verification**。结论基于代码与可执行验证，不采信
SUMMARY 自述作为证据。

**Phase Goal:** Teachers can start a new classroom from a dedicated launch
surface, preview lesson orchestration in context, and use first-party built-in
teaching-step plugins that are enabled by default in the authoring flow and
plugin marketplace.

**Verified:** 2026-05-09T09:10:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure

## Goal achievement

本次复核重点追打旧版 `12-VERIFICATION.md` 的 5 个 blocker，并对此前已通过项做回归检查。结果是：旧 blocker 已全部闭合，未发现回归。

### Observable truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | 教师可以从专用开课页安全地选择可开课内容，并在创建后进入正确的 live classroom 运行台 | ✓ VERIFIED | `src/app/(teacher)/teacher/launch/page.tsx:1-7` 挂载专用页面；`src/lib/dal/classroom.ts:260-308,382-412` 以 `scope.schoolIds` 过滤课程/课时/班级并在 launch mutation 再次校验；`src/components/classroom/classroom-launch-panel.tsx:47-57,68-80` 成功后优先跳转 `/classroom?sessionId=...`。 |
| 2 | 开课预览以内联方式留在 launch page，不跳新路由/不弹 modal | ✓ VERIFIED | `src/components/classroom/classroom-launch-panel.tsx:162-167` 直接内联 `ClassroomLaunchPreview`；未发现额外 preview route 或 modal 入口。 |
| 3 | 预览展示步骤顺序、摘要、预计时长、材料提示 | ✓ VERIFIED | `src/lib/dal/classroom.ts:120-150` 生成 `order/summary/estimatedMinutes/materialCues`；`src/components/classroom/classroom-launch-preview.tsx:51-90` 全量渲染。 |
| 4 | 未选课时有平静占位态说明预览会显示什么 | ✓ VERIFIED | `src/lib/dal/classroom.ts:313-317` 提供 empty-state copy；`src/components/classroom/classroom-launch-preview.tsx:17-31` 渲染占位态。 |
| 5 | 新开课堂是主动作，live classroom 恢复区是次级区域 | ✓ VERIFIED | `src/components/surfaces/classroom-launch-surface.tsx:26-56,58-118` 主舞台为 launch，恢复区单独次级卡片呈现。 |
| 6 | `/classroom` 继续负责 active runtime control，不复制 launch prep | ✓ VERIFIED | `src/app/(classroom)/classroom/page.tsx:9-17` 根据 live session 加载 snapshot；`src/components/surfaces/classroom-console-surface.tsx:37-69,73-137` live 时渲染 `ClassroomControlPanel`，非 live 时只引导回 `/teacher/launch`。 |
| 7 | 五个 built-in teaching-step plugins 作为真实、默认启用的 registry 记录存在，并可沿安全链路使用 | ✓ VERIFIED | `scripts/bootstrap-dev-db.ts:72-138` 五个 built-in manifest 已声明 `suggestBuiltInTeachingStep` 与 `insertBuiltInTeachingStepTemplate`；`src/lib/dal/plugins.ts:400-461` 只从 enabled built-in registry record 解析模板。 |
| 8 | 管理/市场 UI 清晰标记 `系统内置`、`默认开启`，允许停用但不允许删除 | ✓ VERIFIED | `src/components/surfaces/plugin-marketplace-surface.tsx:66-103` 与 `src/components/surfaces/settings-surface.tsx:293-333` 都显示 built-in 标签和 enable/disable 语义；`src/lib/dal/plugins.ts:241-255` 阻止删除 built-in。 |
| 9 | 作者页内置教学环节与插件启停状态保持一致，停用后不会继续插入 | ✓ VERIFIED | `src/app/(teacher)/teacher/editor/page.tsx:8-18` 从 `listBuiltInTeachingStepTemplates()` 注入学校范围模板；`src/components/authoring/lesson-authoring-workspace.tsx:86-98,208-228` 仅从 `builtInTemplates` 渲染 quick-add；`src/components/authoring/lesson-authoring-workspace.test.tsx:20-93` 断言未启用项不显示。 |
| 10 | Built-in plugin 行为保持在 allowlisted action + local renderer 内，无任意脚本路径 | ✓ VERIFIED | `src/server/plugins/registry.ts:11-24,39-77` 明确 allowlist；`src/components/plugins/plugin-renderer.tsx:21-63` 仅运行 enabled plugin hook；`src/components/plugins/widgets/index.tsx:15-33` 只做本地 typed widget 分发；`scripts/verify-phase12-launch-and-builtins.ts:23-30,80-87` 对 `eval(` / `dangerouslySetInnerHTML` / `<script` 做静态阻断。 |
| 11 | Phase 12 自带 verifier 能拦截 launch / built-in 关键回归，且不再主要依赖字符串匹配 | ✓ VERIFIED | `scripts/verify-phase12-launch-and-builtins.ts:32-47,115-119` 真实执行目标 Vitest 套件；`src/lib/dal/classroom.test.ts:93-111` 覆盖 school scope；`src/components/classroom/classroom-launch-panel.test.tsx:32-83` 覆盖 session redirect；`src/lib/dal/plugins.builtins.test.ts:97-218` 覆盖 seeded hook/template gating；`src/components/authoring/lesson-authoring-workspace.test.tsx:20-93` 覆盖 disabled built-in hidden。 |

**Score:** 11/11 truths verified

### Required artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/app/(teacher)/teacher/launch/page.tsx` | 教师专用 launch route | ✓ VERIFIED | 服务端拉取 `getClassroomConsoleDTO()` 并渲染 `ClassroomLaunchSurface`。 |
| `src/components/surfaces/classroom-launch-surface.tsx` | 开课主舞台与次级恢复区 | ✓ VERIFIED | 主 launch + 次级恢复区布局完整。 |
| `src/components/classroom/classroom-launch-panel.tsx` | 开课表单与精确跳转 | ✓ VERIFIED | 使用返回的 `sessionId` 精确 handoff。 |
| `src/components/classroom/classroom-launch-preview.tsx` | 内联预览 | ✓ VERIFIED | 呈现顺序、摘要、时长、材料与空态。 |
| `src/lib/dal/classroom.ts` | teacher-scoped launch DTO 与 runtime launch boundary | ✓ VERIFIED | DTO 查询和 launch mutation 都做 school scope 收口。 |
| `scripts/bootstrap-dev-db.ts` | 五个 built-in seed records | ✓ VERIFIED | manifest 动作与 shipped allowlist 对齐。 |
| `src/lib/dal/plugins.ts` | built-in 模板解析与删除保护 | ✓ VERIFIED | 只信任 enabled + declared action 的 registry record。 |
| `src/app/(teacher)/teacher/editor/page.tsx` | school-scoped built-in template 注入 | ✓ VERIFIED | 路由边界注入 `builtInTemplates`。 |
| `src/components/authoring/lesson-authoring-workspace.tsx` | registry-backed built-in quick-add | ✓ VERIFIED | built-ins 从模板数组渲染并通过 `addLessonStepAction()` 插入。 |
| `src/app/settings/plugins/page.tsx` | 专用 plugin marketplace route | ✓ VERIFIED | 独立 route 挂载 `PluginMarketplaceSurface`。 |
| `scripts/verify-phase12-launch-and-builtins.ts` | 行为优先 phase verifier | ✓ VERIFIED | 运行真实回归测试，非仅源码 token 命中。 |

### Key link verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `teacher/launch/page.tsx` | `src/lib/dal/classroom.ts` | `getClassroomConsoleDTO()` | ✓ WIRED | `page.tsx:1-7` → `classroom.ts:214-319`。 |
| `classroom-launch-panel.tsx` | `/classroom?sessionId=` | launch success redirect | ✓ WIRED | `classroom-launch-panel.tsx:68-80` 使用返回 `sessionId`。 |
| `src/lib/dal/classroom.ts` | school scope | `courses/classes/courseClasses` filtering | ✓ WIRED | `classroom.ts:260-308,386-412`。 |
| `scripts/bootstrap-dev-db.ts` | `src/server/plugins/registry.ts` | built-in action vocabulary | ✓ WIRED | seed manifest actions 与 `PLUGIN_ACTION_ALLOWLIST` 一致。 |
| `src/app/(teacher)/teacher/editor/page.tsx` | `src/lib/dal/plugins.ts` | `listBuiltInTeachingStepTemplates()` | ✓ WIRED | `editor/page.tsx:11-13`。 |
| `lesson-authoring-workspace.tsx` | `addLessonStepAction()` | `initialPayload` insertion | ✓ WIRED | `lesson-authoring-workspace.tsx:129-138,217-227`。 |
| `src/app/settings/plugins/page.tsx` | `PluginMarketplaceSurface` | dedicated marketplace assembly | ✓ WIRED | `settings/plugins/page.tsx:5-10`。 |
| `settings-surface.tsx` | `/settings/plugins` | settings entry link | ✓ WIRED | `settings-surface.tsx:88-94,160-161`。 |
| `verify-phase12-launch-and-builtins.ts` | targeted Vitest suites | behavior-level release gate | ✓ WIRED | `verify-phase12-launch-and-builtins.ts:32-47,115-117`。 |

### Data-flow trace (level 4)

| Artifact | Data variable | Source | Produces real data | Status |
| --- | --- | --- | --- | --- |
| `src/app/(teacher)/teacher/launch/page.tsx` | `consoleData` | `getClassroomConsoleDTO()` → DB queries on courses/lessons/classes | Yes | ✓ FLOWING |
| `src/components/classroom/classroom-launch-preview.tsx` | `selectedLesson.launchPreview` | published snapshot → `buildLaunchPreview()` | Yes | ✓ FLOWING |
| `src/app/(teacher)/teacher/editor/page.tsx` | `builtInTemplates` | `listBuiltInTeachingStepTemplates()` → enabled plugin rows → `runPluginHook()` | Yes | ✓ FLOWING |
| `src/components/surfaces/plugin-marketplace-surface.tsx` | `plugins` | `listPluginsAction()` → `listPluginsForSchool()` | Yes | ✓ FLOWING |

### Behavioral spot-checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Phase 12 verifier | `pnpm exec tsx scripts/verify-phase12-launch-and-builtins.ts` | 通过；执行 launch/built-in/marketplace 目标回归套件后输出 `Phase 12 launch and built-ins verification passed` | ✓ PASS |
| 类型约束 | `pnpm typecheck` | 通过 | ✓ PASS |

### Requirements coverage

| Requirement | Source plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `CLASS-01` | 12-01, 12-02, 12-05, 12-09 | Teacher can launch a published lesson as a classroom session with a roster | ✓ SATISFIED | `classroom.ts:260-319,382-469` + `classroom-launch-panel.tsx:68-80` + `classroom.test.ts:93-111`。 |
| `CLASS-02` | 12-04 | Teacher can see and change the active step of a live classroom session | ✓ SATISFIED | `classroom-control-panel.tsx:32-46,165-199`。 |
| `CLASS-03` | 12-04 | Teacher can switch classroom locked/unlocked mode | ✓ SATISFIED | `classroom-control-panel.tsx:48-62,116-133`。 |
| `CLASS-04` | 12-04 | Student player reflects active step and lock mode via Edge Runtime SSE | ✓ SATISFIED | `src/components/learning/classroom-runtime-client.tsx:190-259` + `src/app/api/classroom/[sessionId]/events/route.ts:14-83`。 |
| `CLASS-06` | 12-01, 12-02 | Reconnecting or late-joining students receive a consistent snapshot | ✓ SATISFIED | `classroom-runtime-client.tsx:175-188,230-239` 使用 durable snapshot 恢复。 |
| `CLASS-07` | 12-01, 12-02, 12-05, 12-09 | Teacher can recover from classroom control conflicts or stale UI with clear feedback | ✓ SATISFIED | `classroom-actions.ts:76-83,101-108` 返回 `latest` snapshot；`classroom-control-panel.tsx:22-27,39-45,55-60,79` 处理冲突恢复。 |
| `LESSON-03` | 12-04, 12-07 | Teacher can add ordered lesson steps of type content/task/quiz with validated structured payloads | ✓ SATISFIED | `lesson-authoring-workspace.tsx:118-138` 仍经 `addLessonStepAction()` 写入 content/task/quiz payload。 |
| `PLUGIN-04` | 12-03, 12-04, 12-06, 12-09 | Developer can expose a limited action allowlist | ✓ SATISFIED | `resource-ai.ts:138-145` + `registry.ts:11-24` + `plugins.builtins.test.ts:97-218`。 |
| `PLUGIN-05` | 12-03, 12-04, 12-06, 12-07, 12-08, 12-09 | Developer can register UI hook anchors without arbitrary script execution | ✓ SATISFIED | `plugin-renderer.tsx:21-63`、`widgets/index.tsx:15-33`、`plugin-marketplace-surface.tsx:95-102`、`settings/plugins/page.tsx:5-10`。 |

### Anti-patterns found

本次未发现阻塞 Phase 12 goal 的 blocker anti-pattern。仅保留 1 条非阻塞 warning：

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `scripts/verify-phase12-launch-and-builtins.ts`, `src/components/surfaces/settings-surface.test.tsx` | `32-47`, `59-68` | marketplace toggle 回归仍未直接断言表单提交会触发 `setPluginEnabledAction` | ⚠️ Warning | 这是 release-gate 覆盖深度问题，不是功能缺失。实际 surface 已在 `plugin-marketplace-surface.tsx:15-23,95-102` 使用 server action form wiring，故不构成 blocker。 |

### Gaps summary

旧版 5 个 blocker 已全部关闭：

1. **launch school scope / session redirect 已真实成立**：查询和 mutation 两端都按教师学校范围收口，launch 成功后进入精确 session。
2. **built-in seed action / template resolution / authoring gating / marketplace 已闭环**：seed manifest、registry allowlist、DAL template resolution、authoring quick-add、marketplace visibility 已对齐。
3. **Phase 12 verifier 已从字符串匹配升级为行为优先**：当前会真实执行关键回归套件，并在 unsafe pattern 上继续做静态阻断。
4. **最新 code review 剩余 warning 不是 blocker**：它指出的是 verifier 对 marketplace toggle 提交行为的覆盖还不够深，但代码 wiring 已存在，未观察到实现缺口。

结论：**Phase 12 goal 已达到。**

---

_Verified: 2026-05-09T09:10:00Z_
_Verifier: the agent (gsd-verifier)_
