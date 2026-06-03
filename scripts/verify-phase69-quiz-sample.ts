import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import type { InStatement } from "@libsql/client";

import { cleanupSqliteArtifacts, materializeDrizzleMigrations } from "./lib/sqlite-migration-proof";
import { getPhase69Actor, setPhase69Actor } from "./lib/phase69-auth-stub";

const DB_PATH = path.join("/tmp/opencode", `phase69-verify-${randomUUID()}.db`);
process.env.DB_FILE_NAME = `file:${DB_PATH}`;
process.env.OPENLEARN_VERIFY_ACTOR_ID = "";

const SCHOOL_ID = "school-69-01";
const TEACHER_ID = "teacher-69-01";
const STUDENT_ID = "student-69-01";
const CLASS_ID = "class-69-01";
const COURSE_ID = "course-69-01";
const LESSON_ID = "lesson-69-01";
const STEP_ID = "step-69-quiz";
const PUBLISHED_VERSION_ID = "pub-69-01";
const QUIZ_SAMPLE_PLUGIN_ID = "builtin-teaching-step-quiz-sample";
const QUIZ_SAMPLE_PLUGIN_KEY = "quiz";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function applyJournalDroppedCatchUp(client: Awaited<ReturnType<typeof materializeDrizzleMigrations>>) {
  const sqlPath = path.join(process.cwd(), "drizzle", "0013_phase54_audit_summary_truth.sql");
  const statements = readFileSync(sqlPath, "utf8")
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  for (const statement of statements) {
    await client.execute(statement);
  }
}

