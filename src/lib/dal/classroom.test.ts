import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyClassroomSessions = vi.fn();
const findManyLessons = vi.fn();
const findManyCourses = vi.fn();
const findManyClasses = vi.fn();
const findManyCourseClasses = vi.fn();
const findManyPublishedLessonVersions = vi.fn();
const assertActiveTeacher = vi.fn();
const getCurrentUserDTO = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  db: {
    query: {
      classroomSessions: { findMany: findManyClassroomSessions },
      lessons: { findMany: findManyLessons },
      courses: { findMany: findManyCourses },
      classes: { findMany: findManyClasses },
      courseClasses: { findMany: findManyCourseClasses },
      publishedLessonVersions: { findMany: findManyPublishedLessonVersions },
    },
  },
}));

vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher,
}));

vi.mock("@/lib/dal/auth", () => ({
  getCurrentUserDTO,
}));

describe("getClassroomConsoleDTO", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    assertActiveTeacher.mockResolvedValue({
      userId: "teacher-1",
      schoolIds: ["school-1"],
    });
    findManyClassroomSessions.mockResolvedValue([]);
    findManyCourses.mockResolvedValue([
      { id: "course-in-scope", schoolId: "school-1", title: "语文课程" },
      { id: "course-out-of-scope", schoolId: "school-2", title: "外校课程" },
    ]);
    findManyLessons.mockResolvedValue([
      {
        id: "lesson-in-scope",
        title: "古诗导读",
        courseId: "course-in-scope",
        status: "published",
        publishedVersionId: "pub-1",
      },
    ]);
    findManyClasses.mockResolvedValue([
      { id: "class-in-scope", name: "一班", schoolId: "school-1" },
    ]);
    findManyCourseClasses.mockResolvedValue([
      { courseId: "course-in-scope", classId: "class-in-scope" },
      { courseId: "course-in-scope", classId: "class-out-of-scope" },
      { courseId: "course-out-of-scope", classId: "class-in-scope" },
    ]);
    findManyPublishedLessonVersions.mockResolvedValue([
      {
        id: "pub-1",
        snapshotJson: {
          lesson: { title: "古诗导读" },
          steps: [
            {
              id: "step-1",
              lessonId: "lesson-in-scope",
              type: "content",
              title: "开场导入",
              rank: "a0",
              payload: {
                type: "content",
                title: "开场导入",
                body: "老师先带学生整体感知文本。",
                teacherNotes: "提示",
                materialRefs: [],
              },
            },
          ],
          materials: [],
        },
      },
    ]);
  });

  it("only returns launchable lessons and classes inside the active teacher school scope", async () => {
    const { getClassroomConsoleDTO } = await import("./classroom");

    const dto = await getClassroomConsoleDTO();

    expect(findManyCourses).toHaveBeenCalledTimes(1);
    expect(findManyLessons).toHaveBeenCalledTimes(1);
    expect(findManyClasses).toHaveBeenCalledTimes(1);
    expect(findManyCourseClasses).toHaveBeenCalledTimes(1);
    expect(dto.publishedLessons).toHaveLength(1);
    expect(dto.publishedLessons[0]?.id).toBe("lesson-in-scope");
    expect(dto.publishedLessons[0]?.classes).toEqual([
      { id: "class-in-scope", name: "一班" },
    ]);
    expect(dto.publishedLessons[0]?.classes.some((clazz) => clazz.id === "class-out-of-scope")).toBe(false);
    expect(findManyCourses).toHaveBeenCalledWith(expect.objectContaining({ where: expect.anything() }));
    expect(findManyLessons).toHaveBeenCalledWith(expect.objectContaining({ where: expect.anything() }));
    expect(findManyClasses).toHaveBeenCalledWith(expect.objectContaining({ where: expect.anything() }));
  });

  it("prefers structured teaching design metadata in launch preview", async () => {
    findManyPublishedLessonVersions.mockResolvedValueOnce([
      {
        id: "pub-1",
        snapshotJson: {
          lesson: { title: "古诗导读" },
          steps: [
            {
              id: "step-1",
              lessonId: "lesson-in-scope",
              type: "task",
              title: "分组实验",
              rank: "a0",
              payload: {
                type: "task",
                prompt: "完成实验记录",
                submissionType: "text",
                materialRefs: [{ title: "实验单", kind: "worksheet" }],
                teachingDesign: {
                  activityIntent: "practice",
                  estimatedMinutes: 18,
                  activityMode: "group",
                  evidenceExpectation: {
                    evidenceType: "artifact",
                    prompt: "提交实验记录单",
                    required: true,
                    checklist: ["包含实验结论"],
                    tags: ["实验"],
                    studentVisibility: "teacher-only",
                  },
                },
              },
            },
          ],
          materials: [{ stepId: "step-1", title: "实验箱", kind: "kit" }],
        },
      },
    ]);

    const { getClassroomConsoleDTO } = await import("./classroom");
    const dto = await getClassroomConsoleDTO();
    const step = dto.publishedLessons[0]?.launchPreview.steps[0];

    expect(step?.family).toBe("练习 / group");
    expect(step?.estimatedMinutes).toBe(18);
    expect(step?.summary).toContain("完成实验记录");
    expect(step?.evidenceSummary).toBe("需提交：提交实验记录单");
    expect(step?.teachingDesignStatus).toBe("explicit");
    expect(step?.needsTeachingDesignRefinement).toBe(false);
    expect(step?.teachingDesignFallbackReason).toBeNull();
    expect(step?.activityIntent).toBe("practice");
    expect(step?.activityMode).toBe("group");
    expect(step?.materialCues).toEqual(["实验箱", "实验单"]);
  });

  it("falls back safely when published snapshot has no teaching design metadata", async () => {
    const { getClassroomConsoleDTO } = await import("./classroom");

    const dto = await getClassroomConsoleDTO();
    const step = dto.publishedLessons[0]?.launchPreview.steps[0];

    expect(step?.family).toBe("教师讲授");
    expect(step?.estimatedMinutes).toBe(12);
    expect(step?.teachingDesignStatus).toBe("inferred");
    expect(step?.needsTeachingDesignRefinement).toBe(true);
    expect(step?.teachingDesignFallbackReason).toBe("legacy-content-default");
    expect(step?.evidenceSummary).toContain("默认推断");
  });

  it("continues to build launch preview only from published snapshots", async () => {
    const source = (await import("node:fs")).readFileSync("src/lib/dal/classroom.ts", "utf8");

    expect(source).toContain("const publishedVersion = publishedVersionMap.get(lesson.publishedVersionId!)");
    expect(source).toContain("const snapshot = parseSnapshot(publishedVersion?.snapshotJson)");
    expect(source).not.toContain("getLessonEditorDTO");
    expect(source).not.toContain("draft");
  });
});
