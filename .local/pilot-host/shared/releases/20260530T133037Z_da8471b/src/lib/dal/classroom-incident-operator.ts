import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  classes,
  classroomSessions,
  lessons,
  publishedLessonVersions,
} from "@/db/schema";
import { readPluginGovernanceLifecycle } from "@/features/platform-core/actions/registry";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { readClassroomIncidentSnapshot } from "@/lib/dal/classroom-incident-list";
import {
  buildClassroomIncidentActionSets,
} from "@/lib/dal/classroom-incident-operator-actions";
import { getUserMembershipsDTO } from "@/lib/dal/membership";
import {
  ClassroomIncidentOperatorDTOSchema,
  type ClassroomIncidentOperatorDTO,
} from "@/lib/dto/classroom-incident-operator";

function toIso(value: Date | number | null | undefined) {
  if (!value) {
    return new Date(0).toISOString();
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

async function resolveOperatorScope() {
  const user = await getCurrentUserDTO();
  if (!user) {
    throw new Error("AUTH_REQUIRED");
  }

  const memberships = await getUserMembershipsDTO(user.id);
  const activeMemberships = memberships.filter(
    (membership) => membership.status === "active",
  );
  const schoolIds = [...new Set(activeMemberships.map((membership) => membership.schoolId))];

  if (activeMemberships.some((membership) => membership.role === "developer")) {
    return { scopeRole: "developer" as const, schoolIds };
  }

  if (activeMemberships.some((membership) => membership.role === "admin")) {
    return { scopeRole: "admin" as const, schoolIds };
  }

  throw new Error("CLASSROOM_INCIDENT_FORBIDDEN");
}

export async function getClassroomIncidentOperatorDTO(input: {
  classroomSessionId: string;
}): Promise<ClassroomIncidentOperatorDTO> {
  const user = await getCurrentUserDTO();
  if (!user) {
    throw new Error("AUTH_REQUIRED");
  }

  const scope = await resolveOperatorScope();
  const session = await db.query.classroomSessions.findFirst({
    where: eq(classroomSessions.id, input.classroomSessionId),
  });
  if (!session || session.id !== input.classroomSessionId) {
    throw new Error("CLASSROOM_INCIDENT_NOT_FOUND");
  }

  const classRow = await db.query.classes.findFirst({
    where: eq(classes.id, session.classId),
  });
  if (!classRow || !scope.schoolIds.includes(classRow.schoolId)) {
    throw new Error("CLASSROOM_INCIDENT_NOT_FOUND");
  }

  const lessonRow = await db.query.lessons.findFirst({
    where: eq(lessons.id, session.lessonId),
  });
  const publishedVersion = await db.query.publishedLessonVersions.findFirst({
    where: eq(publishedLessonVersions.id, session.publishedVersionId),
  });
  const incident = await readClassroomIncidentSnapshot({
    session,
    schoolId: classRow.schoolId,
  });
  const pluginLifecycle = incident.pluginId
    ? await readPluginGovernanceLifecycle({
        actorId: user.id,
        schoolId: classRow.schoolId,
        pluginId: incident.pluginId,
      })
    : null;
  const pluginActionDiagnostic = pluginLifecycle?.blockedActionDiagnostics.find(
    (diagnostic) => diagnostic.actionKey === incident.pluginActionKey,
  ) ?? null;
  const pluginHref = incident.pluginId
    ? `/settings/labs/plugins/${incident.pluginId}`
    : `/settings/labs/incidents/${session.id}`;
  const pluginActionHref = incident.pluginId && incident.pluginActionKey
    ? `/settings/labs/plugins/${incident.pluginId}/actions/${incident.pluginActionKey}`
    : pluginHref;
  const commandHref = incident.latestCommandId
    ? `/settings/labs/commands/${incident.latestCommandId}`
    : `/settings/labs/incidents/${session.id}`;
  const taskHref = incident.latestTaskId
    ? `/settings/labs/async-tasks/${incident.latestTaskId}`
    : `/settings/labs/incidents/${session.id}`;
  const runtimeHref = `/settings/labs/runtime-inspector?runtimeSessionId=${encodeURIComponent(incident.runtimeSessionId ?? session.id)}`;
  const { lightActions, guardedActions } = buildClassroomIncidentActionSets({
    runtimeSessionId: incident.runtimeSessionId,
    commandId: incident.latestCommandId,
    pluginBlocked: incident.pluginBlocked,
    taskId: incident.latestTaskId,
  });

  return ClassroomIncidentOperatorDTOSchema.parse({
    scopeRole: scope.scopeRole,
    hero: {
      classroomSessionId: session.id,
      classId: classRow.id,
      className: classRow.name,
      lessonId: lessonRow?.id ?? session.lessonId,
      lessonTitle: lessonRow?.title ?? "课堂",
      lessonVersionId: publishedVersion?.id ?? session.publishedVersionId,
      lessonVersionLabel: `v${publishedVersion?.version ?? "?"}`,
      runtimeSessionId: incident.runtimeSessionId,
      sessionStatus: session.status,
      updatedAt: toIso(session.updatedAt),
      detailHref: `/settings/labs/incidents/${session.id}`,
    },
    metrics: [
      {
        key: "session",
        label: "课堂状态",
        value: session.status,
        tone: incident.posture,
      },
      {
        key: "lessonVersion",
        label: "课时版本",
        value: `v${publishedVersion?.version ?? "?"}`,
        tone: "healthy",
      },
      {
        key: "runtime",
        label: "runtime session",
        value: incident.runtimeSessionId ?? "未找到",
        tone: incident.runtimeSessionId ? "degraded" : "failed",
      },
      {
        key: "impact",
        label: "影响范围",
        value: incident.impactScope,
        tone: incident.posture,
      },
    ],
    honesty: {
      trustedFacts:
        "仍可信什么：SQLite canonical truth、课堂 session 与已发布课时版本仍可作为当前排查锚点。",
        untrustedFacts:
          incident.posture === "healthy"
            ? "已不可信什么：当前没有额外的不可信边界。"
            : "已不可信什么：插件恢复结果、命令执行结果与任务补偿状态不能直接视为已经恢复健康。",
      impactScope: incident.impactScope,
      recommendedNextStep:
        incident.latestTaskId != null
          ? "推荐下一步：先查看问题任务，再回到课堂事件确认恢复结果。"
          : incident.latestCommandId != null
            ? "推荐下一步：先查看最新命令，再决定是否追加恢复尝试。"
            : "推荐下一步：查看 Runtime Inspector。",
      nextStepHref:
        incident.latestTaskId != null
          ? taskHref
          : incident.latestCommandId != null
            ? commandHref
            : runtimeHref,
    },
    problemCards: [
      {
        id: `incident:${session.id}`,
        title: `${classRow.name} 当前事件`,
        summary: incident.summary,
        posture: incident.posture,
        detailHref: `/settings/labs/incidents/${session.id}`,
      },
    ],
    relatedCards: [
      {
        kind: "runtime",
        id: incident.runtimeSessionId ?? session.id,
        label: "Runtime Inspector",
        summary: incident.runtimeSessionId
          ? `runtime session ${incident.runtimeSessionId}`
          : "当前只保留 classroom truth。",
        href: runtimeHref,
        nextStepHref: runtimeHref,
      },
      {
        kind: "plugin",
        id: incident.pluginId ?? `plugin:session:${session.id}`,
        label: pluginLifecycle?.name ?? "插件治理",
        summary: pluginLifecycle
          ? `${pluginLifecycle.lifecycleState} · ${pluginLifecycle.reasonCode ?? "posture_observed"}`
          : "当前没有识别到明确的 plugin posture。",
        href: pluginHref,
        nextStepHref: pluginHref,
      },
      {
        kind: "action",
        id: `action:${incident.pluginActionKey ?? "unknown"}`,
        label: incident.pluginActionKey ?? "动作治理",
        summary: pluginActionDiagnostic
          ? `${pluginActionDiagnostic.reasonCode} -> ${pluginActionDiagnostic.recommendedRecoveryAction}`
          : incident.pluginActionKey
            ? `查看 ${incident.pluginActionKey} 的 action-level relation。`
            : "当前没有识别到稳定 action relation。",
        href: pluginActionHref,
        nextStepHref: pluginActionHref,
      },
      {
        kind: "command",
        id: incident.latestCommandId ?? "command:unknown",
        label: "最新命令",
        summary: incident.latestCommandId
          ? `命令 ${incident.latestCommandId} 是当前最近的恢复链路。`
          : "当前没有找到最新命令。",
        href: commandHref,
        nextStepHref: commandHref,
      },
      {
        kind: "task",
        id: incident.latestTaskId ?? "task:unknown",
        label: "问题任务",
        summary: incident.latestTaskId
          ? `任务 ${incident.latestTaskId} 需要 operator 关注。`
          : "当前没有识别到问题任务。",
        href: taskHref,
        nextStepHref: taskHref,
      },
    ],
    lightActions,
    guardedActions,
  });
}
