import { beforeEach, describe, expect, it, vi } from "vitest";

const updateTag = vi.fn();
const { assertActiveTeacher } = vi.hoisted(() => ({
  assertActiveTeacher: vi.fn(),
}));

const {
  addCourseClassAssociationForTeacherScoped,
  archiveCourseForTeacherScoped,
  createCourseForTeacherScoped,
  deleteCourseForTeacherScoped,
  publishCourseForTeacherScoped,
  removeCourseClassAssociationForTeacherScoped,
  unpublishCourseForTeacherScoped,
  updateCourseForTeacherScoped,
} = vi.hoisted(() => ({
  addCourseClassAssociationForTeacherScoped: vi.fn(),
  archiveCourseForTeacherScoped: vi.fn(),
  createCourseForTeacherScoped: vi.fn(),
  deleteCourseForTeacherScoped: vi.fn(),
  publishCourseForTeacherScoped: vi.fn(),
  removeCourseClassAssociationForTeacherScoped: vi.fn(),
  unpublishCourseForTeacherScoped: vi.fn(),
  updateCourseForTeacherScoped: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  updateTag,
}));

vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher,
}));

vi.mock("@/lib/dal/course-authoring", () => ({
  addCourseClassAssociationForTeacherScoped,
  archiveCourseForTeacherScoped,
  createCourseForTeacherScoped,
  deleteCourseForTeacherScoped,
  publishCourseForTeacherScoped,
  removeCourseClassAssociationForTeacherScoped,
  unpublishCourseForTeacherScoped,
  updateCourseForTeacherScoped,
}));

vi.mock("@/lib/cache-policy", () => ({
  cacheTags: {
    teacherCourses: (actorId: string) => `teacher-courses:${actorId}`,
    course: (courseId: string) => `course:${courseId}`,
  },
}));

describe("createCourseAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertActiveTeacher.mockResolvedValue({ userId: "teacher-1", schoolIds: ["school-1"] });
  });

  it("returns validation error when input is incomplete", async () => {
    const { createCourseAction } = await import("./course-authoring-actions");

    const result = await createCourseAction({
      title: "",
    });

    expect(result).toEqual({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "输入内容不完整，请检查后再保存。",
    });
    expect(createCourseForTeacherScoped).not.toHaveBeenCalled();
  });

  it("returns success and invalidates cache tags on successful creation", async () => {
    const mockCourse = {
      id: "course-1",
      schoolId: "school-1",
      ownerId: "teacher-1",
      title: "数学基础",
      subject: "math",
      grade: "g7",
      status: "draft",
      lessonCount: 0,
      classLabels: [],
      enrollmentCount: 0,
      updatedAt: new Date().toISOString(),
    };
    createCourseForTeacherScoped.mockResolvedValueOnce(mockCourse);

    const { createCourseAction } = await import("./course-authoring-actions");
    const result = await createCourseAction({
      schoolId: "school-1",
      title: "数学基础",
      subject: "math",
      grade: "g7",
    });

    expect(result).toEqual({
      ok: true,
      data: mockCourse,
    });
    expect(updateTag).toHaveBeenCalledWith("teacher-courses:teacher-1");
    expect(updateTag).toHaveBeenCalledWith("course:course-1");
  });

  it("maps TEACHER_AUTH_REQUIRED to UNAUTHORIZED", async () => {
    const { createCourseAction } = await import("./course-authoring-actions");

    assertActiveTeacher.mockRejectedValueOnce(new Error("TEACHER_AUTH_REQUIRED"));

    const result = await createCourseAction({
      schoolId: "school-1",
      title: "数学基础",
      subject: "math",
      grade: "g7",
    });

    expect(result).toEqual({
      ok: false,
      error: "UNAUTHORIZED",
      message: "您没有权限执行此操作。",
    });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("handles generic errors with ACTION_FAILED", async () => {
    const { createCourseAction } = await import("./course-authoring-actions");

    createCourseForTeacherScoped.mockRejectedValueOnce(new Error("DATABASE_ERROR"));

    const result = await createCourseAction({
      schoolId: "school-1",
      title: "数学基础",
      subject: "math",
      grade: "g7",
    });

    expect(result).toEqual({
      ok: false,
      error: "ACTION_FAILED",
      message: "课程信息暂时没有保存成功，请稍后重试。",
    });
  });

  it("handles ZodError as validation error", async () => {
    const { createCourseAction } = await import("./course-authoring-actions");
    const { z } = await import("zod");

    createCourseForTeacherScoped.mockRejectedValueOnce(new z.ZodError([]));

    const result = await createCourseAction({
      schoolId: "school-1",
      title: "数学基础",
      subject: "math",
      grade: "g7",
    });

    expect(result).toEqual({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "输入内容不完整，请检查后再保存。",
    });
  });
});

