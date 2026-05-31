import { spawn, type ChildProcess } from "node:child_process";
import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "node:crypto";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { and, eq, inArray } from "drizzle-orm";
import { encode } from "next-auth/jwt";
import { chromium, type Browser, type Page } from "playwright";

import { db } from "@/db";
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

type VotingProofContext = {
  schoolId: string;
  teacherId: string;
  studentId: string;
  classId: string;
  courseId: string;
  lessonId: string;
  publishedVersionId: string;
  stepId: string;
  sessionId: string;
};

type ProofActor = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  workspaceRole: "teacher" | "student";
};

type SessionCookie = {
  name: string;
  value: string;
  domain: string;
  secure: boolean;
};

type ServerHandle = {
  process: ChildProcess | null;
  url: string;
};

const PHASE_57_PROOF_SLUG = "phase57-voting-proof";
const DEFAULT_PORT = 3057;
const PHASE_57_PROOF_SCHOOL = `${PHASE_57_PROOF_SLUG}-school`;
const PHASE_57_TEACHER_LOGIN = `${PHASE_57_PROOF_SLUG}-teacher@example.com`;
const PHASE_57_STUDENT_LOGIN = `${PHASE_57_PROOF_SLUG}-student@example.com`;
const PHASE_57_VOTING_OPTIONS = ["我支持方案 A", "我支持方案 B", "我还想再讨论"];

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
      options: PHASE_57_VOTING_OPTIONS.map((label, index) => ({
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

function runtimeSessionIdFor(sessionId: string, actorId: string) {
  return `runtime-${sessionId}-${actorId}`;
}

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
          if (index < 0) return [line, ""];
          return [line.slice(0, index), line.slice(index + 1)];
        }),
    );
  } catch {
    return {};
  }
}

function buildRuntimeSubmitPayload(input: {
  sessionId: string;
  lessonId: string;
  publishedVersionId: string;
  stepId: string;
  actorId: string;
  summary: string;
  selectedOptionIds: string[];
}) {
  const submittedAt = nowIso();
  const runtimeSessionId = runtimeSessionIdFor(input.sessionId, input.actorId);

  return {
    runtimeSessionId,
    runtimeInstanceId: `student-runtime-${input.sessionId}-${input.actorId}`,
    runtimeId: "runtime-classroom-voting",
    runtimeVersion: "2026.05.0",
    submittedAt,
    stateVersion: 1,
    state: {
      selectedOptionIds: input.selectedOptionIds,
      selectedOptionId: input.selectedOptionIds[0] ?? null,
    },
    payloadFingerprint: createHash("sha256")
      .update(JSON.stringify({ selectedOptionIds: input.selectedOptionIds }))
      .digest("hex"),
    proofSummary: {
      title: "课堂投票已提交",
      submittedStateLabel: "已完成互动证明",
      inspectorHref: `/settings/labs/runtime-inspector?runtimeSessionId=${runtimeSessionId}`,
      summary: input.summary,
    },
    summary: {
      summary: input.summary,
      selectedOptionIds: input.selectedOptionIds,
    },
  };
}

