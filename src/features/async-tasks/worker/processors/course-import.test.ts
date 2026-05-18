import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

const { executeCourseImportApplyTask } = vi.hoisted(() => ({
  executeCourseImportApplyTask: vi.fn(),
}));

vi.mock("@/lib/dal/course-import", () => ({
  executeCourseImportApplyTask,
}));

import { processCourseImportApplyBatchJob } from "./course-import";

const processorSource = readFileSync(
  "src/features/async-tasks/worker/processors/course-import.ts",
  "utf8",
);

describe("course import processor", () => {
  it("updates structured progress and returns a batch-import specific result summary", async () => {
    executeCourseImportApplyTask.mockResolvedValue({
      batchId: "batch-1",
      schoolId: "school-1",
      actorId: "teacher-1",
      batchStatus: "partially_applied",
      applySummary: {
        created: 2,
        updated: 1,
        skipped: 1,
        failed: 1,
      },
      failedRowCount: 1,
      outcome: "partially_completed",
      titleKey: "asyncTasks.courseImport.applyBatch.result.partial",
      summaryKey: "asyncTasks.courseImport.applyBatch.result.partialSummary",
      counts: {
        total: 5,
        succeeded: 3,
        partiallySucceeded: 3,
        failed: 1,
        skipped: 1,
      },
      detail: {
        batchId: "batch-1",
        schoolId: "school-1",
        batchStatus: "partially_applied",
        applySummary: {
          created: 2,
          updated: 1,
          skipped: 1,
          failed: 1,
        },
      },
    });

    const updateProgress = vi.fn(async () => undefined);

    const result = await processCourseImportApplyBatchJob({
      id: "job_1",
      name: "course_import.apply_batch",
      data: {
        batchId: "batch-1",
        schoolId: "school-1",
        actorId: "teacher-1",
      },
      updateProgress,
    });

    expect(updateProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "running",
        messageKey: "asyncTasks.courseImport.applyBatch.progress.running",
        percentComplete: 5,
        detail: expect.objectContaining({
          batchId: "batch-1",
          schoolId: "school-1",
          actorId: "teacher-1",
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        batchId: "batch-1",
        schoolId: "school-1",
        actorId: "teacher-1",
        outcome: "partially_completed",
        applySummary: {
          created: 2,
          updated: 1,
          skipped: 1,
          failed: 1,
        },
        counts: {
          total: 5,
          succeeded: 3,
          partiallySucceeded: 3,
          failed: 1,
          skipped: 1,
        },
        detail: expect.objectContaining({
          batchId: "batch-1",
          applySummary: {
            created: 2,
            updated: 1,
            skipped: 1,
            failed: 1,
          },
        }),
      }),
    );
    expect(executeCourseImportApplyTask).toHaveBeenCalledWith({
      batchId: "batch-1",
      schoolId: "school-1",
      actorId: "teacher-1",
    });
  });

  it("keeps processor discipline away from direct db writes and durable mutation helpers", () => {
    expect(processorSource).not.toContain("@/db");
    expect(processorSource).not.toContain("drizzle-orm");
    expect(processorSource).not.toContain("persistRowApplyResult");
  });

  it("delegates duplicate-delivery protection to durable row truth execution helper", () => {
    expect(processorSource).toContain("executeCourseImportApplyTask(payload)");
    expect(processorSource).not.toContain("createCourseForTeacherScoped");
    expect(processorSource).not.toContain("updateMatchedCourseStatusForTeacherScoped");
  });
});
