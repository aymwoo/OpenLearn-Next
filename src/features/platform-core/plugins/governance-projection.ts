import type { PreflightUninstallPluginResult } from "@/lib/dal/plugins";
import type { PluginLifecycleState } from "@/features/runtime-platform/contracts/permissions";

import {
  type GovernanceLifecycleState,
  type PluginGovernanceReasonCode,
  type PluginRecoveryAction,
} from "./lifecycle-contracts";
import { detectPluginDependencyCycles, orderPluginDependencies } from "./dependency-graph";

export type PluginGovernanceProjectionInput = {
  pluginId: string;
  pluginKey: string;
  name: string;
  enabled: boolean;
  killSwitchEnabled: boolean;
  lifecycleState: PluginLifecycleState;
  sourceType: "default" | "external";
  dependencies: readonly string[];
  activationStatus: "idle" | "active" | "failed";
  failureDetail: string | null;
  uninstall: PreflightUninstallPluginResult;
  uninstallRequest?: {
    mode: "retain" | "cleanup";
    confirmationToken: string | null;
  };
};

export type PluginGovernanceProjectionRow = {
  pluginId: string;
  pluginKey: string;
  name: string;
  executable: boolean;
  lifecycle: {
    state: GovernanceLifecycleState;
    blocked: boolean;
    internalSubstate: PluginLifecycleState | null;
    reasonCode: PluginGovernanceReasonCode | null;
    recommendedRecoveryAction: PluginRecoveryAction | null;
    killSwitchEnabled: boolean;
  };
  failureAttribution: {
    scope: "plugin" | "dependency" | "operator";
    pluginId: string;
    reasonCode: PluginGovernanceReasonCode;
    recommendedRecoveryAction: PluginRecoveryAction;
  } | null;
  uninstall: {
    posture: "retain" | "cleanup";
    cleanupRequested: boolean;
    blocked: boolean;
    reasonCode: PluginGovernanceReasonCode | null;
    recommendedRecoveryAction: PluginRecoveryAction | null;
    preflightSummary: Pick<
      PreflightUninstallPluginResult,
      "lessonExtCount" | "stepExtCount" | "resourceExtCount" | "ownedBusinessCount" | "totalCount"
    >;
  };
};

export type PluginGovernanceProjection = {
  orderedPluginIds: string[];
  executablePluginIds: string[];
  cycles: string[][];
  plugins: PluginGovernanceProjectionRow[];
};

function mapLifecycleState(input: PluginGovernanceProjectionInput): GovernanceLifecycleState {
  if (!input.enabled && input.lifecycleState === "disabled") {
    return "installed";
  }

  if (input.killSwitchEnabled || input.lifecycleState === "suspended") {
    return "suspended";
  }

  if (input.lifecycleState === "mounted" || input.lifecycleState === "ready") {
    return "active";
  }

  if (input.lifecycleState === "installed") {
    return "installed";
  }

  return "enabled";
}

function collectBlockedDownstream(
  startPluginKey: string,
  reverseDeps: Map<string, string[]>,
  visited = new Set<string>(),
) {
  for (const dependent of reverseDeps.get(startPluginKey) ?? []) {
    if (visited.has(dependent)) {
      continue;
    }
    visited.add(dependent);
    collectBlockedDownstream(dependent, reverseDeps, visited);
  }

  return visited;
}

