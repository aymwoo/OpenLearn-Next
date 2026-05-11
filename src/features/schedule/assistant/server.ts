import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { scheduleAssistantProposal } from "@/db/schema";
import { appendScheduleAudit } from "@/features/schedule/shared/audit";
import { assertScheduleSchoolScope, assertScheduleTeacherScope } from "@/features/schedule/shared/auth";
import { ScheduleAssistantCenterDTOSchema, ScheduleAssistantProposalDTOSchema } from "@/features/schedule/shared/dto/assistant";

function toIso(value: Date | number | null | undefined) {
  if (!value) {
    return new Date(0).toISOString();
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export async function getScheduleAssistantCenterDTO(input?: { schoolId?: string }) {
  const scope = await assertScheduleTeacherScope();
  const schoolId = input?.schoolId ?? scope.schoolIds[0] ?? null;
  if (!schoolId || !scope.schoolIds.includes(schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  const proposals = await db.query.scheduleAssistantProposal.findMany({
    where: eq(scheduleAssistantProposal.schoolId, schoolId),
  });

  return ScheduleAssistantCenterDTOSchema.parse({
    schoolId,
    proposals: proposals
      .sort((left, right) => Number(right.updatedAt ?? 0) - Number(left.updatedAt ?? 0))
      .map((proposal) =>
        ScheduleAssistantProposalDTOSchema.parse({
          id: proposal.id,
          schoolId: proposal.schoolId,
          proposalType: proposal.proposalType,
          targetType: proposal.targetType,
          targetId: proposal.targetId,
          status: proposal.status,
          title: proposal.title,
          reason: proposal.reason,
          impactScope: Array.isArray(proposal.impactScopeJson) ? proposal.impactScopeJson : [],
          fieldsRequiringConfirmation: Array.isArray(proposal.fieldsRequiringConfirmationJson)
            ? proposal.fieldsRequiringConfirmationJson
            : [],
          draftPayload: (proposal.draftPayloadJson as Record<string, unknown> | null) ?? null,
          createdAt: toIso(proposal.createdAt),
          updatedAt: toIso(proposal.updatedAt),
        }),
      ),
  });
}

export async function createScheduleAssistantProposal(input: {
  schoolId: string;
  proposalType: "import_mapping" | "conflict_explanation" | "override_suggestion";
  targetType: string;
  targetId: string;
  title: string;
  reason: string;
  impactScope: string[];
  fieldsRequiringConfirmation: string[];
  draftPayload?: Record<string, unknown> | null;
}) {
  const scope = await assertScheduleSchoolScope(input.schoolId);
  const created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(scheduleAssistantProposal)
      .values({
        schoolId: input.schoolId,
        proposalType: input.proposalType,
        targetType: input.targetType,
        targetId: input.targetId,
        status: "pending",
        title: input.title,
        reason: input.reason,
        impactScopeJson: input.impactScope,
        fieldsRequiringConfirmationJson: input.fieldsRequiringConfirmation,
        draftPayloadJson: input.draftPayload ?? null,
        requestedById: scope.userId,
      })
      .returning();

    await appendScheduleAudit(tx, {
      schoolId: input.schoolId,
      entityType: "scheduleAssistantProposal",
      entityId: row.id,
      actionType: "create_proposal",
      actorId: scope.userId,
      payloadJson: input,
    });

    return row;
  });

  return created;
}

export async function approveScheduleAssistantProposal(input: { proposalId: string }) {
  const proposal = await db.query.scheduleAssistantProposal.findFirst({ where: eq(scheduleAssistantProposal.id, input.proposalId) });
  if (!proposal) {
    throw new Error("SCHEDULE_ASSISTANT_APPROVAL_BLOCKED");
  }

  const scope = await assertScheduleSchoolScope(proposal.schoolId);
  if (proposal.status !== "pending" && proposal.status !== "approved") {
    throw new Error("SCHEDULE_ASSISTANT_APPROVAL_BLOCKED");
  }

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(scheduleAssistantProposal)
      .set({
        status: "draft_created",
        approvedById: scope.userId,
        updatedAt: new Date(),
      })
      .where(eq(scheduleAssistantProposal.id, proposal.id))
      .returning();

    await appendScheduleAudit(tx, {
      schoolId: proposal.schoolId,
      entityType: "scheduleAssistantProposal",
      entityId: proposal.id,
      actionType: "approve_to_draft",
      actorId: scope.userId,
      payloadJson: { proposalId: proposal.id },
    });

    return row;
  });

  return updated;
}

export async function rejectScheduleAssistantProposal(input: { proposalId: string }) {
  const proposal = await db.query.scheduleAssistantProposal.findFirst({ where: eq(scheduleAssistantProposal.id, input.proposalId) });
  if (!proposal) {
    throw new Error("SCHEDULE_ASSISTANT_APPROVAL_BLOCKED");
  }

  const scope = await assertScheduleSchoolScope(proposal.schoolId);
  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(scheduleAssistantProposal)
      .set({
        status: "rejected",
        rejectedById: scope.userId,
        updatedAt: new Date(),
      })
      .where(eq(scheduleAssistantProposal.id, proposal.id))
      .returning();

    await appendScheduleAudit(tx, {
      schoolId: proposal.schoolId,
      entityType: "scheduleAssistantProposal",
      entityId: proposal.id,
      actionType: "reject_proposal",
      actorId: scope.userId,
      payloadJson: { proposalId: proposal.id },
    });

    return row;
  });

  return updated;
}
