import { randomUUID } from "node:crypto";
import path from "node:path";

import type { Client } from "@libsql/client";

import { cleanupSqliteArtifacts, materializeDrizzleMigrations } from "./sqlite-migration-proof";

const FIXTURE_IDS = {
  schoolId: "school-71-01",
  teacherId: "teacher-71-01",
  studentId: "student-71-01",
  classId: "class-71-01",
  courseId: "course-71-01",
  lessonId: "lesson-71-01",
  stepId: "step-71-quiz-external",
  publishedVersionId: "published-71-01",
  liveSessionId: "classroom-session-live-71-01",
  endedSessionId: "classroom-session-ended-71-01",
  liveQuestionId: "quiz-question-live-71-01",
  endedQuestionId: "quiz-question-ended-71-01",
  endedResponseIdA: "quiz-response-ended-71-01-a",
  endedResponseIdB: "quiz-response-ended-71-01-b",
  retainedPluginId: "plugin-external-retained-71-01",
  livePluginId: "plugin-external-live-71-01",
  retainedBusinessKey: "phase71/retained-summary",
  lessonExtensionId: "plugin-ext-lesson-71-01",
  stepExtensionId: "plugin-ext-step-71-01",
  resourceId: "resource-71-01",
  resourceExtensionId: "plugin-ext-resource-71-01",
  businessDataId: "plugin-biz-71-01",
} as const;

function buildExternalQuizManifest(version: string) {
  return {
    id: "external-marketplace.quiz-sample",
    version,
    manifestVersion: 2 as const,
    permissions: ["lesson:write:suggestion"],
    anchors: ["lesson.sidebar"],
    actions: ["suggestBuiltInTeachingStep"],
    builtIn: false,
    defaultEnabled: false,
    nonDeletable: false,
    governance: {
      manifestVersion: 2 as const,
      contractVersion: "v2",
      requestedCapabilities: ["plugin.storage.read", "plugin.storage.write"],
      permissions: ["lesson:write:suggestion"],
      lifecycle: {
        ownerType: "plugin-manager",
        installScope: "school",
        initialState: "installed",
        mountMode: "manual",
      },
    },
  };
}

function buildPublishedSnapshot() {
  return {
    lesson: { id: FIXTURE_IDS.lessonId, title: "Phase 71 Marketplace Lifecycle" },
    steps: [
      {
        id: FIXTURE_IDS.stepId,
        lessonId: FIXTURE_IDS.lessonId,
        type: "quiz",
        title: "互动答题（外部插件）",
        rank: "a0",
        payload: {
          type: "quiz",
          question: "市场插件升级后数据是否仍然完整？",
          options: ["是", "否", "待确认"],
          materialRefs: [],
          correctOptionIndex: 0,
          explanation: "升级前后都必须保持 quiz owned-data 与统计一致。",
          allowRetry: true,
          retryPolicy: "unlimited",
          revealCorrectAnswer: true,
          builtInSource: {
            pluginId: FIXTURE_IDS.livePluginId,
            builtInKey: "quizSample",
            pluginName: "互动答题（外部插件）",
          },
        },
      },
    ],
    materials: [],
  };
}

async function runStatements(client: Client, statements: readonly string[]) {
  for (const statement of statements) {
    await client.execute(statement);
  }
}

export type Phase71IsolatedDbContext = {
  client: Client;
  databasePath: string;
  databaseUrl: string;
  dispose: () => Promise<void>;
};

export type Phase71MarketplaceFixtureSeed = {
  schoolId: string;
  teacherId: string;
  studentId: string;
  livePluginId: string;
  retainedPluginId: string;
  liveSessionId: string;
  endedSessionId: string;
  responseCount: number;
  questionCount: number;
  affectedEndedSessionCount: number;
  retainedBusinessKey: string;
  liveQuestionId: string;
  endedQuestionId: string;
};