async function seedFixtures(client: Awaited<ReturnType<typeof materializeDrizzleMigrations>>) {
  const pluginManifest = JSON.stringify({
    id: QUIZ_SAMPLE_PLUGIN_ID,
    version: "1.0.0",
    manifestVersion: 2,
    permissions: ["lesson:write:suggestion"],
    anchors: ["lesson.sidebar"],
    actions: ["suggestBuiltInTeachingStep", "insertBuiltInTeachingStepTemplate"],
    builtIn: true,
    defaultEnabled: true,
    nonDeletable: true,
    governance: {
      manifestVersion: 2,
      contractVersion: "v2",
      requestedCapabilities: [],
      permissions: ["lesson:write:suggestion"],
      lifecycle: {
        ownerType: "host",
        installScope: "school",
        initialState: "installed",
        mountMode: "manual",
      },
    },
  });

  const lessonPayload = JSON.stringify({
    type: "quiz",
    question: "原始题干",
    options: ["原始 A", "原始 B", "原始 C", "原始 D"],
    materialRefs: [],
    correctOptionIndex: 0,
    explanation: "原始解释",
    allowRetry: true,
    retryPolicy: "unlimited",
    revealCorrectAnswer: true,
    builtInSource: {
      pluginId: QUIZ_SAMPLE_PLUGIN_ID,
      builtInKey: "quizSample",
      pluginName: "互动答题（样板）",
    },
  });

  const stepExtensionPayload = JSON.stringify({
    kind: "quiz-sample",
    contractVersion: "v1",
    executableConfig: {
      prompt: "请选择你认为正确的答案。",
      options: [
        { slot: "A", label: "选项 A", enabled: true },
        { slot: "B", label: "选项 B", enabled: true },
        { slot: "C", label: "选项 C", enabled: true },
        { slot: "D", label: "选项 D", enabled: true }
      ],
      correctOption: "A"
    },
    builtInSource: {
      pluginId: QUIZ_SAMPLE_PLUGIN_ID,
      builtInKey: "quizSample",
      pluginName: "互动答题（样板）"
    }
  });

  const publishedSnapshot = JSON.stringify({
    lesson: { id: LESSON_ID, title: "Phase 69 Quiz Sample" },
    steps: [
      {
        id: STEP_ID,
        lessonId: LESSON_ID,
        type: "quiz",
        title: "互动答题（样板）",
        rank: "a0",
        payload: {
          type: "quiz",
          question: "老师修改后的题干",
          options: ["答案 A", "答案 B", "答案 C"],
          materialRefs: [],
          correctOptionIndex: 1,
          explanation: "这是正确答案解释",
          allowRetry: true,
          retryPolicy: "unlimited",
          revealCorrectAnswer: true,
          builtInSource: {
            pluginId: QUIZ_SAMPLE_PLUGIN_ID,
            builtInKey: "quizSample",
            pluginName: "互动答题（样板）"
          }
        }
      }
    ],
    materials: []
  });

  const statements: InStatement[] = [
    { sql: `INSERT INTO user (id, name) VALUES (?, ?)`, args: [TEACHER_ID, "Phase69 Teacher"] },
    { sql: `INSERT INTO user (id, name) VALUES (?, ?)`, args: [STUDENT_ID, "Phase69 Student"] },
    { sql: `INSERT INTO school (id, name, createdAt) VALUES (?, ?, 0)`, args: [SCHOOL_ID, "Phase69 School"] },
    { sql: `INSERT INTO membership (id, userId, schoolId, role, status) VALUES (?, ?, ?, 'teacher', 'active')`, args: ["membership-teacher-69", TEACHER_ID, SCHOOL_ID] },
    { sql: `INSERT INTO membership (id, userId, schoolId, role, status) VALUES (?, ?, ?, 'student', 'active')`, args: ["membership-student-69", STUDENT_ID, SCHOOL_ID] },
    { sql: `INSERT INTO class (id, schoolId, name) VALUES (?, ?, ?)`, args: [CLASS_ID, SCHOOL_ID, "Phase69 班级"] },
    { sql: `INSERT INTO classMember (id, classId, userId, role) VALUES (?, ?, ?, 'student')`, args: ["class-member-student-69", CLASS_ID, STUDENT_ID] },
    { sql: `INSERT INTO course (id, schoolId, ownerId, title, subject, grade, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 'draft', 0, 0)`, args: [COURSE_ID, SCHOOL_ID, TEACHER_ID, "Phase69 课程", "信息科技", "七年级"] },
    { sql: `INSERT INTO courseClass (courseId, classId) VALUES (?, ?)`, args: [COURSE_ID, CLASS_ID] },
    { sql: `INSERT INTO courseEnrollment (id, courseId, studentId, status, createdAt) VALUES (?, ?, ?, 'active', 0)`, args: ["enrollment-student-69", COURSE_ID, STUDENT_ID] },
    { sql: `INSERT INTO lesson (id, courseId, createdById, title, objective, status, revision, publishedVersionId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 'published', 1, ?, 0, 0)`, args: [LESSON_ID, COURSE_ID, TEACHER_ID, "Phase69 课时", "验证 quiz sample 治理链路", PUBLISHED_VERSION_ID] },
    { sql: `INSERT INTO lessonStep (id, lessonId, type, title, rank, payloadJson, createdAt, updatedAt) VALUES (?, ?, 'quiz', ?, 'a0', ?, 0, 0)`, args: [STEP_ID, LESSON_ID, "互动答题（样板）", lessonPayload] },
    { sql: `INSERT INTO pluginRegistration (id, schoolId, name, manifestJson, pluginKey, dbNamespace, sourceType, installSource, enabled, killSwitchEnabled, lifecycleState, dataVersion, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 'default', 'bootstrap', 1, 0, 'ready', 1, 0, 0)`, args: [QUIZ_SAMPLE_PLUGIN_ID, SCHOOL_ID, "互动答题（样板）", pluginManifest, QUIZ_SAMPLE_PLUGIN_KEY, "quiz"] },
    { sql: `INSERT INTO plugin_ext_lesson_step (id, schoolId, pluginId, lessonStepId, payloadJson, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 0, 0)`, args: ["step-extension-69", SCHOOL_ID, QUIZ_SAMPLE_PLUGIN_ID, STEP_ID, stepExtensionPayload] },
    { sql: `INSERT INTO publishedLessonVersion (id, lessonId, version, snapshotJson, publishedById, publishedAt) VALUES (?, ?, 1, ?, ?, 0)`, args: [PUBLISHED_VERSION_ID, LESSON_ID, publishedSnapshot, TEACHER_ID] },
    { sql: `INSERT INTO systemTransportSetting (id, classroomTransportMode, updatedById, updatedAt) VALUES ('default', 'local_only', ?, 0)`, args: [TEACHER_ID] }
  ];

  for (const statement of statements) {
    await client.execute(statement);
  }
}

