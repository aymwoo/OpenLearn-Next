import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";
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
    index("attemptFeedback_target_idx").on(table.targetType, table.targetId),
    index("attemptFeedback_student_idx").on(table.studentId),
  ]
);
