import { beforeEach, describe, expect, it, vi } from "vitest";

const updateTag = vi.fn();
const { assertActiveTeacher } = vi.hoisted(() => ({
  assertActiveTeacher: vi.fn(),
}));
const { draftCourseImport, applyCourseImport } = vi.hoisted(() => ({
  draftCourseImport: vi.fn(),
  applyCourseImport: vi.fn(),
}));

vi.mock("next/cache", () => ({ updateTag }));
vi.mock("@/lib/dal/lesson-authoring", () => ({ assertActiveTeacher }));
vi.mock("@/lib/dal/course-import", () => ({ draftCourseImport, applyCourseImport }));
vi.mock("@/lib/cache-policy", () => ({
  cacheTags: {
    teacherCourses: (actorId: string) => `teacher-courses:${actorId}`,
    courseImportSchool: (schoolId: string) => `course:import-school:${schoolId}`,
    courseImportBatch: (batchId: string) => `course:import-batch:${batchId}`,
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

  it("delegates apply import and invalidates cache tags", async () => {
    applyCourseImport.mockResolvedValue({ batchId: "batch-1", schoolId: "school-1", status: "partially_applied", summary: { created: 1, updated: 0, skipped: 0, failed: 1 }, rows: [] });
    const { applyCourseImportAction } = await import("./course-import-actions");
    const result = await applyCourseImportAction({ batchId: "batch-1", matchedRowDecisions: [] });

    expect(result.ok).toBe(true);
    expect(updateTag).toHaveBeenCalledWith("teacher-courses:teacher-1");
    expect(updateTag).toHaveBeenCalledWith("course:import-school:school-1");
    expect(updateTag).toHaveBeenCalledWith("course:import-batch:batch-1");
  });
});
