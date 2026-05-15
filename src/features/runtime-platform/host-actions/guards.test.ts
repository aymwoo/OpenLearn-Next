import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createGuardedHostAction } from "./guards";

const inputSchema = z.object({
  sessionId: z.string().min(1),
  payload: z.object({
    result: z.string().min(1),
  }),
});

const guardedAction = createGuardedHostAction({
  inputSchema,
  actorScopes: ["teacher"],
  requiredPermission: "host:classroom:control",
  execute: async ({ actor, input }) => ({
    ok: true,
    actorId: actor.actorId,
    schoolId: actor.schoolId,
    result: input.payload.result,
  }),
});

describe("runtime host guards", () => {
  it("rejects unauthorized actor scopes", async () => {
    await expect(
      guardedAction({
        actor: {
          actorId: "student-1",
          schoolId: "school-1",
          actorScope: "student",
          capabilities: [],
          hostPermissions: ["host:classroom:control"],
        },
        input: {
          sessionId: "session-1",
          payload: { result: "ok" },
        },
      }),
    ).rejects.toThrowError("HOST_ACTION_UNAUTHORIZED_ACTOR_SCOPE");
  });

  it("rejects missing school scope", async () => {
    await expect(
      guardedAction({
        actor: {
          actorId: "teacher-1",
          schoolId: "",
          actorScope: "teacher",
          capabilities: [],
          hostPermissions: ["host:classroom:control"],
        },
        input: {
          sessionId: "session-1",
          payload: { result: "ok" },
        },
      }),
    ).rejects.toThrowError();
  });

  it("rejects dto parse failures before execution", async () => {
    await expect(
      guardedAction({
        actor: {
          actorId: "teacher-1",
          schoolId: "school-1",
          actorScope: "teacher",
          capabilities: [],
          hostPermissions: ["host:classroom:control"],
        },
        input: {
          sessionId: "session-1",
          payload: { result: "" },
        },
      }),
    ).rejects.toThrowError();
  });
});