describe("updateCourseAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertActiveTeacher.mockResolvedValue({ userId: "teacher-1", schoolIds: ["school-1"] });
  });

  it("returns validation error when input is incomplete", async () => {
    const { updateCourseAction } = await import("./course-authoring-actions");

    const result = await updateCourseAction({
      courseId: "course-1",
      title: "",
    });

    expect(result).toEqual({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "输入内容不完整，请检查后再保存。",
    });
    expect(updateCourseForTeacherScoped).not.toHaveBeenCalled();
  });

  it("returns success with course detail and invalidates cache tags", async () => {
    const { updateCourseAction } = await import("./course-authoring-actions");

    updateCourseForTeacherScoped.mockResolvedValueOnce({
      id: "course-1",
      schoolId: "school-1",
      ownerId: "teacher-1",
      title: "更新后的课程",
      subject: "math",
      grade: "g8",
      status: "published",
      lessonCount: 5,
      classLabels: ["八年级一班"],
      classLinks: [{ id: "class-1", name: "八年级一班" }],
      enrollmentCount: 30,
      updatedAt: new Date().toISOString(),
      lessons: [],
    });

    const result = await updateCourseAction({
      courseId: "course-1",
      title: "更新后的课程",
      subject: "math",
      grade: "g8",
      status: "published",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(`expected success, got ${result.error}`);
    }
    expect(result.data).toMatchObject({
      id: "course-1",
      title: "更新后的课程",
      status: "published",
    });
    expect(updateTag).toHaveBeenCalledWith("teacher-courses:teacher-1");
    expect(updateTag).toHaveBeenCalledWith("course:course-1");
  });

  it("maps TEACHER_AUTH_REQUIRED to UNAUTHORIZED", async () => {
    const { updateCourseAction } = await import("./course-authoring-actions");

    assertActiveTeacher.mockRejectedValueOnce(new Error("TEACHER_AUTH_REQUIRED"));

    const result = await updateCourseAction({
      courseId: "course-1",
      title: "更新后的课程",
      subject: "math",
      grade: "g8",
      status: "published",
    });

    expect(result).toEqual({
      ok: false,
      error: "UNAUTHORIZED",
      message: "您没有权限执行此操作。",
    });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("maps COURSE_NOT_FOUND to NOT_FOUND", async () => {
    const { updateCourseAction } = await import("./course-authoring-actions");

    updateCourseForTeacherScoped.mockRejectedValueOnce(new Error("COURSE_NOT_FOUND"));

    const result = await updateCourseAction({
      courseId: "course-1",
      title: "更新后的课程",
      subject: "math",
      grade: "g8",
      status: "published",
    });

    expect(result).toEqual({
      ok: false,
      error: "NOT_FOUND",
      message: "课程不存在或已被移除。",
    });
  });

  it("handles generic errors with ACTION_FAILED", async () => {
    const { updateCourseAction } = await import("./course-authoring-actions");

    updateCourseForTeacherScoped.mockRejectedValueOnce(new Error("DATABASE_ERROR"));

    const result = await updateCourseAction({
      courseId: "course-1",
      title: "更新后的课程",
      subject: "math",
      grade: "g8",
      status: "published",
    });

    expect(result).toEqual({
      ok: false,
      error: "ACTION_FAILED",
      message: "课程信息暂时没有保存成功，请稍后重试。",
    });
  });

  it("handles ZodError as validation error", async () => {
    const { updateCourseAction } = await import("./course-authoring-actions");
    const { z } = await import("zod");

    updateCourseForTeacherScoped.mockRejectedValueOnce(new z.ZodError([]));

    const result = await updateCourseAction({
      courseId: "course-1",
      title: "更新后的课程",
      subject: "math",
      grade: "g8",
      status: "published",
    });

    expect(result).toEqual({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "输入内容不完整，请检查后再保存。",
    });
  });
});

describe("course class association actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertActiveTeacher.mockResolvedValue({ userId: "teacher-1", schoolIds: ["school-1"] });
  });

  it("adds a class association and invalidates course tags", async () => {
    const { addCourseClassAssociationAction } = await import("./course-authoring-actions");

    addCourseClassAssociationForTeacherScoped.mockResolvedValueOnce({
      id: "course-1",
      schoolId: "school-1",
      ownerId: "teacher-1",
      title: "更新后的课程",
      subject: "math",
      grade: "g8",
      status: "draft",
      lessonCount: 5,
      classLabels: ["八年级一班", "八年级二班"],
      classLinks: [
        { id: "class-1", name: "八年级一班" },
        { id: "class-2", name: "八年级二班" },
      ],
      availableClasses: [],
      enrollmentCount: 30,
      deleteEligibility: { canDelete: false, reasons: [] },
      updatedAt: new Date().toISOString(),
      lessons: [],
    });

    const result = await addCourseClassAssociationAction({ courseId: "course-1", classId: "class-2" });

    expect(result.ok).toBe(true);
    expect(addCourseClassAssociationForTeacherScoped).toHaveBeenCalledWith({ courseId: "course-1", classId: "class-2" });
    expect(updateTag).toHaveBeenCalledWith("teacher-courses:teacher-1");
    expect(updateTag).toHaveBeenCalledWith("course:course-1");
  });

  it("removes a class association and invalidates course tags", async () => {
    const { removeCourseClassAssociationAction } = await import("./course-authoring-actions");

    removeCourseClassAssociationForTeacherScoped.mockResolvedValueOnce({
      id: "course-1",
      schoolId: "school-1",
      ownerId: "teacher-1",
      title: "更新后的课程",
      subject: "math",
      grade: "g8",
      status: "draft",
      lessonCount: 5,
      classLabels: ["八年级一班"],
      classLinks: [{ id: "class-1", name: "八年级一班" }],
      availableClasses: [{ id: "class-2", name: "八年级二班" }],
      enrollmentCount: 30,
      deleteEligibility: { canDelete: false, reasons: [] },
      updatedAt: new Date().toISOString(),
      lessons: [],
    });

    const result = await removeCourseClassAssociationAction({ courseId: "course-1", classId: "class-2" });

    expect(result.ok).toBe(true);
    expect(removeCourseClassAssociationForTeacherScoped).toHaveBeenCalledWith({ courseId: "course-1", classId: "class-2" });
    expect(updateTag).toHaveBeenCalledWith("teacher-courses:teacher-1");
    expect(updateTag).toHaveBeenCalledWith("course:course-1");
  });

  it("maps CLASS_NOT_FOUND to NOT_FOUND for class association actions", async () => {
    const { addCourseClassAssociationAction } = await import("./course-authoring-actions");

    addCourseClassAssociationForTeacherScoped.mockRejectedValueOnce(new Error("CLASS_NOT_FOUND"));

    const result = await addCourseClassAssociationAction({ courseId: "course-1", classId: "class-missing" });

    expect(result).toEqual({
      ok: false,
      error: "NOT_FOUND",
      message: "班级不存在或已被移除。",
    });
  });
});

