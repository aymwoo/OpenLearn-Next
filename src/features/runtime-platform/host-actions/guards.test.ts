import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/auth", () => ({
  getCurrentUserDTO: vi.fn(),
}));
vi.mock("@/lib/dal/membership", () => ({
  getUserMembershipsDTO: vi.fn(),
}));

import { getCurrentUserDTO } from "@/lib/dal/auth";
import { getUserMembershipsDTO } from "@/lib/dal/membership";

import { createDeniedGovernanceDecision, createGuardedHostAction, resolveStudentHostActor, resolveTeacherHostActor } from "./guards";
import { invokePluginHostAction } from "./plugin-host";
import { invokeRuntimeHostAction } from "./runtime-host";

const teacherActor = {
  actorId: "teacher-1",
  schoolId: "school-1",
  actorScope: "teacher" as const,
  capabilities: [],
  hostPermissions: ["host:classroom:control" as const],
};

const trustedMembership = {
  schoolId: "school-1",
  role: "teacher",
  status: "active",
} as unknown as Awaited<ReturnType<typeof getUserMembershipsDTO>>[number];

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
  resolveActor: async () => teacherActor,
  execute: async ({ actor, input }) => ({
    ok: true,
    actorId: actor.actorId,
    schoolId: actor.schoolId,
    result: input.payload.result,
  }),
});

