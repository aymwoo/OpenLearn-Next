---
status: investigating
trigger: "Phase 32 UAT: /classroom 缺少 proof feedback 深链/入口，且学生进入 live 后在线人数仍显示 0"
created: 2026-05-17T14:41:52+08:00
updated: 2026-05-17T14:55:38+08:00
---

## Current Focus

hypothesis: 教师 `/classroom` 页面本身没有任何 live 订阅或自动刷新，因此学生进入和提交后的变化不会反映到教师 UI；同时 proof 区块又被 runtime-step 条件错误 gating，导致即便手动刷新后也可能无入口。
test: 对照 teacher page / teacher panel / student runtime EventSource / DAL write paths
expecting: 形成最终诊断输出
next_action: return root cause only report

## Symptoms

expected: After student submit or failure, `/classroom` shows teacher-first proof feedback and the deep link opens `/settings/labs/runtime-inspector?runtimeSessionId=...` for the same proof session.
actual: 找不到链接或者入口，同时在有学生进入课堂 live 之后，仍然显示在线人数 0 人。
errors: None reported
reproduction: Test 2 in UAT
started: Discovered during UAT

## Eliminated

## Evidence

- timestamp: 2026-05-17T14:41:52+08:00
  checked: .planning/phases/32-end-to-end-hardening-and-milestone-proof/32-HUMAN-UAT.md
  found: Test 2 明确失败症状为“找不到链接或者入口，同时在线人数显示 0 人”。
  implication: 需要同时检查 classroom proof feedback UI 入口和 live presence 聚合逻辑。

- timestamp: 2026-05-17T14:41:52+08:00
  checked: .planning/STATE.md
  found: Phase 32 约束写明 proof 第一反馈必须留在 `/classroom`，并通过 runtimeSessionId 跳转 inspector；monitoring 只暴露 durable evidence 映射出的 runtimeProof。
  implication: 若 UI 缺入口或没有 runtimeSessionId，很可能是 classroom read model 未暴露/未消费 Phase 32 新字段。

- timestamp: 2026-05-17T14:41:52+08:00
  checked: .planning/debug/knowledge-base.md
  found: 文件不存在。
  implication: 没有可直接复用的已知模式，需要从代码路径重新定位。

- timestamp: 2026-05-17T14:41:52+08:00
  checked: common-bug-patterns.md
  found: 当前最匹配模式是 Data Shape / API Contract 与 State Management 中的 dual source of truth。
  implication: 优先验证 classroom DTO/consumer 是否遗漏了 runtime proof 或 presence 的真实数据源。

- timestamp: 2026-05-17T14:44:50+08:00
  checked: grep over src for runtimeSessionId/runtimeProof/presence/online
  found: `src/lib/dal/classroom.ts`、`src/lib/dto/classroom.ts`、`src/components/classroom/classroom-control-panel.tsx` 明确包含 runtimeProof/runtimeSessionId；presence 更新链路存在于 `src/components/learning/classroom-runtime-client.tsx` 和 `src/lib/dal/classroom.ts`。
  implication: 问题不像“完全没实现”，更像 consumer 显示条件、字段映射或 presence 聚合口径错误。

- timestamp: 2026-05-17T14:47:03+08:00
  checked: src/components/classroom/classroom-control-panel.tsx and classroom-roster-panel.tsx
  found: proof first-feedback 卡片与 `查看运行轨迹` 链接被整体包在 `currentRuntimeDescriptor ? ... : null` 条件里；在线人数显示直接读 `currentSnapshot.monitoringSummary.connectedCount`。
  implication: 只要当前步骤不是 runtime step，即便参与者已有 `runtimeProof`，`/classroom` 也不会显示任何 proof 反馈入口；presence 0 不是纯展示文案问题，而是 snapshot summary 真值本身为 0。

- timestamp: 2026-05-17T14:47:03+08:00
  checked: src/lib/dal/classroom.ts getClassroomSnapshotDTO
  found: snapshot 会从 `classroomParticipants.connectionState === "connected"` 直接计算 `monitoringSummary.connectedCount`，同时从当前 active step 的 evidence 提取 `runtimeProof`。
  implication: 在线人数 0 说明 `classroomParticipants` 没被更新到 connected；proof 入口缺失则与 UI gating 和 active-step-scoped extraction 都有关。

- timestamp: 2026-05-17T14:49:02+08:00
  checked: src/app/(classroom)/classroom/page.tsx and /api/classroom/* routes
  found: `/classroom` 页面直接消费一次 `getClassroomSnapshotDTO()`；SSE route 存在，但只被学生端 `classroom-runtime-client.tsx` 使用，教师端未订阅。
  implication: 教师页面不会随着学生进入或提交而自动更新，这是在线人数停留 0 和反馈入口缺失的主因。

- timestamp: 2026-05-17T14:55:38+08:00
  checked: global EventSource usage and teacher/student surfaces
  found: 全仓库唯一 classroom EventSource 使用在 `src/components/learning/classroom-runtime-client.tsx`；教师端 `src/app/(classroom)/classroom/page.tsx` 与 `src/components/classroom/classroom-control-panel.tsx` 没有 EventSource、polling 或 `router.refresh()` 订阅链路。
  implication: 教师 `/classroom` 天然不会随 live presence/proof 变化更新，除非手动刷新或补上 teacher-side live subscription。

- timestamp: 2026-05-17T14:55:38+08:00
  checked: `updateClassroomParticipantConnection` and `submitRuntimeState`
  found: presence 更新写 `classroomParticipants` + timeline；runtime submit 写 classroom evidence/proofSummary；两条路径都不会直接推动教师页面重渲染。
  implication: 学生端 truth 已持久化，但 teacher-first surface 缺少消费刷新机制。

## Resolution

root_cause: 教师 `/classroom` 页面没有 live 更新机制：`src/app/(classroom)/classroom/page.tsx` 只在首屏读取一次 `getClassroomSnapshotDTO()`，`src/components/classroom/classroom-control-panel.tsx` 只消费这个静态 `initialSnapshot`。学生进入课堂后的 presence 更新和 runtime submit 后写入的 runtime proof 虽然会落库，但教师端不会自动刷新，所以 UAT 中在线人数持续显示 0、teacher-first proof feedback/深链也看不到。另有次级缺陷：proof first-feedback 卡片被 `currentRuntimeDescriptor` 条件包裹，当前步骤不是 runtime step 时，即使刷新后已有 `runtimeProof` 也仍可能没有入口。
fix:
verification:
files_changed: []
