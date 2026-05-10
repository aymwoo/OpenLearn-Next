import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstCourses = vi.fn();
const findManyCourses = vi.fn();
const findFirstLessons = vi.fn();
const findManyLessons = vi.fn();
const findFirstLessonSteps = vi.fn();
const findManyLessonSteps = vi.fn();
const findManyLessonMaterials = vi.fn();
const findFirstPublishedLessonVersions = vi.fn();
const findManyCourseEnrollments = vi.fn();
const findManyCourseClasses = vi.fn();
const findManyClasses = vi.fn();
const findManyClassMembers = vi.fn();
const findManyPluginRegistrations = vi.fn();
const selectCourseClassNames = vi.fn();
const insertReturning = vi.fn();
const insertValues = vi.fn(() => ({ returning: insertReturning }));
const updateReturning = vi.fn();
const updateWhere = vi.fn(() => ({ returning: updateReturning }));
const updateSet = vi.fn(() => ({ where: updateWhere }));
const getCurrentUserDTO = vi.fn();
const getUserMembershipsDTO = vi.fn();

const ownedCourse = {
  id: "course-owned",
  schoolId: "school-1",
  ownerId: "teacher-1",
  title: "我的课程",
  subject: "科学",
  grade: "七年级",
  status: "draft",
  updatedAt: new Date("2026-05-09T08:00:00.000Z"),
};

const ownedLesson = {
  id: "lesson-owned",
  courseId: "course-owned",
  title: "我的课时",
  objective: "观察现象",
  status: "draft",
  revision: 1,
  publishedVersionId: null,
  updatedAt: new Date("2026-05-09T08:30:00.000Z"),
};

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  db: {
    insert: () => ({ values: insertValues }),
    update: () => ({ set: updateSet }),
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => selectCourseClassNames(),
        }),
      }),
    }),
    query: {
      courses: { findFirst: findFirstCourses, findMany: findManyCourses },
      lessons: { findFirst: findFirstLessons, findMany: findManyLessons },
      lessonSteps: { findFirst: findFirstLessonSteps, findMany: findManyLessonSteps },
      courseEnrollments: { findMany: findManyCourseEnrollments },
      courseClasses: { findMany: findManyCourseClasses },
      classes: { findMany: findManyClasses },
      classMembers: { findMany: findManyClassMembers },
      lessonMaterials: { findMany: findManyLessonMaterials },
      publishedLessonVersions: { findFirst: findFirstPublishedLessonVersions },
      pluginRegistrations: { findMany: findManyPluginRegistrations },
    },
  },
}));

vi.mock("@/lib/dal/auth", () => ({
  getCurrentUserDTO,
}));

vi.mock("@/lib/dal/membership", () => ({
  getUserMembershipsDTO,
}));

const source = readFileSync("src/lib/dal/lesson-authoring.ts", "utf8");

