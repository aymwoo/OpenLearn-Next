---
phase: 12-classroom-launch-and-built-in-teaching-steps
verified: 2026-05-08T22:39:54Z
status: gaps_found
score: 5/11 must-haves verified
overrides_applied: 0
gaps:
  - truth: "教师可以从专用开课页安全地选择可开课内容，并在创建后进入正确的 live classroom 运行台"
    status: failed
    reason: "`/teacher/launch` 已存在，但其数据源未按教师学校范围过滤，且开课成功后固定跳转 `/classroom`，多 live session 时会回到错误课堂。"
    artifacts:
      - path: "src/lib/dal/classroom.ts"
        issue: "259-265 行直接读取全部 published lessons / classes / courseClasses，没有按 `scope.schoolIds` 过滤。"
      - path: "src/components/classroom/classroom-launch-panel.tsx"
        issue: "56-60 行忽略 `launchClassroomSessionAction()` 返回的 `sessionId`，固定 `router.push(successHref)`。"
    missing:
      - "按教师 school scope 过滤 published lessons、classes、courseClasses。"
      - "创建课堂成功后带上返回的 `sessionId` 跳转到 `/classroom?sessionId=...`。"
  - truth: "系统内置教学环节插件作为真实、可用、默认启用的 registry 记录存在"
    status: failed
    reason: "五个 seeded built-in plugin 仍声明旧 action `addStepSuggestion`，导致 12-04 新增的 typed built-in template/suggestion 通路对真实 seed 数据不可达。"
    artifacts:
      - path: "scripts/bootstrap-dev-db.ts"
        issue: "72-137 行五个 built-in manifest 的 `actions` 全是 `addStepSuggestion`。"
      - path: "src/lib/dal/plugins.ts"
        issue: "449-461 行会调用 `insertBuiltInTeachingStepTemplate`，但真实 seeded manifest 不允许该 action。"
    missing:
      - "将 built-in manifests 升级为显式声明 `suggestBuiltInTeachingStep` / `insertBuiltInTeachingStepTemplate`。"
      - "补充执行级测试，验证 seeded built-ins 能真实跑通 hook。"
  - truth: "作者编排页中的内置教学环节与插件启停状态保持一致"
    status: failed
    reason: "编排页直接硬编码内置教学环节定义并直接调用 `addLessonStepAction()`，绕过 plugin registry / DAL / enabled state；即使内置插件被停用，教师仍可继续插入。"
    artifacts:
      - path: "src/components/authoring/lesson-authoring-workspace.tsx"
        issue: "16-19、80-84、120-128、208-218 行直接依赖 `BUILT_IN_TEACHING_STEP_DEFINITIONS` 和本地按钮，而不是学校范围的 enabled built-ins。"
    missing:
      - "从 DAL / Server Action 拉取当前学校启用的 built-in templates。"
      - "禁用 built-in 时不再在 quick-add 中展示或插入。"
  - truth: "内置教学环节在 plugin marketplace 中可见，或有已接受的等价替代实现"
    status: failed
    reason: "路线图成功标准明确写的是 plugin marketplace，但当前代码只有 `/settings/labs` 管理卡片，没有 marketplace route/surface，也没有 override 记录把 labs 视为已接受替代。"
    artifacts:
      - path: "src/app/settings/labs/page.tsx"
        issue: "只渲染 Labs settings surface。"
      - path: "src/components/surfaces/settings-surface.tsx"
        issue: "269-329 行提供的是 labs 内的插件管理，不是 marketplace surface。"
    missing:
      - "实现 roadmap 所述的 plugin marketplace 可见性；或"
      - "在 VERIFICATION frontmatter 添加 override，明确接受 labs/plugin-management 作为本阶段 marketplace 替代。"
  - truth: "Phase 12 自带的 verifier 能实际拦截 launch / built-in 回归"
    status: failed
    reason: "`verify:phase12` 和相关测试主要做字符串匹配；在存在真实 blocker 的情况下仍然全部通过，不能证明阶段目标达成。"
    artifacts:
      - path: "scripts/verify-phase12-launch-and-builtins.ts"
        issue: "44-101 行只检查字符串/文件存在，无法发现数据越权、错误跳转、seed/action 不匹配、disabled built-in 仍可插入。"
      - path: "src/lib/dal/classroom.test.ts"
        issue: "5-45 行为源码字符串断言。"
      - path: "src/actions/classroom-actions.test.ts"
        issue: "5-26 行为源码字符串断言。"
      - path: "src/lib/dal/plugins.test.ts"
        issue: "5-61 行为源码字符串断言。"
    missing:
      - "增加行为级测试：school scope、launch redirect sessionId、disabled built-in 隐藏、seeded built-in hook 执行。"