async function ensureProofCourseContext() {
  const [existingSchool] = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.name, PHASE_57_PROOF_SCHOOL))
    .limit(1);

  const schoolId = existingSchool?.id
    ?? (
      await db.insert(schools).values({ id: randomUUID(), name: PHASE_57_PROOF_SCHOOL }).returning({ id: schools.id })
    )[0]!.id;

  const passwordHash = await bcrypt.hash("password", 12);

  const upsertUser = async (input: { email: string; name: string; studentNumber?: string | null }) => {
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (existingUser) {
      await db.update(users).set({
        name: input.name,
        password: passwordHash,
        studentNumber: input.studentNumber ?? null,
      }).where(eq(users.id, existingUser.id));
      return existingUser.id;
    }

    const [insertedUser] = await db.insert(users).values({
      id: randomUUID(),
      name: input.name,
      email: input.email,
      password: passwordHash,
      studentNumber: input.studentNumber ?? null,
    }).returning({ id: users.id });

    return insertedUser!.id;
  };

  const teacherId = await upsertUser({
    email: PHASE_57_TEACHER_LOGIN,
    name: "Phase57 Proof Teacher",
  });
  const studentId = await upsertUser({
    email: PHASE_57_STUDENT_LOGIN,
    name: "Phase57 Proof Student",
    studentNumber: PHASE_57_STUDENT_LOGIN,
  });

  for (const membershipInput of [
    { userId: teacherId, role: "teacher" as const },
    { userId: teacherId, role: "admin" as const },
    { userId: studentId, role: "student" as const },
  ]) {
    const [existingMembership] = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, membershipInput.userId),
          eq(memberships.schoolId, schoolId),
          eq(memberships.role, membershipInput.role),
        ),
      )
      .limit(1);

    if (existingMembership) {
      await db.update(memberships).set({ status: "active" }).where(eq(memberships.id, existingMembership.id));
    } else {
      await db.insert(memberships).values({
        id: randomUUID(),
        userId: membershipInput.userId,
        schoolId,
        role: membershipInput.role,
        status: "active",
      });
    }
  }

  const existingProofCourses = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.title, `${PHASE_57_PROOF_SLUG}-course`));

  if (existingProofCourses.length > 0) {
    await db.delete(courses).where(inArray(courses.id, existingProofCourses.map((course) => course.id)));
  }

  const existingProofClasses = await db
    .select({ id: classes.id })
    .from(classes)
    .where(eq(classes.name, `${PHASE_57_PROOF_SLUG}-class`));

  if (existingProofClasses.length > 0) {
    await db.delete(classes).where(inArray(classes.id, existingProofClasses.map((clazz) => clazz.id)));
  }

  const [existingClass] = await db
    .select({ id: classes.id })
    .from(classes)
    .where(eq(classes.name, `${PHASE_57_PROOF_SLUG}-class`))
    .limit(1);

  const classId = existingClass?.id
    ?? (
      await db.insert(classes).values({
        id: randomUUID(),
        schoolId,
        name: `${PHASE_57_PROOF_SLUG}-class`,
      }).returning({ id: classes.id })
    )[0]!.id;

  const [existingMembership] = await db
    .select({ id: classMembers.id })
    .from(classMembers)
    .where(
      and(
        eq(classMembers.classId, classId),
        eq(classMembers.userId, studentId),
        eq(classMembers.role, "student"),
      ),
    )
    .limit(1);

  if (!existingMembership) {
    await db.insert(classMembers).values({
        id: randomUUID(),
        classId,
        userId: studentId,
        role: "student",
      });
  }

  const [existingCourse] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.title, `${PHASE_57_PROOF_SLUG}-course`))
    .limit(1);

  const courseId = existingCourse?.id
    ?? (
      await db.insert(courses).values({
        id: randomUUID(),
        schoolId,
        ownerId: teacherId,
        title: `${PHASE_57_PROOF_SLUG}-course`,
        subject: "初中信息科技",
        grade: "七年级",
      }).returning({ id: courses.id })
    )[0]!.id;

  const [existingCourseClass] = await db
    .select({ courseId: courseClasses.courseId })
    .from(courseClasses)
    .where(and(eq(courseClasses.courseId, courseId), eq(courseClasses.classId, classId)))
    .limit(1);

  if (!existingCourseClass) {
    await db.insert(courseClasses).values({
      courseId,
      classId,
    });
  }

  const [existingEnrollment] = await db
    .select({ courseId: courseEnrollments.courseId })
    .from(courseEnrollments)
    .where(
        and(
          eq(courseEnrollments.courseId, courseId),
          eq(courseEnrollments.studentId, studentId),
          eq(courseEnrollments.status, "active"),
        ),
      )
    .limit(1);

  if (!existingEnrollment) {
      await db.insert(courseEnrollments).values({
        id: randomUUID(),
        courseId,
        studentId,
        status: "active",
      });
  }

  return {
    schoolId,
    teacherId,
    studentId,
    classId,
    courseId,
  };
}

