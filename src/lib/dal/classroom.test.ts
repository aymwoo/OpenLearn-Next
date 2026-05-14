import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyClassroomSessions = vi.fn();
const findFirstClassroomSessions = vi.fn();
const findManyLessons = vi.fn();
const findFirstLessons = vi.fn();
const findManyCourses = vi.fn();
const findManyClasses = vi.fn();
const findFirstClasses = vi.fn();
const findManyCourseClasses = vi.fn();
const findManyPublishedLessonVersions = vi.fn();
const findFirstPublishedLessonVersions = vi.fn();
const findManyClassroomParticipants = vi.fn();
const findFirstClassroomParticipants = vi.fn();
const findManyUsers = vi.fn();
const findFirstUsers = vi.fn();
const findManyClassroomEvents = vi.fn();
const findManyClassroomTimeline = vi.fn();
const findManyClassroomEvidence = vi.fn();
const findFirstClassMembers = vi.fn();
const findManyClassMembers = vi.fn();
const insertValues = vi.fn();
const insertMock = vi.fn();
const assertActiveTeacher = vi.fn();
const getCurrentUserDTO = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  db: {
    query: {
      classroomSessions: { findMany: findManyClassroomSessions, findFirst: findFirstClassroomSessions },
      lessons: { findMany: findManyLessons, findFirst: findFirstLessons },
      courses: { findMany: findManyCourses },
      classes: { findMany: findManyClasses, findFirst: findFirstClasses },
      courseClasses: { findMany: findManyCourseClasses },
      publishedLessonVersions: { findMany: findManyPublishedLessonVersions, findFirst: findFirstPublishedLessonVersions },
      classroomParticipants: { findMany: findManyClassroomParticipants, findFirst: findFirstClassroomParticipants },
      users: { findMany: findManyUsers, findFirst: findFirstUsers },
      classroomEvents: { findMany: findManyClassroomEvents },
      classroomTimeline: { findMany: findManyClassroomTimeline },
      classroomEvidence: { findMany: findManyClassroomEvidence },
      classMembers: { findFirst: findFirstClassMembers, findMany: findManyClassMembers },
    },
    insert: insertMock,
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

    insertValues.mockReturnValue({
      onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      returning: vi.fn(),
    });
    insertMock.mockReturnValue({
      values: insertValues,
    });

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
    findManyClassMembers.mockResolvedValue([
      {
        id: "member-1",
        classId: "class-in-scope",
        userId: "student-1",
        role: "student",
      },
    ]);
    findFirstClassroomSessions.mockResolvedValue({
      id: "session-1",
      lessonId: "lesson-in-scope",
      publishedVersionId: "pub-1",
      classId: "class-in-scope",
      teacherId: "teacher-1",
      activeStepId: "step-1",
      locked: false,
      status: "live",
      version: 3,
      updatedAt: new Date("2026-05-12T10:05:00Z"),
    });
    findFirstLessons.mockResolvedValue({
      id: "lesson-in-scope",
      title: "古诗导读",
    });
    findFirstClasses.mockResolvedValue({
      id: "class-in-scope",
      name: "一班",
    });
    findFirstPublishedLessonVersions.mockResolvedValue({
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
          {
            id: "step-2",
            lessonId: "lesson-in-scope",
            type: "task",
            title: "小组讨论",
            rank: "b0",
            payload: {
              type: "task",
              prompt: "讨论古诗中的意象",
              submissionType: "text",
              materialRefs: [],
            },
          },
        ],
        materials: [],
      },
    });
    findManyClassroomParticipants.mockResolvedValue([
      {
        sessionId: "session-1",
        studentId: "student-1",
        connectionState: "connected",
        currentStepId: "step-1",
        lastSeenAt: new Date("2026-05-12T10:03:00Z"),
      },
    ]);
    findManyUsers.mockResolvedValue([
      { id: "student-1", name: "李雷" },
    ]);
    findFirstUsers.mockResolvedValue({ id: "student-1", name: "李雷" });
    findManyClassroomEvents.mockResolvedValue([]);
    findManyClassroomTimeline.mockResolvedValue([]);
    findManyClassroomEvidence.mockResolvedValue([]);
    findFirstClassroomParticipants.mockResolvedValue({
      sessionId: "session-1",
      studentId: "student-1",
      connectionState: "connected",
      currentStepId: "step-1",
      lastSeenAt: new Date("2026-05-12T10:03:00Z"),
    });
    findFirstClassMembers.mockResolvedValue({
      id: "member-1",
      classId: "class-in-scope",
      userId: "student-1",
      role: "student",
    });
    getCurrentUserDTO.mockResolvedValue({
      id: "teacher-1",
    });
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
      {
        id: "class-in-scope",
        name: "一班",
        studentCount: 1,
        rosterSummary: {
          classId: "class-in-scope",
          className: "一班",
          studentCount: 1,
          launchScopeLabel: "整班启动",
          note: "本次会按整班名单同步进入课堂；如需调整名册，请先回到班级相关页面处理。",
        },
      },
    ]);
    expect(dto.publishedLessons[0]?.classes.some((clazz) => clazz.id === "class-out-of-scope")).toBe(false);
    expect(findManyCourses).toHaveBeenCalledWith(expect.objectContaining({ where: expect.anything() }));
    expect(findManyLessons).toHaveBeenCalledWith(expect.objectContaining({ where: expect.anything() }));
    expect(findManyClasses).toHaveBeenCalledWith(expect.objectContaining({ where: expect.anything() }));
  });

  it("adds narrow launch blockers only for missing launchable rosters while keeping inferred cues non-blocking", async () => {
    findManyClassMembers.mockResolvedValueOnce([]);

    const { getClassroomConsoleDTO } = await import("./classroom");
    const dto = await getClassroomConsoleDTO();

    expect(dto.publishedLessons[0]?.launchReadiness.blockingIssues).toEqual([
      expect.objectContaining({ code: "NO_LAUNCHABLE_CLASSES" }),
    ]);
    expect(dto.publishedLessons[0]?.launchReadiness.attentionIssues).toEqual([
      expect.objectContaining({ code: "TEACHING_DESIGN_INFERRED" }),
    ]);
    expect(dto.publishedLessons[0]?.launchReadiness.advisoryIssues).toEqual([
      expect.objectContaining({ code: "MATERIAL_CUES_MISSING" }),
      expect.objectContaining({ code: "EVIDENCE_CUES_REVIEW" }),
    ]);
    expect(dto.publishedLessons[0]?.launchReadiness.attentionIssues).not.toEqual([
      expect.objectContaining({ code: "TEACHING_DESIGN_NEEDS_REFINEMENT", stepId: "step-1" }),
      expect.objectContaining({ code: "TEACHING_DESIGN_INFERRED", stepId: "step-1" }),
    ]);
  });

  it("keeps launch readiness blockers narrow when published snapshots only need preparation cues", async () => {
    const { getClassroomConsoleDTO } = await import("./classroom");
    const dto = await getClassroomConsoleDTO();

    expect(dto.publishedLessons[0]?.launchReadiness.blockingIssues).toEqual([]);
    expect(dto.publishedLessons[0]?.launchReadiness.attentionIssues.map((issue) => issue.code)).toContain("TEACHING_DESIGN_INFERRED");
    expect(dto.publishedLessons[0]?.launchReadiness.advisoryIssues.map((issue) => issue.code)).toContain("MATERIAL_CUES_MISSING");
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

  it("fills partial teaching-design data from published snapshots without dropping the launch preview", async () => {
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
              title: "实验记录",
              rank: "a0",
              payload: {
                type: "task",
                prompt: "完成实验记录",
                submissionType: "text",
                materialRefs: [],
                teachingDesign: {
                  activityIntent: "apply",
                  evidenceExpectation: {
                    prompt: "提交实验单照片",
                  },
                },
              },
            },
          ],
          materials: [],
        },
      },
    ]);

    const { getClassroomConsoleDTO } = await import("./classroom");
    const dto = await getClassroomConsoleDTO();
    const step = dto.publishedLessons[0]?.launchPreview.steps[0];

    expect(step?.activityIntent).toBe("apply");
    expect(step?.activityMode).toBe("independent");
    expect(step?.estimatedMinutes).toBe(15);
    expect(step?.evidenceSummary).toContain("提交实验单照片");
    expect(step?.teachingDesignStatus).toBe("needs-refinement");
    expect(step?.needsTeachingDesignRefinement).toBe(true);
    expect(step?.teachingDesignFallbackReason).toBe("partial-teaching-design");
  });

  it("continues to build launch preview only from published snapshots", async () => {
    const source = (await import("node:fs")).readFileSync("src/lib/dal/classroom.ts", "utf8");

    expect(source).toContain("const publishedVersion = publishedVersionMap.get(lesson.publishedVersionId!)");
    expect(source).toContain("const snapshot = parseSnapshot(publishedVersion?.snapshotJson)");
    expect(source).not.toContain("getLessonEditorDTO");
    expect(source).not.toContain("draft");
  });

  it("reads markdown step payloads and material cues from published snapshots", async () => {
    const source = (await import("node:fs")).readFileSync("src/lib/dal/classroom.ts", "utf8");

    expect(source).toContain("const snapshot = parseSnapshot(publishedVersion?.snapshotJson)");
    expect(source).toContain("const payload = lessonStepPayloadSchema.parse(step.payload)");
    expect(source).toContain("const stepMaterials = (snapshot.materials ?? [])");
    expect(source).toContain("const payloadMaterials = (\"materialRefs\" in payload ? payload.materialRefs : [])");
  });
});

