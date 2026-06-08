import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { sql } from "drizzle-orm";

const RUNNER_FLAG = "--phase74-observation-runner";
const OBSERVATION_TARGETS_PATH =
  ".planning/phases/74-v4-1-authoritative-close-gate-multi-type-live-dashboard/74-OBSERVATION-TARGETS.md";

const FIXTURE = {
  classId: "phase74-observation-class",
  classMemberId: "phase74-observation-class-member-student",
  courseId: "phase74-observation-course",
  enrollmentId: "phase74-observation-enrollment-student",
  lessonId: "phase74-observation-lesson",
  publishedVersionId: "phase74-observation-published-version",
  pluginRegistrationId: "builtin-teaching-step-quiz-sample",
  className: "Phase 74 观察班级",
  courseTitle: "Phase 74 观察课程",
  lessonTitle: "Phase 74 /classroom 观察课时",
} as const;

const OBSERVATION_STEPS = [
  {
    id: "phase74-step-single-choice",
    title: "单选题：抓住主旨",
    question: "这段材料最核心的主题是什么？",
    options: ["合作学习", "课堂秩序", "评价排名"],
    correctOptionIndex: 0,
    questionType: "single_choice",
    correctOption: "A",
    endedAnswer: "A",
  },
  {
    id: "phase74-step-multi-choice",
    title: "多选题：辨识关键特征",
    question: "哪些特征属于实时作答面板？",
    options: ["按题分布", "作答流水", "评分入口", "Recent limit"],
    correctOptionIndex: 0,
    questionType: "multi_choice",
    correctOption: "A,B,D",
    endedAnswer: "A,B,D",
  },
  {
    id: "phase74-step-true-false",
    title: "判断题：只读姿态",
    question: "教师实时作答面板包含批改写入口。",
    options: ["True", "False"],
    correctOptionIndex: 1,
    questionType: "true_false",
    correctOption: "B",
    endedAnswer: "B",
  },
  {
    id: "phase74-step-fill-blank",
    title: "填空题：回忆文案",
    question: "题目复盘区块的标题是“____”。",
    options: ["题目复盘", "课堂排行"],
    correctOptionIndex: 0,
    questionType: "fill_blank",
    correctOption: "题目复盘",
    endedAnswer: "题目复盘",
  },
  {
    id: "phase74-step-ordering",
    title: "排序题：观察顺序",
    question: "请按推荐观察顺序排列：标题区、统计块、学生复盘。",
    options: ["标题区", "统计块", "学生复盘"],
    correctOptionIndex: 0,
    questionType: "ordering",
    correctOption: "A,B,C",
    endedAnswer: "A,B,C",
  },
] as const;

