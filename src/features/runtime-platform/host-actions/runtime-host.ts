import { z } from "zod";

import {
  sqliteRuntimeDatabaseAdapter,
  sseRuntimeTransportAdapter,
} from "../seams";
import { createGuardedHostAction } from "./guards";

const RuntimeHostRequestSchema = z.object({
  sessionId: z.string().min(1),
  stepId: z.string().min(1),
  action: z.enum(["snapshot", "deliver-transport"]),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const invokeRuntimeHostAction = createGuardedHostAction({
  inputSchema: RuntimeHostRequestSchema,
  actorScopes: ["host", "teacher", "system"],
  requiredPermission: "host:classroom:control",
  execute: async ({ actor, input }) => {
    const ownership = sqliteRuntimeDatabaseAdapter.describeOwnership();

    if (input.action === "deliver-transport") {
      await sseRuntimeTransportAdapter.deliver({
        sessionId: input.sessionId,
        channel: "classroom-runtime",
        payload: {
          stepId: input.stepId,
          actorId: actor.actorId,
          ...input.payload,
        },
      });
    }

    return {
      ok: true,
      actorId: actor.actorId,
      schoolId: actor.schoolId,
      ownership,
    } as const;
  },
});

export type RuntimeHostRequest = z.infer<typeof RuntimeHostRequestSchema>;
