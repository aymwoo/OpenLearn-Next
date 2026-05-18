import "server-only";

import { desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  classroomSessions,
  governanceAudits,
  pluginActionAudits,
  runtimeLifecycleTransitions,
  runtimeStepSessions,
  transportConsumerTraces,
  transportDeliveryAttempts,
} from "@/db/schema";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";
import { getUserMembershipsDTO } from "@/lib/dal/membership";
import { classroomRedisFanoutManager } from "@/features/runtime-platform/seams/transport/redis-fanout-manager";
import {
  RuntimeInspectorDTOSchema,
  RuntimeInspectorInputSchema,
  RuntimeInspectorSessionOptionDTOSchema,
  type RuntimeInspectorDTO,
  type RuntimeInspectorInput,
  type RuntimeInspectorScopeRole,
  type RuntimeInspectorTimelineItemDTO,
} from "@/lib/dto/runtime-inspector";

function toIso(value: Date | number | null | undefined) {
  if (!value) {
    return new Date(0).toISOString();
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

async function resolveInspectorScope() {
  const user = await getCurrentUserDTO();
  if (!user) {
    throw new Error("AUTH_REQUIRED");
  }

  const memberships = await getUserMembershipsDTO(user.id);
  const activeMemberships = memberships.filter((membership) => membership.status === "active");
  const activeSchoolIds = [...new Set(activeMemberships.map((membership) => membership.schoolId))];

  if (activeMemberships.some((membership) => membership.role === "developer")) {
    return {
      role: "developer" as const,
      actorId: user.id,
      schoolIds: activeSchoolIds,
    };
  }

  if (activeMemberships.some((membership) => membership.role === "admin")) {
    return {
      role: "admin" as const,
      actorId: user.id,
      schoolIds: activeSchoolIds,
    };
  }

  const teacherScope = await assertActiveTeacher();
  return {
    role: "teacher" as const,
    actorId: teacherScope.userId,
    schoolIds: teacherScope.schoolIds,
  };
}

function canInspectRuntimeSession(
  role: RuntimeInspectorScopeRole,
  actorId: string,
  schoolIds: string[],
  session: typeof runtimeStepSessions.$inferSelect,
) {
  if (role === "developer") {
    return true;
  }

  if (!schoolIds.includes(session.schoolId)) {
    return false;
  }

  if (role === "admin") {
    return true;
  }

  return session.actorId === actorId || session.actorScope === "teacher";
}

function toTimelineItem(input: RuntimeInspectorTimelineItemDTO) {
  return input;
}

function readTransportDetail(value: unknown) {
  if (!value || typeof value !== "object") {
    return {} as Record<string, unknown>;
  }

  return value as Record<string, unknown>;
}

export async function getRuntimeInspectorDTO(rawInput: RuntimeInspectorInput = {}): Promise<RuntimeInspectorDTO> {
  const input = RuntimeInspectorInputSchema.parse(rawInput);
  const scope = await resolveInspectorScope();
  const runtimeSessions = await db.query.runtimeStepSessions.findMany({
    orderBy: [desc(runtimeStepSessions.createdAt)],
  });

  const scopedSessions = runtimeSessions.filter((session) =>
    canInspectRuntimeSession(scope.role, scope.actorId, scope.schoolIds, session),
  );

  const sessionOptions = scopedSessions.map((session) =>
    RuntimeInspectorSessionOptionDTOSchema.parse({
      runtimeSessionId: session.id,
      classroomSessionId: session.classroomSessionId,
      runtimeId: session.runtimeId,
      runtimeVersion: session.runtimeVersion,
      actorScope: session.actorScope,
      schoolId: session.schoolId,
      createdAt: toIso(session.createdAt),
    }),
  );

  const selectedSession =
    scopedSessions.find((session) => session.id === input.runtimeSessionId) ?? scopedSessions[0] ?? null;

  if (!selectedSession) {
    return RuntimeInspectorDTOSchema.parse({
      scopeRole: scope.role,
      selectedRuntimeSessionId: null,
      selectedSession: null,
      sessionOptions: [],
      health: null,
      timeline: [],
      emptyState: "当前角色范围内暂无可查看的 runtime session。",
    });
  }

  const runtimeSessionIds = [selectedSession.id];
  const classroomSessionIds = selectedSession.classroomSessionId ? [selectedSession.classroomSessionId] : [];

  const [lifecycleRows, governanceRows, transportRows, consumerRows, classroomRows, pluginAuditRows] =
    await Promise.all([
      db.query.runtimeLifecycleTransitions.findMany({
        where: inArray(runtimeLifecycleTransitions.runtimeSessionId, runtimeSessionIds),
      }),
      db.query.governanceAudits.findMany({
        where: inArray(governanceAudits.runtimeSessionId, runtimeSessionIds),
      }),
      db.query.transportDeliveryAttempts.findMany({
        where: inArray(transportDeliveryAttempts.runtimeSessionId, runtimeSessionIds),
      }),
      db.query.transportConsumerTraces.findMany({
        where: inArray(transportConsumerTraces.runtimeSessionId, runtimeSessionIds),
      }),
      classroomSessionIds.length > 0
        ? db.query.classroomSessions.findMany({
            where: inArray(classroomSessions.id, classroomSessionIds),
          })
        : Promise.resolve([]),
      db.query.pluginActionAudits.findMany({
        where: inArray(pluginActionAudits.correlationId, [selectedSession.id]),
      }),
    ]);

  const timeline: RuntimeInspectorTimelineItemDTO[] = [];
  const fanoutHealth = classroomRedisFanoutManager.getSnapshot();

  for (const row of lifecycleRows) {
    timeline.push(
      toTimelineItem({
        id: `lifecycle-${row.id}`,
        occurredAt: toIso(row.createdAt),
        lane: "runtime",
        title: `Runtime lifecycle -> ${row.toState}`,
        detail: row.reason ?? "runtime lifecycle updated",
        runtimeSessionId: row.runtimeSessionId,
        classroomSessionId: null,
        correlationId: null,
        status: row.toState,
        decision: null,
      }),
    );
  }

  for (const row of classroomRows) {
    timeline.push(
      toTimelineItem({
        id: `classroom-${row.id}`,
        occurredAt: toIso(row.updatedAt),
        lane: "classroom",
        title: `Classroom session ${row.status === "ended" ? "ended" : "live"}`,
        detail: `version ${row.version} · ${row.locked ? "locked" : "unlocked"}`,
        runtimeSessionId: selectedSession.id,
        classroomSessionId: row.id,
        correlationId: null,
        status: row.status,
        decision: null,
      }),
    );
  }

  for (const row of governanceRows) {
    timeline.push(
      toTimelineItem({
        id: `governance-${row.id}`,
        occurredAt: toIso(row.createdAt),
        lane: "governance",
        title: `Governance ${row.action}`,
        detail: row.reasonCode ?? row.decision,
        runtimeSessionId: row.runtimeSessionId,
        classroomSessionId: row.classroomSessionId,
        correlationId: row.correlationId,
        decision: row.decision,
        status: row.lifecycleState ?? null,
      }),
    );
  }

  for (const row of transportRows) {
    const detail = readTransportDetail(row.payloadSummaryJson);
    const transportTopology =
      typeof detail.degradedReason === "string"
        ? "degraded_local_fallback"
        : typeof detail.fanoutMode === "string"
          ? detail.fanoutMode
          : null;
    timeline.push(
      toTimelineItem({
        id: `transport-${row.id}`,
        occurredAt: toIso(row.attemptedAt ?? row.createdAt),
        lane: "transport",
        title: `${row.channel} / ${row.kind}`,
        detail: row.failureReason ?? row.attemptStatus,
        runtimeSessionId: row.runtimeSessionId,
        classroomSessionId: row.classroomSessionId,
        correlationId: row.correlationId,
        transportTopology,
        receivedVia: null,
        status: row.attemptStatus,
        decision: null,
      }),
    );
  }

  for (const row of consumerRows) {
    const detail = readTransportDetail(row.detailJson);
    timeline.push(
      toTimelineItem({
        id: `consumer-${row.id}`,
        occurredAt: toIso(row.emittedAt ?? row.failedAt ?? row.closedAt ?? row.createdAt),
        lane: "consumer",
        title: `Consumer trace ${row.traceType}`,
        detail: row.status,
        runtimeSessionId: row.runtimeSessionId,
        classroomSessionId: row.classroomSessionId,
        correlationId: row.correlationId,
        transportTopology:
          typeof detail.degradedReason === "string"
            ? "degraded_local_fallback"
            : typeof detail.fanoutMode === "string"
              ? String(detail.fanoutMode)
              : null,
        receivedVia:
          typeof detail.receivedVia === "string" ? detail.receivedVia : null,
        status: row.status,
        decision: null,
      }),
    );
  }

  for (const row of pluginAuditRows) {
    timeline.push(
      toTimelineItem({
        id: `plugin-audit-${row.id}`,
        occurredAt: toIso(row.createdAt),
        lane: "plugin",
        title: `Plugin action ${row.action}`,
        detail: row.reasonCode ?? row.decision,
        runtimeSessionId: null,
        classroomSessionId: null,
        correlationId: row.correlationId ?? null,
        status: row.lifecycleState ?? null,
        decision: row.decision,
      }),
    );
  }

  timeline.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));

  const latestLifecycle = lifecycleRows.sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0))[0] ?? null;
  const latestGovernance = governanceRows.sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0))[0] ?? null;
  const latestTransport = transportRows.sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0))[0] ?? null;
  const latestConsumer = consumerRows.sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0))[0] ?? null;
  const latestTransportDetail = readTransportDetail(latestTransport?.payloadSummaryJson);
  const latestConsumerDetail = readTransportDetail(latestConsumer?.detailJson);

  return RuntimeInspectorDTOSchema.parse({
    scopeRole: scope.role,
    selectedRuntimeSessionId: selectedSession.id,
    selectedSession: sessionOptions.find((session) => session.runtimeSessionId === selectedSession.id) ?? null,
    sessionOptions,
    health: {
      lifecycleState: latestLifecycle?.toState ?? "unknown",
      governanceDecision: latestGovernance?.decision ?? "unknown",
      transportAttemptStatus: latestTransport?.attemptStatus ?? "unknown",
      consumerTraceStatus: latestConsumer?.status ?? "unknown",
      transportTopology:
        typeof latestTransportDetail.degradedReason === "string"
          ? "degraded_local_fallback"
          : typeof latestTransportDetail.fanoutMode === "string"
            ? latestTransportDetail.fanoutMode
            : fanoutHealth.degraded
              ? "degraded_local_fallback"
              : "unknown",
      degraded:
        typeof latestTransportDetail.degradedReason === "string" ||
        typeof latestConsumerDetail.degradedReason === "string" ||
        fanoutHealth.degraded,
      degradedReason:
        typeof latestTransportDetail.degradedReason === "string"
          ? latestTransportDetail.degradedReason
          : typeof latestConsumerDetail.degradedReason === "string"
            ? latestConsumerDetail.degradedReason
            : fanoutHealth.degradedReason,
      lastHealthyAt: fanoutHealth.lastHealthyAt,
      allowedCount: governanceRows.filter((row) => row.decision === "allowed").length,
      deniedCount: governanceRows.filter((row) => row.decision === "denied").length,
      deliveredCount: transportRows.filter((row) => row.attemptStatus === "delivered").length,
      failedCount: transportRows.filter((row) => row.attemptStatus === "failed").length,
    },
    timeline,
    emptyState: null,
  });
}
