import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  classes,
  classMembers,
  classroomEvents,
  classroomEvidence,
  classroomParticipants,
  classroomSessions,
  classroomTimeline,
  courses,
  courseClasses,
  lessons,
  lessonSteps,
  publishedLessonVersions,
  users,
} from "@/db/schema";
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import {
  ClassroomConsoleDTOSchema,
  ClassroomActionResultDTOSchema,
  ClassroomEvidenceDTOSchema,
  ClassroomSnapshotDTOSchema,
  ClassroomTimelineEntryDTOSchema,
  RecordClassroomEvidenceInputSchema,
  RecordClassroomInterventionInputSchema,
  ChangeClassroomSlideInputSchema,
  LaunchClassroomInputSchema,
  ChangeClassroomStepInputSchema,
  ChangeClassroomModeInputSchema,
  RefreshClassroomSnapshotInputSchema,
  EndClassroomInputSchema,
} from "@/lib/dto/classroom";
import {
  lessonStepPayloadSchema,
  type TeachingDesign,
} from "@/lib/dto/lesson-authoring";
import { resolveTeachingDesignInput } from "@/lib/teaching-design";

function toIso(value: Date | number | null | undefined) {
  if (!value) {
    return new Date(0).toISOString();
  }
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

type PublishedSnapshot = {
  lesson?: { id?: string; title?: string; objective?: string; };
  course?: { title?: string; };
  steps?: Array<{ id: string; lessonId: string; type: string; title: string; rank: string; payload: unknown; }>;
  materials?: Array<{
    id?: string;
    stepId?: string | null;
    title?: string;
    kind?: string;
    url?: string | null;
    note?: string | null;
  }>;
};

type ClassroomSlideState = {
  stepId: string;
  slideIndex: number;
};

function parseSnapshot(value: unknown): PublishedSnapshot {
  return (value ?? {}) as PublishedSnapshot;
}

async function getLatestSlideState(sessionId: string): Promise<ClassroomSlideState | null> {
  const events = await db.query.classroomEvents.findMany({
    where: eq(classroomEvents.sessionId, sessionId),
    orderBy: (event, { desc }) => [desc(event.version)],
  });

  const slideEvent = events.find((event) => event.type === "slide_changed");
  if (!slideEvent) {
    return null;
  }

  const payload = slideEvent.payloadJson as Record<string, unknown>;
  if (typeof payload.stepId !== "string" || typeof payload.slideIndex !== "number") {
    return null;
  }

  return {
    stepId: payload.stepId,
    slideIndex: payload.slideIndex,
  };
}

function parseSnapshotSteps(snapshot: PublishedSnapshot, fallbackLessonId: string) {
  return [...(snapshot.steps ?? [])]
    .sort((a, b) => a.rank.localeCompare(b.rank))
    .map((step) => {
      const payload = lessonStepPayloadSchema.parse(step.payload);

      return {
        id: step.id,
        lessonId: step.lessonId ?? fallbackLessonId,
        type: payload.type,
        title: step.title,
        rank: step.rank,
        payload,
      };
    });
}

const STEP_FAMILY_LABELS: Record<"content" | "task" | "quiz", string> = {
  content: "教师讲授",
  task: "学生任务",
  quiz: "课堂测验",
};

const TEACHING_INTENT_LABELS: Record<TeachingDesign["activityIntent"], string> = {
  explain: "讲授",
  practice: "练习",
  check: "检测",
  discuss: "讨论",
  reflect: "反思",
  apply: "应用",
};

const STEP_DEFAULT_MINUTES: Record<"content" | "task" | "quiz", number> = {
  content: 12,
  task: 15,
  quiz: 8,
};

function summarizeText(value: string | undefined, fallback: string) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return fallback;
  }

  return normalized.length > 56 ? `${normalized.slice(0, 56).trim()}…` : normalized;
}

function getEstimatedMinutes(payload: ReturnType<typeof lessonStepPayloadSchema.parse>) {
  if (payload.type === "content") {
    return payload.teacherNotes ? 15 : STEP_DEFAULT_MINUTES.content;
  }

  if (payload.type === "task") {
    return payload.allowRetry ? 15 : 12;
  }

  return payload.options.length > 3 ? 10 : STEP_DEFAULT_MINUTES.quiz;
}

function resolveTeachingDesign(payload: ReturnType<typeof lessonStepPayloadSchema.parse>) {
  return resolveTeachingDesignInput(payload.type, payload.teachingDesign);
}

function buildEvidenceSummary(teachingDesign: TeachingDesign, inferred: boolean) {
  const prefix = teachingDesign.evidenceExpectation.required ? "需提交" : "观察记录";
  const fallback = inferred ? "（默认推断）" : "";

  return `${prefix}：${teachingDesign.evidenceExpectation.prompt}${fallback}`;
}

