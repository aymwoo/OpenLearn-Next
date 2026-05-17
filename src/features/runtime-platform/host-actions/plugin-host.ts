import { z } from "zod";

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
  action: z.enum(["publish-event", "read-lifecycle"]),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const invokePluginHostAction = createGuardedHostAction({
  inputSchema: PluginHostRequestSchema,
  actorScopes: ["plugin", "host", "system", "teacher"],
  requiredPermission: "host:plugin:lifecycle:read",
  resolveActor: () => resolveTeacherHostActor(["host:plugin:lifecycle:read"]),
  resolveGovernance: async ({ actor, input, requiredPermission }) => {
    if (input.action === "read-lifecycle") {
      return createDeniedGovernanceDecision({
        action: input.action,
        actor,
        targetSchoolId: actor.schoolId,
        reason: "unsupported_action",
        requiredPermission: requiredPermission ?? null,
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
        requiredPermission: requiredPermission ?? null,
      });
    }

    if (plugin.killSwitchEnabled) {
      return createDeniedGovernanceDecision({
        action: input.action,
        actor,
        targetSchoolId: plugin.schoolId,
        reason: "kill_switch",
        requiredPermission: requiredPermission ?? null,
        lifecycle: { state: plugin.lifecycleState, blocked: true, killSwitchEnabled: true },
      });
    }

    if (isLifecycleBlocked(plugin.lifecycleState)) {
      return createDeniedGovernanceDecision({
        action: input.action,
        actor,
        targetSchoolId: plugin.schoolId,
        reason: "lifecycle_blocked",
        requiredPermission: requiredPermission ?? null,
        lifecycle: { state: plugin.lifecycleState, blocked: true, killSwitchEnabled: plugin.killSwitchEnabled },
      });
    }
    return createAllowedGovernanceDecision({
      action: input.action,
      actor,
      targetSchoolId: plugin.schoolId,
      requiredPermission: requiredPermission ?? null,
      lifecycle: { state: plugin.lifecycleState, blocked: false, killSwitchEnabled: plugin.killSwitchEnabled },
    });
  },
  execute: async ({ actor, input }) => {
    switch (input.action) {
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
        throw new Error("HOST_ACTION_UNSUPPORTED");
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
