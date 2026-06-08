import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstClassroomSessions = vi.fn();
const findFirstTransportDeliveryAttempts = vi.fn();
const insertValues = vi.fn();
const insertMock = vi.fn();
const publish = vi.fn();
const subscribe = vi.fn();
const unsubscribe = vi.fn();
const on = vi.fn();
const broadcast = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  db: {
    query: {
      classroomSessions: { findFirst: findFirstClassroomSessions },
      transportDeliveryAttempts: { findFirst: findFirstTransportDeliveryAttempts },
    },
    insert: insertMock,
  },
}));

vi.mock("./redis-fanout-connection", () => ({
  getRedisFanoutConnections: vi.fn(async () => ({
    publisher: { publish },
    subscriber: { subscribe, unsubscribe, on },
  })),
  getRedisFanoutConnectionHealthSnapshot: vi.fn(() => ({
    deployAllowsRedis: true,
    redisConfigured: true,
    redisReachable: true,
    connectionState: "ready",
    lastError: null,
    lastHealthyAt: "2026-05-18T10:00:00.000Z",
    instanceId: "instance-test",
  })),
  getRedisFanoutInstanceId: vi.fn(() => "instance-test"),
}));

vi.mock("./ws-connection-registry", () => ({
  classroomWebSocketConnectionRegistry: {
    broadcast,
  },
}));

describe("redis fanout manager", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    findFirstClassroomSessions.mockResolvedValue({
      id: "session-1",
      transportModeSnapshot: "redis_fanout",
    });
    findFirstTransportDeliveryAttempts.mockResolvedValue({
      id: "attempt-1",
      runtimeSessionId: "runtime-session-1",
    });
    insertValues.mockResolvedValue(undefined);
    insertMock.mockReturnValue({ values: insertValues });
    publish.mockResolvedValue(1);
    subscribe.mockResolvedValue(undefined);
    unsubscribe.mockResolvedValue(undefined);
    broadcast.mockReturnValue({ deliveredCount: 1 });
  });

  it("keeps desired topic ref-count and subscribes only once per topic", async () => {
    const { classroomRedisFanoutManager } = await import("./redis-fanout-manager");

    await classroomRedisFanoutManager.ensureSubscribed("session-1", "classroom");
    await classroomRedisFanoutManager.ensureSubscribed("session-1", "classroom");

    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(classroomRedisFanoutManager.getSnapshot().desiredTopicCount).toBe(1);
    expect(classroomRedisFanoutManager.getSnapshot().desiredTopics[0]?.refCount).toBe(2);
  });

  it("degrades to local registry fallback and throws a typed delivery error when redis publish fails", async () => {
    publish.mockRejectedValueOnce(new Error("REDIS_PUBLISH_FAILED"));
    const { classroomRedisFanoutManager, RedisFanoutDeliveryError } = await import("./redis-fanout-manager");

    await expect(
      classroomRedisFanoutManager.deliver({
        envelope: {
          sessionId: "session-1",
          channel: "classroom-events",
          kind: "active_step_changed",
          correlationId: "corr-1",
          truthRef: {
            type: "classroom-event",
            id: "event-1",
            classroomSessionId: "session-1",
          },
          payload: { version: 2 },
        },
        serverEnvelope: {
          messageId: "message-1",
          sessionId: "session-1",
          actor: { userId: "teacher-1", scope: "teacher", schoolId: "school-1" },
          kind: "classroom.snapshot",
          sentAt: new Date().toISOString(),
          correlation: { correlationId: "corr-1", truthPersisted: true },
          payload: { version: 2 },
        },
      }),
    ).rejects.toBeInstanceOf(RedisFanoutDeliveryError);

    expect(broadcast).toHaveBeenCalledOnce();
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        adapterMode: "websocket",
        traceType: "snapshot",
        detailJson: expect.objectContaining({
          degraded: true,
          degradedReason: "REDIS_PUBLISH_FAILED",
          receivedVia: "local_registry",
        }),
      }),
    );
  });

  it("reads latest degraded reason from the delivery attempts query", async () => {
    findFirstTransportDeliveryAttempts.mockResolvedValueOnce({
      id: "attempt-2",
      runtimeSessionId: "runtime-session-2",
      payloadSummaryJson: {
        degradedReason: "REDIS_PUBLISH_FAILED",
      },
      failureReason: null,
    });

    const { classroomRedisFanoutManager } = await import("./redis-fanout-manager");

    await expect(
      classroomRedisFanoutManager.getLatestDegradedReason("session-1"),
    ).resolves.toBe("REDIS_PUBLISH_FAILED");

    expect(findFirstTransportDeliveryAttempts).toHaveBeenCalledOnce();
  });

  it("keeps quiz.answer.received on the runtime subchannel for env parity delivery", async () => {
    const { classroomRedisFanoutManager } = await import("./redis-fanout-manager");

    await classroomRedisFanoutManager.deliver({
      envelope: {
        sessionId: "session-1",
        channel: "classroom-runtime",
        kind: "quiz.answer.received",
        correlationId: "corr-quiz-1",
        truthRef: {
          type: "classroom-event",
          id: "event-quiz-1",
          classroomSessionId: "session-1",
        },
        payload: { classroomSessionId: "session-1" },
      },
      serverEnvelope: {
        messageId: "message-quiz-1",
        sessionId: "session-1",
        actor: { userId: "teacher-1", scope: "teacher", schoolId: "school-1" },
        kind: "quiz.answer.received",
        sentAt: new Date().toISOString(),
        correlation: { correlationId: "corr-quiz-1", truthPersisted: true },
        payload: { classroomSessionId: "session-1", kind: "quiz.answer.received" },
      },
    });

    expect(publish).toHaveBeenCalledOnce();
  });
});
