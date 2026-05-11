import { z } from "zod";

export const ScheduleAssistantProposalStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "draft_created",
]);

export const ScheduleAssistantProposalDTOSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  proposalType: z.enum(["import_mapping", "conflict_explanation", "override_suggestion"]),
  targetType: z.string(),
  targetId: z.string(),
  status: ScheduleAssistantProposalStatusSchema,
  title: z.string(),
  reason: z.string(),
  impactScope: z.array(z.string()).default([]),
  fieldsRequiringConfirmation: z.array(z.string()).default([]),
  draftPayload: z.record(z.string(), z.unknown()).nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ScheduleAssistantCenterDTOSchema = z.object({
  schoolId: z.string(),
  proposals: z.array(ScheduleAssistantProposalDTOSchema).default([]),
});

export type ScheduleAssistantProposalStatus = z.infer<typeof ScheduleAssistantProposalStatusSchema>;
export type ScheduleAssistantProposalDTO = z.infer<typeof ScheduleAssistantProposalDTOSchema>;
export type ScheduleAssistantCenterDTO = z.infer<typeof ScheduleAssistantCenterDTOSchema>;
