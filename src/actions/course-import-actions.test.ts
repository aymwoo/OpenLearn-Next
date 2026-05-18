import { beforeEach, describe, expect, it, vi } from "vitest";

const updateTag = vi.fn();
const { assertActiveTeacher } = vi.hoisted(() => ({
  assertActiveTeacher: vi.fn(),
}));
const { draftCourseImport, prepareCourseImportApplyTask } = vi.hoisted(() => ({
  draftCourseImport: vi.fn(),
  prepareCourseImportApplyTask: vi.fn(),
}));

vi.mock("next/cache", () => ({ updateTag }));
vi.mock("@/lib/dal/lesson-authoring", () => ({ assertActiveTeacher }));
vi.mock("@/lib/dal/course-import", () => ({ draftCourseImport, prepareCourseImportApplyTask }));
vi.mock("@/lib/cache-policy", () => ({
  cacheTags: {
    teacherCourses: (actorId: string) => `teacher-courses:${actorId}`,
    courseImportSchool: (schoolId: string) => `course:import-school:${schoolId}`,
    courseImportBatch: (batchId: string) => `course:import-batch:${batchId}`,
    asyncTask: (taskId: string) => `async-task:${taskId}`,
    asyncTaskList: (actorId: string) => `async-task-list:${actorId}`,
    asyncTaskEntity: (entityType: string, entityId: string) => `async-task-entity:${entityType}:${entityId}`,
  },
}));

