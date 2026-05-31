import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { and, eq, inArray } from "drizzle-orm";
import { encode } from "next-auth/jwt";

import { db, ensureLocalSqliteConcurrencyPragmas } from "@/db";
import {
  classMembers,
  classes,
  classroomEvidence,
  classroomEvents,
  classroomParticipants,
  classroomSessions,
  courseClasses,
  courseEnrollments,
  courses,
  lessons,
  lessonSteps,
  memberships,
  publishedLessonVersions,
  schools,
  users,
} from "@/db/schema";

import { PHASE60_THRESHOLDS } from "./phase60-thresholds.js";

export const PHASE60_FIXTURE_SCOPE_ID = "phase60-load-rehearsal";
export const PHASE60_FIXTURE_FILE_PATH = path.join(
  process.cwd(),
  "scripts",
  "load",
  "phase60-fixtures.generated.json",
);

const PHASE60_SCHOOL_NAME = `${PHASE60_FIXTURE_SCOPE_ID}-school`;
const PHASE60_TEACHER_EMAIL = `${PHASE60_FIXTURE_SCOPE_ID}-teacher@example.com`;
const PHASE60_CLASSROOM_NAME_PREFIX = `${PHASE60_FIXTURE_SCOPE_ID}-class`;
const PHASE60_COURSE_TITLE = `${PHASE60_FIXTURE_SCOPE_ID}-course`;
const PHASE60_OPTION_LABELS = ["我支持方案 A", "我支持方案 B", "我还想再讨论"];
const SQLITE_BUSY_TOKEN = "SQLITE_BUSY";
export const PHASE60_LOCAL_SQLITE_BUSY_BLOCKER = "PHASE60_LOCAL_SQLITE_BUSY_BLOCKER";

function buildFrozenVotingContract() {
  return {
    kind: "classroom-voting" as const,
    contractVersion: "v1" as const,
    runtimeContractVersion: "v2" as const,
    pluginId: "plugin-voting-proof",
    publicMetadata: {
      builtInKey: "classroomVoting" as const,
      pluginKey: "classroomVoting",
      pluginName: "课堂投票",
      stepType: "quiz" as const,
    },
    executableConfig: {
      prompt: "请选择你当前更认可的判断。",
      options: PHASE60_OPTION_LABELS.map((label, index) => ({
        id: `option-${index + 1}`,
        label,
      })),
      allowMultiple: false,
      anonymousResults: true,
      showLiveResults: true,
      participationWindowSeconds: 120,
      resultsDisplay: "bar" as const,
    },
  };
}

type FixtureActor = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  workspaceRole: "teacher" | "student";
  sessionCookie: string;
};

type FixtureClassroom = {
  classroom: string;
  classId: string;
  classroomSessionId: string;
  teacherId: string;
  teacherCookie: string;
  studentActors: FixtureActor[];
};

export type Phase60FixtureScope = {
  checkedAt: string;
  proofScopeId: string;
  schoolId: string;
  courseId: string;
  lessonId: string;
  publishedVersionId: string;
  stepId: string;
  cookieName: string;
  classrooms: FixtureClassroom[];
};

function nowIso() {
  return new Date().toISOString();
}

function readEnvFile(filePath: string) {
  try {
    const source = readFileSync(filePath, "utf8");
    return Object.fromEntries(
      source
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"))
        .map((line) => {
          const index = line.indexOf("=");
          if (index < 0) {
            return [line, ""];
          }

          return [line.slice(0, index), line.slice(index + 1)];
        }),
    );
  } catch {
    return {};
  }
}

function getBaseUrl() {
  return process.env.PHASE60_BASE_URL?.trim() || process.env.PHASE57_PROOF_BASE_URL?.trim() || "http://127.0.0.1:3000";
}

function getCookieName(baseUrl: string) {
  return new URL(baseUrl).protocol === "https:" ? "__Secure-authjs.session-token" : "authjs.session-token";
}

function getAuthSecret() {
  const envFile = readEnvFile(path.join(process.cwd(), ".env.local"));
  return process.env.AUTH_SECRET ?? envFile.AUTH_SECRET ?? null;
}