function getMaterialCues(snapshot: PublishedSnapshot, stepId: string, payload: ReturnType<typeof lessonStepPayloadSchema.parse>) {
  const stepMaterials = (snapshot.materials ?? [])
    .filter((material) => !material.stepId || material.stepId === stepId)
    .map((material) => material.title?.trim() || material.kind?.trim())
    .filter((value): value is string => Boolean(value));

  const payloadMaterials = ("materialRefs" in payload ? payload.materialRefs : [])
    .map((material) => material.title?.trim() || material.kind?.trim())
    .filter((value): value is string => Boolean(value));

  return [...new Set([...stepMaterials, ...payloadMaterials])].slice(0, 3);
}

function buildLaunchPreview(snapshot: PublishedSnapshot, fallbackLessonId: string, fallbackLessonTitle: string) {
  const steps = parseSnapshotSteps(snapshot, fallbackLessonId).map((step, index) => {
    const resolution = resolveTeachingDesign(step.payload);
    const family = resolution.teachingDesignStatus === "explicit"
      ? `${TEACHING_INTENT_LABELS[resolution.teachingDesign.activityIntent]} / ${resolution.teachingDesign.activityMode}`
      : STEP_FAMILY_LABELS[step.type];
    let summary = "课堂将按已发布步骤继续推进。";

    if (step.payload.type === "content") {
      summary = summarizeText(step.payload.body, "课堂将从讲授内容与教师提示开始。");
    } else if (step.payload.type === "task") {
      summary = summarizeText(step.payload.prompt, "学生会根据任务提示完成本环节。");
    } else {
      summary = summarizeText(step.payload.question, "学生会围绕核心问题完成随堂测验。");
    }

    return {
      id: step.id,
      order: index + 1,
      title: step.title,
      family,
      summary,
      activityIntent: resolution.teachingDesign.activityIntent,
      activityMode: resolution.teachingDesign.activityMode,
      estimatedMinutes: resolution.teachingDesign.estimatedMinutes,
      evidenceSummary: buildEvidenceSummary(resolution.teachingDesign, resolution.teachingDesignStatus !== "explicit"),
      teachingDesignStatus: resolution.teachingDesignStatus,
      needsTeachingDesignRefinement: resolution.needsTeachingDesignRefinement,
      teachingDesignFallbackReason: resolution.teachingDesignFallbackReason,
      materialCues: getMaterialCues(snapshot, step.id, step.payload),
    };
  });

  return {
    lessonId: fallbackLessonId,
    lessonTitle: snapshot.lesson?.title ?? fallbackLessonTitle,
    totalEstimatedMinutes: steps.reduce((total, step) => total + step.estimatedMinutes, 0),
    stepCount: steps.length,
    steps,
  };
}

function buildLaunchRosterSummary(input: {
  classId: string;
  className: string;
  studentCount: number;
}) {
  return {
    classId: input.classId,
    className: input.className,
    studentCount: input.studentCount,
    launchScopeLabel: "整班启动",
    note: "本次会按整班名单同步进入课堂；如需调整名册，请先回到班级相关页面处理。",
  };
}

function buildLaunchReadiness(input: {
  preview: ReturnType<typeof buildLaunchPreview>;
  launchableClassCount: number;
}) {
  const blockingIssues = input.launchableClassCount === 0
    ? [{
        code: "NO_LAUNCHABLE_CLASSES" as const,
        message: "当前课时还没有可直接开课的整班名单，请先确认已绑定班级且名单中有学生。",
      }]
    : [];

  const inferredSteps = input.preview.steps.filter((step) => step.teachingDesignStatus === "inferred");
  const refinementSteps = input.preview.steps.filter((step) => step.teachingDesignStatus === "needs-refinement");
  const missingMaterialSteps = input.preview.steps.filter((step) => step.materialCues.length === 0);
  const evidenceReviewSteps = input.preview.steps.filter((step) => step.teachingDesignStatus !== "explicit");

  const attentionIssues = [] as Array<{
    code: "TEACHING_DESIGN_NEEDS_REFINEMENT" | "TEACHING_DESIGN_INFERRED";
    message: string;
    stepId?: string | null;
  }>;
  const advisoryIssues = [] as Array<{
    code: "MATERIAL_CUES_MISSING" | "EVIDENCE_CUES_REVIEW";
    message: string;
    stepId?: string | null;
  }>;

  if (refinementSteps.length > 0) {
    attentionIssues.push({
      code: "TEACHING_DESIGN_NEEDS_REFINEMENT",
      message: `${refinementSteps.length} 个环节的教学设计仍需完善，建议开课前再确认活动方式与时间分配。`,
      stepId: refinementSteps[0]?.id ?? null,
    });
  }

  if (inferredSteps.length > 0) {
    attentionIssues.push({
      code: "TEACHING_DESIGN_INFERRED",
      message: `${inferredSteps.length} 个环节仍在使用默认推断，不会阻断开课，但建议教师先过一遍课堂节奏。`,
      stepId: inferredSteps[0]?.id ?? null,
    });
  }

  if (missingMaterialSteps.length > 0) {
    advisoryIssues.push({
      code: "MATERIAL_CUES_MISSING",
      message: `${missingMaterialSteps.length} 个环节还没有明确材料提示，建议开课前补齐讲义、链接或设备准备。`,
      stepId: missingMaterialSteps[0]?.id ?? null,
    });
  }

  if (evidenceReviewSteps.length > 0) {
    advisoryIssues.push({
      code: "EVIDENCE_CUES_REVIEW",
      message: `${evidenceReviewSteps.length} 个环节的采证提醒仍需教师确认，建议开课前明确要观察或收集什么。`,
      stepId: evidenceReviewSteps[0]?.id ?? null,
    });
  }

  return {
    blockingIssues,
    attentionIssues,
    advisoryIssues,
  };
}

