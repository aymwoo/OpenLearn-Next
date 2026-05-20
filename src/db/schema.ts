import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const users = sqliteTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  studentNumber: text("studentNumber").unique(),
  gender: text("gender"),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  password: text("password"),
  image: text("image"),
});

export const accounts = sqliteTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = sqliteTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

export const schools = sqliteTable("school", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
});

export const memberships = sqliteTable(
  "membership",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    schoolId: text("schoolId")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // 'admin', 'teacher', 'student', 'parent', 'developer', 'ai_agent'
    status: text("status").notNull().default("active"),
  },
  (table) => [
    index("membership_userId_idx").on(table.userId),
    index("membership_schoolId_idx").on(table.schoolId)
  ]
);

export const systemTransportSettings = sqliteTable("systemTransportSetting", {
  id: text("id").primaryKey(),
  classroomTransportMode: text("classroomTransportMode", {
    enum: ["local_only", "redis_fanout"],
  })
    .notNull()
    .default("local_only"),
  updatedById: text("updatedById").references(() => users.id, {
    onDelete: "cascade",
  }),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(
    () => new Date(),
  ),
});

export const classes = sqliteTable("class", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  schoolId: text("schoolId")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

export const classMembers = sqliteTable(
  "classMember",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    classId: text("classId")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // e.g. 'teacher', 'student'
  },
  (table) => [
    index("classMember_classId_idx").on(table.classId),
    index("classMember_userId_idx").on(table.userId)
  ]
);

export const courses = sqliteTable(
  "course",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("schoolId")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    ownerId: text("ownerId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    subject: text("subject").notNull(),
    grade: text("grade").notNull(),
    status: text("status").notNull().default("draft"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    index("courses_schoolId_idx").on(table.schoolId),
    index("courses_ownerId_idx").on(table.ownerId),
  ]
);

export const courseClasses = sqliteTable(
  "courseClass",
  {
    courseId: text("courseId")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    classId: text("classId")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.courseId, table.classId] })]
);

export const courseEnrollments = sqliteTable(
  "courseEnrollment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    courseId: text("courseId")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    studentId: text("studentId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("active"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("courseEnrollments_course_student_unique").on(table.courseId, table.studentId),
    index("courseEnrollments_courseId_idx").on(table.courseId),
    index("courseEnrollments_studentId_idx").on(table.studentId),
  ]
);

export const courseImportBatch = sqliteTable(
  "courseImportBatch",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("schoolId")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    actorId: text("actorId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceType: text("sourceType", { enum: ["csv"] }).notNull().default("csv"),
    sourceLabel: text("sourceLabel").notNull(),
    status: text("status", {
      enum: ["draft", "in_review", "ready_to_apply", "applied", "partially_applied"],
    })
      .notNull()
      .default("draft"),
    rowCount: integer("rowCount").notNull().default(0),
    createdCount: integer("createdCount").notNull().default(0),
    updatedCount: integer("updatedCount").notNull().default(0),
    skippedCount: integer("skippedCount").notNull().default(0),
    failedCount: integer("failedCount").notNull().default(0),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    appliedAt: integer("appliedAt", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("courseImportBatch_school_status_idx").on(table.schoolId, table.status),
    index("courseImportBatch_actor_idx").on(table.actorId),
  ]
);

export const courseImportRow = sqliteTable(
  "courseImportRow",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    batchId: text("batchId")
      .notNull()
      .references(() => courseImportBatch.id, { onDelete: "cascade" }),
    sourceRowKey: text("sourceRowKey").notNull(),
    matchKey: text("matchKey").notNull(),
    rawPayloadJson: text("rawPayloadJson", { mode: "json" }).notNull(),
    normalizedRowJson: text("normalizedRowJson", { mode: "json" }),
    validationIssuesJson: text("validationIssuesJson", { mode: "json" }).notNull(),
    matchedCourseSnapshotJson: text("matchedCourseSnapshotJson", { mode: "json" }),
    status: text("status", {
      enum: ["ready_to_create", "matched_existing", "same_file_conflict", "invalid", "blocked"],
    })
      .notNull(),
    decision: text("decision", { enum: ["update", "skip"] }),
    result: text("result", { enum: ["created", "updated", "skipped", "failed"] }),
    resultReason: text("resultReason"),
    appliedCourseId: text("appliedCourseId").references(() => courses.id, { onDelete: "cascade" }),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    index("courseImportRow_batch_status_idx").on(table.batchId, table.status),
    uniqueIndex("courseImportRow_batch_rowKey_unique").on(table.batchId, table.sourceRowKey),
    index("courseImportRow_batch_matchKey_idx").on(table.batchId, table.matchKey),
  ]
);

