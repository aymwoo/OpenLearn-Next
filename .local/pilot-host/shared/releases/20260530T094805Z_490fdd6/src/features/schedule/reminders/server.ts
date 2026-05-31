import "server-only";

import { and, eq, isNull, lte } from "drizzle-orm";

import { db } from "@/db";
import { scheduleReminderDispatch, scheduleReminderRule } from "@/db/schema";
import { enqueueAsyncTask } from "@/features/async-tasks/server/enqueue";
import { getAsyncTaskDetailDTO } from "@/lib/dal/async-tasks";
import { assertScheduleSchoolScope, assertScheduleTeacherScope } from "@/features/schedule/shared/auth";
import { appendScheduleAudit } from "@/features/schedule/shared/audit";
import {
  ScheduleReminderCenterDTOSchema,
  ScheduleReminderDeliveryTaskPayloadSchema,
  ScheduleReminderPayloadSchema,
  ScheduleReminderDeliveryTaskResultSchema,
  ScheduleReminderRuleInputSchema,
  type ScheduleReminderCenterDTO,
  type ScheduleReminderDeliveryTaskPayload,
  type ScheduleReminderRuleInput,
} from "@/features/schedule/shared/dto/reminders";
import { dispatchScheduleReminder, isSupportedScheduleReminderChannel } from "@/server/schedule/reminder-dispatch";

