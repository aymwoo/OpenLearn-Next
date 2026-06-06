import "server-only";

import { createHash } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { gt, valid } from "semver";

import { db } from "@/db";
import {
  classroomSessions,
  courses,
  lessons,
  lessonSteps,
  pluginLessonExtensions,
  pluginLessonStepExtensions,
  pluginRegistrations,
  pluginResourceExtensions,
  publishedLessonVersions,
  resources,
} from "@/db/schema";
import { pluginOwnedQuizQuestions, pluginOwnedQuizResponses } from "@/db/schema/generated/plugin-owned/quiz";
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";
import { getUserMembershipsDTO } from "@/lib/dal/membership";

type JsonObject = Record<string, unknown>;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * 校验当前 actor 是否属于合法的学校教师管理员，并进行权限断言
 */
async function assertTeacherManagerScope(actorId: string, schoolId: string) {
  if (!actorId?.trim()) {
    throw new Error("PLUGIN_ACTOR_REQUIRED");
  }

  const scope = await assertActiveTeacher();
  if (scope.userId !== actorId || !scope.schoolIds.includes(schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  return scope;
}

async function assertMarketplaceManagerScope(actorId: string, schoolId: string, actorScope?: string) {
  if (actorScope === "operator") {
    if (!actorId?.trim()) {
      throw new Error("PLUGIN_ACTOR_REQUIRED");
    }

    const memberships = await getUserMembershipsDTO(actorId);
    const hasOperatorMembership = memberships.some((membership) =>
      membership.schoolId === schoolId
      && membership.status === "active"
      && (membership.role === "admin" || membership.role === "developer")
    );

    if (!hasOperatorMembership) {
      throw new Error("OPERATOR_AUTH_REQUIRED");
    }

    return;
  }

  await assertTeacherManagerScope(actorId, schoolId);
}

function schoolCourseScope(schoolId: string) {
  return eq(courses.schoolId, schoolId);
}

export interface MigrationResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ entityId: string; reason: string }>;
}

type MigrationDbExecutor = typeof db;

export type PluginUpgradePreflightResult = {
  pluginId: string;
  schoolId: string;
  currentVersion: string;
  targetVersion: string;
  hasOwnedQuizData: boolean;
  stages: Array<"backfill" | "verify" | "cutover">;
  blockers: string[];
  statsParityPreview: {
    questionCount: number;
    responseCount: number;
    latestResponseHash: string;
  };
  activeSessions: Array<{
    sessionId: string;
    lessonId: string;
    classId: string;
    status: "live";
  }>;
};

export type PluginUpgradeExecutionResult = {
  pluginId: string;
  schoolId: string;
  currentVersion: string;
  targetVersion: string;
  upgraded: boolean;
  verifyPassed: boolean;
  lifecycleState: "installed" | "enabled" | "mounted" | "ready" | "suspended" | "disabled" | "failed";
  stages: Array<{
    name: "backfill" | "verify" | "cutover";
    status: "completed" | "failed" | "skipped";
  }>;
  failureDetail: string | null;
  invalidatedSessionIds: string[];
};

/**
 * deepEquals 辅助方法，用于判断两个复杂 JSON 对象是否一致
 */
function deepEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  }
  const objectA = a as Record<string, unknown>;
  const objectB = b as Record<string, unknown>;
  const keysA = Object.keys(objectA);
  const keysB = Object.keys(objectB);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEquals(objectA[key], objectB[key])) return false;
  }
  return true;
}

function extractLessonPluginPayload(snapshotJson: unknown, pluginKey: string) {
  const snapshot = snapshotJson as { lesson?: Record<string, unknown> } | null;
  const lessonPayload = snapshot?.lesson?.payloadJson as Record<string, unknown> | undefined;

  if (!lessonPayload || typeof lessonPayload !== "object" || !(pluginKey in lessonPayload)) {
    return null;
  }

  return lessonPayload;
}