describe("course lifecycle actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertActiveTeacher.mockResolvedValue({ userId: "teacher-1", schoolIds: ["school-1"] });
  });

  it("publishCourseAction validates courseId before calling DAL", async () => {
    const { publishCourseAction } = await import("./course-authoring-actions");

    const result = await publishCourseAction({});

    expect(result).toEqual({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "输入内容不完整，请检查后再保存。",
    });
    expect(publishCourseForTeacherScoped).not.toHaveBeenCalled();
  });

  it("publishCourseAction updates status and invalidates tags", async () => {
    const { publishCourseAction } = await import("./course-authoring-actions");

    publishCourseForTeacherScoped.mockResolvedValueOnce({
      id: "course-1",
      schoolId: "school-1",
      ownerId: "teacher-1",
      title: "更新后的课程",
      subject: "math",
      grade: "g8",
      status: "published",
      lessonCount: 5,
      classLabels: ["八年级一班"],
      classLinks: [{ id: "class-1", name: "八年级一班" }],
      availableClasses: [],
      enrollmentCount: 30,
      deleteEligibility: { canDelete: false, reasons: [] },
      updatedAt: new Date().toISOString(),
      lessons: [],
    });

    const result = await publishCourseAction({ courseId: "course-1" });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(`expected success, got ${result.error}`);
    }
    expect(result.data).toMatchObject({ id: "course-1", status: "published" });
    expect(updateTag).toHaveBeenCalledWith("teacher-courses:teacher-1");
    expect(updateTag).toHaveBeenCalledWith("course:course-1");
  });

  it("unpublishCourseAction restores draft status and invalidates tags", async () => {
    const { unpublishCourseAction } = await import("./course-authoring-actions");

    unpublishCourseForTeacherScoped.mockResolvedValueOnce({
      id: "course-1",
      schoolId: "school-1",
      ownerId: "teacher-1",
      title: "更新后的课程",
      subject: "math",
      grade: "g8",
      status: "draft",
      lessonCount: 5,
      classLabels: ["八年级一班"],
      classLinks: [{ id: "class-1", name: "八年级一班" }],
      availableClasses: [],
      enrollmentCount: 30,
      deleteEligibility: { canDelete: false, reasons: [] },
      updatedAt: new Date().toISOString(),
      lessons: [],
    });

    const result = await unpublishCourseAction({ courseId: "course-1" });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(`expected success, got ${result.error}`);
    }
    expect(result.data).toMatchObject({ id: "course-1", status: "draft" });
    expect(updateTag).toHaveBeenCalledWith("teacher-courses:teacher-1");
    expect(updateTag).toHaveBeenCalledWith("course:course-1");
  });

  it("archiveCourseAction archives the course and invalidates tags", async () => {
    const { archiveCourseAction } = await import("./course-authoring-actions");

    archiveCourseForTeacherScoped.mockResolvedValueOnce({
      id: "course-1",
      schoolId: "school-1",
      ownerId: "teacher-1",
      title: "更新后的课程",
      subject: "math",
      grade: "g8",
      status: "archived",
      lessonCount: 5,
      classLabels: ["八年级一班"],
      classLinks: [{ id: "class-1", name: "八年级一班" }],
      availableClasses: [],
      enrollmentCount: 30,
      deleteEligibility: { canDelete: true, reasons: [] },
      updatedAt: new Date().toISOString(),
      lessons: [],
    });

    const result = await archiveCourseAction({ courseId: "course-1" });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(`expected success, got ${result.error}`);
    }
    expect(result.data).toMatchObject({ id: "course-1", status: "archived" });
    expect(updateTag).toHaveBeenCalledWith("teacher-courses:teacher-1");
    expect(updateTag).toHaveBeenCalledWith("course:course-1");
  });
});

