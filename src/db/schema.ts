import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const users = sqliteTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
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
    index("courseEnrollments_courseId_idx").on(table.courseId),
    index("courseEnrollments_studentId_idx").on(table.studentId),
  ]
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
    type: text("type", { enum: ["launched", "active_step_changed", "lock_mode_changed", "snapshot_refreshed", "ended"] }).notNull(),
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
});

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
});

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
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
});

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
  payloadJson: text("payloadJson", { mode: "json" }).notNull(),
  actorId: text("actorId").references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
});

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
