import { beforeEach, describe, expect, it, vi } from "vitest";

const subscribe = vi.fn();
const unsubscribe = vi.fn();
const publish = vi.fn();
const subscriberOnHandlers = new Map<string, (value?: unknown, payload?: string) => void | Promise<void>>();
const findFirstClassroomSessions = vi.fn();
const findFirstTransportDeliveryAttempts = vi.fn();
const insertValues = vi.fn();
const insertMock = vi.fn();
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
    subscriber: {
      subscribe,
      unsubscribe,
      on: vi.fn((event: string, handler: (value?: unknown, payload?: string) => void | Promise<void>) => {
        subscriberOnHandlers.set(event, handler);
      }),
    },
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

describe("redis fanout recovery", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    subscriberOnHandlers.clear();
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

  it("restores desired subscriptions after subscriber ready and resumes cross-instance delivery proof", async () => {
    const { classroomRedisFanoutManager } = await import("./redis-fanout-manager");

    await classroomRedisFanoutManager.ensureSubscribed("session-1", "classroom");
    await subscriberOnHandlers.get("ready")?.();

    expect(subscribe).toHaveBeenCalled();
    expect(classroomRedisFanoutManager.getSnapshot().subscriberReady).toBe(true);

    await subscriberOnHandlers.get("message")?.(
      "openlearn:classroom-session:session-1:classroom",
      JSON.stringify({
        sessionId: "session-1",
        correlationId: "corr-1",
        fanoutMode: "redis_fanout",
        subchannel: "classroom",
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
    );

    expect(broadcast).toHaveBeenCalledOnce();
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        detailJson: expect.objectContaining({
          receivedVia: "redis_subscriber",
          fanoutMode: "redis_fanout",
        }),
      }),
    );
  });

  it("does not start redis recovery path for local_only sessions", async () => {
    findFirstClassroomSessions.mockResolvedValue({
      id: "session-1",
      transportModeSnapshot: "local_only",
    });
    const { classroomRedisFanoutManager } = await import("./redis-fanout-manager");

    await classroomRedisFanoutManager.ensureSubscribed("session-1", "classroom");

    expect(subscribe).not.toHaveBeenCalled();
    expect(classroomRedisFanoutManager.getSnapshot().desiredTopicCount).toBe(0);
  });
});