type ObservationStep = (typeof OBSERVATION_STEPS)[number];
type AppDb = (typeof import("@/db"))["db"];
type AppSchema = typeof import("@/db/schema");
type ObservationUrls = {
  liveSessionId: string;
  liveUrl: string;
  endedSessionId: string;
  endedUrl: string;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function buildPublishedSnapshot(pluginId: string) {
  return {
    lesson: {
      id: FIXTURE.lessonId,
      title: FIXTURE.lessonTitle,
      objective: "为 Phase 74 真人 checkpoint 预置 live/ended /classroom 观察目标",
    },
    course: {
      title: FIXTURE.courseTitle,
    },
    steps: OBSERVATION_STEPS.map((step, index) => ({
      id: step.id,
      lessonId: FIXTURE.lessonId,
      type: "quiz",
      title: step.title,
      rank: `${String.fromCharCode(97 + index)}0`,
        payload: {
          type: "quiz",
          question: step.question,
          options: step.options,
          questionType: step.questionType,
          correctAnswerValue: step.correctOption,
          correctOptionIndex: step.correctOptionIndex,
          explanation: "Phase 74 observation fixture",
          allowRetry: true,
        retryPolicy: "unlimited",
        revealCorrectAnswer: true,
        builtInSource: {
          pluginId,
          builtInKey: "quizSample",
          pluginName: "互动答题（样板）",
        },
      },
    })),
    materials: [],
  };
}

function buildPluginManifest(pluginId: string) {
  return {
    id: pluginId,
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
  };
}

async function runPreparationLane() {
  const seedModule = await import("./seed-test-accounts");
  const seedApi = ((seedModule as { default?: unknown }).default ?? seedModule) as typeof import("./seed-test-accounts");
  process.env.DB_FILE_NAME = seedApi.resolveSeedDatabaseUrl();

  const [prepareModule, authStubModule, classroomModule, dbModule, schemaModule, drizzle] = await Promise.all([
    import("./prepare-dev-db"),
    import("./lib/phase74-observation-auth-stub"),
    import("@/lib/dal/classroom"),
    import("@/db"),
    import("@/db/schema"),
    import("drizzle-orm"),
  ]);

  const { and, eq } = drizzle;
  const prepareApi = ((prepareModule as { default?: unknown }).default ?? prepareModule) as typeof import("./prepare-dev-db");
  const authStub = ((authStubModule as { default?: unknown }).default ?? authStubModule) as typeof import("./lib/phase74-observation-auth-stub");
  const classroomApi = ((classroomModule as { default?: unknown }).default ?? classroomModule) as typeof import("@/lib/dal/classroom");
  const { db } = (((dbModule as { default?: unknown }).default ?? dbModule) as typeof import("@/db"));
  const schema = (((schemaModule as { default?: unknown }).default ?? schemaModule) as AppSchema);
  const { setPhase74ObservationActor } = authStub;
  const {
    launchClassroomSession,
    endClassroomSession,
    recordClassroomVotingRoundControl,
    submitQuizSampleAnswer,
    getClassroomConsoleDTO,
    getClassroomSessionRecapDTO,
    changeClassroomActiveStep,
  } = classroomApi;
  const { seedTestAccounts } = seedApi;

  await prepareApi.prepareDevDb();
  await ensurePhase73QuestionTypeCatchUp({ db, schema });
  const seeded = await seedTestAccounts();
  const teacherId = seeded.teacher.id;
  const studentId = seeded.student.id;
  const schoolId = seeded.school.id;

  const pluginRegistrationId = await ensurePluginRegistration({ db, schema, and, eq, schoolId });
  await ensureClassFixture({ db, schema, eq, schoolId, studentId });
  await ensureCourseFixture({ db, schema, eq, schoolId, teacherId, studentId });
  await ensureLessonFixture({ db, schema, eq, teacherId, pluginRegistrationId });

  const liveTarget = await createLiveObservationSession({
    db,
    schema,
    and,
    eq,
    launchClassroomSession,
    recordClassroomVotingRoundControl,
    submitQuizSampleAnswer,
    setPhase74ObservationActor,
    teacherId,
    studentId,
  });
  const endedTarget = await createEndedObservationSession({
    db,
    schema,
    and,
    eq,
    launchClassroomSession,
    recordClassroomVotingRoundControl,
    submitQuizSampleAnswer,
    changeClassroomActiveStep,
    endClassroomSession,
    getClassroomSessionRecapDTO,
    setPhase74ObservationActor,
    teacherId,
    studentId,
  });

  setPhase74ObservationActor(teacherId);
  const consoleData = await getClassroomConsoleDTO();
  const sessionIds = new Set(consoleData.sessionEntries.map((session) => session.id));
  assert(sessionIds.has(liveTarget.liveSessionId), "OBSERVATION_PREPARATION_FAILED: live session missing from sessionEntries");
  assert(sessionIds.has(endedTarget.endedSessionId), "OBSERVATION_PREPARATION_FAILED: ended session missing from sessionEntries");

  const targets = {
    liveSessionId: liveTarget.liveSessionId,
    liveUrl: `/classroom?sessionId=${liveTarget.liveSessionId}&tab=live-answer`,
    endedSessionId: endedTarget.endedSessionId,
    endedUrl: `/classroom?sessionId=${endedTarget.endedSessionId}`,
  } satisfies ObservationUrls;

  await writeObservationArtifact(targets);
  console.log(`Prepared Phase 74 observation targets:\n- ${targets.liveUrl}\n- ${targets.endedUrl}`);
}

async function ensurePhase73QuestionTypeCatchUp(input: {
  db: AppDb;
  schema: AppSchema;
}) {
  const questionTypeColumn = await input.db.values(sql.raw('PRAGMA table_info("plugin_owned_quiz_questions")'));
  const hasQuestionType = questionTypeColumn.some((row) => String(row[1] ?? "") === "questionType");
  if (hasQuestionType) {
    return;
  }

  const migrationSql = readFileSync(path.join(process.cwd(), "drizzle", "0016_phase73_question_type.sql"), "utf8").trim();
  if (!migrationSql) {
    throw new Error("OBSERVATION_PREPARATION_FAILED: missing 0016_phase73_question_type.sql catch-up");
  }

  await input.db.run(sql.raw(migrationSql));
}

async function ensurePluginRegistration(input: {
  db: AppDb;
  schema: AppSchema;
  and: typeof import("drizzle-orm").and;
  eq: typeof import("drizzle-orm").eq;
  schoolId: string;
}) {
  const existingBySchoolAndKey = await input.db
    .select({ id: input.schema.pluginRegistrations.id, pluginKey: input.schema.pluginRegistrations.pluginKey })
    .from(input.schema.pluginRegistrations)
    .where(
      input.and(
        input.eq(input.schema.pluginRegistrations.schoolId, input.schoolId),
        input.eq(input.schema.pluginRegistrations.pluginKey, "quiz"),
      ),
    )
    .limit(1);
  const existingById = await input.db
    .select({ id: input.schema.pluginRegistrations.id, schoolId: input.schema.pluginRegistrations.schoolId, pluginKey: input.schema.pluginRegistrations.pluginKey })
    .from(input.schema.pluginRegistrations)
    .where(input.eq(input.schema.pluginRegistrations.id, FIXTURE.pluginRegistrationId))
    .limit(1);

  const reusableRegistration = existingBySchoolAndKey[0] ?? null;
  const chosenPluginId = reusableRegistration?.id
    ?? (existingById[0] ? `phase74-observation-plugin-${input.schoolId}` : FIXTURE.pluginRegistrationId);

  const values = {
    id: chosenPluginId,
    schoolId: input.schoolId,
    name: "互动答题（样板）",
    manifestJson: buildPluginManifest(chosenPluginId),
    pluginKey: "quiz",
    dbNamespace: "quiz",
    sourceType: "default" as const,
    installSource: "bootstrap" as const,
    enabled: true,
    killSwitchEnabled: false,
    lifecycleState: "ready" as const,
    dataVersion: 1,
    updatedAt: new Date(),
  };

  if (reusableRegistration) {
    await input.db
      .update(input.schema.pluginRegistrations)
      .set(values)
      .where(input.eq(input.schema.pluginRegistrations.id, reusableRegistration.id));
    return reusableRegistration.id;
  }

  await input.db.insert(input.schema.pluginRegistrations).values({
    ...values,
    createdAt: new Date(),
  });
  return chosenPluginId;
}

async function ensureClassFixture(input: {
  db: AppDb;
  schema: AppSchema;
  eq: typeof import("drizzle-orm").eq;
  schoolId: string;
  studentId: string;
}) {
  const existingClass = await input.db.query.classes.findFirst({
    where: input.eq(input.schema.classes.id, FIXTURE.classId),
  });

  if (existingClass) {
    await input.db
      .update(input.schema.classes)
      .set({ schoolId: input.schoolId, name: FIXTURE.className })
      .where(input.eq(input.schema.classes.id, FIXTURE.classId));
  } else {
    await input.db.insert(input.schema.classes).values({
      id: FIXTURE.classId,
      schoolId: input.schoolId,
      name: FIXTURE.className,
    });
  }

  const existingMember = await input.db.query.classMembers.findFirst({
    where: input.eq(input.schema.classMembers.id, FIXTURE.classMemberId),
  });
  if (existingMember) {
    await input.db
      .update(input.schema.classMembers)
      .set({ classId: FIXTURE.classId, userId: input.studentId, role: "student" })
      .where(input.eq(input.schema.classMembers.id, FIXTURE.classMemberId));
  } else {
    await input.db.insert(input.schema.classMembers).values({
      id: FIXTURE.classMemberId,
      classId: FIXTURE.classId,
      userId: input.studentId,
      role: "student",
    });
  }
}

async function ensureCourseFixture(input: {
  db: AppDb;
  schema: AppSchema;
  eq: typeof import("drizzle-orm").eq;
  schoolId: string;
  teacherId: string;
  studentId: string;
}) {
  const existingCourse = await input.db.query.courses.findFirst({
    where: input.eq(input.schema.courses.id, FIXTURE.courseId),
  });
  const courseValues = {
    schoolId: input.schoolId,
    ownerId: input.teacherId,
    title: FIXTURE.courseTitle,
    subject: "语文",
    grade: "七年级",
    status: "draft" as const,
    updatedAt: new Date(),
  };

  if (existingCourse) {
    await input.db
      .update(input.schema.courses)
      .set(courseValues)
      .where(input.eq(input.schema.courses.id, FIXTURE.courseId));
  } else {
    await input.db.insert(input.schema.courses).values({
      id: FIXTURE.courseId,
      ...courseValues,
      createdAt: new Date(),
    });
  }

  const existingCourseClass = await input.db.query.courseClasses.findFirst({
    where: input.eq(input.schema.courseClasses.courseId, FIXTURE.courseId),
  });
  if (!existingCourseClass) {
    await input.db.insert(input.schema.courseClasses).values({
      courseId: FIXTURE.courseId,
      classId: FIXTURE.classId,
    });
  }

  const existingEnrollment = await input.db.query.courseEnrollments.findFirst({
    where: input.eq(input.schema.courseEnrollments.id, FIXTURE.enrollmentId),
  });
  if (existingEnrollment) {
    await input.db
      .update(input.schema.courseEnrollments)
      .set({
        courseId: FIXTURE.courseId,
        studentId: input.studentId,
        status: "active",
      })
      .where(input.eq(input.schema.courseEnrollments.id, FIXTURE.enrollmentId));
  } else {
    await input.db.insert(input.schema.courseEnrollments).values({
      id: FIXTURE.enrollmentId,
      courseId: FIXTURE.courseId,
      studentId: input.studentId,
      status: "active",
      createdAt: new Date(),
    });
  }
}

async function ensureLessonFixture(input: {
  db: AppDb;
  schema: AppSchema;
  eq: typeof import("drizzle-orm").eq;
  teacherId: string;
  pluginRegistrationId: string;
}) {
  const snapshot = buildPublishedSnapshot(input.pluginRegistrationId);
  const lessonValues = {
    courseId: FIXTURE.courseId,
    createdById: input.teacherId,
    title: FIXTURE.lessonTitle,
    objective: "Phase 74 真人签核观察目标",
    status: "published" as const,
    revision: 1,
    publishedVersionId: FIXTURE.publishedVersionId,
    updatedAt: new Date(),
  };
  const existingLesson = await input.db.query.lessons.findFirst({
    where: input.eq(input.schema.lessons.id, FIXTURE.lessonId),
  });

  if (existingLesson) {
    await input.db
      .update(input.schema.lessons)
      .set(lessonValues)
      .where(input.eq(input.schema.lessons.id, FIXTURE.lessonId));
  } else {
    await input.db.insert(input.schema.lessons).values({
      id: FIXTURE.lessonId,
      ...lessonValues,
      createdAt: new Date(),
    });
  }

  for (const [index, step] of OBSERVATION_STEPS.entries()) {
    const stepPayload = {
      type: "quiz",
      question: step.question,
      options: step.options,
      questionType: step.questionType,
      correctAnswerValue: step.correctOption,
      correctOptionIndex: step.correctOptionIndex,
      explanation: "Phase 74 observation fixture",
      allowRetry: true,
      retryPolicy: "unlimited",
      revealCorrectAnswer: true,
      builtInSource: {
        pluginId: input.pluginRegistrationId,
        builtInKey: "quizSample",
        pluginName: "互动答题（样板）",
      },
    };
    const existingStep = await input.db.query.lessonSteps.findFirst({
      where: input.eq(input.schema.lessonSteps.id, step.id),
    });

    if (existingStep) {
      await input.db
        .update(input.schema.lessonSteps)
        .set({
          lessonId: FIXTURE.lessonId,
          type: "quiz",
          title: step.title,
          rank: `${String.fromCharCode(97 + index)}0`,
          payloadJson: stepPayload,
          archivedAt: null,
          updatedAt: new Date(),
        })
        .where(input.eq(input.schema.lessonSteps.id, step.id));
    } else {
      await input.db.insert(input.schema.lessonSteps).values({
        id: step.id,
        lessonId: FIXTURE.lessonId,
        type: "quiz",
        title: step.title,
        rank: `${String.fromCharCode(97 + index)}0`,
        payloadJson: stepPayload,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  const publishedVersion = await input.db.query.publishedLessonVersions.findFirst({
    where: input.eq(input.schema.publishedLessonVersions.id, FIXTURE.publishedVersionId),
  });

  if (publishedVersion) {
    await input.db
      .update(input.schema.publishedLessonVersions)
      .set({
        lessonId: FIXTURE.lessonId,
        version: 1,
        snapshotJson: snapshot,
        publishedById: input.teacherId,
        publishedAt: new Date(),
      })
      .where(input.eq(input.schema.publishedLessonVersions.id, FIXTURE.publishedVersionId));
  } else {
    await input.db.insert(input.schema.publishedLessonVersions).values({
      id: FIXTURE.publishedVersionId,
      lessonId: FIXTURE.lessonId,
      version: 1,
      snapshotJson: snapshot,
      publishedById: input.teacherId,
      publishedAt: new Date(),
    });
  }
}

async function createLiveObservationSession(input: {
  db: AppDb;
  schema: AppSchema;
  and: typeof import("drizzle-orm").and;
  eq: typeof import("drizzle-orm").eq;
  launchClassroomSession: typeof import("@/lib/dal/classroom").launchClassroomSession;
  recordClassroomVotingRoundControl: typeof import("@/lib/dal/classroom").recordClassroomVotingRoundControl;
  submitQuizSampleAnswer: typeof import("@/lib/dal/classroom").submitQuizSampleAnswer;
  setPhase74ObservationActor: (userId: string | null) => void;
  teacherId: string;
  studentId: string;
}) {
  input.setPhase74ObservationActor(input.teacherId);
  const snapshot = await input.launchClassroomSession({
    lessonId: FIXTURE.lessonId,
    publishedVersionId: FIXTURE.publishedVersionId,
    classId: FIXTURE.classId,
  });
  const liveSessionId = snapshot.sessionId;
  assert(typeof liveSessionId === "string" && liveSessionId.length > 0, "OBSERVATION_PREPARATION_FAILED: live session launch returned empty id");

  await input.recordClassroomVotingRoundControl({
    sessionId: liveSessionId,
    stepId: OBSERVATION_STEPS[0].id,
    command: "start-voting-round",
  });
  input.setPhase74ObservationActor(input.studentId);
  await input.submitQuizSampleAnswer({
    lessonId: FIXTURE.lessonId,
    sessionId: liveSessionId,
    stepId: OBSERVATION_STEPS[0].id,
    questionType: "single_choice",
    selectedOption: "B",
  });
  await input.submitQuizSampleAnswer({
    lessonId: FIXTURE.lessonId,
    sessionId: liveSessionId,
    stepId: OBSERVATION_STEPS[0].id,
    questionType: "single_choice",
    selectedOption: "A",
  });

  const liveSession = await input.db.query.classroomSessions.findFirst({
    where: input.eq(input.schema.classroomSessions.id, liveSessionId),
  });
  assert(liveSession?.status === "live", "OBSERVATION_PREPARATION_FAILED: live session is not live after preparation");
  return {
    liveSessionId,
  };
}

async function createEndedObservationSession(input: {
  db: AppDb;
  schema: AppSchema;
  and: typeof import("drizzle-orm").and;
  eq: typeof import("drizzle-orm").eq;
  launchClassroomSession: typeof import("@/lib/dal/classroom").launchClassroomSession;
  recordClassroomVotingRoundControl: typeof import("@/lib/dal/classroom").recordClassroomVotingRoundControl;
  submitQuizSampleAnswer: typeof import("@/lib/dal/classroom").submitQuizSampleAnswer;
  changeClassroomActiveStep: typeof import("@/lib/dal/classroom").changeClassroomActiveStep;
  endClassroomSession: typeof import("@/lib/dal/classroom").endClassroomSession;
  getClassroomSessionRecapDTO: typeof import("@/lib/dal/classroom").getClassroomSessionRecapDTO;
  setPhase74ObservationActor: (userId: string | null) => void;
  teacherId: string;
  studentId: string;
}) {
  input.setPhase74ObservationActor(input.teacherId);
  const snapshot = await input.launchClassroomSession({
    lessonId: FIXTURE.lessonId,
    publishedVersionId: FIXTURE.publishedVersionId,
    classId: FIXTURE.classId,
  });
  const endedSessionId = snapshot.sessionId;
  assert(typeof endedSessionId === "string" && endedSessionId.length > 0, "OBSERVATION_PREPARATION_FAILED: ended session launch returned empty id");

  for (const step of OBSERVATION_STEPS) {
    const currentSession = await input.db.query.classroomSessions.findFirst({
      where: input.eq(input.schema.classroomSessions.id, endedSessionId),
    });
    assert(currentSession, "OBSERVATION_PREPARATION_FAILED: ended session disappeared during step progression");

    if (currentSession.activeStepId !== step.id) {
      await input.changeClassroomActiveStep({
        sessionId: endedSessionId,
        targetStepId: step.id,
        expectedVersion: currentSession.version,
      });
    }

    input.setPhase74ObservationActor(input.teacherId);
    await input.recordClassroomVotingRoundControl({
      sessionId: endedSessionId,
      stepId: step.id,
      command: "start-voting-round",
    });

    input.setPhase74ObservationActor(input.studentId);
    await submitEndedObservationAnswer({
      submitQuizSampleAnswer: input.submitQuizSampleAnswer,
      sessionId: endedSessionId,
      step,
    });

    input.setPhase74ObservationActor(input.teacherId);
    await input.recordClassroomVotingRoundControl({
      sessionId: endedSessionId,
      stepId: step.id,
      command: "end-voting-round",
    });
  }

  input.setPhase74ObservationActor(input.teacherId);
  await input.endClassroomSession({ sessionId: endedSessionId });

  const recap = await input.getClassroomSessionRecapDTO({ sessionId: endedSessionId });
  const observedTypes = new Set(recap.quizSampleStats.questions.map((question) => question.questionType));
  assert(recap.quizSampleStats.questionCount >= OBSERVATION_STEPS.length, "OBSERVATION_PREPARATION_FAILED: ended recap question count is incomplete");
  for (const step of OBSERVATION_STEPS) {
    assert(observedTypes.has(step.questionType), `OBSERVATION_PREPARATION_FAILED: recap is missing ${step.questionType}`);
  }

  const endedSession = await input.db.query.classroomSessions.findFirst({
    where: input.eq(input.schema.classroomSessions.id, endedSessionId),
  });
  assert(endedSession?.status === "ended", "OBSERVATION_PREPARATION_FAILED: ended session did not close");
  return {
    endedSessionId,
  };
}

async function submitEndedObservationAnswer(input: {
  submitQuizSampleAnswer: typeof import("@/lib/dal/classroom").submitQuizSampleAnswer;
  sessionId: string;
  step: ObservationStep;
}) {
  const base = {
    lessonId: FIXTURE.lessonId,
    sessionId: input.sessionId,
    stepId: input.step.id,
  };

  switch (input.step.questionType) {
    case "single_choice":
      return input.submitQuizSampleAnswer({
        ...base,
        questionType: "single_choice",
        selectedOption: input.step.endedAnswer as "A" | "B" | "C" | "D",
      });
    case "multi_choice":
      return input.submitQuizSampleAnswer({
        ...base,
        questionType: "multi_choice",
        selectedOption: input.step.endedAnswer,
      });
    case "true_false":
      return input.submitQuizSampleAnswer({
        ...base,
        questionType: "true_false",
        selectedOption: input.step.endedAnswer as "A" | "B",
      });
    case "fill_blank":
      return input.submitQuizSampleAnswer({
        ...base,
        questionType: "fill_blank",
        selectedOption: input.step.endedAnswer,
      });
    case "ordering":
      return input.submitQuizSampleAnswer({
        ...base,
        questionType: "ordering",
        selectedOption: input.step.endedAnswer,
      });
  }
}

async function writeObservationArtifact(targets: ObservationUrls) {
  const absolutePath = path.join(process.cwd(), OBSERVATION_TARGETS_PATH);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(
    absolutePath,
    [
      "# Phase 74 Observation Targets",
      "",
      `teacher_login: teacher@example.com / password`,
      `live_session_id: ${targets.liveSessionId}`,
      `live_url: ${targets.liveUrl}`,
      `ended_session_id: ${targets.endedSessionId}`,
      `ended_url: ${targets.endedUrl}`,
      "preparation_source: launchClassroomSession(...) / changeClassroomActiveStep(...) / recordClassroomVotingRoundControl(...) / submitQuizSampleAnswer(...) / endClassroomSession(...) / sessionEntries",
      `generated_at: ${new Date().toISOString()}`,
      "",
      "使用说明：真人 checkpoint 只使用以上两条精确 /classroom URL，不再人工从 session list 猜目标。",
      "",
    ].join("\n"),
    "utf8",
  );
}

function runOuterWrapper() {
  execFileSync(
    process.execPath,
    [
      "--require",
      "./scripts/server-only-node-shim.cjs",
      "--import",
      "tsx",
      "scripts/prepare-phase74-observation-targets.ts",
      RUNNER_FLAG,
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        TSX_TSCONFIG_PATH: "./tsconfig.prepare-phase74.json",
      },
    },
  );
}

async function main() {
  if (process.argv.includes(RUNNER_FLAG)) {
    await runPreparationLane();
    return;
  }

  runOuterWrapper();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`OBSERVATION_PREPARATION_FAILED: ${message}`);
    process.exit(1);
  });
}