export async function createPhase71IsolatedDb(): Promise<Phase71IsolatedDbContext> {
  const databasePath = path.join("/tmp/opencode", `phase71-marketplace-${randomUUID()}.db`);
  const databaseUrl = `file:${databasePath}`;
  const client = await materializeDrizzleMigrations(databaseUrl);

  return {
    client,
    databasePath,
    databaseUrl,
    async dispose() {
      await (client as { close?: () => Promise<void> | void }).close?.();
      cleanupSqliteArtifacts(databasePath);
    },
  };
}

export async function seedPhase71MarketplaceFixtures(
  context: Phase71IsolatedDbContext,
): Promise<Phase71MarketplaceFixtureSeed> {
  const retainedManifest = JSON.stringify(buildExternalQuizManifest("1.0.0"));
  const liveManifest = JSON.stringify(buildExternalQuizManifest("1.1.0"));
  const snapshotJson = JSON.stringify(buildPublishedSnapshot());
  const extensionPayload = JSON.stringify({
    kind: "quiz-sample-external",
    contractVersion: "v1",
    sourceType: "external",
    installSurface: "marketplace",
  });
  const resourcePayload = JSON.stringify({
    classification: "worksheet",
    sourceType: "external",
  });
  const businessPayload = JSON.stringify({
    retainedRows: 2,
    uninstallRetentionMode: "retain",
    sourceType: "external",
  });

  await runStatements(context.client, [
    `INSERT INTO user (id, name) VALUES ('${FIXTURE_IDS.teacherId}', 'Phase71 Teacher')`,
    `INSERT INTO user (id, name) VALUES ('${FIXTURE_IDS.studentId}', 'Phase71 Student')`,
    `INSERT INTO school (id, name, createdAt) VALUES ('${FIXTURE_IDS.schoolId}', 'Phase71 School', 0)`,
    `INSERT INTO membership (id, userId, schoolId, role, status) VALUES ('membership-teacher-71', '${FIXTURE_IDS.teacherId}', '${FIXTURE_IDS.schoolId}', 'teacher', 'active')`,
    `INSERT INTO membership (id, userId, schoolId, role, status) VALUES ('membership-student-71', '${FIXTURE_IDS.studentId}', '${FIXTURE_IDS.schoolId}', 'student', 'active')`,
    `INSERT INTO class (id, schoolId, name) VALUES ('${FIXTURE_IDS.classId}', '${FIXTURE_IDS.schoolId}', 'Phase71 班级')`,
    `INSERT INTO classMember (id, classId, userId, role) VALUES ('class-member-student-71', '${FIXTURE_IDS.classId}', '${FIXTURE_IDS.studentId}', 'student')`,
    `INSERT INTO course (id, schoolId, ownerId, title, subject, grade, status, createdAt, updatedAt) VALUES ('${FIXTURE_IDS.courseId}', '${FIXTURE_IDS.schoolId}', '${FIXTURE_IDS.teacherId}', 'Phase71 课程', '信息科技', '七年级', 'draft', 0, 0)`,
    `INSERT INTO courseClass (courseId, classId) VALUES ('${FIXTURE_IDS.courseId}', '${FIXTURE_IDS.classId}')`,
    `INSERT INTO courseEnrollment (id, courseId, studentId, status, createdAt) VALUES ('enrollment-student-71', '${FIXTURE_IDS.courseId}', '${FIXTURE_IDS.studentId}', 'active', 0)`,
    `INSERT INTO lesson (id, courseId, createdById, title, objective, status, revision, publishedVersionId, createdAt, updatedAt) VALUES ('${FIXTURE_IDS.lessonId}', '${FIXTURE_IDS.courseId}', '${FIXTURE_IDS.teacherId}', 'Phase71 插件课堂', '验证外部插件 install/upgrade/uninstall/recover 生命周期', 'published', 1, '${FIXTURE_IDS.publishedVersionId}', 0, 0)`,
    `INSERT INTO lessonStep (id, lessonId, type, title, rank, payloadJson, createdAt, updatedAt) VALUES ('${FIXTURE_IDS.stepId}', '${FIXTURE_IDS.lessonId}', 'quiz', '互动答题（外部插件）', 'a0', '${snapshotJson.replace(/'/g, "''")}', 0, 0)`,
    `INSERT INTO publishedLessonVersion (id, lessonId, version, snapshotJson, publishedById, publishedAt) VALUES ('${FIXTURE_IDS.publishedVersionId}', '${FIXTURE_IDS.lessonId}', 1, '${snapshotJson.replace(/'/g, "''")}', '${FIXTURE_IDS.teacherId}', 0)`,
    `INSERT INTO resource (id, schoolId, ownerId, courseId, title, visibility, classification, ragEligible, createdAt, updatedAt) VALUES ('${FIXTURE_IDS.resourceId}', '${FIXTURE_IDS.schoolId}', '${FIXTURE_IDS.teacherId}', '${FIXTURE_IDS.courseId}', 'Phase71 插件讲义', 'course', 'worksheet', 0, 0, 0)`,
    `INSERT INTO pluginRegistration (id, schoolId, name, manifestJson, pluginKey, dbNamespace, sourceType, installSource, enabled, killSwitchEnabled, lifecycleState, uninstalledAt, uninstallRetentionMode, dataVersion, createdAt, updatedAt) VALUES ('${FIXTURE_IDS.retainedPluginId}', '${FIXTURE_IDS.schoolId}', '互动答题（外部插件） v1', '${retainedManifest.replace(/'/g, "''")}', 'quiz-marketplace', 'quiz_marketplace', 'external', 'manual', 0, 0, 'disabled', 0, 'retain', 1, 0, 0)`,
    `INSERT INTO pluginRegistration (id, schoolId, name, manifestJson, pluginKey, dbNamespace, sourceType, installSource, enabled, killSwitchEnabled, lifecycleState, uninstalledAt, uninstallRetentionMode, dataVersion, createdAt, updatedAt) VALUES ('${FIXTURE_IDS.livePluginId}', '${FIXTURE_IDS.schoolId}', '互动答题（外部插件） v2', '${liveManifest.replace(/'/g, "''")}', 'quiz-marketplace-next', 'quiz_marketplace_next', 'external', 'manual', 1, 0, 'ready', NULL, NULL, 2, 0, 0)`,
    `INSERT INTO plugin_ext_lesson (id, schoolId, pluginId, lessonId, payloadJson, createdAt, updatedAt) VALUES ('${FIXTURE_IDS.lessonExtensionId}', '${FIXTURE_IDS.schoolId}', '${FIXTURE_IDS.retainedPluginId}', '${FIXTURE_IDS.lessonId}', '${extensionPayload.replace(/'/g, "''")}', 0, 0)`,
    `INSERT INTO plugin_ext_lesson_step (id, schoolId, pluginId, lessonStepId, payloadJson, createdAt, updatedAt) VALUES ('${FIXTURE_IDS.stepExtensionId}', '${FIXTURE_IDS.schoolId}', '${FIXTURE_IDS.retainedPluginId}', '${FIXTURE_IDS.stepId}', '${extensionPayload.replace(/'/g, "''")}', 0, 0)`,
    `INSERT INTO plugin_ext_resource (id, schoolId, pluginId, resourceId, payloadJson, createdAt, updatedAt) VALUES ('${FIXTURE_IDS.resourceExtensionId}', '${FIXTURE_IDS.schoolId}', '${FIXTURE_IDS.retainedPluginId}', '${FIXTURE_IDS.resourceId}', '${resourcePayload.replace(/'/g, "''")}', 0, 0)`,
    `INSERT INTO plugin_owned_business_data (id, schoolId, pluginId, key, payloadJson, createdAt, updatedAt) VALUES ('${FIXTURE_IDS.businessDataId}', '${FIXTURE_IDS.schoolId}', '${FIXTURE_IDS.retainedPluginId}', '${FIXTURE_IDS.retainedBusinessKey}', '${businessPayload.replace(/'/g, "''")}', 0, 0)`,
    `INSERT INTO classroomSession (id, lessonId, publishedVersionId, classId, teacherId, activeStepId, locked, transportModeSnapshot, status, version, createdAt, updatedAt, endedAt) VALUES ('${FIXTURE_IDS.liveSessionId}', '${FIXTURE_IDS.lessonId}', '${FIXTURE_IDS.publishedVersionId}', '${FIXTURE_IDS.classId}', '${FIXTURE_IDS.teacherId}', '${FIXTURE_IDS.stepId}', 1, 'local_only', 'live', 1, 0, 0, NULL)`,
    `INSERT INTO classroomSession (id, lessonId, publishedVersionId, classId, teacherId, activeStepId, locked, transportModeSnapshot, status, version, createdAt, updatedAt, endedAt) VALUES ('${FIXTURE_IDS.endedSessionId}', '${FIXTURE_IDS.lessonId}', '${FIXTURE_IDS.publishedVersionId}', '${FIXTURE_IDS.classId}', '${FIXTURE_IDS.teacherId}', '${FIXTURE_IDS.stepId}', 0, 'local_only', 'ended', 1, 0, 0, 1)`,
    `INSERT INTO plugin_owned_quiz_questions (id, schoolId, pluginId, classroomSession, question, prompt, optionAText, optionBText, optionCText, optionDText, correctOption, createdAt, updatedAt) VALUES ('${FIXTURE_IDS.liveQuestionId}', '${FIXTURE_IDS.schoolId}', '${FIXTURE_IDS.livePluginId}', '${FIXTURE_IDS.liveSessionId}', '${FIXTURE_IDS.stepId}', 'live blocker prompt', 'A', 'B', 'C', NULL, 'A', 0, 0)`,
    `INSERT INTO plugin_owned_quiz_questions (id, schoolId, pluginId, classroomSession, question, prompt, optionAText, optionBText, optionCText, optionDText, correctOption, createdAt, updatedAt) VALUES ('${FIXTURE_IDS.endedQuestionId}', '${FIXTURE_IDS.schoolId}', '${FIXTURE_IDS.retainedPluginId}', '${FIXTURE_IDS.endedSessionId}', '${FIXTURE_IDS.stepId}', 'ended parity prompt', 'A', 'B', 'C', NULL, 'B', 0, 0)`,
    `INSERT INTO plugin_owned_quiz_responses (id, schoolId, pluginId, classroomSession, student, question, selectedOption, attemptNo, isLatest, createdAt, updatedAt) VALUES ('${FIXTURE_IDS.endedResponseIdA}', '${FIXTURE_IDS.schoolId}', '${FIXTURE_IDS.retainedPluginId}', '${FIXTURE_IDS.endedSessionId}', '${FIXTURE_IDS.studentId}', '${FIXTURE_IDS.stepId}', 'A', 1, 0, 0, 0)`,
    `INSERT INTO plugin_owned_quiz_responses (id, schoolId, pluginId, classroomSession, student, question, selectedOption, attemptNo, isLatest, createdAt, updatedAt) VALUES ('${FIXTURE_IDS.endedResponseIdB}', '${FIXTURE_IDS.schoolId}', '${FIXTURE_IDS.retainedPluginId}', '${FIXTURE_IDS.endedSessionId}', '${FIXTURE_IDS.studentId}', '${FIXTURE_IDS.stepId}', 'B', 2, 1, 0, 0)`,
  ]);

  return {
    schoolId: FIXTURE_IDS.schoolId,
    teacherId: FIXTURE_IDS.teacherId,
    studentId: FIXTURE_IDS.studentId,
    livePluginId: FIXTURE_IDS.livePluginId,
    retainedPluginId: FIXTURE_IDS.retainedPluginId,
    liveSessionId: FIXTURE_IDS.liveSessionId,
    endedSessionId: FIXTURE_IDS.endedSessionId,
    responseCount: 2,
    questionCount: 2,
    affectedEndedSessionCount: 1,
    retainedBusinessKey: FIXTURE_IDS.retainedBusinessKey,
    liveQuestionId: FIXTURE_IDS.liveQuestionId,
    endedQuestionId: FIXTURE_IDS.endedQuestionId,
  };
}