describe("runtime host guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unsupported runtime host actions instead of returning success", async () => {
    vi.mocked(getCurrentUserDTO).mockResolvedValue({
      id: "teacher-1",
    } as unknown as Awaited<ReturnType<typeof getCurrentUserDTO>>);
    vi.mocked(getUserMembershipsDTO).mockResolvedValue(
      [trustedMembership] as unknown as Awaited<ReturnType<typeof getUserMembershipsDTO>>,
    );

    await expect(
      invokeRuntimeHostAction({
        messageId: "message-1",
        runtimeInstanceId: "runtime-instance-1",
        action: "runtime-ready",
        payload: {},
      }),
    ).rejects.toThrowError();
  });

  it("supports typed runtime host action names instead of legacy snapshot placeholder", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./runtime-host.ts", import.meta.url), "utf8"),
    );

    expect(source).toContain("runtime-bootstrap");
    expect(source).toContain("runtime-ready");
    expect(source).toContain("runtime-interaction");
    expect(source).toContain("runtime-save");
    expect(source).toContain("runtime-submit");
    expect(source).toContain("runtime-teacher-control");
    expect(source).not.toContain('action: z.enum(["snapshot", "deliver-transport"])');
  });

  it("publishes bootstrap transport results against the classroom session instead of the runtime session", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./runtime-host.ts", import.meta.url), "utf8"),
    );

    expect(source).toContain("classroomSessionId: bootstrap.classroomSummary.classroomSessionId");
  });

  it("rejects unsupported plugin host actions instead of returning success", async () => {
    vi.mocked(getCurrentUserDTO).mockResolvedValue({
      id: "teacher-1",
    } as unknown as Awaited<ReturnType<typeof getCurrentUserDTO>>);
    vi.mocked(getUserMembershipsDTO).mockResolvedValue(
      [trustedMembership] as unknown as Awaited<ReturnType<typeof getUserMembershipsDTO>>,
    );

    await expect(
      invokePluginHostAction({
        sessionId: "session-1",
        pluginId: "plugin-1",
        action: "read-lifecycle",
        payload: {},
      }),
    ).rejects.toThrowError("HOST_ACTION_DENIED:unsupported_action");
  });

  it("rejects unauthorized actor scopes", async () => {
    const guardedActionWithStudentResolver = createGuardedHostAction({
      inputSchema,
      actorScopes: ["teacher"],
      requiredPermission: "host:classroom:control",
      resolveActor: async () => ({
        actorId: "student-1",
        schoolId: "school-1",
        actorScope: "student",
        capabilities: [],
        hostPermissions: ["host:classroom:control"],
      }),
      execute: async ({ actor, input }) => ({
        ok: true,
        actorId: actor.actorId,
        schoolId: actor.schoolId,
        result: input.payload.result,
      }),
    });

    await expect(
      guardedActionWithStudentResolver({ sessionId: "session-1", payload: { result: "ok" } }),
    ).rejects.toThrowError("HOST_ACTION_UNAUTHORIZED_ACTOR_SCOPE");
  });

  it("rejects missing school scope", async () => {
    const guardedActionWithSchoollessResolver = createGuardedHostAction({
      inputSchema,
      actorScopes: ["teacher"],
      requiredPermission: "host:classroom:control",
      resolveActor: async () => ({
        actorId: "teacher-1",
        schoolId: "",
        actorScope: "teacher",
        capabilities: [],
        hostPermissions: ["host:classroom:control"],
      }),
      execute: async ({ actor, input }) => ({
        ok: true,
        actorId: actor.actorId,
        schoolId: actor.schoolId,
        result: input.payload.result,
      }),
    });

    await expect(
      guardedActionWithSchoollessResolver({ sessionId: "session-1", payload: { result: "ok" } }),
    ).rejects.toThrowError();
  });

  it("rejects dto parse failures before execution", async () => {
    await expect(guardedAction({ sessionId: "session-1", payload: { result: "" } })).rejects.toThrowError();
  });

  it("accepts caller input only after resolving a trusted actor on the server", async () => {
    await expect(guardedAction({ sessionId: "session-1", payload: { result: "ok" } })).resolves.toMatchObject({
      ok: true,
      actorId: "teacher-1",
      schoolId: "school-1",
      result: "ok",
    });
  });

  it("rejects governance-denied actions before execute", async () => {
    const governanceDeniedAction = createGuardedHostAction({
      inputSchema,
      actorScopes: ["teacher"],
      requiredPermission: "host:classroom:control",
      resolveActor: async () => teacherActor,
      resolveGovernance: async ({ actor }) =>
        createDeniedGovernanceDecision({
          action: "runtime-submit",
          actor,
          targetSchoolId: actor.schoolId,
          reason: "capability_missing",
        }),
      execute: async () => ({ ok: true }),
    });

    await expect(
      governanceDeniedAction({ sessionId: "session-1", payload: { result: "ok" } }),
    ).rejects.toThrowError("HOST_ACTION_DENIED:capability_missing");
  });

  it("allows student runtime host actions through a trusted student resolver", async () => {
    vi.mocked(getCurrentUserDTO).mockResolvedValue({
      id: "student-1",
    } as unknown as Awaited<ReturnType<typeof getCurrentUserDTO>>);
    vi.mocked(getUserMembershipsDTO).mockResolvedValue(
      [
        {
          schoolId: "school-1",
          role: "student",
          status: "active",
        },
      ] as unknown as Awaited<ReturnType<typeof getUserMembershipsDTO>>,
    );

    await expect(
      invokeRuntimeHostAction({
        messageId: "message-1",
        runtimeInstanceId: "runtime-instance-1",
        action: "runtime-bootstrap",
        payload: {
          classroomSessionId: "classroom-1",
          stepId: "step-1",
          lessonId: "lesson-1",
          publishedVersionId: "published-1",
        },
      }),
    ).rejects.not.toThrowError("HOST_ACTION_UNAUTHORIZED_ACTOR_SCOPE");
  });

  it("grants students the bootstrap host-action capability used by the browser runtime host", async () => {
    vi.mocked(getCurrentUserDTO).mockResolvedValue({
      id: "student-1",
    } as unknown as Awaited<ReturnType<typeof getCurrentUserDTO>>);
    vi.mocked(getUserMembershipsDTO).mockResolvedValue(
      [
        {
          schoolId: "school-1",
          role: "student",
          status: "active",
        },
      ] as unknown as Awaited<ReturnType<typeof getUserMembershipsDTO>>,
    );

    await expect(resolveStudentHostActor()).resolves.toMatchObject({
      actorId: "student-1",
      actorScope: "student",
      schoolId: "school-1",
      capabilities: expect.arrayContaining(["runtime:host-action:request"]),
    });
  });

  it("grants teachers the runtime-ready capability required by the classroom stage host", async () => {
    vi.mocked(getCurrentUserDTO).mockResolvedValue({
      id: "teacher-1",
    } as unknown as Awaited<ReturnType<typeof getCurrentUserDTO>>);
    vi.mocked(getUserMembershipsDTO).mockResolvedValue(
      [trustedMembership] as unknown as Awaited<ReturnType<typeof getUserMembershipsDTO>>,
    );

    await expect(resolveTeacherHostActor(["host:classroom:control"])).resolves.toMatchObject({
      actorId: "teacher-1",
      actorScope: "teacher",
      schoolId: "school-1",
      capabilities: expect.arrayContaining(["runtime:ready", "runtime:host-action:request"]),
    });
  });

  it("grants students the submit capability required by the browser runtime host", async () => {
    vi.mocked(getCurrentUserDTO).mockResolvedValue({
      id: "student-1",
    } as unknown as Awaited<ReturnType<typeof getCurrentUserDTO>>);
    vi.mocked(getUserMembershipsDTO).mockResolvedValue(
      [
        {
          schoolId: "school-1",
          role: "student",
          status: "active",
        },
      ] as unknown as Awaited<ReturnType<typeof getUserMembershipsDTO>>,
    );

    await expect(resolveStudentHostActor()).resolves.toMatchObject({
      actorId: "student-1",
      actorScope: "student",
      schoolId: "school-1",
      capabilities: expect.arrayContaining(["runtime:submission:create", "runtime:host-action:request"]),
    });
  });

  it("uses governance reason codes in runtime and plugin hosts", async () => {
    const runtimeSource = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./runtime-host.ts", import.meta.url), "utf8"),
    );
    const pluginSource = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./plugin-host.ts", import.meta.url), "utf8"),
    );

    expect(runtimeSource).toContain("capability_missing");
    expect(runtimeSource).toContain("lifecycle_blocked");
    expect(pluginSource).toContain("unsupported_action");
    expect(pluginSource).toContain("kill_switch");
  });
});
