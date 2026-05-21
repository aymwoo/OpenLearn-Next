import { z } from "zod";

import { dispatchPluginGovernanceCommand } from "@/features/platform-core/commands/producers/plugin-governance";
import { getPluginForSchool } from "@/lib/dal/plugins";

import { defaultRuntimeEventBusAdapter } from "../seams";
import {
  createAllowedGovernanceDecision,
  createDeniedGovernanceDecision,
  createGuardedHostAction,
  isLifecycleBlocked,
  resolveTeacherHostActor,
} from "./guards";

const PluginHostRequestSchema = z.object({
  sessionId: z.string().min(1),
  pluginId: z.string().min(1),
  action: z.enum([
    "publish-event",
    "read-lifecycle",
    "plugin.enable",
    "plugin.disable",
    "plugin.suspend",
    "plugin.resume",
    "plugin.retry",
    "plugin.uninstall.preflight",
    "plugin.uninstall",
    "plugin.kill_switch.set",
  ]),
  payload: z.record(z.string(), z.unknown()).default({}),
});

function isGovernanceAction(action: PluginHostRequest["action"]) {
  return action !== "publish-event" && action !== "read-lifecycle";
}

function getRequiredHostPermission(action: PluginHostRequest["action"]) {
  return isGovernanceAction(action)
    ? "host:plugin:lifecycle:write"
    : "host:plugin:lifecycle:read";
}

async function dispatchGovernanceFromHost(input: {
  action: Exclude<PluginHostRequest["action"], "publish-event" | "read-lifecycle">;
  actorId: string;
  schoolId: string;
  pluginId: string;
  payload: Record<string, unknown>;
}) {
  const base = {
    actor: { actorId: input.actorId, actorScope: "teacher" as const },
    scope: { schoolId: input.schoolId, pluginId: input.pluginId },
    source: "host-action" as const,
    correlation: { producer: "plugin-host" },
  };

  switch (input.action) {
    case "plugin.enable":
      return dispatchPluginGovernanceCommand({
        ...base,
        type: "plugin.enable",
        payload: { schoolId: input.schoolId, pluginId: input.pluginId, enabledBy: input.actorId },
      });
    case "plugin.disable":
      return dispatchPluginGovernanceCommand({
        ...base,
        type: "plugin.disable",
        payload: { schoolId: input.schoolId, pluginId: input.pluginId, disabledBy: input.actorId },
      });
    case "plugin.suspend":
      return dispatchPluginGovernanceCommand({
        ...base,
        type: "plugin.suspend",
        payload: {
          schoolId: input.schoolId,
          pluginId: input.pluginId,
          reason: typeof input.payload.reason === "string" ? input.payload.reason : "host governance request",
        },
      });
    case "plugin.resume":
      return dispatchPluginGovernanceCommand({
        ...base,
        type: "plugin.resume",
        payload: {
          schoolId: input.schoolId,
          pluginId: input.pluginId,
          reason: typeof input.payload.reason === "string" ? input.payload.reason : "host governance request",
          targetState:
            input.payload.targetState === "mounted" || input.payload.targetState === "ready"
              ? input.payload.targetState
              : "enabled",
        },
      });
    case "plugin.retry":
      return dispatchPluginGovernanceCommand({
        ...base,
        type: "plugin.retry",
        payload: {
          schoolId: input.schoolId,
          pluginId: input.pluginId,
          commandId: typeof input.payload.commandId === "string" ? input.payload.commandId : `${input.action}:${input.pluginId}`,
          reason: typeof input.payload.reason === "string" ? input.payload.reason : "host governance retry",
        },
      });
    case "plugin.uninstall.preflight":
      return dispatchPluginGovernanceCommand({
        ...base,
        type: "plugin.uninstall.preflight",
        payload: { schoolId: input.schoolId, pluginId: input.pluginId },
      });
    case "plugin.uninstall":
      return dispatchPluginGovernanceCommand({
        ...base,
        type: "plugin.uninstall",
        payload: {
          schoolId: input.schoolId,
          pluginId: input.pluginId,
          retentionMode: input.payload.retentionMode === "cleanup" ? "cleanup" : "retain",
        },
      });
    case "plugin.kill_switch.set":
      return dispatchPluginGovernanceCommand({
        ...base,
        type: "plugin.kill_switch.set",
        payload: {
          schoolId: input.schoolId,
          pluginId: input.pluginId,
          enabled: input.payload.enabled === true,
          reason: typeof input.payload.reason === "string" ? input.payload.reason : "host governance kill switch",
        },
      });
    default:
      input.action satisfies never;
      throw new Error("HOST_ACTION_UNSUPPORTED");
  }
}

