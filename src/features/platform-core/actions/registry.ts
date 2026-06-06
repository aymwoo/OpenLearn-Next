import {
  deriveDbNamespace,
  listExternalMarketplaceCatalog,
  listPluginGovernanceSnapshotRecords,
  listPluginsForMarketplace,
  listPluginsForSchool,
  preflightExternalPluginInstall,
  preflightPluginUpgrade,
} from "@/lib/dal/plugins";
import type { PluginRegistrationDTO } from "@/lib/dto/resource-ai";
import { compare, valid } from "semver";

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
  dbNamespace: string;
  sourceType: PluginRegistrationDTO["sourceType"];
  installSource: PluginRegistrationDTO["installSource"];
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
  dbNamespace: string;
  name: string;
  sourceType: PluginRegistrationDTO["sourceType"];
  installSource: PluginRegistrationDTO["installSource"];
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

export type MarketplaceBuiltInRow = Pick<
  PluginRegistrationDTO,
  | "id"
  | "schoolId"
  | "name"
  | "pluginKey"
  | "dbNamespace"
  | "sourceType"
  | "installSource"
  | "enabled"
  | "builtIn"
  | "defaultEnabled"
  | "nonDeletable"
>;

export type MarketplaceExternalCardPosture =
  | "not-installed"
  | "installed-usable"
  | "upgrade-available"
  | "retained-recoverable"
  | "active-blocked";

export type MarketplaceExternalRow = {
  pluginKey: string;
  displayName: string;
  posture: MarketplaceExternalCardPosture;
  installedPluginId: string | null;
  retainedPluginId: string | null;
  currentVersion: string | null;
  availableVersion: string;
  lifecycleState: ExecutableActionCatalogRow["lifecycleState"] | null;
  reasonCode: PluginGovernanceReasonCode | null;
  recommendedRecoveryAction: PluginRecoveryAction | null;
  installSource: PluginRegistrationDTO["installSource"] | null;
  dbNamespace: string;
  sourceType: "external";
  requestedPermissions: readonly string[];
  declaredDataTables: readonly string[];
  installRejectReason: string | null;
  activeSessions: Array<{
    sessionId: string;
    lessonId: string;
    classId: string;
    status: "live";
  }>;
  uninstall: {
    blocked: boolean;
    reasonCode: string | null;
    cleanupConfirmationToken: string | null;
    preflightSummary: {
      lessonExtCount: number;
      stepExtCount: number;
      resourceExtCount: number;
      ownedBusinessCount: number;
      ownedQuestionCount: number;
      ownedResponseCount: number;
      affectedEndedSessionCount: number;
      totalCount: number;
    };
  };
  upgrade: {
    available: boolean;
    targetVersion: string | null;
    preflight: Awaited<ReturnType<typeof preflightPluginUpgrade>> | null;
  };
};

export type MarketplaceSurfaceBundle = {
  builtInRows: MarketplaceBuiltInRow[];
  externalRows: MarketplaceExternalRow[];
  metrics: {
    builtInCount: number;
    externalInstallableCount: number;
    externalInstalledCount: number;
    pendingUpgradeCount: number;
  };
};

type RegistryProjectionBundle = {
  pluginsById: Map<string, PluginRegistrationDTO>;
  governanceById: ReturnType<typeof projectPluginGovernance>["plugins"] extends Array<infer T> ? Map<string, T> : never;
  snapshotsById: Map<string, Awaited<ReturnType<typeof listPluginGovernanceSnapshotRecords>>[number]>;
  executableActionCatalog: ExecutableActionCatalogRow[];
  blockedActionDiagnostics: BlockedActionDiagnosticRow[];
};

function compareMarketplaceVersions(left: string, right: string) {
  const leftValid = valid(left);
  const rightValid = valid(right);

  if (leftValid && rightValid) {
    return compare(leftValid, rightValid);
  }

  if (leftValid) {
    return 1;
  }

  if (rightValid) {
    return -1;
  }

  return left.localeCompare(right);
}

function selectLatestCatalogEntries() {
  const latestByPluginKey = new Map<string, ReturnType<typeof listExternalMarketplaceCatalog>[number]>();

  for (const entry of listExternalMarketplaceCatalog()) {
    const current = latestByPluginKey.get(entry.pluginKey);

    if (!current || compareMarketplaceVersions(entry.manifest.version, current.manifest.version) > 0) {
      latestByPluginKey.set(entry.pluginKey, entry);
    }
  }

  return Array.from(latestByPluginKey.values()).sort((left, right) =>
    left.displayName.localeCompare(right.displayName, "zh-CN"),
  );
}

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

