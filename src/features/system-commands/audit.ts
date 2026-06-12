import "server-only";

import { db } from "@/db";
import { governanceAudits } from "@/db/schema";

type SystemCommandAuditInput = {
  pluginId: string | null;
  schoolId: string;
  commandId: string | null;
  actorId: string;
  actorScope: string;
  lifecycleState: string;
  correlationId: string;
  decision: "allowed" | "denied";
  reasonCode?: string | null;
  payloadJson: Record<string, unknown>;
};

/**
 * Write a governance audit record for system command invocations.
 *
 * Follows the established audit pattern from writePluginDataAccessAudit
 * (platform-core/plugin-data-access/audit.ts). Writes to the
 * governanceAudits table via Drizzle insert.
 *
 * Field mapping per D-08:
 *   - targetType: "plugin" (system commands operate on behalf of plugins)
 *   - action: "system.http.request"
 *   - requestedCapabilitiesJson / grantedCapabilitiesJson: empty arrays
 *   - requiredPermission: null
 *   - killSwitchEnabled: false
 */
export async function writeSystemCommandAudit(
  input: SystemCommandAuditInput,
): Promise<void> {
  await db.insert(governanceAudits).values({
    targetType: "plugin" as const,
    targetId: input.pluginId ?? "",
    pluginId: input.pluginId,
    schoolId: input.schoolId,
    commandId: input.commandId ?? null,
    action: "system.http.request",
    decision: input.decision,
    reasonCode: input.reasonCode ?? null,
    actorId: input.actorId,
    actorScope: input.actorScope as
      | "host"
      | "teacher"
      | "student"
      | "plugin"
      | "operator"
      | "system",
    lifecycleState: input.lifecycleState as
      | "installed"
      | "enabled"
      | "mounted"
      | "ready"
      | "suspended"
      | "disabled"
      | "failed",
    killSwitchEnabled: false,
    requestedCapabilitiesJson: [],
    grantedCapabilitiesJson: [],
    requiredPermission: null,
    correlationId: input.correlationId,
    payloadJson: input.payloadJson,
  });
}
