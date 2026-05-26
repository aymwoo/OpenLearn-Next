import { describe, expect, it } from "vitest";

import {
  evaluatePhase58StaticChecks,
  getPhase58ProofHardGateScenarios,
  getPhase58VerificationSuitePaths,
  verifyPhase58PackageScripts,
} from "./verify-phase58-operator-recovery-and-surfaces";

describe("verify-phase58 operator recovery gate", () => {
  it("expects the dedicated verify:phase58 and proof:phase58 package scripts", () => {
    expect(
      verifyPhase58PackageScripts(
        JSON.stringify({
          scripts: {
            "verify:phase58": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase58-operator-recovery-and-surfaces.ts",
            "proof:phase58": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/proof-phase58-operator-recovery.ts",
          },
        }),
      ),
    ).toBe(true);
  });

  it("locks the focused suite list and proof hard-gate scenario ids", () => {
    expect(getPhase58VerificationSuitePaths()).toEqual([
      "src/components/surfaces/settings-surface.test.tsx",
      "src/components/surfaces/classroom-incident-operator-surface.test.tsx",
      "src/components/classroom/classroom-control-panel.test.tsx",
      "src/actions/operator-classroom-recovery-actions.test.ts",
      "src/components/surfaces/runtime-inspector-surface.test.tsx",
      "src/components/surfaces/async-task-operator-surface.test.tsx",
      "src/components/surfaces/plugin-lifecycle-operator-surface.test.tsx",
      "src/features/async-tasks/server/recovery.test.ts",
    ]);

    expect(getPhase58ProofHardGateScenarios()).toEqual([
      "plugin-failure-walkthrough",
      "transport-worker-degraded-walkthrough",
    ]);
  });

  it("keeps static close-gate checks focused on incident-first IA, honesty template, server seams, and proof artifacts", () => {
    const checks = evaluatePhase58StaticChecks({
      packageSource: JSON.stringify({
        scripts: {
          "verify:phase58": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/verify-phase58-operator-recovery-and-surfaces.ts",
          "proof:phase58": "node --require ./scripts/server-only-node-shim.cjs --import tsx scripts/proof-phase58-operator-recovery.ts",
        },
      }),
      settingsSurfaceSource: `
        ClassroomIncidentListSurface
        getClassroomIncidentListDTO
        没有 classroom deep link 时，先从课堂事件进入
        Runtime Inspector
        Async Operator
        Plugin Governance
      `,
      settingsLabsPageSource: `SettingsSurface mode="labs"`,
      settingsLabsIncidentsPageSource: `getClassroomIncidentListDTO ClassroomIncidentListSurface`,
      incidentSurfaceSource: `
        data-testid="incident-honesty-card"
        仍可信什么 / 已不可信什么
        影响范围
        推荐下一步
        查看任务详情
        当前问题
        关联对象与下一跳
        轻量恢复
      `,
      classroomControlPanelSource: `
        currentVotingRound.recoveryActions
        action.action === 'retry' || action.action === 'reconcile'
        resume、suspend、fallback 需前往课堂事件或 detail surface 进行强确认
        查看课堂事件
      `,
      operatorRecoveryActionSource: `
        runCurrentVotingRecoveryAction
        getClassroomSnapshotDTO
        revalidatePath("/settings/labs/incidents")
      `,
      classroomActionsSource: `
        recordRuntimeTeacherControl
        updateTag(cacheTags.classroom(input.sessionId))
        source: "classroom-voting-recovery"
      `,
      runtimeInspectorSurfaceSource: `toRuntimeInspectorHonestyCard honestyCard.sections.map`,
      asyncTaskOperatorSurfaceSource: `toAsyncTaskOperatorHonestyCard backlogHonesty.sections.map`,
      pluginLifecycleSurfaceSource: `toPluginLifecycleHonestyCard honestyCard.sections.map`,
      operatorHonestySource: `
        id: z.enum(["trustBoundary", "impactScope", "nextStep"])
        label: "仍可信什么 / 已不可信什么"
        label: "影响范围"
        label: "推荐下一步"
      `,
      proofSource: `
        plugin-failure-walkthrough
        transport-worker-degraded-walkthrough
        ClassroomIncidentOperatorSurface
        PluginLifecycleOperatorSurface
        RuntimeInspectorSurface
        AsyncTaskOperatorSurface
      `,
      runbookSource: `
        55-PROOF-INVENTORY.md
        55-FAILURE-RECOVERY-MATRIX.md
        plugin failure
        transport / worker degraded
        无需 DB surgery
        课堂事件
      `,
      commandDetailRouteExists: true,
    });

    expect(checks).toHaveLength(8);
    expect(checks.every((check) => check.passed)).toBe(true);
  });
});
