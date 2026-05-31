import { scheduleMutationAudit } from "@/db/schema";

type ScheduleMutationAuditInsertable = {
  insert: typeof import("@/db").db.insert;
};

type ScheduleAuditInput = {
  schoolId: string;
  entityType: string;
  entityId: string;
  actionType: string;
  actorId: string;
  reason?: string | null;
  payloadJson: Record<string, unknown>;
};

export async function appendScheduleAudit(
  executor: ScheduleMutationAuditInsertable,
  input: ScheduleAuditInput,
) {
  await executor.insert(scheduleMutationAudit).values({
    schoolId: input.schoolId,
    entityType: input.entityType,
    entityId: input.entityId,
    actionType: input.actionType,
    actorId: input.actorId,
    reason: input.reason ?? null,
    payloadJson: input.payloadJson,
  });
}
