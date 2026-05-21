import {
  listPluginGovernanceSnapshotRecords,
  listPluginsForSchool,
} from "@/lib/dal/plugins";
import type { PluginRegistrationDTO } from "@/lib/dto/resource-ai";

import type {
  ActionBlockedReasonCode,
  BlockedActionDiagnosticRow,
  ExecutableActionCatalogRow,
} from "./contracts";
import {
  BlockedActionDiagnosticRowSchema,
  ExecutableActionCatalogRowSchema,
} from "./contracts";
import { listStaticActionCatalog } from "./static-catalog";
import { projectPluginGovernance } from "../plugins/governance-projection";
import type {
  GovernanceLifecycleInternalSubstate,
  PluginGovernanceReasonCode,
  PluginRecoveryAction,
} from "../plugins/lifecycle-contracts";

type RegistryReadInput = {
  actorId: string;
  schoolId: string;
};

type RegistryPluginReadInput = RegistryReadInput & {
  pluginId: string;
};

export type PluginGovernanceLifecycleReadModel = {
  id: string;
  schoolId: string;
  name: string;
  pluginKey: string;
  sourceType: PluginRegistrationDTO["sourceType"];
  lifecycleState: ExecutableActionCatalogRow["lifecycleState"];
  blocked: boolean;
  killSwitchEnabled: boolean;
  internalLifecycleSubstate: BlockedActionDiagnosticRow["internalLifecycleSubstate"];
  reasonCode: PluginGovernanceReasonCode | null;
  recommendedRecoveryAction: PluginRecoveryAction | null;
  uninstall: {
    posture: "retain" | "cleanup";
    cleanupRequested: boolean;
    blocked: boolean;
    reasonCode: string | null;
    recommendedRecoveryAction: string | null;
    preflightSummary: {
      lessonExtCount: number;
      stepExtCount: number;
      resourceExtCount: number;
      ownedBusinessCount: number;
      totalCount: number;
    };
  };
  executableActionCatalog: ExecutableActionCatalogRow[];
  blockedActionDiagnostics: BlockedActionDiagnosticRow[];
};

export type GovernanceDashboardPluginLifecycleRow = {
  pluginId: string;
  pluginKey: string;
  name: string;
  sourceType: PluginRegistrationDTO["sourceType"];
  builtIn: boolean;
  defaultEnabled: boolean;
  nonDeletable: boolean;
  lifecycleState: ExecutableActionCatalogRow["lifecycleState"];
  internalLifecycleSubstate: GovernanceLifecycleInternalSubstate | null;
  blocked: boolean;
  killSwitchEnabled: boolean;
  reasonCode: PluginGovernanceReasonCode | null;
  recommendedRecoveryAction: PluginRecoveryAction | null;
  executableActionCatalog: ExecutableActionCatalogRow[];
  blockedActionDiagnostics: BlockedActionDiagnosticRow[];
  uninstall: {
    posture: "retain" | "cleanup";
    cleanupRequested: boolean;
    blocked: boolean;
    reasonCode: PluginGovernanceReasonCode | null;
    recommendedRecoveryAction: PluginRecoveryAction | null;
    cleanupConfirmationToken: string;
    preflightSummary: {
      lessonExtCount: number;
      stepExtCount: number;
      resourceExtCount: number;
      ownedBusinessCount: number;
      totalCount: number;
    };
  };
};

export type GovernanceDashboardBundle = {
  executableActionCatalog: ExecutableActionCatalogRow[];
  blockedActionDiagnostics: BlockedActionDiagnosticRow[];
  pluginLifecycleRows: GovernanceDashboardPluginLifecycleRow[];
};

type RegistryProjectionBundle = {
  pluginsById: Map<string, PluginRegistrationDTO>;
  governanceById: ReturnType<typeof projectPluginGovernance>["plugins"] extends Array<infer T> ? Map<string, T> : never;
  snapshotsById: Map<string, Awaited<ReturnType<typeof listPluginGovernanceSnapshotRecords>>[number]>;
  executableActionCatalog: ExecutableActionCatalogRow[];
  blockedActionDiagnostics: BlockedActionDiagnosticRow[];
};

function resolveOwnerType(plugin: PluginRegistrationDTO): ExecutableActionCatalogRow["ownerType"] {
  if (plugin.builtIn) {
    return "built-in";
  }

  return plugin.sourceType === "default" ? "default-plugin" : "external-plugin";
}

function mapReasonCode(reasonCode: string | null, lifecycleState: string): ActionBlockedReasonCode {
  switch (reasonCode) {
    case "not_installed":
      return "plugin_not_installed";
    case "not_enabled":
      return "plugin_not_enabled";
    case "dependency_missing":
    case "dependency_cycle":
      return "dependency_not_satisfied";
    case "activation_failed":
      return "activation_failed";
    case "kill_switch":
      return "plugin_suspended";
    default:
      return lifecycleState === "suspended" ? "plugin_suspended" : "plugin_not_enabled";
  }
}

