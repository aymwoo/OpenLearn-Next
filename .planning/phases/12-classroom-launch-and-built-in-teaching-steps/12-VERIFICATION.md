---
phase: 12-classroom-launch-and-built-in-teaching-steps
verified: 2026-05-09T01:18:13Z
status: passed
score: 11/11 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 10/11
  gaps_closed:
    - "Phase 12 自带 verifier 能拦截 launch / built-in / marketplace 提交回归"
  gaps_remaining: []
  regressions: []
---

# Phase 12: Classroom Launch and Built-in Teaching Steps Verification Report

**Phase Goal:** Teachers can start a new classroom from a dedicated launch
surface, preview lesson orchestration in context, and use first-party built-in
teaching-step plugins that are enabled by default in the authoring flow and
plugin marketplace.
**Verified:** 2026-05-09T01:18:13Z
**Status:** passed
**Re-verification:** Yes — after gap closure

## Goal Achievement

本次是最终 re-verification，重点倒查两件事：

1. `pnpm exec tsx scripts/verify-phase12-launch-and-builtins.ts` 是否真实可过
2. 上一轮失败的第 11 条 must-have 是否已闭环

结论：**已闭环**。此前阻断点是 marketplace/settings 回归套件加载期崩溃；现在该套件可执行、断言可跑、phase verifier 也可通过，因此 11/11 must-haves 均已验证。

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | 教师可以从专用开课页在学校范围内选择可开课内容，并在创建后跳到精确 live classroom session | ✓ VERIFIED | `src/app/(teacher)/teacher/launch/page.tsx:1-8` 挂载专用 route；`src/lib/dal/classroom.ts:214-318,382-469` 查询与 launch mutation 都按 `scope.schoolIds` 收口；`src/components/classroom/classroom-launch-panel.tsx:47-57,68-80` 成功后优先跳 `/classroom?sessionId=<id>`。 |
| 2 | 开课预览以内联方式在 launch page 展示步骤顺序、摘要、预计时长、材料提示 | ✓ VERIFIED | `src/lib/dal/classroom.ts:120-150` 构建 preview DTO；`src/components/classroom/classroom-launch-panel.tsx:162-167` 内联渲染；`src/components/classroom/classroom-launch-preview.tsx:16-92` 展示 order / summary / estimatedMinutes / materialCues。 |
| 3 | `/classroom` 继续只负责 runtime control，不复制 launch prep | ✓ VERIFIED | `src/app/(classroom)/classroom/page.tsx:9-17` 只取 live session snapshot；`src/components/surfaces/classroom-console-surface.tsx:37-69,73-137` live 时显示运行台，非 live 时明确引导去 `/teacher/launch`。 |
| 4 | 五个 built-in teaching-step plugins 作为真实 seed 记录存在，并默认启用 | ✓ VERIFIED | `scripts/bootstrap-dev-db.ts:72-138` 定义 教师讲授 / 问卷调查 / 学生探究 / 课堂测验 / 评价 5 个 built-in manifest，均含 `builtIn: true`、`defaultEnabled: true`、`nonDeletable: true`。 |
| 5 | built-in template 解析只信任 enabled 且声明 template action 的 registry 记录 | ✓ VERIFIED | `src/lib/dal/plugins.ts:400-461` 通过 `canResolveBuiltInTemplate()` 限制为 `builtIn && enabled && actions.includes('insertBuiltInTeachingStepTemplate')`；`src/lib/dal/plugins.builtins.test.ts:97-218` 覆盖 enabled / disabled / action mismatch 三条分支。 |
| 6 | 作者编排页只显示学校当前启用的 built-in teaching-step templates | ✓ VERIFIED | `src/app/(teacher)/teacher/editor/page.tsx:7-18` 以 school-scoped `listBuiltInTeachingStepTemplates()` 注入；`src/components/authoring/lesson-authoring-workspace.tsx:90-98,208-228` 仅渲染传入模板数组。 |
| 7 | disabled built-in 不会继续在 authoring quick-add 中出现 | ✓ VERIFIED | `src/components/authoring/lesson-authoring-workspace.test.tsx:20-93` 只注入两项模板，并明确断言“问卷调查 / 学生探究 / 评价”不存在。 |
| 8 | plugin marketplace 是独立 surface，清晰标记 `系统内置` / `默认开启`，只允许启停不允许删除 | ✓ VERIFIED | `src/app/settings/plugins/page.tsx:1-11` 挂载独立 route；`src/components/surfaces/plugin-marketplace-surface.tsx:12-23,66-103` 仅过滤 `builtIn` 并展示标签与启停 form；`src/lib/dal/plugins.ts:241-255` built-in 删除被拒绝。 |
| 9 | plugin marketplace 的启停提交通路已接到 server action | ✓ VERIFIED | `src/components/surfaces/plugin-marketplace-surface.tsx:15-23,95-102` 通过 `<form action={submitPluginToggle}>` 提交到 `setPluginEnabledAction()`；`src/components/surfaces/settings-surface.test.tsx:68-89` 实际断言提交后调用参数。 |
| 10 | built-in plugin 行为仍受 allowlisted action + local widget renderer 约束，无任意脚本执行 | ✓ VERIFIED | `src/server/plugins/registry.ts:10-24,39-77` 只允许声明 action；`src/components/plugins/plugin-renderer.tsx:21-63` 只运行 enabled plugin hook；`src/components/plugins/widgets/index.tsx:15-33` 仅做本地 typed widget 分发；`scripts/verify-phase12-launch-and-builtins.ts:23-30,80-87` 保留 unsafe pattern gate。 |
| 11 | `verify:phase12` 已包含并可执行 marketplace 提交行为测试，能拦截回归 | ✓ VERIFIED | `scripts/verify-phase12-launch-and-builtins.ts:32-48,61-69,115-119` 明确执行 launch/built-in suite 与 marketplace/settings suite，任一失败即抛错退出；`src/components/surfaces/settings-surface.test.tsx:16-38` 现已用 `vi.hoisted()` 提供 mock，避免 hoist 初始化崩溃；实测 `pnpm exec vitest run src/components/surfaces/settings-surface.test.tsx --reporter=verbose` 为 **1 file / 5 tests passed**，`pnpm exec tsx scripts/verify-phase12-launch-and-builtins.ts` 也已退出 0。 |

