import "server-only";

import { readGovernanceDashboardBundle, type GovernanceDashboardBundle } from "@/features/platform-core/actions/registry";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { getUserMembershipsDTO } from "@/lib/dal/membership";

type PluginGovernanceOperatorDetailDTO = {
  schoolId: string;
  dashboard: GovernanceDashboardBundle;
  focusedPluginId: string;
  focusedActionKey?: string;
  backHref: string;
};

async function resolveOperatorScope() {
  const user = await getCurrentUserDTO();
  if (!user) {
    throw new Error("AUTH_REQUIRED");
  }

  const memberships = await getUserMembershipsDTO(user.id);
  const activeMemberships = memberships.filter((membership) => membership.status === "active");
  const schoolIds = [...new Set(activeMemberships.map((membership) => membership.schoolId))];

  if (!schoolIds.length) {
    throw new Error("PLUGIN_GOVERNANCE_OPERATOR_FORBIDDEN");
  }

  if (
    !activeMemberships.some(
      (membership) => membership.role === "admin" || membership.role === "developer",
    )
  ) {
    throw new Error("PLUGIN_GOVERNANCE_OPERATOR_FORBIDDEN");
  }

  return {
    actorId: user.id,
    schoolIds,
  };
}

function filterDashboardByPlugin(
  dashboard: GovernanceDashboardBundle,
  pluginId: string,
  actionKey?: string,
): GovernanceDashboardBundle {
  const plugin = dashboard.pluginLifecycleRows.find((row) => row.pluginId === pluginId);

  if (!plugin) {
    throw new Error("PLUGIN_GOVERNANCE_OPERATOR_NOT_FOUND");
  }

  const executableActionCatalog = dashboard.executableActionCatalog.filter(
    (row) => row.ownerPluginId === pluginId && (!actionKey || row.actionKey === actionKey),
  );
  const blockedActionDiagnostics = dashboard.blockedActionDiagnostics.filter(
    (row) => row.ownerPluginId === pluginId && (!actionKey || row.actionKey === actionKey),
  );

  if (actionKey && executableActionCatalog.length === 0 && blockedActionDiagnostics.length === 0) {
    throw new Error("PLUGIN_GOVERNANCE_OPERATOR_NOT_FOUND");
  }

  return {
    executableActionCatalog,
    blockedActionDiagnostics,
    pluginLifecycleRows: [
      {
        ...plugin,
        executableActionCatalog,
        blockedActionDiagnostics,
      },
    ],
  };
}

export async function getPluginLifecycleOperatorDetailDTO(input: {
  pluginId: string;
}): Promise<PluginGovernanceOperatorDetailDTO> {
  const scope = await resolveOperatorScope();

  for (const schoolId of scope.schoolIds) {
    const dashboard = await readGovernanceDashboardBundle({
      actorId: scope.actorId,
      schoolId,
    });
    const plugin = dashboard.pluginLifecycleRows.find((row) => row.pluginId === input.pluginId);

    if (!plugin) {
      continue;
    }

    return {
      schoolId,
      dashboard: filterDashboardByPlugin(dashboard, input.pluginId),
      focusedPluginId: input.pluginId,
      backHref: "/settings/labs",
    };
  }

  throw new Error("PLUGIN_GOVERNANCE_OPERATOR_NOT_FOUND");
}

export async function getPluginActionLifecycleOperatorDetailDTO(input: {
  pluginId: string;
  actionKey: string;
}): Promise<PluginGovernanceOperatorDetailDTO> {
  const scope = await resolveOperatorScope();

  for (const schoolId of scope.schoolIds) {
    const dashboard = await readGovernanceDashboardBundle({
      actorId: scope.actorId,
      schoolId,
    });
    const plugin = dashboard.pluginLifecycleRows.find((row) => row.pluginId === input.pluginId);

    if (!plugin) {
      continue;
    }

    return {
      schoolId,
      dashboard: filterDashboardByPlugin(dashboard, input.pluginId, input.actionKey),
      focusedPluginId: input.pluginId,
      focusedActionKey: input.actionKey,
      backHref: `/settings/labs/plugins/${input.pluginId}`,
    };
  }

  throw new Error("PLUGIN_GOVERNANCE_OPERATOR_NOT_FOUND");
}
