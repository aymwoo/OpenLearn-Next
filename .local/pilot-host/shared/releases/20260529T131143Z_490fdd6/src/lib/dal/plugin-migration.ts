import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
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
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";

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

function ownedCourseScope(scope: Awaited<ReturnType<typeof assertTeacherManagerScope>>, schoolId: string) {
  return and(eq(courses.schoolId, schoolId), eq(courses.ownerId, scope.userId));
}

export interface MigrationResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ entityId: string; reason: string }>;
}

/**
 * deepEquals 辅助方法，用于判断两个复杂 JSON 对象是否一致
 */
function deepEquals(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEquals(a[key], b[key])) return false;
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
): Promise<MigrationResult> {
  // 1. 鉴权
  const scope = await assertTeacherManagerScope(actorId, schoolId);

  // 2. 捞取插件登记稳定身份
  const [pluginReg] = await db
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
    const list = await db
      .select({ id: lessons.id, snapshotJson: publishedLessonVersions.snapshotJson })
      .from(lessons)
      .innerJoin(publishedLessonVersions, eq(lessons.publishedVersionId, publishedLessonVersions.id))
      .innerJoin(courses, eq(lessons.courseId, courses.id))
      .where(ownedCourseScope(scope, schoolId));

    for (const item of list) {
      const payload = extractLessonPluginPayload(item.snapshotJson, pluginKey) as Record<string, any> | null;
      if (payload && typeof payload === "object" && pluginKey in payload) {
        result.processed++;
        try {
          const extracted = payload[pluginKey];
          await db
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
        } catch (err: any) {
          result.failed++;
          result.errors.push({ entityId: item.id, reason: err.message });
        }
      }
    }
  } else if (entityType === "step") {
    const list = await db
      .select({ id: lessonSteps.id, payloadJson: lessonSteps.payloadJson })
      .from(lessonSteps)
      .innerJoin(lessons, eq(lessonSteps.lessonId, lessons.id))
      .innerJoin(courses, eq(lessons.courseId, courses.id))
      .where(ownedCourseScope(scope, schoolId));

    for (const item of list) {
      const payload = item.payloadJson as Record<string, any>;
      if (payload && typeof payload === "object" && pluginKey in payload) {
        result.processed++;
        try {
          const extracted = payload[pluginKey];
          await db
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
        } catch (err: any) {
          result.failed++;
          result.errors.push({ entityId: item.id, reason: err.message });
        }
      }
    }
  } else if (entityType === "resource") {
    const list = await db
      .select({ id: resources.id, content: resources.content })
      .from(resources)
      .where(eq(resources.schoolId, schoolId));

    for (const item of list) {
      const payload = extractResourcePluginPayload(item.content, pluginKey) as Record<string, any> | null;
      if (payload && typeof payload === "object" && pluginKey in payload) {
        result.processed++;
        try {
          const extracted = payload[pluginKey];
          await db
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
        } catch (err: any) {
          result.failed++;
          result.errors.push({ entityId: item.id, reason: err.message });
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
): Promise<{ matches: boolean; mismatches: string[] }> {
  // 1. 鉴权
  const scope = await assertTeacherManagerScope(actorId, schoolId);

  const [pluginReg] = await db
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
    const list = await db
      .select({ id: lessons.id, snapshotJson: publishedLessonVersions.snapshotJson })
      .from(lessons)
      .innerJoin(publishedLessonVersions, eq(lessons.publishedVersionId, publishedLessonVersions.id))
      .innerJoin(courses, eq(lessons.courseId, courses.id))
      .where(ownedCourseScope(scope, schoolId));

    for (const item of list) {
      const payload = extractLessonPluginPayload(item.snapshotJson, pluginKey) as Record<string, any> | null;
      if (payload && typeof payload === "object" && pluginKey in payload) {
        const legacyVal = payload[pluginKey];
        const [physicalRow] = await db
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
    const list = await db
      .select({ id: lessonSteps.id, payloadJson: lessonSteps.payloadJson })
      .from(lessonSteps)
      .innerJoin(lessons, eq(lessonSteps.lessonId, lessons.id))
      .innerJoin(courses, eq(lessons.courseId, courses.id))
      .where(ownedCourseScope(scope, schoolId));

    for (const item of list) {
      const payload = item.payloadJson as Record<string, any>;
      if (payload && typeof payload === "object" && pluginKey in payload) {
        const legacyVal = payload[pluginKey];
        const [physicalRow] = await db
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
    const list = await db
      .select({ id: resources.id, content: resources.content })
      .from(resources)
      .where(eq(resources.schoolId, schoolId));

    for (const item of list) {
      const payload = extractResourcePluginPayload(item.content, pluginKey) as Record<string, any> | null;
      if (payload && typeof payload === "object" && pluginKey in payload) {
        const legacyVal = payload[pluginKey];
        const [physicalRow] = await db
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
): Promise<MigrationResult> {
  // 1. 鉴权
  const scope = await assertTeacherManagerScope(actorId, schoolId);

  // 2. 前置校验数据完整性 (Verify)
  const verifyRes = await verifyBackfillData(actorId, schoolId, pluginId, entityType);
  if (!verifyRes.matches) {
    throw new Error(
      `CUTOVER_ABORTED: Verification failed for mismatching entity IDs: ${verifyRes.mismatches.join(", ")}`,
    );
  }

  const [pluginReg] = await db
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
  await db.transaction(async (tx) => {
    if (entityType === "lesson") {
      const list = await tx
        .select({ id: lessons.id, publishedVersionId: publishedLessonVersions.id, snapshotJson: publishedLessonVersions.snapshotJson })
        .from(lessons)
        .innerJoin(publishedLessonVersions, eq(lessons.publishedVersionId, publishedLessonVersions.id))
        .innerJoin(courses, eq(lessons.courseId, courses.id))
        .where(ownedCourseScope(scope, schoolId));

      for (const item of list) {
        const payload = extractLessonPluginPayload(item.snapshotJson, pluginKey) as Record<string, any> | null;
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
              lesson?: { payloadJson?: Record<string, any> };
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
          } catch (err: any) {
            result.failed++;
            result.errors.push({ entityId: item.id, reason: err.message });
            throw new Error(`CUTOVER_FAILED_TRANSACTION_ROLLBACK: ${err.message}`);
          }
        }
      }
    } else if (entityType === "step") {
      const list = await tx
        .select({ id: lessonSteps.id, payloadJson: lessonSteps.payloadJson })
        .from(lessonSteps)
        .innerJoin(lessons, eq(lessonSteps.lessonId, lessons.id))
        .innerJoin(courses, eq(lessons.courseId, courses.id))
        .where(ownedCourseScope(scope, schoolId));

      for (const item of list) {
        const payload = item.payloadJson as Record<string, any>;
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
          } catch (err: any) {
            result.failed++;
            result.errors.push({ entityId: item.id, reason: err.message });
            throw new Error(`CUTOVER_FAILED_TRANSACTION_ROLLBACK: ${err.message}`);
          }
        }
      }
    } else if (entityType === "resource") {
      const list = await tx
        .select({ id: resources.id, content: resources.content })
        .from(resources)
        .where(eq(resources.schoolId, schoolId));

      for (const item of list) {
        const payload = extractResourcePluginPayload(item.content, pluginKey) as Record<string, any> | null;
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
          } catch (err: any) {
            result.failed++;
            result.errors.push({ entityId: item.id, reason: err.message });
            throw new Error(`CUTOVER_FAILED_TRANSACTION_ROLLBACK: ${err.message}`);
          }
        }
      }
    }
  });

  return result;
}
