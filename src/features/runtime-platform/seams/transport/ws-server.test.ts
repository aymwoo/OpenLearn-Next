import { beforeEach, describe, expect, it, vi } from "vitest";

const getClassroomSnapshotForActor = vi.fn();
const applyWebSocketTeacherControlForActor = vi.fn();
const recordTeacherControlEvent = vi.fn();
const recordTransportConsumerTrace = vi.fn();

vi.mock("@/lib/dal/classroom", () => ({
  getClassroomSnapshotForActor,
  applyWebSocketTeacherControlForActor,
}));

vi.mock("@/features/runtime-platform/classroom/runtime-session", () => ({
  recordTeacherControlEvent,
}));

vi.mock("./gateway", () => ({
  recordTransportConsumerTrace,
}));

function createSocket() {
  return {
    send: vi.fn(),
  };
}

describe("ws server client message handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getClassroomSnapshotForActor.mockResolvedValue({
      sessionId: "session-1",
      version: 4,
      status: "live",
    });
    applyWebSocketTeacherControlForActor.mockResolvedValue({
      ok: true,
      sessionId: "session-1",
      snapshot: {
        sessionId: "session-1",
        version: 5,
        status: "live",
      },
    });
    recordTeacherControlEvent.mockResolvedValue({
      sessionId: "runtime-session-1",
      classroomSessionId: "session-1",
      applied: true,
      recordedEventId: "event-1",
    });
    recordTransportConsumerTrace.mockResolvedValue(undefined);
  });

  it("returns WEBSOCKET_PAYLOAD_INVALID for malformed payload", async () => {
    const { handleClassroomWebSocketClientMessage } = await import("./ws-server");
    const socket = createSocket();

    await handleClassroomWebSocketClientMessage("not-json", socket as never, {
      userId: "teacher-1",
      schoolId: "school-1",
      actorScope: "teacher",
      workspaceRole: "teacher",
      sessionId: "session-1",
    });

    expect(socket.send).toHaveBeenCalledWith(expect.stringContaining("WEBSOCKET_PAYLOAD_INVALID"));
  });

  it("acknowledges transport.keepalive and records keepalive trace", async () => {
    const { handleClassroomWebSocketClientMessage } = await import("./ws-server");
    const socket = createSocket();

    await handleClassroomWebSocketClientMessage(JSON.stringify({
      messageId: "msg-1",
      sessionId: "session-1",
      actor: {
        userId: "teacher-1",
        scope: "teacher",
        schoolId: "school-1",
      },
      kind: "transport.keepalive",
      sentAt: new Date().toISOString(),
      correlation: {
        correlationId: "corr-1",
        truthPersisted: false,
      },
      payload: {},
    }), socket as never, {
      userId: "teacher-1",
      schoolId: "school-1",
      actorScope: "teacher",
      workspaceRole: "teacher",
      sessionId: "session-1",
    });

    expect(socket.send).toHaveBeenCalledWith(expect.stringContaining("transport.keepalive"));
    expect(recordTransportConsumerTrace).toHaveBeenCalledWith(expect.objectContaining({
      traceType: "keepalive",
      correlationId: "corr-1",
    }));
  });

  it("routes teacher.control to applyWebSocketTeacherControlForActor", async () => {
    const { handleClassroomWebSocketClientMessage } = await import("./ws-server");
    const socket = createSocket();

    await handleClassroomWebSocketClientMessage(JSON.stringify({
      messageId: "msg-2",
      sessionId: "session-1",
      actor: {
        userId: "teacher-1",
        scope: "teacher",
        schoolId: "school-1",
      },
      kind: "teacher.control",
      sentAt: new Date().toISOString(),
      correlation: {
        correlationId: "corr-2",
        truthPersisted: true,
      },
      payload: {
        command: "focus-step",
        expectedVersion: 4,
        targetStepId: "step-2",
      },
    }), socket as never, {
      userId: "teacher-1",
      schoolId: "school-1",
      actorScope: "teacher",
      workspaceRole: "teacher",
      sessionId: "session-1",
    });

    expect(applyWebSocketTeacherControlForActor).toHaveBeenCalledWith(expect.objectContaining({
      command: "focus-step",
      expectedVersion: 4,
      targetStepId: "step-2",
    }));
    expect(socket.send).toHaveBeenCalledWith(expect.stringContaining("classroom.snapshot"));
  });

  it("routes runtime.command to recordTeacherControlEvent and emits runtime.event", async () => {
    const { handleClassroomWebSocketClientMessage } = await import("./ws-server");
    const socket = createSocket();

    await handleClassroomWebSocketClientMessage(JSON.stringify({
      messageId: "msg-3",
      sessionId: "session-1",
      actor: {
        userId: "teacher-1",
        scope: "teacher",
        schoolId: "school-1",
      },
      kind: "runtime.command",
      sentAt: new Date().toISOString(),
      correlation: {
        correlationId: "corr-3",
        truthPersisted: true,
      },
      payload: {
        requestKind: "runtime-teacher-control",
        runtimeInstanceId: "runtime-1",
        bridge: {
          classroomSessionId: "session-1",
          stepId: "step-1",
          command: "focus-step",
          payload: {},
        },
      },
    }), socket as never, {
      userId: "teacher-1",
      schoolId: "school-1",
      actorScope: "teacher",
      workspaceRole: "teacher",
      sessionId: "session-1",
    });

    expect(recordTeacherControlEvent).toHaveBeenCalled();
    expect(socket.send).toHaveBeenCalledWith(expect.stringContaining("runtime.event"));
    expect(recordTransportConsumerTrace).toHaveBeenCalledWith(expect.objectContaining({
      traceType: "runtime_event",
      correlationId: "corr-3",
    }));
  });
});