async function main() {
  console.log("==================================================");
  console.log("Phase 69 close-gate verification starting...");
  console.log("==================================================");

  const seedClient = await materializeDrizzleMigrations(`file:${DB_PATH}`);
  await applyJournalDroppedCatchUp(seedClient);
  await seedFixtures(seedClient);
  await (seedClient as { close?: () => Promise<void> | void }).close?.();

  const { BUILT_IN_TEACHING_STEP_DEFINITIONS } = await import("@/lib/dto/resource-ai");
  const { saveQuizSampleLessonStepConfig } = await import("@/lib/dal/lesson-authoring");
  const { launchClassroomSession, recordClassroomVotingRoundControl, submitQuizSampleAnswer } = await import("@/lib/dal/classroom");
  const { db } = await import("@/db");
  const { pluginRegistrations, quizAttempts, governanceAudits } = await import("@/db/schema");
  const { pluginOwnedQuizQuestions, pluginOwnedQuizResponses } = await import("@/db/schema/generated/plugin-owned/quiz");
  const { and, eq, count: countFn } = await import("drizzle-orm");

  try {
    console.log("[1/6] Built-in registration and discoverability...");
    const builtInDefinition = BUILT_IN_TEACHING_STEP_DEFINITIONS.find((item) => item.builtInKey === "quizSample");
    assert(builtInDefinition?.pluginKey === QUIZ_SAMPLE_PLUGIN_ID, "quiz sample built-in definition missing or pluginKey mismatch");

    const pluginRow = await db.query.pluginRegistrations.findFirst({
      where: eq(pluginRegistrations.id, QUIZ_SAMPLE_PLUGIN_ID),
    });
    assert(pluginRow?.pluginKey === QUIZ_SAMPLE_PLUGIN_KEY, "bootstrap plugin registration missing quiz sample pluginKey=quiz");
    console.log("  ✓ Built-in host and bootstrap registration are aligned.");

    console.log("[2/6] Teacher authoring save path...");
    setPhase69Actor(TEACHER_ID);
    process.env.OPENLEARN_VERIFY_ACTOR_ID = TEACHER_ID;
    const saveResult = await saveQuizSampleLessonStepConfig({
      stepId: STEP_ID,
      title: "互动答题（样板）",
      pluginId: QUIZ_SAMPLE_PLUGIN_ID,
      expectedUpdatedAt: new Date(0).toISOString(),
      executableConfig: {
        prompt: "老师修改后的题干",
        options: [
          { slot: "A", label: "答案 A", enabled: true },
          { slot: "B", label: "答案 B", enabled: true },
          { slot: "C", label: "答案 C", enabled: true },
          { slot: "D", label: "无效占位", enabled: false },
        ],
        correctOption: "B",
      },
    });
    assert(saveResult.ok === true, "teacher quiz sample save did not return ok=true");

    await expectInvalidSave(saveQuizSampleLessonStepConfig);
    const questionRowsBeforeLaunch = await db.select({ c: countFn() }).from(pluginOwnedQuizQuestions);
    assert(Number(questionRowsBeforeLaunch[0]?.c ?? 0) === 0, "authoring save must not write plugin_owned_quiz_questions");
    console.log("  ✓ Teacher config save works and does not backdoor snapshot table writes.");

    console.log("[3/6] Launch freeze question snapshot...");
    process.env.OPENLEARN_VERIFY_ACTOR_ID = TEACHER_ID;
    const launchedSnapshot = await launchClassroomSession({
      lessonId: LESSON_ID,
      publishedVersionId: PUBLISHED_VERSION_ID,
      classId: CLASS_ID,
    });
    const sessionId = launchedSnapshot.sessionId;
    assert(typeof sessionId === "string" && sessionId.length > 0, "launch did not return sessionId");

    const frozenQuestions = await db.select().from(pluginOwnedQuizQuestions).where(eq(pluginOwnedQuizQuestions.classroomSession, sessionId));
    assert(frozenQuestions.length === 1, `expected 1 frozen quiz sample row, got ${frozenQuestions.length}`);
    assert(frozenQuestions[0]?.prompt === "老师修改后的题干", "frozen prompt mismatch");
    assert(frozenQuestions[0]?.optionAText === "答案 A", "frozen option A mismatch");
    assert(frozenQuestions[0]?.optionBText === "答案 B", "frozen option B mismatch");
    assert(frozenQuestions[0]?.optionCText === "答案 C", "frozen option C mismatch");
    assert(frozenQuestions[0]?.optionDText === null, "disabled option D should freeze as null");
    assert(frozenQuestions[0]?.correctOption === "B", "frozen correct option mismatch");
    console.log("  ✓ Launch froze session-scoped question snapshot rows.");

    console.log("[4/6] Student first answer and re-answer append-only latest semantics...");
    process.env.OPENLEARN_VERIFY_ACTOR_ID = TEACHER_ID;
    await recordClassroomVotingRoundControl({ sessionId, stepId: STEP_ID, command: "start-voting-round" });
    setPhase69Actor(STUDENT_ID);
    process.env.OPENLEARN_VERIFY_ACTOR_ID = STUDENT_ID;
    const firstAnswer = await submitQuizSampleAnswer({
      lessonId: LESSON_ID,
      sessionId,
      stepId: STEP_ID,
      selectedOption: "A",
    });
    assert(firstAnswer.attemptNo === 1, `expected first attemptNo=1, got ${firstAnswer.attemptNo}`);

    const secondAnswer = await submitQuizSampleAnswer({
      lessonId: LESSON_ID,
      sessionId,
      stepId: STEP_ID,
      selectedOption: "B",
    });
    assert(secondAnswer.attemptNo === 2, `expected second attemptNo=2, got ${secondAnswer.attemptNo}`);

    const responseRows = await db
      .select()
      .from(pluginOwnedQuizResponses)
      .where(
        and(
          eq(pluginOwnedQuizResponses.classroomSession, sessionId),
          eq(pluginOwnedQuizResponses.student, STUDENT_ID),
          eq(pluginOwnedQuizResponses.question, STEP_ID),
        ),
      );
    assert(responseRows.length === 2, `expected 2 response rows after re-answer, got ${responseRows.length}`);
    const latestRows = responseRows.filter((row) => row.isLatest);
    assert(latestRows.length === 1 && latestRows[0]?.selectedOption === "B", "latest quiz sample answer is not the second answer");
    console.log("  ✓ Student answer path is append-only with latest-one-vote semantics.");

    console.log("[5/6] No core quizAttempts backdoor and governance-visible writes...");
    const coreQuizAttemptRows = await db.select({ c: countFn() }).from(quizAttempts);
    assert(Number(coreQuizAttemptRows[0]?.c ?? 0) === 0, "quiz sample path must not write core quizAttempts");

    const writeAudits = await db.select({ c: countFn() }).from(governanceAudits).where(eq(governanceAudits.action, "plugin.data.upsert"));
    assert(Number(writeAudits[0]?.c ?? 0) >= 2, "expected governance-visible plugin.data.upsert audits for student answers");
    console.log("  ✓ No core backdoor writes; governed plugin-owned write audits are visible.");

    console.log("[6/6] Closed round rejects further answer updates...");
    setPhase69Actor(TEACHER_ID);
    process.env.OPENLEARN_VERIFY_ACTOR_ID = TEACHER_ID;
    await recordClassroomVotingRoundControl({ sessionId, stepId: STEP_ID, command: "end-voting-round" });
    setPhase69Actor(STUDENT_ID);
    process.env.OPENLEARN_VERIFY_ACTOR_ID = STUDENT_ID;
    let rejected = false;
    try {
      await submitQuizSampleAnswer({
        lessonId: LESSON_ID,
        sessionId,
        stepId: STEP_ID,
        selectedOption: "C",
      });
    } catch (error) {
      rejected = error instanceof Error && error.message === "QUIZ_SAMPLE_SUBMISSION_CLOSED";
    }
    assert(rejected, "closed quiz sample round must reject further submissions with QUIZ_SAMPLE_SUBMISSION_CLOSED");
    console.log("  ✓ Closed-round resubmission is rejected.");

    console.log("==================================================");
    console.log("Phase 69 close-gate verification passed.");
    console.log("==================================================");
  } finally {
    setPhase69Actor(null);
    process.env.OPENLEARN_VERIFY_ACTOR_ID = "";
    cleanupSqliteArtifacts(DB_PATH);
  }
}

