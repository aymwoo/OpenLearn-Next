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
const findManyLessonStepProgress = vi.fn();
const findManyTaskSubmissions = vi.fn();
const findManyQuizAttempts = vi.fn();
const findManyAttemptFeedback = vi.fn();
const findManyCourseEnrollments = vi.fn();
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
      lessonStepProgress: { findMany: findManyLessonStepProgress },
      taskSubmissions: { findMany: findManyTaskSubmissions },
      quizAttempts: { findMany: findManyQuizAttempts },
      attemptFeedback: { findMany: findManyAttemptFeedback },
      courseEnrollments: { findMany: findManyCourseEnrollments },
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
    findManyLessonStepProgress.mockResolvedValue([]);
    findManyTaskSubmissions.mockResolvedValue([]);
    findManyQuizAttempts.mockResolvedValue([]);
    findManyAttemptFeedback.mockResolvedValue([]);
    findManyCourseEnrollments.mockResolvedValue([]);
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

describe("runtime bridge boundaries", () => {
  it("routes runtime actions through guarded host action wrappers", () => {
    const source = readFileSync("src/lib/dal/classroom.ts", "utf8");

    expect(source).toContain("export async function bootstrapRuntimeSession");
    expect(source).toContain("export async function recordRuntimeInteraction");
    expect(source).toContain("export async function saveRuntimeSessionState");
    expect(source).toContain("export async function submitRuntimeSessionState");
    expect(source).toContain("export async function recordRuntimeTeacherControl");
    expect(source).toContain("invokeRuntimeHostAction");
  });

  it("publishes classroom canonical events through the transport gateway after durable inserts", () => {
    const source = readFileSync("src/lib/dal/classroom.ts", "utf8");

    expect(source).toContain("publishClassroomTransportEvent");
    expect(source).toContain("publishTransportEvent");
    expect(source).toContain('kind: "launched"');
    expect(source).toContain('kind: "active_step_changed"');
    expect(source).toContain('kind: "lock_mode_changed"');
    expect(source).toContain('kind: "slide_changed"');
    expect(source).toContain('kind: "ended"');
  });

  it("keeps runtime submit freshness tied to real classroom and progress truth", () => {
    const source = readFileSync("src/lib/dal/classroom.ts", "utf8");

    expect(source).toContain("recordRuntimeClassroomEvidence");
    expect(source).toContain("sourceType: \"student-submission\"");
    expect(source).toContain("runtimeBridge: true");
  });

  it("keeps the SSE events route on event-stream and records consumer-facing traces", () => {
    const source = readFileSync("src/app/api/classroom/[sessionId]/events/route.ts", "utf8");

    expect(source).toContain('"Content-Type": "text/event-stream; charset=utf-8"');
    expect(source).toContain("recordTransportConsumerTrace");
    expect(source).toContain('traceType: "snapshot"');
    expect(source).toContain('traceType: "keepalive"');
    expect(source).toContain('traceType: "stream_closed"');
    expect(source).toContain('traceType: "stream_failed"');
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
        payloadJson: {
          runtimeSessionId: "runtime-session-1",
          runtimeInstanceId: "runtime-instance-1",
          submittedAt: "2026-05-12T10:03:30.000Z",
          proofSummary: {
            title: "HTML 课件已提交",
            submittedStateLabel: "已完成互动证明",
            bridgeTargets: ["classroom-evidence", "task-submission"],
            inspectorHref: "/settings/labs/runtime-inspector?runtimeSessionId=runtime-session-1",
          },
        },
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
        runtimeProof: expect.objectContaining({
          runtimeSessionId: "runtime-session-1",
          status: "submitted",
          summaryTitle: "HTML 课件已提交",
          summaryLabel: "已完成互动证明",
          inspectorHref: "/settings/labs/runtime-inspector?runtimeSessionId=runtime-session-1",
        }),
      }),
      expect.objectContaining({
        studentId: "student-2",
        progressLabel: "落后于当前环节",
        submissionCount: 0,
        needsAttention: true,
        attentionReasons: expect.arrayContaining(["当前离线", "落后于当前环节", "当前环节未提交"]),
        runtimeProof: null,
      }),
      expect.objectContaining({
        studentId: "student-3",
        progressLabel: "落后于当前环节",
        submissionCount: 0,
        needsAttention: true,
        attentionReasons: expect.arrayContaining(["落后于当前环节", "当前环节未提交"]),
        runtimeProof: null,
      }),
    ]);
  });

  it("keeps classroom action forwarding aligned with the extended runtime proof contract", () => {
    const source = readFileSync("src/actions/classroom-actions.ts", "utf8");

    expect(source).toContain("RuntimeSubmitResultSchema.parse");
    expect(source).toContain("updateTag(cacheTags.classroom(parsed.data.payload.classroomSessionId))");
    expect(source).toContain("updateTag(cacheTags.progress(result.lessonId, result.actorId))");
    expect(source).toContain("updateTag(cacheTags.submission(result.lessonId, result.actorId))");
  });

  it("keeps classroom first-feedback tied to the runtime proof summary and runtimeSessionId", () => {
    const controlPanelSource = readFileSync("src/components/classroom/classroom-control-panel.tsx", "utf8");

    expect(controlPanelSource).toContain("proof first-feedback");
    expect(controlPanelSource).toContain("runtimeSessionId");
    expect(controlPanelSource).toContain("查看运行轨迹");
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
        progressEntries: [],
        evidenceEntries: [],
        evaluationEntries: [],
        unifiedEvidenceItems: [],
        attemptSummary: {
          pendingFeedbackCount: 0,
          latestTaskSubmissions: [],
          latestQuizAttempts: [],
          taskSubmissionHistory: [],
          quizAttemptHistory: [],
        },
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
    expect(source).toContain("unifiedEvidenceItems");
    expect(source).toContain("latestTaskSubmissions");
    expect(source).toContain("latestQuizAttempts");
    expect(source).toContain("feedbackTarget");
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
    const detailTimelineRows = [
      {
        id: "timeline-1",
        sessionId: "session-1",
        studentId: "student-1",
        stepId: "step-2",
        entryType: "intervention_noted",
        actorId: "teacher-1",
        payloadJson: {
          title: "提醒作答",
          body: "已提醒他先完成测验再继续讨论。",
        },
        createdAt: new Date("2026-05-12T10:05:00Z"),
      },
    ];
    findManyClassroomTimeline.mockResolvedValueOnce(detailTimelineRows);
    findManyClassroomTimeline.mockResolvedValueOnce(detailTimelineRows);
    findManyLessonStepProgress.mockResolvedValueOnce([
      {
        id: "progress-1",
        publishedVersionId: "pub-1",
        lessonId: "lesson-in-scope",
        stepId: "step-1",
        studentId: "student-1",
        state: "completed",
        completedAt: new Date("2026-05-12T10:01:00Z"),
        updatedAt: new Date("2026-05-12T10:01:00Z"),
      },
    ]);
    findManyTaskSubmissions.mockResolvedValueOnce([
      {
        id: "attempt-1",
        publishedVersionId: "pub-1",
        lessonId: "lesson-in-scope",
        stepId: "step-2",
        studentId: "student-1",
        attemptNo: 1,
        payloadJson: { body: "提交了讨论记录" },
        isLatest: true,
        createdAt: new Date("2026-05-12T10:03:00Z"),
      },
    ]);
    findManyQuizAttempts.mockResolvedValueOnce([
      {
        id: "quiz-1",
        publishedVersionId: "pub-1",
        lessonId: "lesson-in-scope",
        stepId: "step-2",
        studentId: "student-1",
        attemptNo: 1,
        answerJson: { selectedIndex: 0 },
        outcomeJson: { isCorrect: true },
        isLatest: true,
        createdAt: new Date("2026-05-12T10:04:00Z"),
      },
    ]);
    findManyAttemptFeedback.mockResolvedValueOnce([
      {
        id: "feedback-1",
        targetType: "quiz_attempt",
        targetId: "quiz-1",
        teacherId: "teacher-1",
        studentId: "student-1",
        body: "已完成点评",
        createdAt: new Date("2026-05-12T10:05:00Z"),
        updatedAt: new Date("2026-05-12T10:05:00Z"),
      },
    ]);

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
    expect(detail?.progressEntries).toHaveLength(2);
    expect(detail?.attemptSummary.latestTaskSubmissions).toHaveLength(1);
    expect(detail?.attemptSummary.latestQuizAttempts).toHaveLength(1);
    expect(detail?.attemptSummary.pendingFeedbackCount).toBe(1);
    expect(detail?.unifiedEvidenceItems.some((item) => item.kind === "progress")).toBe(true);
    expect(detail?.unifiedEvidenceItems.some((item) => item.kind === "task")).toBe(true);
    expect(detail?.unifiedEvidenceItems.some((item) => item.kind === "quiz")).toBe(true);
    expect(detail?.unifiedEvidenceItems.some((item) => item.kind === "timeline")).toBe(true);
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

describe("phase 25 session recap contracts", () => {
  it("extends classroom dto/contracts with recap and session history shapes", async () => {
    const classroomDto = await import("@/lib/dto/classroom");

    expect(classroomDto.ClassroomSessionRecapDTOSchema).toBeDefined();
    expect(classroomDto.ClassroomSessionWorkloadDTOSchema).toBeDefined();
    expect(classroomDto.ClassroomConsoleSessionEntryDTOSchema).toBeDefined();
    expect(classroomDto.ClassroomSessionRecapStudentSummaryDTOSchema).toBeDefined();
    expect(classroomDto.ClassroomSessionRecapStepSummaryDTOSchema).toBeDefined();
  });

  it("adds session entries to the classroom console read model for same-domain history reopen", async () => {
    findManyClassroomSessions.mockResolvedValueOnce([
      {
        id: "session-live",
        lessonId: "lesson-in-scope",
        publishedVersionId: "pub-1",
        classId: "class-in-scope",
        teacherId: "teacher-1",
        activeStepId: "step-1",
        locked: false,
        status: "live",
        version: 2,
        updatedAt: new Date("2026-05-14T08:10:00Z"),
        createdAt: new Date("2026-05-14T08:00:00Z"),
        endedAt: null,
      },
      {
        id: "session-ended",
        lessonId: "lesson-in-scope",
        publishedVersionId: "pub-1",
        classId: "class-in-scope",
        teacherId: "teacher-1",
        activeStepId: "step-2",
        locked: true,
        status: "ended",
        version: 4,
        updatedAt: new Date("2026-05-14T09:40:00Z"),
        createdAt: new Date("2026-05-14T09:00:00Z"),
        endedAt: new Date("2026-05-14T09:40:00Z"),
      },
    ]);

    const { getClassroomConsoleDTO } = await import("./classroom");
    const dto = await getClassroomConsoleDTO();

    expect(dto.sessionEntries).toHaveLength(2);
    expect(dto.sessionEntries[0]).toMatchObject({ id: "session-ended", status: "ended" });
    expect(dto.sessionEntries[1]).toMatchObject({ id: "session-live", status: "live" });
  });

  it("builds a recap read model with explicit 未评价 and split workload semantics", async () => {
    findFirstClassroomSessions.mockResolvedValueOnce({
      id: "session-ended",
      lessonId: "lesson-in-scope",
      publishedVersionId: "pub-1",
      classId: "class-in-scope",
      teacherId: "teacher-1",
      activeStepId: "step-2",
      locked: true,
      status: "ended",
      version: 4,
      updatedAt: new Date("2026-05-14T09:40:00Z"),
      createdAt: new Date("2026-05-14T09:00:00Z"),
      endedAt: new Date("2026-05-14T09:40:00Z"),
    });
    findManyClassroomParticipants.mockResolvedValueOnce([
      {
        sessionId: "session-ended",
        studentId: "student-1",
        connectionState: "connected",
        currentStepId: "step-2",
        lastSeenAt: new Date("2026-05-14T09:35:00Z"),
      },
      {
        sessionId: "session-ended",
        studentId: "student-2",
        connectionState: "offline",
        currentStepId: "step-1",
        lastSeenAt: new Date("2026-05-14T09:20:00Z"),
      },
    ]);
    findManyUsers.mockResolvedValueOnce([
      { id: "student-1", name: "李雷" },
      { id: "student-2", name: "韩梅梅" },
    ]);
    findManyClassroomEvidence.mockResolvedValueOnce([
      {
        id: "evidence-1",
        sessionId: "session-ended",
        studentId: "student-1",
        stepId: "step-2",
        sourceType: "teacher-observation",
        evidenceType: "observation",
        payloadJson: {
          kind: "formative-evaluation",
          participationLevel: "active",
          tags: ["主动发言"],
          observationNote: "积极参与课堂讨论。",
        },
        capturedById: "teacher-1",
        createdAt: new Date("2026-05-14T09:30:00Z"),
      },
      {
        id: "evidence-2",
        sessionId: "session-ended",
        studentId: "student-2",
        stepId: "step-2",
        sourceType: "student-quick-response",
        evidenceType: "response",
        payloadJson: { body: "我觉得这首诗写的是春天。" },
        capturedById: "student-2",
        createdAt: new Date("2026-05-14T09:28:00Z"),
      },
    ]);
    findManyClassroomTimeline.mockResolvedValueOnce([
      {
        id: "timeline-1",
        sessionId: "session-ended",
        studentId: "student-2",
        stepId: "step-2",
        entryType: "intervention_noted",
        actorId: "teacher-1",
        payloadJson: { title: "课堂提醒", body: "请继续补充观点。", targetScope: "student", visibility: "teacher-only" },
        createdAt: new Date("2026-05-14T09:29:00Z"),
      },
    ]);
    findManyLessonStepProgress.mockResolvedValueOnce([
      {
        id: 'progress-1',
        publishedVersionId: 'pub-1',
        lessonId: 'lesson-in-scope',
        stepId: 'step-1',
        studentId: 'student-1',
        state: 'completed',
        completedAt: new Date('2026-05-14T09:10:00Z'),
        updatedAt: new Date('2026-05-14T09:10:00Z'),
      },
      {
        id: 'progress-2',
        publishedVersionId: 'pub-1',
        lessonId: 'lesson-in-scope',
        stepId: 'step-2',
        studentId: 'student-1',
        state: 'completed',
        completedAt: new Date('2026-05-14T09:20:00Z'),
        updatedAt: new Date('2026-05-14T09:20:00Z'),
      },
      {
        id: 'progress-3',
        publishedVersionId: 'pub-1',
        lessonId: 'lesson-in-scope',
        stepId: 'step-1',
        studentId: 'student-2',
        state: 'completed',
        completedAt: new Date('2026-05-14T09:12:00Z'),
        updatedAt: new Date('2026-05-14T09:12:00Z'),
      },
    ]);
    findManyTaskSubmissions.mockResolvedValueOnce([]);
    findManyQuizAttempts.mockResolvedValueOnce([
      {
        id: 'quiz-1',
        publishedVersionId: 'pub-1',
        lessonId: 'lesson-in-scope',
        stepId: 'step-2',
        studentId: 'student-2',
        attemptNo: 1,
        answerJson: { optionId: 'a' },
        outcomeJson: { correct: false },
        isLatest: true,
        createdAt: new Date('2026-05-14T09:27:00Z'),
      },
    ]);
    findManyAttemptFeedback.mockResolvedValueOnce([]);
    findManyCourseEnrollments.mockResolvedValueOnce([
      {
        id: 'enrollment-1',
        courseId: 'course-in-scope',
        studentId: 'student-1',
        status: 'active',
        createdAt: new Date('2026-05-01T00:00:00Z'),
      },
      {
        id: 'enrollment-2',
        courseId: 'course-in-scope',
        studentId: 'student-2',
        status: 'active',
        createdAt: new Date('2026-05-01T00:00:00Z'),
      },
    ]);

    const { getClassroomSessionRecapDTO } = await import('./classroom');
    const recap = await getClassroomSessionRecapDTO({ sessionId: 'session-ended', studentId: 'student-2' });

    expect(recap.summary.participationBuckets).toEqual({
      active: 1,
      normal: 0,
      attention: 0,
      unevaluated: 1,
    });
    expect(recap.workload).toEqual({
      followUpSignalsCount: 2,
      pendingFeedbackCount: 1,
    });
    expect(recap.studentSummaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ studentId: 'student-2', participationLabel: '未评价', needsFollowUp: true, pendingFeedbackCount: 1 }),
      ]),
    );
    expect(recap.selectedStudent?.studentId).toBe('student-2');
    expect(recap.selectedStudent?.pendingFeedbackCount).toBe(1);
  });
});