async function createPublishedVotingLesson(context: {
  courseId: string;
  teacherId: string;
}) {
  const lessonId = randomUUID();
  const votingStepId = randomUUID();
  const publishedVersionId = randomUUID();
  const frozenVotingContract = buildFrozenVotingContract();

  const votingPayload = {
    type: "quiz",
    question: "请选择你当前更认可的判断。",
    options: PHASE_57_VOTING_OPTIONS,
    explanation: "这是课堂投票样板，不预设正确答案。",
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
  } as const;

  await db.insert(lessons).values({
    id: lessonId,
    courseId: context.courseId,
    createdById: context.teacherId,
    title: "Phase 57 课堂投票 Proof 课时",
    objective: "验证 classroom voting sample chain 的 teacher/student browser proof。",
    status: "published",
    revision: 1,
    publishedVersionId,
  });

  await db.insert(lessonSteps).values({
    id: votingStepId,
    lessonId,
    type: "quiz",
    title: "课堂投票",
    rank: "a0",
    payloadJson: votingPayload,
  });

  await db.insert(publishedLessonVersions).values({
    id: publishedVersionId,
    lessonId,
    version: 1,
    publishedById: context.teacherId,
    snapshotJson: {
      lesson: {
        id: lessonId,
        title: "Phase 57 课堂投票 Proof 课时",
        objective: "验证 classroom voting sample chain 的 teacher/student browser proof。",
      },
      course: {
        title: `${PHASE_57_PROOF_SLUG}-course`,
      },
      steps: [
        {
          id: votingStepId,
          lessonId,
          type: "quiz",
          title: "课堂投票",
          rank: "a0",
          payload: votingPayload,
          pluginContract: frozenVotingContract,
        },
      ],
      materials: [],
    },
  });

  return {
    lessonId,
    publishedVersionId,
    stepId: votingStepId,
  };
}

async function prepareVotingProofContext(): Promise<VotingProofContext> {
  const base = await ensureProofCourseContext();
  const lesson = await createPublishedVotingLesson({
    courseId: base.courseId,
    teacherId: base.teacherId,
  });

  const sessionId = randomUUID();
  const launchedAt = new Date();

  const [studentClassMember] = await db
    .select({ id: classMembers.id })
    .from(classMembers)
    .where(
      and(
        eq(classMembers.classId, base.classId),
        eq(classMembers.userId, base.studentId),
        eq(classMembers.role, "student"),
      ),
    )
    .limit(1);

  if (!studentClassMember) {
    throw new Error("PHASE57_PROOF_CLASS_MEMBER_MISSING");
  }

  await db.insert(classroomSessions).values({
    id: sessionId,
    lessonId: lesson.lessonId,
    publishedVersionId: lesson.publishedVersionId,
    classId: base.classId,
    teacherId: base.teacherId,
    activeStepId: lesson.stepId,
    locked: false,
    transportModeSnapshot: "local_only",
    status: "live",
    version: 1,
    createdAt: launchedAt,
    updatedAt: launchedAt,
  });

  await db.insert(classroomParticipants).values({
    id: randomUUID(),
    sessionId,
    studentId: base.studentId,
    classMemberId: studentClassMember.id,
    connectionState: "connected",
    currentStepId: lesson.stepId,
    lastSeenAt: launchedAt,
  });

  await db.insert(classroomEvents).values({
    id: randomUUID(),
    sessionId,
    version: 1,
    type: "launched",
    actorId: base.teacherId,
    payloadJson: {
      activeStepId: lesson.stepId,
      locked: false,
      slideIndex: 0,
    },
    createdAt: launchedAt,
  });

  const openedAt = nowIso();
  const teacherArtifactId = randomUUID();
  const studentArtifactId = randomUUID();

  await db.insert(classroomEvidence).values([
    {
      id: teacherArtifactId,
      sessionId,
      studentId: null,
      stepId: lesson.stepId,
      sourceType: "system",
      evidenceType: "artifact",
      capturedById: base.teacherId,
      payloadJson: {
        kind: "voting-round-opened",
        sessionId,
        lessonId: lesson.lessonId,
        stepId: lesson.stepId,
        stepTitle: "课堂投票",
        version: 1,
        command: "start-voting-round",
        runtimeCommand: "start-voting-round",
        openedAt,
        closedAt: null,
        closedByTeacherId: null,
      },
    },
    {
      id: studentArtifactId,
      sessionId,
      studentId: base.studentId,
      stepId: lesson.stepId,
      sourceType: "student-submission",
      evidenceType: "quiz-response",
      capturedById: base.studentId,
      payloadJson: buildRuntimeSubmitPayload({
        sessionId,
        lessonId: lesson.lessonId,
        publishedVersionId: lesson.publishedVersionId,
        stepId: lesson.stepId,
        actorId: base.studentId,
        summary: "我支持方案 A",
        selectedOptionIds: ["option-1"],
      }),
    },
  ]);

  return {
    ...base,
    lessonId: lesson.lessonId,
    publishedVersionId: lesson.publishedVersionId,
    stepId: lesson.stepId,
    sessionId,
  };
}