async function expectInvalidSave(
  saveQuizSampleLessonStepConfig: (input: {
    stepId: string;
    title: string;
    pluginId: string;
    expectedUpdatedAt: string;
    executableConfig: {
      prompt: string;
      options: Array<{ slot: "A" | "B" | "C" | "D"; label: string; enabled: boolean }>;
      correctOption: "A" | "B" | "C" | "D";
    };
  }) => Promise<unknown>,
) {
  let invalidRejected = false;
  try {
    await saveQuizSampleLessonStepConfig({
      stepId: STEP_ID,
      title: "非法配置",
      pluginId: QUIZ_SAMPLE_PLUGIN_ID,
      expectedUpdatedAt: new Date(0).toISOString(),
      executableConfig: {
        prompt: "非法配置",
        options: [
          { slot: "A", label: "只有一个选项", enabled: true },
          { slot: "B", label: "", enabled: false },
          { slot: "C", label: "", enabled: false },
          { slot: "D", label: "", enabled: false },
        ],
        correctOption: "B",
      },
    });
  } catch {
    invalidRejected = true;
  }

  assert(invalidRejected, "invalid teacher quiz sample config should be rejected");
}

main().catch((error) => {
  console.error("Phase 69 close-gate failed:", error);
  cleanupSqliteArtifacts(DB_PATH);
  process.exitCode = 1;
});
