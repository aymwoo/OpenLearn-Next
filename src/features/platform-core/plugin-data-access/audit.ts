import "server-only";

import { db } from "@/db";
import { governanceAudits } from "@/db/schema";
import type { PluginLifecycleState, RuntimeActorScope } from "@/features/runtime-platform/contracts/permissions";

import type { PluginDataAccessReason } from "./contracts";

/**
 * tx-aware executor 形状（仅需 `insert`）。镜像 dal/plugins.ts 的 PluginDalTx，
 * 让写动词可与变更在同一事务内原子提交（D-04）。
 */
type PluginDataAccessAuditExecutor = {
  insert: typeof db.insert;
};

/**
 * 动词级治理审计写入器。
 *
 * 复用既有 `governanceAudits` 表与 `createGovernanceAudit`（dal/plugins.ts L273）的落库形状，
 * **不新建第二审计真相源**（Pitfall #8）。
 *
 * 审计语义（D-04，由调用方控制 `decision`）：
 *   - 写动词：成功（allowed）+ 失败（denied）都写；传 `tx` 与变更原子提交。
 *   - 读动词：仅 reject/越权（denied）写；成功不调用本函数。
 *
 * 本函数只负责按统一形状落库，不裁决 decision。
 */
export async function writePluginDataAccessAudit(input: {
  tx?: PluginDataAccessAuditExecutor;
  pluginId?: string | null;
  schoolId: string;
  verb: string;
  decision: "allowed" | "denied";
  reasonCode?: PluginDataAccessReason | null;
  actorId: string;
  actorScope: RuntimeActorScope;
  lifecycleState: PluginLifecycleState;
  killSwitchEnabled: boolean;
  correlationId: string;
  commandId?: string | null;
  payloadJson: Record<string, unknown>;
}) {
  const executor = input.tx ?? db;

  await executor.insert(governanceAudits).values({
    targetType: "plugin",
    targetId: input.pluginId ?? "",
    pluginId: input.pluginId ?? null,
    schoolId: input.schoolId,
    commandId: input.commandId ?? null,
    action: `plugin.data.${input.verb}`,
    decision: input.decision,
    reasonCode: input.reasonCode ?? null,
    actorId: input.actorId,
    actorScope: input.actorScope,
    lifecycleState: input.lifecycleState,
    killSwitchEnabled: input.killSwitchEnabled,
    requestedCapabilitiesJson: [],
    grantedCapabilitiesJson: [],
    requiredPermission: null,
    correlationId: input.correlationId,
    payloadJson: input.payloadJson,
  });
}
