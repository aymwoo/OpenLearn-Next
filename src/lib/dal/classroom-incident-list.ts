import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  classes,
  classroomSessions,
  governanceAudits,
  lessons,
  pluginActionAudits,
  publishedLessonVersions,
  runtimeStepSessions,
} from "@/db/schema";
import { listOperatorVisibleAsyncTasks } from "@/features/async-tasks/server/operator-read-model";
import { listOperatorVisiblePlatformCommands } from "@/features/platform-core/observability/operator-read-model";
import {
  ClassroomIncidentListDTOSchema,
  type ClassroomIncidentImpactScope,
  type ClassroomIncidentListDTO,
  type ClassroomIncidentPosture,
  type ClassroomIncidentRelationChipDTO,
} from "@/lib/dto/classroom-incident-list";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { getUserMembershipsDTO } from "@/lib/dal/membership";

type OperatorScope = {
  scopeRole: "admin" | "developer";
  schoolIds: string[];
};

type SessionRow = Awaited<ReturnType<typeof db.query.classroomSessions.findMany>>[number];

function toIso(value: Date | number | null | undefined) {
  if (!value) {
    return new Date(0).toISOString();
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function readFailureAttribution(value: unknown) {
  const record = readRecord(value);

  return {
    scope: typeof record.scope === "string" ? record.scope : null,
    pluginId: typeof record.pluginId === "string" ? record.pluginId : null,
    reasonCode: typeof record.reasonCode === "string" ? record.reasonCode : null,
  };
}

async function resolveOperatorScope(): Promise<OperatorScope> {
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
    return { scopeRole: "developer", schoolIds };
  }

  if (activeMemberships.some((membership) => membership.role === "admin")) {
    return { scopeRole: "admin", schoolIds };
  }

  throw new Error("CLASSROOM_INCIDENT_FORBIDDEN");
}

export type ClassroomIncidentSnapshot = {
  posture: ClassroomIncidentPosture;
  impactScope: ClassroomIncidentImpactScope;
  summary: string;
  relationChips: ClassroomIncidentRelationChipDTO[];
  latestCommandId: string | null;
  latestTaskId: string | null;
  runtimeSessionId: string | null;
  pluginBlocked: boolean;
  pluginId: string | null;
  pluginActionKey: string | null;
};

export async function readClassroomIncidentSnapshot(input: {
  session: SessionRow;
  schoolId: string;
}): Promise<ClassroomIncidentSnapshot> {
  const visibleTasks = await listOperatorVisibleAsyncTasks({
    schoolIds: [input.schoolId],
    limit: 50,
  });
  const [runtimeRows, governanceRows, pluginAuditRows, commandRows] =
    await Promise.all([
      db.query.runtimeStepSessions.findMany({
        where: eq(runtimeStepSessions.classroomSessionId, input.session.id),
        orderBy: [desc(runtimeStepSessions.createdAt)],
      }),
      db.query.governanceAudits.findMany({
        where: eq(governanceAudits.classroomSessionId, input.session.id),
      }),
      db.query.pluginActionAudits.findMany({
        where: eq(pluginActionAudits.schoolId, input.schoolId),
      }),
      listOperatorVisiblePlatformCommands({
        schoolIds: [input.schoolId],
        limit: 50,
      }),
    ]);

  const runtimeRow =
    runtimeRows
      .filter(
        (row) =>
          row.classroomSessionId === input.session.id && row.schoolId === input.schoolId,
      )
      .sort((left, right) => Date.parse(toIso(right.createdAt)) - Date.parse(toIso(left.createdAt)))[0] ?? null;

  const latestGovernance =
    governanceRows
      .filter(
        (row) =>
          row.classroomSessionId === input.session.id && row.schoolId === input.schoolId,
      )
      .sort((left, right) => Date.parse(toIso(right.createdAt)) - Date.parse(toIso(left.createdAt)))[0] ?? null;

  const runtimeSessionId = runtimeRow?.id ?? null;
  const problemTask =
    visibleTasks.find(
      (task) =>
        task.entityId === input.session.id
        || (runtimeSessionId != null && task.entityId === runtimeSessionId),
    ) ?? null;

  const latestCommand =
    commandRows
      .filter((row) => row.schoolId === input.schoolId)
      .find((row) => row.commandId === latestGovernance?.commandId) ??
    commandRows
      .filter((row) => row.schoolId === input.schoolId)
      .find((row) => {
        const failureAttribution = readFailureAttribution(row.failureAttribution);
        return failureAttribution.pluginId != null && failureAttribution.pluginId === latestGovernance?.pluginId;
      }) ??
    null;

  const pluginAudit =
    pluginAuditRows
      .filter((row) => row.schoolId === input.schoolId)
      .find((row) => row.commandId === latestCommand?.commandId) ?? null;

  const pluginSummary = pluginAudit
    ? `${pluginAudit.action} · ${pluginAudit.reasonCode ?? pluginAudit.decision}`
    : "插件姿态待观察";
  const commandSummary = latestCommand
    ? `${latestCommand.commandType} · ${latestCommand.status}`
    : null;

  const relationChips: ClassroomIncidentRelationChipDTO[] = [
    pluginAudit
      ? {
          kind: "plugin",
          label: pluginSummary,
          href: `/settings/labs/plugins/${pluginAudit.pluginId}`,
        }
      : null,
    latestCommand
      ? {
          kind: "command",
          label: commandSummary ?? latestCommand.commandType,
          href: `/settings/labs/commands/${latestCommand.commandId}`,
        }
      : null,
    problemTask
      ? {
          kind: "task",
          label: `${problemTask.id}`,
          href: `/settings/labs/async-tasks/${problemTask.id}`,
        }
      : null,
  ].filter((value): value is ClassroomIncidentRelationChipDTO => Boolean(value)).slice(0, 2);

  const posture: ClassroomIncidentPosture =
    latestCommand?.status === "failed" || latestGovernance?.decision === "denied"
      ? "failed"
      : pluginAudit?.decision === "denied"
        ? "blocked"
        : runtimeRow
          ? "degraded"
          : "healthy";
  const impactScope: ClassroomIncidentImpactScope =
    posture === "healthy"
      ? "current_classroom"
      : posture === "degraded"
        ? "multi_classroom"
        : "platform";

  return {
    posture,
    impactScope,
    summary:
      posture === "healthy"
        ? "当前课堂没有需要 operator 立即介入的事件。"
        : `${pluginSummary}${commandSummary ? `；${commandSummary}` : ""}`,
    relationChips,
    latestCommandId: latestCommand?.commandId ?? null,
    latestTaskId: problemTask?.id ?? null,
    runtimeSessionId,
    pluginBlocked: pluginAudit?.decision === "denied" || latestGovernance?.decision === "denied",
    pluginId:
      pluginAudit?.pluginId
      ?? latestGovernance?.pluginId
      ?? readFailureAttribution(latestCommand?.failureAttribution).pluginId,
    pluginActionKey: pluginAudit?.action ?? null,
  };
}

export async function getClassroomIncidentListDTO(): Promise<ClassroomIncidentListDTO> {
  const scope = await resolveOperatorScope();
  const sessions = await db.query.classroomSessions.findMany({
    orderBy: [desc(classroomSessions.updatedAt)],
  });

  const rows: ClassroomIncidentListDTO["rows"] = [];

  for (const session of sessions) {
    const classRow = await db.query.classes.findFirst({
      where: eq(classes.id, session.classId),
    });
    if (!classRow || !scope.schoolIds.includes(classRow.schoolId)) {
      continue;
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

    rows.push({
      classroomSessionId: session.id,
      classId: classRow.id,
      className: classRow.name,
      lessonId: lessonRow?.id ?? session.lessonId,
      lessonTitle: lessonRow?.title ?? "课堂",
      lessonVersionLabel: `v${publishedVersion?.version ?? "?"}`,
      posture: incident.posture,
      summary: incident.summary,
      impactScope: incident.impactScope,
      updatedAt: toIso(session.updatedAt),
      detailHref: `/settings/labs/incidents/${session.id}`,
      relationChips: incident.relationChips,
    });
  }

  return ClassroomIncidentListDTOSchema.parse({
    scopeRole: scope.scopeRole,
    rows,
    emptyState: rows.length === 0 ? "当前没有需要 operator 介入的课堂事件。" : null,
  });
}
