import type {
  platformCommands,
  platformEventDispatches,
  platformEvents,
} from "@/db/schema";
import type {
  PlatformFailureAttribution,
} from "@/features/platform-core/events/contracts";
import type { PlatformCommandStatus } from "@/features/platform-core/commands/contracts";
import {
  PlatformAuditMetadataSchema,
  type PlatformAuditMetadata,
} from "@/features/platform-core/ai-contracts/delegation";

type PlatformCommandRow = typeof platformCommands.$inferSelect;
type PlatformEventRow = typeof platformEvents.$inferSelect;
type PlatformEventDispatchRow = typeof platformEventDispatches.$inferSelect;

export type PlatformCommandOperatorInvalidationIntentDTO = {
  tags: string[];
  label: string;
};

export type PlatformCommandOperatorSummaryDTO = {
  commandId: string;
  commandType: string;
  status: PlatformCommandStatus;
  statusLabel: string;
  latestAttemptNumber: number;
  schoolId: string;
  pluginId: string | null;
  actorId: string;
  actorScope: string;
  correlationId: string | null;
  causationId: string | null;
  producer: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  resultSummary: Record<string, unknown> | null;
  resultSummaryLabel: string;
  auditSummary: PlatformAuditMetadata | null;
  auditSummaryLabel: string | null;
  failureAttribution: PlatformFailureAttribution | null;
  failureSummaryLabel: string | null;
  invalidationIntent: PlatformCommandOperatorInvalidationIntentDTO;
};

export type PlatformCommandOperatorTimelineDispatchDTO = {
  dispatchId: string;
  channel: string;
  status: string;
  adapterId: string | null;
  failureReason: string | null;
};

export type PlatformCommandOperatorTimelineEventDTO = {
  id: string;
  commandId: string;
  attemptNumber: number;
  eventOrdinal: number;
  eventType: string;
  category: "outcome" | "domain";
  aggregateType: string;
  aggregateId: string;
  occurredAt: string;
  payloadSummary: Record<string, unknown>;
  payloadSummaryLabel: string;
  auditSummary: PlatformAuditMetadata | null;
  auditSummaryLabel: string | null;
  dispatches: PlatformCommandOperatorTimelineDispatchDTO[];
};

