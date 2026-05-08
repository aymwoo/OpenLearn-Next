import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  classes,
  classMembers,
  classroomEvents,
  classroomParticipants,
  classroomSessions,
  courseClasses,
  lessons,
  publishedLessonVersions,
  users,
} from "@/db/schema";
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import {
  ClassroomActionResultDTOSchema,
  ClassroomSnapshotDTOSchema,
  LaunchClassroomInputSchema,
  ChangeClassroomStepInputSchema,
  ChangeClassroomModeInputSchema,
  RefreshClassroomSnapshotInputSchema,
  EndClassroomInputSchema,
} from "@/lib/dto/classroom";
import { lessonStepPayloadSchema } from "@/lib/dto/lesson-authoring";

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
};

function parseSnapshot(value: unknown): PublishedSnapshot {
  return (value ?? {}) as PublishedSnapshot;
}

function parseSnapshotSteps(snapshot: PublishedSnapshot, fallbackLessonId: string) {
  return [...(snapshot.steps ?? [])]
    .sort((a, b) => a.rank.localeCompare(b.rank))
    .map((step) => ({
      id: step.id,
      lessonId: step.lessonId ?? fallbackLessonId,
      type: step.type,
      title: step.title,
      rank: step.rank,
      payload: lessonStepPayloadSchema.parse(step.payload),
    }));
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

  await db.update(classroomParticipants)
    .set({
      connectionState: input.connectionState,
      lastSeenAt: new Date(),
      ...(input.currentStepId ? { currentStepId: input.currentStepId } : {}),
    })
    .where(and(eq(classroomParticipants.sessionId, session.id), eq(classroomParticipants.studentId, input.studentId)));
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

  const publishedLessonsRows = await db.query.lessons.findMany({
    where: eq(lessons.status, "published")
  });
  
  // Actually we need the course classes to know the rosters.
  const classesRows = await db.query.classes.findMany();
  const courseClassesRows = await db.query.courseClasses.findMany();
  
  const publishedLessons = publishedLessonsRows
    .filter((lesson) => Boolean(lesson.publishedVersionId))
    .map((lesson) => {
      const courseClassIds = courseClassesRows.filter((courseClass) => courseClass.courseId === lesson.courseId).map((courseClass) => courseClass.classId);
      const linkedClasses = classesRows.filter((clazz) => courseClassIds.includes(clazz.id));

      return {
        id: lesson.id,
        title: lesson.title,
        publishedVersionId: lesson.publishedVersionId!,
        courseId: lesson.courseId,
        classes: linkedClasses.map((clazz) => ({ id: clazz.id, name: clazz.name })),
      };
    })
    .filter((lesson) => lesson.classes.length > 0);

  return {
    liveSessions,
    publishedLessons,
    emptyStateCopy: "还没有可开课的已发布课时"
  };
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

  const snapshot = parseSnapshot(published?.snapshotJson);
  const steps = parseSnapshotSteps(snapshot, session.lessonId);

  const userIds = participants.map(p => p.studentId);
  const studentUsers = userIds.length > 0 ? await db.query.users.findMany({ where: inArray(users.id, userIds) }) : [];
  const userMap = new Map(studentUsers.map(u => [u.id, u.name]));

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
    participants: participants.map(p => ({
      studentId: p.studentId,
      studentName: userMap.get(p.studentId) ?? "学生",
      connectionState: p.connectionState,
      currentStepId: p.currentStepId,
      lastSeenAt: toIso(p.lastSeenAt),
    })),
    steps: steps.map(s => ({
      id: s.id,
      title: s.title,
      rank: s.rank,
    })),
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

  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, payload.lessonId) });
  if (!lesson || lesson.status !== "published" || !lesson.publishedVersionId || lesson.publishedVersionId !== payload.publishedVersionId) {
    throw new Error("CLASSROOM_LESSON_NOT_PUBLISHED");
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
      payloadJson: { activeStepId: firstStep.id, locked: false },
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
    payloadJson: { activeStepId: payload.targetStepId },
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