export const invokePluginHostAction = createGuardedHostAction({
  inputSchema: PluginHostRequestSchema,
  actorScopes: ["plugin", "host", "system", "teacher"],
  resolveActor: () => resolveTeacherHostActor([
    "host:plugin:lifecycle:read",
    "host:plugin:lifecycle:write",
  ]),
  resolveGovernance: async ({ actor, input }) => {
    const resolvedPermission = getRequiredHostPermission(input.action);

    if (!actor.hostPermissions.includes(resolvedPermission)) {
      return createDeniedGovernanceDecision({
        action: input.action,
        actor,
        targetSchoolId: actor.schoolId,
        reason: "permission_denied",
        requiredPermission: resolvedPermission,
      });
    }

    if (isGovernanceAction(input.action)) {
      const plugin = await getPluginForSchool({
        actorId: actor.actorId,
        schoolId: actor.schoolId,
        pluginId: input.pluginId,
      });

      if (!plugin) {
        return createDeniedGovernanceDecision({
          action: input.action,
          actor,
          targetSchoolId: actor.schoolId,
          reason: "school_mismatch",
          requiredPermission: resolvedPermission,
        });
      }

      if (input.action === "plugin.kill_switch.set") {
        return createAllowedGovernanceDecision({
          action: input.action,
          actor,
          targetSchoolId: plugin.schoolId,
          requiredPermission: resolvedPermission,
          lifecycle: { state: plugin.lifecycleState, blocked: false, killSwitchEnabled: plugin.killSwitchEnabled },
        });
      }

      if (plugin.killSwitchEnabled) {
        return createDeniedGovernanceDecision({
          action: input.action,
          actor,
          targetSchoolId: plugin.schoolId,
          reason: "kill_switch",
          requiredPermission: resolvedPermission,
          lifecycle: { state: plugin.lifecycleState, blocked: true, killSwitchEnabled: true },
        });
      }

      if (isLifecycleBlocked(plugin.lifecycleState)) {
        return createDeniedGovernanceDecision({
          action: input.action,
          actor,
          targetSchoolId: plugin.schoolId,
          reason: "lifecycle_blocked",
          requiredPermission: resolvedPermission,
          lifecycle: { state: plugin.lifecycleState, blocked: true, killSwitchEnabled: plugin.killSwitchEnabled },
        });
      }

      return createAllowedGovernanceDecision({
        action: input.action,
        actor,
        targetSchoolId: plugin.schoolId,
        requiredPermission: resolvedPermission,
        lifecycle: { state: plugin.lifecycleState, blocked: false, killSwitchEnabled: plugin.killSwitchEnabled },
      });
    }

    const plugin = await getPluginForSchool({
      actorId: actor.actorId,
      schoolId: actor.schoolId,
      pluginId: input.pluginId,
    });

    if (!plugin) {
      return createDeniedGovernanceDecision({
        action: input.action,
        actor,
        targetSchoolId: actor.schoolId,
        reason: "school_mismatch",
        requiredPermission: resolvedPermission,
      });
    }

    if (plugin.killSwitchEnabled) {
      return createDeniedGovernanceDecision({
        action: input.action,
        actor,
        targetSchoolId: plugin.schoolId,
        reason: "kill_switch",
        requiredPermission: resolvedPermission,
        lifecycle: { state: plugin.lifecycleState, blocked: true, killSwitchEnabled: true },
      });
    }

    if (isLifecycleBlocked(plugin.lifecycleState)) {
      return createDeniedGovernanceDecision({
        action: input.action,
        actor,
        targetSchoolId: plugin.schoolId,
        reason: "lifecycle_blocked",
        requiredPermission: resolvedPermission,
        lifecycle: { state: plugin.lifecycleState, blocked: true, killSwitchEnabled: plugin.killSwitchEnabled },
      });
    }
    return createAllowedGovernanceDecision({
      action: input.action,
      actor,
      targetSchoolId: plugin.schoolId,
      requiredPermission: resolvedPermission,
      lifecycle: { state: plugin.lifecycleState, blocked: false, killSwitchEnabled: plugin.killSwitchEnabled },
    });
  },
  execute: async ({ actor, input }) => {
    switch (input.action) {
      case "plugin.enable":
      case "plugin.disable":
      case "plugin.suspend":
      case "plugin.resume":
      case "plugin.retry":
      case "plugin.uninstall.preflight":
      case "plugin.uninstall":
      case "plugin.kill_switch.set": {
        const result = await dispatchGovernanceFromHost({
          action: input.action,
          actorId: actor.actorId,
          schoolId: actor.schoolId,
          pluginId: input.pluginId,
          payload: input.payload,
        });

        return {
          ok: result.success,
          actorId: actor.actorId,
          schoolId: actor.schoolId,
          commandId: result.commandId,
          invalidationTags: result.invalidationTags,
          hostInvalidation: "host invalidation: no-op because plugin host writes do not own cacheable read surfaces",
          eventBusOwnership: defaultRuntimeEventBusAdapter.describeOwnership(),
        } as const;
      }
      case "publish-event": {
        await defaultRuntimeEventBusAdapter.publish({
          topic: `plugin:${input.pluginId}`,
          sessionId: input.sessionId,
          eventType: "plugin-host-action",
          payload: {
            actorId: actor.actorId,
            ...input.payload,
          },
        });
        break;
      }
      case "read-lifecycle": {
        const plugin = await getPluginForSchool({
          actorId: actor.actorId,
          schoolId: actor.schoolId,
          pluginId: input.pluginId,
        });

        if (!plugin) {
          throw new Error("PLUGIN_NOT_FOUND");
        }

        return {
          ok: true,
          actorId: actor.actorId,
          schoolId: actor.schoolId,
          plugin: {
            id: plugin.id,
            schoolId: plugin.schoolId,
            lifecycleState: plugin.lifecycleState,
            killSwitchEnabled: plugin.killSwitchEnabled,
          },
          eventBusOwnership: defaultRuntimeEventBusAdapter.describeOwnership(),
        } as const;
      }
      default: {
        input.action satisfies never;
        throw new Error("HOST_ACTION_UNSUPPORTED");
      }
    }

    return {
      ok: true,
      actorId: actor.actorId,
      schoolId: actor.schoolId,
      eventBusOwnership: defaultRuntimeEventBusAdapter.describeOwnership(),
    } as const;
  },
});

export type PluginHostRequest = z.infer<typeof PluginHostRequestSchema>;