function runtimeSessionIdFor(sessionId: string, actorId: string) {
  return `runtime-${sessionId}-${actorId}`;
}

function buildRuntimeSubmitPayload(input: {
  sessionId: string;
  lessonId: string;
  publishedVersionId: string;
  stepId: string;
  actorId: string;
  optionIndex: number;
}) {
  const selectedOptionId = `option-${(input.optionIndex % PHASE60_OPTION_LABELS.length) + 1}`;
  return {
    runtimeSessionId: runtimeSessionIdFor(input.sessionId, input.actorId),
    runtimeInstanceId: `student-runtime-${input.sessionId}-${input.actorId}`,
    runtimeId: "runtime-classroom-voting",
    runtimeVersion: "2026.05.0",
    submittedAt: nowIso(),
    stateVersion: 1,
    state: {
      selectedOptionIds: [selectedOptionId],
      selectedOptionId,
    },
    proofSummary: {
      title: "课堂投票已提交",
      submittedStateLabel: "已完成互动证明",
      inspectorHref: `/settings/labs/runtime-inspector?runtimeSessionId=${runtimeSessionIdFor(input.sessionId, input.actorId)}`,
      summary: PHASE60_OPTION_LABELS[input.optionIndex % PHASE60_OPTION_LABELS.length],
    },
    summary: {
      summary: PHASE60_OPTION_LABELS[input.optionIndex % PHASE60_OPTION_LABELS.length],
      selectedOptionIds: [selectedOptionId],
    },
  };
}

async function createSessionCookieValue(input: {
  actorId: string;
  email: string;
  name: string;
  roles: string[];
  workspaceRole: "teacher" | "student";
  cookieName: string;
}) {
  const secret = getAuthSecret();

  if (!secret) {
    throw new Error("PHASE60_FIXTURE_AUTH_SECRET_MISSING");
  }

  return encode({
    secret,
    salt: input.cookieName,
    token: {
      sub: input.actorId,
      id: input.actorId,
      name: input.name,
      email: input.email,
      roles: input.roles,
      workspaceRole: input.workspaceRole,
    },
    maxAge: 60 * 60,
  });
}

function buildDryRunFixtures(): Phase60FixtureScope {
  const cookieName = getCookieName(getBaseUrl());

  return {
    checkedAt: nowIso(),
    proofScopeId: PHASE60_FIXTURE_SCOPE_ID,
    schoolId: "phase60-dry-run-school",
    courseId: "phase60-dry-run-course",
    lessonId: "phase60-dry-run-lesson",
    publishedVersionId: "phase60-dry-run-published-version",
    stepId: "phase60-dry-run-step",
    cookieName,
    classrooms: Array.from({ length: PHASE60_THRESHOLDS.classrooms }, (_, classroomIndex) => ({
      classroom: `${PHASE60_CLASSROOM_NAME_PREFIX}-${classroomIndex + 1}`,
      classId: `phase60-dry-run-class-${classroomIndex + 1}`,
      classroomSessionId: `phase60-dry-run-session-${classroomIndex + 1}`,
      teacherId: "phase60-dry-run-teacher",
      teacherCookie: `dry-run-teacher-cookie-${classroomIndex + 1}`,
      studentActors: Array.from({ length: PHASE60_THRESHOLDS.studentsPerClassroom }, (_, actorIndex) => ({
        id: `phase60-dry-run-student-${classroomIndex + 1}-${actorIndex + 1}`,
        email: `${PHASE60_FIXTURE_SCOPE_ID}-dry-run-${classroomIndex + 1}-${actorIndex + 1}@example.com`,
        name: `Phase60 Dry Run Student ${classroomIndex + 1}-${actorIndex + 1}`,
        roles: ["student"],
        workspaceRole: "student",
        sessionCookie: `dry-run-cookie-${classroomIndex + 1}-${actorIndex + 1}`,
      })),
    })),
  };
}