async function waitForServerReady(
  child: ChildProcess,
  url: string,
  isReady: () => boolean,
  timeoutMs = 240000,
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (isReady()) {
      return;
    }

    if (child.exitCode !== null) {
      throw new Error(`PHASE57_PROOF_SERVER_EXITED_BEFORE_READY: ${url} (exit=${child.exitCode})`);
    }

    await delay(250);
  }

  throw new Error(`PHASE57_PROOF_SERVER_TIMEOUT: ${url}`);
}

async function startLocalServer(port = DEFAULT_PORT): Promise<ServerHandle> {
  const envFile = readEnvFile(path.join(process.cwd(), ".env.local"));
  const url = `http://127.0.0.1:${port}`;
  const child = spawn(
    process.execPath,
    [
      "--require",
      "./scripts/server-only-node-shim.cjs",
      "--import",
      "next/dist/server/node-environment.js",
      "--import",
      "tsx",
      "server.ts",
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...envFile,
        NODE_ENV: "development",
        PORT: String(port),
        HOSTNAME: "127.0.0.1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let ready = false;
  const readyMessage = `> Ready on ${url}`;

  child.stdout?.on("data", (chunk) => {
    const output = String(chunk);
    process.stdout.write(output);

    if (output.includes(readyMessage)) {
      ready = true;
    }
  });
  child.stderr?.on("data", (chunk) => {
    process.stderr.write(String(chunk));
  });

  await waitForServerReady(child, url, () => ready);

  return { process: child, url };
}

async function stopLocalServer(handle: ServerHandle | null) {
  if (!handle?.process) return;
  handle.process.kill("SIGTERM");
  await Promise.race([once(handle.process, "exit"), delay(5000)]).catch(() => undefined);
  if (!handle.process.killed) {
    handle.process.kill("SIGKILL");
  }
}

async function createSessionCookie(input: { baseUrl: string; actor: ProofActor }): Promise<SessionCookie> {
  const baseUrl = new URL(input.baseUrl);
  const envFile = readEnvFile(path.join(process.cwd(), ".env.local"));
  const secret = process.env.PHASE57_PROOF_AUTH_SECRET ?? process.env.AUTH_SECRET ?? envFile.AUTH_SECRET;

  if (!secret) {
    throw new Error("PHASE57_PROOF_AUTH_SECRET_MISSING");
  }

  const cookieName = baseUrl.protocol === "https:" ? "__Secure-authjs.session-token" : "authjs.session-token";

  const sessionToken = await encode({
    secret,
    salt: cookieName,
    token: {
      sub: input.actor.id,
      id: input.actor.id,
      name: input.actor.name,
      email: input.actor.email,
      roles: input.actor.roles,
      workspaceRole: input.actor.workspaceRole,
    },
    maxAge: 60 * 60,
  });

  return {
    name: cookieName,
    value: sessionToken,
    domain: baseUrl.hostname,
    secure: baseUrl.protocol === "https:",
  };
}

async function establishSession(page: Page, input: { baseUrl: string; actor: ProofActor }) {
  console.log(`[phase57 proof] Seeding ${input.actor.workspaceRole} session cookie...`);
  const sessionCookie = await createSessionCookie(input);

  await page.context().addCookies([
    {
      name: sessionCookie.name,
      value: sessionCookie.value,
      domain: sessionCookie.domain,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: sessionCookie.secure,
    },
  ]);

  return sessionCookie;
}

async function prewarmRoute(input: { baseUrl: string; href: string; sessionCookie: SessionCookie; label: string }) {
  const url = new URL(input.href, input.baseUrl).toString();
  console.log(`[phase57 proof] Prewarming ${input.label}: ${url}`);
  const response = await fetch(url, {
    headers: {
      cookie: `${input.sessionCookie.name}=${input.sessionCookie.value}`,
    },
    redirect: "manual",
    signal: AbortSignal.timeout(300000),
    cache: "no-store",
  });

  if (response.status >= 400) {
    throw new Error(`PHASE57_PROOF_PREWARM_FAILED [${input.label}] ${response.status} ${url}`);
  }
}

async function verifyTeacherFlow(browser: Browser, input: { baseUrl: string; sessionId: string; teacherId: string }) {
  const page = await browser.newPage();
  page.setDefaultTimeout(120000);
  page.setDefaultNavigationTimeout(180000);
  console.log("[phase57 proof] Starting teacher flow...");
  const sessionCookie = await establishSession(page, {
    baseUrl: input.baseUrl,
    actor: {
      id: input.teacherId,
      email: PHASE_57_TEACHER_LOGIN,
      name: "Phase57 Teacher",
      roles: ["teacher"],
      workspaceRole: "teacher",
    },
  });
  await prewarmRoute({ baseUrl: input.baseUrl, href: "/teacher", sessionCookie, label: "teacher-home" });
  await prewarmRoute({ baseUrl: input.baseUrl, href: `/classroom?sessionId=${encodeURIComponent(input.sessionId)}`, sessionCookie, label: "classroom" });
  await page.goto(`${input.baseUrl}/teacher`, { waitUntil: "domcontentloaded" });
  await page.goto(`${input.baseUrl}/classroom?sessionId=${encodeURIComponent(input.sessionId)}`, {
    waitUntil: "domcontentloaded",
  });

  await page.getByRole("heading", { name: "课堂控制与干预记录" }).waitFor();
  await page.getByRole("button", { name: "开始本轮投票" }).waitFor();
  await page.getByRole("heading", { name: "实时汇总" }).waitFor();
  await page.getByText("我支持方案 A").waitFor();
  await page.getByRole("heading", { name: "未完成名单" }).waitFor();
  await page.getByText("全班已提交，可由老师决定何时结束本轮投票。").first().waitFor();

  console.log("[phase57 proof] Teacher flow passed.");
  await page.close();
}

async function verifyStudentFlow(browser: Browser, input: { baseUrl: string; lessonId: string; stepId: string; studentId: string }) {
  const page = await browser.newPage();
  page.setDefaultTimeout(120000);
  page.setDefaultNavigationTimeout(180000);
  console.log("[phase57 proof] Starting student flow...");
  const sessionCookie = await establishSession(page, {
    baseUrl: input.baseUrl,
    actor: {
      id: input.studentId,
      email: PHASE_57_STUDENT_LOGIN,
      name: "Phase57 Student",
      roles: ["student"],
      workspaceRole: "student",
    },
  });
  await prewarmRoute({ baseUrl: input.baseUrl, href: "/student", sessionCookie, label: "student-home" });
  await prewarmRoute({
    baseUrl: input.baseUrl,
    href: `/student/player?lessonId=${encodeURIComponent(input.lessonId)}&stepId=${encodeURIComponent(input.stepId)}`,
    sessionCookie,
    label: "student-player",
  });
  await page.goto(`${input.baseUrl}/student`, { waitUntil: "domcontentloaded" });
  await page.goto(
    `${input.baseUrl}/student/player?lessonId=${encodeURIComponent(input.lessonId)}&stepId=${encodeURIComponent(input.stepId)}`,
    { waitUntil: "domcontentloaded" },
  );

  await page.getByText("已提交，等待老师结束本轮投票", { exact: true }).waitFor();
  await page.getByText("老师结束前，你可以更新本次选择。", { exact: true }).waitFor();
  await page.getByText("课堂投票").first().waitFor();

  console.log("[phase57 proof] Student flow passed.");
  await page.close();
}

export async function runPhase57BrowserProof() {
  console.log("[phase57 proof] Preparing browser/UAT voting proof context...");
  const context = await prepareVotingProofContext();
  const externalBaseUrl = process.env.PHASE57_PROOF_BASE_URL?.trim() || null;

  let server: ServerHandle | null = null;
  let browser: Browser | null = null;

  try {
    server = externalBaseUrl ? { process: null, url: externalBaseUrl } : await startLocalServer();
    browser = await chromium.launch({ headless: true });

    console.log("[phase57 proof] Verifying teacher classroom result visibility...");
    await verifyTeacherFlow(browser, {
      baseUrl: server.url,
      sessionId: context.sessionId,
      teacherId: context.teacherId,
    });

    console.log("[phase57 proof] Verifying student waiting-state browser flow...");
    await verifyStudentFlow(browser, {
      baseUrl: server.url,
      lessonId: context.lessonId,
      stepId: context.stepId,
      studentId: context.studentId,
    });

    console.log("[phase57 proof] Browser/UAT proof passed.");
  } finally {
    await browser?.close();
    await stopLocalServer(server);
  }
}

async function main() {
  console.log("==================================================");
  console.log("Starting Phase 57 classroom runtime browser/UAT proof...");
  console.log("==================================================");
  await runPhase57BrowserProof();
  console.log("==================================================");
  console.log("Phase 57 classroom runtime browser/UAT proof PASSED!");
  console.log("==================================================");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  main().catch((error) => {
    console.error("Phase 57 browser/UAT proof failed:", error);
    process.exit(1);
  });
}