---

# Phase 12: Classroom Launch and Built-in Teaching Steps Verification Report

**Phase Goal:** Teachers can start a new classroom from a dedicated launch
surface, preview lesson orchestration in context, and use first-party built-in
teaching-step plugins that are enabled by default in the authoring flow and
plugin marketplace.
**Verified:** 2026-05-08T22:39:54Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | 教师可打开专用“开启新课堂”页，并从那里选择已发布课时/班级后启动或恢复运行台 | ✗ FAILED | `src/app/(teacher)/teacher/launch/page.tsx:1-8` 与 `classroom-launch-surface.tsx:21-121` 确实存在；但 `src/lib/dal/classroom.ts:259-265` 未按学校范围过滤，`classroom-launch-panel.tsx:56-60` 启动后固定跳转裸 `/classroom`。 |
| 2 | 开课预览以内联方式留在 launch page，不跳新路由/不弹 modal | ✓ VERIFIED | `src/components/classroom/classroom-launch-panel.tsx:141-145` 直接内联 `ClassroomLaunchPreview`；未发现 preview route。 |
| 3 | 预览展示步骤顺序、摘要、预计时长、材料提示 | ✓ VERIFIED | `src/lib/dal/classroom.ts:119-149` 构造 `order/summary/estimatedMinutes/materialCues`；`classroom-launch-preview.tsx:51-91` 全部渲染。 |
| 4 | 未选课时有平静占位态说明预览会显示什么 | ✓ VERIFIED | `src/lib/dal/classroom.ts:300-304` 提供 empty-state copy；`classroom-launch-preview.tsx:17-31` 渲染占位态。 |
| 5 | 新开课堂是主动作，live classroom 恢复区是次级区域 | ✓ VERIFIED | `classroom-launch-surface.tsx:47-119` 使用主列 launch panel + 侧栏次级恢复区，并在文案中明确“不会压过新开课堂主动作”。 |
| 6 | `/classroom` 仍负责 active runtime control，不复制 launch prep | ✓ VERIFIED | `classroom/page.tsx:12-17` 有 active session 时加载 snapshot；`classroom-console-surface.tsx:37-69` 渲染 `ClassroomControlPanel`，无 live session 时仅引导回 `/teacher/launch`。 |
| 7 | 五个 built-in teaching-step plugins 作为真实默认启用记录存在，并可沿安全链路使用 | ✗ FAILED | `bootstrap-dev-db.ts:72-137` 虽 seeded 五个插件，但 actions 仍是 `addStepSuggestion`；`plugins.ts:449-461` 需要 `insertBuiltInTeachingStepTemplate`，真实 seed 数据走不通。 |
| 8 | 管理 UI 清晰标记 `系统内置`、`默认开启`，允许停用但不允许删除 | ✓ VERIFIED | `settings-surface.tsx:279-319` 渲染标签与启停按钮；`plugins.ts:250-264` 在 DAL 阻止 built-in 删除。 |
| 9 | 作者页内置教学环节与插件启停状态一致，禁用后不会继续插入 | ✗ FAILED | `lesson-authoring-workspace.tsx:16-19,80-84,120-128,208-218` 直接用常量和 `addLessonStepAction()`，未读取 enabled built-ins。 |
| 10 | Built-in plugin 行为保持在 allowlisted action + local renderer 内，无任意脚本路径 | ✗ FAILED | `registry.ts:39-77` allowlist 本身存在；但真实 seed manifest 未声明新 action，且 authoring 直接绕过 registry，故“已落地的 built-in 行为”并未稳定停留在该安全链路中。 |
| 11 | Phase 12 自带 verifier 能覆盖 launch routing、preview、seeded built-ins、authoring exposure | ✗ FAILED | `scripts/verify-phase12-launch-and-builtins.ts:44-101` 仅做静态字符串检查；`pnpm exec tsx scripts/verify-phase12-launch-and-builtins.ts` 仍通过，却没发现本次 4 个 blocker。 |

