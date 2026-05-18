import { describe, expect, it, vi } from "vitest";

const broadcast = vi.fn();

vi.mock("./ws-connection-registry", () => ({
  classroomWebSocketConnectionRegistry: {
    broadcast,
  },
}));

describe("ws adapter", () => {
  it("preserves canonical runtime kind, truthRef and correlation metadata in outbound envelope", async () => {
    const { wsRuntimeTransportAdapter } = await import("./ws-adapter");

    await wsRuntimeTransportAdapter.deliver({
      sessionId: "session-1",
      channel: "classroom-runtime",
      kind: "runtime.ready",
      correlationId: "corr-1",
      truthRef: {
        type: "runtime-session",
        id: "runtime-session-1",
        runtimeSessionId: "runtime-session-1",
        classroomSessionId: "session-1",
        schoolId: "school-1",
      },
      payload: {
        actorId: "teacher-1",
        requestKind: "runtime-ready",
      },
    });

    expect(broadcast).toHaveBeenCalledWith(
      "session-1",
      expect.objectContaining({
        kind: "runtime.event",
        correlation: expect.objectContaining({
          correlationId: "corr-1",
        }),
        payload: expect.objectContaining({
          kind: "runtime.ready",
          truthRef: expect.objectContaining({
            id: "runtime-session-1",
          }),
        }),
      }),
    );
  });
});