function writeFixtureFile(scope: Phase60FixtureScope) {
  mkdirSync(path.dirname(PHASE60_FIXTURE_FILE_PATH), { recursive: true });
  writeFileSync(PHASE60_FIXTURE_FILE_PATH, JSON.stringify(scope, null, 2));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isSqliteBusyError(error: unknown): boolean {
  let current: unknown = error;

  while (current instanceof Error) {
    if (current.message.includes(SQLITE_BUSY_TOKEN)) {
      return true;
    }
    current = "cause" in current ? current.cause : null;
  }

  return false;
}

export function getPhase60LocalSqliteBusyBlockerMessage(dbFileName: string) {
  return `${PHASE60_LOCAL_SQLITE_BUSY_BLOCKER}: shared SQLite truth still locked for ${dbFileName}; stop stale server.ts / worker holders or rerun pnpm verify:phase60:local`;
}

export async function withSqliteBusyRetry<T>(
  label: string,
  operation: () => Promise<T>,
  options?: {
    attempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    dbFileName?: string;
    sleep?: (ms: number) => Promise<void>;
  },
) {
  const attempts = options?.attempts ?? 8;
  const baseDelayMs = options?.baseDelayMs ?? 250;
  const maxDelayMs = options?.maxDelayMs ?? 1000;
  const dbFileName = options?.dbFileName ?? process.env.DB_FILE_NAME ?? "file:local.db";
  const wait = options?.sleep ?? sleep;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isSqliteBusyError(error)) {
        throw error;
      }

      if (attempt === attempts) {
        throw new Error(`${getPhase60LocalSqliteBusyBlockerMessage(dbFileName)} [${label}]`, {
          cause: error,
        });
      }

      const delayMs = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      await wait(delayMs);
    }
  }

  throw new Error(`${getPhase60LocalSqliteBusyBlockerMessage(dbFileName)} [${label}]`);
}

async function upsertUser(input: { email: string; name: string; studentNumber?: string | null }) {
  return withSqliteBusyRetry(`upsert user ${input.email}`, async () => {
    const passwordHash = await bcrypt.hash("password", 12);
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (existingUser) {
      await db
        .update(users)
        .set({
          name: input.name,
          password: passwordHash,
          studentNumber: input.studentNumber ?? null,
        })
        .where(eq(users.id, existingUser.id));
      return existingUser.id;
    }

    const [insertedUser] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        name: input.name,
        email: input.email,
        password: passwordHash,
        studentNumber: input.studentNumber ?? null,
      })
      .returning({ id: users.id });

    return insertedUser.id;
  });
}

async function ensureMembership(input: { userId: string; schoolId: string; role: string }) {
  await withSqliteBusyRetry(`ensure membership ${input.userId}:${input.role}`, async () => {
    const [existingMembership] = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, input.userId),
          eq(memberships.schoolId, input.schoolId),
          eq(memberships.role, input.role),
        ),
      )
      .limit(1);

    if (existingMembership) {
      await db.update(memberships).set({ status: "active" }).where(eq(memberships.id, existingMembership.id));
      return;
    }

    await db.insert(memberships).values({
      id: randomUUID(),
      userId: input.userId,
      schoolId: input.schoolId,
      role: input.role,
      status: "active",
    });
  });
}

async function cleanupPhase60Scope() {
  await withSqliteBusyRetry("cleanup phase60 scope", async () => {
    const existingCourses = await db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.title, PHASE60_COURSE_TITLE));

    if (existingCourses.length > 0) {
      await db.delete(courses).where(inArray(courses.id, existingCourses.map((course) => course.id)));
    }

    const existingClasses = [];
    for (let index = 1; index <= PHASE60_THRESHOLDS.classrooms; index += 1) {
      const className = `${PHASE60_CLASSROOM_NAME_PREFIX}-${index}`;
      const [existingClass] = await db
        .select({ id: classes.id })
        .from(classes)
        .where(eq(classes.name, className))
        .limit(1);

      if (existingClass) {
        existingClasses.push(existingClass.id);
      }
    }

    if (existingClasses.length > 0) {
      await db.delete(classes).where(inArray(classes.id, existingClasses));
    }
  });
}