**Score:** 5/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/app/(teacher)/teacher/launch/page.tsx` | 教师专用 launch route | ⚠️ HOLLOW | 路由存在并调用 DAL，但依赖的 `getClassroomConsoleDTO()` 数据源未按学校范围过滤。 |
| `src/components/surfaces/classroom-launch-surface.tsx` | 开课主舞台与次级恢复区 | ✓ VERIFIED | 布局、恢复卡片、主 CTA 均存在。 |
| `src/components/classroom/classroom-launch-panel.tsx` | 开课表单与成功跳转 | ⚠️ HOLLOW | 表单存在，但成功后未带 `sessionId` 跳转。 |
| `src/components/classroom/classroom-launch-preview.tsx` | 内联预览 | ✓ VERIFIED | 渲染顺序、摘要、时长、材料与空态。 |
| `src/app/(classroom)/classroom/page.tsx` | live runtime route | ✓ VERIFIED | 仍按 active session 组装 runtime。 |
| `src/lib/dal/classroom.ts` | 教师开课 DTO 与 live session 恢复数据 | ⚠️ HOLLOW | live sessions 教师 scoped；published lessons/classes 非 scoped。 |
| `src/lib/dto/classroom.ts` | launch preview DTO contract | ✓ VERIFIED | Zod schema 完整定义 launch preview。 |
| `scripts/bootstrap-dev-db.ts` | 五个 built-in seed records | ⚠️ HOLLOW | 记录存在且默认启用，但 action 集与真实 runtime 需求不一致。 |
| `src/lib/dto/resource-ai.ts` | built-in metadata / action schema | ✓ VERIFIED | builtIn/defaultEnabled/nonDeletable 与新 action enum 已定义。 |
| `src/lib/dal/plugins.ts` | built-in metadata flow 与 delete guard | ⚠️ HOLLOW | delete guard 正常；template hook 路径被旧 manifest action 阻断。 |
| `src/components/surfaces/settings-surface.tsx` | built-in 标签与 non-delete framing | ✓ VERIFIED | labs 管理页标记和 toggle framing 已实现。 |
| `src/components/authoring/lesson-authoring-workspace.tsx` | 一级 `内置教学环节` quick-add | ⚠️ HOLLOW | UI 存在，但与 registry enabled state 断开。 |
| `src/server/plugins/registry.ts` | built-in first-party allowlist | ✓ VERIFIED | allowlisted actions 与 typed proposal dispatch 均存在。 |
| `scripts/verify-phase12-launch-and-builtins.ts` | Phase 12 回归 verifier | ⚠️ HOLLOW | 文件存在且可运行，但覆盖深度不足。 |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `teacher/launch/page.tsx` | `src/lib/dal/classroom.ts` | `getClassroomConsoleDTO()` | ⚠️ PARTIAL | 已调用，但 `publishedLessons/classes` 查询未按 `scope.schoolIds` 过滤。 |
| `classroom-launch-surface.tsx` | `classroom-launch-panel.tsx` | `ClassroomLaunchPanel` | ✓ WIRED | `classroom-launch-surface.tsx:47-56` 直接组合。 |
| `classroom-launch-panel.tsx` | `classroom-launch-preview.tsx` | `ClassroomLaunchPreview` | ✓ WIRED | `classroom-launch-panel.tsx:141-145` 内联渲染。 |
| `src/lib/dal/classroom.ts` | `src/lib/dto/lesson-authoring.ts` | `lessonStepPayloadSchema` | ✓ WIRED | `classroom.ts:56-70,29` 解析已发布 step payload。 |
| `src/components/shell/sidebar.tsx` | `/teacher/launch` | CTA link | ✓ WIRED | `sidebar.tsx:89-94`。 |
| `src/app/(teacher)/teacher/layout.tsx` | `/teacher/launch` | header CTA | ✓ WIRED | `layout.tsx:76-78`。 |
| `classroom-launch-panel.tsx` | `/classroom` target session | launch success redirect | ✗ NOT_WIRED | `classroom-launch-panel.tsx:57-60` 未使用返回的 `sessionId`。 |
| `scripts/bootstrap-dev-db.ts` | `src/server/plugins/registry.ts` | built-in action vocabulary | ✗ NOT_WIRED | seed manifest 只声明 `addStepSuggestion`，与 registry 新 action 不匹配。 |
| `src/lib/dal/plugins.ts` | `settings-surface.tsx` | `builtIn/defaultEnabled` DTO flow | ✓ WIRED | `plugins.ts:77-91,230-247` → `settings-surface.tsx:279-319`。 |
| `lesson-authoring-workspace.tsx` | plugin registry enabled state | school-scoped built-ins | ✗ NOT_WIRED | 作者页直接用常量，未接入 DAL / hook / enabled state。 |
| `verify-phase12-launch-and-builtins.ts` | 实际行为回归 | dedicated verifier | ⚠️ PARTIAL | 有脚本与 package script，但只校验字符串存在。 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `src/app/(teacher)/teacher/launch/page.tsx` | `consoleData` | `getClassroomConsoleDTO()` → DB | Yes | ⚠️ LEAKY — 数据真实但未按学校隔离。 |
| `src/components/classroom/classroom-launch-preview.tsx` | `selectedLesson.launchPreview` | `buildLaunchPreview()` → published snapshot | Yes | ✓ FLOWING |
| `src/components/surfaces/settings-surface.tsx` | `plugins` | `listPluginsAction()` → `listPluginsForSchool()` → `pluginRegistrations` | Yes | ✓ FLOWING |
| `src/components/authoring/lesson-authoring-workspace.tsx` | `builtInTeachingSteps` | `BUILT_IN_TEACHING_STEP_DEFINITIONS` 常量 | No | ✗ DISCONNECTED — 未经过 registry enabled state。 |
| `src/lib/dal/plugins.ts#getBuiltInTeachingStepTemplateForSchool` | `result.payload` | `runPluginHook()` → seeded manifest actions | No | ✗ DISCONNECTED — 真实 seeded manifest 不允许 template action。 |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Phase 12 静态 verifier 可运行 | `pnpm exec tsx scripts/verify-phase12-launch-and-builtins.ts` | exits 0, 输出 `Phase 12 launch and built-ins verification passed` | ✓ PASS |
| 当前仓库类型约束通过 | `pnpm typecheck` | exits 0 | ✓ PASS |
| Phase 12 相关测试通过 | `pnpm test -- src/lib/dal/classroom.test.ts src/actions/classroom-actions.test.ts src/lib/dal/plugins.test.ts` | 22 files / 80 tests passed | ✓ PASS（但这些测试主要是源码字符串断言，未覆盖本次 blocker） |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `CLASS-01` | 12-01, 12-02 | Teacher can launch a published lesson as a classroom session with a roster | ✗ BLOCKED | 专用 launch 页已存在，但 `classroom.ts:259-295` 暴露未 scoped 的 lesson/class 数据，且 `classroom-launch-panel.tsx:56-60` 启动后可能跳回错误 live session。 |
| `CLASS-02` | 12-04 | Teacher can see and change the active step of a live classroom session | ✓ SATISFIED | `classroom-console-surface.tsx:37-69` 渲染 `ClassroomControlPanel`；`classroom-control-panel.tsx:32-45,165-170+` 处理 step change。 |
| `CLASS-03` | 12-04 | Teacher can switch classroom locked/unlocked mode | ✓ SATISFIED | `classroom-control-panel.tsx:48-62,116-133` 调用 `changeClassroomModeAction()`。 |
| `CLASS-04` | 12-04 | Student player reflects active step and lock mode via Edge Runtime SSE | ✓ SATISFIED | `student/player/page.tsx:37-39` 装配 `ClassroomRuntimeClient`；`classroom-runtime-client.tsx:214-259` 使用 `EventSource`，`190-211` 应用 snapshot 中的 `locked/activeStepId`；`api/classroom/[sessionId]/events/route.ts:1-83` 提供 SSE。 |
| `CLASS-06` | 12-01, 12-02 | Reconnecting or late-joining students receive a consistent snapshot | ✓ SATISFIED | `learning.ts:457-505` 恢复 classroom runtime；`classroom-runtime-client.tsx:175-188,230-239` 断线后抓 durable snapshot。 |
| `CLASS-07` | 12-01, 12-02 | Teacher can recover from classroom control conflicts or stale UI with clear feedback | ✓ SATISFIED | `classroom-control-panel.tsx:32-62` 处理 `VERSION_CONFLICT`；`classroom.ts:358-363` 提供 stale/reconnect/restored copy。 |
| `LESSON-03` | 12-04 | Teacher can add ordered lesson steps of type content/task/quiz with validated structured payloads | ✓ SATISFIED | `lesson-authoring-workspace.tsx:109-128` 仍通过 `addLessonStepAction()` 添加 `content/task/quiz` payload；基础类型未回退。 |
| `PLUGIN-04` | 12-03, 12-04 | Developer can expose a limited action allowlist | ✗ BLOCKED | `resource-ai.ts:138-145`、`registry.ts:11-24` 有 allowlist，但真实 seeded built-ins 仍未声明新 action，导致 shipped 内置插件不能真实使用该 allowlist。 |
| `PLUGIN-05` | 12-03, 12-04 | Developer can register UI hook anchors without arbitrary script execution | ✗ BLOCKED | 安全 anchor/renderer 仍存在，但作者页直接硬编码 built-ins、绕过 registry enabled state，Phase 12 的 built-in authoring integration 未真正通过受控 hook 链路落地。 |