function toIso(value: Date | number | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toTeacherVisibleReminderStatus(status: string) {
  switch (status) {
    case "queued":
    case "running":
    case "retrying":
      return status;
    case "dispatching":
      return "queued" as const;
    default:
      return status;
  }
}

async function planScheduleReminderDispatch(
  executor: Pick<typeof db, "insert">,
  input: {
    actorId: string;
    schoolId: string;
    ruleId: string;
    type: "pre_class" | "schedule_change";
    channel: string;
    recipientScope: string;
    offsetMinutes: number;
  },
) {
  await executor.insert(scheduleReminderDispatch).values({
    schoolId: input.schoolId,
    actorId: input.actorId,
    ruleId: input.ruleId,
    type: input.type,
    channel: input.channel,
    targetType: input.type === "pre_class" ? "upcoming_class" : "schedule_change",
    targetId: `${input.type}:${input.schoolId}`,
    targetLabel: input.type === "pre_class" ? "下一节课" : "最近一次调课",
    status: "planned",
    scheduledFor: new Date(Date.now() + input.offsetMinutes * 60_000),
    payloadJson: { recipientScope: input.recipientScope },
  });
}

export async function getScheduleReminderCenterDTO(input?: { schoolId?: string }): Promise<ScheduleReminderCenterDTO> {
  const scope = await assertScheduleTeacherScope();
  const schoolId = input?.schoolId ?? scope.schoolIds[0] ?? null;
  if (!schoolId || !scope.schoolIds.includes(schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  const [rules, deliveries] = await Promise.all([
    db.query.scheduleReminderRule.findMany({ where: eq(scheduleReminderRule.schoolId, schoolId) }),
    db.query.scheduleReminderDispatch.findMany({ where: eq(scheduleReminderDispatch.schoolId, schoolId) }),
  ]);

  const taskStatusById = new Map<string, string>();
  for (const delivery of deliveries) {
    if (!delivery.deliveryTaskId) {
      continue;
    }

    try {
      const task = await getAsyncTaskDetailDTO({ taskId: delivery.deliveryTaskId });
      taskStatusById.set(delivery.deliveryTaskId, task.status);
    } catch {
      // Ignore stale task refs and fall back to business status.
    }
  }

  const latestStatusByType = new Map<string, (typeof deliveries)[number]>();
  for (const delivery of [...deliveries].sort((left, right) => Number(right.updatedAt ?? 0) - Number(left.updatedAt ?? 0))) {
    if (!latestStatusByType.has(delivery.type)) {
      latestStatusByType.set(delivery.type, delivery);
    }
  }

  return ScheduleReminderCenterDTOSchema.parse({
    schoolId,
    rules: rules.map((rule) => ({
      id: rule.id,
      schoolId: rule.schoolId,
      type: rule.type,
      channel: rule.channel,
      recipientScope: rule.recipientScope,
      offsetMinutes: rule.offsetMinutes,
      enabled: Boolean(rule.enabled),
       latestStatus: latestStatusByType.get(rule.type)
         ? toTeacherVisibleReminderStatus(
             taskStatusById.get(latestStatusByType.get(rule.type)!.deliveryTaskId ?? "") ?? latestStatusByType.get(rule.type)!.status,
           )
         : null,
     })),
    deliveries: [...deliveries]
      .sort((left, right) => Number(right.scheduledFor ?? 0) - Number(left.scheduledFor ?? 0))
      .slice(0, 12)
      .map((delivery) => ({
        id: delivery.id,
        ruleId: delivery.ruleId ?? null,
        type: delivery.type,
        channel: delivery.channel,
        status: toTeacherVisibleReminderStatus(taskStatusById.get(delivery.deliveryTaskId ?? "") ?? delivery.status),
        targetLabel: delivery.targetLabel,
        scheduledFor: toIso(delivery.scheduledFor) ?? new Date(0).toISOString(),
        deliveryTaskId: delivery.deliveryTaskId ?? null,
        dispatchClaimedAt: toIso(delivery.dispatchClaimedAt),
        lastAttemptAt: toIso(delivery.lastAttemptAt),
        failureReason: delivery.failureReason ?? null,
      })),
  });
}

export async function saveScheduleReminderRule(input: ScheduleReminderRuleInput) {
  const parsed = ScheduleReminderRuleInputSchema.parse(input);
  const scope = await assertScheduleSchoolScope(parsed.schoolId);

  if (!isSupportedScheduleReminderChannel(parsed.channel)) {
    throw new Error("SCHEDULE_REMINDER_BLOCKED");
  }

  const existing = await db.query.scheduleReminderRule.findFirst({
    where: and(eq(scheduleReminderRule.schoolId, parsed.schoolId), eq(scheduleReminderRule.type, parsed.type)),
  });

  await db.transaction(async (tx) => {
    const [row] = existing
      ? await tx
          .update(scheduleReminderRule)
          .set({
            channel: parsed.channel,
            recipientScope: parsed.recipientScope,
            offsetMinutes: parsed.offsetMinutes,
            enabled: parsed.enabled,
            updatedById: scope.userId,
            updatedAt: new Date(),
          })
          .where(eq(scheduleReminderRule.id, existing.id))
          .returning()
      : await tx
          .insert(scheduleReminderRule)
          .values({
            schoolId: parsed.schoolId,
            type: parsed.type,
            channel: parsed.channel,
            recipientScope: parsed.recipientScope,
            offsetMinutes: parsed.offsetMinutes,
            enabled: parsed.enabled,
            createdById: scope.userId,
            updatedById: scope.userId,
          })
          .returning();

    await planScheduleReminderDispatch(tx, {
      actorId: scope.userId,
      schoolId: parsed.schoolId,
      ruleId: row.id,
      type: row.type,
      channel: row.channel,
      recipientScope: row.recipientScope,
      offsetMinutes: row.offsetMinutes,
    });

    await appendScheduleAudit(tx, {
      schoolId: parsed.schoolId,
      entityType: "scheduleReminder",
      entityId: row.id,
      actionType: existing ? "update_rule" : "create_rule",
      actorId: scope.userId,
      payloadJson: parsed,
    });
  });

  return getScheduleReminderCenterDTO({ schoolId: parsed.schoolId });
}

function buildReminderDeliveryResult(input: {
  dispatchId: string;
  schoolId: string;
  ruleId: string | null;
  channel: string;
  deliveryStatus: "sent" | "retry_required";
  failureReason: string | null;
}) {
  const outcome = input.deliveryStatus === "sent" ? "completed" : "failed";

  return ScheduleReminderDeliveryTaskResultSchema.parse({
    dispatchId: input.dispatchId,
    schoolId: input.schoolId,
    ruleId: input.ruleId,
    channel: input.channel,
    deliveryStatus: input.deliveryStatus,
    failureReason: input.failureReason,
    outcome,
    titleKey:
      input.deliveryStatus === "sent"
        ? "asyncTasks.schedule.reminderDelivery.result.sent"
        : "asyncTasks.schedule.reminderDelivery.result.failed",
    summaryKey:
      input.deliveryStatus === "sent"
        ? "asyncTasks.schedule.reminderDelivery.result.sentSummary"
        : "asyncTasks.schedule.reminderDelivery.result.failedSummary",
    counts: {
      total: 1,
      succeeded: input.deliveryStatus === "sent" ? 1 : 0,
      partiallySucceeded: 0,
      failed: input.deliveryStatus === "sent" ? 0 : 1,
      skipped: 0,
    },
    detail: {
      dispatchId: input.dispatchId,
      schoolId: input.schoolId,
      ruleId: input.ruleId,
      channel: input.channel,
      deliveryStatus: input.deliveryStatus,
      failureReason: input.failureReason,
    },
  });
}

export async function completeScheduleReminderDeliveryAttempt(
  rawPayload: unknown,
  delivery: { status: "sent" | "failed"; failureReason: string | null },
) {
  const payload = ScheduleReminderDeliveryTaskPayloadSchema.parse(rawPayload);
  const attemptedAt = new Date();
  const projectedStatus = delivery.status === "sent" ? "sent" : "retry_required";

  await db
    .update(scheduleReminderDispatch)
    .set({
      status: projectedStatus,
      lastAttemptAt: attemptedAt,
      sentAt: delivery.status === "sent" ? attemptedAt : null,
      failureReason: delivery.failureReason ?? null,
      updatedAt: attemptedAt,
    })
    .where(eq(scheduleReminderDispatch.id, payload.dispatchId));

  return buildReminderDeliveryResult({
    dispatchId: payload.dispatchId,
    schoolId: payload.schoolId,
    ruleId: payload.ruleId,
    channel: payload.channel,
    deliveryStatus: projectedStatus,
    failureReason: delivery.failureReason ?? null,
  });
}

async function claimScheduleReminderDispatch(input: {
  dispatchId: string;
  now: Date;
}) {
  const [claimed] = await db
    .update(scheduleReminderDispatch)
    .set({
      status: "dispatching",
      dispatchClaimedAt: input.now,
      dispatchClaimedBy: "due-sweep",
      failureReason: null,
      updatedAt: input.now,
    })
    .where(
      and(
        eq(scheduleReminderDispatch.id, input.dispatchId),
        eq(scheduleReminderDispatch.status, "planned"),
        isNull(scheduleReminderDispatch.deliveryTaskId),
        lte(scheduleReminderDispatch.scheduledFor, input.now),
      ),
    )
    .returning();

  return claimed ?? null;
}

export async function enqueueDueScheduleReminderDispatches(input?: { now?: Date }) {
  const now = input?.now ?? new Date();
  const dueDispatches = await db.query.scheduleReminderDispatch.findMany({
    where: and(
      eq(scheduleReminderDispatch.status, "planned"),
      isNull(scheduleReminderDispatch.deliveryTaskId),
      lte(scheduleReminderDispatch.scheduledFor, now),
    ),
  });

  const enqueued: Array<{ dispatchId: string; taskId: string; taskStatus: string }> = [];

  for (const dispatch of dueDispatches) {
    const claimed = await claimScheduleReminderDispatch({ dispatchId: dispatch.id, now });

    if (!claimed) {
      continue;
    }

    if (!claimed.actorId) {
      await db
        .update(scheduleReminderDispatch)
        .set({
          status: "retry_required",
          failureReason: "REMINDER_DISPATCH_MISSING_ACTOR",
          updatedAt: new Date(),
        })
        .where(eq(scheduleReminderDispatch.id, claimed.id));
      continue;
    }

    const task = await enqueueAsyncTask({
      actorId: claimed.actorId,
      schoolId: claimed.schoolId,
      taskType: "schedule.reminder_delivery",
      entityRef: {
        entityType: "schedule_reminder_dispatch",
        entityId: claimed.id,
        entityLabel: claimed.targetLabel,
      },
      payload: {
        dispatchId: claimed.id,
        schoolId: claimed.schoolId,
        ruleId: claimed.ruleId ?? null,
        actorId: claimed.actorId,
        channel: claimed.channel,
        scheduledFor: toIso(claimed.scheduledFor) ?? now.toISOString(),
        payload: ScheduleReminderPayloadSchema.parse(claimed.payloadJson),
      } satisfies ScheduleReminderDeliveryTaskPayload,
      dispatchRequested: true,
    });

    await db
      .update(scheduleReminderDispatch)
      .set({
        deliveryTaskId: task.id,
        status: task.status === "dispatch_failed" ? "retry_required" : "dispatching",
        failureReason: task.failure?.reason ?? null,
        updatedAt: new Date(),
      })
      .where(eq(scheduleReminderDispatch.id, claimed.id));

    enqueued.push({
      dispatchId: claimed.id,
      taskId: task.id,
      taskStatus: task.status,
    });
  }

  return enqueued;
}

export async function retryScheduleReminderDispatch(input: { dispatchId: string }) {
  void input;
  throw new Error("SCHEDULE_REMINDER_OPERATOR_RECOVERY_ONLY");
}