async function readRegistryProjectionBundle(
  input: RegistryReadInput,
  options?: { actorScope?: "operator" },
): Promise<RegistryProjectionBundle> {
  const [plugins, governanceSnapshots] = await Promise.all([
    options?.actorScope === "operator"
      ? listPluginsForMarketplace({ ...input, actorScope: "operator" })
      : listPluginsForSchool(input),
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
        dbNamespace: plugin.dbNamespace,
        name: plugin.name,
        sourceType: plugin.sourceType,
        installSource: plugin.installSource,
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

export async function readMarketplaceSurfaceBundle(
  input: RegistryReadInput,
): Promise<MarketplaceSurfaceBundle> {
  const [plugins, snapshots, dashboard] = await Promise.all([
    listPluginsForMarketplace({ ...input, actorScope: "operator" }),
    listPluginGovernanceSnapshotRecords(input),
    (async () => {
      const bundle = await readRegistryProjectionBundle(input, { actorScope: "operator" });
      return projectGovernanceDashboardBundle(bundle);
    })(),
  ]);
  const latestCatalogEntries = selectLatestCatalogEntries();
  const pluginById = new Map(plugins.map((plugin) => [plugin.id, plugin]));
  const dashboardByPluginId = new Map(
    dashboard.pluginLifecycleRows.map((row) => [row.pluginId, row]),
  );
  const snapshotByPluginKey = new Map(
    snapshots
      .filter((snapshot) => snapshot.sourceType === "external")
      .map((snapshot) => [snapshot.pluginKey, snapshot]),
  );

  const externalRows = await Promise.all(
    latestCatalogEntries.map(async (entry) => {
      const snapshot = snapshotByPluginKey.get(entry.pluginKey) ?? null;
      const installedPlugin = snapshot ? pluginById.get(snapshot.pluginId) ?? null : null;
      const lifecycle = snapshot ? dashboardByPluginId.get(snapshot.pluginId) ?? null : null;
      const currentVersion = installedPlugin?.manifestJson.version ?? null;
      const hasRetainedInstall = Boolean(
        snapshot && snapshot.uninstallRetentionMode === "retain" && snapshot.uninstalledAt !== null,
      );
      const upgradeAvailable = Boolean(
        currentVersion
          && compareMarketplaceVersions(entry.manifest.version, currentVersion) > 0
          && !hasRetainedInstall,
      );
      const [installPreflight, upgradePreflight] = await Promise.all([
        preflightExternalPluginInstall({
          actorId: input.actorId,
          schoolId: input.schoolId,
          pluginKey: entry.pluginKey,
          version: entry.manifest.version,
          actorScope: "operator",
        }),
        upgradeAvailable && snapshot
          ? preflightPluginUpgrade({
              actorId: input.actorId,
              schoolId: input.schoolId,
              pluginId: snapshot.pluginId,
              targetVersion: entry.manifest.version,
              actorScope: "operator",
            })
          : Promise.resolve(null),
      ]);
      const activeSessions = upgradePreflight?.activeSessions ?? snapshot?.uninstall.activeSessions ?? [];
      const posture: MarketplaceExternalCardPosture = hasRetainedInstall
        ? "retained-recoverable"
        : activeSessions.length > 0
          ? "active-blocked"
          : upgradeAvailable
            ? "upgrade-available"
            : installedPlugin
              ? "installed-usable"
              : "not-installed";

      return {
        pluginKey: entry.pluginKey,
        displayName: entry.displayName,
        posture,
        installedPluginId: hasRetainedInstall ? null : installedPlugin?.id ?? null,
        retainedPluginId: hasRetainedInstall ? snapshot?.pluginId ?? null : null,
        currentVersion,
        availableVersion: entry.manifest.version,
        lifecycleState: lifecycle?.lifecycleState ?? null,
        reasonCode: lifecycle?.reasonCode ?? null,
        recommendedRecoveryAction: lifecycle?.recommendedRecoveryAction ?? null,
        installSource: installedPlugin?.installSource ?? null,
        dbNamespace: installedPlugin?.dbNamespace ?? installPreflight.dbNamespace ?? deriveDbNamespace(entry.pluginKey),
        sourceType: "external",
        requestedPermissions: entry.manifest.permissions,
        declaredDataTables: entry.dataModel.tables.map((table) => table.name),
        installRejectReason:
          !installedPlugin && !hasRetainedInstall && !installPreflight.ok && !installPreflight.canRecover
            ? installPreflight.rejectReason
            : null,
        activeSessions,
        uninstall: {
          blocked: snapshot?.uninstall.blocked ?? false,
          reasonCode: snapshot?.uninstall.reason ?? null,
          cleanupConfirmationToken: snapshot?.uninstall.cleanupConfirmationToken ?? null,
          preflightSummary: {
            lessonExtCount: snapshot?.uninstall.lessonExtCount ?? 0,
            stepExtCount: snapshot?.uninstall.stepExtCount ?? 0,
            resourceExtCount: snapshot?.uninstall.resourceExtCount ?? 0,
            ownedBusinessCount: snapshot?.uninstall.ownedBusinessCount ?? 0,
            ownedQuestionCount: snapshot?.uninstall.ownedQuestionCount ?? 0,
            ownedResponseCount: snapshot?.uninstall.ownedResponseCount ?? 0,
            affectedEndedSessionCount: snapshot?.uninstall.affectedEndedSessionCount ?? 0,
            totalCount: snapshot?.uninstall.totalCount ?? 0,
          },
        },
        upgrade: {
          available: upgradeAvailable,
          targetVersion: upgradeAvailable ? entry.manifest.version : null,
          preflight: upgradePreflight,
        },
      } satisfies MarketplaceExternalRow;
    }),
  );

  const builtInRows = plugins
    .filter((plugin) => plugin.builtIn)
    .map((plugin) => ({
      id: plugin.id,
      schoolId: plugin.schoolId,
      name: plugin.name,
      pluginKey: plugin.pluginKey,
      dbNamespace: plugin.dbNamespace,
      sourceType: plugin.sourceType,
      installSource: plugin.installSource,
      enabled: plugin.enabled,
      builtIn: plugin.builtIn,
      defaultEnabled: plugin.defaultEnabled,
      nonDeletable: plugin.nonDeletable,
    }));

  return {
    builtInRows,
    externalRows,
    metrics: {
      builtInCount: builtInRows.length,
      externalInstallableCount: externalRows.filter((row) => row.posture === "not-installed").length,
      externalInstalledCount: externalRows.filter((row) => row.posture !== "not-installed" && row.posture !== "retained-recoverable").length,
      pendingUpgradeCount: externalRows.filter((row) => row.upgrade.available).length,
    },
  };
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
    dbNamespace: plugin.dbNamespace,
    sourceType: plugin.sourceType,
    installSource: plugin.installSource,
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