**交叉核对备注：**

- 4 份 PLAN frontmatter 中声明的 requirement IDs 都能在
  `.planning/REQUIREMENTS.md` 找到对应定义。
- 但 `REQUIREMENTS.md` 末尾 Traceability 表仍将这些需求映射到更早阶段
  （例如 `LESSON-03`→Phase 3，`CLASS-*`→Phase 5，`PLUGIN-*`→Phase 6），
  没有体现 Phase 12 对这些既有能力的再集成/回归范围。

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `src/lib/dal/classroom.ts` | 259-265 | 未按 teacher school scope 过滤 published lessons/classes | 🛑 Blocker | `/teacher/launch` / `/classroom` 可暴露跨学校课时与班级信息。 |
| `src/components/classroom/classroom-launch-panel.tsx` | 57-60 | launch 成功后忽略返回的 `sessionId` | 🛑 Blocker | 多 live session 时教师可能被送回错误课堂。 |
| `scripts/bootstrap-dev-db.ts` | 80/93/106/119/132 | built-in seed 仍使用旧 action `addStepSuggestion` | 🛑 Blocker | 12-04 新 built-in template/suggestion 安全链路对真实 seed 数据不可用。 |
| `src/components/authoring/lesson-authoring-workspace.tsx` | 16-19, 80-84, 120-128, 208-218 | 直接硬编码 built-ins，绕过 registry / enabled state | 🛑 Blocker | 停用 built-in 后仍可插入，违背 Phase 12 built-in contract。 |
| `scripts/verify-phase12-launch-and-builtins.ts` | 44-101 | 回归验证仅做字符串匹配 | ⚠️ Warning | 真实 blocker 存在时仍能显示“verification passed”。 |

### Gaps Summary

Phase 12 **没有达成阶段目标**。最核心的缺口不是“文件没写”，而是
“目标链路未闭环”：

1. **开课链路不可靠也不安全**：专用 launch 页已经有了，但教师可见课时/班级
   数据没有按学校隔离；新开课堂后又可能跳回旧 live classroom。
2. **内置教学环节不是稳定可用的 registry-backed 真相源**：seed manifest、DAL
   hook、authoring quick-add 三层没有对齐，导致 built-in plugins 看起来存在，
   实际上要么跑不通新 action，要么被前端硬编码绕过启停控制。
3. **验证护栏失效**：Phase 12 verifier 和相关测试都通过了，但没发现这些真实
   blocker，说明“自动验证通过”不能作为目标已达成的证据。

> **可能的 intentional deviation：plugin marketplace**
>
> 当前实现显然把 labs/plugin-management surface 当作 marketplace 的临时替代。
> 如果团队接受这个偏差，需要在后续 VERIFICATION frontmatter 里显式加入
> override；否则按 roadmap 合同，这一项仍应判定为未达成。

---

_Verified: 2026-05-08T22:39:54Z_
_Verifier: the agent (gsd-verifier)_
