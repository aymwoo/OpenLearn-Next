import { beforeEach, describe, expect, it, vi } from "vitest";

import { asyncTaskRegistry } from "@/features/async-tasks/server/registry";

const updateTag = vi.fn();
const revalidatePath = vi.fn();
const { retryAsyncTaskForOperator } = vi.hoisted(() => ({
  retryAsyncTaskForOperator: vi.fn(),
}));

vi.mock("next/cache", () => ({
  updateTag,
  revalidatePath,
}));

vi.mock("@/features/async-tasks/server/recovery", () => ({
  retryAsyncTaskForOperator,
}));

describe("async task operator actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validation error when taskId is missing", async () => {
    const { retryAsyncTaskForOperatorAction } = await import("./async-task-operator-actions");
    const result = await retryAsyncTaskForOperatorAction({ taskId: "" });

    expect(result.ok).toBe(false);
    expect(result).toEqual(
      expect.objectContaining({
        error: "VALIDATION_ERROR",
      }),
    );
  });

  it("delegates recovery and invalidates task/entity/list tags plus operator routes", async () => {
    retryAsyncTaskForOperator.mockResolvedValue({
      taskId: "task-1",
      actorId: "teacher-1",
      entityType: "course_import_batch",
      entityId: "batch-1",
      latestAttemptNumber: 2,
      status: "retrying",
    });

    const { retryAsyncTaskForOperatorAction } = await import("./async-task-operator-actions");
    const result = await retryAsyncTaskForOperatorAction({ taskId: "task-1" });

    expect(result).toEqual({
      ok: true,
      data: {
        taskId: "task-1",
        actorId: "teacher-1",
        entityType: "course_import_batch",
        entityId: "batch-1",
        latestAttemptNumber: 2,
        status: "retrying",
      },
    });
    expect(updateTag).toHaveBeenCalledWith("async-task:task-1");
    expect(updateTag).toHaveBeenCalledWith("async-task-entity:course_import_batch:batch-1");
    expect(updateTag).toHaveBeenCalledWith("async-task-list:teacher-1");
    expect(revalidatePath).toHaveBeenCalledWith("/settings/labs/async-tasks");
    expect(revalidatePath).toHaveBeenCalledWith("/settings/labs/async-tasks/task-1");
  });

  it("keeps workload-family recovery contract generic for all operator-visible phase43 workloads", async () => {
    const taskTypes = [
      "schedule.reminder_delivery",
      "classroom.session_summary",
      "resource.knowledge_source_ingest",
    ] as const;

    for (const taskType of taskTypes) {
      expect(asyncTaskRegistry[taskType].visibilityScope).toBe("school_operator");
      expect(asyncTaskRegistry[taskType].operatorRecovery.enabled).toBe(true);
      expect(asyncTaskRegistry[taskType].operatorRecovery.mode).toBe("same_task_new_attempt");
      expect(asyncTaskRegistry[taskType].labelKey).toContain("asyncTasks.");
      expect(asyncTaskRegistry[taskType].summaryKey).toContain("asyncTasks.");
    }
  });
});