async function createPublishedVotingLesson(input: {
  courseId: string;
  teacherId: string;
}) {
  const lessonId = randomUUID();
  const stepId = randomUUID();
  const publishedVersionId = randomUUID();
  const frozenVotingContract = buildFrozenVotingContract();
  const stepPayload = {
    type: "quiz",
    question: "请选择你当前更认可的判断。",
    options: PHASE60_OPTION_LABELS,
    explanation: "这是单校试点 rehearsal 的课堂投票样板。",
    allowRetry: false,
    retryPolicy: "none",
    revealCorrectAnswer: false,
    runtime: {
      version: "v2",
      runtimeId: "runtime-classroom-voting",
      runtimeVersion: "2026.05.0",
      kind: "plugin-runtime",
      displayName: "课堂投票 Runtime",
      stateSchemaVersion: "state-v1",
      entry: {
        sandbox: "iframe",
        bootstrap: "/runtime/html-courseware/pilot",
      },
      bootstrap: {
        contextMode: "step-summary",
        resumeStrategy: "latest-or-create",
        capabilitySnapshot: "session-scoped",
      },
      submitTarget: {
        primary: "classroom-evidence",
        additional: [],
      },
      requestedCapabilities: ["runtime:submission:create"],
    },
    materialRefs: [],
    builtInSource: {
      pluginId: "plugin-voting-proof",
      builtInKey: "classroomVoting",
      pluginName: "课堂投票",
    },
  };

  await withSqliteBusyRetry("insert published lesson", async () =>
    db.insert(lessons).values({
      id: lessonId,
      courseId: input.courseId,
      createdById: input.teacherId,
      title: "Phase 60 课堂投票容量与演练样板",
      objective: "验证 load/degrade/rehearsal close gate。",
      status: "published",
      revision: 1,
      publishedVersionId,
    }),
  );

  await withSqliteBusyRetry("insert lesson voting step", async () =>
    db.insert(lessonSteps).values({
      id: stepId,
      lessonId,
      type: "quiz",
      title: "课堂投票",
      rank: "a0",
      payloadJson: stepPayload,
    }),
  );

  await withSqliteBusyRetry("insert published lesson version", async () =>
    db.insert(publishedLessonVersions).values({
      id: publishedVersionId,
      lessonId,
      version: 1,
      snapshotJson: {
        lesson: {
          id: lessonId,
          title: "Phase 60 课堂投票容量与演练样板",
          objective: "验证 load/degrade/rehearsal close gate。",
        },
        course: {
          title: PHASE60_COURSE_TITLE,
        },
        steps: [
          {
            id: stepId,
            lessonId,
            type: "quiz",
            title: "课堂投票",
            rank: "a0",
            payload: stepPayload,
            pluginContract: frozenVotingContract,
          },
        ],
        materials: [],
      },
      publishedById: input.teacherId,
    }),
  );

  return { lessonId, stepId, publishedVersionId };
}

