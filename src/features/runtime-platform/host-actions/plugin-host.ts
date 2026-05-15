import { z } from "zod";

import { defaultRuntimeEventBusAdapter } from "../seams";
import { createGuardedHostAction } from "./guards";

const PluginHostRequestSchema = z.object({
  sessionId: z.string().min(1),
  pluginId: z.string().min(1),
  action: z.enum(["publish-event", "read-lifecycle"]),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const invokePluginHostAction = createGuardedHostAction({
  inputSchema: PluginHostRequestSchema,
  actorScopes: ["plugin", "host", "system"],
  requiredPermission: "host:plugin:lifecycle:read",
  execute: async ({ actor, input }) => {
    if (input.action === "publish-event") {
      await defaultRuntimeEventBusAdapter.publish({
        topic: `plugin:${input.pluginId}`,
        sessionId: input.sessionId,
        eventType: "plugin-host-action",
        payload: {
          actorId: actor.actorId,
          ...input.payload,
        },
      });
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