function buildRegistryProjectionRows(
  plugins: PluginRegistrationDTO[],
  governanceRows: ReturnType<typeof projectPluginGovernance>["plugins"],
) {
  const descriptorByActionKey = new Map(
    listStaticActionCatalog().map((descriptor) => [descriptor.actionKey, descriptor]),
  );

  const executableActionCatalog: ExecutableActionCatalogRow[] = [];
  const blockedActionDiagnostics: BlockedActionDiagnosticRow[] = [];

  for (const plugin of plugins) {
    const governance = governanceRows.find((row) => row.pluginId === plugin.id);
    if (!governance) {
      continue;
    }

    for (const actionKey of plugin.manifestJson.actions) {
      const descriptor = descriptorByActionKey.get(actionKey);
      if (!descriptor) {
        continue;
      }

      const base = {
        ...descriptor,
        ownerType: resolveOwnerType(plugin),
        ownerPluginKey: plugin.pluginKey,
        ownerPluginId: plugin.id,
        ownerDisplayName: plugin.name,
      };

      if (governance.executable) {
        executableActionCatalog.push(
          ExecutableActionCatalogRowSchema.parse({
            ...base,
            catalogView: "executable",
            lifecycleState: governance.lifecycle.state,
          }),
        );
        continue;
      }

      blockedActionDiagnostics.push(
        BlockedActionDiagnosticRowSchema.parse({
          ...base,
          catalogView: "blocked-diagnostic",
          lifecycleState: governance.lifecycle.state,
          internalLifecycleSubstate: governance.lifecycle.internalSubstate,
          reasonCode: mapReasonCode(
            governance.lifecycle.reasonCode,
            governance.lifecycle.state,
          ),
          recommendedRecoveryAction: governance.lifecycle.recommendedRecoveryAction,
        }),
      );
    }
  }

  return {
    executableActionCatalog,
    blockedActionDiagnostics,
  };
}

async function readRegistryProjectionBundle(input: RegistryReadInput): Promise<RegistryProjectionBundle> {
  const [plugins, governanceSnapshots] = await Promise.all([
    listPluginsForSchool(input),
    listPluginGovernanceSnapshotRecords(input),
  ]);
  const governanceProjection = projectPluginGovernance(governanceSnapshots);
  const registryRows = buildRegistryProjectionRows(plugins, governanceProjection.plugins);

  return {
    pluginsById: new Map(plugins.map((plugin) => [plugin.id, plugin])),
    governanceById: new Map(governanceProjection.plugins.map((plugin) => [plugin.pluginId, plugin])),
    snapshotsById: new Map(governanceSnapshots.map((plugin) => [plugin.pluginId, plugin])),
    executableActionCatalog: registryRows.executableActionCatalog,
    blockedActionDiagnostics: registryRows.blockedActionDiagnostics,
  };
}

function projectGovernanceDashboardBundle(bundle: RegistryProjectionBundle): GovernanceDashboardBundle {
  return {
    executableActionCatalog: bundle.executableActionCatalog,
    blockedActionDiagnostics: bundle.blockedActionDiagnostics,
    pluginLifecycleRows: Array.from(bundle.pluginsById.values()).flatMap((plugin) => {
      const governance = bundle.governanceById.get(plugin.id);
      const snapshot = bundle.snapshotsById.get(plugin.id);

      if (!governance || !snapshot) {
        return [];
      }

      return [{
        pluginId: plugin.id,
        pluginKey: plugin.pluginKey,
        name: plugin.name,
        sourceType: plugin.sourceType,
        builtIn: plugin.builtIn,
        defaultEnabled: plugin.defaultEnabled,
        nonDeletable: plugin.nonDeletable,
        lifecycleState: governance.lifecycle.state,
        internalLifecycleSubstate: governance.lifecycle.internalSubstate,
        blocked: governance.lifecycle.blocked,
        killSwitchEnabled: governance.lifecycle.killSwitchEnabled,
        reasonCode: governance.lifecycle.reasonCode,
        recommendedRecoveryAction: governance.lifecycle.recommendedRecoveryAction,
        executableActionCatalog: bundle.executableActionCatalog.filter(
          (row) => row.ownerPluginId === plugin.id,
        ),
        blockedActionDiagnostics: bundle.blockedActionDiagnostics.filter(
          (row) => row.ownerPluginId === plugin.id,
        ),
        uninstall: {
          posture: governance.uninstall.posture,
          cleanupRequested: governance.uninstall.cleanupRequested,
          blocked: governance.uninstall.blocked,
          reasonCode: governance.uninstall.reasonCode,
          recommendedRecoveryAction: governance.uninstall.recommendedRecoveryAction,
          cleanupConfirmationToken: snapshot.uninstall.cleanupConfirmationToken,
          preflightSummary: governance.uninstall.preflightSummary,
        },
      }];
    }),
  };
}

export async function readGovernanceDashboardBundle(
  input: RegistryReadInput,
): Promise<GovernanceDashboardBundle> {
  const bundle = await readRegistryProjectionBundle(input);
  return projectGovernanceDashboardBundle(bundle);
}

export async function readExecutableActionCatalog(input: RegistryReadInput) {
  const bundle = await readRegistryProjectionBundle(input);
  return bundle.executableActionCatalog;
}

export async function readBlockedActionDiagnostics(input: RegistryReadInput) {
  const bundle = await readRegistryProjectionBundle(input);
  return bundle.blockedActionDiagnostics;
}

export async function readPluginGovernanceLifecycle(
  input: RegistryPluginReadInput,
): Promise<PluginGovernanceLifecycleReadModel | null> {
  const dashboard = await readGovernanceDashboardBundle(input);
  const plugin = dashboard.pluginLifecycleRows.find((row) => row.pluginId === input.pluginId);

  if (!plugin) {
    return null;
  }

  return {
    id: plugin.pluginId,
    schoolId: input.schoolId,
    name: plugin.name,
    pluginKey: plugin.pluginKey,
    sourceType: plugin.sourceType,
    lifecycleState: plugin.lifecycleState,
    blocked: plugin.blocked,
    killSwitchEnabled: plugin.killSwitchEnabled,
    internalLifecycleSubstate: plugin.internalLifecycleSubstate,
    reasonCode: plugin.reasonCode,
    recommendedRecoveryAction: plugin.recommendedRecoveryAction,
    uninstall: plugin.uninstall,
    executableActionCatalog: plugin.executableActionCatalog,
    blockedActionDiagnostics: plugin.blockedActionDiagnostics,
  };
}