export async function ensurePhase60Fixtures(options?: { dryRun?: boolean; baseUrl?: string }) {
  if (options?.dryRun) {
    const dryRunScope = buildDryRunFixtures();
    writeFixtureFile(dryRunScope);
    return dryRunScope;
  }

  await ensureLocalSqliteConcurrencyPragmas();

  const baseUrl = options?.baseUrl ?? getBaseUrl();
  const cookieName = getCookieName(baseUrl);

  const schoolId = await withSqliteBusyRetry("ensure phase60 school", async () => {
    const [existingSchool] = await db
      .select({ id: schools.id })
      .from(schools)
      .where(eq(schools.name, PHASE60_SCHOOL_NAME))
      .limit(1);

    if (existingSchool) {
      return existingSchool.id;
    }

    return (
      await db.insert(schools).values({ id: randomUUID(), name: PHASE60_SCHOOL_NAME }).returning({ id: schools.id })
    )[0].id;
  });

  const teacherId = await upsertUser({
    email: PHASE60_TEACHER_EMAIL,
    name: "Phase60 Rehearsal Teacher",
  });

  await ensureMembership({ userId: teacherId, schoolId, role: "teacher" });
  await ensureMembership({ userId: teacherId, schoolId, role: "admin" });

  const studentRecords = [];
  for (let index = 0; index < PHASE60_THRESHOLDS.classrooms * PHASE60_THRESHOLDS.studentsPerClassroom; index += 1) {
    const studentOrdinal = String(index + 1).padStart(3, "0");
    const email = `${PHASE60_FIXTURE_SCOPE_ID}-student-${studentOrdinal}@example.com`;
    const studentId = await upsertUser({
      email,
      name: `Phase60 Student ${studentOrdinal}`,
      studentNumber: `P60-${studentOrdinal}`,
    });
    await ensureMembership({ userId: studentId, schoolId, role: "student" });
    studentRecords.push({
      id: studentId,
      email,
      name: `Phase60 Student ${studentOrdinal}`,
      studentNumber: `P60-${studentOrdinal}`,
    });
  }

  await cleanupPhase60Scope();

  const [course] = await withSqliteBusyRetry("insert phase60 course", async () =>
    db.insert(courses).values({
      id: randomUUID(),
      schoolId,
      ownerId: teacherId,
      title: PHASE60_COURSE_TITLE,
      subject: "初中信息科技",
      grade: "七年级",
      status: "published",
    }).returning({ id: courses.id }),
  );

  const lesson = await createPublishedVotingLesson({
    courseId: course.id,
    teacherId,
  });

  const classrooms = [];
  for (let classroomIndex = 0; classroomIndex < PHASE60_THRESHOLDS.classrooms; classroomIndex += 1) {
    const classroomName = `${PHASE60_CLASSROOM_NAME_PREFIX}-${classroomIndex + 1}`;
    const [insertedClass] = await withSqliteBusyRetry(`insert phase60 class ${classroomName}`, async () =>
      db.insert(classes).values({
        id: randomUUID(),
        schoolId,
        name: classroomName,
      }).returning({ id: classes.id }),
    );

    await withSqliteBusyRetry(`link phase60 class ${classroomName} to course`, async () =>
      db.insert(courseClasses).values({
        courseId: course.id,
        classId: insertedClass.id,
      }),
    );

    const classroomStudents = studentRecords.slice(
      classroomIndex * PHASE60_THRESHOLDS.studentsPerClassroom,
      (classroomIndex + 1) * PHASE60_THRESHOLDS.studentsPerClassroom,
    );

    const classMemberRows = classroomStudents.map((student) => ({
      id: randomUUID(),
      classId: insertedClass.id,
      userId: student.id,
      role: "student" as const,
    }));
    await withSqliteBusyRetry(`insert class members ${classroomName}`, async () => db.insert(classMembers).values(classMemberRows));

    await withSqliteBusyRetry(`insert course enrollments ${classroomName}`, async () =>
      db.insert(courseEnrollments).values(
        classroomStudents.map((student) => ({
          id: randomUUID(),
          courseId: course.id,
          studentId: student.id,
          status: "active",
        })),
      ),
    );

    const sessionId = randomUUID();
    const launchedAt = new Date();
    await withSqliteBusyRetry(`insert classroom session ${classroomName}`, async () =>
      db.insert(classroomSessions).values({
        id: sessionId,
        lessonId: lesson.lessonId,
        publishedVersionId: lesson.publishedVersionId,
        classId: insertedClass.id,
        teacherId,
        activeStepId: lesson.stepId,
        locked: false,
        transportModeSnapshot: "local_only",
        status: "live",
        version: 1,
        createdAt: launchedAt,
        updatedAt: launchedAt,
      }),
    );

    const participantRows: (typeof classroomParticipants.$inferInsert)[] = classroomStudents.map((student, studentIndex) => {
      const classMemberRow = classMemberRows[studentIndex];

      if (!classMemberRow) {
        throw new Error("PHASE60_CLASS_MEMBER_ROW_MISSING");
      }

      return {
        id: randomUUID(),
        sessionId,
        studentId: student.id,
        classMemberId: classMemberRow.id,
        connectionState: "connected",
        currentStepId: lesson.stepId,
        lastSeenAt: launchedAt,
      };
    });
    await withSqliteBusyRetry(`insert classroom participants ${classroomName}`, async () =>
      db.insert(classroomParticipants).values(participantRows),
    );

    await withSqliteBusyRetry(`insert classroom launch event ${classroomName}`, async () =>
      db.insert(classroomEvents).values({
        id: randomUUID(),
        sessionId,
        version: 1,
        type: "launched",
        actorId: teacherId,
        payloadJson: {
          activeStepId: lesson.stepId,
          locked: false,
          slideIndex: 0,
        },
        createdAt: launchedAt,
      }),
    );

    const evidenceRows: (typeof classroomEvidence.$inferInsert)[] = [
      {
        id: randomUUID(),
        sessionId,
        studentId: null,
        stepId: lesson.stepId,
        sourceType: "system" as const,
        evidenceType: "artifact" as const,
        capturedById: teacherId,
        payloadJson: {
          kind: "voting-round-opened",
          sessionId,
          lessonId: lesson.lessonId,
          stepId: lesson.stepId,
          stepTitle: "课堂投票",
          version: 1,
          command: "start-voting-round",
          runtimeCommand: "start-voting-round",
          openedAt: nowIso(),
          closedAt: null,
          closedByTeacherId: null,
        },
      },
      ...classroomStudents.map((student, studentIndex) => ({
        id: randomUUID(),
        sessionId,
        studentId: student.id,
        stepId: lesson.stepId,
        sourceType: "student-submission" as const,
        evidenceType: "quiz-response" as const,
        capturedById: student.id,
        payloadJson: buildRuntimeSubmitPayload({
          sessionId,
          lessonId: lesson.lessonId,
          publishedVersionId: lesson.publishedVersionId,
          stepId: lesson.stepId,
          actorId: student.id,
          optionIndex: studentIndex,
        }),
      })),
    ];
    await withSqliteBusyRetry(`insert classroom evidence ${classroomName}`, async () =>
      db.insert(classroomEvidence).values(evidenceRows),
    );

    const teacherCookie = await createSessionCookieValue({
      actorId: teacherId,
      email: PHASE60_TEACHER_EMAIL,
      name: "Phase60 Rehearsal Teacher",
      roles: ["teacher"],
      workspaceRole: "teacher",
      cookieName,
    });
    const studentActors = await Promise.all(
      classroomStudents.map(async (student) => ({
        id: student.id,
        email: student.email,
        name: student.name,
        roles: ["student"],
        workspaceRole: "student" as const,
        sessionCookie: await createSessionCookieValue({
          actorId: student.id,
          email: student.email,
          name: student.name,
          roles: ["student"],
          workspaceRole: "student",
          cookieName,
        }),
      })),
    );

    classrooms.push({
      classroom: classroomName,
      classId: insertedClass.id,
      classroomSessionId: sessionId,
      teacherId,
      teacherCookie,
      studentActors,
    });
  }

  const scope = {
    checkedAt: nowIso(),
    proofScopeId: PHASE60_FIXTURE_SCOPE_ID,
    schoolId,
    courseId: course.id,
    lessonId: lesson.lessonId,
    publishedVersionId: lesson.publishedVersionId,
    stepId: lesson.stepId,
    cookieName,
    classrooms,
  } satisfies Phase60FixtureScope;

  writeFixtureFile(scope);
  return scope;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run")
    || process.env.PHASE60_REHEARSAL_MODE === "dry-run"
    || process.env.PHASE60_K6_MODE === "dry-run";
  const scope = await ensurePhase60Fixtures({ dryRun });
  console.log(`Phase 60 fixtures ready: ${PHASE60_FIXTURE_FILE_PATH}`);
  console.log(`Proof scope: ${scope.proofScopeId}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  main().catch((error) => {
    console.error("Phase 60 fixtures failed:", error);
    process.exit(1);
  });
}