export const asyncTasks = sqliteTable(
  "asyncTask",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    actorId: text("actorId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    schoolId: text("schoolId")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    taskType: text("taskType").notNull(),
    featureArea: text("featureArea", {
      enum: [
        "platform",
        "course_import",
        "schedule",
        "runtime",
        "resource_processing",
        "notifications",
      ],
    }).notNull(),
    status: text("status", {
      enum: [
        "pending_enqueue",
        "dispatching",
        "dispatch_failed",
        "queued",
        "running",
        "retrying",
        "stalled_recovery",
        "completed",
        "partially_completed",
        "failed",
        "cancelled",
      ],
    })
      .notNull()
      .default("pending_enqueue"),
    enqueueIntentStatus: text("enqueueIntentStatus", {
      enum: ["pending_enqueue", "dispatching", "dispatch_failed", "dispatched"],
    })
      .notNull()
      .default("pending_enqueue"),
    visibilityScope: text("visibilityScope", {
      enum: ["actor_owned", "school_operator", "system_operator"],
    })
      .notNull()
      .default("actor_owned"),
    entityType: text("entityType").notNull(),
    entityId: text("entityId").notNull(),
    entityLabel: text("entityLabel"),
    labelKey: text("labelKey").notNull(),
    summaryKey: text("summaryKey").notNull(),
    payloadJson: text("payloadJson", { mode: "json" }).notNull(),
    latestProgressJson: text("latestProgressJson", { mode: "json" }),
    latestResultJson: text("latestResultJson", { mode: "json" }),
    queueJobId: text("queueJobId"),
    latestAttemptNumber: integer("latestAttemptNumber").notNull().default(0),
    latestFailureReason: text("latestFailureReason"),
    latestRecoveryJson: text("latestRecoveryJson", { mode: "json" }),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    startedAt: integer("startedAt", { mode: "timestamp_ms" }),
    completedAt: integer("completedAt", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("asyncTasks_actor_status_idx").on(table.actorId, table.status),
    index("asyncTasks_school_status_idx").on(table.schoolId, table.status),
    index("asyncTasks_entity_idx").on(table.entityType, table.entityId, table.createdAt),
    index("asyncTasks_type_created_idx").on(table.taskType, table.createdAt),
    uniqueIndex("asyncTasks_queueJobId_unique").on(table.queueJobId),
  ]
);

export const asyncTaskEvents = sqliteTable(
  "asyncTaskEvent",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    taskId: text("taskId")
      .notNull()
      .references(() => asyncTasks.id, { onDelete: "cascade" }),
    eventType: text("eventType").notNull(),
    status: text("status", {
      enum: [
        "pending_enqueue",
        "dispatching",
        "dispatch_failed",
        "queued",
        "running",
        "retrying",
        "stalled_recovery",
        "completed",
        "partially_completed",
        "failed",
        "cancelled",
      ],
    }).notNull(),
    attemptNumber: integer("attemptNumber").notNull().default(0),
    payloadJson: text("payloadJson", { mode: "json" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    index("asyncTaskEvents_task_created_idx").on(table.taskId, table.createdAt),
    index("asyncTaskEvents_status_created_idx").on(table.status, table.createdAt),
    index("asyncTaskEvents_task_attempt_idx").on(table.taskId, table.attemptNumber, table.createdAt),
  ]
);

export const asyncWorkerHeartbeats = sqliteTable(
  "asyncWorkerHeartbeat",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    instanceId: text("instanceId").notNull(),
    status: text("status", {
      enum: ["ready", "stopping", "stopped"],
    })
      .notNull()
      .default("ready"),
    queueNamesJson: text("queueNamesJson", { mode: "json" }).notNull(),
    lastSeenAt: integer("lastSeenAt", { mode: "timestamp_ms" }).$defaultFn(
      () => new Date(),
    ),
    startedAt: integer("startedAt", { mode: "timestamp_ms" }),
    stoppedAt: integer("stoppedAt", { mode: "timestamp_ms" }),
    lastSignal: text("lastSignal"),
    detailJson: text("detailJson", { mode: "json" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(
      () => new Date(),
    ),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(
      () => new Date(),
    ),
  },
  (table) => [
    uniqueIndex("asyncWorkerHeartbeat_instanceId_unique").on(table.instanceId),
    index("asyncWorkerHeartbeat_status_seen_idx").on(table.status, table.lastSeenAt),
  ],
);

export const lessons = sqliteTable(
  "lesson",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    courseId: text("courseId")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    createdById: text("createdById")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    objective: text("objective").notNull(),
    status: text("status").notNull().default("draft"),
    revision: integer("revision").notNull().default(1),
    publishedVersionId: text("publishedVersionId"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [index("lessons_courseId_idx").on(table.courseId)]
);

export const lessonSteps = sqliteTable(
  "lessonStep",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    lessonId: text("lessonId")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    rank: text("rank").notNull(),
    payloadJson: text("payloadJson", { mode: "json" }).notNull(),
    archivedAt: integer("archivedAt", { mode: "timestamp_ms" }),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [index("lessonSteps_lessonId_rank_idx").on(table.lessonId, table.rank)]
);

export const lessonMaterials = sqliteTable(
  "lessonMaterial",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    lessonId: text("lessonId")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    stepId: text("stepId").references(() => lessonSteps.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    kind: text("kind").notNull().default("link"),
    url: text("url"),
    note: text("note"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [index("lessonMaterials_lessonId_idx").on(table.lessonId)]
);

export const publishedLessonVersions = sqliteTable(
  "publishedLessonVersion",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    lessonId: text("lessonId")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    snapshotJson: text("snapshotJson", { mode: "json" }).notNull(),
    publishedById: text("publishedById")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    publishedAt: integer("publishedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [index("publishedLessonVersions_lessonId_version_idx").on(table.lessonId, table.version)]
);

export const lessonStepProgress = sqliteTable(
  "lessonStepProgress",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    publishedVersionId: text("publishedVersionId")
      .notNull()
      .references(() => publishedLessonVersions.id, { onDelete: "cascade" }),
    lessonId: text("lessonId")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    stepId: text("stepId")
      .notNull()
      .references(() => lessonSteps.id, { onDelete: "cascade" }),
    studentId: text("studentId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    state: text("state", { enum: ["not_started", "in_progress", "completed", "skipped"] })
      .notNull()
      .default("not_started"),
    completedAt: integer("completedAt", { mode: "timestamp_ms" }),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("lessonStepProgress_identity_unique").on(table.publishedVersionId, table.stepId, table.studentId),
    index("lessonStepProgress_version_student_idx").on(table.publishedVersionId, table.studentId),
    index("lessonStepProgress_lesson_student_idx").on(table.lessonId, table.studentId),
  ]
);

export const taskSubmissions = sqliteTable(
  "taskSubmission",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    publishedVersionId: text("publishedVersionId")
      .notNull()
      .references(() => publishedLessonVersions.id, { onDelete: "cascade" }),
    lessonId: text("lessonId")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    stepId: text("stepId")
      .notNull()
      .references(() => lessonSteps.id, { onDelete: "cascade" }),
    studentId: text("studentId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    attemptNo: integer("attemptNo").notNull(),
    payloadJson: text("payloadJson", { mode: "json" }).notNull(),
    isLatest: integer("isLatest", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("taskSubmissions_attempt_unique").on(table.publishedVersionId, table.stepId, table.studentId, table.attemptNo),
    uniqueIndex("taskSubmissions_latest_unique").on(
      table.publishedVersionId,
      table.stepId,
      table.studentId,
      table.isLatest
    ),
    index("taskSubmissions_latest_idx").on(
      table.publishedVersionId,
      table.stepId,
      table.studentId,
      table.isLatest
    ),
    index("taskSubmissions_history_idx").on(table.publishedVersionId, table.stepId, table.studentId, table.attemptNo),
  ]
);

export const quizAttempts = sqliteTable(
  "quizAttempt",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    publishedVersionId: text("publishedVersionId")
      .notNull()
      .references(() => publishedLessonVersions.id, { onDelete: "cascade" }),
    lessonId: text("lessonId")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    stepId: text("stepId")
      .notNull()
      .references(() => lessonSteps.id, { onDelete: "cascade" }),
    studentId: text("studentId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    attemptNo: integer("attemptNo").notNull(),
    answerJson: text("answerJson", { mode: "json" }).notNull(),
    outcomeJson: text("outcomeJson", { mode: "json" }).notNull(),
    isLatest: integer("isLatest", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("quizAttempts_attempt_unique").on(table.publishedVersionId, table.stepId, table.studentId, table.attemptNo),
    uniqueIndex("quizAttempts_latest_unique").on(table.publishedVersionId, table.stepId, table.studentId, table.isLatest),
    index("quizAttempts_latest_idx").on(table.publishedVersionId, table.stepId, table.studentId, table.isLatest),
    index("quizAttempts_history_idx").on(table.publishedVersionId, table.stepId, table.studentId, table.attemptNo),
  ]
);

export const attemptFeedback = sqliteTable(
  "attemptFeedback",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    targetType: text("targetType", { enum: ["task_submission", "quiz_attempt"] }).notNull(),
    targetId: text("targetId").notNull(),
    teacherId: text("teacherId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    studentId: text("studentId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("attemptFeedback_target_unique").on(table.targetType, table.targetId),
    index("attemptFeedback_target_idx").on(table.targetType, table.targetId),
    index("attemptFeedback_student_idx").on(table.studentId),
  ]
);

export const classroomSessions = sqliteTable(
  "classroomSession",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    lessonId: text("lessonId")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    publishedVersionId: text("publishedVersionId")
      .notNull()
      .references(() => publishedLessonVersions.id, { onDelete: "cascade" }),
    classId: text("classId")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    teacherId: text("teacherId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activeStepId: text("activeStepId")
      .notNull()
      .references(() => lessonSteps.id, { onDelete: "cascade" }),
    locked: integer("locked", { mode: "boolean" }).notNull().default(false),
    transportModeSnapshot: text("transportModeSnapshot", {
      enum: ["local_only", "redis_fanout"],
    })
      .notNull()
      .default("local_only"),
    status: text("status", { enum: ["live", "ended"] }).notNull().default("live"),
    version: integer("version").notNull().default(1),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    endedAt: integer("endedAt", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("classroomSessions_lesson_class_status_idx").on(table.lessonId, table.classId, table.status),
    index("classroomSessions_version_idx").on(table.version),
  ]
);

export const classroomParticipants = sqliteTable(
  "classroomParticipant",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionId: text("sessionId")
      .notNull()
      .references(() => classroomSessions.id, { onDelete: "cascade" }),
    studentId: text("studentId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    classMemberId: text("classMemberId")
      .notNull()
      .references(() => classMembers.id, { onDelete: "cascade" }),
    connectionState: text("connectionState", { enum: ["connected", "reconnecting", "offline"] }).notNull().default("offline"),
    currentStepId: text("currentStepId")
      .notNull()
      .references(() => lessonSteps.id, { onDelete: "cascade" }),
    lastSeenAt: integer("lastSeenAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("classroomParticipants_session_student_unique").on(table.sessionId, table.studentId),
    index("classroomParticipants_session_idx").on(table.sessionId),
    index("classroomParticipants_student_idx").on(table.studentId),
  ]
);

export const classroomEvents = sqliteTable(
  "classroomEvent",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionId: text("sessionId")
      .notNull()
      .references(() => classroomSessions.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    type: text("type", { enum: ["launched", "active_step_changed", "lock_mode_changed", "slide_changed", "snapshot_refreshed", "ended"] }).notNull(),
    actorId: text("actorId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    payloadJson: text("payloadJson", { mode: "json" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    index("classroomEvents_session_version_idx").on(table.sessionId, table.version),
    index("classroomEvents_session_created_idx").on(table.sessionId, table.createdAt),
  ]
);

export const classroomEvidence = sqliteTable(
  "classroomEvidence",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionId: text("sessionId")
      .notNull()
      .references(() => classroomSessions.id, { onDelete: "cascade" }),
    studentId: text("studentId").references(() => users.id, { onDelete: "cascade" }),
    stepId: text("stepId").references(() => lessonSteps.id, { onDelete: "cascade" }),
    sourceType: text("sourceType", {
      enum: ["student-quick-response", "student-submission", "teacher-observation", "system"],
    }).notNull(),
    evidenceType: text("evidenceType", {
      enum: ["observation", "response", "artifact", "submission", "quiz-response"],
    }).notNull(),
    payloadJson: text("payloadJson", { mode: "json" }).notNull(),
    capturedById: text("capturedById")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    index("classroomEvidence_session_created_idx").on(table.sessionId, table.createdAt),
    index("classroomEvidence_session_student_idx").on(table.sessionId, table.studentId),
    index("classroomEvidence_session_step_idx").on(table.sessionId, table.stepId),
  ]
);

export const classroomTimeline = sqliteTable(
  "classroomTimeline",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionId: text("sessionId")
      .notNull()
      .references(() => classroomSessions.id, { onDelete: "cascade" }),
    studentId: text("studentId").references(() => users.id, { onDelete: "cascade" }),
    stepId: text("stepId").references(() => lessonSteps.id, { onDelete: "cascade" }),
    entryType: text("entryType", {
      enum: ["presence_changed", "evidence_captured", "intervention_noted"],
    }).notNull(),
    actorId: text("actorId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    payloadJson: text("payloadJson", { mode: "json" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    index("classroomTimeline_session_created_idx").on(table.sessionId, table.createdAt),
    index("classroomTimeline_session_entryType_idx").on(table.sessionId, table.entryType),
    index("classroomTimeline_session_student_idx").on(table.sessionId, table.studentId),
  ]
);

export const classroomSessionSummary = sqliteTable(
  "classroomSessionSummary",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionId: text("sessionId")
      .notNull()
      .references(() => classroomSessions.id, { onDelete: "cascade" }),
    schoolId: text("schoolId")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["processing", "completed", "failed"] })
      .notNull()
      .default("processing"),
    triggerMode: text("triggerMode", { enum: ["incremental", "finalize"] })
      .notNull(),
    lastEventVersion: integer("lastEventVersion").notNull().default(0),
    summaryJson: text("summaryJson", { mode: "json" }).notNull(),
    failureReason: text("failureReason"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    finalizedAt: integer("finalizedAt", { mode: "timestamp_ms" }),
  },
  (table) => [
    uniqueIndex("classroomSessionSummary_sessionId_unique").on(table.sessionId),
    index("classroomSessionSummary_school_status_idx").on(table.schoolId, table.status),
    index("classroomSessionSummary_school_trigger_idx").on(table.schoolId, table.triggerMode),
  ],
);

export const runtimeStepSessions = sqliteTable(
  "runtimeStepSession",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    classroomSessionId: text("classroomSessionId")
      .notNull()
      .references(() => classroomSessions.id, { onDelete: "cascade" }),
    publishedVersionId: text("publishedVersionId")
      .notNull()
      .references(() => publishedLessonVersions.id, { onDelete: "cascade" }),
    lessonId: text("lessonId")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    stepId: text("stepId")
      .notNull()
      .references(() => lessonSteps.id, { onDelete: "cascade" }),
    runtimeId: text("runtimeId").notNull(),
    runtimeVersion: text("runtimeVersion").notNull(),
    actorId: text("actorId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorScope: text("actorScope", { enum: ["host", "teacher", "student", "plugin", "system"] }).notNull(),
    schoolId: text("schoolId")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    resetReason: text("resetReason"),
    isLatest: integer("isLatest", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("runtimeStepSessions_latest_identity_unique").on(
      table.classroomSessionId,
      table.stepId,
      table.actorId,
      table.actorScope,
      table.runtimeVersion,
      table.isLatest,
    ),
    index("runtimeStepSessions_classroom_step_actor_idx").on(table.classroomSessionId, table.stepId, table.actorId),
    index("runtimeStepSessions_actor_history_idx").on(table.actorId, table.createdAt),
  ],
);

export const runtimeStepStates = sqliteTable(
  "runtimeStepState",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    runtimeSessionId: text("runtimeSessionId")
      .notNull()
      .references(() => runtimeStepSessions.id, { onDelete: "cascade" }),
    stateVersion: integer("stateVersion").notNull(),
    kind: text("kind", { enum: ["ready", "saved", "submitted", "reset"] }).notNull(),
    stateJson: text("stateJson", { mode: "json" }).notNull(),
    summaryJson: text("summaryJson", { mode: "json" }).notNull(),
    isLatest: integer("isLatest", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("runtimeStepStates_session_version_unique").on(table.runtimeSessionId, table.stateVersion),
    uniqueIndex("runtimeStepStates_session_latest_unique").on(table.runtimeSessionId, table.isLatest),
    index("runtimeStepStates_session_history_idx").on(table.runtimeSessionId, table.stateVersion),
  ],
);

export const runtimeEventOutbox = sqliteTable(
  "runtimeEventOutbox",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    runtimeSessionId: text("runtimeSessionId")
      .notNull()
      .references(() => runtimeStepSessions.id, { onDelete: "cascade" }),
    classroomSessionId: text("classroomSessionId")
      .notNull()
      .references(() => classroomSessions.id, { onDelete: "cascade" }),
    stepId: text("stepId")
      .notNull()
      .references(() => lessonSteps.id, { onDelete: "cascade" }),
    eventType: text("eventType").notNull(),
    messageId: text("messageId").notNull(),
    correlationId: text("correlationId").notNull(),
    payloadJson: text("payloadJson", { mode: "json" }).notNull(),
    deliveryChannel: text("deliveryChannel", { enum: ["in-process", "sse", "event-bus", "websocket"] }).notNull(),
    deliveryStatus: text("deliveryStatus", { enum: ["pending", "sent", "failed"] }).notNull().default("pending"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    deliveredAt: integer("deliveredAt", { mode: "timestamp_ms" }),
  },
  (table) => [
    uniqueIndex("runtimeEventOutbox_message_unique").on(table.messageId),
    index("runtimeEventOutbox_session_created_idx").on(table.runtimeSessionId, table.createdAt),
    index("runtimeEventOutbox_delivery_idx").on(table.deliveryStatus, table.deliveryChannel, table.createdAt),
  ],
);

export const transportDeliveryAttempts = sqliteTable(
  "transportDeliveryAttempt",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    runtimeSessionId: text("runtimeSessionId").references(() => runtimeStepSessions.id, {
      onDelete: "cascade",
    }),
    classroomSessionId: text("classroomSessionId").references(() => classroomSessions.id, {
      onDelete: "cascade",
    }),
    schoolId: text("schoolId").references(() => schools.id, { onDelete: "cascade" }),
    truthRefType: text("truthRefType").notNull(),
    truthRefId: text("truthRefId").notNull(),
    channel: text("channel").notNull(),
    kind: text("kind").notNull(),
    adapterId: text("adapterId"),
    adapterMode: text("adapterMode", { enum: ["sse", "websocket"] }),
    messageId: text("messageId").notNull(),
    correlationId: text("correlationId").notNull(),
    truthPersisted: integer("truthPersisted", { mode: "boolean" }).notNull().default(false),
    deliveryAttempted: integer("deliveryAttempted", { mode: "boolean" }).notNull().default(false),
    attemptStatus: text("attemptStatus", {
      enum: ["pending", "delivered", "failed", "skipped"],
    })
      .notNull()
      .default("pending"),
    payloadSummaryJson: text("payloadSummaryJson", { mode: "json" }).notNull(),
    failureReason: text("failureReason"),
    attemptedAt: integer("attemptedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    deliveredAt: integer("deliveredAt", { mode: "timestamp_ms" }),
    failedAt: integer("failedAt", { mode: "timestamp_ms" }),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("transportDeliveryAttempt_message_unique").on(table.messageId),
    index("transportDeliveryAttempt_truth_idx").on(table.truthRefType, table.truthRefId, table.createdAt),
    index("transportDeliveryAttempt_session_idx").on(table.classroomSessionId, table.runtimeSessionId, table.createdAt),
    index("transportDeliveryAttempt_correlation_idx").on(table.correlationId, table.createdAt),
  ],
);

export const transportConsumerTraces = sqliteTable(
  "transportConsumerTrace",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    attemptId: text("attemptId").references(() => transportDeliveryAttempts.id, { onDelete: "cascade" }),
    classroomSessionId: text("classroomSessionId").references(() => classroomSessions.id, {
      onDelete: "cascade",
    }),
    runtimeSessionId: text("runtimeSessionId").references(() => runtimeStepSessions.id, {
      onDelete: "cascade",
    }),
    correlationId: text("correlationId").notNull(),
    adapterId: text("adapterId").notNull(),
    adapterMode: text("adapterMode", { enum: ["sse", "websocket"] }).notNull(),
    traceType: text("traceType", {
      enum: ["snapshot", "keepalive", "stream_closed", "stream_failed", "runtime_event"],
    }).notNull(),
    status: text("status", { enum: ["emitted", "failed", "closed"] }).notNull(),
    snapshotVersion: integer("snapshotVersion"),
    detailJson: text("detailJson", { mode: "json" }).notNull(),
    emittedAt: integer("emittedAt", { mode: "timestamp_ms" }),
    failedAt: integer("failedAt", { mode: "timestamp_ms" }),
    closedAt: integer("closedAt", { mode: "timestamp_ms" }),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    index("transportConsumerTrace_attempt_idx").on(table.attemptId, table.createdAt),
    index("transportConsumerTrace_session_idx").on(table.classroomSessionId, table.runtimeSessionId, table.createdAt),
    index("transportConsumerTrace_correlation_idx").on(table.correlationId, table.createdAt),
  ],
);

export const resources = sqliteTable("resource", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  schoolId: text("schoolId").notNull().references(() => schools.id, { onDelete: "cascade" }),
  ownerId: text("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: text("courseId").references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  visibility: text("visibility", { enum: ["private", "course", "school"] }).notNull().default("private"),
  classification: text("classification").notNull(),
  ragEligible: integer("ragEligible", { mode: "boolean" }).notNull().default(false),
  url: text("url"),
  content: text("content"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
}, (table) => [
  index("resources_schoolId_idx").on(table.schoolId),
  index("resources_ownerId_idx").on(table.ownerId),
  index("resources_courseId_idx").on(table.courseId),
]);

export const knowledgeSources = sqliteTable("knowledgeSource", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  resourceId: text("resourceId").notNull().references(() => resources.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["pending", "processing", "completed", "failed"] }).notNull().default("pending"),
  error: text("error"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex("knowledgeSources_resourceId_unique").on(table.resourceId),
]);

export const knowledgeChunks = sqliteTable("knowledgeChunk", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sourceId: text("sourceId").notNull().references(() => knowledgeSources.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunkIndex").notNull(),
  textHash: text("textHash").notNull(),
  tokenEstimate: integer("tokenEstimate").notNull(),
  payloadJson: text("payloadJson", { mode: "json" }).notNull(),
  metadataJson: text("metadataJson", { mode: "json" }).notNull(),
  indexingStatus: text("indexingStatus", { enum: ["pending", "indexed", "failed"] }).notNull().default("pending"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex("knowledgeChunks_source_chunk_unique").on(table.sourceId, table.chunkIndex),
]);

export const agentRegistry = sqliteTable("agentRegistry", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  agentKey: text("agentKey").notNull(),
  displayName: text("displayName").notNull(),
  capabilityManifestJson: text("capabilityManifestJson", { mode: "json" }).notNull(),
  featureFlag: text("featureFlag"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex("agentRegistry_agentKey_unique").on(table.agentKey)
]);

export const agentProposals = sqliteTable("agentProposal", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  agentId: text("agentId").notNull().references(() => agentRegistry.id, { onDelete: "cascade" }),
  targetType: text("targetType").notNull(),
  targetId: text("targetId").notNull(),
  structuredOutputJson: text("structuredOutputJson", { mode: "json" }).notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected", "applied"] }).notNull().default("pending"),
  approvalState: text("approvalState").notNull().default("pending"),
  requestedById: text("requestedById").notNull().references(() => users.id, { onDelete: "cascade" }),
  approvedById: text("approvedById").references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
});

export const agentAuditLogs = sqliteTable("agentAuditLog", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  agentId: text("agentId").notNull().references(() => agentRegistry.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  payloadJson: text("payloadJson", { mode: "json" }).notNull(),
  actorId: text("actorId").references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
});

export const mcpServers = sqliteTable("mcpServer", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  schoolId: text("schoolId").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
});

export const mcpCredentialRefs = sqliteTable("mcpCredentialRef", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  serverId: text("serverId").notNull().references(() => mcpServers.id, { onDelete: "cascade" }),
  credentialRef: text("credentialRef").notNull(),
  provider: text("provider").notNull(),
  status: text("status").notNull().default("active"),
  scopesJson: text("scopesJson", { mode: "json" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
});

export const mcpCapabilities = sqliteTable("mcpCapability", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  serverId: text("serverId").notNull().references(() => mcpServers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  allowedRolesJson: text("allowedRolesJson", { mode: "json" }).notNull(),
  courseId: text("courseId").references(() => courses.id, { onDelete: "cascade" }),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
});

export const mcpAuditLogs = sqliteTable("mcpAuditLog", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  serverId: text("serverId").notNull().references(() => mcpServers.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  payloadJson: text("payloadJson", { mode: "json" }).notNull(),
  actorId: text("actorId").references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
});

export const pluginRegistrations = sqliteTable("pluginRegistration", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  schoolId: text("schoolId").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  manifestJson: text("manifestJson", { mode: "json" }).notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  killSwitchEnabled: integer("killSwitchEnabled", { mode: "boolean" }).notNull().default(false),
  lifecycleState: text("lifecycleState", {
    enum: ["installed", "enabled", "mounted", "ready", "suspended", "disabled", "failed"],
  }).notNull().default("installed"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
});

export const pluginLifecycleTransitions = sqliteTable("pluginLifecycleTransition", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  pluginId: text("pluginId").notNull().references(() => pluginRegistrations.id, { onDelete: "cascade" }),
  fromState: text("fromState", {
    enum: ["installed", "enabled", "mounted", "ready", "suspended", "disabled", "failed"],
  }),
  toState: text("toState", {
    enum: ["installed", "enabled", "mounted", "ready", "suspended", "disabled", "failed"],
  }).notNull(),
  reason: text("reason"),
  actorId: text("actorId").references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
}, (table) => [index("pluginLifecycleTransition_plugin_created_idx").on(table.pluginId, table.createdAt)]);

export const pluginHookRuns = sqliteTable("pluginHookRun", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  pluginId: text("pluginId").notNull().references(() => pluginRegistrations.id, { onDelete: "cascade" }),
  hookAnchor: text("hookAnchor").notNull(),
  status: text("status", { enum: ["success", "failed"] }).notNull(),
  durationMs: integer("durationMs").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
});

export const pluginActionAudits = sqliteTable("pluginActionAudit", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  pluginId: text("pluginId").notNull().references(() => pluginRegistrations.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  decision: text("decision", { enum: ["allowed", "denied"] }).notNull().default("allowed"),
  reasonCode: text("reasonCode"),
  schoolId: text("schoolId").references(() => schools.id, { onDelete: "cascade" }),
  actorScope: text("actorScope", { enum: ["host", "teacher", "student", "plugin", "system"] }),
  lifecycleState: text("lifecycleState", {
    enum: ["installed", "enabled", "mounted", "ready", "suspended", "disabled", "failed"],
  }),
  correlationId: text("correlationId"),
  payloadJson: text("payloadJson", { mode: "json" }).notNull(),
  actorId: text("actorId").references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
}, (table) => [
  index("pluginActionAudit_plugin_created_idx").on(table.pluginId, table.createdAt),
  index("pluginActionAudit_decision_created_idx").on(table.decision, table.createdAt),
]);

export const runtimeLifecycleTransitions = sqliteTable("runtimeLifecycleTransition", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  runtimeSessionId: text("runtimeSessionId").notNull().references(() => runtimeStepSessions.id, { onDelete: "cascade" }),
  fromState: text("fromState", {
    enum: ["installed", "enabled", "mounted", "ready", "suspended", "disabled", "failed"],
  }),
  toState: text("toState", {
    enum: ["installed", "enabled", "mounted", "ready", "suspended", "disabled", "failed"],
  }).notNull(),
  reason: text("reason"),
  actorId: text("actorId").references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
}, (table) => [index("runtimeLifecycleTransition_session_created_idx").on(table.runtimeSessionId, table.createdAt)]);

export const governanceAudits = sqliteTable("governanceAudit", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  targetType: text("targetType", { enum: ["plugin", "runtime"] }).notNull(),
  targetId: text("targetId").notNull(),
  runtimeSessionId: text("runtimeSessionId").references(() => runtimeStepSessions.id, { onDelete: "cascade" }),
  classroomSessionId: text("classroomSessionId").references(() => classroomSessions.id, { onDelete: "cascade" }),
  pluginId: text("pluginId").references(() => pluginRegistrations.id, { onDelete: "cascade" }),
  schoolId: text("schoolId").references(() => schools.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  decision: text("decision", { enum: ["allowed", "denied"] }).notNull(),
  reasonCode: text("reasonCode"),
  actorId: text("actorId").references(() => users.id, { onDelete: "cascade" }),
  actorScope: text("actorScope", { enum: ["host", "teacher", "student", "plugin", "system"] }),
  lifecycleState: text("lifecycleState", {
    enum: ["installed", "enabled", "mounted", "ready", "suspended", "disabled", "failed"],
  }),
  killSwitchEnabled: integer("killSwitchEnabled", { mode: "boolean" }).notNull().default(false),
  requestedCapabilitiesJson: text("requestedCapabilitiesJson", { mode: "json" }).notNull(),
  grantedCapabilitiesJson: text("grantedCapabilitiesJson", { mode: "json" }).notNull(),
  requiredPermission: text("requiredPermission"),
  correlationId: text("correlationId").notNull(),
  payloadJson: text("payloadJson", { mode: "json" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
}, (table) => [
  index("governanceAudit_target_created_idx").on(table.targetType, table.targetId, table.createdAt),
  index("governanceAudit_decision_created_idx").on(table.decision, table.createdAt),
]);

export const themeTokenRegistries = sqliteTable("themeTokenRegistry", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  schoolId: text("schoolId").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  tokenJson: text("tokenJson", { mode: "json" }).notNull(),
  validationStatus: text("validationStatus", { enum: ["valid", "invalid", "pending"] }).notNull().default("pending"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
});

export const themeAuditLogs = sqliteTable("themeAuditLog", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  themeId: text("themeId").notNull().references(() => themeTokenRegistries.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  payloadJson: text("payloadJson", { mode: "json" }).notNull(),
  actorId: text("actorId").references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
});

export const scheduleImportBatch = sqliteTable(
  "scheduleImportBatch",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("schoolId")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    sourceType: text("sourceType", { enum: ["csv", "xlsx", "connector"] }).notNull(),
    sourceLabel: text("sourceLabel").notNull(),
    connectorKey: text("connectorKey"),
    uploadedById: text("uploadedById")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["draft", "in_review", "ready_to_apply", "partially_applied", "applied", "archived"],
    })
      .notNull()
      .default("draft"),
    isPrimary: integer("isPrimary", { mode: "boolean" }).notNull().default(false),
    rowCount: integer("rowCount").notNull().default(0),
    approvedRowCount: integer("approvedRowCount").notNull().default(0),
    rejectedRowCount: integer("rejectedRowCount").notNull().default(0),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    index("scheduleImportBatch_school_status_idx").on(table.schoolId, table.status),
    index("scheduleImportBatch_uploadedBy_idx").on(table.uploadedById),
  ]
);

export const scheduleImportRow = sqliteTable(
  "scheduleImportRow",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    batchId: text("batchId")
      .notNull()
      .references(() => scheduleImportBatch.id, { onDelete: "cascade" }),
    sourceRowKey: text("sourceRowKey").notNull(),
    rawPayloadJson: text("rawPayloadJson", { mode: "json" }).notNull(),
    normalizedDraftJson: text("normalizedDraftJson", { mode: "json" }),
    validationIssuesJson: text("validationIssuesJson", { mode: "json" }).notNull(),
    mappingSummaryJson: text("mappingSummaryJson", { mode: "json" }),
    conflictSummaryJson: text("conflictSummaryJson", { mode: "json" }),
    status: text("status", {
      enum: [
        "pending_review",
        "validation_failed",
        "mapping_review",
        "conflict_review",
        "ready_to_apply",
        "approved",
        "rejected",
      ],
    })
      .notNull()
      .default("pending_review"),
    approvalState: text("approvalState", { enum: ["pending", "approved", "rejected"] })
      .notNull()
      .default("pending"),
    approvalNote: text("approvalNote"),
    reviewedById: text("reviewedById").references(() => users.id, { onDelete: "cascade" }),
    reviewedAt: integer("reviewedAt", { mode: "timestamp_ms" }),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    index("scheduleImportRow_batch_status_idx").on(table.batchId, table.status),
    uniqueIndex("scheduleImportRow_batch_rowKey_unique").on(table.batchId, table.sourceRowKey),
  ]
);

export const scheduleTerm = sqliteTable(
  "scheduleTerm",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("schoolId")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startsOn: text("startsOn").notNull(),
    endsOn: text("endsOn").notNull(),
    isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("scheduleTerm_school_name_unique").on(table.schoolId, table.name)]
);

export const scheduleWeekPattern = sqliteTable(
  "scheduleWeekPattern",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("schoolId")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    termId: text("termId")
      .notNull()
      .references(() => scheduleTerm.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    cycleLength: integer("cycleLength").notNull().default(1),
    anchorDate: text("anchorDate").notNull(),
    patternJson: text("patternJson", { mode: "json" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("scheduleWeekPattern_term_name_unique").on(table.termId, table.name)]
);

export const scheduleBellSlot = sqliteTable(
  "scheduleBellSlot",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("schoolId")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    startsAt: text("startsAt").notNull(),
    endsAt: text("endsAt").notNull(),
    sortOrder: integer("sortOrder").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("scheduleBellSlot_school_label_unique").on(table.schoolId, table.label),
    uniqueIndex("scheduleBellSlot_school_sortOrder_unique").on(table.schoolId, table.sortOrder),
  ]
);

export const scheduleTeachingAssignment = sqliteTable(
  "scheduleTeachingAssignment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("schoolId")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    classId: text("classId")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    courseId: text("courseId")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    teacherId: text("teacherId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    termId: text("termId")
      .notNull()
      .references(() => scheduleTerm.id, { onDelete: "cascade" }),
    roomLabel: text("roomLabel"),
    status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    index("scheduleTeachingAssignment_teacher_idx").on(table.teacherId, table.termId),
    index("scheduleTeachingAssignment_class_idx").on(table.classId, table.termId),
    uniqueIndex("scheduleTeachingAssignment_scope_unique").on(
      table.schoolId,
      table.classId,
      table.courseId,
      table.teacherId,
      table.termId
    ),
  ]
);

export const scheduleRecurringEntry = sqliteTable(
  "scheduleRecurringEntry",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("schoolId")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    assignmentId: text("assignmentId")
      .notNull()
      .references(() => scheduleTeachingAssignment.id, { onDelete: "cascade" }),
    termId: text("termId")
      .notNull()
      .references(() => scheduleTerm.id, { onDelete: "cascade" }),
    weekPatternId: text("weekPatternId")
      .notNull()
      .references(() => scheduleWeekPattern.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    bellSlotId: text("bellSlotId")
      .notNull()
      .references(() => scheduleBellSlot.id, { onDelete: "cascade" }),
    roomLabel: text("roomLabel"),
    lessonId: text("lessonId").references(() => lessons.id, { onDelete: "cascade" }),
    sourceBatchId: text("sourceBatchId").references(() => scheduleImportBatch.id, { onDelete: "cascade" }),
    sourceRowId: text("sourceRowId").references(() => scheduleImportRow.id, { onDelete: "cascade" }),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("scheduleRecurringEntry_identity_unique").on(
      table.assignmentId,
      table.weekPatternId,
      table.weekday,
      table.bellSlotId
    ),
    index("scheduleRecurringEntry_term_weekday_idx").on(table.termId, table.weekday, table.bellSlotId),
  ]
);

export const scheduleOverride = sqliteTable(
  "scheduleOverride",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("schoolId")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    assignmentId: text("assignmentId")
      .notNull()
      .references(() => scheduleTeachingAssignment.id, { onDelete: "cascade" }),
    recurringEntryId: text("recurringEntryId")
      .notNull()
      .references(() => scheduleRecurringEntry.id, { onDelete: "cascade" }),
    teacherId: text("teacherId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    classId: text("classId")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    effectiveDate: text("effectiveDate").notNull(),
    actionType: text("actionType", { enum: ["substitute", "cancel", "move"] }).notNull(),
    reason: text("reason").notNull(),
    substituteTeacherId: text("substituteTeacherId").references(() => users.id, { onDelete: "cascade" }),
    replacementBellSlotId: text("replacementBellSlotId").references(() => scheduleBellSlot.id, { onDelete: "cascade" }),
    replacementRoomLabel: text("replacementRoomLabel"),
    originalTeacherId: text("originalTeacherId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    originalBellSlotId: text("originalBellSlotId")
      .notNull()
      .references(() => scheduleBellSlot.id, { onDelete: "cascade" }),
    originalRoomLabel: text("originalRoomLabel"),
    status: text("status", { enum: ["active", "revoked"] }).notNull().default("active"),
    sourceProposalId: text("sourceProposalId"),
    createdById: text("createdById")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    updatedById: text("updatedById").references(() => users.id, { onDelete: "cascade" }),
    revokedAt: integer("revokedAt", { mode: "timestamp_ms" }),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    index("scheduleOverride_school_effectiveDate_idx").on(table.schoolId, table.effectiveDate),
    index("scheduleOverride_teacher_effectiveDate_idx").on(table.teacherId, table.effectiveDate),
    index("scheduleOverride_class_effectiveDate_idx").on(table.classId, table.effectiveDate),
  ]
);

export const scheduleHolidayCalendar = sqliteTable(
  "scheduleHolidayCalendar",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("schoolId")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    termId: text("termId").references(() => scheduleTerm.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdById: text("createdById")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    updatedById: text("updatedById").references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("scheduleHolidayCalendar_school_name_unique").on(table.schoolId, table.name)]
);

export const scheduleHolidayDate = sqliteTable(
  "scheduleHolidayDate",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    calendarId: text("calendarId")
      .notNull()
      .references(() => scheduleHolidayCalendar.id, { onDelete: "cascade" }),
    schoolId: text("schoolId")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    dayType: text("dayType", { enum: ["holiday", "non_teaching", "make_up", "teaching"] }).notNull(),
    label: text("label").notNull(),
    note: text("note"),
    createdById: text("createdById")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    updatedById: text("updatedById").references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("scheduleHolidayDate_calendar_date_unique").on(table.calendarId, table.date),
    index("scheduleHolidayDate_school_date_idx").on(table.schoolId, table.date),
  ]
);

export const scheduleReminderRule = sqliteTable(
  "scheduleReminderRule",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("schoolId")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["pre_class", "schedule_change"] }).notNull(),
    channel: text("channel").notNull(),
    recipientScope: text("recipientScope").notNull(),
    offsetMinutes: integer("offsetMinutes").notNull().default(0),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    createdById: text("createdById")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    updatedById: text("updatedById").references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [index("scheduleReminderRule_school_type_idx").on(table.schoolId, table.type)]
);

export const scheduleReminderDispatch = sqliteTable(
  "scheduleReminderDispatch",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("schoolId")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    actorId: text("actorId")
      .references(() => users.id, { onDelete: "cascade" }),
    ruleId: text("ruleId").references(() => scheduleReminderRule.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["pre_class", "schedule_change"] }).notNull(),
    channel: text("channel").notNull(),
    targetType: text("targetType").notNull(),
    targetId: text("targetId").notNull(),
    targetLabel: text("targetLabel").notNull(),
    status: text("status", { enum: ["planned", "dispatching", "sent", "failed", "retry_required"] })
      .notNull()
      .default("planned"),
    scheduledFor: integer("scheduledFor", { mode: "timestamp_ms" }).notNull(),
    deliveryTaskId: text("deliveryTaskId"),
    dispatchClaimedAt: integer("dispatchClaimedAt", { mode: "timestamp_ms" }),
    dispatchClaimedBy: text("dispatchClaimedBy"),
    lastAttemptAt: integer("lastAttemptAt", { mode: "timestamp_ms" }),
    sentAt: integer("sentAt", { mode: "timestamp_ms" }),
    failureReason: text("failureReason"),
    payloadJson: text("payloadJson", { mode: "json" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    index("scheduleReminderDispatch_school_status_idx").on(table.schoolId, table.status),
    index("scheduleReminderDispatch_school_scheduled_idx").on(table.schoolId, table.scheduledFor),
    uniqueIndex("scheduleReminderDispatch_deliveryTaskId_unique").on(table.deliveryTaskId),
  ]
);

export const scheduleMutationAudit = sqliteTable(
  "scheduleMutationAudit",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("schoolId")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    entityType: text("entityType").notNull(),
    entityId: text("entityId").notNull(),
    actionType: text("actionType").notNull(),
    actorId: text("actorId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason"),
    payloadJson: text("payloadJson", { mode: "json" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [
    index("scheduleMutationAudit_entity_idx").on(table.entityType, table.entityId),
    index("scheduleMutationAudit_school_created_idx").on(table.schoolId, table.createdAt),
  ]
);

export const scheduleAssistantProposal = sqliteTable(
  "scheduleAssistantProposal",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schoolId: text("schoolId")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    proposalType: text("proposalType", {
      enum: ["import_mapping", "conflict_explanation", "override_suggestion"],
    }).notNull(),
    targetType: text("targetType").notNull(),
    targetId: text("targetId").notNull(),
    status: text("status", { enum: ["pending", "approved", "rejected", "draft_created"] })
      .notNull()
      .default("pending"),
    title: text("title").notNull(),
    reason: text("reason").notNull(),
    impactScopeJson: text("impactScopeJson", { mode: "json" }).notNull(),
    fieldsRequiringConfirmationJson: text("fieldsRequiringConfirmationJson", { mode: "json" }).notNull(),
    draftPayloadJson: text("draftPayloadJson", { mode: "json" }),
    requestedById: text("requestedById")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    approvedById: text("approvedById").references(() => users.id, { onDelete: "cascade" }),
    rejectedById: text("rejectedById").references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  },
  (table) => [index("scheduleAssistantProposal_school_status_idx").on(table.schoolId, table.status)]
);
