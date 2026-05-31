import "server-only";

import { and, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";

import { db } from "@/db";
import {
  courses,
  governanceAudits,
  lessons,
  lessonSteps,
  pluginActionAudits,
  pluginLessonExtensions,
  pluginLessonStepExtensions,
  pluginOwnedBusinessData,
  pluginRegistrations,
  pluginResourceExtensions,
  resources,
} from "@/db/schema";
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";
import { cacheTags } from "@/lib/cache-policy";

type JsonObject = Record<string, unknown>;
type PluginManifestJson = JsonObject & { permissions?: unknown };

/**
 * 校验当前 actor 是否属于合法的学校教师管理员，并进行权限断言
 * 
 * Args:
 *   actorId: 发起操作的用户 ID
 *   schoolId: 发起操作的学校租户 ID
 * 
 * Returns:
 *   返回对应的 TeacherScope 数据结构
 * 
 * Throws:
 *   Error("PLUGIN_ACTOR_REQUIRED"): actorId 缺失时抛出
 *   Error("TEACHER_AUTH_REQUIRED"): 操作人鉴权未通过或不属于该学校时抛出
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

/**
 * 断言目标物理核心实体是否确实属于传入的学校租户，并在 lesson/step 上复用 authoring owner 边界
 * 
 * Args:
 *   scope: 已完成教师鉴权的操作者范围
 *   schoolId: 学校租户 ID
 *   entityType: 核心实体类型 ("lesson" | "step" | "resource")
 *   entityId: 核心实体唯一标识 ID
 * 
 * Throws:
 *   Error("SCHOOL_CROSS_BOUNDARY_FORBIDDEN"): 目标实体不属于当前传入学校时抛出
 *   Error("INVALID_ENTITY_TYPE"): 传入不支持的实体类型时抛出
 */
async function assertEntityBelongsToSchool(
  scope: Awaited<ReturnType<typeof assertTeacherManagerScope>>,
  schoolId: string,
  entityType: "lesson" | "step" | "resource",
  entityId: string,
) {
  if (entityType === "lesson") {
    const [result] = await db
      .select({ schoolId: courses.schoolId, ownerId: courses.ownerId })
      .from(lessons)
      .innerJoin(courses, eq(lessons.courseId, courses.id))
      .where(eq(lessons.id, entityId))
      .limit(1);

    if (!result || result.schoolId !== schoolId) {
      throw new Error("SCHOOL_CROSS_BOUNDARY_FORBIDDEN");
    }

    if (result.ownerId !== scope.userId) {
      throw new Error("TEACHER_AUTH_REQUIRED");
    }
  } else if (entityType === "step") {
    const [result] = await db
      .select({ schoolId: courses.schoolId, ownerId: courses.ownerId })
      .from(lessonSteps)
      .innerJoin(lessons, eq(lessonSteps.lessonId, lessons.id))
      .innerJoin(courses, eq(lessons.courseId, courses.id))
      .where(eq(lessonSteps.id, entityId))
      .limit(1);

    if (!result || result.schoolId !== schoolId) {
      throw new Error("SCHOOL_CROSS_BOUNDARY_FORBIDDEN");
    }

    if (result.ownerId !== scope.userId) {
      throw new Error("TEACHER_AUTH_REQUIRED");
    }
  } else if (entityType === "resource") {
    const [result] = await db
      .select({ schoolId: resources.schoolId })
      .from(resources)
      .where(eq(resources.id, entityId))
      .limit(1);

    if (!result || result.schoolId !== schoolId) {
      throw new Error("SCHOOL_CROSS_BOUNDARY_FORBIDDEN");
    }
  } else {
    throw new Error("INVALID_ENTITY_TYPE");
  }
}

/**
 * 断言目标插件安装记录是否确实属于传入的学校租户，严防跨校越界注入
 * 
 * Args:
 *   schoolId: 学校租户 ID
 *   pluginId: 插件主表 ID
 * 
 * Throws:
 *   Error("SCHOOL_CROSS_BOUNDARY_FORBIDDEN"): 插件不属于当前传入学校时抛出
 */
async function assertPluginBelongsToSchool(schoolId: string, pluginId: string) {
  const [result] = await db
    .select({ schoolId: pluginRegistrations.schoolId })
    .from(pluginRegistrations)
    .where(eq(pluginRegistrations.id, pluginId))
    .limit(1);

  if (!result || result.schoolId !== schoolId) {
    throw new Error("SCHOOL_CROSS_BOUNDARY_FORBIDDEN");
  }
}

async function assertPluginBelongsToSchoolAndGetManifest(schoolId: string, pluginId: string) {
  const [result] = await db
    .select({
      schoolId: pluginRegistrations.schoolId,
      manifestJson: pluginRegistrations.manifestJson,
    })
    .from(pluginRegistrations)
    .where(eq(pluginRegistrations.id, pluginId))
    .limit(1);

  if (!result || result.schoolId !== schoolId) {
    throw new Error("SCHOOL_CROSS_BOUNDARY_FORBIDDEN");
  }

  return result.manifestJson as PluginManifestJson | null;
}

export type ExtensionEntityType = "lesson" | "step" | "resource";

export interface UpsertExtensionInput {
  actorId: string;
  schoolId: string;
  pluginId: string;
  entityType: ExtensionEntityType;
  entityId: string;
  payloadJson: JsonObject;
}

export interface GetExtensionInput {
  actorId: string;
  schoolId: string;
  pluginId: string;
  entityType: ExtensionEntityType;
  entityId: string;
}

export interface PluginStepExtensionRecord {
  lessonStepId: string;
  pluginId: string;
  payloadJson: JsonObject;
  updatedAt: Date | number | null;
}

async function upsertPluginStepExtensionWithTx(input: {
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0];
  schoolId: string;
  pluginId: string;
  lessonStepId: string;
  payloadJson: JsonObject;
}) {
  const existing = await input.tx
    .select()
    .from(pluginLessonStepExtensions)
    .where(
      and(
        eq(pluginLessonStepExtensions.schoolId, input.schoolId),
        eq(pluginLessonStepExtensions.pluginId, input.pluginId),
        eq(pluginLessonStepExtensions.lessonStepId, input.lessonStepId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await input.tx
      .update(pluginLessonStepExtensions)
      .set({
        payloadJson: input.payloadJson,
        updatedAt: new Date(),
      })
      .where(eq(pluginLessonStepExtensions.id, existing[0].id));
    return;
  }

  await input.tx.insert(pluginLessonStepExtensions).values({
    schoolId: input.schoolId,
    pluginId: input.pluginId,
    lessonStepId: input.lessonStepId,
    payloadJson: input.payloadJson,
  });
}

/**
 * 统一的核心实体扩展数据 upsert 接口，实现严格多维度隔离权限防范与幂等性
 * 
 * Args:
 *   input: 包含 actorId, schoolId, pluginId, entityType, entityId 和 payloadJson 的输入 DTO
 * 
 * Returns:
 *   返回 Promise<void> 代表处理完成
 */
export async function upsertPluginExtension(input: UpsertExtensionInput): Promise<void> {
  const { actorId, schoolId, pluginId, entityType, entityId, payloadJson } = input;

  // 1. 教师权限鉴权
  const scope = await assertTeacherManagerScope(actorId, schoolId);

  // 2. 多租户跨校物理安全边界拦截与 Manifest 捞取
  const manifestJson = await assertPluginBelongsToSchoolAndGetManifest(schoolId, pluginId);
  await assertEntityBelongsToSchool(scope, schoolId, entityType, entityId);

  // 3. 插件自声明权限校验 (Manifest Permissions Check)
  const permissions = (manifestJson?.permissions || []) as string[];
  let requiredPermission = "";
  if (entityType === "lesson" || entityType === "step") {
    const hasPerm = permissions.includes("lesson:write") || permissions.includes("lesson:extension:write");
    if (!hasPerm) {
      throw new Error("PLUGIN_MANIFEST_PERMISSION_DENIED");
    }
    requiredPermission = permissions.includes("lesson:write") ? "lesson:write" : "lesson:extension:write";
  } else if (entityType === "resource") {
    const hasPerm = permissions.includes("resource:write") || permissions.includes("resource:extension:write");
    if (!hasPerm) {
      throw new Error("PLUGIN_MANIFEST_PERMISSION_DENIED");
    }
    requiredPermission = permissions.includes("resource:write") ? "resource:write" : "resource:extension:write";
  } else {
    throw new Error("INVALID_ENTITY_TYPE");
  }

  const correlationId = crypto.randomUUID();

  // 4. 执行物理事务 (Drizzle Transaction)
  await db.transaction(async (tx) => {
    if (entityType === "lesson") {
      const existing = await tx
        .select()
        .from(pluginLessonExtensions)
        .where(
          and(
            eq(pluginLessonExtensions.schoolId, schoolId),
            eq(pluginLessonExtensions.pluginId, pluginId),
            eq(pluginLessonExtensions.lessonId, entityId),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        await tx
          .update(pluginLessonExtensions)
          .set({
            payloadJson,
            updatedAt: new Date(),
          })
          .where(eq(pluginLessonExtensions.id, existing[0].id));
      } else {
        await tx.insert(pluginLessonExtensions).values({
          schoolId,
          pluginId,
          lessonId: entityId,
          payloadJson,
        });
      }
    } else if (entityType === "step") {
      await upsertPluginStepExtensionWithTx({
        tx,
        schoolId,
        pluginId,
        lessonStepId: entityId,
        payloadJson,
      });
    } else if (entityType === "resource") {
      const existing = await tx
        .select()
        .from(pluginResourceExtensions)
        .where(
          and(
            eq(pluginResourceExtensions.schoolId, schoolId),
            eq(pluginResourceExtensions.pluginId, pluginId),
            eq(pluginResourceExtensions.resourceId, entityId),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        await tx
          .update(pluginResourceExtensions)
          .set({
            payloadJson,
            updatedAt: new Date(),
          })
          .where(eq(pluginResourceExtensions.id, existing[0].id));
      } else {
        await tx.insert(pluginResourceExtensions).values({
          schoolId,
          pluginId,
          resourceId: entityId,
          payloadJson,
        });
      }
    }

    // 写入物理审计日志 pluginActionAudits
    await tx.insert(pluginActionAudits).values({
      pluginId,
      action: "upsert_extension",
      decision: "allowed",
      schoolId,
      actorScope: "teacher",
      correlationId,
      payloadJson: { entityType, entityId, payloadJson },
      actorId,
    });

    // 写入物理决策日志 governanceAudits
    await tx.insert(governanceAudits).values({
      targetType: "plugin",
      targetId: pluginId,
      pluginId,
      schoolId,
      action: "upsert_extension",
      decision: "allowed",
      actorId,
      actorScope: "teacher",
      requestedCapabilitiesJson: [requiredPermission],
      grantedCapabilitiesJson: permissions,
      requiredPermission,
      correlationId,
      payloadJson: { entityType, entityId },
    });
  });

  // 5. 级联重置 Next.js 16 缓存标记
  // 失效插件本身的扩展数据缓存
  revalidateTag(cacheTags.pluginExtension(schoolId, pluginId, entityId), "max");

  // 回溯并失效父级核心实体缓存
  if (entityType === "lesson") {
    const lessonResults = await db
      .select({ courseId: lessons.courseId })
      .from(lessons)
      .where(eq(lessons.id, entityId))
      .limit(1);
    const lesson = lessonResults?.[0];

    revalidateTag(cacheTags.lesson(entityId), "max");
    if (lesson) {
      revalidateTag(cacheTags.course(lesson.courseId), "max");
    }
  } else if (entityType === "step") {
    const stepResults = await db
      .select({ lessonId: lessonSteps.lessonId })
      .from(lessonSteps)
      .where(eq(lessonSteps.id, entityId))
      .limit(1);
    const step = stepResults?.[0];

    if (step) {
      const lessonResults = await db
        .select({ courseId: lessons.courseId })
        .from(lessons)
        .where(eq(lessons.id, step.lessonId))
        .limit(1);
      const lesson = lessonResults?.[0];

      revalidateTag(cacheTags.steps(step.lessonId), "max");
      revalidateTag(cacheTags.lesson(step.lessonId), "max");
      if (lesson) {
        revalidateTag(cacheTags.course(lesson.courseId), "max");
      }
    }
  } else if (entityType === "resource") {
    revalidateTag(cacheTags.resource(entityId), "max");
    revalidateTag(cacheTags.resources(schoolId), "max");
  }
}

export { upsertPluginStepExtensionWithTx };

/**
 * 统一的核心实体扩展数据读取查询接口
 * 
 * Args:
 *   input: 包含 actorId, schoolId, pluginId, entityType, entityId 的输入 DTO
 * 
 * Returns:
 *   若存在数据，则返回对应的 Record 映射；若不存在，则返回 null
 */
export async function getPluginExtension(input: GetExtensionInput): Promise<JsonObject | null> {
  const { actorId, schoolId, pluginId, entityType, entityId } = input;

  // 1. 教师权限鉴权
  const scope = await assertTeacherManagerScope(actorId, schoolId);

  // 2. 多租户安全隔离拦截
  await assertPluginBelongsToSchool(schoolId, pluginId);
  await assertEntityBelongsToSchool(scope, schoolId, entityType, entityId);

  // 3. 执行查询
  if (entityType === "lesson") {
    const [row] = await db
      .select()
      .from(pluginLessonExtensions)
      .where(
        and(
          eq(pluginLessonExtensions.schoolId, schoolId),
          eq(pluginLessonExtensions.pluginId, pluginId),
          eq(pluginLessonExtensions.lessonId, entityId),
        ),
      )
      .limit(1);
    return row ? (row.payloadJson as JsonObject) : null;
  } else if (entityType === "step") {
    const [row] = await db
      .select()
      .from(pluginLessonStepExtensions)
      .where(
        and(
          eq(pluginLessonStepExtensions.schoolId, schoolId),
          eq(pluginLessonStepExtensions.pluginId, pluginId),
          eq(pluginLessonStepExtensions.lessonStepId, entityId),
        ),
      )
      .limit(1);
    return row ? (row.payloadJson as JsonObject) : null;
  } else if (entityType === "resource") {
    const [row] = await db
      .select()
      .from(pluginResourceExtensions)
      .where(
        and(
          eq(pluginResourceExtensions.schoolId, schoolId),
          eq(pluginResourceExtensions.pluginId, pluginId),
          eq(pluginResourceExtensions.resourceId, entityId),
        ),
      )
      .limit(1);
    return row ? (row.payloadJson as JsonObject) : null;
  }
  return null;
}

export async function listPluginStepExtensions(input: {
  actorId: string;
  schoolId: string;
  pluginId: string;
  lessonStepIds: string[];
}): Promise<PluginStepExtensionRecord[]> {
  if (input.lessonStepIds.length === 0) {
    return [];
  }

  const scope = await assertTeacherManagerScope(input.actorId, input.schoolId);
  await assertPluginBelongsToSchool(input.schoolId, input.pluginId);

  await Promise.all(
    input.lessonStepIds.map((lessonStepId) => assertEntityBelongsToSchool(scope, input.schoolId, "step", lessonStepId)),
  );

  const rows = await db
    .select({
      lessonStepId: pluginLessonStepExtensions.lessonStepId,
      pluginId: pluginLessonStepExtensions.pluginId,
      payloadJson: pluginLessonStepExtensions.payloadJson,
      updatedAt: pluginLessonStepExtensions.updatedAt,
    })
    .from(pluginLessonStepExtensions)
    .where(
      and(
        eq(pluginLessonStepExtensions.schoolId, input.schoolId),
        eq(pluginLessonStepExtensions.pluginId, input.pluginId),
      ),
    );

  const allowedIds = new Set(input.lessonStepIds);
  return rows
    .filter((row) => allowedIds.has(row.lessonStepId))
    .map((row) => ({
      lessonStepId: row.lessonStepId,
      pluginId: row.pluginId,
      payloadJson: row.payloadJson as JsonObject,
      updatedAt: row.updatedAt,
    }));
}

export interface UpsertOwnedBusinessDataInput {
  actorId: string;
  schoolId: string;
  pluginId: string;
  key: string;
  payloadJson: JsonObject;
}

export interface GetOwnedBusinessDataInput {
  actorId: string;
  schoolId: string;
  pluginId: string;
  key: string;
}

/**
 * 插件自有私有独立业务表数据 upsert 写入接口
 * 
 * Args:
 *   input: 包含 actorId, schoolId, pluginId, key, payloadJson 的写入 DTO
 * 
 * Throws:
 *   Error("PLUGIN_KEY_REQUIRED"): 查询特征关键字 key 缺失或为空白时抛出
 */
export async function upsertPluginOwnedBusinessData(input: UpsertOwnedBusinessDataInput): Promise<void> {
  const { actorId, schoolId, pluginId, key, payloadJson } = input;

  if (!key?.trim()) {
    throw new Error("PLUGIN_KEY_REQUIRED");
  }

  // 1. 教师权限鉴权
  await assertTeacherManagerScope(actorId, schoolId);

  // 2. 多租户跨校物理安全边界拦截与 Manifest 捞取
  const manifestJson = await assertPluginBelongsToSchoolAndGetManifest(schoolId, pluginId);

  // 3. 插件自声明权限校验 (Manifest Permissions Check)
  const permissions = (manifestJson?.permissions || []) as string[];
  const hasPerm = permissions.includes("plugin:owned:write") || permissions.includes("plugin:write") || permissions.includes("plugin:extension:write");
  if (!hasPerm) {
    throw new Error("PLUGIN_MANIFEST_PERMISSION_DENIED");
  }
  const requiredPermission = permissions.includes("plugin:owned:write")
    ? "plugin:owned:write"
    : (permissions.includes("plugin:write") ? "plugin:write" : "plugin:extension:write");

  const correlationId = crypto.randomUUID();

  // 4. 执行物理事务 (Drizzle Transaction)
  await db.transaction(async (tx) => {
    await tx
      .insert(pluginOwnedBusinessData)
      .values({
        schoolId,
        pluginId,
        key,
        payloadJson,
      })
      .onConflictDoUpdate({
        target: [
          pluginOwnedBusinessData.schoolId,
          pluginOwnedBusinessData.pluginId,
          pluginOwnedBusinessData.key,
        ],
        set: {
          payloadJson,
          updatedAt: new Date(),
        },
      });

    // 写入物理审计日志 pluginActionAudits
    await tx.insert(pluginActionAudits).values({
      pluginId,
      action: "upsert_owned_business",
      decision: "allowed",
      schoolId,
      actorScope: "teacher",
      correlationId,
      payloadJson: { key, payloadJson },
      actorId,
    });

    // 写入物理决策日志 governanceAudits
    await tx.insert(governanceAudits).values({
      targetType: "plugin",
      targetId: pluginId,
      pluginId,
      schoolId,
      action: "upsert_owned_business",
      decision: "allowed",
      actorId,
      actorScope: "teacher",
      requestedCapabilitiesJson: [requiredPermission],
      grantedCapabilitiesJson: permissions,
      requiredPermission,
      correlationId,
      payloadJson: { key },
    });
  });

  // 5. 级联重置 Next.js 16 缓存标记
  revalidateTag(cacheTags.pluginOwned(schoolId, pluginId, key), "max");
}

/**
 * 插件自有私有独立业务表数据获取查询接口
 * 
 * Args:
 *   input: 包含 actorId, schoolId, pluginId, key 的查询 DTO
 * 
 * Returns:
 *   若存在数据，则返回对应的 Record 映射；若不存在，则返回 null
 * 
 * Throws:
 *   Error("PLUGIN_KEY_REQUIRED"): 查询特征关键字 key 缺失或为空白时抛出
 */
export async function getPluginOwnedBusinessData(input: GetOwnedBusinessDataInput): Promise<JsonObject | null> {
  const { actorId, schoolId, pluginId, key } = input;

  if (!key?.trim()) {
    throw new Error("PLUGIN_KEY_REQUIRED");
  }

  // 1. 教师权限鉴权
  await assertTeacherManagerScope(actorId, schoolId);

  // 2. 多租户跨校物理安全边界拦截
  await assertPluginBelongsToSchool(schoolId, pluginId);

  // 3. 执行查询
  const [row] = await db
    .select()
    .from(pluginOwnedBusinessData)
    .where(
      and(
        eq(pluginOwnedBusinessData.schoolId, schoolId),
        eq(pluginOwnedBusinessData.pluginId, pluginId),
        eq(pluginOwnedBusinessData.key, key),
      ),
    )
    .limit(1);

  return row ? (row.payloadJson as JsonObject) : null;
}