describe("classroom evidence foundation contracts", () => {
  it("defines durable classroom evidence and timeline tables with session-owned cascade boundaries", async () => {
    const source = readFileSync("src/db/schema.ts", "utf8");

    expect(source).toContain("export const classroomEvidence = sqliteTable(");
    expect(source).toContain("export const classroomTimeline = sqliteTable(");
    expect(source).toContain("references(() => classroomSessions.id, { onDelete: \"cascade\" })");
    expect(source).toContain("references(() => lessonSteps.id, { onDelete: \"cascade\" })");
    expect(source).toContain("references(() => users.id, { onDelete: \"cascade\" })");
  });

  it("exposes typed evidence, intervention, and timeline DTO schemas", async () => {
    const classroomDto = await import("@/lib/dto/classroom");

    expect(classroomDto.RecordClassroomEvidenceInputSchema).toBeDefined();
    expect(classroomDto.RecordClassroomInterventionInputSchema).toBeDefined();
    expect(classroomDto.ClassroomTimelineEntryDTOSchema).toBeDefined();
    expect(classroomDto.RecordClassroomInterventionInputSchema.safeParse({
      sessionId: "session-1",
      title: "课堂提醒",
      body: "提醒学生回到当前讨论任务。",
      targetScope: "student",
      studentId: "student-1",
      stepId: "step-1",
    }).success).toBe(true);
    expect(classroomDto.RecordClassroomEvidenceInputSchema.safeParse({
      sessionId: "session-1",
      sourceType: "student-submission",
      evidenceType: "submission",
      payload: {},
    }).success).toBe(false);
  });

  it("writes presence changes, evidence capture, and interventions through durable timeline helpers", () => {
    const source = readFileSync("src/lib/dal/classroom.ts", "utf8");

    expect(source).toContain("export async function recordClassroomEvidence");
    expect(source).toContain("export async function recordClassroomIntervention");
    expect(source).toContain("assertSessionStepInPublishedSnapshot");
    expect(source).toContain("getPublishedSessionSteps");
    expect(source).toContain("parseSnapshotSteps(snapshot, session.lessonId)");
    expect(source).toContain("insert(classroomEvidence)");
    expect(source).toContain("insert(classroomTimeline)");
    expect(source).toContain("entryType: \"presence_changed\"");
    expect(source).toContain("entryType: \"evidence_captured\"");
    expect(source).toContain("entryType: \"intervention_noted\"");
    expect(source).toContain('payload.sourceType.startsWith("student-")');
    expect(source).toContain("CLASSROOM_EVIDENCE_UNAUTHORIZED");
    expect(source).not.toContain("db.query.lessonSteps.findFirst({ where: eq(lessonSteps.id, payload.stepId) })");
  });
});

