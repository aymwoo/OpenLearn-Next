import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { scheduleReminderDispatch, scheduleReminderRule } from "@/db/schema";
import { assertScheduleSchoolScope, assertScheduleTeacherScope } from "@/features/schedule/shared/auth";
import { appendScheduleAudit } from "@/features/schedule/shared/audit";
import {
  ScheduleReminderCenterDTOSchema,
  ScheduleReminderRuleInputSchema,
  type ScheduleReminderCenterDTO,
  type ScheduleReminderRuleInput,
} from "@/features/schedule/shared/dto/reminders";
import { dispatchScheduleReminder, isSupportedScheduleReminderChannel } from "@/server/schedule/reminder-dispatch";

function toIso(value: Date | number | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

async function planScheduleReminderDispatch(
  executor: Pick<typeof db, "insert">,
  input: {
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
      latestStatus: latestStatusByType.get(rule.type)?.status ?? null,
    })),
    deliveries: [...deliveries]
      .sort((left, right) => Number(right.scheduledFor ?? 0) - Number(left.scheduledFor ?? 0))
      .slice(0, 12)
      .map((delivery) => ({
        id: delivery.id,
        ruleId: delivery.ruleId ?? null,
        type: delivery.type,
        channel: delivery.channel,
        status: delivery.status,
        targetLabel: delivery.targetLabel,
        scheduledFor: toIso(delivery.scheduledFor) ?? new Date(0).toISOString(),
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

export async function retryScheduleReminderDispatch(input: { dispatchId: string }) {
  const scope = await assertScheduleTeacherScope();
  const delivery = await db.query.scheduleReminderDispatch.findFirst({
    where: eq(scheduleReminderDispatch.id, input.dispatchId),
  });
  if (!delivery || !scope.schoolIds.includes(delivery.schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  await db
    .update(scheduleReminderDispatch)
    .set({
      status: "planned",
      failureReason: null,
      updatedAt: new Date(),
    })
    .where(eq(scheduleReminderDispatch.id, delivery.id));

  const result = await dispatchScheduleReminder({
    channel: delivery.channel,
    payload: delivery.payloadJson as Record<string, unknown>,
  });

  await db.transaction(async (tx) => {
    await tx
      .update(scheduleReminderDispatch)
      .set({
        status: result.status,
        failureReason: result.failureReason ?? null,
        lastAttemptAt: new Date(),
        sentAt: result.status === "sent" ? new Date() : delivery.sentAt,
        updatedAt: new Date(),
      })
      .where(eq(scheduleReminderDispatch.id, delivery.id));

    await appendScheduleAudit(tx, {
      schoolId: delivery.schoolId,
      entityType: "scheduleReminder",
      entityId: delivery.id,
      actionType: "retry_dispatch",
      actorId: scope.userId,
      payloadJson: { dispatchId: delivery.id, status: result.status },
    });
  });

  return getScheduleReminderCenterDTO({ schoolId: delivery.schoolId });
}