function parseInterventionPayload(payload: unknown) {
  const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};

  return {
    title: typeof record.title === "string" && record.title.trim().length > 0 ? record.title.trim() : "课堂干预",
    body: typeof record.body === "string" ? record.body.trim() : "",
    targetScope: record.targetScope === "student" ? "student" as const : "class" as const,
    visibility: record.visibility === "teacher-only" ? "teacher-only" as const : "teacher-only" as const,
  };
}

function buildTeacherTimeline(input: {
  timelineRows: Array<{
    id: string;
    sessionId: string;
    studentId: string | null;
    stepId: string | null;
    entryType: "presence_changed" | "evidence_captured" | "intervention_noted";
    actorId: string;
    payloadJson: unknown;
    createdAt: Date | number | null | undefined;
  }>;
  participants: Array<{ studentId: string; studentName: string }>;
  steps: Array<{ id: string; title: string }>;
}) {
  const studentNameMap = new Map(input.participants.map((participant) => [participant.studentId, participant.studentName]));
  const stepTitleMap = new Map(input.steps.map((step) => [step.id, step.title]));

  return input.timelineRows
    .filter((entry) => entry.sessionId === input.timelineRows[0]?.sessionId || input.timelineRows.length === 0)
    .filter((entry) => entry.entryType === "intervention_noted")
    .map((entry) => {
      const payload = parseInterventionPayload(entry.payloadJson);
      const studentName = entry.studentId ? studentNameMap.get(entry.studentId) ?? null : null;
      const stepTitle = entry.stepId ? stepTitleMap.get(entry.stepId) ?? null : null;
      const targetLabel = payload.targetScope === "student"
        ? studentName ?? "指定学生"
        : "全班";

      return {
        id: entry.id,
        sessionId: entry.sessionId,
        studentId: entry.studentId,
        studentName,
        stepId: entry.stepId,
        stepTitle,
        entryType: "intervention_noted" as const,
        title: payload.title,
        body: payload.body,
        targetScope: payload.targetScope,
        targetLabel,
        visibility: payload.visibility,
        actorId: entry.actorId,
        createdAt: toIso(entry.createdAt),
      };
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

async function getSessionWithLessonSteps(sessionId: string) {
  const session = await db.query.classroomSessions.findFirst({ where: eq(classroomSessions.id, sessionId) });
  if (!session) {
    throw new Error("CLASSROOM_ENDED");
  }

  return session;
}

async function getStudentClassMember(classId: string, studentId: string) {
  return db.query.classMembers.findFirst({
    where: and(eq(classMembers.classId, classId), eq(classMembers.userId, studentId), eq(classMembers.role, "student")),
  });
}

async function ensureSessionStudentParticipant(sessionId: string, studentId: string) {
  const participant = await db.query.classroomParticipants.findFirst({
    where: and(eq(classroomParticipants.sessionId, sessionId), eq(classroomParticipants.studentId, studentId)),
  });

  if (!participant) {
    throw new Error("CLASSROOM_PARTICIPANT_REQUIRED");
  }

  return participant;
}

async function getTeacherSessionScope(sessionId: string) {
  const scope = await assertActiveTeacher();
  const session = await getSessionWithLessonSteps(sessionId);

  if (session.teacherId !== scope.userId) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  return { scope, session };
}

async function createClassroomTimelineEntry(input: {
  sessionId: string;
  studentId?: string | null;
  stepId?: string | null;
  entryType: "presence_changed" | "evidence_captured" | "intervention_noted";
  actorId: string;
  payload: Record<string, unknown>;
}) {
  const [entry] = await db.insert(classroomTimeline).values({
    sessionId: input.sessionId,
    studentId: input.studentId ?? null,
    stepId: input.stepId ?? null,
    entryType: input.entryType,
    actorId: input.actorId,
    payloadJson: input.payload,
  }).returning();

  return ClassroomTimelineEntryDTOSchema.parse({
    id: entry.id,
    sessionId: entry.sessionId,
    studentId: entry.studentId,
    stepId: entry.stepId,
    entryType: entry.entryType,
    actorId: entry.actorId,
    payload: entry.payloadJson,
    createdAt: toIso(entry.createdAt),
  });
}

export async function ensureClassroomParticipant(input: { sessionId: string; studentId: string }) {
  const session = await getSessionWithLessonSteps(input.sessionId);
  const currentUser = await getCurrentUserDTO();

  if (!currentUser || currentUser.id !== input.studentId) {
    throw new Error("CLASSROOM_PARTICIPANT_REQUIRED");
  }

  const classMember = await getStudentClassMember(session.classId, input.studentId);
  if (!classMember) {
    throw new Error("CLASSROOM_PARTICIPANT_REQUIRED");
  }

  await db.insert(classroomParticipants).values({
    sessionId: session.id,
    studentId: input.studentId,
    classMemberId: classMember.id,
    connectionState: "reconnecting",
    currentStepId: session.activeStepId,
  }).onConflictDoNothing();
}

export async function updateClassroomParticipantConnection(input: {
  sessionId: string;
  studentId: string;
  connectionState: "connected" | "reconnecting" | "offline";
  currentStepId?: string | null;
}) {
  const session = await getSessionWithLessonSteps(input.sessionId);
  const currentUser = await getCurrentUserDTO();

  if (!currentUser || currentUser.id !== input.studentId) {
    throw new Error("CLASSROOM_PARTICIPANT_REQUIRED");
  }

  await ensureClassroomParticipant({ sessionId: input.sessionId, studentId: input.studentId });

  const existingParticipant = await db.query.classroomParticipants.findFirst({
    where: and(eq(classroomParticipants.sessionId, session.id), eq(classroomParticipants.studentId, input.studentId)),
  });

  await db.update(classroomParticipants)
    .set({
      connectionState: input.connectionState,
      lastSeenAt: new Date(),
      ...(input.currentStepId ? { currentStepId: input.currentStepId } : {}),
    })
    .where(and(eq(classroomParticipants.sessionId, session.id), eq(classroomParticipants.studentId, input.studentId)));

  const connectionChanged = existingParticipant?.connectionState !== input.connectionState;
  const nextStepId = input.currentStepId ?? existingParticipant?.currentStepId ?? null;
  const stepChanged = nextStepId !== (existingParticipant?.currentStepId ?? null);

  if (connectionChanged || stepChanged) {
    await createClassroomTimelineEntry({
      sessionId: session.id,
      studentId: input.studentId,
      stepId: nextStepId,
      entryType: "presence_changed",
      actorId: input.studentId,
      payload: {
        previousConnectionState: existingParticipant?.connectionState ?? null,
        connectionState: input.connectionState,
        previousStepId: existingParticipant?.currentStepId ?? null,
        currentStepId: nextStepId,
      },
    });
  }
}

export async function recordClassroomEvidence(input: unknown) {
  const payload = RecordClassroomEvidenceInputSchema.parse(input);
  const user = await getCurrentUserDTO();

  if (!user?.id) {
    throw new Error("CLASSROOM_PARTICIPANT_REQUIRED");
  }

  const session = await getSessionWithLessonSteps(payload.sessionId);

  if (payload.sourceType.startsWith("student-")) {
    if (payload.studentId !== user.id) {
      throw new Error("CLASSROOM_EVIDENCE_UNAUTHORIZED");
    }

    await ensureSessionStudentParticipant(session.id, user.id);
  } else if (session.teacherId !== user.id) {
    throw new Error("CLASSROOM_EVIDENCE_UNAUTHORIZED");
  }

  if (payload.studentId && !payload.sourceType.startsWith("student-")) {
    await ensureSessionStudentParticipant(session.id, payload.studentId);
  }

  if (payload.stepId) {
    const step = await db.query.lessonSteps.findFirst({ where: eq(lessonSteps.id, payload.stepId) });
    if (!step || step.lessonId !== session.lessonId) {
      throw new Error("CLASSROOM_STEP_NOT_IN_LESSON");
    }
  }

  const [evidence] = await db.insert(classroomEvidence).values({
    sessionId: session.id,
    studentId: payload.studentId ?? null,
    stepId: payload.stepId ?? null,
    sourceType: payload.sourceType,
    evidenceType: payload.evidenceType,
    payloadJson: payload.payload,
    capturedById: user.id,
  }).returning();

  await createClassroomTimelineEntry({
    sessionId: session.id,
    studentId: payload.studentId ?? null,
    stepId: payload.stepId ?? null,
    entryType: "evidence_captured",
    actorId: user.id,
    payload: {
      evidenceId: evidence.id,
      sourceType: payload.sourceType,
      evidenceType: payload.evidenceType,
    },
  });

  return ClassroomEvidenceDTOSchema.parse({
    id: evidence.id,
    sessionId: evidence.sessionId,
    studentId: evidence.studentId,
    stepId: evidence.stepId,
    sourceType: evidence.sourceType,
    evidenceType: evidence.evidenceType,
    payload: evidence.payloadJson,
    capturedById: evidence.capturedById,
    createdAt: toIso(evidence.createdAt),
  });
}

export async function recordClassroomIntervention(input: unknown) {
  const payload = RecordClassroomInterventionInputSchema.parse(input);
  const { scope, session } = await getTeacherSessionScope(payload.sessionId);

  if (payload.studentId) {
    await ensureSessionStudentParticipant(session.id, payload.studentId);
  }

  if (payload.stepId) {
    const step = await db.query.lessonSteps.findFirst({ where: eq(lessonSteps.id, payload.stepId) });
    if (!step || step.lessonId !== session.lessonId) {
      throw new Error("CLASSROOM_STEP_NOT_IN_LESSON");
    }
  }

  if (payload.targetScope === "class" && payload.studentId) {
    throw new Error("CLASSROOM_INTERVENTION_UNAUTHORIZED");
  }

  return createClassroomTimelineEntry({
    sessionId: session.id,
    studentId: payload.studentId ?? null,
    stepId: payload.stepId ?? null,
    entryType: "intervention_noted",
    actorId: scope.userId,
    payload: {
      title: payload.title,
      body: payload.body,
      targetScope: payload.targetScope,
      visibility: "teacher-only",
    },
  });
}

export async function getClassroomConsoleDTO() {
  const scope = await assertActiveTeacher();

  const liveSessionRows = await db.query.classroomSessions.findMany({
    where: and(
      eq(classroomSessions.teacherId, scope.userId),
      eq(classroomSessions.status, "live")
    )
  });

  const [liveSessionLessons, liveSessionClasses] = await Promise.all([
    liveSessionRows.length > 0
      ? db.query.lessons.findMany({
          where: inArray(
            lessons.id,
            [...new Set(liveSessionRows.map((session) => session.lessonId))]
          ),
        })
      : Promise.resolve([]),
    liveSessionRows.length > 0
      ? db.query.classes.findMany({
          where: inArray(
            classes.id,
            [...new Set(liveSessionRows.map((session) => session.classId))]
          ),
        })
      : Promise.resolve([]),
  ]);

  const liveLessonMap = new Map(liveSessionLessons.map((lesson) => [lesson.id, lesson.title]));
  const liveClassMap = new Map(liveSessionClasses.map((clazz) => [clazz.id, clazz.name]));

  const liveSessions = [...liveSessionRows]
    .sort((a, b) => Number(b.updatedAt ?? 0) - Number(a.updatedAt ?? 0))
    .map((session) => ({
      id: session.id,
      lessonId: session.lessonId,
      lessonTitle: liveLessonMap.get(session.lessonId) ?? "课堂",
      classId: session.classId,
      className: liveClassMap.get(session.classId) ?? "班级",
      updatedAt: toIso(session.updatedAt),
      locked: Boolean(session.locked),
      version: session.version,
      status: "live" as const,
    }));

  const scopedCourses = await db.query.courses.findMany({
    where: inArray(courses.schoolId, scope.schoolIds),
  });
  const scopedCourseIds = scopedCourses.map((course) => course.id);

  const publishedLessonsRows = scopedCourseIds.length
    ? await db.query.lessons.findMany({
        where: and(eq(lessons.status, "published"), inArray(lessons.courseId, scopedCourseIds)),
      })
    : [];

  const [classesRows, courseClassesRows] = await Promise.all([
    db.query.classes.findMany({
      where: inArray(classes.schoolId, scope.schoolIds),
    }),
    scopedCourseIds.length
      ? db.query.courseClasses.findMany({
          where: inArray(courseClasses.courseId, scopedCourseIds),
        })
      : Promise.resolve([]),
  ]);

  const classMemberRows = classesRows.length > 0
    ? await db.query.classMembers.findMany({
        where: and(
          inArray(classMembers.classId, classesRows.map((clazz) => clazz.id)),
          eq(classMembers.role, "student")
        ),
      })
    : [];
  
  const publishedVersionIds = publishedLessonsRows
    .map((lesson) => lesson.publishedVersionId)
    .filter((value): value is string => Boolean(value));

  const publishedVersionRows = publishedVersionIds.length
    ? await db.query.publishedLessonVersions.findMany({
        where: inArray(publishedLessonVersions.id, publishedVersionIds),
      })
    : [];
  const publishedVersionMap = new Map(publishedVersionRows.map((version) => [version.id, version]));
  const studentCountByClassId = new Map<string, number>();

  for (const member of classMemberRows) {
    studentCountByClassId.set(member.classId, (studentCountByClassId.get(member.classId) ?? 0) + 1);
  }

  const publishedLessons = publishedLessonsRows
    .filter((lesson) => Boolean(lesson.publishedVersionId))
    .map((lesson) => {
      const courseClassIds = courseClassesRows.filter((courseClass) => courseClass.courseId === lesson.courseId).map((courseClass) => courseClass.classId);
      const linkedClasses = classesRows.filter((clazz) => courseClassIds.includes(clazz.id));
      const publishedVersion = publishedVersionMap.get(lesson.publishedVersionId!);
      const snapshot = parseSnapshot(publishedVersion?.snapshotJson);
      const launchPreview = buildLaunchPreview(snapshot, lesson.id, lesson.title);
      const classOptions = linkedClasses
        .map((clazz) => {
          const studentCount = studentCountByClassId.get(clazz.id) ?? 0;

          return {
            id: clazz.id,
            name: clazz.name,
            studentCount,
            rosterSummary: buildLaunchRosterSummary({
              classId: clazz.id,
              className: clazz.name,
              studentCount,
            }),
          };
        });

      const launchableClasses = classOptions.filter((clazz) => clazz.studentCount > 0);

      return {
        id: lesson.id,
        title: lesson.title,
        publishedVersionId: lesson.publishedVersionId!,
        courseId: lesson.courseId,
        classes: classOptions,
        launchPreview,
        launchReadiness: buildLaunchReadiness({
          preview: launchPreview,
          launchableClassCount: launchableClasses.length,
        }),
      };
    });

  return ClassroomConsoleDTOSchema.parse({
    liveSessions,
    publishedLessons,
    emptyStateCopy: "还没有可开课的已发布课时或可用班级",
    launchPreviewEmptyState: {
      title: "先选择一个已发布课时",
      description: "选定课时后，这里会展示上课步骤顺序、每一步摘要、预计时长与所需材料提示，方便你在开课前快速确认课堂节奏。",
    },
  });
}

export async function getClassroomSnapshotDTO(input: { sessionId: string }) {
  const session = await getSessionWithLessonSteps(input.sessionId);

  const user = await getCurrentUserDTO();
  if (!user) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  const isTeacher = session.teacherId === user.id;
  if (!isTeacher) {
    await ensureClassroomParticipant({ sessionId: session.id, studentId: user.id });
  }

  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, session.lessonId) });
  const clazz = await db.query.classes.findFirst({ where: eq(classes.id, session.classId) });
  const published = await db.query.publishedLessonVersions.findFirst({ where: eq(publishedLessonVersions.id, session.publishedVersionId) });
  const participants = await db.query.classroomParticipants.findMany({ where: eq(classroomParticipants.sessionId, session.id) });
  const timelineRows = await db.query.classroomTimeline.findMany({ where: eq(classroomTimeline.sessionId, session.id) });

  const snapshot = parseSnapshot(published?.snapshotJson);
  const steps = parseSnapshotSteps(snapshot, session.lessonId);

  const userIds = participants.map(p => p.studentId);
  const studentUsers = userIds.length > 0 ? await db.query.users.findMany({ where: inArray(users.id, userIds) }) : [];
  const userMap = new Map(studentUsers.map(u => [u.id, u.name]));
  const participantDtos = participants.map(p => ({
    studentId: p.studentId,
    studentName: userMap.get(p.studentId) ?? "学生",
    connectionState: p.connectionState,
    currentStepId: p.currentStepId,
    lastSeenAt: toIso(p.lastSeenAt),
  }));
  const teacherTimeline = isTeacher
    ? buildTeacherTimeline({
        timelineRows,
        participants: participantDtos.map((participant) => ({
          studentId: participant.studentId,
          studentName: participant.studentName,
        })),
        steps: steps.map((step) => ({ id: step.id, title: step.title })),
      })
    : [];

  const dto = {
    sessionId: session.id,
    lessonId: session.lessonId,
    publishedVersionId: session.publishedVersionId,
    classId: session.classId,
    className: clazz?.name ?? "班级",
    teacherId: session.teacherId,
    lessonTitle: snapshot.lesson?.title ?? lesson?.title ?? "课堂",
    activeStepId: session.activeStepId,
    locked: Boolean(session.locked),
    status: session.status,
    version: session.version,
    updatedAt: toIso(session.updatedAt),
    participants: participantDtos,
    steps: steps.map(s => ({
      id: s.id,
      title: s.title,
      rank: s.rank,
      type: s.type,
      payload: s.payload,
    })),
    slideState: await getLatestSlideState(session.id),
    teacherTimeline,
    copy: {
      staleRefreshRequired: "课堂状态已经被更新。请先恢复最新状态，再继续操作。",
      pendingAction: "当前控课面板可能不是最新。已为你保留本次操作，请刷新课堂快照后确认。",
      reconnecting: "正在重新连接课堂，会先显示最近一次课堂状态。",
      restored: "已恢复课堂状态，你现在看到的是最新步骤。",
    }
  };

  return ClassroomSnapshotDTOSchema.parse(dto);
}