describe("getClassroomSnapshotDTO teacher timeline", () => {
  it("returns a typed teacher timeline for intervention entries on the current session", async () => {
    findManyClassroomTimeline.mockResolvedValueOnce([
      {
        id: "timeline-1",
        sessionId: "session-1",
        studentId: "student-1",
        stepId: "step-2",
        entryType: "intervention_noted",
        actorId: "teacher-1",
        payloadJson: {
          title: "提醒聚焦",
          body: "请先回到当前讨论问题，再整理发言。",
          targetScope: "student",
          visibility: "teacher-only",
        },
        createdAt: new Date("2026-05-12T10:04:00Z"),
      },
    ]);

    const { getClassroomSnapshotDTO } = await import("./classroom");
    const dto = await getClassroomSnapshotDTO({ sessionId: "session-1" });

    expect(dto.teacherTimeline).toHaveLength(1);
    expect(dto.teacherTimeline[0]).toMatchObject({
      id: "timeline-1",
      title: "提醒聚焦",
      body: "请先回到当前讨论问题，再整理发言。",
      targetScope: "student",
      visibility: "teacher-only",
      studentId: "student-1",
      studentName: "李雷",
      stepId: "step-2",
      stepTitle: "小组讨论",
      targetLabel: "李雷",
    });
    expect(dto.teacherTimeline[0]?.createdAt).toBe("2026-05-12T10:04:00.000Z");
  });

  it("only keeps intervention entries from the requested session", async () => {
    findManyClassroomTimeline.mockResolvedValueOnce([
      {
        id: "timeline-1",
        sessionId: "session-1",
        studentId: "student-1",
        stepId: "step-1",
        entryType: "intervention_noted",
        actorId: "teacher-1",
        payloadJson: {
          title: "课堂提醒",
          body: "请回到当前文本。",
          targetScope: "class",
          visibility: "teacher-only",
        },
        createdAt: new Date("2026-05-12T10:04:00Z"),
      },
      {
        id: "timeline-2",
        sessionId: "session-2",
        studentId: null,
        stepId: null,
        entryType: "intervention_noted",
        actorId: "teacher-2",
        payloadJson: {
          title: "其他课堂",
          body: "不应混入当前课堂。",
          targetScope: "class",
          visibility: "teacher-only",
        },
        createdAt: new Date("2026-05-12T10:01:00Z"),
      },
      {
        id: "timeline-3",
        sessionId: "session-1",
        studentId: "student-1",
        stepId: "step-1",
        entryType: "presence_changed",
        actorId: "student-1",
        payloadJson: {
          connectionState: "connected",
        },
        createdAt: new Date("2026-05-12T10:02:00Z"),
      },
    ]);

    const { getClassroomSnapshotDTO } = await import("./classroom");
    const dto = await getClassroomSnapshotDTO({ sessionId: "session-1" });

    expect(dto.teacherTimeline).toHaveLength(1);
    expect(dto.teacherTimeline[0]?.id).toBe("timeline-1");
    expect(dto.teacherTimeline[0]?.title).toBe("课堂提醒");
  });

  it("returns an empty teacher timeline to non-teacher consumers", async () => {
    getCurrentUserDTO.mockResolvedValueOnce({ id: "student-1" });
    getCurrentUserDTO.mockResolvedValueOnce({ id: "student-1" });
    findManyClassroomTimeline.mockResolvedValueOnce([
      {
        id: "timeline-1",
        sessionId: "session-1",
        studentId: "student-1",
        stepId: "step-2",
        entryType: "intervention_noted",
        actorId: "teacher-1",
        payloadJson: {
          title: "提醒聚焦",
          body: "请先回到当前讨论问题，再整理发言。",
          targetScope: "student",
          visibility: "teacher-only",
        },
        createdAt: new Date("2026-05-12T10:04:00Z"),
      },
    ]);

    const { getClassroomSnapshotDTO } = await import("./classroom");
    const dto = await getClassroomSnapshotDTO({ sessionId: "session-1" });

    expect(dto.teacherTimeline).toEqual([]);
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it("builds runtime monitoring summary and participant attention signals from session facts", async () => {
    findFirstClassroomSessions.mockResolvedValueOnce({
      id: "session-1",
      lessonId: "lesson-in-scope",
      publishedVersionId: "pub-1",
      classId: "class-in-scope",
      teacherId: "teacher-1",
      activeStepId: "step-2",
      locked: false,
      status: "live",
      version: 3,
      updatedAt: new Date("2026-05-12T10:05:00Z"),
    });
    findManyClassroomParticipants.mockResolvedValueOnce([
      {
        sessionId: "session-1",
        studentId: "student-1",
        connectionState: "connected",
        currentStepId: "step-2",
        lastSeenAt: new Date("2026-05-12T10:03:00Z"),
      },
      {
        sessionId: "session-1",
        studentId: "student-2",
        connectionState: "offline",
        currentStepId: "step-1",
        lastSeenAt: new Date("2026-05-12T10:01:00Z"),
      },
      {
        sessionId: "session-1",
        studentId: "student-3",
        connectionState: "connected",
        currentStepId: "step-1",
        lastSeenAt: new Date("2026-05-12T10:02:30Z"),
      },
    ]);
    findManyUsers.mockResolvedValueOnce([
      { id: "student-1", name: "李雷" },
      { id: "student-2", name: "韩梅梅" },
      { id: "student-3", name: "小明" },
    ]);
    findManyClassroomEvidence.mockResolvedValueOnce([
      {
        id: "evidence-1",
        sessionId: "session-1",
        studentId: "student-1",
        stepId: "step-2",
        sourceType: "student-submission",
        evidenceType: "submission",
        payloadJson: {},
        capturedById: "student-1",
        createdAt: new Date("2026-05-12T10:03:30Z"),
      },
      {
        id: "evidence-2",
        sessionId: "session-1",
        studentId: "student-1",
        stepId: "step-2",
        sourceType: "student-quick-response",
        evidenceType: "response",
        payloadJson: {},
        capturedById: "student-1",
        createdAt: new Date("2026-05-12T10:04:00Z"),
      },
      {
        id: "evidence-3",
        sessionId: "session-1",
        studentId: "student-3",
        stepId: "step-1",
        sourceType: "student-submission",
        evidenceType: "submission",
        payloadJson: {},
        capturedById: "student-3",
        createdAt: new Date("2026-05-12T10:02:00Z"),
      },
    ]);

    const { getClassroomSnapshotDTO } = await import("./classroom");
    const dto = await getClassroomSnapshotDTO({ sessionId: "session-1" });

    expect(dto.monitoringSummary).toEqual({
      connectedCount: 2,
      reconnectingCount: 0,
      offlineCount: 1,
      needsAttentionCount: 2,
      submittedCount: 1,
    });
    expect(dto.participants).toEqual([
      expect.objectContaining({
        studentId: "student-1",
        progressLabel: "跟随当前环节",
        submissionCount: 2,
        needsAttention: false,
        attentionReasons: [],
      }),
      expect.objectContaining({
        studentId: "student-2",
        progressLabel: "落后于当前环节",
        submissionCount: 0,
        needsAttention: true,
        attentionReasons: expect.arrayContaining(["当前离线", "落后于当前环节", "当前环节未提交"]),
      }),
      expect.objectContaining({
        studentId: "student-3",
        progressLabel: "落后于当前环节",
        submissionCount: 0,
        needsAttention: true,
        attentionReasons: expect.arrayContaining(["落后于当前环节", "当前环节未提交"]),
      }),
    ]);
  });

  it("marks participants ahead of the teacher step without creating new evaluation tables", async () => {
    findManyClassroomParticipants.mockResolvedValueOnce([
      {
        sessionId: "session-1",
        studentId: "student-1",
        connectionState: "reconnecting",
        currentStepId: "step-2",
        lastSeenAt: new Date("2026-05-12T10:03:00Z"),
      },
    ]);
    findManyUsers.mockResolvedValueOnce([{ id: "student-1", name: "李雷" }]);
    findFirstClassroomSessions.mockResolvedValueOnce({
      id: "session-1",
      lessonId: "lesson-in-scope",
      publishedVersionId: "pub-1",
      classId: "class-in-scope",
      teacherId: "teacher-1",
      activeStepId: "step-1",
      locked: false,
      status: "live",
      version: 3,
      updatedAt: new Date("2026-05-12T10:05:00Z"),
    });
    findManyClassroomEvidence.mockResolvedValueOnce([]);

    const { getClassroomSnapshotDTO } = await import("./classroom");
    const dto = await getClassroomSnapshotDTO({ sessionId: "session-1" });

    expect(dto.participants[0]).toMatchObject({
      progressLabel: "已进入后续环节",
      submissionCount: 0,
      needsAttention: true,
      attentionReasons: expect.arrayContaining(["正在重新连接"]),
    });

    const source = readFileSync("src/lib/dal/classroom.ts", "utf8");
    expect(source).toContain('eq(classroomEvidence.sourceType, "student-quick-response")');
    expect(source).toContain('eq(classroomEvidence.sourceType, "student-submission")');
    expect(source).not.toContain("classroomGradebook");
  });
});

describe("formative evaluation contracts", () => {
  it("locks participation levels and evaluation tags to the fixed phase 24 model", async () => {
    const classroomDto = await import("@/lib/dto/classroom");

    expect(classroomDto.ClassroomParticipationLevelSchema.options).toEqual([
      "active",
      "normal",
      "attention",
    ]);
    expect(classroomDto.ClassroomEvaluationTagSchema.options).toEqual([
      "主动发言",
      "专注跟进",
      "协作支持",
      "表达清晰",
      "需要提醒",
      "需要跟进",
    ]);
    expect(
      classroomDto.RecordStudentFormativeEvaluationInputSchema.safeParse({
        sessionId: "session-1",
        studentId: "student-1",
        participationLevel: "active",
        tags: ["主动发言", "表达清晰"],
        observationNote: "能主动回应老师追问。",
      }).success,
    ).toBe(true);
    expect(
      classroomDto.RecordStudentFormativeEvaluationInputSchema.safeParse({
        sessionId: "session-1",
        studentId: "student-1",
        participationLevel: "excellent",
        tags: ["主动发言"],
        observationNote: "超出范围的档位",
      }).success,
    ).toBe(false);
  });

  it("writes teacher-scoped formative evaluation through classroom evidence with an explicit payload marker", () => {
    const source = readFileSync("src/lib/dal/classroom.ts", "utf8");

    expect(source).toContain("export async function recordStudentFormativeEvaluation");
    expect(source).toContain("getTeacherSessionScope(payload.sessionId)");
    expect(source).toContain("sourceType: \"teacher-observation\"");
    expect(source).toContain("evidenceType: \"observation\"");
    expect(source).toContain('kind: "formative-evaluation"');
    expect(source).toContain("participationLevel: payload.participationLevel");
    expect(source).toContain("tags: payload.tags");
    expect(source).toContain("observationNote: payload.observationNote");
  });

  it("lists session-scoped student formative evaluation entries newest first", () => {
    const source = readFileSync("src/lib/dal/classroom.ts", "utf8");

    expect(source).toContain("export async function listStudentFormativeEvaluationEntries");
    expect(source).toContain("eq(classroomEvidence.sessionId, input.sessionId)");
    expect(source).toContain("eq(classroomEvidence.studentId, input.studentId)");
    expect(source).toContain('payload.kind === "formative-evaluation"');
    expect(source).toContain("capturedById: evidence.capturedById");
    expect(source).toContain("createdAt: toIso(evidence.createdAt)");
    expect(source).toContain(".sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))");
  });
});

describe("same-route classroom student detail contracts", () => {
  it("extends the classroom page search params with same-route student detail state", async () => {
    const source = readFileSync("src/app/(classroom)/classroom/page.tsx", "utf8");

    expect(source).toContain("studentId?: string");
    expect(source).toContain("detailTab?: 'evidence' | 'evaluation'");
    expect(source).toContain("getClassroomStudentDetailDTO");
    expect(source).not.toContain("/teacher/review");
  });

  it("defines the fixed same-route student detail tab and dto schemas", async () => {
    const classroomDto = await import("@/lib/dto/classroom");

    expect(classroomDto.ClassroomStudentDetailTabSchema.options).toEqual([
      "evidence",
      "evaluation",
    ]);
    expect(
      classroomDto.ClassroomStudentDetailDTOSchema.safeParse({
        studentId: "student-1",
        studentName: "李雷",
        evidenceEntries: [],
        evaluationEntries: [],
        latestParticipationLevel: "normal",
      }).success,
    ).toBe(true);
  });

  it("adds a teacher-scoped classroom detail read model without routing through review dal", () => {
    const source = readFileSync("src/lib/dal/classroom.ts", "utf8");

    expect(source).toContain("export async function getClassroomStudentDetailDTO");
    expect(source).toContain("if (!input.studentId)");
    expect(source).toContain("return null");
    expect(source).toContain('payload.kind === "formative-evaluation"');
    expect(source).toContain("evaluationEntries");
    expect(source).toContain("evidenceEntries");
    expect(source).not.toContain("getTeacherLessonReviewDTO");
    expect(source).not.toContain("@/lib/dal/learning");
  });

  it("returns monitoring summary fields and splits formative evaluation history from classroom evidence", async () => {
    findFirstClassroomSessions.mockResolvedValueOnce({
      id: "session-1",
      lessonId: "lesson-in-scope",
      publishedVersionId: "pub-1",
      classId: "class-in-scope",
      teacherId: "teacher-1",
      activeStepId: "step-2",
      locked: false,
      status: "live",
      version: 3,
      updatedAt: new Date("2026-05-12T10:05:00Z"),
    });
    const detailEvidenceRows = [
      {
        id: "evidence-1",
        sessionId: "session-1",
        studentId: "student-1",
        stepId: "step-2",
        sourceType: "student-submission",
        evidenceType: "submission",
        payloadJson: { note: "提交了讨论记录" },
        capturedById: "student-1",
        createdAt: new Date("2026-05-12T10:03:00Z"),
      },
      {
        id: "evaluation-1",
        sessionId: "session-1",
        studentId: "student-1",
        stepId: null,
        sourceType: "teacher-observation",
        evidenceType: "observation",
        payloadJson: {
          kind: "formative-evaluation",
          participationLevel: "attention",
          tags: ["需要跟进"],
          observationNote: "需要老师跟进。",
        },
        capturedById: "teacher-1",
        createdAt: new Date("2026-05-12T10:04:00Z"),
      },
    ];
    findManyClassroomEvidence.mockResolvedValueOnce(detailEvidenceRows);
    findManyClassroomEvidence.mockResolvedValueOnce(detailEvidenceRows);

    const { getClassroomStudentDetailDTO, getClassroomSnapshotDTO } = await import("./classroom");

    const snapshot = await getClassroomSnapshotDTO({ sessionId: "session-1" });
    const detail = await getClassroomStudentDetailDTO({
      sessionId: "session-1",
      studentId: "student-1",
      detailTab: "evaluation",
    });

    expect(snapshot.monitoringSummary).toMatchObject({
      connectedCount: 1,
      needsAttentionCount: 1,
      submittedCount: 1,
    });
    expect(detail).toMatchObject({
      studentId: "student-1",
      latestParticipationLevel: "attention",
    });
    expect(detail?.evaluationEntries).toHaveLength(1);
    expect(detail?.evidenceEntries).toHaveLength(1);
    expect(detail?.evaluationEntries[0]?.observationNote).toBe("需要老师跟进。");
    expect(detail?.evidenceEntries[0]?.payload).toMatchObject({ note: "提交了讨论记录" });
  });

  it("returns null for stale same-route student detail params when the student is no longer in the session", async () => {
    const { getClassroomStudentDetailDTO } = await import("./classroom");

    findFirstClassroomParticipants.mockResolvedValueOnce(null);

    const detail = await getClassroomStudentDetailDTO({
      sessionId: "session-1",
      studentId: "student-missing",
      detailTab: "evidence",
    });

    expect(detail).toBeNull();
  });
});