describe("deleteCourseAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertActiveTeacher.mockResolvedValue({ userId: "teacher-1", schoolIds: ["school-1"] });
  });

  it("returns validation error when delete confirmation is incomplete", async () => {
    const { deleteCourseAction } = await import("./course-authoring-actions");

    const result = await deleteCourseAction({ courseId: "course-1" });

    expect(result).toEqual({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "输入内容不完整，请检查后再保存。",
    });
    expect(deleteCourseForTeacherScoped).not.toHaveBeenCalled();
  });

  it("returns blocked reasons when course deletion is not eligible", async () => {
    const { deleteCourseAction } = await import("./course-authoring-actions");

    const blockedError = new Error("COURSE_DELETE_BLOCKED") as Error & {
      reasons?: Array<{ code: string; message: string; count: number }>;
      userMessage?: string;
    };
    blockedError.userMessage = "课程暂时不能删除，请先处理以下阻断项。";
    blockedError.reasons = [
      {
        code: "COURSE_HAS_LESSONS",
        message: "当前课程下还有 2 个课时，需先清理课时后才能删除课程。",
        count: 2,
      },
    ];
    deleteCourseForTeacherScoped.mockRejectedValueOnce(blockedError);

    const result = await deleteCourseAction({
      courseId: "course-1",
      confirmationText: "七年级科学探究",
    });

    expect(result).toEqual({
      ok: false,
      error: "DELETE_BLOCKED",
      message: "课程暂时不能删除，请先处理以下阻断项。",
      reasons: blockedError.reasons,
    });
  });

  it("deletes eligible courses and invalidates course tags", async () => {
    const { deleteCourseAction } = await import("./course-authoring-actions");

    deleteCourseForTeacherScoped.mockResolvedValueOnce({
      id: "course-1",
      title: "七年级科学探究",
    });

    const result = await deleteCourseAction({
      courseId: "course-1",
      confirmationText: "七年级科学探究",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        id: "course-1",
        title: "七年级科学探究",
      },
    });
    expect(updateTag).toHaveBeenCalledWith("teacher-courses:teacher-1");
    expect(updateTag).toHaveBeenCalledWith("course:course-1");
  });
});