describe("course import actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertActiveTeacher.mockResolvedValue({ userId: "teacher-1", schoolIds: ["school-1"] });
  });

  it("returns validation error when draft input is incomplete", async () => {
    const { draftCourseImportAction } = await import("./course-import-actions");
    const result = await draftCourseImportAction({ sourceLabel: "bad.csv" });

    expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR", message: "导入内容不完整，请先检查输入。" });
  });

  it("delegates draft import and invalidates cache tags", async () => {
    draftCourseImport.mockResolvedValue({ id: "batch-1", schoolId: "school-1" });
    const { draftCourseImportAction } = await import("./course-import-actions");
    const result = await draftCourseImportAction({
      schoolId: "school-1",
      sourceType: "csv",
      sourceLabel: "courses.csv",
      rows: [{ title: "七年级科学探究", subject: "科学", grade: "七年级", status: "draft" }],
    });

    expect(result).toEqual({ ok: true, data: { id: "batch-1", schoolId: "school-1" } });
    expect(updateTag).toHaveBeenCalledWith("teacher-courses:teacher-1");
    expect(updateTag).toHaveBeenCalledWith("course:import-school:school-1");
    expect(updateTag).toHaveBeenCalledWith("course:import-batch:batch-1");
  });

  it("delegates async apply trigger and invalidates task plus batch tags", async () => {
    prepareCourseImportApplyTask.mockResolvedValue({
      batchId: "batch-1",
      schoolId: "school-1",
      taskId: "task-1",
      taskStatus: "queued",
      enqueueIntentStatus: "dispatched",
      reusedExistingTask: false,
      dispatchFailed: false,
      message: "导入任务已创建，正在排队处理中。",
      task: {
        id: "task-1",
        taskType: "course_import.apply_batch",
        featureArea: "course_import",
        status: "queued",
        enqueueIntentStatus: "dispatched",
        visibilityScope: "actor_owned",
        entityRef: { entityType: "course_import_batch", entityId: "batch-1", entityLabel: null },
        metadata: {
          labelKey: "asyncTasks.courseImport.applyBatch.label",
          summaryKey: "asyncTasks.courseImport.applyBatch.summary",
          featureArea: "course_import",
        },
        progress: null,
        result: null,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
        completedAt: null,
        queueJobId: null,
        latestAttemptNumber: 0,
        failure: null,
        recovery: null,
        attempts: [],
        history: [],
      },
    });
    const { applyCourseImportAction } = await import("./course-import-actions");
    const result = await applyCourseImportAction({ batchId: "batch-1", matchedRowDecisions: [] });

    expect(result.ok).toBe(true);
    expect(updateTag).toHaveBeenCalledWith("teacher-courses:teacher-1");
    expect(updateTag).toHaveBeenCalledWith("course:import-school:school-1");
    expect(updateTag).toHaveBeenCalledWith("course:import-batch:batch-1");
    expect(updateTag).toHaveBeenCalledWith("async-task:task-1");
    expect(updateTag).toHaveBeenCalledWith("async-task-list:teacher-1");
    expect(updateTag).toHaveBeenCalledWith("async-task-entity:course_import_batch:batch-1");
  });

  it("reuses an active task and still invalidates batch plus async tags honestly", async () => {
    prepareCourseImportApplyTask.mockResolvedValue({
      batchId: "batch-1",
      schoolId: "school-1",
      taskId: "task-1",
      taskStatus: "running",
      enqueueIntentStatus: "dispatched",
      reusedExistingTask: true,
      dispatchFailed: false,
      message: "这批导入已在处理中，已复用当前任务。",
      task: {
        id: "task-1",
        taskType: "course_import.apply_batch",
        featureArea: "course_import",
        status: "running",
        enqueueIntentStatus: "dispatched",
        visibilityScope: "actor_owned",
        entityRef: { entityType: "course_import_batch", entityId: "batch-1", entityLabel: null },
        metadata: {
          labelKey: "asyncTasks.courseImport.applyBatch.label",
          summaryKey: "asyncTasks.courseImport.applyBatch.summary",
          featureArea: "course_import",
        },
        progress: null,
        result: null,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
        completedAt: null,
        queueJobId: null,
        latestAttemptNumber: 1,
        failure: null,
        recovery: null,
        attempts: [],
        history: [],
      },
    });

    const { applyCourseImportAction } = await import("./course-import-actions");
    const result = await applyCourseImportAction({ batchId: "batch-1", matchedRowDecisions: [] });

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        reusedExistingTask: true,
        taskStatus: "running",
        dispatchFailed: false,
        message: "这批导入已在处理中，已复用当前任务。",
      }),
    });
    expect(updateTag).toHaveBeenCalledWith("course:import-batch:batch-1");
    expect(updateTag).toHaveBeenCalledWith("async-task:task-1");
    expect(updateTag).toHaveBeenCalledWith("async-task-entity:course_import_batch:batch-1");
  });

  it("returns honest dispatch-failed payload without collapsing it into success copy", async () => {
    prepareCourseImportApplyTask.mockResolvedValue({
      batchId: "batch-1",
      schoolId: "school-1",
      taskId: "task-2",
      taskStatus: "dispatch_failed",
      enqueueIntentStatus: "dispatch_failed",
      reusedExistingTask: false,
      dispatchFailed: true,
      message: "导入任务创建成功，但当前未成功入队，请稍后重试。",
      task: {
        id: "task-2",
        taskType: "course_import.apply_batch",
        featureArea: "course_import",
        status: "dispatch_failed",
        enqueueIntentStatus: "dispatch_failed",
        visibilityScope: "actor_owned",
        entityRef: { entityType: "course_import_batch", entityId: "batch-1", entityLabel: null },
        metadata: {
          labelKey: "asyncTasks.courseImport.applyBatch.label",
          summaryKey: "asyncTasks.courseImport.applyBatch.summary",
          featureArea: "course_import",
        },
        progress: null,
        result: null,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
        completedAt: null,
        queueJobId: null,
        latestAttemptNumber: 0,
        failure: null,
        recovery: null,
        attempts: [],
        history: [],
      },
    });

    const { applyCourseImportAction } = await import("./course-import-actions");
    const result = await applyCourseImportAction({ batchId: "batch-1", matchedRowDecisions: [] });

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        taskStatus: "dispatch_failed",
        enqueueIntentStatus: "dispatch_failed",
        dispatchFailed: true,
        message: "导入任务创建成功，但当前未成功入队，请稍后重试。",
      }),
    });
    expect(result).not.toEqual({
      ok: true,
      data: expect.objectContaining({
        message: "导入任务已创建，正在排队处理中。",
      }),
    });
    expect(updateTag).toHaveBeenCalledWith("course:import-batch:batch-1");
    expect(updateTag).toHaveBeenCalledWith("async-task:task-2");
  });
});