export function projectPluginGovernance(
  plugins: readonly PluginGovernanceProjectionInput[],
): PluginGovernanceProjection {
  const byKey = new Map(plugins.map((plugin) => [plugin.pluginKey, plugin]));
  const nodes = plugins.map((plugin) => ({
    pluginId: plugin.pluginKey,
    dependencies: plugin.dependencies,
  }));
  const cycles = detectPluginDependencyCycles(nodes);
  const orderedPluginIds = (() => {
    try {
      return orderPluginDependencies(nodes)
        .map((pluginKey) => byKey.get(pluginKey)?.pluginId)
        .filter((pluginId): pluginId is string => Boolean(pluginId));
    } catch {
      return plugins.map((plugin) => plugin.pluginId);
    }
  })();

  const reverseDeps = new Map<string, string[]>();
  for (const plugin of plugins) {
    for (const dependency of plugin.dependencies) {
      reverseDeps.set(dependency, [...(reverseDeps.get(dependency) ?? []), plugin.pluginKey]);
    }
  }

  const cycleMembers = new Set(cycles.flat());
  const activationFailedKeys = new Set(
    plugins
      .filter((plugin) => plugin.activationStatus === "failed")
      .map((plugin) => plugin.pluginKey),
  );
  const downstreamBlockedByFailure = new Set<string>();
  for (const failedKey of activationFailedKeys) {
    collectBlockedDownstream(failedKey, reverseDeps, downstreamBlockedByFailure);
  }

  const rows = plugins.map<PluginGovernanceProjectionRow>((plugin) => {
    const externalState = mapLifecycleState(plugin);
    let blocked = false;
    let reasonCode: PluginGovernanceReasonCode | null = null;
    let recoveryAction: PluginRecoveryAction | null = null;
    let internalSubstate: PluginLifecycleState | null = null;
    let failureAttribution: PluginGovernanceProjectionRow["failureAttribution"] = null;

    const missingDependency = plugin.dependencies.find((dependency) => !byKey.has(dependency));

    if (plugin.killSwitchEnabled || plugin.lifecycleState === "suspended") {
      blocked = true;
      reasonCode = "kill_switch";
      recoveryAction = "resume";
      internalSubstate = plugin.lifecycleState;
      failureAttribution = {
        scope: "operator",
        pluginId: plugin.pluginId,
        reasonCode,
        recommendedRecoveryAction: recoveryAction,
      };
    } else if (!plugin.enabled) {
      blocked = true;
      reasonCode = plugin.lifecycleState === "installed" ? "not_installed" : "not_enabled";
      recoveryAction = "enable";
      internalSubstate = plugin.lifecycleState;
      failureAttribution = {
        scope: "plugin",
        pluginId: plugin.pluginId,
        reasonCode,
        recommendedRecoveryAction: recoveryAction,
      };
    } else if (missingDependency || cycleMembers.has(plugin.pluginKey) || downstreamBlockedByFailure.has(plugin.pluginKey)) {
      blocked = true;
      reasonCode = cycleMembers.has(plugin.pluginKey) ? "dependency_cycle" : "dependency_missing";
      recoveryAction = "reconcile";
      internalSubstate = plugin.lifecycleState;
      failureAttribution = {
        scope: "dependency",
        pluginId: plugin.pluginId,
        reasonCode,
        recommendedRecoveryAction: recoveryAction,
      };
    } else if (plugin.activationStatus === "failed" || plugin.lifecycleState === "failed") {
      blocked = true;
      reasonCode = "activation_failed";
      recoveryAction = "retry";
      internalSubstate = "failed";
      failureAttribution = {
        scope: "plugin",
        pluginId: plugin.pluginId,
        reasonCode,
        recommendedRecoveryAction: recoveryAction,
      };
    }

    const cleanupRequested = plugin.uninstallRequest?.mode === "cleanup";
    const cleanupConfirmed = Boolean(plugin.uninstallRequest?.confirmationToken);
    const uninstallReasonCode = plugin.uninstall.blocked
      ? null
      : cleanupRequested && !cleanupConfirmed
        ? "cleanup_confirmation_required"
        : null;
    const uninstallRecoveryAction = cleanupRequested && !cleanupConfirmed ? "confirm_cleanup" : null;

    return {
      pluginId: plugin.pluginId,
      pluginKey: plugin.pluginKey,
      name: plugin.name,
      executable: !blocked && externalState === "active",
      lifecycle: {
        state: externalState,
        blocked,
        internalSubstate,
        reasonCode,
        recommendedRecoveryAction: recoveryAction,
        killSwitchEnabled: plugin.killSwitchEnabled,
      },
      failureAttribution,
      uninstall: {
        posture: cleanupRequested ? "cleanup" : "retain",
        cleanupRequested,
        blocked: plugin.uninstall.blocked || Boolean(uninstallReasonCode),
        reasonCode: uninstallReasonCode,
        recommendedRecoveryAction: uninstallRecoveryAction,
        preflightSummary: {
          lessonExtCount: plugin.uninstall.lessonExtCount,
          stepExtCount: plugin.uninstall.stepExtCount,
          resourceExtCount: plugin.uninstall.resourceExtCount,
          ownedBusinessCount: plugin.uninstall.ownedBusinessCount,
          totalCount: plugin.uninstall.totalCount,
        },
      },
    };
  });

  return {
    orderedPluginIds,
    executablePluginIds: rows.filter((plugin) => plugin.executable).map((plugin) => plugin.pluginId),
    cycles,
    plugins: rows,
  };
}
