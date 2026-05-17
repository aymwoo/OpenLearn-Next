import { beforeEach, describe, expect, it, vi } from "vitest";

const insertReturning = vi.fn();
const insertValues = vi.fn();
const insertMock = vi.fn();
const updateWhere = vi.fn();
const updateSet = vi.fn();
const updateMock = vi.fn();
const findFirstTransportDeliveryAttempts = vi.fn();
const deliverMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  db: {
    insert: insertMock,
    update: updateMock,
    query: {
      transportDeliveryAttempts: {
        findFirst: findFirstTransportDeliveryAttempts,
      },
    },
  },
}));

vi.mock("./sse-adapter", () => ({
  sseRuntimeTransportAdapter: {
    id: "transport-sse-adapter",
    mode: "sse",
    describeOwnership: () => ({
      sourceOfTruth: "classroom-session-write-path",
      deliveryMode: "sse",
      posture: "default-only",
      notes: [],
    }),
    deliver: deliverMock,
  },
}));

describe("transport gateway", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    insertReturning.mockResolvedValue([
      {
        id: "attempt-1",
        runtimeSessionId: "runtime-session-1",
      },
    ]);
    insertValues.mockReturnValue({
      returning: insertReturning,
    });
    insertMock.mockReturnValue({
      values: insertValues,
    });

    updateWhere.mockResolvedValue(undefined);
    updateSet.mockReturnValue({ where: updateWhere });
    updateMock.mockReturnValue({ set: updateSet });
    findFirstTransportDeliveryAttempts.mockResolvedValue({
      id: "attempt-1",
      runtimeSessionId: "runtime-session-1",
    });
    deliverMock.mockResolvedValue(undefined);
  });

  it("routes classroom runtime events by channel and kind through the SSE adapter", async () => {
    const { publishTransportEvent } = await import("./gateway");

    const result = await publishTransportEvent({
      sessionId: "classroom-session-1",
      channel: "classroom-runtime",
      kind: "runtime.ready",
      correlationId: "corr-1",
      truthPersisted: true,
      truthRef: {
        type: "runtime-session",
        id: "runtime-session-1",
        runtimeSessionId: "runtime-session-1",
        classroomSessionId: "classroom-session-1",
      },
      payload: {
        requestKind: "runtime-ready",
      },
    });

    expect(deliverMock).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "classroom-runtime",
        kind: "runtime.ready",
        correlationId: "corr-1",
      }),
    );
    expect(result).toMatchObject({
      truthPersisted: true,
      deliveryAttempted: true,
      attemptStatus: "delivered",
      adapterId: "transport-sse-adapter",
      adapterMode: "sse",
    });
  });

  it("returns two-stage semantics and keeps truth persisted even when delivery fails", async () => {
    deliverMock.mockRejectedValueOnce(new Error("sse down"));

    const { publishTransportEvent } = await import("./gateway");

    const result = await publishTransportEvent({
      sessionId: "classroom-session-1",
      channel: "classroom-events",
      kind: "active_step_changed",
      correlationId: "corr-2",
      truthPersisted: true,
      truthRef: {
        type: "classroom-event",
        id: "event-1",
        classroomSessionId: "classroom-session-1",
      },
      payload: {
        version: 3,
      },
    });

    expect(result).toMatchObject({
      truthPersisted: true,
      deliveryAttempted: true,
      attemptStatus: "failed",
      failureReason: "sse down",
    });
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptStatus: "failed",
        failureReason: "sse down",
      }),
    );
  });

  it("records consumer-facing traces without creating a new truth source", async () => {
    const { recordTransportConsumerTrace } = await import("./gateway");

    await recordTransportConsumerTrace({
      sessionId: "classroom-session-1",
      correlationId: "corr-1",
      adapterId: "transport-sse-adapter",
      adapterMode: "sse",
      traceType: "snapshot",
      status: "emitted",
      snapshotVersion: 5,
      detail: {
        event: "snapshot",
      },
    });

    expect(insertValues).toHaveBeenLastCalledWith(
      expect.objectContaining({
        attemptId: "attempt-1",
        classroomSessionId: "classroom-session-1",
        runtimeSessionId: "runtime-session-1",
        traceType: "snapshot",
        status: "emitted",
        snapshotVersion: 5,
      }),
    );
  });
});