function extractResourcePluginPayload(content: string | null, pluginKey: string) {
  if (!content) {
    return null;
  }

  try {
    const parsed = JSON.parse(content) as Record<string, unknown> | null;

    if (!parsed || typeof parsed !== "object" || !(pluginKey in parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function buildLatestQuizResponseHash(rows: Array<{ classroomSession: string; student: string; question: string; selectedOption: string; isLatest: boolean }>) {
  const latestRows = rows
    .filter((row) => row.isLatest)
    .sort((left, right) => `${left.classroomSession}:${left.student}:${left.question}`.localeCompare(`${right.classroomSession}:${right.student}:${right.question}`));

  return createHash("sha256").update(JSON.stringify(latestRows)).digest("hex");
}

async function listUpgradeActiveSessions(schoolId: string, pluginId: string) {
  const rows = await db
    .select({
      sessionId: classroomSessions.id,
      lessonId: classroomSessions.lessonId,
      classId: classroomSessions.classId,
      status: classroomSessions.status,
    })
    .from(pluginOwnedQuizQuestions)
    .innerJoin(classroomSessions, eq(pluginOwnedQuizQuestions.classroomSession, classroomSessions.id))
    .where(and(
      eq(pluginOwnedQuizQuestions.schoolId, schoolId),
      eq(pluginOwnedQuizQuestions.pluginId, pluginId),
      eq(classroomSessions.status, "live"),
    ));

  return rows.map((row) => ({
    sessionId: String(row.sessionId),
    lessonId: String(row.lessonId),
    classId: String(row.classId),
    status: "live" as const,
  }));
}

function physicalPayloadMatches(
  legacyPayload: unknown,
  physicalPayload: unknown,
  entityId: string,
  pluginKey: string,
) {
  if (!deepEquals(legacyPayload, physicalPayload)) {
    throw new Error(`CUTOVER_VERIFY_MISMATCH:${entityId}:${pluginKey}`);
  }
}

/**
 * 1. Backfill 阶段：智能提取核心表 JSON 属性中的插件特征数据，并幂等写入至 plugin_ext_ 物理扩展表中。
 */
export async function backfillPluginJsonToSchema(
  actorId: string,
  schoolId: string,
  pluginId: string,
  entityType: "lesson" | "step" | "resource",
  executor: MigrationDbExecutor = db,
  actorScope?: string,
): Promise<MigrationResult> {
  // 1. 鉴权
  await assertMarketplaceManagerScope(actorId, schoolId, actorScope);

  // 2. 捞取插件登记稳定身份
  const [pluginReg] = await executor
    .select({ pluginKey: pluginRegistrations.pluginKey, schoolId: pluginRegistrations.schoolId })
    .from(pluginRegistrations)
    .where(eq(pluginRegistrations.id, pluginId))
    .limit(1);

  if (!pluginReg || pluginReg.schoolId !== schoolId) {
    throw new Error("SCHOOL_CROSS_BOUNDARY_FORBIDDEN");
  }

  const { pluginKey } = pluginReg;
  const result: MigrationResult = { processed: 0, succeeded: 0, failed: 0, errors: [] };

  // 3. 根据 entityType 路由
  if (entityType === "lesson") {
      const list = await executor
      .select({ id: lessons.id, snapshotJson: publishedLessonVersions.snapshotJson })
      .from(lessons)
      .innerJoin(publishedLessonVersions, eq(lessons.publishedVersionId, publishedLessonVersions.id))
      .innerJoin(courses, eq(lessons.courseId, courses.id))
      .where(schoolCourseScope(schoolId));

    for (const item of list) {
      const payload = extractLessonPluginPayload(item.snapshotJson, pluginKey);
      if (payload && typeof payload === "object" && pluginKey in payload) {
        result.processed++;
        try {
          const extracted = payload[pluginKey];
          await executor
            .insert(pluginLessonExtensions)
            .values({
              schoolId,
              pluginId,
              lessonId: item.id,
              payloadJson: extracted,
            })
            .onConflictDoUpdate({
              target: [
                pluginLessonExtensions.schoolId,
                pluginLessonExtensions.pluginId,
                pluginLessonExtensions.lessonId,
              ],
              set: {
                payloadJson: extracted,
                updatedAt: new Date(),
              },
            });
          result.succeeded++;
        } catch (err: unknown) {
          result.failed++;
          result.errors.push({ entityId: item.id, reason: getErrorMessage(err) });
        }
      }
    }
  } else if (entityType === "step") {
      const list = await executor
      .select({ id: lessonSteps.id, payloadJson: lessonSteps.payloadJson })
      .from(lessonSteps)
      .innerJoin(lessons, eq(lessonSteps.lessonId, lessons.id))
      .innerJoin(courses, eq(lessons.courseId, courses.id))
      .where(schoolCourseScope(schoolId));

    for (const item of list) {
      const payload = item.payloadJson as JsonObject;
      if (payload && typeof payload === "object" && pluginKey in payload) {
        result.processed++;
        try {
          const extracted = payload[pluginKey];
          await executor
            .insert(pluginLessonStepExtensions)
            .values({
              schoolId,
              pluginId,
              lessonStepId: item.id,
              payloadJson: extracted,
            })
            .onConflictDoUpdate({
              target: [
                pluginLessonStepExtensions.schoolId,
                pluginLessonStepExtensions.pluginId,
                pluginLessonStepExtensions.lessonStepId,
              ],
              set: {
                payloadJson: extracted,
                updatedAt: new Date(),
              },
            });
          result.succeeded++;
        } catch (err: unknown) {
          result.failed++;
          result.errors.push({ entityId: item.id, reason: getErrorMessage(err) });
        }
      }
    }
  } else if (entityType === "resource") {
      const list = await executor
      .select({ id: resources.id, content: resources.content })
      .from(resources)
      .where(eq(resources.schoolId, schoolId));

    for (const item of list) {
      const payload = extractResourcePluginPayload(item.content, pluginKey);
      if (payload && typeof payload === "object" && pluginKey in payload) {
        result.processed++;
        try {
          const extracted = payload[pluginKey];
          await executor
            .insert(pluginResourceExtensions)
            .values({
              schoolId,
              pluginId,
              resourceId: item.id,
              payloadJson: extracted,
            })
            .onConflictDoUpdate({
              target: [
                pluginResourceExtensions.schoolId,
                pluginResourceExtensions.pluginId,
                pluginResourceExtensions.resourceId,
              ],
              set: {
                payloadJson: extracted,
                updatedAt: new Date(),
              },
            });
          result.succeeded++;
        } catch (err: unknown) {
          result.failed++;
          result.errors.push({ entityId: item.id, reason: getErrorMessage(err) });
        }
      }
    }
  }

  return result;
}

/**
 * 2. Verify 阶段：对比核心实体 JSON 中备份的插件属性和新物理扩展表中的 payloadJson 是否完全匹配。
 */
export async function verifyBackfillData(
  actorId: string,
  schoolId: string,
  pluginId: string,
  entityType: "lesson" | "step" | "resource",
  executor: MigrationDbExecutor = db,
  actorScope?: string,
): Promise<{ matches: boolean; mismatches: string[] }> {
  // 1. 鉴权
  await assertMarketplaceManagerScope(actorId, schoolId, actorScope);

  const [pluginReg] = await executor
    .select({ pluginKey: pluginRegistrations.pluginKey, schoolId: pluginRegistrations.schoolId })
    .from(pluginRegistrations)
    .where(eq(pluginRegistrations.id, pluginId))
    .limit(1);

  if (!pluginReg || pluginReg.schoolId !== schoolId) {
    throw new Error("SCHOOL_CROSS_BOUNDARY_FORBIDDEN");
  }

  const { pluginKey } = pluginReg;
  const mismatches: string[] = [];

  if (entityType === "lesson") {
      const list = await executor
      .select({ id: lessons.id, snapshotJson: publishedLessonVersions.snapshotJson })
      .from(lessons)
      .innerJoin(publishedLessonVersions, eq(lessons.publishedVersionId, publishedLessonVersions.id))
      .innerJoin(courses, eq(lessons.courseId, courses.id))
      .where(schoolCourseScope(schoolId));

    for (const item of list) {
      const payload = extractLessonPluginPayload(item.snapshotJson, pluginKey);
      if (payload && typeof payload === "object" && pluginKey in payload) {
        const legacyVal = payload[pluginKey];
        const [physicalRow] = await executor
          .select({ payloadJson: pluginLessonExtensions.payloadJson })
          .from(pluginLessonExtensions)
          .where(
            and(
              eq(pluginLessonExtensions.schoolId, schoolId),
              eq(pluginLessonExtensions.pluginId, pluginId),
              eq(pluginLessonExtensions.lessonId, item.id),
            ),
          )
          .limit(1);

        if (!physicalRow || !deepEquals(legacyVal, physicalRow.payloadJson)) {
          mismatches.push(item.id);
        }
      }
    }
  } else if (entityType === "step") {
      const list = await executor
      .select({ id: lessonSteps.id, payloadJson: lessonSteps.payloadJson })
      .from(lessonSteps)
      .innerJoin(lessons, eq(lessonSteps.lessonId, lessons.id))
      .innerJoin(courses, eq(lessons.courseId, courses.id))
      .where(schoolCourseScope(schoolId));

    for (const item of list) {
      const payload = item.payloadJson as JsonObject;
      if (payload && typeof payload === "object" && pluginKey in payload) {
        const legacyVal = payload[pluginKey];
        const [physicalRow] = await executor
          .select({ payloadJson: pluginLessonStepExtensions.payloadJson })
          .from(pluginLessonStepExtensions)
          .where(
            and(
              eq(pluginLessonStepExtensions.schoolId, schoolId),
              eq(pluginLessonStepExtensions.pluginId, pluginId),
              eq(pluginLessonStepExtensions.lessonStepId, item.id),
            ),
          )
          .limit(1);

        if (!physicalRow || !deepEquals(legacyVal, physicalRow.payloadJson)) {
          mismatches.push(item.id);
        }
      }
    }
  } else if (entityType === "resource") {
      const list = await executor
      .select({ id: resources.id, content: resources.content })
      .from(resources)
      .where(eq(resources.schoolId, schoolId));

    for (const item of list) {
      const payload = extractResourcePluginPayload(item.content, pluginKey);
      if (payload && typeof payload === "object" && pluginKey in payload) {
        const legacyVal = payload[pluginKey];
        const [physicalRow] = await executor
          .select({ payloadJson: pluginResourceExtensions.payloadJson })
          .from(pluginResourceExtensions)
          .where(
            and(
              eq(pluginResourceExtensions.schoolId, schoolId),
              eq(pluginResourceExtensions.pluginId, pluginId),
              eq(pluginResourceExtensions.resourceId, item.id),
            ),
          )
          .limit(1);

        if (!physicalRow || !deepEquals(legacyVal, physicalRow.payloadJson)) {
          mismatches.push(item.id);
        }
      }
    }
  }

  return {
    matches: mismatches.length === 0,
    mismatches,
  };
}

/**
 * 3. Cutover 阶段：开启强物理事务，核对两端数据一致，随后在事务中彻底擦除核心表 JSON 中的冗余插件特征字段，
 * 实现彻底的物理割接。若核对不符则事务原子回滚。
 */
export async function cutoverPluginJsonToSchema(
  actorId: string,
  schoolId: string,
  pluginId: string,
  entityType: "lesson" | "step" | "resource",
  executor: MigrationDbExecutor = db,
  actorScope?: string,
): Promise<MigrationResult> {
  // 1. 鉴权
  await assertMarketplaceManagerScope(actorId, schoolId, actorScope);

  // 2. 前置校验数据完整性 (Verify)
  const verifyRes = await verifyBackfillData(actorId, schoolId, pluginId, entityType, executor, actorScope);
  if (!verifyRes.matches) {
    throw new Error(
      `CUTOVER_ABORTED: Verification failed for mismatching entity IDs: ${verifyRes.mismatches.join(", ")}`,
    );
  }

  const [pluginReg] = await executor
    .select({ pluginKey: pluginRegistrations.pluginKey, schoolId: pluginRegistrations.schoolId })
    .from(pluginRegistrations)
    .where(eq(pluginRegistrations.id, pluginId))
    .limit(1);

  if (!pluginReg || pluginReg.schoolId !== schoolId) {
    throw new Error("SCHOOL_CROSS_BOUNDARY_FORBIDDEN");
  }

  const { pluginKey } = pluginReg;
  const result: MigrationResult = { processed: 0, succeeded: 0, failed: 0, errors: [] };

  // 3. 物理数据库事务割接 (DDL 审计防护，仅使用 DML)
  await executor.transaction(async (tx) => {
    if (entityType === "lesson") {
      const list = await tx
        .select({ id: lessons.id, publishedVersionId: publishedLessonVersions.id, snapshotJson: publishedLessonVersions.snapshotJson })
        .from(lessons)
        .innerJoin(publishedLessonVersions, eq(lessons.publishedVersionId, publishedLessonVersions.id))
        .innerJoin(courses, eq(lessons.courseId, courses.id))
        .where(schoolCourseScope(schoolId));

      for (const item of list) {
        const payload = extractLessonPluginPayload(item.snapshotJson, pluginKey);
        if (payload && typeof payload === "object" && pluginKey in payload) {
          result.processed++;
          try {
            const legacyVal = payload[pluginKey];
            const [physicalRow] = await tx
              .select({ payloadJson: pluginLessonExtensions.payloadJson })
              .from(pluginLessonExtensions)
              .where(
                and(
                  eq(pluginLessonExtensions.schoolId, schoolId),
                  eq(pluginLessonExtensions.pluginId, pluginId),
                  eq(pluginLessonExtensions.lessonId, item.id),
                ),
              )
              .limit(1);

            physicalPayloadMatches(legacyVal, physicalRow?.payloadJson, item.id, pluginKey);

            const snapshot = structuredClone(item.snapshotJson as {
              lesson?: { payloadJson?: JsonObject };
            });
            const lessonPayload = snapshot.lesson?.payloadJson;
            if (!lessonPayload || typeof lessonPayload !== "object") {
              throw new Error("LESSON_PLUGIN_PAYLOAD_MISSING");
            }

            const newPayload = { ...lessonPayload };
            delete newPayload[pluginKey];
            snapshot.lesson = {
              ...(snapshot.lesson ?? {}),
              payloadJson: newPayload,
            };

            await tx
              .update(publishedLessonVersions)
              .set({
                snapshotJson: snapshot,
              })
              .where(eq(publishedLessonVersions.id, item.publishedVersionId));

            result.succeeded++;
          } catch (err: unknown) {
            result.failed++;
            const reason = getErrorMessage(err);
            result.errors.push({ entityId: item.id, reason });
            throw new Error(`CUTOVER_FAILED_TRANSACTION_ROLLBACK: ${reason}`);
          }
        }
      }
    } else if (entityType === "step") {
      const list = await tx
        .select({ id: lessonSteps.id, payloadJson: lessonSteps.payloadJson })
        .from(lessonSteps)
        .innerJoin(lessons, eq(lessonSteps.lessonId, lessons.id))
        .innerJoin(courses, eq(lessons.courseId, courses.id))
        .where(schoolCourseScope(schoolId));

      for (const item of list) {
        const payload = item.payloadJson as JsonObject;
        if (payload && typeof payload === "object" && pluginKey in payload) {
          result.processed++;
          try {
            const legacyVal = payload[pluginKey];
            const [physicalRow] = await tx
              .select({ payloadJson: pluginLessonStepExtensions.payloadJson })
              .from(pluginLessonStepExtensions)
              .where(
                and(
                  eq(pluginLessonStepExtensions.schoolId, schoolId),
                  eq(pluginLessonStepExtensions.pluginId, pluginId),
                  eq(pluginLessonStepExtensions.lessonStepId, item.id),
                ),
              )
              .limit(1);

            physicalPayloadMatches(legacyVal, physicalRow?.payloadJson, item.id, pluginKey);

            const newPayload = { ...payload };
            delete newPayload[pluginKey];

            await tx
              .update(lessonSteps)
              .set({
                payloadJson: newPayload,
                updatedAt: new Date(),
              })
              .where(eq(lessonSteps.id, item.id));

            result.succeeded++;
          } catch (err: unknown) {
            result.failed++;
            const reason = getErrorMessage(err);
            result.errors.push({ entityId: item.id, reason });
            throw new Error(`CUTOVER_FAILED_TRANSACTION_ROLLBACK: ${reason}`);
          }
        }
      }
    } else if (entityType === "resource") {
      const list = await tx
        .select({ id: resources.id, content: resources.content })
        .from(resources)
        .where(eq(resources.schoolId, schoolId));

      for (const item of list) {
        const payload = extractResourcePluginPayload(item.content, pluginKey);
        if (payload && typeof payload === "object" && pluginKey in payload) {
          result.processed++;
          try {
            const legacyVal = payload[pluginKey];
            const [physicalRow] = await tx
              .select({ payloadJson: pluginResourceExtensions.payloadJson })
              .from(pluginResourceExtensions)
              .where(
                and(
                  eq(pluginResourceExtensions.schoolId, schoolId),
                  eq(pluginResourceExtensions.pluginId, pluginId),
                  eq(pluginResourceExtensions.resourceId, item.id),
                ),
              )
              .limit(1);

            physicalPayloadMatches(legacyVal, physicalRow?.payloadJson, item.id, pluginKey);

            const newPayload = { ...payload };
            delete newPayload[pluginKey];

            await tx
              .update(resources)
              .set({
                content: JSON.stringify(newPayload),
                updatedAt: new Date(),
              })
              .where(eq(resources.id, item.id));

            result.succeeded++;
          } catch (err: unknown) {
            result.failed++;
            const reason = getErrorMessage(err);
            result.errors.push({ entityId: item.id, reason });
            throw new Error(`CUTOVER_FAILED_TRANSACTION_ROLLBACK: ${reason}`);
          }
        }
      }
    }
  });

  return result;
}

export async function preflightPluginUpgrade(input: {
  actorId: string;
  schoolId: string;
  pluginId: string;
  targetVersion: string;
  actorScope?: string;
}) : Promise<PluginUpgradePreflightResult> {
  await assertMarketplaceManagerScope(input.actorId, input.schoolId, input.actorScope);

  const [pluginReg] = await db
    .select({ manifestJson: pluginRegistrations.manifestJson, schoolId: pluginRegistrations.schoolId, lifecycleState: pluginRegistrations.lifecycleState })
    .from(pluginRegistrations)
    .where(eq(pluginRegistrations.id, input.pluginId))
    .limit(1);

  if (!pluginReg || pluginReg.schoolId !== input.schoolId) {
    throw new Error("PLUGIN_NOT_FOUND");
  }

  const currentVersion = String((pluginReg.manifestJson as { version?: unknown } | null)?.version ?? "0.0.0");
  const normalizedCurrentVersion = valid(currentVersion);
  const normalizedTargetVersion = valid(input.targetVersion);
  const activeSessions = await listUpgradeActiveSessions(input.schoolId, input.pluginId);
  const [questionRows, responseRows] = await Promise.all([
    db.select({ classroomSession: pluginOwnedQuizQuestions.classroomSession }).from(pluginOwnedQuizQuestions).where(and(eq(pluginOwnedQuizQuestions.schoolId, input.schoolId), eq(pluginOwnedQuizQuestions.pluginId, input.pluginId))),
    db.select({ classroomSession: pluginOwnedQuizResponses.classroomSession, student: pluginOwnedQuizResponses.student, question: pluginOwnedQuizResponses.question, selectedOption: pluginOwnedQuizResponses.selectedOption, isLatest: pluginOwnedQuizResponses.isLatest }).from(pluginOwnedQuizResponses).where(and(eq(pluginOwnedQuizResponses.schoolId, input.schoolId), eq(pluginOwnedQuizResponses.pluginId, input.pluginId))),
  ]);

  const blockers = [
    ...(activeSessions.length > 0 ? ["PLUGIN_ACTIVE_CLASSROOM_BLOCKED"] : []),
    ...(!normalizedCurrentVersion || !normalizedTargetVersion || !gt(normalizedTargetVersion, normalizedCurrentVersion) ? ["PLUGIN_UPGRADE_VERSION_INVALID"] : []),
  ];

  return {
    pluginId: input.pluginId,
    schoolId: input.schoolId,
    currentVersion,
    targetVersion: input.targetVersion,
    hasOwnedQuizData: questionRows.length > 0 || responseRows.length > 0,
    stages: ["backfill", "verify", "cutover"],
    blockers,
    statsParityPreview: {
      questionCount: questionRows.length,
      responseCount: responseRows.length,
      latestResponseHash: buildLatestQuizResponseHash(responseRows.map((row) => ({
        classroomSession: String(row.classroomSession),
        student: String(row.student),
        question: String(row.question),
        selectedOption: String(row.selectedOption),
        isLatest: Boolean(row.isLatest),
      }))),
    },
    activeSessions,
  };
}

export async function executePluginUpgradeWithTx(input: {
  actorId: string;
  schoolId: string;
  pluginId: string;
  targetVersion: string;
  tx: unknown;
  actorScope?: string;
  commandContext?: { commandId: string; correlationId: string; attemptNumber: number };
}) : Promise<PluginUpgradeExecutionResult> {
  const preflight = await preflightPluginUpgrade({
    actorId: input.actorId,
    schoolId: input.schoolId,
    pluginId: input.pluginId,
    targetVersion: input.targetVersion,
    actorScope: input.actorScope,
  });

  if (preflight.blockers.length > 0) {
    throw new Error(preflight.blockers[0] ?? "PLUGIN_UPGRADE_BLOCKED");
  }

  const stages: PluginUpgradeExecutionResult["stages"] = [
    { name: "backfill", status: "completed" },
    { name: "verify", status: "completed" },
    { name: "cutover", status: "skipped" },
  ];

  await backfillPluginJsonToSchema(input.actorId, input.schoolId, input.pluginId, "lesson", input.tx as MigrationDbExecutor, input.actorScope);
  await backfillPluginJsonToSchema(input.actorId, input.schoolId, input.pluginId, "step", input.tx as MigrationDbExecutor, input.actorScope);
  await backfillPluginJsonToSchema(input.actorId, input.schoolId, input.pluginId, "resource", input.tx as MigrationDbExecutor, input.actorScope);

  const verifyResults = await Promise.all([
    verifyBackfillData(input.actorId, input.schoolId, input.pluginId, "lesson", input.tx as MigrationDbExecutor, input.actorScope),
    verifyBackfillData(input.actorId, input.schoolId, input.pluginId, "step", input.tx as MigrationDbExecutor, input.actorScope),
    verifyBackfillData(input.actorId, input.schoolId, input.pluginId, "resource", input.tx as MigrationDbExecutor, input.actorScope),
  ]);

  if (verifyResults.some((result) => !result.matches)) {
    stages[1] = { name: "verify", status: "failed" };
    return {
      pluginId: input.pluginId,
      schoolId: input.schoolId,
      currentVersion: preflight.currentVersion,
      targetVersion: input.targetVersion,
      upgraded: false,
      verifyPassed: false,
      lifecycleState: "enabled",
      stages,
      failureDetail: "VERIFY_FAILED",
      invalidatedSessionIds: preflight.activeSessions.map((session) => session.sessionId),
    };
  }

  await cutoverPluginJsonToSchema(input.actorId, input.schoolId, input.pluginId, "lesson", input.tx as MigrationDbExecutor, input.actorScope);
  await cutoverPluginJsonToSchema(input.actorId, input.schoolId, input.pluginId, "step", input.tx as MigrationDbExecutor, input.actorScope);
  await cutoverPluginJsonToSchema(input.actorId, input.schoolId, input.pluginId, "resource", input.tx as MigrationDbExecutor, input.actorScope);
  stages[2] = { name: "cutover", status: "completed" };

  const [pluginReg] = await (input.tx as MigrationDbExecutor)
    .select({
      manifestJson: pluginRegistrations.manifestJson,
      lifecycleState: pluginRegistrations.lifecycleState,
      dataVersion: pluginRegistrations.dataVersion,
    })
    .from(pluginRegistrations)
    .where(and(eq(pluginRegistrations.id, input.pluginId), eq(pluginRegistrations.schoolId, input.schoolId)))
    .limit(1);

  if (!pluginReg) {
    throw new Error("PLUGIN_NOT_FOUND");
  }

  await (input.tx as MigrationDbExecutor)
    .update(pluginRegistrations)
    .set({
      manifestJson: {
        ...(pluginReg.manifestJson as Record<string, unknown>),
        version: input.targetVersion,
      },
      dataVersion: Number(pluginReg.dataVersion ?? 1) + 1,
      lifecycleState: pluginReg.lifecycleState,
      updatedAt: new Date(),
    })
    .where(and(eq(pluginRegistrations.id, input.pluginId), eq(pluginRegistrations.schoolId, input.schoolId)));

  return {
    pluginId: input.pluginId,
    schoolId: input.schoolId,
    currentVersion: preflight.currentVersion,
    targetVersion: input.targetVersion,
    upgraded: true,
    verifyPassed: true,
    lifecycleState: "enabled",
    stages,
    failureDetail: null,
    invalidatedSessionIds: preflight.activeSessions.map((session) => session.sessionId),
  };
}