**Score:** 11/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/app/(teacher)/teacher/launch/page.tsx` | 教师专用 launch route | ✓ VERIFIED | route 存在并拉取 `getClassroomConsoleDTO()`。 |
| `src/lib/dal/classroom.ts` | school-scoped launch data + exact session launch | ✓ VERIFIED | 查询与 launch mutation 双重 scope 校验。 |
| `src/components/classroom/classroom-launch-panel.tsx` | session-aware redirect | ✓ VERIFIED | `sessionId` 优先生成 `/classroom?sessionId=`。 |
| `scripts/bootstrap-dev-db.ts` | 5 个 built-in seed records | ✓ VERIFIED | built-in/defaultEnabled/nonDeletable/action 声明完整。 |
| `src/lib/dal/plugins.ts` | template gating + delete protection | ✓ VERIFIED | disabled / action mismatch 返回 `null`，built-in 不可删。 |
| `src/components/authoring/lesson-authoring-workspace.tsx` | registry-backed quick-add | ✓ VERIFIED | 仅消费注入模板列表。 |
| `src/components/surfaces/plugin-marketplace-surface.tsx` | marketplace 可见性 + 提交 wiring | ✓ VERIFIED | built-in 卡片与 form action wiring 存在。 |
| `src/components/surfaces/settings-surface.test.tsx` | marketplace 提交行为回归测试 | ✓ VERIFIED | mock 初始化已修复，提交断言可实际执行。 |
| `scripts/verify-phase12-launch-and-builtins.ts` | behavior-first phase verifier | ✓ VERIFIED | 已接入两组行为套件，并在 suite 失败时非零退出。 |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `teacher/launch/page.tsx` | `getClassroomConsoleDTO()` | server route assembly | ✓ WIRED | `src/app/(teacher)/teacher/launch/page.tsx:1-8`。 |
| `classroom-launch-panel.tsx` | `/classroom?sessionId=` | launch success redirect | ✓ WIRED | `src/components/classroom/classroom-launch-panel.tsx:47-57,68-80`。 |
| `editor/page.tsx` | `listBuiltInTeachingStepTemplates()` | school-scoped built-in injection | ✓ WIRED | `src/app/(teacher)/teacher/editor/page.tsx:11-13`。 |
| `lesson-authoring-workspace.tsx` | `builtInTemplates` | quick-add visibility | ✓ WIRED | `src/components/authoring/lesson-authoring-workspace.tsx:90-98,208-228`。 |
| `plugin-marketplace-surface.tsx` | `setPluginEnabledAction()` | `<form action={submitPluginToggle}>` | ✓ WIRED | `src/components/surfaces/plugin-marketplace-surface.tsx:15-23,95-102`。 |
| `verify-phase12-launch-and-builtins.ts` | targeted Vitest suites | `execFileSync("pnpm", ["test", ...])` | ✓ WIRED | `scripts/verify-phase12-launch-and-builtins.ts:61-69,115-117`。 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `src/app/(teacher)/teacher/launch/page.tsx` | `consoleData` | `getClassroomConsoleDTO()` → DB query on courses / lessons / classes | Yes | ✓ FLOWING |
| `src/components/classroom/classroom-launch-preview.tsx` | `preview.steps` | `buildLaunchPreview()` from published snapshot | Yes | ✓ FLOWING |
| `src/app/(teacher)/teacher/editor/page.tsx` | `builtInTemplates` | `listBuiltInTeachingStepTemplates()` → enabled plugin rows → `runPluginHook()` | Yes | ✓ FLOWING |
| `src/components/surfaces/plugin-marketplace-surface.tsx` | `plugins` | `listPluginsAction()` → `listPluginsForSchool()` | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| launch + built-in 行为回归套件 | `pnpm exec tsx scripts/verify-phase12-launch-and-builtins.ts` | 退出 0；脚本顺序执行两组 suite 后输出 `Phase 12 launch and built-ins verification passed` | ✓ PASS |
| marketplace/settings 提交断言可执行 | `pnpm exec vitest run src/components/surfaces/settings-surface.test.tsx --reporter=verbose` | `1 passed file / 5 passed tests`，其中包含 `fireEvent.submit(...) -> setPluginEnabledAction(...)` | ✓ PASS |
| package script 暴露 verify gate | `package.json` + script run | `verify:phase12` 指向 `tsx scripts/verify-phase12-launch-and-builtins.ts` | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `CLASS-01` | 12-01, 12-02, 12-05, 12-09 | Teacher can launch a published lesson as a classroom session with a roster | ✓ SATISFIED | `src/lib/dal/classroom.ts:382-469` + `src/components/classroom/classroom-launch-panel.tsx:68-80`。 |
| `CLASS-07` | 12-05, 12-09 | Teacher can recover from classroom control conflicts or stale UI with clear feedback | ✓ SATISFIED | `src/lib/dal/classroom.ts:371-376` + `src/components/classroom/classroom-control-panel.tsx:32-61,79-80`。 |
| `LESSON-03` | 12-04, 12-07 | Teacher can add ordered lesson steps with validated payloads | ✓ SATISFIED | `src/components/authoring/lesson-authoring-workspace.tsx:129-138,217-227`。 |
| `PLUGIN-04` | 12-03, 12-04, 12-06, 12-09 | Limited plugin action allowlist exists | ✓ SATISFIED | `src/server/plugins/registry.ts:10-24`。 |
| `PLUGIN-05` | 12-03, 12-04, 12-07, 12-08, 12-09 | UI hook anchors without arbitrary script execution | ✓ SATISFIED | `src/components/plugins/plugin-renderer.tsx:21-63` + `src/components/plugins/widgets/index.tsx:15-33` + marketplace / editor hook wiring。 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `scripts/verify-phase12-launch-and-builtins.ts` | `32-48` | 行为验证依赖 targeted Vitest suite；不是纯字符串检查 | ℹ️ Info | 这是本轮闭环证据，也是避免 shallow pass 的关键改动。 |
| `package.json` / `pnpm test -- <file>` | `scripts.test` | Vitest 通过 package script 输出的是聚合摘要，不适合作为单文件唯一证据 | ℹ️ Info | 本次额外使用 `pnpm exec vitest run ... --reporter=verbose` 做了按文件复核，避免被聚合输出误导。 |

### Gaps Summary

上一轮唯一 blocker 已关闭：

- `settings-surface.test.tsx` 不再因 mock hoist 在加载期崩溃
- marketplace 提交行为测试现在真实执行并通过
- `verify:phase12` 已把该回归纳入可执行 release gate

因此，本次最终判断为 **passed**。

---

_Verified: 2026-05-09T01:18:13Z_
_Verifier: the agent (gsd-verifier)_