export async function launchClassroomSession(input: unknown) {
  const payload = LaunchClassroomInputSchema.parse(input);
  const scope = await assertActiveTeacher();

  const scopedCourses = await db.query.courses.findMany({
    where: inArray(courses.schoolId, scope.schoolIds),
  });
  const scopedCourseIds = new Set(scopedCourses.map((course) => course.id));

  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, payload.lessonId) });
  if (!lesson || lesson.status !== "published" || !lesson.publishedVersionId || lesson.publishedVersionId !== payload.publishedVersionId) {
    throw new Error("CLASSROOM_LESSON_NOT_PUBLISHED");
  }
  if (!scopedCourseIds.has(lesson.courseId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  const clazz = await db.query.classes.findFirst({ where: eq(classes.id, payload.classId) });
  if (!clazz || !scope.schoolIds.includes(clazz.schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  const courseClass = await db.query.courseClasses.findFirst({
    where: and(
      eq(courseClasses.courseId, lesson.courseId),
      eq(courseClasses.classId, payload.classId)
    )
  });
  if (!courseClass) {
    throw new Error("CLASSROOM_EMPTY_ROSTER");
  }

  const members = await db.query.classMembers.findMany({
    where: and(eq(classMembers.classId, payload.classId), eq(classMembers.role, "student"))
  });

  if (members.length === 0) {
    throw new Error("CLASSROOM_EMPTY_ROSTER");
  }

  const published = await db.query.publishedLessonVersions.findFirst({
    where: eq(publishedLessonVersions.id, lesson.publishedVersionId)
  });
  if (!published) {
    throw new Error("CLASSROOM_LESSON_NOT_PUBLISHED");
  }

  const snapshot = parseSnapshot(published.snapshotJson);
  const steps = parseSnapshotSteps(snapshot, lesson.id);
  if (steps.length === 0) {
    throw new Error("CLASSROOM_LESSON_NOT_PUBLISHED");
  }
  const firstStep = steps[0];

  const session = await db.transaction(async (tx) => {
    const [newSession] = await tx.insert(classroomSessions).values({
      lessonId: payload.lessonId,
      publishedVersionId: payload.publishedVersionId,
      classId: payload.classId,
      teacherId: scope.userId,
      activeStepId: firstStep.id,
      locked: false,
      status: "live",
      version: 1,
    }).returning();

    const participantValues = members.map(m => ({
      sessionId: newSession.id,
      studentId: m.userId,
      classMemberId: m.id,
      connectionState: "offline" as const,
      currentStepId: firstStep.id,
    }));

    await tx.insert(classroomParticipants).values(participantValues);

    await tx.insert(classroomEvents).values({
      sessionId: newSession.id,
      version: 1,
      type: "launched",
      actorId: scope.userId,
      payloadJson: { activeStepId: firstStep.id, locked: false, slideIndex: 0 },
    });

    return newSession;
  });

  return getClassroomSnapshotDTO({ sessionId: session.id });
}

export async function changeClassroomActiveStep(input: unknown) {
  const payload = ChangeClassroomStepInputSchema.parse(input);
  const scope = await assertActiveTeacher();

  const session = await db.query.classroomSessions.findFirst({ where: eq(classroomSessions.id, payload.sessionId) });
  if (!session) throw new Error("CLASSROOM_ENDED");
  if (session.teacherId !== scope.userId) throw new Error("TEACHER_AUTH_REQUIRED");
  if (session.status !== "live") throw new Error("CLASSROOM_ENDED");

  const published = await db.query.publishedLessonVersions.findFirst({ where: eq(publishedLessonVersions.id, session.publishedVersionId) });
  const snapshot = parseSnapshot(published?.snapshotJson);
  const steps = parseSnapshotSteps(snapshot, session.lessonId);
  const targetStep = steps.find(s => s.id === payload.targetStepId);
  if (!targetStep) throw new Error("CLASSROOM_STEP_NOT_IN_LESSON");

  if (session.version !== payload.expectedVersion) {
    return ClassroomActionResultDTOSchema.parse({
      ok: false,
      sessionId: session.id,
      error: "VERSION_CONFLICT",
      code: "conflict",
      expectedVersion: payload.expectedVersion,
      serverVersion: session.version,
      snapshot: await getClassroomSnapshotDTO({ sessionId: session.id }),
    });
  }

  const [updated] = await db.update(classroomSessions)
    .set({
      activeStepId: payload.targetStepId,
      version: session.version + 1,
      updatedAt: new Date(),
    })
    .where(and(eq(classroomSessions.id, session.id), eq(classroomSessions.version, payload.expectedVersion)))
    .returning();

  if (!updated) {
    return ClassroomActionResultDTOSchema.parse({
      ok: false,
      sessionId: session.id,
      error: "VERSION_CONFLICT",
      code: "conflict",
      expectedVersion: payload.expectedVersion,
      serverVersion: (await db.query.classroomSessions.findFirst({ where: eq(classroomSessions.id, session.id) }))?.version,
      snapshot: await getClassroomSnapshotDTO({ sessionId: session.id }),
    });
  }

  await db.insert(classroomEvents).values({
    sessionId: session.id,
    version: updated.version,
    type: "active_step_changed",
    actorId: scope.userId,
    payloadJson: { activeStepId: payload.targetStepId, slideIndex: 0 },
  });

  return ClassroomActionResultDTOSchema.parse({
    ok: true,
    sessionId: session.id,
    snapshot: await getClassroomSnapshotDTO({ sessionId: session.id }),
  });
}

export async function changeClassroomMode(input: unknown) {
  const payload = ChangeClassroomModeInputSchema.parse(input);
  const scope = await assertActiveTeacher();

  const session = await db.query.classroomSessions.findFirst({ where: eq(classroomSessions.id, payload.sessionId) });
  if (!session) throw new Error("CLASSROOM_ENDED");
  if (session.teacherId !== scope.userId) throw new Error("TEACHER_AUTH_REQUIRED");
  if (session.status !== "live") throw new Error("CLASSROOM_ENDED");

  if (session.version !== payload.expectedVersion) {
    return ClassroomActionResultDTOSchema.parse({
      ok: false,
      sessionId: session.id,
      error: "VERSION_CONFLICT",
      code: "conflict",
      expectedVersion: payload.expectedVersion,
      serverVersion: session.version,
      snapshot: await getClassroomSnapshotDTO({ sessionId: session.id }),
    });
  }

  const [updated] = await db.update(classroomSessions)
    .set({
      locked: payload.locked,
      version: session.version + 1,
      updatedAt: new Date(),
    })
    .where(and(eq(classroomSessions.id, session.id), eq(classroomSessions.version, payload.expectedVersion)))
    .returning();

  if (!updated) {
    return ClassroomActionResultDTOSchema.parse({
      ok: false,
      sessionId: session.id,
      error: "VERSION_CONFLICT",
      code: "conflict",
      expectedVersion: payload.expectedVersion,
      serverVersion: (await db.query.classroomSessions.findFirst({ where: eq(classroomSessions.id, session.id) }))?.version,
      snapshot: await getClassroomSnapshotDTO({ sessionId: session.id }),
    });
  }

  await db.insert(classroomEvents).values({
    sessionId: session.id,
    version: updated.version,
    type: "lock_mode_changed",
    actorId: scope.userId,
    payloadJson: { locked: payload.locked },
  });

  return ClassroomActionResultDTOSchema.parse({
    ok: true,
    sessionId: session.id,
    snapshot: await getClassroomSnapshotDTO({ sessionId: session.id }),
  });
}

export async function changeClassroomSlide(input: unknown) {
  const payload = ChangeClassroomSlideInputSchema.parse(input);
  const scope = await assertActiveTeacher();

  const session = await db.query.classroomSessions.findFirst({ where: eq(classroomSessions.id, payload.sessionId) });
  if (!session) throw new Error("CLASSROOM_ENDED");
  if (session.teacherId !== scope.userId) throw new Error("TEACHER_AUTH_REQUIRED");
  if (session.status !== "live") throw new Error("CLASSROOM_ENDED");
  if (session.activeStepId !== payload.stepId) throw new Error("CLASSROOM_STEP_NOT_IN_LESSON");

  if (session.version !== payload.expectedVersion) {
    return ClassroomActionResultDTOSchema.parse({
      ok: false,
      sessionId: session.id,
      error: "VERSION_CONFLICT",
      code: "conflict",
      expectedVersion: payload.expectedVersion,
      serverVersion: session.version,
      snapshot: await getClassroomSnapshotDTO({ sessionId: session.id }),
    });
  }

  const [updated] = await db.update(classroomSessions)
    .set({
      version: session.version + 1,
      updatedAt: new Date(),
    })
    .where(and(eq(classroomSessions.id, session.id), eq(classroomSessions.version, payload.expectedVersion)))
    .returning();

  if (!updated) {
    return ClassroomActionResultDTOSchema.parse({
      ok: false,
      sessionId: session.id,
      error: "VERSION_CONFLICT",
      code: "conflict",
      expectedVersion: payload.expectedVersion,
      serverVersion: (await db.query.classroomSessions.findFirst({ where: eq(classroomSessions.id, session.id) }))?.version,
      snapshot: await getClassroomSnapshotDTO({ sessionId: session.id }),
    });
  }

  await db.insert(classroomEvents).values({
    sessionId: session.id,
    version: updated.version,
    type: "slide_changed",
    actorId: scope.userId,
    payloadJson: { stepId: payload.stepId, slideIndex: payload.slideIndex },
  });

  return ClassroomActionResultDTOSchema.parse({
    ok: true,
    sessionId: session.id,
    snapshot: await getClassroomSnapshotDTO({ sessionId: session.id }),
  });
}

export async function refreshClassroomSnapshot(input: unknown) {
  const payload = RefreshClassroomSnapshotInputSchema.parse(input);
  const scope = await assertActiveTeacher();

  const session = await db.query.classroomSessions.findFirst({ where: eq(classroomSessions.id, payload.sessionId) });
  if (!session) throw new Error("CLASSROOM_ENDED");
  if (session.teacherId !== scope.userId) throw new Error("TEACHER_AUTH_REQUIRED");

  return ClassroomActionResultDTOSchema.parse({
    ok: true,
    sessionId: session.id,
    snapshot: await getClassroomSnapshotDTO({ sessionId: session.id }),
  });
}

export async function endClassroomSession(input: unknown) {
  const payload = EndClassroomInputSchema.parse(input);
  const scope = await assertActiveTeacher();

  const session = await db.query.classroomSessions.findFirst({ where: eq(classroomSessions.id, payload.sessionId) });
  if (!session) throw new Error("CLASSROOM_ENDED");
  if (session.teacherId !== scope.userId) throw new Error("TEACHER_AUTH_REQUIRED");
  if (session.status !== "live") throw new Error("CLASSROOM_ENDED");

  const [updated] = await db.update(classroomSessions)
    .set({
      status: "ended",
      endedAt: new Date(),
      updatedAt: new Date(),
      version: session.version + 1,
    })
    .where(eq(classroomSessions.id, session.id))
    .returning();

  await db.insert(classroomEvents).values({
    sessionId: session.id,
    version: updated.version,
    type: "ended",
    actorId: scope.userId,
    payloadJson: {},
  });

  return ClassroomActionResultDTOSchema.parse({
    ok: true,
    sessionId: session.id,
    snapshot: await getClassroomSnapshotDTO({ sessionId: session.id }),
  });
}
