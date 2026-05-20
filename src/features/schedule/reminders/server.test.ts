import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const findMany = vi.fn();
const updateValues = vi.fn();
const updateWhere = vi.fn();
const updateSet = vi.fn(() => ({ where: updateWhere }));
const insertValues = vi.fn();
const insertReturning = vi.fn();
const enqueueAsyncTask = vi.fn();

updateWhere.mockImplementation(() => ({
  returning: updateValues,
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      scheduleReminderDispatch: {
        findMany,
      },
    },
    update: vi.fn(() => ({ set: updateSet })),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: insertReturning })) })),
    transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({})),
  },
}));

vi.mock("@/features/async-tasks/server/enqueue", () => ({
  enqueueAsyncTask,
}));

vi.mock("@/features/schedule/shared/auth", () => ({
  assertScheduleTeacherScope: vi.fn(async () => ({ userId: "teacher-1", schoolIds: ["school-1"] })),
  assertScheduleSchoolScope: vi.fn(async () => ({ userId: "teacher-1", schoolIds: ["school-1"] })),
}));

vi.mock("@/features/schedule/shared/audit", () => ({
  appendScheduleAudit: vi.fn(async () => undefined),
}));

vi.mock("@/server/schedule/reminder-dispatch", () => ({
  isSupportedScheduleReminderChannel: vi.fn(() => true),
}));

describe("schedule reminder async orchestration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    updateWhere.mockImplementation(() => ({
      returning: updateValues,
    }));
  });

  it("claims due planned dispatches once and enqueues one reminder delivery task per dispatch", async () => {
    const { enqueueDueScheduleReminderDispatches } = await import("./server");

    findMany.mockResolvedValueOnce([
      {
        id: "dispatch-1",
        schoolId: "school-1",
        ruleId: "rule-1",
        actorId: "teacher-1",
        type: "pre_class",
        channel: "wecom-notify",
        targetLabel: "下一节课",
        status: "planned",
        scheduledFor: new Date("2026-05-20T08:00:00.000Z"),
        payloadJson: { recipientScope: "teacher" },
      },
    ]);
    updateValues
      .mockResolvedValueOnce([
        {
          id: "dispatch-1",
          schoolId: "school-1",
          ruleId: "rule-1",
          actorId: "teacher-1",
          type: "pre_class",
          channel: "wecom-notify",
          targetLabel: "下一节课",
          status: "dispatching",
          scheduledFor: new Date("2026-05-20T08:00:00.000Z"),
          payloadJson: { recipientScope: "teacher" },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "dispatch-1",
          deliveryTaskId: "task-1",
          status: "dispatching",
        },
      ]);
    enqueueAsyncTask.mockResolvedValueOnce({
      id: "task-1",
      status: "queued",
      failure: null,
    });

    const result = await enqueueDueScheduleReminderDispatches({ now: new Date("2026-05-20T08:05:00.000Z") });

    expect(enqueueAsyncTask).toHaveBeenCalledWith(
      expect.objectContaining({
        taskType: "schedule.reminder_delivery",
        entityRef: expect.objectContaining({
          entityType: "schedule_reminder_dispatch",
          entityId: "dispatch-1",
        }),
        dispatchRequested: true,
        payload: expect.objectContaining({
          dispatchId: "dispatch-1",
          schoolId: "school-1",
          ruleId: "rule-1",
          actorId: "teacher-1",
        }),
      }),
    );
    expect(result).toEqual([
      expect.objectContaining({ dispatchId: "dispatch-1", taskId: "task-1" }),
    ]);
  });

  it("skips duplicate claim when another worker already took the same due dispatch", async () => {
    const { enqueueDueScheduleReminderDispatches } = await import("./server");

    findMany.mockResolvedValueOnce([
      {
        id: "dispatch-1",
        schoolId: "school-1",
        ruleId: "rule-1",
        actorId: "teacher-1",
        type: "pre_class",
        channel: "wecom-notify",
        targetLabel: "下一节课",
        status: "planned",
        scheduledFor: new Date("2026-05-20T08:00:00.000Z"),
        payloadJson: { recipientScope: "teacher" },
      },
    ]);
    updateValues.mockResolvedValueOnce([]);

    const result = await enqueueDueScheduleReminderDispatches({ now: new Date("2026-05-20T08:05:00.000Z") });

    expect(enqueueAsyncTask).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("projects provider success and failure onto durable reminder delivery truth", async () => {
    const { completeScheduleReminderDeliveryAttempt } = await import("./server");

    insertReturning.mockResolvedValue([]);

    const sent = await completeScheduleReminderDeliveryAttempt(
      {
        dispatchId: "dispatch-1",
        schoolId: "school-1",
        ruleId: "rule-1",
        actorId: "teacher-1",
        channel: "wecom-notify",
        scheduledFor: "2026-05-20T08:00:00.000Z",
        payload: { recipientScope: "teacher" },
      },
      { status: "sent", failureReason: null },
    );

    const failed = await completeScheduleReminderDeliveryAttempt(
      {
        dispatchId: "dispatch-2",
        schoolId: "school-1",
        ruleId: "rule-2",
        actorId: "teacher-1",
        channel: "wecom-notify",
        scheduledFor: "2026-05-20T09:00:00.000Z",
        payload: { recipientScope: "teacher", simulateFailure: true },
      },
      { status: "failed", failureReason: "模拟发送失败" },
    );

    expect(sent).toEqual(expect.objectContaining({ outcome: "completed", deliveryStatus: "sent" }));
    expect(failed).toEqual(expect.objectContaining({ outcome: "failed", deliveryStatus: "retry_required" }));
  });
});