export type PlatformCommandOperatorDetailDTO = {
  command: PlatformCommandOperatorSummaryDTO | null;
  timeline: PlatformCommandOperatorTimelineEventDTO[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function toIso(value: Date | number | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function formatPrimitive(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return value.map((entry) => formatPrimitive(entry)).join(", ");
  }

  if (value && typeof value === "object") {
      return Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .slice(0, 3)
        .map(([key, entry]) => `${key}=${formatPrimitive(entry)}`)
        .join(" / ");
  }

  return "unknown";
}

function formatSummaryRecord(
  summary: Record<string, unknown> | null,
  emptyLabel: string,
): string {
  if (!summary) {
    return emptyLabel;
  }

  const entries = Object.entries(summary).sort(([left], [right]) => left.localeCompare(right));
  if (entries.length === 0) {
    return emptyLabel;
  }

  return entries
    .slice(0, 3)
    .map(([key, value]) => `${key}=${formatPrimitive(value)}`)
    .join(" / ");
}

function formatFailureSummary(
  failureAttribution: PlatformFailureAttribution | null,
): string | null {
  if (!failureAttribution) {
    return null;
  }

  return `${failureAttribution.scope}:${failureAttribution.reasonCode} -> ${failureAttribution.recommendedRecoveryAction}`;
}

function asAuditSummary(value: unknown): PlatformAuditMetadata | null {
  const parsed = PlatformAuditMetadataSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  if (!parsed.data.delegatedActor && !parsed.data.approval) {
    return null;
  }

  return parsed.data;
}

function formatAuditSummary(auditSummary: PlatformAuditMetadata | null): string | null {
  if (!auditSummary) {
    return null;
  }

  const segments: string[] = [];

  if (auditSummary.delegatedActor) {
    segments.push(
      `委派 ${auditSummary.delegatedActor.delegatedAgentId} (${auditSummary.delegatedActor.delegatedAgentScope}) / ${auditSummary.delegatedActor.authorityPosture}`,
    );
  }

  if (auditSummary.approval) {
    segments.push(`审批 ${auditSummary.approval.status} / ${auditSummary.approval.summary}`);
  }

  return segments.length > 0 ? segments.join(" / ") : null;
}

function formatInvalidationIntent(tags: string[]): PlatformCommandOperatorInvalidationIntentDTO {
  if (tags.length === 0) {
    return {
      tags: [],
      label: "无 invalidation intent",
    };
  }

  return {
    tags,
    label: tags.slice(0, 3).join(" / "),
  };
}

function getStatusLabel(status: PlatformCommandStatus) {
  switch (status) {
    case "pending":
      return "待执行";
    case "running":
      return "执行中";
    case "succeeded":
      return "已成功";
    case "failed":
      return "已失败";
    default:
      return status;
  }
}

export function toPlatformCommandOperatorSummaryDTO(
  row: PlatformCommandRow,
): PlatformCommandOperatorSummaryDTO {
  const scope = asRecord(row.scopeJson);
  const correlation = asRecord(row.correlationJson);
  const resultSummary = asRecord(row.resultSummaryJson);
  const auditSummary = asAuditSummary(row.auditSummaryJson);
  const failureAttribution = asRecord(row.failureAttributionJson) as PlatformFailureAttribution | null;
  const invalidationTags = asStringArray(row.invalidationTagsJson);

  return {
    commandId: row.id,
    commandType: row.commandType,
    status: row.status as PlatformCommandStatus,
    statusLabel: getStatusLabel(row.status as PlatformCommandStatus),
    latestAttemptNumber: row.latestAttemptNumber,
    schoolId: row.schoolId,
    pluginId: typeof scope?.pluginId === "string" ? scope.pluginId : null,
    actorId: row.actorId,
    actorScope: row.actorScope,
    correlationId:
      typeof correlation?.correlationId === "string" ? correlation.correlationId : null,
    causationId:
      typeof correlation?.causationId === "string" ? correlation.causationId : null,
    producer: typeof correlation?.producer === "string" ? correlation.producer : null,
    createdAt: toIso(row.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIso(row.updatedAt) ?? new Date(0).toISOString(),
    completedAt: toIso(row.completedAt),
    resultSummary,
    resultSummaryLabel: formatSummaryRecord(resultSummary, "暂无结果摘要"),
    auditSummary,
    auditSummaryLabel: formatAuditSummary(auditSummary),
    failureAttribution,
    failureSummaryLabel: formatFailureSummary(failureAttribution),
    invalidationIntent: formatInvalidationIntent(invalidationTags),
  };
}

export function toPlatformCommandOperatorTimelineEventDTO(input: {
  event: PlatformEventRow;
  dispatches: PlatformEventDispatchRow[];
}): PlatformCommandOperatorTimelineEventDTO {
  const payloadSummary = asRecord(input.event.payloadSummaryJson) ?? {};
  const auditSummary = asAuditSummary(input.event.auditSummaryJson);

  return {
    id: input.event.id,
    commandId: input.event.commandId,
    attemptNumber: input.event.attemptNumber,
    eventOrdinal: input.event.eventOrdinal,
    eventType: input.event.eventType,
    category: input.event.category,
    aggregateType: input.event.aggregateType,
    aggregateId: input.event.aggregateId,
    occurredAt: toIso(input.event.createdAt) ?? new Date(0).toISOString(),
    payloadSummary,
    payloadSummaryLabel: formatSummaryRecord(payloadSummary, "无补充 payload 摘要"),
    auditSummary,
    auditSummaryLabel: formatAuditSummary(auditSummary),
    dispatches: input.dispatches
      .slice()
      .sort((left, right) => left.dispatchChannel.localeCompare(right.dispatchChannel))
      .map((dispatch) => ({
        dispatchId: dispatch.id,
        channel: dispatch.dispatchChannel,
        status: dispatch.dispatchStatus,
        adapterId: dispatch.adapterId ?? null,
        failureReason: dispatch.failureReason ?? null,
      })),
  };
}