describe("lesson authoring DAL boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    getCurrentUserDTO.mockResolvedValue({ id: "teacher-1" });
    getUserMembershipsDTO.mockResolvedValue([
      { schoolId: "school-1", role: "teacher", status: "active" },
    ]);

    findManyCourses.mockResolvedValue([
      ownedCourse,
      {
        id: "course-foreign",
        schoolId: "school-1",
        ownerId: "teacher-2",
        title: "同校其他教师课程",
        subject: "历史",
        grade: "七年级",
        status: "published",
        updatedAt: new Date("2026-05-09T09:00:00.000Z"),
      },
    ]);

    findFirstCourses.mockResolvedValue(ownedCourse);
    findFirstLessons.mockResolvedValue(ownedLesson);
    findManyLessons.mockResolvedValue([ownedLesson]);

    findManyLessonSteps.mockResolvedValue([{ id: "step-1", lessonId: "lesson-owned", archivedAt: null }]);
    findFirstLessonSteps.mockResolvedValue({ id: "step-last", lessonId: "lesson-owned", rank: "a0" });
    findManyLessonMaterials.mockResolvedValue([]);
    findFirstPublishedLessonVersions.mockResolvedValue(null);
    findManyCourseEnrollments.mockResolvedValue([{ id: "enrollment-1", courseId: "course-owned" }]);
    findManyCourseClasses.mockResolvedValue([{ courseId: "course-owned", classId: "class-1" }]);
    findManyClasses.mockResolvedValue([{ id: "class-1", schoolId: "school-1", name: "七年级一班" }]);
    findManyClassMembers.mockResolvedValue([{ id: "member-1", classId: "class-1", role: "student" }]);
    findManyPluginRegistrations.mockResolvedValue([
      {
        id: "plugin-1",
        schoolId: "school-1",
        enabled: true,
        killSwitchEnabled: false,
        manifestJson: { builtIn: true },
      },
    ]);
    selectCourseClassNames.mockResolvedValue([{ className: "七年级一班" }]);
    insertReturning.mockResolvedValue([
      {
        id: "step-created",
        lessonId: "lesson-owned",
        updatedAt: new Date("2026-05-10T08:45:00.000Z"),
      },
    ]);
    updateReturning.mockResolvedValue([]);
  });

  it("is server-only and enforces teacher authorization", () => {
    expect(source.trimStart().startsWith('import "server-only";')).toBe(true);
    expect(source).toContain("assertActiveTeacher");
    expect(source).toContain("getUserMembershipsDTO");
    expect(source).toContain("TEACHER_AUTH_REQUIRED");
  });

  it("validates payloads and DTOs", () => {
    expect(source).toContain("lessonStepPayloadSchema.parse");
    expect(source).toContain("LessonEditorDTOSchema.parse");
  });

  it("uses rank reorder and stable published snapshots", () => {
    expect(source).toContain("createRankBetween");
    expect(source).toContain("publishedLessonVersions");
    expect(source).toContain("snapshotJson");
  });

  it("persists updated lesson step payloads and bumps lesson revision", () => {
    expect(source).toContain("export async function updateLessonStep");
    expect(source).toContain("lessonStepPayloadSchema.parse(input.payload)");
    expect(source).toContain("revision: lesson.revision + 1");
    expect(source).toContain("await getScopedStep");
    expect(source).toContain("getLessonEditorDTO");
  });

  it("enforces course ownership for lesson authoring reads and writes", () => {
    expect(source).toContain("course.ownerId !== scope.userId");
    expect(source).toContain("courseRows.filter((course) => course.ownerId === scope.userId)");
  });

  it("resolves editor classes from linked class ids instead of class name matching", () => {
    expect(source).toContain("async function getCourseClassDtos");
    expect(source).toContain("db.query.courseClasses.findMany");
    expect(source).not.toContain("courseDto.classLabels.includes(classDto.name)");
  });

  it("preserves built-in provenance when adding a built-in teaching step", async () => {
    const { addLessonStep } = await import("./lesson-authoring");

    await addLessonStep({
      lessonId: "lesson-owned",
      type: "content",
      title: "教师讲授",
      payload: {
        type: "content",
        title: "教师讲授",
        body: "讲授牛顿第一定律",
        materialRefs: [],
        builtInSource: {
          pluginId: "plugin-1",
          builtInKey: "directInstruction",
          pluginName: "教师讲授",
        },
      },
    });

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        payloadJson: expect.objectContaining({
          builtInSource: {
            pluginId: "plugin-1",
            builtInKey: "directInstruction",
            pluginName: "教师讲授",
          },
        }),
      })
    );
  });

  it("returns structured readiness blocking issues for draft completeness and plugin availability", async () => {
    const dal = (await import("./lesson-authoring")) as Record<string, unknown>;
    expect(typeof dal.getLessonPublishReadinessDTO).toBe("function");

    findFirstLessons.mockResolvedValueOnce({
      ...ownedLesson,
      title: "",
      objective: "",
    });
    findManyLessonSteps.mockResolvedValueOnce([]);

    const missingFields = await (dal.getLessonPublishReadinessDTO as (input: { lessonId: string }) => Promise<{
      canPublish: boolean;
      blockingIssues: Array<{ code: string }>;
    }> )({ lessonId: "lesson-owned" });

    expect(missingFields.canPublish).toBe(false);
    expect(missingFields.blockingIssues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "LESSON_TITLE_REQUIRED",
        "LESSON_OBJECTIVE_REQUIRED",
        "NO_ACTIVE_STEPS",
      ])
    );

    findFirstLessons.mockResolvedValueOnce(ownedLesson);
    findManyLessonSteps.mockResolvedValueOnce([
      {
        id: "step-invalid",
        lessonId: "lesson-owned",
        type: "content",
        title: "坏数据",
        rank: "a0",
        payloadJson: { type: "content", title: "", body: "" },
        archivedAt: null,
        updatedAt: new Date("2026-05-09T08:31:00.000Z"),
      },
      {
        id: "step-built-in",
        lessonId: "lesson-owned",
        type: "content",
        title: "教师讲授",
        rank: "a1",
        payloadJson: {
          type: "content",
          title: "教师讲授",
          body: "讲授内容",
          materialRefs: [],
          builtInSource: {
            pluginId: "plugin-missing",
            builtInKey: "directInstruction",
            pluginName: "教师讲授",
          },
        },
        archivedAt: null,
        updatedAt: new Date("2026-05-09T08:32:00.000Z"),
      },
    ]);
    findManyPluginRegistrations.mockResolvedValueOnce([
      {
        id: "plugin-1",
        schoolId: "school-1",
        enabled: true,
        killSwitchEnabled: false,
        manifestJson: { builtIn: true },
      },
    ]);

    const readiness = await (dal.getLessonPublishReadinessDTO as (input: { lessonId: string }) => Promise<{
      canPublish: boolean;
      blockingIssues: Array<{ code: string; stepId?: string | null }>;
    }> )({ lessonId: "lesson-owned" });

    expect(readiness.canPublish).toBe(false);
    expect(readiness.blockingIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "STEP_PAYLOAD_INVALID", stepId: "step-invalid" }),
        expect.objectContaining({ code: "BUILT_IN_PLUGIN_UNAVAILABLE", stepId: "step-built-in" }),
      ])
    );
  });

  it("builds a teacher preview DTO with ordered active steps, materials, and built-in source labels", async () => {
    const dal = (await import("./lesson-authoring")) as Record<string, unknown>;
    expect(typeof dal.getTeacherLessonPreviewDTO).toBe("function");

    findManyLessonSteps.mockResolvedValueOnce([
      { id: "step-built-in", lessonId: "lesson-owned", archivedAt: null },
      { id: "step-task", lessonId: "lesson-owned", archivedAt: null },
    ]);
    findManyLessonSteps.mockResolvedValueOnce([
      {
        id: "step-archived",
        lessonId: "lesson-owned",
        type: "task",
        title: "已归档",
        rank: "a0",
        payloadJson: {
          type: "task",
          prompt: "旧任务",
          submissionType: "text",
          materialRefs: [],
        },
        archivedAt: new Date("2026-05-09T08:20:00.000Z"),
        updatedAt: new Date("2026-05-09T08:20:00.000Z"),
      },
      {
        id: "step-built-in",
        lessonId: "lesson-owned",
        type: "content",
        title: "教师讲授",
        rank: "a1",
        payloadJson: {
          type: "content",
          title: "教师讲授",
          body: "讲授内容",
          materialRefs: [],
          builtInSource: {
            pluginId: "plugin-1",
            builtInKey: "directInstruction",
            pluginName: "教师讲授",
          },
        },
        archivedAt: null,
        updatedAt: new Date("2026-05-09T08:21:00.000Z"),
      },
      {
        id: "step-task",
        lessonId: "lesson-owned",
        type: "task",
        title: "课堂任务",
        rank: "a2",
        payloadJson: {
          type: "task",
          prompt: "记录你的发现",
          submissionType: "text",
          materialRefs: [],
        },
        archivedAt: null,
        updatedAt: new Date("2026-05-09T08:22:00.000Z"),
      },
    ]);
    findManyLessonMaterials.mockResolvedValueOnce([
      {
        id: "material-1",
        lessonId: "lesson-owned",
        stepId: null,
        title: "牛顿第一定律讲义",
        kind: "link",
        url: "https://example.com/lesson.pdf",
        note: "课前阅读",
      },
    ]);

    const preview = await (dal.getTeacherLessonPreviewDTO as (input: { lessonId: string }) => Promise<{
      lesson: { id: string };
      steps: Array<{ id: string; builtInSourceLabel: string | null }>;
      materials: Array<{ id: string }>;
    }> )({ lessonId: "lesson-owned" });

    expect(preview.lesson.id).toBe("lesson-owned");
    expect(preview.steps.map((step) => step.id)).toEqual(["step-built-in", "step-task"]);
    expect(preview.steps[0]?.builtInSourceLabel).toBe("教师讲授");
    expect(preview.materials.map((material) => material.id)).toEqual(["material-1"]);
  });

  it("returns only teacher-owned courses and lessons in the authoring overview", async () => {
    const { getTeacherAuthoringOverview } = await import("./lesson-authoring");

    const overview = await getTeacherAuthoringOverview();

    expect(overview.courses.map((course) => course.id)).toEqual(["course-owned"]);
    expect(overview.lessons.map((lesson) => lesson.id)).toEqual(["lesson-owned"]);
  });
});
