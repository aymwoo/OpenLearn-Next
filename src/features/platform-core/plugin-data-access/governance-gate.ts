import "server-only";

import { getCurrentUserDTO } from "@/lib/dal/auth";
import { getUserMembershipsDTO } from "@/lib/dal/membership";
import { listPluginGovernanceSnapshotRecords } from "@/lib/dal/plugins";
import type { PluginLifecycleState } from "@/features/runtime-platform/contracts/permissions";

import {
  projectPluginGovernance,
  type PluginGovernanceProjectionRow,
} from "../plugins/governance-projection";
import { PluginDataAccessError, type PluginDataAccessReason } from "./allowlist";
import { writePluginDataAccessAudit } from "./audit";
import type { PluginDataAccessVerb } from "./contracts";

/**
 * 治理门以 "plugin" actor scope 落库审计——动词执行代表受治理插件行为，
 * 而非裸用户操作。
 */
const GATE_ACTOR_SCOPE = "plugin" as const;

type DerivedTeacherScope = { userId: string; schoolIds: string[] };

export type AssertActionExecutableResult = {
  /** schoolId 由 session 派生，供调用方后续审计/查询复用（绝不来自入参）。 */
  schoolId: string;
  scope: DerivedTeacherScope;
  projectionRow: PluginGovernanceProjectionRow;
};

/**
 * 读写动词共享的**前置治理门**（D-08 第 7 类：经 governed action registry 的
 * lifecycle/kill-switch 拒绝）。
 *
 * 在任何数据触达之前断言：
 *   1. actor 身份由认证 session + active membership 派生，schoolId 绝不入参；
 *   2. 目标插件经 projectPluginGovernance 投影 `executable`（lifecycle/kill-switch）；
 *   3. 不可执行 / 越校一律抛具名拒因并写 denial governance audit。
 *
 * 成功返回 `{ schoolId, scope, projectionRow }` 供调用方复用（lifecycleState /
 * killSwitchEnabled 供后续 allowed/denied audit 填充）。
 */
export async function assertActionExecutable(input: {
  actorId: string;
  pluginKey: string;
  verb: PluginDataAccessVerb;
  correlationId: string;
  commandId?: string | null;
}): Promise<AssertActionExecutableResult> {
  // 1) schoolId 仅由认证 session + active membership 派生，函数签名不接受外部 schoolId 覆盖（SC2）。
  let scope: DerivedTeacherScope;
  try {
    scope = await deriveActiveSchoolScope();
  } catch {
    await writeDenial(input, { schoolId: "", lifecycleState: "disabled", killSwitchEnabled: false });
    throw new PluginDataAccessError("non_school_actor_rejected", "actor is not an active in-school teacher");
  }

  if (!input.actorId?.trim() || scope.userId !== input.actorId) {
    await writeDenial(input, {
      schoolId: scope.schoolIds[0] ?? "",
      lifecycleState: "disabled",
      killSwitchEnabled: false,
    });
    throw new PluginDataAccessError("non_school_actor_rejected", "actor identity mismatch");
  }

  // 2) 仅在 actor 本校范围内定位目标插件，复用既有治理投影的 executable 判定。
  for (const schoolId of scope.schoolIds) {
    const snapshots = await listPluginGovernanceSnapshotRecords({ actorId: input.actorId, schoolId });
    const projection = projectPluginGovernance(snapshots);
    const projectionRow = projection.plugins.find((row) => row.pluginKey === input.pluginKey);

    if (!projectionRow) {
      continue;
    }

    if (!projectionRow.executable) {
      const reasonCode: PluginDataAccessReason = projectionRow.lifecycle.killSwitchEnabled
        ? "kill_switch_rejected"
        : "lifecycle_not_executable";
      await writeDenial(input, {
        schoolId,
        pluginId: projectionRow.pluginId,
        lifecycleState: projectionRow.lifecycle.internalSubstate ?? "disabled",
        killSwitchEnabled: projectionRow.lifecycle.killSwitchEnabled,
        reasonCode,
      });
      throw new PluginDataAccessError(reasonCode);
    }

    return { schoolId, scope, projectionRow };
  }

  // 插件不在 actor 任一本校 → 视作非本校 actor（不暴露内部边界细节）。
  await writeDenial(input, {
    schoolId: scope.schoolIds[0] ?? "",
    lifecycleState: "disabled",
    killSwitchEnabled: false,
  });
  throw new PluginDataAccessError("non_school_actor_rejected", "plugin not visible in actor school scope");
}

async function deriveActiveSchoolScope(): Promise<DerivedTeacherScope> {
  const user = await getCurrentUserDTO();
  if (!user) {
    throw new Error("NON_SCHOOL_ACTOR");
  }

  const memberships = await getUserMembershipsDTO(user.id);
  const schoolIds = memberships
    .filter((membership) => membership.status === "active")
    .map((membership) => membership.schoolId);

  if (schoolIds.length === 0) {
    throw new Error("NON_SCHOOL_ACTOR");
  }

  return {
    userId: user.id,
    schoolIds: [...new Set(schoolIds)],
  };
}

async function writeDenial(
  input: { actorId: string; pluginKey: string; verb: PluginDataAccessVerb; correlationId: string; commandId?: string | null },
  detail: {
    schoolId: string;
    pluginId?: string | null;
    lifecycleState: PluginLifecycleState;
    killSwitchEnabled: boolean;
    reasonCode?: PluginDataAccessReason;
  },
) {
  await writePluginDataAccessAudit({
    pluginId: detail.pluginId ?? null,
    schoolId: detail.schoolId,
    verb: input.verb,
    decision: "denied",
    reasonCode: detail.reasonCode ?? "non_school_actor_rejected",
    actorId: input.actorId,
    actorScope: GATE_ACTOR_SCOPE,
    lifecycleState: detail.lifecycleState,
    killSwitchEnabled: detail.killSwitchEnabled,
    correlationId: input.correlationId,
    commandId: input.commandId ?? null,
    payloadJson: { pluginKey: input.pluginKey, verb: input.verb, stage: "governance-gate" },
  });
}