describe("getTeacherRecentSessionTrendDTO", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    assertActiveTeacher.mockResolvedValue({
      userId: "teacher-1",
      schoolIds: ["school-1"],
    });

    findManyClassroomSessions.mockResolvedValue([
      {
        id: "session-4",
        lessonId: "lesson-1",
        publishedVersionId: "pub-1",
        classId: "class-1",
        teacherId: "teacher-1",
        activeStepId: "step-2",
        locked: false,
        status: "ended",
        version: 4,
        updatedAt: new Date("2026-05-14T09:40:00Z"),
        createdAt: new Date("2026-05-14T09:00:00Z"),
        endedAt: new Date("2026-05-14T09:40:00Z"),
      },
      {
        id: "session-3",
        lessonId: "lesson-1",
        publishedVersionId: "pub-1",
        classId: "class-1",
        teacherId: "teacher-1",
        activeStepId: "step-2",
        locked: false,
        status: "ended",
        version: 3,
        updatedAt: new Date("2026-05-13T09:40:00Z"),
        createdAt: new Date("2026-05-13T09:00:00Z"),
        endedAt: new Date("2026-05-13T09:40:00Z"),
      },
      {
        id: "session-2",
        lessonId: "lesson-1",
        publishedVersionId: "pub-1",
        classId: "class-1",
        teacherId: "teacher-1",
        activeStepId: "step-2",
        locked: false,
        status: "ended",
        version: 2,
        updatedAt: new Date("2026-05-12T09:40:00Z"),
        createdAt: new Date("2026-05-12T09:00:00Z"),
        endedAt: new Date("2026-05-12T09:40:00Z"),
      },
      {
        id: "session-1",
        lessonId: "lesson-1",
        publishedVersionId: "pub-1",
        classId: "class-1",
        teacherId: "teacher-1",
        activeStepId: "step-2",
        locked: false,
        status: "ended",
        version: 1,
        updatedAt: new Date("2026-05-11T09:40:00Z"),
        createdAt: new Date("2026-05-11T09:00:00Z"),
        endedAt: new Date("2026-05-11T09:40:00Z"),
      },
      {
        id: "session-0",
        lessonId: "lesson-1",
        publishedVersionId: "pub-1",
        classId: "class-1",
        teacherId: "teacher-1",
        activeStepId: "step-2",
        locked: false,
        status: "ended",
        version: 0,
        updatedAt: new Date("2026-05-10T09:40:00Z"),
        createdAt: new Date("2026-05-10T09:00:00Z"),
        endedAt: new Date("2026-05-10T09:40:00Z"),
      },
    ]);
    findManyLessons.mockResolvedValue([
      { id: "lesson-1", title: "古诗导读", courseId: "course-1" },
    ]);
    findFirstClasses.mockResolvedValue({ id: "class-1", name: "一班" });
    findManyPublishedLessonVersions.mockResolvedValue([
      {
        id: "pub-1",
        snapshotJson: {
          lesson: { title: "古诗导读" },
          steps: [
            {
              id: "step-1",
              lessonId: "lesson-1",
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
              lessonId: "lesson-1",
              type: "quiz",
              title: "随堂测验",
              rank: "b0",
              payload: {
                type: "quiz",
                question: "这首诗主要描写什么季节？",
                options: ["春", "夏", "秋", "冬"],
                correctOptionIndex: 0,
                explanation: "围绕春景意象展开。",
                allowRetry: true,
                retryPolicy: "once",
                revealCorrectAnswer: true,
              },
            },
          ],
          materials: [],
        },
      },
    ]);
    findManyClassroomParticipants.mockResolvedValue([
      { sessionId: "session-4", studentId: "student-1", connectionState: "connected", currentStepId: "step-2", lastSeenAt: new Date("2026-05-14T09:30:00Z") },
      { sessionId: "session-4", studentId: "student-2", connectionState: "connected", currentStepId: "step-2", lastSeenAt: new Date("2026-05-14T09:30:00Z") },
      { sessionId: "session-4", studentId: "student-3", connectionState: "connected", currentStepId: "step-2", lastSeenAt: new Date("2026-05-14T09:30:00Z") },
      { sessionId: "session-3", studentId: "student-1", connectionState: "connected", currentStepId: "step-2", lastSeenAt: new Date("2026-05-13T09:30:00Z") },
      { sessionId: "session-3", studentId: "student-2", connectionState: "connected", currentStepId: "step-2", lastSeenAt: new Date("2026-05-13T09:30:00Z") },
      { sessionId: "session-3", studentId: "student-3", connectionState: "connected", currentStepId: "step-2", lastSeenAt: new Date("2026-05-13T09:30:00Z") },
      { sessionId: "session-2", studentId: "student-1", connectionState: "connected", currentStepId: "step-2", lastSeenAt: new Date("2026-05-12T09:30:00Z") },
      { sessionId: "session-2", studentId: "student-2", connectionState: "connected", currentStepId: "step-2", lastSeenAt: new Date("2026-05-12T09:30:00Z") },
      { sessionId: "session-1", studentId: "student-1", connectionState: "connected", currentStepId: "step-2", lastSeenAt: new Date("2026-05-11T09:30:00Z") },
      { sessionId: "session-1", studentId: "student-2", connectionState: "connected", currentStepId: "step-2", lastSeenAt: new Date("2026-05-11T09:30:00Z") },
      { sessionId: "session-0", studentId: "student-4", connectionState: "connected", currentStepId: "step-2", lastSeenAt: new Date("2026-05-10T09:30:00Z") },
    ]);
    findManyUsers.mockResolvedValue([
      { id: "student-1", name: "李雷" },
      { id: "student-2", name: "韩梅梅" },
      { id: "student-3", name: "王敏" },
      { id: "student-4", name: "赵强" },
    ]);
    findManyLessonStepProgress.mockResolvedValue([
      { id: "progress-1", publishedVersionId: "pub-1", lessonId: "lesson-1", stepId: "step-1", studentId: "student-1", state: "completed", completedAt: new Date("2026-05-14T09:10:00Z"), updatedAt: new Date("2026-05-14T09:10:00Z") },
      { id: "progress-2", publishedVersionId: "pub-1", lessonId: "lesson-1", stepId: "step-2", studentId: "student-1", state: "completed", completedAt: new Date("2026-05-14T09:20:00Z"), updatedAt: new Date("2026-05-14T09:20:00Z") },
      { id: "progress-3", publishedVersionId: "pub-1", lessonId: "lesson-1", stepId: "step-1", studentId: "student-2", state: "completed", completedAt: new Date("2026-05-14T09:11:00Z"), updatedAt: new Date("2026-05-14T09:11:00Z") },
      { id: "progress-4", publishedVersionId: "pub-1", lessonId: "lesson-1", stepId: "step-1", studentId: "student-3", state: "completed", completedAt: new Date("2026-05-14T09:12:00Z"), updatedAt: new Date("2026-05-14T09:12:00Z") },
    ]);
    findManyTaskSubmissions.mockResolvedValue([]);
    findManyQuizAttempts.mockResolvedValue([
      { id: "quiz-1", publishedVersionId: "pub-1", lessonId: "lesson-1", stepId: "step-2", studentId: "student-1", attemptNo: 1, answerJson: { optionId: "a" }, outcomeJson: { correct: true }, isLatest: true, createdAt: new Date("2026-05-14T09:21:00Z") },
      { id: "quiz-2", publishedVersionId: "pub-1", lessonId: "lesson-1", stepId: "step-2", studentId: "student-2", attemptNo: 1, answerJson: { optionId: "b" }, outcomeJson: { correct: false }, isLatest: true, createdAt: new Date("2026-05-14T09:22:00Z") },
    ]);
    findManyAttemptFeedback.mockResolvedValue([
      { id: "feedback-1", studentId: "student-1", targetType: "quiz_attempt", targetId: "quiz-1", feedbackText: "已完成点评", createdAt: new Date("2026-05-14T09:30:00Z") },
    ]);
    findManyClassroomEvidence.mockResolvedValue([
      {
        id: "eval-session-4-student-2",
        sessionId: "session-4",
        studentId: "student-2",
        stepId: "step-2",
        sourceType: "teacher-observation",
        evidenceType: "observation",
        payloadJson: {
          kind: "formative-evaluation",
          participationLevel: "attention",
          tags: ["需要跟进"],
          observationNote: "课堂结束前仍需老师提醒。",
        },
        capturedById: "teacher-1",
        createdAt: new Date("2026-05-14T09:31:00Z"),
      },
      {
        id: "evidence-session-4-student-3",
        sessionId: "session-4",
        studentId: "student-3",
        stepId: "step-2",
        sourceType: "student-quick-response",
        evidenceType: "response",
        payloadJson: { body: "我还需要再想想。" },
        capturedById: "student-3",
        createdAt: new Date("2026-05-14T09:23:00Z"),
      },
      {
        id: "eval-session-3-student-2",
        sessionId: "session-3",
        studentId: "student-2",
        stepId: "step-2",
        sourceType: "teacher-observation",
        evidenceType: "observation",
        payloadJson: {
          kind: "formative-evaluation",
          participationLevel: "attention",
          tags: ["需要跟进"],
          observationNote: "上一节课也需要补充引导。",
        },
        capturedById: "teacher-1",
        createdAt: new Date("2026-05-13T09:31:00Z"),
      },
      {
        id: "evidence-session-2-student-1",
        sessionId: "session-2",
        studentId: "student-1",
        stepId: "step-2",
        sourceType: "student-quick-response",
        evidenceType: "response",
        payloadJson: { body: "我理解了。" },
        capturedById: "student-1",
        createdAt: new Date("2026-05-12T09:23:00Z"),
      },
      {
        id: "evidence-session-1-student-2",
        sessionId: "session-1",
        studentId: "student-2",
        stepId: "step-2",
        sourceType: "student-quick-response",
        evidenceType: "response",
        payloadJson: { body: "还不太确定。" },
        capturedById: "student-2",
        createdAt: new Date("2026-05-11T09:23:00Z"),
      },
    ]);
    findManyClassroomTimeline.mockResolvedValue([]);
  });

  it("returns the latest four ended sessions inside the teacher scope", async () => {
    const { getTeacherRecentSessionTrendDTO } = await import("./classroom");

    const dto = await getTeacherRecentSessionTrendDTO({ classId: "class-1" });

    expect(dto.view).toBe("sessions");
    expect(dto.window.limit).toBe(4);
    expect(dto.sessionPoints).toHaveLength(4);
    expect(dto.sessionPoints.map((point) => point.sessionId)).toEqual([
      "session-4",
      "session-3",
      "session-2",
      "session-1",
    ]);
  });

  it("ranks students deterministically by repeated follow-up, unevaluated, and missing submissions", async () => {
    const { getTeacherRecentSessionTrendDTO } = await import("./classroom");

    const dto = await getTeacherRecentSessionTrendDTO({ classId: "class-1" });

    expect(dto.studentSummaries.slice(0, 3).map((student) => student.studentName)).toEqual([
      "韩梅梅",
      "王敏",
      "李雷",
    ]);
    expect(dto.studentSummaries[0]).toMatchObject({
      studentName: "韩梅梅",
      needsFollowUpSessions: 3,
      primarySignalLabel: "需关注",
    });
    expect(dto.studentSummaries[1]).toMatchObject({
      studentName: "王敏",
      unevaluatedSessions: 2,
      missingSubmissionSessions: 2,
      primarySignalLabel: "未评价",
    });
  });

  it("returns selected anomaly detail with recap and review href pointers", async () => {
    const { getTeacherRecentSessionTrendDTO } = await import("./classroom");

    const dto = await getTeacherRecentSessionTrendDTO({
      classId: "class-1",
      sessionId: "session-4",
    });

    expect(dto.selectedSessionId).toBe("session-4");
    expect(dto.selectedDetail?.session.primaryRecapHref).toBe("/classroom?sessionId=session-4&recapTab=students");
    expect(dto.selectedDetail?.session.secondaryReviewHref).toBe("/teacher/review?lessonId=lesson-1&filter=needs_feedback");
    expect(dto.selectedDetail?.impactedStudents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          studentName: "韩梅梅",
          primaryRecapHref: "/classroom?sessionId=session-4&recapTab=students&studentId=student-2",
          secondaryReviewHref: "/teacher/review?lessonId=lesson-1&filter=needs_feedback&studentId=student-2",
        }),
      ]),
    );

    const source = readFileSync("src/lib/dal/classroom.ts", "utf8");
    expect(source).toContain("export async function getTeacherRecentSessionTrendDTO");
    expect(source).not.toContain("analyticsSnapshot");
    expect(source).not.toContain("insert(classroomAnalytics");
    expect(source).not.toContain("update(classroomAnalytics");
  });
});
